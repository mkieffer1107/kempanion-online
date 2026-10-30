<script lang="ts">
  // A campus spot: background + busts of the pigs here now (or an empty-place vibe line), Talk / Gift,
  // and the place's own actions (mini-game, shop, omikuji, pharmacy, bats, cheer, study, home).
  // Arriving reports a 'visit' signal and auto-plays any eligible scene first.
  import { onMount } from 'svelte';
  import { PIG_IDS, type LocationId, type PigId } from '../../types';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { gameClock } from '../../state/ticker.svelte';
  import { audio } from '../../audio';
  import { stage, type PortraitPos } from '../../engine/stage';
  import { findTriggeredScene } from '../../vn';
  import { idleLine } from '../../ai/heuristic';
  import { CHARACTERS } from '../../content/characters';
  import { LOCATIONS, isBedtime, whereIs, type LocationAction } from '../../content/locations';
  import { timeOfDay, weekday } from '../../time';
  import {
    bondLevel, canPlayMinigame, freeCheckup, getItem, isGameDay, knownTaste, omikujiToday, recordSignal, rollOmikuji,
    type CareResult, type OmikujiSlip,
  } from '../../pet';
  import { MINIGAMES, type MinigameId } from '../../minigames';
  import { toast } from '../toasts.svelte';
  import GameLayout from '../layout/GameLayout.svelte';
  import StageHost from '../components/StageHost.svelte';
  import ClockChip from '../components/ClockChip.svelte';
  import AcornChip from '../components/AcornChip.svelte';
  import Icon from '../components/Icon.svelte';
  import PigFace from '../components/PigFace.svelte';
  import Modal from '../components/Modal.svelte';
  import ItemSheet, { type SheetItem } from '../hub/ItemSheet.svelte';
  import ActionSheet, { type SheetAction } from '../hub/ActionSheet.svelte';
  import { vibeLine } from '../location/vibes';

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

  let line = $state<{ speaker: PigId | null; text: string }>({ speaker: null, text: '' });
  let giftFor = $state<PigId | null>(null);
  let pickRecipient = $state(false);
  let slip = $state<OmikujiSlip | null>(null);

  function say(speaker: PigId | null, text: string) {
    line = { speaker, text };
    if (speaker && present.includes(speaker)) stage.bubble(speaker, text, Math.min(6000, 1800 + text.length * 55));
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
    if (res.expression && present.includes(p)) stage.setExpression(p, res.expression);
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
      say(null, 'The bat houses rustle, then pour: a dark ribbon of bats spirals out over Lake Alice and into the sunset. Everyone goes quiet.');
      game.count('bats_watched');
    } else {
      audio.sfx('question');
      say(null, 'The bat houses are quiet. The bats come out about fifteen minutes after sunset.');
    }
  }

  function cheer() {
    audio.sfx('cheer');
    stage.shake(0.25, 400);
    const gameDay = isGameDay(now());
    say(present[0] ?? null, gameDay
      ? 'You throw your arms into the Gator Chomp with ninety thousand of your closest friends. The stands shake.'
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
    'omikuji': { label: 'Draw an omikuji', icon: 'star', run: omikuji },
    'pharmacy': { label: 'Free check-up', icon: 'care', run: pharmacy },
    'bats': { label: 'Watch the bats', icon: 'moon', run: bats },
    'cheer': { label: 'Cheer in the stands', icon: 'star', run: cheer },
    'study': { label: present.length ? 'Study together' : 'Study a bit', icon: 'book', run: study },
    'rest': null,
  };

  const actions = $derived.by(() => {
    const list: { key: string; label: string; icon?: string; face?: PigId; run: () => void }[] = [];
    for (const p of present) list.push({ key: `talk-${p}`, label: `Talk to ${CHARACTERS[p].name}`, face: p, run: () => talk(p) });
    if (present.length) list.push({ key: 'gift', label: 'Give a gift', icon: 'gift', run: startGift });
    if (loc === 'dorm') {
      if (companion) list.push({ key: 'home', label: `${CHARACTERS[companion].name}’s room (KempaPager)`, icon: 'home', run: () => game.go('hub') });
      for (const p of PIG_IDS) if (p !== companion) list.push({ key: `knock-${p}`, label: `Knock on ${CHARACTERS[p].name}’s door`, face: p, run: () => knock(p) });
    }
    for (const a of def.actions) {
      const x = ACTION[a];
      if (!x) continue;
      const drawn = a === 'omikuji' && omikujiToday(game.save, gameClock.minute * 60_000) !== null;
      list.push({ key: a, ...x, label: drawn ? 'Read today’s omikuji' : x.label });
    }
    if (def.id === 'shands') list.push({ key: 'buy-meds', label: 'Buy medicine', icon: 'care', run: () => { leaveForSub(); game.go('shop', { location: 'shands', back: 'location', backParams }); } });
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
    else if (loc === 'dorm' && home.length) say(null, `${def.blurb} ${home.map((p) => CHARACTERS[p].name).join(' and ')} ${home.length === 1 ? 'is' : 'are'} home.`);
    else say(null, vibeLine(loc, tod, arrived.getDate() + arrived.getHours()));

    return () => stage.clearPortraits();
  });
</script>

<GameLayout chrome="vn">
  {#snippet status()}
    <div class="bar">
      <Icon id={loc === 'dorm' ? 'home' : 'pin'} size={20} />
      <span class="nm">{def.name}</span>
      <span class="jp" aria-hidden="true">{def.jp}</span>
      <span class="sp"></span>
      <ClockChip small />
      <AcornChip small />
    </div>
  {/snippet}

  {#snippet dock()}
    <div class="dockbar">
      <button type="button" class="px-btn ghost" onclick={() => game.go('map')}><Icon id="map" size={20} /> Map</button>
      {#if companion}<button type="button" class="px-btn ghost" onclick={() => game.go('hub')}><Icon id="home" size={20} /> Pager</button>{/if}
    </div>
  {/snippet}

  {#snippet stage()}
    <StageHost
      label="{def.name}, {tod}. {present.length ? `${present.map((p) => CHARACTERS[p].name).join(' and ')} ${present.length === 1 ? 'is' : 'are'} here.` : 'Nobody is around.'}"
    />
  {/snippet}

  {#snippet text()}
    <div class="vn-box box" aria-live="polite">
      {#if line.speaker}<span class="plate" style:background={CHARACTERS[line.speaker].color}>{CHARACTERS[line.speaker].name}</span>{/if}
      <p class:narration={!line.speaker}>{line.text}</p>
    </div>
  {/snippet}

  {#snippet menu()}
    <nav class="cmds px-panel dark" aria-label="What to do here">
      <ul>
        {#each actions as a (a.key)}
          <li>
            <button type="button" class="cmd" onclick={a.run} data-cycle>
              {#if a.face}<PigFace pig={a.face} size={22} />{:else if a.icon}<Icon id={a.icon} size={22} />{/if}
              <span>{a.label}</span>
            </button>
          </li>
        {/each}
      </ul>
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
  .jp { color: var(--sakura-2); font-size: 12px; white-space: nowrap; }
  .sp { flex: 1; }
  .dockbar { display: flex; flex-direction: var(--dir, row); gap: 6px; width: 100%; }
  .dockbar > .px-btn { flex: 1; }

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

  .cmds { padding: 6px; }
  .cmds ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
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
  .cmd:hover, .cmd:focus-visible { border-color: var(--sakura-2); background: rgba(255, 183, 197, 0.12); outline: none; }
  .cmd:hover::before, .cmd:focus-visible::before { content: '▶'; color: var(--sakura-2); font-size: 12px; margin-left: -4px; }

  .slip { text-align: center; display: grid; gap: 6px; }
  .slip p { margin: 0; }
  .kanji { font-size: 48px; color: #b0242c; line-height: 1.1; }
  .sname { font-family: var(--font-display); font-size: 22px; }
  .stext { font-style: italic; }
  .seffect { font-weight: 700; }
  .again, .p2 { font-size: 13px; opacity: 0.85; }

  :global(.mode-t) .box { margin: 14px 8px 6px; width: auto; }
  :global(.mode-t) .cmds { margin: 0 8px 6px; max-height: 32vh; overflow: auto; }
  :global(.mode-t) .cmds ul { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  :global(.mode-t) .dockbar { padding: 4px 8px 6px; }
  :global(.mode-w) .bar, :global(.mode-s) .bar { width: auto; border: var(--px) solid var(--box-edge); }
  :global(.mode-w) .cmds { min-width: calc(var(--u) * 110); font-size: calc(var(--u) * 6); }
  :global(.mode-w) .cmd { font-size: max(14px, calc(var(--u) * 6)); }
  :global(.mode-w) .box { padding: calc(var(--u) * 7) calc(var(--u) * 6) calc(var(--u) * 4); }
  :global(.mode-w) .dockbar { width: auto; }
  :global(.mode-s) .cmds { max-height: 70%; overflow: auto; max-width: 46%; }
  :global(.mode-s) .box { padding: 12px 10px 6px; font-size: 14px; }
  :global(.mode-s) .box p { min-height: 1.45em; }
</style>
