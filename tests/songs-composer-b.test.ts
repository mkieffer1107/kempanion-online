import { describe, expect, test } from 'bun:test';
import { compileSong, ticksToSeconds, TICKS_PER_QUARTER as Q, type CompiledSong, type Song } from '../src/lib/audio/mml';
import piggy1Theme from '../src/lib/audio/songs/piggy1_theme';
import piggy2Theme from '../src/lib/audio/songs/piggy2_theme';
import piggy3Theme from '../src/lib/audio/songs/piggy3_theme';
import malachowsky from '../src/lib/audio/songs/malachowsky';
import physics from '../src/lib/audio/songs/physics';
import lab from '../src/lib/audio/songs/lab';
import hospital from '../src/lib/audio/songs/hospital';
import stadium from '../src/lib/audio/songs/stadium';
import lakeAlice from '../src/lib/audio/songs/lake_alice';
import plaza from '../src/lib/audio/songs/plaza';
import midtown from '../src/lib/audio/songs/midtown';
import library from '../src/lib/audio/songs/library';
import miniVolley from '../src/lib/audio/songs/mini_volley';
import miniPerfusion from '../src/lib/audio/songs/mini_perfusion';
import miniDebug from '../src/lib/audio/songs/mini_debug';

const BAR = Q * 4;
const SONGS: Song[] = [
  piggy1Theme, piggy2Theme, piggy3Theme, malachowsky, physics, lab, hospital, stadium,
  lakeAlice, plaza, midtown, library, miniVolley, miniPerfusion, miniDebug,
];
const EXPECTED_IDS = [
  'piggy1_theme', 'piggy2_theme', 'piggy3_theme', 'malachowsky', 'physics', 'lab', 'hospital', 'stadium',
  'lake_alice', 'plaza', 'midtown', 'library', 'mini_volley', 'mini_perfusion', 'mini_debug',
];

const compiled = new Map<string, CompiledSong>();
const compileOnce = (s: Song) => {
  if (!compiled.has(s.id)) compiled.set(s.id, compileSong(s));
  return compiled.get(s.id)!;
};

/** Leitmotifs as interval sequences (transposition- and rhythm-invariant). */
const intervals = (midi: number[]) => midi.slice(1).map((m, i) => m - midi[i]);
const MOTIF = {
  piggy1: intervals([79, 79, 83, 86, 83, 84, 86, 83, 79, 81, 79]), // o5 g g b >d <b | >c d <b g a g
  piggy2: intervals([62, 69, 67, 65, 64, 65, 62, 60, 62]), // o4 d a g f e f | d c d
  piggy3: intervals([77, 81, 84, 83, 81, 84, 83, 79, 81, 77, 79]), // o5 f a >c <b a >c | <b g a f g
};

function containsMotif(s: Song, motif: number[]): boolean {
  return compileOnce(s).tracks.some((tr) => {
    const iv = intervals(tr.events.flatMap((e) => (e.k === 'note' ? [Math.max(...e.midi)] : [])));
    for (let i = 0; i + motif.length <= iv.length; i++) if (motif.every((d, j) => iv[i + j] === d)) return true;
    return false;
  });
}

/** Ticks of drum hits with pitch class `pc` (0 = kick) in one compiled track. */
function drumHits(tr: CompiledSong['tracks'][number], pc: number): Set<number> {
  const hits = new Set<number>();
  let inst: string = tr.inst;
  for (const e of tr.events) {
    if (e.k === 'inst') inst = e.inst;
    if (e.k === 'note' && inst === 'drums' && e.midi.some((m) => m % 12 === pc)) hits.add(e.t);
  }
  return hits;
}

const DRUM_PCS = new Set([0, 2, 4, 5, 7, 9, 11]); // the documented kit (mml.ts DRUM_MAP)

describe('composer-b songs', () => {
  test('every owned id is present exactly once', () => {
    expect(SONGS.map((s) => s.id).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  for (const s of SONGS) {
    test(`${s.id}: compiles cleanly, equal tracks, sane mix`, () => {
      const c = compileOnce(s);
      expect(c.warnings).toEqual([]);
      expect(c.loopTick).toBeLessThan(c.length);
      expect(s.tracks.length).toBeGreaterThanOrEqual(4);
      expect(s.tracks.length).toBeLessThanOrEqual(7);
      for (const tr of s.tracks) {
        expect(tr.vol ?? 0.8).toBeGreaterThan(0);
        expect(tr.vol ?? 0.8).toBeLessThanOrEqual(1);
        expect(Math.abs(tr.pan ?? 0)).toBeLessThanOrEqual(1);
      }
      for (const tr of c.tracks) {
        let inst: string = tr.inst;
        for (const e of tr.events) {
          if (e.k === 'inst') inst = e.inst;
          if (e.k === 'note' && inst === 'drums') for (const m of e.midi) expect(DRUM_PCS.has(m % 12)).toBe(true);
        }
      }
    });

    test(`${s.id}: loops seamlessly on whole bars, 30–150 s`, () => {
      const c = compileOnce(s);
      expect(s.loop).toBe(true);
      expect(c.length % BAR).toBe(0);
      expect(c.loopTick % BAR).toBe(0);
      const bars = c.length / BAR;
      expect(bars).toBeGreaterThanOrEqual(24);
      expect(bars).toBeLessThanOrEqual(64);
      const secs = ticksToSeconds(c.length, c.bpm);
      expect(secs).toBeGreaterThanOrEqual(30);
      expect(secs).toBeLessThanOrEqual(150);
      expect(ticksToSeconds(c.length - c.loopTick, c.bpm)).toBeGreaterThanOrEqual(30);
      // tempo changes only where intended (none of these songs has any)
      expect(c.tracks.every((tr) => tr.events.every((e) => e.k !== 'tempo'))).toBe(true);
    });
  }

  test('briefed tempos', () => {
    const bpm = Object.fromEntries(SONGS.map((s) => [s.id, s.bpm]));
    expect(bpm).toMatchObject({
      piggy1_theme: 150, piggy2_theme: 72, piggy3_theme: 96, malachowsky: 124, physics: 90, lab: 100, hospital: 76,
      stadium: 120, plaza: 110, midtown: 110, library: 84, mini_perfusion: 96, mini_debug: 132,
    });
    expect(bpm.lake_alice).toBeGreaterThanOrEqual(72);
    expect(bpm.lake_alice).toBeLessThanOrEqual(84);
    expect(bpm.mini_volley).toBeGreaterThanOrEqual(150);
    expect(bpm.mini_volley).toBeLessThanOrEqual(160);
  });

  test('leitmotifs are quoted where the brief asks for them', () => {
    for (const s of [piggy1Theme, malachowsky, miniVolley]) expect(containsMotif(s, MOTIF.piggy1)).toBe(true);
    for (const s of [piggy2Theme, lab, hospital, miniPerfusion]) expect(containsMotif(s, MOTIF.piggy2)).toBe(true);
    for (const s of [piggy3Theme, physics, miniDebug]) expect(containsMotif(s, MOTIF.piggy3)).toBe(true);
  });

  test('piggy2_theme: a lub-dub on every beat, start to end', () => {
    const c = compileOnce(piggy2Theme);
    const kicks = new Set(c.tracks.flatMap((tr) => [...drumHits(tr, 0)]));
    for (let t = 0; t < c.length; t += Q) {
      expect(kicks.has(t)).toBe(true);
      expect(kicks.has(t + Q / 4)).toBe(true);
    }
  });

  test('mini_perfusion: constant 96 BPM, lub-dub on every beat, count-in + three 8-bar sections', () => {
    const c = compileOnce(miniPerfusion);
    expect(c.bpm).toBe(96);
    expect(c.loopTick).toBe(2 * BAR);
    expect(c.length).toBe(26 * BAR);
    const heart = c.tracks.find((tr) => {
      const k = drumHits(tr, 0);
      for (let t = 0; t < c.length; t += Q) if (!k.has(t) || !k.has(t + Q / 4)) return false;
      return true;
    });
    expect(heart).toBeDefined();
    // the heartbeat itself never changes velocity: every lub is equally loud
    const lubs = heart!.events.filter((e) => e.k === 'note' && e.t % Q === 0) as { vel: number }[];
    expect(new Set(lubs.map((e) => e.vel)).size).toBe(1);
  });

  test('mini_volley: four-on-the-floor kick on every beat', () => {
    const c = compileOnce(miniVolley);
    const kicks = new Set(c.tracks.flatMap((tr) => [...drumHits(tr, 0)]));
    for (let t = 0; t < c.length; t += Q) expect(kicks.has(t)).toBe(true);
  });
});
