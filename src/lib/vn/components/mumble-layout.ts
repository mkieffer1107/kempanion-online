// Where Piggy 3's mumble bubbles go, and when (pure, bun-testable). While his quiet, fast mumble stream types out in
// the dialogue box (chat.ts, or the prologue's robot rant), each fragment's buzzword pops out of him in a small lilac
// cloud (MumbleBubbles.svelte draws them). The clouds pile up in a loose cluster hugging his head, clear of his face,
// the phone, his muttering hoof, the dialogue window and the screen's chrome. Here: the keep-out boxes of his phone
// portraits, where his portrait cell sits on the stage, the cluster search, how many bubbles a screen shows, and
// which bubble pops on which page of the stream.
// Geometry is CSS px in the stage view's box (the layer StageHost's children live in) unless it says otherwise.
import { lineupScale, portraitCenterX, portraitY, NARROW_W, PORTRAIT_W } from '../../engine/layout';
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

/** Motion (ms) for the whole cloud, including its text and tail. */
export const MUMBLE_TIMING = {
  /** Pop to full opacity from the tail's root. */
  popMs: 300,
  /** A cloud retiring fades this long from wherever it is. */
  fadeMs: 650,
  /** Every bubble pops when he snaps out of it. */
  snapMs: 160,
  /** A new page lets the last page's clouds go one by one, oldest first, this far apart. */
  pageStaggerMs: 140,
  /** Words that arrive together (a tap that shows the rest) pop this far apart. */
  cascadeMs: 90,
  /** One idle bob (up an art px and back) while a cloud is up. */
  bobMs: 2400,
} as const;

/** The tail sprite (scripts/make-bubbles.ts): 5×4 art px, its top row on the bubble's last row. */
export const TAIL_ART = { w: 5, h: 4 } as const;

/** Picture height (CSS px) under which an upright phone shows 3 bubbles instead of 6. */
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
  /** The other pigs' faces in a group shot: kept clear when there is room, covered when there is not. */
  soft?: Rect[];
}

/** Bubbles up at once: 6 on an upright phone (3 when the picture above the window is short), 7 landscape, 8 wide. */
export function mumbleCap(g: Pick<MumbleGeo, 'mode' | 'zone'>): number {
  if (g.mode === 't') return g.zone.h < SHORT_ZONE ? 3 : 6;
  return g.mode === 's' ? 7 : 8;
}

/**
 * His keep-out boxes in the stage view, CSS px (`u` = CSS px per stage px, `lw` = the stage's logical width): the cell
 * sits where world.ts draws the portrait in `pos` (lineup scale, slot centre, waist on the stage's bottom edge).
 */
export function mumbleKeepOut(outfit: OutfitId, pos: PortraitPos, lw: number, u: number, lineup: readonly PortraitPos[] = [pos]): Rect[] {
  const boxes = MUMBLE_KEEP[outfit === 'hoodie' ? 'hoodie' : 'everyday'];
  const k = lineupScale(lineup, lw);
  const left = portraitCenterX(pos, lw, k) - (Math.round(PORTRAIT_W * k) >> 1);
  const top = portraitY(0, k);
  return [boxes.face, boxes.phone, boxes.fist].map(([x0, y0, x1, y1]) => ({
    x: (left + x0 * k - KEEP_PAD) * u,
    y: (top + y0 * k - KEEP_PAD) * u,
    w: ((x1 - x0) * k + 2 * KEEP_PAD) * u,
    h: ((y1 - y0) * k + 2 * KEEP_PAD) * u,
  }));
}

/** The other pigs' faces (brows to chin; their hair may sit under a cloud) in a group shot; a narrow stage draws only the speaker. */
export function mumbleNeighbours(pos: PortraitPos, lineup: readonly PortraitPos[], lw: number, u: number): Rect[] {
  if (lw < NARROW_W) return [];
  const k = lineupScale(lineup, lw);
  return lineup.filter((p) => p !== pos).map((p) => ({
    x: (portraitCenterX(p, lw, k) - 70 * k - KEEP_PAD) * u,
    y: (portraitY(0, k) + 84 * k - KEEP_PAD) * u,
    w: (140 * k + 2 * KEEP_PAD) * u,
    h: (100 * k + 2 * KEEP_PAD) * u,
  }));
}

/** a and b overlap, with `pad` px between them counting as overlap. */
export const hit = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/** The area a and b share. */
const shared = (a: Rect, b: Rect): number =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * How far a cloud is from his face (0 when they touch), height counting half: a cloud stacked over his head is still
 * plainly his, one off to the side over someone else's soon is not.
 */
export const gapBetween = (a: Rect, b: Rect): number =>
  Math.hypot(Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w)), Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h)) / 2);

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
  /** Everything it covers: the cloud, its tail below and its bob above. */
  r: Rect;
  /** Which side of his head it is on (its tail points down toward him). */
  side: 'left' | 'right';
}

/**
 * The farthest a cloud sits from his face: this many face widths, or a little over two rows of clouds (44 art px) when
 * his face is small. Past it the oldest cloud makes room instead.
 */
export const REACH = 0.45;
export const reachOf = (face: Rect, px: number): number => Math.max(REACH * face.w, 44 * px);
/** How far a cloud's centre may sit from his head's centre, sideways, in face widths. */
export const SIDE_REACH = 0.85;

/**
 * Art px a cloud may tuck under its neighbour, across or down: only the puffy rim, never the words (the text sits 4
 * art px in from the top and bottom, past the round ends at the sides).
 */
export const TUCK = 5;

/** a and b only touch at their rims (or not at all): neither covers the other's words. */
export const rimsOnly = (a: Rect, b: Rect, px: number): boolean => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w <= TUCK * px || h <= TUCK * px;
};

/**
 * The spot for a cloud in his cluster: as close to his head as it fits, so every cloud reads as his. Spots sit on an
 * 8-art-px lattice (the clouds' half height), so the cluster falls into staggered rows; clouds tuck their rims under
 * each other (TUCK) but never cover each other's words, never his face, phone or fist, the chrome or the dialogue
 * window, and off the other pigs' faces unless it is alone and nothing else fits. Above his cheek only (the tail points down at him), within REACH of his face. Null when
 * nothing fits.
 */
export function placeMumble(b: BubbleBox, g: MumbleGeo, live: readonly Rect[], fading: readonly Rect[] = []): Placement | null {
  const face = g.keep[0];
  if (!face) return null;
  const px = g.px;
  const step = 8 * px;
  const cx = face.x + face.w / 2;
  const zones = g.wide ? [g.zone, g.wide] : [g.zone];
  const area = b.w * (b.h + b.tail);
  const reach = reachOf(face, px);
  // the side with more picture beside his face is where the cluster leans
  const roomL = face.x - g.zone.x;
  const roomR = g.zone.x + g.zone.w - (face.x + face.w);
  const open: 'left' | 'right' = roomR >= roomL ? 'right' : 'left';
  // over another pig's face only as a lone cloud: with others up, the oldest makes room instead
  for (const spareFaces of live.length ? [true] : [true, false]) {
    let best: { p: Placement; score: number } | null = null;
    for (const [zi, zone] of zones.entries()) {
      const x0 = Math.ceil(zone.x / px) * px;
      const y0 = Math.ceil((zone.y + px) / px) * px;
      // the cloud's bottom no lower than his cheek
      const yMax = Math.min(zone.y + zone.h - b.h - b.tail, face.y + 0.55 * face.h - b.h);
      for (let y = y0; y <= yMax; y += step) {
        for (let x = x0; x + b.w <= zone.x + zone.w + 0.5; x += step) {
          const r = { x, y: y - px, w: b.w, h: b.h + b.tail + px };
          const gap = gapBetween(r, face);
          if (gap > reach) continue;
          if (g.keep.some((o) => hit(r, o, px)) || g.obstacles.some((o) => hit(r, o, px))) continue;
          if (spareFaces && g.soft?.some((o) => hit(r, o))) continue;
          if (!live.every((o) => rimsOnly(r, o, px))) continue;
          let crowd = 0;
          for (const o of live) crowd += shared(r, o) / area;
          let score = gap / face.w * 10 + crowd * 6;
          for (const o of fading) score += shared(r, o) / area * 1.5;
          for (const o of g.soft ?? []) score += shared(r, o) / area * 4;
          const mid = x + b.w / 2;
          // never centred out past his own head (over the next pig): the oldest cloud makes room instead
          if (Math.abs(mid - cx) > SIDE_REACH * face.w) continue;
          // stack up over his own head before spreading out sideways over someone else's
          score += Math.max(0, Math.abs(mid - cx) - face.w / 2) / face.w * 4;
          const side: 'left' | 'right' = mid >= cx ? 'right' : 'left';
          if (side !== open) score += 0.6;
          // a cloud level with his eyes beats one floating far over his hair; letterbox bars only as a fallback
          score += Math.max(0, face.y - (y + b.h)) / face.h * 1.5 + zi * 2;
          if (!best || score < best.score - 1e-6) best = { p: { x, y, r, side }, score };
        }
      }
    }
    if (best) return best.p;
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
