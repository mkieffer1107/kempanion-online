<script lang="ts">
  // A thought cloud (thoughts final.md §8, §10): what's on a pig's mind, as a lilac pixel cloud with a soft purple
  // edge, two puffs on top (one underneath beside an actor) and three beads trailing toward his head. Flavor only: a
  // focusable button that shows for `ms` (paused while hovered or focused, at least 1.5 s more after a blur), then
  // asks to go (`onexpire`). Nothing is announced when it appears. The want keeps its own solid paper box (Hub.svelte).
  //   side:  beside the hub actor's head, with the want's CSS math (head in % of the stage view, flip = to his left)
  //   above: over a portrait, at the spot placeBubble() found (stage-view px), beads dropping at tailX
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    icon: string;
    label: string;
    /** "Piggy 3’s thought: Thread 1/27" */
    aria: string;
    placement?: 'side' | 'above';
    /** side: top-center of his head, % of the stage view (the hub's `head`). */
    head?: { x: number; y: number };
    /** side: the cloud opens to his left (decided when it appears, see Hub.svelte). */
    flip?: boolean;
    /** above: from placeBubble(). */
    at?: { x: number; y: number; iconOnly: boolean; tailX: number; tailHidden: boolean } | null;
    /** Time on screen (ms). */
    ms?: number;
    /** data-thought (debug, QA). */
    id?: string;
    onclick: (hadFocus: boolean) => void;
    onexpire?: () => void;
  }

  let {
    icon, label, aria, placement = 'side', head = { x: 50, y: 30 }, flip = false, at = null, ms = 0, id, onclick, onexpire,
  }: Props = $props();

  const iconOnly = $derived(placement === 'above' && !!at?.iconOnly);
  const tailHidden = $derived(placement === 'above' && !!at?.tailHidden);

  // ── timer: paused while hovered or focused; a blur gives it at least 1.5 s more ──
  // `ms` is read once, at mount: while the cloud fades out its owner may already have dropped the thought it came
  // from, so handlers must not read props that point into it.
  let life = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remaining = 0;
  let startedAt = 0;
  let hovered = false;
  let focused = false;

  function run() {
    clearTimeout(timer);
    timer = undefined;
    if (!(life > 0) || hovered || focused) return;
    startedAt = performance.now();
    timer = setTimeout(() => {
      timer = undefined;
      onexpire?.();
    }, Math.max(0, remaining));
  }

  function pause() {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  }

  onMount(() => {
    life = remaining = ms;
    run();
    return () => {
      clearTimeout(timer);
      life = 0; // gone (or fading out): never expire twice
    };
  });

  function enter() {
    hovered = true;
    pause();
  }
  function leave() {
    hovered = false;
    run();
  }
  function focusin() {
    focused = true;
    pause();
  }
  function focusout() {
    focused = false;
    remaining = Math.max(remaining, 1500);
    run();
  }

  function tap(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    onclick(el.contains(document.activeElement) && document.activeElement !== document.body);
  }

  /** Exit: a 240 ms fade in three steps; none with reduce motion (the cloud simply disappears). */
  function exit(_node: Element) {
    const still = document.documentElement.classList.contains('reduce-motion');
    return { duration: still ? 0 : 240, css: (t: number) => `opacity: ${Math.ceil(t * 3) / 3}` };
  }
</script>

<button
  type="button"
  class="tb {placement}"
  class:flip={placement === 'side' && flip}
  class:icon-only={iconOnly}
  class:no-tail={tailHidden}
  style:--want-at={placement === 'side' ? `${flip ? 108 - head.x : head.x + 8}%` : undefined}
  style:--want-w={placement === 'side' ? `calc(min(${label.length}ch, 20ch) + 40px)` : undefined}
  style:top={placement === 'side' ? `${head.y + 14}%` : at ? `${at.y}px` : undefined}
  style:left={placement === 'above' && at ? `${at.x}px` : undefined}
  style:--tail-x={placement === 'above' && at ? `${at.tailX}px` : undefined}
  title={label}
  aria-label={aria}
  data-thought={id}
  onclick={tap}
  onpointerenter={enter}
  onpointerleave={leave}
  onfocusin={focusin}
  onfocusout={focusout}
  out:exit
>
  <span class="shape tb-cloud">
    <span class="cloud">
      <Icon id={icon} size={20} />
      {#if !iconOnly}<span class="tl">{label}</span>{/if}
    </span>
    <span class="puff p1" aria-hidden="true"></span>
    <span class="puff p2" aria-hidden="true"></span>
    {#if placement === 'side'}<span class="puff p3" aria-hidden="true"></span>{/if}
  </span>
  {#if !tailHidden}
    <span class="beads" aria-hidden="true"><span class="bead b1"></span><span class="bead b2"></span><span class="bead b3"></span></span>
  {/if}
</button>

<style>
  .tb {
    /* one pixel unit: 2 CSS px on phones, 3 elsewhere */
    --s: var(--px);
    --edge: #6b5a8e;
    --fill: #f6f0ff;
    --outline: drop-shadow(var(--s) 0 0 var(--edge)) drop-shadow(calc(var(--s) * -1) 0 0 var(--edge))
      drop-shadow(0 var(--s) 0 var(--edge)) drop-shadow(0 calc(var(--s) * -1) 0 var(--edge));
    position: absolute;
    z-index: 2;
    display: inline-flex;
    align-items: flex-start;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    max-width: calc(100% - 12px);
    padding: 0;
    border: 0;
    background: transparent;
    color: #2e2142;
    font-family: var(--font-body);
    font-size: 12px;
    cursor: pointer;
    pointer-events: auto;
    animation: tb-drift 2.4s steps(2) infinite;
  }
  .tb:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: 2px; }

  /* side (hub): the want's math. The near edge sits at --want-at from the stage edge on his side; when the cloud
     (≈ --want-w: label + icon and padding) wouldn't fit before the far edge it slides back over his head, so it stays
     6 px inside the stage. */
  .tb.side {
    left: min(var(--want-at), calc(100% - 6px - var(--want-w)));
    transform: translate(0, -100%);
    padding-bottom: 2px;
  }
  .tb.side.flip { left: auto; right: min(var(--want-at), calc(100% - 6px - var(--want-w))); }
  /* above (place screens): top-left from placeBubble(); the beads hang under it toward his head */
  .tb.above { padding-bottom: calc(var(--s) * 10); }
  .tb.above.no-tail { padding-bottom: 0; }

  .shape {
    position: relative;
    display: inline-flex;
    margin-top: calc(var(--s) * 2);
    filter: var(--outline);
    transform-origin: 50% 100%;
    animation: tb-pop 150ms steps(3, jump-start) 240ms both;
  }
  .side .shape { margin-bottom: calc(var(--s) * 2); }
  .cloud {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 30px;
    padding: 3px 9px 3px 7px;
    background: var(--fill);
    /* two-step pixel corners (the want's are square) */
    clip-path: polygon(
      0 calc(var(--s) * 2), var(--s) calc(var(--s) * 2), var(--s) var(--s), calc(var(--s) * 2) var(--s), calc(var(--s) * 2) 0,
      calc(100% - var(--s) * 2) 0, calc(100% - var(--s) * 2) var(--s), calc(100% - var(--s)) var(--s), calc(100% - var(--s)) calc(var(--s) * 2), 100% calc(var(--s) * 2),
      100% calc(100% - var(--s) * 2), calc(100% - var(--s)) calc(100% - var(--s) * 2), calc(100% - var(--s)) calc(100% - var(--s)), calc(100% - var(--s) * 2) calc(100% - var(--s)), calc(100% - var(--s) * 2) 100%,
      calc(var(--s) * 2) 100%, calc(var(--s) * 2) calc(100% - var(--s)), var(--s) calc(100% - var(--s)), var(--s) calc(100% - var(--s) * 2), 0 calc(100% - var(--s) * 2)
    );
  }
  .icon-only .cloud { padding: 3px 9px 3px 7px; }
  .tl { min-width: 0; max-width: 20ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1; }

  .puff {
    position: absolute;
    height: calc(var(--s) * 3);
    background: var(--fill);
    clip-path: polygon(0 var(--s), var(--s) var(--s), var(--s) 0, calc(100% - var(--s)) 0, calc(100% - var(--s)) var(--s), 100% var(--s), 100% 100%, 0 100%);
  }
  .p1 { left: 12%; width: 34%; top: calc(var(--s) * -2); }
  .p2 { left: 54%; width: 28%; top: calc(var(--s) * -2); }
  .p3 { left: 30%; width: 36%; bottom: calc(var(--s) * -2); transform: scaleY(-1); }

  /* Beads: 3, 2 and 1 units, round-ish (octagons), outlined by the same filter on their wrapper. */
  .beads { position: absolute; inset: 0; filter: var(--outline); pointer-events: none; }
  .bead { position: absolute; background: var(--fill); animation: tb-show 0s both; }
  .b1 {
    width: calc(var(--s) * 3);
    height: calc(var(--s) * 3);
    clip-path: polygon(33.3% 0, 66.7% 0, 100% 33.3%, 100% 66.7%, 66.7% 100%, 33.3% 100%, 0 66.7%, 0 33.3%);
    animation-delay: 180ms;
  }
  .b2 { width: calc(var(--s) * 2); height: calc(var(--s) * 2); animation-delay: 90ms; }
  .b3 { width: var(--s); height: var(--s); }
  /* side: they step down and out toward his head (mirrored when the cloud opens to his left) */
  .side .b1 { left: calc(var(--s) * -3); bottom: calc(var(--s) * -1); }
  .side .b2 { left: calc(var(--s) * -7); bottom: calc(var(--s) * -4); }
  .side .b3 { left: calc(var(--s) * -10); bottom: calc(var(--s) * -7); }
  .side.flip .b1 { left: auto; right: calc(var(--s) * -3); }
  .side.flip .b2 { left: auto; right: calc(var(--s) * -7); }
  .side.flip .b3 { left: auto; right: calc(var(--s) * -10); }
  /* above: they drop straight down from tailX */
  .above .b1 { left: calc(var(--tail-x, 50%) - var(--s) * 1.5); bottom: calc(var(--s) * 5); }
  .above .b2 { left: calc(var(--tail-x, 50%) - var(--s)); bottom: calc(var(--s) * 2); }
  .above .b3 { left: calc(var(--tail-x, 50%) - var(--s) * 0.5); bottom: 0; }

  /* High contrast (Settings → Access): opaque paper with an ink edge. */
  :global(.hc) .tb { --fill: var(--paper); --edge: var(--ink); color: var(--ink); }

  @keyframes tb-drift { 50% { translate: 0 -1px; } }
  @keyframes tb-pop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes tb-show { from { visibility: hidden; } to { visibility: visible; } }

  /* Reduce motion: no enter, idle or exit animation; the cloud simply appears and disappears. */
  :global(html.reduce-motion) .tb, :global(html.reduce-motion) .tb * { animation: none; }
</style>
