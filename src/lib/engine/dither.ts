// 4x4 ordered (Bayer) dithering shared by transitions, fades and procedural art (pure).

export const BAYER4: readonly number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Threshold 0..15 for pixel (x, y). */
export function bayer(x: number, y: number): number {
  return BAYER4[((y & 3) << 2) | (x & 3)];
}

/** Dither step 0..16 for progress p; pixel (x, y) is "on" when bayer(x, y) < step. */
export function ditherStep(p: number): number {
  if (!(p > 0)) return 0;
  if (p >= 1) return 16;
  return Math.round(p * 16);
}
