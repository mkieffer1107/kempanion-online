// Pure helpers for the KempaPager hub (no runes, so they can be unit-tested).
import type { AnimId, CareAction, LocationId, NeedId, Needs, PigId, PigState, SfxId, SongId } from '../../types';
import { NEED_IDS } from '../../types';
import type { IdleKind } from '../../ai/heuristic';
import type { BurstKind, DropKind } from '../../engine/stage';
import { LOCATIONS } from '../../content/locations';

/** Below this a need shows its status clip / lights its LCD key (GAME_DESIGN §6 "needs you"). */
export const LOW = 30;
/** The attention light (design-ux §4.5): any need under 25, or sick. */
export const ATTENTION = 25;

export function lowestNeed(needs: Needs): { need: NeedId; value: number } {
  let need: NeedId = 'hunger';
  for (const n of NEED_IDS) if (needs[n] < needs[need]) need = n;
  return { need, value: needs[need] };
}

/** Status clip mixed into the idle picker for low needs (hunger alternates hungry/thirsty by minute). */
export function statusClip(p: PigState, minute: number): AnimId | null {
  if (p.sick) return 'sick';
  const { need, value } = lowestNeed(p.needs);
  if (value >= LOW) return null;
  switch (need) {
    case 'hunger': return minute % 2 === 0 ? 'hungry' : 'thirsty';
    case 'energy': return 'yawn';
    case 'hygiene': return 'dirty';
    case 'fun': return 'bored';
  }
}

/** What the pig mumbles about when idle. */
export function idleKind(p: PigState, roll: number): IdleKind {
  if (p.asleep) return 'sleepy';
  if (p.sick) return 'sick';
  const { need, value } = lowestNeed(p.needs);
  if (value < LOW) return ({ hunger: 'hungry', energy: 'tired', hygiene: 'dirty', fun: 'bored' } as const)[need];
  const avg = NEED_IDS.reduce((s, n) => s + p.needs[n], 0) / NEED_IDS.length;
  if (avg >= 80 && roll < 0.35) return 'happy';
  return 'random';
}

export function needsAttention(p: PigState): boolean {
  return p.sick || NEED_IDS.some((n) => p.needs[n] < ATTENTION);
}

/** Hub music: the place's song, home at night, a lullaby while asleep. */
export function hubSong(loc: LocationId, asleep: boolean, night: boolean): SongId {
  if (asleep) return 'sleep';
  if (loc === 'dorm') return night ? 'night' : 'dorm';
  return LOCATIONS[loc]?.song ?? 'campus_day';
}

/** Default clip and sfx when the pet module leaves them out. */
export const ACTION_ANIM: Partial<Record<CareAction, AnimId>> = {
  feed: 'eat', clean: 'bath', play: 'play_ball', pet: 'pet_reaction', sleep: 'yawn', wake: 'wake_up',
  medicine: 'drink', gift: 'happy', tidy: 'happy',
};
export const ACTION_SFX: Partial<Record<CareAction, SfxId>> = {
  feed: 'eat', clean: 'bath', play: 'ball_hit', pet: 'pet', sleep: 'zzz', wake: 'alarm', medicine: 'medicine',
  gift: 'gift', tidy: 'tidy',
};
export const ACTION_IDLE: Partial<Record<CareAction, IdleKind>> = {
  feed: 'fed', clean: 'cleaned', pet: 'petted', wake: 'woke', play: 'happy', gift: 'happy', tidy: 'happy',
};

export const NEED_SHORT: Record<NeedId, string> = { hunger: 'TUMMY', energy: 'ENERGY', hygiene: 'CLEAN', fun: 'FUN' };
export const NEED_COLOR: Record<NeedId, string> = { hunger: '#ffb39e', energy: '#ffd25a', hygiene: '#7fd6e8', fun: '#b7e86c' };

export interface Pop { id: number; text: string; color: string; x: number; y: number; delay: number }

/** Number pops for a care result ("+20 FUN", "+4 ♥", "+5 acorns"), stacked upward from (x, y) %. */
export function popsFor(
  r: { needsDelta?: Partial<Needs>; bondDelta?: number; moneyDelta?: number },
  x: number,
  y: number,
  nextId: () => number,
): Pop[] {
  const out: Pop[] = [];
  const add = (text: string, color: string) => {
    const i = out.length;
    out.push({ id: nextId(), text, color, x: x + (i % 2 ? 6 : -6), y: y - i * 7, delay: i * 120 });
  };
  for (const n of NEED_IDS) {
    const d = Math.round(r.needsDelta?.[n] ?? 0);
    if (d) add(`${d > 0 ? '+' : ''}${d} ${NEED_SHORT[n]}`, d > 0 ? NEED_COLOR[n] : '#c9b8ff');
  }
  if (r.bondDelta && r.bondDelta > 0) add(`+${Math.round(r.bondDelta)} ♥`, '#ff8fb1');
  if (r.moneyDelta && r.moneyDelta > 0) add(`+${Math.round(r.moneyDelta)} acorns`, '#ffd25a');
  return out;
}

/** "5 h 12 m" */
export function awayText(hours: number, minutes: number): string {
  if (hours <= 0) return `${minutes} m`;
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  return `${hours} h${minutes ? ` ${minutes} m` : ''}`;
}

/**
 * Seeded crumb positions (% of the stage) so they don't jump around between renders. They lie on the floor
 * around the actors' ground line (logical px of 270).
 */
export function crumbSpots(n: number, seed: number, groundY = GROUND_T): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0xffffffff);
  for (let i = 0; i < n; i++) out.push({ x: 14 + rnd() * 72, y: ((groundY - 20 + rnd() * 22) / 270) * 100 });
  return out;
}

// ───────────────────────── ground line ─────────────────────────

/** Ground (logical feet line) when the text box is outside the stage (T layout): near the bottom. */
export const GROUND_T = 252;
/** W/S fallback when the text box can't be measured: the whole pig stands above a 2-line box. */
export const GROUND_WS = 205;
/** Highest the ground may go (a huge text size on a short phone still leaves him room). */
export const GROUND_MIN = 150;

/** Feet line from the top edge of the VN box overlaying the stage (logical px; null = not measurable). */
export function groundFromBox(boxTop: number | null, margin = 2): number {
  if (boxTop === null || !Number.isFinite(boxTop)) return GROUND_WS;
  return Math.round(Math.min(GROUND_T, Math.max(GROUND_MIN, boxTop - margin)));
}

// ───────────────────────── pick up & toss ─────────────────────────

/** Movement (CSS px) that turns a press on the pig into a pick-up; less is a tap (= pet). */
export const DRAG_PX = 6;
/** Release speed (logical px/s) that sounds like a throw. */
export const WHOOSH_SPEED = 260;
/** Impacts (logical px/s) that thud: floor, walls / stage top. Matches the 'hard' landing threshold. */
export const HARD_THUD = 330;
export const HARD_BUMP = 300;
/** Picking him up: +2 FUN, at most once every 2 minutes. */
export const LIFT_FUN = 2;
export const LIFT_FUN_COOLDOWN_MS = 2 * 60_000;
/** More than 5 tosses in 20 s and he pouts (no penalty). */
export const TOSS_LIMIT = 5;
export const TOSS_WINDOW_MS = 20_000;

/** Is the pick-up FUN bonus due? (A clock that went backwards counts as due.) */
export function liftFunDue(lastAt: number, now: number): boolean {
  return !(lastAt > 0) || now < lastAt || now - lastAt >= LIFT_FUN_COOLDOWN_MS;
}

/** Record a toss at `now` (mutates `list`, dropping old ones); true when that makes it spam. */
export function countToss(list: number[], now: number): boolean {
  list.push(now);
  while (list.length && (now - list[0] > TOSS_WINDOW_MS || list[0] > now)) list.shift();
  return list.length > TOSS_LIMIT;
}

export interface ReactionStep { anim: AnimId; sfx?: SfxId }
export interface LandingReaction { burst?: BurstKind; sfx?: SfxId; steps: ReactionStep[] }

/** What he does after landing: put down gently → happy, short drop → surprised, hard → tumble + laugh, pop → celebrate. */
export function landingReaction(kind: DropKind): LandingReaction {
  switch (kind) {
    case 'soft': return { burst: 'hearts', sfx: 'oink_happy', steps: [{ anim: 'happy' }] };
    case 'drop': return { burst: 'sweat', steps: [{ anim: 'surprised' }] };
    case 'hard': return { steps: [{ anim: 'tumble', sfx: 'shake' }, { anim: 'laugh', sfx: 'oink_happy' }] };
    case 'pop': return { burst: 'sparkles', sfx: 'oink_happy', steps: [{ anim: 'celebrate' }, { anim: 'happy' }] };
  }
}

/** Each pig's "win" clip in his alternate outfit (stands in for celebrate). */
export const ALT_WIN: Record<PigId, AnimId> = { 'piggy-1': 'volleyball_win', 'piggy-2': 'clinical_success', 'piggy-3': 'build_success' };

/**
 * Alternate outfits only ship a few clips: map a reaction to one the outfit has (so he doesn't flash back
 * into everyday clothes on every landing). Returns the clip itself when the outfit has it, else null if
 * nothing fits (the caller may borrow the everyday clip).
 */
export function outfitReaction(anim: AnimId, has: (a: AnimId) => boolean, win: AnimId): AnimId | null {
  if (has(anim)) return anim;
  const options: AnimId[] =
    anim === 'celebrate' ? [win, 'jump', 'wave']
    : anim === 'happy' || anim === 'laugh' ? ['wave', win]
    : anim === 'surprised' || anim === 'tumble' ? ['jump']
    : [];
  for (const o of options) if (has(o)) return o;
  return null;
}

/** He pouts after being tossed around too much (3 lines each, in voice). */
export const POUT_LINES: Record<PigId, readonly string[]> = {
  'piggy-1': [
    "Hey! I'm not a volleyball! …Okay, that was a nice set though.",
    "Six tosses in twenty seconds. I'm tracking this. Time-out, teammate!",
    'Whoa, whoa — net violation! I need a sub. Put me down a sec!',
  ],
  'piggy-2': [
    'That was a significant vestibular event. Not based.',
    'My inner ear would like to file an incident report.',
    'Repeated acceleration-deceleration. That is how concussions happen. Not based.',
  ],
  'piggy-3': [
    "Okay— wait. Gravity is real. I'm, uh, reconsidering the experiment.",
    "Actually, can we pause? I think we've collected enough data on falling.",
    'So I was thinking… what if the ground just stayed where it is for a bit?',
  ],
};

/** Giggles while he is tickled in the air. */
export const TICKLE_LINES: Record<PigId, readonly string[]> = {
  'piggy-1': ['Hahaha— no fair, that’s a foul!', 'Stop— hehe— I’m ticklish! Time-out!'],
  'piggy-2': ['Hah— that is— not a validated— exam. Hehe.', 'Pfft— cutaneous stimulus— okay— okay!'],
  'piggy-3': ['Hehe— wait— okay, ticklish. Noted.', 'Pfft— that’s, haha, that’s not a fair test!'],
};

