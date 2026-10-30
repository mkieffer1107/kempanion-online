// Small world tables the Heuristic Brain needs: spoken place names, homes, nicknames, tastes, topic labels.
// Tastes come from the pet sim's item table (src/lib/pet/items.ts), so chat reactions agree with feeding and gifts.
import type { LocationId, PigId } from '../../types';
import type { Intent } from './intents';
import { tasteOf } from '../../pet/items';
import type { Taste } from '../../pet/balance';

export const PIG_NAME: Record<PigId, string> = { 'piggy-1': 'Piggy 1', 'piggy-2': 'Piggy 2', 'piggy-3': 'Piggy 3' };

/** How a pig refers to a place mid-sentence. */
export const PLACE_NAME: Record<LocationId, string> = {
  dorm: 'Sakura House',
  century_tower: 'Century Tower',
  plaza: 'the Plaza',
  marston: 'Marston',
  malachowsky: 'Malachowsky',
  physics: 'the Physics Building',
  communicore: 'the Communicore',
  anatomy_lab: 'the anatomy lab',
  shands: 'Shands',
  stadium: 'the Swamp',
  lake_alice: 'Lake Alice',
  reitz: 'the Reitz',
  volleyball_courts: 'the sand courts',
  midtown: 'Midtown',
};

export const HOME_NAME: Record<PigId, string> = {
  'piggy-1': 'Malachowsky',
  'piggy-2': 'the Communicore',
  'piggy-3': 'the Physics Building',
};

/** What a pig calls the player before he uses their name (hearts 0) or when no name is set. */
export const NICKNAME: Record<PigId, string> = { 'piggy-1': 'teammate', 'piggy-2': 'intern', 'piggy-3': 'friend' };

export const OWN_PASSION: Record<PigId, Intent> = {
  'piggy-1': 'passion_p1',
  'piggy-2': 'passion_p2',
  'piggy-3': 'passion_p3',
};

export type { Taste };

/** "Betsubara": a full pig still has room for one of these. */
export const DESSERTS: ReadonlySet<string> = new Set([
  'melonpan', 'apple_pie', 'key_lime_pie', 'pastelito', 'sakura_dango', 'vegan_ice_cream',
]);

/** How a pig feels about an item: the pet sim's item table is the single source (food and gifts alike). */
export function tasteFor(pig: PigId, itemId: string): Taste {
  return tasteOf(pig, itemId);
}

/** How a pig refers back to an earlier chat topic ("I kept thinking about {last}"). */
export const TOPIC_LABEL: Readonly<Record<string, string>> = {
  'passion_p1:volleyball': 'volleyball', 'passion_p1:cs': 'coding', 'passion_p1:stats': 'stats',
  'passion_p1:spreadsheet': 'spreadsheets', 'passion_p1:gatorade': 'Gatorade', 'passion_p1:hackathon': 'the hackathon',
  passion_p1: 'volleyball',
  'passion_p2:neurosurgery': 'neurosurgery', 'passion_p2:ischemia': 'ischemia', 'passion_p2:perfusion': 'perfusion',
  'passion_p2:csf': 'CSF', 'passion_p2:spine': 'the spinal cord', 'passion_p2:electrodes': 'brain chips',
  'passion_p2:pig_models': 'the lab pigs', 'passion_p2:mri': 'MRIs', 'passion_p2:anatomy': 'the anatomy lab',
  'passion_p2:medschool': 'med school', passion_p2: 'perfusion',
  'passion_p3:codex': 'Codex', 'passion_p3:ai': 'AI models', 'passion_p3:opensource': 'open source',
  'passion_p3:hipergator': 'HiPerGator', 'passion_p3:signals': 'EEG signals', 'passion_p3:printing': '3D printing',
  'passion_p3:onepiece': 'One Piece', 'passion_p3:jojo': 'JoJo', 'passion_p3:anime': 'anime', 'passion_p3:ui': 'UI design',
  'passion_p3:building': 'building stuff', 'passion_p3:physics': 'physics', passion_p3: 'building stuff',
  ask_best: '“what\'s best”', study: 'studying', weather: 'the weather', gators_football: 'the Gators',
  go_gators: 'the Gator Chomp', bored: 'being bored', joke_request: 'jokes', ask_hobby: 'hobbies',
  ask_favorite_food: 'food', food_offer: 'snacks', hungry_talk: 'food', tired_talk: 'sleep', player_happy: 'your good news',
  ask_schedule: 'schedules', ask_major: 'majors',
};
