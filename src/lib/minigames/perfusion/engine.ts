// Swinus Rhythms rules (id 'perfusion'; GAME_DESIGN.md §9): rhythm on a scrolling ECG. Beat = tap on the spike, Drain = hold,
// Skip = flat line (don't tap). Three phases shown as heart rates 72/96/120. Perfusion meter starts at 70:
// Perfect ±50 ms +3, Good ±110 ms +1, Miss −6; under 30 it is ISCHEMIA (no fail state).
// Times are song seconds on mini_perfusion's steady 96 BPM grid: a 2-bar count-in, then 8-bar phases at 5/25/45 s.
import { clamp, rng } from '../common/pixel';

export type NoteType = 'beat' | 'drain' | 'skip';
export type Grade = 'perfect' | 'good' | 'miss' | 'ok' | 'broken';

export interface Note { id: number; t: number; type: NoteType; end: number; phase: number }
export interface ChartPhase { bpm: number; hr: number; start: number; end: number; label: string; line: string }
export interface Chart { notes: Note[]; phases: ChartPhase[]; end: number }

/**
 * The chart rides the song mini_perfusion: a steady 96 BPM lub-dub (every beat has a kick). The "heart rate" the
 * monitor shows climbs 72 → 96 → 120, and the notes get denser instead of the tempo changing: every other beat,
 * then every beat, then every beat with off-beat double taps.
 */
export const PLAN = {
  countInBpm: 96,
  firstBeat: 8,
  gapBeats: 0,
  phases: [
    { bpm: 96, hr: 72, beats: 32, step: 2, doubles: 0, label: 'RESTING 72', line: 'Resting rate. Seventy-two. Based.' },
    { bpm: 96, hr: 96, beats: 32, step: 1, doubles: 0, label: 'ELEVATED 96', line: 'Ninety-six. Getting interesting.' },
    { bpm: 96, hr: 120, beats: 32, step: 1, doubles: 0.3, label: 'CARDIO 120', line: 'One-twenty! Hold that perfusion!' },
  ],
} as const;

export function makeChart(seed: number): Chart {
  const rand = rng(seed);
  const notes: Note[] = [];
  const phases: ChartPhase[] = [];
  let t = PLAN.firstBeat * (60 / PLAN.countInBpm);
  const drainP = [0.12, 0.15, 0.15];
  const skipP = [0.08, 0.12, 0.14];
  PLAN.phases.forEach((p, pi) => {
    const spb = 60 / p.bpm;
    const start = t;
    let prev: NoteType | null = null;
    for (let i = 0; i < p.beats; ) {
      const at = start + i * spb;
      let type: NoteType = 'beat';
      let len = 1;
      if (pi === 0 && i < 4) type = 'beat';
      else if (i < p.beats - 3 && prev !== 'drain' && rand() < drainP[pi]) {
        type = 'drain';
        len = pi === 2 && rand() < 0.4 ? 3 : 2;
      } else if (i > 1 && prev === 'beat' && rand() < skipP[pi]) type = 'skip';
      const span = len * p.step; // beats this note occupies
      notes.push({ id: notes.length, t: at, type, end: type === 'drain' ? at + (span - 0.5) * spb : at, phase: pi });
      prev = type;
      // Cardio: an off-beat double tap after a plain beat.
      if (p.doubles > 0 && type === 'beat' && i + span < p.beats && rand() < p.doubles) {
        notes.push({ id: notes.length, t: at + spb / 2, type: 'beat', end: at + spb / 2, phase: pi });
      }
      i += span;
    }
    const end = start + p.beats * spb;
    phases.push({ bpm: p.bpm, hr: p.hr, start, end, label: p.label, line: p.line });
    t = end + PLAN.gapBeats * spb;
  });
  return { notes, phases, end: phases[phases.length - 1].end + 1.2 };
}

export interface PFx {
  kind: 'pop' | 'sfx' | 'bubble' | 'anim';
  text?: string;
  color?: string;
  sfx?: 'heartbeat' | 'monitor_beep' | 'success' | 'whoosh' | 'question';
  anim?: string;
}

const WIN = { perfect: 0.05, good: 0.11 };
const DELTA = { perfect: 3, good: 1, miss: -6, skipOk: 1, drainDone: 2, drainBroken: -3 };

export class PerfusionEngine {
  chart: Chart;
  meter = 70;
  perfect = 0;
  good = 0;
  miss = 0;
  skipsOk = 0;
  drainsDone = 0;
  combo = 0;
  maxCombo = 0;
  credit = 0;
  ended = false;
  ischemic = false;
  holding: Note | null = null;
  grades = new Map<number, Grade>();
  fx: PFx[] = [];
  phaseIdx = -1;
  /** Song time of the last hit-line flash. */
  flashAt = -9;
  private holdCredit = 0;
  private lastT = 0;
  private assist: boolean;

  constructor(seed: number, assist: boolean) {
    this.chart = makeChart(seed);
    this.assist = assist;
  }

  private w(k: 'perfect' | 'good'): number {
    return WIN[k] * (this.assist ? 1.5 : 1);
  }

  private bump(delta: number): void {
    this.meter = clamp(this.meter + delta, 0, 100);
  }

  private grade(n: Note, g: Grade, delta: number, credit: number, text?: string, color?: string): void {
    this.grades.set(n.id, g);
    this.bump(delta);
    this.credit += credit;
    if (g === 'perfect' || g === 'good' || g === 'ok') {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (this.combo > 0 && this.combo % 16 === 0) this.fx.push({ kind: 'bubble', text: 'Perfusion: excellent.' });
    } else this.combo = 0;
    if (text) this.fx.push({ kind: 'pop', text, color });
  }

  press(t: number): Grade | null {
    if (this.ended || this.holding) return null;
    const open = this.chart.notes.filter((n) => !this.grades.has(n.id) && Math.abs(t - n.t) <= this.w('good'));
    const target = open.find((n) => n.type !== 'skip');
    if (target) {
      const d = Math.abs(t - target.t);
      const g: Grade = d <= this.w('perfect') ? 'perfect' : 'good';
      this.flashAt = t;
      if (g === 'perfect') this.perfect += 1;
      else this.good += 1;
      if (target.type === 'drain') {
        this.holding = target;
        this.holdCredit = g === 'perfect' ? 1 : 0.75;
        this.grades.set(target.id, g);
        this.bump(g === 'perfect' ? DELTA.perfect : DELTA.good);
        this.fx.push({ kind: 'pop', text: 'HOLD...', color: '#7fd6ff' }, { kind: 'sfx', sfx: 'whoosh' });
        this.fx.push({ kind: 'bubble', text: 'Draining CSF... pressure normalizing.' });
      } else {
        this.grade(target, g, g === 'perfect' ? DELTA.perfect : DELTA.good, g === 'perfect' ? 1 : 0.75, g === 'perfect' ? 'PERFECT' : 'GOOD', g === 'perfect' ? '#ffd25a' : '#fff6ea');
        this.fx.push({ kind: 'sfx', sfx: 'monitor_beep' });
      }
      return g;
    }
    const skip = open.find((n) => n.type === 'skip');
    if (skip) {
      this.miss += 1;
      this.grade(skip, 'miss', DELTA.miss, 0, 'SKIP IT!', '#ff5a5f');
      this.fx.push({ kind: 'sfx', sfx: 'question' });
      return 'miss';
    }
    return null;
  }

  release(t: number): void {
    const n = this.holding;
    if (!n) return;
    this.holding = null;
    if (t >= n.end - 0.12) this.completeDrain(n);
    else {
      this.combo = 0;
      this.bump(DELTA.drainBroken);
      this.credit += this.holdCredit * 0.5;
      this.grades.set(n.id, 'broken');
      this.fx.push({ kind: 'pop', text: 'PRESSURE SPIKE', color: '#ffb020' });
    }
  }

  private completeDrain(n: Note): void {
    this.drainsDone += 1;
    this.credit += this.holdCredit;
    this.bump(DELTA.drainDone);
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.grades.set(n.id, 'ok');
    this.fx.push({ kind: 'pop', text: 'DRAINED!', color: '#7fd6ff' }, { kind: 'sfx', sfx: 'success' });
  }

  update(t: number): void {
    if (this.ended) return;
    const prev = this.lastT;
    this.lastT = t;
    for (const n of this.chart.notes) {
      // guide heartbeat on every beat (silence on skips: the missing beat is the cue)
      if (n.type !== 'skip' && n.t > prev && n.t <= t) this.fx.push({ kind: 'sfx', sfx: 'heartbeat' });
      if (this.grades.has(n.id)) continue;
      if (t - n.t > this.w('good')) {
        if (n.type === 'skip') this.grade(n, 'ok', DELTA.skipOk, 1, 'STEADY', '#5bd16b');
        else {
          this.miss += 1;
          this.grade(n, 'miss', DELTA.miss, 0, 'MISS', '#ff5a5f');
        }
        if (n.type === 'skip') this.skipsOk += 1;
      }
    }
    if (this.holding && t >= this.holding.end) {
      const n = this.holding;
      this.holding = null;
      this.completeDrain(n);
    }
    const pi = this.chart.phases.findIndex((p) => t >= p.start - 1.2 && t < p.end);
    if (pi >= 0 && pi !== this.phaseIdx) {
      this.phaseIdx = pi;
      this.fx.push({ kind: 'bubble', text: this.chart.phases[pi].line }, { kind: 'anim', anim: pi === 0 ? 'surgical_focus' : 'review_mri' });
    }
    if (!this.ischemic && this.meter < 30) {
      this.ischemic = true;
      this.fx.push({ kind: 'bubble', text: 'ISCHEMIA!' }, { kind: 'anim', anim: 'jump' });
      this.fx.push({ kind: 'bubble', text: 'I mean, oh no. Fix it.' });
    } else if (this.ischemic && this.meter >= 40) this.ischemic = false;
    if (t >= this.chart.end) {
      this.ended = true;
      this.fx.push({ kind: 'anim', anim: 'clinical_success' }, { kind: 'bubble', text: this.meter >= 100 ? 'Perfusion. Restored. Textbook.' : 'Clinical success. Write that down.' });
    }
  }

  /** 0–100 */
  accuracy(): number {
    return Math.round((this.credit / Math.max(1, this.chart.notes.length)) * 1000) / 10;
  }

  score(): number {
    return this.perfect * 100 + this.good * 50 + this.skipsOk * 50 + this.drainsDone * 100;
  }

  stats(): Record<string, number> {
    return {
      accuracy: this.accuracy(), perfusion: Math.round(this.meter), perfect: this.perfect, good: this.good, miss: this.miss,
      drains: this.drainsDone, skips: this.skipsOk, maxCombo: this.maxCombo, notes: this.chart.notes.length,
    };
  }

  takeFx(): PFx[] {
    const out = this.fx;
    this.fx = [];
    return out;
  }
}
