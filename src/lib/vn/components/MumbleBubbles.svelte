<script lang="ts">
  // Piggy 3's Deku-style mumble bubbles. While his quiet, fast mumble stream types out in the dialogue box (chat.ts
  // plays it, mumbleStage says which page is up; the prologue's rant passes its own pages), each fragment's buzzword
  // pops out of him in a small lilac pixel cloud as the typewriter reaches it, and stays. They pile up in a loose
  // cluster hugging his head (mumble-layout.ts places them: overlapping a little, never over his face, the phone, his
  // fist, the dialogue window or the chrome in `avoid`). Past the cap the oldest fades; a new page lets the last page's
  // clouds go one by one; when he snaps out of it they all pop. Reduce motion: no pop, bob or fade.
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
    MAX_BUBBLE_ART, MUMBLE_TIMING, TAIL_ART, mumbleCap, mumbleKeepOut, mumbleNeighbours, placeMumble,
    type MumbleGeo, type MumbleMode, type Rect,
  } from './mumble-layout';

  interface Props {
    /** viewport.mode: how many are up at once. */
    mode: MumbleMode;
    /** His portrait slot (Talk: 'left' on wide layouts, 'center' on an upright phone). */
    pos: PortraitPos;
    /** His outfit (the hoodie's phone pose sits a little higher). */
    outfit: OutfitId;
    /** Chrome over the stage to keep clear of besides the dialogue window (a selector; what overlaps the stage counts). */
    avoid?: string;
    /** Scene dialogue can supply its own page; free chat uses mumbleStage. */
    stream?: boolean;
    page?: { id: number | string; words: readonly MumbleWord[] } | null;
    /** All portrait slots in a group scene: his keep-outs scale with the lineup, the others' faces are kept clear if possible. */
    lineup?: readonly PortraitPos[];
  }

  let { mode, pos, outfit, avoid = '', stream = mumbleStage.stream, page = mumbleStage.page, lineup = [pos] }: Props = $props();

  const ART = { slice: 'mumble/mumble-lilac.png', dl: 'mumble/mumble-tail-lilac-dl.png', dr: 'mumble/mumble-tail-lilac-dr.png' };
  // CSS variables are consumed by the built stylesheet under assets/, so resolve art against the page first.
  const cssArt = (path: string) => `url("${new URL(assetUrl(path), document.baseURI).href}")`;
  /** The dialogue window's parts over the stage: the highest one's top is the bubbles' floor. */
  const WINDOW = '.vn .head, .vn .box';

  interface Item {
    el: HTMLDivElement;
    r: Rect;
    /** Pops after this (a cascade); a snap before then just removes it. */
    startsAt: number;
  }

  let layer = $state<HTMLDivElement>();
  let artReady = $state(false);
  const live: Item[] = [];
  const fading: Item[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  /** This page's words not popped yet, by `at`. */
  let pending: MumbleWord[] = [];
  let seenPage: number | string = -1;
  let layoutRevision = $state(0);
  let seenGeometry = '';
  /** Stacking order: the newest cloud is on top. */
  let z = 0;
  /** When the last cascade pop is due, so words arriving together pop one after another. */
  let nextPopAt = 0;

  const reduceQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduce = () => game.save.settings.reduceMotion || !!reduceQuery?.matches;

  function later(ms: number, fn: () => void): void {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  }

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
    return {
      mode, px, keep: mumbleKeepOut(outfit, pos, lw, u, lineup), zone,
      wide: wide.w > zone.w + 2 ? wide : undefined, obstacles, soft: mumbleNeighbours(pos, lineup, lw, u),
    };
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

  /** Pop a word into his cluster, `delay` ms from now: retire the oldest at the cap, or when nothing else fits. */
  function spawn(word: string, still: boolean, delay = 0): void {
    const g = geo();
    if (!g || !layer || !word) return;
    const cap = mumbleCap(g);
    while (live.length >= cap) retire(live[0]);
    const b = build(word, g);
    const place = () => placeMumble(b, g, live.map((i) => i.r), fading.map((i) => i.r));
    let p = place();
    while (!p && live.length) {
      retire(live[0]);
      p = place();
    }
    if (!p) {
      b.el.remove();
      return;
    }
    b.el.style.left = `${p.x}px`;
    b.el.style.top = `${p.y}px`;
    b.el.style.zIndex = String(++z);
    b.el.style.setProperty('--pop-delay', `${delay}ms`);
    // each cloud bobs on its own beat
    b.el.style.setProperty('--bob-delay', `${-((z * 617) % MUMBLE_TIMING.bobMs)}ms`);
    // a cloud right of his head points its tail down-left at him, one on his left down-right
    b.el.classList.add(p.side === 'right' ? 'r' : 'l', still ? 'still' : 'live');
    b.el.style.visibility = '';
    live.push({ el: b.el, r: p.r, startsAt: performance.now() + delay });
  }

  /** Fade a cloud out from wherever its entrance is, `delay` ms from now. */
  function retire(item: Item, instant = false, delay = 0): void {
    const i = live.indexOf(item);
    if (i < 0) return;
    live.splice(i, 1);
    if (instant || reduce() || item.startsAt > performance.now() + delay) {
      item.el.remove();
      return;
    }
    fading.push(item);
    const go = () => {
      fade(item.el, MUMBLE_TIMING.fadeMs);
      later(MUMBLE_TIMING.fadeMs, () => {
        item.el.remove();
        const j = fading.indexOf(item);
        if (j >= 0) fading.splice(j, 1);
      });
    };
    if (delay > 0) later(delay, go);
    else go();
  }

  /** Freeze the entrance at its current frame, then fade the whole cloud together from there (no flash back to full). */
  function fade(el: HTMLDivElement, duration: number, snap = false): void {
    const { opacity, scale } = getComputedStyle(el);
    el.style.setProperty('--fade-from', opacity);
    el.style.setProperty('--scale-from', scale);
    el.style.setProperty('--fade-ms', `${duration}ms`);
    el.classList.remove('live');
    el.classList.add(snap ? 'snap' : 'out');
  }

  /** A page of the stream starts typing: the last page's clouds go one by one, oldest first, as this one's arrive. */
  function start(words: readonly MumbleWord[]): void {
    pending = [...words].sort((a, b) => a.at - b.at);
    nextPopAt = 0;
    if (reduce()) {
      // no pop or fade: the page's first words (up to the cap) stand still beside him while the page is up
      for (const item of [...live]) retire(item, true);
      const g = geo();
      for (const w of pending.slice(0, g ? mumbleCap(g) : 3)) spawn(w.word, true);
      pending = [];
      return;
    }
    live.slice().forEach((item, i) => retire(item, false, i * MUMBLE_TIMING.pageStaggerMs));
  }

  /** `n` characters of the page are showing: pop the words they passed, one after another if several came at once. */
  function progress(n: number): void {
    const due: MumbleWord[] = [];
    while (pending.length && pending[0].at <= n) due.push(pending.shift()!);
    if (!due.length) return;
    const g = geo();
    const now = performance.now();
    for (const w of due.slice(-(g ? mumbleCap(g) : 3))) {
      const at = Math.max(now, nextPopAt);
      nextPopAt = at + MUMBLE_TIMING.cascadeMs;
      spawn(w.word, false, at - now);
    }
  }

  /** He snaps out of it: every bubble pops at once. */
  function snapAll(): void {
    pending = [];
    for (const item of live.splice(0)) {
      if (reduce() || item.startsAt > performance.now()) {
        item.el.remove();
        continue;
      }
      fade(item.el, MUMBLE_TIMING.snapMs, true);
      later(MUMBLE_TIMING.snapMs, () => item.el.remove());
    }
  }

  function clear(): void {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    for (const item of [...live, ...fading]) item.el.remove();
    live.length = 0;
    fading.length = 0;
    pending = [];
  }

  // the stream's pages, and the typewriter on each
  $effect(() => {
    const on = stream;
    const current = page;
    const shown = dialogue.shown;
    const typing = dialogue.typing;
    const geometry = `${mode}:${pos}:${outfit}:${lineup.join(',')}:${layoutRevision}`;
    if (!layer || !artReady) return;
    untrack(() => {
      if (!on) {
        if (seenPage !== -1 || live.length) snapAll();
        seenPage = -1;
        return;
      }
      if (!current || !geo()) return;
      if (geometry !== seenGeometry) {
        // a rotate or resize: this page's clouds again, placed for the new stage
        clear();
        seenPage = -1;
        seenGeometry = geometry;
      }
      if (current.id !== seenPage) {
        seenPage = current.id;
        start(current.words);
      }
      progress(typing ? shown : Infinity);
    });
  });

  // Wait for the slice AND both tails to decode before creating any visible text. If loading finishes
  // mid-page, the stream effect catches up to the current typewriter position instead of replaying old pages.
  $effect(() => {
    let active = true;
    void Promise.all(Object.values(ART).map(loadImage)).then((images) => {
      if (active) artReady = images.every((image) => image !== null);
    });
    return () => { active = false; };
  });

  // A rotate or resize moves the lineup: re-place this page's words, including a fully typed page waiting for a tap.
  $effect(() => {
    const el = layer;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let w = el.clientWidth;
    let h = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w && el.clientHeight === h) return;
      w = el.clientWidth;
      h = el.clientHeight;
      layoutRevision++;
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  $effect(() => () => clear());
</script>

<div
  class="mumbles"
  bind:this={layer}
  aria-hidden="true"
  style:--mb-enter-ms={`${MUMBLE_TIMING.popMs}ms`}
  style:--mb-bob-ms={`${MUMBLE_TIMING.bobMs}ms`}
  style:--mb-slice={cssArt(ART.slice)}
  style:--mb-tail-dl={cssArt(ART.dl)}
  style:--mb-tail-dr={cssArt(ART.dr)}
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
  /* motion: pop to full from the tail's root, then bob an art px on its own beat; retiring freezes the entrance where
     it is and fades from there. still = Reduce motion */
  .mumbles :global(.mb.r) { transform-origin: calc(6.5 * var(--px)) 100%; }
  .mumbles :global(.mb.l) { transform-origin: calc(100% - 6.5 * var(--px)) 100%; }
  .mumbles :global(.mb.live) {
    animation: vnmb-pop var(--mb-enter-ms) cubic-bezier(0.34, 1.4, 0.64, 1) var(--pop-delay, 0ms) both,
      vnmb-bob var(--mb-bob-ms) steps(1, end) var(--bob-delay, 0ms) infinite;
  }
  .mumbles :global(.mb.out) { animation: vnmb-out var(--fade-ms) ease-in both; }
  .mumbles :global(.mb.snap) { animation: vnmb-snap var(--fade-ms) ease-out both; }
  .mumbles :global(.mb.still) { animation: none; transition: none; }
  /* safety net: the Stage marks itself .reduce when Reduce motion is on */
  :global(.stage-root.reduce) .mumbles :global(.mb) { animation: none; transition: none; }
  @keyframes -global-vnmb-pop { from { scale: 0.7; opacity: 0; } 60% { opacity: 1; } to { scale: 1; opacity: 1; } }
  @keyframes -global-vnmb-bob { 0% { translate: 0 0; } 50% { translate: 0 calc(-1 * var(--px)); } }
  @keyframes -global-vnmb-out { from { opacity: var(--fade-from); scale: var(--scale-from); } to { opacity: 0; scale: 0.92; } }
  @keyframes -global-vnmb-snap { from { scale: var(--scale-from); opacity: var(--fade-from); } to { scale: 1.25; opacity: 0; } }
</style>
