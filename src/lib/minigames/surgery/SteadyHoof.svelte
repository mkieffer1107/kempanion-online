<script lang="ts">
  // Steady Hoof (id 'surgery') — Piggy 2's skills night in the Shands sim suite, with Gerald the training mannequin
  // supervising from a sticky note. One instrument tip, three 24 s stations on training models: close a seam (trace),
  // hold steady under the scope, set electrodes. Touch drags like a trackpad (relative, so the finger never hides the
  // tip), mouse/pen follow the pointer (absolute), keys move 8-way (Shift = fine). The tip sways a little and calms while
  // you breathe out with him. No buttons, no timed taps, no fail state.
  import { untrack } from 'svelte';
  import type { MinigameProps } from '../types';
  import MinigameShell from '../common/MinigameShell.svelte';
  import type { Phase } from '../common/types';
  import { META } from '../meta';
  import { PixelStage, prefersReducedMotion, rng } from '../common/pixel';
  import { Sprite, loadBackground } from '../common/sprites';
  import { iconCanvas } from '../common/icons';
  import { iconUrl } from '../../content/icons';
  import {
    GRADE_LABEL, KeyMotion, STATION_INFO, SteadyEngine, TOUCH_GAIN, WORK_SECONDS,
    type Input, type SFx, type StationId, type Vec,
  } from './engine';
  import { GRADE_COLOR, SurgeryPops, layout, renderSurgery, textScale, toPx, toTray } from './render';
  import { audio } from '../../audio';
  import type { SfxId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';

  let { pig, onExit }: MinigameProps = $props();
  const meta = META.surgery;
  const SONG = 'piggy2_theme';
  const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

  let phase = $state<Phase>('howto');
  let assist = $state(false);
  let shell = $state<ReturnType<typeof MinigameShell>>();
  let box = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let view = $state<{ station: number; name: string; score: number; time: number | null }>({ station: 1, name: STATION_INFO.close.name, score: 0, time: null });
  let fit = $state({ cssW: 0, cssH: 0, scale: 1, w: 480, h: 270 });
  let bubble = $state<{ text: string; icon: string | null } | null>(null);
  let mouseInControl = $state(false);

  const rm = $derived(prefersReducedMotion(game.save.settings.reduceMotion));
  const L = $derived(layout(fit.w, fit.h));
  const sprite = new Sprite('piggy-2', 'scrubs');
  const pops = new SurgeryPops();
  const keyMotion = new KeyMotion();
  // First run ever (the counter is bumped when rewards are applied): Station 1's card teaches the controls.
  const firstRun = (game.save.counters['mg.surgery.runs'] ?? 0) === 0;
  let coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  let px: PixelStage | null = null;
  let bg: HTMLImageElement | null = null;
  let engine: SteadyEngine | null = null;
  let base = 0;
  let pausedAt = 0;
  let lastT = 0;
  let lastFrame = 0;
  let finishTimer: ReturnType<typeof setTimeout> | null = null;
  let finishing = false;
  // input
  const keys = new Set<string>();
  let shift = false;
  let finger: { id: number; x: number; y: number } | null = null;
  let pending = { x: 0, y: 0 };
  let mouse: { x: number; y: number } | null = null;
  // Piggy 2 and Gerald
  let anim = { name: 'idle', start: 0, until: Infinity, then: 'surgical_focus' };
  let grinUntil = -1;
  // speech bubble: one line at a time, event lines at least 5 s apart, at most 2 waiting
  type Line = { text: string; icon: string | null };
  let queue: Line[] = [];
  let shown: (Line & { until: number }) | null = null;
  let talkClock = 0;
  let lastEventLine = -Infinity;
  // per-run moments
  let said = new Set<string>();
  let steadyStreak = 0;
  let rushLineAt = -Infinity;
  let whooshAt = -Infinity;
  let perfusionLineAt = Infinity;
  let later: { at: number; sfx: SfxId }[] = [];

  const OPENERS: Record<StationId, string> = {
    close: 'Needle driver. Trace the line. Slow is smooth.',
    scope: 'Micro-forceps. Four times magnified, so every sway shows. Breathe out. Hold.',
    place: 'Electrodes. Soft leads sway. Let them settle, then set.',
  };
  const CARD_ANIM: Record<StationId, string> = { close: 'preop_check', scope: 'review_mri', place: 'brain_model' };

  function introLine(): string {
    const gerald = 'Time-out. Patient: Gerald. Very compliant.';
    if ((game.save.counters['mg.surgery.runs'] ?? 0) === 0) return gerald;
    const bank = [gerald, 'PGY-4. Research year. Fewer OR days, so the hands get reps here.', 'Needle driver from my collection. Retired 2011. Practice only. Based.'];
    if (game.save.seenScenes.includes('p2_h3')) bank.push('Last time, scrub tech. Today, needle driver. Promotion. Based.');
    return bank[Math.floor(rng(Math.floor(now()) ^ 0x2b1d)() * bank.length)];
  }

  /** Queue a line in the bubble. Event lines respect the 5 s cooldown and are dropped when 2 are already waiting. */
  function say(text: string, icon: string | null = null, event = true): boolean {
    if (event) {
      if (talkClock - lastEventLine < 5 || queue.length >= 2) return false;
      lastEventLine = talkClock;
    }
    queue.push({ text, icon });
    return true;
  }

  /** Say a line once per run (retried on the next occurrence if the cooldown dropped it). */
  function sayOnce(key: string, text: string): void {
    if (said.has(key)) return;
    if (say(text)) said.add(key);
  }

  function tickBubble(): void {
    if (shown && talkClock >= shown.until) shown = null;
    if (!shown && queue.length) {
      const l = queue.shift()!;
      shown = { ...l, until: talkClock + Math.min(3, 1 + 0.035 * l.text.length) };
    }
    const next = shown ? { text: shown.text, icon: shown.icon } : null;
    if (next?.text !== bubble?.text || next?.icon !== bubble?.icon) bubble = next;
  }

  function setAnim(name: string, hold = false): void {
    const wall = performance.now();
    const loops = ['surgical_focus', 'write_chart', 'scrub_up', 'idle'].includes(name);
    const dur = sprite.duration(name);
    anim = {
      name, start: wall, until: loops || hold ? Infinity : wall + Math.max(900, dur + 300),
      then: engine?.ended ? 'write_chart' : 'surgical_focus',
    };
  }

  function clearInput(): void {
    keys.clear();
    shift = false;
    finger = null;
    pending = { x: 0, y: 0 };
    keyMotion.reset();
  }

  function onCountdown(): void {
    audio.playSong(SONG, { restart: true });
    setAnim('scrub_up');
    queue = [];
    shown = null;
    say(introLine(), null, false);
  }

  function startRun(): void {
    base = performance.now();
    engine = new SteadyEngine(Math.floor(now()) ^ 0x57ea, assist, rm);
    finishing = false;
    pops.clear();
    clearInput();
    said = new Set();
    steadyStreak = 0;
    rushLineAt = -Infinity;
    whooshAt = -Infinity;
    perfusionLineAt = Infinity;
    later = [];
    grinUntil = -1;
    view = { station: 1, name: STATION_INFO.close.name, score: 0, time: null };
  }

  function onPause(p: boolean): void {
    if (p) {
      pausedAt = performance.now();
      clearInput();
    } else base += performance.now() - pausedAt;
  }

  function sfx(id: SfxId): void {
    audio.sfx(id);
  }

  function popAt(text: string, u: Vec, color: string): void {
    if (!px) return;
    const p = toPx(L, u);
    pops.add(text, p.x, p.y - 6 - 7 * textScale(px.scale), color, 650, textScale(px.scale));
  }

  function popTop(text: string, color: string): void {
    if (!px) return;
    const ts = textScale(px.scale);
    pops.add(text, L.tray.x + L.tray.s / 2, L.tray.y + 8 + 8 * ts, color, 900, ts);
  }

  function summary(id: StationId, st: Record<string, number>): string {
    if (id === 'close') return `Closure done: ${st.stitches} stitches, ${st.neat} neat, ${st.watertight} of ${st.seams} seams watertight.`;
    if (id === 'scope') return `Scope work done: ${st.holds} holds, ${st.steady} steady.`;
    return `Electrodes done: ${st.contacts} contacts, ${st.perfect} perfect, ${st.cleanSets} clean signals.`;
  }

  function handleFx(f: SFx, t: number): void {
    const e = engine;
    if (!e) return;
    switch (f.kind) {
      case 'card': {
        const info = STATION_INFO[f.station];
        if (f.index > 0) sfx('ui_open');
        setAnim(CARD_ANIM[f.station], true);
        say(OPENERS[f.station], info.icon, false);
        rushLineAt = -Infinity;
        shell?.announce(`Station ${f.index + 1} of 3: ${info.name}. ${info.rule}`);
        break;
      }
      case 'work':
        setAnim('surgical_focus');
        if (f.station === 'scope' && !rm) perfusionLineAt = t + 1;
        break;
      case 'grade': {
        popAt(GRADE_LABEL[f.station][f.grade], { x: f.x, y: f.y }, GRADE_COLOR[f.grade]);
        if (f.station === 'close') {
          sfx(f.grade === 'top' ? 'ui_toggle' : 'ui_move');
          if (f.grade === 'top') sayOnce('neat', 'Neat. Based.');
        } else if (f.station === 'scope') {
          sfx(f.grade === 'top' ? 'sparkle' : f.grade === 'good' ? 'ui_select' : 'ui_move');
          steadyStreak = f.grade === 'top' ? steadyStreak + 1 : 0;
          if (steadyStreak >= 3) sayOnce('steady3', 'Three steady holds. Your hands are based.');
          if (f.grade === 'ok') sayOnce('shaky', 'Exhale first. Then hold.');
        } else {
          sfx('pet');
          if (f.grade === 'top') sayOnce('perfect', 'On the mark. Tiny contact. Huge data.');
        }
        break;
      }
      case 'bonus': {
        // Gerald grins when a bonus is paid (a rushed seam closes without one)
        if (f.points > 0) grinUntil = t + 1;
        if (f.id === 'watertight' || f.id === 'closed') {
          sfx('camera');
          later.push({ at: t + 0.2, sfx: f.id === 'watertight' ? 'build_ok' : 'tidy' });
        } else sfx(f.id === 'clean_signal' ? 'success' : 'monitor_beep');
        if (f.id === 'watertight') {
          popTop('WATERTIGHT!', '#ffd25a');
          setAnim('clinical_success');
          // the first line until it gets said (the cooldown can drop it), then "again" for the later ones
          if (!said.has('watertight')) sayOnce('watertight', 'Watertight. The CSF stays home. Based.');
          else say('Watertight again. Patriot.');
          shell?.announce('Seam closed. Watertight.');
        } else if (f.id === 'closed') {
          popTop('CLOSED', '#fff6ea');
          sayOnce('closed', 'Closed. A little loose. Gerald forgives you.');
          shell?.announce('Seam closed, a little loose.');
        } else if (f.id === 'clean_signal') {
          popTop('CLEAN SIGNAL!', '#ffd25a');
          setAnim('clinical_success');
          sayOnce('clean', 'Four clean channels. Piggy 3 will want to frame this.');
          shell?.announce('Set complete. Clean signal on all four channels.');
        } else {
          popTop('SIGNAL', '#fff6ea');
          sayOnce('signal', 'Noisy channel. Still data. Based data.');
          shell?.announce('Set complete. Signal recorded.');
        }
        break;
      }
      case 'rush':
        if (t - whooshAt >= 2) {
          whooshAt = t;
          sfx('whoosh');
        }
        if (anim.name === 'surgical_focus') setAnim('neuro_exam');
        if (t - rushLineAt >= 8 && say('Slow is smooth. Smooth is fast.')) rushLineAt = t;
        break;
      case 'off':
        say('Back to the needle.');
        break;
      case 'swing':
        sayOnce('swing', 'Let it settle. Soft leads sway.');
        break;
      case 'wrap':
        sfx('notify');
        if (f.station === 'close') say('Closure: done. Next, the scope.', null, false);
        else if (f.station === 'scope') say('Scope work: done. One more.', null, false);
        shell?.announce(summary(f.station, e.stats()));
        break;
      case 'end': {
        setAnim('clinical_success');
        anim.then = 'write_chart';
        const banana = game.save.flags.p2_h3_banana === true;
        say(banana ? 'Skills night complete. Banana after. Potassium. Based.' : 'Skills night complete. Gerald walks again. Spiritually.', null, false);
        break;
      }
    }
  }

  const DIRS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  };
  const KEY_FALLBACK: Record<string, string> = { a: 'KeyA', d: 'KeyD', w: 'KeyW', s: 'KeyS' };
  const keyCode = (e: KeyboardEvent): string => (e.code && DIRS[e.code] ? e.code : (KEY_FALLBACK[e.key.toLowerCase()] ?? e.key));

  function buildInput(dt: number): Input {
    const e = engine!;
    let abs: Vec | null = null;
    if (mouseInControl && mouse && px) {
      const p = px.toLogical(mouse.x, mouse.y);
      abs = toTray(L, p.x, p.y);
    }
    let dx = 0;
    let dy = 0;
    for (const k of keys) {
      const d = DIRS[k];
      if (d) {
        dx += d[0];
        dy += d[1];
      }
    }
    const km = keyMotion.step(Math.sign(dx), Math.sign(dy), shift, e.id === 'close', dt);
    const delta = { x: pending.x + km.x, y: pending.y + km.y };
    pending = { x: 0, y: 0 };
    const beat = audio.currentSong() === SONG ? audio.songBeat() : 0;
    return { abs, delta, beat: beat > 0 ? beat : undefined };
  }

  function render(t: number, wall: number): void {
    if (!px) return;
    renderSurgery(px.ctx, px.w, px.h, {
      engine, t, wall, bg, focusX: meta.focusX, sprite, anim, pops, reduceMotion: rm, ts: textScale(px.scale),
      grinUntil, firstRun, coarse, icon: iconCanvas,
    });
    px.present();
  }

  function frame(): void {
    const wall = performance.now();
    const dt = lastFrame ? Math.min(100, wall - lastFrame) : 16;
    lastFrame = wall;
    if (phase !== 'paused') {
      talkClock += dt / 1000;
      pops.update(dt);
    }
    let t = lastT;
    const e = engine;
    if (phase === 'play' && e && !e.ended) {
      t = (wall - base) / 1000;
      e.update(t, buildInput(dt / 1000));
      for (const f of e.takeFx()) handleFx(f, t);
      if (t >= perfusionLineAt) {
        perfusionLineAt = Infinity;
        say('That pulse is the pump. Perfusion. Beautiful.');
      }
      for (const l of later.filter((x) => t >= x.at)) sfx(l.sfx);
      later = later.filter((x) => t < x.at);
      const tl = e.timeLeft();
      const next = { station: e.station + 1, name: STATION_INFO[e.id].name, score: e.score, time: tl };
      const vt = view.time;
      if (next.station !== view.station || next.score !== view.score || (tl === null) !== (vt === null) || (tl !== null && vt !== null && Math.ceil(tl) !== Math.ceil(vt))) view = next;
      if (e.ended && !finishing) {
        finishing = true;
        view = { ...view, time: null };
        finishTimer = setTimeout(() => shell?.finish({ score: e.score, stats: e.stats() }), rm ? 500 : 1400);
      }
    }
    if (wall >= anim.until) setAnim(anim.then);
    tickBubble();
    lastT = t;
    render(t, wall);
  }

  function onKeyDown(e: KeyboardEvent): void {
    shift = e.shiftKey;
    if (phase !== 'play') return;
    const code = keyCode(e);
    if (!DIRS[code]) return;
    e.preventDefault();
    if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') (e.target as HTMLElement).blur();
    keys.add(code);
    mouseInControl = false;
  }

  function onKeyUp(e: KeyboardEvent): void {
    shift = e.shiftKey;
    keys.delete(keyCode(e));
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'touch') {
      e.preventDefault();
      coarse = true;
      if (finger) return; // only the first finger counts
      finger = { id: e.pointerId, x: e.clientX, y: e.clientY };
      mouseInControl = false;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        // a pointer that is already gone: the drag still works while it stays over the canvas
      }
    } else onPointerMove(e);
  }

  function onPointerMove(e: PointerEvent): void {
    if (e.pointerType === 'touch') {
      if (!finger || finger.id !== e.pointerId) return;
      if (phase === 'play') {
        pending.x += (e.clientX - finger.x) * TOUCH_GAIN;
        pending.y += (e.clientY - finger.y) * TOUCH_GAIN;
      }
      finger.x = e.clientX;
      finger.y = e.clientY;
      return;
    }
    mouse = { x: e.clientX, y: e.clientY };
    mouseInControl = true;
  }

  function onPointerUp(e: PointerEvent): void {
    // lifting does nothing: the hand stays put (the stillest a hand can be)
    if (finger && finger.id === e.pointerId) finger = null;
  }

  function measure(): void {
    if (!px || !box) return;
    px.resize(box.clientWidth, box.clientHeight);
    fit = { cssW: px.cssW, cssH: px.cssH, scale: px.scale, w: px.w, h: px.h };
  }

  // Set up once both refs exist (they live in the shell's snippet, so don't assume mount order).
  $effect(() => {
    const cv = canvas;
    const bx = box;
    if (!cv || !bx) return;
    return untrack(() => {
      px = new PixelStage(cv, { height: 270, minW: 150, maxW: 480 });
      const ro = new ResizeObserver(measure);
      ro.observe(bx);
      measure();
      void loadBackground(meta.bg).then((img) => (bg = img));
      void sprite.load(['idle', 'scrub_up', 'preop_check', 'review_mri', 'brain_model', 'surgical_focus', 'neuro_exam', 'clinical_success', 'write_chart']);
      if (DEBUG) {
        (window as unknown as Record<string, unknown>).__kpSurgery = {
          get engine() { return engine; },
          get layout() { return layout(px?.w ?? 480, px?.h ?? 270); },
          get scale() { return px?.scale ?? 1; },
          /** Tray units → client (CSS) coordinates, for driving the game from a test. */
          toClient(u: Vec) {
            if (!px) return null;
            const p = toPx(layout(px.w, px.h), u);
            const r = px.canvas.getBoundingClientRect();
            return { x: r.left + (p.x / px.w) * r.width, y: r.top + (p.y / px.h) * r.height };
          },
        };
      }
      let raf = requestAnimationFrame(function loop() {
        frame();
        raf = requestAnimationFrame(loop);
      });
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        if (finishTimer) clearTimeout(finishTimer);
        if (DEBUG) delete (window as unknown as Record<string, unknown>).__kpSurgery;
      };
    });
  });

  const stationLabel = $derived(`Steady Hoof. Station ${view.station} of 3: ${view.name}. Score ${view.score}.`);
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={clearInput} />

<MinigameShell
  bind:this={shell}
  bind:phase
  bind:assist
  {meta}
  {pig}
  outfit="scrubs"
  rules={[
    // one short line each (two on the narrowest phones), so Start shows without scrolling like the other games' cards
    'Drag anywhere to steer the tip, like a trackpad.',
    'Seam: trace the line; each blossom becomes a stitch. Don’t rush.',
    'Scope: keep the tip in the ring until it fills.',
    'Electrodes: carry each contact to its number, then hold still.',
    'The sway calms as you breathe out. 3 stations, 24 s each, no fail.',
  ]}
  keysHint="Drag · mouse · ←↑↓→ / WASD (Shift = fine) · Esc pauses"
  timeLeft={view.time}
  timeTotal={WORK_SECONDS}
  countdownMs={833}
  oncountdown={onCountdown}
  onplay={startRun}
  onpause={onPause}
  onexit={onExit}
>
  {#snippet stage()}
    <div class="box" bind:this={box} role="img" aria-label={stationLabel}>
      <div class="wrap" style:width={`${fit.cssW}px`} style:height={`${fit.cssH}px`}>
        <canvas
          bind:this={canvas}
          aria-hidden="true"
          class:nocursor={mouseInControl && phase === 'play'}
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
          onpointercancel={onPointerUp}
          onlostpointercapture={onPointerUp}
        ></canvas>
        {#if bubble}
          <p
            class="say"
            class:side={L.portrait}
            aria-hidden="true"
            style:left={`${L.say.x * fit.scale}px`}
            style:top={`${L.say.y * fit.scale}px`}
            style:max-width={`${L.say.w * fit.scale}px`}
            style:--tail={`${Math.max(12, (L.doc.x - L.say.x - 14) * fit.scale)}px`}
          >
            {#if bubble.icon}<img class="pixelated" src={iconUrl(bubble.icon)} alt="" width="24" height="24" />{/if}
            <span>{bubble.text}</span>
          </p>
        {/if}
      </div>
    </div>
  {/snippet}
  {#snippet hud()}
    <span class="stat"><small>STATION</small>{view.station}/3</span>
    <span class="stat"><small>SCORE</small>{view.score}</span>
  {/snippet}
  {#snippet stats(r)}
    {@const s = r.stats ?? {}}
    <p>Precision {s.precision ?? 0}% · Neat stitches {s.neat ?? 0}/{s.stitches ?? 0} · Watertight {s.watertight ?? 0} · Steady holds {s.steady ?? 0}/{s.holds ?? 0} · Perfect contacts {s.perfect ?? 0}/{s.contacts ?? 0}</p>
  {/snippet}
</MinigameShell>

<style>
  .box { position: absolute; inset: 0; display: grid; place-items: center; }
  .wrap { position: relative; }
  /* On fine pointers the app's pixel glove (styles/cursors.css, !important on every element) stays on the canvas outside
     play. During play, while the mouse or pen steers the tip, the glove would sit on top of the judged tip, so it goes:
     a class selector with !important beats that zero-specificity :where() rule. crosshair only shows where the glove
     theme doesn't apply (a coarse primary pointer with a trackpad or mouse attached). */
  canvas { display: block; image-rendering: pixelated; touch-action: none; cursor: crosshair; }
  canvas.nocursor { cursor: none !important; }
  .say {
    position: absolute;
    margin: 0;
    padding: 5px 8px 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #fff6ea;
    color: var(--ink);
    border: var(--px) solid var(--ink);
    font-size: clamp(12px, 3.2vw, 15px);
    line-height: 1.25;
    pointer-events: none;
    z-index: 2;
  }
  .say img { width: 24px; height: 24px; flex: none; image-rendering: pixelated; }
  /* tail: down toward Piggy 2 (landscape), or right toward him (portrait) */
  .say::after {
    content: '';
    position: absolute;
    left: min(var(--tail), calc(100% - 24px));
    bottom: calc(var(--px) * -1 - 14px);
    border: 7px solid transparent;
    border-top-color: var(--ink);
  }
  .say.side::after {
    left: auto;
    right: calc(var(--px) * -1 - 14px);
    bottom: auto;
    top: 10px;
    border-top-color: transparent;
    border-left-color: var(--ink);
  }
  .stat { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; font-size: 1.1rem; }
  .stat small { font-size: 0.7rem; opacity: 0.7; letter-spacing: 0.08em; }
  @media (max-height: 460px) {
    .stat { font-size: 0.95rem; }
  }
</style>
