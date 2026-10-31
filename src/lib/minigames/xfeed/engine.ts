// For You Pig (id 'xfeed') — Piggy 3's X-feed mini-game: rules engine, pure (no DOM, no Svelte).
// You sort his X feed as it scrolls itself: LIKE posts that show their work, MUTE hype (and anyone who still says
// "Twitter"), SAVE the rare gold posts, leave filler alone. The component (ForYouPig.svelte) reads `takeFx()` for
// lines, poses, sounds and Mumble Mode; this module never touches the screen.
//
// Scroll model ("units", not pixels, so phones and desktops play the same game):
//  - The feed is a column of posts. A post is 0.85–1.4 units long (by text length and media); a muted post collapses
//    to a 0.25-unit "Muted" strip.
//  - `s` is the feed position at the READ LINE (a dotted line 30% down the phone screen). A post is consumed when its
//    centre crosses the line. Unjudged by then = missed (filler just passes).
//  - The algorithm scrolls at `rate` units/s, rising by phase. A flick (or ↓ / Space / one wheel gesture) glides to
//    the next unread post and parks it in the focus slot just under the line; if that post is already parked, the
//    flick scrolls past it ("leave it"). Dragging moves the feed 1:1.
//  - Only posts within REVEAL units below the line are readable; the rest render as loading skeletons, so a taller
//    screen does not mean more reading time. You can't pull the feed faster than CAP × rate ("Loading…").
//
// Scoring: like substance, mute hype, save (bookmark) the rare gold posts, scroll past filler.
//  points = base × combo multiplier (×1 → ×2 at a 20 streak) × 2 in Mumble Mode. Wrong call −100 (never below 0).
//  Brain rot rises when hype gets through; at 100 he puts the phone down and touches grass for 3 s.
import { clamp, rng } from '../common/pixel';
import { SEED_POSTS, type PostClass, type SeedPost, type Tier } from './posts';

export const DURATION = 75;
export const REVEAL = 2.3;
export const FOCUS = 0.95;
export const BUFFER = 1.0;
export const CAP = 1.6;
export const MUTED_W = 0.25;
export const FIRST_START = 1.2;
/** A streak of 6, 12, 18… starts Mumble Mode (6, so a casual player sees the bit about twice a run). */
export const MUMBLE_EVERY = 6;
export const GRASS_SECONDS = 3;

export type PhaseId = 'following' | 'foryou' | 'trending' | 'late';
export interface Phase { id: PhaseId; label: string; clock: string; t0: number; rate: number; mix: Record<PostClass, number>; tiers: [number, number, number] }

/** 75 s, four tabs. Rates are units/s at Normal (Assist ×0.7). */
export const PHASES: readonly Phase[] = [
  { id: 'following', label: 'FOLLOWING', clock: '11:48 PM', t0: 0, rate: 0.35, mix: { signal: 0.4, hype: 0.26, filler: 0.22, friend: 0.12, gem: 0 }, tiers: [0.9, 0.1, 0] },
  { id: 'foryou', label: 'FOR YOU', clock: '12:31 AM', t0: 15, rate: 0.45, mix: { signal: 0.36, hype: 0.38, filler: 0.16, friend: 0.05, gem: 0.05 }, tiers: [0.45, 0.45, 0.1] },
  { id: 'trending', label: 'TRENDING', clock: '1:52 AM', t0: 37, rate: 0.58, mix: { signal: 0.33, hype: 0.45, filler: 0.12, friend: 0.04, gem: 0.06 }, tiers: [0.2, 0.5, 0.3] },
  { id: 'late', label: '3 AM', clock: '3:00 AM', t0: 58, rate: 0.72, mix: { signal: 0.35, hype: 0.47, filler: 0.08, friend: 0.03, gem: 0.07 }, tiers: [0.2, 0.4, 0.4] },
];

/** The first four posts teach the rules: a friend (like), a clear result (like), obvious hype (mute), filler (scroll). */
export const OPENING = ['p1.sunrise', 's.ablation', 'h.thread', 'f.squirrel'];

export const BASE = { signal: 100, hype: 100, friend: 150, gem: 300, gemLiked: 150, wrong: 100 } as const;
export const ROT = {
  start: 20, decay: 1, decayAssist: 1.5, decayMumble: 3,
  muteHype: -4, likeGood: -2, saveGem: -10, likeGem: -4,
  likedHype: 15, mutedGood: 6, missedHype: 10, missedGood: 3,
  feedback: 50, afterGrass: 40,
} as const;

export type Call = 'like' | 'save' | 'mute';
export type PostState = 'live' | 'liked' | 'saved' | 'muted' | 'wrong' | 'missed' | 'passed' | 'neutral';

export interface FeedPost extends SeedPost {
  n: number;
  /** Feed position of the post's top edge and its length (units). */
  start: number;
  w: number;
  state: PostState;
  consumed: boolean;
  /** Points this post earned (negative for a wrong call). */
  pts: number;
  call?: Call;
  /** Underline the tell (after a wrong or missed call). */
  tellShown: boolean;
  /** Has been readable (the component reacts once: "It's called X.", gold shimmer…). */
  seen: boolean;
}

export type SayKey =
  | 'intro' | 'phase' | 'likeOk' | 'muteOk' | 'likeWrong' | 'muteWrong' | 'missSignal' | 'missHype' | 'friend' | 'friendMuted'
  | 'missFriend' | 'ownLiked' | 'ownMuted' | 'gem' | 'gemLiked' | 'oldName' | 'oldNameMuted' | 'oldNameLiked' | 'xray' | 'combo' | 'rot'
  | 'grass' | 'grassBack' | 'loading' | 'snapOut' | 'tenLeft' | 'timeUp';

export type FeedFx =
  | { kind: 'say'; key: SayKey; post?: number; n?: number; prio: number }
  | { kind: 'pop'; post: number; text: string; tone: 'good' | 'bad' | 'gold' | 'meh' }
  /** Exact SfxIds (see the audio table). The component throttles whoosh to one per 250 ms. */
  | { kind: 'sfx'; sfx: 'heart' | 'sparkle' | 'coin' | 'tidy' | 'question' | 'notify' | 'oink_sad' | 'whoosh' | 'ui_move' | 'ui_open' | 'zzz' | 'step' | 'success' }
  /** Mumble Mode on/off. `by: 'wrong'` = a wrong call broke his concentration (the wrong-call line is his snap-out). */
  | { kind: 'mumble'; on: boolean; by?: 'time' | 'wrong' | 'grass' | 'end'; post?: number }
  | { kind: 'phase'; idx: number }
  | { kind: 'grass'; on: boolean }
  | { kind: 'seen'; post: number };

export interface Judged { ok: boolean; pts: number; state: PostState }

const plain = (t: string) => t.replace(/\[\[|\]\]/g, '');

/** Post length in units: longer text and a media thumbnail buy reading time. */
export function weightOf(p: SeedPost): number {
  return clamp(0.85 + plain(p.text).length / 260 + (p.media ? 0.25 : 0), 0.85, 1.4);
}

export function phaseAt(t: number): number {
  let i = 0;
  for (let k = 0; k < PHASES.length; k++) if (t >= PHASES[k].t0) i = k;
  return i;
}

export function comboMult(combo: number): number {
  return Math.min(2, 1 + 0.25 * Math.floor(combo / 5));
}

export interface EngineOpts { assist?: boolean; bank?: readonly SeedPost[]; opening?: readonly string[] }

export class FeedEngine {
  t = 0;
  s = 0;
  ended = false;
  posts: FeedPost[] = [];
  score = 0;
  combo = 0;
  maxCombo = 0;
  rot: number = ROT.start;
  rotPeak: number = ROT.start;
  phaseIdx = 0;
  mumbleUntil = -1;
  grassUntil = -1;
  loading = false;
  /** Feed position the algorithm has served up to (posts past it aren't drawn). */
  served = FIRST_START + REVEAL + BUFFER;
  counts = { judged: 0, correct: 0, wrong: 0, missed: 0, liked: 0, muted: 0, saved: 0, friends: 0, gems: 0, gemsSeen: 0, oldName: 0, mumbles: 0, grass: 0, filler: 0 };
  fx: FeedFx[] = [];
  readonly assist: boolean;
  private rand: () => number;
  private bank: readonly SeedPost[];
  private used = new Set<string>();
  private opening: string[];
  /** Glide target for a flick (null = none). */
  private glide: number | null = null;
  private lastLoadingSay = -99;
  private starvedAt = -1;
  private comboSaid = 0;
  private rotSaid = 0;
  private oldNameServed = false;
  private phaseStartN = 0;
  private tenSaid = false;

  constructor(seed: number, opts: EngineOpts = {}) {
    this.assist = !!opts.assist;
    this.rand = rng(seed);
    this.bank = opts.bank ?? SEED_POSTS;
    this.opening = [...(opts.opening ?? OPENING)];
    this.fill();
  }

  get phase(): Phase {
    return PHASES[this.phaseIdx];
  }

  get rate(): number {
    if (this.t < this.grassUntil || this.ended) return 0;
    return PHASES[this.phaseIdx].rate * (this.assist ? 0.7 : 1);
  }

  get mumbling(): boolean {
    return this.t < this.mumbleUntil;
  }

  get grass(): boolean {
    return this.t < this.grassUntil;
  }

  center(p: FeedPost): number {
    return p.start + p.w / 2;
  }

  /** Readable now: served, not consumed, within the reveal window. */
  readable(p: FeedPost): boolean {
    return !p.consumed && p.start < this.served && this.center(p) - this.s <= REVEAL;
  }

  /** The post the thumb bar acts on: the first readable, unjudged post (filler included). -1 if none. */
  cursor(): number {
    for (const p of this.posts) if (!p.consumed && p.state === 'live' && this.readable(p)) return p.n;
    return -1;
  }

  /** Posts to draw between `above` units above the line and `below` units under it (unreadable ones as skeletons). */
  window(above: number, below: number): FeedPost[] {
    return this.posts.filter((p) => p.start + p.w >= this.s - above && p.start <= this.s + below);
  }

  // ── generation ──

  private pickPost(): SeedPost {
    const r = this.rand;
    if (this.opening.length) {
      const id = this.opening.shift()!;
      const hit = this.bank.find((b) => b.id === id && !this.used.has(b.id));
      if (hit) return hit;
    }
    const ph = PHASES[this.phaseIdx];
    if (this.phaseIdx >= 1 && !this.oldNameServed && this.posts.length - this.phaseStartN >= 1) {
      const old = this.bank.filter((b) => b.oldName && !this.used.has(b.id) && b.by !== this.posts[this.posts.length - 1]?.by);
      if (old.length) return old[Math.floor(r() * old.length)];
    }
    const mix = { ...ph.mix };
    if (this.rot >= ROT.feedback) {
      // the algorithm learns from what got through: more hype
      const shift = Math.min(0.1, mix.signal);
      mix.signal -= shift;
      mix.hype += shift;
    }
    const recent = this.posts.slice(-6);
    if (recent.some((p) => p.cls === 'gem')) mix.gem = 0;
    if (recent.slice(-3).some((p) => p.cls === 'friend')) mix.friend = 0;
    const total = Object.values(mix).reduce((a, b) => a + b, 0);
    let x = r() * total;
    let cls: PostClass = 'signal';
    for (const k of Object.keys(mix) as PostClass[]) {
      x -= mix[k];
      if (x <= 0) {
        cls = k;
        break;
      }
    }
    const y = r();
    const want: Tier = y < ph.tiers[0] ? 1 : y < ph.tiers[0] + ph.tiers[1] ? 2 : 3;
    const last = this.posts[this.posts.length - 1];
    const ok = (b: SeedPost) =>
      !this.used.has(b.id) && b.cls === cls && b.by !== last?.by && !(b.own && this.phaseIdx === 0) && !(b.oldName && recent.some((p) => p.oldName));
    // closest tier first, then any tier, then anything unused, then a repeat (only if the bank ran dry)
    const order: Tier[] = want === 1 ? [1, 2, 3] : want === 2 ? [2, 1, 3] : [3, 2, 1];
    for (const tier of order) {
      const pool = this.bank.filter((b) => ok(b) && (b.cls === 'filler' || b.cls === 'friend' || b.cls === 'gem' || b.tier === tier));
      if (pool.length) return pool[Math.floor(r() * pool.length)];
    }
    const any = this.bank.filter((b) => !this.used.has(b.id) && b.by !== last?.by);
    if (any.length) return any[Math.floor(r() * any.length)];
    return this.bank[Math.floor(r() * this.bank.length)];
  }

  /** Keep posts generated a little past what has been served. */
  private fill(): void {
    let end = this.posts.length ? this.posts[this.posts.length - 1].start + this.posts[this.posts.length - 1].w : FIRST_START;
    while (end < this.served + 2.5) {
      const b = this.pickPost();
      this.used.add(b.id);
      if (b.oldName) this.oldNameServed = true;
      const p: FeedPost = { ...b, n: this.posts.length, start: end, w: weightOf(b), state: 'live', consumed: false, pts: 0, tellShown: false, seen: false };
      this.posts.push(p);
      end += p.w;
    }
  }

  private relayout(from: number): void {
    for (let i = Math.max(1, from); i < this.posts.length; i++) this.posts[i].start = this.posts[i - 1].start + this.posts[i - 1].w;
  }

  // ── rot / combo ──

  private addRot(d: number): void {
    const k = d > 0 && this.assist ? 0.5 : 1;
    this.rot = clamp(this.rot + d * k, 0, 100);
    this.rotPeak = Math.max(this.rotPeak, this.rot);
    for (const th of [50, 75]) {
      if (this.rot >= th && this.rotSaid < th) {
        this.rotSaid = th;
        this.fx.push({ kind: 'say', key: 'rot', n: th, prio: 2 });
      }
    }
    if (this.rot < 40) this.rotSaid = 0;
    if (this.rot >= 100 && !this.grass) this.touchGrass();
  }

  private touchGrass(): void {
    if (this.mumbling) this.fx.push({ kind: 'mumble', on: false, by: 'grass' });
    this.grassUntil = this.t + GRASS_SECONDS;
    this.rot = ROT.afterGrass;
    this.combo = 0;
    this.mumbleUntil = -1;
    this.glide = null;
    this.counts.grass += 1;
    this.fx.push({ kind: 'grass', on: true }, { kind: 'say', key: 'grass', prio: 3 }, { kind: 'sfx', sfx: 'zzz' });
  }

  private breakCombo(): void {
    this.combo = 0;
  }

  private good(p: FeedPost, base: number, state: PostState): number {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const pts = Math.round(base * comboMult(this.combo) * (this.mumbling ? 2 : 1));
    this.score += pts;
    this.counts.correct += 1;
    p.pts = pts;
    p.state = state;
    this.fx.push({ kind: 'pop', post: p.n, text: `+${pts}`, tone: base >= 300 ? 'gold' : 'good' });
    if (this.combo % MUMBLE_EVERY === 0 || (state === 'saved' && p.cls === 'gem')) this.startMumble(p.n);
    else if ((this.combo === 5 || this.combo === 15 || this.combo === 25) && this.comboSaid < this.combo) {
      this.comboSaid = this.combo;
      this.fx.push({ kind: 'say', key: 'combo', n: this.combo, prio: 1 }, { kind: 'sfx', sfx: 'coin' });
    }
    return pts;
  }

  /** Mumble Mode: ×2 points for 6 s (8 in Assist), tells underlined, rot drains fast. A new trigger extends it. */
  private startMumble(post: number): void {
    if (!this.mumbling) {
      this.counts.mumbles += 1;
      this.fx.push({ kind: 'mumble', on: true, post });
    }
    this.mumbleUntil = this.t + (this.assist ? 8 : 6);
  }

  private wrong(p: FeedPost, state: PostState, rot: number): number {
    const pen = Math.min(this.score, BASE.wrong);
    this.score -= pen;
    this.counts.wrong += 1;
    this.breakCombo();
    p.pts = -pen;
    p.state = state;
    p.tellShown = true;
    this.addRot(rot);
    this.fx.push({ kind: 'pop', post: p.n, text: pen ? `−${pen}` : 'OOPS', tone: 'bad' }, { kind: 'sfx', sfx: 'question' });
    // a wrong call snaps him out of the mumble on the spot ("Wait— …"): the ×2 window is a focus you can break
    if (this.mumbling) {
      this.mumbleUntil = -1;
      this.fx.push({ kind: 'mumble', on: false, by: 'wrong' });
    }
    return -pen;
  }

  // ── player actions ──

  /** Judge post `n` (any readable, unjudged post). Returns null if it can't be judged right now. */
  call(n: number, c: Call): Judged | null {
    const p = this.posts[n];
    if (!p || this.ended || this.grass || p.state !== 'live' || !this.readable(p)) return null;
    p.call = c;
    if (p.cls === 'filler') {
      // harmless: no points, the combo is untouched
      p.state = c === 'mute' ? 'muted' : 'neutral';
      this.counts.filler += 1;
      if (c === 'mute') this.collapse(p);
      this.fx.push({ kind: 'pop', post: n, text: '·', tone: 'meh' }, { kind: 'sfx', sfx: 'ui_move' });
      return { ok: true, pts: 0, state: p.state };
    }
    if (c === 'save' && p.cls !== 'gem') {
      // A wasted bookmark is harmless, but never substitutes for reading and liking.
      p.state = 'neutral';
      this.fx.push({ kind: 'pop', post: n, text: '0', tone: 'meh' }, { kind: 'sfx', sfx: 'ui_move' });
      return { ok: true, pts: 0, state: p.state };
    }
    this.counts.judged += 1;
    const good = p.cls !== 'hype';
    let pts = 0;
    if (good && c !== 'mute') {
      if (p.cls === 'gem') {
        this.counts.gems += 1;
        if (c === 'save') {
          this.counts.saved += 1;
          pts = this.good(p, BASE.gem, 'saved');
          this.addRot(ROT.saveGem);
          this.fx.push({ kind: 'sfx', sfx: 'sparkle' }, { kind: 'sfx', sfx: 'coin' }, { kind: 'say', key: 'gem', post: n, prio: 2 });
        } else {
          this.counts.liked += 1;
          pts = this.good(p, BASE.gemLiked, 'liked');
          this.addRot(ROT.likeGem);
          this.fx.push({ kind: 'sfx', sfx: 'heart' }, { kind: 'say', key: 'gemLiked', post: n, prio: 2 });
        }
      } else {
        this.counts.liked += 1;
        const friend = p.cls === 'friend';
        if (friend) this.counts.friends += 1;
        pts = this.good(p, friend ? BASE.friend : BASE.signal, 'liked');
        this.addRot(ROT.likeGood);
        this.fx.push({ kind: 'sfx', sfx: 'heart' });
        if (p.own) this.fx.push({ kind: 'say', key: 'ownLiked', post: n, prio: 3 });
        else if (friend) this.fx.push({ kind: 'say', key: 'friend', post: n, prio: 2 });
        else if (p.id === 's.xray') this.fx.push({ kind: 'say', key: 'xray', post: n, prio: 2 });
        else this.fx.push({ kind: 'say', key: 'likeOk', post: n, prio: 0 });
      }
    } else if (good) {
      // a wrongly muted post stays open (tell underlined) so you can see what you muted
      pts = this.wrong(p, 'wrong', ROT.mutedGood);
      this.fx.push({ kind: 'say', key: p.own ? 'ownMuted' : p.cls === 'friend' ? 'friendMuted' : 'muteWrong', post: n, prio: 3 });
    } else if (c === 'mute') {
      this.counts.muted += 1;
      if (p.oldName) this.counts.oldName += 1;
      pts = this.good(p, BASE.hype, 'muted');
      this.addRot(ROT.muteHype);
      this.collapse(p);
      this.fx.push({ kind: 'sfx', sfx: 'tidy' }, { kind: 'say', key: p.oldName ? 'oldNameMuted' : 'muteOk', post: n, prio: p.oldName ? 2 : 0 });
    } else {
      pts = this.wrong(p, 'wrong', ROT.likedHype);
      this.fx.push({ kind: 'say', key: p.oldName ? 'oldNameLiked' : 'likeWrong', post: n, prio: 3 });
    }
    // (state was set by good() / wrong(), which TypeScript's narrowing can't see)
    const state = p.state as PostState;
    return { ok: pts >= 0 && state !== 'wrong', pts, state };
  }

  /** Mute collapses a post to a thin strip; the posts under it close the gap (never eating the next one at once). */
  private collapse(p: FeedPost): void {
    if (p.w <= MUTED_W) return;
    p.w = MUTED_W;
    this.relayout(p.n + 1);
    const next = this.posts.find((q) => q.n > p.n && !q.consumed);
    if (next && this.center(next) < this.s + FOCUS) this.s = Math.max(this.s - 0.5, this.center(next) - FOCUS);
    if (this.glide !== null) this.glide = this.nextTarget(false, this.s);
    this.fill();
  }

  /** Where a flick should park: the cursor's centre in the focus slot, or the next unread one if it's already there. */
  private nextTarget(pass: boolean, from = this.glide ?? this.s): number | null {
    const live = this.posts.filter((p) => !p.consumed && p.state === 'live' && this.center(p) > from);
    if (!live.length) return null;
    const first = live[0];
    if (!pass || this.center(first) > from + FOCUS + 0.06) return this.center(first) - FOCUS;
    const second = live[1];
    return second ? this.center(second) - FOCUS : this.center(first) + 0.01;
  }

  /** Flick / ↓ / Space / one wheel gesture. */
  next(): void {
    if (this.ended || this.grass) return;
    const target = this.nextTarget(true);
    if (target === null) return;
    this.glide = Math.max(this.glide ?? this.s, target);
    this.fx.push({ kind: 'sfx', sfx: 'whoosh' });
  }

  /** Finger drag in units (+ = forward). Backward drags rubber-band (max 0.3 units) and never un-consume posts. */
  drag(du: number): void {
    if (this.ended || this.grass) return;
    this.glide = null;
    if (du < 0) du *= 0.35;
    this.s = clamp(this.s + du, this.floor, this.served - REVEAL);
    this.consume();
  }

  /** Lowest the feed may go: a little give above the last consumed post. */
  get floor(): number {
    let f = 0;
    for (const p of this.posts) if (p.consumed) f = Math.max(f, this.center(p));
    return f > 0 ? f - 0.3 : 0;
  }

  // ── time ──

  update(t: number): void {
    const dt = clamp(t - this.t, 0, 0.1);
    this.t = t;
    if (this.ended) return;
    if (t >= DURATION) {
      this.end();
      return;
    }
    const pi = phaseAt(t);
    if (pi !== this.phaseIdx) {
      this.phaseIdx = pi;
      this.phaseStartN = this.posts.length;
      this.fx.push({ kind: 'phase', idx: pi }, { kind: 'say', key: 'phase', n: pi, prio: 3 }, { kind: 'sfx', sfx: 'ui_open' });
    }
    if (!this.tenSaid && t >= DURATION - 10) {
      this.tenSaid = true;
      this.fx.push({ kind: 'say', key: 'tenLeft', prio: 2 });
    }
    if (this.grassUntil > 0 && t >= this.grassUntil) {
      this.grassUntil = -1;
      this.fx.push({ kind: 'grass', on: false }, { kind: 'say', key: 'grassBack', prio: 3 }, { kind: 'sfx', sfx: 'step' }, { kind: 'sfx', sfx: 'sparkle' });
    }
    if (this.mumbleUntil > 0 && t >= this.mumbleUntil) {
      this.mumbleUntil = -1;
      this.fx.push({ kind: 'mumble', on: false, by: 'time' }, { kind: 'say', key: 'snapOut', prio: 3 });
    }
    // rot decays while the feed behaves
    const decay = this.mumbling ? ROT.decayMumble : this.assist ? ROT.decayAssist : ROT.decay;
    this.rot = Math.max(0, this.rot - decay * dt);
    if (this.grass) return;

    const rate = this.rate;
    // the algorithm serves up to CAP × its own pace, a bounded buffer ahead
    this.served = Math.min(this.served + CAP * rate * dt, this.s + REVEAL + BUFFER);
    this.served = Math.max(this.served, this.s + REVEAL);
    let ds = rate * dt;
    if (this.glide !== null) {
      this.glide += rate * dt;
      const k = 1 - Math.exp(-14 * dt);
      ds += (this.glide - this.s - ds) * k;
      if (Math.abs(this.glide - this.s - ds) < 0.004) {
        ds = this.glide - this.s;
        this.glide = null;
      }
    }
    const max = this.served - REVEAL;
    if (this.s + ds > max) {
      ds = Math.max(0, max - this.s);
      if (this.glide !== null) {
        if (this.starvedAt < 0) this.starvedAt = t;
        this.loading = true;
        if (t - this.starvedAt >= 0.3) this.glide = null;
        if (t - this.starvedAt >= 0.3 && t - this.lastLoadingSay > 12) {
          this.lastLoadingSay = t;
          this.fx.push({ kind: 'say', key: 'loading', prio: 1 });
        }
      }
    } else {
      this.loading = false;
      this.starvedAt = -1;
    }
    this.s += ds;
    this.consume();
    this.fill();
    for (const p of this.posts) {
      if (p.seen || !this.readable(p)) continue;
      p.seen = true;
      this.fx.push({ kind: 'seen', post: p.n });
    }
  }

  private consume(): void {
    for (const p of this.posts) {
      if (p.consumed || this.center(p) > this.s) continue;
      p.consumed = true;
      if (p.state !== 'live') continue;
      if (p.cls === 'filler') {
        p.state = 'passed';
        continue;
      }
      p.state = 'missed';
      p.tellShown = true;
      this.counts.missed += 1;
      this.breakCombo();
      if (p.cls === 'hype') {
        this.addRot(ROT.missedHype);
        this.fx.push({ kind: 'say', key: 'missHype', post: p.n, prio: 1 }, { kind: 'sfx', sfx: 'notify' });
      } else {
        if (p.cls === 'gem') this.counts.gems += 1;
        this.addRot(ROT.missedGood);
        this.fx.push({ kind: 'say', key: p.cls === 'friend' ? 'missFriend' : 'missSignal', post: p.n, prio: 1 }, { kind: 'sfx', sfx: 'oink_sad' });
      }
    }
  }

  private end(): void {
    if (this.mumbling) this.fx.push({ kind: 'mumble', on: false, by: 'end' });
    this.ended = true;
    this.glide = null;
    this.mumbleUntil = -1;
    this.score += this.clarity;
    this.fx.push({ kind: 'say', key: 'timeUp', prio: 3 }, { kind: 'sfx', sfx: 'success' });
  }

  /** End bonus: a clear head, scaled by accuracy (so mashing doesn't earn it). */
  get clarity(): number {
    return Math.round((100 - this.rot) * 3 * (this.accuracy() / 100));
  }

  accuracy(): number {
    const tries = this.counts.correct + this.counts.wrong + this.counts.missed;
    return tries ? Math.round((this.counts.correct / tries) * 100) : 0;
  }

  takeFx(): FeedFx[] {
    const out = this.fx;
    this.fx = [];
    return out;
  }

  stats(): Record<string, number> {
    const c = this.counts;
    return {
      accuracy: this.accuracy(), judged: c.judged, correct: c.correct, wrong: c.wrong, missed: c.missed, liked: c.liked, muted: c.muted,
      saved: c.saved, friends: c.friends, gems: c.gems, oldName: c.oldName, mumbles: c.mumbles, grass: c.grass, maxCombo: this.maxCombo,
      battery: Math.round(100 - this.rot), rot: Math.round(this.rot), clarity: this.clarity, posts: this.posts.filter((p) => p.consumed).length,
    };
  }
}
