// The AI pipeline's view of the rest of the game: settings, memory storage and the loaded LLM.
// index.ts depends only on this plain module (bun tests run it with the default heuristic-only host);
// manager.svelte.ts installs the real host (game store + LLM worker) when it is imported.
import type { AiMode, PigId } from '../types';
import type { GenResult, LlmMessage } from './llm-protocol';
import type { ModelId } from './models';

export type AiStatus = 'unsupported' | 'idle' | 'checking' | 'downloading' | 'loading' | 'warming' | 'ready' | 'error';

/** save.flags keys used by the AI module. */
export const BIG_BRAIN_FLAGS = {
  /** Lifetime free-chat exchanges (number). */
  chats: 'ai_chat_exchanges',
  /** Epoch ms when Piggy 3 last offered the Big Brain (number). */
  offeredAt: 'ai_bigbrain_offered_at',
  /** "Don't ask again" (boolean). */
  never: 'ai_bigbrain_never',
} as const;

export interface LlmGenerateOptions {
  /** One KV-cache session per pig. */
  sessionKey: string;
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
}

export interface LlmHandle {
  status(): AiStatus;
  modelId(): ModelId | null;
  /** WebGPU available? null until detected. */
  supported(): boolean | null;
  generate(messages: LlmMessage[], opts: LlmGenerateOptions): Promise<GenResult>;
  /** A generation failed (not a timeout); the manager decides whether to give up on the model. */
  reportFailure?(err: unknown): void;
}

export interface AiHost {
  settings(): { aiMode: AiMode; aiModel: string };
  remember(pig: PigId, fact: string): void;
  forget?(pig: PigId, predicate: (fact: string) => boolean): void;
  /** Called once per completed free-chat exchange (lifetime counter for the Big Brain offer). */
  countExchange?(): void;
  persist?(): void;
  llm: LlmHandle | null;
}

const DEFAULT_HOST: AiHost = {
  settings: () => ({ aiMode: 'heuristic', aiModel: '' }),
  remember: () => {},
  llm: null,
};

let current: AiHost = DEFAULT_HOST;
let installed = false;

export function installAiHost(host: AiHost): void {
  current = host;
  installed = true;
}

export function getAiHost(): AiHost {
  return current;
}

export function aiHostInstalled(): boolean {
  return installed;
}

/** Back to the heuristic-only default (tests). */
export function resetAiHost(): void {
  current = DEFAULT_HOST;
  installed = false;
}
