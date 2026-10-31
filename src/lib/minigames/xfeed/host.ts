// For You Pig — Piggy 3 as host: what he says, which pose he holds, which mumble chain he slips into, the phone clock,
// the live posts and the results line. Pure (no DOM), so the tests can walk every path; ForYouPig.svelte draws it.
import { DURATION, type FeedFx, type FeedPost } from './engine';
import { AUTHORS, CHAIN_FOR, LINES, MUMBLES, MUMBLE_CHAINS, SNAP_OUTS, type Author, type ChainKey, type SeedPost, type Topic } from './posts';

// ── the phone clock: 11:48 PM → 3:17 AM over the run, one minute step at a time ──

/** Run seconds → minutes since the evening's midnight (≥ 1440 = after midnight). Linear between the anchors. */
export const CLOCK_ANCHORS: readonly (readonly [number, number])[] = [
  [0, 23 * 60 + 48], [15, 24 * 60 + 31], [37, 25 * 60 + 52], [58, 27 * 60], [DURATION, 27 * 60 + 17],
];

export function clockMinutes(t: number): number {
  const a = CLOCK_ANCHORS;
  if (t <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    const [t1, m1] = a[i];
    const [t0, m0] = a[i - 1];
    if (t <= t1) return Math.floor(m0 + ((t - t0) / (t1 - t0)) * (m1 - m0));
  }
  return a[a.length - 1][1];
}

/** "11:48 PM", "12:31 AM", "3:17 AM". */
export function clockAt(t: number): string {
  const m = clockMinutes(t) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

// ── poses ──

/** Bust poses: his phone poses plus the portrait expressions the game uses. */
export type Pose =
  | 'phone' | 'phone_mumble' | 'happy' | 'proud' | 'excited' | 'laughing' | 'flustered_blush' | 'confused' | 'surprised'
  | 'angry' | 'sick' | 'sleepy' | 'neutral';

/** Until the phone portraits are synced into the atlas, these stand in (they exist in every outfit). */
export const POSE_FALLBACK: Partial<Record<Pose, Pose>> = { phone: 'happy', phone_mumble: 'confused' };

/** His resting pose: nose in the phone, mumbling into it, a bit green when the brain battery runs low. */
export function basePose(s: { mumbling: boolean; grass: boolean; battery: number }): Pose {
  if (s.grass) return 'happy';
  if (s.mumbling) return 'phone_mumble';
  if (s.battery < 25) return 'sick';
  return 'phone';
}

// ── lines ──

/** Picks a line from a bank, never the same one twice in a row for a key (seeded, so a run replays the same). */
export class LinePicker {
  private last = new Map<string, number>();
  constructor(private rand: () => number) {}

  pick(key: string, bank: readonly string[] | undefined = LINES[key]): string {
    if (!bank?.length) return '';
    let i = Math.floor(this.rand() * bank.length);
    if (bank.length > 1 && i === this.last.get(key)) i = (i + 1) % bank.length;
    this.last.set(key, i);
    return bank[i];
  }
}

export interface Said {
  /** LINES key actually used (friend1, combo15, gemFirst…). */
  key: string;
  text: string;
  /** 0 chatter (said a third of the time) · 1 hints · 2 reactions · 3 big beats (always shown, may interrupt). */
  prio: number;
  pose?: Pose;
  poseMs?: number;
}

const FLASH = 1300;

/** Keys whose line is followed by the post's own tell, so every mistake teaches the rule. */
export const TELL_KEYS = new Set(['likeWrong', 'muteWrong', 'missSignal', 'missHype']);

/**
 * Turn the engine's `say` fx into his line and pose. `post` is the post the fx is about (if any); `firstGem` is true
 * when this is the first gem saved in the run (the pirate-manga bookmark joke).
 */
export function lineFor(f: Extract<FeedFx, { kind: 'say' }>, post: FeedPost | null, pick: LinePicker, firstGem = false): Said | null {
  const author: Author | null = post ? AUTHORS[post.by] : null;
  const pig = author?.pig;
  let key: string = f.key;
  let pose: Pose | undefined;
  let poseMs = FLASH;
  switch (f.key) {
    case 'phase': {
      const text = LINES.phase[f.n ?? 0];
      return text ? { key: `phase${f.n}`, text, prio: 3, pose: f.n === 3 ? 'sleepy' : undefined, poseMs: FLASH } : null;
    }
    case 'snapOut':
      return { key, text: pick.pick('snapOut', SNAP_OUTS), prio: 3, pose: 'flustered_blush', poseMs: 1600 };
    case 'friend':
      key = pig === 'piggy-2' ? 'friend2' : 'friend1';
      pose = 'laughing';
      break;
    case 'friendMuted':
      key = pig === 'piggy-2' ? 'friendMuted2' : 'friendMuted1';
      pose = 'surprised';
      break;
    case 'combo':
      key = `combo${f.n}`;
      break;
    case 'rot':
      key = `rot${f.n}`;
      if (f.n === 75) pose = 'sick';
      break;
    case 'gem':
      if (firstGem) key = 'gemFirst';
      pose = 'excited';
      break;
    case 'likeOk':
    case 'gemLiked':
    case 'xray':
      pose = 'happy';
      break;
    case 'muteOk':
    case 'oldNameMuted':
      pose = 'proud';
      break;
    case 'likeWrong':
      pose = 'confused';
      break;
    case 'muteWrong':
    case 'ownMuted':
      pose = 'surprised';
      break;
    case 'oldNameLiked':
    case 'oldName':
      pose = 'angry';
      break;
    case 'ownLiked':
      pose = 'flustered_blush';
      break;
    case 'grass':
      pose = 'happy';
      poseMs = 3000;
      break;
    default:
      break;
  }
  let text = pick.pick(key);
  if (!text) return null;
  if (post?.tell && TELL_KEYS.has(f.key)) text = `${text} ${post.tell}`;
  return { key, text, prio: f.prio, pose, poseMs: pose ? poseMs : undefined };
}

// ── mumbles ──

/** When a topic's chain was already used this run: his own five words first, then Jev, RL, GEPA. */
export const CHAIN_FALLBACK: readonly ChainKey[] = ['five', 'jev', 'rl', 'gepa'];

/**
 * The chain for a new Mumble Mode: it follows the topic of the post that started it, never repeats within a run, and
 * a player's very first mumble is always the owner's five (LLM, foundation model, RLHF, RLVR, Jev).
 */
export function pickChain(topic: Topic | undefined, used: ReadonlySet<ChainKey>, firstEver: boolean): ChainKey {
  if (firstEver && !used.has('five')) return 'five';
  const want: ChainKey = (topic && CHAIN_FOR[topic]) || 'five';
  if (!used.has(want)) return want;
  for (const k of CHAIN_FALLBACK) if (!used.has(k)) return k;
  const rest = (Object.keys(MUMBLE_CHAINS) as ChainKey[]).filter((k) => !used.has(k));
  return rest[0] ?? 'five';
}

/** A quiet ambient mumble about the post under his nose (half the time a hype post gets his "…baseline?" look). */
export function ambientMumble(post: SeedPost | null, rand: () => number, last = ''): string {
  let bank = MUMBLES.any;
  if (post) bank = post.cls === 'hype' && rand() < 0.5 ? MUMBLES.hype : (MUMBLES[post.topic] ?? MUMBLES.any);
  if (!bank.length) bank = MUMBLES.any;
  let i = Math.floor(rand() * bank.length);
  if (bank.length > 1 && bank[i] === last) i = (i + 1) % bank.length;
  return bank[i];
}

// ── live posts ──

/** How "The Algorithm" names your favourite topic ("Noticed you like medical AI posts."). */
export const TOPIC_LABEL: Record<Topic, string> = {
  llm: 'LLM', rl: 'RL', eval: 'eval', infer: 'inference', agents: 'agent', jev: 'Jev', med: 'medical AI', biosig: 'EEG',
  robot: 'robot', math: 'math', hpc: 'cluster', voice: 'voice', data: 'data', open: 'open weights', meta: 'X',
  campus: 'campus', anime: 'pirate manga', life: 'life',
};

/** The topic you have liked (or saved) most so far; null before the first like. Ties go to the earliest. */
export function topLikedTopic(posts: readonly FeedPost[]): Topic | null {
  const n = new Map<Topic, number>();
  let best: Topic | null = null;
  for (const p of posts) {
    if ((p.state !== 'liked' && p.state !== 'saved') || p.cls === 'filler') continue;
    const c = (n.get(p.topic) ?? 0) + 1;
    n.set(p.topic, c);
    if (!best || c > (n.get(best) ?? 0)) best = p.topic;
  }
  return best;
}

/** Fill a live post's {s}, {clock} and {topic} once, when its card first appears. */
export function liveText(p: SeedPost, ctx: { s: number; clock: string; topic: Topic | null }): string {
  return p.text
    .replace('{s}', String(Math.max(1, Math.round(ctx.s))))
    .replace('{clock}', ctx.clock)
    .replace('{topic}', ctx.topic ? TOPIC_LABEL[ctx.topic] : 'AI');
}

// ── cards ──

export interface Seg { t: string; tell: boolean }

/** Split a post's text at its [[tell]] span. */
export function segments(text: string): Seg[] {
  const out: Seg[] = [];
  const re = /\[\[(.+?)\]\]/g;
  let i = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > i) out.push({ t: text.slice(i, m.index), tell: false });
    out.push({ t: m[1], tell: true });
    i = m.index + m[0].length;
  }
  if (i < text.length) out.push({ t: text.slice(i), tell: false });
  return out;
}

export const plainText = (text: string) => text.replace(/\[\[|\]\]/g, '');

/** FNV-1a: stable per-post numbers (avatars, footer counts, "· 4m"). */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Counts { reply: number; repost: number; like: number; save: number; ago: string }

/** Footer counts, seeded by the post id and unrelated to its class: popularity is never a tell. */
export function countsFor(id: string): Counts {
  const h = hashStr(id);
  const big = (h >>> 8) % 7 === 0;
  const like = big ? 1000 + (h % 9000) : 3 + (h % 900);
  const mins = 1 + ((h >>> 4) % 58);
  return {
    reply: (h >>> 3) % 60,
    repost: (h >>> 6) % 140,
    like,
    save: (h >>> 11) % 90,
    ago: (h >>> 15) % 5 === 0 ? `${1 + ((h >>> 17) % 9)}h` : `${mins}m`,
  };
}

/** 1234 → "1.2K". */
export function shortCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(n);
}

// ── results ──

/** The results card's stats line ("Signal-to-Oink" is his accuracy). */
export function statsLine(s: Record<string, number>): string {
  const g = (k: string) => s[k] ?? 0;
  const parts = [
    `Liked ${g('liked')}`, `Muted ${g('muted')}`, `Saved ${g('saved')}`, `Wrong ${g('wrong')}`, `Missed ${g('missed')}`,
    `Best combo ${g('maxCombo')}`, `Signal-to-Oink ${g('accuracy')}%`, `Mumbles ${g('mumbles')}`,
  ];
  if (signalOnly(s)) parts.push('Signal only!');
  return parts.join(' · ');
}

/** A clean run: nothing wrong, nothing missed, at least 30 posts judged. */
export function signalOnly(s: Record<string, number>): boolean {
  return (s.wrong ?? 0) === 0 && (s.missed ?? 0) === 0 && (s.judged ?? 0) >= 30;
}

/** What the screen reader hears after a call. */
export function callNote(p: FeedPost, combo: number): string {
  if (p.state === 'wrong') return p.cls === 'hype' ? 'Wrong, that was hype.' : 'Wrong, that one was good.';
  if (p.cls === 'filler') return 'Filler. No points.';
  if (p.state === 'saved') return `Saved, plus ${p.pts}.`;
  if (p.state === 'muted') return `Muted, combo ${combo}.`;
  return `Liked, combo ${combo}.`;
}
