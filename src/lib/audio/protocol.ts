// Messages between the main-thread engine and the synth AudioWorkletProcessor (types only).

/** Floats per blip in a `blip` message: wave, freq, lenMs, vol, attackMs, releaseMs, glide, lowpass, pan. */
export const BLIP_STRIDE = 9;

export type ToWorklet =
  | { t: 'wasm'; bytes: ArrayBuffer }
  | { t: 'song'; data: Float32Array; fadeOut: number; fadeIn: number; serial: number }
  | { t: 'stop'; fadeMs: number }
  | { t: 'jingle'; data: Float32Array }
  | { t: 'stopJingle'; fadeMs: number }
  | { t: 'sfx'; data: Float32Array }
  | { t: 'blip'; calls: number[] }
  | { t: 'vol'; master: number; bgm: number; sfx: number; voice: number }
  | { t: 'panic' };

export type FromWorklet =
  | { t: 'ready'; sampleRate: number }
  | { t: 'error'; message: string }
  /** `sec` = song position at context time `time`; state 0 idle, 1 playing, 2 fading out, 3 finished. */
  | { t: 'pos'; serial: number; sec: number; time: number; state: number };
