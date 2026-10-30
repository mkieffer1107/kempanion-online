// All handwritten line banks, by pig.
import type { PigId } from '../../../types';
import { P1 } from './piggy1';
import { P2 } from './piggy2';
import { P3 } from './piggy3';
import type { PigLines } from './types';

export type { Bank, IdleBank, IdleKind, LineOpts, PigLines, RawLine, Tier, TierTag } from './types';

export const LINES: Readonly<Record<PigId, PigLines>> = { 'piggy-1': P1, 'piggy-2': P2, 'piggy-3': P3 };
