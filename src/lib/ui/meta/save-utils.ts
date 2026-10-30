// Pure helpers that read the save for the meta screens. No runes here, so bun tests can import it.
import type { CareAction, ItemDef, PigId, SaveData } from '../../types';
import { LOCATIONS } from '../../content/locations';
import { clockString, daysBetween, localDate } from '../../time';
import { bondLevel, knownTaste, secretFavorite, type Taste } from '../../pet';
import type { ShopLocation } from './content';

/** A save worth continuing (settings-only writes from the gate don't count). */
export function isMeaningfulSave(save: SaveData, hasSave: boolean): boolean {
  return hasSave && (save.companion !== null || save.player.name.trim() !== '' || save.seenScenes.length > 0);
}

/** "Day N" of the semester: a days-played counter if the sim keeps one, else calendar days since the save began. */
export function dayNumber(save: SaveData, nowMs: number): number {
  const c = save.counters['daysPlayed'] ?? save.counters['days_played'];
  if (typeof c === 'number' && c > 0) return Math.floor(c);
  return Math.max(1, daysBetween(localDate(save.createdAt), localDate(nowMs)) + 1);
}

export function continueSummary(save: SaveData, nowMs: number): string {
  const place = LOCATIONS[save.location]?.name ?? 'Sakura House';
  const when = clockString(new Date(save.lastTick || nowMs));
  return `Day ${dayNumber(save, nowMs)} · ${place} · ${when}`;
}

// ── tastes (the pet module records discoveries as flags `taste.<pig>.<item>`) ──

export type { Taste } from '../../pet';

/** The taste tier the player has discovered for this pig and item, or null while it is still "?". */
export function discoveredTaste(save: SaveData, pig: PigId, itemId: string): Taste | null {
  return knownTaste(save, pig, itemId);
}

export function secretFound(save: SaveData, pig: PigId): boolean {
  return save.flags[`pet.${pig}.secret`] === true || knownTaste(save, pig, secretFavorite(pig)) === 'secret';
}

// ── items ──

export type ShopTab = 'food' | 'drinks' | 'care' | 'gifts' | 'key';

export function shopTabOf(item: Pick<ItemDef, 'category'>): ShopTab {
  switch (item.category) {
    case 'food': return 'food';
    case 'drink': return 'drinks';
    case 'care':
    case 'medicine': return 'care';
    case 'gift': return 'gifts';
    default: return 'key';
  }
}

/** Which care action using this item performs, or null for key items.
 *  (The pet's clean action takes lavender_soap as a bath and mint_toothpaste as brushing.) */
export function actionForItem(item: Pick<ItemDef, 'category' | 'effects'>): CareAction | null {
  switch (item.category) {
    case 'food':
    case 'drink': return 'feed';
    case 'medicine': return 'medicine';
    case 'gift': return 'gift';
    case 'care': return item.effects.cure ? 'medicine' : 'clean';
    default: return null;
  }
}

export function effectSummary(item: Pick<ItemDef, 'effects'>): string[] {
  const e = item.effects;
  const out: string[] = [];
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  if (e.hunger) out.push(`TUMMY ${sign(e.hunger)}`);
  if (e.energy) out.push(`ENERGY ${sign(e.energy)}`);
  if (e.hygiene) out.push(`CLEAN ${sign(e.hygiene)}`);
  if (e.fun) out.push(`FUN ${sign(e.fun)}`);
  if (e.health) out.push(`HEALTH ${sign(e.health)}`);
  if (e.bond) out.push(`BOND ${sign(e.bond)}`);
  if (e.cure) out.push('CURES COLDS');
  return out;
}

// ── shop & companion ──

/** FNV-1a 32-bit. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const ROTA: PigId[] = ['piggy-1', 'piggy-2', 'piggy-3'];

/** Today's cashier: deterministic by date (the pharmacy is always Piggy 2's shift). */
export function cashierFor(location: ShopLocation, date: string): PigId {
  if (location === 'shands') return 'piggy-2';
  return ROTA[hashString(`${date}|${location}`) % ROTA.length];
}

export const SWITCH_FLAG = 'companion.switchedOn';

export function switchedToday(save: SaveData, date: string): boolean {
  return save.flags[SWITCH_FLAG] === date;
}

// ── wardrobe ──

/** Alt outfits unlock through a heart event (♥3); also accept a pig already wearing it or any flag naming it. */
export function outfitUnlocked(save: SaveData, pig: PigId, outfit: string): boolean {
  if (outfit === 'everyday') return true;
  const p = save.pigs[pig];
  if (p.outfit === outfit || bondLevel(p.bond) >= 3) return true;
  return Object.entries(save.flags).some(([k, v]) => !!v && k.includes(outfit) && (k.includes(pig) || k.startsWith('outfit')));
}

// ── memories ──

const FACT_LABELS: Record<string, string> = {
  comfort_food: 'Comfort food',
  why_uf: 'What brings you to UF',
  sleep: 'Sleep schedule',
  major: 'Major',
  hometown: 'Hometown',
  pronouns: 'Pronouns',
  nickname: 'Nickname',
  birthday: 'Birthday',
  favorite_food: 'Favorite food',
};

/** `comfort_food=ramen` → "Comfort food: ramen"; plain sentences pass through. */
export function humanizeFact(fact: string): string {
  const m = /^([a-z][a-z0-9_]*)\s*=\s*(.+)$/i.exec(fact.trim());
  if (!m) return fact;
  const key = m[1].toLowerCase();
  const label = FACT_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return `${label}: ${m[2]}`;
}
