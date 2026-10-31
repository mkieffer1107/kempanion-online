// Pure paging helpers for free chat (bun-testable): how many rows a line takes in the dialogue box, and splitting a
// long reply into pages that each fit the box, at sentence boundaries like scene lines (typewriter.paginate).
// chat.ts measures the box (textGrid) and shows the pages: every page but the last waits for a tap.
import { CHAR_EM } from './components/chat-choices';

/** The dialogue box's text area: characters per row (DotGothic16 draws ASCII 0.5em wide) and visible rows. */
export interface TextGrid {
  cols: number;
  rows: number;
}

/** The smallest box chat pages for: 4 docked rows of 42 characters (T layout on a 375 px phone, Text Size M). */
export const PHONE_GRID: Readonly<TextGrid> = { cols: 42, rows: 4 };

/** Grid of a text area `widthPx` wide whose visible height is `maxHeightPx` (null when not laid out yet). */
export function gridOf(widthPx: number, fontPx: number, lineHeightPx: number, maxHeightPx: number): TextGrid | null {
  if (!(widthPx > 0 && fontPx > 0 && lineHeightPx > 0 && maxHeightPx > 0)) return null;
  const cols = Math.floor(widthPx / (fontPx * CHAR_EM));
  const rows = Math.floor(maxHeightPx / lineHeightPx + 0.05);
  return cols >= 1 && rows >= 1 ? { cols, rows } : null;
}

/**
 * Columns one character takes: 1 for Latin text and the curly quotes and dashes, 2 for everything DotGothic16 draws
 * full-width ("…", ♥, ★, kana, emoji).
 */
export function charCols(ch: string): number {
  const c = ch.codePointAt(0) ?? 0;
  return c < 0x0250 || (c >= 0x2010 && c <= 0x201f) ? 1 : 2;
}

function width(word: string): number {
  let w = 0;
  for (const ch of word) w += charCols(ch);
  return w;
}

/**
 * Rows `text` takes at `cols` per row, wrapped like the box (pre-wrap: a space at a row end hangs, a word that is
 * longer than a row breaks anywhere). Only spaces count as break points, so this never undercounts.
 */
export function rowsFor(text: string, cols: number): number {
  const c = Math.max(1, Math.floor(cols));
  let rows = 0;
  for (const para of text.split('\n')) {
    rows++;
    let x = 0;
    let first = true;
    for (const word of para.split(' ')) {
      const w = width(word);
      // the space before every word but the first
      const need = (first ? 0 : 1) + w;
      first = false;
      if (x + need <= c) {
        x += need;
        continue;
      }
      // spaces never wrap: they hang at the end of the row
      if (!w) {
        x = c;
        continue;
      }
      if (x > 0) {
        rows++;
        x = 0;
      }
      // a word longer than a row fills whole rows, then the rest starts the next one
      let left = w;
      while (left > c) {
        rows++;
        left -= c;
      }
      x = left;
    }
  }
  return rows;
}

/** True when `text` fits the box without scrolling. */
export function fitsGrid(text: string, grid: TextGrid): boolean {
  return rowsFor(text.trim(), grid.cols) <= grid.rows;
}

/**
 * Sentences with their trailing spaces. A sentence ends at . ! ? or … (plus closing quotes) before a capital,
 * a digit or the end, so "2 a.m. coding" and "wait… what" stay whole (the same rule as the reply length checks).
 */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  const end = /[.!?…]+["”’')\]]*(?=\s+["“‘'(\[]?[A-Z0-9]|\s*$)\s*/g;
  let from = 0;
  for (let m = end.exec(text); m; m = end.exec(text)) {
    out.push(text.slice(from, end.lastIndex));
    from = end.lastIndex;
  }
  if (from < text.length) out.push(text.slice(from));
  return out.filter((s) => s.trim());
}

/** The longest run of whole words from the start of `text` that still fits after `before` (may be empty). */
export function fittingWords(before: string, text: string, grid: TextGrid): string {
  let best = '';
  for (let i = text.indexOf(' '); i >= 0; i = text.indexOf(' ', i + 1)) {
    const head = text.slice(0, i + 1);
    if (!fitsGrid(before + head, grid)) break;
    best = head;
  }
  if (fitsGrid(before + text, grid)) best = text;
  return best;
}

/** A piece pages are made of: a whole sentence, or a word of a sentence longer than the box (`end`: ends a sentence). */
interface Piece {
  text: string;
  end: boolean;
}

function piecesOf(t: string, grid: TextGrid): Piece[] {
  const out: Piece[] = [];
  const box = grid.cols * grid.rows;
  for (const s of sentencesOf(t)) {
    if (fitsGrid(s, grid)) {
      out.push({ text: s, end: true });
      continue;
    }
    const words = s.match(/\S+\s*/g) ?? [s];
    for (const w of words) {
      if (fitsGrid(w, grid)) {
        out.push({ text: w, end: false });
        continue;
      }
      // one word wider than the whole box: cut it at the box size
      let cut = '';
      for (const ch of w) {
        if (cut && width(cut + ch) > box) {
          out.push({ text: cut, end: false });
          cut = '';
        }
        cut += ch;
      }
      out.push({ text: cut, end: false });
    }
    out[out.length - 1].end = true;
  }
  return out;
}

/** A piece that ends a sentence or a clause ("…352‑392‑1575, "): a page may end after it without splitting a phrase. */
function endsClause(p: Piece): boolean {
  return p.end || /[,;:—]\s*$/.test(p.text);
}

/**
 * Split a line into pages that each fit `grid`: as few pages as possible, broken between sentences (a sentence longer
 * than a page breaks between words), and as even as possible, so the last page isn't one stray sentence. A line that
 * fits is one page.
 *
 * `front`: fill each page as full as it goes instead, from the start (a crisis line: where to reach out comes first
 * and is never moved behind a tap to even the pages out). A page that would end inside a clause ends at that clause's
 * start, when the clause fits the next page whole ("…or call 352‑392‑1575," ▼ "UF's Counseling & Wellness Center.").
 */
export function pageLine(text: string, grid: TextGrid, front = false): string[] {
  const t = text.trim();
  if (!t || fitsGrid(t, grid)) return [t];
  const pieces = piecesOf(t, grid);
  const join = (from: number, to: number) => pieces.slice(from, to).map((p) => p.text).join('');
  if (front) {
    const out: string[] = [];
    for (let start = 0; start < pieces.length; ) {
      let end = start + 1;
      while (end < pieces.length && fitsGrid(join(start, end + 1), grid)) end++;
      if (end < pieces.length && !endsClause(pieces[end - 1])) {
        let from = end - 1;
        while (from > start && !endsClause(pieces[from - 1])) from--;
        let to = end;
        while (to < pieces.length && !endsClause(pieces[to - 1])) to++;
        if (from > start && fitsGrid(join(from, to), grid)) end = from;
      }
      out.push(join(start, end).trim());
      start = end;
    }
    return out.filter(Boolean);
  }
  const n = pieces.length;
  // Best split of pieces[i…]: fewest pages, then fewest breaks inside a sentence, then the smallest sum of squared page
  // widths (the most even pages).
  const pages = new Array<number>(n + 1).fill(Infinity);
  const mids = new Array<number>(n + 1).fill(0);
  const cost = new Array<number>(n + 1).fill(0);
  const next = new Array<number>(n + 1).fill(n);
  pages[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    let page = '';
    for (let j = i; j < n; j++) {
      page += pieces[j].text;
      if (!fitsGrid(page, grid)) break;
      const p = pages[j + 1] + 1;
      const m = mids[j + 1] + (j + 1 < n && !pieces[j].end ? 1 : 0);
      const w = width(page.trim());
      const c = cost[j + 1] + w * w;
      if (p < pages[i] || (p === pages[i] && (m < mids[i] || (m === mids[i] && c < cost[i])))) {
        pages[i] = p;
        mids[i] = m;
        cost[i] = c;
        next[i] = j + 1;
      }
    }
  }
  if (!Number.isFinite(pages[0])) return [t];
  const out: string[] = [];
  for (let i = 0; i < n; i = next[i]) out.push(pieces.slice(i, next[i]).map((p) => p.text).join('').trim());
  return out.filter(Boolean);
}
