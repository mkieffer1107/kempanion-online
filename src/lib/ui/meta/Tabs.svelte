<script lang="ts" generics="T extends string">
  // Pixel tab bar (role=tablist). ←/→/Home/End move between tabs while one has focus.
  import { ui } from './sfx';

  interface Tab { id: T; label: string; jp?: string; count?: string; disabled?: boolean; color?: string }

  let {
    tabs,
    value = $bindable(),
    label,
    onchange,
    compact = false,
  }: { tabs: Tab[]; value: T; label: string; onchange?: (id: T) => void; compact?: boolean } = $props();

  let buttons: HTMLButtonElement[] = $state([]);

  function select(id: T) {
    if (id === value) return;
    ui.move();
    value = id;
    onchange?.(id);
  }

  function onkeydown(e: KeyboardEvent, i: number) {
    const enabled = tabs.map((t, j) => (t.disabled ? -1 : j)).filter((j) => j >= 0);
    if (!enabled.length) return;
    const pos = enabled.indexOf(i);
    let next = -1;
    if (e.key === 'ArrowRight') next = enabled[(pos + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    select(tabs[next].id);
    buttons[next]?.focus();
  }
</script>

<div class="tabs" class:compact role="tablist" aria-label={label}>
  {#each tabs as t, i (t.id)}
    <button
      bind:this={buttons[i]}
      type="button"
      role="tab"
      class="tab"
      class:on={t.id === value}
      style:--tab-color={t.color}
      aria-selected={t.id === value}
      tabindex={t.id === value ? 0 : -1}
      disabled={t.disabled}
      onclick={() => select(t.id)}
      onkeydown={(e) => onkeydown(e, i)}
    >
      <span class="label">{t.label}</span>
      {#if t.count}<span class="count">{t.count}</span>{/if}
      {#if t.jp}<span class="km-jp jp" aria-hidden="true">{t.jp}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: calc(var(--px) * 2);
    flex: none;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    min-width: 72px;
    padding: 4px 14px;
    flex: 1 0 auto;
    color: var(--paper);
    background: rgba(255, 255, 255, 0.06);
    border: var(--px) solid rgba(255, 214, 224, 0.4);
    border-bottom-width: calc(var(--px) * 2);
    font-family: var(--font-display);
    font-size: 17px;
    letter-spacing: 0.06em;
    cursor: pointer;
    line-height: 1.05;
  }
  /* Not on the picked tab (it outranked .on and left dark ink on a dark tile), and only for a real mouse:
     touch browsers keep :hover on the last tapped tab. */
  @media (hover: hover) {
    .tab:not(.on):hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
  }
  .tab.on {
    color: var(--ink);
    background: var(--tab-color, var(--sakura-1));
    border-color: var(--ink);
    border-bottom-color: var(--sakura-4);
  }
  .tab.on::before {
    content: '';
    position: absolute;
    left: 50%;
    top: calc(var(--px) * -1);
    width: calc(var(--px) * 4);
    height: calc(var(--px) * 2);
    transform: translateX(-50%);
    background: var(--sakura-4);
  }
  .tab:disabled { opacity: 0.4; cursor: default; }
  .tab:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: calc(var(--px) * -3); }
  .count { font-size: 12px; opacity: 0.8; }
  .jp { font-size: 11px; opacity: 0.75; }
  .compact .tab { min-width: 56px; padding: 2px 8px; font-size: 15px; }
  .compact .jp { display: none; }
</style>
