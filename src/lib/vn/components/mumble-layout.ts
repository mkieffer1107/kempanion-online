// Where Piggy 3's mumble bubbles go, and when (pure, bun-testable). While his quiet, fast mumble stream types out in
// the dialogue box (chat.ts), each fragment's buzzword pops out of him in a small lilac cloud (MumbleBubbles.svelte
// draws them): beside his face, never over it, the phone in his hoof, his muttering hoof, the dialogue window or the
// screen's chrome. Here: the keep-out boxes of his phone portraits, where his portrait cell sits on the stage, the slot
// search, how many bubbles a screen shows, and which bubble pops on which page of the stream.
// Geometry is CSS px in the stage view's box (the layer StageHost's children live in) unless it says otherwise.
import { lineupScale, portraitCenterX, portraitY, PORTRAIT_W } from '../../engine/layout';
import type { PortraitPos } from '../../engine/stage';
import type { ChatMumble, OutfitId } from '../../types';
import { pageLine, type TextGrid } from '../chat-pages';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** viewport.mode: T phone portrait (he stands in the middle), S phone landscape and W wide (he stands on the left). */
export type MumbleMode = 't' | 's' | 'w';

/** A box in the 192×256 portrait cell: x0, y0, x1, y1. */
export type CellBox = readonly [number, number, number, number];

/**
 * Union of the opener 'phone' and focused 'phone_mumble' portraits, measured at half the 384×512 source size.
 * The focused pose has wider glasses, a lower chin/phone, and a hoof over his mouth; the hoodie's opener sits higher.
 * Keep his face (glasses/hinges, brows, snout, mouth), phone/holding hoof, and either free-hoof pose clear.
 * Ears and curls may sit under a bubble's edge. An outfit without its own phone cells uses everyday's.
 */
export const MUMBLE_KEEP: Readonly<Record<'everyday' | 'hoodie', { face: CellBox; phone: CellBox; fist: CellBox }>> = {
  everyday: { face: [26, 84, 166, 184], phone: [130, 125, 188, 202], fist: [29, 149, 106, 197] },
  hoodie: { face: [26, 74, 166, 184], phone: [128, 112, 188, 202], fist: [36, 149, 106, 188] },
};

/** Stage px kept around every box: the portrait bobs 1–2 px while he talks and pops 4% on a new face. */
export const KEEP_PAD = 3;

/** Motion (ms) and drift (art px), the stage speech bubble's own steps. */
export const MUMBLE_TIMING = {
  /** Pop-in from the tail, steps(3). */
  popMs: 150,
  /** Drift time and the longest a bubble stays while he types (the cap usually retires it sooner). */
  lifeMs: 3200,
  /** Fade-out, steps(3). */
  fadeMs: 300,
  /** Every bubble pops when he snaps out of it. */
  snapMs: 140,
  /** A bubble popping where an older one is still fading waits this long. */
  swapDelayMs: 200,
  /** Art px a bubble rises over lifeMs, one per step. */
  driftArt: 4,
} as const;

/** The tail sprite (scripts/make-bubbles.ts): 5×4 art px, its top row on the bubble's last row. */
export const TAIL_ART = { w: 5, h: 4 } as const;

/** Picture height (CSS px) under which an upright phone shows 2 bubbles instead of 3. */
export const SHORT_ZONE = 150;

/** The widest bubble before its word breaks onto two lines, in art px (phone portrait, else). */
export const MAX_BUBBLE_ART = { t: 64, s: 80, w: 80 } as const;

export interface MumbleGeo {
  mode: MumbleMode;
  /** One UI pixel in CSS px (2 on phones, 3 elsewhere): one art pixel of a bubble. */
  px: number;
  /** His face first, then the phone and the fist: never under a bubble. */
  keep: Rect[];
  /** Where bubbles live: the picture above the dialogue window. */
  zone: Rect;
  /** The same band across the whole stage box, letterbox bars included: a bubble may sit over a bar. */
  wide?: Rect;
  /** Chrome over the stage (the top bar, the name plate and LOG strip, the window): never under a bubble. */
  obstacles: Rect[];
}

/** Bubbles up at once: 3 on an upright phone (2 when the picture above the window is short), 4 landscape, 5 wide. */
export function mumbleCap(g: Pick<MumbleGeo, 'mode' | 'zone'>): number {
  if (g.mode === 't') return g.zone.h < SHORT_ZONE ? 2 : 3;
  return g.mode === 's' ? 4 : 5;
}

/**
 * His keep-out boxes in the stage view, CSS px (`u` = CSS px per stage px, `lw` = the stage's logical width): the cell
 * sits where world.ts draws a lone portrait in `pos` (lineup scale, slot centre, waist on the stage's bottom edge).
 */
export function mumbleKeepOut(outfit: OutfitId, pos: PortraitPos, lw: number, u: number): Rect[] {
  const boxes = MUMBLE_KEEP[outfit === 'hoodie' ? 'hoodie' : 'everyday'];
  const k = lineupScale([pos], lw);
  const left = portraitCenterX(pos, lw, k) - (Math.round(PORTRAIT_W * k) >> 1);
  const top = portraitY(0, k);
  return [boxes.face, boxes.phone, boxes.fist].map(([x0, y0, x1, y1]) => ({
    x: (left + x0 * k - KEEP_PAD) * u,
    y: (top + y0 * k - KEEP_PAD) * u,
    w: ((x1 - x0) * k + 2 * KEEP_PAD) * u,
    h: ((y1 - y0) * k + 2 * KEEP_PAD) * u,
  }));
}

/**
 * Placement slots, tried in order from a rotating start. side: which side of his keep-outs · col: columns out from them
 * (0 = hugging them) · level: bubble centre as a fraction of the face's height from its top (negative = above it).
 * The x hugs whichever keep-outs share the bubble's rows, so a bubble at cheek height on his phone side sits past the
 * phone, and one at temple height sits right beside his glasses.
 */
export const MUMBLE_SLOTS: Readonly<Record<MumbleMode, readonly { side: 'left' | 'right'; col: number; level: number }[]>> = {
  // T: he stands in the middle: both sides, the temple and the free side first
  t: [
    { side: 'right', col: 0, level: 0.0 }, { side: 'left', col: 0, level: 0.3 },
    { side: 'right', col: 0, level: 0.62 }, { side: 'left', col: 0, level: -0.28 },
    { side: 'left', col: 0, level: 0.82 }, { side: 'right', col: 0, level: -0.42 },
  ],
  // S / W: he stands on the left and the right half is free while he talks: an arc beside and above-right of him
  s: [
    { side: 'right', col: 0, level: 0.02 }, { side: 'right', col: 1, level: -0.32 },
    { side: 'right', col: 0, level: 0.66 }, { side: 'right', col: 2, level: 0.22 },
    { side: 'right', col: 1, level: 0.98 }, { side: 'right', col: 2, level: -0.52 },
    { side: 'right', col: 3, level: 0.62 }, { side: 'right', col: 0, level: -0.62 },
  ],
  w: [
    { side: 'right', col: 0, level: 0.02 }, { side: 'right', col: 1, level: -0.32 },
    { side: 'right', col: 0, level: 0.66 }, { side: 'right', col: 2, level: 0.22 },
    { side: 'right', col: 1, level: 0.98 }, { side: 'right', col: 2, level: -0.52 },
    { side: 'right', col: 3, level: 0.62 }, { side: 'right', col: 0, level: -0.62 },
  ],
};

/** a and b overlap, with `pad` px between them counting as overlap. */
export const hit = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export interface BubbleBox {
  /** The cloud, CSS px (its width is 16 + 8m art px; 16 or 24 art px tall). */
  w: number;
  h: number;
  /** How far the tail reaches below the cloud, CSS px. */
  tail: number;
}

export interface Placement {
  /** The cloud's top-left. */
  x: number;
  y: number;
  /** Everything it covers over its life: its drift above, its tail below. */
  r: Rect;
  /** Which side of him it is on (its tail points down toward him). */
  side: 'left' | 'right';
  /** The slot it took (the search starts after it next time). */
  slot: number;
}

/**
 * The first free slot (from `start`) for a bubble: inside `zone`, clear of his keep-outs and the chrome, and of the
 * bubbles up (and the fading ones too, with `avoidFading`). Null when nothing fits.
 */
export function placeMumble(
  b: BubbleBox,
  g: MumbleGeo,
  live: readonly Rect[],
  fading: readonly Rect[],
  start: number,
  { avoidFading = true, zone = g.zone }: { avoidFading?: boolean; zone?: Rect } = {},
): Placement | null {
  const slots = MUMBLE_SLOTS[g.mode];
  const face = g.keep[0];
  if (!face || !slots.length) return null;
  const px = g.px;
  const snap = (v: number) => Math.round(v / px) * px;
  const gap = 2 * px;
  const colW = Math.max(b.w * 0.8, 44 * px);
  const drift = MUMBLE_TIMING.driftArt * px;
  for (let k = 0; k < slots.length; k++) {
    const slot = (((start + k) % slots.length) + slots.length) % slots.length;
    const s = slots[slot];
    const y = snap(clamp(face.y + s.level * face.h - b.h / 2, zone.y + drift, zone.y + zone.h - b.h - b.tail));
    // hug the keep-outs that share the bubble's rows (over its whole drift), else his face
    const near = g.keep.filter((r) => r.y < y + b.h + b.tail && r.y + r.h > y - drift);
    const edge = near.length ? near : [face];
    const x0 = s.side === 'right'
      ? Math.max(...edge.map((r) => r.x + r.w)) + gap + s.col * colW
      : Math.min(...edge.map((r) => r.x)) - gap - b.w - s.col * colW;
    const x = snap(clamp(x0, zone.x, zone.x + zone.w - b.w));
    const r = { x, y: y - drift, w: b.w, h: b.h + b.tail + drift };
    if (r.x < zone.x - 0.5 || r.x + r.w > zone.x + zone.w + 0.5 || r.y < zone.y - 0.5 || r.y + r.h > zone.y + zone.h + 0.5) continue;
    if (g.keep.some((o) => hit(r, o, px))) continue;
    if (g.obstacles.some((o) => hit(r, o, px))) continue;
    if (live.some((o) => hit(r, o, px))) continue;
    if (avoidFading && fading.some((o) => hit(r, o, px))) continue;
    return { x, y, r, side: s.side, slot };
  }
  return null;
}

/** A page of the stream as the box shows it, with the bubbles of the fragments that start on it (`at` in the page). */
export interface MumblePage {
  text: string;
  bubbles: { word: string; at: number }[];
}

/**
 * The stream paged for the box (chat-pages pageLine, measured at the stream's small font): a fragment's bubble pops on
 * the page where the fragment starts, when the typewriter reaches it (`at`, re-based to the page).
 */
export function mumblePages(m: Pick<ChatMumble, 'stream' | 'bubbles'>, grid: TextGrid): MumblePage[] {
  const texts = pageLine(m.stream, grid).filter(Boolean);
  const starts: number[] = [];
  let from = 0;
  for (const t of texts) {
    const i = m.stream.indexOf(t, from);
    const s = i < 0 ? from : i;
    starts.push(s);
    from = s + t.length;
  }
  const pages: MumblePage[] = texts.map((text) => ({ text, bubbles: [] }));
  for (const b of [...m.bubbles].sort((p, q) => p.at - q.at)) {
    let p = 0;
    while (p + 1 < starts.length && starts[p + 1] <= b.at) p++;
    if (!pages[p]) continue;
    pages[p].bubbles.push({ word: b.word, at: Math.max(0, Math.min(pages[p].text.length, b.at - starts[p])) });
  }
  return pages;
}
