// Sound-effect catalog: every SfxId as a few synth layers (raw voices, instrument presets or MML clips).
// Times in ms. Levels are balanced with `bun scripts/render-songs.ts --only sfx`.
import type { SfxId } from '../types';
import type { SfxDef, SfxLayer } from './encode';

/** Two-part pig grunt: a nasal 12.5% pulse through a "snout" band-pass with pitch + amplitude flutter,
 *  plus a breathy band-passed noise snort. */
function grunt(at: number, f0: number, f1: number, len: number, o: { bp?: number; wobble?: number; vol?: number } = {}): SfxLayer[] {
  const bp = o.bp ?? 700;
  const wob = o.wobble ?? 26;
  const vol = o.vol ?? 1;
  return [
    {
      at, wave: 'pulse12', freq: f0, to: f1, len, a: 6, d: len, s: 0.6, r: 45,
      filter: 'bp', cutoff: bp, q: 1.6, vib: 0.7, vibRate: wob, trem: 0.55, tremRate: wob, vol: 1.1 * vol, echo: 0.04,
    },
    {
      at, wave: 'noise', freq: 14000, len: len * 0.7, a: 3, d: len * 0.7, s: 0.3, r: 35,
      filter: 'bp', cutoff: bp * 0.7, q: 3, trem: 0.6, tremRate: wob, vol: 1.6 * vol, echo: 0.04,
    },
    { at, wave: 'sine', freq: f0 * 0.9, drop: 4, dropTime: 20, len: len * 0.5, a: 3, d: len * 0.6, s: 0, r: 30, vol: 0.22 * vol, echo: 0 },
  ];
}

function crunch(at: number, k = 1): SfxLayer[] {
  return [
    { at, wave: 'noise', freq: 22000, len: 70, a: 1, d: 70, s: 0, r: 30, filter: 'bp', cutoff: 1200 * k, q: 1.4, bursts: 3, burstGap: 14, vol: 1.3 },
    { at, wave: 'sine', freq: 130 * k, drop: 7, dropTime: 15, len: 40, a: 1, d: 40, s: 0, r: 20, vol: 0.3, echo: 0 },
  ];
}

/** Notes played one after another (ms per step); the last one rings for `last` ms. */
function arp(notes: string[], step: number, base: Partial<SfxLayer> & { at?: number; last?: number }): SfxLayer[] {
  const { at = 0, last = step * 2, ...rest } = base;
  return notes.map((note, i) => ({
    wave: 'pulse25', a: 1, r: 30, vol: 0.17, ...rest,
    at: at + i * step, note, len: i === notes.length - 1 ? last : step,
  }));
}

const spread = (i: number, n: number, width = 0.8) => (n <= 1 ? 0 : -width / 2 + (width * i) / (n - 1));

export const SFX: Record<SfxId, SfxDef> = {
  // ───── UI ─────
  ui_move: { layers: [{ wave: 'pulse25', note: 'c6', len: 14, a: 1, r: 12, vol: 0.17, echo: 0 }] },
  ui_select: {
    layers: [
      { wave: 'pulse25', note: 'c6', len: 40, a: 1, r: 20, vol: 0.19, echo: 0 },
      { at: 45, wave: 'pulse25', note: 'g6', len: 70, a: 1, r: 90, vol: 0.19, echo: 0 },
      { at: 45, wave: 'tri', note: 'g5', len: 70, a: 1, r: 90, vol: 0.18, echo: 0 },
    ],
  },
  ui_back: {
    layers: [
      { wave: 'pulse25', note: 'g5', len: 40, a: 1, r: 20, vol: 0.19, echo: 0 },
      { at: 45, wave: 'pulse25', note: 'c5', len: 70, a: 1, r: 80, vol: 0.19, echo: 0 },
    ],
  },
  ui_open: {
    layers: [
      { wave: 'noise', freq: 30000, len: 90, a: 5, d: 90, s: 0.8, r: 50, filter: 'bp', cutoff: 2000, cutoffTo: 6000, q: 2, vol: 0.477, echo: 0 },
      { at: 70, wave: 'pulse12', note: 'e6', len: 20, a: 1, r: 25, vol: 0.07, echo: 0 },
    ],
  },
  ui_close: {
    layers: [
      { wave: 'pulse12', note: 'e6', len: 20, a: 1, r: 25, vol: 0.07, echo: 0 },
      { wave: 'noise', freq: 30000, len: 90, a: 5, d: 90, s: 0.8, r: 50, filter: 'bp', cutoff: 6000, cutoffTo: 2000, q: 2, vol: 0.477, echo: 0 },
    ],
  },
  ui_error: {
    layers: [
      { wave: 'pulse12', freq: 110, len: 75, a: 2, r: 30, vib: 0.6, vibRate: 30, filter: 'lp', cutoff: 2500, vol: 0.225, echo: 0 },
      { wave: 'pulse50', freq: 116.5, len: 75, a: 2, r: 30, filter: 'lp', cutoff: 2000, vol: 0.083, echo: 0 },
      { at: 120, wave: 'pulse12', freq: 104, len: 110, a: 2, r: 50, vib: 0.6, vibRate: 30, filter: 'lp', cutoff: 2500, vol: 0.225, echo: 0 },
      { at: 120, wave: 'pulse50', freq: 110, len: 110, a: 2, r: 50, filter: 'lp', cutoff: 2000, vol: 0.083, echo: 0 },
    ],
  },
  ui_toggle: {
    layers: [
      { wave: 'metal', freq: 40000, len: 6, a: 0.5, r: 8, filter: 'hp', cutoff: 5000, vol: 0.1, echo: 0 },
      { wave: 'pulse25', note: 'a5', len: 14, a: 1, r: 12, vol: 0.15, echo: 0 },
      { at: 38, wave: 'pulse25', note: 'e6', len: 18, a: 1, r: 20, vol: 0.15, echo: 0 },
    ],
  },

  // ───── economy & items ─────
  coin: {
    layers: [
      { wave: 'pulse50', note: 'b5', len: 55, a: 1, r: 20, vol: 0.208 },
      { at: 55, wave: 'pulse50', note: 'e6', len: 300, a: 1, d: 320, s: 0.3, r: 200, vol: 0.208 },
    ],
  },
  purchase: {
    layers: [
      { wave: 'metal', freq: 40000, len: 25, a: 0.5, d: 25, s: 0, r: 20, filter: 'hp', cutoff: 4000, vol: 0.18 },
      ...arp(['c6', 'e6', 'g6'], 40, { last: 40, r: 15 }),
      { at: 120, wave: 'fm', note: 'c7', fm: { ratio: 3.5, index: 2, time: 120 }, len: 700, a: 1, d: 800, s: 0, r: 300, vol: 0.2, echo: 0.2 },
      { at: 120, wave: 'metal', freq: 40000, len: 200, a: 1, d: 220, s: 0, r: 100, filter: 'hp', cutoff: 7000, vol: 0.12 },
    ],
  },
  gift: {
    layers: [
      { wave: 'noise', freq: 30000, len: 220, a: 10, r: 60, filter: 'hp', cutoff: 2500, trem: 0.85, tremRate: 22, vol: 0.197 },
      ...arp(['c6', 'e6', 'g6', 'c7'], 60, { at: 260, last: 300, r: 220 }),
      { at: 440, inst: 'glock', note: 'c7', len: 500, vol: 0.738, echo: 0.3 },
    ],
  },
  medicine: {
    layers: [
      { wave: 'tri', freq: 500, to: 720, glide: 60, len: 60, a: 4, r: 20, vol: 0.3 },
      { at: 90, wave: 'tri', freq: 600, to: 880, glide: 60, len: 60, a: 4, r: 20, vol: 0.3 },
      { at: 200, inst: 'bell', note: 'c6', len: 900, vol: 1.1, echo: 0.3 },
      { at: 200, inst: 'glock', note: 'g6', len: 600, vol: 0.8, echo: 0.3 },
    ],
  },

  // ───── care ─────
  eat: { layers: [...crunch(0), ...crunch(230, 0.85)] },
  drink: {
    layers: [
      { wave: 'tri', freq: 620, to: 300, glide: 110, len: 110, a: 6, r: 35, vol: 0.38 },
      { wave: 'sine', freq: 180, to: 120, len: 60, a: 3, r: 30, vol: 0.15, echo: 0 },
      { at: 230, wave: 'tri', freq: 560, to: 280, glide: 120, len: 120, a: 6, r: 40, vol: 0.34 },
    ],
  },
  bath: {
    layers: [900, 1250, 1050, 1500, 820, 1380, 1120, 1600].map((f, i): SfxLayer => ({
      at: i * 125 + (i % 3) * 18, wave: 'sine', freq: f, to: f * 1.6, glide: 35, len: 40, a: 2, r: 25,
      vol: 0.26, pan: (((i * 37) % 7) / 7) * 0.8 - 0.4, echo: 0.15,
    })),
  },
  brush: {
    layers: [
      { wave: 'noise', freq: 32000, len: 650, a: 20, r: 60, filter: 'bp', cutoff: 4000, q: 1.2, trem: 0.9, tremRate: 6, vol: 0.522 },
      { wave: 'noise', freq: 32000, len: 650, a: 20, r: 60, filter: 'hp', cutoff: 6500, trem: 0.9, tremRate: 12, vol: 0.07 },
    ],
  },
  zzz: {
    layers: [
      { wave: 'pulse12', freq: 88, to: 76, len: 520, a: 140, d: 400, s: 0.7, r: 220, filter: 'lp', cutoff: 650, q: 1.2, trem: 0.6, tremRate: 27, vol: 0.314 },
      { wave: 'noise', freq: 6000, len: 520, a: 160, r: 220, filter: 'lp', cutoff: 800, vol: 0.103 },
      { at: 780, wave: 'sine', freq: 760, to: 520, len: 340, a: 90, r: 160, vol: 0.04 },
      { at: 780, wave: 'noise', freq: 20000, len: 340, a: 90, r: 160, filter: 'bp', cutoff: 1800, q: 1, vol: 0.142 },
    ],
  },
  alarm: {
    layers: [0, 120, 240, 360, 640, 760, 880, 1000].map((at): SfxLayer => ({ at, wave: 'pulse50', note: 'c7', len: 60, a: 1, r: 10, vol: 0.259 })),
  },
  pet: {
    layers: [
      { wave: 'pulse25', freq: 700, to: 1400, glide: 80, len: 85, a: 2, r: 30, vol: 0.213 },
      { at: 110, wave: 'pulse25', freq: 900, to: 1650, glide: 70, len: 75, a: 2, r: 40, vol: 0.213 },
      { at: 110, wave: 'sine', freq: 1800, to: 2600, glide: 70, len: 60, a: 2, r: 40, vol: 0.075 },
    ],
  },
  tidy: {
    layers: [
      { wave: 'noise', freq: 30000, len: 120, a: 30, r: 50, filter: 'bp', cutoff: 3200, cutoffTo: 1500, q: 1.1, vol: 0.544 },
      { at: 170, wave: 'noise', freq: 30000, len: 120, a: 30, r: 50, filter: 'bp', cutoff: 3200, cutoffTo: 1500, q: 1.1, vol: 0.544 },
      { at: 360, wave: 'pulse25', note: 'e6', to: 1760, glide: 50, len: 60, a: 1, r: 40, vol: 0.088 },
      { at: 360, wave: 'metal', freq: 40000, len: 120, a: 5, d: 150, s: 0, r: 60, filter: 'hp', cutoff: 8000, vol: 0.048 },
    ],
  },
  sneeze: {
    layers: [
      { wave: 'tri', freq: 380, to: 520, len: 150, a: 30, r: 40, vib: 0.3, vibRate: 7, vol: 0.25 },
      { at: 230, wave: 'tri', freq: 440, to: 640, len: 170, a: 30, r: 40, vib: 0.3, vibRate: 7, vol: 0.28 },
      { at: 470, wave: 'noise', freq: 30000, len: 200, a: 2, d: 200, s: 0.2, r: 80, filter: 'bp', cutoff: 3000, cutoffTo: 1200, q: 1, vol: 0.7, echo: 0.15 },
      { at: 470, wave: 'pulse12', freq: 320, to: 150, glide: 120, len: 120, a: 2, r: 40, filter: 'lp', cutoff: 1500, vol: 0.18 },
    ],
  },

  // ───── pigs ─────
  oink: { layers: [...grunt(0, 150, 118, 120), ...grunt(170, 165, 125, 140, { vol: 0.95 })] },
  oink_happy: { layers: [...grunt(0, 185, 225, 90, { bp: 820, wobble: 30 }), ...grunt(125, 205, 262, 115, { bp: 880, wobble: 30 })] },
  oink_sad: {
    layers: [
      ...grunt(0, 150, 92, 380, { bp: 560, wobble: 14, vol: 0.9 }),
      { at: 430, wave: 'noise', freq: 9000, len: 120, a: 20, r: 80, filter: 'lp', cutoff: 700, vol: 0.2 },
    ],
  },
  heart: {
    layers: [
      { wave: 'pulse25', note: 'g5', len: 50, a: 1, r: 20, vol: 0.176 },
      { at: 50, wave: 'sine', note: 'c6', len: 330, a: 8, d: 200, s: 0.7, r: 250, trem: 0.5, tremRate: 12, vol: 0.32, echo: 0.2 },
      { at: 50, wave: 'sine', note: 'e6', len: 330, a: 8, d: 200, s: 0.7, r: 250, trem: 0.5, tremRate: 12, vol: 0.256, echo: 0.2 },
    ],
  },
  sparkle: {
    layers: [
      ...['c6', 'e6', 'g6', 'c7', 'e7'].map((note, i): SfxLayer => ({
        at: i * 32, wave: 'fm', note, fm: { ratio: 3.5, index: 1.4, time: 90 }, len: 450, a: 1, d: 450, s: 0, r: 200,
        vol: 0.198, pan: spread(i, 5), echo: 0.3,
      })),
      { at: 30, wave: 'metal', freq: 40000, len: 300, a: 30, d: 300, s: 0, r: 150, filter: 'hp', cutoff: 8000, trem: 0.8, tremRate: 24, vol: 0.099 },
    ],
  },
  surprise: {
    layers: [
      { wave: 'noise', freq: 32000, len: 30, a: 0.5, d: 35, s: 0, r: 20, filter: 'hp', cutoff: 2000, vol: 0.38 },
      { wave: 'sine', freq: 220, drop: 12, dropTime: 20, len: 110, a: 0.5, d: 130, s: 0, r: 30, vol: 0.342, echo: 0 },
      { wave: 'pulse25', freq: 1318.5, to: 1760, glide: 35, len: 110, a: 1, r: 60, vol: 0.137 },
      { at: 20, wave: 'fm', freq: 1760, fm: { ratio: 3.5, index: 2.2, time: 60 }, len: 500, a: 1, d: 500, s: 0, r: 200, vol: 0.137, echo: 0.3 },
    ],
  },
  question: {
    layers: [
      { wave: 'pulse25', note: 'a5', len: 60, a: 1, r: 20, vol: 0.232 },
      { at: 75, wave: 'pulse25', note: 'e6', to: 1480, glide: 110, len: 120, a: 1, r: 60, vol: 0.232 },
    ],
  },
  shake: {
    layers: [
      { wave: 'metal', freq: 26000, len: 360, a: 10, r: 80, filter: 'bp', cutoff: 3200, q: 1.2, trem: 0.9, tremRate: 18, vol: 0.55 },
      { wave: 'tri', freq: 110, len: 320, a: 10, r: 80, vib: 3, vibRate: 9, vol: 0.22 },
    ],
  },

  // ───── world ─────
  door: {
    layers: [
      { wave: 'saw', freq: 300, to: 430, glide: 220, len: 220, a: 30, r: 60, filter: 'lp', cutoff: 1100, vib: 0.6, vibRate: 17, vol: 0.06 },
      { at: 240, wave: 'sine', freq: 70, drop: 12, dropTime: 25, len: 110, a: 1, d: 110, s: 0, r: 30, vol: 0.55, echo: 0 },
      { at: 240, wave: 'noise', freq: 9000, len: 40, a: 1, d: 40, s: 0, r: 20, filter: 'lp', cutoff: 1400, vol: 0.4 },
      { at: 330, wave: 'metal', freq: 30000, len: 14, a: 0.5, d: 14, s: 0, r: 10, filter: 'hp', cutoff: 3000, vol: 0.14 },
    ],
  },
  step: {
    layers: [
      { wave: 'noise', freq: 7000, len: 30, a: 1, d: 30, s: 0, r: 15, filter: 'lp', cutoff: 900, vol: 0.4, echo: 0 },
      { wave: 'sine', freq: 95, drop: 7, dropTime: 12, len: 40, a: 1, d: 40, s: 0, r: 15, vol: 0.28, echo: 0 },
    ],
  },
  whoosh: {
    layers: [{ wave: 'noise', freq: 30000, len: 260, a: 110, d: 200, s: 0.5, r: 140, filter: 'bp', cutoff: 500, cutoffTo: 2800, q: 1.3, vol: 0.83, echo: 0.15 }],
  },
  camera: {
    layers: [
      { wave: 'sine', note: 'e7', len: 25, a: 1, r: 10, vol: 0.1 },
      { at: 80, wave: 'noise', freq: 32000, len: 18, a: 0.5, d: 18, s: 0, r: 10, filter: 'hp', cutoff: 3000, bursts: 2, burstGap: 7, vol: 0.5 },
      { at: 150, wave: 'noise', freq: 26000, len: 30, a: 0.5, d: 30, s: 0, r: 15, filter: 'bp', cutoff: 1800, q: 1.2, vol: 0.8 },
    ],
  },
  notify: {
    layers: [
      { wave: 'pulse50', note: 'c7', len: 60, a: 1, r: 12, vol: 0.299 },
      { at: 140, wave: 'pulse50', note: 'c7', len: 60, a: 1, r: 30, vol: 0.299 },
    ],
  },
  thunder: {
    layers: [
      { wave: 'noise', freq: 30000, len: 160, a: 1, d: 180, s: 0, r: 60, filter: 'bp', cutoff: 1600, cutoffTo: 500, q: 0.8, vol: 0.91, echo: 0.3 },
      { wave: 'noise', freq: 1800, len: 1800, a: 40, d: 600, s: 0.45, r: 1300, filter: 'lp', cutoff: 420, cutoffTo: 180, q: 0.9, vol: 0.63, echo: 0.2 },
      { at: 350, wave: 'noise', freq: 1300, len: 1200, a: 200, d: 500, s: 0.5, r: 1200, filter: 'lp', cutoff: 320, q: 0.8, trem: 0.5, tremRate: 7, vol: 0.56, echo: 0.2 },
    ],
  },
  bell: { layers: [{ inst: 'bell', note: 'b-4', len: 3000, vol: 1.885, echo: 0.4 }] },
  bats: {
    layers: [0, 70, 120, 210, 260, 380, 430, 520, 600].map((at, i): SfxLayer => ({
      at, wave: i % 2 ? 'pulse12' : 'sine', freq: 3800 + ((i * 577) % 1500), to: 5200 + ((i * 331) % 1200), glide: 18,
      len: 20, a: 1, r: 12, vol: i % 2 ? 0.08 : 0.15, pan: (((i * 5) % 9) - 4) / 5, echo: 0.25,
    })),
  },
  cheer: {
    layers: [
      { wave: 'noise', freq: 30000, len: 1500, a: 450, d: 900, s: 0.6, r: 700, filter: 'bp', cutoff: 1100, q: 0.7, trem: 0.25, tremRate: 9, vol: 0.682, pan: -0.25, echo: 0.2 },
      { wave: 'noise', freq: 30000, len: 1500, a: 550, d: 900, s: 0.6, r: 700, filter: 'bp', cutoff: 2300, q: 0.8, trem: 0.25, tremRate: 11, vol: 0.434, pan: 0.25, echo: 0.2 },
      ...[260, 480].map((at, i): SfxLayer => ({
        at, wave: 'pulse12', freq: 520 + i * 60, to: 820 + i * 80, glide: 220, len: 300, a: 40, r: 120,
        filter: 'lp', cutoff: 1600, vib: 0.4, vibRate: 7, vol: 0.037, pan: i ? 0.4 : -0.4,
      })),
      ...[150, 330, 420, 610, 700, 880, 990, 1150].map((at, i): SfxLayer => ({ at, inst: 'drums', note: 'g4', len: 50, vol: 0.217, pan: spread(i % 4, 4, 1.2) })),
    ],
  },

  // ───── mini-games & story ─────
  ball_hit: {
    layers: [
      { wave: 'tri', freq: 85, drop: 12, dropTime: 22, len: 90, a: 1, d: 110, s: 0, r: 30, vol: 0.7, echo: 0 },
      { wave: 'noise', freq: 16000, len: 22, a: 0.5, d: 22, s: 0, r: 10, filter: 'lp', cutoff: 1600, vol: 0.45, echo: 0 },
    ],
  },
  spike: {
    layers: [
      { wave: 'sine', freq: 75, drop: 18, dropTime: 25, len: 140, a: 0.5, d: 160, s: 0, r: 40, vol: 0.427, echo: 0 },
      { wave: 'noise', freq: 32000, len: 120, a: 0.5, d: 120, s: 0, r: 40, filter: 'bp', cutoff: 2200, q: 0.8, vol: 0.61, echo: 0.2 },
      { wave: 'metal', freq: 40000, len: 60, a: 0.5, d: 60, s: 0, r: 30, filter: 'hp', cutoff: 5000, vol: 0.098 },
    ],
  },
  whistle: {
    layers: [
      { wave: 'sine', freq: 2300, to: 2500, glide: 40, len: 480, a: 12, r: 70, vib: 0.35, vibRate: 28, vol: 0.2 },
      { wave: 'noise', freq: 32000, len: 480, a: 12, r: 70, filter: 'bp', cutoff: 2500, q: 5, trem: 0.4, tremRate: 28, vol: 0.5 },
    ],
  },
  heartbeat: {
    layers: [
      { wave: 'tri', freq: 58, drop: 9, dropTime: 20, len: 90, a: 2, d: 120, s: 0, r: 40, vol: 0.75, echo: 0 },
      { wave: 'noise', freq: 4000, len: 40, a: 1, d: 40, s: 0, r: 20, filter: 'lp', cutoff: 300, vol: 0.4, echo: 0 },
      { at: 190, wave: 'tri', freq: 52, drop: 7, dropTime: 20, len: 80, a: 2, d: 110, s: 0, r: 40, vol: 0.55, echo: 0 },
    ],
  },
  monitor_beep: {
    layers: [
      { wave: 'sine', note: 'b5', len: 100, a: 3, r: 30, vol: 0.336 },
      { wave: 'pulse12', note: 'b6', len: 100, a: 3, r: 30, vol: 0.042 },
    ],
  },
  success: {
    bpm: 160,
    tracks: [
      { inst: 'pulse25', mml: 'v12 o5 l32 c e g > c e g > c8', echo: 0.15 },
      { inst: 'tri', mml: 'v13 o4 l16 c g > c8' },
      { inst: 'glock', mml: 'v11 r16 r16 r32 r32 o6 c8', echo: 0.3 },
    ],
  },
  fail: {
    layers: [
      { wave: 'pulse12', note: 'e5', len: 90, a: 2, r: 30, vol: 0.15 },
      { at: 100, wave: 'pulse12', note: 'c5', len: 90, a: 2, r: 30, vol: 0.15 },
      { at: 200, wave: 'pulse12', note: 'a4', to: 415.3, glide: 260, len: 260, a: 2, r: 120, vib: 0.3, vibRate: 6, vol: 0.15 },
      { at: 200, wave: 'tri', note: 'a3', len: 260, a: 2, r: 120, vol: 0.16 },
    ],
  },
  typing: {
    layers: [
      ...[0, 105, 190, 320, 400, 520, 610].map((at, i): SfxLayer => ({
        at, wave: 'metal', freq: 18000 + ((i * 7919) % 9) * 2500, len: 9, a: 0.5, d: 12, s: 0, r: 8,
        filter: 'hp', cutoff: 2500 + (i % 3) * 600, vol: 0.262, pan: (((i * 3) % 5) - 2) * 0.1, echo: 0,
      })),
      { at: 700, wave: 'noise', freq: 9000, len: 25, a: 1, d: 30, s: 0, r: 10, filter: 'lp', cutoff: 900, vol: 0.287, echo: 0 },
    ],
  },
  build_ok: {
    layers: [
      ...arp(['e6', 'g6'], 45, { wave: 'pulse50', vol: 0.11, r: 10, last: 30 }),
      { at: 90, wave: 'pulse50', note: 'c7', len: 110, a: 1, r: 60, vol: 0.11 },
      { at: 90, inst: 'glock', note: 'c7', len: 600, vol: 0.9, echo: 0.25 },
      { at: 90, wave: 'tri', note: 'c5', len: 110, a: 1, r: 60, vol: 0.2 },
    ],
  },
  chomp: {
    layers: [
      { wave: 'pulse12', freq: 700, to: 160, glide: 45, len: 50, a: 1, r: 25, vol: 0.144 },
      { at: 40, wave: 'noise', freq: 30000, len: 25, a: 0.5, d: 30, s: 0, r: 15, filter: 'bp', cutoff: 1900, q: 1.2, vol: 0.72, echo: 0.1 },
      { at: 40, wave: 'sine', freq: 140, drop: 10, dropTime: 12, len: 40, a: 0.5, d: 50, s: 0, r: 20, vol: 0.288, echo: 0 },
    ],
  },
};

/** Every sound effect id, in catalog order. */
export const SFX_IDS = Object.keys(SFX) as SfxId[];
