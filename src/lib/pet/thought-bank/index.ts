// The thought banks, one per pig (thoughts final.md §3, §16). Data only: the scheduler is ../thoughts.ts.
import type { PigId } from '../../types';
import type { PigThoughts } from './types';
import { PIGGY_1_THOUGHTS } from './piggy-1';
import { PIGGY_2_THOUGHTS } from './piggy-2';
import { PIGGY_3_THOUGHTS } from './piggy-3';

export type { PigThoughts, ThoughtDef, ThoughtFace, TopicRule } from './types';
export { THOUGHT_FACES } from './types';

/** Every pig's topics and thoughts. */
export const THOUGHT_BANKS: Record<PigId, PigThoughts> = {
  'piggy-1': PIGGY_1_THOUGHTS,
  'piggy-2': PIGGY_2_THOUGHTS,
  'piggy-3': PIGGY_3_THOUGHTS,
};
