// Achievements (GAME_DESIGN.md §12), derived from counters/flags so they can be checked at any time.
import type { SaveData } from '../types';
import { PIG_IDS } from '../types';
import { bondLevel } from './bond';
import { EDIBLE_IDS } from './items';
import { bool, counter } from './state';
import type { Achievement } from './types';

interface AchievementDef extends Achievement {
  test: (save: SaveData) => boolean;
}

const hearts = (save: SaveData) => PIG_IDS.map((p) => bondLevel(save.pigs[p].bond));

/** An alternate outfit counts as unlocked if a pig wears it or the VN set an outfit flag. */
function anyOutfit(save: SaveData): boolean {
  if (PIG_IDS.some((p) => save.pigs[p].outfit && save.pigs[p].outfit !== 'everyday')) return true;
  if (counter(save, 'outfits_unlocked') > 0) return true;
  return Object.keys(save.flags).some((k) => /^(outfit|unlocked?_outfit|outfit_unlocked)[._:-]/.test(k) && !!save.flags[k]);
}

const DEFS: AchievementDef[] = [
  { id: 'lab_partners', title: 'Lab Partners', desc: 'Reach ♥2 with any pig.', icon: 'sakura_charm', test: (s) => hearts(s).some((h) => h >= 2) },
  { id: 'wardrobe_change', title: 'Wardrobe Change', desc: 'Unlock your first alternate outfit.', icon: 'knee_pad_tape', test: anyOutfit },
  { id: 'secret_menu', title: 'Secret Menu', desc: 'Discover all three secret favorites.', icon: 'sakura_dango', test: (s) => PIG_IDS.every((p) => bool(s, `pet.${p}.secret`)) },
  { id: 'legend_sakura', title: 'Legend of the Sakura', desc: 'Reach ♥10 with any pig.', icon: 'sakura_keychain', test: (s) => hearts(s).some((h) => h >= 10) },
  { id: 'kempanions_assemble', title: 'Kempanions Assemble', desc: 'Reach ♥10 with all three.', icon: 'kempapager', test: (s) => hearts(s).every((h) => h >= 10) },
  { id: 'patriot', title: 'Patriot', desc: 'Say "based" to Piggy 2.', icon: 'apple_pie', test: (s) => counter(s, 'said_based') > 0 || bool(s, 'p2_based_h1') || bool(s, 'p2_based_h6') },
  { id: 'best_for_what', title: 'Best For What?', desc: "Ask Piggy 3 what's best.", icon: 'cold_brew', test: (s) => counter(s, 'asked_best') > 0 },
  { id: 'set_spike', title: 'Set! Spike!', desc: 'Bump → set → spike call-and-response with Piggy 1.', icon: 'signed_volleyball', test: (s) => counter(s, 'set_spike') > 0 },
  { id: 'bat_signal', title: 'Bat Signal', desc: 'Visit Lake Alice at dusk.', icon: 'pin', test: (s) => counter(s, 'bat_signal') > 0 },
  { id: 'go_gators', title: 'Go Gators!', desc: 'Play on a game day.', icon: 'pennant', test: (s) => counter(s, 'gameday_days') > 0 },
  { id: 'early_rounds', title: 'Early Rounds', desc: 'Greet Piggy 2 before 06:00.', icon: 'cafecito', test: (s) => counter(s, 'early_rounds') > 0 },
  { id: 'lights_out', title: 'Lights Out', desc: 'Tuck in your Kempanion on 7 nights.', icon: 'stamp', test: (s) => counter(s, 'tuck_nights') >= 7 },
  { id: 'squeaky_clean', title: 'Squeaky Clean', desc: 'Give 10 baths.', icon: 'lavender_soap', test: (s) => counter(s, 'baths') >= 10 },
  { id: 'five_star_dining', title: 'Five-Star Dining', desc: 'Serve every food and drink on the menu.', icon: 'dining_tray', test: (s) => EDIBLE_IDS.every((id) => counter(s, `served.${id}`) > 0) },
  { id: 'house_call', title: 'House Call', desc: 'Cure 3 illnesses.', icon: 'cold_medicine', test: (s) => counter(s, 'cures') >= 3 },
  { id: 'rally_royalty', title: 'Rally Royalty', desc: 'Keep a 30-hit rally in Sakura Spike.', icon: 'medal_gold', test: (s) => counter(s, 'mg.volley.best_rally') >= 30 },
  { id: 'textbook_perfusion', title: 'Textbook Perfusion', desc: 'Finish Perfusion! at 100%.', icon: 'ecg', test: (s) => counter(s, 'mg.perfusion.textbook') > 0 },
  { id: 'zero_day_hunter', title: 'Zero-Day Hunter', desc: 'Bug Hunt: 10/10 with no hints.', icon: 'bug', test: (s) => counter(s, 'mg.debug.zero_day') > 0 },
  { id: 'petal_pusher', title: 'Petal Pusher', desc: 'Catch 150 petals in one Petal Catch.', icon: 'petal_gold', test: (s) => counter(s, 'mg.petals.best_petals') >= 150 },
  { id: 'triple_gold', title: 'Triple Gold', desc: 'Earn gold in 3 different mini-games.', icon: 'medal_gold', test: (s) => ['volley', 'perfusion', 'debug', 'petals'].filter((id) => bool(s, `pet.gold.${id}`)).length >= 3 },
];

export const ACHIEVEMENTS: Achievement[] = DEFS.map(({ id, title, desc, icon }) => ({ id, title, desc, icon }));

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Returns newly unlocked achievements and records them in save.achievements. */
export function checkAchievements(save: SaveData): Achievement[] {
  const out: Achievement[] = [];
  for (const def of DEFS) {
    if (save.achievements.includes(def.id)) continue;
    let ok = false;
    try {
      ok = def.test(save);
    } catch {
      ok = false;
    }
    if (!ok) continue;
    save.achievements.push(def.id);
    out.push({ id: def.id, title: def.title, desc: def.desc, icon: def.icon });
  }
  return out;
}
