import { describe, expect, test } from 'bun:test';
import { compileMML, compileSong, MMLError, TICKS_PER_QUARTER as Q } from '../src/lib/audio/mml';

const notes = (src: string) => compileMML(src).events.filter((e) => e.k === 'note') as any[];

describe('mml', () => {
  test('notes, octaves and lengths', () => {
    const ev = notes('o4 c d e8 f8 > c2');
    expect(ev.map((e) => e.midi[0])).toEqual([60, 62, 64, 65, 72]);
    expect(ev.map((e) => e.dur)).toEqual([Q, Q, Q / 2, Q / 2, Q * 2]);
    expect(compileMML('o4 c d e8 f8 > c2').length).toBe(Q * 5);
  });

  test('accidentals, dots, ties, rests', () => {
    const ev = notes('l8 c+4. d-16 e&e4 r4 g^8');
    expect(ev.map((e) => e.midi[0])).toEqual([61, 61, 64, 67]);
    expect(ev[0].dur).toBe(Q * 1.5);
    expect(ev[2].dur).toBe(Q / 2 + Q);
    expect(ev[3].dur).toBe(Q);
    expect(ev[3].t).toBe(Q * 1.5 + Q / 4 + Q * 1.5 + Q);
  });

  test('chords and repeats', () => {
    const ev = notes("o4 'ceg'2 ['<a>ce'4]2");
    expect(ev[0].midi).toEqual([60, 64, 67]);
    expect(ev[1].midi).toEqual([57, 60, 64]);
    expect(ev.length).toBe(3);
  });

  test('loop point, comments and bar lines', () => {
    const c = compileMML('c4 ; intro\n| L d4 e4 |');
    expect(c.loopTick).toBe(Q);
    expect(c.length).toBe(Q * 3);
  });

  test('triplets', () => {
    expect(compileMML('l12 c d e').length).toBe(Q);
  });

  test('errors carry position', () => {
    expect(() => compileMML('c4 x4')).toThrow(MMLError);
    expect(() => compileMML('@kazoo c')).toThrow(/unknown instrument/);
    expect(() => compileMML('t120 c')).toThrow(/first track/);
    expect(() => compileMML('[c d')).toThrow(/unclosed/);
  });

  test('song warns on unequal tracks', () => {
    const s = compileSong({ id: 'x', title: 'x', bpm: 120, loop: true, tracks: [{ inst: 'lead', mml: 'c1' }, { inst: 'bass', mml: 'c2' }] });
    expect(s.warnings.length).toBe(1);
    expect(s.length).toBe(Q * 4);
  });
});
