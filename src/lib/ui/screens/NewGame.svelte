<script module lang="ts">
  import { registerMetaHooks } from '../meta/hooks';
  registerMetaHooks();
</script>

<script lang="ts">
  // New game: confirm overwrite → fresh save → the 'prologue' scene (intake, meet the pigs, [companion pick]).
  // Until the story writers ship 'prologue', a built-in fallback runs: intake form → Select. A prologue skipped
  // before its intake was done (Scene → MENU → Skip scene) comes back here with { intake: true } for the same form.
  import { onMount } from 'svelte';
  import '../meta/meta.css';
  import { PIG_IDS } from '../../types';
  import { game } from '../../state/game.svelte';
  import { now } from '../../state/clock';
  import { getScene } from '../../vn';
  import { bgUrl, hasBackground } from '../meta/assets';
  import { applyIntake, type IntakeAnswers } from '../meta/content';
  import ConfirmDialog from '../meta/ConfirmDialog.svelte';
  import { HEARD_PREFIX } from '../meta/heard';
  import IntakeForm from '../meta/IntakeForm.svelte';
  import PetalCanvas from '../meta/PetalCanvas.svelte';
  import { motion } from '../meta/motion.svelte';
  import { giveStarterKit } from '../meta/prologue';
  import { continueSummary, isMeaningfulSave } from '../meta/save-utils';
  import { playSong } from '../meta/sfx';

  // the skipped prologue already started this save: no overwrite prompt
  const skippedPrologue = game.params.intake === true;
  const existing = !skippedPrologue && isMeaningfulSave(game.save, game.hasSave);
  const summary = existing ? continueSummary(game.save, now()) : '';
  const hasPrologue = !!getScene('prologue');
  let phase = $state<'confirm' | 'intake' | 'starting'>(skippedPrologue ? 'intake' : existing ? 'confirm' : 'starting');

  /** Fresh save that keeps settings and the Music Room's heard songs. */
  function freshSave() {
    const heard = Object.entries(game.save.counters).filter(([k]) => k.startsWith(HEARD_PREFIX));
    game.reset();
    for (const [k, v] of heard) game.save.counters[k] = v;
    game.flush();
  }

  function begin() {
    if (hasPrologue) {
      freshSave();
      game.go('scene', { id: 'prologue', back: 'hub' });
    } else {
      // fallback: keep the old save untouched until the intake form is submitted
      phase = 'intake';
    }
  }

  $effect(() => {
    playSong('title');
    if (phase === 'starting') queueMicrotask(begin);
  });

  // After a skipped prologue the form is already up, pre-filled with the name the scene took (IntakeForm read it when it
  // mounted). The save itself goes back to blank until the form is submitted (finishIntake), so CANCEL, or leaving the
  // game on the form, doesn't leave a half-made save (a name, no intake, no items) for the title's CONTINUE to pick up.
  onMount(() => {
    if (skippedPrologue) freshSave();
  });

  function finishIntake(a: IntakeAnswers) {
    const r = applyIntake(a);
    freshSave();
    game.save.player.name = r.name;
    for (const p of PIG_IDS) if (r.bonds[p]) game.addBond(p, r.bonds[p]);
    for (const fact of r.facts) for (const p of PIG_IDS) game.remember(p, fact);
    for (const [k, v] of Object.entries(r.flags)) game.setFlag(k, v);
    game.setFlag('intake.done');
    giveStarterKit(game); // what the prologue hands over after its intake (KempaPager, water bottle, met_p1–3)
    game.flush();
    game.go('select', { from: 'newgame' });
  }

  const bg = hasBackground('century_tower') ? bgUrl('century_tower') : hasBackground('title') ? bgUrl('title') : '';
</script>

<div class="km-screen newgame" class:km-reduced={motion.reduced}>
  {#if bg}
    <div class="km-cover scene" style:background-image="url({bg})" aria-hidden="true"></div>
  {:else}
    <div class="km-wallpaper" aria-hidden="true"></div>
  {/if}
  <PetalCanvas count={12} />

  <div class="content">
    {#if phase === 'intake'}
      <IntakeForm onDone={finishIntake} onCancel={() => game.go('title')} />
    {/if}
  </div>

  {#if phase === 'confirm'}
    <ConfirmDialog
      title="Start a new semester?"
      message="Your current semester ({summary}) will be overwritten. This can't be undone."
      confirmLabel="START OVER"
      cancelLabel="KEEP MY SAVE"
      onConfirm={begin}
      onCancel={() => game.go('title')}
    />
  {/if}
</div>

<style>
  .scene { filter: brightness(0.55) saturate(0.9); --focus: 70%; }
  .content {
    position: absolute;
    inset: 0;
    display: grid;
    padding: max(20px, var(--safe-top)) max(20px, var(--safe-right)) max(20px, var(--safe-bottom)) max(20px, var(--safe-left));
  }
  @media (max-aspect-ratio: 5/4) {
    .content { padding: max(12px, var(--safe-top)) max(10px, var(--safe-right)) max(12px, var(--safe-bottom)) max(10px, var(--safe-left)); }
  }
  @media (min-aspect-ratio: 5/4) and (max-height: 499px) {
    .content { padding: max(8px, var(--safe-top)) max(12px, var(--safe-right)) max(8px, var(--safe-bottom)) max(12px, var(--safe-left)); }
  }
</style>
