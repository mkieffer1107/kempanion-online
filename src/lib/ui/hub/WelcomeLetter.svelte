<script lang="ts">
  // Welcome-back letter after > 2 h away: each pig reports what he did, in his own voice (pet module text).
  import type { WelcomeBackLetter } from '../../pet';
  import { CHARACTERS } from '../../content/characters';
  import Modal from '../components/Modal.svelte';
  import PigFace from '../components/PigFace.svelte';
  import Icon from '../components/Icon.svelte';
  import { NEED_ICON, NEED_LABEL } from '../components/NeedMeter.svelte';
  import { awayText } from './hub';

  let { letter, onclose }: { letter: WelcomeBackLetter; onclose: () => void } = $props();
</script>

<Modal title="While you were away…" icon="log" size="md" paper {onclose}>
  <p class="lead">
    {#if letter.party}
      You were gone {awayText(letter.hours, letter.minutes)}. The piggies threw you a welcome-back party!
      <span class="gift"><Icon id="acorn" size={18} /> +{letter.money} acorns</span>
    {:else}
      You were gone {awayText(letter.hours, letter.minutes)}. Here’s the Pig Pen report:
    {/if}
  </p>
  <ul class="entries">
    {#each letter.entries as e (e.pig)}
      <li>
        <PigFace pig={e.pig} size={40} />
        <div class="body">
          <p class="did"><strong style:color={CHARACTERS[e.pig].color}>{CHARACTERS[e.pig].name}</strong> {e.did}</p>
          <p class="line">“{e.line}”</p>
          {#if e.deltas.length}
            <p class="deltas">
              {#each e.deltas as d (d.need)}
                <span class:down={d.amount < 0}><Icon id={NEED_ICON[d.need]} size={16} /> {NEED_LABEL[d.need]} {d.amount > 0 ? '+' : ''}{d.amount}</span>
              {/each}
            </p>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
  {#snippet footer()}
    <button type="button" class="px-btn primary" onclick={onclose} data-autofocus>Let’s go!</button>
  {/snippet}
</Modal>

<style>
  .lead { margin: 0 0 10px; }
  .gift { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-display); color: #8a5a10; }
  .entries { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  li { display: flex; gap: 10px; align-items: flex-start; }
  .body { min-width: 0; }
  .body p { margin: 0; }
  .line { font-style: italic; margin-top: 2px !important; }
  .deltas { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px !important; font-size: 13px; }
  .deltas span { display: inline-flex; align-items: center; gap: 3px; color: #2f7a3a; }
  .deltas span.down { color: #a0442a; }
</style>
