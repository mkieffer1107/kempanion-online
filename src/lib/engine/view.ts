// Binds the stage world to a DOM canvas: sharp integer-upscale sizing (ResizeObserver, DPR-aware),
// the single rAF loop (paused while the tab is hidden or another view is active), alpha probes for
// hit tests, and notifications for Stage.svelte.
import { context2d, makeCanvas } from './assets';
import { fitStage, LARGE_STAGE_CSS_H, LOGICAL_H, MAX_LOGICAL_W, type StageFit } from './layout';
import type { StageWorld } from './world';

export interface ViewCallbacks {
  /** The canvas box, logical width or --u changed. */
  layout(fit: StageFit): void;
  /** After every drawn frame (bubble positioning). */
  frame(): void;
  /** Bubbles were added or removed. */
  bubbles(): void;
  /** The scene summary for the canvas aria-label changed (checked about once a second). */
  describe(text: string): void;
}

export class StageView {
  private ctx: CanvasRenderingContext2D;
  private logical: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private scratch: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private probe: CanvasRenderingContext2D | null = null;
  private fit: StageFit | null = null;
  private active = false;
  private destroyed = false;
  private raf = 0;
  private last = 0;
  private describeIn = 0;
  private lastDescription = '';
  private ro: ResizeObserver | null = null;
  private dprQuery: MediaQueryList | null = null;

  constructor(
    private world: StageWorld,
    readonly canvas: HTMLCanvasElement,
    private box: HTMLElement,
    private cb: ViewCallbacks,
  ) {
    this.ctx = context2d(canvas, { alpha: false });
    this.logical = makeCanvas(MAX_LOGICAL_W, LOGICAL_H);
    this.lctx = context2d(this.logical, { alpha: false });
    this.scratch = makeCanvas(MAX_LOGICAL_W, LOGICAL_H);
    this.sctx = context2d(this.scratch);
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(this.measure);
      this.ro.observe(box);
    } else {
      addEventListener('resize', this.measure);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.watchDpr();
    this.measure();
    world.attach(this);
  }

  private measure = () => {
    if (this.destroyed) return;
    const w = this.box.clientWidth;
    const h = this.box.clientHeight;
    if (w <= 0 || h <= 0) return;
    const fit = fitStage(w, h, window.devicePixelRatio || 1);
    this.fit = fit;
    if (this.canvas.width !== fit.backingW || this.canvas.height !== fit.backingH) {
      this.canvas.width = fit.backingW;
      this.canvas.height = fit.backingH;
      this.ctx.imageSmoothingEnabled = false;
    }
    if (this.logical.width !== fit.lw) {
      this.logical.width = fit.lw;
      this.scratch.width = fit.lw;
      this.lctx.imageSmoothingEnabled = false;
      this.sctx.imageSmoothingEnabled = false;
    }
    this.cb.layout(fit);
    if (this.active) {
      this.world.setLayout(fit, fit.cssH >= LARGE_STAGE_CSS_H);
      this.render(0); // resizing cleared the canvas: repaint before the browser shows it
    }
  };

  private watchDpr() {
    this.dprQuery?.removeEventListener?.('change', this.onDpr);
    if (typeof matchMedia === 'undefined') return;
    this.dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.dprQuery.addEventListener?.('change', this.onDpr);
  }

  private onDpr = () => {
    this.watchDpr();
    this.measure();
  };

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.stop();
    else this.start();
  };

  /** Called by the world: only the active (most recently mounted) view runs the loop. */
  setActive(on: boolean): void {
    if (this.active === on || this.destroyed) return;
    this.active = on;
    if (!on) {
      this.stop();
      return;
    }
    if (this.fit) {
      this.world.setLayout(this.fit, this.fit.cssH >= LARGE_STAGE_CSS_H);
      this.render(0);
    }
    this.start();
  }

  private start() {
    if (this.raf || !this.active || document.visibilityState === 'hidden') return;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (ts: number) => {
    this.raf = 0;
    if (!this.active) return;
    // clamp so a stalled tab does not fast-forward animations in one jump
    const dt = this.last ? Math.min(100, Math.max(0, ts - this.last)) : 1000 / 60;
    this.last = ts;
    this.render(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private render(dt: number) {
    this.world.update(dt);
    const fit = this.fit;
    if (fit) {
      this.world.draw(this.lctx, this.sctx);
      this.ctx.drawImage(this.logical, 0, 0, fit.lw, LOGICAL_H, 0, 0, fit.backingW, fit.backingH);
    }
    this.cb.frame();
    this.describeIn -= dt;
    if (this.describeIn <= 0) {
      this.describeIn = 1000;
      const d = this.world.describe();
      if (d !== this.lastDescription) {
        this.lastDescription = d;
        this.cb.describe(d);
      }
    }
  }

  bubblesChanged(): void {
    this.cb.bubbles();
  }

  canvasRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  /** Any opaque pixel within `r` of (fx, fy) inside the w×h cell at (sx, sy) of `img`? */
  hitAlpha(img: CanvasImageSource, sx: number, sy: number, w: number, h: number, fx: number, fy: number, r: number): boolean {
    const x0 = Math.max(0, fx - r), y0 = Math.max(0, fy - r);
    const x1 = Math.min(w, fx + r + 1), y1 = Math.min(h, fy + r + 1);
    if (x1 <= x0 || y1 <= y0) return false;
    const pw = x1 - x0, ph = y1 - y0;
    if (!this.probe) this.probe = context2d(makeCanvas(16, 16), { willReadFrequently: true });
    const g = this.probe;
    if (g.canvas.width < pw || g.canvas.height < ph) {
      g.canvas.width = Math.max(g.canvas.width, pw);
      g.canvas.height = Math.max(g.canvas.height, ph);
    }
    g.clearRect(0, 0, pw, ph);
    g.drawImage(img, sx + x0, sy + y0, pw, ph, 0, 0, pw, ph);
    const data = g.getImageData(0, 0, pw, ph).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 64) return true;
    return false;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.stop();
    this.ro?.disconnect();
    removeEventListener('resize', this.measure);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.dprQuery?.removeEventListener?.('change', this.onDpr);
    this.world.detach(this);
    this.destroyed = true;
    // iOS Safari keeps canvas memory until the backing store is shrunk; screens remount stages often
    for (const c of [this.canvas, this.logical, this.scratch]) c.width = c.height = 0;
    if (this.probe) this.probe.canvas.width = this.probe.canvas.height = 0;
  }
}
