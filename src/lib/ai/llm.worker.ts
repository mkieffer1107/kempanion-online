/// <reference lib="webworker" />
// Big Brain worker (module worker): transformers.js 4.3.2 + ONNX Runtime Web on WebGPU.
// The library is imported lazily, so players who never opt in never download it.
// Created by llm-client.ts with: new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' }).
//
// Runtime notes (docs/research/llm-runtime.md):
// - ORT's wasm/mjs glue is self-hosted (same version transformers.js pins) instead of jsDelivr, and
//   env.useWasmCache stores it in the 'transformers-cache' Cache Storage next to the model, so loads work offline.
// - No coi-serviceworker: GitHub Pages can't send COOP/COEP; WASM stays single-threaded, WebGPU is unaffected.
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import ortMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import { LlmEngine } from './llm-engine';
import { classifyError, type WorkerEvent, type WorkerRequest } from './llm-protocol';

declare const self: DedicatedWorkerGlobalScope;

const post = (m: WorkerEvent) => self.postMessage(m);

let enginePromise: Promise<LlmEngine> | null = null;
let engine: LlmEngine | null = null;
let deviceWatched = false;

function absolute(url: string): string {
  try {
    return new URL(url, self.location.href).href;
  } catch {
    return url;
  }
}

/** Remove ORT runtime files cached by older builds (each is ~27 MB with a different hash). */
async function pruneOldRuntime(cacheName: string, keep: readonly string[]): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(cacheName);
    const origin = self.location.origin;
    for (const req of await cache.keys()) {
      if (req.url.startsWith(origin) && /ort-wasm-simd-threaded[^/]*\.(wasm|mjs)$/.test(req.url) && !keep.includes(req.url)) {
        await cache.delete(req);
      }
    }
  } catch {
    /* best effort */
  }
}

function getEngine(): Promise<LlmEngine> {
  enginePromise ??= (async () => {
    const [tf, so] = await Promise.all([import('@huggingface/transformers'), import('@huggingface/transformers-structured-output')]);
    tf.env.logLevel = tf.LogLevel.ERROR;
    tf.env.allowLocalModels = false;
    tf.env.allowRemoteModels = true;
    tf.env.useBrowserCache = true;
    tf.env.useWasmCache = true;
    const urls = { wasm: absolute(ortWasmUrl), mjs: absolute(ortMjsUrl) };
    const wasm = tf.env.backends.onnx.wasm;
    if (wasm) wasm.wasmPaths = urls;
    void pruneOldRuntime(tf.env.cacheKey, [urls.wasm, urls.mjs]);
    return new LlmEngine(tf, so.StructuredOutputProcessor);
  })();
  return enginePromise;
}

/** Report a lost GPU device (driver reset, tab backgrounded on mobile, OOM…) so the game falls back. */
async function watchDevice(eng: LlmEngine): Promise<void> {
  if (deviceWatched) return;
  deviceWatched = true;
  try {
    const flags = eng.tf.env.backends.onnx.webgpu as unknown as { device?: Promise<unknown> } | undefined;
    const device = (await flags?.device) as { lost?: Promise<{ reason?: string; message?: string }> } | undefined;
    void device?.lost?.then((info) => {
      if (info?.reason === 'destroyed') return; // we disposed it on purpose
      post({ type: 'device-lost', reason: info?.reason ?? 'unknown', message: info?.message ?? '' });
    });
  } catch {
    deviceWatched = false;
  }
}

async function handle(m: WorkerRequest): Promise<void> {
  switch (m.type) {
    case 'load': {
      try {
        const eng = await getEngine();
        engine = eng;
        if (eng.loaded && eng.repo === m.repo && eng.dtype === m.dtype) {
          post({ type: 'loaded', id: m.id, info: { repo: m.repo, dtype: m.dtype, device: 'webgpu', ms: 0, fromCache: true } });
          return;
        }
        if (eng.loaded) await eng.dispose();
        const info = await eng.load({
          repo: m.repo,
          dtype: m.dtype,
          device: 'webgpu',
          templateKwargs: m.templateKwargs,
          onProgress: (progress) => post({ type: 'progress', id: m.id, progress }),
          onPhase: (phase) => post({ type: 'phase', id: m.id, phase }),
        });
        void watchDevice(eng);
        post({ type: 'loaded', id: m.id, info });
      } catch (err) {
        const c = classifyError(err);
        post({ type: 'error', id: m.id, message: c.message, code: c.code === 'unknown' ? 'load' : c.code });
      }
      return;
    }
    case 'generate': {
      if (!engine?.loaded) {
        post({ type: 'error', id: m.id, message: 'Big Brain is not loaded.', code: 'generate' });
        return;
      }
      try {
        const result = await engine.generate(m.params, (text) => post({ type: 'token', id: m.id, text }));
        post({ type: 'done', id: m.id, result });
      } catch (err) {
        const c = classifyError(err);
        const busy = (err as { name?: string } | null)?.name === 'BusyError';
        post({ type: 'error', id: m.id, message: c.message, code: busy ? 'busy' : c.code === 'unknown' ? 'generate' : c.code });
      }
      return;
    }
    case 'interrupt':
      engine?.interrupt();
      return;
    case 'reset':
      await engine?.resetCache();
      return;
    case 'unload':
      try {
        await engine?.dispose();
      } catch {
        /* terminating anyway */
      }
      post({ type: 'unloaded', id: m.id });
      return;
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  void handle(e.data);
};

self.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
  const c = classifyError(ev.reason);
  post({ type: 'error', id: null, message: c.message, code: c.code });
});
