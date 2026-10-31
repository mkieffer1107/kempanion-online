// Every canonical item from GAME_DESIGN.md §8: menu, care shelf, gifts and key items. No pork, ever.
import type { ItemCategory, ItemDef, LocationId, PigId, SaveData } from '../types';
import { PIG_IDS } from '../types';
import { SHOP_HOURS, TASTE_SCORE, type Taste } from './balance';
import { hourOf, setFlag, str } from './state';

export type ShopId = keyof typeof SHOP_HOURS;

export interface PetItemDef extends ItemDef {
  /** Per-pig taste tier; missing = neutral. */
  tastes: Partial<Record<PigId, Taste>>;
  /** Shops that stock it (empty = not sold). */
  shops: ShopId[];
  /** Free and unlimited (never consumed, always in the feed menu). */
  free?: boolean;
  /** Counts as dessert ("betsubara": allowed once per 2 h even when full). */
  dessert?: boolean;
  /** Caffeine: a second dose within 3 h gives no energy. */
  caffeine?: boolean;
  /** Leaves crumbs on the floor (mess +1). */
  crumbs?: boolean;
}

type Def = Omit<PetItemDef, 'id' | 'icon' | 'likes' | 'soldAt' | 'shops'> & { shops?: ShopId[]; icon?: string };

const R: ShopId[] = ['reitz'];
const RM: ShopId[] = ['reitz', 'midtown'];
const M: ShopId[] = ['midtown'];
const S: ShopId[] = ['shands'];
const RS: ShopId[] = ['reitz', 'shands'];

const P1 = 'piggy-1';
const P2 = 'piggy-2';
const P3 = 'piggy-3';

const DEFS: Record<string, Def> = {
  // ── food ──
  dining_tray: {
    name: 'Dining Hall Tray', category: 'food', price: 0, free: true,
    desc: "Today's mystery casserole. Free, filling, and only slightly beige.",
    effects: { hunger: 25 }, tastes: {},
  },
  tender_sub: {
    name: 'Chicken Tender Sub', category: 'food', price: 18, shops: RM, crumbs: true,
    desc: 'The Florida deli legend. Structurally a sandwich, spiritually a hug.',
    effects: { hunger: 55 }, tastes: { [P1]: 'love', [P2]: 'like' },
  },
  pizza_slice: {
    name: 'Reitz Pizza Slice', category: 'food', price: 10, shops: RM, crumbs: true,
    desc: 'Foldable, triangular, engineered for eating while walking to class.',
    effects: { hunger: 35 }, tastes: { [P1]: 'like', [P3]: 'like' },
  },
  cup_ramen: {
    name: 'Cup Ramen', category: 'food', price: 5, shops: RM,
    desc: 'Three minutes of waiting, zero minutes of regret. Finals-week fuel.',
    effects: { hunger: 30 }, tastes: { [P3]: 'like' },
  },
  onigiri: {
    name: 'Onigiri', category: 'food', price: 9, shops: R,
    desc: 'Anime Club bake-sale rice ball. Hand-shaped and very serious about it.',
    effects: { hunger: 30 }, tastes: { [P3]: 'love', [P1]: 'like' },
  },
  melonpan: {
    name: 'Melonpan', category: 'food', price: 12, shops: R, dessert: true, crumbs: true,
    desc: 'Cookie-crust top, cloud-soft middle, no actual melon. Trust the process.',
    effects: { hunger: 25, fun: 2 }, tastes: { [P3]: 'love' },
  },
  apple_pie: {
    name: 'Apple Pie', category: 'food', price: 15, shops: R, dessert: true, crumbs: true,
    desc: 'The most patriotic dessert, according to one very deadpan pig.',
    effects: { hunger: 20, fun: 3 }, tastes: { [P2]: 'love', [P1]: 'like' },
  },
  key_lime_pie: {
    name: 'Key Lime Pie', category: 'food', price: 15, shops: R, dessert: true, crumbs: true,
    desc: "Florida's official pie. Pale yellow, never green. Fight about it.",
    effects: { hunger: 20, fun: 3 }, tastes: { [P1]: 'like', [P2]: 'like' },
  },
  boiled_peanuts: {
    name: 'Boiled Peanuts', category: 'food', price: 6, shops: R,
    desc: 'Soft, salty, roadside-stand classic. Deeply divisive in the Pig Pen.',
    effects: { hunger: 20 }, tastes: { [P1]: 'dislike', [P2]: 'like' },
  },
  acai_bowl: {
    name: 'Acai Bowl', category: 'food', price: 14, shops: R,
    desc: 'Purple, crunchy, and photographed far more often than it is eaten.',
    effects: { hunger: 30, fun: 3 }, tastes: { [P1]: 'like', [P2]: 'dislike', [P3]: 'like' },
  },
  watermelon: {
    name: 'Watermelon Slice', category: 'food', price: 8, shops: R,
    desc: 'Picnic-grade hydration with built-in seeds for spitting contests.',
    effects: { hunger: 15, fun: 2 }, tastes: { [P1]: 'like', [P2]: 'like', [P3]: 'like' },
  },
  oranges: {
    name: 'Florida Oranges', category: 'food', price: 6, shops: R,
    desc: 'A bag of sunshine. Piggy 1 hands them out at halftime like medals.',
    effects: { hunger: 15, health: 2 }, tastes: { [P1]: 'love', [P2]: 'like' },
  },
  pastelito: {
    name: 'Pastelito', category: 'food', price: 9, shops: R, dessert: true, crumbs: true,
    desc: 'Flaky guava-and-cheese pastry. Leaves a trail of crumbs and joy.',
    effects: { hunger: 20, fun: 2 }, tastes: { [P2]: 'like', [P1]: 'like' },
  },
  blueberries: {
    name: 'Sharpblue Blueberries', category: 'food', price: 7, shops: R,
    desc: 'Bred at UF and proud of it. Tiny, tart, academically decorated.',
    effects: { hunger: 12, health: 2 }, tastes: { [P1]: 'like', [P2]: 'like', [P3]: 'like' },
  },
  sakura_dango: {
    name: 'Sakura Dango', category: 'food', price: 14, shops: R, dessert: true,
    desc: 'Pink, white and green mochi on a stick. A little hanami you can eat.',
    effects: { hunger: 15, fun: 3 }, tastes: { [P3]: 'secret' },
  },
  truffle_fries: {
    name: 'Truffle Fries', category: 'food', price: 20, shops: M, crumbs: true,
    desc: 'Late-night Midtown fries wearing a fancy hat. Smells like a reward.',
    effects: { hunger: 40, fun: 2 }, tastes: { [P2]: 'secret', [P1]: 'like', [P3]: 'like' },
  },
  vegan_ice_cream: {
    name: 'Vegan Ice Cream', category: 'food', price: 10, shops: RM, dessert: true,
    desc: 'A dairy-free scoop from a cozy University Ave shop. Oat-based and proud.',
    effects: { hunger: 12, fun: 4 }, tastes: { [P3]: 'like', [P1]: 'like' },
  },
  // ── drinks ──
  water_bottle: {
    name: 'Water Bottle', category: 'drink', price: 0, free: true,
    desc: 'Refill-station water. Piggy 2 calls it "the original perfusion."',
    effects: { hunger: 5, energy: 2 }, tastes: { [P2]: 'like' },
  },
  protein_shake: {
    name: 'Banana Protein Shake', category: 'drink', price: 12, shops: R,
    desc: 'Post-practice fuel. Tastes like a banana that did push-ups.',
    effects: { hunger: 30, energy: 5 }, tastes: { [P1]: 'love', [P3]: 'dislike' },
  },
  sideline_sip: {
    name: 'Sideline Sip', category: 'drink', price: 8, shops: R,
    desc: 'Electric-green sports drink. Gainesville has opinions about who invented it.',
    effects: { hunger: 8, energy: 5 }, tastes: { [P1]: 'love' },
  },
  florida_oj: {
    name: 'Florida OJ', category: 'drink', price: 8, shops: R,
    desc: 'Fresh-squeezed and aggressively orange. Vitamin C with a tan.',
    effects: { hunger: 10, health: 3 }, tastes: { [P1]: 'like', [P2]: 'like' },
  },
  sweet_tea: {
    name: 'Sweet Tea', category: 'drink', price: 6, shops: R,
    desc: 'Southern by default. Sugar content: medically noteworthy.',
    effects: { hunger: 6, fun: 2 }, tastes: { [P2]: 'love', [P3]: 'dislike' },
  },
  cafecito: {
    name: 'Cafecito', category: 'drink', price: 7, shops: R, caffeine: true,
    desc: 'A thimble of Cuban espresso with the power of a small sun.',
    effects: { hunger: 4, energy: 20 }, tastes: { [P2]: 'love', [P1]: 'dislike' },
  },
  cold_brew: {
    name: 'Cold Brew', category: 'drink', price: 9, shops: RM, caffeine: true,
    desc: 'Steeped for 18 hours. Gone in 4 minutes. Library-adjacent.',
    effects: { hunger: 4, energy: 15 }, tastes: { [P3]: 'like', [P1]: 'dislike' },
  },
  red_bull_sf: {
    name: 'Sugar-Free Red Bull', category: 'drink', price: 9, shops: RM, caffeine: true,
    desc: "Slim, ice-cold, zero sugar. The Marston vending machine knows exactly who it's for.",
    effects: { hunger: 2, energy: 15 }, tastes: { [P3]: 'love', [P1]: 'dislike', [P2]: 'dislike' },
  },
  boba_tea: {
    name: 'Boba Milk Tea', category: 'drink', price: 12, shops: RM,
    desc: 'Chewy pearls, giant straw, zero chance of drinking it quietly.',
    effects: { hunger: 15, fun: 5 }, tastes: { [P3]: 'like', [P2]: 'dislike', [P1]: 'like' },
  },
  strawberry_milk: {
    name: 'Strawberry Milk', category: 'drink', price: 8, shops: R,
    desc: 'Pink, sweet, and suspiciously nostalgic. Some pigs are weak to it.',
    effects: { hunger: 10, fun: 3 }, tastes: { [P1]: 'secret' },
  },
  // ── care & medicine ──
  lavender_soap: {
    name: 'Lavender Soap', category: 'care', price: 40, shops: R,
    desc: 'Bath upgrade: +fun, and he stays fresh twice as long. Smells like a spa that respects you.',
    effects: { fun: 8 }, tastes: { [P2]: 'like', [P3]: 'like' },
  },
  mint_toothpaste: {
    name: 'Mint Toothpaste', category: 'care', price: 30, shops: R,
    desc: 'Extra-minty. Brushing with it cleans twice as well. Breath: legendary.',
    effects: { hygiene: 20, fun: 3 }, tastes: {},
  },
  honey_lemon_tea: {
    name: 'Honey Lemon Tea', category: 'medicine', price: 20, shops: RS,
    desc: 'Warm, sweet, sour, grandma-approved. Cures a cold — then he naps.',
    effects: { hunger: 5, health: 20, cure: true }, tastes: { [P2]: 'like', [P3]: 'like' },
  },
  cold_medicine: {
    name: 'Cold Medicine', category: 'medicine', price: 35, shops: S,
    desc: 'Pharmacy-grade sniffle eraser. Take as directed by a pig in scrubs.',
    effects: { health: 30, cure: true }, tastes: {},
  },
  ginger_ale: {
    name: 'Ginger Ale', category: 'medicine', price: 15, shops: RS,
    desc: 'Bubbly tummy-settler. Health +10, no prescription needed.',
    effects: { hunger: 5, fun: 2, health: 10 }, tastes: { [P1]: 'like' },
  },
  // ── gifts ──
  knee_pad_tape: {
    name: 'Knee Pad Tape', category: 'gift', price: 45, shops: R,
    desc: 'Athletic tape in team colors, for hitters who dive for everything.',
    effects: {}, tastes: { [P1]: 'love', [P2]: 'like' },
  },
  signed_volleyball: {
    name: 'Signed Volleyball', category: 'gift', price: 70, shops: R,
    desc: 'Signed by the whole club team. One signature is just a doodle of a pig.',
    effects: {}, tastes: { [P1]: 'love', [P3]: 'like' },
  },
  brain_model: {
    name: 'Squishy Brain Model', category: 'gift', price: 60, shops: R,
    desc: 'Anatomically generous stress ball. Lobes color-coded for convenience.',
    effects: {}, tastes: { [P2]: 'love', [P3]: 'like' },
  },
  big_water_bottle: {
    name: '1 L Water Bottle', category: 'gift', price: 30, shops: R,
    desc: 'Hydration you can measure, with motivational time markings.',
    effects: {}, tastes: { [P2]: 'love', [P1]: 'like' },
  },
  sakura_filament: {
    name: 'Sakura PLA Filament', category: 'gift', price: 40, shops: R,
    desc: 'One spool of pink 3D-printer filament. Infinite tiny projects inside.',
    effects: {}, tastes: { [P3]: 'love' },
  },
  pirate_manga: {
    name: 'Pirate Manga', category: 'gift', price: 35, shops: R,
    desc: 'Volume 1 of a very long voyage. Stretchy captain not included.',
    effects: {}, tastes: { [P3]: 'love', [P1]: 'like' },
  },
  pennant: {
    name: 'Gator Pennant', category: 'gift', price: 50, shops: R,
    desc: 'Orange-and-blue felt pennant. Makes any room instantly louder.',
    effects: {}, tastes: { [P1]: 'like', [P2]: 'like', [P3]: 'like' },
  },
  sakura_charm: {
    name: 'Sakura Charm', category: 'gift', price: 25, shops: R,
    desc: 'A tiny blossom on a string. Said to bring luck to whoever carries it.',
    effects: {}, tastes: { [P1]: 'like', [P2]: 'like', [P3]: 'like' },
  },
  comic_sans_stickers: {
    name: 'Comic Sans Stickers', category: 'gift', price: 10, shops: R,
    desc: "A sheet of stickers in the world's most controversial font.",
    effects: {}, tastes: { [P1]: 'like' },
  },
  // ── key items (never sold) ──
  kempapager: {
    name: 'KempaPager', category: 'key', price: 0,
    desc: 'Your Kempanion device. Piggy 3 redid the UI so it stopped looking like a microwave clock.',
    effects: {}, tastes: {},
  },
  name_badge: {
    name: 'Name Badge', category: 'key', price: 0,
    desc: 'Your name, 3D-printed by Piggy 3 in a font he agonized over for an hour.',
    effects: {}, tastes: {},
  },
  sakura_keychain: {
    name: 'Sakura Keychain', category: 'key', price: 0,
    desc: 'A tiny blossom that has never once wilted. Suspicious. Lovely.',
    effects: {}, tastes: {},
  },
};

const SHOP_LOCATION: Record<ShopId, LocationId> = { reitz: 'reitz', midtown: 'midtown', shands: 'shands' };

function build(id: string, d: Def): PetItemDef {
  const shops = d.shops ?? [];
  const likes: Partial<Record<PigId, number>> = {};
  for (const pig of PIG_IDS) likes[pig] = TASTE_SCORE[d.tastes[pig] ?? 'neutral'];
  const { shops: _s, icon, ...rest } = d;
  return { id, icon: icon ?? id, likes, shops, soldAt: shops.length ? SHOP_LOCATION[shops[0]] : undefined, ...rest };
}

export const ITEMS: Record<string, PetItemDef> = Object.fromEntries(Object.entries(DEFS).map(([id, d]) => [id, build(id, d)]));

export const ITEM_IDS = Object.keys(ITEMS);

export function getItem(id: string): PetItemDef | undefined {
  return Object.prototype.hasOwnProperty.call(ITEMS, id) ? ITEMS[id] : undefined;
}

export function isEdible(item: PetItemDef | undefined): boolean {
  return !!item && (item.category === 'food' || item.category === 'drink');
}

/** Food + drink ids (the "serve every food" list). */
export const EDIBLE_IDS = ITEM_IDS.filter((id) => isEdible(ITEMS[id]));

/** Always-available free items for the Feed menu. */
export function freeItems(): PetItemDef[] {
  return ITEM_IDS.map((id) => ITEMS[id]).filter((i) => i.free);
}

/** Taste tier of a pig for an item (neutral when unspecified or unknown). */
export function tasteOf(pig: PigId, itemId: string): Taste {
  return getItem(itemId)?.tastes[pig] ?? 'neutral';
}

/** Remember that the player has seen this pig's reaction to an item. Returns true the first time. */
export function discoverTaste(save: SaveData, pig: PigId, itemId: string): boolean {
  const key = `taste.${pig}.${itemId}`;
  if (str(save, key)) return false;
  setFlag(save, key, tasteOf(pig, itemId));
  return true;
}

/**
 * The taste tier the player has discovered (for "Loved by: ?" in the shop/bag), or null if unknown. The flag only
 * records that the reaction was seen; the tier always comes from today's table, so a save from before a taste
 * changed (Piggy 3's favorite drink moved from cold brew to sugar-free Red Bull) never shows a stale heart.
 */
export function knownTaste(save: SaveData, pig: PigId, itemId: string): Taste | null {
  return str(save, `taste.${pig}.${itemId}`) ? tasteOf(pig, itemId) : null;
}

export function secretFavorite(pig: PigId): string {
  for (const id of ITEM_IDS) if (ITEMS[id].tastes[pig] === 'secret') return id;
  return '';
}

/** Loved (non-secret) edible items, cheapest first. */
export function lovedFoods(pig: PigId): string[] {
  return EDIBLE_IDS.filter((id) => ITEMS[id].tastes[pig] === 'love').sort((a, b) => ITEMS[a].price - ITEMS[b].price);
}

const LOCATION_SHOP: Partial<Record<LocationId, ShopId>> = { reitz: 'reitz', midtown: 'midtown', shands: 'shands' };

export function shopAt(location: LocationId): ShopId | null {
  return LOCATION_SHOP[location] ?? null;
}

export const SHOP_NAMES: Record<ShopId, string> = {
  reitz: 'Reitz Union Campus Store',
  midtown: 'Midtown Late-Night Eats',
  shands: 'Shands Pharmacy',
};

function inHours(hours: readonly [number, number], h: number): boolean {
  const [open, close] = hours;
  if (open === 0 && close === 24) return true;
  return open < close ? h >= open && h < close : h >= open || h < close;
}

export interface ShopStatus {
  shop: ShopId | null;
  name: string;
  open: boolean;
  /** Local opening/closing hours. */
  hours: readonly [number, number] | null;
}

export function shopStatus(location: LocationId, now: number): ShopStatus {
  const shop = shopAt(location);
  if (!shop) return { shop: null, name: '', open: false, hours: null };
  const hours = SHOP_HOURS[shop];
  return { shop, name: SHOP_NAMES[shop], open: inHours(hours, hourOf(now)), hours };
}

/** Items for sale at a location right now (empty when there is no shop or it is closed). */
export function shopStock(location: LocationId, now: number): PetItemDef[] {
  const st = shopStatus(location, now);
  if (!st.shop || !st.open) return [];
  const shop = st.shop;
  const order: ItemCategory[] = ['food', 'drink', 'care', 'medicine', 'gift'];
  return ITEM_IDS.map((id) => ITEMS[id])
    .filter((i) => i.shops.includes(shop))
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.price - b.price);
}
