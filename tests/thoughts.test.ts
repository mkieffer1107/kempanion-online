// Idle thought bubbles (thoughts final.md §13): the banks' content rules, the seeded scheduler (determinism, no
// repeats, weighting, gates, wants first), cadence and durations, the hub's thought-or-speech beat, and the icons.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setClockOffset } from '../src/lib/state/clock';
import { newSave } from '../src/lib/pet/sim';
import { currentWant, fulfillWant, wantName, wantSlot } from '../src/lib/pet/wants';
import * as PET_LINES from '../src/lib/pet/lines';
import { ITEMS } from '../src/lib/pet/items';
import { LOCATIONS, LOCATION_IDS, pigsAt, whereIs } from '../src/lib/content/locations';
import { META } from '../src/lib/minigames/meta';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { sentenceCount } from '../src/lib/ai/heuristic/template';
import { UI_ICONS } from '../src/lib/content/icons/ui';
import { ITEM_ICONS } from '../src/lib/content/icons/items';
import { THOUGHT_ICONS } from '../src/lib/content/icons/thoughts';
import { THOUGHT_BANKS, THOUGHT_FACES, type PigThoughts, type ThoughtDef } from '../src/lib/pet/thought-bank';
import {
  BARE_GATES, GATE_RE, SICK_TOPIC, THOUGHT, firstBeatMs, gateHolds, markThought, pickFromBank, pickThought, thinkBlock, thoughtGap,
  thoughtMs, thoughtName, thoughtPref, thoughtTags, thoughtWeight, thoughtsToday, topicHint, type Thought, type ThoughtCtx,
} from '../src/lib/pet/thoughts';
import { ambientKind } from '../src/lib/ui/hub/hub';
import { PIG_IDS, type LocationId, type PigId, type PigState, type SaveData } from '../src/lib/types';
import { ANIMS, BANNED } from './content-rules';

// Fixed game clock: Friday 2026-10-30, 3:42 PM local.
beforeAll(() => setClockOffset(Date.parse('2026-10-30T15:42:00') - Date.now()));
afterAll(() => setClockOffset(0));

const T = (iso: string) => new Date(iso).getTime(); // local wall clock
const DAY = 86_400_000;
const NUM: Record<PigId, number> = { 'piggy-1': 1, 'piggy-2': 2, 'piggy-3': 3 };
/** Where each pig is in the neutral context (the editor's sim: Piggy 3 at Physics in the daytime). */
const SPOT: Record<PigId, LocationId> = { 'piggy-1': 'malachowsky', 'piggy-2': 'communicore', 'piggy-3': 'physics' };

function ctxAt(now: number, pig: PigId, over: Partial<ThoughtCtx> = {}): ThoughtCtx {
  return { now, location: SPOT[pig], weather: 'clear', screen: 'hub', ...over };
}

/** A save where nobody is the companion: no wants, no needs, bedtimes by the clock. */
function freshSave(now = T('2026-10-30T14:55:00')): SaveData {
  return newSave(now);
}

/** Pick and mark until the pool (or the day) runs dry, or `max` thoughts. */
function runDay(save: SaveData, pig: PigId, now: number, max = 100, over: Partial<ThoughtCtx> = {}): Thought[] {
  const out: Thought[] = [];
  for (let i = 0; i < max; i++) {
    const t = pickThought(save, pig, ctxAt(now, pig, over));
    if (!t) break;
    markThought(save, pig, t, now);
    out.push(t);
  }
  return out;
}

// ───────────────────────── the banks (§3, §16) ─────────────────────────

const TOPICS: Record<PigId, readonly string[]> = {
  'piggy-1': ['volleyball', 'cs', 'haikyu', 'germany', 'food', 'campus', 'friends', 'player', 'life', 'birthday',
    'p2bday-soon', 'p3bday-soon', 'holiday-soon'],
  'piggy-2': ['neuro', 'perfusion', 'residency', 'collection', 'based', 'july4', 'july4-soon', 'labpigs', 'friends',
    'player', 'life', 'p1bday-soon', 'p3bday-soon', 'holiday-soon'],
  'piggy-3': ['x', 'math', 'agents', 'signals', 'robotics', 'hpc', 'onepiece', 'print3d', 'redbull', 'birthday-soon',
    'birthday', 'p1bday-soon', 'p2bday-soon', 'friends', 'campus', 'weather', 'life', 'player'],
};

/** Labels a thought may never wear: item names, places, mini-game titles, want labels (activities and talk topics). */
const TAKEN_LABELS = new Set(
  [
    ...Object.values(ITEMS).map((i) => i.name),
    ...Object.values(LOCATIONS).map((l) => l.name),
    ...Object.values(META).map((m) => m.title),
    'Play ball', 'Bath time', 'Head pats',
    'Volleyball talk', 'Serve stats', 'CS homework', 'Perfusion talk', 'Neuro facts', 'CSF chat', 'Codex talk',
    'His little project', 'Pirate manga', 'For You Pig',
  ].map((s) => s.toLowerCase()),
);

/** The hub's attention light, the Big Brain chip, sleep, the place and talk wants' icons. */
const AVOID_ICONS = ['alert', 'brain_big', 'zzz', 'pin', 'speech'];
const SECRET_ICONS = ['strawberry_milk', 'truffle_fries', 'sakura_dango'];
const SECRET_NAMES = /strawberry milk|pink milk|truffle fries|fries with truffle|sakura dango|\bdango\b/i;
const ASKS = /^(feed me|can we|could we|take me|let's go)/i;
const DOMAIN = /\b[a-z0-9-]+\.(?:com|org|net|io|ai|dev|edu|gov|co|app|xyz|me|tv)\b/gi;

const nonSick = (b: PigThoughts) => b.thoughts.filter((t) => t.topic !== SICK_TOPIC);
const gatesOf = (t: ThoughtDef) => [...(t.when ?? []), ...(t.whenAny ?? [])];

/** Every string in a value, recursively (line banks are nested records, arrays and tuples). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out);
  return out;
}

const words = (s: string) =>
  s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const grams = (s: string, n = 6) => {
  const w = words(s);
  const out: string[] = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
  return out;
};

/** The other lines a thought must not repeat: pet/lines.ts, the chat/greet/idle banks and every scene. */
const CORPUS: string[] = (() => {
  const out = strings(PET_LINES);
  for (const pig of PIG_IDS) strings([LINES[pig].chat, LINES[pig].greet, LINES[pig].idle], out);
  const dir = join(import.meta.dir, '..', 'src/lib/content/scenes');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.ks'))) {
    for (const l of readFileSync(join(dir, f), 'utf8').split('\n')) {
      const text = l.replace(/^[\w-]+(?: [\w-]+)?:\s*/, '').trim();
      if (text && !text.startsWith('[') && !text.startsWith('#')) out.push(text);
    }
  }
  return out.filter((s) => s.trim().split(/\s+/).length >= 3);
})();

describe('thought banks: content rules', () => {
  for (const pig of PIG_IDS) {
    const bank = THOUGHT_BANKS[pig];
    const n = NUM[pig];

    test(`${pig}: ids, topics and rules`, () => {
      expect(bank.pig).toBe(pig);
      const ids = bank.thoughts.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const t of bank.thoughts) {
        expect(t.id).toMatch(new RegExp(`^p${n}\\.[a-z0-9_-]+$`));
        expect([t.id, [...TOPICS[pig], SICK_TOPIC]]).toEqual([t.id, expect.arrayContaining([t.topic])]);
      }
      for (const [topic, r] of Object.entries(bank.topics)) {
        expect([...TOPICS[pig], SICK_TOPIC]).toContain(topic);
        if (r.pose) expect(ANIMS.has(r.pose)).toBe(true);
        for (const tag of Object.keys(r.mult ?? {})) expect([tag, GATE_RE.test(tag) || BARE_GATES.includes(tag as never)]).toEqual([tag, true]);
      }
      // Piggy 3's X (§3.3): a 60/40 share, never three in a row; the capped topics
      const shares = Object.entries(bank.topics).filter(([, r]) => r.share !== undefined);
      expect(shares.length).toBeLessThanOrEqual(1);
      if (pig === 'piggy-3') {
        expect(bank.topics.x).toMatchObject({ share: 0.6, streak: 2, mult: { first: 3, 'time:late': 1.5 }, hint: 'probably on X' });
        expect(bank.topics.print3d?.cap).toBe(1);
        expect(bank.topics.redbull?.cap).toBe(2);
      }
      if (pig === 'piggy-1') expect([bank.topics.germany?.cap, bank.topics.food?.cap]).toEqual([3, 2]);
      if (pig === 'piggy-2') expect([bank.topics.collection?.cap, bank.topics.july4?.cap]).toEqual([3, 1]);
    });

    test(`${pig}: labels read as thoughts`, () => {
      const labels = bank.thoughts.map((t) => t.label);
      expect(new Set(labels).size).toBe(labels.length);
      for (const l of labels) {
        expect([l, l.length >= 1 && l.length <= THOUGHT.labelMax]).toEqual([l, true]);
        expect(l).toMatch(/^[\x20-\x7e]+$/);
        expect(l).toBe(l.trim());
        expect([l, TAKEN_LABELS.has(l.toLowerCase())]).toEqual([l, false]);
      }
    });

    test(`${pig}: tap lines (≤ 120 chars, ≤ 2 sentences, no placeholders)`, () => {
      for (const t of bank.thoughts) {
        expect([t.id, t.line.length >= 1 && t.line.length <= THOUGHT.lineMax]).toEqual([t.id, true]);
        expect([t.id, sentenceCount(t.line)]).toEqual([t.id, Math.min(2, sentenceCount(t.line))]);
        expect(t.line).not.toMatch(/[{}]/);
      }
    });

    test(`${pig}: faces, clips, icons`, () => {
      const known = new Set([...Object.keys(UI_ICONS), ...Object.keys(ITEM_ICONS), ...Object.keys(THOUGHT_ICONS)]);
      for (const t of bank.thoughts) {
        expect(THOUGHT_FACES as readonly string[]).toContain(t.face);
        if (t.anim) expect([t.id, ANIMS.has(t.anim)]).toEqual([t.id, true]);
        if (t.pose) expect([t.id, ANIMS.has(t.pose)]).toEqual([t.id, true]);
        expect([t.id, t.icon, known.has(t.icon)]).toEqual([t.id, t.icon, true]);
        expect([t.id, AVOID_ICONS.includes(t.icon)]).toEqual([t.id, false]);
        if (SECRET_ICONS.includes(t.icon)) expect([t.id, t.when ?? []]).toEqual([t.id, expect.arrayContaining(['secret'])]);
      }
    });

    test(`${pig}: every gate matches the tag grammar, every place is real`, () => {
      for (const t of bank.thoughts) {
        for (const g of gatesOf(t)) {
          expect([t.id, g, GATE_RE.test(g) || BARE_GATES.includes(g as never)]).toEqual([t.id, g, true]);
          if (g.startsWith('place:')) for (const p of g.slice(6).split(',')) expect(LOCATION_IDS).toContain(p as LocationId);
          if (g.startsWith('with:')) for (const p of g.slice(5).split(',')) expect(PIG_IDS).toContain(p as PigId);
        }
      }
    });

    // A gate that names a place nobody's schedule visits (Century Tower, say) would leave a thought dead for good:
    // every thought must be able to show during one week of the pig's real schedule.
    test(`${pig}: every thought can show: his schedule meets its place, time, day and company gates`, () => {
      const SCHEDULE_GATE = /^(place|time|day|with):/;
      const save = freshSave();
      save.companion = pig; // awake by the clock, so `time:late` can hold
      const monday = T('2026-10-26T00:00:00'); // the week of Sat 2026-10-31, a game day
      const shows = new Set<string>();
      for (let step = 0; step < 7 * 48; step++) {
        const at = monday + step * 30 * 60_000;
        const d = new Date(at);
        const loc = whereIs(pig, d);
        const tags = thoughtTags(save, pig, { now: at, location: loc, weather: 'clear', screen: 'place', others: pigsAt(loc, d).filter((p) => p !== pig) });
        for (const t of bank.thoughts) {
          if (t.topic === SICK_TOPIC) continue;
          // needs, hearts, dates, weather and secrets come from the save and the calendar, not the schedule: they may hold
          if (!(t.when ?? []).filter((g) => SCHEDULE_GATE.test(g)).every((g) => gateHolds(g, tags))) continue;
          if (t.whenAny?.length && !t.whenAny.some((g) => !SCHEDULE_GATE.test(g) || gateHolds(g, tags))) continue;
          shows.add(t.id);
        }
      }
      expect(bank.thoughts.filter((t) => t.topic !== SICK_TOPIC && !shows.has(t.id)).map((t) => t.id)).toEqual([]);
    });

    test(`${pig}: kind, PG, no people, X said right, secrets gated, asks gated`, () => {
      for (const t of bank.thoughts) {
        const text = `${t.label} ${t.line}`;
        expect([t.id, BANNED.test(text)]).toEqual([t.id, false]);
        expect([t.id, /@\w/.test(text)]).toEqual([t.id, false]);
        expect([t.id, (text.match(DOMAIN) ?? []).filter((d) => d.toLowerCase() !== 'x.com')]).toEqual([t.id, []]);
        if (/twitter|tweet/i.test(t.line)) expect([t.id, /\bX\b/.test(t.line)]).toEqual([t.id, true]);
        if (SECRET_NAMES.test(text)) expect([t.id, t.when ?? []]).toEqual([t.id, expect.arrayContaining(['secret'])]);
        if (ASKS.test(t.line)) expect([t.id, gatesOf(t).some((g) => /^(need|low):/.test(g))]).toEqual([t.id, true]);
      }
    });

    test(`${pig}: sizes (§3.5)`, () => {
      const ns = nonSick(bank);
      const sick = bank.thoughts.filter((t) => t.topic === SICK_TOPIC);
      expect(ns.length).toBeGreaterThanOrEqual(56);
      expect(sick.length).toBeGreaterThanOrEqual(4);
      expect(sick.length).toBeLessThanOrEqual(6);
      for (const s of sick) expect(s.when ?? []).toEqual([]);
      if (pig === 'piggy-3') {
        const x = ns.filter((t) => t.topic === 'x').length;
        expect(x).toBeGreaterThanOrEqual(26);
        expect(x / ns.length).toBeGreaterThanOrEqual(0.45);
        expect(x / ns.length).toBeLessThanOrEqual(0.55);
        expect(ns.filter((t) => t.topic === 'print3d').length).toBeLessThanOrEqual(2);
      }
      if (pig === 'piggy-2') {
        for (const t of bank.thoughts) expect([t.id, `${t.label} ${t.line}`.includes('!')]).toEqual([t.id, false]);
        const own = bank.thoughts.filter((t) => ['neutral', 'proud', 'thinking'].includes(t.face)).length;
        expect(own / bank.thoughts.length).toBeGreaterThanOrEqual(0.6);
      }
    });
  }

  test('no repeats: no line said elsewhere (exact, or a shared run of 6+ words), none twice across the pools', () => {
    const all = PIG_IDS.flatMap((p) => THOUGHT_BANKS[p].thoughts);
    const lines = all.map((t) => t.line.toLowerCase());
    expect(new Set(lines).size).toBe(lines.length);
    const exact = new Set(CORPUS.map((s) => s.trim().toLowerCase()));
    const seen = new Map<string, string>();
    for (const s of CORPUS) for (const g of grams(s)) if (!seen.has(g)) seen.set(g, s);
    const hits: string[] = [];
    for (const t of all) {
      if (exact.has(t.line.trim().toLowerCase())) hits.push(`${t.id}: said elsewhere`);
      for (const g of grams(t.line)) if (seen.has(g)) hits.push(`${t.id}: "${g}" (also in "${seen.get(g)!.slice(0, 80)}")`);
    }
    // across the pools
    const own = new Map<string, string>();
    for (const t of all) {
      for (const g of new Set(grams(t.line))) {
        const other = own.get(g);
        if (other && other !== t.id) hits.push(`${t.id}: "${g}" (also in ${other})`);
        own.set(g, t.id);
      }
    }
    expect(hits).toEqual([]);
  });
});

// ───────────────────────── the scheduler (§4) ─────────────────────────

describe('pickThought: determinism', () => {
  test('the same save, pig and context give the same thought, and the save is untouched', () => {
    for (const pig of PIG_IDS) {
      const save = freshSave();
      const ctx = ctxAt(T('2026-10-30T14:55:00'), pig);
      const before = JSON.stringify(save);
      const a = pickThought(save, pig, ctx);
      const b = pickThought(save, pig, ctx);
      expect(a).not.toBeNull();
      expect(b).toEqual(a);
      expect(JSON.stringify(save)).toBe(before);
      expect(a!.key).toBe('2026-10-30#0');
      expect(a!.ms).toBe(thoughtMs(a!.label));
    }
  });

  test('three dates give different first-10 sequences; a marked thought is never picked again that day', () => {
    for (const pig of PIG_IDS) {
      const seqs = ['2027-02-09', '2027-02-10', '2027-02-11'].map((d) =>
        runDay(freshSave(), pig, T(`${d}T14:55:00`), 10).map((t) => t.id).join(','));
      expect(new Set(seqs).size).toBe(3);
      const save = freshSave();
      const now = T('2026-10-30T14:55:00');
      const t1 = pickThought(save, pig, ctxAt(now, pig))!;
      markThought(save, pig, t1, now);
      expect(thoughtsToday(save, pig, now)).toEqual([t1.id]);
      const t2 = pickThought(save, pig, ctxAt(now, pig))!;
      expect(t2.id).not.toBe(t1.id);
      expect(t2.key).toBe('2026-10-30#1');
    }
  });

  test('pick and mark until null: unique ids, at most the daily cap; the next date starts over', () => {
    for (const pig of PIG_IDS) {
      const save = freshSave();
      const now = T('2026-10-30T14:55:00');
      const day = runDay(save, pig, now);
      expect(day.length).toBeGreaterThan(10);
      expect(day.length).toBeLessThanOrEqual(THOUGHT.dailyMax);
      expect(new Set(day.map((t) => t.id)).size).toBe(day.length);
      expect(pickThought(save, pig, ctxAt(now, pig))).toBeNull();
      expect(thoughtsToday(save, pig, now + DAY)).toEqual([]);
      expect(pickThought(save, pig, ctxAt(now + DAY, pig))).not.toBeNull();
    }
  });

  test('the log is {d, ids} under pet.<pig>.thoughts; a stale date counts as empty', () => {
    const save = freshSave();
    const now = T('2026-10-30T14:55:00');
    const t = pickThought(save, 'piggy-3', ctxAt(now, 'piggy-3'))!;
    markThought(save, 'piggy-3', t, now);
    expect(JSON.parse(save.flags['pet.piggy-3.thoughts'] as string)).toEqual({ d: '2026-10-30', ids: [t.id] });
    save.flags['pet.piggy-3.thoughts'] = JSON.stringify({ d: '2026-10-29', ids: [t.id] });
    expect(thoughtsToday(save, 'piggy-3', now)).toEqual([]);
    save.flags['pet.piggy-3.thoughts'] = 'not json';
    expect(thoughtsToday(save, 'piggy-3', now)).toEqual([]);
  });
});

describe('pickThought: weighting (300 days × 25 picks, neutral context)', () => {
  const START = T('2027-01-04T14:55:00'); // Jan–Oct 2027: no Piggy 3 birthday in the run
  const runs = new Map<PigId, Thought[][]>();
  const days = (pig: PigId) => {
    if (!runs.has(pig)) {
      const out: Thought[][] = [];
      for (let d = 0; d < 300; d++) out.push(runDay(freshSave(), pig, START + d * DAY, 25));
      runs.set(pig, out);
    }
    return runs.get(pig)!;
  };

  test('Piggy 3 thinks about X about half the time, first thing most days, never three in a row', () => {
    const all = days('piggy-3');
    const flat = all.flat();
    const x = flat.filter((t) => t.topic === 'x').length / flat.length;
    expect(x).toBeGreaterThanOrEqual(0.46);
    expect(x).toBeLessThanOrEqual(0.54);
    const first = all.filter((d) => d[0]?.topic === 'x').length / all.length;
    expect(first).toBeGreaterThanOrEqual(0.75);
    expect(first).toBeLessThanOrEqual(0.89);
    for (const d of all) {
      for (let i = 2; i < d.length; i++) expect(d[i].topic === 'x' && d[i - 1].topic === 'x' && d[i - 2].topic === 'x').toBe(false);
      for (let i = 1; i < d.length; i++) if (d[i].topic !== 'x') expect(d[i].topic).not.toBe(d[i - 1].topic);
      expect(d.filter((t) => t.topic === 'print3d').length).toBeLessThanOrEqual(1);
    }
  });

  test('every cap holds for every pig (countdowns once a day); no Piggy 1 or Piggy 2 topic above 35%', () => {
    for (const pig of PIG_IDS) {
      const bank = THOUGHT_BANKS[pig];
      const all = days(pig);
      for (const d of all) {
        const count = new Map<string, number>();
        for (const t of d) count.set(t.topic, (count.get(t.topic) ?? 0) + 1);
        for (const [topic, c] of count) {
          const cap = bank.topics[topic]?.cap ?? (topic.endsWith('-soon') ? 1 : Infinity);
          expect([pig, topic, c <= cap]).toEqual([pig, topic, true]);
        }
        if (pig !== 'piggy-3') for (let i = 1; i < d.length; i++) expect(d[i].topic).not.toBe(d[i - 1].topic);
      }
      if (pig === 'piggy-3') continue;
      const flat = all.flat();
      const count = new Map<string, number>();
      for (const t of flat) count.set(t.topic, (count.get(t.topic) ?? 0) + 1);
      for (const [topic, c] of count) expect([pig, topic, c / flat.length <= 0.35]).toEqual([pig, topic, true]);
    }
  });

  test('thoughtWeight: low ×6; need, weather, place, with, gameday, a date range ×3; time, day, tier, outfit ×1.5; at most ×12', () => {
    const tags = new Set([
      'low:hungry', 'need:hungry', 'weather:rain', 'place:physics', 'with:piggy-1', 'day:gameday', 'day:sat', 'date:10-31',
      'time:day', 'tier:F', 'tier:NF', 'tier:FW', 'outfit:everyday', 'screen:hub', 'first',
    ]);
    const w = (when: string[], weight?: number) =>
      thoughtWeight({ id: 'p3.t', topic: 'life', label: 'T', icon: 'star', line: 'T.', face: 'happy', when, weight }, tags, {});
    expect(w([])).toBe(1);
    expect(w(['low:hungry'])).toBe(6);
    for (const g of ['need:hungry', 'weather:rain', 'place:physics', 'with:piggy-1', 'day:gameday', 'date:10-24..11-02']) expect([g, w([g])]).toEqual([g, 3]);
    for (const g of ['time:day', 'day:sat', 'tier:FW', 'outfit:everyday', 'first']) expect([g, w([g])]).toEqual([g, 1.5]);
    expect(w(['screen:hub'])).toBe(1);
    expect(w(['date:10-31'])).toBe(1); // a single day comes first instead
    expect(w(['low:hungry', 'place:physics'])).toBe(12);
    expect(w(['place:physics'], 2)).toBe(6);
    // a topic's multipliers apply to its weights unless it is the share topic (that moves the odds)
    const def: ThoughtDef = { id: 'p3.t', topic: 'math', label: 'T', icon: 'star', line: 'T.', face: 'happy' };
    expect(thoughtWeight(def, tags, { math: { mult: { first: 2 } } })).toBe(2);
    expect(thoughtWeight(def, tags, { math: { share: 0.5, mult: { first: 2 } } })).toBe(1);
  });
});

describe('pickThought: gates', () => {
  test('gated thoughts stay out of context: a birthday in March, company when alone, the secret before discovery', () => {
    const save = freshSave();
    const march = runDay(save, 'piggy-3', T('2027-03-10T14:55:00'));
    expect(march.some((t) => gatesOf(THOUGHT_BANKS['piggy-3'].thoughts.find((d) => d.id === t.id)!).some((g) => /date:11-07/.test(g)))).toBe(false);
    for (const pig of PIG_IDS) {
      const s = freshSave();
      const day = runDay(s, pig, T('2026-10-30T14:55:00'), 100, { others: [] });
      for (const t of day) {
        const def = THOUGHT_BANKS[pig].thoughts.find((d) => d.id === t.id)!;
        expect([t.id, gatesOf(def).some((g) => g.startsWith('with:') || g === 'secret')]).toEqual([t.id, false]);
      }
    }
  });

  test('company and the secret open their thoughts', () => {
    for (const pig of PIG_IDS) {
      const bank = THOUGHT_BANKS[pig];
      const withGated = bank.thoughts.filter((t) => gatesOf(t).some((g) => g.startsWith('with:')));
      const secret = bank.thoughts.filter((t) => t.when?.includes('secret'));
      expect(withGated.length + secret.length).toBeGreaterThan(0);
      const save = freshSave();
      save.flags[`pet.${pig}.secret`] = true;
      const now = T('2026-10-30T14:55:00');
      const others = PIG_IDS.filter((p) => p !== pig);
      const tags = thoughtTags(save, pig, ctxAt(now, pig, { others }));
      expect(tags.has('secret')).toBe(true);
      for (const o of others) expect(tags.has(`with:${o}`)).toBe(true);
    }
  });

  test('time:late: Piggy 3 at 23:30, not at 22:00', () => {
    const save = freshSave();
    expect(thoughtTags(save, 'piggy-3', ctxAt(T('2026-11-04T23:30:00'), 'piggy-3')).has('time:late')).toBe(true);
    expect(thoughtTags(save, 'piggy-3', ctxAt(T('2026-11-04T22:00:00'), 'piggy-3')).has('time:late')).toBe(false);
  });

  test('tags: time, weather (rain holds in a storm), day, game day, date, Thanksgiving week, tier, need only for the companion', () => {
    const save = freshSave();
    save.companion = 'piggy-1';
    save.pigs['piggy-1'].needs.hunger = 20;
    save.pigs['piggy-1'].needs.fun = 50;
    save.pigs['piggy-1'].bond = 450;
    const tags = thoughtTags(save, 'piggy-1', ctxAt(T('2026-10-31T14:55:00'), 'piggy-1', { weather: 'storm', location: 'stadium' }));
    for (const t of ['time:day', 'weather:rain', 'weather:storm', 'day:sat', 'day:weekend', 'day:gameday', 'date:10-31',
      'place:stadium', 'tier:F', 'tier:NF', 'tier:FW', 'need:hungry', 'low:hungry', 'need:bored', 'outfit:everyday', 'screen:hub', 'first']) {
      expect([t, tags.has(t)]).toEqual([t, true]);
    }
    expect(tags.has('low:bored')).toBe(false);
    expect(gateHolds('date:10-24..10-31', tags)).toBe(true);
    expect(gateHolds('date:12-20..01-05', tags)).toBe(false);
    expect(gateHolds('time:evening,day', tags)).toBe(true);
    const other = thoughtTags(save, 'piggy-2', ctxAt(T('2026-10-31T14:55:00'), 'piggy-2'));
    expect([...other].some((t) => t.startsWith('need:') || t.startsWith('low:'))).toBe(false);
    // Thanksgiving 2026 is Thu Nov 26: the week runs Mon 23 – Sun 29
    expect(thoughtTags(save, 'piggy-2', ctxAt(T('2026-11-23T12:00:00'), 'piggy-2')).has('date:thanksgiving')).toBe(true);
    expect(thoughtTags(save, 'piggy-2', ctxAt(T('2026-11-29T12:00:00'), 'piggy-2')).has('date:thanksgiving')).toBe(true);
    expect(thoughtTags(save, 'piggy-2', ctxAt(T('2026-11-30T12:00:00'), 'piggy-2')).has('date:thanksgiving')).toBe(false);
    // the new-year wrap
    expect(gateHolds('date:12-20..01-05', new Set(['date:01-02']))).toBe(true);
  });

  test('his birthday comes first on its day; inside a countdown range the first pick still varies', () => {
    for (const y of [2026, 2027, 2028]) {
      const t = pickThought(freshSave(), 'piggy-3', ctxAt(T(`${y}-11-07T14:55:00`), 'piggy-3'))!;
      const def = THOUGHT_BANKS['piggy-3'].thoughts.find((d) => d.id === t.id)!;
      expect(def.when ?? []).toContain('date:11-07');
    }
    const firsts = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(
      (y) => pickThought(freshSave(), 'piggy-3', ctxAt(T(`${y}-11-03T14:55:00`), 'piggy-3'))!.topic);
    expect(firsts.every((t) => t === 'birthday-soon')).toBe(false);
  });

  test('a sick pig thinks only sick thoughts', () => {
    for (const pig of PIG_IDS) {
      const save = freshSave();
      save.companion = pig;
      save.pigs[pig].sick = true;
      const day = runDay(save, pig, T('2026-10-30T14:55:00'));
      expect(day.length).toBeGreaterThanOrEqual(4);
      for (const t of day) expect(t.topic).toBe(SICK_TOPIC);
    }
  });

  test('pose: the thought’s own, else its topic’s', () => {
    const bank: PigThoughts = {
      pig: 'piggy-3',
      topics: { agents: { pose: 'typing', streak: 2 } },
      thoughts: [
        { id: 'p3.a', topic: 'agents', label: 'A', icon: 'star', line: 'A.', face: 'happy' },
        { id: 'p3.b', topic: 'agents', label: 'B', icon: 'star', line: 'B.', face: 'happy', pose: 'ai_idea' },
      ],
    };
    const save = freshSave();
    const now = T('2026-10-30T14:55:00');
    const seen: Record<string, string | undefined> = {};
    for (let t = pickFromBank(bank, save, 'piggy-3', ctxAt(now, 'piggy-3')); t; t = pickFromBank(bank, save, 'piggy-3', ctxAt(now, 'piggy-3'))) {
      seen[t.id] = t.pose;
      markThought(save, 'piggy-3', t, now);
    }
    expect(seen).toEqual({ 'p3.a': 'typing', 'p3.b': 'ai_idea' });
  });

  test('a single-day thought comes first; the share topic’s odds follow its multipliers', () => {
    const bank: PigThoughts = {
      pig: 'piggy-3',
      topics: { x: { share: 0.6, streak: 2, mult: { first: 3 } } },
      thoughts: [
        ...Array.from({ length: 10 }, (_, i): ThoughtDef => ({ id: `p3.x${i}`, topic: 'x', label: `X ${i}`, icon: 'star', line: `X ${i}.`, face: 'happy' })),
        ...Array.from({ length: 10 }, (_, i): ThoughtDef => ({ id: `p3.o${i}`, topic: `t${i}`, label: `O ${i}`, icon: 'star', line: `O ${i}.`, face: 'happy' })),
        { id: 'p3.day', topic: 'birthday', label: 'Day', icon: 'star', line: 'Day.', face: 'happy', when: ['date:11-07'] },
      ],
    };
    expect(pickFromBank(bank, freshSave(), 'piggy-3', ctxAt(T('2026-11-07T14:55:00'), 'piggy-3'))?.id).toBe('p3.day');
    let firstX = 0;
    let laterX = 0;
    for (let d = 0; d < 400; d++) {
      const save = freshSave();
      const now = T('2027-01-04T14:55:00') + d * DAY;
      const a = pickFromBank(bank, save, 'piggy-3', ctxAt(now, 'piggy-3'))!;
      if (a.topic === 'x') firstX++;
      markThought(save, 'piggy-3', { ...a, id: 'p3.o9', topic: 't9' }, now); // a non-x first thought, so the next isn't 'first'
      const b = pickFromBank(bank, save, 'piggy-3', ctxAt(now, 'piggy-3'))!;
      if (b.topic === 'x') laterX++;
    }
    expect(firstX / 400).toBeGreaterThan(0.75); // odds 1.5 × 3 = 4.5 → 0.82
    expect(firstX / 400).toBeLessThan(0.89);
    expect(laterX / 400).toBeGreaterThan(0.52); // odds 1.5 → 0.6
    expect(laterX / 400).toBeLessThan(0.68);
  });
});

describe('wants win; asleep and off', () => {
  /** A minute inside a want slot while the companion is awake. */
  function wantTime(): number {
    for (let t = T('2026-10-30T09:00:00'); t < T('2026-10-30T20:00:00'); t += 60_000) if (wantSlot(t)) return t;
    throw new Error('no want slot');
  }

  test('want-free moments: hh:55 for hh in 8, 11, 14, 17, 20, 23', () => {
    for (const h of [8, 11, 14, 17, 20, 23]) expect(wantSlot(T(`2026-10-30T${String(h).padStart(2, '0')}:55:00`))).toBeNull();
  });

  test('a companion with a live want has no thoughts until it is fulfilled; the others keep thinking', () => {
    const at = wantTime();
    const save = freshSave(at);
    save.companion = 'piggy-3';
    expect(currentWant(save, 'piggy-3', at)).not.toBeNull();
    expect(thinkBlock(save, 'piggy-3', at)).toBe('want');
    expect(pickThought(save, 'piggy-3', ctxAt(at, 'piggy-3'))).toBeNull();
    expect(thinkBlock(save, 'piggy-1', at)).toBeNull();
    expect(pickThought(save, 'piggy-1', ctxAt(at, 'piggy-1'))).not.toBeNull();
    const w = currentWant(save, 'piggy-3', at)!;
    expect(fulfillWant(save, 'piggy-3', w.kind, w.id, at)).not.toBeNull();
    expect(thinkBlock(save, 'piggy-3', at)).toBeNull();
    expect(pickThought(save, 'piggy-3', ctxAt(at, 'piggy-3'))).not.toBeNull();
  });

  test('asleep → asleep, Settings off → off, the daily cap → done', () => {
    const save = freshSave();
    save.companion = 'piggy-2';
    const day = T('2026-10-30T11:55:00');
    save.pigs['piggy-2'].asleep = true;
    expect(thinkBlock(save, 'piggy-2', day)).toBe('asleep');
    save.pigs['piggy-2'].asleep = false;
    expect(thinkBlock(save, 'piggy-1', T('2026-10-30T23:55:00'))).toBe('asleep'); // the others sleep by their bedtimes
    expect(thoughtPref(save)).toBe('some');
    save.flags['ui.thoughts'] = 'off';
    expect(thoughtPref(save)).toBe('off');
    expect(thinkBlock(save, 'piggy-2', day)).toBe('off');
    expect(pickThought(save, 'piggy-2', ctxAt(day, 'piggy-2'))).toBeNull();
    save.flags['ui.thoughts'] = 'lots';
    expect(thoughtPref(save)).toBe('lots');
    save.flags['pet.piggy-2.thoughts'] = JSON.stringify({ d: '2026-10-30', ids: Array.from({ length: THOUGHT.dailyMax }, (_, i) => `p2.z${i}`) });
    expect(thinkBlock(save, 'piggy-2', day)).toBe('done');
  });

  test('accessible names: the want and the thought', () => {
    expect(wantName('Piggy 3', { label: 'Boba Milk Tea' })).toBe('Piggy 3 wants: Boba Milk Tea');
    expect(thoughtName('Piggy 3', 'Thread 1/27')).toBe('Piggy 3’s thought: Thread 1/27');
  });

  test('the map caption: Piggy 3 is often "probably on X"; nothing for a pig without hints', () => {
    const save = freshSave();
    const base = T('2026-10-30T14:00:00');
    const hints = Array.from({ length: 60 }, (_, i) => topicHint(save, 'piggy-3', base + i * 600_000));
    expect(hints.filter((h) => h === 'probably on X').length).toBeGreaterThan(20);
    for (const h of hints) expect([null, 'probably on X']).toContain(h);
    expect(topicHint(save, 'piggy-1', base)).toBeNull();
  });
});

describe('cadence and durations (§4.5)', () => {
  const save = freshSave();
  const now = T('2026-10-30T14:55:00');
  const gap = (beat: number, o: Partial<Parameters<typeof thoughtGap>[3]> = {}, s = save) =>
    thoughtGap(s, 'piggy-3', now, { beat, visit: 1000, afk: false, screen: 'hub', ...o });

  test('place tiers retain their ranges and deterministic rhythm, including AFK', () => {
    for (const [beat, [lo, hi]] of [[0, [20, 40]], [7, [20, 40]], [8, [40, 80]], [19, [40, 80]], [20, [120, 240]], [60, [120, 240]]] as const) {
      for (let visit = 0; visit < 20; visit++) {
        const ms = gap(beat, { visit, screen: 'place' });
        expect([beat, ms >= lo * 1000 && ms <= hi * 1000]).toEqual([beat, true]);
        expect(gap(beat, { visit, screen: 'place' })).toBe(ms);
      }
      const afk = gap(beat, { afk: true, screen: 'place' });
      expect(afk).toBeGreaterThanOrEqual(180_000);
      expect(afk).toBeLessThanOrEqual(360_000);
    }
    expect(gap(0, { visit: 1 })).not.toBe(gap(0, { visit: 2 }));
  });

  test('lots × 0.7; off keeps today’s chatter tempo; place: ÷ pigs present, never under 18 s or minMs', () => {
    const lots = freshSave();
    lots.flags['ui.thoughts'] = 'lots';
    for (const beat of [0, 8, 20]) expect(Math.abs(gap(beat, {}, lots) - gap(beat) * 0.7)).toBeLessThanOrEqual(1);
    const off = freshSave();
    off.flags['ui.thoughts'] = 'off';
    for (const beat of [0, 8, 20, 60]) {
      const ms = gap(beat, { afk: true }, off);
      expect(ms >= 12_000 && ms <= 20_000).toBe(true);
    }
    for (const beat of [0, 8, 20]) {
      const one = gap(beat, { screen: 'place', onScreen: 1 });
      const three = gap(beat, { screen: 'place', onScreen: 3 });
      expect(Math.abs(three - Math.max(18_000, one / 3))).toBeLessThanOrEqual(1);
      expect(three).toBeGreaterThanOrEqual(18_000);
    }
    expect(gap(0, { minMs: 99_000 })).toBe(99_000);
    expect(gap(0, { screen: 'place', onScreen: 3, minMs: 30_000 })).toBeGreaterThanOrEqual(30_000);
  });

  test('all three hub companions keep frequent beats on long visits, with a gentler AFK interval', () => {
    for (const pig of PIG_IDS) for (const beat of [0, 8, 20, 60]) for (let visit = 0; visit < 20; visit++) {
      for (const afk of [false, true]) {
        const opts = { beat, visit, afk, screen: 'hub' as const };
        const ms = thoughtGap(save, pig, now, opts);
        expect(ms).toBeGreaterThanOrEqual(afk ? 20_000 : 12_000);
        expect(ms).toBeLessThanOrEqual(afk ? 30_000 : 20_000);
        expect(thoughtGap(save, pig, now, opts)).toBe(ms);
      }
      const first = firstBeatMs('hub', pig, now, visit);
      expect(first).toBeGreaterThanOrEqual(6000);
      expect(first).toBeLessThanOrEqual(10_000);
      const place = firstBeatMs('place', pig, now, visit);
      expect(place).toBeGreaterThanOrEqual(8000);
      expect(place).toBeLessThanOrEqual(14_000);
    }
    const lots = freshSave();
    lots.flags['ui.thoughts'] = 'lots';
    expect(gap(0, { minMs: 8000 + THOUGHT.restMs }, lots)).toBeGreaterThanOrEqual(12_000);
  });

  test('thoughtMs: 6–8 s, longer for longer labels, 8 s at 20 characters', () => {
    expect(thoughtMs('')).toBe(6000);
    expect(thoughtMs('Thread 1/27')).toBe(7100);
    expect(thoughtMs('X.com is loading...')).toBe(7900);
    expect(thoughtMs('x'.repeat(20))).toBe(8000);
    expect(thoughtMs('x'.repeat(40))).toBe(8000);
    let prev = 0;
    for (let n = 0; n <= 20; n++) {
      const ms = thoughtMs('x'.repeat(n));
      expect(ms).toBeGreaterThanOrEqual(prev);
      prev = ms;
    }
  });
});

describe('the hub beat: thought or speech (ambientKind)', () => {
  const pig = (needs: Partial<PigState['needs']> = {}, over: Partial<PigState> = {}): PigState => ({
    ...newSave(0).pigs['piggy-1'], needs: { hunger: 80, energy: 80, hygiene: 80, fun: 80, ...needs }, ...over,
  });
  const o = (over: Partial<Parameters<typeof ambientKind>[1]> = {}) => ({ wantLive: false, pref: 'some' as const, first: false, ...over });

  test('a live want, Off or sleep: speech; the first beat of a visit: a thought', () => {
    expect(ambientKind(pig(), o({ wantLive: true, first: true }), 0)).toBe('speech');
    expect(ambientKind(pig(), o({ pref: 'off', first: true }), 0)).toBe('speech');
    expect(ambientKind(pig({}, { asleep: true }), o({ first: true }), 0)).toBe('speech');
    expect(ambientKind(pig(), o({ first: true }), 0.99)).toBe('thought');
  });

  test('fine: a thought below 0.7 (0.85 with Lots); a low need or sick: below 0.5', () => {
    expect(ambientKind(pig(), o(), 0.69)).toBe('thought');
    expect(ambientKind(pig(), o(), 0.71)).toBe('speech');
    expect(ambientKind(pig(), o({ pref: 'lots' }), 0.8)).toBe('thought');
    expect(ambientKind(pig({ hunger: 10 }), o(), 0.49)).toBe('thought');
    expect(ambientKind(pig({ hunger: 10 }), o(), 0.51)).toBe('speech');
    expect(ambientKind(pig({}, { sick: true }), o(), 0.49)).toBe('thought');
    expect(ambientKind(pig({}, { sick: true }), o(), 0.51)).toBe('speech');
  });
});

describe('thought icons (§11)', () => {
  test('16×16, palette keys or ".", no clash with UI or item icons, no logos', () => {
    expect(Object.keys(THOUGHT_ICONS).length).toBeGreaterThanOrEqual(18); // the registry is real, not a fallback
    for (const [id, icon] of Object.entries(THOUGHT_ICONS)) {
      expect([id, icon.rows.length]).toEqual([id, 16]);
      for (const row of icon.rows) {
        expect([id, row.length]).toEqual([id, 16]);
        for (const ch of row) if (ch !== '.') expect([id, ch, ch in icon.palette]).toEqual([id, ch, true]);
      }
      expect([id, id in UI_ICONS || id in ITEM_ICONS]).toEqual([id, false]);
      expect(['x', 'x_logo', 'twitter', 'bird']).not.toContain(id);
    }
  });
});
