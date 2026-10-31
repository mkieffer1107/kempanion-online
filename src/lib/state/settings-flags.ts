// Player settings that live in save.flags because the Settings type doesn't cover them. They belong to the player,
// not to the semester: NEW GAME / START OVER (game.reset) and Settings' "Reset everything" (game.wipe) carry them
// into the fresh save, and Settings' "Restore defaults" clears exactly these. Add a key here whenever Settings (or
// another screen's own option, like the mini-games' Assist toggle) stores a new option in flags.
import type { SaveData } from '../types';

export const SETTINGS_FLAGS = [
  'ui.haptics', // false = disable touch feedback (unset = on, where supported)
  'ui.textSize', // 's' | 'm' | 'l' | 'xl' (unset = m)
  'ui.petals', // 'lots' | 'some' | 'off' (unset = some)
  'ui.thoughts', // 'lots' | 'some' | 'off' (unset = some): the piggies' thought clouds (read by pet/thoughts.ts)
  'ui.highContrast', // true = high-contrast text box
  'ui.muteHidden', // false = keep the sound on while the tab is hidden (unset = mute)
  'ui.skipReadOnly', // true = SKIP stops at text you haven't read
  'pet.gentle', // true = Gentle mode: no sickness, needs frozen while away (read by the pet sim)
  'minigame.assist', // true = Assist mode in every mini-game (the toggle on MinigameShell's how-to card)
] as const;

export type SettingsFlag = (typeof SETTINGS_FLAGS)[number];

type Flags = SaveData['flags'];

/** Copy the settings flags that are set in `from` (the old save) into `to` (a fresh save's flags). */
export function carrySettingsFlags(from: Flags, to: Flags): void {
  for (const k of SETTINGS_FLAGS) if (from[k] !== undefined) to[k] = from[k];
}

/** Back to the defaults: remove every settings flag (and nothing else). */
export function clearSettingsFlags(flags: Flags): void {
  for (const k of SETTINGS_FLAGS) delete flags[k];
}
