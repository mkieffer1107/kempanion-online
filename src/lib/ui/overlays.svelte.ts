// Full-screen overlays that scripts await: the pixel name-entry modal and a mini-game launched from a
// scene. App renders them; these promises back vnHooks.enterName / vnHooks.runMinigame.
import type { MinigameId, MinigameResult } from '../minigames';
import { MINIGAMES } from '../minigames';
import type { PigId } from '../types';
import { game } from '../state/game.svelte';

export interface NameRequest { initial: string; prompt: string; resolve: (name: string) => void }
export interface MinigameRequest { id: MinigameId; pig: PigId; resolve: (r: MinigameResult | null) => void }

class Overlays {
  name = $state.raw<NameRequest | null>(null);
  minigame = $state.raw<MinigameRequest | null>(null);

  /** Resolves with the trimmed name (never empty). */
  enterName(initial = '', prompt = 'What should the piggies call you?'): Promise<string> {
    this.name?.resolve(initial || game.save.player.name || 'Kempa');
    return new Promise((resolve) => {
      this.name = {
        initial: initial || game.save.player.name,
        prompt,
        resolve: (n) => {
          this.name = null;
          resolve(n);
        },
      };
    });
  }

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
