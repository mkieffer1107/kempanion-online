// Welcome-back letter (§14: after > 2 h away each pig reports what he did, in his voice).
import type { NeedId, PigId, SaveData } from '../types';
import { NEED_IDS, PIG_IDS } from '../types';
import { SIM } from './balance';
import { DIARY, PARTY_LINES, type DiaryEntry } from './lines';
import { rngFor, shuffle } from './rng';
import type { AwayRecord } from './sim';
import { delFlag, json } from './state';

export interface LetterEntry {
  pig: PigId;
  /** "practiced jump serves at the sand courts." (follows the pig's name) */
  did: string;
  /** What he says about it. */
  line: string;
  /** Need changes while you were away (companion only; rounded, non-zero). */
  deltas: { need: NeedId; amount: number }[];
}

export interface WelcomeBackLetter {
  from: number;
  to: number;
  hours: number;
  minutes: number;
  /** Away > 72 h: welcome-back party (+100 acorns, needs topped up). */
  party: boolean;
  money: number;
  entries: LetterEntry[];
}

function spansNight(from: number, to: number): boolean {
  if (to - from >= 12 * 3_600_000) return true;
  for (let t = from; t <= to; t += 30 * 60_000) {
    const h = new Date(t).getHours();
    if (h >= 1 && h < 5) return true;
  }
  return false;
}

function pickEntry(pig: PigId, rec: AwayRecord): DiaryEntry {
  const night = spansNight(rec.from, rec.to);
  const pool = DIARY[pig].filter((e) => !e.when || (e.when === 'night') === night);
  return shuffle(rngFor('letter', pig, rec.from, rec.to), pool.length ? pool : DIARY[pig])[0];
}

/**
 * The letter for the last absence of ≥ 2 h (recorded by advance()), or null. Pure read;
 * call dismissWelcomeBack() once the player closes it.
 */
export function welcomeBack(save: SaveData, _now?: number): WelcomeBackLetter | null {
  const rec = json<AwayRecord>(save, 'pet.away');
  if (!rec || !(rec.to - rec.from >= SIM.letterAwayMs)) return null;
  const mins = Math.floor((rec.to - rec.from) / 60_000);
  const entries: LetterEntry[] = PIG_IDS.map((pig) => {
    const e = rec.party ? { did: 'threw you a welcome-back party.', line: PARTY_LINES[pig] } : pickEntry(pig, rec);
    const deltas = pig === rec.pig
      ? NEED_IDS.map((need) => ({ need, amount: rec.deltas[need] ?? 0 })).filter((d) => d.amount !== 0)
      : [];
    return { pig, did: e.did, line: e.line, deltas };
  });
  if (rec.pig) entries.sort((a, b) => (a.pig === rec.pig ? -1 : b.pig === rec.pig ? 1 : 0));
  return {
    from: rec.from, to: rec.to, hours: Math.floor(mins / 60), minutes: mins % 60, party: rec.party,
    money: rec.party ? SIM.welcomeBackMoney : 0, entries,
  };
}

export function dismissWelcomeBack(save: SaveData): void {
  delFlag(save, 'pet.away');
}
