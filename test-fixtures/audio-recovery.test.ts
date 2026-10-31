// Real engine and song definitions, with controllable browser audio failures and real timers.
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { ToWorklet } from '../src/lib/audio/protocol';
import title from '../src/lib/audio/songs/title';
import plaza from '../src/lib/audio/songs/plaza';

// Vite's import.meta.glob registry is replaced by the same concrete definitions for this Bun harness.
mock.module('../src/lib/audio/songs', () => ({ SONGS: { title, plaza } }));

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(pred: () => boolean, ms = 3000): Promise<boolean> {
  const end = performance.now() + ms;
  while (!pred()) { if (performance.now() > end) return false; await sleep(10); }
  return true;
}

class FakeContext {
  static all: FakeContext[] = [];
  static failNext = false;
  static failModule = false;
  state = 'suspended';
  sampleRate = 48000;
  destination = {};
  onstatechange: (() => void) | null = null;
  audioWorklet = { addModule: async () => {
    if (FakeContext.failModule) { FakeContext.failModule = false; throw new Error('temporary worklet load failure'); }
  } };
  resumeCalls = 0;
  suspendCalls = 0;
  frozen = false;
  hangResume = false;
  hangSuspend = false;
  healOnSuspend = false;
  #time = 0;
  #at = performance.now();
  constructor() {
    if (FakeContext.failNext) { FakeContext.failNext = false; throw new Error('temporary context limit'); }
    FakeContext.all.push(this);
  }
  get currentTime() { return this.#time + (this.state === 'running' && !this.frozen ? (performance.now() - this.#at) / 1000 : 0); }
  setState(state: string) {
    this.#time = this.currentTime;
    this.#at = performance.now();
    this.state = state;
    queueMicrotask(() => this.onstatechange?.());
  }
  resume() {
    this.resumeCalls++;
    if (this.hangResume) return new Promise<void>(() => {});
    this.setState('running');
    return Promise.resolve();
  }
  suspend() {
    this.suspendCalls++;
    if (this.hangSuspend) return new Promise<void>(() => {});
    this.setState('suspended');
    if (this.healOnSuspend) { this.frozen = false; this.hangResume = false; }
    return Promise.resolve();
  }
  close() { this.setState('closed'); return Promise.resolve(); }
  createBuffer() { return {}; }
  createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
}

class FakeWorklet {
  static all: FakeWorklet[] = [];
  static readyGate: Promise<void> | null = null;
  connected = false;
  onprocessorerror: (() => void) | null = null;
  messages: ToWorklet[] = [];
  port = {
    onmessage: null as ((e: { data: unknown }) => void) | null,
    postMessage: (message: ToWorklet) => {
      this.messages.push(message);
      if (message.t === 'wasm') {
        void (FakeWorklet.readyGate ?? Promise.resolve()).then(() => this.port.onmessage?.({ data: { t: 'ready', sampleRate: 48000 } }));
      }
    },
  };
  constructor(readonly ctx: FakeContext) { FakeWorklet.all.push(this); }
  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
}

let doc: EventTarget & { hidden: boolean };
let win: EventTarget & { AudioContext: typeof FakeContext };
const g = globalThis as unknown as Record<string, unknown>;
g.navigator = { userAgent: 'iPhone', maxTouchPoints: 5, audioSession: { type: 'ambient' } };
g.AudioWorkletNode = FakeWorklet;
g.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
const { AudioEngine } = await import('../src/lib/audio/engine');
let audio: InstanceType<typeof AudioEngine>;

function visibility(hidden: boolean) { doc.hidden = hidden; doc.dispatchEvent(new Event('visibilitychange')); }
function gesture() { win.dispatchEvent(new Event('pointerdown')); }
function latestNode() { return FakeWorklet.all[FakeWorklet.all.length - 1]; }

beforeEach(async () => {
  FakeContext.all = [];
  FakeContext.failNext = false;
  FakeContext.failModule = false;
  FakeWorklet.all = [];
  FakeWorklet.readyGate = null;
  doc = Object.assign(new EventTarget(), { hidden: false });
  win = Object.assign(new EventTarget(), { AudioContext: FakeContext });
  g.document = doc;
  g.window = win;
  audio = new AudioEngine();
  await audio.init();
  audio.playSong('title', { fadeMs: 0 });
});
afterEach(() => { audio.suspend(); });

describe('returning from iOS background audio interruption', () => {
  test('normal resume retains the song and existing synth', async () => {
    const ctx = FakeContext.all[0], node = latestNode();
    visibility(true);
    expect(ctx.state).toBe('suspended');
    visibility(false);
    expect(ctx.state).toBe('running');
    const time = ctx.currentTime;
    await sleep(380);
    expect(ctx.currentTime).toBeGreaterThan(time);
    expect(FakeContext.all.length).toBe(1);
    expect(node.messages.filter((m) => m.t === 'song').length).toBe(1);
    expect(audio.currentSong()).toBe('title');
  });

  test.each(['interrupted', 'running'])('%s with a frozen clock recovers via suspend/resume', async (state) => {
    const ctx = FakeContext.all[0];
    visibility(true);
    ctx.setState(state);
    ctx.frozen = true;
    ctx.hangResume = true;
    ctx.healOnSuspend = true;
    visibility(false);
    expect(await until(() => !ctx.frozen && ctx.state === 'running')).toBe(true);
    await sleep(360);
    expect(ctx.suspendCalls).toBeGreaterThan(1);
    expect(FakeContext.all.length).toBe(1);
    expect(audio.currentSong()).toBe('title');
  });

  test('unresolved operations rebuild once, restore volumes/song, and ignore stale worklet messages', async () => {
    const ctx = FakeContext.all[0], old = latestNode(), oldMessage = old.port.onmessage!;
    audio.setVolumes({ master: 0.43, bgm: 0.27, voice: 0.18, sfx: 0.51 });
    visibility(true);
    ctx.hangResume = ctx.hangSuspend = true;
    visibility(false);
    win.dispatchEvent(new Event('pageshow'));
    win.dispatchEvent(new Event('focus'));
    gesture();
    expect(await until(() => FakeContext.all.length === 2 && audio.ready)).toBe(true);
    const node = latestNode();
    expect(old.connected).toBe(false);
    expect(FakeWorklet.all.filter((n) => n.connected).length).toBe(1);
    expect(node.messages.find((m) => m.t === 'vol')).toEqual({ t: 'vol', master: 0.43, bgm: 0.27, voice: 0.18, sfx: 0.51 });
    const song = node.messages.find((m) => m.t === 'song')!;
    expect(song.t).toBe('song');
    oldMessage({ data: { t: 'pos', serial: song.t === 'song' ? song.serial : -1, sec: 999, time: 0, state: 3 } });
    expect(audio.currentSong()).toBe('title');
    expect(audio.songPosition()).toBe(0);
  });

  test.each(['change', 'stop'])('latest song %s during replacement startup wins', async (action) => {
    let release!: () => void;
    FakeWorklet.readyGate = new Promise<void>((resolve) => { release = resolve; });
    const ctx = FakeContext.all[0];
    visibility(true);
    ctx.hangResume = ctx.hangSuspend = true;
    visibility(false);
    expect(await until(() => FakeWorklet.all.length === 2)).toBe(true);
    if (action === 'change') audio.playSong('plaza'); else audio.stopSong();
    audio.setVolumes({ master: 0 });
    release();
    expect(await until(() => audio.ready)).toBe(true);
    expect(audio.currentSong()).toBe(action === 'change' ? 'plaza' : null);
    expect(latestNode().messages.filter((m) => m.t === 'song').length).toBe(action === 'change' ? 1 : 0);
    expect(latestNode().messages.find((m) => m.t === 'vol')).toMatchObject({ master: 0 });
  });

  test.each(['hide', 'suspend'])('%s during recovery cancels late resume and replacement', async (action) => {
    const ctx = FakeContext.all[0];
    visibility(true);
    ctx.hangResume = true;
    visibility(false);
    if (action === 'hide') visibility(true); else audio.suspend();
    const calls = ctx.resumeCalls;
    await sleep(750);
    expect(ctx.resumeCalls).toBe(calls);
    expect(FakeContext.all.length).toBe(1);
  });

  test('temporary replacement constructor failure can retry on the next gesture', async () => {
    const ctx = FakeContext.all[0];
    visibility(true);
    ctx.hangResume = ctx.hangSuspend = true;
    FakeContext.failNext = true;
    visibility(false);
    expect(await until(() => !FakeContext.failNext)).toBe(true);
    expect(audio.ready).toBe(false);
    gesture();
    expect(FakeContext.all.length).toBe(2); // constructed synchronously inside the gesture
    expect(await until(() => audio.ready)).toBe(true);
    expect(audio.currentSong()).toBe('title');
  });

  test('background-play preference and idle audio do not trigger needless recreation', async () => {
    audio.setAutoSuspend(false);
    audio.stopSong(0);
    const ctx = FakeContext.all[0];
    visibility(true);
    expect(ctx.suspendCalls).toBe(0);
    visibility(false);
    await sleep(380);
    expect(FakeContext.all.length).toBe(1);
    expect(audio.currentSong()).toBeNull();
  });

  test('a failed replacement boot retries on the next gesture without losing the song', async () => {
    const ctx = FakeContext.all[0];
    visibility(true);
    ctx.hangResume = ctx.hangSuspend = true;
    FakeContext.failModule = true;
    visibility(false);
    expect(await until(() => FakeContext.all.length === 2 && FakeContext.all[1].state === 'closed')).toBe(true);
    expect(audio.ready).toBe(false);
    expect(audio.currentSong()).toBe('title');
    gesture();
    expect(await until(() => FakeContext.all.length === 3 && audio.ready)).toBe(true);
    expect(audio.currentSong()).toBe('title');
    expect(FakeWorklet.all.filter((n) => n.connected).length).toBe(1);
  });

  test('hiding while the replacement boots leaves it suspended until the next return', async () => {
    let release!: () => void;
    FakeWorklet.readyGate = new Promise<void>((resolve) => { release = resolve; });
    const ctx = FakeContext.all[0];
    visibility(true);
    ctx.hangResume = ctx.hangSuspend = true;
    visibility(false);
    expect(await until(() => FakeWorklet.all.length === 2)).toBe(true);
    visibility(true);
    release();
    expect(await until(() => audio.ready)).toBe(true);
    expect(FakeContext.all[1].state).toBe('suspended');
    visibility(false);
    expect(FakeContext.all[1].state).toBe('running');
    await sleep(380);
    expect(FakeContext.all.length).toBe(2);
  });
});
