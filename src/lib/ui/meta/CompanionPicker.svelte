<script lang="ts">
  // "Who's your Kempanion?" — three VN profile cards. Used by the Select screen and, as a modal overlay,
  // by the KScript [companion pick] hook. ←/→ or 1–3 switch, Enter chooses, swipe on touch.
  import './meta.css';
  import { PIG_IDS, type Expression, type PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { bgUrl, faceUrl, firstBackground } from './assets';
  import { PICKED, pickReactions, type MetaLine } from './content';
  import PortraitImg from './PortraitImg.svelte';
  import ProfileCard from './ProfileCard.svelte';
  import PixelGlyph from './PixelGlyph.svelte';
  import VnLine from './VnLine.svelte';
  import { motion } from './motion.svelte';
  import { jingle, ui } from './sfx';

  let {
    mode = 'screen',
    reactions = false,
    initial,
    onChosen,
    onBack,
  }: {
    mode?: 'screen' | 'overlay';
    /** Play the chosen pig's signature line and the other two's warm reactions before finishing. */
    reactions?: boolean;
    initial?: PigId;
    onChosen: (pig: PigId) => void;
    onBack?: () => void;
  } = $props();

  const HOME_BG: Record<PigId, string[]> = {
    'piggy-1': ['malachowsky', 'volleyball_courts', 'century_tower'],
    'piggy-2': ['communicore', 'or_suite', 'century_tower'],
    'piggy-3': ['physics', 'physics_lab', 'century_tower'],
  };

  const overlay = $derived(mode === 'overlay');
  const startIndex = () => Math.max(0, PIG_IDS.indexOf(initial ?? game.save.companion ?? 'piggy-1'));
  let idx = $state(startIndex());
  let mainEl = $state<HTMLDivElement>();
  let dir = $state(1);
  let phase = $state<'browse' | 'chosen' | 'talk'>('browse');
  let expression = $state<Expression>('neutral');
  let speaker = $state<PigId | null>(null);
  let talkLines = $state<MetaLine[]>([]);
  let chooseBtn = $state<HTMLButtonElement>();

  const pig = $derived(PIG_IDS[idx]);
  const shown = $derived(phase === 'talk' && speaker ? speaker : pig);
  const bg = $derived(firstBackground(HOME_BG[shown]));

  // neutral → happy 600 ms after a pig gets focus
  $effect(() => {
    void pig;
    if (phase !== 'browse') return;
    expression = 'neutral';
    const t = setTimeout(() => (expression = 'happy'), motion.reduced ? 0 : 600);
    return () => clearTimeout(t);
  });

  function go(i: number) {
    if (phase !== 'browse') return;
    const n = (i + PIG_IDS.length) % PIG_IDS.length;
    if (n === idx) return;
    dir = n > idx || (idx === PIG_IDS.length - 1 && n === 0) ? 1 : -1;
    idx = n;
    ui.move();
  }

  function choose() {
    if (phase !== 'browse') return;
    const p = pig;
    phase = 'chosen';
    expression = PICKED[p].expression;
    ui.select();
    jingle('bond_up');
    game.save.companion = p;
    game.persist();
    setTimeout(() => {
      if (reactions) {
        talkLines = pickReactions(p);
        phase = 'talk';
      } else {
        onChosen(p);
      }
    }, motion.reduced ? 600 : 1300);
  }

  function onLine(_i: number, line: MetaLine) {
    if (line.speaker === 'piggy-1' || line.speaker === 'piggy-2' || line.speaker === 'piggy-3') {
      speaker = line.speaker;
      expression = line.expression ?? 'neutral';
    }
  }

  function key(e: KeyboardEvent) {
    if (phase === 'talk') return; // VnLine owns the keys now
    const t = e.target as HTMLElement | null;
    const onButton = !!t && t.tagName === 'BUTTON';
    let handled = true;
    if (phase === 'chosen') {
      // swallow the game keys during the stamp
      handled = ['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'z', 'Z', '1', '2', '3', 'Escape'].includes(e.key);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === ']') go(idx + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === '[') go(idx - 1);
    else if (e.key === '1' || e.key === '2' || e.key === '3') go(Number(e.key) - 1);
    else if ((e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') && !onButton) {
      if (!e.repeat) choose();
    } else if ((e.key === 'Escape' || e.key === 'Backspace') && onBack && !overlay) {
      ui.back();
      onBack();
    } else handled = false;
    if (handled) e.preventDefault();
    if (overlay && (handled || e.key !== 'Tab')) e.stopImmediatePropagation();
  }

  $effect(() => {
    const opts = { capture: overlay };
    addEventListener('keydown', key, opts);
    let prev: HTMLElement | null = null;
    if (overlay) {
      prev = document.activeElement as HTMLElement | null;
      queueMicrotask(() => chooseBtn?.focus());
    }
    return () => {
      removeEventListener('keydown', key, opts);
      prev?.focus?.();
    };
  });

  // swipe left/right on the stage or card (touch/pen only)
  $effect(() => {
    const el = mainEl;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let swiping = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      sx = e.clientX;
      sy = e.clientY;
      swiping = true;
    };
    const up = (e: PointerEvent) => {
      if (!swiping) return;
      swiping = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(idx + (dx < 0 ? 1 : -1));
    };
    const cancel = () => (swiping = false);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  });
</script>

<div
  class="km-screen picker"
  class:overlay
  class:km-reduced={motion.reduced}
  role={overlay ? 'dialog' : undefined}
  aria-modal={overlay ? 'true' : undefined}
  aria-labelledby="pick-title"
>
  <div class="km-wallpaper" aria-hidden="true"></div>

  <header class="head">
    <h1 id="pick-title" class="km-title title">WHO'S YOUR KEMPANION?</h1>
    <span class="km-jp jp" aria-hidden="true">あなたのケンパニオンは？</span>
    <p class="sub">You'll meet all three. Who shows you around first?</p>
  </header>

  <div class="main" bind:this={mainEl}>
    <div class="km-window stage">
      {#if bg}
        <div class="km-cover home" style:background-image="url({bgUrl(bg)})" aria-hidden="true"></div>
      {:else}
        <div class="home fallback" aria-hidden="true"></div>
      {/if}
      {#key shown}
        <div class="portrait" class:from-left={dir < 0} style:--pig={CHARACTERS[shown].color}>
          <PortraitImg pig={shown} {expression} />
        </div>
      {/key}
      {#if phase === 'chosen'}
        <div class="stamp" role="status">
          <span class="km-jp kanji" aria-hidden="true">決定!</span>
          <span class="km-title paired">PAIRED WITH {CHARACTERS[pig].name.toUpperCase()}</span>
        </div>
        {#if !motion.reduced}
          <div class="hearts" aria-hidden="true">
            <span><PixelGlyph name="heart" scale={3} color="var(--sakura-3)" /></span>
            <span><PixelGlyph name="heart" scale={4} color="var(--sakura-3)" /></span>
            <span><PixelGlyph name="heart" scale={3} color="var(--sakura-3)" /></span>
          </div>
        {/if}
      {/if}
      {#if phase === 'browse'}
        <button class="arrow left" aria-label="Previous pig" onclick={() => go(idx - 1)}><PixelGlyph name="back" scale={3} /></button>
        <button class="arrow right" aria-label="Next pig" onclick={() => go(idx + 1)}><PixelGlyph name="cursor" scale={3} /></button>
        <span class="count" aria-hidden="true">{idx + 1} / {PIG_IDS.length}</span>
      {/if}
    </div>

    <div class="cardwrap">
      {#key pig}
        <ProfileCard {pig} />
      {/key}
    </div>
  </div>

  <footer class="foot">
    {#if phase === 'talk'}
      <VnLine lines={talkLines} {onLine} onDone={() => onChosen(pig)} />
    {:else}
      <div class="pigtabs" role="tablist" aria-label="Kempanion candidates">
        {#each PIG_IDS as p, i (p)}
          <button
            type="button"
            role="tab"
            class="pigtab"
            class:on={i === idx}
            style:--pig={CHARACTERS[p].color}
            aria-selected={i === idx}
            disabled={phase !== 'browse'}
            onclick={() => go(i)}
          >
            <img class="face" src={faceUrl(p)} alt="" width="40" height="40" draggable="false" />
            <span class="pname">{CHARACTERS[p].name}</span>
            <span class="key" aria-hidden="true">{i + 1}</span>
          </button>
        {/each}
      </div>
      <div class="actions">
        {#if onBack && !overlay}
          <button class="px-btn ghost backbtn" onclick={() => { ui.back(); onBack?.(); }} disabled={phase !== 'browse'}>
            <PixelGlyph name="back" scale={2} /> BACK
          </button>
        {/if}
        <button bind:this={chooseBtn} class="px-btn primary choose" onclick={choose} disabled={phase !== 'browse'}>
          CHOOSE {CHARACTERS[pig].name.toUpperCase()} <PixelGlyph name="cursor" scale={2} />
        </button>
      </div>
      <p class="note">You can switch Kempanions once a day from Profiles.</p>
    {/if}
  </footer>
</div>

<style>
  .picker {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 12px;
    padding: max(16px, var(--safe-top)) max(24px, var(--safe-right)) max(14px, var(--safe-bottom)) max(24px, var(--safe-left));
  }
  .overlay {
    position: fixed;
    z-index: 1000;
  }
  .head, .main, .foot { position: relative; }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 14px;
    row-gap: 2px;
  }
  .title {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: var(--sakura-1);
    text-shadow: 3px 3px 0 var(--sakura-4), 5px 5px 0 var(--ink);
  }
  .jp { font-size: 15px; color: var(--sakura-2); }
  .sub { margin: 0; flex-basis: 100%; font-size: 15px; color: rgba(255, 246, 234, 0.8); }

  .main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 1.15fr);
    gap: 16px;
    min-height: 0;
    touch-action: pan-y;
  }
  .stage {
    overflow: hidden;
    display: grid;
    place-items: end center;
  }
  .home {
    filter: brightness(0.6) saturate(0.9);
  }
  .fallback {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #4a2a5a, #2a1d4a 70%);
  }
  .portrait {
    position: relative;
    height: min(96%, 640px);
    max-width: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    animation: slide-r 200ms steps(4) both;
  }
  .portrait.from-left { animation-name: slide-l; }
  .portrait::before {
    content: '';
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 0;
    height: 10%;
    background: radial-gradient(closest-side, color-mix(in srgb, var(--pig) 55%, transparent), transparent);
  }
  @keyframes slide-r { from { transform: translateX(12px); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes slide-l { from { transform: translateX(-12px); opacity: 0; } to { transform: none; opacity: 1; } }
  .km-reduced .portrait { animation: km-fade 200ms linear both; }

  .arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 64px;
    display: grid;
    place-items: center;
    color: var(--sakura-1);
    background: rgba(27, 18, 41, 0.55);
    border: var(--px) solid rgba(255, 214, 224, 0.5);
    cursor: pointer;
  }
  .arrow:hover { background: rgba(27, 18, 41, 0.8); }
  .arrow.left { left: 8px; }
  .arrow.right { right: 8px; }
  .count {
    position: absolute;
    top: 10px;
    right: 12px;
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--sakura-1);
    text-shadow: 1px 1px 0 var(--ink);
  }

  .stamp {
    position: absolute;
    top: 14%;
    left: 50%;
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 8px 16px 10px;
    color: #fff4f4;
    background: rgba(200, 40, 60, 0.92);
    border: calc(var(--px) * 2) solid #fff4f4;
    outline: var(--px) solid #8a1426;
    transform: translateX(-50%) rotate(-7deg);
    animation: stamp 260ms steps(4) both;
  }
  .kanji { font-size: 40px; line-height: 1; }
  .paired { font-size: 15px; letter-spacing: 0.08em; }
  @keyframes stamp {
    from { transform: translateX(-50%) rotate(-7deg) scale(1.8); opacity: 0; }
    to { transform: translateX(-50%) rotate(-7deg) scale(1); opacity: 1; }
  }
  .km-reduced .stamp { animation: km-fade 200ms linear both; }
  .hearts {
    position: absolute;
    left: 50%;
    bottom: 30%;
    display: flex;
    gap: 18px;
    transform: translateX(-50%);
  }
  .hearts span { animation: rise 700ms steps(7) both; }
  .hearts span:nth-child(2) { animation-delay: 120ms; }
  .hearts span:nth-child(3) { animation-delay: 240ms; }
  @keyframes rise {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-48px); opacity: 0; }
  }

  .cardwrap { min-height: 0; }

  .foot {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px 16px;
  }
  .foot :global(.wrap) { grid-column: 1 / -1; margin-top: 14px; }
  .pigtabs {
    display: flex;
    gap: 8px;
    min-width: 0;
  }
  .pigtab {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 52px;
    padding: 4px 14px 4px 6px;
    flex: 1 1 0;
    min-width: 0;
    color: var(--paper);
    background: rgba(255, 255, 255, 0.06);
    border: var(--px) solid rgba(255, 214, 224, 0.4);
    border-bottom: calc(var(--px) * 2) solid var(--pig);
    font-family: var(--font-display);
    font-size: 17px;
    cursor: pointer;
  }
  .pigtab.on {
    color: var(--ink);
    background: var(--sakura-1);
    border-color: var(--ink);
    border-bottom-color: var(--pig);
  }
  .pigtab:disabled { cursor: default; }
  .pigtab:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: 2px; }
  .face {
    width: 40px;
    height: 40px;
    flex: none;
    image-rendering: pixelated;
    background: color-mix(in srgb, var(--pig) 40%, transparent);
  }
  .pname { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .key {
    position: absolute;
    right: 4px;
    top: 2px;
    font-size: 11px;
    opacity: 0.6;
  }
  .actions { display: flex; gap: 10px; }
  .choose {
    min-height: 52px;
    padding: 0.35em 1.2em;
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 700;
    white-space: nowrap;
  }
  .note {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 12px;
    color: rgba(255, 246, 234, 0.6);
  }

  /* T: phone portrait */
  @media (max-aspect-ratio: 5/4) {
    .picker {
      gap: 8px;
      padding: max(10px, var(--safe-top)) max(10px, var(--safe-right)) max(10px, var(--safe-bottom)) max(10px, var(--safe-left));
    }
    .title { font-size: 24px; }
    .jp { display: none; }
    .sub { font-size: 13px; }
    .main {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(150px, 0.9fr) minmax(0, 1.1fr);
      gap: 8px;
    }
    .portrait { height: 100%; }
    .arrow { width: 44px; height: 56px; }
    .foot { grid-template-columns: 1fr; gap: 8px; }
    .pigtab { padding: 2px 8px 2px 4px; font-size: 15px; min-height: 48px; gap: 4px; }
    .face { width: 32px; height: 32px; }
    .actions { width: 100%; }
    .choose { flex: 1; }
    .note { display: none; }
  }
  @media (max-aspect-ratio: 5/4) and (max-width: 380px) {
    .pname { display: none; }
    .pigtab { justify-content: center; }
  }
  /* S: phone landscape */
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .picker {
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 6px;
      padding: max(6px, var(--safe-top)) max(12px, var(--safe-right)) max(6px, var(--safe-bottom)) max(12px, var(--safe-left));
    }
    .title { font-size: 20px; }
    .sub, .jp, .note { display: none; }
    .main { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 10px; }
    .pigtab { min-height: 44px; font-size: 14px; }
    .face { width: 28px; height: 28px; }
    .choose { min-height: 44px; font-size: 16px; }
    .stamp .kanji { font-size: 28px; }
  }
</style>
