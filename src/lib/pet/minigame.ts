// Mini-game rewards (GAME_DESIGN.md §9): no fail state, every run pays ≥ 5 acorns, Assist pays full,
// first run of each game per day ×2 (×3 with the Blessing omikuji), bond 10 + 5 per medal tier.
import type { PigId, SaveData } from '../types';
import { MEDAL_TIERS, type Medal, type MinigameId, type MinigameOutcome, type MinigameResult } from '../minigames/types';
import { MINIGAME, clamp } from './balance';
import { addBondCapped, bondLevel, bondRoom, heartGateCap } from './bond';
import { acornMultiplier, omikujiToday } from './daily';
import { recordSignal } from './signals';
import { isAsleep } from './sim';
import { bump, setFlag, setMax, str, today, todayOf } from './state';
import type { Achievement, DailyTask } from './types';

interface GameTuning {
  /** Medal from the outcome. */
  medal: (o: MinigameOutcome) => Medal;
  /** Acorns before multipliers (clamped to [5, cap]). */
  money: (o: MinigameOutcome) => number;
  cap: number;
  energy: number;
}

const byThresholds = (v: number, [b, s, g]: [number, number, number]): Medal => (v >= g ? 'gold' : v >= s ? 'silver' : v >= b ? 'bronze' : 'none');

/** Medal thresholds — volley/petals/surgery/xfeed by score, perfusion by accuracy %, debug by bugs found. */
export const MEDAL_THRESHOLDS: Record<MinigameId, [number, number, number]> = {
  volley: [1800, 4000, 6500],
  perfusion: [70, 85, 95],
  debug: [6, 8, 10],
  petals: [60, 100, 140],
  surgery: [900, 1600, 2300],
  xfeed: [2000, 3800, 7500],
};

export const TUNING: Record<MinigameId, GameTuning> = {
  volley: { medal: (o) => byThresholds(o.score, MEDAL_THRESHOLDS.volley), money: (o) => 5 + o.score / 180, cap: 45, energy: -12 },
  perfusion: { medal: (o) => byThresholds(o.stats.accuracy ?? 0, MEDAL_THRESHOLDS.perfusion), money: (o) => 5 + 0.4 * (o.stats.accuracy ?? 0), cap: 45, energy: -10 },
  debug: { medal: (o) => byThresholds(o.stats.correct ?? 0, MEDAL_THRESHOLDS.debug), money: (o) => 5 + o.score / 5, cap: 45, energy: -8 },
  petals: { medal: (o) => byThresholds(o.score, MEDAL_THRESHOLDS.petals), money: (o) => 5 + o.score / 4, cap: 40, energy: -10 },
  surgery: { medal: (o) => byThresholds(o.score, MEDAL_THRESHOLDS.surgery), money: (o) => 5 + o.score / 60, cap: 45, energy: -8 },
  xfeed: { medal: (o) => byThresholds(o.score, MEDAL_THRESHOLDS.xfeed), money: (o) => 5 + o.score / 180, cap: 45, energy: -8 },
};

export function medalFor(id: MinigameId, o: MinigameOutcome): Medal {
  return TUNING[id].medal(o);
}

export function medalTier(m: Medal): number {
  return Math.max(0, MEDAL_TIERS.indexOf(m));
}

export function isFirstRunToday(save: SaveData, id: MinigameId, now: number): boolean {
  return str(save, `pet.mg.${id}`) !== today(now);
}

/** Needs energy ≥ 20 and an awake pig. */
export function canPlayMinigame(save: SaveData, pig: PigId, now: number): { ok: boolean; reason?: string } {
  if (isAsleep(save, pig, now)) return { ok: false, reason: "He's asleep. Let him rest — try again after his bedtime." };
  if (save.companion === pig && save.pigs[pig].needs.energy < MINIGAME.minEnergy) {
    return { ok: false, reason: 'Too tired to play (needs ⚡20). A nap or a cafecito would help.' };
  }
  return { ok: true };
}

/** Rewards for a finished run (does not mutate). Bond is previewed through today's caps and the heart gate. */
export function minigameReward(save: SaveData, id: MinigameId, pig: PigId, outcome: MinigameOutcome, now: number): MinigameResult {
  const t = TUNING[id];
  const medal = t.medal(outcome);
  const tier = medalTier(medal);
  const firstRun = isFirstRunToday(save, id, now);
  const firstMult = firstRun ? (omikujiToday(save, now) === 'blessing' ? MINIGAME.blessingFirstRunMult : MINIGAME.firstRunMult) : 1;
  const base = clamp(Math.floor(t.money(outcome)), MINIGAME.minMoney, t.cap);
  const money = Math.round(base * firstMult * acornMultiplier(save, now));
  const p = save.pigs[pig];
  const room = Math.max(0, Math.min(bondRoom(save, pig, 'minigame', now), heartGateCap(save, pig) - p.bond));
  const bond = Math.min(MINIGAME.bondBase + MINIGAME.bondPerTier * tier, room);
  const fun = MINIGAME.funBase + (MINIGAME.funPerTier[tier] ?? 0);
  const hunger = id === 'petals' ? Math.min(MINIGAME.maxHungerFromSnacks, (outcome.stats.snacks ?? 0) * 5) : 0;
  return {
    id, score: Math.round(outcome.score), won: medal !== 'none', money, bond, fun, medal, energy: t.energy, hunger,
    firstRun, stats: { ...outcome.stats }, assist: !!outcome.assist,
  };
}

export interface MinigameApplied {
  money: number;
  bond: number;
  levelUp?: number;
  tasks: DailyTask[];
  achievements: Achievement[];
  wantFulfilled: boolean;
}

/**
 * Apply a run's rewards to the save: acorns, bond (capped), fun/energy/hunger (companion), first-run
 * bookkeeping, bests, medals, tasks, wants and achievements. Call once per MinigameResult.
 */
export function applyMinigameResult(save: SaveData, pig: PigId, result: MinigameResult, now: number): MinigameApplied {
  const id = result.id ?? 'petals';
  const p = save.pigs[pig];
  const levelBefore = bondLevel(p.bond);
  save.money += Math.max(0, Math.round(result.money));
  const bond = addBondCapped(save, pig, result.bond, 'minigame', now);
  if (save.companion === pig) {
    const funGain = (result.fun ?? 0) * (p.sick ? 0.5 : 1);
    p.needs.fun = clamp(p.needs.fun + funGain, 0, 100);
    p.needs.energy = clamp(p.needs.energy + (result.energy ?? 0), 0, 100);
    p.needs.hunger = clamp(p.needs.hunger + (result.hunger ?? 0), 0, 100);
  }
  p.lastPlayedAt = now;
  todayOf(p, now).minigames += 1;
  setFlag(save, `pet.mg.${id}`, today(now));
  bump(save, `mg.${id}.runs`);
  bump(save, 'minigames');
  setMax(save, `mg.${id}.best`, result.score);
  const medal: Medal = result.medal ?? 'none';
  if (medal !== 'none') bump(save, `mg.${id}.${medal}`);
  if (medal === 'gold') setFlag(save, `pet.gold.${id}`, true);
  const stats = result.stats ?? {};
  if (id === 'volley') setMax(save, 'mg.volley.best_rally', stats.maxRally ?? 0);
  if (id === 'perfusion' && (stats.perfusion ?? 0) >= 100) bump(save, 'mg.perfusion.textbook');
  if (id === 'debug' && (stats.correct ?? 0) >= 10 && (stats.hints ?? 0) === 0) bump(save, 'mg.debug.zero_day');
  if (id === 'surgery' && (stats.watertight ?? 0) >= 3) bump(save, 'mg.surgery.watertight');
  if (id === 'xfeed') {
    setMax(save, 'mg.xfeed.best_combo', stats.maxCombo ?? 0);
    bump(save, 'mg.xfeed.grass', stats.grass ?? 0);
    if ((stats.wrong ?? 0) === 0 && (stats.missed ?? 0) === 0 && (stats.judged ?? 0) >= 30) bump(save, 'mg.xfeed.signal_only');
  }
  if (id === 'petals') {
    setMax(save, 'mg.petals.best_petals', stats.petals ?? 0);
    bump(save, 'petals_caught', stats.petals ?? 0);
  }
  const sig = recordSignal(save, { kind: 'minigame', id, pig, medal, score: result.score, stats }, now);
  const level = bondLevel(p.bond);
  return {
    money: Math.round(result.money),
    bond: bond + (sig.want?.bond ?? 0),
    levelUp: level > levelBefore ? level : undefined,
    tasks: sig.tasks,
    achievements: sig.achievements,
    wantFulfilled: !!sig.want,
  };
}
