<script lang="ts">
  // "Big Brain" panel (design-ux §4.8): Piggy 3's pitch, the three tiers with real sizes, device checks,
  // equal-size Download / Keep-the-Heuristic-Brain buttons, the install progress view, and the ready state.
  // Put it inside a modal (phones: full width, 360 px OK) or inline in Settings → Brain.
  import { onMount } from 'svelte';
  import spritesJson from '../../generated/sprites.json';
  import { CHARACTERS } from '../content/characters';
  import { game } from '../state/game.svelte';
  import type { Expression, PigId } from '../types';
  import { MOBILE_DATA_TEXT, UNSUPPORTED_TEXT, aiManager as m } from './manager.svelte';
  import { MODELS, MODEL_IDS, availability, formatBytes, isModelId, type ModelId } from './models';

  let { onClose }: { onClose?: () => void } = $props();

  const P3 = CHARACTERS['piggy-3'];
  const BLOCKS = Array.from({ length: 20 }, (_, i) => i);
  const titleId = `bigbrain-title-${Math.random().toString(36).slice(2, 8)}`;

  let chosen = $state<ModelId | null>(null);
  let showHeuristicInfo = $state(false);
  let showDetails = $state(false);
  let showPicker = $state(false);
  let commentTick = $state(0);

  const settings = $derived(game.save.settings);
  // The player's pick, else what's loading/loaded, else the saved tier when this device can run it, else the default.
  const selected = $derived<ModelId>(
    chosen ??
      m.loadingId ??
      m.modelId ??
      (isModelId(settings.aiModel) && availability(settings.aiModel, m.caps).ok ? settings.aiModel : m.recommended),
  );
  const selAvail = $derived(availability(selected, m.caps));
  const selSize = $derived(m.sizeOf(selected));
  const needBytes = $derived(m.cached[selected] ? 0 : selSize.bytes);
  const free = $derived(m.freeBytes);
  const lowSpace = $derived(free !== null && needBytes > 0 && free < needBytes * 1.1);
  const onData = $derived(m.caps.saveData || m.caps.cellular);
  const pct = $derived(m.progress.total > 0 ? Math.min(100, Math.floor((m.progress.loaded / m.progress.total) * 100)) : 0);
  const filled = $derived(Math.round(pct / 5));
  const view = $derived(
    m.status === 'unsupported'
      ? 'unsupported'
      : m.busy
        ? 'progress'
        : m.status === 'ready' && !showPicker
          ? 'ready'
          : 'offer',
  );

  // ── Piggy 3 portrait from the sprite atlas (CSS background, pixelated) ──
  type SpriteSet = { portraitAtlas: string; portraits: Partial<Record<Expression, [number, number]>> };
  const SPRITES = spritesJson as unknown as { portrait: { w: number; h: number }; sets: Record<string, SpriteSet> };
  function portraitStyle(pig: PigId, expression: Expression): string {
    const set = SPRITES.sets[`${pig}/everyday`];
    if (!set) return '';
    const cell = set.portraits[expression] ?? set.portraits.neutral;
    if (!cell) return '';
    const { w, h } = SPRITES.portrait;
    const coords = Object.values(set.portraits).filter(Boolean) as [number, number][];
    const cols = Math.max(...coords.map((c) => c[0])) / w + 1;
    const rows = Math.max(...coords.map((c) => c[1])) / h + 1;
    const x = cols > 1 ? (cell[0] / w / (cols - 1)) * 100 : 0;
    const y = rows > 1 ? (cell[1] / h / (rows - 1)) * 100 : 0;
    const url = `${import.meta.env.BASE_URL}assets/${set.portraitAtlas}`;
    return `background-image:url("${url}");background-size:${cols * 100}% ${rows * 100}%;background-position:${x}% ${y}%;`;
  }
  const faceExpr = $derived<Expression>(
    view === 'unsupported' ? 'sad' : view === 'progress' ? 'thinking' : view === 'ready' ? 'happy' : m.status === 'error' ? 'confused' : 'bashful_smile',
  );
  const portrait = $derived(portraitStyle('piggy-3', faceExpr));

  // ── pig comments while installing (voice sheet: "Big Brain loading") ──
  const comment = $derived.by(() => {
    const sets = ['zero', 'one', 'two', 'three', 'four', 'five'][Math.min(5, Math.max(1, Math.round(pct / 20)))];
    const lines: [PigId, string][] =
      m.phase === 'prepare' || m.phase === 'warmup'
        ? [
            ['piggy-3', "Okay, it's compiling shaders… basically teaching your GPU to talk pig."],
            ['piggy-2', 'Installing the chip. Perfusion looks great.'],
          ]
        : [
            ['piggy-1', `Loading bar at ${pct}%! That's, like, ${sets} sets.`],
            ['piggy-2', 'Installing the chip. Perfusion looks great.'],
            ['piggy-3', 'Each file gets cached separately, so a cancel keeps what already finished.'],
          ];
    const [pig, text] = lines[commentTick % lines.length];
    return { pig, name: CHARACTERS[pig].name, color: CHARACTERS[pig].color, text };
  });

  $effect(() => {
    if (view !== 'progress') return;
    const t = setInterval(() => (commentTick += 1), 4500);
    return () => clearInterval(t);
  });

  onMount(() => {
    void m.detect().then(() => m.fetchSizes());
  });

  // ── formatting ──
  const mb = (n: number) => (n / 1e6).toFixed(n >= 1e8 ? 0 : 1);
  function eta(s: number): string {
    if (!s || !Number.isFinite(s)) return '';
    if (s < 60) return `~${Math.max(1, Math.round(s))} s`;
    if (s < 3600) return `~${Math.round(s / 60)} min`;
    return `~${(s / 3600).toFixed(1)} h`;
  }
  function stepState(step: 'check' | 'download' | 'prepare' | 'warmup'): 'done' | 'active' | 'todo' {
    const order = ['check', 'download', 'prepare', 'warmup', 'done'];
    const at = m.phase === 'idle' ? 1 : order.indexOf(m.phase);
    const i = order.indexOf(step);
    return i < at ? 'done' : i === at ? 'active' : 'todo';
  }

  // ── actions ──
  function start() {
    if (!selAvail.ok || lowSpace) return;
    showPicker = false;
    void m.load(selected);
  }
  function keepHeuristic() {
    if (m.status !== 'ready') {
      settings.aiMode = 'heuristic';
      game.persist();
    }
    onClose?.();
  }
  function setBrain(mode: 'heuristic' | 'llm') {
    if (mode === 'llm' && m.status !== 'ready') return;
    settings.aiMode = mode;
    game.persist();
  }
  function setAutoload(on: boolean) {
    settings.aiAutoload = on;
    game.persist();
  }
  async function removeSelected(id: ModelId) {
    await m.remove(id);
  }
</script>

<div class="px-panel dark big-brain px-scroll" role="dialog" aria-labelledby={titleId}>
  <header class="head">
    <h2 id={titleId} class="px-title">
      {#if view === 'progress'}
        BIG BRAIN · {m.status === 'downloading' ? 'installing' : m.status === 'warming' ? 'warming up' : 'loading'}
      {:else if view === 'ready'}
        BIG BRAIN · ready
      {:else}
        OPTIONAL · BIG BRAIN <span class="sub">(on-device AI)</span>
      {/if}
    </h2>
    {#if onClose}
      <button class="px-btn small ghost close" onclick={() => onClose?.()} aria-label={view === 'progress' ? 'Minimize (keeps installing)' : 'Close'}>
        {view === 'progress' ? '_' : '×'}
      </button>
    {/if}
  </header>

  <div class="pitch">
    <div class="portrait pixelated" style={portrait} role="img" aria-label={`${P3.name}, ${faceExpr.replace(/_/g, ' ')}`}></div>
    <p class="say">
      <b style:color={P3.color}>{P3.name.toUpperCase()}:</b>
      {#if view === 'unsupported'}
        “Oh no. Your browser can't run the big model yet. Honestly the Heuristic Brain is pretty good, though. I tuned it.”
      {:else if view === 'progress'}
        “Okay, it's going. You can keep playing; I'll ping you when it's ready.”
      {:else if view === 'ready'}
        “It works! Okay, so now we can talk about basically anything. Try asking me something weird.”
      {:else if m.status === 'error'}
        “Wait, that didn't work. Let's look at it again. The Heuristic Brain still has us covered.”
      {:else}
        “Okay, so I was thinking… a small language model can run right in your browser. Basically, we could chat about
        anything. Best for what, though? Tradeoffs below!”
      {/if}
    </p>
  </div>

  {#if m.status === 'error' && m.error && view !== 'progress'}
    <p class="banner bad" role="alert">{m.error}</p>
  {/if}

  {#if view === 'unsupported'}
    <p class="note">{UNSUPPORTED_TEXT}</p>
    <div class="actions one">
      <button class="px-btn primary" onclick={keepHeuristic}>Chat with the Heuristic Brain</button>
    </div>
    <button class="link" onclick={() => (showDetails = !showDetails)} aria-expanded={showDetails}>
      {showDetails ? '▾' : '▸'} Details
    </button>
    {#if showDetails}
      <ul class="facts">
        <li>WebGPU: {m.caps.reason === 'no-adapter' ? 'present, but no usable GPU adapter (blocklisted or disabled)' : m.caps.reason === 'error' ? 'error while checking' : 'not available in this browser'}</li>
        <li>The CPU (WASM) path runs these models at about 1 token/s, too slow for chat, so it's not offered.</li>
        <li>Works in recent Chrome / Edge (Windows, macOS, ChromeOS, Android 12+), Safari 26+ (macOS 26, iOS 26), Firefox 141+ (Windows) / 147+ (macOS).</li>
      </ul>
    {/if}
  {:else if view === 'progress'}
    {@const loadingDef = MODELS[m.loadingId ?? selected]}
    <p class="model-line">{loadingDef.label} · {loadingDef.name}</p>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct} aria-label="Big Brain install progress">
      {#each BLOCKS as i (i)}
        <span class="blk" class:on={i < filled}></span>
      {/each}
    </div>
    <p class="stats" aria-live="polite">
      <b>{pct}%</b>
      {#if m.progress.total > 0}<span>{mb(m.progress.loaded)} / {mb(m.progress.total)} MB</span>{/if}
      {#if m.progress.fromCache}<span>from this device</span>{:else if m.progress.speed > 0}<span>{(m.progress.speed / 1e6).toFixed(1)} MB/s</span>{/if}
      {#if eta(m.progress.eta) && m.phase === 'download'}<span>{eta(m.progress.eta)}</span>{/if}
    </p>
    <ol class="steps">
      <li class={stepState('check')}>WebGPU check</li>
      <li class={stepState('download')}>{m.progress.fromCache ? 'Load from device' : 'Download'}</li>
      <li class={stepState('prepare')}>Prepare</li>
      <li class={stepState('warmup')}>Warm-up</li>
    </ol>
    <p class="comment"><b style:color={comment.color}>{comment.name.toUpperCase()}:</b> “{comment.text}”</p>
    <div class="actions">
      <button class="px-btn" onclick={() => m.cancel()}>{m.status === 'downloading' ? 'Cancel download' : 'Cancel'}</button>
      <button class="px-btn ghost" onclick={() => onClose?.()} disabled={!onClose}>Keep playing</button>
    </div>
  {:else if view === 'ready'}
    {@const def = MODELS[m.modelId ?? selected]}
    <p class="model-line">
      ✓ {def.label} · {def.name}
      {#if m.tokensPerSec > 0}<span class="tps">· {m.tokensPerSec} tok/s</span>{/if}
    </p>
    <div class="toggle" role="group" aria-label="Chat brain">
      <span>Chat brain:</span>
      <button class="px-btn small" class:primary={settings.aiMode !== 'llm'} aria-pressed={settings.aiMode !== 'llm'} onclick={() => setBrain('heuristic')}>Heuristic</button>
      <button class="px-btn small" class:primary={settings.aiMode === 'llm'} aria-pressed={settings.aiMode === 'llm'} onclick={() => setBrain('llm')}>Big</button>
    </div>
    <label class="check">
      <input type="checkbox" checked={settings.aiAutoload} onchange={(e) => setAutoload(e.currentTarget.checked)} />
      Load Big Brain automatically next time
    </label>
    <div class="actions">
      <button class="px-btn" onclick={() => m.unload()}>Unload</button>
      <button class="px-btn" onclick={() => m.modelId && removeSelected(m.modelId)}>
        Remove model ({m.sizeOf(m.modelId ?? selected).label})
      </button>
    </div>
    <button class="link" onclick={() => (showPicker = true)}>▸ Change model</button>
  {:else}
    <fieldset class="tiers">
      <legend class="visually-hidden">Model size</legend>
      {#each MODEL_IDS as id (id)}
        {@const def = MODELS[id]}
        {@const av = availability(id, m.caps)}
        {@const size = m.sizeOf(id)}
        <label class="tier" class:sel={selected === id} class:off={!av.ok}>
          <input type="radio" name="bigbrain-tier" value={id} checked={selected === id} disabled={!av.ok} onchange={() => (chosen = id)} />
          <span class="t-main">
            <span class="t-label">{def.label}</span>
            <span class="t-name">{def.name}</span>
            {#if id === m.recommended && m.caps.checked}<span class="badge">recommended</span>{/if}
            {#if m.cached[id]}<span class="badge ok">on device</span>{/if}
          </span>
          <span class="t-size">{m.cached[id] ? 'cached' : size.label}</span>
          <span class="t-blurb">{av.ok ? (av.warn ?? def.blurb) : av.reason}</span>
        </label>
      {/each}
    </fieldset>

    <ul class="facts">
      <li>
        {#if !m.caps.checked}
          Checking your GPU…
        {:else}
          WebGPU ✓ · shader-f16 {m.caps.shaderF16 ? '✓' : '✗ (larger q4 files)'}{#if m.caps.adapter} · {m.caps.adapter}{/if}
        {/if}
      </li>
      <li>One-time download from Hugging Face, then cached in this browser. Remove it anytime here.</li>
      <li>Runs on your GPU. What you type stays on this device.</li>
      {#if free !== null}
        <li class:warn={lowSpace}>
          {#if needBytes > 0}Needs {selSize.label} · {/if}~{formatBytes(free)} free on this device{#if lowSpace}. Not enough space: try a smaller model.{/if}
        </li>
      {/if}
      {#if onData}<li class="warn">{MOBILE_DATA_TEXT}</li>{/if}
      {#if m.caps.mobile}<li>Phones may get warm while it runs.</li>{/if}
      {#if m.crashGuard}<li class="warn">Last time the page closed while Big Brain was loading, so it won't load automatically until it loads once from here.</li>{/if}
    </ul>

    <div class="actions">
      <button class="px-btn primary" onclick={start} disabled={!m.caps.checked || !selAvail.ok || lowSpace || m.status === 'checking'}>
        {m.cached[selected] ? 'Load (no download)' : `Download ${selSize.label}`}
      </button>
      <button class="px-btn" onclick={keepHeuristic}>Keep the Heuristic Brain</button>
    </div>
    <button class="link" onclick={() => (showHeuristicInfo = !showHeuristicInfo)} aria-expanded={showHeuristicInfo}>
      {showHeuristicInfo ? '▾' : '▸'} What's the Heuristic Brain?
    </button>
    {#if showHeuristicInfo}
      <p class="note">Built in, instant, offline. Each piggy knows a few hundred topics and phrases. Nothing to download.</p>
    {/if}
    {#if m.status === 'ready' && showPicker}
      <button class="link" onclick={() => (showPicker = false)}>◂ Back</button>
    {/if}
  {/if}
</div>

<style>
  .big-brain {
    width: 100%;
    max-width: 560px;
    max-height: 100%;
    margin: 0 auto;
    padding: calc(var(--px) * 4);
    display: flex;
    flex-direction: column;
    gap: calc(var(--px) * 3);
    font-size: 15px;
    line-height: 1.35;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  h2 {
    margin: 0;
    font-size: 1.05em;
    letter-spacing: 0.06em;
  }
  .sub {
    opacity: 0.7;
    font-size: 0.8em;
  }
  .close {
    min-width: 36px;
    flex: none;
  }
  .pitch {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .portrait {
    flex: none;
    width: 72px;
    aspect-ratio: 192 / 256;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    border: var(--px) solid var(--box-edge);
    background-color: rgba(255, 255, 255, 0.06);
  }
  .say {
    margin: 0;
  }
  .banner {
    margin: 0;
    padding: 6px 8px;
    border: var(--px) solid var(--bad);
    background: rgba(255, 90, 95, 0.15);
  }
  .note {
    margin: 0;
    opacity: 0.9;
  }
  .model-line {
    margin: 0;
    font-family: var(--font-display);
  }
  .tps {
    opacity: 0.8;
  }
  .tiers {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .tier {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'radio main size' 'radio blurb blurb';
    column-gap: 8px;
    align-items: center;
    padding: 6px 8px;
    border: var(--px) solid rgba(255, 214, 224, 0.35);
    cursor: pointer;
    min-height: 44px;
  }
  .tier.sel {
    border-color: var(--sakura-2);
    background: rgba(255, 183, 197, 0.12);
  }
  .tier.off {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .tier input {
    grid-area: radio;
    width: 18px;
    height: 18px;
    accent-color: var(--sakura-3);
  }
  .t-main {
    grid-area: main;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }
  .t-label {
    font-family: var(--font-display);
  }
  .t-name {
    opacity: 0.75;
    font-size: 0.9em;
  }
  .t-size {
    grid-area: size;
    font-family: var(--font-display);
    white-space: nowrap;
  }
  .t-blurb {
    grid-area: blurb;
    font-size: 0.85em;
    opacity: 0.8;
  }
  .badge {
    font-size: 0.7em;
    padding: 0 4px;
    border: 1px solid var(--gold);
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge.ok {
    border-color: var(--ok);
    color: var(--ok);
  }
  .facts {
    margin: 0;
    padding-left: 1.1em;
    font-size: 0.88em;
    display: grid;
    gap: 2px;
  }
  .warn {
    color: var(--warn);
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .actions.one {
    grid-template-columns: 1fr;
  }
  .actions :global(.px-btn) {
    width: 100%;
  }
  .link {
    align-self: flex-start;
    background: none;
    border: 0;
    padding: 4px 0;
    min-height: 32px;
    color: var(--sakura-2);
    cursor: pointer;
    text-decoration: underline dotted;
  }
  .bar {
    display: grid;
    grid-template-columns: repeat(20, 1fr);
    gap: 2px;
    padding: 3px;
    background: var(--ink);
    border: var(--px) solid var(--box-edge);
  }
  .blk {
    height: 14px;
    background: rgba(255, 255, 255, 0.08);
  }
  .blk.on {
    background: var(--sakura-2);
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45);
  }
  .stats {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.9em;
  }
  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.88em;
  }
  .steps li::before {
    content: '[ ] ';
    white-space: pre;
  }
  .steps li.done::before {
    content: '[x] ';
    color: var(--ok);
  }
  .steps li.active::before {
    content: '[>] ';
    color: var(--gold);
  }
  .steps li.todo {
    opacity: 0.6;
  }
  .comment {
    margin: 0;
    font-size: 0.92em;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .check {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 36px;
    font-size: 0.92em;
  }
  .check input {
    width: 18px;
    height: 18px;
    accent-color: var(--sakura-3);
  }
  @media (max-width: 420px) {
    .big-brain {
      font-size: 14px;
      padding: calc(var(--px) * 3);
    }
    .portrait {
      width: 56px;
    }
    .actions {
      gap: 6px;
    }
  }
</style>
