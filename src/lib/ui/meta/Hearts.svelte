<script lang="ts">
  // Ten pixel hearts + bond title + progress to the next heart (GAME_DESIGN §7).
  import { bondProgress, bondTitle } from '../../pet';
  import PixelGlyph from './PixelGlyph.svelte';

  let { bond, color = 'var(--sakura-3)', compact = false }: { bond: number; color?: string; compact?: boolean } = $props();

  const info = $derived(bondProgress(bond));
  const level = $derived(Math.max(0, Math.min(10, info.level)));
  const title = $derived(info.title || bondTitle(level));
  const pct = $derived(level >= 10 ? 100 : Math.round((info.into / Math.max(1, info.span)) * 100));
</script>

<div class="hearts" class:compact>
  <div class="row" role="img" aria-label="{level} of 10 hearts">
    {#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
      <PixelGlyph name={i < level ? 'heart' : 'heartEmpty'} scale={compact ? 2 : 3} {color} />
    {/each}
  </div>
  <div class="meta">
    <span class="lvl km-title">♥{level}</span>
    <span class="title km-title">{title}</span>
    {#if level < 10}<span class="next">{info.into}/{info.span} to ♥{level + 1}</span>{/if}
  </div>
  <div class="px-meter bar" style:--meter-color={color} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct} aria-label="Progress to the next heart">
    <div class="fill" style:width="{pct}%"></div>
  </div>
</div>

<style>
  .hearts { display: grid; gap: 6px; }
  .row { display: flex; flex-wrap: wrap; gap: 2px; }
  .meta { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .lvl { font-size: 20px; color: var(--sakura-2); }
  .title { font-size: 18px; color: var(--paper); }
  .next { font-size: 12px; opacity: 0.75; }
  .compact .lvl { font-size: 16px; }
  @media (max-aspect-ratio: 5/4), (max-height: 499px) {
    .row :global(svg) { width: 18px; height: 16px; }
  }
  .compact .title { font-size: 15px; }
</style>
