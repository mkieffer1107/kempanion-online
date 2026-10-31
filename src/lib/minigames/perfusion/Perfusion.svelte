<script lang="ts">
  // Swinus Rhythms (id 'perfusion') — Piggy 2's ECG rhythm game in the sim lab. Clock follows audio.songPosition() when the
  // song is playing (drift-corrected against performance.now()), else performance.now().
  import { untrack } from 'svelte';
  import type { MinigameProps } from '../types';
  import MinigameShell from '../common/MinigameShell.svelte';
  import type { Phase } from '../common/types';
  import { META } from '../meta';
  import { PixelStage, Pops, prefersReducedMotion } from '../common/pixel';
  import { Sprite, loadBackground } from '../common/sprites';
  import { PLAN, PerfusionEngine } from './engine';
  import { hitX, renderPerfusion } from './render';
  import { audio } from '../../audio';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';

  let { pig, onExit }: MinigameProps = $props();
  const meta = META.perfusion;
  const BEAT_MS = Math.round(60000 / PLAN.countInBpm);

  let phase = $state<Phase>('howto');
  let assist = $state(false);
  let shell = $state<ReturnType<typeof MinigameShell>>();
  let box = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let view = $state({ accuracy: 100, combo: 0, holding: false, time: 0, total: 0 });

  const rm = $derived(prefersReducedMotion(game.save.settings.reduceMotion));
  const doc = new Sprite('piggy-2', 'scrubs');
  const pops = new Pops();

  let px: PixelStage | null = null;
  let bg: HTMLImageElement | null = null;
  let engine: PerfusionEngine | null = null;
  let origin = 0;
  let pausedAt = 0;
  let pausedTotal = 0;
  let synced = true;
  let offset: number | null = null;
  let lastT = 0;
  let lastFrame = 0;
  let pressCount = 0;
  let finishing = false;
  let anim = { name: 'surgical_focus', start: 0, until: Infinity, then: 'surgical_focus' };
  let bubbles: { text: string; until: number }[] = [];
  let bubbleShown: { text: string; until: number } | null = null;

  function localTime(perf: number): number {
    return (perf - origin - pausedTotal) / 1000;
  }

  function songTime(perf: number): number {
    const local = localTime(perf);
    if (synced) {
      const sp = audio.songPosition();
      // Only trust the song clock when it agrees roughly with ours (it restarted at the countdown).
      if (audio.currentSong() === meta.song && sp > 0 && Math.abs(sp - local) < 1.2) {
        const diff = sp - local;
        if (offset === null || Math.abs(diff - offset) > 0.25) offset = diff;
        else offset += (diff - offset) * 0.05;
      }
    }
    return local + (offset ?? 0);
  }

  function eventPerf(e: Event): number {
    const p = performance.now();
    return Math.abs(e.timeStamp - p) < 1000 ? Math.min(e.timeStamp, p) : p;
  }

  function beginCountdown() {
    origin = performance.now();
    pausedTotal = 0;
    offset = null;
    synced = true;
    audio.playSong(meta.song, { restart: true });
    engine = new PerfusionEngine(Math.floor(now()) ^ 0xbea7, assist);
    view = { ...view, total: engine.chart.end };
    pops.clear();
    bubbles = [];
    bubbleShown = null;
    finishing = false;
  }

  function onPause(paused: boolean) {
    if (paused) {
      pausedAt = performance.now();
      if (engine?.holding) engine.release(songTime(pausedAt));
    } else {
      pausedTotal += performance.now() - pausedAt;
      synced = false; // the song kept playing; stay on our own clock from here
    }
  }

  function press(perf: number) {
    if (phase !== 'play' || !engine) return;
    pressCount += 1;
    if (pressCount === 1) engine.press(songTime(perf));
  }

  function release(perf: number) {
    if (!engine) return;
    pressCount = Math.max(0, pressCount - 1);
    if (pressCount === 0) engine.release(songTime(perf));
  }

  function playAnim(name: string, t: number) {
    const dur = doc.duration(name) / 1000;
    const loop = name === 'surgical_focus' || name === 'write_chart';
    anim = { name, start: t, until: loop ? Infinity : t + Math.max(0.6, dur), then: name === 'clinical_success' ? 'write_chart' : 'surgical_focus' };
    if (name === 'review_mri') anim.until = t + 1.6;
  }

  function handleFx(t: number) {
    if (!engine) return;
    for (const f of engine.takeFx()) {
      if (f.kind === 'pop' && f.text && px) {
        // one judgment at a time: a fresh grade replaces the last one instead of stacking on it
        pops.clear();
        pops.add(f.text, hitX(px.w, px.h) + 4, px.h * 0.12, f.color, 520);
      }
      else if (f.kind === 'sfx' && f.sfx) audio.sfx(f.sfx);
      else if (f.kind === 'bubble' && f.text) bubbles.push({ text: f.text, until: 0 });
      else if (f.kind === 'anim' && f.anim) playAnim(f.anim, t);
    }
    if ((!bubbleShown || t >= bubbleShown.until) && bubbles.length) {
      const b = bubbles.shift()!;
      bubbleShown = { text: b.text, until: t + Math.min(2.2, 0.9 + b.text.length * 0.035) };
      if (b.text.startsWith('ISCHEMIA')) shell?.announce('Ischemia! Perfusion below 30 percent.');
    }
  }

  function render(t: number, wall: number) {
    if (!px) return;
    renderPerfusion(px.ctx, px.w, px.h, { engine, t, wall, bg, focusX: meta.focusX, doc, anim, bubble: bubbleShown, pops, reduceMotion: rm });
    px.present();
  }

  function frame() {
    const wall = performance.now();
    const dt = lastFrame ? Math.min(100, wall - lastFrame) : 16;
    lastFrame = wall;
    let t = engine ? lastT : wall / 1000;
    if (engine && (phase === 'countdown' || phase === 'play')) {
      t = songTime(wall);
      if (phase === 'play') {
        engine.update(t);
        handleFx(t);
        if (t >= anim.until) playAnim(anim.then, t);
        const next = { accuracy: engine.accuracy(), combo: engine.combo, holding: !!engine.holding, time: Math.max(0, engine.chart.end - t), total: engine.chart.end };
        if (next.accuracy !== view.accuracy || next.combo !== view.combo || next.holding !== view.holding || Math.ceil(next.time) !== Math.ceil(view.time)) view = next;
        if (engine.ended && !finishing) {
          finishing = true;
          const e = engine;
          setTimeout(() => shell?.finish({ score: e.score(), stats: e.stats() }), rm ? 500 : 1800);
        }
      }
    }
    if (phase !== 'paused') pops.update(dt);
    if (engine) lastT = t;
    render(t, wall);
  }

  const KEYS = [' ', 'Enter', 'j', 'k', 'f', 'd', 'z', 'x'];
  function onKeyDown(e: KeyboardEvent) {
    if (phase !== 'play' || !KEYS.includes(e.key)) return;
    e.preventDefault();
    if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') (e.target as HTMLElement).blur();
    if (!e.repeat) press(eventPerf(e));
  }
  function onKeyUp(e: KeyboardEvent) {
    if (!KEYS.includes(e.key)) return;
    release(eventPerf(e));
  }

  // Set up once both refs exist (they live in the shell's snippet, so don't assume mount order).
  $effect(() => {
    const cv = canvas;
    const bx = box;
    if (!cv || !bx) return;
    return untrack(() => {
      px = new PixelStage(cv, { height: 270, minW: 150, maxW: 480 });
      const ro = new ResizeObserver(() => box && px?.resize(box.clientWidth, box.clientHeight));
      ro.observe(bx);
      px.resize(bx.clientWidth, bx.clientHeight);
      void loadBackground(meta.bg).then((img) => (bg = img));
      void doc.load(['surgical_focus', 'review_mri', 'clinical_success', 'write_chart', 'jump', 'idle', 'preop_check']);
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

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={() => engine?.holding && release(performance.now())} />

<MinigameShell
  bind:this={shell}
  bind:phase
  bind:assist
  {meta}
  {pig}
  outfit="scrubs"
  rules={[
    'Tap when a heartbeat spike crosses the ♥ line. Perfect ±50 ms, Good ±110 ms.',
    'Blue HOLD band = draining CSF: press and hold until it ends.',
    'Flat gray SKIP = a dropped beat. Don’t tap!',
    'Keep the perfusion meter up. Under 30% is ISCHEMIA (he is delighted, then worried).',
    'Three phases: 72 → 96 → 120 BPM. About a minute. No fail state.',
  ]}
  keysHint="Tap or hold the screen / button · Space, J, K or F · Esc pauses"
  timeLeft={view.total ? view.time : null}
  timeTotal={view.total}
  countdownMs={BEAT_MS}
  oncountdown={beginCountdown}
  onplay={() => {}}
  onpause={onPause}
  onexit={onExit}
>
  {#snippet stage()}
    <div class="box" bind:this={box} role="img" aria-label={`Swinus Rhythms. ECG monitor and perfusion meter. Accuracy ${view.accuracy} percent.`}>
      <canvas
        bind:this={canvas}
        aria-hidden="true"
        onpointerdown={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          press(eventPerf(e));
        }}
        onpointerup={(e) => release(eventPerf(e))}
        onpointercancel={(e) => release(eventPerf(e))}
      ></canvas>
    </div>
  {/snippet}
  {#snippet hud()}
    <span class="stat"><small>ACCURACY</small>{view.accuracy.toFixed(0)}%</span>
    <span class="stat" class:hot={view.combo >= 10}><small>COMBO</small>{view.combo}</span>
  {/snippet}
  {#snippet controls()}
    <button
      class="px-btn blue pulse"
      class:holding={view.holding}
      tabindex="-1"
      aria-label="Pulse (tap or hold)"
      onpointerdown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        press(eventPerf(e));
      }}
      onpointerup={(e) => release(eventPerf(e))}
      onpointercancel={(e) => release(eventPerf(e))}
    >{view.holding ? 'HOLD…' : 'PULSE ♥'}</button>
  {/snippet}
  {#snippet stats(r)}
    <p>Accuracy {r.stats?.accuracy ?? 0}% · Perfusion {r.stats?.perfusion ?? 0}% · Perfect {r.stats?.perfect ?? 0} · Good {r.stats?.good ?? 0} · Miss {r.stats?.miss ?? 0} · Drains {r.stats?.drains ?? 0}</p>
  {/snippet}
</MinigameShell>

<style>
  .box { position: absolute; inset: 0; display: grid; place-items: center; }
  canvas { display: block; image-rendering: pixelated; cursor: pointer; touch-action: none; }
  .stat { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; font-size: 1.1rem; }
  .stat small { font-size: 0.7rem; opacity: 0.7; letter-spacing: 0.08em; }
  .stat.hot { color: var(--gold); }
  .pulse { width: min(420px, 100%); min-height: 56px; font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 0.1em; touch-action: none; }
  .pulse.holding { --btn-bg: #7fd6ff; --btn-ink: var(--ink); }
  @media (max-height: 460px) {
    .pulse { min-height: 44px; font-size: 1.05rem; }
    .stat { font-size: 0.95rem; }
  }
</style>
