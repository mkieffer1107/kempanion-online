<script lang="ts">
  // Shared chrome for every mini-game: how-to card, 3-2-1, pause, HUD frame, results + rewards.
  // The game renders its stage/HUD/controls through snippets and calls finish(outcome) when done.
  import type { Snippet } from 'svelte';
  import { onMount, tick } from 'svelte';
  import type { OutfitId, PigId } from '../../types';
  import type { MinigameMeta } from '../meta';
  import { resultLine } from '../meta';
  import type { MinigameOutcome, MinigameResult } from '../types';
  import type { Phase } from './types';
  import { audio } from '../../audio';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { canPlayMinigame, minigameReward } from '../../pet';
  import { iconUrl } from '../../content/icons';
  import { CHARACTERS } from '../../content/characters';
  import { faceUrl } from './sprites';

  interface Props {
    meta: MinigameMeta;
    pig: PigId;
    outfit?: OutfitId;
    rules: string[];
    keysHint: string;
    phase?: Phase;
    assist?: boolean;
    /** Seconds left / total for the timer bar (omit for round-based games). */
    timeLeft?: number | null;
    timeTotal?: number;
    countdownMs?: number;
    /** Called when "GO!" shows: start the run. */
    onplay: () => void;
    onpause?: (paused: boolean) => void;
    /** Called at the start of the 3-2-1 (e.g. to restart the song for rhythm sync). */
    oncountdown?: () => void;
    onexit: (r: MinigameResult | null) => void;
    stage: Snippet;
    hud?: Snippet;
    controls?: Snippet;
    stats?: Snippet<[MinigameResult]>;
  }

  let {
    meta, pig, outfit = 'everyday', rules, keysHint, phase = $bindable('howto'), assist = $bindable(false),
    timeLeft = null, timeTotal = 0, countdownMs = 700, onplay, onpause, oncountdown, onexit, stage, hud, controls, stats,
  }: Props = $props();

  let count = $state<string>('');
  let result = $state<MinigameResult | null>(null);
  let bestBefore = $state(0);
  let live = $state('');
  let startBtn = $state<HTMLButtonElement | null>(null);
  let doneBtn = $state<HTMLButtonElement | null>(null);
  let timers: ReturnType<typeof setTimeout>[] = [];

  const canPlay = $derived(canPlayMinigame(game.save, pig, now()));
  const pigName = $derived(CHARACTERS[pig]?.name ?? 'Piggy');
  const reduceMotion = $derived(game.save.settings.reduceMotion);
  const timePct = $derived(timeTotal > 0 && timeLeft != null ? Math.max(0, Math.min(1, timeLeft / timeTotal)) : null);
  const medalName = $derived(result?.medal && result.medal !== 'none' ? `${result.medal[0].toUpperCase()}${result.medal.slice(1)} medal` : 'No medal — still paid!');

  onMount(() => {
    assist = game.save.flags['minigame.assist'] === true;
    audio.playSong(meta.song);
    startBtn?.focus();
    const onVis = () => {
      if (document.visibilityState === 'hidden' && phase === 'play') pause();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      for (const t of timers) clearTimeout(t);
    };
  });

  function setAssist(on: boolean) {
    assist = on;
    game.setFlag('minigame.assist', on);
    audio.sfx('ui_toggle');
  }

  function begin() {
    if (phase !== 'howto' || !canPlay.ok) return;
    audio.sfx('ui_select');
    phase = 'countdown';
    oncountdown?.();
    const steps = ['3', '2', '1', 'GO!'];
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => {
        count = s;
        audio.sfx(s === 'GO!' ? 'whistle' : 'ui_move');
        if (s === 'GO!') {
          phase = 'play';
          announce('Go!');
          onplay();
          timers.push(setTimeout(() => (count = ''), 600));
        }
      }, i * countdownMs));
    });
  }

  export function pause() {
    if (phase !== 'play') return;
    phase = 'paused';
    audio.sfx('ui_open');
    onpause?.(true);
  }

  function resume() {
    if (phase !== 'paused') return;
    phase = 'play';
    audio.sfx('ui_close');
    onpause?.(false);
  }

  function quit() {
    audio.sfx('ui_back');
    onexit(null);
  }

  /** Called by the game when the run is over. */
  export function finish(outcome: MinigameOutcome) {
    if (phase === 'results') return;
    bestBefore = game.save.counters[`mg.${meta.id}.best`] ?? 0;
    result = minigameReward(game.save, meta.id, pig, { ...outcome, assist }, now());
    phase = 'results';
    audio.jingle(result.medal && result.medal !== 'none' ? 'victory' : 'bond_up');
    announce(`Finished! Score ${result.score}. ${medalName}. Plus ${result.money} acorns.`);
    void tick().then(() => doneBtn?.focus());
  }

  /** Screen-reader announcement (polite). */
  export function announce(text: string) {
    live = '';
    queueMicrotask(() => (live = text));
  }

  function done() {
    audio.sfx('ui_select');
    onexit(result);
  }

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const onControl = !!t && (t.tagName === 'BUTTON' || t.tagName === 'INPUT');
    if (e.key === 'Escape') {
      e.preventDefault();
      if (phase === 'play') pause();
      else if (phase === 'paused') resume();
      else if (phase === 'howto') quit();
    } else if ((e.key === 'Enter' || e.key === ' ') && !onControl) {
      if (phase === 'howto') {
        e.preventDefault();
        begin();
      } else if (phase === 'results') {
        e.preventDefault();
        done();
      }
    } else if ((e.key === 'p' || e.key === 'P') && phase === 'play') pause();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="mg" class:rm={reduceMotion} style:--pig={`var(--p${pig.slice(-1)})`}>
  <header class="top">
    <img class="face pixelated" src={faceUrl(pig, outfit)} alt="" width="48" height="48" />
    <div class="ttl">
      <span class="px-title name">{meta.title}</span>
      <span class="jp sub">{meta.jpTitle}</span>
    </div>
    <div class="hud" aria-live="off">{#if hud && phase !== 'howto'}{@render hud()}{/if}</div>
    {#if phase === 'play' || phase === 'paused'}
      <button class="px-btn ghost small pause" onclick={() => (phase === 'play' ? pause() : resume())} aria-label={phase === 'play' ? 'Pause' : 'Resume'}>
        {phase === 'play' ? 'II' : '▶'}
      </button>
    {:else}
      <button class="px-btn ghost small pause" onclick={quit} aria-label="Leave mini-game">✕</button>
    {/if}
  </header>
  {#if timePct !== null}
    <div class="timebar" role="progressbar" aria-label="Time left" aria-valuemin="0" aria-valuemax={timeTotal} aria-valuenow={Math.ceil(timeLeft ?? 0)}>
      <div class="fill" class:low={timePct < 0.2} style:width={`${timePct * 100}%`}></div>
    </div>
  {/if}

  <main class="stage">{@render stage()}</main>

  {#if controls && phase !== 'howto' && phase !== 'results'}
    <footer class="controls">{@render controls()}</footer>
  {/if}

  {#if phase === 'howto'}
    <div class="overlay" role="dialog" aria-modal="true" aria-label={`${meta.title} — how to play`}>
      <div class="px-panel card howto px-scroll">
        <div class="card-head">
          <img class="face big pixelated" src={faceUrl(pig, outfit)} alt="" width="48" height="48" />
          <div>
            <h2 class="px-title">{meta.title}</h2>
            <p class="jp kana">{meta.jpTitle} · with {pigName}</p>
          </div>
        </div>
        <p class="desc">{meta.desc}</p>
        <ul class="rules">
          {#each rules as r (r)}<li>{r}</li>{/each}
        </ul>
        <p class="keys">{keysHint}</p>
        <label class="assist">
          <input type="checkbox" checked={assist} onchange={(e) => setAssist((e.currentTarget as HTMLInputElement).checked)} />
          <span class="box" aria-hidden="true"></span>
          <span><b>Assist mode</b> — wider timing, slower pace. Pays full rewards.</span>
        </label>
        {#if !canPlay.ok}<p class="warn" role="alert">{canPlay.reason}</p>{/if}
        <div class="row">
          <button class="px-btn" onclick={quit}>Back</button>
          <button class="px-btn primary" bind:this={startBtn} onclick={begin} disabled={!canPlay.ok}>Start ▶</button>
        </div>
      </div>
    </div>
  {/if}

  {#if count}
    <div class="count" aria-hidden="true">
      {#key count}<span class="num" class:go={count === 'GO!'}>{count}</span>{/key}
    </div>
  {/if}

  {#if phase === 'paused'}
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Paused">
      <div class="px-panel dark card small-card">
        <h2 class="px-title">Paused</h2>
        <p>Take your time. {pigName} will wait.</p>
        <div class="row">
          <button class="px-btn" onclick={quit}>Quit (no reward)</button>
          <button class="px-btn primary" onclick={resume}>Resume ▶</button>
        </div>
      </div>
    </div>
  {/if}

  {#if phase === 'results' && result}
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Results">
      <div class="px-panel card results px-scroll">
        <div class="medal" class:none={result.medal === 'none'}>
          <img class="pixelated" src={iconUrl(result.medal && result.medal !== 'none' ? `medal_${result.medal}` : 'petal_pink')} alt="" width="64" height="64" />
          <div>
            <p class="medal-name px-title">{medalName}</p>
            <p class="score">{result.score}{#if result.score > bestBefore && bestBefore > 0}<span class="best blink">NEW BEST!</span>{/if}</p>
          </div>
        </div>
        {#if stats}<div class="stats">{@render stats(result)}</div>{/if}
        <ul class="rewards" aria-label="Rewards">
          <li><img class="pixelated" src={iconUrl('acorn')} alt="" width="20" height="20" /> +{result.money}{#if result.firstRun}<em> first run today!</em>{/if}</li>
          <li><span class="heart">♥</span> +{result.bond}</li>
          <li>Fun +{result.fun}</li>
          <li>Energy {result.energy ?? 0}</li>
          {#if result.hunger}<li>Tummy +{result.hunger}</li>{/if}
        </ul>
        <p class="line"><img class="face pixelated" src={faceUrl(pig, outfit)} alt="" width="48" height="48" /><span>“{resultLine(meta.id, pig, result.medal ?? 'none')}”</span></p>
        {#if result.assist}<p class="note">Assist mode — full rewards, as promised.</p>{/if}
        <div class="row">
          <button class="px-btn primary" bind:this={doneBtn} onclick={done}>Done</button>
        </div>
      </div>
    </div>
  {/if}

  <div class="visually-hidden" aria-live="polite">{live}</div>
</div>

<style>
  .mg {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    background: radial-gradient(ellipse at 50% 20%, var(--night-2), var(--night) 70%);
    color: var(--paper);
    padding: calc(var(--safe-top) + 4px) calc(var(--safe-right) + 6px) calc(var(--safe-bottom) + 4px) calc(var(--safe-left) + 6px);
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
  }
  .face {
    width: 36px;
    height: 36px;
    flex: none;
    border: var(--px) solid var(--pig);
    background: var(--ink-2);
  }
  .face.big { width: 56px; height: 56px; }
  .ttl { display: flex; flex-direction: column; line-height: 1.05; min-width: 0; flex: 0 1 auto; overflow: hidden; }
  .name { font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 0.7rem; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud { flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 10px; min-width: 0; font-family: var(--font-display); }
  .pause { min-width: 44px; min-height: 44px; }
  .timebar {
    height: calc(var(--px) * 3);
    margin: 2px 0 4px;
    background: var(--ink);
    border: var(--px) solid var(--ink);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
  }
  .timebar .fill { height: 100%; background: var(--sakura-3); transition: width 200ms steps(4); }
  .timebar .fill.low { background: var(--warn); }
  .stage {
    position: relative;
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    touch-action: none;
  }
  .controls {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding-top: 6px;
  }
  .overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: calc(var(--safe-top) + 8px) 12px calc(var(--safe-bottom) + 8px);
    background: rgba(16, 10, 36, 0.55);
    z-index: 10;
  }
  .card {
    width: min(440px, 100%);
    max-height: 100%;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: pop 240ms steps(4);
  }
  .rm .card, .rm .num { animation: none; }
  .small-card { width: min(360px, 100%); text-align: center; }
  .card h2 { margin: 0; font-size: 1.35rem; }
  .card p { margin: 0; }
  .card-head { display: flex; gap: 10px; align-items: center; }
  .kana { font-size: 0.8rem; opacity: 0.8; }
  .desc { font-size: 0.95rem; }
  .rules { margin: 0; padding-left: 1.1em; font-size: 0.9rem; display: grid; gap: 2px; }
  .keys { font-size: 0.8rem; opacity: 0.75; }
  .assist { display: flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; font-size: 0.85rem; }
  .assist input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .assist .box {
    flex: none;
    width: 24px;
    height: 24px;
    border: var(--px) solid var(--ink);
    background: #fff;
    box-shadow: inset calc(var(--px) * -1) calc(var(--px) * -1) 0 var(--paper-2);
  }
  .assist input:checked + .box { background: var(--sakura-3); box-shadow: inset 0 0 0 4px #fff; }
  .assist input:focus-visible + .box { outline: var(--px) dashed var(--gold); outline-offset: 2px; }
  .warn { color: #b02f08; font-size: 0.9rem; }
  .row { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px; }
  .small-card .row { justify-content: center; }
  .count {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 9;
  }
  .num {
    font-family: var(--font-display);
    font-size: clamp(64px, 18vmin, 140px);
    color: var(--gold);
    text-shadow: 4px 4px 0 var(--ink), -2px -2px 0 var(--ink), 2px -2px 0 var(--ink), -2px 2px 0 var(--ink);
    animation: count 600ms steps(6) both;
  }
  .num.go { color: var(--sakura-2); }
  .results { gap: 10px; }
  .medal { display: flex; align-items: center; gap: 12px; }
  .medal img { width: 64px; height: 64px; flex: none; }
  .medal-name { font-size: 1.1rem; }
  .medal.none .medal-name { font-size: 0.95rem; }
  .score { font-family: var(--font-display); font-size: 2rem; line-height: 1; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .best { font-size: 0.8rem; color: var(--sakura-4); }
  .stats { font-size: 0.85rem; }
  .rewards { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 0.95rem; }
  .rewards li { display: flex; align-items: center; gap: 4px; }
  .rewards em { font-style: normal; font-size: 0.75rem; color: var(--sakura-4); margin-left: 4px; }
  .heart { color: var(--sakura-4); }
  .line { display: flex; gap: 8px; align-items: center; font-size: 0.9rem; background: var(--paper-2); padding: 6px; }
  .note { font-size: 0.75rem; opacity: 0.75; }
  @keyframes pop {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes count {
    0% { transform: scale(1.6); opacity: 0; }
    30% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @media (max-width: 420px) {
    .sub { display: none; }
    .name { font-size: 0.9rem; }
    .hud { gap: 6px; }
  }
  @media (max-height: 460px) {
    .top { min-height: 40px; }
    .face { width: 28px; height: 28px; }
    .sub { display: none; }
    .card { padding: 10px 12px; gap: 6px; }
    .desc { display: none; }
  }
</style>
