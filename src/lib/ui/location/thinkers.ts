// Who thinks next on a place screen (thoughts final.md §6.1). Pure: the screen passes its seeded rand.
import type { PortraitPos } from '../../engine/stage';
import type { PigId } from '../../types';
import { shuffle, type Rand } from '../../pet/rng';

export interface ThinkerOptions {
  /** rngFor('thinker', loc, date, beat). */
  rand: Rand;
  /** When each pig last had a thought on this screen (ms; missing = never). */
  lastThought: Partial<Record<PigId, number>>;
  /** The pig who last spoke or thought here: he sits this beat out unless he's the only candidate. */
  lastSpeaker: PigId | null;
}

/** Candidates in the order to try: a seeded shuffle, then whoever thought least recently first. */
export function nextThinkers(candidates: readonly PigId[], o: ThinkerOptions): PigId[] {
  const at = (p: PigId) => o.lastThought[p] ?? -Infinity;
  // stable: ties (and pigs who never thought here) keep the shuffle's order
  const order = shuffle(o.rand, candidates).sort((a, b) => (at(a) === at(b) ? 0 : at(a) < at(b) ? -1 : 1));
  return order.length > 1 && o.lastSpeaker ? order.filter((p) => p !== o.lastSpeaker) : order;
}

/** Slots that sit side by side: in a trio the center touches both ends; a pair's two slots are not adjacent. */
export function slotsAdjacent(a: PortraitPos, b: PortraitPos, count: number): boolean {
  if (a === b) return true;
  if (count < 3) return false;
  return a === 'center' || b === 'center';
}
