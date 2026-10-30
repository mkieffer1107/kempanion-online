// Types local to the pet module (shared contracts stay in src/lib/types.ts).
import type { ActionResult, CareAction, LocationId, PigId } from '../types';
import type { Medal, MinigameId } from '../minigames/types';
import type { Taste } from './balance';

/**
 * Things that happened in the game that dailies, wants and achievements care about.
 * The UI/VN/chat layers report 'chat' and 'visit' through recordSignal(); the pet module emits the rest itself.
 */
export type GameSignal =
  | { kind: 'feed'; pig: PigId; item: string; taste: Taste }
  | { kind: 'care'; pig: PigId; action: CareAction | 'brush' | 'nap' | 'tuck' }
  | { kind: 'gift'; pig: PigId; item: string; taste: Taste }
  /** The player sent a free-chat message to a pig (after the reply). topicMatch = it was about his thing. */
  | { kind: 'chat'; pig: PigId; text: string; topicMatch?: boolean }
  /** The player arrived at a location; `present` = pigs there now (pigsAt()). */
  | { kind: 'visit'; location: LocationId; present?: PigId[] }
  | { kind: 'minigame'; id: MinigameId; pig: PigId; medal: Medal; score: number; stats: Record<string, number> }
  | { kind: 'petal' }
  | { kind: 'omikuji' }
  | { kind: 'buy'; item: string; qty: number };

export interface DailyTask {
  id: string;
  text: string;
  /** Who gets the +10 bond (null until known, e.g. "give anyone a gift"). */
  pig: PigId | null;
  done: boolean;
  money: number;
  bond: number;
}

export interface Achievement { id: string; title: string; desc: string; icon: string }

/** Extra fields the pet module adds to ActionResult (all optional, so it stays an ActionResult). */
export interface CareResult extends ActionResult {
  taste?: Taste;
  /** First time the player saw this pig's taste for the item (reveal "Loved by"). */
  discovered?: boolean;
  /** Secret favorite found for the first time (+50 bond, reveal line). */
  secretRevealed?: boolean;
  /** New heart level reached by this action. */
  levelUp?: number;
  /** Follow-up clip after `anim` (taste/gift reaction). */
  reactAnim?: ActionResult['anim'];
  wantFulfilled?: boolean;
  tasks?: DailyTask[];
  achievements?: Achievement[];
  /** Item id used up by the action. */
  consumed?: string;
  /** The illness ended. */
  cured?: boolean;
}
