<script lang="ts">
  // Bug Hunt — Piggy 3's PigScript debugging puzzle: 10 rounds, one broken line each, 12 s per round.
  import { tick as nextTick, untrack } from 'svelte';
  import type { MinigameProps } from '../types';
  import MinigameShell from '../common/MinigameShell.svelte';
  import type { Phase } from '../common/types';
  import { META } from '../meta';
  import { PixelStage, drawBackground } from '../common/pixel';
  import { Sprite, loadBackground } from '../common/sprites';
  import { generateGame, type BugRound } from './generator';
  import { audio } from '../../audio';
  import { now } from '../../state/clock';

  let { pig, onExit }: MinigameProps = $props();
  const meta = META.debug;
  const ROUNDS = 10;
  const HINT_AT = 6;

  type Step = 'intro' | 'hunting' | 'reveal' | 'coffee' | 'done';

  let phase = $state<Phase>('howto');
  let assist = $state(false);
  let shell = $state<ReturnType<typeof MinigameShell>>();
  let box = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let rounds = $state<BugRound[]>(generateGame(Math.floor(now())));
  let idx = $state(0);
  let step = $state<Step>('intro');
  let elapsed = $state(0);
  let hintUsed = $state(false);
  let picked = $state<number | null>(null);
  let outcome = $state<'correct' | 'wrong' | 'timeout' | null>(null);
  let score = $state(0);
  let correct = $state(0);
  let hints = $state(0);
  let lastPoints = $state(0);
  let bubble = $state("Okay, so I was thinking we could fix some bugs together. Here, I'll drive.");
  let nextBtn = $state<HTMLButtonElement | null>(null);
  let lineBtns = $state<HTMLButtonElement[]>([]);

  const limit = $derived(assist ? 20 : 12);
  const round = $derived(rounds[idx]);
  const timeLeft = $derived(Math.max(0, limit - elapsed));
  const hintReady = $derived(step === 'hunting' && elapsed >= HINT_AT && !hintUsed);

  const p3 = new Sprite('piggy-3', 'hoodie');
  let px: PixelStage | null = null;
  let bg: HTMLImageElement | null = null;
  let anim = { name: 'invite_to_code', start: 0, then: 'typing' };
  let roundStart = 0;
  let pausedAt = 0;
  let paused = false;
  let advanceTimer: ReturnType<typeof setTimeout> | null = null;

  function setAnim(name: string, then = 'typing') {
    anim = { name, start: performance.now(), then };
  }

  function say(text: string) {
    bubble = text;
  }

  function startRound(i: number) {
    idx = i;
    step = 'hunting';
    elapsed = 0;
    hintUsed = false;
    picked = null;
    outcome = null;
    roundStart = performance.now();
    setAnim('typing');
    say(`Okay, so this one is supposed to: ${round.title.toLowerCase()}. One line is broken.`);
    audio.sfx('typing');
    shell?.announce(`Round ${i + 1} of ${ROUNDS}: ${round.title}. ${round.lines.length} lines. Find the broken one.`);
  }

  function begin() {
    rounds = generateGame(Math.floor(now()) ^ 0xb06);
    score = 0;
    correct = 0;
    hints = 0;
    startRound(0);
  }

  function useHint() {
    if (!hintReady) return;
    hintUsed = true;
    hints += 1;
    audio.sfx('sparkle');
    setAnim('ai_idea');
    say('Okay, I have an idea… it is one of the glowing lines. (−2)');
  }

  function judge(i: number | null) {
    if (step !== 'hunting') return;
    picked = i;
    step = 'reveal';
    const r = round;
    const lineNo = r.bugLine + 1;
    if (i === r.bugLine) {
      outcome = 'correct';
      lastPoints = 10 + Math.ceil(timeLeft) - (hintUsed ? 2 : 0);
      score += lastPoints;
      correct += 1;
      audio.sfx('build_ok');
      setAnim('build_success', 'explain_code');
      say(`Found it! ${r.explanation}`);
    } else {
      outcome = i === null ? 'timeout' : 'wrong';
      lastPoints = 0;
      audio.sfx(i === null ? 'alarm' : 'question');
      setAnim('debugging', 'explain_code');
      say(`${i === null ? 'Time!' : 'Not quite —'} it was line ${lineNo}. ${r.explanation}`);
    }
    shell?.announce(`${outcome === 'correct' ? `Correct, plus ${lastPoints}.` : `The bug was on line ${lineNo}.`} ${r.explanation.replace(/`/g, '')}`);
    void nextTick().then(() => nextBtn?.focus());
    advanceTimer = setTimeout(next, 9000);
  }

  function next() {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = null;
    if (step !== 'reveal') return;
    if (idx + 1 >= ROUNDS) {
      step = 'done';
      const gold = correct >= ROUNDS;
      setAnim(gold ? 'build_success' : 'code_review', 'code_review');
      say(gold ? 'Ten for ten. Okay, I am framing this terminal.' : 'Okay, code review time. Let me see how we did.');
      shell?.finish({ score, stats: { correct, hints, rounds: ROUNDS } });
      return;
    }
    if (idx + 1 === 5) {
      step = 'coffee';
      setAnim('coffee_break', 'typing');
      say('Coffee break. Basically just me and a cold brew for two seconds.');
      advanceTimer = setTimeout(() => step === 'coffee' && startRound(5), 2400);
      return;
    }
    startRound(idx + 1);
  }

  function skipCoffee() {
    if (step !== 'coffee') return;
    if (advanceTimer) clearTimeout(advanceTimer);
    startRound(5);
  }

  function onPause(p: boolean) {
    paused = p;
    if (p) {
      pausedAt = performance.now();
      if (advanceTimer) clearTimeout(advanceTimer);
      advanceTimer = null;
    } else {
      roundStart += performance.now() - pausedAt;
      if (step === 'reveal') advanceTimer = setTimeout(next, 9000);
      else if (step === 'coffee') advanceTimer = setTimeout(() => step === 'coffee' && startRound(5), 1200);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (phase !== 'play') return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (step === 'hunting') {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= round.lines.length) {
        e.preventDefault();
        judge(n - 1);
      } else if (e.key === 'h' || e.key === 'H') useHint();
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && tag !== 'BUTTON') {
        e.preventDefault();
        lineBtns[e.key === 'ArrowDown' ? 0 : round.lines.length - 1]?.focus();
      }
    } else if (step === 'coffee' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      skipCoffee();
    }
  }

  function lineKey(e: KeyboardEvent, i: number) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const j = (i + (e.key === 'ArrowDown' ? 1 : -1) + round.lines.length) % round.lines.length;
      lineBtns[j]?.focus();
    }
  }

  // ── tiny PigScript highlighter ──
  const KW = new Set(['def', 'for', 'in', 'while', 'if', 'elif', 'else', 'return', 'break', 'and', 'or', 'not', 'True', 'False', 'None']);
  type Tok = { text: string; cls: string };
  function tokens(line: string): Tok[] {
    const out: Tok[] = [];
    const re = /("[^"]*"?|'[^']*'?)|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m[1]) out.push({ text: m[1], cls: 'str' });
      else if (m[2]) out.push({ text: m[2], cls: 'num' });
      else if (m[3]) out.push({ text: m[3], cls: KW.has(m[3]) ? 'kw' : line[re.lastIndex] === '(' ? 'fn' : 'id' });
      else out.push({ text: m[0], cls: m[4] ? 'sp' : 'op' });
    }
    return out;
  }
  function codeSpans(text: string): { text: string; code: boolean }[] {
    return text.split('`').map((t, i) => ({ text: t, code: i % 2 === 1 }));
  }

  function render(wall: number) {
    if (!px) return;
    const { ctx, w, h } = px;
    ctx.clearRect(0, 0, w, h);
    drawBackground(ctx, bg, w, h, 300);
    const ms = wall - anim.start;
    const dur = p3.duration(anim.name);
    const loops = ['typing', 'explain_code', 'code_review', 'coffee_break'].includes(anim.name);
    if (!loops && dur && ms > dur + 250) setAnim(anim.then, anim.then);
    p3.draw(ctx, anim.name, ms, Math.round(w / 2), h - 2);
    px.present();
  }

  function tick() {
    const wall = performance.now();
    if (phase === 'play' && step === 'hunting' && !paused) {
      elapsed = (wall - roundStart) / 1000;
      if (elapsed >= HINT_AT && !hintUsed && anim.name === 'typing') {
        setAnim('ai_idea', 'debugging');
        say('Okay, I have an idea… want a hint? (H, costs 2)');
      }
      if (elapsed >= limit) judge(null);
    }
    render(wall);
  }

  // Set up once both refs exist (they live in the shell's snippet, so don't assume mount order).
  $effect(() => {
    const cv = canvas;
    const bx = box;
    if (!cv || !bx) return;
    return untrack(() => {
      px = new PixelStage(cv, { height: 120, minW: 110, maxW: 220 });
      const ro = new ResizeObserver(() => box && px?.resize(box.clientWidth, box.clientHeight));
      ro.observe(bx);
      px.resize(bx.clientWidth, bx.clientHeight);
      void loadBackground(meta.bg).then((img) => (bg = img));
      void p3.load(['typing', 'debugging', 'explain_code', 'ai_idea', 'code_review', 'build_success', 'coffee_break', 'invite_to_code', 'idle']);
      anim = { name: 'invite_to_code', start: performance.now(), then: 'typing' };
      let raf = requestAnimationFrame(function loop() {
        tick();
        raf = requestAnimationFrame(loop);
      });
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        if (advanceTimer) clearTimeout(advanceTimer);
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
  outfit="hoodie"
  rules={[
    'Each round shows a tiny PigScript program with exactly one broken line.',
    'Tap the broken line within 12 seconds. Points: 10 + seconds left.',
    'After 6 seconds Piggy 3 offers a hint that highlights 3 lines (−2 points).',
    'Rounds 1–3: typos and wrong numbers. 4–7: logic bugs. 8–10: off-by-ones and friends.',
    'No game over — a missed bug just gets explained.',
  ]}
  keysHint="Tap a line · keys 1–7 or ↑↓ + Enter · H = hint · Esc pauses"
  timeLeft={phase === 'play' && step === 'hunting' ? timeLeft : null}
  timeTotal={limit}
  onplay={begin}
  onpause={onPause}
  onexit={onExit}
>
  {#snippet stage()}
    <div class="bh">
      <div class="cv" bind:this={box} role="img" aria-label="Piggy 3 in his black hoodie at the physics lab computer">
        <canvas bind:this={canvas} aria-hidden="true"></canvas>
      </div>
      <p class="bubble">
        {#each codeSpans(bubble) as s, i (i)}{#if s.code}<code>{s.text}</code>{:else}{s.text}{/if}{/each}
      </p>
      {#if round}
        <header class="task">
          <span class="round">Round {idx + 1}/{ROUNDS}</span>
          <span class="title">“{round.title}”</span>
        </header>
        <ol class="code px-panel dark" aria-label="Code">
          {#each round.lines as line, i (i)}
            {@const isBug = i === round.bugLine}
            {@const hinted = hintUsed && step === 'hunting' && round.hintLines.includes(i)}
            <li>
              <button
                bind:this={lineBtns[i]}
                class="line"
                class:hint={hinted}
                class:bug={step !== 'hunting' && isBug}
                class:wrong={step !== 'hunting' && picked === i && !isBug}
                disabled={step !== 'hunting' || phase !== 'play'}
                onclick={() => judge(i)}
                onkeydown={(e) => lineKey(e, i)}
                aria-label={`Line ${i + 1}: ${line.trim()}`}
              >
                <span class="ln" aria-hidden="true">{i + 1}</span>
                <span class="src" aria-hidden="true">{#each tokens(line) as tk, k (k)}<span class={tk.cls}>{tk.text}</span>{/each}</span>
              </button>
              {#if step !== 'hunting' && isBug}
                <div class="fix" aria-label={`Fixed: ${round.correct[i].trim()}`}><span class="ln">✓</span><span class="src">{round.correct[i]}</span></div>
              {/if}
            </li>
          {/each}
        </ol>
        <footer class="foot">
          <span class="pts">
            {#if step === 'reveal'}{outcome === 'correct' ? `+${lastPoints}` : '+0'}{:else}Score {score}{/if}
          </span>
          {#if step === 'hunting'}
            <span class="secs" class:low={timeLeft < 4}>{Math.ceil(timeLeft)}s</span>
            <button class="px-btn small" disabled={!hintReady} onclick={useHint}>{hintUsed ? 'Hint used' : 'Hint −2'}</button>
          {:else if step === 'reveal'}
            <button class="px-btn primary small" bind:this={nextBtn} onclick={next}>{idx + 1 >= ROUNDS ? 'Results ▶' : 'Next ▶'}</button>
          {:else if step === 'coffee'}
            <button class="px-btn small" onclick={skipCoffee}>☕ Skip break</button>
          {/if}
        </footer>
      {/if}
    </div>
  {/snippet}
  {#snippet hud()}
    <span class="stat"><small>SCORE</small>{score}</span>
    <span class="stat"><small>FOUND</small>{correct}/{ROUNDS}</span>
  {/snippet}
  {#snippet stats(r)}
    <p>Bugs found {r.stats?.correct ?? 0}/10 · Hints {r.stats?.hints ?? 0}{(r.stats?.correct ?? 0) >= 10 && (r.stats?.hints ?? 0) === 0 ? ' · Zero-Day Hunter!' : ''}</p>
  {/snippet}
</MinigameShell>

<style>
  .bh {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-areas: 'cv bubble' 'task task' 'code code' 'foot foot';
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    gap: 6px 8px;
    padding: 2px;
  }
  .cv { grid-area: cv; position: relative; width: clamp(92px, 26vw, 140px); aspect-ratio: 11 / 12; display: grid; place-items: center; }
  .cv canvas { display: block; image-rendering: pixelated; }
  .bubble {
    grid-area: bubble;
    align-self: center;
    margin: 0;
    padding: 8px 10px;
    background: var(--paper);
    color: var(--ink);
    border: var(--px) solid var(--ink);
    font-size: clamp(0.8rem, 2.6vw, 0.95rem);
    line-height: 1.3;
  }
  .bubble code { font-family: var(--font-body); background: var(--sakura-1); padding: 0 2px; }
  .task { grid-area: task; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; font-size: 0.9rem; }
  .round { font-family: var(--font-display); color: var(--p3); }
  .title { opacity: 0.9; }
  .code {
    grid-area: code;
    list-style: none;
    margin: 0;
    padding: 4px;
    display: flex;
    flex-direction: column;
    overflow: auto;
    min-height: 0;
  }
  .code li { display: flex; flex-direction: column; }
  .line, .fix {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    padding: 2px 6px;
    background: transparent;
    color: var(--paper);
    border: 2px solid transparent;
    text-align: left;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: clamp(12px, 3.6vw, 17px);
    font-variant-ligatures: none;
  }
  .line:hover:not(:disabled), .line:focus-visible { background: rgba(255, 183, 197, 0.14); border-color: var(--sakura-2); outline: none; }
  .line:disabled { cursor: default; color: var(--paper); }
  .line.hint { background: rgba(255, 210, 90, 0.18); border-color: var(--gold); }
  .line.bug { background: rgba(255, 90, 95, 0.22); border-color: var(--bad); }
  .line.bug .src { text-decoration: line-through; text-decoration-color: var(--bad); }
  .line.wrong { border-color: var(--warn); }
  .fix { cursor: default; min-height: 32px; color: var(--ok); background: rgba(91, 209, 107, 0.12); }
  .fix .src { color: var(--ok); }
  .ln { flex: none; width: 1.4em; text-align: right; opacity: 0.55; }
  .src { white-space: pre; overflow: hidden; }
  .kw { color: #ff8fb1; }
  .str { color: #9be59b; }
  .num { color: var(--gold); }
  .fn { color: #8fd3ff; }
  .op { color: #e6d9ff; }
  .foot { grid-area: foot; display: flex; align-items: center; gap: 10px; justify-content: flex-end; min-height: 44px; }
  .pts { margin-right: auto; font-family: var(--font-display); }
  .secs { font-family: var(--font-display); font-size: 1.2rem; min-width: 2.5em; text-align: right; }
  .secs.low { color: var(--warn); }
  .stat { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; font-size: 1.1rem; }
  .stat small { font-size: 0.6rem; opacity: 0.7; letter-spacing: 0.08em; }
  @media (min-aspect-ratio: 5/4) {
    .bh {
      grid-template-areas: 'cv task' 'cv code' 'bubble code' 'foot code';
      grid-template-columns: minmax(150px, 32%) 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
    }
    .cv { width: 100%; height: 100%; aspect-ratio: auto; min-height: 90px; }
    .foot { justify-content: flex-start; flex-wrap: wrap; }
    .pts { margin-right: 0; }
  }
  @media (max-height: 460px) {
    .task { display: none; }
    .bubble { padding: 4px 8px; font-size: 0.78rem; }
  }
</style>
