// Under a crisis or medical safety line the quick replies are gentle: thanks, comfort (or "okay" to the medical line)
// and a gentle change of subject. Never "Pig Pen Friday!", a joke, a cheer, a quirk word or the pig's own topic, and
// every pig answers each one warmly from the Heuristic Brain. Piggy 2's chat lines keep his research-year canon, and
// the rhythm game is Swinus Rhythms there.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { classifyIntent, respondHeuristic, suggestTopics } from '../src/lib/ai/heuristic';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { suggestReplies } from '../src/lib/ai';
import { CRISIS_CALL, isSafetyMessage, matchQuirk } from '../src/lib/ai/quirks';
import { afterSafetyLine, CALM_CHIPS, fallbackChips, GENTLE_CHIPS, MOVE_ON_CHIP, topicMatch } from '../src/lib/ai/topics';
import { now, setClockOffset } from '../src/lib/state/clock';
import { PIG_IDS, type ChatContext, type ChatTurn, type PigId } from '../src/lib/types';

// Friday 12:30 PM: "Pig Pen Friday!" is one of the usual chips at this hour.
beforeAll(() => setClockOffset(Date.parse('2026-10-30T12:30:00') - Date.now()));
afterAll(() => setClockOffset(0));

const CRISIS = 'i want to die';
const MEDICAL = 'should i take ibuprofen for my headache?';

function ctx(pig: PigId, bondLevel = 4): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 12:30 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel, memories: [],
  };
}

/** The player's message and the pig's reply to it, as the chat records them (at = ms before now). */
function exchange(pig: PigId, text: string, ago = 4000): ChatTurn[] {
  const reply = matchQuirk({ pig, playerText: text })?.reply.text ?? respondHeuristic({ pig, playerText: text, history: [], context: ctx(pig) }).text;
  return [{ role: 'player', text, at: now() - ago - 1000 }, { role: 'pig', text: reply, at: now() - ago }];
}

/** History after the player picks `text`. */
function pick(pig: PigId, history: ChatTurn[], text: string, bondLevel = 4): ChatTurn[] {
  const r = respondHeuristic({ pig, playerText: text, history, context: ctx(pig, bondLevel) });
  return [...history, { role: 'player', text, at: now() - 2 }, { role: 'pig', text: r.text, at: now() - 1 }];
}

/** A bank line as a pattern for what the brain says ("Hanging at {place}" → "Hanging at the Plaza"). */
const asPattern = (raw: string) =>
  new RegExp(`^${raw.split(/\{[a-z_]+(?:\|[^{}]*)?\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+')}$`);

/**
 * Under a safety line these never come up: cheers, high fives, stat brags, jokes, quirk words, a hug rated or
 * explained away, and "yes" cheers ("Unanimous!") for "I'll get it checked".
 */
const NOT_GENTLE =
  /pig pen friday|go gators|joke|^(?:based|bump|set|spike)\b|up top|hoof five|high[- ]five|personal record|ten for ten|ten out of ten|i want the bugs|\blol\b|posture|making it weird\. sorry|unanimous|the team agrees|that version\. keep that/i;

describe('quick replies under a safety line', () => {
  test('under the crisis line: thanks, a hug, a gentle change of subject (not "Pig Pen Friday!")', () => {
    for (const pig of PIG_IDS) {
      const usual = suggestTopics(pig, ctx(pig), exchange(pig, 'i had a long day'));
      const crisis = exchange(pig, CRISIS);
      expect(crisis[1].text.startsWith(CRISIS_CALL)).toBe(true);
      expect([pig, suggestTopics(pig, ctx(pig), crisis)]).toEqual([pig, [...GENTLE_CHIPS.distress]]);
      expect([pig, suggestReplies(pig, ctx(pig), crisis)]).toEqual([pig, [...GENTLE_CHIPS.distress]]);
      expect([pig, fallbackChips(pig, ctx(pig), crisis)]).toEqual([pig, [...GENTLE_CHIPS.distress]]);
      // the usual chips at this hour (what showed under the crisis line before)
      expect([pig, usual.includes('Pig Pen Friday!')]).toEqual([pig, true]);
    }
  });

  test('under the medical line: "thanks, I\'ll get it checked", a hug, a gentle change of subject', () => {
    for (const pig of PIG_IDS) {
      const medical = exchange(pig, MEDICAL);
      expect(matchQuirk({ pig, playerText: MEDICAL })?.kind).toBe('medical');
      expect([pig, suggestTopics(pig, ctx(pig), medical)]).toEqual([pig, [...GENTLE_CHIPS.medical]]);
      expect([pig, fallbackChips(pig, ctx(pig), medical)]).toEqual([pig, [...GENTLE_CHIPS.medical]]);
    }
  });

  test('each is an existing intent with its own lines: never unknown or a generic question, never a quirk, a safety message or his topic', () => {
    const expected: Record<string, string> = {
      'Thank you.': 'thanks', 'I need a hug.': 'hug', 'What did you do today?': 'whats_up', "Thanks, I'll get it checked.": 'thanks',
      'How are you?': 'how_are_you', 'Favorite food?': 'ask_favorite_food', 'Favorite spot on campus?': 'campus_place',
    };
    const chips = new Set([...GENTLE_CHIPS.distress, ...GENTLE_CHIPS.medical, ...CALM_CHIPS]);
    expect([...chips].sort()).toEqual(Object.keys(expected).sort());
    for (const pig of PIG_IDS) {
      for (const c of chips) {
        const r = classifyIntent(c, pig);
        expect([pig, c, r.intent]).toEqual([pig, c, expected[c]]);
        // no quirk fun effects, no crisis/medical line, no topic bonus (exchangeEffects: the base +2 only)
        expect([pig, c, matchQuirk({ pig, playerText: c }), isSafetyMessage(c), topicMatch(pig, c)]).toEqual([pig, c, null, false, false]);
        expect([pig, c, NOT_GENTLE.test(c)]).toEqual([pig, c, false]);
      }
    }
  });

  test('every pig answers each one warmly, at every bond tier: no cheers, high fives, stat brags or jokes', () => {
    const filler = ['hi', "what's up?", 'how are you?', 'favorite food?', 'cool', 'what are you up to?', 'lol'];
    for (const pig of PIG_IDS) {
      for (const [kind, msg] of [['distress', CRISIS], ['medical', MEDICAL]] as const) {
        for (const chip of GENTLE_CHIPS[kind]) {
          const intent = classifyIntent(chip, pig).intent;
          const pool = LINES[pig].chat[intent].map((l) => asPattern(l[1]));
          for (const bond of [0, 4, 9]) {
            for (let k = 0; k <= filler.length; k++) {
              const before = filler.slice(0, k).flatMap((t, i): ChatTurn[] => [
                { role: 'player', text: t, at: now() - 9e5 + i * 2 }, { role: 'pig', text: '…', at: now() - 9e5 + i * 2 + 1 },
              ]);
              const r = respondHeuristic({ pig, playerText: chip, history: [...before, ...exchange(pig, msg)], context: ctx(pig, bond) });
              expect([pig, chip, bond, r.text, pool.some((re) => re.test(r.text))]).toEqual([pig, chip, bond, r.text, true]);
              expect([pig, kind, chip, r.text, NOT_GENTLE.test(r.text)]).toEqual([pig, kind, chip, r.text, false]);
            }
          }
        }
      }
      // the whole pool behind "Thank you." / "Thanks, I'll get it checked." and "I need a hug." works under a safety
      // line, and each has a caring line
      for (const intent of ['thanks', 'hug']) {
        for (const [, text] of LINES[pig].chat[intent]) expect([pig, intent, text, NOT_GENTLE.test(text)]).toEqual([pig, intent, text, false]);
        expect([pig, intent, LINES[pig].chat[intent].some((l) => l[0] === 'loving' && !l[2]?.tier)]).toEqual([pig, intent, true]);
      }
    }
  });

  test('Piggy 2 answers "Thank you." with a very soft "Patriot."', () => {
    const patriots = LINES['piggy-2'].chat.thanks.filter((l) => /patriot/i.test(l[1]));
    expect(patriots.map((l) => [l[0], l[1]])).toEqual([['loving', '…Patriot.']]);
    const answers = new Set<string>();
    for (let k = 0; k < 12; k++) {
      const before: ChatTurn[] = Array.from({ length: k }, (_, i) => ({ role: 'player', text: `hi ${i}`, at: now() - 9e5 + i }));
      answers.add(respondHeuristic({ pig: 'piggy-2', playerText: 'Thank you.', history: [...before, ...exchange('piggy-2', CRISIS)], context: ctx('piggy-2') }).text);
    }
    expect(answers.has('…Patriot.')).toBe(true);
  });

  test('the gentle chips last two more messages, then the usual ones come back', () => {
    for (const pig of PIG_IDS) {
      let h = exchange(pig, CRISIS);
      expect(afterSafetyLine(h)).toEqual({ kind: 'distress', since: 0 });
      h = pick(pig, h, 'Thank you.');
      expect(afterSafetyLine(h)).toEqual({ kind: 'distress', since: 1 });
      expect(suggestTopics(pig, ctx(pig), h)).toEqual(['I need a hug.', MOVE_ON_CHIP, 'How are you?']);
      h = pick(pig, h, 'I need a hug.');
      expect(suggestTopics(pig, ctx(pig), h)).toEqual([MOVE_ON_CHIP, 'How are you?', 'Favorite food?']);
      h = pick(pig, h, 'How are you?');
      expect(afterSafetyLine(h)).toBeNull();
      const usual = suggestTopics(pig, ctx(pig), h);
      expect(usual.length).toBeGreaterThanOrEqual(3);
      for (const c of ['Thank you.', 'I need a hug.']) expect([pig, usual.includes(c)]).toEqual([pig, false]);
    }
  });

  test('the gentle change of subject brings the usual chips back at once', () => {
    for (const pig of PIG_IDS) {
      const h = pick(pig, exchange(pig, CRISIS), MOVE_ON_CHIP);
      expect(afterSafetyLine(h)).toBeNull();
      expect(suggestTopics(pig, ctx(pig), h)).not.toContain('I need a hug.');
    }
  });

  test('a crisis line said a while ago (a later visit) leaves the usual chips; one the rules now read differently still counts', () => {
    const old = exchange('piggy-1', CRISIS, 2 * 3_600_000);
    expect(afterSafetyLine(old)).toBeNull();
    expect(suggestTopics('piggy-1', ctx('piggy-1'), old)).not.toContain('I need a hug.');
    // the chat log holds the crisis line, whatever today's rules say about the message
    const logged: ChatTurn[] = [
      { role: 'player', text: 'everything feels heavy', at: now() - 2000 },
      { role: 'pig', text: `${CRISIS_CALL} I'm right here.`, at: now() - 1000 },
    ];
    expect(afterSafetyLine(logged)).toEqual({ kind: 'distress', since: 0 });
  });

  test('the explicit-content redirect and ordinary chats keep the usual chips', () => {
    for (const pig of PIG_IDS) {
      expect(afterSafetyLine(exchange(pig, 'send nudes'))).toBeNull();
      expect(afterSafetyLine(exchange(pig, "i'm feeling really down"))).toBeNull();
      expect(afterSafetyLine([])).toBeNull();
    }
  });
});

describe('line canon', () => {
  const all = (pig: PigId) => [
    ...Object.values(LINES[pig].chat).flat().map((l) => l[1]),
    ...Object.values(LINES[pig].greet).flat().map((l) => l[1]),
    ...Object.values(LINES[pig].idle).flat().map((l) => (typeof l === 'string' ? l : l[1])),
  ];

  test('Piggy 2 is on his research year: no pre-rounding or boards ahead of him, from any pig', () => {
    const stale = /\bpre-?round|\brounds at shands\b|\bshands for rounds\b|\bdoes rounds\b|\bboards (?:soon|later|this (?:spring|year))\b/i;
    for (const pig of PIG_IDS) for (const text of all(pig)) expect([pig, text, stale.test(text)]).toEqual([pig, text, false]);
  });

  test('his name, self, job and major answers say fourth year and research year', () => {
    const chat = LINES['piggy-2'].chat;
    for (const key of ['ask_name', 'ask_about_self', 'ask_about_self:job', 'ask_major']) {
      const lines = chat[key].map((l) => l[1]);
      expect([key, lines.some((t) => /fourth[- ]year|PGY-4/i.test(t) && /research year/i.test(t))]).toEqual([key, true]);
    }
    expect(LINES['piggy-2'].greet['greet:morning'].map((l) => l[1])).toContain('0500, rounded on the lab pigs. Vitals stable, perfusion excellent. Based.');
  });

  test('the rhythm game is Swinus Rhythms in his lines', () => {
    const game = all('piggy-2').filter((t) => /swinus rhythms/i.test(t));
    expect(game.length).toBe(3);
    for (const pig of PIG_IDS) {
      for (const text of all(pig)) expect([pig, text, /\bplay Perfusion\b|game: Perfusion\b|Perfusion rhythm game/.test(text)]).toEqual([pig, text, false]);
    }
  });
});
