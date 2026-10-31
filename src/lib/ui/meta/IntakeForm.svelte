<script lang="ts">
  // The Kempa AI intake tablet (built-in fallback when the 'prologue' scene isn't available):
  // name → what brings you to UF → early bird / night owl → comfort food → submit.
  import './meta.css';
  import type { PigId } from '../../types';
  import { CHARACTERS, speakerColor } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import {
    INTAKE_REACTION, SLEEP, WHY_UF, cleanText, fill, isPorkFood,
    type IntakeAnswers, type MetaLine, type SleepType, type WhyUf,
  } from './content';
  import { faceUrl } from './assets';
  import NameEntry from './NameEntry.svelte';
  import IntakeConfirmation from '../components/IntakeConfirmation.svelte';
  import PixelGlyph from './PixelGlyph.svelte';
  import { Typewriter } from './typewriter.svelte';
  import { ui } from './sfx';

  let { onDone, onCancel }: { onDone: (a: IntakeAnswers) => void; onCancel: () => void } = $props();

  type Step = 'name' | 'why' | 'sleep' | 'food' | 'review';
  const STEPS: Step[] = ['name', 'why', 'sleep', 'food', 'review'];
  let step = $state<Step>('name');
  let name = $state(game.save.player.name || '');
  let whyUf = $state<WhyUf | null>(null);
  let sleep = $state<SleepType | null>(null);
  let food = $state('');
  let pendingFood = $state<string | null>(null);
  let foodInput = $state<HTMLInputElement>();
  let options: HTMLButtonElement[] = $state([]);

  const stepNo = $derived(STEPS.indexOf(step) + 1);
  const tw = new Typewriter();
  let reaction = $state<MetaLine | null>(null);
  const reactPig = $derived<PigId | null>(
    reaction && reaction.speaker !== 'narrator' && reaction.speaker !== 'player' ? reaction.speaker : null,
  );

  function react(line: MetaLine, vars: Record<string, string> = {}) {
    reaction = line;
    tw.start(fill(line.text, vars), line.speaker);
  }
  $effect(() => () => tw.stop());

  function goto(s: Step) {
    step = s;
    if (s === 'why' || s === 'sleep') queueMicrotask(() => options[0]?.focus());
    if (s === 'food') queueMicrotask(() => foodInput?.focus({ preventScroll: true }));
  }

  function setName(n: string) {
    name = n;
    react(INTAKE_REACTION.name);
    goto('why');
  }
  function setWhy(id: WhyUf) {
    ui.select();
    whyUf = id;
    react(INTAKE_REACTION.why[id]);
    goto('sleep');
  }
  function setSleep(id: SleepType) {
    ui.select();
    sleep = id;
    react(INTAKE_REACTION.sleep[id]);
    goto('food');
  }
  function setFood(e: SubmitEvent) {
    e.preventDefault();
    ui.select();
    pendingFood = cleanText(food, 24) || 'muffin';
  }
  function confirmFood() {
    if (pendingFood === null) return;
    const f = pendingFood;
    food = f;
    pendingFood = null;
    ui.select();
    if (isPorkFood(f)) react(INTAKE_REACTION.porkFood);
    else react(INTAKE_REACTION.food, { food: f.charAt(0).toUpperCase() + f.slice(1) });
    goto('review');
  }
  function editFood() {
    if (pendingFood === null) return;
    food = pendingFood;
    pendingFood = null;
    ui.back();
    queueMicrotask(() => foodInput?.focus({ preventScroll: true }));
  }
  function submit() {
    if (!whyUf || !sleep) return;
    ui.select();
    onDone({ name, whyUf, sleep, comfortFood: food });
  }
  function back() {
    if (step === 'food' && pendingFood !== null) { editFood(); return; }
    ui.back();
    const i = STEPS.indexOf(step);
    if (i <= 0) onCancel();
    else goto(STEPS[i - 1]);
  }

  function onkeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
    if (e.key === 'Escape') {
      e.preventDefault();
      back();
      return;
    }
    if (typing) return;
    const list = step === 'why' ? WHY_UF : step === 'sleep' ? SLEEP : null;
    if (list) {
      const n = Number(e.key);
      if (n >= 1 && n <= list.length) {
        e.preventDefault();
        if (step === 'why') setWhy(WHY_UF[n - 1].id);
        else setSleep(SLEEP[n - 1].id);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = options.findIndex((b) => b === document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        options[next]?.focus();
        ui.move();
      }
    }
    if (step === 'review' && (e.key === 'Enter' || e.key === ' ') && (!t || t.tagName !== 'BUTTON')) {
      e.preventDefault();
      submit();
    }
  }

  const whyLabel = $derived(WHY_UF.find((w) => w.id === whyUf)?.label ?? '—');
  const sleepLabel = $derived(SLEEP.find((s) => s.id === sleep)?.label ?? '—');
  const foodLabel = $derived.by(() => {
    const f = cleanText(food, 24) || 'muffin';
    return isPorkFood(f) ? 'soup' : f;
  });
</script>

<svelte:window {onkeydown} />

<div class="intake">
  <section class="tablet km-pop-in" aria-labelledby="intake-title">
    <header class="bezel">
      <span class="brand km-title"><PixelGlyph name="sakura" scale={2} /> KEMPA AI</span>
      <h2 id="intake-title" class="km-title form">KEMPANION PROGRAM · INTAKE FORM</h2>
      <span class="pips" aria-label="Step {stepNo} of {STEPS.length}">
        {#each STEPS as s, i (s)}<span class="pip" class:done={i < stepNo}></span>{/each}
      </span>
    </header>

    <div class="screen">
      {#key step}
        <div class="page km-step-in">
          {#if step === 'name'}
            <NameEntry initial={name} onSubmit={setName} />
          {:else if step === 'why'}
            <p class="q km-title" id="q-why">What brings you to UF?</p>
            <div class="options" role="group" aria-labelledby="q-why">
              {#each WHY_UF as w, i (w.id)}
                <button bind:this={options[i]} class="opt" class:picked={whyUf === w.id} onclick={() => setWhy(w.id)}>
                  <span class="num">{i + 1}</span>{w.label}
                </button>
              {/each}
            </div>
          {:else if step === 'sleep'}
            <p class="q km-title" id="q-sleep">Early bird or night owl?</p>
            <div class="options" role="group" aria-labelledby="q-sleep">
              {#each SLEEP as s, i (s.id)}
                <button bind:this={options[i]} class="opt" class:picked={sleep === s.id} onclick={() => setSleep(s.id)}>
                  <span class="num">{i + 1}</span>{s.label}
                </button>
              {/each}
            </div>
          {:else if step === 'food'}
            {#if pendingFood !== null}
              <IntakeConfirmation kind="food" value={pendingFood} onConfirm={confirmFood} onEdit={editFood} />
            {:else}
              <form class="foodform" onsubmit={setFood}>
                <label class="q km-title" for="intake-food">Comfort food?</label>
                <input
                  bind:this={foodInput}
                  bind:value={food}
                  id="intake-food"
                  type="text"
                  maxlength="24"
                  placeholder="muffin"
                  autocomplete="off"
                  enterkeyhint="next"
                />
                <button type="submit" class="px-btn primary">NEXT</button>
              </form>
            {/if}
          {:else}
            <p class="q km-title">All set? Kempa AI will pair you with a Kempanion.</p>
            <dl class="review">
              <div><dt>NAME</dt><dd>{name}</dd></div>
              <div><dt>WHAT BRINGS YOU TO UF</dt><dd>{whyLabel}</dd></div>
              <div><dt>EARLY BIRD / NIGHT OWL</dt><dd>{sleepLabel}</dd></div>
              <div><dt>COMFORT FOOD</dt><dd>{foodLabel}</dd></div>
            </dl>
            <button class="px-btn primary submit" onclick={submit}>SUBMIT <PixelGlyph name="cursor" scale={2} /></button>
          {/if}
        </div>
      {/key}
    </div>

    <footer class="tabletfoot">
      <button class="px-btn ghost small" onclick={back}>
        <PixelGlyph name="back" scale={2} /> {step === 'name' ? 'CANCEL' : 'BACK'}
      </button>
      <span class="fine">Kempa AI never shares your answers. (There is no server. They're just for the piggies.)</span>
    </footer>
  </section>

  {#if reaction}
    <div class="bubble km-step-in" style:--plate={speakerColor(reaction.speaker)}>
      {#if reactPig}
        <img class="face" src={faceUrl(reactPig)} alt="" width="48" height="48" draggable="false" />
      {/if}
      <div class="btext">
        {#if reactPig}<span class="km-plate who">{CHARACTERS[reactPig].name}</span>{/if}
        <p aria-live="polite">{tw.visible}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .intake {
    position: relative;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    justify-items: center;
    align-items: center;
    gap: 14px;
    width: 100%;
    height: 100%;
  }
  .tablet {
    display: flex;
    flex-direction: column;
    width: min(620px, 100%);
    max-height: 100%;
    background: #2e2142;
    border: calc(var(--px) * 2) solid var(--ink);
    box-shadow: inset 0 0 0 var(--px) #5b3a6e, 0 calc(var(--px) * 2) 0 rgba(0, 0, 0, 0.5);
    padding: 10px;
    gap: 8px;
  }
  .bezel {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    color: var(--sakura-1);
  }
  .brand { display: inline-flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; }
  .form { margin: 0; font-size: 13px; letter-spacing: 0.08em; color: rgba(255, 227, 234, 0.75); flex: 1; }
  .pips { display: inline-flex; gap: 4px; }
  .pip { width: 12px; height: 8px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); }
  .pip.done { background: var(--sakura-2); border-color: var(--sakura-1); }

  .screen {
    min-height: 0;
    overflow: auto;
    padding: 16px;
    color: var(--ink);
    background: var(--paper);
    border: var(--px) solid var(--ink);
    box-shadow: inset var(--px) var(--px) 0 #fff, inset calc(var(--px) * -1) calc(var(--px) * -1) 0 var(--paper-2);
  }
  .page { display: grid; gap: 12px; }
  .q { margin: 0; font-size: 20px; line-height: 1.3; }
  .options { display: grid; gap: 8px; }
  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 6px 12px;
    text-align: left;
    font-size: 17px;
    color: var(--ink);
    background: #fffdf8;
    border: var(--px) solid var(--ink);
    box-shadow: 0 var(--px) 0 var(--ink);
    cursor: pointer;
  }
  .opt:hover, .opt:focus-visible { background: var(--sakura-1); outline: none; }
  .opt:focus-visible { box-shadow: 0 var(--px) 0 var(--ink), inset 0 0 0 var(--px) var(--sakura-4); }
  .opt.picked { background: var(--sakura-2); }
  .num {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    flex: none;
    font-family: var(--font-display);
    color: var(--paper);
    background: var(--ink);
  }
  .foodform { display: grid; gap: 12px; }
  .foodform input {
    min-height: 52px;
    padding: 8px 14px;
    font-size: 22px;
    color: var(--ink);
    background: #fffdf8;
    border: var(--px) solid var(--ink);
    border-radius: 0;
    user-select: text;
    -webkit-user-select: text;
  }
  .foodform input:focus { outline: var(--px) dashed var(--sakura-4); outline-offset: 2px; }
  .foodform .px-btn, .submit { min-height: 48px; font-size: 18px; }
  .review { margin: 0; display: grid; gap: 6px; }
  .review div { display: grid; grid-template-columns: 12em 1fr; gap: 8px; border-bottom: 1px dotted rgba(27, 18, 41, 0.3); padding: 4px 0; }
  .review dt { font-family: var(--font-display); font-size: 13px; color: #7d4e9c; }
  .review dd { margin: 0; }

  .tabletfoot { display: flex; align-items: center; gap: 10px; }
  .fine { font-size: 11px; color: rgba(255, 227, 234, 0.6); }

  .bubble {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    width: min(620px, 100%);
    padding: 10px 12px;
    background: var(--box-bg);
    border: var(--px) solid var(--box-edge);
    outline: var(--px) solid var(--ink);
    color: var(--box-text);
    text-shadow: 1px 1px 0 #000;
  }
  .face {
    width: 48px;
    height: 48px;
    flex: none;
    image-rendering: pixelated;
    background: color-mix(in srgb, var(--plate) 45%, transparent);
    border: var(--px) solid var(--ink);
  }
  .btext { min-width: 0; }
  .who { font-size: 14px; }
  .btext p { margin: 4px 0 0; font-size: 16px; line-height: 1.45; min-height: 1.45em; }

  @media (max-aspect-ratio: 5/4) {
    .intake { align-items: start; }
    .screen { padding: 12px; }
    .q { font-size: 18px; }
    .review div { grid-template-columns: 1fr; gap: 0; }
    .fine { display: none; }
  }
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .intake { grid-template-columns: minmax(0, 1fr) minmax(0, 0.7fr); grid-template-rows: 1fr; align-items: stretch; }
    .tablet { width: 100%; }
    .bubble { width: 100%; align-self: end; }
    .fine { display: none; }
  }
</style>
