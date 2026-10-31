// Thought-bank contracts (idle "thought bubbles"). The banks (piggy-1/2/3.ts) are data only; the seeded scheduler
// that picks from them lives in ../thoughts.ts. Spec: thoughts final.md §3.
import type { AnimId, Expression, PigId } from '../../types';

/** Faces a thought may use: exactly the expressions lines/piggy*.ts already use (all but surprised, scared, crying;
 *  re-counted 20:40). Alternate outfits remap missing portraits through ALT_EXPRESSION_FALLBACK (thinking → confused, …). */
export const THOUGHT_FACES = [
  'neutral', 'happy', 'laughing', 'sad', 'angry', 'confused', 'shy', 'loving', 'proud', 'sleepy', 'sick',
  'excited', 'thinking', 'shy_blush', 'flustered_blush', 'affectionate_blush', 'bashful_smile',
] as const satisfies readonly Expression[];
export type ThoughtFace = (typeof THOUGHT_FACES)[number];

export interface ThoughtDef {
  /** 'p<n>.<slug>': unique, stable, never renamed or reused (today's log stores it). */
  id: string;
  /** Topic id from the pig's TopicRule table ('x', 'math', 'volleyball', 'collection', 'sick', …). */
  topic: string;
  /** Cloud text: ASCII, trimmed, 1–20 chars. */
  label: string;
  /** Pixel icon id (UI, item or thought icon). */
  icon: string;
  /** Tap line: ≤ 120 chars, ≤ 2 sentences, no {placeholders}, in his voice. */
  line: string;
  face: ThoughtFace;
  /** Hub clip on tap (default animFor(face), ai/emotion.ts l.308–317). */
  anim?: AnimId;
  /** Hub clip when the cloud appears (default: the topic's pose, else 'thinking' on every third thought). */
  pose?: AnimId;
  /** Every entry must hold; commas mean OR inside one entry: 'time:evening,night'. */
  when?: readonly string[];
  /** At least one entry must hold (the rare OR across keys). */
  whenAny?: readonly string[];
  /** Base weight in the pool (default 1). */
  weight?: number;
}

export interface TopicRule {
  /** Probability this topic takes a pick whenever it and something else are both eligible (Piggy 3's x: 0.6). */
  share?: number;
  /** At most this many per day. */
  cap?: number;
  /** At most this many in a row (default 1: a topic never repeats back to back). */
  streak?: number;
  /** Multipliers when a tag holds: on the odds for a share topic, on the weights otherwise. */
  mult?: Readonly<Record<string, number>>;
  /** Default appear-pose for the topic's thoughts (Piggy 3's x: 'phone', once that clip is an AnimId). */
  pose?: AnimId;
  /** Optional map-card caption (§7): 'probably on X'. */
  hint?: string;
}

export interface PigThoughts { pig: PigId; topics: Readonly<Record<string, TopicRule>>; thoughts: readonly ThoughtDef[] }
