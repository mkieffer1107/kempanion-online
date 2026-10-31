import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  classifyIntent, greeting, heuristicBrain, idleLine, INTENTS, respondHeuristic, sentenceCount, suggestTopics,
  type IdleKind, type Intent,
} from '../src/lib/ai/heuristic';
import { idleOptions, IDLE_MAX_CHARS } from '../src/lib/ai/heuristic/idle';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { extractSaid, fill, KNOWN_PLACEHOLDERS, placeholdersIn, parseFacts } from '../src/lib/ai/heuristic/template';
import { extractFacts, rememberFacts, type MemoryStore } from '../src/lib/ai/memory';
import { setClockOffset } from '../src/lib/state/clock';
import { EXPRESSIONS, PIG_IDS, type ChatContext, type ChatReply, type ChatTurn, type PigId } from '../src/lib/types';

const ANIMS = new Set([
  'idle', 'blink', 'wave', 'look_around', 'walk_right', 'walk_front', 'walk_back', 'run_right', 'walk_left', 'run_left',
  'jump', 'tumble', 'sit_down', 'stand_up', 'eat', 'drink', 'bath', 'brush_teeth', 'yawn', 'sleep', 'wake_up', 'sick',
  'happy', 'sad', 'angry', 'scared', 'love', 'shy', 'surprised', 'confused', 'celebrate', 'dance', 'play_ball', 'bored',
  'hungry', 'thirsty', 'dirty', 'cry', 'laugh', 'proud', 'thinking', 'pet_reaction',
  'volleyball_serve', 'volleyball_bump', 'volleyball_set', 'volleyball_spike', 'volleyball_dig', 'volleyball_block',
  'volleyball_ready', 'volleyball_win', 'review_mri', 'brain_model', 'neuro_exam', 'write_chart', 'scrub_up',
  'surgical_focus', 'preop_check', 'clinical_success', 'typing', 'debugging', 'explain_code', 'ai_idea', 'code_review',
  'build_success', 'coffee_break', 'invite_to_code',
]);
const IDLE_KINDS: IdleKind[] = [
  'greet', 'hungry', 'tired', 'dirty', 'bored', 'sick', 'happy', 'petted', 'fed', 'cleaned', 'woke', 'sleepy', 'random', 'whisper',
];
/** Krishna Lunch, the retired chant, pork foods, weight jokes, mascot likenesses, politics. */
const BANNED = /krishna|gator bait|bacon|\bhams?\b|pork|sausage|pepperoni|prosciutto|chorizo|hot ?dog|\bribs\b|salami|\blard\b|\bfat\b|albert|trump|biden|maga|democrat|republican/i;

// Fixed game clock: Friday 2026-10-30, 3:42 PM local.
beforeAll(() => setClockOffset(Date.parse('2026-10-30T15:42:00') - Date.now()));
afterAll(() => setClockOffset(0));

function ctx(pig: PigId, over: Partial<ChatContext> = {}): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4,
    memories: ['comfort_food=ramen', "Player's major is biology."], ...over,
  };
}

function ask(pig: PigId, text: string, history: ChatTurn[] = [], over: Partial<ChatContext> = {}): ChatReply {
  return respondHeuristic({ pig, playerText: text, history, context: ctx(pig, over) });
}

function expectWellFormed(r: ChatReply) {
  expect(r.text.trim().length).toBeGreaterThan(0);
  expect(r.text.length).toBeLessThanOrEqual(280);
  expect(sentenceCount(r.text)).toBeLessThanOrEqual(3);
  expect(EXPRESSIONS).toContain(r.expression);
  if (r.anim) expect(ANIMS.has(r.anim)).toBe(true);
  expect(r.text).not.toMatch(/[{}]/);
  expect(r.text).not.toMatch(BANNED);
}

/** One natural sample per intent (classified without a pig hint). */
const SAMPLES: Record<Intent, string> = {
  greeting: 'hello there', farewell: 'bye, see you tomorrow', thanks: 'thank you so much', how_are_you: 'how are you doing',
  whats_up: "what's up", compliment_looks: "you're so cute", compliment_skill: "you're so smart", affection: 'i like you a lot',
  hug: 'can i hug you?', insult: "you're annoying", apology: 'sorry about that', joke_request: 'tell me a joke',
  ask_name: "what's your name?", ask_about_self: 'tell me about yourself', ask_major: "what's your major?",
  ask_hobby: 'what do you do for fun?', ask_favorite_food: "what's your favorite food?", ask_where: 'where are you usually?',
  ask_schedule: "what's your schedule like?", hungry_talk: "i'm starving", tired_talk: "i'm so tired",
  sick_talk: 'i think i have a cold', food_offer: 'want a snack?', study: 'can you help me study?',
  exam_stress: "i'm stressed about my exam", player_sad: "i'm feeling really down", player_happy: 'i aced my midterm!',
  bored: "i'm bored", weather: "it's so humid today", gators_football: 'did the gators win the football game?',
  campus_place: "let's go to century tower", passion_p1: "how's volleyball?", passion_p2: "what's perfusion?",
  passion_p3: 'what are you building?', ask_best: "what's the best laptop?", other_pig: 'what do you think of piggy 2?',
  yes: 'yes', no: 'nope', laugh: 'lol', question_generic: 'what is the meaning of life?', go_gators: 'go gators!',
  based: "that's so based", patriot: 'patriot', bump: 'bump', set: 'set', spike: 'spike', pork_joke: 'want some bacon?',
  distress: 'i want to die', ask_about_me: 'what do you know about me?', share_self: 'my name is jordan',
  followup: 'tell me more', ask_time: 'what time is it?', encourage: 'good luck on your exam!', arithmetic: "what's 7 plus 8?",
  unknown: 'asdfgh qwerty',
};

describe('intent classification', () => {
  test('every intent has a sample that classifies to it', () => {
    for (const intent of INTENTS) expect([intent, classifyIntent(SAMPLES[intent]).intent]).toEqual([intent, intent]);
  });

  test('topics and entities', () => {
    expect(classifyIntent("what's perfusion?").topic).toBe('perfusion');
    expect(classifyIntent('have you used codex?').topic).toBe('codex');
    expect(classifyIntent('codex')).toMatchObject({ intent: 'passion_p3', topic: 'codex' });
    expect(classifyIntent("let's go to lake alice")).toMatchObject({ intent: 'campus_place', topic: 'lake_alice' });
    expect(classifyIntent('i brought you some onigiri')).toMatchObject({ intent: 'food_offer', topic: 'onigiri' });
    expect(classifyIntent('do you like pizza?')).toMatchObject({ intent: 'ask_favorite_food', topic: 'pizza_slice' });
    expect(classifyIntent('where is piggy two?')).toMatchObject({ intent: 'ask_where', topic: 'piggy-2' });
    expect(classifyIntent('i have 3 exams').entities.numbers).toEqual([3]);
    expect(classifyIntent('gatorade please').entities.foods[0]).toEqual({ id: 'sideline_sip', label: 'Gatorade' });
    expect(classifyIntent('the ham radio club is cool').entities.pork).toBe(false);
    expect(classifyIntent("it's raining again").topic).toBe('rain');
  });

  test('a greeting stays a lead-in when there is a real question', () => {
    const r = classifyIntent('hi! how is volleyball?');
    expect(r.intent).toBe('passion_p1');
    expect(r.runnerUp?.intent).toBe('greeting');
    // the listening pig's own name is an address, not a topic
    expect(classifyIntent('hey piggy 1, how are you?', 'piggy-1').intent).toBe('how_are_you');
  });

  test('speaker-dependent readings', () => {
    expect(classifyIntent('what are you coding?', 'piggy-1')).toMatchObject({ intent: 'passion_p1', topic: 'cs' });
    expect(classifyIntent('what are you coding?', 'piggy-3')).toMatchObject({ intent: 'passion_p3', topic: 'building' });
    expect(classifyIntent('tell me about eeg', 'piggy-2')).toMatchObject({ intent: 'passion_p2', topic: 'electrodes' });
    expect(classifyIntent('tell me about eeg', 'piggy-3')).toMatchObject({ intent: 'passion_p3', topic: 'signals' });
  });

  test('typo, slang and elongation tolerance', () => {
    const cases: [string, Intent, string?][] = [
      ['helo', 'greeting'], ['heyyyy', 'greeting'], ['thnks', 'thanks'], ['ty', 'thanks'], ['hungy', 'hungry_talk'],
      ['tierd', 'tired_talk'], ['volleybal', 'passion_p1', 'volleyball'], ['perfussion', 'passion_p2', 'perfusion'],
      ['ishemia', 'passion_p2', 'ischemia'], ['neurosugery', 'passion_p2', 'neurosurgery'], ['codx', 'passion_p3', 'codex'],
      ['hipergater', 'passion_p3', 'hipergator'], ['GO GATORSSSS', 'go_gators'], ['sooo boreddd', 'bored'],
      ['ur so cute', 'compliment_looks'], ['i luv u', 'affection'], ['wyd', 'whats_up'], ['gn', 'farewell'],
      ['lmaooo', 'laugh'], ["i'm stresed about my exam", 'exam_stress'], ['marsten at night?', 'campus_place', 'marston'],
    ];
    for (const [text, intent, topic] of cases) {
      const r = classifyIntent(text);
      expect([text, r.intent]).toEqual([text, intent]);
      if (topic) expect([text, r.topic]).toEqual([text, topic]);
    }
  });

  test('real words are not "corrected" into keywords', () => {
    expect(classifyIntent('i tried my best').intent).not.toBe('tired_talk');
    expect(classifyIntent('that does not suck').intent).not.toBe('sick_talk');
  });
});

describe('hard quirks', () => {
  test('Piggy 2: based → Patriot., patriot → Based.', () => {
    for (const t of ['based', 'Based.', 'BASED!!!', '  based  ', 'based?']) {
      expect(ask('piggy-2', t)).toEqual({ text: 'Patriot.', expression: 'proud', anim: undefined, source: 'quirk' });
    }
    expect(ask('piggy-2', 'Patriot!').text).toBe('Based.');
    // even after saying it many times (no repeat-callout, no variation)
    const hist: ChatTurn[] = [];
    for (let i = 0; i < 6; i++) {
      const r = ask('piggy-2', 'based', hist);
      expect(r.text).toBe('Patriot.');
      hist.push({ role: 'player', text: 'based', at: i }, { role: 'pig', text: r.text, at: i });
    }
    // only the exact word triggers the hard rule
    const longer = ask('piggy-2', "that's so based");
    expect(longer.source).toBe('heuristic');
    expect(longer.text).toContain('Patriot');
  });

  test('Piggy 1: bump → Set!, set → SPIKE!!, spike → KILL! Point Gators!', () => {
    expect(ask('piggy-1', 'bump').text).toBe('Set!');
    expect(ask('piggy-1', 'Set').text).toBe('SPIKE!!');
    expect(ask('piggy-1', 'spike!').text).toBe('KILL! Point Gators!');
  });

  test('quirk words to the other pigs get in-character, non-quirk answers', () => {
    for (const pig of ['piggy-1', 'piggy-3'] as PigId[]) {
      const r = ask(pig, 'based');
      expect(r.text).not.toBe('Patriot.');
      expect(r.text).toMatch(/Piggy 2/);
    }
    for (const pig of ['piggy-2', 'piggy-3'] as PigId[]) {
      expect(ask(pig, 'bump').text).not.toBe('Set!');
      expect(ask(pig, 'set').text).not.toBe('SPIKE!!');
    }
  });

  test('Piggy 3 lights up about his project for "codex" / "have you used codex?"', () => {
    for (const t of ['codex', 'Have you used Codex?']) {
      const r = ask('piggy-3', t);
      expect(r.text).toMatch(/codex|coding agent/i);
      expect(['excited', 'happy', 'thinking']).toContain(r.expression);
    }
  });

  test('Piggy 3 answers "what\'s the best X" with "Best for what?"', () => {
    for (const t of ["what's the best laptop?", 'which is the best AI model?', 'what is the best printer']) {
      expect(ask('piggy-3', t).text).toMatch(/^Best for what/);
    }
  });

  test('"go gators" gets a hoof Gator Chomp from everyone', () => {
    for (const pig of PIG_IDS) {
      const r = ask(pig, 'Go Gators!');
      expect(r.text).toMatch(/chomp/i);
      expect(['celebrate', 'dance', 'proud']).toContain(r.anim);
    }
  });
});

describe('replies', () => {
  test('every pig answers every intent, at every bond tier and need state', () => {
    const states: Partial<ChatContext>[] = [
      { bondLevel: 0, playerName: '' },
      { bondLevel: 4 },
      { bondLevel: 9, mood: 'great' },
      { bondLevel: 5, sick: true, needs: { hunger: 20, energy: 20, hygiene: 20, fun: 20 }, mood: 'low' },
      { bondLevel: 2, needs: { hunger: 95, energy: 90, hygiene: 90, fun: 90 } },
    ];
    for (const pig of PIG_IDS) {
      for (const state of states) {
        for (const intent of INTENTS) {
          const r = ask(pig, SAMPLES[intent], [], state);
          expectWellFormed(r);
        }
      }
    }
  });

  test('deterministic for the same input and state', async () => {
    const hist: ChatTurn[] = [{ role: 'player', text: 'hi', at: 1 }, { role: 'pig', text: 'Hey!', at: 2 }];
    for (const pig of PIG_IDS) {
      for (const t of ["what's up?", 'tell me a joke', 'i brought you melonpan', 'hmm']) {
        const a = ask(pig, t, hist);
        expect(ask(pig, t, hist)).toEqual(a);
        expect(await heuristicBrain.respond({ pig, playerText: t, history: hist, context: ctx(pig) })).toEqual(a);
      }
    }
  });

  test('streams the whole reply once through onToken', async () => {
    const chunks: string[] = [];
    const r = await heuristicBrain.respond({ pig: 'piggy-1', playerText: 'hi', history: [], context: ctx('piggy-1') }, (d) => chunks.push(d));
    expect(chunks).toEqual([r.text]);
  });

  test('a history that already ends with the current message is handled', () => {
    const hist: ChatTurn[] = [{ role: 'player', text: 'how are you?', at: 1 }];
    const r = ask('piggy-1', 'how are you?', hist);
    expect(LINES['piggy-1'].chat.repeat.map((l) => l[1])).not.toContain(r.text);
  });

  test('no pig repeats any of his last 8 lines', () => {
    const scripts = [
      // same question, many wordings
      ['how are you?', 'how are you doing?', "how's it going?", 'how have you been?', 'how are you feeling?', "how's life?",
        'are you doing ok?', 'how was your day?', 'and how are you?', 'how are things?', 'how is everything?', 'how do you feel?'],
      // a long mixed chat
      ['hi!', "what's up?", 'tell me a joke', 'lol', 'another joke please', 'haha', 'one more joke', "what's your major?",
        'what do you do for fun?', "what's your favorite food?", 'want a snack?', 'i brought you onigiri', 'thanks!',
        'tell me about piggy 2', 'tell me about piggy 3', 'tell me about piggy 1', 'go gators!', 'chomp chomp', 'i aced my exam!',
        "i'm bored", "let's do something", 'favorite spot on campus?', "what's the best laptop?", 'why?', 'tell me more', 'really?',
        'cool', 'bye!'],
    ];
    for (const pig of PIG_IDS) {
      for (const script of scripts) {
        const hist: ChatTurn[] = [];
        script.forEach((text, i) => {
          const r = ask(pig, text, hist);
          expectWellFormed(r);
          const last8 = hist.filter((t) => t.role === 'pig').slice(-8).map((t) => t.text);
          expect([pig, text, last8.includes(r.text)]).toEqual([pig, text, false]);
          hist.push({ role: 'player', text, at: i * 2 }, { role: 'pig', text: r.text, at: i * 2 + 1, expression: r.expression });
        });
      }
    }
  });

  test('follow-ups continue the last topic', () => {
    const first = ask('piggy-2', "what's perfusion?");
    const hist: ChatTurn[] = [{ role: 'player', text: "what's perfusion?", at: 1 }, { role: 'pig', text: first.text, at: 2 }];
    const why = ask('piggy-2', 'why?', hist);
    const topicLines = [...LINES['piggy-2'].chat['passion_p2:perfusion'], ...LINES['piggy-2'].chat.passion_p2].map((l) => l[1]);
    expect(topicLines.some((t) => why.text.endsWith(t))).toBe(true);
    expect(why.text).not.toBe(first.text);
    const openers = LINES['piggy-2'].chat['followup:why'].map((l) => l[1]);
    expect(openers.some((o) => why.text.startsWith(o))).toBe(true);
  });

  test('repeated player input gets a playful callout', () => {
    for (const pig of PIG_IDS) {
      const r1 = ask(pig, "what's your major?");
      const hist: ChatTurn[] = [{ role: 'player', text: "what's your major?", at: 1 }, { role: 'pig', text: r1.text, at: 2 }];
      const r2 = ask(pig, 'What is your major??', hist);
      expect(LINES[pig].chat.repeat.map((l) => l[1])).toContain(r2.text);
    }
  });

  test('blends a greeting into an answer', () => {
    const r = ask('piggy-1', 'hey! how is volleyball?');
    const leads = LINES['piggy-1'].chat['lead:greeting'].map((l) => l[1]);
    expect(leads.some((l) => r.text.startsWith(l + ' '))).toBe(true);
  });

  test('tastes: loved, disliked and secret foods', () => {
    expect(ask('piggy-1', 'want some strawberry milk?').expression).toMatch(/blush/);
    expect(ask('piggy-2', 'i brought you truffle fries').expression).toMatch(/blush/);
    expect(ask('piggy-3', 'here is some sakura dango').expression).toMatch(/blush/);
    expect(ask('piggy-1', 'want boiled peanuts?').text).toMatch(/wet peanuts/i);
    expect(ask('piggy-3', 'want an onigiri?').text).toMatch(/onigiri/i);
    // a full pig turns down food
    const full = ask('piggy-1', 'want a tender sub?', [], { needs: { hunger: 95, energy: 80, hygiene: 80, fun: 80 } });
    expect(LINES['piggy-1'].chat['food_offer:full'].map((l) => l[1])).toContain(full.text);
  });

  test('remembered facts show up, and the player name waits for heart 1', () => {
    expect(ask('piggy-3', 'what do you know about me?', [], { memories: ['major=biology'] }).text).toMatch(/biology/);
    expect(ask('piggy-1', 'what do you know about me?', [], { memories: [] }).text).not.toMatch(/\{/);
    const shared = ask('piggy-2', 'my name is jordan');
    expect(shared.text).toContain('Jordan');
    for (let i = 0; i < 20; i++) {
      const r = respondHeuristic({ pig: 'piggy-1', playerText: `hello ${'!'.repeat(i)}`, history: [], context: ctx('piggy-1', { bondLevel: 0 }) });
      expect(r.text).not.toContain('Alex');
    }
  });

  test('where-is answers use the schedule', () => {
    // Friday 3:42 PM: Piggy 3 is in the Physics Building
    expect(ask('piggy-1', 'where is piggy 3?').text).toContain('the Physics Building');
  });

  test('questions about the pig are answered about himself', () => {
    const lines = (pig: PigId, key: string) => (LINES[pig].chat[key] ?? []).map((l) => l[1]);
    for (const pig of PIG_IDS) {
      expect(lines(pig, 'hungry_talk:ask')).toContain(ask(pig, 'are you hungry?').text);
      expect(lines(pig, 'tired_talk:ask')).toContain(ask(pig, 'are you tired?').text);
      expect(lines(pig, 'sick_talk:ask')).toContain(ask(pig, 'are you sick?').text);
      // …and when he really is hungry, he says so
      const hungry = ask(pig, 'are you hungry?', [], { needs: { hunger: 10, energy: 80, hygiene: 80, fun: 80 } });
      expect([...lines(pig, 'how_are_you:hungry'), ...lines(pig, 'hungry_talk:needy')]).toContain(hungry.text);
      expect(lines(pig, 'hungry_talk:invite')).toContain(ask(pig, 'want to get dinner later?').text);
      expect(lines(pig, 'encourage')).toContain(ask(pig, 'good luck on your exam!').text);
    }
  });

  test('"I\'m good" is an answer to "how are you", and a polite no to an offer', () => {
    const fine = LINES['piggy-1'].chat['player_happy:fine'].map((l) => l[1]);
    expect(fine).toContain(ask('piggy-1', "i'm good").text);
    const offer: ChatTurn[] = [{ role: 'player', text: 'hi', at: 1 }, { role: 'pig', text: 'Want a snack?', at: 2 }];
    const declined = [...LINES['piggy-1'].chat['no:q'], ...LINES['piggy-1'].chat.no].map((l) => l[1]);
    expect(declined).toContain(ask('piggy-1', "i'm good", offer).text);
    const howAbout: ChatTurn[] = [{ role: 'player', text: 'hi', at: 1 }, { role: 'pig', text: 'How about you, teammate?', at: 2 }];
    expect(fine).toContain(ask('piggy-1', "i'm good", howAbout).text);
  });

  test('grief gets gentle lines with no jokes or sports metaphors', () => {
    for (const pig of PIG_IDS) {
      const r = ask(pig, 'my dog died yesterday');
      expect(LINES[pig].chat['player_sad:grief'].map((l) => l[1])).toContain(r.text);
      expect(r.text).not.toMatch(/rally|set|perfusion|based|ship|lol/i);
    }
  });

  test('time questions use the game clock', () => {
    for (const pig of PIG_IDS) expect(ask(pig, 'what time is it?').text).toContain('3:42 PM');
    const noClock = respondHeuristic({ pig: 'piggy-2', playerText: 'what time is it?', history: [], context: ctx('piggy-2', { clock: '' }) });
    expect(noClock.text).toContain('3:42 PM');
  });

  test('distress gets a warm pointer to real help, never a joke', () => {
    for (const pig of PIG_IDS) {
      const r = ask(pig, "i don't want to live anymore");
      expect(r.text).toMatch(/988/);
      expect(r.text).toMatch(/Counseling & Wellness Center/);
    }
  });

  test('no pork, ever', () => {
    for (const pig of PIG_IDS) {
      const r = ask(pig, 'want some bacon?');
      expect(r.text).not.toMatch(BANNED);
      expect(['angry', 'confused', 'sad']).toContain(r.expression);
    }
  });
});

describe("the player's major", () => {
  const lines = (pig: PigId, key: string) => (LINES[pig].chat[key] ?? []).map((l) => l[1]);
  const acks = (pig: PigId, said: string) =>
    [...lines(pig, 'share_self:major'), ...lines(pig, 'share_self:major_same')].map((t) => fill(t, { said }));

  test('a stated major is acknowledged, several words too, not answered with CS small talk', () => {
    const cases: [string, string][] = [
      ['my major is computer science', 'computer science'], ["I'm a computer science major", 'computer science'],
      ['i study computer science', 'computer science'], ['I am majoring in computer science', 'computer science'],
      ["i'm a cs major", 'CS'], ["I'm an electrical engineering major", 'electrical engineering'], ["I'm also a biology major", 'biology'],
      ['my major is biology', 'biology'],
    ];
    for (const [text, said] of cases) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        for (let h = 0; h < 6; h++) {
          const history: ChatTurn[] = Array.from({ length: h }, (_, i) => ({ role: i % 2 ? 'pig' : 'player', text: `filler ${i}`, at: i }));
          expect([text, pig, acks(pig, said)]).toEqual([text, pig, expect.arrayContaining([ask(pig, text, history).text])]);
        }
      }
    }
  });

  test('Piggy 1 shares AIBHS, not a general computer science major', () => {
    const same = (said: string) => lines('piggy-1', 'share_self:major_same').map((t) => fill(t, { said }));
    for (const program of ['AIBHS', 'AI in Biomedical and Health Sciences', 'artificial intelligence in Biomedical and Health Sciences']) {
      for (const text of [`my major is ${program}`, `I study ${program}`]) {
        expect(classifyIntent(text, 'piggy-1')).toMatchObject({ intent: 'share_self', topic: 'major' });
        expect(same('AIBHS')).toContain(ask('piggy-1', text).text);
      }
    }
    for (const major of ['computer science', 'CS', 'computer engineering', 'biology', 'computing', 'AI', 'artificial intelligence', 'AI in medicine']) {
      const reply = ask('piggy-1', `my major is ${major}`).text;
      expect(reply).not.toMatch(/SAME MAJOR|same rotation/);
    }
  });

  test('Piggy 1 describes his AIBHS degree, ambassador role and September birthday', () => {
    for (const text of ['what do you study?', 'what is AIBHS?', 'tell me about AI in Biomedical and Health Sciences']) {
      expect(classifyIntent(text, 'piggy-1').intent).toBe('ask_major');
      expect(ask('piggy-1', text).text).toMatch(/AIBHS|AI in Biomedical and Health Sciences/);
    }
    for (const text of ['what do you do?', 'are you a program ambassador?', 'what is Kempa AI?']) {
      expect(classifyIntent(text, 'piggy-1')).toMatchObject({ intent: 'ask_about_self', topic: 'job' });
      expect(ask('piggy-1', text).text).toMatch(/ambassador/);
    }
    for (const line of lines('piggy-1', 'ask_about_self:birthday')) {
      expect(line).toMatch(/September 4/);
      expect(line).not.toMatch(/June|solstice/);
    }
  });

  test('the year, the pride or "currently" is not part of the major', () => {
    const cases: [string, string][] = [
      ["I'm a junior CS major", 'CS'], ["i'm a third-year biology major", 'biology'], ["i'm a proud english major", 'English'],
      ["i'm currently a mechanical engineering major", 'mechanical engineering'], ['im a food and resource economics major', 'food and resource economics'],
    ];
    for (const [text, said] of cases) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        expect([text, pig, acks(pig, said)]).toEqual([text, pig, expect.arrayContaining([ask(pig, text).text])]);
      }
    }
  });

  test('"major" in other senses is not a stated major', () => {
    for (const text of ["i'm not a major fan of rain", "i'm so not a math major"]) {
      expect([text, classifyIntent(text).intent === 'share_self' && classifyIntent(text).topic === 'major']).toEqual([text, false]);
    }
  });

  test('"major" the adjective, someone else\'s major or how studying goes is never echoed as the player\'s major', () => {
    const notMajor = [
      "i'm having a major panic attack", 'i am taking a major exam tomorrow', "i'm undecided about my major",
      "i'm stressed about a major exam", "i'm in a major hurry", "i'm going through a major change",
      "i'm thinking about changing my major", "i'm switching my major to biology", "i'm working on a major project",
      "I'm the drum major in the band", "i'm a major fan", "i'm a double major", "i'm dating a cs major",
      "i'm facing major delays", 'i am having major problems', 'my major is so hard', 'my major is kind of boring',
      'i study at the library', "i'm studying for my exam", 'i am studying',
    ];
    const allMajorLines = PIG_IDS.flatMap((p) => [...lines(p, 'share_self:major'), ...lines(p, 'share_self:major_same')]);
    for (const text of notMajor) {
      for (const pig of PIG_IDS) {
        const c = classifyIntent(text, pig);
        expect([text, pig, c.intent === 'share_self' && c.topic === 'major']).toEqual([text, pig, false]);
        const r = ask(pig, text);
        // no "{said}" line at all (they all echo what was said)
        expect([text, pig, allMajorLines.some((l) => r.text.endsWith(l.split('{said}').pop()!.trim()))]).toEqual([text, pig, false]);
      }
    }
    // and they keep the answers they had before majors could be several words
    for (const pig of PIG_IDS) {
      expect(classifyIntent("i'm stressed about a major exam", pig).intent).toBe('exam_stress');
      expect(classifyIntent('i am taking a major exam tomorrow', pig).intent).toBe('exam_stress');
      expect(classifyIntent("i'm studying for my exam", pig).intent).toBe('exam_stress');
      expect(classifyIntent("I'm the drum major in the band", pig)).toMatchObject({ intent: 'ask_hobby', topic: 'music' });
      expect(classifyIntent("i'm working on a major project", pig)).toMatchObject({ intent: 'passion_p3', topic: 'building' });
      // a panic attack gets the comforting answer, not "that went over the net"; a question about them isn't one
      expect(classifyIntent("i'm having a major panic attack", pig).intent).toBe('player_sad');
      expect(classifyIntent('i keep getting anxiety attacks', pig).intent).toBe('player_sad');
      expect(classifyIntent('what causes panic attacks?', pig).intent).not.toBe('player_sad');
    }
  });

  test('"my major is undecided" is not echoed back as a subject', () => {
    for (const pig of PIG_IDS) {
      for (const text of ['my major is undecided', "i'm an undeclared major"]) {
        expect([text, pig, lines(pig, 'share_self')]).toEqual([text, pig, expect.arrayContaining([ask(pig, text).text])]);
      }
    }
  });

  test('the major is read back cleanly: it stops at a question back, a new clause or filler', () => {
    const cases: [string, string][] = [
      ["my major is bio, what's yours?", 'bio'], ['my major is computer science and engineering', 'computer science and engineering'],
      ['my major is cs lol', 'CS'], ['i study biology at uf', 'biology'], ["I'm studying computer science", 'computer science'],
      ['i major in english', 'English'], ["I'm majoring in mechanical engineering", 'mechanical engineering'],
      ["I'm a cs major, what's yours?", 'CS'], ['my major is nursing', 'nursing'], ["I'm currently studying psychology", 'psychology'],
      ['my majors are cs and math', 'CS and math'], ["I'm a bio major from Tampa", 'bio'], ['I\'m a bio major and I love it', 'bio'],
      ['my major is math is hard', 'math'], ['my major is bio is that weird?', 'bio'], ['im a food and resource economics major', 'food and resource economics'],
      ['im nursing major', 'nursing'],
    ];
    for (const [text, said] of cases) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        const r = ask(pig, text).text;
        expect([text, pig, acks(pig, said).includes(r)]).toEqual([text, pig, true]);
      }
    }
  });

  test('the player\'s own spelling: "women\'s studies" (not "women is studies"), "pre-med", "&"', () => {
    for (const pig of PIG_IDS) {
      for (const [text, said] of [
        ["i'm a women's studies major", "women's studies"], ["my major is women's studies", "women's studies"],
        ["I'm a pre-med major", 'pre-med'], ['my major is food & resource economics', 'food & resource economics'],
      ] as const) {
        const r = ask(pig, text).text;
        expect([text, pig, acks(pig, said).includes(r), /\bwomen is\b/i.test(r)]).toEqual([text, pig, true, false]);
      }
    }
  });

  test('ordinary sentences with "major", "study" or "studying" are not garbled into a major', () => {
    const notMajor: [string, Intent | null][] = [
      ["i'm studying chem for my exam", 'exam_stress'], ["i'm studying, what are you doing?", 'whats_up'],
      ["i'm studying for the mcat", 'exam_stress'], ['i study twice a week', 'study'], ["i'm studying while eating", 'study'],
      ["i'm studying right now", 'study'], ["i'm studying chapter 5", 'study'], ['my major is stressing me out', null],
      ['my major is killing me', null], ['my major is a lot', null], ['that was a major problem', null],
      ['i have a major problem', null], ['this is a major deal', null], ["i'm in major trouble", null],
      ["I'm a drum major in the marching band", 'ask_hobby'], ["i'm a big major league fan", null], ["i'm a total major nerd", null],
      ["I'm a former bio major", null], ["I'm a major fan of tacos", null], ["i'm studying cs tonight", null],
      ["i'm studying cs with my friends", null], ['what is your major? mine is bio', 'ask_major'],
      ["i'm studying ochem", 'study'], ["i'm studying ugh", 'study'], ['my major is ruining my life', 'unknown'],
    ];
    for (const [text, intent] of notMajor) {
      for (const pig of PIG_IDS) {
        const c = classifyIntent(text, pig);
        expect([text, pig, c.intent === 'share_self' && c.topic === 'major']).toEqual([text, pig, false]);
        if (intent) expect([text, pig, c.intent]).toEqual([text, pig, intent]);
        const r = ask(pig, text).text;
        const allMajorLines = PIG_IDS.flatMap((p) => [...lines(p, 'share_self:major'), ...lines(p, 'share_self:major_same')]);
        expect([text, pig, allMajorLines.some((l) => r.endsWith(l.split('{said}').pop()!.trim()))]).toEqual([text, pig, false]);
      }
    }
  });

  test('"I\'m studying X" where X is a pig\'s own topic gets that topic\'s answer, from every pig', () => {
    for (const [text, intent, topic] of [
      ["i'm studying perfusion", 'passion_p2', 'perfusion'], ["i'm studying anatomy", 'passion_p2', 'anatomy'],
      ["i'm studying volleyball", 'passion_p1', 'volleyball'], ["i'm studying one piece", 'passion_p3', 'onepiece'],
      ['i study codex', 'passion_p3', 'codex'],
    ] as const) {
      for (const pig of PIG_IDS) expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent, topic }]);
    }
    // a major that is also a coding topic stays a stated player major
    expect(classifyIntent('i study computer science', 'piggy-1')).toMatchObject({ intent: 'share_self', topic: 'major' });
    expect(classifyIntent('i study physics', 'piggy-3')).toMatchObject({ intent: 'share_self', topic: 'major' });
  });

  test('a question back ("…, hbu?") still gets the major acknowledged, not "how are you"', () => {
    for (const text of ["i'm a cs major hbu", 'i study bio what about you', "my major is history, and you?"]) {
      for (const pig of PIG_IDS) expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
    }
    expect(classifyIntent("i'm good, and you?").intent).toBe('how_are_you');
  });

  const allMajorLines = () => PIG_IDS.flatMap((p) => [...lines(p, 'share_self:major'), ...lines(p, 'share_self:major_same')]);
  const readsBack = (r: string) => allMajorLines().some((l) => r.endsWith(l.split('{said}').pop()!.trim()));

  test('"my major is <how it\'s going>" gets asked about, with nothing read back ("Terrible!" never)', () => {
    for (const text of [
      'my major is terrible', 'my major is useless', 'my major is impossible', 'my major is pointless', 'my major is awful',
      'my major is nice', 'my major is intense', 'my major is sooo hard', 'my major is way too hard', 'my major is fire',
      "i'm a tiktok major lol", "i'm majoring in procrastination lol",
    ]) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        // (after a lead-in for "lol": "Haha! Okay, wait, tell me more about your major?…")
        const r = ask(pig, text).text;
        const more = lines(pig, 'share_self:major_more').some((l) => r.endsWith(l));
        expect([text, pig, more, readsBack(r)]).toEqual([text, pig, true, false]);
      }
    }
  });

  test('"major" the adjective before any noun, and "I\'m studying <when, where, how>", are no major at all', () => {
    for (const text of [
      "i'm a total major disaster", "i'm an absolute major mess", "i'm a real major klutz", 'im a lowkey major hater',
      "i'm a huge major disappointment", "i'm in a major slump", "i'm having a major meltdown", "i'm a sophomore major in biology",
      "i'm studying atm", "i'm studying outside", "i'm studying early", "i'm studying solo", "i'm studying already",
      "i'm studying finally", "i'm studying remotely", "i'm studying rq", "i'm studying sm", "i'm studying asap",
      'i study mornings', 'i study efficiently', 'i study weekends', "i'm studying overnight", "i'm studying downstairs",
    ]) {
      for (const pig of PIG_IDS) {
        const c = classifyIntent(text, pig);
        expect([text, pig, c.intent === 'share_self' && c.topic === 'major']).toEqual([text, pig, false]);
        const r = ask(pig, text).text;
        expect([text, pig, readsBack(r), lines(pig, 'share_self:major_more').includes(r)]).toEqual([text, pig, false, false]);
      }
    }
    // a field of study still reads as one, whatever the year, the mood or a two-word name
    for (const [text, said] of [
      ["i'm a stressed out bio major", 'bio'], ["i'm a real estate major", 'real estate'], ["i'm a cs and math double major", 'CS and math'],
      ["i'm a political science major from miami", 'political science'], ['my major is neuroscince', 'neuroscience'],
      ["i'm a materials science and engineering major", 'materials science and engineering'], ['i study zoology', 'zoology'],
      ['my major is family youth and community sciences', 'family youth and community sciences'],
      ['my major is fine arts', 'fine arts'], ["i'm majoring in athletic training", 'athletic training'],
    ] as const) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        expect([text, pig, acks(pig, said).includes(ask(pig, text).text)]).toEqual([text, pig, true]);
      }
    }
  });

  test('what the pig reads back is exactly what memory keeps (one reading of the same corrected text)', () => {
    const corpus = [
      "my major is bio, what's yours?", "i'm a cs major hbu", 'i study biology at uf', "I'm studying computer science",
      "i'm studying anatomy", "i'm studying perfusion", 'i study codex', 'my major is terrible', "i'm a tiktok major lol",
      "i'm a total major disaster", "i'm studying atm", 'i study mornings', 'my major is neuroscince', "i'm a women's studies major",
      "i'm a materials science and engineering major", "i'm a political science major", 'im a pre-law major',
      'my major is food & resource economics', "i'm a stressed out bio major", "i'm a real estate major", 'my major is undecided',
      "i'm studying chem for my exam", "i'm majoring in mechanical engineering at uf", "i'm a music major and a drum major",
      "i'm a big major league fan", "I'm a former bio major", 'my major is math is hard', 'i study history and it is fun',
      "i'm studying physics", "i'm studying abroad next year", 'my major is way too hard', "i'm an undeclared major",
      // words after the field, the minor, "in" (chat2 final check, issues 2 and 5)
      "i'm studying chem atm", 'my major is bio atm', "i'm studying chem homework", 'my major is history tho',
      'my major is psych atm but i might switch', "i'm studying chem tho", "i'm majoring in bio and minoring in chem",
      "i'm a chem minor and bio major", "my major's in biology", 'my major is in biology', 'my degree is in computer science',
      'my major is math heavy', 'my major is lowkey bio', "i'm studying law and order reruns lol", 'my major is media production',
    ];
    for (const text of corpus) {
      const memory = extractFacts(text).filter((f) => f.key === 'major').map((f) => f.fact);
      for (const pig of PIG_IDS) {
        const c = classifyIntent(text, pig);
        const said = c.intent === 'share_self' && c.topic === 'major' ? extractSaid(c.corrected, 'major', text) : undefined;
        const kept = memory.map((f) => /^Player(?:'s major is| studies) (.+)\.$/.exec(f)?.[1]);
        expect([text, pig, kept]).toEqual([text, pig, said ? [said] : []]);
      }
    }
  });

  /** The pig's reply is this major's acknowledgement, maybe after a lead-in ("Ha! …" for "lol"). */
  const acksWith = (pig: PigId, said: string, r: string) => acks(pig, said).some((a) => r === a || r.endsWith(` ${a}`));

  test('words after the field are never read back or remembered: "my major is bio atm" is bio, "i\'m studying chem atm" no major', () => {
    const subjects: [string, string][] = [
      ['chem', 'chem'], ['bio', 'bio'], ['psych', 'psych'], ['english', 'English'], ['computer science', 'computer science'],
      ['art history', 'art history'],
    ];
    const filler = [
      'atm', 'outside', 'early', 'solo', 'rq', 'sm', 'notes', 'homework', 'flashcards', 'nonstop', 'mornings', 'stuff',
      'finally', 'religiously', 'remotely', 'asap', 'vocab', 'atm lol',
    ];
    for (const [subject, said] of subjects) {
      for (const f of filler) {
        // stated: the field is the major, what follows it is dropped
        const stated = `my major is ${subject} ${f}`;
        expect([stated, extractFacts(stated).filter((x) => x.key === 'major').map((x) => x.fact)]).toEqual([stated, [`Player's major is ${said}.`]]);
        // said in passing: a study session, like "i'm studying chem tonight"
        const session = `i'm studying ${subject} ${f}`;
        expect([session, extractFacts(session).filter((x) => x.key === 'major')]).toEqual([session, []]);
        for (const pig of PIG_IDS) {
          const c = classifyIntent(stated, pig);
          expect([stated, pig, c]).toMatchObject([stated, pig, { intent: 'share_self', topic: 'major' }]);
          expect([stated, pig, extractSaid(c.corrected, 'major', stated)]).toEqual([stated, pig, said]);
          expect([stated, pig, acksWith(pig, said, ask(pig, stated).text)]).toEqual([stated, pig, true]);
          const s = classifyIntent(session, pig);
          expect([session, pig, s.intent === 'share_self' && s.topic === 'major']).toEqual([session, pig, false]);
          expect([session, pig, readsBack(ask(pig, session).text)]).toEqual([session, pig, false]);
        }
      }
    }
    // chat tone is not a study session ("i'm studying chem tho")
    for (const text of ["i'm studying chem tho", 'i study bio lowkey', 'i study bio tbh', "i'm studying psych irl"]) {
      const said = text.includes('chem') ? 'chem' : text.includes('psych') ? 'psych' : 'bio';
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        expect([text, pig, acksWith(pig, said, ask(pig, text).text)]).toEqual([text, pig, true]);
      }
      expect([text, extractFacts(text).map((x) => x.fact)]).toEqual([text, [`Player studies ${said}.`]]);
    }
  });

  test('"majoring in X and minoring in Y" is X; "my major is in X", "my major\'s in X" and "my degree is in X" are majors', () => {
    for (const [text, said] of [
      ["i'm majoring in bio and minoring in chem", 'bio'], ["i'm majoring in psych and minoring in business", 'psych'],
      ['majoring in bio, minoring in chem', 'bio'], ["i'm majoring in psych with a minor in business", 'psych'],
      ['my major is bio and a minor in chem', 'bio'], ["i'm a chem minor and bio major", 'bio'], ["i'm a bio major and a chem minor", 'bio'],
      ['my major is in biology', 'biology'], ["my major's in biology", 'biology'], ['my majors in nursing', 'nursing'],
      ['my degree is in computer science', 'computer science'], ["my major's in mechanical engineering", 'mechanical engineering'],
    ] as const) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        expect([text, pig, acksWith(pig, said, ask(pig, text).text)]).toEqual([text, pig, true]);
      }
      expect([text, extractFacts(text).map((x) => x.fact)]).toEqual([text, [`Player's major is ${said}.`]]);
    }
    for (const text of ["i'm minoring in chem", 'my minor is chem']) {
      for (const pig of PIG_IDS) {
        const c = classifyIntent(text, pig);
        expect([text, pig, c.intent === 'share_self' && c.topic === 'major']).toEqual([text, pig, false]);
      }
      expect([text, extractFacts(text).filter((x) => x.key === 'major')]).toEqual([text, []]);
    }
  });

  test('a name that ends on a field word only there is read back whole; "math heavy" describes the major, never names it', () => {
    for (const [text, said] of [
      ['my major is media production', 'media production'], ["i'm an information systems major", 'information systems'],
      ['my major is communication sciences and disorders', 'communication sciences and disorders'],
      ["i'm a fire and emergency services major", 'fire and emergency services'], ["i'm majoring in music theory", 'music theory'],
      ['my major is health education and behavior', 'health education and behavior'], ["i'm an english lit major", 'English lit'],
      ['my major is computer science honors', 'computer science'],
    ] as const) {
      for (const pig of PIG_IDS) expect([text, pig, acksWith(pig, said, ask(pig, text).text)]).toEqual([text, pig, true]);
      expect([text, extractFacts(text).map((x) => x.fact)]).toEqual([text, [`Player's major is ${said}.`]]);
    }
    for (const text of ['my major is math heavy', 'my major is writing intensive', 'my major is stem adjacent']) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        expect([text, pig, lines(pig, 'share_self:major_more').includes(ask(pig, text).text)]).toEqual([text, pig, true]);
      }
      expect([text, extractFacts(text).filter((x) => x.key === 'major')]).toEqual([text, []]);
    }
  });

  test('the stated major is never replaced by a garbled one (biology → "chem atm" → "bio atm" keeps a clean major)', () => {
    const mem: string[] = [];
    const store: MemoryStore = {
      remember: (_pig, fact) => void (mem.includes(fact) || mem.push(fact)),
      forget: (_pig, drop) => void mem.splice(0, mem.length, ...mem.filter((f) => !drop(f))),
    };
    rememberFacts('piggy-2', extractFacts("i'm a biology major"), store);
    rememberFacts('piggy-2', extractFacts("i'm studying chem atm"), store);
    expect(mem).toEqual(["Player's major is biology."]);
    rememberFacts('piggy-2', extractFacts('my major is bio atm'), store);
    expect(mem).toEqual(["Player's major is bio."]);
    expect(parseFacts(mem).major).toBe('bio');
    // and the scripted brain reads back what it keeps
    expect(ask('piggy-2', 'what do you know about me?', [], { memories: mem }).text).not.toMatch(/\batm\b/);
  });

  test('a field of study is never "corrected": "comp sci" (not "chomp sci"), "painting" (not 3D printing)', () => {
    for (const [text, said, fact] of [
      ["i'm a comp sci major", 'comp sci', "Player's major is comp sci."], ['my major is comp sci', 'comp sci', "Player's major is comp sci."],
      ["i'm a comp lit major", 'comp lit', "Player's major is comp lit."], ['my major is painting', 'painting', "Player's major is painting."],
      ['i study comp sci', 'comp sci', 'Player studies comp sci.'], ['i study poli sci', 'poli sci', 'Player studies poli sci.'],
    ] as const) {
      for (const pig of PIG_IDS) {
        expect([text, pig, classifyIntent(text, pig)]).toMatchObject([text, pig, { intent: 'share_self', topic: 'major' }]);
        expect([text, pig, acksWith(pig, said, ask(pig, text).text)]).toEqual([text, pig, true]);
      }
      expect([text, extractFacts(text).map((x) => x.fact)]).toEqual([text, [fact]]);
    }
    // "poli sci", "comp sci" and sci-fi are no spinal cord injury (SCI); painting is no 3D printing
    for (const text of ['i study comp sci', 'i study poli sci', 'do you like sci-fi?', 'i love painting', "i'm painting my room"]) {
      for (const pig of PIG_IDS) {
        const c = classifyIntent(text, pig);
        expect([text, pig, /^(?:spine|printing)$/.test(c.topic ?? '')]).toEqual([text, pig, false]);
      }
    }
    expect(classifyIntent('what is sci?', 'piggy-2')).toMatchObject({ intent: 'passion_p2', topic: 'spine' });
  });
});

describe('line banks', () => {
  test('outfit lines only play in that outfit (Piggy 3 never credits the hoodie while in his tee)', () => {
    const seen = { everyday: new Set<string>(), alt: new Set<string>() };
    for (const outfit of ['everyday', 'hoodie'] as const) {
      for (let i = 0; i < 80; i++) {
        const history: ChatTurn[] = Array.from({ length: i % 9 }, (_, k) => ({ role: 'player' as const, text: `hi ${k}`, at: k }));
        const r = ask('piggy-3', `nice outfit${'!'.repeat(i % 7)}`, history, { outfit, bondLevel: 1 });
        seen[outfit === 'everyday' ? 'everyday' : 'alt'].add(r.text);
      }
    }
    expect([...seen.everyday].some((t) => /hoodie is doing a lot/i.test(t))).toBe(false);
    expect([...seen.alt].some((t) => /lavender is doing a lot/i.test(t))).toBe(false);
    expect([...seen.everyday].some((t) => /lavender is doing a lot/i.test(t))).toBe(true);
    expect([...seen.alt].some((t) => /hoodie is doing a lot/i.test(t))).toBe(true);
  });

  const fullVars: Record<string, string> = {
    player: 'Alexandria', time: '11:42 PM', tod: 'this evening', day: 'Wednesday', place: 'the Physics Building',
    home: 'the Physics Building', food: 'banana protein shake', other: 'Piggy 2', otherplace: 'the Physics Building',
    last: 'the spinal cord', said: 'marine biology', n: '12', major: 'Medicine & Life Sciences', hometown: 'Saint Petersburg',
    comfort_food: 'grilled cheese', likes: 'board games', year: 'sophomore', exam: 'organic chemistry exam', chronotype: 'night owl',
    // the longest a sum and its answer can get (tests/talk-arithmetic.test.ts): nine digits and three decimals each, a product of two
    answer: 'negative 999,999,998,000,000,001.998001', expr: 'negative 999,999,999.999 divided by negative 999,999,999.999',
  };

  test('700+ handwritten lines', () => {
    let n = 0;
    for (const pig of PIG_IDS) {
      for (const lines of Object.values(LINES[pig].chat)) n += lines.length;
      for (const lines of Object.values(LINES[pig].greet)) n += lines.length;
      for (const lines of Object.values(LINES[pig].idle)) n += lines.length;
    }
    expect(n).toBeGreaterThanOrEqual(700);
  });

  test('every chat/greet line is valid, short, placeholder-safe and kind', () => {
    for (const pig of PIG_IDS) {
      for (const section of [LINES[pig].chat, LINES[pig].greet]) {
        for (const [key, lines] of Object.entries(section)) {
          expect(lines.length).toBeGreaterThan(0);
          for (const [e, text, opts] of lines) {
            const where = `${pig} ${key}: ${text}`;
            expect([where, EXPRESSIONS.includes(e)]).toEqual([where, true]);
            if (opts?.a) expect([where, ANIMS.has(opts.a)]).toEqual([where, true]);
            if (opts?.tier) expect(['N', 'F', 'W', 'NF', 'FW']).toContain(opts.tier);
            for (const p of placeholdersIn(text)) expect([where, KNOWN_PLACEHOLDERS.has(p.key)]).toEqual([where, true]);
            const filled = fill(text, fullVars) ?? '';
            expect([where, filled.length <= 280, sentenceCount(filled) <= 3, /[{}]/.test(filled)]).toEqual([where, true, true, false]);
            expect([where, BANNED.test(text)]).toEqual([where, false]);
            // the chat post-filter strips a leading speaker label like "Piggy 1:"
            expect([where, /^\s*(?:piggy\s*[123]?|pig|ai|bot|assistant)\s*:/i.test(text)]).toEqual([where, false]);
          }
        }
      }
    }
  });

  test('each pig covers the core intents with 4+ lines', () => {
    const core: Intent[] = [
      'greeting', 'farewell', 'thanks', 'how_are_you', 'whats_up', 'compliment_looks', 'compliment_skill', 'affection', 'hug',
      'insult', 'apology', 'joke_request', 'ask_name', 'ask_about_self', 'ask_major', 'ask_hobby', 'ask_favorite_food',
      'ask_schedule', 'hungry_talk', 'study', 'exam_stress', 'player_sad', 'player_happy', 'bored', 'gators_football',
      'question_generic', 'unknown',
    ];
    for (const pig of PIG_IDS) for (const i of core) expect([pig, i, LINES[pig].chat[i]?.length >= 4]).toEqual([pig, i, true]);
  });

  test('idle bubbles: ~8 per kind, all ≤ 60 chars, valid faces, no immediate repeats', () => {
    for (const pig of PIG_IDS) {
      for (const kind of IDLE_KINDS) {
        const options = idleOptions(pig, kind, { playerName: 'Bartholomew', bondLevel: 5 });
        expect([pig, kind, options.length >= 6]).toEqual([pig, kind, true]);
        for (const o of options) {
          expect(o.text.length).toBeLessThanOrEqual(IDLE_MAX_CHARS);
          expect(EXPRESSIONS).toContain(o.expression);
          expect(o.text).not.toMatch(BANNED);
        }
        let prev = '';
        for (let i = 0; i < 6; i++) {
          const line = idleLine(pig, kind, { bondLevel: 5 });
          expect(line.text.length).toBeLessThanOrEqual(IDLE_MAX_CHARS);
          expect(line.text).not.toBe(prev);
          prev = line.text;
        }
      }
    }
  });
});

describe('greeting and topics', () => {
  test('greeting is well-formed for every pig, time and tier', () => {
    for (const pig of PIG_IDS) {
      for (const timeOfDay of ['morning', 'day', 'evening', 'night'] as const) {
        for (const bondLevel of [0, 4, 9]) {
          const g = greeting(pig, ctx(pig, { timeOfDay, bondLevel, playerName: bondLevel ? 'Alex' : '' }));
          expectWellFormed({ ...g, source: 'heuristic' });
        }
      }
    }
  });

  test('greeting can check in about an earlier sad chat', () => {
    const at = Date.parse('2026-10-30T10:00:00');
    const hist: ChatTurn[] = [{ role: 'player', text: "i'm feeling really down", at }, { role: 'pig', text: '…', at: at + 1 }];
    const checkins = new Set(PIG_IDS.flatMap((p) => LINES[p].greet['greet:checkin_sad'].map((l) => l[1])));
    let hits = 0;
    for (let h = 12; h < 22; h++) {
      setClockOffset(Date.parse(`2026-10-30T${String(h).padStart(2, '0')}:05:00`) - Date.now());
      for (const pig of PIG_IDS) if (checkins.has(greeting(pig, ctx(pig), hist).text)) hits++;
    }
    setClockOffset(Date.parse('2026-10-30T15:42:00') - Date.now());
    expect(hits).toBeGreaterThan(0);
  });

  test('chips: 3–4 distinct, all understood, contextual', () => {
    for (const pig of PIG_IDS) {
      const chips = suggestTopics(pig, ctx(pig), []);
      expect(chips.length).toBeGreaterThanOrEqual(3);
      expect(chips.length).toBeLessThanOrEqual(4);
      expect(new Set(chips).size).toBe(chips.length);
      for (const c of chips) expect([c, classifyIntent(c, pig).intent === 'unknown']).toEqual([c, false]);
    }
    expect(suggestTopics('piggy-1', ctx('piggy-1', { needs: { hunger: 20, energy: 80, hygiene: 80, fun: 80 } }), [])).toContain('Want a snack?');
  });

  test('"based" chip appears for Piggy 2 only after he has said it', () => {
    expect(suggestTopics('piggy-2', ctx('piggy-2'), [])).not.toContain('based');
    const hist: ChatTurn[] = [{ role: 'player', text: 'hi', at: 1 }, { role: 'pig', text: 'Hello, Alex. Vitals look good. Based.', at: 2 }];
    expect(suggestTopics('piggy-2', ctx('piggy-2'), hist)).toContain('based');
    expect(suggestTopics('piggy-1', ctx('piggy-1'), hist)).not.toContain('based');
  });

  test('Piggy 1 chips follow the bump → set → spike call', () => {
    const hist: ChatTurn[] = [{ role: 'player', text: 'bump', at: 1 }, { role: 'pig', text: 'Set!', at: 2 }];
    expect(suggestTopics('piggy-1', ctx('piggy-1'), hist)[0]).toBe('Set');
    hist.push({ role: 'player', text: 'set', at: 3 }, { role: 'pig', text: 'SPIKE!!', at: 4 });
    expect(suggestTopics('piggy-1', ctx('piggy-1'), hist)[0]).toBe('Spike');
  });

  test('memory strings become fact slots', () => {
    expect(parseFacts(['major=Computing', 'comfort_food=soup', "Player's hometown is tampa.", 'Player likes cats.'])).toMatchObject({
      major: 'Computing', comfort_food: 'soup', hometown: 'Tampa', likes: 'cats',
    });
    expect(parseFacts(['major=Still deciding']).major).toBeUndefined();
    // what the player studies is the major only until they state one, wherever it sits in the list
    expect(parseFacts(['Player studies chem.', "Player's major is biology."]).major).toBe('biology');
    expect(parseFacts(['Player studies chem.', 'Player likes cats.']).major).toBe('chem');
    expect(parseFacts(["Player's major is political science."]).major).toBe('political science');
    expect(parseFacts(["Player's major is materials science and engineering."]).major).toBe('materials science and engineering');
  });
});
