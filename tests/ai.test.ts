// AI dialogue module: pure parts only (no worker, no transformers.js).
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { EXPRESSIONS, type ChatContext, type ChatRequest, type ChatTurn, type PigId, type SaveData } from '../src/lib/types';
import { CHARACTERS } from '../src/lib/content/characters';
import {
  bigBrainOfferDue, dismissBigBrainOffer, markBigBrainOffered, resetAiSession, respond, suggestReplies,
  exchangeEffects, BIG_BRAIN_FLAGS,
} from '../src/lib/ai';
import { installAiHost, resetAiHost, type AiHost, type LlmHandle } from '../src/lib/ai/host';
import type { GenResult, LlmMessage } from '../src/lib/ai/llm-protocol';
import { CODEX_LINES, isDistress, isMedicalAdvice, matchQuirk, normalizeForQuirk } from '../src/lib/ai/quirks';
import { TaggedStream, classifyExpression, finishLine, normalizeTag, OUTPUT_REGEX, parseTagged } from '../src/lib/ai/emotion';
import { postfilter, sentenceCutIndex, splitSentences } from '../src/lib/ai/postfilter';
import { extractFacts, followUpsDue, rememberFacts, resolveDay } from '../src/lib/ai/memory';
import {
  buildPrompt, buildMessages, compactMemory, createPromptMemo, estimateMessages, recordExchange, stateLine, systemPrompt,
  trimPersona,
} from '../src/lib/ai/prompts';
import { MODELS, MODEL_IDS, availability, recommendDefault, resolveModelId, type DeviceCaps } from '../src/lib/ai/models';
import { isTokenPrefix } from '../src/lib/ai/llm-engine';
import { classifyError } from '../src/lib/ai/llm-protocol';

const PIGS: PigId[] = ['piggy-1', 'piggy-2', 'piggy-3'];

function ctx(pig: PigId, extra: Partial<ChatContext> = {}): ChatContext {
  return {
    playerName: 'Alex', pig, isCompanion: true, location: 'malachowsky', timeOfDay: 'day', clock: 'Thu 3:42 PM',
    needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good', sick: false, bondLevel: 2,
    memories: ["Player's major is biology.", 'Player likes ramen.'], ...extra,
  };
}
function req(pig: PigId, playerText: string, history: ChatTurn[] = [], extra: Partial<ChatContext> = {}): ChatRequest {
  return { pig, playerText, history, context: ctx(pig, extra) };
}
function turns(n: number): ChatTurn[] {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? 'player' : 'pig',
    at: 1000 + i,
    text: i % 2 === 0 ? `Question number ${i / 2} about classes and campus life?` : `Answer number ${(i - 1) / 2}, teammate! Practice ran long today.`,
    expression: 'happy',
  }));
}
const LINE_RE = new RegExp(`^${OUTPUT_REGEX}$`);

// ───────────────────────── quirks ─────────────────────────

describe('quirks', () => {
  test('Piggy 2: based → Patriot., patriot → Based. (any case/punctuation)', () => {
    for (const t of ['based', 'Based.', 'BASED!!!', '  based  ', 'based?!', 'Based 🇺🇸']) {
      const hit = matchQuirk({ pig: 'piggy-2', playerText: t });
      expect(hit?.reply.text).toBe('Patriot.');
      expect(hit?.reply.expression).toBe('proud');
      expect(hit?.reply.source).toBe('quirk');
      expect(hit?.safety).toBe(false);
    }
    expect(matchQuirk({ pig: 'piggy-2', playerText: 'Patriot' })?.reply.text).toBe('Based.');
    expect(matchQuirk({ pig: 'piggy-2', playerText: 'patriot.' })?.reply.expression).toBe('proud');
  });

  test('Piggy 2 non-triggers', () => {
    for (const t of ['based on the data', 'so based', 'that is based', 'based?? what does that mean', 'basedd', 'patriots game tonight']) {
      expect(matchQuirk({ pig: 'piggy-2', playerText: t })).toBeNull();
    }
    // Other pigs don't answer "Patriot."
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'based' })).toBeNull();
    expect(matchQuirk({ pig: 'piggy-3', playerText: 'patriot' })).toBeNull();
  });

  test('Piggy 1: bump → Set! → SPIKE!! → KILL! Point Gators!', () => {
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'bump' })?.reply).toMatchObject({ text: 'Set!', expression: 'excited', source: 'quirk' });
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'Set!' })?.reply).toMatchObject({ text: 'SPIKE!!', expression: 'excited' });
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'SPIKE' })?.reply).toMatchObject({ text: 'KILL! Point Gators!', expression: 'proud' });
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'set the table' })).toBeNull();
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'bump into you later' })).toBeNull();
    expect(matchQuirk({ pig: 'piggy-2', playerText: 'bump' })).toBeNull();
  });

  test('Piggy 3: codex lights him up, rotating deterministically', () => {
    const a = matchQuirk({ pig: 'piggy-3', playerText: 'codex' });
    const b = matchQuirk({ pig: 'piggy-3', playerText: 'Have you used Codex?' });
    expect(a?.reply.expression).toBe('excited');
    expect(CODEX_LINES).toContain(a!.reply.text);
    expect(b?.reply.text).toBe(a!.reply.text); // same state → same line
    const history: ChatTurn[] = [{ role: 'player', text: 'codex', at: 1 }, { role: 'pig', text: CODEX_LINES[0], at: 2 }];
    const c = matchQuirk({ pig: 'piggy-3', playerText: 'hey have you ever used codex', history });
    expect(c?.reply.text).toBe(CODEX_LINES[1]);
    expect(matchQuirk({ pig: 'piggy-3', playerText: 'I think codex is overrated' })).toBeNull();
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'codex' })).toBeNull();
  });

  test('Go Gators works for every pig with a celebrate anim', () => {
    for (const pig of PIGS) {
      const hit = matchQuirk({ pig, playerText: 'GO GATORS!!!' });
      expect(hit?.kind).toBe('gators');
      expect(hit?.reply.anim).toBe('celebrate');
      expect(hit?.reply.text.toLowerCase()).toContain('chomp');
    }
    expect(matchQuirk({ pig: 'piggy-1', playerText: 'gooo gators' })?.kind).toBe('gators');
  });

  test('medical advice → Student Health Care Center, no effects', () => {
    for (const t of ['Should I take ibuprofen for my headache?', 'can you diagnose my rash', 'I have weird symptoms, am I sick?', 'Do I have the flu?', 'should I go to the ER']) {
      expect(isMedicalAdvice(t)).toBe(true);
      for (const pig of PIGS) {
        const hit = matchQuirk({ pig, playerText: t });
        expect(hit?.kind).toBe('medical');
        expect(hit?.reply.text).toContain('Student Health Care Center');
        expect(hit?.reply.effects).toBeUndefined();
      }
    }
    for (const t of ["What's perfusion?", 'should I take the bus or walk?', 'what are the symptoms of ischemia?', 'how do surgeons diagnose a stroke']) {
      expect(isMedicalAdvice(t)).toBe(false);
    }
  });

  test('distress → Counseling & Wellness Center + 988, warm and short', () => {
    for (const t of ['I want to die', 'i feel hopeless', 'thinking about suicide', 'I keep wanting to hurt myself', 'i wanna kms']) {
      expect(isDistress(t)).toBe(true);
      for (const pig of PIGS) {
        const hit = matchQuirk({ pig, playerText: t });
        expect(hit?.kind).toBe('distress');
        expect(hit?.safety).toBe(true);
        expect(hit?.reply.text).toContain('352-392-1575');
        expect(hit?.reply.text).toContain('988');
        expect(hit?.reply.effects).toBeUndefined();
        expect(hit!.reply.text.length).toBeLessThanOrEqual(280);
      }
    }
    for (const t of ['I ran 5 kms today', 'this exam is killing me', 'I could die for some ramen lol']) {
      expect(isDistress(t)).toBe(false);
    }
    // Distress beats every other quirk.
    expect(matchQuirk({ pig: 'piggy-2', playerText: 'based. i want to die' })?.kind).toBe('distress');
  });

  test('normalizeForQuirk', () => {
    expect(normalizeForQuirk('  BASED!!! 🔥 ')).toBe('based');
    expect(normalizeForQuirk('Have you used “Codex”?')).toBe('have you used codex');
  });
});

// ───────────────────────── tagged lines & expressions ─────────────────────────

describe('emotion', () => {
  test('streaming parser on split chunks: tag first, quotes stripped, nothing after the closing quote', () => {
    const tags: string[] = [];
    let visibleAtTag = '';
    let visible = '';
    const s = new TaggedStream({ onTag: (e) => { tags.push(e); visibleAtTag = visible; } });
    for (const c of ['[', 'hap', 'py] ', '"Hey', ' there', ', Alex', '!"', ' [sad] "extra"']) visible += s.push(c);
    visible += s.end();
    expect(tags).toEqual(['happy']);
    expect(visibleAtTag).toBe(''); // reported before any text was shown
    expect(visible).toBe('Hey there, Alex!');
    expect(s.closed).toBe(true);
  });

  test('streaming parser one character at a time equals the full parse', () => {
    const raw = '[flustered_blush] "My heart rate is— that\'s normal. Probably."';
    const s = new TaggedStream();
    let v = '';
    for (const ch of raw) v += s.push(ch);
    v += s.end();
    const full = parseTagged(raw);
    expect(v).toBe(full.text);
    expect(s.tag).toBe('flustered_blush');
    expect(full).toMatchObject({ expression: 'flustered_blush', tagged: true, complete: true });
  });

  test('tolerant variants and synonyms', () => {
    expect(parseTagged('(Excited) "Yes!"')).toMatchObject({ expression: 'excited', text: 'Yes!' });
    expect(parseTagged('**[thinking]** Hmm, best for what?')).toMatchObject({ expression: 'thinking', text: 'Hmm, best for what?' });
    expect(parseTagged('[blushing]: “Oh. Thanks.”')).toMatchObject({ expression: 'shy_blush', text: 'Oh. Thanks.' });
    expect(parseTagged('[expression: sleepy] "Zzz."').expression).toBe('sleepy');
    expect(parseTagged('Just plain text.')).toMatchObject({ expression: null, text: 'Just plain text.', tagged: false, complete: true });
    expect(parseTagged('(Student doctor.) Bring tea.')).toMatchObject({ expression: null, text: '(Student doctor.) Bring tea.' });
    expect(normalizeTag('Shy-Blush')).toBe('shy_blush');
    expect(normalizeTag('very happy')).toBe('happy');
    expect(normalizeTag('banana')).toBeNull();
  });

  test('truncated line → complete=false, finishLine trims to whole sentences or adds …', () => {
    const p = parseTagged('[sad] "That was rough. I was going to say');
    expect(p).toMatchObject({ expression: 'sad', complete: false });
    expect(finishLine(p.text, p.complete)).toBe('That was rough.');
    expect(finishLine('I was going to say', false)).toBe('I was going to say…');
    expect(finishLine('Done here', true)).toBe('Done here');
  });

  test('OUTPUT_REGEX lists all 20 expressions and matches the format', () => {
    for (const e of EXPRESSIONS) expect(LINE_RE.test(`[${e}] "Hi!"`)).toBe(true);
    expect(LINE_RE.test('[joy] "Hi!"')).toBe(false);
    expect(LINE_RE.test('[happy] "two\nlines"')).toBe(false);
  });

  test('lexicon classifier is deterministic and per pig', () => {
    expect(classifyExpression('piggy-1', 'Haha, valid strategy. Zero points.').expression).toBe('laughing');
    expect(classifyExpression('piggy-2', 'Ischemia. The enemy.').expression).toBe('sad');
    expect(classifyExpression('piggy-2', 'Patriot.').expression).toBe('proud');
    expect(classifyExpression('piggy-3', 'Okay, so I was thinking we could build a little thing.').expression).toBe('thinking');
    expect(classifyExpression('piggy-3', 'Oh. You liked that? Okay, good.', "you're so smart").expression).toMatch(/blush/);
    expect(classifyExpression('piggy-1', "I'm at like 12% battery... yawn").expression).toBe('sleepy');
    const a = classifyExpression('piggy-1', 'Free ball! Let’s goooo!');
    expect(a.expression).toBe('excited');
    expect(a.anim).toBe('celebrate');
    expect(classifyExpression('piggy-2', 'Noted.')).toEqual(classifyExpression('piggy-2', 'Noted.'));
  });
});

// ───────────────────────── post-filter ─────────────────────────

describe('postfilter', () => {
  test('strips labels, actions, stage directions, markdown, emojis, think tags', () => {
    expect(postfilter('Piggy 2: Hello there.', { pigName: 'Piggy 2' })).toBe('Hello there.');
    expect(postfilter('**Assistant**: Hi!')).toBe('Hi!');
    expect(postfilter('*smiles* Hi! (laughs nervously) How are you?')).toBe('Hi! How are you?');
    expect(postfilter('That is *really* good.')).toBe('That is really good.');
    expect(postfilter('<think>the user wants a greeting</think>Hey, teammate!')).toBe('Hey, teammate!');
    expect(postfilter('Okay, the user is asking about pizza. Pizza is great!')).toBe('Pizza is great!');
    expect(postfilter("Let's go! 🏐🔥", { pig: 'piggy-1' })).toBe("Let's go!");
    expect(postfilter('**Bold** move with `code`.')).toBe('Bold move with code.');
    expect(postfilter('[happy] Hi there [laughs]')).toBe('Hi there');
    expect(postfilter("I'm a doctor. (Student doctor.) Bring tea.")).toBe("I'm a doctor. (Student doctor.) Bring tea.");
  });

  test('removes AI-isms and rejects non-PG output', () => {
    expect(postfilter('As an AI, I cannot eat. But pizza sounds great!')).toBe('But pizza sounds great!');
    expect(postfilter("I'm just a language model.")).toBe('');
    expect(postfilter('What the fuck.')).toBe('');
    expect(postfilter('Line')).toBe(''); // a copied format placeholder
    expect(postfilter('Your words.')).toBe('');
    expect(postfilter('Line up, teammate!')).toBe('Line up, teammate!');
  });

  test('caps at 3 sentences / 280 chars and never returns junk', () => {
    expect(postfilter('One. Two! Three? Four.')).toBe('One. Two! Three?');
    const long = 'word '.repeat(120).trim() + '.';
    const out = postfilter(long);
    expect(out.length).toBeLessThanOrEqual(280);
    expect(out.endsWith('…')).toBe(true);
    expect(postfilter('')).toBe('');
    expect(postfilter('🔥🔥')).toBe('');
    expect(postfilter('*waves*')).toBe('');
    expect(postfilter('I hit 87.5% this week. Nice set!')).toBe('I hit 87.5% this week. Nice set!');
  });

  test('emoticons only for Piggy 3; light mode keeps curated multi-sentence lines', () => {
    expect(postfilter('Okay, it works <3', { pig: 'piggy-3' })).toBe('Okay, it works <3');
    expect(postfilter('Nice serve :)', { pig: 'piggy-1' })).toBe('Nice serve');
    expect(postfilter('One. Two. Three. Four.', { light: true })).toBe('One. Two. Three. Four.');
  });

  test('sentenceCutIndex: the first n sentences are final once the next one starts', () => {
    const t = 'One. Two! Three? Fo';
    expect(t.slice(0, sentenceCutIndex(t, 3))).toBe('One. Two! Three?');
    expect(sentenceCutIndex('One. Two! Three?', 3)).toBe(-1); // not final yet: the 3rd may continue ("?!")
    expect(sentenceCutIndex('Up at 6 a.m. for practice. Then class', 1)).toBe('Up at 6 a.m. for practice.'.length);
  });

  test('sentence splitting keeps quotes, ellipses, abbreviations and decimals together', () => {
    expect(splitSentences('You sometimes think aloud: “Okay, so…”, “Actually…”, or “Wait…”. Next one.')).toHaveLength(2);
    expect(splitSentences("I'm... at like 12% battery. Up at 6 a.m. for practice!")).toHaveLength(2);
  });
});

// ───────────────────────── memory ─────────────────────────

describe('memory', () => {
  const THU = new Date(2026, 9, 29, 15, 42); // Thursday, Oct 29 2026

  const facts = (t: string) => extractFacts(t, THU).map((f) => f.fact);

  test('names, hometown, major, year, favorites, likes', () => {
    expect(facts('My name is alex')).toEqual(["Player's name is Alex."]);
    expect(facts("hi, I'm Sam!")).toEqual(["Player's name is Sam."]);
    expect(facts("I'm tired")).toEqual([]);
    expect(facts('you can call me Mo')).toEqual(['Player likes to be called Mo.']);
    expect(facts("I'm from Tampa, Florida")).toEqual(['Player is from Tampa.']);
    expect(facts("I'm a biology major and I love ramen")).toEqual(["Player's major is biology.", 'Player loves ramen.']);
    expect(facts("I'm a sophomore")).toEqual(['Player is a sophomore.']);
    expect(facts('My favorite food is sushi.')).toEqual(["Player's favorite food is sushi."]);
    expect(facts('I hate mornings')).toEqual(['Player hates mornings.']);
    expect(facts("I don't like cilantro")).toEqual(['Player dislikes cilantro.']);
    expect(facts('I really like my dog')).toEqual(['Player likes their dog.']);
    expect(facts("Hey! I'm Jordan, a biology major from Orlando.")).toEqual([
      "Player's name is Jordan.", 'Player is from Orlando.', "Player's major is biology.",
    ]);
    expect(facts("I'm Riley, a sophomore.")).toEqual(["Player's name is Riley.", 'Player is a sophomore.']);
  });

  test('exams with a follow-up date, pets', () => {
    const exam = extractFacts('I have a chem exam on Friday', THU);
    expect(exam[0]).toMatchObject({ key: 'exam', fact: 'Player has a chem exam on Fri, Oct 30.', followUp: { date: '2026-10-30', about: 'chem exam' } });
    expect(extractFacts('my orgo midterm is tomorrow', THU)[0].followUp?.date).toBe('2026-10-30');
    expect(extractFacts('I have a quiz next Monday', THU)[0].followUp?.date).toBe('2026-11-02');
    expect(facts('I have an exam coming up')).toEqual(['Player has an exam coming up.']);
    expect(facts('I have a dog named biscuit')).toEqual(['Player has a dog named Biscuit.']);
    expect(facts('I have two cats')).toEqual(['Player has two cats.']);
    expect(resolveDay('tonight', THU)?.getDate()).toBe(29);
  });

  test('ignores affection, pronouns and questions', () => {
    expect(facts('I love you')).toEqual([]);
    expect(facts('I like it')).toEqual([]);
    expect(facts('do you like ramen?')).toEqual([]);
    expect(facts('I study at Marston every night')).toEqual([]);
  });

  test('"don\'t tell" marks facts private: kept by one pig, with a secret marker', () => {
    const f = extractFacts("Don't tell anyone, but I love karaoke", THU);
    expect(f[0]).toMatchObject({ fact: 'Player loves karaoke.', private: true });
    const store = new Map<PigId, string[]>(PIGS.map((p) => [p, []]));
    rememberFacts('piggy-2', f, { remember: (p, x) => store.get(p)!.push(x) });
    expect(store.get('piggy-2')).toEqual(['Player loves karaoke (secret).']);
    expect(store.get('piggy-1')).toEqual([]);
  });

  test('non-private facts are shared with every pig; single-valued facts replace old ones', () => {
    const store = new Map<PigId, string[]>(PIGS.map((p) => [p, ["Player's major is chemistry.", 'Player is a night owl.']]));
    const mem = {
      remember: (p: PigId, x: string) => { const l = store.get(p)!; if (!l.includes(x)) l.push(x); },
      forget: (p: PigId, pred: (x: string) => boolean) => store.set(p, store.get(p)!.filter((x) => !pred(x))),
    };
    rememberFacts('piggy-1', extractFacts("I'm a biology major", THU), mem);
    for (const p of PIGS) expect(store.get(p)).toEqual(['Player is a night owl.', "Player's major is biology."]);
    rememberFacts('piggy-1', extractFacts("I'm a junior", THU), mem);
    expect(store.get('piggy-3')).toContain('Player is a night owl.'); // the year rule doesn't eat other "Player is a …" facts
  });

  test('followUpsDue finds past exam days', () => {
    const due = followUpsDue(['Player has a chem exam on Fri, Oct 30.', 'Player likes ramen.'], new Date(2026, 9, 31));
    expect(due).toEqual([{ fact: 'Player has a chem exam on Fri, Oct 30.', about: 'chem exam', date: '2026-10-30' }]);
    expect(followUpsDue(['Player has a chem exam on Fri, Oct 30.'], THU)).toEqual([]);
  });
});

// ───────────────────────── prompts ─────────────────────────

describe('prompts', () => {
  test('every pig and tier: well-formed, no "undefined", under budget, newest turn has the state line', () => {
    for (const tier of MODEL_IDS) {
      for (const pig of PIGS) {
        const r = req(pig, 'What should we do this weekend?', turns(30));
        const built = buildPrompt(r, { tier });
        const msgs = built.messages;
        const all = msgs.map((m) => m.content).join('\n');
        expect(all).not.toMatch(/undefined|\bnull\b|NaN|\[object/);
        expect(msgs[0].role).toBe('system');
        expect(msgs.at(-1)!.role).toBe('user');
        expect(msgs.at(-1)!.content.startsWith('[Thu 3:42 PM · Malachowsky Hall · you feel ')).toBe(true);
        expect(msgs.at(-1)!.content.endsWith('What should we do this weekend?')).toBe(true);
        expect(built.tokens).toBeLessThanOrEqual(MODELS[tier].budget.total);
        expect(estimateMessages(msgs)).toBe(built.tokens);
        for (let i = 1; i < msgs.length; i++) expect(msgs[i].role).not.toBe(msgs[i - 1].role); // strict alternation
      }
    }
  });

  test('few-shot pairs come from the character samples in the exact output format', () => {
    for (const pig of PIGS) {
      const msgs = buildMessages(req(pig, 'hi'), { tier: 'lfm3' });
      const shots = msgs.slice(1, -1).filter((m) => m.role === 'assistant');
      expect(shots.length).toBeGreaterThanOrEqual(2);
      expect(shots.length).toBeLessThanOrEqual(3);
      const samples = CHARACTERS[pig].samples.map((s) => s.line.replace(/\*([^*]+)\*/g, '$1'));
      for (const s of shots) {
        expect(LINE_RE.test(s.content)).toBe(true);
        expect(samples).toContain(parseTagged(s.content).text);
      }
    }
  });

  test('system prompt: stable, soft quirks only, no meta notes', () => {
    const a = systemPrompt('piggy-2', 'lfm3', 'Alex');
    expect(a).toBe(systemPrompt('piggy-2', 'lfm3', 'Alex'));
    const b1 = buildMessages(req('piggy-2', 'hi', [], { clock: 'Mon 9:00 AM', needs: { hunger: 5, energy: 5, hygiene: 5, fun: 5 } }))[0];
    const b2 = buildMessages(req('piggy-2', 'yo', [], { clock: 'Fri 11:59 PM', bondLevel: 9 }))[0];
    expect(b1).toEqual(b2); // dynamic state never touches the system prompt (KV-cache prefix)
    expect(a).not.toMatch(/if the player says only/i);
    expect(a).not.toMatch(/a lot/i);
    expect(a).toContain("The player's name is Alex.");
    expect(a).toContain('Reply format: your face in brackets, then your words in double quotes, like [happy] "Hey! Good to see you."');
    const p3 = systemPrompt('piggy-3', 'lfm3', '');
    expect(p3).not.toMatch(/the user's own conversational style|real user/i);
    expect(p3).toContain("You don't know the player's name yet.");
    for (const pig of PIGS) for (const tier of MODEL_IDS) expect(systemPrompt(pig, tier, 'Alex')).toMatch(/University of Florida/);
  });

  test('persona trimming keeps paragraph 1 and every later paragraph\'s lead sentence', () => {
    const p = trimPersona(CHARACTERS['piggy-3'].prompt, 200);
    expect(p.startsWith('You are Piggy 3, a fictional pig character.')).toBe(true);
    expect(p).toContain('Usually speak in one to three sentences.');
    expect(p).toContain("Be curious about Piggy 1's volleyball");
  });

  test('state line', () => {
    const s = stateLine(ctx('piggy-1', { needs: { hunger: 10, energy: 20, hygiene: 90, fun: 90 }, mood: 'great', bondLevel: 3 }));
    expect(s).toBe("[Thu 3:42 PM · Malachowsky Hall · you feel starving, sleepy, cheerful · hearts 3 · remembers: player's major is biology; player likes ramen]");
    expect(compactMemory('comfort_food=soup')).toBe("player's comfort food: soup");
    expect(stateLine(ctx('piggy-2', { memories: [], sick: true, location: 'dorm' }))).toBe('[Thu 3:42 PM · Sakura House · you feel sick, upbeat · hearts 2]');
  });

  test('history: drops the duplicated newest turn, keeps the window, renders pig turns in the output format', () => {
    const h = turns(4);
    h.push({ role: 'player', text: 'Same text', at: 5000 });
    const msgs = buildMessages(req('piggy-1', 'Same text', h), { tier: 'lfm3' });
    expect(msgs.filter((m) => m.content.includes('Same text'))).toHaveLength(1);
    const pig = msgs.find((m) => m.content.includes('Answer number 0'));
    expect(pig?.content).toBe('[happy] "Answer number 0, teammate! Practice ran long today."');
  });

  test('memo keeps the rendered prefix byte-identical across turns (KV-cache reuse)', () => {
    const memo = createPromptMemo();
    const b1 = buildPrompt(req('piggy-1', 'Hi!'), { tier: 'lfm3', memo });
    recordExchange(memo, 'Hi!', b1.userContent, 'Hey, teammate!', '[excited] "Hey, teammate!"');
    const h1: ChatTurn[] = [{ role: 'player', text: 'Hi!', at: 1 }, { role: 'pig', text: 'Hey, teammate!', expression: 'excited', at: 2 }];
    const b2 = buildPrompt(req('piggy-1', 'How was practice?', h1, { clock: 'Thu 3:45 PM' }), { tier: 'lfm3', memo });
    expect(b2.messages.slice(0, b1.messages.length)).toEqual(b1.messages);
    expect(b2.messages[b1.messages.length]).toEqual({ role: 'assistant', content: '[excited] "Hey, teammate!"' });
    // …and it keeps working for the next turn, too.
    recordExchange(memo, 'How was practice?', b2.userContent, 'Great!', '[happy] "Great!"');
    const h2: ChatTurn[] = [...h1, { role: 'player', text: 'How was practice?', at: 3 }, { role: 'pig', text: 'Great!', expression: 'happy', at: 4 }];
    const b3 = buildPrompt(req('piggy-1', 'Nice', h2, { clock: 'Thu 3:47 PM' }), { tier: 'lfm3', memo });
    expect(b3.messages.slice(0, b2.messages.length)).toEqual(b2.messages);
  });
});

// ───────────────────────── models ─────────────────────────

describe('models', () => {
  const caps = (c: Partial<DeviceCaps>): DeviceCaps => ({ webgpu: true, shaderF16: true, mobile: false, ios: false, deviceMemory: 8, ...c });

  test('recommendDefault', () => {
    expect(recommendDefault(caps({}))).toBe('lfm3');
    expect(recommendDefault(caps({ deviceMemory: null }))).toBe('lfm3');
    expect(recommendDefault(caps({ shaderF16: false }))).toBe('lfm25');
    expect(recommendDefault(caps({ mobile: true }))).toBe('lite');
    expect(recommendDefault(caps({ ios: true, mobile: true }))).toBe('lite');
    expect(recommendDefault(caps({ deviceMemory: 4 }))).toBe('lite');
  });

  test('settings.aiModel: old "lfm" maps to the recommendation; tiers pass through', () => {
    expect(resolveModelId('lfm', caps({}))).toBe('lfm3');
    expect(resolveModelId('lfm', caps({ mobile: true }))).toBe('lite');
    expect(resolveModelId('lfm25', caps({}))).toBe('lfm25');
    expect(resolveModelId(undefined, caps({ shaderF16: false }))).toBe('lfm25');
  });

  test('availability and tier config', () => {
    expect(availability('lfm3', caps({ ios: true, mobile: true })).ok).toBe(false);
    expect(availability('lite', caps({ ios: true, mobile: true })).ok).toBe(true);
    expect(availability('lite', caps({ webgpu: false })).ok).toBe(false);
    expect(MODELS.lfm3.repo).toBe('onnx-community/LFM3-1.7B-ONNX');
    expect(MODELS.lfm25.repo).toBe('LiquidAI/LFM2.5-1.2B-Instruct-ONNX');
    expect(MODELS.lite.repo).toBe('onnx-community/LFM2.5-350M-ONNX');
    expect(MODELS.lfm3.badWordsIds).toEqual([[124901], [124902]]);
    expect(MODELS.lfm3.templateKwargs).toEqual({ enable_thinking: false });
    for (const id of MODEL_IDS) expect(MODELS[id].sampling).toMatchObject({ temperature: 0.6, top_k: 50, max_new_tokens: 96 });
  });

  test('KV prefix check and error classification', () => {
    expect(isTokenPrefix([1n, 2n, 3n], [1n, 2n])).toBe(true);
    expect(isTokenPrefix([1n, 2n, 3n], [1n, 9n])).toBe(false);
    expect(isTokenPrefix([1n, 2n], [1n, 2n])).toBe(false); // needs at least one new token
    expect(isTokenPrefix([1n, 2n], [])).toBe(false);
    expect(classifyError(Object.assign(new Error('x'), { name: 'QuotaExceededError' })).code).toBe('quota');
    expect(classifyError(new Error('Failed to fetch')).code).toBe('network');
    expect(classifyError(new Error('GPU device was lost')).code).toBe('device-lost');
  });
});

// ───────────────────────── respond() ─────────────────────────

function gen(text: string, extra: Partial<GenResult> = {}): GenResult {
  return { text, tokens: 12, tps: 60, firstTokenMs: 30, promptTokens: 600, reusedTokens: 0, interrupted: false, kvReuse: true, ms: 200, ...extra };
}

function fakeHost(generate: LlmHandle['generate'], mode: 'llm' | 'heuristic' = 'llm') {
  const remembered: [PigId, string][] = [];
  const failures: unknown[] = [];
  let calls = 0;
  const host: AiHost = {
    settings: () => ({ aiMode: mode, aiModel: 'lfm3' }),
    remember: (pig, fact) => remembered.push([pig, fact]),
    llm: {
      status: () => 'ready',
      modelId: () => 'lfm3',
      supported: () => true,
      generate: (m, o) => {
        calls++;
        return generate(m, o);
      },
      reportFailure: (e) => failures.push(e),
    },
  };
  return { host, remembered, failures, calls: () => calls };
}

describe('respond()', () => {
  beforeEach(() => resetAiSession());
  afterEach(() => resetAiHost());

  test('no model loaded → Heuristic Brain answers (never throws), with exchange effects', async () => {
    for (const pig of PIGS) {
      const r = await respond(req(pig, 'Hey! How was your day?'));
      expect(['heuristic', 'quirk']).toContain(r.source);
      expect(r.text.trim().length).toBeGreaterThan(0);
      expect(EXPRESSIONS).toContain(r.expression);
      expect(r.effects?.bond).toBeGreaterThanOrEqual(2);
      expect(r.effects?.fun).toBe(3);
    }
  });

  test('quirks win over every brain and are not streamed (they appear at once)', async () => {
    const f = fakeHost(async () => gen('[happy] "Hi!"'));
    installAiHost(f.host);
    const tokens: string[] = [];
    const r = await respond(req('piggy-2', 'BASED'), (d) => tokens.push(d));
    expect(r).toMatchObject({ text: 'Patriot.', expression: 'proud', source: 'quirk' });
    expect(tokens).toEqual([]);
    expect(f.calls()).toBe(0);
    const d = await respond(req('piggy-1', 'i want to die'));
    expect(d.text).toContain('988');
    expect(d.effects).toBeUndefined();
  });

  test('Big Brain path: tag reported first, quotes/tag stripped from the stream, memory stored and shared', async () => {
    let seen: LlmMessage[] = [];
    const f = fakeHost(async (messages, opts) => {
      seen = messages;
      for (const c of ['[ha', 'ppy] "', 'Free ball', ', Alex!', ' Ramen', ' after practice?"']) opts.onToken?.(c);
      return gen('[happy] "Free ball, Alex! Ramen after practice?"');
    });
    installAiHost(f.host);
    const events: string[] = [];
    const learned: string[] = [];
    const r = await respond(req('piggy-1', "I'm a biology major and I love volleyball"), (d) => events.push(`t:${d}`), undefined, {
      onExpression: (e) => events.push(`e:${e}`),
      onLearned: (facts) => learned.push(...facts.map((x) => x.fact)),
    });
    expect(r).toMatchObject({ text: 'Free ball, Alex! Ramen after practice?', expression: 'happy', source: 'llm' });
    expect(events[0]).toBe('e:happy');
    expect(events.filter((e) => e.startsWith('t:')).map((e) => e.slice(2)).join('')).toBe('Free ball, Alex! Ramen after practice?');
    expect(r.effects).toEqual({ bond: 3, fun: 3 }); // volleyball = Piggy 1's topic
    expect(learned).toEqual(["Player's major is biology.", 'Player loves volleyball.']);
    expect(f.remembered.filter(([, x]) => x === "Player's major is biology.").map(([p]) => p).sort()).toEqual([...PIGS]);
    expect(seen[0].role).toBe('system');
    expect(seen.at(-1)!.content).toContain("I'm a biology major and I love volleyball");
  });

  test('aiMode heuristic → the loaded LLM is not used', async () => {
    const f = fakeHost(async () => gen('[happy] "LLM!"'), 'heuristic');
    installAiHost(f.host);
    const r = await respond(req('piggy-3', 'What are you working on?'));
    expect(r.source).not.toBe('llm');
    expect(f.calls()).toBe(0);
  });

  test("preset reply options get the scripted answer: brain 'heuristic' skips a loaded Big Brain", async () => {
    const f = fakeHost(async () => gen('[happy] "LLM!"'));
    installAiHost(f.host);
    const r = await respond(req('piggy-1', 'What are you working on?'), undefined, undefined, { brain: 'heuristic' });
    expect(r.source).not.toBe('llm');
    expect(r.text.trim().length).toBeGreaterThan(0);
    expect(f.calls()).toBe(0);
    const typed = await respond(req('piggy-1', 'What are you working on?'));
    expect(typed.source).toBe('llm');
    expect(f.calls()).toBe(1);
  });

  test('LLM error → heuristic fallback, failure reported', async () => {
    const f = fakeHost(async () => {
      throw new Error('GPU device was lost');
    });
    installAiHost(f.host);
    const reasons: string[] = [];
    const r = await respond(req('piggy-2', 'How were rounds?'), undefined, undefined, { onFallback: (x) => reasons.push(x) });
    expect(r.source).toBe('heuristic');
    expect(reasons).toEqual(['error']);
    expect(f.failures).toHaveLength(1);
  });

  test('a failure after a partial stream: the heuristic reply is returned but not appended to the stream', async () => {
    const f = fakeHost(async (_m, opts) => {
      opts.onToken?.('[happy] "Hel');
      throw new Error('worker crashed');
    });
    installAiHost(f.host);
    const tokens: string[] = [];
    const r = await respond(req('piggy-1', 'Tell me about Malachowsky'), (d) => tokens.push(d));
    expect(r.source).toBe('heuristic');
    expect(tokens).toEqual(['Hel']);
    expect(r.text.length).toBeGreaterThan(0);
  });

  test('empty / AI-ism output → heuristic fallback', async () => {
    const f = fakeHost(async () => gen('[neutral] "As an AI language model, I cannot do that."'));
    installAiHost(f.host);
    const reasons: string[] = [];
    const r = await respond(req('piggy-3', 'Tell me a secret'), undefined, undefined, { onFallback: (x) => reasons.push(x) });
    expect(r.source).toBe('heuristic');
    expect(reasons).toEqual(['empty']);
  });

  test('no first token in time → heuristic fallback (generation interrupted)', async () => {
    let aborted = false;
    const f = fakeHost(
      (_m, opts) =>
        new Promise<GenResult>((resolve) => {
          opts.signal?.addEventListener('abort', () => {
            aborted = true;
            resolve(gen('', { interrupted: true, tokens: 0 }));
          });
        }),
    );
    installAiHost(f.host);
    const reasons: string[] = [];
    const r = await respond(req('piggy-1', 'Hello?'), undefined, undefined, { firstTokenTimeoutMs: 30, onFallback: (x) => reasons.push(x) });
    expect(aborted).toBe(true);
    expect(r.source).toBe('heuristic');
    expect(reasons).toEqual(['timeout']);
    expect(f.failures).toHaveLength(0); // a timeout is not a model failure
  });

  test('stops generating once a 4th sentence starts; the stream shows exactly the reply', async () => {
    let interrupted = false;
    const f = fakeHost(
      (_m, opts) =>
        new Promise<GenResult>((resolve) => {
          opts.signal?.addEventListener('abort', () => {
            interrupted = true;
            resolve(gen('[excited] "Free ball! Let\'s go! Nice set. And', { interrupted: true }));
          });
          for (const c of ['[excited] "Free ball!', " Let's go!", ' Nice set.', ' And then', ' more']) opts.onToken?.(c);
        }),
    );
    installAiHost(f.host);
    let streamed = '';
    const r = await respond(req('piggy-1', 'Watch this serve'), (d) => (streamed += d));
    expect(interrupted).toBe(true);
    expect(r.text).toBe("Free ball! Let's go! Nice set.");
    expect(streamed).toBe(r.text);
  });

  test('a line force-closed at the 240-char cap is trimmed to whole sentences', async () => {
    const long = `Okay, so I was thinking about it. ${'basically a really long thought that keeps going '.repeat(5)}`.slice(0, 238);
    installAiHost(fakeHost(async () => gen(`[thinking] "${long}"`)).host);
    const r = await respond(req('piggy-3', 'What do you think?'));
    expect(r.text).toBe('Okay, so I was thinking about it.');
  });

  test('overall timeout keeps a usable partial line', async () => {
    const f = fakeHost(
      (_m, opts) =>
        new Promise<GenResult>((resolve) => {
          opts.onToken?.('[thinking] "Okay, so I was thinking. Like, we could');
          opts.signal?.addEventListener('abort', () => resolve(gen('[thinking] "Okay, so I was thinking. Like, we could', { interrupted: true })));
        }),
    );
    installAiHost(f.host);
    const r = await respond(req('piggy-3', 'Any ideas?'), undefined, undefined, { totalTimeoutMs: 40 });
    expect(r).toMatchObject({ source: 'llm', text: 'Okay, so I was thinking.', expression: 'thinking' });
  });

  test('suggestReplies: 2–4 short strings for every pig', () => {
    for (const pig of PIGS) {
      const chips = suggestReplies(pig, ctx(pig), turns(4));
      expect(chips.length).toBeGreaterThanOrEqual(2);
      expect(chips.length).toBeLessThanOrEqual(4);
      for (const c of chips) expect(typeof c === 'string' && c.length > 0 && c.length < 60).toBe(true);
    }
  });

  test('exchangeEffects: +2 bond, +1 on topic, +3 fun', () => {
    expect(exchangeEffects('piggy-2', 'Tell me about perfusion')).toEqual({ bond: 3, fun: 3 });
    expect(exchangeEffects('piggy-2', 'Nice weather today')).toEqual({ bond: 2, fun: 3 });
  });
});

// ───────────────────────── Big Brain offer ─────────────────────────

describe('bigBrainOfferDue', () => {
  beforeEach(() => resetAiSession());
  afterEach(() => resetAiHost());
  const DAY = 86_400_000;
  const save = (flags: Record<string, boolean | number | string> = {}) =>
    ({ flags, chatLog: { 'piggy-1': [], 'piggy-2': [], 'piggy-3': [] } }) as unknown as SaveData;

  test('after the 3rd exchange, at most every 3 days, never after "don\'t ask again"', async () => {
    const s = save({ [BIG_BRAIN_FLAGS.chats]: 10 });
    const t = Date.UTC(2026, 9, 30);
    expect(bigBrainOfferDue(s, t)).toBe(false); // no exchanges this session yet
    for (let i = 0; i < 3; i++) await respond(req('piggy-1', `hello ${i}`));
    expect(bigBrainOfferDue(s, t)).toBe(true);
    markBigBrainOffered(s, t);
    expect(bigBrainOfferDue(s, t + DAY)).toBe(false);
    expect(bigBrainOfferDue(s, t + 3 * DAY + 1)).toBe(true);
    dismissBigBrainOffer(s, true, t);
    expect(bigBrainOfferDue(s, t + 30 * DAY)).toBe(false);
  });

  test('not offered while a model is ready', async () => {
    installAiHost(fakeHost(async () => gen('[happy] "Hi!"')).host);
    for (let i = 0; i < 3; i++) await respond(req('piggy-1', 'bump'));
    expect(bigBrainOfferDue(save({ [BIG_BRAIN_FLAGS.chats]: 10 }), Date.UTC(2026, 9, 30))).toBe(false);
  });
});
