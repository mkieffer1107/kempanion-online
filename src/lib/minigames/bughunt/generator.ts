// Procedural Bug Hunt rounds: pick a template, plant exactly one bug of a given type, and write
// Piggy 3's one-line explanation. Pure and deterministic for a seed (testable with bun).
import { BUG_TYPES, TEMPLATES, type BugType, type Template } from './templates';

export { BUG_TYPES, TEMPLATES, type BugType, type Template };

export interface BugRound {
  templateId: string;
  title: string;
  bug: BugType;
  /** The program as shown, with exactly one broken line. */
  lines: string[];
  /** The fixed program. */
  correct: string[];
  /** Index of the broken line. */
  bugLine: number;
  /** Piggy 3's one-liner (may contain `code` spans). */
  explanation: string;
  /** Three line indices to highlight when the hint is used (always includes bugLine). */
  hintLines: number[];
}

type Rand = () => number;

function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const pick = <T,>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length) % list.length];

/** A candidate mutation: which line becomes what, and why it is wrong. */
interface Site { line: number; to: string; why: string }

/** Mask string literals and comments so mutators never touch them. */
function codePart(line: string): string {
  let out = '';
  let quote: string | null = null;
  for (const ch of line) {
    if (quote) {
      out += ' ';
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += ' ';
    } else if (ch === '#') {
      break;
    } else out += ch;
  }
  return out.padEnd(line.length, ' ');
}

const KEYWORDS = ['return', 'print', 'while', 'range'];

function swapInner(word: string, k: number): string | null {
  // swap letters k and k+1 (both inside the word, never the first letter)
  if (k < 1 || k + 1 >= word.length) return null;
  const a = word[k];
  const b = word[k + 1];
  if (a === b || !/[a-z]/.test(a) || !/[a-z]/.test(b)) return null;
  return word.slice(0, k) + b + a + word.slice(k + 2);
}

const TYPO_WHY = [
  'Okay, so `{bad}` is a typo for `{good}`. The computer does not autocorrect. Sadly.',
  'Actually, that says `{bad}`. It should be `{good}`. One swapped letter breaks the whole build.',
  'Typo! `{bad}` should be `{good}`. I only spotted it because I do this constantly.',
];

function typoSites(t: Template): Site[] {
  const counts = new Map<string, number>();
  const masked = t.lines.map(codePart);
  for (const m of masked) for (const w of m.match(/[A-Za-z_][A-Za-z_0-9]*/g) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  const sites: Site[] = [];
  masked.forEach((m, li) => {
    const re = /[A-Za-z_][A-Za-z_0-9]*/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(m))) {
      const w = match[0];
      if (w.length < 4 || w.includes('_') || !/^[a-z]+$/.test(w)) continue;
      if (!KEYWORDS.includes(w) && (counts.get(w) ?? 0) < 2) continue;
      for (let k = 1; k < w.length - 1; k++) {
        const bad = swapInner(w, k);
        if (!bad || counts.has(bad)) continue;
        const line = t.lines[li];
        const to = line.slice(0, match.index) + bad + line.slice(match.index + w.length);
        const why = pick(mulberry32(hash32(t.id + w + k)), TYPO_WHY).replace('{bad}', bad).replace('{good}', w);
        sites.push({ line: li, to, why });
        break;
      }
    }
  });
  return sites;
}

function constantSites(t: Template): Site[] {
  return (t.constants ?? []).flatMap((c) => {
    const line = t.lines[c.line];
    const re = new RegExp(`(?<![\\w.])${c.from}(?![\\w.])`);
    const masked = codePart(line);
    const m = re.exec(masked);
    if (!m) return [];
    return [{ line: c.line, to: line.slice(0, m.index) + c.to + line.slice(m.index + c.from.length), why: c.why }];
  });
}

const FLIP: Record<string, string> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };

function flipSites(t: Template): Site[] {
  const sites: Site[] = [];
  t.lines.forEach((line, li) => {
    const m = /^(\s*)(if|elif|while)\b/.exec(line);
    if (!m) return;
    const masked = codePart(line);
    const op = / (<=|>=|<|>) /.exec(masked);
    if (!op) return;
    const fixed = op[1];
    const bad = FLIP[fixed];
    const to = line.slice(0, op.index + 1) + bad + line.slice(op.index + 1 + fixed.length);
    const why = t.explain?.flipped_comparison ?? `Actually, the comparison is flipped. \`${bad}\` should be \`${fixed}\`, so it does the exact opposite.`;
    sites.push({ line: li, to, why });
  });
  return sites;
}

function equalsSites(t: Template): Site[] {
  const sites: Site[] = [];
  t.lines.forEach((line, li) => {
    const idx = codePart(line).indexOf(' == ');
    if (idx < 0) return;
    const to = line.slice(0, idx) + ' = ' + line.slice(idx + 4);
    const why = t.explain?.assign_vs_equals ?? 'Wait— that is `=`, which assigns. Checking needs `==`. Classic one.';
    sites.push({ line: li, to, why });
  });
  return sites;
}

function plusEqualsSites(t: Template): Site[] {
  const sites: Site[] = [];
  t.lines.forEach((line, li) => {
    const m = /^(\s*)([\w.[\]]+) \+= (.+)$/.exec(line);
    if (!m) return;
    const to = `${m[1]}${m[2]} = ${m[3]}`;
    const why = t.explain?.assign_vs_plus_equals ?? `Actually, \`=\` overwrites \`${m[2]}\` every time. It should add with \`+=\`.`;
    sites.push({ line: li, to, why });
  });
  return sites;
}

function incrementSites(t: Template): Site[] {
  const loop = t.lines.find((l) => /^\s*while\b/.test(l));
  if (!loop) return [];
  const sites: Site[] = [];
  t.lines.forEach((line, li) => {
    const m = /^(\s*)(\w+) (\+|-)= (\w+)$/.exec(line);
    if (!m || !new RegExp(`\\b${m[2]}\\b`).test(loop)) return;
    const to = `${m[1]}${m[2]} ${m[3]} ${m[4]}`;
    const why = t.explain?.missing_increment
      ?? `Okay, so \`${m[2]} ${m[3]} ${m[4]}\` computes a number and throws it away. \`${m[2]}\` never changes, so the loop runs forever.`;
    sites.push({ line: li, to, why });
  });
  return sites;
}

function swapSites(t: Template): Site[] {
  const sites: Site[] = [];
  const defs = new Map<string, [string, string]>();
  for (const line of t.lines) {
    const m = /^def (\w+)\((\w+), (\w+)\):$/.exec(line.trim());
    if (m) defs.set(m[1], [m[2], m[3]]);
  }
  t.lines.forEach((line, li) => {
    if (/^\s*def /.test(line)) return;
    for (const [fn, [p1, p2]] of defs) {
      const re = new RegExp(`\\b${fn}\\(([\\w.]+), ([\\w.]+)\\)`);
      const m = re.exec(line);
      if (!m || m[1] === m[2]) continue;
      const to = line.slice(0, m.index) + `${fn}(${m[2]}, ${m[1]})` + line.slice(m.index + m[0].length);
      const why = t.explain?.swapped_args ?? `The arguments are swapped. \`${fn}\` wants ${p1} first, then ${p2}.`;
      sites.push({ line: li, to, why });
    }
  });
  return sites;
}

function offByOneSites(t: Template): Site[] {
  const sites: Site[] = [...(t.offByOne ?? []).map((s) => ({ line: s.line, to: s.to, why: s.why }))];
  t.lines.forEach((line, li) => {
    const r = /range\(len\((\w+)\)\)/.exec(line);
    if (r) {
      const to = line.replace(r[0], `range(len(${r[1]}) - 1)`);
      const why = t.explain?.off_by_one ?? `Actually, that is an off-by-one. \`- 1\` makes the loop skip the last item in \`${r[1]}\`.`;
      sites.push({ line: li, to, why });
    }
    const w = /^(\s*while \w+ )<( len\(\w+\):)$/.exec(line);
    if (w) {
      const why = t.explain?.off_by_one ?? 'Off-by-one: `<=` reads one past the end of the list. Index out of range. Classic.';
      sites.push({ line: li, to: `${w[1]}<=${w[2]}`, why });
    }
  });
  return sites;
}

const FINDERS: Record<BugType, (t: Template) => Site[]> = {
  typo: typoSites,
  wrong_constant: constantSites,
  flipped_comparison: flipSites,
  assign_vs_equals: equalsSites,
  assign_vs_plus_equals: plusEqualsSites,
  swapped_args: swapSites,
  missing_increment: incrementSites,
  off_by_one: offByOneSites,
};

/** All valid bug sites of a type in a template (each changes exactly one line). */
export function bugSites(t: Template, bug: BugType): Site[] {
  return FINDERS[bug](t).filter((s) => s.line >= 0 && s.line < t.lines.length && s.to !== t.lines[s.line]);
}

/** Bug types a template supports. */
export function supportedBugs(t: Template): BugType[] {
  return BUG_TYPES.filter((b) => bugSites(t, b).length > 0);
}

/** Plant one bug of the given type in a template (null if it has no site for it). */
export function makeRound(t: Template, bug: BugType, rand: Rand): BugRound | null {
  const sites = bugSites(t, bug);
  if (!sites.length) return null;
  const site = pick(rand, sites);
  const lines = t.lines.slice();
  lines[site.line] = site.to;
  const others = t.lines.map((_, i) => i).filter((i) => i !== site.line);
  const hint = new Set([site.line]);
  while (hint.size < Math.min(3, t.lines.length)) hint.add(pick(rand, others));
  return {
    templateId: t.id,
    title: t.title,
    bug,
    lines,
    correct: t.lines.slice(),
    bugLine: site.line,
    explanation: site.why,
    hintLines: [...hint].sort((a, b) => a - b),
  };
}

/** Difficulty curve: rounds 1–3 spot-the-typo, 4–7 logic bugs, 8–10 off-by-ones (and friends). */
export function bugTierFor(round: number): readonly BugType[] {
  if (round < 3) return ['typo', 'wrong_constant'];
  if (round < 7) return ['flipped_comparison', 'assign_vs_equals', 'assign_vs_plus_equals', 'swapped_args', 'missing_increment'];
  return round === 7 ? ['off_by_one'] : ['off_by_one', 'missing_increment', 'swapped_args', 'flipped_comparison'];
}

/** A full Bug Hunt run: `rounds` rounds, no template repeats, deterministic for the seed. */
export function generateGame(seed: number | string, rounds = 10): BugRound[] {
  const rand = mulberry32(typeof seed === 'number' ? seed >>> 0 : hash32(seed));
  const used = new Set<string>();
  const out: BugRound[] = [];
  let lastBug: BugType | null = null;
  for (let r = 0; r < rounds; r++) {
    const tier = bugTierFor(r).filter((b) => b !== lastBug || bugTierFor(r).length === 1);
    let round: BugRound | null = null;
    for (let attempt = 0; attempt < 40 && !round; attempt++) {
      const bug = pick(rand, tier);
      const pool = TEMPLATES.filter((t) => !used.has(t.id) && bugSites(t, bug).length);
      if (!pool.length) continue;
      round = makeRound(pick(rand, pool), bug, rand);
    }
    if (!round) {
      // Fall back to any unused template and any bug it supports.
      const t = TEMPLATES.find((x) => !used.has(x.id)) ?? TEMPLATES[r % TEMPLATES.length];
      round = makeRound(t, pick(rand, supportedBugs(t)), rand);
    }
    if (!round) continue;
    used.add(round.templateId);
    lastBug = round.bug;
    out.push(round);
  }
  return out;
}
