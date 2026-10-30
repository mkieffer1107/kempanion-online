// Pure helpers for ChatChoices.svelte (bun-testable): which quick replies become rows, how many characters fit
// on one line of the "Say something else…" field, and when to show the tiny characters-left counter.

/** Rows of quick replies above the "Say something else…" row. */
export const MAX_REPLY_ROWS = 3;

/** DotGothic16 draws every ASCII character exactly 0.5em wide, so one line holds width / (0.5 × font size) of them. */
export const CHAR_EM = 0.5;

/** Up to `max` distinct, non-empty quick replies, in order (the last row is always "Say something else…"). */
export function replyRows(quick: readonly string[] | null | undefined, max = MAX_REPLY_ROWS): string[] {
  const rows: string[] = [];
  for (const raw of quick ?? []) {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (text && !rows.includes(text)) rows.push(text);
    if (rows.length >= max) break;
  }
  return rows;
}

/**
 * How many characters fit on one line of a text field `widthPx` wide (its content box) at `fontPx`, capped at `cap`
 * and never below `min`. Unknown sizes (not laid out yet) give the cap. 2 px are kept for the caret.
 */
export function fitChars(widthPx: number, fontPx: number, cap: number, min = 12): number {
  if (!(widthPx > 0) || !(fontPx > 0)) return cap;
  const n = Math.floor((widthPx - 2) / (fontPx * CHAR_EM));
  return Math.max(Math.min(min, cap), Math.min(cap, n));
}

/** Characters left before the limit, but only once `threshold` or fewer remain (null = hide the counter). */
export function charsLeftHint(length: number, max: number, threshold = 10): number | null {
  const left = Math.max(0, max - length);
  return left <= threshold ? left : null;
}
