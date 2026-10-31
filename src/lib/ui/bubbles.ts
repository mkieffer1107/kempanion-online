// Stage bubbles shared by the hub and the place screens (thoughts final.md §8–§9): how long a spoken line stays up,
// how many thought clouds a stage may show, where a portrait's head is, and the pure placement ladder for a cloud
// (placeBubble). overlayRects() is the one DOM helper: it measures what a cloud must stay clear of.
import type { PortraitPos } from '../engine/stage';
import { NARROW_W, PORTRAIT_FACE_HALF, lineupScale, portraitCenterX, portraitY } from '../engine/layout';
import { THOUGHT } from '../pet/thoughts';

export interface Rect { x: number; y: number; w: number; h: number }

/** A head anchor in stage-view px: top-center of his head, the half-width a cloud may slide over, and the draw scale. */
export interface HeadAnchor { x: number; y: number; halfW: number; k: number }

export interface PlaceInput {
  /** The stage view (CSS px). */
  view: { w: number; h: number };
  /** headAnchor × u (k stays a ratio). */
  head: HeadAnchor;
  /** The cloud with its label (measured, or cloudSize()). */
  size: { w: number; h: number };
  /** The icon-only cloud. */
  icon: { w: number; h: number };
  /** Bead tail height: 10 units. */
  tail: number;
  /** max(4, --bubble-top + 4). */
  topMin: number;
  /** How far the cloud may come down over his head: 40 × k × u (eyes stay clear). */
  maxDrop: number;
  /** Overlays, other clouds, the want, speech bubbles (already padded by 4 px). */
  keepOut: readonly Rect[];
  placement: 'side' | 'above';
}

export interface Placed {
  /** Top-left of the cloud (puffs included), stage-view px. */
  x: number;
  y: number;
  iconOnly: boolean;
  /** Where the beads hang, from the cloud's left edge (px). */
  tailX: number;
  /** The cloud came down over his head: no room for the beads. */
  tailHidden: boolean;
  /** side placement: the cloud sits to his left. */
  flip: boolean;
}

/** Side margin inside the stage view (px). */
export const EDGE = 6;
/** Sideways dodge step (px). */
const STEP = 8;

/** A spoken line's bubble time: 1800 + 55 ms per character, 2.5–8.5 s (the tapped thought's line, §5.2). */
export function bubbleMs(text: string): number {
  const [lo, hi] = THOUGHT.tapMs;
  return Math.min(hi, Math.max(lo, 1800 + 55 * text.length));
}

/** ?debug&thoughts=fast (Playwright): ambient gaps × 0.15. */
export function thoughtSpeed(): number {
  if (typeof location === 'undefined') return 1;
  const q = new URLSearchParams(location.search);
  return q.has('debug') && q.get('thoughts') === 'fast' ? 0.15 : 1;
}

/** Thought clouds a stage view this wide may show at once: 1 below 900 CSS px (phones, tablets), else 2. */
export function maxThoughts(viewW: number): number {
  return viewW < 900 ? 1 : 2;
}

/**
 * Estimated cloud size (px) for a label: icon 20 + gap 4 + padding 16 + 6 px per character (DotGothic16 at 12 px is
 * exactly 0.5 em), 30 tall, plus two units of puff above and below. Matches the measured 106 / 154 px.
 */
export function cloudSize(len: number, px: number): { w: number; h: number } {
  return { w: 40 + 6 * Math.min(THOUGHT.labelMax, Math.max(0, len)), h: 30 + 4 * px };
}

/** The icon-only cloud (≈ 36 × 30, plus puffs). */
export function iconCloudSize(px: number): { w: number; h: number } {
  return { w: 36, h: 30 + 4 * px };
}

/**
 * Where a portrait's head is (logical px): its slot at the lineup scale, or the stage center on a narrow stage, at
 * row 12 of the cell. The same anchor the stage's speech bubbles use (engine/world.ts positionBubble).
 */
export function portraitHead(pos: PortraitPos, positions: readonly PortraitPos[], lw: number): HeadAnchor {
  if (lw < NARROW_W) return { x: Math.round(lw / 2), y: portraitY(12, 1), halfW: PORTRAIT_FACE_HALF, k: 1 };
  const k = lineupScale(positions, lw);
  return { x: portraitCenterX(pos, lw, k), y: portraitY(12, k), halfW: PORTRAIT_FACE_HALF * k, k };
}

function hits(r: Rect, keepOut: readonly Rect[]): Rect | null {
  for (const k of keepOut) {
    if (r.x < k.x + k.w && r.x + r.w > k.x && r.y < k.y + k.h && r.y + r.h > k.y) return k;
  }
  return null;
}

/** Candidate lefts: the preferred one first, then 8 px steps out to both sides, keeping the cloud's center over
 *  his head (head.x ± halfW) and the cloud 6 px inside the view. */
function lefts(pref: number, w: number, head: HeadAnchor, viewW: number): number[] {
  const lo = Math.ceil(Math.max(EDGE, head.x - head.halfW - w / 2));
  const hi = Math.floor(Math.min(viewW - EDGE - w, head.x + head.halfW - w / 2));
  if (hi < lo) return [];
  const start = Math.min(hi, Math.max(lo, Math.round(pref)));
  const out = [start];
  for (let d = STEP; start - d >= lo || start + d <= hi; d += STEP) {
    if (start - d >= lo) out.push(start - d);
    if (start + d <= hi) out.push(start + d);
  }
  return out;
}

/**
 * The placement ladder (§9.3), all in stage-view px:
 * 1. Full cloud in its preferred spot. `above`: centered on his head, bottom at head.y − tail, top ≥ topMin.
 *    `side`: the want's rule, near edge 8% of the view beside his head toward the roomier half.
 * 2. Dodge: slide sideways in 8 px steps (staying over his head), else move down to just under what's in the way,
 *    while the cloud's bottom stays at or above head.y + maxDrop. The beads hide once it overlaps head.y − tail.
 * 3. The icon-only cloud, the same way (its label stays in the accessible name and title).
 * 4. Give up: null (don't show the cloud, don't mark the thought).
 */
export function placeBubble(i: PlaceInput): Placed | null {
  const { view, head, tail } = i;
  const flip = i.placement === 'side' && head.x > view.w / 2;
  for (const [size, iconOnly] of [[i.size, false], [i.icon, true]] as const) {
    const { w, h } = size;
    if (w > view.w - 2 * EDGE) continue;
    let pref: number;
    let y0: number;
    if (i.placement === 'above') {
      pref = head.x - w / 2;
      y0 = head.y - tail - h;
    } else {
      const gap = 0.08 * view.w;
      pref = flip ? head.x - gap - w : head.x + gap;
      y0 = head.y - h;
    }
    // whole px: never rounded down onto his head, or up under the status bar
    y0 = Math.max(Math.ceil(i.topMin), Math.floor(y0));
    const yMax = Math.floor(Math.min(head.y + i.maxDrop, view.h) - h);
    if (y0 > yMax) continue;
    const xs = i.placement === 'above'
      ? lefts(pref, w, head, view.w)
      : [Math.min(Math.floor(view.w - EDGE - w), Math.max(EDGE, Math.round(pref))), ...lefts(pref, w, head, view.w)];
    // y candidates: the preferred spot, then just under each keep-out below it
    const ys = [y0, ...i.keepOut.map((k) => Math.ceil(k.y + k.h)).filter((y) => y > y0 && y <= yMax)].sort((a, b) => a - b);
    for (const y of ys) {
      for (const x of xs) {
        if (hits({ x, y, w, h }, i.keepOut)) continue;
        const tailX = Math.round(Math.min(w - 8, Math.max(8, head.x - x)));
        const tailHidden = i.placement === 'above' && y + h > head.y - tail;
        return { x, y, iconOnly, tailX, tailHidden, flip };
      }
    }
  }
  return null;
}

/**
 * What a cloud in this stage view must stay clear of (view px, padded by `pad`): the layout's overlay regions (status,
 * dock, top, info, menu, bottom, text) where they cover the view, the in-stage chips, visible speech bubbles, other
 * clouds and the want. In T mode the regions are rows outside the stage, so only the chips are left.
 */
export function overlayRects(viewEl: HTMLElement, exclude: Element | null = null, pad = 4): Rect[] {
  const vr = viewEl.getBoundingClientRect();
  const out: Rect[] = [];
  const add = (el: Element) => {
    if (exclude && (el === exclude || exclude.contains(el))) return;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return;
    if (getComputedStyle(el).visibility === 'hidden') return;
    const x0 = Math.max(r.left, vr.left), y0 = Math.max(r.top, vr.top);
    const x1 = Math.min(r.right, vr.right), y1 = Math.min(r.bottom, vr.bottom);
    if (x1 <= x0 || y1 <= y0) return;
    out.push({ x: x0 - vr.left - pad, y: y0 - vr.top - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad });
  };
  const frame = viewEl.closest('.frame');
  if (frame) for (const el of frame.querySelectorAll(':scope > .r:not(.stage) > *')) add(el);
  for (const el of viewEl.querySelectorAll('.petal-chip, .attention, .stage-bubble, .want, .tb-cloud')) add(el);
  return out;
}
