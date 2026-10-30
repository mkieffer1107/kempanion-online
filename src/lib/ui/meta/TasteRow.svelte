<script lang="ts">
  // What each pig thinks of an item — only for tastes the player has discovered ("?" otherwise).
  import { PIG_IDS, type ItemDef } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { game } from '../../state/game.svelte';
  import { faceUrl } from './assets';
  import { discoveredTaste, type Taste } from './save-utils';

  let { item }: { item: ItemDef } = $props();

  const LABEL: Record<Taste, string> = {
    secret: '★ SECRET FAVE',
    love: '♥ LOVES',
    like: '+ LIKES',
    neutral: '· OKAY',
    dislike: '− NOT A FAN',
  };

  const rows = $derived(
    PIG_IDS.map((p) => {
      const taste = discoveredTaste(game.save, p, item.id);
      return { pig: p, known: taste !== null, taste };
    }),
  );
</script>

<ul class="tastes" aria-label="What the pigs think">
  {#each rows as r (r.pig)}
    <li class:unknown={!r.known} class={r.taste ?? ''} style:--pig={CHARACTERS[r.pig].color}>
      <img src={faceUrl(r.pig)} alt="" width="24" height="24" draggable="false" />
      <span class="who visually-hidden">{CHARACTERS[r.pig].name}:</span>
      <span class="what">{r.taste ? LABEL[r.taste] : '?'}</span>
    </li>
  {/each}
</ul>

<style>
  .tastes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px 2px 2px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.08);
    border: var(--px) solid color-mix(in srgb, var(--pig) 70%, transparent);
  }
  img { width: 24px; height: 24px; image-rendering: pixelated; }
  .unknown { opacity: 0.6; }
  .love .what, .secret .what { color: var(--sakura-2); }
  .like .what { color: var(--ok); }
  .dislike .what { color: #c9b8ff; }
</style>
