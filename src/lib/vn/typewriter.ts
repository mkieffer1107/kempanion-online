// Pure typewriter helpers (bun-testable): punctuation pauses, blip letters, voice speeds, paging.
import type { VoiceId } from '../types';

/** Pauses after punctuation (GAME_DESIGN §14 / design-ux §4.6), in ms. */
export const PAUSES = { comma: 120, stop: 250, dash: 180, ellipsis: 450 } as const;

/**
 * Typewriter speed (chars/s at Normal = textSpeed 40) and blip spacing (every Nth letter) per voice.
 * Used when src/lib/audio/voices.ts does not export a VOICE_STYLE entry for the voice.
 */
export const DEFAULT_VOICE_STYLE: Record<VoiceId, { cps: number; every: number }> = {
  'piggy-1': { cps: 45, every: 2 },
  'piggy-2': { cps: 35, every: 3 },
  'piggy-3': { cps: 32, every: 2 },
  player: { cps: 42, every: 2 },
  narrator: { cps: 40, every: 3 },
  system: { cps: 60, every: 4 },
};

const CLOSERS = new Set(['"', "'", '”', '’', ')', ']', '*', '」', '』']);
const isSpaceOrEnd = (c: string | undefined) => c === undefined || /\s/.test(c);

/** Letters and digits blip; spaces and punctuation stay silent. */
export function isBlipChar(ch: string): boolean {
  return /[\p{L}\p{N}]/u.test(ch);
}

/** True when the char at i is followed only by closing quotes/brackets and then whitespace or the end. */
function endsClause(text: string, i: number): boolean {
  let j = i + 1;
  while (j < text.length && CLOSERS.has(text[j])) j++;
  return isSpaceOrEnd(text[j]);
}

/** Extra delay (ms) after revealing text[i], before the next character. 0 after the last character. */
export function pauseAfter(text: string, i: number): number {
  if (i >= text.length - 1) return 0;
  const c = text[i];
  const next = text[i + 1];
  switch (c) {
    case '…':
      return next === '…' ? 0 : PAUSES.ellipsis;
    case '.':
      if (next === '.') return 0;
      if (text[i - 1] === '.' && text[i - 2] === '.') return PAUSES.ellipsis;
      return endsClause(text, i) ? PAUSES.stop : 0;
    case '!': case '?':
      if (next === '!' || next === '?') return 0;
      return endsClause(text, i) ? PAUSES.stop : 0;
    case ',': case ';': case ':':
      return endsClause(text, i) ? PAUSES.comma : 0;
    case '—': case '–':
      return next === '—' || next === '–' ? 0 : PAUSES.dash;
    case '-':
      return text[i - 1] === '-' && next !== '-' ? PAUSES.dash : 0;
  }
  return 0;
}

/** Ms per character for a voice at a text speed (Settings.textSpeed; 40 = Normal, 0 = instant). */
export function msPerChar(cps: number, textSpeed: number): number {
  if (!(textSpeed > 0) || !(cps > 0)) return 0;
  return 1000 / ((cps * textSpeed) / 40);
}

/**
 * Split a long line into pages of at most `max` chars at sentence boundaries (then at spaces).
 * Short lines come back as a single page.
 */
export function paginate(text: string, max = 160): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*)?\s*/g) ?? [text];
  const pages: string[] = [];
  let cur = '';
  const push = () => {
    if (cur.trim()) pages.push(cur.trim());
    cur = '';
  };
  for (const s of sentences) {
    if ((cur + s).trim().length <= max) { cur += s; continue; }
    push();
    if (s.trim().length <= max) { cur = s; continue; }
    // One very long sentence: break at the last space before the limit.
    let rest = s.trim();
    while (rest.length > max) {
      let cut = rest.lastIndexOf(' ', max);
      if (cut < max * 0.5) cut = max;
      pages.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    cur = rest + ' ';
  }
  push();
  return pages.length ? pages : [text];
}
