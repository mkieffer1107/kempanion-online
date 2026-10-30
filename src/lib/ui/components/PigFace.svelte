<script lang="ts">
  // 48x48 face token from the sprite pack, framed in the pig's color.
  import type { OutfitId, PigId } from '../../types';
  import { CHARACTERS } from '../../content/characters';
  import { faceUrl } from '../sprites';

  let { pig, size = 40, outfit = 'everyday', label = false, dim = false }: { pig: PigId; size?: number; outfit?: OutfitId; label?: boolean; dim?: boolean } = $props();
  const c = $derived(CHARACTERS[pig]);
</script>

<span class="face" class:dim style:--c={c.color} style:width="{size}px" style:height="{size}px">
  <img src={faceUrl(pig, outfit)} alt={label ? c.name : ''} width={size} height={size} draggable="false" />
</span>

<style>
  .face {
    display: inline-grid;
    place-items: center;
    flex: none;
    overflow: hidden;
    background: color-mix(in srgb, var(--c) 35%, var(--night));
    box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px var(--c);
    margin: 4px;
  }
  img { width: 100%; height: 100%; image-rendering: pixelated; }
  .dim { filter: grayscale(0.7) brightness(0.7); }
</style>
