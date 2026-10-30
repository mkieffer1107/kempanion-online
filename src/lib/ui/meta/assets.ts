// Asset lookups for the meta screens: URLs, portrait/animation cells from the generated sprite atlas,
// and which baked backgrounds actually exist (others are still being painted).
import spritesJson from '../../../generated/sprites.json';
import backgroundsJson from '../../../generated/backgrounds.json';
import {
  ALT_EXPRESSION_FALLBACK, EXPRESSIONS,
  type AnimId, type Expression, type OutfitId, type PigId,
} from '../../types';

export interface AnimDef { page: string; y: number; frames: number; durations: number[]; loop: boolean }
interface SpriteSet {
  portraitAtlas: string;
  portraits: Partial<Record<Expression, [number, number]>>;
  face: string;
  anims: Partial<Record<AnimId, AnimDef>>;
}
interface SpritesJson {
  frame: { w: number; h: number; pivotX: number; pivotY: number };
  portrait: { w: number; h: number };
  sets: Record<string, SpriteSet>;
}

const SPRITES = spritesJson as unknown as SpritesJson;
const BGS = backgroundsJson as { bg: string[]; cg: string[] };

export const PORTRAIT_W = SPRITES.portrait.w;
export const PORTRAIT_H = SPRITES.portrait.h;
export const FRAME = SPRITES.frame;

const BASE: string = import.meta.env?.BASE_URL ?? './';

export function assetUrl(path: string): string {
  return `${BASE}assets/${path}`;
}
export const bgUrl = (id: string) => assetUrl(`bg/${id}.png`);
export const cgUrl = (id: string) => assetUrl(`cg/${id}.png`);

const BG_SET = new Set(BGS.bg);
export const CG_IDS: readonly string[] = BGS.cg;

export function hasBackground(id: string): boolean {
  return BG_SET.has(id);
}

/** First id in the list that has a baked background, or null. */
export function firstBackground(ids: readonly string[]): string | null {
  return ids.find((id) => BG_SET.has(id)) ?? null;
}

function spriteSet(pig: PigId, outfit: OutfitId): SpriteSet | undefined {
  return SPRITES.sets[`${pig}/${outfit}`];
}

export function hasOutfit(pig: PigId, outfit: OutfitId): boolean {
  return !!spriteSet(pig, outfit);
}

export interface PortraitCell {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The expression actually drawn after fallbacks. */
  expression: Expression;
}

/** Atlas cell for a portrait, following the alt-outfit fallback table, then `neutral`, then everyday. */
export function portraitCell(pig: PigId, outfit: OutfitId, expression: Expression): PortraitCell | null {
  const set = spriteSet(pig, outfit) ?? spriteSet(pig, 'everyday');
  if (!set) return null;
  const chain: Expression[] = [expression];
  const alt = ALT_EXPRESSION_FALLBACK[expression];
  if (alt) chain.push(alt);
  chain.push('neutral');
  for (const e of chain) {
    const xy = set.portraits[e];
    if (xy) return { url: assetUrl(set.portraitAtlas), x: xy[0], y: xy[1], w: PORTRAIT_W, h: PORTRAIT_H, expression: e };
  }
  return null;
}

/** Expressions that really exist in a set (in canonical order). */
export function expressionsFor(pig: PigId, outfit: OutfitId): Expression[] {
  const set = spriteSet(pig, outfit);
  if (!set) return [];
  return EXPRESSIONS.filter((e) => !!set.portraits[e]);
}

export function faceUrl(pig: PigId, outfit: OutfitId = 'everyday'): string {
  const set = spriteSet(pig, outfit) ?? spriteSet(pig, 'everyday');
  return set ? assetUrl(set.face) : '';
}

/** A full-body clip; falls back to the everyday set, then to `idle`. */
export function animDef(pig: PigId, outfit: OutfitId, anim: AnimId): { url: string; def: AnimDef; anim: AnimId } | null {
  for (const o of [outfit, 'everyday'] as OutfitId[]) {
    const set = spriteSet(pig, o);
    if (!set) continue;
    const def = set.anims[anim];
    if (def) return { url: assetUrl(def.page), def, anim };
  }
  if (anim !== 'idle') return animDef(pig, outfit, 'idle');
  return null;
}
