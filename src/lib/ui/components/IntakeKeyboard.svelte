<script lang="ts">
  import { flushSync } from 'svelte';
  import { editIntakeText, type KeyboardEdit } from './intakeKeyboard';
  let { value = $bindable(''), field, maxLength, disabled = false, compact = false, onInput, onToggleNative }: {
    value?: string; field?: HTMLInputElement; maxLength: number; disabled?: boolean; compact?: boolean;
    onInput?: () => void; onToggleNative?: () => void;
  } = $props();
  let shifted = $state(true);
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function edit(change: KeyboardEdit) {
    if (disabled) return;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? start;
    const next = editIntakeText(value, start, end, change, maxLength);
    const changed = value !== next.value;
    flushSync(() => { value = next.value; });
    field?.setSelectionRange(next.cursor, next.cursor);
    if (changed) onInput?.();
  }
  function type(char: string) {
    edit({ text: shifted ? char.toUpperCase() : char });
    shifted = false;
  }
  function keepSelection(event: PointerEvent) {
    event.preventDefault();
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? start;
    field?.focus({ preventScroll: true });
    field?.setSelectionRange(start, end);
  }
</script>

{#snippet shiftKey()}
  <button type="button" class="key utility shift" aria-label="Shift" aria-pressed={shifted} {disabled} onpointerdown={keepSelection} onclick={() => { shifted = !shifted; }}>⇧</button>
{/snippet}
{#snippet spaceKey()}
  <button type="button" class="key space" aria-label="Space" {disabled} onpointerdown={keepSelection} onclick={() => edit({ text: ' ' })}>{compact ? '␣' : 'SPACE'}</button>
{/snippet}
{#snippet backspaceKey()}
  <button type="button" class="key utility erase" aria-label="Backspace" {disabled} onpointerdown={keepSelection} onclick={() => edit({ action: 'backspace' })}>⌫</button>
{/snippet}
<div class={['keys', { compact }]} role="group" aria-label="Game keyboard">
  {#each rows as row, index (row)}
    <div class="key-row">
      {#if compact && index === 2}{@render shiftKey()}{/if}
      {#each Array.from(row) as char (char)}
        <button type="button" class="key letter" {disabled} onpointerdown={keepSelection} onclick={() => type(char)}>{shifted ? char.toUpperCase() : char}</button>
      {/each}
      {#if compact && index === 1}{@render backspaceKey()}{/if}
      {#if compact && index === 2}
        {@render spaceKey()}
        <button type="button" class="key utility native" aria-label="Use phone keyboard" title="Use phone keyboard for more languages" onclick={onToggleNative}>⌨</button>
      {/if}
    </div>
  {/each}
  {#if !compact}
    <div class="key-row controls">
      {@render shiftKey()}{@render spaceKey()}{@render backspaceKey()}
    </div>
  {/if}
</div>

<style>
  .keys { display: grid; gap: 5px; padding-bottom: 3px; }
  .key-row { display: flex; justify-content: center; gap: 4px; min-height: 0; }
  .key {
    min-width: 0; flex: 1; max-width: 10%; height: 44px; padding: 0;
    border: 1px solid var(--ink); border-radius: 0;
    background: var(--paper); color: var(--ink); font: 18px var(--font-display);
    box-shadow: inset 0 2px 0 #fff, 0 3px 0 #9d758e;
    cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  }
  .key:active:not(:disabled) { transform: translateY(2px); box-shadow: inset 0 1px 0 var(--paper-2), 0 1px 0 #9d758e; background: var(--sakura-1); }
  .key:focus-visible { outline: 2px dashed var(--gold); outline-offset: 1px; }
  .key[aria-pressed='true'] { background: var(--sakura-2); }
  .key:disabled { opacity: 0.45; }
  .utility { background: var(--sakura-1); font-size: 12px; }
  .controls .key { max-width: none; }
  .controls .space { flex: 3; background: var(--paper); font-size: 13px; letter-spacing: 0.12em; }
  .shift, .erase, .native { font: 20px system-ui, sans-serif; }
  .compact { height: 100%; grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 3px; padding-bottom: 2px; }
  .compact .key-row { gap: 3px; }
  .compact .key { max-width: none; height: 100%; font-size: 16px; box-shadow: inset 0 1px 0 #fff, 0 2px 0 #9d758e; }
  .compact .utility { font-size: 11px; }
  .compact .shift, .compact .erase, .compact .native, .compact .space { font: 17px system-ui, sans-serif; }
  @media (max-width: 360px) { .compact .key-row { gap: 2px; } }
  @media (pointer: coarse) and (max-height: 500px) and (orientation: landscape) {
    .key { height: 34px; }
    .keys { gap: 4px; }
    .compact { gap: 3px; }
  }
</style>
