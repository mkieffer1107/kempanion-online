// CGs on narrow stages (QA WS-01): the canvas crops a 480x270 CG to the stage's logical width, so the runner mirrors
// the CG into cgView and CgOverlay.svelte shows the whole picture over the stage. The store, its pure helpers (when
// the overlay shows, how it fits, how it fades, how it replays the [shake] and [flash] it covers) and the
// runner/Scene wiring.
import { plugin } from 'bun';
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileModule } from 'svelte/compiler';
import { ditherStep } from '../src/lib/engine/dither';
import { stepped } from '../src/lib/engine/layout';
import { mulberry32 } from '../src/lib/engine/rng';

// cg-view is a Svelte rune module (.svelte.ts): compile it the way Vite does.
plugin({
  name: 'svelte-rune-modules',
  setup(build) {
    build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text());
      return { contents: compileModule(js, { filename: path, generate: 'client' }).js.code, loader: 'js' };
    });
  },
});
const {
  addShake, BACKDROP_ALPHA, CG_FADE_MS, CG_FADE_REDUCED_MS, CgFade, cgCropped, cgView, fitCg, FLASH_MS, fxBorder, fxFlash,
  fxLive, fxShake, fxTrauma, NO_FX, overlayFlash, SHAKE_BORDER_COLOR, SHAKE_BORDER_PX, stageToCss,
} = await import('../src/lib/vn/cg-view.svelte');

const read = (path: string) => readFileSync(join(import.meta.dir, '..', path), 'utf8');

/** A 2D context that records drawImage and fillRect (with the fill and opacity in force) and ignores everything else. */
function recorder() {
  const draws: { img: unknown; sx: number; sw: number; dw: number }[] = [];
  const fills: { x: number; y: number; w: number; h: number; fill: unknown; alpha: unknown }[] = [];
  const state: Record<string | symbol, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get: (t, k) => {
      if (k === 'drawImage') {
        return (img: unknown, sx: number, _sy: number, sw: number, _sh: number, _dx: number, _dy: number, dw: number) =>
          draws.push({ img, sx, sw, dw });
      }
      if (k === 'fillRect') {
        return (x: number, y: number, w: number, h: number) => fills.push({ x, y, w, h, fill: t.fillStyle, alpha: t.globalAlpha });
      }
      return k in t ? t[k] : () => {};
    },
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, draws, fills };
}

describe('cgView store', () => {
  test('starts empty and holds the CG id', () => {
    expect(cgView.id).toBeNull();
    cgView.id = 'cg_trio_key_visual';
    expect(cgView.id).toBe('cg_trio_key_visual');
    cgView.id = null;
    expect(cgView.id).toBeNull();
  });
});

describe('cgCropped', () => {
  test('portrait stages crop, 16:9 and edge-pixel crops do not', () => {
    expect(cgCropped(480)).toBe(false); // W, phone landscape
    expect(cgCropped(470)).toBe(false); // 5 columns a side: not worth bars
    expect(cgCropped(469)).toBe(true);
    expect(cgCropped(352)).toBe(true); // small phone landscape (553x375)
    expect(cgCropped(270)).toBe(true); // T: portrait phones and tablets
    expect(cgCropped(150)).toBe(true);
  });
});

describe('fitCg', () => {
  test('portrait phone: full width, centred, integer upscale shrunk smoothly', () => {
    const f = fitCg(393, 393, 3); // iPhone 15 Pro
    expect(f.width).toBe(393);
    expect(f.height).toBe(221); // 393 * 9/16 = 221.06, on the 1/3 px grid
    expect(f.left).toBe(0);
    expect(f.top).toBe(86);
    expect(f.top + f.height / 2).toBeCloseTo(393 / 2, 0);
    expect(f.scale).toBe(3); // 1179 device px: 3x (1440) covers it
    expect([f.backingW, f.backingH]).toEqual([1440, 810]);
    expect(f.pixelated).toBe(false);
  });

  test('an exact integer scale is drawn pixelated', () => {
    const f = fitCg(720, 720, 2); // iPad Mini portrait: 1440 device px = 3 x 480
    expect([f.width, f.height, f.top]).toEqual([720, 405, 157.5]);
    expect(f.scale).toBe(3);
    expect(f.pixelated).toBe(true);
  });

  test('positions sit on device pixels', () => {
    for (const [w, h, dpr] of [[375, 375, 2], [412, 412, 2.625], [489, 375, 2], [393, 393, 3], [375, 375, 1]]) {
      const f = fitCg(w, h, dpr);
      for (const v of [f.left, f.top, f.width, f.height]) expect(Math.abs(v * dpr - Math.round(v * dpr))).toBeLessThan(1e-6);
      expect(Math.abs(f.width - w)).toBeLessThanOrEqual(0.5 / dpr + 1e-9); // full width, to the nearest device pixel
      expect(f.top).toBeGreaterThan(0);
      expect(f.backingW).toBeGreaterThanOrEqual(f.width * dpr);
    }
  });

  test('1x screens shrink the 480-wide picture smoothly', () => {
    const f = fitCg(375, 375, 1);
    expect(f.scale).toBe(1);
    expect(f.pixelated).toBe(false);
  });

  test('a box wider than 16:9 fits the height, centred', () => {
    const f = fitCg(1000, 270, 1);
    expect(f.height).toBe(270);
    expect(f.width).toBe(480);
    expect(f.left).toBe(260);
    expect(f.top).toBe(0);
    expect(f.pixelated).toBe(true);
  });

  test('the backing store stays within 4K (then CSS stretches it, pixelated)', () => {
    const f = fitCg(4000, 4000, 2);
    expect(f.backingW * f.backingH).toBeLessThanOrEqual(3840 * 2160);
    expect(f.scale).toBe(8);
    expect(f.pixelated).toBe(true);
  });

  test('an empty box does not break', () => {
    const f = fitCg(0, 0, 0);
    expect([f.width, f.height, f.scale]).toEqual([0, 0, 1]);
  });
});

describe('CgFade (the canvas rules, world.ts showCG)', () => {
  test('fades a picture in over CG_FADE_MS, the backdrop ahead of it', () => {
    const f = new CgFade<string>();
    expect(f.visible).toBe(false);
    expect(f.show('a', 'A')).toBe(true);
    expect(f.visible).toBe(false); // nothing drawn before the first frame
    f.tick(CG_FADE_MS / 4);
    expect(f.p).toBeCloseTo(0.25);
    expect(f.backdrop).toBeCloseTo(0.5);
    expect(f.visible).toBe(true);
    f.tick(CG_FADE_MS / 4);
    expect(f.p).toBeCloseTo(0.5);
    expect(f.backdrop).toBe(1); // dark by halfway
    f.tick(CG_FADE_MS / 2);
    expect(f.p).toBe(1);
    expect(f.animating).toBe(false);
    expect(f.backdrop).toBe(1);
  });

  test('showing the picture already up is a no-op', () => {
    const f = new CgFade<string>();
    f.show('a', 'A');
    f.finish();
    expect(f.show('a', 'A')).toBe(false);
    expect(f.animating).toBe(false);
  });

  test('a new picture fades in over the old one, which stays until it is in', () => {
    const f = new CgFade<string>();
    f.show('a', 'A');
    f.finish();
    f.show('b', 'B');
    expect(f.prev?.id).toBe('a');
    expect(f.cur?.id).toBe('b');
    f.tick(100);
    expect(f.backdrop).toBe(1); // no dip between pictures
    f.tick(CG_FADE_MS);
    expect(f.prev).toBeNull();
    expect(f.cur?.id).toBe('b');
  });

  test('hide fades out and lets go of the picture', () => {
    const f = new CgFade<string>();
    f.show('a', 'A');
    f.finish();
    f.hide();
    f.tick(CG_FADE_MS / 4);
    expect(f.p).toBeCloseTo(0.75);
    expect(f.backdrop).toBe(1); // stays dark while the picture dithers out, then lifts
    f.tick(CG_FADE_MS / 2);
    expect(f.p).toBeCloseTo(0.25);
    expect(f.backdrop).toBeCloseTo(0.5);
    f.tick(CG_FADE_MS);
    expect(f.cur).toBeNull();
    expect(f.visible).toBe(false);
    expect(f.backdrop).toBe(0);
    expect(f.animating).toBe(false);
  });

  test('hide mid fade-in turns around from where it is', () => {
    const f = new CgFade<string>();
    f.show('a', 'A');
    f.tick(CG_FADE_MS / 2);
    f.hide();
    f.tick(CG_FADE_MS / 4);
    expect(f.p).toBeCloseTo(0.25);
    f.tick(CG_FADE_MS / 4);
    expect(f.cur).toBeNull();
  });

  test('showing during a fade-out keeps the fading picture underneath; after a full fade-out it does not', () => {
    const f = new CgFade<string>();
    f.show('a', 'A');
    f.finish();
    f.hide();
    f.tick(CG_FADE_MS / 2);
    f.show('b', 'B');
    expect(f.prev?.id).toBe('a');
    f.finish();
    f.hide();
    f.finish();
    f.show('c', 'C');
    expect(f.prev).toBeNull();
    expect(f.backdrop).toBe(0);
  });

  test('reduced motion: a shorter fade', () => {
    const f = new CgFade<string>();
    f.show('a', 'A');
    f.tick(CG_FADE_REDUCED_MS, true);
    expect(f.p).toBe(1);
    expect(f.animating).toBe(false);
  });

  test('hide with nothing up does nothing', () => {
    const f = new CgFade<string>();
    f.hide();
    expect(f.animating).toBe(false);
    f.tick(16);
    expect(f.visible).toBe(false);
  });
});

describe('[shake] and [flash] on the picture (world.ts rules)', () => {
  const r6 = (vs: number[]) => vs.map((v) => +v.toFixed(6));

  test('the store mirrors stage.shake / stage.flash, defaults included, stamped with the time', () => {
    cgView.fx = NO_FX;
    cgView.shake(undefined, undefined, 1000); // [shake]
    expect(cgView.fx).toMatchObject({ trauma: 0.5, decay: 1.6, shakeAt: 1000 });
    cgView.flash(undefined, undefined, 1010); // [flash]
    expect(cgView.fx).toMatchObject({ color: '#ffffff', ms: 160, flashAt: 1010, trauma: 0.5, shakeAt: 1000 });
    cgView.shake(0.7, 300, 1020); // [shake 0.7 300]: the flash stays
    expect(cgView.fx).toMatchObject({ flashAt: 1010, shakeAt: 1020 });
    cgView.flash('#ff0000', 300, 1030); // [flash #ff0000 300]
    expect(cgView.fx).toMatchObject({ color: '#ff0000', ms: 300, flashAt: 1030, shakeAt: 1020 });
    cgView.fx = NO_FX;
  });

  test('trauma adds up, tops out at 1 and settles over the shake’s ms', () => {
    const fx = addShake(NO_FX, 0.7, 300, 0);
    expect(fx.trauma).toBe(0.7);
    expect(fxTrauma(fx, 150)).toBeCloseTo(0.35, 9);
    expect(fxTrauma(fx, 300)).toBeCloseTo(0, 9);
    expect(fxTrauma(fx, 400)).toBe(0);
    const again = addShake(fx, 0.7, 300, 150); // 0.35 left + 0.7, capped
    expect(again.trauma).toBe(1);
    expect(fxTrauma(again, 100)).toBe(1); // a frame stamped before the shake sees it whole
    expect(fxTrauma(again, 450)).toBeCloseTo(0, 9); // settles over its own ms
    expect(addShake(NO_FX, 0.5, undefined, 0).decay).toBe(1.6); // no ms: the default drain
    expect(addShake(NO_FX, 0.05, 1000, 0).decay).toBe(0.2); // a faint, long shake drains no slower than this
    expect(fxTrauma(NO_FX, 0)).toBe(0);
  });

  test('the picture moves whole stage px within ±6·trauma², and not at all with reduced motion', () => {
    const fx = addShake(NO_FX, 0.7, 300, 0); // up to 6 × 0.49 = 2.94 px
    expect(fxShake(fx, 0, false, () => 0.9999)).toEqual({ x: 3, y: 3 });
    expect(fxShake(fx, 0, false, () => 0)).toEqual({ x: -3, y: -3 });
    expect(fxShake(fx, 0, false, () => 0.5)).toEqual({ x: 0, y: 0 });
    for (let t = 0; t < 300; t += 7) {
      const o = fxShake(fx, t);
      const max = Math.round(6 * fxTrauma(fx, t) ** 2);
      expect(Number.isInteger(o.x) && Number.isInteger(o.y)).toBe(true);
      expect(Math.max(Math.abs(o.x), Math.abs(o.y))).toBeLessThanOrEqual(max);
    }
    expect(fxShake(fx, 300, false, () => 0)).toEqual({ x: 0, y: 0 }); // settled
    expect(fxShake(fx, 0, true, () => 0)).toEqual({ x: 0, y: 0 }); // reduced motion: the border instead
    // p1_h3's [shake 0.3 200] peaks at 0.54 px: a pixel on the strongest rolls only, as on the canvas
    const light = addShake(NO_FX, 0.3, 200, 0);
    expect(fxShake(light, 0, false, () => 0.9999)).toEqual({ x: 1, y: 1 });
    expect(fxShake(light, 0, false, () => 0.9)).toEqual({ x: 0, y: 0 });
  });

  test('stage px become CSS px on the device-pixel grid', () => {
    expect(stageToCss(3, 393 / 270, 3)).toBeCloseTo(13 / 3, 9); // iPhone T stage: 4.37 CSS px, snapped to 4⅓
    expect(stageToCss(-2, 375 / 270, 1)).toBe(-3); // 1x small phone: whole px
    expect(stageToCss(1, 720 / 270, 2)).toBe(2.5); // iPad Mini portrait: 5 device px
    expect(Object.is(stageToCss(-0.1, 1, 1), 0)).toBe(true); // never -0
  });

  test('a flash covers the stage at 0.8, a quarter less each quarter of its ms', () => {
    const fx = { ...NO_FX, ms: 160, flashAt: 0 };
    expect(r6([0, 39, 40, 79, 80, 119, 120, 159, 160, 1000].map((t) => fxFlash(fx, t)))).toEqual(
      [0.8, 0.8, 0.6, 0.6, 0.4, 0.4, 0.2, 0.2, 0, 0],
    );
    expect(fxFlash(NO_FX, 0)).toBe(0); // none yet
    expect(fxFlash({ ...fx, ms: 0 }, 0)).toBe(0); // [flash #fff 0] shows nothing, as on the canvas
  });

  test('reduced motion: a fainter flash, half as long again', () => {
    const fx = { ...NO_FX, ms: 160, flashAt: 0 };
    expect(r6([0, 59, 60, 119, 120, 179, 180, 239, 240].map((t) => fxFlash(fx, t, true)))).toEqual(
      [0.35, 0.35, 0.2625, 0.2625, 0.175, 0.175, 0.0875, 0.0875, 0],
    );
  });

  test('reduced motion: a shake puts the border round the stage for 300 ms', () => {
    const fx = addShake(NO_FX, 0.7, 300, 0);
    expect([0, 299, 300].map((t) => fxBorder(fx, t, true))).toEqual([true, true, false]);
    expect(fxBorder(fx, 100, false)).toBe(false); // full motion shakes instead
    expect(fxBorder(NO_FX, 0, true)).toBe(false);
  });

  test('over the backdrop, the overlay’s flash adds only what the backdrop hides of the canvas’s own', () => {
    // the canvas flashes the stage too (at a), and a backdrop of opacity d lets 1 − d of that through: with the
    // overlay's flash f on top the stage flashes f + (1 − f)·(1 − d)·a, which is a again for f = a·d / (1 − a·(1 − d))
    const seen = (f: number, a: number, d: number) => f + (1 - f) * (1 - d) * a;
    for (const a of [0.8, 0.6, 0.4, 0.2, 0.35, 0.2625, 0.175, 0.0875]) {
      for (let step = 0; step <= 16; step++) {
        const d = (step / 16) * BACKDROP_ALPHA; // CgOverlay's backdrop: dim (0..1, dithered in 16ths) × BACKDROP_ALPHA
        const f = overlayFlash(a, d);
        expect(seen(f, a, d)).toBeCloseTo(a, 12);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(a);
      }
    }
    expect(overlayFlash(0.8, 0)).toBe(0); // no backdrop: the canvas's flash shows as it is
    expect(overlayFlash(0.8, 1)).toBeCloseTo(0.8, 12); // an opaque one would hide it: the overlay draws it all
    expect(overlayFlash(0.8, BACKDROP_ALPHA)).toBeCloseTo(0.752 / 0.952, 12); // a picture up: 0.79
    expect(overlayFlash(0, BACKDROP_ALPHA)).toBe(0);
    expect(overlayFlash(0.8, NaN)).toBe(0);
  });

  test('p1_ending: a [flash] right as a CG fades in comes through once, not about twice', () => {
    // [sfx spike] [shake 0.6 300] [flash], then [cg cg_p1_petal_spike]: the flash and the picture's fade start together,
    // with the backdrop still light. Off the picture (the bars, the dither's gaps) the canvas's flash shows through.
    const fx = { ...NO_FX, flashAt: 0 };
    const fade = new CgFade<string>();
    fade.show('cg_p1_petal_spike', 'picture');
    let doubled = 0;
    for (let now = 16; now < FLASH_MS; now += 16) {
      fade.tick(16);
      const d = (ditherStep(fade.backdrop) / 16) * BACKDROP_ALPHA; // CgOverlay: dim × BACKDROP_ALPHA
      const a = fxFlash(fx, now); // the canvas's flash, frame by frame the overlay's (the test below)
      const seen = (f: number) => f + (1 - f) * (1 - d) * a;
      if (seen(a) > a + 0.1) doubled++; // unscaled, as it was
      expect(seen(overlayFlash(a, d))).toBeCloseTo(a, 9);
    }
    expect(doubled).toBeGreaterThanOrEqual(3); // the first 50 ms at least
  });

  test('live while anything is left to draw', () => {
    expect(fxLive(NO_FX, 0)).toBe(false);
    const shaken = addShake(NO_FX, 0.7, 300, 0);
    expect([299, 301].map((t) => fxLive(shaken, t))).toEqual([true, false]);
    expect([299, 300].map((t) => fxLive(shaken, t, true))).toEqual([true, false]); // the border
    const flashed = { ...NO_FX, ms: 160, flashAt: 0 };
    expect([159, 160].map((t) => fxLive(flashed, t))).toEqual([true, false]);
    expect([239, 240].map((t) => fxLive(flashed, t, true))).toEqual([true, false]);
  });

  // The canvas itself, headless: the same commands, frame by frame. This reads world.ts's private effect state, so a
  // change to how the canvas shakes or flashes fails here until the overlay's copy of the rules follows it.
  test('frame by frame, the canvas’s own shake, flash and border (world.ts)', async () => {
    const { StageWorld } = await import('../src/lib/engine/world');
    for (const reduce of [false, true]) {
      const w = new StageWorld();
      const rect = { left: 0, top: 0, right: 270, bottom: 270, width: 270, height: 270, x: 0, y: 0 };
      w.attach({ setActive() {}, bubblesChanged() {}, canvasRect: () => rect, hitAlpha: () => true } as never);
      w.setLayout({ lw: 270, u: 1, cssW: 270, cssH: 270 } as never, false);
      w.setReduceMotion(reduce);
      const s = w as unknown as {
        trauma: number; shakeX: number; shakeY: number; flashT: number; flashDur: number; flashMax: number; border: number;
        updateOverlays(dt: number): void;
      };
      // the canvas's shake rolls, recorded so the overlay's copy can be fed the same ones
      const rolls: number[] = [];
      const rng = mulberry32(reduce ? 2 : 1);
      const own = s.updateOverlays.bind(w);
      s.updateOverlays = (dt) => {
        const real = Math.random;
        Math.random = () => {
          const v = rng();
          rolls.push(v);
          return v;
        };
        try {
          own(dt);
        } finally {
          Math.random = real;
        }
      };
      cgView.fx = NO_FX;
      let now = 5000;
      // p1_h5's kill shot, then (7 frames in) another shake on top of what is left
      w.shake(0.7, 300);
      cgView.shake(0.7, 300, now);
      w.flash();
      cgView.flash(undefined, undefined, now);
      let moved = 0;
      let flashed = 0;
      let bordered = 0;
      for (let i = 1; i <= 40; i++) {
        if (i === 8) {
          w.shake(0.4, 200);
          cgView.shake(0.4, 200, now);
        }
        rolls.length = 0;
        w.update(16);
        now += 16;
        const fx = cgView.fx;
        const o = fxShake(fx, now, reduce, () => rolls.shift()!);
        expect(o).toEqual({ x: s.shakeX || 0, y: s.shakeY || 0 }); // (the canvas may round to -0)
        if (rolls.length) expect(s.trauma).toBe(0); // the canvas rolls once more, for nothing, on the frame it settles
        if (!reduce) expect(fxTrauma(fx, now)).toBeCloseTo(s.trauma, 9);
        const canvasFlash = s.flashT < s.flashDur ? s.flashMax * stepped(1 - s.flashT / s.flashDur, 4) : 0;
        expect(fxFlash(fx, now, reduce)).toBeCloseTo(canvasFlash, 9);
        expect(fxBorder(fx, now, reduce)).toBe(s.border > 0);
        if (o.x || o.y) moved++;
        if (canvasFlash > 0) flashed++;
        if (s.border > 0) bordered++;
      }
      expect(flashed).toBe(reduce ? 14 : 9); // 160 ms (240 reduced) of 16 ms frames
      if (reduce) {
        expect(moved).toBe(0);
        expect(bordered).toBe(25); // 300 ms from the second shake, 7 frames in
      } else {
        expect(moved).toBeGreaterThan(5);
        expect(bordered).toBe(0);
      }
      cgView.fx = NO_FX;
    }
  });
});

describe('the canvas under the overlay (world.ts coverCG)', () => {
  test('while the overlay covers the stage the canvas leaves its cropped CG out; fades and the flash run as before', async () => {
    const { StageWorld } = await import('../src/lib/engine/world');
    const w = new StageWorld();
    const rect = { left: 0, top: 0, right: 270, bottom: 270, width: 270, height: 270, x: 0, y: 0 };
    w.attach({ setActive() {}, bubblesChanged() {}, canvasRect: () => rect, hitAlpha: () => true } as never);
    w.setLayout({ lw: 270, u: 1, cssW: 270, cssH: 270 } as never, false); // T: the canvas crops a CG to its middle
    const s = w as unknown as {
      cg: { id: string; canvas: unknown } | null; cgP: number; cgTarget: number; animateCG(target: number): Promise<void>;
    };
    const picture = { cg: 'cg_p1_petal_spike' }; // stands in for the CG's 480x270 canvas
    const frame = () => {
      const r = recorder();
      w.draw(r.ctx, recorder().ctx);
      return { cg: r.draws.filter((d) => d.img === picture).map((d) => [d.sx, d.sw, d.dw]), fills: r.fills };
    };
    const settle = () => new Promise((r) => setTimeout(r, 0));
    s.cg = { id: 'cg_p1_petal_spike', canvas: picture };
    s.cgP = s.cgTarget = 1;
    expect(frame().cg).toEqual([[105, 270, 270]]); // uncovered: the middle 270 of its 480 columns

    const release = w.coverCG();
    expect(frame().cg).toEqual([]);
    expect(w.describe()).toContain('Illustration'); // still up, for the scene and screen readers
    // a [flash] still covers the canvas's stage: the overlay's own adds only what the backdrop hides of it
    w.flash();
    expect(frame().fills).toContainEqual({ x: 0, y: 0, w: 270, h: 270, fill: '#ffffff', alpha: 0.8 });

    // [cg off]: the fade-out runs on the canvas's clock and resolves showCG on time, nothing drawn meanwhile
    let out = false;
    void w.showCG(null).then(() => (out = true));
    for (let t = 16; t < CG_FADE_MS; t += 16) {
      w.update(16);
      expect(frame().cg).toEqual([]);
    }
    await settle();
    expect(out).toBe(false);
    w.update(16);
    await settle();
    expect(out).toBe(true);
    expect(s.cg).toBeNull();

    // [cg …] while covered: so does the fade-in
    s.cg = { id: 'cg_p1_petal_spike', canvas: picture };
    s.cgP = 0;
    let shown = false;
    void s.animateCG(1).then(() => (shown = true));
    for (let t = 16; t < CG_FADE_MS; t += 16) {
      w.update(16);
      expect(frame().cg).toEqual([]);
    }
    await settle();
    expect(shown).toBe(false);
    w.update(16);
    await settle();
    expect(shown).toBe(true);

    // the overlay goes (the stage widened, or the scene closed): the canvas draws the CG again
    const other = w.coverCG(); // covers nest
    release();
    release(); // a second release changes nothing
    expect(frame().cg).toEqual([]);
    other();
    expect(frame().cg).toEqual([[105, 270, 270]]);
  });
});

describe('wiring', () => {
  const runner = read('src/lib/vn/runner.ts');

  test('the overlay holds the canvas’s cropped CG back while it covers the stage, and scales its flash', () => {
    const ov = read('src/lib/vn/components/CgOverlay.svelte');
    expect(ov).toMatch(/\$effect\(\(\) => \{\s*if \(narrow\) return world\.coverCG\(\);\s*\}\);/);
    expect(ov).toContain('overlayFlash(fxFlash(fx, now, reduce), dim * BACKDROP_ALPHA)');
    const at = ov.indexOf('.dim {');
    expect(at).toBeGreaterThan(0);
    expect(ov.slice(at, ov.indexOf('}', at))).toContain(`background: rgba(27, 18, 41, ${BACKDROP_ALPHA});`);
  });

  test('[shake] and [flash] reach the canvas and the CG view alike', () => {
    for (const [kind, call] of [['shake', 'shake(cmd.intensity, cmd.ms)'], ['flash', 'flash(cmd.color, cmd.ms)']]) {
      const at = runner.indexOf(`case '${kind}':`);
      expect(at).toBeGreaterThan(0);
      const body = runner.slice(at, runner.indexOf('break;', at));
      expect(body).toContain(`stage.${call}`);
      expect(body).toContain(`cgView.${call}`);
    }
  });

  test('the overlay replays them on the picture, with the canvas’s border', () => {
    const ov = read('src/lib/vn/components/CgOverlay.svelte');
    expect(ov).toContain('cgView.fx');
    for (const f of ['fxLive(', 'fxShake(', 'fxFlash(', 'fxBorder(', 'stageToCss(']) expect(ov).toContain(f);
    expect(ov).toMatch(/<canvas[^>]*style:transform=/);
    expect(ov).toMatch(/class="flash"/);
    expect(ov).toMatch(/class="border"/);
    const world = read('src/lib/engine/world.ts');
    const at = world.indexOf(`fillStyle = '${SHAKE_BORDER_COLOR}'`);
    expect(at).toBeGreaterThan(0);
    expect(world.slice(at, at + 120)).toContain(`fillRect(0, 0, lw, ${SHAKE_BORDER_PX})`);
  });

  test('[cg …] sets cgView before the canvas starts its fade', () => {
    const at = runner.indexOf("case 'cg':");
    expect(at).toBeGreaterThan(0);
    const body = runner.slice(at, runner.indexOf('break;', at));
    const set = body.indexOf('cgView.id = cmd.id');
    expect(set).toBeGreaterThan(0);
    expect(set).toBeLessThan(body.indexOf('await stage.showCG(cmd.id)'));
  });

  test('the scene end clears cgView before the canvas fades its CG out', () => {
    const fin = runner.slice(runner.lastIndexOf('} finally {'));
    const clear = fin.indexOf('cgView.id = null');
    expect(clear).toBeGreaterThan(0);
    expect(clear).toBeLessThan(fin.indexOf('await stage.showCG(null)'));
  });

  test('Scene.svelte mounts the overlay inside the stage', () => {
    const scene = read('src/lib/ui/screens/Scene.svelte');
    expect(scene).toMatch(/<StageHost[^>]*>[\s\S]*<CgOverlay \/>[\s\S]*<\/StageHost>/);
  });
});
