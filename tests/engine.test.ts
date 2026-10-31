import { describe, expect, test } from 'bun:test';
import { clipFinished, clipLength, frameIndexAt, frameIndexIntroLoop } from '../src/lib/engine/anim';
import { BAYER4, bayer, ditherStep } from '../src/lib/engine/dither';
import { gradePixels, luminance, synthNight } from '../src/lib/engine/grade';
import {
  bgCropX, clientToLogical, clientToStage, featuredPortrait, fitStage, logicalWidthFor, NARROW_W, PORTRAIT_H, PORTRAIT_TOP,
  portraitCenterX, portraitEnterDir, portraitVisible, stepped,
} from '../src/lib/engine/layout';
import { GOLDEN_REST_MS, GoldenPetals, type Golden } from '../src/lib/engine/fx';
import {
  bodyExtents, capSpeed, classifyDrop, DROP_RULES, FLIGHT, FLIGHT_REDUCED, HIT_CEILING, HIT_FLOOR, HIT_WALL, LANDED,
  launchBody, MAX_FLING, MAX_THROW, newFlightBody, PointerTrail, SETTLED, stepFlight, stepSpring, throwVelocity,
  tossVelocity, wrapAngle,
  type FlightBody, type FlightBounds,
} from '../src/lib/engine/physics';
import { gustWind, MAX_LANDED, PETAL_COUNTS, PetalSystem, petalCount, spawnBounds, spawnPetal, type Petal } from '../src/lib/engine/petals';
import { mulberry32 } from '../src/lib/engine/rng';
import { StageWorld } from '../src/lib/engine/world';
import { FRAME, PORTRAIT, resolveClip, resolvePortrait } from '../src/lib/engine/sprites';
import type { PortraitPos } from '../src/lib/engine/stage';
import { ALT_EXPRESSION_FALLBACK, EXPRESSIONS, PIG_IDS, type AnimId } from '../src/lib/types';
import {
  ALT_WIN, countToss, crumbSpots, GROUND_MIN, GROUND_T, GROUND_WS, groundFromBox, landingReaction, LIFT_FUN_COOLDOWN_MS,
  liftFunDue, outfitReaction, POUT_LINES, TICKLE_LINES, TOSS_LIMIT, TOSS_WINDOW_MS,
} from '../src/lib/ui/hub/hub';
import { hasClip, outfitHasClip } from '../src/lib/engine/sprites';

describe('logical width', () => {
  test('clamp(150, round(270 * aspect), 480)', () => {
    expect(logicalWidthFor(1920, 1080)).toBe(480);
    expect(logicalWidthFor(1440, 900)).toBe(432);
    expect(logicalWidthFor(800, 600)).toBe(360);
    expect(logicalWidthFor(390, 844)).toBe(150); // 124.8 → clamped
    expect(logicalWidthFor(360, 640)).toBe(152);
    expect(logicalWidthFor(844, 390)).toBe(480); // 584 → clamped
    expect(logicalWidthFor(1000, 1000)).toBe(270);
  });

  test('degenerate boxes fall back to full width', () => {
    expect(logicalWidthFor(0, 0)).toBe(480);
    expect(logicalWidthFor(100, 0)).toBe(480);
    expect(logicalWidthFor(NaN, 200)).toBe(480);
  });
});

describe('sharp-scaling fit', () => {
  test('exact integer multiples need no resampling', () => {
    const f = fitStage(1440, 810, 1);
    expect(f.lw).toBe(480);
    expect(f.u).toBe(3);
    expect(f.scale).toBe(3);
    expect([f.backingW, f.backingH]).toEqual([1440, 810]);
    expect([f.cssW, f.cssH, f.left, f.top]).toEqual([1440, 810, 0, 0]);
    expect(f.upscaled).toBe(false);
    expect(fitStage(1920, 1080, 1).scale).toBe(4);
    expect(fitStage(1440, 810, 2).scale).toBe(6);
  });

  test('phone stage upscales to the next integer multiple of the device pixels', () => {
    const f = fitStage(390, 219.375, 3);
    expect(f.lw).toBe(480);
    expect(f.u).toBeCloseTo(0.8125, 4);
    expect(f.scale).toBe(3); // 658 device px → 3 × 270 = 810, shrunk smoothly by CSS
    expect(f.backingH).toBeGreaterThanOrEqual(219.375 * 3);
  });

  test('aspect outside the clamp letterboxes and centers', () => {
    const wide = fitStage(2560, 810, 1);
    expect(wide.lw).toBe(480);
    expect(wide.cssW).toBe(1440);
    expect(wide.left).toBe(560);
    expect(wide.top).toBe(0);
    const tall = fitStage(300, 900, 1);
    expect(tall.lw).toBe(150);
    expect(tall.cssW).toBe(300);
    expect(tall.cssH).toBe(540);
    expect(tall.top).toBe(180);
  });

  test('rounding slack under a stage pixel fills the box', () => {
    const f = fitStage(360, 640, 2);
    expect(f.lw).toBe(152);
    expect(f.cssW).toBe(360);
    expect(f.cssH).toBe(640);
  });

  test('backing store is capped', () => {
    const f = fitStage(7680, 4320, 2);
    expect(f.backingW * f.backingH).toBeLessThanOrEqual(3840 * 2160);
    expect(f.upscaled).toBe(true);
  });
});

describe('background crop', () => {
  test('full width shows everything', () => {
    expect(bgCropX(480, 240)).toBe(0);
    expect(bgCropX(480, 400)).toBe(0);
  });

  test('narrow views keep focusX centered, clamped to the painting', () => {
    expect(bgCropX(150, 240)).toBe(165);
    expect(bgCropX(150, 330)).toBe(255);
    expect(bgCropX(150, 10)).toBe(0);
    expect(bgCropX(150, 470)).toBe(330);
    for (const focus of [0, 60, 240, 300, 480]) {
      for (const w of [150, 200, 270, 360, 432]) {
        const x = bgCropX(w, focus);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(480);
      }
    }
  });
});

describe('portrait slots', () => {
  const POS: PortraitPos[] = ['far-left', 'left', 'center', 'right', 'far-right'];

  test('slots are ordered left to right, center in the middle', () => {
    for (const lw of [270, 360, 432, 480]) {
      const xs = POS.map((p) => portraitCenterX(p, lw));
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
      expect(portraitCenterX('center', lw)).toBe(Math.round(lw / 2));
    }
    expect(portraitCenterX('left', 480)).toBe(100);
    expect(portraitCenterX('right', 480)).toBe(380);
  });

  test('narrow stages center everything and only show the featured portrait', () => {
    for (const p of POS) expect(portraitCenterX(p, 200)).toBe(100);
    expect(portraitVisible('piggy-1', NARROW_W - 1, 'piggy-2')).toBe(false);
    expect(portraitVisible('piggy-2', NARROW_W - 1, 'piggy-2')).toBe(true);
    expect(portraitVisible('piggy-1', NARROW_W, 'piggy-2')).toBe(true);
  });

  test('featured portrait: speaker, then last speaker, then newest', () => {
    const shown = [{ id: 'a', order: 1 }, { id: 'b', order: 3 }, { id: 'c', order: 2 }];
    expect(featuredPortrait(shown, 'c', 'a')).toBe('c');
    expect(featuredPortrait(shown, null, 'a')).toBe('a');
    expect(featuredPortrait(shown, 'z', 'y')).toBe('b');
    expect(featuredPortrait([{ id: 'a', order: 1, leaving: true }, { id: 'b', order: 0 }], 'a', null)).toBe('b');
    expect(featuredPortrait([], 'a', 'b')).toBeNull();
  });

  test('portraits are bottom anchored with a little cut off', () => {
    expect(PORTRAIT_TOP + PORTRAIT_H).toBeGreaterThanOrEqual(270);
    expect(PORTRAIT_TOP).toBeGreaterThan(0);
    expect(portraitEnterDir('left')).toBe(-1);
    expect(portraitEnterDir('far-right')).toBe(1);
    expect(portraitEnterDir('center')).toBe(0);
  });
});

describe('animation timing', () => {
  const D = [250, 180, 180, 250, 180, 180];

  test('frames follow per-frame durations', () => {
    expect(clipLength(D)).toBe(1220);
    expect(frameIndexAt(D, 0, true)).toBe(0);
    expect(frameIndexAt(D, 249, true)).toBe(0);
    expect(frameIndexAt(D, 250, true)).toBe(1);
    expect(frameIndexAt(D, 430, true)).toBe(2);
    expect(frameIndexAt(D, 1219, true)).toBe(5);
  });

  test('loops wrap, one-shots hold the last frame', () => {
    expect(frameIndexAt(D, 1220, true)).toBe(0);
    expect(frameIndexAt(D, 1220 + 250, true)).toBe(1);
    expect(frameIndexAt(D, 1220, false)).toBe(5);
    expect(frameIndexAt(D, 99_999, false)).toBe(5);
    expect(frameIndexAt(D, 1220 + 10, false, 2)).toBe(0);
    expect(frameIndexAt(D, 2440, false, 2)).toBe(5);
  });

  test('done after the requested cycles; odd inputs are safe', () => {
    expect(clipFinished(D, 1219)).toBe(false);
    expect(clipFinished(D, 1220)).toBe(true);
    expect(clipFinished(D, 2000, 2)).toBe(false);
    expect(frameIndexAt([], 100, true)).toBe(0);
    expect(frameIndexAt([0, 0], 100, true)).toBe(1);
    expect(frameIndexAt(D, -5, true)).toBe(0);
    expect(frameIndexAt(D, NaN, false)).toBe(0);
  });

  test('stepped progress', () => {
    expect(stepped(0, 4)).toBe(0);
    expect(stepped(0.01, 4)).toBe(0.25);
    expect(stepped(0.5, 4)).toBe(0.5);
    expect(stepped(0.51, 4)).toBe(0.75);
    expect(stepped(1, 4)).toBe(1);
  });
});

describe('sprites', () => {
  test('frame and portrait geometry', () => {
    expect([FRAME.w, FRAME.h, FRAME.pivotX, FRAME.pivotY]).toEqual([128, 128, 64, 114]);
    expect([PORTRAIT.w, PORTRAIT.h]).toEqual([192, 256]);
  });

  test('every pig resolves every expression in every outfit', () => {
    for (const pig of PIG_IDS) {
      for (const outfit of ['everyday', 'volleyball', 'scrubs', 'hoodie'] as const) {
        for (const e of EXPRESSIONS) {
          const r = resolvePortrait(pig, outfit, e);
          expect(r.atlas).toContain(pig);
          expect(r.x % 192).toBe(0);
          expect(r.y % 256).toBe(0);
        }
      }
    }
  });

  test('alt outfits map missing expressions through ALT_EXPRESSION_FALLBACK', () => {
    const r = resolvePortrait('piggy-1', 'volleyball', 'loving');
    expect(r.outfit).toBe('volleyball');
    expect(r.expression).toBe(ALT_EXPRESSION_FALLBACK.loving!);
    expect(resolvePortrait('piggy-2', 'scrubs', 'sleepy').expression).toBe(ALT_EXPRESSION_FALLBACK.sleepy!);
    expect(resolvePortrait('piggy-3', 'everyday', 'thinking').expression).toBe('thinking');
    // an outfit a pig does not own falls back to everyday
    expect(resolvePortrait('piggy-1', 'scrubs', 'happy').outfit).toBe('everyday');
  });

  test('Piggy 2 has distinct thinking and proud portraits in scrubs', () => {
    const thinking = resolvePortrait('piggy-2', 'scrubs', 'thinking');
    const proud = resolvePortrait('piggy-2', 'scrubs', 'proud');
    const confused = resolvePortrait('piggy-2', 'scrubs', 'confused');
    const happy = resolvePortrait('piggy-2', 'scrubs', 'happy');
    expect(thinking).toMatchObject({ outfit: 'scrubs', expression: 'thinking' });
    expect(proud).toMatchObject({ outfit: 'scrubs', expression: 'proud' });
    expect([thinking.x, thinking.y]).not.toEqual([proud.x, proud.y]);
    expect([thinking.x, thinking.y]).not.toEqual([confused.x, confused.y]);
    expect([proud.x, proud.y]).not.toEqual([happy.x, happy.y]);
  });

  test('clips fall back from the alt outfit to everyday, then to idle', () => {
    const own = resolveClip('piggy-2', 'scrubs', 'review_mri');
    expect(own.outfit).toBe('scrubs');
    expect(own.clip.frames).toBe(6);
    const borrowed = resolveClip('piggy-2', 'scrubs', 'eat');
    expect(borrowed.outfit).toBe('everyday');
    expect(borrowed.anim).toBe('eat');
    const left = resolveClip('piggy-3', 'hoodie', 'walk_left');
    expect(left.outfit).toBe('hoodie');
    expect(left.flip).toBe(false);
    const missing = resolveClip('piggy-1', 'everyday', 'typing');
    expect(missing.anim).toBe('idle');
    expect(missing.clip.durations.length).toBe(missing.clip.frames);
  });
});

describe('petals', () => {
  test('counts per level and layout, reduced motion caps', () => {
    expect(petalCount('normal', true, false)).toBe(28);
    expect(petalCount('normal', false, false)).toBe(16);
    expect(petalCount('off', true, false)).toBe(0);
    expect(petalCount('heavy', true, false)).toBeGreaterThan(petalCount('normal', true, false));
    expect(petalCount('light', false, false)).toBeLessThan(16);
    for (const level of Object.keys(PETAL_COUNTS) as (keyof typeof PETAL_COUNTS)[]) {
      expect(petalCount(level, true, true)).toBeLessThanOrEqual(4);
    }
    expect(petalCount('normal', true, false, 0.5)).toBe(14);
    expect(petalCount('normal', true, false, 0)).toBe(0);
  });

  test('spawn stays inside its bounds (above the top edge, upwind margin)', () => {
    const rng = mulberry32(42);
    const p = {} as Petal;
    for (const wind of [-35, 0, 35]) {
      for (const lw of [150, 270, 480]) {
        const b = spawnBounds(lw, 270, wind, false);
        expect(b.maxY).toBeLessThan(0);
        for (let i = 0; i < 300; i++) {
          spawnPetal(p, rng, lw, 270, 252, wind, false, false);
          expect(p.x).toBeGreaterThanOrEqual(b.minX);
          expect(p.x).toBeLessThanOrEqual(b.maxX);
          expect(p.y).toBeGreaterThanOrEqual(-12);
          expect(p.y).toBeLessThanOrEqual(-2);
          expect(p.fall).toBeGreaterThanOrEqual(10);
          expect(p.fall).toBeLessThanOrEqual(22);
          expect(Math.abs(p.drift)).toBeLessThanOrEqual(6);
          expect(p.swayA).toBeGreaterThanOrEqual(4);
          expect(p.swayA).toBeLessThanOrEqual(10);
          expect(p.landY).toBeGreaterThan(240);
        }
      }
    }
    const rightward = spawnBounds(480, 270, 35, false);
    expect(rightward.minX).toBeLessThan(spawnBounds(480, 270, 0, false).minX);
  });

  test('initial fill covers the screen', () => {
    const rng = mulberry32(7);
    const p = {} as Petal;
    let maxY = -Infinity;
    for (let i = 0; i < 200; i++) {
      spawnPetal(p, rng, 480, 270, 252, 0, true, false);
      maxY = Math.max(maxY, p.y);
      expect(p.y).toBeLessThanOrEqual(243);
    }
    expect(maxY).toBeGreaterThan(150);
  });

  test('gusts ramp up over 1.2 s and die down over 2 s', () => {
    expect(gustWind(-1, 35)).toBe(0);
    expect(gustWind(600, 35)).toBeCloseTo(17.5);
    expect(gustWind(1200, 35)).toBeCloseTo(35);
    expect(gustWind(2200, 35)).toBeCloseTo(17.5);
    expect(gustWind(3200, 35)).toBe(0);
  });

  test('simulation keeps petals in play and caps landings', () => {
    const sys = new PetalSystem(3);
    sys.configure({ level: 'heavy', lw: 480, h: 270, groundY: 252, large: true });
    expect(sys.active).toBe(48);
    for (let i = 0; i < 60 * 120; i++) sys.update(16);
    const on = sys.petals.filter((p) => p.on);
    expect(on.length).toBe(48);
    expect(on.filter((p) => p.landed).length).toBeLessThanOrEqual(MAX_LANDED);
    for (const p of on) {
      expect(p.y).toBeLessThan(280);
      expect(p.x).toBeGreaterThan(-120);
      expect(p.x).toBeLessThan(600);
    }
    sys.configure({ level: 'off' });
    expect(sys.petals.filter((p) => p.on).length).toBe(0);
  });
});

describe('dither & grading', () => {
  test('Bayer matrix is a permutation of 0..15', () => {
    expect([...BAYER4].sort((a, b) => a - b)).toEqual([...Array(16).keys()]);
    expect(bayer(4, 4)).toBe(bayer(0, 0));
    expect(ditherStep(0)).toBe(0);
    expect(ditherStep(0.5)).toBe(8);
    expect(ditherStep(1)).toBe(16);
  });

  const W = 16, H = 16;
  const img = (r: number, g: number, b: number) => {
    const d = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < d.length; i += 4) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    return d;
  };
  const avgLum = (d: Uint8ClampedArray) => {
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += luminance(d[i], d[i + 1], d[i + 2]);
    return s / (d.length / 4);
  };

  test('day is untouched; synthesized night is dark and blue', () => {
    const day = img(200, 190, 170);
    expect(gradePixels('day', day, null, W, H)).toEqual(day);
    const night = synthNight(day, W, H, new Uint8ClampedArray(day.length));
    expect(avgLum(night)).toBeLessThan(avgLum(day) * 0.5);
    expect(night[2]).toBeGreaterThan(night[0]);
    expect(night[3]).toBe(255);
  });

  test('painted night variant wins at night; evening sits between day and night', () => {
    const day = img(220, 200, 160);
    const paintedNight = img(30, 30, 80);
    expect(gradePixels('night', day, paintedNight, W, H)).toEqual(paintedNight);
    const evening = gradePixels('evening', day, paintedNight, W, H);
    expect(avgLum(evening)).toBeLessThan(avgLum(day));
    expect(avgLum(evening)).toBeGreaterThan(avgLum(paintedNight));
    const morning = gradePixels('morning', day, null, W, H);
    expect(avgLum(morning)).toBeLessThan(avgLum(day));
    expect(avgLum(morning)).toBeGreaterThan(avgLum(day) * 0.8);
  });
});

describe('client → logical', () => {
  test('maps the canvas rect and rejects points outside', () => {
    const rect = { left: 10, top: 20, width: 960, height: 540 };
    expect(clientToLogical(10, 20, rect, 480)).toEqual({ x: 0, y: 0 });
    expect(clientToLogical(490, 290, rect, 480)).toEqual({ x: 240, y: 135 });
    expect(clientToLogical(9, 100, rect, 480)).toBeNull();
    expect(clientToLogical(970, 100, rect, 480)).toBeNull();
    expect(clientToLogical(100, 100, { left: 0, top: 0, width: 0, height: 0 }, 480)).toBeNull();
  });
});

describe('client → stage (drags may leave the canvas)', () => {
  test('maps points outside the canvas instead of rejecting them', () => {
    const rect = { left: 10, top: 20, width: 960, height: 540 };
    const out = { x: 0, y: 0 };
    expect(clientToStage(490, 290, rect, 480, out)).toBe(true);
    expect(out).toEqual({ x: 240, y: 135 });
    expect(clientToStage(-90, 20 - 54, rect, 480, out)).toBe(true);
    expect(out.x).toBeCloseTo(-50);
    expect(out.y).toBeCloseTo(-27);
    expect(clientToStage(1, 1, { left: 0, top: 0, width: 0, height: 10 }, 480, out)).toBe(false);
    expect(clientToStage(NaN, 1, rect, 480, out)).toBe(false);
  });

  test('a pick-up keeps hold where the pointer pressed him, in stage px: grabbed by the tummy he rises with the first CSS px', () => {
    // the desktop hub's canvas: 1280 × 720 CSS px from y 40 for the 480 × 270 stage (2.67 CSS px a stage px), ground 221
    const w = new StageWorld();
    const rect = { left: 0, top: 40, right: 1280, bottom: 760, width: 1280, height: 720, x: 0, y: 40 };
    w.attach({ setActive() {}, bubblesChanged() {}, canvasRect: () => rect, hitAlpha: () => true } as never);
    w.setGroundY(221);
    w.spawnActor('pig', 'piggy-1', { x: 240 });
    const k = 1280 / 480;
    // pressed on his tummy: row 82 of the frame his feet stand in at row FRAME.pivotY (he hangs from row 6)
    const px = 240 * k;
    const py = 40 + (221 - FRAME.pivotY + 82) * k;
    expect(w.holdActor('pig', px, py)).toBe(true);
    const air = (w as unknown as { actors: Map<string, { air: { hand: { y: number }; fit: number } }> }).actors.get('pig')!.air;
    const head = 221 - FRAME.pivotY + 6;
    expect(air.hand.y).toBeCloseTo(head, 6);
    // (it used to take 160-210 CSS px of drag before he left the floor at all)
    for (const css of [1, 3, 8, 40]) {
      w.moveHeld(px, py - css);
      w.update(16);
      expect(head - air.hand.y).toBeCloseTo(css / k, 6);
    }
    // up past the canvas top: his grab point stops at the stage top, and he hangs there unsquashed
    w.moveHeld(px, 0);
    for (let i = 0; i < 60; i++) w.update(16);
    expect(air.hand.y).toBe(2);
    expect(air.fit).toBe(0);
  });
});

describe('held clip timing (intro frame, then loop)', () => {
  const D = [100, 120, 120, 120, 120, 150];
  test('first frame plays once, frames 1..5 loop', () => {
    expect(frameIndexIntroLoop(D, 0, 1)).toBe(0);
    expect(frameIndexIntroLoop(D, 99, 1)).toBe(0);
    expect(frameIndexIntroLoop(D, 100, 1)).toBe(1);
    expect(frameIndexIntroLoop(D, 100 + 630 - 1, 1)).toBe(5);
    expect(frameIndexIntroLoop(D, 100 + 630, 1)).toBe(1); // wraps to the loop start, never back to 0
    expect(frameIndexIntroLoop(D, 100 + 630 * 7 + 125, 1)).toBe(2);
  });
  test('degenerate intros behave like a plain loop', () => {
    expect(frameIndexIntroLoop(D, 1220 % 730, 0)).toBe(frameIndexAt(D, 1220 % 730, true));
    expect(frameIndexIntroLoop(D, 500, 6)).toBe(frameIndexAt(D, 500, true));
    expect(frameIndexIntroLoop([], 50, 1)).toBe(0);
    expect(frameIndexIntroLoop(D, NaN, 1)).toBe(0);
  });
});

describe('pick-up physics: helpers', () => {
  test('wrapAngle lands in (−π, π]', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(Math.PI * 3.5)).toBeCloseTo(-Math.PI / 2);
    expect(wrapAngle(-7)).toBeCloseTo(-7 + Math.PI * 2);
    expect(wrapAngle(NaN)).toBe(0);
  });

  test('throw-velocity capping keeps the direction', () => {
    const out = { vx: 0, vy: 0 };
    capSpeed(3000, -4000, 1000, out);
    expect(Math.hypot(out.vx, out.vy)).toBeCloseTo(1000);
    expect(out.vx / out.vy).toBeCloseTo(3000 / -4000);
    capSpeed(30, 40, 1000, out);
    expect(out).toEqual({ vx: 30, vy: 40 });
    capSpeed(Infinity, 5, 1000, out);
    expect(out).toEqual({ vx: 0, vy: 0 });
  });

  test('springs settle on their target', () => {
    const s = { value: 0.3, vel: 0 };
    let overshoot = false;
    for (let i = 0; i < 120; i++) {
      stepSpring(s, 16, 0, 700, 16);
      if (s.value < -0.01) overshoot = true;
    }
    expect(overshoot).toBe(true); // a little bounce back
    expect(Math.abs(s.value)).toBeLessThan(0.005);
  });

  test('rotated body extents', () => {
    const e = { ex: 0, ey: 0 };
    bodyExtents(0, FLIGHT, e);
    expect([e.ex, e.ey]).toEqual([FLIGHT.halfW, FLIGHT.halfH]);
    bodyExtents(Math.PI / 2, FLIGHT, e);
    expect(e.ex).toBeCloseTo(FLIGHT.halfH);
    expect(e.ey).toBeCloseTo(FLIGHT.halfW);
  });
});

describe('pick-up physics: flight', () => {
  const B: FlightBounds = { left: 0, right: 480, top: 0, floor: 220 };
  const run = (b: FlightBody, ms: number, bounds = B, p = FLIGHT, step = 16) => {
    let ev = 0;
    for (let t = 0; t < ms; t += step) ev |= stepFlight(b, step, bounds, p);
    return ev;
  };

  test('gravity: free fall from rest follows ½·g·t²', () => {
    const b = launchBody(newFlightBody(), 240, 60, 0, 0); // body top (60 − halfH) is inside the stage
    const bounds = { ...B, floor: 10_000 };
    for (let i = 0; i < 25; i++) stepFlight(b, 20, bounds); // 0.5 s
    expect(b.vy).toBeCloseTo(FLIGHT.gravity * 0.5, 0);
    expect(b.y - 60).toBeCloseTo(0.5 * FLIGHT.gravity * 0.25, -1);
    expect(b.x).toBe(240);
  });

  test('floor bounce keeps 35% of the impact speed, then comes to rest', () => {
    const fall = 90; // feet 90 px above the floor
    const b = launchBody(newFlightBody(), 240, B.floor - FLIGHT.halfH - fall, 0, 0);
    let ev = 0;
    let firstBounceVy = 0;
    for (let i = 0; i < 400 && !(ev & LANDED); i++) {
      const e = stepFlight(b, 4, B);
      if (e & HIT_FLOOR && !firstBounceVy) firstBounceVy = b.vy;
      ev |= e;
    }
    const impact = Math.sqrt(2 * FLIGHT.gravity * fall);
    expect(b.impact).toBeGreaterThan(impact * 0.95);
    expect(b.impact).toBeLessThan(impact * 1.05);
    expect(firstBounceVy).toBeCloseTo(-b.impact * FLIGHT.restitution, 0);
    expect(b.bounces).toBeGreaterThanOrEqual(1);
    expect(b.bounces).toBeLessThanOrEqual(FLIGHT.maxBounces);
    expect(ev & LANDED).toBeTruthy();
    expect(b.grounded).toBe(true);
    expect(b.y + FLIGHT.halfH).toBeCloseTo(B.floor);
  });

  test('a soft put-down does not bounce', () => {
    const b = launchBody(newFlightBody(), 240, B.floor - FLIGHT.halfH - 4, 0, 0);
    const ev = run(b, 400);
    expect(ev & LANDED).toBeTruthy();
    expect(b.bounces).toBe(0);
    expect(ev & SETTLED).toBeTruthy();
  });

  test('walls bounce with restitution and the body never leaves the stage', () => {
    const b = launchBody(newFlightBody(), 400, 100, 1000, -100);
    let hit = 0;
    const e = { ex: 0, ey: 0 };
    for (let i = 0; i < 300; i++) {
      const before = b.vx;
      const ev = stepFlight(b, 16, B);
      if (ev & HIT_WALL && !hit) {
        hit = 1;
        expect(Math.sign(b.vx)).toBe(-Math.sign(before));
      }
      bodyExtents(b.angle, FLIGHT, e);
      expect(b.x - e.ex).toBeGreaterThanOrEqual(B.left - 1e-9);
      expect(b.x + e.ex).toBeLessThanOrEqual(B.right + 1e-9);
      expect(b.y + e.ey).toBeLessThanOrEqual(B.floor + 1e-9);
    }
    expect(hit).toBe(1);
    expect(b.walls).toBeGreaterThan(0);
    expect(b.wallImpact).toBeGreaterThan(800);
  });

  test('a hard upward throw bonks the stage top and counts as hard', () => {
    const b = launchBody(newFlightBody(), 240, 150, 0, -1000);
    const ev = run(b, 3000);
    expect(ev & HIT_CEILING).toBeTruthy();
    expect(b.ceiling).toBe(1);
    expect(b.grounded).toBe(true);
    expect(classifyDrop({ vx: 0, vy: -1000, impact: b.impact, wallImpact: 0, ceiling: b.ceiling })).toBe('hard');
  });

  test('edge clamping: random throws and frame times stay inside the box', () => {
    let seed = 7;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const e = { ex: 0, ey: 0 };
    for (let k = 0; k < 60; k++) {
      const bounds = { left: 0, right: 150 + rnd() * 330, top: 0, floor: 180 + rnd() * 72 };
      const b = launchBody(newFlightBody(), bounds.right / 2, 120, (rnd() - 0.5) * 2 * MAX_THROW, (rnd() - 0.5) * 2 * MAX_THROW, rnd() * 6, (rnd() - 0.5) * 18);
      for (let i = 0; i < 200; i++) {
        stepFlight(b, rnd() * 120, bounds);
        bodyExtents(b.angle, FLIGHT, e);
        expect(b.x - e.ex).toBeGreaterThanOrEqual(bounds.left - 1e-6);
        expect(b.x + e.ex).toBeLessThanOrEqual(bounds.right + 1e-6);
        expect(b.y + e.ey).toBeLessThanOrEqual(bounds.floor + 1e-6);
        expect(Number.isFinite(b.x) && Number.isFinite(b.y)).toBe(true);
      }
      expect(b.grounded).toBe(true); // 200 frames is plenty to land
    }
  });

  test('a stage narrower than the body pins it to the middle', () => {
    const b = launchBody(newFlightBody(), 10, 100, 500, 0);
    stepFlight(b, 16, { left: 0, right: 40, top: 0, floor: 220 });
    expect(b.x).toBe(20);
    expect(b.vx).toBe(0);
  });

  test('landing on its side: the body rights itself and settles', () => {
    const b = launchBody(newFlightBody(), 240, 120, 200, 0, 2.5, 4);
    let ev = 0;
    for (let i = 0; i < 200; i++) ev |= stepFlight(b, 16, B);
    expect(ev & LANDED).toBeTruthy();
    expect(ev & SETTLED).toBeTruthy();
    expect(Math.abs(b.angle)).toBeLessThan(0.03);
    expect(Math.abs(b.vx)).toBeLessThan(FLIGHT.settleSpeed);
    expect(b.y + FLIGHT.halfH).toBeCloseTo(B.floor);
  });

  test('reduced motion: no bounce', () => {
    const b = launchBody(newFlightBody(), 240, 40, 0, 0);
    run(b, 2000, B, FLIGHT_REDUCED);
    expect(b.bounces).toBe(0);
    expect(b.grounded).toBe(true);
  });

  test('odd frame times are safe', () => {
    const b = launchBody(newFlightBody(), 240, 100, 0, 0);
    expect(stepFlight(b, NaN, B)).toBe(0);
    expect(stepFlight(b, -5, B)).toBe(0);
    stepFlight(b, 10_000, B); // clamped to 100 ms
    expect(b.vy).toBeCloseTo(FLIGHT.gravity * 0.1, 0);
  });
});

describe('pick-up physics: throw velocity', () => {
  const out = { vx: 0, vy: 0 };

  test('from the samples of the last ~80 ms', () => {
    const tr = new PointerTrail(8);
    // 200 px/s right, then 600 px/s up-right for the last 64 ms
    for (let i = 0; i <= 10; i++) tr.push(i * 16, i * 3.2, 100);
    for (let i = 1; i <= 4; i++) tr.push(160 + i * 16, 32 + i * 9.6, 100 - i * 9.6);
    throwVelocity(tr, 224, out);
    expect(out.vx).toBeGreaterThan(350);
    expect(out.vx).toBeLessThan(620);
    expect(out.vy).toBeLessThan(-350);
  });

  test('stopping before letting go throws nothing; one sample is not enough', () => {
    const tr = new PointerTrail(8);
    tr.push(0, 0, 0);
    tr.push(16, 10, 0);
    expect(throwVelocity(tr, 16 + 200, out)).toEqual({ vx: 0, vy: 0 });
    const one = new PointerTrail(8);
    one.push(0, 5, 5);
    expect(throwVelocity(one, 0, out)).toEqual({ vx: 0, vy: 0 });
  });

  test('a lone recent sample pairs with the previous one when it is not stale', () => {
    const tr = new PointerTrail(8);
    tr.push(0, 0, 0);
    tr.push(100, 50, 0);
    throwVelocity(tr, 100, out);
    expect(out.vx).toBeCloseTo(500);
    const stale = new PointerTrail(8);
    stale.push(0, 0, 0);
    stale.push(400, 50, 0);
    expect(throwVelocity(stale, 400, out)).toEqual({ vx: 0, vy: 0 });
  });

  test('capped at MAX_THROW', () => {
    const tr = new PointerTrail(8);
    tr.push(0, 0, 0);
    tr.push(16, 400, 0);
    throwVelocity(tr, 16, out);
    expect(Math.hypot(out.vx, out.vy)).toBeCloseTo(MAX_THROW);
  });

  test('the ring buffer keeps the newest samples and monotonic time', () => {
    const tr = new PointerTrail(4);
    for (let i = 0; i < 10; i++) tr.push(i * 10, i, 0);
    expect(tr.length).toBe(4);
    expect(tr.x[tr.index(0)]).toBe(9);
    expect(tr.x[tr.index(3)]).toBe(6);
    tr.push(50, 10, 0); // out-of-order stamp is clamped forward
    expect(tr.t[tr.index(0)]).toBe(90);
    tr.push(NaN, 1, 1);
    expect(tr.x[tr.index(0)]).toBe(10);
    tr.clear();
    expect(tr.length).toBe(0);
  });
});

// The held swing (string pendulum, whirling) has its own suite: tests/swing.test.ts.
describe('pick-up physics: landings', () => {
  test('landing kinds', () => {
    const k = (vx: number, vy: number, impact: number, wallImpact = 0, ceiling = 0) => classifyDrop({ vx, vy, impact, wallImpact, ceiling });
    expect(k(0, 0, 60)).toBe('soft'); // set down gently
    expect(k(40, 30, 140)).toBe('soft');
    expect(k(0, 0, 250)).toBe('drop'); // let go from a little height
    expect(k(300, 0, 140)).toBe('drop'); // tossed sideways, low
    expect(k(0, 0, 420)).toBe('hard'); // high drop
    expect(k(900, 0, 100)).toBe('hard'); // fast throw
    expect(k(200, 0, 100, 500)).toBe('hard'); // into a wall
    expect(k(0, -300, 380)).toBe('pop'); // a gentle flick up
    expect(k(100, -260, 300)).toBe('pop');
    expect(k(500, -260, 300)).toBe('drop'); // too sideways for a pop
    expect(k(0, -300, 380, 0, 1)).toBe('hard'); // bonked the top
  });

  test('a release is judged on the hand’s throw plus only the swing beyond a dangling sway', () => {
    const t = (hvx: number, hvy: number, svx: number, svy: number) => tossVelocity(hvx, hvy, svx, svy, { vx: 0, vy: 0 });
    expect(t(0, 0, 0, 0)).toEqual({ vx: 0, vy: 0 });
    // set down mid-sway after a brisk carry: his own swing alone is no throw
    expect(t(10, 0, -(DROP_RULES.swaySpeed - 50), 40)).toEqual({ vx: 10, vy: 0 });
    expect(classifyDrop({ ...t(0, 0, 280, 0), impact: 80, wallImpact: 0, ceiling: 0 })).toBe('soft');
    expect(classifyDrop({ vx: 280, vy: 0, impact: 80, wallImpact: 0, ceiling: 0 })).toBe('drop'); // the whole swing would count
    // only the part beyond the sway counts, along his own direction
    const v = t(0, 0, -(DROP_RULES.swaySpeed + 500), 0);
    expect(v.vx).toBeCloseTo(-500, 6);
    expect(v.vy).toBe(0);
    // a fast whirl still lands hard; the total stays capped and non-finite input counts as nothing
    expect(classifyDrop({ ...t(0, 0, 0, 1300), impact: 80, wallImpact: 0, ceiling: 0 })).toBe('hard');
    const big = t(1400, 0, 1400, 0);
    expect(Math.hypot(big.vx, big.vy)).toBeLessThanOrEqual(MAX_FLING + 1e-9);
    expect(t(NaN, 0, 0, 0)).toEqual({ vx: 0, vy: 0 });
  });
});

describe('golden petals rest on the ground line', () => {
  test('they land at the floor, twinkle, then count as missed', () => {
    const g = new GoldenPetals();
    const missed: Golden[] = [];
    const p = g.spawn(() => {}, null, 100)!;
    let landedAt = -1;
    for (let t = 0; t < 30_000 && p.on; t += 50) {
      g.update(50, 480, 270, missed, 201);
      if (p.landed >= 0 && landedAt < 0) landedAt = t;
      expect(p.y).toBeLessThanOrEqual(201);
    }
    expect(landedAt).toBeGreaterThan(0);
    expect(missed).toEqual([p]);
    expect(g.hit(g.posX(p), p.y, 4)).toBeNull();
    expect(GOLDEN_REST_MS).toBeGreaterThan(300);
  });
});

describe('hub pick-up & toss rules', () => {
  test('ground line: on the VN box top edge in W/S, near the bottom in T, sane fallbacks', () => {
    expect(groundFromBox(226.4)).toBe(224);
    expect(groundFromBox(null)).toBe(GROUND_WS);
    expect(groundFromBox(NaN)).toBe(GROUND_WS);
    expect(groundFromBox(400)).toBe(GROUND_T);
    expect(groundFromBox(40)).toBe(GROUND_MIN);
    // the whole 100 px pig fits above the fallback box line
    expect(GROUND_WS - 102).toBeGreaterThan(0);
  });

  test('crumbs lie around the ground line', () => {
    for (const g of [GROUND_T, GROUND_WS, 224]) {
      for (const c of crumbSpots(5, 1234, g)) {
        const y = (c.y / 100) * 270;
        expect(y).toBeGreaterThanOrEqual(g - 20 - 1e-9);
        expect(y).toBeLessThanOrEqual(g + 2 + 1e-9);
      }
    }
    expect(crumbSpots(3, 42)).toEqual(crumbSpots(3, 42, GROUND_T)); // default unchanged
  });

  test('more than 5 tosses in 20 s is spam; older tosses fall out of the window', () => {
    const list: number[] = [];
    for (let i = 0; i < TOSS_LIMIT; i++) expect(countToss(list, 1000 + i * 1000)).toBe(false);
    expect(countToss(list, 1000 + TOSS_LIMIT * 1000)).toBe(true);
    const slow: number[] = [];
    for (let i = 0; i < 20; i++) expect(countToss(slow, i * (TOSS_WINDOW_MS / 4))).toBe(false);
    expect(slow.length).toBeLessThanOrEqual(TOSS_LIMIT);
    const warped = [50_000, 60_000];
    countToss(warped, 1000); // clock went backwards: stale entries are dropped
    expect(warped).toEqual([1000]);
  });

  test('pick-up fun: at most once every 2 minutes', () => {
    expect(liftFunDue(0, 5_000)).toBe(true);
    expect(liftFunDue(10_000, 10_000 + LIFT_FUN_COOLDOWN_MS - 1)).toBe(false);
    expect(liftFunDue(10_000, 10_000 + LIFT_FUN_COOLDOWN_MS)).toBe(true);
    expect(liftFunDue(10_000, 5_000)).toBe(true); // clock warped back
  });

  test('landing reactions use clips every everyday set has', () => {
    for (const kind of ['soft', 'drop', 'hard', 'pop'] as const) {
      const r = landingReaction(kind);
      expect(r.steps.length).toBeGreaterThan(0);
      for (const pig of PIG_IDS) for (const s of r.steps) expect(hasClip(pig, 'everyday', s.anim)).toBe(true);
    }
    expect(landingReaction('hard').steps.map((s) => s.anim)).toEqual(['tumble', 'laugh']);
    expect(landingReaction('soft').burst).toBe('hearts');
  });

  test('alternate outfits react with their own clips', () => {
    const outfits = { 'piggy-1': 'volleyball', 'piggy-2': 'scrubs', 'piggy-3': 'hoodie' } as const;
    for (const pig of PIG_IDS) {
      const has = (a: AnimId) => outfitHasClip(pig, outfits[pig], a);
      expect(has(ALT_WIN[pig])).toBe(true);
      for (const kind of ['soft', 'drop', 'hard', 'pop'] as const) {
        for (const s of landingReaction(kind).steps) {
          const a = outfitReaction(s.anim, has, ALT_WIN[pig]);
          expect(a).not.toBeNull();
          expect(has(a!)).toBe(true);
        }
      }
      expect(outfitReaction('celebrate', has, ALT_WIN[pig])).toBe(ALT_WIN[pig]);
      expect(outfitReaction('angry', has, ALT_WIN[pig])).toBeNull(); // the pout borrows the everyday clip
    }
    expect(outfitReaction('happy', () => true, 'jump')).toBe('happy');
  });

  test('every pig has three pout lines and some giggles', () => {
    for (const pig of PIG_IDS) {
      expect(POUT_LINES[pig]).toHaveLength(3);
      expect(new Set(POUT_LINES[pig]).size).toBe(3);
      expect(TICKLE_LINES[pig].length).toBeGreaterThan(0);
      for (const l of [...POUT_LINES[pig], ...TICKLE_LINES[pig]]) expect(l.length).toBeLessThan(120);
    }
  });

  test("'held' clips follow the contract: 6 looping frames (sets without one get posed fallback frames)", () => {
    for (const pig of PIG_IDS) {
      for (const outfit of ['everyday', ({ 'piggy-1': 'volleyball', 'piggy-2': 'scrubs', 'piggy-3': 'hoodie' } as const)[pig]] as const) {
        if (!outfitHasClip(pig, outfit, 'held')) continue; // the engine falls back to posed frames
        const r = resolveClip(pig, outfit, 'held');
        expect(r.anim).toBe('held');
        expect(r.clip.frames).toBe(6);
        expect(r.clip.loop).toBe(true);
      }
    }
  });
});
