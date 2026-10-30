<script lang="ts">
  // The KempaPager: your Kempanion at his current spot, LCD care keys, direct play (tap = pet,
  // drag = pick him up and carry him, flick = toss; rub while held = tickle), item sheets, wants, golden
  // petals, crumbs, roll call and the welcome-back letter. Triggered hub scenes play first (via the scene screen).
  import { onMount, untrack } from 'svelte';
  import { NEED_IDS, type AnimId, type CareAction, type ItemCategory, type LocationId, type OutfitId, type PigId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { gameClock } from '../../state/ticker.svelte';
  import { weatherAt } from '../../state/weather';
  import { audio } from '../../audio';
  import {
    outfitHasClip, stage, type BurstKind, type DropResult, type GoldenPetalHandle, type ImpactInfo, type StageLayout,
  } from '../../engine/stage';
  import { findTriggeredScene } from '../../vn';
  import { idleLine, type IdleKind } from '../../ai/heuristic';
  import { CHARACTERS } from '../../content/characters';
  import { HOME_BG, LOCATIONS, whereIs } from '../../content/locations';
  import { timeOfDay, weekday } from '../../time';
  import {
    bondLevel, canDoctorsRounds, canPlayMinigame, catchGoldenPetal, currentWant, dismissWelcomeBack, doctorsRounds,
    freeItems, getItem, goldenPetalAvailable, knownTaste, moodOf, nearBedtime, stampCard, welcomeBack,
    type CareResult, type PetItemDef, type Want, type WelcomeBackLetter,
  } from '../../pet';
  import { MINIGAMES, type MinigameId } from '../../minigames';
  import { hasClip } from '../sprites';
  import { ui } from '../ui.svelte';
  import { viewport } from '../viewport.svelte';
  import { toast } from '../toasts.svelte';
  import GameLayout from '../layout/GameLayout.svelte';
  import StageHost from '../components/StageHost.svelte';
  import LcdIcon from '../components/LcdIcon.svelte';
  import IconButton from '../components/IconButton.svelte';
  import NeedMeter, { NEED_LABEL } from '../components/NeedMeter.svelte';
  import Hearts from '../components/Hearts.svelte';
  import AcornChip from '../components/AcornChip.svelte';
  import ClockChip from '../components/ClockChip.svelte';
  import BrainChip from '../components/BrainChip.svelte';
  import NumberPop from '../components/NumberPop.svelte';
  import Icon from '../components/Icon.svelte';
  import ItemSheet, { type SheetItem } from '../hub/ItemSheet.svelte';
  import ActionSheet, { type SheetAction } from '../hub/ActionSheet.svelte';
  import StatsSheet from '../hub/StatsSheet.svelte';
  import RollCall from '../hub/RollCall.svelte';
  import WelcomeLetter from '../hub/WelcomeLetter.svelte';
  import {
    ACTION_ANIM, ACTION_IDLE, ACTION_SFX, ALT_WIN, DRAG_PX, GROUND_T, GROUND_WS, HARD_BUMP, HARD_THUD, LIFT_FUN, LOW,
    POUT_LINES, TICKLE_LINES, WHOOSH_SPEED, countToss, crumbSpots, groundFromBox, hubSong, idleKind, landingReaction,
    liftFunDue, needsAttention, outfitReaction, popsFor, statusClip, type Pop,
  } from '../hub/hub';

  const pig: PigId = game.save.companion ?? 'piggy-1';
  const ch = CHARACTERS[pig];
  // A triggered hub scene plays first (once per session per scene), before anything is set up here.
  const opened = gameClock.date();
  const triggered = game.save.companion
    ? findTriggeredScene({ location: 'hub', time: timeOfDay(opened), weekday: weekday(opened), save: game.save, date: opened })
    : null;
  const redirect = triggered && !game.session.autoScenes.includes(triggered.id) ? triggered.id : null;
  const ready = game.save.companion !== null && redirect === null;

  // ── derived world state ──
  const p = $derived(game.save.pigs[pig]);
  const d = $derived(new Date(gameClock.minute * 60_000));
  const tod = $derived(timeOfDay(d));
  const asleep = $derived(p.asleep);
  const loc = $derived<LocationId>(asleep ? 'dorm' : whereIs(pig, d));
  const bgId = $derived(loc === 'dorm' ? HOME_BG[pig] : LOCATIONS[loc].bg);
  const placeName = $derived(loc === 'dorm' ? `${ch.name}’s room` : LOCATIONS[loc].name);
  const weather = $derived(weatherAt(d.getTime()));
  const statusAnim = $derived(statusClip(p, gameClock.minute));
  const attention = $derived(needsAttention(p));
  const want = $derived<Want | null>(asleep ? null : currentWant(game.save, pig, gameClock.minute * 60_000));
  const mood = $derived(moodOf(p, pig));
  const level = $derived(bondLevel(p.bond));

  // ── stage geometry (for the want bubble, pops and hit tests) ──
  let layout = $state<StageLayout | null>(null);
  let pigPos = $state({ x: 240, y: 252 });
  const lw = $derived(layout?.logicalWidth ?? stage.logicalWidth ?? 480);
  const head = $derived({ x: (pigPos.x / lw) * 100, y: Math.max(4, ((pigPos.y - 140) / 270) * 100) });

  // ── speech ──
  let line = $state<{ text: string; whisper: boolean } | null>(null);
  let lineTimer: ReturnType<typeof setTimeout> | undefined;

  function ctx() {
    return {
      playerName: game.save.player.name, pig, isCompanion: true, location: loc, timeOfDay: tod,
      needs: { ...p.needs }, mood, sick: p.sick, bondLevel: level, outfit: p.outfit,
    };
  }

  // While his speech bubble is up, the want bubble beside his head steps aside (they collide on narrow stages).
  let speakingUntil = 0;
  let speaking = $state(false);
  let speakTimer: ReturnType<typeof setTimeout> | undefined;

  function say(text: string, whisper = false, bubble = true) {
    if (!text) return;
    line = { text, whisper };
    if (bubble) {
      const ms = Math.min(6000, 1800 + text.length * 55);
      stage.bubble('pig', text, ms);
      speakingUntil = performance.now() + ms;
      speaking = true;
      clearTimeout(speakTimer);
      speakTimer = setTimeout(() => (speaking = performance.now() < speakingUntil - 50), ms);
    }
    // The stage announces its own speech bubbles; lines without one go through the app announcer.
    if (!bubble) ui.announce(`${ch.name}: ${text}`);
    clearTimeout(lineTimer);
    lineTimer = setTimeout(() => (line = null), 12_000);
  }

  function chatter(kind?: IdleKind) {
    const k = kind ?? idleKind(p, Math.random());
    say(idleLine(pig, k, ctx()).text, asleep);
  }

  // ── pops ──
  let pops = $state<Pop[]>([]);
  let popSeq = 0;
  function addPops(r: { needsDelta?: CareResult['needsDelta']; bondDelta?: number; moneyDelta?: number }, at = head) {
    const list = popsFor(r, at.x, at.y + 6, () => ++popSeq);
    if (!list.length) return;
    pops = [...pops, ...list];
    const ids = new Set(list.map((x) => x.id));
    setTimeout(() => (pops = pops.filter((x) => !ids.has(x.id))), 1400);
  }

  // ── clips ──
  let busy = $state(false);

  async function playClip(anim: AnimId, opts?: { times?: number }) {
    const outfit = p.outfit;
    if (outfit !== 'everyday' && !hasClip(pig, outfit, anim) && hasClip(pig, 'everyday', anim)) {
      stage.setActorOutfit('pig', 'everyday', true);
      await stage.playAnim('pig', anim, opts);
      stage.setActorOutfit('pig', outfit, true);
    } else {
      await stage.playAnim('pig', anim, opts);
    }
  }

  const ACTION_BURST: Partial<Record<CareAction, BurstKind>> = {
    feed: 'crumbs', clean: 'bubbles', pet: 'hearts', play: 'notes', sleep: 'zzz', medicine: 'sparkles', gift: 'hearts', tidy: 'sparkles',
  };

  async function handleResult(res: CareResult, action?: CareAction) {
    if (!res.ok) {
      audio.sfx(res.sfx ?? 'ui_error');
      toast(res.reason ?? 'Not right now.', { icon: 'alert', kind: 'warn' });
      if (res.line) say(res.line);
      if (res.anim) void playClip(res.anim);
      return;
    }
    audio.sfx(res.sfx ?? (action ? ACTION_SFX[action] : undefined) ?? 'ui_select');
    addPops(res);
    if (res.line) say(res.line);
    else if (action && ACTION_IDLE[action]) chatter(ACTION_IDLE[action]);
    const burst = action ? ACTION_BURST[action] : undefined;
    if (burst) stage.burstOn('pig', burst);
    if (res.secretRevealed) {
      audio.jingle('daily_bonus');
      toast(`You found ${ch.name}’s secret favorite!`, { icon: 'star', kind: 'bond', ms: 4500 });
      stage.burstOn('pig', 'sparkles');
    }
    if (res.wantFulfilled) {
      toast(`That’s exactly what ${ch.name} wanted!`, { icon: 'heart', kind: 'bond' });
      stage.burstOn('pig', 'hearts');
    }
    if (res.cured) toast(`${ch.name} feels better!`, { icon: 'sparkle', kind: 'good' });
    busy = true;
    try {
      const anim = res.anim ?? (action ? ACTION_ANIM[action] : undefined);
      if (anim) await playClip(anim);
      if (res.reactAnim) await playClip(res.reactAnim);
    } finally {
      busy = false;
    }
  }

  function act(action: CareAction, itemId?: string) {
    sheet = null;
    void handleResult(game.act(pig, action, itemId), action);
  }

  // ── sheets ──
  type SheetId = 'feed' | 'drink' | 'play' | 'wash' | 'care' | 'stats';
  let sheet = $state<SheetId | null>(null);

  function open(s: SheetId) {
    sheet = s;
  }

  function hintFor(it: PetItemDef): string {
    const fx = it.effects;
    const parts: string[] = [];
    if (fx.hunger) parts.push(`TUMMY +${fx.hunger}`);
    if (fx.energy) parts.push(`ENERGY +${fx.energy}`);
    if (fx.fun) parts.push(`FUN +${fx.fun}`);
    if (fx.hygiene) parts.push(`CLEAN +${fx.hygiene}`);
    if (fx.cure) parts.push('cures');
    return parts.slice(0, 2).join(' · ');
  }

  function itemsOf(cats: ItemCategory[]): SheetItem[] {
    const out: SheetItem[] = [];
    const seen = new Set<string>();
    for (const it of freeItems()) {
      if (!cats.includes(it.category)) continue;
      seen.add(it.id);
      out.push({ id: it.id, name: it.name, icon: it.icon, count: null, hint: hintFor(it), taste: knownTaste(game.save, pig, it.id), wanted: want?.kind === 'food' && want.id === it.id });
    }
    for (const [id, n] of Object.entries(game.save.inventory)) {
      const it = getItem(id) as PetItemDef | undefined;
      if (!it || n <= 0 || seen.has(id) || !cats.includes(it.category)) continue;
      out.push({ id, name: it.name, icon: it.icon, count: n, hint: hintFor(it), taste: knownTaste(game.save, pig, id), wanted: want?.kind === 'food' && want.id === id });
    }
    return out.sort((a, b) => Number(b.wanted) - Number(a.wanted));
  }

  function startMinigame(id: MinigameId) {
    const can = canPlayMinigame(game.save, pig, now());
    if (!can.ok) {
      audio.sfx('ui_error');
      toast(can.reason ?? 'Not right now.', { icon: 'energy', kind: 'warn' });
      return;
    }
    sheet = null;
    game.go('minigame', { id, pig, back: 'hub' });
  }

  const playActions = $derived<SheetAction[]>([
    { id: 'ball', label: 'Play ball', icon: 'play', desc: 'FUN +20 · a little tiring', wanted: want?.id === 'play', run: () => act('play') },
    ...(Object.values(MINIGAMES).filter((m) => m.pig === pig || m.anyPig).map((m) => ({
      id: m.id, label: m.title, icon: m.id === 'petals' ? 'petal_gold' : m.id === 'debug' ? 'bug' : m.id === 'perfusion' ? 'ecg' : 'play',
      desc: m.desc || 'Mini-game · acorns and bond', wanted: want?.id?.startsWith('minigame:') ?? false,
      run: () => startMinigame(m.id),
    }))),
  ]);

  const washActions = $derived<SheetAction[]>([
    { id: 'bath', label: 'Bath', icon: 'wash', desc: 'CLEAN to full (every few hours)', wanted: want?.id === 'bath', run: () => act('clean') },
    ...(game.has('lavender_soap') ? [{ id: 'soap', label: 'Bath with Lavender Soap', icon: getItem('lavender_soap')?.icon ?? 'wash', desc: 'Extra fresh', run: () => act('clean', 'lavender_soap') }] : []),
    { id: 'brush', label: 'Brush teeth', icon: 'sparkle', desc: 'CLEAN +10', run: () => act('clean', 'brush') },
    ...(game.has('mint_toothpaste') ? [{ id: 'paste', label: 'Brush with Mint Toothpaste', icon: getItem('mint_toothpaste')?.icon ?? 'sparkle', desc: 'Minty fresh', run: () => act('clean', 'mint_toothpaste') }] : []),
    ...(p.mess > 0 ? [{ id: 'tidy', label: 'Tidy up the crumbs', icon: 'home', desc: `${p.mess} crumb${p.mess === 1 ? '' : 's'} on the floor`, run: () => act('tidy') }] : []),
  ]);

  const rounds = $derived(canDoctorsRounds(game.save));
  const careActions = $derived<SheetAction[]>([
    ...itemsOf(['medicine']).map((it) => ({ id: it.id, label: it.name, icon: it.icon, desc: `${it.hint || 'Medicine'} · ×${it.count ?? '∞'}`, run: () => act('medicine', it.id) })),
    ...(p.sick && pig !== 'piggy-2' ? [{
      id: 'rounds', label: 'Ask Piggy 2 for Doctor’s Rounds', icon: 'ecg', desc: rounds.ok ? 'Instant cure, once per illness' : rounds.reason,
      disabled: !rounds.ok, run: () => doRounds(),
    }] : []),
    { id: 'pharmacy', label: 'Shands pharmacy', icon: 'care', desc: 'Free check-up once a day · medicine for sale', run: () => travel('shands') },
  ]);

  function doRounds() {
    sheet = null;
    const lv = bondLevel(game.save.pigs['piggy-2'].bond);
    const res = doctorsRounds(game.save, now());
    game.report({ pig: 'piggy-2', levelBefore: lv, achievements: res.achievements, tasks: res.tasks });
    game.persist();
    if (res.ok && res.line) {
      if (res.cured) toast(`${ch.name} feels better!`, { icon: 'sparkle', kind: 'good' });
      // The house call plays as a scene (p2_rounds: "Follow my hoof."), then back here.
      game.go('scene', { id: 'p2_rounds', back: 'hub' });
    } else void handleResult(res);
  }

  function lightKey() {
    if (asleep) act('wake');
    else act('sleep');
  }

  function travel(to: LocationId) {
    sheet = null;
    audio.sfx('step');
    game.go('location', { location: to });
  }

  function openTalk() {
    audio.sfx('ui_select');
    game.go('talk', { pig, back: 'hub' });
  }

  // ── wants ──
  function wantTap(w: Want) {
    audio.sfx('question');
    say(w.line);
    if (w.kind === 'food') open(getItem(w.id)?.category === 'drink' ? 'drink' : 'feed');
    else if (w.kind === 'talk') toast(`TALK to ${ch.name} about it!`, { icon: 'talk' });
    else if (w.kind === 'place') toast(`Take a trip to ${w.label} (MAP).`, { icon: 'map' });
    else if (w.id === 'bath') open('wash');
    else if (w.id === 'pet') toast(`Tap ${ch.name} to give him head pats!`, { icon: 'hand' });
    else open('play');
  }

  // ── golden petals ──
  let petal = $state<{ handle: GoldenPetalHandle; x: number } | null>(null);
  let petalTimer: ReturnType<typeof setTimeout> | undefined;

  function schedulePetal(first = false) {
    clearTimeout(petalTimer);
    petalTimer = setTimeout(spawnPetal, first ? 12_000 + Math.random() * 20_000 : 40_000 + Math.random() * 70_000);
  }

  function spawnPetal() {
    if (!petal && !letter && !rollCall && !sheet && goldenPetalAvailable(game.save, now())) {
      const x = 15 + Math.random() * 70;
      const handle = stage.spawnGoldenPetal(catchPetal, { x: (x / 100) * lw, onMiss: () => (petal = null) });
      petal = { handle, x };
    }
    schedulePetal();
  }

  function catchPetal() {
    const money = game.save.money;
    const r = catchGoldenPetal(game.save, now());
    const at = petal ? { x: petal.x, y: 40 } : head;
    petal = null;
    if (!r.ok) return;
    audio.sfx('sparkle');
    game.report({ moneyBefore: money, tasks: r.tasks });
    game.persist();
    addPops({ moneyDelta: r.money }, at);
  }

  function catchByKey() {
    if (petal?.handle.active) petal.handle.catch();
    else petal = null;
  }

  // ── direct play: tap = pet · drag = pick him up · flick = toss (· rub while held = tickle) ──
  // The pig dangles from the hand cursor's pinch (engine: holdActor / moveHeld / releaseHeld), flies with
  // gravity when let go, bounces off the stage edges and reacts to how he came down.
  interface Press { id: number; x0: number; y0: number; onPig: boolean; lifted: boolean; lastX: number; dir: number; turns: number[] }
  let press: Press | null = null;
  /** He is in the hand / in the air after a throw. */
  let holding = $state(false);
  let flying = $state(false);
  /** Stage cursor (fine pointers): pointing hand, open pinch over a liftable pig, pinched while holding. */
  let cursor = $state<'point' | 'grab' | 'hold'>('point');
  let flightToken = 0;
  let poutUntil = 0;
  const tosses: number[] = [];
  let nextHeldOink = 0;
  let lastGiggle = 0;
  let lastTickleBurst = 0;
  let lastTickleLine = -Infinity;
  let lastThud = 0;
  let hovering = false;
  let hoverOnButton = false;
  let hoverX = 0;
  let hoverY = 0;
  let hoverRaf = 0;

  function pick<T>(list: readonly T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  }

  /** Awake and not pouting (asleep: taps still whisper, but he stays in bed). */
  function canLift(): boolean {
    return ready && !asleep && performance.now() >= poutUntil;
  }

  function pigHit(x: number, y: number, touch: boolean): boolean {
    if (stage.actorAtClient(x, y) === 'pig') return true;
    if (!touch) return false;
    // fingers are wide: a box around him counts on touch screens
    const l = stage.clientToLogical(x, y);
    const pos = stage.actorPosition('pig');
    return !!l && !!pos && Math.abs(l.x - pos.x) <= 34 && l.y >= pos.y - 112 && l.y <= pos.y + 10;
  }

  /** While the pig is in the hand the pinched cursor shows everywhere (a drag can leave the stage). */
  function setPageHold(on: boolean) {
    const root = document.documentElement;
    if (on) root.dataset.cursor = 'hold';
    else if (root.dataset.cursor === 'hold') delete root.dataset.cursor;
  }

  function onpointerdown(e: PointerEvent) {
    if (!e.isPrimary || press || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    const onPig = pigHit(e.clientX, e.clientY, e.pointerType === 'touch');
    press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, onPig, lifted: false, lastX: e.clientX, dir: 0, turns: [] };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!onPig || !canLift()) return;
    cursor = 'hold';
    // catch him in mid-air: no drag needed
    if (stage.isAirborne('pig')) lift(e);
  }

  function onpointermove(e: PointerEvent) {
    const g = press;
    if (!g || e.pointerId !== g.id) {
      hover(e);
      return;
    }
    if (g.lifted) {
      stage.moveHeld(e.clientX, e.clientY, e.timeStamp);
      tickleCheck(g, e.clientX);
      return;
    }
    if (g.onPig && canLift() && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > DRAG_PX) lift(e);
  }

  function onpointerup(e: PointerEvent) {
    const g = press;
    if (!g || e.pointerId !== g.id) return;
    press = null;
    if (g.lifted) {
      stage.moveHeld(e.clientX, e.clientY, e.timeStamp);
      letGo(false);
    } else if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) <= DRAG_PX) {
      if (g.onPig) tapPig();
      else emptyTap(e.clientX, e.clientY);
    }
    cursor = 'point';
    hover(e);
  }

  /** pointercancel, lost capture, window blur, tab hidden: set him down gently. */
  function cancelPress() {
    const g = press;
    press = null;
    if (g?.lifted) letGo(true);
    cursor = 'point';
  }

  function lift(e: PointerEvent) {
    const g = press;
    if (!g || !stage.holdActor('pig', e.clientX, e.clientY)) return;
    const caught = flying;
    flightToken++; // a landing still in flight (caught mid-air) no longer reacts
    flying = false;
    g.lifted = true;
    g.lastX = e.clientX;
    holding = true;
    cursor = 'hold';
    setPageHold(true);
    stage.moveHeld(e.clientX, e.clientY, e.timeStamp);
    audio.sfx(caught ? 'surprise' : 'oink');
    nextHeldOink = performance.now() + 2200 + Math.random() * 2500;
    liftFun();
  }

  function letGo(gentle: boolean) {
    if (!holding) return;
    holding = false;
    setPageHold(false);
    const v = gentle ? { vx: 0, vy: 0 } : stage.heldThrow();
    if (Math.hypot(v.vx, v.vy) >= WHOOSH_SPEED) audio.sfx('whoosh');
    flying = true;
    const token = ++flightToken;
    void stage.releaseHeld({ vx: v.vx, vy: v.vy, onImpact }).then((r) => {
      if (token !== flightToken) return;
      flying = false;
      void landed(r);
    });
  }

  /** +2 FUN for a lift, at most every 2 minutes (game clock, kept in the save). */
  function liftFun() {
    const t = now();
    if (!liftFunDue(Number(game.save.flags['hub.liftFunAt'] ?? 0), t)) return;
    game.setFlag('hub.liftFunAt', t);
    const before = p.needs.fun;
    game.changeNeed(pig, 'fun', LIFT_FUN);
    const d = Math.round(p.needs.fun - before);
    if (d > 0) addPops({ needsDelta: { fun: d } });
  }

  /** Rubbing back and forth while he dangles = tickle. */
  function tickleCheck(g: Press, x: number) {
    const dx = x - g.lastX;
    if (Math.abs(dx) < 5) return;
    g.lastX = x;
    const dir = dx > 0 ? 1 : -1;
    if (dir === g.dir) return;
    const turned = g.dir !== 0;
    g.dir = dir;
    if (!turned) return;
    const t = performance.now();
    g.turns.push(t);
    if (g.turns.length > 3) g.turns.shift();
    if (g.turns.length === 3 && t - g.turns[0] <= 900) tickle(t);
  }

  function tickle(t: number) {
    stage.tickleHeld(1);
    nextHeldOink = Math.max(nextHeldOink, t + 1500);
    if (t - lastGiggle >= 380) {
      lastGiggle = t;
      audio.sfx('pet');
    }
    if (t - lastTickleBurst >= 1500) {
      lastTickleBurst = t;
      stage.burstOn('pig', Math.random() < 0.5 ? 'notes' : 'hearts');
    }
    if (t - lastTickleLine >= 30_000) {
      lastTickleLine = t;
      say(pick(TICKLE_LINES[pig]));
    }
  }

  /** A happy oink now and then while he hangs around (rate-limited). */
  function heldChatter() {
    const t = performance.now();
    if (t < nextHeldOink) return;
    nextHeldOink = t + 2600 + Math.random() * 2800;
    audio.sfx('oink_happy');
  }

  function onImpact(hit: ImpactInfo) {
    const t = performance.now();
    if (t - lastThud < 70) return;
    lastThud = t;
    const hard = hit.speed >= (hit.surface === 'floor' ? HARD_THUD : HARD_BUMP);
    if (hard) {
      audio.sfx('ball_hit');
      stage.shake(hit.surface === 'floor' ? 0.3 : 0.2, 280);
    } else if (hit.speed >= 50) {
      audio.sfx('step');
    }
  }

  /** The outfit's own version of a reaction clip (alternate outfits ship only a few). */
  function reactionClip(anim: AnimId): AnimId {
    const outfit = p.outfit;
    if (outfit === 'everyday') return anim;
    return outfitReaction(anim, (a) => outfitHasClip(pig, outfit, a), ALT_WIN[pig]) ?? anim;
  }

  async function landed(r: DropResult) {
    if (r.kind === 'caught' || r.kind === 'gone') return;
    if (r.kind !== 'soft' && countToss(tosses, now())) {
      tosses.length = 0;
      pout();
      return;
    }
    const plan = landingReaction(r.kind);
    if (plan.burst) stage.burstOn('pig', plan.burst);
    if (plan.sfx) audio.sfx(plan.sfx);
    for (const step of plan.steps) {
      if (holding || flying) return; // picked up again: the new landing reacts instead
      if (step.sfx) audio.sfx(step.sfx);
      await playClip(reactionClip(step.anim));
    }
  }

  /** Tossed around too much: he pouts for a moment (no penalty). */
  function pout() {
    poutUntil = performance.now() + 2600;
    if (cursor === 'grab') cursor = 'point';
    audio.sfx('oink_sad');
    stage.burstOn('pig', 'anger');
    say(pick(POUT_LINES[pig]));
    void playClip('angry', { times: 2 });
  }

  function tapPig() {
    if (asleep) {
      audio.sfx('zzz');
      stage.burstOn('pig', 'zzz');
      chatter('sleepy');
      return;
    }
    act('pet');
  }

  function emptyTap(x: number, y: number) {
    const l = stage.clientToLogical(x, y);
    stage.petalPuff(l?.x, l?.y, 5);
  }

  // ── hover cursor (mouse / pen): an open pinch over a pig you can pick up ──
  function hover(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    hovering = true;
    hoverX = e.clientX;
    hoverY = e.clientY;
    hoverOnButton = !!(e.target as HTMLElement | null)?.closest?.('button, a, input');
    if (!hoverRaf) hoverRaf = requestAnimationFrame(updateHover);
  }

  function updateHover() {
    hoverRaf = 0;
    if (press) return;
    const over = hovering && !hoverOnButton && canLift() && stage.actorAtClient(hoverX, hoverY) === 'pig';
    cursor = over ? 'grab' : 'point';
  }

  function leave() {
    hovering = false;
    if (!press) cursor = 'point';
  }

  /** Something re-built the stage (moved, fell asleep, changed clothes): forget the hand. */
  function resetHold() {
    flightToken++;
    holding = false;
    flying = false;
    if (press?.lifted) press = null;
    setPageHold(false);
    cursor = 'point';
  }

  // ── ground line: in W/S the VN box overlays the stage bottom, so he stands on its top edge ──
  let tickerEl = $state<HTMLElement | null>(null);
  let groundY = $state(viewport.mode === 't' ? GROUND_T : GROUND_WS);
  let groundRaf = 0;

  function measureGround(): number {
    if (viewport.mode === 't') return GROUND_T;
    const el = tickerEl;
    if (!el) return GROUND_WS;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return GROUND_WS;
    // the box's outline + shadow ring reach 3 UI pixels above its border box
    const px = parseFloat(getComputedStyle(el).getPropertyValue('--px')) || 3;
    const l = stage.clientToLogical(r.left + r.width / 2, r.top - px * 3);
    return groundFromBox(l ? l.y : null);
  }

  function applyGround() {
    groundY = measureGround();
    stage.setGroundY(groundY);
  }

  function scheduleGround() {
    if (!groundRaf) groundRaf = requestAnimationFrame(() => {
      groundRaf = 0;
      if (ready) applyGround();
    });
  }

  // ── overlays: letter → roll call ──
  let letter = $state<WelcomeBackLetter | null>(null);
  let rollCall = $state(false);
  const awayFlag = $derived(game.save.flags['pet.away']);

  function closeLetter() {
    dismissWelcomeBack(game.save);
    game.persist();
    letter = null;
    rollCall = !stampCard(game.save, now()).claimedToday;
    if (!rollCall) chatter('greet');
  }

  function closeRollCall() {
    rollCall = false;
    chatter(asleep ? 'sleepy' : undefined);
  }

  $effect(() => {
    if (!awayFlag) return;
    untrack(() => { if (!letter) letter = welcomeBack(game.save, now()); });
  });

  // ── attention light beeps twice when it turns on ──
  let prevAttention: boolean | null = null;
  $effect(() => {
    const a = attention;
    untrack(() => {
      if (prevAttention === false && a) {
        audio.sfx('notify');
        setTimeout(() => audio.sfx('notify'), 220);
      }
      prevAttention = a;
    });
  });

  // ── stage setup (re-runs when he moves, falls asleep or changes clothes) ──
  let firstSetup = true;
  async function setupStage(id: string, l: LocationId, outfit: OutfitId, sleeping: boolean) {
    const tr = firstSetup ? 'cut' : 'fade';
    if (firstSetup) stage.reset(); // leftovers from Talk / scenes (portraits, camera, CG, fades)
    firstSetup = false;
    applyGround(); // reset() put the ground back at the stage default
    if (l === 'dorm') await stage.setBackground(id, tr);
    else await stage.setLocation(l, tr);
    stage.clearPortraits();
    resetHold();
    stage.clearActors();
    stage.spawnActor('pig', pig, { x: Math.round((layout?.logicalWidth ?? stage.logicalWidth) / 2), outfit, anim: sleeping ? 'sleep' : 'idle' });
    // Lights out while he sleeps (a daytime nap too).
    stage.setTimeOfDay(sleeping ? 'night' : 'auto');
    if (sleeping) {
      stage.idleBehavior('pig', false);
      void stage.playAnim('pig', 'sleep', { loop: true });
    } else {
      stage.idleBehavior('pig', true, { status: idleStatus(outfit) });
    }
    audio.playSong(hubSong(l, sleeping, tod === 'night'), { fadeMs: 700 });
  }

  function idleStatus(outfit: OutfitId): AnimId | null {
    const s = statusAnim;
    return s && (hasClip(pig, outfit, s) || outfit === 'everyday') ? s : null;
  }

  $effect(() => {
    const id = bgId, l = loc, outfit = p.outfit, sleeping = asleep;
    if (!ready) return;
    untrack(() => void setupStage(id, l, outfit, sleeping));
  });

  $effect(() => {
    void statusAnim;
    untrack(() => { if (ready && !asleep) stage.idleBehavior('pig', true, { status: idleStatus(p.outfit) }); });
  });

  $effect(() => {
    const w = weather;
    untrack(() => { if (ready) stage.setWeather(w); });
  });

  // Density by layout; the player's petal preference is a global scale (App → stage.setPetalScale).
  $effect(() => {
    const mode = viewport.mode;
    untrack(() => { if (ready) stage.setPetals(mode === 'w' ? 'normal' : 'light'); });
  });

  $effect(() => {
    const text = `${placeName}, ${tod}. ${ch.name} ${asleep ? 'is asleep' : p.sick ? 'is a little sick' : `looks ${mood === 'great' || mood === 'good' ? 'happy' : mood === 'okay' ? 'okay' : 'a bit down'}`}.`;
    untrack(() => { if (ready) stage.setDescription(text); });
  });

  const crumbs = $derived(crumbSpots(Math.min(5, p.mess), game.save.createdAt + p.mess, groundY));

  // Re-measure the ground when the layout mode or the text size changes the VN box…
  $effect(() => {
    void viewport.mode;
    void ui.textSize;
    untrack(scheduleGround);
  });

  // …or the box itself resizes.
  $effect(() => {
    const el = tickerEl;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => scheduleGround());
    ro.observe(el);
    return () => ro.disconnect();
  });

  // ── mount ──
  onMount(() => {
    if (redirect) {
      game.session.autoScenes.push(redirect);
      game.go('scene', { id: redirect, back: 'hub' });
      return;
    }
    if (!ready) { game.go('select'); return; }
    game.recordDay();

    letter = welcomeBack(game.save, now());
    if (!letter) rollCall = !stampCard(game.save, now()).claimedToday;

    const offLayout = stage.onLayout((l) => {
      layout = l;
      scheduleGround();
    });
    const posTimer = setInterval(() => {
      const pos = stage.actorPosition('pig');
      if (pos && (pos.x !== pigPos.x || pos.y !== pigPos.y)) pigPos = pos;
      if (holding) heldChatter();
      else if (hovering && !press) updateHover(); // he may have walked under a resting cursor
    }, 200);

    let talkTimer: ReturnType<typeof setTimeout>;
    const scheduleTalk = (ms: number) => {
      talkTimer = setTimeout(() => {
        if (!letter && !rollCall && !sheet && !busy && !holding && !flying) chatter();
        scheduleTalk(20_000 + Math.random() * 20_000);
      }, ms);
    };
    if (!letter && !rollCall) setTimeout(() => chatter(asleep ? 'sleepy' : 'greet'), 700);
    scheduleTalk(18_000);
    schedulePetal(true);

    // Losing the pointer (alt-tab, tab hidden) sets him down gently.
    const onBlur = () => {
      if (press?.lifted || holding) cancelPress();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onBlur();
    };
    addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      offLayout();
      clearInterval(posTimer);
      clearTimeout(talkTimer);
      clearTimeout(petalTimer);
      clearTimeout(lineTimer);
      cancelAnimationFrame(hoverRaf);
      cancelAnimationFrame(groundRaf);
      removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      flightToken++; // a landing still in the air must not react on the next screen
      if (holding) void stage.releaseHeld({ vx: 0, vy: 0 });
      press = null;
      setPageHold(false);
      petal?.handle.cancel();
      stage.idleBehavior('pig', false);
      stage.clearBubbles();
      stage.setTimeOfDay('auto');
    };
  });

  const keyDesc = (label: string, n: 'hunger' | 'energy' | 'hygiene' | 'fun') =>
    `${label}. ${NEED_LABEL[n]} ${Math.round(p.needs[n])} of 100.`;
</script>

{#if ready}
  <GameLayout chrome="pager">
    {#snippet status()}
      <div class="statusbar">
        <span class="place" title={placeName}><Icon id={loc === 'dorm' ? 'home' : 'pin'} size={18} /> <span class="pname">{placeName}</span></span>
        <ClockChip small />
        <span class="spacer"></span>
        <AcornChip small />
        {#if viewport.mode !== 's'}<BrainChip small />{/if}
      </div>
    {/snippet}

    {#snippet dock()}
      <div class="dockbar">
        <IconButton icon="map" label="Map" showLabel={viewport.mode === 't'} onclick={() => game.go('map')} />
        <IconButton icon="bag" label="Bag" showLabel={viewport.mode === 't'} onclick={() => game.go('bag', { back: 'hub', pigs: [pig] })} />
        <IconButton icon="menu" label="Menu" showLabel={viewport.mode === 't'} onclick={() => (ui.menu = true)} />
      </div>
    {/snippet}

    {#snippet top()}
      <div class="keys" role="group" aria-label="Care">
        <LcdIcon icon="feed" label="Feed" describe={keyDesc('Feed', 'hunger')} lit={p.needs.hunger < LOW} active={sheet === 'feed'} onclick={() => open('feed')} />
        <LcdIcon icon="drink" label="Drink" describe={keyDesc('Drink', 'hunger')} lit={p.needs.hunger < LOW} active={sheet === 'drink'} onclick={() => open('drink')} />
        <LcdIcon icon="play" label="Play" describe={keyDesc('Play', 'fun')} lit={p.needs.fun < LOW} active={sheet === 'play'} onclick={() => open('play')} />
        <LcdIcon icon="wash" label="Wash" describe={keyDesc('Wash', 'hygiene')} lit={p.needs.hygiene < LOW || p.mess > 0} active={sheet === 'wash'} onclick={() => open('wash')} />
      </div>
    {/snippet}

    {#snippet info()}
      <div class="needs" aria-label="{ch.name}'s needs">
        {#each NEED_IDS as n (n)}
          <NeedMeter need={n} value={p.needs[n]} compact={viewport.mode !== 'w'} pipsOnly={viewport.mode === 's'} />
        {/each}
        <Hearts bond={p.bond} variant={viewport.mode === 'w' ? 'chip' : 'mini'} showBar={viewport.mode === 'w'} />
      </div>
    {/snippet}

    {#snippet stage()}
      <div
        class="stage-wrap"
        role="presentation"
        data-cursor={cursor}
        {onpointerdown}
        {onpointermove}
        {onpointerup}
        onpointercancel={cancelPress}
        onlostpointercapture={(e) => { if (press && e.pointerId === press.id) cancelPress(); }}
        onpointerleave={leave}
      >
        <StageHost label="{placeName}. {ch.name}{asleep ? ' is asleep' : ''}.">
          {#each crumbs as c, i (i)}
            <button type="button" class="crumb" style:left="{c.x}%" style:top="{c.y}%" aria-label="Crumbs. Tap to tidy up." onclick={() => act('tidy')}>
              <span class="bits" aria-hidden="true"></span>
            </button>
          {/each}

          {#if want && !holding && !flying && !speaking}
            <button type="button" class="want" style:left="{Math.min(head.x + 8, 70)}%" style:top="{head.y + 14}%" onclick={() => wantTap(want)} aria-label="{ch.name} is thinking about {want.label}">
              <Icon id={want.icon} size={24} />
              <span class="wl">{want.label}</span>
            </button>
          {/if}

          {#if petal}
            <button type="button" class="petal-chip" onclick={catchByKey}>
              <Icon id="petal_gold" size={18} /> Golden petal!
            </button>
          {/if}

          {#if attention}
            <button type="button" class="attention" onclick={() => open('stats')} aria-label="{ch.name} needs attention. Open stats.">
              <Icon id="alert" size={22} />
            </button>
          {/if}

          {#each pops as pop (pop.id)}
            <NumberPop text={pop.text} x={pop.x} y={pop.y} color={pop.color} delay={pop.delay} />
          {/each}
        </StageHost>
      </div>
    {/snippet}

    {#snippet bottom()}
      <div class="keys" role="group" aria-label="More care">
        <LcdIcon icon={asleep ? 'sun' : 'light'} label={asleep ? 'Wake' : 'Light'} describe={asleep ? `Wake ${ch.name} up` : `Lights out: tuck ${ch.name} in or nap. Energy ${Math.round(p.needs.energy)} of 100.`} lit={!asleep && (p.needs.energy < LOW || nearBedtime(pig, gameClock.ms))} onclick={lightKey} />
        <LcdIcon icon="care" label="Care" describe={p.sick ? `Care. ${ch.name} is sick.` : 'Care: medicine and check-ups'} lit={p.sick} active={sheet === 'care'} onclick={() => open('care')} />
        <LcdIcon icon="talk" label="Talk" describe="Talk with {ch.name}" lit={want?.kind === 'talk'} onclick={openTalk} />
        <LcdIcon icon="stats" label="Stats" describe="Stats, bond and wardrobe" active={sheet === 'stats'} onclick={() => open('stats')} />
      </div>
    {/snippet}

    {#snippet text()}
      <button type="button" class="ticker vn-box" bind:this={tickerEl} onclick={openTalk} aria-label="Talk to {ch.name}">
        <span class="plate" style:background={ch.color}>{ch.name}</span>
        <span class="say" class:whisper={line?.whisper ?? asleep}>
          {#if line}{line.text}{:else if asleep}{ch.name} is asleep. Shh… (WAKE wakes him up){:else}Tap to pet · drag to pick up · flick to toss{/if}
        </span>
        <span class="more" aria-hidden="true">TALK ▶</span>
      </button>
    {/snippet}
  </GameLayout>

  {#if sheet === 'feed'}
    <ItemSheet title="Feed" icon="feed" items={itemsOf(['food'])} onpick={(id) => act('feed', id)} onclose={() => (sheet = null)}
      empty="No snacks in the bag. The Dining Hall Tray is always free!">
      {#snippet footer()}<button type="button" class="px-btn small" onclick={() => travel('reitz')}><Icon id="bag" size={18} /> Shop at the Reitz Union</button>{/snippet}
    </ItemSheet>
  {:else if sheet === 'drink'}
    <ItemSheet title="Drink" icon="drink" items={itemsOf(['drink'])} onpick={(id) => act('feed', id)} onclose={() => (sheet = null)}
      empty="Nothing to drink in the bag. Water is always free!">
      {#snippet footer()}<button type="button" class="px-btn small" onclick={() => travel('reitz')}><Icon id="bag" size={18} /> Shop at the Reitz Union</button>{/snippet}
    </ItemSheet>
  {:else if sheet === 'play'}
    <ActionSheet title="Play" icon="play" actions={playActions} onclose={() => (sheet = null)} />
  {:else if sheet === 'wash'}
    <ActionSheet title="Wash" icon="wash" actions={washActions} onclose={() => (sheet = null)} />
  {:else if sheet === 'care'}
    <ActionSheet title="Care" icon="care" actions={careActions} onclose={() => (sheet = null)}>
      <p class="care-note">{p.sick ? `${ch.name} is under the weather. Medicine, rest, or a check-up will help.` : `${ch.name} is healthy. Keep some medicine in the bag just in case.`}</p>
    </ActionSheet>
  {:else if sheet === 'stats'}
    <StatsSheet {pig} onclose={() => (sheet = null)} onoutfit={(o) => stage.setActorOutfit('pig', o, true)} />
  {/if}

  {#if letter}
    <WelcomeLetter {letter} onclose={closeLetter} />
  {:else if rollCall}
    <RollCall {pig} onclose={closeRollCall} onomikuji={() => travel('century_tower')} />
  {/if}
{/if}

<style>
  .statusbar {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    width: 100%;
    padding: 4px 8px;
    color: var(--paper);
  }
  .place { display: inline-flex; align-items: center; gap: 4px; min-width: 0; font-size: 14px; }
  .pname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .spacer { flex: 1; }
  .dockbar { display: flex; flex-direction: var(--dir, row); gap: 6px; width: 100%; }
  .keys { display: flex; flex-direction: var(--dir, row); gap: 6px; width: 100%; }
  .keys > :global(.lcd) { flex: 1 1 0; }
  .needs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }

  /* Cursor: the pixel hand from styles/cursors.css, switched through data-cursor (point / grab / hold). */
  .stage-wrap { position: absolute; inset: 0; touch-action: none; -webkit-user-select: none; user-select: none; }

  .crumb {
    position: absolute;
    width: 44px;
    height: 44px;
    transform: translate(-50%, -50%);
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
  }
  .bits {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 3px;
    height: 3px;
    background: #c98b4a;
    box-shadow: 5px 2px 0 #9a6230, -4px 3px 0 #e0b070, 2px -3px 0 #9a6230, -6px -1px 0 #c98b4a;
    transform: scale(max(1, calc(var(--u, 2px) / 1px * 0.6)));
  }
  .crumb:focus-visible { outline: var(--px) dashed var(--gold); }

  /* Thought bubble beside his head (speech bubbles from the stage go above it). */
  .want {
    position: absolute;
    transform: translate(0, -100%);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 4px 10px 4px 6px;
    background: var(--paper);
    color: var(--ink);
    border: var(--px) solid var(--ink);
    border-radius: 0;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    pointer-events: auto;
    box-shadow: 0 var(--px) 0 var(--ink);
    animation: want-bob 1.6s steps(2) infinite;
  }
  .want::before, .want::after {
    content: '';
    position: absolute;
    background: var(--paper);
    box-shadow: 0 0 0 var(--px) var(--ink);
  }
  .want::before { left: -10px; bottom: 6px; width: 6px; height: 6px; }
  .want::after { left: -18px; bottom: 0; width: 4px; height: 4px; }
  .wl { max-width: 9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @keyframes want-bob { 50% { transform: translate(0, calc(-100% - 2px)); } }

  .attention {
    position: absolute;
    right: 6px;
    top: 6px;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    animation: att-blink 1s steps(1) infinite;
  }
  @keyframes att-blink { 50% { opacity: 0.35; } }

  .petal-chip {
    position: absolute;
    left: 6px;
    top: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 0 10px;
    border: var(--px) solid var(--gold);
    background: rgba(26, 16, 48, 0.8);
    color: var(--gold);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    pointer-events: auto;
  }

  .ticker {
    position: relative;
    display: block;
    width: 100%;
    min-height: 64px;
    padding: 18px 12px 10px;
    font: inherit;
    font-size: var(--fs, 16px);
    line-height: 1.4;
    text-align: left;
    cursor: pointer;
  }
  .plate {
    position: absolute;
    left: 10px;
    top: -12px;
    padding: 1px 10px;
    color: var(--ink);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14px;
    text-shadow: none;
    border: 2px solid var(--ink);
  }
  .say { display: block; min-height: 2.8em; }
  .whisper { opacity: 0.7; font-style: italic; font-size: 0.92em; }
  .more { position: absolute; right: 10px; bottom: 4px; font-family: var(--font-display); font-size: 11px; color: var(--sakura-2); }
  .care-note { margin: 0; font-size: 14px; }

  /* ── mode tuning ── */
  :global(.mode-t) .keys { padding: 6px 8px; height: 60px; }
  :global(.mode-t) .needs { width: 100%; justify-content: space-between; gap: 4px 6px; padding: 4px 6px; background: rgba(26, 16, 48, 0.85); }
  :global(.mode-t) .dockbar { padding: 6px 8px; }
  :global(.mode-t) .dockbar > :global(*) { flex: 1; }
  :global(.mode-t) .ticker { margin: 14px 8px 6px; width: auto; }
  :global(.mode-t.chrome-pager) .statusbar { color: var(--ink); background: rgba(255, 255, 255, 0.35); }

  :global(.mode-w) .statusbar {
    width: auto;
    font-size: calc(var(--u) * 6);
    background: rgba(26, 16, 48, 0.78);
    border: var(--px) solid var(--box-edge);
    padding: calc(var(--u) * 1.5) calc(var(--u) * 4);
  }
  :global(.mode-w) .keys { width: auto; --lcd-w: max(48px, calc(var(--u) * 22)); --lcd-h: max(48px, calc(var(--u) * 22)); --lcd-icon: max(24px, calc(var(--u) * 11)); --lcd-font: max(9px, calc(var(--u) * 4)); }
  :global(.mode-w) .keys > :global(.lcd) { flex: 0 0 auto; }
  :global(.mode-w) .needs {
    flex-direction: column;
    align-items: stretch;
    padding: calc(var(--u) * 3) calc(var(--u) * 4);
    background: rgba(26, 16, 48, 0.78);
    border: var(--px) solid var(--box-edge);
    min-width: calc(var(--u) * 92);
  }
  :global(.mode-w) .dockbar { width: auto; }
  :global(.mode-w) .ticker { min-height: calc(var(--u) * 36); padding: calc(var(--u) * 7) calc(var(--u) * 6) calc(var(--u) * 4); }
  :global(.mode-w) .plate { font-size: calc(var(--u) * 6); top: calc(var(--u) * -5); }

  :global(.mode-s) .keys { height: 100%; }
  :global(.mode-s) .keys > :global(.lcd) { --lcd-icon: 26px; --lcd-font: 9px; }
  :global(.mode-s) .dockbar > :global(*) { flex: 1; min-height: 44px; }
  :global(.mode-s) .statusbar { width: auto; background: rgba(26, 16, 48, 0.78); font-size: 12px; }
  :global(.mode-s) .needs { background: rgba(26, 16, 48, 0.78); padding: 4px 6px; max-width: 46%; }
  :global(.mode-s) .ticker { min-height: 0; padding: 14px 10px 6px; font-size: 14px; }
  /* W/S: the box overlays the stage and the pig stands on its top edge, so it keeps a steady two-line
     height (a rare third line is clipped here; the full line is in his speech bubble too). */
  :global(.mode-w) .say, :global(.mode-s) .say {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    height: 2.8em;
    min-height: 0;
    overflow: hidden;
  }

  :global(html.reduce-motion) .want, :global(html.reduce-motion) .attention { animation: none; }
</style>
