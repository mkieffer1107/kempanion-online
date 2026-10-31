// For You Pig (id 'xfeed'): Piggy 3's X-feed mini-game. Content rules (privacy, no brands, no pork, jargon spelled
// right), the engine (scoring, pacing, Mumble Mode, touch grass), layout maths, his host logic (lines, poses, mumble
// chains, the phone clock), the portrait fallbacks, and the registry / rewards wiring.
import { describe, expect, test } from 'bun:test';
import { AUTHORS, CHAIN_FOR, LINES, MUMBLES, MUMBLE_CHAINS, SEED_POSTS, SNAP_OUTS, type ChainKey } from '../src/lib/minigames/xfeed/posts';
import { CAP, DURATION, FOCUS, FeedEngine, MUTED_W, OPENING, PHASES, REVEAL, comboMult, type Call, type FeedFx, type FeedPost } from '../src/lib/minigames/xfeed/engine';
import { LINE_MAX, LINE_MIN, LINE_PAD, cardTops, pxPerUnit, readLineY, smoothLayout } from '../src/lib/minigames/xfeed/layout';
import {
  CHAIN_FALLBACK, LinePicker, TOPIC_LABEL, ambientMumble, basePose, callNote, clockAt, clockMinutes, countsFor, lineFor, liveText,
  pickChain, plainText, segments, shortCount, signalOnly, statsLine, topLikedTopic,
} from '../src/lib/minigames/xfeed/host';
import { BUST_H, PORTRAIT, introClip, portraitCell } from '../src/lib/minigames/xfeed/render';
import { rng } from '../src/lib/minigames/common/pixel';
import { META, RESULT_LINES, resultLine } from '../src/lib/minigames/meta';
import { MINIGAME_IDS as REGISTRY_IDS } from '../src/lib/minigames/types';
import { MINIGAME_IDS as SCRIPT_IDS } from '../src/lib/vn/validate';
import { MEDAL_THRESHOLDS, applyMinigameResult, medalFor, minigameReward, newSave } from '../src/lib/pet';
import { TUNING } from '../src/lib/pet/minigame';
import { ICONS } from '../src/lib/content/icons';
import sprites from '../src/generated/sprites.json';

const right = (p: FeedPost): Call => (p.cls === 'hype' ? 'mute' : p.cls === 'gem' ? 'save' : 'like');
const TH = { bronze: 2000, silver: 3800, gold: 7500 };

/** Perfect player: judges every readable post at once; with `flick`, pulls the next one up when idle. */
function oracle(seed: number, flick: boolean, assist = false): FeedEngine {
  const e = new FeedEngine(seed, { assist });
  for (let t = 0; t <= DURATION + 0.05; t += 1 / 60) {
    e.update(t);
    e.takeFx();
    let acted = false;
    for (const p of e.posts) if (p.state === 'live' && e.readable(p) && p.cls !== 'filler') acted = !!e.call(p.n, right(p)) || acted;
    if (flick && !acted && !e.grass && Math.round(t * 60) % 20 === 0) e.next();
  }
  return e;
}

describe('For You Pig: content', () => {
  test('bank size and mix: enough of every class and tier for a long run without repeats', () => {
    const n = (f: (p: (typeof SEED_POSTS)[number]) => boolean) => SEED_POSTS.filter(f).length;
    expect(SEED_POSTS.length).toBeGreaterThanOrEqual(100);
    for (const tier of [1, 2, 3] as const) {
      expect(n((p) => p.cls === 'signal' && p.tier === tier)).toBeGreaterThanOrEqual(10);
      expect(n((p) => p.cls === 'hype' && p.tier === tier && !p.oldName)).toBeGreaterThanOrEqual(10);
    }
    expect(n((p) => p.cls === 'filler')).toBeGreaterThanOrEqual(12);
    expect(n((p) => p.cls === 'gem')).toBeGreaterThanOrEqual(6);
    expect(n((p) => p.cls === 'friend' && !p.own)).toBeGreaterThanOrEqual(6);
    expect(n((p) => !!p.oldName)).toBeGreaterThanOrEqual(3);
    expect(new Set(SEED_POSTS.map((p) => p.id)).size).toBe(SEED_POSTS.length);
    for (const id of OPENING) expect(SEED_POSTS.some((p) => p.id === id)).toBe(true);
  });

  test('every handle is 16–22 characters, so none can be a real X account (their max is 15)', () => {
    for (const a of Object.values(AUTHORS)) {
      expect(a.handle.length, a.handle).toBeGreaterThanOrEqual(16);
      expect(a.handle.length, a.handle).toBeLessThanOrEqual(22);
      expect(a.handle).toMatch(/^[a-z0-9_]+$/);
      expect(a.name.length).toBeLessThanOrEqual(22);
    }
  });

  test('posts follow the content rules', () => {
    const plain = (t: string) => t.replace(/\[\[|\]\]/g, '');
    const banned = /\b(pork|bacon|ham|sausage|hot ?dog|pepperoni|prosciutto|lard|chorizo|salami|ribs?)\b/i;
    const brands = /\b(openai|anthropic|google|gemini|qwen|meta|nvidia|hugging ?face|gpt|claude|llama|apple|iphone|raspberry|one piece|swe-?bench|arc-agi|medqa|codex|mathnasium)\b/i;
    let printing = 0;
    for (const p of SEED_POSTS) {
      const t = plain(p.text);
      expect(t.length, p.id).toBeLessThanOrEqual(110);
      expect(t, p.id).not.toMatch(banned);
      expect(t, p.id).not.toMatch(brands);
      expect(t, p.id).not.toMatch(/\p{Extended_Pictographic}/u);
      expect((p.text.match(/\[\[/g) ?? []).length, p.id).toBe((p.text.match(/\]\]/g) ?? []).length);
      if (p.cls === 'signal' || p.cls === 'hype' || p.cls === 'gem') {
        expect(p.text, p.id).toContain('[[');
        expect(p.tell && p.tell.length <= 48, p.id).toBe(true);
      }
      expect(/\btwitter\b|\btweet/i.test(t), p.id).toBe(!!p.oldName);
      if (/\bprinter\b|filament|slicer|\b3d\b/i.test(t)) printing += 1;
      expect(p.by in AUTHORS, p.id).toBe(true);
    }
    expect(printing).toBeLessThanOrEqual(1); // the owner asked for less 3D printing
  });

  test('mumbles are short and quiet: chain bubbles ≤ 14 characters, ambient ≤ 24, nothing banned', () => {
    for (const c of Object.values(MUMBLE_CHAINS)) for (const b of c) expect([...b].length, b).toBeLessThanOrEqual(14);
    for (const b of Object.values(MUMBLES).flat()) {
      expect([...b].length, b).toBeLessThanOrEqual(24);
      expect(b.startsWith('…'), b).toBe(true);
    }
    expect(SNAP_OUTS.length).toBeGreaterThanOrEqual(4);
    expect(LINES.oldName.some((l) => /\bX\b/.test(l))).toBe(true);
  });
});

describe('For You Pig: engine', () => {
  test('perfect play earns gold with or without flicking; idle play scores 0 and ends at 75 s', () => {
    for (const seed of [1, 2, 3]) {
      const slow = oracle(seed, false);
      const fast = oracle(seed, true);
      expect(slow.ended && fast.ended).toBe(true);
      expect(slow.score).toBeGreaterThanOrEqual(TH.gold);
      expect(fast.score).toBeGreaterThan(slow.score);
      expect(fast.stats().accuracy).toBe(100);
      expect(fast.counts.wrong + fast.counts.missed).toBe(0);
    }
    const idle = new FeedEngine(4);
    for (let t = 0; t <= DURATION + 0.5; t += 1 / 30) idle.update(t);
    expect(idle.ended).toBe(true);
    expect(idle.score).toBe(0);
    expect(idle.counts.missed).toBeGreaterThan(15);
    expect(idle.counts.grass).toBeGreaterThanOrEqual(1); // unread hype rots the brain: he goes and touches grass
  });

  test('mashing does not pay: liking everything or random calls stay under bronze', () => {
    for (const seed of [5, 6, 7]) {
      for (const pick of [() => 'like' as Call, (n: number) => (['like', 'mute', 'save'] as Call[])[n % 3]]) {
        const e = new FeedEngine(seed);
        for (let t = 0; t <= DURATION + 0.05; t += 1 / 60) {
          e.update(t);
          for (const p of e.posts) if (p.state === 'live' && e.readable(p)) e.call(p.n, pick(p.n * 7 + seed));
          if (Math.round(t * 60) % 30 === 0) e.next();
        }
        expect(e.score, `seed ${seed}`).toBeLessThan(TH.bronze);
      }
    }
  });

  test('deterministic per seed, different across seeds; the opening teaches like / like / mute / scroll', () => {
    const ids = (seed: number) => oracle(seed, true).posts.map((p) => p.id);
    expect(ids(9)).toEqual(ids(9));
    expect(ids(9)).not.toEqual(ids(10));
    const e = new FeedEngine(11);
    expect(e.posts.slice(0, 4).map((p) => p.id)).toEqual(OPENING);
    const run = oracle(12, true);
    expect(new Set(run.posts.map((p) => p.id)).size).toBe(run.posts.length); // no repeats in a run
  });

  test('phases escalate: rate rises at 15 / 37 / 58 s; Assist is 30% slower', () => {
    expect(PHASES.map((p) => p.t0)).toEqual([0, 15, 37, 58]);
    for (let i = 1; i < PHASES.length; i++) expect(PHASES[i].rate).toBeGreaterThan(PHASES[i - 1].rate);
    const e = new FeedEngine(1);
    const a = new FeedEngine(1, { assist: true });
    e.update(20);
    a.update(20);
    expect(e.phase.id).toBe('foryou');
    expect(a.rate).toBeCloseTo(e.rate * 0.7, 5);
  });

  test('the algorithm only serves CAP × its pace; flicks park the next unread post under the line, then pass it', () => {
    const e = new FeedEngine(3);
    let maxAhead = 0;
    for (let t = 0; t <= 30; t += 1 / 60) {
      e.update(t);
      e.next(); // a frantic flicker
      maxAhead = Math.max(maxAhead, e.s - (e.served - REVEAL));
    }
    expect(maxAhead).toBeLessThanOrEqual(1e-9);
    expect(e.s).toBeLessThan(30 * PHASES[1].rate * CAP + 2);

    const f = new FeedEngine(4);
    f.update(0.01);
    const first = f.posts[0];
    f.next();
    for (let t = 0.02; t < 1.2; t += 1 / 60) f.update(t);
    expect(f.center(first) - f.s).toBeLessThan(FOCUS + 0.05); // parked in the focus slot (or already drifting up)
    expect(first.consumed).toBe(false);
    f.next(); // already parked: this one scrolls past it
    for (let t = 1.2; t < 2.4; t += 1 / 60) f.update(t);
    expect(first.consumed).toBe(true);
    expect(first.state).toBe('missed'); // the opening friend post was never liked
  });

  test('calls: right +points with combo, filler is harmless, wrong −100 (never below 0) and shows the tell', () => {
    const e = new FeedEngine(21);
    e.update(0.01);
    const [friend, signal, hype] = e.posts;
    expect(e.readable(signal)).toBe(false); // 2.4 units down: still a loading skeleton
    expect(e.call(signal.n, 'like')).toBeNull();
    expect(e.call(friend.n, 'like')?.pts).toBe(150);
    expect(e.call(friend.n, 'like')).toBeNull(); // already judged
    while (!e.readable(signal)) e.update(e.t + 1 / 60);
    expect(e.call(hype.n, 'like')).toBeNull();
    expect(e.call(signal.n, 'mute')?.pts).toBe(-100);
    expect(signal.tellShown).toBe(true);
    expect(e.combo).toBe(0);
    expect(e.score).toBe(50);
    while (!e.readable(hype)) e.update(e.t + 1 / 60);
    expect(e.call(hype.n, 'mute')?.pts).toBe(100);
    expect(hype.w).toBe(MUTED_W);
    const fill = e.posts.find((p) => p.cls === 'filler' && e.readable(p) && p.state === 'live');
    if (fill) {
      const combo = e.combo;
      expect(e.call(fill.n, 'like')?.pts).toBe(0);
      expect(e.combo).toBe(combo);
    }
    expect(comboMult(4)).toBe(1);
    expect(comboMult(5)).toBe(1.25);
    expect(comboMult(20)).toBe(2);
    expect(comboMult(60)).toBe(2);
  });

  test('a mute never makes the next post vanish unjudged', () => {
    for (let seed = 0; seed < 40; seed++) {
      const e = new FeedEngine(seed);
      for (let t = 0; t <= DURATION; t += 1 / 30) {
        e.update(t);
        const c = e.cursor();
        if (c < 0) continue;
        const p = e.posts[c];
        // mute late, right at the line, to stress the collapse
        if (p.cls === 'hype' && e.center(p) - e.s < 0.15) {
          const before = e.counts.missed;
          e.call(c, 'mute');
          expect(e.counts.missed).toBe(before);
        } else if (p.cls !== 'hype' && p.cls !== 'filler' && e.center(p) - e.s < 0.5) e.call(c, right(p));
      }
    }
  });

  test('Mumble Mode at a 6 streak doubles points; rot 100 sends him to touch grass for 3 s', () => {
    const e = new FeedEngine(31);
    let doubled = false;
    for (let t = 0; t <= DURATION && !doubled; t += 1 / 60) {
      e.update(t);
      for (const p of e.posts) {
        if (p.state !== 'live' || !e.readable(p) || p.cls === 'filler') continue;
        const was = e.mumbling;
        const r = e.call(p.n, right(p));
        if (r && was && p.cls === 'signal') {
          expect(r.pts).toBe(Math.round(100 * comboMult(e.combo) * 2));
          doubled = true;
        }
      }
    }
    expect(doubled).toBe(true);

    const g = new FeedEngine(32);
    g.update(0.01);
    g.rot = 99;
    expect(g.call(g.posts[2].n, 'like')).toBeNull(); // not readable yet: no effect
    for (let t = 0.02; t < 8 && !g.grass; t += 1 / 60) {
      g.update(t);
      for (const p of g.posts) if (p.state === 'live' && g.readable(p) && p.cls === 'hype') g.call(p.n, 'like');
    }
    expect(g.grass).toBe(true);
    expect(g.rot).toBe(40);
    expect(g.combo).toBe(0);
    const s = g.s;
    const t0 = g.t;
    for (let t = t0; t < t0 + 2.9; t += 1 / 60) g.update(t);
    expect(g.s).toBe(s); // the feed waits while he's outside
    for (let t = t0 + 2.9; t < t0 + 3.3; t += 1 / 60) g.update(t);
    expect(g.grass).toBe(false);
  });

  test('a wrong call snaps him out of Mumble Mode at once; grass and the end of the run close it too', () => {
    const e = new FeedEngine(33);
    let broke = false;
    for (let t = 0; t <= DURATION && !broke; t += 1 / 60) {
      e.update(t);
      for (const p of e.posts) {
        if (p.state !== 'live' || !e.readable(p) || p.cls === 'filler') continue;
        if (e.mumbling && p.cls === 'signal') {
          e.takeFx();
          e.call(p.n, 'mute'); // wrong on purpose, mid-mumble
          const fx = e.takeFx();
          expect(e.mumbling).toBe(false);
          expect(fx.some((f) => f.kind === 'mumble' && !f.on && f.by === 'wrong')).toBe(true);
          broke = true;
          break;
        }
        e.call(p.n, right(p));
      }
    }
    expect(broke).toBe(true);

    const end = new FeedEngine(34);
    let closed = 0;
    let opened = 0;
    for (let t = 0; t <= DURATION + 0.1; t += 1 / 60) {
      end.update(t);
      for (const f of end.takeFx()) if (f.kind === 'mumble') f.on ? (opened += 1) : (closed += 1);
      for (const p of end.posts) if (p.state === 'live' && end.readable(p) && p.cls !== 'filler') end.call(p.n, right(p));
    }
    expect(opened).toBeGreaterThan(0);
    expect(closed).toBe(opened); // every mumble that starts also ends (time, wrong, grass or the end of the run)
  });
});

describe('For You Pig: layout (units → px)', () => {
  test('the read line leaves exactly REVEAL + pad units under it, within 12–45% of the feed', () => {
    // measured in the v3 mock: feeds 267–471 px tall, 88–102 px per unit
    for (const H of [267, 277, 339, 355, 410, 471]) {
      for (const ppu of [86, 94, 102]) {
        const y = readLineY(H, ppu);
        expect(y).toBeGreaterThanOrEqual(Math.round(H * LINE_MIN));
        expect(y).toBeLessThanOrEqual(Math.round(H * LINE_MAX));
        if (y > H * LINE_MIN + 1 && y < H * LINE_MAX - 1) expect(H - y).toBeCloseTo((REVEAL + LINE_PAD) * ppu, 0);
      }
    }
  });

  test('cards stack contiguously around the pinned one; s sits on the line', () => {
    const cards = [{ start: 0, w: 1, h: 100 }, { start: 1, w: 0.25, h: 24 }, { start: 1.25, w: 1.2, h: 130 }, { start: 2.45, w: 0.9, h: 80 }];
    const tops = cardTops(cards, 1.25 + 0.6, 120); // halfway through card 2
    expect(tops[2]).toBe(120 - 65);
    for (let i = 1; i < cards.length; i++) expect(tops[i] - tops[i - 1]).toBe(cards[i - 1].h);
    expect(pxPerUnit(cards)).toBeCloseTo(100, 5); // median of 100, 108.3, 88.9 (the muted strip is ignored)
  });
});

describe('For You Pig: the gags always land', () => {
  test('bank is 80–120 posts; the owner\'s five buzzwords live in the chains; no 3D printing at all', async () => {
    const { CHAIN_FOR, MUMBLE_CHAINS: CH } = await import('../src/lib/minigames/xfeed/posts');
    expect(SEED_POSTS.length).toBeGreaterThanOrEqual(80);
    expect(SEED_POSTS.length).toBeLessThanOrEqual(120);
    const words = Object.values(CH).flat().join(' ');
    for (const w of ['LLM', 'foundation mo', 'RLHF', 'RLVR', 'Jev']) expect(words).toContain(w);
    expect(CH.five.slice(1, 6)).toEqual(['LLM…', 'foundation mo—', 'RLHF…', 'RLVR!', 'Jev…']);
    for (const k of Object.values(CHAIN_FOR)) expect(CH[k!]).toBeDefined();
    expect(SEED_POSTS.filter((p) => /\b3d\b|printer|filament/i.test(p.text)).length).toBe(0);
    for (const p of SEED_POSTS) expect(/[{}]/.test(p.text), p.id).toBe(!!p.live);
  });

  test('every run shows a "Twitter" post early in For You (the gag always lands), never two within 6 posts', () => {
    for (let seed = 0; seed < 60; seed++) {
      for (const assist of [false, true]) {
        const e = new FeedEngine(seed, { assist });
        let seenAt = -1;
        for (let t = 0; t <= DURATION + 0.05 && seenAt < 0; t += 1 / 30) {
          e.update(t);
          for (const f of e.takeFx()) if (f.kind === 'seen' && e.posts[f.post].oldName && seenAt < 0) seenAt = t;
          for (const p of e.posts) if (p.state === 'live' && e.readable(p) && p.cls !== 'filler') e.call(p.n, right(p));
        }
        expect(seenAt, `seed ${seed} assist ${assist}`).toBeGreaterThan(0);
        expect(seenAt, `seed ${seed} assist ${assist}`).toBeLessThan(assist ? 36 : 33); // For You runs 15–37 s
      }
    }
    for (let seed = 0; seed < 30; seed++) {
      const e = oracle(seed, true);
      const idx = e.posts.flatMap((p, i) => (p.oldName ? [i] : []));
      for (let i = 1; i < idx.length; i++) expect(idx[i] - idx[i - 1], `seed ${seed}`).toBeGreaterThanOrEqual(6);
    }
  });

  test('mumble-on carries its trigger post; ten-seconds-left is said once; SFX ids are real', () => {
    const SFX = new Set(['heart', 'sparkle', 'coin', 'tidy', 'question', 'notify', 'oink_sad', 'whoosh', 'ui_move', 'ui_open', 'zzz', 'step', 'success']);
    const e = new FeedEngine(41);
    let ten = 0;
    let ons = 0;
    for (let t = 0; t <= DURATION + 0.05; t += 1 / 60) {
      e.update(t);
      for (const f of e.takeFx()) {
        if (f.kind === 'say' && f.key === 'tenLeft') ten += 1;
        if (f.kind === 'mumble' && f.on) {
          ons += 1;
          expect(typeof f.post).toBe('number');
          expect(e.posts[f.post!].state === 'liked' || e.posts[f.post!].state === 'saved' || e.posts[f.post!].state === 'muted').toBe(true);
        }
        if (f.kind === 'sfx') expect(SFX.has(f.sfx), f.sfx).toBe(true);
      }
      for (const p of e.posts) if (p.state === 'live' && e.readable(p) && p.cls !== 'filler') e.call(p.n, right(p));
    }
    expect(ten).toBe(1);
    expect(ons).toBeGreaterThan(0);
  });
});

// ───────────────────────── wording, host logic, art lookups, registry ─────────────────────────

const GAME_TEXT = [
  ...Object.values(LINES).flat(), ...SNAP_OUTS, ...Object.values(MUMBLES).flat(), ...Object.values(MUMBLE_CHAINS).flat(),
  ...Object.values(RESULT_LINES.xfeed['piggy-3'] ?? {}), META.xfeed.desc,
];
const ALL_TEXT = [
  ...SEED_POSTS.map((p) => plainText(p.text)), ...SEED_POSTS.flatMap((p) => (p.tell ? [p.tell] : [])), ...GAME_TEXT,
  ...Object.values(AUTHORS).map((a) => a.name),
];
const post = (id: string, over: Partial<FeedPost> = {}): FeedPost => {
  const seed = SEED_POSTS.find((p) => p.id === id);
  if (!seed) throw new Error(`no post ${id}`);
  return { ...seed, n: 0, start: 0, w: 1, state: 'live', consumed: false, pts: 0, tellShown: false, seen: false, ...over };
};
const say = (key: Extract<FeedFx, { kind: 'say' }>['key'], n?: number) => ({ kind: 'say', key, n, prio: 2 }) as Extract<FeedFx, { kind: 'say' }>;

describe('For You Pig: privacy and wording', () => {
  test('no brands, real accounts, links, emoji or pork anywhere in its text (Jev is the one model name he asked for)', () => {
    const pork = /\b(pork|bacon|ham|hams|sausage|hot ?dog|pepperoni|prosciutto|lard|chorizo|salami|ribs?|spam)\b/i;
    const brands = /\b(openai|anthropic|google|gemini|qwen|meta|nvidia|hugging ?face|gpt|claude|llama|apple|iphone|raspberry|one piece|swe-?bench|arc-agi|medqa|codex|mathnasium|red bull|b200)\b/i;
    for (const t of ALL_TEXT) {
      expect(t, t).not.toMatch(pork);
      expect(t, t).not.toMatch(brands);
      expect(t, t).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(t, t).not.toMatch(/https?:|www\.|twitter\.com/i);
      for (const m of t.match(/\b[\w-]+\.com\b/gi) ?? []) expect(m, t).toBe('X.com');
    }
    // @mentions only ever name the invented accounts
    const handles = new Set(Object.values(AUTHORS).map((a) => `@${a.handle}`));
    for (const p of SEED_POSTS) {
      for (const m of plainText(p.text).match(/(?:^|[\s(])@[a-z_]\w*/gi) ?? []) expect(handles.has(m.trim().replace(/^\(/, '')), m).toBe(true);
    }
    // Piggy 1 has no X account; only Piggy 2 and Piggy 3 post with their real faces.
    expect(Object.values(AUTHORS).filter((a) => 'pig' in a).map((a) => a.handle).sort()).toEqual(['piggy2_patriot_md', 'piggy3_okay_so_builds']);
  });

  test('AI and medical jargon is spelled right wherever it shows up', () => {
    const CANON: [RegExp, string[]][] = [
      [/\brlhf\b/gi, ['RLHF']], [/\brlvr\b/gi, ['RLVR']], [/\brlcd\b/gi, ['RLCD']], [/\bgepa\b/gi, ['GEPA']], [/\bjepa\b/gi, ['JEPA']],
      [/\bfhir\b/gi, ['FHIR']], [/\bauroc\b/gi, ['AUROC']], [/\bicd-10\b/gi, ['ICD-10']], [/\blora\b/gi, ['LoRA']], [/\bllm\b/gi, ['LLM']],
      [/\bkv cache\b/gi, ['KV cache', 'KV Cache']], [/\bmcp\b/gi, ['MCP']], [/\bmoe\b/gi, ['MoE']], [/\bagents\.md\b/gi, ['AGENTS.md']],
      [/\bjev\b/gi, ['Jev', 'JEV']], [/\bsim2real\b/gi, ['sim2real', 'Sim2Real']], [/\bhipergator\b/gi, ['HiPerGator']],
      [/\bsqueue\b/gi, ['squeue']], [/\bvla\b/gi, ['VLA']], [/\bsota\b/gi, ['SOTA']], [/\btts\b/gi, ['TTS']], [/\becg\b/gi, ['ECG']],
      [/\beeg\b/gi, ['EEG']], [/\bpass@\d+/gi, ['pass@100']],
    ];
    for (const t of ALL_TEXT) {
      expect(t, t).not.toMatch(/\b(rhlf|rlfh|rvlr|lrvr|jpea|gpea|fihr|aurco|lorra|hipergater|foundational model)\b/i);
      for (const [re, ok] of CANON) for (const m of t.match(re) ?? []) expect(ok, `${m} in "${t}"`).toContain(m);
    }
  });

  test('his X habit: the meet line, "X.com", the old-name correction and the slip', () => {
    expect(LINES.introFirst[0]).toContain('Hey, did you see this on X today?');
    expect(GAME_TEXT.filter((t) => t.includes('X.com')).length).toBeGreaterThanOrEqual(4);
    expect(LINES.oldName).toContain("It's called X.");
    expect(LINES.slip[0]).toContain('Twi—');
    for (const k of ['intro', 'slip', 'addicted', 'idleTouch', 'idleKeys', 'gemFirst', 'tenLeft', 'timeUp', 'loading']) expect(LINES[k]?.length, k).toBeGreaterThan(0);
  });
});

describe('For You Pig: Piggy 3 as host', () => {
  test('the phone clock runs 11:48 PM → 3:17 AM through the tabs, one minute at a time', () => {
    expect([0, 15, 37, 58, 75].map(clockAt)).toEqual(['11:48 PM', '12:31 AM', '1:52 AM', '3:00 AM', '3:17 AM']);
    let prev = clockMinutes(0);
    for (let t = 0; t <= DURATION; t += 0.25) {
      const m = clockMinutes(t);
      expect(m).toBeGreaterThanOrEqual(prev);
      expect(m - prev).toBeLessThanOrEqual(2);
      prev = m;
    }
    expect(clockAt(-1)).toBe('11:48 PM');
    expect(clockAt(90)).toBe('3:17 AM');
  });

  test('every say key has a line; mistakes end with the post\'s tell; friends, gems, phases, combos and snap-outs use their banks', () => {
    const pick = new LinePicker(rng(7));
    const KEYS = [
      'phase', 'likeOk', 'muteOk', 'likeWrong', 'muteWrong', 'missSignal', 'missHype', 'friend', 'friendMuted', 'ownLiked', 'ownMuted', 'gem',
      'gemLiked', 'oldName', 'oldNameMuted', 'oldNameLiked', 'xray', 'combo', 'rot', 'grass', 'grassBack', 'loading', 'snapOut', 'tenLeft', 'timeUp',
    ] as const;
    for (const k of KEYS) {
      const n = k === 'phase' ? 2 : k === 'combo' ? 15 : k === 'rot' ? 50 : undefined;
      expect(lineFor(say(k, n), post('s.calib'), pick)?.text.length ?? 0, k).toBeGreaterThan(0);
    }
    const n12 = lineFor(say('likeWrong'), post('h.n12'), pick)!;
    expect(n12.text.endsWith('97% of 12 patients is 11.64 patients. Hmm.')).toBe(true);
    expect(n12.pose).toBe('confused');
    expect(lineFor(say('muteWrong'), post('s.calib'), pick)!.text.endsWith(post('s.calib').tell!)).toBe(true);
    expect(lineFor(say('missHype'), post('h.thread'), pick)!.text.endsWith('A 37-post hook with no claim.')).toBe(true);
    expect(lineFor(say('likeOk'), post('s.calib'), pick)!.text).not.toContain(post('s.calib').tell!);
    expect(LINES['friend:p2.reflex']).toContain(lineFor(say('friend'), post('p2.reflex'), pick)!.text);
    expect(LINES['friend:p1.sunrise']).toContain(lineFor(say('friend'), post('p1.sunrise'), pick)!.text);
    expect(LINES.friendMuted2).toContain(lineFor(say('friendMuted'), post('p2.postcall'), pick)!.text);
    expect(lineFor(say('gem'), post('g.full'), pick, true)).toMatchObject({ key: 'gemFirst', pose: 'excited' });
    expect(lineFor(say('gem'), post('g.full'), pick, true)!.text).toContain('treasure map');
    expect(LINES.gem).toContain(lineFor(say('gem'), post('g.full'), pick, false)!.text);
    expect(lineFor(say('phase', 3), null, pick)).toMatchObject({ key: 'phase3', prio: 3, pose: 'sleepy' });
    expect(lineFor(say('phase', 1), null, pick)!.text).toContain('For You');
    const snap = lineFor(say('snapOut'), null, pick)!;
    expect(SNAP_OUTS).toContain(snap.text);
    expect(snap).toMatchObject({ pose: 'flustered_blush', poseMs: 1600 });
    expect(lineFor(say('combo', 25), null, pick)!.text).toBe(LINES.combo25[0]);
    expect(lineFor(say('rot', 75), null, pick)).toMatchObject({ key: 'rot75', pose: 'sick' });
    expect(lineFor(say('oldName'), post('o.down'), pick)!.pose).toBe('angry');
    // never the same line twice in a row
    let last = '';
    for (let i = 0; i < 60; i++) {
      const t = pick.pick('muteOk');
      expect(t).not.toBe(last);
      last = t;
    }
  });

  test('mumble chains: the first one ever is the owner\'s five; then the trigger post\'s topic; never twice in a run', () => {
    expect(pickChain('med', new Set(), true)).toBe('five');
    expect(pickChain('med', new Set(), false)).toBe('med');
    expect(pickChain('biosig', new Set(), false)).toBe('biosig');
    expect(pickChain(undefined, new Set(), false)).toBe('five');
    expect(pickChain('math', new Set<ChainKey>(['math']), false)).toBe('five');
    expect(pickChain('math', new Set<ChainKey>(['math', 'five']), false)).toBe(CHAIN_FALLBACK[1]);
    const used = new Set<ChainKey>();
    for (let i = 0; i < Object.keys(MUMBLE_CHAINS).length; i++) used.add(pickChain('rl', used, i === 0));
    expect(used.size).toBe(Object.keys(MUMBLE_CHAINS).length);
    expect(MUMBLE_CHAINS.five.join(' ')).toMatch(/LLM.*foundation mo.*RLHF.*RLVR.*Jev/);
    for (const k of Object.values(CHAIN_FOR)) expect(MUMBLE_CHAINS[k!].at(-1), k).toMatch(/[—…!]$/);
  });

  test('ambient mumbles come from his banks and never repeat back to back', () => {
    const rand = rng(3);
    let last = '';
    for (let i = 0; i < 60; i++) {
      const m = ambientMumble(post('h.n12'), rand, last);
      expect([...MUMBLES.hype, ...MUMBLES.med]).toContain(m);
      expect(m).not.toBe(last);
      last = m;
    }
    expect(MUMBLES.any).toContain(ambientMumble(null, rand));
    expect(MUMBLES.math).toContain(ambientMumble(post('s.halves'), rand));
  });

  test('live posts fill in from the run: your screen time, the phone clock, your most-liked topic', () => {
    const live = (k: string) => SEED_POSTS.find((p) => p.live === k)!;
    expect(liveText(live('screentime'), { s: 41.4, clock: '1:05 AM', topic: null })).toBe('Screen time today: you, 41s. Piggy 3, 6h 12m.');
    expect(liveText(live('clock'), { s: 3, clock: '1:05 AM', topic: null })).toBe("It's 1:05 AM. Go to bed. (You won't.)");
    expect(liveText(live('algo'), { s: 3, clock: '', topic: null })).toBe('Noticed you like AI posts. Here are 40 more.');
    expect(liveText(live('algo'), { s: 3, clock: '', topic: 'med' })).toBe('Noticed you like medical AI posts. Here are 40 more.');
    const ps = [
      post('s.halves', { state: 'liked' }), post('g.ecgset', { state: 'saved' }), post('s.extval', { state: 'liked' }),
      post('h.onepct', { state: 'muted' }), post('f.sevens', { state: 'neutral' }),
    ];
    expect(topLikedTopic(ps)).toBe('med');
    expect(topLikedTopic([])).toBeNull();
    for (const t of new Set(SEED_POSTS.map((p) => p.topic))) expect(TOPIC_LABEL[t].length, t).toBeGreaterThan(0);
  });

  test('cards: tells split out of the text; footer counts are seeded per post and are never a tell', () => {
    expect(segments('a [[b]] c')).toEqual([{ t: 'a ', tell: false }, { t: 'b', tell: true }, { t: ' c', tell: false }]);
    for (const p of SEED_POSTS) expect(segments(p.text).map((x) => x.t).join('')).toBe(plainText(p.text));
    expect(countsFor('s.calib')).toEqual(countsFor('s.calib'));
    const median = (cls: string) => {
      const xs = SEED_POSTS.filter((p) => p.cls === cls).map((p) => countsFor(p.id).like).sort((a, b) => a - b);
      return xs[Math.floor(xs.length / 2)];
    };
    expect(median('hype') / median('signal')).toBeGreaterThan(0.4);
    expect(median('hype') / median('signal')).toBeLessThan(2.5);
    expect([shortCount(999), shortCount(1000), shortCount(1234), shortCount(12345)]).toEqual(['999', '1K', '1.2K', '12K']);
    expect(callNote(post('h.n12', { state: 'wrong' }), 0)).toBe(`Wrong, that was hype. ${post('h.n12').tell}`);
    expect(callNote(post('s.calib', { state: 'liked' }), 6)).toBe('Liked, combo 6.');
  });

  test('results: the stats line, plus "Signal only!" for a clean run of 30 or more calls', () => {
    const st = { accuracy: 100, judged: 31, correct: 31, wrong: 0, missed: 0, liked: 14, muted: 12, saved: 1, mumbles: 3, maxCombo: 27 };
    expect(statsLine(st)).toBe('Liked 14 · Muted 12 · Saved 1 · Wrong 0 · Missed 0 · Best combo 27 · Signal-to-Oink 100% · Mumbles 3 · Signal only!');
    expect(signalOnly({ ...st, judged: 29 })).toBe(false);
    expect(signalOnly({ ...st, missed: 1 })).toBe(false);
    expect(statsLine({})).toContain('Signal-to-Oink 0%');
  });

  test('poses: phone out by default, phone_mumble while mumbling; stand-ins until the phone portraits are synced', () => {
    expect(basePose({ mumbling: false, grass: false, battery: 80 })).toBe('phone');
    expect(basePose({ mumbling: true, grass: false, battery: 80 })).toBe('phone_mumble');
    expect(basePose({ mumbling: false, grass: false, battery: 20 })).toBe('sick');
    expect(basePose({ mumbling: true, grass: true, battery: 0 })).toBe('happy');
    const set = (sprites as unknown as { sets: Record<string, { portraits: Record<string, number[]> }> }).sets['piggy-3/everyday'];
    expect(portraitCell('phone')!.pose).toBe(set.portraits.phone ? 'phone' : 'happy');
    expect(portraitCell('phone_mumble')!.pose).toBe(set.portraits.phone_mumble ? 'phone_mumble' : 'neutral');
    for (const p of ['happy', 'proud', 'excited', 'laughing', 'flustered_blush', 'confused', 'surprised', 'angry', 'sick', 'sleepy'] as const) {
      expect(portraitCell(p)!.pose).toBe(p);
    }
    expect(portraitCell('happy')!.atlas).toBe('sprites/piggy-3/everyday/portraits.png');
    expect(PORTRAIT).toEqual({ w: 192, h: 256 });
    expect(BUST_H).toBeLessThanOrEqual(PORTRAIT.h);
    expect(introClip((a) => a === 'wave' || a === 'idle')).toBe('wave');
    expect(introClip((a) => ['phone', 'wave', 'idle'].includes(a))).toBe('phone');
    expect(introClip(() => true, true)).toBe('celebrate');
  });
});

describe('For You Pig: registry and rewards', () => {
  test('registered: meta, results lines, the mini-game and script id lists, its icons', () => {
    expect(REGISTRY_IDS).toContain('xfeed');
    expect(SCRIPT_IDS).toContain('xfeed');
    expect(META.xfeed).toMatchObject({
      id: 'xfeed', title: 'For You Pig', jpTitle: 'フォー・ユー・ピッグ', pig: 'piggy-3', anyPig: false, song: 'piggy3_theme', location: 'marston',
    });
    expect(META.xfeed.bg).toEqual(['marston_night', 'marston']);
    for (const md of ['none', 'bronze', 'silver', 'gold'] as const) {
      expect(RESULT_LINES.xfeed['piggy-3']?.[md]?.length ?? 0).toBeGreaterThan(10);
      expect(resultLine('xfeed', 'piggy-3', md)).toBe(RESULT_LINES.xfeed['piggy-3']![md]);
    }
    expect(resultLine('xfeed', 'piggy-3', 'gold')).toContain('X.com');
    for (const id of ['phone', 'mute']) {
      expect(ICONS[id], id).toBeDefined();
      expect(ICONS[id].rows.length).toBe(16);
      for (const row of ICONS[id].rows) expect(row.length).toBe(16);
      for (const ch of new Set(ICONS[id].rows.join(''))) if (ch !== '.') expect(ICONS[id].palette[ch], `${id}:${ch}`).toBeDefined();
    }
  });

  test('medals at 2,000 / 3,800 / 7,500; 5 + score/180 acorns capped at 45; energy −8; its counters', () => {
    const medal = (score: number) => medalFor('xfeed', { score, stats: {} });
    expect(MEDAL_THRESHOLDS.xfeed).toEqual([2000, 3800, 7500]);
    expect([1999, 2000, 3799, 3800, 7499, 7500].map(medal)).toEqual(['none', 'bronze', 'bronze', 'silver', 'silver', 'gold']);
    expect(TUNING.xfeed.cap).toBe(45);
    expect(TUNING.xfeed.energy).toBe(-8);
    expect([2000, 3800].map((score) => Math.floor(TUNING.xfeed.money({ score, stats: {} })))).toEqual([16, 26]);
    const now = Date.UTC(2026, 9, 30, 23);
    const s = newSave(now);
    s.companion = 'piggy-3';
    const res = minigameReward(s, 'xfeed', 'piggy-3', { score: 9100, stats: { maxCombo: 27, grass: 1, wrong: 0, missed: 0, judged: 34 }, assist: true }, now);
    expect(res).toMatchObject({ id: 'xfeed', medal: 'gold', won: true, energy: -8, assist: true });
    const before = s.money;
    applyMinigameResult(s, 'piggy-3', res, now);
    expect(s.money).toBeGreaterThanOrEqual(before + res.money); // (a finished daily task can pay on top)
    expect(s.counters['mg.xfeed.runs']).toBe(1);
    expect(s.counters['mg.xfeed.best']).toBe(9100);
    expect(s.counters['mg.xfeed.best_combo']).toBe(27);
    expect(s.counters['mg.xfeed.grass']).toBe(1);
    expect(s.counters['mg.xfeed.signal_only']).toBe(1);
    expect(s.flags['pet.gold.xfeed']).toBe(true);
    // not the first run today any more: the 45-acorn cap shows; an idle run still pays the floor
    const again = minigameReward(s, 'xfeed', 'piggy-3', { score: 9100, stats: {} }, now + 60_000);
    expect(again.firstRun).toBe(false);
    expect(again.money).toBeLessThanOrEqual(45);
    const zero = minigameReward(s, 'xfeed', 'piggy-3', { score: 0, stats: {} }, now + 120_000);
    expect(zero.money).toBeGreaterThanOrEqual(5);
    expect(zero.medal).toBe('none');
  });
});

describe('For You Pig: playtest regressions', () => {
  test('card measurements cannot teleport the read line, including a long browser frame', () => {
    let value = 96;
    for (let frame = 0; frame < 3600; frame++) {
      const target = frame % 240 < 120 ? 52 : 130;
      const next = smoothLayout(value, target, frame % 31 ? 1 / 60 : 0.1);
      expect(Math.abs(next - value)).toBeLessThanOrEqual(3);
      expect(next).toBeGreaterThanOrEqual(Math.min(value, target));
      expect(next).toBeLessThanOrEqual(Math.max(value, target));
      value = next;
    }
    for (let frame = 0; frame < 600; frame++) value = smoothLayout(value, 100, 1 / 60);
    expect(Math.abs(value - 100)).toBeLessThan(0.1);
    expect(smoothLayout(96, 150, 0)).toBe(96);
  });

  test('the opening friend has five seconds, and missing them teaches the friend rule', () => {
    const e = new FeedEngine(11);
    expect(e.center(e.posts[0]) / e.rate).toBeGreaterThanOrEqual(5);
    expect(e.readable(e.posts[0])).toBe(true);
    for (let t = 0; t < 5; t += 1 / 60) e.update(t);
    expect(e.posts[0].state).toBe('live');
    for (let t = 5; t < 5.5; t += 1 / 60) e.update(t);
    const missed = e.takeFx().find((f) => f.kind === 'say' && f.key === 'missFriend');
    expect(missed).toBeDefined();
    if (missed?.kind === 'say') {
      expect(lineFor(missed, e.posts[0], new LinePicker(rng(1)))?.text).toContain('Like friends’ posts');
    }
    expect(callNote(e.posts[0], 0)).toContain('Piggy 2');
    expect(callNote(e.posts[0], 0)).not.toContain('baseline');
  });

  test('SAVE only earns points on gold posts; wasted bookmarks keep the combo', () => {
    for (const cls of ['signal', 'hype', 'friend', 'filler', 'gem']) {
      const seed = SEED_POSTS.find((p) => p.cls === cls)!;
      const e = new FeedEngine(4, { bank: [seed], opening: [seed.id] });
      e.score = 500;
      e.combo = 4;
      const call = e.call(0, 'save');
      expect(call).not.toBeNull();
      if (cls === 'gem') {
        expect(call!.pts).toBeGreaterThanOrEqual(300);
        expect(e.counts.saved).toBe(1);
      } else {
        expect(call!.pts).toBe(0);
        expect(e.score).toBe(500);
        expect(e.combo).toBe(4);
        expect(e.counts.correct + e.counts.wrong).toBe(0);
      }
    }
  });

  test('an exhausted flick stops waiting rather than leaving Loading on forever', () => {
    const e = new FeedEngine(11);
    for (let t = 0; t < 3; t += 1 / 60) { e.next(); e.update(t); }
    for (let t = 3; t < 4.5; t += 1 / 60) e.update(t);
    expect(e.loading).toBe(false);
  });

  test('length, underline, author and media cannot substitute for reading', () => {
    for (const withGems of [false, true]) {
      const bank = SEED_POSTS.filter((p) => p.cls === 'signal' || p.cls === 'hype' || (withGems && p.cls === 'gem'));
      const good = (p: (typeof bank)[number]) => p.cls !== 'hype';
      for (const tier of [0, 1, 2, 3]) {
        const rows = tier ? bank.filter((p) => p.tier === tier) : bank;
        for (const feature of [(p: (typeof bank)[number]) => plainText(p.text).length, (p: (typeof bank)[number]) => segments(p.text).filter((s) => s.tell).reduce((n, s) => n + s.t.length, 0)]) {
          let accuracy = 0;
          for (let threshold = 0; threshold <= 120; threshold++) {
            const hits = rows.filter((p) => (feature(p) >= threshold) === good(p)).length;
            accuracy = Math.max(accuracy, hits / rows.length, 1 - hits / rows.length);
          }
          expect(accuracy, `tier ${tier}, gems ${withGems}`).toBeLessThanOrEqual(0.65);
        }
      }
      // Leave one out: the post being predicted never trains its own author lookup.
      let hits = 0;
      for (const p of bank) {
        const peers = bank.filter((q) => q.id !== p.id && q.by === p.by);
        const training = peers.length ? peers : bank.filter((q) => q.id !== p.id);
        const predictsGood = training.filter(good).length >= training.length / 2;
        if (predictsGood === good(p)) hits++;
      }
      expect(hits / bank.length).toBeLessThanOrEqual(0.7);
      const media = bank.filter((p) => p.media);
      expect(media.filter(good).length / media.length).toBeLessThanOrEqual(0.65);
    }
  });
});
