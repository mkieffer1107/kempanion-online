// Layout mode from the viewport size (GAME_DESIGN §14, design-ux §2). Pure, so it can be unit-tested.
//   W  aspect ≥ 1.25 and height ≥ 500 → letterboxed 16:9 stage with overlays
//   T  aspect < 1.25 (phone portrait)  → KempaPager device shell
//   S  aspect ≥ 1.25 and height < 500 (phone landscape) → stage + side rails
export type LayoutMode = 'w' | 't' | 's';

export function layoutMode(w: number, h: number): LayoutMode {
  const aspect = w / Math.max(1, h);
  if (aspect < 1.25) return 't';
  return h >= 500 ? 'w' : 's';
}
