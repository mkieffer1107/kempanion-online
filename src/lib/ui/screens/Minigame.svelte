<script lang="ts">
  // Mini-game screen: params { id, pig?, back?, backParams? }. Rewards go through the pet module
  // (MinigameHost → applyMinigameResult); then back to where the player came from.
  import { onMount } from 'svelte';
  import type { PigId } from '../../types';
  import { game, type ScreenId } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { MINIGAMES, type MinigameId } from '../../minigames';
  import { canPlayMinigame } from '../../pet';
  import { toast } from '../toasts.svelte';
  import MinigameHost from '../minigame/MinigameHost.svelte';

  const params = game.params as { id?: MinigameId; pig?: PigId; back?: ScreenId; backParams?: Record<string, unknown> };
  const def = params.id ? MINIGAMES[params.id] : undefined;
  const pig: PigId = params.pig ?? (def?.anyPig ? (game.save.companion ?? def.pig) : (def?.pig ?? 'piggy-1'));
  const back: ScreenId = params.back ?? (game.save.companion ? 'hub' : 'title');
  const can = def ? canPlayMinigame(game.save, pig, now()) : { ok: false, reason: 'That game isn’t here.' };
  let left = false;

  function leave() {
    if (left) return;
    left = true;
    game.go(back, params.backParams ?? {});
  }

  onMount(() => {
    if (!def || !can.ok) {
      toast(can.reason ?? 'Not right now.', { icon: 'energy', kind: 'warn' });
      queueMicrotask(leave);
    }
  });
</script>

{#if def && can.ok}
  <MinigameHost id={def.id} {pig} applyRewards ondone={leave} />
{/if}
