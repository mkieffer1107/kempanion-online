<script module lang="ts">
  import { audio } from '../audio';
  import { setStageHooks } from './stage';

  // The stage's own sounds (thunder during storms) go through the audio module.
  setStageHooks({ sfx: (id) => audio.sfx(id) });
</script>

<script lang="ts">
  // The pixel stage: a canvas that fills its parent box (the parent must be positioned) and binds to
  // the `stage` singleton. Speech bubbles and `children` overlays live in stage coordinates:
  // position them with calc(N * var(--u)).
  import { onMount, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { CHARACTERS } from '../content/characters';
  import { game } from '../state/game.svelte';
  import { clamp, type StageFit } from './layout';
  import { StageView } from './view';
  import { world } from './world';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Overlays in stage coordinates (pointer events pass through unless an overlay re-enables them). */
    children?: Snippet;
    /** Canvas aria-label override (else stage.setDescription(), else an automatic scene summary). */
    description?: string;
    /** Alias of `description`. */
    label?: string;
  }

  let { children, description, label, class: className = '', ...rest }: Props = $props();

  interface BubbleItem { key: number; text: string; color: string }
  interface Placed { x: number; y: number; tail: number; w: number; h: number }

  let root: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let fit = $state.raw<StageFit | null>(null);
  let bubbles = $state.raw<BubbleItem[]>([]);
  let autoLabel = $state('Kempanion Online stage');
  let announcement = $state('');
  let reduce = $state(false);
  const ariaLabel = $derived(description || label || autoLabel);

  const bubbleEls = new Map<number, HTMLElement>();
  const placed = new Map<number, Placed>();
  let lastAnnounced = 0;
  let suppressClickUntil = 0;

  onMount(() => {
    const view = new StageView(world, canvas, root, {
      layout: (f) => {
        fit = f;
        for (const p of placed.values()) p.w = -1; // font size follows --u: re-measure bubbles
      },
      frame: placeBubbles,
      bubbles: syncBubbles,
      describe: (text) => (autoLabel = text),
    });
    return () => view.destroy();
  });

  $effect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reduce = game.save.settings.reduceMotion || media.matches;
      world.setReduceMotion(reduce);
    };
    apply();
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  });

  function syncBubbles() {
    bubbles = world.bubbles.map((b) => ({ key: b.key, text: b.text, color: b.pig ? CHARACTERS[b.pig].color : 'var(--ink)' }));
    const newest = world.bubbles[world.bubbles.length - 1];
    if (newest && newest.key > lastAnnounced) {
      lastAnnounced = newest.key;
      announcement = newest.pig ? `${CHARACTERS[newest.pig].name}: ${newest.text}` : newest.text;
    }
  }

  /** Per frame: follow the anchors (actors walk), clamp inside the stage, aim the tail. */
  function placeBubbles() {
    const f = fit;
    if (!f) return;
    for (const b of world.bubbles) {
      const el = bubbleEls.get(b.key);
      const p = placed.get(b.key);
      if (!el || !p) continue;
      if (p.w < 0) {
        p.w = el.offsetWidth;
        p.h = el.offsetHeight;
      }
      const half = p.w / 2;
      const ax = b.x * f.u;
      const x = Math.round(f.cssW - half - 2 < half + 2 ? f.cssW / 2 : clamp(ax, half + 2, f.cssW - half - 2));
      const y = Math.round(Math.max(p.h + 2, b.y * f.u));
      const tail = Math.round(clamp(ax - x, 8 - half, half - 8));
      if (x === p.x && y === p.y && tail === p.tail) continue;
      p.x = x;
      p.y = y;
      p.tail = tail;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      el.style.setProperty('--tail', `${tail}px`);
    }
  }

  function bubbleEl(key: number) {
    return (el: HTMLElement) => {
      bubbleEls.set(key, el);
      placed.set(key, { x: NaN, y: NaN, tail: 0, w: -1, h: 0 });
      placeBubbles();
      return () => {
        bubbleEls.delete(key);
        placed.delete(key);
      };
    };
  }

  // Golden petals are caught here so screens get it for free; the tap does not reach them.
  function onPointerDown(e: PointerEvent) {
    if (!e.isPrimary) return;
    if (world.catchAtClient(e.clientX, e.clientY)) {
      e.stopPropagation();
      e.preventDefault();
      suppressClickUntil = performance.now() + 700;
    }
  }

  function onClick(e: MouseEvent) {
    if (performance.now() >= suppressClickUntil) return;
    suppressClickUntil = 0;
    e.stopPropagation();
    e.preventDefault();
  }
</script>

<div
  {...rest}
  bind:this={root}
  class="stage-root {className}"
  class:reduce
  style:--u="{fit?.u ?? 1}px"
  style:--stage-w={fit?.lw ?? 480}
  style:--stage-h={270}
  onpointerdowncapture={onPointerDown}
  onclickcapture={onClick}
>
  <div
    class="stage-view"
    style:left="{fit?.left ?? 0}px"
    style:top="{fit?.top ?? 0}px"
    style:width="{fit?.cssW ?? 0}px"
    style:height="{fit?.cssH ?? 0}px"
  >
    <!-- The canvas is a picture of the scene (GAME_DESIGN §14): role="img" with a live summary. -->
    <!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
    <canvas bind:this={canvas} class="stage-canvas" class:upscaled={fit?.upscaled} role="img" aria-label={ariaLabel}></canvas>
    <div class="stage-overlay">
      {#each bubbles as b (b.key)}
        <div class="stage-bubble" style:--accent={b.color} {@attach bubbleEl(b.key)}>
          <span class="px-panel bubble-body">{b.text}</span>
          <span class="bubble-tail" aria-hidden="true"></span>
        </div>
      {/each}
      {@render children?.()}
    </div>
  </div>
  <p class="visually-hidden" aria-live="polite">{announcement}</p>
</div>

<style>
  .stage-root {
    position: absolute;
    inset: 0;
    overflow: hidden;
    contain: layout paint;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .stage-view {
    position: absolute;
  }

  .stage-canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    /* the backing store is already an integer nearest-neighbor upscale: shrink it smoothly for even pixels */
    image-rendering: auto;
  }

  .stage-canvas.upscaled {
    image-rendering: pixelated;
  }

  .stage-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .stage-bubble {
    position: absolute;
    left: 0;
    top: 0;
    max-width: min(80%, calc(var(--u) * 210));
    filter: drop-shadow(0 var(--px) 0 rgba(27, 18, 41, 0.35));
    will-change: transform;
  }

  .bubble-body {
    display: block;
    padding: calc(var(--px) * 1.5) calc(var(--px) * 3);
    border-top-color: var(--accent);
    font-family: var(--font-body);
    font-size: clamp(12px, calc(var(--u) * 8), 20px);
    line-height: 1.3;
    text-align: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    transform-origin: 50% 100%;
    animation: bubble-in 150ms steps(3, jump-start) both;
  }

  .bubble-tail {
    position: absolute;
    left: calc(50% + var(--tail, 0px));
    top: calc(100% - var(--px));
    width: calc(var(--px) * 5);
    height: calc(var(--px) * 3);
    margin-left: calc(var(--px) * -2.5);
    background: var(--ink);
    clip-path: polygon(0 0, 100% 0, 100% 33.33%, 80% 33.33%, 80% 66.67%, 60% 66.67%, 60% 100%, 40% 100%, 40% 66.67%, 20% 66.67%, 20% 33.33%, 0 33.33%);
  }

  .bubble-tail::before {
    content: '';
    position: absolute;
    left: 20%;
    top: 0;
    width: 60%;
    height: 66.67%;
    background: var(--paper);
    clip-path: polygon(0 0, 100% 0, 100% 50%, 66.67% 50%, 66.67% 100%, 33.33% 100%, 33.33% 50%, 0 50%);
  }

  .stage-root.reduce .bubble-body {
    animation: none;
  }

  @keyframes bubble-in {
    from {
      transform: scale(0.4);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
