<script lang="ts">
  // PC-98 window (W/S) / full-screen sheet with a [< Back] bar (T). `kind="sheet"` is a bottom sheet on
  // phones (item pickers). Esc closes the topmost modal; focus is trapped inside and restored on close.
  import { onMount, type Snippet } from 'svelte';
  import { viewport } from '../viewport.svelte';
  import { pushEscape } from '../ui.svelte';
  import { audio } from '../../audio';
  import Icon from './Icon.svelte';

  interface Props {
    title: string;
    onclose?: () => void;
    kind?: 'window' | 'sheet';
    size?: 'sm' | 'md' | 'lg';
    /** Cream letter paper instead of the dark window. */
    paper?: boolean;
    /** Esc / backdrop / close button allowed (default true). */
    dismissible?: boolean;
    /** Title icon id. */
    icon?: string;
    children: Snippet;
    footer?: Snippet;
  }

  let { title, onclose, kind = 'window', size = 'md', paper = false, dismissible = true, icon, children, footer }: Props = $props();

  let panel = $state<HTMLElement | null>(null);
  const uid = `m${Math.random().toString(36).slice(2, 8)}`;
  const full = $derived(viewport.mode === 't' && kind === 'window');
  const bottom = $derived(viewport.mode === 't' && kind === 'sheet');

  function close() {
    if (!dismissible) return;
    audio.sfx('ui_close');
    onclose?.();
  }

  function focusables(): HTMLElement[] {
    if (!panel) return [];
    return [...panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const els = focusables();
    if (!els.length) { e.preventDefault(); panel?.focus(); return; }
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  onMount(() => {
    const prev = document.activeElement as HTMLElement | null;
    audio.sfx('ui_open');
    const pop = dismissible ? pushEscape(() => onclose?.()) : pushEscape(() => {});
    queueMicrotask(() => {
      const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? panel;
      target?.focus({ preventScroll: true });
    });
    return () => {
      pop();
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  });
</script>

<div class="modal-root" class:full class:bottom>
  <button type="button" class="backdrop" tabindex="-1" aria-label="Close" onclick={close}></button>
  <div
    bind:this={panel}
    class="panel px-panel size-{size}"
    class:dark={!paper}
    class:paper
    role="dialog"
    aria-modal="true"
    aria-labelledby="{uid}-t"
    tabindex="-1"
    {onkeydown}
  >
    <header class="bar">
      {#if full && dismissible}
        <button type="button" class="px-btn ghost small back" onclick={close} aria-label="Back">
          <Icon id="back" size={20} /> Back
        </button>
      {/if}
      <h2 id="{uid}-t" class="px-title">
        {#if icon}<Icon id={icon} size={24} />{/if}
        {title}
      </h2>
      {#if !full && dismissible}
        <button type="button" class="px-btn ghost small x" onclick={close} aria-label="Close"><Icon id="close" size={18} /></button>
      {/if}
    </header>
    <div class="body px-scroll">
      {@render children()}
    </div>
    {#if footer}
      <footer class="foot">{@render footer()}</footer>
    {/if}
  </div>
</div>

<style>
  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: calc(var(--safe-top) + 12px) calc(var(--safe-right) + 12px) calc(var(--safe-bottom) + 12px) calc(var(--safe-left) + 12px);
  }
  .backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: rgba(12, 6, 26, 0.62);
    cursor: default;
  }
  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 100%;
    outline: none;
    animation: panel-open 120ms steps(4) both;
  }
  .size-sm { max-width: 420px; }
  .size-md { max-width: 600px; }
  .size-lg { max-width: 860px; }
  .panel.dark::before {
    /* 2x2 dither band along the top edge (PC-98 window chrome) */
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 4px;
    background: repeating-conic-gradient(rgba(255, 214, 224, 0.35) 0 25%, transparent 0 50%) 0 0 / 4px 4px;
    pointer-events: none;
  }
  .panel.paper {
    --panel-bg: #f7ead2;
    --panel-hi: #fffaf0;
    --panel-lo: #e2cfae;
    background-image: repeating-linear-gradient(180deg, transparent 0 27px, rgba(160, 120, 80, 0.18) 27px 28px);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 6px 14px;
    border-bottom: var(--px) solid currentColor;
    border-bottom-color: color-mix(in srgb, currentColor 25%, transparent);
  }
  h2 {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 20px;
    line-height: 1.2;
  }
  .x { min-width: 44px; min-height: 44px; padding: 0; }
  .back { min-height: 44px; }
  .foot :global(.px-btn) { min-height: 44px; }
  .body {
    flex: 1;
    min-height: 0;
    padding: 12px 14px;
    overscroll-behavior: contain;
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 14px 12px;
  }

  /* T: full-screen sheet / bottom sheet */
  .full { padding: 0; }
  .full .panel {
    max-width: none;
    height: 100%;
    max-height: none;
    padding-top: var(--safe-top);
    padding-bottom: var(--safe-bottom);
  }
  .bottom { place-items: end stretch; padding: 0; }
  .bottom .panel {
    max-width: none;
    max-height: 82%;
    padding-bottom: var(--safe-bottom);
    animation-name: sheet-open;
  }

  @keyframes panel-open {
    from { transform: scaleY(0.12); }
    to { transform: none; }
  }
  @keyframes sheet-open {
    from { transform: translateY(40%); }
    to { transform: none; }
  }
  :global(html.reduce-motion) .panel { animation: none; }
</style>
