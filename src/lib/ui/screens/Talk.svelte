<script lang="ts">
  // Free chat with a pig (any of the three): his current spot as the stage, his portrait, the VN dialogue box, the
  // reply options (ChatChoices: quick replies as VN choice rows + "Say something else…") and a top bar with Back,
  // face/name/hearts, the brain chip (only after a yes to Big Brain on this device) and his memories of you.
  //   W / S  he stands on the LEFT, the box sits at the bottom in its normal size, and the options float on the
  //          right half between the top bar and the box, clear of his face. S has no height to spare under the
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
  /** Rendered heights (W/S): the options live between the top bar and the dialogue window. */
  let boxH = $state(0);
  let barH = $state(0);
  let choices = $state<ReturnType<typeof ChatChoices>>();

  // Rotating a phone (or resizing a window across the W/T line) moves him to the matching slot mid-chat.
  $effect(() => setFreeChatPosition(slot));

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
  function keepOptionsHeight(node: HTMLElement) {
    const ro = new ResizeObserver(() => {
      const cc = node.querySelector<HTMLElement>(':scope > .cc');
      if (cc && !cc.querySelector('form')) optsH = Math.max(optsH, Math.ceil(cc.getBoundingClientRect().height));
    });
    const watch = () => {
      const cc = node.querySelector<HTMLElement>(':scope > .cc');
      if (cc) ro.observe(cc);
    };
    const mo = new MutationObserver(watch);
    mo.observe(node, { childList: true });
    watch();
    return () => { ro.disconnect(); mo.disconnect(); };
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

<GameLayout chrome="vn">
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
      {#if viewport.mode !== 's'}<BrainChip small />{/if}
    </div>
  {/snippet}

  {#snippet stage()}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage-wrap" onclick={stageTap}>
      <StageHost label="{ch.name} at {placeName}." />
      {#if wide}
        <div
          class="side"
          class:short={viewport.mode === 's'}
          style:--box-h="{boxH}px"
          style:--bar-h="{barH}px"
          use:liftAboveKeyboard
        >
          <ChatChoices bind:this={choices} lift={false} goodbye={viewport.mode === 'w'} />
        </div>
        <DialogueBox layout="overlay" controls={viewport.mode === 'w'} menu={menuBtn} input={false} bind:height={boxH} />
      {/if}
    </div>
  {/snippet}

  {#snippet bottom()}
    {#if viewport.mode === 's'}<DialogueControls vertical menu={railBtns} />{/if}
  {/snippet}

  {#snippet text()}
    {#if viewport.mode === 't'}
      <div class="t-chat" use:liftAboveKeyboard>
        <DialogueBox layout="docked" menu={menuBtn} input={false} />
        <div class="t-opts" style:--opts-h={optsH ? `${optsH}px` : null} {@attach keepOptionsHeight}>
          <ChatChoices bind:this={choices} lift={false} fill />
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
      <p class="note">Forgetting is instant and only affects this save.</p>
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
  .who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .nm { font-family: var(--font-display); font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp { flex: 1; }
  .back, .mem { min-height: 44px; }
  .stage-wrap { position: absolute; inset: 0; }

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
  /* S: the top bar keeps to the left 40% (below), so the options can use the full height beside it. */
  .side.short { top: calc(var(--u) * 2); }

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

  .empty { margin: 0; }
  .mem-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .mem-list .px-btn { min-height: 44px; }
  .mem-list li { display: flex; align-items: center; gap: 8px; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255, 214, 224, 0.25); }
  .note { font-size: 12px; opacity: 0.75; margin: 10px 0 0; }

  :global(.mode-w) .topbar { width: auto; border: var(--px) solid var(--box-edge); }
  :global(.mode-s) .topbar { width: auto; max-width: 40%; border: var(--px) solid var(--box-edge); }
  :global(.mode-s) .bl { display: none; }
  @media (max-width: 400px) { .bl { display: none; } }
</style>
