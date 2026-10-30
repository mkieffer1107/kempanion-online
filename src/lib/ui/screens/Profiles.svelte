<script lang="ts">
  // Profiles: all three cards with hearts + bond title, info unlocked by hearts, "What he knows about you"
  // (tap to forget) and switching your Kempanion (once a day, with the 3-line moving gag).
  // params: { back?: ScreenId, pig?: PigId }
  import '../meta/meta.css';
  import { PIG_IDS, type Expression, type PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { localDate } from '../../time';
  import { bondLevel } from '../../pet';
  import { bgUrl, firstBackground } from '../meta/assets';
  import { MOVING_GAG, type MetaLine } from '../meta/content';
  import ConfirmDialog from '../meta/ConfirmDialog.svelte';
  import Hearts from '../meta/Hearts.svelte';
  import MetaFrame from '../meta/MetaFrame.svelte';
  import PixelGlyph from '../meta/PixelGlyph.svelte';
  import PortraitImg from '../meta/PortraitImg.svelte';
  import ProfileCard from '../meta/ProfileCard.svelte';
  import Tabs from '../meta/Tabs.svelte';
  import VnLine from '../meta/VnLine.svelte';
  import { SWITCH_FLAG, humanizeFact, switchedToday } from '../meta/save-utils';
  import { goBack } from '../meta/nav';
  import { jingle, ui } from '../meta/sfx';

  const params = game.params;
  const startPig = () => (PIG_IDS.includes(params.pig as PigId) ? (params.pig as PigId) : (game.save.companion ?? 'piggy-1'));

  let pig = $state<PigId>(startPig());
  let confirmSwitch = $state(false);
  let gag = $state<MetaLine[] | null>(null);
  let gagPig = $state<PigId | null>(null);
  let gagExpr = $state<Expression>('neutral');
  let toast = $state('');
  let armed = $state(-1); // index of a memory waiting for a second tap to forget

  const HOME_BG: Record<PigId, string[]> = {
    'piggy-1': ['malachowsky', 'volleyball_courts', 'century_tower'],
    'piggy-2': ['communicore', 'or_suite', 'century_tower'],
    'piggy-3': ['physics', 'physics_lab', 'century_tower'],
  };

  const pst = $derived(game.save.pigs[pig]);
  const hearts = $derived(bondLevel(pst.bond));
  const isCompanion = $derived(game.save.companion === pig);
  const today = $derived(localDate(now()));
  const switched = $derived(switchedToday(game.save, today));
  const memories = $derived(game.save.memories[pig] ?? []);
  const bg = $derived(firstBackground(HOME_BG[pig]));
  const expression = $derived.by<Expression>(() => {
    if (gag) return gagExpr;
    if (pst.sick) return 'sick';
    if (pst.asleep) return 'sleepy';
    if (hearts >= 7) return 'affectionate_blush';
    if (hearts >= 4) return 'bashful_smile';
    if (hearts >= 1) return 'happy';
    return 'neutral';
  });

  const tabs = $derived(
    PIG_IDS.map((p) => ({
      id: p,
      label: CHARACTERS[p].name,
      count: `♥${bondLevel(game.save.pigs[p].bond)}${game.save.companion === p ? ' ★' : ''}`,
      color: CHARACTERS[p].color,
      disabled: !!gag && p !== pig,
    })),
  );

  function showToast(text: string) {
    toast = text;
    setTimeout(() => {
      if (toast === text) toast = '';
    }, 2600);
  }

  function forget(i: number, fact: string) {
    if (armed !== i) {
      armed = i;
      ui.move();
      setTimeout(() => {
        if (armed === i) armed = -1;
      }, 3000);
      return;
    }
    game.forget(pig, fact);
    armed = -1;
    ui.back();
    showToast(`${CHARACTERS[pig].name} forgot that. No hard feelings.`);
  }

  function startSwitch() {
    if (switched || isCompanion) {
      ui.error();
      return;
    }
    ui.open();
    confirmSwitch = true;
  }

  function doSwitch() {
    confirmSwitch = false;
    gagExpr = 'neutral';
    gagPig = pig;
    gag = MOVING_GAG[pig];
  }

  function gagLine(_i: number, line: MetaLine) {
    if (line.speaker === gagPig) gagExpr = line.expression ?? 'happy';
  }

  function gagDone() {
    const p = gagPig ?? pig;
    gag = null;
    gagPig = null;
    game.save.companion = p;
    game.setFlag(SWITCH_FLAG, today);
    game.flush();
    jingle('bond_up');
    showToast(`${CHARACTERS[p].name} is your Kempanion now!`);
  }

  function onkeydown(e: KeyboardEvent) {
    if (gag || confirmSwitch) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 3) {
      e.preventDefault();
      if (pig !== PIG_IDS[n - 1]) {
        ui.move();
        pig = PIG_IDS[n - 1];
      }
    } else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      const i = PIG_IDS.indexOf(pig) + (e.key === ']' ? 1 : -1);
      pig = PIG_IDS[(i + 3) % 3];
      ui.move();
    }
  }
</script>

<svelte:window {onkeydown} />

<MetaFrame title="PROFILES" jp="プロフィール" onBack={() => goBack(game.save.companion ? 'hub' : 'title')} keys={!gag && !confirmSwitch}>
  <Tabs tabs={tabs} bind:value={pig} label="Pigs" onchange={() => (armed = -1)} />

  <div class="layout">
    <section class="km-window stage" style:--pig={CHARACTERS[pig].color} aria-label="{CHARACTERS[pig].name} bond">
      {#if bg}<div class="km-cover home" style:background-image="url({bgUrl(bg)})" aria-hidden="true"></div>{/if}
      <div class="portrait">
        {#key pig}<PortraitImg {pig} {expression} outfit={pst.outfit} />{/key}
      </div>
      <div class="status">
        {#if isCompanion}
          <span class="badge"><PixelGlyph name="sakura" scale={2} /> YOUR KEMPANION</span>
        {/if}
        <Hearts bond={pst.bond} color={CHARACTERS[pig].color} />
        {#if game.save.companion}
          <!-- Message any pig on the KempaPager: opens free chat wherever he is right now. -->
          <button class="px-btn chat" onclick={() => game.go('talk', { pig, back: 'profiles', backParams: { pig } })}>
            CHAT WITH {CHARACTERS[pig].name.toUpperCase()}
          </button>
        {/if}
        {#if game.save.companion && !isCompanion}
          <button class="px-btn primary switch" onclick={startSwitch} disabled={switched || !!gag}>
            MAKE {CHARACTERS[pig].name.toUpperCase()} MY KEMPANION
          </button>
          {#if switched}<p class="note">You already switched today. Moving day again tomorrow!</p>{/if}
        {/if}
      </div>
    </section>

    <div class="right px-scroll">
      <div class="cardbox">
        {#key pig}<ProfileCard {pig} variant="full" {hearts} />{/key}
      </div>

      <section class="km-window memories" aria-labelledby="mem-title">
        <h2 id="mem-title" class="km-title mtitle">What {CHARACTERS[pig].name} knows about you</h2>
        {#if memories.length === 0}
          <p class="empty">He doesn't know much about you yet. Talk to him!</p>
        {:else}
          <ul class="facts">
            {#each memories as fact, i (fact)}
              <li>
                <span class="fact">{humanizeFact(fact)}</span>
                <button
                  class="px-btn ghost small forget"
                  class:armed={armed === i}
                  onclick={() => forget(i, fact)}
                  aria-label={armed === i ? `Confirm: forget "${humanizeFact(fact)}"` : `Forget "${humanizeFact(fact)}"`}
                >
                  {#if armed === i}SURE?{:else}<PixelGlyph name="close" scale={2} />{/if}
                </button>
              </li>
            {/each}
          </ul>
          <p class="hint">Tap ✕ twice to make him forget something.</p>
        {/if}
      </section>
    </div>
  </div>

  {#if gag}
    <div class="gag">
      {#key gag}
        <VnLine lines={gag} onLine={gagLine} onDone={gagDone} />
      {/key}
    </div>
  {/if}

  {#if toast}
    <p class="toast km-pop-in" role="status">{toast}</p>
  {/if}
</MetaFrame>

{#if confirmSwitch}
  <ConfirmDialog
    title="Switch Kempanions?"
    message="{CHARACTERS[pig].name} moves in across the hall and becomes your Kempanion. You can switch once a day, and nobody loses any hearts."
    confirmLabel="IT'S MOVING DAY"
    cancelLabel="NOT TODAY"
    onConfirm={doSwitch}
    onCancel={() => (confirmSwitch = false)}
  />
{/if}

<style>
  .layout {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.4fr);
    gap: 14px;
  }
  .stage {
    overflow: hidden;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }
  .home { filter: brightness(0.5) saturate(0.85); }
  .portrait {
    position: relative;
    min-height: 0;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    padding-top: 8px;
  }
  .status {
    position: relative;
    display: grid;
    gap: 8px;
    padding: 10px 12px 12px;
    background: rgba(27, 18, 41, 0.86);
    border-top: var(--px) solid var(--pig);
  }
  .badge {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    font-family: var(--font-display);
    font-size: 14px;
    color: var(--ink);
    background: var(--sakura-1);
    border: var(--px) solid var(--ink);
  }
  .switch, .chat { width: 100%; font-size: 15px; font-family: var(--font-display); }
  .note { margin: 0; font-size: 12px; opacity: 0.8; }

  .right {
    min-height: 0;
    display: grid;
    align-content: start;
    gap: 14px;
    padding-right: 4px;
  }
  .cardbox { min-height: 0; }
  .memories { padding: 12px 14px; gap: 8px; }
  .mtitle { margin: 0; font-size: 18px; color: var(--sakura-1); }
  .empty { margin: 0; font-size: 15px; opacity: 0.8; }
  .facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .facts li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 4px 4px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-left: var(--px) solid var(--sakura-3);
  }
  .fact { flex: 1; font-size: 15px; overflow-wrap: anywhere; }
  .forget { min-width: 44px; min-height: 44px; }
  .forget.armed { --btn-bg: var(--bad); --btn-ink: #fff; }
  .hint { margin: 0; font-size: 12px; opacity: 0.6; }

  .gag {
    position: absolute;
    left: 50%;
    bottom: 16px;
    width: min(760px, calc(100% - 32px));
    transform: translateX(-50%);
    z-index: 5;
  }
  .toast {
    position: absolute;
    left: 50%;
    top: 12px;
    transform: translateX(-50%);
    z-index: 6;
    margin: 0;
    padding: 8px 14px;
    font-size: 15px;
    color: var(--ink);
    background: var(--sakura-1);
    border: var(--px) solid var(--ink);
    white-space: nowrap;
  }

  @media (max-aspect-ratio: 5/4) {
    .layout {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 10px;
    }
    .stage { grid-template-rows: auto; grid-template-columns: 112px minmax(0, 1fr); }
    .portrait { height: 150px; padding-top: 4px; }
    .status { border-top: 0; border-left: var(--px) solid var(--pig); }
    .gag { bottom: max(10px, var(--safe-bottom)); width: calc(100% - 20px); }
    .toast { white-space: normal; width: calc(100% - 40px); text-align: center; }
  }
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .layout { grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.4fr); gap: 10px; }
  }
</style>
