// Tiny built-in pixel glyphs for the meta screens (so they never depend on the shared icon sheet being filled).
// 'x' = currentColor; other letters come from the palette below; '.' is transparent.

export interface Glyph { rows: string[]; palette?: Record<string, string> }

const INK = '#1b1229';

export const GLYPHS = {
  heart: {
    rows: ['.ooo.ooo.', 'oaaxoxxxo', 'oaxxxxxxo', 'oxxxxxxxo', '.oxxxxxo.', '..oxxxo..', '...oxo...', '....o....'],
    palette: { o: INK, a: '#ffe3ea' },
  },
  heartEmpty: {
    rows: ['.ooo.ooo.', 'oeeeoeeeo', 'oeeeeeeeo', 'oeeeeeeeo', '.oeeeeeo.', '..oeeeo..', '...oeo...', '....o....'],
    palette: { o: INK, e: 'rgba(255,255,255,0.18)' },
  },
  acorn: {
    rows: ['...ss...', '.cCCCCc.', 'cCCcCCCc', 'cccccccc', '.nNnnnn.', '.nNnnnn.', '.nnnnnn.', '..nnnn..', '...nn...'],
    palette: { s: '#5a3a1a', c: '#6b4423', C: '#9a6a3a', n: '#c98a4b', N: '#f0c27a' },
  },
  lock: {
    rows: ['..xxx..', '.x...x.', '.x...x.', 'xxxxxxx', 'xyyyyyx', 'xyyxyyx', 'xyyxyyx', 'xxxxxxx'],
    palette: { y: '#ffd25a' },
  },
  star: {
    rows: ['...x...', '...x...', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', 'xx...xx'],
  },
  note: {
    rows: ['...xxxx', '...x..x', '...x..x', '...x..x', '.xxx.xx', 'xxxxxxx', '.xx.xx.'],
  },
  cursor: { rows: ['x...', 'xx..', 'xxx.', 'xxxx', 'xxx.', 'xx..', 'x...'] },
  back: { rows: ['...x', '..xx', '.xxx', 'xxxx', '.xxx', '..xx', '...x'] },
  down: { rows: ['xxxxxxx', '.xxxxx.', '..xxx..', '...x...'] },
  play: { rows: ['x....', 'xxx..', 'xxxxx', 'xxx..', 'x....'] },
  stop: { rows: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
  close: { rows: ['x.....x', 'xx...xx', '.xx.xx.', '..xxx..', '.xx.xx.', 'xx...xx', 'x.....x'] },
  check: { rows: ['......x', '.....xx', 'x...xx.', 'xx.xx..', '.xxx...', '..x....'] },
  box: {
    rows: ['.rr..rr.', '..rrrr..', 'oooooooo', 'obbrrbbo', 'obbrrbbo', 'obbrrbbo', 'obbrrbbo', 'oooooooo'],
    palette: { r: '#ff5a5f', b: '#ffd6e0', o: INK },
  },
  camera: {
    rows: ['..xxx...', 'xxxxxxxx', 'x..www.x', 'x.w..w.x', 'x.w..w.x', 'x..www.x', 'xxxxxxxx'],
    palette: { w: '#ffe3ea' },
  },
  sound: { rows: ['...x...', '..xx.x.', 'xxxx..x', 'xxxx.x.', 'xxxx..x', '..xx.x.', '...x...'] },
  mute: { rows: ['...x...', '..xx...', 'xxxx.x.', 'xxxx..x', 'xxxx.x.', '..xx...', '...x...'] },
  sakura: {
    rows: ['...p...', '.p.p.p.', '.ppppp.', 'ppcycpp', '.ppppp.', '.pp.pp.', 'p.....p'],
    palette: { p: '#ffb7c5', c: '#d6608a', y: '#ffd25a' },
  },
} satisfies Record<string, Glyph>;

export type GlyphName = keyof typeof GLYPHS;

/** Horizontal runs per row so an SVG needs few rects. */
export function glyphRuns(g: Glyph): { x: number; y: number; w: number; fill: string }[] {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  g.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') { x++; continue; }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = ch === 'x' ? 'currentColor' : (g.palette?.[ch] ?? 'currentColor');
      out.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return out;
}

export function glyphSize(g: Glyph): { w: number; h: number } {
  return { w: Math.max(...g.rows.map((r) => r.length)), h: g.rows.length };
}
