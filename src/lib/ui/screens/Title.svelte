<script module lang="ts">
  import { registerMetaHooks } from '../meta/hooks';
  registerMetaHooks();

  /** The Big Brain question was shown this session (ask at most once per page load, even without an answer). */
  let askedBrainThisSession = false;
</script>

<script lang="ts">
  // Title over Century Tower at golden hour: katakana, outlined sakura-gradient logo, tilde subtitle,
  // ▶ menu (keyboard + touch), the three pigs idling on the plaza, falling petals, non-affiliation footer.
  // On a device that hasn't answered yet, the Big Brain question (BigBrainPrompt) opens once the intro settles,
  // or as soon as the player picks CONTINUE / NEW GAME. After a yes, a pixel pill in a corner shows the download.
  import { tick, untrack } from 'svelte';
  import '../meta/meta.css';
  import { PIG_IDS, type AnimId, type PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { getBigBrainChoice, onBigBrainChoice, shouldAskBigBrain, type BigBrainChoice } from '../../ai/choice';
  import { bgUrl, hasBackground } from '../meta/assets';
  import BigBrainPrompt from '../meta/BigBrainPrompt.svelte';
  import PetalCanvas from '../meta/PetalCanvas.svelte';
  import PixelGlyph from '../meta/PixelGlyph.svelte';
  import SpriteAnim from '../meta/SpriteAnim.svelte';
  import Icon from '../components/Icon.svelte';
  import { motion } from '../meta/motion.svelte';
  import { continueSummary, isMeaningfulSave } from '../meta/save-utils';
  import { blip, initAudio, playSong, ui } from '../meta/sfx';

  type ItemId = 'continue' | 'new' | 'profiles' | 'extras' | 'settings' | 'credits';
  interface Item { id: ItemId; label: string; jp: string }

  const VERSION = 'v0.1';
  const canContinue = isMeaningfulSave(game.save, game.hasSave);
  const summary = canContinue ? continueSummary(game.save, now()) : '';
  const items: Item[] = [
    ...(canContinue ? [{ id: 'continue', label: 'CONTINUE', jp: 'つづきから' } as Item] : []),
    { id: 'new', label: 'NEW GAME', jp: 'はじめから' },
    { id: 'profiles', label: 'PROFILES', jp: 'プロフィール' },
    { id: 'extras', label: 'EXTRAS', jp: 'おまけ' },
    { id: 'settings', label: 'SETTINGS', jp: 'せってい' },
    { id: 'credits', label: 'CREDITS', jp: 'クレジット' },
  ];

  let sel = $state(0);
  let leaving = $state(false);
  let landed = $state(false);
  let buttons: HTMLButtonElement[] = $state([]);
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-aspect-ratio: 5/4), (max-height: 499px)').matches;

  // ── pigs on the plaza ──
  const FLAVOR: AnimId[] = ['wave', 'look_around', 'play_ball', 'yawn', 'laugh', 'happy', 'jump', 'dance'];
  const LOOPING = new Set<AnimId>(['look_around', 'play_ball', 'laugh', 'happy', 'dance']);
  let anims = $state<Record<PigId, AnimId>>({ 'piggy-1': 'idle', 'piggy-2': 'idle', 'piggy-3': 'idle' });

  function flavor(p: PigId, a: AnimId) {
    if (anims[p] !== 'idle') return;
    anims[p] = a;
  }

  const reducedAtStart = motion.reduced;

  // ── Big Brain: the once-per-device question, then a progress pill while it downloads ──
  type Manager = (typeof import('../../ai/manager.svelte'))['aiManager'];
  let brainChoice = $state(getBigBrainChoice());
  let askBrain = $state(false);
  /** CONTINUE / NEW GAME picked before the question was answered: go there right after it. */
  let pendingItem: number | null = null;
  let mgr = $state<Manager | null>(null);
  let readyFlash = $state(false);
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  let wasBusy = false;

  $effect(() => onBigBrainChoice((v) => (brainChoice = v)));
  $effect(() => {
    if (brainChoice === 'accepted' && !mgr) void import('../../ai/manager.svelte').then((x) => (mgr = x.aiManager)).catch(() => {});
  });
  // "READY ✓" for a few seconds when a download that ran on this screen finishes.
  $effect(() => {
    const busy = !!mgr?.busy;
    const ready = mgr?.status === 'ready';
    untrack(() => {
      if (wasBusy && !busy && ready) {
        readyFlash = true;
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => (readyFlash = false), 4000);
      }
      wasBusy = busy;
    });
  });
  $effect(() => () => clearTimeout(flashTimer));

  const BLOCKS = Array.from({ length: 10 }, (_, k) => k);
  const pill = $derived.by(() => {
    if (!mgr || brainChoice !== 'accepted') return null;
    if (mgr.busy) {
      const { loaded, total } = mgr.progress;
      const pct = total > 0 ? Math.min(99, Math.floor((100 * loaded) / total)) : 0;
      const text = mgr.phase === 'prepare' ? 'PREPARING' : mgr.phase === 'warmup' ? 'WARMING UP' : `${pct}%`;
      return { ready: false, filled: Math.round(pct / 10), text, label: `Big Brain downloading, ${pct}%` };
    }
    return readyFlash ? { ready: true, filled: 10, text: 'READY ✓', label: 'Big Brain is ready' } : null;
  });

  function needsBrainAnswer(): boolean {
    return !askedBrainThisSession && shouldAskBigBrain(getBigBrainChoice());
  }

  function openBrainPrompt() {
    askedBrainThisSession = true;
    askBrain = true;
  }

  function brainAnswered(answer: BigBrainChoice | null) {
    askBrain = false;
    if (answer) brainChoice = answer;
    const i = pendingItem;
    pendingItem = null;
    if (i !== null) activate(i);
    else void tick().then(() => buttons[sel]?.focus({ preventScroll: true }));
  }

  $effect(() => {
    playSong('title');
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      landed = true;
      // title call: the three blip voices together form a G-major chord
      blip('piggy-2');
      blip('piggy-3');
      blip('piggy-1');
    }, reducedAtStart ? 50 : 650));
    // Once the logo has landed and the menu stepped in, ask about Big Brain (first visit on this device).
    if (needsBrainAnswer()) {
      timers.push(setTimeout(() => {
        if (!leaving && needsBrainAnswer()) openBrainPrompt();
      }, reducedAtStart ? 150 : 1100));
    }
    timers.push(setTimeout(() => flavor('piggy-1', 'wave'), 1400));
    let next: ReturnType<typeof setTimeout>;
    const loop = () => {
      const p = PIG_IDS[Math.floor(Math.random() * PIG_IDS.length)];
      flavor(p, FLAVOR[Math.floor(Math.random() * FLAVOR.length)]);
      next = setTimeout(loop, 6000 + Math.random() * 4000);
    };
    next = setTimeout(loop, 6000 + Math.random() * 3000);
    queueMicrotask(() => buttons[sel]?.focus({ preventScroll: true }));
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(next);
    };
  });

  // ── menu ──
  function move(d: number) {
    sel = (sel + d + items.length) % items.length;
    ui.move();
    buttons[sel]?.focus({ preventScroll: true });
  }

  function activate(i: number) {
    if (leaving || askBrain) return;
    const target = items[i].id;
    if ((target === 'continue' || target === 'new') && needsBrainAnswer()) {
      // Ask before the game starts; the player lands where they were going right after answering.
      sel = i;
      pendingItem = i;
      openBrainPrompt();
      return;
    }
    sel = i;
    leaving = true;
    void initAudio();
    ui.select();
    const id = items[i].id;
    setTimeout(() => route(id), reducedAtStart ? 0 : 180);
  }

  function route(id: ItemId) {
    switch (id) {
      case 'continue':
        game.go(game.save.companion ? 'hub' : 'select', { from: 'title' });
        break;
      case 'new':
        game.go('newgame');
        break;
      case 'profiles':
      case 'extras':
      case 'settings':
      case 'credits':
        game.go(id, { back: 'title' });
        break;
    }
  }

  function hover(i: number, e: PointerEvent) {
    if (e.pointerType !== 'mouse' || leaving || sel === i) return;
    sel = i;
    ui.move();
    buttons[i]?.focus({ preventScroll: true });
  }

  function onkeydown(e: KeyboardEvent) {
    if (leaving || askBrain) return;
    const t = e.target as HTMLElement | null;
    const onItem = !!t && t.dataset.item !== undefined;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        e.preventDefault();
        move(-1);
        break;
      case 'ArrowDown': case 's': case 'S':
        e.preventDefault();
        move(1);
        break;
      case 'Home':
        e.preventDefault();
        sel = 0;
        buttons[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        sel = items.length - 1;
        buttons[sel]?.focus();
        break;
      case 'Enter': case ' ': case 'z': case 'Z':
        if (onItem && (e.key === 'Enter' || e.key === ' ')) return; // the focused button clicks itself
        e.preventDefault();
        activate(sel);
        break;
    }
  }

  const titleBg = hasBackground('title') ? bgUrl('title') : '';
</script>

<svelte:window {onkeydown} />

<div class="km-screen title-screen" class:km-reduced={motion.reduced} class:leaving class:pill-on={!!pill}>
  {#if titleBg}
    <div class="km-cover scene" style:background-image="url({titleBg})" aria-hidden="true"></div>
  {:else}
    <div class="scene fallback" aria-hidden="true"></div>
  {/if}
  <div class="shade" aria-hidden="true"></div>
  <PetalCanvas count={narrow ? 16 : 28} />

  <header class="logo" class:landed>
    <p class="km-jp kana" aria-hidden="true">ケンパニオン・オンライン</p>
    <h1 class="wordmark">
      <span class="w1">KEMPANION</span>
      <span class="w2">ONLINE</span>
    </h1>
    <p class="km-jp tilde">「～Sakura Campus Days～」</p>
  </header>

  <div class="pigs" aria-hidden="true">
    {#each PIG_IDS as p (p)}
      <div class="pig" style:--pig={CHARACTERS[p].color}>
        <SpriteAnim
          pig={p}
          anim={anims[p]}
          loops={LOOPING.has(anims[p]) ? 2 : undefined}
          onDone={() => (anims[p] = 'idle')}
          size="var(--pig-size)"
        />
      </div>
    {/each}
  </div>

  <nav class="menu km-window" aria-label="Title menu">
    {#each items as it, i (it.id)}
      <button
        bind:this={buttons[i]}
        class="item km-step-in"
        class:sel={sel === i}
        class:wide={it.id === 'continue' || it.id === 'new'}
        data-item
        style:animation-delay="{120 + i * 60}ms"
        onclick={() => activate(i)}
        onpointerenter={(e) => hover(i, e)}
        onfocus={() => (sel = i)}
        aria-describedby={it.id === 'continue' ? 'continue-summary' : undefined}
      >
        <span class="cursor" aria-hidden="true"><PixelGlyph name="cursor" scale={2} /></span>
        <span class="label">{it.label}</span>
        <span class="km-jp jp" aria-hidden="true">{it.jp}</span>
        {#if it.id === 'continue'}
          <span class="summary" id="continue-summary">{summary}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <footer class="foot">
    <p>© 2026 Kempa AI · fan-made, not affiliated with or endorsed by the University of Florida</p>
    <p class="studio">A Kempa AI Production · {VERSION}</p>
  </footer>

  {#if pill}
    <div class="bb-pill" class:ready={pill.ready} role="status" aria-label={pill.label} title="Big Brain is getting ready in the background. Manage it in Settings → Brain.">
      <Icon id="brain_big" size={16} />
      <span class="bp-name">BIG BRAIN</span>
      {#if !pill.ready}
        <span class="bp-bar" aria-hidden="true">
          {#each BLOCKS as k (k)}<i class:on={k < pill.filled}></i>{/each}
        </span>
      {/if}
      <span class="bp-text">{pill.text}</span>
    </div>
  {/if}

  {#if askBrain}
    <BigBrainPrompt onclose={brainAnswered} />
  {/if}
</div>

<style>
  .title-screen {
    --pig-size: 192px;
    display: grid;
    grid-template-columns: minmax(300px, 42%) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'logo .'
      'menu pigs'
      'foot foot';
    gap: 2.5vh 3vw;
    padding: max(5vh, var(--safe-top)) max(5vw, var(--safe-right)) max(2vh, var(--safe-bottom)) max(5vw, var(--safe-left));
  }
  .scene { transition: filter 180ms steps(3); }
  .km-cover.scene { --focus: 50%; }
  .fallback {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #ff9e7a 0%, #f48fb1 45%, #2a1d4a 100%);
  }
  .shade {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(26, 16, 48, 0.62) 0%, rgba(26, 16, 48, 0.25) 40%, rgba(26, 16, 48, 0) 62%),
      linear-gradient(0deg, rgba(26, 16, 48, 0.7) 0%, rgba(26, 16, 48, 0) 18%);
    pointer-events: none;
  }
  .leaving .scene { filter: brightness(1.25); }
  .logo, .menu, .pigs, .foot { position: relative; z-index: 1; }

  /* ── logo ── */
  .logo {
    grid-area: logo;
    display: grid;
    justify-items: start;
    gap: 0.4vh;
    opacity: 0;
    transform: translateY(-16px);
  }
  .logo.landed {
    opacity: 1;
    transform: none;
    animation: land 320ms steps(4) both;
  }
  .km-reduced .logo.landed { animation: km-fade 200ms linear both; }
  @keyframes land {
    0% { opacity: 0; transform: translateY(-16px); }
    75% { opacity: 1; transform: translateY(3px); }
    100% { opacity: 1; transform: none; }
  }
  .kana {
    margin: 0;
    font-size: clamp(13px, 1.6vw, 22px);
    letter-spacing: 0.3em;
    color: var(--sakura-1);
    text-shadow: 2px 2px 0 var(--ink);
  }
  /* outline + extrusion on the parent, sakura gradient clipped to the glyphs on the children
     (keeping filter and background-clip on different elements avoids a Safari rendering bug) */
  .wordmark {
    --o: max(2px, 0.045em);
    display: grid;
    width: max-content;
    max-width: 100%;
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(44px, 5.8vw, 116px);
    line-height: 0.92;
    filter:
      drop-shadow(var(--o) 0 0 var(--ink))
      drop-shadow(calc(var(--o) * -1) 0 0 var(--ink))
      drop-shadow(0 var(--o) 0 var(--ink))
      drop-shadow(0 calc(var(--o) * -1) 0 var(--ink))
      drop-shadow(0 calc(var(--o) * 2) 0 #7a2850);
  }
  .w1, .w2 {
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }
  .w1 {
    letter-spacing: 0.02em;
    background-image: linear-gradient(180deg, #ffffff 0 30%, #ffe3ea 30% 48%, #ffb7c5 48% 70%, #f48fb1 70% 100%);
  }
  .w2 {
    justify-self: end;
    font-size: 0.52em;
    letter-spacing: 0.28em;
    margin-right: -0.28em;
    background-image: linear-gradient(180deg, #fff6ea 0 45%, #ffd25a 45% 100%);
  }
  .tilde {
    margin: 0.6vh 0 0;
    font-size: clamp(15px, 1.8vw, 28px);
    letter-spacing: 0.1em;
    color: var(--paper);
    text-shadow: 2px 2px 0 var(--sakura-4), 3px 3px 0 var(--ink);
  }

  /* ── menu ── */
  .menu {
    grid-area: menu;
    align-self: start;
    width: min(440px, 100%);
    padding: calc(var(--px) * 3);
    gap: 2px;
    background: rgba(27, 20, 40, 0.8);
  }
  .item {
    position: relative;
    display: grid;
    grid-template-columns: 22px auto 1fr;
    align-items: center;
    column-gap: 10px;
    min-height: 48px;
    padding: 4px 14px 4px 10px;
    color: var(--paper);
    background: transparent;
    border: 0;
    text-align: left;
    font-family: var(--font-display);
    font-size: clamp(18px, 1.7vw, 26px);
    letter-spacing: 0.08em;
    cursor: pointer;
    text-shadow: 2px 2px 0 var(--ink);
  }
  .item:focus-visible { outline: none; }
  .item.sel {
    color: var(--ink);
    background: var(--sakura-1);
    text-shadow: none;
  }
  .cursor { visibility: hidden; display: inline-flex; color: var(--sakura-4); }
  .sel .cursor { visibility: visible; animation: nudge 0.66s steps(2) infinite; }
  .km-reduced .sel .cursor { animation: none; }
  @keyframes nudge { 50% { transform: translateX(2px); } }
  .jp {
    justify-self: end;
    font-size: 12px;
    opacity: 0.7;
    text-shadow: none;
  }
  .summary {
    grid-column: 2 / -1;
    font-family: var(--font-body);
    font-size: 13px;
    letter-spacing: 0.02em;
    opacity: 0.85;
    text-shadow: none;
  }

  /* ── pigs ── */
  .pigs {
    grid-area: pigs;
    align-self: end;
    justify-self: center;
    display: flex;
    align-items: flex-end;
    margin-bottom: 1vh;
    pointer-events: none;
  }
  .pig { margin: 0 calc(var(--pig-size) * -0.18); }
  .pig:nth-child(2) { margin-bottom: calc(var(--pig-size) * 0.06); }

  /* ── footer ── */
  .foot {
    grid-area: foot;
    display: grid;
    justify-items: center;
    gap: 2px;
    font-size: 12px;
    color: rgba(255, 246, 234, 0.85);
    text-shadow: 1px 1px 0 var(--ink);
    text-align: center;
  }
  .foot p { margin: 0; }
  .studio { color: var(--sakura-1); font-family: var(--font-display); letter-spacing: 0.08em; }

  /* ── Big Brain download pill (top-right corner; bottom-right in S, under the menu) ── */
  .bb-pill {
    position: absolute;
    z-index: 2;
    top: max(10px, var(--safe-top));
    right: max(12px, var(--safe-right));
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 3px 10px 3px 8px;
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--gold);
    background: rgba(27, 20, 40, 0.88);
    border: var(--px) solid var(--sakura-2);
    box-shadow: 0 var(--px) 0 var(--ink);
    pointer-events: none;
    animation: km-step-in 180ms steps(4) both;
  }
  .bb-pill.ready { color: var(--ok); border-color: var(--ok); }
  .bp-bar {
    display: inline-grid;
    grid-template-columns: repeat(10, 5px);
    gap: 1px;
    padding: 2px;
    background: var(--ink);
  }
  .bp-bar i { height: 8px; background: rgba(255, 255, 255, 0.12); }
  .bp-bar i.on { background: var(--sakura-2); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45); }
  .bp-text { min-width: 3ch; text-align: right; }
  .km-reduced .bb-pill { animation: none; }

  @media (min-height: 900px) { .title-screen { --pig-size: 256px; } }
  @media (max-height: 640px) { .title-screen { --pig-size: 128px; } }

  /* ── T: phone portrait ── */
  @media (max-aspect-ratio: 5/4) {
    .title-screen {
      --pig-size: 128px;
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      grid-template-areas: 'logo' 'pigs' 'menu' 'foot';
      gap: 10px;
      padding: max(18px, var(--safe-top)) max(16px, var(--safe-right)) max(10px, var(--safe-bottom)) max(16px, var(--safe-left));
    }
    .km-cover.scene { --focus: 74%; }
    .shade {
      background:
        linear-gradient(180deg, rgba(26, 16, 48, 0.55) 0%, rgba(26, 16, 48, 0) 26%),
        linear-gradient(0deg, rgba(26, 16, 48, 0.85) 0%, rgba(26, 16, 48, 0.35) 42%, rgba(26, 16, 48, 0) 60%);
    }
    .logo { justify-items: center; text-align: center; }
    .kana { letter-spacing: 0.18em; }
    .wordmark { font-size: clamp(36px, 12.4vw, 76px); }
    .menu {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 6px;
    }
    .item {
      min-height: 48px;
      font-size: 17px;
      grid-template-columns: 16px auto 1fr;
      column-gap: 6px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.06);
      border: var(--px) solid rgba(255, 214, 224, 0.35);
    }
    .item.sel { border-color: var(--ink); }
    .item.wide { grid-column: 1 / -1; }
    .item:not(.wide) .jp { display: none; }
    .pigs { justify-self: center; margin-bottom: 0; }
    .foot { font-size: 11px; }
  }
  @media (max-aspect-ratio: 5/4) and (min-height: 760px) {
    .title-screen { --pig-size: 160px; }
  }
  /* T: the pill gets its own strip above the logo */
  @media (max-aspect-ratio: 5/4) {
    .title-screen.pill-on { padding-top: max(50px, calc(var(--safe-top) + 38px)); }
  }

  /* ── S: phone landscape ── */
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .title-screen {
      --pig-size: 96px;
      grid-template-columns: minmax(0, 1fr) minmax(250px, 42%);
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-areas: 'logo menu' 'pigs menu' 'foot menu';
      gap: 6px 4vw;
      padding: max(10px, var(--safe-top)) max(14px, var(--safe-right)) max(6px, var(--safe-bottom)) max(14px, var(--safe-left));
    }
    .wordmark { font-size: clamp(32px, 10.5vh, 56px); }
    .kana { font-size: 12px; }
    .tilde { font-size: 14px; }
    .menu { align-self: center; width: 100%; gap: 0; }
    .item { min-height: 44px; font-size: 17px; }
    .pigs { justify-self: start; margin-left: 4vw; }
    .foot { justify-items: start; text-align: left; font-size: 10px; }
    .bb-pill { top: auto; bottom: max(6px, var(--safe-bottom)); }
  }
</style>
