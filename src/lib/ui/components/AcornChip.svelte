<script lang="ts">
  // Acorn balance chip; bumps briefly when the amount changes.
  import { game } from '../../state/game.svelte';
  import Icon from './Icon.svelte';

  let { amount, small = false }: { amount?: number; small?: boolean } = $props();
  const value = $derived(amount ?? game.save.money);
  let bump = $state(false);
  let last = -1;

  $effect(() => {
    const v = value;
    if (last >= 0 && v !== last) {
      bump = true;
      const t = setTimeout(() => (bump = false), 300);
      last = v;
      return () => clearTimeout(t);
    }
    last = v;
  });
</script>

<span class="chip" class:small class:bump title="{value} acorns">
  <Icon id="acorn" size={small ? 16 : 20} />
  <span class="n">{value}</span><span class="visually-hidden"> acorns</span>
</span>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 4px;
    background: rgba(26, 16, 48, 0.72);
    color: var(--gold);
    border: var(--px) solid rgba(255, 210, 90, 0.6);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 15px;
    line-height: 1.2;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .small { min-height: 32px; font-size: 13px; padding: 1px 6px 1px 3px; }
  .bump { transform: translateY(-2px); filter: brightness(1.25); }
</style>
