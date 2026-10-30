// Static mini-game metadata (no components, so games and the registry can share it without cycles).
import type { LocationId, PigId, SongId } from '../types';
import type { Medal, MinigameId } from './types';

export interface MinigameMeta {
  id: MinigameId;
  title: string;
  jpTitle: string;
  /** Host pig (Petal Catch can be played with any pig). */
  pig: PigId;
  anyPig: boolean;
  desc: string;
  song: SongId;
  location: LocationId;
  /** Backgrounds to try in order (some locations are still being painted). */
  bg: string[];
  focusX: number;
}

export const META: Record<MinigameId, MinigameMeta> = {
  volley: {
    id: 'volley', title: 'Sakura Spike', jpTitle: 'さくらスパイク', pig: 'piggy-1', anyPig: false,
    desc: 'Bump, set, SPIKE! Tap as the ring closes on the ball’s shadow. 60 seconds on the sand courts.',
    song: 'mini_volley', location: 'volleyball_courts', bg: ['volleyball_courts'], focusX: 200,
  },
  perfusion: {
    id: 'perfusion', title: 'Perfusion!', jpTitle: 'パーフュージョン！', pig: 'piggy-2', anyPig: false,
    desc: 'Keep the heartbeat on rhythm in the sim lab: tap beats, hold drains, skip flat lines.',
    song: 'mini_perfusion', location: 'communicore', bg: ['communicore', 'or_suite', 'anatomy_lab'], focusX: 240,
  },
  debug: {
    id: 'debug', title: 'Bug Hunt', jpTitle: 'バグハント', pig: 'piggy-3', anyPig: false,
    desc: 'Ten little PigScript programs, one broken line each. Find it before the timer runs out.',
    song: 'mini_debug', location: 'physics', bg: ['physics_lab', 'physics'], focusX: 240,
  },
  petals: {
    id: 'petals', title: 'Petal Catch', jpTitle: 'はなびらキャッチ', pig: 'piggy-1', anyPig: true,
    desc: 'Run and catch falling sakura petals on the Plaza. Golden ones are worth 10. Mind the squirrels.',
    song: 'plaza', location: 'plaza', bg: ['plaza', 'century_tower', 'title'], focusX: 240,
  },
};

/** What the pig says on the results card, by medal. */
export const RESULT_LINES: Record<MinigameId | 'petals_any', Partial<Record<PigId, Record<Medal, string>>>> = {
  volley: {
    'piggy-1': {
      gold: 'THAT is how you close a rally! Up top, teammate!',
      silver: "Nice! We're cooking now. Rematch? Rematch.",
      bronze: "Good reps! Next set's ours.",
      none: 'Hey. We lost a point, not the set. Again?',
    },
  },
  perfusion: {
    'piggy-2': {
      gold: 'Clinical success. Perfusion maintained. Patriot.',
      silver: 'Rhythm stable. Based.',
      bronze: 'Vitals acceptable. More reps. Based effort.',
      none: 'Mildly ischemic performance. Showing up was still based.',
    },
  },
  debug: {
    'piggy-3': {
      gold: 'Build passed! Okay, we should frame this terminal.',
      silver: "Okay, that's really good. Like, actually good.",
      bronze: "Some bugs survived. They'll be back. We'll be ready.",
      none: 'Okay, so bugs are hard. Best for what? Practice, basically.',
    },
  },
  petals: {},
  petals_any: {
    'piggy-1': {
      gold: 'Petal MVP! Did you SEE that dive? Let’s goooo!',
      silver: 'Great catching, teammate! Squirrels: 0, us: a lot.',
      bronze: 'Solid haul! Next round I go full libero.',
      none: 'The squirrels won this rally. Not the match!',
    },
    'piggy-2': {
      gold: 'Petal capture rate: excellent. Based.',
      silver: 'Good hand-eye coordination. Hoof-eye. Based.',
      bronze: 'Adequate petals. The squirrels are a public health issue.',
      none: 'A squirrel assaulted me with an acorn. Still based outing.',
    },
    'piggy-3': {
      gold: 'Okay, I caught so many. I counted. Loosely. It was a lot.',
      silver: "That was fun! Can we track the petal paths? ...Later.",
      bronze: 'Okay, petals are faster than they look. Basically wind physics.',
      none: 'The squirrel had perfect aim. Honestly impressive.',
    },
  },
};

export function resultLine(id: MinigameId, pig: PigId, medal: Medal): string {
  const bank = id === 'petals' ? RESULT_LINES.petals_any : RESULT_LINES[id];
  return bank[pig]?.[medal] ?? RESULT_LINES.petals_any[pig]?.[medal] ?? '';
}
