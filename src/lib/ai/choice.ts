// The player's per-device answer to "Download Big Brain?" — asked once on the start menu (BigBrainPrompt).
// It lives in localStorage, not in the save: the model is cached by this browser, so a save moved to another
// device must not carry the answer with it.
//   'accepted' → Big Brain controls appear in the game (status chip, % while downloading) and it autoloads.
//   'declined' or no answer yet → every Big Brain control stays out of the game (no chip, no in-game offers).
// Settings → Brain is where the player changes their mind: downloading there sets 'accepted', removing the
// model sets 'declined'. Pure module (no runes, no DOM besides storage): bun-testable.

export type BigBrainChoice = 'accepted' | 'declined';

/** localStorage key (all keys are prefixed `kempanion` because GitHub Pages sites share one origin). */
export const BIG_BRAIN_CHOICE_KEY = 'kempanion.bigbrain';

export type ChoiceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): ChoiceStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // storage blocked
  }
}

/** When storage is blocked or full, the answer still holds for this session. */
let sessionChoice: BigBrainChoice | null = null;

export function parseBigBrainChoice(raw: unknown): BigBrainChoice | null {
  return raw === 'accepted' || raw === 'declined' ? raw : null;
}

/** The stored answer, or null when this device hasn't been asked yet. */
export function getBigBrainChoice(storage: ChoiceStorage | null = defaultStorage()): BigBrainChoice | null {
  let stored: BigBrainChoice | null = null;
  try {
    stored = parseBigBrainChoice(storage?.getItem(BIG_BRAIN_CHOICE_KEY));
  } catch {
    /* blocked: fall back to this session's answer */
  }
  return stored ?? sessionChoice;
}

type Listener = (choice: BigBrainChoice | null) => void;
const listeners = new Set<Listener>();
let watchingOtherTabs = false;

function notify(choice: BigBrainChoice | null): void {
  for (const cb of [...listeners]) {
    try {
      cb(choice);
    } catch {
      /* a listener failing must not break the others */
    }
  }
}

/** Store the answer (null forgets it, so the start menu asks again) and tell every subscriber. */
export function setBigBrainChoice(choice: BigBrainChoice | null, storage: ChoiceStorage | null = defaultStorage()): void {
  sessionChoice = choice;
  try {
    if (choice) storage?.setItem(BIG_BRAIN_CHOICE_KEY, choice);
    else storage?.removeItem(BIG_BRAIN_CHOICE_KEY);
  } catch {
    /* storage blocked or full: sessionChoice keeps it until the tab closes */
  }
  notify(choice);
}

/**
 * Follow the answer: `cb` runs on every change (in this tab, or another tab of the game). Returns an
 * unsubscribe function, so `$effect(() => onBigBrainChoice((v) => (choice = v)))` gives a component a live mirror.
 */
export function onBigBrainChoice(cb: Listener): () => void {
  listeners.add(cb);
  if (!watchingOtherTabs && typeof addEventListener === 'function') {
    watchingOtherTabs = true;
    addEventListener('storage', (e: StorageEvent) => {
      if (e.key === BIG_BRAIN_CHOICE_KEY || e.key === null) notify(getBigBrainChoice());
    });
  }
  return () => {
    listeners.delete(cb);
  };
}

/** Big Brain controls (status chip, download %, in-game offers) only exist after a yes on this device. */
export function bigBrainUiEnabled(choice: BigBrainChoice | null): boolean {
  return choice === 'accepted';
}

/** The start menu asks once per device: only while there is no answer. */
export function shouldAskBigBrain(choice: BigBrainChoice | null): boolean {
  return choice === null;
}
