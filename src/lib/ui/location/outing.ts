// Bringing your Kempanion along (pet/outing.ts): the map's Bring and a place's "Bring him here" both end on the
// KempaPager at that place. Arriving from the map also counts as visiting the place (wants, tasks, Bat Signal…),
// and a scene waiting there plays first, then hands over to the KempaPager.
import { PIG_IDS, type LocationId } from '../../types';
import { game } from '../../state/game.svelte';
import { now } from '../../state/clock';
import { CHARACTERS } from '../../content/characters';
import { LOCATIONS } from '../../content/locations';
import { findTriggeredScene } from '../../vn';
import { outingOf, recordSignal, spotOf, startOuting } from '../../pet';
import { timeOfDay, weekday } from '../../time';
import { toast } from '../toasts.svelte';

/** `arriving`: the player comes from the map (a place's own screen has already counted the visit). */
export function bringCompanion(loc: LocationId, { arriving }: { arriving: boolean }): void {
  const pig = game.save.companion;
  if (!pig) return;
  const t = now();
  const before = outingOf(game.save, t);
  const { block, outing } = startOuting(game.save, loc, t);
  if (block) return;
  game.persist();
  if (outing && outing.location !== before?.location) {
    const name = CHARACTERS[pig].name;
    toast(loc === 'dorm'
      ? `${name} comes home with you! He’ll stay in his room for a while.`
      : `${name} tags along! He’ll hang out at ${LOCATIONS[loc].name} with you for a while.`, { icon: 'pin' });
  }
  if (arriving) {
    game.setLocation(loc);
    const d = new Date(t);
    const money = game.save.money;
    try {
      const present = loc === 'dorm' ? [] : PIG_IDS.filter((p) => spotOf(game.save, p, d) === loc);
      const sig = recordSignal(game.save, { kind: 'visit', location: loc, present }, t);
      game.report({ moneyBefore: money, tasks: sig.tasks, achievements: sig.achievements });
      if (sig.want) toast('That’s just where he wanted to go!', { icon: 'heart', kind: 'bond' });
    } catch (e) { console.error('[visit]', e); }
    game.persist();
    const sc = findTriggeredScene({ location: loc, time: timeOfDay(d), weekday: weekday(d), save: game.save, date: d });
    if (sc && !game.session.autoScenes.includes(sc.id)) {
      game.session.autoScenes.push(sc.id);
      game.go('scene', { id: sc.id, back: 'hub' });
      return;
    }
  }
  game.go('hub');
}
