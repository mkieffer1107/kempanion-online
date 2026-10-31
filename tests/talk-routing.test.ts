// Talk quick replies and where they go. Piggy 3's chips are about him (X, math, AI words, coding agents, EEG, medical AI,
// robots, One Piece, his drink, physics, HiPerGator), Piggy 1 and Piggy 2 have eight new ones each, and
// six are shared. The chat box shows only 3 rows, so the rotation's order is the design. Each chip routes to its own
// answer topic for every pig (never a generic question or an unknown), and the plain talk around the new words keeps
// its old answer. The answer pools themselves live in the line banks (lines/piggy*.ts); this file pins the routing.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { PIG_IDS, type ChatContext, type ChatTurn, type PigId } from '../src/lib/types';
import { classifyIntent, respondHeuristic, suggestTopics } from '../src/lib/ai/heuristic';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { buildVars, lastTopic, topicLabel } from '../src/lib/ai/heuristic/respond';
import { fill } from '../src/lib/ai/heuristic/template';
import { SHARED_CHIPS, X_CHIP } from '../src/lib/ai/heuristic/topics';
import { X_CORRECTIONS } from '../src/lib/ai/heuristic/mumble';
import { matchQuirk } from '../src/lib/ai/quirks';
import { fallbackChips, topicMatch } from '../src/lib/ai/topics';
import { exchangeEffects } from '../src/lib/ai';
import { systemPrompt } from '../src/lib/ai/prompts';
import { MODEL_IDS } from '../src/lib/ai/models';
import { replyRows } from '../src/lib/vn/components/chat-choices';
import { setClockOffset } from '../src/lib/state/clock';

// Fixed game clock: Tuesday 2026-10-27, 3:42 PM local (no Pig Pen Friday, no Gator Saturday).
const TUESDAY = '2026-10-27T15:42:00';
const at = (iso: string) => setClockOffset(Date.parse(iso) - Date.now());
beforeAll(() => at(TUESDAY));
afterAll(() => setClockOffset(0));

function ctx(pig: PigId, over: Partial<ChatContext> = {}): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Tue 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [], ...over,
  };
}
const pad = (k: number): ChatTurn[] => Array.from({ length: k }, (_, i) => ({ role: 'player' as const, text: `hi ${i}`, at: i }));
/** A chat log of k turns, the pig answering "Okay." */
const talk = (k: number, pigSays = 'Okay.'): ChatTurn[] =>
  Array.from({ length: k }, (_, i) => ({ role: i % 2 ? ('pig' as const) : ('player' as const), text: i % 2 ? pigSays : `hi ${i}`, at: i }));
const route = (pig: PigId, text: string) => {
  const r = classifyIntent(text, pig);
  return `${r.intent}${r.topic ? ':' + r.topic : ''}`;
};
const pool = (pig: PigId, key: string) => (LINES[pig].chat[key] ?? []).map((l) => l[1]);

/** Piggy 3's chips and the topic each is answered from (the quirks answer three of them first: see below). */
const P3_CHIPS: Record<string, string> = {
  'Are you on X?': 'passion_p3:x', 'Are you on Twitter?': 'passion_p3:twitter', 'Teach me a math trick!': 'passion_p3:mathtrick',
  'Were you a math tutor?': 'ask_about_self:job', 'What even is an LLM?': 'passion_p3:llm', 'Have you used Codex?': 'passion_p3:codex',
  'What does an EEG show?': 'passion_p3:eeg', "What's medical AI?": 'passion_p3:medai', 'Would you build a robot?': 'passion_p3:robots',
  'One Piece or JoJo?': 'passion_p3:opvsjojo', 'Why sugar-free Red Bull?': 'ask_favorite_food:red_bull_sf',
  'Favorite physics fact?': 'passion_p3:physics', "What's HiPerGator?": 'passion_p3:hipergator',
};
/** chip → topic, for the pig that offers it */
const OWN: Record<'piggy-1' | 'piggy-2', Record<string, string>> = {
  'piggy-1': {
    'What was Germany like?': 'passion_p1:germany', 'Say something in German!': 'passion_p1:german',
    'Haikyu!! fave character?': 'passion_p1:haikyu', 'Sand or indoor?': 'passion_p1:sand', 'Can I join your team?': 'passion_p1:team',
    'Volleyball lingo?': 'passion_p1:calls', 'Favorite algorithm?': 'passion_p1:algorithm', "Best bug you've fixed?": 'passion_p1:bug',
  },
  'piggy-2': {
    'Want my old stethoscope?': 'passion_p2:donation', "What's a research year?": 'passion_p2:research_year',
    'Do you miss the OR?': 'passion_p2:or', 'Why neurosurgery?': 'passion_p2:why', 'Favorite cranial nerve?': 'passion_p2:nerves',
    "Who's Professor Snout?": 'passion_p2:snout', 'Fireworks fan?': 'ask_about_self:july4', 'Am I based?': 'based:rate',
  },
};
const SHARED: Record<(typeof SHARED_CHIPS)[number], string> = {
  'Hype me up!': 'encourage:hype', 'Early bird or night owl?': 'ask_about_self:chronotype', 'Teach me something!': 'study:teach',
  "What's your dream?": 'ask_about_self:dream', 'What are you watching?': 'ask_hobby:shows', 'Are you competitive?': 'ask_about_self:competitive',
};
const X_ASKS = { 'Are you on X?': 'passion_p3:x', 'Are you on Twitter?': 'passion_p3:twitter' };

const PLACES = ['plaza', 'physics', 'marston', 'lake_alice', 'volleyball_courts', 'malachowsky', 'shands', 'communicore', 'anatomy_lab', 'dorm'] as const;

describe('every chip routes to its own topic', () => {
  test("Piggy 3's chips: each to its own topic; X, Twitter and Codex are his quirks first (any brain)", () => {
    for (const [chip, key] of Object.entries(P3_CHIPS)) expect([chip, route('piggy-3', chip)]).toEqual([chip, key]);
    expect(matchQuirk({ pig: 'piggy-3', playerText: 'Are you on X?', history: [] })?.reply.effect).toBe('mumble');
    expect(matchQuirk({ pig: 'piggy-3', playerText: 'Are you on Twitter?', history: [] })?.reply.text).toBe(X_CORRECTIONS[0][0]);
    expect(matchQuirk({ pig: 'piggy-3', playerText: 'Have you used Codex?', history: [] })?.kind).toBe('hard');
    for (const chip of Object.keys(P3_CHIPS)) {
      if (['Are you on X?', 'Are you on Twitter?', 'Have you used Codex?'].includes(chip)) continue;
      expect([chip, matchQuirk({ pig: 'piggy-3', playerText: chip, history: [] })]).toEqual([chip, null]);
    }
    // the typed decoders after a mumble ("what's RLHF?")
    const decoders: [string, string][] = [
      ["what's RLHF?", 'passion_p3:rlhf'], ['what is rlvr', 'passion_p3:rlvr'], ['who is jev?', 'passion_p3:jev'],
      ['what is a foundation model?', 'passion_p3:foundation'], ['how do llms work?', 'passion_p3:llm'], ['fhir?', 'passion_p3:medai'],
      ['tell me about robotics', 'passion_p3:robots'], ['any mental math tricks?', 'passion_p3:mathtrick'],
    ];
    for (const [t, key] of decoders) expect([t, route('piggy-3', t)]).toEqual([t, key]);
  });

  test("Piggy 1's, Piggy 2's, the shared and the X chips land on their intent and topic, for every pig", () => {
    const all: Record<string, string> = { ...OWN['piggy-1'], ...OWN['piggy-2'], ...SHARED, ...X_ASKS };
    for (const pig of PIG_IDS) for (const [chip, key] of Object.entries(all)) expect([pig, chip, route(pig, chip)]).toEqual([pig, chip, key]);
    // Piggy 3's EEG chip: Piggy 2 hears his electrodes, Piggy 1 asks Piggy 3's question (his line about the headband)
    expect(route('piggy-2', 'What does an EEG show?')).toBe('passion_p2:electrodes');
    expect(route('piggy-1', 'What does an EEG show?')).toBe('passion_p3:eeg');
  });

  test('other ways of asking the same things', () => {
    const asks: [string, string][] = [
      ['do you miss germany?', 'passion_p1:germany'], ['guten tag!', 'passion_p1:german'], ['do you speak german?', 'passion_p1:german'],
      ['who is your favorite haikyuu character?', 'passion_p1:haikyu'], ['i love sand volleyball', 'passion_p1:sand'],
      ['can i come to practice?', 'passion_p1:team'], ['tryouts?', 'passion_p1:team'], ["what's a pancake?", 'passion_p1:calls'],
      ['what does free ball mean?', 'passion_p1:calls'], ['binary search!', 'passion_p1:algorithm'], ["what's the weirdest bug you've seen?", 'passion_p1:bug'],
      ['do you want my old monitor?', 'passion_p2:donation'], ['i brought you an old stethoscope', 'passion_p2:donation'],
      ['how is your research year?', 'passion_p2:research_year'], ['do you still do surgery?', 'passion_p2:or'],
      ['why did you become a surgeon?', 'passion_p2:why'], ['vagus nerve', 'passion_p2:nerves'], ['professor snout', 'passion_p2:snout'],
      ['do you like fireworks?', 'ask_about_self:july4'], ['is your birthday july 4th?', 'ask_about_self:july4'], ['how based am i?', 'based:rate'],
      ['do you use twitter?', 'passion_p3:twitter'], ['did you see that tweet?', 'passion_p3:twitter'], ['x.com', 'passion_p3:x'],
      ['are you on x or twitter?', 'passion_p3:twitter'], ['do you use x?', 'passion_p3:x'], ["what's on your timeline?", 'passion_p3:x'],
      ['i saw it on x', 'passion_p3:x'], ['doomscrolling again?', 'passion_p3:x'], ["how's the timeline today?", 'passion_p3:x'],
      ['hype me', 'encourage:hype'], ['i need a pep talk', 'encourage:hype'], ['are you a morning person?', 'ask_about_self:chronotype'],
      ['tell me something cool', 'study:teach'], ['fun facts about pigs', 'study:teach'], ['where do you see yourself in 5 years?', 'ask_about_self:dream'],
      ['what should we watch?', 'ask_hobby:shows'], ['how competitive are you?', 'ask_about_self:competitive'], ['are you a sore loser?', 'ask_about_self:competitive'],
    ];
    for (const pig of PIG_IDS) for (const [t, key] of asks) expect([pig, t, route(pig, t)]).toEqual([pig, t, key]);
  });

  test('plain talk around the new words keeps its old answer', () => {
    // what the rules said before (the routes the older tests and everyday words relied on)
    const keep: [string, string][] = [
      ['i found an old stethoscope', 'passion_p2:collection'], ['got any expired medical equipment?', 'passion_p2:collection'],
      ['do you collect anything?', 'passion_p2:collection'], ['what pgy are you?', 'ask_major'], ['are you pgy 4?', 'ask_major'],
      ['are you a researcher?', 'ask_major'], ['are you a real doctor?', 'ask_major'],
      ['when is your birthday?', 'ask_about_self:birthday'], ["i'm from germany", 'share_self:hometown'], ['my major is german', 'share_self:major'],
      ['i study german', 'share_self:major'], ['haikyu or one piece?', 'passion_p3:onepiece'], ['one piece or jojo?', 'passion_p3:opvsjojo'],
      ['sweet dreams', 'farewell'], ['i had a weird dream', 'unknown'], ['cheer me up', 'unknown'], ["i'm sad, cheer me up", 'player_sad'],
      ["i'm stressed about my exam, give me a pep talk", 'exam_stress'], ['no pep talk right now', 'no'],
      ["what's your goal for today?", 'question_generic'], ['what time do you wake up?', 'ask_schedule'],
      ['teach me to serve', 'passion_p1:volleyball'], ['tell me about yourself', 'ask_about_self'], ['my code is buggy', 'passion_p1:cs'],
      ['i fixed a bug', 'passion_p1:cs'], ['i love pancakes', 'ask_favorite_food:generic'], ['solve for x', 'unknown'],
      ['what is x?', 'question_generic'], ['x ray', 'unknown'], ['focus on x', 'study'], ['are you on instagram?', 'question_generic'],
      ['are you on call?', 'question_generic'], ['do you miss the orange juice?', 'food_offer:florida_oj'], ['can i join you?', 'question_generic'],
      ['can i join your lab?', 'question_generic'], ['beach volleyball', 'passion_p1:volleyball'], ['indoor volleyball', 'passion_p1:volleyball'],
      ["let's go to the sand courts", 'campus_place:volleyball_courts'], ['favorite anime?', 'passion_p3:anime'], ['favorite movie?', 'question_generic'],
    ];
    for (const pig of ['piggy-1', 'piggy-2'] as const) for (const [t, key] of keep) expect([pig, t, route(pig, t)]).toEqual([pig, t, key]);
    // never X: the letter, a project's timeline, the player's own doomscrolling, other apps
    const notX = [
      'solve for x', 'x ray', 'the x axis', 'focus on x', 'it depends on x', '2 x 3', 'spacex', 'malcolm x', 'the x files', 'x men',
      'generation x', 'do you have an xbox', 'are you on xanax', 'i was doomscrolling all night', 'the timeline is tight',
      "what's your timeline for finishing?", 'are you on call?', 'are you on instagram?',
    ];
    for (const pig of PIG_IDS) for (const t of notX) expect([pig, t, classifyIntent(t, pig).topic === 'x']).toEqual([pig, t, false]);
    // his other words keep theirs too
    const p3keep: [PigId, string, string][] = [
      ['piggy-3', 'tell me about eeg', 'passion_p3:signals'], ['piggy-2', 'What does an EEG show?', 'passion_p2:electrodes'],
      ['piggy-3', 'are you a robot?', 'ask_about_self:what'], ['piggy-3', 'want a red bull?', 'food_offer:red_bull_sf'],
      ['piggy-3', 'do you like red bull?', 'ask_favorite_food:red_bull_sf'], ['piggy-3', "what's your favorite drink?", 'ask_favorite_food:drink'],
      ['piggy-3', 'were you a math tutor?', 'ask_about_self:job'], ['piggy-3', 'did you ever have a job?', 'ask_about_self:job'],
      ['piggy-3', 'do you like math?', 'passion_p3:math'], ['piggy-3', 'what are you building?', 'passion_p3:building'],
      ['piggy-3', "what's the best ai model?", 'ask_best'],
    ];
    for (const [pig, t, key] of p3keep) expect([pig, t, route(pig, t)]).toEqual([pig, t, key]);
  });
});

describe('the chat box (3 rows)', () => {
  test('every chip any pig can be offered is short and understood: a real answer, never unknown or a generic question', () => {
    for (const pig of PIG_IDS) {
      const chips = new Set<string>();
      for (let day = 1; day <= 7; day++) {
        at(`2026-11-${String(day).padStart(2, '0')}T${String(8 + day * 2).padStart(2, '0')}:42:00`);
        for (const location of PLACES) {
          for (const timeOfDay of ['morning', 'day', 'evening', 'night'] as const) {
            for (let k = 0; k < 12; k++) for (const c of suggestTopics(pig, ctx(pig, { location, timeOfDay }), talk(k, 'Based. Okay.'))) chips.add(c);
          }
        }
      }
      at(TUESDAY);
      const c0 = ctx(pig);
      const vars = buildVars(pig, c0);
      const bank = LINES[pig].chat;
      const fallback = new Set(['question_generic', 'unknown', 'repeat'].flatMap((k) => (bank[k] ?? []).map((l) => fill(l[1], vars))));
      for (const chip of chips) {
        expect([pig, chip, chip.length <= 26]).toEqual([pig, chip, true]);
        const hit = matchQuirk({ pig, playerText: chip, history: [] });
        if (hit) {
          expect([pig, chip, hit.safety]).toEqual([pig, chip, false]);
          continue;
        }
        expect([pig, chip, ['unknown', 'question_generic'].includes(classifyIntent(chip, pig).intent)]).toEqual([pig, chip, false]);
        const text = respondHeuristic({ pig, playerText: chip, history: [], context: c0 }).text;
        expect([pig, chip, fallback.has(text)]).toEqual([pig, chip, false]);
      }
    }
  });

  test('Piggy 3: every chip comes up within 14 days, and "Are you on X?" leads until he has been asked about X', () => {
    const before = new Map<string, number>();
    const after = new Map<string, number>();
    const asked: ChatTurn[] = [{ role: 'player', text: "what's on your timeline?", at: 0 }, { role: 'pig', text: 'Okay.', at: 1 }];
    for (let day = 1; day <= 14; day++) {
      at(`2026-11-${String(day).padStart(2, '0')}T15:42:00`);
      for (let h = 0; h < 24; h++) {
        for (const c of replyRows(suggestTopics('piggy-3', ctx('piggy-3'), pad(h)))) before.set(c, (before.get(c) ?? 0) + 1);
        for (const c of replyRows(suggestTopics('piggy-3', ctx('piggy-3'), [...asked, ...pad(h)]))) after.set(c, (after.get(c) ?? 0) + 1);
      }
    }
    at(TUESDAY);
    for (const chip of Object.keys(P3_CHIPS)) expect([chip, (before.get(chip) ?? 0) > 0]).toEqual([chip, true]);
    const x = before.get(X_CHIP) ?? 0;
    for (const chip of Object.keys(P3_CHIPS)) if (chip !== X_CHIP) expect([chip, x > 2 * (before.get(chip) ?? 0)]).toEqual([chip, true]);
    // once he has been asked (here: "what's on your timeline?"), X is one chip among the others
    expect(after.get(X_CHIP) ?? 0).toBeLessThan(x / 3);
    for (const chip of Object.keys(P3_CHIPS)) expect([chip, (after.get(chip) ?? 0) > 0]).toEqual([chip, true]);
    expect([...before.keys(), ...after.keys()].some((chip) => /birthday/i.test(chip))).toBe(false);
  });

  test('right after the "Twitter" correction, "Are you on X?" is the first chip (Piggy 3 only)', () => {
    for (const asked of ['Are you on Twitter?', 'do you tweet?', 'i saw it on twitter lol', 'twitter is dead']) {
      for (let k = 0; k < 6; k++) {
        const hist: ChatTurn[] = [...talk(k * 2), { role: 'player', text: asked, at: 100 }, { role: 'pig', text: X_CORRECTIONS[0][0], at: 101 }];
        expect([asked, k, suggestTopics('piggy-3', ctx('piggy-3'), hist)[0]]).toEqual([asked, k, X_CHIP]);
      }
    }
    // only after Twitter, and only for him
    const other: ChatTurn[] = [{ role: 'player', text: 'What does an EEG show?', at: 1 }, { role: 'pig', text: 'Rhythms.', at: 2 }];
    let first = 0;
    for (let k = 0; k < 20; k++) if (suggestTopics('piggy-3', ctx('piggy-3'), [...pad(k), ...other])[0] === X_CHIP) first++;
    expect(first).toBeLessThan(20);
    const hist: ChatTurn[] = [{ role: 'player', text: 'Are you on Twitter?', at: 1 }, { role: 'pig', text: 'Hm.', at: 2 }];
    expect(suggestTopics('piggy-1', ctx('piggy-1'), hist)[0]).not.toBe(X_CHIP);
    expect(suggestTopics('piggy-2', ctx('piggy-2'), hist)[0]).not.toBe(X_CHIP);
  });

  test('the new chips are among the 3 rows most turns, for every pig, and every one of them comes up', () => {
    const NEW = new Set<string>([...Object.keys(OWN['piggy-1']), ...Object.keys(OWN['piggy-2']), ...SHARED_CHIPS, ...Object.keys(X_ASKS)]);
    for (const pig of PIG_IDS) {
      const seen = new Set<string>();
      let withNew = 0;
      for (let k = 0; k < 60; k++) {
        const shown = replyRows(suggestTopics(pig, ctx(pig), talk(k)));
        expect(shown.length).toBe(3);
        if (shown.some((c) => NEW.has(c))) withNew++;
        for (const c of shown) seen.add(c);
      }
      // Piggy 1 and Piggy 2 about three turns in four; Piggy 3 (the shared ones and his X chips) about half
      expect([pig, withNew >= (pig === 'piggy-3' ? 20 : 40)]).toEqual([pig, true]);
      if (pig !== 'piggy-3') for (const c of Object.keys(OWN[pig])) expect([pig, c, seen.has(c)]).toEqual([pig, c, true]);
      for (const c of SHARED_CHIPS) expect([pig, c, seen.has(c)]).toEqual([pig, c, true]);
    }
  });

  test('the usual chips are still around: needs first, "How are you?" / "What\'s up?", Set and Spike, based, the moment\'s own chip', () => {
    expect(suggestTopics('piggy-1', ctx('piggy-1', { needs: { hunger: 20, energy: 80, hygiene: 80, fun: 80 } }), [])).toContain('Want a snack?');
    expect(suggestTopics('piggy-3', ctx('piggy-3', { needs: { hunger: 80, energy: 20, hygiene: 80, fun: 80 } }), [])).toContain('You should rest.');
    expect(suggestTopics('piggy-2', ctx('piggy-2', { sick: true }), [])).toContain('Are you feeling okay?');
    const seen = new Set<string>();
    for (const pig of PIG_IDS) for (let k = 0; k < 60; k++) for (const c of replyRows(suggestTopics(pig, ctx(pig), pad(k)))) seen.add(c);
    for (const c of ['How are you?', "What's up?", 'Tell me a joke', 'Favorite food?', 'What do you know about me?', 'Favorite spot on campus?']) {
      expect([c, seen.has(c)]).toEqual([c, true]);
    }
    // Piggy 1's call and response, and Piggy 2's "based" while he has just said it
    expect(suggestTopics('piggy-1', ctx('piggy-1'), [{ role: 'player', text: 'bump', at: 1 }, { role: 'pig', text: 'Set!', at: 2 }])[0]).toBe('Set');
    expect(suggestTopics('piggy-1', ctx('piggy-1'), [{ role: 'player', text: 'set', at: 1 }, { role: 'pig', text: 'SPIKE!!', at: 2 }])[0]).toBe('Spike');
    const based: ChatTurn[] = [{ role: 'player', text: 'hi', at: 1 }, { role: 'pig', text: 'Hello, Alex. Vitals look good. Based.', at: 2 }];
    expect(suggestTopics('piggy-2', ctx('piggy-2'), based)).toContain('based');
    expect(suggestTopics('piggy-2', ctx('piggy-2'), [...based, ...talk(8)])).not.toContain('based');
    // a Friday lunch: Pig Pen Friday! for everyone
    at('2026-10-30T12:30:00');
    for (const pig of PIG_IDS) expect([pig, suggestTopics(pig, ctx(pig), pad(3)).includes('Pig Pen Friday!')]).toEqual([pig, true]);
    at(TUESDAY);
    // a remembered exam: a pep talk is offered now and then
    let hype = 0;
    for (let k = 0; k < 40; k++) if (suggestTopics('piggy-3', ctx('piggy-3', { memories: ['Player has an organic chemistry exam.'] }), pad(k)).includes('Hype me up!')) hype++;
    expect(hype).toBeGreaterThan(8);
  });

  test('where he is matters: at the courts Piggy 1 is asked about the team, at Shands Piggy 2 about the OR', () => {
    const courts = new Set<string>();
    const shands = new Set<string>();
    for (let k = 0; k < 60; k++) {
      replyRows(suggestTopics('piggy-1', ctx('piggy-1', { location: 'volleyball_courts' }), pad(k))).forEach((c) => courts.add(c));
      replyRows(suggestTopics('piggy-2', ctx('piggy-2', { location: 'shands' }), pad(k))).forEach((c) => shands.add(c));
    }
    for (const c of ['Sand or indoor?', 'Can I join your team?', 'Volleyball lingo?']) expect([c, courts.has(c)]).toEqual([c, true]);
    for (const c of ['Do you miss the OR?', "What's a research year?", 'Why neurosurgery?']) expect([c, shands.has(c)]).toEqual([c, true]);
  });

  test('3D printing is no longer one of his chips (he still answers it when asked)', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 7; day++) {
      at(`2026-11-${String(day).padStart(2, '0')}T15:42:00`);
      for (let k = 0; k < 24; k++) for (const c of suggestTopics('piggy-3', ctx('piggy-3'), pad(k))) seen.add(c);
    }
    at(TUESDAY);
    expect([...seen].filter((c) => /print|building\?|best ai model/i.test(c))).toEqual([]);
    // the fallback chips (only if suggestTopics ever throws) ask about X instead of a print
    const fallback = new Set<string>();
    for (let k = 0; k < 12; k++) for (const c of fallbackChips('piggy-3', ctx('piggy-3'), talk(k * 2))) fallback.add(c);
    expect(fallback.has('Are you on X?')).toBe(true);
    expect([...fallback].some((c) => /print/i.test(c))).toBe(false);
    expect(route('piggy-3', 'show me a 3d print?')).toBe('passion_p3:printing');
  });
});

describe('answers, memory and the bond bonus', () => {
  test('"Hype me up!" is answered with a pep talk or his good-news lines, never "Thanks, teammate!"', () => {
    for (const pig of PIG_IDS) {
      const wrongWay = pool(pig, 'encourage');
      expect(wrongWay.length).toBeGreaterThan(0);
      for (let k = 0; k < 12; k++) {
        const r = respondHeuristic({ pig, playerText: 'Hype me up!', history: pad(k), context: ctx(pig) }).text;
        for (const l of wrongWay) expect([pig, k, r.includes(l)]).toEqual([pig, k, false]);
      }
    }
  });

  test('he remembers the chip afterwards ("I kept thinking about Germany", "So, X.com: …")', () => {
    const labels: [PigId, string, string][] = [
      ['piggy-1', 'What was Germany like?', 'Germany'], ['piggy-1', 'Haikyu!! fave character?', 'Haikyu!!'],
      ['piggy-2', "Who's Professor Snout?", 'Professor Snout'], ['piggy-2', 'Do you miss the OR?', 'the OR'],
      ['piggy-3', 'Hype me up!', 'a pep talk'], ['piggy-3', 'Are you on X?', 'X.com'], ['piggy-3', 'i saw it on twitter', 'X.com'],
      ['piggy-3', 'Teach me a math trick!', 'math tricks'], ['piggy-3', 'What even is an LLM?', 'how LLMs work'],
      ['piggy-3', 'What does an EEG show?', 'EEG'], ['piggy-3', "What's medical AI?", 'medical AI'], ['piggy-3', 'Would you build a robot?', 'robots'],
    ];
    for (const [pig, t, label] of labels) expect([pig, t, topicLabel(classifyIntent(t, pig))]).toEqual([pig, t, label]);
    // every new chip topic has a label (none falls back to a placeholder-looking "X")
    const fresh = Object.keys(P3_CHIPS).filter((c) => !/Codex|JoJo|tutor|HiPerGator|physics|Red Bull/.test(c));
    for (const pig of PIG_IDS) {
      for (const chip of [...Object.keys(OWN['piggy-1']), ...Object.keys(OWN['piggy-2']), ...SHARED_CHIPS, ...fresh]) {
        const l = topicLabel(classifyIntent(chip, pig));
        expect([pig, chip, !!l && l !== 'X']).toEqual([pig, chip, true]);
      }
    }
  });

  test('a follow-up after "Are you on X?" stays on X ("what does that mean?" gets the longer version)', () => {
    const hist: ChatTurn[] = [{ role: 'player', text: 'Are you on X?', at: 1 }, { role: 'pig', text: 'X? Oh— yeah. …sorry. I was mumbling again.', at: 2 }];
    const last = lastTopic(hist, 'piggy-3');
    expect(last && `${last.intent}:${last.topic}`).toBe('passion_p3:x');
    expect(route('piggy-3', 'what does that mean?')).toBe('followup:more');
  });

  test("a follow-up's segue into his own passion never answers a question nobody asked", () => {
    const answerOnly: [PigId, string[]][] = [
      ['piggy-1', Object.values(OWN['piggy-1'])],
      ['piggy-2', Object.values(OWN['piggy-2']).filter((k) => k.startsWith('passion_p2'))],
      ['piggy-3', ['passion_p3:x', 'passion_p3:twitter', 'passion_p3:mathtrick', 'passion_p3:llm', 'passion_p3:rlhf', 'passion_p3:rlvr', 'passion_p3:jev', 'passion_p3:foundation', 'passion_p3:eeg', 'passion_p3:medai', 'passion_p3:robots']],
    ];
    const starts: Record<PigId, string[]> = {
      'piggy-1': ['how is volleyball?', 'what are you coding?', 'tell me about gatorade'],
      'piggy-2': ["what's perfusion?", "what's csf?", 'tell me about mri'],
      'piggy-3': ["what's hipergator?", 'tell me about codex', 'do you like physics?'],
    };
    for (const [pig, keys] of answerOnly) {
      const answers = keys.flatMap((k) => pool(pig, k));
      for (const start of starts[pig]) {
        for (let k = 0; k < 4; k++) {
          const hist = pad(k);
          for (const text of [start, 'tell me more', 'why?', 'really?', 'tell me more', 'why?', 'tell me more']) {
            const r = respondHeuristic({ pig, playerText: text, history: hist, context: ctx(pig) }).text;
            expect([pig, start, k, text, answers.some((a) => r.endsWith(a))]).toEqual([pig, start, k, text, false]);
            hist.push({ role: 'player', text, at: hist.length }, { role: 'pig', text: r, at: hist.length + 1 });
          }
        }
      }
    }
  });

  test('bringing up X, math, robots or his drink is Piggy 3\'s topic (+1 bond); the letter x is not', () => {
    for (const t of ['Are you on X?', 'I saw it on X.com', 'x dot com', 'are you on twitter', 'doomscrolling again?', 'Were you a math tutor?', 'Why sugar-free Red Bull?', "what's RLHF?", 'Would you build a robot?']) {
      expect([t, topicMatch('piggy-3', t)]).toEqual([t, true]);
    }
    for (const t of ['x ray', 'do you have an xbox?', 'nice weather', 'spacex launched']) expect([t, topicMatch('piggy-3', t)]).toEqual([t, false]);
    expect(exchangeEffects('piggy-3', 'Why sugar-free Red Bull?')).toEqual({ bond: 3, fun: 3 });
    expect(exchangeEffects('piggy-3', 'Were you a math tutor?')).toEqual({ bond: 3, fun: 3 });
  });

  test('the Big Brain knows it is X, never Twitter, at every model tier (the rules list is never trimmed)', () => {
    for (const tier of MODEL_IDS) {
      const p = systemPrompt('piggy-3', tier);
      expect([tier, p.includes('X.com'), p.includes('never Twitter')]).toEqual([tier, true, true]);
    }
    for (const pig of ['piggy-1', 'piggy-2'] as const) for (const tier of MODEL_IDS) expect([pig, tier, systemPrompt(pig, tier).includes('Twitter')]).toEqual([pig, tier, false]);
  });
});
