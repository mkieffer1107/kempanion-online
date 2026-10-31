// For You Pig — units → pixels for the feed (pure; the component passes measured card heights).
// The engine works in "units" so every screen plays the same game. The component measures each card's natural
// height (it wraps differently on every width) and asks this module where things go.
import { clamp } from '../common/pixel';
import { REVEAL } from './engine';

/** The read line sits between 12% and 45% of the feed's height… */
export const LINE_MIN = 0.12;
export const LINE_MAX = 0.45;
/** …so that exactly REVEAL (+ this much) units of posts fit under it: no skeleton rows on a tall screen. */
export const LINE_PAD = 0.25;

export interface CardBox {
  /** Feed position of the card's top (units) and its length (units). */
  start: number;
  w: number;
  /** Measured (eased) pixel height. */
  h: number;
}

/** Median pixels per unit over the cards on screen (stable while a single tall card scrolls by). */
export function pxPerUnit(cards: readonly CardBox[], fallback = 96): number {
  const r = cards.filter((c) => c.w > 0.5 && c.h > 0).map((c) => c.h / c.w).sort((a, b) => a - b);
  return r.length ? r[Math.floor(r.length / 2)] : fallback;
}

/** Read line y in px from the feed's top. */
export function readLineY(feedH: number, ppu: number): number {
  return Math.round(clamp(feedH - (REVEAL + LINE_PAD) * ppu, feedH * LINE_MIN, feedH * LINE_MAX));
}

/**
 * Card tops in px for feed position `s`: the card containing `s` is pinned so that `s` sits on the read line
 * (proportionally inside the card), the cards after it stack downward and the ones before it upward.
 * Cards must be in feed order and contiguous.
 */
export function cardTops(cards: readonly CardBox[], s: number, lineY: number): number[] {
  if (!cards.length) return [];
  let k = cards.findIndex((c) => c.start <= s && s < c.start + c.w);
  if (k < 0) k = s < cards[0].start ? 0 : cards.length - 1;
  const pk = cards[k];
  const yk = lineY - ((s - pk.start) / pk.w) * pk.h;
  const out = new Array<number>(cards.length);
  let y = yk;
  for (let i = k; i < cards.length; i++) {
    out[i] = Math.round(y);
    y += cards[i].h;
  }
  y = yk;
  for (let i = k - 1; i >= 0; i--) {
    y -= cards[i].h;
    out[i] = Math.round(y);
  }
  return out;
}

/** Feed-height cap: never more than this many px per unit of reading room (desktop gets a phone, not a wall). */
export function maxFeedH(ppu: number): number {
  return Math.round(((REVEAL + LINE_PAD) / (1 - LINE_MAX)) * ppu);
}
