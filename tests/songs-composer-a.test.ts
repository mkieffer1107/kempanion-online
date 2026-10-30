import { describe, expect, test } from 'bun:test';
import { compileSong, ticksToSeconds, type CompiledSong, type Song } from '../src/lib/audio/mml';
import kempaLogo from '../src/lib/audio/songs/kempa_logo';
import title from '../src/lib/audio/songs/title';
import prologue from '../src/lib/audio/songs/prologue';
import campusDay from '../src/lib/audio/songs/campus_day';
import campusEvening from '../src/lib/audio/songs/campus_evening';
import night from '../src/lib/audio/songs/night';
import dorm from '../src/lib/audio/songs/dorm';
import morning from '../src/lib/audio/songs/morning';
import map from '../src/lib/audio/songs/map';
import shop from '../src/lib/audio/songs/shop';
import sad from '../src/lib/audio/songs/sad';
import happy from '../src/lib/audio/songs/happy';
import romance from '../src/lib/audio/songs/romance';
import tension from '../src/lib/audio/songs/tension';
import comedy from '../src/lib/audio/songs/comedy';
import sleep from '../src/lib/audio/songs/sleep';
import credits from '../src/lib/audio/songs/credits';
import levelUp from '../src/lib/audio/songs/level_up';
import bondUp from '../src/lib/audio/songs/bond_up';
import victory from '../src/lib/audio/songs/victory';
import fail from '../src/lib/audio/songs/fail';
import purchase from '../src/lib/audio/songs/purchase';
import eventStart from '../src/lib/audio/songs/event_start';
import dailyBonus from '../src/lib/audio/songs/daily_bonus';

const BGM: Song[] = [
  title, prologue, campusDay, campusEvening, night, dorm, morning, map, shop,
  sad, happy, romance, tension, comedy, sleep, credits,
];
const ONE_SHOTS: Song[] = [kempaLogo, levelUp, bondUp, victory, fail, purchase, eventStart, dailyBonus];

const EXPECTED_IDS = [
  'kempa_logo', 'title', 'prologue', 'campus_day', 'campus_evening', 'night', 'dorm', 'morning', 'map', 'shop',
  'sad', 'happy', 'romance', 'tension', 'comedy', 'sleep', 'credits',
  'level_up', 'bond_up', 'victory', 'fail', 'purchase', 'event_start', 'daily_bonus',
];

/** Leitmotifs as interval sequences (transposition-invariant), from docs: TITLE, Piggy 1/2/3. */
const intervals = (midi: number[]) => midi.slice(1).map((m, i) => m - midi[i]);
const MOTIF = {
  title: intervals([76, 79, 81, 79, 76, 74, 72, 74, 76, 74]), // o5 e g a g e d | c d e d
  titleHead: intervals([76, 79, 81, 79, 76, 74]), // first bar only
  piggy1: intervals([79, 79, 83, 86, 83, 84, 86, 83, 79, 81, 79]), // o5 g g b >d <b | >c d <b g a g
  piggy2: intervals([62, 69, 67, 65, 64, 65, 62, 60, 62]), // o4 d a g f e f | d c d
  piggy3: intervals([77, 81, 84, 83, 81, 84, 83, 79, 81, 77, 79]), // o5 f a >c <b a >c | <b g a f g
};

const compiled = new Map<string, CompiledSong>();
const compileOnce = (s: Song) => {
  if (!compiled.has(s.id)) compiled.set(s.id, compileSong(s));
  return compiled.get(s.id)!;
};

function containsMotif(s: Song, motif: number[]): boolean {
  return compileOnce(s).tracks.some((tr) => {
    const tops = tr.events.flatMap((e) => (e.k === 'note' ? [Math.max(...e.midi)] : []));
    const iv = intervals(tops);
    for (let i = 0; i + motif.length <= iv.length; i++) if (motif.every((d, j) => iv[i + j] === d)) return true;
    return false;
  });
}

const DRUM_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

describe('composer-a songs', () => {
  test('every owned id is present exactly once', () => {
    const ids = [...BGM, ...ONE_SHOTS].map((s) => s.id).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  for (const s of [...BGM, ...ONE_SHOTS]) {
    test(`${s.id}: compiles with no warnings, sane mix`, () => {
      const c = compileOnce(s);
      expect(c.warnings).toEqual([]);
      expect(c.loopTick).toBeLessThan(c.length);
      expect(s.tracks.length).toBeLessThanOrEqual(7);
      for (const tr of s.tracks) {
        expect(tr.vol ?? 0.8).toBeGreaterThan(0);
        expect(tr.vol ?? 0.8).toBeLessThanOrEqual(1);
        expect(Math.abs(tr.pan ?? 0)).toBeLessThanOrEqual(1);
      }
      if (s.echo !== undefined) expect(s.echo).toBeGreaterThanOrEqual(0);
      // drum hits only on mapped pitch classes (and never transposed off them)
      for (const tr of c.tracks) {
        let inst: string = tr.inst;
        for (const e of tr.events) {
          if (e.k === 'inst') inst = e.inst;
          if (e.k === 'note' && inst === 'drums') for (const m of e.midi) expect(DRUM_PCS.has(m % 12)).toBe(true);
        }
      }
    });
  }

  for (const s of BGM) {
    test(`${s.id}: BGM loops, 30–150 s, 4–7 tracks`, () => {
      const c = compileOnce(s);
      expect(s.loop).toBe(true);
      const secs = ticksToSeconds(c.length, c.bpm);
      expect(secs).toBeGreaterThanOrEqual(30);
      expect(secs).toBeLessThanOrEqual(150);
      expect(ticksToSeconds(c.length - c.loopTick, c.bpm)).toBeGreaterThanOrEqual(30);
      expect(s.tracks.length).toBeGreaterThanOrEqual(4);
      expect(c.length % 384).toBe(0); // whole 4/4 bars
    });
  }

  for (const s of ONE_SHOTS) {
    test(`${s.id}: one-shot, 1–6 s`, () => {
      const c = compileOnce(s);
      expect(s.loop).toBe(false);
      const secs = ticksToSeconds(c.length, c.bpm);
      expect(secs).toBeGreaterThanOrEqual(1);
      expect(secs).toBeLessThanOrEqual(6);
    });
  }

  test('leitmotifs are quoted where the design asks for them', () => {
    expect(containsMotif(title, MOTIF.title)).toBe(true);
    expect(containsMotif(romance, MOTIF.title)).toBe(true);
    expect(containsMotif(campusEvening, MOTIF.titleHead)).toBe(true);
    expect(containsMotif(sad, MOTIF.title)).toBe(true);
    for (const m of [MOTIF.title, MOTIF.piggy1, MOTIF.piggy2, MOTIF.piggy3]) expect(containsMotif(credits, m)).toBe(true);
    for (const m of [MOTIF.piggy1, MOTIF.piggy2, MOTIF.piggy3]) expect(containsMotif(sleep, m)).toBe(true);
  });

  test('kempa_logo sting: C5–G5–C6 arpeggio over a triangle C4', () => {
    const c = compileOnce(kempaLogo);
    const lead = c.tracks[0].events.flatMap((e) => (e.k === 'note' ? e.midi : []));
    expect(lead.slice(0, 3)).toEqual([72, 79, 84]);
    expect(c.tracks.some((t) => t.inst === 'tri' && t.events.some((e) => e.k === 'note' && e.midi[0] === 60))).toBe(true);
    expect(c.tracks.some((t) => t.inst === 'pulse12')).toBe(true);
  });
});
