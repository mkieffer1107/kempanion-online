// Procedural placeholder art for backgrounds and CGs that have not been painted yet: a dithered sky for
// the time of day, distant campus silhouettes, live oaks, grass, a brick path and a sakura tree.
// Deterministic per id; drawn once into a cached 480x270 canvas.
import { LOCATIONS, LOCATION_IDS } from '../content/locations';
import type { TimeOfDay } from '../types';
import { BAYER4 } from './dither';
import { hashString, irange, mulberry32, range, type Rng } from './rng';

type RGB = [number, number, number];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const css = (c: RGB): string => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cl = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Re-light a daytime color for the time of day. */
function lit(c: string | RGB, tod: TimeOfDay): RGB {
  const v = typeof c === 'string' ? hex(c) : c;
  switch (tod) {
    case 'day': return v;
    case 'morning': return [cl(v[0] * 0.97 + 10), cl(v[1] * 0.92 + 8), cl(v[2] * 0.86 + 6)];
    case 'evening': return [cl(v[0] * 0.9 + 14), cl(v[1] * 0.68 + 6), cl(v[2] * 0.7 + 16)];
    case 'night': return [v[0] * 0.24 + 10, v[1] * 0.28 + 10, v[2] * 0.46 + 28];
  }
}
const litCss = (c: string | RGB, tod: TimeOfDay) => css(lit(c, tod));

const SKY: Record<TimeOfDay, string[]> = {
  day: ['#3e7fd8', '#5e9be6', '#86b9f0', '#b4d6f7', '#dceeff'],
  morning: ['#6c8fd6', '#a3a8e0', '#e7b9c9', '#ffd2b4', '#ffe9cc'],
  evening: ['#2b2160', '#5e3584', '#b4527e', '#ee8466', '#ffc07a'],
  night: ['#090720', '#110e33', '#1a1748', '#24225c', '#2f2e6e'],
};
const WINDOW_LIT = '#ffd98a';
const HORIZON = 168;

/** Insert `k − 1` interpolated colors between neighbors so dithered bands stay subtle. */
function expand(stops: RGB[], k: number): RGB[] {
  const out: RGB[] = [];
  for (let i = 0; i < stops.length - 1; i++) for (let j = 0; j < k; j++) out.push(mixRgb(stops[i], stops[i + 1], j / k));
  out.push(stops[stops.length - 1]);
  return out;
}

/** Vertical gradient through `stops` with 4x4 ordered dithering between neighboring colors. */
function ditherGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, stops: RGB[]) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const n = stops.length - 1;
  for (let y = 0; y < h; y++) {
    const pos = (h <= 1 ? 0 : y / (h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(pos));
    const f = pos - i;
    const a = stops[i], b = stops[i + 1];
    for (let x = 0; x < w; x++) {
      const th = (BAYER4[(((y0 + y) & 3) << 2) | ((x0 + x) & 3)] + 0.5) / 16;
      const c = f > th ? b : a;
      const o = (y * w + x) * 4;
      d[o] = c[0];
      d[o + 1] = c[1];
      d[o + 2] = c[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}

function skyColorAt(tod: TimeOfDay, y: number): RGB {
  const stops = SKY[tod].map(hex);
  const pos = Math.max(0, Math.min(1, y / HORIZON)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  return mixRgb(stops[i], stops[i + 1], pos - i);
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  const r = ry + 0.5;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const k = 1 - (dy * dy) / (r * r);
    if (k <= 0) continue;
    const half = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

/** Disc filled only where the Bayer threshold is under `step` (soft pixel glow). */
function ditherDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, step: number) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      if (BAYER4[((y & 3) << 2) | (x & 3)] < step) ctx.fillRect(x, y, 1, 1);
    }
  }
}

function speckle(ctx: CanvasRenderingContext2D, rng: Rng, color: string, n: number, x: number, y: number, w: number, h: number, size = 1) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) ctx.fillRect(Math.round(x + rng() * w), Math.round(y + rng() * h), size, size);
}

interface SceneStyle {
  tower: boolean;
  bowl: boolean;
  house: boolean;
  water: boolean;
  modern: boolean;
  tall: boolean;
  bigSakura: boolean;
}

const STYLES: Record<string, Partial<SceneStyle>> = {
  century_tower: { tower: true },
  legend_sakura: { tower: true, bigSakura: true },
  plaza: { tower: true },
  stadium: { bowl: true },
  sakura_house: { house: true, bigSakura: true },
  dorm: { house: true, bigSakura: true },
  lake_alice: { water: true },
  shands: { tall: true },
  communicore: { tall: true },
  or_suite: { tall: true },
  anatomy_lab: { tall: true },
  malachowsky: { modern: true },
  physics: { modern: true },
  physics_lab: { modern: true },
  marston: { modern: true },
};

/** Paint a stand-in for a background that has not been painted yet. */
export function paintPlaceholderBackground(ctx: CanvasRenderingContext2D, id: string, tod: TimeOfDay, w = 480, h = 270): void {
  if (id === 'map') {
    paintMap(ctx, tod, w, h);
    return;
  }
  const s: SceneStyle = { tower: false, bowl: false, house: false, water: false, modern: false, tall: false, bigSakura: false, ...STYLES[id] };
  const rng = mulberry32(hashString(id));
  ditherGradient(ctx, 0, 0, w, HORIZON + 6, expand(SKY[tod].map(hex), 2));
  celestial(ctx, tod, rng, w);
  clouds(ctx, tod, rng, w);
  const towerX = s.tower ? Math.round(w * (0.6 + rng() * 0.12)) : -999;
  skyline(ctx, tod, rng, w, 0.45, towerX, s);
  if (s.tower) tower(ctx, tod, towerX);
  if (s.bowl) stadium(ctx, tod, w);
  skyline(ctx, tod, rng, w, 0, towerX, s);
  treeLine(ctx, tod, rng, w);
  ditherGradient(ctx, 0, HORIZON + 2, w, h - HORIZON - 2, expand(['#9ccb6e', '#7db85e', '#5e9e4e', '#4a8443'].map((c) => lit(c, tod)), 2));
  speckle(ctx, rng, litCss('#3f7a3c', tod), 140, 0, HORIZON + 8, w, h - HORIZON - 8, 1);
  if (s.water) lake(ctx, tod, rng, w);
  else path(ctx, tod, w, h);
  if (s.house) house(ctx, tod, Math.round(w * 0.3));
  const side = rng() < 0.5 ? -1 : 1;
  const mainX = s.bigSakura ? Math.round(w / 2 + side * w * 0.26) : Math.round(w / 2 + side * w * 0.37);
  sakura(ctx, tod, rng, Math.round(w / 2 - side * w * 0.33), HORIZON + 16, 0.55);
  if (!s.water) lamps(ctx, tod, w);
  sakura(ctx, tod, rng, mainX, h - 14, s.bigSakura ? 1.3 : 1);
  bushes(ctx, tod, rng, w, h);
  speckle(ctx, rng, litCss('#f7b6cc', tod), 50, 0, HORIZON + 14, w, h - HORIZON - 16, 1);
  speckle(ctx, rng, litCss('#ffd6e7', tod), 20, 0, HORIZON + 20, w, h - HORIZON - 22, 2);
}

function celestial(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, w: number) {
  if (tod === 'night') {
    speckle(ctx, rng, '#cfc8ff', 50, 0, 0, w, HORIZON - 40, 1);
    speckle(ctx, rng, '#ffffff', 30, 0, 0, w, HORIZON - 60, 1);
    ctx.fillStyle = '#fff8d8';
    for (let i = 0; i < 7; i++) {
      const x = Math.round(rng() * w), y = Math.round(rng() * 90);
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
    const mx = Math.round(w * 0.82), my = 38;
    ctx.fillStyle = '#3b3a7a';
    ditherDisc(ctx, mx, my, 15, 6);
    ctx.fillStyle = '#fff4d6';
    ellipse(ctx, mx, my, 9, 9);
    ctx.fillStyle = css(skyColorAt(tod, my - 3));
    ellipse(ctx, mx + 4, my - 3, 8, 8);
    return;
  }
  const sun = {
    day: { x: w * 0.82, y: 36, r: 10, halo: '#fff8e0', disc: '#fff3c4', core: '#fffbe6' },
    morning: { x: w * 0.18, y: 130, r: 12, halo: '#ffe2b8', disc: '#ffd89a', core: '#fff0c8' },
    evening: { x: w * 0.67, y: 152, r: 15, halo: '#ffb27a', disc: '#ff9c5a', core: '#ffc27e' },
  }[tod];
  ctx.fillStyle = sun.halo;
  ditherDisc(ctx, sun.x, sun.y, sun.r + 6, 7);
  ctx.fillStyle = sun.disc;
  ellipse(ctx, sun.x, sun.y, sun.r, sun.r);
  ctx.fillStyle = sun.core;
  ellipse(ctx, sun.x - 2, sun.y - 2, sun.r - 4, sun.r - 4);
}

const CLOUD: Record<TimeOfDay, [string, string]> = {
  day: ['#ffffff', '#dfeaf8'],
  morning: ['#fff1e6', '#f3c6c4'],
  evening: ['#ffb08c', '#b8607e'],
  night: ['#2c2a5e', '#201e4c'],
};

function clouds(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, w: number) {
  const [top, shade] = CLOUD[tod];
  const n = tod === 'night' ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const cx = Math.round(rng() * w), cy = Math.round(18 + rng() * 78);
    const len = 30 + rng() * 44;
    ctx.fillStyle = shade;
    ellipse(ctx, cx, cy + 2, len / 2, 4);
    ctx.fillStyle = top;
    ellipse(ctx, cx, cy, len / 2 - 2, 3);
    ellipse(ctx, cx - len * 0.16, cy - 4, len * 0.2, 5);
    ellipse(ctx, cx + len * 0.12, cy - 5, len * 0.18, 6);
  }
}

function building(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, x: number, y: number, bw: number, bh: number, body: RGB, haze: number, glass: boolean) {
  const base = haze > 0 ? mixRgb(lit(body, tod), skyColorAt(tod, HORIZON - 10), haze) : lit(body, tod);
  ctx.fillStyle = css(base);
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = css(mixRgb(base, [0, 0, 0], 0.18));
  ctx.fillRect(x + bw - 2, y, 2, bh);
  if (!glass && rng() < 0.4) {
    const roof = css(mixRgb(base, [40, 30, 50], 0.35));
    ctx.fillStyle = roof;
    const rh = Math.max(3, Math.round(bw / 5));
    for (let i = 0; i < rh; i++) {
      const inset = Math.round(((i + 1) * bw) / (2 * rh));
      ctx.fillRect(x + inset - 1, y - i - 1, bw - inset * 2 + 2, 1);
    }
  } else {
    ctx.fillStyle = css(mixRgb(base, [255, 255, 255], 0.15));
    ctx.fillRect(x, y, bw, 1);
  }
  if (haze > 0.3) return;
  const night = tod === 'night', eve = tod === 'evening';
  for (let wy = y + 5; wy < y + bh - 6; wy += 7) {
    for (let wx = x + 4; wx < x + bw - 5; wx += 6) {
      const on = (night && rng() < 0.5) || (eve && rng() < 0.2);
      ctx.fillStyle = on ? WINDOW_LIT : glass ? litCss('#a9c6e0', tod) : litCss('#5a4a5a', tod);
      ctx.fillRect(wx, wy, 2, 3);
    }
  }
}

function skyline(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, w: number, haze: number, towerX: number, s: SceneStyle) {
  const far = haze > 0;
  let x = far ? -16 : -8;
  while (x < w + 16) {
    const bw = far ? irange(rng, 22, 56) : irange(rng, 34, 78);
    let bh = far ? irange(rng, 14, 30) : s.tall ? irange(rng, 36, 84) : irange(rng, 22, 46);
    if (!far && Math.abs(x + bw / 2 - towerX) < 34) bh = Math.min(bh, 18);
    const body: RGB = s.modern && !far ? hex(rng() < 0.6 ? '#9fb8c8' : '#d8cfc2') : s.tall && !far ? hex('#e6dccf') : hex(rng() < 0.7 ? '#b5583f' : '#c9a27a');
    if (far || rng() < 0.85) building(ctx, tod, rng, x, HORIZON + 4 - bh, bw, bh, body, haze, s.modern && !far);
    x += bw + irange(rng, -4, 8);
  }
}

function tower(ctx: CanvasRenderingContext2D, tod: TimeOfDay, tx: number) {
  const top = 46, base = HORIZON + 4, half = 11;
  ctx.fillStyle = litCss('#b5583f', tod);
  ctx.fillRect(tx - half, top, half * 2, base - top);
  ctx.fillStyle = litCss('#cf7456', tod);
  ctx.fillRect(tx + half - 4, top, 3, base - top);
  ctx.fillStyle = litCss('#8e3f2e', tod);
  ctx.fillRect(tx - half, top, 2, base - top);
  for (let y = top + 34; y < base - 8; y += 12) ctx.fillRect(tx - 1, y, 2, 6);
  ctx.fillStyle = litCss('#3a2a3a', tod);
  for (let i = -1; i <= 1; i++) ctx.fillRect(tx + i * 6 - 1, top + 6, 3, 7);
  ctx.fillStyle = tod === 'night' ? '#ffe9a8' : '#f6ead2';
  ellipse(ctx, tx, top + 24, 4, 4);
  ctx.fillStyle = '#2a2030';
  ctx.fillRect(tx, top + 21, 1, 4);
  ctx.fillRect(tx, top + 24, 3, 1);
  ctx.fillStyle = litCss('#5e7a72', tod);
  for (let i = 0; i < 18; i++) {
    const hw = Math.round(half + 2 - (i * (half + 2)) / 18);
    ctx.fillRect(tx - hw, top - i - 1, hw * 2, 1);
  }
  ctx.fillStyle = litCss('#7b5a3a', tod);
  ctx.fillRect(tx - half - 2, top - 1, half * 2 + 4, 2);
}

function stadium(ctx: CanvasRenderingContext2D, tod: TimeOfDay, w: number) {
  const top = HORIZON - 62, base = HORIZON + 6;
  for (let y = top; y < base; y++) {
    const t = (y - top) / (base - top);
    const inset = Math.round(30 + t * 26);
    ctx.fillStyle = (y - top) % 6 < 2 ? litCss('#a89f92', tod) : litCss('#c9c1b4', tod);
    ctx.fillRect(inset, y, w - inset * 2, 1);
  }
  ctx.fillStyle = litCss('#5a5a6a', tod);
  ctx.fillRect(28, top - 2, w - 56, 3);
  for (const px of [40, w - 42]) {
    ctx.fillStyle = litCss('#4a4a58', tod);
    ctx.fillRect(px, top - 44, 2, 46);
    ctx.fillStyle = tod === 'night' || tod === 'evening' ? '#fff3c4' : litCss('#e8eef4', tod);
    ctx.fillRect(px - 5, top - 50, 12, 6);
    if (tod === 'night') {
      ctx.fillStyle = '#ffeeb0';
      ditherDisc(ctx, px + 1, top - 47, 14, 4);
    }
  }
}

function treeLine(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, w: number) {
  const dark = litCss('#355f33', tod), mid = litCss('#4a7a40', tod), moss = litCss('#9aa58a', tod);
  let x = -20;
  while (x < w + 20) {
    x += irange(rng, 16, 34);
    if (rng() < 0.25) continue;
    const cy = HORIZON - 2 - rng() * 8;
    const rx = range(rng, 12, 22), ry = range(rng, 8, 12);
    ctx.fillStyle = dark;
    ellipse(ctx, x, cy, rx, ry);
    ellipse(ctx, x + rx * 0.6, cy + 2, rx * 0.7, ry * 0.8);
    ctx.fillStyle = mid;
    ellipse(ctx, x - rx * 0.25, cy - ry * 0.35, rx * 0.55, ry * 0.45);
    ctx.fillStyle = moss;
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - rx * 0.6 + rng() * rx * 1.2), Math.round(cy + ry * 0.5), 1, irange(rng, 2, 5));
    ctx.fillStyle = litCss('#4a3a30', tod);
    ctx.fillRect(Math.round(x), Math.round(cy + ry * 0.7), 2, HORIZON + 6 - Math.round(cy + ry * 0.7));
  }
}

function path(ctx: CanvasRenderingContext2D, tod: TimeOfDay, w: number, h: number) {
  const top = HORIZON + 4;
  const cx = w / 2;
  const brick = litCss('#c4795a', tod), mortar = litCss('#a85f45', tod), edge = litCss('#e2a184', tod);
  let nextLine = top + 2;
  let gap = 2;
  for (let y = top; y < h; y++) {
    const t = (y - top) / (h - top);
    const half = Math.round(7 + 78 * Math.pow(t, 1.15));
    ctx.fillStyle = y === nextLine ? mortar : brick;
    if (y === nextLine) {
      gap += 1;
      nextLine += gap;
    }
    ctx.fillRect(Math.round(cx - half), y, half * 2, 1);
    ctx.fillStyle = edge;
    ctx.fillRect(Math.round(cx - half) - 1, y, 1, 1);
    ctx.fillRect(Math.round(cx + half), y, 1, 1);
  }
}

function lake(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, w: number) {
  const top = HORIZON + 3, bottom = HORIZON + 50;
  ditherGradient(ctx, 0, top, w, bottom - top, expand(['#8fbfe6', '#5f93c8', '#3f6fa8'].map((c) => lit(c, tod)), 2));
  ctx.fillStyle = tod === 'night' ? '#fff4d6' : tod === 'evening' ? '#ffc07a' : '#d8ecff';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.round(rng() * w), Math.round(top + 2 + rng() * (bottom - top - 4)), irange(rng, 3, 9), 1);
  ctx.fillStyle = litCss('#4f7a3e', tod);
  ctx.fillRect(0, bottom, w, 2);
}

function house(ctx: CanvasRenderingContext2D, tod: TimeOfDay, x: number) {
  const y = HORIZON - 30, hw = 128, hh = 62;
  ctx.fillStyle = litCss('#e8d2b0', tod);
  ctx.fillRect(x, y, hw, hh);
  ctx.fillStyle = litCss('#d4bc98', tod);
  for (let sy = y + 2; sy < y + hh; sy += 3) ctx.fillRect(x, sy, hw, 1);
  ctx.fillStyle = litCss('#7a4b3a', tod);
  for (let i = 0; i < 16; i++) ctx.fillRect(x - 8 + i * 2, y - i - 1, hw + 16 - i * 4, 1);
  const win = tod === 'night' || tod === 'evening' ? WINDOW_LIT : litCss('#8fb0d8', tod);
  for (const wx of [x + 12, x + 40, x + 76, x + 104]) {
    ctx.fillStyle = litCss('#f6ead2', tod);
    ctx.fillRect(wx - 1, y + 7, 14, 13);
    ctx.fillStyle = win;
    ctx.fillRect(wx, y + 8, 12, 11);
    ctx.fillStyle = litCss('#f6ead2', tod);
    ctx.fillRect(wx + 5, y + 8, 2, 11);
  }
  ctx.fillStyle = litCss('#8a6a52', tod);
  ctx.fillRect(x - 4, y + 34, hw + 8, 3);
  ctx.fillStyle = litCss('#f6ead2', tod);
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 2 + i * 32, y + 37, 3, hh - 37);
  ctx.fillStyle = litCss('#6b4234', tod);
  ctx.fillRect(x + 56, y + 40, 14, hh - 40);
  ctx.fillStyle = litCss('#b89a7a', tod);
  ctx.fillRect(x - 6, y + hh, hw + 12, 4);
}

function sakura(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, bx: number, baseY: number, k: number) {
  const trunkTop = baseY - Math.round(108 * k);
  ctx.fillStyle = litCss('#6b4234', tod);
  for (let y = trunkTop; y < baseY; y++) {
    const t = (y - trunkTop) / (baseY - trunkTop);
    const half = Math.max(1, Math.round((2 + 4 * t) * k));
    const lean = Math.round(Math.sin(t * 2.4) * 3 * k);
    ctx.fillRect(bx - half + lean, y, half * 2, 1);
  }
  ctx.fillStyle = litCss('#8a5a44', tod);
  ctx.fillRect(bx - Math.round(2 * k), trunkTop + 10, 1, baseY - trunkTop - 14);
  ctx.fillStyle = litCss('#6b4234', tod);
  for (let b = 0; b < 4; b++) {
    const dir = b % 2 === 0 ? -1 : 1;
    const len = Math.round((22 + rng() * 22) * k);
    const sy = trunkTop + Math.round((10 + b * 8) * k);
    for (let i = 0; i < len; i++) ctx.fillRect(bx + dir * i, sy - Math.round(i * 0.55), 2, Math.max(1, Math.round(2 * k)));
  }
  const cy = trunkTop - Math.round(4 * k);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const rx = range(rng, 18, 30) * k;
    blobs.push([bx + range(rng, -52, 52) * k, cy + range(rng, -26, 22) * k, rx]);
  }
  ctx.fillStyle = litCss('#d6608a', tod);
  for (const [x, y, r] of blobs) ellipse(ctx, x + 2, y + 3, r, r * 0.72);
  ctx.fillStyle = litCss('#f49ac1', tod);
  for (const [x, y, r] of blobs) ellipse(ctx, x, y, r, r * 0.72);
  ctx.fillStyle = litCss('#ffc2d6', tod);
  for (const [x, y, r] of blobs) ellipse(ctx, x - r * 0.25, y - r * 0.28, r * 0.55, r * 0.38);
  const spread = 62 * k;
  speckle(ctx, rng, litCss('#ffe3ea', tod), Math.round(46 * k), bx - spread, cy - 30 * k, spread * 2, 52 * k, 1);
  speckle(ctx, rng, litCss('#c24d7e', tod), Math.round(30 * k), bx - spread, cy - 24 * k, spread * 2, 52 * k, 1);
}

function lamps(ctx: CanvasRenderingContext2D, tod: TimeOfDay, w: number) {
  const lit2 = tod === 'night' || tod === 'evening';
  for (const x of [Math.round(w / 2 - 74), Math.round(w / 2 + 72)]) {
    const top = 200, base = 250;
    if (lit2) {
      ctx.fillStyle = tod === 'night' ? '#ffd98a' : '#ffe2b0';
      ditherDisc(ctx, x + 1, top - 3, 13, tod === 'night' ? 6 : 3);
      ditherDisc(ctx, x + 1, base, 10, 2);
    }
    ctx.fillStyle = litCss('#2b2b3a', tod);
    ctx.fillRect(x, top, 2, base - top);
    ctx.fillRect(x - 2, base - 2, 6, 2);
    ctx.fillRect(x - 3, top - 7, 8, 1);
    ctx.fillRect(x - 3, top - 1, 8, 1);
    ctx.fillStyle = lit2 ? '#fff3c4' : litCss('#e8eef4', tod);
    ctx.fillRect(x - 2, top - 6, 6, 5);
  }
}

function bushes(ctx: CanvasRenderingContext2D, tod: TimeOfDay, rng: Rng, w: number, h: number) {
  const leaf = litCss('#3f7a3e', tod), leaf2 = litCss('#4f8f48', tod);
  for (let i = 0; i < 7; i++) {
    const x = rng() < 0.5 ? rng() * w * 0.3 : w - rng() * w * 0.3;
    const y = h - 4 - rng() * 6;
    const rx = range(rng, 14, 26), ry = range(rng, 8, 12);
    ctx.fillStyle = leaf;
    ellipse(ctx, x, y, rx, ry);
    ctx.fillStyle = leaf2;
    ellipse(ctx, x - rx * 0.2, y - ry * 0.3, rx * 0.6, ry * 0.45);
    speckle(ctx, rng, litCss('#e0559a', tod), 18, x - rx * 0.8, y - ry * 0.8, rx * 1.6, ry * 1.2, 2);
    speckle(ctx, rng, litCss('#ffb7d5', tod), 10, x - rx * 0.8, y - ry * 0.8, rx * 1.6, ry * 1.2, 1);
  }
}

// ───────────────────────── campus map ─────────────────────────

function thickLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, t: number) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const o = Math.floor(t / 2);
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, t, t);
}

/** A connected footpath network: minimum spanning tree plus each pin's nearest neighbor. */
function campusPaths(pts: readonly { x: number; y: number }[]): [number, number][] {
  const d2 = (a: number, b: number) => (pts[a].x - pts[b].x) ** 2 + (pts[a].y - pts[b].y) ** 2;
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  const add = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!seen.has(k)) {
      seen.add(k);
      edges.push([a, b]);
    }
  };
  const inTree = [0];
  while (inTree.length < pts.length) {
    let best: [number, number] | null = null;
    for (const a of inTree) {
      for (let b = 0; b < pts.length; b++) {
        if (inTree.includes(b)) continue;
        if (!best || d2(a, b) < d2(best[0], best[1])) best = [a, b];
      }
    }
    if (!best) break;
    add(best[0], best[1]);
    inTree.push(best[1]);
  }
  for (let a = 0; a < pts.length; a++) {
    let near = -1;
    for (let b = 0; b < pts.length; b++) if (b !== a && (near < 0 || d2(a, b) < d2(a, near))) near = b;
    if (near >= 0) add(a, near);
  }
  return edges;
}

function paintMap(ctx: CanvasRenderingContext2D, tod: TimeOfDay, w: number, h: number) {
  const rng = mulberry32(0x6d6170);
  ditherGradient(ctx, 0, 0, w, h, expand(['#8cc56f', '#79b862', '#6aa957'].map((c) => lit(c, tod)), 3));
  speckle(ctx, rng, litCss('#5f9a4f', tod), 500, 0, 0, w, h, 1);
  const pts = LOCATION_IDS.map((id) => ({ id, x: Math.round(LOCATIONS[id].map.x * w), y: Math.round(LOCATIONS[id].map.y * h) }));
  for (let i = 0; i < 110; i++) {
    const x = rng() * w, y = rng() * h;
    if (pts.some((p) => Math.abs(p.x - x) < 18 && Math.abs(p.y - y) < 14)) continue;
    const sakuraTree = rng() < 0.35;
    const r = range(rng, 2.5, 5);
    ctx.fillStyle = litCss(sakuraTree ? '#d6608a' : '#2f5a2e', tod);
    ellipse(ctx, x + 1, y + 1, r, r * 0.8);
    ctx.fillStyle = litCss(sakuraTree ? '#f49ac1' : '#3f6e3a', tod);
    ellipse(ctx, x, y, r, r * 0.8);
    ctx.fillStyle = litCss(sakuraTree ? '#ffd6e7' : '#5c8f4a', tod);
    ctx.fillRect(Math.round(x - r / 3), Math.round(y - r / 3), 1, 1);
  }
  const lakePt = pts.find((p) => p.id === 'lake_alice');
  if (lakePt) {
    ctx.fillStyle = litCss('#9ccbef', tod);
    ellipse(ctx, lakePt.x, lakePt.y, 34, 20);
    ctx.fillStyle = litCss('#5b9bd5', tod);
    ellipse(ctx, lakePt.x, lakePt.y, 31, 17);
    speckle(ctx, rng, litCss('#cde7fb', tod), 16, lakePt.x - 22, lakePt.y - 10, 44, 20, 1);
  }
  const roads = campusPaths(pts);
  for (const [color, t] of [[litCss('#cdb98a', tod), 5], [litCss('#f2e6c0', tod), 3]] as const) {
    ctx.fillStyle = color;
    for (const [a, b] of roads) thickLine(ctx, pts[a].x, pts[a].y, pts[b].x, pts[b].y, t);
  }
  for (const p of pts) {
    switch (p.id) {
      case 'lake_alice':
        break;
      case 'volleyball_courts':
        ctx.fillStyle = litCss('#e9d5a0', tod);
        ctx.fillRect(p.x - 12, p.y - 7, 24, 14);
        ctx.fillStyle = litCss('#ffffff', tod);
        ctx.fillRect(p.x - 1, p.y - 7, 1, 14);
        break;
      case 'stadium':
        ctx.fillStyle = litCss('#a89f92', tod);
        ellipse(ctx, p.x, p.y, 22, 14);
        ctx.fillStyle = litCss('#c9c1b4', tod);
        ellipse(ctx, p.x, p.y, 19, 11);
        ctx.fillStyle = litCss('#5fa35a', tod);
        ellipse(ctx, p.x, p.y, 12, 6);
        break;
      case 'plaza':
        ctx.fillStyle = litCss('#a6d684', tod);
        ctx.fillRect(p.x - 14, p.y - 9, 28, 18);
        ctx.fillStyle = litCss('#f2e6c0', tod);
        ctx.fillRect(p.x - 14, p.y, 28, 1);
        ctx.fillRect(p.x, p.y - 9, 1, 18);
        break;
      default: {
        const tall = p.id === 'century_tower';
        const bw = tall ? 8 : 18, bh = tall ? 12 : 11;
        ctx.fillStyle = litCss('#7a3a2c', tod);
        ctx.fillRect(p.x - bw / 2 + 1, p.y - bh / 2 + 2, bw, bh);
        ctx.fillStyle = litCss(p.id === 'midtown' ? '#c98ad6' : '#c4705a', tod);
        ctx.fillRect(p.x - bw / 2, p.y - bh / 2, bw, bh);
        ctx.fillStyle = litCss('#e29a7e', tod);
        ctx.fillRect(p.x - bw / 2, p.y - bh / 2, bw, 2);
        if (tod === 'night') {
          ctx.fillStyle = WINDOW_LIT;
          for (let i = 0; i < 3; i++) ctx.fillRect(p.x - bw / 2 + 2 + i * 5, p.y, 2, 2);
        }
      }
    }
  }
}

// ───────────────────────── CG stand-in ─────────────────────────

/** A crop of a portrait atlas to feature on a placeholder CG. */
export interface CGFace {
  img: CanvasImageSource;
  sx: number;
  sy: number;
}

/** A polaroid "memory" card standing in for an event CG that has not been painted yet. */
export function paintPlaceholderCG(ctx: CanvasRenderingContext2D, id: string, title: string, subtitle: string, faces: CGFace[], w = 480, h = 270): void {
  const rng = mulberry32(hashString(id));
  ditherGradient(ctx, 0, 0, w, h, expand(['#ffe9ef', '#ffd0dd', '#f6aac2'].map(hex), 3));
  for (let i = 0; i < 70; i++) {
    const x = Math.round(rng() * w), y = Math.round(rng() * h);
    ctx.fillStyle = rng() < 0.5 ? '#f48fb1' : '#ffffff';
    ctx.fillRect(x, y, 2, 1);
    ctx.fillRect(x + 1, y + 1, 2, 1);
  }
  const pw = 236, ph = 196, px = Math.round((w - pw) / 2), py = 22;
  ctx.fillStyle = 'rgba(27,18,41,0.35)';
  ctx.fillRect(px + 4, py + 4, pw, ph);
  ctx.fillStyle = '#1b1229';
  ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2);
  ctx.fillStyle = '#fff6ea';
  ctx.fillRect(px, py, pw, ph);
  const ax = px + 10, ay = py + 10, aw = pw - 20, ah = 128;
  ditherGradient(ctx, ax, ay, aw, ah, expand(['#4a3a8a', '#a8558e', '#f08c6a', '#ffc98e'].map(hex), 2));
  ctx.save();
  ctx.beginPath();
  ctx.rect(ax, ay, aw, ah);
  ctx.clip();
  // a dusk hill with two little sakura trees behind the subjects
  ctx.fillStyle = '#5b3a6e';
  ellipse(ctx, ax + aw / 2, ay + ah + 10, aw * 0.7, 26);
  for (const [tx, s] of [[ax + 22, 1], [ax + aw - 26, 1.2]] as const) {
    ctx.fillStyle = '#5b3a46';
    ctx.fillRect(tx - 1, ay + ah - 26 * s, 3, 26 * s);
    ctx.fillStyle = '#d6608a';
    ellipse(ctx, tx + 1, ay + ah - 30 * s, 15 * s, 10 * s);
    ctx.fillStyle = '#f49ac1';
    ellipse(ctx, tx - 1, ay + ah - 33 * s, 12 * s, 8 * s);
    ctx.fillStyle = '#ffd6e7';
    ellipse(ctx, tx - 4, ay + ah - 36 * s, 4 * s, 3 * s);
  }
  speckle(ctx, rng, '#ffd6e7', 24, ax, ay, aw, ah, 1);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(ax, ay, aw, ah);
  ctx.clip();
  // half-size busts (exact 2:1 nearest-neighbor keeps the pixels even), side by side
  const n = Math.min(3, faces.length);
  const gap = n === 3 ? 70 : 84;
  for (let i = 0; i < n; i++) {
    const f = faces[i];
    const dx = ax + Math.round(aw / 2) - 48 + Math.round((i - (n - 1) / 2) * gap);
    ctx.drawImage(f.img, f.sx, f.sy + 6, 192, 256, dx, ay + 10, 96, 128);
  }
  ctx.restore();
  ctx.fillStyle = '#d9c3a9';
  ctx.fillRect(ax - 1, ay + ah, aw + 2, 1);
  ctx.fillStyle = 'rgba(244,143,177,0.85)';
  ctx.fillRect(px + 18, py - 5, 34, 10);
  ctx.fillRect(px + pw - 52, py - 5, 34, 10);
  ctx.fillStyle = '#1b1229';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px "DotGothic16", "Pixelify Sans", monospace';
  ctx.fillText(title, w / 2, ay + ah + 22, pw - 16);
  ctx.fillStyle = '#7d4e9c';
  ctx.font = '12px "Pixelify Sans", "DotGothic16", monospace';
  ctx.fillText(subtitle, w / 2, ay + ah + 42, pw - 16);
}
