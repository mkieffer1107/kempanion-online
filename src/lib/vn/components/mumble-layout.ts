// Where Piggy 3's mumble bubbles go, and when (pure, bun-testable). While his quiet, fast mumble stream types out in
// the dialogue box (chat.ts), each fragment's buzzword pops out of him in a small lilac cloud (MumbleBubbles.svelte
// draws them): beside his face (the story’s Jev cloud may cover his cheek), clear of the phone, his muttering hoof, the dialogue window or the
// screen's chrome. Here: the keep-out boxes of his phone portraits, where his portrait cell sits on the stage, the slot
// search, how many bubbles a screen shows, and which bubble pops on which page of the stream.
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
  /** A group scene has room above the lineup, rather than beside the other pigs' faces. */
  group?: boolean;
}

/** Bubbles up at once: 3 on an upright phone (2 when the picture above the window is short), 4 landscape, 5 wide. */
export function mumbleCap(g: Pick<MumbleGeo, 'mode' | 'zone'>): number {
  if (g.mode === 't') return g.zone.h < SHORT_ZONE ? 2 : 3;
  return g.mode === 's' ? 4 : 5;
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

/** The other pigs' faces in a group shot; a narrow stage draws only the speaker. Mobile clouds may cover the center pig. */
export function mumbleNeighbours(pos: PortraitPos, lineup: readonly PortraitPos[], lw: number, u: number, allowCenter = false): Rect[] {
  if (lw < NARROW_W) return [];
  const k = lineupScale(lineup, lw);
  return lineup.filter((p) => p !== pos && !(allowCenter && p === 'center')).map((p) => ({
    x: (portraitCenterX(p, lw, k) - 76 * k - KEEP_PAD) * u,
    y: (portraitY(0, k) + 64 * k - KEEP_PAD) * u,
    w: (152 * k + 2 * KEEP_PAD) * u,
    h: (136 * k + 2 * KEEP_PAD) * u,
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

// A loose cluster above the speaker: anchor is a fraction across his face. Unlike Talk's side slots, these stay
// close to him even when his neighbours fill the screen, with enough height to keep their faces clear.
const GROUP_SLOTS = [
  { side: 'left', col: 0, level: -0.65, anchor: 0.25 }, { side: 'right', col: 0, level: -0.65, anchor: 1 },
  { side: 'left', col: 0, level: -1.3, anchor: 0.05 }, { side: 'right', col: 0, level: -1.3, anchor: 0.8 },
  { side: 'left', col: 0, level: -1.95, anchor: 0.2 }, { side: 'right', col: 0, level: -1.95, anchor: 1 },
] as const;

// On a phone, fill the row nearest his hair first, spreading toward the center pig before starting a second row.
// Row spacing follows the clouds' size, rather than the portrait's height; cycling must not send clouds skyward.
const MOBILE_GROUP_SLOTS = [
  { side: 'right', col: 0, row: 0 }, { side: 'left', col: 1, row: 0, ear: true }, { side: 'left', col: 2, row: 0 },
  { side: 'right', col: 0, row: 1 }, { side: 'left', col: 1, row: 1 }, { side: 'left', col: 2, row: 1 },
] as const;

/** a and b overlap, with `pad` px between them counting as overlap. */
export const hit = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export interface BubbleBox {
  /** Optional label for the prologue’s stable, speaker-anchored cloud positions. */
  word?: string;
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

/** The second robot page grows upward, keeping the newest thought nearest his hair. */
export const ROBOT_STACK_WORDS = ['receding-horizon', 'action tokens', 'zero-shot laundry'] as const;
export const isRobotStackWord = (word: string): boolean =>
  (ROBOT_STACK_WORDS as readonly string[]).includes(word.replace(/…$/, '').toLowerCase());

/** Place the whole mobile stack together so new words move earlier clouds without retiring them. */
export function placeRobotStack(boxes: readonly BubbleBox[], g: MumbleGeo): Placement[] | null {
  if (g.mode !== 't' || !g.group || !g.keep[0] || !boxes.length) return null;
  const face = g.keep[0];
  const px = g.px;
  const snap = (v: number) => Math.round(v / px) * px;
  const zone = g.wide ?? g.zone;
  const gap = 3 * px;
  let bottom = snap(face.y - 0.2 * face.h - 2 * px);
  const placements: Placement[] = [];
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    const x = clamp(snap(face.x + 0.7 * face.w - b.w / 2), Math.ceil(zone.x / px) * px, Math.floor((zone.x + zone.w - b.w) / px) * px);
    const y = snap(bottom - b.h - b.tail);
    const r = { x, y, w: b.w, h: b.h + b.tail };
    if (r.x < zone.x - 0.5 || r.x + r.w > zone.x + zone.w + 0.5 || r.y < zone.y || r.y + r.h > zone.y + zone.h) return null;
    if ([...g.keep, ...g.obstacles].some((o) => hit(r, o, px))) return null;
    placements[i] = { x, y, r, side: b.word?.toLowerCase().startsWith('action tokens') ? 'left' : 'right', slot: i };
    bottom = y - gap;
  }
  return placements;
}

export interface RobotStackRise extends Placement {
  /** The shared entrance above his hair, before the cloud rises to its final row. */
  fromY: number;
  riseMs: number;
  /** Minimum time after the preceding entry before this cloud has a clear entrance. */
  clearanceMs: number;
}

/** Plan all rows up front: the first thought can rise before the next phrase reaches the typewriter. */
export function planRobotStack(boxes: readonly BubbleBox[], g: MumbleGeo): RobotStackRise[] | null {
  const targets = placeRobotStack(boxes, g);
  if (!targets) return null;
  const zone = g.wide ?? g.zone;
  const drift = Math.min(6 * g.px, targets[0].y - zone.y);
  const speed = 24 / 1000; // CSS px per millisecond: a gentle rise, independent of the typewriter rate.
  return targets.map((p, i) => {
    const entrance = placeRobotStack([boxes[i]], g)![0];
    const y = p.y - drift;
    return {
      ...p, y, r: { ...p.r, y }, fromY: entrance.y,
      riseMs: Math.max(900, (entrance.y - y) / speed),
      clearanceMs: i ? (boxes[i].h + boxes[i].tail + 3 * g.px) / speed : 0,
    };
  });
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
  const compact = g.group && g.mode === 't';
  const slots = compact ? MOBILE_GROUP_SLOTS : g.group ? [...GROUP_SLOTS, ...MUMBLE_SLOTS[g.mode]] : MUMBLE_SLOTS[g.mode];
  const face = g.keep[0];
  if (!face || !slots.length) return null;
  const px = g.px;
  const snap = (v: number) => Math.round(v / px) * px;
  const gap = 2 * px;
  const colW = Math.max(b.w * 0.8, 44 * px);
  const drift = MUMBLE_TIMING.driftArt * px;
  const rowH = compact ? Math.max(b.h, ...live.map((r) => r.h - b.tail - drift)) + b.tail + drift + gap : 0;
  // These recurring robot labels keep their place as the other clouds cycle around them.
  const label = b.word?.replace(/…$/, '').toLowerCase();
  if (compact && label && ['autoregressive', 'jev', 'jepa'].includes(label)) {
    const left = label !== 'autoregressive';
    let x0 = label === 'jev' ? face.x - 0.45 * b.w
      : label === 'jepa' ? face.x - 0.55 * b.w
      : face.x + 0.7 * face.w - b.w / 2;
    // Jev sits on his cheek by request, while the ear cloud stays above the face bounds.
    const y0 = label === 'jev' ? Math.min(face.y + 0.2 * face.h, ...g.keep.slice(1).filter((r) => r.x < x0 + b.w + gap && r.x + r.w + gap > x0).map((r) => r.y - b.h - b.tail - gap))
      : label === 'jepa' ? face.y - b.h - b.tail - gap
      : face.y - 0.2 * face.h - b.h - b.tail - gap;
    const y = snap(clamp(y0, zone.y + drift, zone.y + zone.h - b.h - b.tail));
    if (label === 'jepa') {
      for (const r of live) {
        if (r.y < y + b.h + b.tail + px && r.y + r.h + px > y - drift) x0 = Math.min(x0, r.x - gap - b.w);
      }
    }
    const x = snap(clamp(x0, zone.x, zone.x + zone.w - b.w));
    const r = { x, y: y - drift, w: b.w, h: b.h + b.tail + drift };
    const keep = label === 'jev' ? g.keep.slice(1) : g.keep;
    if ([...keep, ...g.obstacles, ...live, ...(avoidFading ? fading : [])].some((o) => hit(r, o, px))) return null;
    return { x, y, r, side: left ? 'left' : 'right', slot: 0 };
  }
  for (let k = 0; k < slots.length; k++) {
    const slot = compact ? k : (((start + k) % slots.length) + slots.length) % slots.length;
    const s = slots[slot];
    // The left cloud sits beside his ear, over the middle pig, with its right-hand tail aimed at the speaker.
    const ear = 'ear' in s;
    const y0 = ear ? face.y + 0.12 * face.h - b.h - b.tail
      : 'row' in s
      ? face.y - 0.2 * face.h - s.row * rowH - b.h - b.tail - gap
      : face.y + s.level * face.h - b.h / 2;
    const y = snap(clamp(y0, zone.y + drift, zone.y + zone.h - b.h - b.tail));
    // hug the keep-outs that share the bubble's rows (over its whole drift), else his face
    const near = g.keep.filter((r) => r.y < y + b.h + b.tail && r.y + r.h > y - drift);
    const edge = near.length ? near : [face];
    const rowLive = compact ? live.filter((r) => r.y < y + b.h + b.tail + px && r.y + r.h + px > y - drift).sort((a, b) => b.x - a.x) : [];
    const x0 = ear ? face.x - gap - b.w
      : 'row' in s
      ? s.col > 0 && rowLive[s.col - 1]
        ? rowLive[s.col - 1].x - gap - b.w
        : Math.min(face.x + 0.65 * face.w - b.w / 2, zone.x + zone.w - b.w) - s.col * (b.w + gap)
      : 'anchor' in s ? face.x + s.anchor * face.w - b.w / 2 : s.side === 'right'
      ? Math.max(...edge.map((r) => r.x + r.w)) + gap + s.col * colW
      : Math.min(...edge.map((r) => r.x)) - gap - b.w - s.col * colW;
    const x = snap(clamp(x0, compact && !ear ? Math.max(zone.x, face.x - 0.5 * face.w) : zone.x, zone.x + zone.w - b.w));
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
