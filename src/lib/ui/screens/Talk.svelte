<script lang="ts">
  // Free chat with a pig (any of the three): his current spot as the stage, his portrait, the VN dialogue box, the
  // reply options (ChatChoices: quick replies as VN choice rows + "Say something else…") and a top bar with Back,
  // face/name/hearts, the always-available brain chip and his memories of you.
  // Piggy 3's X mumble (chat.ts playMumble): the stream shows small and dim in the box, and its buzzwords pop around
  // his portrait in lilac clouds (MumbleBubbles, on the stage), clear of his face, the phone, the top bar and the box.
  //   W / S  he stands on the LEFT and the options float on the right half, clear of his face. W docks the box
  //          below the picture; S overlays it at the bottom. S has no height to spare under the
  //          options, so its Goodbye joins LOG · AUTO · SKIP · HIDE · MENU in the right rail.
  //   T      he stands in the middle of the stage, the box is docked under it and the options stack under the box
  //          (thumb zone); box and options rise together above the on-screen keyboard while typing.
  // Keys: 1–4 · ↑↓ · Enter pick · T or / type your own · Esc closes the field, else leaves (App) · L/A/S/H as in scenes.
  import { onMount } from 'svelte';
  import type { LocationId, PigId, SongId } from '../../types';
  import { game, type ScreenId } from '../../state/game.svelte';
  import { gameClock } from '../../state/ticker.svelte';
  import { audio } from '../../audio';
  import { stage, type PortraitPos } from '../../engine/stage';
  import {
    ChatChoices, DialogueBox, DialogueControls, dialogue, liftAboveKeyboard, runFreeChat, setFreeChatPosition,
  } from '../../vn';
  import MumbleBubbles from '../../vn/components/MumbleBubbles.svelte';
  import { mumbleStage } from '../../vn/components/mumble.svelte';
  import { CHARACTERS } from '../../content/characters';
  import { HOME_BG, LOCATIONS, whereIs } from '../../content/locations';
  import { timeOfDay } from '../../time';
  import { viewport } from '../viewport.svelte';
  import { setScreenKeys, ui } from '../ui.svelte';
  import GameLayout from '../layout/GameLayout.svelte';
  import StageHost from '../components/StageHost.svelte';
  import PigFace from '../components/PigFace.svelte';
  import Hearts from '../components/Hearts.svelte';
  import BrainChip from '../components/BrainChip.svelte';
  import Icon from '../components/Icon.svelte';
  import Modal from '../components/Modal.svelte';

  const params = game.params as { pig?: PigId; back?: ScreenId; backParams?: Record<string, unknown> };
  const pig: PigId = params.pig ?? game.save.companion ?? 'piggy-1';
  const back: ScreenId = params.back ?? (game.save.companion ? 'hub' : 'title');
  const ch = CHARACTERS[pig];
  const start = gameClock.date();
  const loc: LocationId = game.save.pigs[pig].asleep ? 'dorm' : whereIs(pig, start);
  const bg = loc === 'dorm' ? HOME_BG[pig] : LOCATIONS[loc].bg;
  const placeName = loc === 'dorm' ? `${ch.name}’s room` : LOCATIONS[loc].name;
  const THEME: Record<PigId, SongId> = { 'piggy-1': 'piggy1_theme', 'piggy-2': 'piggy2_theme', 'piggy-3': 'piggy3_theme' };

  const p = $derived(game.save.pigs[pig]);
  const memories = $derived(game.save.memories[pig]);
  let showMemories = $state(false);
  let leaving = false;

  const wide = $derived(viewport.mode !== 't');
  /** Wide layouts stand him on the left so the options fit on the right; phone portrait keeps him centered. */
  const slot = $derived<PortraitPos>(wide ? 'left' : 'center');
  /** S with the on-screen keyboard up: the dialogue window steps aside so the reply field gets the visible height. */
  const typingS = $derived(viewport.mode === 's' && viewport.keyboard);
  /** Rendered heights: options clear the top bar, and S also clears the overlaid dialogue window. */
  let boxH = $state(0);
  let barH = $state(0);
  let choices = $state<ReturnType<typeof ChatChoices>>();

  // Rotating a phone (or resizing a window across the W/T line) moves him to the matching slot mid-chat.
  $effect(() => setFreeChatPosition(slot));

  // S: App's toasts (top center) would sit on reply option 1 / the reply field; put them on his side, under the bar.
  $effect(() => {
    if (viewport.mode !== 's') return;
    const root = document.documentElement;
    root.classList.add('talk-s');
    root.style.setProperty('--talk-bar', `${barH}px`);
    return () => {
      root.classList.remove('talk-s');
      root.style.removeProperty('--talk-bar');
    };
  });

  function leave() {
    if (leaving) return;
    leaving = true;
    void stage.pushIn(false);
    game.go(back, params.backParams ?? {});
  }

  function backBtn() {
    audio.sfx('ui_back');
    dialogue.cancel();
    setTimeout(leave, 80);
  }

  function bye() {
    audio.sfx('ui_back');
    dialogue.leave();
  }

  // Phone portrait: the options area keeps its height while he talks, so the stage and the box never jump between
  // turns, and a tap that finishes his line can't land on an option that just slid in under the finger.
  let optsH = $state(0);

  // Phone portrait on a short screen with a big Text Size (375×553 at XL left the picture 105 px tall, with the
  // LOG · AUTO · SKIP · HIDE · MENU strip over 40% of it): the picture and the options share what the top bar and the
  // window leave. When the full options area (4 rows + Goodbye) would leave the picture under PICTURE_MIN, Goodbye
  // steps aside (Back, top left, leaves the same way) and the options keep to a cap that leaves the picture
  // PICTURE_SHORT, never under 36% of the screen. The cap still grows to show all four rows, "Say something else…"
  // included, while the picture keeps PICTURE_FLOOR (320×460: 92 px); past that the rows scroll under a ▼.
  const OPTS_FULL = 236;
  const PICTURE_MIN = 130;
  const PICTURE_SHORT = 140;
  const PICTURE_FLOOR = 90;
  let stageH = $state(0);
  let optsAreaH = $state(0);
  let tight = $state(false);
  /** Height of the four rows without Goodbye (measured while tight, the largest seen). */
  let rowsH = $state(0);
  /** Tight options that overflow their cap and aren't scrolled to the end (the ▼ shows). */
  let more = $state(false);
  $effect(() => {
    if (viewport.mode !== 't') {
      tight = false;
      return;
    }
    // held while typing: the keyboard squeezes everything, and the options are a field then
    if (viewport.keyboard || !stageH || !optsAreaH) return;
    tight = stageH + optsAreaH - Math.max(optsH, OPTS_FULL) < PICTURE_MIN;
  });
  const optsCap = $derived(
    Math.max(
      Math.round(viewport.layoutH * 0.36),
      stageH + optsAreaH - PICTURE_SHORT,
      Math.min(rowsH, stageH + optsAreaH - PICTURE_FLOOR),
    ),
  );
  let optsEl: HTMLElement | null = null;
  let frame = 0;
  /**
   * Next frame, after layout and outside ResizeObserver delivery (a height set from inside it resizes the stage while
   * observers are still being told: "ResizeObserver loop" errors): the rows' height, and whether the ▼ shows.
   */
  function queueMeasure() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const el = optsEl;
      const cc = el?.querySelector<HTMLElement>(':scope > .cc');
      const typing = !!el?.querySelector('form');
      if (cc && !typing) {
        const h = Math.ceil(cc.getBoundingClientRect().height);
        if (h > optsH) optsH = h;
        if (tight && h > rowsH) {
          const cap = optsCap;
          rowsH = h;
          // the cap grows to fit them: the effect below measures again once it has
          if (optsCap !== cap) return;
        }
      }
      more = !!el && tight && !!cc && !typing && el.scrollHeight - el.scrollTop - el.clientHeight > 2;
    });
  }
  $effect(() => {
    void [optsCap, tight];
    queueMeasure();
  });
  function keepOptionsHeight(node: HTMLElement) {
    optsEl = node;
    // the rows' own size (the area's height follows the cap: watching it too would loop)
    const ro = new ResizeObserver(queueMeasure);
    const watch = () => {
      const cc = node.querySelector<HTMLElement>(':scope > .cc');
      if (cc) ro.observe(cc);
      queueMeasure();
    };
    const mo = new MutationObserver(watch);
    mo.observe(node, { childList: true });
    node.addEventListener('scroll', queueMeasure, { passive: true });
    watch();
    return () => {
      ro.disconnect();
      mo.disconnect();
      node.removeEventListener('scroll', queueMeasure);
      cancelAnimationFrame(frame);
      if (optsEl === node) optsEl = null;
    };
  }

  function stageTap(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;
    dialogue.advance();
  }

  function forget(fact: string) {
    audio.sfx('ui_close');
    game.forget(pig, fact);
  }

  onMount(() => {
    let alive = true;
    // App offers keys to the screen before its own shortcuts: T or / opens the reply field, Esc closes it.
    const dropKeys = setScreenKeys((e) => choices?.screenKey(e) ?? false);
    (async () => {
      stage.reset();
      if (loc === 'dorm') await stage.setBackground(bg, 'cut');
      else await stage.setLocation(loc, 'cut');
      if (!alive) return;
      audio.playSong(THEME[pig], { fadeMs: 600 });
      void stage.pushIn(true, { dim: 0.3 });
      await runFreeChat(pig, { location: loc, situation: `Chatting at ${placeName}, ${timeOfDay(start)}.`, position: slot });
      if (alive) leave();
    })();
    return () => {
      alive = false;
      dropKeys();
      if (dialogue.mode === 'chat' || dialogue.chatOpen) dialogue.cancel();
      void stage.pushIn(false);
    };
  });
</script>

{#snippet menuBtn()}
  <button type="button" class="px-btn ghost" title="Menu (Esc)" onclick={(e) => { e.stopPropagation(); ui.menu = true; }}>MENU</button>
{/snippet}

{#snippet railBtns()}
  {@render menuBtn()}
  <button type="button" class="px-btn ghost" title="Goodbye (leave the chat)" aria-label="Goodbye" onclick={(e) => { e.stopPropagation(); bye(); }}>BYE</button>
{/snippet}

<GameLayout chrome="vn" dockedDialogue>
  {#snippet status()}
    <div class="topbar" bind:offsetHeight={barH}>
      <button type="button" class="px-btn ghost small back" onclick={backBtn} aria-label="Back">
        <Icon id="back" size={18} /> <span class="bl">Back</span>
      </button>
      <PigFace {pig} size={32} outfit={p.outfit} />
      <span class="who">
        <span class="nm" style:color={ch.color}>{ch.name}</span>
        <Hearts bond={p.bond} variant="mini" />
      </span>
      <span class="sp"></span>
      <button type="button" class="px-btn ghost small mem" onclick={() => (showMemories = true)} aria-label="What {ch.name} knows about you">
        <Icon id="book" size={18} /> <span class="bl">Memories</span>
      </button>
      <BrainChip small />
    </div>
  {/snippet}

  {#snippet stage()}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage-wrap" class:mumbling={mumbleStage.stream} onclick={stageTap} bind:clientHeight={stageH}>
      <StageHost label="{ch.name} at {placeName}.">
        <MumbleBubbles mode={viewport.mode} pos={slot} outfit={p.outfit} avoid=".topbar" />
      </StageHost>
      {#if wide}
        <div
          class="side"
          class:short={viewport.mode === 's'}
          style:--box-h="{viewport.mode === 'w' || typingS ? 0 : boxH}px"
          style:--bar-h="{barH}px"
          use:liftAboveKeyboard
        >
          <ChatChoices bind:this={choices} lift={false} goodbye={viewport.mode === 'w'} />
        </div>
        {#if viewport.mode === 's'}
          <DialogueBox
            layout="overlay"
            class={typingS ? 'stepped-aside' : ''}
            controls={false}
            menu={menuBtn}
            input={false}
            bind:height={boxH}
          />
        {/if}
      {/if}
    </div>
  {/snippet}

  {#snippet bottom()}
    {#if viewport.mode === 's'}<DialogueControls vertical menu={railBtns} />{/if}
  {/snippet}

  {#snippet text()}
    {#if viewport.mode === 'w'}
      <div class="w-chat" class:mumbling={mumbleStage.stream}>
        <DialogueBox layout="docked" lines={3} menu={menuBtn} input={false} />
      </div>
    {:else if viewport.mode === 't'}
      <div class="t-chat" class:mumbling={mumbleStage.stream} use:liftAboveKeyboard>
        <!-- keyboard up: the stage is a sliver, so LOG · AUTO · SKIP · HIDE · MENU would float over the top bar -->
        <DialogueBox layout="docked" controls={!viewport.keyboard} menu={menuBtn} input={false} />
        <div
          class="t-opts"
          class:tight
          class:more
          style:--opts-h={optsH ? `${optsH}px` : null}
          style:--opts-cap="{optsCap}px"
          bind:clientHeight={optsAreaH}
          {@attach keepOptionsHeight}
        >
          <ChatChoices bind:this={choices} lift={false} fill goodbye={!tight} />
        </div>
      </div>
    {/if}
  {/snippet}
</GameLayout>

{#if showMemories}
  <Modal title="What {ch.name} knows about you" icon="book" size="md" onclose={() => (showMemories = false)}>
    {#if memories.length === 0}
      <p class="empty">Nothing yet. Tell {ch.name} about your major, your hometown, or your favorite food!</p>
    {:else}
      <ul class="mem-list">
        {#each memories as fact (fact)}
          <li>
            <span>{fact}</span>
            <button type="button" class="px-btn small ghost" onclick={() => forget(fact)} aria-label="Forget: {fact}">Forget</button>
          </li>
        {/each}
      </ul>
      <p class="note">Forget clears it for every pig who knows it, in this save only.</p>
    {/if}
  </Modal>
{/if}

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
    padding: 4px 6px;
    background: rgba(26, 16, 48, 0.86);
    border-bottom: var(--px) solid var(--box-edge);
  }
  /* The brain panel opens inside the status region; lift it over later dialogue/menu siblings. */
  :global(.gl.chrome-vn > .frame > .r.status:has(.topbar .panel-layer)) { z-index: 60; }
  .who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .nm { font-family: var(--font-display); font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp { flex: 1; }
  .back, .mem { min-height: 44px; }
  .stage-wrap { position: absolute; inset: 0; }
  .w-chat { width: 100%; min-width: 0; }
  /* Piggy 3's mumble stream (chat.ts playMumble): smaller and quieter in the same window, which keeps its height, so
     more fits (5 rows docked instead of 4). 0.8em stays at 11 px or more at Text Size S. */
  .mumbling :global(.vn .box .text) {
    font-size: 0.8em;
    max-height: calc(var(--rows) * 1.45em / 0.8);
    color: #d9c8f8;
  }

  /* W / S: the reply options on the right half, between the top bar and the dialogue window (both measured),
     vertically centered in that space. He stands at the 'left' slot (100/480 of the stage width); his art ends
     88 stage px right of that, +4 for the expression pop: ~39% of a 16:9 stage, more on squarer ones. */
  .side {
    position: absolute;
    z-index: 30;
    left: max(42%, calc(20.84% + var(--u) * 92));
    right: calc(2.5% - var(--px) * 3);
    top: calc(var(--u) * 4 + var(--bar-h, 0px) + 6px);
    bottom: calc(max(3%, var(--safe-bottom)) + var(--box-h, 0px) + var(--px) * 2);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: calc(var(--px) * 3);
    overflow-y: auto;
    scrollbar-width: none;
    pointer-events: none;
    /* ≈ 0.9 × the box text: one field line holds 48 characters at any wide-screen size */
    font-size: clamp(16px, calc(var(--u) * 8.6), 40px);
  }
  .side::-webkit-scrollbar { display: none; }
  .side > :global(.cc) { margin-block: auto; }
  /* W docks the text below the picture, but its controls still float over the bottom edge.
     Keep scrollable replies above that strip, including XL text and coarse-pointer 44px buttons. */
  .side:not(.short) { bottom: max(64px, calc(max(3%, var(--safe-bottom)) + var(--px) * 2)); }
  /* S: the top bar keeps to the left of the options (below), so they can use the full height beside it. */
  .side.short { top: calc(var(--u) * 2); }
  /* S while typing: the window is hidden (its line is back when the keyboard closes) and --box-h is 0 */
  .stage-wrap :global(.vn.stepped-aside) { visibility: hidden; }
  /* S: the toast stack under the top bar on the left (html.talk-s is set while this screen is up) */
  :global(html.talk-s .toasts) {
    top: calc(var(--vvt, 0px) + var(--safe-top) + var(--talk-bar, 56px) + 10px);
    left: calc(var(--safe-left) + 6px);
    transform: none;
    width: min(40%, 320px);
    align-items: flex-start;
  }

  /* T: box and options stacked under the stage, full width, inside the safe area */
  .t-chat {
    display: flex;
    flex-direction: column;
    gap: calc(var(--px) * 3);
    width: 100%;
    min-width: 0;
    padding-bottom: calc(var(--px) * 3);
  }
  .t-opts { min-height: var(--opts-h, 236px); }
  /* typing: the field rides just above the keyboard, with no reserved gap under it */
  .t-opts:has(:global(form)) { min-height: 0; }
  .t-opts > :global(.cc) { padding: 0 calc(var(--px) * 3); }
  /* a short phone at a big Text Size: the options keep to the cap so the picture keeps its height (script) */
  .t-opts.tight:not(:has(:global(form))) {
    min-height: 0;
    height: var(--opts-cap);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .t-opts.tight::-webkit-scrollbar { display: none; }
  /* …and where even that can't show every row (320×460 at XL): ▼ over the bottom edge until they're scrolled to the
     end (the alt text keeps screen readers from reading the arrow) */
  .t-opts.tight.more:not(:has(:global(form)))::after {
    content: '▼';
    content: '▼' / '';
    position: sticky;
    bottom: 0;
    display: block;
    height: 22px;
    margin-top: -22px;
    overflow: hidden;
    text-align: center;
    font-size: 12px;
    line-height: 24px;
    color: var(--sakura-2);
    text-shadow: 1px 1px 0 #000;
    background: linear-gradient(rgba(26, 16, 48, 0), rgba(26, 16, 48, 0.94) 70%);
    pointer-events: none;
  }
  /* The name plate beside LOG · AUTO · SKIP · HIDE · MENU on a phone (≤ 380 px): at most 15 px text and a slimmer
     pad, so "Piggy 1" stays whole next to the strip at Text Size L/XL ("Pigg…" on a 375 px phone before), and a
     compact strip (still 44 px tall). Wider screens give the plate room to grow with Text Size again (an iPad at XL);
     where plate and strip still don't fit one row (a 280–310 px phone), the strip goes up a row rather than off the
     edge (wrap-reverse puts the plate's row at the bottom, on the box, and flips the cross axis, hence flex-start). */
  .t-chat :global(.vn .plate) { font-size: min(0.86em, max(15px, calc(15px + (100vw - 380px) * 0.06))); padding-inline: 0.6em; }
  @media (max-width: 380px) {
    .t-chat :global(.vn .plate) { flex-shrink: 0; max-width: none; margin-left: 0.4em; }
    .t-chat :global(.vn .head) { gap: 0.4em; flex-wrap: wrap-reverse; align-items: flex-start; row-gap: calc(var(--px) * 2); }
    .t-chat :global(.vn .head .ctl) { margin-right: 0.4em; }
    .t-chat :global(.vn .head .ctl .px-btn) { min-width: 42px; padding-inline: 0.3em; font-size: 12px; }
  }
  @media (max-width: 340px) {
    .t-chat :global(.vn .plate) { margin-left: 0.3em; }
    .t-chat :global(.vn .head) { gap: 0.3em; }
    .t-chat :global(.vn .head .ctl) { margin-right: 0.3em; }
    .t-chat :global(.vn .head .ctl .px-btn) { min-width: 40px; }
  }

  .empty { margin: 0; }
  .mem-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .mem-list .px-btn { min-height: 44px; }
  .mem-list li { display: flex; align-items: center; gap: 8px; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255, 214, 224, 0.25); }
  .note { font-size: 12px; opacity: 0.75; margin: 10px 0 0; }

  :global(.mode-w) .topbar { width: auto; border: var(--px) solid var(--box-edge); }
  /* Keep the short header clear of the options on the right. The full portrait already identifies him;
     dropping its tiny duplicate and the brain caption leaves room for his name and 44 px controls. */
  :global(.mode-s) .topbar { --brain-label-display: none; width: auto; max-width: 40%; gap: 4px; border: var(--px) solid var(--box-edge); }
  :global(.mode-s) .topbar > :global(.face), :global(.mode-s) .sp { display: none; }
  :global(.mode-s) .topbar > :global([data-coach='brain']) { flex: none; }
  :global(.mode-s) .back, :global(.mode-s) .mem { flex: none; }
  :global(.mode-s) .bl { display: none; }
  @media (max-width: 600px) {
    /* The smallest landscape phones need a little more of the left side for the full name.
       Options begin at 42% and have their own inset; all three controls stay 44 px wide. */
    :global(.mode-s) .topbar { max-width: 42%; gap: 3px; }
    :global(.mode-s) .nm { font-size: 14px; }
  }
  @media (max-width: 400px) { .bl { display: none; } }
</style>
