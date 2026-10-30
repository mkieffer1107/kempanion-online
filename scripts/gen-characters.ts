#!/usr/bin/env bun
/**
 * characters/piggy-*.md → src/generated/characters.json
 *
 * The personality files are the source of truth for each pig's profile and voice. This extracts the
 * frontmatter (profile card data), the "Compact character prompt" blockquote (LLM system prompt core),
 * and the "Sample dialogue" table (few-shot examples / heuristic seed lines).
 * Runs automatically before `dev` and `build`.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const dir = join(root, 'characters');

type Scalar = string | number | boolean;
type Value = Scalar | Scalar[] | Record<string, Scalar>;

function parseScalar(s: string): Scalar {
  const t = s.trim();
  if (/^".*"$/.test(t) || /^'.*'$/.test(t)) return t.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t === 'true' || t === 'false') return t === 'true';
  return t;
}

/** Split on commas that are not inside quotes or brackets. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let cur = '', depth = 0, q: string | null = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"') { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseValue(raw: string): Value {
  const t = raw.trim();
  if (t.startsWith('[') && t.endsWith(']')) return splitTop(t.slice(1, -1)).map(parseScalar);
  if (t.startsWith('{') && t.endsWith('}')) {
    const obj: Record<string, Scalar> = {};
    for (const part of splitTop(t.slice(1, -1))) {
      const i = part.indexOf(':');
      if (i > 0) obj[part.slice(0, i).trim()] = parseScalar(part.slice(i + 1));
    }
    return obj;
  }
  return parseScalar(t);
}

function section(md: string, title: RegExp): string {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && title.test(l));
  if (start < 0) return '';
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

const out: Record<string, unknown> = {};
for (const f of readdirSync(dir).filter((f) => /^piggy-\d\.md$/.test(f)).sort()) {
  const md = readFileSync(join(dir, f), 'utf8');
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(md);
  if (!fm) throw new Error(`${f}: missing frontmatter`);
  const meta: Record<string, Value> = {};
  for (const line of fm[1].split('\n')) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (m) meta[m[1]] = parseValue(m[2]);
  }
  const prompt = section(md, /Compact character prompt/i)
    .split('\n')
    .filter((l) => l.startsWith('>'))
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const samples = section(md, /Sample dialogue/i)
    .split('\n')
    .filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .filter((cells) => cells.length >= 2 && !/^beat$/i.test(cells[0]))
    .map(([beat, line]) => ({ beat, line: line.replace(/^["“]|["”]$/g, '') }));
  const summary = /\*\*(.+?)\*\*/.exec(md.slice(fm[0].length))?.[1] ?? '';
  const id = f.replace(/\.md$/, '');
  if (!prompt) throw new Error(`${f}: missing "Compact character prompt" blockquote`);
  out[id] = { id, ...meta, summary, prompt, samples };
  console.log(`✓ ${id}: ${samples.length} sample lines, prompt ${prompt.length} chars`);
}

mkdirSync(join(root, 'src/generated'), { recursive: true });
writeFileSync(join(root, 'src/generated/characters.json'), JSON.stringify(out, null, 1) + '\n');
