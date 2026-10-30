<script lang="ts">
  // Free-chat replies as VN choices (the scene ChoiceMenu look: navy rows, pink selection, ▶ cursor, stepped
  // slide-in, never timed). Rows 1–3 are the brain's quick replies; the last row, "Say something else…", folds the
  // others away and turns into a one-line field styled like a row (same size, padding, DotGothic16 font, number
  // badge). The field takes as many characters as fit on that line (≤ the ask's maxLength; DotGothic16 draws ASCII
  // at 0.5em), Enter sends, Esc or × brings the options back, and an empty field can't be sent. Goodbye leaves.
  // Shown only while the pig waits for the player (free chat with an open ask); hidden while he types or thinks.
  //
  // Keys (window, like ChoiceMenu): 1–4 · ↑↓ · Enter/Space/Z/X. screenKey() adds T or / (open the field) and Esc
  // (close it) for screens that route keys through setScreenKeys (App offers them before its own shortcuts).
  import { flushSync, tick, untrack } from 'svelte';
  import { audio } from '../../audio';
  import { game } from '../../state/game.svelte';
  import { dialogue } from '../dialogue.svelte';
  import { charsLeftHint, fitChars, replyRows } from './chat-choices';
  import { liftAboveKeyboard } from './keyboard';

  let {
    keyboard = true,
    goodbye = true,
    lift = true,
    fill = false,
    class: klass = '',
  }: {
    /** Handle 1–4 / ↑↓ / Enter on the window while the options show. */
    keyboard?: boolean;
    /** Show the Goodbye button under the options. */
    goodbye?: boolean;
    /** Lift the options above the on-screen keyboard while typing (false when the parent lifts a bigger block). */
    lift?: boolean;
    /** Stretch to the full width of the parent (phone portrait) instead of at most 30.5em. */
    fill?: boolean;
    class?: string;
  } = $props();

  /** Message cap when the ask doesn't set one (free chat sets FREE_CHAT_MAX_CHARS = 48). */
  const DEFAULT_MAX = 48;
  const reduceQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduceNow = () => game.save.settings.reduceMotion || !!reduceQuery?.matches;

  const opts = $derived(dialogue.chatOpen ? dialogue.input : null);
  const ready = $derived(!!opts && !dialogue.thinking && !dialogue.typing && !dialogue.uiHidden);
  const replies = $derived(replyRows(opts?.quickReplies));
  /** Index of the "Say something else…" row (after the quick replies). */
  const other = $derived(replies.length);
  const reduce = $derived(game.save.settings.reduceMotion);
  const name = $derived(dialogue.name || 'him');

  let writing = $state(false);
  let value = $state('');
  let sel = $state(0);
  /** Characters that fit on one line of the field (measured). */
  let fit = $state(DEFAULT_MAX);
  const max = $derived(Math.min(Math.max(1, opts?.maxLength ?? DEFAULT_MAX), fit));
  const left = $derived(charsLeftHint(value.length, max));
  const rows = $derived(writing ? [] : replies);

  let rootEl: HTMLDivElement | undefined = $state();
  let field: HTMLInputElement | undefined = $state();
  let buttons: HTMLButtonElement[] = $state([]);
  // A tap that finished the previous line must not land on an option that just appeared under the finger.
  let armedAt = Infinity;
  let turnOf: object | null = null;
  /** The last message was typed: the next turn preselects "Say something else…" (Enter / 4 reopens the field). */
  let preferOther = false;

  /** The options appeared: arm them, pick the starting row for a new turn, take keyboard focus if nothing else has it. */
  function turnStart(node: HTMLElement) {
    armedAt = performance.now() + 280;
    untrack(() => {
      if (opts !== turnOf) {
        turnOf = opts;
        sel = preferOther ? replies.length : 0;
        preferOther = false;
      }
    });
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body || a.closest('.vn, .cc')) node.querySelector<HTMLElement>('.menu')?.focus({ preventScroll: true });
  }

  /** Keep `fit` equal to what one line of the field holds (layout, font loading, rotation). */
  function measure(el: HTMLInputElement) {
    const update = () => {
      const cs = getComputedStyle(el);
      const width = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      fit = fitChars(width, parseFloat(cs.fontSize) || 16, DEFAULT_MAX);
    };
    update();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    void document.fonts?.ready.then(update);
    return () => ro?.disconnect();
  }

  /** Rows 1–3 fold away in steps (instant under reduced motion), the last one first. */
  function fold(node: HTMLElement, { i }: { i: number }) {
    if (reduceNow()) return { duration: 0 };
    const h = node.offsetHeight;
    const n = untrack(() => replies.length);
    return {
      delay: Math.max(0, n - 1 - i) * 40,
      duration: 120,
      css: (t: number) => {
        const s = Math.ceil(t * 3) / 3;
        return `min-height:0;height:${Math.round(h * s)}px;opacity:${s};overflow:hidden;`;
      },
    };
  }

  function choose(i: number) {
    if (!ready || performance.now() < armedAt) return;
    if (i === other) {
      openField();
      return;
    }
    const text = replies[i];
    if (!text) return;
    sel = i;
    audio.sfx('ui_select');
    dialogue.submit(text);
  }

  function openField() {
    if (!ready) return;
    if (writing) {
      field?.focus({ preventScroll: true });
      return;
    }
    sel = other;
    audio.sfx('ui_open');
    // Mount the field now so focus() runs inside the tap: iOS only opens the keyboard from a user gesture.
    flushSync(() => {
      writing = true;
    });
    field?.focus({ preventScroll: true });
  }

  function closeField(refocus = true) {
    if (!writing) return;
    audio.sfx('ui_close');
    writing = false;
    sel = other;
    if (refocus) void tick().then(() => buttons[other]?.focus({ preventScroll: true }));
  }

  function send(e: SubmitEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!ready || !text) {
      field?.focus({ preventScroll: true });
      return;
    }
    if (!dialogue.submit(text)) return;
    audio.sfx('ui_select');
    value = '';
    writing = false;
    preferOther = true;
  }

  function fieldKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    closeField();
  }

  // Leaving an empty field (tapping elsewhere, the phone keyboard's Done) brings the options back.
  function fieldBlur() {
    setTimeout(() => {
      if (!writing || value.trim() || !document.hasFocus()) return;
      const a = document.activeElement;
      if (a && rootEl?.contains(a)) return;
      closeField(false);
    }, 0);
  }

  function move(d: number) {
    const count = replies.length + 1;
    sel = (sel + d + count) % count;
    buttons[sel]?.focus({ preventScroll: true });
    audio.sfx('ui_move');
  }

  function bye() {
    audio.sfx('ui_back');
    dialogue.leave();
  }

  function onkeydown(e: KeyboardEvent) {
    if (!keyboard || !ready || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || dialogue.backlogOpen) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"], [aria-modal="true"]')) return;
    // Enter/Space on any other button (×, Goodbye, the top bar…) presses that button, not the selected row.
    const otherButton = !t?.closest?.('button.opt') && !!t?.closest?.('button, a[href], [role="button"]');
    if (writing) {
      if (e.key === 'Enter' && !otherButton) {
        e.preventDefault();
        field?.focus({ preventScroll: true });
      }
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i <= other) {
        e.preventDefault();
        if (!e.repeat) choose(i);
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
        if (otherButton && (e.key === 'Enter' || e.key === ' ')) return;
        e.preventDefault();
        if (!e.repeat) choose(sel);
        break;
    }
  }

  /** For setScreenKeys: T or / opens the field, Esc closes it. True when handled. */
  export function screenKey(e: KeyboardEvent): boolean {
    if (!ready || e.ctrlKey || e.metaKey || e.altKey || dialogue.backlogOpen) return false;
    if (e.key === 'Escape' && writing) {
      closeField();
      return true;
    }
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return false;
    if (!writing && (e.key === 't' || e.key === 'T' || e.key === '/')) {
      openField();
      return true;
    }
    return false;
  }
</script>

<svelte:window {onkeydown} />

{#snippet pencil()}
  <svg class="pen" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M6 0h1v1h-1zM5 1h3v1h-3zM4 2h3v1h-3zM3 3h3v1h-3zM2 4h3v1h-3zM1 5h3v1h-3zM1 6h2v1h-2zM0 7h1v1h-1z" />
  </svg>
{/snippet}

{#if ready}
  <div
    bind:this={rootEl}
    class="cc {klass}"
    class:rm={reduce}
    class:fill
    use:liftAboveKeyboard={lift && writing}
    {@attach turnStart}
  >
    <div class="menu" role={writing ? 'group' : 'menu'} tabindex="-1" aria-label="Reply to {name}">
      {#each rows as text, i (text)}
        <button
          bind:this={buttons[i]}
          type="button"
          role="menuitem"
          class="opt"
          class:sel={i === sel}
          style:--i={i}
          out:fold={{ i }}
          onclick={(e) => { e.stopPropagation(); choose(i); }}
          onpointerenter={() => (sel = i)}
          onfocus={() => (sel = i)}
        >
          <span class="num" aria-hidden="true">{i + 1}</span>
          <span class="cur" aria-hidden="true">▶</span>
          <span class="label">{text}</span>
        </button>
      {/each}

      {#if writing}
        <form class="opt field" onsubmit={send}>
          <label class="fl">
            <span class="num" aria-hidden="true">{other + 1}</span>
            <span class="cur on" aria-hidden="true">{@render pencil()}</span>
            <input
              bind:this={field}
              bind:value
              {@attach measure}
              data-chat-input
              type="text"
              maxlength={max}
              enterkeyhint="send"
              autocomplete="off"
              autocapitalize="sentences"
              spellcheck="true"
              placeholder={opts?.placeholder ?? `Say something to ${name}…`}
              aria-label="Your reply to {name}"
              onkeydown={fieldKey}
              onblur={fieldBlur}
            />
          </label>
          {#if left !== null}
            <span class="left" class:none={left === 0} aria-hidden="true">{left}</span>
          {/if}
          <button type="button" class="x" aria-label="Back to the reply options" title="Back (Esc)" onclick={(e) => { e.stopPropagation(); closeField(); }}>×</button>
        </form>
      {:else}
        <button
          bind:this={buttons[other]}
          type="button"
          role="menuitem"
          class="opt"
          class:sel={sel === other}
          style:--i={other}
          title="Type your own reply (T)"
          onclick={(e) => { e.stopPropagation(); choose(other); }}
          onpointerenter={() => (sel = other)}
          onfocus={() => (sel = other)}
        >
          <span class="num" aria-hidden="true">{other + 1}</span>
          <span class="cur" aria-hidden="true">▶</span>
          <span class="label">{@render pencil()} Say something else…</span>
        </button>
      {/if}
    </div>

    {#if goodbye}
      <div class="foot">
        <button type="button" class="px-btn ghost small bye" title="Say goodbye (Esc)" onclick={(e) => { e.stopPropagation(); bye(); }}>Goodbye</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .cc {
    display: flex;
    flex-direction: column;
    gap: calc(var(--px) * 2);
    width: min(100%, 30.5em);
    pointer-events: auto;
    font-family: var(--font-body);
  }
  .cc.fill { width: 100%; }
  .menu {
    display: flex;
    flex-direction: column;
    gap: calc(var(--px) * 2);
    outline: none;
  }

  /* ── one option row: identical to the scene ChoiceMenu ── */
  .opt {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 0.5em;
    width: 100%;
    min-height: 44px;
    margin: 0;
    padding: 0.35em 0.8em;
    text-align: left;
    font: inherit;
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
  .pen { display: inline-block; width: 0.8em; height: 0.8em; vertical-align: -0.05em; }

  /* ── "Say something else…" as a field: same box, navy, pink edge while typing ── */
  .opt.field {
    position: relative;
    padding-right: 0;
    cursor: text;
    animation: none;
  }
  .opt.field:focus-within {
    border-color: var(--sakura-3);
    outline: var(--px) solid var(--sakura-2);
    outline-offset: 0;
  }
  .fl {
    display: flex;
    align-items: center;
    gap: 0.5em;
    flex: 1;
    min-width: 0;
    align-self: stretch;
    cursor: text;
  }
  .cur.on { visibility: visible; color: var(--sakura-2); }
  .cur.on .pen { width: 1em; height: 1em; }
  .fl input {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    outline: none;
    font: inherit;
    line-height: 1.3;
    letter-spacing: 0;
    color: var(--box-text);
    background: transparent;
    text-shadow: 1px 1px 0 #000;
    caret-color: var(--sakura-2);
    user-select: text;
    -webkit-user-select: text;
  }
  .fl input::placeholder { color: rgba(255, 250, 243, 0.5); text-shadow: none; opacity: 1; }
  .left {
    position: absolute;
    top: 0;
    right: 2.6em;
    transform: translateY(-60%);
    padding: 0 0.35em;
    font-family: var(--font-display);
    font-size: 0.62em;
    line-height: 1.4;
    color: var(--ink);
    background: var(--gold);
    border: calc(var(--px) * 0.67) solid var(--ink);
    text-shadow: none;
    pointer-events: none;
  }
  .left.none { background: var(--sakura-3); }
  .x {
    flex: none;
    align-self: stretch;
    display: grid;
    place-items: center;
    min-width: 1.8em;
    margin: -0.35em 0;
    padding: 0 0.5em;
    font: inherit;
    line-height: 1;
    color: var(--box-text);
    background: transparent;
    border: 0;
    border-left: var(--px) solid rgba(255, 214, 224, 0.35);
    text-shadow: 1px 1px 0 #000;
    cursor: pointer;
  }
  .x:hover { color: var(--sakura-2); }
  .x:focus-visible { outline: var(--px) dashed var(--gold); outline-offset: calc(var(--px) * -2); }
  @media (pointer: coarse) {
    .x { min-width: 44px; }
    .left { right: calc(44px + 0.6em); }
  }

  .foot { display: flex; justify-content: flex-end; }
  .bye {
    font-family: var(--font-display);
    letter-spacing: 0.06em;
    font-size: max(14px, 0.62em);
  }

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
