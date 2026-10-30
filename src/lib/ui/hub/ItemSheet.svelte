<script lang="ts" module>
  export interface SheetItem {
    id: string;
    name: string;
    icon: string;
    /** Count owned; null = free & unlimited. */
    count: number | null;
    /** Short effect hint ("TUMMY +25"). */
    hint?: string;
    /** Discovered taste for this pig ("loves", "likes", …). */
    taste?: string | null;
    /** Highlight (e.g. it's what he wants right now). */
    wanted?: boolean;
  }
</script>

<script lang="ts">
  // Item picker sheet for FEED / DRINK / CARE / gifts. One tap uses the item.
  import type { Snippet } from 'svelte';
  import Modal from '../components/Modal.svelte';
  import Icon from '../components/Icon.svelte';

  interface Props {
    title: string;
    icon: string;
    items: SheetItem[];
    onpick: (id: string) => void;
    onclose: () => void;
    /** Shown when the list is empty. */
    empty?: string;
    footer?: Snippet;
  }

  let { title, icon, items, onpick, onclose, empty = 'Nothing here yet.', footer }: Props = $props();

  const TASTE: Record<string, string> = { secret: '★ secret fave', love: '♥ loves', like: 'likes', neutral: 'meh', dislike: 'not a fan' };
</script>

<Modal {title} {icon} kind="sheet" size="md" {onclose} {footer}>
  {#if items.length === 0}
    <p class="empty">{empty}</p>
  {:else}
    <ul class="grid">
      {#each items as it (it.id)}
        <li>
          <button type="button" class="tile" class:wanted={it.wanted} onclick={() => onpick(it.id)} data-cycle>
            <Icon id={it.icon} size={32} />
            <span class="name">{it.name}</span>
            <span class="meta">
              {#if it.count === null}<span class="free">FREE</span>{:else}<span>×{it.count}</span>{/if}
              {#if it.hint}<span class="hint">{it.hint}</span>{/if}
            </span>
            {#if it.taste}<span class="taste t-{it.taste}">{TASTE[it.taste] ?? it.taste}</span>{/if}
            {#if it.wanted}<span class="want" title="He wants this"><Icon id="sparkle" size={16} alt="He wants this" /></span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</Modal>

<style>
  .empty { margin: 8px 0; opacity: 0.85; }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .tile {
    position: relative;
    width: 100%;
    min-height: 92px;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 3px;
    padding: 8px 6px;
    background: rgba(255, 255, 255, 0.06);
    color: inherit;
    border: var(--px) solid rgba(255, 214, 224, 0.4);
    cursor: pointer;
    font: inherit;
    text-align: center;
  }
  .tile:hover { background: rgba(255, 183, 197, 0.16); }
  .tile:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: 1px; }
  .tile.wanted { border-color: var(--sakura-2); box-shadow: 0 0 0 2px var(--sakura-4) inset; }
  .name { font-size: 14px; line-height: 1.15; }
  .meta { display: flex; gap: 6px; font-size: 12px; opacity: 0.9; flex-wrap: wrap; justify-content: center; }
  .free { color: var(--ok); font-family: var(--font-display); }
  .hint { color: var(--gold); }
  .taste { font-size: 11px; color: var(--sakura-2); }
  .t-dislike { color: #c9b8ff; }
  .want { position: absolute; top: 2px; right: 2px; }
</style>
