import { describe, expect, test } from 'bun:test';
import {
  DROP_RULES, HAND_MAX_ACC, holdHand, MAX_FLING, newHand, newSwing, resetHand, sampleHand, stepSwing, SWING, swingEnergy,
  swingVelocity, trackHand, wrapAngle,
  type Swing,
} from '../src/lib/engine/physics';
import { StageWorld } from '../src/lib/engine/world';
import { WHOOSH_SPEED } from '../src/lib/ui/hub/hub';

// ───────────────────────── a hand driving the swing (the same pipeline as world.ts) ─────────────────────────

type Path = (t: number) => [number, number];
const TAU = Math.PI * 2;
const L = SWING.length;
const DEG = Math.PI / 180;

interface Run {
  s: Swing;
  /** Largest |angle| before he first went over the top (rad). */
  maxAbs: number;
  /** Signed full turns round the hand while the path ran. */
  turns: number;
  flipAt: number;
  maxVel: number;
  minLen: number;
  maxLen: number;
  maxEnergy: number;
  maxWhirl: number;
  /** Mean distance body center → (cx, cy) over the path's last second. */
  orbit: number;
  /**
   * Over the path's last 2 s, the string (hand → body) against the radial line (cx, cy) → hand where his head is drawn
   * (the pointer's newest report), in degrees: the mean (− = trailing behind, by `dir`) and the mean size of the angle
   * between them; and the mean against where the pointer really is by now.
   */
  lag: number;
  offRadial: number;
  lagNow: number;
  finite: boolean;
}

interface DriveOpts {
  frame?: () => number;
  after?: number;
  cx?: number;
  cy?: number;
  /** Turning direction of the path (for the sign of `lag`). */
  dir?: number;
  /**
   * A pointer reporting the path at this rate (Hz, from an odd phase), as browsers deliver its moves: each frame gets
   * the newest report since the last frame, at its own time (none when the pointer is slower than the display), and
   * `late` ms after it was made (touch reports come in tens of ms late). Without it, each frame reads the path itself.
   */
  pointerHz?: number;
  late?: number;
  s?: Swing;
}

/** The game's pipeline (world.ts updateHeld): each pointer report fed at its own time, the hand held between them. */
function drive(path: Path, ms: number, opts: DriveOpts = {}): Run {
  const frame = opts.frame ?? (() => 1000 / 60);
  const s = opts.s ?? newSwing();
  const [x0, y0] = path(0);
  const h = newHand(x0, y0);
  const cx = opts.cx ?? x0;
  const cy = opts.cy ?? y0;
  const r: Run = {
    s, maxAbs: 0, turns: 0, flipAt: -1, maxVel: 0, minLen: Infinity, maxLen: 0, maxEnergy: 0, maxWhirl: 0, orbit: 0,
    lag: 0, offRadial: 0, lagNow: 0, finite: true,
  };
  const per = opts.pointerHz ? 1000 / opts.pointerHz : 0;
  const phase = per * 0.37;
  let next = 0;
  let unwrapped = 0;
  let orbitSum = 0;
  let orbitN = 0;
  let lagSum = 0;
  let offSum = 0;
  let nowSum = 0;
  let lagN = 0;
  for (let t = 0; t < ms + (opts.after ?? 0);) {
    const dt = frame();
    t += Number.isFinite(dt) && dt > 0 ? dt : 0;
    const now = Math.min(t, ms);
    if (per) {
      let at = -1;
      while (phase + next * per <= now - (opts.late ?? 0)) at = phase + next++ * per;
      if (at >= 0) {
        const [x, y] = path(at / 1000);
        sampleHand(h, at, x, y, t);
      }
    } else {
      const [x, y] = path(now / 1000);
      sampleHand(h, t, x, y);
    }
    holdHand(h, t);
    const before = s.angle;
    stepSwing(s, dt, h);
    unwrapped += wrapAngle(s.angle - before);
    if (t <= ms) r.turns = unwrapped / TAU;
    if (Math.abs(unwrapped) > Math.PI && r.flipAt < 0) r.flipAt = t;
    if (r.flipAt < 0) r.maxAbs = Math.max(r.maxAbs, Math.abs(unwrapped));
    r.maxVel = Math.max(r.maxVel, Math.abs(s.vel));
    r.minLen = Math.min(r.minLen, s.len);
    r.maxLen = Math.max(r.maxLen, s.len);
    r.maxEnergy = Math.max(r.maxEnergy, swingEnergy(s));
    r.maxWhirl = Math.max(r.maxWhirl, s.whirl);
    if (t > ms - 1000 && t <= ms) {
      orbitSum += Math.hypot(h.x - s.len * Math.sin(s.angle) - cx, h.y + s.len * Math.cos(s.angle) - cy);
      orbitN++;
    }
    if (t > ms - 2000 && t <= ms) {
      // against the radial line through his head (drawn at the pointer's newest report), and through the pointer now
      const string = Math.atan2(Math.cos(s.angle), -Math.sin(s.angle));
      const off = wrapAngle(string - Math.atan2(h.y - cy, h.x - cx)) * (opts.dir ?? 1);
      const [px, py] = path(now / 1000);
      lagSum += off;
      offSum += Math.abs(off);
      nowSum += wrapAngle(string - Math.atan2(py - cy, px - cx)) * (opts.dir ?? 1);
      lagN++;
    }
    if (![s.angle, s.vel, s.len, s.lenVel, s.whirl, s.turn, s.bend, s.round].every(Number.isFinite)) r.finite = false;
  }
  r.orbit = orbitN ? orbitSum / orbitN : 0;
  r.lag = lagN ? lagSum / lagN / DEG : 0;
  r.offRadial = lagN ? offSum / lagN / DEG : 0;
  r.lagNow = lagN ? nowSum / lagN / DEG : 0;
  return r;
}

// hand paths, logical px (stage 480 × 270)
const minJerk = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (10 - 15 * x + 6 * x * x));
const move = (dx: number, dy: number, dur: number, x0 = 240, y0 = 100): Path => (t) => [x0 + dx * minJerk(t / dur), y0 + dy * minJerk(t / dur)];
/** Back and forth along (dx, dy): sideways by default. */
const shake = (amp: number, hz: number, dx = 1, dy = 0): Path => (t) => {
  const v = amp * Math.sin(TAU * hz * t);
  return [240 + v * dx, 100 + v * dy];
};
/** A hand whirling a circle of radius R at f rev/s (dir +1 = clockwise on screen), easing its radius in over `ease` s. */
const circle = (R: number, f: number, dir = 1, cx = 240, cy = 110, ease = 0.3): Path => (t) => {
  const k = ease > 0 ? Math.min(1, t / ease) : 1;
  const th = dir * TAU * f * t;
  return [cx + R * k * Math.cos(th), cy + R * k * Math.sin(th)];
};
/** Whirl a wide circle, then tighten it to R2 from t1 (over half a second). */
const tighten = (R1: number, R2: number, f: number, t1: number): Path => (t) => {
  const R = R1 + (R2 - R1) * minJerk((t - t1) / 0.5);
  const k = Math.min(1, t / 0.3);
  return [240 + R * k * Math.cos(TAU * f * t), 110 + R * k * Math.sin(TAU * f * t)];
};
const tremor = (amp: number): Path => (t) => [
  240 + (amp / 3) * (Math.sin(TAU * 5.3 * t) + Math.sin(TAU * 8.1 * t + 0.7) + Math.sin(TAU * 11.7 * t + 1.4)),
  110 + (amp / 3) * (Math.sin(TAU * 6.2 * t + 1.2) + Math.sin(TAU * 9.4 * t + 2.4) + Math.sin(TAU * 12.3 * t + 3.6)),
];
/** A shake `amp` back and forth with a thin loop (`loop` × amp across it: an ellipse), turned by `tilt` (rad). */
const loopShake = (amp: number, hz: number, loop: number, tilt = 0, ease = 0): Path => (t) => {
  const k = ease > 0 ? Math.min(1, t / ease) : 1;
  const u = amp * k * Math.sin(TAU * hz * t);
  const v = amp * loop * k * Math.cos(TAU * hz * t);
  return [240 + u * Math.cos(tilt) - v * Math.sin(tilt), 100 + u * Math.sin(tilt) + v * Math.cos(tilt)];
};
/**
 * A hand's shake: along the wrist's arc (its ends dip by `arc` × amp), drifting in size and pace, with a small loop at
 * the turnarounds (`loop` × amp).
 */
const handShake = (amp: number, hz: number, arc: number, loop: number, seed = 1): Path => (t) => {
  const ph = seed * 2.1;
  const a = amp * (1 + 0.2 * Math.sin(TAU * 0.37 * t + ph));
  const th = TAU * hz * t + 0.6 * Math.sin(TAU * 0.23 * t + ph);
  const x = a * Math.sin(th) + 0.1 * a * Math.sin(2 * th + ph);
  return [240 + x, 100 + arc * amp * (x / amp) ** 2 + loop * a * Math.cos(th)];
};

describe('held swing: gentle handling keeps the dangle', () => {
  test('dragging right swings the body left (positive angle), then he settles', () => {
    const r = drive(move(80, 0, 0.6), 300);
    expect(r.s.angle).toBeGreaterThan(0.05);
    const settled = drive(move(80, 0, 0.6), 600, { after: 2500 });
    expect(Math.abs(settled.s.angle)).toBeLessThan(0.01);
    expect(Math.abs(settled.s.vel)).toBeLessThan(0.05);
    expect(settled.s.len).toBeCloseTo(L, 1); // hanging still: the string is back to its rest length
  });

  test('drags and flicks tilt him well out but never flip him over', () => {
    const moves: [string, Path, number][] = [
      ['slow drag', move(80, 0, 0.6), 600],
      ['drag', move(120, 0, 0.35), 350],
      ['fast drag', move(200, 0, 0.18), 180],
      ['flick', move(300, 0, 0.12), 120],
      ['diagonal flick', move(300, -150, 0.15), 150],
      ['lift', move(10, -120, 0.3, 240, 200), 300],
    ];
    for (const [name, path, ms] of moves) {
      const r = drive(path, ms, { after: 2500 });
      expect({ name, flipped: r.flipAt >= 0 }).toEqual({ name, flipped: false });
      expect(r.maxAbs).toBeLessThan(60 * DEG);
      expect(r.maxWhirl).toBeLessThan(0.3); // a straight drag is not a whirl
    }
  });

  test('small jiggles, rubs and tremor never flip him over', () => {
    const jiggles: [string, Path][] = [
      ['8 px at 4 Hz', shake(8, 4)],
      ['8 px at 9 Hz', shake(8, 9)],
      ['10 px at 1 Hz', shake(10, 1)],
      ['15 px at 2.5 Hz', shake(15, 2.5)],
      ['rub 25 px at 3.5 Hz', shake(25, 3.5)],
      ['rub 40 px at 3 Hz', shake(40, 3)],
      ['bob 20 px at 3 Hz', shake(20, 3, 0, 1)],
      ['tremor 6 px', tremor(6)],
      ['tremor 12 px', tremor(12)],
    ];
    for (const [name, path] of jiggles) {
      const r = drive(path, 5000);
      expect({ name, flipped: r.flipAt >= 0 }).toEqual({ name, flipped: false });
      expect(r.maxAbs).toBeLessThan(name.startsWith('tremor 12') ? 60 * DEG : 35 * DEG);
    }
  });

  test('a yank down or up, or a there-and-back swipe, never flips him over', () => {
    const tilted = () => {
      const s = newSwing();
      s.angle = 20 * DEG;
      return s;
    };
    for (const [path, ms] of [
      [move(0, 120, 0.15, 240, 20), 150],
      [move(0, -120, 0.15, 240, 140), 150],
      [(t: number) => [240 + 150 * Math.sin(Math.PI * Math.min(1, t / 0.5)), 100], 500],
      [(t: number) => [240 + 200 * Math.sin(Math.PI * Math.min(1, t / 0.6)), 100], 600],
    ] as [Path, number][]) {
      const r = drive(path, ms, { after: 3000, s: tilted() });
      expect(r.flipAt).toBe(-1);
      expect(r.maxAbs).toBeLessThan(150 * DEG);
    }
  });

  test('even hard shaking only swings him high: going round takes a whirl', () => {
    const tilted = (a: number) => {
      const s = newSwing();
      s.angle = a;
      return s;
    };
    // the shakes that used to flip him (and keep him going round), then a grid of harder ones
    const shakes: [string, Path, number][] = [
      ['100 px at 1.5 Hz', shake(100, 1.5), 0],
      ['120 px at 1.25 Hz', shake(120, 1.25), 0],
      ['diagonal 60 px at 2 Hz', shake(60, 2, Math.SQRT1_2, Math.SQRT1_2), 0],
      ['bob 60 px at 1.8 Hz, tilted', shake(60, 1.8, 0, 1), 0.1],
      ['bob 80 px at 1.8 Hz, 5% sideways', shake(80, 1.8, 0.05, 1), 0],
    ];
    for (const amp of [40, 80, 120, 150, 200]) {
      for (const hz of [0.9, 1.25, 1.5, 2, 2.5]) {
        shakes.push([`${amp} px at ${hz} Hz`, shake(amp, hz), 0]);
        shakes.push([`diagonal ${amp} px at ${hz} Hz`, shake(amp, hz, Math.SQRT1_2, -Math.SQRT1_2), 0]);
        shakes.push([`bob ${amp} px at ${hz} Hz, tilted`, shake(amp, hz, 0, 1), 0.1]);
      }
    }
    for (const [name, path, a0] of shakes) {
      const r = drive(path, 5000, { after: 2000, s: tilted(a0) });
      expect({ name, flipped: r.flipAt >= 0 }).toEqual({ name, flipped: false });
      expect(r.maxWhirl).toBeLessThan(0.3);
    }
    // they do swing him well up, past level
    expect(drive(shake(100, 1.5), 5000).maxAbs).toBeGreaterThan(70 * DEG);
  });

  test('a real hand’s shake doesn’t flip him either: a thin loop at each end, or the wrist’s arc, is no whirl', () => {
    const shakes: [string, Path][] = [
      // hard shakes with a 5 % loop used to read as circling (whirl ≈ 0.8) and spin him over and over
      ['100 px at 2 Hz, 5% loop', loopShake(100, 2, 0.05)],
      ['80 px at 2 Hz, 5% loop', loopShake(80, 2, 0.05)],
      ['120 px at 1.5 Hz, 5% loop', loopShake(120, 1.5, 0.05)],
    ];
    for (const amp of [40, 60, 80, 100, 120, 150, 200]) {
      for (const hz of [0.9, 1.25, 1.5, 1.8, 2, 2.5, 3]) {
        shakes.push([`${amp} px at ${hz} Hz, 10% loop`, loopShake(amp, hz, 0.1)]);
        shakes.push([`${amp} px at ${hz} Hz, 10% loop, diagonal`, loopShake(amp, hz, 0.1, -Math.PI / 4)]);
        shakes.push([`hand ${amp} px at ${hz} Hz: arc + 5% loop`, handShake(amp, hz, 0.15, 0.05, 1)]);
        shakes.push([`hand ${amp} px at ${hz} Hz: arc + 10% loop`, handShake(amp, hz, 0.15, 0.1, 2)]);
        shakes.push([`hand ${amp} px at ${hz} Hz: deep arc`, handShake(amp, hz, 0.2, 0, 3)]);
      }
    }
    for (const [name, path] of shakes) {
      const r = drive(path, 5000, { after: 2000 });
      expect({ name, flipped: r.flipAt >= 0 }).toEqual({ name, flipped: false });
    }
    for (const [, path] of shakes.slice(0, 3)) expect(drive(path, 5000).maxWhirl).toBeLessThan(0.3);
  });
});

describe('held swing: whirling him round', () => {
  test('circling the hand spins him round it, the same way round', () => {
    for (const R of [25, 40, 60]) {
      for (const f of [1.5, 2, 2.5]) {
        for (const dir of [1, -1]) {
          const r = drive(circle(R, f, dir), 4000);
          const turns = r.turns * dir;
          expect({ R, f, dir, spun: turns >= 2 }).toEqual({ R, f, dir, spun: true });
          expect(r.maxWhirl).toBeGreaterThan(0.9);
        }
      }
    }
  });

  test('whirled, he points out along the circle’s radius (as if riding its rim) instead of trailing behind it', () => {
    for (const [R, f] of [[25, 2], [40, 2], [40, 3], [60, 1.5], [25, 2.5], [60, 2.5]]) {
      for (const dir of [1, -1]) {
        for (const fps of [60, 30, 144]) {
          const r = drive(circle(R, f, dir), 5000, { frame: () => 1000 / fps, cx: 240, cy: 110, dir });
          // the mean lag behind the radial line, and how far off it he swings on average (gravity sways him a little)
          expect({ R, f, dir, fps, lag: Math.abs(r.lag) < 10, off: r.offRadial < 20 }).toEqual({ R, f, dir, fps, lag: true, off: true });
        }
      }
    }
  });

  test('…whatever rate the pointer reports at against the display’s (frames without a report hold the hand)', () => {
    // read once a frame, a 125 Hz mouse on a 144 Hz display trailed the radial line by 24°, on 165 Hz by 41°, and a
    // 60 Hz pointer on 120-144 Hz led it by 55°: frames that got no new report read as a hand that had stopped
    const rates = [[60, 125], [144, 125], [165, 125], [100, 125], [120, 60], [120, 90], [144, 60], [60, 45], [240, 1000], [30, 60]];
    for (const [fps, hz] of rates) {
      for (const [R, f] of [[25, 2], [40, 2], [40, 3], [60, 1.5]]) {
        const r = drive(circle(R, f), 5000, { frame: () => 1000 / fps, cx: 240, cy: 110, pointerHz: hz });
        // out from his own head (drawn at the newest report), and not far behind the pointer itself by now
        const ok = { lag: Math.abs(r.lag) < 8, off: r.offRadial < 20, behindPointer: Math.abs(r.lagNow) < 15 };
        expect({ fps, hz, R, f, ...ok }).toEqual({ fps, hz, R, f, lag: true, off: true, behindPointer: true });
      }
    }
    // touch reports that come in 40-80 ms after they were made: a hand quiet that long is not a stopped one
    for (const late of [40, 80]) {
      for (const [fps, hz] of [[60, 85], [120, 60]]) {
        const r = drive(circle(30, 2), 5000, { frame: () => 1000 / fps, cx: 240, cy: 110, pointerHz: hz, late });
        expect({ late, fps, hz, spun: r.turns > 7, lag: Math.abs(r.lag) < 8 }).toEqual({ late, fps, hz, spun: true, lag: true });
      }
    }
  });

  test('big fast circles spin him up from a standing start (the turn rate isn’t capped)', () => {
    for (const [R, f] of [[60, 4], [100, 4], [150, 3]]) {
      for (const dir of [1, -1]) {
        for (const ease of [0, 0.3]) {
          const r = drive(circle(R, f, dir, 240, 110, ease), 3000);
          expect({ R, f, dir, ease, spun: r.turns * dir > 0.6 * f * 3 }).toEqual({ R, f, dir, ease, spun: true });
        }
      }
    }
  });

  test('a lopsided circle is still a whirl (an ellipse up to about 4:1)', () => {
    for (const [A, loop, f] of [[60, 0.5, 2], [60, 0.33, 2], [60, 0.25, 2], [80, 0.3, 1.5]]) {
      const r = drive(loopShake(A, f, loop, 0, 0.3), 4000);
      expect({ A, loop, f, spun: Math.abs(r.turns) > 3 }).toEqual({ A, loop, f, spun: true });
    }
  });

  test('fast small circles spin him up too; slow small ones only rock him', () => {
    expect(drive(circle(15, 2.5), 4000).turns).toBeGreaterThan(2);
    expect(drive(circle(10, 3), 4000).turns).toBeGreaterThan(2);
    for (const f of [1, 1.5, 2]) expect(drive(circle(8, f), 4000).flipAt).toBe(-1);
  });

  test('the orbit grows with the hand’s circle: he rides its circumference, string out', () => {
    const orbits = [25, 40, 60].map((R) => {
      const r = drive(circle(R, 2), 4000);
      expect(r.turns).toBeGreaterThan(3);
      // the body runs round the circle's center at about R + string length
      expect(r.orbit).toBeGreaterThan(R + 0.7 * L);
      expect(r.orbit).toBeLessThan(R + 1.25 * L);
      return r.orbit;
    });
    expect(orbits[1]).toBeGreaterThan(orbits[0] + 8);
    expect(orbits[2]).toBeGreaterThan(orbits[1] + 8);
  });

  test('once spinning, a tight circle keeps him going round the hand', () => {
    const wide = drive(tighten(40, 10, 2, 2.5), 2500);
    const all = drive(tighten(40, 10, 2, 2.5), 5500);
    expect(all.turns - wide.turns).toBeGreaterThan(4); // ~6 more turns at 2 rev/s while the circle is tight
  });

  test('the string gives a little when he spins, and stays within its stretch', () => {
    const r = drive(circle(40, 2), 4000);
    expect(r.maxLen).toBeGreaterThan(L * 1.04);
    expect(r.maxLen).toBeLessThanOrEqual(L * (1 + SWING.maxStretch) + 1e-9);
    expect(r.minLen).toBeGreaterThanOrEqual(L * (1 - SWING.maxStretch / 3) - 1e-9);
  });

  test('when the hand stops, the spin dies down and he hangs again', () => {
    const r = drive(circle(40, 2), 3000, { after: 8000 });
    expect(r.turns).toBeGreaterThan(3);
    expect(Math.abs(r.s.angle)).toBeLessThan(0.05);
    expect(Math.abs(r.s.vel)).toBeLessThan(0.3);
    expect(r.s.whirl).toBeLessThan(0.01);
  });
});

describe('held swing: bounded and stable', () => {
  test('energy stays bounded under wild input and odd frame times', () => {
    let seed = 11;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const capE = ((L * (1 + SWING.maxStretch)) * SWING.maxSpin ** 2) / (4 * SWING.gravity) + 1;
    for (let k = 0; k < 20; k++) {
      // jumpy random hand: teleports, fast whirls and stops
      const pts: [number, number][] = Array.from({ length: 200 }, () => [rnd() * 480, rnd() * 270]);
      const path: Path = (t) => pts[Math.floor(t * 40) % pts.length];
      const frames = [16.7, 0, NaN, -5, 1000, 100, 3, 33];
      let i = 0;
      const r = drive(path, 5000, { frame: () => (rnd() < 0.2 ? frames[i++ % frames.length] : 5 + rnd() * 60) });
      expect(r.finite).toBe(true);
      expect(r.maxVel).toBeLessThanOrEqual(SWING.maxSpin);
      expect(r.maxLen).toBeLessThanOrEqual(L * (1 + SWING.maxStretch) + 1e-9);
      expect(r.maxEnergy).toBeLessThanOrEqual(capE);
    }
  });

  test('low frame rates still spin him up, and never blow up', () => {
    for (const fps of [144, 60, 30, 20]) {
      const r = drive(circle(40, 2), 4000, { frame: () => 1000 / fps });
      expect(r.finite).toBe(true);
      expect({ fps, spun: r.turns > 2 }).toEqual({ fps, spun: true });
    }
    const slide = drive(circle(40, 2), 4000, { frame: () => 100 }); // 10 fps: coarse, but sane
    expect(slide.finite).toBe(true);
    expect(slide.maxVel).toBeLessThanOrEqual(SWING.maxSpin);
  });

  test('non-finite input and frame times are ignored', () => {
    const s = newSwing();
    s.angle = 0.4;
    stepSwing(s, NaN, { vx: 0, vy: 0, ax: 0, ay: 0 });
    stepSwing(s, 16, { vx: NaN, vy: Infinity, ax: NaN, ay: -Infinity });
    expect([s.angle, s.vel, s.len, s.whirl].every(Number.isFinite)).toBe(true);
    const h = resetHand({ x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 }, 10, 10);
    trackHand(h, 16, NaN, 5);
    trackHand(h, 16, 10_000, 10); // a teleport: acceleration capped
    expect(Math.hypot(h.ax, h.ay)).toBeLessThanOrEqual(HAND_MAX_ACC);
    expect(h.x).toBe(10_000);
  });
});

describe('held swing: letting go', () => {
  test('mid-swing his own velocity is tangential: len·φ′ across the string', () => {
    const r = drive(circle(40, 2), 3000);
    const s = r.s;
    const v = swingVelocity(s, { vx: 0, vy: 0 });
    const speed = Math.hypot(v.vx, v.vy);
    const er = { x: -Math.sin(s.angle), y: Math.cos(s.angle) }; // hand → body
    expect(speed).toBeGreaterThan(300);
    expect(Math.abs(v.vx * er.x + v.vy * er.y)).toBeLessThan(0.15 * speed);
    expect(speed).toBeCloseTo(s.len * Math.abs(s.vel), -1.5);
    // + spin (clockwise on screen) moves the body along (−cos φ, −sin φ)
    expect(Math.sign(v.vx * -Math.cos(s.angle) + v.vy * -Math.sin(s.angle))).toBe(Math.sign(s.vel));
  });
});

// ───────────────────────── the stage world, headless ─────────────────────────

/** A stage `lw` logical px wide (480: desktop, 259: a phone in portrait), ground at `ground`, with the pig in the middle. */
function headlessWorld(lw = 480, ground?: number): StageWorld {
  const w = new StageWorld();
  const rect = { left: 0, top: 0, right: lw, bottom: 270, width: lw, height: 270, x: 0, y: 0 };
  const view = { setActive() {}, bubblesChanged() {}, canvasRect: () => rect, hitAlpha: () => true };
  w.attach(view as never); // client px = logical px
  if (lw !== 480) w.setLayout({ lw, u: 1, cssW: lw, cssH: 270 } as never, false);
  if (ground !== undefined) w.setGroundY(ground);
  w.spawnActor('pig', 'piggy-1', { x: Math.round(lw / 2) });
  return w;
}

// The held art as Stage draws it (world.ts drawActor): every pig's 'held' frames fit inside this outline (frame px,
// the convex hull of all their pixels).
const HELD_HULL: [number, number][] = [
  [30, 48], [34, 18], [37, 11], [38, 10], [40, 9], [55, 6], [74, 6], [91, 12], [92, 13], [95, 17], [96, 23], [98, 54], [98, 57],
  [96, 88], [94, 91], [90, 95], [75, 107], [73, 108], [70, 109], [60, 109], [53, 108], [41, 99], [35, 93], [33, 90], [32, 87], [30, 57],
];
/** Center of the body box in the frame: a held pig is drawn rotated round it (world.ts BODY_CY). */
const BODY_CY = 63;
/**
 * His grab point (the top of his head: the 'held' frames hang from it) is this far above his feet. The pointer holds
 * him where it pressed him, so a pick-up here puts the hand right at the pointer.
 */
const HEAD = 108;
/** His feet in the frame (frame row): the art stands on them. */
const FRAME_PIVOT_Y = 114;

interface HeldAir {
  body: { x: number; y: number };
  stretch: number;
  fit: number;
  swing: { whirl: number };
  hand: { x: number; y: number };
  gx: number;
  gy: number;
}

interface HeldActor {
  angle: number;
  squash: { value: number };
  squashY: number;
  air: HeldAir;
}

const heldActor = (w: StageWorld) => (w as unknown as { actors: Map<string, HeldActor> }).actors.get('pig')!;

/** Bounding box of the held pig's art on the stage this frame (logical px), the squash it is drawn with, and how hard he is whirled. */
function drawnArt(w: StageWorld) {
  const a = heldActor(w);
  const ang = Math.round(a.angle / DEG) * DEG;
  // the squash drawn: his own, the string's give, and what fits him on stage (world.ts drawActor)
  const q = a.squash.value + a.air.stretch + a.air.fit;
  const py = a.squashY - BODY_CY;
  const bx = Math.round(a.air.body.x);
  const by = Math.round(a.air.body.y);
  const box = { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity, whirl: a.air.swing.whirl, q };
  for (const [hx, hy] of HELD_HULL) {
    for (const fx of [hx, 128 - hx]) {
      // either way round (some clips are mirrored); squashed round the grab point, then rotated round the body center
      const X = (fx - 64) * (1 + q * 0.5);
      const Y = py + (hy - BODY_CY - py) * (1 - q);
      const x = bx + X * Math.cos(ang) - Y * Math.sin(ang);
      const y = by + X * Math.sin(ang) + Y * Math.cos(ang);
      box.top = Math.min(box.top, y);
      box.bottom = Math.max(box.bottom, y);
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
    }
  }
  return box;
}

/** Whirl the held pig round (cx, cy) for `frames` frames of 16 ms. */
function whirl(w: StageWorld, frames: number, R = 40, f = 2, cx = 240, cy = 100) {
  for (let i = 0; i < frames; i++) {
    const t = i * 0.016;
    const k = Math.min(1, t / 0.3);
    w.moveHeld(cx + R * k * Math.cos(TAU * f * t), cy + R * k * Math.sin(TAU * f * t));
    w.update(16);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('pick-up in the stage world', () => {
  test('whirling the held pig spins him round the hand, head in, feet out', () => {
    const w = headlessWorld();
    expect(w.holdActor('pig', 240, 150)).toBe(true);
    whirl(w, 200);
    const sw = w.heldSwing()!;
    expect(Math.abs(sw.turns)).toBeGreaterThan(3);
    expect(sw.whirl).toBeGreaterThan(0.9);
    // the body center sits out along the string from the hand
    const feet = w.actorPosition('pig')!;
    expect(Number.isFinite(feet.x) && Number.isFinite(feet.y)).toBe(true);
  });

  test('letting go mid-spin flings him off along the tangent with his own speed', async () => {
    const w = headlessWorld();
    w.holdActor('pig', 240, 150);
    whirl(w, 150);
    // the hand rests (no throw of its own) while he keeps going round
    await sleep(120);
    w.update(16);
    const sw = w.heldSwing()!;
    expect(Math.abs(sw.spin)).toBeGreaterThan(6);
    const v = w.heldThrow();
    const speed = Math.hypot(v.vx, v.vy);
    expect(speed).toBeGreaterThan(300);
    expect(speed).toBeLessThanOrEqual(MAX_FLING + 1e-6);
    const er = { x: -Math.sin(sw.angle), y: Math.cos(sw.angle) };
    expect(Math.abs(v.vx * er.x + v.vy * er.y)).toBeLessThan(0.2 * speed);
    // a fling that loud is a throw: it whooshes
    const toss = w.heldToss();
    expect(Math.hypot(toss.vx, toss.vy)).toBeGreaterThanOrEqual(WHOOSH_SPEED);
    const landing = w.releaseHeld();
    for (let i = 0; i < 400; i++) w.update(16);
    const r = await landing;
    expect(Math.hypot(r.vx, r.vy)).toBeCloseTo(speed, -1);
    expect(r.kind).not.toBe('gone');
  });

  test('set down mid-sway after a brisk carry, he still lands gently: his own dangling sway is no throw', async () => {
    const kinds: string[] = [];
    let swaying = 0;
    for (const wait of [0, 2, 4, 6, 8, 10, 12]) {
      const w = headlessWorld();
      w.holdActor('pig', 240, 200);
      // carry him 160 px in 0.4 s, low over the floor (the grab point stops where his feet just clear it), then stop
      for (let i = 0; i <= 25; i++) {
        w.moveHeld(240 + 160 * minJerk(i / 25), 260);
        w.update(16);
      }
      for (let i = 0; i < wait; i++) w.update(16);
      await sleep(90); // the hand has rested: no throw of its own
      const v = w.heldThrow();
      if (Math.hypot(v.vx, v.vy) >= DROP_RULES.softSpeed) swaying++;
      // and judged the same way for the sound: a put-down makes no throw's whoosh
      const toss = w.heldToss();
      expect(Math.hypot(toss.vx, toss.vy)).toBeLessThan(WHOOSH_SPEED);
      const landing = w.releaseHeld();
      for (let i = 0; i < 200; i++) w.update(16);
      kinds.push((await landing).kind);
    }
    expect(swaying).toBeGreaterThan(0); // fast enough that judging his whole speed would have called it a drop
    expect(kinds).toEqual(kinds.map(() => 'soft'));
  });

  test('a gentle release (0, 0) sets him down without a throw or a spin', async () => {
    const w = headlessWorld();
    w.holdActor('pig', 240, 150);
    whirl(w, 150);
    const landing = w.releaseHeld({ vx: 0, vy: 0 });
    for (let i = 0; i < 400; i++) w.update(16);
    const r = await landing;
    expect([r.vx, r.vy]).toEqual([0, 0]);
  });

  test('whirled low, his feet never dip through the floor (checked as he swings, not once a frame)', () => {
    for (const [R, f] of [[40, 2], [25, 2.5], [60, 1.5]]) {
      const w = headlessWorld();
      w.holdActor('pig', 240, 252 - HEAD);
      let lowest = -Infinity;
      for (let i = 0; i < 300; i++) {
        const t = i * 0.016;
        const k = Math.min(1, t / 0.3);
        // centered low: the hand dips to the lowest point the floor allows
        w.moveHeld(240 + R * k * Math.cos(TAU * f * t), 252 - 120 + R * k * Math.sin(TAU * f * t));
        w.update(16);
        lowest = Math.max(lowest, drawnArt(w).bottom);
      }
      expect(Math.abs(w.heldSwing()!.turns)).toBeGreaterThan(3);
      expect(lowest).toBeLessThanOrEqual(252);
    }
  });

  test('whirled high, he stays on stage: his whole orbit moves in, steadily (no dip at the top of every turn)', () => {
    // desktop (the VN box raises the ground) and a phone in portrait; whirls around and above mid-stage
    for (const [lw, ground] of [[480, 221], [259, 252]]) {
      for (const [cy, R, f] of [[80, 40, 2], [60, 26, 2.5], [110, 60, 1.5], [30, 30, 2], [100, 40, 2], [60, 60, 2]]) {
        const w = headlessWorld(lw, ground);
        w.holdActor('pig', lw / 2, ground - HEAD);
        const air = heldActor(w).air;
        let top = Infinity;
        let bottom = -Infinity;
        let side = -Infinity;
        let squash = -Infinity;
        let snap = 0;
        let step: number[] | null = null;
        for (let i = 0; i < 320; i++) {
          const t = i * 0.016;
          const k = Math.min(1, t / 0.3);
          const [gx, gy] = [air.gx, air.gy];
          w.moveHeld(lw / 2 + R * k * Math.cos(TAU * f * t), cy + R * k * Math.sin(TAU * f * t));
          w.update(16);
          const b = drawnArt(w);
          top = Math.min(top, b.top);
          bottom = Math.max(bottom, b.bottom);
          squash = Math.max(squash, b.q);
          if (b.whirl > 0.95) side = Math.max(side, -b.left, b.right - lw);
          // once he goes round: how the drawn grab point's move against the hand changes from one frame to the next
          // (a steady offset doesn't move; one that eases round the turn changes its move only a little)
          const s = [air.gx - gx, air.gy - gy];
          if (t > 1.5 && step) snap = Math.max(snap, Math.hypot(s[0] - step[0], s[1] - step[1]));
          step = s;
        }
        const sw = w.heldSwing()!;
        const at = { lw, cy, R, f };
        expect({ ...at, spun: Math.abs(sw.turns) > 3 }).toEqual({ ...at, spun: true });
        expect({ ...at, top: top >= -1, floor: bottom <= ground }).toEqual({ ...at, top: true, floor: true });
        if (lw < 300) expect(side).toBeLessThanOrEqual(1);
        // squashed against the edges a little at most (never past 30 %)
        expect(squash).toBeLessThanOrEqual(0.3 + 1e-9);
        // he rides a smooth orbit: the old give jumped 17-24 px in a frame at the top of each turn, and the floor
        // yanked a too-big orbit back by 10-21 px a frame at the bottom of each turn
        expect({ ...at, smooth: snap < 3.5 }).toEqual({ ...at, smooth: true });
      }
    }
  });

  test('whirled too big for the stage, the grab point rides a fixed narrower copy of the hand’s path', () => {
    // a 120 px circle round y = 60 needs 2R + 144 px even squashed 30 %, and these stages have 212-219: the offset eases
    // from the top of the hand's reach to the bottom instead of holding at the top's and snapping in at the floor
    for (const [lw, ground] of [[480, 221], [457, 216], [374, 214]]) {
      for (const f of [1.5, 2, 2.5]) {
        const w = headlessWorld(lw, ground);
        w.holdActor('pig', lw / 2, ground - HEAD);
        const air = heldActor(w).air;
        const hy: number[] = [];
        const gy: number[] = [];
        let top = Infinity;
        let bottom = -Infinity;
        for (let i = 0; i < 320; i++) {
          const t = i * 0.016;
          const k = Math.min(1, t / 0.3);
          w.moveHeld(lw / 2 + 60 * k * Math.cos(TAU * f * t), 60 + 60 * k * Math.sin(TAU * f * t));
          w.update(16);
          const b = drawnArt(w);
          top = Math.min(top, b.top);
          bottom = Math.max(bottom, b.bottom);
          if (t > 2.5) {
            hy.push(air.hand.y);
            gy.push(air.gy);
          }
        }
        // the offset is one straight line in the hand's height (a fixed path), shrinking toward the bottom
        const n = hy.length;
        const mh = hy.reduce((p, q) => p + q, 0) / n;
        const mg = gy.reduce((p, q) => p + q, 0) / n;
        const slope = hy.reduce((p, h, j) => p + (h - mh) * (gy[j] - mg), 0) / hy.reduce((p, h) => p + (h - mh) ** 2, 0);
        const stray = Math.max(...hy.map((h, j) => Math.abs(gy[j] - mg - slope * (h - mh))));
        const at = { lw, f };
        expect({ ...at, narrower: slope < -0.2 && slope > -0.5, fixed: stray < 2 }).toEqual({ ...at, narrower: true, fixed: true });
        expect({ ...at, top: top >= -1, floor: bottom <= ground }).toEqual({ ...at, top: true, floor: true });
      }
    }
  });

  test('the squash that fits a whirl on stage holds over the turn: no pulse at its top and bottom', () => {
    // desktop: it used to go −0.12 (the string's give at the sides) → +0.30 (top and bottom) twice a turn
    for (const [cy, R, f] of [[60, 40, 2], [60, 60, 2], [80, 60, 2.5], [100, 40, 2], [40, 25, 2.5]]) {
      const w = headlessWorld(480, 221);
      w.holdActor('pig', 240, 221 - HEAD);
      let lo = Infinity;
      let hi = -Infinity;
      let jump = 0;
      let last: number | null = null;
      for (let i = 0; i < 320; i++) {
        const t = i * 0.016;
        const k = Math.min(1, t / 0.3);
        w.moveHeld(240 + R * k * Math.cos(TAU * f * t), cy + R * k * Math.sin(TAU * f * t));
        w.update(16);
        const q = drawnArt(w).q;
        if (t > 2) {
          lo = Math.min(lo, q);
          hi = Math.max(hi, q);
          if (last !== null) jump = Math.max(jump, Math.abs(q - last));
        }
        last = q;
      }
      const at = { cy, R, f };
      expect({ ...at, steady: hi - lo < 0.1, noPop: jump < 0.05, max: hi <= 0.3 + 1e-9 }).toEqual({ ...at, steady: true, noPop: true, max: true });
    }
  });

  test('lifted to the top edge and held still, he hangs on the hand unsquashed', () => {
    // the head pokes nowhere past the grab point: only a swing up over the hand or going round fits him with squash
    for (const [lw, ground] of [[480, 221], [259, 252]]) {
      for (const by of ['head', 'tummy'] as const) {
        for (const y of [0, 2, 4]) {
          const w = headlessWorld(lw, ground);
          // picked up by the tummy, the pointer holds him 53 px below his grab point
          const y0 = by === 'head' ? ground - HEAD : ground - 55;
          const below = y0 - (ground - HEAD);
          w.holdActor('pig', lw / 2, y0);
          const air = heldActor(w).air;
          let fit = 0;
          let squash = 0;
          let give = 0;
          let top = Infinity;
          // lift him straight up over half a second, then hold still for a second (the squash he is drawn with over its
          // last half is his own, settled after the springy stop: no fit squash)
          for (let i = 0; i < 92; i++) {
            w.moveHeld(lw / 2, y0 + (y + below - y0) * minJerk(i / 30));
            w.update(16);
            if (i < 30) continue;
            const b = drawnArt(w);
            fit = Math.max(fit, air.fit);
            if (i >= 61) squash = Math.max(squash, Math.abs(b.q));
            give = Math.max(give, Math.hypot(air.gx, air.gy));
            top = Math.min(top, b.top);
          }
          const at = { lw, by, y };
          expect({ ...at, fit, unsquashed: squash < 0.02, give: give <= 5, onStage: top >= -1 }).toEqual({ ...at, fit: 0, unsquashed: true, give: true, onStage: true });
        }
      }
    }
  });

  test('whirled where his orbit fits, he stays on the hand', () => {
    // a T-layout desktop stage: a whirl round its middle has room for him, so his head stays at the hand
    const w = headlessWorld(480, 252);
    w.holdActor('pig', 240, 252 - HEAD);
    const air = heldActor(w).air;
    let give = 0;
    for (let i = 0; i < 320; i++) {
      const t = i * 0.016;
      const k = Math.min(1, t / 0.3);
      w.moveHeld(240 + 25 * k * Math.cos(TAU * 2 * t), 130 + 25 * k * Math.sin(TAU * 2 * t));
      w.update(16);
      if (t > 1.5) give = Math.max(give, Math.hypot(air.gx, air.gy));
    }
    expect(Math.abs(w.heldSwing()!.turns)).toBeGreaterThan(3);
    expect(give).toBeLessThan(1);
  });

  test('let go while his orbit is moved in, he leaves the way he was drawn moving', () => {
    // the hand's throw comes from timestamped samples: run the clock along with the frames
    const real = performance.now;
    let clock = 1e6;
    performance.now = () => clock;
    try {
      for (const [lw, ground, cy, R] of [[259, 252, 70, 30], [480, 221, 60, 40]]) {
        let worst = 0;
        let lo = Infinity;
        let hi = 0;
        for (let k = 0; k < 40; k++) {
          const w = headlessWorld(lw, ground);
          w.holdActor('pig', lw / 2, ground - HEAD);
          const body = heldActor(w).air.body;
          let x = 0;
          let y = 0;
          for (let i = 0; i < 150 + k; i++) {
            const t = i * 0.016;
            const e = Math.min(1, t / 0.3);
            [x, y] = [body.x, body.y];
            clock += 16;
            w.moveHeld(lw / 2 + R * e * Math.cos(TAU * 2 * t), cy + R * e * Math.sin(TAU * 2 * t), clock);
            w.update(16);
          }
          const drawn = Math.atan2(body.y - y, body.x - x);
          const v = w.heldThrow();
          worst = Math.max(worst, Math.abs(wrapAngle(Math.atan2(v.vy, v.vx) - drawn)));
          const ratio = Math.hypot(v.vx, v.vy) / (Math.hypot(body.x - x, body.y - y) / 0.016);
          lo = Math.min(lo, ratio);
          hi = Math.max(hi, ratio);
        }
        // (the give's own one-frame jump once launched him up to 2.7× too fast, or 30° and more off his drawn motion)
        expect({ lw, worst: worst < 30 * DEG, speed: lo > 0.75 && hi < 1.3 }).toEqual({ lw, worst: true, speed: true });
      }
    } finally {
      performance.now = real;
    }
  });

  test('a gentle drag keeps him on the hand: no give unless he swings up near the top', () => {
    const w = headlessWorld();
    w.holdActor('pig', 240, 150);
    const air = (w as unknown as { actors: Map<string, { air: { gx: number; gy: number } }> }).actors.get('pig')!.air;
    for (let i = 0; i <= 40; i++) {
      // drag him to the left edge and back, low on the stage
      w.moveHeld(240 - 230 * Math.sin((Math.PI * i) / 40), 120);
      w.update(16);
      expect([air.gx, air.gy]).toEqual([0, 0]);
    }
  });

  test('picked up below the head, he rises with the first pixel of a drag, and a flick from anywhere on him tosses him', async () => {
    // the hand's throw comes from timestamped samples: run the clock along with the frames
    const real = performance.now;
    let clock = 1e6;
    performance.now = () => clock;
    try {
      // desktop (ground 221: 2.67 CSS px per logical px) and a phone; pressed on his head, face and tummy (frame rows; his
      // grab point is row 6). The pointer used to have to rise past his head first: 160-210 CSS px from the tummy on
      // desktop, and a flick from there barely hopped him (6-14 px against 110 from the head)
      for (const [lw, ground] of [[480, 221], [259, 252]]) {
        const flew: Record<string, number> = {};
        for (const [part, row] of [['head', 20], ['face', 63], ['tummy', 82]] as const) {
          const w = headlessWorld(lw, ground);
          const x0 = lw / 2;
          const y0 = ground - FRAME_PIVOT_Y + row;
          w.holdActor('pig', x0, y0);
          const air = heldActor(w).air;
          const rest = air.hand.y;
          // a slow drag up, 1 px a frame
          for (let i = 1; i <= 10; i++) {
            clock += 16;
            w.moveHeld(x0, y0 - i, clock);
            w.update(16);
          }
          const rose = rest - (air.hand.y + air.gy);
          expect({ lw, part, rose: rose >= 9 }).toEqual({ lw, part, rose: true });
          // a flick up and to the right (41, −64 px in 150 ms; the pointer reports every 8 ms), let go while still moving
          const [x1, y1] = [x0, y0 - 10];
          let sent = 0;
          for (let f = 0; f < 8; f++) {
            for (; sent <= (f + 1) * 16 && sent <= 120; sent += 8) w.moveHeld(x1 + 41 * minJerk(sent / 150), y1 - 64 * minJerk(sent / 150), clock + sent);
            clock += 16;
            w.update(16);
          }
          const landing = w.releaseHeld();
          let apex = Infinity;
          for (let i = 0; i < 300; i++) {
            clock += 16;
            w.update(16);
            apex = Math.min(apex, (w as unknown as { actors: Map<string, { air: { body: { y: number } } }> }).actors.get('pig')!.air.body.y);
          }
          flew[part] = ground - FRAME_PIVOT_Y + BODY_CY - apex;
          expect((await landing).kind).not.toBe('gone');
        }
        // he flies about as high whichever part of him the flick held
        expect({ lw, head: flew.head > 60, face: flew.face > 0.85 * flew.head, tummy: flew.tummy > 0.85 * flew.head }).toEqual({ lw, head: true, face: true, tummy: true });
      }
    } finally {
      performance.now = real;
    }
  });

  test('reduce motion: he hangs straight while whirled and drops straight down', async () => {
    const w = headlessWorld();
    w.setReduceMotion(true);
    w.holdActor('pig', 240, 150);
    whirl(w, 150);
    const sw = w.heldSwing()!;
    expect(sw.angle).toBe(0);
    expect(sw.turns).toBe(0);
    expect(sw.whirl).toBeGreaterThan(0.5); // the circling hand still counts as a whirl (not a rub to tickle)
    const landing = w.releaseHeld();
    for (let i = 0; i < 400; i++) w.update(16);
    const r = await landing;
    expect([r.vx, r.vy]).toEqual([0, 0]);
  });
});

describe('leaving the hub mid-toss (the stage outlives the screen)', () => {
  test('removing the actor mid-flight ends the throw as gone and leaves nothing behind', async () => {
    const w = headlessWorld();
    w.holdActor('pig', 240, 150);
    whirl(w, 60);
    const landing = w.releaseHeld({ vx: 600, vy: -500 });
    w.update(16);
    expect(w.isAirborne('pig')).toBe(true);
    w.bubble('pig', 'Wheee!');
    w.removeActor('pig');
    const r = await landing;
    expect(r.kind).toBe('gone');
    expect(w.isAirborne('pig')).toBe(false);
    expect(w.actorPosition('pig')).toBeNull();
    expect(w.bubbles).toHaveLength(0);
    // a landing reaction that is still running can't bring him back (clips on a missing actor are no-ops)
    await w.playAnim('pig', 'laugh', { loop: true });
    for (let i = 0; i < 100; i++) w.update(16);
    expect(w.actorPosition('pig')).toBeNull();
    expect(w.describe()).not.toContain('Piggy 1');
  });

  test('his reaction bursts can be cleared with him (nothing left floating over the next screen)', () => {
    const w = headlessWorld();
    const live = () => (w as unknown as { bursts: { pool: { on: boolean }[] } }).bursts.pool.some((p) => p.on);
    w.burstOn('pig', 'hearts');
    w.burstOn('pig', 'sparkles');
    w.update(16);
    expect(live()).toBe(true);
    w.removeActor('pig');
    w.clearBursts();
    expect(live()).toBe(false);
    for (let i = 0; i < 10; i++) w.update(16);
    expect(live()).toBe(false);
  });

  test('removing a held actor ends the hold', async () => {
    const w = headlessWorld();
    w.holdActor('pig', 240, 150);
    whirl(w, 30);
    w.removeActor('pig');
    expect(w.heldActor()).toBeNull();
    expect(w.heldSwing()).toBeNull();
    expect((await w.releaseHeld()).kind).toBe('gone');
    expect(w.holdActor('pig', 240, 150)).toBe(false);
  });

  test('a throw still in the air when the last view goes lands at once', async () => {
    const w = headlessWorld();
    w.holdActor('pig', 240, 150);
    const landing = w.releaseHeld({ vx: 300, vy: -400 });
    w.update(16);
    w.detach((w as unknown as { view: never }).view);
    const r = await landing;
    expect(r.kind).toBe('drop');
    expect(w.isAirborne('pig')).toBe(false);
  });
});
