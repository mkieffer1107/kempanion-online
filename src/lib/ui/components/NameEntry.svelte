<script lang="ts">
  // Pixel name-entry window (vnHooks.enterName). 12 characters, [Random] and [OK]; never returns empty.
  import { overlays } from '../overlays.svelte';
  import { game } from '../../state/game.svelte';
  import { audio } from '../../audio';
  import Modal from './Modal.svelte';

  const RANDOM = ['Alex', 'Sam', 'Jordan', 'Riley', 'Gator', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Avery', 'Quinn', 'Rowan'];

  const req = $derived(overlays.name);
  let name = $state(overlays.name?.initial ?? '');

  function random() {
    audio.sfx('ui_toggle');
    let next = name;
    while (next === name) next = RANDOM[Math.floor(Math.random() * RANDOM.length)];
    name = next;
  }

  function ok(e?: Event) {
    e?.preventDefault();
    const n = name.trim().replace(/\s+/g, ' ').slice(0, 12) || RANDOM[Math.floor(Math.random() * RANDOM.length)];
    audio.sfx('ui_select');
    game.save.player.name = n;
    game.persist();
    req?.resolve(n);
  }
</script>

{#if req}
  <Modal title="Name" icon="talk" size="sm" dismissible={false}>
    <form class="form" onsubmit={ok}>
      <label for="name-entry">{req.prompt}</label>
      <input
        id="name-entry"
        class="field"
        type="text"
        maxlength="12"
        autocomplete="nickname"
        autocapitalize="words"
        enterkeyhint="done"
        spellcheck="false"
        bind:value={name}
        oninput={() => audio.sfx('ui_move')}
        data-autofocus
      />
      <p class="count" aria-live="polite">{name.length}/12</p>
      <div class="row">
        <button type="button" class="px-btn" onclick={random}>Random</button>
        <button type="submit" class="px-btn primary">OK</button>
      </div>
    </form>
  </Modal>
{/if}

<style>
  .form { display: flex; flex-direction: column; gap: 8px; }
  label { font-size: 17px; }
  .field {
    min-height: 48px;
    padding: 6px 10px;
    font-size: 22px;
    letter-spacing: 0.06em;
    color: var(--ink);
    background: var(--paper);
    border: var(--px) solid var(--ink);
    box-shadow: inset var(--px) var(--px) 0 var(--paper-2);
    outline: none;
  }
  .field:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  .count { margin: 0; font-size: 12px; opacity: 0.7; text-align: right; }
  .row { display: flex; gap: 8px; justify-content: flex-end; }
  .row .px-btn { min-width: 96px; }
</style>
