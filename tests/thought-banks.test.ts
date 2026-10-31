// Idle thought banks (thoughts final.md §3, §11, §16): every field of every thought obeys its limits, every icon resolves,
// and the pools say what the character files and the owner's calls say. This reads the three banks and the icon registries
// directly (not through thought-bank/index.ts), so it checks the data on its own; tests/thoughts.test.ts covers the seeded
// scheduler and re-runs the content rules over THOUGHT_BANKS once the banks are wired in.
//
// Re-run it whenever a bank, a line bank or a scene changes: the no-repeat rule compares the pools with all of them.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sentenceCount } from '../src/lib/ai/heuristic/template';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { ICONS } from '../src/lib/content/icons';
import { ITEM_ICONS } from '../src/lib/content/icons/items';
import { THOUGHT_ICONS } from '../src/lib/content/icons/thoughts';
import { UI_ICONS } from '../src/lib/content/icons/ui';
import { LOCATION_IDS, LOCATIONS } from '../src/lib/content/locations';
import { META } from '../src/lib/minigames/meta';
import { ITEMS } from '../src/lib/pet/items';
import * as PET_LINES from '../src/lib/pet/lines';
import { PIGGY_1_THOUGHTS } from '../src/lib/pet/thought-bank/piggy-1';
import { PIGGY_2_THOUGHTS } from '../src/lib/pet/thought-bank/piggy-2';
import { PIGGY_3_THOUGHTS } from '../src/lib/pet/thought-bank/piggy-3';
import { THOUGHT_FACES, type PigThoughts, type ThoughtDef } from '../src/lib/pet/thought-bank/types';
import { PIG_IDS, type PigId } from '../src/lib/types';
import { ANIMS, BANNED } from './content-rules';

const BANKS: Record<PigId, PigThoughts> = {
  'piggy-1': PIGGY_1_THOUGHTS,
  'piggy-2': PIGGY_2_THOUGHTS,
  'piggy-3': PIGGY_3_THOUGHTS,
};
const NUM: Record<PigId, number> = { 'piggy-1': 1, 'piggy-2': 2, 'piggy-3': 3 };

// ───────────────────────── the limits (types.ts, §3.4) ─────────────────────────

const LABEL_MAX = 20;
const LINE_MAX = 120;
const SENTENCES_MAX = 2;
const SICK = 'sick';

/** The topics each pool uses (§3.3) with the thought counts the spec gives: a pool may grow, never shrink. */
const TOPIC_MIN: Record<PigId, Record<string, number>> = {
  'piggy-1': {
    volleyball: 13, cs: 8, haikyu: 3, germany: 6, food: 5, campus: 6, friends: 4, player: 5, life: 3, birthday: 1,
    'p2bday-soon': 1, 'p3bday-soon': 1, 'holiday-soon': 2, sick: 4,
  },
  'piggy-2': {
    neuro: 9, perfusion: 1, residency: 8, collection: 6, based: 6, july4: 2, 'july4-soon': 1, labpigs: 3, friends: 5,
    player: 6, life: 11, 'p1bday-soon': 1, 'p3bday-soon': 1, 'holiday-soon': 1, sick: 4,
  },
  'piggy-3': {
    x: 30, math: 3, agents: 3, signals: 3, robotics: 1, hpc: 2, onepiece: 3, print3d: 1, redbull: 1, 'birthday-soon': 1,
    birthday: 1, 'p1bday-soon': 1, 'p2bday-soon': 1, friends: 2, campus: 1, weather: 2, life: 1, player: 3, sick: 4,
  },
};

/** Labels a thought may never wear: item names, places, mini-game titles, want labels (activities and talk topics). */
const TAKEN_LABELS = new Set(
  [
    ...Object.values(ITEMS).map((i) => i.name),
    ...Object.values(LOCATIONS).map((l) => l.name),
    ...Object.values(META).map((m) => m.title),
    'Sakura Spike', 'Swinus Rhythms', 'Bug Hunt', 'Petal Catch', 'Steady Hoof', 'For You Pig',
    'Play ball', 'Bath time', 'Head pats',
    'Volleyball talk', 'Serve stats', 'CS homework', 'Perfusion talk', 'Neuro facts', 'CSF chat', 'Codex talk',
    'His little project', 'Pirate manga',
  ].map((s) => s.toLowerCase()),
);

/** The hub's attention light, the Big Brain chip, sleep, the place and talk wants' icons. */
const AVOID_ICONS = ['alert', 'brain_big', 'zzz', 'pin', 'speech'];
/** Named only in thoughts gated `secret`. */
const SECRET_ICONS = ['strawberry_milk', 'truffle_fries', 'sakura_dango'];
const SECRET_NAMES = /strawberry milk|pink milk|truffle fries|fries with truffle|sakura dango|\bdango\b/i;
const ASKS = /^(feed me|can we|could we|take me|let's go)/i;
const DOMAIN = /\b[a-z0-9-]+\.(?:com|org|net|io|ai|dev|edu|gov|co|app|xyz|me|tv)\b/gi;
/** Real brands the character files don't use (Codex, HiPerGator, Red Bull, Haikyu!! and One Piece are fine). */
const BRANDS = /gatorade|pub ?sub|publix|coca|pepsi|iphone|android|google|chatgpt|openai|anthropic|claude|gemini|\bmeta\b|elon|musk|zuckerberg|tiktok|instagram|youtube|reddit|facebook/i;
/** The owner's call (tests/no-mathnasium.test.ts): the game never names the tutoring business. */
const TUTOR_BUSINESS = /mathnasium/i;
/** Text a tap line may hold: ASCII plus the line banks' typography (curly quotes, em dash, ellipsis). */
const LINE_CHARS = /^[\x20-\x7e—“”‘’…]+$/;

/** Gate grammar (§3.2): `kind:value[,value]`, or the bare `first` and `secret`. Same as GATE_RE in pet/thoughts.ts. */
const GATE_RE = /^(time|place|weather|need|low|day|date|tier|outfit|with|screen|feature):[A-Za-z0-9_,.-]+$/;
const BARE_GATES = ['first', 'secret'];
const NEEDS = ['hungry', 'sleepy', 'bored', 'dirty'];
const TIMES = ['morning', 'day', 'evening', 'night', 'late'];
const DAYS = ['weekday', 'weekend', 'gameday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIERS = ['N', 'F', 'W', 'NF', 'FW'];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const gatesOf = (t: ThoughtDef): string[] => [...(t.when ?? []), ...(t.whenAny ?? [])];
const valuesOf = (gate: string): string[] => gate.slice(gate.indexOf(':') + 1).split(',');
const nonSick = (b: PigThoughts) => b.thoughts.filter((t) => t.topic !== SICK);
const textOf = (t: ThoughtDef) => `${t.label} ${t.line}`;

function validMonthDay(md: string): boolean {
  const m = /^(\d\d)-(\d\d)$/.exec(md);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

/** The values a gate entry lets through, expanded to base values; null when the key isn't one of the exclusive ones. */
function expand(gate: string): Set<string> | null {
  const key = gate.slice(0, gate.indexOf(':'));
  const out = new Set<string>();
  for (const v of valuesOf(gate)) {
    if (key === 'tier') for (const c of v) out.add(c);
    else if (key === 'day') for (const d of v === 'weekday' ? ['mon', 'tue', 'wed', 'thu', 'fri'] : v === 'weekend' ? ['sat', 'sun'] : v === 'gameday' ? ['sat'] : [v]) out.add(d);
    else if (key === 'time') { if (v !== 'late') out.add(v); }
    else if (key === 'place') out.add(v);
    else return null;
  }
  return out;
}

// ───────────────────────── the corpus: what a thought must not repeat ─────────────────────────

/** Every string in a value, recursively (line banks are nested records, arrays and tuples). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out);
  return out;
}

const words = (s: string) =>
  s.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, ' ').replace(/\.\.\.|…/g, ' ')
    .replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
const grams = (s: string, n = 6): string[] => {
  const w = words(s);
  const out: string[] = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
  return out;
};

/** The dialogue of a scene file: `piggy-3 happy: text`, `narrator: text`, and `? choice` lines. */
function sceneLines(src: string): string[] {
  const out: string[] = [];
  for (const raw of src.split('\n')) {
    const speech = /^\s*(?:piggy-[123]|narrator|player)(?:@\w+)?(?:\s+\w+)?\s*:\s*(.+)$/.exec(raw);
    const choice = /^\s*\?\s+(.+)$/.exec(raw);
    const text = (speech ?? choice)?.[1]?.trim();
    if (text) out.push(text);
  }
  return out;
}

const long = (s: string) => words(s).length >= 3;
/** pet/lines.ts. */
const PET_TEXT: string[] = strings(PET_LINES).filter(long);
/** Every pig's chat, greet and idle banks. */
const BANK_TEXT: string[] = PIG_IDS.flatMap((pig) => strings([LINES[pig].chat, LINES[pig].greet, LINES[pig].idle])).filter(long);
/** Every scene's dialogue. */
const SCENE_TEXT: string[] = (() => {
  const dir = join(import.meta.dir, '..', 'src/lib/content/scenes');
  return readdirSync(dir).filter((f) => f.endsWith('.ks')).flatMap((f) => sceneLines(readFileSync(join(dir, f), 'utf8'))).filter(long);
})();
const CORPUS: string[] = [...PET_TEXT, ...BANK_TEXT, ...SCENE_TEXT];

// ───────────────────────── the banks ─────────────────────────

describe('thought banks: every field obeys its limits', () => {
  test('the corpus is real (a guard that reads nothing would pass by accident)', () => {
    expect(PET_TEXT.length).toBeGreaterThan(150);
    expect(BANK_TEXT.length).toBeGreaterThan(1500);
    expect(SCENE_TEXT.length).toBeGreaterThan(1000);
    expect(CORPUS.some((s) => /Swinus Rhythms/.test(s))).toBe(true);
  });

  for (const pig of PIG_IDS) {
    const bank = BANKS[pig];
    const n = NUM[pig];
    const topicRegistry = Object.keys(bank.topics);

    test(`${pig}: ids, topics and the topic table`, () => {
      expect(bank.pig).toBe(pig);
      const bad: string[] = [];
      const ids = bank.thoughts.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      const allowed = new Set(['id', 'topic', 'label', 'icon', 'line', 'face', 'anim', 'pose', 'when', 'whenAny', 'weight']);
      for (const t of bank.thoughts) {
        if (!new RegExp(`^p${n}\\.[a-z0-9_-]+$`).test(t.id)) bad.push(`${t.id}: id must be p${n}.<slug>`);
        for (const k of Object.keys(t)) if (!allowed.has(k)) bad.push(`${t.id}: unknown field ${k}`);
        if (!(t.topic in TOPIC_MIN[pig])) bad.push(`${t.id}: topic ${t.topic} is not one of the pool's topics (§3.3)`);
        if (!topicRegistry.includes(t.topic)) bad.push(`${t.id}: topic ${t.topic} is missing from the topic table`);
        if (t.weight !== undefined && !(t.weight > 0)) bad.push(`${t.id}: weight must be positive`);
        if (t.when !== undefined && t.when.length === 0) bad.push(`${t.id}: empty when (leave it out)`);
        if (t.whenAny !== undefined && t.whenAny.length === 0) bad.push(`${t.id}: empty whenAny (leave it out)`);
      }
      // the table lists exactly the topics the pool uses, plus the reserved `sick`; rules are sane
      const used = new Set(bank.thoughts.map((t) => t.topic));
      for (const topic of topicRegistry) if (!used.has(topic)) bad.push(`topic table: ${topic} has no thought`);
      for (const [topic, r] of Object.entries(bank.topics)) {
        if (r.share !== undefined && !(r.share > 0 && r.share < 1)) bad.push(`${topic}: share must be between 0 and 1`);
        for (const [k, v] of [['cap', r.cap], ['streak', r.streak]] as const) {
          if (v !== undefined && !(Number.isInteger(v) && v >= 1)) bad.push(`${topic}: ${k} must be a whole number of at least 1`);
        }
        for (const [tag, m] of Object.entries(r.mult ?? {})) {
          if (!(m > 0)) bad.push(`${topic}: mult ${tag} must be positive`);
          if (!GATE_RE.test(tag) && !BARE_GATES.includes(tag)) bad.push(`${topic}: mult tag ${tag} is not a context tag`);
        }
        if (r.pose && !ANIMS.has(r.pose)) bad.push(`${topic}: pose ${r.pose} is not an AnimId`);
        if (r.hint !== undefined && !/^[\x20-\x7e]{1,40}$/.test(r.hint)) bad.push(`${topic}: hint must be 1–40 ASCII characters`);
      }
      expect(bad).toEqual([]);
    });

    test(`${pig}: the topic table (§3.3)`, () => {
      const rules = bank.topics;
      // at most one share topic; every <x>-soon countdown, once a day
      expect(Object.values(rules).filter((r) => r.share !== undefined).length).toBeLessThanOrEqual(1);
      for (const topic of topicRegistry.filter((k) => k.endsWith('-soon'))) expect([topic, rules[topic].cap]).toEqual([topic, 1]);
      expect(rules[SICK]).toBeDefined();
      if (pig === 'piggy-1') expect([rules.germany.cap, rules.food.cap]).toEqual([3, 2]);
      if (pig === 'piggy-2') expect([rules.collection.cap, rules.july4.cap]).toEqual([3, 1]);
      if (pig === 'piggy-3') {
        expect(rules.x).toMatchObject({ share: 0.6, streak: 2, mult: { first: 3, 'time:late': 1.5 }, hint: 'probably on X' });
        expect([rules.print3d.cap, rules.redbull.cap]).toEqual([1, 2]);
      }
    });

    test(`${pig}: pool sizes (§3.5)`, () => {
      const counts: Record<string, number> = {};
      for (const t of bank.thoughts) counts[t.topic] = (counts[t.topic] ?? 0) + 1;
      for (const [topic, min] of Object.entries(TOPIC_MIN[pig])) expect([topic, (counts[topic] ?? 0) >= min]).toEqual([topic, true]);
      const ns = nonSick(bank);
      const sick = bank.thoughts.filter((t) => t.topic === SICK);
      expect(ns.length).toBeGreaterThanOrEqual(56);
      expect(sick.length).toBeGreaterThanOrEqual(4);
      expect(sick.length).toBeLessThanOrEqual(6);
      // a sick pig thinks only sick thoughts, so they carry no gates of their own
      for (const s of sick) expect([s.id, gatesOf(s)]).toEqual([s.id, []]);
      // enough ungated thoughts that a typical context never runs the pool dry before the day's cap
      expect(ns.filter((t) => gatesOf(t).length === 0).length).toBeGreaterThanOrEqual(23);
      if (pig === 'piggy-3') {
        const x = ns.filter((t) => t.topic === 'x').length;
        expect(x).toBeGreaterThanOrEqual(26);
        expect(x / ns.length).toBeGreaterThanOrEqual(0.45);
        expect(x / ns.length).toBeLessThanOrEqual(0.55);
        expect(ns.filter((t) => t.topic === 'print3d').length).toBeLessThanOrEqual(2);
      }
    });

    test(`${pig}: labels read as thoughts (1–${LABEL_MAX} ASCII characters, not a name the game already uses)`, () => {
      const bad: string[] = [];
      const labels = bank.thoughts.map((t) => t.label.toLowerCase());
      for (const t of bank.thoughts) {
        const l = t.label;
        if (l.length < 1 || l.length > LABEL_MAX) bad.push(`${t.id}: label is ${l.length} characters: "${l}"`);
        if (!/^[\x20-\x7e]+$/.test(l)) bad.push(`${t.id}: label must be ASCII ("..." not "…", straight quotes): "${l}"`);
        if (l !== l.trim()) bad.push(`${t.id}: label has spaces at an end`);
        if (/[{}]/.test(l)) bad.push(`${t.id}: label has a placeholder`);
        if (TAKEN_LABELS.has(l.toLowerCase())) bad.push(`${t.id}: label "${l}" is an item, place, mini-game or want label`);
        if (labels.indexOf(l.toLowerCase()) !== labels.lastIndexOf(l.toLowerCase())) bad.push(`${t.id}: label "${l}" is used twice`);
      }
      expect(bad).toEqual([]);
    });

    test(`${pig}: tap lines (1–${LINE_MAX} characters, at most ${SENTENCES_MAX} sentences, no placeholders)`, () => {
      const bad: string[] = [];
      for (const t of bank.thoughts) {
        const l = t.line;
        if (l.length < 1 || l.length > LINE_MAX) bad.push(`${t.id}: line is ${l.length} characters`);
        if (sentenceCount(l) > SENTENCES_MAX) bad.push(`${t.id}: ${sentenceCount(l)} sentences: ${l}`);
        if (/[{}]/.test(l)) bad.push(`${t.id}: line has a placeholder`);
        if (l !== l.trim()) bad.push(`${t.id}: line has spaces at an end`);
        if (!LINE_CHARS.test(l)) bad.push(`${t.id}: unusual characters ${JSON.stringify(l.replace(/[\x20-\x7e—“”‘’…]/g, ''))}`);
        if (l.includes('"')) bad.push(`${t.id}: straight double quote (the line banks use “ ”)`);
        if (l.toLowerCase() === t.label.toLowerCase()) bad.push(`${t.id}: line is just the label`);
      }
      expect(bad).toEqual([]);
    });

    test(`${pig}: faces, clips and icons exist`, () => {
      const bad: string[] = [];
      for (const t of bank.thoughts) {
        if (!(THOUGHT_FACES as readonly string[]).includes(t.face)) bad.push(`${t.id}: face ${t.face} is not a thought face`);
        if (t.anim && !ANIMS.has(t.anim)) bad.push(`${t.id}: anim ${t.anim} is not an AnimId`);
        if (t.pose && !ANIMS.has(t.pose)) bad.push(`${t.id}: pose ${t.pose} is not an AnimId`);
        if (!(t.icon in UI_ICONS) && !(t.icon in ITEM_ICONS) && !(t.icon in THOUGHT_ICONS)) bad.push(`${t.id}: icon ${t.icon} is in no icon table`);
        if (!ICONS[t.icon]) bad.push(`${t.id}: icon ${t.icon} is not in the icon registry (content/icons/index.ts)`);
        if (AVOID_ICONS.includes(t.icon)) bad.push(`${t.id}: icon ${t.icon} belongs to the hub (attention light, chips, sleep, wants)`);
        if (SECRET_ICONS.includes(t.icon) && !(t.when ?? []).includes('secret')) bad.push(`${t.id}: icon ${t.icon} needs the secret gate`);
      }
      expect(bad).toEqual([]);
    });

    test(`${pig}: every gate matches the tag grammar, names something real, and can hold`, () => {
      const bad: string[] = [];
      for (const t of bank.thoughts) {
        const all = gatesOf(t);
        if (new Set(all).size !== all.length) bad.push(`${t.id}: a gate is listed twice`);
        for (const g of all) {
          if (!GATE_RE.test(g) && !BARE_GATES.includes(g)) { bad.push(`${t.id}: ${g} does not match the tag grammar`); continue; }
          if (BARE_GATES.includes(g)) continue;
          const key = g.slice(0, g.indexOf(':'));
          for (const v of valuesOf(g)) {
            if (key === 'place' && !(LOCATION_IDS as string[]).includes(v)) bad.push(`${t.id}: ${g}: ${v} is not a place`);
            if (key === 'with' && !(PIG_IDS as readonly string[]).includes(v)) bad.push(`${t.id}: ${g}: ${v} is not a pig`);
            if (key === 'with' && v === pig) bad.push(`${t.id}: ${g}: he can't be with himself`);
            if (key === 'weather' && !['rain', 'storm'].includes(v)) bad.push(`${t.id}: ${g}: weather is rain or storm`);
            if ((key === 'need' || key === 'low') && !NEEDS.includes(v)) bad.push(`${t.id}: ${g}: ${v} is not a need`);
            if (key === 'time' && !TIMES.includes(v)) bad.push(`${t.id}: ${g}: ${v} is not a time`);
            if (key === 'day' && !DAYS.includes(v)) bad.push(`${t.id}: ${g}: ${v} is not a day`);
            if (key === 'tier' && !TIERS.includes(v)) bad.push(`${t.id}: ${g}: ${v} is not a tier`);
            if (key === 'date' && v !== 'thanksgiving') {
              const [a, b, ...rest] = v.split('..');
              if (rest.length || !validMonthDay(a) || (b !== undefined && !validMonthDay(b))) bad.push(`${t.id}: ${g}: ${v} is not MM-DD or MM-DD..MM-DD`);
            }
          }
        }
        // `when` entries must all hold at once: one date, and the exclusive keys (place, time, tier, day) must overlap
        const when = t.when ?? [];
        if (when.filter((g) => g.startsWith('date:')).length > 1) bad.push(`${t.id}: more than one date gate`);
        for (const key of ['place', 'time', 'tier', 'day']) {
          const sets = when.filter((g) => g.startsWith(`${key}:`)).map(expand).filter((s): s is Set<string> => !!s && s.size > 0);
          if (sets.length > 1 && [...sets[0]].every((v) => !sets.every((s) => s.has(v)))) bad.push(`${t.id}: ${key} gates can't all hold at once`);
        }
        // company only happens on place screens; a thought can't be gated on needs he can't have (needs: companion only)
        if (when.some((g) => g.startsWith('screen:hub')) && when.some((g) => g.startsWith('with:'))) bad.push(`${t.id}: with: never holds in the hub`);
      }
      expect(bad).toEqual([]);
    });

    test(`${pig}: kind and PG, no real people or brands, X said right, secrets and asks gated`, () => {
      const bad: string[] = [];
      for (const t of bank.thoughts) {
        const text = textOf(t);
        if (BANNED.test(text)) bad.push(`${t.id}: banned content (${text.match(BANNED)![0]})`);
        if (/@\w/.test(text)) bad.push(`${t.id}: an @handle`);
        for (const d of text.match(DOMAIN) ?? []) if (d.toLowerCase() !== 'x.com') bad.push(`${t.id}: a domain, ${d}`);
        if (BRANDS.test(text)) bad.push(`${t.id}: a brand name (${text.match(BRANDS)![0]})`);
        if (TUTOR_BUSINESS.test(`${t.id} ${text}`)) bad.push(`${t.id}: never names the tutoring business`);
        if (/twitter|tweet/i.test(t.line) && !/\bX\b/.test(t.line)) bad.push(`${t.id}: Twitter or tweet without X in the line`);
        if (/twitter|tweet/i.test(t.label) && !/^They said Twitter$/i.test(t.label)) bad.push(`${t.id}: only "They said Twitter" may say Twitter in a label`);
        if (/curie/i.test(text) && !(pig === 'piggy-3' && (t.when ?? []).includes('date:11-07') && !/curie/i.test(t.label))) bad.push(`${t.id}: Curie only in Piggy 3's birthday line`);
        if (SECRET_NAMES.test(text) && !(t.when ?? []).includes('secret')) bad.push(`${t.id}: names a secret favorite without the secret gate`);
        if (ASKS.test(t.line) && !gatesOf(t).some((g) => /^(need|low):/.test(g))) bad.push(`${t.id}: an ask needs a need: or low: gate`);
      }
      expect(bad).toEqual([]);
    });
  }

  test('no repeats: no line said elsewhere (exact, or a shared run of 6+ words), none twice across the pools', () => {
    const all = PIG_IDS.flatMap((p) => BANKS[p].thoughts);
    const hits: string[] = [];
    const exact = new Set(CORPUS.map((s) => words(s).join(' ')));
    const seen = new Map<string, string>();
    for (const s of CORPUS) for (const g of grams(s)) if (!seen.has(g)) seen.set(g, s);
    for (const t of all) {
      if (exact.has(words(t.line).join(' '))) hits.push(`${t.id}: said elsewhere`);
      for (const g of new Set(grams(t.line))) if (seen.has(g)) hits.push(`${t.id}: "${g}" (also in "${seen.get(g)!.slice(0, 90)}")`);
    }
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

  test('ids and lines are unique across the three pools', () => {
    const all = PIG_IDS.flatMap((p) => BANKS[p].thoughts);
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
    expect(new Set(all.map((t) => t.line.toLowerCase())).size).toBe(all.length);
  });
});

// ───────────────────────── the voices and the owner's calls ─────────────────────────

describe('thought banks: voices and canon', () => {
  test('dates: one single-day thought per pig on his birthday, first on its day; ranges are countdowns or seasons', () => {
    const single = (b: PigThoughts) => b.thoughts.filter((t) => (t.when ?? []).some((g) => /^date:\d\d-\d\d$/.test(g)));
    expect(single(PIGGY_1_THOUGHTS).map((t) => t.when)).toEqual([['date:09-04']]);
    expect(single(PIGGY_2_THOUGHTS).map((t) => t.when)).toEqual([['date:07-04']]);
    expect(single(PIGGY_3_THOUGHTS).map((t) => t.when)).toEqual([['date:11-07']]);
    for (const pig of PIG_IDS) {
      for (const t of BANKS[pig].thoughts) {
        const range = (t.when ?? []).find((g) => /^date:.*(\.\.|thanksgiving)/.test(g));
        if (range) expect([t.id, /-soon$/.test(t.topic)]).toEqual([t.id, true]);
      }
    }
  });

  test('every pig has one secret thought and one with company', () => {
    for (const pig of PIG_IDS) {
      const ns = nonSick(BANKS[pig]);
      expect([pig, ns.filter((t) => (t.when ?? []).includes('secret')).length]).toEqual([pig, 1]);
      expect([pig, ns.filter((t) => (t.when ?? []).some((g) => g.startsWith('with:'))).length]).toEqual([pig, 1]);
    }
  });

  test('Piggy 1: a hype-man ("captain" only for a warm friend), and a little sheepish about his code', () => {
    const bank = PIGGY_1_THOUGHTS;
    for (const t of bank.thoughts) if (/\bcaptain\b/i.test(t.line)) expect([t.id, t.when]).toEqual([t.id, expect.arrayContaining(['tier:W'])]);
    expect(bank.thoughts.filter((t) => t.line.includes('!')).length).toBeGreaterThanOrEqual(25);
    expect(bank.thoughts.filter((t) => /\bteammate\b/i.test(t.line)).length).toBeGreaterThanOrEqual(4);
    for (const t of bank.thoughts) expect([t.id, /pork|bacon|\bham\b|sausage|pepperoni/i.test(textOf(t))]).toEqual([t.id, false]); // Germany means bread
  });

  test('Piggy 2: deadpan (no "!", mostly neutral, proud or thinking), with "based" in about one line in five', () => {
    const bank = PIGGY_2_THOUGHTS;
    for (const t of bank.thoughts) expect([t.id, textOf(t).includes('!')]).toEqual([t.id, false]);
    const calm = bank.thoughts.filter((t) => ['neutral', 'proud', 'thinking'].includes(t.face)).length;
    expect(calm / bank.thoughts.length).toBeGreaterThanOrEqual(0.6);
    const based = bank.thoughts.filter((t) => /\bbased\b/i.test(textOf(t))).length;
    expect(based / bank.thoughts.length).toBeGreaterThanOrEqual(0.1);
    expect(based / bank.thoughts.length).toBeLessThanOrEqual(0.35);
    // never gory, never used on anyone: the collection stays on the shelf
    for (const t of bank.thoughts) expect([t.id, /\b(blood spatter|scalpel on|cut(ting)? open|incision into)\b/i.test(t.line)]).toEqual([t.id, false]);
  });

  test('Piggy 2 (canon): he already has grants and is always chasing the next one; he barely sleeps', () => {
    const lines = PIGGY_2_THOUGHTS.thoughts;
    for (const t of lines) {
      expect([t.id, /first grant|his first grant|my first grant/i.test(textOf(t))]).toEqual([t.id, false]);
      expect([t.id, /slept (well|great|through)|full night|eight hours|well[- ]rested/i.test(textOf(t))]).toEqual([t.id, false]);
    }
    const grant = lines.find((t) => /\bgrant\b/i.test(t.line));
    expect(grant).toBeDefined();
    expect(grant!.line).toMatch(/^Next grant\b/);
    expect(grant!.label).toMatch(/^Next grant\b/);
    // sleep is a dry running joke: two thoughts, never a rant
    const sleepJokes = lines.filter((t) => /\bsleep\b/i.test(t.line) && t.topic !== SICK && !/spindles/.test(t.id));
    expect(sleepJokes.length).toBeGreaterThanOrEqual(1);
    expect(sleepJokes.length).toBeLessThanOrEqual(3);
    // perfusion is his word (only the rhythm game is "Swinus Rhythms"), and it is allowed in a label
    expect(lines.some((t) => /perfusion/i.test(textOf(t)))).toBe(true);
    for (const t of PIG_IDS.flatMap((p) => BANKS[p].thoughts)) expect([t.id, /Perfusion!/.test(textOf(t))]).toEqual([t.id, false]); // the old game title
  });

  test('Piggy 3 (canon): addicted to X, and sometimes says "X.com"', () => {
    const bank = PIGGY_3_THOUGHTS;
    const ns = nonSick(bank);
    const x = ns.filter((t) => t.topic === 'x');
    expect(x.length / ns.length).toBeGreaterThanOrEqual(0.45);
    // "sometimes": a few of his X thoughts say X.com, not every one
    const dotCom = x.filter((t) => /X\.com/.test(textOf(t)));
    expect(dotCom.length).toBeGreaterThanOrEqual(2);
    expect(dotCom.length).toBeLessThanOrEqual(8);
    // every X thought is about X itself, in a wholesome way: a post is a post, nobody is named
    for (const t of x) expect([t.id, /\btweet/i.test(textOf(t))]).toEqual([t.id, false]);
    // the habit is heard from outside, too: the other two each have a thought about Piggy 3 being on X
    for (const pig of ['piggy-1', 'piggy-2'] as const) {
      expect([pig, BANKS[pig].thoughts.some((t) => /\bX\b/.test(t.line) && /Piggy 3/.test(t.line))]).toEqual([pig, true]);
    }
    // he's sick and still on it
    expect(bank.thoughts.some((t) => t.topic === SICK && /\bX\b/.test(t.line))).toBe(true);
  });

  test('the tutoring business is never named; Piggy 3 "used to tutor math" (the owner\'s call)', () => {
    for (const pig of PIG_IDS) for (const t of BANKS[pig].thoughts) expect([t.id, TUTOR_BUSINESS.test(`${t.id} ${textOf(t)} ${t.icon} ${t.topic}`)]).toEqual([t.id, false]);
    const tutor = PIGGY_3_THOUGHTS.thoughts.filter((t) => /\btutor/i.test(t.line));
    expect(tutor.length).toBeGreaterThanOrEqual(1);
  });
});

// ───────────────────────── the icons (§11) ─────────────────────────

describe('thought icons', () => {
  const ids = Object.keys(THOUGHT_ICONS);
  const usedIcons = new Set(PIG_IDS.flatMap((p) => BANKS[p].thoughts.map((t) => t.icon)));

  test('the 18 new icons are all here', () => {
    expect([...ids].sort()).toEqual([
      'anger_vein', 'bell', 'cake', 'chalkboard', 'fireworks', 'jersey', 'lab_pig', 'laptop', 'manga', 'phone_feed', 'rack',
      'robot', 'spine', 'spinner', 'stethoscope', 'supply_box', 'thread', 'turtle',
    ]);
  });

  test('16 rows of 16 characters, only palette keys or ".", valid colors, an ink outline, something drawn', () => {
    const bad: string[] = [];
    for (const [id, icon] of Object.entries(THOUGHT_ICONS)) {
      if (!/^[a-z][a-z0-9_]*$/.test(id)) bad.push(`${id}: id must be lowercase snake case`);
      if (icon.rows.length !== 16) bad.push(`${id}: ${icon.rows.length} rows`);
      icon.rows.forEach((row, y) => {
        if (row.length !== 16) bad.push(`${id}: row ${y} is ${row.length} characters`);
        for (const ch of row) if (ch !== '.' && !(ch in icon.palette)) bad.push(`${id}: row ${y} uses ${ch}, which is not in the palette`);
      });
      for (const [k, c] of Object.entries(icon.palette)) if (!/^#[0-9a-f]{6}$/i.test(c)) bad.push(`${id}: palette ${k} is not a #rrggbb color`);
      const px = icon.rows.join('').replace(/\./g, '').length;
      if (px < 24) bad.push(`${id}: only ${px} pixels drawn`);
      // every icon but the fireworks (loose sparks) keeps the shared ink outline
      if (id !== 'fireworks' && id !== 'spinner' && !Object.values(icon.palette).some((c) => c.toLowerCase() === '#1b1229')) bad.push(`${id}: no ink outline color (#1b1229)`);
    }
    expect(bad).toEqual([]);
  });

  test('no clash with a UI or item icon, no logos (no x, x_logo, twitter or bird)', () => {
    for (const id of ids) {
      expect([id, id in UI_ICONS]).toEqual([id, false]);
      expect([id, id in ITEM_ICONS]).toEqual([id, false]);
      expect([id, ['x', 'x_logo', 'twitter', 'bird'].includes(id)]).toEqual([id, false]);
    }
  });

  test('registered first: every thought icon resolves through ICONS and none hides an existing icon', () => {
    for (const id of ids) expect([id, ICONS[id]]).toEqual([id, THOUGHT_ICONS[id]]);
    for (const [id, icon] of Object.entries({ ...UI_ICONS, ...ITEM_ICONS })) expect([id, ICONS[id]]).toEqual([id, icon]);
    expect(Object.keys(ICONS).length).toBe(ids.length + new Set([...Object.keys(UI_ICONS), ...Object.keys(ITEM_ICONS)]).size);
  });

  test('every new icon is used by a thought (no dead art), and no two are the same picture', () => {
    for (const id of ids) expect([id, usedIcons.has(id)]).toEqual([id, true]);
    const pictures = ids.map((id) => THOUGHT_ICONS[id].rows.join('/'));
    expect(new Set(pictures).size).toBe(ids.length);
  });

  test('the pools use 18 new icons and the rest are existing UI or item icons', () => {
    const newUsed = [...usedIcons].filter((id) => id in THOUGHT_ICONS);
    expect(newUsed.length).toBe(18);
    expect([...usedIcons].filter((id) => !(id in THOUGHT_ICONS) && !(id in UI_ICONS) && !(id in ITEM_ICONS))).toEqual([]);
  });
});
