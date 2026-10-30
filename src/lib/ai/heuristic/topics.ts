// Quick-reply chips for the chat box: one "your thing" chip, one care/feelings chip, one contextual or signature
// chip, one social chip. Never suggests something the player just said.
import type { ChatContext, ChatTurn, PigId } from '../../types';
import { PIG_IDS } from '../../types';
import { now, nowDate } from '../../state/clock';
import { localDate } from '../../time';
import { normalize } from './normalize';
import { pick, rngFrom, type Rng } from './rng';
import { PIG_NAME } from './world';

const PASSION_CHIPS: Record<PigId, readonly string[]> = {
  'piggy-1': ["How's volleyball?", 'Teach me a serve!', 'What are you coding?', "How's your serve?", 'Sports drink facts?'],
  'piggy-2': ["What's perfusion?", "What's ischemia?", "How's the research?", "What's CSF?", 'Tell me about the lab pigs'],
  'piggy-3': ['What are you building?', 'Have you used Codex?', "What's the best AI model?", "What's HiPerGator?", 'One Piece or JoJo?'],
};

const FALLBACK_CHIPS = ['How are you?', 'Tell me a joke', 'Favorite food?', 'What do you know about me?'];

function contextChip(pig: PigId, ctx: Partial<ChatContext>, rng: Rng): string {
  const d = nowDate();
  const h = d.getHours();
  const month = d.getMonth();
  if (ctx.location === 'lake_alice' && (ctx.timeOfDay === 'evening' || ctx.timeOfDay === 'night')) return 'Bats tonight?';
  if (d.getDay() === 5 && h >= 11 && h < 15) return 'Pig Pen Friday!';
  if (d.getDay() === 6 && month >= 8 && month <= 10) return 'Go Gators!';
  const others = PIG_IDS.filter((p) => p !== pig);
  return rng() < 0.5 ? 'Favorite spot on campus?' : `Where's ${PIG_NAME[pick(rng, others)]}?`;
}

/** 3–4 short quick-reply chips (deterministic for a given pig, history length and day). */
export function suggestTopics(pig: PigId, ctx: Partial<ChatContext>, history: readonly ChatTurn[] = []): string[] {
  const rng = rngFrom('chips', pig, history.length, localDate(now()));
  const recentlySaid = new Set(
    history.filter((t) => t.role === 'player').slice(-6).map((t) => normalize(t.text).text),
  );
  const chips: string[] = [];
  const fresh = (c: string) => !recentlySaid.has(normalize(c).text) && !chips.includes(c);
  const add = (c: string | undefined) => {
    if (c && fresh(c)) chips.push(c);
  };
  const pigLines = history.filter((t) => t.role === 'pig');
  const lastPig = pigLines[pigLines.length - 1]?.text.trim();

  // Piggy 1's call-and-response: bump → "Set!" → set → "SPIKE!!" → spike → "KILL! Point Gators!"
  if (pig === 'piggy-1' && lastPig === 'Set!') chips.push('Set');
  else if (pig === 'piggy-1' && lastPig === 'SPIKE!!') chips.push('Spike');

  const passion = PASSION_CHIPS[pig].filter(fresh);
  add(passion.length ? pick(rng, passion) : undefined);

  if (ctx.sick) add('Are you feeling okay?');
  else if ((ctx.needs?.hunger ?? 100) < 40) add('Want a snack?');
  else if ((ctx.needs?.energy ?? 100) < 40) add('You should rest.');
  else add(rng() < 0.6 ? 'How are you?' : "What's up?");

  // "based" unlocks once Piggy 2 has said it to you
  if (pig === 'piggy-2' && pigLines.some((t) => /\bbased\b/i.test(t.text))) add('based');
  else if (pig === 'piggy-1' && chips.length < 3 && !chips.includes('Set') && !chips.includes('Spike') && rng() < 0.5) add('Bump');
  else add(contextChip(pig, ctx, rng));

  const social = ['Tell me a joke', 'Favorite food?', 'What do you know about me?', 'Favorite spot on campus?'].filter(fresh);
  if (chips.length < 4) add(social.length ? pick(rng, social) : undefined);
  for (const c of FALLBACK_CHIPS) {
    if (chips.length >= 3) break;
    add(c);
  }
  return chips.slice(0, 4);
}
