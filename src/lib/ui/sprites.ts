// Read-only helpers over src/generated/sprites.json for DOM-side art (face tokens, the travel strip,
// clip availability per outfit). The canvas renderer has its own loader.
import sprites from '../../generated/sprites.json';
import type { AnimId, OutfitId, PigId } from '../types';
import backgrounds from '../../generated/backgrounds.json';

export interface ClipInfo { page: string; y: number; frames: number; durations: number[]; loop: boolean }
interface SetInfo {
  portraitAtlas: string;
  portraits: Record<string, [number, number]>;
  face: string;
  anims: Record<string, ClipInfo>;
}

const SETS = (sprites as unknown as { sets: Record<string, SetInfo> }).sets;
export const FRAME = (sprites as unknown as { frame: { w: number; h: number; pivotX: number; pivotY: number } }).frame;

export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}

function set(pig: PigId, outfit: OutfitId = 'everyday'): SetInfo | undefined {
  return SETS[`${pig}/${outfit}`] ?? SETS[`${pig}/everyday`];
}

/** 48x48 face token. */
export function faceUrl(pig: PigId, outfit: OutfitId = 'everyday'): string {
  const s = set(pig, outfit);
  return s ? asset(s.face) : '';
}

export function hasClip(pig: PigId, outfit: OutfitId, anim: AnimId): boolean {
  return Boolean(SETS[`${pig}/${outfit}`]?.anims[anim]);
}

export function clipInfo(pig: PigId, outfit: OutfitId, anim: AnimId): ClipInfo | null {
  return SETS[`${pig}/${outfit}`]?.anims[anim] ?? set(pig)?.anims[anim] ?? null;
}

const BG = new Set((backgrounds as unknown as { bg: string[] }).bg);

export function hasBackground(id: string): boolean {
  return BG.has(id);
}
