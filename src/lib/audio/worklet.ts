// AudioWorkletProcessor hosting the Rust synth (public/assets/audio/kempa_synth.wasm).
// The main thread posts the wasm bytes; we instantiate here and call render() every 128-frame quantum.
// Loaded with `import url from './worklet.ts?worker&url'` + audioWorklet.addModule(url).
// Keep this file dependency-free (type imports only): Vite bundles it as its own chunk.
import type { FromWorklet, ToWorklet } from './protocol';

// AudioWorkletGlobalScope (not in lib.dom).
declare const sampleRate: number;
declare const currentTime: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}

interface Synth {
  memory: WebAssembly.Memory;
  init(sampleRate: number): number;
  alloc(bytes: number): number;
  free(ptr: number, bytes: number): void;
  load_song(ptr: number, len: number): number;
  play(fadeOutMs: number, fadeInMs: number, serial: number): number;
  stop(fadeMs: number): void;
  set_volumes(master: number, bgm: number, sfx: number, voice: number): void;
  trigger_sfx(ptr: number, len: number): number;
  jingle(ptr: number, len: number): number;
  stop_jingle(fadeMs: number): void;
  blip_ex(wave: number, freq: number, lenMs: number, vol: number, attackMs: number, releaseMs: number, glide: number, lowpass: number, pan: number): void;
  render(frames: number): number;
  song_position_seconds(): number;
  song_serial(): number;
  song_state(): number;
  all_notes_off(): void;
}

/** Quanta between song-position reports (~21 ms at 48 kHz). */
const POS_EVERY = 8;
const BLIP = 9;

export const PROCESSOR_NAME = 'kempa-synth';

if (typeof registerProcessor === 'function') {
  class KempaSynthProcessor extends AudioWorkletProcessor {
    private syn: Synth | null = null;
    private queue: ToWorklet[] = [];
    private buf = 0;
    private bufBytes = 0;
    private view: Float32Array | null = null;
    private viewPtr = -1;
    private quanta = 0;
    private lastState = -1;
    private lastSerial = -1;
    private dead = false;

    constructor() {
      super();
      this.port.onmessage = (e: MessageEvent<ToWorklet>) => this.onMessage(e.data);
    }

    private post(m: FromWorklet) {
      this.port.postMessage(m);
    }

    private onMessage(m: ToWorklet) {
      if (m.t === 'wasm') {
        void this.load(m.bytes);
      } else if (!this.syn) {
        if (this.queue.length < 64) this.queue.push(m);
      } else if (!this.dead) {
        this.apply(this.syn, m);
      }
    }

    private async load(bytes: ArrayBuffer) {
      try {
        const { instance } = await WebAssembly.instantiate(bytes, {});
        const syn = instance.exports as unknown as Synth;
        syn.init(sampleRate);
        this.syn = syn;
        for (const m of this.queue.splice(0)) this.apply(syn, m);
        this.post({ t: 'ready', sampleRate });
      } catch (e) {
        this.post({ t: 'error', message: `synth failed to start: ${String(e)}` });
      }
    }

    /** Copy floats into a reusable wasm buffer and hand them to `fn(ptr, len)`. */
    private withData(syn: Synth, data: Float32Array, fn: (ptr: number, len: number) => number): number {
      const bytes = data.length * 4;
      if (bytes === 0) return -1;
      if (bytes > this.bufBytes) {
        if (this.buf) syn.free(this.buf, this.bufBytes);
        this.bufBytes = Math.max(bytes, 16384);
        this.buf = syn.alloc(this.bufBytes);
        if (!this.buf) {
          this.bufBytes = 0;
          return -1;
        }
      }
      new Float32Array(syn.memory.buffer, this.buf, data.length).set(data);
      return fn(this.buf, data.length);
    }

    private apply(syn: Synth, m: ToWorklet) {
      try {
        switch (m.t) {
          case 'song':
            if (this.withData(syn, m.data, (p, n) => syn.load_song(p, n)) === 0) syn.play(m.fadeOut, m.fadeIn, m.serial);
            break;
          case 'stop':
            syn.stop(m.fadeMs);
            break;
          case 'jingle':
            this.withData(syn, m.data, (p, n) => syn.jingle(p, n));
            break;
          case 'stopJingle':
            syn.stop_jingle(m.fadeMs);
            break;
          case 'sfx':
            this.withData(syn, m.data, (p, n) => syn.trigger_sfx(p, n));
            break;
          case 'blip': {
            const c = m.calls;
            for (let i = 0; i + BLIP <= c.length; i += BLIP) {
              syn.blip_ex(c[i], c[i + 1], c[i + 2], c[i + 3], c[i + 4], c[i + 5], c[i + 6], c[i + 7], c[i + 8]);
            }
            break;
          }
          case 'vol':
            syn.set_volumes(m.master, m.bgm, m.sfx, m.voice);
            break;
          case 'panic':
            syn.all_notes_off();
            break;
        }
      } catch (e) {
        this.crash(e);
      }
    }

    private crash(e: unknown) {
      this.dead = true;
      this.post({ t: 'error', message: `synth crashed: ${String(e)}` });
    }

    process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
      const out = outputs[0];
      const syn = this.syn;
      if (!out || out.length === 0 || !syn || this.dead) return true;
      const left = out[0];
      const n = left.length;
      try {
        const ptr = syn.render(n);
        let v = this.view;
        if (!v || v.buffer !== syn.memory.buffer || this.viewPtr !== ptr || v.length < n * 2) {
          v = this.view = new Float32Array(syn.memory.buffer, ptr, n * 2);
          this.viewPtr = ptr;
        }
        if (out.length > 1) {
          const right = out[1];
          for (let i = 0, k = 0; i < n; i++, k += 2) {
            left[i] = v[k];
            right[i] = v[k + 1];
          }
        } else {
          for (let i = 0, k = 0; i < n; i++, k += 2) left[i] = 0.5 * (v[k] + v[k + 1]);
        }
        const state = syn.song_state();
        const serial = syn.song_serial();
        if (++this.quanta >= POS_EVERY || state !== this.lastState || serial !== this.lastSerial) {
          this.quanta = 0;
          if (state !== 0 || this.lastState !== 0) {
            this.post({ t: 'pos', serial, sec: syn.song_position_seconds(), time: currentTime + n / sampleRate, state });
          }
          this.lastState = state;
          this.lastSerial = serial;
        }
      } catch (e) {
        this.crash(e);
      }
      return true;
    }
  }

  registerProcessor(PROCESSOR_NAME, KempaSynthProcessor);
}

// Lets non-Vite runtimes (bun tests) resolve `import url from './worklet.ts?worker&url'` harmlessly.
export default PROCESSOR_NAME;
