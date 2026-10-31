<script module lang="ts">
  import { registerMetaHooks } from '../meta/hooks';
  registerMetaHooks();

  /** The Big Brain question was shown this session (ask at most once per page load, even without an answer). */
  let askedBrainThisSession = false;
</script>

<script lang="ts">
  // Title over Century Tower at golden hour: katakana, outlined sakura-gradient logo, tilde subtitle,
  // ▶ menu (keyboard + touch), the three pigs idling on the plaza, falling petals. (The non-affiliation note lives
  // in the credits, not here.)
  // On a device that hasn't answered yet, the Big Brain question (BigBrainPrompt) opens once the intro settles,
  // or as soon as the player picks CONTINUE / NEW GAME. After a yes, a pixel pill in a corner shows the download.
  // The "Play offline" pill (OfflinePill) lives in that corner too: it downloads the whole game minus Big Brain.
  import { tick, untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import '../meta/meta.css';
  import { PIG_IDS, type AnimId, type PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { getBigBrainChoice, onBigBrainChoice, shouldAskBigBrain, type BigBrainChoice } from '../../ai/choice';
  import { bgUrl, hasBackground } from '../meta/assets';
  import BigBrainPrompt from '../meta/BigBrainPrompt.svelte';
  import OfflinePill from '../meta/OfflinePill.svelte';
  import PetalCanvas from '../meta/PetalCanvas.svelte';
  import PixelGlyph from '../meta/PixelGlyph.svelte';
  import SpriteAnim from '../meta/SpriteAnim.svelte';
  import Icon from '../components/Icon.svelte';
  import { motion } from '../meta/motion.svelte';
  import { continueSummary, isMeaningfulSave } from '../meta/save-utils';
  import { blip, initAudio, playSong, ui } from '../meta/sfx';

  type ItemId = 'continue' | 'new' | 'profiles' | 'extras' | 'settings' | 'credits';
  interface Item { id: ItemId; label: string; jp: string }

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
  const FLAVOR: Record<PigId, AnimId[]> = {
    'piggy-1': ['wave', 'play_ball', 'celebrate', 'happy', 'jump', 'dance'],
    'piggy-2': ['wave', 'look_around', 'proud', 'drink', 'happy', 'laugh'],
    'piggy-3': ['wave', 'phone', 'thinking', 'happy', 'laugh', 'dance'],
  };
  const REACTIONS: Record<PigId, AnimId[]> = {
    'piggy-1': ['pet_reaction', 'celebrate', 'love'],
    'piggy-2': ['pet_reaction', 'proud', 'shy'],
    'piggy-3': ['pet_reaction', 'happy', 'shy'],
  };
  const lastFlavor: Partial<Record<PigId, AnimId>> = {};
  const lastReaction: Partial<Record<PigId, AnimId>> = {};
  const greetedAt: Partial<Record<PigId, number>> = {};
  const reactionTimers = new Map<PigId, ReturnType<typeof setTimeout>>();
  let reacting = $state<Record<PigId, boolean>>({ 'piggy-1': false, 'piggy-2': false, 'piggy-3': false });
  let greeting = $state('');
  let greetingFlip = false;
  let pageHidden = $state(false);
  let anims = $state<Record<PigId, AnimId>>({ 'piggy-1': 'idle', 'piggy-2': 'idle', 'piggy-3': 'idle' });

  function pick(pool: AnimId[], previous?: AnimId, current?: AnimId): AnimId {
    const choices = pool.filter((a) => a !== previous && a !== current);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function greet(p: PigId) {
    if (leaving || askBrain || offlineOpen) return;
    const time = performance.now();
    if (time - (greetedAt[p] ?? -Infinity) < 1200) return;
    greetedAt[p] = time;
    const a = pick(REACTIONS[p], lastReaction[p], anims[p]);
    lastReaction[p] = a;
    anims[p] = motion.reduced ? 'idle' : a;
    reacting[p] = true;
    greetingFlip = !greetingFlip;
    greeting = `${CHARACTERS[p].name} is happy to see you!${greetingFlip ? '​' : ''}`;
    void initAudio();
    blip(p);
    clearTimeout(reactionTimers.get(p));
    reactionTimers.set(p, setTimeout(() => {
      reacting[p] = false;
      reactionTimers.delete(p);
    }, 1800));
  }

  $effect(() => () => reactionTimers.forEach(clearTimeout));

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

  // ── Play offline: its window is open (the menu ignores keys and taps meanwhile) ──
  let offlineOpen = $state(false);
  /** The Big Brain question came due while the offline window was open: ask once it closes. */
  let brainDue = false;
  /** Phone portrait: the corner is too narrow for both pills' full labels. */
  const narrowCorner = new MediaQuery('(max-aspect-ratio: 5/4) and (max-width: 520px)');

  function offlineToggled(open: boolean) {
    offlineOpen = open;
    if (open || !brainDue) return;
    brainDue = false;
    if (!leaving && needsBrainAnswer()) openBrainPrompt();
  }

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
        if (leaving || !needsBrainAnswer()) return;
        if (offlineOpen) brainDue = true;
        else openBrainPrompt();
      }, reducedAtStart ? 150 : 1100));
    }
    queueMicrotask(() => buttons[sel]?.focus({ preventScroll: true }));
    return () => {
      timers.forEach(clearTimeout);
    };
  });

  // One pig takes a turn every 2.2–3.4 seconds; no immediate repeat and no interrupted reactions.
  // Opening a window or enabling reduced motion cancels the timer and restores the quiet idle pose.
  $effect(() => {
    const paused = motion.reduced || askBrain || offlineOpen || leaving || pageHidden;
    untrack(() => { for (const p of PIG_IDS) anims[p] = 'idle'; });
    if (paused) return;
    let turn = 0;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      if (!document.hidden) {
        const p = PIG_IDS[turn];
        turn = (turn + 1) % PIG_IDS.length;
        if (anims[p] === 'idle' && !reacting[p]) {
          const a = pick(FLAVOR[p], lastFlavor[p]);
          lastFlavor[p] = a;
          anims[p] = a;
        }
      }
      timer = setTimeout(loop, 2200 + Math.random() * 1200);
    };
    timer = setTimeout(loop, 1400);
    return () => clearTimeout(timer);
  });

  // ── menu ──
  function move(d: number) {
    sel = (sel + d + items.length) % items.length;
    ui.move();
    buttons[sel]?.focus({ preventScroll: true });
  }

  function activate(i: number) {
    if (leaving || askBrain || offlineOpen) return;
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
    if (leaving || askBrain || offlineOpen) return;
    const t = e.target as HTMLElement | null;
    const pigButton = t?.closest<HTMLButtonElement>('[data-pig]');
    if (pigButton) {
      // Native Enter/Space clicks belong to this pig, never to the selected menu item.
      if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (!e.repeat) pigButton.click();
      }
      return;
    }
    const onItem = !!t && t.dataset.item !== undefined;
    const offlineBtn = (t?.closest?.('.op-pill') ?? null) as HTMLButtonElement | null;
    if (offlineBtn && (e.key === 'Enter' || e.key === ' ')) return; // the focused pill clicks itself
    if (offlineBtn && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      offlineBtn.click();
      return;
    }
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
<svelte:document onvisibilitychange={() => (pageHidden = document.hidden)} />

<div class="km-screen title-screen" class:km-reduced={motion.reduced} class:leaving>
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

  <div class="pigs">
    {#each PIG_IDS as p (p)}
      <div class="pig" data-anim={anims[p]} style:--pig={CHARACTERS[p].color}>
        <SpriteAnim
          pig={p}
          anim={anims[p]}
          loops={anims[p] === 'idle' ? undefined : 2}
          onDone={() => (anims[p] = 'idle')}
          size="var(--pig-size)"
        />
        <button
          type="button"
          class="pig-target"
          data-pig={p}
          aria-label={`Say hello to ${CHARACTERS[p].name}`}
          title={`Say hello to ${CHARACTERS[p].name}`}
          disabled={leaving || askBrain || offlineOpen}
          onclick={(e) => { e.stopPropagation(); greet(p); }}
        ></button>
        {#if reacting[p]}
          <span class="pig-heart" aria-hidden="true"><PixelGlyph name="heart" scale={2} /></span>
        {/if}
      </div>
    {/each}
  </div>

  <span class="sr-only" role="status">{greeting}</span>

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

  <!-- download corner: Big Brain's progress (while it downloads) beside the "Play offline" pill -->
  <div class="dl-corner">
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
    <OfflinePill compact={!!pill && narrowCorner.current} disabled={leaving} onopenchange={offlineToggled} />
  </div>

  {#if askBrain}
    <BigBrainPrompt onclose={brainAnswered} />
  {/if}
</div>

<style>
  .title-screen {
    --pig-size: 192px;
    display: grid;
    grid-template-columns: minmax(300px, 42%) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      'logo .'
      'menu pigs';
    gap: 2.5vh 3vw;
    padding: max(5vh, var(--safe-top)) max(5vw, var(--safe-right)) max(4vh, var(--safe-bottom)) max(5vw, var(--safe-left));
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
  .logo, .menu, .pigs { position: relative; z-index: 1; }

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

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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
  .pig { position: relative; margin: 0 calc(var(--pig-size) * -0.18); }
  /* Sprite frames overlap for the trio's spacing; their central hit targets meet without overlapping. */
  .pig-target {
    position: absolute;
    inset: 12% 18% 0;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    touch-action: manipulation;
  }
  .pig-target:disabled { pointer-events: none; }
  .pig-target:focus-visible { outline: 2px dashed var(--pig); outline-offset: -2px; }
  .pig-heart {
    position: absolute;
    top: 4%;
    left: calc(50% - 8px);
    color: var(--sakura-1);
    filter: drop-shadow(1px 1px 0 var(--ink));
    pointer-events: none;
  }
  .pig:nth-child(2) { margin-bottom: calc(var(--pig-size) * 0.06); }

  /* ── download corner (top right): the Big Brain pill while it downloads, then "Play offline" in the corner
        itself (a 44px button around its 30px pill). In S both move under the logo, Big Brain below "Play offline". ── */
  .dl-corner {
    position: absolute;
    z-index: 2;
    top: max(3px, var(--safe-top));
    right: max(6px, var(--safe-right));
    display: flex;
    align-items: center;
    gap: 2px;
    pointer-events: none;
  }
  .bb-pill {
    position: relative;
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
  .km-reduced .bb-pill, .km-reduced .dl-corner > :global(.op-pill) { animation: none; }
  /* "Play offline" steps in with the menu, not before the logo has landed */
  .dl-corner > :global(.op-pill) { animation-delay: 480ms; }

  @media (min-height: 900px) { .title-screen { --pig-size: 256px; } }
  @media (max-height: 640px) { .title-screen { --pig-size: 128px; } }

  /* ── T: phone portrait ── */
  @media (max-aspect-ratio: 5/4) {
    .title-screen {
      --pig-size: 128px;
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-areas: 'logo' 'pigs' 'menu';
      gap: 10px;
      padding: max(18px, var(--safe-top)) max(16px, var(--safe-right)) max(18px, var(--safe-bottom)) max(16px, var(--safe-left));
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
  }
  @media (max-aspect-ratio: 5/4) and (min-height: 760px) {
    .title-screen { --pig-size: 160px; }
  }
  /* T: the pills get their own strip above the logo */
  @media (max-aspect-ratio: 5/4) {
    .title-screen { padding-top: max(50px, calc(var(--safe-top) + 46px)); }
  }

  /* ── S: phone landscape ── */
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .title-screen {
      --pig-size: 96px;
      grid-template-columns: minmax(0, 1fr) minmax(250px, 42%);
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-areas: 'logo menu' 'pigs menu';
      gap: 6px 4vw;
      padding: max(10px, var(--safe-top)) max(14px, var(--safe-right)) max(6px, var(--safe-bottom)) max(14px, var(--safe-left));
    }
    .wordmark { font-size: clamp(32px, 10.5vh, 56px); }
    .kana { font-size: 12px; }
    .tilde { font-size: 14px; }
    .menu { align-self: center; width: 100%; gap: 0; }
    .item { min-height: 44px; font-size: 17px; }
    .pigs { justify-self: start; margin-left: 4vw; }
    /* no corner here: a tall menu reaches the top, and with a save (CONTINUE + its summary) the bottom too. Both pills
       sit under the logo, over the sky: "Play offline", then Big Brain's progress below its 44px button. */
    .dl-corner { display: contents; }
    .dl-corner > :global(.op-pill), .bb-pill {
      grid-area: pigs;
      align-self: start;
      justify-self: start;
      position: relative;
      z-index: 2;
    }
    .bb-pill { margin-top: 48px; }
  }
</style>
