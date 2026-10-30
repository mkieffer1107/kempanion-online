<script lang="ts">
  // One waist-up VN portrait cut from the sprite atlas onto its own 192x256 canvas (no neighbour bleed),
  // scaled with nearest-neighbour by CSS. Size it from the parent (height, or width via aspect-ratio).
  import type { Expression, OutfitId, PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { PORTRAIT_H, PORTRAIT_W, portraitCell } from './assets';
  import { whenImage } from './image-cache';
  import { motion } from './motion.svelte';

  let {
    pig,
    expression = 'neutral',
    outfit = 'everyday',
    alt,
    pop = true,
    silhouette = false,
  }: {
    pig: PigId;
    expression?: Expression;
    outfit?: OutfitId;
    /** Accessible label; defaults to "<name>, <expression>". Pass '' to hide from screen readers. */
    alt?: string;
    /** Little stepped scale pop when the expression changes. */
    pop?: boolean;
    /** Draw as a flat plum silhouette (locked entries). */
    silhouette?: boolean;
  } = $props();

  let canvas = $state<HTMLCanvasElement>();
  let popping = $state(false);
  const cell = $derived(portraitCell(pig, outfit, expression));
  const label = $derived(alt ?? `${CHARACTERS[pig].name}, ${expression.replace(/_/g, ' ')}`);

  $effect(() => {
    const cv = canvas;
    const c = cell;
    const flat = silhouette;
    if (!cv || !c) return;
    return whenImage(c.url, (img) => {
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
      ctx.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
      if (flat) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#5b3a6e';
        ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H);
        ctx.globalCompositeOperation = 'source-over';
      }
    });
  });

  let lastKey = '';
  $effect(() => {
    const key = `${pig}/${outfit}/${expression}`;
    if (lastKey && key !== lastKey && pop && !motion.reduced) {
      popping = true;
      const t = setTimeout(() => (popping = false), 160);
      lastKey = key;
      return () => {
        clearTimeout(t);
        popping = false;
      };
    }
    lastKey = key;
  });
</script>

<canvas
  bind:this={canvas}
  class="portrait"
  class:popping
  width={PORTRAIT_W}
  height={PORTRAIT_H}
  role={label ? 'img' : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : 'true'}
></canvas>

<style>
  .portrait {
    display: block;
    height: 100%;
    max-width: 100%;
    aspect-ratio: 192 / 256;
    object-fit: contain;
    image-rendering: pixelated;
    transform-origin: 50% 100%;
  }
  .popping {
    animation: pop 150ms steps(3) 1;
  }
  @keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.04); }
    100% { transform: scale(1); }
  }
</style>
