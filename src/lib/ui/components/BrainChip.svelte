<script lang="ts">
  // HEUR / BIG status chip (the download % while Big Brain installs). Opens the Big Brain panel
  // (src/lib/ai/ModelPanel.svelte, loaded on demand so the model manager stays out of the main bundle) over the screen.
  // Renders nothing unless this device said yes to Big Brain on the start menu (src/lib/ai/choice.ts): a "no"
  // keeps every Big Brain control out of the game, and Settings → Brain is where the player changes their mind.
  import { game } from '../../state/game.svelte';
  import { bigBrainUiEnabled, getBigBrainChoice, onBigBrainChoice } from '../../ai/choice';
  import { pushEscape } from '../ui.svelte';
  import { audio } from '../../audio';
  import Icon from './Icon.svelte';

  let { small = false }: { small?: boolean } = $props();
  let open = $state(false);

  let choice = $state(getBigBrainChoice());
  $effect(() => onBigBrainChoice((v) => (choice = v)));
  const enabled = $derived(bigBrainUiEnabled(choice));

  // The model manager is loaded lazily (App imports it after the first gesture); mirror its state once present.
  type Manager = typeof import('../../ai/manager.svelte').aiManager;
  let mgr = $state<Manager | null>(null);
  $effect(() => {
    if (enabled && !mgr) void import('../../ai/manager.svelte').then((m) => (mgr = m.aiManager));
  });
  /** BIG only once a model is actually loaded and enabled. */
  const big = $derived(game.save.settings.aiMode === 'llm' && mgr?.status === 'ready');
  /** Download/prepare progress while Big Brain is being installed. */
  const pct = $derived.by(() => {
    if (!mgr?.busy) return null;
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

{#if enabled}
  <button
    type="button"
    class="chip"
    data-coach="brain"
    class:big
    class:busy={pct !== null}
    class:small
    onclick={show}
    aria-label={pct !== null ? `Big Brain installing, ${pct}%. Open brain settings` : big ? 'Big Brain is on. Open brain settings' : 'Heuristic Brain. Open brain settings'}
    title="Brain"
  >
    <Icon id={big || pct !== null ? 'brain_big' : 'brain_heur'} size={small ? 16 : 20} />
    <span>{pct !== null ? `${pct}%` : big ? 'BIG' : 'HEUR'}</span>
  </button>
{/if}

{#if open}
  <div class="panel-layer" role="presentation">
    <button type="button" class="scrim" tabindex="-1" aria-label="Close" onclick={hide}></button>
    <div class="panel-box">
      {#await import('../../ai/ModelPanel.svelte') then m}
        <m.default onClose={hide} />
      {:catch}
        <p class="px-panel dark err">The Big Brain panel couldn’t load. The Heuristic Brain is still here!</p>
      {/await}
    </div>
  </div>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    min-width: 44px;
    padding: 0 8px;
    background: rgba(26, 16, 48, 0.72);
    color: #cfc6dc;
    border: var(--px) solid #8a80a0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  .chip.big { color: var(--sakura-2); border-color: var(--sakura-3); }
  .chip.busy {
    color: var(--gold);
    border-color: var(--warn);
    background: repeating-linear-gradient(135deg, rgba(255, 176, 32, 0.22) 0 4px, rgba(26, 16, 48, 0.72) 4px 8px);
  }
  .chip.small { font-size: 11px; padding: 0 6px; }
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
  .err { padding: 16px; margin: 0; }
</style>
