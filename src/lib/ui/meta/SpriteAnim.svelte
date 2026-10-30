<script lang="ts">
  // A full-body 128x128 clip from the sprite atlas, played with the atlas' per-frame durations.
  // The canvas is shifted so the pig's feet (pivot y = 114) sit on the bottom edge of its box.
  import type { AnimId, OutfitId, PigId } from '../../types';
  import { FRAME, animDef } from './assets';
  import { whenImage } from './image-cache';
  import { motion } from './motion.svelte';

  let {
    pig,
    outfit = 'everyday',
    anim = 'idle',
    loops,
    onDone,
    flip = false,
    size = '128px',
    label = '',
  }: {
    pig: PigId;
    outfit?: OutfitId;
    anim?: AnimId;
    /** For looping clips: stop after this many loops and call onDone (default: loop forever). */
    loops?: number;
    /** Called when a one-shot clip (or `loops` loops) finishes; the last frame is held. */
    onDone?: () => void;
    flip?: boolean;
    /** CSS width/height of the 128x128 frame. */
    size?: string;
    label?: string;
  } = $props();

  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    const cv = canvas;
    const found = animDef(pig, outfit, anim);
    const reduced = motion.reduced;
    const maxLoops = loops;
    if (!cv || !found) return;
    const { url, def } = found;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let loopCount = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let live = true;

    const draw = (img: HTMLImageElement) => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, FRAME.w, FRAME.h);
      ctx.drawImage(img, frame * FRAME.w, def.y, FRAME.w, FRAME.h, 0, 0, FRAME.w, FRAME.h);
    };

    const cancel = whenImage(url, (img) => {
      if (!live) return;
      draw(img);
      if (reduced) {
        // Hold the first frame; still report completion so callers can move on.
        if (!def.loop || maxLoops !== undefined) timer = setTimeout(() => live && onDone?.(), 600);
        return;
      }
      const step = () => {
        if (!live) return;
        frame++;
        if (frame >= def.frames) {
          loopCount++;
          if (!def.loop || (maxLoops !== undefined && loopCount >= maxLoops)) {
            frame = def.frames - 1;
            onDone?.();
            return;
          }
          frame = 0;
        }
        draw(img);
        timer = setTimeout(step, def.durations[frame] ?? 160);
      };
      timer = setTimeout(step, def.durations[0] ?? 160);
    });

    return () => {
      live = false;
      if (timer) clearTimeout(timer);
      cancel();
    };
  });
</script>

<canvas
  bind:this={canvas}
  class="sprite"
  class:flip
  width={FRAME.w}
  height={FRAME.h}
  style:width={size}
  style:height={size}
  role={label ? 'img' : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : 'true'}
></canvas>

<style>
  .sprite {
    display: block;
    image-rendering: pixelated;
    transform: translateY(10.9%);
  }
  .sprite.flip {
    transform: translateY(10.9%) scaleX(-1);
  }
</style>
