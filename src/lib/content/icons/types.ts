/**
 * A tiny pixel-art icon: `rows` are equal-length strings, one char per pixel.
 * '.' or ' ' is transparent; every other char is looked up in `palette` (CSS color).
 * Icons are normally 16x16 (UI/items); larger sizes are allowed.
 */
export interface PixelIcon {
  palette: Record<string, string>;
  rows: string[];
}
