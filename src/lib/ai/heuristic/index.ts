// Deterministic chat brain ("Heuristic Brain"). Owner: heuristic agent.
// Pure TypeScript: no DOM, no Math.random; game time comes from src/lib/state/clock.ts.
import type { Brain } from '../brain';
import type { AnimId, ChatContext, ChatReply, ChatRequest, ChatTurn, Expression, PigId } from '../../types';
import { greetingLine, respondHeuristic } from './respond';

export type { IdleKind } from './lines/types';
export type { Intent, IntentGuess, IntentResult } from './intents';
export type { Entities, FoodRef } from './entities';
export { classifyIntent, INTENTS, LEAD_INTENTS } from './intents';
export { idleLine } from './idle';
export { suggestTopics } from './topics';
export { hardQuirk, respondHeuristic, MAX_CHARS, MAX_SENTENCES } from './respond';
export { sentenceCount } from './template';

export const heuristicBrain: Brain = {
  id: 'heuristic',
  async respond(req: ChatRequest, onToken?: (delta: string) => void): Promise<ChatReply> {
    const reply = respondHeuristic(req);
    onToken?.(reply.text);
    return reply;
  },
};

/** The pig's opening line when the player starts a free chat. Pass the pig's chat log to let him reference it. */
export function greeting(
  pig: PigId,
  ctx: ChatContext,
  history: readonly ChatTurn[] = [],
): { text: string; expression: Expression; anim?: AnimId } {
  return greetingLine(pig, ctx, history);
}
