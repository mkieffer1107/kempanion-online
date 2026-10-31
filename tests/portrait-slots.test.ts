import { describe, expect, test } from 'bun:test';
import { loadImage } from '../src/lib/engine/assets';
import {
  fitStage, LINEUP_OVERLAP, lineupScale, LOGICAL_H, MAX_LOGICAL_W, NARROW_W, PORTRAIT_FACE_HALF, PORTRAIT_H, PORTRAIT_SINK,
  PORTRAIT_TOP, PORTRAIT_W, portraitCenterX, portraitY, type StageFit,
} from '../src/lib/engine/layout';
import type { PortraitPos } from '../src/lib/engine/stage';
import { StageWorld } from '../src/lib/engine/world';
import type { Expression, PigId } from '../src/lib/types';

const POS: PortraitPos[] = ['far-left', 'left', 'center', 'right', 'far-right'];
const LCR = ['left', 'center', 'right'] as const;
const FRACTION = { left: 100 / 480, center: 0.5, right: 380 / 480 };
/** Every lineup the scripts and the hub stand up: any non-empty mix of left, center and right. */
const LINEUPS: PortraitPos[][] = [
  ['left'], ['center'], ['right'], ['left', 'center'], ['center', 'right'], ['left', 'right'], ['left', 'center', 'right'],
];
/** Every mix of all five slots (the 16:9 stage must keep full size for any of them). */
const ALL_MIXES: PortraitPos[][] = Array.from({ length: 31 }, (_, m) => POS.filter((_, i) => m + 1 & (1 << i)));
const WIDE: number[] = [];
for (let lw = NARROW_W; lw <= MAX_LOGICAL_W; lw++) WIDE.push(lw);
/** At full size a lineup may miss the fit by up to 5% (it isn't resampled for a few px). */
const SNAP = 0.95;

/**
 * Whether every face is on stage and neighbours' faces overlap by at most LINEUP_OVERLAP at scale k, with the faces
 * centered on `xs` (left to right) and `slack` as a share of the fit.
 */
function fits(xs: number[], lw: number, k: number, slack = 1): boolean {
  const face = PORTRAIT_FACE_HALF * k * slack;
  const gap = 2 * PORTRAIT_FACE_HALF * (1 - LINEUP_OVERLAP) * k * slack;
  return xs.every((x, i) => x >= face && lw - x >= face && (i === 0 || x - xs[i - 1] >= gap));
}
const members = (lineup: PortraitPos[]) => LCR.filter((p) => lineup.includes(p));
/** The slot fractions exactly, as lineupScale measures them. */
const exact = (lineup: PortraitPos[], lw: number) => members(lineup).map((p) => lw * FRACTION[p]);
/** Where the portraits are drawn: within half a pixel of the fractions. */
const drawn = (lineup: PortraitPos[], lw: number, k: number) => members(lineup).map((p) => portraitCenterX(p, lw, k));

describe('portrait lineup layout', () => {
  test('the 16:9 stage keeps its lineup, full size, for any mix of slots', () => {
    expect(POS.map((p) => portraitCenterX(p, 480))).toEqual([48, 100, 240, 380, 432]);
    for (const mix of ALL_MIXES) expect(lineupScale(mix, 480)).toBe(1);
  });

  test('the square phone / tablet stage (270) shrinks a lineup instead of running faces off the edges', () => {
    // full size, the trio's side faces ran 16 px off the edges and the side pigs hid most of the middle face
    expect(lineupScale(['left', 'center', 'right'], 270)).toBe(41 / 64);
    expect(lineupScale(['left', 'center'], 270)).toBe(41 / 64);
    expect(lineupScale(['left', 'right'], 270)).toBe(50 / 64);
    expect(lineupScale(['center'], 270)).toBe(1);
    expect(LCR.map((p) => portraitCenterX(p, 270, 41 / 64))).toEqual([56, 135, 214]);
  });

  test('every face of every lineup is on stage and neighbours overlap by at most 15% of a face', () => {
    for (const lw of WIDE) {
      for (const lineup of LINEUPS) {
        const k = lineupScale(lineup, lw);
        const slack = k === 1 ? SNAP : 1;
        expect(fits(exact(lineup, lw), lw, k, slack)).toBe(true);
        // drawn at whole pixels: no face more than half a pixel further off, no overlap more than a pixel wider
        const xs = drawn(lineup, lw, k);
        xs.forEach((x, i) => {
          expect(Math.min(x, lw - x)).toBeGreaterThanOrEqual(PORTRAIT_FACE_HALF * k * slack - 0.5);
          if (i > 0) expect(x - xs[i - 1]).toBeGreaterThanOrEqual(2 * PORTRAIT_FACE_HALF * (1 - LINEUP_OVERLAP) * k * slack - 1);
        });
      }
    }
  });

  test('a lineup shrinks no more than it has to, never below half size', () => {
    for (const lw of WIDE) {
      for (const lineup of LINEUPS) {
        const k = lineupScale(lineup, lw);
        expect(k).toBeGreaterThanOrEqual(0.5);
        expect(k).toBeLessThanOrEqual(1);
        if (k < 1 && k > 0.5) expect(fits(exact(lineup, lw), lw, k + 1 / 64)).toBe(false);
      }
    }
  });

  test('scales are whole 64ths, so the 192x256 art shrinks to whole pixels', () => {
    for (const lw of WIDE) {
      for (const lineup of LINEUPS) {
        const k = lineupScale(lineup, lw);
        expect(Number.isInteger(k * 64)).toBe(true);
        expect(Number.isInteger(PORTRAIT_W * k) && Number.isInteger(PORTRAIT_H * k)).toBe(true);
      }
    }
  });

  test('left, center and right never move, at any scale; a lone center portrait is never shrunk', () => {
    // Talk.svelte lays the reply options out beside the 'left' slot at 100/480 of the stage width
    for (const lw of WIDE) {
      for (const k of [1, 50 / 64, 41 / 64, 0.5]) {
        for (const p of LCR) expect(portraitCenterX(p, lw, k)).toBe(Math.round(lw * FRACTION[p]));
      }
      expect(lineupScale(['center'], lw)).toBe(1);
    }
  });

  test('far slots stay in order and never hang further off than on the 16:9 stage, scaled', () => {
    for (const lw of WIDE) {
      for (const k of [1, 50 / 64, 41 / 64, 0.5]) {
        const xs = POS.map((p) => portraitCenterX(p, lw, k));
        for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
        expect(xs[0]).toBeGreaterThanOrEqual(Math.round(48 * k));
        expect(xs[4]).toBeLessThanOrEqual(lw - Math.round(48 * k));
      }
    }
    // far slots don't size a lineup: they overhang by design
    expect(lineupScale(['far-left', 'left', 'center', 'right', 'far-right'], 270)).toBe(lineupScale(['left', 'center', 'right'], 270));
  });

  test('widening the stage never shrinks a lineup', () => {
    for (const lineup of LINEUPS) {
      for (const lw of WIDE.slice(1)) expect(lineupScale(lineup, lw)).toBeGreaterThanOrEqual(lineupScale(lineup, lw - 1));
    }
  });

  test('narrow stages center the one featured portrait at full size', () => {
    for (const lw of [150, 200, NARROW_W - 1]) {
      for (const p of POS) expect(portraitCenterX(p, lw, 41 / 64)).toBe(Math.round(lw / 2));
      for (const lineup of LINEUPS) expect(lineupScale(lineup, lw)).toBe(1);
    }
  });

  test('a shrunk portrait keeps its waist on the stage bottom; its head (bubble, burst anchors) comes down', () => {
    for (let y = 0; y <= PORTRAIT_H; y += 8) expect(portraitY(y)).toBe(PORTRAIT_TOP + y);
    let head = portraitY(12);
    for (let n = 63; n >= 32; n--) {
      expect(portraitY(PORTRAIT_H, n / 64)).toBe(LOGICAL_H + PORTRAIT_SINK);
      const y = portraitY(12, n / 64);
      expect(y).toBeGreaterThan(head);
      head = y;
    }
  });
});

// The engine itself, headless: world.ts sizes, places and draws the lineup by the rules above.

/**
 * A loaded stand-in for the portrait atlases, under a path nothing else loads: bun runs every test file in one
 * process, so a fake image cached under a real atlas path would leak into the other files.
 */
const FAKE_ATLAS = 'test/portrait-slots-atlas.png';
async function fakeAtlas(): Promise<unknown> {
  const g = globalThis as { Image?: unknown };
  const had = g.Image;
  g.Image = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decoding = '';
    set src(_: string) {
      queueMicrotask(() => this.onload?.());
    }
    decode() {
      return Promise.resolve();
    }
  };
  try {
    return await loadImage(FAKE_ATLAS);
  } finally {
    if (had === undefined) delete g.Image;
    else g.Image = had;
  }
}

interface Draw { img: unknown; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number; smooth: boolean }

/** A 2D context that records drawImage (with the smoothing in force) and ignores everything else. */
function recorder() {
  const draws: Draw[] = [];
  const state: Record<string | symbol, unknown> = { imageSmoothingEnabled: false };
  const ctx = new Proxy(state, {
    get: (t, k) => k === 'drawImage'
      ? (img: unknown, _sx: number, _sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) =>
        draws.push({ img, sw, sh, dx, dy, dw, dh, smooth: t.imageSmoothingEnabled === true })
      : k in t ? t[k] : () => {},
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, draws, state };
}

/** The prologue's "please choose your Kempanion!" lineup (QA SS-10), nobody talking. */
const SS10: [PigId, Expression, PortraitPos][] = [['piggy-1', 'happy', 'left'], ['piggy-2', 'neutral', 'center'], ['piggy-3', 'shy_blush', 'right']];

/** A world on a stage fitted to `fit`, the SS-10 trio shown (drawn from the stand-in atlas). */
function trioOn(fit: StageFit, reduce: boolean) {
  const w = new StageWorld();
  const rect = { left: 0, top: 0, right: fit.cssW, bottom: fit.cssH, width: fit.cssW, height: fit.cssH, x: 0, y: 0 };
  w.attach({ setActive() {}, bubblesChanged() {}, canvasRect: () => rect, hitAlpha: () => true } as never);
  w.setLayout(fit, false);
  w.setReduceMotion(reduce);
  for (const [pig, e, pos] of SS10) w.showPortrait(pig, e, pos);
  const s = w as unknown as { lineupK: number; portraitList: { ref: { atlas: string } }[] };
  for (const p of s.portraitList) p.ref = { ...p.ref, atlas: FAKE_ATLAS };
  return { w, s };
}

describe('the stage draws a lineup at its scale (world.ts, headless)', () => {
  test('SS-10: the trio on an iPhone portrait stage draws at 41/64, waists on the bottom edge, bubbles on the heads', async () => {
    const img = await fakeAtlas();
    expect(img).not.toBeNull();
    const fit = fitStage(393, 393, 3); // iPhone 15 Pro, T layout: the stage is about square
    expect(fit.lw).toBe(270);
    for (const reduce of [false, true]) {
      const { w, s } = trioOn(fit, reduce);
      w.update(16);
      expect(s.lineupK).toBe(41 / 64); // the first lineup on an empty stage is sized at once
      for (let i = 0; i < 20; i++) w.update(16); // all the way in (PORTRAIT_FADE)
      const { ctx, draws, state } = recorder();
      w.draw(ctx, recorder().ctx);
      const pigs = draws.filter((d) => d.img === img);
      expect(pigs).toHaveLength(3);
      for (const d of pigs) {
        // the whole 192x256 cell, resampled smoothly to 123x164 (whole pixels: 3 x 41, 4 x 41)
        expect([d.sw, d.sh, d.dw, d.dh, d.smooth]).toEqual([PORTRAIT_W, PORTRAIT_H, 123, 164, true]);
        // waist on the bottom edge as at full size (the art's foot margin under it); an idle bob lifts it 1 px
        expect(reduce ? [0] : [0, 1]).toContain(LOGICAL_H + PORTRAIT_SINK - (d.dy + d.dh));
      }
      expect(LOGICAL_H + PORTRAIT_SINK).toBe(278);
      expect(pigs.map((d) => d.dx + (d.dw >> 1))).toEqual([56, 135, 214]);
      expect(state.imageSmoothingEnabled).toBe(false); // nearest-neighbour again for everything after
      w.bubble('piggy-1', 'Please choose your Kempanion!');
      w.update(16);
      expect(w.bubbles.map((b) => [b.x, b.y])).toEqual([[56, portraitY(12, 41 / 64)]]);
      expect(portraitY(12, 41 / 64)).toBe(122);
    }
  });

  test('desktop and phone landscape (the 16:9 stage) still draw the trio full size, unsmoothed', async () => {
    const img = await fakeAtlas();
    for (const fit of [fitStage(1280, 720, 1), fitStage(852, 393, 3)]) {
      expect(fit.lw).toBe(480);
      const { w, s } = trioOn(fit, true);
      for (let i = 0; i < 20; i++) w.update(16);
      expect(s.lineupK).toBe(1);
      const { ctx, draws } = recorder();
      w.draw(ctx, recorder().ctx);
      expect(draws.filter((d) => d.img === img).map((d) => [d.dx, d.dy, d.dw, d.dh, d.smooth])).toEqual([
        [4, PORTRAIT_TOP, 192, 256, false], [144, PORTRAIT_TOP, 192, 256, false], [284, PORTRAIT_TOP, 192, 256, false],
      ]);
      w.bubble('piggy-3', 'Hi!');
      w.update(16);
      expect(w.bubbles.map((b) => [b.x, b.y])).toEqual([[380, PORTRAIT_TOP + 12]]);
    }
  });

  test('a lineup change steps the size like a slide; reduced motion and a resize size it at once', async () => {
    await fakeAtlas();
    const { w, s } = trioOn(fitStage(393, 393, 3), false);
    for (let i = 0; i < 20; i++) w.update(16);
    w.hidePortrait('piggy-2'); // left + right: 50/64
    const ks: number[] = [];
    for (let i = 0; i < 12; i++) {
      w.update(16);
      ks.push(s.lineupK);
    }
    expect(ks[0]).toBeGreaterThan(41 / 64);
    expect(ks[0]).toBeLessThan(50 / 64);
    expect(new Set(ks).size).toBeLessThanOrEqual(4); // in steps, like a portrait's slide
    for (let i = 1; i < ks.length; i++) expect(ks[i]).toBeGreaterThanOrEqual(ks[i - 1]);
    expect(ks.indexOf(50 / 64)).toBeGreaterThanOrEqual(0);
    expect(ks.indexOf(50 / 64)).toBeLessThan(10); // within PORTRAIT_FADE (150 ms of 16 ms frames)
    expect(ks[ks.length - 1]).toBe(50 / 64);
    w.setLayout(fitStage(1280, 720, 1), false); // a resize: no step
    w.update(16);
    expect(s.lineupK).toBe(1);
    const still = trioOn(fitStage(393, 393, 3), true);
    still.w.update(16);
    still.w.hidePortrait('piggy-2');
    still.w.update(16);
    expect(still.s.lineupK).toBe(50 / 64);
  });
});
