# Running a Liquid AI LFM model client-side in a static site, and deploying it to GitHub Pages (state on 2026-10-30)

**How each claim was checked:**
- **[V]** I checked it myself: read the source, ran a build, or ran code. Scripts and logs are listed in section 10.
- **[S]** A primary source states it. The URL is given.
- **[U]** Not verified, or it is my inference. Treat it as a hypothesis.

## 0. Summary and recommendation

- **Runtime.** Use `@huggingface/transformers` pinned to exactly **4.3.2**, with ONNX Runtime Web's WebGPU backend. Run it in a module Web Worker and import the library lazily inside the worker. Players who never turn the LLM on then never download it.
- **Default model.** `onnx-community/LFM2.5-350M-ONNX`:
  - dtype `q4f16` (255 MB of weights, about 258 MB total) when the adapter has `shader-f16`;
  - dtype `q4` (294 MB) otherwise.
- **Optional desktop "quality" tier.** `LiquidAI/LFM2.5-1.2B-Instruct-ONNX` in `q4f16` (760 MB).
- **LFM3-1.7B.** Wait. Its transformers.js support landed two days ago (4.3.2). Its download is about 1.1 GB, its sliding-window attention runs slowly on the pinned ONNX Runtime build, and it does not fit on iOS.
- **No WebGPU means the heuristic engine.** The transformers.js WASM path for LFM is unusable for live chat. I measured 1 to 4 tokens/s for the 350M model on an M1 Max (section 3.3).
- **iOS.** Offer only the 350M model, and keep prompts short. Stock 4.3.2 cannot do a first download of the 725 MiB 1.2B model on an iPhone 16 Pro Max (section 3.4).
- **GitHub Pages workflow.**
  - `actions/checkout@v7`, `oven-sh/setup-bun@v2`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.
  - Permissions: `contents: read`, `pages: write`, `id-token: write`. Concurrency group `pages`.
  - Pages cannot send COOP/COEP headers. WASM therefore runs single-threaded. WebGPU is unaffected.
  - Do **not** add coi-serviceworker.
- **PWA.** `vite-plugin-pwa` 2.0.0 in `generateSW` mode.
  - Precache the app shell only.
  - Add no runtime caching rules for huggingface.co or jsDelivr.
  - Never delete the `transformers-cache` cache.

---

## 1. transformers.js

### 1.1 Package facts

| Item | Value |
|---|---|
| npm package | `@huggingface/transformers` (`@xenova/transformers` is the obsolete v2 package) [S] |
| Latest stable | **4.3.2**: published to npm 2026-10-27T18:15Z, GitHub release 2026-10-28 [V] |
| Browser entry | `exports.default` → `dist/transformers.web.js`. It imports `onnxruntime-web/webgpu` as an external dependency [V] |
| ONNX Runtime dependency | `onnxruntime-web` pinned exactly at `1.31.0-dev.20260914-8d85527a0`. The current ONNX Runtime stable is 1.31.1, released 2026-10-26 [V] |
| Companion package | `@huggingface/transformers-structured-output@4.3.2` (peer `^4.3.2`). It constrains output to a JSON schema or a regex [V] |
| Safari | The WebGPU path works only from **4.3.0** (PR #1700). Versions 4.0 to 4.2 failed on Safari with "webgpuInit is not a function" (#1604) [S] |
| LFM2.5 chat templates | They use `{%- generation -%}`. This needs the bundled `@huggingface/jinja` at 0.5.8 or later, so **transformers.js 4.3.0 or later**. On 4.2.0 it throws "Unknown statement type: generation" (#1724) [S] |
| Upcoming 4.4 | PR #1783 (response parsing) is merged into the `v4.4` branch. It changes how chat output is decoded (`skip_special_tokens:false` when a `response_template` exists). Pin exact versions [S] |

### 1.2 Which version added each LFM architecture [V] (release notes, `registry.js`, `configs.js`)

| Family | `model_type` | First transformers.js version | Notes |
|---|---|---|---|
| LFM2 (350M / 700M / 1.2B) | `lfm2` | **3.7.0** (2025-07-23) | Hybrid of short-convolution and full-attention layers. Caches are `past_conv.N` and `past_key_values.N.{key,value}` |
| LFM2.5 text (230M / 350M / 1.2B / 2.6B, plus a JP 1.2B variant) | `lfm2` | The architecture works from 3.7.0; the current templates need **4.3.0** | The config uses the same `Lfm2ForCausalLM` |
| LFM2-MoE (LFM2/2.5-8B-A1B, 24B-A2B) | `lfm2_moe` | **4.0.0** (2026-03-30) | Too large for this game |
| LFM2-VL / LFM2.5-VL | `lfm2_vl` | **4.0.0** | |
| **LFM3** (1.7B) / **LFM3-VL** (2B) | `lfm3` / `lfm3_vl` | **4.3.2** (PR #1821, merged 2026-10-27) | Adds `sliding_attention` layers. Thinking is on by default |
| LFM3-Audio / Omni, d1 | n/a | Not in 4.3.2 | |

### 1.3 Candidate ONNX repositories (sizes from the Hugging Face API; graph inputs checked in the `.onnx` files) [V]

| Repo @ commit | dtype → file | Size | `num_logits_to_keep` input | Notes |
|---|---|---|---|---|
| `onnx-community/LFM2.5-350M-ONNX` @`7dd4999565b0` | q4f16 → `model_q4f16.onnx_data` | 255.0 MB + 3.3 MB tokenizer | yes | **Default choice** |
| same | q4 → `_q4` | 293.6 MB | yes | For GPUs without `shader-f16` |
| same | q8 → `_quantized` (8-bit MatMulNBits) | 509.9 MB | yes | transformers.js default on WASM; too slow (section 3.3) |
| `LiquidAI/LFM2.5-1.2B-Instruct-ONNX` @`10f72e70abf6` | q4f16 | 760.3 MB | **no** | Every prefill computes `[seq × 65536]` fp32 logits, about 210 MB for an 800-token prompt (#1836) |
| `LiquidAI/LFM2.5-230M-ONNX` @`c6f46e4e3f88` | q4 (no q4f16) | 211 MB | **no** | fp32 KV cache |
| `onnx-community/LFM3-1.7B-ONNX` @`ab9fec4c681a` | q4f16 | 1,087.8 MB + 17.9 MB tokenizer | yes | Its card says it needs 4.3.2 or later |
| `LiquidAI/LFM3-1.7B-ONNX` | q4f16 | 1,382.9 MB | no; the input is named `logits_to_keep` | transformers.js only fills `num_logits_to_keep`, so this is probably a missing-input error [U, read from source]. Use the onnx-community export |

- **dtype names to file suffixes:** `q4f16`→`_q4f16`, `q4`→`_q4`, `q8`→`_quantized`, `fp16`→`_fp16`. LiquidAI's `model_q8.onnx` and `model_q4f32.onnx` files are not reachable through the `dtype` option [V].
- **License:** LFM Open License v1.0. Commercial use is licensed only for entities under US$10M annual revenue. Redistribution must keep the attribution and NOTICE files [V].
- **Liquid's recommended sampling:**
  - LFM2.5: `temperature 0.1, top_k 50, repetition_penalty 1.05`.
  - LFM3: `0.1 / 50 / 1.1`, and disable thinking with `enable_thinking:false` [S].
- **Context length:** LFM2.5 is 32,768 tokens [S].

### 1.4 What the official examples do (source fetched)

- **`transformers.js-examples/llama-3.2-webgpu/src/worker.js`** (also `smollm-webgpu` and `qwen3-webgpu`):
  - A singleton holds `AutoTokenizer` and `AutoModelForCausalLM`, loaded with `{dtype:"q4f16", device:"webgpu", progress_callback}`. Progress is forwarded with `postMessage`.
  - One module-level `InterruptableStoppingCriteria`.
  - A `TextStreamer({skip_prompt, skip_special_tokens, callback_function, token_callback_function})`, using the token callback to compute tokens/s.
  - `model.generate({...inputs, past_key_values: cache, return_dict_in_generate:true})`, keeping the returned `past_key_values`.
  - A warm-up `generate` with `max_new_tokens:1` to compile shaders.
  - Message types: check, load, generate, interrupt, reset.
  - Caveats: these examples still pin transformers **3.7.1 / 3.8.0**, and the llama example has its cache reset commented out.
- **LFM-specific:** the `LiquidAI/LFM2-WebGPU` Space, file `src/hooks/useLLM.ts`:
  - `onnx-community/LFM2-{350M,700M,1.2B}-ONNX`, `q4f16` on WebGPU, with **pinned commit revisions**.
  - The progress bar only follows `.onnx_data` events, and `past_key_values` is reused between turns.
  - Vite is configured with `base:"./"`. It runs on the main thread, not in a worker.
  - There is no LFM example in `transformers.js-examples` (its last commit was 2026-02-17).
- **4.1.0 and PR #1638:** you can pass a `new DynamicCache()` as `past_key_values`, including through `pipeline()`. The author's turn-2 time with LFM2.5-350M q4 on WebGPU dropped from 294 ms to 117 ms [S].

### 1.5 Complete worker
This compiles with tsc 6.0.3 against the 4.3.2 type definitions and builds with Vite 8.3.5 [V]. The KV-cache and prefix logic was validated end to end in Node (section 1.7) [V].

```ts
// src/lib/ai/llm.worker.ts
/// <reference lib="webworker" />
import type {
  DynamicCache as DynamicCacheT, InterruptableStoppingCriteria as StopT,
  PreTrainedModel, PreTrainedTokenizer, ProgressInfo, Tensor,
} from '@huggingface/transformers';
// Optional (see §5.3): self-host ORT's wasm/glue (same version transformers.js pins).
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import ortMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';

declare const self: DedicatedWorkerGlobalScope;

type Tier = 'lite' | 'quality';
const MODELS: Record<Tier, string> = {
  lite: 'onnx-community/LFM2.5-350M-ONNX',        // q4f16 ≈ 255 MB
  quality: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX',  // q4f16 ≈ 760 MB (desktop only)
};
const DTYPE_SUFFIX = { q4f16: '_q4f16', q4: '_q4', q8: '_quantized' } as const;
type Dtype = keyof typeof DTYPE_SUFFIX;

export type In =
  | { type: 'probe' }
  | { type: 'load'; tier: Tier }
  | { type: 'generate'; id: number;
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
      maxNewTokens?: number; temperature?: number }
  | { type: 'interrupt' } | { type: 'reset' } | { type: 'unload' };

let tf: typeof import('@huggingface/transformers') | null = null;
let tokenizer: PreTrainedTokenizer | null = null;
let model: PreTrainedModel | null = null;
let stopper: StopT | null = null;
let cache: DynamicCacheT | null = null;
let cachedIds: bigint[] = [];            // tokens already represented in `cache`
let device: 'webgpu' | 'wasm' = 'wasm';
let dtype: Dtype = 'q8';
const post = (m: unknown) => self.postMessage(m);

async function lib() {                    // lazy: separate chunk (~164 KB gzip)
  if (tf) return tf;
  tf = await import('@huggingface/transformers');
  tf.env.logLevel = tf.LogLevel.ERROR;
  tf.env.backends.onnx.wasm!.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl }; // omit to use jsDelivr
  return tf;
}

async function gpuInfo() {
  const gpu = (self.navigator as any).gpu;
  if (!gpu) return { webgpu: false, f16: false };
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return { webgpu: false, f16: false };   // e.g. blocklisted GPU
    return { webgpu: true, f16: adapter.features.has('shader-f16') as boolean };
  } catch { return { webgpu: false, f16: false }; }
}

async function isCached(id: string, d: Dtype, dev: string): Promise<boolean> {
  const t = await lib();
  try {   // use is_pipeline_cached (text task) — NOT is_cached(), which probes processor files over the network
    return await t.ModelRegistry.is_pipeline_cached('text-generation', id, { dtype: d, device: dev as any });
  } catch { // offline / probe failure → direct Cache Storage lookup
    const c = await caches.open(t.env.cacheKey);           // 'transformers-cache'
    const base = `https://huggingface.co/${id}/resolve/main/`, s = DTYPE_SUFFIX[d];
    const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', `onnx/model${s}.onnx`, `onnx/model${s}.onnx_data`];
    return (await Promise.all(files.map((f) => c.match(base + f)))).every(Boolean);
  }
}

async function probe() {
  const g = await gpuInfo();
  device = g.webgpu ? 'webgpu' : 'wasm';
  dtype = g.webgpu ? (g.f16 ? 'q4f16' : 'q4') : 'q8';   // transformers.js only checks f16 for dtype 'fp16', not 'q4f16'
  const cached = { lite: await isCached(MODELS.lite, dtype, device), quality: await isCached(MODELS.quality, dtype, device) };
  post({ type: 'probe', ...g, device, dtype, cached });
}

async function load(tier: Tier) {
  const t = await lib();
  const id = MODELS[tier];
  const progress_callback = (p: ProgressInfo) => post({ type: 'progress', p }); // initiate|download|progress|done|progress_total
  tokenizer = await t.AutoTokenizer.from_pretrained(id, { progress_callback });
  model = await t.AutoModelForCausalLM.from_pretrained(id, { device, dtype, progress_callback });
  stopper = new t.InterruptableStoppingCriteria();
  post({ type: 'status', text: 'Compiling shaders…' });
  await model.generate({ ...tokenizer('a'), max_new_tokens: 1 });    // warm-up, as in official examples
  post({ type: 'ready', tier, device, dtype });
}

function startsWith(ids: bigint[], prefix: bigint[]) {
  if (prefix.length >= ids.length) return false;          // need ≥1 new token
  for (let i = 0; i < prefix.length; i++) if (ids[i] !== prefix[i]) return false;
  return true;
}
async function resetCache() { await cache?.dispose(); cache = null; cachedIds = []; }

async function generate(msg: Extract<In, { type: 'generate' }>) {
  const t = await lib();
  if (!model || !tokenizer || !stopper) throw new Error('model not loaded');
  stopper.reset();
  const inputs = tokenizer.apply_chat_template(msg.messages, { add_generation_prompt: true, return_dict: true }) as
    { input_ids: Tensor; attention_mask: Tensor };
  const ids = (inputs.input_ids.tolist() as bigint[][])[0];

  // generate() blindly drops the first cache.get_seq_length() tokens — verify they really match.
  if (cache && !startsWith(ids, cachedIds)) await resetCache();
  cache ??= new t.DynamicCache();

  let n = 0, t0 = 0;
  const streamer = new t.TextStreamer(tokenizer, {
    skip_prompt: true, skip_special_tokens: true,
    callback_function: (text: string) => post({ type: 'token', id: msg.id, text }),
    token_callback_function: () => { if (n++ === 0) t0 = performance.now(); },
  });
  const out = (await model.generate({
    ...inputs, past_key_values: cache,
    max_new_tokens: msg.maxNewTokens ?? 96,   // ALWAYS set: model.generate default is max_length=20
    do_sample: true, temperature: msg.temperature ?? 0.5, top_k: 50, top_p: 0.9, repetition_penalty: 1.05,
    streamer, stopping_criteria: stopper, return_dict_in_generate: true,
  })) as { sequences: Tensor; past_key_values: DynamicCacheT };

  const seq = (out.sequences.tolist() as bigint[][])[0];
  cachedIds = seq.slice(0, cache.get_seq_length());     // = prompt + generated − last token
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
      case 'unload': await resetCache(); await model?.dispose(); model = null; tokenizer = null; return post({ type: 'unloaded' });
    }
  } catch (err) { post({ type: 'error', error: String(err) }); }
};
```

### 1.6 Main-thread client (Svelte 5 runes, `.svelte.ts`) [U: not type-checked; written against the worker above]
```ts
// src/lib/ai/llm.svelte.ts
import type { In } from './llm.worker';
type Tier = 'lite' | 'quality';
type Msgs = Extract<In, { type: 'generate' }>['messages'];

export const llm = $state({
  phase: 'idle' as 'idle'|'probing'|'unsupported'|'available'|'loading'|'ready'|'error',
  device: '', dtype: '', f16: false, cached: { lite: false, quality: false },
  pct: 0, loadedMB: 0, totalMB: 0, note: '', error: '',
});
let worker: Worker | null = null, nextId = 1;
const pending = new Map<number, { onToken?: (t: string) => void; resolve: (r: { text: string; tps: number }) => void; reject: (e: Error) => void }>();

function w() {
  if (worker) return worker;
  worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' }); // literal form required by Vite
  worker.onmessage = ({ data: m }) => {
    switch (m.type) {
      case 'probe': Object.assign(llm, { device: m.device, dtype: m.dtype, f16: m.f16, cached: m.cached, phase: m.webgpu ? 'available' : 'unsupported' }); break;
      case 'progress': if (m.p.status === 'progress_total') Object.assign(llm, { pct: Math.round(m.p.progress), loadedMB: m.p.loaded / 1e6, totalMB: m.p.total / 1e6 }); break;
      case 'status': llm.note = m.text; break;
      case 'ready': llm.phase = 'ready'; llm.note = ''; localStorage.removeItem('llm-loading'); break;
      case 'token': pending.get(m.id)?.onToken?.(m.text); break;          // feed the VN typewriter queue, not the blips directly
      case 'done': { const p = pending.get(m.id); pending.delete(m.id); p?.resolve({ text: m.text, tps: m.tps }); break; }
      case 'error': llm.phase = 'error'; llm.error = m.error; for (const p of pending.values()) p.reject(new Error(m.error)); pending.clear(); break;
    }
  };
  return worker;
}
const send = (m: In) => w().postMessage(m);

export function probeLLM() { llm.phase = 'probing'; send({ type: 'probe' }); }
export async function loadLLM(tier: Tier) {
  try { await navigator.storage?.persist?.(); } catch {}
  localStorage.setItem('llm-loading', tier);   // crash-loop guard: if still set on next boot, the tab was killed (iOS) → don't auto-load
  llm.phase = 'loading'; send({ type: 'load', tier });
}
export function chat(messages: Msgs, onToken?: (t: string) => void, signal?: AbortSignal) {
  const id = nextId++;
  return new Promise<{ text: string; tps: number }>((resolve, reject) => {
    pending.set(id, { onToken, resolve, reject });
    signal?.addEventListener('abort', () => send({ type: 'interrupt' }), { once: true });
    send({ type: 'generate', id, messages, maxNewTokens: 80 });
  });
}
export function killLLM() { worker?.terminate(); worker = null; llm.phase = 'idle'; } // frees GPU memory reliably

// Title-screen check without downloading the library (Cache Storage is shared with the worker):
export async function isCachedLight(id: string, dtype: 'q4f16'|'q4'|'q8', rev = 'main') {
  if (!('caches' in self)) return false;
  try {
    const c = await caches.open('transformers-cache');
    const s = { q4f16: '_q4f16', q4: '_q4', q8: '_quantized' }[dtype], b = `https://huggingface.co/${id}/resolve/${rev}/`;
    const f = ['config.json','generation_config.json','tokenizer.json','tokenizer_config.json',`onnx/model${s}.onnx`,`onnx/model${s}.onnx_data`];
    return (await Promise.all(f.map((x) => c.match(b + x)))).every(Boolean);   // match() does not read the body
  } catch { return false; }
}
```

### 1.7 Reusing the KV cache across turns: rules and validation
- **The prefix is not checked.** `decoder_prepare_inputs_for_generation` slices `input_ids` at `past_key_values.get_seq_length()` and never compares tokens. A template change or a tokenization drift silently corrupts context. Hence the prefix check in the worker [V].
- **Validation run.** transformers.js 4.3.2 with LFM2.5-350M q4, run in Node on native CPU, on the same model and template as in the browser [V]:

| Turn | Prompt tokens | Cache before | Prefix reused | New tokens fed | Cache after (sequence length − 1) |
|---|---|---|---|---|---|
| 1 | 60 | 0 | n/a | 60 | 62 (63) |
| 2 | 73 | 62 | yes | 11 | 75 (76) |
| 3 | 94 | 75 | yes | 19 | 104 (105) |

  - The returned `past_key_values` is the same `DynamicCache` object, updated in place.
  - `generate()` does not dispose a cache you pass in. Call `cache.dispose()` yourself.
- **Keep the prefix stable.**
  - Keep the system prompt fixed per pig.
  - Put dynamic state (clock, location, needs, mood) at the start of the newest user turn, for example `[Thu 3:42 PM · Malachowsky Hall · hungry, happy]`.
  - Your `ChatContext` changes every turn. Putting it in the system prompt would force a full prefill each turn.
  - Trimming history or switching pig breaks the prefix, and the check resets the cache automatically.
- **Thinking templates.**
  - The LFM2.5 template removes `<think>` blocks from earlier assistant turns. Instruct models do not emit them, so the prefix stays stable [V template].
  - The LFM3 template removes reasoning from earlier turns unless `preserve_thinking` is set, so keep thinking off [S].
- **KV cache size is small.** LFM2.5-350M has only 6 full-attention layers (8 KV heads × 64 dims, fp16 cache for q4f16). That is about 12 KB per token, or about 24 MB at 2k tokens [V, computed from config].

### 1.8 Prompt and sampling guidance
- **Enforce hard quirks in code.** In the test, the 350M model answered "patriot" to "Hi! What do you do all day?" because the system prompt mentioned the rule [V]. Keep the "based" → "patriot" rule in the deterministic quirk layer, and give the LLM only a soft persona plus 2 or 3 example lines.
- **Keep generation short.** `max_new_tokens` 60 to 96. Prompts around 800 tokens or fewer (iOS prefill limits, section 3.4).
- **Sampling for chat:** `do_sample:true, temperature 0.4–0.6, top_k 50, top_p 0.9, repetition_penalty 1.05–1.1` [U, a tuning suggestion]. Liquid's official 0.1 is meant for task use.
- **Optional emotion tag.** To guarantee a valid leading emotion tag, pass `new StructuredOutputProcessor(tokenizer, {type:'regex', regex:'\\[(happy|sad|angry|surprised|shy|loving|proud|thinking)\\] [^\\n]{1,200}'})` as `logits_processor` [S API]. The masking cost per token on a 65,536-token vocabulary is untested [U].

---

## 2. Model caching and the "ready, no download needed" check
- **Where models go [V source].**
  - Cache Storage, in the cache named `env.cacheKey` = `'transformers-cache'`.
  - The key is the full resolve URL: `https://huggingface.co/{repo}/resolve/{revision}/{file}`, with revision defaulting to `main`.
  - Backend order: `env.customCache` (an object with `match`/`put`), then `env.experimental_useCrossOriginStorage` (needs a Chrome extension), then the Cache API, then the filesystem (Node only).
  - **Not OPFS** by default.
- **ONNX Runtime files [V source].** `env.useWasmCache` (default true when the Cache API exists) stores the `.wasm` and `.mjs` files in the same cache, which allows offline use. It requires `wasmPaths` to be an object `{wasm, mjs}`. Both the CDN default and the worker above use that form.
- **Cached files are never revalidated [V source].** To update weights, change `revision`, which produces new URLs. Then delete the old entries with `ModelRegistry.clear_pipeline_cache` or `cache.delete(url)`.
- **ModelRegistry API (4.0+) [S].**
  - `is_pipeline_cached` (boolean) and `is_pipeline_cached_files` (per file).
  - `get_pipeline_files`, `get_file_metadata` (size, useful for a "Download 258 MB?" prompt), `get_available_dtypes`, `clear_pipeline_cache`.
  - `progress_callback` also emits aggregate `progress_total` events.
- **Offline caveats [V source, U runtime].**
  - The file-discovery helpers in `pipeline()` and the registry ignore `revision`: `get_model_files` and `get_tokenizer_files` probe `main`. Network errors from those probes propagate.
  - With the default `main` revision, everything is cached and offline loading works.
  - If you pin a commit, the offline load can throw.
  - Test with DevTools set to Offline. After a positive cache check you can pass `local_files_only: true`.
  - Loading from cache still emits `progress` events (except on Firefox), so the UI should say "Loading from device…".
- **Durability.**
  - Call `navigator.storage.persist()` when the player opts in.
  - Safari 17 and later: origin quota up to 60% of disk, best-effort by default, and `persist()` is granted by heuristics such as being a Home Screen app [S].
  - Safari's tracking prevention deletes script-writable storage (including service-worker caches) after 7 days of Safari use without interaction. Home Screen web apps are exempt [S].
- **Memory during load [S #1827].**
  - On a first download, 4.3.2 reads the whole `.onnx_data` file into a `Uint8Array` and makes a second copy for `cache.put`.
  - A cache hit still reads the whole file into the JS heap once.
  - PR #1747 (stream into Cache Storage and hand ONNX Runtime a Blob) is approved but not merged.

---

## 3. Browser support, fallback, and iOS limits (late 2026)

### 3.1 WebGPU availability [S]
Sources: gpuweb implementation-status wiki, caniuse data updated 2026-10-29, Chrome/Firefox/WebKit notes.

| Browser | Enabled by default |
|---|---|
| Chrome / Edge on Windows x64, macOS, ChromeOS | Yes, since 113 |
| Chrome Android | 121+ on Android 12+ with ARM/Qualcomm/Intel GPUs. Imagination GPUs on Android 16+ (139). Samsung Xclipse: not yet |
| Chrome Linux | Intel Gen12+ (144). NVIDIA driver 535.183.01+ on Wayland (147). Other Linux GPUs and Windows ARM64: behind a flag |
| Safari macOS | 26+ **on macOS Tahoe 26+ only**. Current is Safari 27. caniuse marks it partial because of older macOS |
| Safari iOS / iPadOS / visionOS | 26+ |
| Firefox | Windows 141 (2025-07-22). Apple Silicon Mac: 145 on macOS 26+, 147 (2026-01-13) on all macOS versions. Linux and Intel Macs: Nightly only. Android: behind a flag. Current stable is 159 |

- **Global WebGPU support:** 85.8% full plus 3.66% partial (caniuse).
- transformers.js with WebGPU on Firefox is less tested [U].

### 3.2 shader-f16
- **Coverage:** web3dsurvey reports it on about 93.7% of WebGPU-capable devices: iOS 99.98%, macOS 99.86%, ChromeOS 99.63%, Windows 90.7%, Android 86.9%, Linux 74.5% [S].
- **Safari:** WebKit always advertises `ShaderF16` (`HardwareCapabilities.mm`) [V].
- **Chrome:** f16 since 120; on Linux NVIDIA since 155–156 [S].
- Choose `q4f16` when the adapter has it and `q4` otherwise. transformers.js does not check this for `q4f16` (`session.js`) [V].

### 3.3 WASM fallback performance (measured) [V]
Setup: ONNX Runtime Web 1.31.0-dev.20260914 WASM, run in Node 25 (V8, the same WASM engine as Chrome), Apple M1 Max, `onnx-community/LFM2.5-350M-ONNX`.

| Weights | Threads | Prefill (64 tokens) | Decode | Peak RSS |
|---|---|---|---|---|
| q4 (294 MB) | 1 | 32.9 tok/s | **0.99 tok/s** | 1.40 GB |
| q4 | 4 | 46.4 tok/s | 1.71 tok/s | 1.20 GB |
| q8 `_quantized` (510 MB) | 1 | 39.5 tok/s | 1.67 tok/s | 1.61 GB |
| q8 | 4 | 107.4 tok/s | 3.81 tok/s | 1.87 GB |

- **Why it is slow:** the profiler attributes **97.8%** of kernel time to `MatMulNBits`. ONNX Runtime's MLAS library has no WASM n-bit GEMM kernel; its dispatch covers AVX2/AVX512/NEON/RVV/LASX only (`mlas/lib/platform.cpp`). Both LFM q4 and q8 exports use `MatMulNBits`. By contrast, native ONNX Runtime CPU on the same machine runs the same graph quickly.
- **Browser path:** browsers get the asyncify build, which is likely the same speed or slower [U]. GitHub Pages also forces 1 thread (section 6.2).
- **1.2B estimate:** about 3–4× slower, roughly 0.3–1 tok/s [U].
- **Verdict:** the transformers.js WASM backend is not a viable fallback for LFM chat. Fall back to the heuristic engine. If a CPU LLM ever becomes a requirement, evaluate wllama with GGUF instead [U].

**WebGPU reference point [S]** (WebKit bug 311598, April 2026, M3 MacBook, Llama-3.2-1B decode):

| Runtime | Chrome | Safari |
|---|---|---|
| transformers.js | 42.7 tok/s | crashed from growing memory (about 29 tok/s before the crash; this was before 4.3.0) |
| WebLLM | 42.1 tok/s | 40.3 tok/s |
| wllama | 47.4 tok/s | 25.6 tok/s |

LFM2.5-350M should decode faster than a 1B model [U].

### 3.4 iOS and Safari memory
- **Observed tab limit.** An iPhone 16 Pro Max on iOS 27.2 logged an `ActiveHard 2048 MB (fatal)` limit for the WebContent process (`idevicesyslog` capture) [S #1827, community report].
- **First-load failures in stock 4.3.2.** LFM2.5-1.2B q4f16 (725 MiB) is killed on its first load (1,452 MB of JS ArrayBuffers at the end of the download). LFM3-1.7B fails even with an OPFS streaming workaround. In that report, models with up to about 0.8 GB of external data fit only when using the workaround.
- **Older guidance.** WebKit (2024): iOS tends to terminate processes near 1 GB, and WebLLM reduced its buffers to 256 MB [S bug 275958].
- **Buffer limit.** WebKit's iOS `maxBufferSize` is `max(256 MB, min(1 GB, maxBufferLength/3))` [V source].
- **Long prefills.** WebKit appears to enforce a watchdog of about 3 s per GPU command buffer, and ONNX Runtime submits each `run()` at once. A long single-pass prefill crashed the GPU process. transformers.js has no chunked prefill (feature request #1836) [S community].
- **JSPI build (experimental).** ONNX Runtime's JSPI build (16.8 MB versus 26.9 MB for asyncify) lowered Safari tab peak memory from 2,273 to 1,543 MB in one test and ran about 15% faster. It needs Safari 27 (`'Suspending' in WebAssembly`) [S #1835, community report; maintainers have not responded].
- **Policy for iOS:**
  - LFM2.5-350M q4f16 only, loaded on explicit opt-in.
  - Prompts around 800 tokens or fewer.
  - Use the crash-loop guard from 1.6.
  - Do not auto-load on low-memory devices [U].

---

## 4. Alternatives

| Option (version) | LFM support | Verdict |
|---|---|---|
| **transformers.js 4.3.2 + ORT WebGPU** | LFM2 and LFM2.5 since 3.7, practically 4.3.0+; LFM3 since 4.3.2. Liquid and onnx-community publish ONNX exports, and Liquid's own WebGPU Spaces use it | **Recommended.** It has `DynamicCache` reuse, `ModelRegistry` cache checks, structured output, and runs on Safari 26+ from 4.3.0. Weaknesses: memory spikes on iOS, no chunked prefill, a pinned dev ONNX Runtime build, unusable WASM |
| wllama 3.8.1 (llama.cpp WASM + WebGPU) | LFM2 / LFM2.5 GGUF yes. LFM3 needs llama.cpp b11960 (merged 2026-10-27), newer than wllama 3.8.1 | Best plan B, and a probably better CPU path [U]. The main build needs JSPI **and** Memory64; Safari uses the slower "compat" build. Multi-threading needs COOP/COEP, which Pages lacks. Files are limited to 2 GB |
| WebLLM 0.2.86 (MLC) | **None.** The prebuilt list has no LFM, and MLC-LLM's LFM2 PR #3579 is still open | Not viable now |
| ONNX Runtime Web directly | Liquid's cards show hand-written loops | More work for the same kernels. Only worth it later, for OPFS-backed external data or chunked prefill |
| MediaPipe LLM Inference (0.10.30) / LiteRT-LM JS (`@litert-lm/core`) | MediaPipe is maintenance-only. LiteRT-LM JS is an early preview whose docs list Gemma 4 only. Community LFM2.5 `.litertlm` files target native runtimes | Not viable |

---

## 5. Vite 8 + Svelte 5 + TypeScript

### 5.1 Verified probe build
Versions: Vite 8.3.5, Svelte 5.57.3, `@sveltejs/vite-plugin-svelte` 7.3.1, transformers.js 4.3.2, `vite-plugin-pwa` 2.0.0 [V].

| Output | Size |
|---|---|
| `llm.worker-*.js` | 3 KB |
| `transformers.web-*.js` (lazy chunk) | 583 KB (164 KB gzip) |
| `ort-wasm-simd-threaded.asyncify-*.wasm` | 26.9 MB (6.8 MB gzip) |
| `ort-wasm-simd-threaded.asyncify-*.mjs` (only when self-hosting) | 53 KB |

### 5.2 Config
Your project's `vite.config.ts` already matches this: `base:'./'`, `worker:{format:'es'}`, `optimizeDeps.exclude:['@huggingface/transformers']`, `build.target:'es2022'`.

- **`worker.format`.** `'iife'` also builds under Vite 8: Rolldown inlines the dynamic import into a 589 KB classic worker and rewrites `import.meta.url` to `self.location.href`. But it loses the lazy chunk, so keep `'es'` [V].
- **Worker detection** only works with the literal `new Worker(new URL('./x.ts', import.meta.url), {type:'module'})` [S].
- **Excluding transformers.js from pre-bundling** keeps ONNX Runtime's `new URL('…wasm', import.meta.url)` pointing at real files in dev. Its dependencies are pure ESM, so excluding is safe [V].

### 5.3 The ONNX Runtime WASM file
- Vite **always emits** the 26.9 MB `.wasm`, because ONNX Runtime's bundle references it. But at import time transformers.js sets `wasmPaths` to `https://cdn.jsdelivr.net/npm/onnxruntime-web@<pinned>/dist/ort-wasm-simd-threaded.asyncify.{mjs,wasm}`. Unless you override that, the emitted file is never used [V].
- **Option A: keep the CDN.** jsDelivr serves brotli (5.5 MB), immutable caching, and CORS/CORP headers [V].
- **Option B: self-host** with the `?url` imports from 1.5. They use `onnxruntime-web`'s exported subpaths, and the build is verified [V]. It is same-origin with no third party, and is still cached by `useWasmCache`. With a strict `node_modules` layout, add `onnxruntime-web@1.31.0-dev.20260914-8d85527a0` as an exact direct dependency.

### 5.4 Version pins
- **TypeScript 6.0.3.** `svelte-check` 4.7.7 declares a TypeScript peer of `^5 || ^6`. TypeScript 7.0.2 (the native Go compiler) is out but not supported there. The `create-vite` svelte-ts template also uses `~6.0.3` [V].
- **Bun.** You have 1.2.13 locally; current is 1.4.4. Pin the same version locally and in CI (`"packageManager":"bun@x.y.z"`) to avoid churn with `--frozen-lockfile` [U].

### 5.5 Pitfalls of `base:'./'` on a /&lt;repo&gt;/ subpath
1. `import.meta.env.BASE_URL` is `'./'`.
   - On the main thread it resolves against the document, which is fine.
   - Inside the worker it resolves against `/<repo>/assets/`, which is wrong.
   - In workers use `new URL('../x', import.meta.url)`, or pass `new URL('x', document.baseURI).href` from the main thread.
2. Never use root-absolute paths like `/sprites/…` for files in `public/`.
3. Register the service worker with a relative path (`./sw.js`, scope `./`). `vite-plugin-pwa` does this automatically from `base` [V].
4. Avoid path-based routing (no 404 fallback is needed). Use in-memory state or hash routes.
5. The dev server always serves at `/`. To test a subpath, serve `dist` copied into a `/<repo>/` folder of a static server.
6. `'./'` keeps working if you later add a custom domain.

---

## 6. GitHub Pages deployment

### 6.1 Workflow
Latest major versions as of today, all lightweight tags that resolve to these commits [V]:

| Action | Version | Commit | Notes |
|---|---|---|---|
| `actions/checkout` | v7 (7.0.1) | `3d3c42e5aac5ba805825da76410c181273ba90b1` | |
| `oven-sh/setup-bun` | v2 (2.2.0) | `0c5077e51419868618aeaa5fe8019c62421857d6` | |
| `actions/configure-pages` | v6 | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | |
| `actions/upload-pages-artifact` | v5 | `fc324d3547104276b827a68afc52ff2a11cc49c9` | Adds an `include-hidden-files` input; dotfiles are excluded by default |
| `actions/deploy-pages` | v5 (5.0.1) | `368f82528645a54fb793d4d04e342629a3f51346` | |

All of these actions run on Node 24.

```yaml
# .github/workflows/deploy.yml   (Settings → Pages → Source: GitHub Actions)
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false   # GitHub starter: let production deploys finish (Vite docs use true)
jobs:
  build:
    runs-on: ubuntu-24.04     # ubuntu-latest moves to 26.04 in Nov 2026
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2      # reads package.json "packageManager"/engines.bun, else latest
      - run: bun install --frozen-lockfile
      - run: bun run build              # vite runs under the runner's Node 22.23.4 (Vite 8 needs ≥22.12 or ^20.19)
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-24.04
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- **Jekyll:** an Actions deploy does not run Jekyll, so `.nojekyll` is unnecessary [U, standard behaviour].
- **Build script:** if `build:synth` needs local tools, use `build:web` in CI or commit the generated audio [U].
- **Limits [S]:** 1 GB published site, 100 GB/month soft bandwidth, 10-minute deploy timeout. The 10 builds/hour limit does not apply to Actions deploys. Models come from huggingface.co, so they do not count against Pages bandwidth.

### 6.2 Headers on Pages and their consequences
- **What Pages sends [V, observed]:** `cache-control: max-age=600`, `access-control-allow-origin: *`, gzip only (no brotli), and `application/wasm` for `.wasm` files. There are no custom headers (community discussion #13309).
- **Consequences:**
  - `crossOriginIsolated` is false, so there is no `SharedArrayBuffer`.
  - ONNX Runtime sets `numThreads = 1` [V source]; otherwise it would use `min(4, ceil(cores/2))`.
  - wllama runs single-threaded.
  - **WebGPU is unaffected.**
- **coi-serviceworker is not advisable:**
  - It is effectively unmaintained: npm 0.1.7 is from July 2023 and the last commit is December 2023.
  - It forces a reload on the first visit.
  - Safari has no COEP `credentialless` (MDN browser-compat-data), so it needs `require-corp`.
  - It occupies the one service-worker slot per scope, which conflicts with the PWA worker.
  - It routes every response, including 255–760 MB model downloads, through service-worker JS.
  - Hugging Face downloads themselves would still work: they are CORS fetches, and the HF CDN returns `ACAO:*`. jsDelivr sends `CORP: cross-origin` [V].
  - The only gain is multi-threaded WASM, which still runs at about 3.8 tok/s with 4 threads (section 3.3).
  - If you ever need COOP/COEP, host on a platform with a `_headers` file (Cloudflare Pages or Netlify) instead [S community].

---

## 7. PWA that does not interfere with the model cache
The following builds with `base:'./'`. It produces 6 precache entries totalling 625 KiB (including the transformers chunk and the worker), excludes the `.wasm`, and the generated service worker contains only `precacheAndRoute`, `cleanupOutdatedCaches` and a `NavigationRoute` [V].

```ts
// vite.config.ts (add to existing)
import { VitePWA } from 'vite-plugin-pwa';
VitePWA({
  registerType: 'prompt',            // show "update available"; avoid autoUpdate reloading mid-session
  injectRegister: false,             // call registerSW() from 'virtual:pwa-register' yourself (add "vite-plugin-pwa/client" to tsconfig types)
  manifest: { name: 'Kempanion Online', short_name: 'Kempanion', start_url: './', scope: './',
              display: 'standalone', background_color: '#1b1026', theme_color: '#ff9ecf', icons: [/* … */] },
  workbox: {
    globPatterns: ['**/*.{js,mjs,css,html,png,webp,svg,woff2,ogg,mp3,json}'],
    globIgnores: ['**/ort-wasm-*.wasm'],   // 27 MB; transformers.js caches it itself (useWasmCache)
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // default 2 MiB; build fails on oversize warnings
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,           // only deletes old workbox-precache-* caches
    runtimeCaching: [],                    // NO rules for huggingface.co / *.hf.co / cdn.jsdelivr.net
  },
}),
```

**Rules:**
- **Never touch `transformers-cache`.** Do not write "delete every cache that isn't mine" code in a custom `activate` handler.
- **Do not route model downloads through the service worker.** Without a matching route, Workbox does not call `respondWith`, so cross-origin downloads go straight to the network. A runtime rule would store the 255 MB+ files twice and stream them through service-worker JS.
- **Model updates:** change the model `revision` and delete the old URLs. Neither Workbox nor transformers.js revalidates `transformers-cache`.
- **Large sprite sets:** if the full set pushes the install size up, precache the core and runtime-cache the rest (`CacheFirst`, same origin only) [U].
- **Orphaned runtime files:** self-hosted ONNX Runtime files with a new hash leave old ~27 MB entries in `transformers-cache`. Delete `/assets/ort-wasm-*` keys that are no longer current on startup [U].

---

## 8. Open risks and unverified items
- **No browser runtime test.** I did not run WebGPU inference in a browser. WebGPU speed and memory numbers come from cited sources, not my own measurements [U].
- **iOS memory numbers** are community `idevicesyslog` reports from one device (iPhone 16 Pro Max, iOS 27.2). Apple documents no limit. Lower-RAM iPhones probably have lower limits [U].
- **LFM3 is not production-ready yet:**
  - transformers.js pins an ONNX Runtime dev build that predates the WebGPU sliding-window attention fix in 1.31.1 (#1839). That costs speed and memory, not correctness.
  - The issue's reporter also lists LFM2.5 as affected, but the LFM2.5 configs I checked have no `sliding_attention` layers [V], so it should only matter for LFM3.
  - Liquid's raw ONNX Runtime guide says to prefill in chunks of 256 tokens or fewer on WebGPU, and transformers.js does not chunk.
  - Forcing `onnxruntime-web@1.31.1` through package-manager overrides is untested [U].
- **Pinned revision plus offline load** may throw in 4.3.2 (source reading only; test it).
- **JSPI wasm on Safari, OPFS-backed external data, and chunked prefill** are community workarounds or open pull requests, not shipped features.
- **Sampling values, prompt budgets and the 1.2B WASM estimate** are engineering judgment.
- **On Bun:** a mismatch between local Bun 1.2.13 and CI's latest Bun could trip `--frozen-lockfile`.

## 9. Sources
- **transformers.js:**
  - npm metadata: https://registry.npmjs.org/@huggingface/transformers/latest
  - Releases: https://github.com/huggingface/transformers.js/releases (3.7.0, 4.0.0, 4.1.0, 4.3.0, 4.3.2)
  - Pull requests: #1821 (https://github.com/huggingface/transformers.js/pull/1821), #1638, #1700, #1753, #1747, #1783
  - Issues: #1604, #1724, #1827, #1835, #1836, #1839, #1527, #1242
  - Docs: https://huggingface.co/docs/transformers.js/index, `/guides/webgpu`, `/guides/dtypes`, `/api/env`, `/api/utils/model_registry`, `/api/generation/streamers`, `/api/generation/stopping_criteria`, `/api/generation/cache`
- **Examples:**
  - https://github.com/huggingface/transformers.js-examples/tree/main/llama-3.2-webgpu (also `smollm-webgpu`, `qwen3-webgpu`)
  - https://huggingface.co/spaces/LiquidAI/LFM2-WebGPU (`src/hooks/useLLM.ts`)
- **Models:**
  - https://huggingface.co/onnx-community/LFM2.5-350M-ONNX
  - https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-ONNX
  - https://huggingface.co/onnx-community/LFM3-1.7B-ONNX
  - https://huggingface.co/LiquidAI/LFM3-1.7B-ONNX
  - https://huggingface.co/LiquidAI/LFM2.5-350M
  - https://docs.liquid.ai/deployment/on-device/onnx
- **ONNX Runtime:**
  - https://registry.npmjs.org/onnxruntime-web
  - https://github.com/microsoft/onnxruntime/blob/main/onnxruntime/core/mlas/lib/platform.cpp
  - https://github.com/microsoft/onnxruntime/issues/23004
- **WebGPU status:**
  - https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
  - https://github.com/Fyrd/caniuse/blob/main/features-json/webgpu.json
  - https://developer.chrome.com/blog/new-in-webgpu-144 and https://developer.chrome.com/blog/new-in-webgpu-155-156
  - https://www.firefox.com/en-US/firefox/147.0/releasenotes/
  - https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
  - https://github.com/WebKit/WebKit/blob/main/Source/WebGPU/WebGPU/HardwareCapabilities.mm
  - https://web3dsurvey.com/webgpu/features/shader-f16
  - https://bugs.webkit.org/show_bug.cgi?id=275958 and https://bugs.webkit.org/show_bug.cgi?id=311598
  - https://webkit.org/blog/14403/updates-to-storage-policy/ and https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
  - https://webassembly.org/features/
- **Alternatives:**
  - https://github.com/mlc-ai/web-llm/releases and https://github.com/mlc-ai/mlc-llm/pull/3579
  - https://github.com/ngxson/wllama (README and `compat/README.md`)
  - https://reeselevine.github.io/llamas-on-the-web/ and https://arxiv.org/abs/2605.20706
  - https://huggingface.co/LiquidAI/LFM3-1.7B-GGUF
  - https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference/web_js and https://developers.google.com/edge/litert-lm/js
- **Vite:**
  - https://vite.dev/config/worker-options
  - https://vite.dev/guide/features#web-workers
  - https://vite.dev/guide/build#relative-base
  - https://github.com/vitejs/vite/blob/main/docs/guide/static-deploy-github-pages.yaml
  - https://github.com/vitejs/vite/blob/main/packages/create-vite/template-svelte-ts/package.json
- **GitHub:**
  - Actions: https://github.com/actions/checkout, https://github.com/oven-sh/setup-bun, https://github.com/actions/configure-pages, https://github.com/actions/upload-pages-artifact, https://github.com/actions/deploy-pages
  - https://github.com/actions/starter-workflows/blob/main/pages/static.yml
  - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
  - https://github.com/orgs/community/discussions/13309
  - https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- **Cross-origin isolation and PWA:**
  - https://github.com/gzuidhof/coi-serviceworker
  - https://github.com/mdn/browser-compat-data/blob/main/http/headers/Cross-Origin-Embedder-Policy.json
  - https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v2.0.0
  - https://vite-pwa-org.netlify.app/guide/faq
  - https://www.npmjs.com/package/@huggingface/transformers-structured-output

## 10. Local artifacts
All in the scratchpad. Nothing in the project was modified.
- Worker that passes the type-check and build: `<scratch>/vitebuild/src/llm.worker.ts`
- Verified Vite and PWA config: `<scratch>/vitebuild/vite.config.ts`
- WASM benchmark: `<scratch>/bench_scripts/wasm_decode_bench.mjs`
- Profiler log: `<scratch>/bench_scripts/profile_q8.log`
- KV-cache reuse test: `<scratch>/bench_scripts/kv_reuse_test.mjs`
- Downloaded model files (789 MB, safe to delete): `<scratch>/bench/models`