#!/usr/bin/env bun
/**
 * Offline render check for every song, jingle, SFX and blip voice — validate music without ears.
 * Loads public/assets/audio/kempa_synth.wasm directly (no AudioContext) and renders each item.
 *
 *   bun scripts/render-songs.ts                      # everything, 20 s per song
 *   bun scripts/render-songs.ts --only campus_day    # one song / jingle / sfx id (comma list ok)
 *   bun scripts/render-songs.ts --only songs         # a group: songs | jingles | sfx | voices
 *   bun scripts/render-songs.ts --seconds 40 --wav out/   # longer renders, write 16-bit WAVs
 *
 * Exit code 1 on: compile errors, NaN/Inf, silence, or a mix that clips before the limiter (peak > 1.0).
 * Warnings (not failures): unequal track lengths/loop points, hot mixes (> 0.9), SFX still ringing at the end.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileSong, type Song } from '../src/lib/audio/mml';
import { encodeSfx, encodeSong, sfxDuration, waveIndex } from '../src/lib/audio/encode';
import { JINGLES } from '../src/lib/audio/jingles';
import { SFX, SFX_IDS } from '../src/lib/audio/sfx';
import { tempoMap } from '../src/lib/audio/timing';
import { blipCalls, VOICE_STYLE, VOICES } from '../src/lib/audio/voices';

const root = resolve(import.meta.dir, '..');
const WASM = join(root, 'public/assets/audio/kempa_synth.wasm');
const SONG_DIR = join(root, 'src/lib/audio/songs');

// ── args ──
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const SECONDS = Number(flag('--seconds') ?? 20);
const RATE = Number(flag('--rate') ?? 48000);
const WAV_DIR = flag('--wav');
const ONLY = (flag('--only') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (args.includes('--help') || args.includes('-h')) {
  console.log(readFileSync(import.meta.path, 'utf8').split('*/')[0]);
  process.exit(0);
}
const wanted = (group: string, id: string) => ONLY.length === 0 || ONLY.includes(group) || ONLY.includes(id);

// ── synth ──
type Ex = {
  memory: WebAssembly.Memory;
  init(sr: number): number; alloc(n: number): number; free(p: number, n: number): void;
  load_song(p: number, n: number): number; play(fo: number, fi: number, serial: number): number;
  trigger_sfx(p: number, n: number): number; jingle(p: number, n: number): number;
  blip_ex(w: number, f: number, len: number, vol: number, a: number, r: number, g: number, lp: number, pan: number): void;
  render(n: number): number; stats(): number; song_state(): number; song_loops(): number;
  set_volumes(m: number, b: number, s: number, v: number): void;
};

if (!existsSync(WASM)) {
  console.error(`✗ ${WASM.replace(root + '/', '')} is missing — run \`bun run build:synth\` first.`);
  process.exit(1);
}
const MODULE = new WebAssembly.Module(readFileSync(WASM));

function synth(): Ex {
  const ex = new WebAssembly.Instance(MODULE, {}).exports as unknown as Ex;
  ex.init(RATE);
  ex.set_volumes(1, 1, 1, 1);
  return ex;
}

function send(ex: Ex, data: Float32Array, fn: (p: number, n: number) => number): number {
  const bytes = data.length * 4;
  const p = ex.alloc(bytes);
  new Float32Array(ex.memory.buffer, p, data.length).set(data);
  const r = fn(p, data.length);
  ex.free(p, bytes);
  return r;
}

/** Render seconds of interleaved stereo; `each` runs before every 128-frame quantum (for blips). */
function render(ex: Ex, secs: number, each?: (frame: number) => void): Float32Array {
  const frames = Math.ceil((secs * RATE) / 128) * 128;
  const out = new Float32Array(frames * 2);
  for (let f = 0; f < frames; f += 128) {
    each?.(f);
    out.set(new Float32Array(ex.memory.buffer, ex.render(128), 256), f * 2);
  }
  return out;
}

interface Row {
  kind: string;
  id: string;
  secs: string;
  peak: number;
  mix: number;
  rms: number;
  voices: number;
  steals: number;
  notes: string[];
  fail: boolean;
}

function analyze(kind: string, id: string, ex: Ex, out: Float32Array, secs: string, notes: string[] = []): Row {
  const st = new Float32Array(ex.memory.buffer, ex.stats(), 8).slice();
  let peak = 0;
  let sum = 0;
  let bad = 0;
  let active = 0;
  let activeSum = 0;
  for (let i = 0; i < out.length; i += 512) {
    let s = 0;
    const end = Math.min(out.length, i + 512);
    for (let k = i; k < end; k++) {
      const x = out[k];
      if (!Number.isFinite(x)) {
        bad++;
        continue;
      }
      peak = Math.max(peak, Math.abs(x));
      s += x * x;
    }
    sum += s;
    if (s / (end - i) > 1e-7) {
      active += end - i;
      activeSum += s;
    }
  }
  const rms = active ? Math.sqrt(activeSum / active) : 0;
  const row: Row = { kind, id, secs, peak, mix: st[0], rms, voices: st[2], steals: st[3], notes, fail: false };
  if (bad > 0 || st[4] > 0) {
    row.fail = true;
    notes.push(`NaN/Inf (${bad} samples, ${st[4]} resets)`);
  }
  if (peak < 1e-3 || Math.sqrt(sum / out.length) < 1e-5) {
    row.fail = true;
    notes.push('silent');
  }
  if (st[0] > 1.0) {
    row.fail = true;
    notes.push(`clips before the limiter (${st[0].toFixed(2)}) — lower track vol / v`);
  } else if (st[0] > 0.9) notes.push('hot mix (> 0.9)');
  if (peak > 1.0) {
    row.fail = true;
    notes.push('output > 1.0');
  }
  if (WAV_DIR) writeWav(join(WAV_DIR, `${kind}-${id}.wav`), out);
  return row;
}

function writeWav(path: string, data: Float32Array) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  const n = data.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const x = Number.isFinite(data[i]) ? Math.max(-1, Math.min(1, data[i])) : 0;
    buf.writeInt16LE(Math.round(x * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
}

const rows: Row[] = [];
const errRow = (kind: string, id: string, msg: string) =>
  rows.push({ kind, id, secs: '-', peak: 0, mix: 0, rms: 0, voices: 0, steals: 0, notes: [msg], fail: true });

function renderSong(kind: string, song: Song, jingle = false) {
  let c;
  try {
    c = compileSong(song);
  } catch (e) {
    return errRow(kind, song.id, `compile error: ${(e as Error).message}`);
  }
  const map = tempoMap(c);
  const ex = synth();
  const data = encodeSong(c);
  const code = jingle ? send(ex, data, (p, n) => ex.jingle(p, n)) : send(ex, data, (p, n) => ex.load_song(p, n));
  if (code !== 0) return errRow(kind, song.id, `synth rejected the song (code ${code})`);
  if (!jingle) ex.play(0, 0, 1);
  const secs = song.loop ? Math.max(SECONDS, Math.min(map.lengthSec + 2, 120)) : map.lengthSec + 3;
  const out = render(ex, secs);
  const notes = [...c.warnings.map((w) => `warn: ${w}`)];
  if (song.loop) notes.push(`loop ${map.loopSec.toFixed(1)}–${map.lengthSec.toFixed(1)} s, wrapped ${ex.song_loops()}×`);
  rows.push(analyze(kind, song.id, ex, out, map.lengthSec.toFixed(1), notes));
}

// ── songs (composers' files); a file whose id is a JingleId (or jingle_<id>) is a jingle override ──
const typesSrc = readFileSync(join(root, 'src/lib/types.ts'), 'utf8');
const unionOf = (name: string) => [...(new RegExp(`export type ${name} =([^;]+);`).exec(typesSrc)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const SONG_IDS = unionOf('SongId');
const JINGLE_IDS = unionOf('JingleId');
const jingleOf = (id: string) => (JINGLE_IDS.includes(id) ? id : id.startsWith('jingle_') && JINGLE_IDS.includes(id.slice(7)) ? id.slice(7) : null);
const overridden = new Set<string>();

if (ONLY.length === 0 || ONLY.some((o) => o !== 'sfx' && o !== 'voices')) {
  const files = existsSync(SONG_DIR) ? readdirSync(SONG_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts').sort() : [];
  const ids = new Set<string>();
  for (const f of files) {
    const fileId = basename(f, '.ts');
    const jingle = jingleOf(fileId);
    if (!wanted(jingle ? 'jingles' : 'songs', fileId) && !(jingle && wanted('jingles', jingle))) continue;
    let song: Song | undefined;
    try {
      song = (await import(pathToFileURL(join(SONG_DIR, f)).href)).default as Song;
    } catch (e) {
      errRow(jingle ? 'jingle' : 'song', fileId, `import error: ${(e as Error).message}`);
      continue;
    }
    if (!song || typeof song !== 'object' || !Array.isArray(song.tracks)) {
      errRow(jingle ? 'jingle' : 'song', fileId, 'no default-exported Song');
      continue;
    }
    if (song.id !== fileId) console.warn(`⚠ ${f}: id "${song.id}" differs from the file name`);
    ids.add(song.id);
    const asJingle = jingleOf(song.id);
    if (asJingle) overridden.add(asJingle);
    else if (!SONG_IDS.includes(song.id)) console.warn(`⚠ ${f}: "${song.id}" is neither a SongId nor a JingleId (src/lib/types.ts) — the game can't play it`);
    renderSong(asJingle ? 'jingle' : 'song', song, !!asJingle);
  }
  if (ONLY.length === 0) {
    const missing = SONG_IDS.filter((id) => !ids.has(id));
    if (missing.length) console.log(`ℹ SongIds without a song file yet (${missing.length}): ${missing.join(' ')}`);
  }
}

// ── built-in jingles (used for any JingleId without a composer file) ──
for (const [id, song] of Object.entries(JINGLES)) {
  if (!wanted('jingles', id) && !wanted('jingles', song.id)) continue;
  renderSong('builtin', song, true);
  if (overridden.has(id)) rows[rows.length - 1].notes.push('fallback (composer file wins)');
}

// ── sfx ──
for (const id of SFX_IDS) {
  if (!wanted('sfx', id)) continue;
  let data: Float32Array;
  try {
    data = encodeSfx(SFX[id]);
  } catch (e) {
    errRow('sfx', id, `encode error: ${(e as Error).message}`);
    continue;
  }
  const ex = synth();
  const dur = sfxDuration(SFX[id]) / 1000;
  if (send(ex, data, (p, n) => ex.trigger_sfx(p, n)) !== 0) {
    errRow('sfx', id, 'synth rejected the sfx');
    continue;
  }
  const out = render(ex, dur + 1.2);
  const row = analyze('sfx', id, ex, out, dur.toFixed(2));
  let tail = 0;
  for (let i = out.length - Math.round(RATE * 0.2) * 2; i < out.length; i++) tail = Math.max(tail, Math.abs(out[i]));
  if (tail > Math.max(2e-3, row.peak * 0.03)) row.notes.push(`still sounding after ${(dur + 1).toFixed(1)} s`);
  rows.push(row);
}

// ── blip voices: a typed line at each voice's speed ──
for (const voice of Object.keys(VOICES) as (keyof typeof VOICES)[]) {
  if (!wanted('voices', voice)) continue;
  const line = 'Okay, so I was thinking about the sakura trees again!';
  const style = VOICE_STYLE[voice];
  const ex = synth();
  const framesPerChar = RATE / style.cps;
  let next = 0;
  let i = 0;
  let letters = 0;
  const out = render(ex, line.length / style.cps + 0.5, (frame) => {
    while (i < line.length && frame >= next) {
      const ch = line[i];
      const letter = /\p{L}|\d/u.test(ch);
      if (letter && letters++ % style.everyN === 0) {
        const last = !/\p{L}/u.test(line.slice(i + 1));
        for (const c of blipCalls(voice, { char: ch, index: i, ending: '!', last })) {
          ex.blip_ex(waveIndex(c.wave), c.freq, c.lenMs, c.vol, c.attackMs, c.releaseMs, c.glide, c.lowpass, c.pan);
        }
      }
      i++;
      next += framesPerChar;
    }
  });
  rows.push(analyze('voice', voice, ex, out, (line.length / style.cps).toFixed(1)));
}

// ── report ──
const db = (x: number) => (x > 0 ? `${(20 * Math.log10(x)).toFixed(1)}` : '-inf');
const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
const lpad = (s: string, n: number) => (s.length >= n ? s : ' '.repeat(n - s.length) + s);
console.log(
  `\n${pad('kind', 8)}${pad('id', 22)}${lpad('len s', 7)}${lpad('peak', 7)}${lpad('mixpk', 7)}${lpad('rms dB', 8)}${lpad('voices', 7)}${lpad('steal', 6)}  notes`,
);
console.log('─'.repeat(100));
for (const r of rows) {
  const status = r.fail ? '✗ ' : '';
  console.log(
    `${pad(r.kind, 8)}${pad(r.id, 22)}${lpad(r.secs, 7)}${lpad(r.peak.toFixed(3), 7)}${lpad(r.mix.toFixed(3), 7)}${lpad(db(r.rms), 8)}${lpad(String(r.voices), 7)}${lpad(String(r.steals), 6)}  ${status}${r.notes.join('; ')}`,
  );
}
const failed = rows.filter((r) => r.fail);
console.log('─'.repeat(100));
console.log(`${rows.length} rendered at ${RATE} Hz (volumes 1.0, ${SECONDS} s per looping song)${WAV_DIR ? ` → WAVs in ${WAV_DIR}` : ''}`);
if (failed.length) {
  console.log(`✗ ${failed.length} problem(s): ${failed.map((r) => `${r.kind}:${r.id}`).join(', ')}`);
  process.exit(1);
}
console.log('✓ no NaN, no silence, no clipping');
