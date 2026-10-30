// Screen transitions and overlays: Bayer dither masks/fills, sakura wipe, iris.
import { context2d, makeCanvas } from './assets';
import { BAYER4 } from './dither';
import { mulberry32 } from './rng';

const patternCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern[]>>();

/** 17 repeating 4x4 patterns (steps 0..16): `color` where bayer < step, transparent elsewhere. */
function patterns(ctx: CanvasRenderingContext2D, color: string): CanvasPattern[] {
  let byColor = patternCache.get(ctx);
  if (!byColor) {
    byColor = new Map();
    patternCache.set(ctx, byColor);
  }
  let list = byColor.get(color);
  if (list) return list;
  list = [];
  for (let s = 0; s <= 16; s++) {
    const tile = makeCanvas(4, 4);
    const t = context2d(tile);
    t.fillStyle = color;
    for (let i = 0; i < 16; i++) if (BAYER4[i] < s) t.fillRect(i & 3, i >> 2, 1, 1);
    const p = ctx.createPattern(tile, 'repeat');
    if (!p) throw new Error('createPattern failed');
    list.push(p);
  }
  byColor.set(color, list);
  return list;
}

/** Fill a rect with `color` dithered at `step` (0..16) — the PC-98 way to fade. */
export function ditherFill(ctx: CanvasRenderingContext2D, color: string, step: number, x: number, y: number, w: number, h: number): void {
  if (step <= 0) return;
  if (step >= 16) {
    ctx.fillStyle = color;
  } else {
    ctx.fillStyle = patterns(ctx, color)[step];
  }
  ctx.fillRect(x, y, w, h);
}

/**
 * Composite the scratch layer onto ctx through a dither mask: at step 0 nothing shows, at 16 all of it.
 * The scratch must already hold the layer (drawn with whatever transform the caller wants).
 */
export function ditherComposite(ctx: CanvasRenderingContext2D, scratch: CanvasRenderingContext2D, w: number, h: number, step: number): void {
  if (step <= 0) return;
  if (step < 16) {
    scratch.setTransform(1, 0, 0, 1, 0, 0);
    scratch.globalCompositeOperation = 'destination-in';
    scratch.fillStyle = patterns(scratch, '#000')[step];
    scratch.fillRect(0, 0, w, h);
    scratch.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(scratch.canvas, 0, 0, w, h, 0, 0, w, h);
  ctx.restore();
}

/** Black (or `color`) everywhere outside a pixel-crisp circle. */
export function drawIris(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, r: number, color = '#000'): void {
  ctx.fillStyle = color;
  if (r <= 0.5) {
    ctx.fillRect(0, 0, w, h);
    return;
  }
  for (let y = 0; y < h; y++) {
    const dy = y + 0.5 - cy;
    const span2 = r * r - dy * dy;
    if (span2 <= 0) {
      ctx.fillRect(0, y, w, 1);
      continue;
    }
    const half = Math.sqrt(span2);
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x0 > 0) ctx.fillRect(0, y, Math.min(w, x0), 1);
    if (x1 < w) ctx.fillRect(Math.max(0, x1), y, w - Math.max(0, x1), 1);
  }
}

/** Radius that covers the whole stage from (cx, cy). */
export function irisMaxRadius(w: number, h: number, cx: number, cy: number): number {
  const dx = Math.max(cx, w - cx);
  const dy = Math.max(cy, h - cy);
  return Math.ceil(Math.sqrt(dx * dx + dy * dy)) + 2;
}

// ── sakura wipe: a petal curtain sweeps across (scene swaps while covered), then blows away ──

const WIPE_PETALS = 140;
const BAND = 6;
const wipe = {
  seed: -1,
  edge: new Float32Array(64),
  petals: new Float32Array(WIPE_PETALS * 5), // y, offset, size, shade, lift
};
const WIPE_FILL = ['#ffb7c5', '#f49ac1', '#ffd6e7', '#d6608a'];
let curtainTile: HTMLCanvasElement | null = null;
const curtainPatterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

function prepareWipe(seed: number, h: number) {
  if (wipe.seed === seed) return;
  wipe.seed = seed;
  const rng = mulberry32(seed);
  const bands = Math.ceil(h / BAND) + 1;
  let v = 0;
  for (let i = 0; i < Math.min(bands, wipe.edge.length); i++) {
    v = v * 0.6 + (rng() - 0.5) * 30;
    wipe.edge[i] = v;
  }
  for (let i = 0; i < WIPE_PETALS; i++) {
    const o = i * 5;
    wipe.petals[o] = rng() * h;
    wipe.petals[o + 1] = -36 + rng() * 64;
    wipe.petals[o + 2] = 3 + ((rng() * 4) | 0);
    wipe.petals[o + 3] = (rng() * 3) | 0;
    wipe.petals[o + 4] = 0.4 + rng() * 0.8;
  }
}

function curtainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | string {
  let p = curtainPatterns.get(ctx);
  if (p) return p;
  if (!curtainTile) {
    curtainTile = makeCanvas(8, 8);
    const t = context2d(curtainTile);
    t.fillStyle = WIPE_FILL[0];
    t.fillRect(0, 0, 8, 8);
    t.fillStyle = WIPE_FILL[1];
    for (let i = 0; i < 64; i++) if (BAYER4[((i >> 3) & 3) * 4 + (i & 3)] < 3) t.fillRect(i & 7, i >> 3, 1, 1);
  }
  p = ctx.createPattern(curtainTile, 'repeat') ?? undefined;
  if (!p) return WIPE_FILL[0];
  curtainPatterns.set(ctx, p);
  return p;
}

/** Sakura wipe at progress p (0..1): covers over the first half, uncovers over the second. */
export function drawSakuraWipe(ctx: CanvasRenderingContext2D, w: number, h: number, p: number, seed: number): void {
  prepareWipe(seed, h);
  const covering = p < 0.5;
  const q = covering ? p / 0.5 : (p - 0.5) / 0.5;
  const edgeX = -70 + (w + 140) * q;
  ctx.fillStyle = curtainPattern(ctx);
  for (let b = 0, y = 0; y < h; b++, y += BAND) {
    const e = Math.round(edgeX + wipe.edge[b % wipe.edge.length]);
    if (covering) {
      if (e > 0) ctx.fillRect(0, y, Math.min(w, e), BAND);
    } else if (e < w) {
      ctx.fillRect(Math.max(0, e), y, w - Math.max(0, e), BAND);
    }
  }
  // big petals riding the edge: leading on the way in, blown off up-right on the way out
  for (let i = 0; i < WIPE_PETALS; i++) {
    const o = i * 5;
    const py = wipe.petals[o];
    const band = Math.floor(py / BAND) % wipe.edge.length;
    let x = edgeX + wipe.edge[band] + wipe.petals[o + 1];
    let y = py;
    if (!covering) {
      x += q * 40 * wipe.petals[o + 4];
      y -= q * 30 * wipe.petals[o + 4];
    }
    const s = wipe.petals[o + 2];
    const rx = Math.round(x), ry = Math.round(y);
    if (rx < -s * 2 || rx > w + s * 2) continue;
    ctx.fillStyle = WIPE_FILL[1 + wipe.petals[o + 3]];
    ctx.fillRect(rx - s, ry - 1, s * 2, 2);
    ctx.fillRect(rx - s + 1, ry - 2, s * 2 - 2, 4);
    ctx.fillStyle = WIPE_FILL[2];
    ctx.fillRect(rx - s + 1, ry - 1, 2, 1);
  }
}
