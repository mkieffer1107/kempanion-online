<script lang="ts">
  // LOG · AUTO · HIDE (+ an optional MENU snippet). DialogueBox shows it as a strip above the box;
  // layouts with side rails (S) can render it themselves with `vertical`.
  import type { Snippet } from 'svelte';
  import { dialogue } from '../dialogue.svelte';

  let { vertical = false, menu, class: klass = '' }: { vertical?: boolean; menu?: Snippet; class?: string } = $props();

  function act(e: MouseEvent, fn: () => void) {
    e.stopPropagation();
    fn();
  }
</script>

<div class="ctl {klass}" class:vertical role="toolbar" aria-label="Dialogue controls" aria-orientation={vertical ? 'vertical' : 'horizontal'}>
  <button type="button" class="px-btn ghost" title="Backlog (L)" disabled={!dialogue.log.length}
    onclick={(e) => act(e, () => dialogue.openBacklog())}>LOG</button>
  <button type="button" class="px-btn ghost" title="Auto-advance (A)" aria-pressed={dialogue.auto}
    onclick={(e) => act(e, () => dialogue.toggleAuto())}>AUTO</button>
  <button type="button" class="px-btn ghost" title="Hide the text box (H)" disabled={!dialogue.visible}
    onclick={(e) => act(e, () => dialogue.toggleHidden())}>HIDE</button>
  {@render menu?.()}
</div>

<style>
  .ctl {
    display: flex;
    gap: calc(var(--px) * 2);
    pointer-events: auto;
    font-family: var(--font-display);
    letter-spacing: 0.06em;
  }
  .ctl.vertical { flex-direction: column; }
  .ctl :global(.px-btn) {
    min-height: 32px;
    min-width: 0;
    padding: 0.15em 0.55em;
    font-size: max(12px, 0.62em);
  }
  .ctl :global(.px-btn[aria-pressed='true']) {
    --btn-bg: var(--sakura-2);
    --btn-ink: var(--ink);
    --btn-hi: var(--sakura-1);
    --btn-lo: var(--sakura-4);
  }
  .ctl :global(.px-btn[aria-pressed='true'])::before { content: '▶'; font-size: 0.8em; }
  @media (pointer: coarse) {
    .ctl :global(.px-btn) { min-height: 44px; min-width: 44px; }
    /* Smaller faces reveal more of the portrait; transparent extensions retain 44px tap targets.
       The 6px gaps keep adjacent targets separate, and the strip's bottom margin clears the text box. */
    :global(.mode-t) .ctl:not(.vertical) { gap: 6px; }
    :global(.mode-t) .ctl:not(.vertical) :global(.px-btn) {
      position: relative;
      min-height: 36px;
      min-width: 38px;
      padding-inline: 0.35em;
    }
    :global(.mode-t) .ctl:not(.vertical) :global(.px-btn)::after {
      content: '';
      position: absolute;
      /* Absolute insets start inside the button border, so include it in the extension. */
      inset: calc(-4px - var(--px)) calc(-3px - var(--px));
    }
  }
</style>
