// Music Room bookkeeping: songs count as heard once played (save.counters['heard:<id>']).
import { game } from '../../state/game.svelte';
import { isMeaningfulSave } from './save-utils';

export const HEARD_PREFIX = 'heard:';

/** Mark a song as heard. Persists only once a real save exists (otherwise it rides along with the next save). */
export function markHeard(id: string | null | undefined) {
  if (!id) return;
  const key = HEARD_PREFIX + id;
  const counters = game.save.counters;
  if (counters[key]) return;
  counters[key] = 1;
  if (isMeaningfulSave(game.save, game.hasSave)) game.persist();
}
