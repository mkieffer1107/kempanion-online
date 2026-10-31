// Full-screen mini-games launched from a scene. App renders them; these promises back vnHooks.runMinigame.
import type { MinigameId, MinigameResult } from '../minigames';
import { MINIGAMES } from '../minigames';
import type { PigId } from '../types';
import { game } from '../state/game.svelte';

export interface MinigameRequest { id: MinigameId; pig: PigId; resolve: (r: MinigameResult | null) => void }

class Overlays {
  minigame = $state.raw<MinigameRequest | null>(null);

  /** Plays a mini-game over whatever screen is showing (scenes). The caller (VN runner) applies the rewards. */
  runMinigame(id: string, pig?: PigId): Promise<MinigameResult | null> {
    const def = MINIGAMES[id as MinigameId];
    if (!def) return Promise.resolve(null);
    this.minigame?.resolve(null);
    return new Promise((resolve) => {
      this.minigame = {
        id: def.id,
        pig: pig ?? (def.anyPig ? game.save.companion ?? def.pig : def.pig),
        resolve: (r) => {
          this.minigame = null;
          resolve(r);
        },
      };
    });
  }
}

export const overlays = new Overlays();
