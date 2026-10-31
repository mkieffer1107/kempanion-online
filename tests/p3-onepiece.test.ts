// "One Piece or JoJo?": Piggy 3 always says One Piece, usually with a joke about Buggy the Clown
// and his own Buggy code. Piggy 1 and Piggy 2 never pick JoJo either. Any wording and either order; the player's own
// take ("jojo is better than one piece") gets its own reaction; "who's Buggy?" is answered; the Big Brain knows too.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { PIG_IDS, type ChatContext, type ChatTurn, type PigId } from '../src/lib/types';
import { classifyIntent, respondHeuristic } from '../src/lib/ai/heuristic';
import { topicLabel } from '../src/lib/ai/heuristic/respond';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { systemPrompt } from '../src/lib/ai/prompts';
import { MODEL_IDS } from '../src/lib/ai/models';
import { CHARACTERS } from '../src/lib/content/characters';
import { setClockOffset } from '../src/lib/state/clock';

// Fixed game clock (the reply seed includes the date): Friday 2026-10-30, 3:42 PM local.
beforeAll(() => setClockOffset(Date.parse('2026-10-30T15:42:00') - Date.now()));
afterAll(() => setClockOffset(0));

function ctx(pig: PigId): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [],
  };
}

/** The pig's reply after `k` unrelated player turns (a different seed for each k, nothing for him to avoid). */
const reply = (pig: PigId, text: string, k = 0) => {
  const history: ChatTurn[] = Array.from({ length: k }, (_, i) => ({ role: 'player' as const, text: `hi ${i}`, at: i }));
  return respondHeuristic({ pig, playerText: text, history, context: ctx(pig) }).text;
};
const pool = (pig: PigId, key: string) => (LINES[pig].chat[key] ?? []).map((l) => l[1]);
/** Picking JoJo: "JoJo." / "JoJo!" up front, "I pick JoJo", "JoJo is better", "JoJo wins" (granting JoJo the poses is fine). */
const PICKS_JOJO = /^JoJo[.!,]|\b(?:pick|choose|go with|vote|say) JoJo\b|\bJoJo(?: is|'s) better\b|\bJoJo wins\b(?! poses)/;

const EITHER_OR = [
  'One Piece or JoJo?', 'jojo or one piece', 'Which is better, One Piece or JoJo?', 'which one, jojo or one piece?',
  'one piece vs jojo', 'JoJo versus One Piece', 'pick one: one piece or jojo', 'favorite: jojo or one piece?',
  'do you like one piece or jojo more?', 'is jojo better than one piece?', "isn't one piece better than jojo?",
  'jojo is not better than one piece', 'luffy or jotaro?', 'one peice or jojo', "jojo's bizarre adventure or one piece?",
];
const JOJO_TAKE = ['jojo is better than one piece', 'JoJo is way better than One Piece', 'jojo over one piece', 'no, jojo is better', 'one piece is worse than jojo'];
const OP_TAKE = ['one piece is better than jojo', 'One Piece > JoJo is just true, one piece is better', 'one piece over jojo any day', 'jojo is worse than one piece'];

describe('One Piece or JoJo: always One Piece', () => {
  test('every wording routes to the comparison, for every pig (it used to land on the JoJo topic), the chip too', () => {
    for (const pig of PIG_IDS) {
      for (const t of EITHER_OR) expect([pig, t, classifyIntent(t, pig)]).toMatchObject([pig, t, { intent: 'passion_p3', topic: 'opvsjojo' }]);
      for (const t of JOJO_TAKE) expect([pig, t, classifyIntent(t, pig)]).toMatchObject([pig, t, { intent: 'passion_p3', topic: 'jojo_better' }]);
      for (const t of OP_TAKE) expect([pig, t, classifyIntent(t, pig)]).toMatchObject([pig, t, { intent: 'passion_p3', topic: 'op_better' }]);
    }
  });

  test('one show alone keeps its own topic', () => {
    for (const pig of PIG_IDS) {
      for (const t of ['do you like jojo?', 'ora ora', 'jojo pose!']) expect([pig, t, classifyIntent(t, pig)]).toMatchObject([pig, t, { intent: 'passion_p3', topic: 'jojo' }]);
      for (const t of ['do you like one piece?', 'have you seen one piece']) expect([pig, t, classifyIntent(t, pig)]).toMatchObject([pig, t, { intent: 'passion_p3', topic: 'onepiece' }]);
      expect(pool(pig, 'passion_p3:jojo')).toContain(reply(pig, 'do you like jojo?'));
    }
  });

  test('Piggy 3 answers One Piece first, every time, and his Buggy code comes up', () => {
    const lines = pool('piggy-3', 'passion_p3:opvsjojo');
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const l of lines) expect([l, l.startsWith('One Piece'), PICKS_JOJO.test(l)]).toEqual([l, true, false]);
    expect(lines.filter((l) => /\bBuggy\b/.test(l)).length).toBeGreaterThanOrEqual(5);
    expect(lines.some((l) => /\bBuggy code\b/.test(l))).toBe(true);
    const seen = new Set<string>();
    for (const t of EITHER_OR) {
      for (let k = 0; k < 6; k++) {
        const r = reply('piggy-3', t, k);
        expect([t, k, r.startsWith('One Piece'), lines.includes(r)]).toEqual([t, k, true, true]);
        seen.add(r);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
    expect([...seen].some((r) => /\bBuggy\b/.test(r))).toBe(true);
  });

  test("Piggy 3's take on the player's take: never moves off One Piece", () => {
    for (const [key, texts] of [['passion_p3:jojo_better', JOJO_TAKE], ['passion_p3:op_better', OP_TAKE]] as const) {
      const lines = pool('piggy-3', key);
      expect(lines.length).toBeGreaterThanOrEqual(3);
      for (const l of lines) expect([l, l.includes('One Piece'), PICKS_JOJO.test(l)]).toEqual([l, true, false]);
      for (const t of texts) for (let k = 0; k < 4; k++) expect([t, k, lines.includes(reply('piggy-3', t, k))]).toEqual([t, k, true]);
    }
  });

  test('Piggy 1 and Piggy 2 never pick JoJo, for the question or either take', () => {
    for (const pig of ['piggy-1', 'piggy-2'] as const) {
      const lines = pool(pig, 'passion_p3:opvsjojo');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      for (const l of lines) expect([pig, l, l.includes('One Piece'), PICKS_JOJO.test(l)]).toEqual([pig, l, true, false]);
      // no lines of their own for a take: they answer the question (never their generic Piggy 3 lines)
      for (const t of [...EITHER_OR, ...JOJO_TAKE, ...OP_TAKE]) expect([pig, t, lines.includes(reply(pig, t))]).toEqual([pig, t, true]);
    }
    for (const l of pool('piggy-2', 'passion_p3:opvsjojo')) expect(l.startsWith('One Piece.')).toBe(true);
  });

  test('"why?" after the question is another One Piece answer, never a JoJo one', () => {
    const first = reply('piggy-3', 'One Piece or JoJo?');
    const hist: ChatTurn[] = [{ role: 'player', text: 'One Piece or JoJo?', at: 1 }, { role: 'pig', text: first, at: 2 }];
    const why = respondHeuristic({ pig: 'piggy-3', playerText: 'why?', history: hist, context: ctx('piggy-3') }).text;
    expect(why).not.toBe(first);
    expect(pool('piggy-3', 'passion_p3:opvsjojo').some((l) => why.endsWith(l))).toBe(true);
  });

  test('a follow-up segue into his passion never answers a question nobody asked', () => {
    // without the segue filter, ~7 of these 60 chats got "Because, okay, here's the thing. JoJo over One Piece? …"
    const answers = ['opvsjojo', 'jojo_better', 'op_better', 'buggy'].flatMap((t) => pool('piggy-3', `passion_p3:${t}`));
    const starts = ["what's hipergator?", 'what are you printing?', 'tell me about eeg', 'have you used codex?', 'tell me about open source',
      'do you like physics?', 'do you like math?', 'what ai model is best?', 'nice ui', 'do you like anime?'];
    for (const start of starts) {
      for (let pad = 0; pad < 6; pad++) {
        const hist: ChatTurn[] = Array.from({ length: pad }, (_, i) => ({ role: 'player' as const, text: `hey ${i}`, at: i }));
        for (const text of [start, 'tell me more', 'why?', 'really?', 'tell me more', 'why?']) {
          const r = respondHeuristic({ pig: 'piggy-3', playerText: text, history: hist, context: ctx('piggy-3') }).text;
          expect([start, pad, text, answers.some((a) => r.endsWith(a))]).toEqual([start, pad, text, false]);
          hist.push({ role: 'player', text, at: hist.length }, { role: 'pig', text: r, at: hist.length + 1 });
        }
      }
    }
  });

  test('he remembers it as "One Piece versus JoJo" (greet:last), and Buggy as Buggy the Clown', () => {
    expect(topicLabel(classifyIntent('One Piece or JoJo?', 'piggy-3'))).toBe('One Piece versus JoJo');
    expect(topicLabel(classifyIntent('jojo is better than one piece', 'piggy-1'))).toBe('One Piece versus JoJo');
    expect(topicLabel(classifyIntent('who is buggy?', 'piggy-3'))).toBe('Buggy the Clown');
  });

  test('"who\'s Buggy?" gets Buggy the Clown from Piggy 3; "my code is buggy" is still code talk', () => {
    for (const t of ['who is buggy?', 'Buggy the Clown?', 'buggy?', 'captain buggy']) {
      expect([t, classifyIntent(t, 'piggy-3')]).toMatchObject([t, { intent: 'passion_p3', topic: 'buggy' }]);
      expect(reply('piggy-3', t)).toMatch(/\bBuggy\b/);
    }
    for (const t of ['my code is buggy', 'this game is buggy', 'the app is so buggy']) expect([t, classifyIntent(t, 'piggy-3').topic]).not.toEqual([t, 'buggy']);
    // the other two have no Buggy lines: their One Piece line, not a generic one
    for (const pig of ['piggy-1', 'piggy-2'] as const) expect(pool(pig, 'passion_p3:onepiece')).toContain(reply(pig, 'who is buggy the clown?'));
  });

  test('the Big Brain knows, at every model tier', () => {
    const rule = 'If asked One Piece or JoJo, you always pick One Piece, never JoJo.';
    expect(CHARACTERS['piggy-3'].prompt).toContain(rule);
    for (const tier of MODEL_IDS) expect([tier, systemPrompt('piggy-3', tier).includes(rule)]).toEqual([tier, true]);
  });
});
