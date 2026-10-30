// Scene metadata `trigger:` clauses and scene eligibility (docs/ARCHITECTURE.md §4, GAME_DESIGN.md §7).
// Pure TypeScript: bun tests import it directly.
//
//   location=plaza,hub   time=day,morning   slot=dusk   weekday=tue,thu   hearts>=2 (alias bond>=2)
//   seen=p1_h1  seen!=p2_h1   flag=met_p2  !flag=met_p2   companion=piggy-2   present=piggy-1
//   chance=0.3   month=10,11   date=10-31
// Extensions: hearts(piggy-3)>=4 · chapter>=2 · days>=3 · money>=50 · item=pennant · hour=17-19 (17:00–19:59)
//             companion=none · !present=piggy-2 · `seen=a,b` needs all, `seen!=a,b` needs none.
// Without `pig`, `hearts>=N` means every pig has at least N hearts.
import { PIG_IDS, type LocationId, type PigId, type SaveData, type TimeOfDay } from '../types';
import { WEEKDAYS, type Weekday } from '../time';
import { isBedtime, scheduleSlot, whereIs, type ScheduleSlot } from '../content/locations';
import { normalizeWeekday, SLOTS, TIMES, type CmpOp } from './conditions';

export type TriggerClause =
  | { k: 'location'; values: string[]; neg: boolean }
  | { k: 'time'; values: TimeOfDay[]; neg: boolean }
  | { k: 'slot'; values: ScheduleSlot[]; neg: boolean }
  | { k: 'weekday'; values: Weekday[]; neg: boolean }
  | { k: 'month'; values: number[]; neg: boolean }
  | { k: 'date'; values: string[]; neg: boolean }
  | { k: 'hour'; ranges: [number, number][]; neg: boolean }
  | { k: 'seen'; ids: string[]; neg: boolean }
  | { k: 'flag'; names: string[]; neg: boolean }
  | { k: 'item'; ids: string[]; neg: boolean }
  | { k: 'companion'; values: (PigId | 'none')[]; neg: boolean }
  | { k: 'present'; pigs: PigId[]; neg: boolean }
  | { k: 'chance'; p: number }
  | { k: 'hearts'; pig: PigId | null; op: CmpOp; n: number }
  | { k: 'chapter' | 'days' | 'money'; op: CmpOp; n: number };

export const TRIGGER_KEYS = [
  'location', 'time', 'slot', 'weekday', 'hearts', 'bond', 'seen', 'flag', 'companion', 'present', 'chance',
  'month', 'date', 'chapter', 'days', 'money', 'item', 'hour',
] as const;

export class TriggerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TriggerError';
  }
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const CLAUSE = /^(!?)\s*([a-z_]+)\s*(?:\(\s*([a-z0-9_-]*)\s*\))?\s*(>=|<=|!=|==|=|>|<)\s*(.*)$/i;
const ID = /^[a-z0-9_]+$/;

function int(v: string, what: string): number {
  if (!/^[+-]?\d+$/.test(v)) throw new TriggerError(`${what} must be a whole number, got "${v}"`);
  return Number(v);
}

function oneOf<T extends string>(values: string[], allowed: readonly T[], key: string): T[] {
  for (const v of values) {
    if (!(allowed as readonly string[]).includes(v)) throw new TriggerError(`${key}= must be one of ${allowed.join(', ')} (got "${v}")`);
  }
  return values as T[];
}

function ids(values: string[], key: string): string[] {
  for (const v of values) if (!ID.test(v)) throw new TriggerError(`${key}= expects ids made of a-z, 0-9 and _ (got "${v}")`);
  return values;
}

function parseClause(raw: string): TriggerClause {
  const m = CLAUSE.exec(raw.trim());
  if (!m) throw new TriggerError(`can't read trigger clause "${raw.trim()}" (expected key=value or key>=N)`);
  const key = m[2].toLowerCase();
  let neg = m[1] === '!';
  let op = (m[4] === '==' ? '=' : m[4]) as CmpOp;
  const arg = m[3];
  const rhs = m[5].trim();
  if (!rhs) throw new TriggerError(`trigger clause "${raw.trim()}" has no value`);
  if (!(TRIGGER_KEYS as readonly string[]).includes(key)) {
    throw new TriggerError(`unknown trigger key "${key}" (known: ${TRIGGER_KEYS.join(', ')})`);
  }
  if (arg !== undefined && key !== 'hearts' && key !== 'bond') throw new TriggerError(`${key} takes no (…) argument`);

  const numeric = key === 'hearts' || key === 'bond' || key === 'chapter' || key === 'days' || key === 'money';
  if (numeric) {
    if (neg) throw new TriggerError(`"!" can't be used with ${key}; use < or <= instead`);
    const n = int(rhs, key);
    if (key === 'hearts' || key === 'bond') {
      let pig: PigId | null = null;
      if (arg) {
        if (!(PIG_IDS as readonly string[]).includes(arg)) throw new TriggerError(`hearts(…) needs piggy-1, piggy-2 or piggy-3 (got "${arg}")`);
        pig = arg as PigId;
      }
      return { k: 'hearts', pig, op, n };
    }
    return { k: key as 'chapter' | 'days' | 'money', op, n };
  }

  if (op === '!=') { neg = !neg; op = '='; }
  if (op !== '=') throw new TriggerError(`${key} only supports = and != (got ${op})`);
  const values = rhs.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!values.length) throw new TriggerError(`${key}= has no value`);

  switch (key) {
    case 'location': return { k: 'location', values: ids(values, key), neg };
    case 'time': return { k: 'time', values: oneOf(values, TIMES, key), neg };
    case 'slot': return { k: 'slot', values: oneOf(values, SLOTS, key), neg };
    case 'weekday': {
      const days = values.map((v) => {
        const d = normalizeWeekday(v);
        if (!d) throw new TriggerError(`weekday= must be one of ${WEEKDAYS.join(', ')} (got "${v}")`);
        return d;
      });
      return { k: 'weekday', values: days, neg };
    }
    case 'month': {
      const months = values.map((v) => {
        const named = MONTHS.indexOf(v.slice(0, 3));
        const n = /^\d+$/.test(v) ? Number(v) : named + 1;
        if (!(n >= 1 && n <= 12)) throw new TriggerError(`month= expects 1–12 (got "${v}")`);
        return n;
      });
      return { k: 'month', values: months, neg };
    }
    case 'date': {
      const dates = values.map((v) => {
        const dm = /^(\d{1,2})-(\d{1,2})$/.exec(v);
        if (!dm || +dm[1] < 1 || +dm[1] > 12 || +dm[2] < 1 || +dm[2] > 31) throw new TriggerError(`date= expects MM-DD like 10-31 (got "${v}")`);
        return `${dm[1].padStart(2, '0')}-${dm[2].padStart(2, '0')}`;
      });
      return { k: 'date', values: dates, neg };
    }
    case 'hour': {
      const ranges = values.map((v): [number, number] => {
        const hm = /^(\d{1,2})(?:-(\d{1,2}))?$/.exec(v);
        if (!hm) throw new TriggerError(`hour= expects H or H1-H2 like 17-19 (got "${v}")`);
        const a = Number(hm[1]);
        const b = hm[2] === undefined ? a : Number(hm[2]);
        if (a > 23 || b > 23) throw new TriggerError(`hour= expects hours 0–23 (got "${v}")`);
        return [a, b];
      });
      return { k: 'hour', ranges, neg };
    }
    case 'seen': return { k: 'seen', ids: ids(values, key), neg };
    case 'flag': return { k: 'flag', names: values, neg };
    case 'item': return { k: 'item', ids: ids(values, key), neg };
    case 'companion': return { k: 'companion', values: oneOf(values, [...PIG_IDS, 'none'] as const, key), neg };
    case 'present': return { k: 'present', pigs: oneOf(values, PIG_IDS, key), neg };
    case 'chance': {
      if (neg || values.length !== 1) throw new TriggerError('chance= takes one number between 0 and 1');
      const pct = values[0].endsWith('%');
      const p = Number(pct ? values[0].slice(0, -1) : values[0]) / (pct ? 100 : 1);
      if (!(p >= 0 && p <= 1)) throw new TriggerError(`chance= must be between 0 and 1 (got "${values[0]}")`);
      return { k: 'chance', p };
    }
  }
  throw new TriggerError(`unknown trigger key "${key}"`);
}

/** Parse a `trigger:` metadata value (clauses separated by `;`). Throws TriggerError. */
export function parseTrigger(src: string): TriggerClause[] {
  const out: TriggerClause[] = [];
  for (const part of src.split(';')) {
    if (!part.trim()) continue;
    out.push(parseClause(part));
  }
  if (!out.length) throw new TriggerError('empty trigger');
  return out;
}

// ───────── chapters, hearts, defaults ─────────

/** Minimum chapter for heart event n (GAME_DESIGN §7): events 1–2 Ch1, 3–4 Ch2, 5–6 Ch3, 7 Ch4. */
export function heartChapter(n: number): number {
  return n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4;
}

/** Story chapter from distinct days played: Ch1 day 1, Ch2 day 2+, Ch3 day 4+, Ch4 day 6+. */
export function chapterFromDays(days: number): number {
  return days >= 6 ? 4 : days >= 4 ? 3 : days >= 2 ? 2 : 1;
}

export function heartsOf(save: SaveData, pig: PigId): number {
  return Math.min(10, Math.floor((save.pigs[pig]?.bond ?? 0) / 100));
}

/** What eligibility needs to know about a scene (a subset of the parsed SceneMeta). */
export interface TriggerMeta {
  pig?: PigId;
  heart?: number;
  chapter?: number;
  trigger?: TriggerClause[];
  priority: number;
  repeat: boolean;
}

export function minChapter(m: TriggerMeta): number {
  return m.chapter ?? (m.heart ? heartChapter(m.heart) : 1);
}

// ───────── public scene types (re-exported by src/lib/vn/index.ts) ─────────

export interface SceneInfo {
  id: string;
  title: string;
  pig?: PigId;
  priority: number;
  /** Album id unlocked on completion. */
  cg?: string;
  repeat: boolean;
  /** Heart event number 1–7 for `pig`. */
  heart?: number;
  /** Minimum story chapter (explicit or derived from `heart`). */
  chapter: number;
  trio: boolean;
  ending: boolean;
  /** false = hidden from the album. */
  replayable: boolean;
  /** One-line album blurb (`summary:` metadata). */
  summary?: string;
  /** Has a `trigger:` (otherwise it only runs when called by id). */
  triggered: boolean;
  file: string;
}

export interface TriggerContext {
  /** Where the player just arrived ('hub' = the companion's home screen). */
  location: LocationId | 'hub';
  time: TimeOfDay;
  weekday: Weekday;
  save: SaveData;
  /** Game clock (defaults to nowDate()); used by slot/month/date/hour/present. */
  date?: Date;
  /** Random source for chance= (defaults to Math.random). */
  rng?: () => number;
}

export interface TriggerEnv {
  location: LocationId | 'hub';
  time: TimeOfDay;
  weekday: Weekday;
  date: Date;
  save: SaveData;
  chapter: number;
  days: number;
  rng: () => number;
}

function cmpNum(a: number, op: CmpOp, b: number): boolean {
  switch (op) {
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '<': return a < b;
    case '=': return a === b;
    case '!=': return a !== b;
  }
}

function hereOf(env: TriggerEnv): string {
  if (env.location !== 'hub') return env.location;
  const c = env.save.companion;
  return c ? whereIs(c, env.date) : env.save.location;
}

/** True when one clause holds (chance clauses are rolled by the caller). */
export function clauseHolds(c: TriggerClause, env: TriggerEnv, scenePig?: PigId): boolean {
  const s = env.save;
  const flagOn = (n: string) => {
    const v = s.flags[n];
    return v !== undefined && v !== false && v !== 0 && v !== '';
  };
  let ok: boolean;
  switch (c.k) {
    case 'location': ok = c.values.includes(env.location); break;
    case 'time': ok = c.values.includes(env.time); break;
    case 'slot': ok = c.values.includes(scheduleSlot(env.date)); break;
    case 'weekday': ok = c.values.includes(env.weekday); break;
    case 'month': ok = c.values.includes(env.date.getMonth() + 1); break;
    case 'date': {
      const md = `${String(env.date.getMonth() + 1).padStart(2, '0')}-${String(env.date.getDate()).padStart(2, '0')}`;
      ok = c.values.includes(md);
      break;
    }
    case 'hour': {
      const h = env.date.getHours();
      ok = c.ranges.some(([a, b]) => (a <= b ? h >= a && h <= b : h >= a || h <= b));
      break;
    }
    // seen= / flag= / item= / present= need ALL listed; with "!"/"!=" NONE may hold.
    case 'seen': ok = c.neg ? !c.ids.some((id) => s.seenScenes.includes(id)) : c.ids.every((id) => s.seenScenes.includes(id)); return ok;
    case 'flag': ok = c.neg ? !c.names.some(flagOn) : c.names.every(flagOn); return ok;
    case 'item': ok = c.neg ? !c.ids.some((id) => (s.inventory[id] ?? 0) > 0) : c.ids.every((id) => (s.inventory[id] ?? 0) > 0); return ok;
    case 'present': {
      const here = hereOf(env);
      const at = (p: PigId) => whereIs(p, env.date) === here && !isBedtime(p, env.date);
      return c.neg ? !c.pigs.some(at) : c.pigs.every(at);
    }
    case 'companion': ok = c.values.includes(s.companion ?? 'none'); break;
    case 'chance': return true;
    case 'hearts': {
      const pig = c.pig ?? scenePig;
      const h = pig ? heartsOf(s, pig) : Math.min(...PIG_IDS.map((p) => heartsOf(s, p)));
      return cmpNum(h, c.op, c.n);
    }
    case 'chapter': return cmpNum(env.chapter, c.op, c.n);
    case 'days': return cmpNum(env.days, c.op, c.n);
    case 'money': return cmpNum(s.money, c.op, c.n);
  }
  return c.neg ? !ok : ok;
}

export interface EligibilityOpts {
  /** Scene id of a pig's heart event n (to require that event n−1 was seen). */
  heartScene(pig: PigId, n: number): string | undefined;
  /** Ignore chance= (e.g. the map deciding whether to show a ♥ on a pin). */
  ignoreChance?: boolean;
}

/** All non-random conditions for offering a scene now (ARCHITECTURE §4 + the GAME_DESIGN §7 heart gate). */
export function sceneEligible(scene: { id: string; meta: TriggerMeta }, env: TriggerEnv, opts: EligibilityOpts): boolean {
  const m = scene.meta;
  if (!m.trigger) return false;
  if (!m.repeat && env.save.seenScenes.includes(scene.id)) return false;
  if (env.chapter < minChapter(m)) return false;
  if (m.heart && m.pig) {
    if (heartsOf(env.save, m.pig) < m.heart - 1) return false;
    if (m.heart > 1) {
      const prev = opts.heartScene(m.pig, m.heart - 1);
      if (prev && !env.save.seenScenes.includes(prev)) return false;
    }
  }
  for (const c of m.trigger) if (!clauseHolds(c, env, m.pig)) return false;
  if (!opts.ignoreChance) {
    for (const c of m.trigger) if (c.k === 'chance' && !(env.rng() < c.p)) return false;
  }
  return true;
}

/**
 * Eligible scenes, best first: highest priority, then the companion's own scenes, then never-seen ones,
 * then file order.
 */
export function rankScenes<S extends { id: string; meta: TriggerMeta }>(scenes: readonly S[], env: TriggerEnv, opts: EligibilityOpts): S[] {
  const companion = env.save.companion;
  return scenes
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => sceneEligible(s, env, opts))
    .sort((a, b) =>
      b.s.meta.priority - a.s.meta.priority
      || Number(b.s.meta.pig === companion && !!companion) - Number(a.s.meta.pig === companion && !!companion)
      || Number(env.save.seenScenes.includes(a.s.id)) - Number(env.save.seenScenes.includes(b.s.id))
      || a.i - b.i)
    .map(({ s }) => s);
}
