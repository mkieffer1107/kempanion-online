// [pager …] (KScript): the KempaPager care keys a scene shows over the stage, e.g. the hub tutorial lighting up FEED
// and DRINK while the companion explains them. keys = null: hidden; []: shown with nothing lit.
import type { PagerKey } from './kscript';

export const pagerInset = $state<{ keys: PagerKey[] | null }>({ keys: null });
