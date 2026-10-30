// Typed message protocol between the main thread (llm-client.ts) and the LLM worker (llm.worker.ts).
// Pure types + one error classifier; safe to import anywhere.
import type { Dtype } from './models';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenParams {
  messages: LlmMessage[];
  /** KV cache is only reused within the same session (one per pig). */
  sessionKey: string;
  maxNewTokens: number;
  temperature: number;
  topK: number;
  repetitionPenalty: number;
  badWordsIds: number[][] | null;
  templateKwargs: Record<string, unknown>;
  /** StructuredOutputProcessor regex; null = unconstrained. */
  regex: string | null;
}

export type LoadPhase = 'download' | 'prepare' | 'warmup';

export interface LoadProgress {
  /** Bytes read so far (network or cache) across all files. */
  loaded: number;
  /** Expected bytes across all files (0 while unknown). */
  total: number;
  /** File currently reported. */
  file: string;
  files: number;
  filesDone: number;
  /** Every file was already in the browser cache ("loading from device"). */
  fromCache: boolean;
}

export interface LoadInfo {
  repo: string;
  dtype: Dtype;
  device: string;
  ms: number;
  fromCache: boolean;
}

export interface GenResult {
  /** Raw decoded output (special tokens skipped), e.g. `[happy] "Hey!"`. */
  text: string;
  /** New tokens generated. */
  tokens: number;
  /** Decode speed (tokens/s after the first token). */
  tps: number;
  /** Prompt processing time until the first new token. */
  firstTokenMs: number;
  promptTokens: number;
  /** Prompt tokens served from the KV cache (0 = full prefill). */
  reusedTokens: number;
  interrupted: boolean;
  /** False once the runtime proved the cache can't be reused for this model. */
  kvReuse: boolean;
  ms: number;
}

export type WorkerErrorCode = 'device-lost' | 'oom' | 'quota' | 'network' | 'unsupported' | 'busy' | 'load' | 'generate' | 'unknown';

export type WorkerRequest =
  | { type: 'load'; id: number; repo: string; dtype: Dtype; templateKwargs: Record<string, unknown> }
  | { type: 'generate'; id: number; params: GenParams }
  | { type: 'interrupt' }
  | { type: 'reset' }
  | { type: 'unload'; id: number };

export type WorkerEvent =
  | { type: 'progress'; id: number; progress: LoadProgress }
  | { type: 'phase'; id: number; phase: LoadPhase }
  | { type: 'loaded'; id: number; info: LoadInfo }
  | { type: 'token'; id: number; text: string }
  | { type: 'done'; id: number; result: GenResult }
  | { type: 'error'; id: number | null; message: string; code: WorkerErrorCode }
  | { type: 'device-lost'; reason: string; message: string }
  | { type: 'unloaded'; id: number };

/** Best-effort classification of runtime errors into something the UI can explain. */
export function classifyError(err: unknown): { message: string; code: WorkerErrorCode } {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name ?? '';
  const message = (e?.message ?? String(err ?? 'Unknown error')).slice(0, 400);
  const m = `${name} ${message}`.toLowerCase();
  if (name === 'QuotaExceededError' || /quota|no space|storage (is )?full|disk full/.test(m)) return { message, code: 'quota' };
  if (/device (was )?lost|devicelost|gpu (device|process) (lost|crashed)|context lost/.test(m)) return { message, code: 'device-lost' };
  if (/out of memory|oom|allocation failed|failed to allocate|array buffer allocation|maximum call stack|too large/.test(m)) {
    return { message, code: 'oom' };
  }
  if (/failed to fetch|networkerror|network error|load failed|err_|fetch failed|status 5\d\d|status 429|timed? ?out/.test(m)) {
    return { message, code: 'network' };
  }
  if (/webgpu|shader-f16|no available backend|not supported|unsupported|requestadapter/.test(m)) return { message, code: 'unsupported' };
  return { message, code: 'unknown' };
}
