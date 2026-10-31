<script lang="ts">
  // The KempaPager's eight care keys, shown over a scene by [pager …] (the hub tutorial), drawn like the hub's
  // LcdIcon keys. The keys the line talks about are lit, with a pulsing ring. Pictures, not buttons.
  //   place="top"    phone portrait: in the free band above the stage (GameLayout's overlay region). Where that band
  //                  is shorter than the two-row panel (short phones such as 375x553), the panel turns compact: one
  //                  row of glyph-only keys, so it doesn't cover the picture (`picture`: the stage element, measured).
  //                  The compact keys shrink with the band (40 px down to 26) before they would reach the picture.
  //   place="stage"  wide layouts: the stage's top-left corner (the speaker stands in the middle)
  import { untrack } from 'svelte';
  import Icon from '../../ui/components/Icon.svelte';
  import { PAGER_KEYS, type PagerKey } from '../kscript';
  import { pagerInset } from '../pager.svelte';
  import { PAGER_KEY, pagerCompact, pagerKey } from './pager-fit';

  let { place = 'stage', picture, strip = false }: { place?: 'top' | 'stage'; picture?: HTMLElement; strip?: boolean } = $props();

  const LABEL: Record<PagerKey, string> = {
    feed: 'Feed', drink: 'Drink', play: 'Play', wash: 'Wash', light: 'Light', care: 'Care', talk: 'Talk', stats: 'Stats',
  };
  const ROWS = [PAGER_KEYS.slice(0, 4), PAGER_KEYS.slice(4)];
  const lit = $derived(new Set(pagerInset.keys ?? []));

  let panel = $state<HTMLElement>();
  let compact = $state(false);
  /** The compact form's key height (px): what the band above the picture leaves (pagerKey). */
  let keyH = $state(PAGER_KEY);

  /**
   * The panel's layout box in its containing block, as the two-row panel or as the compact one: top edge, bottom edge
   * and its padding + border (its height minus the key row). offsetTop/offsetHeight, not the slide-in transform. The
   * class is flipped on the live element and put back before the next paint, so both forms are measured without a
   * flash and the numbers don't depend on which form (or key height) is showing.
   */
  function measure(el: HTMLElement, asCompact: boolean) {
    const was = el.classList.contains('compact');
    el.classList.toggle('compact', asCompact);
    const m = {
      top: el.offsetTop,
      bottom: el.offsetTop + el.offsetHeight,
      chrome: el.offsetHeight - ((el.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0),
    };
    el.classList.toggle('compact', was);
    return m;
  }

  $effect(() => {
    // Tutorial care keys and rewards share one fixed phone strip, even on tall phones.
    if (strip && place === 'top') { compact = true; keyH = PAGER_KEY; return; }
    const el = panel;
    const pic = picture;
    if (place !== 'top' || !el || !pic) return;
    const fit = () => {
      const box = el.offsetParent;
      if (!box) return;
      const pictureTop = pic.getBoundingClientRect().top - box.getBoundingClientRect().top;
      compact = pagerCompact(measure(el, false).bottom, pictureTop);
      if (compact) {
        const c = measure(el, true);
        keyH = pagerKey(pictureTop, c.top, c.chrome);
      }
    };
    untrack(fit);
    // the picture, not the panel: fit() resizes the panel, and observing what the callback changes ends in a
    // "ResizeObserver loop completed with undelivered notifications" page error
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(pic);
    addEventListener('resize', fit);
    return () => {
      ro?.disconnect();
      removeEventListener('resize', fit);
    };
  });
</script>

{#if pagerInset.keys}
  <figure class="pager {place}" class:compact class:strip style:--key-h="{keyH}px" bind:this={panel} aria-label="The KempaPager's care keys">
    {#each ROWS as row, i (i)}
      <div class="row">
        {#each row as k (k)}
          <span class="key" class:on={lit.has(k)}>
            <span class="glyph"><Icon id={k} size={32} /></span>
            <span class="lbl" class:visually-hidden={compact}>{LABEL[k]}</span>
          </span>
        {/each}
      </div>
    {/each}
  </figure>
{/if}

<style>
  .pager {
    position: absolute;
    z-index: 25;
    margin: 0;
    display: grid;
    gap: 6px;
    padding: 8px;
    pointer-events: none;
    background: linear-gradient(180deg, #ffc9d6, #f4a3ba 60%, #e98aa6);
    border: var(--px) solid var(--ink);
    box-shadow: 0 0 0 calc(var(--px) * 2) #b45a7a, 0 6px 0 rgba(0, 0, 0, 0.35);
    animation: pager-in 160ms steps(4) both;
  }
  .pager.top {
    --lbl: 12px;
    top: calc(var(--safe-top) + 10px);
    left: 50%;
    translate: -50% 0;
    width: min(100% - 24px, 420px);
  }
  /* compact: one row of glyph-only keys (labels still read out). The wider gap between the halves keeps the hub's
     top and bottom rows apart ("Top row is FEED, DRINK, PLAY, WASH."). --key-h (40 px, less where the band above the
     picture is shorter: pager-fit.ts) sets the key height, and the glyph follows it (16 px = the icon at 1:1). */
  .pager.top.compact {
    top: calc(var(--safe-top) + 6px);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 10px;
    padding: 4px 6px;
  }
  .pager.top.strip { height: 52px; }
  .pager.top.strip .key { min-height: 0; height: 100%; }
  .compact .row { gap: 4px; }
  .compact .key { min-height: var(--key-h, 40px); padding: 2px; }
  .compact .glyph { --glyph: clamp(16px, calc(var(--key-h, 40px) - 12px), 28px); }
  .pager.stage {
    --glyph: clamp(24px, calc(var(--u, 2px) * 13), 44px);
    --lbl: clamp(11px, calc(var(--u, 2px) * 4.6), 15px);
    top: 4%;
    left: 2.5%;
    width: min(40%, 520px);
  }
  .row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .key {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
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
  }
  /* lit: inverted like a pressed key, ringed like the coach marks */
  .key.on {
    color: var(--ink);
    background: var(--sakura-1);
    outline: calc(var(--px) * 2) solid var(--gold);
    outline-offset: var(--px);
    animation: ring 1.1s steps(4) infinite;
  }
  @keyframes ring { 50% { outline-color: #fff; } }
  @keyframes pager-in { from { transform: translateY(-10px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .pager, .key.on { animation: none; } }
  :global(html.reduce-motion) .pager, :global(html.reduce-motion) .key.on { animation: none; }
</style>
