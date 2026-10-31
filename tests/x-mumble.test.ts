// Piggy 3 and X. "Are you on X?" plays his mumble: he answers, holds his phone out, and drifts into a quiet, fast,
// under-his-breath run of AI terms to himself (small text, trailing "…", self-interruptions, half-finished words, bubble
// words popping around him), then catches himself, a little embarrassed. Mumbling, never ranting. "Are you on Twitter?"
// gets corrected (comically angry, never mean): it's X. X.com. The mumble reaches the Talk screen through the reply-effect
// contract (types.ts ChatReply.effect / ChatMumble), which the router passes through whole.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { ChatReply, ChatRequest, ChatTurn, PigId } from '../src/lib/types';
import { classifyIntent, sentenceCount } from '../src/lib/ai/heuristic';
import {
  isMumbleReply, isTwitterQuestion, mumbleFor, mumbleKindOf, mumbleReply, mumbleText, MUMBLE_BUBBLE_WORDS, MUMBLE_FACES,
  MUMBLE_LIMITS, MUMBLE_TEXTS, X_CORRECTIONS, type MumbleKind,
} from '../src/lib/ai/heuristic/mumble';
import { CODEX_LINES, isSafetyReply, matchQuirk, normalizeForQuirk } from '../src/lib/ai/quirks';
import { resetAiSession, respond, withEffect } from '../src/lib/ai';
import { installAiHost, resetAiHost, type AiHost } from '../src/lib/ai/host';
import { pageLine, PHONE_GRID } from '../src/lib/vn/chat-pages';

const KINDS: readonly MumbleKind[] = ['on_x', 'timeline', 'doomscroll'];
const quirkFor = (pig: PigId, playerText: string, history: ChatTurn[] = []) => matchQuirk({ pig, playerText, history });
/** Ask the same thing `n` times in one chat; the replies, in order. */
function askRepeatedly(text: string, n: number): ChatReply[] {
  const history: ChatTurn[] = [];
  const out: ChatReply[] = [];
  for (let i = 0; i < n; i++) {
    const r = quirkFor('piggy-3', text, history)!.reply;
    out.push(r);
    history.push({ role: 'player', text, at: i * 2 }, { role: 'pig', text: r.text, at: i * 2 + 1 });
  }
  return out;
}

describe('"Are you on Twitter?": it\'s X (Piggy 3 only)', () => {
  const ASKS = ['Are you on Twitter?', 'are u on twitter', 'do you tweet?', 'Twitter?', 'the bird app', "what's your twitter?", 'hey piggy 3, you on twitter?', 'do you still use twitter lol'];

  test('a quirk under either brain: correction #1 first, comically angry, scored like any quirk', () => {
    for (const t of ASKS) {
      expect([t, isTwitterQuestion(normalizeForQuirk(t))]).toEqual([t, true]);
      const hit = quirkFor('piggy-3', t);
      expect([t, hit?.reply.text]).toEqual([t, X_CORRECTIONS[0][0]]);
      expect(hit?.reply).toMatchObject({ expression: 'angry', anim: 'angry', source: 'quirk', effects: { bond: 2, fun: 3 } });
      expect(hit?.safety).toBe(false);
      expect(hit?.reply.effect).toBeUndefined();
    }
  });

  test('asked again, he rotates through all six lines (never the same twice in a row); every one says X', () => {
    const said = askRepeatedly('Are you on Twitter?', X_CORRECTIONS.length * 2).map((r) => r.text);
    expect(new Set(said).size).toBe(X_CORRECTIONS.length);
    for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1]);
    for (const t of said) expect(t).toMatch(/\bX\b/);
    // his own slip is the one flustered line
    const slip = askRepeatedly('Are you on Twitter?', X_CORRECTIONS.length)[3];
    expect(slip).toMatchObject({ expression: 'flustered_blush', anim: 'shy' });
  });

  test('longer messages that say Twitter are not the quirk (the bank answers them); Piggy 1 and Piggy 2 are never corrected', () => {
    for (const t of ['i saw it on twitter', 'is x still twitter?', 'twitter is dead', 'retweet this', 'are you on x or twitter']) {
      expect([t, quirkFor('piggy-3', t)]).toEqual([t, null]);
      expect([t, classifyIntent(t, 'piggy-3')]).toMatchObject([t, { intent: 'passion_p3', topic: 'twitter' }]);
    }
    for (const pig of ['piggy-1', 'piggy-2'] as const) {
      for (const t of ASKS) expect([pig, t, quirkFor(pig, t)]).toEqual([pig, t, null]);
    }
  });

  test('the corrections keep the bank rules: ≤ 280 characters, ≤ 3 sentences, no bird, no logo, never mean', () => {
    for (const [t, face] of X_CORRECTIONS) {
      expect([t, t.length <= 280, sentenceCount(t) <= 3]).toEqual([t, true, true]);
      expect([t, /\bbird\b|\blogo\b|\bdumb\b|\bstupid\b|\bhate\b/i.test(t)]).toEqual([t, false]);
      expect(['angry', 'flustered_blush']).toContain(face);
    }
  });
});

describe('"Are you on X?": when he mumbles', () => {
  const ON_X = ['Are you on X?', 'are you on x', 'r u on x', 'X.com?', 'x dot com', 'do you use X?', 'hey, are you on x?', 'you on x?', 'are you still on x lol'];
  const TIMELINE = ["What's on your timeline?", 'anything good on X today?', 'did you see anything on x', "how's the timeline?", "what's new on your feed", "what's on x?"];
  const DOOM = ['Doomscrolling again?', 'are you doomscrolling?', 'still doomscrolling lol', 'stop doomscrolling'];
  const NOT = [
    'solve for x', 'what is x', 'x ray', 'i love x', 'i was doomscrolling all night', 'are you on x or twitter', 'x',
    'are you on xanax', 'do you have an xbox', 'are you on call', "what's your timeline for finishing?", 'i saw it on x yesterday and it was wild',
  ];

  test('short, direct questions only, and only for Piggy 3', () => {
    for (const t of ON_X) expect([t, mumbleKindOf(normalizeForQuirk(t))]).toEqual([t, 'on_x']);
    for (const t of TIMELINE) expect([t, mumbleKindOf(normalizeForQuirk(t))]).toEqual([t, 'timeline']);
    for (const t of DOOM) expect([t, mumbleKindOf(normalizeForQuirk(t))]).toEqual([t, 'doomscroll']);
    for (const t of NOT) expect([t, mumbleKindOf(normalizeForQuirk(t))]).toEqual([t, null]);
    for (const pig of ['piggy-1', 'piggy-2'] as const) {
      for (const t of [...ON_X, ...TIMELINE, ...DOOM]) expect([pig, t, quirkFor(pig, t)]).toEqual([pig, t, null]);
    }
    // a safety line always comes first, X or not
    expect(quirkFor('piggy-3', 'are you on x? i want to die')?.safety).toBe(true);
  });
});

describe('the mumble', () => {
  test("the first one says the owner's five words, then he catches himself; the reply carries the effect", () => {
    const hit = quirkFor('piggy-3', 'Are you on X?')!;
    const r = hit.reply;
    expect(hit.safety).toBe(false);
    expect(r).toMatchObject({ effect: 'mumble', source: 'quirk', expression: 'thinking', effects: { bond: 3, fun: 3 } });
    expect(isMumbleReply(r)).toBe(true);
    expect(isSafetyReply(r)).toBe(false);
    const m = r.mumble!;
    expect(m.kind).toBe('on_x');
    expect(r.text).toBe(`${m.opener} ${m.stream} ${m.catch}`);
    expect(r.text).toBe(mumbleText(m));
    for (const w of ['Jev', 'foundation model', 'LLM', 'RLHF', 'RLVR']) expect([w, m.stream.includes(w)]).toEqual([w, true]);
    expect(m.opener).toBe('X? Oh— yeah. Okay, did you see the Jev thing? Look—');
    expect(m.catch).toBe("…sorry. I was mumbling again. Yes. I'm on X.com. A lot.");
    expect(m.faces).toEqual({ opener: 'phone', stream: 'phone_mumble', catch: 'flustered_blush' });
    expect(m.faces).toEqual(MUMBLE_FACES);
    // the same canonical stream whichever way he was first asked; each kind opens in its own words
    const streams = new Set(KINDS.map((k) => mumbleFor(k, 0).stream));
    const openers = new Set(KINDS.map((k) => mumbleFor(k, 0).opener));
    expect([streams.size, openers.size]).toEqual([1, 3]);
    expect(quirkFor('piggy-3', 'doomscrolling again?')!.reply.mumble!.kind).toBe('doomscroll');
  });

  test('later asks: new mumbles, deterministic, within the limits, one bubble word per fragment at its offset', () => {
    const streams = new Set<string>();
    let minStream = Infinity;
    let maxStream = 0;
    for (const kind of KINDS) {
      for (let asked = 0; asked <= 60; asked++) {
        for (let turns = 0; turns < 24; turns++) {
          const m = mumbleFor(kind, asked, turns);
          const key = [kind, asked, turns];
          expect([key, mumbleFor(kind, asked, turns)]).toEqual([key, m]);
          streams.add(m.stream);
          minStream = Math.min(minStream, m.stream.length);
          maxStream = Math.max(maxStream, m.stream.length);
          expect([key, m.fragments.length >= MUMBLE_LIMITS.minFragments, m.fragments.length <= MUMBLE_LIMITS.maxFragments]).toEqual([key, true, true]);
          expect([key, m.opener.length <= MUMBLE_LIMITS.opener, m.catch.length <= MUMBLE_LIMITS.catch]).toEqual([key, true, true]);
          expect(m.stream).toBe(m.fragments.join(' '));
          expect(m.bubbles.length).toBe(m.fragments.length);
          m.bubbles.forEach((b, i) => {
            expect([key, i, m.stream.startsWith(m.fragments[i], b.at)]).toEqual([key, i, true]);
            expect(MUMBLE_BUBBLE_WORDS).toContain(b.word);
          });
          expect(m.faces).toEqual(MUMBLE_FACES);
        }
      }
    }
    expect(minStream).toBeGreaterThanOrEqual(MUMBLE_LIMITS.streamMin);
    expect(maxStream).toBeLessThanOrEqual(MUMBLE_LIMITS.stream);
    expect(streams.size).toBeGreaterThan(500);
  });

  test('asking again in the same chat gets the next one: six asks, six different mumbles, each with the effect', () => {
    for (const ask of ['Are you on X?', "What's on your timeline?", 'doomscrolling again?']) {
      const replies = askRepeatedly(ask, 6);
      expect([ask, new Set(replies.map((r) => r.text)).size]).toEqual([ask, 6]);
      for (const r of replies) expect([ask, isMumbleReply(r), r.text === mumbleText(r.mumble!)]).toEqual([ask, true, true]);
    }
    // the asks are counted across kinds: "are you on X?" after "what's on your timeline?" is a later ask, not the canon again
    const hist: ChatTurn[] = [{ role: 'player', text: "what's on your timeline?", at: 1 }, { role: 'pig', text: 'Okay.', at: 2 }];
    expect(quirkFor('piggy-3', 'Are you on X?', hist)!.reply.mumble!.stream).not.toBe(mumbleFor('on_x', 0).stream);
  });

  test('paging: the opener and the catch are one page each; the stream ≤ 3 pages (≤ 2 in the mumble font); the plain text ≤ 4', () => {
    const MUMBLE_FONT_PHONE = { cols: 56, rows: 5 }; // the phone box at the 0.75em mumble font
    const DESKTOP = { cols: 88, rows: 3 };
    for (const kind of KINDS) {
      for (let asked = 0; asked < 16; asked++) {
        for (let turns = 0; turns < 4; turns++) {
          const m = mumbleFor(kind, asked, turns);
          const key = [kind, asked, turns];
          expect([key, pageLine(m.opener, PHONE_GRID).length, pageLine(m.catch, PHONE_GRID).length]).toEqual([key, 1, 1]);
          expect([key, pageLine(m.stream, PHONE_GRID).length <= 3, pageLine(m.stream, DESKTOP).length <= 3]).toEqual([key, true, true]);
          expect([key, pageLine(m.stream, MUMBLE_FONT_PHONE).length <= 2]).toEqual([key, true]);
          // a UI that doesn't play the effect pages the whole reply as one ordinary chat line
          const text = mumbleReply(kind, asked, turns).text;
          expect([key, pageLine(text, PHONE_GRID).length <= 4, pageLine(text, DESKTOP).length <= 3]).toEqual([key, true, true]);
        }
      }
    }
  });

  test('mumbling, not ranting: lowercase-led fragments trailing off, small bubbles, no shouting, names, pork or emoji', () => {
    for (const f of MUMBLE_TEXTS.fragments) {
      expect([f, f.length <= MUMBLE_LIMITS.fragment, /[…—]$/.test(f), /!/.test(f)]).toEqual([f, true, true, false]);
      expect([f, /^[a-z“]|^(?:GEPA|F-H-I-R|ICD|AUROC|EEG|RLHF|SFT|Jev)\b/.test(f)]).toEqual([f, true]);
    }
    for (const d of MUMBLE_TEXTS.drifts) expect([d, /^[a-z][a-z ,]*—$/.test(d)]).toEqual([d, true]);
    for (const w of MUMBLE_BUBBLE_WORDS) expect([w, [...w].length <= MUMBLE_LIMITS.bubble]).toEqual([w, true]);
    for (const t of MUMBLE_TEXTS.openers) expect([t, t.length <= MUMBLE_LIMITS.opener]).toEqual([t, true]);
    for (const t of MUMBLE_TEXTS.catches) expect([t, t.length <= MUMBLE_LIMITS.catch]).toEqual([t, true]);
    const all = [...MUMBLE_TEXTS.fragments, ...MUMBLE_TEXTS.openers, ...MUMBLE_TEXTS.catches, ...MUMBLE_BUBBLE_WORDS].join(' ');
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(all).not.toMatch(/bacon|\bhams?\b|pork|openai|anthropic|google|meta\b|nvidia|vercel|elon|musk|mathnasium/i);
    // he only says "Twitter" when correcting it: never in a mumble
    expect(all).not.toMatch(/twitter|tweet/i);
    // the stream is to himself: no question to the player, no "you" until he snaps out of it
    for (const f of MUMBLE_TEXTS.fragments) expect([f, /\byou\b/i.test(f)]).toEqual([f, false]);
  });

  test('his Codex lines are about what he builds now (no 3D printer)', () => {
    expect(CODEX_LINES.some((t) => /\b3d\b|print|filament|spaghetti/i.test(t))).toBe(false);
    expect(CODEX_LINES[0]).toContain('ECG');
  });
});

describe('the reply-effect contract, through the router', () => {
  const ctx = {
    playerName: 'Alex', pig: 'piggy-3' as const, isCompanion: true, location: 'physics' as const, timeOfDay: 'day' as const,
    clock: 'Fri 3:42 PM', needs: { hunger: 70, energy: 70, hygiene: 70, fun: 70 }, mood: 'good' as const, sick: false, bondLevel: 4, memories: [],
  };
  const req = (playerText: string, history: ChatTurn[] = [], pig: PigId = 'piggy-3'): ChatRequest => ({ pig, playerText, history, context: { ...ctx, pig } });
  beforeEach(() => resetAiSession());
  afterEach(() => resetAiHost());

  test('respond() hands the Talk screen the whole mumble: effect, mumble, the plain text, on-topic effects, not streamed', async () => {
    const tokens: string[] = [];
    const r = await respond(req('Are you on X?'), (d) => tokens.push(d));
    expect(r).toMatchObject({ source: 'quirk', effect: 'mumble', expression: 'thinking', effects: { bond: 3, fun: 3 } });
    expect(r.mumble).toEqual(mumbleFor('on_x', 0, 0));
    expect(r.text).toBe(mumbleText(r.mumble!));
    expect(tokens).toEqual([]);
    // the game scores it as on topic (chat.ts: a brain proposing more than +2)
    expect((r.effects?.bond ?? 0) > 2).toBe(true);
    // a preset chip (the scripted brain) gets the same
    const chip = await respond(req('Are you on X?'), undefined, undefined, { brain: 'heuristic' });
    expect(chip.effect).toBe('mumble');
  });

  test('with the Big Brain loaded, the quirk still answers (the model is never asked)', async () => {
    let calls = 0;
    const host: AiHost = {
      settings: () => ({ aiMode: 'llm', aiModel: 'lfm3' }),
      remember: () => {},
      llm: {
        status: () => 'ready', modelId: () => 'lfm3', supported: () => true,
        generate: async () => {
          calls++;
          return { text: '[happy] "Hi!"', tokens: 3, tps: 60, firstTokenMs: 10, promptTokens: 100, reusedTokens: 0, interrupted: false, kvReuse: true, ms: 50 };
        },
      },
    };
    installAiHost(host);
    const x = await respond(req('Are you on X?'));
    const tw = await respond(req('Are you on Twitter?'));
    expect(calls).toBe(0);
    expect(x.effect).toBe('mumble');
    expect(tw).toMatchObject({ source: 'quirk', text: X_CORRECTIONS[0][0] });
    expect(tw.effect).toBeUndefined();
  });

  test('every other reply has no effect (other pigs, other questions, the Heuristic Brain)', async () => {
    for (const [pig, t] of [['piggy-1', 'Are you on X?'], ['piggy-2', 'Are you on X?'], ['piggy-3', 'What does an EEG show?'], ['piggy-3', 'i saw it on twitter']] as const) {
      const r = await respond(req(t, [], pig));
      expect([pig, t, r.effect, r.mumble]).toEqual([pig, t, undefined, undefined]);
    }
  });

  test('withEffect keeps a whole effect and drops a half-made one (the plain line still shows)', () => {
    const whole = mumbleReply('on_x', 2, 5);
    expect(withEffect(whole)).toBe(whole);
    const plain: ChatReply = { text: 'Hi!', expression: 'happy', source: 'heuristic' };
    expect(withEffect(plain)).toBe(plain);
    const noMumble = withEffect({ ...plain, effect: 'mumble' });
    expect([noMumble.effect, noMumble.mumble, noMumble.text]).toEqual([undefined, undefined, 'Hi!']);
    const rewritten = withEffect({ ...whole, text: 'Something else.' });
    expect([rewritten.effect, rewritten.mumble, rewritten.text]).toEqual([undefined, undefined, 'Something else.']);
    const stray = withEffect({ ...plain, mumble: whole.mumble });
    expect(stray.mumble).toBeUndefined();
  });
});
