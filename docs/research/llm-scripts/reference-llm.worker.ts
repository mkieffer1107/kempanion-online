/// <reference lib="webworker" />
// LLM worker: transformers.js 4.3.2 + ONNX Runtime Web (WebGPU). Lazy-imports the library so the
// heuristic-only path never downloads it.
import type {
  DynamicCache as DynamicCacheT,
  InterruptableStoppingCriteria as StopT,
  PreTrainedModel,
  PreTrainedTokenizer,
  ProgressInfo,
  Tensor,
} from '@huggingface/transformers';
// Optional: self-host ORT's WASM glue instead of jsDelivr (same version transformers.js pins).
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import ortMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';

declare const self: DedicatedWorkerGlobalScope;

type Tier = 'lite' | 'quality';
const MODELS: Record<Tier, string> = {
  lite: 'onnx-community/LFM2.5-350M-ONNX', // q4f16 ≈ 255 MB + 3.3 MB tokenizer
  quality: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX', // q4f16 ≈ 760 MB (desktop only)
};
const DTYPE_SUFFIX = { q4f16: '_q4f16', q4: '_q4', q8: '_quantized' } as const;
type Dtype = keyof typeof DTYPE_SUFFIX;

export type In =
  | { type: 'probe' }
  | { type: 'load'; tier: Tier }
  | {
      type: 'generate';
      id: number;
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
      maxNewTokens?: number;
      temperature?: number;
    }
  | { type: 'interrupt' }
  | { type: 'reset' }
  | { type: 'unload' };

let tf: typeof import('@huggingface/transformers') | null = null;
let tokenizer: PreTrainedTokenizer | null = null;
let model: PreTrainedModel | null = null;
let stopper: StopT | null = null;
let cache: DynamicCacheT | null = null;
let cachedIds: bigint[] = []; // tokens already represented in `cache`
let device: 'webgpu' | 'wasm' = 'wasm';
let dtype: Dtype = 'q8';

const post = (m: unknown) => self.postMessage(m);

async function lib() {
  if (tf) return tf;
  tf = await import('@huggingface/transformers');
  tf.env.logLevel = tf.LogLevel.ERROR;
  tf.env.backends.onnx.wasm!.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl };
  return tf;
}

async function gpuInfo() {
  const gpu = (self.navigator as any).gpu;
  if (!gpu) return { webgpu: false, f16: false };
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return { webgpu: false, f16: false };
    return { webgpu: true, f16: adapter.features.has('shader-f16') as boolean };
  } catch {
    return { webgpu: false, f16: false };
  }
}

async function isCached(id: string, d: Dtype, dev: string): Promise<boolean> {
  const t = await lib();
  try {
    return await t.ModelRegistry.is_pipeline_cached('text-generation', id, { dtype: d, device: dev as any });
  } catch {
    // Offline or metadata probe failed: fall back to a direct Cache Storage lookup.
    const c = await caches.open(t.env.cacheKey); // 'transformers-cache'
    const base = `https://huggingface.co/${id}/resolve/main/`;
    const s = DTYPE_SUFFIX[d];
    const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', `onnx/model${s}.onnx`, `onnx/model${s}.onnx_data`];
    return (await Promise.all(files.map((f) => c.match(base + f)))).every(Boolean);
  }
}

async function probe() {
  const g = await gpuInfo();
  device = g.webgpu ? 'webgpu' : 'wasm';
  dtype = g.webgpu ? (g.f16 ? 'q4f16' : 'q4') : 'q8';
  const cached = {
    lite: await isCached(MODELS.lite, dtype, device),
    quality: await isCached(MODELS.quality, dtype, device),
  };
  post({ type: 'probe', ...g, device, dtype, cached });
}

async function load(tier: Tier) {
  const t = await lib();
  const id = MODELS[tier];
  const progress_callback = (p: ProgressInfo) => post({ type: 'progress', p }); // includes 'progress_total'
  tokenizer = await t.AutoTokenizer.from_pretrained(id, { progress_callback });
  model = await t.AutoModelForCausalLM.from_pretrained(id, { device, dtype, progress_callback });
  stopper = new t.InterruptableStoppingCriteria();
  post({ type: 'status', text: 'Compiling shaders…' });
  await model.generate({ ...tokenizer('a'), max_new_tokens: 1 }); // warm-up (official examples do this)
  post({ type: 'ready', tier, device, dtype });
}

function startsWith(ids: bigint[], prefix: bigint[]) {
  if (prefix.length >= ids.length) return false; // need ≥1 new token to feed
  for (let i = 0; i < prefix.length; i++) if (ids[i] !== prefix[i]) return false;
  return true;
}

async function resetCache() {
  await cache?.dispose();
  cache = null;
  cachedIds = [];
}

async function generate(msg: Extract<In, { type: 'generate' }>) {
  const t = await lib();
  if (!model || !tokenizer || !stopper) throw new Error('model not loaded');
  stopper.reset();

  const inputs = tokenizer.apply_chat_template(msg.messages, {
    add_generation_prompt: true,
    return_dict: true,
  }) as { input_ids: Tensor; attention_mask: Tensor };
  const ids = (inputs.input_ids.tolist() as bigint[][])[0];

  // transformers.js trusts that the first get_seq_length() prompt tokens match the cache
  // (decoder_prepare_inputs_for_generation slices them off without checking), so verify it.
  if (cache && !startsWith(ids, cachedIds)) await resetCache();
  cache ??= new t.DynamicCache();

  let n = 0;
  let t0 = 0;
  const streamer = new t.TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => post({ type: 'token', id: msg.id, text }),
    token_callback_function: () => {
      if (n++ === 0) t0 = performance.now();
    },
  });

  const out = (await model.generate({
    ...inputs,
    past_key_values: cache,
    max_new_tokens: msg.maxNewTokens ?? 96,
    do_sample: true,
    temperature: msg.temperature ?? 0.5,
    top_k: 50,
    top_p: 0.9,
    repetition_penalty: 1.05,
    streamer,
    stopping_criteria: stopper,
    return_dict_in_generate: true,
  })) as { sequences: Tensor; past_key_values: DynamicCacheT };

  const seq = (out.sequences.tolist() as bigint[][])[0];
  cachedIds = seq.slice(0, cache.get_seq_length()); // = prompt + generated − last token
  const text = tokenizer.decode(seq.slice(ids.length), { skip_special_tokens: true });
  const secs = n > 1 ? (performance.now() - t0) / 1000 : 0;
  post({ type: 'done', id: msg.id, text, tokens: n, tps: secs ? (n - 1) / secs : 0 });
}

self.onmessage = async (e: MessageEvent<In>) => {
  const m = e.data;
  try {
    switch (m.type) {
      case 'probe': return await probe();
      case 'load': return await load(m.tier);
      case 'generate': return await generate(m);
      case 'interrupt': return stopper?.interrupt();
      case 'reset': return await resetCache();
      case 'unload':
        await resetCache();
        await model?.dispose();
        model = null;
        tokenizer = null;
        return post({ type: 'unloaded' });
    }
  } catch (err) {
    post({ type: 'error', error: String(err) });
  }
};
