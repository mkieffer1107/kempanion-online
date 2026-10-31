<script lang="ts">
  // For You Pig (id 'xfeed') — Piggy 3's X feed at Marston, late at night. He holds his phone out ("Hey, did you see
  // this on X today?") and the feed scrolls up by itself, a little faster each tab: Following → For You → Trending →
  // 3 AM. LIKE posts that show their work, MUTE hype and anyone who still says "Twitter", SAVE the gold posts, leave
  // filler alone. Six right calls in a row and he slips into Mumble Mode (points ×2): tiny buzzword clouds float out of
  // him while he mutters to himself, then he snaps out of it, a little embarrassed. Hype that gets through drains his
  // brain battery; at 0% he puts the phone down and touches grass. 75 s, no fail state, every run pays.
  // Touch: swipe a card right / left, double-tap to like, flick up for the next post. Mouse: drag, click, wheel.
  // Keys: → / L like, ← / U / M mute, ↑ / B save, ↓ / J / Space next, K previous post (X's own shortcuts).
  // Rules live in engine.ts, his lines and poses in host.ts, the pixel art in render.ts, the mumble clouds in Mumbles.
  import { flushSync, untrack } from 'svelte';
  import type { MinigameProps } from '../types';
  import MinigameShell from '../common/MinigameShell.svelte';
  import type { Phase } from '../common/types';
  import { META } from '../meta';
  import { prefersReducedMotion, rng } from '../common/pixel';
  import { Sprite, assetUrl, faceUrl, loadBackground, loadImage } from '../common/sprites';
  import { iconUrl } from '../../content/icons';
  import { audio } from '../../audio';
  import type { SfxId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { medalFor } from '../../pet';
  import { DURATION, FeedEngine, REVEAL, comboMult, type Call, type FeedFx, type FeedPost } from './engine';
  import { AUTHORS, MUMBLE_CHAINS, type Author, type ChainKey } from './posts';
  import { cardTops, pxPerUnit, readLineY, smoothLayout } from './layout';
  import {
    LinePicker, ambientMumble, basePose, callNote, clockAt, countsFor, lineFor, liveText, pickChain, plainText, segments,
    shortCount, statsLine, topLikedTopic, type Counts, type Pose, type Said, type Seg,
  } from './host';
  import { BUST_H, MEDIA_ALT, acornUrl, avatarUrl, drawGrass, earUrl, footIconUrl, glassesUrl, introClip, mediaUrl, portraitCell } from './render';
  import Mumbles from './Mumbles.svelte';

  let { pig, onExit }: MinigameProps = $props();
  const meta = META.xfeed;
  const SONG = 'piggy3_theme';
  const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
  const TABS = ['Following', 'For You', 'Trending'];

  interface CardView {
    n: number;
    key: string;
    cls: string;
    state: string;
    skeleton: boolean;
    muted: boolean;
    name: string;
    handle: string;
    acorn: boolean;
    friend: string;
    avatar: string;
    segs: Seg[];
    media: { url: string; alt: string } | null;
    tells: boolean;
    cursor: boolean;
    gem: boolean;
    stamp: { text: string; tone: string } | null;
    counts: Counts;
    heartOn: boolean;
    saveOn: boolean;
    pts: number;
  }

  let phase = $state<Phase>('howto');
  let assist = $state(false);
  let shell = $state<ReturnType<typeof MinigameShell>>();
  let mumbles = $state<ReturnType<typeof Mumbles>>();
  let rootEl = $state<HTMLDivElement>();
  let feedEl = $state<HTMLDivElement>();
  let bustCv = $state<HTMLCanvasElement>();
  let introCv = $state<HTMLCanvasElement>();
  let resultCv = $state<HTMLCanvasElement>();
  let grassCv = $state<HTMLCanvasElement>();
  let lineEl = $state<HTMLDivElement>();
  let histEl = $state<HTMLDivElement>();

  let view = $state({
    score: 0, combo: 0, time: DURATION as number | null, battery: 80, clock: clockAt(0), tab: 0, late: false, loading: false,
    grass: false, mumble: false,
  });
  let cards = $state.raw<CardView[]>([]);
  let sayText = $state<string | null>(null);
  let mline = $state('');
  let mumbled = $state<string[]>([]);
  let bustLabel = $state('Piggy 3 holds out his phone. Brain battery 80%.');
  let mode = $state<'t' | 'l' | 'd'>('t');
  let zoomIn = $state(false);
  let bgCss = $state('none');

  const rm = $derived(prefersReducedMotion(game.save.settings.reduceMotion));
  const live = $derived(phase === 'play' || phase === 'paused');
  const cap = $derived(mode === 'd' ? 5 : mode === 'l' ? 4 : 3);
  const comboText = $derived(((m: number) => (m % 1 === 0 ? m.toFixed(1) : String(m)))(comboMult(view.combo)));
  const segsOn = $derived(Math.ceil(view.battery / 20));

  // First run ever (the counter is bumped when the rewards are applied): his meet-scene line, and the owner's own five
  // buzzwords for the first mumble.
  const firstRun = (game.save.counters['mg.xfeed.runs'] ?? 0) === 0;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const sprite = new Sprite('piggy-3', 'everyday');

  // ── run state (plain, read by the loop) ──
  let engine: FeedEngine | null = null;
  const picker = new LinePicker(rng((Math.floor(now()) ^ 0x3e11) >>> 0));
  let rand = rng((Math.floor(now()) ^ 0x51ed) >>> 0);
  let base = 0;
  let pausedAt = 0;
  let lastFrame = 0;
  /** Seconds of un-paused time (lines, poses and mumbles run on it). */
  let clock = 0;
  let finishing = false;
  let finishTimer: ReturnType<typeof setTimeout> | null = null;
  let resultGold = false;
  let introStart = 0;
  // lines
  let sayUntil = 0;
  let sayAt = -99;
  let sayPrio = -1;
  let gemSaves = 0;
  let idleSaid = 0;
  let idleAt = -99;
  let lastInput = 0;
  let lastInputKind: 'touch' | 'mouse' | 'keys' = coarse ? 'touch' : 'mouse';
  let slipAt = 99;
  let addictedAt = 99;
  let slipSaid = false;
  let addictedSaid = false;
  let lastWhoosh = 0;
  let pendingSay: { s: Said; until: number } | null = null;
  let oldNameLater: { n: number; until: number } | null = null;
  // poses
  let poseFlash: { pose: Pose; until: number } | null = null;
  let drawnPose = '';
  let atlas: HTMLImageElement | null = null;
  // mumble
  let mumbleOn = false;
  let chain: readonly string[] = [];
  let chainI = 0;
  let nextBubbleAt = 0;
  let mlineTarget = '';
  let mlineShown = 0;
  let nextAmbientAt = 99;
  let lastAmbient = '';
  const usedChains = new Set<ChainKey>();
  // feed view
  const els = new Map<number, HTMLElement>();
  const hMeasured = new Map<number, number>();
  const hShown = new Map<number, number>();
  const measuredKey = new Map<number, string>();
  const cardKey = new Map<number, string>();
  const liveTexts = new Map<number, string>();
  let sShown = 0;
  let ppu = 96;
  let lineY = 100;
  let feedW = 0;
  let feedH = 0;
  let loadingSince = -1;
  let loadingUntil = 0;
  let selected: number | null = null;
  let swipe: { n: number; dx: number } | null = null;
  let lastCursor = -1;
  // announcements: at most one every 1.2 s, the most important one wins
  let annAt = -1e9;
  let annPending: { text: string; prio: number } | null = null;

  function sfx(id: SfxId): void {
    if (id === 'whoosh') {
      const t = performance.now();
      if (t - lastWhoosh < 250) return;
      lastWhoosh = t;
    }
    try {
      audio.sfx(id);
    } catch {
      // audio is optional
    }
  }

  function announce(text: string, prio = 0): void {
    if (!annPending || prio >= annPending.prio) annPending = { text, prio };
  }

  function flushAnnounce(wall: number): void {
    if (annPending && wall - annAt >= 1200) {
      shell?.announce(annPending.text);
      annAt = wall;
      annPending = null;
    }
  }

  // ── Piggy 3: one bubble at a time, by priority, a 2.2 s cooldown; while he mumbles only big beats speak ──

  function speak(s: Said | null, force = false): boolean {
    if (!s?.text) return false;
    if (!force) {
      // while he mumbles only the big beats speak (and the gem line: saving a gem is what started this mumble)
      if (mumbleOn && !(s.key.startsWith('phase') || s.key === 'grass' || s.key === 'gem' || s.key === 'gemFirst')) return false;
      if ((clock < sayUntil && s.prio < sayPrio) || (sayText && clock < sayAt + 2.2 && s.prio <= sayPrio)) {
        // a reaction that lost to a bigger line waits its turn (briefly): "It's called X." must not get lost
        if (s.prio >= 2 && (!pendingSay || s.prio >= pendingSay.s.prio)) pendingSay = { s, until: clock + 3 };
        return false;
      }
      if (s.prio === 0 && rand() > 0.35) return false;
    }
    sayAt = clock;
    sayPrio = s.prio;
    sayUntil = clock + Math.min(3.6, 1.7 + s.text.length * 0.035);
    sayText = s.text;
    announce(s.text, Math.max(1, s.prio));
    mumbles?.retireAll();
    return true;
  }

  function flashPose(p: Pose, ms = 1300): void {
    poseFlash = { pose: p, until: clock + ms / 1000 };
  }

  function currentPose(): Pose {
    if (poseFlash && clock < poseFlash.until) return poseFlash.pose;
    const e = engine;
    return basePose({ mumbling: mumbleOn, grass: !!e?.grass, battery: e ? 100 - e.rot : 80 });
  }

  function onSay(s: Said | null): void {
    if (!s) return;
    if (s.pose && !mumbleOn) flashPose(s.pose, s.poseMs);
    speak(s);
  }

  // ── Mumble Mode ──

  function startMumble(postN?: number): void {
    const e = engine;
    if (!e) return;
    const p = postN !== undefined ? e.posts[postN] : null;
    const key = pickChain(p?.topic, usedChains, firstRun && usedChains.size === 0);
    usedChains.add(key);
    chain = MUMBLE_CHAINS[key];
    chainI = 0;
    nextBubbleAt = clock;
    mumbleOn = true;
    sayText = null;
    sayUntil = 0;
    sayPrio = -1;
    pendingSay = null;
    mlineTarget = '';
    mlineShown = 0;
    mline = '';
    mumbles?.clear();
    sfx('typing');
    announce('Mumble Mode! Points times two.', 2);
  }

  function stopMumble(by: string | undefined): void {
    if (!mumbleOn) return;
    mumbleOn = false;
    mumbles?.snap();
    mline = '';
    mlineTarget = '';
    if (by !== 'end') {
      sfx('surprise');
      flashPose('flustered_blush', 1600);
    }
    announce('Mumble Mode over.', 2);
  }

  function tickMumble(dt: number): void {
    // the clouds wait while he says something normal-size (a phase change, the gem he just saved)
    if (mumbleOn && clock >= nextBubbleAt && chain.length && !sayText) {
      // the chain restarts when it runs out ("stops mid-thought and restarts")
      const word = chain[chainI % chain.length];
      chainI += 1;
      nextBubbleAt = clock + (rm ? 0.7 : 0.45);
      mumbles?.push(word);
      mlineTarget += (mlineTarget ? ' ' : '') + word;
      mumbled = [...mumbled, word].slice(-3);
    }
    if (mumbleOn && mlineShown < mlineTarget.length) {
      const before = Math.floor(mlineShown);
      mlineShown = Math.min(mlineTarget.length, mlineShown + 40 * dt);
      const after = Math.floor(mlineShown);
      for (let i = before; i < after; i++) {
        const ch = mlineTarget[i];
        if (ch && ch !== ' ') {
          try {
            audio.blip('piggy-3', { whisper: true, char: ch, index: i });
          } catch {
            // audio is optional
          }
        }
      }
      const text = mlineTarget.slice(Math.max(0, after - 90), after);
      if (text !== mline) mline = text;
    }
  }

  /** Ambient mumbles, idle hints and his two once-a-run asides ("Twi— on X", "I'm not addicted"). */
  function tickExtras(): void {
    const e = engine;
    if (!e || phase !== 'play' || e.ended || mumbleOn || e.grass) return;
    const t = e.t;
    const quiet = !sayText;
    if (quiet && clock >= nextAmbientAt) {
      const c = cursorN();
      const word = ambientMumble(c >= 0 ? e.posts[c] : null, rand, lastAmbient);
      if (mumbles?.push(word, true)) lastAmbient = word;
      nextAmbientAt = clock + 6 + rand() * 3;
    }
    if (!slipSaid && e.phaseIdx === 1 && t >= slipAt && speak({ key: 'slip', text: picker.pick('slip'), prio: 1 })) slipSaid = true;
    if (!addictedSaid && e.phaseIdx === 2 && t >= addictedAt && speak({ key: 'addicted', text: picker.pick('addicted'), prio: 1 })) addictedSaid = true;
    if (idleSaid < 2 && clock - lastInput > 4 && clock - idleAt > 12 && e.cursor() >= 0) {
      const key = lastInputKind === 'keys' || (!coarse && lastInputKind === 'mouse') ? 'idleKeys' : 'idleTouch';
      if (speak({ key, text: picker.pick(key), prio: 1 })) {
        idleSaid += 1;
        idleAt = clock;
      }
    }
  }

  // ── the engine's effects ──

  function handleFx(f: FeedFx): void {
    const e = engine;
    if (!e) return;
    switch (f.kind) {
      case 'say': {
        const post = f.post !== undefined ? e.posts[f.post] : null;
        if (post?.state === 'missed') announce(callNote(post, e.combo), 1);
        if (f.key === 'gem') gemSaves += 1;
        onSay(lineFor(f, post, picker, f.key === 'gem' && gemSaves === 1));
        if (f.key === 'rot') announce(`Brain battery ${f.n === 75 ? 25 : 50} percent.`, 2);
        break;
      }
      case 'sfx':
        sfx(f.sfx);
        break;
      case 'pop': {
        const el = els.get(f.post);
        if (el && !rm && typeof el.animate === 'function') el.animate([{ filter: 'brightness(1.7)' }, { filter: 'none' }], { duration: 240, easing: 'steps(3)' });
        break;
      }
      case 'mumble':
        if (f.on) startMumble(f.post);
        else stopMumble(f.by);
        break;
      case 'phase':
        if (f.idx === 3) flashPose('sleepy', 1300);
        announce(`${['Following', 'For You', 'Trending', '3 AM'][f.idx]} tab. Faster now.`, 2);
        break;
      case 'grass':
        if (f.on) {
          announce('Brain battery empty. He put the phone down to touch grass for three seconds.', 2);
        } else announce('Back on the feed.', 2);
        break;
      case 'seen': {
        const p = e.posts[f.post];
        if (firstRun && p?.n === 0 && p.cls === 'friend') onSay({ key: 'friendHint', text: 'That pig face is Piggy 1. Friends always get a LIKE: +150.', prio: 2 });
        if (!p?.oldName) break;
        // mid-mumble he can't answer yet: the correction waits until he snaps out of it
        if (mumbleOn) oldNameLater = { n: p.n, until: clock + 9 };
        else oldNameReaction(p);
        break;
      }
    }
  }

  /** A post still says "Twitter": the pout and "It's called X." (or "Thank you." if you already muted it). */
  function oldNameReaction(p: FeedPost): void {
    if (p.state === 'live') {
      sfx('shake');
      onSay(lineFor({ kind: 'say', key: 'oldName', prio: 2 }, p, picker));
    } else if (p.state === 'muted') onSay(lineFor({ kind: 'say', key: 'oldNameMuted', prio: 2 }, p, picker));
  }

  // ── input ──

  function cursorN(): number {
    const e = engine;
    if (!e) return -1;
    if (selected !== null) {
      const p = e.posts[selected];
      if (p && p.state === 'live' && e.readable(p)) return selected;
      selected = null;
    }
    return e.cursor();
  }

  function act(c: Call): void {
    const e = engine;
    if (!e || phase !== 'play' || e.ended) return;
    lastInput = clock;
    const n = cursorN();
    if (n < 0) return;
    const r = e.call(n, c);
    selected = null;
    if (!r) return;
    const p = e.posts[n];
    announce(callNote(p, e.combo), 1);
    for (const f of e.takeFx()) handleFx(f);
  }

  let lastNextAt = 0;
  function next(): void {
    const e = engine;
    if (!e || phase !== 'play' || e.ended) return;
    lastInput = clock;
    lastNextAt = performance.now();
    e.next();
    for (const f of e.takeFx()) handleFx(f);
  }

  function selectPrev(): void {
    const e = engine;
    if (!e) return;
    const cur = cursorN();
    const list = e.posts.filter((p) => p.state === 'live' && e.readable(p));
    const i = list.findIndex((p) => p.n === cur);
    if (i > 0) selected = list[i - 1].n;
  }

  function onKeyDown(ev: KeyboardEvent): void {
    if (phase !== 'play' || !engine || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    let c: Call | 'next' | 'prev' | null = null;
    if (k === 'ArrowRight' || k === 'l' || k === 'L') c = 'like';
    else if (k === 'ArrowLeft' || k === 'u' || k === 'U' || k === 'm' || k === 'M') c = 'mute';
    else if (k === 'ArrowUp' || k === 'b' || k === 'B') c = 'save';
    else if (k === 'ArrowDown' || k === 'j' || k === 'J' || k === ' ') c = 'next';
    else if (k === 'k' || k === 'K') c = 'prev';
    if (!c) return;
    ev.preventDefault();
    // Space must never also "click" the last button pressed
    const target = ev.target as HTMLElement | null;
    if (target?.tagName === 'BUTTON') target.blur();
    lastInputKind = 'keys';
    if (c === 'next') {
      if (!ev.repeat || performance.now() - lastNextAt > 150) next();
      return;
    }
    if (ev.repeat) return;
    lastInput = clock;
    if (c === 'prev') selectPrev();
    else act(c);
  }

  interface Drag { id: number; x0: number; y0: number; x: number; y: number; axis: 'x' | 'y' | null; n: number; samples: [number, number][] }
  let drag: Drag | null = null;
  let lastTap = { n: -1, t: 0 };

  function cardAt(target: EventTarget | null): number {
    const el = (target as HTMLElement | null)?.closest?.('article[data-n]') as HTMLElement | null;
    return el ? Number(el.dataset.n) : -1;
  }

  function onDown(ev: PointerEvent): void {
    if (phase !== 'play' || !engine || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.preventDefault();
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, axis: null, n: cardAt(ev.target), samples: [[performance.now(), ev.clientY]] };
    try {
      feedEl?.setPointerCapture(ev.pointerId);
    } catch {
      // a pointer that is already gone
    }
    lastInput = clock;
    lastInputKind = ev.pointerType === 'mouse' ? 'mouse' : 'touch';
  }

  function onMove(ev: PointerEvent): void {
    const d = drag;
    const e = engine;
    if (!d || d.id !== ev.pointerId || !e) return;
    const dx = ev.clientX - d.x0;
    const dy = ev.clientY - d.y0;
    if (!d.axis && Math.hypot(dx, dy) > 10) d.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (d.axis === 'y' && phase === 'play') e.drag((d.y - ev.clientY) / ppu);
    if (d.axis === 'x' && !rm && d.n >= 0) swipe = { n: d.n, dx: Math.max(-60, Math.min(60, dx)) };
    d.x = ev.clientX;
    d.y = ev.clientY;
    d.samples.push([performance.now(), ev.clientY]);
    if (d.samples.length > 10) d.samples.shift();
  }

  function onUp(ev: PointerEvent): void {
    const d = drag;
    if (!d || d.id !== ev.pointerId) return;
    drag = null;
    swipe = null;
    const e = engine;
    if (!e || phase !== 'play') return;
    lastInput = clock;
    if (!d.axis) {
      tap(d.n);
      return;
    }
    if (d.axis === 'x') {
      const dx = ev.clientX - d.x0;
      const p = e.posts[d.n];
      if (Math.abs(dx) >= (assist ? 50 : 72) && p && p.state === 'live' && e.readable(p)) {
        selected = d.n;
        act(dx > 0 ? 'like' : 'mute');
      }
      return;
    }
    const t = performance.now();
    const s0 = d.samples.find(([ts]) => t - ts < 100) ?? d.samples[0];
    const v = ((s0[1] - ev.clientY) / Math.max(16, t - s0[0])) * 1000;
    if (v > 300) next();
  }

  function onCancel(ev: PointerEvent): void {
    if (drag && drag.id === ev.pointerId) {
      drag = null;
      swipe = null;
    }
  }

  function tap(n: number): void {
    const e = engine;
    const p = e?.posts[n];
    if (!e || !p || p.state !== 'live' || !e.readable(p)) return;
    const t = performance.now();
    selected = n;
    if (lastTap.n === n && t - lastTap.t < 300) {
      lastTap = { n: -1, t: 0 };
      act('like');
    } else lastTap = { n, t };
  }

  let wheelAcc = 0;
  let wheelFired = false;
  let wheelTimer: ReturnType<typeof setTimeout> | null = null;
  function onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    if (phase !== 'play') return;
    const d = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaMode === 2 ? ev.deltaY * 400 : ev.deltaY;
    if (d > 0) wheelAcc += d;
    if (!wheelFired && wheelAcc > 40) {
      wheelFired = true;
      lastInputKind = 'mouse';
      next();
    }
    if (wheelTimer) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelAcc = 0;
      wheelFired = false;
    }, 160);
  }

  // ── run lifecycle ──

  function onCountdown(): void {
    try {
      audio.playSong(SONG, { restart: true });
    } catch {
      // audio is optional
    }
    introStart = performance.now();
    poseFlash = null;
    const key = firstRun ? 'introFirst' : 'intro';
    speak({ key, text: picker.pick(key), prio: 3, pose: 'phone' }, true);
  }

  function startRun(): void {
    const seed = (Math.floor(now()) ^ 0x7f3e5) >>> 0;
    engine = new FeedEngine(seed, { assist });
    rand = rng(seed ^ 0x51ed);
    base = performance.now();
    finishing = false;
    resultGold = false;
    mumbleOn = false;
    usedChains.clear();
    mumbled = [];
    mumbles?.clear();
    for (const m of [hMeasured, hShown, measuredKey, cardKey, liveTexts]) m.clear();
    sShown = 0;
    selected = null;
    lastCursor = -1;
    loadingSince = -1;
    loadingUntil = 0;
    gemSaves = 0;
    idleSaid = 0;
    idleAt = clock;
    lastInput = clock;
    nextAmbientAt = clock + 6 + rand() * 3;
    slipAt = 17 + rand() * 5;
    addictedAt = 40 + rand() * 6;
    slipSaid = false;
    addictedSaid = false;
    pendingSay = null;
    oldNameLater = null;
    zoomIn = true;
    setTimeout(() => (zoomIn = false), rm ? 220 : 320);
  }

  function onPause(p: boolean): void {
    if (p) {
      pausedAt = performance.now();
      drag = null;
      swipe = null;
    } else base += performance.now() - pausedAt;
  }

  function endRun(e: FeedEngine): void {
    if (finishing) return;
    finishing = true;
    view.time = 0;
    resultGold = medalFor('xfeed', { score: e.score, stats: e.stats() }) === 'gold';
    finishTimer = setTimeout(() => shell?.finish({ score: e.score, stats: e.stats() }), rm ? 400 : 1200);
  }

  // ── the feed: cards (keyed each, rebuilt only when a card's look changes), then positions every frame ──

  function track(el: HTMLElement, n: number) {
    els.set(n, el);
    return {
      destroy() {
        if (els.get(n) === el) els.delete(n);
        hMeasured.delete(n);
        hShown.delete(n);
        measuredKey.delete(n);
        cardKey.delete(n);
      },
    };
  }

  function makeCard(e: FeedEngine, p: FeedPost, key: string, skeleton: boolean, tells: boolean, cursor: boolean): CardView {
    const a: Author = AUTHORS[p.by];
    let text = liveTexts.get(p.n);
    if (text === undefined && !skeleton) {
      text = p.live ? liveText(p, { s: e.t, clock: clockAt(e.t), topic: topLikedTopic(e.posts) }) : p.text;
      liveTexts.set(p.n, text);
    }
    const pts = p.pts;
    let stamp: CardView['stamp'] = null;
    if (p.state === 'liked') stamp = { text: `LIKED +${pts}`, tone: 'like' };
    else if (p.state === 'saved') stamp = { text: `SAVED +${pts}`, tone: 'gem' };
    else if (p.state === 'wrong') stamp = { text: pts < 0 ? `OOPS −${-pts}` : 'OOPS', tone: 'bad' };
    else if (p.state === 'missed') stamp = { text: 'SCROLLED PAST', tone: 'miss' };
    else if (p.cls === 'gem' && p.state === 'live') stamp = { text: 'GOLD POST', tone: 'gem' };
    return {
      n: p.n, key, cls: p.cls, state: p.state, skeleton, muted: p.state === 'muted', name: a.name, handle: a.handle,
      acorn: !!a.acorn, friend: a.pig ?? '', avatar: a.pig ? faceUrl(a.pig) : avatarUrl(a), segs: text ? segments(text) : [],
      media: p.media && !skeleton ? { url: mediaUrl(p.media), alt: MEDIA_ALT[p.media] } : null, tells, cursor,
      gem: p.cls === 'gem', stamp, counts: countsFor(p.id), heartOn: p.call === 'like', saveOn: p.call === 'save', pts,
    };
  }

  function syncCards(e: FeedEngine, vis: FeedPost[]): void {
    const cur = cursorN();
    const tellsAll = assist || mumbleOn;
    let changed = vis.length !== cards.length;
    const out: CardView[] = [];
    for (let i = 0; i < vis.length; i++) {
      const p = vis[i];
      const skeleton = !e.readable(p) && !p.consumed && p.state === 'live';
      const tells = tellsAll || p.tellShown;
      const key = `${p.state}|${skeleton ? 1 : 0}|${tells ? 1 : 0}|${p.n === cur ? 1 : 0}|${p.pts}`;
      const old = cards[i];
      if (old && old.n === p.n && old.key === key) {
        out.push(old);
        continue;
      }
      changed = true;
      cardKey.set(p.n, key);
      out.push(makeCard(e, p, key, skeleton, tells, p.n === cur));
    }
    if (changed) {
      cards = out;
      flushSync();
    }
    if (cur !== lastCursor) {
      lastCursor = cur;
      const p = cur >= 0 ? e.posts[cur] : null;
      if (p) announce(`${AUTHORS[p.by].name}: ${plainText(liveTexts.get(p.n) ?? p.text)}`, 0);
    }
  }

  /** Natural heights, measured when a card's look (or the feed width) changes. */
  function measure(vis: FeedPost[]): void {
    for (const p of vis) {
      const el = els.get(p.n);
      if (!el) continue;
      const mk = `${cardKey.get(p.n)}|${feedW}`;
      if (measuredKey.get(p.n) === mk) continue;
      const shown = el.style.height;
      el.style.height = '';
      const h = el.offsetHeight;
      el.style.height = shown;
      measuredKey.set(p.n, mk);
      hMeasured.set(p.n, h);
      if (!hShown.has(p.n)) hShown.set(p.n, h);
    }
  }

  /** Reduce motion: the feed steps one post at a time instead of gliding. */
  function stepS(e: FeedEngine): number {
    const c = e.posts.find((p) => !p.consumed);
    return c ? c.start : e.s;
  }

  function paint(e: FeedEngine, vis: FeedPost[], dt: number): void {
    if (!feedEl) return;
    for (const p of vis) {
      const m = hMeasured.get(p.n) ?? 100;
      const cur = hShown.get(p.n) ?? m;
      hShown.set(p.n, rm ? m : cur + (m - cur) * (1 - Math.exp(-dt * 18)));
    }
    const boxes = vis.map((p) => ({ start: p.start, w: p.w, h: hShown.get(p.n) ?? 100 }));
    const measuredPpu = pxPerUnit(vis.filter((p) => p.state !== 'muted' && (e.readable(p) || p.consumed)).map((p) => ({ start: p.start, w: p.w, h: hShown.get(p.n) ?? 100 })), ppu);
    ppu = smoothLayout(ppu, measuredPpu, dt);
    // Phone height belongs to the viewport. Card measurements only gently move the read line.
    lineY = smoothLayout(lineY, readLineY(feedH || feedEl.clientHeight, ppu), dt);
    if (lineEl) lineEl.style.transform = `translateY(${lineY}px)`;
    if (histEl) histEl.style.height = `${lineY}px`;
    sShown = rm ? stepS(e) : sShown + (e.s - sShown) * (1 - Math.exp(-dt * 30));
    const tops = cardTops(boxes, sShown, lineY);
    const cur = cursorN();
    vis.forEach((p, i) => {
      const el = els.get(p.n);
      if (!el) return;
      const dx = swipe && swipe.n === p.n ? swipe.dx : 0;
      el.style.transform = `translate3d(${dx}px, ${tops[i]}px, 0)`;
      el.style.height = `${Math.round(boxes[i].h)}px`;
      // Clip each placeholder to the bottom fifth without changing the stack's measured geometry.
      const skeleton = !e.readable(p) && !p.consumed && p.state === 'live';
      const clip = skeleton ? Math.max(0, feedH * 0.8 - tops[i]) : 0;
      el.style.clipPath = clip ? `inset(${clip}px 0 0)` : '';
      if (rm && p.n === cur) {
        // Reduce motion: a slim time-left bar on the cursor card replaces the motion cue
        const bar = el.querySelector<HTMLElement>('.tl');
        if (bar) bar.style.width = `${Math.max(0, Math.min(1, (e.center(p) - e.s) / REVEAL)) * 100}%`;
      }
    });
  }

  function syncView(e: FeedEngine): void {
    const time = Math.max(0, DURATION - e.t);
    if (!finishing && Math.ceil(time) !== Math.ceil(view.time ?? 0)) view.time = time;
    if (view.score !== e.score) view.score = e.score;
    if (view.combo !== e.combo) view.combo = e.combo;
    const battery = Math.round(100 - e.rot);
    if (view.battery !== battery) view.battery = battery;
    const ck = clockAt(e.t);
    if (view.clock !== ck) view.clock = ck;
    const tab = Math.min(2, e.phaseIdx);
    if (view.tab !== tab) view.tab = tab;
    if (view.late !== (e.phaseIdx === 3)) view.late = e.phaseIdx === 3;
    if (e.loading) {
      if (loadingSince < 0) loadingSince = clock;
      if (clock - loadingSince >= 0.3) loadingUntil = clock + 0.5;
    } else loadingSince = -1;
    const loading = clock < loadingUntil;
    if (view.loading !== loading) {
      view.loading = loading;
      if (loading) sfx('ui_move');
    }
    if (view.grass !== e.grass) view.grass = e.grass;
    if (view.mumble !== mumbleOn) view.mumble = mumbleOn;
    const label = `Piggy 3 ${e.grass ? 'put the phone down and is touching grass' : mumbleOn ? 'holds out his phone, mumbling' : 'holds out his phone'}. Brain battery ${battery}%.`;
    if (bustLabel !== label) bustLabel = label;
  }

  // ── drawing ──

  function drawBust(): void {
    if (!bustCv) return;
    const cell = portraitCell(currentPose());
    const k = `${cell?.pose}|${atlas ? 1 : 0}`;
    if (k === drawnPose) return;
    drawnPose = k;
    const ctx = bustCv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#241a44';
    ctx.fillRect(0, 0, 192, BUST_H);
    if (atlas && cell) ctx.drawImage(atlas, cell.x, cell.y, 192, BUST_H, 0, 0, 192, BUST_H);
  }

  function drawIntro(wall: number): void {
    const ctx = (phase === 'results' ? resultCv : introCv)?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 128, 128);
    const anim = introClip((a) => sprite.has(a), phase === 'results' && resultGold);
    const len = sprite.duration(anim) || 1000;
    sprite.draw(ctx, anim, (wall - introStart) % (len + 700), 64, 114);
  }

  function drawLawn(): void {
    const cv = grassCv;
    if (!cv) return;
    const w = Math.max(8, Math.round((feedW || 300) / 2));
    const h = Math.max(8, Math.round((feedH || 300) / 2));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawGrass(ctx, w, h, clock, rm);
  }

  // ── the loop ──

  function frame(wall: number): void {
    const dt = lastFrame ? Math.min(0.1, (wall - lastFrame) / 1000) : 1 / 60;
    lastFrame = wall;
    if (phase !== 'paused') clock += dt;
    const e = engine;
    if (phase === 'play' && e && !e.ended) {
      e.update((wall - base) / 1000);
      for (const f of e.takeFx()) handleFx(f);
      if (e.ended) endRun(e);
    }
    if (phase !== 'paused') {
      if (sayText && clock >= sayUntil) {
        sayText = null;
        sayPrio = -1;
      }
      if (oldNameLater && !mumbleOn && !sayText && engine) {
        const o = oldNameLater;
        oldNameLater = null;
        if (clock <= o.until) oldNameReaction(engine.posts[o.n]);
      }
      if (pendingSay && !sayText) {
        const q = pendingSay;
        pendingSay = null;
        if (clock <= q.until && !mumbleOn && speak(q.s) && q.s.pose) flashPose(q.s.pose, q.s.poseMs);
      }
      tickMumble(dt);
      tickExtras();
    }
    if (e && live) {
      const vis = e.window(3.2, 6);
      syncCards(e, vis);
      measure(vis);
      paint(e, vis, dt);
      syncView(e);
    }
    drawBust();
    if (view.grass) drawLawn();
    if (!live) drawIntro(wall);
    flushAnnounce(wall);
  }

  // Set up once the refs exist (they live in the shell's snippet, so don't assume mount order).
  $effect(() => {
    const root = rootEl;
    const feed = feedEl;
    if (!root || !feed) return;
    return untrack(() => {
      const ro = new ResizeObserver(() => {
        const w = root.clientWidth;
        const h = root.clientHeight;
        mode = w >= h ? (w >= 1000 ? 'd' : 'l') : 't';
        const resized = feedW !== feed.clientWidth || feedH !== feed.clientHeight;
        feedW = feed.clientWidth;
        feedH = feed.clientHeight;
        if (resized) lineY = readLineY(feedH, ppu);
      });
      ro.observe(root);
      ro.observe(feed);
      feed.addEventListener('wheel', onWheel, { passive: false });
      void loadBackground(meta.bg).then((img) => {
        if (img) bgCss = `url(${img.src})`;
      });
      const cell = portraitCell('neutral');
      if (cell) void loadImage(assetUrl(cell.atlas)).then((img) => {
        atlas = img;
        drawnPose = '';
      });
      void sprite.load(['phone', 'wave', 'idle', 'celebrate']);
      introStart = performance.now();
      if (DEBUG) installDebug();
      let raf = requestAnimationFrame(function loop(t) {
        frame(t);
        raf = requestAnimationFrame(loop);
      });
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        feed.removeEventListener('wheel', onWheel);
        if (finishTimer) clearTimeout(finishTimer);
        if (wheelTimer) clearTimeout(wheelTimer);
        if (DEBUG) delete (window as unknown as Record<string, unknown>).__kpXfeed;
      };
    });
  });

  /** ?debug only: QA hooks for the Playwright checks (inspect the engine, jump ahead, force Mumble Mode). */
  function installDebug(): void {
    const right = (p: FeedPost): Call => (p.cls === 'hype' ? 'mute' : p.cls === 'gem' ? 'save' : 'like');
    (window as unknown as Record<string, unknown>).__kpXfeed = {
      get engine() { return engine; },
      get lineY() { return lineY; },
      get ppu() { return ppu; },
      get cursor() { return cursorN(); },
      get mumbling() { return mumbleOn; },
      /** Play ahead to run time T as a decent player (right call ~1 unit from the line, 1 in 11 wrong, flicks filler). */
      warp(T: number) {
        const e = engine;
        if (!e || phase !== 'play') return false;
        for (let t = e.t; t < T && !e.ended; t += 1 / 60) {
          e.update(t);
          const c = e.cursor();
          if (c >= 0) {
            const p = e.posts[c];
            if (p.cls !== 'filler' && e.center(p) - e.s < 1.1) e.call(c, (c * 7) % 11 === 0 ? (right(p) === 'like' ? 'mute' : 'like') : right(p));
            else if (p.cls === 'filler' && e.center(p) - e.s < 0.9 && Math.round(t * 60) % 40 === 0) e.next();
          }
        }
        // skip the lines and sounds, but end where the run is: in or out of Mumble Mode
        const last = e.takeFx().filter((f) => f.kind === 'mumble').pop();
        if (last?.kind === 'mumble') handleFx(last);
        else if (mumbleOn && !e.mumbling) stopMumble('time');
        base = performance.now() - e.t * 1000;
        sShown = e.s;
        return true;
      },
      /** Start Mumble Mode now (as if a 6 streak had just landed on the cursor post). */
      mumble() {
        const e = engine;
        if (!e || mumbleOn) return false;
        e.mumbleUntil = e.t + (e.assist ? 8 : 6);
        e.counts.mumbles += 1;
        startMumble(cursorN() >= 0 ? cursorN() : undefined);
        return true;
      },
      act,
      next,
      bubbles: () => mumbles?.rects() ?? [],
    };
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<MinigameShell
  bind:this={shell}
  bind:phase
  bind:assist
  {meta}
  {pig}
  outfit="everyday"
  rules={[
    'LIKE evidence and worked examples. MUTE hype, bait and “Twitter”. Wrong calls: −100.',
    'Pig faces are your friends: always LIKE them for +150.',
    'SAVE gold posts: +300. Other bookmarks and filler: 0.',
    'Flick for the next post. The dotted line marks misses; missed hype drains the battery.',
    '6 right calls: Mumble Mode ×2. 75 seconds, faster each tab. Every run pays.',
  ]}
  keysHint="Swipe → like, ← mute · flick up: next · keys → like ← mute ↑ save ↓ next · Esc: pause"
  timeLeft={view.time}
  timeTotal={DURATION}
  oncountdown={onCountdown}
  onplay={startRun}
  onpause={onPause}
  onexit={onExit}
>
  {#snippet stage()}
    <div class="xf" class:rm class:paused={phase === 'paused'} bind:this={rootEl} style:background-image={`linear-gradient(rgba(16, 10, 36, 0.58), rgba(16, 10, 36, 0.58)), ${bgCss}`}>
      <div class="grid" class:shown={live} class:zoom={zoomIn}>
        <section class="band">
          <div class="bust" role="img" aria-label={bustLabel}>
            <canvas bind:this={bustCv} width="192" height={BUST_H} aria-hidden="true"></canvas>
            {#if view.mumble}<span class="chip">MUMBLE ×2</span>{/if}
          </div>
          <div class="zone">
            <Mumbles bind:this={mumbles} {cap} reduce={rm} side={mode === 't' ? 'right' : 'auto'} reserve={view.mumble ? 22 : 0} />
            {#if sayText && live}<p class="say" aria-hidden="true"><span>{sayText}</span></p>{/if}
            {#if view.mumble && !sayText}<p class="mline" aria-hidden="true"><span>{mline}</span></p>{/if}
          </div>
        </section>

        <div class="phonewrap">
          <div class="case">
            <img class="ear l" src={earUrl(false)} alt="" />
            <img class="ear r" src={earUrl(true)} alt="" />
            <div class="rim">
              <section class="phone" class:late={view.late} aria-label="Piggy 3's phone">
                <header class="status">
                  <span class="clock">{view.clock}</span>
                  <b class="x" aria-label="X">X</b>
                  <span
                    class="brain"
                    class:mid={view.battery < 60 && view.battery >= 30}
                    class:low={view.battery < 30}
                    role="meter"
                    aria-label="Brain battery"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={view.battery}
                  >
                    <span class="bi">BRAIN</span>
                    <span class="cells" aria-hidden="true">{#each [0, 1, 2, 3, 4] as i (i)}<i class:on={i < segsOn}></i>{/each}</span>
                    <span>{view.battery}%</span>
                  </span>
                </header>
                <nav class="tabs" aria-label="Feed tab">
                  {#each TABS as t, i (t)}<span class:on={view.tab === i} aria-current={view.tab === i ? 'page' : undefined}>{t}</span>{/each}
                </nav>
                <div
                  class="feed"
                  role="feed"
                  aria-label="Piggy 3's X feed"
                  aria-busy={view.loading}
                  bind:this={feedEl}
                  onpointerdown={onDown}
                  onpointermove={onMove}
                  onpointerup={onUp}
                  onpointercancel={onCancel}
                  onlostpointercapture={onCancel}
                >
                  <div class="hist" bind:this={histEl}></div>
                  <div class="readline" bind:this={lineEl} aria-hidden="true"><img src={glassesUrl()} alt="" /></div>
                  {#each cards as c (c.n)}
                    <article
                      use:track={c.n}
                      data-n={c.n}
                      class="card {c.cls} st-{c.state}"
                      class:skeleton={c.skeleton}
                      class:muted={c.muted}
                      class:cursor={c.cursor}
                      class:tells={c.tells}
                      class:gem={c.gem && !c.muted}
                      class:friend={!!c.friend}
                      aria-posinset={c.n + 1}
                      aria-setsize={-1}
                      aria-current={c.cursor ? 'true' : undefined}
                      aria-label={c.skeleton ? 'Loading post' : undefined}
                    >
                      {#if c.skeleton}
                        <i class="av sk"></i>
                        <div class="col"><i class="bar w40"></i><i class="bar w90"></i><i class="bar w70"></i></div>
                      {:else if c.muted}
                        <img class="mute-ico" src={iconUrl('mute')} alt="" />
                        <span class="mt">Muted <b>@{c.handle}</b>{#if c.pts > 0}&nbsp;· +{c.pts}{/if}</span>
                      {:else}
                        <img class="av" class:face={!!c.friend} src={c.avatar} alt="" />
                        <div class="col">
                          <header>
                            <b class="nm {c.friend}">{c.name}</b>{#if c.acorn}<img class="acorn" src={acornUrl()} alt="" />{/if}<span class="hd">@{c.handle}</span><span class="ago">· {c.counts.ago}</span>
                          </header>
                          <p class="tx">{#each c.segs as s, i (i)}{#if s.tell}<span class="tell">{s.t}</span>{:else}{s.t}{/if}{/each}</p>
                          {#if c.media}<div class="media"><img src={c.media.url} alt={c.media.alt} /></div>{/if}
                          <footer>
                            <span class="ct rp"><img src={footIconUrl('reply')} alt="" />{shortCount(c.counts.reply)}</span>
                            <span class="ct rt"><img src={footIconUrl('repost')} alt="" />{shortCount(c.counts.repost)}</span>
                            <span class="ct lk" class:on={c.heartOn}><img src={footIconUrl(c.heartOn ? 'heartOn' : 'heart')} alt="" />{shortCount(c.counts.like + (c.heartOn ? 1 : 0))}</span>
                            <span class="ct bk" class:on={c.saveOn}><img src={footIconUrl(c.saveOn ? 'saveOn' : 'save')} alt="" />{shortCount(c.counts.save + (c.saveOn ? 1 : 0))}</span>
                            {#if c.stamp}<span class="stamp {c.stamp.tone}">{c.stamp.text}</span>{/if}
                          </footer>
                          {#if c.cursor && rm}<i class="tl" aria-hidden="true"></i>{/if}
                        </div>
                      {/if}
                    </article>
                  {/each}
                  {#if view.loading}<span class="loading">Loading…</span>{/if}
                  {#if view.grass}
                    <div class="grass"><canvas bind:this={grassCv} aria-hidden="true"></canvas><p>Touching grass…</p></div>
                  {/if}
                </div>
              </section>
            </div>
          </div>
        </div>

        <nav class="acts" aria-label="Judge the highlighted post">
          <button class="act mute" onclick={() => act('mute')} aria-label="Mute (left arrow)">
            <img src={iconUrl('mute')} alt="" /><span class="w">MUTE</span><span class="k" aria-hidden="true">←</span>
          </button>
          <button class="act save" onclick={() => act('save')} aria-label="Save (up arrow)">
            <img src={iconUrl('star')} alt="" /><span class="w">SAVE</span><span class="k" aria-hidden="true">↑</span>
          </button>
          <button class="act like" onclick={() => act('like')} aria-label="Like (right arrow)">
            <img src={iconUrl('heart')} alt="" /><span class="w">LIKE</span><span class="k" aria-hidden="true">→</span>
          </button>
        </nav>
      </div>

      {#if !live && phase !== 'results'}
        <!-- how-to, 3-2-1 and results: him on the dimmed backdrop, phone out (his intro line above him in the 3-2-1) -->
        <div class="intro" aria-hidden="true">
          {#if phase === 'countdown' && sayText}<p class="say isay">{sayText}</p>{/if}
          <canvas bind:this={introCv} width="128" height="128"></canvas>
        </div>
      {/if}
    </div>
  {/snippet}
  {#snippet hud()}
    <span class="stat"><small>SCORE</small>{view.score.toLocaleString()}</span>
    <span class="stat hot" class:on={view.combo >= 5}><small>COMBO</small>×{comboText}</span>
  {/snippet}
  {#snippet stats(r)}
    <div class="result-summary"><canvas bind:this={resultCv} width="128" height="128" aria-label="Piggy 3 holds out his phone"></canvas><p>{statsLine(r.stats ?? {})}</p></div>
    {#if mumbled.length}<p class="mumbled">He mumbled: {mumbled.join(' ')}</p>{/if}
  {/snippet}
</MinigameShell>

<style>
  /* ── stage: Marston at night behind everything, dimmed ── */
  .xf {
    --screen: #120c26;
    --line2: #2a2048;
    --sub: #b9aedb;
    position: absolute;
    inset: 0;
    container: xf / size;
    background-color: var(--night);
    background-size: cover;
    background-position: center;
    image-rendering: pixelated;
    overflow: hidden;
    -webkit-touch-callout: none;
  }
  .xf.paused .feed { visibility: hidden; }
  .xf.paused :global(.mb) { animation-play-state: paused !important; }

  .grid {
    position: absolute;
    inset: 0;
    display: grid;
    gap: 6px;
    grid-template-areas: 'band' 'phone' 'bar';
    grid-template-rows: clamp(76px, 19cqh, 128px) minmax(0, 1fr) auto;
    grid-template-columns: minmax(0, 1fr);
    padding: 2px 0 2px;
    visibility: hidden;
  }
  .grid.shown { visibility: visible; }
  .grid.zoom .phonewrap { animation: zoom 300ms steps(6) both; transform-origin: 50% 40%; }
  .rm .grid.zoom .phonewrap { animation: fadein 200ms steps(4) both; }
  @keyframes zoom { from { transform: scale(0.55); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  /* ── Piggy 3: his bust and the bubble zone beside it (phones) or above it (landscape, desktop) ── */
  .band {
    grid-area: band;
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    gap: 6px;
    min-height: 0;
    container: band / size;
    padding: 0 6px;
  }
  .bust {
    position: relative;
    height: 100%;
    aspect-ratio: 192 / 200;
    border: var(--px) solid var(--ink);
    background: #241a44;
    box-shadow: 0 var(--px) 0 rgba(0, 0, 0, 0.35);
  }
  .bust canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  .chip {
    position: absolute;
    left: 3px;
    top: 3px;
    font: 12px/1.2 var(--font-display);
    color: var(--ink);
    background: var(--gold);
    padding: 1px 4px;
    border: 2px solid var(--ink);
    white-space: nowrap;
  }
  .zone { position: relative; min-width: 0; min-height: 0; }
  .say {
    position: absolute;
    left: 12px;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    margin: 0;
    padding: 5px 8px 6px;
    background: var(--paper);
    color: var(--ink);
    border: var(--px) solid var(--ink);
    font-size: clamp(12.5px, 3.4vw, 15px);
    line-height: 1.3;
    z-index: 3;
    box-shadow: 0 var(--px) 0 rgba(27, 18, 41, 0.35);
  }
  /* The complete teaching reason stays in the bubble. */
  .say span { display: block; }
  /* tail: left, toward him */
  .say::before {
    content: '';
    position: absolute;
    left: -12px;
    top: 50%;
    margin-top: -6px;
    border: 6px solid transparent;
    border-right: 7px solid var(--ink);
  }
  .mline {
    position: absolute;
    left: 6px;
    right: 0;
    bottom: 0;
    margin: 0;
    height: 18px;
    display: flex;
    justify-content: flex-end;
    overflow: hidden;
    white-space: nowrap;
    font: 12px/18px var(--font-body);
    color: rgba(205, 184, 242, 0.75);
    background: rgba(16, 10, 36, 0.62);
    padding: 0 6px;
    z-index: 1;
  }
  .mline span { flex: none; }

  /* ── the phone: lavender case with stepped pixel corners and two pig ears ── */
  .phonewrap {
    grid-area: phone;
    position: relative;
    min-height: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 12px 8px 4px;
  }
  .case {
    position: relative;
    width: 100%;
    height: 100%;
    max-height: 624px;
    display: flex;
  }
  /* the case: lavender, ink outline, stepped pixel corners (the ears sit outside the clip) */
  .rim {
    flex: 1;
    min-width: 0;
    display: flex;
    padding: 3px;
    background: var(--p3);
    border: 3px solid var(--ink);
    clip-path: polygon(
      0 3px, 3px 3px, 3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px),
      calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
    );
  }
  .phone {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--screen);
    border: 3px solid var(--ink);
  }
  .ear { position: absolute; top: -10px; width: 20px; height: 16px; image-rendering: pixelated; z-index: 2; pointer-events: none; }
  .ear.l { left: 14px; }
  .ear.r { right: 14px; }
  .phone.late::after { content: ''; position: absolute; inset: 0; background: rgba(255, 170, 90, 0.08); pointer-events: none; z-index: 6; }
  .status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 8px 0;
    height: 20px;
    font: 12px var(--font-display);
    color: var(--sub);
    gap: 6px;
  }
  .clock { min-width: 56px; }
  .x { font: 700 15px var(--font-display); color: var(--paper); }
  .brain { display: flex; align-items: center; gap: 3px; min-width: 56px; justify-content: flex-end; }
  .bi { font-size: 12px; letter-spacing: 0.02em; }
  .cells { display: flex; gap: 1px; border: 2px solid var(--sub); padding: 1px; position: relative; }
  .cells::after { content: ''; position: absolute; right: -4px; top: 2px; width: 2px; height: 3px; background: var(--sub); }
  .cells i { width: 4px; height: 6px; background: transparent; }
  .cells i.on { background: var(--ok); }
  .brain.mid .cells i.on { background: var(--warn); }
  .brain.low .cells i.on { background: var(--bad); }
  .brain.low { color: var(--bad); }
  .tabs {
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 24px;
    font: 12px var(--font-display);
    color: var(--sub);
    border-bottom: 2px solid var(--line2);
  }
  .tabs span { padding-bottom: 1px; border-bottom: 3px solid transparent; }
  .tabs span.on { color: var(--paper); border-bottom-color: var(--p3); }

  /* ── the feed ── */
  .feed {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
    container: feed / inline-size;
    cursor: grab;
  }
  .hist { position: absolute; left: 0; right: 0; top: 0; background: rgba(10, 6, 24, 0.5); z-index: 2; pointer-events: none; }
  .readline { position: absolute; left: 0; right: 0; top: 0; height: 0; border-top: 2px dashed var(--p3); z-index: 3; pointer-events: none; }
  .readline img { position: absolute; left: 4px; top: -7px; width: 24px; height: 10px; image-rendering: pixelated; background: var(--screen); padding: 0 2px; box-sizing: content-box; }
  .card {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    display: flex;
    gap: 8px;
    padding: 7px 10px 3px;
    border-bottom: 2px solid var(--line2);
    background: var(--screen);
    overflow: hidden;
    will-change: transform;
  }
  .card.cursor { outline: 2px solid var(--p3); outline-offset: -3px; background: #1d1438; }
  .card.gem { box-shadow: inset 0 0 0 2px var(--gold); background: #1c1530; }
  .card.gem.cursor { background: #241a3a; }
  .card.st-liked, .card.st-saved { background: #1a1230; }
  .card.st-wrong { box-shadow: inset 0 0 0 2px var(--bad); }
  .card.st-missed { opacity: 0.6; }
  .card.st-neutral, .card.st-passed { opacity: 0.85; }
  .av { width: 32px; height: 32px; flex: none; image-rendering: pixelated; }
  .av.face { border: 2px solid var(--p3); background: var(--ink-2); box-sizing: border-box; }
  .card.friend .av.face { border-color: var(--p1); }
  .col { position: relative; min-width: 0; flex: 1; }
  .card header { display: flex; align-items: baseline; gap: 5px; min-width: 0; white-space: nowrap; line-height: 18px; }
  .nm { font: 13px var(--font-display); overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; font-weight: 400; color: var(--paper); }
  .nm.piggy-1 { color: var(--p1); }
  .nm.piggy-2 { color: #8fc0ff; }
  .nm.piggy-3 { color: #d0b8f6; }
  .acorn { width: 12px; height: 12px; flex: none; image-rendering: pixelated; align-self: center; }
  .hd { color: var(--sub); font-size: 12px; overflow: hidden; text-overflow: ellipsis; flex: 1 1 0; min-width: 0; }
  .ago { color: var(--sub); font-size: 12px; flex: none; }
  .tx { margin: 2px 0 3px; font-size: clamp(14px, 4.3cqw, 16px); line-height: 1.38; overflow-wrap: anywhere; color: var(--paper); }
  /* longhands: WebKit drops a text-decoration shorthand that carries a thickness */
  .card.tells .tell, .card.st-wrong .tell, .card.st-missed .tell {
    text-decoration-line: underline;
    text-decoration-style: dotted;
    text-decoration-color: var(--p3);
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }
  .card.st-wrong .tell { text-decoration-style: solid; text-decoration-color: var(--bad); }
  .card.st-missed .tell { text-decoration-style: solid; text-decoration-color: var(--sub); }
  .media { height: 32px; margin: 3px 0 4px; display: flex; justify-content: center; background: #0b0717; border: 2px solid var(--line2); }
  .media img { height: 100%; width: auto; max-width: 100%; image-rendering: pixelated; }
  .card footer { display: flex; align-items: center; gap: 10px; height: 22px; font-size: 12px; color: var(--sub); white-space: nowrap; }
  .ct { display: inline-flex; align-items: center; gap: 3px; flex: none; }
  .ct img { width: 16px; height: 16px; image-rendering: pixelated; }
  .ct.lk.on { color: var(--sakura-2); }
  .ct.bk.on { color: var(--gold); }
  .stamp { margin-left: auto; flex: none; font: 12px/14px var(--font-display); padding: 0 4px; border: 2px solid currentColor; }
  .stamp.like { color: var(--sakura-2); }
  .stamp.gem { color: var(--gold); }
  .stamp.bad { color: var(--bad); }
  .stamp.miss { color: var(--sub); }
  @container feed (max-width: 370px) {
    .ct.rt { display: none; }
  }
  .tl { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--p3); }
  .card.muted { align-items: center; gap: 6px; padding: 0 10px; font-size: 12px; color: var(--sub); }
  .mute-ico { width: 16px; height: 16px; image-rendering: pixelated; flex: none; }
  .mt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 22px; }
  .mt b { font-weight: 400; color: var(--paper); }
  .card.skeleton { opacity: 0.5; }
  .av.sk { display: block; background: #2a2048; }
  .bar { display: block; height: 9px; background: #2a2048; margin: 6px 0; }
  .w40 { width: 40%; }
  .w70 { width: 70%; }
  .w90 { width: 90%; }
  .loading {
    position: absolute;
    left: 50%;
    bottom: 6px;
    transform: translateX(-50%);
    font: 12px var(--font-display);
    color: var(--paper);
    background: var(--ink-2);
    padding: 2px 8px;
    border: 2px solid var(--p3);
    z-index: 4;
    pointer-events: none;
  }
  .grass { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; background: #62b27e; }
  .grass canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
  .grass p {
    position: relative;
    margin: 0;
    font: 16px var(--font-display);
    color: var(--paper);
    background: rgba(16, 10, 36, 0.7);
    padding: 4px 10px;
    border: 2px solid var(--ink);
  }

  /* ── thumb bar (phones) / rail (landscape, desktop) ── */
  .acts { grid-area: bar; display: flex; gap: 8px; padding: 0 6px 2px; }
  .act {
    flex: 1;
    min-width: 0;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font: 16px var(--font-display);
    letter-spacing: 0.06em;
    border: var(--px) solid var(--ink);
    color: var(--ink);
    cursor: pointer;
    box-shadow:
      inset var(--px) var(--px) 0 rgba(255, 255, 255, 0.55),
      inset calc(var(--px) * -1) calc(var(--px) * -1) 0 rgba(0, 0, 0, 0.25),
      0 var(--px) 0 var(--ink);
    touch-action: manipulation;
  }
  .act:active { transform: translateY(var(--px)); box-shadow: inset calc(var(--px) * -1) calc(var(--px) * -1) 0 rgba(255, 255, 255, 0.3); }
  .act:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  .act.mute { background: #3a2f55; color: var(--paper); }
  .act.save { background: var(--gold); }
  .act.like { background: var(--sakura-2); }
  .act img { width: 20px; height: 20px; image-rendering: pixelated; }
  .act .k { font-size: 12px; opacity: 0.65; }

  /* ── how-to / countdown / results: the full-body clip on the dimmed backdrop ── */
  /* phones: his line at the top, him at the bottom, the shell's 3-2-1 in between; landscape: the left column */
  .intro {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 12px 0;
    pointer-events: none;
  }
  .intro canvas { margin-top: auto; width: min(256px, 56cqh, 70cqw); aspect-ratio: 1; image-rendering: pixelated; }
  .isay { position: relative; left: auto; right: auto; top: auto; transform: none; width: min(320px, 100%); max-height: none; }
  .isay::before { left: 50%; top: auto; bottom: -13px; margin: 0 0 0 -6px; border: 6px solid transparent; border-top: 7px solid var(--ink); }

  /* ── HUD + results ── */
  .stat { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; font-size: 1.1rem; }
  .stat small { font-size: 0.7rem; opacity: 0.7; letter-spacing: 0.08em; }
  .stat.hot.on { color: var(--gold); }
  .result-summary { display: flex; align-items: center; gap: 8px; }
  .result-summary canvas { width: 96px; height: 96px; flex: none; image-rendering: pixelated; }
  .mumbled { margin-top: 4px; font-size: 0.8rem; opacity: 0.8; }

  /* Match the app's crisp body-text treatment on 1× displays. */
  @media (max-resolution: 1.99dppx) {
    .nm, .hd, .ago, .ct, .stamp, .mt, .status, .tabs { font-size: 16px; }
    .card header { line-height: 20px; }
    .ago { display: none; }
  }

  /* ── landscape phones and desktop: band | phone | rail, the bubble zone above his bust ── */
  @container xf (min-aspect-ratio: 1 / 1) {
    .grid {
      grid-template-areas: 'band phone bar';
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(150px, 1fr) minmax(300px, 420px) 80px;
      justify-content: center;
      padding: 0 6px 2px 0;
    }
    .band {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 230px) auto;
      align-content: center;
      padding: 0 0 0 6px;
    }
    .zone { grid-row: 1; min-height: 100px; }
    .bust { grid-row: 2; height: auto; width: min(100%, calc(56cqh * 192 / 200), 288px); justify-self: center; align-self: end; }
    .say { left: 0; right: 0; top: auto; bottom: 26px; transform: none; }
    .say::before { left: 50%; top: auto; bottom: -13px; margin: 0 0 0 -6px; border: 6px solid transparent; border-top: 7px solid var(--ink); }
    .mline { left: 0; }
    .phonewrap { padding: 12px 4px 4px; align-items: center; }
    .acts { flex-direction: column; padding: 6px 0; justify-content: center; }
    .intro { right: auto; width: max(34%, 220px); }
    .act { flex: 1 1 0; max-height: 120px; flex-direction: column; gap: 2px; min-height: 56px; font-size: 14px; }
  }
  @container xf (min-aspect-ratio: 1 / 1) and (min-width: 1000px) {
    .grid { grid-template-columns: minmax(260px, 420px) 420px 92px; gap: 16px; }
    .act { flex: 0 0 120px; }
    .tx { font-size: 16px; }
  }
</style>
