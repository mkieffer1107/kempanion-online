<script lang="ts">
  // Recovery intake uses the same stage, answers and dialogue frame as the prologue.
  // No companion is introduced here: their first appearance belongs to the story.
  import { onMount } from 'svelte';
  import { game } from '../../state/game.svelte';
  import { stage } from '../../engine/stage';
  import { dialogue, DialogueBox, DialogueControls } from '../../vn';
  import GameLayout from '../layout/GameLayout.svelte';
  import StageHost from '../components/StageHost.svelte';
  import { viewport } from '../viewport.svelte';
  import { NAME_MAX, SLEEP, WHY_UF, type IntakeAnswers } from './content';

  let { onDone, onCancel }: { onDone: (a: IntakeAnswers) => void; onCancel: () => void } = $props();
  const initialName = game.save.player.name || '';

  onMount(() => {
    let alive = true;
    dialogue.reset();
    dialogue.mode = 'scene';
    dialogue.auto = false;
    stage.clearPortraits();
    stage.setSpeaker(null);
    void stage.setBackground('century_tower', 'cut');

    async function intake() {
      await dialogue.say('narrator', '【KEMPA AI】Intake form, question 1 of 4. What should we call you?');
      if (!alive) return;
      const name = await dialogue.ask({ kind: 'name', initial: initialName, prompt: 'What should we call you?', placeholder: 'Your name', maxLength: NAME_MAX, allowEmpty: true });
      if (!alive || name === null) return;
      await dialogue.say('narrator', `【KEMPA AI】Nice to meet you, ${name}! Question 2 of 4. What brings you to UF?`);
      if (!alive) return;
      const why = await dialogue.choose(WHY_UF.map((answer) => answer.label));
      if (!alive) return;
      await dialogue.say('narrator', '【KEMPA AI】Question 3 of 4. Early bird or night owl?');
      if (!alive) return;
      const sleep = await dialogue.choose(SLEEP.map((answer) => answer.label));
      if (!alive) return;
      await dialogue.say('narrator', "【KEMPA AI】Last one, question 4 of 4. What's your comfort food?");
      if (!alive) return;
      const comfortFood = await dialogue.ask({ kind: 'food', prompt: 'Comfort food?', placeholder: 'muffin', maxLength: 24, allowEmpty: true });
      if (!alive || comfortFood === null) return;
      onDone({ name, whyUf: WHY_UF[why].id, sleep: SLEEP[sleep].id, comfortFood });
    }
    void intake();
    return () => { alive = false; dialogue.reset(); };
  });

  function stageTap(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('button, input, textarea, a')) return;
    dialogue.advance();
  }
</script>

{#snippet cancelButton()}
  <button type="button" class="px-btn ghost" onclick={onCancel}>CANCEL</button>
{/snippet}

<GameLayout chrome="vn" centered dockedDialogue hideUi={dialogue.uiHidden} onreveal={() => (dialogue.uiHidden = false)}>
  {#snippet stage()}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage-wrap" onclick={stageTap}>
      <StageHost label="Kempa AI intake under the Century Tower sakura" />
      {#if viewport.mode === 's'}<DialogueBox layout="overlay" controls={false} />{/if}
    </div>
  {/snippet}
  {#snippet bottom()}
    {#if viewport.mode === 's'}<DialogueControls vertical menu={cancelButton} />{/if}
  {/snippet}
  {#snippet text()}
    {#if viewport.mode !== 's'}<DialogueBox layout="docked" lines={viewport.mode === 'w' ? 3 : undefined} menu={cancelButton} />{/if}
  {/snippet}
</GameLayout>

<style>
  .stage-wrap { position: absolute; inset: 0; }
</style>
