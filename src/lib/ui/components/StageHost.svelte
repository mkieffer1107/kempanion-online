<script lang="ts">
  // Hosts the canvas stage (src/lib/engine/Stage.svelte) inside a layout's stage slot, plus the CRT
  // scanline filter (stage only). `children` are overlays in stage coordinates (% of the canvas, or
  // calc(N * var(--u))); they opt in to pointer events with `pointer-events: auto`.
  import type { Snippet } from 'svelte';
  import Stage from '../../engine/Stage.svelte';

  interface Props {
    /** Scene summary for screen readers ("Malachowsky Hall, afternoon. Piggy 1 looks hungry."). */
    label?: string;
    children?: Snippet;
    /** Native touch feedback only while tapping the picture can advance dialogue. */
    advanceHaptics?: boolean;
  }

  let { label = '', children, advanceHaptics = false }: Props = $props();
</script>

<div class="stage-host">
  <Stage {label}>
    <!-- Below stage controls, inside the stage's existing pointer/capture path. -->
    <span class="advance-touch" data-haptic-area data-haptic-advance="Advance story"
      data-haptics={advanceHaptics ? undefined : 'off'} aria-hidden="true"></span>
    {@render children?.()}
    <!-- Inside the Stage so the scanlines line up with stage pixels (--u). -->
    <div class="crt" aria-hidden="true"></div>
  </Stage>
</div>

<style>
  .advance-touch { position: absolute; inset: 0; pointer-events: none; }
  .stage-host { position: absolute; inset: 0; overflow: hidden; background: #000; }
  .crt { display: none; }
  :global(html.crt) .crt {
    display: block;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
    background:
      repeating-linear-gradient(180deg, rgba(27, 18, 41, 0.2) 0 1px, transparent 1px max(2px, var(--u, 2px))),
      radial-gradient(ellipse at center, transparent 62%, rgba(10, 4, 24, 0.35) 100%);
  }
</style>
