// Each pig's "thing" (for the topic-match bond bonus) and fallback quick-reply chips. Pure module.
import type { ChatContext, ChatTurn, PigId } from '../types';

const TOPIC: Record<PigId, RegExp> = {
  'piggy-1':
    /\b(volley\w*|serves?|serving|spikes?|setter|bump|digs?|blocks?|rally|rallies|practice|courts?|sand|outside hitter|team(mate)?s?|club|tournament|code|coding|program\w*|algorithm\w*|computer science|cs|hackathon|stats?|analytics|spreadsheet|malachowsky|gatorade|pub ?subs?|game dev)\b/i,
  'piggy-2':
    /\b(neuro\w*|brains?|spine|spinal|cord|surg\w*|perfusion|ischemi\w*|csf|cerebrospinal|electrodes?|chips?|mri|med school|medicine|medical|anatomy|shands|communicore|rounds|scrubs|hospital|research|lab pigs?|based|patriot|mcknight)\b/i,
  'piggy-3':
    /\b(codex|code|coding|build\w*|ai|models?|agents?|eeg|ecg|signals?|3d print\w*|printers?|filament|hipergator|gpus?|physics|simulations?|one piece|jojo|anime|interfaces?|ui|design|open source|datasets?|projects?|apps?|prototype)\b/i,
};

/** Did the player bring up this pig's favorite subjects? */
export function topicMatch(pig: PigId, text: string): boolean {
  return TOPIC[pig].test(text ?? '');
}

const PASSION: Record<PigId, readonly string[]> = {
  'piggy-1': ['How was practice?', 'Teach me to serve?', 'What are you coding?', 'Best study spot?'],
  'piggy-2': ["What's perfusion?", 'Why pig spines?', 'How were rounds?', 'What are you researching?'],
  'piggy-3': ['What are you building?', "What's the best AI model?", 'Show me a 3D print?', 'What are you watching?'],
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

/** Four deterministic, context-aware chips (used when the heuristic module has no suggestTopics). */
export function fallbackChips(pig: PigId, ctx: Partial<ChatContext>, history: readonly ChatTurn[]): string[] {
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
