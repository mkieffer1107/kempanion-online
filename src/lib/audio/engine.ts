// Main-thread audio engine: owns the AudioContext and the synth worklet, compiles songs/SFX into the
// synth's binary format and keeps a loop-aware song clock for rhythm games. Every method is a safe
// no-op before init() or when Web Audio / WebAssembly is unavailable.
import type { JingleId, SfxId, SongId, VoiceId } from '../types';
import type { AudioApi, BlipOptions, Volumes } from './api';
import { encodeSfx, encodeSong, waveIndex } from './encode';
import { JINGLES } from './jingles';
import { compileSong, TICKS_PER_QUARTER, type Song } from './mml';
import type { FromWorklet, ToWorklet } from './protocol';
import { SFX } from './sfx';
import { songTicksAt, tempoMap, type TempoMap } from './timing';
import { blipCalls } from './voices';
import workletUrl from './worklet.ts?worker&url';

const PROCESSOR = 'kempa-synth';
const DEFAULT_FADE_MS = 700;
const BLIP_MIN_GAP_MS = 30;
const SFX_MIN_GAP_MS = 25;
const READY_TIMEOUT_MS = 10_000;

type Ctx = AudioContext;
type SessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Automated browsers (Playwright / WebDriver set navigator.webdriver) and `?mute` play no sound, so test runs don't
 * fill the room with music; `?sound` turns it back on for a test that listens on purpose.
 */
const SILENT = (() => {
  if (typeof navigator === 'undefined' || typeof location === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  return q.has('mute') || (navigator.webdriver === true && !q.has('sound'));
})();

/** iPhone/iPad/iPod (iPadOS reports a Mac user agent, but with touch points). */
function isAppleTouch(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** 0.1 s of 8-bit silence as a WAV blob URL, for the pre-16.4 iOS media-session trick. */
function silentWavUrl(): string {
  const n = 800;
  const view = new DataView(new ArrayBuffer(44 + n));
  const tag = (at: number, s: string) => { for (let i = 0; i < 4; i++) view.setUint8(at + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); view.setUint32(4, 36 + n, true); tag(8, 'WAVE');
  tag(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  tag(36, 'data'); view.setUint32(40, n, true);
  new Uint8Array(view.buffer, 44).fill(128);
  return URL.createObjectURL(new Blob([view.buffer], { type: 'audio/wav' }));
}

class AudioEngine implements AudioApi {
  #ctx: Ctx | null = null;
  #node: AudioWorkletNode | null = null;
  #ready = false;
  #init: Promise<void> | null = null;
  #unlocked = false;
  #userSuspended = false;
  #autoSuspend = true;
  #songs: Record<string, Song> = {};
  #songCache = new Map<string, { data: Float32Array; map: TempoMap }>();
  #sfxCache = new Map<SfxId, Float32Array>();
  #jingleCache = new Map<JingleId, Float32Array>();
  #current: SongId | null = null;
  #pending: { id: SongId; fadeMs?: number } | null = null;
  #serial = 0;
  #pos = { serial: -1, sec: 0, time: 0, state: 0 };
  #vol = { master: SILENT ? 0 : 0.8, bgm: 0.6, sfx: 0.8, voice: 0.7 };
  #lastBlip = new Map<VoiceId, number>();
  #lastSfx = new Map<SfxId, number>();
  #blips = 0;
  #warned = new Set<string>();
  #silence: HTMLAudioElement | null = null;

  get ready(): boolean {
    return this.#ready;
  }

  init(): Promise<void> {
    if (this.#init) {
      this.#unlock();
      return this.#init;
    }
    if (typeof window === 'undefined') return Promise.resolve();
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC || typeof AudioWorkletNode === 'undefined' || typeof WebAssembly === 'undefined') {
      this.#warn('audio disabled: this browser lacks Web Audio worklets or WebAssembly');
      return (this.#init = Promise.resolve());
    }
    this.#playThroughSilentSwitch();
    let ctx: Ctx;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      this.#warn(`audio disabled: ${String(e)}`);
      return (this.#init = Promise.resolve());
    }
    this.#ctx = ctx;
    this.#unlock(); // must run synchronously inside the user gesture (iOS)
    this.#listen();
    this.#init = this.#boot(ctx).catch((e: unknown) => {
      this.#warn(`audio disabled: ${e instanceof Error ? e.message : String(e)}`);
      this.#ready = false;
      this.#current = null;
      this.#pending = null;
      this.#node?.disconnect();
      this.#node = null;
      void ctx.close().catch(() => {});
    });
    return this.#init;
  }

  /** Resume the context and play one silent sample (iOS only unlocks audio inside a gesture). */
  #unlock() {
    const ctx = this.#ctx;
    if (!ctx || this.#userSuspended) return;
    if (this.#silence?.paused) this.#playThroughSilentSwitch();
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    if (this.#unlocked) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
      this.#unlocked = true;
    } catch {
      /* try again on the next gesture */
    }
  }

  #listen() {
    const onGesture = () => {
      if (!document.hidden) this.#unlock();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) {
      window.addEventListener(ev, onGesture, { capture: true, passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      const ctx = this.#ctx;
      if (!ctx) return;
      if (document.hidden) {
        if (this.#autoSuspend) void ctx.suspend().catch(() => {});
        this.#silence?.pause();
      } else if (!this.#userSuspended) {
        void ctx.resume().catch(() => {});
        if (this.#silence) this.#playThroughSilentSwitch();
      }
    });
  }

  /**
   * The iPhone's ring/silent switch mutes Web Audio unless the page asks for media playback. Safari 16.4+ takes
   * that as navigator.audioSession.type = 'playback'; older iOS switches while an <audio> element is playing, so it
   * gets a looping silent one. With the game muted (master 0) the session goes back to 'ambient', so the game
   * doesn't pause the player's own music for nothing. Other platforms have no such switch.
   */
  #playThroughSilentSwitch() {
    if (typeof navigator === 'undefined') return;
    const on = this.#vol.master > 0;
    const session = (navigator as SessionNavigator).audioSession;
    if (session) {
      try {
        session.type = on ? 'playback' : 'ambient';
      } catch {
        /* not settable here */
      }
      return;
    }
    if (!isAppleTouch()) return;
    if (!on || document.hidden) {
      this.#silence?.pause();
      return;
    }
    if (!this.#silence) {
      this.#silence = new Audio(silentWavUrl());
      this.#silence.loop = true;
      this.#silence.setAttribute('playsinline', '');
    }
    if (this.#silence.paused) void this.#silence.play().catch(() => {});
  }

  async #boot(ctx: Ctx) {
    const wasmUrl = `${import.meta.env.BASE_URL}assets/audio/kempa_synth.wasm`;
    const [bytes, songs] = await Promise.all([
      fetch(wasmUrl).then((r) => {
        if (!r.ok) throw new Error(`synth not found (${r.status} ${wasmUrl})`);
        return r.arrayBuffer();
      }),
      import('./songs')
        .then((m) => m.SONGS)
        .catch((e: unknown) => {
          this.#warn(`song registry failed to load: ${String(e)}`);
          return {} as Record<string, Song>;
        }),
      ctx.audioWorklet.addModule(workletUrl),
    ]);
    this.#songs = songs;
    const node = new AudioWorkletNode(ctx, PROCESSOR, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    node.connect(ctx.destination);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('synth worklet did not start')), READY_TIMEOUT_MS);
      node.port.onmessage = (e: MessageEvent<FromWorklet>) => {
        if (e.data.t === 'ready') {
          clearTimeout(timer);
          resolve();
        } else if (e.data.t === 'error') {
          clearTimeout(timer);
          reject(new Error(e.data.message));
        }
      };
      const msg: ToWorklet = { t: 'wasm', bytes };
      node.port.postMessage(msg, [bytes]);
    });
    node.port.onmessage = (e: MessageEvent<FromWorklet>) => this.#onMessage(e.data);
    node.onprocessorerror = () => {
      this.#warn('synth worklet crashed; audio is off until reload');
      this.#ready = false;
    };
    this.#node = node;
    this.#ready = true;
    this.#post({ t: 'vol', ...this.#vol });
    const pending = this.#pending;
    this.#pending = null;
    if (pending) {
      this.#current = null;
      this.playSong(pending.id, { fadeMs: pending.fadeMs });
    }
  }

  #onMessage(m: FromWorklet) {
    if (m.t === 'pos') {
      this.#pos = m;
      // a non-looping song (logo sting, credits…) ended by itself
      if (m.state === 3 && m.serial === this.#serial) this.#current = null;
    } else if (m.t === 'error') {
      this.#warn(m.message);
      this.#ready = false;
    }
  }

  #post(m: ToWorklet) {
    this.#node?.port.postMessage(m);
  }

  #warn(msg: string) {
    if (this.#warned.has(msg)) return;
    this.#warned.add(msg);
    console.warn(`[audio] ${msg}`);
  }

  #song(id: string): { data: Float32Array; map: TempoMap } | null {
    const hit = this.#songCache.get(id);
    if (hit) return hit;
    const song = this.#songs[id];
    if (!song) {
      this.#warn(`unknown song "${id}"`);
      return null;
    }
    try {
      const compiled = compileSong(song);
      if (import.meta.env.DEV) for (const w of compiled.warnings) this.#warn(`song ${id}: ${w}`);
      const entry = { data: encodeSong(compiled), map: tempoMap(compiled) };
      this.#songCache.set(id, entry);
      return entry;
    } catch (e) {
      this.#warn(`song "${id}" failed to compile: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  playSong(id: SongId, opts: { fadeMs?: number; restart?: boolean } = {}): void {
    if (!id || (id === this.#current && !opts.restart)) return;
    if (!this.#ready) {
      // remember the latest request; it starts as soon as the synth is up
      this.#pending = { id, fadeMs: opts.fadeMs };
      this.#current = id;
      return;
    }
    const song = this.#song(id);
    if (!song) return;
    this.#current = id;
    this.#serial++;
    const fadeOut = opts.fadeMs ?? DEFAULT_FADE_MS;
    const fadeIn = opts.fadeMs ?? 0;
    this.#post({ t: 'song', data: song.data, fadeOut, fadeIn, serial: this.#serial });
  }

  stopSong(fadeMs = DEFAULT_FADE_MS): void {
    this.#pending = null;
    if (this.#current === null) return;
    this.#current = null;
    this.#serial++;
    this.#post({ t: 'stop', fadeMs });
  }

  currentSong(): SongId | null {
    return this.#current;
  }

  /** Context time of the sample the listener hears right now. */
  #audibleTime(ctx: Ctx): number {
    let t = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
    if (typeof ctx.getOutputTimestamp === 'function') {
      const ts = ctx.getOutputTimestamp();
      if (ts.contextTime && ts.performanceTime) t = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return Math.min(t, ctx.currentTime);
  }

  songPosition(): number {
    const ctx = this.#ctx;
    const p = this.#pos;
    if (!this.#ready || !ctx || this.#current === null || p.serial !== this.#serial || p.state === 0) return 0;
    return Math.max(0, p.sec + (this.#audibleTime(ctx) - p.time));
  }

  songBeat(): number {
    const id = this.#current;
    const song = id ? this.#songCache.get(id) : undefined;
    if (!song) return 0;
    return songTicksAt(song.map, this.songPosition()) / TICKS_PER_QUARTER;
  }

  jingle(id: JingleId): void {
    if (!this.#ready) return;
    let data = this.#jingleCache.get(id);
    if (!data) {
      // composers' songs/<jingleId>.ts win over the built-in fallbacks
      const song = this.#songs[id] ?? this.#songs[`jingle_${id}`] ?? JINGLES[id];
      if (!song) return this.#warn(`unknown jingle "${id}"`);
      try {
        data = encodeSong(compileSong({ ...song, loop: false }));
      } catch (e) {
        return this.#warn(`jingle "${id}" failed to compile: ${e instanceof Error ? e.message : String(e)}`);
      }
      this.#jingleCache.set(id, data);
    }
    this.#post({ t: 'jingle', data });
  }

  sfx(id: SfxId): void {
    if (!this.#ready) return;
    const now = performance.now();
    if (now - (this.#lastSfx.get(id) ?? -Infinity) < SFX_MIN_GAP_MS) return;
    let data = this.#sfxCache.get(id);
    if (!data) {
      const def = SFX[id];
      if (!def) return this.#warn(`unknown sfx "${id}"`);
      try {
        data = encodeSfx(def);
      } catch (e) {
        return this.#warn(`sfx "${id}" is invalid: ${e instanceof Error ? e.message : String(e)}`);
      }
      this.#sfxCache.set(id, data);
    }
    this.#lastSfx.set(id, now);
    this.#post({ t: 'sfx', data });
  }

  blip(voice: VoiceId, opts?: BlipOptions): void {
    if (!this.#ready) return;
    const now = performance.now();
    if (now - (this.#lastBlip.get(voice) ?? -Infinity) < BLIP_MIN_GAP_MS) return;
    const calls = blipCalls(voice, opts, this.#blips++);
    if (!calls.length) return;
    this.#lastBlip.set(voice, now);
    const flat: number[] = [];
    for (const c of calls) flat.push(waveIndex(c.wave), c.freq, c.lenMs, c.vol, c.attackMs, c.releaseMs, c.glide, c.lowpass, c.pan);
    this.#post({ t: 'blip', calls: flat });
  }

  setVolumes(v: Volumes): void {
    const clamp = (x: number | undefined, d: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d);
    this.#vol = {
      master: SILENT ? 0 : clamp(v.master, this.#vol.master),
      bgm: clamp(v.bgm, this.#vol.bgm),
      sfx: clamp(v.sfx, this.#vol.sfx),
      voice: clamp(v.voice, this.#vol.voice),
    };
    if (this.#ready) this.#post({ t: 'vol', ...this.#vol });
    if (this.#ctx) this.#playThroughSilentSwitch();
  }

  suspend(): void {
    this.#userSuspended = true;
    void this.#ctx?.suspend().catch(() => {});
  }

  resume(): void {
    this.#userSuspended = false;
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (this.#ctx && (!hidden || !this.#autoSuspend)) void this.#ctx.resume().catch(() => {});
  }

  setAutoSuspend(on: boolean): void {
    this.#autoSuspend = on;
  }

  /** Dev hot-reload: the song registry changed in place; recompile songs and jingles on next use. */
  songsUpdated(): void {
    this.#songCache.clear();
    this.#jingleCache.clear();
  }
}

// Exactly one engine per page, even across dev hot-reloads: a second engine would open a second
// AudioContext and every song would play twice.
const ENGINE_KEY = '__kempanionAudio';
const host = globalThis as typeof globalThis & { [ENGINE_KEY]?: AudioEngine };
export const audio: AudioApi = (host[ENGINE_KEY] ??= new AudioEngine());

if (import.meta.hot && typeof window !== 'undefined') {
  window.addEventListener('kempanion:songs-updated', () => host[ENGINE_KEY]?.songsUpdated?.());
}
