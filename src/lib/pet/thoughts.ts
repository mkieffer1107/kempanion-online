// Idle thought bubbles (thoughts final.md §4): wants are actions, thoughts are flavor. A lilac cloud with a short
// label beside or above a pig's head; tap it for his line. No reward, no timer, never a timed choice.
//
// A pure, seeded scheduler over the thought banks (./thought-bank): SaveData and the game clock in, data out. No DOM,
// no runes, no Math.random, no LLM. The same pig, date, count of thoughts so far today and context always give the
// same thought, so a reload continues the day's sequence and a new date starts a new one.
//
// Save keys (also listed in pet/state.ts):
//   pet.<pig>.thoughts   JSON    {d: 'YYYY-MM-DD', ids: ['p3.loading', …]} today's thoughts, marked when shown (≤ 40)
//   tut.thoughts         boolean the hub's one-time "that cloud is just a thought" toast has shown
//   counters.thoughts_heard      thoughts tapped (no bond, no acorns)
//   ui.thoughts          string  'lots' | 'off' (unset = 'some'): Settings → Display → Thought bubbles
import type { AnimId, Expression, LocationId, PigId, SaveData } from '../types';
import type { WeatherKind } from '../state/weather';
import { localDate, timeOfDay, weekday } from '../time';
import { THOUGHT, THRESH, clamp } from './balance';
import { bondLevel } from './bond';
import { isGameDay } from './daily';
import { rngFor, weighted } from './rng';
import { isAsleep, nearBedtime } from './sim';
import { bool, isCompanion, json, pk, setJson } from './state';
import { currentWant } from './wants';
import { THOUGHT_BANKS } from './thought-bank';
import type { PigThoughts, ThoughtDef, TopicRule } from './thought-bank/types';

const MIN = 60_000;

// Cadence and durations (§4.5) are tuning numbers: they live in balance.ts (THOUGHT) and are re-exported here for the
// screens and tests.
export { THOUGHT };

/** The reserved topic: while he's sick it is his whole pool, and the rest of the time it's never picked. */
export const SICK_TOPIC = 'sick';

/** Gate grammar (§3.2): every `when`/`whenAny` entry in a bank matches this. Commas inside one entry are OR. */
export const GATE_RE = /^(time|place|weather|need|low|day|date|tier|outfit|with|screen|feature):[A-Za-z0-9_,.-]+$/;
export const BARE_GATES = ['first', 'secret'] as const;

export type ThoughtPref = 'lots' | 'some' | 'off'; // flags['ui.thoughts']; unset = 'some'
export type ThinkBlock = 'off' | 'asleep' | 'want' | 'done';

export interface ThoughtCtx {
  /** Game clock (now()). */
  now: number;
  /** Hub: his spot ('dorm' at home); place: the place. */
  location: LocationId;
  /** weatherAt(now), passed by the screen. */
  weather: WeatherKind;
  screen: 'hub' | 'place';
  /** Pigs on screen with him. */
  others?: readonly PigId[];
}

export interface Thought {
  pig: PigId;
  id: string;
  topic: string;
  label: string;
  icon: string;
  line: string;
  face: Expression;
  anim?: AnimId;
  /** Appear-pose: the def's, else its topic's. */
  pose?: AnimId;
  /** `${date}#${n}`: his nth thought today. */
  key: string;
  /** Time on screen (thoughtMs(label)). */
  ms: number;
}

interface ThoughtLog { d: string; ids: string[] }

export function thoughtPref(save: SaveData): ThoughtPref {
  const v = save.flags['ui.thoughts'];
  return v === 'lots' || v === 'off' ? v : 'some';
}

/** "Piggy 3’s thought: Thread 1/27": the cloud's accessible name (the want's is "<Name> wants: <label>"). */
export function thoughtName(name: string, label: string): string {
  return `${name}’s thought: ${label}`;
}

/** Today's thought ids (the log counts as empty once its date isn't today). */
export function thoughtsToday(save: SaveData, pig: PigId, now: number): readonly string[] {
  const log = json<ThoughtLog>(save, pk(pig, 'thoughts'));
  if (!log || log.d !== localDate(now) || !Array.isArray(log.ids)) return [];
  return log.ids.filter((id): id is string => typeof id === 'string');
}

/**
 * Why he can't think right now (checked in order), or null. Holds, throws, sheets, menus, modals and scenes are screen
 * state: the screens check those themselves.
 */
export function thinkBlock(save: SaveData, pig: PigId, now: number): ThinkBlock | null {
  if (thoughtPref(save) === 'off') return 'off';
  if (isAsleep(save, pig, now)) return 'asleep';
  // Only the companion has wants; currentWant is null while he's sick, so a sick companion still has sick thoughts.
  if (currentWant(save, pig, now)) return 'want';
  if (thoughtsToday(save, pig, now).length >= THOUGHT.dailyMax) return 'done';
  return null;
}

// ───────────────────────── context tags (§3.2) ─────────────────────────

const NEED_TAG = { hunger: 'hungry', energy: 'sleepy', fun: 'bored', hygiene: 'dirty' } as const;
/** A need under this fires `low:` (the hub's LOW, ui/hub/hub.ts, where the spoken need cue starts). */
const LOW_NEED = THRESH.mild;

/** Thanksgiving week: Monday to Sunday around November's 4th Thursday (a date range). */
function thanksgivingWeek(d: Date): boolean {
  const y = d.getFullYear();
  const firstThu = 1 + ((4 - new Date(y, 10, 1).getDay() + 7) % 7);
  const thu = firstThu + 21;
  const t = d.getTime();
  return t >= new Date(y, 10, thu - 3).getTime() && t < new Date(y, 10, thu + 4).getTime();
}

/** The set of tags that hold right now for this pig (§3.2). */
export function thoughtTags(save: SaveData, pig: PigId, ctx: ThoughtCtx): ReadonlySet<string> {
  const tags = new Set<string>();
  const d = new Date(ctx.now);
  const p = save.pigs[pig];
  tags.add(`time:${timeOfDay(d)}`);
  // the 90 min before his bedtime, or kept up past it (the companion only: the others are asleep by then)
  if (nearBedtime(pig, ctx.now) && !isAsleep(save, pig, ctx.now)) tags.add('time:late');
  tags.add(`place:${ctx.location}`);
  if (ctx.weather === 'rain' || ctx.weather === 'storm') tags.add('weather:rain');
  if (ctx.weather === 'storm') tags.add('weather:storm');
  // Needs only for the companion: the others stay comfortable.
  if (isCompanion(save, pig)) {
    for (const [need, id] of Object.entries(NEED_TAG) as [keyof typeof NEED_TAG, string][]) {
      const v = p.needs[need];
      if (v < THRESH.fine) tags.add(`need:${id}`);
      if (v < LOW_NEED) tags.add(`low:${id}`);
    }
  }
  const wd = weekday(d);
  tags.add(`day:${wd}`);
  tags.add(wd === 'sat' || wd === 'sun' ? 'day:weekend' : 'day:weekday');
  if (isGameDay(ctx.now)) tags.add('day:gameday');
  tags.add(`date:${localDate(ctx.now).slice(5)}`);
  if (thanksgivingWeek(d)) tags.add('date:thanksgiving');
  // Hearts 0–2 / 3–6 / 7–10: the same cut as the heuristic brain's tierOf (pet/ mustn't import ai/).
  const level = bondLevel(p.bond);
  const tier = level >= 7 ? 'W' : level >= 3 ? 'F' : 'N';
  tags.add(`tier:${tier}`);
  if (tier !== 'W') tags.add('tier:NF');
  if (tier !== 'N') tags.add('tier:FW');
  tags.add(`outfit:${p.outfit === 'everyday' ? 'everyday' : 'alt'}`);
  for (const o of ctx.others ?? []) if (o !== pig) tags.add(`with:${o}`);
  tags.add(`screen:${ctx.screen}`);
  if (thoughtsToday(save, pig, ctx.now).length === 0) tags.add('first');
  if (bool(save, pk(pig, 'secret'))) tags.add('secret');
  const feature = save.flags.p3_feature;
  if (typeof feature === 'string' && feature) tags.add(`feature:${feature}`);
  return tags;
}

const MD_TAG = /^date:(\d\d-\d\d)$/;

function todayMd(tags: ReadonlySet<string>): string | null {
  for (const t of tags) {
    const m = MD_TAG.exec(t);
    if (m) return m[1];
  }
  return null;
}

/** 'MM-DD..MM-DD', inclusive; wraps the new year when the start is after the end. */
function inDateRange(range: string, md: string | null): boolean {
  if (!md) return false;
  const [a, b] = range.split('..');
  if (!a || !b) return false;
  return a <= b ? md >= a && md <= b : md >= a || md <= b;
}

/** Does one gate entry hold? Commas inside an entry are OR; `date:` ranges are checked against today's `date:MM-DD`. */
export function gateHolds(entry: string, tags: ReadonlySet<string>): boolean {
  if (entry === 'first' || entry === 'secret') return tags.has(entry);
  const i = entry.indexOf(':');
  if (i <= 0) return tags.has(entry);
  const key = entry.slice(0, i);
  return entry.slice(i + 1).split(',').some((v) => {
    if (key === 'date' && v.includes('..')) return inDateRange(v, todayMd(tags));
    return tags.has(`${key}:${v}`);
  });
}

/** A `date:MM-DD` gate naming single days (no range, not Thanksgiving week): those come first on their day. */
function singleDay(entry: string): boolean {
  if (!entry.startsWith('date:')) return false;
  return entry.slice(5).split(',').every((v) => /^\d\d-\d\d$/.test(v));
}

/** How much a holding gate makes a thought likelier (§4.3 timely). */
function gateMult(entry: string): number {
  if (entry === 'first' || entry === 'secret') return 1.5;
  const key = entry.slice(0, entry.indexOf(':'));
  const values = entry.slice(entry.indexOf(':') + 1).split(',');
  switch (key) {
    case 'low': return 6;
    case 'need': case 'weather': case 'place': case 'with': return 3;
    case 'day': return values.includes('gameday') ? 3 : 1.5;
    case 'date': return values.some((v) => v.includes('..') || v === 'thanksgiving') ? 3 : 1;
    case 'screen': return 1;
    default: return 1.5; // time, tier, outfit, feature
  }
}

/** Defaults for a topic: any range-dated countdown (`<x>-soon`) is at most once a day. */
function ruleOf(rules: PigThoughts['topics'], topic: string): TopicRule {
  const r = rules[topic];
  if (topic.endsWith('-soon') && r?.cap === undefined) return { ...r, cap: 1 };
  return r ?? {};
}

/**
 * A thought's weight in its group: base weight × timely (the product over its holding gates, capped at ×12) × the
 * topic's tag multipliers (non-share topics; a share topic's multipliers move the odds instead).
 */
export function thoughtWeight(def: ThoughtDef, tags: ReadonlySet<string>, rules: PigThoughts['topics']): number {
  let timely = 1;
  for (const g of def.when ?? []) if (gateHolds(g, tags)) timely *= gateMult(g);
  for (const g of def.whenAny ?? []) if (gateHolds(g, tags)) timely *= gateMult(g);
  let w = (def.weight ?? 1) * Math.min(12, timely);
  const r = ruleOf(rules, def.topic);
  if (r.share === undefined) for (const [tag, m] of Object.entries(r.mult ?? {})) if (gateHolds(tag, tags)) w *= m;
  return w;
}

/** On screen: 6 s + 0.1 s per label character, 6–8 s. */
export function thoughtMs(label: string): number {
  const [lo, hi] = THOUGHT.showMs;
  return clamp(lo + THOUGHT.perCharMs * label.length, lo, hi);
}

// ───────────────────────── selection (§4.3) ─────────────────────────

const byIdCache = new WeakMap<PigThoughts, Map<string, ThoughtDef>>();
function byId(bank: PigThoughts): Map<string, ThoughtDef> {
  let m = byIdCache.get(bank);
  if (!m) byIdCache.set(bank, (m = new Map(bank.thoughts.map((t) => [t.id, t]))));
  return m;
}

/** The pick for this pig right now from a given bank (pickThought uses his own; tests pass their own). Never mutates save. */
export function pickFromBank(bank: PigThoughts, save: SaveData, pig: PigId, ctx: ThoughtCtx): Thought | null {
  if (thinkBlock(save, pig, ctx.now)) return null;
  const date = localDate(ctx.now);
  const log = thoughtsToday(save, pig, ctx.now);
  const n = log.length;
  const tags = thoughtTags(save, pig, ctx);
  const sick = save.pigs[pig].sick;
  const index = byId(bank);
  const topics = log.map((id) => index.get(id)?.topic ?? '');
  const seen = new Set(log);

  let pool = bank.thoughts.filter((t) => {
    if (seen.has(t.id)) return false;
    if ((t.topic === SICK_TOPIC) !== sick) return false;
    if (t.when && !t.when.every((g) => gateHolds(g, tags))) return false;
    if (t.whenAny?.length && !t.whenAny.some((g) => gateHolds(g, tags))) return false;
    const r = ruleOf(bank.topics, t.topic);
    if (r.cap !== undefined && topics.filter((x) => x === t.topic).length >= r.cap) return false;
    // While he's sick his whole pool is one topic, so the no-repeat-topic rule would stop him after one thought.
    const streak = Math.max(1, r.streak ?? 1);
    if (!sick && topics.length >= streak && topics.slice(-streak).every((x) => x === t.topic)) return false;
    return true;
  });
  if (!pool.length) return null;

  // A single-day thought (his birthday, the 4th of July) comes first on its day.
  const dated = pool.filter((t) => t.when?.some(singleDay));
  if (dated.length) pool = dated;

  const rand = rngFor('thought', pig, date, n);
  let group = pool;
  const shareTopic = Object.keys(bank.topics).find((k) => bank.topics[k].share !== undefined);
  const S = shareTopic ? pool.filter((t) => t.topic === shareTopic) : [];
  if (shareTopic && S.length && S.length < pool.length) {
    const r = bank.topics[shareTopic];
    const share = clamp(r.share ?? 0, 0, 1);
    let odds = share >= 1 ? Infinity : share / (1 - share);
    for (const [tag, m] of Object.entries(r.mult ?? {})) if (gateHolds(tag, tags)) odds *= m;
    const p = odds === Infinity ? 1 : odds / (1 + odds);
    group = rand() < p ? S : pool.filter((t) => t.topic !== shareTopic);
  } else {
    rand(); // keep the stream aligned
  }
  const pick = weighted(rand, group.map((def) => ({ def, weight: thoughtWeight(def, tags, bank.topics) }))).def;
  return {
    pig, id: pick.id, topic: pick.topic, label: pick.label, icon: pick.icon, line: pick.line, face: pick.face,
    anim: pick.anim, pose: pick.pose ?? bank.topics[pick.topic]?.pose,
    key: `${date}#${n}`, ms: thoughtMs(pick.label),
  };
}

/** His next thought right now, or null (blocked, nothing eligible, or today's pool ran dry). Never mutates save. */
export function pickThought(save: SaveData, pig: PigId, ctx: ThoughtCtx): Thought | null {
  const bank = THOUGHT_BANKS[pig];
  return bank ? pickFromBank(bank, save, pig, ctx) : null;
}

/** Log a thought as seen (marked when shown, not when tapped: a glimpse counts). The caller persists. */
export function markThought(save: SaveData, pig: PigId, t: Thought, now: number): void {
  const ids = [...thoughtsToday(save, pig, now)];
  if (!ids.includes(t.id)) ids.push(t.id);
  setJson(save, pk(pig, 'thoughts'), { d: localDate(now), ids } satisfies ThoughtLog);
}

// ───────────────────────── cadence (§4.4, §4.5) ─────────────────────────

export interface GapOptions {
  /** Beats already run this visit. */
  beat: number;
  /** The game minute the screen opened (visits don't replay one rhythm). */
  visit: number;
  /** No input for THOUGHT.afkMs. */
  afk: boolean;
  screen: 'hub' | 'place';
  /** Place screens: pigs on screen (the per-pig gap is divided among them). */
  onScreen?: number;
  /** Never sooner than this (the thought still showing plus THOUGHT.restMs). */
  minMs?: number;
}

/**
 * Start-to-start ms until the next ambient beat. Thoughts 'off': today's chatter tempo (the first tier) at every beat,
 * since Off removes thoughts only and leaves speech as it was.
 */
export function thoughtGap(save: SaveData, pig: PigId, now: number, o: GapOptions): number {
  const pref = thoughtPref(save);
  const rand = rngFor('thought-gap', pig, localDate(now), o.visit, o.beat);
  const tier = THOUGHT.gapS.find((g) => o.beat < g.upTo) ?? THOUGHT.gapS[THOUGHT.gapS.length - 1];
  const [lo, hi] = pref === 'off' ? THOUGHT.gapS[0].s : o.afk ? THOUGHT.afkGapS : tier.s;
  let ms = (lo + (hi - lo) * rand()) * 1000;
  if (pref === 'lots') ms *= THOUGHT.lotsK;
  if (o.screen === 'place') ms = Math.max(THOUGHT.placeMinS * 1000, ms / Math.max(1, o.onScreen ?? 1));
  return Math.round(Math.max(ms, o.minMs ?? 0));
}

/** The first beat's delay (ms) after the screen settles, seeded per visit. */
export function firstBeatMs(screen: 'hub' | 'place', seed: string | number, now: number, visit: number): number {
  const [lo, hi] = THOUGHT.firstS[screen];
  return Math.round((lo + (hi - lo) * rngFor('thought-first', seed, localDate(now), visit)()) * 1000);
}

/**
 * Optional map caption (§7): the hint of a topic that would likely take his next thought, rolled once per 10-minute
 * slot ("probably on X"). Uses up no thoughts. Null when he can't think or no hinted topic came up.
 */
export function topicHint(save: SaveData, pig: PigId, now: number): string | null {
  const bank = THOUGHT_BANKS[pig];
  if (!bank || thinkBlock(save, pig, now) || save.pigs[pig].sick) return null;
  const hinted = Object.entries(bank.topics).filter(([, r]) => r.hint);
  if (!hinted.length) return null;
  const all = bank.thoughts.filter((t) => t.topic !== SICK_TOPIC);
  let roll = rngFor('thought-hint', pig, Math.floor(now / (10 * MIN)))();
  for (const [topic, r] of hinted) {
    const share = r.share ?? all.filter((t) => t.topic === topic).length / Math.max(1, all.length);
    if (roll < share) return r.hint ?? null;
    roll -= share;
  }
  return null;
}
