// Public API of the pet simulation, economy, dailies and achievements. Owner: pet agent.
// Everything is pure TypeScript over SaveData (no DOM); pass the game clock's now() explicitly.
// Extra state lives in save.flags / save.counters — keys are documented in ./state.ts.

export type { SimEvent, AdvanceOptions, NeedLevel, CureHow, AwayRecord } from './sim';
export {
  defaultSettings, defaultPigState, newSave, repairSave, advance, isAsleep, nearBedtime, moodOf, moodScore, needLevel,
} from './sim';

export { applyAction, doctorsRounds, canDoctorsRounds, freeCheckup } from './care';

export type { BondInfo, HeartEventStatus } from './bond';
export {
  bondLevel, bondProgress, bondTitle, chapter, heartEventId, heartEventSeen, nextHeartEvent, heartGateCap, registerHeartEvent,
  addBondCapped, bondRoom, bondToday,
} from './bond';

export type { PetItemDef, ShopId, ShopStatus } from './items';
export {
  ITEMS, ITEM_IDS, EDIBLE_IDS, getItem, isEdible, freeItems, tasteOf, discoverTaste, knownTaste, secretFavorite,
  lovedFoods, shopStock, shopStatus, shopAt, SHOP_NAMES,
} from './items';

export type { OmikujiSlip, DailyClaim, StampInfo } from './daily';
export {
  recordDayPlayed, isGameDay, claimDaily, stampCard, rollOmikuji, omikujiToday, omikujiFor, acornMultiplier, earn,
  dailyTasks, completeTask, progressTasks, TASK_POOL,
} from './daily';

export type { BuyResult } from './economy';
export { priceOf, couponActive, buyItem, goldenPetalAvailable, goldenPetalsLeft, catchGoldenPetal } from './economy';

export type { Want, WantKind, WantResult } from './wants';
export { currentWant, fulfillWant, wantSlot, wantName } from './wants';

// Idle thought clouds: flavor only, seeded per pig and day (thoughts.ts; the banks are in ./thought-bank).
export type { Thought, ThoughtCtx, ThoughtPref, ThinkBlock } from './thoughts';
export {
  THOUGHT, pickThought, markThought, thinkBlock, thoughtPref, thoughtName, thoughtGap, firstBeatMs, thoughtMs,
  thoughtsToday, thoughtTags, thoughtWeight, topicHint,
} from './thoughts';

export type { SignalResult } from './signals';
export { recordSignal, saysBased } from './signals';

export type { MinigameApplied } from './minigame';
export {
  minigameReward, applyMinigameResult, canPlayMinigame, medalFor, medalTier, isFirstRunToday, MEDAL_THRESHOLDS,
} from './minigame';

export type { WelcomeBackLetter, LetterEntry } from './welcome';
export { welcomeBack, dismissWelcomeBack } from './welcome';

export { ACHIEVEMENTS, checkAchievements, getAchievement } from './achievements';

export type { Achievement, CareResult, DailyTask, GameSignal } from './types';
export type { BondSource, Taste, OmikujiId } from './balance';
export { BOND_TITLES, NEEDS, THRESH } from './balance';
