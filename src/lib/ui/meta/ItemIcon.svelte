<script lang="ts">
  // Item icon from the shared pixel sheet, with a gift-box fallback while an icon isn't drawn yet.
  import Icon from '../components/Icon.svelte';
  import { ICONS } from '../../content/icons';
  import PixelGlyph from './PixelGlyph.svelte';

  let { id, size = 32 }: { id: string; size?: number } = $props();
  const known = $derived(!!ICONS[id]);
</script>

{#if known}
  <Icon {id} {size} />
{:else}
  <span class="fallback" style:width="{size}px" style:height="{size}px">
    <PixelGlyph name="box" scale={Math.max(1, Math.floor(size / 9))} />
  </span>
{/if}

<style>
  .fallback {
    display: inline-grid;
    place-items: center;
    flex: none;
  }
</style>
