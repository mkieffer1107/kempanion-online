// Free-chat paging (src/lib/vn/chat-pages.ts): a reply too long for the dialogue box is split like a scene line
// (whole sentences per page, a tap between pages), and a crisis line's first page always says where to reach out.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIG_IDS } from '../src/lib/types';
import {
  charCols, fitsGrid, fittingWords, gridOf, pageLine, PHONE_GRID, rowsFor, sentencesOf, type TextGrid,
} from '../src/lib/vn/chat-pages';
import {
  CODEX_LINES, CRISIS_CALL, CRISIS_REACH, CUT_AT, EMERGENCY_REACH, matchQuirk, UF_CWC_PHONE_NOWRAP,
} from '../src/lib/ai/quirks';
import { LINES } from '../src/lib/ai/heuristic/lines';
import { fill, sentenceCount } from '../src/lib/ai/heuristic/template';

const same = (pages: string[]) => pages.join(' ').replace(/\s+/g, ' ');
const read = (path: string) => readFileSync(join(import.meta.dir, '..', path), 'utf8');

describe('the box', () => {
  test('grids measured in the game (375 px phone, 393 px phone, landscape, desktop)', () => {
    expect(gridOf(342, 16, 23.200001, 92.800003)).toEqual(PHONE_GRID);
    expect(PHONE_GRID).toEqual({ cols: 42, rows: 4 });
    expect(gridOf(360, 16, 23.200001, 92.800003)).toEqual({ cols: 45, rows: 4 });
    expect(gridOf(588, 16, 23.200001, 69.599998)).toEqual({ cols: 73, rows: 3 });
    expect(gridOf(1163, 26.144, 37.9088, 113.726)).toEqual({ cols: 88, rows: 3 });
    expect(gridOf(0, 16, 23.2, 92.8)).toBeNull();
    expect(gridOf(342, 16, 23.2, Number.NaN)).toBeNull();
  });

  test('rows wrap like pre-wrap text: spaces hang, an over-long word breaks anywhere', () => {
    expect(rowsFor('', 10)).toBe(1);
    expect(rowsFor('abc def', 7)).toBe(1);
    expect(rowsFor('abc defg', 7)).toBe(2);
    expect(rowsFor('abc def ', 7)).toBe(1);
    expect(rowsFor('abcdefghijklmnop', 5)).toBe(4);
    expect(rowsFor('ab abcdefghijkl', 5)).toBe(4); // ab / abcde / fghij / kl
    expect(rowsFor('one\ntwo', 10)).toBe(2);
  });

  test('DotGothic16 widths: Latin and curly quotes are half-width, "…" and symbols full-width', () => {
    for (const ch of ['a', 'M', ' ', '’', '“', '—', 'é', '&']) expect([ch, charCols(ch)]).toEqual([ch, 1]);
    for (const ch of ['…', '♥', '★', 'の']) expect([ch, charCols(ch)]).toEqual([ch, 2]);
    expect(rowsFor('Wait…', 5)).toBe(2);
  });
});

describe('pages', () => {
  const long =
    "Okay, so I was thinking we could make a little thing for this. Like, you search for what you remember and it finds the actual clip. Actually, it should find the specific part of the clip. Then you click it and it takes you straight there.";

  test('sentences end at . ! ? … before a capital or the end, not inside "2 a.m. coding" or "wait… what"', () => {
    expect(sentencesOf("Hey. I'm here! Okay?")).toEqual(['Hey. ', "I'm here! ", 'Okay?']);
    expect(sentencesOf('Up at 2 a.m. coding. Then sleep.')).toEqual(['Up at 2 a.m. coding. ', 'Then sleep.']);
    expect(sentencesOf('Wait… what? Yes.')).toEqual(['Wait… what? ', 'Yes.']);
    expect(sentencesOf('He said "fine." Then left')).toEqual(['He said "fine." ', 'Then left']);
  });

  test('a line that fits is one page', () => {
    expect(pageLine('Patriot.', PHONE_GRID)).toEqual(['Patriot.']);
    expect(pageLine('  Set!  ', PHONE_GRID)).toEqual(['Set!']);
  });

  test('a long line splits at sentence ends; every page fits and nothing is lost', () => {
    for (const grid of [PHONE_GRID, { cols: 45, rows: 4 }, { cols: 32, rows: 4 }, { cols: 73, rows: 3 }]) {
      const pages = pageLine(long, grid);
      expect(pages.length).toBeGreaterThan(1);
      for (const p of pages) expect([grid, p, fitsGrid(p, grid), /[.!?]$/.test(p)]).toEqual([grid, p, true, true]);
      expect(same(pages)).toBe(long);
    }
    // the fewest pages (two here), split as evenly as whole sentences allow
    expect(pageLine(long, PHONE_GRID)[0]).toBe('Okay, so I was thinking we could make a little thing for this. Like, you search for what you remember and it finds the actual clip.');
  });

  test('pages come out even: no last page with one stray sentence', () => {
    // filling page 1 first would leave "It's almost working." alone on page 2
    expect(pageLine(CODEX_LINES[2], PHONE_GRID)).toEqual([
      "Yes! Wait, have you? Okay, so I'm making a tiny thing that searches podcast transcripts and jumps to the exact moment.",
      "Actually, the exact clip. It's almost working.",
    ]);
    const story = 'One two three four five six seven eight nine ten. Eleven twelve. Thirteen.';
    expect(pageLine(story, { cols: 20, rows: 3 })).toEqual(['One two three four five six seven eight nine ten.', 'Eleven twelve. Thirteen.']);
    // a break inside a sentence only when a sentence is longer than the box, and then as even as the words allow
    const run = 'one two three four five six seven eight nine ten eleven twelve';
    expect(pageLine(run, { cols: 10, rows: 4 })).toEqual(['one two three four five six seven', 'eight nine ten eleven twelve']);
  });

  test('a sentence longer than the box breaks between words; a word wider than the box is cut', () => {
    const tiny: TextGrid = { cols: 10, rows: 2 };
    const run = 'one two three four five six seven eight nine ten eleven twelve';
    const pages = pageLine(run, tiny);
    for (const p of pages) expect([p, fitsGrid(p, tiny)]).toEqual([p, true]);
    expect(same(pages)).toBe(run);
    const giant = pageLine('x'.repeat(45), tiny);
    expect(giant.join('')).toBe('x'.repeat(45));
    expect(giant.every((p) => p.length <= 20)).toBe(true);
  });

  test('fittingWords takes whole words while they fit after what is already shown', () => {
    const one: TextGrid = { cols: 5, rows: 1 };
    expect(fittingWords('', 'aa bb cc ', one)).toBe('aa bb ');
    expect(fittingWords('aa ', 'bb cc dd', one)).toBe('bb ');
    expect(fittingWords('aaaaa', 'b c', one)).toBe('');
    expect(fittingWords('', 'aa bb', one)).toBe('aa bb');
  });
});

/** The rows a box shows `text` in (pre-wrap at spaces only, like rowsFor()). */
function wrap(text: string, cols: number): string[] {
  const rows: string[] = [];
  let row = '';
  for (const word of text.split(' ')) {
    const next = row ? `${row} ${word}` : word;
    if (row && [...next].reduce((w, ch) => w + charCols(ch), 0) > cols) {
      rows.push(row);
      row = word;
    } else row = next;
  }
  rows.push(row);
  return rows;
}

describe('crisis lines in every box', () => {
  const crisisLines = PIG_IDS.flatMap((pig) => [
    ...['i feel hopeless', 'i want to die', 'thinking about suicides'].map((msg) => matchQuirk({ pig, playerText: msg })!.reply.text),
    ...LINES[pig].chat.distress.map(([, t]) => t),
  ]);
  // Every box the game draws, and smaller: phone portrait docks 4 rows (20 columns: a 375 pt iPhone at Safari's 150%
  // page zoom and Text Size XL; 22: a 280 px phone at XL; 26: 320 px at XL; 32: 375 px at XL; 35: 320 px; 42: 375 px),
  // landscape and desktop overlay 3 rows of 40+ (XL included). Down to 13 × 4 and 18 × 3, where the counseling number
  // (13 characters with its comma) still fits a row.
  const grids: TextGrid[] = [
    ...Array.from({ length: 88 }, (_, i) => ({ cols: 13 + i, rows: 4 })),
    ...Array.from({ length: 93 }, (_, i) => ({ cols: 18 + i, rows: 3 })),
  ];

  test('the call to action comes first: both numbers, each with "call", the counseling one before the name', () => {
    expect(CRISIS_REACH).toBe(`Please call or text 988 now, or call ${UF_CWC_PHONE_NOWRAP}`);
    expect(CRISIS_CALL).toBe(`${CRISIS_REACH}, UF's Counseling & Wellness Center.`);
    for (const t of crisisLines) expect([t, t.startsWith(`${CRISIS_CALL} `)]).toEqual([t, true]);
  });

  test('page 1 shows where to reach out, both numbers, at every box size; the rest is paged after it', () => {
    for (const grid of grids) {
      const whole = rowsFor(CRISIS_CALL, grid.cols) <= grid.rows;
      for (const t of crisisLines) {
        const pages = pageLine(t, grid, true);
        expect([grid, t, pages[0].startsWith(CRISIS_REACH)]).toEqual([grid, t, true]);
        // the center's name too wherever the whole call fits a page (26 × 4, 29 × 3 and up), and never split by a tap
        if (whole) expect([grid, t, pages[0].startsWith(CRISIS_CALL)]).toEqual([grid, t, true]);
        expect([grid, pages.some((p) => /^(?:Counseling|&|Wellness|Center)\b/.test(p))]).toEqual([grid, false]);
        for (const p of pages) expect([grid, p, fitsGrid(p, grid)]).toEqual([grid, p, true]);
        expect(same(pages)).toBe(t);
      }
    }
    // 20 × 4 (a 375 pt iPhone at 150% page zoom, Text Size XL): the call to action, then the center's name after a tap
    expect(pageLine(crisisLines[0], { cols: 20, rows: 4 }, true)).toEqual([
      `${CRISIS_REACH},`, "UF's Counseling & Wellness Center. I'm really glad you told me, teammate.", "You matter, and I'm right here.",
    ]);
    // the even split would leave page 1 with the call alone and move the rest behind a tap; front-first fills page 1
    const t = crisisLines[0];
    expect(pageLine(t, { cols: 40, rows: 4 }, true)[0]).toBe(`${CRISIS_CALL} I'm really glad you told me, teammate.`);
  });

  test('the number never breaks across two rows (non-breaking hyphens), and fits one page on a 375 px phone', () => {
    // U+2011 is as wide as "-" and never a line break: rowsFor() counts the number as one word, like the browser does
    expect(charCols(String.fromCharCode(0x2011))).toBe(1);
    for (const t of crisisLines) {
      expect([t, t.includes('352-')]).toEqual([t, false]);
      for (const { cols } of grids) {
        const rows = wrap(t, cols);
        expect([cols, rows.some((r) => r.includes(UF_CWC_PHONE_NOWRAP))]).toEqual([cols, true]);
      }
      expect([t, pageLine(t, PHONE_GRID, true)]).toEqual([t, [t]]);
    }
    for (const pig of PIG_IDS) {
      const medical = matchQuirk({ pig, playerText: 'should i take ibuprofen?' })!.reply.text;
      expect([pig, pageLine(medical, PHONE_GRID)]).toEqual([pig, [medical]]);
    }
  });
});

describe('911 first, the medical line and the gentle check-in, in every box', () => {
  // an emergency told to "the doctor", and a crisis where the pills are already taken
  const emergencyLines = PIG_IDS.flatMap((pig) => ['my chest hurts', 'i swallowed a bunch of pills'].map((msg) => matchQuirk({ pig, playerText: msg })!.reply.text));
  const medicalLines = PIG_IDS.map((pig) => matchQuirk({ pig, playerText: 'doc, my back hurts' })!.reply.text);
  const checkIns = PIG_IDS.map((pig) => matchQuirk({ pig, playerText: 'i feel dead inside' })!.reply.text);
  const grids: TextGrid[] = [
    ...Array.from({ length: 88 }, (_, i) => ({ cols: 13 + i, rows: 4 })),
    ...Array.from({ length: 93 }, (_, i) => ({ cols: 18 + i, rows: 3 })),
  ];

  test('an emergency line says "call 911" on page 1 in every box down to 13 × 4 and 18 × 3', () => {
    for (const t of emergencyLines) {
      expect([t, t.startsWith(`${EMERGENCY_REACH} `)]).toEqual([t, true]);
      for (const grid of grids) {
        const pages = pageLine(t, grid, true);
        expect([grid, t, pages[0].startsWith('Please call 911')]).toEqual([grid, t, true]);
        for (const p of pages) expect([grid, p, fitsGrid(p, grid)]).toEqual([grid, p, true]);
        expect(same(pages)).toBe(t);
      }
    }
  });

  test('each is three sentences at most and one page on a 375 px phone; the check-in names 988', () => {
    for (const t of [...emergencyLines, ...medicalLines, ...checkIns]) {
      expect([t, sentenceCount(t) <= 3, t.length <= 280]).toEqual([t, true, true]);
      expect([t, pageLine(t, PHONE_GRID, true)]).toEqual([t, [t]]);
    }
    for (const t of checkIns) expect([t, t.includes('call or text 988')]).toEqual([t, true]);
    for (const t of medicalLines) expect([t, t.includes('Student Health Care Center'), t.startsWith('Please call 911')]).toEqual([t, true, false]);
  });
});

describe('the reply field', () => {
  test('keeps the whole 48-character message on every phone: it scrolls sideways, never cuts a message to one line', () => {
    const src = read('src/lib/vn/components/ChatChoices.svelte');
    expect(src).toContain('const max = $derived(Math.max(1, opts?.maxLength ?? DEFAULT_MAX));');
    expect(src).toContain('maxlength={max}');
    expect(/fitChars|\bfit = /.test(src)).toBe(false);
    // the cap quirks.ts reads cut-off messages at is free chat's
    expect(read('src/lib/vn/chat.ts')).toContain(`export const FREE_CHAT_MAX_CHARS = ${CUT_AT};`);
  });
});

describe('real lines in the smallest box (4 rows of 42, a 375 px phone)', () => {

  test('every chat line and Codex story pages cleanly: pages fit, read in order, at most 3', () => {
    const vars = {
      player: 'Alexandria', time: '11:42 PM', tod: 'this evening', day: 'Wednesday', place: 'the Physics Building',
      home: 'the Physics Building', food: 'banana protein shake', other: 'Piggy 2', otherplace: 'the Physics Building',
      last: 'the spinal cord', said: 'computer science', n: '12', major: 'Medicine & Life Sciences', hometown: 'Saint Petersburg',
      comfort_food: 'grilled cheese', likes: 'board games', year: 'sophomore', exam: 'organic chemistry exam', chronotype: 'night owl',
    };
    const texts = [...CODEX_LINES];
    for (const pig of PIG_IDS) {
      for (const section of [LINES[pig].chat, LINES[pig].greet]) {
        for (const lines of Object.values(section)) for (const [, raw] of lines) texts.push(fill(raw, vars) ?? '');
      }
    }
    for (const t of texts.filter(Boolean)) {
      const pages = pageLine(t, PHONE_GRID);
      expect([t, pages.length <= 3, pages.every((p) => fitsGrid(p, PHONE_GRID)), same(pages)]).toEqual([t, true, true, same([t])]);
    }
  });
});
