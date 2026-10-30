// Typewriter blip voices (GAME_DESIGN §14 "Blip voices"): short "Ace Attorney" ticks per speaker.
// Pure TS: the engine turns BlipCalls into synth blips; tests and the music room can inspect them.
import type { VoiceId } from '../types';
import type { BlipOptions } from './api';
import type { Wave } from './encode';
import { midiToFreq } from './mml';

export interface VoiceStyle {
  /** Blip on every Nth letter (spaces/punctuation don't count). */
  everyN: number;
  /** Typewriter speed at "Normal" (characters per second). */
  cps: number;
}

export const VOICE_STYLE: Record<VoiceId, VoiceStyle> = {
  'piggy-1': { everyN: 2, cps: 45 },
  'piggy-2': { everyN: 3, cps: 35 },
  'piggy-3': { everyN: 2, cps: 32 },
  player: { everyN: 2, cps: 40 },
  narrator: { everyN: 3, cps: 40 },
  system: { everyN: 4, cps: 40 },
};

export interface BlipCall {
  wave: Wave;
  freq: number;
  lenMs: number;
  vol: number;
  attackMs: number;
  releaseMs: number;
  /** Pitch bend over the blip (semitones). */
  glide: number;
  /** Low-pass cutoff in Hz (0 = off). */
  lowpass: number;
  pan: number;
}

export interface VoiceDef {
  wave: Wave;
  /** Base pitch (MIDI). */
  base: number;
  /** Semitone offsets picked per blip (repeats = weight). */
  steps: readonly number[];
  /** Extra random detune, ± semitones. */
  jitter: number;
  /** Slow wandering drift (± semitones at driftHz). */
  drift?: number;
  driftHz?: number;
  lenMs: number;
  vol: number;
  attackMs: number;
  releaseMs: number;
  /** Simultaneous companion blip (Piggy 2's triangle an octave below). */
  sub?: { wave: Wave; semis: number; vol: number };
  /** Lines ending in "!": lift (semitones) and gain. */
  excl: number;
  exclGain: number;
  /** Last blip before "?": upward bend (semitones). */
  quest: number;
}

export const VOICES: Record<VoiceId, VoiceDef> = {
  // bright 50% square around D5, bouncy pentatonic steps within ±2 semitones (C5 D5 E5)
  'piggy-1': {
    wave: 'pulse50', base: 74, steps: [0, 2, 0, -2, 2, 0], jitter: 0.05,
    lenMs: 30, vol: 0.2, attackMs: 1, releaseMs: 6, excl: 3, exclGain: 1.12, quest: 2,
  },
  // nasal 12.5% pulse on G3 + triangle an octave below; steady, clipped
  'piggy-2': {
    wave: 'pulse12', base: 55, steps: [0], jitter: 0.5,
    lenMs: 45, vol: 0.2, attackMs: 1, releaseMs: 2, sub: { wave: 'tri', semis: -12, vol: 0.3 },
    excl: 2, exclGain: 1.41, quest: 0,
  },
  // soft triangle around B4 with an 8 ms attack, wandering ±1 semitone (random step + slow 0.3 Hz drift)
  'piggy-3': {
    wave: 'tri', base: 71, steps: [0, 0.5, -0.5, 0], jitter: 0.1, drift: 0.4, driftHz: 0.3,
    lenMs: 35, vol: 0.32, attackMs: 8, releaseMs: 12, excl: 2, exclGain: 1.12, quest: 4,
  },
  player: {
    wave: 'pulse12', base: 67, steps: [0, 2, -2, 0, 3], jitter: 0.1,
    lenMs: 28, vol: 0.15, attackMs: 1, releaseMs: 6, excl: 2, exclGain: 1.1, quest: 2,
  },
  narrator: {
    wave: 'sine', base: 52, steps: [0, 0, -2, 3], jitter: 0.1,
    lenMs: 40, vol: 0.24, attackMs: 4, releaseMs: 15, excl: 1, exclGain: 1, quest: 1,
  },
  // 1200 Hz sine tick, about −12 dB under the character voices
  system: {
    wave: 'sine', base: 69 + 12 * Math.log2(1200 / 440), steps: [0], jitter: 0,
    lenMs: 25, vol: 0.07, attackMs: 0.5, releaseMs: 6, excl: 0, exclGain: 1, quest: 0,
  },
};

const SILENT_CHAR = /[\s.,!?;:…—–\-'"“”‘’()[\]{}~*/\\|<>・。、！？]/u;

/** Characters that never blip (whitespace and punctuation). */
export function isSilentChar(ch: string): boolean {
  return ch === '' || SILENT_CHAR.test(ch);
}

const VOICE_INDEX: Record<VoiceId, number> = { 'piggy-1': 1, 'piggy-2': 2, 'piggy-3': 3, player: 4, narrator: 5, system: 6 };

/** Small integer hash → [0, 1). Deterministic, so a line's blips replay identically. */
function rand(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/**
 * The synth blips for one typed character. `counter` seeds the pitch when no `index` is given.
 * Returns [] for silent characters.
 */
export function blipCalls(voice: VoiceId, opts: BlipOptions = {}, counter = 0): BlipCall[] {
  const v = VOICES[voice];
  if (!v) return [];
  if (opts.char !== undefined && isSilentChar(opts.char)) return [];
  const quiet = opts.whisper ? 0.355 : 1; // −9 dB
  const lowpass = opts.whisper ? 1200 : 0;
  const call = (wave: Wave, midi: number, lenMs: number, vol: number, glide = 0): BlipCall => ({
    wave, freq: midiToFreq(midi), lenMs, vol: vol * quiet, attackMs: v.attackMs, releaseMs: v.releaseMs, glide, lowpass, pan: 0,
  });

  if (opts.signature && voice === 'piggy-2') {
    // "Patriot." — one G3 + C4 two-note blip
    return [call(v.wave, 55, 90, v.vol * 0.8), call(v.wave, 60, 90, v.vol * 0.8), call('tri', 43, 90, v.vol * 0.3)];
  }

  const ch = opts.char ? opts.char.codePointAt(0) ?? 0 : 0;
  const seed = opts.index !== undefined ? VOICE_INDEX[voice] * 7919 + opts.index * 131 + ch : VOICE_INDEX[voice] * 104_729 + counter * 977;
  let semis = v.steps[Math.floor(rand(seed) * v.steps.length)] + (rand(seed + 1) * 2 - 1) * v.jitter;
  if (v.drift) {
    const t = (opts.index ?? counter) / VOICE_STYLE[voice].cps;
    semis += v.drift * Math.sin(2 * Math.PI * (v.driftHz ?? 0.3) * t);
  }
  let gain = 1;
  if (opts.ending === '!') {
    semis += v.excl;
    gain = v.exclGain;
  }
  let len = v.lenMs;
  let glide = 0;
  if (opts.ending === '?' && opts.last && v.quest) {
    glide = v.quest;
    len *= 1.6;
  }
  const out = [call(v.wave, v.base + semis, len, v.vol * gain, glide)];
  if (v.sub) out.push(call(v.sub.wave, v.base + semis + v.sub.semis, len, v.vol * v.sub.vol * gain, glide));
  return out;
}
