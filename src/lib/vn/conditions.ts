// [if] conditions for KScript: parsed once when a scene loads, evaluated against live game state.
// Pure TypeScript (no DOM / Vite APIs) so bun tests can import it.
//
//   bond(piggy-2) >= 5        hearts (0–10); `hearts(pig)` is an alias; bare `bond`/`hearts` = the scene's pig
//   points(piggy-1) > 250     raw bond points
//   flag(met_p2)  !flag(x)    truthy test; `flag(score) >= 2`, `flag(major) = computing` compare the value
//   met_p2                    a bare word is a flag test too
//   item(pub_sub) >= 1        inventory count     seen(p1_h3)   sick(piggy-2)   need(piggy-2, energy) < 30
//   money >= 20   chapter >= 2   days >= 3   month = 10,11   day = 31   hour >= 17   replay
//   time = day,morning   slot = dusk   weekday = sat,sun   companion = piggy-2 | none   location = plaza
//   a && b   a and b   a || b   a or b   !a   not a   ( … )   true   false
import { NEED_IDS, PIG_IDS, type NeedId, type PigId, type TimeOfDay } from '../types';
import { WEEKDAYS, type Weekday } from '../time';
import type { ScheduleSlot } from '../content/locations';

export type CmpOp = '>=' | '<=' | '>' | '<' | '=' | '!=';
export type CondValue = number | string;

export type Term =
  | { f: 'hearts' | 'points'; pig: PigId | null }
  | { f: 'sick'; pig: PigId }
  | { f: 'need'; pig: PigId; need: NeedId }
  | { f: 'flag'; name: string }
  | { f: 'item'; id: string }
  | { f: 'seen'; id: string }
  | { f: 'money' | 'chapter' | 'days' | 'month' | 'day' | 'hour' | 'replay' | 'time' | 'slot' | 'weekday' | 'companion' | 'location' };

export type Cond =
  | { k: 'and' | 'or'; a: Cond; b: Cond }
  | { k: 'not'; a: Cond }
  | { k: 'const'; v: boolean }
  | { k: 'term'; term: Term; op?: CmpOp; values?: CondValue[] };

/** Live state a condition reads. The runner implements it over the game store; tests use plain objects. */
export interface CondState {
  hearts(pig: PigId): number;
  points(pig: PigId): number;
  sick(pig: PigId): boolean;
  need(pig: PigId, need: NeedId): number;
  flag(name: string): boolean | number | string | undefined;
  item(id: string): number;
  seen(id: string): boolean;
  money(): number;
  chapter(): number;
  days(): number;
  month(): number;
  day(): number;
  hour(): number;
  replay(): boolean;
  time(): TimeOfDay;
  slot(): ScheduleSlot;
  weekday(): Weekday;
  companion(): PigId | null;
  location(): string;
}

export class CondError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CondError';
  }
}

export const TIMES: readonly TimeOfDay[] = ['morning', 'day', 'evening', 'night'];
export const SLOTS: readonly ScheduleSlot[] = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night', 'owl'];

const NUMERIC_KEYWORDS = ['money', 'chapter', 'days', 'month', 'day', 'hour'] as const;
const STRING_KEYWORDS = ['time', 'slot', 'weekday', 'companion', 'location'] as const;
const FUNCTIONS = ['bond', 'hearts', 'points', 'flag', 'item', 'seen', 'need', 'sick'] as const;

const NEED_ALIASES: Record<string, NeedId> = { tummy: 'hunger', food: 'hunger', clean: 'hygiene', sleep: 'energy' };

/** Accepts mon..sun and full day names. */
export function normalizeWeekday(v: string): Weekday | null {
  const s = v.toLowerCase().slice(0, 3);
  return (WEEKDAYS as readonly string[]).includes(s) ? (s as Weekday) : null;
}

export function normalizeNeed(v: string): NeedId | null {
  const s = v.toLowerCase();
  if ((NEED_IDS as readonly string[]).includes(s)) return s as NeedId;
  return NEED_ALIASES[s] ?? null;
}

// ───────── tokenizer ─────────

type Tok = { t: 'id' | 'num' | 'str' | 'op' | 'p'; v: string };

const isIdStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdChar = (c: string) => /[A-Za-z0-9_.\-]/.test(c);

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const prevIsOperand = () => {
    const p = out[out.length - 1];
    return !!p && (p.t === 'id' || p.t === 'num' || p.t === 'str' || p.v === ')');
  };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'" || c === '“') {
      const close = c === '“' ? '”' : c;
      const j = src.indexOf(close, i + 1);
      if (j < 0) throw new CondError('unclosed quote in condition');
      out.push({ t: 'str', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || ((c === '-' || c === '+') && /[0-9]/.test(src[i + 1] ?? '') && !prevIsOperand())) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < src.length && isIdChar(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['>=', '<=', '!=', '==', '&&', '||'].includes(two)) {
      out.push({ t: 'op', v: two === '==' ? '=' : two });
      i += 2;
      continue;
    }
    if ('<>=!'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    if ('(),'.includes(c)) { out.push({ t: 'p', v: c }); i++; continue; }
    throw new CondError(`unexpected "${c}" in condition`);
  }
  return out;
}

// ───────── parser ─────────

const CMP: readonly string[] = ['>=', '<=', '>', '<', '=', '!='];

class CondParser {
  i = 0;
  toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }
  peek(): Tok | undefined { return this.toks[this.i]; }
  next(): Tok | undefined { return this.toks[this.i++]; }
  isWord(t: Tok | undefined, ...words: string[]) { return !!t && t.t === 'id' && words.includes(t.v.toLowerCase()); }
  expect(v: string) {
    const t = this.next();
    if (!t || t.v !== v) throw new CondError(`expected "${v}"${t ? ` but found "${t.v}"` : ' at the end'}`);
  }

  or(): Cond {
    let a = this.and();
    for (;;) {
      const t = this.peek();
      if ((t?.t === 'op' && t.v === '||') || this.isWord(t, 'or')) { this.i++; a = { k: 'or', a, b: this.and() }; }
      else return a;
    }
  }
  and(): Cond {
    let a = this.unary();
    for (;;) {
      const t = this.peek();
      if ((t?.t === 'op' && t.v === '&&') || this.isWord(t, 'and')) { this.i++; a = { k: 'and', a, b: this.unary() }; }
      else return a;
    }
  }
  unary(): Cond {
    const t = this.peek();
    if ((t?.t === 'op' && t.v === '!') || this.isWord(t, 'not')) { this.i++; return { k: 'not', a: this.unary() }; }
    return this.primary();
  }
  primary(): Cond {
    const t = this.next();
    if (!t) throw new CondError('condition ends too early');
    if (t.t === 'p' && t.v === '(') { const c = this.or(); this.expect(')'); return c; }
    if (t.t !== 'id') throw new CondError(`unexpected "${t.v}" in condition`);
    const word = t.v.toLowerCase();
    if (word === 'true' || word === 'false') return { k: 'const', v: word === 'true' };
    let term: Term;
    if (this.peek()?.v === '(') {
      this.i++;
      const args: string[] = [];
      while (this.peek() && this.peek()!.v !== ')') {
        const a = this.next()!;
        if (a.t === 'p' && a.v === ',') continue;
        if (a.t !== 'id' && a.t !== 'num' && a.t !== 'str') throw new CondError(`unexpected "${a.v}" in ${word}(…)`);
        args.push(a.v);
      }
      this.expect(')');
      term = makeFunctionTerm(word, args);
    } else {
      term = makeKeywordTerm(t.v);
    }
    const op = this.peek();
    if (op?.t === 'op' && CMP.includes(op.v)) {
      this.i++;
      const values: CondValue[] = [this.value()];
      while (this.peek()?.v === ',') { this.i++; values.push(this.value()); }
      return finishTerm(term, op.v as CmpOp, values);
    }
    return finishTerm(term);
  }
  value(): CondValue {
    const t = this.next();
    if (!t || (t.t !== 'num' && t.t !== 'id' && t.t !== 'str')) throw new CondError('expected a value after the comparison');
    return t.t === 'num' ? Number(t.v) : t.v;
  }
}

function pigArg(fn: string, v: string | undefined): PigId {
  if (v && (PIG_IDS as readonly string[]).includes(v)) return v as PigId;
  throw new CondError(`${fn}(…) needs a pig id (piggy-1, piggy-2 or piggy-3)${v ? `, got "${v}"` : ''}`);
}

function makeFunctionTerm(fn: string, args: string[]): Term {
  switch (fn) {
    case 'bond': case 'hearts': return { f: 'hearts', pig: pigArg(fn, args[0]) };
    case 'points': return { f: 'points', pig: pigArg(fn, args[0]) };
    case 'sick': return { f: 'sick', pig: pigArg(fn, args[0]) };
    case 'need': {
      const need = normalizeNeed(args[1] ?? '');
      if (!need) throw new CondError(`need(pig, need): need must be one of ${NEED_IDS.join(', ')}`);
      return { f: 'need', pig: pigArg(fn, args[0]), need };
    }
    case 'flag': case 'item': case 'seen': {
      if (args.length !== 1) throw new CondError(`${fn}(…) takes exactly one name`);
      return fn === 'flag' ? { f: 'flag', name: args[0] } : fn === 'item' ? { f: 'item', id: args[0] } : { f: 'seen', id: args[0] };
    }
  }
  throw new CondError(`unknown function "${fn}(…)" (known: ${FUNCTIONS.join(', ')})`);
}

function makeKeywordTerm(word: string): Term {
  const w = word.toLowerCase();
  if (w === 'bond' || w === 'hearts') return { f: 'hearts', pig: null };
  if (w === 'points') return { f: 'points', pig: null };
  if (w === 'replay') return { f: 'replay' };
  if ((NUMERIC_KEYWORDS as readonly string[]).includes(w) || (STRING_KEYWORDS as readonly string[]).includes(w)) {
    return { f: w as (typeof NUMERIC_KEYWORDS)[number] | (typeof STRING_KEYWORDS)[number] };
  }
  return { f: 'flag', name: word };
}

function finishTerm(term: Term, op?: CmpOp, values?: CondValue[]): Cond {
  const name = term.f;
  if (op && (name === 'seen' || name === 'sick' || name === 'replay')) {
    throw new CondError(`${name} takes no comparison`);
  }
  const numeric = name === 'hearts' || name === 'points' || name === 'need' || name === 'item' || (NUMERIC_KEYWORDS as readonly string[]).includes(name);
  if (op && values) {
    if (numeric && values.some((v) => typeof v !== 'number')) throw new CondError(`${name} compares with numbers`);
    if (values.length > 1 && op !== '=' && op !== '!=') throw new CondError('value lists only work with = or !=');
    if ((STRING_KEYWORDS as readonly string[]).includes(name)) {
      if (op !== '=' && op !== '!=') throw new CondError(`${name} only supports = and !=`);
      values = values.map((v) => checkKeywordValue(name, String(v)));
    }
  } else if (op || values) {
    throw new CondError('incomplete comparison');
  }
  return op ? { k: 'term', term, op, values } : { k: 'term', term };
}

function checkKeywordValue(name: string, v: string): string {
  const s = v.toLowerCase();
  if (name === 'time' && !(TIMES as readonly string[]).includes(s)) throw new CondError(`time must be one of ${TIMES.join(', ')}`);
  if (name === 'slot' && !(SLOTS as readonly string[]).includes(s)) throw new CondError(`slot must be one of ${SLOTS.join(', ')}`);
  if (name === 'weekday') {
    const d = normalizeWeekday(s);
    if (!d) throw new CondError(`weekday must be one of ${WEEKDAYS.join(', ')}`);
    return d;
  }
  if (name === 'companion' && s !== 'none' && !(PIG_IDS as readonly string[]).includes(s)) {
    throw new CondError('companion must be piggy-1, piggy-2, piggy-3 or none');
  }
  return s;
}

/** Parse a condition expression. Throws CondError with a human message on bad syntax. */
export function parseCondition(src: string): Cond {
  const text = src.trim();
  if (!text) throw new CondError('empty condition');
  const p = new CondParser(tokenize(text));
  const c = p.or();
  if (p.peek()) throw new CondError(`unexpected "${p.peek()!.v}" in condition`);
  return c;
}

// ───────── evaluation ─────────

function termValue(term: Term, s: CondState, scenePig: PigId | null): number | string | boolean | undefined {
  switch (term.f) {
    case 'hearts': case 'points': {
      const read = term.f === 'hearts' ? s.hearts : s.points;
      const pig = term.pig ?? scenePig;
      // No pig at all (trio scene): everyone must meet the bar → compare against the minimum.
      return pig ? read(pig) : Math.min(...PIG_IDS.map((p) => read(p)));
    }
    case 'sick': return s.sick(term.pig);
    case 'need': return s.need(term.pig, term.need);
    case 'flag': return s.flag(term.name);
    case 'item': return s.item(term.id);
    case 'seen': return s.seen(term.id);
    case 'money': return s.money();
    case 'chapter': return s.chapter();
    case 'days': return s.days();
    case 'month': return s.month();
    case 'day': return s.day();
    case 'hour': return s.hour();
    case 'replay': return s.replay();
    case 'time': return s.time();
    case 'slot': return s.slot();
    case 'weekday': return s.weekday();
    case 'companion': return s.companion() ?? 'none';
    case 'location': return s.location();
  }
}

function truthy(v: unknown): boolean {
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v !== '' && v !== 'false' && v !== '0';
  return !!v;
}

function cmp(left: unknown, op: CmpOp, right: CondValue): boolean {
  if (typeof right === 'number') {
    const l = typeof left === 'boolean' ? Number(left) : left === undefined ? 0 : Number(left);
    if (Number.isNaN(l)) return op === '!=';
    switch (op) {
      case '>=': return l >= right;
      case '<=': return l <= right;
      case '>': return l > right;
      case '<': return l < right;
      case '=': return l === right;
      case '!=': return l !== right;
    }
  }
  const l = left === undefined ? '' : String(left).toLowerCase();
  const r = right.toLowerCase();
  if (op === '=') return l === r;
  if (op === '!=') return l !== r;
  return false;
}

/** Evaluate a parsed condition. `scenePig` resolves bare `bond`/`hearts` (null = every pig). */
export function evalCondition(c: Cond, s: CondState, scenePig: PigId | null = null): boolean {
  switch (c.k) {
    case 'const': return c.v;
    case 'not': return !evalCondition(c.a, s, scenePig);
    case 'and': return evalCondition(c.a, s, scenePig) && evalCondition(c.b, s, scenePig);
    case 'or': return evalCondition(c.a, s, scenePig) || evalCondition(c.b, s, scenePig);
    case 'term': {
      const v = termValue(c.term, s, scenePig);
      if (!c.op || !c.values) return truthy(v);
      if (c.op === '!=') return c.values.every((r) => cmp(v, '!=', r));
      return c.values.some((r) => cmp(v, c.op!, r));
    }
  }
}

/** Every term in a condition (the validator checks referenced items, flags, scenes, locations). */
export function condTerms(c: Cond, out: { term: Term; values?: CondValue[] }[] = []): { term: Term; values?: CondValue[] }[] {
  if (c.k === 'term') out.push({ term: c.term, values: c.values });
  else if (c.k === 'not') condTerms(c.a, out);
  else if (c.k === 'and' || c.k === 'or') { condTerms(c.a, out); condTerms(c.b, out); }
  return out;
}
