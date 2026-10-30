// Mini-game registry. Owner: pet agent.
// Usage (UI): <def.component pig={pig} onExit={(r) => { if (r) applyMinigameResult(game.save, pig, r, now()); … }} />
import type { Component } from 'svelte';
import type { LocationId, PigId, SongId } from '../types';
import { META } from './meta';
import type { MinigameId, MinigameProps } from './types';
import SakuraSpike from './volley/SakuraSpike.svelte';
import PerfusionGame from './perfusion/Perfusion.svelte';
import BugHunt from './bughunt/BugHunt.svelte';
import PetalCatch from './petals/PetalCatch.svelte';

export type { Medal, MinigameId, MinigameOutcome, MinigameProps, MinigameResult } from './types';
export { MINIGAME_IDS, MEDAL_TIERS } from './types';
export { META as MINIGAME_META, resultLine } from './meta';

export interface MinigameDef {
  id: MinigameId;
  title: string;
  jpTitle: string;
  pig: PigId;
  desc: string;
  song: SongId;
  component: Component<MinigameProps>;
  /** Where it is played (the location's action button). */
  location: LocationId;
  /** Any pig can play it (Petal Catch); otherwise always the host pig. */
  anyPig: boolean;
}

const COMPONENTS: Record<MinigameId, Component<MinigameProps>> = {
  volley: SakuraSpike,
  perfusion: PerfusionGame,
  debug: BugHunt,
  petals: PetalCatch,
};

function def(id: MinigameId): MinigameDef {
  const m = META[id];
  return { id, title: m.title, jpTitle: m.jpTitle, pig: m.pig, desc: m.desc, song: m.song, component: COMPONENTS[id], location: m.location, anyPig: m.anyPig };
}

export const MINIGAMES: Record<MinigameId, MinigameDef> = {
  volley: def('volley'),
  perfusion: def('perfusion'),
  debug: def('debug'),
  petals: def('petals'),
};
