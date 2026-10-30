<script lang="ts" module>
  import { bondProgress } from '../../pet';

  const TITLES = [
    'Stranger', 'Classmate', 'Lab Partner', 'Study Buddy', 'Friend', 'Good Friend',
    'Close Friend', 'Best Friend', 'Partner-in-Crime', 'Kindred Spirit', 'Kempanion',
  ];

  /** Hearts (0–10), the bond title and progress to the next heart. */
  export function bondView(bond: number) {
    const b = bondProgress(bond);
    const level = Math.max(0, Math.min(10, b.level));
    return { level, into: b.into, span: b.span || 100, title: b.title || TITLES[level] };
  }
</script>

<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    bond: number;
    /** 'row' = 10 heart icons; 'chip' = ♥N + title; 'mini' = ♥N only. */
    variant?: 'row' | 'chip' | 'mini';
    showBar?: boolean;
  }

  let { bond, variant = 'chip', showBar = false }: Props = $props();
  const view = $derived(bondView(bond));
  const pct = $derived(view.level >= 10 ? 100 : Math.round((view.into / view.span) * 100));
</script>

<div class="hearts v-{variant}" aria-label="{view.level} hearts, {view.title}" role="img">
  {#if variant === 'row'}
    <span class="row">
      {#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
        <Icon id={i < view.level ? 'heart' : 'heart_empty'} size={16} />
      {/each}
    </span>
  {:else}
    <Icon id="heart" size={variant === 'mini' ? 16 : 20} />
    <span class="n">{view.level}</span>
    {#if variant === 'chip'}<span class="title">{view.title}</span>{/if}
  {/if}
  {#if showBar}
    <span class="bar px-meter" aria-hidden="true"><span class="fill" style:width="{pct}%"></span></span>
  {/if}
</div>

<style>
  .hearts {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
    font-size: 14px;
    line-height: 1;
  }
  .row { display: inline-flex; gap: 1px; flex-wrap: wrap; }
  .n { font-family: var(--font-display); font-weight: 700; }
  .title { opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar { flex: 1 1 100%; min-width: 60px; --meter-color: var(--sakura-3); }
</style>
