<script lang="ts">
  // Toast stack (mounted once by App). Polite live region; tap a toast to dismiss it.
  import { toasts } from '../toasts.svelte';
  import Icon from './Icon.svelte';
</script>

<div class="toasts" role="status" aria-live="polite" aria-relevant="additions">
  {#each toasts.list as t (t.id)}
    <button type="button" class="toast px-panel dark k-{t.kind}" onclick={() => toasts.dismiss(t.id)}>
      {#if t.icon}<Icon id={t.icon} size={24} />{/if}
      <span>{t.text}</span>
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    z-index: 80;
    top: calc(var(--safe-top) + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: min(92vw, 460px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    max-width: 100%;
    padding: 6px 12px;
    font: inherit;
    font-size: 15px;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
    animation: toast-in 160ms steps(4) both;
  }
  .toast.k-good { border-color: var(--ok); }
  .toast.k-warn { border-color: var(--warn); }
  .toast.k-bond { border-color: var(--sakura-2); }
  .toast.k-money { border-color: var(--gold); }
  @keyframes toast-in {
    from { transform: translateY(-12px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
  :global(html.reduce-motion) .toast { animation: none; }
</style>
