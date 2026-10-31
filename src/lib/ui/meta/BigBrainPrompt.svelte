<script lang="ts">
  // Start-menu question, asked once per device before the player starts: download the optional on-device
  // "Big Brain" model? A PC-98 window with Piggy 3: what it is (a Liquid AI LFM model on this device's GPU, one
  // download kept in the browser's cache, nothing typed leaves the device, the built-in brain works great without
  // it), the REAL download size of the recommended tier (the other tiers behind "Other sizes"), and equal-size
  // Download / No thanks buttons. Without WebGPU it explains why, with a single OK.
  //
  // The answer is stored per device (src/lib/ai/choice.ts). Yes starts the download in the background (the title
  // shows a progress pill, the brain chip a %); when it's ready the chat brain switches to Big Brain and a toast says
  // so. No keeps every Big Brain control out of the game; Settings → Brain can change it later.
  // Keys: Tab cycles inside the window, Esc = No thanks. The safe answer has focus first, like ConfirmDialog.
  import { onMount, tick } from 'svelte';
  import './meta.css';
  import type { Expression } from '../../types';
  import { game } from '../../state/game.svelte';
  import { CHARACTERS } from '../../content/characters';
  import { MODELS, MODEL_IDS, availability, formatBytes, type ModelId } from '../../ai/models';
  import { getBigBrainChoice, setBigBrainChoice, type BigBrainChoice } from '../../ai/choice';
  import { toast, toasts } from '../toasts.svelte';
  import PortraitImg from './PortraitImg.svelte';
  import { isMeaningfulSave } from './save-utils';
  import { ui } from './sfx';

  let { onclose }: { onclose: (answer: BigBrainChoice | null) => void } = $props();

  type Manager = (typeof import('../../ai/manager.svelte'))['aiManager'];

  const P3 = CHARACTERS['piggy-3'];
  const uid = Math.random().toString(36).slice(2, 8);
  const READY_TEXT = 'Big Brain is ready — the piggies are thinking on your device.';

  let m = $state<Manager | null>(null);
  let dataText = $state('');
  let loadFailed = $state(false);
  let chosen = $state<ModelId | null>(null);
  let showOthers = $state(false);
  let win = $state<HTMLDivElement>();
  // A key or tap that was meant for the title menu must not answer the question it just opened.
  let armedAt = Infinity;
  let answered = false;

  const checked = $derived(!!m?.caps.checked);
  const unsupported = $derived(!!m && m.caps.checked && !m.caps.webgpu);
  const recommended = $derived<ModelId>(m?.recommended ?? 'lite');
  const tier = $derived<ModelId>(chosen && m && availability(chosen, m.caps).ok ? chosen : recommended);
  const tierOk = $derived(!!m && availability(tier, m.caps).ok);
  /** The model is already in this browser (left by an earlier version) or being loaded from it. */
  const onDevice = $derived(!!m && (m.cached[tier] || m.modelId === tier || m.loadingId === tier));
  const free = $derived(m?.freeBytes ?? null);
  const lowSpace = $derived(!onDevice && free !== null && free < bytesOf(tier) * 1.1);
  const onData = $derived(!!m && (m.caps.saveData || m.caps.cellular));
  const canAccept = $derived(checked && !unsupported && tierOk && !lowSpace);
  const view = $derived(loadFailed ? 'failed' : unsupported ? 'unsupported' : 'offer');
  const face = $derived<Expression>(view === 'offer' ? (checked ? 'bashful_smile' : 'thinking') : 'sad');

  /**
   * Download size: exact when aiManager.sizes already has it, else models.ts's measured file sizes for this GPU's
   * dtype (same figure once rounded). The window doesn't fetch sizes itself: no request to Hugging Face before a yes.
   */
  function bytesOf(id: ModelId): number {
    return m ? m.sizeOf(id).bytes : MODELS[id].approxBytes.q4f16;
  }
  const approx = (id: ModelId) => `≈ ${formatBytes(bytesOf(id))}`;

  onMount(() => {
    armedAt = performance.now() + 450;
    let alive = true;
    import('../../ai/manager.svelte')
      .then(async (mod) => {
        if (!alive) return;
        m = mod.aiManager;
        dataText = mod.MOBILE_DATA_TEXT;
        await mod.aiManager.detect();
      })
      .catch(() => {
        if (alive) loadFailed = true;
      });
    return () => {
      alive = false;
    };
  });

  // The safe answer (No thanks / OK) has focus first, and again whenever the window changes what it shows.
  $effect(() => {
    void view;
    void tick().then(() => win?.querySelector<HTMLElement>('[data-safe]')?.focus({ preventScroll: true }));
  });

  function close(answer: BigBrainChoice | null) {
    if (answered) return;
    answered = true;
    onclose(answer);
  }

  /** Settings live in the save. A brand-new player has no save yet: the first real one keeps these in-memory values. */
  function saveSettings() {
    if (isMeaningfulSave(game.save, game.hasSave)) game.persist();
  }

  function accept() {
    if (answered || performance.now() < armedAt || !m || !canAccept) return;
    ui.select();
    const id = tier;
    setBigBrainChoice('accepted');
    const s = game.save.settings;
    s.aiAutoload = true;
    s.aiModel = id;
    saveSettings();
    startBigBrain(m, id);
    close('accepted');
  }

  /** Download (or read from the cache) in the background. Outlives this window, so it only touches the save and toasts. */
  function startBigBrain(mgr: Manager, id: ModelId) {
    void mgr.load(id).then((ok) => {
      if (!ok || getBigBrainChoice() !== 'accepted') return;
      const s = game.save.settings;
      s.aiMode = 'llm';
      s.aiModel = mgr.modelId ?? id;
      game.persist();
      // The manager announces "Big Brain ready (…)" itself; say it once, in the start menu's words.
      const n = mgr.lastNotice;
      const dup = n?.kind === 'success' ? toasts.list.find((t) => t.text === n.text) : undefined;
      if (dup) toasts.dismiss(dup.id);
      toast(READY_TEXT, { icon: 'brain_big', kind: 'good', ms: 4500 });
    });
  }

  function decline() {
    if (answered || performance.now() < armedAt) return;
    ui.back();
    setBigBrainChoice('declined');
    const s = game.save.settings;
    s.aiMode = 'heuristic';
    s.aiAutoload = false;
    saveSettings();
    // A model left by an older version may be autoloading or loaded: stop it (its files stay cached until removed).
    void import('../../ai/manager.svelte')
      .then(({ aiManager }) => {
        if (getBigBrainChoice() !== 'declined') return;
        if (aiManager.busy) aiManager.cancel();
        else if (aiManager.status === 'ready') void aiManager.unload();
      })
      .catch(() => {});
    close('declined');
  }

  function later() {
    if (answered || performance.now() < armedAt) return;
    ui.back();
    close(null);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (view === 'failed') later();
      else decline();
      return;
    }
    if (e.key !== 'Tab' || !win) return;
    // Keep Tab inside the window (only the checked radio of a group is a tab stop).
    const stops = [...win.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')].filter(
      (el) => el.offsetParent !== null && !(el instanceof HTMLInputElement && el.type === 'radio' && !el.checked),
    );
    if (!stops.length) return;
    const i = stops.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : i < 0 || i >= stops.length - 1 ? 0 : i + 1;
    e.preventDefault();
    stops[next].focus();
  }
</script>

<svelte:window {onkeydown} />

<div class="km-scrim bb-scrim" role="presentation">
  <div
    bind:this={win}
    class="km-window bb km-pop-in px-scroll"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bb-title-{uid}"
    aria-describedby="bb-desc-{uid}"
  >
    <header class="head">
      <h2 id="bb-title-{uid}" class="km-title title">BIG BRAIN <small>optional · on-device AI</small></h2>
      <span class="km-jp jp" aria-hidden="true">ビッグブレイン</span>
    </header>

    <div class="pitch">
      <div class="face" aria-hidden="true"><PortraitImg pig="piggy-3" expression={face} alt="" /></div>
      <p class="say">
        <span class="km-plate" style:--plate={P3.color}>{P3.name.toUpperCase()}</span>
        <span class="line">
          {#if view === 'offer'}
            “Okay, quick nerdy question before we start…”
          {:else}
            “Oh no. Okay, tradeoffs: you get the brain I tuned myself. It’s honestly pretty good.”
          {/if}
        </span>
      </p>
    </div>

    {#if view === 'failed'}
      <p class="note" id="bb-desc-{uid}">
        Big Brain (an optional local AI) couldn’t start here right now. The piggies use their built-in brain, which works
        great offline. You can try again anytime in Settings → Brain.
      </p>
      <div class="buttons one">
        <button type="button" class="px-btn primary" data-safe onclick={later}>OK</button>
      </div>
    {:else if view === 'unsupported'}
      <p class="note" id="bb-desc-{uid}">
        Big Brain, an optional local AI that lets the piggies chat about anything, needs a browser with <b>WebGPU</b> —
        recent Chrome/Edge, or Safari 26+.
        {#if m?.caps.reason === 'no-adapter'}This browser has WebGPU, but no usable GPU (it may be turned off or blocklisted).{/if}
      </p>
      <p class="note">No problem: the piggies use their built-in brain, which works great offline.</p>
      <div class="buttons one">
        <button type="button" class="px-btn primary" data-safe onclick={decline}>OK</button>
      </div>
    {:else}
      <ul class="facts" id="bb-desc-{uid}">
        <li><b>Optional:</b> a local AI, <b>Big Brain</b>, lets the piggies chat about anything.</li>
        <li>It’s a <b>Liquid AI LFM</b> model that runs entirely on your device’s GPU.</li>
        <li>
          Downloaded once{#if checked}&nbsp;(<b>{approx(tier)}</b>){/if} and kept in your browser’s cache. You can remove it
          anytime in Settings → Brain.
        </li>
        <li>Nothing you type leaves your device.</li>
        <li>Without it, the piggies use their built-in brain, which works great offline.</li>
      </ul>

      {#if !m || !m.caps.checked}
        <p class="checking" role="status">Checking what this device can run…</p>
      {:else}
        {@const mgr = m}
        <fieldset class="tiers">
          <legend class="legend">{tier === recommended ? 'Recommended for this device' : 'Your pick'}</legend>
          {#each MODEL_IDS as id (id)}
            {#if showOthers || id === tier}
              {@const a = availability(id, mgr.caps)}
              <label class="tier" class:sel={id === tier} class:off={!a.ok}>
                <input type="radio" name="bb-tier-{uid}" value={id} checked={id === tier} disabled={!a.ok} onchange={() => (chosen = id)} />
                <span class="t-main">
                  <b>{MODELS[id].label}</b> · {MODELS[id].name}
                  {#if id === recommended && showOthers}<span class="badge">recommended</span>{/if}
                </span>
                <span class="t-size">{mgr.cached[id] ? 'on device' : approx(id)}</span>
                {#if showOthers}<span class="t-note">{a.ok ? (a.warn ?? MODELS[id].blurb) : a.reason}</span>{/if}
              </label>
            {/if}
          {/each}
        </fieldset>
        <button type="button" class="link" aria-expanded={showOthers} onclick={() => (showOthers = !showOthers)}>
          {showOthers ? '▼' : '▶'} Other sizes
        </button>
        {#if lowSpace && free !== null}
          <p class="warn">Not enough free space for this size (about {formatBytes(free)} free). Try a smaller one under “Other sizes”.</p>
        {/if}
        {#if onData && !onDevice && dataText}<p class="warn">{dataText}</p>{/if}
      {/if}

      <div class="buttons">
        <button type="button" class="px-btn primary" disabled={!canAccept} onclick={accept}>
          {!checked ? 'Download Big Brain' : onDevice ? 'Use Big Brain (already downloaded)' : `Download Big Brain (${approx(tier)})`}
        </button>
        <button type="button" class="px-btn" data-safe onclick={decline}>No thanks</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .bb-scrim { z-index: 40; }
  .bb {
    width: min(580px, 100%);
    max-height: 100%;
    padding: 18px 20px 16px;
    gap: 10px;
    overflow: auto;
    font-size: 15px;
    line-height: 1.45;
  }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .title { margin: 0; font-size: 24px; color: var(--sakura-1); }
  /* the subtitle wraps as one piece ("optional · on-device AI"), never mid-word */
  .title small { display: inline-block; font-family: var(--font-body); font-size: 13px; color: var(--paper-2); letter-spacing: 0.04em; margin-left: 0.4em; white-space: nowrap; }
  .jp { font-size: 12px; color: var(--sakura-2); opacity: 0.8; white-space: nowrap; }
  @media (max-width: 440px) { .jp { display: none; } }

  .pitch { display: flex; align-items: flex-end; gap: 12px; }
  .face {
    flex: none;
    width: 72px;
    height: 96px;
    border: var(--px) solid var(--box-edge);
    background: rgba(255, 255, 255, 0.06);
  }
  .say { margin: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .say .km-plate { font-size: 13px; }
  .line { font-size: 16px; }

  .facts { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; }
  .facts li { position: relative; padding-left: 1.2em; }
  .facts li::before { content: '▶'; position: absolute; left: 0; top: 0.3em; font-size: 0.65em; color: var(--sakura-2); }
  .note { margin: 0; }
  .checking { margin: 0; color: var(--paper-2); }

  .tiers { margin: 0; padding: 0; border: 0; display: grid; gap: 6px; min-width: 0; }
  .legend { padding: 0; margin-bottom: 4px; font-family: var(--font-display); font-size: 13px; letter-spacing: 0.06em; color: var(--gold); }
  .tier {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'radio main size' 'radio note note';
    align-items: center;
    column-gap: 8px;
    min-height: 44px;
    padding: 6px 10px;
    border: var(--px) solid rgba(255, 214, 224, 0.35);
    cursor: pointer;
  }
  .tier.sel { border-color: var(--sakura-2); background: rgba(255, 183, 197, 0.12); }
  .tier.off { opacity: 0.5; cursor: not-allowed; }
  .tier input { grid-area: radio; width: 18px; height: 18px; margin: 0; accent-color: var(--sakura-3); }
  .t-main { grid-area: main; min-width: 0; }
  .t-size { grid-area: size; font-family: var(--font-display); white-space: nowrap; color: var(--sakura-1); }
  .t-note { grid-area: note; font-size: 0.85em; opacity: 0.8; }
  .badge {
    margin-left: 6px;
    padding: 0 4px;
    font-size: 0.7em;
    color: var(--gold);
    border: 1px solid var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    vertical-align: middle;
  }
  .link {
    align-self: flex-start;
    min-height: 44px;
    padding: 2px 8px 2px 0;
    background: none;
    border: 0;
    color: var(--sakura-2);
    font: inherit;
    font-size: 14px;
    text-decoration: underline dotted;
    cursor: pointer;
  }
  .link:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: 2px; }
  .warn { margin: 0; color: var(--warn); font-size: 14px; }

  .buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
  .buttons.one { grid-template-columns: 1fr; }
  .buttons .px-btn { width: 100%; min-height: 48px; font-size: 16px; line-height: 1.2; }

  @media (max-width: 440px) {
    .bb { padding: 14px 14px 12px; }
    .buttons { grid-template-columns: 1fr; }
    .face { width: 54px; height: 72px; }
  }
  /* phone landscape: no room for the portrait */
  @media (max-height: 500px) {
    .bb { font-size: 14px; gap: 7px; padding: 12px 16px; }
    .pitch { display: none; }
    .title { font-size: 20px; }
    .buttons .px-btn { min-height: 44px; }
  }
</style>
