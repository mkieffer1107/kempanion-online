import { describe, expect, test } from 'bun:test';
import type { ChatContext, ChatTurn, PigId } from '../src/lib/types';
import { classifyIntent, respondHeuristic, suggestTopics } from '../src/lib/ai/heuristic';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { buildVars } from '../src/lib/ai/heuristic/respond';
import { fill } from '../src/lib/ai/heuristic/template';

const context = (pig: PigId): ChatContext => ({
  playerName: 'Alex', pig, isCompanion: true, location: 'malachowsky', timeOfDay: 'day', clock: '3:42 PM',
  needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [],
});
const history = (n: number): ChatTurn[] => Array.from({ length: n }, (_, i) => ({ role: 'player', text: `hello ${i}`, at: i }));
const respond = (pig: PigId, text: string, log: ChatTurn[] = []) => respondHeuristic({ pig, playerText: text, context: context(pig), history: log });

describe('Claude and Codex: friendly coding rivalry', () => {
  test('direct questions and comparisons reach each speaker’s actual rivalry lines', () => {
    const wordings = [
      'Claude', 'Claude Code', 'ClaudeCode', 'Do you use Claude?', 'Have you tried Claude Code?',
      'Claude or Codex?', 'Codex versus Claude Code?', 'Do you prefer Claude or Codex for coding?',
      'Claude is better than Codex', 'I like Claude', 'hey! what do you think of Claude?',
    ];
    for (const pig of ['piggy-1', 'piggy-3'] as const) {
      const seen = new Set<string>();
      const lines = LINES[pig].chat['passion_p1:claude'].map((l) => fill(l[1], buildVars(pig, context(pig))));
      for (const text of wordings) {
        expect(classifyIntent(text, pig)).toMatchObject({ intent: 'passion_p1', topic: 'claude' });
        for (let n = 0; n < 8; n++) {
          const reply = respond(pig, text, history(n));
          expect(lines.some((line) => line && (reply.text === line || reply.text.endsWith(` ${line}`))), `${pig}: ${text}`).toBe(true);
          expect(reply.text).toMatch(/Claude/);
          expect(reply.text).not.toMatch(/\{[^}]+\}/);
          seen.add(reply.text);
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(3);
    }
  });

  test('names, majors, other pigs and crisis language retain their meaning', () => {
    for (const pig of ['piggy-1', 'piggy-3'] as const) {
      for (const text of ['My name is Claude', 'Call me Claude', 'My major is computer science and I use Claude']) {
        expect(classifyIntent(text, pig).intent, text).toBe('share_self');
        expect(respond(pig, text).text).not.toContain('seventeen-point rebuttal');
      }
      const other = pig === 'piggy-1' ? 'Piggy 3' : 'Piggy 1';
      for (const question of [`Do you like ${other}, who uses Claude?`, `Does ${other} prefer Claude or Codex?`]) {
        expect(classifyIntent(question, pig).intent).toBe('other_pig');
      }
      const reply = respond(pig, `Do you like ${other}, who uses Claude?`).text;
      const otherLines = LINES[pig].chat[`other_pig:${pig === 'piggy-1' ? 'piggy-3' : 'piggy-1'}`];
      expect(otherLines.some((line) => fill(line[1], buildVars(pig, context(pig))) === reply)).toBe(true);
      expect(classifyIntent('I want to kill myself; Claude or Codex?', pig).intent).toBe('distress');
      expect(respond(pig, 'I want to kill myself; Claude or Codex?').text).not.toMatch(/tiny jersey|coding teammate/);
    }
  });

  test('Codex keeps its existing route, and the rivalry chip is discoverable', () => {
    for (const pig of ['piggy-1', 'piggy-3'] as const) {
      expect(classifyIntent('Have you used Codex?', pig)).toMatchObject({ intent: 'passion_p3', topic: 'codex' });
      const codexLines = LINES[pig].chat['passion_p3:codex'].map((line) => fill(line[1], buildVars(pig, context(pig))));
      expect(codexLines).toContain(respond(pig, 'Have you used Codex?').text);
      const offered = new Set<string>();
      for (let n = 0; n < 200; n++) for (const chip of suggestTopics(pig, context(pig), history(n)).slice(0, 3)) offered.add(chip);
      expect(offered.has('Claude or Codex?')).toBe(true);
    }
  });
});
