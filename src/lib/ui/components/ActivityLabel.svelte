<script lang="ts">
  import { ACTIVITY_KINDS, type ActivityKind } from '../location/activities';
  import Icon from './Icon.svelte';

  let { kind, icon = true }: { kind: ActivityKind; icon?: boolean } = $props();
  const activity = $derived(ACTIVITY_KINDS[kind]);
</script>

<span class="activity-label {kind}">
  {#if icon}<Icon id={activity.icon} size={14} />{/if}
  {activity.label}
</span>

<style>
  .activity-label { display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-display); font-size: 12px; line-height: 16px; letter-spacing: 0.03em; color: var(--sakura-2); white-space: nowrap; }
  .minigame { color: var(--gold); }
  .shop { color: var(--sakura-1); }
</style>
