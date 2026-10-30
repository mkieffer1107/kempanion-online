// "Big Brain" model tiers (docs/ARCHITECTURE.md §9, docs/research/llm-models.md, llm-runtime.md).
// Pure module: no DOM, no transformers import — safe for bun tests and the worker.

export type ModelId = 'lfm3' | 'lfm25' | 'lite';
export const MODEL_IDS: readonly ModelId[] = ['lfm3', 'lfm25', 'lite'] as const;

/** transformers.js dtype → file suffix: q4f16 → `_q4f16`, q4 → `_q4`. q4f16 needs the GPU feature `shader-f16`. */
export type Dtype = 'q4f16' | 'q4';
export const DTYPE_SUFFIX: Record<Dtype, string> = { q4f16: '_q4f16', q4: '_q4' };

export interface Sampling {
  temperature: number;
  top_k: number;
  repetition_penalty: number;
  max_new_tokens: number;
}

/**
 * Prompt-size knobs per tier, in prompts.ts estimateTokens() units. The estimate runs ~5–10% above the real
 * LFM tokenizers, so total 1050 ≈ 1,000 real tokens and 840 ≈ 800 (checked against the LFM3 and LFM2.5 tokenizers).
 */
export interface PromptBudget {
  /** Whole prompt (system + few-shot + history + newest turn). */
  total: number;
  /** Persona part of the system prompt. */
  persona: number;
  /** Few-shot user/assistant pairs. */
  fewShots: number;
  /** History turns kept (the window may grow by up to 3 more to keep the KV-cache prefix stable). */
  historyTurns: number;
  /** Remembered facts shown in the state line. */
  memories: number;
}

export interface ModelDef {
  id: ModelId;
  /** Tier label shown in the picker. */
  label: string;
  /** Model name shown in the picker. */
  name: string;
  /** Hugging Face repo (onnx-community export for LFM3 — Liquid's own LFM3 export is not loadable by transformers.js). */
  repo: string;
  blurb: string;
  /** Approximate download (weights + tokenizer + configs) per dtype, used until real sizes are fetched. */
  approxBytes: Record<Dtype, number>;
  /** Extra kwargs for tokenizer.apply_chat_template. */
  templateKwargs: Record<string, unknown>;
  /** Token ids that may never be generated (LFM3: `<think>`, `</think>` — they are NOT special tokens). */
  badWordsIds: number[][] | null;
  sampling: Sampling;
  budget: PromptBudget;
  /** Reference decode speed (M1 Max, WebGPU) for the UI. */
  approxTokensPerSec: number;
}

const MB = 1_000_000;

export const MODELS: Record<ModelId, ModelDef> = {
  lfm3: {
    id: 'lfm3',
    label: 'Best',
    name: 'LFM3 1.7B',
    repo: 'onnx-community/LFM3-1.7B-ONNX',
    blurb: 'Best replies. Desktop GPU.',
    // model_q4f16.onnx 296,714 + .onnx_data 1,087,789,056; q4 301,147 + 1,297,248,256; tokenizer.json 17.9 MB
    approxBytes: { q4f16: 1_106 * MB, q4: 1_316 * MB },
    // Thinking is ON by default in LFM3: turn it off and ban the think tokens (0/20 leaks with the regex constraint).
    templateKwargs: { enable_thinking: false },
    badWordsIds: [[124901], [124902]],
    sampling: { temperature: 0.6, top_k: 50, repetition_penalty: 1.1, max_new_tokens: 96 },
    // 2 few-shot pairs: LFM3 keeps the format well and the history shows it too; the room goes to history.
    budget: { total: 1050, persona: 340, fewShots: 2, historyTurns: 6, memories: 3 },
    approxTokensPerSec: 71,
  },
  lfm25: {
    id: 'lfm25',
    label: 'Standard',
    name: 'LFM2.5 1.2B',
    repo: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX',
    blurb: 'Fast and steady. Most laptops.',
    // q4f16 760,461,835; q4 850,242,437; tokenizer ~3.3 MB
    approxBytes: { q4f16: 764 * MB, q4: 854 * MB },
    templateKwargs: {},
    badWordsIds: null,
    // Liquid recommends repetition_penalty 1.05 for LFM2.5 (1.1 is the LFM3 value); the rest is the game's VN tuning.
    sampling: { temperature: 0.6, top_k: 50, repetition_penalty: 1.05, max_new_tokens: 96 },
    budget: { total: 1050, persona: 340, fewShots: 2, historyTurns: 6, memories: 3 },
    approxTokensPerSec: 101,
  },
  lite: {
    id: 'lite',
    label: 'Lite',
    name: 'LFM2.5 350M',
    repo: 'onnx-community/LFM2.5-350M-ONNX',
    blurb: 'Smallest and fastest. Phones OK.',
    // q4f16 255,148,587; q4 293,813,394; tokenizer 3.3 MB
    approxBytes: { q4f16: 259 * MB, q4: 297 * MB },
    templateKwargs: {},
    badWordsIds: null,
    sampling: { temperature: 0.6, top_k: 50, repetition_penalty: 1.05, max_new_tokens: 96 },
    // iOS prefill limits: keep the whole prompt around 800 tokens.
    budget: { total: 840, persona: 190, fewShots: 3, historyTurns: 4, memories: 3 },
    approxTokensPerSec: 134,
  },
};

export function isModelId(v: unknown): v is ModelId {
  return v === 'lfm3' || v === 'lfm25' || v === 'lite';
}

/** What the device can do (filled by aiManager.detect()). */
export interface DeviceCaps {
  webgpu: boolean;
  shaderF16: boolean;
  /** Phone or tablet (including iPadOS). */
  mobile: boolean;
  ios: boolean;
  /** navigator.deviceMemory in GB (Chromium only, capped at 8), or null when unknown. */
  deviceMemory: number | null;
}

/**
 * Default tier: phones / iOS / low memory → Lite; desktop with shader-f16 → Best (LFM3);
 * desktop without shader-f16 → Standard (LFM3's q4 file is 1.3 GB there).
 */
export function recommendDefault(caps: DeviceCaps): ModelId {
  if (caps.ios || caps.mobile) return 'lite';
  if (caps.deviceMemory !== null && caps.deviceMemory < 6) return 'lite';
  return caps.shaderF16 ? 'lfm3' : 'lfm25';
}

/** Settings.aiModel → a real tier. Unknown values (e.g. the old default 'lfm') map to the recommendation. */
export function resolveModelId(setting: string | null | undefined, caps: DeviceCaps): ModelId {
  return isModelId(setting) ? setting : recommendDefault(caps);
}

export function dtypeFor(caps: Pick<DeviceCaps, 'shaderF16'>): Dtype {
  return caps.shaderF16 ? 'q4f16' : 'q4';
}

export interface Availability {
  ok: boolean;
  /** Why it can't be used (shown on a disabled card). */
  reason?: string;
  /** Usable, but risky. */
  warn?: string;
}

export function availability(id: ModelId, caps: DeviceCaps): Availability {
  if (!caps.webgpu) return { ok: false, reason: 'Needs WebGPU.' };
  if (caps.ios && id !== 'lite') return { ok: false, reason: 'Too big for iPhone/iPad Safari (the tab would run out of memory).' };
  if (caps.mobile && id === 'lfm3') return { ok: false, reason: 'Desktop only.' };
  if (caps.mobile && id === 'lfm25') return { ok: true, warn: 'Big for a phone: may crash on devices with less memory.' };
  if (id === 'lfm3' && caps.deviceMemory !== null && caps.deviceMemory < 8) {
    return { ok: true, warn: 'Works best with 8 GB+ of memory.' };
  }
  if (id === 'lfm3' && !caps.shaderF16) return { ok: true, warn: 'Your GPU lacks shader-f16, so this is the larger 1.3 GB file.' };
  return { ok: true };
}

/** Files that must be in the Cache API for a "no download needed" load. */
export function requiredFiles(id: ModelId, dtype: Dtype): string[] {
  const s = DTYPE_SUFFIX[dtype];
  return ['config.json', 'tokenizer.json', 'tokenizer_config.json', `onnx/model${s}.onnx`, `onnx/model${s}.onnx_data`];
}

/** The big files whose sizes make up the download (configs add a few KB). */
export function sizedFiles(id: ModelId, dtype: Dtype): string[] {
  const s = DTYPE_SUFFIX[dtype];
  return [`onnx/model${s}.onnx`, `onnx/model${s}.onnx_data`, 'tokenizer.json'];
}

/** transformers.js Cache API key for a repo file (revision `main`). */
export function hfUrl(repo: string, file: string): string {
  return `https://huggingface.co/${repo}/resolve/main/${file}`;
}

/** "1.1 GB" / "764 MB" / "12 KB". */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 MB';
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  return `${Math.max(1, Math.round(n / 1e3))} KB`;
}
