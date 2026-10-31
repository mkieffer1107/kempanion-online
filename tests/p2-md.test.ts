// Piggy 2 is already a doctor: an MD and a neurosurgery resident at UF Health Shands (no PhD, not a med student). His
// lines, persona and scenes keep that canon. In chat, "the resident" means him, but a resident advisor, the resident
// in your dorm and Resident Evil do not. Medical questions still get the safety line (tests/ai.test.ts).
// He already has grants (PI on a small one) and is always writing the next application, so no grant is "his first" and
// grant talk is not held back to the weeks before p2_h7. He does not get much sleep, and says so dryly, in short lines.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIG_IDS, type ChatContext } from '../src/lib/types';
import { classifyIntent, respondHeuristic } from '../src/lib/ai/heuristic';
import { lastTopic, topicLabel } from '../src/lib/ai/heuristic/respond';
import { topicMatch } from '../src/lib/ai/topics';
import { extractEntities } from '../src/lib/ai/heuristic/entities';
import { LINES, type RawLine } from '../src/lib/ai/heuristic/lines';
import { CHARACTERS } from '../src/lib/content/characters';

/** Old canon: MD/PhD, med student, future neurosurgeon, boards "later", and "I outrank you" (the player may be a Resident). */
const OLD_CANON = /md ?\/ ?phd|\bphd\b|\bmed(?:ical)? student\b|student doctor|future neurosurgeon|second year of med school|boards later|\boutrank\b/i;

/** Old grant canon: waiting on his "first grant" (or his first as PI). He has grants already, and there is always another deadline. */
const FIRST_GRANT = /\bfirst grant\b|\bfirst as (?:a |the )?(?:PI|principal investigator)\b/i;

const P2 = LINES['piggy-2'];
const text = (l: string | RawLine) => (typeof l === 'string' ? l : l[1]);
const ownLines = [...Object.values(P2.chat), ...Object.values(P2.greet), ...Object.values(P2.idle)].flat().map(text);

const SCENES = join(import.meta.dir, '../src/lib/content/scenes');
const sceneLines = readdirSync(SCENES)
  .filter((f) => f.endsWith('.ks'))
  .flatMap((f) => readFileSync(join(SCENES, f), 'utf8').split('\n'))
  .filter((l) => /^\s*piggy-2 [a-z_]+:/.test(l));

function ctx(): ChatContext {
  return {
    playerName: 'Alex', pig: 'piggy-2', isCompanion: true, location: 'plaza', timeOfDay: 'day', clock: 'Fri 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 4, memories: [],
  };
}
const reply = (t: string) => respondHeuristic({ pig: 'piggy-2', playerText: t, history: [], context: ctx() }).text;

describe('Piggy 2 is an MD, a neurosurgery resident', () => {
  test('his job answer is neurosurgeon, and the persona knows', () => {
    expect(reply("what's your job?")).toMatch(/Neurosurg/);
    const c = CHARACTERS['piggy-2'];
    expect(c.year).toMatch(/\bMD\b/);
    expect(c.prompt).toMatch(/neurosurgery residen/i);
    expect(c.prompt).toMatch(/Student Health Care Center/);
  });

  test('his lines, persona and scene dialogue never use the old canon', () => {
    const c = CHARACTERS['piggy-2'];
    expect(sceneLines.length).toBeGreaterThan(100);
    for (const s of [c.role, c.year, c.summary, c.prompt, ...c.samples.map((x) => x.line), ...ownLines, ...sceneLines]) {
      expect([s, OLD_CANON.test(s)]).toEqual([s, false]);
    }
  });

  test('he already has grants and is always writing the next application: nothing calls a grant his first', () => {
    const c = CHARACTERS['piggy-2'];
    const file = (rel: string) => readFileSync(join(import.meta.dir, rel), 'utf8').split('\n');
    const pages = [...file('../src/lib/content/scenes/piggy2.ks'), ...file('../characters/piggy-2.md')];
    expect(pages.length).toBeGreaterThan(300);
    for (const s of [c.prompt, ...c.samples.map((x) => x.line), ...ownLines, ...pages]) {
      expect([s, FIRST_GRANT.test(s)]).toEqual([s, false]);
    }
  });

  test('grant talk is not held back to the weeks before p2_h7: there is always another deadline, at every bond tier', () => {
    const grants = [...Object.values(P2.chat), ...Object.values(P2.greet)].flat().filter((l) => /\bgrants?\b/i.test(l[1]));
    expect(grants.length).toBeGreaterThan(0);
    // a warm (♥7+) player still hears about the next one
    expect(grants.some((l) => !l[2]?.tier || l[2].tier.includes('W'))).toBe(true);
    // ...including the exam-stress line about it, which has no tier at all
    const deadline = P2.chat.exam_stress.filter((l) => /\balways another grant deadline\b/i.test(l[1]));
    expect(deadline.length).toBeGreaterThan(0);
    for (const l of deadline) expect([l[1], l[2]?.tier]).toEqual([l[1], undefined]);
  });

  test('"the resident", "the neurosurgeon" and "the doctor" mean him', () => {
    for (const t of ['where is the resident', 'tell me about the neurosurgeon', 'is the doctor busy today', 'what is the neurosurgery resident doing', 'the resident said hi']) {
      expect([t, extractEntities(t).pigs]).toEqual([t, ['piggy-2']]);
    }
  });

  test('other residents do not', () => {
    for (const t of [
      'have you played the resident evil games', 'the resident in my dorm is so loud', 'my ra the resident advisor yelled at me',
      'the resident assistant in my hall is nice', 'the residents in my dorm are loud', 'you are the resident expert on volleyball',
      'the resident on my floor keeps knocking',
    ]) {
      expect([t, extractEntities(t).pigs]).toEqual([t, []]);
    }
  });
});

// ── routing: what he is and does, and his residency as his topic ──

describe('Piggy 2: job and status questions get his job answers', () => {
  const pool = (key: string) => (P2.chat[key] ?? []).map(text);
  const answers = [...pool('ask_major'), ...pool('ask_about_self:job')];
  const route = (t: string, pig: (typeof PIG_IDS)[number] = 'piggy-2') => {
    const c = classifyIntent(t, pig);
    return c.topic ? `${c.intent}:${c.topic}` : c.intent;
  };

  test('"what do you do?", "are you a resident?", "did you match?" go to ask_major or ask_about_self:job', () => {
    for (const t of [
      'what do you do?', 'so what do you do', 'what do you do exactly?', 'what is your profession?', "what's your occupation",
      "what's your job?", 'are you a resident?', 'are you an intern?', 'are you a doctor?', 'are you a real doctor?',
      'are you a surgeon?', 'are you a neurosurgeon?', 'r u a doctor', 'are you still a student?', 'are you a med student?',
      'do you have a phd?', 'are you an md?', 'are you an attending?', 'did you match?', 'where did you match?',
      'did you match into neurosurgery?', 'are you in med school?', 'what kind of doctor are you?',
      'what year of residency are you in?', 'are you a pgy4?', 'hi! are you a doctor?', 'when was match day?',
      'are you a researcher?', 'are you a scientist?', 'what do you do lol', 'what do you do btw', 'are you still in training?',
    ]) {
      expect([t, ['ask_major', 'ask_about_self:job'].includes(route(t))]).toEqual([t, true]);
      const r = reply(t);
      // (after a lead-in for "hi!")
      expect([t, answers.some((a) => r === a || r.endsWith(` ${a}`))]).toEqual([t, true]);
    }
  });

  test('the other two answer with what they study; "match day" is a volleyball match to Piggy 1', () => {
    for (const pig of ['piggy-1', 'piggy-3'] as const) {
      for (const t of ['what do you do?', 'are you a doctor?', 'are you still a student?', 'did you match?']) {
        expect([t, pig, route(t, pig)]).toEqual([t, pig, 'ask_major']);
      }
    }
    expect(route("it's match day!", 'piggy-1')).toBe('passion_p1:volleyball');
    expect(route("it's match day!")).toBe('ask_major');
  });

  test('never a bare "match", a game, a dating app, Resident Evil, an RA or "what do you do for fun?"', () => {
    for (const t of [
      'did you win the match?', 'good match today!', 'did you match with anyone on tinder?', 'did you match your socks today?',
      'have you played resident evil?', 'are you a resident advisor?', 'what do you do for fun?', 'what do you do on weekends',
      'what do you do when you are stressed?', 'are you a pig?', 'are you a real person?', 'are you a gator fan?',
      'are you a dr pepper fan?', 'are you a Doctor Who fan?', 'are you in training for the tournament?',
    ]) {
      for (const pig of PIG_IDS) expect([t, pig, ['ask_major', 'ask_about_self:job'].includes(route(t, pig))]).toEqual([t, pig, false]);
    }
    expect(route('what do you do for fun?')).toBe('ask_hobby');
    expect(route('what do you do on weekends')).toBe('ask_hobby');
    expect(route('are you a real person?')).toBe('ask_about_self:what');
  });

  test('residency counts as his topic (the bond bonus), and he remembers it as "medicine", not "med school"', () => {
    for (const t of [
      "how's residency?", 'are you a resident?', 'how was your call night?', 'are you a doctor?', 'in-service exam soon?',
      'how is the grant going?', 'how is your research year?',
    ]) {
      expect([t, topicMatch('piggy-2', t)]).toEqual([t, true]);
    }
    for (const t of [
      'have you played resident evil?', 'my ra is a resident advisor', 'i take that for granted', 'the resident in my dorm is so loud',
      'the resident on my floor keeps knocking', 'you are the resident expert on volleyball',
    ]) {
      expect([t, topicMatch('piggy-2', t)]).toEqual([t, false]);
    }
    for (const pig of PIG_IDS) {
      const last = lastTopic([{ role: 'player', text: "how's residency going?", at: 1 }], pig);
      expect([pig, last && topicLabel(last)]).toEqual([pig, 'medicine']);
    }
  });

  test('his own chips get his answers and count as his topic ("Why pig spines?", "What are you researching?")', () => {
    expect(route('Why pig spines?')).toBe('passion_p2:spine');
    expect(pool('passion_p2:spine')).toContain(reply('Why pig spines?'));
    for (const t of ['Why pig spines?', 'What are you researching?', "What's perfusion?", "How's the research?", 'How were rounds?']) {
      expect([t, topicMatch('piggy-2', t)]).toEqual([t, true]);
    }
  });
});

// ── he does not get much sleep: part of him, said dryly and briefly, never a rant ──

describe('Piggy 2 does not get much sleep', () => {
  /** A sleep joke: sleep as his weakest vital sign, a perfusion issue, the call-room nap, the schedule, "one of us should". */
  const SLEEP_JOKE = /weakest vital sign|perfusion issue|call room|I average four|sleep schedule|One of us should|writing the next grant/i;
  const bank = { ...P2.chat, ...P2.greet };

  test('the persona says so (next to the grant he is always writing)', () => {
    expect(CHARACTERS['piggy-2'].prompt).toMatch(/always writing the next grant and get little sleep/);
    expect(CHARACTERS['piggy-2'].samples.some((x) => /^Sleep is a perfusion issue\. Mine is low\.$/.test(x.line))).toBe(true);
  });

  test('his tired, late, schedule, check-in and goodbye pools all joke about it, one short line each', () => {
    const pools = Object.entries(bank).filter(([, lines]) => lines.some((l) => SLEEP_JOKE.test(l[1]))).map(([key]) => key);
    for (const key of ['how_are_you', 'how_are_you:tired', 'whats_up:tired', 'ask_schedule', 'farewell', 'greet:late']) {
      expect([key, pools.includes(key)]).toEqual([key, true]);
    }
    expect(pools.length).toBeGreaterThanOrEqual(6);
    for (const l of Object.values(bank).flat().filter((x) => SLEEP_JOKE.test(x[1]))) {
      expect([l[1], l[1].length <= 100]).toEqual([l[1], true]);
    }
  });
});
