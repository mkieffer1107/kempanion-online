// Steady Hoof drawing (pure canvas calls): the sim-suite tray, the three training models (silicone pad, silicone vessel,
// gel brain phantom), the instrument tip with its sway halo, Piggy 2 and the station title cards. Cute, never graphic:
// the open seam is a lavender slit on a peach practice pad, the vessel a lavender tube, the brain a pastel jelly mold.
import { clamp, drawBackground, drawText, fillCircle, fillEllipse, textWidth, type BgImage } from '../common/pixel';
import type { Sprite } from '../common/sprites';
import {
  CARD_SECONDS, OFF_HINT_SECONDS, STATION_INFO, pointAt, vesselY, workStart,
  type DoneSeam, type Grade, type PlaceMark, type SeamMark, type SteadyEngine, type Vec,
} from './engine';

export interface Layout {
  portrait: boolean;
  /** The square play area: tray units 0..100 map onto [x, x + s] × [y, y + s]. */
  tray: { x: number; y: number; s: number };
  /** Piggy 2's feet. */
  doc: { x: number; y: number };
  /** Where the DOM speech bubble goes (logical px; the component scales it). */
  say: { x: number; y: number; w: number };
}

export function layout(w: number, h: number): Layout {
  if (w < 360) {
    // portrait: tray on top; Piggy 2 bottom-right with his head just under the tray (his feet may crop), bubble bottom-left
    const s = Math.min(w - 10, h - 100);
    const tray = { x: Math.round((w - s) / 2), y: 6, s };
    return {
      portrait: true,
      tray,
      doc: { x: w - 38, y: Math.max(h - 2, tray.y + s + 104) },
      say: { x: 4, y: tray.y + s + 6, w: Math.min(Math.round(w * 0.56), w - 80) },
    };
  }
  // landscape / desktop: tray on the right, Piggy 2 in the middle of the left zone, bubble at its top
  const s = Math.min(h - 24, 228);
  const tray = { x: w - s - 12, y: Math.round((h - s) / 2), s };
  const zone = tray.x - 8;
  return { portrait: false, tray, doc: { x: Math.round(zone / 2) + 4, y: h - 2 }, say: { x: 6, y: 8, w: zone - 12 } };
}

/** Canvas text scale: the 5×7 font is 7 logical px tall, so double it when that would be under 11 CSS px. */
export function textScale(cssPerLogical: number): 1 | 2 {
  return 7 * cssPerLogical >= 11 ? 1 : 2;
}

/** Tray units → logical px. */
export function toPx(L: Layout, u: Vec): Vec {
  return { x: L.tray.x + (u.x / 100) * L.tray.s, y: L.tray.y + (u.y / 100) * L.tray.s };
}

/** Logical px → tray units. */
export function toTray(L: Layout, x: number, y: number): Vec {
  return { x: ((x - L.tray.x) / L.tray.s) * 100, y: ((y - L.tray.y) / L.tray.s) * 100 };
}

// ── palette ──
const INK = '#1b1229';
const CREAM = '#fff6ea';
const GOLD = '#ffd25a';
const PINK = '#ffb7c5';
const MINT = '#5bd16b';
const C = {
  steel: '#c9d3e0', steelHi: '#eef3f8', steelLo: '#8d99ab',
  drape: '#6fa8dc', fold: '#5b8fc4',
  pad: '#ffd9c7', padEdge: '#e9a99a',
  slit: '#b9a7e0', slitRim: '#8f7fd6', guide: CREAM,
  blossom: '#ff8fb1', blossomMid: GOLD,
  stitch: '#2b3a67', stitchHi: '#8fa8ff', loose: '#9aa3b8',
  thread: '#2b3a67', rush: '#ff9f43',
  vignette: '#0b0718', field: '#f3e3ff',
  tube: '#c9a7ff', tubeHi: '#e8d8ff', tubeEdge: '#9a78d6', band: '#ffb7c5',
  target: '#ff5a8a',
  phantom: '#ffd6e7', phantomFold: '#f2a7c3', midline: '#e48aab', sheen: '#fff0f6',
  mark: '#6a4c93',
  monitor: '#071510', trace: '#59f58d', traceDim: '#1e6b3e',
  note: GOLD, noteEdge: '#c9962a',
};
export const GRADE_COLOR: Record<Grade, string> = { top: GOLD, good: CREAM, ok: PINK };

// ── pixel helpers ──
type Clip = { x0: number; y0: number; x1: number; y1: number } | null;

function plot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, clip: Clip): void {
  const px = Math.round(x) - (size >> 1);
  const py = Math.round(y) - (size >> 1);
  if (clip && (px < clip.x0 || py < clip.y0 || px + size > clip.x1 || py + size > clip.y1)) return;
  ctx.fillRect(px, py, size, size);
}

/** A pixel line of `size`×`size` dots (every `every`-th dot when dotted). */
function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, size = 1, clip: Clip = null, every = 1): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    if (every > 1 && i % every !== 0) continue;
    plot(ctx, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, size, clip);
  }
}

/** Pixel ring (optionally dashed) of radius r around (cx, cy). */
function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, size = 1, dashed = false, from = 0, to = 1): void {
  const steps = Math.max(16, Math.round(r * 7));
  let lx = NaN;
  let ly = NaN;
  for (let i = Math.floor(from * steps); i <= Math.ceil(to * steps); i++) {
    if (i / steps > to + 1e-9) break;
    if (dashed && Math.floor(i / Math.max(2, Math.round(steps / 16))) % 2 === 1) continue;
    const a = -Math.PI / 2 + (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    if (x === lx && y === ly) continue;
    lx = x;
    ly = y;
    ctx.fillRect(x - (size >> 1), y - (size >> 1), size, size);
  }
}

type Pattern = { rows: string[]; pal: Record<string, string> };

function drawPattern(ctx: CanvasRenderingContext2D, p: Pattern, x: number, y: number): void {
  const h = p.rows.length;
  const w = p.rows[0].length;
  const ox = Math.round(x) - (w >> 1);
  const oy = Math.round(y) - (h >> 1);
  for (let ry = 0; ry < h; ry++) {
    const row = p.rows[ry];
    for (let rx = 0; rx < w; rx++) {
      const ch = row[rx];
      if (ch === '.') continue;
      ctx.fillStyle = p.pal[ch];
      ctx.fillRect(ox + rx, oy + ry, 1, 1);
    }
  }
}

const BLOSSOM: Pattern = {
  rows: ['...k...', '.kkpkk.', 'kpppppk', '.kpypk.', '.kpppk.', 'kpk.kpk', '.k...k.'],
  pal: { k: '#a8385a', p: C.blossom, y: C.blossomMid },
};
const STITCH: Pattern = { rows: ['h...s', '.h.s.', '..s..', '.s.s.', 's...s'], pal: { s: C.stitch, h: C.stitchHi } };
const LOOSE: Pattern = { rows: ['l.....l', '.ll.ll.', '...l...', '.ll.ll.', 'l.....l'], pal: { l: C.loose } };
const STICKER: Pattern = {
  rows: ['.wwwww.', 'wwpwpww', 'wpppppw', 'wwpypww', 'wpppppw', 'wwpwpww', '.wwwww.'],
  pal: { w: '#ffffff', p: C.blossom, y: GOLD },
};
const KNOT_CENTER: Record<Grade, string> = { top: GOLD, good: C.target, ok: CREAM };
function knot(grade: Grade): Pattern {
  return { rows: ['..k..', '.kpk.', 'kpcpk', '.kpk.', '..k..'], pal: { k: '#7a4fa8', p: PINK, c: KNOT_CENTER[grade] } };
}

// ── pops (a few at a time; the oldest drops) ──
interface Pop { text: string; x: number; y: number; color: string; t: number; life: number; scale: number }

export class SurgeryPops {
  items: Pop[] = [];

  add(text: string, x: number, y: number, color: string, life = 650, scale = 1): void {
    this.items.push({ text, x, y, color, t: 0, life, scale });
    while (this.items.length > 3) this.items.shift();
  }

  update(dtMs: number): void {
    for (const p of this.items) p.t += dtMs;
    this.items = this.items.filter((p) => p.t < p.life);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, reduceMotion: boolean): void {
    for (const p of this.items) {
      const k = p.t / p.life;
      if (k > 0.75 && Math.floor(p.t / 60) % 2 === 1) continue;
      const rise = reduceMotion ? 0 : Math.floor(k * 10) * p.scale;
      const half = textWidth(p.text, p.scale) / 2;
      const x = clamp(p.x, half + 2, w - half - 2);
      drawText(ctx, p.text, x, p.y - rise, { color: p.color, align: 'center', scale: p.scale });
    }
  }

  clear(): void {
    this.items = [];
  }
}

// ── scene ──
export interface SurgeryScene {
  engine: SteadyEngine | null;
  /** Game seconds (engine clock). */
  t: number;
  /** performance.now() in ms (idle animation, monitor traces). */
  wall: number;
  bg: BgImage | null;
  focusX: number;
  sprite: Sprite;
  anim: { name: string; start: number };
  pops: SurgeryPops;
  reduceMotion: boolean;
  ts: 1 | 2;
  /** Gerald's note grins until this game time. */
  grinUntil: number;
  /** First run ever: S1's caption teaches the controls. */
  firstRun: boolean;
  coarse: boolean;
  icon: (id: string) => CanvasImageSource | null;
}

export function renderSurgery(ctx: CanvasRenderingContext2D, w: number, h: number, s: SurgeryScene): void {
  const L = layout(w, h);
  const e = s.engine;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, s.bg, w, h, s.focusX, 0.35);
  if (!L.portrait && L.tray.x - 8 >= 150) drawGerald(ctx, L.tray.x - 32, h - 6);
  s.sprite.draw(ctx, s.anim.name, s.wall - s.anim.start, L.doc.x, L.doc.y);
  drawTray(ctx, L);
  const station = e ? e.id : 'close';
  if (station === 'close') drawClose(ctx, L, s);
  else if (station === 'scope') drawScope(ctx, L, s);
  else drawPlace(ctx, L, s);
  if (e && e.step !== 'done') {
    drawInstrument(ctx, L, s);
    drawTargets(ctx, L, s);
    drawTip(ctx, L, s);
  }
  drawGauge(ctx, L, s);
  drawNote(ctx, L, s);
  if (station === 'scope') drawText(ctx, '×4', L.tray.x + 5, L.tray.y + L.tray.s - 5 - 7 * s.ts, { color: C.field, scale: s.ts });
  s.pops.draw(ctx, w, s.reduceMotion);
  // first run: the card's control hint sits under the shell's "GO!" for part of the card, so it stays a little longer
  // along the bottom of the pad (seams keep above y 84) for the first seconds of the seam
  if (e && s.firstRun && e.station === 0 && e.step === 'work' && e.t - workStart(0) < FIRST_HINT_SECONDS) {
    drawControlsHint(ctx, L, s, e.t - workStart(0));
  }
  if (e && e.step === 'card') drawCard(ctx, w, L, s, e);
}

/** How long the first-run control hint stays on the pad once Station 1's work starts (s). */
export const FIRST_HINT_SECONDS = 3;

/** Gerald, the sim suite's training mannequin (a torso: just his head shows), resting on a pillow. Very compliant. */
function drawGerald(ctx: CanvasRenderingContext2D, x: number, ground: number): void {
  // pillow
  ctx.fillStyle = INK;
  ctx.fillRect(x - 5, ground - 7, 30, 7);
  ctx.fillRect(x - 4, ground - 8, 28, 9);
  ctx.fillStyle = '#e4e7f5';
  ctx.fillRect(x - 4, ground - 7, 28, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 3, ground - 7, 26, 1);
  ctx.fillStyle = '#c3c8de';
  ctx.fillRect(x - 3, ground - 2, 26, 1);
  // head: a smooth beige mannequin head
  const cx = x + 10;
  const cy = ground - 15;
  ctx.fillStyle = INK;
  fillEllipse(ctx, cx, cy, 9, 10);
  ctx.fillStyle = '#d8c6b0';
  fillEllipse(ctx, cx, cy, 8, 9);
  ctx.fillStyle = '#efe2d2';
  fillEllipse(ctx, cx - 1, cy - 1, 7, 8);
  // closed eyes (‿ ‿) and a small content smile
  ctx.fillStyle = INK;
  for (const ex of [cx - 5, cx + 2]) {
    ctx.fillRect(ex, cy, 1, 1);
    ctx.fillRect(ex + 1, cy + 1, 1, 1);
    ctx.fillRect(ex + 2, cy, 1, 1);
  }
  ctx.fillRect(cx - 2, cy + 4, 3, 1);
  ctx.fillStyle = '#f2b8a8';
  ctx.fillRect(cx - 6, cy + 2, 2, 1);
  ctx.fillRect(cx + 4, cy + 2, 2, 1);
  // the sticky note on his forehead
  ctx.fillStyle = C.noteEdge;
  ctx.fillRect(cx - 3, cy - 7, 7, 4);
  ctx.fillStyle = C.note;
  ctx.fillRect(cx - 4, cy - 8, 7, 4);
  ctx.fillStyle = C.noteEdge;
  ctx.fillRect(cx - 3, cy - 6, 5, 1);
}

function drawTray(ctx: CanvasRenderingContext2D, L: Layout): void {
  const { x, y, s } = L.tray;
  ctx.fillStyle = INK;
  ctx.fillRect(x - 1, y, s + 2, s);
  ctx.fillRect(x, y - 1, s, s + 2);
  ctx.fillStyle = C.steel;
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = C.steelHi;
  ctx.fillRect(x + 1, y, s - 2, 1);
  ctx.fillRect(x, y + 1, 1, s - 2);
  ctx.fillStyle = C.steelLo;
  ctx.fillRect(x + 1, y + s - 1, s - 2, 1);
  ctx.fillRect(x + s - 1, y + 1, 1, s - 2);
}

/** The blue drape inside the tray rim; returns the pad rectangle inside its 6 px border. */
function drawDrape(ctx: CanvasRenderingContext2D, L: Layout): { x: number; y: number; w: number; h: number } {
  const { x, y, s } = L.tray;
  const ix = x + 3;
  const iy = y + 3;
  const is = s - 6;
  ctx.fillStyle = C.drape;
  ctx.fillRect(ix, iy, is, is);
  ctx.fillStyle = C.fold;
  for (let fx = ix + 5; fx < ix + is - 2; fx += 13) {
    ctx.fillRect(fx, iy + 1, 1, 4);
    ctx.fillRect(fx + 2, iy + is - 5, 1, 4);
  }
  for (let fy = iy + 9; fy < iy + is - 2; fy += 15) {
    ctx.fillRect(ix + 1, fy, 4, 1);
    ctx.fillRect(ix + is - 5, fy + 3, 4, 1);
  }
  return { x: ix + 6, y: iy + 6, w: is - 12, h: is - 12 };
}

// ── station 1: close the seam ──

function seamPx(L: Layout, pts: Vec[]): Vec[] {
  return pts.map((p) => toPx(L, p));
}

function drawStitch(ctx: CanvasRenderingContext2D, x: number, y: number, grade: Grade | undefined): void {
  if (grade === 'ok') drawPattern(ctx, LOOSE, x, y);
  else drawPattern(ctx, STITCH, x, y);
}

function drawClosedLine(ctx: CanvasRenderingContext2D, pts: Vec[], upTo: number, cum: number[] | null): void {
  ctx.fillStyle = C.padEdge;
  for (let i = 1; i < pts.length; i++) {
    if (cum && cum[i - 1] >= upTo) break;
    line(ctx, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, 1);
  }
}

function drawDoneSeam(ctx: CanvasRenderingContext2D, L: Layout, d: DoneSeam): void {
  ctx.globalAlpha = 0.45;
  drawClosedLine(ctx, seamPx(L, d.pts), Infinity, null);
  for (const m of d.marks) {
    const p = toPx(L, m);
    drawStitch(ctx, p.x, p.y, m.grade);
  }
  ctx.globalAlpha = 1;
}

function drawClose(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const pad = drawDrape(ctx, L);
  ctx.fillStyle = C.padEdge;
  ctx.fillRect(pad.x - 1, pad.y - 1, pad.w + 2, pad.h + 2);
  ctx.fillStyle = C.pad;
  ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
  ctx.fillStyle = '#ffe9de';
  ctx.fillRect(pad.x + 1, pad.y + 1, pad.w - 2, 1);
  const e = s.engine;
  if (!e) return;
  for (const d of e.doneSeams) drawDoneSeam(ctx, L, d);
  for (const st of e.stickers) {
    const p = toPx(L, st);
    drawPattern(ctx, STICKER, p.x, p.y);
  }
  const seam = e.seam;
  if (!seam || e.id !== 'close') return;
  const waiting = e.seamWait > 0;
  const pts = seamPx(L, seam.pts);
  const k = L.tray.s / 100;
  const progress = waiting ? seam.len : e.progress;
  // the closed part: a faint line where the slit was
  drawClosedLine(ctx, pts, progress, seam.cum);
  // the open part: a lavender slit (never rose: it is a practice seam, not a cut) that zips shut behind the needle
  const core = k > 2 ? 3 : 2;
  for (const [size, color] of [[core + 2, C.slitRim], [core, C.slit]] as const) {
    ctx.fillStyle = color;
    for (let i = 1; i < pts.length; i++) {
      if (seam.cum[i] <= progress) continue;
      const a = seam.cum[i - 1];
      // zip easing: the first few units after the needle are half open (none with Reduce Motion)
      const sz = !s.reduceMotion && a - progress < 4 ? Math.max(1, size - 2) : size;
      const p0 = a < progress ? toPx(L, pointAt(seam, progress)) : pts[i - 1];
      line(ctx, p0.x, p0.y, pts[i].x, pts[i].y, sz);
    }
  }
  // the dotted guide down the middle of the slit
  ctx.fillStyle = C.guide;
  const step = 4 / k;
  for (let a = progress + 2; a < seam.len - 0.5; a += step) {
    const p = toPx(L, pointAt(seam, a));
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  // blossoms waiting to become stitches, stitches behind
  for (const m of seam.marks) {
    const p = toPx(L, m);
    if (m.grade) drawStitch(ctx, p.x, p.y, m.grade);
    else drawPattern(ctx, BLOSSOM, p.x, p.y);
  }
}

function lastStitchPoint(marks: SeamMark[], fallback: Vec): Vec {
  let last: Vec = fallback;
  for (const m of marks) if (m.grade) last = m;
  return last;
}

// ── station 2: under the scope ──

function drawScope(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const { x, y, s: size } = L.tray;
  const e = s.engine;
  ctx.fillStyle = C.vignette;
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const R = Math.floor(size * 0.46);
  const span = (col: number): [number, number] | null => {
    const dx = col + 0.5 - cx;
    if (Math.abs(dx) > R) return null;
    const half = Math.sqrt(R * R - dx * dx);
    return [Math.round(cy - half), Math.round(cy + half)];
  };
  ctx.fillStyle = '#2a1d4a';
  fillCircle(ctx, cx, cy, R + 2);
  ctx.fillStyle = C.field;
  fillCircle(ctx, cx, cy, R);
  const phase = e ? e.phases[0] : 1.3;
  const k = size / 100;
  const hw = 5.2 * k;
  const beat = e ? e.beat : (s.wall / 1000) * 1.2;
  const bandX = -12 + 124 * (((beat % 1) + 1) % 1);
  const pulsing = !s.reduceMotion && !!e;
  // the vessel: a translucent lavender silicone tube, drawn column by column inside the field
  for (let col = Math.round(cx - R); col <= Math.round(cx + R); col++) {
    const sp = span(col);
    if (!sp) continue;
    const ux = ((col + 0.5 - x) / size) * 100;
    const yc = y + (vesselY(ux, phase) / 100) * size;
    const top = Math.max(sp[0], Math.round(yc - hw));
    const bot = Math.min(sp[1], Math.round(yc + hw));
    if (bot < top) continue;
    ctx.fillStyle = C.tubeEdge;
    ctx.fillRect(col, top, 1, bot - top + 1);
    if (bot - top > 2) {
      const off = Math.abs(ux - bandX);
      const glow = pulsing && off < 5;
      ctx.fillStyle = !glow ? C.tube : off < 2.6 ? C.band : '#e2b4f0';
      ctx.fillRect(col, top + 1, 1, bot - top - 1);
      const hi = Math.round(yc - hw * 0.45);
      if (hi > top && hi < bot) {
        ctx.fillStyle = glow ? '#ffe3ea' : C.tubeHi;
        ctx.fillRect(col, hi, 1, 1);
      }
    }
  }
  if (!e) return;
  for (const kn of e.knots) {
    const p = toPx(L, kn);
    drawPattern(ctx, knot(kn.grade), p.x, p.y);
  }
}

// ── station 3: electrodes ──

function drawPlace(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  drawDrape(ctx, L);
  const { s: size } = L.tray;
  const k = size / 100;
  const c = toPx(L, { x: 50, y: 46 });
  const rx = 39 * k;
  const ry = 32 * k;
  // the gel phantom: a pastel jelly mold of a brain on a little stand
  ctx.fillStyle = '#c47a9a';
  fillEllipse(ctx, c.x, c.y + ry * 0.92, rx * 0.7, 3 * k);
  ctx.fillStyle = C.midline;
  fillEllipse(ctx, c.x, c.y, rx + 1, ry + 1);
  ctx.fillStyle = C.phantomFold;
  fillEllipse(ctx, c.x, c.y + 1.5 * k, rx, ry);
  ctx.fillStyle = C.phantom;
  fillEllipse(ctx, c.x, c.y, rx - 1, ry - 1.5 * k);
  ctx.fillStyle = C.sheen;
  fillEllipse(ctx, c.x - rx * 0.45, c.y - ry * 0.55, rx * 0.22, ry * 0.12);
  // folds: soft arcs on each half
  ctx.fillStyle = C.phantomFold;
  for (const side of [-1, 1]) {
    for (const [ox, oy, r0, a0, a1] of [[0.45, -0.35, 0.3, 0.6, 2.4], [0.55, 0.15, 0.28, -0.9, 1.1], [0.3, 0.45, 0.25, 3.6, 5.6], [0.7, -0.05, 0.18, 1.8, 4.2]] as const) {
      const fx = c.x + side * rx * ox;
      const fy = c.y + ry * oy;
      const rr = rx * r0;
      for (let a = a0; a <= a1; a += 0.12) {
        const px = Math.round(fx + side * Math.cos(a) * rr);
        const py = Math.round(fy + Math.sin(a) * rr * 0.6);
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  ctx.fillStyle = C.midline;
  for (let yy = Math.round(c.y - ry + 3); yy < c.y + ry - 2; yy++) ctx.fillRect(Math.round(c.x + Math.sin(yy * 0.35) * 0.6), yy, 1, 1);
  const e = s.engine;
  if (e) drawMarks(ctx, L, s, e);
  drawMonitor(ctx, L, s);
}

function drawMarks(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene, e: SteadyEngine): void {
  const k = L.tray.s / 100;
  const next = e.nextMark();
  for (const m of e.marks) {
    if (m.grade && m.at) {
      const a = toPx(L, m.at);
      drawContact(ctx, a.x, a.y, k);
    } else drawMark(ctx, L, s, m, m === next);
  }
}

/** A dotted mark still to set, with its number (the next one gold). */
function drawMark(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene, m: PlaceMark, isNext: boolean): void {
  const r = Math.max(4, 3.3 * (L.tray.s / 100));
  const p = toPx(L, m);
  ctx.fillStyle = isNext ? INK : CREAM;
  ring(ctx, p.x, p.y, r + 1, 1, false);
  ctx.fillStyle = isNext ? GOLD : C.mark;
  ring(ctx, p.x, p.y, r, isNext ? 2 : 1, !isNext);
  ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  drawMarkNumber(ctx, L, s, m, isNext);
}

/** A mark's number, outside the 2×2 set at its own corner (1 top-left … 4 bottom-right). */
function drawMarkNumber(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene, m: PlaceMark, isNext: boolean): void {
  const r = Math.max(4, 3.3 * (L.tray.s / 100));
  const p = toPx(L, m);
  const sx = m.n % 2 === 1 ? -1 : 1;
  const sy = m.n <= 2 ? -1 : 1;
  const gx = p.x + sx * (r + 2 + 3 * s.ts);
  const gy = p.y + sy * (r + 1 + 4 * s.ts) - 3.5 * s.ts;
  drawText(ctx, String(m.n), gx, gy, { color: isNext ? GOLD : '#4a2f70', align: 'center', scale: s.ts, outline: isNext ? INK : CREAM });
}

function drawContact(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  const r = Math.max(2, Math.round(2.1 * k));
  ctx.fillStyle = INK;
  fillCircle(ctx, x, y, r + 1);
  ctx.fillStyle = C.steel;
  fillCircle(ctx, x, y, r);
  ctx.fillStyle = C.steelHi;
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - r + 1, 2, 1);
  ctx.fillStyle = C.blossom;
  fillCircle(ctx, x, y, Math.max(1, Math.round(r * 0.4)));
}

/** The 4-channel monitor along the tray's bottom edge: each set contact wakes its channel. */
function drawMonitor(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const { x, y, s: size } = L.tray;
  const e = s.engine;
  const mh = 8 + 4 * s.ts;
  const my = y + size - 4 - mh;
  const mx = x + 4;
  const mw = size - 8;
  ctx.fillStyle = INK;
  ctx.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
  const cw = Math.floor((mw - 3) / 4);
  const tt = s.reduceMotion ? 0 : s.wall / 1000;
  for (let i = 0; i < 4; i++) {
    const cx0 = mx + i * (cw + 1);
    ctx.fillStyle = C.monitor;
    ctx.fillRect(cx0, my, cw, mh);
    const g = e && e.id === 'place' ? e.channels[i] : null;
    const mid = my + Math.floor(mh / 2);
    if (!g) {
      ctx.fillStyle = C.traceDim;
      ctx.fillRect(cx0 + 1, mid, cw - 2, 1);
      continue;
    }
    ctx.fillStyle = C.trace;
    const amp = (mh / 2 - 2) * (g === 'ok' ? 0.8 : 1);
    let prev = mid;
    for (let col = 1; col < cw - 1; col++) {
      const u = col / 6 + tt * 3;
      let v = Math.sin(u * 2.1);
      if (g === 'good') v = v * 0.85 + Math.sin(u * 7.3 + 1) * 0.25;
      if (g === 'ok') v = Math.sin(u * 2.1) * 0.4 + Math.sin(Math.floor(u * 9.7) * 12.9898) * 0.7;
      const yy = Math.round(mid - v * amp);
      ctx.fillRect(cx0 + col, Math.min(prev, yy), 1, Math.abs(prev - yy) + 1);
      prev = yy;
    }
  }
}

// ── instrument, targets, tip ──

function drawInstrument(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const e = s.engine!;
  const { x, y, s: size } = L.tray;
  const tip = toPx(L, e.tip);
  const clip = { x0: x + 1, y0: y + 1, x1: x + size - 1, y1: y + size - 1 };
  // the shaft comes in from the bottom-right, as if held from just off the tray
  const ax = x + size * 1.08;
  const ay = y + size * 1.22;
  const len = Math.hypot(ax - tip.x, ay - tip.y) || 1;
  const ux = (ax - tip.x) / len;
  const uy = (ay - tip.y) / len;
  const k = size / 100;
  const head = (e.id === 'scope' ? 7 : 5) * k;
  const hx = tip.x + ux * head;
  const hy = tip.y + uy * head;
  ctx.fillStyle = INK;
  line(ctx, hx, hy, ax, ay, 4, clip);
  ctx.fillStyle = C.steelLo;
  line(ctx, hx, hy, ax, ay, 2, clip);
  ctx.fillStyle = C.steelHi;
  line(ctx, hx - uy, hy + ux, ax - uy, ay + ux, 1, clip);
  const px = -uy;
  const py = ux;
  if (e.id === 'close') {
    // needle driver jaws holding a small curved needle
    ctx.fillStyle = INK;
    line(ctx, hx, hy, tip.x + ux * 1.5, tip.y + uy * 1.5, 2, clip);
    ctx.fillStyle = C.steelHi;
    for (let a = 0; a <= Math.PI; a += 0.25) {
      const r = 2.2 * k;
      plot(ctx, tip.x + ux * r * (1 - Math.cos(a)) * 0.5 + px * r * Math.sin(a) * 0.7, tip.y + uy * r * (1 - Math.cos(a)) * 0.5 + py * r * Math.sin(a) * 0.7, 1, clip);
    }
  } else if (e.id === 'scope') {
    // micro-forceps: two fine prongs meeting at the tip
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = INK;
      line(ctx, hx + px * sgn * 1.5, hy + py * sgn * 1.5, tip.x + px * sgn * 0.5, tip.y + py * sgn * 0.5, 2, clip);
      ctx.fillStyle = C.steelHi;
      line(ctx, hx + px * sgn * 1.5, hy + py * sgn * 1.5, tip.x + px * sgn * 0.5, tip.y + py * sgn * 0.5, 1, clip);
    }
  } else {
    // contact holder
    ctx.fillStyle = INK;
    line(ctx, hx, hy, tip.x, tip.y, 3, clip);
    ctx.fillStyle = C.steel;
    line(ctx, hx, hy, tip.x, tip.y, 1, clip);
  }
}

function drawTargets(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const e = s.engine!;
  const k = L.tray.s / 100;
  // the blossoms still to stitch go over the shaft (it comes in from the bottom-right and can cross the next one)
  if (e.id === 'close' && e.seam) {
    for (const m of e.seam.marks) {
      if (m.grade) continue;
      const p = toPx(L, m);
      drawPattern(ctx, BLOSSOM, p.x, p.y);
    }
  }
  if (e.id === 'close' && e.seam && e.step === 'work' && e.seamWait <= 0) {
    // the thread from the last stitch to the needle; orange while rushing
    const from = toPx(L, lastStitchPoint(e.seam.marks, e.seam.pts[0]));
    const tip = toPx(L, e.tip);
    ctx.fillStyle = e.rushing ? C.rush : C.thread;
    line(ctx, from.x, from.y, tip.x, tip.y, 1);
    if (e.offFor >= OFF_HINT_SECONDS) {
      const back = toPx(L, pointAt(e.seam, e.progress));
      ctx.fillStyle = 'rgba(255, 246, 234, 0.75)';
      line(ctx, tip.x, tip.y, back.x, back.y, 1, null, 3);
      ctx.fillStyle = GOLD;
      ring(ctx, back.x, back.y, 2.5 * k, 1, true);
    }
  } else if (e.id === 'scope' && e.target) {
    const p = e.targetPos()!;
    const c = toPx(L, p);
    const r = e.tune.scope.ring * k;
    drawPattern(ctx, BLOSSOM_TARGET, c.x, c.y);
    ctx.fillStyle = INK;
    ring(ctx, c.x, c.y, r + 1, 1, true);
    ctx.fillStyle = '#ffffff';
    ring(ctx, c.x, c.y, r, 1, true);
    const fill = e.target.wait > 0 ? 1 : e.target.fill;
    if (fill > 0) {
      ctx.fillStyle = GOLD;
      ring(ctx, c.x, c.y, r + 1.5, 2, false, 0, fill);
    }
  } else if (e.id === 'place') {
    const next = e.nextMark();
    // the marks still to set (rings and numbers) again, over the shaft: it comes in from the bottom-right, right
    // across mark 4 and its number
    for (const m of e.marks) if (!m.grade) drawMark(ctx, L, s, m, m === next);
    if (next && e.dwell > 0) {
      const c = toPx(L, next);
      ctx.fillStyle = MINT;
      ring(ctx, c.x, c.y, Math.max(4, 3.3 * k) + 3, 2, false, 0, e.dwell);
    }
    const tip = toPx(L, e.tip);
    const con = toPx(L, e.carry);
    ctx.fillStyle = INK;
    line(ctx, tip.x, tip.y, con.x, con.y, 1);
    drawContact(ctx, con.x, con.y, k);
  }
}

const BLOSSOM_TARGET: Pattern = {
  rows: ['...k...', '.kkpkk.', 'kpppppk', '.kpypk.', '.kpppk.', 'kpk.kpk', '.k...k.'],
  pal: { k: '#7a1f45', p: C.target, y: GOLD },
};

function haloColor(e: SteadyEngine): { color: string; dashed: boolean } {
  if (e.step !== 'work') return { color: CREAM, dashed: false };
  if (e.id === 'close') {
    if (e.seamWait > 0) return { color: GOLD, dashed: false };
    const d = e.seamDist;
    if (d <= e.tune.close.neat) return { color: MINT, dashed: false };
    if (d <= e.tune.close.capture) return { color: GOLD, dashed: false };
    return { color: C.blossom, dashed: true };
  }
  if (e.id === 'scope') {
    const p = e.targetPos();
    const inRing = !!p && Math.hypot(e.tip.x - p.x, e.tip.y - p.y) <= e.tune.scope.ring;
    return { color: inRing ? MINT : GOLD, dashed: false };
  }
  return { color: e.dwell > 0 ? MINT : GOLD, dashed: false };
}

function drawTip(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const e = s.engine!;
  const k = L.tray.s / 100;
  const tip = toPx(L, e.tip);
  const calm = e.calm(e.t);
  const { color, dashed } = haloColor(e);
  // the halo tightens on the exhale (Reduce Motion: fixed size, solid on the exhale, dashed on the inhale)
  const r = s.reduceMotion ? 3.4 * k : (2.2 + 2.6 * (1 - calm)) * k;
  const breathDash = s.reduceMotion && !e.exhaling(e.t);
  ctx.fillStyle = 'rgba(27, 18, 41, 0.55)';
  ring(ctx, tip.x + 1, tip.y + 1, r, 1, dashed || breathDash);
  ctx.fillStyle = color;
  ring(ctx, tip.x, tip.y, r, 1, dashed || breathDash);
  ctx.fillStyle = INK;
  ctx.fillRect(Math.round(tip.x) - 1, Math.round(tip.y) - 1, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(tip.x), Math.round(tip.y), 1, 1);
}

// ── overlays on the tray ──

function drawGauge(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const e = s.engine;
  if (!e || e.step === 'done') return;
  const ts = s.ts;
  const out = e.exhaling(e.t);
  const calm = e.calm(e.t);
  const label = out ? 'OUT' : 'IN';
  const x = L.tray.x + 4;
  const y = L.tray.y + 4;
  const tw = textWidth('OUT', ts);
  const barW = 12 * ts;
  ctx.fillStyle = 'rgba(16, 10, 36, 0.7)';
  ctx.fillRect(x - 2, y - 2, tw + barW + 4 * ts + 4, 7 * ts + 4);
  drawText(ctx, label, x, y, { color: out ? MINT : PINK, scale: ts, outline: null });
  const bx = x + tw + 3 * ts;
  const by = y + 2 * ts;
  const bh = 3 * ts;
  ctx.fillStyle = '#3a2a5a';
  ctx.fillRect(bx, by, barW, bh);
  ctx.fillStyle = out ? MINT : PINK;
  if (s.reduceMotion) {
    // style instead of size: solid while breathing out, dashed while breathing in
    for (let i = 0; i < barW; i += out ? 1 : 2 * ts) ctx.fillRect(bx + i, by, out ? 1 : ts, bh);
  } else ctx.fillRect(bx, by, Math.max(1, Math.round(barW * calm)), bh);
}

/** Gerald the training mannequin "supervises" as a smiley sticky note; he grins for a second after a bonus. */
function drawNote(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene): void {
  const e = s.engine;
  const u = s.ts;
  const n = 13 * u;
  const x = L.tray.x + L.tray.s - n - 5;
  const y = L.tray.y + 4;
  ctx.fillStyle = C.noteEdge;
  ctx.fillRect(x + u, y + u, n, n);
  ctx.fillStyle = C.note;
  ctx.fillRect(x, y, n, n);
  ctx.fillStyle = '#ffe58f';
  ctx.fillRect(x, y, n, 2 * u);
  const grin = !!e && e.t < s.grinUntil;
  ctx.fillStyle = INK;
  const ey = y + 5 * u;
  for (const ex of [x + 3 * u, x + 8 * u]) {
    if (grin) {
      // happy closed eyes: ^ ^
      ctx.fillRect(ex - u, ey, u, u);
      ctx.fillRect(ex, ey - u, u, u);
      ctx.fillRect(ex + u, ey, u, u);
    } else ctx.fillRect(ex, ey - u, u, 2 * u);
  }
  const my = y + 9 * u;
  ctx.fillRect(x + 4 * u, my, 5 * u, u);
  ctx.fillRect(x + 3 * u, my - u, u, u);
  ctx.fillRect(x + 9 * u, my - u, u, u);
  if (grin) {
    ctx.fillRect(x + 4 * u, my + u, 5 * u, u);
    ctx.fillStyle = C.blossom;
    ctx.fillRect(x + 5 * u, my + u, 3 * u, u);
  }
}

function drawCard(ctx: CanvasRenderingContext2D, w: number, L: Layout, s: SurgeryScene, e: SteadyEngine): void {
  const ts = s.ts;
  const info = STATION_INFO[e.id];
  const since = e.t - (workStart(e.station) - CARD_SECONDS);
  const slide = s.reduceMotion ? 1 : clamp(since / 0.2, 0, 1);
  const ease = 1 - (1 - slide) * (1 - slide);
  const pad = 5 * ts;
  const iconS = 16 * ts;
  const lines = [7 * (ts + 1), 7 * ts, 7 * ts];
  const gap = 3 * ts;
  const H = pad * 2 + iconS + gap + lines[0] + gap + lines[1] + gap + lines[2];
  const y0 = Math.round(L.tray.y + L.tray.s / 2 - H / 2);
  const dx = Math.round((1 - ease) * -w);
  ctx.fillStyle = 'rgba(16, 10, 36, 0.78)';
  ctx.fillRect(dx, y0, w, H);
  ctx.fillStyle = 'rgba(255, 183, 197, 0.6)';
  ctx.fillRect(dx, y0, w, 1);
  ctx.fillRect(dx, y0 + H - 1, w, 1);
  const cx = Math.round(L.tray.x + L.tray.s / 2) + dx;
  let y = y0 + pad;
  const ic = s.icon(info.icon);
  if (ic) ctx.drawImage(ic, cx - iconS / 2, y, iconS, iconS);
  y += iconS + gap;
  drawText(ctx, `STATION ${e.station + 1}`, cx, y, { color: GOLD, align: 'center', scale: ts + 1 });
  y += lines[0] + gap;
  drawText(ctx, info.title, cx, y, { color: CREAM, align: 'center', scale: ts });
  y += lines[1] + gap;
  if (e.station === 0 && s.firstRun) drawHintLine(ctx, cx, y, s, since);
  else drawText(ctx, info.caption, cx, y, { color: PINK, align: 'center', scale: ts });
}

/** First run only: "DRAG ANYWHERE" (touch) or "MOVE THE MOUSE", with the hand icon sliding beside it (still with
 *  Reduce Motion). Centered on cx, text top at y. */
function drawHintLine(ctx: CanvasRenderingContext2D, cx: number, y: number, s: SurgeryScene, since: number): void {
  const ts = s.ts;
  const hint = s.coarse ? 'DRAG ANYWHERE' : 'MOVE THE MOUSE';
  const hw = textWidth(hint, ts);
  const hand = s.icon('hand');
  const slideX = s.reduceMotion ? 0 : Math.round(((Math.sin(since * 4) + 1) / 2) * 6 * ts);
  const total = hw + 4 * ts + 12 * ts;
  const left = Math.round(cx - total / 2);
  if (hand) ctx.drawImage(hand, left + slideX - 2 * ts, y - 3 * ts, 12 * ts, 12 * ts);
  drawText(ctx, hint, left + 12 * ts + 4 * ts, y, { color: PINK, scale: ts });
}

/** The same hint on a dark band along the bottom of the pad, below every seam point (y ≤ 84 tray units). */
function drawControlsHint(ctx: CanvasRenderingContext2D, L: Layout, s: SurgeryScene, since: number): void {
  const ts = s.ts;
  const { x, y, s: size } = L.tray;
  const h = 7 * ts + 4 + 2 * ts;
  const top = Math.round(y + size - 6 - h);
  ctx.fillStyle = 'rgba(16, 10, 36, 0.78)';
  ctx.fillRect(x + 6, top, size - 12, h);
  drawHintLine(ctx, Math.round(x + size / 2), top + 2 + ts, s, since);
}
