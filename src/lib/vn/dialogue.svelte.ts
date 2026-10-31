// Reactive dialogue controller shared by scripted scenes and free chat: typewriter with per-voice speed,
// punctuation pauses and blips, streaming lines, choices, free-text asks, auto/skip, backlog, announcements.
import { PIG_IDS, type Expression, type PigId, type SpeakerId, type VoiceId } from '../types';
import { audio, VOICE_STYLE } from '../audio';
import { stage } from '../engine/stage';
import { game } from '../state/game.svelte';
import { speakerColor, speakerName } from '../content/characters';
import { enteredName } from './name-entry';
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
  /** Intake name/food answers require confirmation; names keep their keyboard, cleanup and blank default. */
  kind?: 'name' | 'food';
  initial?: string;
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
  /** Small, quiet delivery independent of the portrait pose. */
  mumble?: boolean;
  /** Scene-local name plate (e.g. "???" before an introduction); also captured in this line's backlog entry. */
  name?: string;
  /** The player has read this line before (skip mode may pass it). */
  read?: boolean;
  /** Reveal at once, no typewriter. */
  instant?: boolean;
  /** Blip voice (defaults to the speaker). */
  voice?: VoiceId;
  /** Whispered blips (asleep / late night): quieter and low-passed. */
  whisper?: boolean;
  /**
   * Typewriter speed × this (default 1): letters and punctuation pauses both go `rate` times faster, and blips come
   * every `rate` × as many letters, so the voice keeps its pace. Piggy 3's mumble runs at 2.
   */
  rate?: number;
}

const LOG_CAP = 200;

/** Per-voice typewriter speed (chars/s at Normal) and blip spacing, from the audio module's voice sheet. */
function voiceStyle(voice: VoiceId): { cps: number; every: number } {
  const base = DEFAULT_VOICE_STYLE[voice] ?? DEFAULT_VOICE_STYLE.narrator;
  const v = VOICE_STYLE[voice];
  return { cps: v?.cps || base.cps, every: Math.max(1, Math.round(v?.everyN || base.every)) };
}

/** `?debug`: skip always passes unread lines, whatever the setting says. */
const DEBUG_SKIP_ALL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

/** SKIP / Ctrl fast-forward unread lines too, unless Settings → "Skip only text I've read" is on. */
function skipAll(): boolean {
  return DEBUG_SKIP_ALL || game.save.flags['ui.skipReadOnly'] !== true;
}

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
  /** SayOptions.rate: punctuation pauses are divided by it too. */
  rate: number;
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
  /** Intake answers only return to the story after the player confirms the normalized draft. */
  pendingAnswer = $state<string | null>(null);
  log = $state<LogLine[]>([]);
  auto = $state(false);
  skip = $state(false);

  /** Expression of the current speaker (for UI; the stage portrait is set by beginLine). */
  expression = $state<Expression | null>(null);
  mumbling = $state(false);
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
    const rate = opts.rate !== undefined && opts.rate > 0 ? opts.rate : 1;
    const L: LineRun = {
      pig, voice, whisper: !!opts.whisper, rate,
      msPer: opts.instant ? 0 : msPerChar(style.cps, game.save.settings.textSpeed) / rate,
      every: Math.max(1, Math.round(style.every * rate)),
      letters: 0, budget: 0, last: 0, delay: 0, streamDone: false, instant: !!opts.instant, wait: true, read: !!opts.read,
      done: false, log: true, announced: false, release: null, timer: null,
    };
    this.#line = L;
    if (this.skip && !L.read && !skipAll()) this.skip = false;
    this.visible = true;
    this.speaker = speaker;
    stage.setSpeaker(pig);
    this.name = opts.name ?? speakerName(speaker, game.save.player.name);
    this.color = speakerColor(speaker);
    this.expression = expression ?? null;
    this.mumbling = !!opts.mumble;
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
    this.#pushLog({ speaker, name: opts.name ?? speakerName(speaker, game.save.player.name), text, color: speakerColor(speaker), expression });
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
    this.stopSkip();
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
    this.pendingAnswer = null;
    const L = this.#line;
    if (L && L.done && this.waiting) this.#continue(L);
    this.visible = true;
    this.stopSkip();
    this.input = { ...opts };
    return new Promise((resolve) => { this.#ask = resolve; });
  }

  /** Answer the open ask(). Returns false when there is nothing to send. */
  submit(text: string): boolean {
    const o = this.input;
    const resolve = this.#ask;
    if (!o || !resolve || this.pendingAnswer !== null) return false;
    const typed = text.trim().slice(0, o.maxLength ?? 140);
    const t = o.kind === 'name' ? enteredName(text) : o.kind === 'food' ? typed || o.placeholder || '' : typed;
    if (!t && !o.allowEmpty) return false;
    if (o.kind === 'name' || o.kind === 'food') {
      this.pendingAnswer = t;
      return true;
    }
    this.#ask = null;
    this.input = null;
    resolve(t);
    return true;
  }

  /** Commit the exact intake answer shown in the confirmation, without normalizing it again. */
  confirmAnswer(): boolean {
    if (!this.input?.kind || this.pendingAnswer === null || !this.#ask) return false;
    const answer = this.pendingAnswer;
    const resolve = this.#ask;
    this.#ask = null;
    this.input = null;
    this.pendingAnswer = null;
    resolve(answer);
    return true;
  }

  /** Return to the same question with the proposed answer ready to edit. */
  editAnswer(): void {
    if (!this.input?.kind || this.pendingAnswer === null) return;
    this.input = { ...this.input, initial: this.pendingAnswer };
    this.pendingAnswer = null;
  }

  /** Leave button: resolves the open ask() with null, or aborts a thinking brain. */
  leave(): void {
    this.pendingAnswer = null;
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
      this.mumbling = false;
      this.#closeLine();
      this.visible = true;
      this.speaker = speaker;
      stage.setSpeaker(isPig(speaker) ? speaker : null);
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

  hide(): void { this.visible = false; this.mumbling = false; stage.setSpeaker(null); }

  /** Hide the box until the next line (scene transitions, CGs, UI hooks); releases a waiting line. */
  conceal(): void {
    this.mumbling = false;
    this.#closeLine();
    this.visible = false;
    this.text = '';
    this.shown = 0;
    this.speaker = null;
    stage.setSpeaker(null);
    this.name = '';
  }

  /** Resolve every pending wait (stopping a scene or chat): lines continue, choices pick 0, asks return null. */
  cancel(): void {
    this.pendingAnswer = null;
    this.mumbling = false;
    this.#gen++;
    this.onLeave?.();
    this.backlogOpen = false; // leaving with LOG open must not reopen it in the next chat or scene
    this.#closeLine();
    stage.setSpeaker(null);
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

  /**
   * SKIP mode off. Every player decision calls this: choices, [input], and the scene runner's name window,
   * companion pick and mini-games, so what follows the decision is not skipped past.
   */
  stopSkip(): void {
    if (!this.skip) return;
    this.skip = false;
    this.#reschedule();
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

  /** AUTO and SKIP wait while the LOG is open (nothing moves on behind it) and go on when it closes. */
  openBacklog(): void {
    if (this.backlogOpen || !this.log.length) return;
    this.backlogOpen = true;
    audio.sfx('ui_open');
    this.#reschedule();
  }

  closeBacklog(): void {
    if (!this.backlogOpen) return;
    this.backlogOpen = false;
    audio.sfx('ui_close');
    this.#reschedule();
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
    if (L.instant || L.msPer === 0 || (this.skipping && (L.read || skipAll()))) {
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
        L.delay = L.msPer + pauseAfter(text, i - 1) / L.rate;
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

  /** Auto mode / skip mode continue a waiting line on their own (not while the LOG is open). */
  #schedule(L: LineRun): void {
    if (L.timer) { clearTimeout(L.timer); L.timer = null; }
    if (this.#line !== L || !this.waiting || this.backlogOpen) return;
    if (this.skip || (this.skipHeld && (L.read || skipAll()))) {
      L.timer = setTimeout(() => this.#continue(L), 50);
    } else if (this.auto) {
      const delay = game.save.settings.autoDelay * 1000;
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
