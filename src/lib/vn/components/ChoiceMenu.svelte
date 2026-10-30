<script lang="ts">
  // Numbered choices (1–4), stepped slide-in, ↑↓ / Enter / 1–4. Never timed.
  // Defaults to the dialogue controller's open menu; pass `options` + `onpick` to use it standalone.
  import { onMount } from 'svelte';
  import { audio } from '../../audio';
  import { game } from '../../state/game.svelte';
  import { dialogue } from '../dialogue.svelte';

  let {
    options,
    onpick,
    keyboard = true,
    label = 'Choose a reply',
  }: {
    options?: string[];
    onpick?: (index: number) => void;
    /** Handle ↑↓ / Enter / 1–9 on the window while mounted. */
    keyboard?: boolean;
    label?: string;
  } = $props();

  const list = $derived(options ?? dialogue.choices ?? []);
  const reduce = $derived(game.save.settings.reduceMotion);
  let focus = $state(0);
  let menu: HTMLDivElement | undefined = $state();
  let buttons: HTMLButtonElement[] = $state([]);
  // A tap that advanced the previous line must not land on an option that just appeared under the finger.
  let armedAt = Infinity;

  onMount(() => {
    armedAt = performance.now() + 280;
    menu?.focus({ preventScroll: true });
  });

  function pick(i: number) {
    if (performance.now() < armedAt || i < 0 || i >= list.length) return;
    if (onpick) onpick(i);
    else dialogue.pick(i);
  }

  function move(d: number) {
    if (!list.length) return;
    focus = (focus + d + list.length) % list.length;
    buttons[focus]?.focus({ preventScroll: true });
    audio.sfx('ui_move');
  }

  function onkeydown(e: KeyboardEvent) {
    if (!keyboard || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || dialogue.backlogOpen) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (/^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < list.length) {
        e.preventDefault();
        if (!e.repeat) pick(i);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': case 'ArrowRight':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp': case 'ArrowLeft':
        e.preventDefault();
        move(-1);
        break;
      case 'Enter': case ' ': case 'z': case 'Z': case 'x': case 'X':
        e.preventDefault();
        if (!e.repeat) pick(focus);
        break;
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="menu" class:rm={reduce} role="menu" tabindex="-1" aria-label={label} bind:this={menu}>
  {#each list as text, i (i)}
    <button
      bind:this={buttons[i]}
      type="button"
      role="menuitem"
      class="opt"
      class:sel={i === focus}
      style:--i={i}
      onclick={(e) => { e.stopPropagation(); pick(i); }}
      onpointerenter={() => (focus = i)}
      onfocus={() => (focus = i)}
    >
      <span class="num" aria-hidden="true">{i + 1}</span>
      <span class="cur" aria-hidden="true">▶</span>
      <span class="label">{text}</span>
    </button>
  {/each}
</div>

<style>
  .menu {
    display: flex;
    flex-direction: column;
    gap: calc(var(--px) * 2);
    width: min(100%, 30em);
    outline: none;
    font-family: var(--font-body);
  }
  .opt {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 0.5em;
    width: 100%;
    min-height: 44px;
    padding: 0.35em 0.8em;
    text-align: left;
    line-height: 1.3;
    color: var(--box-text);
    background: var(--box-bg);
    border: var(--px) solid var(--box-edge);
    outline: var(--px) solid var(--ink);
    box-shadow: 0 0 0 calc(var(--px) * 2) rgba(0, 0, 0, 0.35);
    text-shadow: 1px 1px 0 #000;
    cursor: pointer;
    animation: slide-in 180ms steps(3) both;
    animation-delay: calc(var(--i) * 60ms);
  }
  .opt.sel {
    background: var(--sakura-2);
    color: var(--ink);
    text-shadow: none;
    border-color: var(--ink);
    outline-color: var(--box-edge);
  }
  .opt:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  .num {
    flex: none;
    min-width: 1.4em;
    padding: 0 0.2em;
    text-align: center;
    font-family: var(--font-display);
    font-size: 0.8em;
    color: var(--ink);
    background: var(--box-edge);
    text-shadow: none;
  }
  .cur { flex: none; width: 0.8em; font-size: 0.8em; visibility: hidden; }
  .opt.sel .cur { visibility: visible; animation: nudge 333ms steps(2) infinite; }
  .label { flex: 1; overflow-wrap: anywhere; }

  @keyframes slide-in {
    from { opacity: 0; transform: translateX(1.2em); }
    to { opacity: 1; transform: none; }
  }
  @keyframes nudge { 50% { transform: translateX(calc(var(--px) * 1)); } }

  .rm .opt, .rm .opt.sel .cur { animation: none; }
  @media (prefers-reduced-motion: reduce) {
    .opt, .opt.sel .cur { animation: none; }
  }
</style>
