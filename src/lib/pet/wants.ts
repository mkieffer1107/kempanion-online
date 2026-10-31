// Wants (GAME_DESIGN.md §6): solid want bubbles roughly every 3 h of the waking day, each open for 2 h.
// Fulfil in time → +8 bond, +5 fun. Unfilled wants simply expire. Fully deterministic per time slot.
// (The lilac thought clouds are flavor, not wants: see thoughts.ts.)
import type { LocationId, PigId, SaveData } from '../types';
import { LOCATIONS } from '../content/locations';
import { WANT, clamp } from './balance';
import { addBondCapped } from './bond';
import { ITEMS, EDIBLE_IDS } from './items';
import { WANT_LINES } from './lines';
import { line, pick, rngFor, weighted } from './rng';
import { bump, isCompanion, str, setFlag } from './state';

export type WantKind = 'food' | 'activity' | 'place' | 'talk';

export interface Want {
  kind: WantKind;
  /** Item id (food), 'play' | 'bath' | 'pet' | 'minigame:<id>' (activity), LocationId (place) or topic (talk). */
  id: string;
  /** Short label for the bubble ("Onigiri", "Lake Alice"). */
  label: string;
  /** Pixel icon id. */
  icon: string;
  /** What he says about it. */
  line: string;
  since: number;
  until: number;
  /** Slot key (date#block); stable for the want's lifetime. */
  key: string;
}

const PLACES: Record<PigId, LocationId[]> = {
  'piggy-1': ['volleyball_courts', 'plaza', 'malachowsky', 'lake_alice'],
  'piggy-2': ['communicore', 'shands', 'lake_alice', 'marston'],
  'piggy-3': ['physics', 'marston', 'lake_alice', 'reitz'],
};

const TOPICS: Record<PigId, [string, string][]> = {
  'piggy-1': [['volleyball', 'Volleyball talk'], ['stats', 'Serve stats'], ['cs', 'CS homework']],
  'piggy-2': [['perfusion', 'Perfusion talk'], ['neuro', 'Neuro facts'], ['csf', 'CSF chat']],
  'piggy-3': [['codex', 'Codex talk'], ['building', 'His little project'], ['anime', 'Pirate manga']],
};

const GAME_OF: Record<PigId, string> = { 'piggy-1': 'volley', 'piggy-2': 'perfusion', 'piggy-3': 'debug' };
const GAME_LABEL: Record<string, string> = { volley: 'Sakura Spike', perfusion: 'Swinus Rhythms', debug: 'Bug Hunt' };
const GAME_ICON: Record<string, string> = { volley: 'ball', perfusion: 'ecg', debug: 'bug' };

interface Slot { key: string; start: number; end: number }

/** The want bubble's accessible name, "Piggy 3 wants: Boba Milk Tea" (a thought cloud reads "Piggy 3’s thought: …"). */
export function wantName(name: string, w: Pick<Want, 'label'>): string {
  return `${name} wants: ${w.label}`;
}

/** The want slot covering `now`, if any (06:00–24:00 in 3-hour blocks). */
export function wantSlot(now: number): Slot | null {
  const d = new Date(now);
  const h = d.getHours();
  if (h < WANT.firstBlockHour) return null;
  const blockH = WANT.blockMs / 3_600_000;
  const b = Math.floor((h - WANT.firstBlockHour) / blockH);
  const blockStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), WANT.firstBlockHour + b * blockH).getTime();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}#${b}`;
  const start = blockStart + Math.floor(rngFor('want-start', key)() * WANT.jitterMs);
  const end = start + WANT.lifeMs;
  if (now < start || now >= end) return null;
  return { key, start, end };
}

function buildWant(pig: PigId, slot: Slot): Want {
  const rand = rngFor('want', slot.key, pig);
  const kind = weighted(rand, [
    { kind: 'food' as const, weight: 35 },
    { kind: 'activity' as const, weight: 30 },
    { kind: 'place' as const, weight: 15 },
    { kind: 'talk' as const, weight: 20 },
  ]).kind;
  const base = { kind, since: slot.start, until: slot.end, key: slot.key };
  if (kind === 'food') {
    const options = EDIBLE_IDS.filter((id) => {
      const t = ITEMS[id].tastes[pig];
      return t === 'love' || t === 'like';
    });
    const id = pick(rand, options);
    const item = ITEMS[id];
    return { ...base, id, label: item.name, icon: item.icon, line: line(WANT_LINES.food[pig], slot.key).replace('{x}', item.name) };
  }
  if (kind === 'place') {
    const id = pick(rand, PLACES[pig]);
    const name = LOCATIONS[id].name;
    return { ...base, id, label: name, icon: 'pin', line: line(WANT_LINES.place[pig], slot.key).replace('{x}', name) };
  }
  if (kind === 'talk') {
    const [id, label] = pick(rand, TOPICS[pig]);
    return { ...base, id, label, icon: 'speech', line: line(WANT_LINES.talk[pig], slot.key) };
  }
  const act = pick(rand, ['play', 'bath', 'pet', 'minigame'] as const);
  if (act === 'minigame') {
    const g = GAME_OF[pig];
    return { ...base, id: `minigame:${g}`, label: GAME_LABEL[g], icon: GAME_ICON[g], line: line(WANT_LINES.minigame[pig], slot.key) };
  }
  const labels = { play: 'Play ball', bath: 'Bath time', pet: 'Head pats' };
  const icons = { play: 'ball', bath: 'bubbles', pet: 'hand' };
  return { ...base, id: act, label: labels[act], icon: icons[act], line: line(WANT_LINES[act][pig], slot.key) };
}

/** The companion's open want right now (null when asleep, sick, fulfilled or between slots). */
export function currentWant(save: SaveData, pig: PigId, now: number): Want | null {
  if (!isCompanion(save, pig)) return null;
  const p = save.pigs[pig];
  if (p.asleep || p.sick) return null;
  const slot = wantSlot(now);
  if (!slot || str(save, 'pet.wantDone') === slot.key) return null;
  return buildWant(pig, slot);
}

export interface WantResult { bond: number; fun: number; want: Want }

/**
 * Fulfil the companion's current want if `kind`/`id` match (talk wants accept any topic;
 * 'minigame' matches any mini-game). Returns the rewards, or null when nothing matched.
 */
export function fulfillWant(save: SaveData, pig: PigId, kind: WantKind, id: string, now: number): WantResult | null {
  const w = currentWant(save, pig, now);
  if (!w || w.kind !== kind) return null;
  const matches = kind === 'talk' || w.id === id || (w.id.startsWith('minigame:') && id.startsWith('minigame:'));
  if (!matches) return null;
  setFlag(save, 'pet.wantDone', w.key);
  bump(save, 'wants_done');
  const bond = addBondCapped(save, pig, WANT.bond, 'want', now);
  const p = save.pigs[pig];
  const before = p.needs.fun;
  p.needs.fun = clamp(before + WANT.fun * (p.sick ? 0.5 : 1), 0, 100);
  return { bond, fun: p.needs.fun - before, want: w };
}

/** Advance hook: returns a want the first time it becomes visible. */
export function announceWant(save: SaveData, now: number): Want | null {
  const pig = save.companion;
  if (!pig) return null;
  const w = currentWant(save, pig, now);
  if (!w || str(save, 'pet.wantSeen') === w.key) return null;
  setFlag(save, 'pet.wantSeen', w.key);
  return w;
}
