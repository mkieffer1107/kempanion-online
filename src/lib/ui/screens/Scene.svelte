<script lang="ts">
  // Plays one KScript scene (params.id) with the stage, the VN dialogue box and its choice menu, then
  // returns to params.back (with params.backParams). params.replay = album replay (no rewards).
  import { onMount } from 'svelte';
  import { hapticTap } from '../../haptics';
  import { game, type ScreenId } from '../../state/game.svelte';
  import { audio } from '../../audio';
  import { DialogueBox, DialogueControls, dialogue, getScene, runScene, stopScene } from '../../vn';
  import PagerInset from '../../vn/components/PagerInset.svelte';
  import BrainInset from '../../vn/components/BrainInset.svelte';
  import RewardsInset from '../../vn/components/RewardsInset.svelte';
  import CgOverlay from '../../vn/components/CgOverlay.svelte';
  import MumbleBubbles from '../../vn/components/MumbleBubbles.svelte';
  import { robotMumbleWords } from '../../vn/components/robot-mumble';
  import { pagerInset } from '../../vn/pager.svelte';
  import { brainInset } from '../../vn/brain.svelte';
  import { factOf } from '../../vn/effects';
  import { viewport } from '../viewport.svelte';
  import GameLayout from '../layout/GameLayout.svelte';
  import StageHost from '../components/StageHost.svelte';
  import Modal from '../components/Modal.svelte';
  import { giveStarterKit, needsIntake, skipNote } from '../meta/prologue';

  const params = game.params as { id?: string; back?: ScreenId; backParams?: Record<string, unknown>; replay?: boolean };
  const id = params.id ?? '';
  const info = id ? getScene(id) : undefined;
  const back: ScreenId = params.back ?? (game.save.companion ? 'hub' : 'title');
  // The prologue sets up a new player (name, intake, starter items): skipping it must still do that (leave()).
  const prologue = id === 'prologue' && !params.replay;
  let menuOpen = $state(false);
  let stageEl = $state<HTMLDivElement>();
  // Each companion's currency explanation starts with this phrase; full text is available during typing.
  const rewardsShown = $derived(id === 'tutorial_hub' && dialogue.visible && dialogue.text.startsWith('Acorns are '));
  // Keep this space during HIDE too, so hiding the controls never moves the picture.
  const topClearance = $derived(rewardsShown ? 80 : pagerInset.keys !== null || brainInset.on ? 64 : 0);
  // Only the focused robot rant gets clouds. Advancing to Piggy 2 removes them at once; the later nervous reply
  // stays as scripted. Each page follows the existing dialogue controller, including instant text and AUTO.
  const robotMumble = $derived(id === 'prologue' && dialogue.visible && dialogue.speaker === 'piggy-3'
    && dialogue.mumbling && dialogue.expression === 'phone_mumble');
  const robotPage = $derived({ id: dialogue.text, words: robotMumbleWords(dialogue.text) });
  let leaving = false;
  let skipped = false;

  function leave() {
    if (leaving) return;
    leaving = true;
    // An ending played to the last line rolls the credits (Piggy 3's commit message is the final line), then the
    // pet sim carries on in Spring Semester.
    if (info?.ending && !params.replay && !skipped) {
      const lastLine = id === 'p3_ending' ? (factOf('commit_message') ?? '') : '';
      game.go('credits', { back: 'hub', lastLine });
      return;
    }
    if (prologue && skipped) {
      // Skipped before its intake was done: the intake form instead (name and answers, then the starter kit and
      // Select). Later on: just what it hadn't handed over yet, then on as usual (the hub sends you to Select).
      if (needsIntake(game.save)) {
        game.go('newgame', { intake: true });
        return;
      }
      giveStarterKit(game);
      game.flush();
    }
    game.go(back, params.backParams ?? {});
  }

  function skipScene() {
    skipped = true;
    menuOpen = false;
    audio.sfx('ui_back');
    stopScene();
    setTimeout(leave, 60);
  }

  function stageTap(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;
    if (dialogue.canAdvance) hapticTap(e);
    dialogue.advance();
  }

  onMount(() => {
    let alive = true;
    if (!id || !info) {
      console.warn(`[scene] unknown scene "${id}"`);
      queueMicrotask(leave);
      return;
    }
    runScene(id, { replay: params.replay === true })
      .catch((e) => console.error('[scene]', e))
      .finally(() => { if (alive) leave(); });
    return () => {
      alive = false;
      if (dialogue.mode === 'scene') stopScene();
    };
  });
</script>

{#snippet menuBtn()}
  <button type="button" class="px-btn ghost" title="Menu" onclick={(e) => { e.stopPropagation(); menuOpen = true; }}>MENU</button>
{/snippet}

<!-- HIDE hides the layout's regions too: in S the controls sit in the right rail, outside the text box. -->
<GameLayout chrome="vn" centered dockedDialogue {topClearance} hideUi={dialogue.uiHidden} onreveal={() => (dialogue.uiHidden = false)}>
  {#snippet stage()}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage-wrap" bind:this={stageEl} onclick={stageTap}>
      <StageHost advanceHaptics={dialogue.canAdvance && !menuOpen} label={info?.title ?? 'Story scene'}>
        {#if robotMumble}
          <MumbleBubbles mode={viewport.mode} pos="right" outfit="everyday" stream page={robotPage} lineup={['left', 'center', 'right']} />
        {/if}
        <!-- T and S stages can be narrower than a CG (the canvas crops it): show the whole picture over them.
             W is always 16:9. -->
        {#if viewport.mode !== 'w'}<CgOverlay />{/if}
      </StageHost>
      {#if viewport.mode !== 't'}
        <PagerInset place="stage" />
        <BrainInset place="stage" />
        {#if rewardsShown && !dialogue.uiHidden}<RewardsInset place="stage" />{/if}
        {#if viewport.mode === 's'}<DialogueBox layout="overlay" controls={false} menu={menuBtn} />{/if}
      {/if}
    </div>
  {/snippet}

  {#snippet overlay()}
    {#if viewport.mode === 't'}<PagerInset place="top" picture={stageEl} />{/if}
    {#if viewport.mode === 't'}<BrainInset place="top" />{/if}
    {#if viewport.mode === 't' && rewardsShown && !dialogue.uiHidden}<RewardsInset place="top" />{/if}
  {/snippet}

  {#snippet bottom()}
    {#if viewport.mode === 's'}<DialogueControls vertical menu={menuBtn} />{/if}
  {/snippet}

  {#snippet text()}
    {#if viewport.mode !== 's'}<DialogueBox layout="docked" lines={viewport.mode === 'w' ? 3 : undefined} menu={menuBtn} />{/if}
  {/snippet}
</GameLayout>

{#if menuOpen}
  <Modal title={info?.title ?? 'Scene'} icon="book" size="sm" onclose={() => (menuOpen = false)}>
    <p class="note">
      {skipNote({ replay: params.replay, triggered: info?.triggered, prologue, intake: prologue && needsIntake(game.save) })}
    </p>
    {#snippet footer()}
      <button type="button" class="px-btn" onclick={() => (menuOpen = false)} data-autofocus>Keep watching</button>
      <button type="button" class="px-btn primary" onclick={skipScene}>{params.replay ? 'Leave' : 'Skip scene'}</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .stage-wrap { position: absolute; inset: 0; }
  .note { margin: 0; }
</style>
