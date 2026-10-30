// The stage world: all scene state plus the per-frame update and Canvas 2D drawing.
// One instance (re-exported by stage.ts as `stage`); StageViews (Stage.svelte) attach canvases to it,
// so the scene survives screen swaps. With no view attached, timed operations complete immediately.
import { CHARACTERS } from '../content/characters';
import { backgroundFor, HOME_BG, LOCATIONS } from '../content/locations';
import { nowDate } from '../state/clock';
import { timeOfDay as clockTimeOfDay } from '../time';
import { PIG_IDS, type AnimId, type BackgroundId, type Expression, type LocationId, type OutfitId, type PigId, type TimeOfDay } from '../types';
import { clipLength, frameIndexAt, frameIndexIntroLoop } from './anim';
import { context2d, imageIfReady, makeCanvas } from './assets';
import { backgroundCanvas, cgCanvas, describeCG, locationForBackground, preloadBackground as warmBackground } from './backgrounds';
import { ditherStep } from './dither';
import { Bursts, GoldenPetals, Rain, type Golden } from './fx';
import {
  bgCropX, clamp, clientToLogical, clientToStage, DEFAULT_GROUND_Y, featuredPortrait, LOGICAL_H, MAX_LOGICAL_W, NARROW_W,
  PORTRAIT_TOP, portraitCenterX, portraitEnterDir, stepped, type StageFit,
} from './layout';
import { PetalSystem } from './petals';
import {
  capSpeed, classifyDrop, DANGLE, FLIGHT, FLIGHT_REDUCED, HIT_CEILING, HIT_FLOOR, HIT_WALL, LANDED, launchBody, MAX_THROW,
  newFlightBody, PointerTrail, SETTLED, stepDangle, stepFlight, stepSpring, throwVelocity, wrapAngle,
  type Dangle, type DropKind, type FlightBody, type FlightBounds, type Spring,
} from './physics';
import { FRAME, outfitHasClip, PORTRAIT, preloadPig, resolveClip, resolvePortrait, type ClipRef, type PortraitRef } from './sprites';
import type {
  BackgroundOptions, BurstKind, DropResult, GoldenPetalHandle, GoldenPetalOptions, IdleOptions, ImpactInfo, PetalLevel,
  PortraitPos, PushInOptions, ReleaseOptions, StageApi, StageHooks, StageLayout, Transition, Weather,
} from './stage';
import { ditherComposite, ditherFill, drawIris, drawSakuraWipe, irisMaxRadius } from './transitions';
import type { StageView } from './view';

type Done = () => void;

const INK = '#1b1229';
const TAU = Math.PI * 2;
/** Walk speed that matches the walk cycle's stride; faster moves speed the cycle up. */
const WALK_SPEED = 48;
const PORTRAIT_FADE = 150;
const CG_FADE = 420;
/** Bubble anchor: this far above an actor's feet. */
const HEAD_ABOVE_FEET = 102;
const SPECIALTY: Record<PigId, AnimId> = { 'piggy-1': 'volleyball_ready', 'piggy-2': 'review_mri', 'piggy-3': 'typing' };
const TOD_WORDS: Record<TimeOfDay, string> = { morning: 'morning', day: 'daytime', evening: 'evening', night: 'night' };
/** Scene names for backgrounds that are not a place at a time of day. */
const TIMELESS: Record<string, string> = {
  map: 'The campus map',
  title: 'Century Tower at golden hour, sakura drifting',
  legend_sakura: 'The Century Sakura at dusk',
};
/** Where each burst starts relative to an actor's feet: [dx, height above feet]. */
const BURST_ANCHOR: Record<BurstKind, readonly [number, number]> = {
  hearts: [0, 104], sparkles: [0, 60], zzz: [14, 92], notes: [0, 100], crumbs: [2, 62], bubbles: [0, 50], sweat: [0, 88], anger: [8, 96],
};

const isPig = (id: string): id is PigId => (PIG_IDS as readonly string[]).includes(id);
const nightAmount = (t: TimeOfDay) => (t === 'night' ? 1 : t === 'evening' ? 0.35 : 0);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

// ── pick up & toss ──
// Frame geometry (128×128 cells, feet pivot at FRAME.pivotY): the body box is centered on BODY_CY, and a held
// pig hangs from GRAB_Y_HELD — the top-center of the 'held' clip frames (art contract: grab point ≈ (64, 6)).
const AIR_NONE = 0;
const AIR_HELD = 1;
const AIR_FLY = 2;
/** On the floor after a throw: still righting itself / sliding, but clips may play again. */
const AIR_SETTLE = 3;
const BODY_CY = 63;
const GRAB_Y_HELD = 6;
/** Grab point for the posed fallback frames (no 'held' clip yet): just under the ears. */
const GRAB_Y_POSE = 8;
/** The 'held' clip's first frame (startled) plays once, then frames 1..n-1 loop. */
const HELD_LOOP_FROM = 1;
/** Clamp for the pointer's acceleration feeding the dangle (px/s²): lively, not floppy. */
const PIVOT_ACC = 9000;
/** Drawn rotation steps: 1° (keeps nearest-neighbor rotation from shimmering on tiny sways). */
const ANGLE_STEP = Math.PI / 180;
const SHADOW = 'rgba(27,18,41,0.28)';

interface AirState {
  mode: number;
  /** Body center (world px), velocity and rotation — the source of truth in the air. */
  body: FlightBody;
  dangle: Dangle;
  /** Pointer target for the grab point (world px, clamped) and the pick-up offset that eases to 0. */
  tx: number;
  ty: number;
  ox: number;
  oy: number;
  /** Drawn grab point and its smoothed velocity / acceleration (they drive the dangle). */
  gx: number;
  gy: number;
  pvx: number;
  pvy: number;
  pax: number;
  pay: number;
  /** Frame-local y of the grab point for the current pose. */
  grabY: number;
  /** ms since pick-up; sway clock (s); tickle 0..1; fallback kick clock (ms). */
  heldT: number;
  phase: number;
  tickle: number;
  kickT: number;
  /** No 'held' clip for this outfit: posed frames ('surprised' startle, then 'jump' kicks) + procedural wiggle. */
  fallback: boolean;
  startle: ClipRef | null;
  kick: ClipRef | null;
  trail: PointerTrail;
  /** Throw velocity used at release (logical px/s). */
  rvx: number;
  rvy: number;
  /** Next floor contact is the first of this throw. */
  first: boolean;
  onImpact: ((hit: ImpactInfo) => void) | null;
  done: ((r: DropResult) => void) | null;
}

/** Start loading the 'held' atlas page early so the first pick-up never shows a stale frame. */
function warmHeld(pig: PigId, outfit: OutfitId) {
  if (outfitHasClip(pig, outfit, 'held')) imageIfReady(resolveClip(pig, outfit, 'held').clip.page);
}

function newAir(): AirState {
  return {
    mode: AIR_NONE, body: newFlightBody(), dangle: { angle: 0, vel: 0 },
    tx: 0, ty: 0, ox: 0, oy: 0, gx: 0, gy: 0, pvx: 0, pvy: 0, pax: 0, pay: 0,
    grabY: GRAB_Y_HELD, heldT: 0, phase: 0, tickle: 0, kickT: 0,
    fallback: false, startle: null, kick: null, trail: new PointerTrail(16),
    rvx: 0, rvy: 0, first: true, onImpact: null, done: null,
  };
}

interface Timer { at: number; done: Done }

interface BgState { id: BackgroundId; canvas: HTMLCanvasElement; focusX: number }

interface BgTransition {
  kind: 'fade' | 'wipe' | 'iris';
  from: BgState | null;
  to: BgState;
  t: number;
  dur: number;
  swapAt: number;
  swapped: boolean;
  smooth: boolean;
  cx: number;
  cy: number;
  seed: number;
  done: Done;
}

interface PortraitState {
  id: PigId;
  outfit: OutfitId;
  expression: Expression;
  pos: PortraitPos;
  ref: PortraitRef;
  /** x the portrait slides from when its slot changes. */
  fromX: number;
  moveT: number;
  /** 0..1 enter progress (decreases while leaving). */
  enter: number;
  leaving: boolean;
  /** ms since the last expression change (pop). */
  pop: number;
  order: number;
  featuredAt: number;
  /** Dimmed copy of the current cell (non-speaker), rebuilt when `ref` changes. */
  dimRef: PortraitRef | null;
  dimCell: HTMLCanvasElement | null;
}

interface IdleState {
  on: boolean;
  minX: number | null;
  maxX: number | null;
  status: AnimId | null;
  nextAt: number;
  token: number;
  running: boolean;
}

interface Actor {
  id: string;
  pig: PigId;
  outfit: OutfitId;
  x: number;
  /** Own ground line, or null for the stage default. */
  y: number | null;
  anim: AnimId;
  ref: ClipRef;
  total: number;
  t: number;
  rate: number;
  loop: boolean;
  times: number;
  done: Done | null;
  move: { to: number; speed: number; done: Done } | null;
  idle: IdleState;
  /** External playAnim/moveActor calls in flight (idle behavior waits for them). */
  busy: number;
  /** Last frame actually drawn (kept while a new atlas page loads; used for hit tests). */
  img: HTMLImageElement | null;
  sx: number;
  sy: number;
  flip: boolean;
  zzz: number;
  order: number;
  /** Picked up / thrown state (allocated on the first pick-up, then reused). */
  air: AirState | null;
  /** Drawn rotation (rad): around the body center in the air, around the feet on the ground. */
  angle: number;
  /** Squash (+: wider and shorter) / stretch (−) around frame-local y `squashY`. */
  squash: Spring;
  squashY: number;
  /** Fixed frame override (posed fallback frames while held). */
  pose: ClipRef | null;
  poseFrame: number;
  /** Intro frames of a looping clip that play once ('held'). */
  loopFrom: number;
}

/** A speech bubble; x/y (logical, bottom-center anchor) are refreshed every frame. */
export interface BubbleState {
  key: number;
  target: string;
  pig: PigId | null;
  text: string;
  until: number;
  x: number;
  y: number;
}

interface CgState { id: string; canvas: HTMLCanvasElement }

const INERT_HANDLE: GoldenPetalHandle = { active: false, catch: () => false, cancel: () => {} };

export class StageWorld implements StageApi {
  hooks: StageHooks = {};
  reduceMotion = false;
  readonly bubbles: BubbleState[] = [];

  private lw = MAX_LOGICAL_W;
  private scaleU = 1;
  private cssW = 0;
  private cssH = 0;
  private large = true;
  private layoutListeners = new Set<(l: StageLayout) => void>();

  private views: StageView[] = [];
  private view: StageView | null = null;

  private time = 0;
  private timers: Timer[] = [];
  private todMode: TimeOfDay | 'auto' = 'auto';
  private tod: TimeOfDay = clockTimeOfDay(nowDate());
  private nextTodCheck = 60_000;

  private bg: BgState | null = null;
  private bgReq: { id: BackgroundId; opts: BackgroundOptions; loc: LocationId | null } | null = null;
  private bgToken = 0;
  private trans: BgTransition | null = null;
  private location: LocationId | null = null;

  private cam = { z: 1, dim: 0, fx: 240, fy: 135, z0: 1, z1: 1, d0: 0, d1: 0, t: 0, dur: 0, done: null as Done | null };
  private lights = { a: 0, from: 0, to: 0, t: 0, dur: 0, done: null as Done | null };

  private portraits = new Map<PigId, PortraitState>();
  private portraitList: PortraitState[] = [];
  private portraitSeq = 0;
  private talking: PigId | null = null;
  private lastTalking: PigId | null = null;
  private featured: PigId | null = null;
  private dimCache = new Map<string, HTMLCanvasElement>();

  private actors = new Map<string, Actor>();
  private actorList: Actor[] = [];
  private actorSeq = 0;
  private groundY = DEFAULT_GROUND_Y;
  /** Pick up & toss: the held actor, plus scratch objects reused every frame / pointer event. */
  private heldId: string | null = null;
  private readonly bounds: FlightBounds = { left: 0, right: MAX_LOGICAL_W, top: 0, floor: DEFAULT_GROUND_Y };
  private readonly impact: ImpactInfo = { surface: 'floor', speed: 0, first: true };
  private readonly pt = { x: 0, y: 0 };
  private readonly vel = { vx: 0, vy: 0 };

  private petals = new PetalSystem();
  private rain = new Rain();
  private bursts = new Bursts();
  private golden = new GoldenPetals();
  private missed: Golden[] = [];

  private trauma = 0;
  private traumaDecay = 1.6;
  private shakeX = 0;
  private shakeY = 0;
  private border = 0;
  private flashColor = '#ffffff';
  private flashT = 0;
  private flashDur = 0;
  private flashMax = 0;
  private fadeColor = '#000000';
  private fadeA = 0;
  private fadeFrom = 0;
  private fadeTo = 0;
  private fadeT = 0;
  private fadeDur = 0;
  private fadeDone: Done | null = null;
  private fadeUnder: string | null = null;
  private fadeUnderA = 0;
  private cg: CgState | null = null;
  private cgPrev: CgState | null = null;
  private cgP = 0;
  private cgTarget = 0;
  private cgToken = 0;
  private cgDone: Done | null = null;

  private bubbleSeq = 0;
  private description: string | null = null;

  constructor() {
    this.petals.configure({ level: 'normal', night: nightAmount(this.tod) });
    this.rain.onThunder = () => this.hooks.sfx?.('thunder');
  }

  // ───────────────────────── getters ─────────────────────────

  get logicalWidth(): number { return this.lw; }
  get logicalHeight(): number { return LOGICAL_H; }
  get u(): number { return this.scaleU; }
  get timeOfDay(): TimeOfDay { return this.tod; }
  get background(): BackgroundId | null { return this.bgReq?.id ?? null; }

  // ───────────────────────── views (Stage.svelte) ─────────────────────────

  /** A mounted view registers; the most recently mounted one draws. */
  attach(view: StageView): void {
    if (!this.views.includes(view)) this.views.push(view);
    this.activate(view);
  }

  detach(view: StageView): void {
    const i = this.views.indexOf(view);
    if (i >= 0) this.views.splice(i, 1);
    if (this.view !== view) return;
    view.setActive(false);
    this.view = null;
    const next = this.views[this.views.length - 1];
    if (next) this.activate(next);
    else this.fastForward();
  }

  private activate(view: StageView) {
    if (this.view && this.view !== view) this.view.setActive(false);
    this.view = view;
    view.setActive(true);
    view.bubblesChanged();
    this.refreshTod(); // the world clock stood still while nothing was mounted
  }

  setLayout(fit: StageFit, large: boolean): void {
    const changed = fit.lw !== this.lw || fit.u !== this.scaleU || large !== this.large || fit.cssW !== this.cssW || fit.cssH !== this.cssH;
    this.lw = fit.lw;
    this.scaleU = fit.u;
    this.cssW = fit.cssW;
    this.cssH = fit.cssH;
    this.large = large;
    this.petals.configure({ lw: this.lw, large });
    this.rain.resize(this.lw, LOGICAL_H);
    if (!changed) return;
    const l = this.layout();
    for (const cb of this.layoutListeners) cb(l);
  }

  private layout(): StageLayout {
    return { logicalWidth: this.lw, logicalHeight: LOGICAL_H, u: this.scaleU, cssWidth: this.cssW, cssHeight: this.cssH };
  }

  onLayout(cb: (layout: StageLayout) => void): () => void {
    this.layoutListeners.add(cb);
    cb(this.layout());
    return () => {
      this.layoutListeners.delete(cb);
    };
  }

  /** Finish every timed operation instantly (nothing is left to animate it). */
  private fastForward() {
    this.finishTransition();
    this.finishCamera();
    this.finishLights();
    this.finishFade();
    if (this.cgDone) this.finishCG();
    for (const p of this.portraitList.slice()) {
      if (p.leaving) this.removePortraitNow(p.id);
      else p.enter = 1;
    }
    for (const a of this.actorList) {
      this.stopMove(a, true);
      if (a.air && a.air.mode !== AIR_NONE) this.endAir(a, a.air.mode === AIR_HELD ? 'gone' : 'drop');
      if (a.done) {
        a.t = a.total * a.times;
        this.settle(a);
      }
    }
    for (const t of this.timers.splice(0)) t.done();
  }

  private wait(ms: number): Promise<void> {
    if (!this.view || ms <= 0) return Promise.resolve();
    return new Promise((done) => this.timers.push({ at: this.time + ms, done }));
  }

  // ───────────────────────── time of day ─────────────────────────

  setTimeOfDay(t: TimeOfDay | 'auto'): void {
    this.todMode = t;
    this.refreshTod();
  }

  private currentTod(): TimeOfDay {
    return this.todMode === 'auto' ? clockTimeOfDay(nowDate()) : this.todMode;
  }

  /** Adopt the current time of day; true when it changed. */
  private syncTod(): boolean {
    const t = this.currentTod();
    if (t === this.tod) return false;
    this.tod = t;
    this.petals.configure({ night: nightAmount(t) });
    return true;
  }

  private refreshTod() {
    this.nextTodCheck = this.time + 60_000;
    if (!this.syncTod()) return;
    const req = this.bgReq;
    if (req) void this.applyBackground(req.id, 'slow', req.opts, req.loc);
  }

  // ───────────────────────── backgrounds ─────────────────────────

  setBackground(id: BackgroundId, transition?: Transition, opts: BackgroundOptions = {}): Promise<void> {
    return this.applyBackground(id, transition ?? this.defaultTransition(), opts, null);
  }

  setLocation(loc: LocationId, transition?: Transition, pig?: PigId | null): Promise<void> {
    const def = LOCATIONS[loc];
    const bg = pig ? backgroundFor(loc, pig) : def.bg;
    return this.applyBackground(bg, transition ?? this.defaultTransition(), { focusX: def.focusX }, loc);
  }

  preloadBackground(id: BackgroundId): Promise<void> {
    return warmBackground(id, this.tod).catch(() => undefined);
  }

  private defaultTransition(): Transition {
    return this.bg ? 'fade' : 'cut';
  }

  private async applyBackground(id: BackgroundId, kind: Transition | 'slow', opts: BackgroundOptions, loc: LocationId | null): Promise<void> {
    const token = ++this.bgToken;
    this.bgReq = { id, opts, loc };
    this.location = loc;
    this.syncTod();
    const focusX = opts.focusX ?? locationForBackground(id)?.focusX ?? 240;
    let canvas: HTMLCanvasElement;
    try {
      canvas = await backgroundCanvas(id, this.tod, opts.grade);
    } catch {
      return; // no canvas support (e.g. tests): nothing to draw
    }
    if (token !== this.bgToken) return;
    return this.startTransition({ id, canvas, focusX }, kind);
  }

  private startTransition(next: BgState, kind: Transition | 'slow'): Promise<void> {
    this.finishTransition();
    const from = this.bg;
    const same = from !== null && from.canvas === next.canvas && from.focusX === next.focusX;
    if (kind === 'cut' || !this.view || same) {
      this.bg = next;
      return Promise.resolve();
    }
    const smooth = this.reduceMotion;
    const covered = !smooth && (kind === 'wipe' || kind === 'iris');
    const dur = smooth ? 200 : kind === 'fade' ? 320 : kind === 'slow' ? 1200 : kind === 'wipe' ? 700 : 600;
    const focus = this.focusPoint();
    return new Promise((done) => {
      this.trans = {
        kind: covered ? (kind as 'wipe' | 'iris') : 'fade',
        from, to: next, t: 0, dur,
        swapAt: covered ? dur / 2 : 0,
        swapped: !covered,
        smooth,
        cx: focus.x, cy: focus.y,
        seed: (Math.random() * 1e9) | 0,
        done,
      };
      if (!covered) this.bg = next;
    });
  }

  private finishTransition() {
    const tr = this.trans;
    if (!tr) return;
    this.trans = null;
    this.bg = tr.to;
    tr.done();
  }

  /** Where the camera / iris should center: the speaker, else the first actor, else the middle. */
  private focusPoint(): { x: number; y: number } {
    const p = this.talking ? this.portraits.get(this.talking) : undefined;
    if (p && !p.leaving) return { x: this.portraitX(p), y: 110 };
    const a = this.actorList[0];
    if (a) return { x: Math.round(a.x), y: this.actorY(a) - 60 };
    return { x: Math.round(this.lw / 2), y: 135 };
  }

  // ───────────────────────── camera ─────────────────────────

  pushIn(on: boolean, opts: PushInOptions = {}): Promise<void> {
    this.finishCamera();
    const c = this.cam;
    if (on) {
      const f = this.focusPoint();
      c.fx = opts.focusX ?? f.x;
      c.fy = opts.focusY ?? f.y;
    }
    c.z0 = c.z;
    c.d0 = c.dim;
    c.z1 = on && !this.reduceMotion ? clamp(opts.zoom ?? 1.1, 1, 2) : 1;
    c.d1 = on ? clamp(opts.dim ?? 0.3, 0, 0.9) : 0;
    c.t = 0;
    c.dur = opts.ms ?? (this.reduceMotion ? 200 : 250);
    if (!this.view || c.dur <= 0) {
      c.z = c.z1;
      c.dim = c.d1;
      return Promise.resolve();
    }
    return new Promise((done) => {
      c.done = done;
    });
  }

  private finishCamera() {
    const c = this.cam;
    if (!c.done) return;
    c.z = c.z1;
    c.dim = c.d1;
    const d = c.done;
    c.done = null;
    d();
  }

  setDim(amount: number, ms = 300): Promise<void> {
    this.finishLights();
    const l = this.lights;
    l.from = l.a;
    l.to = clamp(Number.isFinite(amount) ? amount : 0, 0, 0.9);
    l.t = 0;
    l.dur = ms;
    if (!this.view || ms <= 0 || l.from === l.to) {
      l.a = l.to;
      return Promise.resolve();
    }
    return new Promise((done) => {
      l.done = done;
    });
  }

  private finishLights() {
    const l = this.lights;
    if (!l.done) return;
    l.a = l.to;
    const d = l.done;
    l.done = null;
    d();
  }

  // ───────────────────────── portraits ─────────────────────────

  showPortrait(pig: PigId, expression: Expression, pos: PortraitPos = 'center', outfit?: OutfitId): void {
    const existing = this.portraits.get(pig);
    const o = outfit ?? existing?.outfit ?? 'everyday';
    const ref = resolvePortrait(pig, o, expression);
    void preloadPig(pig, o, { actor: false });
    if (existing) {
      const changed = existing.ref.atlas !== ref.atlas || existing.ref.x !== ref.x || existing.ref.y !== ref.y;
      if (existing.leaving) {
        existing.leaving = false;
        existing.pos = pos;
        existing.moveT = 1;
      } else {
        if (changed) existing.pop = 0;
        if (existing.pos !== pos) {
          existing.fromX = this.portraitX(existing);
          existing.moveT = this.view && !this.reduceMotion ? 0 : 1;
          existing.pos = pos;
        }
      }
      existing.outfit = o;
      existing.expression = expression;
      existing.ref = ref;
      return;
    }
    const p: PortraitState = {
      id: pig, outfit: o, expression, pos, ref,
      fromX: portraitCenterX(pos, this.lw), moveT: 1,
      enter: this.view ? 0 : 1, leaving: false,
      pop: Infinity, order: ++this.portraitSeq, featuredAt: -Infinity, dimRef: null, dimCell: null,
    };
    this.portraits.set(pig, p);
    this.portraitList.push(p);
  }

  setExpression(pig: PigId, expression: Expression): void {
    const p = this.portraits.get(pig);
    if (!p || p.leaving) return;
    const ref = resolvePortrait(pig, p.outfit, expression);
    if (ref.atlas !== p.ref.atlas || ref.x !== p.ref.x || ref.y !== p.ref.y) p.pop = 0;
    p.ref = ref;
    p.expression = expression;
  }

  hidePortrait(pig: PigId): void {
    const p = this.portraits.get(pig);
    if (!p) return;
    if (!this.view) this.removePortraitNow(pig);
    else p.leaving = true;
  }

  clearPortraits(): void {
    for (const p of this.portraitList.slice()) this.hidePortrait(p.id);
  }

  private removePortraitNow(pig: PigId) {
    const p = this.portraits.get(pig);
    if (!p) return;
    this.portraits.delete(pig);
    const i = this.portraitList.indexOf(p);
    if (i >= 0) this.portraitList.splice(i, 1);
  }

  setTalking(pig: PigId | null): void {
    this.talking = pig;
    if (pig) this.lastTalking = pig;
  }

  preload(pig: PigId, outfit: OutfitId = 'everyday'): Promise<void> {
    return preloadPig(pig, outfit);
  }

  private portraitX(p: PortraitState): number {
    const target = portraitCenterX(p.pos, this.lw);
    if (p.moveT >= 1) return target;
    return Math.round(p.fromX + (target - p.fromX) * stepped(p.moveT, 4));
  }

  // ───────────────────────── actors ─────────────────────────

  spawnActor(id: string, pig: PigId, opts: { x?: number; y?: number; outfit?: OutfitId; anim?: AnimId } = {}): void {
    const a = this.actors.get(id);
    const outfit = opts.outfit ?? (a && a.pig === pig ? a.outfit : 'everyday');
    void preloadPig(pig, outfit, { portraits: false });
    warmHeld(pig, outfit);
    if (a) {
      // re-spawn: settle whatever the old actor was doing, keep the slot (and its idle settings)
      this.stopMove(a, false);
      if (a.air && a.air.mode !== AIR_NONE) this.endAir(a, 'gone');
      this.settle(a);
      a.pig = pig;
      a.outfit = outfit;
      if (opts.x !== undefined) a.x = opts.x;
      if (opts.y !== undefined) a.y = opts.y;
      this.setClip(a, opts.anim ?? a.anim, undefined, 1, true);
      this.sortActors();
      return;
    }
    const ref = resolveClip(pig, outfit, 'idle');
    const actor: Actor = {
      id, pig, outfit,
      x: opts.x ?? Math.round(this.lw / 2),
      y: opts.y ?? null,
      anim: 'idle', ref, total: clipLength(ref.clip.durations), t: 0, rate: 1, loop: true, times: 1,
      done: null, move: null,
      idle: { on: false, minX: null, maxX: null, status: null, nextAt: 0, token: 0, running: false },
      busy: 0, img: null, sx: 0, sy: 0, flip: false, zzz: 0, order: ++this.actorSeq,
      air: null, angle: 0, squash: { value: 0, vel: 0 }, squashY: FRAME.pivotY, pose: null, poseFrame: 0, loopFrom: 0,
    };
    this.setClip(actor, opts.anim ?? 'idle', undefined, 1, true);
    this.actors.set(id, actor);
    this.actorList.push(actor);
    this.sortActors();
  }

  private sortActors() {
    this.actorList.sort((p, q) => this.actorY(p) - this.actorY(q) || p.order - q.order);
  }

  /** Feet line of an actor: its own ground (or the stage ground); in the air, under the (upright) body center. */
  private actorY(a: Actor): number {
    const air = a.air;
    if (air && air.mode !== AIR_NONE) return air.body.y + (FRAME.pivotY - BODY_CY);
    return a.y ?? this.groundY;
  }

  /** Floor line an actor lands on. */
  private floorOf(a: Actor): number {
    return a.y ?? this.groundY;
  }

  /** Held or flying: clips and walks requested from outside are ignored until it lands. */
  private inAir(a: Actor): boolean {
    const m = a.air ? a.air.mode : AIR_NONE;
    return m === AIR_HELD || m === AIR_FLY;
  }

  private setClip(a: Actor, anim: AnimId, loop: boolean | undefined, times: number, force = false) {
    const ref = resolveClip(a.pig, a.outfit, anim);
    const lp = loop ?? ref.clip.loop;
    const n = Math.max(1, Math.floor(times));
    a.pose = null;
    a.loopFrom = 0;
    if (!force && a.ref.clip === ref.clip && a.loop && lp && a.times === n && a.ref.flip === ref.flip) {
      a.anim = anim;
      return; // already looping this clip: no hitch
    }
    a.anim = anim;
    a.ref = ref;
    a.total = clipLength(ref.clip.durations);
    a.t = 0;
    a.loop = lp;
    a.times = n;
    a.rate = 1;
    imageIfReady(ref.clip.page);
  }

  /** Resolve the pending clip promise, if any. */
  private settle(a: Actor) {
    const d = a.done;
    a.done = null;
    d?.();
  }

  private stopMove(a: Actor, arrive: boolean) {
    const m = a.move;
    if (!m) return;
    a.move = null;
    a.rate = 1;
    if (arrive) a.x = m.to;
    m.done();
  }

  private play(a: Actor, anim: AnimId, opts: { loop?: boolean; times?: number } = {}): Promise<void> {
    this.stopMove(a, false);
    this.settle(a);
    this.setClip(a, anim, opts.loop, opts.times ?? 1, true);
    if (!this.view) {
      a.t = a.total * a.times;
      return Promise.resolve();
    }
    return new Promise((done) => {
      a.done = done;
    });
  }

  private walk(a: Actor, x: number, speed: number): Promise<void> {
    this.stopMove(a, false);
    this.settle(a);
    const dx = x - a.x;
    if (!this.view || Math.abs(dx) < 0.5 || !(speed > 0)) {
      a.x = x;
      this.setClip(a, 'idle', true, 1);
      return Promise.resolve();
    }
    this.setClip(a, dx < 0 ? 'walk_left' : 'walk_right', true, 1, true);
    a.rate = clamp(speed / WALK_SPEED, 0.5, 2);
    return new Promise((done) => {
      a.move = { to: x, speed, done };
    });
  }

  /** Wrap a caller-requested action so idle behavior pauses for it. */
  private external(a: Actor, p: Promise<void>): Promise<void> {
    a.busy++;
    a.idle.token++;
    a.idle.running = false;
    return p.then(() => {
      a.busy = Math.max(0, a.busy - 1);
      if (a.busy === 0) a.idle.nextAt = this.time + rand(4000, 8000);
    });
  }

  playAnim(id: string, anim: AnimId, opts: { loop?: boolean; times?: number } = {}): Promise<void> {
    const a = this.actors.get(id);
    if (!a || this.inAir(a)) return Promise.resolve(); // he is dangling / flying: the landing decides what's next
    return this.external(a, this.play(a, anim, opts));
  }

  moveActor(id: string, x: number, speedPxPerSec = WALK_SPEED): Promise<void> {
    const a = this.actors.get(id);
    if (!a || (a.air && a.air.mode !== AIR_NONE)) return Promise.resolve();
    return this.external(a, this.walk(a, x, speedPxPerSec));
  }

  setActorOutfit(id: string, outfit: OutfitId, puff = true): void {
    const a = this.actors.get(id);
    if (!a || a.outfit === outfit) return;
    a.outfit = outfit;
    void preloadPig(a.pig, outfit, { portraits: false });
    warmHeld(a.pig, outfit);
    const t = a.t;
    this.setClip(a, a.anim, a.loop, a.times, true);
    a.t = t;
    if (a.air && this.inAir(a)) this.setHeldPose(a, a.air);
    if (puff) this.petals.puff(a.x, this.actorY(a) - 50, 12);
  }

  removeActor(id: string): void {
    const a = this.actors.get(id);
    if (!a) return;
    a.idle.on = false;
    a.idle.token++;
    this.stopMove(a, false);
    if (a.air && a.air.mode !== AIR_NONE) this.endAir(a, 'gone');
    this.settle(a);
    this.actors.delete(id);
    const i = this.actorList.indexOf(a);
    if (i >= 0) this.actorList.splice(i, 1);
    this.removeBubbles(id);
  }

  clearActors(): void {
    for (const a of this.actorList.slice()) this.removeActor(a.id);
  }

  actorPosition(id: string): { x: number; y: number } | null {
    const a = this.actors.get(id);
    return a ? { x: a.x, y: this.actorY(a) } : null;
  }

  setGroundY(y: number): void {
    this.groundY = y;
    this.petals.configure({ groundY: y });
    this.sortActors();
  }

  idleBehavior(id: string, on: boolean, opts: IdleOptions = {}): void {
    const a = this.actors.get(id);
    if (!a) return;
    const s = a.idle;
    if (opts.minX !== undefined) s.minX = opts.minX;
    if (opts.maxX !== undefined) s.maxX = opts.maxX;
    if (opts.status !== undefined) s.status = opts.status;
    if (s.on === on) return;
    s.on = on;
    s.token++;
    s.running = false;
    if (on) s.nextAt = this.time + rand(1500, 4000);
  }

  private updateActor(a: Actor, dt: number) {
    const air = a.air;
    const mode = air ? air.mode : AIR_NONE;
    if (air && mode === AIR_HELD) this.updateHeld(a, air, dt);
    else if (air && mode !== AIR_NONE) this.updateFlight(a, air, dt);
    a.t += dt * a.rate;
    if (a.done && a.t >= a.total * a.times) this.settle(a);
    // in the air or still settling after a throw: no walking, idle picks or zzz
    if (mode !== AIR_NONE) return;
    if (a.squash.value !== 0 || a.squash.vel !== 0) {
      stepSpring(a.squash, dt, 0, 900, 15);
      if (Math.abs(a.squash.value) < 0.002 && Math.abs(a.squash.vel) < 0.02) a.squash.value = a.squash.vel = 0;
    }
    if (a.angle !== 0) {
      a.angle *= Math.exp(-dt / 60);
      if (Math.abs(a.angle) < 0.005) a.angle = 0;
    }
    const m = a.move;
    if (m) {
      const step = (m.speed * dt) / 1000;
      const dx = m.to - a.x;
      if (Math.abs(dx) <= step) {
        a.x = m.to;
        a.move = null;
        a.rate = 1;
        this.setClip(a, 'idle', true, 1);
        m.done();
      } else {
        a.x += Math.sign(dx) * step;
      }
    }
    if (a.anim === 'sleep') {
      a.zzz -= dt;
      if (a.zzz <= 0) {
        a.zzz = 2600;
        this.burstOn(a.id, 'zzz');
      }
    } else {
      a.zzz = 600;
    }
    const s = a.idle;
    // a sleeping pig stays asleep until the hub wakes him
    if (!s.on || s.running || a.busy > 0 || a.move || a.anim === 'sleep') return;
    if (!a.loop && a.t >= a.total * a.times) this.setClip(a, 'idle', true, 1);
    if (this.time >= s.nextAt) void this.runIdle(a);
  }

  private async runIdle(a: Actor) {
    const s = a.idle;
    s.running = true;
    const token = ++s.token;
    const live = () => s.token === token && s.on && this.actors.get(a.id) === a;
    // filler clips must come from the outfit's own atlas: borrowing an everyday clip would flash his clothes
    const has = (anim: AnimId) => outfitHasClip(a.pig, a.outfit, anim);
    const sp = SPECIALTY[a.pig];
    const special = a.outfit !== 'everyday' && has(sp);
    const r = Math.random();
    if (s.status && Math.random() < 0.3) {
      await this.play(a, s.status, { times: 2 });
    } else if (r < 0.55) {
      if (has('blink') && Math.random() < 0.5) await this.play(a, 'blink', { loop: false });
    } else if (r < 0.65 && has('look_around')) {
      await this.play(a, 'look_around', { loop: false });
    } else if (r < 0.8) {
      const lo = Math.max(28, s.minX ?? this.lw * 0.2);
      const hi = Math.min(this.lw - 28, s.maxX ?? this.lw * 0.8);
      if (hi - lo > 30) {
        let x = rand(lo, hi);
        if (Math.abs(x - a.x) < 24) x = a.x < (lo + hi) / 2 ? Math.min(hi, a.x + 40) : Math.max(lo, a.x - 40);
        await this.walk(a, Math.round(x), WALK_SPEED * 0.8);
      }
    } else if (r < 0.9 && has('sit_down') && has('stand_up')) {
      await this.play(a, 'sit_down', { loop: false });
      if (live()) await this.wait(rand(2000, 4000));
      if (live()) await this.play(a, 'stand_up', { loop: false });
    } else if (special) {
      await this.play(a, sp, { times: 2 });
    } else if (has('look_around')) {
      await this.play(a, 'look_around', { loop: false });
    }
    if (!live()) return;
    this.setClip(a, 'idle', true, 1);
    s.running = false;
    s.nextAt = this.time + rand(4000, 8000);
  }

  actorAtClient(clientX: number, clientY: number): string | null {
    const p = this.clientToLogical(clientX, clientY);
    const view = this.view;
    if (!p || !view) return null;
    const c = this.cam;
    const wx = (p.x - c.fx) / c.z + c.fx;
    const wy = (p.y - c.fy) / c.z + c.fy;
    // airborne actors draw on top: test them first
    for (let pass = 0; pass < 2; pass++) {
      for (let i = this.actorList.length - 1; i >= 0; i--) {
        const a = this.actorList[i];
        if (!a.img || (pass === 0) !== (a.air !== null && a.air.mode !== AIR_NONE)) continue;
        if (this.hitActor(view, a, wx, wy)) return a.id;
      }
    }
    return null;
  }

  /** Alpha-accurate hit test in world px, through the actor's rotation / squash. */
  private hitActor(view: StageView, a: Actor, wx: number, wy: number): boolean {
    const img = a.img;
    if (!img) return false;
    const q = this.reduceMotion ? 0 : a.squash.value;
    const ang = this.reduceMotion ? 0 : a.angle;
    const air = a.air && a.air.mode !== AIR_NONE ? a.air : null;
    let lx: number, ly: number;
    if (!air && ang === 0 && Math.abs(q) < 0.004) {
      lx = Math.floor(wx - (Math.round(a.x) - FRAME.pivotX));
      ly = Math.floor(wy - (Math.round(this.actorY(a)) - FRAME.pivotY));
    } else {
      const ry = air ? BODY_CY : FRAME.pivotY;
      const dx = wx - Math.round(air ? air.body.x : a.x);
      const dy = wy - Math.round(air ? air.body.y : this.actorY(a));
      const cs = Math.cos(ang), sn = Math.sin(ang);
      let x = dx * cs + dy * sn;
      let y = -dx * sn + dy * cs;
      const k = a.squashY - ry;
      x /= 1 + q * 0.5;
      y = (y - k) / (1 - q) + k;
      lx = Math.floor(x + FRAME.w / 2);
      ly = Math.floor(y + ry);
    }
    if (lx < -3 || ly < -3 || lx > FRAME.w + 2 || ly > FRAME.h + 2) return false;
    const fx = a.flip ? FRAME.w - 1 - lx : lx;
    return view.hitAlpha(img, a.sx, a.sy, FRAME.w, FRAME.h, fx, ly, 3);
  }

  clientToLogical(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.view?.canvasRect();
    return rect ? clientToLogical(clientX, clientY, rect, this.lw) : null;
  }

  // ───────────────────────── pick up & toss ─────────────────────────

  /** Pointer → world px (through the camera), unclamped. */
  private pointToWorld(clientX: number, clientY: number, out: { x: number; y: number }): boolean {
    const rect = this.view?.canvasRect();
    if (!rect || !clientToStage(clientX, clientY, rect, this.lw, out)) return false;
    const c = this.cam;
    out.x = (out.x - c.fx) / c.z + c.fx;
    out.y = (out.y - c.fy) / c.z + c.fy;
    return true;
  }

  /** Grab point target from a world point: inside the stage, never low enough to push the feet through the floor. */
  private aimGrab(a: Actor, air: AirState, x: number, y: number) {
    const m = FLIGHT.halfW - 4;
    air.tx = clamp(x, m, Math.max(m, this.lw - m));
    air.ty = clamp(y, 2, Math.max(2, this.floorOf(a) - (FRAME.pivotY - air.grabY)));
  }

  heldActor(): string | null {
    return this.heldId;
  }

  isAirborne(id: string): boolean {
    const a = this.actors.get(id);
    return !!a && this.inAir(a);
  }

  holdActor(id: string, clientX: number, clientY: number): boolean {
    const a = this.actors.get(id);
    if (!a || !this.view || (this.heldId !== null && this.heldId !== id)) return false;
    if (!this.pointToWorld(clientX, clientY, this.pt)) return false;
    const air = a.air ?? (a.air = newAir());
    const from = air.mode;
    if (from === AIR_HELD) {
      this.aimGrab(a, air, this.pt.x, this.pt.y);
      return true;
    }
    // drop whatever he was doing (walks, clips, idle picks)
    this.stopMove(a, false);
    this.settle(a);
    a.idle.token++;
    a.idle.running = false;
    const startAngle = from === AIR_NONE ? 0 : clamp(wrapAngle(air.body.angle), -DANGLE.maxAngle, DANGLE.maxAngle);
    const startSpin = from === AIR_NONE ? 0 : clamp(air.body.spin, -8, 8);
    const prevGrab = air.grabY;
    this.setHeldPose(a, air);
    if (from === AIR_NONE) {
      // grab him where his head is: the swap to the dangling frame lines up with the standing one
      air.gx = a.x;
      air.gy = this.floorOf(a) - (FRAME.pivotY - air.grabY);
    } else {
      // caught in mid-air (or while righting himself): the grab point is wherever the body has it now
      const L = BODY_CY - prevGrab;
      air.gx = air.body.x + L * Math.sin(air.body.angle);
      air.gy = air.body.y - L * Math.cos(air.body.angle);
      this.resolveAir(a, air, 'caught');
    }
    air.mode = AIR_HELD;
    air.dangle.angle = this.reduceMotion ? 0 : startAngle;
    air.dangle.vel = this.reduceMotion ? 0 : startSpin;
    this.aimGrab(a, air, this.pt.x, this.pt.y);
    air.ox = air.gx - air.tx;
    air.oy = air.gy - air.ty;
    air.pvx = air.pvy = air.pax = air.pay = 0;
    air.heldT = 0;
    air.tickle = 0;
    air.kickT = 0;
    air.trail.clear();
    air.trail.push(performance.now(), air.tx, air.ty);
    a.angle = air.dangle.angle;
    a.squashY = air.grabY;
    if (!this.reduceMotion) a.squash.vel -= 2.2; // a little stretch as he is yanked up
    this.heldId = id;
    this.placeHeld(a, air);
    return true;
  }

  moveHeld(clientX: number, clientY: number, timeStamp?: number): void {
    const air = this.heldAir();
    if (!air || !this.pointToWorld(clientX, clientY, this.pt)) return;
    this.aimGrab(this.actors.get(this.heldId!)!, air, this.pt.x, this.pt.y);
    // PointerEvent.timeStamp shares performance.now()'s origin in current browsers; distrust anything else
    // (epoch stamps, other clocks) — releases measure against performance.now()
    const clock = performance.now();
    const t = timeStamp !== undefined && Math.abs(timeStamp - clock) < 1000 ? timeStamp : clock;
    air.trail.push(t, air.tx, air.ty);
  }

  tickleHeld(amount = 1): void {
    const air = this.heldAir();
    if (air) air.tickle = Math.max(air.tickle, clamp(Number.isFinite(amount) ? amount : 0, 0, 1));
  }

  heldThrow(): { vx: number; vy: number } {
    const out = { vx: 0, vy: 0 };
    const air = this.heldAir();
    return air ? throwVelocity(air.trail, performance.now(), out) : out;
  }

  releaseHeld(opts: ReleaseOptions = {}): Promise<DropResult> {
    const id = this.heldId;
    const a = id ? this.actors.get(id) : undefined;
    const air = a?.air;
    if (!a || !air || air.mode !== AIR_HELD) {
      return Promise.resolve({ kind: 'gone', x: a ? Math.round(a.x) : 0, vx: 0, vy: 0, impact: 0, bounces: 0, walls: 0, ceiling: false });
    }
    this.heldId = null;
    const v = this.vel;
    if (opts.vx !== undefined || opts.vy !== undefined) capSpeed(opts.vx ?? 0, opts.vy ?? 0, MAX_THROW, v);
    else throwVelocity(air.trail, performance.now(), v);
    const still = this.reduceMotion;
    air.rvx = still ? 0 : v.vx;
    air.rvy = still ? 0 : v.vy;
    // the body keeps the hand's velocity plus its own swing around the grab point
    const L = BODY_CY - air.grabY;
    const w = still ? 0 : air.dangle.vel;
    const ang = still ? 0 : a.angle;
    const spin = still ? 0 : clamp(w + air.rvx * 0.004, -9, 9);
    launchBody(air.body, air.body.x, air.body.y, air.rvx - w * L * Math.cos(ang), air.rvy - w * L * Math.sin(ang), ang, spin);
    air.mode = AIR_FLY;
    air.first = true;
    air.onImpact = opts.onImpact ?? null;
    a.rate = 1.4;
    const done = new Promise<DropResult>((resolve) => {
      air.done = resolve;
    });
    if (!this.view) this.endAir(a, 'drop');
    return done;
  }

  private heldAir(): AirState | null {
    const a = this.heldId ? this.actors.get(this.heldId) : undefined;
    return a?.air && a.air.mode === AIR_HELD ? a.air : null;
  }

  /** The dangling clip, or posed fallback frames from the outfit's own atlas (never a borrowed outfit). */
  private setHeldPose(a: Actor, air: AirState) {
    if (outfitHasClip(a.pig, a.outfit, 'held')) {
      air.fallback = false;
      air.grabY = GRAB_Y_HELD;
      this.setClip(a, 'held', true, 1, true);
      a.loopFrom = HELD_LOOP_FROM;
      return;
    }
    air.fallback = true;
    air.grabY = GRAB_Y_POSE;
    air.startle = outfitHasClip(a.pig, a.outfit, 'surprised') ? resolveClip(a.pig, a.outfit, 'surprised') : null;
    air.kick = outfitHasClip(a.pig, a.outfit, 'jump') ? resolveClip(a.pig, a.outfit, 'jump') : null;
    if (!air.startle && !air.kick) air.startle = resolveClip(a.pig, a.outfit, 'surprised');
    for (const r of [air.startle, air.kick]) if (r) imageIfReady(r.clip.page);
    a.anim = 'held';
    a.loopFrom = 0;
    this.poseFallback(a, air);
  }

  /** Fallback dangle: a startled frame, then kicking between two jump frames (arms up / legs out). */
  private poseFallback(a: Actor, air: AirState) {
    if (air.startle && (air.heldT < 380 || !air.kick)) {
      a.pose = air.startle;
      a.poseFrame = Math.min(1, air.startle.clip.frames - 1);
    } else if (air.kick) {
      a.pose = air.kick;
      const f = Math.floor(air.kickT / 190) % 2 === 0 ? 2 : 4;
      a.poseFrame = Math.min(f, air.kick.clip.frames - 1);
    }
  }

  /** Body center from the grab point and the swing angle. */
  private placeHeld(a: Actor, air: AirState) {
    const L = BODY_CY - air.grabY;
    air.body.x = air.gx - L * Math.sin(a.angle);
    air.body.y = air.gy + L * Math.cos(a.angle);
    a.x = air.body.x;
  }

  private updateHeld(a: Actor, air: AirState, dt: number) {
    const s = dt / 1000;
    air.heldT += dt;
    air.phase += s;
    // the pick-up offset eases out (~45 ms): he is lifted into the hand rather than teleported
    const k = Math.exp(-dt / 45);
    air.ox *= k;
    air.oy *= k;
    if (Math.abs(air.ox) < 0.05) air.ox = 0;
    if (Math.abs(air.oy) < 0.05) air.oy = 0;
    const gx = air.tx + air.ox;
    const gy = air.ty + air.oy;
    if (s > 0) {
      const f = 1 - Math.exp(-dt / 28);
      const pvx = air.pvx, pvy = air.pvy;
      air.pvx += ((gx - air.gx) / s - air.pvx) * f;
      air.pvy += ((gy - air.gy) / s - air.pvy) * f;
      air.pax += (clamp((air.pvx - pvx) / s, -PIVOT_ACC, PIVOT_ACC) - air.pax) * f;
      air.pay += (clamp((air.pvy - pvy) / s, -PIVOT_ACC, PIVOT_ACC) - air.pay) * f;
    }
    air.gx = gx;
    air.gy = gy;
    if (this.reduceMotion) {
      air.dangle.angle = air.dangle.vel = 0;
      air.tickle = 0;
      a.angle = 0;
      a.squash.value = a.squash.vel = 0;
    } else {
      stepDangle(air.dangle, dt, air.pax, air.pay);
      air.tickle *= Math.exp(-2.2 * s);
      // gentle idle sway + a quick wiggle while tickled, on top of the pendulum
      a.angle = air.dangle.angle + 0.045 * Math.sin(air.phase * 2.3) + air.tickle * 0.1 * Math.sin(air.phase * 24);
      // stretch a little when yanked upward, springy when the hand stops
      stepSpring(a.squash, dt, clamp(air.pvy / 2600, -0.07, 0.015), 700, 18);
    }
    a.squashY = air.grabY;
    this.placeHeld(a, air);
    // wiggle faster when swung around or tickled
    a.rate = 1 + Math.min(0.8, Math.hypot(air.pvx, air.pvy) / 600) + air.tickle * 1.3;
    if (air.fallback) {
      air.kickT += dt * a.rate;
      this.poseFallback(a, air);
    }
  }

  private updateFlight(a: Actor, air: AirState, dt: number) {
    const b = this.bounds;
    b.left = 0;
    b.right = this.lw;
    b.top = 0;
    b.floor = this.floorOf(a);
    const reduce = this.reduceMotion;
    const body = air.body;
    const ev = stepFlight(body, dt, b, reduce ? FLIGHT_REDUCED : FLIGHT);
    a.x = body.x;
    a.angle = reduce ? 0 : body.angle;
    air.heldT += dt;
    air.phase += dt / 1000;
    if (ev & HIT_FLOOR && !reduce) {
      // squash into the floor, around the feet
      a.squashY = FRAME.pivotY;
      a.squash.value = clamp(body.hitSpeed / 1500, 0.06, 0.3);
      a.squash.vel = 0;
    }
    if (reduce) a.squash.value = a.squash.vel = 0;
    else stepSpring(a.squash, dt, air.mode === AIR_FLY ? clamp(-Math.abs(body.vy) / 3000, -0.05, 0) : 0, 700, 16);
    if (ev & (HIT_FLOOR | HIT_WALL | HIT_CEILING)) this.reportImpact(air, ev);
    if (air.mode === AIR_FLY) {
      if (air.fallback) {
        air.kickT += dt * a.rate;
        this.poseFallback(a, air);
      }
      if (ev & LANDED) this.land(a, air);
    } else if (ev & SETTLED) {
      // upright and still: back to a normal grounded actor
      air.mode = AIR_NONE;
      a.x = body.x;
      a.angle = 0;
      a.squashY = FRAME.pivotY;
    }
  }

  private reportImpact(air: AirState, ev: number) {
    const cb = air.onImpact;
    if (!cb) return;
    const hit = this.impact;
    hit.surface = ev & HIT_FLOOR ? 'floor' : ev & HIT_WALL ? 'wall' : 'ceiling';
    hit.speed = Math.round(air.body.hitSpeed);
    hit.first = hit.surface === 'floor' && air.first;
    if (hit.surface === 'floor') air.first = false;
    try {
      cb(hit);
    } catch (e) {
      console.error('[stage] onImpact', e);
    }
  }

  /** Came to rest on the floor: report the landing; righting / sliding finishes in AIR_SETTLE while clips play. */
  private land(a: Actor, air: AirState) {
    const body = air.body;
    const kind = classifyDrop({ vx: air.rvx, vy: air.rvy, impact: body.impact, wallImpact: body.wallImpact, ceiling: body.ceiling });
    air.mode = AIR_SETTLE;
    a.rate = 1;
    this.setClip(a, 'idle', true, 1, true);
    a.idle.running = false;
    a.idle.nextAt = this.time + rand(3000, 6000);
    this.resolveAir(a, air, kind);
  }

  private resolveAir(a: Actor, air: AirState, kind: DropKind | 'caught' | 'gone') {
    const done = air.done;
    air.done = null;
    air.onImpact = null;
    if (!done) return;
    const b = air.body;
    done({
      kind, x: Math.round(a.x), vx: Math.round(air.rvx), vy: Math.round(air.rvy),
      impact: Math.round(b.impact), bounces: b.bounces, walls: b.walls, ceiling: b.ceiling > 0,
    });
  }

  /** Abort a hold / flight right now (removed, re-spawned, nothing left to animate it): feet back on the floor. */
  private endAir(a: Actor, kind: DropKind | 'gone') {
    const air = a.air;
    if (!air || air.mode === AIR_NONE) return;
    if (this.heldId === a.id) this.heldId = null;
    const m = FLIGHT.halfW;
    if (air.mode !== AIR_SETTLE) a.x = clamp(air.body.x, m, Math.max(m, this.lw - m));
    else a.x = air.body.x;
    const wasHeld = air.mode === AIR_HELD;
    air.mode = AIR_NONE;
    a.angle = 0;
    a.squash.value = a.squash.vel = 0;
    a.squashY = FRAME.pivotY;
    a.rate = 1;
    if (a.pose || a.anim === 'held') this.setClip(a, 'idle', true, 1, true);
    this.resolveAir(a, air, wasHeld ? 'gone' : kind);
  }

  // ───────────────────────── bubbles ─────────────────────────

  bubble(id: string, text: string, ms?: number): void {
    const dur = ms ?? clamp(1800 + text.length * 45, 2200, 6500);
    this.removeBubbles(id, false);
    const pig = this.actors.get(id)?.pig ?? (isPig(id) ? id : null);
    const b: BubbleState = { key: ++this.bubbleSeq, target: id, pig, text, until: this.time + dur, x: 0, y: 0 };
    this.positionBubble(b);
    this.bubbles.push(b);
    this.view?.bubblesChanged();
  }

  clearBubbles(): void {
    if (this.bubbles.length === 0) return;
    this.bubbles.length = 0;
    this.view?.bubblesChanged();
  }

  private removeBubbles(target: string, notify = true) {
    let removed = false;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this.bubbles[i].target === target) {
        this.bubbles.splice(i, 1);
        removed = true;
      }
    }
    if (removed && notify) this.view?.bubblesChanged();
  }

  private positionBubble(b: BubbleState) {
    const a = this.actors.get(b.target);
    if (a) {
      const c = this.cam;
      b.x = (a.x - c.fx) * c.z + c.fx;
      b.y = (this.actorY(a) - HEAD_ABOVE_FEET - c.fy) * c.z + c.fy;
      return;
    }
    const p = isPig(b.target) ? this.portraits.get(b.target) : undefined;
    if (p && !p.leaving) {
      b.x = this.lw < NARROW_W ? this.lw / 2 : this.portraitX(p);
      b.y = PORTRAIT_TOP + 12;
      return;
    }
    b.x = this.lw / 2;
    b.y = 56;
  }

  // ───────────────────────── effects ─────────────────────────

  shake(intensity = 0.5, ms?: number): void {
    if (this.reduceMotion) {
      this.border = Math.max(this.border, 300);
      return;
    }
    this.trauma = clamp(this.trauma + intensity, 0, 1);
    this.traumaDecay = ms && ms > 0 ? Math.max(0.2, this.trauma / (ms / 1000)) : 1.6;
  }

  flash(color = '#ffffff', ms = 160): void {
    this.flashColor = color;
    this.flashT = 0;
    this.flashDur = this.reduceMotion ? ms * 1.5 : ms;
    this.flashMax = this.reduceMotion ? 0.35 : 0.8;
  }

  fade(to: 'black' | 'white' | 'clear', ms = 400): Promise<void> {
    this.finishFade();
    this.fadeUnder = null;
    if (to === 'clear') {
      this.fadeTo = 0;
    } else {
      const color = to === 'black' ? '#000000' : '#ffffff';
      if (color !== this.fadeColor && this.fadeA > 0) {
        // black → white (or back): keep the old color underneath while the new one dithers in
        this.fadeUnder = this.fadeColor;
        this.fadeUnderA = this.fadeA;
        this.fadeA = 0;
      }
      this.fadeColor = color;
      this.fadeTo = 1;
    }
    this.fadeFrom = this.fadeA;
    this.fadeT = 0;
    this.fadeDur = ms;
    if (!this.view || ms <= 0 || this.fadeFrom === this.fadeTo) {
      this.fadeA = this.fadeTo;
      return Promise.resolve();
    }
    return new Promise((done) => {
      this.fadeDone = done;
    });
  }

  private finishFade() {
    this.fadeUnder = null;
    if (!this.fadeDone) return;
    this.fadeA = this.fadeTo;
    const d = this.fadeDone;
    this.fadeDone = null;
    d();
  }

  private drawFadeLayer(ctx: CanvasRenderingContext2D, color: string, a: number) {
    if (a <= 0) return;
    if (this.reduceMotion) {
      ctx.globalAlpha = a;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, this.lw, LOGICAL_H);
      ctx.globalAlpha = 1;
    } else {
      ditherFill(ctx, color, ditherStep(a), 0, 0, this.lw, LOGICAL_H);
    }
  }

  async showCG(id: string | null): Promise<void> {
    const token = ++this.cgToken;
    if (id === null) {
      if (!this.cg) return;
      return this.animateCG(0);
    }
    let canvas: HTMLCanvasElement;
    try {
      canvas = await cgCanvas(id);
    } catch {
      return;
    }
    if (token !== this.cgToken) return;
    if (this.cg?.id === id && this.cgTarget === 1) return;
    this.cgPrev = this.cg && this.cgP > 0 ? this.cg : null;
    this.cg = { id, canvas };
    this.cgP = 0;
    return this.animateCG(1);
  }

  private animateCG(target: number): Promise<void> {
    const prev = this.cgDone;
    this.cgDone = null;
    prev?.();
    this.cgTarget = target;
    if (!this.view) {
      this.finishCG();
      return Promise.resolve();
    }
    return new Promise((done) => {
      this.cgDone = done;
    });
  }

  private finishCG() {
    this.cgP = this.cgTarget;
    if (this.cgTarget === 0) this.cg = null;
    this.cgPrev = null;
    const d = this.cgDone;
    this.cgDone = null;
    d?.();
  }

  setPetals(level: PetalLevel): void {
    this.petals.configure({ level });
  }

  setPetalScale(scale: number): void {
    this.petals.configure({ scale: Number.isFinite(scale) ? clamp(scale, 0, 1) : 1 });
  }

  petalPuff(x?: number, y?: number, count = 5): void {
    this.petals.puff(x ?? this.lw / 2, y ?? 140, clamp(Math.round(count), 1, 12));
  }

  setWeather(w: Weather): void {
    if (w === this.rain.weather) return;
    this.rain.set(w, this.lw, LOGICAL_H);
  }

  burst(kind: BurstKind, x?: number, y?: number): void {
    if (x === undefined && y === undefined) {
      const a = this.actorList[0];
      if (a) return this.burstOn(a.id, kind);
      const p = this.talking ? this.portraits.get(this.talking) : this.portraitList[this.portraitList.length - 1];
      if (p) {
        this.bursts.spawn(kind, this.lw < NARROW_W ? this.lw / 2 : this.portraitX(p), PORTRAIT_TOP + 30);
        return;
      }
    }
    const bx = x ?? this.lw / 2;
    const by = y ?? 120;
    this.bursts.spawn(kind, bx, by, by + 24);
  }

  burstOn(id: string, kind: BurstKind): void {
    const a = this.actors.get(id);
    if (!a) return this.burst(kind, this.lw / 2, 120);
    const feet = this.actorY(a);
    const c = this.cam;
    const [ox, oy] = BURST_ANCHOR[kind];
    // bursts draw in screen space: map the actor's world position through the camera
    this.bursts.spawn(kind, (a.x + ox - c.fx) * c.z + c.fx, (feet - oy - c.fy) * c.z + c.fy, (feet - c.fy) * c.z + c.fy);
  }

  spawnGoldenPetal(onCatch: () => void, opts: GoldenPetalOptions = {}): GoldenPetalHandle {
    const x = opts.x ?? rand(this.lw * 0.18, this.lw * 0.82);
    const g = this.golden.spawn(onCatch, opts.onMiss ?? null, x);
    if (!g) return INERT_HANDLE;
    const id = g.id;
    const alive = () => g.on && g.id === id;
    return {
      get active() {
        return alive();
      },
      catch: () => {
        if (!alive()) return false;
        this.catchGolden(g);
        return true;
      },
      cancel: () => {
        if (!alive()) return;
        g.on = false;
        g.onCatch = g.onMiss = null;
      },
    };
  }

  catchAtClient(clientX: number, clientY: number): boolean {
    const p = this.clientToLogical(clientX, clientY);
    if (!p) return false;
    // generous target: at least ~24 CSS px around the petal
    const g = this.golden.hit(p.x - this.shakeX, p.y - this.shakeY, Math.max(10, 24 / this.scaleU));
    if (!g) return false;
    this.catchGolden(g);
    return true;
  }

  private catchGolden(g: Golden) {
    g.on = false;
    this.bursts.goldBurst(this.golden.posX(g), g.y);
    const cb = g.onCatch;
    g.onCatch = g.onMiss = null;
    cb?.();
  }

  setReduceMotion(on: boolean): void {
    if (this.reduceMotion === on) return;
    this.reduceMotion = on;
    this.petals.configure({ reduceMotion: on });
    this.bursts.reduce = on;
    this.rain.reduce = on;
    this.golden.reduce = on;
    if (on) {
      this.trauma = 0;
      this.cam.z = this.cam.z1 = 1;
    }
  }

  // ───────────────────────── accessibility ─────────────────────────

  setDescription(text: string | null): void {
    this.description = text?.trim() ? text : null;
  }

  /** The canvas aria-label: the screen's description, or an automatic scene summary. */
  describe(): string {
    if (this.description) return this.description;
    const parts: string[] = [];
    if (this.cg && this.cgTarget > 0) parts.push(`Illustration: ${describeCG(this.cg.id).title}.`);
    const id = this.bgReq?.id;
    if (id && TIMELESS[id]) parts.push(`${TIMELESS[id]}.`);
    else {
      const home = id ? PIG_IDS.find((p) => HOME_BG[p] === id) : undefined;
      const place = home
        ? `${CHARACTERS[home].name}'s room at Sakura House`
        : id ? (locationForBackground(id)?.name ?? (this.location ? LOCATIONS[this.location].name : prettyId(id))) : '';
      if (place) parts.push(`${place}, ${TOD_WORDS[this.tod]}.`);
    }
    const names: string[] = [];
    for (const p of this.portraitList) if (!p.leaving) names.push(CHARACTERS[p.id].name);
    for (const a of this.actorList) {
      const n = CHARACTERS[a.pig].name;
      if (!names.includes(n)) names.push(n);
    }
    if (names.length === 1) parts.push(`${names[0]} is here.`);
    else if (names.length > 1) parts.push(`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are here.`);
    if (this.rain.weather === 'rain') parts.push('It is raining.');
    if (this.rain.weather === 'storm') parts.push('A thunderstorm rolls over campus.');
    return parts.join(' ') || 'Kempanion Online stage';
  }

  reset(): void {
    this.portraits.clear();
    this.portraitList.length = 0;
    this.talking = this.lastTalking = this.featured = null;
    this.clearActors();
    this.clearBubbles();
    this.finishCamera();
    this.cam.z = this.cam.z1 = 1;
    this.cam.dim = this.cam.d1 = 0;
    this.finishLights();
    this.lights.a = this.lights.to = 0;
    this.finishFade();
    this.fadeA = this.fadeTo = 0;
    this.flashDur = 0;
    this.trauma = 0;
    this.border = 0;
    this.cgToken++;
    if (this.cgDone) {
      this.cgTarget = 0;
      this.finishCG();
    }
    this.cg = this.cgPrev = null;
    this.cgP = this.cgTarget = 0;
    this.rain.set('clear', this.lw, LOGICAL_H);
    this.bursts.clear();
    this.golden.clear();
    this.petals.clearPuffs();
    this.petals.configure({ level: 'normal' });
    this.groundY = DEFAULT_GROUND_Y;
    this.petals.configure({ groundY: this.groundY });
    this.description = null;
    if (this.todMode !== 'auto') this.setTimeOfDay('auto');
  }

  // ───────────────────────── per frame ─────────────────────────

  update(dt: number): void {
    this.time += dt;
    if (this.time >= this.nextTodCheck) this.refreshTod();
    if (this.timers.length) {
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const t = this.timers[i];
        if (t.at <= this.time) {
          this.timers.splice(i, 1);
          t.done();
        }
      }
    }
    const tr = this.trans;
    if (tr) {
      tr.t += dt;
      if (!tr.swapped && tr.t >= tr.swapAt) {
        tr.swapped = true;
        this.bg = tr.to;
      }
      if (tr.t >= tr.dur) this.finishTransition();
    }
    const c = this.cam;
    if (c.done) {
      c.t += dt;
      const p = stepped(Math.min(1, c.t / c.dur), 6);
      c.z = c.z0 + (c.z1 - c.z0) * p;
      c.dim = c.d0 + (c.d1 - c.d0) * p;
      if (c.t >= c.dur) this.finishCamera();
    }
    const l = this.lights;
    if (l.done) {
      l.t += dt;
      const p = stepped(Math.min(1, l.t / l.dur), 4);
      l.a = l.from + (l.to - l.from) * p;
      if (l.t >= l.dur) this.finishLights();
    }
    this.updatePortraits(dt);
    for (const a of this.actorList) this.updateActor(a, dt);
    this.petals.update(dt);
    this.rain.update(dt);
    this.bursts.update(dt);
    // golden petals come to rest on the actors' ground line (above the hub's text box), then twinkle out
    this.golden.update(dt, this.lw, LOGICAL_H, this.missed, this.groundY - 4);
    if (this.missed.length) {
      for (const g of this.missed) {
        const miss = g.onMiss;
        g.onCatch = g.onMiss = null;
        if (miss) queueMicrotask(miss);
      }
      this.missed.length = 0;
    }
    this.updateOverlays(dt);
    let expired = false;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.until <= this.time) {
        this.bubbles.splice(i, 1);
        expired = true;
      } else {
        this.positionBubble(b);
      }
    }
    if (expired) this.view?.bubblesChanged();
  }

  private updatePortraits(dt: number) {
    for (let i = this.portraitList.length - 1; i >= 0; i--) {
      const p = this.portraitList[i];
      p.pop += dt;
      if (p.moveT < 1) p.moveT = Math.min(1, p.moveT + dt / PORTRAIT_FADE);
      if (p.leaving) {
        p.enter -= dt / PORTRAIT_FADE;
        if (p.enter <= 0) this.removePortraitNow(p.id);
      } else if (p.enter < 1 && imageIfReady(p.ref.atlas)) {
        p.enter = Math.min(1, p.enter + dt / PORTRAIT_FADE);
      }
    }
    const f = featuredPortrait(this.portraitList, this.talking, this.lastTalking);
    if (f !== this.featured) {
      this.featured = f;
      const p = f ? this.portraits.get(f) : undefined;
      if (p) p.featuredAt = this.time;
    }
  }

  private updateOverlays(dt: number) {
    if (this.fadeDone) {
      this.fadeT += dt;
      const p = Math.min(1, this.fadeT / this.fadeDur);
      this.fadeA = this.fadeFrom + (this.fadeTo - this.fadeFrom) * p;
      if (p >= 1) this.finishFade();
    }
    if (this.flashT < this.flashDur) this.flashT += dt;
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - (this.traumaDecay * dt) / 1000);
      const amp = 6 * this.trauma * this.trauma;
      this.shakeX = Math.round((Math.random() * 2 - 1) * amp);
      this.shakeY = Math.round((Math.random() * 2 - 1) * amp);
    } else {
      this.shakeX = this.shakeY = 0;
    }
    if (this.border > 0) this.border = Math.max(0, this.border - dt);
    if (this.cgDone) {
      const step = dt / (this.reduceMotion ? 200 : CG_FADE);
      this.cgP = this.cgTarget > this.cgP ? Math.min(this.cgTarget, this.cgP + step) : Math.max(this.cgTarget, this.cgP - step);
      if (this.cgP === this.cgTarget) this.finishCG();
    }
  }

  draw(ctx: CanvasRenderingContext2D, scratch: CanvasRenderingContext2D): void {
    const lw = this.lw, h = LOGICAL_H;
    const sx = this.shakeX, sy = this.shakeY;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    scratch.imageSmoothingEnabled = false;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, lw, h);

    // world layer (camera): background, far rain, back petals, actors
    const c = this.cam;
    const ox = c.fx - c.fx * c.z + sx;
    const oy = c.fy - c.fy * c.z + sy;
    ctx.setTransform(c.z, 0, 0, c.z, ox, oy);
    this.drawBackground(ctx, scratch, c.z, ox, oy);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.rain.drawTint(ctx);
    this.rain.draw(ctx, false, sx, sy);
    this.petals.draw(ctx, false, sx, sy);
    ctx.setTransform(c.z, 0, 0, c.z, ox, oy);
    this.drawActors(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.lights.a > 0) {
      ctx.globalAlpha = this.lights.a;
      ctx.fillStyle = '#0e0a2a';
      ctx.fillRect(0, 0, lw, h);
    }
    if (c.dim > 0) {
      ctx.globalAlpha = c.dim;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, lw, h);
    }
    ctx.globalAlpha = 1;

    // VN layer and front particles
    this.drawPortraits(ctx, sx, sy);
    this.bursts.draw(ctx, sx, sy);
    this.petals.draw(ctx, true, sx, sy);
    this.rain.draw(ctx, true, sx, sy);
    this.golden.draw(ctx, sx, sy, this.large ? 1 : 2);
    this.rain.drawFlash(ctx);

    this.drawCG(ctx, scratch, sx, sy);
    this.drawTransitionOverlay(ctx);
    if (this.fadeUnder) this.drawFadeLayer(ctx, this.fadeUnder, this.fadeUnderA);
    this.drawFadeLayer(ctx, this.fadeColor, this.fadeA);
    if (this.flashT < this.flashDur) {
      ctx.globalAlpha = this.flashMax * stepped(1 - this.flashT / this.flashDur, 4);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, lw, h);
      ctx.globalAlpha = 1;
    }
    if (this.border > 0) {
      ctx.fillStyle = '#f48fb1';
      ctx.fillRect(0, 0, lw, 2);
      ctx.fillRect(0, h - 2, lw, 2);
      ctx.fillRect(0, 0, 2, h);
      ctx.fillRect(lw - 2, 0, 2, h);
    }
  }

  private drawBgLayer(ctx: CanvasRenderingContext2D, b: BgState) {
    ctx.drawImage(b.canvas, bgCropX(this.lw, b.focusX), 0, this.lw, LOGICAL_H, 0, 0, this.lw, LOGICAL_H);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, scratch: CanvasRenderingContext2D, z: number, ox: number, oy: number) {
    const tr = this.trans;
    if (tr && tr.kind === 'fade') {
      if (tr.from) this.drawBgLayer(ctx, tr.from);
      const p = Math.min(1, tr.t / tr.dur);
      if (tr.smooth) {
        ctx.globalAlpha = p;
        this.drawBgLayer(ctx, tr.to);
        ctx.globalAlpha = 1;
      } else {
        scratch.setTransform(1, 0, 0, 1, 0, 0);
        scratch.clearRect(0, 0, this.lw, LOGICAL_H);
        scratch.setTransform(z, 0, 0, z, ox, oy);
        this.drawBgLayer(scratch, tr.to);
        ditherComposite(ctx, scratch, this.lw, LOGICAL_H, ditherStep(p));
      }
      return;
    }
    if (this.bg) this.drawBgLayer(ctx, this.bg);
  }

  /** Grounded actors first, then the ones in the air (held / thrown) on top. */
  private drawActors(ctx: CanvasRenderingContext2D) {
    const list = this.actorList;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const air = a.air !== null && a.air.mode !== AIR_NONE;
        if ((pass === 1) === air) this.drawActor(ctx, a, air);
      }
    }
  }

  private drawActor(ctx: CanvasRenderingContext2D, a: Actor, airborne: boolean) {
    const ref = a.pose ?? a.ref;
    const clip = ref.clip;
    const img = imageIfReady(clip.page);
    if (img) {
      const frame = a.pose
        ? Math.min(a.poseFrame, clip.frames - 1)
        : a.loopFrom > 0 ? frameIndexIntroLoop(clip.durations, a.t, a.loopFrom) : frameIndexAt(clip.durations, a.t, a.loop, a.times);
      a.img = img;
      a.sx = frame * FRAME.w;
      a.sy = clip.y;
      a.flip = ref.flip;
    }
    if (!a.img) return;
    const reduce = this.reduceMotion;
    const q = reduce ? 0 : a.squash.value;
    const ang = reduce ? 0 : Math.round(a.angle / ANGLE_STEP) * ANGLE_STEP;
    const body = airborne && a.air ? a.air.body : null;
    // shadow on the floor, smaller and fainter the higher he is
    const floor = this.floorOf(a);
    const sx = Math.round(body ? body.x : a.x);
    const k = body ? clamp(1 - (floor - (body.y + FRAME.pivotY - BODY_CY)) / 150, 0.35, 1) : 1;
    this.drawShadow(ctx, sx, Math.round(body ? floor : this.actorY(a)), k);
    if (!body && ang === 0 && Math.abs(q) < 0.004) {
      const dx = Math.round(a.x) - FRAME.pivotX;
      const dy = Math.round(this.actorY(a)) - FRAME.pivotY;
      if (a.flip) {
        ctx.save();
        ctx.translate(dx + FRAME.w, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(a.img, a.sx, a.sy, FRAME.w, FRAME.h, 0, 0, FRAME.w, FRAME.h);
        ctx.restore();
      } else {
        ctx.drawImage(a.img, a.sx, a.sy, FRAME.w, FRAME.h, dx, dy, FRAME.w, FRAME.h);
      }
      return;
    }
    // rotate around the body center in the air (around the feet on the ground), squash around squashY
    const ry = body ? BODY_CY : FRAME.pivotY;
    ctx.save();
    ctx.translate(Math.round(body ? body.x : a.x), Math.round(body ? body.y : this.actorY(a)));
    if (ang !== 0) ctx.rotate(ang);
    if (q !== 0) {
      const py = a.squashY - ry;
      ctx.translate(0, py);
      ctx.scale(1 + q * 0.5, 1 - q);
      ctx.translate(0, -py);
    }
    if (a.flip) ctx.scale(-1, 1);
    ctx.drawImage(a.img, a.sx, a.sy, FRAME.w, FRAME.h, -FRAME.w / 2, -ry, FRAME.w, FRAME.h);
    ctx.restore();
  }

  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, k: number) {
    const w1 = Math.max(6, Math.round(18 * k)) & ~1;
    const w2 = Math.max(8, Math.round(26 * k)) & ~1;
    if (k < 1) ctx.globalAlpha = 0.4 + 0.6 * k;
    ctx.fillStyle = SHADOW;
    ctx.fillRect(x - w1 / 2, y - 2, w1, 1);
    ctx.fillRect(x - w2 / 2, y - 1, w2, 2);
    ctx.fillRect(x - w1 / 2, y + 1, w1, 1);
    ctx.globalAlpha = 1;
  }

  private drawPortraits(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
    if (this.portraitList.length === 0) return;
    const talking = this.talking && this.portraits.has(this.talking) ? this.talking : null;
    for (const p of this.portraitList) if (p.id !== talking) this.drawPortrait(ctx, p, talking, sx, sy);
    const tp = talking ? this.portraits.get(talking) : undefined;
    if (tp) this.drawPortrait(ctx, tp, talking, sx, sy);
  }

  private drawPortrait(ctx: CanvasRenderingContext2D, p: PortraitState, talking: PigId | null, sx: number, sy: number) {
    const narrow = this.lw < NARROW_W;
    if (narrow && p.id !== this.featured) return;
    const img = imageIfReady(p.ref.atlas);
    if (!img) return;
    const e = stepped(p.enter, 4);
    if (e <= 0) return;
    const still = this.reduceMotion;
    let cx = narrow ? Math.round(this.lw / 2) : this.portraitX(p);
    let y = PORTRAIT_TOP;
    const dim = talking !== null && p.id !== talking;
    if (dim) y += 2;
    let alpha = e;
    if (!still) {
      const dir = narrow ? 0 : portraitEnterDir(p.pos);
      cx += Math.round(dir * 12 * (1 - e));
      if (dir === 0) y += Math.round(8 * (1 - e));
      if (p.id === talking) {
        if (((this.time / 140) | 0) % 2 === 1) y -= p.id === 'piggy-1' ? 2 : 1;
      } else if (Math.sin((this.time * TAU) / 2400 + p.order) > 0.6) {
        y -= 1;
      }
    }
    if (narrow) alpha = Math.min(alpha, stepped((this.time - p.featuredAt) / 100, 2));
    if (alpha <= 0) return;
    let w = PORTRAIT.w, hh = PORTRAIT.h;
    if (!still && p.pop < 100) {
      const k = p.pop < 33 ? 1.02 : p.pop < 66 ? 1.04 : 1.02;
      w = Math.round(PORTRAIT.w * k);
      hh = Math.round(PORTRAIT.h * k);
    }
    const dx = cx - (w >> 1) + sx;
    const dy = y + PORTRAIT.h - hh + sy;
    ctx.globalAlpha = alpha;
    if (dim) {
      if (p.dimRef !== p.ref || !p.dimCell) {
        p.dimCell = this.dimmed(img, p.ref);
        p.dimRef = p.ref;
      }
      ctx.drawImage(p.dimCell, 0, 0, PORTRAIT.w, PORTRAIT.h, dx, dy, w, hh);
    } else {
      ctx.drawImage(img, p.ref.x, p.ref.y, PORTRAIT.w, PORTRAIT.h, dx, dy, w, hh);
    }
    ctx.globalAlpha = 1;
  }

  /** Cached copy of a portrait cell darkened to ~85% (non-speakers). */
  private dimmed(img: HTMLImageElement, ref: PortraitRef): HTMLCanvasElement {
    const key = `${ref.atlas}:${ref.x}:${ref.y}`;
    const hit = this.dimCache.get(key);
    if (hit) return hit;
    if (this.dimCache.size >= 16) this.dimCache.clear();
    const c = makeCanvas(PORTRAIT.w, PORTRAIT.h);
    const g = context2d(c);
    g.drawImage(img, ref.x, ref.y, PORTRAIT.w, PORTRAIT.h, 0, 0, PORTRAIT.w, PORTRAIT.h);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(27,18,41,0.17)';
    g.fillRect(0, 0, PORTRAIT.w, PORTRAIT.h);
    this.dimCache.set(key, c);
    return c;
  }

  private drawCG(ctx: CanvasRenderingContext2D, scratch: CanvasRenderingContext2D, sx: number, sy: number) {
    if (!this.cg && !this.cgPrev) return;
    const lw = this.lw, h = LOGICAL_H;
    const crop = bgCropX(lw, 240);
    if (this.cgPrev) ctx.drawImage(this.cgPrev.canvas, crop, 0, lw, h, sx, sy, lw, h);
    const cg = this.cg;
    if (!cg || this.cgP <= 0) return;
    if (this.cgP >= 1) {
      ctx.drawImage(cg.canvas, crop, 0, lw, h, sx, sy, lw, h);
    } else if (this.reduceMotion) {
      ctx.globalAlpha = this.cgP;
      ctx.drawImage(cg.canvas, crop, 0, lw, h, sx, sy, lw, h);
      ctx.globalAlpha = 1;
    } else {
      scratch.setTransform(1, 0, 0, 1, 0, 0);
      scratch.clearRect(0, 0, lw, h);
      scratch.drawImage(cg.canvas, crop, 0, lw, h, sx, sy, lw, h);
      ditherComposite(ctx, scratch, lw, h, ditherStep(this.cgP));
    }
  }

  private drawTransitionOverlay(ctx: CanvasRenderingContext2D) {
    const tr = this.trans;
    if (!tr || tr.kind === 'fade') return;
    const p = Math.min(1, tr.t / tr.dur);
    if (tr.kind === 'wipe') {
      drawSakuraWipe(ctx, this.lw, LOGICAL_H, p, tr.seed);
    } else {
      const q = p < 0.5 ? 1 - p / 0.5 : (p - 0.5) / 0.5;
      const r = irisMaxRadius(this.lw, LOGICAL_H, tr.cx, tr.cy) * stepped(q, 12);
      drawIris(ctx, this.lw, LOGICAL_H, tr.cx, tr.cy, r, '#000');
    }
  }
}

function prettyId(id: string): string {
  return id.replace(/_night$/, '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export const world = new StageWorld();
