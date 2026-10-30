<script lang="ts">
  // Hosts one mini-game full-screen. Each game shows its own results card (medal, rewards, jingle) before
  // calling onExit, so the host only applies the rewards: with applyRewards the run goes through the pet module
  // (applyMinigameResult: acorns, capped bond, fun/energy, tasks, wants, achievements) and toasts report the rest.
  // From a scene (vnHooks.runMinigame) the VN runner applies rewards itself.
  import { onMount } from 'svelte';
  import type { PigId } from '../../types';
  import { MINIGAMES, type MinigameId, type MinigameResult as BaseResult } from '../../minigames';
  import { applyMinigameResult, bondLevel, type MinigameApplied } from '../../pet';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { audio } from '../../audio';
  import { toast } from '../toasts.svelte';

  /** The registry's result plus the optional fields the pet-side games fill in. */
  type MinigameResult = BaseResult & { id?: MinigameId; medal?: 'none' | 'bronze' | 'silver' | 'gold'; firstRun?: boolean };

  interface Props {
    id: MinigameId;
    pig: PigId;
    applyRewards?: boolean;
    ondone: (result: MinigameResult | null) => void;
  }

  let { id, pig, applyRewards = true, ondone }: Props = $props();

  const def = $derived(MINIGAMES[id]);
  let finished = false;

  function finish(r: MinigameResult | null) {
    if (finished) return;
    finished = true;
    if (!r || !applyRewards) { ondone(r); return; }
    const level = bondLevel(game.save.pigs[pig].bond);
    const money = game.save.money;
    let applied: MinigameApplied | null = null;
    try {
      applied = applyMinigameResult(game.save, pig, { ...r, id: r.id ?? id }, now());
    } catch (e) {
      console.error('[minigame] applying rewards failed', e);
    }
    game.report({ pig, levelBefore: level, moneyBefore: money, tasks: applied?.tasks, achievements: applied?.achievements });
    if (applied?.wantFulfilled) toast('That was exactly what he wanted!', { icon: 'heart', kind: 'bond' });
    game.persist();
    ondone(r);
  }

  onMount(() => {
    // From a scene, hand the scene its music back afterwards; screens set their own.
    const prev = audio.currentSong();
    audio.playSong(def.song, { fadeMs: 400 });
    return () => { if (!applyRewards && prev) audio.playSong(prev, { fadeMs: 400 }); };
  });

  const Game = $derived(def.component);
</script>

<div class="host">
  <Game {pig} onExit={finish} />
</div>

<style>
  .host { position: absolute; inset: 0; overflow: hidden; background: var(--night); }
</style>
