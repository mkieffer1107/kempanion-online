<script lang="ts">
  // KempaPager menu (MENU button / Esc on the hub).
  import { game, type ScreenId } from '../../state/game.svelte';
  import { audio } from '../../audio';
  import { ui } from '../ui.svelte';
  import { viewport } from '../viewport.svelte';
  import { toast } from '../toasts.svelte';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  import ConfirmDialog from '../meta/ConfirmDialog.svelte';
  import { counter } from '../../pet/state';
  import { CHAPTER_DAYS } from '../../pet/balance';

  let { onclose }: { onclose: () => void } = $props();

  // The default ending ("See You Next Semester") is yours to launch: it unlocks after 3 days of chapter 4
  // (design-story §11) and plays once. The pet sim keeps going afterwards (Spring Semester).
  const lastDay = $derived(
    !!game.save.companion && !game.save.flags.ending_friends_done && counter(game.save, 'days_played') >= CHAPTER_DAYS[4] + 3,
  );
  let confirmEnd = $state(false);

  function endSemester() {
    confirmEnd = false;
    onclose();
    game.flush();
    game.go('scene', { id: 'ending_friends', back: 'hub' });
  }

  const ITEMS: { icon: string; label: string; key?: string; go?: ScreenId; params?: Record<string, unknown>; run?: () => void }[] = [
    { icon: 'map', label: 'Campus map', key: 'M', go: 'map' },
    { icon: 'bag', label: 'Bag', key: 'B', go: 'bag' },
    { icon: 'book', label: 'Profiles', go: 'profiles' },
    { icon: 'camera', label: 'Album & extras', go: 'extras' },
    { icon: 'settings', label: 'Settings', go: 'settings' },
    { icon: 'star', label: 'Save now', run: () => { game.flush(); toast('Saved.', { icon: 'star', kind: 'good' }); } },
    { icon: 'help', label: 'Keyboard shortcuts', key: '?', run: () => { ui.help = true; } },
    { icon: 'home', label: 'Title screen', go: 'title' },
  ];

  const items = $derived([
    ...(lastDay ? [{ icon: 'petal_gold', label: 'Last Day of Classes', run: () => { confirmEnd = true; } }] : []),
    ...(viewport.coarse ? ITEMS.filter((i) => i.icon !== 'help') : ITEMS),
  ]);

  function pick(i: (typeof ITEMS)[number]) {
    audio.sfx('ui_select');
    if (i.label === 'Last Day of Classes') return i.run?.();
    onclose();
    if (i.run) i.run();
    if (i.go) {
      if (i.go === 'title') game.flush();
      game.go(i.go, i.params ?? {});
    }
  }
</script>

{#if confirmEnd}
  <ConfirmDialog
    title="Last Day of Classes"
    message="End the semester with all three of them? It's a goodbye-for-now, not a goodbye: the game keeps going afterwards (Spring Semester)."
    confirmLabel="SEE YOU NEXT SEMESTER"
    cancelLabel="NOT YET"
    onConfirm={endSemester}
    onCancel={() => (confirmEnd = false)}
  />
{:else}
<Modal title="Menu" icon="menu" size="sm" {onclose}>
  <ul class="menu">
    {#each items as item (item.label)}
      <li>
        <button type="button" class="px-btn ghost item" onclick={() => pick(item)} data-cycle>
          <Icon id={item.icon === 'help' ? 'talk' : item.icon} size={24} />
          <span class="lbl">{item.label}</span>
          {#if item.key && !viewport.coarse}<kbd>{item.key}</kbd>{/if}
        </button>
      </li>
    {/each}
  </ul>
</Modal>
{/if}

<style>
  .menu { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .item { width: 100%; justify-content: flex-start; min-height: 48px; }
  .lbl { flex: 1; text-align: left; }
  kbd {
    font-family: var(--font-display);
    font-size: 12px;
    padding: 0 6px;
    border: 2px solid currentColor;
    opacity: 0.7;
  }
</style>
