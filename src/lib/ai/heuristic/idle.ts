// Hub speech bubbles (≤ 60 chars): hungry, petted, asleep whispers… Varies per call and avoids the last few lines.
import type { ChatContext, Expression, PigId } from '../../types';
import { now } from '../../state/clock';
import { LINES } from './lines';
import type { IdleKind, RawLine, Tier } from './lines/types';
import { pick, rngFrom } from './rng';
import { fill } from './template';
import { outfitKind, tierOf } from './respond';
import { NICKNAME } from './world';

export const IDLE_MAX_CHARS = 60;

const KIND_FACE: Record<IdleKind, Expression> = {
  greet: 'happy', hungry: 'sad', tired: 'sleepy', dirty: 'confused', bored: 'neutral', sick: 'sick', happy: 'happy',
  petted: 'shy', fed: 'happy', cleaned: 'happy', woke: 'sleepy', sleepy: 'sleepy', random: 'neutral', whisper: 'sleepy',
};
/** Petting reads differently as the bond grows (surprised → shy → bashful). */
const PETTED_FACE: Record<Tier, Expression> = { N: 'surprised', F: 'shy_blush', W: 'bashful_smile' };

const recentIdle: Record<PigId, string[]> = { 'piggy-1': [], 'piggy-2': [], 'piggy-3': [] };
let calls = 0;

/** Every idle line for a pig and kind, rendered for a player (used by tests and the line viewer). */
export function idleOptions(pig: PigId, kind: IdleKind, ctx: Partial<ChatContext> = {}): { text: string; expression: Expression }[] {
  const idle = LINES[pig].idle;
  const tier = tierOf(ctx.bondLevel);
  const outfit = outfitKind(ctx.outfit);
  const name = (ctx.playerName ?? '').trim();
  const nick = NICKNAME[pig];
  const player = (ctx.bondLevel ?? 0) >= 1 && name ? name : nick;
  const face = kind === 'petted' ? PETTED_FACE[tier] : KIND_FACE[kind];
  const out: { text: string; expression: Expression }[] = [];
  for (const entry of idle[kind] ?? idle.random) {
    const raw: RawLine = typeof entry === 'string' ? [face, entry] : entry;
    const tag = raw[2]?.tier;
    if (tag && !tag.includes(tier)) continue;
    if (raw[2]?.outfit && outfit && raw[2].outfit !== outfit) continue;
    let text = fill(raw[1], { player });
    if (text && text.length > IDLE_MAX_CHARS) text = fill(raw[1], { player: nick });
    if (text && text.length <= IDLE_MAX_CHARS) out.push({ text, expression: raw[0] });
  }
  return out;
}

/** Short speech-bubble line for the hub (≤ 60 chars), e.g. when hungry or after being petted. */
export function idleLine(pig: PigId, kind: IdleKind, ctx: Partial<ChatContext> = {}): { text: string; expression: Expression } {
  const options = idleOptions(pig, kind, ctx);
  if (!options.length) return { text: '…', expression: KIND_FACE[kind] ?? 'neutral' };
  const recent = recentIdle[pig];
  const fresh = options.filter((o) => !recent.includes(o.text));
  const choice = pick(rngFrom('idle', pig, kind, Math.floor(now() / 1000), calls++), fresh.length ? fresh : options);
  recent.unshift(choice.text);
  if (recent.length > 4) recent.length = 4;
  return choice;
}
