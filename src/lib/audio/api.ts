// Public types of the audio module (re-exported by ./index.ts).
import type { JingleId, SfxId, SongId, VoiceId } from '../types';

export interface Volumes { master?: number; bgm?: number; sfx?: number; voice?: number }

/** Optional context for a text blip, so pitch follows the text and replays identically. */
export interface BlipOptions {
  /** The character being revealed; spaces and punctuation make no sound. */
  char?: string;
  /** Character index within the line: the same index always gives the same pitch (backlog ♪ replay). */
  index?: number;
  /** True for the last blip of the line (a trailing "?" bends it up for Piggy 1/3). */
  last?: boolean;
  /** How the line ends: "!" lifts the whole line, "?" bends the last blip. */
  ending?: '!' | '?' | '.' | '…';
  /** Whispered line (asleep / late night): −9 dB and low-passed. */
  whisper?: boolean;
  /** Piggy 2's "Patriot." — a single G3+C4 two-note blip. */
  signature?: boolean;
}

export interface AudioApi {
  /** True once the AudioContext + synth worklet are running. */
  readonly ready: boolean;
  /** Call from a user gesture (first click/tap/key). Safe to call repeatedly. */
  init(): Promise<void>;
  /** Start (or keep playing) a BGM song. Same id → no restart unless `restart`. */
  playSong(id: SongId, opts?: { fadeMs?: number; restart?: boolean }): void;
  stopSong(fadeMs?: number): void;
  currentSong(): SongId | null;
  /** Seconds since the current song started (loop-aware raw time; for rhythm games). 0 when silent. */
  songPosition(): number;
  /** Quarter-note beats since the current song started (follows tempo changes and loops). 0 when silent. */
  songBeat(): number;
  /** One-shot musical sting over ducked BGM. */
  jingle(id: JingleId): void;
  sfx(id: SfxId): void;
  /** One typewriter blip in a character's voice (rate-limited internally). */
  blip(voice: VoiceId, opts?: BlipOptions): void;
  setVolumes(v: Volumes): void;
  suspend(): void;
  resume(): void;
  /** Auto-suspend while the tab is hidden (default true). Pass false to keep playing in the background. */
  setAutoSuspend(on: boolean): void;
}
