// Steady Hoof rules (id 'surgery'; GAME_DESIGN.md §9): Piggy 2's skills night in the Shands sim suite. One instrument tip,
// three 24 s stations on training models (a silicone pad, a silicone vessel, a gel brain phantom — never a patient):
// close a seam (trace), hold steady under the scope (hold), set electrodes (settle, then set). The tip is the hand plus a
// gentle sway that calms on the exhale of a slow breath shared with him. No fail state, nothing is cut, nothing bleeds.
// Pure TS: positions are tray units (0..100 on each axis), t = seconds since GO.
import { clamp, lerp, rng } from '../common/pixel';

export type StationId = 'close' | 'scope' | 'place';
export const STATIONS: readonly StationId[] = ['close', 'scope', 'place'];
export type Grade = 'top' | 'good' | 'ok';
export type Step = 'card' | 'work' | 'wrap' | 'done';

export const GRADE_LABEL: Record<StationId, Record<Grade, string>> = {
  close: { top: 'NEAT', good: 'GOOD', ok: 'LOOSE' },
  scope: { top: 'STEADY', good: 'GOOD', ok: 'SHAKY' },
  place: { top: 'PERFECT', good: 'GOOD', ok: 'OK' },
};

export const POINTS: Record<StationId, Record<Grade, number>> = {
  close: { top: 40, good: 25, ok: 10 },
  scope: { top: 70, good: 45, ok: 20 },
  place: { top: 70, good: 45, ok: 20 },
};

/** Per seam (watertight / closed), per clean hold, per set of four contacts (clean signal / signal). A seam with a
 *  rushed stitch is never watertight and earns no closure bonus. */
export const BONUS = { watertight: 60, closed: 30, clean: 20, cleanSignal: 40, signal: 20 } as const;
/** A stitch thrown while rushing grades LOOSE and is worth almost nothing (a loose stitch off the line still earns 10). */
export const RUSHED_POINTS = 2;

/** What each station is called on its title card, in announcements and in the HUD. */
export const STATION_INFO: Record<StationId, { name: string; title: string; caption: string; icon: string; rule: string }> = {
  close: { name: 'Close the Seam', title: 'CLOSE THE SEAM', caption: 'TRACE THE LINE', icon: 'suture', rule: 'Trace the dotted line. Each blossom you pass becomes a stitch. Rushing makes it loose.' },
  scope: { name: 'Under the Scope', title: 'UNDER THE SCOPE', caption: 'HOLD IN THE RING', icon: 'forceps', rule: 'Put the tip in the ring on the pulsing tube and keep it there until the ring fills.' },
  place: { name: 'Electrodes', title: 'ELECTRODES', caption: 'SET 1-2-3-4', icon: 'brain_model', rule: 'Carry each contact to its number, then hold still until it sets.' },
};

// ── timeline: 3 × (title card, work, wrap) ──
export const CARD_SECONDS = 1.6;
export const WORK_SECONDS = 24;
export const WRAP_SECONDS = 0.8;
export const ROUND_SECONDS = 26.4;
export const RUN_SECONDS = 79.2;
/** Beats per second of piggy2_theme (72 BPM): the vessel's pulse when the song clock isn't available. */
export const BEATS_PER_SECOND = 1.2;

export interface Phase { station: number; step: Step; start: number }

/** Which station and step a run is in at time t (a pure function of t: every run has the same timeline). */
export function phaseAt(t: number): Phase {
  if (t >= RUN_SECONDS) return { station: 2, step: 'done', start: RUN_SECONDS };
  const i = clamp(Math.floor(Math.max(0, t) / ROUND_SECONDS), 0, 2);
  const r0 = i * ROUND_SECONDS;
  const local = t - r0;
  if (local < CARD_SECONDS) return { station: i, step: 'card', start: r0 };
  if (local < CARD_SECONDS + WORK_SECONDS) return { station: i, step: 'work', start: r0 + CARD_SECONDS };
  return { station: i, step: 'wrap', start: r0 + CARD_SECONDS + WORK_SECONDS };
}

export const workStart = (station: number): number => station * ROUND_SECONDS + CARD_SECONDS;
const STEP_ORDER: Record<Step, number> = { card: 0, work: 1, wrap: 2, done: 3 };
const order = (station: number, step: Step) => (step === 'done' ? 9 : station * 3 + STEP_ORDER[step]);

// ── tuning ──
export interface Tune {
  /** Sway [drift, jitter] in tray units per station. */
  sway: Record<StationId, [number, number]>;
  breathPeriod: number;
  calmFloor: number;
  /** pull: the thread's top speed (u/s). The seam closes no faster than this, so a racing hand only gets ahead of the
   *  stitching (and soon off the seam): the stitch pace limit, not the hand, sets how many stitches a station can hold. */
  close: { neat: number; good: number; capture: number; rush: number; spacing: number; pull: number };
  scope: { ring: number; fill: number; drain: number; steady: number; good: number; pulse: number };
  place: { capture: number; dwell: number; still: number; perfect: number; good: number; k: number; zeta: number };
}

export const NORMAL: Tune = {
  sway: { close: [1.6, 0.3], scope: [3.2, 0.6], place: [2.0, 0.4] },
  breathPeriod: 5,
  calmFloor: 0.3,
  close: { neat: 1.5, good: 3, capture: 6, rush: 14, spacing: 12, pull: 14 },
  scope: { ring: 4, fill: 1.6, drain: 0.5, steady: 1.3, good: 2.4, pulse: 1.2 },
  place: { capture: 5, dwell: 0.7, still: 6, perfect: 1.0, good: 2.0, k: 140, zeta: 0.45 },
};

export const ASSIST: Tune = {
  sway: { close: [1.6 * 0.6, 0.3 * 0.6], scope: [3.2 * 0.6, 0.6 * 0.6], place: [2.0 * 0.6, 0.4 * 0.6] },
  breathPeriod: 6,
  calmFloor: 0.3,
  close: { neat: 2.0, good: 4.0, capture: 8, rush: 16, spacing: 12, pull: 16 },
  scope: { ring: 5.4, fill: 1.4, drain: 0, steady: 1.75, good: 3.25, pulse: 0.8 },
  place: { capture: 6.75, dwell: 0.6, still: 8, perfect: 1.35, good: 2.7, k: 140, zeta: 0.7 },
};

/** Keyboard speeds (tray units/s): constant on the seam (under the rush limit), a ramp elsewhere, Shift = fine. */
export const KEY_SPEED = { trace: 12.5, start: 6, max: 22, ramp: 0.35, fine: 4 } as const;
/** Touch is relative, like a trackpad: tray units per CSS px of finger travel (the same on every phone). */
export const TOUCH_GAIN = 0.3;
/** Speed is the net hand travel over this window, so wobble and sway corrections cancel out. */
export const SPEED_WINDOW = 0.25;
/** Off the seam this long → the "back to the needle" hint. */
export const OFF_HINT_SECONDS = 0.6;

// ── shapes ──
export interface Vec { x: number; y: number }
export interface SeamMark { s: number; x: number; y: number; grade?: Grade; rushed?: boolean }
export interface Seam { pts: Vec[]; cum: number[]; len: number; marks: SeamMark[]; dir: 1 | -1 }
export interface DoneSeam { pts: Vec[]; marks: SeamMark[]; watertight: boolean }
export interface ScopeTarget { base: Vec; nx: number; ny: number; fill: number; sumD: number; sumT: number; left: boolean; wait: number }
export interface Knot { x: number; y: number; grade: Grade }
export interface PlaceMark { x: number; y: number; n: number; grade?: Grade; at?: Vec }
export interface Lead { x: number; y: number; vx: number; vy: number }

export interface Input {
  /** Mouse / pen: the hand goes here (tray units). */
  abs?: Vec | null;
  /** Touch drag and keys: the hand moves by this much (tray units). */
  delta?: Vec | null;
  /** Song beats (piggy2_theme), for the vessel pulse; defaults to t × 1.2. */
  beat?: number;
}

export type SFx =
  | { kind: 'card'; station: StationId; index: number }
  | { kind: 'work'; station: StationId }
  | { kind: 'grade'; station: StationId; grade: Grade; x: number; y: number; rushed?: boolean; clean?: boolean }
  | { kind: 'bonus'; id: 'watertight' | 'closed' | 'clean_signal' | 'signal'; x: number; y: number; points: number }
  | { kind: 'rush' }
  | { kind: 'off' }
  | { kind: 'swing' }
  | { kind: 'wrap'; station: StationId }
  | { kind: 'end' };

const TAU = Math.PI * 2;
const smooth = (u: number) => {
  const x = clamp(u, 0, 1);
  return x * x * (3 - 2 * x);
};
const frac = (v: number) => ((v % 1) + 1) % 1;

/** One breath (u = phase 0..1): the exhale settles over 0.12 of the cycle and holds until 0.6, then the inhale. 1 = calm. */
export function breathCalm(u: number): number {
  if (u < 0.6) return smooth(u / 0.12);
  return 1 - smooth((u - 0.6) / 0.4);
}

/** A gentle seam from `from` toward the other side; x is monotonic, so keys (→ with ↑↓) can follow it. */
export function makeSeam(rand: () => number, from: Vec, dir: 1 | -1, spacing: number, n = 0): Seam {
  const x1 = dir > 0 ? 86 : 14;
  const yEnd = lerp(30, 70, rand());
  const amp = Math.min(14, lerp(5, 10, rand()) + 2 * n) * (rand() < 0.5 ? -1 : 1);
  const waves = lerp(0.7, 1.2, rand());
  const pts: Vec[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push({ x: lerp(from.x, x1, u), y: clamp(lerp(from.y, yEnd, u) + amp * Math.sin(Math.PI * waves * u) * Math.sin(Math.PI * u), 16, 84) });
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const len = cum[cum.length - 1];
  const seam: Seam = { pts, cum, len, marks: [], dir };
  for (let s = 8; s <= len - 4; s += spacing) seam.marks.push({ s, ...pointAt(seam, s) });
  return seam;
}

export function pointAt(seam: Seam, s: number): Vec {
  const { pts, cum } = seam;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const u = clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  return { x: lerp(pts[i - 1].x, pts[i].x, u), y: lerp(pts[i - 1].y, pts[i].y, u) };
}

/** Closest point on the seam with arc length in [lo, hi]. */
export function project(seam: Seam, p: Vec, lo: number, hi: number): { s: number; d: number } {
  const { pts, cum } = seam;
  let best = { s: lo, d: Infinity };
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] < lo || cum[i - 1] > hi) continue;
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1e-6;
    let u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
    let s = cum[i - 1] + u * (cum[i] - cum[i - 1]);
    if (s < lo || s > hi) {
      s = clamp(s, lo, hi);
      u = clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
    }
    const d = Math.hypot(p.x - (a.x + dx * u), p.y - (a.y + dy * u));
    if (d < best.d) best = { s, d };
  }
  return best;
}

/** The vessel's centerline under the scope. */
export function vesselY(x: number, phase: number): number {
  return 50 + 16 * Math.sin((x / 100) * TAU * 0.8 + phase);
}

/** Held arrow / WASD keys → hand motion: constant while tracing the seam, else a ramp (taps nudge, holds travel). */
export class KeyMotion {
  private held = 0;

  step(dx: number, dy: number, fine: boolean, tracing: boolean, dt: number): Vec {
    if (!dx && !dy) {
      this.held = 0;
      return { x: 0, y: 0 };
    }
    const n = Math.hypot(dx, dy);
    const v = fine ? KEY_SPEED.fine : tracing ? KEY_SPEED.trace : lerp(KEY_SPEED.start, KEY_SPEED.max, clamp(this.held / KEY_SPEED.ramp, 0, 1));
    this.held += dt;
    return { x: (dx / n) * v * dt, y: (dy / n) * v * dt };
  }

  reset(): void {
    this.held = 0;
  }
}

export class SteadyEngine {
  readonly tune: Tune;
  readonly assist: boolean;
  readonly rm: boolean;
  /** Sway phases φ0..φ5 (φ0 also shapes the vessel). */
  readonly phases: number[];
  t = 0;
  beat = 0;
  station = 0;
  step: Step = 'card';
  stepAt = 0;
  ended = false;
  score = 0;
  hand: Vec = { x: 14, y: 50 };
  tip: Vec = { x: 14, y: 50 };
  /** Hand speed (u/s): net travel over the last 0.25 s. */
  speed = 0;
  /** Hand faster than the stitch pace limit while tracing. */
  rushing = false;
  counts: Record<StationId, Record<Grade, number>> = {
    close: { top: 0, good: 0, ok: 0 }, scope: { top: 0, good: 0, ok: 0 }, place: { top: 0, good: 0, ok: 0 },
  };
  stationScore = [0, 0, 0];
  rushed = 0;
  seams = 0;
  watertight = 0;
  cleanHolds = 0;
  sets = 0;
  cleanSets = 0;
  // ── station 1: close the seam ──
  seam: Seam | null = null;
  progress = 0;
  /** Tip's distance from the seam near the needle (Infinity between seams). */
  seamDist = Infinity;
  /** Seconds the tip has been off the seam. */
  offFor = 0;
  /** Gap between seams (s). */
  seamWait = 0;
  /** Finished seams, faded on the pad (the last 3). */
  doneSeams: DoneSeam[] = [];
  /** Sakura stickers on watertight knots. */
  stickers: Vec[] = [];
  // ── station 2: under the scope ──
  target: ScopeTarget | null = null;
  holdsDone = 0;
  knots: Knot[] = [];
  // ── station 3: electrodes ──
  marks: PlaceMark[] = [];
  /** The contact on its soft lead. */
  carry: Lead = { x: 50, y: 82, vx: 0, vy: 0 };
  /** Dwell ring 0..1 on the next mark. */
  dwell = 0;
  placeWait = 0;
  /** Monitor strip: one channel per contact of the current set. */
  channels: (Grade | null)[] = [null, null, null, null];
  private fx: SFx[] = [];
  private rand: () => number;
  private lastT = 0;
  private trail: { t: number; x: number; y: number }[] = [];
  private offWarned = false;
  private swingWarned = false;
  private dwellSum = { t: 0, x: 0, y: 0 };

  constructor(seed: number, assist: boolean, reduceMotion = false) {
    this.rand = rng(seed);
    this.assist = assist;
    this.rm = reduceMotion;
    this.tune = assist ? ASSIST : NORMAL;
    this.phases = Array.from({ length: 6 }, () => this.rand() * TAU);
    this.beginStation(0);
  }

  get id(): StationId {
    return STATIONS[clamp(this.station, 0, 2)];
  }

  /** Seconds left on the current station's clock; null on title cards, wraps and after the end. */
  timeLeft(): number | null {
    return this.step === 'work' ? clamp(workStart(this.station) + WORK_SECONDS - this.t, 0, WORK_SECONDS) : null;
  }

  /** 0 = lungs full (most sway) … 1 = calm exhale. Each station's work starts on an exhale; continuous everywhere. */
  calm(t: number): number {
    const period = this.tune.breathPeriod;
    if (t < CARD_SECONDS) return breathCalm(frac((t - CARD_SECONDS) / period));
    const ph = phaseAt(t);
    if (ph.step === 'work') return breathCalm(frac((t - ph.start) / period));
    // Wrap + next card: one slow inhale from wherever the station ended down to the next exhale.
    const end = ph.step === 'card' ? workStart(ph.station - 1) + WORK_SECONDS : workStart(ph.station) + WORK_SECONDS;
    const c0 = breathCalm(frac(WORK_SECONDS / period));
    return c0 * (1 - smooth((t - end) / (WRAP_SECONDS + CARD_SECONDS)));
  }

  /** True while breathing out (the gauge reads OUT). */
  exhaling(t: number): boolean {
    const ph = phaseAt(t);
    return ph.step === 'work' && frac((t - ph.start) / this.tune.breathPeriod) < 0.6;
  }

  /** The tip's sway (tray units) at time t; it shrinks to 30 % on the exhale. No jitter with Reduce Motion. */
  tremor(t: number): Vec {
    const [drift, jitter] = this.tune.sway[this.id];
    const amp = lerp(1, this.tune.calmFloor, this.calm(t));
    const j = this.rm ? 0 : jitter;
    const p = this.phases;
    return {
      x: amp * (drift * (0.6 * Math.sin(TAU * 0.21 * t + p[0]) + 0.4 * Math.sin(TAU * 0.37 * t + p[1])) + j * Math.sin(TAU * 4.3 * t + p[2])),
      y: amp * (drift * (0.6 * Math.sin(TAU * 0.17 * t + p[3]) + 0.4 * Math.sin(TAU * 0.43 * t + p[4])) + j * Math.sin(TAU * 5.1 * t + p[5])),
    };
  }

  /** Vessel pulse 0..1: a quick bump on each beat of the song. 0 with Reduce Motion. */
  pulse(): number {
    if (this.rm) return 0;
    const u = frac(this.beat);
    return u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0;
  }

  /** Where the scope target is right now (it rides the pulse along the vessel's normal). */
  targetPos(): Vec | null {
    const g = this.target;
    if (!g) return null;
    const k = this.tune.scope.pulse * Math.min(1.6, 1 + 0.1 * this.holdsDone) * this.pulse();
    return { x: g.base.x + g.nx * k, y: g.base.y + g.ny * k };
  }

  /** The next electrode mark to set (null between sets). */
  nextMark(): PlaceMark | null {
    if (this.id !== 'place') return null;
    return this.marks.find((m) => !m.grade) ?? null;
  }

  takeFx(): SFx[] {
    const out = this.fx;
    this.fx = [];
    return out;
  }

  update(t: number, input: Input = {}): void {
    if (this.ended) return;
    const dt = clamp(t - this.lastT, 0, 0.1);
    this.lastT = t;
    this.t = t;
    this.beat = input.beat !== undefined && Number.isFinite(input.beat) ? input.beat : t * BEATS_PER_SECOND;
    this.advance(t);
    if (this.ended) return;
    this.moveHand(t, input);
    if (this.id === 'place') this.swingLead(dt);
    const working = this.step === 'work';
    this.setRushing(working && this.id === 'close' && this.speed > this.tune.close.rush);
    if (!working) return;
    if (this.id === 'close') this.updateClose(dt);
    else if (this.id === 'scope') this.updateScope(dt);
    else this.updatePlace(dt);
  }

  stats(): Record<string, number> {
    const c = this.counts;
    const ids = ['close', 'scope', 'place'] as const;
    const all = ids.reduce((a, id) => a + c[id].top + c[id].good + c[id].ok, 0);
    const q = ids.reduce((a, id) => a + c[id].top * 100 + c[id].good * 60 + c[id].ok * 25, 0);
    return {
      precision: all ? Math.round(q / all) : 0,
      stitches: c.close.top + c.close.good + c.close.ok, neat: c.close.top, loose: c.close.ok, rushed: this.rushed,
      seams: this.seams, watertight: this.watertight,
      holds: c.scope.top + c.scope.good + c.scope.ok, steady: c.scope.top, clean: this.cleanHolds,
      contacts: c.place.top + c.place.good + c.place.ok, perfect: c.place.top, sets: this.sets, cleanSets: this.cleanSets,
      s1: this.stationScore[0], s2: this.stationScore[1], s3: this.stationScore[2],
    };
  }

  // ── timeline ──

  /** Walk the timeline forward one step at a time, so no transition (and its fx) is ever skipped. */
  private advance(t: number): void {
    const ph = phaseAt(t);
    const goal = order(ph.station, ph.step);
    while (!this.ended && order(this.station, this.step) < goal) {
      if (this.step === 'card') {
        this.step = 'work';
        this.stepAt = workStart(this.station);
        this.fx.push({ kind: 'work', station: this.id });
      } else if (this.step === 'work') {
        this.step = 'wrap';
        this.stepAt = workStart(this.station) + WORK_SECONDS;
        this.setRushing(false);
        this.fx.push({ kind: 'wrap', station: this.id });
      } else if (this.station < 2) {
        this.beginStation(this.station + 1);
      } else {
        this.step = 'done';
        this.stepAt = RUN_SECONDS;
        this.ended = true;
        this.fx.push({ kind: 'end' });
      }
    }
  }

  private beginStation(i: number): void {
    this.station = i;
    this.step = 'card';
    this.stepAt = i * ROUND_SECONDS;
    this.trail = [];
    this.speed = 0;
    this.rushing = false;
    const id = STATIONS[i];
    if (id === 'close') {
      this.seam = makeSeam(this.rand, { x: 14, y: lerp(35, 65, this.rand()) }, 1, this.tune.close.spacing, 0);
      this.progress = 0;
      this.hand = { ...this.seam.pts[0] };
    } else if (id === 'scope') {
      this.seam = null;
      this.hand = { x: 50, y: 50 };
      this.target = this.newTarget(null);
    } else {
      this.target = null;
      this.hand = { x: 50, y: 82 };
      this.marks = this.newSet();
      this.carry = { x: 50, y: 82, vx: 0, vy: 0 };
    }
    this.tip = { ...this.hand };
    this.fx.push({ kind: 'card', station: id, index: i });
  }

  private moveHand(t: number, input: Input): void {
    if (input.abs) this.hand = { x: input.abs.x, y: input.abs.y };
    if (input.delta) this.hand = { x: this.hand.x + input.delta.x, y: this.hand.y + input.delta.y };
    this.hand.x = clamp(this.hand.x, -4, 104);
    this.hand.y = clamp(this.hand.y, -4, 104);
    this.trail.push({ t, x: this.hand.x, y: this.hand.y });
    while (this.trail.length > 2 && this.trail[1].t <= t - SPEED_WINDOW) this.trail.shift();
    const old = this.trail[0];
    this.speed = Math.hypot(this.hand.x - old.x, this.hand.y - old.y) / Math.max(0.1, t - old.t);
    const sw = this.tremor(t);
    this.tip = { x: this.hand.x + sw.x, y: this.hand.y + sw.y };
  }

  private setRushing(on: boolean): void {
    if (on && !this.rushing) this.fx.push({ kind: 'rush' });
    this.rushing = on;
  }

  private award(id: StationId, g: Grade, x: number, y: number, extra: { rushed?: boolean; clean?: boolean } = {}, points = POINTS[id][g]): void {
    this.counts[id][g] += 1;
    this.add(points);
    this.fx.push({ kind: 'grade', station: id, grade: g, x, y, ...extra });
  }

  private add(points: number): void {
    this.score += points;
    this.stationScore[this.station] += points;
  }

  // ── station 1: close the seam ──

  private updateClose(dt: number): void {
    const c = this.tune.close;
    if (this.seamWait > 0) {
      this.seamDist = Infinity;
      this.seamWait -= dt;
      if (this.seamWait <= 0 && this.seam) {
        const end = this.seam.pts[this.seam.pts.length - 1];
        this.seam = makeSeam(this.rand, end, this.seam.dir > 0 ? -1 : 1, c.spacing, this.seams);
        this.progress = 0;
        this.offFor = 0;
        this.offWarned = false;
      }
      return;
    }
    const seam = this.seam;
    if (!seam) return;
    const pr = project(seam, this.tip, Math.max(0, this.progress - 3), Math.min(seam.len, this.progress + 8));
    this.seamDist = pr.d;
    if (pr.d > c.capture) {
      this.offFor += dt;
      if (this.offFor >= OFF_HINT_SECONDS && !this.offWarned) {
        this.offWarned = true;
        this.fx.push({ kind: 'off' });
      }
      return;
    }
    this.offFor = 0;
    if (pr.s <= this.progress) return;
    const from = this.progress;
    // The thread pulls through no faster than the stitch pace limit, so the needle can't outrun it: a hand that races
    // ahead leaves the stitching behind and soon loses the seam. Scrubbing (or flick-and-wait) buys no extra stitches.
    this.progress = Math.min(pr.s, from + c.pull * dt);
    for (const m of seam.marks) {
      if (m.grade || m.s <= from || m.s > this.progress) continue;
      const rushed = this.rushing;
      const g: Grade = rushed ? 'ok' : pr.d <= c.neat ? 'top' : pr.d <= c.good ? 'good' : 'ok';
      if (rushed) this.rushed += 1;
      m.grade = g;
      m.rushed = rushed;
      this.award('close', g, m.x, m.y, { rushed }, rushed ? RUSHED_POINTS : POINTS.close[g]);
    }
    if (this.progress >= seam.len - 0.6) {
      this.seams += 1;
      const tight = seam.marks.every((m) => m.grade && m.grade !== 'ok');
      // a closure bonus only for an unhurried seam: loose stitches off the line are forgiven, rushed ones aren't
      const points = tight ? BONUS.watertight : seam.marks.some((m) => m.rushed) ? 0 : BONUS.closed;
      if (tight) this.watertight += 1;
      this.add(points);
      const end = seam.pts[seam.pts.length - 1];
      if (tight) this.stickers.push({ ...end });
      this.doneSeams.push({ pts: seam.pts, marks: seam.marks, watertight: tight });
      if (this.doneSeams.length > 3) this.doneSeams.shift();
      this.fx.push({ kind: 'bonus', id: tight ? 'watertight' : 'closed', x: end.x, y: end.y, points });
      this.seamWait = 0.6;
    }
  }

  // ── station 2: under the scope ──

  private newTarget(prev: Vec | null): ScopeTarget {
    let x = 50;
    for (let k = 0; k < 12; k++) {
      x = lerp(18, 82, this.rand());
      if (!prev || Math.abs(x - prev.x) >= 22) break;
    }
    const ph = this.phases[0];
    const y = vesselY(x, ph);
    const dy = vesselY(x + 0.5, ph) - vesselY(x - 0.5, ph);
    const l = Math.hypot(1, dy);
    return { base: { x, y }, nx: -dy / l, ny: 1 / l, fill: 0, sumD: 0, sumT: 0, left: false, wait: 0 };
  }

  private updateScope(dt: number): void {
    const s = this.tune.scope;
    const g = this.target;
    if (!g) return;
    if (g.wait > 0) {
      g.wait -= dt;
      if (g.wait <= 0) this.target = this.newTarget(g.base);
      return;
    }
    const p = this.targetPos()!;
    const d = Math.hypot(this.tip.x - p.x, this.tip.y - p.y);
    if (d <= s.ring) {
      g.fill += dt / s.fill;
      g.sumD += d * dt;
      g.sumT += dt;
    } else if (g.fill > 0) {
      g.left = true;
      g.fill = Math.max(0, g.fill - s.drain * dt);
    }
    if (g.fill >= 1) {
      const mean = g.sumD / Math.max(1e-6, g.sumT);
      const grade: Grade = mean <= s.steady ? 'top' : mean <= s.good ? 'good' : 'ok';
      const clean = !g.left;
      this.award('scope', grade, p.x, p.y, { clean });
      if (clean) {
        this.cleanHolds += 1;
        this.add(BONUS.clean);
      }
      this.knots.push({ x: g.base.x, y: g.base.y, grade });
      if (this.knots.length > 16) this.knots.shift();
      this.holdsDone += 1;
      g.fill = 1;
      g.wait = 0.35;
    }
  }

  // ── station 3: electrodes ──

  private newSet(): PlaceMark[] {
    const r = this.rand;
    const cx = lerp(44, 56, r());
    const cy = lerp(44, 54, r());
    const tight = Math.min(3, this.sets) * 1.5;
    const dx = lerp(10, 15, r()) - tight;
    const dy = lerp(8, 12, r()) - tight;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    this.channels = [null, null, null, null];
    this.swingWarned = false;
    return corners.map(([sx, sy], i) => ({ x: cx + sx * dx + lerp(-2, 2, r()), y: cy + sy * dy + lerp(-2, 2, r()), n: i + 1 }));
  }

  /** The soft lead: the contact trails the tip on a damped spring (4 substeps). */
  private swingLead(dt: number): void {
    const p = this.tune.place;
    const c = this.carry;
    const k = p.k;
    const damp = 2 * p.zeta * Math.sqrt(k);
    const h = dt / 4;
    for (let i = 0; i < 4; i++) {
      c.vx += (k * (this.tip.x - c.x) - damp * c.vx) * h;
      c.vy += (k * (this.tip.y - c.y) - damp * c.vy) * h;
      c.x += c.vx * h;
      c.y += c.vy * h;
    }
  }

  private resetDwell(): void {
    this.dwell = 0;
    this.dwellSum = { t: 0, x: 0, y: 0 };
  }

  private updatePlace(dt: number): void {
    const p = this.tune.place;
    if (this.placeWait > 0) {
      this.placeWait -= dt;
      if (this.placeWait <= 0 && this.marks.every((m) => m.grade)) this.marks = this.newSet();
      return;
    }
    const next = this.marks.find((m) => !m.grade);
    if (!next) return;
    const c = this.carry;
    const d = Math.hypot(c.x - next.x, c.y - next.y);
    const still = this.speed < p.still;
    if (!this.swingWarned && still && d <= 2 * p.capture && Math.hypot(c.vx, c.vy) > 25) {
      this.swingWarned = true;
      this.fx.push({ kind: 'swing' });
    }
    if (d <= p.capture && still) {
      this.dwell += dt / p.dwell;
      this.dwellSum.t += dt;
      this.dwellSum.x += c.x * dt;
      this.dwellSum.y += c.y * dt;
    } else {
      this.dwell = Math.max(0, this.dwell - (2 * dt) / p.dwell);
      if (this.dwell === 0) this.resetDwell();
    }
    if (this.dwell < 1) return;
    const ds = this.dwellSum;
    const at = { x: ds.x / ds.t, y: ds.y / ds.t };
    const off = Math.hypot(at.x - next.x, at.y - next.y);
    const g: Grade = off <= p.perfect ? 'top' : off <= p.good ? 'good' : 'ok';
    next.grade = g;
    next.at = at;
    this.channels[next.n - 1] = g;
    this.award('place', g, next.x, next.y);
    this.resetDwell();
    this.placeWait = 0.3;
    if (this.marks.every((m) => m.grade)) {
      this.sets += 1;
      const clean = this.marks.every((m) => m.grade !== 'ok');
      const points = clean ? BONUS.cleanSignal : BONUS.signal;
      if (clean) this.cleanSets += 1;
      this.add(points);
      this.fx.push({ kind: 'bonus', id: clean ? 'clean_signal' : 'signal', x: 50, y: 12, points });
      this.placeWait = 0.6;
    }
  }
}
