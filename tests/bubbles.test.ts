// Where a thought cloud goes (thoughts final.md §9, §13.9): the placement ladder on the measured stages (360×640 …
// 1280×800, with the status bar, dock, menu and text box as keep-outs), how many clouds a stage shows, who thinks next
// on a place screen, and how long a tapped line stays up.
import { describe, expect, test } from 'bun:test';
import type { PortraitPos } from '../src/lib/engine/stage';
import { lineupScale } from '../src/lib/engine/layout';
import {
  EDGE, bubbleMs, cloudSize, iconCloudSize, maxThoughts, placeBubble, portraitHead, type PlaceInput, type Rect,
} from '../src/lib/ui/bubbles';
import { nextThinkers, slotsAdjacent } from '../src/lib/ui/location/thinkers';
import { rngFor } from '../src/lib/pet/rng';
import type { PigId } from '../src/lib/types';

/** A stage measured in the live game (thoughts/geo/shots/*.json): the view and the overlays, in viewport px. */
interface Stage { name: string; view: [number, number, number, number]; lw: number; u: number; px: number; barTop: number; overlays: [number, number, number, number][] }

/** Place screens (Sat 2026-10-31 at the Swamp, all three pigs). T-mode overlays are rows outside the stage. */
const PLACES: Stage[] = [
  { name: '360×640', view: [0, 35, 360, 247], lw: 458, u: 0.7852, px: 2, barTop: 0, overlays: [[0, 0, 360, 35], [8, 261, 352, 384]] },
  { name: '375×667', view: [0, 35, 375, 320], lw: 355, u: 1.0556, px: 2, barTop: 0, overlays: [[0, 0, 375, 35], [8, 334, 367, 434]] },
  { name: '393×852', view: [0, 112, 393, 505], lw: 270, u: 1.4556, px: 2, barTop: 0, overlays: [[0, 0, 393, 35], [8, 519, 385, 619]] },
  { name: '430×932', view: [0, 166, 430, 596], lw: 270, u: 1.5926, px: 2, barTop: 0, overlays: [[0, 0, 430, 35], [8, 610, 422, 710]] },
  { name: '667×375', view: [0, 0, 594, 375], lw: 428, u: 1.3879, px: 2, barTop: 44, overlays: [[6, 4, 479, 41], [598, 277, 663, 371], [379, 46, 588, 272], [6, 327, 588, 369]] },
  { name: '852×393', view: [30, 0, 729, 393], lw: 480, u: 1.4556, px: 2, barTop: 44, overlays: [[6, 4, 479, 41], [762, 295, 848, 389], [544, 55, 752, 281], [6, 345, 752, 387]] },
  { name: '1280×800', view: [0, 40, 1280, 760], lw: 480, u: 2.6667, px: 3, barTop: 0, overlays: [[16, 51, 493, 89], [1072, 51, 1264, 95], [971, 241, 1264, 495], [16, 642, 1264, 747]] },
];

/** The overlays that cover the view, in view px, padded by 4 (what overlayRects() builds in the DOM). */
function keepOuts(s: Stage): Rect[] {
  const [vl, vt, vr, vb] = s.view;
  const out: Rect[] = [];
  for (const [l, t, r, b] of s.overlays) {
    const x0 = Math.max(l, vl), y0 = Math.max(t, vt), x1 = Math.min(r, vr), y1 = Math.min(b, vb);
    if (x1 <= x0 || y1 <= y0) continue;
    out.push({ x: x0 - vl - 4, y: y0 - vt - 4, w: x1 - x0 + 8, h: y1 - y0 + 8 });
  }
  return out;
}

const TRIO: PortraitPos[] = ['left', 'center', 'right'];

function input(s: Stage, pos: PortraitPos, label: string, over: Partial<PlaceInput> = {}): PlaceInput {
  const h = portraitHead(pos, TRIO, s.lw);
  return {
    view: { w: s.view[2] - s.view[0], h: s.view[3] - s.view[1] },
    head: { x: h.x * s.u, y: h.y * s.u, halfW: h.halfW * s.u, k: h.k },
    size: cloudSize(label.length, s.px),
    icon: iconCloudSize(s.px),
    tail: 10 * s.px,
    topMin: Math.max(4, s.barTop + 4),
    maxDrop: 40 * h.k * s.u,
    keepOut: keepOuts(s),
    placement: 'above',
    ...over,
  };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('placeBubble: the ladder on the measured stages', () => {
  test('every placed cloud stays inside the view, below topMin, clear of the overlays, over his own head', () => {
    let placed = 0;
    for (const s of PLACES) {
      for (const pos of TRIO) {
        for (const label of ['Thread 1/27', 'X.com is loading...', 'Pancake drill', 'MAP above 85']) {
          const i = input(s, pos, label);
          const p = placeBubble(i);
          if (!p) continue;
          placed++;
          const size = p.iconOnly ? i.icon : i.size;
          const r = { x: p.x, y: p.y, w: size.w, h: size.h };
          const where = `${s.name} ${pos} "${label}"`;
          expect([where, r.x >= EDGE - 0.5 && r.x + r.w <= i.view.w - EDGE + 0.5]).toEqual([where, true]);
          expect([where, r.y >= i.topMin - 0.5 && r.y + r.h <= i.view.h]).toEqual([where, true]);
          expect([where, i.keepOut.filter((k) => overlaps(r, k))]).toEqual([where, []]);
          expect([where, r.y + r.h <= i.head.y + i.maxDrop + 0.5]).toEqual([where, true]);
          expect([where, Math.abs(r.x + r.w / 2 - i.head.x) <= i.head.halfW + 0.5]).toEqual([where, true]);
          // the beads hang over his head unless the cloud came down onto it
          expect(p.tailHidden).toBe(r.y + r.h > i.head.y - i.tail);
          expect(p.tailX).toBeGreaterThanOrEqual(8);
          expect(p.tailX).toBeLessThanOrEqual(size.w - 8);
        }
      }
    }
    expect(placed).toBeGreaterThan(50);
  });

  test('T mode: nothing overlays the stage, so the full cloud sits above every head with its beads', () => {
    for (const s of PLACES.slice(0, 4)) {
      for (const pos of TRIO) {
        if (s.lw < 260 && pos !== 'center') continue;
        const p = placeBubble(input(s, pos, 'X.com is loading...'))!;
        expect([s.name, pos, p && !p.iconOnly]).toEqual([s.name, pos, true]);
      }
    }
    // the scaled trios (41/64 at 270 wide, 54/64 at 355): above the heads, beads showing
    for (const s of [PLACES[1], PLACES[2], PLACES[3]]) {
      for (const pos of TRIO) {
        const p = placeBubble(input(s, pos, 'Thread 1/27'))!;
        expect([s.name, pos, p.tailHidden]).toEqual([s.name, pos, false]);
      }
    }
  });

  test('667×375: every cloud drops below the 44 px status bar; the right pig meets the menu and is skipped', () => {
    const s = PLACES[4];
    for (const pos of ['left', 'center'] as const) {
      const p = placeBubble(input(s, pos, 'Thread 1/27'))!;
      expect(p).not.toBeNull();
      expect(p.y).toBeGreaterThanOrEqual(48);
      expect(p.tailHidden).toBe(true);
    }
    expect(placeBubble(input(s, 'right', 'Thread 1/27'))).toBeNull();
    expect(placeBubble(input(s, 'right', 'X'))).toBeNull();
  });

  test('falls back to the icon-only cloud, then gives up', () => {
    const s = PLACES[6];
    const base = input(s, 'center', 'X.com is loading...');
    const cx = base.head.x;
    // walls just wider than the icon cloud on both sides of his head, from the top down to below his reach
    const wall = (x: number, w: number): Rect => ({ x, y: 0, w, h: s.view[3] });
    const keepOut = [wall(0, cx - 30), wall(cx + 30, 2000)];
    const p = placeBubble({ ...base, keepOut })!;
    expect(p.iconOnly).toBe(true);
    expect(placeBubble({ ...base, keepOut: [wall(0, 4000)] })).toBeNull();
  });

  test('side (an actor in the hub): opens toward the roomier half, slides back over his head at the edge', () => {
    const view = { w: 344, h: 311 };
    const side = (x: number): PlaceInput => ({
      view, head: { x, y: 120, halfW: 34 * 1.15, k: 1 }, size: cloudSize(11, 2), icon: iconCloudSize(2), tail: 20, topMin: 4,
      maxDrop: 46, keepOut: [], placement: 'side',
    });
    const right = placeBubble(side(100))!;
    expect(right.flip).toBe(false);
    expect(right.x).toBeGreaterThan(100);
    const left = placeBubble(side(250))!;
    expect(left.flip).toBe(true);
    expect(left.x + cloudSize(11, 2).w).toBeLessThan(250);
    const edge = placeBubble(side(330))!;
    expect(edge.x).toBeGreaterThanOrEqual(EDGE);
  });
});

describe('portrait heads, capacity, thinkers, line time', () => {
  test('heads follow the lineup scale: 34 at full size, 72 for the 355-wide trio, 122 for the 270-wide one', () => {
    expect(portraitHead('center', TRIO, 480)).toEqual({ x: 240, y: 34, halfW: 72, k: 1 });
    expect(lineupScale(TRIO, 355)).toBe(54 / 64);
    expect(portraitHead('left', TRIO, 355).y).toBe(72);
    expect(lineupScale(TRIO, 270)).toBe(41 / 64);
    expect(portraitHead('right', TRIO, 270)).toMatchObject({ y: 122, k: 41 / 64, halfW: 72 * 41 / 64 });
    // narrow stages draw only the featured portrait, centered, full size
    expect(portraitHead('left', TRIO, 259)).toEqual({ x: 130, y: 34, halfW: 72, k: 1 });
  });

  test('one cloud below 900 px of stage (phones, tablets), two on the wide stage', () => {
    for (const w of [344, 360, 375, 520, 594, 699, 899]) expect(maxThoughts(w)).toBe(1);
    for (const w of [900, 1280, 1920]) expect(maxThoughts(w)).toBe(2);
  });

  test('a second cloud only in a non-adjacent slot: the ends of a trio, or a pair', () => {
    expect(slotsAdjacent('left', 'center', 3)).toBe(true);
    expect(slotsAdjacent('center', 'right', 3)).toBe(true);
    expect(slotsAdjacent('left', 'right', 3)).toBe(false);
    expect(slotsAdjacent('left', 'right', 2)).toBe(false);
    expect(slotsAdjacent('left', 'left', 2)).toBe(true);
  });

  test('nextThinkers: seeded, least recent first, the last speaker sits out unless he is alone', () => {
    const all: PigId[] = ['piggy-1', 'piggy-2', 'piggy-3'];
    const a = nextThinkers(all, { rand: rngFor('thinker', 'stadium', '2026-10-31', 0), lastThought: {}, lastSpeaker: null });
    const b = nextThinkers(all, { rand: rngFor('thinker', 'stadium', '2026-10-31', 0), lastThought: {}, lastSpeaker: null });
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(all);
    const orders = new Set(Array.from({ length: 12 }, (_, beat) =>
      nextThinkers(all, { rand: rngFor('thinker', 'stadium', '2026-10-31', beat), lastThought: {}, lastSpeaker: null }).join()));
    expect(orders.size).toBeGreaterThan(1);
    const recent = nextThinkers(all, {
      rand: rngFor('thinker', 'stadium', '2026-10-31', 3), lastThought: { 'piggy-1': 500, 'piggy-2': 100 }, lastSpeaker: null,
    });
    expect(recent[0]).toBe('piggy-3'); // never thought here
    expect(recent).toEqual(['piggy-3', 'piggy-2', 'piggy-1']);
    expect(nextThinkers(all, { rand: rngFor('x'), lastThought: {}, lastSpeaker: 'piggy-2' })).not.toContain('piggy-2');
    expect(nextThinkers(['piggy-2'], { rand: rngFor('x'), lastThought: {}, lastSpeaker: 'piggy-2' })).toEqual(['piggy-2']);
  });

  test('a tapped line stays up 1.8 s + 55 ms per character, 2.5–8.5 s', () => {
    expect(bubbleMs('Hi.')).toBe(2500);
    expect(bubbleMs('x'.repeat(100))).toBe(7300);
    expect(bubbleMs('x'.repeat(120))).toBe(8400);
    expect(bubbleMs('x'.repeat(200))).toBe(8500);
  });

  test('the cloud size estimate matches the measured clouds (106 and 154 px wide, 30 tall plus puffs)', () => {
    expect(cloudSize('Thread 1/27'.length, 2)).toEqual({ w: 106, h: 38 });
    expect(cloudSize('X.com is loading...'.length, 3)).toEqual({ w: 154, h: 42 });
    expect(cloudSize(40, 2).w).toBe(160);
  });
});
