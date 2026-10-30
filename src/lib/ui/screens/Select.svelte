<script module lang="ts">
  import { registerMetaHooks } from '../meta/hooks';
  registerMetaHooks();
</script>

<script lang="ts">
  // Choose your Kempanion (screen version). Picking saves the companion, plays the reactions, then → hub.
  // params: { back?: ScreenId } shows a BACK button (e.g. when opened from somewhere you can return to).
  import type { PigId } from '../../types';
  import { game, type ScreenId } from '../../state/game.svelte';
  import CompanionPicker from '../meta/CompanionPicker.svelte';
  import { playSong } from '../meta/sfx';

  const back = typeof game.params.back === 'string' ? (game.params.back as ScreenId) : null;

  $effect(() => {
    playSong('title');
  });

  function chosen(_pig: PigId) {
    game.flush();
    game.go('hub', { from: 'select' });
  }
</script>

<CompanionPicker mode="screen" reactions onChosen={chosen} onBack={back ? () => game.go(back) : undefined} />
