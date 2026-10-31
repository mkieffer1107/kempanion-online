// KScript: the line-based scene language (docs/ARCHITECTURE.md §4). Parser + compiler to a flat program.
// Pure TypeScript (no DOM, no Vite APIs) so bun tests, the validator and tools can import it.
//
// Additions beyond ARCHITECTURE §4 (all optional; the documented syntax works unchanged):
//   Lines     CRLF/CR, a BOM and tabs (= 2 spaces) are fine. `// comment` works like `# comment`.
//             A command line may hold several commands (`[shake] [sfx surprise]`) and end in `# comment`.
//             `\n` in text is a manual line break. A line longer than ~160 chars is shown as ▼ pages.
//   Choices   `? text [if cond]` only offers the option when cond holds. Choices nest by indentation.
//   If        `[elif cond]`. Condition syntax is documented in conditions.ts (&&, ||, !, parentheses,
//             `time=day,morning`, seen(id), points(pig), need(pig, need), money, chapter, hour, replay…).
//             Bare `bond`/`hearts` mean the scene's `pig`. [else]/[endif] may not be indented less than their [if].
//   Metadata  `summary:` one-line album blurb. Unknown keys are kept (the validator warns).
//   Triggers  see triggers.ts (hearts(pig)>=N, chapter>=N, days>=N, money>=N, item=id, hour=17-19, …).
//   Commands  [bgm id 800] / [bgm stop 800]      fade ms
//             [wait 1.5s]                         ms by default, `s` suffix for seconds; a tap skips long waits
//             [show piggy-1 left]                 expression and position are both optional
//             [hide] / [hide all]                 clear every portrait
//             [expr piggy-1 surprised]            change a shown portrait's expression without a line
//             [nameplate piggy-1 "???"]           scene-local display name; omit the name to reveal his real one
//             [jingle bond_up]                    JingleId sting over ducked BGM
//             [burst hearts]                      hearts|sparkles|zzz|notes|crumbs|bubbles|sweat|anger
//             [fade black 400] [fade clear]       black|white|clear (also out = black, in = clear)
//             [shake 0.6 300] [flash #ffffff 200] optional intensity/colour and ms
//             [weather storm] [petals light] [time auto]
//             [pager feed drink] [pager top] [pager off]  the KempaPager's care keys over the scene, those keys lit
//                                                  (top|bottom|all = whole rows; no keys = shown, none lit)
//             [brain] / [brain off]               the hub's Big Brain chip over the scene, where the hub has it, ringed
//                                                  (live: HEUR, % while installing, BIG); nothing for a "no" to Big Brain
//             [set score += 1] [set score -= 1]   numeric flags
//             [chat piggy-2 "prompt" 4]           optional max turns
//             [input key "prompt" "default"]      default used when the player submits nothing
//             [companion piggy-2]                 set the Kempanion directly ([companion pick] shows the cards)
//             [remember piggy-1 "fact"]           add a memory (`all` = every pig); {tokens} interpolate
//             [call scene_id]                     play another scene inline, then continue
//             aliases: [face] = [expr], [acorns] = [money], [jump] = [goto]
//   Text      {timeofday} {weekday} {flag:name|fallback}, fallbacks on simple tokens ({player|you}), {{ }}.
//
// Runtime rules (runner.ts / interpreter.ts):
//   [bond] in a heart event is uncapped for that pig; elsewhere it respects the heart gate (pet addBondCapped).
//   Heart events must be named p<N>_h<n> (p2_h1 …): the pet module's heart gate looks them up by id.
//   [input key] stores flags['fact.<key>'] and a "key=value" memory (the scene's pig, or all three).
//   [outfit pig x] also sets flag outfit_<x>. [minigame] sets flags minigame_score / minigame_won.
//   [bg id]: an id that is a location's day background goes through stage.setLocation (day/night variants).
//   Album replays (runScene(id, { replay: true })) change nothing in the save: no bond/money/items/needs/
//   memories/name/companion, [input]/[chat] skipped, [set]/[unset] kept in a scene-local overlay.
//   Unknown expressions fall back to neutral (the validator reports them).
import { NEED_IDS, PIG_IDS, type NeedId, type OutfitId, type PigId, type SpeakerId, type TimeOfDay } from '../types';
import type { BurstKind, PetalLevel, PortraitPos, Transition, Weather } from '../engine/stage';
import { CondError, normalizeNeed, parseCondition, TIMES, type Cond } from './conditions';
import { parseTrigger, TriggerError, type TriggerClause } from './triggers';

// ───────── vocabulary ─────────

export const SPEAKERS = ['piggy-1', 'piggy-2', 'piggy-3', 'player', 'narrator'] as const satisfies readonly SpeakerId[];
export const POSITIONS = ['far-left', 'left', 'center', 'right', 'far-right'] as const satisfies readonly PortraitPos[];
export const TRANSITIONS = ['cut', 'fade', 'wipe', 'iris'] as const satisfies readonly Transition[];
export const PETAL_LEVELS = ['off', 'light', 'normal', 'heavy'] as const satisfies readonly PetalLevel[];
export const WEATHERS = ['clear', 'rain', 'storm'] as const satisfies readonly Weather[];
export const BURSTS = ['hearts', 'sparkles', 'zzz', 'notes', 'crumbs', 'bubbles', 'sweat', 'anger'] as const satisfies readonly BurstKind[];
export const OUTFITS = ['everyday', 'volleyball', 'scrubs', 'hoodie'] as const satisfies readonly OutfitId[];
/** The hub's care keys in pager order: top row, then bottom row. */
export const PAGER_KEYS = ['feed', 'drink', 'play', 'wash', 'light', 'care', 'talk', 'stats'] as const;
export type PagerKey = (typeof PAGER_KEYS)[number];

export const META_KEYS = ['title', 'pig', 'heart', 'chapter', 'trio', 'ending', 'trigger', 'priority', 'cg', 'repeat', 'replayable', 'summary'] as const;

export const COMMANDS = [
  'bg', 'bgm', 'show', 'hide', 'expr', 'nameplate', 'sfx', 'jingle', 'wait', 'shake', 'flash', 'fade', 'burst', 'petals', 'weather', 'time',
  'pager', 'brain', 'cg', 'bond', 'money', 'give', 'take', 'need', 'set', 'unset', 'chat', 'minigame', 'outfit', 'name', 'input', 'companion',
  'remember', 'call', 'goto', 'end', 'if', 'elif', 'else', 'endif',
] as const;

// ───────── AST ─────────

export type Command =
  | { kind: 'bg'; id: string; transition?: Transition }
  | { kind: 'bgm'; id: string | null; fadeMs?: number }
  | { kind: 'show'; pig: PigId; outfit?: OutfitId; expression?: string; pos?: PortraitPos }
  | { kind: 'hide'; pig: PigId | null }
  | { kind: 'expr'; pig: PigId; expression: string }
  | { kind: 'nameplate'; pig: PigId; name: string | null }
  | { kind: 'sfx'; id: string }
  | { kind: 'jingle'; id: string }
  | { kind: 'wait'; ms: number }
  | { kind: 'shake'; intensity?: number; ms?: number }
  | { kind: 'flash'; color?: string; ms?: number }
  | { kind: 'fade'; to: 'black' | 'white' | 'clear'; ms?: number }
  | { kind: 'burst'; burst: BurstKind }
  | { kind: 'petals'; level: PetalLevel }
  | { kind: 'weather'; weather: Weather }
  | { kind: 'time'; time: TimeOfDay | 'auto' }
  | { kind: 'pager'; keys: PagerKey[] | null }
  | { kind: 'brain'; on: boolean }
  | { kind: 'cg'; id: string | null }
  | { kind: 'bond'; pig: PigId; n: number }
  | { kind: 'money'; n: number }
  | { kind: 'give' | 'take'; item: string; n: number }
  | { kind: 'need'; pig: PigId; need: NeedId; n: number }
  | { kind: 'set'; name: string; op: '=' | '+=' | '-='; value: boolean | number | string }
  | { kind: 'unset'; name: string }
  | { kind: 'chat'; pig: PigId; prompt?: string; maxTurns?: number }
  | { kind: 'minigame'; id: string }
  | { kind: 'outfit'; pig: PigId; outfit: OutfitId }
  | { kind: 'name' }
  | { kind: 'input'; key: string; prompt?: string; fallback?: string }
  | { kind: 'companion'; pig: PigId | 'pick' }
  | { kind: 'remember'; pig: PigId | 'all'; fact: string }
  | { kind: 'call'; scene: string }
  | { kind: 'goto'; label: string }
  | { kind: 'end' };

export interface ChoiceOption { line: number; text: string; cond?: Cond; body: Node[] }
export interface IfBranch { line: number; cond: Cond | null; body: Node[] }

export type Node =
  | { t: 'say'; line: number; speaker: SpeakerId; expression?: string; delivery?: 'mumble'; text: string }
  | { t: 'cmd'; line: number; cmd: Command }
  | { t: 'label'; line: number; name: string }
  | { t: 'choice'; line: number; options: ChoiceOption[] }
  | { t: 'if'; line: number; branches: IfBranch[] };

/** Flat program the interpreter runs. `branch` jumps to `target` when its condition is FALSE. */
export type Op =
  | { op: 'say'; line: number; speaker: SpeakerId; expression?: string; delivery?: 'mumble'; text: string; key: string }
  | { op: 'cmd'; line: number; cmd: Command }
  | { op: 'choice'; line: number; options: { line: number; text: string; cond?: Cond; target: number }[]; end: number }
  | { op: 'jump'; line: number; target: number }
  | { op: 'branch'; line: number; cond: Cond; target: number }
  | { op: 'end'; line: number };

export interface SceneMeta {
  title: string;
  pig?: PigId;
  /** Heart event number 1–7 for `pig`. */
  heart?: number;
  /** Explicit minimum chapter (heart events derive one when omitted; see triggers.minChapter). */
  chapter?: number;
  trio: boolean;
  ending: boolean;
  trigger?: TriggerClause[];
  /** Effective priority (default 10; heart events 50; trio 40). */
  priority: number;
  /** Album id unlocked when the scene finishes. */
  cg?: string;
  repeat: boolean;
  replayable: boolean;
  summary?: string;
  /** Unknown metadata keys, kept for tools (the validator warns about them). */
  extra: Record<string, string>;
  /** Source line of each metadata key. */
  lines: Record<string, number>;
}

export interface Scene {
  id: string;
  file: string;
  /** Line of the `=== id` header. */
  line: number;
  meta: SceneMeta;
  body: Node[];
  ops: Op[];
  labels: Record<string, number>;
}

export interface KScriptIssue { file: string; line: number; message: string; scene?: string }

export class KScriptError extends Error {
  file: string;
  line: number;
  /** Every error found in the file (the message describes the first). */
  errors: KScriptIssue[];
  constructor(first: KScriptIssue, errors: KScriptIssue[] = [first]) {
    super(`${first.file}:${first.line}: ${first.message}`);
    this.name = 'KScriptError';
    this.file = first.file;
    this.line = first.line;
    this.errors = errors;
  }
}

/** Thrown inside the parser for a single bad line; turned into a KScriptIssue with file:line. */
class LineError extends Error {}

// ───────── helpers ─────────

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** ` (did you mean "x"?)` when a close match exists, else ''. */
export function didYouMean(word: string, options: readonly string[]): string {
  let best = '';
  let bestD = Infinity;
  for (const o of options) {
    const d = levenshtein(word.toLowerCase(), o.toLowerCase());
    if (d < bestD) { bestD = d; best = o; }
  }
  return bestD > 0 && bestD <= Math.max(2, Math.floor(word.length / 3)) ? ` (did you mean "${best}"?)` : '';
}

function isPig(v: string): v is PigId {
  return (PIG_IDS as readonly string[]).includes(v);
}

function needPig(raw: string | undefined, cmd: string): PigId {
  const v = raw?.toLowerCase();
  if (v && isPig(v)) return v;
  throw new LineError(`[${cmd}] needs a pig id (piggy-1, piggy-2 or piggy-3)${v ? `, got "${v}"${didYouMean(v, PIG_IDS)}` : ''}`);
}

function oneOf<T extends string>(v: string | undefined, allowed: readonly T[], what: string): T {
  if (v && (allowed as readonly string[]).includes(v)) return v as T;
  throw new LineError(`${what} must be one of ${allowed.join(', ')}${v ? ` (got "${v}"${didYouMean(v, allowed)})` : ''}`);
}

const ID = /^[a-z0-9_]+$/;
function needId(v: string | undefined, what: string): string {
  if (v && ID.test(v)) return v;
  throw new LineError(`${what} must be an id made of a-z, 0-9 and _${v ? ` (got "${v}")` : ''}`);
}

function signedInt(v: string | undefined, what: string): number {
  if (v !== undefined && /^[+-]?\d+$/.test(v)) return Number(v);
  throw new LineError(`${what} must be a whole number like +5 or -3${v ? ` (got "${v}")` : ''}`);
}

function ms(v: string | undefined, what: string): number {
  const m = v ? /^(\d+(?:\.\d+)?)(ms|s)?$/.exec(v) : null;
  if (!m) throw new LineError(`${what} must be a duration like 400 or 1.5s${v ? ` (got "${v}")` : ''}`);
  return Math.round(Number(m[1]) * (m[2] === 's' ? 1000 : 1));
}

function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === '“' && t.endsWith('”'))) && !t.slice(1, -1).includes('"')) {
    return t.slice(1, -1);
  }
  return t;
}

function textOf(raw: string): string {
  return unquote(raw).replace(/\\n/g, '\n');
}

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// ───────── lexing ─────────

interface Line { no: number; indent: number; text: string }

function lex(src: string): Line[] {
  const out: Line[] = [];
  const rows = src.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx];
    let indent = 0;
    let i = 0;
    for (; i < raw.length; i++) {
      const c = raw[i];
      if (c === ' ' || c === ' ') indent += 1;
      else if (c === '\t') indent += 2;
      else break;
    }
    const text = raw.slice(i).replace(/\s+$/, '');
    if (!text || text.startsWith('#') || text.startsWith('//')) continue;
    out.push({ no: idx + 1, indent, text });
  }
  return out;
}

interface Tok { v: string; q: boolean }

const OPEN_QUOTES = new Set(['"', '“']);
const CLOSE_FOR: Record<string, string> = { '"': '"', '“': '”' };

/** Split `[a] [b "x]y"]  # c` into bracket bodies, honouring quotes. */
function splitBrackets(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#' || text.startsWith('//', i)) break;
    if (c !== '[') throw new LineError(`unexpected text after a command: "${text.slice(i)}" (put dialogue on its own line)`);
    let j = i + 1;
    let quote: string | null = null;
    for (; j < text.length; j++) {
      const d = text[j];
      if (quote) { if (d === quote) quote = null; continue; }
      if (OPEN_QUOTES.has(d)) { quote = CLOSE_FOR[d]; continue; }
      if (d === ']') break;
      if (d === '[') throw new LineError('"[" inside a command (missing "]"?)');
    }
    if (j >= text.length) throw new LineError(quote ? 'unclosed quote in command' : 'missing "]"');
    out.push(text.slice(i + 1, j).trim());
    i = j + 1;
  }
  return out;
}

function tokenize(inner: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < inner.length) {
    const c = inner[i];
    if (/\s/.test(c)) { i++; continue; }
    if (OPEN_QUOTES.has(c)) {
      const close = CLOSE_FOR[c];
      let j = i + 1;
      let s = '';
      while (j < inner.length && inner[j] !== close) {
        if (inner[j] === '\\' && j + 1 < inner.length) { s += inner[j + 1] === 'n' ? '\n' : inner[j + 1]; j += 2; continue; }
        s += inner[j++];
      }
      if (j >= inner.length) throw new LineError('unclosed quote in command');
      out.push({ v: s, q: true });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < inner.length && !/\s/.test(inner[j])) j++;
    out.push({ v: inner.slice(i, j), q: false });
    i = j;
  }
  return out;
}

// ───────── commands ─────────

function parseSetValue(raw: string): boolean | number | string {
  const v = raw.trim();
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return unquote(v);
}

function parseCommand(inner: string): Command {
  const sp = inner.search(/\s/);
  const name = (sp < 0 ? inner : inner.slice(0, sp)).toLowerCase();
  const rest = sp < 0 ? '' : inner.slice(sp + 1).trim();

  if (name === 'set') {
    const m = /^([A-Za-z_][\w.:-]*)\s*(?:(\+=|-=|=)\s*(.+))?$/.exec(rest);
    if (!m) throw new LineError('[set] expects [set name], [set name = value] or [set name += n]');
    if (!m[2]) return { kind: 'set', name: m[1], op: '=', value: true };
    const value = parseSetValue(m[3]);
    if (m[2] !== '=' && typeof value !== 'number') throw new LineError(`[set ${m[1]} ${m[2]} …] needs a number`);
    return { kind: 'set', name: m[1], op: m[2] as '=' | '+=' | '-=', value };
  }

  const toks = tokenize(rest);
  const a = toks.map((t) => t.v);
  const arity = (min: number, max: number, usage: string) => {
    if (a.length < min || a.length > max) throw new LineError(`usage: ${usage}`);
  };

  switch (name) {
    case 'bg': {
      arity(1, 2, '[bg id] or [bg id fade|cut|wipe|iris]');
      const transition = a[1] === undefined ? undefined : oneOf(a[1].toLowerCase(), TRANSITIONS, 'transition');
      return { kind: 'bg', id: needId(a[0].toLowerCase(), 'background id'), transition };
    }
    case 'bgm': {
      arity(1, 2, '[bgm song_id], [bgm song_id fadeMs] or [bgm stop]');
      const id = a[0].toLowerCase();
      const fadeMs = a[1] === undefined ? undefined : ms(a[1], 'fade');
      return { kind: 'bgm', id: id === 'stop' || id === 'off' ? null : needId(id, 'song id'), fadeMs };
    }
    case 'show': {
      arity(1, 3, '[show pig[@outfit] expression position]');
      const [pigRaw, outfitRaw] = a[0].split('@');
      const pig = needPig(pigRaw, 'show');
      const outfit = outfitRaw === undefined ? undefined : oneOf(outfitRaw.toLowerCase(), OUTFITS, 'outfit');
      let expression: string | undefined;
      let pos: PortraitPos | undefined;
      for (const t of a.slice(1)) {
        const w = t.toLowerCase();
        if ((POSITIONS as readonly string[]).includes(w)) {
          if (pos) throw new LineError('[show] has two positions');
          pos = w as PortraitPos;
        } else if ((OUTFITS as readonly string[]).includes(w)) {
          throw new LineError(`outfits attach with @: [show ${pig}@${w} …]`);
        } else if (/^[a-z_]+$/.test(w) && !expression) {
          expression = w;
        } else {
          throw new LineError(`[show]: "${t}" is neither an expression nor a position (${POSITIONS.join(', ')})`);
        }
      }
      return { kind: 'show', pig, outfit, expression, pos };
    }
    case 'hide': {
      arity(0, 1, '[hide pig] or [hide all]');
      if (!a.length || a[0].toLowerCase() === 'all') return { kind: 'hide', pig: null };
      return { kind: 'hide', pig: needPig(a[0], 'hide') };
    }
    case 'expr': case 'face': {
      arity(2, 2, '[expr pig expression]');
      return { kind: 'expr', pig: needPig(a[0], 'expr'), expression: a[1].toLowerCase() };
    }
    case 'nameplate': {
      arity(1, 2, '[nameplate pig "name"] or [nameplate pig]');
      return { kind: 'nameplate', pig: needPig(a[0], 'nameplate'), name: a[1] ?? null };
    }
    case 'sfx': arity(1, 1, '[sfx id]'); return { kind: 'sfx', id: needId(a[0].toLowerCase(), 'sfx id') };
    case 'jingle': arity(1, 1, '[jingle id]'); return { kind: 'jingle', id: needId(a[0].toLowerCase(), 'jingle id') };
    case 'wait': arity(1, 1, '[wait ms]'); return { kind: 'wait', ms: ms(a[0], 'wait') };
    case 'shake': {
      arity(0, 2, '[shake], [shake intensity] or [shake intensity ms]');
      const intensity = a[0] === undefined ? undefined : Number(a[0]);
      if (intensity !== undefined && !(intensity >= 0 && intensity <= 1)) throw new LineError('[shake] intensity must be between 0 and 1');
      return { kind: 'shake', intensity, ms: a[1] === undefined ? undefined : ms(a[1], 'shake') };
    }
    case 'flash': {
      arity(0, 2, '[flash], [flash color] or [flash color ms]');
      let color: string | undefined;
      let dur: number | undefined;
      for (const t of a) {
        if (/^\d/.test(t)) dur = ms(t, 'flash');
        else color = t;
      }
      return { kind: 'flash', color, ms: dur };
    }
    case 'fade': {
      arity(1, 2, '[fade black|white|clear] or [fade black ms]');
      const w = a[0].toLowerCase();
      const to = w === 'out' ? 'black' : w === 'in' ? 'clear' : oneOf(w, ['black', 'white', 'clear'] as const, 'fade target');
      return { kind: 'fade', to, ms: a[1] === undefined ? undefined : ms(a[1], 'fade') };
    }
    case 'burst': arity(1, 1, '[burst kind]'); return { kind: 'burst', burst: oneOf(a[0].toLowerCase(), BURSTS, 'burst') };
    case 'petals': arity(1, 1, '[petals heavy|normal|light|off]'); return { kind: 'petals', level: oneOf(a[0].toLowerCase(), PETAL_LEVELS, 'petals') };
    case 'weather': arity(1, 1, '[weather clear|rain|storm]'); return { kind: 'weather', weather: oneOf(a[0].toLowerCase(), WEATHERS, 'weather') };
    case 'time': {
      arity(1, 1, '[time morning|day|evening|night|auto]');
      return { kind: 'time', time: oneOf(a[0].toLowerCase(), [...TIMES, 'auto'] as const, 'time') };
    }
    case 'pager': {
      if (a.length === 1 && a[0].toLowerCase() === 'off') return { kind: 'pager', keys: null };
      const keys: PagerKey[] = [];
      for (const t of a.map((x) => x.toLowerCase())) {
        if (t === 'top') keys.push(...PAGER_KEYS.slice(0, 4));
        else if (t === 'bottom') keys.push(...PAGER_KEYS.slice(4));
        else if (t === 'all') keys.push(...PAGER_KEYS);
        else keys.push(oneOf(t, PAGER_KEYS, 'pager key'));
      }
      return { kind: 'pager', keys: [...new Set(keys)] };
    }
    case 'brain': {
      arity(0, 1, '[brain] or [brain off]');
      return { kind: 'brain', on: oneOf((a[0] ?? 'on').toLowerCase(), ['off', 'on'] as const, '[brain]') === 'on' };
    }
    case 'cg': {
      arity(1, 1, '[cg id] or [cg off]');
      const id = a[0].toLowerCase();
      return { kind: 'cg', id: id === 'off' || id === 'none' ? null : needId(id, 'CG id') };
    }
    case 'bond': arity(2, 2, '[bond pig +n]'); return { kind: 'bond', pig: needPig(a[0], 'bond'), n: signedInt(a[1], 'bond amount') };
    case 'money': case 'acorns': arity(1, 1, '[money +n]'); return { kind: 'money', n: signedInt(a[0], 'money amount') };
    case 'give': case 'take': {
      arity(1, 2, `[${name} item_id] or [${name} item_id n]`);
      const n = a[1] === undefined ? 1 : signedInt(a[1], 'count');
      if (n <= 0) throw new LineError(`[${name}] count must be positive`);
      return { kind: name as 'give' | 'take', item: needId(a[0].toLowerCase(), 'item id'), n };
    }
    case 'need': {
      arity(3, 3, '[need pig need +n]');
      const need = normalizeNeed(a[1]);
      if (!need) throw new LineError(`need must be one of ${NEED_IDS.join(', ')} (got "${a[1]}")`);
      return { kind: 'need', pig: needPig(a[0], 'need'), need, n: signedInt(a[2], 'need amount') };
    }
    case 'unset': arity(1, 1, '[unset name]'); return { kind: 'unset', name: a[0] };
    case 'chat': {
      arity(1, 3, '[chat pig "prompt"]');
      let prompt: string | undefined;
      let maxTurns: number | undefined;
      for (const t of toks.slice(1)) {
        if (!t.q && /^\d+$/.test(t.v)) maxTurns = Number(t.v);
        else if (prompt === undefined) prompt = t.v;
        else throw new LineError('usage: [chat pig "prompt" maxTurns]');
      }
      return { kind: 'chat', pig: needPig(a[0], 'chat'), prompt, maxTurns };
    }
    case 'minigame': arity(1, 1, '[minigame volley|perfusion|debug|petals|surgery|xfeed]'); return { kind: 'minigame', id: needId(a[0].toLowerCase(), 'mini-game id') };
    case 'outfit': {
      arity(2, 2, '[outfit pig outfit]');
      return { kind: 'outfit', pig: needPig(a[0], 'outfit'), outfit: oneOf(a[1].toLowerCase(), OUTFITS, 'outfit') };
    }
    case 'name': arity(0, 0, '[name]'); return { kind: 'name' };
    case 'input': {
      arity(1, 3, '[input key "prompt"] or [input key "prompt" "default"]');
      const key = a[0];
      if (!/^[A-Za-z_][\w]*$/.test(key)) throw new LineError(`[input] key must be a word like comfort_food (got "${key}")`);
      return { kind: 'input', key, prompt: a[1], fallback: a[2] };
    }
    case 'companion': {
      arity(1, 1, '[companion pick] or [companion pig]');
      const w = a[0].toLowerCase();
      return { kind: 'companion', pig: w === 'pick' ? 'pick' : needPig(w, 'companion') };
    }
    case 'remember': {
      arity(2, 2, '[remember pig "fact"] or [remember all "fact"]');
      const who = a[0].toLowerCase();
      return { kind: 'remember', pig: who === 'all' ? 'all' : needPig(who, 'remember'), fact: a[1] };
    }
    case 'call': arity(1, 1, '[call scene_id]'); return { kind: 'call', scene: needId(a[0].toLowerCase(), 'scene id') };
    case 'goto': case 'jump': arity(1, 1, '[goto label]'); return { kind: 'goto', label: a[0].replace(/^\*/, '') };
    case 'end': arity(0, 0, '[end]'); return { kind: 'end' };
    case 'if': case 'elif': case 'else': case 'endif':
      throw new LineError(`[${name}] must be on a line of its own`);
  }
  throw new LineError(`unknown command [${name}]${didYouMean(name, COMMANDS)}`);
}

// ───────── body parsing ─────────

type Control = { kind: 'if' | 'elif' | 'else' | 'endif'; src: string };

function controlOf(text: string): Control | null {
  const m = /^\[\s*(if|elif|else|endif)\b\s*([^\]]*?)\s*\](?:\s*(?:#|\/\/).*)?$/i.exec(text);
  if (!m) return null;
  return { kind: m[1].toLowerCase() as Control['kind'], src: m[2] };
}

const SPEAKER_LINE = /^([A-Za-z0-9_@-]+)(?:\s+([A-Za-z_]+))?(?:\s+([A-Za-z_]+))?\s*:(.*)$/;

class BodyParser {
  i = 0;
  lines: Line[];
  report: (line: number, message: string) => void;
  constructor(lines: Line[], report: (line: number, message: string) => void) {
    this.lines = lines;
    this.report = report;
  }

  cond(src: string, line: number): Cond {
    try {
      return parseCondition(src);
    } catch (e) {
      if (e instanceof CondError) this.report(line, `bad condition "${src}": ${e.message}`);
      else throw e;
      return { k: 'const', v: false };
    }
  }

  block(min: number, inIf: boolean): Node[] {
    const out: Node[] = [];
    while (this.i < this.lines.length) {
      const L = this.lines[this.i];
      if (L.indent < min) break;
      const ctl = controlOf(L.text);
      if (ctl && ctl.kind !== 'if') {
        if (inIf) break;
        this.report(L.no, `[${ctl.kind}] without a matching [if]`);
        this.i++;
        continue;
      }
      if (ctl) { out.push(this.ifBlock(L, ctl.src)); continue; }
      if (L.text.startsWith('?')) { out.push(this.choice(L.indent)); continue; }
      this.i++;
      try {
        out.push(...this.simple(L));
      } catch (e) {
        if (e instanceof LineError) this.report(L.no, e.message);
        else throw e;
      }
    }
    return out;
  }

  ifBlock(L: Line, src: string): Node {
    this.i++;
    if (!src) this.report(L.no, '[if] needs a condition');
    const node: Extract<Node, { t: 'if' }> = { t: 'if', line: L.no, branches: [] };
    node.branches.push({ line: L.no, cond: this.cond(src || 'false', L.no), body: this.block(L.indent, true) });
    let sawElse = false;
    for (;;) {
      const T = this.lines[this.i];
      if (!T || T.indent < L.indent) {
        this.report(L.no, '[if] is missing its [endif] (an [endif] may not be indented less than its [if])');
        break;
      }
      const ctl = controlOf(T.text)!;
      this.i++;
      if ((ctl.kind === 'else' || ctl.kind === 'endif') && ctl.src) {
        this.report(T.no, ctl.kind === 'else' ? '[else] takes no condition (use [elif condition])' : '[endif] takes no condition');
      }
      if (ctl.kind === 'endif') break;
      if (sawElse) this.report(T.no, `[${ctl.kind}] after [else]`);
      if (ctl.kind === 'else') {
        sawElse = true;
        node.branches.push({ line: T.no, cond: null, body: this.block(L.indent, true) });
      } else {
        if (!ctl.src) this.report(T.no, '[elif] needs a condition');
        node.branches.push({ line: T.no, cond: this.cond(ctl.src || 'false', T.no), body: this.block(L.indent, true) });
      }
    }
    return node;
  }

  choice(indent: number): Node {
    const first = this.lines[this.i];
    const node: Extract<Node, { t: 'choice' }> = { t: 'choice', line: first.no, options: [] };
    while (this.i < this.lines.length) {
      const L = this.lines[this.i];
      if (L.indent !== indent || !L.text.startsWith('?')) break;
      this.i++;
      let text = L.text.slice(1).trim();
      let cond: Cond | undefined;
      const m = /\s*\[\s*if\s+(.+?)\s*\]$/i.exec(text);
      if (m) {
        cond = this.cond(m[1], L.no);
        text = text.slice(0, m.index).trim();
      }
      text = textOf(text);
      if (!text) this.report(L.no, 'empty choice option');
      node.options.push({ line: L.no, text, cond, body: this.block(indent + 1, false) });
    }
    return node;
  }

  simple(L: Line): Node[] {
    const text = L.text;
    if (text.startsWith('[')) {
      return splitBrackets(text).map((inner) => {
        if (!inner) throw new LineError('empty command []');
        return { t: 'cmd', line: L.no, cmd: parseCommand(inner) } satisfies Node;
      });
    }
    if (text.startsWith('*')) {
      const m = /^\*\s*([A-Za-z0-9_]+)$/.exec(text);
      if (!m) throw new LineError('a label looks like *label_name (letters, digits and _)');
      return [{ t: 'label', line: L.no, name: m[1] }];
    }
    if (text.startsWith('===') || /^-{3,}$/.test(text)) throw new LineError(`unexpected "${text}"`);
    const spaced = /^piggy\s+([123])\b/i.exec(text);
    if (spaced) throw new LineError(`write the speaker as piggy-${spaced[1]} (lowercase, with a dash)`);
    const m = SPEAKER_LINE.exec(text);
    if (!m) {
      throw new LineError(`can't read this line. Expected "speaker expression: text", "speaker: text", "[command]", "? choice" or "*label"`);
    }
    const who = m[1].toLowerCase();
    if (who.includes('@')) throw new LineError(`outfits go in [show ${who} …] or [outfit …], not on speaker lines`);
    if (!(SPEAKERS as readonly string[]).includes(who)) {
      throw new LineError(`unknown speaker "${m[1]}"${didYouMean(who, SPEAKERS)} (speakers: ${SPEAKERS.join(', ')})`);
    }
    const delivery = m[3]?.toLowerCase();
    if (delivery && delivery !== 'mumble') throw new LineError(`unknown dialogue delivery "${m[3]}" (expected mumble)`);
    const body = textOf(m[4]);
    if (!body) throw new LineError('empty dialogue line');
    return [{ t: 'say', line: L.no, speaker: who as SpeakerId, expression: m[2]?.toLowerCase(), ...(delivery ? { delivery: delivery as 'mumble' } : {}), text: body }];
  }
}

// ───────── compile ─────────

function compile(scene: Pick<Scene, 'id' | 'body'>, report: (line: number, message: string) => void): { ops: Op[]; labels: Record<string, number> } {
  const ops: Op[] = [];
  const labels: Record<string, number> = {};
  const gotos: { at: number; label: string; line: number }[] = [];

  const emit = (nodes: Node[]) => {
    for (const n of nodes) {
      switch (n.t) {
        case 'say':
          ops.push({ op: 'say', line: n.line, speaker: n.speaker, expression: n.expression, ...(n.delivery ? { delivery: n.delivery } : {}), text: n.text, key: `${scene.id}.${hash(`${n.speaker}|${n.text}`)}` });
          break;
        case 'label':
          if (n.name in labels) report(n.line, `duplicate label *${n.name}`);
          else labels[n.name] = ops.length;
          break;
        case 'cmd':
          if (n.cmd.kind === 'goto') {
            gotos.push({ at: ops.length, label: n.cmd.label, line: n.line });
            ops.push({ op: 'jump', line: n.line, target: -1 });
          } else if (n.cmd.kind === 'end') {
            ops.push({ op: 'end', line: n.line });
          } else {
            ops.push({ op: 'cmd', line: n.line, cmd: n.cmd });
          }
          break;
        case 'choice': {
          const op: Extract<Op, { op: 'choice' }> = { op: 'choice', line: n.line, options: [], end: -1 };
          ops.push(op);
          const exits: number[] = [];
          for (const o of n.options) {
            op.options.push({ line: o.line, text: o.text, cond: o.cond, target: ops.length });
            emit(o.body);
            exits.push(ops.length);
            ops.push({ op: 'jump', line: o.line, target: -1 });
          }
          op.end = ops.length;
          for (const x of exits) (ops[x] as Extract<Op, { op: 'jump' }>).target = op.end;
          break;
        }
        case 'if': {
          const exits: number[] = [];
          for (const b of n.branches) {
            let br: Extract<Op, { op: 'branch' }> | null = null;
            if (b.cond) {
              br = { op: 'branch', line: b.line, cond: b.cond, target: -1 };
              ops.push(br);
            }
            emit(b.body);
            exits.push(ops.length);
            ops.push({ op: 'jump', line: b.line, target: -1 });
            if (br) br.target = ops.length;
          }
          for (const x of exits) (ops[x] as Extract<Op, { op: 'jump' }>).target = ops.length;
          break;
        }
      }
    }
  };
  emit(scene.body);
  ops.push({ op: 'end', line: 0 });
  for (const g of gotos) {
    const target = labels[g.label];
    if (target === undefined) report(g.line, `[goto ${g.label}]: no label *${g.label} in scene ${scene.id}${didYouMean(g.label, Object.keys(labels))}`);
    else (ops[g.at] as Extract<Op, { op: 'jump' }>).target = target;
  }
  return { ops, labels };
}

// ───────── scenes & metadata ─────────

const HEADER = /^===\s*([^\s=]*)\s*=*$/;
const META_LINE = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/;

function bool(v: string, key: string): boolean {
  const s = v.trim().toLowerCase();
  if (['true', 'yes', '1', 'on'].includes(s)) return true;
  if (['false', 'no', '0', 'off'].includes(s)) return false;
  throw new LineError(`${key}: expects true or false (got "${v}")`);
}

function parseMeta(lines: Line[], report: (line: number, message: string) => void): SceneMeta {
  const meta: SceneMeta = { title: '', trio: false, ending: false, priority: 10, repeat: false, replayable: true, extra: {}, lines: {} };
  let priority: number | undefined;
  for (const L of lines) {
    const m = META_LINE.exec(L.text);
    if (!m) { report(L.no, `expected "key: value" metadata before "---" (got "${L.text}")`); continue; }
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key in meta.lines) { report(L.no, `duplicate metadata key "${key}"`); continue; }
    meta.lines[key] = L.no;
    try {
      switch (key) {
        case 'title': meta.title = unquote(value); break;
        case 'pig': {
          const v = value.toLowerCase();
          if (!isPig(v)) throw new LineError(`pig: must be piggy-1, piggy-2 or piggy-3 (got "${value}"${didYouMean(v, PIG_IDS)})`);
          meta.pig = v;
          break;
        }
        case 'heart': {
          const n = signedInt(value, 'heart');
          if (n < 1 || n > 7) throw new LineError('heart: must be 1–7');
          meta.heart = n;
          break;
        }
        case 'chapter': {
          const n = signedInt(value, 'chapter');
          if (n < 1 || n > 4) throw new LineError('chapter: must be 1–4');
          meta.chapter = n;
          break;
        }
        case 'trio': meta.trio = bool(value, key); break;
        case 'ending': meta.ending = bool(value, key); break;
        case 'repeat': meta.repeat = bool(value, key); break;
        case 'replayable': meta.replayable = bool(value, key); break;
        case 'priority': priority = signedInt(value, 'priority'); break;
        case 'cg': meta.cg = needId(value.toLowerCase(), 'cg'); break;
        case 'summary': meta.summary = unquote(value); break;
        case 'trigger':
          try {
            meta.trigger = parseTrigger(value);
          } catch (e) {
            if (e instanceof TriggerError) throw new LineError(`trigger: ${e.message}`);
            throw e;
          }
          break;
        default: meta.extra[key] = value;
      }
    } catch (e) {
      if (e instanceof LineError) report(L.no, e.message);
      else throw e;
    }
  }
  meta.priority = priority ?? (meta.heart ? 50 : meta.trio ? 40 : 10);
  return meta;
}

/** Parse a .ks file, collecting every error instead of stopping at the first one. */
export function parseKScriptDetailed(src: string, file = 'inline.ks'): { scenes: Scene[]; errors: KScriptIssue[] } {
  const errors: KScriptIssue[] = [];
  const scenes: Scene[] = [];
  const lines = lex(src);
  const ids = new Set<string>();

  let k = 0;
  let strayReported = false;
  while (k < lines.length) {
    const L = lines[k];
    const h = HEADER.exec(L.text);
    if (!h) {
      if (!strayReported) errors.push({ file, line: L.no, message: 'text before the first "=== scene_id" header' });
      strayReported = true;
      k++;
      continue;
    }
    const id = h[1];
    const sceneErrors: KScriptIssue[] = [];
    const report = (line: number, message: string) => sceneErrors.push({ file, line, message, scene: id });
    if (!id) report(L.no, 'missing scene id after "==="');
    else if (!ID.test(id)) report(L.no, `scene id "${id}" may only use a-z, 0-9 and _`);
    else if (ids.has(id)) report(L.no, `duplicate scene id "${id}"`);
    ids.add(id);
    k++;

    const metaLines: Line[] = [];
    let sawEnd = false;
    while (k < lines.length && !HEADER.test(lines[k].text)) {
      if (/^-{3,}$/.test(lines[k].text)) { sawEnd = true; k++; break; }
      metaLines.push(lines[k++]);
    }
    if (!sawEnd) report(L.no, `scene "${id}" is missing the "---" line that ends its metadata`);
    const meta = parseMeta(sawEnd ? metaLines : [], report);

    const bodyLines: Line[] = [];
    while (k < lines.length && !HEADER.test(lines[k].text)) bodyLines.push(lines[k++]);
    const p = new BodyParser(bodyLines, report);
    const body = p.block(0, false);
    if (p.i < bodyLines.length) report(bodyLines[p.i].no, 'unexpected line');
    if (meta.heart && !meta.pig) report(meta.lines.heart, 'heart: needs a pig: line');
    const { ops, labels } = compile({ id, body }, report);
    scenes.push({ id, file, line: L.no, meta, body, ops, labels });
    errors.push(...sceneErrors);
  }
  return { scenes, errors };
}

/** Parse a .ks file. Throws KScriptError ("file:line: message", plus `.errors`) on any syntax error. */
export function parseKScript(src: string, file = 'inline.ks'): Scene[] {
  const { scenes, errors } = parseKScriptDetailed(src, file);
  if (errors.length) throw new KScriptError(errors[0], errors);
  return scenes;
}

/** Visit every node of a scene body (depth first), e.g. for validation. */
export function walk(nodes: Node[], visit: (n: Node) => void): void {
  for (const n of nodes) {
    visit(n);
    if (n.t === 'choice') for (const o of n.options) walk(o.body, visit);
    else if (n.t === 'if') for (const b of n.branches) walk(b.body, visit);
  }
}
