<script lang="ts">
  // PC-98 ADV text window: name plate in the speaker's colour, 3–4 visible lines, typewriter, ▼ / ▶▶ / "…",
  // LOG · AUTO · SKIP · HIDE (+ MENU snippet), choices above the box (scene choices, or free-chat replies as
  // ChatChoices), the [input] row below, backlog overlay.
  //
  //   layout="overlay"  absolutely positioned at the bottom of its (positioned) parent: W and S layouts.
  //                     Text scales with the box width (container query units), never below 16 px.
  //   layout="docked"   a block in the normal flow: T layout (phone portrait).
  //
  // `input={false}` keeps every answer control out of the box (the talk screen places ChatChoices itself);
  // `bind:height` reports the box's rendered height so a parent can place things right above it.
  //
  // Click/tap on the box advances; parents may forward stage taps with dialogue.advance().
  // Keys (when `keyboard`): Enter/Space/Z/X advance · Ctrl hold skip · A auto · S skip · L/PageUp/wheel-up log · H hide.
  import type { Snippet } from 'svelte';
  import { game } from '../../state/game.svelte';
  import { dialogue } from '../dialogue.svelte';
  import Backlog from './Backlog.svelte';
  import ChatChoices from './ChatChoices.svelte';
  import ChatInput from './ChatInput.svelte';
  import ChoiceMenu from './ChoiceMenu.svelte';
  import DialogueControls from './DialogueControls.svelte';
  import { liftAboveKeyboard } from './keyboard';

  let {
    layout = 'overlay',
    lines,
    controls = true,
    menu,
    choices = true,
    input = true,
    backlog = true,
    keyboard = true,
    height = $bindable(0),
    class: klass = '',
  }: {
    layout?: 'overlay' | 'docked';
    /** Visible text lines (default 3 overlay, 4 docked). */
    lines?: 3 | 4;
    /** Show the LOG · AUTO · SKIP · HIDE strip (false when the layout renders DialogueControls itself). */
    controls?: boolean;
    /** Extra control(s) after HIDE, e.g. a MENU button. */
    menu?: Snippet;
    /** Render the choice menu above the box. */
    choices?: boolean;
    /**
     * Render the answer controls: free-chat replies (ChatChoices, above the box) and the [input] row (below it).
     * false = none at all (the parent shows ChatChoices elsewhere).
     */
    input?: boolean;
    /** Render the backlog overlay. */
    backlog?: boolean;
    /** Handle the VN keyboard shortcuts on the window. */
    keyboard?: boolean;
    /** Bindable: rendered height of the window in CSS px (name plate row + box). */
    height?: number;
    class?: string;
  } = $props();

  const rows = $derived(lines ?? (layout === 'docked' ? 4 : 3));
  const reduce = $derived(game.save.settings.reduceMotion);
  // Free chat answers through ChatChoices; the row below the box is only for a scene's [input] question.
  const showInput = $derived(input && !dialogue.chatOpen && dialogue.input !== null);
  const promptInBox = $derived(!dialogue.text && !dialogue.thinking ? (dialogue.input?.prompt ?? '') : '');
  const cursor = $derived(
    dialogue.thinking || dialogue.choices || !dialogue.waiting ? '' : dialogue.auto ? '▶▶' : '▼',
  );

  let textEl: HTMLParagraphElement | undefined = $state();
  let markEl: HTMLSpanElement | undefined = $state();

  // Keep the newest revealed text in view when a long streamed reply overflows the box.
  $effect(() => {
    void dialogue.shown;
    void dialogue.speaker;
    const box = textEl;
    const mark = markEl;
    if (!box || !mark) return;
    if (dialogue.shown === 0) { box.scrollTop = 0; return; }
    // .text is position: relative, so it is the marker's offsetParent.
    const lineH = parseFloat(getComputedStyle(box).lineHeight) || 24;
    const bottom = mark.offsetTop + lineH;
    if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  });

  function onkey(e: KeyboardEvent) {
    if (!keyboard || e.defaultPrevented) return;
    if (dialogue.handleKey(e)) e.preventDefault();
  }

  // Click advances; a swipe up opens the backlog instead.
  let downY: number | null = null;
  let swallowClick = false;
  function onpointerdown(e: PointerEvent) {
    downY = e.clientY;
    swallowClick = false;
  }
  function onpointerup(e: PointerEvent) {
    if (downY !== null && downY - e.clientY > 48) {
      swallowClick = true;
      dialogue.openBacklog();
    }
    downY = null;
  }
  function onclick(e: MouseEvent) {
    e.stopPropagation();
    if (swallowClick) { swallowClick = false; return; }
    dialogue.advance();
  }
  function onwheel(e: WheelEvent) {
    if (e.deltaY < -2) dialogue.openBacklog();
  }
</script>

<svelte:window onkeydown={onkey} onkeyup={onkey} onblur={() => dialogue.setSkipHeld(false)} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="vn {layout} {klass}"
  class:rm={reduce}
  class:gone={dialogue.uiHidden}
  style:--rows={rows}
  onclick={(e) => e.stopPropagation()}
  use:liftAboveKeyboard={showInput}
  bind:offsetHeight={height}
>
  <div class="inner">
    {#if choices && dialogue.choices}
      <div class="choices-slot"><ChoiceMenu /></div>
    {:else if input && dialogue.chatOpen}
      <div class="choices-slot"><ChatChoices /></div>
    {/if}

    {#if dialogue.visible}
      <div class="head">
        {#if dialogue.name}
          {#key dialogue.name}
            <div class="plate" style:--plate={dialogue.color}>{dialogue.name}</div>
          {/key}
        {/if}
        {#if controls}
          <DialogueControls class="strip" {menu} />
        {/if}
      </div>

      <div
        class="box vn-box"
        class:narration={dialogue.speaker === 'narrator'}
        role="button"
        tabindex="-1"
        aria-label="Dialogue. Tap or press Enter to continue."
        {onclick}
        {onpointerdown}
        {onpointerup}
        {onwheel}
      >
        <p class="text" aria-hidden="true" bind:this={textEl}>
          {#if promptInBox}
            <span class="prompt">{promptInBox}</span>
          {:else}
            <span>{dialogue.revealed}</span><span class="mark" bind:this={markEl}></span>{#if dialogue.thinking}<span class="dots"><i>.</i><i>.</i><i>.</i></span>{/if}<span class="rest">{dialogue.text.slice(dialogue.shown)}</span>
          {/if}
        </p>
        {#if cursor}
          <span class="cursor" class:auto={dialogue.auto} style:color={dialogue.color || 'var(--sakura-2)'} aria-hidden="true">{cursor}</span>
        {/if}
      </div>
    {/if}

    {#if showInput}
      <div class="input-slot"><ChatInput lift={false} showPrompt={!promptInBox} /></div>
    {/if}
  </div>

  <div class="visually-hidden" aria-live="polite" aria-atomic="true">{dialogue.announce}</div>
</div>

{#if dialogue.uiHidden}
  <button type="button" class="unhide" aria-label="Show the text box" onclick={(e) => { e.stopPropagation(); dialogue.uiHidden = false; }}></button>
{/if}

{#if backlog && dialogue.backlogOpen}
  <Backlog />
{/if}

<style>
  .vn {
    container-type: inline-size;
    pointer-events: none;
    font-family: var(--font-body);
    color: var(--box-text);
  }
  .vn.overlay {
    position: absolute;
    left: 2.5%;
    right: 2.5%;
    bottom: max(3%, var(--safe-bottom));
    z-index: 30;
  }
  .vn.docked {
    position: relative;
    width: 100%;
    z-index: 30;
  }
  .inner {
    position: relative;
    display: flex;
    flex-direction: column;
    /* scales with the box width, times the player's Text Size setting (--fs-k from GameLayout: S/M/L/XL) */
    font-size: clamp(calc(16px * var(--fs-k, 1)), calc(2.15cqi * var(--fs-k, 1)), calc(40px * var(--fs-k, 1)));
  }
  .vn.gone .inner { visibility: hidden; }

  .choices-slot {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 0.6em);
    display: flex;
    justify-content: center;
    pointer-events: auto;
  }

  .head {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    gap: 0.5em;
    min-height: 1.6em;
    margin-bottom: calc(var(--px) * -1);
  }
  .plate {
    flex: 0 1 auto;
    min-width: 3em;
    max-width: 60%;
    margin-left: 0.6em;
    padding: 0.08em 0.8em 0.12em;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 0.86em;
    letter-spacing: 0.06em;
    color: var(--ink);
    background: var(--plate, var(--sakura-2));
    border: var(--px) solid var(--ink);
    box-shadow: inset 0 var(--px) 0 rgba(255, 255, 255, 0.45);
    clip-path: polygon(
      0 var(--px), var(--px) var(--px), var(--px) 0, calc(100% - var(--px)) 0, calc(100% - var(--px)) var(--px),
      100% var(--px), 100% 100%, 0 100%
    );
    pointer-events: auto;
    animation: plate-in 120ms steps(3) both;
  }
  .head :global(.strip) {
    flex: none;
    margin-left: auto;
    margin-bottom: calc(var(--px) * 3);
  }

  .box {
    position: relative;
    padding: 0.5em 0.9em 0.55em;
    min-height: calc(var(--rows) * 1.45em + 1.05em + var(--px) * 2);
    cursor: pointer;
    pointer-events: auto;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    transform-origin: 50% 100%;
    animation: box-open 120ms steps(4) both;
  }
  .box:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  .box::before {
    /* the PC-98 checkerboard dither band along the top edge */
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: calc(var(--px) * 2);
    background: repeating-conic-gradient(rgba(255, 214, 224, 0.28) 0 25%, transparent 0 50%) 0 0 / calc(var(--px) * 2) calc(var(--px) * 2);
    pointer-events: none;
  }
  .text {
    margin: 0;
    max-height: calc(var(--rows) * 1.45em);
    overflow-y: auto;
    scrollbar-width: none;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    position: relative;
  }
  .text::-webkit-scrollbar { display: none; }
  .narration .text { color: #e9e2ff; }
  .rest { visibility: hidden; }
  .prompt { color: var(--sakura-1); }
  .dots i { font-style: normal; animation: dot 1s steps(1) infinite; }
  .dots i:nth-child(2) { animation-delay: 0.25s; }
  .dots i:nth-child(3) { animation-delay: 0.5s; }

  .cursor {
    position: absolute;
    right: 0.55em;
    bottom: 0.3em;
    font-size: 0.75em;
    line-height: 1;
    text-shadow: 1px 1px 0 #000;
    animation: bob 0.5s steps(2) infinite;
  }
  .cursor.auto { animation-duration: 0.35s; }

  .input-slot {
    margin-top: 0.4em;
    pointer-events: auto;
  }
  .vn.overlay .input-slot { font-size: max(16px, 0.8em); }
  .vn.docked .input-slot { font-size: 16px; }

  .unhide {
    position: fixed;
    inset: 0;
    z-index: 190;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }

  @keyframes box-open { from { transform: scaleY(0.25); opacity: 0.6; } }
  @keyframes plate-in { from { transform: translateX(-0.8em); opacity: 0; } }
  @keyframes bob { 50% { transform: translateY(calc(var(--px) * -1)); } }
  @keyframes dot { 0% { opacity: 0.2; } 50% { opacity: 1; } }

  .rm .box, .rm .plate, .rm .cursor, .rm .dots i { animation: none; }
  @media (prefers-reduced-motion: reduce) {
    .box, .plate, .cursor, .dots i { animation: none; }
  }
</style>
