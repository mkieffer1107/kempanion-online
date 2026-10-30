<script lang="ts" module>
  import type { NeedId } from '../../types';

  export const NEED_LABEL: Record<NeedId, string> = { hunger: 'Tummy', energy: 'Energy', hygiene: 'Clean', fun: 'Fun' };
  export const NEED_ICON: Record<NeedId, string> = { hunger: 'hunger', energy: 'energy', hygiene: 'hygiene', fun: 'fun' };

  /** GAME_DESIGN §6 thresholds: ≥60 fine · 30–59 mild · 15–29 needs you · <15 urgent. */
  export function needTone(v: number): 'fine' | 'mild' | 'low' | 'urgent' {
    if (v >= 60) return 'fine';
    if (v >= 30) return 'mild';
    if (v >= 15) return 'low';
    return 'urgent';
  }
</script>

<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    need: NeedId;
    value: number;
    /** Hide the text label (icon + pips + number only). */
    compact?: boolean;
    /** Hide the number (pips only). */
    pipsOnly?: boolean;
  }

  let { need, value, compact = false, pipsOnly = false }: Props = $props();

  const v = $derived(Math.max(0, Math.min(100, Math.round(value))));
  const pips = $derived(v <= 0 ? 0 : Math.ceil(v / 25));
  const tone = $derived(needTone(v));
</script>

<div
  class="meter tone-{tone}"
  class:compact
  role="meter"
  aria-label={NEED_LABEL[need]}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={v}
  aria-valuetext="{NEED_LABEL[need]} {v} of 100"
  title="{NEED_LABEL[need]} {v}"
>
  <Icon id={NEED_ICON[need]} size={compact ? 18 : 20} />
  {#if !compact}<span class="label">{NEED_LABEL[need]}</span>{/if}
  <span class="pips" aria-hidden="true">
    {#each [0, 1, 2, 3] as i (i)}<i class:on={i < pips}></i>{/each}
  </span>
  {#if !pipsOnly}<span class="num" aria-hidden="true">{v}</span>{/if}
</div>

<style>
  .meter {
    --c: var(--ok);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    font-size: 13px;
    line-height: 1;
    white-space: nowrap;
  }
  .tone-mild { --c: #c8e05a; }
  .tone-low { --c: var(--warn); }
  .tone-urgent { --c: var(--bad); }
  .label { text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; opacity: 0.85; }
  .pips { display: inline-flex; gap: 2px; }
  .pips i {
    width: 7px;
    height: 10px;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
  }
  .pips i.on { background: var(--c); box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.35); }
  .tone-urgent .pips i.on { animation: pip-blink 1s steps(1) infinite; }
  .num { min-width: 2ch; text-align: right; font-variant-numeric: tabular-nums; }
  .compact { gap: 3px; }
  .compact .pips i { width: 6px; }
  @keyframes pip-blink { 50% { opacity: 0.35; } }
  :global(html.reduce-motion) .pips i.on { animation: none; }
</style>
