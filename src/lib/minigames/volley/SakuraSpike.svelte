<script lang="ts">
  // Sakura Spike — Piggy 1's one-button volleyball timing game on the sand courts.
  import { untrack } from 'svelte';
  import type { MinigameProps } from '../types';
  import MinigameShell from '../common/MinigameShell.svelte';
  import type { Phase } from '../common/types';
  import { META } from '../meta';
  import { PixelStage, Pops, prefersReducedMotion } from '../common/pixel';
  import { Sprite, loadBackground } from '../common/sprites';
  import { CONTACT_FRAME, DURATION, VolleyEngine, layoutFor, type Action } from './engine';
  import { renderVolley } from './render';
  import { audio } from '../../audio';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';

  let { pig, onExit }: MinigameProps = $props();
  const meta = META.volley;

  let phase = $state<Phase>('howto');
  let assist = $state(false);
  let shell = $state<ReturnType<typeof MinigameShell>>();
  let box = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let view = $state({ score: 0, mult: 1, rally: 0, time: DURATION, action: '' as Action | '' });

  const rm = $derived(prefersReducedMotion(game.save.settings.reduceMotion));

  const p1 = new Sprite('piggy-1', 'volleyball');
  const cheer2 = new Sprite('piggy-2', 'everyday');
  const cheer3 = new Sprite('piggy-3', 'everyday');
  const contactMs = (anim: string) => p1.frameStart(anim, CONTACT_FRAME[anim]?.frame ?? 0);
  const pops = new Pops();

  let px: PixelStage | null = null;
  let bg: HTMLImageElement | null = null;
  let engine: VolleyEngine | null = null;
  let base = 0;
  let pausedAt = 0;
  let lastT = 0;
  let lastFrame = 0;
  let bubble = { text: '', until: 0 };
  let cheerUntil = 0;
  let finishing = false;
  let tapCount = 0;

  const ACTION_LABEL: Record<Action, string> = { bump: 'BUMP', set: 'SET', spike: 'SPIKE!', block: 'BLOCK!' };

  function gameTime(perfMs: number): number {
    return (perfMs - base) / 1000;
  }

  function eventTime(e: Event): number {
    const ts = e.timeStamp;
    const p = performance.now();
    return Math.abs(ts - p) < 1000 ? Math.min(ts, p) : p;
  }

  function startRun() {
    if (!px) return;
    base = performance.now();
    engine = new VolleyEngine(layoutFor(px.w, px.h), Math.floor(now()) ^ 0x5eed, assist, contactMs);
    engine.start(0);
    finishing = false;
    tapCount = 0;
    pops.clear();
  }

  function onPause(paused: boolean) {
    if (paused) pausedAt = performance.now();
    else base += performance.now() - pausedAt;
  }

  function tap(perfMs: number) {
    if (phase !== 'play' || !engine || engine.ended) return;
    tapCount += 1;
    engine.tap(gameTime(perfMs));
  }

  function handleFx(t: number) {
    if (!engine) return;
    for (const f of engine.takeFx()) {
      if (f.kind === 'pop' && f.text) pops.add(f.text, f.x ?? 0, f.y ?? 0, f.color, 750);
      else if (f.kind === 'bubble' && f.text) bubble = { text: f.text, until: t + 0.95 };
      else if (f.kind === 'sfx' && f.sfx) audio.sfx(f.sfx);
      else if (f.kind === 'cheer') cheerUntil = t + 0.8;
    }
  }

  function render(t: number, wallMs: number) {
    if (!px) return;
    renderVolley(px.ctx, px.w, px.h, {
      engine, t, wallMs, playing: phase !== 'howto' && phase !== 'countdown', bg, focusX: meta.focusX, p1, cheer2, cheer3,
      bubble, cheerUntil, pops, reduceMotion: rm, teach: tapCount < 3,
    });
    px.present();
  }

  function frame() {
    const wall = performance.now();
    const dt = lastFrame ? Math.min(100, wall - lastFrame) : 16;
    lastFrame = wall;
    let t = lastT;
    if (phase === 'play' && engine) {
      t = gameTime(wall);
      engine.update(t);
      handleFx(t);
      const next = { score: engine.score, mult: engine.multiplier, rally: engine.rally, time: Math.max(0, DURATION - t), action: (engine.expect?.action ?? '') as Action | '' };
      if (next.score !== view.score || next.mult !== view.mult || next.rally !== view.rally || Math.ceil(next.time) !== Math.ceil(view.time) || next.action !== view.action) view = next;
      if (engine.ended && !finishing) {
        finishing = true;
        const outcome = { score: engine.score, stats: engine.stats() };
        setTimeout(() => shell?.finish(outcome), rm ? 400 : 1600);
      }
    }
    if (phase !== 'paused') pops.update(dt);
    lastT = t;
    render(t, wall);
  }

  function onKey(e: KeyboardEvent) {
    if (phase !== 'play' || e.repeat) return;
    if ([' ', 'Enter', 'z', 'x', 'j', 'k', 'f', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') (e.target as HTMLElement).blur();
      tap(eventTime(e));
    }
  }

  // Set up once both refs exist (they live in the shell's snippet, so don't assume mount order).
  $effect(() => {
    const cv = canvas;
    const bx = box;
    if (!cv || !bx) return;
    return untrack(() => {
      px = new PixelStage(cv, { height: 270, minW: 150, maxW: 480 });
      const ro = new ResizeObserver(() => {
        if (!px || !box) return;
        px.resize(box.clientWidth, box.clientHeight);
        engine?.relayout(layoutFor(px.w, px.h));
      });
      ro.observe(bx);
      px.resize(bx.clientWidth, bx.clientHeight);
      void loadBackground(meta.bg).then((img) => (bg = img));
      void p1.load(['volleyball_ready', 'volleyball_serve', 'volleyball_bump', 'volleyball_set', 'volleyball_spike', 'volleyball_dig', 'volleyball_block', 'volleyball_win', 'idle']);
      void cheer2.load(['happy', 'celebrate']);
      void cheer3.load(['happy', 'celebrate']);
      let raf = requestAnimationFrame(function loop() {
        frame();
        raf = requestAnimationFrame(loop);
      });
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
      };
    });
  });
</script>

<svelte:window onkeydown={onKey} />

<MinigameShell
  bind:this={shell}
  bind:phase
  bind:assist
  {meta}
  {pig}
  outfit="volleyball"
  rules={[
    'Tap when the shrinking ring closes on the ball’s shadow.',
    'Bump → Set → Spike! Perfect = 100, Good = 50. Every 5 hits in a row adds ×0.1.',
    'Late? A quick tap still digs it out — once per point.',
    'Red “INCOMING” = opponent spike: tap to block for +150.',
    'No game over: a dropped ball just starts a new point.',
  ]}
  keysHint="Tap the court or the big button · Space / Enter / Z · Esc pauses"
  timeLeft={view.time}
  timeTotal={DURATION}
  onplay={startRun}
  onpause={onPause}
  onexit={onExit}
>
  {#snippet stage()}
    <div class="box" bind:this={box} role="img" aria-label={`Sakura Spike. Piggy 1 on the sand court. ${view.action ? `Next: ${view.action}.` : ''} Score ${view.score}.`}>
      <canvas
        bind:this={canvas}
        aria-hidden="true"
        onpointerdown={(e) => {
          e.preventDefault();
          tap(eventTime(e));
        }}
      ></canvas>
    </div>
  {/snippet}
  {#snippet hud()}
    <span class="stat"><small>SCORE</small>{view.score}</span>
    <span class="stat" class:hot={view.mult > 1}><small>COMBO</small>×{view.mult.toFixed(1)}</span>
    <span class="stat"><small>RALLY</small>{view.rally}</span>
  {/snippet}
  {#snippet controls()}
    <button
      class="px-btn primary tapbtn"
      class:block={view.action === 'block'}
      tabindex="-1"
      aria-label="Hit the ball"
      onpointerdown={(e) => {
        e.preventDefault();
        tap(eventTime(e));
      }}
    >{view.action ? ACTION_LABEL[view.action] : '· · ·'}</button>
  {/snippet}
  {#snippet stats(r)}
    <p>Best rally {r.stats?.maxRally ?? 0} · Perfect {r.stats?.perfect ?? 0} · Good {r.stats?.good ?? 0} · Digs {r.stats?.digs ?? 0} · Blocks {r.stats?.blocks ?? 0}</p>
  {/snippet}
</MinigameShell>

<style>
  .box { position: absolute; inset: 0; display: grid; place-items: center; }
  canvas { display: block; image-rendering: pixelated; cursor: pointer; }
  .stat { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; font-size: 1.1rem; }
  .stat small { font-size: 0.7rem; opacity: 0.7; letter-spacing: 0.08em; }
  .stat.hot { color: var(--gold); }
  .tapbtn { width: min(420px, 100%); min-height: 56px; font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 0.1em; touch-action: none; }
  .tapbtn.block { --btn-bg: var(--bad); --btn-ink: #fff; --btn-hi: #ff8a8f; --btn-lo: #a3262b; }
  @media (max-height: 460px) {
    .tapbtn { min-height: 44px; font-size: 1.05rem; }
    .stat { font-size: 0.95rem; }
  }
</style>
