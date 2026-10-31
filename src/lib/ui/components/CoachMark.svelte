<script lang="ts">
  // Tutorial pointer: a pulsing pixel ring around one element ([data-coach="<id>"]), a bobbing arrow and a
  // caption with a "Later" button. Lives on document.body so the layout's transforms and overflow never clip
  // it; it follows the target (resize, layout switches) and hides while the target is gone. Clicks go
  // straight through the ring to the real control underneath. The caption stays inside the viewport, or inside
  // the `within` element (phone landscape: the stage, so it never covers the side rails' keys); `compact` puts the
  // button beside the text, for short screens.
  import { onMount } from 'svelte';
  import { motion } from '../meta/motion.svelte';

  let {
    target,
    text,
    dismissLabel = 'Later',
    ondismiss,
    within,
    compact = false,
  }: {
    target: string;
    text: string;
    dismissLabel?: string;
    ondismiss?: () => void;
    /** Selector of the element the caption stays inside (default: the viewport). */
    within?: string;
    /** One row: the text, then the button on its right (phone landscape, where height is short). */
    compact?: boolean;
  } = $props();

  interface Box { x: number; y: number; w: number; h: number }
  let rect = $state<Box | null>(null);
  /** Where the caption may go: the `within` element, else the viewport. */
  let area = $state<Box>({ x: 0, y: 0, w: 0, h: 0 });
  let vh = $state(0);
  let capH = $state(0);

  const boxOf = (r: DOMRect): Box => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  const same = (a: Box | null, b: Box) => !!a && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

  function measure() {
    vh = innerHeight;
    const bound = within ? document.querySelector<HTMLElement>(within)?.getBoundingClientRect() : undefined;
    const nextArea = bound && bound.width > 0 && bound.height > 0 ? boxOf(bound) : { x: 0, y: 0, w: innerWidth, h: innerHeight };
    if (!same(area, nextArea)) area = nextArea;
    const el = document.querySelector<HTMLElement>(`[data-coach="${target}"]`);
    if (!el) return void (rect = null);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return void (rect = null);
    const next = boxOf(r);
    if (!same(rect, next)) rect = next;
  }

  onMount(() => {
    measure();
    const id = setInterval(measure, 200);
    addEventListener('resize', measure);
    return () => {
      clearInterval(id);
      removeEventListener('resize', measure);
    };
  });

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  const PAD = 6;
  /** Arrow and caption go below a target in the top half of the area, above one in the bottom half. */
  const below = $derived(rect ? rect.y + rect.h / 2 < area.y + area.h / 2 : true);
  const cx = $derived(rect ? rect.x + rect.w / 2 : 0);
  /** Caption box: centered on the target, kept 12 px inside the area. */
  const capW = $derived(Math.min(340, area.w - 24));
  const capLeft = $derived(Math.max(area.x + 12, Math.min(area.x + area.w - capW - 12, cx - capW / 2)));
  /** Under the arrow (or over it); inside a `within` element it slides back in rather than cross its edge. */
  const capTop = $derived.by(() => {
    if (!rect || !below) return null;
    const top = rect.y + rect.h + PAD + 40;
    return within && capH > 0 ? Math.max(area.y + 12, Math.min(top, area.y + area.h - 12 - capH)) : top;
  });
  const capBottom = $derived.by(() => {
    if (!rect || below) return null;
    const bottom = vh - rect.y + PAD + 40;
    return within && capH > 0 ? Math.max(vh - area.y - area.h + 12, Math.min(bottom, vh - area.y - 12 - capH)) : bottom;
  });
</script>

{#if rect}
  <div class="coach" use:portal class:still={motion.reduced} aria-live="polite">
    <div
      class="ring"
      style:left="{rect.x - PAD}px"
      style:top="{rect.y - PAD}px"
      style:width="{rect.w + PAD * 2}px"
      style:height="{rect.h + PAD * 2}px"
    ></div>
    <div
      class="arrow"
      class:up={below}
      style:left="{cx - 12}px"
      style:top={below ? `${rect.y + rect.h + PAD + 6}px` : `${rect.y - PAD - 30}px`}
      aria-hidden="true"
    ></div>
    <div
      class="caption px-panel dark"
      class:compact
      style:left="{capLeft}px"
      style:width="{capW}px"
      style:top={capTop === null ? null : `${capTop}px`}
      style:bottom={capBottom === null ? null : `${capBottom}px`}
      bind:offsetHeight={capH}
      role="status"
    >
      <p>{text}</p>
      {#if ondismiss}
        <button type="button" class="px-btn ghost small" onclick={ondismiss}>{dismissLabel}</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .coach {
    position: fixed;
    inset: 0;
    z-index: 900;
    pointer-events: none;
  }
  .ring {
    position: fixed;
    box-shadow: 0 0 0 var(--px) var(--ink), 0 0 0 calc(var(--px) * 2) var(--sakura-1), 0 0 0 calc(var(--px) * 3) var(--ink);
    animation: pulse 1.1s steps(4) infinite;
  }
  /* A chunky pixel arrow: a 3-step stair triangle drawn with box-shadows on one 6 px square. */
  .arrow {
    position: fixed;
    width: 24px;
    height: 24px;
    animation: bob 0.9s steps(3) infinite;
    background:
      linear-gradient(var(--sakura-1), var(--sakura-1)) 9px 12px / 6px 12px no-repeat,
      linear-gradient(var(--sakura-1), var(--sakura-1)) 3px 6px / 18px 6px no-repeat,
      linear-gradient(var(--sakura-1), var(--sakura-1)) 9px 0 / 6px 6px no-repeat;
    filter: drop-shadow(var(--px) 0 0 var(--ink)) drop-shadow(calc(var(--px) * -1) 0 0 var(--ink))
      drop-shadow(0 var(--px) 0 var(--ink)) drop-shadow(0 calc(var(--px) * -1) 0 var(--ink));
    transform: rotate(180deg);
  }
  .arrow.up { transform: none; }
  .caption {
    position: fixed;
    margin: 0;
    padding: 10px 12px;
    display: grid;
    gap: 8px;
    justify-items: start;
    pointer-events: auto;
    font-size: 15px;
    line-height: 1.35;
  }
  .caption p { margin: 0; }
  .caption.compact {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding: 6px 8px 6px 10px;
    font-size: 14px;
    line-height: 1.3;
  }
  .still .ring, .still .arrow { animation: none; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
  @keyframes bob {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 4px; }
  }
</style>
