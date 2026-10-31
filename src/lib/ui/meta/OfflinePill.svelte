<script lang="ts">
  // "Play offline" on the title screen: a small pixel pill in the Big Brain pill's style family (src/lib/offline.svelte.ts
  // does the work). Tap → a short confirm with the real download size from offline-manifest.json (Big Brain not
  // included; "checking size…" until the worker has answered, Download usable either way) → the pill shows a pixel
  // progress bar and percent → "✓ OFFLINE READY" (tap: what's saved and how big).
  // A failed download turns the pill into a retry; without a service worker (dev server, http://, old browsers) the
  // tap explains why instead. The button is a 44 px target around the 30 px pill; `compact` drops the long label
  // (phone portrait, while the Big Brain pill shares the corner).
  // Keys while the window is open: Tab / ←→ move between its buttons, Enter / Space choose, Esc closes.
  import { onMount, tick } from 'svelte';
  import './meta.css';
  import { formatSize, offline } from '../../offline.svelte';
  import { ui } from './sfx';

  let {
    compact = false,
    disabled = false,
    onopenchange,
  }: {
    compact?: boolean;
    /** The title screen is leaving: ignore taps. */
    disabled?: boolean;
    /** The window opened or closed (the title menu ignores keys meanwhile). */
    onopenchange?: (open: boolean) => void;
  } = $props();

  type View = 'confirm' | 'offline' | 'downloading' | 'ready' | 'error' | 'blocked';
  interface Choice { label: string; kind: 'primary' | 'ghost'; run: () => void }

  const uid = Math.random().toString(36).slice(2, 8);
  const BLOCKS = Array.from({ length: 10 }, (_, k) => k);

  // pixel glyphs (1 = lit), drawn in currentColor
  const GLYPHS = {
    down: ['..xxx..', '..xxx..', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...', '.......', 'xxxxxxx'],
    check: ['......x', '.....xx', 'x...xx.', 'xx.xx..', '.xxx...', '..x....'],
    alert: ['xx', 'xx', 'xx', 'xx', 'xx', '..', 'xx'],
  };
  type GlyphName = keyof typeof GLYPHS;
  function runs(rows: string[]) {
    const out: { x: number; y: number; w: number }[] = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== 'x') continue;
        let w = 1;
        while (row[x + w] === 'x') w++;
        out.push({ x, y, w });
        x += w - 1;
      }
    });
    return out;
  }

  let open = $state(false);
  let btn = $state<HTMLButtonElement>();
  let win = $state<HTMLDivElement>();
  /** Polite announcement of status changes for screen readers. */
  let said = $state('');

  onMount(() => offline.init());

  const status = $derived(offline.status);
  const blocked = $derived(!!offline.blocker);
  const pct = $derived(offline.percent);
  const size = $derived(offline.totalBytes > 0 ? formatSize(offline.totalBytes) : '');
  /** The worker hasn't said yet (a slow first visit installs it first): the confirm says the size is on its way. */
  const sizing = $derived(!size && offline.asking);

  const glyph = $derived<GlyphName>(status === 'ready' && !blocked ? 'check' : status === 'error' && !blocked ? 'alert' : 'down');
  const text = $derived.by(() => {
    if (blocked) return compact ? 'OFFLINE' : 'PLAY OFFLINE';
    switch (status) {
      case 'downloading': return `${pct}%`;
      case 'ready': return compact ? 'OFFLINE' : 'OFFLINE READY';
      case 'error': return compact ? 'RETRY' : 'RETRY OFFLINE';
      default: return compact ? 'OFFLINE' : 'PLAY OFFLINE';
    }
  });
  const label = $derived.by(() => {
    if (blocked) return 'Play offline (not available in this browser)';
    switch (status) {
      case 'downloading': return `Downloading the game for offline play, ${pct}%`;
      case 'ready': return 'Offline ready: the game is saved on this device';
      case 'error': return 'Offline download stopped: try again';
      default: return size ? `Play offline: download the game (${size}) to this device` : 'Play offline: download the game to this device';
    }
  });
  const hint = $derived(
    status === 'ready' ? 'Saved on this device for offline play' : `Download the whole game${size ? ` (${size})` : ''} to play with no internet`,
  );

  const view = $derived.by((): View | null => {
    if (!open) return null;
    if (offline.blocker) return 'blocked';
    if (status === 'idle') return typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'confirm';
    return status;
  });

  // Say what changed (not every percent).
  let lastStatus = offline.status;
  $effect(() => {
    const s = status;
    if (s === lastStatus) return;
    lastStatus = s;
    said = s === 'downloading' ? 'Downloading the game for offline play.' : s === 'ready' ? 'Offline ready.' : s === 'error' ? 'Offline download stopped.' : '';
  });

  function show() {
    if (disabled || open) return;
    ui.select();
    offline.refresh();
    open = true;
    onopenchange?.(true);
  }

  function close(sound = true) {
    if (!open) return;
    if (sound) ui.back();
    open = false;
    onopenchange?.(false);
    void tick().then(() => btn?.focus({ preventScroll: true }));
  }

  function download() {
    ui.select();
    offline.start();
    close(false);
  }

  const copy = $derived.by(() => {
    const about = size ? `about ${size}, ` : '';
    const saved = `${offline.doneFiles} of ${offline.totalFiles} files are saved`;
    switch (view) {
      case 'confirm':
        // Download works the same before the size is known (it fills in here when the worker answers)
        return {
          title: 'Play offline?',
          message: `Download the whole game (${sizing ? 'checking size…, ' : about}Big Brain not included) so it works with no internet?`,
          choices: [
            { label: 'Not now', kind: 'ghost', run: () => close() },
            { label: 'Download', kind: 'primary', run: download },
          ] as Choice[],
        };
      case 'offline':
        return {
          title: 'Play offline',
          message: `You're offline right now. Connect to the internet once to download the game (${about}Big Brain not included), then it plays with no internet.`,
          choices: [{ label: 'OK', kind: 'primary', run: () => close() }] as Choice[],
        };
      case 'downloading':
        return {
          title: 'Downloading…',
          message: offline.totalBytes > 0
            ? `Saving the game on this device: ${formatSize(offline.doneBytes)} of ${size}. Keep playing if you like, it finishes in the background.`
            : 'Saving the game on this device. Keep playing if you like, it finishes in the background.',
          choices: [{ label: 'OK', kind: 'primary', run: () => close() }] as Choice[],
        };
      case 'ready':
        return {
          title: 'Offline ready',
          message:
            `The whole game (${size ? `${size}, ` : ''}Big Brain not included) is saved on this device and plays with ` +
            "no internet. Updates download by themselves when you're online." +
            (offline.persisted === false ? ' Your browser may clear it if space runs low.' : ''),
          choices: [{ label: 'OK', kind: 'primary', run: () => close() }] as Choice[],
        };
      case 'error':
        return {
          title: 'Download stopped',
          message:
            offline.reason === 'storage'
              ? `This device is out of storage space for the game${size ? ` (${size})` : ''}. Free up some space, then try again.`
              : offline.reason === 'changed'
                ? 'The game was updated while it downloaded. Try again to get the new version.'
                : `Couldn't reach the game's server${offline.totalFiles ? `: ${saved}` : ''}. Try again when you're online.`,
          choices: [
            { label: 'Not now', kind: 'ghost', run: () => close() },
            { label: 'Try again', kind: 'primary', run: download },
          ] as Choice[],
        };
      case 'blocked':
        return {
          title: "Offline play isn't available",
          message:
            offline.blocker === 'dev'
              ? "Offline mode works in the published game. The dev server doesn't run the service worker it needs."
              : offline.blocker === 'insecure'
                ? 'It needs a secure connection: open the game at its https:// address to download it.'
                : offline.blocker === 'no-worker'
                  ? "The game's offline helper didn't start. Reload the page and try again."
                  : "This browser can't keep the game for offline play (private windows often can't). A current Safari, Chrome, Edge or Firefox can.",
          choices: [{ label: 'OK', kind: 'primary', run: () => close() }] as Choice[],
        };
      default:
        return null;
    }
  });

  // Focus the safe (first) button whenever the window opens or changes what it shows.
  $effect(() => {
    if (!view) return;
    void tick().then(() => win?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }));
  });

  // Keys stay inside the window while it's open (capture phase, before the title menu's handler).
  $effect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      const list = [...(win?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
      const at = list.indexOf(document.activeElement as HTMLButtonElement);
      const k = e.key;
      if (k === 'Escape' || k === 'x' || k === 'X') {
        close();
      } else if (k === 'Tab' || k === 'ArrowLeft' || k === 'ArrowRight') {
        const step = k === 'ArrowLeft' || (k === 'Tab' && e.shiftKey) ? -1 : 1;
        const next = list[(Math.max(0, at) + step + list.length) % list.length];
        if (list.length > 1) ui.move();
        next?.focus({ preventScroll: true });
      } else if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') {
        if (!e.repeat) (list[at] ?? list[0])?.click();
      } else if (!['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S', 'Home', 'End'].includes(k)) {
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    addEventListener('keydown', h, true);
    return () => removeEventListener('keydown', h, true);
  });
</script>

<button
  bind:this={btn}
  type="button"
  class="op-pill"
  class:ready={status === 'ready' && !blocked}
  class:err={status === 'error' && !blocked}
  aria-label={label}
  aria-haspopup="dialog"
  title={hint}
  {disabled}
  onclick={show}
>
  <span class="op-face">
    <svg
      class="op-ico"
      width={GLYPHS[glyph][0].length * 2}
      height={GLYPHS[glyph].length * 2}
      viewBox="0 0 {GLYPHS[glyph][0].length} {GLYPHS[glyph].length}"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      {#each runs(GLYPHS[glyph]) as r, i (i)}<rect x={r.x} y={r.y} width={r.w} height="1" fill="currentColor" />{/each}
    </svg>
    {#if status === 'downloading' && !blocked && !compact}
      <span class="op-bar" aria-hidden="true">
        {#each BLOCKS as k (k)}<i class:on={k < Math.round(pct / 10)}></i>{/each}
      </span>
    {/if}
    <span class="op-text">{text}</span>
  </span>
</button>
<span class="visually-hidden" aria-live="polite">{said}</span>

{#if view && copy}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="op-scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
    <div
      bind:this={win}
      class="km-window op-dialog km-pop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="op-title-{uid}"
      aria-describedby="op-msg-{uid}"
    >
      <h2 id="op-title-{uid}" class="km-title op-title">{copy.title}</h2>
      <p id="op-msg-{uid}" class="op-msg">{copy.message}</p>
      {#if view === 'downloading' || view === 'ready'}
        <div class="op-meter" role="progressbar" aria-label="Saved for offline play" aria-valuemin="0" aria-valuemax="100" aria-valuenow={view === 'ready' ? 100 : pct}>
          <i style:width="{view === 'ready' ? 100 : pct}%"></i>
        </div>
      {/if}
      <div class="op-buttons" class:one={copy.choices.length === 1}>
        {#each copy.choices as c (c.label)}
          <button type="button" class="px-btn {c.kind}" onclick={c.run}>{c.label}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .op-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    margin: 0;
    padding: 0;
    color: var(--gold);
    background: transparent;
    border: 0;
    font: inherit;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    animation: km-step-in 180ms steps(4) both;
  }
  .op-pill:disabled { cursor: default; }
  .op-pill:focus-visible { outline: none; }
  .op-face {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 3px 10px 3px 8px;
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.08em;
    line-height: 1;
    white-space: nowrap;
    color: inherit;
    background: rgba(27, 20, 40, 0.88);
    border: var(--px) solid var(--sakura-2);
    box-shadow: 0 var(--px) 0 var(--ink);
  }
  .op-pill:hover .op-face { filter: brightness(1.12); }
  .op-pill:active .op-face { transform: translateY(var(--px)); box-shadow: none; }
  .op-pill:focus-visible .op-face { outline: var(--px) dashed var(--gold); outline-offset: var(--px); }
  .op-pill.ready { color: var(--ok); }
  .op-pill.ready .op-face { border-color: var(--ok); }
  .op-pill.err { color: var(--warn); }
  .op-pill.err .op-face { border-color: var(--warn); }
  .op-ico { flex: none; display: block; }
  .op-text { min-width: 3ch; text-align: right; }
  .op-bar {
    display: inline-grid;
    grid-template-columns: repeat(10, 5px);
    gap: 1px;
    padding: 2px;
    background: var(--ink);
  }
  .op-bar i { height: 8px; background: rgba(255, 255, 255, 0.12); }
  .op-bar i.on { background: var(--sakura-2); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45); }
  @media (prefers-reduced-motion: reduce) { .op-pill { animation: none; } }

  /* the window: like ConfirmDialog, but fixed so it covers the screen from inside the title's corner */
  .op-scrim {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: max(12px, var(--safe-top)) max(12px, var(--safe-right)) max(12px, var(--safe-bottom)) max(12px, var(--safe-left));
    background: rgba(10, 6, 22, 0.62);
    cursor: default;
    pointer-events: auto; /* the title's corner passes taps through; the window must not */
  }
  .op-dialog {
    width: min(480px, 100%);
    max-height: 100%;
    overflow: auto;
    padding: 20px 20px 16px;
    gap: 12px;
    text-align: left;
  }
  .op-title {
    margin: 0;
    font-size: 22px;
    color: var(--sakura-1);
  }
  .op-msg {
    margin: 0;
    font-size: 16px;
    line-height: 1.55;
  }
  .op-meter {
    height: calc(var(--px) * 4);
    background: var(--ink);
    border: var(--px) solid var(--ink);
    box-shadow: 0 0 0 var(--px) rgba(255, 255, 255, 0.4);
  }
  .op-meter i {
    display: block;
    height: 100%;
    background: var(--sakura-2);
    box-shadow: inset 0 var(--px) 0 rgba(255, 255, 255, 0.35);
    transition: width 300ms steps(10);
  }
  .op-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 4px;
  }
  .op-buttons.one { grid-template-columns: minmax(0, 220px); justify-content: end; }
  .op-buttons .px-btn { width: 100%; min-height: 48px; font-size: 17px; }

  @media (max-height: 499px) {
    .op-dialog { padding: 14px 16px 12px; gap: 8px; }
    .op-title { font-size: 19px; }
    .op-msg { font-size: 15px; line-height: 1.45; }
    .op-buttons .px-btn { min-height: 44px; }
  }
</style>
