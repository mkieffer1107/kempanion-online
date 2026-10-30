<script lang="ts">
  // Backlog of the last 200 lines (role="log"): speaker names in their colours, picked choices marked ▶.
  // Esc / L / Close / tapping outside closes it.
  import { onMount, tick } from 'svelte';
  import { dialogue } from '../dialogue.svelte';

  let { onclose }: { onclose?: () => void } = $props();

  let list: HTMLOListElement | undefined = $state();
  let closeBtn: HTMLButtonElement | undefined = $state();

  function close() {
    if (onclose) onclose();
    else dialogue.closeBacklog();
  }

  onMount(() => {
    const before = document.activeElement as HTMLElement | null;
    void tick().then(() => {
      if (list) list.scrollTop = list.scrollHeight;
      closeBtn?.focus({ preventScroll: true });
    });
    // Capture phase so screens underneath (pager menu on Esc, …) don't also react.
    const onkey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    };
    addEventListener('keydown', onkey, true);
    return () => {
      removeEventListener('keydown', onkey, true);
      before?.focus?.({ preventScroll: true });
    };
  });
</script>

<div class="backdrop" role="presentation" onclick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) close(); }}>
  <div class="sheet px-panel dark" role="dialog" aria-modal="true" aria-labelledby="vn-backlog-title">
    <header>
      <h2 id="vn-backlog-title" class="px-title">LOG <span class="jp" aria-hidden="true">バックログ</span></h2>
      <button bind:this={closeBtn} type="button" class="px-btn ghost" onclick={close}>✕ Close</button>
    </header>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (a scrollable log must be reachable by keyboard) -->
    <ol class="lines px-scroll" role="log" aria-label="Dialogue history" bind:this={list} tabindex="0">
      {#each dialogue.log as line, i (i)}
        <li class:choice={line.kind === 'choice'} class:narration={line.speaker === 'narrator'}>
          {#if line.name}
            <span class="who" style:color={line.color}>{line.kind === 'choice' ? `▶ ${line.name}` : line.name}</span>
          {/if}
          <span class="what">{line.text}</span>
        </li>
      {:else}
        <li class="empty">Nothing yet.</li>
      {/each}
    </ol>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: grid;
    place-items: center;
    padding: max(12px, var(--safe-top)) max(12px, var(--safe-right)) max(12px, var(--safe-bottom)) max(12px, var(--safe-left));
    background: rgba(16, 10, 36, 0.62);
    animation: dim 120ms steps(3) both;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    width: min(100%, 52rem);
    height: min(100%, 44rem);
    padding: calc(var(--px) * 3);
    animation: open 120ms steps(4) both;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 6px 10px;
    border-bottom: var(--px) solid rgba(255, 214, 224, 0.35);
  }
  h2 { margin: 0; font-size: 20px; color: var(--sakura-2); }
  h2 .jp { font-size: 12px; color: var(--paper-2); margin-left: 0.5em; }
  .lines {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 8px 6px;
    list-style: none;
    overscroll-behavior: contain;
    outline: none;
  }
  .lines:focus-visible { outline: var(--px) dashed var(--gold); }
  li {
    display: grid;
    grid-template-columns: minmax(5.5em, max-content) 1fr;
    gap: 0.2em 0.8em;
    padding: 6px 2px;
    font-size: 16px;
    line-height: 1.45;
    border-bottom: 1px dashed rgba(255, 214, 224, 0.15);
  }
  .who { font-family: var(--font-display); font-weight: 700; letter-spacing: 0.04em; text-shadow: 1px 1px 0 #000; }
  .what { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--box-text); }
  li.narration .what { grid-column: 1 / -1; color: #e4dcff; }
  li.choice .what { color: var(--sakura-1); }
  li.empty { display: block; color: var(--paper-2); }
  @media (max-width: 520px) {
    li { grid-template-columns: 1fr; gap: 0; }
  }
  @keyframes dim { from { opacity: 0; } }
  @keyframes open { from { transform: scaleY(0.25); } }
  @media (prefers-reduced-motion: reduce) {
    .backdrop, .sheet { animation: none; }
  }
  :global(.reduce-motion) .backdrop, :global(.reduce-motion) .sheet { animation: none; }
</style>
