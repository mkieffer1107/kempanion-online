// Each pig's "thing" (for the topic-match bond bonus) and fallback quick-reply chips, plus the gentle chips under a
// crisis or medical safety line (shared with heuristic/topics.ts). Pure module.
import type { ChatContext, ChatTurn, PigId } from '../types';
import { now } from '../state/clock';
import { CRISIS_REACH, isDistress, isMedicalAdvice } from './quirks';

const TOPIC: Record<PigId, RegExp> = {
  'piggy-1':
    /\b(volley\w*|serves?|serving|spikes?|setter|bump|digs?|blocks?|rally|rallies|practice|courts?|sand|outside hitter|team(mate)?s?|club|tournament|code|coding|program\w*|algorithm\w*|computer science|cs|hackathon|stats?|analytics|spreadsheet|malachowsky|gatorade|pub ?subs?|game dev)\b/i,
  // his residency too (a fourth-year resident on his research year): call shifts, the in-service exam, his grants;
  // not a resident advisor, Resident Evil or the resident in your dorm (as in heuristic/entities.ts)
  'piggy-2':
    /\b(neuro\w*|brains?|spines?|spinal|cord|surg\w*|perfusion|ischemi\w*|csf|cerebrospinal|electrodes?|chips?|mri|med school|medicine|medical|anatomy|shands|communicore|rounds|scrubs|hospital|research\w*|research year|residen(?:cy|ts?)(?! (?:evil|advis[eo]rs?|assistants?|directors?|life|halls?|experts?|(?:in|on|at|of) (?:my|our|the|his|her|their|this|that) (?:dorm|hall|building|floor|apartment|house)s?)\b)|doctors?|in[- ]?service|call (?:nights?|shifts?)|grants?|lab pigs?|based|patriot|mcknight)\b/i,
  // X too (never "x ray"; "Twitter" counts: he'll correct it, but it's his subject), math (he used to tutor it), robots,
  // his drink; his little 3D prints still count. Raw text, so "X.com" and "on X" match.
  'piggy-3':
    /\b(codex|code|coding|build\w*|ai|models?|agents?|eeg|ecg|signals?|3d print\w*|printers?|filament|hipergator|gpus?|physics|simulations?|one piece|jojo|anime|interfaces?|ui|design|open source|datasets?|projects?|apps?|prototype|x\.com|x dot com|on x|twitter|tweets?|timeline|doom ?scroll\w*|math\w*|tutor\w*|fractions?|llms?|rlhf|rlvr|jev|fhir|robots?|robotics|red ?bull|marie curie)\b/i,
};

/** Did the player bring up this pig's favorite subjects? */
export function topicMatch(pig: PigId, text: string): boolean {
  return TOPIC[pig].test(text ?? '');
}

const PASSION: Record<PigId, readonly string[]> = {
  'piggy-1': ['How was practice?', 'Teach me to serve?', 'What are you coding?', 'Best study spot?'],
  'piggy-2': ["What's perfusion?", 'Why pig spines?', 'How were rounds?', 'What are you researching?'],
  'piggy-3': ['What are you building?', "What's the best AI model?", 'Are you on X?', 'What are you watching?'],
};

const FUN: Record<PigId, readonly string[]> = {
  'piggy-1': ['Bump!', 'Go Gators!', 'Race you to Century Tower?'],
  'piggy-2': ['Based.', 'Go Gators!', 'Favorite brain part?'],
  'piggy-3': ['Have you used Codex?', 'Go Gators!', 'One Piece or JoJo?'],
};

const PLACE: Partial<Record<string, string>> = {
  dorm: 'Cozy in here.',
  stadium: 'Go Gators!',
  lake_alice: 'Seen the bats yet?',
  plaza: 'Squirrel watch?',
  marston: 'Study with me?',
  midtown: 'Boba run?',
  reitz: 'Snack run?',
  century_tower: 'Hear the carillon?',
  volleyball_courts: 'Can I play?',
  shands: 'Busy shift?',
  anatomy_lab: 'How do you stay so calm here?',
  physics: 'What are you running?',
  malachowsky: 'Favorite nook?',
  communicore: 'Lecture today?',
};

// ───────────── under a safety line ─────────────

/** Which safety line the pig just said (quirks.ts): the crisis line (988, the counseling center) or the medical one. */
export type SafetyKind = 'distress' | 'medical';

/**
 * Soft quick replies under a safety line: thanks (to the medical line, "I'll get it checked"), comfort, then a gentle
 * change of subject. Never jokes, cheers, quirk words or the pig's own topics (no topic bonus). Each is an existing
 * Heuristic Brain intent (thanks, hug, whats_up) whose every line also works here (tests/gentle-chips.test.ts); not
 * 'yes', whose cheers ("Unanimous!") don't answer "I'll get it checked".
 */
export const GENTLE_CHIPS: Readonly<Record<SafetyKind, readonly string[]>> = {
  distress: ['Thank you.', 'I need a hug.', 'What did you do today?'],
  medical: ["Thanks, I'll get it checked.", 'I need a hug.', 'What did you do today?'],
};
/** The gentle chip that changes the subject: once the player picks it, the usual chips come back. */
export const MOVE_ON_CHIP = 'What did you do today?';
/** Calm everyday chips that top up the gentle set after the first reply. */
export const CALM_CHIPS: readonly string[] = ['How are you?', 'Favorite food?', 'Favorite spot on campus?'];
/** The chips stay gentle for this many player messages after the safety line… */
const GENTLE_TURNS = 2;
/** …in the same chat: a chat whose last line is older than this (game time) is a later visit. */
const GENTLE_FOR_MS = 30 * 60_000;

const chipKey = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

/** The safety line that player turn `i` got, if any (a pig reply opening with the crisis line counts too). */
function safetyKind(history: readonly ChatTurn[], i: number): SafetyKind | null {
  const text = history[i].text;
  if (isDistress(text)) return 'distress';
  if (isMedicalAdvice(text)) return 'medical';
  const reply = history[i + 1];
  return reply?.role === 'pig' && reply.text.startsWith(CRISIS_REACH) ? 'distress' : null;
}

/**
 * Is the chat in the gentle stretch after a crisis or medical safety line? The kind, and how many player messages
 * came since (0: the safety line is the pig's last line); null when there was none in the last GENTLE_TURNS + 1
 * messages, the player picked MOVE_ON_CHIP since, or the chat's last line is over GENTLE_FOR_MS old.
 */
export function afterSafetyLine(history: readonly ChatTurn[], at: number = now()): { kind: SafetyKind; since: number } | null {
  const last = history[history.length - 1];
  if (!last || !(at - last.at <= GENTLE_FOR_MS)) return null;
  let since = 0;
  for (let i = history.length - 1; i >= 0 && since <= GENTLE_TURNS; i--) {
    if (history[i].role !== 'player') continue;
    const kind = safetyKind(history, i);
    if (kind) return { kind, since };
    if (chipKey(history[i].text) === chipKey(MOVE_ON_CHIP)) return null;
    since++;
  }
  return null;
}

/**
 * The quick replies in the gentle stretch (afterSafetyLine), or null outside it: right under the safety line, its
 * three gentle chips; for the next GENTLE_TURNS messages, the gentle ones not picked yet, topped up with calm chips.
 */
export function gentleChips(history: readonly ChatTurn[], at: number = now()): string[] | null {
  const s = afterSafetyLine(history, at);
  if (!s) return null;
  if (s.since === 0) return [...GENTLE_CHIPS[s.kind]];
  const said = history.filter((t) => t.role === 'player').map((t) => chipKey(t.text));
  const picked = new Set(said.slice(-s.since));
  const recent = new Set(said.slice(-6));
  return [
    ...GENTLE_CHIPS[s.kind].filter((c) => !picked.has(chipKey(c))),
    ...CALM_CHIPS.filter((c) => !recent.has(chipKey(c))),
  ].slice(0, 3);
}

/**
 * Four deterministic, context-aware chips (used when the heuristic module has no suggestTopics); under a safety line,
 * the gentle ones.
 */
export function fallbackChips(pig: PigId, ctx: Partial<ChatContext>, history: readonly ChatTurn[]): string[] {
  const gentle = gentleChips(history);
  if (gentle) return gentle;
  const playerTurns = history.filter((t) => t.role === 'player');
  const last = playerTurns.at(-1)?.text.trim().toLowerCase() ?? '';
  const turn = playerTurns.length;
  const chips: string[] = [];
  const push = (s: string | undefined) => {
    if (s && !chips.includes(s) && s.toLowerCase() !== last) chips.push(s);
  };

  push(turn === 0 ? (ctx.timeOfDay === 'morning' ? 'Good morning!' : 'Hi!') : 'How are you?');
  const passion = PASSION[pig];
  push(passion[turn % passion.length]);

  // What's going on right now: needs first, then the place, then the hour.
  const n = ctx.needs;
  if (ctx.sick) push('Feeling okay?');
  else if (n && n.hunger < 30) push('Hungry? Snack run?');
  else if (n && n.energy < 30) push('You look sleepy.');
  else if (n && n.fun < 30) push('Want to play?');
  else if (ctx.location && PLACE[ctx.location]) push(PLACE[ctx.location]);
  else if (ctx.timeOfDay === 'night') push('Up late again?');
  else push('What should we do?');

  if (ctx.memories && ctx.memories.length > 0 && turn % 3 === 2) push('What do you know about me?');
  const fun = FUN[pig];
  push(fun[turn % fun.length]);
  for (const extra of [passion[(turn + 1) % passion.length], 'Tell me something cool.', 'See you later!']) {
    if (chips.length >= 4) break;
    push(extra);
  }
  return chips.slice(0, 4);
}
