// Typewriter timing rules (pure, testable): per-voice speed and punctuation pauses (GAME_DESIGN §14).
import type { VoiceId } from '../../types';

/** Characters per second at "Normal" (settings.textSpeed = 40). */
export const VOICE_CPS: Record<VoiceId, number> = {
  'piggy-1': 45, 'piggy-2': 35, 'piggy-3': 32, player: 40, narrator: 40, system: 60,
};

/** Blip on every Nth letter. */
export const BLIP_EVERY: Record<VoiceId, number> = {
  'piggy-1': 2, 'piggy-2': 3, 'piggy-3': 2, player: 2, narrator: 3, system: 4,
};

const CLOSERS = new Set([' ', '\n', '"', '”', '’', "'", '」', '』', ')', undefined]);

/** Extra pause (ms) after `ch`, given the next character: comma 120, . ! ? 250, — 180, … 450. */
export function pauseAfter(ch: string, next: string | undefined): number {
  if (ch === '…') return 450;
  if (ch === '—') return 180;
  if (ch === '.' && next === '.') return 150;
  if (!CLOSERS.has(next)) return 0;
  if (ch === ',') return 120;
  if (ch === '.' || ch === '!' || ch === '?') return 250;
  return 0;
}
