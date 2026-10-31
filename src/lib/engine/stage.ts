// Public API of the canvas stage. Owner: renderer agent.
// Logical coordinates: height 270, width = stage.logicalWidth (150..480), origin top-left.
//
// `stage` is a singleton scene. Mount <Stage /> (./Stage.svelte) wherever the canvas should appear:
// it binds to this singleton, so backgrounds, portraits and actors survive screen swaps (call
// stage.reset() for a clean slate). While no <Stage /> is mounted, timed calls resolve immediately.
import type { AnimId, BackgroundId, Expression, LocationId, OutfitId, PigId, SfxId, TimeOfDay } from '../types';
import type { DropKind } from './physics';
import { world } from './world';

// Sprite/asset metadata helpers for screens that draw pigs in the DOM (face icons, viewers).
export { assetUrl, hasBackground, hasCG } from './assets';
export { facePath, hasClip, outfitHasClip, resolveClip, resolvePortrait, type ClipRef, type PortraitRef } from './sprites';
export type { DropKind } from './physics';

export type PortraitPos = 'far-left' | 'left' | 'center' | 'right' | 'far-right';
export type Transition = 'cut' | 'fade' | 'wipe' | 'iris';
export type PetalLevel = 'off' | 'light' | 'normal' | 'heavy';
export type Weather = 'clear' | 'rain' | 'storm';
export type BurstKind = 'hearts' | 'sparkles' | 'zzz' | 'notes' | 'crumbs' | 'bubbles' | 'sweat' | 'anger';

export interface BackgroundOptions {
  /** Horizontal point (0..480) kept in view on narrow stages. Defaults to the location's focusX, else 240. */
  focusX?: number;
  /** Force time-of-day grading on/off (default: outdoor or has a night variant). */
  grade?: boolean;
}

export interface PushInOptions {
  /** Zoom factor (default 1.1). */
  zoom?: number;
  /** Zoom center in logical px (default: the speaker / first actor / stage center). */
  focusX?: number;
  focusY?: number;
  /** Darken the world layer (background + actors) by this much (default 0.3). */
  dim?: number;
  /** Duration (default 250 ms). */
  ms?: number;
}

export interface IdleOptions {
  /** Walk band for idle strolls, logical px (default 20%–80% of the stage width). */
  minX?: number;
  maxX?: number;
  /** A status clip (hungry, dirty, bored, yawn, sick…) mixed into 30% of idle picks; null clears. */
  status?: AnimId | null;
}

export interface GoldenPetalOptions {
  /** Starting x in logical px (default: random across the middle of the stage). */
  x?: number;
  /** Called when the petal drifts off-screen uncaught. */
  onMiss?: () => void;
}

export interface GoldenPetalHandle {
  readonly active: boolean;
  /** Catch it programmatically (keyboard / button). Returns false if it is already gone. */
  catch(): boolean;
  /** Remove it silently. */
  cancel(): void;
}

export interface StageLayout {
  logicalWidth: number;
  logicalHeight: number;
  /** CSS px per stage px. */
  u: number;
  cssWidth: number;
  cssHeight: number;
}

export interface StageHooks {
  /** Sound effects the stage triggers itself (thunder). Stage.svelte routes this to the audio module. */
  sfx?: (id: SfxId) => void;
}

/**
 * How a released actor came down (see physics.ts classifyDrop): 'soft' gentle put-down, 'drop' short drop,
 * 'hard' high drop / fast throw / bonk on the stage top, 'pop' gentle upward flick. 'caught' = picked up again
 * in mid-air, 'gone' = removed, reset or re-spawned before landing.
 */
export interface DropResult {
  kind: DropKind | 'caught' | 'gone';
  /** Where the feet came to rest (logical px). */
  x: number;
  /** Throw velocity used at release (logical px/s, y down). */
  vx: number;
  vy: number;
  /** Fastest floor impact (px/s), floor bounces, wall hits, whether he bonked the stage top. */
  impact: number;
  bounces: number;
  walls: number;
  ceiling: boolean;
}

/** A contact during a throw (the same object is reused: read it inside the callback). */
export interface ImpactInfo {
  surface: 'floor' | 'wall' | 'ceiling';
  /** Speed into the surface, logical px/s. */
  speed: number;
  /** True for the first floor contact of this throw. */
  first: boolean;
}

export interface ReleaseOptions {
  /**
   * Launch velocity in logical px/s (default: heldThrow(), the hand's throw plus his own swing). Capped. Pass 0, 0 to
   * set him down gently (no throw, no spin). By default the landing is judged on the hand's throw plus only the part
   * of his swing beyond a dangling sway (a put-down mid-sway is still gentle); a velocity passed here is judged as is.
   */
  vx?: number;
  vy?: number;
  /** Called (from the frame loop) on every floor / wall / ceiling contact — landing sounds, shakes. */
  onImpact?: (hit: ImpactInfo) => void;
}

/** The held actor's swing round the hand (the same object is reused: read it right away). */
export interface HeldSwing {
  /** String angle (rad, (−π, π]): 0 = hanging straight down, ±π = upside down above the hand. */
  angle: number;
  /** Swing rate (rad/s, + = clockwise on screen). */
  spin: number;
  /** 0..1: how hard the hand is circling (whirling him round, not rubbing back and forth). */
  whirl: number;
  /** Full turns round the hand since the pick-up (signed, fractional). */
  turns: number;
}

export interface StageApi {
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  /** CSS px per stage px of the mounted <Stage /> (1 when none is mounted). Also exposed as CSS var --u. */
  readonly u: number;
  /** Time of day currently drawn. */
  readonly timeOfDay: TimeOfDay;
  /** Background id last requested (base id, without "_night"), or null. */
  readonly background: BackgroundId | null;

  /** Background by id (public/assets/bg/<id>.png). Resolves when the transition completes. */
  setBackground(id: BackgroundId, transition?: Transition, opts?: BackgroundOptions): Promise<void>;
  /**
   * Background for a location, choosing the day/night variant from the clock. With `pig`, 'dorm'
   * (home) resolves to that pig's own room via backgroundFor() (content/locations.ts).
   */
  setLocation(loc: LocationId, transition?: Transition, pig?: PigId | null): Promise<void>;
  /** Fixed time of day for grading, or 'auto' (game clock, re-checked every minute). */
  setTimeOfDay(t: TimeOfDay | 'auto'): void;
  /** Load and grade a background ahead of time (no visual change). */
  preloadBackground(id: BackgroundId): Promise<void>;
  /** Dialogue camera: zoom 1.0→1.1 with a 30% dim of the world layer (on), or back (off). */
  pushIn(on: boolean, opts?: PushInOptions): Promise<void>;
  /** "Lights off": tint the world layer (background + actors) toward deep night, 0..1 (0 = normal). */
  setDim(amount: number, ms?: number): Promise<void>;
  /** Clear portraits, actors, bubbles, CG, fades, weather, camera; petals back to normal, time to auto. Keeps the background. */
  reset(): void;

  // VN portraits (waist-up, 192x256)
  showPortrait(pig: PigId, expression: Expression, pos?: PortraitPos, outfit?: OutfitId): void;
  setExpression(pig: PigId, expression: Expression): void;
  hidePortrait(pig: PigId): void;
  clearPortraits(): void;
  /** Keep the current dialogue speaker in front until the displayed line changes. null = no pig speaker. */
  setSpeaker(pig: PigId | null): void;
  /** The talking portrait bobs; others dim slightly. null = nobody. */
  setTalking(pig: PigId | null): void;
  /** Preload a pig's portraits and idle/walk pages, or just the parts this screen uses. */
  preload(pig: PigId, outfit?: OutfitId, parts?: { portraits?: boolean; actor?: boolean }): Promise<void>;

  // Hub actors (full-body 128x128 animation frames)
  /** x in logical px (default center); y = ground line for this actor (default stage ground, 252). */
  spawnActor(id: string, pig: PigId, opts?: { x?: number; y?: number; outfit?: OutfitId; anim?: AnimId }): void;
  /**
   * Play a clip. One-shot clips resolve when finished (then hold the last frame until the next call,
   * or return to idle when idle behavior is on). Looping clips resolve after `times` cycles (default 1)
   * and keep looping. Interrupted clips resolve immediately.
   */
  playAnim(id: string, anim: AnimId, opts?: { loop?: boolean; times?: number }): Promise<void>;
  /** Walk to x (logical px) using walk_left/right, then idle. */
  moveActor(id: string, x: number, speedPxPerSec?: number): Promise<void>;
  /** Swap an actor's outfit behind a small petal puff. */
  setActorOutfit(id: string, outfit: OutfitId, puff?: boolean): void;
  /** Remove an actor: a hold or throw in progress ends ('gone'), its clip/walk promises resolve, its bubbles go. */
  removeActor(id: string): void;
  clearActors(): void;
  /** Feet position of an actor in logical px. */
  actorPosition(id: string): { x: number; y: number } | null;
  /** Default ground line for actors (logical y of their feet). */
  setGroundY(y: number): void;
  /** Ambient idle picker (idle/blink/look_around/stroll/sit, specialty in alt outfits) every 4–8 s. */
  idleBehavior(id: string, on: boolean, opts?: IdleOptions): void;
  /** Viewport client coordinates (PointerEvent.clientX/Y) → actor id under that pixel (alpha-tested). */
  actorAtClient(clientX: number, clientY: number): string | null;
  /** Viewport client coordinates → logical stage coordinates, or null when outside the canvas. */
  clientToLogical(clientX: number, clientY: number): { x: number; y: number } | null;

  // Pick up & toss (hub). The actor hangs by its grab point (top-center of the 'held' frame, ≈ (64, 6)) on a short,
  // slightly elastic string (physics.ts stepSwing): drags tilt him, whirling the hand spins him round it (feet out),
  // and once let go he flies with gravity, bounces off the stage edges and lands. 2D only (no depth scaling).
  /**
   * Pick an actor up at a pointer position (also catches one in mid-air). Stops its walk/idle; plays 'held'
   * (or a posed fallback with a procedural wiggle when the set has no 'held' clip). True when it is now held. The
   * pointer keeps hold of him where it pressed him, for the whole hold: the grab point keeps that offset from it (a
   * press anywhere on his art below and beside the grab point; one off his art eases him into the hand instead).
   */
  holdActor(id: string, clientX: number, clientY: number): boolean;
  /**
   * Move the held actor with the pointer: its grab point follows at the offset where the pick-up pressed him (outside
   * the canvas is clamped to the stage, and he never goes through the floor).
   */
  moveHeld(clientX: number, clientY: number, timeStamp?: number): void;
  /** Rubbing while held: faster wiggle for a moment (0..1, decays by itself). */
  tickleHeld(amount?: number): void;
  /**
   * Velocity a release would launch him with right now (logical px/s, capped): the hand's (last ~80 ms of moveHeld)
   * plus his own swing round it — let go mid-whirl and he flies off along the tangent.
   */
  heldThrow(): { vx: number; vy: number };
  /**
   * How hard letting go right now would count as a throw (logical px/s): the hand's throw plus only the part of his own
   * swing beyond a dangling sway — what a release's landing is judged on, so a put-down mid-sway is no throw.
   */
  heldToss(): { vx: number; vy: number };
  /** The held actor's swing (angle, spin, whirl, turns), or null when nothing is held. */
  heldSwing(): HeldSwing | null;
  /**
   * Let go: the actor keeps the launch velocity (and the swing's spin), falls (~900 px/s²), bounces off the
   * walls/floor and lands, then returns to normal (idle behavior resumes). Resolves when it comes to rest on the floor.
   */
  releaseHeld(opts?: ReleaseOptions): Promise<DropResult>;
  /** Id of the actor currently held, or null. */
  heldActor(): string | null;
  /** True while an actor is held or still in the air after a throw. */
  isAirborne(id: string): boolean;
  /** Small pixel speech bubble above an actor (or a portrait, by pig id). Auto-hides after `ms`. */
  bubble(id: string, text: string, ms?: number): void;
  clearBubbles(): void;

  // Effects
  /** Trauma-based screen shake (0..1, default 0.5); `ms` sets how long it takes to settle. */
  shake(intensity?: number, ms?: number): void;
  flash(color?: string, ms?: number): void;
  /** Dithered fade over everything; stays until fade('clear'). */
  fade(to: 'black' | 'white' | 'clear', ms?: number): Promise<void>;
  /** Full-frame event picture (public/assets/cg/<id>.png); null hides it. */
  showCG(id: string | null): Promise<void>;
  setPetals(level: PetalLevel): void;
  /**
   * Player petal-density preference, multiplied into every level (survives setPetals/reset):
   * 1 = lots (28 on roomy stages / 16 on phones at 'normal'), ~0.6 = some, 0 = off.
   */
  setPetalScale(scale: number): void;
  /** A little puff of petals at a point (tap on empty stage). */
  petalPuff(x?: number, y?: number, count?: number): void;
  setWeather(w: Weather): void;
  /** Pixel particle burst at (x, y), default above the first actor's head (or the speaker). */
  burst(kind: BurstKind, x?: number, y?: number): void;
  /** Burst anchored to an actor (hearts over the head, crumbs at the mouth, …). */
  burstOn(id: string, kind: BurstKind): void;
  /** Remove every burst particle still on the stage (a screen that leaves mid-reaction takes its hearts with it). */
  clearBursts(): void;
  /** A golden petal drifts down; tapping it (Stage.svelte handles taps) or handle.catch() calls onCatch. */
  spawnGoldenPetal(onCatch: () => void, opts?: GoldenPetalOptions): GoldenPetalHandle;
  /** Try to catch a golden petal under a viewport point; true when one was caught. */
  catchAtClient(clientX: number, clientY: number): boolean;
  setReduceMotion(on: boolean): void;

  // Accessibility & layout
  /** Canvas aria-label (role="img"); null returns to the automatic scene summary. */
  setDescription(text: string | null): void;
  /** Layout changes (logical width, --u); called immediately with the current layout. Returns unsubscribe. */
  onLayout(cb: (layout: StageLayout) => void): () => void;
}

export const stage: StageApi = world;

/** Route the stage's own side effects (Stage.svelte wires sfx to the audio module). */
export function setStageHooks(hooks: StageHooks): void {
  world.hooks = { ...world.hooks, ...hooks };
}
