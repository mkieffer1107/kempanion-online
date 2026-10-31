// Shared map/action labels. Shops and minigames get priority in the compact map summary.
import type { LocationAction, LocationDef } from '../../content/locations';

export const ACTIVITY_KINDS = {
  minigame: { label: 'MINIGAME', icon: 'play' },
  shop: { label: 'SHOP', icon: 'bag' },
  home: { label: 'HOME', icon: 'home' },
  study: { label: 'STUDY', icon: 'book' },
  care: { label: 'CARE', icon: 'care' },
  activity: { label: 'ACTIVITY', icon: 'star' },
} as const;
export type ActivityKind = keyof typeof ACTIVITY_KINDS;

export function actionKind(action: LocationAction): ActivityKind {
  if (action.startsWith('minigame:')) return 'minigame';
  if (action === 'shop') return 'shop';
  if (action === 'rest') return 'home';
  if (action === 'study') return 'study';
  if (action === 'pharmacy') return 'care';
  return 'activity';
}

export function locationKinds(location: LocationDef): ActivityKind[] {
  const kinds = new Set(location.actions.map(actionKind));
  // Shands also has the Buy medicine command, separate from its free check-up.
  if (location.id === 'shands') kinds.add('shop');
  const featured = (['minigame', 'shop'] as const).filter((kind) => kinds.has(kind));
  return featured.length ? featured : [...kinds];
}
