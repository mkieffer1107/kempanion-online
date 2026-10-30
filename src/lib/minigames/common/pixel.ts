// Pixel canvas helpers: a logical-resolution stage that is integer-upscaled (nearest neighbour) and then
// CSS-fit, a 5×7 bitmap font, speech bubbles and floating score pops.

export interface StageOptions {
  /** Logical height in stage pixels. */
  height: number;
  minW: number;
  maxW: number;
}

export class PixelStage {
  readonly canvas: HTMLCanvasElement;
  readonly buf: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private out: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** CSS pixels per logical pixel. */
  scale = 1;
  cssW = 0;
  cssH = 0;
  private k = 1;
  private opts: StageOptions;

  constructor(canvas: HTMLCanvasElement, opts: StageOptions) {
    this.opts = opts;
    this.canvas = canvas;
    this.buf = document.createElement('canvas');
    this.h = opts.height;
    this.w = opts.maxW;
    this.ctx = this.buf.getContext('2d')!;
    this.out = canvas.getContext('2d')!;
  }

  /** Fit into a CSS box: picks the logical width from the box aspect, then the backing-store scale. */
  resize(boxW: number, boxH: number): void {
    if (boxW < 2 || boxH < 2) return;
    const { minW, maxW, height } = this.opts;
    this.h = height;
    this.w = Math.max(minW, Math.min(maxW, Math.round((height * boxW) / boxH)));
    this.scale = Math.min(boxW / this.w, boxH / this.h);
    this.cssW = Math.floor(this.w * this.scale);
    this.cssH = Math.floor(this.h * this.scale);
    const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    this.k = Math.max(1, Math.min(8, Math.ceil(this.scale * dpr)));
    this.buf.width = this.w;
    this.buf.height = this.h;
    this.canvas.width = this.w * this.k;
    this.canvas.height = this.h * this.k;
    this.canvas.style.width = `${this.cssW}px`;
    this.canvas.style.height = `${this.cssH}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  present(): void {
    this.out.imageSmoothingEnabled = false;
    this.out.drawImage(this.buf, 0, 0, this.w * this.k, this.h * this.k);
  }

  /** Client (CSS) coordinates → logical stage coordinates. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * this.w, y: ((clientY - r.top) / r.height) * this.h };
  }
}

/** Anything drawImage accepts that knows its size (an HTMLImageElement in the browser). */
export type BgImage = CanvasImageSource & { width: number; height: number };

/** Draw a 480×270 background 1:1, cropped horizontally around focusX; darkened by `dim` (0..1). */
export function drawBackground(ctx: CanvasRenderingContext2D, img: BgImage | null, w: number, h: number, focusX = 240, dim = 0, fallback = '#3b2a5a'): void {
  if (img) {
    const sx = Math.max(0, Math.min(img.width - w, Math.round(focusX - w / 2)));
    const sy = Math.max(0, img.height - h);
    ctx.drawImage(img, sx, sy, Math.min(w, img.width), Math.min(h, img.height), Math.max(0, Math.round((w - img.width) / 2)), 0, Math.min(w, img.width), Math.min(h, img.height));
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffb7c5');
    g.addColorStop(1, fallback);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (dim > 0) {
    ctx.fillStyle = `rgba(16, 10, 36, ${dim})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// ── 5×7 bitmap font ──

const GLYPHS: Record<string, string> = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100',
  '!': '00100001000010000100001000000000100', '?': '01110100010000100010001000000000100', '.': '00000000000000000000000000110001100',
  ',': '00000000000000000000011000010001000', ':': '00000011000110000000011000110000000', '-': '00000000000000011111000000000000000',
  '+': '00000001000010011111001000010000000', '×': '00000100010101000100010101000100000', '%': '11000110010001000100010001001100011',
  "'": '00100001000100000000000000000000000', '/': '00001000100001000100010000100010000', '=': '00000000001111100000111110000000000',
  '♥': '00000010101111111111011100010000000', '"': '01010010100000000000000000000000000', '(': '00010001000100001000010000010000010',
  ')': '01000001000001000010000100010001000', '>': '01000001000001000001000100010001000', '<': '00010001000100010000010000010000010',
  '#': '01010010101111101010111110101001010', '*': '00000101010111011111011101010100000',
};

export const FONT_W = 5;
export const FONT_H = 7;

export function textWidth(text: string, scale = 1): number {
  let w = 0;
  for (const ch of text) w += (ch === ' ' ? 3 : FONT_W) + 1;
  return Math.max(0, w - 1) * scale;
}

function drawGlyphs(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number): void {
  let cx = x;
  for (const raw of text) {
    const ch = raw.toUpperCase();
    if (ch === ' ') {
      cx += 4 * scale;
      continue;
    }
    const g = GLYPHS[ch];
    if (g) {
      for (let i = 0; i < 35; i++) if (g.charCodeAt(i) === 49) ctx.fillRect(cx + (i % 5) * scale, y + Math.floor(i / 5) * scale, scale, scale);
    }
    cx += (FONT_W + 1) * scale;
  }
}

export interface TextOpts {
  color?: string;
  outline?: string | null;
  align?: 'left' | 'center' | 'right';
  scale?: number;
}

/** Crisp pixel text (uppercase 5×7). (x, y) is the top-left/center/right of the line per `align`. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: TextOpts = {}): void {
  const scale = opts.scale ?? 1;
  const w = textWidth(text, scale);
  const left = Math.round(opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x);
  const top = Math.round(y);
  if (opts.outline !== null) {
    ctx.fillStyle = opts.outline ?? '#1b1229';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) drawGlyphs(ctx, text, left + dx * scale, top + dy * scale, scale);
  }
  ctx.fillStyle = opts.color ?? '#fff6ea';
  drawGlyphs(ctx, text, left, top, scale);
}

/** Pixel speech bubble whose tail points at (x, y); stays inside [0, w]. */
/** Greedy word-wrap for the 5×7 font. */
export function wrapText(text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(next) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export function drawBubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, opts: { ink?: string; fill?: string; edge?: string } = {}): void {
  const lines = wrapText(text, Math.max(40, Math.min(w - 14, 200)));
  const tw = Math.max(...lines.map((l) => textWidth(l)));
  const bw = tw + 8;
  const bh = lines.length * (FONT_H + 2) + 5;
  const bx = Math.round(Math.max(2, Math.min(w - bw - 2, x - bw / 2)));
  const by = Math.max(2, Math.round(y - bh - 5));
  const edge = opts.edge ?? '#1b1229';
  ctx.fillStyle = edge;
  ctx.fillRect(bx + 1, by, bw - 2, bh);
  ctx.fillRect(bx, by + 1, bw, bh - 2);
  ctx.fillStyle = opts.fill ?? '#fff6ea';
  ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
  // tail
  const tx = Math.round(Math.max(bx + 3, Math.min(bx + bw - 6, x - 2)));
  ctx.fillStyle = edge;
  ctx.fillRect(tx, by + bh - 1, 5, 1);
  ctx.fillRect(tx + 1, by + bh, 3, 2);
  ctx.fillRect(tx + 2, by + bh + 2, 1, 2);
  ctx.fillStyle = opts.fill ?? '#fff6ea';
  ctx.fillRect(tx + 1, by + bh - 1, 3, 1);
  ctx.fillRect(tx + 2, by + bh, 1, 2);
  lines.forEach((l, i) => drawText(ctx, l, bx + 4, by + 3 + i * (FONT_H + 2), { color: opts.ink ?? '#1b1229', outline: null }));
}

interface Pop { text: string; x: number; y: number; color: string; t: number; life: number; scale: number }

/** Floating score text that rises in 1-px steps and blinks out. */
export class Pops {
  private items: Pop[] = [];

  add(text: string, x: number, y: number, color = '#ffd25a', life = 700, scale = 1): void {
    this.items.push({ text, x, y, color, t: 0, life, scale });
    if (this.items.length > 24) this.items.shift();
  }

  update(dtMs: number): void {
    for (const p of this.items) p.t += dtMs;
    this.items = this.items.filter((p) => p.t < p.life);
  }

  draw(ctx: CanvasRenderingContext2D, reduceMotion = false): void {
    for (const p of this.items) {
      const k = p.t / p.life;
      if (k > 0.75 && Math.floor(p.t / 60) % 2 === 1) continue;
      const rise = reduceMotion ? 0 : Math.floor(k * 14);
      drawText(ctx, p.text, p.x, p.y - rise, { color: p.color, align: 'center', scale: p.scale });
    }
  }

  clear(): void {
    this.items = [];
  }
}

/** Seeded PRNG for game runs (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Pixel circle (filled) — crisp at small radii. */
export function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const rr = r * r;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, rr - dy * dy)));
    if (half <= 0 && Math.abs(dy) >= r) continue;
    ctx.fillRect(x0 - half, y0 + dy, half * 2 + 1, 1);
  }
}

/** Pixel ellipse outline (for rings on the ground). */
export function strokeEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, thickness = 1): void {
  const steps = Math.max(24, Math.round((rx + ry) * 2.2));
  let px = NaN;
  let py = NaN;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    if (x === px && y === py) continue;
    ctx.fillRect(x, y, thickness, thickness);
    px = x;
    py = y;
  }
}

export function fillEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const y0 = Math.round(cy);
  const ryc = Math.max(1, Math.round(ry));
  for (let dy = -ryc; dy <= ryc; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (half <= 0) continue;
    ctx.fillRect(Math.round(cx) - half, y0 + dy, half * 2, 1);
  }
}

/** True when the player or the OS asked for reduced motion. */
export function prefersReducedMotion(setting: boolean): boolean {
  if (setting) return true;
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
