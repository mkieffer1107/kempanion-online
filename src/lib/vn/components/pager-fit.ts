// Pure helpers for PagerInset.svelte (bun-testable): how the phone-portrait panel fits the band above the picture.

/** Room the panel keeps above the picture: its drop shadow (box-shadow 0 6px). */
export const PAGER_CLEAR = 6;

/** Compact panel: key height when the band has room for it, and the least the keys shrink to (16 px glyphs, 1:1). */
export const PAGER_KEY = 40;
export const PAGER_KEY_MIN = 26;

/**
 * place="top" floats the panel in the band above the picture. `need` is the two-row panel's bottom edge and
 * `pictureTop` the picture's top edge, both in px from the top of the panel's containing block. Compact (one row of
 * glyph-only keys) when the two-row panel and its shadow would reach into the picture. `need` 0 = not measured yet.
 */
export function pagerCompact(need: number, pictureTop: number, clear = PAGER_CLEAR): boolean {
  return need > 0 && need + clear > pictureTop;
}

/**
 * The compact panel's key height: as tall as the band above the picture allows (`top` = the panel's top edge, `chrome`
 * = its padding and border, same origin as `pictureTop`), from PAGER_KEY_MIN up to PAGER_KEY. Where the band is
 * shorter than the smallest panel (320x460, or Text Size XL on 375x553) the keys stay at the minimum and the panel
 * reaches the picture's top rows, which are scenery above the speaker's head.
 */
export function pagerKey(pictureTop: number, top: number, chrome: number, clear = PAGER_CLEAR): number {
  const room = Math.floor(pictureTop - clear - top - chrome);
  return Math.min(PAGER_KEY, Math.max(PAGER_KEY_MIN, Number.isFinite(room) ? room : PAGER_KEY));
}
