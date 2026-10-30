<script lang="ts">
  // A compact VN text box that plays a short sequence of lines (name plate, typewriter + blips, ▼).
  // Remount it (e.g. with {#key}) to play a different sequence.
  import { untrack } from 'svelte';
  import './meta.css';
  import { CHARACTERS, speakerColor, speakerName } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import type { MetaLine } from './content';
  import PixelGlyph from './PixelGlyph.svelte';
  import { Typewriter } from './typewriter.svelte';
  import { ui } from './sfx';

  let {
    lines,
    onDone,
    onLine,
    keys = true,
    hint = true,
  }: {
    lines: MetaLine[];
    onDone?: () => void;
    /** Called as each line starts (to sync portraits/expressions). */
    onLine?: (index: number, line: MetaLine) => void;
    /** Enter / Space / Z advance (capture phase, so the page underneath doesn't also react). */
    keys?: boolean;
    hint?: boolean;
  } = $props();

  const tw = new Typewriter();
  let index = $state(0);
  let finished = false;
  const line = $derived(lines[index]);

  function interp(text: string): string {
    const c = game.save.companion;
    return text
      .replace(/\{player\}/g, game.save.player.name || 'you')
      .replace(/\{companion\}/g, c ? CHARACTERS[c].name : 'your Kempanion');
  }
  const full = $derived(line ? interp(line.text) : '');
  const name = $derived(line ? speakerName(line.speaker, game.save.player.name) : '');
  const color = $derived(line ? speakerColor(line.speaker) : '');

  $effect(() => {
    const i = index;
    const l = lines[i];
    if (!l) return;
    untrack(() => {
      onLine?.(i, l);
      tw.start(interp(l.text), l.speaker);
    });
    return () => tw.stop();
  });

  function advance() {
    if (!tw.done) {
      tw.finish();
      return;
    }
    if (index < lines.length - 1) {
      ui.move();
      index++;
    } else if (!finished) {
      finished = true;
      onDone?.();
    }
  }

  $effect(() => {
    if (!keys) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) advance();
      }
    };
    addEventListener('keydown', h, true);
    return () => removeEventListener('keydown', h, true);
  });
</script>

{#if line}
  <div class="wrap">
    <button
      type="button"
      class="vn-box vnline km-step-in"
      class:narration={line.speaker === 'narrator'}
      aria-label={tw.done ? 'Next line' : 'Show the whole line'}
      onclick={(e) => {
        if (keys && e.detail === 0) return; // keyboard clicks are handled by the key listener
        advance();
      }}
    >
      {#if name}
        <span class="km-plate plate" style:--plate={color}>{name}</span>
      {/if}
      <span class="text" aria-hidden="true">{tw.visible}<span class="ghost">{full.slice(tw.visible.length)}</span></span>
      {#if tw.done && hint}
        <span class="next bob" aria-hidden="true"><PixelGlyph name="down" scale={2} color="var(--sakura-2)" /></span>
      {/if}
    </button>
    <p class="visually-hidden" aria-live="polite">{name ? `${name}: ` : ''}{full}</p>
  </div>
{/if}

<style>
  .wrap { position: relative; width: 100%; }
  .vnline {
    position: relative;
    display: block;
    width: 100%;
    min-height: 104px;
    padding: 18px 18px 14px;
    cursor: pointer;
    text-align: left;
    font-size: 18px;
    line-height: 1.5;
  }
  .vnline:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: calc(var(--px) * 2); }
  .plate {
    position: absolute;
    left: 14px;
    top: 0;
    transform: translateY(-62%);
    font-size: 16px;
  }
  .text {
    display: block;
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .narration .text { color: #e6dcff; font-style: normal; }
  .ghost { visibility: hidden; }
  .next {
    position: absolute;
    right: 14px;
    bottom: 8px;
  }
  @media (max-aspect-ratio: 5/4) {
    .vnline { font-size: 16px; min-height: 96px; padding: 18px 14px 12px; }
  }
</style>
