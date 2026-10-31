<script lang="ts">
  // Petal Catch — any pig, Plaza of the Americas: run left/right to catch falling sakura petals.
  import { untrack } from 'svelte';
  import type { MinigameProps } from '../types';
  import MinigameShell from '../common/MinigameShell.svelte';
  import type { Phase } from '../common/types';
  import { META } from '../meta';
  import { PixelStage, Pops, prefersReducedMotion } from '../common/pixel';
  import { Sprite, loadBackground } from '../common/sprites';
  import { iconCanvas } from '../common/icons';
  import { DURATION, PetalEngine } from './engine';
  import { petalAnim, renderPetals } from './render';
  import { audio } from '../../audio';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';

  let { pig, onExit }: MinigameProps = $props();
  const meta = META.petals;

  let phase = $state<Phase>('howto');
  let assist = $state(false);
  let shell = $state<ReturnType<typeof MinigameShell>>();
  let box = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let view = $state({ score: 0, petals: 0, golden: 0, time: DURATION });

  const rm = $derived(prefersReducedMotion(game.save.settings.reduceMotion));
  // svelte-ignore state_referenced_locally
  const sprite = new Sprite(pig, 'everyday');
  const pops = new Pops();

  let px: PixelStage | null = null;
  let bg: HTMLImageElement | null = null;
  let engine: PetalEngine | null = null;
  let base = 0;
  let pausedAt = 0;
  let lastT = 0;
  let lastFrame = 0;
  let finishing = false;
  const keys = new Set<string>();
  let held: -1 | 0 | 1 = 0;
  let target: number | null = null;
  let pointerId: number | null = null;
  let anim = { name: 'idle', start: 0 };
  let ouch = { text: '', until: 0 };

  function gameTime(perf: number) {
    return (perf - base) / 1000;
  }

  function startRun() {
    if (!px) return;
    base = performance.now();
    engine = new PetalEngine(px.w, px.h, Math.floor(now()) ^ 0x9e7a, assist);
    finishing = false;
    pops.clear();
  }

  function onPause(p: boolean) {
    if (p) {
      pausedAt = performance.now();
      keys.clear();
      held = 0;
      target = null;
    } else base += performance.now() - pausedAt;
  }

  function dir(): number {
    const l = keys.has('ArrowLeft') || keys.has('a') || keys.has('A') || held === -1;
    const r = keys.has('ArrowRight') || keys.has('d') || keys.has('D') || held === 1;
    return (r ? 1 : 0) - (l ? 1 : 0);
  }

  function render(t: number, wall: number) {
    if (!px) return;
    if (engine) {
      const name = petalAnim(engine, t);
      if (anim.name !== name) anim = { name, start: t };
    }
    renderPetals(px.ctx, px.w, px.h, { engine, t, wall, bg, focusX: meta.focusX, sprite, anim, ouch, pops, reduceMotion: rm, icon: iconCanvas });
    px.present();
  }

  function frame() {
    const wall = performance.now();
    const dt = lastFrame ? Math.min(100, wall - lastFrame) : 16;
    lastFrame = wall;
    let t = lastT;
    if (phase === 'play' && engine) {
      t = gameTime(wall);
      engine.update(t, { dir: dir(), target });
      for (const f of engine.takeFx()) {
        if (f.kind === 'pop' && f.text) {
          pops.add(f.text, f.x ?? 0, f.y ?? 0, f.color, 600);
          if (f.text === 'OW!') ouch = { text: pig === 'piggy-2' ? 'Not based, squirrel.' : pig === 'piggy-3' ? 'Okay, rude.' : 'Pancake- OW!', until: t + 1.1 };
        } else if (f.kind === 'sfx' && f.sfx) audio.sfx(f.sfx);
      }
      const next = { score: engine.score, petals: engine.petalPoints, golden: engine.golden, time: Math.max(0, DURATION - t) };
      if (next.score !== view.score || Math.ceil(next.time) !== Math.ceil(view.time)) view = next;
      if (engine.ended && !finishing) {
        finishing = true;
        const en = engine;
        setTimeout(() => shell?.finish({ score: en.score, stats: en.stats() }), rm ? 400 : 1500);
      }
    }
    if (phase !== 'paused') pops.update(dt);
    lastT = t;
    render(t, wall);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (phase !== 'play') return;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
      e.preventDefault();
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') (e.target as HTMLElement).blur();
      keys.add(e.key);
      target = null;
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key);
  }

  function pointerTo(e: PointerEvent) {
    if (!px || phase !== 'play') return;
    target = px.toLogical(e.clientX, e.clientY).x;
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
        engine?.resize(px.w, px.h);
      });
      ro.observe(bx);
      px.resize(bx.clientWidth, bx.clientHeight);
      void loadBackground(meta.bg).then((img) => (bg = img));
      void sprite.load(['idle', 'wave', 'run_left', 'run_right', 'tumble', 'celebrate', 'happy']);
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

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={() => keys.clear()} />

<MinigameShell
  bind:this={shell}
  bind:phase
  bind:assist
  {meta}
  {pig}
  rules={[
    'Run left and right under the Plaza sakura to catch petals: pink +1, golden +10.',
    'Snacks (onigiri, oranges) are +2 and fill his tummy a little (max +30).',
    'The Plaza squirrels are bold: an acorn on the head means a 0.8 s tumble. No points lost.',
    '45 seconds. Every run pays.',
  ]}
  keysHint="Hold a spot on the screen to run there · ◀ ▶ buttons · ← → or A / D · Esc pauses"
  timeLeft={view.time}
  timeTotal={DURATION}
  onplay={startRun}
  onpause={onPause}
  onexit={onExit}
>
  {#snippet stage()}
    <div class="box" bind:this={box} role="img" aria-label={`Petal Catch on the Plaza. Score ${view.score}.`}>
      <canvas
        bind:this={canvas}
        aria-hidden="true"
        onpointerdown={(e) => {
          e.preventDefault();
          pointerId = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          pointerTo(e);
        }}
        onpointermove={(e) => pointerId === e.pointerId && pointerTo(e)}
        onpointerup={(e) => {
          if (pointerId === e.pointerId) {
            pointerId = null;
            target = null;
          }
        }}
        onpointercancel={() => {
          pointerId = null;
          target = null;
        }}
      ></canvas>
    </div>
  {/snippet}
  {#snippet hud()}
    <span class="stat"><small>SCORE</small>{view.score}</span>
    <span class="stat"><small>PETALS</small>{view.petals}</span>
  {/snippet}
  {#snippet controls()}
    <button
      class="px-btn ghost move"
      tabindex="-1"
      aria-label="Run left"
      onpointerdown={(e) => {
        e.preventDefault();
        held = -1;
        target = null;
      }}
      onpointerup={() => (held = 0)}
      onpointerleave={() => held === -1 && (held = 0)}
      onpointercancel={() => (held = 0)}
    >◀</button>
    <button
      class="px-btn ghost move"
      tabindex="-1"
      aria-label="Run right"
      onpointerdown={(e) => {
        e.preventDefault();
        held = 1;
        target = null;
      }}
      onpointerup={() => (held = 0)}
      onpointerleave={() => held === 1 && (held = 0)}
      onpointercancel={() => (held = 0)}
    >▶</button>
  {/snippet}
  {#snippet stats(r)}
    <!-- "Petals" is petal points (golden = 10), the same number as the HUD and the "Catch 150 petals" goals -->
    <p>Petals {r.stats?.petals ?? 0} · Golden {r.stats?.golden ?? 0} · Snacks {r.stats?.snacks ?? 0} · Acorn bonks {r.stats?.acorns ?? 0}</p>
  {/snippet}
</MinigameShell>

<style>
  .box { position: absolute; inset: 0; display: grid; place-items: center; }
  canvas { display: block; image-rendering: pixelated; touch-action: none; cursor: crosshair; }
  .stat { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; font-size: 1.1rem; }
  .stat small { font-size: 0.7rem; opacity: 0.7; letter-spacing: 0.08em; }
  .move { flex: 1; max-width: 200px; min-height: 56px; font-size: 1.4rem; touch-action: none; }
  @media (max-height: 460px) {
    .move { min-height: 44px; }
    .stat { font-size: 0.95rem; }
  }
</style>
