// Semantic validator for KScript files: everything `bun test tests/kscript.test.ts` checks beyond syntax.
// Pure (no Vite APIs): reusable from tests, scripts or a debug panel.
import bgManifest from '../../generated/backgrounds.json';
import spriteData from '../../generated/sprites.json';
import {
  ALT_OUTFIT, PIG_IDS, PORTRAIT_FACES, POSE_FALLBACK, type JingleId, type PigId, type PortraitPose, type SfxId, type SongId,
} from '../types';
import { LOCATION_IDS } from '../content/locations';
import { condTerms, type Cond } from './conditions';
import { scanTokens } from './interpolate';
import { didYouMean, parseKScriptDetailed, walk, META_KEYS, type Command, type Node, type Scene } from './kscript';
import type { TriggerClause } from './triggers';

// Copies of the unions in src/lib/types.ts (compile-time checked below) so the validator works at runtime.
export const SONG_IDS = [
  'kempa_logo', 'title', 'prologue', 'campus_day', 'campus_evening', 'night', 'dorm', 'morning',
  'piggy1_theme', 'piggy2_theme', 'piggy3_theme',
  'malachowsky', 'physics', 'lab', 'hospital', 'stadium', 'lake_alice', 'library', 'plaza', 'midtown',
  'shop', 'map',
  'mini_volley', 'mini_perfusion', 'mini_debug',
  'sad', 'happy', 'romance', 'tension', 'comedy', 'sleep', 'credits',
] as const satisfies readonly SongId[];

export const SFX_IDS = [
  'ui_move', 'ui_select', 'ui_back', 'ui_open', 'ui_close', 'ui_error', 'ui_toggle',
  'coin', 'purchase', 'eat', 'drink', 'bath', 'brush', 'zzz', 'alarm', 'pet',
  'oink', 'oink_happy', 'oink_sad', 'heart', 'sparkle', 'door', 'step', 'whoosh',
  'camera', 'notify', 'sneeze', 'medicine', 'gift', 'ball_hit', 'spike', 'whistle',
  'heartbeat', 'monitor_beep', 'success', 'fail', 'typing', 'build_ok', 'thunder',
  'bell', 'bats', 'cheer', 'chomp', 'tidy', 'shake', 'surprise', 'question',
] as const satisfies readonly SfxId[];

export const JINGLE_IDS = ['level_up', 'bond_up', 'victory', 'fail', 'purchase', 'event_start', 'daily_bonus'] as const satisfies readonly JingleId[];

// A missing id here is a compile error (svelte-check), so these lists can't drift from types.ts.
const songsComplete: [Exclude<SongId, (typeof SONG_IDS)[number]>] extends [never] ? true : false = true;
const sfxComplete: [Exclude<SfxId, (typeof SFX_IDS)[number]>] extends [never] ? true : false = true;
const jinglesComplete: [Exclude<JingleId, (typeof JINGLE_IDS)[number]>] extends [never] ? true : false = true;
void songsComplete; void sfxComplete; void jinglesComplete;

/** Canonical item ids (GAME_DESIGN.md §8). */
export const ITEM_IDS = [
  // food / drink
  'dining_tray', 'water_bottle', 'tender_sub', 'pizza_slice', 'cup_ramen', 'onigiri', 'melonpan', 'apple_pie', 'key_lime_pie',
  'boiled_peanuts', 'acai_bowl', 'protein_shake', 'watermelon', 'oranges', 'pastelito', 'blueberries', 'sakura_dango', 'truffle_fries',
  'sideline_sip', 'florida_oj', 'sweet_tea', 'cafecito', 'cold_brew', 'red_bull_sf', 'boba_tea', 'strawberry_milk', 'vegan_ice_cream',
  // care
  'lavender_soap', 'mint_toothpaste', 'honey_lemon_tea', 'cold_medicine', 'ginger_ale',
  // gifts
  'knee_pad_tape', 'signed_volleyball', 'brain_model', 'big_water_bottle', 'sakura_filament', 'pirate_manga', 'pennant',
  'sakura_charm', 'comic_sans_stickers',
  // key items
  'kempapager', 'name_badge', 'sakura_keychain',
] as const;

/** Likely guesses → canonical ids (ARCHITECTURE §4's example uses pub_sub). */
const ITEM_HINTS: Record<string, string> = {
  pub_sub: 'tender_sub', sub: 'tender_sub', pizza: 'pizza_slice', ramen: 'cup_ramen', dango: 'sakura_dango', boba: 'boba_tea',
  coffee: 'cold_brew', red_bull: 'red_bull_sf', redbull: 'red_bull_sf', energy_drink: 'red_bull_sf',
  gatorade: 'sideline_sip', sports_drink: 'sideline_sip', oj: 'florida_oj', water: 'water_bottle',
  fries: 'truffle_fries', manga: 'pirate_manga', filament: 'sakura_filament', volleyball: 'signed_volleyball', charm: 'sakura_charm',
  badge: 'name_badge', pager: 'kempapager', soap: 'lavender_soap', toothpaste: 'mint_toothpaste', tea: 'honey_lemon_tea',
  medicine: 'cold_medicine', milk: 'strawberry_milk', pie: 'apple_pie',
};

export const MINIGAME_IDS = ['volley', 'perfusion', 'debug', 'petals', 'surgery', 'xfeed'] as const;

/** Portrait cells in each pig's everyday set (src/generated/sprites.json): the game-made poses are Piggy 3's only. */
const PORTRAIT_CELLS = (spriteData as unknown as { sets: Record<string, { portraits: Record<string, unknown> }> }).sets;

/** Backgrounds being painted (ARCHITECTURE §11): allowed, but reported as warnings until they exist. */
export const PLANNED_BACKGROUNDS = [
  'plaza', 'marston', 'malachowsky', 'physics', 'communicore', 'shands', 'stadium', 'reitz', 'sakura_house', 'legend_sakura', 'map',
] as const;

/** Flags the engine itself writes (so reading them never warns). */
/** Flags the game code sets (minigame results, outfits, [input] facts, the pet sim's party flags, the hub's mirror
 *  of the title-screen Big Brain choice). */
const ENGINE_FLAGS = [/^minigame_(score|won)$/, /^outfit_/, /^fact\./, /^(welcome|stamp)_party_ready$/, /^bigbrain(_unsupported)?$/];

export interface Issue { file: string; line: number; level: 'error' | 'warning'; message: string; scene?: string }

export interface ValidateOptions {
  /** Existing background ids (default: src/generated/backgrounds.json). */
  backgrounds?: readonly string[];
  /** Planned background ids (warning only). */
  planned?: readonly string[];
}

export function formatIssue(i: Issue): string {
  return `${i.file}:${i.line}: ${i.level}: ${i.message}`;
}

const BANNED: { re: RegExp; level: Issue['level']; why: string }[] = [
  { re: /krishna/i, level: 'error', why: 'Krishna Lunch must never be referenced' },
  { re: /gator\s*bait/i, level: 'error', why: 'the retired "Gator Bait" chant must never be used' },
  { re: /\b(pork|bacon|ham|hams|sausages?|pepperoni|prosciutto|chorizo|hot ?dogs?|pulled pig)\b/i, level: 'warning', why: 'no pork food, ever (fine only as a Piggy 2 "no bacon jokes" line)' },
];

/** Validate KScript sources (parse + semantic checks). Issues are sorted by file and line. */
export function validateKScript(files: readonly { file: string; src: string }[], opts: ValidateOptions = {}): { scenes: Scene[]; issues: Issue[] } {
  const backgrounds = new Set(opts.backgrounds ?? bgManifest.bg);
  const planned = new Set<string>(opts.planned ?? PLANNED_BACKGROUNDS);
  const issues: Issue[] = [];
  const scenes: Scene[] = [];
  const add = (level: Issue['level'], file: string, line: number, message: string, scene?: string) => issues.push({ file, line, level, message, scene });

  for (const f of files) {
    const { scenes: parsed, errors } = parseKScriptDetailed(f.src, f.file);
    for (const e of errors) add('error', e.file, e.line, e.message, e.scene);
    scenes.push(...parsed);
  }

  const sceneIds = new Map<string, Scene>();
  for (const s of scenes) {
    const first = sceneIds.get(s.id);
    if (first && first !== s) {
      if (first.file !== s.file) add('error', s.file, s.line, `scene id "${s.id}" is already used in ${first.file}:${first.line}`, s.id);
    } else sceneIds.set(s.id, s);
  }

  // Heart events: 1–7, unique per pig, id p<N>_h<n> (the pet module's heart gate looks them up by that id).
  const hearts = new Map<string, Scene>();
  for (const s of scenes) {
    const { heart, pig } = s.meta;
    if (!heart || !pig) continue;
    const expected = `p${pig.slice(-1)}_h${heart}`;
    if (s.id !== expected) add('error', s.file, s.line, `heart event ${heart} of ${pig} must be named "${expected}" (the bond heart gate looks it up by that id)`, s.id);
    const key = `${pig}#${heart}`;
    const prev = hearts.get(key);
    if (prev) add('error', s.file, s.meta.lines.heart ?? s.line, `${pig} already has heart event ${heart} (${prev.id} in ${prev.file}:${prev.line})`, s.id);
    else hearts.set(key, s);
  }
  for (const pig of PIG_IDS) {
    const have = [1, 2, 3, 4, 5, 6, 7].filter((n) => hearts.has(`${pig}#${n}`));
    if (!have.length) continue;
    const missing = [1, 2, 3, 4, 5, 6, 7].filter((n) => !have.includes(n));
    const top = hearts.get(`${pig}#${Math.max(...have)}`)!;
    if (missing.length && missing.some((n) => n < Math.max(...have))) {
      add('warning', top.file, top.meta.lines.heart ?? top.line, `${pig} heart events ${missing.filter((n) => n < Math.max(...have)).join(', ')} are missing (event n needs event n−1 seen)`);
    }
  }

  // Flags: collect writes everywhere first, then check reads.
  const flagWrites = new Set<string>();
  for (const s of scenes) {
    walk(s.body, (n) => {
      if (n.t === 'cmd' && (n.cmd.kind === 'set' || n.cmd.kind === 'unset')) flagWrites.add(n.cmd.name);
      if (n.t === 'cmd' && n.cmd.kind === 'input') flagWrites.add(`fact.${n.cmd.key}`);
    });
  }
  const flagRead = (file: string, line: number, name: string, scene: string) => {
    if (flagWrites.has(name) || ENGINE_FLAGS.some((re) => re.test(name))) return;
    add('warning', file, line, `flag "${name}" is read but no scene sets it${didYouMean(name, [...flagWrites])} (fine if game code sets it)`, scene);
  };

  for (const s of scenes) checkScene(s);

  function checkScene(s: Scene) {
    const { file } = s;
    const m = s.meta;
    const err = (line: number, msg: string) => add('error', file, line, msg, s.id);
    const warn = (line: number, msg: string) => add('warning', file, line, msg, s.id);

    for (const [key, value] of Object.entries(m.extra)) {
      const near = didYouMean(key, META_KEYS);
      if (near) err(m.lines[key], `unknown metadata key "${key}"${near}`);
      else warn(m.lines[key], `unknown metadata key "${key}: ${value}" (known: ${META_KEYS.join(', ')})`);
    }
    if (!m.title) warn(s.line, `scene "${s.id}" has no title: (the album shows it)`);
    if (m.heart && !m.trigger) warn(m.lines.heart, `heart event "${s.id}" has no trigger:, so it is never offered`);
    if (m.cg && !/^cg_(p1|p2|p3|trio)_[a-z0-9_]+$/.test(m.cg)) warn(m.lines.cg, `CG id "${m.cg}" should look like cg_<p1|p2|p3|trio>_<slug>`);
    if (m.trigger) checkTrigger(m.trigger, m.lines.trigger);

    const reportedBgs = new Set<string>();

    walk(s.body, (n: Node) => {
      switch (n.t) {
        case 'say': {
          if (n.expression) {
            if (n.speaker === 'narrator' || n.speaker === 'player') warn(n.line, `${n.speaker} has no portrait, so the expression "${n.expression}" does nothing`);
            else checkExpression(n.line, n.expression, n.speaker);
          }
          checkText(n.line, n.text);
          if (n.text.length > 320) warn(n.line, `very long line (${n.text.length} chars); consider splitting it`);
          break;
        }
        case 'choice': {
          if (n.options.length > 4) warn(n.line, `${n.options.length} options; the menu is designed for 1–4`);
          if (n.options.length === 1) warn(n.line, 'choice with a single option (did you forget to indent its block by 2 spaces?)');
          for (const o of n.options) {
            checkText(o.line, o.text);
            if (o.cond) checkCond(o.cond, o.line);
          }
          break;
        }
        case 'if':
          for (const b of n.branches) if (b.cond) checkCond(b.cond, b.line);
          break;
        case 'cmd':
          checkCommand(n.line, n.cmd);
          break;
        case 'label':
          break;
      }
    });

    /** The pack's expressions, plus the portrait poses ('phone', 'phone_mumble'): a pig without the pose shows its stand-in. */
    function checkExpression(line: number, e: string, pig: PigId) {
      if (!(PORTRAIT_FACES as readonly string[]).includes(e)) {
        err(line, `unknown expression "${e}"${didYouMean(e, PORTRAIT_FACES)}`);
        return;
      }
      const standIn = POSE_FALLBACK[e as PortraitPose];
      if (standIn && !PORTRAIT_CELLS[`${pig}/everyday`]?.portraits[e]) {
        warn(line, `${pig} has no "${e}" portrait (a pose drawn for Piggy 3), so it shows "${standIn}"`);
      }
    }

    function checkOutfit(line: number, pig: PigId, outfit: string) {
      if (outfit !== 'everyday' && outfit !== ALT_OUTFIT[pig]) err(line, `${pig} has no "${outfit}" outfit (his are everyday and ${ALT_OUTFIT[pig]})`);
    }

    function checkBackground(line: number, id: string) {
      if (backgrounds.has(id)) return;
      const base = id.replace(/_night$/, '');
      if (planned.has(id) || planned.has(base)) {
        if (!reportedBgs.has(id)) warn(line, `background "${id}" is planned but not painted yet (a placeholder is drawn)`);
        reportedBgs.add(id);
        return;
      }
      err(line, `unknown background "${id}"${didYouMean(id, [...backgrounds, ...planned])}`);
    }

    function checkText(line: number, text: string) {
      for (const t of scanTokens(text)) {
        if (!t.known) err(line, `unknown text token ${t.raw} (known: {player} {companion} {time} {timeofday} {weekday} {fact:key|fallback} {flag:name|fallback})`);
        else if (t.name === 'flag' && t.arg) flagRead(file, line, t.arg, s.id);
      }
      for (const b of BANNED) if (b.re.test(text)) add(b.level, file, line, `content rule: ${b.why}`, s.id);
    }

    function checkItem(line: number, id: string) {
      if ((ITEM_IDS as readonly string[]).includes(id)) return;
      const hint = ITEM_HINTS[id] ? ` (did you mean "${ITEM_HINTS[id]}"?)` : didYouMean(id, ITEM_IDS);
      err(line, `unknown item "${id}"${hint} (canonical ids: GAME_DESIGN.md §8)`);
    }

    function checkLocation(line: number, id: string, allowHub: boolean) {
      if (allowHub && id === 'hub') return;
      if (!(LOCATION_IDS as readonly string[]).includes(id)) err(line, `unknown location "${id}"${didYouMean(id, LOCATION_IDS)}`);
    }

    function checkSceneRef(line: number, id: string) {
      if (!sceneIds.has(id)) warn(line, `no scene "${id}" exists (yet)${didYouMean(id, [...sceneIds.keys()])}`);
    }

    function checkCond(c: Cond, line: number) {
      for (const { term, values } of condTerms(c)) {
        if (term.f === 'item') checkItem(line, term.id);
        else if (term.f === 'seen') checkSceneRef(line, term.id);
        else if (term.f === 'flag') flagRead(file, line, term.name, s.id);
        else if (term.f === 'location') for (const v of values ?? []) checkLocation(line, String(v), true);
      }
    }

    function checkTrigger(clauses: TriggerClause[], line: number) {
      for (const c of clauses) {
        if (c.k === 'location') for (const v of c.values) checkLocation(line, v, true);
        else if (c.k === 'seen') for (const id of c.ids) checkSceneRef(line, id);
        else if (c.k === 'item') for (const id of c.ids) checkItem(line, id);
        else if (c.k === 'flag') for (const f of c.names) flagRead(file, line, f, s.id);
        else if (c.k === 'hearts' && !c.pig && !m.pig) warn(line, 'hearts>= without pig: means every pig needs that many hearts');
      }
    }

    function checkCommand(line: number, c: Command) {
      switch (c.kind) {
        case 'bg': checkBackground(line, c.id); break;
        case 'bgm': if (c.id && !(SONG_IDS as readonly string[]).includes(c.id)) err(line, `unknown song "${c.id}"${didYouMean(c.id, SONG_IDS)}`); break;
        case 'sfx': if (!(SFX_IDS as readonly string[]).includes(c.id)) err(line, `unknown sfx "${c.id}"${didYouMean(c.id, SFX_IDS)}`); break;
        case 'jingle': if (!(JINGLE_IDS as readonly string[]).includes(c.id)) err(line, `unknown jingle "${c.id}"${didYouMean(c.id, JINGLE_IDS)}`); break;
        case 'show':
          if (c.expression) checkExpression(line, c.expression, c.pig);
          if (c.outfit) checkOutfit(line, c.pig, c.outfit);
          break;
        case 'expr': checkExpression(line, c.expression, c.pig); break;
        case 'outfit': checkOutfit(line, c.pig, c.outfit); break;
        case 'give': case 'take': checkItem(line, c.item); break;
        case 'minigame':
          if (!(MINIGAME_IDS as readonly string[]).includes(c.id)) err(line, `unknown mini-game "${c.id}"${didYouMean(c.id, MINIGAME_IDS)} (${MINIGAME_IDS.join(', ')})`);
          break;
        case 'cg':
          if (c.id && !/^cg_(p1|p2|p3|trio)_[a-z0-9_]+$/.test(c.id)) warn(line, `CG id "${c.id}" should look like cg_<p1|p2|p3|trio>_<slug>`);
          break;
        case 'call':
          if (c.scene === s.id) err(line, `[call ${c.scene}] calls itself`);
          else checkSceneRef(line, c.scene);
          break;
        case 'remember': case 'input': case 'chat':
          checkText(line, c.kind === 'remember' ? c.fact : c.prompt ?? '');
          break;
        case 'bond':
          if (Math.abs(c.n) > 150) warn(line, `[bond ${c.pig} ${c.n}] is a lot (heart events give +40…+100; 100 points = 1 heart)`);
          break;
        default:
          break;
      }
    }
  }

  issues.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return { scenes, issues };
}
