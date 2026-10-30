// Small typewriter with per-voice speed, punctuation pauses and text blips (GAME_DESIGN §14).
import type { VoiceId } from '../../types';
import { game } from '../../state/game.svelte';
import { blip } from './sfx';
import { BLIP_EVERY, VOICE_CPS, pauseAfter } from './typing';

export { VOICE_CPS, pauseAfter } from './typing';

const DEFAULT_SPEED = 40;

const LETTER = /[\p{L}\p{N}]/u;

export class Typewriter {
  text = $state('');
  shown = $state(0);
  done = $state(true);

  #timer: ReturnType<typeof setTimeout> | null = null;
  #voice: VoiceId = 'narrator';
  #letters = 0;
  #cps = DEFAULT_SPEED;
  #silent = false;
  #onDone: (() => void) | undefined;

  get visible(): string {
    return this.text.slice(0, this.shown);
  }

  start(text: string, voice: VoiceId = 'narrator', opts: { cps?: number; silent?: boolean; onDone?: () => void } = {}) {
    this.stop();
    this.text = text;
    this.shown = 0;
    this.done = false;
    this.#voice = voice;
    this.#letters = 0;
    this.#silent = !!opts.silent;
    this.#onDone = opts.onDone;
    const speed = game.save.settings.textSpeed;
    if (!(speed > 0)) {
      this.finish();
      return;
    }
    this.#cps = opts.cps ?? VOICE_CPS[voice] * (speed / DEFAULT_SPEED);
    this.#timer = setTimeout(this.#step, 60);
  }

  #step = () => {
    if (this.shown >= this.text.length) {
      this.finish();
      return;
    }
    const cp = this.text.codePointAt(this.shown) ?? 0;
    const ch = String.fromCodePoint(cp);
    this.shown += ch.length;
    if (LETTER.test(ch) && this.#letters++ % BLIP_EVERY[this.#voice] === 0 && !this.#silent) blip(this.#voice);
    const delay = 1000 / Math.max(1, this.#cps) + pauseAfter(ch, this.text[this.shown]);
    this.#timer = setTimeout(this.#step, delay);
  };

  /** Reveal everything now. */
  finish() {
    this.stop();
    this.shown = this.text.length;
    if (!this.done) {
      this.done = true;
      this.#onDone?.();
    }
  }

  stop() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }
}
