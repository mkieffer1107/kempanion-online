// Place lines (WS-09): the Swamp is only full during game hours on a fall Saturday, and the arrival line and
// "Cheer in the stands" agree on it (and on eighty-eight thousand).
import { describe, expect, test } from 'bun:test';
import { gameOn, vibeLine } from '../src/lib/ui/location/vibes';

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe('gameOn', () => {
  test('fall Saturdays from about 11:00 until 20:00', () => {
    expect(gameOn(at(2026, 10, 31, 11))).toBe(true);
    expect(gameOn(at(2026, 10, 31, 12, 15))).toBe(true);
    expect(gameOn(at(2026, 10, 31, 19, 59))).toBe(true);
  });
  test('not before the gates open, after the game, or on other days and months', () => {
    expect(gameOn(at(2026, 10, 31, 6))).toBe(false);
    expect(gameOn(at(2026, 10, 31, 10, 59))).toBe(false);
    expect(gameOn(at(2026, 10, 31, 20))).toBe(false);
    expect(gameOn(at(2026, 10, 31, 23))).toBe(false);
    expect(gameOn(at(2026, 11, 1, 12))).toBe(false); // Sunday
    expect(gameOn(at(2026, 10, 30, 12))).toBe(false); // Friday
    expect(gameOn(at(2027, 3, 6, 12))).toBe(false); // a spring Saturday
  });
});

describe('vibeLine', () => {
  test('the stadium is full during game hours and empty otherwise, with one attendance number', () => {
    const game = vibeLine('stadium', 'day', 3, true);
    expect(game).toContain('eighty-eight thousand');
    expect(game).not.toContain('empty');
    expect(vibeLine('stadium', 'day', 3, false)).toContain('empty');
    expect(vibeLine('stadium', 'night', 3, false)).toContain('Stadium lights off');
  });
  test('places without a game-day line keep their time-of-day line', () => {
    expect(vibeLine('plaza', 'night', 1, true)).toBe(vibeLine('plaza', 'night', 1, false));
    expect(vibeLine('lake_alice', 'evening', 1, true)).toBe(vibeLine('lake_alice', 'evening', 1));
  });
});
