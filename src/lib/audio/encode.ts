// Binary encoders for the Rust synth (layout documented in synth/src/format.rs — keep in sync).
// Pure TS (no DOM, no Vite features): used by the engine, bun tests and scripts/render-songs.ts.
import {
  compileMML, INSTRUMENT_IDS, midiToFreq, ticksToSeconds,
  type CompiledSong, type InstrumentId,
} from './mml';

export const FORMAT_VERSION = 1;
export const KIND_SONG = 1;
export const KIND_SFX = 2;
export const SONG_HEADER = 12;
export const TRACK_STRIDE = 4;
export const EVENT_STRIDE = 8;
export const SFX_HEADER = 4;
export const LAYER_STRIDE = 32;
export const MAX_TRACKS = 16;
export const MAX_LAYERS = 64;

export const EV = { note: 0, inst: 1, pan: 2, vib: 3, tempo: 4 } as const;
/** Same-tick ordering: tempo, instrument, pan, vibrato, then notes. */
const PRIO = [4, 1, 2, 3, 0] as const;

/** Raw waveforms (format.rs W_*). `nes` = stepped triangle, `metal` = short-mode LFSR noise. */
export const WAVES = ['pulse12', 'pulse25', 'pulse50', 'pulse75', 'tri', 'nes', 'saw', 'sine', 'noise', 'metal', 'fm'] as const;
export type Wave = (typeof WAVES)[number];

/** MML `y` step in semitones (synth song.rs VIB_STEP). */
export const VIB_STEP = 0.04;

export function instrumentIndex(id: InstrumentId): number {
  const i = INSTRUMENT_IDS.indexOf(id);
  if (i < 0) throw new Error(`unknown instrument ${id}`);
  return i;
}

export function waveIndex(w: Wave): number {
  const i = WAVES.indexOf(w);
  if (i < 0) throw new Error(`unknown wave ${w}`);
  return i;
}

/** Flatten a compiled song into the SONG blob. */
export function encodeSong(song: CompiledSong): Float32Array {
  if (song.tracks.length < 1 || song.tracks.length > MAX_TRACKS) {
    throw new Error(`song ${song.id}: needs 1–${MAX_TRACKS} tracks, has ${song.tracks.length}`);
  }
  type Row = { t: number; p: number; seq: number; v: number[] };
  const rows: Row[] = [];
  let seq = 0;
  const push = (t: number, kind: number, v: number[]) => rows.push({ t, p: PRIO[kind], seq: seq++, v });
  song.tracks.forEach((tr, ti) => {
    for (const ev of tr.events) {
      switch (ev.k) {
        case 'note':
          for (const m of ev.midi) push(ev.t, EV.note, [ev.t, ti, EV.note, m, ev.gate, ev.vel, ev.midi.length, 0]);
          break;
        case 'inst':
          push(ev.t, EV.inst, [ev.t, ti, EV.inst, instrumentIndex(ev.inst), 0, 0, 0, 0]);
          break;
        case 'pan':
          push(ev.t, EV.pan, [ev.t, ti, EV.pan, ev.pan, 0, 0, 0, 0]);
          break;
        case 'vib':
          push(ev.t, EV.vib, [ev.t, ti, EV.vib, ev.depth, 0, 0, 0, 0]);
          break;
        case 'tempo':
          push(ev.t, EV.tempo, [ev.t, ti, EV.tempo, ev.bpm, 0, 0, 0, 0]);
          break;
      }
    }
  });
  rows.sort((a, b) => a.t - b.t || a.p - b.p || a.seq - b.seq);

  const out = new Float32Array(SONG_HEADER + song.tracks.length * TRACK_STRIDE + rows.length * EVENT_STRIDE);
  out.set([
    KIND_SONG, FORMAT_VERSION, song.bpm, song.loop ? 1 : 0, song.echo,
    song.length, song.loop ? song.loopTick : 0, song.tracks.length, rows.length,
  ]);
  let o = SONG_HEADER;
  for (const tr of song.tracks) {
    out.set([instrumentIndex(tr.inst), tr.vol, tr.pan, 0], o);
    o += TRACK_STRIDE;
  }
  for (const r of rows) {
    out.set(r.v, o);
    o += EVENT_STRIDE;
  }
  return out;
}

// ───────────────────────── SFX ─────────────────────────

/** One voice of a sound effect. Times are milliseconds. */
export interface SfxLayer {
  /** Start offset (ms). */
  at?: number;
  /** Use an instrument preset instead of a raw voice (then only at/note/freq/to/glide/len/vol/pan/vib/echo apply). */
  inst?: InstrumentId;
  /** Raw waveform (default pulse50). */
  wave?: Wave;
  /** Custom pulse duty 0..1. */
  duty?: number;
  /** Pitch in Hz — for `noise`/`metal` this is the LFSR clock (brightness). */
  freq?: number;
  /** Pitch as MIDI number or note name ("c5", "f+4", "b-3"); overrides freq. */
  note?: number | string;
  /** Exponential pitch glide to this frequency (Hz)… */
  to?: number;
  /** …over this many ms (default: the whole length). */
  glide?: number;
  /** Gate length (ms): the release starts here. */
  len: number;
  /** Envelope: attack/decay/release in ms (decay/release = time to fall 60 dB), sustain 0..1. */
  a?: number;
  d?: number;
  s?: number;
  r?: number;
  vol?: number;
  pan?: number;
  /** Vibrato depth (semitones) and rate (Hz). */
  vib?: number;
  vibRate?: number;
  /** Tremolo depth 0..1 and rate (Hz). */
  trem?: number;
  tremRate?: number;
  filter?: 'lp' | 'bp' | 'hp';
  cutoff?: number;
  /** Cutoff sweep target (Hz) over `glide` (or the length). */
  cutoffTo?: number;
  q?: number;
  /** FM (wave 'fm'): modulator ratio, index (radians) decaying to `end` with time constant `time` ms. */
  fm?: { ratio: number; index: number; end?: number; time?: number };
  /** Low-passed white noise mixed in (breath, scrape). */
  noise?: number;
  /** Pitch drop: start this many semitones above and fall back with time constant `dropTime` ms. */
  drop?: number;
  dropTime?: number;
  /** Echo send 0..1 (default 0.08). */
  echo?: number;
  /** Clap-style re-triggered bursts at the start and their spacing (ms). */
  bursts?: number;
  burstGap?: number;
}

export interface SfxTrack { inst: InstrumentId; mml: string; vol?: number; pan?: number; echo?: number }

/** A sound effect: raw layers and/or tiny MML clips (each note becomes an instrument layer). */
export interface SfxDef {
  layers?: SfxLayer[];
  tracks?: SfxTrack[];
  /** Tempo for `tracks` (default 150). */
  bpm?: number;
  /** Overall gain (default 1). */
  gain?: number;
}

const NOTE_RE = /^([a-g])([+#-]*)(-?\d)$/i;
const SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** "c5" → 72, "f+4" → 66, "b-3" → 58 (same octave convention as MML: o4 c = 60). */
export function noteToMidi(n: number | string): number {
  if (typeof n === 'number') return n;
  const m = NOTE_RE.exec(n.trim());
  if (!m) throw new Error(`bad note name "${n}"`);
  let acc = 0;
  for (const c of m[2]) acc += c === '-' ? -1 : 1;
  return (Number(m[3]) + 1) * 12 + SEMI[m[1].toLowerCase()] + acc;
}

/** Expand MML tracks into instrument layers. */
export function sfxTrackLayers(tracks: SfxTrack[], bpm = 150): SfxLayer[] {
  const layers: SfxLayer[] = [];
  for (const tr of tracks) {
    const c = compileMML(tr.mml, { inst: tr.inst });
    let inst = tr.inst;
    let pan = tr.pan ?? 0;
    let vib = 0;
    for (const ev of c.events) {
      if (ev.k === 'inst') inst = ev.inst;
      else if (ev.k === 'pan') pan = ev.pan;
      else if (ev.k === 'vib') vib = ev.depth * VIB_STEP;
      else if (ev.k === 'note') {
        for (const m of ev.midi) {
          layers.push({
            at: ticksToSeconds(ev.t, bpm) * 1000,
            inst,
            note: m,
            len: ticksToSeconds(ev.gate, bpm) * 1000,
            vol: ev.vel * (tr.vol ?? 1),
            pan,
            vib: vib || undefined,
            echo: tr.echo,
          });
        }
      }
    }
  }
  return layers;
}

export function sfxLayers(def: SfxDef): SfxLayer[] {
  return [...(def.layers ?? []), ...(def.tracks ? sfxTrackLayers(def.tracks, def.bpm) : [])];
}

/** Total duration of an SFX in ms (start of the last layer + its length + release). */
export function sfxDuration(def: SfxDef): number {
  return Math.max(0, ...sfxLayers(def).map((l) => (l.at ?? 0) + l.len + (l.r ?? 30)));
}

export function encodeSfx(def: SfxDef): Float32Array {
  const layers = sfxLayers(def);
  if (layers.length > MAX_LAYERS) throw new Error(`sfx has ${layers.length} layers (max ${MAX_LAYERS})`);
  const out = new Float32Array(SFX_HEADER + layers.length * LAYER_STRIDE);
  out.set([KIND_SFX, FORMAT_VERSION, layers.length, def.gain ?? 1]);
  layers.forEach((l, i) => out.set(encodeLayer(l), SFX_HEADER + i * LAYER_STRIDE));
  return out;
}

function encodeLayer(l: SfxLayer): number[] {
  const ms = (x: number | undefined, def: number) => (x ?? def) / 1000;
  const freq = l.note !== undefined ? midiToFreq(noteToMidi(l.note)) : (l.freq ?? 440);
  const wave = l.wave ?? (l.fm ? 'fm' : 'pulse50');
  const fm = l.fm ?? (wave === 'fm' ? { ratio: 1, index: 1 } : undefined);
  const filter = l.filter === 'lp' ? 1 : l.filter === 'bp' ? 2 : l.filter === 'hp' ? 3 : 0;
  const v = [
    ms(l.at, 0),
    l.inst ? instrumentIndex(l.inst) : -1,
    waveIndex(wave),
    l.duty ?? 0,
    freq,
    l.to ?? 0,
    ms(l.glide, l.len),
    ms(l.len, 0),
    ms(l.a, 2),
    ms(l.d, 100),
    l.s ?? 1,
    ms(l.r, 30),
    l.vol ?? 0.5,
    l.pan ?? 0,
    l.vib ?? 0,
    l.vibRate ?? 5.5,
    l.trem ?? 0,
    l.tremRate ?? 6,
    filter,
    l.cutoff ?? 8000,
    l.cutoffTo ?? 0,
    l.q ?? 0.707,
    fm?.ratio ?? 1,
    fm?.index ?? 0,
    fm?.end ?? 0,
    ms(fm?.time, 100),
    l.noise ?? 0,
    l.drop ?? 0,
    ms(l.dropTime, 50),
    l.echo ?? 0.08,
    l.bursts ?? 0,
    ms(l.burstGap, 10),
  ];
  for (const x of v) if (!Number.isFinite(x)) throw new Error(`sfx layer has a non-finite value: ${JSON.stringify(l)}`);
  return v;
}
