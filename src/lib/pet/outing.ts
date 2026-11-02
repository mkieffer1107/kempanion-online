// Outings: take your Kempanion along (the map's Bring, a place's "Bring him here") and he hangs out there with you
// instead of following his schedule. Everything that asks where he is (the KempaPager, Talk, the map, scene triggers)
// goes through spotOf(). Only places with ground for his sprite take outings (LocationDef.outing). An outing lasts
// OUTING.ms and ends early at his bedtime, when he falls asleep (he wakes up at home) or when the Kempanion changes.
import type { LocationId, PigId, SaveData } from '../types';
import { LOCATIONS, isBedtime, whereIs } from '../content/locations';
import { OUTING } from './balance';
import { delFlag, json, num, pk, setJson } from './state';

export interface Outing {
  pig: PigId;
  location: LocationId;
  since: number;
  until: number;
}

const KEY = 'pet.outing';

/** The outing running at `now`, or null (none, over, or ended by sleep, bedtime or a new Kempanion). */
export function outingOf(save: SaveData, now: number): Outing | null {
  const o = json<Outing>(save, KEY);
  if (!o || o.pig !== save.companion || !LOCATIONS[o.location]?.outing) return null;
  if (!(now >= o.since && now < o.until)) return null;
  if (save.pigs[o.pig].asleep || isBedtime(o.pig, new Date(now))) return null;
  // a nap during the outing took him home, and he wakes up there
  if (num(save, pk(o.pig, 'sleptAt'), -Infinity) >= o.since) return null;
  return o;
}

/** Where a pig is: on his schedule, at home while your Kempanion sleeps, or wherever you took him. */
export function spotOf(save: SaveData, pig: PigId, d: Date): LocationId {
  if (save.companion === pig) {
    if (save.pigs[pig].asleep) return 'dorm';
    const o = outingOf(save, d.getTime());
    if (o) return o.location;
  }
  return whereIs(pig, d);
}

/** Why your Kempanion can't come to `location`: no Kempanion, a place without ground for him, asleep, bedtime. */
export type OutingBlock = 'none' | 'place' | 'asleep' | 'bedtime';

/** What keeps him from coming to `location` now, or null when he can (or is there already). */
export function outingBlock(save: SaveData, location: LocationId, now: number): OutingBlock | null {
  const pig = save.companion;
  if (!pig) return 'none';
  if (!LOCATIONS[location]?.outing) return 'place';
  const d = new Date(now);
  if (spotOf(save, pig, d) === location) return null;
  if (save.pigs[pig].asleep) return 'asleep';
  if (isBedtime(pig, d)) return 'bedtime';
  return null;
}

/**
 * Take your Kempanion to `location` now. `outing` is the outing he is on afterwards: null where his schedule (or
 * sleep) has him anyway, which ends a running one; an outing already there keeps its time.
 */
export function startOuting(save: SaveData, location: LocationId, now: number): { block: OutingBlock | null; outing: Outing | null } {
  const block = outingBlock(save, location, now);
  if (block) return { block, outing: null };
  const pig = save.companion as PigId;
  const current = outingOf(save, now);
  if (current?.location === location) return { block: null, outing: current };
  if (save.pigs[pig].asleep || whereIs(pig, new Date(now)) === location) {
    delFlag(save, KEY);
    return { block: null, outing: null };
  }
  // on the minute: the KempaPager and the map tell time by whole game minutes
  const since = Math.floor(now / 60_000) * 60_000;
  const outing: Outing = { pig, location, since, until: since + OUTING.ms };
  setJson(save, KEY, outing);
  return { block: null, outing };
}
