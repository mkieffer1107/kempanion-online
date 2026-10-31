// Sakura petals: code-drawn 3x3 / 4x3 petals (5x4 in front) with 4 flip frames, sway, gusts and landings.
// No DOM: the system only draws into a context it is handed.
import { stepped } from './layout';
import { mulberry32, type Rng } from './rng';
import type { PetalLevel } from './stage';

/** Petal counts per level: [compact stage (T/S layouts), roomy stage (W layout)]. */
export const PETAL_COUNTS: Record<PetalLevel, readonly [number, number]> = {
  off: [0, 0],
  light: [8, 12],
  normal: [16, 28],
  heavy: [28, 48],
};
/** Reduced motion keeps a few slow petals. */
export const REDUCED_PETALS = 4;
export const MAX_LANDED = 12;
export const SPAWN_MARGIN = 24;
const POOL = 64;
/** Pool slots reserved for petal puffs (taps, outfit swaps). */
const PUFF_FIRST = 52;
const GUST_RAMP = 1200;
const GUST_FALL = 2000;

/** Petals on screen for a level, stage size, reduced motion and the player's density preference (0..1). */
export function petalCount(level: PetalLevel, large: boolean, reduceMotion: boolean, scale = 1): number {
  const n = Math.round(PETAL_COUNTS[level][large ? 1 : 0] * Math.max(0, Math.min(1, scale)));
  return reduceMotion ? Math.min(n, REDUCED_PETALS) : n;
}

export interface SpawnBounds { minX: number; maxX: number; minY: number; maxY: number }

/**
 * Where a new petal may appear: just above the top edge (anywhere down to 90% of the height when
 * filling the screen initially), with extra room on the upwind side so drifting petals cross the view.
 */
export function spawnBounds(lw: number, h: number, wind: number, initial: boolean): SpawnBounds {
  const upwind = Math.min(90, SPAWN_MARGIN + Math.abs(wind) * 1.5);
  return {
    minX: wind > 0 ? -upwind : -SPAWN_MARGIN,
    maxX: wind < 0 ? lw + upwind : lw + SPAWN_MARGIN,
    minY: -12,
    maxY: initial ? Math.round(h * 0.9) : -2,
  };
}

/** Gust wind (px/s) `t` ms into a gust: ramps up to `peak` over 1.2 s, dies down over 2 s. */
export function gustWind(t: number, peak: number): number {
  if (t < 0) return 0;
  if (t < GUST_RAMP) return (peak * t) / GUST_RAMP;
  if (t < GUST_RAMP + GUST_FALL) return peak * (1 - (t - GUST_RAMP) / GUST_FALL);
  return 0;
}

export interface Petal {
  on: boolean;
  front: boolean;
  puff: boolean;
  x: number;
  y: number;
  /** Extra sideways velocity (puffs), decays. */
  vx: number;
  vy: number;
  /** Terminal fall speed, px/s. */
  fall: number;
  drift: number;
  swayA: number;
  swayW: number;
  phase: number;
  frame: number;
  flipT: number;
  flipEvery: number;
  landed: boolean;
  fade: number;
  landY: number;
}

function newPetal(): Petal {
  return {
    on: false, front: false, puff: false, x: 0, y: 0, vx: 0, vy: 0, fall: 0, drift: 0, swayA: 0, swayW: 0,
    phase: 0, frame: 0, flipT: 0, flipEvery: 200, landed: false, fade: 1, landY: 0,
  };
}

/** Respawn a petal inside spawnBounds (fall 10–22 px/s, drift ±6, sway 4–10 px at 1.6–3.2 rad/s). */
export function spawnPetal(
  p: Petal, rng: Rng, lw: number, h: number, groundY: number, wind: number, initial: boolean, slow: boolean,
): void {
  const b = spawnBounds(lw, h, wind, initial);
  p.x = b.minX + (b.maxX - b.minX) * rng();
  p.y = b.minY + (b.maxY - b.minY) * rng();
  p.fall = (slow ? 5 + 4 * rng() : 10 + 12 * rng()) * (p.front ? 1.25 : 1);
  p.vy = p.fall;
  p.vx = 0;
  p.drift = slow ? -2 + 4 * rng() : -6 + 12 * rng();
  p.swayA = slow ? 2 + 3 * rng() : 4 + 6 * rng();
  p.swayW = 1.6 + 1.6 * rng();
  p.phase = rng() * Math.PI * 2;
  p.flipEvery = 150 + 150 * rng();
  p.flipT = rng() * p.flipEvery;
  p.frame = (rng() * 4) | 0;
  p.landed = false;
  p.fade = 1;
  p.landY = groundY - 6 + 20 * rng();
}

// Frames as flat [dx, dy, w, h, color] runs; color 0 body, 1 highlight, 2 shade.
const SMALL: readonly (readonly number[])[] = [
  [1, 0, 2, 1, 0, 0, 1, 4, 1, 0, 1, 2, 2, 1, 0, 1, 1, 1, 1, 1],
  [0, 0, 2, 1, 0, 0, 1, 3, 1, 0, 1, 2, 1, 1, 0, 2, 2, 1, 1, 2, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 2, 0, 2, 1, 1, 2],
  [1, 0, 2, 1, 0, 0, 1, 3, 1, 0, 1, 2, 1, 1, 0, 0, 2, 1, 1, 2, 1, 1, 1, 1, 1],
];
const BIG: readonly (readonly number[])[] = [
  [1, 0, 3, 1, 0, 0, 1, 5, 2, 0, 1, 3, 1, 1, 0, 2, 3, 2, 1, 2, 4, 2, 1, 1, 2, 1, 1, 2, 1, 1],
  [1, 0, 2, 1, 0, 0, 1, 4, 2, 0, 1, 1, 1, 1, 1, 3, 2, 1, 1, 2, 1, 3, 2, 1, 2],
  [1, 0, 1, 1, 0, 0, 1, 2, 1, 0, 0, 2, 1, 1, 0, 1, 2, 1, 1, 2, 0, 3, 1, 1, 2],
  [1, 0, 2, 1, 0, 0, 1, 4, 2, 0, 2, 1, 1, 1, 1, 0, 2, 1, 1, 2, 1, 3, 2, 1, 2],
];

const DAY: readonly [number, number, number][] = [[0xf4, 0x9a, 0xc1], [0xff, 0xd6, 0xe7], [0xd9, 0x57, 0x8c]];
const NIGHT: readonly [number, number, number] = [0x2e, 0x24, 0x45];

function tint(c: readonly [number, number, number], t: number): string {
  const r = Math.round(c[0] + (NIGHT[0] - c[0]) * t);
  const g = Math.round(c[1] + (NIGHT[1] - c[1]) * t);
  const b = Math.round(c[2] + (NIGHT[2] - c[2]) * t);
  return `rgb(${r},${g},${b})`;
}

export interface PetalConfig {
  level?: PetalLevel;
  lw?: number;
  h?: number;
  groundY?: number;
  large?: boolean;
  reduceMotion?: boolean;
  /** Player density preference multiplier (0..1). */
  scale?: number;
  /** 0 = day colors, 1 = full night tint (60% toward Night). */
  night?: number;
}

export class PetalSystem {
  readonly petals: Petal[] = [];
  /** Current gust wind, px/s (positive blows right). */
  wind = 0;
  private rng: Rng;
  private level: PetalLevel = 'normal';
  private lw = 480;
  private h = 270;
  private groundY = 252;
  private large = true;
  private reduce = false;
  private scale = 1;
  private count = 0;
  private landed = 0;
  private gustIn: number;
  private gustT = -1;
  private gustPeak = 35;
  private gustDir = 1;
  private colors: [string, string, string] = [tint(DAY[0], 0), tint(DAY[1], 0), tint(DAY[2], 0)];

  constructor(seed = 0x5a4b) {
    this.rng = mulberry32(seed);
    for (let i = 0; i < POOL; i++) this.petals.push(newPetal());
    this.gustIn = 25000 + 20000 * this.rng();
  }

  get active(): number {
    return this.count;
  }

  configure(c: PetalConfig): void {
    if (c.level !== undefined) this.level = c.level;
    if (c.lw !== undefined) this.lw = c.lw;
    if (c.h !== undefined) this.h = c.h;
    if (c.groundY !== undefined) this.groundY = c.groundY;
    if (c.large !== undefined) this.large = c.large;
    if (c.reduceMotion !== undefined) this.reduce = c.reduceMotion;
    if (c.scale !== undefined) this.scale = c.scale;
    if (c.night !== undefined) {
      const t = Math.max(0, Math.min(1, c.night)) * 0.6;
      this.colors = [tint(DAY[0], t), tint(DAY[1], t), tint(DAY[2], t)];
    }
    this.recount();
  }

  private recount() {
    const n = Math.min(PUFF_FIRST, petalCount(this.level, this.large, this.reduce, this.scale));
    for (let i = 0; i < PUFF_FIRST; i++) {
      const p = this.petals[i];
      if (i < n && !p.on) {
        p.on = true;
        p.puff = false;
        p.front = !this.reduce && (i % 7 === 2 || i % 7 === 5);
        spawnPetal(p, this.rng, this.lw, this.h, this.groundY, this.wind, true, this.reduce);
      } else if (i >= n && p.on) {
        this.retire(p);
      }
    }
    this.count = n;
  }

  private retire(p: Petal) {
    if (p.landed) this.landed--;
    p.landed = false;
    p.on = false;
  }

  /** A little puff of petals from a point (tap on empty stage, outfit swap). */
  puff(x: number, y: number, n = 5): void {
    const rng = this.rng;
    let made = 0;
    for (let i = PUFF_FIRST; i < POOL && made < n; i++) {
      const p = this.petals[i];
      if (p.on) continue;
      p.on = true;
      p.puff = true;
      p.front = made % 2 === 0;
      spawnPetal(p, rng, this.lw, this.h, this.groundY, 0, false, this.reduce);
      p.x = x + (rng() - 0.5) * 6;
      p.y = y + (rng() - 0.5) * 6;
      const a = rng() * Math.PI * 2;
      const speed = this.reduce ? 6 : 18 + 26 * rng();
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed - (this.reduce ? 0 : 14);
      made++;
    }
  }

  clearPuffs(): void {
    for (let i = PUFF_FIRST; i < POOL; i++) if (this.petals[i].on) this.retire(this.petals[i]);
  }

  update(dt: number): void {
    const s = dt / 1000;
    if (!this.reduce) {
      if (this.gustT >= 0) {
        this.gustT += dt;
        if (this.gustT > GUST_RAMP + GUST_FALL) this.gustT = -1;
      } else if ((this.gustIn -= dt) <= 0) {
        this.gustT = 0;
        this.gustIn = 25000 + 20000 * this.rng();
        this.gustPeak = 26 + 14 * this.rng();
        this.gustDir = this.rng() < 0.75 ? 1 : -1;
      }
    }
    this.wind = this.gustT >= 0 ? this.gustDir * gustWind(this.gustT, this.gustPeak) : 0;
    const windy = 1 + Math.abs(this.wind) / 35;
    const damp = Math.exp(-2.2 * s);
    for (let i = 0; i < POOL; i++) {
      const p = this.petals[i];
      if (!p.on) continue;
      if (p.landed) {
        p.fade -= s / 2;
        if (p.fade <= 0) this.recycle(p, i);
        continue;
      }
      if (p.vy < p.fall) p.vy = Math.min(p.fall, p.vy + 60 * s);
      p.vx *= damp;
      p.y += p.vy * s;
      p.x += (p.drift + p.vx + this.wind) * s;
      p.phase += p.swayW * s * windy;
      p.flipT += dt * windy;
      if (p.flipT >= p.flipEvery) {
        p.flipT -= p.flipEvery;
        p.frame = (p.frame + 1) & 3;
      }
      if (!p.front && p.y >= p.landY && this.landed < MAX_LANDED && Math.abs(this.wind) < 12) {
        p.landed = true;
        p.fade = 1;
        p.x += p.swayA * Math.sin(p.phase);
        p.y = Math.round(p.landY);
        if (p.frame === 2) p.frame = 0;
        this.landed++;
      } else if (p.y > this.h + 8 || p.x < -110 || p.x > this.lw + 110) {
        this.recycle(p, i);
      }
    }
  }

  private recycle(p: Petal, i: number) {
    if (p.landed) this.landed--;
    p.landed = false;
    if (i >= PUFF_FIRST) {
      p.on = false;
      return;
    }
    spawnPetal(p, this.rng, this.lw, this.h, this.groundY, this.wind, false, this.reduce);
  }

  /** Draw the back (small) or front (big) petals, offset by (ox, oy). */
  draw(ctx: CanvasRenderingContext2D, front: boolean, ox = 0, oy = 0): void {
    const colors = this.colors;
    for (let i = 0; i < POOL; i++) {
      const p = this.petals[i];
      if (!p.on || p.front !== front) continue;
      const x = Math.round(p.x + (p.landed ? 0 : p.swayA * Math.sin(p.phase))) + ox - 2;
      const y = Math.round(p.y) + oy - 1;
      // Every frame fits in 5×4 pixels. Keep simulating offscreen petals, but do not submit
      // their rectangles to the canvas (include the shake offset before testing).
      if (x + 5 <= 0 || x >= this.lw || y + 4 <= 0 || y >= this.h) continue;
      const shape = front ? BIG[p.frame] : SMALL[p.frame];
      if (p.landed) ctx.globalAlpha = stepped(p.fade, 4);
      for (let j = 0; j < shape.length; j += 5) {
        ctx.fillStyle = colors[shape[j + 4]];
        ctx.fillRect(x + shape[j], y + shape[j + 1], shape[j + 2], shape[j + 3]);
      }
      if (p.landed) ctx.globalAlpha = 1;
    }
  }
}
