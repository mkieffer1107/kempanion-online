// [cg …] (KScript) on narrow stages. The canvas draws a 480x270 CG 1:1 into the stage's logical width and crops it to
// the middle (world.ts drawCG), so where the stage is narrower than 16:9 the picture loses its sides: portrait phones
// and tablets (the T layout's stage is about square, 270 logical px wide) see only the middle 56%, and some trio CGs
// lose half a pig. The runner mirrors the CG it shows into `cgView`; CgOverlay.svelte then draws the whole picture
// over the stage (full width, centred, on a dark backdrop) and fades it with the canvas, which leaves its own cropped
// copy out meanwhile (world.ts coverCG). The overlay also hides the [shake] and [flash] the canvas draws under it, so
// the runner mirrors those too (cgView.shake / cgView.flash) and the overlay replays them on the picture by world.ts's
// rules. The helpers below are pure.
import { BG_H, BG_W, clamp, MAX_BACKING_PIXELS, stepped } from '../engine/layout';

// ── stage effects (world.ts shake / flash and their drawing) ──

/** [shake]: trauma 0..1 (default 0.5) moves the stage up to SHAKE_PX·trauma² px a frame on each axis. */
export const SHAKE_INTENSITY = 0.5;
export const SHAKE_PX = 6;
/** Trauma drained per second: enough to settle over the shake's ms (at least SHAKE_MIN_DECAY), or SHAKE_DECAY. */
export const SHAKE_DECAY = 1.6;
export const SHAKE_MIN_DECAY = 0.2;
/** With reduced motion a shake draws a border round the stage for this long instead. */
export const SHAKE_BORDER_MS = 300;
export const SHAKE_BORDER_PX = 2;
export const SHAKE_BORDER_COLOR = '#f48fb1';
/** [flash]: the colour over the stage at FLASH_MAX, stepping down in FLASH_STEPS over its ms (default FLASH_MS). */
export const FLASH_COLOR = '#ffffff';
export const FLASH_MS = 160;
export const FLASH_MAX = 0.8;
export const FLASH_STEPS = 4;
/** Reduced motion: a fainter flash that lasts FLASH_REDUCED_SLOW times as long. */
export const FLASH_MAX_REDUCED = 0.35;
export const FLASH_REDUCED_SLOW = 1.5;

/** The scene's last [shake] and [flash]. Times are performance.now() ms (-Infinity: none yet). */
export interface CgFx {
  /** Trauma just after the last shake, how fast it drains (per s) from then on, and when it came. */
  trauma: number;
  decay: number;
  shakeAt: number;
  /** The last flash: its colour and length as asked for (ms), and when it came. */
  color: string;
  ms: number;
  flashAt: number;
}

export const NO_FX: CgFx = {
  trauma: 0, decay: SHAKE_DECAY, shakeAt: -Infinity, color: FLASH_COLOR, ms: FLASH_MS, flashAt: -Infinity,
};

/** Trauma left at `now`: it drains at `decay` per second (world.ts updateOverlays). */
export function fxTrauma(fx: CgFx, now: number): number {
  return Math.max(0, fx.trauma - (fx.decay * Math.max(0, now - fx.shakeAt)) / 1000);
}

/** A [shake] at `now` (world.ts shake): its intensity adds to what is left of the trauma, which then settles over `ms`. */
export function addShake(fx: CgFx, intensity: number, ms: number | undefined, now: number): CgFx {
  const trauma = clamp(fxTrauma(fx, now) + intensity, 0, 1);
  const decay = ms && ms > 0 ? Math.max(SHAKE_MIN_DECAY, trauma / (ms / 1000)) : SHAKE_DECAY;
  return { ...fx, trauma, decay, shakeAt: now };
}

/**
 * This frame's shake offset in stage px (world.ts): a random whole pixel within ±SHAKE_PX·trauma² on each axis. None
 * with reduced motion, which gets the border instead.
 */
export function fxShake(fx: CgFx, now: number, reduce = false, rand: () => number = Math.random): { x: number; y: number } {
  const t = reduce ? 0 : fxTrauma(fx, now);
  if (t <= 0) return { x: 0, y: 0 };
  const amp = SHAKE_PX * t * t;
  return { x: Math.round((rand() * 2 - 1) * amp) || 0, y: Math.round((rand() * 2 - 1) * amp) || 0 };
}

/** The flash colour's opacity at `now` (world.ts draw): FLASH_MAX·stepped(1 − t/ms, 4), fainter and longer reduced. */
export function fxFlash(fx: CgFx, now: number, reduce = false): number {
  const dur = reduce ? fx.ms * FLASH_REDUCED_SLOW : fx.ms;
  const t = Math.max(0, now - fx.flashAt);
  if (!(t < dur)) return 0;
  return (reduce ? FLASH_MAX_REDUCED : FLASH_MAX) * stepped(1 - t / dur, FLASH_STEPS);
}

/** CgOverlay.svelte's backdrop (.dim) at full strength: the stage under the picture, dimmed nearly to ink. */
export const BACKDROP_ALPHA = 0.94;

/**
 * The overlay's [flash] opacity for a flash at `a` (fxFlash) over a backdrop covering `cover` of the stage (its
 * opacity: BACKDROP_ALPHA at full dim). The canvas flashes the scene under the backdrop too and 1 − cover of that shows
 * through, so the overlay adds only the rest: f + (1 − f)·(1 − cover)·a = a for f = a·cover / (1 − a·(1 − cover)).
 * Unscaled, a [flash] right as a CG fades in, with the backdrop still light, came through about twice as bright.
 */
export function overlayFlash(a: number, cover: number): number {
  const d = cover > 0 ? Math.min(1, cover) : 0;
  if (!(a > 0) || d === 0) return 0;
  const f = Math.min(1, a);
  return (f * d) / (1 - f * (1 - d));
}

/** Reduced motion: the border a shake draws round the stage is up at `now`. */
export function fxBorder(fx: CgFx, now: number, reduce = false): boolean {
  return reduce && Math.max(0, now - fx.shakeAt) < SHAKE_BORDER_MS;
}

/** Any effect still playing at `now`. */
export function fxLive(fx: CgFx, now: number, reduce = false): boolean {
  return fxFlash(fx, now, reduce) > 0 || fxBorder(fx, now, reduce) || (!reduce && fxTrauma(fx, now) > 0);
}

/** Stage px to CSS px (`u` CSS px per stage px), on the device-pixel grid so a moved picture stays crisp. */
export function stageToCss(px: number, u: number, dpr = 1): number {
  const r = dpr > 0 ? dpr : 1;
  return Math.round(px * u * r) / r || 0;
}

class CgView {
  /** The CG the running scene shows (what it last passed to stage.showCG), or null. */
  id = $state<string | null>(null);
  /** Its last [shake] and [flash] (what it last passed to stage.shake / stage.flash), for the overlay to replay. */
  fx = $state.raw<CgFx>(NO_FX);

  /** Mirror stage.shake(intensity, ms). */
  shake(intensity = SHAKE_INTENSITY, ms?: number, now = performance.now()): void {
    this.fx = addShake(this.fx, intensity, ms, now);
  }

  /** Mirror stage.flash(color, ms). */
  flash(color = FLASH_COLOR, ms = FLASH_MS, now = performance.now()): void {
    this.fx = { ...this.fx, color, ms, flashAt: now };
  }
}

/** What the running scene shows on the stage that the overlay draws over (see above). */
export const cgView = new CgView();

/** Columns of the picture the canvas may cut before the overlay takes over (a few edge pixels aren't worth bars). */
export const CG_CROP_SLACK = 10;

/** True when a stage `lw` logical px wide crops a CG by more than CG_CROP_SLACK columns. */
export function cgCropped(lw: number): boolean {
  return BG_W - lw > CG_CROP_SLACK;
}

export interface CgFit {
  /** The picture's box inside the stage box, CSS px (snapped to device pixels). */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Integer nearest-neighbor upscale of the 480x270 picture in the backing store. */
  scale: number;
  backingW: number;
  backingH: number;
  /**
   * The browser doesn't shrink the backing store: it maps 1:1 onto device pixels (an exact integer scale) or, past the
   * 4K cap, is stretched. Draw it pixelated then; otherwise let CSS shrink it smoothly.
   */
  pixelated: boolean;
}

/**
 * The whole picture inside a stage box: as wide as the box (contain), centred. The backing store is the smallest
 * integer upscale covering the device pixels, which CSS then shrinks smoothly to the box: even, crisp pixels at any
 * size, the same sharp scaling as the stage canvas (layout.ts fitStage).
 */
export function fitCg(boxW: number, boxH: number, dpr = 1): CgFit {
  const r = dpr > 0 ? dpr : 1;
  const bw = Math.max(0, boxW);
  const bh = Math.max(0, boxH);
  let width = bw;
  let height = (bw * BG_H) / BG_W;
  if (height > bh) {
    height = bh;
    width = (bh * BG_W) / BG_H;
  }
  width = Math.round(width * r) / r;
  height = Math.round(height * r) / r;
  const left = Math.round(((bw - width) / 2) * r) / r;
  const top = Math.round(((bh - height) / 2) * r) / r;
  const dev = width * r;
  let scale = Math.max(1, Math.ceil(dev / BG_W - 1e-6));
  while (scale > 1 && BG_W * scale * BG_H * scale > MAX_BACKING_PIXELS) scale--;
  return { left, top, width, height, scale, backingW: BG_W * scale, backingH: BG_H * scale, pixelated: BG_W * scale < dev + 0.5 };
}

/** world.ts CG_FADE: a CG dithers in or out over this long (plain alpha over CG_FADE_REDUCED_MS with reduced motion). */
export const CG_FADE_MS = 420;
export const CG_FADE_REDUCED_MS = 200;

export interface CgLayer<T> { id: string; img: T }

/**
 * The overlay's picture and fade, by the canvas's rules (world.ts showCG / animateCG / finishCG): a new picture fades
 * in over the one showing, which stays fully drawn underneath until the fade ends; hide() fades the current one out.
 * `p` is the current picture's progress (0..1).
 */
export class CgFade<T> {
  cur: CgLayer<T> | null = null;
  prev: CgLayer<T> | null = null;
  p = 0;
  target = 0;

  /** Start fading `id` in. False when it is already showing (or fading in). */
  show(id: string, img: T): boolean {
    if (this.cur?.id === id && this.target === 1) return false;
    this.prev = this.cur && this.p > 0 ? this.cur : null;
    this.cur = { id, img };
    this.p = 0;
    this.target = 1;
    return true;
  }

  /** Start fading the current picture out. */
  hide(): void {
    if (this.cur) this.target = 0;
  }

  /** Jump to the end of the fade in progress. */
  finish(): void {
    this.p = this.target;
    if (this.target === 0) this.cur = null;
    this.prev = null;
  }

  /** Advance by `dt` ms. */
  tick(dt: number, reduce = false): void {
    if (!this.animating) return;
    const step = dt / (reduce ? CG_FADE_REDUCED_MS : CG_FADE_MS);
    this.p = this.target > this.p ? Math.min(this.target, this.p + step) : Math.max(this.target, this.p - step);
    if (this.p === this.target) this.finish();
  }

  get animating(): boolean {
    return this.p !== this.target || this.prev !== null;
  }

  /** Anything to draw. */
  get visible(): boolean {
    return this.prev !== null || (this.cur !== null && this.p > 0);
  }

  /**
   * How dark the backdrop is (0..1). It runs ahead of the picture (full by halfway), so the scene under it has dimmed
   * out before the picture is half in; it stays while one picture replaces another.
   */
  get backdrop(): number {
    return this.prev ? 1 : this.cur ? Math.min(1, this.p * 2) : 0;
  }
}
