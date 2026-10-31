// Stage geometry: logical size, sharp-scaling fit, background crop, portrait slots (pure, no DOM).
import type { PortraitPos } from './stage';

export const LOGICAL_H = 270;
export const MIN_LOGICAL_W = 150;
export const MAX_LOGICAL_W = 480;
export const BG_W = 480;
export const BG_H = 270;
export const DEFAULT_GROUND_Y = 252;
/** Below this logical width only the featured (speaking) portrait is drawn, centered. */
export const NARROW_W = 260;
export const PORTRAIT_W = 192;
export const PORTRAIT_H = 256;
/** Portraits sit this far below the stage bottom: the art's 10 px foot margin disappears, the waist meets the edge. */
export const PORTRAIT_SINK = 8;
export const PORTRAIT_TOP = LOGICAL_H - PORTRAIT_H + PORTRAIT_SINK;
/** Stage CSS height from which the roomy "W" layout petal counts apply. */
export const LARGE_STAGE_CSS_H = 420;
/** Largest backing store we allocate for the upscaled canvas (4K). */
export const MAX_BACKING_PIXELS = 3840 * 2160;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Logical stage width for a CSS box: clamp(150, round(270 * aspect), 480). */
export function logicalWidthFor(boxW: number, boxH: number): number {
  if (!(boxW > 0) || !(boxH > 0)) return MAX_LOGICAL_W;
  return clamp(Math.round((LOGICAL_H * boxW) / boxH), MIN_LOGICAL_W, MAX_LOGICAL_W);
}

export interface StageFit {
  /** Logical width (height is always 270). */
  lw: number;
  /** CSS px per stage px. */
  u: number;
  /** Canvas box inside the parent, CSS px (letterboxed when the aspect is out of range). */
  cssW: number;
  cssH: number;
  left: number;
  top: number;
  /** Integer nearest-neighbor upscale factor of the backing store. */
  scale: number;
  backingW: number;
  backingH: number;
  /** True when even the largest allowed backing store is smaller than the device pixels (browser upscales). */
  upscaled: boolean;
}

/**
 * Sharp scaling: draw at logical size, upscale by the smallest integer multiple that covers the
 * device pixels, then let CSS shrink it to the exact box (smooth downscale = even, crisp pixels).
 */
export function fitStage(boxW: number, boxH: number, dpr = 1, maxBacking = MAX_BACKING_PIXELS): StageFit {
  const lw = logicalWidthFor(boxW, boxH);
  const w = Math.max(0, boxW);
  const h = Math.max(0, boxH);
  const u = Math.max(1e-3, Math.min(w / lw, h / LOGICAL_H));
  let cssW = lw * u;
  let cssH = LOGICAL_H * u;
  // round(270 * aspect) leaves at most half a stage pixel of slack: fill the box instead of a hairline gap
  if (w - cssW < u) cssW = w;
  if (h - cssH < u) cssH = h;
  const ratio = dpr > 0 ? dpr : 1;
  cssW = Math.round(cssW * ratio) / ratio;
  cssH = Math.round(cssH * ratio) / ratio;
  const left = Math.round(((w - cssW) / 2) * ratio) / ratio;
  const top = Math.round(((h - cssH) / 2) * ratio) / ratio;
  const devH = cssH * ratio;
  let scale = Math.max(1, Math.ceil(devH / LOGICAL_H - 1e-6));
  while (scale > 1 && lw * scale * LOGICAL_H * scale > maxBacking) scale--;
  return {
    lw, u, cssW, cssH, left, top, scale,
    backingW: lw * scale,
    backingH: LOGICAL_H * scale,
    upscaled: LOGICAL_H * scale < devH - 0.5,
  };
}

/** Left edge of the visible window into a 480-wide background, keeping focusX centered when possible. */
export function bgCropX(viewW: number, focusX: number, bgW = BG_W): number {
  if (viewW >= bgW) return Math.round((bgW - viewW) / 2);
  return clamp(Math.round(focusX - viewW / 2), 0, bgW - viewW);
}

const SLOT_FRACTION: Record<PortraitPos, number> = {
  'far-left': 0.1,
  left: 100 / 480,
  center: 0.5,
  right: 380 / 480,
  'far-right': 0.9,
};

/** Slots that size a lineup, left to right. The far slots overhang the edges by design, as on the 16:9 stage. */
const LINEUP_SLOTS = ['left', 'center', 'right'] as const;
/** Half-width of a portrait's face (glasses, eyes, cheeks) around the cell's center column; ears and paws reach ±87. */
export const PORTRAIT_FACE_HALF = 72;
/** Neighbours' faces may overlap by this share of a face: an outer cheek and glasses rim, never an eye (eyes end ±45). */
export const LINEUP_OVERLAP = 0.15;
/** On the 16:9 stage the far slots sit 0.1 × 480 = 48 px in; they never hang further off than that, scaled. */
const FAR_EDGE = 48;
/** Lineup scales are whole 64ths, so the 192×256 cell shrinks to whole pixels (3n × 4n). */
const SCALE_STEPS = 64;
const MIN_LINEUP_SCALE = 0.5;
/** A lineup that fits at 95% or more stays full size: a few px more cheek overlap beats resampling the art. */
const FULL_SIZE_FROM = 0.95;

/**
 * Horizontal center of a portrait slot for portraits drawn at `scale` (lineupScale); narrow stages put everyone in
 * the middle. Left, center and right sit at fixed fractions of the stage width (Talk.svelte lays out beside 'left').
 */
export function portraitCenterX(pos: PortraitPos, lw: number, scale = 1): number {
  if (lw < NARROW_W) return Math.round(lw / 2);
  const x = Math.round(lw * SLOT_FRACTION[pos]);
  if (pos !== 'far-left' && pos !== 'far-right') return x;
  const edge = Math.round(FAR_EDGE * scale);
  return clamp(x, edge, lw - edge);
}

/**
 * Draw scale for the portraits on stage together (1 = the art's own 192×256): the largest at which every left,
 * center and right face stays on stage and neighbours' faces overlap by at most LINEUP_OVERLAP. The 16:9 stage
 * keeps 1 for any lineup, and so does a lone center portrait anywhere. The square phone / tablet stage (270 wide)
 * draws a left + center + right trio at 41/64 and a left + right pair at 50/64, where full-size art would run off
 * the edges and hide most of the middle face. Narrow stages draw only the featured portrait, at full size.
 */
export function lineupScale(positions: readonly PortraitPos[], lw: number): number {
  if (lw < NARROW_W) return 1;
  let fit = Infinity;
  let prev: number | null = null;
  for (const pos of LINEUP_SLOTS) {
    if (!positions.includes(pos)) continue;
    // the exact fraction, not the rounded px: the scale then only ever grows as the stage widens
    const x = lw * SLOT_FRACTION[pos];
    fit = Math.min(fit, x / PORTRAIT_FACE_HALF, (lw - x) / PORTRAIT_FACE_HALF);
    if (prev !== null) fit = Math.min(fit, (x - prev) / (2 * PORTRAIT_FACE_HALF * (1 - LINEUP_OVERLAP)));
    prev = x;
  }
  if (fit >= FULL_SIZE_FROM) return 1;
  return Math.max(MIN_LINEUP_SCALE, Math.floor(fit * SCALE_STEPS) / SCALE_STEPS);
}

/** Stage y of row `cellY` of a portrait drawn at `scale`: a shrunk portrait keeps its waist on the stage's bottom edge. */
export function portraitY(cellY: number, scale = 1): number {
  return PORTRAIT_TOP + PORTRAIT_H - Math.round(PORTRAIT_H * scale) + Math.round(cellY * scale);
}

/** Enter/exit slide direction: −1 from the left, +1 from the right, 0 rises from below. */
export function portraitEnterDir(pos: PortraitPos): -1 | 0 | 1 {
  if (pos === 'far-left' || pos === 'left') return -1;
  if (pos === 'far-right' || pos === 'right') return 1;
  return 0;
}

/** Whether a shown portrait is drawn: always on wide stages, only the featured one on narrow stages. */
export function portraitVisible<T>(pig: T, lw: number, featured: T | null): boolean {
  return lw >= NARROW_W || pig === featured;
}

/**
 * The portrait a narrow stage features: the speaker, else the last speaker still on stage,
 * else the most recently shown portrait.
 */
export function featuredPortrait<T>(
  shown: readonly { id: T; order: number; leaving?: boolean }[],
  talking: T | null,
  lastTalking: T | null,
): T | null {
  let newest: { id: T; order: number } | null = null;
  let hasTalking = false;
  let hasLast = false;
  for (const s of shown) {
    if (s.leaving) continue;
    if (s.id === talking) hasTalking = true;
    if (s.id === lastTalking) hasLast = true;
    if (!newest || s.order > newest.order) newest = s;
  }
  if (talking !== null && hasTalking) return talking;
  if (lastTalking !== null && hasLast) return lastTalking;
  return newest ? newest.id : null;
}

/** Quantize progress 0..1 into n steps (stepped animation); 0 stays 0 and 1 stays 1. */
export function stepped(p: number, n: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return Math.ceil(p * n) / n;
}

export interface RectLike { left: number; top: number; width: number; height: number }

/** Viewport client coordinates → logical stage pixels, or null outside the canvas. */
export function clientToLogical(
  clientX: number, clientY: number, rect: RectLike, lw: number, lh = LOGICAL_H,
): { x: number; y: number } | null {
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  const x = ((clientX - rect.left) / rect.width) * lw;
  const y = ((clientY - rect.top) / rect.height) * lh;
  if (x < 0 || y < 0 || x >= lw || y >= lh) return null;
  return { x, y };
}

/**
 * Like clientToLogical, but points outside the canvas map too (a drag that leaves the stage) and the result
 * is written into `out` (no allocation). False when the rect is degenerate.
 */
export function clientToStage(
  clientX: number, clientY: number, rect: RectLike, lw: number, out: { x: number; y: number }, lh = LOGICAL_H,
): boolean {
  if (!(rect.width > 0) || !(rect.height > 0) || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
  out.x = ((clientX - rect.left) / rect.width) * lw;
  out.y = ((clientY - rect.top) / rect.height) * lh;
  return true;
}
