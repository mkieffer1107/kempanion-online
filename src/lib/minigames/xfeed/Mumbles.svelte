<script lang="ts">
  // Piggy 3's mumble clouds for For You Pig: small lilac pixel bubbles that pop out of him one word at a time, drift up
  // a few UI pixels and fade (a few up at once), all popping together when he snaps out of it. The art is the 9-slice
  // cloud from scripts/make-bubbles.ts (--palettes lilac), the same one Talk's mumble uses.
  // The layer fills its parent (the bubble zone beside or above his bust), so a bubble can never cover his face, the
  // phone in his hooves or the feed. One art pixel = var(--px). Reduce motion: no pop, drift or fade.
  // The bubbles are built imperatively: each one is measured before it is placed (the text sets its width).
  import slice from './mumble/mumble-lilac.png';
  import tailDL from './mumble/mumble-tail-lilac-dl.png';
  import tailDR from './mumble/mumble-tail-lilac-dr.png';

  interface Props {
    /** Bubbles up at once (3 upright phones, 4 landscape, 5 desktop). */
    cap?: number;
    reduce?: boolean;
    /** 'right': he is left of the zone (every tail points down-left); 'auto': he is below its middle. */
    side?: 'right' | 'auto';
    /** Px kept free at the zone's bottom (the faint mumble line). */
    reserve?: number;
  }

  let { cap = 3, reduce = false, side = 'right', reserve = 0 }: Props = $props();

  const LIFE_MS = 3200;
  const FADE_MS = 300;
  const SNAP_MS = 140;
  const DRIFT_ART = 4;
  /** Slots as fractions of the zone (x, y), tried from a rotating start; the first one that is free wins. */
  const SLOTS: readonly (readonly [number, number])[] = [[0.04, 0.06], [0.5, 0.02], [0.2, 0.38], [0.6, 0.4], [0.02, 0.66], [0.46, 0.72]];

  interface Item { el: HTMLDivElement; r: { x: number; y: number; w: number; h: number }; timer: ReturnType<typeof setTimeout> | 0 }

  let layer = $state<HTMLDivElement>();
  const live: Item[] = [];
  const fading: Item[] = [];
  let slotIx = 0;

  const hit = (a: Item['r'], b: Item['r'], pad: number) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

  function pxUnit(): number {
    if (!layer) return 2;
    const v = parseFloat(getComputedStyle(layer).getPropertyValue('--px'));
    return Number.isFinite(v) && v > 0 ? v : 2;
  }

  /** A new word: retire the oldest at the cap, build the cloud on the art grid, place it in the first free slot. */
  export function push(word: string, small = false): boolean {
    if (!layer || !word) return false;
    const zw = layer.clientWidth;
    const zh = layer.clientHeight - reserve;
    if (zw < 40 || zh < 24) return false;
    const px = pxUnit();
    // the layout's cap (3 / 4 / 5), but never more clouds than the zone holds comfortably (small phones: 2)
    const fit = Math.max(2, Math.floor((zw * zh) / (920 * px * px * 2.2)));
    while (live.length >= Math.min(cap, fit)) retire(live[0]);
    const el = document.createElement('div');
    el.className = 'mb';
    if (small) el.classList.add('small');
    const span = document.createElement('span');
    span.className = 'mb-t';
    span.textContent = word;
    el.appendChild(span);
    el.style.visibility = 'hidden';
    layer.appendChild(el);
    const maxW = Math.max(40, zw - 2 * px);
    let wText = span.getBoundingClientRect().width;
    let two = false;
    if (wText + 6 * px > maxW && word.includes(' ')) {
      // too wide for the zone: break at the space nearest the middle (two lines, 24 art px tall)
      const mid = word.length / 2;
      let best = -1;
      for (let i = 0; i < word.length; i++) if (word[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
      span.textContent = `${word.slice(0, best)}\n${word.slice(best + 1)}`;
      el.classList.add('two');
      two = true;
      wText = span.getBoundingClientRect().width;
    }
    // the text plus 3 art px each side fits inside 16 + 8m art px (the round ends take the rest)
    const m = Math.max(1, Math.ceil((wText / px + 6 - 16) / 8));
    el.style.setProperty('--m', String(m));
    const w = Math.min(zw, (16 + 8 * m) * px);
    const h = (two ? 24 : 16) * px;
    const tail = 3 * px;
    const drift = reduce ? 0 : DRIFT_ART * px;
    const place = (avoidFading: boolean) => {
      for (let k = 0; k < SLOTS.length; k++) {
        const [fx, fy] = SLOTS[(slotIx + k) % SLOTS.length];
        const x = Math.round(Math.max(0, Math.min(zw - w, fx * zw)) / px) * px;
        const y = Math.round(Math.max(drift, Math.min(zh - h - tail, fy * zh)) / px) * px;
        const r = { x, y: y - drift, w, h: h + tail + drift };
        if (live.some((o) => hit(r, o.r, px))) continue;
        if (avoidFading && fading.some((o) => hit(r, o.r, px))) continue;
        slotIx = (slotIx + k + 1) % SLOTS.length;
        return { x, y, r };
      }
      return null;
    };
    let p = place(true) ?? place(false);
    while (!p && live.length) {
      retire(live[0]);
      p = place(false);
    }
    if (!p) {
      el.remove();
      return false;
    }
    // taking the place of a cloud that is still fading: pop once it is mostly gone
    const pr = p.r;
    if (fading.some((o) => hit(pr, o.r, 0))) el.style.setProperty('--pop-delay', '200ms');
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    // a bubble on his right points its tail down-left at him, one on his left down-right
    const right = side === 'right' || p.x + w / 2 >= zw / 2;
    el.classList.add(right ? 'r' : 'l');
    el.classList.add(reduce ? 'still' : 'live');
    el.style.visibility = '';
    const item: Item = { el, r: p.r, timer: 0 };
    item.timer = setTimeout(() => retire(item), LIFE_MS);
    live.push(item);
    return true;
  }

  function retire(item: Item, instant = false): void {
    const i = live.indexOf(item);
    if (i < 0) return;
    live.splice(i, 1);
    if (item.timer) clearTimeout(item.timer);
    if (instant || reduce) {
      item.el.remove();
      return;
    }
    item.el.classList.add('out');
    fading.push(item);
    setTimeout(() => {
      item.el.remove();
      const j = fading.indexOf(item);
      if (j >= 0) fading.splice(j, 1);
    }, FADE_MS);
  }

  /** Fade out what is up (he starts saying something). */
  export function retireAll(): void {
    for (const item of [...live]) retire(item);
  }

  /** He snaps out of it: every bubble pops at once. */
  export function snap(): void {
    for (const item of [...live]) {
      live.splice(live.indexOf(item), 1);
      if (item.timer) clearTimeout(item.timer);
      if (reduce) {
        item.el.remove();
        continue;
      }
      item.el.classList.add('snap');
      setTimeout(() => item.el.remove(), SNAP_MS);
    }
  }

  export function clear(): void {
    for (const item of [...live, ...fading]) {
      if (item.timer) clearTimeout(item.timer);
      item.el.remove();
    }
    live.length = 0;
    fading.length = 0;
  }

  /** Live bubble boxes, relative to the zone (for layout checks). */
  export function rects(): { x: number; y: number; w: number; h: number }[] {
    return live.map((i) => ({ ...i.r }));
  }

  $effect(() => () => clear());
</script>

<div
  class="mumbles"
  bind:this={layer}
  aria-hidden="true"
  style:--mb-slice={`url(${slice})`}
  style:--mb-tail-dl={`url(${tailDL})`}
  style:--mb-tail-dr={`url(${tailDR})`}
></div>

<style>
  .mumbles { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
  .mumbles :global(.mb) {
    position: absolute;
    left: 0;
    top: 0;
    box-sizing: border-box;
    /* width 16 + 8m art px: the 8-px puff tile repeats exactly m times; one text line = 16 art px tall */
    width: calc((16 + 8 * var(--m, 1)) * var(--px));
    height: calc(16 * var(--px));
    border: solid transparent;
    border-width: calc(4 * var(--px)) calc(3 * var(--px));
    border-image: var(--mb-slice) 8 fill / calc(8 * var(--px)) / 0 round stretch;
    image-rendering: pixelated;
    color: #2e2142;
    font-family: var(--font-body);
    font-size: calc(4px + 4 * var(--px));
    line-height: calc(8 * var(--px));
    letter-spacing: 0;
    text-align: center;
    white-space: pre;
    -webkit-font-smoothing: none;
    filter: drop-shadow(0 var(--px) 0 rgba(27, 18, 41, 0.35));
  }
  /* DotGothic16 is drawn on a 16-dot grid: at 1 dppx its 12px dots break apart, so those screens get its native 16px */
  @media (max-resolution: 1.99dppx) {
    .mumbles :global(.mb) { font-size: 16px; }
  }
  .mumbles :global(.mb.small) { opacity: 0.88; }
  .mumbles :global(.mb.two) { height: calc(24 * var(--px)); }
  .mumbles :global(.mb-t) { display: inline-block; }
  /* tail: 5×4 art px, its top row on the bubble's last row (offsets from the padding box) */
  .mumbles :global(.mb::after) {
    content: '';
    position: absolute;
    top: calc(100% + 3 * var(--px));
    left: var(--px);
    width: calc(5 * var(--px));
    height: calc(4 * var(--px));
    background: var(--mb-tail-dl) 0 0 / 100% 100% no-repeat;
    image-rendering: pixelated;
  }
  .mumbles :global(.mb.l::after) { left: auto; right: var(--px); background-image: var(--mb-tail-dr); }
  .mumbles :global(.mb.r) { transform-origin: calc(6.5 * var(--px)) 100%; }
  .mumbles :global(.mb.l) { transform-origin: calc(100% - 6.5 * var(--px)) 100%; }
  .mumbles :global(.mb.live) {
    animation: xfmb-pop 150ms steps(3, jump-start) var(--pop-delay, 0ms) both, xfmb-drift 3200ms steps(4, jump-end) var(--pop-delay, 0ms) both;
  }
  .mumbles :global(.mb.live.out) {
    animation: xfmb-pop 150ms steps(3, jump-start) var(--pop-delay, 0ms) both, xfmb-drift 3200ms steps(4, jump-end) var(--pop-delay, 0ms) both,
      xfmb-out 300ms steps(3, jump-end) both;
  }
  .mumbles :global(.mb.live.snap) {
    animation: xfmb-pop 150ms steps(3, jump-start) var(--pop-delay, 0ms) both, xfmb-drift 3200ms steps(4, jump-end) var(--pop-delay, 0ms) both,
      xfmb-snap 140ms steps(2, jump-end) both;
    animation-play-state: paused, paused, running;
  }
  .mumbles :global(.mb.still) { animation: none; }
  @keyframes -global-xfmb-pop { from { scale: 0.4; opacity: 0; } to { scale: 1; opacity: 1; } }
  @keyframes -global-xfmb-drift { from { translate: 0 0; } to { translate: 0 calc(-4 * var(--px)); } }
  @keyframes -global-xfmb-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes -global-xfmb-snap { from { scale: 1; opacity: 1; } to { scale: 1.25; opacity: 0; } }
</style>
