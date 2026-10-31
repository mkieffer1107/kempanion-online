<script lang="ts">
  // Shared by the story's inline question and the fallback intake form.
  let { kind, value, onConfirm, onEdit }: {
    kind: 'name' | 'food';
    value: string;
    onConfirm: () => void;
    onEdit: () => void;
  } = $props();

  let editButton = $state<HTMLButtonElement>();
  const uid = Math.random().toString(36).slice(2, 8);

  $effect(() => {
    editButton?.focus({ preventScroll: true });
  });
</script>

<div class="confirmation" role="group" aria-labelledby="confirm-answer-{uid}">
  <p id="confirm-answer-{uid}" aria-live="polite">
    {#if kind === 'name'}Are you sure you want to be called “<strong>{value}</strong>”?
    {:else}Are you sure “<strong>{value}</strong>” is your comfort food?{/if}
  </p>
  <div class="buttons">
    <button bind:this={editButton} type="button" class="px-btn ghost" onclick={onEdit}>EDIT {kind === 'name' ? 'NAME' : 'FOOD'}</button>
    <button type="button" class="px-btn primary" onclick={onConfirm}>YES</button>
  </div>
</div>

<style>
  .confirmation { display: grid; gap: 10px; }
  p { margin: 0; font-size: max(16px, 0.85em); line-height: 1.4; overflow-wrap: anywhere; }
  .buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .px-btn { min-width: 0; min-height: 44px; font-size: max(14px, 0.72em); }
</style>
