<script lang="ts">
  import { iconUrl } from '../../content/icons';

  let { id, size = 32, alt = '' }: { id: string; size?: number; alt?: string } = $props();
  const src = $derived(iconUrl(id));
</script>

<img class="pixelated" {src} {alt} width={size} height={size} draggable="false" aria-hidden={alt ? undefined : 'true'} />

<style>
  img { display: inline-block; vertical-align: middle; flex: none; }
</style>
