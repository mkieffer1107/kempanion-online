// Shared contracts for Kempanion Online. Every module imports from here.
// Owned by the integrator: modules may ADD types in their own files, but must not edit this one.

// ───────────────────────── Characters & sprites ─────────────────────────

export type PigId = 'piggy-1' | 'piggy-2' | 'piggy-3';
export const PIG_IDS: readonly PigId[] = ['piggy-1', 'piggy-2', 'piggy-3'] as const;

/** Speaker ids used by dialogue: a pig, the player, or narration. */
export type SpeakerId = PigId | 'player' | 'narrator';

export type OutfitId = 'everyday' | 'volleyball' | 'scrubs' | 'hoodie';
/** Which alternate outfit belongs to which pig. */
export const ALT_OUTFIT: Record<PigId, OutfitId> = {
  'piggy-1': 'volleyball',
  'piggy-2': 'scrubs',
  'piggy-3': 'hoodie',
};

/** All 20 VN portrait expressions (everyday outfits have all of them). */
export type Expression =
  | 'neutral' | 'happy' | 'laughing' | 'sad' | 'angry' | 'surprised' | 'scared' | 'confused'
  | 'shy' | 'loving' | 'proud' | 'sleepy' | 'sick' | 'crying' | 'excited' | 'thinking'
  | 'shy_blush' | 'flustered_blush' | 'affectionate_blush' | 'bashful_smile';

export const EXPRESSIONS: readonly Expression[] = [
  'neutral', 'happy', 'laughing', 'sad', 'angry', 'surprised', 'scared', 'confused',
  'shy', 'loving', 'proud', 'sleepy', 'sick', 'crying', 'excited', 'thinking',
  'shy_blush', 'flustered_blush', 'affectionate_blush', 'bashful_smile',
] as const;

/** Alternate outfits only ship 12 portraits; the renderer maps missing ones through this table. */
export const ALT_EXPRESSION_FALLBACK: Partial<Record<Expression, Expression>> = {
  shy: 'shy_blush',
  loving: 'affectionate_blush',
  proud: 'happy',
  sleepy: 'neutral',
  sick: 'sad',
  crying: 'sad',
  excited: 'laughing',
  thinking: 'confused',
};

/** Everyday full-body animation clips (42), 6 frames each. */
export type BaseAnim =
  | 'idle' | 'blink' | 'wave' | 'look_around'
  | 'walk_right' | 'walk_front' | 'walk_back' | 'run_right' | 'walk_left' | 'run_left'
  | 'jump' | 'tumble' | 'sit_down' | 'stand_up'
  | 'eat' | 'drink' | 'bath' | 'brush_teeth'
  | 'yawn' | 'sleep' | 'wake_up' | 'sick'
  | 'happy' | 'sad' | 'angry' | 'scared'
  | 'love' | 'shy' | 'surprised' | 'confused'
  | 'celebrate' | 'dance' | 'play_ball' | 'bored'
  | 'hungry' | 'thirsty' | 'dirty' | 'cry'
  | 'laugh' | 'proud' | 'thinking' | 'pet_reaction'
  /** Extra clip (art-src/sprites-extra): dangling + wiggling while the player holds the pig. Grab point = top-center. */
  | 'held';

/** Alternate-outfit specialty clips. */
export type SpecialtyAnim =
  | 'volleyball_serve' | 'volleyball_bump' | 'volleyball_set' | 'volleyball_spike'
  | 'volleyball_dig' | 'volleyball_block' | 'volleyball_ready' | 'volleyball_win'
  | 'review_mri' | 'brain_model' | 'neuro_exam' | 'write_chart'
  | 'scrub_up' | 'surgical_focus' | 'preop_check' | 'clinical_success'
  | 'typing' | 'debugging' | 'explain_code' | 'ai_idea'
  | 'code_review' | 'build_success' | 'coffee_break' | 'invite_to_code';

export type AnimId = BaseAnim | SpecialtyAnim;

/** Clips available in alternate outfits besides their 8 specialty clips. */
export const ALT_BASE_ANIMS: readonly BaseAnim[] = ['idle', 'wave', 'walk_right', 'walk_left', 'jump'] as const;

// ───────────────────────── World ─────────────────────────

export type LocationId =
  | 'dorm' | 'century_tower' | 'plaza' | 'marston' | 'malachowsky' | 'physics'
  | 'communicore' | 'anatomy_lab' | 'shands' | 'stadium' | 'lake_alice'
  | 'reitz' | 'volleyball_courts' | 'midtown';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

/** Background image ids (files in public/assets/bg/<id>.png, 480x270). */
export type BackgroundId = string;

// ───────────────────────── Pet simulation ─────────────────────────

export type NeedId = 'hunger' | 'energy' | 'hygiene' | 'fun';
export const NEED_IDS: readonly NeedId[] = ['hunger', 'energy', 'hygiene', 'fun'] as const;

/** 0..100 where 100 is fully satisfied (hunger 100 = full). */
export type Needs = Record<NeedId, number>;

export type MoodTier = 'great' | 'good' | 'okay' | 'low' | 'awful';

export interface PigState {
  needs: Needs;
  /** 0..100, falls when needs sit near zero; < 35 → may get sick. */
  health: number;
  sick: boolean;
  /** Affection points, never negative. Level = bondLevel(bond). */
  bond: number;
  asleep: boolean;
  outfit: OutfitId;
  /** Crumbs / messes on the floor of the hub (0..5). */
  mess: number;
  lastFedAt: number;
  lastPlayedAt: number;
  lastTalkedAt: number;
  lastPettedAt: number;
  /** Per-day counters, reset when the local date changes. */
  today: { date: string; talks: number; gifts: number; pets: number; minigames: number };
}

export type ItemCategory = 'food' | 'drink' | 'gift' | 'care' | 'medicine' | 'key';

export interface ItemDef {
  id: string;
  name: string;
  /** Short flavor text shown in shop/bag. */
  desc: string;
  category: ItemCategory;
  price: number;
  /** Effects when used on a pig. */
  effects: Partial<Needs> & { health?: number; bond?: number; cure?: boolean };
  /** Per-pig preference multiplier on bond/fun (−1 hate .. +2 love). */
  likes?: Partial<Record<PigId, number>>;
  /** 16x16 pixel icon id (see src/lib/content/icons.ts). */
  icon: string;
  /** Optional: only sold at this location's shop. */
  soldAt?: LocationId;
}

export type CareAction = 'feed' | 'clean' | 'sleep' | 'wake' | 'play' | 'pet' | 'medicine' | 'gift' | 'tidy';

export interface ActionResult {
  ok: boolean;
  /** Why it failed (e.g., "He's asleep."), shown as a toast. */
  reason?: string;
  needsDelta?: Partial<Needs>;
  bondDelta?: number;
  moneyDelta?: number;
  /** Animation the hub should play (one-shot, then return to idle-ish). */
  anim?: AnimId;
  expression?: Expression;
  /** A short line the pig says in a speech bubble. */
  line?: string;
  sfx?: SfxId;
}

// ───────────────────────── Dialogue / AI ─────────────────────────

export interface ChatTurn {
  role: 'player' | 'pig';
  text: string;
  at: number;
  expression?: Expression;
}

export interface ChatContext {
  playerName: string;
  pig: PigId;
  isCompanion: boolean;
  location: LocationId;
  timeOfDay: TimeOfDay;
  /** Local wall-clock string like "Thu 3:42 PM". */
  clock: string;
  needs: Needs;
  mood: MoodTier;
  sick: boolean;
  bondLevel: number;
  /** Facts the pig remembers about the player ("Player's major is biology."). */
  memories: string[];
  /** Short description of what is going on (scene/event), optional. */
  situation?: string;
  /** What he's wearing: lines that mention an outfit only play while he wears it (unknown = any). */
  outfit?: OutfitId;
}

export interface ChatRequest {
  pig: PigId;
  playerText: string;
  history: ChatTurn[];
  context: ChatContext;
}

export interface ChatReply {
  text: string;
  expression: Expression;
  anim?: AnimId;
  /** Small relationship/need effects decided by the dialogue layer. */
  effects?: { bond?: number; fun?: number };
  source: 'llm' | 'heuristic' | 'quirk';
}

// ───────────────────────── Audio ─────────────────────────

export type SongId =
  | 'kempa_logo' | 'title' | 'prologue' | 'campus_day' | 'campus_evening' | 'night' | 'dorm' | 'morning'
  | 'piggy1_theme' | 'piggy2_theme' | 'piggy3_theme'
  | 'malachowsky' | 'physics' | 'lab' | 'hospital' | 'stadium' | 'lake_alice' | 'library' | 'plaza' | 'midtown'
  | 'shop' | 'map'
  | 'mini_volley' | 'mini_perfusion' | 'mini_debug'
  | 'sad' | 'happy' | 'romance' | 'tension' | 'comedy' | 'sleep' | 'credits';

export type JingleId = 'level_up' | 'bond_up' | 'victory' | 'fail' | 'purchase' | 'event_start' | 'daily_bonus';

export type SfxId =
  | 'ui_move' | 'ui_select' | 'ui_back' | 'ui_open' | 'ui_close' | 'ui_error' | 'ui_toggle'
  | 'coin' | 'purchase' | 'eat' | 'drink' | 'bath' | 'brush' | 'zzz' | 'alarm' | 'pet'
  | 'oink' | 'oink_happy' | 'oink_sad' | 'heart' | 'sparkle' | 'door' | 'step' | 'whoosh'
  | 'camera' | 'notify' | 'sneeze' | 'medicine' | 'gift' | 'ball_hit' | 'spike' | 'whistle'
  | 'heartbeat' | 'monitor_beep' | 'success' | 'fail' | 'typing' | 'build_ok' | 'thunder'
  | 'bell' | 'bats' | 'cheer' | 'chomp' | 'tidy' | 'shake' | 'surprise' | 'question';

/** Text-blip voice for typewriter dialogue. */
export type VoiceId = PigId | 'player' | 'narrator' | 'system';

// ───────────────────────── Settings & save ─────────────────────────

export type AiMode = 'heuristic' | 'llm';

export interface Settings {
  /** Characters per second for the typewriter; 0 = instant. */
  textSpeed: number;
  /** Seconds to wait after a line finishes in auto mode. */
  autoDelay: number;
  masterVolume: number; // 0..1
  bgmVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  reduceMotion: boolean;
  /** CRT scanline overlay. */
  crt: boolean;
  /** Which brain answers free chat. 'llm' only takes effect once a model is loaded. */
  aiMode: AiMode;
  /** Selected LLM option id (see src/lib/ai/models.ts). */
  aiModel: string;
  /** Load the LLM automatically on start if it is already cached. */
  aiAutoload: boolean;
  /** Show the player's own line in the text box before the reply. */
  echoPlayer: boolean;
}

export interface SaveData {
  version: 1;
  createdAt: number;
  /** Last time the simulation was advanced (epoch ms). */
  lastTick: number;
  player: { name: string };
  /** Active Kempanion (the one with Tamagotchi needs in the hub). */
  companion: PigId | null;
  pigs: Record<PigId, PigState>;
  inventory: Record<string, number>;
  /** Flex Bucks. */
  money: number;
  location: LocationId;
  /** Story flags and counters, free-form. */
  flags: Record<string, boolean | number | string>;
  /** Completed KScript scene ids. */
  seenScenes: string[];
  /** Unlocked album entries (CG ids + scene ids). */
  album: string[];
  achievements: string[];
  /** Lifetime counters for achievements. */
  counters: Record<string, number>;
  /** Recent free-chat turns per pig (capped at 40). */
  chatLog: Record<PigId, ChatTurn[]>;
  /** Facts each pig remembers about the player (capped at 24). */
  memories: Record<PigId, string[]>;
  /** Local date (YYYY-MM-DD) of the last daily bonus. */
  lastDaily: string;
  /** Consecutive days with a daily bonus claimed. */
  streak: number;
  settings: Settings;
}
