import { describe, expect, test } from 'bun:test';
import { pigsAt, whereIs } from '../src/lib/content/locations';

describe('Piggy 2 medical-campus schedule', () => {
  test('Saturday afternoon stays at Shands and evening moves to Marston', () => {
    for (const [hour, location] of [[14, 'shands'], [16, 'shands'], [17, 'marston'], [19, 'marston']] as const) {
      const date = new Date(2026, 9, 31, hour);
      expect(whereIs('piggy-2', date)).toBe(location);
      expect(pigsAt(location, date)).toContain('piggy-2');
      expect(pigsAt('stadium', date)).not.toContain('piggy-2');
    }
  });

  test('Tuesday and Thursday afternoon lab visits remain intact', () => {
    for (const day of [27, 29]) {
      expect(whereIs('piggy-2', new Date(2026, 9, day, 15))).toBe('anatomy_lab');
    }
  });
});

// The pet room uses this schedule too, so check every pig across a full week.
test('no pig has a stadium stop on any day or hour', () => {
  for (let day = 25; day <= 31; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const date = new Date(2026, 9, day, hour);
      for (const pig of ['piggy-1', 'piggy-2', 'piggy-3'] as const) {
        expect(whereIs(pig, date)).not.toBe('stadium');
      }
      expect(pigsAt('stadium', date)).toEqual([]);
    }
  }
  expect(whereIs('piggy-3', new Date(2026, 9, 31, 15))).toBe('physics');
  expect(whereIs('piggy-3', new Date(2026, 9, 31, 18))).toBe('lake_alice');
});
