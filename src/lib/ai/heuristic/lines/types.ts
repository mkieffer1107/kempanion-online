// Shapes of the handwritten line banks.
import type { AnimId, Expression } from '../../../types';

/** Bond tiers: N = hearts 0–2 (new/polite), F = 3–6 (friendly), W = 7–10 (warm, blushy). */
export type Tier = 'N' | 'F' | 'W';
export type TierTag = Tier | 'NF' | 'FW';

export interface LineOpts {
  /** Full-body clip to play with the line (the renderer falls back if the outfit lacks it). */
  a?: AnimId;
  /** Only use at these bond tiers. */
  tier?: TierTag;
  /** Only while he wears his everyday clothes, or his alternate outfit (hoodie, scrubs, jersey). */
  outfit?: 'everyday' | 'alt';
}

/**
 * [expression, text, opts?]. Text placeholders: {player} {time} {tod} {day} {place} {home} {food} {other}
 * {otherplace} {last} {said} {n} and remembered facts {major} {hometown} {comfort_food} {likes} {year} {exam};
 * `{key|fallback}` uses the fallback when the value is unknown. A line whose placeholder has no value and no
 * fallback is skipped, so fact lines only appear when the fact exists.
 */
export type RawLine = readonly [Expression, string] | readonly [Expression, string, LineOpts];

export type Bank = Readonly<Record<string, readonly RawLine[]>>;

export type IdleKind =
  | 'greet' | 'hungry' | 'tired' | 'dirty' | 'bored' | 'sick' | 'happy' | 'petted' | 'fed' | 'cleaned'
  | 'woke' | 'sleepy' | 'random' | 'whisper';

/** Idle bubbles: plain strings use the kind's default expression. Every line must stay ≤ 60 characters. */
export type IdleBank = Readonly<Record<IdleKind, readonly (string | RawLine)[]>>;

export interface PigLines {
  chat: Bank;
  greet: Bank;
  idle: IdleBank;
}
