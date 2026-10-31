<script lang="ts">
  // A campus spot: background + busts of the pigs here now (or an empty-place vibe line), Talk / Gift,
  // and the place's own actions (mini-game, shop, omikuji, pharmacy, bats, cheer, study, home).
  // Arriving reports a 'visit' signal and auto-plays any eligible scene first.
  import { onMount, untrack } from 'svelte';
  import { PIG_IDS, type Expression, type LocationId, type PigId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { gameClock } from '../../state/ticker.svelte';
  import { weatherAt } from '../../state/weather';
  import { audio } from '../../audio';
  import { stage, type PortraitPos } from '../../engine/stage';
  import { NARROW_W } from '../../engine/layout';
  import { findTriggeredScene } from '../../vn';
  import { idleLine } from '../../ai/heuristic';
  import { CHARACTERS } from '../../content/characters';
  import ActivityLabel from '../components/ActivityLabel.svelte';
  import { actionKind, type ActivityKind } from '../location/activities';
  import { LOCATIONS, isBedtime, whereIs, type LocationAction } from '../../content/locations';
  import { localDate, timeOfDay, weekday } from '../../time';
  import {
    bondLevel, canPlayMinigame, freeCheckup, getItem, knownTaste, omikujiToday, recordSignal, rollOmikuji,
    type CareResult, type OmikujiSlip,
  } from '../../pet';
  import { rngFor } from '../../pet/rng';
  import {
    THOUGHT, firstBeatMs, markThought, pickThought, thinkBlock, thoughtGap, thoughtName, type Thought,
  } from '../../pet/thoughts';
  import { MINIGAMES, type MinigameId } from '../../minigames';
  import { toast } from '../toasts.svelte';
  import { modalOpen, ui } from '../ui.svelte';
  import {
    bubbleMs, cloudSize, iconCloudSize, maxThoughts, overlayRects, placeBubble, portraitHead, thoughtSpeed, type Placed,
  } from '../bubbles';
  import { nextThinkers, slotsAdjacent } from '../location/thinkers';
  import GameLayout from '../layout/GameLayout.svelte';
  import StageHost from '../components/StageHost.svelte';
  import ThoughtBubble from '../components/ThoughtBubble.svelte';
  import ClockChip from '../components/ClockChip.svelte';
  import AcornChip from '../components/AcornChip.svelte';
  import Icon from '../components/Icon.svelte';
  import PigFace from '../components/PigFace.svelte';
  import Modal from '../components/Modal.svelte';
  import ItemSheet, { type SheetItem } from '../hub/ItemSheet.svelte';
  import ActionSheet, { type SheetAction } from '../hub/ActionSheet.svelte';
  import { gameOn, vibeLine } from '../location/vibes';

  const params = game.params as { location?: LocationId; focus?: PigId; returning?: boolean };
  const loc: LocationId = params.location && LOCATIONS[params.location] ? params.location : game.save.location;
  const def = LOCATIONS[loc];
  const companion = game.save.companion;
  const arrived = gameClock.date();
  const tod = timeOfDay(arrived);

  /** Awake pigs out here right now (an asleep Kempanion is home). */
  const present: PigId[] = loc === 'dorm'
    ? []
    : PIG_IDS.filter((p) => !(game.save.pigs[p].asleep && p === companion) && whereIs(p, arrived) === loc);
  /** At Sakura House: who's home (awake or asleep). */
  const home: PigId[] = loc === 'dorm' ? PIG_IDS.filter((p) => (game.save.pigs[p].asleep && p === companion) || whereIs(p, arrived) === 'dorm') : [];

  /** "Piggy 1, Piggy 2, and Piggy 3" */
  const listNames = (ps: PigId[]) => new Intl.ListFormat('en', { type: 'conjunction' }).format(ps.map((p) => CHARACTERS[p].name));
  /** A name that stays on one line in a command ("Talk to Piggy" / "2" on a 375px phone). */
  const oneLine = (p: PigId) => CHARACTERS[p].name.replace(/ /g, '\u00a0');
  /** Phones: the status bar shares its row with the clock, so long names get a short form there (the map and the
      picture's label keep the full one). */
  const SHORT_NAME: Partial<Record<LocationId, string>> = {
    communicore: 'Communicore', marston: 'Marston Library', stadium: 'The Swamp', plaza: 'The Plaza', volleyball_courts: 'Volleyball Courts',
  };
  const shortName = SHORT_NAME[loc];

  let line = $state<{ speaker: PigId | null; text: string }>({ speaker: null, text: '' });
  let giftFor = $state<PigId | null>(null);
  let pickRecipient = $state(false);
  let slip = $state<OmikujiSlip | null>(null);

  // The command list scrolls when it can't fit (phone landscape): show "▼ more" over a fade while rows are hidden below.
  let cmdsEl = $state<HTMLElement>();
  let more = $state(false);
  let gutter = $state(0);
  $effect(() => {
    const el = cmdsEl;
    if (!el) return;
    const measure = () => {
      more = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
      gutter = el.offsetWidth - el.clientWidth; // keep the cue off a desktop scrollbar
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    for (const row of el.children) ro?.observe(row); // web fonts and relabelled commands resize rows
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener('scroll', measure);
    };
  });

  /** A line in the text box (and his speech bubble). Speech owns the moment: every thought cloud goes, and none comes
   *  back while the line is still up. `ms`: the bubble's time (default 1.8 s + 55 ms per character, at most 6 s). */
  function say(speaker: PigId | null, text: string, ms?: number) {
    endClouds();
    line = { speaker, text };
    const dur = ms ?? Math.min(6000, 1800 + text.length * 55);
    speakingUntil = performance.now() + dur;
    if (speaker && present.includes(speaker)) {
      stage.bubble(speaker, text, dur);
      lastSpeaker = speaker;
    }
  }

  // ── thoughts (thoughts final.md §6): clouds over the pigs here; one on phones, at most two on the wide stage ──
  interface Cloud { t: Thought; pos: PortraitPos; at: Placed; shownAt: number }
  let clouds = $state<Cloud[]>([]);
  let layerEl = $state<HTMLElement | null>(null);
  let speakingUntil = 0;
  let lastSpeaker: PigId | null = null;
  const lastThought: Partial<Record<PigId, number>> = {};
  /** Bumped whenever something sets a pig's face, so a tapped thought's face only resets if nothing changed it since. */
  const faceToken: Record<PigId, number> = { 'piggy-1': 0, 'piggy-2': 0, 'piggy-3': 0 };
  let beat = 0;
  let beatTimer: ReturnType<typeof setTimeout> | undefined;
  let alive = true;
  /** The game minute the place opened: seeds this visit's rhythm. */
  const visit = gameClock.minute;
  /** ?debug&thoughts=fast (Playwright): gaps × 0.15. */
  const speed = thoughtSpeed();

  const slotOf = (p: PigId): PortraitPos => POS[present.length][present.indexOf(p)];
  const arrivalFace = (p: PigId): Expression => (bondLevel(game.save.pigs[p].bond) >= 2 ? 'happy' : 'neutral');
  const thinkingAbout = $derived(clouds.map((c) => ` ${CHARACTERS[c.t.pig].name} is thinking about ${c.t.label}.`).join(''));

  /** Narrow stages draw only the featured portrait: the newest one shown (nobody calls setTalking here). */
  function drawn(p: PigId): boolean {
    return stage.logicalWidth >= NARROW_W || p === present[present.length - 1];
  }

  function stageView(): HTMLElement | null {
    return (layerEl?.closest('.stage-view') as HTMLElement | null) ?? null;
  }

  /** Where his cloud fits right now (§9.3), or null: then he doesn't think this beat and nothing is marked. */
  function placeFor(p: PigId, t: Thought, exclude: Element | null = null): Placed | null {
    const view = stageView();
    const root = view?.closest('.stage-root') as HTMLElement | null;
    if (!view || !root) return null;
    const vr = view.getBoundingClientRect();
    if (!(vr.width > 0 && vr.height > 0)) return null;
    const u = stage.u;
    const cs = getComputedStyle(view);
    const px = parseFloat(cs.getPropertyValue('--px')) || 2;
    const barTop = (parseFloat(cs.getPropertyValue('--bubble-top')) || 0) - (vr.top - root.getBoundingClientRect().top);
    const h = portraitHead(slotOf(p), POS[present.length], stage.logicalWidth);
    return placeBubble({
      view: { w: vr.width, h: vr.height },
      head: { x: h.x * u, y: h.y * u, halfW: h.halfW * u, k: h.k },
      size: cloudSize(t.label.length, px),
      icon: iconCloudSize(px),
      tail: 10 * px,
      topMin: Math.max(4, barTop + 4),
      maxDrop: 40 * h.k * u,
      keepOut: overlayRects(view, exclude),
      placement: 'above',
    });
  }

  function beatBlocked(): boolean {
    return pickRecipient || !!giftFor || !!slip || ui.menu || ui.help || modalOpen()
      || document.visibilityState === 'hidden' || performance.now() < speakingUntil;
  }

  function scheduleBeat(ms: number) {
    clearTimeout(beatTimer);
    beatTimer = setTimeout(runBeat, Math.max(0, ms));
  }

  function runBeat() {
    beatTimer = undefined;
    if (!alive) return;
    const cap = maxThoughts(stageView()?.getBoundingClientRect().width ?? 0);
    if (beatBlocked() || clouds.length >= cap) return scheduleBeat(4000); // try again soon, not a whole gap
    const at = now();
    const first = clouds[0];
    // A second cloud (wide stage only): a non-adjacent slot, at least 2.5 s after the first.
    if (first && performance.now() - first.shownAt < 2500) return scheduleBeat(2500);
    const candidates = present.filter((p) => !clouds.some((c) => c.t.pig === p) && thinkBlock(game.save, p, at) === null
      && drawn(p) && (!first || !slotsAdjacent(slotOf(p), first.pos, present.length)));
    let shown: Thought | null = null;
    const order = nextThinkers(candidates, { rand: rngFor('thinker', loc, localDate(at), beat), lastThought, lastSpeaker });
    for (const p of order) {
      const t = pickThought(game.save, p, { now: at, location: loc, weather: weatherAt(at), screen: 'place', others: present.filter((o) => o !== p) });
      if (!t) continue;
      const placed = placeFor(p, t);
      if (!placed) continue; // no room over his head: try the next pig, and this pick comes back another beat
      markThought(game.save, p, t, at);
      game.persist();
      clouds = [...clouds, { t, pos: slotOf(p), at: placed, shownAt: performance.now() }];
      lastThought[p] = performance.now();
      lastSpeaker = p;
      shown = t;
      break;
    }
    beat++;
    scheduleBeat(thoughtGap(game.save, shown?.pig ?? present[0], at, {
      beat, visit, screen: 'place', onScreen: present.length, afk: at - game.lastInputAt > THOUGHT.afkMs,
      minMs: shown && cap === 1 ? shown.ms + THOUGHT.restMs : 0,
    }) * speed);
  }

  function focusTalk(p: PigId) {
    cmdsEl?.querySelector<HTMLElement>(`[data-key="talk-${p}"]`)?.focus();
  }

  /** Speech, a sheet or a hidden tab: every cloud goes. Focus on a cloud moves to that pig's "Talk to …". */
  function endClouds(refocus = true) {
    if (!clouds.length) return;
    const id = (document.activeElement as HTMLElement | null)?.closest?.('[data-thought]')?.getAttribute('data-thought');
    const focused = id ? clouds.find((c) => c.t.id === id)?.t.pig : undefined;
    clouds = [];
    if (refocus && focused) focusTalk(focused);
  }

  function removeCloud(c: Cloud) {
    clouds = clouds.filter((x) => x !== c);
  }

  /** Tap (§6.2): his face, his line in the bubble and the text box; the face goes back once the bubble is down. */
  function cloudTap(c: Cloud, hadFocus: boolean) {
    if (!clouds.includes(c)) return; // already fading out
    audio.sfx('ui_select');
    endClouds(false);
    const p = c.t.pig;
    const token = ++faceToken[p];
    stage.setExpression(p, c.t.face);
    const ms = bubbleMs(c.t.line);
    say(p, c.t.line, ms);
    game.count('thoughts_heard'); // no bond, no acorns
    setTimeout(() => {
      if (alive && faceToken[p] === token && present.includes(p)) stage.setExpression(p, arrivalFace(p));
    }, ms);
    if (hadFocus) focusTalk(p);
  }

  // Sheets, the omikuji slip and the menu take the moment too.
  $effect(() => {
    if (pickRecipient || giftFor || slip || ui.menu || ui.help) untrack(() => endClouds());
  });

  // A resize or rotation moves the heads: re-place each cloud, or let it go when it no longer fits.
  function replaceClouds() {
    if (!clouds.length) return;
    const next: Cloud[] = [];
    for (const c of clouds) {
      const el = layerEl?.querySelector(`[data-thought="${c.t.id}"]`) ?? null;
      const at = placeFor(c.t.pig, c.t, el);
      if (at) next.push({ ...c, at });
    }
    clouds = next;
  }

  function ctxFor(p: PigId) {
    const s = game.save.pigs[p];
    return { playerName: game.save.player.name, pig: p, isCompanion: p === companion, location: loc, timeOfDay: tod, needs: { ...s.needs }, sick: s.sick, bondLevel: bondLevel(s.bond) };
  }

  // ── actions ──
  /** Sub-screens (talk, games, scenes, shop) come back here; don't count that as a new arrival. */
  const backParams = { location: loc, returning: true };
  function leaveForSub() {
    (game.params as { returning?: boolean }).returning = true;
  }

  function talk(p: PigId) {
    audio.sfx('ui_select');
    leaveForSub();
    game.go('talk', { pig: p, back: 'location', backParams });
  }

  function giftItems(): SheetItem[] {
    const out: SheetItem[] = [];
    for (const [id, n] of Object.entries(game.save.inventory)) {
      const it = getItem(id);
      if (!it || n <= 0 || it.category !== 'gift') continue;
      out.push({ id, name: it.name, icon: it.icon, count: n, taste: giftFor ? knownTaste(game.save, giftFor, id) : null });
    }
    return out;
  }

  function startGift() {
    if (present.length > 1) { pickRecipient = true; return; }
    giftFor = present[0] ?? null;
  }

  function give(id: string) {
    const p = giftFor;
    giftFor = null;
    if (!p) return;
    showResult(p, game.act(p, 'gift', id), 'gift');
  }

  function showResult(p: PigId, res: CareResult, kind: 'gift' | 'care') {
    if (!res.ok) {
      audio.sfx(res.sfx ?? 'ui_error');
      toast(res.reason ?? 'Not right now.', { icon: 'alert', kind: 'warn' });
      if (res.line) say(p, res.line);
      return;
    }
    audio.sfx(res.sfx ?? (kind === 'gift' ? 'gift' : 'ui_select'));
    if (res.expression && present.includes(p)) {
      faceToken[p]++;
      stage.setExpression(p, res.expression);
    }
    if (res.line) say(p, res.line);
    if (res.bondDelta && res.bondDelta > 0) toast(`${CHARACTERS[p].name} +${res.bondDelta} ♥`, { icon: 'heart', kind: 'bond' });
    if (res.secretRevealed) toast(`You found ${CHARACTERS[p].name}’s secret favorite!`, { icon: 'star', kind: 'bond' });
    if (present.includes(p)) stage.burst('hearts');
  }

  function playGame(id: MinigameId) {
    const mg = MINIGAMES[id];
    const pig: PigId = mg.anyPig ? (present[0] ?? companion ?? mg.pig) : mg.pig;
    const can = canPlayMinigame(game.save, pig, now());
    if (!can.ok) {
      audio.sfx('ui_error');
      toast(can.reason ?? 'Not right now.', { icon: 'energy', kind: 'warn' });
      return;
    }
    audio.sfx('ui_select');
    leaveForSub();
    game.go('minigame', { id, pig, back: 'location', backParams });
  }

  function omikuji() {
    const money = game.save.money;
    const s = rollOmikuji(game.save, now());
    game.report({ moneyBefore: money, tasks: s.tasks });
    game.checkAchievements();
    game.persist();
    audio.sfx(s.fresh ? 'bell' : 'ui_open');
    if (s.fresh) audio.jingle('daily_bonus');
    slip = s;
  }

  function pharmacy() {
    const res = freeCheckup(game.save, now());
    game.report({ achievements: res.achievements, tasks: res.tasks });
    game.persist();
    if (!res.ok) {
      audio.sfx('ui_error');
      toast(res.reason ?? 'Not right now.', { icon: 'care', kind: 'warn' });
      return;
    }
    audio.sfx(res.sfx ?? 'medicine');
    say(res.cured && companion ? companion : null, res.line ?? 'Clean bill of health.');
    if (res.cured) toast(`${companion ? CHARACTERS[companion].name : 'Your Kempanion'} feels better!`, { icon: 'sparkle', kind: 'good' });
  }

  function bats() {
    const dusk = tod === 'evening' || (tod === 'night' && arrived.getHours() < 21);
    if (dusk) {
      audio.sfx('bats');
      stage.burst('sparkles');
      say(null, 'The bat houses rustle, then pour: a dark ribbon of bats spirals out over Lake Alice into the sunset. Everyone goes quiet.');
      game.count('bats_watched');
    } else {
      audio.sfx('question');
      say(null, 'The bat houses are quiet. The bats come out about fifteen minutes after sunset.');
    }
  }

  function cheer() {
    audio.sfx('cheer');
    stage.shake(0.25, 400);
    // The crowd is only there for the game itself (fall Saturdays, about 11:00–20:00), same as the arrival line.
    // Place lines stay within 3 lines on a 375px phone (see the text box's reserved height).
    say(null, gameOn(gameClock.date())
      ? 'You join the Gator Chomp rolling out of the Swamp, eighty-eight thousand people strong. The rail shakes.'
      : 'The Swamp is empty, so you do a small, dignified chomp anyway. It echoes.');
    game.count('cheers');
  }

  function study() {
    audio.sfx('typing');
    game.count('study_sessions');
    if (present.length) {
      for (const p of present) game.addBondCapped(p, 3, 'care');
      say(present[0], idleLine(present[0], 'happy', ctxFor(present[0])).text);
      toast(`You studied together. +3 ♥ with ${present.map((p) => CHARACTERS[p].name).join(' & ')}`, { icon: 'book', kind: 'bond' });
    } else {
      say(null, 'You find a quiet table and get through a whole chapter. Future you says thanks.');
    }
  }

  function knock(p: PigId) {
    audio.sfx('door');
    const t = gameClock.date();
    if (isBedtime(p, t) || game.save.pigs[p].asleep) {
      say(null, `You knock softly. From behind ${CHARACTERS[p].name}’s door: a sleepy “zzz…”. Better let him rest.`);
      return;
    }
    const where = whereIs(p, t);
    if (where !== 'dorm') {
      say(null, `No answer. ${CHARACTERS[p].name} is out at ${LOCATIONS[where].name} right now.`);
      return;
    }
    if (p === companion) { game.go('hub'); return; }
    talk(p);
  }

  const ACTION: Record<LocationAction, { label: string; icon: string; run: () => void } | null> = {
    'shop': { label: 'Shop', icon: 'bag', run: () => { leaveForSub(); game.go('shop', { location: loc, back: 'location', backParams }); } },
    'minigame:volley': { label: MINIGAMES.volley.title, icon: 'play', run: () => playGame('volley') },
    'minigame:perfusion': { label: MINIGAMES.perfusion.title, icon: 'ecg', run: () => playGame('perfusion') },
    'minigame:debug': { label: MINIGAMES.debug.title, icon: 'bug', run: () => playGame('debug') },
    'minigame:petals': { label: MINIGAMES.petals.title, icon: 'petal_gold', run: () => playGame('petals') },
    'minigame:surgery': { label: MINIGAMES.surgery.title, icon: 'suture', run: () => playGame('surgery') },
    'minigame:xfeed': { label: MINIGAMES.xfeed.title, icon: 'phone', run: () => playGame('xfeed') },
    'omikuji': { label: 'Draw an omikuji', icon: 'star', run: omikuji },
    'pharmacy': { label: 'Free check-up', icon: 'care', run: pharmacy },
    'bats': { label: 'Watch the bats', icon: 'moon', run: bats },
    'cheer': { label: 'Cheer in the stands', icon: 'star', run: cheer },
    'study': { label: present.length ? 'Study together' : 'Study a bit', icon: 'book', run: study },
    'rest': null,
  };

  const actions = $derived.by(() => {
    const list: { key: string; label: string; icon?: string; face?: PigId; kind?: ActivityKind; run: () => void }[] = [];
    for (const p of present) list.push({ key: `talk-${p}`, label: `Talk to ${oneLine(p)}`, face: p, run: () => talk(p) });
    if (present.length) list.push({ key: 'gift', label: 'Give a gift', icon: 'gift', run: startGift });
    if (loc === 'dorm') {
      if (companion) list.push({ key: 'home', label: `${oneLine(companion)}’s room (KempaPager)`, icon: 'home', run: () => game.go('hub') });
      for (const p of PIG_IDS) if (p !== companion) list.push({ key: `knock-${p}`, label: `Knock on ${oneLine(p)}’s door`, face: p, run: () => knock(p) });
    }
    for (const a of def.actions) {
      const x = ACTION[a];
      if (!x) continue;
      const drawn = a === 'omikuji' && omikujiToday(game.save, gameClock.minute * 60_000) !== null;
      list.push({ key: a, ...x, kind: actionKind(a), label: drawn ? 'Read today’s omikuji' : x.label });
    }
    if (def.id === 'shands') list.push({ key: 'buy-meds', label: 'Buy medicine', kind: 'shop', icon: 'care', run: () => { leaveForSub(); game.go('shop', { location: 'shands', back: 'location', backParams }); } });
    return list;
  });

  const recipients = $derived<SheetAction[]>(present.map((p) => ({
    id: p, label: `For ${CHARACTERS[p].name}`, icon: 'gift', run: () => { pickRecipient = false; giftFor = p; },
  })));

  const POS: Record<number, PortraitPos[]> = { 1: ['center'], 2: ['left', 'right'], 3: ['left', 'center', 'right'] };

  onMount(() => {
    // A new arrival: remember where we are, report the visit (wants, tasks, Bat Signal…), and let a
    // waiting scene go first. Coming back from a sub-screen skips all of that.
    if (!params.returning) {
      game.setLocation(loc);
      const money = game.save.money;
      try {
        const sig = recordSignal(game.save, { kind: 'visit', location: loc, present }, now());
        game.report({ moneyBefore: money, tasks: sig.tasks, achievements: sig.achievements });
        if (sig.want) toast('That’s just where he wanted to go!', { icon: 'heart', kind: 'bond' });
      } catch (e) { console.error('[visit]', e); }
      game.persist();

      const sc = findTriggeredScene({ location: loc, time: tod, weekday: weekday(arrived), save: game.save, date: arrived });
      if (sc && !game.session.autoScenes.includes(sc.id)) {
        game.session.autoScenes.push(sc.id);
        game.go('scene', { id: sc.id, back: 'location', backParams });
        return;
      }
    }

    stage.reset();
    void stage.setLocation(loc, 'fade');
    present.forEach((p, i) => stage.showPortrait(p, bondLevel(game.save.pigs[p].bond) >= 2 ? 'happy' : 'neutral', POS[present.length][i], game.save.pigs[p].outfit));
    audio.playSong(def.song, { fadeMs: 700 });

    const focus = params.focus && present.includes(params.focus) ? params.focus : present[0];
    if (focus) say(focus, idleLine(focus, 'greet', ctxFor(focus)).text);
    else if (loc === 'dorm' && home.length) say(null, `${def.blurb} ${listNames(home)} ${home.length === 1 ? 'is' : 'are'} home.`);
    else say(null, vibeLine(loc, tod, arrived.getDate() + arrived.getHours(), gameOn(arrived)));

    // Thoughts: the first beat comes 8–14 s after the greet bubble has ended. Nobody is drawn at Sakura House, so
    // nobody thinks there. A hidden tab ends the clouds; coming back starts over as if just arrived.
    let layoutRaf = 0;
    let offLayout = () => {};
    const firstBeat = () => firstBeatMs('place', loc, now(), visit) * speed;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        endClouds(false);
        clearTimeout(beatTimer);
      } else scheduleBeat(firstBeat());
    };
    // ?debug panel "think now": the next ambient beat right away (blocks still apply).
    const onThinkNow = () => {
      clearTimeout(beatTimer); // runBeat() schedules the next one: never leave two chains running
      runBeat();
    };
    if (present.length && loc !== 'dorm') {
      scheduleBeat(Math.max(0, speakingUntil - performance.now()) + firstBeat());
      offLayout = stage.onLayout(() => {
        cancelAnimationFrame(layoutRaf);
        layoutRaf = requestAnimationFrame(replaceClouds); // after the stage view took its new size
      });
      document.addEventListener('visibilitychange', onVisibility);
      addEventListener('kempanion:think-now', onThinkNow);
    }

    return () => {
      alive = false;
      clearTimeout(beatTimer);
      cancelAnimationFrame(layoutRaf);
      offLayout();
      document.removeEventListener('visibilitychange', onVisibility);
      removeEventListener('kempanion:think-now', onThinkNow);
      stage.clearPortraits();
    };
  });
</script>

<GameLayout chrome="vn">
  {#snippet status()}
    <div class="bar">
      <Icon id={loc === 'dorm' ? 'home' : 'pin'} size={20} />
      <span class="nm">{#if shortName}<span class="long">{def.name}</span><span class="short">{shortName}</span>{:else}{def.name}{/if}</span>
      <span class="jp" aria-hidden="true">{def.jp}</span>
      <span class="sp"></span>
      <ClockChip small />
      <AcornChip small />
    </div>
  {/snippet}

  {#snippet dock()}
    <div class="dockbar">
      <button type="button" class="px-btn ghost" onclick={() => game.go('map')}><Icon id="map" size={20} /> Map</button>
      {#if companion}<button type="button" class="px-btn ghost" onclick={() => game.go('hub')}><Icon id="home" size={20} /> Home</button>{/if}
    </div>
  {/snippet}

  {#snippet stage()}
    <StageHost
      label="{def.name}, {tod}. {present.length ? `${listNames(present)} ${present.length === 1 ? 'is' : 'are'} here.` : 'Nobody is around.'}{thinkingAbout}"
    >
      <!-- Thought clouds over the portraits (silent on appear; tap for his line). The layer is the stage view's box. -->
      <div class="thoughts" bind:this={layerEl}>
        {#each clouds as c (`${c.t.pig}:${c.t.key}`)}
          <ThoughtBubble
            placement="above"
            icon={c.t.icon}
            label={c.t.label}
            at={c.at}
            ms={c.t.ms}
            id={c.t.id}
            aria={thoughtName(CHARACTERS[c.t.pig].name, c.t.label)}
            onclick={(focused) => cloudTap(c, focused)}
            onexpire={() => removeCloud(c)}
          />
        {/each}
      </div>
    </StageHost>
  {/snippet}

  {#snippet text()}
    <div class="vn-box box" aria-live="polite">
      {#if line.speaker}<span class="plate" style:background={CHARACTERS[line.speaker].color}>{CHARACTERS[line.speaker].name}</span>{/if}
      <p class:narration={!line.speaker}>{line.text}</p>
    </div>
  {/snippet}

  {#snippet menu()}
    <nav class="cmds px-panel dark" aria-label="What to do here">
      <ul class="px-scroll" bind:this={cmdsEl}>
        {#each actions as a (a.key)}
          <li>
            <button type="button" class="cmd" onclick={a.run} data-cycle data-key={a.key}>
              {#if a.face}<PigFace pig={a.face} size={22} />{:else if a.icon}<Icon id={a.icon} size={22} />{/if}
              <span class="cmd-label">{#if a.kind}<ActivityLabel kind={a.kind} icon={false} />{/if}<span>{a.label}</span></span>
            </button>
          </li>
        {/each}
      </ul>
      {#if more}<span class="more" style:--gutter="{gutter}px" aria-hidden="true">▼ more</span>{/if}
    </nav>
  {/snippet}
</GameLayout>

{#if pickRecipient}
  <ActionSheet title="Who’s it for?" icon="gift" actions={recipients} onclose={() => (pickRecipient = false)} />
{/if}
{#if giftFor}
  <ItemSheet title="Gift for {CHARACTERS[giftFor].name}" icon="gift" items={giftItems()} onpick={give} onclose={() => (giftFor = null)}
    empty="No gifts in your bag yet. The Reitz Union campus store has some!" />
{/if}
{#if slip}
  <Modal title="Omikuji" icon="star" size="sm" paper onclose={() => (slip = null)}>
    <div class="slip">
      <p class="kanji" aria-hidden="true">{slip.jp}</p>
      <p class="sname">{slip.name}</p>
      <p class="stext">“{slip.text}”</p>
      <p class="seffect">{slip.effect}</p>
      {#if !slip.fresh}<p class="again">You already drew today’s slip. Come back tomorrow!</p>{/if}
      {#if slip.fresh && present.includes('piggy-2')}<p class="p2">Piggy 2: “Those were all tied to the tree already. Sanitary. Based.”</p>{/if}
    </div>
    {#snippet footer()}<button type="button" class="px-btn primary" onclick={() => (slip = null)} data-autofocus>Tie it to the branch</button>{/snippet}
  </Modal>
{/if}

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
    padding: 4px 8px;
    background: rgba(26, 16, 48, 0.86);
    border-bottom: var(--px) solid var(--box-edge);
  }
  .nm { font-family: var(--font-display); font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  /* The katakana is decoration: it only gets the room the English name leaves (zero basis, up to its own width),
     and phones drop it like the map does. The spacer takes what's left over with an auto margin, not a flex share. */
  .jp { flex: 1 1 0; max-width: max-content; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--sakura-2); font-size: 12px; white-space: nowrap; }
  .short { display: none; }
  @media (max-width: 480px) {
    .jp, .long { display: none; }
    .short { display: inline; }
  }
  .sp { margin-left: auto; }
  .dockbar { display: flex; flex-direction: var(--dir, row); gap: 6px; width: 100%; }
  .dockbar > .px-btn { flex: 1; }
  .thoughts { position: absolute; inset: 0; pointer-events: none; }

  .box { position: relative; width: 100%; padding: 16px 14px 10px; font-size: var(--fs, 16px); line-height: 1.45; }
  .box p { margin: 0; min-height: 2.9em; }
  .narration { color: #e8deff; font-style: italic; }
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

  /* The list scrolls inside the panel, so the "▼ more" cue can sit still over its bottom edge. */
  .cmds { --pad: 6px; position: relative; display: flex; flex-direction: column; max-height: 100%; padding: var(--pad); }
  .cmds ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; min-height: 0; }
  .cmd {
    width: 100%;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    background: transparent;
    color: inherit;
    border: 2px solid transparent;
    font: inherit;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }
  .cmd-label { display: grid; min-width: 0; }
  .cmd:focus-visible { border-color: var(--sakura-2); background: rgba(255, 183, 197, 0.12); outline: none; }
  .cmd:focus-visible::before { content: '▶'; color: var(--sakura-2); font-size: 12px; margin-left: -4px; }
  /* Mouse only: touch browsers keep :hover on the last tapped command, and its ▶ would rewrap/resize the list. */
  @media (hover: hover) {
    .cmd:hover { border-color: var(--sakura-2); background: rgba(255, 183, 197, 0.12); }
    .cmd:hover::before { content: '▶'; color: var(--sakura-2); font-size: 12px; margin-left: -4px; }
  }
  /* scroll cue: a dithered fade into the panel and "▼ more" while commands are hidden below */
  .more {
    position: absolute;
    left: var(--pad);
    right: calc(var(--pad) + var(--gutter, 0px));
    bottom: var(--pad);
    height: 26px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 0 6px 1px;
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.06em;
    color: var(--sakura-2);
    background:
      linear-gradient(var(--panel-bg), var(--panel-bg)) 0 100% / 100% 55% no-repeat,
      repeating-conic-gradient(var(--panel-bg) 0 25%, transparent 0 50%) 0 0 / calc(var(--px) * 2) calc(var(--px) * 2);
    pointer-events: none;
  }

  .slip { text-align: center; display: grid; gap: 6px; }
  .slip p { margin: 0; }
  .kanji { font-size: 48px; color: #b0242c; line-height: 1.1; }
  .sname { font-family: var(--font-display); font-size: 22px; }
  .stext { font-style: italic; }
  .seffect { font-weight: 700; }
  .again, .p2 { font-size: 13px; opacity: 0.85; }

  :global(.mode-t) .box { margin: 14px 8px 6px; width: auto; }
  /* Lines reserved, so the picture above doesn't resize between short and long lines: 3 at the default text size
     (narrow phones get a bit more line length so the longest place lines, the bats, still fit in 3 at 375px), 4 at
     text size L/XL and below 375px, where those lines take 4. */
  @media (max-width: 600px) {
    :global(.mode-t) .box p { min-height: 4.35em; }
    :global(.mode-t.ts-l) .box p, :global(.mode-t.ts-xl) .box p { min-height: 5.8em; }
  }
  /* Narrow phones: more line length in the text box, and room for "Talk to Piggy 2" on one line in a half-width
     command (so 5 commands fit without scrolling) */
  @media (max-width: 380px) {
    :global(.mode-t) .box { padding-inline: 8px; }
    :global(.mode-t) .cmd { padding-inline: 6px; }
  }
  @media (max-width: 374px) { :global(.mode-t) .box p { min-height: 5.8em; } }
  :global(.mode-t) .cmds { margin: 0 8px 6px; max-height: 32vh; }
  /* auto-fit: a lone command spans the panel instead of a half-width track (where "Read today’s omikuji" wrapped) */
  :global(.mode-t) .cmds ul { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  :global(.mode-t) .dockbar { padding: 4px 8px 6px; }
  :global(.mode-w) .bar, :global(.mode-s) .bar { width: auto; border: var(--px) solid var(--box-edge); }
  :global(.mode-w) .cmds { min-width: calc(var(--u) * 110); font-size: calc(var(--u) * 6); }
  :global(.mode-w) .cmd { font-size: max(14px, calc(var(--u) * 6)); }
  :global(.mode-w) .box { padding: calc(var(--u) * 7) calc(var(--u) * 6) calc(var(--u) * 4); }
  :global(.mode-w) .dockbar { width: auto; }
  /* phone landscape: all the room between the status bar and the text box, with tighter rows */
  :global(.mode-s) .cmds { --pad: 4px; max-width: 46%; }
  :global(.mode-s) .cmds ul { gap: 2px; }
  :global(.mode-s) .cmd { min-height: 40px; }
  :global(.mode-s) .box { padding: 12px 10px 6px; font-size: 14px; }
  :global(.mode-s) .box p { min-height: 1.45em; }
</style>
