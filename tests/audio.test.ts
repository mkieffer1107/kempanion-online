import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { compileSong, INSTRUMENT_IDS, TICKS_PER_QUARTER as Q, type Song } from '../src/lib/audio/mml';
import {
  encodeSfx, encodeSong, EV, EVENT_STRIDE, KIND_SFX, KIND_SONG, LAYER_STRIDE, MAX_LAYERS, noteToMidi, SFX_HEADER,
  sfxDuration, sfxLayers, SONG_HEADER, TRACK_STRIDE, waveIndex, WAVES,
} from '../src/lib/audio/encode';
import { JINGLES } from '../src/lib/audio/jingles';
import { SFX, SFX_IDS } from '../src/lib/audio/sfx';
import { songTicksAt, tempoMap, tickToSeconds } from '../src/lib/audio/timing';
import { blipCalls, isSilentChar, VOICE_STYLE, VOICES } from '../src/lib/audio/voices';

const root = new URL('../', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');

/** Quoted members of a `export type X = 'a' | 'b' | Y;` union in src/lib/types.ts (expanding referenced unions). */
function unionMembers(name: string): string[] {
  const src = read('src/lib/types.ts');
  const m = new RegExp(`export type ${name} =([^;]+);`).exec(src);
  if (!m) throw new Error(`type ${name} not found`);
  const quoted = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const refs = [...m[1].replace(/'[^']*'/g, '').matchAll(/\b([A-Z]\w+)\b/g)].map((x) => x[1]);
  return [...quoted, ...refs.flatMap(unionMembers)];
}

const SONG: Song = {
  id: 'test', title: 'Test', bpm: 120, loop: true, echo: 0.3,
  tracks: [
    { inst: 'lead', vol: 0.7, pan: -0.2, mml: 't140 o4 c4 L y5 p20 d4 \'ceg\'4 @pluck e4' },
    { inst: 'bass', mml: 'o2 c4 L c4 c4 c4' },
  ],
};

describe('song encoding', () => {
  const c = compileSong(SONG);
  const d = encodeSong(c);
  const nEvents = d[8];
  const events = Array.from({ length: nEvents }, (_, i) => Array.from(d.subarray(SONG_HEADER + 2 * TRACK_STRIDE + i * EVENT_STRIDE, SONG_HEADER + 2 * TRACK_STRIDE + (i + 1) * EVENT_STRIDE)));

  test('header and tracks', () => {
    expect(c.warnings).toEqual([]);
    expect([d[0], d[1], d[2], d[3]]).toEqual([KIND_SONG, 1, 120, 1]);
    expect(d[4]).toBeCloseTo(0.3);
    expect(d[5]).toBe(c.length);
    expect(d[6]).toBe(Q);
    expect(d[7]).toBe(2);
    expect(d.length).toBe(SONG_HEADER + 2 * TRACK_STRIDE + nEvents * EVENT_STRIDE);
    expect(d[SONG_HEADER]).toBe(INSTRUMENT_IDS.indexOf('lead'));
    expect(d[SONG_HEADER + 1]).toBeCloseTo(0.7);
    expect(d[SONG_HEADER + 2]).toBeCloseTo(-0.2);
    expect(d[SONG_HEADER + TRACK_STRIDE]).toBe(INSTRUMENT_IDS.indexOf('bass'));
    expect(d[SONG_HEADER + TRACK_STRIDE + 1]).toBeCloseTo(0.8);
  });

  test('events are sorted, controls before notes at the same tick', () => {
    for (let i = 1; i < events.length; i++) expect(events[i][0]).toBeGreaterThanOrEqual(events[i - 1][0]);
    const atZero = events.filter((e) => e[0] === 0).map((e) => e[2]);
    expect(atZero[0]).toBe(EV.tempo);
    expect(atZero.lastIndexOf(EV.inst)).toBeLessThan(atZero.indexOf(EV.note));
    const atQ = events.filter((e) => e[0] === Q && e[1] === 0).map((e) => e[2]);
    expect(atQ).toEqual([EV.pan, EV.vib, EV.note]);
  });

  test('notes carry gate, velocity and chord size', () => {
    const chord = events.filter((e) => e[2] === EV.note && e[0] === 2 * Q);
    expect(chord.filter((e) => e[1] === 0).map((e) => e[3])).toEqual([60, 64, 67]);
    for (const e of chord.filter((e) => e[1] === 0)) {
      expect(e[6]).toBe(3);
      expect(e[4]).toBe(Math.round((Q * 7) / 8));
      expect(e[5]).toBeCloseTo(12 / 15);
    }
    const tempo = events.find((e) => e[2] === EV.tempo)!;
    expect(tempo[3]).toBe(140);
    const inst = events.find((e) => e[2] === EV.inst && e[0] === 3 * Q)!;
    expect(inst[3]).toBe(INSTRUMENT_IDS.indexOf('pluck'));
  });

  test('non-looping songs encode loop tick 0', () => {
    const e = encodeSong(compileSong({ ...SONG, loop: false }));
    expect(e[3]).toBe(0);
    expect(e[6]).toBe(0);
  });

  test('too many tracks is an error', () => {
    const tracks = Array.from({ length: 17 }, () => ({ inst: 'tri' as const, mml: 'c4' }));
    expect(() => encodeSong(compileSong({ ...SONG, tracks }))).toThrow(/tracks/);
  });
});

describe('format stays in sync with the Rust synth', () => {
  const rust = read('synth/src/format.rs');
  const constOf = (name: string) => Number(new RegExp(`pub const ${name}: [\\w]+ = ([\\d.]+);`).exec(rust)?.[1]);

  test('layout constants', () => {
    expect(constOf('SONG_HEADER')).toBe(SONG_HEADER);
    expect(constOf('TRACK_STRIDE')).toBe(TRACK_STRIDE);
    expect(constOf('EVENT_STRIDE')).toBe(EVENT_STRIDE);
    expect(constOf('SFX_HEADER')).toBe(SFX_HEADER);
    expect(constOf('LAYER_STRIDE')).toBe(LAYER_STRIDE);
    expect(constOf('MAX_LAYERS')).toBe(MAX_LAYERS);
    expect(constOf('EV_NOTE')).toBe(EV.note);
    expect(constOf('EV_INST')).toBe(EV.inst);
    expect(constOf('EV_PAN')).toBe(EV.pan);
    expect(constOf('EV_VIB')).toBe(EV.vib);
    expect(constOf('EV_TEMPO')).toBe(EV.tempo);
    expect(constOf('W_PULSE12')).toBe(waveIndex('pulse12'));
    expect(constOf('W_METAL')).toBe(waveIndex('metal'));
    expect(constOf('W_FM')).toBe(waveIndex('fm'));
    expect(WAVES.length).toBe(11);
  });

  test('instrument order matches the presets', () => {
    const preset = read('synth/src/preset.rs');
    const names = /INSTRUMENT_NAMES: \[&str; N_INSTRUMENTS\] = \[([^\]]+)\]/.exec(preset)![1];
    expect([...names.matchAll(/"(\w+)"/g)].map((m) => m[1])).toEqual([...INSTRUMENT_IDS]);
  });
});

describe('sfx catalog', () => {
  const ids = unionMembers('SfxId');

  test('covers every SfxId exactly', () => {
    expect(ids.length).toBeGreaterThan(40);
    expect([...SFX_IDS].sort()).toEqual([...ids].sort());
  });

  test.each(ids)('%s encodes', (id) => {
    const def = SFX[id as keyof typeof SFX];
    const layers = sfxLayers(def);
    expect(layers.length).toBeGreaterThan(0);
    expect(layers.length).toBeLessThanOrEqual(MAX_LAYERS);
    const d = encodeSfx(def);
    expect(d[0]).toBe(KIND_SFX);
    expect(d[2]).toBe(layers.length);
    expect(d.length).toBe(SFX_HEADER + layers.length * LAYER_STRIDE);
    expect(d.every(Number.isFinite)).toBe(true);
    expect(sfxDuration(def)).toBeLessThan(3500);
  });

  test('MML clips become instrument layers', () => {
    const layers = sfxLayers({ bpm: 120, tracks: [{ inst: 'glock', mml: "o5 c8 'eg'4" }] });
    expect(layers.map((l) => l.note)).toEqual([72, 76, 79]);
    expect(layers[1].at).toBeCloseTo(250);
    expect(layers.every((l) => l.inst === 'glock')).toBe(true);
  });

  test('note names', () => {
    expect(noteToMidi('c4')).toBe(60);
    expect(noteToMidi('f+4')).toBe(66);
    expect(noteToMidi('b-3')).toBe(58);
    expect(noteToMidi('C6')).toBe(84);
    expect(() => noteToMidi('h2')).toThrow();
  });
});

describe('blip voices', () => {
  const voiceIds = unionMembers('VoiceId');

  test('every VoiceId has a voice and a typewriter style', () => {
    expect(voiceIds.sort()).toEqual(['narrator', 'piggy-1', 'piggy-2', 'piggy-3', 'player', 'system']);
    for (const v of voiceIds) {
      expect(VOICES[v as keyof typeof VOICES]).toBeDefined();
      expect(VOICE_STYLE[v as keyof typeof VOICE_STYLE].everyN).toBeGreaterThanOrEqual(1);
    }
    expect(VOICE_STYLE['piggy-1'].cps).toBe(45);
    expect(VOICE_STYLE['piggy-2'].cps).toBe(35);
    expect(VOICE_STYLE['piggy-3'].cps).toBe(32);
    expect(VOICE_STYLE.player.cps).toBe(40);
    expect(VOICE_STYLE.narrator.cps).toBe(40);
    expect(VOICE_STYLE.system.cps).toBe(40);
  });

  test('pitches sit on the G-major voice chord (G3 / B4 / D5)', () => {
    const near = (hz: number, target: number, semis: number) => Math.abs(12 * Math.log2(hz / target)) <= semis;
    for (let i = 0; i < 40; i++) {
      expect(near(blipCalls('piggy-1', { char: 'a', index: i })[0].freq, 587.33, 2.1)).toBe(true);
      expect(near(blipCalls('piggy-2', { char: 'a', index: i })[0].freq, 196, 0.51)).toBe(true);
      expect(near(blipCalls('piggy-3', { char: 'a', index: i })[0].freq, 493.88, 1.01)).toBe(true);
    }
    const p2 = blipCalls('piggy-2', { char: 'x', index: 3 });
    expect(p2.map((c) => c.wave)).toEqual(['pulse12', 'tri']);
    expect(12 * Math.log2(p2[0].freq / p2[1].freq)).toBeCloseTo(12);
    expect(blipCalls('piggy-1', { char: 'x' })[0].wave).toBe('pulse50');
    expect(blipCalls('piggy-3', { char: 'x' })[0].attackMs).toBe(8);
  });

  test('silence for spaces and punctuation; deterministic per index', () => {
    for (const ch of [' ', '.', ',', '!', '?', '…', '—', '"']) {
      expect(isSilentChar(ch)).toBe(true);
      expect(blipCalls('piggy-1', { char: ch })).toEqual([]);
    }
    expect(blipCalls('piggy-3', { char: 'k', index: 7 })).toEqual(blipCalls('piggy-3', { char: 'k', index: 7 }));
    const lens = voiceIds.map((v) => blipCalls(v as never, { char: 'a' })[0].lenMs);
    expect(Math.min(...lens)).toBeGreaterThanOrEqual(25);
    expect(Math.max(...lens)).toBeLessThanOrEqual(45);
  });

  test('inflections, whisper and the Patriot signature', () => {
    const plain = blipCalls('piggy-1', { char: 'a', index: 2 })[0];
    const bang = blipCalls('piggy-1', { char: 'a', index: 2, ending: '!' })[0];
    expect(12 * Math.log2(bang.freq / plain.freq)).toBeCloseTo(3);
    expect(blipCalls('piggy-3', { char: 'a', index: 2, ending: '?', last: true })[0].glide).toBe(4);
    const w = blipCalls('piggy-1', { char: 'a', index: 2, whisper: true })[0];
    expect(w.vol).toBeLessThan(plain.vol * 0.4);
    expect(w.lowpass).toBe(1200);
    const patriot = blipCalls('piggy-2', { signature: true });
    expect(patriot.slice(0, 2).map((c) => Math.round(12 * Math.log2(c.freq / 440) + 69))).toEqual([55, 60]);
  });
});

describe('jingles', () => {
  const ids = unionMembers('JingleId');

  test('cover every JingleId', () => {
    expect(Object.keys(JINGLES).sort()).toEqual([...ids].sort());
  });

  test.each(ids)('%s compiles cleanly and is short', (id) => {
    const song = JINGLES[id as keyof typeof JINGLES];
    const c = compileSong(song);
    expect(c.warnings).toEqual([]);
    expect(song.loop).toBe(false);
    expect(tempoMap(c).lengthSec).toBeLessThan(4);
    expect(encodeSong(c).every(Number.isFinite)).toBe(true);
  });
});

describe('tempo map', () => {
  test('constant tempo and tempo changes', () => {
    const c = compileSong({ id: 't', title: 't', bpm: 120, loop: false, tracks: [{ inst: 'tri', mml: 'c4 c4 t60 c4 c4' }] });
    const m = tempoMap(c);
    expect(tickToSeconds(m, Q)).toBeCloseTo(0.5);
    expect(tickToSeconds(m, 2 * Q)).toBeCloseTo(1.0);
    expect(tickToSeconds(m, 4 * Q)).toBeCloseTo(3.0);
    expect(songTicksAt(m, 2.0)).toBeCloseTo(3 * Q);
    expect(songTicksAt(m, 99)).toBe(4 * Q);
  });

  test('loops keep counting monotonically', () => {
    const c = compileSong({ id: 't', title: 't', bpm: 120, loop: true, tracks: [{ inst: 'tri', mml: 'c4 L c4 c4 c4' }] });
    const m = tempoMap(c);
    expect(m.lengthSec).toBeCloseTo(2);
    expect(m.loopSec).toBeCloseTo(0.5);
    expect(songTicksAt(m, 2.0)).toBeCloseTo(4 * Q);
    expect(songTicksAt(m, 3.5)).toBeCloseTo(7 * Q);
    let last = -1;
    for (let s = 0; s < 12; s += 0.01) {
      const t = songTicksAt(m, s);
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
    }
  });
});

const WASM = new URL('public/assets/audio/kempa_synth.wasm', root);

describe.skipIf(!existsSync(WASM))('synth wasm', () => {
  type Ex = {
    memory: WebAssembly.Memory;
    init(sr: number): number; alloc(n: number): number; free(p: number, n: number): void;
    load_song(p: number, n: number): number; play(a: number, b: number, s: number): number;
    trigger_sfx(p: number, n: number): number; jingle(p: number, n: number): number;
    blip_ex(...a: number[]): void; render(n: number): number; stats(): number; song_state(): number;
  };
  const mod = new WebAssembly.Module(readFileSync(WASM));
  const fresh = () => {
    const ex = new WebAssembly.Instance(mod, {}).exports as unknown as Ex;
    ex.init(48000);
    return ex;
  };
  const send = (ex: Ex, data: Float32Array, fn: (p: number, n: number) => number) => {
    const p = ex.alloc(data.length * 4);
    new Float32Array(ex.memory.buffer, p, data.length).set(data);
    const r = fn(p, data.length);
    ex.free(p, data.length * 4);
    return r;
  };
  const render = (ex: Ex, secs: number) => {
    const out: number[] = [];
    for (let i = 0; i < (secs * 48000) / 128; i++) {
      const v = new Float32Array(ex.memory.buffer, ex.render(128), 256);
      for (const x of v) out.push(x);
    }
    return out;
  };
  const check = (out: number[]) => {
    let peak = 0;
    let sum = 0;
    for (const x of out) {
      expect(Number.isFinite(x)).toBe(true);
      peak = Math.max(peak, Math.abs(x));
      sum += x * x;
    }
    return { peak, rms: Math.sqrt(sum / out.length) };
  };

  test('plays an encoded song', () => {
    const ex = fresh();
    expect(send(ex, encodeSong(compileSong(SONG)), (p, n) => ex.load_song(p, n))).toBe(0);
    expect(ex.play(0, 0, 1)).toBe(0);
    const { peak, rms } = check(render(ex, 2));
    expect(rms).toBeGreaterThan(0.005);
    expect(peak).toBeLessThan(1);
    expect(ex.song_state()).toBe(1);
  });

  test('every sfx and jingle makes a sound', () => {
    for (const id of SFX_IDS) {
      const ex = fresh();
      expect(send(ex, encodeSfx(SFX[id]), (p, n) => ex.trigger_sfx(p, n))).toBe(0);
      const { peak } = check(render(ex, sfxDuration(SFX[id]) / 1000 + 0.1));
      expect(peak, id).toBeGreaterThan(0.005);
      expect(peak, id).toBeLessThan(1);
    }
    for (const song of Object.values(JINGLES)) {
      const ex = fresh();
      expect(send(ex, encodeSong(compileSong(song)), (p, n) => ex.jingle(p, n))).toBe(0);
      expect(check(render(ex, 1)).peak, song.id).toBeGreaterThan(0.01);
    }
  });

  test('blips', () => {
    const ex = fresh();
    for (const c of blipCalls('piggy-2', { char: 'a', index: 0 })) {
      ex.blip_ex(waveIndex(c.wave), c.freq, c.lenMs, c.vol, c.attackMs, c.releaseMs, c.glide, c.lowpass, c.pan);
    }
    const out = render(ex, 0.1);
    expect(check(out.slice(0, 4000)).rms).toBeGreaterThan(0.01);
    expect(check(out.slice(-1000)).peak).toBeLessThan(0.001);
  });
});

describe.skipIf(!existsSync(WASM))('worklet processor (simulated AudioWorkletGlobalScope)', () => {
  test('loads the wasm, plays a song, reports position, handles sfx/blips/stop', async () => {
    const g = globalThis as Record<string, unknown>;
    let Proc: (new () => { port: { onmessage: ((e: { data: unknown }) => void) | null }; process(i: unknown[], o: Float32Array[][]): boolean }) | null = null;
    const sent: Record<string, unknown>[] = [];
    g.sampleRate = 48000;
    g.currentTime = 0;
    g.registerProcessor = (_name: string, ctor: typeof Proc) => (Proc = ctor);
    g.AudioWorkletProcessor = class {
      port = { onmessage: null as unknown, postMessage: (m: Record<string, unknown>) => sent.push(m) };
    };
    try {
      await import('../src/lib/audio/worklet.ts?simulated-scope');
      expect(Proc).not.toBeNull();
      const proc = new Proc!();
      const send = (m: unknown) => proc.port.onmessage!({ data: m });
      const bytes = readFileSync(WASM);
      send({ t: 'wasm', bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
      for (let i = 0; i < 100 && !sent.some((m) => m.t === 'ready'); i++) await new Promise((r) => setTimeout(r, 10));
      expect(sent.find((m) => m.t === 'ready')).toEqual({ t: 'ready', sampleRate: 48000 });

      send({ t: 'vol', master: 1, bgm: 1, sfx: 1, voice: 1 });
      send({ t: 'song', data: encodeSong(compileSong(SONG)), fadeOut: 0, fadeIn: 0, serial: 5 });
      send({ t: 'sfx', data: encodeSfx(SFX.coin) });
      send({ t: 'blip', calls: blipCalls('piggy-1', { char: 'a' }).flatMap((c) => [waveIndex(c.wave), c.freq, c.lenMs, c.vol, c.attackMs, c.releaseMs, c.glide, c.lowpass, c.pan]) });
      let energy = 0;
      const L = new Float32Array(128);
      const R = new Float32Array(128);
      for (let q = 0; q < 400; q++) {
        expect(proc.process([], [[L, R]])).toBe(true);
        for (let i = 0; i < 128; i++) {
          expect(Number.isFinite(L[i]) && Number.isFinite(R[i])).toBe(true);
          energy += L[i] * L[i] + R[i] * R[i];
        }
        g.currentTime = (g.currentTime as number) + 128 / 48000;
      }
      expect(energy).toBeGreaterThan(1);
      const pos = sent.filter((m) => m.t === 'pos') as { serial: number; sec: number; time: number; state: number }[];
      expect(pos.length).toBeGreaterThan(40);
      const last = pos[pos.length - 1];
      expect(last.serial).toBe(5);
      expect(last.state).toBe(1);
      // position and context time advance together
      expect(last.sec).toBeCloseTo(last.time, 3);

      send({ t: 'stop', fadeMs: 50 });
      for (let q = 0; q < 40; q++) proc.process([], [[L, R]]);
      expect((sent[sent.length - 1] as { state: number }).state).toBe(0);
      expect(sent.some((m) => m.t === 'error')).toBe(false);
    } finally {
      for (const k of ['sampleRate', 'currentTime', 'registerProcessor', 'AudioWorkletProcessor']) delete g[k];
    }
  });
});
