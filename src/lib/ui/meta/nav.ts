// Leaving a meta screen: an explicit params.back (+ params.backParams) wins, otherwise the store's history.
import { game, type ScreenId } from '../../state/game.svelte';

export function goBack(fallback: ScreenId): void {
  const p = game.params;
  if (typeof p.back === 'string') game.go(p.back as ScreenId, (p.backParams as Record<string, unknown> | undefined) ?? {});
  else game.back(fallback);
}
