<script lang="ts">
  // Modal PC-98 confirm window with two equal-size buttons. Default focus is the safe choice.
  // Keys (capture phase): ←/→ switch, Enter/Space choose, Esc cancels.
  import type { Snippet } from 'svelte';
  import './meta.css';
  import { ui } from './sfx';

  let {
    title,
    message = '',
    confirmLabel = 'Yes',
    cancelLabel = 'No',
    onConfirm,
    onCancel,
    children,
  }: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    children?: Snippet;
  } = $props();

  let buttons: HTMLButtonElement[] = $state([]);
  let focused = $state(0); // 0 = cancel, 1 = confirm
  const uid = Math.random().toString(36).slice(2, 8);

  let done = false;
  function choose(i: number) {
    if (done) return;
    done = true;
    if (i === 1) {
      ui.select();
      onConfirm();
    } else {
      ui.back();
      onCancel();
    }
  }

  $effect(() => {
    const prev = document.activeElement as HTMLElement | null;
    queueMicrotask(() => buttons[0]?.focus());
    const h = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Tab') {
        e.preventDefault();
        focused = focused === 0 ? 1 : 0;
        ui.move();
        buttons[focused]?.focus();
      } else if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') {
        e.preventDefault();
        if (!e.repeat) choose(focused);
      } else if (k === 'Escape' || k === 'x' || k === 'X') {
        e.preventDefault();
        choose(0);
      } else return;
      e.stopImmediatePropagation();
    };
    addEventListener('keydown', h, true);
    return () => {
      removeEventListener('keydown', h, true);
      prev?.focus?.();
    };
  });
</script>

<div class="km-scrim" role="presentation">
  <div
    class="km-window dialog km-pop-in"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="cd-title-{uid}"
    aria-describedby="cd-msg-{uid}"
  >
    <h2 id="cd-title-{uid}" class="km-title title">{title}</h2>
    {#if message}<p id="cd-msg-{uid}" class="msg">{message}</p>{/if}
    {@render children?.()}
    <div class="buttons">
      <button bind:this={buttons[0]} class="px-btn ghost" onfocus={() => (focused = 0)} onclick={() => choose(0)}>{cancelLabel}</button>
      <button bind:this={buttons[1]} class="px-btn primary" onfocus={() => (focused = 1)} onclick={() => choose(1)}>{confirmLabel}</button>
    </div>
  </div>
</div>

<style>
  .dialog {
    width: min(520px, 100%);
    padding: 22px 22px 18px;
    gap: 12px;
  }
  .title {
    margin: 0;
    font-size: 24px;
    color: var(--sakura-1);
  }
  .msg {
    margin: 0;
    font-size: 16px;
    line-height: 1.55;
  }
  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 6px;
  }
  .buttons .px-btn { width: 100%; min-height: 48px; font-size: 17px; }
</style>
