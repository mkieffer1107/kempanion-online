// Piggy 3 used to tutor math (at a tutoring center, which the game never names): asking him about jobs, or talking
// math, brings it up, and the Big Brain persona knows it too. A player who TYPES the business's name still reaches his
// job topic (intents.ts matches it) and gets the generic answer back; tests/no-mathnasium.test.ts keeps the name out of
// everything the game says.
import { describe, expect, test } from 'bun:test';
import { PIG_IDS, type ChatContext, type PigId } from '../src/lib/types';
import { classifyIntent, respondHeuristic } from '../src/lib/ai/heuristic';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { CHARACTERS } from '../src/lib/content/characters';

function ctx(pig: PigId): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [],
  };
}

/** A pig's first answer to `text` (asking the same thing twice gets a "déjà vu" reply instead). */
const reply = (pig: PigId, text: string) => respondHeuristic({ pig, playerText: text, history: [], context: ctx(pig) }).text;

/** The generic wording that stands in for the business: he tutored math ("tutor", "tutored", "tutoring"). */
const TUTOR = /\btutor/i;
const THE_NAME = /mathnasium/i;

describe('Piggy 3 used to tutor math', () => {
  test('job and tutoring questions route to ask_about_self:job, math talk to passion_p3:math', () => {
    for (const t of ['did you ever have a job?', 'were you a math tutor?', 'what do you do for work', 'mathnasium?']) {
      expect([t, classifyIntent(t, 'piggy-3')]).toMatchObject([t, { intent: 'ask_about_self', topic: 'job' }]);
    }
    for (const t of ['do you like math?', 'can you help me with calculus', 'i hate fractions']) {
      expect([t, classifyIntent(t, 'piggy-3')]).toMatchObject([t, { intent: 'passion_p3', topic: 'math' }]);
    }
  });

  test('asked about jobs he says he tutored math, in every variant, without naming the business', () => {
    for (const [, text] of LINES['piggy-3'].chat['ask_about_self:job']) {
      expect([text, TUTOR.test(text), THE_NAME.test(text)]).toEqual([text, true, false]);
    }
    expect(reply('piggy-3', 'did you ever have a job?')).toMatch(TUTOR);
    expect(reply('piggy-3', 'did you ever have a job?')).toMatch(/\bmath\b/i);
    // the other two answer with their own work: Piggy 1 is an ambassador/research student, Piggy 2 is training in neurosurgery
    expect(reply('piggy-1', 'did you ever have a job?')).toMatch(/ambassador|research|Germany/i);
    expect(reply('piggy-2', 'did you ever have a job?')).toMatch(/Neuro/);
  });

  test('talking math brings it up: Piggy 3 himself, and the other two point at him', () => {
    expect(reply('piggy-3', 'do you like math?')).toMatch(/\btutor|one clear example/i);
    for (const pig of ['piggy-1', 'piggy-2'] as const) {
      expect([pig, reply(pig, 'do you like math?')]).toEqual([pig, expect.stringMatching(/Piggy 3\b.*\btutor/)]);
    }
  });

  test('a player who types the name still gets his job topic, and no pig says the name back', () => {
    for (const pig of PIG_IDS) {
      for (const t of ['mathnasium?', 'i work at mathnasium', 'do you miss mathnasium?']) {
        expect([pig, t, classifyIntent(t, pig)]).toMatchObject([pig, t, { intent: 'ask_about_self', topic: 'job' }]);
        expect([pig, t, THE_NAME.test(reply(pig, t))]).toEqual([pig, t, false]);
      }
    }
  });

  test('the Big Brain persona knows he was a math tutor, without the name', () => {
    const prompt = CHARACTERS['piggy-3'].prompt;
    expect(prompt).toContain('math tutor');
    expect(prompt).not.toMatch(THE_NAME);
  });
});
