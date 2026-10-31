// "Nobody's here" lines for each place, by time of day (narrator voice, PG, UF-flavored without marks), plus when
// the Swamp is full on game days (gameOn, which "Cheer in the stands" uses too).
import type { LocationId, TimeOfDay } from '../../types';
import { isGameDay } from '../../pet';

/** `game` = during game hours (see gameOn); it wins over the time of day. */
type Bank = Partial<Record<TimeOfDay | 'any' | 'game', string[]>>;

const VIBES: Record<LocationId, Bank> = {
  dorm: {
    any: ['Sakura House creaks politely. The yard sakura drops a petal on the welcome mat, as usual.'],
    night: ['Porch light on, crickets loud. Somebody upstairs is definitely still awake.'],
  },
  century_tower: {
    any: ['The carillon hums under its breath. Petals spin down around the old brick tower.'],
    evening: ['Golden hour paints the tower orange. The big sakura out front glows like it knows a secret.'],
    night: ['The tower is lit from below. A slip of paper flutters on the sakura’s lowest branch.'],
  },
  plaza: {
    any: ['Students sprawl on the Plaza lawn. A squirrel eyes your snacks with total confidence.'],
    night: ['The Plaza is quiet. Even the squirrels clocked out.'],
  },
  marston: {
    any: ['Whiteboards, coffee, and the soft tapping of a hundred laptops. Marston never really sleeps.'],
    night: ['Third floor, 1 a.m. energy. Someone has built a fort out of textbooks.'],
  },
  malachowsky: {
    any: ['Glass, light, and a whiteboard covered in someone’s rotation diagram. It might be volleyball. It might be a queue.'],
    night: ['The atrium hums with servers and late-night study groups.'],
  },
  physics: {
    any: ['Down the hall, a monitor shows a job queue: PENDING, PENDING, RUNNING. A sign taped under it says “DO NOT UNPLUG. PLEASE.”'],
    night: ['One lab window is still lit. Of course it is.'],
  },
  communicore: {
    any: ['White coats, quiet hallways, and the faint smell of coffee. A flyer advertises a perfusion journal club.'],
    night: ['The Communicore is hushed. The vending machine glows like a lighthouse.'],
  },
  anatomy_lab: {
    any: ['Steel tables, blue drapes, and a quiet kind of respect. A note by the door reads: “Our first teachers.”'],
  },
  shands: {
    any: ['Automatic doors whoosh. The pharmacy counter downstairs is open, as always.'],
    night: ['Shands never closes. Neither does the pharmacy.'],
  },
  stadium: {
    any: ['The Swamp sits empty and enormous. You can almost hear eighty-eight thousand people chomping.'],
    night: ['Stadium lights off, stars on. The quietest the Swamp ever gets.'],
    game: ['Game day. The roar from inside the Swamp rolls out over the concourse: eighty-eight thousand people chomping at once.'],
  },
  lake_alice: {
    any: ['Cypress knees, lily pads, and a very relaxed alligator who wants nothing to do with you.'],
    evening: ['The bat houses rustle. Any minute now…'],
    night: ['Frogs, fireflies, and the occasional splash you choose not to think about.'],
  },
  reitz: {
    any: ['The Reitz Union buzzes: the campus store, the food court, a game-room cheer from downstairs.'],
    night: ['Late-night Reitz: half-price fries energy and a sleepy cashier.'],
  },
  volleyball_courts: {
    any: ['Sand courts, a sagging net, and footprints from this morning’s drills.'],
    morning: ['Sunrise on the sand. A volleyball sits by the net like it’s waiting for someone.'],
  },
  midtown: {
    any: ['University Ave after dark: neon, pizza, boba, and a crosswalk that chirps.'],
    day: ['Midtown is sleepy in daylight. The neon signs are just signs right now.'],
  },
};

/** Game hours on a game day (tailgates to the final whistle, about 11:00–20:00): the only time the Swamp is full. */
export function gameOn(d: Date): boolean {
  const h = d.getHours();
  return h >= 11 && h < 20 && isGameDay(d.getTime());
}

export function vibeLine(loc: LocationId, tod: TimeOfDay, seed: number, game = false): string {
  const bank = VIBES[loc];
  const list = (game ? bank.game : undefined) ?? bank[tod] ?? bank.any ?? ['A quiet spot on campus.'];
  return list[Math.abs(seed) % list.length];
}
