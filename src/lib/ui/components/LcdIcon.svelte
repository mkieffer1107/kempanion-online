<script lang="ts">
  // One KempaPager care key: icon + tiny label. `lit` = this need wants attention (dot + glow);
  // `active` = currently selected (inverted). Z cycles focus through [data-lcd] keys.
  import { game } from '../../state/game.svelte';
  import { audio } from '../../audio';
  import Icon from './Icon.svelte';

  interface Props {
    icon: string;
    label: string;
    /** Longer accessible description, e.g. "Feed. Piggy 1 is hungry, 1 of 4." */
    describe?: string;
    lit?: boolean;
    active?: boolean;
    disabled?: boolean;
    onclick?: () => void;
  }

  let { icon, label, describe, lit = false, active = false, disabled = false, onclick }: Props = $props();

  const appleTouch = typeof navigator !== 'undefined' && (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  const directHaptic = $derived(appleTouch && game.save.flags['ui.haptics'] !== false && !disabled);
  let action: HTMLButtonElement;

  function nativeClick(event: MouseEvent) {
    event.stopPropagation();
    // Keep the real button as the sole keyboard/assistive-technology action.
    (event.currentTarget as HTMLInputElement).blur();
    action.focus({ preventScroll: true });
    click();
  }

  function click() {
    if (disabled) { audio.sfx('ui_error'); return; }
    audio.sfx('ui_select');
    onclick?.();
  }
</script>

<div class={['lcd', { lit, active }]} data-disabled={disabled} title={label}>
  <button
    bind:this={action}
    type="button"
    class="action"
    aria-disabled={disabled}
    aria-label={describe ?? label}
    data-lcd
    onclick={click}
  >
    <span class="glyph"><Icon id={icon} size={32} /></span>
    <span class="lbl">{label}</span>
    {#if lit}<span class="dot" aria-hidden="true"></span>{/if}
  </button>
  {#if directHaptic}
    <!-- Like Soundboard: the finger toggles the native switch itself. No synthetic
         label.click() is involved. This surface is confined to this discrete key. -->
    <input
      class="native-haptic"
      type="checkbox"
      {...{ switch: '' }}
      tabindex="-1"
      aria-hidden="true"
      aria-label="Touch feedback"
      data-haptics="off"
      onpointerdown={(event) => event.stopPropagation()}
      onclick={nativeClick}
    />
  {/if}
</div>

<style>
  .lcd {
    --lcd-bg: #2a1f40;
    --lcd-ink: #ffe3ea;
    position: relative;
    appearance: none;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    min-width: 44px;
    min-height: 44px;
    width: var(--lcd-w, 100%);
    height: var(--lcd-h, 100%);
    padding: 2px 2px 3px;
    background: var(--lcd-bg);
    color: var(--lcd-ink);
    border: var(--px) solid var(--ink);
    box-shadow:
      inset var(--px) var(--px) 0 rgba(255, 255, 255, 0.12),
      inset calc(var(--px) * -1) calc(var(--px) * -1) 0 rgba(0, 0, 0, 0.45),
      0 var(--px) 0 var(--ink);
    cursor: pointer;
    font: inherit;
    transition: transform 60ms steps(2);
  }
  .action {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: inherit;
  }
  .native-haptic {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    opacity: 0;
    appearance: auto;
    -webkit-appearance: switch;
    touch-action: manipulation;
    cursor: pointer;
  }
  .action:focus-visible { outline: none; }
  .glyph { display: grid; place-items: center; width: var(--lcd-icon, 32px); height: var(--lcd-icon, 32px); }
  .glyph :global(img) { width: 100%; height: 100%; }
  .lbl {
    font-family: var(--font-display);
    font-size: var(--lcd-font, 11px);
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
  }
  .lcd:hover { filter: brightness(1.15); }
  .lcd:active { transform: translateY(var(--px)); box-shadow: inset var(--px) var(--px) 0 rgba(0, 0, 0, 0.45); }
  .lcd:has(.action:focus-visible) { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  .lcd.active, .lcd:has(.action:focus-visible) {
    --lcd-bg: var(--sakura-1);
    --lcd-ink: var(--ink);
  }
  .lcd.lit { border-color: var(--uf-orange); }
  .lcd[data-disabled='true'] { opacity: 0.45; cursor: not-allowed; }
  .dot {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 8px;
    height: 8px;
    background: var(--uf-orange);
    box-shadow: 0 0 0 2px var(--ink);
    animation: lcd-blink 1s steps(1) infinite;
  }
  @keyframes lcd-blink { 50% { opacity: 0.2; } }
  :global(html.reduce-motion) .dot { animation: none; }
</style>
