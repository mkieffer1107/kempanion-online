<script lang="ts">
  // KEMPA AI studio sting: black → emblem + wordmark dither in (4x4 Bayer) with the Kempa chime →
  // "presents" types with system ticks while a petal drifts → dither out → title.
  // 2.8 s; 1.2 s from the 3rd launch on. Any input skips.
  import '../meta/meta.css';
  import { game } from '../../state/game.svelte';
  import { EMBLEM_PALETTE, sakuraSnout } from '../meta/emblem';
  import { glyphRuns, glyphSize } from '../meta/glyphs';
  import { bumpLaunches } from '../meta/launches';
  import { motion } from '../meta/motion.svelte';
  import { blip, initAudio, playSong } from '../meta/sfx';

  const short = bumpLaunches() >= 3;
  const reduced = motion.reduced;

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  /** Data-URL 4x4 mask revealing Bayer cells below `level` (0..16). */
  function bayerMask(level: number): string {
    let rects = '';
    for (let i = 0; i < 16; i++) {
      if (BAYER[i] < level) rects += `<rect x='${i % 4}' y='${i >> 2}' width='1' height='1'/>`;
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'>${rects}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const emblem = { rows: sakuraSnout(21), palette: EMBLEM_PALETTE };
  const emblemSize = glyphSize(emblem);
  const emblemRuns = glyphRuns(emblem);

  // one emblem pixel = k CSS px (also the dither cell size)
  const k = Math.max(3, Math.min(8, Math.round(Math.min(innerWidth, innerHeight) / 95)));

  let level = $state(0);
  let typed = $state(0);
  let petal = $state(false);
  let fadeText = $state(false);
  let left = false;
  const WORD = 'presents';

  const mask = $derived(level > 0 && level < 16 ? bayerMask(level) : 'none');

  function leave() {
    if (left) return;
    left = true;
    game.go('title');
  }

  function skip() {
    void initAudio(); // in case the gate was bypassed, this input can unlock audio too
    leave();
  }

  $effect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const T = short
      ? { song: 100, inStart: 100, inStep: 100, inSteps: 4, type: 520, typeStep: 34, out: 1000, outStep: 100, outSteps: 2, end: 1200 }
      : { song: 400, inStart: 400, inStep: 100, inSteps: 8, type: 1250, typeStep: 75, out: 2400, outStep: 100, outSteps: 4, end: 2800 };

    at(T.song, () => playSong('kempa_logo', { restart: true }));
    if (reduced) {
      at(T.inStart, () => (level = 16));
      at(T.type, () => (typed = WORD.length));
      at(T.out, () => {
        fadeText = true;
        level = 0;
      });
    } else {
      for (let i = 1; i <= T.inSteps; i++) at(T.inStart + T.inStep * (i - 1), () => (level = Math.round((16 * i) / T.inSteps)));
      at(T.type, () => (petal = true));
      for (let i = 1; i <= WORD.length; i++) {
        at(T.type + T.typeStep * i, () => {
          typed = i;
          blip('system');
        });
      }
      for (let i = 1; i <= T.outSteps; i++) {
        at(T.out + T.outStep * (i - 1), () => {
          level = Math.round(16 - (16 * i) / T.outSteps);
          fadeText = true;
        });
      }
    }
    at(T.end, leave);
    return () => timers.forEach(clearTimeout);
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'Tab') return;
    e.preventDefault();
    skip();
  }
</script>

<svelte:window {onkeydown} />

<div
  class="km-screen splash"
  class:reduced
  role="button"
  tabindex="-1"
  aria-label="Kempa AI presents. Press any key to skip."
  onclick={skip}
  onkeydown={() => {}}
  style:--k="{k}px"
>
  <div class="mark" class:shown={level > 0} style="mask-image: {mask}; -webkit-mask-image: {mask};">
    <svg
      class="emblem"
      width={emblemSize.w * k}
      height={emblemSize.h * k}
      viewBox="0 0 {emblemSize.w} {emblemSize.h}"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      {#each emblemRuns as r, i (i)}
        <rect x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />
      {/each}
    </svg>
    <p class="wordmark" aria-hidden="true"><span>KEMPA&nbsp;AI</span></p>
  </div>
  <p class="presents" class:fade={fadeText} aria-hidden="true">{WORD.slice(0, typed)}<span class="ghost">{WORD.slice(typed)}</span></p>
  {#if petal}
    <svg class="petal" width={5 * k} height={4 * k} viewBox="0 0 5 4" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="1" y="0" width="3" height="1" fill="#f49ac1" />
      <rect x="0" y="1" width="1" height="2" fill="#f49ac1" />
      <rect x="1" y="1" width="2" height="1" fill="#ffe3ea" />
      <rect x="3" y="1" width="2" height="2" fill="#f49ac1" />
      <rect x="1" y="2" width="1" height="1" fill="#ffe3ea" />
      <rect x="2" y="2" width="1" height="1" fill="#f49ac1" />
      <rect x="1" y="3" width="3" height="1" fill="#d9578c" />
    </svg>
  {/if}
</div>

<style>
  .splash {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: calc(var(--k) * 3);
    background: #000;
    cursor: pointer;
    outline: none;
  }
  .mark {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--k) * 2);
    visibility: hidden;
    mask-size: calc(var(--k) * 4) calc(var(--k) * 4);
    -webkit-mask-size: calc(var(--k) * 4) calc(var(--k) * 4);
    mask-repeat: repeat;
    -webkit-mask-repeat: repeat;
  }
  .mark.shown { visibility: visible; }
  .reduced .mark { visibility: visible; opacity: 0; transition: opacity 200ms linear; }
  .reduced .mark.shown { opacity: 1; }
  .emblem { display: block; }
  .wordmark {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: calc(var(--k) * 9);
    line-height: 1;
    letter-spacing: 0.12em;
    white-space: nowrap;
    filter:
      drop-shadow(calc(var(--k) * 0.5) 0 0 #7a2850)
      drop-shadow(calc(var(--k) * -0.5) 0 0 #7a2850)
      drop-shadow(0 calc(var(--k) * 0.5) 0 #7a2850)
      drop-shadow(0 calc(var(--k) * -0.5) 0 #7a2850)
      drop-shadow(0 var(--k) 0 #3a1530);
  }
  .wordmark span {
    background: linear-gradient(180deg, #fff6ea 0 38%, #ffd6e0 38% 62%, #f49ac1 62% 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }
  .presents {
    margin: 0;
    min-height: 1.4em;
    font-family: var(--font-body);
    font-size: max(16px, calc(var(--k) * 3));
    letter-spacing: 0.4em;
    color: rgba(255, 246, 234, 0.85);
    transition: opacity 300ms steps(3);
  }
  .presents.fade { opacity: 0; }
  .ghost { visibility: hidden; }
  .petal {
    position: absolute;
    top: 30%;
    left: -10%;
    animation: drift 1.6s steps(20) forwards;
  }
  @keyframes drift {
    0% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(60vw, 10vh) rotate(90deg); }
    100% { transform: translate(120vw, 18vh) rotate(180deg); }
  }
</style>
