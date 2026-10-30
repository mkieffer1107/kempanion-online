// Bond levels, titles, story chapter, heart gates and the daily bond caps (GAME_DESIGN.md §7).
import type { PigId, SaveData } from '../types';
import { BOND, BOND_TITLES, CHAPTER_DAYS, HEART_EVENT_CHAPTER, ROUTINE_SOURCES, clamp, type BondSource } from './balance';
import { counter, json, pk, setJson, today } from './state';
import { now as clockNow } from '../state/clock';

export interface BondInfo { level: number; into: number; span: number; title: string }

export function bondLevel(bond: number): number {
  return clamp(Math.floor(Math.max(0, bond || 0) / BOND.perLevel), 0, BOND.maxLevel);
}

export function bondTitle(level: number): string {
  return BOND_TITLES[clamp(Math.floor(level), 0, BOND.maxLevel)];
}

export function bondProgress(bond: number): BondInfo {
  const level = bondLevel(bond);
  const span = BOND.perLevel;
  const into = level >= BOND.maxLevel ? span : Math.max(0, Math.floor(bond) - level * span);
  return { level, into, span, title: bondTitle(level) };
}

/** Story chapter (1–4) from distinct days played. */
export function chapter(save: SaveData): number {
  const days = Math.max(1, counter(save, 'days_played'));
  let ch = 1;
  for (let c = 1; c < CHAPTER_DAYS.length; c++) if (days >= CHAPTER_DAYS[c]) ch = c;
  return ch;
}

const PIG_NUM: Record<PigId, number> = { 'piggy-1': 1, 'piggy-2': 2, 'piggy-3': 3 };
const registered = new Map<string, string>();

/**
 * Tell the sim which KScript scene is heart event `n` for a pig (from the scene's `pig:`/`heart:` metadata).
 * Without registration the convention p1_h1 … p3_h7 is used.
 */
export function registerHeartEvent(pig: PigId, n: number, sceneId: string): void {
  registered.set(`${pig}:${n}`, sceneId);
}

/** KScript scene id of a heart event (registered id, else p1_h1 … p3_h7). */
export function heartEventId(pig: PigId, n: number): string {
  return registered.get(`${pig}:${n}`) ?? `p${PIG_NUM[pig]}_h${n}`;
}

export function heartEventSeen(save: SaveData, pig: PigId, n: number): boolean {
  return save.seenScenes.includes(heartEventId(pig, n));
}

export interface HeartEventStatus {
  n: number;
  id: string;
  /** Hearts needed (n − 1). */
  hearts: number;
  chapter: number;
  /** Hearts and chapter requirements are met (show the ♥ on the map pin). */
  ready: boolean;
}

/** The next unseen heart event for a pig, or null when all 7 are seen. */
export function nextHeartEvent(save: SaveData, pig: PigId): HeartEventStatus | null {
  for (let n = 1; n <= BOND.hearts; n++) {
    if (heartEventSeen(save, pig, n)) continue;
    const hearts = n - 1;
    const ch = HEART_EVENT_CHAPTER[n];
    const ready = bondLevel(save.pigs[pig].bond) >= hearts && chapter(save) >= ch;
    return { n, id: heartEventId(pig, n), hearts, chapter: ch, ready };
  }
  return null;
}

/** Highest bond reachable until the next unseen heart event is seen: (req + 1) × 100 − 1. */
export function heartGateCap(save: SaveData, pig: PigId): number {
  const next = nextHeartEvent(save, pig);
  if (!next) return BOND.max;
  return (next.hearts + 1) * BOND.perLevel - 1;
}

interface BondDay { d: string; t: number; s: Partial<Record<BondSource, number>> }

function bondDay(save: SaveData, pig: PigId, now: number): BondDay {
  const d = today(now);
  const rec = json<BondDay>(save, pk(pig, 'bond'));
  return rec && rec.d === d ? rec : { d, t: 0, s: {} };
}

/** How much more bond a source can still give this pig today (ignoring the heart gate). */
export function bondRoom(save: SaveData, pig: PigId, source: BondSource, now: number): number {
  if (source === 'event' || source === 'scene' || source === 'discovery') return Infinity;
  const day = bondDay(save, pig, now);
  const cap = BOND.caps[source] ?? Infinity;
  let room = cap - (day.s[source] ?? 0);
  if (ROUTINE_SOURCES.includes(source)) room = Math.min(room, BOND.routineDailyCap - day.t);
  return Math.max(0, room);
}

/** Bond gained today, total routine and by source. */
export function bondToday(save: SaveData, pig: PigId, now: number): { routine: number; bySource: Partial<Record<BondSource, number>> } {
  const day = bondDay(save, pig, now);
  return { routine: day.t, bySource: { ...day.s } };
}

/**
 * Add bond through the daily caps and the heart gate. Heart events ('event') are uncapped and ungated;
 * other story scenes ('scene') and first discoveries skip the daily caps but respect the gate.
 * Returns the amount actually added (never negative: bond never goes down).
 */
export function addBondCapped(save: SaveData, pig: PigId, amount: number, source: BondSource, now: number = clockNow()): number {
  if (!(amount > 0)) return 0;
  const p = save.pigs[pig];
  const before = Math.max(0, p.bond || 0);
  let add = Math.min(amount, bondRoom(save, pig, source, now));
  const cap = source === 'event' ? BOND.max : Math.max(before, heartGateCap(save, pig));
  add = Math.max(0, Math.min(add, cap - before));
  if (add <= 0) return 0;
  p.bond = before + add;
  if (source !== 'event' && source !== 'scene' && source !== 'discovery') {
    const day = bondDay(save, pig, now);
    day.s[source] = (day.s[source] ?? 0) + add;
    if (ROUTINE_SOURCES.includes(source)) day.t += add;
    setJson(save, pk(pig, 'bond'), day);
  }
  return add;
}
