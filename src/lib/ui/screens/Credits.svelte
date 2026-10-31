<script lang="ts">
  // Scrolling credits over the title painting with petals and the pigs strolling by; Esc / tap / Enter
  // skips to the end card. params: { back?: ScreenId, backParams?: object, lastLine?: string } (no back → history)
  // (lastLine = e.g. the commit message the player wrote in Piggy 3's ending; shown as the final line).
  import '../meta/meta.css';
  import { PIG_IDS, type AnimId, type PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { bgUrl, faceUrl, hasBackground } from '../meta/assets';
  import { CREDITS, SIGN_OFF } from '../meta/content';
  import PetalCanvas from '../meta/PetalCanvas.svelte';
  import SpriteAnim from '../meta/SpriteAnim.svelte';
  import { motion } from '../meta/motion.svelte';
  import { goBack } from '../meta/nav';
  import { playSong, ui } from '../meta/sfx';
  import { Typewriter } from '../meta/typewriter.svelte';

  const params = game.params;
  const endLabel = params.back === 'hub' ? 'CONTINUE' : params.back === 'title' ? 'BACK TO TITLE' : 'BACK';
  const lastLine = typeof params.lastLine === 'string' && params.lastLine.trim() ? params.lastLine.trim().slice(0, 140) : '';
  const reduced = motion.reduced;

  let phase = $state<'roll' | 'end'>('roll');
  let roll = $state<HTMLDivElement>();
  let offset = $state(0);
  let waves = $state<Record<PigId, AnimId>>({ 'piggy-1': 'idle', 'piggy-2': 'idle', 'piggy-3': 'idle' });
  let signIdx = $state(-1);
  let endBtn = $state<HTMLButtonElement>();
  const tw = new Typewriter();

  $effect(() => {
    playSong('credits');
  });

  // the scroll: integer steps of one UI pixel so it reads as pixel art, not a smooth web scroll
  $effect(() => {
    if (phase !== 'roll' || reduced) return; // reduced motion: a static, scrollable list instead
    const el = roll;
    if (!el) return;
    const unit = innerWidth <= 700 || innerHeight <= 500 ? 2 : 3;
    const speed = Math.max(28, Math.min(64, innerHeight / 16));
    let y = innerHeight;
    let last = performance.now();
    let raf = 0;
    const stepFrame = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      y -= speed * dt;
      offset = Math.round(y / unit) * unit;
      if (y < -el.offsetHeight) {
        phase = 'end';
        return;
      }
      raf = requestAnimationFrame(stepFrame);
    };
    raf = requestAnimationFrame(stepFrame);
    return () => cancelAnimationFrame(raf);
  });

  // end card: all three wave, then each signs off in his own voice
  $effect(() => {
    if (phase !== 'end') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => (waves = { 'piggy-1': 'wave', 'piggy-2': 'wave', 'piggy-3': 'wave' }), 200));
    PIG_IDS.forEach((p, i) => {
      timers.push(setTimeout(() => {
        signIdx = i;
        tw.start(SIGN_OFF[p], p);
      }, 700 + i * 2600));
    });
    queueMicrotask(() => endBtn?.focus({ preventScroll: true }));
    return () => {
      timers.forEach(clearTimeout);
      tw.stop();
    };
  });

  function skip() {
    if (phase === 'roll') {
      ui.select();
      phase = 'end';
    }
  }

  function leave() {
    ui.back();
    goBack('title');
  }

  const SCROLL_KEYS: Record<string, number> = { ArrowDown: 48, ArrowUp: -48, PageDown: 320, PageUp: -320 };

  function onkeydown(e: KeyboardEvent) {
    if (phase === 'roll' && reduced && e.key in SCROLL_KEYS) {
      e.preventDefault();
      roll?.scrollBy({ top: SCROLL_KEYS[e.key] });
      return;
    }
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
      const t = e.target as HTMLElement | null;
      if (phase === 'end' && t?.tagName === 'BUTTON' && e.key !== 'Escape') return;
      e.preventDefault();
      if (phase === 'roll') skip();
      else if (!e.repeat) leave();
    }
  }

  const bg = hasBackground('title') ? bgUrl('title') : '';
  const walkers: { pig: PigId; delay: number }[] = [
    { pig: 'piggy-1', delay: 0 },
    { pig: 'piggy-2', delay: -9 },
    { pig: 'piggy-3', delay: -18 },
  ];
</script>

<svelte:window {onkeydown} />

<div class="km-screen credits" class:km-reduced={reduced}>
  {#if bg}<div class="km-cover dusk" style:background-image="url({bg})" aria-hidden="true"></div>{/if}
  <div class="veil" aria-hidden="true"></div>
  <PetalCanvas count={18} night />

  {#if !reduced}
    <!-- the whole credits list stays readable to screen readers while the visual copy scrolls -->
    <div class="visually-hidden">
      {#each CREDITS as b, i (i)}
        {#if b.heading}<p>{b.heading}</p>{/if}
        {#each b.lines as l, j (j)}<p>{l}</p>{/each}
      {/each}
      {#if lastLine}<p>{lastLine}</p>{/if}
    </div>
  {/if}

  {#if phase === 'roll'}
    {#if reduced}
      <button class="px-btn ghost small endnow" onclick={skip}>END ▸</button>
    {:else}
      <button class="skiparea" onclick={skip} aria-label="Skip to the end of the credits"></button>
    {/if}
    <div
      class="roll"
      class:static={reduced}
      class:px-scroll={reduced}
      bind:this={roll}
      style:transform={reduced ? undefined : `translateY(${offset}px)`}
      aria-hidden={reduced ? undefined : 'true'}
    >
      {#each CREDITS as b, i (i)}
        <section class="block" class:big={b.big}>
          {#if b.heading}<h2 class="km-title head">{b.heading}</h2>{/if}
          {#each b.lines as l, j (j)}
            {#if b.cast && j < PIG_IDS.length}
              <p class="cast" style:--pig={CHARACTERS[PIG_IDS[j]].color}>
                <img src={faceUrl(PIG_IDS[j])} alt="" width="32" height="32" />{l}
              </p>
            {:else}
              <p class:title={b.big && j === 0} class:sub={b.big && j > 0}>{l}</p>
            {/if}
          {/each}
        </section>
      {/each}
      {#if lastLine}
        <section class="block">
          <h2 class="km-title head">Commit message</h2>
          <p class="commit">“{lastLine}”</p>
        </section>
      {/if}
      <section class="block big"><p class="title">Thank you for playing!</p></section>
      {#if reduced}
        <!-- the static list's own way out, right where it ends -->
        <button class="px-btn primary endbtn listend" onclick={skip}>END ▸</button>
      {/if}
    </div>

    {#if !reduced}
      <div class="walk" aria-hidden="true">
        {#each walkers as w (w.pig)}
          <div class="walker" style:animation-delay="{w.delay}s">
            <SpriteAnim pig={w.pig} anim="walk_right" size="var(--walker)" />
          </div>
        {/each}
      </div>
      <p class="hintskip" aria-hidden="true">ESC · TAP to skip</p>
    {/if}
  {:else}
    <div class="endcard km-pop-in" class:has-commit={!!lastLine}>
      <p class="km-title thanks">Thank you for playing!</p>
      {#if lastLine}<p class="commit">“{lastLine}”</p>{/if}
      <div class="trio" aria-hidden="true">
        {#each PIG_IDS as p (p)}
          <div class="pig">
            <SpriteAnim pig={p} anim={waves[p]} onDone={() => (waves[p] = 'idle')} size="var(--endpig)" />
          </div>
        {/each}
      </div>
      <div class="signoff vn-box" aria-live="polite">
        {#if signIdx >= 0}
          {@const p = PIG_IDS[signIdx]}
          <span class="km-plate" style:--plate={CHARACTERS[p].color}>{CHARACTERS[p].name}</span>
          <p>{tw.visible}<span class="ghost">{tw.text.slice(tw.visible.length)}</span></p>
        {:else}
          <p class="ghost">…</p>
        {/if}
      </div>
      <p class="studio km-title">A Kempa AI Production</p>
      <p class="fine">© 2026 Kempa AI · fan-made, not affiliated with or endorsed by the University of Florida</p>
      <button bind:this={endBtn} class="px-btn primary endbtn" onclick={leave}>
        {endLabel}
      </button>
    </div>
  {/if}
</div>

<style>
  .credits { --walker: 128px; --endpig: 160px; background: #120a24; }
  .dusk { filter: brightness(0.42) saturate(0.8) hue-rotate(-12deg); }
  .veil {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(18, 10, 36, 0.2), rgba(18, 10, 36, 0.65) 30%, rgba(18, 10, 36, 0.65) 70%, rgba(18, 10, 36, 0.2));
  }
  .skiparea {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .skiparea:focus-visible { outline: none; }
  .roll {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    width: min(760px, calc(100% - 32px));
    margin: 0 auto;
    display: grid;
    gap: 56px;
    padding-bottom: 30vh;
    text-align: center;
    will-change: transform;
    pointer-events: none;
  }
  .roll.static {
    bottom: 0;
    width: 100%;
    padding: max(56px, var(--safe-top)) max(16px, var(--safe-right)) 48px max(16px, var(--safe-left));
    overflow: auto;
    pointer-events: auto;
    gap: 40px;
  }
  .endnow {
    position: absolute;
    right: max(12px, var(--safe-right));
    top: max(10px, var(--safe-top));
    z-index: 4;
  }
  .listend { justify-self: center; }
  .block { display: grid; gap: 6px; }
  .head {
    margin: 0 0 4px;
    font-size: 15px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--sakura-2);
  }
  .block p { margin: 0; font-size: 19px; line-height: 1.5; color: var(--paper); text-shadow: 2px 2px 0 var(--ink); }
  .block .title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(30px, 5vw, 56px);
    color: var(--sakura-1);
    text-shadow: 3px 3px 0 var(--sakura-4), 5px 5px 0 var(--ink);
  }
  .block .sub { font-size: 20px; letter-spacing: 0.12em; color: var(--sakura-2); }
  .cast { display: inline-flex; align-items: center; justify-content: center; gap: 10px; }
  .cast img { width: 32px; height: 32px; image-rendering: pixelated; background: color-mix(in srgb, var(--pig) 45%, transparent); }
  .commit { font-family: var(--font-body); color: var(--gold) !important; }

  .walk { position: absolute; left: 0; right: 0; bottom: max(8px, var(--safe-bottom)); height: var(--walker); pointer-events: none; }
  .walker { position: absolute; bottom: 0; left: 0; animation: stroll 27s linear infinite; }
  @keyframes stroll {
    from { transform: translateX(-160px); }
    to { transform: translateX(calc(100vw + 40px)); }
  }
  .hintskip {
    position: absolute;
    right: max(12px, var(--safe-right));
    top: max(10px, var(--safe-top));
    margin: 0;
    font-size: 12px;
    color: rgba(255, 246, 234, 0.6);
    z-index: 4;
    pointer-events: none;
  }

  .endcard {
    position: absolute;
    inset: 0;
    display: grid;
    justify-items: center;
    align-content: center;
    /* a long commit-message line on a short screen: start at the title and scroll, rather than clip both ends */
    align-content: safe center;
    overflow-y: auto;
    gap: 14px;
    padding: max(16px, var(--safe-top)) max(16px, var(--safe-right)) max(16px, var(--safe-bottom)) max(16px, var(--safe-left));
    text-align: center;
  }
  .thanks {
    margin: 0;
    font-weight: 700;
    font-size: clamp(30px, 6vw, 64px);
    color: var(--sakura-1);
    text-shadow: 3px 3px 0 var(--sakura-4), 5px 5px 0 var(--ink);
  }
  .trio { display: flex; align-items: flex-end; gap: 4px; }
  .trio .pig { margin: 0 calc(var(--endpig) * -0.12); }
  .signoff { width: min(620px, 100%); min-height: 84px; padding: 16px 14px 10px; position: relative; text-align: left; }
  .signoff :global(.km-plate) { position: absolute; left: 12px; top: 0; transform: translateY(-60%); font-size: 14px; }
  .signoff p { margin: 4px 0 0; font-size: 17px; }
  /* the typewriter's untyped rest; scoped to the sign-off so it can't also hide a `px-btn ghost` button (END ▸) */
  .signoff .ghost { visibility: hidden; }
  .studio { margin: 0; font-size: 16px; letter-spacing: 0.12em; color: var(--sakura-2); }
  .fine { margin: 0; font-size: 12px; color: rgba(255, 246, 234, 0.7); max-width: 560px; }
  .endbtn { min-width: 220px; min-height: 48px; font-family: var(--font-display); font-size: 18px; }

  @media (max-aspect-ratio: 5/4) {
    .credits { --walker: 96px; --endpig: 112px; }
    .block p { font-size: 16px; }
    .roll { gap: 44px; }
  }
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .credits { --walker: 72px; --endpig: 80px; }
    /* tight above and below (the bottom still clears the home-indicator inset) so the card fits a phone this short */
    .endcard { gap: 6px; padding-top: max(8px, var(--safe-top)); padding-bottom: max(8px, var(--safe-bottom)); }
    .thanks { font-size: 28px; }
    .signoff { min-height: 64px; padding: 12px 12px 6px; }
    /* the fan-made note stays, as one compact line; with a commit line (Piggy 3's ending) the pigs and the sign-off
       box shrink a little so it all still fits */
    .fine { font-size: 11px; line-height: 1.2; }
    .endcard .commit { margin: 0; }
    .endcard.has-commit { --endpig: 64px; }
    .has-commit .signoff { min-height: 56px; }
    .endbtn { min-height: 44px; }
  }
  /* the shortest phones (568x320, an Android in landscape under its browser bars): a little tighter still */
  @media (min-aspect-ratio: 5/4) and (max-height: 340px) {
    .endcard { gap: 4px; }
    .thanks { font-size: 26px; }
    .endcard.has-commit { --endpig: 56px; }
  }
</style>
