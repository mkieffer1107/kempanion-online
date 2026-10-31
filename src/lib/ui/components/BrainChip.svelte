<script lang="ts">
  // BRAIN / BIG status chip (the download % while Big Brain installs). Opens the Big Brain panel
  // over the screen. The controls ship with the app so a later deploy cannot strand an open page with a missing
  // panel chunk. The large worker/runtime and model weights still load only when explicitly requested.
  import { game } from '../../state/game.svelte';
  import ModelPanel from '../../ai/ModelPanel.svelte';
  import { aiManager as mgr } from '../../ai/manager.svelte';
  import { pushEscape } from '../ui.svelte';
  import { audio } from '../../audio';
  import Icon from './Icon.svelte';

  let { small = false }: { small?: boolean } = $props();
  let open = $state(false);

  /** BIG only once a model is actually loaded and enabled. */
  const big = $derived(game.save.settings.aiMode === 'llm' && mgr.status === 'ready');
  /** Download/prepare progress while Big Brain is being installed. */
  const pct = $derived.by(() => {
    if (!mgr.busy) return null;
    const { loaded, total } = mgr.progress;
    return total > 0 ? Math.min(99, Math.floor((100 * loaded) / total)) : 0;
  });

  function show() {
    audio.sfx('ui_open');
    open = true;
  }

  function hide() {
    audio.sfx('ui_close');
    open = false;
  }

  // While the panel is up, Esc closes it (and only it).
  let popEscape: (() => void) | null = null;
  $effect(() => {
    if (open) popEscape = pushEscape(hide);
    return () => { popEscape?.(); popEscape = null; };
  });
</script>

<button
  type="button"
  class="chip"
  data-coach="brain"
  class:big
  class:busy={pct !== null}
  class:small
  onclick={show}
  aria-label={pct !== null ? `Big Brain installing, ${pct}%. Open brain settings` : big ? 'Big Brain is on. Open brain settings' : 'Big Brain is off. Open brain settings to download or load it'}
  title="Big Brain settings"
>
  <span class="face" data-coach-face>
    <Icon id={big || pct !== null ? 'brain_big' : 'brain_heur'} size={small ? 16 : 20} />
    <span class="label">{pct !== null ? `${pct}%` : big ? 'BIG' : 'BRAIN'}</span>
  </span>
</button>

{#if open}
  <div class="panel-layer" role="presentation">
    <button type="button" class="scrim" tabindex="-1" aria-label="Close" onclick={hide}></button>
    <div class="panel-box">
      <ModelPanel onClose={hide} />
    </div>
  </div>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    min-width: 44px;
    padding: 0;
    background: transparent;
    color: #cfc6dc;
    border: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  .face {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 44px;
    min-height: 44px;
    padding: 0 8px;
    background: rgba(26, 16, 48, 0.72);
    border: var(--px) solid #8a80a0;
  }
  .label { display: var(--brain-label-display, inline); }
  .chip.big { color: var(--sakura-2); }
  .chip.big .face { border-color: var(--sakura-3); }
  .chip.busy { color: var(--gold); }
  .chip.busy .face {
    border-color: var(--warn);
    background: repeating-linear-gradient(135deg, rgba(255, 176, 32, 0.22) 0 4px, rgba(26, 16, 48, 0.72) 4px 8px);
  }
  .chip.small { font-size: 11px; }
  /* Match the balance chip visually while the outer button keeps a full 44px touch target. */
  .chip.small .face { min-height: 32px; padding: 0 6px; }
  .chip:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }

  .panel-layer {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: calc(var(--safe-top) + 10px) calc(var(--safe-right) + 10px) calc(var(--safe-bottom) + 10px) calc(var(--safe-left) + 10px);
  }
  .scrim { position: absolute; inset: 0; border: 0; padding: 0; background: rgba(12, 6, 26, 0.62); cursor: default; }
  .panel-box { position: relative; width: min(680px, 100%); max-height: 100%; overflow: auto; display: flex; }
  .panel-box > :global(*) { flex: 1; max-height: 100%; }
</style>
