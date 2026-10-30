// Time-of-day color grading on raw RGBA pixels (pure). Results are cached per background by backgrounds.ts.
import type { TimeOfDay } from '../types';

type Rgb = readonly [number, number, number];

/** Multiply tint that varies from a shadow color to a highlight color with luminance. */
export interface SplitTone {
  shadow: Rgb;
  highlight: Rgb;
  strength: number;
}

/** Cool shadows, peach highlights: early sun. */
export const MORNING_TONE: SplitTone = { shadow: [186, 204, 246], highlight: [255, 222, 186], strength: 0.24 };
/** Violet shadows, orange highlights: golden hour into dusk. */
export const EVENING_TONE: SplitTone = { shadow: [150, 118, 196], highlight: [255, 160, 118], strength: 0.32 };
/** How far evening leans toward the painted night variant. */
export const EVENING_NIGHT_MIX = 0.35;
/** How far evening leans toward a synthesized night (no painted variant). */
export const EVENING_SYNTH_MIX = 0.25;

export function luminance(r: number, g: number, b: number): number {
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

/**
 * Grade a day painting for the time of day. `night` is the painted night variant when one exists.
 * `out` must not alias `day`.
 */
export function gradePixels(
  tod: TimeOfDay,
  day: Uint8ClampedArray,
  night: Uint8ClampedArray | null,
  w: number,
  h: number,
  out: Uint8ClampedArray = new Uint8ClampedArray(day.length),
): Uint8ClampedArray {
  switch (tod) {
    case 'day':
      out.set(day);
      return out;
    case 'night':
      if (night) out.set(night);
      else synthNight(day, w, h, out);
      return out;
    case 'morning':
      return splitTone(day, MORNING_TONE, out);
    case 'evening':
      if (night) mixPixels(day, night, EVENING_NIGHT_MIX, out);
      else {
        synthNight(day, w, h, out);
        mixPixels(day, out, EVENING_SYNTH_MIX, out);
      }
      return splitTone(out, EVENING_TONE, out);
  }
}

/** out = a + (b − a)·t, per channel (alpha from a). `out` may alias a or b. */
export function mixPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, t: number, out: Uint8ClampedArray): Uint8ClampedArray {
  for (let i = 0; i < a.length; i += 4) {
    const ar = a[i], ag = a[i + 1], ab = a[i + 2], aa = a[i + 3];
    out[i] = ar + (b[i] - ar) * t;
    out[i + 1] = ag + (b[i + 1] - ag) * t;
    out[i + 2] = ab + (b[i + 2] - ab) * t;
    out[i + 3] = aa;
  }
  return out;
}

/** Luminance-dependent multiply tint. `out` may alias `src`. */
export function splitTone(src: Uint8ClampedArray, tone: SplitTone, out: Uint8ClampedArray): Uint8ClampedArray {
  const s = tone.strength;
  const k = 1 - s;
  const [sr, sg, sb] = tone.shadow;
  const [hr, hg, hb] = tone.highlight;
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i], g = src[i + 1], b = src[i + 2];
    const l = luminance(r, g, b);
    out[i] = r * (k + (s * (sr + (hr - sr) * l)) / 255);
    out[i + 1] = g * (k + (s * (sg + (hg - sg) * l)) / 255);
    out[i + 2] = b * (k + (s * (sb + (hb - sb) * l)) / 255);
    out[i + 3] = src[i + 3];
  }
  return out;
}

const SKY_FRACTION = 0.38;

/**
 * Night from a day painting: a deep-blue multiply (sky darker than the ground), bright warm pixels
 * below the skyline kept lit, and warm additive glow spots where lamps and windows cluster.
 * `out` must not alias `day`.
 */
export function synthNight(day: Uint8ClampedArray, w: number, h: number, out: Uint8ClampedArray): Uint8ClampedArray {
  const skyRows = Math.round(h * SKY_FRACTION);
  for (let y = 0; y < h; y++) {
    const v = 0.78 + (0.22 * y) / h;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = day[i], g = day[i + 1], b = day[i + 2];
      let nr = r * 0.28 * v + 12;
      let ng = g * 0.34 * v + 10;
      let nb = b * 0.56 * v + 30;
      if (y >= skyRows) {
        const l = luminance(r, g, b);
        if (l > 0.8 && r >= b + 16) {
          const k = Math.min(1, (l - 0.8) / 0.12) * 0.85;
          nr += (r - nr) * k;
          ng += (g * 0.92 - ng) * k;
          nb += (b * 0.7 - nb) * k;
        }
      }
      out[i] = nr;
      out[i + 1] = ng;
      out[i + 2] = nb;
      out[i + 3] = day[i + 3];
    }
  }
  addGlows(day, w, h, skyRows, out);
  return out;
}

const GLOW_CELL = 8;
const GLOW_MAX = 10;
const GLOW_RADIUS = 14;

function addGlows(day: Uint8ClampedArray, w: number, h: number, skyRows: number, out: Uint8ClampedArray) {
  const cols = Math.ceil(w / GLOW_CELL);
  const rows = Math.ceil(h / GLOW_CELL);
  const score = new Float32Array(cols * rows);
  for (let y = skyRows; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = day[i], g = day[i + 1], b = day[i + 2];
      if (r >= b + 24 && g >= b && luminance(r, g, b) > 0.82) {
        score[((y / GLOW_CELL) | 0) * cols + ((x / GLOW_CELL) | 0)] += 1;
      }
    }
  }
  const picks: number[] = [];
  for (let n = 0; n < GLOW_MAX; n++) {
    let best = -1;
    let bestScore = 3;
    for (let c = 0; c < score.length; c++) {
      if (score[c] <= bestScore) continue;
      const cx = c % cols, cy = (c / cols) | 0;
      let clear = true;
      for (const p of picks) {
        if (Math.abs((p % cols) - cx) <= 3 && Math.abs(((p / cols) | 0) - cy) <= 3) { clear = false; break; }
      }
      if (clear) { best = c; bestScore = score[c]; }
    }
    if (best < 0) break;
    picks.push(best);
  }
  const r2 = GLOW_RADIUS * GLOW_RADIUS;
  for (const c of picks) {
    const gx = (c % cols) * GLOW_CELL + GLOW_CELL / 2;
    const gy = ((c / cols) | 0) * GLOW_CELL + GLOW_CELL / 2;
    for (let y = Math.max(0, gy - GLOW_RADIUS); y < Math.min(h, gy + GLOW_RADIUS); y++) {
      for (let x = Math.max(0, gx - GLOW_RADIUS); x < Math.min(w, gx + GLOW_RADIUS); x++) {
        const d2 = (x - gx) * (x - gx) + (y - gy) * (y - gy);
        if (d2 >= r2) continue;
        const f = 1 - Math.sqrt(d2) / GLOW_RADIUS;
        const a = f * f * 0.5;
        const i = (y * w + x) * 4;
        out[i] += 120 * a;
        out[i + 1] += 84 * a;
        out[i + 2] += 30 * a;
      }
    }
  }
}
