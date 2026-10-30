// Acorn economy (GAME_DESIGN.md §8): shop purchases (with the Small Blessing coupon) and golden petals.
import type { LocationId, SaveData } from '../types';
import { PETALS } from './balance';
import { checkAchievements } from './achievements';
import { earn, progressTasks } from './daily';
import { getItem, shopStock } from './items';
import { bump, delFlag, json, setJson, str, today } from './state';
import type { Achievement, DailyTask } from './types';

/** Price of one unit right now (half price while today's Small Blessing coupon is unused). */
export function priceOf(save: SaveData, itemId: string, now: number): number {
  const item = getItem(itemId);
  if (!item) return Infinity;
  return couponActive(save, now) ? Math.ceil(item.price / 2) : item.price;
}

export function couponActive(save: SaveData, now: number): boolean {
  return str(save, 'pet.halfPrice') === today(now);
}

export interface BuyResult {
  ok: boolean;
  reason?: string;
  /** Total acorns spent. */
  cost: number;
  qty: number;
  /** One unit was half price (Small Blessing). */
  discounted: boolean;
  tasks: DailyTask[];
  achievements: Achievement[];
}

/**
 * Buy `qty` of an item. When `location` is given the item must be in stock there right now.
 * The Small Blessing coupon makes one unit half price.
 */
export function buyItem(save: SaveData, itemId: string, qty: number, now: number, location?: LocationId): BuyResult {
  const fail = (reason: string): BuyResult => ({ ok: false, reason, cost: 0, qty: 0, discounted: false, tasks: [], achievements: [] });
  const item = getItem(itemId);
  const n = Math.floor(qty);
  if (!item || item.price <= 0 || item.category === 'key') return fail("That's not for sale.");
  if (!(n >= 1) || n > 99) return fail('Pick a quantity from 1 to 99.');
  if (location && !shopStock(location, now).some((i) => i.id === itemId)) return fail("They don't sell that here right now.");
  const discounted = couponActive(save, now);
  const cost = item.price * n - (discounted ? Math.floor(item.price / 2) : 0);
  if (save.money < cost) return fail(`Not enough acorns — that's ${cost}.`);
  save.money -= cost;
  save.inventory[itemId] = (save.inventory[itemId] ?? 0) + n;
  if (discounted) delFlag(save, 'pet.halfPrice');
  bump(save, 'purchases', n);
  bump(save, 'acorns_spent', cost);
  const tasks = progressTasks(save, { kind: 'buy', item: itemId, qty: n }, now);
  return { ok: true, cost, qty: n, discounted, tasks, achievements: checkAchievements(save) };
}

// ── golden petals ──

interface PetalDay { d: string; n: number; at: number }

function petalDay(save: SaveData, now: number): PetalDay {
  const d = today(now);
  const rec = json<PetalDay>(save, 'pet.petals');
  return rec && rec.d === d ? rec : { d, n: 0, at: -Infinity };
}

export function goldenPetalsLeft(save: SaveData, now: number): number {
  return Math.max(0, PETALS.perDay - petalDay(save, now).n);
}

/** May the hub spawn a golden petal now? (10/day, at least 3 min apart; the UI picks the exact moment.) */
export function goldenPetalAvailable(save: SaveData, now: number): boolean {
  const day = petalDay(save, now);
  return day.n < PETALS.perDay && now - day.at >= PETALS.minGapMs;
}

/** Tap on a golden petal: +5 acorns (Great Blessing applies), max 10 per day. */
export function catchGoldenPetal(save: SaveData, now: number): { ok: boolean; money: number; left: number; tasks: DailyTask[] } {
  const day = petalDay(save, now);
  if (day.n >= PETALS.perDay) return { ok: false, money: 0, left: 0, tasks: [] };
  day.n += 1;
  day.at = now;
  setJson(save, 'pet.petals', day);
  const money = earn(save, PETALS.money, now);
  save.money += money;
  bump(save, 'petals_golden');
  const tasks = progressTasks(save, { kind: 'petal' }, now);
  return { ok: true, money, left: PETALS.perDay - day.n, tasks };
}
