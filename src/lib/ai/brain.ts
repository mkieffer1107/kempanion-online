import type { ChatReply, ChatRequest } from '../types';

/** Anything that can answer the player in character. */
export interface Brain {
  readonly id: 'heuristic' | 'llm';
  /**
   * Produce a reply. `onToken` receives incremental text (already stripped of any leading emotion tag)
   * for streaming display; brains that answer instantly may call it once or not at all.
   */
  respond(req: ChatRequest, onToken?: (delta: string) => void, signal?: AbortSignal): Promise<ChatReply>;
}
