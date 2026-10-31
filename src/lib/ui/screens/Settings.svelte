<script lang="ts">
  // Settings (design-ux §4.12): TEXT · SOUND · DISPLAY · BRAIN · ACCESS · DATA. Changes apply instantly.
  // Extras that the Settings type doesn't cover live in save.flags (ui.textSize, ui.petals, ui.highContrast,
  // ui.muteHidden, ui.skipReadOnly, and pet.gentle, read by the pet sim): list new ones in SETTINGS_FLAGS so a new
  // game keeps them and Restore defaults resets them.
  import { onMount, tick, untrack } from 'svelte';
  import type { PigId, SaveData } from '../../types';
  import { game } from '../../state/game.svelte';
  import { clearSettingsFlags } from '../../state/settings-flags';
  import { audio } from '../../audio';
  import { localDate } from '../../time';
  import { now } from '../../state/clock';
  import { defaultSettings } from '../../pet';
  import ModelPanel from '../../ai/ModelPanel.svelte';
  import { ui, type PetalPref, type TextSize } from '../ui.svelte';
  import { viewport } from '../viewport.svelte';
  import { toast } from '../toasts.svelte';
  import Icon from '../components/Icon.svelte';

  type Tab = 'text' | 'sound' | 'display' | 'brain' | 'access' | 'data';
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'text', label: 'TEXT', icon: 'log' },
    { id: 'sound', label: 'SOUND', icon: 'music' },
    { id: 'display', label: 'DISPLAY', icon: 'sparkle' },
    { id: 'brain', label: 'BRAIN', icon: 'brain_big' },
    { id: 'access', label: 'ACCESS', icon: 'heart' },
    { id: 'data', label: 'DATA', icon: 'book' },
  ];

  const s = $derived(game.save.settings);
  let tab = $state<Tab>((game.params as { tab?: Tab }).tab ?? 'text');
  let tabEls = $state<HTMLButtonElement[]>([]);
  let panel = $state<HTMLDivElement | null>(null);

  // Every tab shares the one panel scroller: start each tab at its top, not at the last tab's offset.
  $effect(() => {
    void tab;
    if (panel) panel.scrollTop = 0;
  });

  function save() {
    game.persist();
  }

  function setFlag(key: string, value: string | boolean) {
    game.save.flags[key] = value;
    save();
  }

  function pickTab(t: Tab, focus = false) {
    if (t === tab) return;
    audio.sfx('ui_move');
    tab = t;
    if (focus) tabEls[TABS.findIndex((x) => x.id === t)]?.focus();
  }

  function tabKey(e: KeyboardEvent) {
    const i = TABS.findIndex((x) => x.id === tab);
    if (e.key === 'ArrowRight') { e.preventDefault(); pickTab(TABS[(i + 1) % TABS.length].id, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); pickTab(TABS[(i + TABS.length - 1) % TABS.length].id, true); }
  }

  // On phones the tab strip is wider than the screen and scrolls sideways with no scrollbar: show a ◀/▶ cue over
  // a fade at each edge that has more tabs past it, and keep the picked tab scrolled into view.
  let strip = $state<HTMLDivElement | null>(null);
  let moreL = $state(false);
  let moreR = $state(false);

  function edges() {
    if (!strip) return;
    moreL = strip.scrollLeft > 1;
    moreR = strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 1;
  }

  $effect(() => {
    if (!strip || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(edges);
    ro.observe(strip);
    for (const el of tabEls) if (el) ro.observe(el); // web fonts widen the tabs after the first layout
    return () => ro.disconnect();
  });

  let stripReady = false;
  $effect(() => {
    const el = tabEls[TABS.findIndex((x) => x.id === tab)];
    const s = strip;
    if (!el || !s) return;
    const room = 40; // clear of the 36 px edge cue
    const left = el.getBoundingClientRect().left - s.getBoundingClientRect().left + s.scrollLeft;
    let to = s.scrollLeft;
    if (left - room < to) to = left - room;
    else if (left + el.offsetWidth + room > to + s.clientWidth) to = left + el.offsetWidth + room - s.clientWidth;
    to = Math.max(0, Math.min(to, s.scrollWidth - s.clientWidth));
    if (Math.abs(to - s.scrollLeft) > 1) s.scrollTo({ left: to, behavior: stripReady && !ui.reduceMotion ? 'smooth' : 'auto' });
    stripReady = true;
  });

  function close() {
    audio.sfx('ui_back');
    game.flush();
    game.back(game.save.companion ? 'hub' : 'title');
  }

  // ── TEXT ──
  const SPEEDS: { label: string; cps: number }[] = [
    { label: 'Slow', cps: 20 }, { label: 'Normal', cps: 40 }, { label: 'Fast', cps: 70 }, { label: 'Instant', cps: 0 },
  ];
  const PREVIEW = 'Ball’s up! …Okay, that’s just my stomach. Let’s go!';
  let shown = $state(PREVIEW.length);
  let previewTimer: ReturnType<typeof setInterval> | undefined;

  function setSpeed(cps: number) {
    game.save.settings.textSpeed = cps;
    save();
    audio.sfx('ui_toggle');
    clearInterval(previewTimer);
    if (cps <= 0) { shown = PREVIEW.length; return; }
    shown = 0;
    previewTimer = setInterval(() => {
      shown++;
      if (shown % 2 === 0) audio.blip('piggy-1');
      if (shown >= PREVIEW.length) clearInterval(previewTimer);
    }, 1000 / cps);
  }

  // The preview next to the S/M/L/XL buttons shows the new size: where the tab scrolls (phones), keep it in view, and the
  // buttons too (a bigger preview can push them past the edge). On a short screen both don't fit: the preview is
  // scrolled to last, so it wins and the buttons show as far as they can. No smooth scroll: a tab picked while one
  // was still running would open part-way down. A line still typing out (Text speed) is finished first: it would grow
  // after the scroll below and end up past the edge.
  async function setTextSize(ts: TextSize) {
    const was = tab;
    clearInterval(previewTimer);
    shown = PREVIEW.length;
    setFlag('ui.textSize', ts);
    audio.sfx('ui_toggle');
    await tick();
    if (tab !== was) return; // already on another tab: nothing here to show
    for (const sel of ['.seg[aria-label="Text size"]', '.preview']) panel?.querySelector(sel)?.scrollIntoView({ block: 'nearest' });
  }

  // ── SOUND ──
  type VolKey = 'masterVolume' | 'bgmVolume' | 'sfxVolume' | 'voiceVolume';
  const VOLS: { key: VolKey; label: string }[] = [
    { key: 'masterVolume', label: 'Master' }, { key: 'bgmVolume', label: 'Music' },
    { key: 'sfxVolume', label: 'Sound effects' }, { key: 'voiceVolume', label: 'Voice blips' },
  ];
  let testTimer: ReturnType<typeof setTimeout> | undefined;

  function setVol(key: VolKey, v: number) {
    game.save.settings[key] = Math.max(0, Math.min(1, v / 100));
    save();
    clearTimeout(testTimer);
    testTimer = setTimeout(() => test(key), 140);
  }

  function test(key: VolKey) {
    if (key === 'bgmVolume') audio.jingle('level_up');
    else if (key === 'voiceVolume') {
      const pigs: PigId[] = ['piggy-1', 'piggy-2', 'piggy-3'];
      pigs.forEach((p, i) => [0, 1, 2].forEach((j) => setTimeout(() => audio.blip(p), i * 260 + j * 70)));
    } else audio.sfx(key === 'sfxVolume' ? 'coin' : 'ui_select');
  }

  // ── DISPLAY ──
  const canFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  let isFull = $state(typeof document !== 'undefined' && !!document.fullscreenElement);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { toast('Fullscreen isn’t available here.', { icon: 'alert', kind: 'warn' }); }
    isFull = !!document.fullscreenElement;
  }

  // ── DATA ──
  let fileEl = $state<HTMLInputElement | null>(null);
  let confirmText = $state('');
  const storageKb = $derived(Math.max(1, Math.round(JSON.stringify(game.save).length / 1024)));

  function exportSave() {
    game.flush();
    const blob = new Blob([JSON.stringify($state.snapshot(game.save), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kempanion-save-${localDate(now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    audio.sfx('ui_select');
    toast('Save exported.', { icon: 'book', kind: 'good' });
  }

  async function importSave(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as SaveData;
      game.importSave(data);
      audio.sfx('success');
      toast('Save imported. Welcome back!', { icon: 'star', kind: 'good' });
    } catch (err) {
      audio.sfx('ui_error');
      toast(err instanceof Error ? err.message : 'That file isn’t a Kempanion save.', { icon: 'alert', kind: 'warn', ms: 4000 });
    }
  }

  function resetAll() {
    if (confirmText.trim().toLowerCase() !== 'oink') return;
    audio.sfx('oink');
    game.wipe();
    toast('Fresh start. The piggies will be thrilled to meet you.', { icon: 'sparkle' });
    game.go('title');
  }

  function restoreDefaults() {
    const d = defaultSettings();
    game.save.settings = { ...d, aiMode: s.aiMode, aiModel: s.aiModel, aiAutoload: s.aiAutoload };
    clearSettingsFlags(game.save.flags);
    save();
    audio.sfx('ui_toggle');
    toast('Defaults restored.', { icon: 'settings' });
  }

  onMount(() => {
    const onFs = () => (isFull = !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      clearInterval(previewTimer);
      clearTimeout(testTimer);
    };
  });

  const textSizes: TextSize[] = ['s', 'm', 'l', 'xl'];
  const petalPrefs: { id: PetalPref; label: string }[] = [{ id: 'lots', label: 'Lots' }, { id: 'some', label: 'Some' }, { id: 'off', label: 'Off' }];
</script>

{#snippet toggle(label: string, on: boolean, flip: () => void, note?: string)}
  <div class="row">
    <span class="lbl">{label}{#if note}<small>{note}</small>{/if}</span>
    <button type="button" class="px-btn small sw" class:primary={on} role="switch" aria-checked={on} aria-label={label}
      onclick={() => { flip(); audio.sfx('ui_toggle'); save(); }}>{on ? 'ON' : 'OFF'}</button>
  </div>
{/snippet}

{#snippet textSize()}
  <div class="row">
    <span class="lbl">Text size</span>
    <div class="seg" role="radiogroup" aria-label="Text size">
      {#each textSizes as ts (ts)}
        <button type="button" class="px-btn small" class:primary={ui.textSize === ts} role="radio" aria-checked={ui.textSize === ts} onclick={() => setTextSize(ts)}>{ts.toUpperCase()}</button>
      {/each}
    </div>
  </div>
{/snippet}

<!-- a line of dialogue as the game shows it: typed at the Text speed, in the Text size, in the high-contrast box -->
{#snippet preview()}
  <p class="preview vn-box" aria-hidden="true"><b style:color="var(--p1)">Piggy 1</b> {PREVIEW.slice(0, shown)}</p>
{/snippet}

<div class="settings mode-{viewport.mode} ts-{ui.textSize}" class:hc={ui.highContrast}>
  <div class="win px-panel dark" role="dialog" aria-labelledby="settings-title">
    <header class="top">
      <button type="button" class="px-btn ghost small" onclick={close} aria-label="Close settings"><Icon id="back" size={18} /> Back</button>
      <h1 id="settings-title" class="px-title"><Icon id="settings" size={24} /> SETTINGS</h1>
    </header>

    <div class="tabbar">
      <div class="tabs" bind:this={strip} onscroll={edges} role="tablist" aria-label="Settings sections" tabindex="-1" onkeydown={tabKey}>
        {#each TABS as t, i (t.id)}
          <button
            bind:this={tabEls[i]}
            type="button"
            role="tab"
            id="tab-{t.id}"
            aria-selected={tab === t.id}
            aria-controls="panel-{t.id}"
            tabindex={tab === t.id ? 0 : -1}
            class="tab"
            class:on={tab === t.id}
            onclick={() => pickTab(t.id)}
          ><Icon id={t.icon} size={18} /><span>{t.label}</span></button>
        {/each}
      </div>
      {#if moreL}<span class="cue l" aria-hidden="true">◀</span>{/if}
      {#if moreR}<span class="cue r" aria-hidden="true">▶</span>{/if}
    </div>

    <div class="panel px-scroll" bind:this={panel} role="tabpanel" id="panel-{tab}" aria-labelledby="tab-{tab}">
      {#if tab === 'text'}
        <div class="row col">
          <span class="lbl">Text speed</span>
          <div class="seg" role="radiogroup" aria-label="Text speed">
            {#each SPEEDS as sp (sp.label)}
              <button type="button" class="px-btn small" class:primary={s.textSpeed === sp.cps} role="radio" aria-checked={s.textSpeed === sp.cps} onclick={() => setSpeed(sp.cps)}>{sp.label}</button>
            {/each}
          </div>
          {@render preview()}
        </div>
        <!-- right under the preview, so a new size shows even where the tab has to scroll -->
        {@render textSize()}
        <div class="row">
          <label class="lbl" for="auto-delay">Auto delay <small>{s.autoDelay.toFixed(1)} s after text finishes</small></label>
          <input id="auto-delay" type="range" min="0.5" max="4" step="0.1" value={s.autoDelay}
            oninput={(e) => { game.save.settings.autoDelay = Number((e.currentTarget as HTMLInputElement).value); save(); }} />
        </div>
        {@render toggle('Echo my lines', s.echoPlayer, () => (game.save.settings.echoPlayer = !s.echoPlayer), 'Show what you typed before the reply')}
        {@render toggle('Skip only text I’ve read', game.save.flags['ui.skipReadOnly'] === true, () => (game.save.flags['ui.skipReadOnly'] = game.save.flags['ui.skipReadOnly'] !== true), 'Off: SKIP fast-forwards everything up to the next choice')}
      {:else if tab === 'sound'}
        {#each VOLS as v (v.key)}
          <div class="row vrow">
            <label class="lbl" for="vol-{v.key}">{v.label} <small>{Math.round(s[v.key] * 100)}</small></label>
            <div class="vol">
              <input id="vol-{v.key}" type="range" min="0" max="100" step="5" value={Math.round(s[v.key] * 100)}
                oninput={(e) => setVol(v.key, Number((e.currentTarget as HTMLInputElement).value))} />
              <button type="button" class="px-btn small ghost" onclick={() => test(v.key)} aria-label="Test {v.label}"><Icon id="music" size={16} /></button>
            </div>
          </div>
        {/each}
        {@render toggle('Mute when the tab is hidden', game.save.flags['ui.muteHidden'] !== false, () => (game.save.flags['ui.muteHidden'] = game.save.flags['ui.muteHidden'] === false))}
      {:else if tab === 'display'}
        {@render toggle('CRT scanlines', s.crt, () => (game.save.settings.crt = !s.crt), 'A soft scanline filter over the stage')}
        <div class="row">
          <span class="lbl">Sakura petals</span>
          <div class="seg" role="radiogroup" aria-label="Sakura petals">
            {#each petalPrefs as pp (pp.id)}
              <button type="button" class="px-btn small" class:primary={ui.petals === pp.id} role="radio" aria-checked={ui.petals === pp.id} onclick={() => { setFlag('ui.petals', pp.id); audio.sfx('ui_toggle'); }}>{pp.label}</button>
            {/each}
          </div>
        </div>
        <!-- The piggies' thought clouds (pet/thoughts.ts thoughtPref; unset = Some). Off removes thoughts only. -->
        {@const thoughts = game.save.flags['ui.thoughts'] === 'lots' || game.save.flags['ui.thoughts'] === 'off' ? game.save.flags['ui.thoughts'] : 'some'}
        <div class="row">
          <span class="lbl">Thought bubbles<small>Little clouds when the piggies are thinking. Wants still show.</small></span>
          <div class="seg" role="radiogroup" aria-label="Thought bubbles">
            {#each petalPrefs as tp (tp.id)}
              <button type="button" class="px-btn small" class:primary={thoughts === tp.id} role="radio" aria-checked={thoughts === tp.id} onclick={() => { setFlag('ui.thoughts', tp.id); audio.sfx('ui_toggle'); }}>{tp.label}</button>
            {/each}
          </div>
        </div>
        {#if canFullscreen}
          <div class="row">
            <span class="lbl">Fullscreen</span>
            <button type="button" class="px-btn small" onclick={toggleFullscreen}>{isFull ? 'Exit fullscreen' : 'Go fullscreen'}</button>
          </div>
        {/if}
        <p class="hint">Layout: {viewport.mode === 'w' ? 'Wide (letterboxed stage)' : viewport.mode === 't' ? 'Tall (KempaPager)' : 'Short (side rails)'} — rotate or resize to switch.</p>
      {:else if tab === 'brain'}
        <p class="hint brain-state">Big Brain is optional. Download or load it below, switch brains, or unload it anytime.
          The brain shortcut stays at the top of Home and Talk, even when Big Brain is off.</p>
        <ModelPanel />
      {:else if tab === 'access'}
        {@render toggle('Reduce motion', s.reduceMotion, () => (game.save.settings.reduceMotion = !s.reduceMotion), ui.systemReduce ? 'Your system already asks for reduced motion' : 'Petals off, no shakes, crossfades instead of wipes')}
        {@render toggle('High-contrast text box', ui.highContrast, () => (game.save.flags['ui.highContrast'] = !ui.highContrast))}
        {@render toggle('Gentle mode', game.save.flags['pet.gentle'] === true, () => (game.save.flags['pet.gentle'] = game.save.flags['pet.gentle'] !== true), 'No sickness, and needs stay frozen while you’re away')}
        {@render textSize()}
        {@render preview()}
        <p class="hint">Everything works with a keyboard: press <kbd>?</kbd> in the game for the shortcut list. Choices are never timed.</p>
      {:else if tab === 'data'}
        <div class="row">
          <span class="lbl">Export save <small>A .json file you can keep or move to another device ({storageKb} KB)</small></span>
          <button type="button" class="px-btn small" onclick={exportSave}><Icon id="book" size={16} /> Export</button>
        </div>
        <div class="row">
          <span class="lbl">Import save <small>Replaces the current save</small></span>
          <button type="button" class="px-btn small" onclick={() => fileEl?.click()}><Icon id="bag" size={16} /> Import…</button>
          <input bind:this={fileEl} type="file" accept=".json,application/json" class="visually-hidden" tabindex="-1" onchange={importSave} />
        </div>
        <div class="row col danger">
          <label class="lbl" for="oink">Reset everything <small>Type <b>oink</b> to confirm. This can’t be undone.</small></label>
          <div class="vol">
            <input id="oink" class="field" type="text" autocomplete="off" spellcheck="false" bind:value={confirmText} placeholder="oink" />
            <button type="button" class="px-btn small orange" disabled={confirmText.trim().toLowerCase() !== 'oink'} onclick={resetAll}>Reset</button>
          </div>
        </div>
      {/if}
    </div>

    <footer class="foot">
      <button type="button" class="px-btn small ghost" onclick={restoreDefaults}>Restore defaults</button>
      <span class="hint">Changes apply instantly.</span>
    </footer>
  </div>
</div>

<style>
  .settings {
    position: absolute;
    inset: 0;
    display: grid;
    /* explicit tracks: otherwise the window sizes to its unwrapped tab strip (~650px) and spills off phones */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    place-items: center;
    padding: calc(var(--safe-top) + 12px) calc(var(--safe-right) + 12px) calc(var(--safe-bottom) + 12px) calc(var(--safe-left) + 12px);
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' shape-rendering='crispEdges'%3E%3Crect width='32' height='32' fill='%23221639'/%3E%3Crect x='5' y='6' width='3' height='2' fill='%23ffb7c5'/%3E%3Crect x='21' y='20' width='2' height='2' fill='%23f48fb1'/%3E%3C/svg%3E") 0 0 / 64px 64px,
      var(--night);
  }
  .win { width: min(820px, 100%); max-height: 100%; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; gap: 10px; padding: 8px 10px; }
  h1 { margin: 0; font-size: 22px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.08em; }
  .tabbar { position: relative; flex: none; }
  .tabs { display: flex; gap: 4px; padding: 0 10px; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  /* more tabs past this edge: a dithered fade into the window under a ◀/▶ (taps go through to the tab) */
  .cue {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 36px;
    display: flex;
    align-items: center;
    padding: 0 3px;
    font-size: 12px;
    color: var(--sakura-2);
    pointer-events: none;
    --dither: repeating-conic-gradient(var(--panel-bg) 0 25%, transparent 0 50%) 0 0 / calc(var(--px) * 2) calc(var(--px) * 2);
  }
  .cue.l { left: 0; background: linear-gradient(var(--panel-bg), var(--panel-bg)) 0 0 / 50% 100% no-repeat, var(--dither); }
  .cue.r {
    right: 0;
    justify-content: flex-end;
    background: linear-gradient(var(--panel-bg), var(--panel-bg)) 100% 0 / 50% 100% no-repeat, var(--dither);
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 0 10px;
    background: transparent;
    color: inherit;
    border: 2px solid transparent;
    border-bottom-color: rgba(255, 214, 224, 0.3);
    font-family: var(--font-display);
    letter-spacing: 0.06em;
    cursor: pointer;
    white-space: nowrap;
  }
  .tab.on { border-color: var(--sakura-2); border-bottom-color: transparent; background: rgba(255, 183, 197, 0.14); }
  .tab.on::before { content: '▶'; font-size: 10px; color: var(--sakura-2); }
  .tab:focus-visible { outline: var(--px) dashed var(--gold); }
  .panel { flex: 1; min-height: 0; padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; overscroll-behavior: contain; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .row.col { flex-direction: column; align-items: stretch; }
  .lbl { display: flex; flex-direction: column; gap: 2px; font-size: 16px; }
  .lbl small { font-size: 12px; opacity: 0.75; }
  .seg { display: flex; flex-wrap: wrap; gap: 6px; }
  .panel :global(.px-btn), .foot :global(.px-btn), .top :global(.px-btn) { min-height: 44px; }
  .sw { min-width: 72px; }
  .vol { display: flex; align-items: center; gap: 8px; }
  /* SOUND: each volume on one line, sliders lined up: a label column as wide as "Sound effects", and a slider
     that gives way on narrow phones instead of wrapping under its label. Under ~280 px even the 72 px slider and
     the test button (124 px) don't fit beside it: then the row wraps, slider under label, rather than overlap it. */
  .vrow .lbl { flex: none; min-width: 7em; }
  .vrow .vol { flex: 1 0 124px; min-width: 0; justify-content: flex-end; }
  .vrow input[type='range'] { flex: 0 1 auto; min-width: 72px; }
  input[type='range'] { width: min(260px, 52vw); accent-color: var(--sakura-3); height: 32px; }
  .preview { margin: 0; padding: 10px 12px; min-height: 3.2em; flex: none; font-size: calc(16px * var(--fs-k, 1)); }
  /* Text size and the high-contrast box, as GameLayout applies them to the game's dialogue */
  .ts-s { --fs-k: 0.875; }
  .ts-l { --fs-k: 1.125; }
  .ts-xl { --fs-k: 1.3; }
  .hc .preview { background: #05030c; border-color: #fff; color: #fff; text-shadow: none; }
  .hint { margin: 0; font-size: 13px; opacity: 0.8; }
  .brain-state { max-width: 560px; margin: 0 auto; width: 100%; opacity: 0.9; }
  /* The Brain panel scrolls itself (max-height: 100%); in here that made a box-in-a-box squeezed to the room left
     (89 px in phone landscape). It takes its full height and this panel scrolls instead. */
  .panel :global(.big-brain) { max-height: none; overflow: visible; flex: none; }
  .field {
    min-height: 44px;
    width: 140px;
    padding: 4px 8px;
    color: var(--ink);
    background: var(--paper);
    border: var(--px) solid var(--ink);
    font-size: 16px;
  }
  .danger .lbl { color: #ffb39e; }
  .foot { display: flex; align-items: center; gap: 10px; padding: 8px 14px 12px; flex: none; }
  kbd { font-family: var(--font-display); color: var(--gold); }

  .mode-t, .mode-s { padding: 0; place-items: stretch; }
  .mode-t .win, .mode-s .win { width: 100%; height: 100%; padding-top: var(--safe-top); padding-bottom: var(--safe-bottom); }
  .mode-s .top { padding: 2px 10px; }
</style>
