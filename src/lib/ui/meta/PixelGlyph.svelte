<script lang="ts">
  import { GLYPHS, glyphRuns, glyphSize, type GlyphName } from './glyphs';

  let {
    name,
    /** CSS px per glyph pixel. */
    scale = 2,
    title = '',
    color,
  }: { name: GlyphName; scale?: number; title?: string; color?: string } = $props();

  const glyph = $derived(GLYPHS[name]);
  const size = $derived(glyphSize(glyph));
  const runs = $derived(glyphRuns(glyph));
</script>

<svg
  class="glyph"
  width={size.w * scale}
  height={size.h * scale}
  viewBox="0 0 {size.w} {size.h}"
  shape-rendering="crispEdges"
  style:color={color}
  role={title ? 'img' : undefined}
  aria-label={title || undefined}
  aria-hidden={title ? undefined : 'true'}
>
  {#each runs as r, i (i)}
    <rect x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />
  {/each}
</svg>

<style>
  .glyph {
    display: inline-block;
    vertical-align: middle;
    flex: none;
    overflow: visible;
  }
</style>
