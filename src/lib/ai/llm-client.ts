// Main-thread side of the Big Brain: one lazily created module worker, a typed request/response protocol,
// cache checks against Cache Storage ('transformers-cache'), real download sizes, and model removal.
// Browser-only (Worker, caches, fetch); never imported by bun tests.
import { OUTPUT_REGEX } from './emotion';
import type { GenParams, GenResult, LlmMessage, LoadInfo, LoadPhase, LoadProgress, WorkerErrorCode, WorkerEvent, WorkerRequest } from './llm-protocol';
import { MODELS, hfUrl, requiredFiles, sizedFiles, type Dtype, type ModelId } from './models';

/** transformers.js env.cacheKey (never delete this whole cache: it also holds the ORT runtime). */
export const CACHE_NAME = 'transformers-cache';
/** How long an interrupted generation may take to stop before we give up on it. */
const STOP_GRACE_MS = 4000;

export type LlmErrorCode = WorkerErrorCode | 'cancelled' | 'terminated' | 'stuck' | 'crashed';

export class LlmError extends Error {
  readonly code: LlmErrorCode;
  constructor(message: string, code: LlmErrorCode) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
  }
}

type Pending =
  | { kind: 'load'; resolve: (i: LoadInfo) => void; reject: (e: LlmError) => void; onProgress?: (p: LoadProgress) => void; onPhase?: (p: LoadPhase) => void }
  | { kind: 'generate'; resolve: (r: GenResult) => void; reject: (e: LlmError) => void; onToken?: (t: string) => void }
  | { kind: 'unload'; resolve: () => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
let loaded: { modelId: ModelId; dtype: Dtype; info: LoadInfo } | null = null;
let loading: { id: number; modelId: ModelId; dtype: Dtype; promise: Promise<LoadInfo> } | null = null;
let genChain: Promise<unknown> = Promise.resolve();
let activeGen: number | null = null;
const deviceLostListeners = new Set<(reason: string, message: string) => void>();
const crashListeners = new Set<(message: string) => void>();

function send(m: WorkerRequest): void {
  worker?.postMessage(m);
}

function failAll(err: LlmError): void {
  const all = [...pending.values()];
  pending.clear();
  for (const p of all) {
    if (p.kind === 'unload') p.resolve();
    else p.reject(err);
  }
}

/** Kill the worker (frees GPU/CPU memory reliably) and fail everything in flight. */
export function terminate(reason = 'Big Brain was stopped.', code: LlmErrorCode = 'terminated'): void {
  const w = worker;
  worker = null;
  loaded = null;
  loading = null;
  activeGen = null;
  genChain = Promise.resolve();
  if (w) w.terminate();
  failAll(new LlmError(reason, code));
}

function crash(message: string): void {
  terminate(message, 'crashed');
  for (const cb of crashListeners) cb(message);
}

function onEvent(ev: WorkerEvent): void {
  switch (ev.type) {
    case 'progress': {
      const p = pending.get(ev.id);
      if (p?.kind === 'load') p.onProgress?.(ev.progress);
      return;
    }
    case 'phase': {
      const p = pending.get(ev.id);
      if (p?.kind === 'load') p.onPhase?.(ev.phase);
      return;
    }
    case 'loaded': {
      const p = pending.get(ev.id);
      pending.delete(ev.id);
      if (p?.kind === 'load') p.resolve(ev.info);
      return;
    }
    case 'token': {
      const p = pending.get(ev.id);
      if (p?.kind === 'generate') p.onToken?.(ev.text);
      return;
    }
    case 'done': {
      const p = pending.get(ev.id);
      pending.delete(ev.id);
      if (p?.kind === 'generate') p.resolve(ev.result);
      return;
    }
    case 'unloaded': {
      const p = pending.get(ev.id);
      pending.delete(ev.id);
      if (p?.kind === 'unload') p.resolve();
      return;
    }
    case 'error': {
      const err = new LlmError(ev.message, ev.code);
      if (ev.id === null) {
        // Unhandled inside the worker: a lost device or OOM leaves the model unusable.
        if (ev.code === 'device-lost' || ev.code === 'oom') crash(ev.message);
        return;
      }
      const p = pending.get(ev.id);
      pending.delete(ev.id);
      if (p && p.kind !== 'unload') p.reject(err);
      else if (p) p.resolve();
      return;
    }
    case 'device-lost': {
      const message = ev.message || `GPU device lost (${ev.reason}).`;
      terminate(message, 'device-lost');
      for (const cb of deviceLostListeners) cb(ev.reason, message);
      return;
    }
  }
}

function ensureWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module', name: 'kempanion-big-brain' });
  w.onmessage = (e: MessageEvent<WorkerEvent>) => onEvent(e.data);
  w.onerror = (e: ErrorEvent) => {
    e.preventDefault();
    crash(e.message || 'The Big Brain worker crashed.');
  };
  w.onmessageerror = () => crash('The Big Brain worker sent an unreadable message.');
  worker = w;
  return w;
}

export interface LoadOptions {
  dtype: Dtype;
  onProgress?: (p: LoadProgress) => void;
  onPhase?: (phase: LoadPhase) => void;
}

/** Download (or read from cache), compile and warm up a model. One model at a time. */
export function load(modelId: ModelId, opts: LoadOptions): Promise<LoadInfo> {
  if (loaded && loaded.modelId === modelId && loaded.dtype === opts.dtype) return Promise.resolve(loaded.info);
  if (loading && loading.modelId === modelId && loading.dtype === opts.dtype) return loading.promise;
  if (loaded || loading) terminate('Switching models.', 'cancelled'); // a fresh worker releases the old model's GPU memory
  ensureWorker();
  const id = nextId++;
  const def = MODELS[modelId];
  const promise = new Promise<LoadInfo>((resolve, reject) => {
    pending.set(id, {
      kind: 'load',
      onProgress: opts.onProgress,
      onPhase: opts.onPhase,
      resolve: (info) => {
        if (loading?.id === id) loading = null;
        loaded = { modelId, dtype: opts.dtype, info };
        resolve(info);
      },
      reject: (e) => {
        if (loading?.id === id) loading = null;
        reject(e);
      },
    });
  });
  loading = { id, modelId, dtype: opts.dtype, promise };
  send({ type: 'load', id, repo: def.repo, dtype: opts.dtype, templateKwargs: def.templateKwargs });
  return promise;
}

/** Cancel an in-flight load (files that finished downloading stay cached) or interrupt a generation. */
export function cancel(): void {
  if (loading) {
    terminate('Download cancelled.', 'cancelled');
    return;
  }
  if (activeGen !== null) send({ type: 'interrupt' });
}

/** Dispose the model and stop the worker. */
export async function unload(): Promise<void> {
  if (!worker) {
    loaded = null;
    return;
  }
  const id = nextId++;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 3000);
    pending.set(id, {
      kind: 'unload',
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
    });
    send({ type: 'unload', id });
  });
  terminate('Unloaded.');
}

export function loadedModel(): { modelId: ModelId; dtype: Dtype } | null {
  return loaded ? { modelId: loaded.modelId, dtype: loaded.dtype } : null;
}

export interface GenerateOptions {
  /** One KV-cache session per pig. */
  sessionKey: string;
  onToken?: (delta: string) => void;
  /** Abort = interrupt: the promise still resolves with the partial result (interrupted: true). */
  signal?: AbortSignal;
}

/**
 * Generate one reply for the loaded model (its sampling, chat-template quirks and the `[expression] "line"`
 * regex constraint). Generations run one at a time; a new request interrupts the one in flight.
 */
export function generate(messages: LlmMessage[], opts: GenerateOptions): Promise<GenResult> {
  if (!loaded || !worker) return Promise.reject(new LlmError('Big Brain is not loaded.', 'generate'));
  const def = MODELS[loaded.modelId];
  const params: GenParams = {
    messages,
    sessionKey: opts.sessionKey,
    maxNewTokens: def.sampling.max_new_tokens,
    temperature: def.sampling.temperature,
    topK: def.sampling.top_k,
    repetitionPenalty: def.sampling.repetition_penalty,
    badWordsIds: def.badWordsIds,
    templateKwargs: def.templateKwargs,
    regex: OUTPUT_REGEX,
  };
  if (activeGen !== null) send({ type: 'interrupt' });
  const run = genChain.then(() => runGenerate(params, opts));
  genChain = run.catch(() => undefined);
  return run;
}

function runGenerate(params: GenParams, opts: GenerateOptions): Promise<GenResult> {
  return new Promise<GenResult>((resolve, reject) => {
    if (!worker || !loaded) {
      reject(new LlmError('Big Brain is not loaded.', 'generate'));
      return;
    }
    if (opts.signal?.aborted) {
      reject(new LlmError('Cancelled.', 'cancelled'));
      return;
    }
    const id = nextId++;
    let stuckTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      opts.signal?.removeEventListener('abort', onAbort);
      if (stuckTimer) clearTimeout(stuckTimer);
      if (activeGen === id) activeGen = null;
    };
    const onAbort = () => {
      send({ type: 'interrupt' });
      stuckTimer ??= setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        cleanup();
        reject(new LlmError('Big Brain did not stop in time.', 'stuck'));
      }, STOP_GRACE_MS);
    };
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    pending.set(id, {
      kind: 'generate',
      onToken: opts.onToken,
      resolve: (r) => {
        cleanup();
        resolve(r);
      },
      reject: (e) => {
        cleanup();
        reject(e);
      },
    });
    activeGen = id;
    send({ type: 'generate', id, params });
  });
}

/** Drop the KV cache (e.g. after editing chat history). */
export function resetContext(): void {
  send({ type: 'reset' });
}

export function onDeviceLost(cb: (reason: string, message: string) => void): () => void {
  deviceLostListeners.add(cb);
  return () => deviceLostListeners.delete(cb);
}

export function onCrash(cb: (message: string) => void): () => void {
  crashListeners.add(cb);
  return () => crashListeners.delete(cb);
}

// ───────────────────────── cache & sizes (main thread, no library) ─────────────────────────

async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/** True when every file transformers.js needs for this model + dtype is already in Cache Storage. */
export async function isCached(modelId: ModelId, dtype: Dtype): Promise<boolean> {
  const c = await openCache();
  if (!c) return false;
  try {
    const repo = MODELS[modelId].repo;
    const hits = await Promise.all(requiredFiles(modelId, dtype).map((f) => c.match(hfUrl(repo, f))));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

function lengthOf(r: Response | undefined | null): number {
  const n = Number(r?.headers.get('content-length') ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Real download size (bytes) of a model + dtype: from the cached responses when present, else HEAD requests
 * to the Hub (Content-Length after the CDN redirect). Null when it can't be determined (offline).
 */
export async function fetchModelSize(modelId: ModelId, dtype: Dtype, timeoutMs = 8000): Promise<number | null> {
  const repo = MODELS[modelId].repo;
  const c = await openCache();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    let total = 0;
    for (const f of sizedFiles(modelId, dtype)) {
      const url = hfUrl(repo, f);
      const cached = c ? lengthOf(await c.match(url).catch(() => undefined)) : 0;
      if (cached) {
        total += cached;
        continue;
      }
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: ac.signal });
      const n = r.ok ? lengthOf(r) : 0;
      if (!n) return null;
      total += n;
    }
    return total + 30_000; // config, generation config, tokenizer config
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Bytes this model currently occupies in Cache Storage (all dtypes). */
export async function cachedBytes(modelId: ModelId): Promise<number> {
  const c = await openCache();
  if (!c) return 0;
  const prefix = `https://huggingface.co/${MODELS[modelId].repo}/`;
  let total = 0;
  try {
    for (const req of await c.keys()) {
      if (req.url.startsWith(prefix)) total += lengthOf(await c.match(req));
    }
  } catch {
    /* ignore */
  }
  return total;
}

/** Delete a model's cached files (every dtype). Returns the number of entries removed. */
export async function removeCached(modelId: ModelId): Promise<number> {
  const c = await openCache();
  if (!c) return 0;
  const prefix = `https://huggingface.co/${MODELS[modelId].repo}/`;
  let n = 0;
  for (const req of await c.keys()) {
    if (req.url.startsWith(prefix) && (await c.delete(req))) n++;
  }
  return n;
}
