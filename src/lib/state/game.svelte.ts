// Global game store: the save, the current screen, and small mutation helpers used by every module.
// Owner: UI agent (may extend; keep the existing public surface stable).
import {
  NEED_IDS, PIG_IDS,
  type CareAction, type LocationId, type NeedId, type Needs, type PigId, type PigState, type SaveData,
} from '../types';
import {
  addBondCapped, advance, applyAction, bondLevel, checkAchievements, defaultSettings, newSave, recordDayPlayed,
  type Achievement, type BondSource, type CareResult, type DailyTask, type SimEvent,
} from '../pet';
import { forgetFact } from '../ai/memory';
import { now } from './clock';
import { carrySettingsFlags } from './settings-flags';

/**
 * Screens and the params they read (all optional unless noted):
 * - talk      { pig?: PigId, back?: ScreenId, backParams? }      free chat (default pig: companion)
 * - location  { location?: LocationId }                           (default: save.location)
 * - scene     { id: string (required), back?: ScreenId, backParams? }
 * - minigame  { id: MinigameId (required), pig?: PigId, back?: ScreenId, backParams? }
 * - shop      { location?: LocationId }
 */
export type ScreenId =
  | 'gate' | 'splash' | 'title' | 'newgame' | 'select' | 'hub' | 'talk' | 'map' | 'location'
  | 'shop' | 'bag' | 'profiles' | 'extras' | 'settings' | 'credits' | 'minigame' | 'scene';

const KEY = 'kempanion.save.v1';
const HOUR = 3_600_000;
/** Away longer than this → the welcome-back letter (GAME_DESIGN §14). */
export const LETTER_AWAY_MS = 2 * HOUR;
/** "Present" = tab visible and input within this window (GAME_DESIGN §6). */
const PRESENT_MS = 10 * 60_000;

/** Something the UI should celebrate or announce (bond level-ups, sim events…). */
export type GameEvent =
  | { kind: 'bond_level'; pig: PigId; level: number }
  | { kind: 'sim'; event: SimEvent }
  | { kind: 'money'; amount: number }
  | { kind: 'item'; item: string; count: number }
  | { kind: 'achievement'; achievement: Achievement }
  | { kind: 'task'; task: DailyTask };

function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data?.version !== 1) return null;
    return normalize(data);
  } catch {
    return null;
  }
}

/** Forward-fill fields added after the save was written (and settings). */
function normalize(data: SaveData): SaveData {
  const base = newSave(now()) as unknown as Record<string, unknown>;
  const d = data as unknown as Record<string, unknown>;
  for (const k of Object.keys(base)) if (d[k] === undefined || (d[k] === null && k !== 'companion')) d[k] = base[k];
  data.settings = { ...defaultSettings(), ...data.settings };
  for (const pig of PIG_IDS) {
    data.chatLog[pig] ??= [];
    data.memories[pig] ??= [];
  }
  return data;
}

function snapNeeds(save: SaveData): Needs | null {
  const c = save.companion;
  return c ? { ...save.pigs[c].needs } : null;
}

function needDeltas(before: Needs | null, save: SaveData): Partial<Needs> {
  const c = save.companion;
  const out: Partial<Needs> = {};
  if (!before || !c) return out;
  for (const n of NEED_IDS) {
    const d = Math.round(save.pigs[c].needs[n] - before[n]);
    if (d !== 0) out[n] = d;
  }
  return out;
}

class GameStore {
  /** The live save. Mutate through helpers where possible, then call persist(). */
  save = $state<SaveData>(readSave() ?? newSave(now()));
  /** Whether a save existed when the app booted (enables "Continue"). */
  hasSave = $state(readSave() !== null);
  screen = $state<ScreenId>('gate');
  params = $state<Record<string, unknown>>({});
  /** Increments on every navigation (App keys the screen on it, so same-screen navigation remounts). */
  nav = $state(0);
  /** Pending celebrations, consumed by the UI (toasts, jingles). */
  events = $state<GameEvent[]>([]);
  /** Per-session state that is never saved. */
  session = $state({
    /** Scene ids auto-played from triggers this session (guards against trigger loops). */
    autoScenes: [] as string[],
    /** The companion's room (hub) has shown this session. Until it has, right after the tutorial, no random home
     *  scene takes the room's place (ui/hub/hub.ts arrivalScene). */
    roomShown: false,
  });
  /** Epoch ms of the last pointer/key input (App updates it); drives "present" decay. */
  lastInputAt = now();

  #timer: ReturnType<typeof setTimeout> | null = null;
  #history: { screen: ScreenId; params: Record<string, unknown> }[] = [];
  #booted = false;
  #hiddenAt = 0;
  #hiddenNeeds: Needs | null = null;

  go(screen: ScreenId, params: Record<string, unknown> = {}) {
    if (screen !== this.screen) {
      this.#history.push({ screen: this.screen, params: this.params });
      if (this.#history.length > 24) this.#history.shift();
    }
    this.params = params;
    this.screen = screen;
    this.nav++;
  }

  /** Return to the previous screen (or `fallback` when there is no history). */
  back(fallback: ScreenId = 'hub') {
    let prev = this.#history.pop();
    // Never "go back" into a one-shot screen.
    while (prev && (prev.screen === 'scene' || prev.screen === 'minigame' || prev.screen === 'gate' || prev.screen === 'splash')) {
      prev = this.#history.pop();
    }
    if (!prev) {
      this.params = {};
      this.screen = fallback;
    } else {
      this.params = prev.params;
      this.screen = prev.screen;
    }
    this.nav++;
  }

  /** Debounced write to localStorage. */
  persist() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.flush(), 750);
  }

  flush() {
    if (this.#timer) { clearTimeout(this.#timer); this.#timer = null; }
    try {
      localStorage.setItem(KEY, JSON.stringify($state.snapshot(this.save)));
      this.hasSave = true;
    } catch {
      /* storage full or blocked — the game keeps running in memory */
    }
  }

  /** Start over with a fresh save (keeps settings, including the ones Settings keeps in flags: SETTINGS_FLAGS). */
  reset(playerName = '') {
    const { settings, flags } = this.save;
    this.save = newSave(now(), playerName);
    this.save.settings = settings;
    carrySettingsFlags(flags, this.save.flags);
    this.session.autoScenes = [];
    this.session.roomShown = false;
    this.flush();
  }

  /** Delete the stored save entirely (keeps in-memory settings, the SETTINGS_FLAGS ones too, until the next write). */
  wipe() {
    if (this.#timer) { clearTimeout(this.#timer); this.#timer = null; }
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    const { settings, flags } = this.save;
    this.save = newSave(now());
    this.save.settings = settings;
    carrySettingsFlags(flags, this.save.flags);
    this.hasSave = false;
    this.events = [];
    this.session.autoScenes = [];
    this.session.roomShown = false;
  }

  /** Replace the save from an imported JSON object. */
  importSave(data: SaveData) {
    if (data?.version !== 1 || typeof data.pigs !== 'object' || !data.pigs) throw new Error('Not a Kempanion save file.');
    this.save = normalize(data);
    this.session.autoScenes = [];
    this.session.roomShown = false;
    this.flush();
  }

  /** True when the player is at the keyboard/screen right now. */
  present(at = now()): boolean {
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    return visible && at - this.lastInputAt <= PRESENT_MS;
  }

  /** Run the real-time simulation up to now and queue its events. */
  tick(at = now()) {
    let evs: SimEvent[] = [];
    try {
      evs = advance(this.save, at, { present: this.present(at) });
    } catch (e) {
      console.error('[sim] advance failed', e);
    }
    for (const e of evs) this.events.push({ kind: 'sim', event: e });
    this.persist();
    return evs;
  }

  /** First catch-up after the app opens (the sim records the welcome-back letter itself). */
  boot(at = now()) {
    if (this.#booted) return;
    this.#booted = true;
    if (!this.hasSave || !this.save.companion) return;
    this.tick(at);
    this.recordDay(at);
  }

  /** Count today as a played day (story chapters) — idempotent per day. */
  recordDay(at = now()) {
    if (!this.save.companion) return;
    try { recordDayPlayed(this.save, at); } catch (e) { console.error('[pet] recordDayPlayed failed', e); }
  }

  /** visibilitychange → hidden. */
  markHidden(at = now()) {
    this.#hiddenAt = at;
    this.#hiddenNeeds = snapNeeds(this.save);
  }

  /**
   * visibilitychange → visible: catch up. The sim keeps ticking (slowly) while the tab is hidden, so a long
   * background absence never shows up as one big gap; record it as a welcome-back letter here instead.
   */
  markVisible(at = now()) {
    this.lastInputAt = at;
    const from = this.#hiddenAt;
    this.tick(at);
    const c = this.save.companion;
    if (c && from && at - from >= LETTER_AWAY_MS && !this.save.flags['pet.away']) {
      this.save.flags['pet.away'] = JSON.stringify({ from, to: at, party: false, pig: c, deltas: needDeltas(this.#hiddenNeeds, this.save) });
      this.persist();
    }
    this.#hiddenAt = 0;
    this.#hiddenNeeds = null;
    this.recordDay(at);
  }

  // ── helpers used by scenes, chat and screens ──

  get companion(): PigId | null { return this.save.companion; }
  pig(id: PigId): PigState { return this.save.pigs[id]; }

  addBond(pig: PigId, n: number) {
    const p = this.save.pigs[pig];
    const before = bondLevel(p.bond);
    p.bond = Math.max(0, p.bond + n);
    const after = bondLevel(p.bond);
    if (after > before) this.events.push({ kind: 'bond_level', pig, level: after });
    this.persist();
  }

  /**
   * Routine bond (care, mini-games, wants…) through the pet module's daily caps and heart gate.
   * Returns the amount actually added.
   */
  addBondCapped(pig: PigId, n: number, source: BondSource = 'care'): number {
    const p = this.save.pigs[pig];
    const before = bondLevel(p.bond);
    let added = 0;
    try { added = addBondCapped(this.save, pig, n, source, now()); } catch (e) { console.error('[bond]', e); }
    const after = bondLevel(p.bond);
    if (after > before) this.events.push({ kind: 'bond_level', pig, level: after });
    this.persist();
    return added;
  }

  /** Apply a care action through the pet sim and queue level-up / money / task / achievement events. */
  act(pig: PigId, action: CareAction, itemId?: string): CareResult {
    const p = this.save.pigs[pig];
    const level = bondLevel(p.bond);
    const money = this.save.money;
    let res: CareResult;
    try {
      res = applyAction(this.save, pig, action, itemId, now());
    } catch (e) {
      console.error('[pet] applyAction failed', e);
      res = { ok: false, reason: 'Hmm, that didn’t work. Try again?' };
    }
    this.lastInputAt = now();
    this.report({ levelBefore: level, pig, moneyBefore: money, tasks: res.tasks, achievements: res.achievements });
    this.persist();
    return res;
  }

  /**
   * Queue the follow-up events of something the pet module already applied to the save
   * (care actions, mini-game results, petals, omikuji, visits).
   */
  report(r: { pig?: PigId; levelBefore?: number; moneyBefore?: number; tasks?: DailyTask[]; achievements?: Achievement[] }) {
    if (r.pig && r.levelBefore !== undefined) {
      const after = bondLevel(this.save.pigs[r.pig].bond);
      if (after > r.levelBefore) this.events.push({ kind: 'bond_level', pig: r.pig, level: after });
    }
    if (r.moneyBefore !== undefined) {
      const dm = this.save.money - r.moneyBefore;
      if (dm > 0) this.events.push({ kind: 'money', amount: dm });
    }
    for (const task of r.tasks ?? []) this.events.push({ kind: 'task', task });
    for (const achievement of r.achievements ?? []) this.events.push({ kind: 'achievement', achievement });
  }

  /** Record newly unlocked achievements as events (the pet module stores them in save.achievements). */
  checkAchievements() {
    try {
      for (const achievement of checkAchievements(this.save)) this.events.push({ kind: 'achievement', achievement });
    } catch (e) {
      console.error('[pet] checkAchievements failed', e);
    }
  }

  changeNeed(pig: PigId, need: NeedId, delta: number) {
    const p = this.save.pigs[pig];
    p.needs[need] = Math.max(0, Math.min(100, p.needs[need] + delta));
    this.persist();
  }

  addMoney(n: number) {
    this.save.money = Math.max(0, this.save.money + n);
    if (n > 0) this.events.push({ kind: 'money', amount: n });
    this.persist();
  }

  give(item: string, n = 1) {
    this.save.inventory[item] = (this.save.inventory[item] ?? 0) + n;
    this.events.push({ kind: 'item', item, count: n });
    this.persist();
  }

  take(item: string, n = 1): boolean {
    const have = this.save.inventory[item] ?? 0;
    if (have < n) return false;
    if (have === n) delete this.save.inventory[item];
    else this.save.inventory[item] = have - n;
    this.persist();
    return true;
  }

  has(item: string, n = 1) { return (this.save.inventory[item] ?? 0) >= n; }

  flag(name: string) { return this.save.flags[name]; }
  setFlag(name: string, value: boolean | number | string = true) { this.save.flags[name] = value; this.persist(); }
  unsetFlag(name: string) { delete this.save.flags[name]; this.persist(); }

  seen(sceneId: string) { return this.save.seenScenes.includes(sceneId); }
  markSeen(sceneId: string) { if (!this.seen(sceneId)) this.save.seenScenes.push(sceneId); this.persist(); }

  unlock(albumId: string) { if (!this.save.album.includes(albumId)) this.save.album.push(albumId); this.persist(); }

  count(counter: string, n = 1) { this.save.counters[counter] = (this.save.counters[counter] ?? 0) + n; this.persist(); }

  setLocation(loc: LocationId) { this.save.location = loc; this.persist(); }

  remember(pig: PigId, fact: string) {
    const list = this.save.memories[pig];
    if (list.includes(fact)) return;
    list.push(fact);
    if (list.length > 24) list.splice(0, list.length - 24);
    this.persist();
  }

  /**
   * Remove a remembered fact ("What {Pig} knows about you" → forget). The pigs share what the player tells one of
   * them, so a shared fact is forgotten by every pig that has it; a secret stays (and goes) with the one who heard it.
   */
  forget(pig: PigId, fact: string) {
    if (forgetFact(this.save.memories, pig, fact)) this.persist();
  }
}

export const game = new GameStore();

// Never lose progress when the tab is hidden or closed.
if (typeof window !== 'undefined') {
  addEventListener('pagehide', () => game.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') game.flush(); });
}

export const ALL_PIGS = PIG_IDS;
