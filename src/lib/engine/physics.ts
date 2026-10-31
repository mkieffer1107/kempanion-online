// Pick-up physics for hub actors (pure: plain numbers in, state objects mutated in place, no DOM, no clock,
// no allocation per step).
//   Swing  — the held body on a short, slightly elastic string from the hand: a driven pendulum with no angle limit,
//            so a whirling hand spins him round it.
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

// ───────────────────────── swing (held: a weight on a string) ─────────────────────────
//
// The held body hangs from the hand on a short, slightly elastic string: a driven pendulum in polar coordinates
// around the grab point (angle φ, length r), in the hand's accelerating frame (y down):
//   φ'' = (k·ax·cos φ − (g − k·ay)·sin φ − 2·r'·φ') / r − c·φ' − d·φ'·|φ'| + grip·(Ω − φ')⁺
//   r'' = r·φ'² + k·ax·sin φ + (g − k·ay)·cos φ − ω²·(r − r₀) − 2·ζ·ω·r'
// k is how much of the hand's acceleration reaches him. Held by the scruff he is stiffer than a free weight: gentle
// drags only tilt him, a yank down leaves him at least a fifth of his weight (bobbing him can't pump him over the top),
// and a swing heading over the top is braked, so shaking back and forth only swings him high — a real hand's shake
// too, with its wrist arc and the small loop it draws at each end. Going round takes a whirl: once the hand circles
// (its path bends harder than gravity, and is round: not a back-and-forth with a thin loop) he hangs free (k → 1) and
// lighter, the damping lightens, and grip friction pulls him round with the circling hand (Ω = its turn rate; it only
// ever pulls, never brakes). A whirl that took him round leaves him swinging free until he runs down. While whirling,
// the drive is a quick (less smoothed) estimate of the hand's acceleration, carried forward by its turn over the
// estimate's delay, so he points out along the circle's radius instead of trailing it; the string's give follows the
// steadier estimate. The hand is tracked from each pointer report at its own time and held between reports
// (sampleHand / holdHand), so a pointer slower than the display, or beating against it, doesn't read as a hand that
// keeps stopping. There is no angle limit: keep circling and he goes round and round, feet out and head toward the
// hand, on a circle as wide as the hand's own plus the string. Energy stays bounded (damping, quadratic drag, a spin
// cap) and the integration is sub-stepped at 1/240 s with frame times clamped to 100 ms.

export interface Swing {
  /**
   * String angle, also the body's canvas rotation (rad, in (−π, π]): 0 = hanging straight down, positive = the body
   * out to the left of the hand (clockwise on screen). The body center sits at hand + len·(−sin φ, cos φ).
   */
  angle: number;
  /** rad/s */
  vel: number;
  /** Grab point → body center (logical px; the string gives a little) and its rate (px/s). */
  len: number;
  lenVel: number;
  /**
   * The hand's path, smoothed: signed centripetal acceleration (px/s², + = clockwise on screen) from its capped
   * acceleration (`bend`) and from the turning of its direction of travel (`arc`, uncapped), its speed (px/s), and
   * the turn rate they give (rad/s).
   */
  bend: number;
  arc: number;
  speed: number;
  turn: number;
  /**
   * How round its path is: v × a, |v|² and |a|² smoothed, and from them 0..1 (1 = a circle, 2ab / (a² + b²) for an
   * ellipse with axes a, b: a shake with a thin loop in it is near 0).
   */
  cross: number;
  vv: number;
  aa: number;
  round: number;
  /** 0..1: how hard the hand is whirling (|bend| against gravity, on a round path). */
  whirl: number;
  /** 0..1: swinging free (full drive, light damping) since a whirl took him round, until he runs down. */
  free: number;
}

/** The hand (grab point) right now: velocity (px/s) and acceleration (px/s²), y down. */
export interface HandMotion {
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  /** A quicker (less smoothed, noisier) estimate of the acceleration: it drives a whirl. Defaults to (ax, ay). */
  qax?: number;
  qay?: number;
  /** How fast its direction of travel turns (rad/s, + = clockwise on screen; 0 while it is nearly still). */
  turn?: number;
  /**
   * How far (s) the quick estimate trails the hand where the pointer last reported it (where it is drawn: he points out
   * from his own head, not from where the hand may have got to since). Defaults to its smoothing over the step.
   */
  lag?: number;
}

/** A tracked hand: where it is, plus its velocity and acceleration smoothed from the stream of positions. */
export interface HandTrack extends HandMotion {
  x: number;
  y: number;
  /** The quick estimate's own velocity (px/s) and acceleration (px/s²). */
  qvx: number;
  qvy: number;
  qax: number;
  qay: number;
  turn: number;
  /**
   * Its clock (ms, the caller's): when it was last tracked; when the pointer last reported it (sampleHand), and when
   * that report came in (reports arrive a while after they are made: tens of ms for touch); and the usual time between
   * reports (ms).
   */
  t: number;
  st: number;
  at: number;
  gap: number;
  lag: number;
}

/**
 * Smoothing (ms) of the hand's velocity and acceleration, and of their quick estimate (it lags less and jitters more),
 * and the cap on an acceleration's length (px/s²).
 */
export const HAND_SMOOTH_MS = 28;
export const HAND_QUICK_MS = 12;
export const HAND_MAX_ACC = 9000;
/** A pointer quiet this long (ms), and for a few of its usual gaps, has stopped. */
export const HAND_REST_MS = 30;

/** A tracked hand at rest at (x, y), its clock at `t` (ms). */
export function newHand(x = 0, y = 0, t = 0): HandTrack {
  const h: HandTrack = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, qvx: 0, qvy: 0, qax: 0, qay: 0, turn: 0, t: 0, st: 0, at: 0, gap: 0, lag: 0 };
  return resetHand(h, x, y, t);
}

/** Start tracking a hand at rest at (x, y), its clock at `t` (ms). */
export function resetHand(h: HandTrack, x: number, y: number, t = 0): HandTrack {
  h.x = Number.isFinite(x) ? x : 0;
  h.y = Number.isFinite(y) ? y : 0;
  h.vx = h.vy = h.ax = h.ay = 0;
  h.qvx = h.qvy = h.qax = h.qay = h.turn = 0;
  h.t = h.st = h.at = Number.isFinite(t) ? t : 0;
  h.gap = 1000 / 60;
  h.lag = 0;
  return h;
}

/** How far (ms) the quick estimate trails the hand after a step of `ms`: half a step for each difference, plus its two smoothings. */
function quickDelay(ms: number): number {
  if (!(ms > 0)) return 0;
  const e = Math.exp(-ms / HAND_QUICK_MS);
  return ms + (2 * ms * e) / (1 - e);
}

/**
 * The pointer reported the hand at (x, y) at time `t` (ms, the hand's clock), and the report came in at `at` (default:
 * at once): track it from where it was last. A report less than 1 ms after the last only moves it.
 */
export function sampleHand(h: HandTrack, t: number, x: number, y: number, at = t): void {
  if (!Number.isFinite(t) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const gap = t - h.st;
  if (gap > 0 && gap < 100) h.gap += (gap - h.gap) * 0.25;
  if (t > h.st) h.st = t;
  if (at > h.at) h.at = at;
  if (t - h.t >= 1) trackHand(h, t - h.t, x, y);
  else {
    h.x = x;
    h.y = y;
  }
}

/**
 * A frame at time `now` (ms, the hand's clock). Between the pointer's reports the hand keeps its estimates (it is still
 * moving, only not reported yet: reading that as a stop would brake it every frame the pointer skips). When no report
 * has come in for a few of its usual gaps, it has stopped: it is tracked standing still, up to as long after its
 * newest report as that came in ago (reports arrive late; the hand's clock keeps to theirs).
 */
export function holdHand(h: HandTrack, now: number): void {
  const quiet = now - h.at;
  if (!(quiet > Math.max(HAND_REST_MS, 2.5 * h.gap))) return;
  const t = h.st + quiet;
  if (t > h.t) trackHand(h, t - h.t, h.x, h.y);
}

/**
 * The hand moved to (x, y) over `dtMs`: update its smoothed velocity and (capped: lively, not floppy) acceleration,
 * their quick estimate, and how fast its direction of travel turns. Advances its clock by `dtMs`.
 */
export function trackHand(h: HandTrack, dtMs: number, x: number, y: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const s = (Number.isFinite(dtMs) ? dtMs : 0) / 1000;
  if (s > 0) {
    h.t += dtMs;
    h.lag = quickDelay(dtMs) / 1000;
    const rx = (x - h.x) / s;
    const ry = (y - h.y) / s;
    const f = 1 - Math.exp(-dtMs / HAND_SMOOTH_MS);
    const vx = h.vx;
    const vy = h.vy;
    h.vx += (rx - h.vx) * f;
    h.vy += (ry - h.vy) * f;
    let ax = (h.vx - vx) / s;
    let ay = (h.vy - vy) / s;
    let m = Math.hypot(ax, ay);
    if (m > HAND_MAX_ACC) {
      ax *= HAND_MAX_ACC / m;
      ay *= HAND_MAX_ACC / m;
    }
    h.ax += (ax - h.ax) * f;
    h.ay += (ay - h.ay) * f;
    // its direction of travel: barely moving, or turning back on itself, is no turn
    const d = Math.hypot(vx, vy) > 40 && Math.hypot(h.vx, h.vy) > 40 ? wrapAngle(Math.atan2(h.vy, h.vx) - Math.atan2(vy, vx)) : 0;
    h.turn = Math.abs(d) < 1.2 ? d / s : 0;
    const q = 1 - Math.exp(-dtMs / HAND_QUICK_MS);
    const qvx = h.qvx;
    const qvy = h.qvy;
    h.qvx += (rx - h.qvx) * q;
    h.qvy += (ry - h.qvy) * q;
    ax = (h.qvx - qvx) / s;
    ay = (h.qvy - qvy) / s;
    m = Math.hypot(ax, ay);
    if (m > HAND_MAX_ACC) {
      ax *= HAND_MAX_ACC / m;
      ay *= HAND_MAX_ACC / m;
    }
    h.qax += (ax - h.qax) * q;
    h.qay += (ay - h.qay) * q;
  }
  h.x = x;
  h.y = y;
}

export interface SwingParams {
  /** Pendulum gravity, logical px/s² (a little "heavier" than the flight's: a lively dangle). */
  gravity: number;
  /** Grab point → body center at rest, logical px (the hang distance of the 'held' frames). */
  length: number;
  /** Share of the hand's acceleration that reaches a dangling body (1 = a free weight). */
  drive: number;
  /** Least share of his weight a yank down leaves him while he isn't whirled, and the share he keeps while whirled. */
  minGravity: number;
  whirlGravity: number;
  /** Velocity damping (1/s) for small swings, and for big swings and spins. */
  damping: number;
  freeDamping: number;
  /** Quadratic air drag (1/rad) and a hard cap on the spin rate (rad/s). */
  drag: number;
  maxSpin: number;
  /** Swing energy (0 = hanging still, 1 = just reaching the top) over which the damping fades to `freeDamping`… */
  dampFrom: number;
  dampTo: number;
  /** …and over which the full drive comes in (he is going round)… */
  driveFrom: number;
  driveTo: number;
  /** …once a whirl over this range has taken him round (shaking alone never does). */
  freeFrom: number;
  freeTo: number;
  /** Scruff brake (1/s) on a swing heading over the top with no whirl behind it, over these swing energies. */
  brake: number;
  brakeFrom: number;
  brakeTo: number;
  /** The hand's centripetal acceleration (× gravity) over which circling counts as whirling, and its smoothing (ms). */
  whirlFrom: number;
  whirlTo: number;
  whirlTau: number;
  /**
   * Roundness over which a bending path counts as circling (a back-and-forth shake with a thin loop, or along a wrist's
   * arc, doesn't), and its smoothing (ms: about a slow shake's sweep, so one sweep along an arc can't pass for a turn).
   */
  roundFrom: number;
  roundTo: number;
  roundTau: number;
  /** Whirl over which the turn rate comes from the hand's direction of travel (big fast circles cap its acceleration). */
  turnFrom: number;
  turnTo: number;
  /** Grip friction while whirling (1/s): the circling hand drags him round with it (it never brakes him). */
  grip: number;
  /** How late he answers the drive himself (ms): a whirl's drive is carried forward by this too. */
  lead: number;
  /** String elasticity: radial natural frequency (rad/s), damping ratio, and the most it stretches (fraction). */
  stretch: number;
  stretchDamping: number;
  maxStretch: number;
}

export const SWING: SwingParams = {
  gravity: 1800,
  length: 57,
  drive: 0.55,
  minGravity: 0.2,
  whirlGravity: 0.5,
  damping: 3,
  freeDamping: 0.7,
  drag: 0.006,
  maxSpin: 25,
  dampFrom: 0.45,
  dampTo: 0.9,
  driveFrom: 0.85,
  driveTo: 1.1,
  freeFrom: 0.2,
  freeTo: 0.4,
  brake: 20,
  brakeFrom: 0.6,
  brakeTo: 0.95,
  whirlFrom: 0.3,
  whirlTo: 1.2,
  whirlTau: 250,
  roundFrom: 0.3,
  roundTo: 0.55,
  roundTau: 450,
  turnFrom: 0.5,
  turnTo: 0.9,
  grip: 4,
  lead: 5,
  stretch: 52,
  stretchDamping: 0.5,
  maxStretch: 0.12,
};

export function newSwing(p: SwingParams = SWING): Swing {
  const s: Swing = {
    angle: 0, vel: 0, len: 0, lenVel: 0, bend: 0, arc: 0, speed: 0, turn: 0, cross: 0, vv: 0, aa: 0, round: 0, whirl: 0, free: 0,
  };
  return resetSwing(s, 0, 0, p);
}

/**
 * Hang a swing at an angle (rad) with a rate (rad/s): string at rest length, no whirl. Caught with enough swing to go
 * over the top, he swings free.
 */
export function resetSwing(s: Swing, angle = 0, vel = 0, p: SwingParams = SWING): Swing {
  s.angle = wrapAngle(angle);
  s.vel = Number.isFinite(vel) ? Math.max(-p.maxSpin, Math.min(p.maxSpin, vel)) : 0;
  s.len = p.length;
  s.lenVel = 0;
  s.bend = s.arc = s.speed = s.turn = s.whirl = 0;
  s.cross = s.vv = s.aa = s.round = 0;
  s.free = swingEnergy(s, p) >= p.dampFrom ? 1 : 0;
  return s;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Effective gravity `g`, kept at `min` or more by the scruff while he isn't whirled. */
const scruff = (g: number, min: number, whirl: number) => (g < min ? g + (min - g) * (1 - whirl) : g);

/** Swing energy relative to the hand: 0 = hanging still, 1 = just enough to reach the top, more = going round. */
export function swingEnergy(s: Swing, p: SwingParams = SWING): number {
  return (s.len * s.vel * s.vel) / (4 * p.gravity) + (1 - Math.cos(s.angle)) / 2;
}

/**
 * Follow the hand's turning over `dtMs`: v × a / |v| is the centripetal acceleration of its path (smoothed into
 * `bend`, with its speed into `speed`) and says how hard it circles (`whirl`), if its path is round (a shake bends
 * hard at each turnaround, and a thin loop in it would read as circling); bend / speed is its turn rate. A real whirl
 * takes the rate from the turning of its direction of travel instead (`arc`): big fast circles cap the acceleration.
 * stepSwing calls this itself; call it alone to tell a whirl from a rub while the swing is frozen (reduced motion).
 */
export function trackWhirl(s: Swing, dtMs: number, hand: HandMotion, p: SwingParams = SWING): void {
  const ms = Math.min(Math.max(0, Number.isFinite(dtMs) ? dtMs : 0), 100);
  const vx = Number.isFinite(hand.vx) ? hand.vx : 0;
  const vy = Number.isFinite(hand.vy) ? hand.vy : 0;
  const ax = Number.isFinite(hand.ax) ? hand.ax : 0;
  const ay = Number.isFinite(hand.ay) ? hand.ay : 0;
  const v = Math.hypot(vx, vy);
  const moving = v > 40; // px/s
  const bend = moving ? (vx * ay - vy * ax) / v : 0;
  const turn = hand.turn ?? NaN;
  const f = 1 - Math.exp(-ms / p.whirlTau);
  s.bend += (bend - s.bend) * f;
  s.arc += ((moving ? (Number.isFinite(turn) ? v * turn : bend) : 0) - s.arc) * f;
  s.speed += ((moving ? v : 0) - s.speed) * f;
  const fr = 1 - Math.exp(-ms / p.roundTau);
  s.cross += ((moving ? vx * ay - vy * ax : 0) - s.cross) * fr;
  s.vv += ((moving ? vx * vx + vy * vy : 0) - s.vv) * fr;
  s.aa += ((moving ? ax * ax + ay * ay : 0) - s.aa) * fr;
  if (!Number.isFinite(s.bend + s.arc + s.speed + s.cross + s.vv + s.aa)) s.bend = s.arc = s.speed = s.cross = s.vv = s.aa = 0;
  s.round = s.vv > 0 && s.aa > 0 ? Math.min(1, Math.abs(s.cross) / Math.sqrt(s.vv * s.aa)) : 0;
  s.whirl = smoothstep(p.whirlFrom * p.gravity, p.whirlTo * p.gravity, Math.abs(s.bend)) * smoothstep(p.roundFrom, p.roundTo, s.round);
  // averaged first, divided after: a frame that happens to catch the hand slow can't spike the rate
  const sweep = s.bend + (s.arc - s.bend) * smoothstep(p.turnFrom, p.turnTo, s.whirl);
  s.turn = s.speed > 40 ? Math.max(-p.maxSpin, Math.min(p.maxSpin, sweep / s.speed)) : 0;
}

/** Room for his feet below the hand: the string never stretches them through the floor. */
export interface SwingRoom {
  /** Hand → floor (px, y down). */
  floor: number;
  /** Grab point → feet along the string at rest length (px), and the squash drawn on top of the string's give. */
  feet: number;
  squash: number;
}

/** Longest the string may be at `angle` with his feet above the floor (never outside its own range). */
function feetRoom(room: SwingRoom, angle: number, L: number, rMin: number, rTop: number): number {
  const c = Math.cos(angle);
  if (!(c > 0.05)) return rTop;
  const r = L * (room.floor / (room.feet * c) + room.squash);
  return Number.isNaN(r) ? rTop : Math.max(rMin, Math.min(rTop, r));
}

/**
 * Advance the swing by `dtMs` with the hand moving as `hand`. With `room`, his feet stay above the floor at every
 * sub-step (the string gives less as he swings low); it never goes shorter than its own minimum.
 */
export function stepSwing(s: Swing, dtMs: number, hand: HandMotion, p: SwingParams = SWING, room?: SwingRoom): void {
  const ms = Math.min(Math.max(0, Number.isFinite(dtMs) ? dtMs : 0), 100);
  const sax = Number.isFinite(hand.ax) ? hand.ax : 0;
  const say = Number.isFinite(hand.ay) ? hand.ay : 0;
  const L = p.length;
  trackWhirl(s, ms, hand, p);
  const w = s.whirl;
  // a whirl is driven by the quick estimate, carried forward by the hand's turn over its delay (and his own): he
  // points out along the circle's radius instead of trailing it
  let ax = sax;
  let ay = say;
  if (w > 0) {
    const qax = hand.qax ?? sax;
    const qay = hand.qay ?? say;
    ax += ((Number.isFinite(qax) ? qax : sax) - sax) * w;
    ay += ((Number.isFinite(qay) ? qay : say) - say) * w;
    // (to the middle of the frame stepped through)
    const late = (Number.isFinite(hand.lag) ? Math.min(0.1, Math.max(0, hand.lag!)) : quickDelay(ms) / 1000) - ms / 2000;
    const lead = s.turn * w * (late + p.lead / 1000);
    const lc = Math.cos(lead);
    const ls = Math.sin(lead);
    const rx = ax * lc - ay * ls;
    ay = ax * ls + ay * lc;
    ax = rx;
  }
  // lighter while whirled: he goes round evenly instead of sagging at the bottom and stalling at the top
  const G = p.gravity * (1 - (1 - p.whirlGravity) * w);
  const minG = G * p.minGravity;
  const w2 = p.stretch * p.stretch;
  const r0 = L - p.gravity / w2; // unloaded length: hanging still, gravity stretches it to exactly L
  const rMin = L * (1 - p.maxStretch / 3);
  const rTop = L * (1 + p.maxStretch);
  const grip = p.grip * w;
  const turn = s.turn;
  // a real whirl lets him swing free; once it took him round he keeps that until he runs down
  const gate = smoothstep(p.freeFrom, p.freeTo, w);
  s.free = swingEnergy(s, p) >= p.dampFrom ? Math.max(s.free, gate) : gate;
  const free = s.free;
  let rest = ms / 1000;
  while (rest > 1e-6) {
    const dt = Math.min(rest, 1 / 240);
    rest -= dt;
    const sn = Math.sin(s.angle);
    const cs = Math.cos(s.angle);
    const r = s.len;
    const e = (r * s.vel * s.vel) / (4 * G) + (1 - cs) / 2;
    const k = p.drive + (1 - p.drive) * Math.max(w, free * smoothstep(p.driveFrom, p.driveTo, e));
    let c = p.damping + (p.freeDamping - p.damping) * Math.max(w, free * smoothstep(p.dampFrom, p.dampTo, e));
    // held by the scruff, a swing heading over the top is braked (unless a whirl is taking him round)
    if (free < 1 && s.vel * sn > 0) c += (1 - free) * p.brake * smoothstep(p.brakeFrom, p.brakeTo, e);
    const hx = ax * k;
    const gy = scruff(G - ay * k, minG, w);
    // grip only pulls him along in the hand's turning direction
    const lag = turn - s.vel;
    const pull = turn > 0 ? Math.max(0, lag) : turn < 0 ? Math.min(0, lag) : 0;
    s.vel += ((hx * cs - gy * sn - 2 * s.lenVel * s.vel) / r - c * s.vel - p.drag * s.vel * Math.abs(s.vel) + grip * pull) * dt;
    if (s.vel > p.maxSpin) s.vel = p.maxSpin;
    else if (s.vel < -p.maxSpin) s.vel = -p.maxSpin;
    s.angle += s.vel * dt;
    // the string's give follows the steadier estimate (the quick one would make it shimmer)
    const gr = scruff(G - say * k, minG, w);
    s.lenVel += (r * s.vel * s.vel + sax * k * sn + gr * cs - w2 * (r - r0) - 2 * p.stretchDamping * p.stretch * s.lenVel) * dt;
    s.len += s.lenVel * dt;
    const rMax = room ? feetRoom(room, s.angle, L, rMin, rTop) : rTop;
    if (s.len > rMax) {
      s.len = rMax;
      if (s.lenVel > 0) s.lenVel = 0;
    } else if (s.len < rMin) {
      s.len = rMin;
      if (s.lenVel < 0) s.lenVel = 0;
    }
  }
  s.angle = wrapAngle(s.angle);
  if (!Number.isFinite(s.vel + s.len + s.lenVel + s.bend + s.arc + s.turn)) resetSwing(s, s.angle, 0, p);
}

/** Body-center velocity relative to the hand (px/s): the swing's tangential speed plus the string's stretch rate. */
export function swingVelocity<T extends { vx: number; vy: number }>(s: Swing, out: T): T {
  const sn = Math.sin(s.angle);
  const cs = Math.cos(s.angle);
  // body = hand + len·(−sin φ, cos φ) → d/dt = len'·(−sin φ, cos φ) + len·φ'·(−cos φ, −sin φ)
  out.vx = -s.lenVel * sn - s.len * s.vel * cs;
  out.vy = s.lenVel * cs - s.len * s.vel * sn;
  return out;
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
  /** Samples pushed since it was made (the newest `total − seen` are new to a reader that has seen `seen`). */
  total = 0;

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
    this.total++;
  }

  /** Buffer index of the i-th newest sample (0 = newest). */
  index(i: number): number {
    return (this.head - 1 - i + this.size * 2) % this.size;
  }
}

/** Release window and cap used for throws. */
export const THROW_WINDOW_MS = 80;
export const MAX_THROW = 1100;
/** A release adds the body's own swing to the hand's throw (a whirl flings him off along the tangent): capped here. */
export const MAX_FLING = 1500;

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
  /** His own swing up to this (px/s) is only dangling: a put-down mid-sway still counts as gentle. */
  swaySpeed: 300,
};

/**
 * How hard a release counts as a throw when he lands (px/s): the hand's throw (hvx, hvy) plus only the part of his own
 * swing (svx, svy) beyond a sway, capped. Writes into `out`.
 */
export function tossVelocity<T extends { vx: number; vy: number }>(
  hvx: number, hvy: number, svx: number, svy: number, out: T, sway = DROP_RULES.swaySpeed, max = MAX_FLING,
): T {
  const m = Math.hypot(svx, svy);
  const k = m > sway ? (m - sway) / m : 0;
  return capSpeed(hvx + svx * k, hvy + svy * k, max, out);
}

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
