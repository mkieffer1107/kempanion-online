<script lang="ts">
  // Plays one KScript scene (params.id) with the stage, the VN dialogue box and its choice menu, then
  // returns to params.back (with params.backParams). params.replay = album replay (no rewards).
  import { onMount } from 'svelte';
  import { game, type ScreenId } from '../../state/game.svelte';
  import { audio } from '../../audio';
  import { DialogueBox, DialogueControls, dialogue, getScene, runScene, stopScene } from '../../vn';
  import { factOf } from '../../vn/effects';
  import { viewport } from '../viewport.svelte';
  import GameLayout from '../layout/GameLayout.svelte';
  import StageHost from '../components/StageHost.svelte';
  import Modal from '../components/Modal.svelte';

  const params = game.params as { id?: string; back?: ScreenId; backParams?: Record<string, unknown>; replay?: boolean };
  const id = params.id ?? '';
  const info = id ? getScene(id) : undefined;
  const back: ScreenId = params.back ?? (game.save.companion ? 'hub' : 'title');
  let menuOpen = $state(false);
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

<GameLayout chrome="vn">
  {#snippet stage()}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage-wrap" onclick={stageTap}>
      <StageHost label={info?.title ?? 'Story scene'} />
      {#if viewport.mode !== 't'}
        <DialogueBox layout="overlay" controls={viewport.mode === 'w'} menu={menuBtn} />
      {/if}
    </div>
  {/snippet}

  {#snippet bottom()}
    {#if viewport.mode === 's'}<DialogueControls vertical menu={menuBtn} />{/if}
  {/snippet}

  {#snippet text()}
    {#if viewport.mode === 't'}<DialogueBox layout="docked" menu={menuBtn} />{/if}
  {/snippet}
</GameLayout>

{#if menuOpen}
  <Modal title={info?.title ?? 'Scene'} icon="book" size="sm" onclose={() => (menuOpen = false)}>
    <p class="note">
      {params.replay ? 'Leave this replay?' : 'Skip the rest of this scene? It won’t count as seen, so it can come back later.'}
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
