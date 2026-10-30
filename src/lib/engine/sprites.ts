// Sprite atlases from src/generated/sprites.json: portrait cells and animation clips with outfit fallbacks.
// Resolution is pure data; loading goes through assets.ts.
import raw from '../../generated/sprites.json';
import { ALT_EXPRESSION_FALLBACK, type AnimId, type Expression, type OutfitId, type PigId } from '../types';
import { loadImage } from './assets';

export interface ClipDef {
  /** Atlas page, relative to assets/. */
  page: string;
  y: number;
  frames: number;
  durations: number[];
  loop: boolean;
}

export interface SpriteSet {
  portraitAtlas: string;
  portraits: Record<string, [number, number]>;
  face: string;
  anims: Record<string, ClipDef>;
}

interface SpriteData {
  version: number;
  scale: number;
  frame: { w: number; h: number; pivotX: number; pivotY: number };
  portrait: { w: number; h: number };
  sets: Record<string, SpriteSet>;
}

const DATA = raw as unknown as SpriteData;

export const FRAME = DATA.frame;
export const PORTRAIT = DATA.portrait;

const key = (pig: PigId, outfit: OutfitId) => `${pig}/${outfit}`;

export function hasSpriteSet(pig: PigId, outfit: OutfitId): boolean {
  return key(pig, outfit) in DATA.sets;
}

/** The sprite set for an outfit, or the everyday set when that outfit has no sprites. */
export function spriteSet(pig: PigId, outfit: OutfitId): { set: SpriteSet; outfit: OutfitId } {
  const s = DATA.sets[key(pig, outfit)];
  if (s) return { set: s, outfit };
  return { set: DATA.sets[key(pig, 'everyday')], outfit: 'everyday' };
}

export interface PortraitRef {
  atlas: string;
  x: number;
  y: number;
  expression: Expression;
  outfit: OutfitId;
}

/** Portrait cell; alternate outfits map their missing expressions through ALT_EXPRESSION_FALLBACK. */
export function resolvePortrait(pig: PigId, outfit: OutfitId, expression: Expression): PortraitRef {
  const { set, outfit: o } = spriteSet(pig, outfit);
  let e: Expression = expression;
  if (!set.portraits[e]) e = ALT_EXPRESSION_FALLBACK[expression] ?? 'neutral';
  if (!set.portraits[e]) e = 'neutral';
  const cell = set.portraits[e];
  if (cell) return { atlas: set.portraitAtlas, x: cell[0], y: cell[1], expression: e, outfit: o };
  // A malformed set: fall back to the everyday atlas.
  const every = DATA.sets[key(pig, 'everyday')];
  const c = every.portraits[expression] ?? every.portraits.neutral;
  return { atlas: every.portraitAtlas, x: c[0], y: c[1], expression: every.portraits[expression] ? expression : 'neutral', outfit: 'everyday' };
}

export interface ClipRef {
  clip: ClipDef;
  /** The clip actually played (may differ from the request after fallbacks). */
  anim: AnimId;
  /** Outfit whose atlas the clip comes from. */
  outfit: OutfitId;
  /** Draw mirrored (a left/right clip borrowed from the other direction). */
  flip: boolean;
}

const MIRROR: Partial<Record<AnimId, AnimId>> = {
  walk_left: 'walk_right',
  walk_right: 'walk_left',
  run_left: 'run_right',
  run_right: 'run_left',
};

/**
 * Clip lookup: the outfit's own clip, else the everyday clip, else the mirrored direction, else idle.
 */
export function resolveClip(pig: PigId, outfit: OutfitId, anim: AnimId): ClipRef {
  const { set, outfit: o } = spriteSet(pig, outfit);
  const every = DATA.sets[key(pig, 'everyday')];
  if (set.anims[anim]) return { clip: set.anims[anim], anim, outfit: o, flip: false };
  if (every.anims[anim]) return { clip: every.anims[anim], anim, outfit: 'everyday', flip: false };
  const m = MIRROR[anim];
  if (m) {
    if (set.anims[m]) return { clip: set.anims[m], anim: m, outfit: o, flip: true };
    if (every.anims[m]) return { clip: every.anims[m], anim: m, outfit: 'everyday', flip: true };
  }
  if (set.anims.idle) return { clip: set.anims.idle, anim: 'idle', outfit: o, flip: false };
  return { clip: every.anims.idle, anim: 'idle', outfit: 'everyday', flip: false };
}

/** True when the outfit (or its everyday fallback) has this exact clip. */
export function hasClip(pig: PigId, outfit: OutfitId, anim: AnimId): boolean {
  const { set } = spriteSet(pig, outfit);
  return !!set.anims[anim] || !!DATA.sets[key(pig, 'everyday')].anims[anim];
}

/** True when the outfit's own atlas has the clip (no everyday fallback). */
export function outfitHasClip(pig: PigId, outfit: OutfitId, anim: AnimId): boolean {
  return !!DATA.sets[key(pig, outfit)]?.anims[anim];
}

/** 48x48 face icon path (relative to assets/). */
export function facePath(pig: PigId, outfit: OutfitId = 'everyday'): string {
  return spriteSet(pig, outfit).set.face;
}

/** Portrait atlas + idle/walk pages for a pig, so the first draw does not pop in. */
export function preloadPig(pig: PigId, outfit: OutfitId = 'everyday', parts: { portraits?: boolean; actor?: boolean } = {}): Promise<void> {
  const { set } = spriteSet(pig, outfit);
  const pages = new Set<string>();
  if (parts.portraits !== false) pages.add(set.portraitAtlas);
  if (parts.actor !== false) {
    for (const a of ['idle', 'walk_left', 'walk_right'] as const) pages.add(resolveClip(pig, outfit, a).clip.page);
  }
  return Promise.all([...pages].map((p) => loadImage(p))).then(() => undefined);
}
