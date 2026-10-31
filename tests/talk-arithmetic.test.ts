// "What's 9 plus 10?" gets an answer, not a deflection ("Hmm, good question. I don't actually know."). A message that is
// nothing but one sum is the 'arithmetic' intent (any wording: "9+10", "what is nine plus ten", "quick math: 6 * 7"); the
// answer is solved in code (template.ts parseArithmetic: exact, a division to two decimals) and the pigs' lines only say
// {answer} and {expr}. Piggy 1 is sunny, Piggy 2 is deadpan, Piggy 3 tutored math; for exactly 9 + 10 (either order, any
// wording) Piggy 3 jokes about the "21" meme and the other two nod to it. Scores, sizes, dates and odds are not sums.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { EXPRESSIONS, PIG_IDS, type ChatContext, type ChatTurn, type PigId } from '../src/lib/types';
import { classifyIntent, respondHeuristic, sentenceCount } from '../src/lib/ai/heuristic';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { buildVars } from '../src/lib/ai/heuristic/respond';
import { fill, KNOWN_PLACEHOLDERS, parseArithmetic, placeholdersIn } from '../src/lib/ai/heuristic/template';
import { postfilter } from '../src/lib/ai/postfilter';
import { CHARACTERS } from '../src/lib/content/characters';
import { setClockOffset } from '../src/lib/state/clock';

// Fixed game clock (the reply seed includes the date): Friday 2026-10-30, 3:42 PM local.
beforeAll(() => setClockOffset(Date.parse('2026-10-30T15:42:00') - Date.now()));
afterAll(() => setClockOffset(0));

function ctx(pig: PigId, over: Partial<ChatContext> = {}): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [], ...over,
  };
}

const ask = (pig: PigId, text: string, history: ChatTurn[] = [], over: Partial<ChatContext> = {}) =>
  respondHeuristic({ pig, playerText: text, history, context: ctx(pig, over) });
const pool = (pig: PigId, key: string) => (LINES[pig].chat[key] ?? []).map((l) => l[1]);
/** Everything his pool can say to this sum: each line filled in with the sum's words and its answer. */
function saysTo(pig: PigId, key: string, text: string, over: Partial<ChatContext> = {}): string[] {
  const sum = parseArithmetic(text)!;
  const vars = { ...buildVars(pig, ctx(pig, over)), answer: sum.answer, expr: sum.expr };
  return pool(pig, key).map((t) => fill(t, vars)).filter((t): t is string => t !== null);
}
/** The pig's reply is one of `lines`, maybe after a lead-in ("Hey, teammate!" for "hi!"). */
const isOneOf = (reply: string, lines: readonly string[]) => lines.some((l) => reply === l || reply.endsWith(` ${l}`));
const keyFor = (kind: string | undefined) => (kind ? `arithmetic:${kind}` : 'arithmetic');

type Kind = 'meme' | 'zero' | 'approx' | undefined;
/** [what the player typed, the sum in words, the answer, what is special about it] */
const SUMS: [string, string, string, Kind?][] = [
  // the wordings the owner listed
  ["what's 9 plus 10?", '9 plus 10', '19', 'meme'], ['what is 9 plus 10', '9 plus 10', '19', 'meme'],
  ['whats 9 plus 10', '9 plus 10', '19', 'meme'], ['9+10', '9 plus 10', '19', 'meme'], ['9 + 10 = ?', '9 plus 10', '19', 'meme'],
  ['what is nine plus ten', '9 plus 10', '19', 'meme'], ['2 times 3?', '2 times 3', '6'],
  ['how much is 7 times 8?', '7 times 8', '56'], ['calculate 12 minus 5', '12 minus 5', '7'],
  ['quick math: 6 * 7', '6 times 7', '42'],
  // the operators
  ['7 x 8', '7 times 8', '56'], ['8 multiplied by 9', '8 times 9', '72'], ['10 / 5', '10 divided by 5', '2'],
  ['20 divided by 4', '20 divided by 4', '5'], ['9 over 3', '9 divided by 3', '3'], ['3 - 5', '3 minus 5', 'negative 2'],
  ['14 ÷ 7', '14 divided by 7', '2'], ['6 × 7', '6 times 7', '42'], ['6*7', '6 times 7', '42'], ['1+1', '1 plus 1', '2'],
  // number words: zero to nineteen, the tens, and the two put together
  ['seven plus eight', '7 plus 8', '15'], ['twenty one plus forty two', '21 plus 42', '63'],
  ['thirty-five minus twelve', '35 minus 12', '23'], ['one hundred minus 3', '100 minus 3', '97'],
  ['twenty times twenty', '20 times 20', '400'], ['ninety nine plus one', '99 plus 1', '100'], ['zero plus zero', '0 plus 0', '0'],
  // decimals, negatives and big numbers, exactly
  ['1.5 + 2.25', '1.5 plus 2.25', '3.75'], ['0.1 + 0.2', '0.1 plus 0.2', '0.3'], ['.5 * 4', '0.5 times 4', '2'],
  ['-5 + 3', 'negative 5 plus 3', 'negative 2'], ['5 - -3', '5 minus negative 3', '8'], ['0.5 * 0.5', '0.5 times 0.5', '0.25'],
  ['1,000 * 25', '1000 times 25', '25,000'], ['123456 * 789', '123,456 times 789', '97,406,784'],
  ['999999999 * 999999999', '999,999,999 times 999,999,999', '999,999,998,000,000,001'],
  // wrapped, punctuated, shouted
  ['WHAT IS 9+10??', '9 plus 10', '19', 'meme'], ['hey piggy 3, what is 4 times 4?', '4 times 4', '16'],
  ['can you do 6+6?', '6 plus 6', '12'], ['do you know what 7 times 6 is?', '7 times 6', '42'], ['(2+2)', '2 plus 2', '4'],
  ['2 + 2 😂', '2 plus 2', '4'], ['what is 3 plus 4, please?', '3 plus 4', '7'], ['whats 5 + 5 lol', '5 plus 5', '10'],
  // the answer the player has in mind is no part of the question
  ['2 + 2 = 5', '2 plus 2', '4'], ['what does 6 times 7 equal?', '6 times 7', '42'], ['9 + 10 = 21', '9 plus 10', '19', 'meme'],
  // divisions: even, to two decimals (rounded half away from zero), and by zero
  ['10 divided by 4', '10 divided by 4', '2.5'], ['10 divided by 3', '10 divided by 3', '3.33', 'approx'],
  ['2 / 3', '2 divided by 3', '0.67', 'approx'], ['1 ÷ 8', '1 divided by 8', '0.13', 'approx'],
  ['-7 / 2', 'negative 7 divided by 2', 'negative 3.5'], ['0 divided by 5', '0 divided by 5', '0'],
  ['1.5 / 0.5', '1.5 divided by 0.5', '3'], ['100 / 8', '100 divided by 8', '12.5'],
  ['5 divided by 0', '5 divided by 0', '', 'zero'], ['0 / 0', '0 divided by 0', '', 'zero'], ['what is ten over zero', '10 divided by 0', '', 'zero'],
];

/** Not sums: scores, sizes, dates, odds, times, phone numbers, three numbers, a sum with talk around it, and plain talk. */
const NOT_SUMS = [
  "what's up", "what's 4-1-1 on the party", 'we won 3-1', 'the gators won 35 - 28', '3-1', 'see you 10/31', '10/31', "what's 10/31?",
  'is 10/31 a saturday', '2x4', 'i need a 2x4', "what's a 2x4?", 'a 4x6 photo', '1920×1080', 'we need 2 x 4s', '50/50', "it's a 50/50 chance",
  '2026-10-30', '10-30', '9-10', "what's 9-10", 'see you at 5 - 6', '10:30', "it's 3:30 pm", 'call 555-1234', '1/2', '3/4 cup',
  'i have 3 exams', 'i got a 3.5 gpa', 'what time is it', "what's 9 plus", '9 plus', 'plus 9', '9', 'nine', '+', '5 + 5 + 5',
  "what's 9 plus 10 and 3 minus 2", '1 2 3', "i'm 3 plus 4 exams", '3 times a day', "what's 2 and 2", 'piggy 3 plus 4', 'ten more minutes',
  'hello', '', '   ', 'what is the meaning of life?', '9999999999 + 1', '1.2345 + 1', '$5 + $3', '5% + 3%', 'x', "what's x times y",
];

describe('the sum reader (template.ts parseArithmetic)', () => {
  test('every wording is read and solved: the sum in words, the answer, and what is special about it', () => {
    for (const [text, expr, answer, kind] of SUMS) {
      const sum = parseArithmetic(text);
      expect([text, sum?.expr, sum?.answer, sum?.kind]).toEqual([text, expr, answer || undefined, kind]);
    }
  });

  test('exact arithmetic: no float noise, no scientific notation, no "-0", and a negative is spoken in words', () => {
    expect(parseArithmetic('0.1 + 0.2')!.answer).toBe('0.3');
    expect(parseArithmetic('0.7 + 0.1')!.answer).toBe('0.8');
    expect(parseArithmetic('1.1 * 1.1')!.answer).toBe('1.21');
    expect(parseArithmetic('0.3 - 0.1')!.answer).toBe('0.2');
    expect(parseArithmetic('99999999 * 99999999')!.answer).toBe('9,999,999,800,000,001');
    expect(parseArithmetic('1 - 1')!.answer).toBe('0');
    expect(parseArithmetic('-3 * 0')!.answer).toBe('0');
    expect(parseArithmetic('0 / -5')!.answer).toBe('0');
    expect(parseArithmetic('1 / 1000')!.answer).toBe('0');
    // commas from five digits ("1000" stays, as people type it), and never a leading "-" for the post-filter to eat
    expect(parseArithmetic('500 + 500')!.answer).toBe('1000');
    expect(parseArithmetic('5000 + 5000')!.answer).toBe('10,000');
    for (const [text] of SUMS) expect([text, /^[-.]/.test(parseArithmetic(text)!.answer ?? '')]).toEqual([text, false]);
    expect(parseArithmetic('2 - 9')!.answer).toBe('negative 7');
    expect(parseArithmetic('-2 / 8')!.answer).toBe('negative 0.25');
  });

  test('a division is rounded half away from zero to two decimals, and says so ("approx") only when something was left over', () => {
    const rows: [string, string, boolean][] = [
      ['1 / 3', '0.33', true], ['2 / 3', '0.67', true], ['1 / 8', '0.13', true], ['-1 / 8', 'negative 0.13', true], ['5 / 8', '0.63', true],
      ['7 / 2', '3.5', false], ['1 / 4', '0.25', false], ['10 / 4', '2.5', false], ['6 / 3', '2', false], ['1.5 / 0.25', '6', false],
      ['22 / 7', '3.14', true], ['100 / 3', '33.33', true],
    ];
    for (const [text, answer, approx] of rows) {
      const sum = parseArithmetic(text)!;
      expect([text, sum.answer, sum.kind === 'approx']).toEqual([text, answer, approx]);
    }
  });

  test('9 + 10 is the meme either way round and in any form; 21 by any other sum, and 9 and 10 by any other sign, is not', () => {
    for (const text of ['9+10', '10+9', 'nine plus ten', 'ten plus nine', '9.0 + 10', '9 + 10.00', "what's 10 plus 9?", '9 plus 10 = 21'])
      expect([text, parseArithmetic(text)?.kind]).toEqual([text, 'meme']);
    for (const text of ['9 + 11', '10 + 10', '10 + 11', '19 + 2', '8 + 13', '21 + 0', '9 - 10', '9 * 10', '10 / 9', '9 + 9', '1 + 9 + 10'])
      expect([text, parseArithmetic(text)?.kind]).toEqual([text, undefined]);
    expect(parseArithmetic('10 plus 11')!.answer).toBe('21');
  });

  test('a "-", "x", "×" or "/" with no spaces is a score, size, date or odds unless something says it is math', () => {
    for (const text of ['6x7', "what's 6x7?", '3-1', '10/31', '1920×1080', "what's 100/4?", 'is 12/4 a date']) expect([text, parseArithmetic(text)]).toEqual([text, null]);
    for (const [text, answer] of [
      ['calculate 6x7', '42'], ['6x7 = ?', '42'], ['how much is 6x7', '42'], ['quick math: 12/4', '3'], ['solve 3-1', '2'], ['3-1 =', '2'],
      ['calculate 10/31', '0.32'], ['10/31 = ?', '0.32'], ['what does 3-1 equal', '2'],
      ['6 x 7', '42'], ['10 / 4', '2.5'], ['3 - 1', '2'], ['4 × 5', '20'], ['9+10', '19'], ['6*7', '42'], ['6 ÷ 3', '2'],
    ]) expect([text, parseArithmetic(text)?.answer]).toEqual([text, answer]);
  });

  test('anything that is not one sum on its own is not read as one', () => {
    for (const text of NOT_SUMS) expect([text, parseArithmetic(text)]).toEqual([text, null]);
  });

  test('never throws, whatever it is given, and stays fast on long junk', () => {
    const junk = [
      undefined, null, 42, {}, '', ' ', '\n', '😂😂😂', '+'.repeat(500), '9'.repeat(5000), `${'hey '.repeat(60)}9+10`, ' '.repeat(10_000) + '1+1',
      '9 plus '.repeat(40), '1e999 + 1', 'NaN + Infinity', '١ + ٢', '9‍+‍10', '１＋１',
    ];
    const t0 = performance.now();
    for (const j of junk) expect(() => parseArithmetic(j as unknown as string)).not.toThrow();
    expect(performance.now() - t0).toBeLessThan(200);
    // full-width digits and signs are what they look like
    expect(parseArithmetic('１＋１')?.answer).toBe('2');
  });
});

describe('the intent: a sum beats "good question, I don\'t know"', () => {
  test('every wording is the arithmetic intent for every pig, with the sum solved on the result', () => {
    for (const pig of PIG_IDS) {
      for (const [text, expr, answer, kind] of SUMS) {
        const r = classifyIntent(text, pig);
        expect([pig, text, r.intent, r.topic]).toEqual([pig, text, 'arithmetic', kind]);
        expect([pig, text, r.math?.expr, r.math?.answer]).toEqual([pig, text, expr, answer || undefined]);
      }
    }
  });

  test('it beats the words in it ("quick math" is not math talk) and every question fallback', () => {
    for (const pig of PIG_IDS) {
      expect(classifyIntent('quick math: 6 * 7', pig).intent).toBe('arithmetic');
      expect(classifyIntent("what's 9 plus 10?", pig).intent).not.toBe('question_generic');
      // the neighbors keep their answers
      expect(classifyIntent('what is the meaning of life?', pig).intent).toBe('question_generic');
      expect(classifyIntent('what is 9 plus what?', pig).intent).toBe('question_generic');
      expect(classifyIntent("what's up", pig).intent).toBe('whats_up');
      expect(classifyIntent('what time is it?', pig).intent).toBe('ask_time');
    }
    expect(classifyIntent('do you like math?', 'piggy-3')).toMatchObject({ intent: 'passion_p3', topic: 'math' });
    expect(classifyIntent('can you help me with calculus', 'piggy-3')).toMatchObject({ intent: 'passion_p3', topic: 'math' });
    expect(classifyIntent('teach me a math trick!', 'piggy-3')).toMatchObject({ intent: 'passion_p3', topic: 'mathtrick' });
    expect(classifyIntent('i have 3 exams', 'piggy-1').intent).toBe('exam_stress');
    expect(classifyIntent('the gators won 35 - 28', 'piggy-1').intent).toBe('gators_football');
  });

  test('scores, sizes, dates, odds, times and a sum with talk around it keep what they were: never arithmetic', () => {
    for (const pig of PIG_IDS) {
      for (const text of NOT_SUMS) {
        const r = classifyIntent(text, pig);
        expect([pig, text, r.intent === 'arithmetic', r.math]).toEqual([pig, text, false, undefined]);
      }
    }
  });

  test('a greeting stays a lead-in to the answer', () => {
    const r = classifyIntent('hi! what is 8 times 7?', 'piggy-1');
    expect(r).toMatchObject({ intent: 'arithmetic', runnerUp: { intent: 'greeting' } });
    expect(r.math?.answer).toBe('56');
  });

  test('a sum is not a topic to follow up on', () => {
    const hist: ChatTurn[] = [{ role: 'player', text: "what's 7 times 8?", at: 1 }, { role: 'pig', text: '56!', at: 2 }];
    for (const pig of PIG_IDS) {
      const why = ask(pig, 'why?', hist).text;
      expect([pig, ...['arithmetic', 'arithmetic:meme', 'arithmetic:zero', 'arithmetic:approx'].map((k) => pool(pig, k).some((l) => why.includes(l.split('{')[0].trim()) && l.split('{')[0].trim().length > 12))])
        .toEqual([pig, false, false, false, false]);
    }
  });
});

describe('every pig answers the sum, in his own voice', () => {
  test('the reply is a line from his pool, filled in with the answer computed in code', () => {
    for (const pig of PIG_IDS) {
      for (const [text, , answer, kind] of SUMS) {
        const r = ask(pig, text);
        const lines = [...saysTo(pig, keyFor(kind), text), ...(kind === 'meme' ? saysTo(pig, 'arithmetic', text) : [])];
        expect([pig, text, isOneOf(r.text, lines)]).toEqual([pig, text, true]);
        if (answer) expect([pig, text, r.text.includes(answer)]).toEqual([pig, text, true]);
        expect(r.source).toBe('heuristic');
        expect(EXPRESSIONS).toContain(r.expression);
        expect(r.text).not.toMatch(/[{}]/);
        expect(r.text.length).toBeLessThanOrEqual(280);
        expect(sentenceCount(r.text)).toBeLessThanOrEqual(3);
      }
    }
  });

  test('the owner\'s case: "what\'s 9 plus 10?" is 19, no longer "I don\'t actually know"', () => {
    for (const pig of PIG_IDS) {
      const r = ask(pig, "what's 9 plus 10?").text;
      expect(r).toContain('19');
      const deflections = ['question_generic', 'unknown'].flatMap((k) => pool(pig, k));
      expect([pig, deflections.some((d) => r.includes(d))]).toEqual([pig, false]);
    }
  });

  test('different sums, different answers: nothing is a number in a line', () => {
    let n = 0;
    for (const pig of PIG_IDS) {
      for (let a = 2; a <= 13; a++) {
        const b = 17 - a;
        for (const [sign, words, f] of [['+', 'plus', (x: number, y: number) => x + y], ['*', 'times', (x: number, y: number) => x * y], ['-', 'minus', (x: number, y: number) => x - y]] as const) {
          const text = a === 9 && b === 8 ? 'what is 9 + 8' : `what is ${a} ${sign} ${b}?`;
          const value = f(a, b);
          const r = ask(pig, text).text;
          const said = value < 0 ? `negative ${-value}` : String(value);
          expect([pig, text, r.includes(said), r.includes(`${a} ${words} ${b}`) || !/\{expr\}/.test(r)]).toEqual([pig, text, true, true]);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  test('the pools: enough lines, every line a number-free line with {answer}, {expr} or neither as the case needs', () => {
    const digits = (t: string) => t.replace(/\{[a-z_|]+\}/g, '').replace(/Piggy [123]/g, '').match(/\d+/g) ?? [];
    for (const pig of PIG_IDS) {
      const bank = LINES[pig].chat;
      // 9+ untiered lines: more than the 8 he remembers saying, so a run of sums never runs a pool dry
      expect([pig, (bank.arithmetic ?? []).filter((l) => !l[2]?.tier).length >= 9]).toEqual([pig, true]);
      expect([pig, (bank['arithmetic:meme'] ?? []).length >= (pig === 'piggy-3' ? 5 : 3)]).toEqual([pig, true]);
      expect([pig, (bank['arithmetic:zero'] ?? []).length >= 4, (bank['arithmetic:approx'] ?? []).length >= 4]).toEqual([pig, true, true]);
      for (const key of ['arithmetic', 'arithmetic:meme', 'arithmetic:zero', 'arithmetic:approx']) {
        for (const t of pool(pig, key)) {
          const where = `${pig} ${key}: ${t}`;
          expect([where, placeholdersIn(t).every((p) => KNOWN_PLACEHOLDERS.has(p.key) && !p.fallback)]).toEqual([where, true]);
          const needsAnswer = key !== 'arithmetic:zero';
          expect([where, /\{answer\}/.test(t)]).toEqual([where, needsAnswer]);
          // the only number a line may carry is the meme's 21
          expect([where, digits(t).every((d) => key === 'arithmetic:meme' && d === '21')]).toEqual([where, true]);
          // what the post-filter would eat: "19. …" (a bullet) and "-2" (a leading dash)
          expect([where, /^\{answer\}[.)]|^[-.,;:—–]/.test(t)]).toEqual([where, false]);
          expect([where, /mathnasium/i.test(t)]).toEqual([where, false]);
        }
      }
      for (const t of pool(pig, 'arithmetic:meme')) expect([pig, t, /\b21\b/.test(t)]).toEqual([pig, t, true]);
      for (const t of pool(pig, 'arithmetic:approx')) expect([pig, t, /\babout\b|\broughly\b/i.test(t)]).toEqual([pig, t, true]);
      for (const t of pool(pig, 'arithmetic:zero')) expect([pig, t, /\bzero\b|\bundefined\b/i.test(t)]).toEqual([pig, t, true]);
    }
    // {answer} and {expr} are registered placeholders
    expect(KNOWN_PLACEHOLDERS.has('answer')).toBe(true);
    expect(KNOWN_PLACEHOLDERS.has('expr')).toBe(true);
  });

  test("Piggy 1 is sunny and sporty, Piggy 2 deadpan, Piggy 3 the math tutor", () => {
    const all = (pig: PigId) => LINES[pig].chat.arithmetic.map((l) => l[1]);
    // Piggy 1: exclamation marks, volleyball, the stat sheet, "teammate"
    expect(all('piggy-1')).toContain("{answer}! That's a solid serve count.");
    expect(all('piggy-1').filter((t) => t.includes('!')).length).toBeGreaterThanOrEqual(9);
    expect(all('piggy-1').some((t) => /spreadsheet|stat sheet|rally|point|kill/i.test(t))).toBe(true);
    // Piggy 2: short level sentences, "Based." / "Patriot.", vitals
    expect(all('piggy-2')).toContain("It's {answer}. Vitals of the equation: stable. Based.");
    expect(all('piggy-2').filter((t) => /\b(?:Based|Patriot)\./.test(t)).length).toBeGreaterThanOrEqual(3);
    expect(all('piggy-2').some((t) => /\bvital|chart|dosage/i.test(t))).toBe(true);
    // Piggy 3: the tutor, "one clear example first, then the rule"
    expect(all('piggy-3').some((t) => /one clear example first, then the rule/i.test(t))).toBe(true);
    expect(all('piggy-3').filter((t) => /\btutor/i.test(t)).length).toBeGreaterThanOrEqual(2);
    for (const pig of PIG_IDS) for (const key of ['arithmetic', 'arithmetic:meme', 'arithmetic:zero', 'arithmetic:approx']) {
      for (const [e] of LINES[pig].chat[key]) expect(EXPRESSIONS).toContain(e);
    }
  });
});

describe('9 + 10 and the "21" meme', () => {
  const MEME_WORDINGS = [
    "what's 9 plus 10?", '9+10', '10 + 9', 'nine plus ten', 'ten plus nine', 'what is 9 + 10', '9 plus 10 = 21', 'whats 10 plus 9??',
    'quick math: 9 + 10', '9.0 + 10', 'WHAT IS NINE PLUS TEN', 'hey! what is 9 plus 10?', '9 + 10 = ?', 'how much is 10 plus 9',
  ];

  test("Piggy 3 says 19 and jokes about 21, whatever the wording and whichever line he picks", () => {
    const lines = pool('piggy-3', 'arithmetic:meme');
    expect(lines.length).toBeGreaterThanOrEqual(5);
    for (const t of lines) expect([t, /\{answer\}/.test(t), /\b21\b/.test(t)]).toEqual([t, true, true]);
    expect(lines.filter((t) => /internet|meme|X\.com/i.test(t)).length).toBeGreaterThanOrEqual(5);
    expect(lines).toContain("Oh, it's {answer}! …But if you're asking the internet, it's 21.");
    const seen = new Set<string>();
    for (const text of MEME_WORDINGS) {
      for (let k = 0; k < 8; k++) {
        const hist: ChatTurn[] = Array.from({ length: k }, (_, i) => ({ role: 'player' as const, text: `hi ${i}`, at: i }));
        const r = ask('piggy-3', text, hist).text;
        expect([text, k, /\b19\b/.test(r), /\b21\b/.test(r)]).toEqual([text, k, true, true]);
        expect([text, k, isOneOf(r, saysTo('piggy-3', 'arithmetic:meme', '9+10'))]).toEqual([text, k, true]);
        seen.add(r);
      }
    }
    // not one canned line
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  test('Piggy 1 and Piggy 2 nod to it lightly, with the real answer first', () => {
    for (const pig of ['piggy-1', 'piggy-2'] as const) {
      expect(pool(pig, 'arithmetic:meme').length).toBeGreaterThanOrEqual(3);
      for (const text of MEME_WORDINGS) {
        const r = ask(pig, text).text;
        expect([pig, text, /\b19\b/.test(r), /\b21\b/.test(r)]).toEqual([pig, text, true, true]);
        // the answer comes before the joke
        expect([pig, text, r.indexOf('19') < r.indexOf('21')]).toEqual([pig, text, true]);
      }
    }
    expect(ask('piggy-2', '9+10').text).toMatch(/Based|Patriot|clinical|physician|treat/);
  });

  test('only exactly 9 + 10: 10 + 11 is a plain 21, with no joke about it', () => {
    for (const pig of PIG_IDS) {
      for (const text of ['10 plus 11', '19 + 2', '9 + 11', '9 times 10', '9 - 10', '10 + 10']) {
        const r = ask(pig, text).text;
        expect([pig, text, isOneOf(r, saysTo(pig, 'arithmetic', text)), isOneOf(r, saysTo(pig, 'arithmetic:meme', '9+10'))]).toEqual([pig, text, true, false]);
        expect([pig, text, /internet|meme|\b21 thing\b/i.test(r)]).toEqual([pig, text, false]);
      }
    }
  });

  test('when the joke lines are all used up, the plain answer is still given', () => {
    const hist: ChatTurn[] = [];
    for (let i = 0; i < 6; i++) {
      const r = ask('piggy-1', i % 2 ? '9+10' : '10 + 9', hist);
      expect(r.text).toContain('19');
      hist.push({ role: 'player', text: i % 2 ? '9+10' : '10 + 9', at: i * 2 }, { role: 'pig', text: r.text, at: i * 2 + 1 });
    }
  });
});

describe('division', () => {
  test('even and uneven: the answer to two decimals, and an "about" when it is rounded', () => {
    for (const pig of PIG_IDS) {
      expect([pig, ask(pig, '10 divided by 4').text.includes('2.5')]).toEqual([pig, true]);
      expect([pig, ask(pig, "what's 100 / 8?").text.includes('12.5')]).toEqual([pig, true]);
      const rounded = ask(pig, "what's 10 divided by 3?").text;
      expect([pig, rounded.includes('3.33'), /\babout\b|\broughly\b/i.test(rounded)]).toEqual([pig, true, true]);
      expect(pool(pig, 'arithmetic:approx').length).toBeGreaterThanOrEqual(4);
      const two = ask(pig, '2 divided by 3').text;
      expect([pig, two.includes('0.67'), /\babout\b|\broughly\b/i.test(two)]).toEqual([pig, true, true]);
      // an even answer is not "about"
      expect([pig, isOneOf(ask(pig, '10 divided by 4').text, saysTo(pig, 'arithmetic', '10 divided by 4'))]).toEqual([pig, true]);
    }
  });

  test('by zero: an in-voice joke, no answer, no Infinity or NaN as an answer', () => {
    const lines: Record<PigId, RegExp> = {
      'piggy-1': /net|whistle|team|court|compiler|program|trick question/i,
      'piggy-2': /undefined|patient|denominator|follow-up|calculator/i,
      'piggy-3': /undefined|cookies|exception|classic|infinity/i,
    };
    for (const pig of PIG_IDS) {
      for (const text of ['5 divided by 0', "what's 7 / 0?", 'ten over zero', '0 / 0', 'quick math: 12 divided by 0']) {
        const r = ask(pig, text).text;
        expect([pig, text, isOneOf(r, saysTo(pig, 'arithmetic:zero', text)), lines[pig].test(r)]).toEqual([pig, text, true, true]);
        expect([pig, text, /\bNaN\b|\bundefined\b.*\bundefined\b\.\.\./.test(r)]).toEqual([pig, text, false]);
      }
    }
  });
});

describe('what the player reads: through the post-filter, a long run of sums, tiers and moods', () => {
  test('every line survives the chat post-filter as written, for any answer (no eaten "19." bullet, no lost "-")', () => {
    const answers = ['19', 'negative 2', '3.5', '0', '25,000', '0.33', 'negative 0.13', '999,999,998,000,000,001.998001', '100'];
    const exprs = ['9 plus 10', 'negative 3 times 4', '10 divided by 3', '1,250 minus 0.5', '5 divided by 0'];
    for (const pig of PIG_IDS) {
      for (const key of ['arithmetic', 'arithmetic:meme', 'arithmetic:zero', 'arithmetic:approx']) {
        for (const t of pool(pig, key)) {
          for (const answer of answers) {
            for (const expr of exprs) {
              const text = fill(t, { ...buildVars(pig, ctx(pig)), answer: key === 'arithmetic:zero' ? undefined : answer, expr });
              if (text === null) continue;
              const shown = postfilter(text, { pig, pigName: CHARACTERS[pig].name, light: true });
              expect([pig, key, text, shown]).toEqual([pig, key, text, text]);
            }
          }
        }
      }
    }
  });

  test('a run of different sums: always the right answer, never a deflection, never the same line (with other numbers) within 8', () => {
    const SUMS_RUN: [string, string][] = [
      ['2+2', '4'], ['3 times 4', '12'], ['what is 15 minus 6?', '9'], ['7 + 8', '15'], ['6 * 7', '42'], ['20 divided by 4', '5'],
      ['how much is 11 plus 12', '23'], ['5 x 5', '25'], ['100 - 1', '99'], ['12 + 12', '24'], ['nine times nine', '81'],
      ["what's 30 minus 7?", '23'], ['4 + 4', '8'], ['8 times 8', '64'], ['50 / 2', '25'], ['13 + 14', '27'], ['70 - 20', '50'],
      ['3 * 3', '9'], ['16 + 17', '33'], ['90 divided by 3', '30'], ['6 + 5', '11'], ['2 times 2', '4'], ['60 minus 15', '45'], ['1 + 2', '3'],
    ];
    for (const pig of PIG_IDS) {
      const bank = LINES[pig].chat;
      const deflections = new Set(['question_generic', 'unknown', 'repeat'].flatMap((k) => (bank[k] ?? []).map((l) => l[1])));
      const history: ChatTurn[] = [];
      const used: number[] = [];
      SUMS_RUN.forEach(([text, answer], i) => {
        const r = ask(pig, text, history);
        expect([pig, text, r.text.includes(answer)]).toEqual([pig, text, true]);
        expect([pig, text, deflections.has(r.text)]).toEqual([pig, text, false]);
        // which line of his pool it was (the numbers differ every time, so compare the line, not the text)
        const lines = saysTo(pig, 'arithmetic', text);
        const at = lines.indexOf(r.text);
        expect([pig, text, at >= 0]).toEqual([pig, text, true]);
        const template = pool(pig, 'arithmetic').findIndex((t) => fill(t, { ...buildVars(pig, ctx(pig)), answer, expr: parseArithmetic(text)!.expr }) === r.text);
        expect([pig, text, used.slice(-8).includes(template)]).toEqual([pig, text, false]);
        used.push(template);
        history.push({ role: 'player', text, at: i * 2 }, { role: 'pig', text: r.text, at: i * 2 + 1 });
      });
    }
  });

  test('every bond tier, mood and need state: the answer is there, in a well-formed reply', () => {
    const states: Partial<ChatContext>[] = [
      { bondLevel: 0, playerName: '' }, { bondLevel: 4 }, { bondLevel: 9, mood: 'great' },
      { bondLevel: 5, sick: true, needs: { hunger: 20, energy: 20, hygiene: 20, fun: 20 }, mood: 'low' },
      { bondLevel: 2, needs: { hunger: 95, energy: 90, hygiene: 90, fun: 90 } },
      { bondLevel: 3, needs: { hunger: 10, energy: 80, hygiene: 80, fun: 80 } },
    ];
    for (const pig of PIG_IDS) {
      for (const state of states) {
        for (const [text, , answer, kind] of SUMS.filter(([, , a]) => a || true)) {
          const r = ask(pig, text, [], state);
          expect([pig, text, answer ? r.text.includes(answer) : true]).toEqual([pig, text, true]);
          expect(r.text).not.toMatch(/[{}]/);
          expect(r.text.length).toBeLessThanOrEqual(280);
          expect(sentenceCount(r.text)).toBeLessThanOrEqual(3);
          expect(EXPRESSIONS).toContain(r.expression);
          if (kind === 'zero') expect([pig, text, /zero|undefined/i.test(r.text)]).toEqual([pig, text, true]);
        }
      }
    }
  });

  test('a greeting before the sum is answered first, then the sum', () => {
    for (const pig of PIG_IDS) {
      const r = ask(pig, 'hi! what is 8 times 7?').text;
      const leads = pool(pig, 'lead:greeting');
      expect([pig, leads.some((l) => r.startsWith(`${l} `)), r.includes('56')]).toEqual([pig, true, true]);
    }
  });

  test('the same sum twice in a row gets the playful "you said that already", other sums do not', () => {
    for (const pig of PIG_IDS) {
      const first = ask(pig, 'what is 6 times 7?');
      const hist: ChatTurn[] = [{ role: 'player', text: 'what is 6 times 7?', at: 1 }, { role: 'pig', text: first.text, at: 2 }];
      expect([pig, pool(pig, 'repeat').includes(ask(pig, 'What is 6 times 7??', hist).text)]).toEqual([pig, true]);
      const next = ask(pig, 'what is 6 times 8?', hist).text;
      expect([pig, next.includes('48'), pool(pig, 'repeat').includes(next)]).toEqual([pig, true, false]);
    }
  });

  test('"why?" and "tell me more" after a sum do not re-answer it', () => {
    for (const pig of PIG_IDS) {
      const first = ask(pig, 'what is 6 times 7?');
      const hist: ChatTurn[] = [{ role: 'player', text: 'what is 6 times 7?', at: 1 }, { role: 'pig', text: first.text, at: 2 }];
      for (const text of ['why?', 'tell me more', 'really?']) {
        const r = ask(pig, text, hist);
        expect([pig, text, r.text.includes('42'), r.text.includes('6 times 7')]).toEqual([pig, text, false, false]);
        expect(r.text.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
