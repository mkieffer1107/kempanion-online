// Low-level helpers over SaveData.flags / SaveData.counters (the SaveData shape is fixed).
//
// Keys owned by the pet module (all under `pet.` unless they are meant for KScript triggers):
//   pet.lastDay                 string  local date last counted in counters.days_played
//   pet.<pig>.bathAt|brushAt|dessertAt|caffeineAt   number  cooldown timestamps (epoch ms)
//   pet.<pig>.petN|petBurst|petBurstAt               number  pet diminishing-returns window / spam detector
//   pet.<pig>.napUntil|awakeUntil|sleptAt            number  sleep bookkeeping
//   pet.<pig>.sickAt            number  when the current illness started
//   pet.<pig>.rounds            boolean Doctor's Rounds already used for this illness
//   pet.<pig>.pharmacy          string  local date of the last free pharmacy check-up
//   pet.<pig>.freshUntil        number  lavender-soap "fresh" until
//   pet.<pig>.bond              JSON    {d, t, s:{source: n}} bond gained today by source
//   pet.<pig>.secret            boolean secret favorite discovered
//   taste.<pig>.<item>          string  discovered taste tier (shop/bag "Loved by")
//   pet.wantDone / pet.wantSeen string  want slot keys (fulfilled / announced)
//   pet.<pig>.thoughts          JSON    {d, ids:[]} idle thought clouds shown today, marked when shown (≤ 60; see thoughts.ts)
//   tut.thoughts                boolean the hub's one-time "that cloud is just a thought" toast has shown
//   ui.thoughts                 string  'lots' | 'off' (unset = some): Settings → Display → Thought bubbles
//   pet.messClock               number  awake ms accumulated toward the next mess
//   pet.omikuji                 string  "<date>|<slip>" today's slip
//   pet.stampDouble             boolean next stamp is doubled (Future Blessing)
//   pet.halfPrice               string  date of an unused half-price coupon (Small Blessing)
//   pet.tasks                   JSON    {d, ids:[], done:[]}
//   pet.petals                  JSON    {d, n, at} golden petals today
//   pet.away                    JSON    welcome-back letter data (see welcome.ts)
//   pet.mg.<id>                 string  date of the last run of a mini-game (first-run bonus)
//   pet.gold.<id>               boolean gold medal ever earned in that mini-game
//   pet.tuckNight               string  night (evening date) of the last counted tuck-in
//   pet.call                    JSON    {step, at} Piggy 1 bump/set/spike call-and-response progress
//   pet.gentle                  boolean Gentle mode (no sickness, needs frozen while away) — set by Settings UI
//   welcome_party_ready         boolean away > 72 h: play the welcome-back party scene, then unset it
//   stamp_party_ready           boolean 7th login stamp: play the group scene, then unset it
// Counters: see achievements.ts and the report for the full list (days_played, baths, cures, served.<item>, …);
// thoughts_heard counts tapped thought clouds (no bond, no acorns).
import type { PigId, PigState, SaveData } from '../types';
import { localDate } from '../time';

export type FlagValue = boolean | number | string;

export function today(now: number): string {
  return localDate(now);
}

export function num(save: SaveData, key: string, def = 0): number {
  const v = save.flags[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : def;
}

export function str(save: SaveData, key: string, def = ''): string {
  const v = save.flags[key];
  return typeof v === 'string' ? v : def;
}

export function bool(save: SaveData, key: string): boolean {
  return save.flags[key] === true;
}

export function setFlag(save: SaveData, key: string, value: FlagValue): void {
  save.flags[key] = value;
}

export function delFlag(save: SaveData, key: string): void {
  delete save.flags[key];
}

export function json<T>(save: SaveData, key: string): T | null {
  const v = save.flags[key];
  if (typeof v !== 'string' || !v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export function setJson(save: SaveData, key: string, value: unknown): void {
  save.flags[key] = JSON.stringify(value);
}

export function counter(save: SaveData, key: string): number {
  return save.counters[key] ?? 0;
}

export function bump(save: SaveData, key: string, n = 1): number {
  const v = (save.counters[key] ?? 0) + n;
  save.counters[key] = v;
  return v;
}

export function setMax(save: SaveData, key: string, value: number): void {
  if (value > (save.counters[key] ?? 0)) save.counters[key] = value;
}

export function pk(pig: PigId, key: string): string {
  return `pet.${pig}.${key}`;
}

/** The pig's per-day counters, reset when the local date changed. */
export function todayOf(p: PigState, now: number): PigState['today'] {
  const d = today(now);
  if (!p.today || p.today.date !== d) p.today = { date: d, talks: 0, gifts: 0, pets: 0, minigames: 0 };
  return p.today;
}

export function isCompanion(save: SaveData, pig: PigId): boolean {
  return save.companion === pig;
}

export function gentle(save: SaveData): boolean {
  return bool(save, 'pet.gentle');
}

/** Local date of the evening a night belongs to (00:00–05:59 counts as the previous evening). */
export function nightOf(now: number): string {
  const d = new Date(now);
  if (d.getHours() < 6) return localDate(now - 6 * 3_600_000);
  return localDate(now);
}

/** Fractional local hour, 0..24. */
export function hourOf(now: number): number {
  const d = new Date(now);
  return d.getHours() + d.getMinutes() / 60;
}
