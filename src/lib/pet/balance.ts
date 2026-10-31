// Every tuning number for the pet sim, economy and dailies (GAME_DESIGN.md §6–§9, §12–§13).
import type { MoodTier, NeedId, Needs, PigId } from '../types';

const H = 3_600_000;
const MIN = 60_000;

// ── needs & decay (§6) ──

/** Points per hour while present and awake. */
export const DECAY_PER_HOUR: Needs = { hunger: 6, energy: 4.5, hygiene: 3, fun: 5 };

export const PIG_DECAY: Record<PigId, Needs> = {
  'piggy-1': { hunger: 1.2, energy: 1, hygiene: 1.25, fun: 1.2 },
  'piggy-2': { hunger: 1, energy: 1.15, hygiene: 0.8, fun: 0.9 },
  'piggy-3': { hunger: 0.9, energy: 1, hygiene: 1, fun: 0.8 },
};

export const SIM = {
  stepMs: 15 * MIN,
  /** A gap longer than this between ticks counts as offline/background time. */
  presentGapMs: 10 * MIN,
  offlineMult: 0.7,
  asleepMult: 0.25,
  /** Offline needs never drop below this. */
  offlineFloor: 20,
  /** Catch-up cap; beyond it the welcome-back reset runs instead. */
  catchUpCapMs: 72 * H,
  welcomeBackMin: 55,
  welcomeBackMoney: 100,
  /** Away at least this long → welcome-back letter. */
  letterAwayMs: 2 * H,
  sleepEnergyPerHour: 15,
  napEnergyPerHour: 72,
  napEnergyCap: 85,
  napMs: 30 * MIN,
  /** Napping is only offered below this energy. */
  napBelow: 60,
  /** Present and awake with energy under this → he dozes off on his own. */
  autoNapBelow: 5,
  /** Waking him at bedtime keeps him up this long. */
  wakeGraceMs: 30 * MIN,
  /** Tuck-in is allowed from this long before bedtime. */
  tuckWindowMs: 90 * MIN,
  /** Comfortable value the non-companion pigs drift toward. */
  othersComfort: 80,
  othersDriftPerHour: 12,
  /** One crumb/mess per this much awake time, plus crumbly food. */
  messEveryMs: 5 * H,
  messMax: 5,
  messHygieneMult: 0.05,
  /** Lavender soap: hygiene decays at this fraction while fresh. */
  freshHygieneMult: 0.5,
  freshMs: 8 * H,
} as const;

export const THRESH = { fine: 60, mild: 30, needsYou: 15 } as const;

// ── health & sickness (§6) ──

export const HEALTH = {
  lowNeed: 15,
  lossPerLowNeedPerHour: 4,
  allAbove: 50,
  gainPerHour: 3,
  sickBelow: 30,
  /** Health right after any cure. */
  curedTo: 60,
  maxIllnessMs: 24 * H,
  sickEnergyMult: 1.5,
  sickFunGainMult: 0.5,
  overnightHunger: 40,
  /** A sleep at least this long counts as "overnight" for the cure. */
  overnightMs: 4 * H,
  doctorRoundsHearts: 4,
} as const;

// ── mood (§6) ──

export const MOOD_WEIGHTS: Record<PigId, Needs> = {
  'piggy-1': { hunger: 0.3, energy: 0.2, hygiene: 0.15, fun: 0.35 },
  'piggy-2': { hunger: 0.25, energy: 0.3, hygiene: 0.25, fun: 0.2 },
  'piggy-3': { hunger: 0.25, energy: 0.2, hygiene: 0.15, fun: 0.4 },
};
export const MOOD_DISTRESS = { below: 25, perPoint: 0.6 } as const;
export const MOOD_TIERS: readonly [MoodTier, number][] = [['great', 85], ['good', 65], ['okay', 45], ['low', 25], ['awful', -Infinity]];

// ── care actions (§6) ──

export const CARE = {
  bathCooldownMs: 3 * H,
  brushCooldownMs: 2 * H,
  brushHygiene: 10,
  toothpasteHygiene: 20,
  toothpasteFun: 3,
  soapFun: 8,
  bathFun: { 'piggy-1': 3, 'piggy-2': 5, 'piggy-3': 0 } as Record<PigId, number>,
  play: { fun: 20, energy: -8, hygiene: -6 } as Partial<Needs>,
  playMinEnergy: 10,
  petFun: 6,
  petDecay: 0.6,
  petWindowMs: 15 * MIN,
  petBurstGapMs: 600,
  petBurstCount: 6,
  /** Food is refused at or above this hunger (item kept)… */
  fullAt: 90,
  /** …drinks at or above this. */
  drinkFullAt: 95,
  dessertCooldownMs: 2 * H,
  caffeineCooldownMs: 3 * H,
  tidyHygienePerMess: 2,
} as const;

// ── bond (§7) ──

export type BondSource =
  | 'care' | 'food' | 'pet' | 'talk' | 'gift' | 'want' | 'minigame' | 'tuck' // routine (120/day total)
  | 'task' | 'discovery' | 'scene' | 'event';

export const ROUTINE_SOURCES: readonly BondSource[] = ['care', 'food', 'pet', 'talk', 'gift', 'want', 'minigame', 'tuck'];

export const BOND = {
  max: 1000,
  perLevel: 100,
  maxLevel: 10,
  routineDailyCap: 120,
  /** Per-source daily caps (per pig). Sources not listed have no daily cap. */
  caps: { care: 30, food: 40, pet: 10, talk: 30, gift: 15, want: 16, minigame: 100, tuck: 10, task: 30 } as Partial<Record<BondSource, number>>,
  /** Care actions give bond only when the need they fix was below this. */
  careBelow: 60,
  care: 3,
  pet: 2,
  talk: 2,
  talkTopic: 1,
  companionTalkMult: 1.25,
  tuck: 10,
  discovery: 50,
  hearts: 7,
} as const;

export const BOND_TITLES = [
  'Stranger', 'Classmate', 'Lab Partner', 'Study Buddy', 'Friend', 'Good Friend',
  'Close Friend', 'Best Friend', 'Partner-in-Crime', 'Kindred Spirit', 'Kempanion',
] as const;

/** Heart event n needs this story chapter (§7). */
export const HEART_EVENT_CHAPTER = [0, 1, 1, 2, 2, 3, 3, 4] as const;
/** Chapter by distinct days played: Ch1 day 1, Ch2 day 2+, Ch3 day 4+, Ch4 day 6+. */
export const CHAPTER_DAYS = [0, 1, 2, 4, 6] as const;

// ── tastes (§6) ──

export type Taste = 'secret' | 'love' | 'like' | 'neutral' | 'dislike';
export const TASTE_FILL: Record<Taste, number> = { secret: 1.2, love: 1.2, like: 1, neutral: 1, dislike: 0.8 };
export const TASTE_BOND: Record<Taste, number> = { secret: 10, love: 10, like: 4, neutral: 1, dislike: 0 };
export const GIFT_BOND: Record<Taste, number> = { secret: 15, love: 15, like: 8, neutral: 3, dislike: 0 };
export const GIFT_FUN: Record<Taste, number> = { secret: 10, love: 10, like: 5, neutral: 2, dislike: 0 };
/** Numeric preference for ItemDef.likes (−1 hate … +2 love). */
export const TASTE_SCORE: Record<Taste, number> = { secret: 2, love: 2, like: 1, neutral: 0, dislike: -1 };
export const GIFT_MIN_HEARTS = 1;

// ── wants (§6) ──

export const WANT = {
  /** Wants start roughly every 3 h of the waking day, each lasting 2 h. */
  blockMs: 3 * H,
  firstBlockHour: 6,
  lifeMs: 2 * H,
  /** Start offset jitter inside each block. */
  jitterMs: 50 * MIN,
  bond: 8,
  fun: 5,
} as const;

// ── idle thoughts (thoughts final.md §4.5; pet/thoughts.ts) ──

/**
 * The thought clouds' cadence and durations. Tuning knobs: `hubShare.fine` (0.7 thoughts : 0.3 spoken lines), `gapS`,
 * `placeMinS`, `dailyMax`, and `share` on Piggy 3's `x` topic in thought-bank/piggy-3.ts (0.6 gives X about half of his thoughts).
 */
export const THOUGHT = {
  /** First beat after the screen settles (s): hub after the greet line; place after the greet bubble ends. */
  firstS: { hub: [6, 10], place: [8, 14] },
  /** Hub stays chatty throughout a visit; unattended rooms ease off a little after afkMs (s). */
  hubGapS: [12, 20], hubAfkGapS: [20, 30],
  /** Place screens: start-to-start gap (s), by beats already run this visit (< upTo). */
  gapS: [{ upTo: 8, s: [20, 40] }, { upTo: 20, s: [40, 80] }, { upTo: Infinity, s: [120, 240] }],
  /** No pointer/key input for this long (game.lastInputAt): use the AFK gap instead (s). */
  afkMs: 3 * MIN, afkGapS: [180, 360],
  /** 'lots': gaps × this, and hubShare.fine + 0.15. */
  lotsK: 0.7,
  /** Place screens: one pig's gap ÷ pigs on screen, but never under this (s). */
  placeMinS: 18,
  /** On screen: 6 s + 0.1 s per label char, clamped 6–8 s; the timer pauses while hovered or focused. */
  showMs: [6000, 8000], perCharMs: 100,
  /** The next beat starts no sooner than this after a thought ends. */
  restMs: 4000,
  /** The tapped line's bubble: 1800 + 55 ms × length, clamped (120 chars ≈ 8.4 s, ≈ 14 chars/s). */
  tapMs: [2500, 8500],
  dailyMax: 60, labelMax: 20, lineMax: 120,
  /** Hub beats that become thoughts: he's fine / a need under LOW / sick. The first beat of a visit is always a thought. */
  hubShare: { fine: 0.7, low: 0.5, sick: 0.5 },
  /** He strikes the 'thinking' pose on every Nth thought that has no pose of its own (everyday outfit only). */
  poseEvery: 3,
} as const;

// ── economy & dailies (§8) ──

export const START_MONEY = 100;

export interface StampReward { money: number; item?: 'companion_love' | string; scene?: boolean }
export const STAMPS: readonly StampReward[] = [
  { money: 30 }, { money: 40, item: 'companion_love' }, { money: 50 }, { money: 60 },
  { money: 70, item: 'sakura_charm' }, { money: 80 }, { money: 100, scene: true },
];

export type OmikujiId = 'great' | 'blessing' | 'small' | 'future';
export const OMIKUJI: readonly { id: OmikujiId; weight: number }[] = [
  { id: 'great', weight: 10 }, { id: 'blessing', weight: 30 }, { id: 'small', weight: 40 }, { id: 'future', weight: 20 },
];
export const GREAT_BLESSING_MULT = 1.25;

export const TASKS = { perDay: 3, money: 25, bond: 10 } as const;

export const PETALS = { money: 5, perDay: 10, minGapMs: 3 * MIN } as const;

export const MINIGAME = {
  minEnergy: 20,
  minMoney: 5,
  firstRunMult: 2,
  blessingFirstRunMult: 3,
  bondBase: 10,
  bondPerTier: 5,
  funBase: 20,
  funPerTier: [0, 1, 3, 5] as readonly number[],
  maxHungerFromSnacks: 30,
} as const;

export const SHOP_HOURS = {
  /** Reitz Union campus store, daytime. */
  reitz: [7, 21],
  /** Midtown late-night food (wraps midnight). */
  midtown: [20, 3],
  /** Shands pharmacy never closes. */
  shands: [0, 24],
} as const;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export const NEEDS: readonly NeedId[] = ['hunger', 'energy', 'hygiene', 'fun'];
