<script lang="ts">
  // Free-chat row: quick-reply chips, a text field (140 chars, enterkeyhint=send, 16px+ so iOS doesn't zoom),
  // SEND and Leave. SEND shows "…" while the brain thinks or the reply is typing. Answers dialogue.ask().
  import { audio } from '../../audio';
  import { randomName } from '../name-entry';
  import { dialogue } from '../dialogue.svelte';
  import { liftAboveKeyboard } from './keyboard';

  let {
    showPrompt = true,
    lift = true,
    autofocus = true,
    class: klass = '',
  }: {
    /** Show the ask() prompt as a hint line (DialogueBox shows it in the box instead when the box is empty). */
    showPrompt?: boolean;
    /** Lift this row above the on-screen keyboard while typing (DialogueBox lifts itself and passes false). */
    lift?: boolean;
    /** Focus the field when a question opens (only with a mouse/keyboard, so phones don't pop the keyboard). */
    autofocus?: boolean;
    class?: string;
  } = $props();

  let field: HTMLInputElement | undefined = $state();

  const opts = $derived(dialogue.input);
  // A new question owns its draft (including a saved name); edits last until the next question.
  let value = $derived(opts?.initial ?? '');
  const ready = $derived(!!opts && !dialogue.thinking && !dialogue.typing);
  const max = $derived(opts?.maxLength ?? 140);
  const isName = $derived(opts?.kind === 'name');
  // Keep last turn's chips on screen (disabled) while the pig answers, so the row doesn't jump.
  let lastChips = $state<string[]>([]);
  $effect(() => {
    if (opts?.quickReplies) lastChips = opts.quickReplies;
  });
  const chips = $derived(opts?.quickReplies ?? (dialogue.chatOpen ? lastChips : []));
  const canLeave = $derived(!!opts?.allowLeave || dialogue.chatOpen);
  const canSend = $derived(ready && (!!value.trim() || !!opts?.allowEmpty));

  $effect(() => {
    if (opts && autofocus && typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches) {
      field?.focus({ preventScroll: true });
    }
  });

  function send(text: string) {
    if (!ready) return;
    const nameEntry = isName;
    if (dialogue.submit(text)) {
      if (nameEntry) audio.sfx('ui_select');
      value = '';
    }
  }

  function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    send(value);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.isComposing) { e.preventDefault(); return; }
    if (e.key === 'Escape') {
      e.stopPropagation();
      field?.blur();
    }
  }
</script>

<form class="chat {klass}" {onsubmit} use:liftAboveKeyboard={lift} aria-busy={!ready}>
  {#if showPrompt && opts?.prompt}
    <p class="prompt">{opts.prompt}</p>
  {/if}
  {#if isName}
    <div class="chips">
      <button type="button" class="chip" disabled={!ready} onclick={() => { value = randomName(value.trim()); audio.sfx('ui_toggle'); }}>Random</button>
      <span class="length" aria-live="polite">{value.length}/{max}</span>
    </div>
  {/if}
  {#if chips.length}
    <div class="chips" role="group" aria-label="Quick replies">
      {#each chips as chip (chip)}
        <button type="button" class="chip" disabled={!ready} onclick={() => send(chip)}>{chip}</button>
      {/each}
    </div>
  {/if}
  <div class="row">
    <input
      bind:this={field}
      bind:value
      class="field"
      data-chat-input
      type="text"
      maxlength={max}
      enterkeyhint={isName ? 'done' : 'send'}
      autocomplete={isName ? 'nickname' : 'off'}
      autocapitalize={isName ? 'words' : 'sentences'}
      spellcheck={!isName}
      oninput={() => { if (isName) audio.sfx('ui_move'); }}
      placeholder={opts?.placeholder ?? 'Say something…'}
      aria-label={opts?.prompt ?? 'Your message'}
      {onkeydown}
    />
    <button type="submit" class="px-btn primary send" disabled={!canSend} aria-label={ready ? 'Send' : 'Waiting for a reply'}>
      {ready ? 'SEND' : '…'}
    </button>
    {#if canLeave}
      <button type="button" class="px-btn ghost leave" onclick={() => dialogue.leave()}>Leave</button>
    {/if}
  </div>
</form>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    gap: calc(var(--px) * 2);
    margin: 0;
    pointer-events: auto;
    font-family: var(--font-body);
  }
  .prompt {
    margin: 0;
    font-size: max(14px, 0.75em);
    color: var(--sakura-1);
    text-shadow: 1px 1px 0 #000;
  }
  .chips {
    display: flex;
    gap: calc(var(--px) * 2);
    overflow-x: auto;
    scrollbar-width: none;
    padding: 2px 0;
  }
  .length { align-self: center; margin-left: auto; font-size: 12px; color: var(--sakura-1); }
  .chips::-webkit-scrollbar { display: none; }
  .chip {
    appearance: none;
    flex: none;
    min-height: 40px;
    padding: 0.2em 0.85em;
    font: inherit;
    font-size: max(14px, 0.75em);
    color: var(--ink);
    background: var(--sakura-1);
    border: var(--px) solid var(--ink);
    border-radius: 0;
    box-shadow: inset calc(var(--px) * -1) calc(var(--px) * -1) 0 var(--sakura-2);
    cursor: pointer;
    white-space: nowrap;
  }
  .chip:hover:not(:disabled) { background: #fff; }
  .chip:active:not(:disabled) { transform: translateY(var(--px)); }
  .chip:disabled { opacity: 0.55; cursor: default; }
  .chip:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  @media (pointer: coarse) { .chip { min-height: 44px; } }
  .row {
    display: flex;
    gap: calc(var(--px) * 2);
    align-items: stretch;
  }
  .field {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0.3em 0.6em;
    font-size: max(16px, 0.8em);
    color: var(--ink);
    background: var(--paper);
    border: var(--px) solid var(--ink);
    border-radius: 0;
    box-shadow: inset var(--px) var(--px) 0 var(--paper-2);
  }
  .field::placeholder { color: #8a7a92; }
  .field:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  .send, .leave {
    flex: none;
    font-family: var(--font-display);
    letter-spacing: 0.06em;
    font-size: max(14px, 0.72em);
  }
  .send { min-width: 4.6em; }
</style>
