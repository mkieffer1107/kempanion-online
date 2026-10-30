<script lang="ts">
  // Shown only if a routed screen component is missing from the build.
  import { game } from '../../state/game.svelte';
</script>

<div class="missing">
  <div class="px-panel dark box">
    <p class="px-title">Under construction</p>
    <p>The “{game.screen}” screen isn’t in this build yet. Piggy 3 says it’s “not pretty yet.”</p>
    <button type="button" class="px-btn primary" onclick={() => game.go(game.save.companion ? 'hub' : 'title')}>
      {game.save.companion ? 'Back to the KempaPager' : 'Back to the title'}
    </button>
  </div>
</div>

<style>
  .missing { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: var(--night); }
  .box { max-width: 420px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  p { margin: 0; }
  .px-title { font-size: 22px; }
</style>
