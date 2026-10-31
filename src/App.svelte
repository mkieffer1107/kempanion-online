<script lang="ts">
  // App shell: screen router with quick curtain transitions, boot/sim loop, audio unlock + volumes,
  // global keyboard shortcuts (GAME_DESIGN §14), event toasts, title badge, root classes, and the
  // overlays scripts can await (mini-games launched from scenes).
  import { onMount, untrack, type Component } from 'svelte';
  import { NEED_IDS, PIG_IDS, type PigId } from './lib/types';
  import { game, type GameEvent, type ScreenId } from './lib/state/game.svelte';
  import { now } from './lib/state/clock';
  import { gameClock } from './lib/state/ticker.svelte';
  import { audio } from './lib/audio';
  import { stage } from './lib/engine/stage';
  import { dialogue, vnHooks } from './lib/vn';
  import { THRESH, currentWant, getItem, type SignalResult, type SimEvent } from './lib/pet';
  import { CHARACTERS } from './lib/content/characters';
  import { whereIs } from './lib/content/locations';
  import { featureNotice } from './lib/content/p3-features';
  import { getBigBrainChoice, onBigBrainChoice, type BigBrainChoice } from './lib/ai/choice';
  import CoachMark from './lib/ui/components/CoachMark.svelte';
  import { bondView } from './lib/ui/components/Hearts.svelte';
  import { ui, closeTopmost, modalOpen, offerScreenKey } from './lib/ui/ui.svelte';
  import { viewport } from './lib/ui/viewport.svelte';
  import { toast } from './lib/ui/toasts.svelte';
  import { overlays } from './lib/ui/overlays.svelte';
  import Toasts from './lib/ui/components/Toasts.svelte';
  import MenuSheet from './lib/ui/components/MenuSheet.svelte';
  import ShortcutHelp from './lib/ui/components/ShortcutHelp.svelte';
  import MinigameHost from './lib/ui/minigame/MinigameHost.svelte';
  import Hub from './lib/ui/screens/Hub.svelte';
  import Talk from './lib/ui/screens/Talk.svelte';
  import MapScreen from './lib/ui/screens/Map.svelte';
  import Location from './lib/ui/screens/Location.svelte';
  import Scene from './lib/ui/screens/Scene.svelte';
  import Minigame from './lib/ui/screens/Minigame.svelte';
  import Settings from './lib/ui/screens/Settings.svelte';
  import Missing from './lib/ui/screens/Missing.svelte';

  // Meta screens (gate, splash, title, new game, cards, shop, bag, extras, credits) belong to the UI-meta module.
  // Globbed by exact path so the shell still runs while one of them is being written.
  const META = import.meta.glob<{ default: Component }>(
    [
      './lib/ui/screens/Gate.svelte', './lib/ui/screens/Splash.svelte', './lib/ui/screens/Title.svelte',
      './lib/ui/screens/NewGame.svelte', './lib/ui/screens/Select.svelte', './lib/ui/screens/Profiles.svelte',
      './lib/ui/screens/Shop.svelte', './lib/ui/screens/Bag.svelte', './lib/ui/screens/Extras.svelte',
      './lib/ui/screens/Credits.svelte',
    ],
    { eager: true },
  );
  const meta = (name: string): Component => META[`./lib/ui/screens/${name}.svelte`]?.default ?? Missing;

  const SCREENS: Record<ScreenId, Component> = {
    gate: meta('Gate'), splash: meta('Splash'), title: meta('Title'), newgame: meta('NewGame'), select: meta('Select'),
    profiles: meta('Profiles'), shop: meta('Shop'), bag: meta('Bag'), extras: meta('Extras'), credits: meta('Credits'),
    hub: Hub, talk: Talk, map: MapScreen, location: Location, scene: Scene, minigame: Minigame, settings: Settings,
  };

  /** Screens where the pager shortcuts (M, B, [ ], Esc menu) apply. */
  const GAME_SCREENS = new Set<ScreenId>(['hub', 'talk', 'map', 'location', 'scene', 'minigame', 'settings']);
  /** On these the VN DialogueBox / ChoiceMenu own the dialogue keys (advance, auto, skip, log, hide, choices). */
  const VN_SCREENS = new Set<ScreenId>(['talk', 'scene']);
  const VN_KEYS = new Set([
    'Enter', ' ', 'z', 'Z', 'x', 'X', 'a', 'A', 's', 'S', 'l', 'L', 'PageUp', 'h', 'H', 'Delete', 'Control',
    'ArrowUp', 'ArrowDown', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  ]);
  /** Celebrations wait until the player is past the boot/title flow. */
  const QUIET_SCREENS = new Set<ScreenId>(['gate', 'splash', 'title', 'newgame', 'credits']);
  const BASE_TITLE = 'Kempanion Online';

  const url = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const debug = url.has('debug');

  // ── router + curtain ──
  let shownScreen = $state<ScreenId>(game.screen);
  let shownNav = $state(game.nav);
  let curtain = $state<'off' | 'close' | 'open'>('off');
  const Screen = $derived(SCREENS[shownScreen] ?? Missing);
  let swapToken = 0;

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function swap() {
    const token = ++swapToken;
    const instant = ui.reduceMotion || shownScreen === 'gate' || game.screen === 'splash';
    if (!instant) {
      curtain = 'close';
      await wait(110);
      if (token !== swapToken) return;
    }
    shownScreen = game.screen;
    shownNav = game.nav;
    ui.menu = false;
    if (instant) { curtain = 'off'; return; }
    curtain = 'open';
    await wait(150);
    if (token === swapToken) curtain = 'off';
  }

  $effect(() => {
    const nav = game.nav;
    untrack(() => { if (nav !== shownNav) void swap(); });
  });

  // ── root classes, volumes ──
  $effect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', ui.reduceMotion);
    root.classList.toggle('crt', game.save.settings.crt);
    stage.setReduceMotion(ui.reduceMotion);
  });

  // KempaPager accent (picked in Piggy 3's first event): tints the in-game UI; title and credits stay sakura pink.
  $effect(() => {
    const accent = game.save.flags.ui_accent;
    const inGame = !QUIET_SCREENS.has(shownScreen);
    if (inGame && (accent === 'orange' || accent === 'lavender')) document.documentElement.dataset.accent = accent;
    else delete document.documentElement.dataset.accent;
  });

  // Player petal preference scales every scene's petal level (scenes still choose off/light/normal/heavy).
  $effect(() => {
    const pref = ui.petals;
    untrack(() => stage.setPetalScale(pref === 'off' ? 0 : pref === 'lots' ? 1.4 : 1));
  });

  function applyVolumes() {
    const s = game.save.settings;
    audio.setVolumes({ master: s.masterVolume, bgm: s.bgmVolume, sfx: s.sfxVolume, voice: s.voiceVolume });
    audio.setAutoSuspend(game.save.flags['ui.muteHidden'] !== false);
  }
  $effect(() => {
    const s = game.save.settings;
    void [s.masterVolume, s.bgmVolume, s.sfxVolume, s.voiceVolume, game.save.flags['ui.muteHidden']];
    untrack(applyVolumes);
  });

  // The title-screen Big Brain answer lives per device (localStorage); scenes read it from the save, so mirror it
  // into flags on every save (new game, load) and every change: bigbrain = accepted, bigbrain_unsupported (no WebGPU).
  let brainChoice = $state<BigBrainChoice | null>(getBigBrainChoice());
  $effect(() => onBigBrainChoice((c) => (brainChoice = c)));
  $effect(() => {
    const flags = game.save.flags;
    const accepted = brainChoice === 'accepted';
    untrack(() => {
      if (accepted) flags.bigbrain = 'accepted';
      else delete flags.bigbrain;
      if (typeof navigator !== 'undefined' && !('gpu' in navigator)) flags.bigbrain_unsupported = true;
      else delete flags.bigbrain_unsupported;
    });
  });
  // Piggy 3's shipped feature (p3_h5): a KempaPager notice at the right minute, once per occurrence.
  $effect(() => {
    const minute = gameClock.minute;
    untrack(() => {
      if (!game.save.companion) return;
      const n = featureNotice(game.save, new Date(minute * 60_000));
      if (!n || game.save.flags.p3_feature_last === n.key) return;
      game.setFlag('p3_feature_last', n.key);
      audio.sfx(n.sfx);
      toast(n.text, { icon: n.icon, ms: 6500 });
    });
  });

  // ── events → toasts / jingles ──
  const pigName = (pig: PigId) => CHARACTERS[pig].name;

  // Pet-sim news (wants, low needs, naps, crumbs…) waits for a clear screen: not during a story scene (it covered the
  // KempaPager tutorial panel and hid behind the companion picker), not during a mini-game (it popped over the game's
  // header mid-play; it goes out after the results, back where the game returns to), not under a window or sheet (it
  // covered the welcome-back letter's title and Roll Call's Back button), and not mid screen change. It goes out once
  // the screen has stayed clear for NEWS_SETTLE_MS, so a scene → hub → triggered scene hop (prologue → tutorial_hub)
  // doesn't flash it in between, and the letter a catch-up opens (a flush later, from the hub's own effect) gets in
  // first. Items, bond, money, tasks and achievements still toast right away (they're part of the story, or answer a
  // tap: a mini-game's rewards show with its results).
  const NEWS_SETTLE_MS = 600;
  let appRoot = $state<HTMLElement>();
  /** A dialog is up: any Modal window or sheet (letter, Roll Call, care sheets, pager menu, help, name entry), a
   *  confirm dialog, the backlog, the companion picker overlay, a mini-game's how-to / pause / results panel. */
  let dialogOpen = $state(false);
  $effect(() => {
    if (!appRoot) return;
    // document.body, not the app root: the backlog and the coach marks are portaled straight onto <body>.
    const body = document.body;
    const check = () => { dialogOpen = body.querySelector('[aria-modal="true"]') !== null; };
    check();
    const watch = new MutationObserver(check);
    watch.observe(body, { childList: true, subtree: true, attributeFilter: ['aria-modal'] });
    return () => watch.disconnect();
  });
  const newsBlocked = $derived(
    game.screen === 'scene' || shownScreen === 'scene' || game.screen === 'minigame' || shownScreen === 'minigame'
      || !!overlays.minigame || game.screen !== shownScreen || curtain !== 'off' || dialogOpen,
  );

  // tutorial_big_brain ends by setting tut.big_brain_coach: the hub points at the brain chip until it is tapped. Not
  // over a window (Roll Call opens with the room right after the tutorial and covers the chip): it waits for it.
  const brainCoach = $derived(
    shownScreen === 'hub' && curtain === 'off' && !dialogOpen && brainChoice === 'accepted'
      && !!game.save.flags['tut.big_brain_coach'],
  );
  function coachTap(e: Event) {
    if (game.save.flags['tut.big_brain_coach'] && (e.target as Element | null)?.closest?.('[data-coach="brain"]')) {
      game.unsetFlag('tut.big_brain_coach');
    }
  }

  /** Held news that stopped being true (want fulfilled or over, need topped up, nap over…) gets no toast. */
  function stillTrue(e: SimEvent): boolean {
    if (!('pig' in e)) return true;
    const p = game.save.pigs[e.pig];
    switch (e.kind) {
      case 'want': return currentWant(game.save, e.pig, now())?.key === e.want.key;
      case 'need_low': return p.needs[e.need] < THRESH.mild;
      case 'fell_asleep': return p.asleep;
      case 'woke': return !p.asleep;
      case 'sick': return p.sick;
      case 'recovered': return !p.sick;
      case 'mess': return p.mess > 0;
      default: return true;
    }
  }

  function simToast(e: SimEvent) {
    const ev = e as SimEvent & { pig?: PigId; need?: string; want?: { label: string; icon: string }; money?: number };
    const name = ev.pig ? pigName(ev.pig) : '';
    switch (ev.kind) {
      case 'sick':
        audio.sfx('sneeze');
        toast(`${name} caught the sniffles. CARE can help.`, { icon: 'care', kind: 'warn', ms: 4200 });
        break;
      case 'recovered':
        toast(`${name} feels better!`, { icon: 'sparkle', kind: 'good' });
        break;
      case 'woke':
        toast(`${name} woke up.`, { icon: 'sun' });
        break;
      case 'fell_asleep':
        toast(`${name} fell asleep. Zzz…`, { icon: 'zzz' });
        break;
      case 'mess':
        // Only the hub has the crumbs to tap; anywhere else they're waiting in his room (the hub, "home").
        toast(shownScreen === 'hub' ? 'Crumbs on the floor. Tap them to tidy up.' : 'Crumbs on the floor back home.', { icon: 'sparkle' });
        break;
      case 'need_low': {
        const msg: Record<string, string> = {
          hunger: `${name}'s tummy is rumbling.`,
          energy: `${name} is getting sleepy.`,
          hygiene: `${name} could use a bath.`,
          fun: `${name} is a little bored.`,
        };
        audio.sfx('notify');
        toast(msg[ev.need ?? ''] ?? `${name} needs you.`, { icon: ev.need ?? 'alert', kind: 'warn' });
        break;
      }
      case 'want':
        if (ev.want) toast(`${name} wants: ${ev.want.label}`, { icon: ev.want.icon, kind: 'bond', ms: 4000 });
        break;
      case 'welcome_party':
        audio.jingle('daily_bonus');
        toast(`Welcome back! The piggies threw you a party (+${ev.money ?? 100} acorns).`, { icon: 'gift', kind: 'good', ms: 5000 });
        break;
      default:
        break;
    }
  }

  function handle(evs: GameEvent[]) {
    let money = 0;
    for (const ev of evs) {
      switch (ev.kind) {
        case 'bond_level': {
          const v = bondView(game.save.pigs[ev.pig].bond);
          audio.jingle('bond_up');
          toast(`${pigName(ev.pig)}: ♥${ev.level} ${v.title}!`, { icon: 'heart', kind: 'bond', ms: 4500 });
          ui.announce(`${pigName(ev.pig)} is now at ${ev.level} hearts: ${v.title}.`);
          if (game.screen === 'hub') stage.burst('hearts');
          break;
        }
        case 'money':
          money += ev.amount;
          break;
        case 'item': {
          const it = getItem(ev.item);
          toast(`Got ${it?.name ?? ev.item}${ev.count > 1 ? ` ×${ev.count}` : ''}`, { icon: it?.icon ?? 'bag', kind: 'good' });
          break;
        }
        case 'achievement':
          audio.jingle('level_up');
          toast(`Achievement: ${ev.achievement.title}`, { icon: 'trophy', kind: 'good', ms: 4500 });
          ui.announce(`Achievement unlocked: ${ev.achievement.title}. ${ev.achievement.desc}`);
          break;
        case 'task':
          toast(`Task done: ${ev.task.text}`, { icon: 'star', kind: 'good', ms: 4000 });
          break;
        case 'sim':
          simToast(ev.event);
          break;
      }
    }
    if (money > 0) {
      audio.sfx('coin');
      toast(`+${money} acorns`, { icon: 'acorn', kind: 'money' });
    }
  }

  // Everything but pet-sim news: right away (off the boot / title / credits screens).
  $effect(() => {
    if (game.events.length === 0 || QUIET_SCREENS.has(game.screen)) return;
    untrack(() => {
      const ready = game.events.filter((e) => e.kind !== 'sim');
      if (!ready.length) return;
      game.events = game.events.filter((e) => e.kind === 'sim');
      handle(ready);
    });
  });

  // Pet-sim news: once the screen has been clear for NEWS_SETTLE_MS (a dialog, scene or screen change resets the wait),
  // and only what is still true by then.
  $effect(() => {
    if (newsBlocked || QUIET_SCREENS.has(game.screen) || !game.events.some((e) => e.kind === 'sim')) return;
    const t = setTimeout(() => {
      const news = game.events.filter((e) => e.kind === 'sim');
      game.events = game.events.filter((e) => e.kind !== 'sim');
      handle(news.filter((e) => e.kind === 'sim' && stillTrue(e.event)));
    }, NEWS_SETTLE_MS);
    return () => clearTimeout(t);
  });

  // ── title badge "(n) Kempanion Online" while hidden and needs are low ──
  function updateTitle() {
    const c = game.save.companion;
    if (document.visibilityState !== 'hidden' || !c) { document.title = BASE_TITLE; return; }
    const p = game.save.pigs[c];
    const n = NEED_IDS.filter((k) => p.needs[k] < 30).length + (p.sick ? 1 : 0);
    document.title = n > 0 ? `(${n}) ${BASE_TITLE}` : BASE_TITLE;
  }

  // ── keyboard ──
  function isTyping(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    return !!el?.closest?.('input, textarea, select, [contenteditable="true"]');
  }

  /** [ / ]: visit the previous / next pig wherever he is right now (your Kempanion = the pager). */
  function switchPig(dir: 1 | -1) {
    const c = game.save.companion;
    const params = game.params as { pig?: PigId; location?: string };
    const current: PigId = (game.screen === 'talk' && params.pig) || c || 'piggy-1';
    const i = PIG_IDS.indexOf(current);
    const next = PIG_IDS[(i + dir + PIG_IDS.length) % PIG_IDS.length];
    audio.sfx('ui_move');
    if (next === c) game.go('hub');
    else game.go('location', { location: whereIs(next, gameClock.date()), focus: next });
  }

  function cycleFocus() {
    const keys = [...document.querySelectorAll<HTMLElement>('[data-lcd], [data-cycle]')].filter((el) => el.offsetParent !== null);
    if (!keys.length) return;
    const i = keys.indexOf(document.activeElement as HTMLElement);
    keys[(i + 1) % keys.length].focus();
    audio.sfx('ui_move');
  }

  function focusChat() {
    const field = document.querySelector<HTMLElement>('[data-chat-input], .r.text input, .r.text textarea');
    field?.focus();
  }

  function escape() {
    if (ui.help) { ui.help = false; return; }
    if (game.screen === 'hub') { ui.menu = !ui.menu; audio.sfx(ui.menu ? 'ui_open' : 'ui_close'); return; }
    if (game.screen === 'talk') { dialogue.cancel(); return; }
    if (game.screen === 'scene' || game.screen === 'minigame') return;
    audio.sfx('ui_back');
    game.back(game.save.companion ? 'hub' : 'title');
  }

  function onkeydown(e: KeyboardEvent) {
    game.lastInputAt = now();
    if (e.defaultPrevented) return;
    if (e.key === 'Escape' && closeTopmost()) { e.preventDefault(); return; }
    if (overlays.minigame || modalOpen()) return;
    if (!GAME_SCREENS.has(game.screen)) return;
    if (offerScreenKey(e)) { e.preventDefault(); return; }
    if (VN_SCREENS.has(game.screen) && VN_KEYS.has(e.key)) return;
    if (isTyping(e.target)) {
      if (e.key === 'Escape') (e.target as HTMLElement).blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const travel = game.screen === 'hub' || game.screen === 'map' || game.screen === 'location';
    switch (e.key) {
      case 'Escape': case 'c': case 'C': escape(); break;
      case '?': case 'F1': ui.help = !ui.help; break;
      case 'm': case 'M': if (!travel || game.screen === 'map') return; audio.sfx('ui_select'); game.go('map'); break;
      case 'b': case 'B': {
        if (!travel) return;
        audio.sfx('ui_select');
        const c = game.save.companion;
        game.go('bag', game.screen === 'hub' && c ? { back: 'hub', pigs: [c] } : {});
        break;
      }
      case '[': if (!travel) return; switchPig(-1); break;
      case ']': if (!travel) return; switchPig(1); break;
      case 't': case 'T': case '/': if (game.screen !== 'talk') return; focusChat(); break;
      case 'z': case 'Z': cycleFocus(); break;
      case 'x': case 'X': {
        // Device B: press the focused key/button.
        const el = document.activeElement as HTMLElement | null;
        if (!el?.matches('button, [role="button"], a[href]')) return;
        el.click();
        break;
      }
      default: return;
    }
    e.preventDefault();
  }

  // ── mount: boot, hooks, audio unlock, sim loop, visibility ──
  onMount(() => {
    game.boot();

    // VN hooks: the runner awaits [minigame] (it applies mini-game rewards itself).
    vnHooks.runMinigame = (id, opts) => overlays.runMinigame(id, opts.pig);
    vnHooks.onSignal = (r: SignalResult) => {
      game.report({ tasks: r.tasks, achievements: r.achievements });
      if (r.want) toast(`That’s just what he wanted! +${r.want.bond} ♥`, { icon: 'heart', kind: 'bond' });
    };

    let unlocked = false;
    const firstGesture = () => {
      game.lastInputAt = now();
      if (unlocked) return;
      unlocked = true;
      audio.init().then(applyVolumes).catch(() => { unlocked = false; });
      // Big Brain: reload an already-downloaded model if the player opted in (never downloads by itself).
      void import('./lib/ai/manager.svelte').then(({ aiManager }) => {
        aiManager.onNotice((n) => toast(n.text));
        void aiManager.autoload();
      });
    };
    const markInput = () => { game.lastInputAt = now(); };
    addEventListener('pointerdown', firstGesture, { capture: true });
    addEventListener('keydown', firstGesture, { capture: true });
    addEventListener('pointermove', markInput, { passive: true });

    const sim = setInterval(() => {
      if (game.save.companion && game.hasSave) game.tick();
      updateTitle();
    }, 10_000);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        game.markHidden();
        if (game.save.flags['ui.muteHidden'] !== false) audio.suspend();
      } else {
        audio.resume();
        if (game.save.companion && game.hasSave) game.markVisible();
      }
      updateTitle();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Debug jump: ?debug&screen=hub
    const jump = url.get('screen') as ScreenId | null;
    if (debug && jump && jump in SCREENS) game.go(jump, Object.fromEntries(url.entries()));

    return () => {
      clearInterval(sim);
      removeEventListener('pointerdown', firstGesture, { capture: true });
      removeEventListener('keydown', firstGesture, { capture: true });
      removeEventListener('pointermove', markInput);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<svelte:window {onkeydown} onclickcapture={coachTap} />

<div class="app-root" bind:this={appRoot}>
  {#key shownNav}
    <div class="screen">
      <Screen />
    </div>
  {/key}

  {#if curtain !== 'off'}<div class="curtain {curtain}" aria-hidden="true"></div>{/if}

  {#if ui.menu && GAME_SCREENS.has(game.screen)}<MenuSheet onclose={() => (ui.menu = false)} />{/if}
  {#if ui.help}<ShortcutHelp onclose={() => (ui.help = false)} />{/if}

  {#if overlays.minigame}
    {@const req = overlays.minigame}
    <div class="mg-overlay">
      <MinigameHost id={req.id} pig={req.pig} applyRewards={false} ondone={(r) => req.resolve(r)} />
    </div>
  {/if}

  {#if brainCoach}
    <!-- phone landscape: a one-row caption that stays on the stage, clear of the rails' keys beside the chip and of
         most of the pig under it -->
    <CoachMark
      target="brain"
      text={`Tap the brain to check on ${CHARACTERS[game.save.companion ?? 'piggy-1'].name}'s Big Brain.`}
      within={viewport.mode === 's' ? '.gl.mode-s .r.stage' : undefined}
      compact={viewport.mode === 's'}
      ondismiss={() => game.unsetFlag('tut.big_brain_coach')}
    />
  {/if}

  <!-- the campus map keeps its pins clear: toasts come up from the bottom there (T: over the place list under the
       map; S, W: over the place list in the right-hand column) -->
  <Toasts place={shownScreen !== 'map' ? 'top' : viewport.mode === 't' ? 'bottom' : 'bottom-end'} />
  <div class="visually-hidden" aria-live="polite">{ui.announcement}</div>

  {#if debug}
    {#await import('./lib/debug/DebugPanel.svelte') then m}
      <m.default />
    {/await}
  {/if}
</div>

<style>
  .app-root {
    position: absolute;
    left: 0;
    right: 0;
    top: var(--vvt, 0px);
    height: var(--vvh, 100%);
    overflow: hidden;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  .app-root :global(input), .app-root :global(textarea) { -webkit-user-select: text; user-select: text; }
  .screen { position: absolute; inset: 0; }

  .curtain {
    position: absolute;
    inset: 0;
    z-index: 90;
    pointer-events: none;
    background:
      repeating-conic-gradient(var(--sakura-4) 0 25%, var(--night) 0 50%) 0 0 / 4px 4px;
  }
  .curtain.close { animation: dither-in 110ms steps(3) both; }
  .curtain.open { animation: dither-in 150ms steps(3) reverse both; }
  @keyframes dither-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .mg-overlay { position: absolute; inset: 0; z-index: 70; background: var(--night); }
</style>
