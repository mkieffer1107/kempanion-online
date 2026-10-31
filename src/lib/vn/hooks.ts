// UI hooks the VN runner awaits for interactive story beats. The UI registers them at startup:
//   vnHooks.pickCompanion = () => …   vnHooks.enterName = () => …   vnHooks.runMinigame = (id, opts) => …
// Unset hooks fall back to: pick piggy-1 · inline name question · skip the mini-game.
import type { PigId } from '../types';
import type { MinigameId, MinigameResult } from '../minigames';
import type { SignalResult } from '../pet';

export interface VnHooks {
  /** [companion pick]: show the choose-your-Kempanion cards and resolve with the chosen pig. */
  pickCompanion?: () => Promise<PigId>;
  /** Optional [name] override for another host; the game uses the inline dialogue input by default. */
  enterName?: () => Promise<string>;
  /**
   * [minigame id]: play the mini-game with `pig` and resolve with its result (null = quit).
   * Do NOT apply the rewards here: the runner applies them with applyMinigameResult (none in album replays).
   */
  runMinigame?: (id: MinigameId, opts: { pig: PigId; replay: boolean }) => Promise<MinigameResult | null>;
  /** Optional: celebrate tasks/achievements completed by a chat exchange or a scene mini-game (toasts). */
  onSignal?: (result: SignalResult) => void;
}

export const vnHooks: VnHooks = {};
