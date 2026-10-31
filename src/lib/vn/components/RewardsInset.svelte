<script lang="ts">
  import Icon from '../../ui/components/Icon.svelte';
  import { dialogue } from '../dialogue.svelte';

  let { place = 'stage' }: { place?: 'top' | 'stage' } = $props();

  // The same glyphs used by the balance, stamp card, completed tasks, PLAY key and golden-petal chip.
  const rewards = [
    { icon: 'acorn', label: 'Acorns' },
    { icon: 'stamp', label: 'Daily stamp' },
    { icon: 'star', label: 'Tasks' },
    { icon: 'play', label: 'Mini-games' },
    { icon: 'petal_gold', label: 'Golden petals' },
  ];
</script>

<!-- A visual glossary: individual icons do not claim rewards or launch activities. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<figure class="rewards {place}" aria-label="Acorns and ways to earn them" onclick={() => dialogue.advance()}>
  {#each rewards as reward (reward.icon)}
    <div class={['reward', { currency: reward.icon === 'acorn' }]}>
      <Icon id={reward.icon} size={24} />
      <span>{reward.label}</span>
    </div>
  {/each}
</figure>

<style>
  .rewards {
    position: absolute;
    z-index: 25;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    margin: 0;
    padding: 5px;
    width: min(100% - 24px, 440px);
    color: var(--ink);
    background: linear-gradient(180deg, #ffc9d6, #f4a3ba 60%, #e98aa6);
    border: var(--px) solid var(--ink);
    box-shadow: 0 0 0 var(--px) #b45a7a, 0 4px 0 rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }
  .top {
    top: calc(var(--safe-top) + 8px);
    left: 50%;
    translate: -50% 0;
    pointer-events: auto;
  }
  .stage { top: 4%; left: 2.5%; }
  .reward {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    padding: 2px;
    color: #ffe3ea;
    background: #2a1f40;
  }
  .currency { color: var(--ink); background: var(--gold); }
  .reward span {
    max-width: 100%;
    min-height: 22px;
    display: grid;
    place-items: center;
    font-family: var(--font-display);
    font-size: 11px;
    line-height: 1;
    text-align: center;
  }
</style>
