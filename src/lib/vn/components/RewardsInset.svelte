<script lang="ts">
  // The hub tutorial's acorn glossary, drawn exactly like PagerInset's care keys (same panel, key, glyph, label and lit
  // ring) so the two read as one set: one row of five keys, acorns lit. Pictures, not buttons.
  //   place="top"    phone portrait: the same 52 px strip as the tutorial's care keys, glyph-only keys (labels read out)
  //   place="stage"  wide layouts: the stage's top-left corner, keys the same size as the care keys' four-up rows
  import { hapticTap } from '../../haptics';
  import Icon from '../../ui/components/Icon.svelte';
  import { dialogue } from '../dialogue.svelte';

  let { place = 'stage' }: { place?: 'top' | 'stage' } = $props();

  // The same glyphs used by the balance, stamp card, completed tasks, PLAY key and golden-petal chip.
  const rewards = [
    { icon: 'acorn', label: 'Acorns' },
    { icon: 'stamp', label: 'Stamp' },
    { icon: 'star', label: 'Tasks' },
    { icon: 'play', label: 'Games' },
    { icon: 'petal_gold', label: 'Petals' },
  ];
</script>

<!-- A visual glossary: individual icons do not claim rewards or launch activities. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<figure class="rewards {place}" aria-label="Acorns and ways to earn them" data-haptic-area data-haptic-advance="Advance story" data-haptics={place === 'top' && dialogue.canAdvance ? undefined : 'off'}
    onclick={(event) => { event.stopPropagation(); if (dialogue.canAdvance) hapticTap(event); dialogue.advance(); }}>
  {#each rewards as reward (reward.icon)}
    <span class="key" class:on={reward.icon === 'acorn'}>
      <span class="glyph"><Icon id={reward.icon} size={32} /></span>
      <span class="lbl" class:visually-hidden={place === 'top'}>{reward.label}</span>
    </span>
  {/each}
</figure>

<style>
  /* panel, keys and lit ring: PagerInset's */
  .rewards {
    position: absolute;
    z-index: 25;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
    padding: 8px;
    pointer-events: none;
    background: linear-gradient(180deg, #ffc9d6, #f4a3ba 60%, #e98aa6);
    border: var(--px) solid var(--ink);
    box-shadow: 0 0 0 calc(var(--px) * 2) #b45a7a, 0 6px 0 rgba(0, 0, 0, 0.35);
    animation: rewards-in 160ms steps(4) both;
  }
  /* phone: the care keys' tutorial strip (compact, 52 px, 28 px glyphs) */
  .top {
    top: calc(var(--safe-top) + 6px);
    left: 50%;
    translate: -50% 0;
    width: min(100% - 24px, 420px);
    height: 52px;
    gap: 4px;
    padding: 4px 6px;
    pointer-events: auto;
  }
  .top .key { min-height: 0; height: 100%; padding: 2px; }
  .top .glyph { --glyph: 28px; }
  /* wide: each key as wide as one of the care keys' (four to a min(40%, 520px) row, 6 px apart) */
  .stage {
    --glyph: clamp(24px, calc(var(--u, 2px) * 13), 44px);
    --lbl: clamp(11px, calc(var(--u, 2px) * 4.6), 15px);
    top: 4%;
    left: 2.5%;
    width: calc((min(40%, 520px) - 18px) * 5 / 4 + 24px);
  }
  .key {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    min-width: 0;
    min-height: 48px;
    padding: 3px 2px;
    color: #ffe3ea;
    background: #2a1f40;
    border: var(--px) solid var(--ink);
    box-shadow:
      inset var(--px) var(--px) 0 rgba(255, 255, 255, 0.12),
      inset calc(var(--px) * -1) calc(var(--px) * -1) 0 rgba(0, 0, 0, 0.45);
  }
  .glyph { display: grid; place-items: center; width: var(--glyph, 28px); height: var(--glyph, 28px); }
  .glyph :global(img) { width: 100%; height: 100%; }
  .lbl {
    font-family: var(--font-display);
    font-size: var(--lbl, 10px);
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .key.on {
    color: var(--ink);
    background: var(--sakura-1);
    outline: calc(var(--px) * 2) solid var(--gold);
    outline-offset: var(--px);
    animation: ring 1.1s steps(4) infinite;
  }
  @keyframes ring { 50% { outline-color: #fff; } }
  @keyframes rewards-in { from { transform: translateY(-10px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .rewards, .key.on { animation: none; } }
  :global(html.reduce-motion) .rewards, :global(html.reduce-motion) .key.on { animation: none; }
</style>
