<script lang="ts" module>
  /**
   * Regions (all optional except `stage`). Placement per layout mode (GAME_DESIGN §14, design-ux §2):
   *
   *   region   W (letterboxed 16:9)          T (phone portrait shell)   S (phone landscape)
   *   status   overlay, top-left             row 1                      overlay, stage top-left
   *   dock     overlay, top-right            last row (thumb bar)       right rail, bottom
   *   top      overlay, under status (left)  row above the stage        left rail
   *   info     overlay, under dock (right)   row under the text box     overlay, under status (right)
   *   menu     overlay, right middle         row under info             overlay, stage right middle
   *   bottom   overlay, above the text box   row below the stage        right rail
   *   text     overlay, stage bottom         row below `bottom`         overlay, stage bottom
   *   overlay  free layer over everything (absolute, full layout)
   *
   * Regions expose `--dir` (row|column) so contents can flow along their region, and the root carries
   * `mode-w|mode-t|mode-s` for finer :global() styling. `--u` = CSS px per stage px (stage height / 270);
   * `--fs` = dialogue font size for the current mode and text-size setting.
   */
  export type Chrome = 'pager' | 'vn';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { viewport } from '../viewport.svelte';
  import { ui } from '../ui.svelte';

  interface Props {
    stage: Snippet;
    status?: Snippet;
    dock?: Snippet;
    top?: Snippet;
    info?: Snippet;
    menu?: Snippet;
    bottom?: Snippet;
    text?: Snippet;
    overlay?: Snippet;
    /** 'pager' = KempaPager device shell (hub); 'vn' = plain night frame (talk, scenes, places). */
    chrome?: Chrome;
    /** Hide text/info/menu/top/bottom (the H key, or while a CG is showing). */
    hideUi?: boolean;
    /** Called with a tap on the hidden UI (to bring it back). */
    onreveal?: () => void;
  }

  let { stage, status, dock, top, info, menu, bottom, text, overlay, chrome = 'vn', hideUi = false, onreveal }: Props = $props();

  let stageH = $state(270);
  const mode = $derived(viewport.mode);
  const u = $derived(Math.max(0.5, stageH / 270));
</script>

<div
  class="gl mode-{mode} chrome-{chrome} ts-{ui.textSize}"
  class:hide-ui={hideUi}
  class:hc={ui.highContrast}
  class:no-left={!top}
  class:no-right={!bottom && !dock}
>
  <div class="frame" style:--u="{u}px">
    {#if status}<div class="r status">{@render status()}</div>{/if}
    {#if dock}<div class="r dock">{@render dock()}</div>{/if}
    {#if top}<div class="r top">{@render top()}</div>{/if}
    {#if info}<div class="r info">{@render info()}</div>{/if}
    <div class="r stage" bind:clientHeight={stageH}>
      <div class="bezel">{@render stage()}</div>
    </div>
    {#if menu}<div class="r menu">{@render menu()}</div>{/if}
    {#if bottom}<div class="r bottom">{@render bottom()}</div>{/if}
    {#if text}<div class="r text">{@render text()}</div>{/if}
    {#if hideUi}
      <button type="button" class="reveal" aria-label="Show the interface" onclick={() => onreveal?.()}></button>
    {/if}
  </div>
  {#if overlay}{@render overlay()}{/if}
</div>

<style>
  .gl {
    --wall: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' shape-rendering='crispEdges'%3E%3Crect width='64' height='64' fill='%23221639'/%3E%3Cg fill='%23ffb7c5'%3E%3Crect x='6' y='7' width='3' height='1'/%3E%3Crect x='5' y='8' width='4' height='1'/%3E%3Crect x='6' y='9' width='2' height='1'/%3E%3Crect x='41' y='29' width='3' height='1'/%3E%3Crect x='40' y='30' width='4' height='1'/%3E%3Crect x='41' y='31' width='2' height='1'/%3E%3C/g%3E%3Cg fill='%23f48fb1'%3E%3Crect x='24' y='48' width='2' height='1'/%3E%3Crect x='23' y='49' width='3' height='1'/%3E%3Crect x='56' y='5' width='2' height='1'/%3E%3Crect x='55' y='6' width='3' height='1'/%3E%3C/g%3E%3Cg fill='%233a2a5e'%3E%3Crect x='16' y='20' width='1' height='1'/%3E%3Crect x='50' y='52' width='1' height='1'/%3E%3Crect x='33' y='12' width='1' height='1'/%3E%3Crect x='10' y='40' width='1' height='1'/%3E%3C/g%3E%3C/svg%3E");
    --fs-k: 1;
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--wall) 0 0 / 128px 128px, var(--night);
    image-rendering: pixelated;
  }
  .ts-s { --fs-k: 0.875; }
  .ts-l { --fs-k: 1.125; }
  .ts-xl { --fs-k: 1.3; }

  .frame { position: relative; display: grid; min-width: 0; min-height: 0; }
  .r { min-width: 0; min-height: 0; }
  .stage { position: relative; }
  .bezel { position: absolute; inset: 0; overflow: hidden; }
  .reveal { position: absolute; inset: 0; z-index: 9; border: 0; padding: 0; background: transparent; cursor: pointer; }

  .hide-ui .text, .hide-ui .info, .hide-ui .menu, .hide-ui .top, .hide-ui .bottom, .hide-ui .dock { visibility: hidden; }
  /* High-contrast text boxes (Settings → Access) */
  .hc :global(.vn-box) { background: #05030c; border-color: #fff; color: #fff; text-shadow: none; }

  /* ───────────── W: letterboxed 16:9 stage, UI overlays inside it ───────────── */
  .mode-w {
    display: grid;
    place-items: center;
    padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
    container-type: size;
  }
  .mode-w .frame {
    --fs: calc(var(--u) * 9 * var(--fs-k));
    width: min(100cqw, 100cqh * 16 / 9);
    height: min(100cqh, 100cqw * 9 / 16);
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto auto;
    grid-template-areas:
      'status dock'
      'top    info'
      '.      menu'
      'bottom bottom'
      'text   text';
    gap: calc(var(--u) * 3);
    padding: calc(var(--u) * 4) calc(var(--u) * 6) calc(var(--u) * 5);
    box-shadow: 0 0 0 3px var(--ink), 0 0 0 6px var(--sakura-3), 0 0 0 9px var(--ink), 0 16px 48px rgba(0, 0, 0, 0.55);
  }
  .mode-w .stage { grid-area: 1 / 1 / -1 / -1; margin: calc(var(--u) * -4) calc(var(--u) * -6) calc(var(--u) * -5); z-index: 0; }
  .mode-w .r:not(.stage), .mode-s .r.status, .mode-s .r.text, .mode-s .r.info, .mode-s .r.menu {
    z-index: 1;
    pointer-events: none;
    display: flex;
  }
  .mode-w .r:not(.stage) > :global(*), .mode-s .r.status > :global(*), .mode-s .r.text > :global(*),
  .mode-s .r.info > :global(*), .mode-s .r.menu > :global(*) { pointer-events: auto; }
  .mode-w .status { grid-area: status; --dir: row; align-items: flex-start; }
  .mode-w .dock { grid-area: dock; --dir: row; justify-content: flex-end; align-items: flex-start; }
  .mode-w .top { grid-area: top; --dir: row; align-items: flex-start; }
  .mode-w .info { grid-area: info; --dir: column; justify-content: flex-end; align-items: flex-start; }
  .mode-w .menu { grid-area: menu; --dir: column; justify-content: flex-end; align-items: center; }
  .mode-w .bottom { grid-area: bottom; --dir: row; align-items: flex-end; }
  .mode-w .text { grid-area: text; --dir: column; flex-direction: column; justify-content: flex-end; }

  /* ───────────── T: phone portrait — KempaPager device shell ───────────── */
  .mode-t { display: grid; justify-items: center; }
  .mode-t .frame {
    --fs: calc(16px * var(--fs-k));
    width: min(100%, 720px);
    height: 100%;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto auto auto auto auto;
    grid-template-areas: 'status' 'top' 'stage' 'bottom' 'text' 'info' 'menu' 'dock';
    padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
    background: var(--night);
    container-type: inline-size;
  }
  .mode-t .r { --dir: row; display: flex; }
  .mode-t .status { grid-area: status; }
  .mode-t .dock { grid-area: dock; }
  .mode-t .top { grid-area: top; }
  .mode-t .info { grid-area: info; }
  .mode-t .menu { grid-area: menu; flex-direction: column; --dir: column; }
  .mode-t .stage { grid-area: stage; display: block; }
  .mode-t .bottom { grid-area: bottom; }
  .mode-t .text { grid-area: text; flex-direction: column; --dir: column; }
  .mode-t .stage > .bezel { inset: 0; }
  /* very tall screens: keep the LCD at most ~square, centered in its bezel */
  .mode-t .stage { max-height: 100cqw; width: 100%; align-self: center; height: 100%; }
  /* Story / talk / place screens: the picture sits right on top of the text box (spare height goes above it), so
     it doesn't drift when the rows below change. The spare band (tall phones) shows the sakura wall, not bare night. */
  .chrome-vn.mode-t .stage { align-self: end; }
  .chrome-vn.mode-t .frame::before { content: ''; grid-area: stage; background: var(--wall) 0 0 / 128px 128px, var(--night); }
  /* keyboard open / tiny heights: the stage collapses to a chat strip */
  @media (max-height: 420px) and (max-aspect-ratio: 5/4) {
    .mode-t .stage { min-height: 0; }
  }

  .chrome-pager.mode-t .frame {
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.18), transparent 8%, transparent 92%, rgba(0, 0, 0, 0.18)),
      linear-gradient(180deg, #ffc9d6, #f4a3ba 60%, #e98aa6);
  }
  .chrome-pager.mode-t .stage {
    margin: 0 8px;
    width: auto;
    box-shadow: 0 0 0 3px var(--ink), 0 0 0 6px #b45a7a, inset 0 0 0 1px rgba(0, 0, 0, 0.4);
  }

  /* ───────────── S: phone landscape — stage + side rails ───────────── */
  .mode-s .frame {
    --fs: calc(15px * var(--fs-k));
    --rail: clamp(64px, 11vw, 104px);
    width: 100%;
    height: 100%;
    grid-template-columns: var(--rail) minmax(0, 1fr) var(--rail);
    grid-template-rows: auto minmax(0, 1fr) auto;
    padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
    background: var(--night);
  }
  .chrome-pager.mode-s .frame { background: linear-gradient(180deg, #ffc9d6, #e98aa6); }
  .mode-s .stage { grid-area: 1 / 2 / 4 / 3; z-index: 0; }
  .mode-s .status { grid-area: 1 / 2 / 2 / 3; padding: 4px 6px; align-items: flex-start; --dir: row; }
  /* The status row is drawn over the stage's top edge (44px with a place's bar): speech bubbles stay below it
     (engine/Stage.svelte). */
  .mode-s .status ~ .stage { --bubble-top: 44px; }
  .mode-s .info { grid-area: 2 / 2 / 3 / 3; justify-content: flex-end; padding: 0 6px; align-items: flex-start; --dir: row; }
  .mode-s .menu { grid-area: 2 / 2 / 3 / 3; justify-content: flex-end; align-items: center; padding: 0 6px; --dir: column; }
  .mode-s .text { grid-area: 3 / 2 / 4 / 3; flex-direction: column; justify-content: flex-end; padding: 0 6px 6px; --dir: column; }
  /* Rails collapse when a screen has nothing to put in them. */
  .mode-s.no-left .frame { grid-template-columns: 0 minmax(0, 1fr) var(--rail); }
  .mode-s.no-right .frame { grid-template-columns: var(--rail) minmax(0, 1fr) 0; }
  .mode-s.no-left.no-right .frame { grid-template-columns: 0 minmax(0, 1fr) 0; }
  .mode-s .top { grid-area: 1 / 1 / 4 / 2; display: flex; flex-direction: column; --dir: column; padding: 4px; }
  .mode-s .bottom { grid-area: 1 / 3 / 3 / 4; display: flex; flex-direction: column; --dir: column; padding: 4px; }
  .mode-s .dock { grid-area: 3 / 3 / 4 / 4; display: flex; flex-direction: column; --dir: column; padding: 4px; }
</style>
