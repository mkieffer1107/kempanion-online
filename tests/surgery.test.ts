import { describe, expect, test } from 'bun:test';
import {
  ASSIST, BEATS_PER_SECOND, BONUS, CARD_SECONDS, KEY_SPEED, KeyMotion, NORMAL, POINTS, ROUND_SECONDS, RUN_SECONDS, RUSHED_POINTS,
  STATIONS, SteadyEngine, WORK_SECONDS, WRAP_SECONDS, makeSeam, phaseAt, pointAt, workStart,
  type SFx, type Seam, type Vec,
} from '../src/lib/minigames/surgery/engine';
import { layout, textScale, toPx, toTray } from '../src/lib/minigames/surgery/render';
import { clamp, rng } from '../src/lib/minigames/common/pixel';
import { MEDAL_TIERS } from '../src/lib/minigames/types';
import { META, RESULT_LINES, resultLine } from '../src/lib/minigames/meta';
import { MINIGAME_IDS as REGISTRY_IDS } from '../src/lib/minigames/types';
import { MEDAL_THRESHOLDS, applyMinigameResult, medalFor, minigameReward, newSave } from '../src/lib/pet';
import { TUNING } from '../src/lib/pet/minigame';
import { MINIGAME_IDS as SCRIPT_IDS } from '../src/lib/vn/validate';
import { LOCATIONS } from '../src/lib/content/locations';
import { ICONS } from '../src/lib/content/icons';

const STAT_KEYS = ['precision', 'stitches', 'neat', 'loose', 'rushed', 'seams', 'watertight', 'holds', 'steady', 'clean', 'contacts', 'perfect', 'sets', 'cleanSets', 's1', 's2', 's3'];
const DT = 1 / 60;
const SEEDS = [1, 2, 3, 4, 5, 6].map((s) => s * 7919);

// ───────────────────────── simulated players (the design's calibration bots) ─────────────────────────

interface Bot {
  /** Share of the sway the player cancels. */
  comp: number;
  /** Seconds behind the sway. */
  lag: number;
  /** Own hand wobble (tray units). */
  noise: number;
  /** Share of the stitch pace limit while tracing. */
  pace: number;
  /** Chance per second of a 1 s burst at 1.8× the limit. */
  rush: number;
  /** Units/s between targets. */
  travel: number;
  trackPulse: boolean;
  snap?: boolean;
  idle?: boolean;
  /** How the seam is traced (default 'chase': at the pace, never more than 4 ahead of the stitching). 'scrub' sweeps
   *  back and forth over the stitching without waiting for it; 'flick' jumps 7.5 ahead and waits for the stitching to
   *  catch up; 'dash' is stop-and-go: at the pace to just short of the next blossom, then through it under the limit. */
  s1?: 'chase' | 'scrub' | 'flick' | 'dash';
}

const PERFECT: Bot = { comp: 1, lag: 0, noise: 0, pace: 0.9, rush: 0, travel: 60, trackPulse: true, snap: true };
const AVERAGE: Bot = { comp: 0.35, lag: 0.35, noise: 0.9, pace: 0.75, rush: 0.06, travel: 25, trackPulse: false };
const GOOD: Bot = { comp: 0.6, lag: 0.25, noise: 0.6, pace: 0.8, rush: 0.02, travel: 30, trackPulse: false };
const RUSHER: Bot = { comp: 0, lag: 0, noise: 1.0, pace: 2.0, rush: 0, travel: 60, trackPulse: false };
const IDLE: Bot = { comp: 0, lag: 0, noise: 0, pace: 0, rush: 0, travel: 0, trackPulse: false, idle: true };

interface Run { e: SteadyEngine; stats: Record<string, number>; fx: { t: number; f: SFx; speed: number }[]; seams: Seam[] }

function play(bot: Bot, seed: number, assist: boolean, reduceMotion = false): Run {
  const e = new SteadyEngine(seed, assist, reduceMotion);
  const tune = assist ? ASSIST : NORMAL;
  let rs = seed * 7 + 3;
  const r = () => ((rs = (rs * 1103515245 + 12345) >>> 0) / 4294967296);
  const NF = [0.6, 1.1, 1.7, 2.6];
  const ph = Array.from({ length: 8 }, () => r() * Math.PI * 2);
  const fx: Run['fx'] = [];
  const seams: Seam[] = [];
  let aimS = 0;
  let scrubDir = 1;
  let rushUntil = -1;
  let hand: Vec = { ...e.hand };
  let lastStation = -1;
  let lastSeam: Seam | null = null;
  for (let t = 0; t < 120 && !e.ended; t += DT) {
    if (e.station !== lastStation) {
      lastStation = e.station;
      hand = { ...e.hand };
      aimS = 0;
    }
    let n = { x: 0, y: 0 };
    for (let i = 0; i < 4; i++) {
      n.x += bot.noise * 0.7 * Math.sin(2 * Math.PI * NF[i] * t + ph[i]);
      n.y += bot.noise * 0.7 * Math.sin(2 * Math.PI * NF[i] * 1.13 * t + ph[i + 4]);
    }
    n = { x: n.x / Math.SQRT2, y: n.y / Math.SQRT2 };
    const tr = e.tremor(t - bot.lag);
    const comp = { x: -bot.comp * tr.x, y: -bot.comp * tr.y };
    let goal: Vec = { ...hand };
    const tracing = e.step === 'work' && e.id === 'close' && !!e.seam;
    if (bot.idle) goal = hand;
    else if (tracing && e.seam) {
      const seam = e.seam;
      if (seam !== lastSeam) {
        lastSeam = seam;
        aimS = 0;
        scrubDir = 1;
      }
      if (bot.rush > 0 && r() < bot.rush * DT) rushUntil = t + 1;
      const v = tune.close.rush * bot.pace * (t < rushUntil ? 1.8 : 1);
      if (bot.s1 === 'scrub') {
        aimS += scrubDir * v * DT;
        if (aimS >= Math.min(seam.len, e.progress + 10)) scrubDir = -1;
        if (aimS <= e.progress - 2) scrubDir = 1;
        aimS = clamp(aimS, 0, seam.len);
      } else if (bot.s1 === 'flick') {
        if (aimS - e.progress < 1) aimS = Math.min(e.progress + 7.5, seam.len);
      } else if (bot.s1 === 'dash') {
        const next = seam.marks.find((m) => !m.grade && m.s > e.progress);
        if (next && aimS < next.s - 4.5) aimS = Math.min(aimS + v * DT, next.s - 4.5, e.progress + 7.5);
        else aimS = Math.min(aimS + tune.close.rush * 0.9 * DT, e.progress + 7.5, seam.len);
      } else aimS = Math.min(aimS + v * DT, e.progress + 4, seam.len);
      const p = pointAt(seam, aimS);
      hand = { x: p.x + comp.x, y: p.y + comp.y };
    } else if (e.step === 'work' && e.id === 'scope' && e.target) {
      const p = bot.trackPulse ? e.targetPos()! : e.target.base;
      goal = { x: p.x + comp.x, y: p.y + comp.y };
    } else if (e.step === 'work' && e.id === 'place') {
      const m = e.nextMark();
      if (m) goal = { x: m.x + comp.x, y: m.y + comp.y };
    }
    if (!tracing && !bot.idle) {
      const dx = goal.x - hand.x;
      const dy = goal.y - hand.y;
      const d = Math.hypot(dx, dy);
      const vmax = d > 6 ? bot.travel : Math.max(3, bot.travel * (d / 6) * 0.5);
      const step = Math.min(d, vmax * DT);
      if (d > 1e-6) hand = { x: hand.x + (dx / d) * step, y: hand.y + (dy / d) * step };
      if (bot.snap && d < 3) hand = goal;
    }
    e.update(t, { abs: { x: hand.x + n.x, y: hand.y + n.y } });
    if (e.seam && seams[seams.length - 1] !== e.seam) seams.push(e.seam);
    for (const f of e.takeFx()) fx.push({ t, f, speed: e.speed });
  }
  return { e, stats: e.stats(), fx, seams };
}

/** A keyboard player: holds 8-way keys through the real KeyMotion, Shift (fine) within 2 units of the aim. */
function playKeys(seed: number, assist: boolean, comp = 1, react = 0.2): Record<string, number> {
  const e = new SteadyEngine(seed, assist);
  const km = new KeyMotion();
  const hist: { t: number; sway: Vec }[] = [];
  for (let t = 0; t < 120 && !e.ended; t += DT) {
    hist.push({ t, sway: { x: e.tip.x - e.hand.x, y: e.tip.y - e.hand.y } });
    while (hist.length > 2 && hist[1].t <= t - react) hist.shift();
    const sway = hist[0].sway;
    let aim: Vec | null = null;
    if (e.step === 'work' && e.id === 'close' && e.seam) aim = pointAt(e.seam, Math.min(e.progress + 2.2, e.seam.len));
    else if (e.step === 'work' && e.id === 'scope' && e.target) aim = e.target.base;
    else if (e.step === 'work' && e.id === 'place') aim = e.nextMark();
    let kx = 0;
    let ky = 0;
    let fine = false;
    if (aim) {
      const dx = aim.x - comp * sway.x - e.hand.x;
      const dy = aim.y - comp * sway.y - e.hand.y;
      kx = Math.abs(dx) > 0.4 ? Math.sign(dx) : 0;
      ky = Math.abs(dy) > 0.4 ? Math.sign(dy) : 0;
      fine = e.id !== 'close' && Math.hypot(dx, dy) < 2;
    }
    e.update(t, { delta: km.step(kx, ky, fine, e.id === 'close', DT) });
    e.takeFx();
  }
  return { score: e.score, ...e.stats() };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const medal = (score: number) => medalFor('surgery', { score, stats: {} });

// ───────────────────────── tests ─────────────────────────

describe('Steady Hoof: timeline', () => {
  test('cards and wraps have no clock; work counts 24 → 0; the run ends at 79.2 s with every stats key', () => {
    expect(ROUND_SECONDS).toBeCloseTo(CARD_SECONDS + WORK_SECONDS + WRAP_SECONDS, 9);
    expect(RUN_SECONDS).toBeCloseTo(3 * ROUND_SECONDS, 9);
    const e = new SteadyEngine(42, false);
    const steps = new Set<string>();
    let endedAt = -1;
    let prevLeft: number | null = null;
    for (let t = 0; t < 90; t += DT) {
      e.update(t, {});
      if (e.ended) {
        endedAt = t;
        break;
      }
      steps.add(`${e.station}:${e.step}`);
      const left = e.timeLeft();
      if (e.step === 'work') {
        expect(left).not.toBeNull();
        expect(left!).toBeGreaterThanOrEqual(0);
        expect(left!).toBeLessThanOrEqual(WORK_SECONDS);
        if (prevLeft !== null) expect(left!).toBeLessThanOrEqual(prevLeft + 1e-9);
        prevLeft = left;
      } else {
        expect(left).toBeNull();
        prevLeft = null;
      }
    }
    expect([...steps]).toEqual(['0:card', '0:work', '0:wrap', '1:card', '1:work', '1:wrap', '2:card', '2:work', '2:wrap']);
    expect(Math.abs(endedAt - RUN_SECONDS)).toBeLessThan(0.1);
    expect(e.step).toBe('done');
    expect(e.timeLeft()).toBeNull();
    expect(Object.keys(e.stats()).sort()).toEqual([...STAT_KEYS].sort());
    // the work clock starts full and runs out
    expect(phaseAt(workStart(1) + 0.001)).toEqual({ station: 1, step: 'work', start: workStart(1) });
    const f = new SteadyEngine(1, false);
    f.update(workStart(0) + 0.01, {});
    expect(f.timeLeft()!).toBeCloseTo(WORK_SECONDS - 0.01, 6);
  });

  test('fx walk the whole timeline in order, even across a long frame', () => {
    const e = new SteadyEngine(7, false);
    const kinds: string[] = [];
    for (const t of [0, 0.5, 5, 30, 30.1, 60, 79.3]) {
      e.update(t, {});
      for (const f of e.takeFx()) if (f.kind === 'card' || f.kind === 'work' || f.kind === 'wrap' || f.kind === 'end') kinds.push(`${f.kind}${'station' in f ? `:${f.station}` : ''}`);
    }
    expect(kinds).toEqual(['card:close', 'work:close', 'wrap:close', 'card:scope', 'work:scope', 'wrap:scope', 'card:place', 'work:place', 'wrap:place', 'end']);
  });
});

describe('Steady Hoof: scoring and medals', () => {
  test('an idle hand earns (almost) nothing and no medal', () => {
    for (const seed of SEEDS.slice(0, 3)) {
      const { e } = play(IDLE, seed, false);
      expect(e.score).toBeLessThan(200);
      expect(medal(e.score)).toBe('none');
    }
  });

  test('a perfect hand takes gold with ≥ 95 % precision', () => {
    const runs = SEEDS.map((s) => play(PERFECT, s, false));
    for (const { e, stats } of runs) {
      expect(medal(e.score)).toBe('gold');
      expect(stats.precision).toBeGreaterThanOrEqual(95);
      expect(stats.seams).toBeGreaterThanOrEqual(2);
      expect(stats.holds).toBeGreaterThanOrEqual(6);
      expect(stats.sets).toBeGreaterThanOrEqual(2);
    }
  });

  test('the needle can’t outrun the thread: the seam closes no faster than the stitch pace limit', () => {
    for (const assist of [false, true]) {
      const tune = assist ? ASSIST : NORMAL;
      expect(tune.close.pull).toBeLessThanOrEqual(tune.close.rush);
      // a hand that keeps leaping to the far edge of the stitching window (7 ahead) every frame
      const e = new SteadyEngine(17, assist, true);
      let fastest = 0;
      for (let t = 0; t < workStart(0) + 8; t += DT) {
        const seam = e.seam!;
        const before = e.progress;
        e.update(t, { abs: e.step === 'work' ? pointAt(seam, Math.min(seam.len, e.progress + 7)) : seam.pts[0] });
        if (e.seam === seam && e.progress > before) fastest = Math.max(fastest, (e.progress - before) / DT);
        e.takeFx();
      }
      expect(fastest).toBeGreaterThan(tune.close.pull * 0.99);
      expect(fastest).toBeLessThanOrEqual(tune.close.pull * 1.0001);
      expect(e.stats().stitches).toBeGreaterThan(3);
    }
  });

  test('rushing never pays: chasing or scrubbing the seam at 2×, 4× and 8× the pace limit', () => {
    // the suite's rusher (no sway control) stays at bronze or below; a good hand that rushes the seam stays at silver
    // or below; and either way the seam station scores less than the same hand tracing it carefully
    for (const [hand, cap] of [[RUSHER, 'bronze'], [GOOD, 'silver']] as const) {
      const careful = mean(SEEDS.map((s) => play({ ...hand, pace: 0.8, rush: 0 }, s, false).stats.s1));
      for (const s1 of ['chase', 'scrub'] as const) {
        for (const pace of [2, 4, 8]) {
          const runs = SEEDS.map((s) => play({ ...hand, pace, rush: 0, s1 }, s, false));
          for (const { e, stats, fx } of runs) {
            expect(MEDAL_TIERS.indexOf(medal(e.score))).toBeLessThanOrEqual(MEDAL_TIERS.indexOf(cap));
            expect(stats.rushed).toBeGreaterThan(0);
            for (const { f } of fx) if (f.kind === 'grade' && f.rushed) expect(f.grade).toBe('ok');
          }
          expect(mean(runs.map((r) => r.stats.s1))).toBeLessThan(careful);
        }
      }
    }
  });

  test('stop-and-go doesn’t beat steady tracing: flick-and-wait and dash-then-creep', () => {
    const careful = mean(SEEDS.map((s) => play({ ...GOOD, rush: 0 }, s, false).stats.s1));
    for (const s1 of ['flick', 'dash'] as const) {
      const fast = mean(SEEDS.map((s) => play({ ...GOOD, pace: 6, rush: 0, s1 }, s, false).stats.s1));
      expect(fast).toBeLessThan(careful);
    }
  });

  test('a rushed stitch is LOOSE and worth 2; its seam closes without a bonus; an unhurried loose seam still pays', () => {
    const tally = { rushedSeams: 0, looseSeams: 0 };
    /** Re-adds the seam station's score from its fx, checking each seam's bonus against its stitches. */
    const audit = (fx: SFx[], s1: number) => {
      let sum = 0;
      let rushedHere = false;
      let looseHere = false;
      for (const f of fx) {
        if (f.kind === 'grade' && f.station === 'close') {
          if (f.rushed) expect(f.grade).toBe('ok');
          rushedHere ||= !!f.rushed;
          looseHere ||= f.grade === 'ok' && !f.rushed;
          sum += f.rushed ? RUSHED_POINTS : POINTS.close[f.grade];
        } else if (f.kind === 'bonus' && (f.id === 'watertight' || f.id === 'closed')) {
          if (rushedHere) {
            expect(f).toMatchObject({ id: 'closed', points: 0 });
            tally.rushedSeams += 1;
          } else if (f.id === 'closed') {
            expect(looseHere).toBe(true);
            expect(f.points).toBe(BONUS.closed);
            tally.looseSeams += 1;
          } else expect(f.points).toBe(BONUS.watertight);
          sum += f.points;
          rushedHere = false;
          looseHere = false;
        }
      }
      expect(sum).toBe(s1);
    };
    // a hand that bursts over the limit now and then
    for (const seed of SEEDS) {
      const { fx, stats } = play({ ...AVERAGE, rush: 0.25 }, seed, false);
      audit(fx.map((x) => x.f), stats.s1);
    }
    // a calm hand at 10 u/s that traces a little to the side of the line: loose stitches, none rushed
    for (const seed of SEEDS.slice(0, 2)) {
      const e = new SteadyEngine(seed, false, true);
      const fx: SFx[] = [];
      let aim = 0;
      let seamRef: Seam | null = null;
      for (let t = 0; t < ROUND_SECONDS; t += DT) {
        const seam = e.seam!;
        if (seam !== seamRef) {
          seamRef = seam;
          aim = 0;
        }
        if (e.step === 'work' && e.seamWait <= 0) aim = Math.min(aim + 10 * DT, e.progress + 3, seam.len);
        const p = pointAt(seam, aim);
        e.update(t, { abs: { x: p.x, y: p.y + 3.8 } });
        fx.push(...e.takeFx());
      }
      expect(e.stats().rushed).toBe(0);
      audit(fx, e.stats().s1);
    }
    expect(tally.rushedSeams).toBeGreaterThan(0);
    expect(tally.looseSeams).toBeGreaterThan(0);
  });

  test('Assist mode lifts the same sloppy hand by at least 300', () => {
    const normal = mean(SEEDS.map((s) => play(AVERAGE, s, false).e.score));
    const assist = mean(SEEDS.map((s) => play(AVERAGE, s, true).e.score));
    expect(assist - normal).toBeGreaterThanOrEqual(300);
  });

  test('skill sorts the medals: good ≈ silver, average ≈ bronze', () => {
    const good = mean(SEEDS.map((s) => play(GOOD, s, false).e.score));
    const avg = mean(SEEDS.map((s) => play(AVERAGE, s, false).e.score));
    expect(medal(good)).toBe('silver');
    expect(medal(avg)).toBe('bronze');
  });

  test('keyboard players can reach silver+ (Normal) and gold (Assist)', () => {
    expect(KEY_SPEED.trace).toBeLessThan(NORMAL.close.rush); // keys can never rush the seam
    const normal = mean(SEEDS.map((s) => playKeys(s, false).score));
    const assist = mean(SEEDS.map((s) => playKeys(s, true).score));
    expect(normal).toBeGreaterThanOrEqual(2000);
    expect(assist).toBeGreaterThanOrEqual(2300);
    const keysOnly = playKeys(SEEDS[0], false);
    expect(keysOnly.rushed).toBe(0);
  });

  test('the same seed and the same inputs give the same run', () => {
    const a = play(GOOD, 1234, false);
    const b = play(GOOD, 1234, false);
    expect(b.stats).toEqual(a.stats);
    expect(b.e.score).toBe(a.e.score);
    const c = play(GOOD, 4321, false);
    expect(c.stats).not.toEqual(a.stats);
  });

  test('medal thresholds 900 / 1600 / 2300 and the rewards path', () => {
    expect(MEDAL_THRESHOLDS.surgery).toEqual([900, 1600, 2300]);
    expect(medal(899)).toBe('none');
    expect(medal(900)).toBe('bronze');
    expect(medal(1599)).toBe('bronze');
    expect(medal(1600)).toBe('silver');
    expect(medal(2299)).toBe('silver');
    expect(medal(2300)).toBe('gold');
    expect(TUNING.surgery.cap).toBe(45);
    expect(TUNING.surgery.energy).toBe(-8);
    // gold pays about Swinus Rhythms money (5 + score / 60, capped at 45)
    expect(Math.floor(TUNING.surgery.money({ score: 2300, stats: {} }))).toBe(43);
    const s = newSave(Date.UTC(2026, 9, 30, 18));
    s.companion = 'piggy-2';
    const now = Date.UTC(2026, 9, 30, 18);
    const res = minigameReward(s, 'surgery', 'piggy-2', { score: 2500, stats: { precision: 96, watertight: 3 }, assist: true }, now);
    expect(res.id).toBe('surgery');
    expect(res.medal).toBe('gold');
    expect(res.won).toBe(true);
    expect(res.assist).toBe(true);
    expect(res.energy).toBe(-8);
    const before = s.money;
    applyMinigameResult(s, 'piggy-2', res, now);
    expect(s.money).toBe(before + res.money);
    expect(s.counters['mg.surgery.runs']).toBe(1);
    expect(s.counters['mg.surgery.gold']).toBe(1);
    expect(s.counters['mg.surgery.watertight']).toBe(1);
    expect(s.counters['mg.surgery.best']).toBe(2500);
    expect(s.flags['pet.gold.surgery']).toBe(true);
    // idle runs still pay the floor
    const zero = minigameReward(s, 'surgery', 'piggy-2', { score: 0, stats: {} }, now + 60_000);
    expect(zero.money).toBeGreaterThanOrEqual(5);
    expect(zero.medal).toBe('none');
  });
});

describe('Steady Hoof: stations', () => {
  test('seams stay on the pad, alternate direction, chain end to start and carry 6–7 blossoms', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rand = rng(seed * 977);
      let from: Vec = { x: 14, y: 35 + 30 * rand() };
      let dir: 1 | -1 = 1;
      for (let n = 0; n < 6; n++) {
        const seam = makeSeam(rand, from, dir, NORMAL.close.spacing, n);
        expect(seam.pts.length).toBe(49);
        expect(seam.pts[0]).toEqual(from);
        for (const p of seam.pts) {
          expect(p.x).toBeGreaterThanOrEqual(14 - 1e-9);
          expect(p.x).toBeLessThanOrEqual(86 + 1e-9);
          expect(p.y).toBeGreaterThanOrEqual(16);
          expect(p.y).toBeLessThanOrEqual(84);
        }
        for (let i = 1; i < seam.pts.length; i++) expect(Math.sign(seam.pts[i].x - seam.pts[i - 1].x)).toBe(dir);
        expect(seam.marks.length).toBeGreaterThanOrEqual(6);
        expect(seam.marks.length).toBeLessThanOrEqual(7);
        from = seam.pts[seam.pts.length - 1];
        expect(from.x).toBe(dir > 0 ? 86 : 14);
        dir = dir > 0 ? -1 : 1;
      }
    }
  });

  test('in a run, each new seam starts where the last one ended and runs back the other way', () => {
    const { seams, stats } = play(PERFECT, 99, true);
    expect(seams.length).toBeGreaterThanOrEqual(3);
    expect(stats.seams).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < seams.length; i++) {
      expect(seams[i].pts[0]).toEqual(seams[i - 1].pts[seams[i - 1].pts.length - 1]);
      expect(seams[i].dir).toBe(seams[i - 1].dir > 0 ? -1 : 1);
    }
  });

  test('progress never skips ahead: a tip far along the seam does not stitch', () => {
    const e = new SteadyEngine(5, false, true);
    const seam = e.seam!;
    for (let t = 0; t < workStart(0) + 3; t += DT) {
      e.update(t, { abs: pointAt(seam, seam.len - 5) });
    }
    expect(e.progress).toBe(0);
    expect(e.stats().stitches).toBe(0);
    expect(e.offFor).toBeGreaterThan(0.6);
    expect(e.takeFx().some((f) => f.kind === 'off')).toBe(true);
  });

  test('a contact never sets while the hand is moving faster than "still"', () => {
    for (const assist of [false, true]) {
      const still = (assist ? ASSIST : NORMAL).place.still;
      // a hand that keeps orbiting through the marks fast never sets one
      const e = new SteadyEngine(11, assist);
      for (let t = 0; t < RUN_SECONDS + 0.5; t += DT) {
        let abs: Vec = { x: 50, y: 50 };
        const m = e.nextMark();
        if (e.id === 'place' && m) abs = { x: m.x + 2 * Math.cos(t * 9), y: m.y + 2 * Math.sin(t * 9) };
        e.update(t, { abs });
        e.takeFx();
      }
      expect(e.stats().contacts).toBe(0);
      // a sloppy player: every contact that does set, set while the hand was still
      const run = play(AVERAGE, 13, assist);
      const sets = run.fx.filter((x) => x.f.kind === 'grade' && x.f.station === 'place');
      expect(sets.length).toBeGreaterThan(0);
      for (const x of sets) expect(x.speed).toBeLessThan(still);
    }
  });

  test('the scope target rides the vessel; the pulse follows the song beat', () => {
    const e = new SteadyEngine(3, false);
    e.update(workStart(1) + 0.5, { beat: 10.15 });
    expect(e.id).toBe('scope');
    expect(e.pulse()).toBeCloseTo(Math.sin((0.15 / 0.3) * Math.PI), 6);
    const p = e.targetPos()!;
    const g = e.target!;
    expect(Math.hypot(p.x - g.base.x, p.y - g.base.y)).toBeCloseTo(NORMAL.scope.pulse * e.pulse(), 6);
    e.update(workStart(1) + 0.6, { beat: 10.5 });
    expect(e.pulse()).toBe(0);
    // without a song clock the pulse runs at 72 BPM from GO
    e.update(workStart(1) + 0.7, {});
    expect(e.beat).toBeCloseTo((workStart(1) + 0.7) * BEATS_PER_SECOND, 9);
  });
});

describe('Steady Hoof: sway and breath', () => {
  const swayX = (t: number, ph: number[], drift: number, jitter: number, amp: number) =>
    amp * (drift * (0.6 * Math.sin(2 * Math.PI * 0.21 * t + ph[0]) + 0.4 * Math.sin(2 * Math.PI * 0.37 * t + ph[1])) + jitter * Math.sin(2 * Math.PI * 4.3 * t + ph[2]));

  test('Reduce Motion: no vessel pulse and no jitter in the sway', () => {
    const rm = new SteadyEngine(21, false, true);
    const full = new SteadyEngine(21, false, false);
    for (const t of [0, 1, 2.5, 5, 9.9, 17.3]) {
      rm.update(t, { beat: t * 1.2 + 0.1 });
      full.update(t, { beat: t * 1.2 + 0.1 });
      expect(rm.pulse()).toBe(0);
      const amp = 1 + (NORMAL.calmFloor - 1) * rm.calm(t);
      const [drift, jitter] = NORMAL.sway.close;
      expect(rm.tremor(t).x).toBeCloseTo(swayX(t, rm.phases, drift, 0, amp), 9);
      expect(full.tremor(t).x).toBeCloseTo(swayX(t, full.phases, drift, jitter, amp), 9);
    }
    // on the beat's kick the vessel pulses, except with Reduce Motion
    rm.update(18, { beat: 30.1 });
    full.update(18, { beat: 30.1 });
    expect(full.pulse()).toBeGreaterThan(0.5);
    expect(rm.pulse()).toBe(0);
    // the same seed and hand, so the sway differs by the jitter alone
    expect(rm.phases).toEqual(full.phases);
  });

  test('the breath is continuous everywhere and every station starts on an exhale that settles in 0.12 of a breath (0.6 s)', () => {
    for (const tune of [NORMAL, ASSIST]) {
      const e = new SteadyEngine(8, tune === ASSIST);
      let prev = e.calm(0);
      for (let t = 0.001; t < RUN_SECONDS; t += 0.001) {
        const c = e.calm(t);
        expect(Math.abs(c - prev)).toBeLessThan(0.01);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
        prev = c;
      }
      for (let i = 0; i < 3; i++) {
        const ws = workStart(i);
        expect(Math.abs(e.calm(ws - 1e-6) - e.calm(ws + 1e-6))).toBeLessThan(1e-3);
        expect(e.calm(ws)).toBeCloseTo(0, 6);
        expect(e.calm(ws + 0.12 * tune.breathPeriod)).toBeCloseTo(1, 6);
        if (tune === NORMAL) expect(e.calm(ws + 0.6)).toBeCloseTo(1, 6);
        expect(e.exhaling(ws + 0.1)).toBe(true);
        expect(e.exhaling(ws - 0.1)).toBe(false);
        // the exhale holds until 60 % of the breath, then the inhale
        expect(e.calm(ws + tune.breathPeriod * 0.55)).toBeCloseTo(1, 6);
        expect(e.calm(ws + tune.breathPeriod * 0.9)).toBeLessThan(0.5);
      }
    }
  });

  test('the sway shrinks to 30 % on the exhale and the tip is what gets judged', () => {
    const e = new SteadyEngine(4, false, true);
    const t = workStart(0) + 1;
    e.update(t, { abs: { x: 40, y: 40 } });
    const sw = e.tremor(t);
    expect(e.tip.x).toBeCloseTo(40 + sw.x, 9);
    expect(e.tip.y).toBeCloseTo(40 + sw.y, 9);
    const [drift] = NORMAL.sway.close;
    expect(Math.abs(sw.x)).toBeLessThanOrEqual(drift * NORMAL.calmFloor + 1e-9);
  });

  test('keys: constant on the seam, a 6 → 22 ramp elsewhere, Shift is fine control, diagonals are normalized', () => {
    const km = new KeyMotion();
    const d0 = km.step(1, 0, false, true, 0.1);
    expect(d0.x).toBeCloseTo(KEY_SPEED.trace * 0.1, 9);
    km.reset();
    const first = km.step(1, 0, false, false, 0.01);
    expect(first.x).toBeCloseTo(KEY_SPEED.start * 0.01, 9);
    for (let i = 0; i < 40; i++) km.step(1, 0, false, false, 0.01);
    expect(km.step(1, 0, false, false, 0.01).x).toBeCloseTo(KEY_SPEED.max * 0.01, 9);
    expect(km.step(0, 0, false, false, 0.01)).toEqual({ x: 0, y: 0 });
    expect(km.step(1, 0, false, false, 0.01).x).toBeCloseTo(KEY_SPEED.start * 0.01, 9);
    const fine = km.step(1, 1, true, false, 0.1);
    expect(Math.hypot(fine.x, fine.y)).toBeCloseTo(KEY_SPEED.fine * 0.1, 9);
  });
});

describe('Steady Hoof: layout and registry', () => {
  test('the tray fits the canvas at phone and desktop sizes; the text scale keeps letters ≥ 11 CSS px', () => {
    // logical canvas widths the shell gives: 393×659 → 174, 375×553 → 202, phones landscape / desktop → 470–480
    for (const w of [150, 174, 202, 270, 359, 360, 420, 470, 480]) {
      const L = layout(w, 270);
      expect(L.portrait).toBe(w < 360);
      const { x, y, s } = L.tray;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + s).toBeLessThanOrEqual(w);
      expect(y + s).toBeLessThanOrEqual(270);
      expect(s).toBeGreaterThanOrEqual(140);
      expect(L.say.w).toBeGreaterThan(60);
      if (L.portrait) expect(L.doc.y - 102).toBeGreaterThan(y + s); // his head sits under the tray
      else expect(L.say.x + L.say.w).toBeLessThanOrEqual(x);
      const mid = toPx(L, { x: 50, y: 50 });
      expect(toTray(L, mid.x, mid.y).x).toBeCloseTo(50, 9);
    }
    for (const scale of [2.19, 1.8, 1.22, 1.21, 2.7, 1.0, 1.6]) expect(7 * scale * textScale(scale)).toBeGreaterThanOrEqual(11);
    expect(textScale(2.19)).toBe(1);
    expect(textScale(1.22)).toBe(2);
  });

  test('registered everywhere: meta, results lines, rewards, scripts, Shands and the icons', () => {
    expect(REGISTRY_IDS).toContain('surgery');
    expect(SCRIPT_IDS).toContain('surgery');
    const m = META.surgery;
    expect(m).toMatchObject({ id: 'surgery', title: 'Steady Hoof', jpTitle: 'ステディ・フーフ', pig: 'piggy-2', anyPig: false, song: 'piggy2_theme', location: 'shands' });
    expect(m.bg[0]).toBe('or_suite');
    for (const md of ['none', 'bronze', 'silver', 'gold'] as const) {
      expect(RESULT_LINES.surgery['piggy-2']?.[md]?.length ?? 0).toBeGreaterThan(10);
      expect(resultLine('surgery', 'piggy-2', md)).toBe(RESULT_LINES.surgery['piggy-2']![md]);
    }
    expect(LOCATIONS.shands.actions).toContain('minigame:surgery');
    for (const id of ['suture', 'forceps', 'brain_model', 'hand']) expect(ICONS[id]).toBeDefined();
    for (const id of ['suture', 'forceps']) {
      expect(ICONS[id].rows.length).toBe(16);
      for (const row of ICONS[id].rows) expect(row.length).toBe(16);
      for (const ch of new Set(ICONS[id].rows.join(''))) if (ch !== '.') expect(ICONS[id].palette[ch]).toBeDefined();
    }
    expect(STATIONS).toEqual(['close', 'scope', 'place']);
  });

  test('player-facing words: "sway", never "tremor"; no pork foods', () => {
    const text = [META.surgery.desc, ...Object.values(RESULT_LINES.surgery['piggy-2'] ?? {})].join(' ').toLowerCase();
    expect(text).not.toContain('tremor');
    for (const w of ['ham', 'bacon', 'pork', 'sausage', 'prosciutto', 'pancetta', 'chorizo']) expect(text).not.toMatch(new RegExp(`\\b${w}\\b`));
  });
});
