// What the prologue (content/scenes/prologue.ks) sets up for a new player, so skipping it (Scene → MENU → Skip
// scene) loses none of it: the intake (name, answers, intake.done: NewGame's IntakeForm + applyIntake), the first
// meetings (met_p1–3) and the starter items. Also what that MENU's confirm says, which depends on whether the scene
// can come back.
import type { SaveData } from '../../types';

/** Items the prologue hands over ([give] in prologue.ks). */
export const STARTER_ITEMS: Readonly<Record<string, number>> = { water_bottle: 1, kempapager: 1 };

/** Flags the prologue's first meetings set ([set] in prologue.ks). */
export const MET_FLAGS = ['met_p1', 'met_p2', 'met_p3'] as const;

/** The prologue's intake isn't done yet: a skip sends the player to the intake form (NewGame, { intake: true }). */
export function needsIntake(save: SaveData): boolean {
  return !save.flags['intake.done'];
}

/**
 * Gives the starter items and sets the met flags `store.save` doesn't have yet (a skipped prologue may have some).
 * The items go straight into the inventory, without store.give's "Got …" toasts: the player is on a menu screen
 * (the intake form, then Select), not in the scene that hands them over, and the toasts covered the companion window
 * and the profile card's name there. Their first sight of the items is the hub tutorial.
 */
export function giveStarterKit(store: {
  save: SaveData;
  setFlag(name: string): void;
  persist(): void;
}): void {
  for (const [item, n] of Object.entries(STARTER_ITEMS)) if (!((store.save.inventory[item] ?? 0) > 0)) store.save.inventory[item] = n;
  for (const flag of MET_FLAGS) if (!store.save.flags[flag]) store.setFlag(flag);
  store.persist();
}

export interface SkipNote {
  /** Album replay. */
  replay?: boolean;
  /** The scene has a `trigger:`, so it can come back on its own when it isn't marked as seen. */
  triggered?: boolean;
  /** The prologue (it only plays once, from NEW GAME). */
  prologue?: boolean;
  /** The prologue's intake form isn't done yet (the skip leads to the intake form). */
  intake?: boolean;
}

/** MENU → Skip scene: the confirm's message. Only a scene with a trigger comes back by itself. */
export function skipNote(o: SkipNote): string {
  if (o.replay) return 'Leave this replay?';
  if (o.prologue) {
    return o.intake
      ? 'Skip the rest of the intro? It won’t play again, but you’ll still fill in the Kempa intake form.'
      : 'Skip the rest of the intro? It won’t play again.';
  }
  return o.triggered
    ? 'Skip the rest of this scene? It won’t count as seen, so it can come back later.'
    : 'Skip the rest of this scene? It won’t count as seen.';
}
