import { describe, expect, test } from 'bun:test';
import { isBedtime, pigsAt, whereIs } from '../src/lib/content/locations';

// Local dates keep the schedule assertions independent of the machine's time zone.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

describe('Piggy 1 night-owl schedule', () => {
  test('sleep starts at 02:30 and ends at 10:30', () => {
    for (const [hour, minute, asleep] of [
      [1, 0, false], [2, 29, false], [2, 30, true], [3, 0, true],
      [9, 0, true], [10, 29, true], [10, 30, false],
    ] as const) {
      expect(isBedtime('piggy-1', at(28, hour, minute))).toBe(asleep);
      if (asleep) expect(whereIs('piggy-1', at(28, hour, minute))).toBe('dorm');
    }
  });

  test('awake daytime is at Malachowsky on weekdays and weekends', () => {
    for (const day of [28, 31, 1]) { // Wednesday, Saturday, Sunday (Nov 1 below)
      const date = day === 1 ? new Date(2026, 10, day, 15) : at(day, 15);
      expect(whereIs('piggy-1', date)).toBe('malachowsky');
      expect(pigsAt('malachowsky', date)).toContain('piggy-1');
    }
    for (const hour of [11, 12, 16]) expect(whereIs('piggy-1', at(28, hour))).toBe('malachowsky');
    expect(whereIs('piggy-1', at(28, 10, 30))).toBe('malachowsky');
  });

  test('evenings and nights retain the planned weekly destinations', () => {
    for (const day of [27, 28, 29, 30, 31]) expect(whereIs('piggy-1', at(day, 18))).toBe('volleyball_courts');
    expect(whereIs('piggy-1', new Date(2026, 10, 1, 18))).toBe('volleyball_courts'); // Sunday
    expect(whereIs('piggy-1', at(28, 21))).toBe('dorm');
    expect(whereIs('piggy-1', at(30, 21))).toBe('midtown');
    expect(whereIs('piggy-1', at(31, 21))).toBe('midtown');
    expect(whereIs('piggy-1', at(29, 1))).toBe('dorm');
  });
});
