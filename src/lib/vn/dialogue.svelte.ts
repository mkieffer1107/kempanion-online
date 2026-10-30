// Reactive dialogue controller shared by scripted scenes and free chat: typewriter with per-voice speed,
// punctuation pauses and blips, streaming lines, choices, free-text asks, auto/skip, backlog, announcements.
import { PIG_IDS, type Expression, type PigId, type SpeakerId, type VoiceId } from '../types';
import { audio, VOICE_STYLE } from '../audio';
import { stage } from '../engine/stage';
import { game } from '../state/game.svelte';
import { speakerColor, speakerName } from '../content/characters';
import { DEFAULT_VOICE_STYLE, isBlipChar, msPerChar, paginate, pauseAfter } from './typewriter';

export interface LogLine {
  speaker: SpeakerId;
  name: string;
  text: string;
  color: string;
  expression?: Expression;
  /** 'choice' = an option the player picked. */
  kind?: 'line' | 'choice';
}

export interface LineHandle {
  /** Append streamed text (typewriter keeps revealing as text arrives). */
  append(delta: string): void;
  /**
   * Mark the text complete (optionally replacing it). Resolves when the player advances, or — with
   * `{ wait: false }` — as soon as the typewriter has revealed everything (free chat).
   */
  finish(finalText?: string, opts?: { wait?: boolean }): Promise<void>;
}

export interface AskOptions {
  prompt?: string;
  placeholder?: string;
  quickReplies?: string[];
  /** Show a "leave" button; choosing it resolves ask() with null. */
  allowLeave?: boolean;
  /** Max characters (default 140). */
  maxLength?: number;
  /** Accept an empty answer (e.g. [input] with a default). */
  allowEmpty?: boolean;
}

export interface SayOptions {
  /** The player has read this line before (skip mode may pass it). */
  read?: boolean;
  /** Reveal at once, no typewriter. */
  instant?: boolean;
  /** Blip voice (defaults to the speaker). */
  voice?: VoiceId;
  /** Whispered blips (asleep / late night): quieter and low-passed. */
  whisper?: boolean;
}

const LOG_CAP = 200;

/** Per-voice typewriter speed (chars/s at Normal) and blip spacing, from the audio module's voice sheet. */
function voiceStyle(voice: VoiceId): { cps: number; every: number } {
  const base = DEFAULT_VOICE_STYLE[voice] ?? DEFAULT_VOICE_STYLE.narrator;
  const v = VOICE_STYLE[voice];
  return { cps: v?.cps || base.cps, every: Math.max(1, Math.round(v?.everyN || base.every)) };
}

/** `?debug`: skip also passes unread lines. */
const SKIP_ALL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

const raf: (cb: (t: number) => void) => number = typeof requestAnimationFrame === 'function'
  ? (cb) => requestAnimationFrame(cb)
  : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
const cancelRaf = (id: number) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

const isPig = (s: SpeakerId): s is PigId => (PIG_IDS as readonly string[]).includes(s);

const BLIP_LETTERS = /[\p{L}\p{N}]/gu;

function lineEnding(text: string): '!' | '?' | '.' | '…' | undefined {
  const m = /([!?.…])["'”’)\]]*\s*$/.exec(text);
  return m ? (m[1] as '!' | '?' | '.' | '…') : undefined;
}

interface LineRun {
  pig: PigId | null;
  voice: VoiceId;
  whisper: boolean;
  msPer: number;
  every: number;
  letters: number;
  budget: number;
  last: number;
  delay: number;
  streamDone: boolean;
  instant: boolean;
  wait: boolean;
  read: boolean;
  done: boolean;
  log: boolean;
  announced: boolean;
  release: (() => void) | null;
  timer: ReturnType<typeof setTimeout> | null;
}

class DialogueController {
  visible = $state(false);
  speaker = $state<SpeakerId | null>(null);
  name = $state('');
  color = $state('');
  /** Full text of the current line (may still be growing while streaming). */
  text = $state('');
  /** Characters revealed so far by the typewriter. */
  shown = $state(0);
  typing = $state(false);
  /** Line complete and waiting for the player to advance (show ▼). */
  waiting = $state(false);
  /** The brain is thinking (show a "…" indicator). */
  thinking = $state(false);
  choices = $state<string[] | null>(null);
  input = $state<AskOptions | null>(null);
  log = $state<LogLine[]>([]);
  auto = $state(false);
  skip = $state(false);

  /** Expression of the current speaker (for UI; the stage portrait is set by beginLine). */
  expression = $state<Expression | null>(null);
  /** Ctrl held: skip read lines while held. */
  skipHeld = $state(false);
  /** H / HIDE: the text box is hidden until the next tap or key. */
  uiHidden = $state(false);
  backlogOpen = $state(false);
  /** Latest full line for the aria-live region. */
  announce = $state('');
  /** What is driving the box right now. */
  mode = $state<'scene' | 'chat' | null>(null);
  sceneId = $state<string | null>(null);
  /** Free chat is open: keep the chat input row on screen between turns. */
  chatOpen = $state(false);
  /** The current line was read before. */
  read = $state(false);

  /** Free chat sets this while the brain answers so Leave can abort it. */
  onLeave: (() => void) | null = null;

  #line: LineRun | null = null;
  #raf = 0;
  #talking: PigId | null = null;
  #choice: ((i: number) => void) | null = null;
  #ask: ((v: string | null) => void) | null = null;
  #pause: (() => void) | null = null;
  #flip = false;
  #gen = 0;

  /** Skip is active (toggle or Ctrl held). */
  get skipping(): boolean {
    return this.skip || this.skipHeld;
  }

  /** Increments on every cancel()/reset(): long-running loops (free chat) compare it to notice they were stopped. */
  get generation(): number {
    return this.#gen;
  }

  /** The part of the line the typewriter has revealed. */
  get revealed(): string {
    return this.text.slice(0, this.shown);
  }

  beginLine(speaker: SpeakerId, expression?: Expression, opts: SayOptions = {}): LineHandle {
    this.#closeLine();
    const pig = isPig(speaker) ? speaker : null;
    const voice = opts.voice ?? speaker;
    const style = voiceStyle(voice);
    const L: LineRun = {
      pig, voice, whisper: !!opts.whisper,
      msPer: opts.instant ? 0 : msPerChar(style.cps, game.save.settings.textSpeed), every: style.every,
      letters: 0, budget: 0, last: 0, delay: 0, streamDone: false, instant: !!opts.instant, wait: true, read: !!opts.read,
      done: false, log: true, announced: false, release: null, timer: null,
    };
    this.#line = L;
    if (this.skip && !L.read && !SKIP_ALL) this.skip = false;
    this.visible = true;
    this.speaker = speaker;
    this.name = speakerName(speaker, game.save.player.name);
    this.color = speakerColor(speaker);
    this.expression = expression ?? null;
    this.text = '';
    this.shown = 0;
    this.typing = true;
    this.waiting = false;
    this.read = L.read;
    if (pig && expression) stage.setExpression(pig, expression);

    return {
      append: (delta: string) => {
        if (this.#line !== L || L.streamDone || !delta) return;
        this.thinking = false;
        this.text += delta;
        this.#kick();
      },
      finish: (finalText?: string, o: { wait?: boolean } = {}) => {
        if (this.#line !== L) return Promise.resolve();
        L.wait = o.wait ?? true;
        if (finalText !== undefined && finalText !== this.text) {
          this.text = finalText;
          if (this.shown > finalText.length) this.shown = finalText.length;
        }
        L.streamDone = true;
        this.thinking = false;
        // Piggy 2's "Patriot." appears at once with his two-note signature blip.
        if (speaker === 'piggy-2' && /^patriot[.!]?$/i.test(this.text.trim()) && this.shown === 0) {
          L.instant = true;
          audio.blip('piggy-2', { signature: true, whisper: L.whisper });
        }
        if (L.log) this.#pushLog({ speaker, name: this.name, text: this.text, color: this.color, expression: this.expression ?? undefined });
        if (!L.announced) this.#announce(this.text);
        const done = new Promise<void>((resolve) => { L.release = resolve; });
        this.#kick();
        return done;
      },
    };
  }

  /** Show a whole line (long text pages at sentence boundaries) and wait for the player. */
  async say(speaker: SpeakerId, text: string, expression?: Expression, opts: SayOptions = {}): Promise<void> {
    const gen = this.#gen;
    this.#pushLog({ speaker, name: speakerName(speaker, game.save.player.name), text, color: speakerColor(speaker), expression });
    for (const page of paginate(text)) {
      const h = this.beginLine(speaker, expression, opts);
      const L = this.#line!;
      L.log = false;
      L.announced = true;
      this.#announce(page);
      h.append(page);
      await h.finish();
      if (gen !== this.#gen) return;
    }
  }

  /** Add a line to the backlog without showing it (e.g. the player's chat message when echo is off). */
  addLog(speaker: SpeakerId, text: string, expression?: Expression): void {
    this.#pushLog({ speaker, name: speakerName(speaker, game.save.player.name), text, color: speakerColor(speaker), expression });
  }

  /** Numbered options (never timed). Resolves with the picked index. Stops skip mode. */
  choose(options: string[]): Promise<number> {
    if (this.#choice) this.pick(0);
    const L = this.#line;
    if (L && !L.done) this.advance();
    this.visible = true;
    this.waiting = false;
    this.skip = false;
    this.choices = options.slice();
    return new Promise((resolve) => { this.#choice = resolve; });
  }

  /** Pick option i of the open choice menu. */
  pick(i: number): void {
    const opts = this.choices;
    const resolve = this.#choice;
    if (!opts || !resolve || i < 0 || i >= opts.length) return;
    this.#choice = null;
    this.choices = null;
    this.#pushLog({ speaker: 'player', name: speakerName('player', game.save.player.name), text: opts[i], color: speakerColor('player'), kind: 'choice' });
    audio.sfx('ui_select');
    resolve(i);
  }

  /** Free text from the player (chat input). Resolves with the text, or null when they leave. */
  ask(opts: AskOptions = {}): Promise<string | null> {
    if (this.#ask) { const r = this.#ask; this.#ask = null; r(null); }
    const L = this.#line;
    if (L && L.done && this.waiting) this.#continue(L);
    this.visible = true;
    this.skip = false;
    this.input = { ...opts };
    return new Promise((resolve) => { this.#ask = resolve; });
  }

  /** Answer the open ask(). Returns false when there is nothing to send. */
  submit(text: string): boolean {
    const o = this.input;
    const resolve = this.#ask;
    if (!o || !resolve) return false;
    const t = text.trim().slice(0, o.maxLength ?? 140);
    if (!t && !o.allowEmpty) return false;
    this.#ask = null;
    this.input = null;
    resolve(t);
    return true;
  }

  /** Leave button: resolves the open ask() with null, or aborts a thinking brain. */
  leave(): void {
    if (this.#ask) {
      const r = this.#ask;
      this.#ask = null;
      this.input = null;
      r(null);
      return;
    }
    this.onLeave?.();
  }

  /** "…" indicator while a brain works; with a speaker, the box switches to that name plate first. */
  setThinking(on: boolean, speaker?: SpeakerId): void {
    if (on && speaker) {
      this.#closeLine();
      this.visible = true;
      this.speaker = speaker;
      this.name = speakerName(speaker, game.save.player.name);
      this.color = speakerColor(speaker);
      this.text = '';
      this.shown = 0;
    }
    this.thinking = on;
  }

  /** Wait ms (a tap or Enter ends it early). */
  pause(ms: number): Promise<void> {
    if (!(ms > 0)) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(t);
        if (this.#pause === done) this.#pause = null;
        resolve();
      };
      const t = setTimeout(done, ms);
      this.#pause = done;
    });
  }

  /** Player pressed advance (click/tap/Space/Enter): finish typing, or continue. */
  advance(): void {
    if (this.uiHidden) { this.uiHidden = false; return; }
    if (this.backlogOpen || this.choices || this.input) return;
    if (this.#pause) { this.#pause(); return; }
    const L = this.#line;
    if (!L) return;
    if (!L.done) {
      L.instant = true;
      this.shown = this.text.length;
      this.#setTalking(null);
      if (L.streamDone) {
        if (this.#raf) { cancelRaf(this.#raf); this.#raf = 0; }
        this.#complete(L);
      }
      return;
    }
    if (this.waiting) this.#continue(L);
  }

  hide(): void { this.visible = false; }

  /** Hide the box until the next line (scene transitions, CGs, UI hooks); releases a waiting line. */
  conceal(): void {
    this.#closeLine();
    this.visible = false;
    this.text = '';
    this.shown = 0;
    this.speaker = null;
    this.name = '';
  }

  /** Resolve every pending wait (stopping a scene or chat): lines continue, choices pick 0, asks return null. */
  cancel(): void {
    this.#gen++;
    this.onLeave?.();
    this.#closeLine();
    if (this.#choice) { const r = this.#choice; this.#choice = null; this.choices = null; r(0); }
    if (this.#ask) { const r = this.#ask; this.#ask = null; this.input = null; r(null); }
    this.#pause?.();
    this.thinking = false;
  }

  /** Back to an idle, hidden box (end of a scene or chat). The backlog is kept. */
  reset(): void {
    this.cancel();
    this.visible = false;
    this.text = '';
    this.shown = 0;
    this.speaker = null;
    this.name = '';
    this.expression = null;
    this.chatOpen = false;
    this.skip = false;
    this.skipHeld = false;
    this.uiHidden = false;
    this.mode = null;
    this.sceneId = null;
    this.onLeave = null;
  }

  toggleAuto(): void {
    this.auto = !this.auto;
    audio.sfx('ui_toggle');
    this.#reschedule();
  }

  toggleSkip(): void {
    this.skip = !this.skip;
    audio.sfx('ui_toggle');
    this.#reschedule();
    this.#kick();
  }

  setSkipHeld(on: boolean): void {
    if (this.skipHeld === on) return;
    this.skipHeld = on;
    this.#reschedule();
    this.#kick();
  }

  toggleHidden(): void {
    if (!this.visible && !this.uiHidden) return;
    this.uiHidden = !this.uiHidden;
  }

  openBacklog(): void {
    if (this.backlogOpen || !this.log.length) return;
    this.backlogOpen = true;
    audio.sfx('ui_open');
  }

  closeBacklog(): void {
    if (!this.backlogOpen) return;
    this.backlogOpen = false;
    audio.sfx('ui_close');
  }

  /**
   * Default VN keys (Enter/Space/Z/X advance, A auto, S skip, Ctrl hold skip, L/PageUp log, H/Delete hide).
   * Call with keydown and keyup events; returns true when handled (then preventDefault).
   * Choices (↑↓ 1–4) and the chat field handle their own keys.
   */
  handleKey(e: KeyboardEvent): boolean {
    if (e.key === 'Control') {
      this.setSkipHeld(e.type === 'keydown' && (this.visible || this.skipHeld));
      return false;
    }
    if (e.type !== 'keydown' || e.altKey || e.metaKey || e.ctrlKey) return false;
    if (this.backlogOpen) {
      if (e.key === 'Escape' || e.key === 'l' || e.key === 'L') { this.closeBacklog(); return true; }
      return false;
    }
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return false;
    if (this.uiHidden) { this.uiHidden = false; return true; }
    if (!this.visible) return false;
    switch (e.key) {
      case 'Enter': case ' ': case 'z': case 'Z': case 'x': case 'X':
        if (this.choices || this.input) return false;
        if ((e.key === 'Enter' || e.key === ' ') && t?.closest?.('button, a[href], [role="button"]')) return false;
        if (!e.repeat) this.advance();
        return true;
      case 'a': case 'A': this.toggleAuto(); return true;
      case 's': case 'S': this.toggleSkip(); return true;
      case 'l': case 'L': case 'PageUp': this.openBacklog(); return true;
      case 'h': case 'H': case 'Delete': this.toggleHidden(); return true;
    }
    return false;
  }

  // ───────── internals ─────────

  #kick(): void {
    const L = this.#line;
    if (!L || L.done || this.#raf) return;
    this.#raf = raf(this.#frame);
  }

  #frame = (t: number): void => {
    this.#raf = 0;
    const L = this.#line;
    if (!L || L.done) return;
    const text = this.text;
    if (L.instant || L.msPer === 0 || (this.skipping && (L.read || SKIP_ALL))) {
      this.shown = text.length;
    } else {
      L.budget += L.last ? Math.min(100, t - L.last) : 1000 / 60;
      L.last = t;
      let i = this.shown;
      let blipAt = -1;
      while (i < text.length && L.budget >= L.delay) {
        L.budget -= L.delay;
        const ch = String.fromCodePoint(text.codePointAt(i)!);
        if (isBlipChar(ch)) {
          if (L.letters % L.every === 0) blipAt = i;
          L.letters++;
        }
        i += ch.length;
        L.delay = L.msPer + pauseAfter(text, i - 1);
      }
      if (blipAt >= 0) {
        const ch = String.fromCodePoint(text.codePointAt(blipAt)!);
        // Last blip of the line: fewer letters remain than the blip spacing.
        const last = L.streamDone && (text.slice(blipAt + ch.length).match(BLIP_LETTERS)?.length ?? 0) < L.every;
        audio.blip(L.voice, { char: ch, index: blipAt, last, ending: lineEnding(text), whisper: L.whisper });
      }
      this.shown = i;
    }
    const caughtUp = this.shown >= text.length;
    this.#setTalking(caughtUp ? null : L.pig);
    if (!caughtUp) {
      this.#raf = raf(this.#frame);
      return;
    }
    // Waiting for more streamed text: restart the clock when it arrives.
    L.last = 0;
    L.budget = 0;
    if (L.streamDone) this.#complete(L);
  };

  #complete(L: LineRun): void {
    L.done = true;
    this.typing = false;
    this.#setTalking(null);
    if (L.wait) {
      this.waiting = true;
      this.#schedule(L);
    } else {
      this.#release(L);
    }
  }

  /** Auto mode / skip mode continue a waiting line on their own. */
  #schedule(L: LineRun): void {
    if (L.timer) { clearTimeout(L.timer); L.timer = null; }
    if (this.#line !== L || !this.waiting) return;
    if (this.skip || (this.skipHeld && (L.read || SKIP_ALL))) {
      L.timer = setTimeout(() => this.#continue(L), 50);
    } else if (this.auto) {
      const delay = game.save.settings.autoDelay * 1000 + 25 * this.text.length;
      L.timer = setTimeout(() => this.#continue(L), delay);
    }
  }

  #reschedule(): void {
    const L = this.#line;
    if (L && L.done && this.waiting) this.#schedule(L);
  }

  #continue(L: LineRun): void {
    if (this.#line !== L) return;
    if (L.timer) { clearTimeout(L.timer); L.timer = null; }
    this.waiting = false;
    this.#release(L);
  }

  #release(L: LineRun): void {
    const r = L.release;
    L.release = null;
    r?.();
  }

  #closeLine(): void {
    const L = this.#line;
    if (!L) return;
    if (L.timer) clearTimeout(L.timer);
    L.done = true;
    this.#line = null;
    if (this.#raf) { cancelRaf(this.#raf); this.#raf = 0; }
    this.#setTalking(null);
    this.typing = false;
    this.waiting = false;
    this.#release(L);
  }

  #setTalking(pig: PigId | null): void {
    if (this.#talking === pig) return;
    this.#talking = pig;
    stage.setTalking(pig);
  }

  #announce(text: string): void {
    this.#flip = !this.#flip;
    this.announce = `${this.name ? `${this.name}: ` : ''}${text}${this.#flip ? '​' : ''}`;
  }

  #pushLog(line: LogLine): void {
    this.log.push(line);
    if (this.log.length > LOG_CAP) this.log.splice(0, this.log.length - LOG_CAP);
  }
}

export const dialogue = new DialogueController();
