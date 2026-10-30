<script lang="ts">
  // Shared frame for meta screens: W = centred PC-98 window over wallpaper (or a dimmed painting),
  // T = full-screen sheet with a [◀ BACK] bar, S = full-height panel with a compact bar.
  import type { Snippet } from 'svelte';
  import './meta.css';
  import { game } from '../../state/game.svelte';
  import PixelGlyph from './PixelGlyph.svelte';
  import { motion } from './motion.svelte';
  import { ui } from './sfx';

  let {
    title,
    jp = '',
    onBack,
    money = false,
    bg = '',
    focus = '50%',
    keys = true,
    actions,
    children,
  }: {
    title: string;
    jp?: string;
    onBack: () => void;
    /** Show the acorn counter. */
    money?: boolean;
    /** Optional background image URL drawn dimmed behind the window. */
    bg?: string;
    focus?: string;
    /** Esc / Backspace go back (disable while a child dialog is open). */
    keys?: boolean;
    actions?: Snippet;
    children: Snippet;
  } = $props();

  function back() {
    ui.back();
    onBack();
  }

  function onkeydown(e: KeyboardEvent) {
    if (!keys || e.defaultPrevented) return;
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === 'Escape' || (e.key === 'Backspace' && !typing)) {
      e.preventDefault();
      back();
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="km-screen frame" class:km-reduced={motion.reduced}>
  {#if bg}
    <div class="km-cover dimmed" style:background-image="url({bg})" style:--focus={focus} aria-hidden="true"></div>
  {:else}
    <div class="km-wallpaper" aria-hidden="true"></div>
  {/if}

  <section class="km-window sheet km-pop-in" aria-labelledby="km-frame-title">
    <header class="bar">
      <button class="px-btn ghost small backbtn" onclick={back} aria-label="Back">
        <PixelGlyph name="back" scale={2} /><span class="lbl">BACK</span>
      </button>
      <h1 id="km-frame-title" class="km-title name">{title}</h1>
      {#if jp}<span class="km-jp sub" aria-hidden="true">{jp}</span>{/if}
      <span class="spacer"></span>
      {@render actions?.()}
      {#if money}
        <span class="km-acorns" role="status" aria-label="{game.save.money} acorns">
          <PixelGlyph name="acorn" scale={2} />{game.save.money}
        </span>
      {/if}
    </header>
    <div class="body">
      {@render children()}
    </div>
  </section>
</div>

<style>
  .frame {
    display: grid;
    place-items: center;
    padding: max(24px, var(--safe-top)) max(24px, var(--safe-right)) max(24px, var(--safe-bottom)) max(24px, var(--safe-left));
  }
  .dimmed {
    filter: brightness(0.45) saturate(0.85);
  }
  .sheet {
    width: min(1180px, 100%);
    height: min(780px, 100%);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
    min-height: 56px;
    padding: calc(var(--px) * 3) calc(var(--px) * 4);
    background: linear-gradient(90deg, #d6608a 0 30%, #b25488 30% 55%, #7d4e9c 55% 100%);
    border-bottom: var(--px) solid var(--ink);
    text-shadow: 1px 1px 0 var(--ink);
  }
  .backbtn {
    flex: none;
    gap: 6px;
  }
  .name {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .sub {
    font-size: 13px;
    opacity: 0.85;
    white-space: nowrap;
  }
  .spacer { flex: 1; }
  .body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: calc(var(--px) * 4);
    gap: calc(var(--px) * 4);
  }

  /* T: phone portrait — full-screen sheet */
  @media (max-aspect-ratio: 5/4) {
    .frame { padding: 0; }
    .sheet { width: 100%; height: 100%; clip-path: none; border-width: 0; box-shadow: none; }
    .bar { padding-top: max(calc(var(--px) * 3), var(--safe-top)); padding-left: max(8px, var(--safe-left)); padding-right: max(8px, var(--safe-right)); }
    .body { padding: 10px max(10px, var(--safe-right)) max(10px, var(--safe-bottom)) max(10px, var(--safe-left)); gap: 10px; }
    .name { font-size: 22px; }
    .sub { display: none; }
  }
  /* S: phone landscape — full height, compact bar */
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .frame { padding: 0 max(8px, var(--safe-right)) 0 max(8px, var(--safe-left)); }
    .sheet { width: 100%; height: 100%; }
    .bar { min-height: 48px; padding-top: 2px; padding-bottom: 2px; }
    .body { padding: 8px 10px max(8px, var(--safe-bottom)); gap: 8px; }
    .name { font-size: 20px; }
    .lbl { display: none; }
  }
  @media (max-width: 420px) {
    .lbl { display: none; }
  }
</style>
