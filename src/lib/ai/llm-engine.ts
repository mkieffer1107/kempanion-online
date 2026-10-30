// transformers.js runtime for the Big Brain: load (with aggregate progress), warm up, and generate with
// streaming, the `[expression] "line"` regex constraint, interruption and KV-cache reuse across turns.
// No DOM or worker globals: llm.worker.ts runs it on WebGPU, and it also runs under Node (device 'cpu')
// for verification. The library is passed in, so importing this file never pulls in transformers.js.
import type {
  DynamicCache,
  InterruptableStoppingCriteria,
  Message,
  PreTrainedModel,
  PreTrainedTokenizer,
  ProgressInfo,
  Tensor,
} from '@huggingface/transformers';
import type { StructuredOutputProcessor } from '@huggingface/transformers-structured-output';
import type { GenParams, GenResult, LlmMessage, LoadInfo, LoadPhase, LoadProgress } from './llm-protocol';
import type { Dtype } from './models';

type TF = typeof import('@huggingface/transformers');
type SOPClass = typeof StructuredOutputProcessor;
type ChatOptions = Parameters<PreTrainedTokenizer['apply_chat_template']>[1];
type GenerateArgs = Parameters<PreTrainedModel['generate']>[0];
type ChatInputs = { input_ids: Tensor; attention_mask: Tensor };

/** Past this many cached tokens the cache is dropped and the next turn prefills from scratch. */
export const MAX_CACHE_TOKENS = 3584;

/** True when `prefix` is a strict prefix of `ids` (at least one new token to feed). */
export function isTokenPrefix(ids: readonly bigint[], prefix: readonly bigint[]): boolean {
  if (prefix.length === 0 || prefix.length >= ids.length) return false;
  for (let i = 0; i < prefix.length; i++) if (ids[i] !== prefix[i]) return false;
  return true;
}

export interface EngineLoadOptions {
  repo: string;
  dtype: Dtype;
  device: 'webgpu' | 'cpu' | 'wasm';
  /** apply_chat_template kwargs (LFM3: enable_thinking false), also used for the warm-up prompt. */
  templateKwargs?: Record<string, unknown>;
  onProgress?: (p: LoadProgress) => void;
  onPhase?: (phase: LoadPhase) => void;
  /** Skip the file-metadata preflight (local/offline runs). */
  skipPreflight?: boolean;
}

interface FileState {
  loaded: number;
  total: number;
  done: boolean;
}

export class LlmEngine {
  readonly tf: TF;
  readonly SOP: SOPClass | null;
  tokenizer: PreTrainedTokenizer | null = null;
  model: PreTrainedModel | null = null;
  repo = '';
  dtype: Dtype | null = null;
  /** Turned off for good if the runtime proves the cache length doesn't match the token count. */
  kvReuse = true;
  #stopper: InterruptableStoppingCriteria | null = null;
  #cache: DynamicCache | null = null;
  #cachedIds: bigint[] = [];
  #cacheKey = '';
  #busy = false;

  constructor(tf: TF, SOP: SOPClass | null) {
    this.tf = tf;
    this.SOP = SOP;
  }

  get loaded(): boolean {
    return !!this.model && !!this.tokenizer;
  }

  get busy(): boolean {
    return this.#busy;
  }

  /** Tokens currently represented in the KV cache. */
  get cachedTokens(): number {
    return this.#cachedIds.length;
  }

  async load(o: EngineLoadOptions): Promise<LoadInfo> {
    const t0 = performance.now();
    const { tf } = this;
    const files = new Map<string, FileState>();
    let fromCache = false;

    // Preflight: every file and its size up front (one aggregate bar; also tells "download" from "from device").
    if (!o.skipPreflight) {
      try {
        const names = await tf.ModelRegistry.get_pipeline_files('text-generation', o.repo, { dtype: o.dtype, device: o.device });
        const metas = await Promise.all(names.map((f) => tf.ModelRegistry.get_file_metadata(o.repo, f).catch(() => null)));
        names.forEach((f, i) => {
          const m = metas[i];
          if (m?.exists) files.set(f, { loaded: 0, total: m.size ?? 0, done: false });
        });
        fromCache = files.size > 0 && metas.every((m) => !m || !m.exists || m.fromCache === true);
      } catch {
        /* offline or metadata unavailable: totals come from progress events */
      }
    }

    let phase: LoadPhase = 'download';
    let lastFile = '';
    let lastEmit = 0;
    o.onPhase?.('download');
    const emit = (force = false) => {
      const t = performance.now();
      if (!force && t - lastEmit < 100) return;
      lastEmit = t;
      let loaded = 0;
      let total = 0;
      let done = 0;
      for (const f of files.values()) {
        total += f.total;
        loaded += f.total ? Math.min(f.loaded, f.total) : f.loaded;
        if (f.done) done++;
      }
      o.onProgress?.({ loaded, total, file: lastFile, files: files.size, filesDone: done, fromCache });
      if (phase === 'download' && total > 0 && loaded >= total && done >= files.size) {
        phase = 'prepare';
        o.onPhase?.('prepare');
      }
    };
    const fileState = (name: string): FileState => {
      let f = files.get(name);
      if (!f) files.set(name, (f = { loaded: 0, total: 0, done: false }));
      return f;
    };
    const progress_callback = (info: ProgressInfo) => {
      if (info.status === 'initiate' || info.status === 'download') {
        fileState(info.file);
        lastFile = info.file;
      } else if (info.status === 'progress') {
        const f = fileState(info.file);
        f.loaded = info.loaded;
        f.total = Math.max(f.total, info.total || 0);
        lastFile = info.file;
        emit();
      } else if (info.status === 'done') {
        const f = fileState(info.file);
        f.done = true;
        if (f.total) f.loaded = f.total;
        else f.total = f.loaded;
        emit(true);
      }
    };

    const [tokenizer, model] = await Promise.all([
      tf.AutoTokenizer.from_pretrained(o.repo, { progress_callback }),
      tf.AutoModelForCausalLM.from_pretrained(o.repo, { device: o.device, dtype: o.dtype, progress_callback }),
    ]);
    this.tokenizer = tokenizer;
    this.model = model;
    this.repo = o.repo;
    this.dtype = o.dtype;
    this.#stopper = new tf.InterruptableStoppingCriteria();
    if (phase === 'download') o.onPhase?.('prepare');

    o.onPhase?.('warmup');
    await this.warmup(o.templateKwargs ?? {});
    return { repo: o.repo, dtype: o.dtype, device: o.device, ms: Math.round(performance.now() - t0), fromCache };
  }

  /** Compile shaders / build the constraint tables once so the first real reply is fast. */
  async warmup(templateKwargs: Record<string, unknown> = {}): Promise<void> {
    const tok = this.tokenizer;
    const model = this.model;
    if (!tok || !model) return;
    try {
      this.SOP?.warmup(tok);
    } catch {
      /* the processor builds its tables lazily instead */
    }
    const inputs = this.#chatInputs([{ role: 'user', content: 'Hi!' }], templateKwargs);
    await model.generate({ ...inputs, max_new_tokens: 2, do_sample: false } as unknown as GenerateArgs);
  }

  #chatInputs(messages: LlmMessage[], kwargs: Record<string, unknown>): ChatInputs {
    const tok = this.tokenizer!;
    const opts = { add_generation_prompt: true, return_dict: true, ...kwargs };
    return tok.apply_chat_template(messages as Message[], opts as ChatOptions) as unknown as ChatInputs;
  }

  /** Tokens of a rendered chat (debug/tests). */
  tokenize(messages: LlmMessage[], kwargs: Record<string, unknown> = {}): bigint[] {
    return (this.#chatInputs(messages, kwargs).input_ids.tolist() as bigint[][])[0];
  }

  async generate(p: GenParams, onToken?: (text: string) => void): Promise<GenResult> {
    const { tf } = this;
    const tok = this.tokenizer;
    const model = this.model;
    const stopper = this.#stopper;
    if (!tok || !model || !stopper) throw new Error('Big Brain is not loaded.');
    if (this.#busy) throw Object.assign(new Error('Big Brain is busy.'), { name: 'BusyError' });
    this.#busy = true;
    const t0 = performance.now();
    try {
      stopper.reset();
      const inputs = this.#chatInputs(p.messages, p.templateKwargs ?? {});
      const ids = (inputs.input_ids.tolist() as bigint[][])[0];

      // generate() silently drops the first cache.get_seq_length() prompt tokens without comparing them,
      // so reuse the cache only when its tokens are an exact prefix of this prompt (same pig/session).
      let reused = 0;
      if (
        this.kvReuse &&
        this.#cache &&
        this.#cacheKey === p.sessionKey &&
        ids.length <= MAX_CACHE_TOKENS &&
        isTokenPrefix(ids, this.#cachedIds)
      ) {
        reused = this.#cachedIds.length;
      } else {
        await this.resetCache();
      }
      const cache = this.#cache ?? new tf.DynamicCache();
      this.#cache = cache;
      this.#cacheKey = p.sessionKey;

      let n = 0;
      let tFirst = 0;
      let tLast = 0;
      const streamer = new tf.TextStreamer(tok, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          if (text) onToken?.(text);
        },
        token_callback_function: () => {
          const t = performance.now();
          if (n === 0) tFirst = t;
          tLast = t;
          n++;
        },
      });

      const args: Record<string, unknown> = {
        ...inputs,
        past_key_values: cache,
        max_new_tokens: p.maxNewTokens,
        do_sample: p.temperature > 0,
        temperature: p.temperature,
        top_k: p.topK,
        repetition_penalty: p.repetitionPenalty,
        streamer,
        stopping_criteria: stopper,
        return_dict_in_generate: true,
      };
      if (p.badWordsIds && p.badWordsIds.length) args.bad_words_ids = p.badWordsIds;
      if (p.regex && this.SOP) args.logits_processor = new this.SOP(tok, { type: 'regex', regex: p.regex });

      let out: { sequences: Tensor };
      try {
        out = (await model.generate(args as GenerateArgs)) as unknown as { sequences: Tensor };
      } catch (e) {
        await this.resetCache();
        throw e;
      }

      const seq = (out.sequences.tolist() as bigint[][])[0];
      // Self-check: the cache must hold exactly prompt + generated − 1 tokens (the last token is never fed back).
      // Anything else (e.g. a capped sliding-window cache) would corrupt the next turn → stop reusing.
      let cacheLen = -1;
      try {
        cacheLen = cache.get_seq_length();
      } catch {
        /* no attention cache entries */
      }
      if (cacheLen === seq.length - 1 && cacheLen <= MAX_CACHE_TOKENS) {
        this.#cachedIds = seq.slice(0, cacheLen);
      } else {
        if (cacheLen !== seq.length - 1) this.kvReuse = false;
        await this.resetCache();
      }

      const text = tok.decode(seq.slice(ids.length), { skip_special_tokens: true });
      const tps = n > 1 && tLast > tFirst ? (n - 1) / ((tLast - tFirst) / 1000) : 0;
      return {
        text,
        tokens: Math.max(0, seq.length - ids.length),
        tps,
        firstTokenMs: tFirst ? Math.round(tFirst - t0) : 0,
        promptTokens: ids.length,
        reusedTokens: reused,
        interrupted: stopper.interrupted,
        kvReuse: this.kvReuse,
        ms: Math.round(performance.now() - t0),
      };
    } finally {
      this.#busy = false;
    }
  }

  interrupt(): void {
    this.#stopper?.interrupt();
  }

  async resetCache(): Promise<void> {
    const c = this.#cache;
    this.#cache = null;
    this.#cachedIds = [];
    this.#cacheKey = '';
    if (c) {
      try {
        await c.dispose();
      } catch {
        /* already gone */
      }
    }
  }

  async dispose(): Promise<void> {
    await this.resetCache();
    const m = this.model;
    this.model = null;
    this.tokenizer = null;
    this.#stopper = null;
    if (m) {
      try {
        await m.dispose();
      } catch {
        /* GPU already lost */
      }
    }
  }
}
