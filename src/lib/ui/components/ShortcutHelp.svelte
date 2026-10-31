<script lang="ts">
  // ? / F1: keyboard shortcut overlay (GAME_DESIGN §14, design-ux §5).
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const KEYS: [string, string][] = [
    ['Enter · Space · X', 'OK / advance / finish the line'],
    ['Esc · C', 'Back · close · pager menu'],
    ['Z', 'Next care key / button (device A)'],
    ['1–4 · ↑ ↓', 'Pick a choice'],
    ['L · PageUp', 'Backlog'],
    ['A · S · hold Ctrl', 'Auto · skip ahead'],
    ['H · Delete', 'Hide the text box'],
    ['T · /', 'Type to your piggy (in Talk)'],
    ['[ · ]', 'Visit the previous / next piggy'],
    ['M · B', 'Campus map · bag'],
    ['Tab', 'Move focus (always works)'],
    ['? · F1', 'This list'],
  ];
</script>

<Modal title="Keyboard" icon="settings" size="md" {onclose}>
  <dl class="keys">
    {#each KEYS as [k, what] (k)}
      <dt><kbd>{k}</kbd></dt>
      <dd>{what}</dd>
    {/each}
  </dl>
</Modal>

<style>
  .keys { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; }
  dt { white-space: nowrap; }
  dd { margin: 0; }
  kbd { font-family: var(--font-display); color: var(--gold); }
</style>
