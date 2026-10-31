<script lang="ts">
  // Toast stack (mounted once by App). Polite live region; tap a toast to dismiss it.
  // place: 'top' (centred under the top edge), 'bottom' (centred on the bottom edge) or 'bottom-end' (bottom right,
  // a column about a third of the screen wide, more on short landscape screens). App uses the bottom ones on the
  // campus map, clear of its pins.
  import { toasts } from '../toasts.svelte';
  import Icon from './Icon.svelte';

  let { place = 'top' }: { place?: 'top' | 'bottom' | 'bottom-end' } = $props();
</script>

<div class="toasts {place}" role="status" aria-live="polite" aria-relevant="additions">
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
    /* --vvt: how far iOS has panned the visible area (keyboard), so toasts stay on screen */
    top: calc(var(--vvt, 0px) + var(--safe-top) + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: min(92vw, 460px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }
  /* Over a full-screen sheet (T: the letter, Roll Call, the pager menu…), start under its [< Back] bar (about 62 px,
     64 when the title wraps), so the bar's title and Back button stay visible and tappable. Pet news waits for the
     sheet to close (App); this is for the item / acorn / task toasts a sheet itself sets off. */
  :global(html:has(.modal-root.full)) .toasts.top {
    top: calc(var(--vvt, 0px) + var(--safe-top) + 72px);
  }
  .toasts.bottom, .toasts.bottom-end {
    top: auto;
    bottom: calc(var(--safe-bottom) + 8px);
  }
  .toasts.bottom-end {
    left: auto;
    right: calc(var(--safe-right) + 8px);
    transform: none;
    width: min(340px, 36vw);
    align-items: flex-end;
  }
  /* Landscape phones (the short S layout): as wide as the place list beside the map, so the longest clock notice (the
     Hydration Timer one) wraps to three lines instead of four to six, and stays clear of Go on the short screens too
     (iPhone SE landscape, 667 × 325). */
  @media (max-height: 499px) {
    .toasts.bottom-end { width: min(340px, 56vw); }
  }
  /* On the map the stack sits over the place card and list: let taps reach Go / Enter (the toasts time out anyway). */
  .toasts.bottom .toast, .toasts.bottom-end .toast { pointer-events: none; }
  /* ...and only the newest one shows there: a single toast stays below Go (the longest notice is three lines, about 73
     px, on portrait screens 344 px wide and up and landscape ones from 568 px, four on narrower ones) and covers only
     the bottom row or two of the list. An older one shows again if the newest goes first. */
  .toasts.bottom .toast:not(:last-child), .toasts.bottom-end .toast:not(:last-child) { display: none; }
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
  .bottom .toast, .bottom-end .toast { animation-name: toast-up; }
  .toast.k-good { border-color: var(--ok); }
  .toast.k-warn { border-color: var(--warn); }
  .toast.k-bond { border-color: var(--sakura-2); }
  .toast.k-money { border-color: var(--gold); }
  @keyframes toast-in {
    from { transform: translateY(-12px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
  @keyframes toast-up {
    from { transform: translateY(12px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
  :global(html.reduce-motion) .toast { animation: none; }
</style>
