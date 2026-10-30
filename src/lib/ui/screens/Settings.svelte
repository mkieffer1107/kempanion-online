<script lang="ts">
  // Settings (design-ux §4.12): TEXT · SOUND · DISPLAY · BRAIN · ACCESS · DATA. Changes apply instantly.
  // Extras that the Settings type doesn't cover live in save.flags: ui.textSize, ui.petals, ui.highContrast,
  // ui.muteHidden, and pet.gentle (read by the pet sim).
  import { onMount, untrack } from 'svelte';
  import type { PigId, SaveData } from '../../types';
  import { game } from '../../state/game.svelte';
  import { audio } from '../../audio';
  import { localDate } from '../../time';
  import { now } from '../../state/clock';
  import { defaultSettings } from '../../pet';
  import { getBigBrainChoice, onBigBrainChoice, setBigBrainChoice } from '../../ai/choice';
  import { MODEL_IDS } from '../../ai/models';
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

  // ── BRAIN ──
  // The start menu asks once per device whether to download Big Brain (src/lib/ai/choice.ts); this tab is where the
  // player changes their mind: starting a download/load here means yes, removing the last downloaded model means no.
  type Manager = (typeof import('../../ai/manager.svelte'))['aiManager'];
  let brainChoice = $state(getBigBrainChoice());
  let brainMgr = $state<Manager | null>(null);
  $effect(() => onBigBrainChoice((v) => (brainChoice = v)));
  $effect(() => {
    if (tab === 'brain' && !brainMgr) void import('../../ai/manager.svelte').then((x) => (brainMgr = x.aiManager)).catch(() => {});
  });
  /** Was a model loading/loaded when last looked at (null = the Brain tab isn't open)? */
  let brainWasActive: boolean | null = null;
  $effect(() => {
    const m = brainMgr;
    if (!m || tab !== 'brain') {
      brainWasActive = null;
      return;
    }
    const active = m.busy || m.status === 'ready';
    untrack(() => {
      const started = brainWasActive === false && active;
      brainWasActive = active;
      if (!started || brainChoice === 'accepted') return;
      // Download / Load pressed in the panel: yes to Big Brain on this device (and load it again next launch).
      setBigBrainChoice('accepted');
      game.save.settings.aiAutoload = true;
      save();
    });
  });
  $effect(() => {
    const m = brainMgr;
    if (!m || tab !== 'brain') return;
    // The manager says "Removed …" (an info notice) after deleting a model's files.
    return m.onNotice((n) => {
      if (n.kind !== 'info' || m.busy || m.status === 'ready' || MODEL_IDS.some((id) => m.cached[id])) return;
      setBigBrainChoice('declined');
      game.save.settings.aiMode = 'heuristic';
      save();
    });
  });

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
    for (const k of ['ui.textSize', 'ui.petals', 'ui.highContrast', 'ui.muteHidden']) delete game.save.flags[k];
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

<div class="settings mode-{viewport.mode}">
  <div class="win px-panel dark" role="dialog" aria-labelledby="settings-title">
    <header class="top">
      <button type="button" class="px-btn ghost small" onclick={close} aria-label="Close settings"><Icon id="back" size={18} /> Back</button>
      <h1 id="settings-title" class="px-title"><Icon id="settings" size={24} /> SETTINGS</h1>
    </header>

    <div class="tabs" role="tablist" aria-label="Settings sections" tabindex="-1" onkeydown={tabKey}>
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

    <div class="panel px-scroll" role="tabpanel" id="panel-{tab}" aria-labelledby="tab-{tab}">
      {#if tab === 'text'}
        <div class="row col">
          <span class="lbl">Text speed</span>
          <div class="seg" role="radiogroup" aria-label="Text speed">
            {#each SPEEDS as sp (sp.label)}
              <button type="button" class="px-btn small" class:primary={s.textSpeed === sp.cps} role="radio" aria-checked={s.textSpeed === sp.cps} onclick={() => setSpeed(sp.cps)}>{sp.label}</button>
            {/each}
          </div>
          <p class="preview vn-box" aria-hidden="true"><b style:color="var(--p1)">Piggy 1</b> {PREVIEW.slice(0, shown)}</p>
        </div>
        <div class="row">
          <label class="lbl" for="auto-delay">Auto delay <small>{s.autoDelay.toFixed(1)} s after each line</small></label>
          <input id="auto-delay" type="range" min="0.5" max="4" step="0.1" value={s.autoDelay}
            oninput={(e) => { game.save.settings.autoDelay = Number((e.currentTarget as HTMLInputElement).value); save(); }} />
        </div>
        {@render toggle('Echo my lines', s.echoPlayer, () => (game.save.settings.echoPlayer = !s.echoPlayer), 'Show what you typed before the reply')}
        <div class="row">
          <span class="lbl">Text size</span>
          <div class="seg" role="radiogroup" aria-label="Text size">
            {#each textSizes as ts (ts)}
              <button type="button" class="px-btn small" class:primary={ui.textSize === ts} role="radio" aria-checked={ui.textSize === ts} onclick={() => { setFlag('ui.textSize', ts); audio.sfx('ui_toggle'); }}>{ts.toUpperCase()}</button>
            {/each}
          </div>
        </div>
      {:else if tab === 'sound'}
        {#each VOLS as v (v.key)}
          <div class="row">
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
        {#if canFullscreen}
          <div class="row">
            <span class="lbl">Fullscreen</span>
            <button type="button" class="px-btn small" onclick={toggleFullscreen}>{isFull ? 'Exit fullscreen' : 'Go fullscreen'}</button>
          </div>
        {/if}
        <p class="hint">Layout: {viewport.mode === 'w' ? 'Wide (letterboxed stage)' : viewport.mode === 't' ? 'Tall (KempaPager)' : 'Short (side rails)'} — rotate or resize to switch.</p>
      {:else if tab === 'brain'}
        <p class="hint brain-state" role="status">
          {#if brainChoice === 'accepted'}
            Big Brain is <b>on</b> for this device: its status chip shows in the game. Remove the model below to turn it off.
          {:else}
            Big Brain is <b>off</b> for this device{brainChoice === null ? '' : ' (you said no thanks)'}. Download it below and the
            piggies can chat about anything; it runs on your GPU and stays in this browser’s cache.
          {/if}
        </p>
        {#await import('../../ai/ModelPanel.svelte')}
          <p class="hint">Loading the Brain panel…</p>
        {:then m}
          <m.default />
        {:catch}
          <p class="hint">The Big Brain panel couldn’t load. The Heuristic Brain answers free chat either way.</p>
        {/await}
      {:else if tab === 'access'}
        {@render toggle('Reduce motion', s.reduceMotion, () => (game.save.settings.reduceMotion = !s.reduceMotion), ui.systemReduce ? 'Your system already asks for reduced motion' : 'Petals off, no shakes, crossfades instead of wipes')}
        {@render toggle('High-contrast text box', ui.highContrast, () => (game.save.flags['ui.highContrast'] = !ui.highContrast))}
        {@render toggle('Gentle mode', game.save.flags['pet.gentle'] === true, () => (game.save.flags['pet.gentle'] = game.save.flags['pet.gentle'] !== true), 'No sickness, and needs stay frozen while you’re away')}
        <div class="row">
          <span class="lbl">Text size</span>
          <div class="seg" role="radiogroup" aria-label="Text size">
            {#each textSizes as ts (ts)}
              <button type="button" class="px-btn small" class:primary={ui.textSize === ts} role="radio" aria-checked={ui.textSize === ts} onclick={() => { setFlag('ui.textSize', ts); audio.sfx('ui_toggle'); }}>{ts.toUpperCase()}</button>
            {/each}
          </div>
        </div>
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
    place-items: center;
    padding: calc(var(--safe-top) + 12px) calc(var(--safe-right) + 12px) calc(var(--safe-bottom) + 12px) calc(var(--safe-left) + 12px);
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' shape-rendering='crispEdges'%3E%3Crect width='32' height='32' fill='%23221639'/%3E%3Crect x='5' y='6' width='3' height='2' fill='%23ffb7c5'/%3E%3Crect x='21' y='20' width='2' height='2' fill='%23f48fb1'/%3E%3C/svg%3E") 0 0 / 64px 64px,
      var(--night);
  }
  .win { width: min(820px, 100%); max-height: 100%; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; gap: 10px; padding: 8px 10px; }
  h1 { margin: 0; font-size: 22px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.08em; }
  .tabs { display: flex; gap: 4px; padding: 0 10px; overflow-x: auto; scrollbar-width: none; flex: none; }
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
  input[type='range'] { width: min(260px, 52vw); accent-color: var(--sakura-3); height: 32px; }
  .preview { margin: 0; padding: 10px 12px; min-height: 3.2em; font-size: 16px; }
  .hint { margin: 0; font-size: 13px; opacity: 0.8; }
  .brain-state { max-width: 560px; margin: 0 auto; width: 100%; opacity: 0.9; }
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
