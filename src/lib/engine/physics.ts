// Pick-up physics for hub actors (pure: plain numbers in, state objects mutated in place, no DOM, no clock,
// no allocation per step).
//   Dangle — a damped pendulum hanging from the grab point, driven by the pointer's acceleration.
//   Flight — gravity, wall/ceiling/floor bounces with restitution, ground friction, coming to rest.
//   Throw  — release velocity from the last ~80 ms of pointer samples, capped.
//   Drop   — what kind of landing that was (gentle put-down, short drop, hard fall/fast throw, upward pop).

const TAU = Math.PI * 2;

/** Angle wrapped into (−π, π]. */
export function wrapAngle(a: number): number {
  if (!Number.isFinite(a)) return 0;
  const w = a - TAU * Math.round(a / TAU);
  return w <= -Math.PI ? w + TAU : w;
}

/** Scale (vx, vy) down to at most `max` length (non-finite input → 0). Writes into `out`. */
export function capSpeed<T extends { vx: number; vy: number }>(vx: number, vy: number, max: number, out: T): T {
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
    out.vx = 0;
    out.vy = 0;
    return out;
  }
  const m = Math.hypot(vx, vy);
  const k = m > max && m > 0 ? max / m : 1;
  out.vx = vx * k;
  out.vy = vy * k;
  return out;
}

// ───────────────────────── springs ─────────────────────────

export interface Spring {
  value: number;
  vel: number;
}

/** Damped spring toward `target` (stiffness k in 1/s², damping c in 1/s), sub-stepped for stability. */
export function stepSpring(s: Spring, dtMs: number, target: number, k: number, c: number): void {
  let rest = Math.min(Math.max(0, dtMs), 100) / 1000;
  while (rest > 1e-6) {
    const dt = Math.min(rest, 1 / 240);
    rest -= dt;
    s.vel += (k * (target - s.value) - c * s.vel) * dt;
    s.value += s.vel * dt;
  }
}

// ───────────────────────── dangle (pendulum) ─────────────────────────

export interface Dangle {
  /** Canvas rotation of the body around the grab point (rad, clockwise positive: the body swings left). */
  angle: number;
  /** rad/s */
  vel: number;
}

export interface DangleParams {
  /** Pendulum gravity, logical px/s² (a little "lighter" than free fall reads well). */
  gravity: number;
  /** Grab point → body center, logical px. */
  length: number;
  /** Velocity damping, 1/s. */
  damping: number;
  /** Swing limit either way, rad. */
  maxAngle: number;
  /**
   * How much of the hand's acceleration reaches the body (1 = a free pendulum). Held by the scruff he is
   * stiffer than that: a slow drag tilts him a few degrees, a fast one swings him well out.
   */
  drive: number;
}

export const DANGLE: DangleParams = { gravity: 1800, length: 57, damping: 3.2, maxAngle: 1.15, drive: 0.55 };

/**
 * Advance the pendulum with the grab point accelerating at (ax, ay) px/s² (y down):
 * φ'' = k·(ax·cos φ − (g/k − ay)·sin φ) / L − c·φ' with k = drive. Dragging right swings the body left, then back.
 */
export function stepDangle(d: Dangle, dtMs: number, ax: number, ay: number, p: DangleParams = DANGLE): void {
  const k = p.drive;
  const ex = (Number.isFinite(ax) ? ax : 0) * k;
  // never let a downward yank flip the pendulum over: keep at least 20% of gravity
  const g = Math.max(p.gravity * 0.2, p.gravity - (Number.isFinite(ay) ? ay : 0) * k);
  let rest = Math.min(Math.max(0, dtMs), 100) / 1000;
  while (rest > 1e-6) {
    const dt = Math.min(rest, 1 / 240);
    rest -= dt;
    const acc = (ex * Math.cos(d.angle) - g * Math.sin(d.angle)) / p.length - p.damping * d.vel;
    d.vel += acc * dt;
    d.angle += d.vel * dt;
    if (d.angle > p.maxAngle) {
      d.angle = p.maxAngle;
      if (d.vel > 0) d.vel = 0;
    } else if (d.angle < -p.maxAngle) {
      d.angle = -p.maxAngle;
      if (d.vel < 0) d.vel = 0;
    }
  }
}

// ───────────────────────── free flight ─────────────────────────

export interface FlightBody {
  /** Body center, logical px. */
  x: number;
  y: number;
  /** px/s */
  vx: number;
  vy: number;
  /** Canvas rotation around the body center (rad) and its rate (rad/s). */
  angle: number;
  spin: number;
  /** Resting on the floor (no more bounces). */
  grounded: boolean;
  /** Floor bounces, wall hits and ceiling hits so far. */
  bounces: number;
  walls: number;
  ceiling: number;
  /** Fastest floor / wall impact so far (px/s). */
  impact: number;
  wallImpact: number;
  /** Speed of the most recent contact (px/s). */
  hitSpeed: number;
}

export function newFlightBody(): FlightBody {
  return {
    x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, grounded: false,
    bounces: 0, walls: 0, ceiling: 0, impact: 0, wallImpact: 0, hitSpeed: 0,
  };
}

/** Put a body back in the air at (x, y) with a velocity; clears the contact stats. */
export function launchBody(b: FlightBody, x: number, y: number, vx: number, vy: number, angle = 0, spin = 0): FlightBody {
  b.x = x;
  b.y = y;
  b.vx = Number.isFinite(vx) ? vx : 0;
  b.vy = Number.isFinite(vy) ? vy : 0;
  b.angle = wrapAngle(angle);
  b.spin = Number.isFinite(spin) ? spin : 0;
  b.grounded = false;
  b.bounces = b.walls = b.ceiling = 0;
  b.impact = b.wallImpact = b.hitSpeed = 0;
  return b;
}

/** The box the body center must stay in: walls at left/right, the stage top, and the floor (feet line). */
export interface FlightBounds {
  left: number;
  right: number;
  top: number;
  floor: number;
}

export interface FlightParams {
  /** px/s² */
  gravity: number;
  /** Floor bounce: vy ← −vy·restitution. */
  restitution: number;
  /** Walls and ceiling. */
  wallRestitution: number;
  /** At most this many floor bounces before coming to rest. */
  maxBounces: number;
  /** Floor impacts slower than this stop instead of bouncing (px/s). */
  minBounceSpeed: number;
  /** Horizontal speed kept per floor bounce. */
  bounceFriction: number;
  /** Exponential horizontal decay while sliding on the floor (1/s) and in the air (1/s). */
  groundFriction: number;
  airDrag: number;
  /** Spin decay in the air (1/s). */
  spinDamping: number;
  /** Rate at which a grounded body rights itself (1/s). */
  uprightRate: number;
  /** Half extents of the upright body box around its center (px). */
  halfW: number;
  halfH: number;
  /** Below this horizontal speed (px/s) and upright, a grounded body has settled. */
  settleSpeed: number;
}

export const FLIGHT: FlightParams = {
  gravity: 900,
  restitution: 0.35,
  wallRestitution: 0.45,
  maxBounces: 2,
  minBounceSpeed: 110,
  bounceFriction: 0.8,
  groundFriction: 10,
  airDrag: 0.15,
  spinDamping: 0.7,
  uprightRate: 18,
  halfW: 30,
  halfH: 51,
  settleSpeed: 8,
};

/** Reduced motion: straight down, no bounce, no spin. */
export const FLIGHT_REDUCED: FlightParams = { ...FLIGHT, restitution: 0, wallRestitution: 0, maxBounces: 0, spinDamping: 50, uprightRate: 1000 };

export const HIT_FLOOR = 1;
export const HIT_WALL = 2;
export const HIT_CEILING = 4;
/** First time the body comes to rest on the floor. */
export const LANDED = 8;
/** Grounded, upright and (almost) still. */
export const SETTLED = 16;

/** Half extents of the body box rotated by `angle` (axis-aligned bounding box). Writes into `out`. */
export function bodyExtents<T extends { ex: number; ey: number }>(angle: number, p: FlightParams, out: T): T {
  const s = Math.abs(Math.sin(angle));
  const c = Math.abs(Math.cos(angle));
  out.ex = p.halfW * c + p.halfH * s;
  out.ey = p.halfW * s + p.halfH * c;
  return out;
}

const EXT = { ex: 0, ey: 0 };

/**
 * One physics step (sub-stepped at ≤ 1/120 s; dt is clamped to 100 ms). Mutates `b`, returns HIT_* / LANDED /
 * SETTLED bits for what happened during this step. The body never leaves `bounds`.
 */
export function stepFlight(b: FlightBody, dtMs: number, bounds: FlightBounds, p: FlightParams = FLIGHT): number {
  let events = 0;
  let rest = Math.min(Math.max(0, Number.isFinite(dtMs) ? dtMs : 0), 100) / 1000;
  while (rest > 1e-6) {
    const dt = Math.min(rest, 1 / 120);
    rest -= dt;
    if (b.grounded) {
      b.vy = 0;
      b.vx *= Math.exp(-p.groundFriction * dt);
      b.x += b.vx * dt;
      b.angle = wrapAngle(b.angle) * Math.exp(-p.uprightRate * dt);
      b.spin = 0;
    } else {
      b.vy += p.gravity * dt;
      b.vx *= Math.exp(-p.airDrag * dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.spin * dt;
      b.spin *= Math.exp(-p.spinDamping * dt);
    }
    events |= collide(b, bounds, p);
  }
  if (b.grounded) {
    b.angle = wrapAngle(b.angle);
    if (Math.abs(b.angle) < 0.002) b.angle = 0;
    if (Math.abs(b.vx) < p.settleSpeed && Math.abs(b.angle) < 0.03) events |= SETTLED;
  }
  return events;
}

function collide(b: FlightBody, bounds: FlightBounds, p: FlightParams): number {
  let events = 0;
  const { ex, ey } = bodyExtents(b.angle, p, EXT);
  // walls (a stage narrower than the body pins it to the middle)
  if (bounds.right - bounds.left <= ex * 2) {
    b.x = (bounds.left + bounds.right) / 2;
    b.vx = 0;
  } else if (b.x - ex < bounds.left) {
    b.x = bounds.left + ex;
    if (b.vx < 0) events |= wallHit(b, p);
  } else if (b.x + ex > bounds.right) {
    b.x = bounds.right - ex;
    if (b.vx > 0) events |= wallHit(b, p);
  }
  // ceiling
  if (b.y - ey < bounds.top) {
    b.y = bounds.top + ey;
    if (b.vy < 0) {
      b.hitSpeed = -b.vy;
      b.vy = -b.vy * p.wallRestitution;
      b.spin *= 0.6;
      b.ceiling++;
      events |= HIT_CEILING;
    }
  }
  // floor (wins over the ceiling when the stage is too short for the body)
  if (b.grounded) {
    b.y = bounds.floor - ey;
  } else if (b.y + ey >= bounds.floor) {
    b.y = bounds.floor - ey;
    if (b.vy >= 0) {
      b.hitSpeed = b.vy;
      if (b.vy > b.impact) b.impact = b.vy;
      events |= HIT_FLOOR;
      if (b.vy > p.minBounceSpeed && b.bounces < p.maxBounces) {
        b.vy = -b.vy * p.restitution;
        b.vx *= p.bounceFriction;
        b.spin *= 0.5;
        b.bounces++;
      } else {
        b.vy = 0;
        b.grounded = true;
        events |= LANDED;
      }
    }
  }
  return events;
}

function wallHit(b: FlightBody, p: FlightParams): number {
  const v = Math.abs(b.vx);
  b.hitSpeed = v;
  if (v > b.wallImpact) b.wallImpact = v;
  b.vx = -b.vx * p.wallRestitution;
  b.spin = -b.spin * 0.5;
  b.walls++;
  return HIT_WALL;
}

// ───────────────────────── throw velocity ─────────────────────────

/** Fixed-size ring buffer of pointer samples (time ms, x, y). */
export class PointerTrail {
  readonly t: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  private n = 0;
  private head = 0;

  constructor(readonly size = 16) {
    this.t = new Float64Array(size);
    this.x = new Float64Array(size);
    this.y = new Float64Array(size);
  }

  get length(): number {
    return this.n;
  }

  clear(): void {
    this.n = 0;
    this.head = 0;
  }

  push(t: number, x: number, y: number): void {
    if (!Number.isFinite(t) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    // keep time monotonic (mixed clocks / reordered events)
    if (this.n > 0 && t < this.t[this.index(0)]) t = this.t[this.index(0)];
    this.t[this.head] = t;
    this.x[this.head] = x;
    this.y[this.head] = y;
    this.head = (this.head + 1) % this.size;
    if (this.n < this.size) this.n++;
  }

  /** Buffer index of the i-th newest sample (0 = newest). */
  index(i: number): number {
    return (this.head - 1 - i + this.size * 2) % this.size;
  }
}

/** Release window and cap used for throws. */
export const THROW_WINDOW_MS = 80;
export const MAX_THROW = 1100;

/**
 * Throw velocity (px/s) from the samples of the last `windowMs` before `now`, capped at `maxSpeed`.
 * A pointer that stopped before letting go (newest sample older than the window) throws nothing.
 */
export function throwVelocity<T extends { vx: number; vy: number }>(
  trail: PointerTrail, now: number, out: T, windowMs = THROW_WINDOW_MS, maxSpeed = MAX_THROW,
): T {
  out.vx = 0;
  out.vy = 0;
  const n = trail.length;
  if (n < 2) return out;
  const newest = trail.index(0);
  const tN = trail.t[newest];
  if (now - tN > windowMs) return out;
  let oldest = newest;
  for (let i = 1; i < n; i++) {
    const j = trail.index(i);
    if (now - trail.t[j] > windowMs) break;
    oldest = j;
  }
  if (oldest === newest) {
    // one sample in the window: pair it with the previous one if that is not stale
    const j = trail.index(1);
    if (now - trail.t[j] > windowMs * 2) return out;
    oldest = j;
  }
  const dt = (tN - trail.t[oldest]) / 1000;
  if (!(dt >= 0.004)) return out;
  return capSpeed((trail.x[newest] - trail.x[oldest]) / dt, (trail.y[newest] - trail.y[oldest]) / dt, maxSpeed, out);
}

// ───────────────────────── landing kinds ─────────────────────────

export type DropKind = 'soft' | 'drop' | 'hard' | 'pop';

export interface DropStats {
  /** Throw velocity at release (px/s, y down). */
  vx: number;
  vy: number;
  /** Fastest floor impact (px/s), fastest wall impact, ceiling hits. */
  impact: number;
  wallImpact: number;
  ceiling: number;
}

export const DROP_RULES = {
  /** Upward flick of at least this (px/s), mostly vertical and not violent → a "pop". */
  popMinUp: 150,
  popMaxSpeed: 750,
  /** A throw this fast, or a floor/wall impact this hard (≈ a 60 px fall), is a hard landing. */
  hardThrow: 750,
  hardImpact: 330,
  hardWall: 320,
  /** Set down from ≲ 12 px without a throw = gentle put-down. */
  softImpact: 150,
  softSpeed: 170,
};

/** gentle put-down → 'soft', short drop → 'drop', high drop / fast throw / ceiling bonk → 'hard', upward flick → 'pop'. */
export function classifyDrop(s: DropStats, r = DROP_RULES): DropKind {
  if (s.ceiling > 0) return 'hard';
  const speed = Math.hypot(s.vx, s.vy);
  const up = -s.vy;
  if (up >= r.popMinUp && Math.abs(s.vx) <= up * 0.9 && speed <= r.popMaxSpeed) return 'pop';
  if (speed >= r.hardThrow || s.impact >= r.hardImpact || s.wallImpact >= r.hardWall) return 'hard';
  if (s.impact < r.softImpact && speed < r.softSpeed) return 'soft';
  return 'drop';
}
