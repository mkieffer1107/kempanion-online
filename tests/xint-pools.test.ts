// The answer pools behind the new Talk quick replies (all three pigs), Piggy 3's X habit in his everyday lines, his
// cut-down 3D printing, and the persona edits that go with them (characters/piggy-*.md → src/generated/characters.json).
// These are checks on the line banks and the persona text themselves; the chip routing (which pool a typed question
// reaches) is covered by the routing tests, and the mumble by its own.
//
// Canon these pools keep: Piggy 1 was a researcher in Germany and counts in German; Piggy 2 is PGY-4 of seven on his
// research year, already has a grant and is always writing the next one, and barely sleeps; Piggy 3 used to tutor math
// (the tutoring business is never named), is hooked on X and sometimes says "X.com", corrects "Twitter" to X, and
// MUMBLES his AI words quietly to himself (never a rant); One Piece always.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { classifyIntent, respondHeuristic } from '../src/lib/ai/heuristic';
import { LINES, type RawLine } from '../src/lib/ai/heuristic/lines';
import { X_CORRECTIONS } from '../src/lib/ai/heuristic/mumble';
import { fill, KNOWN_PLACEHOLDERS, placeholdersIn, sentenceCount } from '../src/lib/ai/heuristic/template';
import { MODEL_IDS, MODELS } from '../src/lib/ai/models';
import { systemPrompt, trimPersona } from '../src/lib/ai/prompts';
import { CODEX_LINES } from '../src/lib/ai/quirks';
import { CHARACTERS } from '../src/lib/content/characters';
import { DIARY, WANT_LINES } from '../src/lib/pet/lines';
import { vibeLine } from '../src/lib/ui/location/vibes';
import { setClockOffset } from '../src/lib/state/clock';
import { EXPRESSIONS, PIG_IDS, type ChatContext, type ChatTurn, type PigId } from '../src/lib/types';
import { ANIMS, BANNED } from './content-rules';

const P1: PigId = 'piggy-1';
const P2: PigId = 'piggy-2';
const P3: PigId = 'piggy-3';

/** Piggy 1's eight new chips, Piggy 2's eight new chips, and the six chips every pig answers. */
const P1_CHIPS = [
  'passion_p1:germany', 'passion_p1:german', 'passion_p1:haikyu', 'passion_p1:sand', 'passion_p1:team',
  'passion_p1:calls', 'passion_p1:algorithm', 'passion_p1:bug',
];
const P2_CHIPS = [
  'passion_p2:donation', 'passion_p2:research_year', 'passion_p2:or', 'passion_p2:why', 'passion_p2:nerves',
  'passion_p2:snout', 'ask_about_self:july4', 'based:rate',
];
/** Fewest lines each pig has for the six shared chips ("Hype me up!", "Early bird or night owl?", …). */
const SHARED: Record<PigId, Record<string, number>> = {
  [P1]: { 'encourage:hype': 5, 'ask_about_self:chronotype': 4, 'study:teach': 4, 'ask_about_self:dream': 4, 'ask_hobby:shows': 4, 'ask_about_self:competitive': 4 },
  [P2]: { 'encourage:hype': 5, 'ask_about_self:chronotype': 4, 'study:teach': 4, 'ask_about_self:dream': 4, 'ask_hobby:shows': 4, 'ask_about_self:competitive': 3 },
  [P3]: { 'encourage:hype': 5, 'ask_about_self:chronotype': 4, 'study:teach': 5, 'ask_about_self:dream': 4, 'ask_hobby:shows': 3, 'ask_about_self:competitive': 3 },
};
/** Piggy 3's own chips and the typed decoders behind them ("what's RLHF?"): fewest lines per pool. */
const P3_POOLS: Record<string, number> = {
  'passion_p3:x': 5, 'passion_p3:twitter': 6, 'passion_p3:mathtrick': 5, 'passion_p3:llm': 4, 'passion_p3:rlhf': 2,
  'passion_p3:rlvr': 2, 'passion_p3:jev': 2, 'passion_p3:foundation': 2, 'passion_p3:eeg': 4, 'passion_p3:medai': 5,
  'passion_p3:robots': 5, 'ask_favorite_food:red_bull_sf': 4, 'ask_about_self:job': 5, 'ask_about_self:birthday': 5,
  'passion_p3:physics': 5, 'passion_p3:hipergator': 5, 'passion_p3:codex': 5, 'passion_p3:signals': 4,
};
/** "Are you on X?" / "Are you on Twitter?" are asked of all three pigs, and each answers in his own voice. */
const X_POOLS: Record<PigId, Record<string, number>> = {
  [P1]: { 'passion_p3:x': 5, 'passion_p3:twitter': 4 },
  [P2]: { 'passion_p3:x': 5, 'passion_p3:twitter': 4 },
  [P3]: { 'passion_p3:x': 5, 'passion_p3:twitter': 6 },
};

const pool = (pig: PigId, key: string): readonly RawLine[] => LINES[pig].chat[key] ?? [];
const texts = (pig: PigId, key: string): string[] => pool(pig, key).map((l) => l[1]);
/** Every Talk line of a pig as [pool, text]: chat and greeting pools. */
function talk(pig: PigId): [string, string][] {
  const out: [string, string][] = [];
  for (const section of [LINES[pig].chat, LINES[pig].greet]) for (const [k, ls] of Object.entries(section)) for (const l of ls) out.push([k, l[1]]);
  return out;
}
/** Every idle bubble of a pig as [kind, text]. */
function idle(pig: PigId): [string, string][] {
  return Object.entries(LINES[pig].idle).flatMap(([k, ls]) => ls.map((x): [string, string] => [k, typeof x === 'string' ? x : x[1]]));
}
const tierOk = (l: RawLine, tier: 'N' | 'F' | 'W') => !l[2]?.tier || l[2].tier.includes(tier);

/** The pools a pig answers new chips with, for the rules below: [pig, pool key]. */
const NEW_POOLS: [PigId, string][] = [
  ...[P1, P2, P3].flatMap((pig) => [...P1_CHIPS, ...P2_CHIPS, ...Object.keys(SHARED[pig]), ...Object.keys(X_POOLS[pig])].map((k): [PigId, string] => [pig, k])),
  ...Object.keys(P3_POOLS).map((k): [PigId, string] => [P3, k]),
];

const vars: Record<string, string> = {
  player: 'Alexandria', time: '11:42 PM', tod: 'this evening', day: 'Wednesday', place: 'the Physics Building',
  home: 'the Physics Building', food: 'banana protein shake', other: 'Piggy 2', otherplace: 'the Physics Building',
  last: 'the spinal cord', said: 'marine biology', n: '12', major: 'Medicine & Life Sciences', hometown: 'Saint Petersburg',
  comfort_food: 'grilled cheese', likes: 'board games', year: 'sophomore', exam: 'organic chemistry exam', chronotype: 'night owl',
};

describe('every new quick reply has its answer pool', () => {
  test('Piggy 1 and Piggy 2 answer their own eight chips with 5 lines each, Piggy 3 teases both with a line apiece', () => {
    for (const key of P1_CHIPS) {
      expect([P1, key, pool(P1, key).length >= 5]).toEqual([P1, key, true]);
      for (const guest of [P2, P3]) expect([guest, key, pool(guest, key).length >= 1]).toEqual([guest, key, true]);
    }
    for (const key of P2_CHIPS) {
      expect([P2, key, pool(P2, key).length >= 5]).toEqual([P2, key, true]);
      for (const guest of [P1, P3]) expect([guest, key, pool(guest, key).length >= 1]).toEqual([guest, key, true]);
    }
  });

  test('all three pigs answer the six shared chips, "Are you on X?" and "Are you on Twitter?" in their own voice', () => {
    for (const pig of PIG_IDS) {
      for (const [key, min] of Object.entries({ ...SHARED[pig], ...X_POOLS[pig] })) {
        expect([pig, key, pool(pig, key).length >= min]).toEqual([pig, key, true]);
      }
    }
  });

  test("Piggy 3's own chips and decoders: the counts the spec promised", () => {
    for (const [key, min] of Object.entries(P3_POOLS)) expect([key, pool(P3, key).length >= min]).toEqual([key, true]);
  });

  test('a chip with 4+ lines can be answered at every bond tier from at least 3 lines (the rest are warm extras)', () => {
    for (const [pig, key] of NEW_POOLS) {
      const lines = pool(pig, key);
      if (lines.length < 4) continue;
      for (const tier of ['N', 'F', 'W'] as const) {
        expect([pig, key, tier, lines.filter((l) => tierOk(l, tier)).length >= 3]).toEqual([pig, key, tier, true]);
      }
    }
  });

  test('the personal line: exactly one "{chronotype}" line per pig, so it only shows when the intake form said so', () => {
    for (const pig of PIG_IDS) {
      expect([pig, texts(pig, 'ask_about_self:chronotype').filter((t) => t.includes('{chronotype}')).length]).toEqual([pig, 1]);
    }
  });
});

// ── the chips reach the pools (the routing in heuristic/intents.ts and the pool keys here have to agree) ──

/** chip text → the pool key it must land on, for the pig that offers the chip (and, for the shared ones, every pig). */
const OWN_CHIPS: Record<PigId, Record<string, string>> = {
  [P1]: {
    'What was Germany like?': 'passion_p1:germany', 'Say something in German!': 'passion_p1:german', 'Haikyu!! fave character?': 'passion_p1:haikyu',
    'Sand or indoor?': 'passion_p1:sand', 'Can I join your team?': 'passion_p1:team', 'Volleyball lingo?': 'passion_p1:calls',
    'Favorite algorithm?': 'passion_p1:algorithm', "Best bug you've fixed?": 'passion_p1:bug',
    'Are you on X?': 'passion_p3:x', 'Are you on Twitter?': 'passion_p3:twitter',
  },
  [P2]: {
    'Want my old stethoscope?': 'passion_p2:donation', "What's a research year?": 'passion_p2:research_year', 'Do you miss the OR?': 'passion_p2:or',
    'Why neurosurgery?': 'passion_p2:why', 'Favorite cranial nerve?': 'passion_p2:nerves', "Who's Professor Snout?": 'passion_p2:snout',
    'Fireworks fan?': 'ask_about_self:july4', 'Am I based?': 'based:rate', 'Are you on X?': 'passion_p3:x', 'Are you on Twitter?': 'passion_p3:twitter',
  },
  // "Are you on X?" and "Are you on Twitter?" are quirks for him (the mumble and the correction), so they are not bank chips here
  [P3]: {
    'Teach me a math trick!': 'passion_p3:mathtrick', 'Were you a math tutor?': 'ask_about_self:job', 'What even is an LLM?': 'passion_p3:llm',
    'What does an EEG show?': 'passion_p3:eeg', "What's medical AI?": 'passion_p3:medai', 'Would you build a robot?': 'passion_p3:robots',
    'Why sugar-free Red Bull?': 'ask_favorite_food:red_bull_sf', "When's your birthday?": 'ask_about_self:birthday',
    'Favorite physics fact?': 'passion_p3:physics', "What's HiPerGator?": 'passion_p3:hipergator',
    // typed, not offered as chips: the decoders for his mumble, and X or Twitter inside a longer message
    "what's RLHF?": 'passion_p3:rlhf', "what's RLVR?": 'passion_p3:rlvr', "what's Jev?": 'passion_p3:jev', "what's a foundation model?": 'passion_p3:foundation',
    'i saw it on x': 'passion_p3:x', 'i saw it on twitter': 'passion_p3:twitter',
  },
};
const SHARED_CHIPS: Record<string, string> = {
  'Hype me up!': 'encourage:hype', 'Early bird or night owl?': 'ask_about_self:chronotype', 'Teach me something!': 'study:teach',
  "What's your dream?": 'ask_about_self:dream', 'What are you watching?': 'ask_hobby:shows', 'Are you competitive?': 'ask_about_self:competitive',
};

function chatCtx(pig: PigId, bondLevel: number): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel, memories: ['sleep=Night owl'],
  };
}
const filler = (k: number): ChatTurn[] => Array.from({ length: k }, (_, i) => ({ role: 'player' as const, text: `hi ${i}`, at: i }));
/** A bank line as a pattern for what the brain says ("donated by {player}" → "donated by Alex"). */
const asPattern = (raw: string) =>
  new RegExp(raw.split(/\{[a-z_]+(?:\|[^{}]*)?\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+'));
const fromPool = (pig: PigId, key: string, said: string) => pool(pig, key).some((l) => asPattern(l[1]).test(said));
const route = (pig: PigId, text: string) => {
  const r = classifyIntent(text, pig);
  return `${r.intent}${r.topic ? ':' + r.topic : ''}`;
};

describe('every chip reaches its own pool', () => {
  // Fri 2026-10-30, 3:42 PM, like the other Talk tests
  beforeAll(() => setClockOffset(Date.parse('2026-10-30T15:42:00') - Date.now()));
  afterAll(() => setClockOffset(0));

  test('routing: each chip (and the typed decoders) lands on the pool key it was written for, for the pig who offers it', () => {
    for (const pig of PIG_IDS) {
      for (const [chip, key] of Object.entries({ ...OWN_CHIPS[pig], ...SHARED_CHIPS })) expect([pig, chip, route(pig, chip)]).toEqual([pig, chip, key]);
    }
  });

  test('routing: the other pigs hear the same chips and land on the same keys, so their one-liners are found', () => {
    for (const guest of PIG_IDS) {
      for (const owner of PIG_IDS.filter((p) => p !== guest)) {
        for (const [chip, key] of Object.entries(OWN_CHIPS[owner])) {
          if (owner === P3 && !/^(?:Teach me a math|Were you|What even|What does an EEG|What's medical|Would you build|Why sugar|When's your|Favorite physics|What's HiPer)/.test(chip)) continue;
          // Piggy 2 hears "What does an EEG show?" as his own electrodes talk, and every pig answers "When's your birthday?" about himself
          if (guest === P2 && chip === 'What does an EEG show?') continue;
          expect([guest, chip, route(guest, chip)]).toEqual([guest, chip, key]);
        }
      }
    }
  });

  test('every chip is answered from its own pool, at every bond tier and after any number of earlier messages', () => {
    for (const pig of PIG_IDS) {
      for (const [chip, key] of Object.entries({ ...OWN_CHIPS[pig], ...SHARED_CHIPS })) {
        for (const bondLevel of [0, 4, 9]) {
          for (let k = 0; k < 6; k++) {
            const said = respondHeuristic({ pig, playerText: chip, history: filler(k), context: chatCtx(pig, bondLevel) }).text;
            expect([pig, chip, bondLevel, k, said, fromPool(pig, key, said)]).toEqual([pig, chip, bondLevel, k, said, true]);
          }
        }
      }
    }
  });

  test('a pig answers a chip that is not his own with a line of his own, never a generic question', () => {
    for (const guest of PIG_IDS) {
      for (const owner of [P1, P2].filter((p) => p !== guest)) {
        for (const [chip, key] of Object.entries(OWN_CHIPS[owner]).filter(([c]) => !/ X\?| Twitter\?/.test(c))) {
          const said = respondHeuristic({ pig: guest, playerText: chip, history: [], context: chatCtx(guest, 4) }).text;
          expect([guest, chip, key, said, fromPool(guest, route(guest, chip), said)]).toEqual([guest, chip, key, said, true]);
        }
      }
    }
  });
});

describe('the bank rules hold for every new line', () => {
  test('valid faces and clips, known placeholders, ≤ 3 sentences, ≤ 280 characters, kind and PG', () => {
    const BAD = /bacon|\bhams?\b|pork|sausage|\bbird\b(?<!early bird)|\blogo\b|@\w|https?:|\bdumb\b|\bhate\b|mathnasium/i;
    for (const [pig, key] of NEW_POOLS) {
      for (const l of pool(pig, key)) {
        const where = `${pig} ${key}: ${l[1]}`;
        expect([where, EXPRESSIONS.includes(l[0])]).toEqual([where, true]);
        if (l[2]?.a) expect([where, ANIMS.has(l[2].a)]).toEqual([where, true]);
        if (l[2]?.tier) expect(['N', 'F', 'W', 'NF', 'FW']).toContain(l[2].tier);
        for (const p of placeholdersIn(l[1])) expect([where, KNOWN_PLACEHOLDERS.has(p.key)]).toEqual([where, true]);
        const filled = fill(l[1], vars) ?? '';
        expect([where, filled.length <= 280, sentenceCount(filled) <= 3, /[{}]/.test(filled)]).toEqual([where, true, true, false]);
        expect([where, BANNED.test(l[1]), BAD.test(filled), /\p{Extended_Pictographic}/u.test(l[1])]).toEqual([where, false, false, false]);
      }
    }
  });

  test('idle bubbles stay ≤ 60 characters, with at least six lines per kind', () => {
    for (const pig of PIG_IDS) {
      for (const [kind, ls] of Object.entries(LINES[pig].idle)) {
        expect([pig, kind, ls.length >= 6]).toEqual([pig, kind, true]);
        for (const x of ls) {
          const t = typeof x === 'string' ? x : x[1];
          expect([pig, kind, t, t.length <= 60]).toEqual([pig, kind, t, true]);
        }
      }
    }
  });
});

describe('X and Twitter', () => {
  test("Piggy 3's Twitter pool is the six corrections the quirk rotates through, and only that pool says the word", () => {
    expect(pool(P3, 'passion_p3:twitter').map((l) => [l[0], l[1]])).toEqual(X_CORRECTIONS.map(([text, face]) => [face, text]));
    for (const [t] of X_CORRECTIONS) expect(t).toMatch(/\bX\b/);
    const saysIt = [...talk(P3), ...idle(P3).map(([k, t]): [string, string] => [`idle.${k}`, t])].filter(([, t]) => /\btwitter\b|\btweet/i.test(t));
    expect([...new Set(saysIt.map(([k]) => k))]).toEqual(['passion_p3:twitter']);
    for (const [, t] of idle(P3)) expect(t).not.toMatch(/twitter|tweet/i);
  });

  test('Piggy 1 and Piggy 2 tease him: never say "Twitter" near Piggy 3, and he mumbles under his breath (no rant)', () => {
    for (const pig of [P1, P2]) {
      const x = texts(pig, 'passion_p3:x');
      const tw = texts(pig, 'passion_p3:twitter');
      expect(tw.filter((t) => /Piggy 3/.test(t)).length).toBeGreaterThanOrEqual(3);
      expect(tw.some((t) => /never say|don't say|say “X”/i.test(t))).toBe(true);
      expect(x.some((t) => /mutters?|mumbles?/.test(t) && /under his breath/.test(t))).toBe(true);
      expect(x.some((t) => /X dot com|X\.com/.test(t))).toBe(true);
      for (const t of [...x, ...tw]) expect([pig, t, /\brant(?:s|ed|ing)?\b|shout|yell(?:s|ed)? at/i.test(t)]).toEqual([pig, t, false]);
    }
  });

  test('Piggy 2 and X: an account with zero posts and a pager for a feed, the same story in every line', () => {
    const lines = [...texts(P2, 'passion_p3:x'), ...texts(P2, 'passion_p3:twitter')];
    expect(lines.some((t) => /zero posts/i.test(t))).toBe(true);
    for (const t of lines) expect([t, /\b(?:no account|don't have an account|have no account)\b/i.test(t)]).toEqual([t, false]);
    expect(texts(P2, 'passion_p3:x').some((t) => /pager/i.test(t))).toBe(true);
  });

  test('Piggy 3 is hooked: the X.com sprinkles are in his greetings, farewell, small talk, bored, tired and late-night lines', () => {
    const where: [string, 'chat' | 'greet'][] = [
      ['greeting', 'chat'], ['farewell', 'chat'], ['how_are_you', 'chat'], ['whats_up', 'chat'], ['bored', 'chat'],
      ['tired_talk:needy', 'chat'], ['need:tired', 'chat'], ['ask_schedule', 'chat'], ['ask_hobby', 'chat'], ['ask_about_self', 'chat'],
      ['ask_about_self:dating', 'chat'], ['greet:morning', 'greet'], ['greet:day', 'greet'], ['greet:night', 'greet'],
      ['greet:late', 'greet'], ['greet:any', 'greet'],
    ];
    for (const [key, section] of where) {
      const ls = (section === 'chat' ? LINES[P3].chat : LINES[P3].greet)[key] ?? [];
      expect([key, ls.some((l) => /\bX\b/.test(l[1]))]).toEqual([key, true]);
    }
    for (const kind of ['tired', 'bored', 'happy', 'woke', 'sleepy', 'random', 'whisper'] as const) {
      const ls = LINES[P3].idle[kind].map((x) => (typeof x === 'string' ? x : x[1]));
      expect([kind, ls.some((t) => /\bX\b|x dot com/i.test(t))]).toEqual([kind, true]);
    }
  });

  test('he sometimes says "X.com", with the dot: often enough to notice, never in most lines', () => {
    const all = [...talk(P3).map(([, t]) => t), ...idle(P3).map(([, t]) => t)];
    const dot = all.filter((t) => /X\.com/.test(t));
    const onX = all.filter((t) => /X\.com|\bon X\b/.test(t));
    expect(dot.length).toBeGreaterThanOrEqual(12);
    expect(onX.length).toBeGreaterThanOrEqual(20);
    expect(dot.length).toBeLessThanOrEqual(all.length * 0.06);
    // he stays himself: the other seed lines are still the majority
    expect(all.filter((t) => /\bX\b/.test(t)).length).toBeLessThan(all.length * 0.1);
  });

  test('the quiet-fast-to-himself mumble is a mumble: nothing in the pools or the persona calls it a rant', () => {
    for (const pig of PIG_IDS) for (const key of ['passion_p3:x', 'passion_p3:twitter']) for (const t of texts(pig, key)) expect([t, /\brant/i.test(t)]).toEqual([t, false]);
    const md = CHARACTERS[P3].prompt + CHARACTERS[P3].samples.map((s) => s.line).join(' ');
    expect(md).toMatch(/mumbl/i);
    expect(md).not.toMatch(/\brant/i);
  });
});

describe('less 3D printing', () => {
  const PRINT = /\b3d\b|\bprint(?:s|er|ers|ing|ed)?\b|filament|\bPLA\b|spaghetti|nozzle|layer lines?/i;

  test('only two Talk lines bring it up unasked (his calm hobby answer and the Buggy joke); ≤ 5 across chat, greeting and idle', () => {
    const unasked = talk(P3).filter(([k, t]) => k !== 'passion_p3:printing' && PRINT.test(t));
    expect(unasked.map(([k]) => k).sort()).toEqual(['ask_hobby', 'passion_p3:op_better']);
    expect(talk(P3).filter(([, t]) => PRINT.test(t)).length + idle(P3).filter(([, t]) => PRINT.test(t)).length).toBeLessThanOrEqual(5);
    const hobby = texts(P3, 'ask_hobby').find((t) => PRINT.test(t))!;
    expect(hobby).toMatch(/now and then/);
    expect(hobby).toMatch(/hobby, not a lifestyle/);
  });

  test("the printing pool still answers when asked, and says he prints less now; the other two pigs keep their one line", () => {
    expect(pool(P3, 'passion_p3:printing').length).toBeGreaterThanOrEqual(3);
    expect(texts(P3, 'passion_p3:printing').some((t) => /print less now/.test(t))).toBe(true);
    for (const pig of [P1, P2]) expect([pig, pool(pig, 'passion_p3:printing').length]).toEqual([pig, 1]);
  });

  test("the replaced lines are gone from his banks: a 3D printer is no longer the punchline of a farewell, a joke, a hometown or a clock", () => {
    const all = talk(P3).map(([, t]) => t);
    for (const gone of [
      'arguing with a 3D printer', 'my print finally', 'Waiting on a print', 'Why did the 3D print fail', 'print stuff, and stay up',
      'Home is wherever my printer is', 'up there with a print', 'My room has a printer', 'Unlike my print queue', 'Makerspace',
      'date my print queue', 'Better at printers', 'while I print', 'printing little ornaments', 'Is it PLA', 'my print has a timer',
      'mine is printers', 'basically a 3D print now',
    ]) expect([gone, all.some((t) => t.includes(gone))]).toEqual([gone, false]);
    const idleAll = idle(P3).map(([, t]) => t);
    for (const gone of ['Basically I\'m a 3D print now', 'Filament everywhere', 'I smell like a printer', 'Layer lines', 'No more PLA dust', 'Coffee first', 'Spaghetti print', 'I have three printers']) {
      expect([gone, idleAll.some((t) => t.includes(gone))]).toEqual([gone, false]);
    }
  });

  test('the Hub and the Physics Building follow: no printer whirring down the hall, no printed Century Tower', () => {
    for (let seed = 0; seed < 4; seed++) for (const tod of ['morning', 'day', 'evening', 'night'] as const) {
      const v = vibeLine('physics', tod, seed);
      expect(v).not.toMatch(/3d printer|printer whirs/i);
    }
    const any = vibeLine('physics', 'day', 0);
    expect(any).toContain('job queue');
    expect(any).toContain('DO NOT UNPLUG. PLEASE.');
    expect(DIARY[P3].some((d) => /printed a tiny Century Tower/.test(d.did))).toBe(false);
    expect(DIARY[P3].some((d) => /X\.com/.test(d.did) && /three new models/.test(d.line))).toBe(true);
    expect(WANT_LINES.talk[P3]).toContain("Ask me what's on X today. Please.");
  });

  test('Codex never sends him to the 3D printer either', () => {
    expect(CODEX_LINES.some((t) => PRINT.test(t))).toBe(false);
  });
});

describe('canon in the new lines', () => {
  test('Piggy 3 used to tutor math: every job line says tutor, the tutoring business is never named, the tricks are right', () => {
    for (const t of texts(P3, 'ask_about_self:job')) expect(t).toMatch(/tutor/i);
    for (const pig of PIG_IDS) for (const [k, t] of talk(pig)) expect([pig, k, /mathnasium/i.test(t)]).toEqual([pig, k, false]);
    const tricks = texts(P3, 'passion_p3:mathtrick').join(' ');
    expect(tricks).toMatch(/36 times 11 is 3, then 3 plus 6, then 6\. So, 396/);
    expect(tricks).toMatch(/7 times 9 is 63/);
    expect(tricks).toMatch(/8% of 50 is the same as 50% of 8, so it's just 4/);
    expect(tricks).toMatch(/Fifty pairs, so 5,050/);
    expect(tricks).toMatch(/three sixths plus two sixths, so five sixths/);
    expect(texts(P3, 'ask_about_self:job').join(' ')).toMatch(/Seven times eight is fifty-six/);
  });

  test('Piggy 2 already has grants and is always writing the next one; he is PGY-4 of seven and barely sleeps', () => {
    const own = P2_CHIPS.flatMap((k) => texts(P2, k)).concat(Object.keys(SHARED[P2]).flatMap((k) => texts(P2, k)));
    for (const t of own) expect([t, /\bfirst grant\b|\bfirst as (?:a |the )?(?:PI|principal investigator)\b/i.test(t)]).toEqual([t, false]);
    const year = texts(P2, 'passion_p2:research_year');
    expect(year.some((t) => /\bgrants\b/i.test(t))).toBe(true);
    expect(year.some((t) => /next one always due/i.test(t))).toBe(true);
    expect(year.some((t) => /PGY-4 of seven/.test(t))).toBe(true);
    expect(texts(P2, 'ask_about_self:dream').some((t) => /Three more years of residency/.test(t))).toBe(true);
    const sleep = texts(P2, 'ask_about_self:chronotype').join(' ');
    expect(sleep).toMatch(/What's sleep\?/);
    expect(sleep).toMatch(/paged at three/);
    // nobody calls him well-rested, and he still says perfusion freely (only the rhythm game is "Swinus Rhythms")
    for (const t of own) expect([t, /well[- ]rested|slept (?:well|great|through)|eight hours/i.test(t)]).toEqual([t, false]);
    expect(texts(P2, 'encourage:hype').join(' ')).toMatch(/perfusion/i);
    // the lab pigs are the ones in his scenes: Snout (apples on Tuesdays), Lancelot and the mop
    const snout = texts(P2, 'passion_p2:snout').join(' ');
    expect(snout).toMatch(/apples on Tuesdays/i);
    expect(snout).toMatch(/Sir Lancelot/);
    expect(snout).toMatch(/mop/);
  });

  test('Piggy 1: Germany, German counting, Haikyu!! and a bug story, in his own bounce', () => {
    expect(texts(P1, 'passion_p1:german').join(' ')).toMatch(/Eins, zwei, drei/);
    expect(texts(P1, 'passion_p1:germany').join(' ')).toMatch(/Feierabend/);
    expect(texts(P1, 'passion_p1:haikyu').join(' ')).toMatch(/Bokuto[\s\S]*Hinata[\s\S]*Nishinoya[\s\S]*Kageyama/);
    expect(texts(P1, 'passion_p1:bug').join(' ')).toMatch(/timezone bug/);
    expect(texts(P1, 'passion_p1:algorithm').join(' ')).toMatch(/Binary search/);
    // he is 128 centimeters, and says so next to Hinata
    expect(CHARACTERS[P1].height).toMatch(/^128 cm/);
    expect(texts(P1, 'passion_p1:haikyu').join(' ')).toMatch(/128 centimeters/);
    // birthdays: June 21 (his), July 4 (Piggy 2's), November 7 (Piggy 3's)
    expect(texts(P1, 'ask_about_self:july4').join(' ')).toMatch(/June 21/);
    expect(texts(P3, 'ask_about_self:july4').join(' ')).toMatch(/November 7[\s\S]*July 4/);
    expect(texts(P3, 'ask_about_self:birthday').filter((t) => /Marie Curie/.test(t)).length).toBeGreaterThanOrEqual(4);
  });

  test("One Piece, always: Piggy 3's new shows line leads with it, and no new pool picks JoJo", () => {
    expect(texts(P3, 'ask_hobby:shows')[0]).toMatch(/^One Piece/);
    for (const [pig, key] of NEW_POOLS) for (const t of texts(pig, key)) expect([pig, key, /\bjojo\b/i.test(t)]).toEqual([pig, key, false]);
  });
});

describe('the persona files and the prompts built from them', () => {
  // The first paragraph of each compact prompt is always kept by trimPersona, so every word added to it comes off the
  // other paragraphs' budget (340 tokens, 190 for the lite model). Paragraph 1 did not grow with these edits.
  const BEFORE = { [P1]: 461, [P2]: 701, [P3]: 418 } as const;
  const OPENING: Record<PigId, string> = {
    [P1]: 'You are Piggy 1, a fictional pig character: a sunny, energetic third-year computer-science student',
    [P2]: 'You are Piggy 2, a fictional pig character: a calm, deadpan doctor, a fourth-year neurosurgery resident',
    [P3]: 'You are Piggy 3, a fictional pig character. You are a curious, hands-on builder who likes Codex, AI,',
  };

  test('each compact prompt keeps its opening, and its first paragraph does not grow', () => {
    for (const pig of PIG_IDS) {
      const para1 = CHARACTERS[pig].prompt.split(/\n\s*\n/)[0];
      expect([pig, para1.startsWith(OPENING[pig])]).toEqual([pig, true]);
      expect([pig, para1.length <= BEFORE[pig]]).toEqual([pig, true]);
    }
    expect(CHARACTERS[P3].prompt.split(/\n\s*\n/)[0]).toContain('X.com');
    expect(CHARACTERS[P3].prompt.split(/\n\s*\n/)[0]).not.toContain('making objects');
    expect(CHARACTERS[P3].prompt).toContain('You used to be a math tutor.');
  });

  test("Piggy 3: likes X.com first-ish, dislikes the old name, the X sentence sits right after the One Piece rule", () => {
    const c = CHARACTERS[P3];
    expect(c.likes).toContain('X.com (never “Twitter”)');
    expect(c.likes).toContain('sugar-free Red Bull');
    expect(c.likes.indexOf('X.com (never “Twitter”)')).toBeLessThan(3);
    expect(c.likes.at(-1)).toBe('the occasional 3D print');
    expect(c.dislikes[0]).toBe('anyone calling it “Twitter”');
    expect(c.role).toMatch(/math/);
    const x = "You're hooked on X and sometimes say X.com; you never call it Twitter, and you correct anyone who does. Asked what's on X, you mumble AI words to yourself, then catch yourself.";
    expect(c.prompt).toContain(x);
    expect(c.prompt).toContain(`you always pick One Piece, never JoJo. ${x} You sometimes think aloud`);
    for (const beat of ['On X', 'Hearing “Twitter”', 'Snapping out of a mumble', 'Math trick']) expect(c.samples.map((s) => s.beat)).toContain(beat);
    expect(c.samples.find((s) => s.beat === 'Snapping out of a mumble')!.line).toMatch(/mumbling again/);
  });

  test("trimming keeps what matters: the One Piece rule at every tier, the X sentence wherever the budget allows, 'never Twitter' in every system prompt", () => {
    for (const tier of MODEL_IDS) {
      const trimmed = trimPersona(CHARACTERS[P3].prompt, MODELS[tier].budget.persona);
      expect([tier, trimmed.startsWith('You are Piggy 3, a fictional pig character.')]).toEqual([tier, true]);
      expect([tier, trimmed.includes('you always pick One Piece, never JoJo.')]).toEqual([tier, true]);
      const p = systemPrompt(P3, tier);
      expect([tier, p.includes('X.com'), p.includes('never Twitter')]).toEqual([tier, true, true]);
    }
    // the biggest persona budget still has room for "you're hooked on X…, you never call it Twitter"; the smallest tier may
    // trim it, which is why the rules list (prompts.ts SOFT_QUIRK) says "never Twitter" too. The mumble itself is code in
    // quirks.ts, not something the model has to remember.
    const biggest = Math.max(...MODEL_IDS.map((t) => MODELS[t].budget.persona));
    expect(trimPersona(CHARACTERS[P3].prompt, biggest)).toContain("You're hooked on X and sometimes say X.com; you never call it Twitter, and you correct anyone who does.");
    for (const pig of [P1, P2]) for (const tier of MODEL_IDS) expect([pig, tier, systemPrompt(pig, tier).includes('Twitter')]).toEqual([pig, tier, false]);
  });

  test('Piggy 1 and Piggy 2 carry the new canon in their files, and the prompts hold it', () => {
    expect(CHARACTERS[P1].prompt).toContain('You used to be a researcher in Germany.');
    expect(CHARACTERS[P1].prompt).toContain('You still count reps in German ("eins, zwei, drei!") and cheer "Los geht\'s!", and Haikyu!! is your favorite anime.');
    expect(CHARACTERS[P2].prompt).toContain('Your lab pigs are Professor Snout, Sir Lancelot and Truffle.');
    expect(CHARACTERS[P2].prompt).toMatch(/expired medical equipment/);
    expect(CHARACTERS[P2].prompt).toContain('You are always writing the next grant and get little sleep.');
    const beats = (pig: PigId) => CHARACTERS[pig].samples.map((s) => s.beat);
    expect(beats(P1)).toEqual(expect.arrayContaining(['Germany', 'Nervous']));
    expect(beats(P2)).toEqual(expect.arrayContaining(['Offered old equipment', 'Asked "Am I based?"']));
    expect(CHARACTERS[P2].samples.find((s) => s.beat === 'Offered old equipment')!.line).toMatch(/never on a patient/);
  });

  test('the generated file matches the markdown (bun run gen was run): the compact prompt, the samples and the likes', async () => {
    // the same extraction scripts/gen-characters.ts does: the "Compact character prompt" blockquote and the sample table
    const section = (md: string, title: RegExp) => {
      const lines = md.split('\n');
      const start = lines.findIndex((l) => /^##\s/.test(l) && title.test(l));
      let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
      if (end < 0) end = lines.length;
      return lines.slice(start + 1, end).join('\n').trim();
    };
    for (const [n, pig] of [[1, P1], [2, P2], [3, P3]] as const) {
      const md = await Bun.file(new URL(`../characters/piggy-${n}.md`, import.meta.url)).text();
      const prompt = section(md, /Compact character prompt/i).split('\n').filter((l) => l.startsWith('>')).map((l) => l.replace(/^>\s?/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      expect([pig, CHARACTERS[pig].prompt]).toEqual([pig, prompt]);
      const rows = section(md, /Sample dialogue/i).split('\n').filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l)).length - 1;
      expect([pig, CHARACTERS[pig].samples.length]).toEqual([pig, rows]);
    }
    const likes = /^likes: \[(.*)\]$/m.exec(await Bun.file(new URL('../characters/piggy-3.md', import.meta.url)).text())![1];
    expect(likes.startsWith('Codex and coding agents, X.com (never “Twitter”), math and one clear example')).toBe(true);
  });

  test('the persona files say mumble, never rant, and never name the tutoring business', async () => {
    const md3 = await Bun.file(new URL('../characters/piggy-3.md', import.meta.url)).text();
    expect(md3).toMatch(/like Deku muttering through a plan/);
    expect(md3).toMatch(/It is a mumble, never a rant/);
    expect(md3).toMatch(/He used to tutor math at a tutoring center/);
    for (const n of [1, 2, 3]) expect([n, /mathnasium/i.test(await Bun.file(new URL(`../characters/piggy-${n}.md`, import.meta.url)).text())]).toEqual([n, false]);
    const md1 = await Bun.file(new URL('../characters/piggy-1.md', import.meta.url)).text();
    const md2 = await Bun.file(new URL('../characters/piggy-2.md', import.meta.url)).text();
    expect(md1).not.toMatch(/twitter/i);
    expect(md2).not.toMatch(/twitter/i);
    expect(md2).toMatch(/\*\*X, barely\.\*\* He has an X account with zero posts/);
  });
});
