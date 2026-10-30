<script lang="ts">
  // DOM sprite player for one 128x128 atlas clip (travel strip, fallback stage). Stepped by the clip's
  // own frame durations; frozen on frame 0 under reduced motion.
  import type { AnimId, OutfitId, PigId } from '../../types';
  import { asset, clipInfo, FRAME } from '../sprites';
  import { ui } from '../ui.svelte';

  interface Props { pig: PigId; anim: AnimId; outfit?: OutfitId; scale?: number; flip?: boolean; label?: string }
  let { pig, anim, outfit = 'everyday', scale = 1, flip = false, label }: Props = $props();

  const clip = $derived(clipInfo(pig, outfit, anim) ?? clipInfo(pig, 'everyday', 'idle'));
  let frame = $state(0);

  $effect(() => {
    const c = clip;
    frame = 0;
    if (!c || ui.reduceMotion) return;
    let t: ReturnType<typeof setTimeout>;
    let i = 0;
    const step = () => {
      t = setTimeout(() => {
        i = c.loop ? (i + 1) % c.frames : Math.min(i + 1, c.frames - 1);
        frame = i;
        if (c.loop || i < c.frames - 1) step();
      }, c.durations[i] ?? 120);
    };
    step();
    return () => clearTimeout(t);
  });
</script>

{#if clip}
  <span
    class="sprite"
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : 'true'}
    style:width="{FRAME.w * scale}px"
    style:height="{FRAME.h * scale}px"
  >
    <span
      class="sheet"
      style:background-image="url({asset(clip.page)})"
      style:background-position="-{frame * FRAME.w}px -{clip.y}px"
      style:left={flip ? `${FRAME.w * scale}px` : '0'}
      style:transform="scale({scale * (flip ? -1 : 1)}, {scale})"
    ></span>
  </span>
{/if}

<style>
  .sprite { position: relative; display: inline-block; overflow: hidden; flex: none; }
  .sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 128px;
    height: 128px;
    background-repeat: no-repeat;
    transform-origin: 0 0;
    image-rendering: pixelated;
  }
</style>
