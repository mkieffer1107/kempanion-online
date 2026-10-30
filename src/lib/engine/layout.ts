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

/** Horizontal center of a portrait slot; narrow stages put everyone in the middle. */
export function portraitCenterX(pos: PortraitPos, lw: number): number {
  if (lw < NARROW_W) return Math.round(lw / 2);
  return Math.round(lw * SLOT_FRACTION[pos]);
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
