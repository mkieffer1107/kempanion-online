<script lang="ts">
  // "What should the piggies call you?" — native text field (12 chars, ticks as you type), RANDOM and OK.
  import { NAME_MAX, RANDOM_NAMES, cleanText, pickOne } from './content';
  import { blip, ui } from './sfx';

  let {
    initial = '',
    question = 'What should the piggies call you?',
    onSubmit,
  }: { initial?: string; question?: string; onSubmit: (name: string) => void } = $props();

  const startName = () => initial;
  let name = $state(startName());
  let input = $state<HTMLInputElement>();
  const uid = Math.random().toString(36).slice(2, 8);
  const clean = $derived(cleanText(name, NAME_MAX));

  $effect(() => {
    const el = input;
    if (el) queueMicrotask(() => el.focus({ preventScroll: true }));
  });

  function random() {
    let next = pickOne(RANDOM_NAMES);
    for (let i = 0; i < 4 && next === clean; i++) next = pickOne(RANDOM_NAMES);
    name = next;
    ui.toggle();
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!clean) {
      ui.error();
      input?.focus();
      return;
    }
    ui.select();
    onSubmit(clean);
  }
</script>

<form class="entry" onsubmit={submit}>
  <label class="q km-title" for="name-{uid}">{question}</label>
  <div class="field">
    <input
      bind:this={input}
      bind:value={name}
      id="name-{uid}"
      type="text"
      maxlength={NAME_MAX}
      autocomplete="nickname"
      autocapitalize="words"
      spellcheck="false"
      enterkeyhint="done"
      placeholder="Your name"
      oninput={() => blip('system')}
    />
    <span class="len" aria-hidden="true">{Array.from(name).length}/{NAME_MAX}</span>
  </div>
  <div class="buttons">
    <button type="button" class="px-btn ghost" onclick={random}>RANDOM</button>
    <button type="submit" class="px-btn primary" disabled={!clean}>OK</button>
  </div>
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
  .field {
    position: relative;
    display: flex;
    align-items: center;
  }
  input {
    width: 100%;
    min-height: 52px;
    padding: 8px 64px 8px 14px;
    font-size: 22px;
    color: var(--ink);
    background: #fffdf8;
    border: var(--px) solid var(--ink);
    box-shadow: inset var(--px) var(--px) 0 rgba(27, 18, 41, 0.18);
    border-radius: 0;
    user-select: text;
    -webkit-user-select: text;
  }
  input:focus { outline: var(--px) dashed var(--sakura-4); outline-offset: 2px; }
  .len {
    position: absolute;
    right: 12px;
    font-size: 13px;
    color: #8a7898;
  }
  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .buttons .px-btn { min-height: 48px; font-size: 18px; }
</style>
