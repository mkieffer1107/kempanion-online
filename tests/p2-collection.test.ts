// Piggy 2 collects (hogs) retired and expired medical equipment: chat routes it to his collection, the others tease
// him about it, he asks the player for some in his idle lines, and the Big Brain persona knows.
import { describe, expect, test } from 'bun:test';
import { type ChatContext, type PigId } from '../src/lib/types';
import { classifyIntent, respondHeuristic } from '../src/lib/ai/heuristic';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { CHARACTERS } from '../src/lib/content/characters';

function ctx(pig: PigId): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [],
  };
}
const reply = (pig: PigId, text: string) => respondHeuristic({ pig, playerText: text, history: [], context: ctx(pig) }).text;

describe("Piggy 2's medical-equipment collection", () => {
  test('collection talk routes to passion_p2:collection', () => {
    for (const t of ['do you collect anything?', 'got any expired medical equipment?', 'tell me about your boxes', 'are you a hoarder', 'i found an old stethoscope']) {
      expect([t, classifyIntent(t, 'piggy-2')]).toMatchObject([t, { intent: 'passion_p2', topic: 'collection' }]);
    }
  });

  test('he talks about it, and the other two tease him about the boxes', () => {
    expect(reply('piggy-2', 'do you collect anything?')).toMatch(/collect|expired|boxes|hog|curate/i);
    expect(reply('piggy-1', 'have you seen piggy 2s collection?')).toMatch(/Piggy 2/);
    expect(reply('piggy-3', 'have you seen piggy 2s collection?')).toMatch(/Piggy 2/);
  });

  test('he sometimes asks the player for expired equipment when idle', () => {
    const idle = (LINES['piggy-2'] as { idle: Record<string, string[]> }).idle;
    expect([...idle.greet, ...idle.bored].some((l) => /expired/i.test(l))).toBe(true);
  });

  test('the Big Brain persona knows', () => {
    expect(CHARACTERS['piggy-2'].prompt).toMatch(/expired medical equipment/);
  });
});
