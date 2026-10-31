<script lang="ts">
  // The whole CG over a stage too narrow for it (see ../cg-view.svelte.ts). While the running scene shows a CG and
  // the canvas would crop it, this draws all 480x270 of it across the stage, centred on a dark backdrop, and fades it
  // in and out with the canvas (the same dither steps and timing). Meanwhile the canvas leaves its own cropped copy out
  // (world.ts coverCG) but keeps drawing the scene underneath, shakes and flashes included, so the scene's [shake] and
  // [flash] (mirrored into cgView.fx) play again on top: the picture jitters (or, with reduced motion, the stage gets
  // its pink border) and the flash colour covers the stage, by the canvas's rules, less what of the canvas's own flash
  // shows through the backdrop. Mount it inside the Stage (StageHost children): the dialogue box, choices and controls
  // stay above it, and taps pass through.
  import { untrack } from 'svelte';
  import { context2d, makeCanvas } from '../../engine/assets';
  import { cgCanvas } from '../../engine/backgrounds';
  import { ditherStep } from '../../engine/dither';
  import { BG_H, BG_W } from '../../engine/layout';
  import { stage } from '../../engine/stage';
  import { ditherComposite } from '../../engine/transitions';
  import { world } from '../../engine/world';
  import { game } from '../../state/game.svelte';
  import {
    BACKDROP_ALPHA, CgFade, cgCropped, cgView, fitCg, fxBorder, fxFlash, fxLive, fxShake, overlayFlash, SHAKE_BORDER_COLOR,
    SHAKE_BORDER_PX, stageToCss,
  } from '../cg-view.svelte';

  let lw = $state(BG_W);
  /** CSS px per stage px: effects are measured in stage px. */
  let u = $state(1);
  let boxW = $state(0);
  let boxH = $state(0);
  let dpr = $state(1);
  let reduceMedia = $state(false);
  const reduce = $derived(game.save.settings.reduceMotion || reduceMedia);
  const narrow = $derived(cgCropped(lw));
  const fit = $derived(fitCg(boxW, boxH, dpr));
  const borderW = $derived(Math.max(1 / dpr, stageToCss(SHAKE_BORDER_PX, u, dpr)));

  let view: HTMLCanvasElement | undefined = $state();
  /** A picture is up (or fading), and how dark the backdrop is right now. */
  let shown = $state(false);
  let dim = $state(0);
  /** This frame's effects: the picture's shake offset (CSS px), the flash colour's opacity, the reduced-motion border. */
  let shakeX = $state(0);
  let shakeY = $state(0);
  let flash = $state(0);
  let flashColor = $state('');
  let border = $state(false);

  const fade = new CgFade<HTMLCanvasElement>();
  /** The 480x270 picture as it shows this frame (CG under CG, dithered in), and the dither scratch. */
  let lctx: CanvasRenderingContext2D | null = null;
  let sctx: CanvasRenderingContext2D | null = null;
  let token = 0;
  let mounted = false;
  let raf = 0;
  let last = 0;

  // The stage's logical width (does the canvas crop?) and its box, which this fills.
  $effect(() =>
    stage.onLayout((l) => {
      lw = l.logicalWidth;
      u = l.u;
      boxW = l.cssWidth;
      boxH = l.cssHeight;
    }),
  );

  // While this draws the CGs the canvas would crop, the canvas leaves its cropped copy out (it showed through the
  // backdrop as a second picture).
  $effect(() => {
    if (narrow) return world.coverCG();
  });

  // Device pixels (zoom, another screen) and reduced motion.
  $effect(() => {
    let q: MediaQueryList | null = null;
    const watch = () => {
      q?.removeEventListener?.('change', watch);
      dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
      q = matchMedia(`(resolution: ${dpr}dppx)`);
      q.addEventListener?.('change', watch);
    };
    watch();
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const onRm = () => (reduceMedia = rm.matches);
    onRm();
    rm.addEventListener?.('change', onRm);
    return () => {
      q?.removeEventListener?.('change', watch);
      rm.removeEventListener?.('change', onRm);
    };
  });

  $effect(() => () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  });

  // Follow the runner. A CG that was already up when this mounted (the layout turned narrow mid-CG) shows at once.
  $effect(() => {
    const id = cgView.id;
    untrack(() => {
      const instant = !mounted;
      mounted = true;
      show(id, instant);
    });
  });

  // Resizing clears the canvas, and nothing is drawn while the stage is wide enough: repaint.
  $effect(() => {
    void fit;
    void view;
    if (narrow) untrack(paint);
  });

  // A [shake] or [flash] while the picture shows (or a picture that turns up mid-effect): play it.
  $effect(() => {
    void cgView.fx;
    if (shown && narrow) untrack(kick);
  });

  function show(id: string | null, instant: boolean) {
    const t = ++token;
    if (id === null) {
      fade.hide();
      kick();
      return;
    }
    // the canvas loads the same memoised picture, so both start fading on the same frame
    void cgCanvas(id).then((img) => {
      if (t !== token || !fade.show(id, img)) return;
      if (instant) {
        fade.finish();
        render();
      } else {
        kick();
      }
    });
  }

  function kick() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function frame(ts: number) {
    raf = 0;
    // the stage's clock (view.ts): clamped, so a stalled tab doesn't jump
    const dt = last ? Math.min(100, Math.max(0, ts - last)) : 1000 / 60;
    last = ts;
    if (fade.animating) {
      fade.tick(dt, reduce);
      render();
    }
    const playing = effects(ts);
    if (fade.animating || playing) raf = requestAnimationFrame(frame);
  }

  /**
   * The effects at `now` (a frame time, on the clock the runner stamps them with) on the picture while it shows; none
   * otherwise. True while one is still playing.
   */
  function effects(now: number): boolean {
    const fx = cgView.fx;
    const on = shown && narrow && fxLive(fx, now, reduce);
    const o = on ? fxShake(fx, now, reduce) : { x: 0, y: 0 };
    shakeX = stageToCss(o.x, u, dpr);
    shakeY = stageToCss(o.y, u, dpr);
    // the canvas's own flash shows through the backdrop (as dark as dim × BACKDROP_ALPHA): add only the rest
    flash = on ? overlayFlash(fxFlash(fx, now, reduce), dim * BACKDROP_ALPHA) : 0;
    flashColor = fx.color;
    border = on && fxBorder(fx, now, reduce);
    return on;
  }

  /** The fade moved: recompose the picture, set the backdrop, repaint (or let go of the backing store). */
  function render() {
    shown = fade.visible;
    dim = reduce ? fade.backdrop : ditherStep(fade.backdrop) / 16;
    compose();
    if (narrow || !fade.visible) paint();
  }

  /** The picture as world.ts drawCG composes it, at 480x270. */
  function compose() {
    if (!lctx) lctx = context2d(makeCanvas(BG_W, BG_H));
    if (!sctx) sctx = context2d(makeCanvas(BG_W, BG_H));
    const ctx = lctx;
    ctx.clearRect(0, 0, BG_W, BG_H);
    if (fade.prev) ctx.drawImage(fade.prev.img, 0, 0);
    const cur = fade.cur;
    if (!cur || fade.p <= 0) return;
    if (fade.p >= 1) {
      ctx.drawImage(cur.img, 0, 0);
    } else if (reduce) {
      ctx.globalAlpha = fade.p;
      ctx.drawImage(cur.img, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, BG_W, BG_H);
      sctx.drawImage(cur.img, 0, 0);
      ditherComposite(ctx, sctx, BG_W, BG_H, ditherStep(fade.p));
    }
  }

  /** Nearest-neighbor upscale into the backing store; a hidden overlay gives its backing store back. */
  function paint() {
    const c = view;
    if (!c) return;
    if (!fade.visible) {
      if (c.width > 1) c.width = c.height = 1;
      return;
    }
    if (!lctx) compose();
    const f = fit;
    if (c.width !== f.backingW || c.height !== f.backingH) {
      c.width = f.backingW;
      c.height = f.backingH;
    }
    const ctx = context2d(c);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(lctx!.canvas, 0, 0, BG_W, BG_H, 0, 0, c.width, c.height);
  }
</script>

<div class="cg-overlay" class:on={shown && narrow} aria-hidden="true">
  <div class="dim" style:opacity={dim}></div>
  <canvas
    bind:this={view}
    width="1"
    height="1"
    class:pixelated={fit.pixelated}
    style:left="{fit.left}px"
    style:top="{fit.top}px"
    style:width="{fit.width}px"
    style:height="{fit.height}px"
    style:transform={shakeX || shakeY ? `translate(${shakeX}px, ${shakeY}px)` : null}
  ></canvas>
  {#if flash > 0}<div class="flash" style:background-color={flashColor} style:opacity={flash}></div>{/if}
  {#if border}<div class="border" style:border-color={SHAKE_BORDER_COLOR} style:border-width="{borderW}px"></div>{/if}
</div>

<style>
  .cg-overlay {
    position: absolute;
    inset: 0;
    display: none;
    /* a shaken picture stays inside the stage, as on the canvas */
    overflow: hidden;
    pointer-events: none;
  }
  .cg-overlay.on { display: block; }
  /* the stage, dimmed nearly to ink (alpha: BACKDROP_ALPHA): a hint of the scene shows through the bars */
  .dim {
    position: absolute;
    inset: 0;
    background: rgba(27, 18, 41, 0.94);
  }
  /* [flash] covers the whole stage and the shake border runs round it, as the canvas draws them (world.ts draw) */
  .flash,
  .border {
    position: absolute;
    inset: 0;
  }
  .border {
    box-sizing: border-box;
    border-style: solid;
  }
  canvas {
    position: absolute;
    display: block;
    /* the backing store is an integer nearest-neighbor upscale: shrink it smoothly for even pixels */
    image-rendering: auto;
  }
  canvas.pixelated { image-rendering: pixelated; }
</style>
