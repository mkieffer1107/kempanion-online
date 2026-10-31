<script lang="ts">
  // The hub's Big Brain chip, shown over a scene by [brain] (tutorial_big_brain) where the hub keeps it: the real
  // BrainChip, so it reads live (HEUR, the % while Big Brain installs, BIG), ringed like the pager tutorial's lit keys,
  // with an arrow pointing at it from the inner side. A picture, not a button: the chip is inert (no Big Brain panel
  // mid-scene) and a tap on it advances the line like a tap on the picture. Available even before a download, but
  // hidden while HIDE has the interface hidden.
  //   place="top"    phone portrait: the right end of the free band above the stage, where the hub's status row has
  //                  the chip (the arrow sits beside it, so the inset stays in that row on short phones too)
  //   place="stage"  wide layouts: the stage's top-left corner, where the hub's status pill starts (taps fall through
  //                  to the stage)
  import BrainChip from '../../ui/components/BrainChip.svelte';
  import { brainInset } from '../brain.svelte';
  import { dialogue } from '../dialogue.svelte';

  let { place = 'stage' }: { place?: 'top' | 'stage' } = $props();

  const shown = $derived(brainInset.on && !dialogue.uiHidden);
</script>

{#if shown}
  <!-- the band above a T stage isn't the stage, so this tap advances itself (W and S: pointer-events: none) -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <figure class="brain-inset {place}" aria-label="The Big Brain chip" onclick={() => dialogue.advance()}>
    <span class="ring" inert><BrainChip small /></span>
    <span class="arrow" aria-hidden="true"></span>
  </figure>
{/if}

<style>
  .brain-inset {
    position: absolute;
    z-index: 25;
    margin: 0;
    display: flex;
    align-items: center;
    /* clears the ring (3 --px), the arrow's ink edge (1 --px) and its 4 px nudge */
    gap: calc(var(--px) * 4 + 6px);
    pointer-events: none;
    animation: inset-in 160ms steps(4) both;
  }
  /* T: the hub's status row is the frame's first row (max 720 px wide, centered): the chip ends 8 px from its right
     edge. 8 px down instead of 4 keeps the ring on screen. */
  .brain-inset.top {
    /* room for the pulse ring at any pixel size (8 px at --px 2, 11 px at --px 3) */
    top: calc(var(--safe-top) + var(--px) * 3 + 2px);
    right: calc(max(0px, (100% - 720px) / 2) + var(--safe-right) + 8px);
    flex-direction: row-reverse;
    pointer-events: auto;
  }
  /* W and S: the picture is at most 480 stage px wide (S pads it with bars); the hub's status pill starts 6 stage px
     in from its left edge. */
  .brain-inset.stage {
    top: max(8px, calc(var(--u, 2px) * 5.5));
    left: calc(max(0px, (100% - var(--u, 2px) * 480) / 2) + var(--u, 2px) * 6);
  }
  .ring {
    display: flex;
    pointer-events: none;
    outline: calc(var(--px) * 2) solid var(--gold);
    outline-offset: var(--px);
    animation: ring 1.1s steps(4) infinite;
  }
  /* A chunky pixel arrow in the coach marks' colors (CoachMark.svelte): a four-step head over a stem, drawn pointing
     up and turned to point at the chip. */
  .arrow {
    flex: none;
    width: 24px;
    height: 24px;
    background:
      linear-gradient(var(--sakura-1), var(--sakura-1)) 9px 0 / 6px 3px no-repeat,
      linear-gradient(var(--sakura-1), var(--sakura-1)) 6px 3px / 12px 3px no-repeat,
      linear-gradient(var(--sakura-1), var(--sakura-1)) 3px 6px / 18px 3px no-repeat,
      linear-gradient(var(--sakura-1), var(--sakura-1)) 0 9px / 24px 3px no-repeat,
      linear-gradient(var(--sakura-1), var(--sakura-1)) 9px 12px / 6px 12px no-repeat;
    filter: drop-shadow(var(--px) 0 0 var(--ink)) drop-shadow(calc(var(--px) * -1) 0 0 var(--ink))
      drop-shadow(0 var(--px) 0 var(--ink)) drop-shadow(0 calc(var(--px) * -1) 0 var(--ink));
    rotate: -90deg;
    animation: nudge-left 0.9s steps(3) infinite;
  }
  .top .arrow { rotate: 90deg; animation-name: nudge-right; }
  @keyframes ring { 50% { outline-color: #fff; } }
  @keyframes nudge-left { 50% { translate: -4px 0; } }
  @keyframes nudge-right { 50% { translate: 4px 0; } }
  @keyframes inset-in { from { transform: translateY(-10px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .brain-inset, .ring, .arrow { animation: none; } }
  :global(html.reduce-motion) .brain-inset, :global(html.reduce-motion) .ring, :global(html.reduce-motion) .arrow { animation: none; }
</style>
