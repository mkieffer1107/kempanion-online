<script lang="ts">
  // "What should the piggies call you?" — shared mobile game keyboard / desktop field and OK.
  import { NAME_MAX, cleanText } from './content';
  import { blip, ui } from './sfx';
  import IntakeConfirmation from '../components/IntakeConfirmation.svelte';
  import IntakeTextInput from '../components/IntakeTextInput.svelte';

  let {
    initial = '',
    question = 'What should the piggies call you?',
    onSubmit,
  }: { initial?: string; question?: string; onSubmit: (name: string) => void } = $props();

  const startName = () => initial;
  let name = $state(startName());
  let input = $state<HTMLInputElement>();
  let pendingName = $state<string | null>(null);
  const uid = Math.random().toString(36).slice(2, 8);
  const clean = $derived(cleanText(name, NAME_MAX));

  $effect(() => {
    const el = input;
    if (el && matchMedia('(pointer: fine)').matches) queueMicrotask(() => el.focus({ preventScroll: true }));
  });

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!clean) {
      ui.error();
      input?.focus();
      return;
    }
    ui.select();
    pendingName = clean;
  }

  function confirm() {
    if (pendingName === null) return;
    ui.select();
    onSubmit(pendingName);
  }

  function edit() {
    if (pendingName === null) return;
    name = pendingName;
    pendingName = null;
    ui.back();
  }
</script>

<form class="entry" onsubmit={submit}>
  {#if pendingName !== null}
    <IntakeConfirmation kind="name" value={pendingName} onConfirm={confirm} onEdit={edit} />
  {:else}
    <label class="q km-title" for="name-{uid}">{question}</label>
    <IntakeTextInput bind:field={input} bind:value={name} kind="name" maxLength={NAME_MAX}
      id="name-{uid}" label={question} placeholder="Your name" onInput={() => blip('system')}>
      {#snippet actions()}
        <button type="submit" class="px-btn primary" disabled={!clean}>OK</button>
      {/snippet}
    </IntakeTextInput>
  {/if}
</form>

<style>
  .entry {
    display: grid;
    gap: 12px;
    width: 100%;
  }
  .q {
    font-size: 20px;
    line-height: 1.3;
  }
  .px-btn { min-height: 48px; font-size: 18px; }
</style>
