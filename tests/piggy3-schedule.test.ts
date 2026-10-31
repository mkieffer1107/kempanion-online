import { expect, test } from 'bun:test';
import { pigsAt, whereIs } from '../src/lib/content/locations';

test('Piggy 3 never visits Lake Alice in his interactive schedule', () => {
  for (let day = 25; day <= 31; day++) {
    for (let minute = 0; minute < 1440; minute++) {
      const date = new Date(2026, 9, day, 0, minute);
      expect(whereIs('piggy-3', date)).not.toBe('lake_alice');
      expect(pigsAt('lake_alice', date)).not.toContain('piggy-3');
      if (date.getHours() >= 17 && date.getHours() < 20) {
        expect(whereIs('piggy-3', date)).toBe('marston');
      }
    }
  }
});
