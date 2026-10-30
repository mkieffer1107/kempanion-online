// Real-time pet simulation (GAME_DESIGN.md §6). Pure functions over SaveData; only the companion's
// needs decay, the other two pigs take care of themselves and hold comfortable values.
import type { MoodTier, NeedId, Needs, PigId, PigState, SaveData, Settings } from '../types';
import { NEED_IDS, PIG_IDS } from '../types';
import { isBedtime } from '../content/locations';
import { DECAY_PER_HOUR, HEALTH, MOOD_DISTRESS, MOOD_TIERS, MOOD_WEIGHTS, PIG_DECAY, SIM, START_MONEY, THRESH, clamp } from './balance';
import { bondLevel } from './bond';
import { announceWant, type Want } from './wants';
import { bump, delFlag, gentle, num, pk, setFlag, setJson } from './state';

export type SimEvent =
  | { kind: 'sick' | 'recovered' | 'woke' | 'fell_asleep' | 'mess'; pig: PigId }
  | { kind: 'need_low'; pig: PigId; need: NeedId }
  | { kind: 'away'; hours: number }
  /** A new thought-bubble want became visible. */
  | { kind: 'want'; pig: PigId; want: Want }
  /** Away > 72 h: needs topped up, +100 acorns, `welcome_party_ready` flag set for the party scene. */
  | { kind: 'welcome_party'; hours: number; money: number };

export interface AdvanceOptions {
  /** Override presence detection (tab visible + input within 10 min). Default: gap ≤ 10 min. */
  present?: boolean;
}

export function defaultSettings(): Settings {
  return {
    textSpeed: 40, autoDelay: 1.6, masterVolume: 0.8, bgmVolume: 0.85, sfxVolume: 0.7, voiceVolume: 0.65,
    reduceMotion: false, crt: false, aiMode: 'heuristic', aiModel: 'lfm', aiAutoload: true, echoPlayer: true,
  };
}

export function defaultPigState(_pig: PigId, now: number): PigState {
  return {
    needs: { hunger: 80, energy: 80, hygiene: 80, fun: 80 }, health: 100, sick: false, bond: 0, asleep: false,
    outfit: 'everyday', mess: 0, lastFedAt: now, lastPlayedAt: now, lastTalkedAt: now, lastPettedAt: now,
    today: { date: '', talks: 0, gifts: 0, pets: 0, minigames: 0 },
  };
}

export function newSave(now: number, playerName = ''): SaveData {
  return {
    version: 1, createdAt: now, lastTick: now, player: { name: playerName }, companion: null,
    pigs: { 'piggy-1': defaultPigState('piggy-1', now), 'piggy-2': defaultPigState('piggy-2', now), 'piggy-3': defaultPigState('piggy-3', now) },
    inventory: {}, money: START_MONEY, location: 'dorm', flags: {}, seenScenes: [], album: [], achievements: [], counters: {},
    chatLog: { 'piggy-1': [], 'piggy-2': [], 'piggy-3': [] }, memories: { 'piggy-1': [], 'piggy-2': [], 'piggy-3': [] },
    lastDaily: '', streak: 0, settings: defaultSettings(),
  };
}

const fin = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Repair missing/corrupt numeric fields (old or hand-edited saves) in place. */
export function repairSave(save: SaveData, now: number): void {
  if (!save.flags) save.flags = {};
  if (!save.counters) save.counters = {};
  if (!save.inventory) save.inventory = {};
  save.money = Math.max(0, fin(save.money, START_MONEY));
  save.lastTick = fin(save.lastTick, now);
  for (const pig of PIG_IDS) {
    const p = (save.pigs[pig] ??= defaultPigState(pig, now));
    if (!p.needs) p.needs = { hunger: 80, energy: 80, hygiene: 80, fun: 80 };
    for (const n of NEED_IDS) p.needs[n] = clamp(fin(p.needs[n], 80), 0, 100);
    p.health = clamp(fin(p.health, 100), 0, 100);
    p.bond = Math.max(0, fin(p.bond, 0));
    p.mess = clamp(Math.round(fin(p.mess, 0)), 0, SIM.messMax);
    p.sick = !!p.sick;
    p.asleep = !!p.asleep;
    if (!p.today) p.today = { date: '', talks: 0, gifts: 0, pets: 0, minigames: 0 };
  }
}

/** Is the pig sleeping right now? The companion follows the sim state; the others follow their bedtimes. */
export function isAsleep(save: SaveData, pig: PigId, now: number): boolean {
  if (save.companion === pig) return save.pigs[pig].asleep;
  return isBedtime(pig, new Date(now));
}

/** True during the pig's bedtime or within the tuck-in window before it. */
export function nearBedtime(pig: PigId, now: number, windowMs: number = SIM.tuckWindowMs): boolean {
  return isBedtime(pig, new Date(now)) || isBedtime(pig, new Date(now + windowMs));
}

export function moodScore(p: PigState, pig?: PigId): number {
  const w: Needs = pig ? MOOD_WEIGHTS[pig] : { hunger: 0.25, energy: 0.25, hygiene: 0.25, fun: 0.25 };
  let score = 0;
  for (const n of NEED_IDS) {
    const v = p.needs[n];
    score += w[n] * v;
    score -= Math.min(15, MOOD_DISTRESS.perPoint * Math.max(0, MOOD_DISTRESS.below - v));
  }
  return score + bondLevel(p.bond);
}

/** Mood tier (sick/asleep override the visuals in the UI, not the tier). */
export function moodOf(p: PigState, pig?: PigId): MoodTier {
  const s = moodScore(p, pig);
  for (const [tier, min] of MOOD_TIERS) if (s >= min) return tier;
  return 'awful';
}

export type NeedLevel = 'fine' | 'mild' | 'needs_you' | 'urgent';

/** §6 thresholds: ≥60 fine · 30–59 mild · 15–29 needs you · <15 urgent. */
export function needLevel(v: number): NeedLevel {
  if (v >= THRESH.fine) return 'fine';
  if (v >= THRESH.mild) return 'mild';
  if (v >= THRESH.needsYou) return 'needs_you';
  return 'urgent';
}

export type CureHow = 'medicine' | 'pharmacy' | 'rounds' | 'overnight' | 'timeout';

/** End an illness. Player-made cures count toward House Call. Never touches bond. */
export function cure(save: SaveData, pig: PigId, how: CureHow): boolean {
  const p = save.pigs[pig];
  if (!p.sick) return false;
  p.sick = false;
  p.health = Math.max(p.health, HEALTH.curedTo);
  delFlag(save, pk(pig, 'sickAt'));
  delFlag(save, pk(pig, 'rounds'));
  if (how === 'medicine' || how === 'pharmacy' || how === 'rounds') bump(save, 'cures');
  return true;
}

export function fallAsleep(save: SaveData, pig: PigId, at: number): void {
  const p = save.pigs[pig];
  p.asleep = true;
  setFlag(save, pk(pig, 'sleptAt'), at);
  delFlag(save, pk(pig, 'awakeUntil'));
}

export function startNap(save: SaveData, pig: PigId, at: number): void {
  fallAsleep(save, pig, at);
  setFlag(save, pk(pig, 'napUntil'), at + SIM.napMs);
  bump(save, 'naps');
}

/** Wake up; a real night's sleep with a fed tummy cures an illness. Returns true if it cured. */
export function wakeUp(save: SaveData, pig: PigId, at: number): boolean {
  const p = save.pigs[pig];
  const slept = at - num(save, pk(pig, 'sleptAt'), at);
  const napping = num(save, pk(pig, 'napUntil')) > 0;
  p.asleep = false;
  delFlag(save, pk(pig, 'napUntil'));
  if (p.sick && !napping && slept >= HEALTH.overnightMs && p.needs.hunger >= HEALTH.overnightHunger) return cure(save, pig, 'overnight');
  return false;
}

function othersStep(save: SaveData, pig: PigId, te: number, dtH: number): void {
  const p = save.pigs[pig];
  for (const n of NEED_IDS) {
    if (p.needs[n] < SIM.othersComfort) p.needs[n] = Math.min(SIM.othersComfort, p.needs[n] + SIM.othersDriftPerHour * dtH);
  }
  p.health = 100;
  if (p.sick) cure(save, pig, 'timeout');
  p.mess = 0;
  p.asleep = isBedtime(pig, new Date(te));
}

function decay(save: SaveData, pig: PigId, te: number, dtH: number, present: boolean): void {
  const p = save.pigs[pig];
  const mult = present ? 1 : SIM.offlineMult;
  const floor = present ? 0 : SIM.offlineFloor;
  const napping = p.asleep && num(save, pk(pig, 'napUntil')) > 0;
  for (const n of NEED_IDS) {
    const v = p.needs[n];
    if (n === 'energy' && p.asleep) {
      const rate = napping ? SIM.napEnergyPerHour : SIM.sleepEnergyPerHour;
      const cap = napping ? Math.max(v, SIM.napEnergyCap) : 100;
      p.needs.energy = Math.min(cap, v + rate * dtH);
      continue;
    }
    let rate = DECAY_PER_HOUR[n] * PIG_DECAY[pig][n] * mult;
    if (p.asleep) rate *= SIM.asleepMult;
    if (n === 'energy' && p.sick) rate *= HEALTH.sickEnergyMult;
    if (n === 'hygiene') {
      rate *= 1 + SIM.messHygieneMult * p.mess;
      if (num(save, pk(pig, 'freshUntil')) > te) rate *= SIM.freshHygieneMult;
    }
    const next = v - rate * dtH;
    p.needs[n] = clamp(next >= floor ? next : Math.min(v, floor), 0, 100);
  }
}

function health(save: SaveData, pig: PigId, te: number, dtH: number, present: boolean, events: SimEvent[]): void {
  const p = save.pigs[pig];
  const low = NEED_IDS.filter((n) => p.needs[n] < HEALTH.lowNeed).length;
  // Being away never hurts: health only drops while you're here to notice.
  if (low > 0) p.health -= present ? HEALTH.lossPerLowNeedPerHour * low * dtH : 0;
  else if (NEED_IDS.every((n) => p.needs[n] >= HEALTH.allAbove)) p.health += HEALTH.gainPerHour * dtH;
  p.health = clamp(p.health, 0, 100);
  if (gentle(save)) {
    if (cure(save, pig, 'timeout')) events.push({ kind: 'recovered', pig });
    return;
  }
  if (!p.sick && p.health < HEALTH.sickBelow) {
    p.sick = true;
    setFlag(save, pk(pig, 'sickAt'), te);
    delFlag(save, pk(pig, 'rounds'));
    bump(save, 'illnesses');
    events.push({ kind: 'sick', pig });
  } else if (p.sick && te - num(save, pk(pig, 'sickAt'), te) >= HEALTH.maxIllnessMs) {
    if (cure(save, pig, 'timeout')) events.push({ kind: 'recovered', pig });
  }
}

function sleepTransitions(save: SaveData, pig: PigId, te: number, present: boolean, events: SimEvent[]): void {
  const p = save.pigs[pig];
  const bed = isBedtime(pig, new Date(te));
  if (p.asleep) {
    const napUntil = num(save, pk(pig, 'napUntil'));
    if (napUntil > 0) {
      if (te < napUntil) return;
      if (bed) {
        delFlag(save, pk(pig, 'napUntil')); // the nap rolls into the night's sleep
        return;
      }
    } else if (nearBedtime(pig, te)) return; // night sleep (tucked in early counts too) until wake time
    if (wakeUp(save, pig, te)) events.push({ kind: 'recovered', pig });
    events.push({ kind: 'woke', pig });
    return;
  }
  if (bed && te >= num(save, pk(pig, 'awakeUntil'))) {
    fallAsleep(save, pig, te);
    events.push({ kind: 'fell_asleep', pig });
  } else if (!bed && present && p.needs.energy < SIM.autoNapBelow) {
    startNap(save, pig, te);
    events.push({ kind: 'fell_asleep', pig });
  }
}

function companionStep(save: SaveData, pig: PigId, t: number, dt: number, present: boolean, events: SimEvent[]): void {
  const p = save.pigs[pig];
  const te = t + dt;
  const dtH = dt / 3_600_000;
  const frozen = !present && gentle(save);
  if (!frozen) {
    const before = { ...p.needs };
    decay(save, pig, te, dtH, present);
    for (const n of NEED_IDS) if (before[n] >= THRESH.mild && p.needs[n] < THRESH.mild) events.push({ kind: 'need_low', pig, need: n });
    if (!p.asleep) {
      let clock = num(save, 'pet.messClock') + dt;
      if (clock >= SIM.messEveryMs) {
        clock -= SIM.messEveryMs;
        if (p.mess < SIM.messMax) {
          p.mess += 1;
          events.push({ kind: 'mess', pig });
        }
      }
      setFlag(save, 'pet.messClock', clock);
    }
    health(save, pig, te, dtH, present, events);
  }
  sleepTransitions(save, pig, te, present, events);
}

interface Snapshot { asleep: boolean; sick: boolean; mess: number; needs: Needs }

function dedupe(events: SimEvent[]): SimEvent[] {
  const seen = new Set<string>();
  const out: SimEvent[] = [];
  for (const e of events) {
    const k = JSON.stringify([e.kind, 'pig' in e ? e.pig : '', 'need' in e ? e.need : '']);
    if (seen.has(k) && e.kind !== 'fell_asleep' && e.kind !== 'woke') continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

/** Offline catch-up reports only what changed overall, not every intermediate transition. */
function summarize(save: SaveData, pig: PigId, start: Snapshot): SimEvent[] {
  const p = save.pigs[pig];
  const out: SimEvent[] = [];
  if (start.sick !== p.sick) out.push({ kind: p.sick ? 'sick' : 'recovered', pig });
  if (start.asleep !== p.asleep) out.push({ kind: p.asleep ? 'fell_asleep' : 'woke', pig });
  if (p.mess > start.mess) out.push({ kind: 'mess', pig });
  for (const n of NEED_IDS) if (start.needs[n] >= THRESH.mild && p.needs[n] < THRESH.mild) out.push({ kind: 'need_low', pig, need: n });
  return out;
}

export interface AwayRecord {
  from: number;
  to: number;
  party: boolean;
  pig: PigId | null;
  deltas: Partial<Needs>;
}

function recordAway(save: SaveData, from: number, to: number, party: boolean, start: Snapshot | null): void {
  const pig = save.companion;
  const deltas: Partial<Needs> = {};
  if (pig && start) for (const n of NEED_IDS) deltas[n] = Math.round(save.pigs[pig].needs[n] - start.needs[n]);
  const rec: AwayRecord = { from, to, party, pig, deltas };
  setJson(save, 'pet.away', rec);
}

function welcomeParty(save: SaveData, now: number, start: Snapshot | null): SimEvent[] {
  for (const pig of PIG_IDS) {
    const p = save.pigs[pig];
    for (const n of NEED_IDS) p.needs[n] = Math.max(p.needs[n], SIM.welcomeBackMin);
    cure(save, pig, 'timeout');
    delFlag(save, pk(pig, 'napUntil'));
    delFlag(save, pk(pig, 'awakeUntil'));
    p.asleep = isBedtime(pig, new Date(now));
    if (p.asleep) setFlag(save, pk(pig, 'sleptAt'), now);
  }
  save.money += SIM.welcomeBackMoney;
  setFlag(save, 'welcome_party_ready', true);
  bump(save, 'welcome_parties');
  const hours = Math.floor((now - save.lastTick) / 3_600_000);
  recordAway(save, save.lastTick, now, true, start);
  save.lastTick = now;
  return [{ kind: 'away', hours }, { kind: 'welcome_party', hours, money: SIM.welcomeBackMoney }];
}

/**
 * Advance real-time decay from save.lastTick to `now` in 15-minute steps (catch-up capped at 72 h;
 * longer absences run the welcome-back reset instead). Mutates save and returns what happened.
 * Negative gaps (clock moved back) just re-anchor lastTick.
 */
export function advance(save: SaveData, now: number, opts: AdvanceOptions = {}): SimEvent[] {
  if (!Number.isFinite(now)) return [];
  repairSave(save, now);
  const last = save.lastTick;
  const gap = now - last;
  if (gap <= 0) {
    if (gap < 0) save.lastTick = now;
    return [];
  }
  const present = opts.present ?? gap <= SIM.presentGapMs;
  const comp = save.companion;
  const start: Snapshot | null = comp
    ? { asleep: save.pigs[comp].asleep, sick: save.pigs[comp].sick, mess: save.pigs[comp].mess, needs: { ...save.pigs[comp].needs } }
    : null;

  if (gap > SIM.catchUpCapMs) return welcomeParty(save, now, start);

  let events: SimEvent[] = [];
  for (let t = last; t < now; ) {
    const dt = Math.min(SIM.stepMs, now - t);
    for (const pig of PIG_IDS) {
      if (pig === comp) companionStep(save, pig, t, dt, present, events);
      else othersStep(save, pig, t + dt, dt / 3_600_000);
    }
    t += dt;
  }
  save.lastTick = now;
  if (comp && start && !present) events = summarize(save, comp, start);
  if (gap >= SIM.letterAwayMs) {
    recordAway(save, last, now, false, start);
    events.unshift({ kind: 'away', hours: Math.floor(gap / 3_600_000) });
  }
  const want = announceWant(save, now);
  if (want && comp) events.push({ kind: 'want', pig: comp, want });
  return dedupe(events);
}
