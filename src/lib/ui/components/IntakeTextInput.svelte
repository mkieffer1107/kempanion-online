<script lang="ts">
  import { flushSync, type Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import IntakeKeyboard from './IntakeKeyboard.svelte';
  import { editIntakeText, type KeyboardEdit } from './intakeKeyboard';

  let {
    value = $bindable(''), field = $bindable(), kind, maxLength, placeholder = '',
    label, id, disabled = false, onInput, onKeydown, actions, native = $bindable(false), externalKeyboard = false,
  }: {
    value?: string; field?: HTMLInputElement; kind: 'name' | 'food'; maxLength: number;
    placeholder?: string; label: string; id?: string; disabled?: boolean; native?: boolean; externalKeyboard?: boolean;
    onInput?: () => void; onKeydown?: (event: KeyboardEvent) => void; actions?: Snippet;
  } = $props();

  const mobile = new MediaQuery('(pointer: coarse) and (max-width: 960px)');
  const gameKeyboard = $derived(mobile.current && !native);
  const uid = $props.id();

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

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.isComposing) {
      event.preventDefault();
      return;
    }
    onKeydown?.(event);
    if (!gameKeyboard || event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      edit({ action: event.key === 'Backspace' ? 'backspace' : 'delete' });
    } else if (Array.from(event.key).length === 1) {
      event.preventDefault();
      edit({ text: event.key });
    }
  }

  function switchKeyboard() {
    // Keep focus synchronous with the tap so iOS can open the native keyboard on request.
    field?.blur();
    flushSync(() => { native = !native; });
    field?.focus({ preventScroll: true });
  }

</script>

<div class={['intake-input', { 'game-keyboard': gameKeyboard, external: externalKeyboard }]}>
  <div class="input-row">
    <input
      bind:this={field} bind:value {id} data-chat-input data-intake-input
      type="text" maxlength={maxLength} {placeholder} {disabled}
      readonly={gameKeyboard} inputmode={gameKeyboard ? 'none' : 'text'}
      autocomplete={kind === 'name' ? 'nickname' : 'off'}
      autocapitalize={kind === 'name' ? 'words' : 'sentences'} spellcheck={kind !== 'name'}
      enterkeyhint="done" aria-label={label} aria-describedby={gameKeyboard && !externalKeyboard ? `${uid}-hint` : undefined}
      oninput={() => onInput?.()} onkeydown={keydown}
    />
    {@render actions?.()}
  </div>
  {#if mobile.current && !externalKeyboard}
    <div class="keyboard-bar">
      <span id="{uid}-hint">{gameKeyboard ? 'TAP TO TYPE' : 'PHONE KEYBOARD'} <span class="count">{value.length}/{maxLength}</span></span>
      <button type="button" class="keyboard-switch" onclick={switchKeyboard}>{native ? 'Game keyboard' : 'Use phone keyboard'}</button>
    </div>
  {/if}
  {#if gameKeyboard && !externalKeyboard}
    <IntakeKeyboard bind:value {field} {maxLength} {disabled} {onInput} />
  {/if}
</div>

<style>
  .intake-input { min-width: 0; display: grid; gap: 6px; }
  .input-row { display: flex; align-items: stretch; gap: 8px; min-width: 0; }
  .external .input-row { gap: calc(var(--px) * 2); }
  input {
    flex: 1; min-width: 0; width: 100%; min-height: 44px; padding: 0.3em 0.6em;
    font: inherit; font-size: max(16px, 0.8em); color: var(--ink); background: var(--paper);
    border: var(--px) solid var(--ink); border-radius: 0;
    box-shadow: inset var(--px) var(--px) 0 var(--paper-2);
    user-select: text; -webkit-user-select: text;
  }
  input::placeholder { color: #8a7a92; }
  input:focus-visible, button:focus-visible { outline: 2px dashed var(--gold); outline-offset: 2px; }
  .game-keyboard input:focus-visible { outline: none; }
  .keyboard-bar { display: flex; align-items: center; justify-content: space-between; gap: 4px; font: 11px var(--font-display); color: var(--sakura-1); }
  .count { opacity: 0.75; padding-left: 4px; }
  .keyboard-switch { padding: 4px 0 4px 8px; min-height: 28px; border: 0; background: none; color: inherit; font: 12px var(--font-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  @media (pointer: coarse) and (max-width: 960px) {
    .intake-input:not(.external) { background: var(--box-bg); padding: 8px; border: 1px solid var(--box-edge); }
  }
  @media (pointer: coarse) and (max-height: 500px) and (orientation: landscape) {
    .keyboard-bar, .keyboard-switch { min-height: 22px; }
    .intake-input:not(.external) { gap: 4px; padding: 5px; }
  }
</style>
