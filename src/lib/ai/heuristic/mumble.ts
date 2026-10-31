// Piggy 3 and X. Ask him "Are you on X?" and he answers, holds his phone out and drifts into a Deku-style MUMBLE: a
// fast, quiet, under-his-breath stream of AI analysis to himself (small text, trailing "…", self-interruptions,
// half-finished terms), aimed at nobody. Then he snaps out of it, a little embarrassed. Mumbling, not ranting.
// Call him on "Twitter" and he corrects you (comically angry, never mean): it's X. X.com.
//
//   opener   his normal voice; portrait pose 'phone' (the phone comes out; types.ts PortraitPose/POSE_FALLBACK)
//   stream   6–9 run-on fragments, shown small, dim and fast; pose 'phone_mumble'. Each fragment has one bubble word
//            that pops around his portrait as that fragment starts typing (`bubbles[i].at` = index in `stream`)
//   catch    his normal voice again; face `faces.catch`; the phone goes down
//
// `text` (opener + stream + catch) is the plain line for the chat log, the backlog, the Big Brain's history and any
// UI that does not know the effect. Pure and deterministic: the same (kind, asked, turns) always gives the same
// mumble. The very first mumble is fixed and says the owner's five words: Jev, LLM, foundation model, RLHF, RLVR.
// Every claim in here was fact-checked; no company, product or real-person names, and never the tutoring business's.
import type { ChatMumble, ChatReply, Expression } from '../../types';
import { pick, rngFrom, type Rng } from './rng';

/** What set him off: "are you on X?", "what's on your timeline?", "doomscrolling again?". */
export type MumbleKind = 'on_x' | 'timeline' | 'doomscroll';

export const MUMBLE_LIMITS = {
  minFragments: 6,
  maxFragments: 9,
  /** Characters. */
  opener: 56,
  fragment: 54,
  streamMin: 200,
  stream: 320,
  catch: 72,
  /** Bubble text, characters ("…" counts as one here; the font draws it two columns wide). */
  bubble: 14,
} as const;

interface Frag {
  /** A lowercase-led clause (a term may lead) ending in "…" or "—". */
  t: string;
  /** Bubble word, ≤ 14 characters. */
  b: string;
}

type ThreadId =
  | 'decide' | 'post' | 'gepa' | 'agents' | 'med' | 'signals' | 'infer' | 'hpc' | 'robots' | 'math' | 'feed' | 'xcult';

/**
 * Trains of thought, each about one thing and in order (later fragments build on earlier ones). A mumble takes the
 * start of one thread, then drifts into another.
 */
const THREADS: Readonly<Record<ThreadId, readonly Frag[]>> = {
  // Jev, the "System One" decision model: no text, calibrated odds over a fixed set of options
  decide: [
    { t: "Jev doesn't write, it just picks…", b: 'Jev…' },
    { t: 'a decision model, odds on every option…', b: 'decision model' },
    { t: 'seventy percent means seven in ten…', b: 'calibrated' },
    { t: 'named after Jevons— the paradox guy—', b: 'Jevons?' },
    { t: 'cheaper tokens, more tokens, Jevons para—', b: 'Jevons paradox' },
    { t: 'only if the options are fixed, though…', b: 'fixed options' },
    { t: 'vendor numbers, compared against wh—', b: 'baseline?' },
  ],
  // LLM → foundation model → post-training → RLHF → RLVR → reward hacking
  post: [
    { t: 'an LLM is next-token prediction…', b: 'LLM…' },
    { t: 'pretrain once, so, foundation model…', b: 'foundation mo—' },
    { t: 'SFT copies the good examples…', b: 'SFT…' },
    { t: 'RLHF, people pick the better answer…', b: 'RLHF…' },
    { t: "but if there's an answer key, RLVR…", b: 'RLVR!' },
    { t: 'unless it games the checker, reward hack—', b: 'reward hacking' },
  ],
  // his real mix-up: GEPA (the prompt optimizer) vs JEPA (embeddings)
  gepa: [
    { t: 'GEPA— no, JEPA— no, GEPA, the prompt one…', b: 'GEPA? no—' },
    { t: 'is it “geppa”? it rewrites its own prompt…', b: 'G-E-P-A…' },
    { t: 'reads its rollouts, writes itself notes…', b: 'rollouts…' },
    { t: 'keeps a Pareto front of the best ones…', b: 'Pareto front' },
    { t: 'mine lost to the baseline, the baseline—', b: 'baseline…' },
    { t: 'okay, ablation, dense versus LoRA, one at a—', b: 'ablation' },
  ],
  // coding agents
  agents: [
    { t: 'spawn four subagents, one job each…', b: 'subagents…' },
    { t: 'update AGENTS.md or they all guess…', b: 'AGENTS.md' },
    { t: 'an MCP server for the waveform viewer…', b: 'MCP…' },
    { t: 'reasoning effort xhigh, okay, maybe high…', b: 'xhigh…' },
    { t: 'it says 63% done, very bold of it…', b: '63% done?' },
    { t: 'always read the diff, always read the—', b: 'read the diff' },
  ],
  // medical AI over health records (synthetic patients only, no real people)
  med: [
    { t: 'a FHIR server full of synthetic patients…', b: 'FHIR…' },
    { t: 'F-H-I-R, said “fire”, bundles, R4…', b: 'R4…' },
    { t: 'zero real people, infinite edge cases…', b: 'synth patients' },
    { t: "ICD-10's a tree, walk it branch by branch…", b: 'ICD-10…' },
    { t: 'make it ask a follow-up before it answers…', b: 'follow-up?' },
    { t: 'AUROC 0.93, okay, but at what threshold…', b: 'AUROC?' },
    { t: 'new hospital, it drops, external val—', b: 'external val—' },
  ],
  // EEG/ECG waveforms
  signals: [
    { t: 'plot the whole waveform, not just peaks…', b: 'waveform…' },
    { t: 'peak-to-peak amplitude, but the units…', b: 'peak-to-peak' },
    { t: "off by a thousand? it's always the units…", b: 'units?!' },
    { t: 'EEG-JEPA, mask electrodes, predict the latent…', b: 'EEG-JEPA' },
    { t: 'a foundation model for brainwaves, but—', b: 'EEG…' },
    { t: 'every montage is different, ten-twen—', b: '10-20 montage' },
  ],
  // small models in a browser tab
  infer: [
    { t: 'minus one, zero, one, so 1.58 bits…', b: '1.58-bit…' },
    { t: 'in a browser tab, on WebGPU…', b: 'WebGPU…' },
    { t: 'prefill is one big pass, then decode…', b: 'prefill…' },
    { t: 'the KV cache grows every token…', b: 'KV cache…' },
    { t: 'forgot the chat template again, chaos—', b: 'chat template' },
    { t: 'forty tok/s in a tab, but on my watch—', b: 'tok/s…' },
  ],
  // HiPerGator
  hpc: [
    { t: 'squeue says PENDING, reason Resources…', b: 'PENDING…' },
    { t: 'sbatch, then refresh every thirty seconds…', b: 'sbatch…' },
    { t: 'three B200s free, do not sprint, do not—', b: 'B200s!' },
    { t: 'died at 99%, under-asked for memory…', b: 'out of memory' },
    { t: 'uv sync on the login node— no, not there…', b: 'uv sync…' },
    { t: 'scp the run back, plot it, then—', b: 'scp…' },
  ],
  // robots, someday (he follows it, he doesn't build it yet)
  robots: [
    { t: 'a VLA reads “fold the towel”, outputs joints…', b: 'VLA…' },
    { t: 'teleop with a copy arm, every move is data…', b: 'teleop…' },
    { t: 'imitation learning, watch me fifty times…', b: 'imitation…' },
    { t: 'a million tries in sim, then real friction…', b: 'sim2real…' },
    { t: 'wait, is that demo sped up? it says 1x—', b: '1x speed?' },
    { t: 'is someone off-camera with a controller—', b: 'autonomous?' },
  ],
  // the tutor in him
  math: [
    { t: 'chain of thought is just “show your work”…', b: 'CoT…' },
    { t: 'which I said every single tutoring session…', b: 'show your work' },
    { t: 'three examples in the prompt and it gets it…', b: 'in-context…' },
    { t: 'no gradient step, one example, then the rule…', b: 'one example…' },
    { t: 'backprop is the chain rule, outside times inside…', b: 'chain rule' },
    { t: 'softmax, exponentiate, divide by the sum—', b: 'softmax' },
  ],
  // the timeline itself
  feed: [
    { t: 'the whole timeline is quote-posting one chart…', b: 'quote-post…' },
    { t: "big if true, but where's the baseline…", b: 'big if true' },
    { t: "and the y-axis doesn't start at zero…", b: 'y-axis!' },
    { t: "a thread that says “1/” is never one, it's 1/37…", b: '1/37…' },
    { t: "four hundred bookmarks, I'll read them—", b: 'bookmarks…' },
    { t: "it's not doomscrolling if it's papers—", b: 'research!' },
  ],
  // the timeline's mood swings
  xcult: [
    { t: "reasoning is fake, says a paper, it's so over…", b: "it's so over" },
    { t: "new model drops, we're so back, same hour…", b: "we're so back" },
    { t: 'the reply has ten times the likes, ratio…', b: 'ratio' },
    { t: 'a community note on the chart already…', b: 'community note' },
    { t: 'forty paragraphs, “great question”, AI;DR…', b: 'AI;DR' },
    { t: "someone's tokenmaxxing in the replies—", b: 'tokenmaxxing' },
  ],
};

/** The order his first thread rotates through on later "are you on X?" asks (the second thread is seeded). */
const ROTATION: readonly ThreadId[] = ['post', 'decide', 'agents', 'med', 'signals', 'gepa', 'infer', 'hpc', 'robots', 'math'];
/** "What's on your timeline?" / "doomscrolling?" start on the timeline itself. */
const FEED_FIRST: readonly ThreadId[] = ['feed', 'xcult'];

/** How he drifts from one thread into the next (prefixed to the second thread's first fragment). */
const DRIFTS: readonly string[] = ['wait—', 'no, actually—', 'hold on—', 'okay, but—', 'which means—', 'which reminds me—'];

const OPENERS: Readonly<Record<MumbleKind, readonly string[]>> = {
  on_x: [
    'On X? Kind of. Okay, so this morning—',
    'Am I on X? Okay, funny you ask. Look at this—',
    'X.com? I was literally just— okay, look—',
    "Me? On X? I mean— okay, so there's this post—",
  ],
  timeline: [
    "My timeline? Okay, so right now it's—",
    "Oh, my For You? It's, like— okay, look—",
    "What's on it? Hold on, let me just—",
  ],
  doomscroll: [
    "I'm not doomscrolling. It's research. Okay, look—",
    'Doomscrolling? No. Okay, maybe. Look—',
    "It's not doomscrolling if it's papers. Look—",
  ],
};

/** The snap-out: he notices he's been mumbling. */
const CATCHES: Readonly<Record<MumbleKind, readonly string[]>> = {
  on_x: [
    "…wait, you're still here. Um. Short version: yes, I'm on X. Too much.",
    "…oh. I did the mumbling thing again, didn't I. Yes. X. Daily.",
    "Sorry, sorry. Basically: yes, I'm on X.com. Like, hourly.",
    "…okay, I'm back. What was the question? Oh. X. Yes. Very yes.",
    '…did I say all that out loud? Short version: yes. X.com. Hourly.',
  ],
  timeline: [
    "…sorry. That's my timeline. That's basically all of it.",
    "…anyway. That's the timeline. It's a lot. I love it.",
    '…oh. I mumbled the whole feed at you. Sorry. Want the short version?',
  ],
  doomscroll: [
    "…okay, it's a little doomscrolling. Research-scrolling. Sorry.",
    "…I was mumbling again, wasn't I. Okay. Putting the phone down.",
    "…sorry. I'll stop. After one more post. Okay, no, stopping.",
  ],
};

/** The first time he's asked: Jev, then the owner's other four words (foundation model, LLM, RLHF, RLVR). */
const CANON: { opener: Readonly<Record<MumbleKind, string>>; frags: readonly Frag[]; catch: string } = {
  opener: {
    on_x: 'X? Oh— yeah. Okay, did you see the Jev thing? Look—',
    timeline: 'My timeline? Okay, did you see the Jev thing? Look—',
    doomscroll: "It's research! Okay, did you see the Jev thing? Look—",
  },
  frags: [
    { t: "it doesn't write a word, it just picks…", b: 'Jev…' },
    { t: 'calibrated, seventy percent means seven in ten…', b: 'calibrated' },
    { t: 'wait— is it a foundation model, or—', b: 'foundation mo—' },
    { t: 'no— an LLM writes token by token, Jev just…', b: 'LLM…' },
    { t: 'RLHF is people picking the better answer…', b: 'RLHF…' },
    { t: 'but RLVR is an answer key, like grading a work—', b: 'RLVR!' },
    { t: 'so Jev trains on, um, RL-something, RLC—', b: 'RLCD?' },
  ],
  catch: "…sorry. I was mumbling again. Yes. I'm on X.com. A lot.",
};

/** The shapes live in types.ts (ChatReply.mumble), so the UI needs no import from the brain. */
export type Mumble = ChatMumble;
export type MumbleBubble = ChatMumble['bubbles'][number];
export type MumbleFaces = ChatMumble['faces'];

/** A ChatReply that asks the Talk screen to play the mumble (optional fields: a plain UI just shows `text`). */
export interface MumbleReply extends ChatReply {
  effect: 'mumble';
  mumble: Mumble;
}

export const MUMBLE_FACES: MumbleFaces = { opener: 'phone', stream: 'phone_mumble', catch: 'flustered_blush' };

export function isMumbleReply(r: unknown): r is MumbleReply {
  return !!r && typeof r === 'object' && (r as { effect?: unknown }).effect === 'mumble' && !!(r as { mumble?: unknown }).mumble;
}

/** Every bubble word a mumble can show (for measuring, preloading and tests). */
export const MUMBLE_BUBBLE_WORDS: readonly string[] = [
  ...new Set([...CANON.frags, ...Object.values(THREADS).flat()].map((f) => f.b)),
];

/** Every fragment, opener and catch (for the content checks in tests). */
export const MUMBLE_TEXTS = {
  fragments: [...CANON.frags, ...Object.values(THREADS).flat()].map((f) => f.t),
  openers: [...Object.values(CANON.opener), ...Object.values(OPENERS).flat()],
  catches: [CANON.catch, ...Object.values(CATCHES).flat()],
  drifts: DRIFTS,
} as const;

function assemble(kind: MumbleKind, opener: string, frags: readonly Frag[], catchLine: string): Mumble {
  const fragments = frags.map((f) => f.t);
  const bubbles: MumbleBubble[] = [];
  let at = 0;
  for (const f of frags) {
    bubbles.push({ word: f.b, at });
    at += f.t.length + 1;
  }
  return { kind, opener, fragments, stream: fragments.join(' '), bubbles, catch: catchLine, faces: { ...MUMBLE_FACES } };
}

const streamLength = (frags: readonly Frag[]) => frags.reduce((n, f) => n + f.t.length, 0) + Math.max(0, frags.length - 1);

/** Up to `n` fragments from the start of a thread (at least one). */
function head(id: ThreadId, n: number): Frag[] {
  return THREADS[id].slice(0, Math.max(1, Math.min(n, THREADS[id].length)));
}

function drifted(rng: Rng, f: Frag): Frag {
  return { t: `${pick(rng, DRIFTS)} ${f.t}`, b: f.b };
}

/**
 * The mumble for the `asked`-th time he's been asked about X (0 = first, counted from the chat log), with `turns` (the
 * chat log's length) as the extra seed. 6–9 fragments: the start of one thread (3–4), then a drift into a second one,
 * trimmed to the stream limit.
 */
export function mumbleFor(kind: MumbleKind, asked: number, turns = 0): Mumble {
  if (asked <= 0) return assemble(kind, CANON.opener[kind], CANON.frags, CANON.catch);
  const rng = rngFrom('mumble', kind, asked, turns);
  const first: ThreadId = kind === 'on_x' ? ROTATION[(asked - 1) % ROTATION.length] : pick(rng, FEED_FIRST);
  const second = pick(rng, ROTATION.filter((t) => t !== first));
  const a = head(first, 3 + Math.floor(rng() * 2));
  const want = 6 + Math.floor(rng() * 4);
  const b = head(second, Math.max(3, want - a.length));
  const frags: Frag[] = [...a, drifted(rng, b[0]), ...b.slice(1)];
  while (frags.length > MUMBLE_LIMITS.maxFragments) frags.pop();
  while (frags.length > MUMBLE_LIMITS.minFragments && streamLength(frags) > MUMBLE_LIMITS.stream) frags.pop();
  return assemble(kind, pick(rng, OPENERS[kind]), frags, pick(rng, CATCHES[kind]));
}

/** The mumble as one plain line (opener, stream, catch): its reply's `text`. */
export function mumbleText(m: Pick<Mumble, 'opener' | 'stream' | 'catch'>): string {
  return `${m.opener} ${m.stream} ${m.catch}`;
}

/** The reply quirks.ts returns for an X question (source 'quirk'). */
export function mumbleReply(kind: MumbleKind, asked: number, turns = 0): MumbleReply {
  const m = mumbleFor(kind, asked, turns);
  return {
    text: mumbleText(m),
    // the face for a UI that shows `text` as one plain line: he spends most of it lost in thought
    expression: 'thinking',
    source: 'quirk',
    effect: 'mumble',
    mumble: m,
  };
}

// ───────────── when he mumbles, and when he corrects you ─────────────

const LEAD = String.raw`^(?:(?:hey|so|yo|oh|hi|um|wait|ok|okay|piggy 3|piggy three|p3)\s+)*`;
const TAIL = String.raw`(?:\s+(?:still|much|a lot|lately|today|right now|again|anymore|these days|too|lol|haha))*$`;
const YOU = String.raw`(?:you|u)`;

const ON_X = new RegExp(
  LEAD +
    String.raw`(?:(?:are|r)\s+${YOU}\s+(?:still\s+|even\s+|always\s+)?on\s+(?:x|x\s+com|x\s+dot\s+com)` +
    String.raw`|${YOU}\s+on\s+(?:x|x\s+com)` +
    String.raw`|(?:do|did)\s+${YOU}\s+(?:still\s+)?(?:use|have|check|like|post\s+on)\s+(?:x|x\s+com)` +
    String.raw`|(?:x\s+com|x\s+dot\s+com))` +
    TAIL,
);
const TIMELINE = new RegExp(
  LEAD +
    String.raw`(?:what(?:'s|\s+is|s)?\s+(?:new\s+|good\s+)?on\s+(?:your\s+(?:timeline|tl|feed|for\s+you(?:\s+page)?)|x|x\s+com)` +
    String.raw`|anything\s+(?:good|new|cool)\s+on\s+(?:x|your\s+timeline)` +
    String.raw`|(?:what\s+)?did\s+${YOU}\s+see\s+(?:anything\s+)?(?:good\s+)?on\s+x` +
    String.raw`|how(?:'s|\s+is|s)\s+(?:the|your)\s+timeline)` +
    TAIL,
);
const DOOMSCROLL = new RegExp(
  LEAD + String.raw`(?:(?:are|r)\s+${YOU}\s+|${YOU}\s+(?:are\s+)?|still\s+|stop\s+|quit\s+)?doom\s?scroll(?:ing)?` + TAIL,
);

/** The kind of X question (text normalized by quirks.ts normalizeForQuirk), or null. Short, direct questions only. */
export function mumbleKindOf(n: string): MumbleKind | null {
  if (TIMELINE.test(n)) return 'timeline';
  if (ON_X.test(n)) return 'on_x';
  if (DOOMSCROLL.test(n)) return 'doomscroll';
  return null;
}

const TWITTER_Q = new RegExp(
  LEAD +
    String.raw`(?:(?:are|r)\s+${YOU}\s+(?:still\s+)?on\s+(?:twitter|the\s+bird\s+app)` +
    String.raw`|${YOU}\s+on\s+twitter` +
    String.raw`|(?:do|did)\s+${YOU}\s+(?:still\s+)?(?:use|have|check|like)\s+(?:a\s+)?twitter` +
    String.raw`|(?:do|did)\s+${YOU}\s+(?:still\s+)?tweet` +
    String.raw`|(?:what(?:'s|\s+is|s)?\s+)?(?:your\s+)?twitter(?:\s+(?:account|handle))?` +
    String.raw`|(?:the\s+)?bird\s+app)` +
    TAIL,
);

/** "Are you on Twitter?" and short variants (normalizeForQuirk text). */
export function isTwitterQuestion(n: string): boolean {
  return TWITTER_Q.test(n);
}

/**
 * His answer to "Twitter": comically angry (puffed cheeks, never mean), rotated by how often he's been asked. Also his
 * Heuristic Brain pool `passion_p3:twitter`, so every line has to work after any message that says "Twitter".
 */
export const X_CORRECTIONS: readonly (readonly [string, Expression])[] = [
  ["Twitter?! It's called X. X.com, okay?", 'angry'],
  ["Okay, small correction: it's X. And they're posts, not tweets.", 'angry'],
  ["Nobody calls it that anymore. It's X. Say it with me: X.", 'angry'],
  ["I saw it on Twi— on X. X.com. You didn't hear the first part.", 'flustered_blush'],
  ["It's X. I'll correct that every single time, very politely, forever.", 'angry'],
  ["Twitter? Never heard of it. You mean X, right?", 'angry'],
];
