import { describe, expect, test } from 'bun:test';
import { pigsAt, whereIs } from '../src/lib/content/locations';

describe('Piggy 2 medical-campus schedule', () => {
  test('Saturday afternoon and evening stay on the medical campus', () => {
    for (const [hour, location] of [[14, 'shands'], [16, 'shands'], [17, 'communicore'], [19, 'communicore']] as const) {
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
