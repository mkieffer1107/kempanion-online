// Pure mini-game types shared by the pet module (rewards) and the Svelte games. No Svelte imports here.

export type MinigameId = 'volley' | 'perfusion' | 'debug' | 'petals' | 'surgery' | 'xfeed';

export const MINIGAME_IDS: readonly MinigameId[] = ['volley', 'perfusion', 'debug', 'petals', 'surgery', 'xfeed'] as const;

export type Medal = 'none' | 'bronze' | 'silver' | 'gold';
export const MEDAL_TIERS: readonly Medal[] = ['none', 'bronze', 'silver', 'gold'] as const;

/** What a finished run produced, before rewards. */
export interface MinigameOutcome {
  score: number;
  /** Game-specific stats: maxRally, perfect, accuracy, perfusion, correct, hints, petals, golden, snacks… */
  stats: Record<string, number>;
  assist?: boolean;
}

export interface MinigameResult {
  score: number;
  /** Earned a medal (there is no fail state; every run pays). */
  won: boolean;
  /** Rewards the caller applies to the save — use applyMinigameResult() from src/lib/pet. */
  money: number;
  bond: number;
  fun: number;
  id?: MinigameId;
  medal?: Medal;
  /** Energy change (negative). */
  energy?: number;
  /** Hunger gained from snacks (Petal Catch). */
  hunger?: number;
  /** First run of this game today (money ×2, ×3 with the Blessing omikuji). */
  firstRun?: boolean;
  stats?: Record<string, number>;
  assist?: boolean;
}

export interface MinigameProps {
  /** Pig playing with the player (Petal Catch works with any pig). */
  pig: import('../types').PigId;
  /** null = quit without result. */
  onExit: (result: MinigameResult | null) => void;
}
