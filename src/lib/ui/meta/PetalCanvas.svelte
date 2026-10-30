<script lang="ts">
  // Full-bleed layer of falling pixel petals. Renders nothing under reduced motion.
  import { runPetals } from './petals';
  import { motion } from './motion.svelte';

  let {
    count = 16,
    pixel = 0,
    night = false,
  }: { count?: number; /** CSS px per petal px; 0 = match a 480x270 background drawn with `cover`. */ pixel?: number; night?: boolean } = $props();

  let canvas = $state<HTMLCanvasElement>();

  function coverPixel(): number {
    const r = canvas?.getBoundingClientRect();
    const w = r?.width || innerWidth;
    const h = r?.height || innerHeight;
    return Math.max(2, Math.round(Math.max(w / 480, h / 270)));
  }

  $effect(() => {
    const cv = canvas;
    if (!cv || motion.reduced || count <= 0) return;
    const fixed = pixel;
    const handle = runPetals(cv, { count, night, pixel: fixed > 0 ? fixed : coverPixel });
    const ro = new ResizeObserver(() => handle.resize());
    ro.observe(cv);
    return () => {
      ro.disconnect();
      handle.stop();
    };
  });
</script>

{#if !motion.reduced}
  <canvas bind:this={canvas} class="petals" aria-hidden="true"></canvas>
{/if}

<style>
  .petals {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    image-rendering: pixelated;
  }
</style>
