<script lang="ts">
  // Piggy 3's Deku-style mumble bubbles. While his quiet, fast mumble stream types out in the dialogue box (chat.ts
  // plays it, mumbleStage says which page is up), each fragment's buzzword pops out of him in a small lilac pixel cloud
  // as the typewriter reaches it, drifts up a few UI pixels and fades, a few up at once (3 on an upright phone, 2 when
  // its picture is short, 4 landscape, 5 wide); when he snaps out of it they all pop. They sit beside his face, never
  // over it, the phone in his hoof, his fist, the dialogue window or the chrome in `avoid` (mumble-layout.ts places
  // them); on a letterboxed picture they may sit over the bars. Reduce motion: no pop, drift or fade, and each page's
  // words stand still beside him while that page is up.
  // A child of StageHost: the layer is the picture's box, and one bubble art pixel is var(--px). The cloud is the
  // 9-slice from scripts/make-bubbles.ts (public/assets/mumble/, lilac). Bubbles are built imperatively: each one is
  // measured before it is placed (its word sets its width).
  import { untrack } from 'svelte';
  import { assetUrl, loadImage } from '../../engine/assets';
  import type { PortraitPos } from '../../engine/stage';
  import { game } from '../../state/game.svelte';
  import type { OutfitId } from '../../types';
  import { dialogue } from '../dialogue.svelte';
  import { mumbleStage, type MumbleWord } from './mumble.svelte';
  import {
    MAX_BUBBLE_ART, MUMBLE_TIMING, TAIL_ART, hit, mumbleCap, mumbleKeepOut, placeMumble,
    type MumbleGeo, type MumbleMode, type Placement, type Rect,
  } from './mumble-layout';

  interface Props {
    /** viewport.mode: which side of him the bubbles take, and how many are up at once. */
    mode: MumbleMode;
    /** His portrait slot (Talk: 'left' on wide layouts, 'center' on an upright phone). */
    pos: PortraitPos;
    /** His outfit (the hoodie's phone pose sits a little higher). */
    outfit: OutfitId;
    /** Chrome over the stage to keep clear of besides the dialogue window (a selector; what overlaps the stage counts). */
    avoid?: string;
  }

  let { mode, pos, outfit, avoid = '' }: Props = $props();

  const ART = { slice: 'mumble/mumble-lilac.png', dl: 'mumble/mumble-tail-lilac-dl.png', dr: 'mumble/mumble-tail-lilac-dr.png' };
  /** The dialogue window's parts over the stage: the highest one's top is the bubbles' floor. */
  const WINDOW = '.vn .head, .vn .box';

  interface Item {
    el: HTMLDivElement;
    r: Rect;
    timer: ReturnType<typeof setTimeout> | 0;
  }

  let layer = $state<HTMLDivElement>();
  const live: Item[] = [];
  const fading: Item[] = [];
  let slotIx = 0;
  /** This page's words not popped yet, by `at`. */
  let pending: MumbleWord[] = [];
  /** The page has typed (or Reduce motion placed its words): nothing more pops until the next page. */
  let frozen = true;
  let seenPage = -1;

  const reduceQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduce = () => game.save.settings.reduceMotion || !!reduceQuery?.matches;

  /** The stage, measured now: his keep-outs, the picture above the window, the chrome over it (layer px). */
  function geo(): MumbleGeo | null {
    const el = layer;
    const root = el?.closest<HTMLElement>('.stage-root');
    if (!el || !root) return null;
    const rv = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    if (rv.width < 40 || rv.height < 40) return null;
    const cs = getComputedStyle(el);
    const u = parseFloat(cs.getPropertyValue('--u'));
    const lw = parseFloat(cs.getPropertyValue('--stage-w'));
    const px = parseFloat(cs.getPropertyValue('--px')) || 2;
    if (!(u > 0) || !(lw > 0)) return null;
    let floor = rr.bottom;
    const obstacles: Rect[] = [];
    for (const o of document.querySelectorAll<HTMLElement>([WINDOW, avoid].filter(Boolean).join(', '))) {
      const q = o.getBoundingClientRect();
      if (q.width < 1 || q.height < 1 || getComputedStyle(o).visibility === 'hidden') continue;
      if (q.bottom <= rr.top || q.top >= rr.bottom || q.right <= rr.left || q.left >= rr.right) continue;
      if (o.matches(WINDOW) && q.top > rr.top + 20) floor = Math.min(floor, q.top);
      obstacles.push({ x: q.left - rv.left - 4, y: q.top - rv.top - 2, w: q.width + 8, h: q.height + 6 });
    }
    // the picture inside the stage box, from its top to the window's, 4 px in
    const left = Math.max(rr.left, rv.left);
    const right = Math.min(rr.right, rv.right);
    const y = Math.max(rr.top, rv.top) - rv.top + 4;
    const h = Math.min(floor, rv.bottom) - rv.top - 4 - y;
    const zone = { x: left - rv.left + 4, y, w: right - left - 8, h };
    const wide = { x: rr.left - rv.left + 4, y, w: rr.width - 8, h };
    return { mode, px, keep: mumbleKeepOut(outfit, pos, lw, u), zone, wide: wide.w > zone.w + 2 ? wide : undefined, obstacles };
  }

  /** A cloud on the art grid: width 16 + 8m art px (the puff tile repeats m times), one line (16) or two (24). */
  function build(word: string, g: MumbleGeo) {
    const el = document.createElement('div');
    el.className = 'mb';
    const span = document.createElement('span');
    span.className = 'mb-t';
    span.textContent = word;
    el.appendChild(span);
    el.style.visibility = 'hidden';
    layer!.appendChild(el);
    const px = g.px;
    const maxW = Math.min(g.zone.w - 4 * px, MAX_BUBBLE_ART[g.mode] * px);
    let wText = span.getBoundingClientRect().width;
    let two = false;
    if (wText + 6 * px > maxW && word.includes(' ')) {
      // too wide: break at the space nearest the middle (two lines, 24 art px tall)
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
    return { el, w: (16 + 8 * m) * px, h: (two ? 24 : 16) * px, tail: (TAIL_ART.h - 1) * px };
  }

  /** Pop a word: retire the oldest at the cap, place it in the first free slot (the word he's on beats the oldest). */
  function spawn(word: string, still: boolean): boolean {
    const g = geo();
    if (!g || !layer || !word) return false;
    const cap = mumbleCap(g);
    while (live.length >= cap) retire(live[0]);
    const b = build(word, g);
    const zones = g.wide ? [g.zone, g.wide] : [g.zone];
    const tryPlace = (avoidFading: boolean): Placement | null => {
      for (const zone of zones) {
        const p = placeMumble(b, g, live.map((i) => i.r), fading.map((i) => i.r), slotIx, { avoidFading, zone });
        if (p) return p;
      }
      return null;
    };
    let p = tryPlace(true) ?? tryPlace(false);
    while (!p && !still && live.length) {
      retire(live[0]);
      p = tryPlace(false);
    }
    if (!p) {
      b.el.remove();
      return false;
    }
    slotIx = p.slot + 1;
    // taking the place of a cloud that is still fading: pop once it is mostly gone
    const r = p.r;
    if (fading.some((o) => hit(r, o.r))) b.el.style.setProperty('--pop-delay', `${MUMBLE_TIMING.swapDelayMs}ms`);
    b.el.style.left = `${p.x}px`;
    b.el.style.top = `${p.y}px`;
    // a bubble on his right points its tail down-left at him, one on his left down-right
    b.el.classList.add(p.side === 'right' ? 'r' : 'l', still ? 'still' : 'live');
    b.el.style.visibility = '';
    const item: Item = { el: b.el, r, timer: 0 };
    if (!still) item.timer = setTimeout(() => retire(item), MUMBLE_TIMING.lifeMs);
    live.push(item);
    return true;
  }

  function retire(item: Item, instant = false): void {
    const i = live.indexOf(item);
    if (i < 0) return;
    live.splice(i, 1);
    if (item.timer) clearTimeout(item.timer);
    if (instant || reduce()) {
      item.el.remove();
      return;
    }
    item.el.classList.add('out');
    fading.push(item);
    setTimeout(() => {
      item.el.remove();
      const j = fading.indexOf(item);
      if (j >= 0) fading.splice(j, 1);
    }, MUMBLE_TIMING.fadeMs);
  }

  /** A page of the stream starts typing. */
  function start(words: readonly MumbleWord[]): void {
    frozen = false;
    pending = [...words].sort((a, b) => a.at - b.at);
    if (reduce()) {
      // no pop, drift or fade: the page's first words (up to the cap) stand still beside him while the page is up, and
      // the next page swaps them at once (the text box changes at that moment anyway)
      for (const item of [...live]) retire(item, true);
      const g = geo();
      for (const w of pending.slice(0, g ? mumbleCap(g) : 2)) spawn(w.word, true);
      pending = [];
      frozen = true;
      return;
    }
    // bubbles held over from the last page drift on and leave in their own time
    for (const item of live) {
      item.el.classList.remove('held');
      if (item.timer) clearTimeout(item.timer);
      item.timer = setTimeout(() => retire(item), MUMBLE_TIMING.lifeMs / 2);
    }
  }

  /**
   * `n` characters of the page are showing: pop the words they passed. A tap that shows the rest at once pops only the
   * last few (the cap would retire the others before anyone saw them).
   */
  function progress(n: number): void {
    if (frozen) return;
    const due: MumbleWord[] = [];
    while (pending.length && pending[0].at <= n) due.push(pending.shift()!);
    if (!due.length) return;
    const g = geo();
    for (const w of due.slice(-(g ? mumbleCap(g) : 2))) spawn(w.word, false);
  }

  /** The page has typed: what is up holds still (its drift pauses) until the next page or the snap. */
  function complete(): void {
    progress(Infinity);
    frozen = true;
    for (const item of live) {
      if (item.timer) clearTimeout(item.timer);
      item.timer = 0;
      item.el.classList.add('held');
    }
  }

  /** He snaps out of it: every bubble pops at once. */
  function snapAll(): void {
    frozen = true;
    pending = [];
    for (const item of live.splice(0)) {
      if (item.timer) clearTimeout(item.timer);
      if (reduce()) {
        item.el.remove();
        continue;
      }
      item.el.classList.add('snap');
      setTimeout(() => item.el.remove(), MUMBLE_TIMING.snapMs);
    }
  }

  function clear(): void {
    for (const item of [...live, ...fading]) {
      if (item.timer) clearTimeout(item.timer);
      item.el.remove();
    }
    live.length = 0;
    fading.length = 0;
    pending = [];
    frozen = true;
  }

  // the stream's pages, and the typewriter on each
  $effect(() => {
    const on = mumbleStage.stream;
    const page = mumbleStage.page;
    const shown = dialogue.shown;
    const typing = dialogue.typing;
    untrack(() => {
      if (!on) {
        if (seenPage !== -1 || live.length) snapAll();
        seenPage = -1;
        return;
      }
      if (!page) return;
      if (page.id !== seenPage) {
        seenPage = page.id;
        start(page.words);
      }
      if (typing) progress(shown);
      else complete();
    });
  });

  // the art is tiny: have it in the cache before his first mumble
  $effect(() => {
    for (const f of Object.values(ART)) void loadImage(f);
  });

  // a rotate or a resized window moves him and the window: the bubbles up go (the next words find new places)
  $effect(() => {
    const el = layer;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let w = el.clientWidth;
    let h = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w && el.clientHeight === h) return;
      w = el.clientWidth;
      h = el.clientHeight;
      for (const item of [...live]) retire(item, true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
  $effect(() => {
    void [mode, pos];
    untrack(() => {
      for (const item of [...live]) retire(item, true);
    });
  });

  $effect(() => () => clear());
</script>

<div
  class="mumbles"
  bind:this={layer}
  aria-hidden="true"
  style:--mb-slice={`url(${assetUrl(ART.slice)})`}
  style:--mb-tail-dl={`url(${assetUrl(ART.dl)})`}
  style:--mb-tail-dr={`url(${assetUrl(ART.dr)})`}
></div>

<style>
  /* above the canvas, under the CRT scanlines (z 3) */
  .mumbles { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
  .mumbles :global(.mb) {
    position: absolute;
    left: 0;
    top: 0;
    box-sizing: border-box;
    /* width 16 + 8m art px: the 8-px puff tile repeats exactly m times; one text line = 16 art px tall */
    width: calc((16 + 8 * var(--m, 1)) * var(--px));
    height: calc(16 * var(--px));
    /* the text area: 4 art px in from the top and bottom, 3 from the sides; the art itself is drawn 8 px deep */
    border: solid transparent;
    border-width: calc(4 * var(--px)) calc(3 * var(--px));
    border-image: var(--mb-slice) 8 fill / calc(8 * var(--px)) / 0 round stretch;
    image-rendering: pixelated;
    color: var(--ink-2);
    font-family: var(--font-body);
    /* 12px on phones, 16px elsewhere */
    font-size: calc(4px + 4 * var(--px));
    line-height: calc(8 * var(--px));
    letter-spacing: 0;
    text-align: center;
    white-space: pre;
    text-shadow: none;
    -webkit-font-smoothing: none;
    filter: drop-shadow(0 var(--px) 0 rgba(27, 18, 41, 0.35));
  }
  /* DotGothic16 is drawn on a 16-dot grid: at 1 dppx its 12px dots break apart, so those screens get its native 16px */
  @media (max-resolution: 1.99dppx) {
    .mumbles :global(.mb) { font-size: 16px; }
  }
  .mumbles :global(.mb.two) { height: calc(24 * var(--px)); }
  .mumbles :global(.mb-t) { display: inline-block; }
  /* tail: 5×4 art px, 4 in from the tail side, its top row on the cloud's last row (offsets from the padding box) */
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
  /* motion: pop from the tail's root, drift up one art px per step, fade. held = the page has typed (the drift
     pauses), out = retired, snap = he snaps out of it, still = Reduce motion */
  .mumbles :global(.mb.r) { transform-origin: calc(6.5 * var(--px)) 100%; }
  .mumbles :global(.mb.l) { transform-origin: calc(100% - 6.5 * var(--px)) 100%; }
  .mumbles :global(.mb.live) {
    animation: vnmb-pop 150ms steps(3, jump-start) var(--pop-delay, 0ms) both, vnmb-drift 3200ms steps(4, jump-end) var(--pop-delay, 0ms) both;
  }
  .mumbles :global(.mb.live.held) { animation-play-state: running, paused; }
  .mumbles :global(.mb.live.out) {
    animation: vnmb-pop 150ms steps(3, jump-start) var(--pop-delay, 0ms) both, vnmb-drift 3200ms steps(4, jump-end) var(--pop-delay, 0ms) both,
      vnmb-out 300ms steps(3, jump-end) both;
  }
  .mumbles :global(.mb.live.snap) {
    animation: vnmb-pop 150ms steps(3, jump-start) var(--pop-delay, 0ms) both, vnmb-drift 3200ms steps(4, jump-end) var(--pop-delay, 0ms) both,
      vnmb-snap 140ms steps(2, jump-end) both;
    animation-play-state: paused, paused, running;
  }
  .mumbles :global(.mb.still) { animation: none; }
  /* safety net: the Stage marks itself .reduce when Reduce motion is on */
  :global(.stage-root.reduce) .mumbles :global(.mb) { animation: none; }
  @keyframes -global-vnmb-pop { from { scale: 0.4; opacity: 0; } to { scale: 1; opacity: 1; } }
  @keyframes -global-vnmb-drift { from { translate: 0 0; } to { translate: 0 calc(-4 * var(--px)); } }
  @keyframes -global-vnmb-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes -global-vnmb-snap { from { scale: 1; opacity: 1; } to { scale: 1.25; opacity: 0; } }
</style>
