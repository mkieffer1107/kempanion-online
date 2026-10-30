// MML (Music Macro Language) compiler for Kempanion Online songs and SFX.
// See docs/ARCHITECTURE.md §5 for the dialect. Pure TS, no DOM — runs in tests and the main thread.

/** Ticks per whole note. Quarter = 96. Supports 1/64 notes and triplets (3, 6, 12, 24, 48). */
export const TICKS_PER_WHOLE = 384;
export const TICKS_PER_QUARTER = TICKS_PER_WHOLE / 4;

export type InstrumentId =
  | 'pulse12' | 'pulse25' | 'pulse50' | 'tri' | 'saw' | 'sine'
  | 'lead' | 'pluck' | 'epiano' | 'bell' | 'glock' | 'marimba'
  | 'bass' | 'pad' | 'strings' | 'flute' | 'brass' | 'noise' | 'drums';

export const INSTRUMENT_IDS: readonly InstrumentId[] = [
  'pulse12', 'pulse25', 'pulse50', 'tri', 'saw', 'sine',
  'lead', 'pluck', 'epiano', 'bell', 'glock', 'marimba',
  'bass', 'pad', 'strings', 'flute', 'brass', 'noise', 'drums',
] as const;

/** Drum kit mapping for `@drums`: pitch class → drum sound. */
export const DRUM_MAP = { 0: 'kick', 2: 'snare', 4: 'hat', 5: 'openhat', 7: 'clap', 9: 'tom_low', 11: 'tom_high' } as const;

export interface Track {
  inst: InstrumentId;
  /** 0..1 track gain (default 0.8). */
  vol?: number;
  /** -1..1 (default 0). */
  pan?: number;
  mml: string;
}

export interface Song {
  id: string;
  title: string;
  bpm: number;
  /** Loop forever (BGM) or play once (jingles). */
  loop: boolean;
  tracks: Track[];
  /** Optional: send amount to the master echo, 0..1 (default 0.25). */
  echo?: number;
}

export type TrackEvent =
  | { t: number; k: 'note'; midi: number[]; dur: number; gate: number; vel: number }
  | { t: number; k: 'inst'; inst: InstrumentId }
  | { t: number; k: 'pan'; pan: number }
  | { t: number; k: 'vib'; depth: number }
  | { t: number; k: 'tempo'; bpm: number };

export interface CompiledTrack {
  events: TrackEvent[];
  /** Total length in ticks. */
  length: number;
  /** Tick of the `L` marker, or null. */
  loopTick: number | null;
}

export interface CompiledSong {
  id: string;
  title: string;
  bpm: number;
  loop: boolean;
  echo: number;
  tracks: (CompiledTrack & { inst: InstrumentId; vol: number; pan: number })[];
  /** Length of the longest track (ticks). */
  length: number;
  /** Where looping restarts (ticks). */
  loopTick: number;
  /** Human-readable problems that don't stop compilation (unequal track lengths, mismatched loop points). */
  warnings: string[];
}

export class MMLError extends Error {
  constructor(message: string, public pos: number, public src: string) {
    const lineStart = src.lastIndexOf('\n', pos - 1) + 1;
    const line = src.slice(0, pos).split('\n').length;
    const col = pos - lineStart + 1;
    const lineText = src.slice(lineStart, src.indexOf('\n', pos) === -1 ? undefined : src.indexOf('\n', pos));
    super(`${message} (line ${line}, col ${col}): ${lineText.trim()}`);
  }
}

const SEMITONE: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const VALID_LEN = new Set([1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]);

/** Strip comments and expand `[ ... ]n` repeats. */
function preprocess(src: string): string {
  const noComments = src.replace(/;[^\n]*/g, '');
  return expandRepeats(noComments, 0).out;

  function expandRepeats(s: string, start: number): { out: string; end: number } {
    let out = '';
    let i = start;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '[') {
        const inner = expandRepeats(s, i + 1);
        i = inner.end; // points just after ']'
        const m = /^\d+/.exec(s.slice(i));
        const n = m ? parseInt(m[0], 10) : 2;
        if (m) i += m[0].length;
        if (n < 1 || n > 64) throw new MMLError(`bad repeat count ${n}`, i, s);
        out += ` ${inner.out} `.repeat(n);
      } else if (ch === ']') {
        if (start === 0) throw new MMLError('unmatched ]', i, s);
        return { out, end: i + 1 };
      } else {
        out += ch;
        i++;
      }
    }
    if (start !== 0) throw new MMLError('unclosed [', start - 1, s);
    return { out, end: i };
  }
}

export interface CompileOptions {
  /** Allow tempo commands (first track only). */
  allowTempo?: boolean;
  /** Starting instrument (emitted at tick 0). */
  inst?: InstrumentId;
}

export function compileMML(rawSrc: string, opts: CompileOptions = {}): CompiledTrack {
  const src = preprocess(rawSrc);
  const events: TrackEvent[] = [];
  let i = 0;
  let t = 0;
  let octave = 4;
  let defLen = TICKS_PER_WHOLE / 4;
  let vol = 12;
  let gate = 7;
  let transpose = 0;
  let loopTick: number | null = null;
  let lastNote = null as Extract<TrackEvent, { k: 'note' }> | null; // for ties

  if (opts.inst) events.push({ t: 0, k: 'inst', inst: opts.inst });

  const peek = () => src[i];
  const skipWs = () => { while (i < src.length && /[\s|]/.test(src[i])) i++; };
  const readInt = (signed = false): number | null => {
    const m = (signed ? /^[-+]?\d+/ : /^\d+/).exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseInt(m[0], 10);
  };
  /** Parse an optional length + dots; returns ticks (default length if absent). */
  const readLength = (): number => {
    const start = i;
    const n = readInt();
    let ticks: number;
    if (n === null) ticks = defLen;
    else {
      if (!VALID_LEN.has(n)) throw new MMLError(`invalid length ${n}`, start, src);
      ticks = TICKS_PER_WHOLE / n;
    }
    let add = ticks / 2;
    while (peek() === '.') {
      i++;
      if (!Number.isInteger(add)) throw new MMLError('too many dots for this length', i - 1, src);
      ticks += add;
      add /= 2;
    }
    return ticks;
  };
  const readAccidentals = (): number => {
    let d = 0;
    while (peek() === '+' || peek() === '#' || peek() === '-') d += src[i++] === '-' ? -1 : 1;
    return d;
  };
  const midiOf = (letter: string, acc: number, oct: number) => (oct + 1) * 12 + SEMITONE[letter] + acc + transpose;
  const checkMidi = (m: number, pos: number) => {
    if (m < 0 || m > 127) throw new MMLError(`note out of range (midi ${m})`, pos, src);
    return m;
  };
  const pushNote = (midi: number[], dur: number) => {
    const ev = { t, k: 'note' as const, midi, dur, gate: Math.max(1, Math.round((dur * gate) / 8)), vel: vol / 15 };
    events.push(ev);
    lastNote = ev;
    t += dur;
  };

  while (i < src.length) {
    skipWs();
    if (i >= src.length) break;
    const pos = i;
    const raw = src[i++];
    if (raw === 'L') {
      loopTick = t;
      continue;
    }
    const ch = raw.toLowerCase();

    if (ch in SEMITONE) {
      const acc = readAccidentals();
      const midi = checkMidi(midiOf(ch, acc, octave), pos);
      let dur = readLength();
      // `&` ties to following notes of the same pitch: merge durations.
      while (peek() === '&') {
        i++;
        skipWs();
        const p2 = i;
        const l2 = src[i++]?.toLowerCase();
        if (!(l2 in SEMITONE)) throw new MMLError('& must be followed by a note', p2, src);
        const acc2 = readAccidentals();
        if (checkMidi(midiOf(l2, acc2, octave), p2) !== midi) throw new MMLError('& ties must join the same pitch', p2, src);
        dur += readLength();
      }
      pushNote([midi], dur);
    } else if (ch === 'r') {
      t += readLength();
      lastNote = null;
    } else if (ch === '^') {
      const add = readLength();
      if (lastNote && lastNote.t + lastNote.dur === t) {
        lastNote.dur += add;
        lastNote.gate = Math.max(1, Math.round((lastNote.dur * gate) / 8));
      }
      t += add;
    } else if (ch === "'") {
      // chord: 'c e g'4  — octave shifts inside are local to the chord
      let oct = octave;
      const midi: number[] = [];
      while (i < src.length && src[i] !== "'") {
        const p = i;
        const c = src[i++].toLowerCase();
        if (/\s/.test(c)) continue;
        if (c === '<') { oct--; continue; }
        if (c === '>') { oct++; continue; }
        if (!(c in SEMITONE)) throw new MMLError(`unexpected '${c}' in chord`, p, src);
        midi.push(checkMidi(midiOf(c, readAccidentals(), oct), p));
      }
      if (src[i] !== "'") throw new MMLError('unclosed chord quote', pos, src);
      i++;
      if (midi.length === 0 || midi.length > 4) throw new MMLError('chords need 1–4 notes', pos, src);
      pushNote(midi, readLength());
    } else if (ch === 'o') {
      const n = readInt();
      if (n === null || n < 0 || n > 8) throw new MMLError('o needs 0..8', pos, src);
      octave = n;
    } else if (ch === '>') {
      octave++;
    } else if (ch === '<') {
      octave--;
    } else if (ch === 'l') {
      const n = readInt();
      if (n === null || !VALID_LEN.has(n)) throw new MMLError('l needs a valid length', pos, src);
      defLen = TICKS_PER_WHOLE / n;
      let add = defLen / 2;
      while (peek() === '.') { i++; defLen += add; add /= 2; }
    } else if (ch === 'v') {
      const n = readInt();
      if (n === null || n < 0 || n > 15) throw new MMLError('v needs 0..15', pos, src);
      vol = n;
    } else if (ch === 'q') {
      const n = readInt();
      if (n === null || n < 1 || n > 8) throw new MMLError('q needs 1..8', pos, src);
      gate = n;
    } else if (ch === 'p') {
      const n = readInt(true);
      if (n === null || n < -50 || n > 50) throw new MMLError('p needs -50..50', pos, src);
      events.push({ t, k: 'pan', pan: n / 50 });
    } else if (ch === 'y') {
      const n = readInt();
      if (n === null || n < 0 || n > 15) throw new MMLError('y needs 0..15', pos, src);
      events.push({ t, k: 'vib', depth: n });
    } else if (ch === 'k') {
      const n = readInt(true);
      if (n === null || n < -24 || n > 24) throw new MMLError('k needs -24..24', pos, src);
      transpose = n;
    } else if (ch === 't') {
      const n = readInt();
      if (n === null || n < 30 || n > 300) throw new MMLError('t needs 30..300', pos, src);
      if (!opts.allowTempo) throw new MMLError('tempo changes are only allowed in the first track', pos, src);
      events.push({ t, k: 'tempo', bpm: n });
    } else if (ch === '@') {
      const m = /^[a-z0-9_]+/.exec(src.slice(i));
      if (!m) throw new MMLError('@ needs an instrument name', pos, src);
      i += m[0].length;
      if (!(INSTRUMENT_IDS as readonly string[]).includes(m[0])) throw new MMLError(`unknown instrument @${m[0]}`, pos, src);
      events.push({ t, k: 'inst', inst: m[0] as InstrumentId });
    } else {
      throw new MMLError(`unexpected '${src[pos]}'`, pos, src);
    }
  }
  return { events, length: t, loopTick };
}

export function compileSong(song: Song): CompiledSong {
  if (!song.tracks.length) throw new Error(`song ${song.id} has no tracks`);
  const warnings: string[] = [];
  const tracks = song.tracks.map((tr, idx) => {
    try {
      const c = compileMML(tr.mml, { allowTempo: idx === 0, inst: tr.inst });
      return { ...c, inst: tr.inst, vol: tr.vol ?? 0.8, pan: tr.pan ?? 0 };
    } catch (e) {
      throw new Error(`song ${song.id} track ${idx}: ${(e as Error).message}`);
    }
  });
  const length = Math.max(...tracks.map((t) => t.length));
  const lens = new Set(tracks.map((t) => t.length));
  if (lens.size > 1) warnings.push(`tracks have different lengths: ${tracks.map((t) => t.length).join(', ')} ticks`);
  const loops = new Set(tracks.map((t) => t.loopTick ?? 0));
  if (loops.size > 1) warnings.push(`tracks have different loop points: ${tracks.map((t) => t.loopTick ?? 0).join(', ')}`);
  const loopTick = Math.max(...tracks.map((t) => t.loopTick ?? 0));
  return { id: song.id, title: song.title, bpm: song.bpm, loop: song.loop, echo: song.echo ?? 0.25, tracks, length, loopTick, warnings };
}

/** Seconds for a tick count at a constant tempo. */
export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / TICKS_PER_QUARTER) * (60 / bpm);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
