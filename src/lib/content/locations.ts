// Campus locations, backgrounds, music, and where each pig hangs out by time of day.
import type { BackgroundId, LocationId, PigId, SongId } from '../types';
import { weekday, type Weekday } from '../time';

export type LocationAction = 'shop' | 'minigame:volley' | 'minigame:perfusion' | 'minigame:debug' | 'minigame:petals' | 'minigame:surgery' | 'minigame:xfeed' | 'omikuji' | 'study' | 'pharmacy' | 'bats' | 'cheer' | 'rest';

export interface LocationDef {
  id: LocationId;
  name: string;
  jp: string;
  /** One line shown on the map card. */
  blurb: string;
  /** Background id for daytime; `<bg>_night` is used at night when it exists. */
  bg: BackgroundId;
  /** Interior background used by some scenes (optional). */
  interior?: BackgroundId;
  song: SongId;
  outdoor: boolean;
  /** Horizontal focus (0..480) to keep visible on narrow screens. */
  focusX: number;
  /** Pin position on the campus map image (public/assets/bg/map.png, 480x320), normalized 0..1. */
  map: { x: number; y: number };
  actions: LocationAction[];
}

export const LOCATIONS: Record<LocationId, LocationDef> = {
  dorm: {
    id: 'dorm', name: 'Sakura House', jp: 'さくら荘', blurb: 'The co-op off University Ave. The yard sakura blooms all year.',
    bg: 'sakura_house', interior: 'dorm', song: 'dorm', outdoor: true, focusX: 240, map: { x: 0.06, y: 0.33 }, actions: ['rest'],
  },
  century_tower: {
    id: 'century_tower', name: 'Century Tower', jp: 'センチュリー・タワー', blurb: 'The carillon tower at the heart of campus. Bells on the hour.',
    bg: 'century_tower', song: 'campus_day', outdoor: true, focusX: 330, map: { x: 0.5, y: 0.38 }, actions: ['omikuji'],
  },
  plaza: {
    id: 'plaza', name: 'Plaza of the Americas', jp: 'プラザ', blurb: 'Lawn, live oaks, very bold squirrels. Pig Pen Friday lunch spot.',
    bg: 'plaza', song: 'plaza', outdoor: true, focusX: 240, map: { x: 0.5, y: 0.2 }, actions: ['minigame:petals'],
  },
  marston: {
    id: 'marston', name: 'Marston Science Library', jp: 'マーストン図書館', blurb: 'Open late. Coffee, whiteboards, quiet floors.',
    bg: 'marston', song: 'library', outdoor: true, focusX: 240, map: { x: 0.77, y: 0.19 }, actions: ['study', 'minigame:xfeed'],
  },
  malachowsky: {
    id: 'malachowsky', name: 'Malachowsky Hall', jp: 'マラコウスキー・ホール', blurb: 'Data science & IT. Piggy 1 has a favorite study nook here.',
    bg: 'malachowsky', song: 'malachowsky', outdoor: true, focusX: 240, map: { x: 0.76, y: 0.58 }, actions: ['study'],
  },
  physics: {
    id: 'physics', name: 'Physics Building', jp: '物理学棟', blurb: 'Labs, simulations, and Piggy 3 running jobs on HiPerGator.',
    bg: 'physics', interior: 'physics_lab', song: 'physics', outdoor: true, focusX: 240, map: { x: 0.7, y: 0.4 }, actions: ['minigame:debug'],
  },
  communicore: {
    id: 'communicore', name: 'Communicore (College of Medicine)', jp: '医学部', blurb: 'Lecture halls, sim lab, and the anatomy lab upstairs.',
    bg: 'communicore', interior: 'anatomy_lab', song: 'lab', outdoor: true, focusX: 240, map: { x: 0.77, y: 0.81 }, actions: ['minigame:perfusion'],
  },
  anatomy_lab: {
    id: 'anatomy_lab', name: 'Anatomy Lab', jp: '解剖学実習室', blurb: 'Steel tables, blue drapes, deep respect. Piggy 2 teaches here Tue & Thu.',
    bg: 'anatomy_lab', song: 'lab', outdoor: false, focusX: 240, map: { x: 0.84, y: 0.74 }, actions: ['study'],
  },
  shands: {
    id: 'shands', name: 'UF Health Shands', jp: 'シャンズ病院', blurb: 'The teaching hospital. Pharmacy downstairs, sim suite upstairs.',
    bg: 'shands', interior: 'or_suite', song: 'hospital', outdoor: true, focusX: 240, map: { x: 0.92, y: 0.84 }, actions: ['pharmacy', 'minigame:surgery'],
  },
  stadium: {
    id: 'stadium', name: 'Ben Hill Griffin Stadium', jp: 'ザ・スワンプ', blurb: '"The Swamp." Loudest place in Florida on game day.',
    bg: 'stadium', song: 'stadium', outdoor: true, focusX: 240, map: { x: 0.17, y: 0.18 }, actions: ['cheer'],
  },
  lake_alice: {
    id: 'lake_alice', name: 'Lake Alice', jp: 'アリス湖', blurb: 'Gators, cypress knees, and the bat houses at dusk.',
    bg: 'lake_alice', song: 'lake_alice', outdoor: true, focusX: 300, map: { x: 0.13, y: 0.47 }, actions: ['bats'],
  },
  reitz: {
    id: 'reitz', name: 'Reitz Union', jp: 'ライツ・ユニオン', blurb: 'Student union: campus store, food court, game room.',
    bg: 'reitz', song: 'shop', outdoor: true, focusX: 240, map: { x: 0.33, y: 0.42 }, actions: ['shop'],
  },
  volleyball_courts: {
    id: 'volleyball_courts', name: 'Sand Volleyball Courts', jp: 'ビーチバレー場', blurb: 'Evening rallies. Piggy 1 trades his laptop for a volleyball.',
    bg: 'volleyball_courts', song: 'piggy1_theme', outdoor: true, focusX: 240, map: { x: 0.12, y: 0.79 }, actions: ['minigame:volley'],
  },
  midtown: {
    id: 'midtown', name: 'Midtown', jp: 'ミッドタウン', blurb: 'University Ave after dark: pizza, boba, neon.',
    bg: 'midtown', song: 'midtown', outdoor: true, focusX: 240, map: { x: 0.62, y: 0.04 }, actions: ['shop'],
  },
};

export const LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];

/**
 * Each pig has his own distinct room at Sakura House. The 'dorm' location means "at home":
 * the KempaPager shows the companion in HIS room, and the Sakura House location (exterior
 * 'sakura_house') lets the player knock on any pig's door.
 */
export const HOME_BG: Record<PigId, BackgroundId> = {
  'piggy-1': 'home_p1', // sunny volleyball + coding room
  'piggy-2': 'home_p2', // chaotic neuro lab-office: boxes of medical supplies everywhere
  'piggy-3': 'home_p3', // lavender maker's den: a printer, a printer, and a smaller printer
};

/** Background for a location, resolving 'dorm' (home) to the given pig's own room. */
export function backgroundFor(loc: LocationId, pig?: PigId | null): BackgroundId {
  if (loc === 'dorm') return pig ? HOME_BG[pig] : 'sakura_house';
  return LOCATIONS[loc].bg;
}

/** Bedtimes by local clock, [sleepHour, wakeHour] (fractional hours). */
export const BEDTIME: Record<PigId, [number, number]> = {
  'piggy-1': [26.5, 10.5],
  'piggy-2': [22, 5],
  'piggy-3': [24.5, 8.5],
};

/** True when the pig would normally be asleep at this local time. */
export function isBedtime(pig: PigId, d: Date = new Date()): boolean {
  const [sleep, wake] = BEDTIME[pig];
  const h = d.getHours() + d.getMinutes() / 60;
  const s = sleep % 24;
  // 22:00→05:00 wraps midnight; 00:30→08:30 does not.
  return s > wake ? h >= s || h < wake : h >= s && h < wake;
}

export type ScheduleSlot = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night' | 'owl';

/** Finer-grained slots used for the pigs' schedules (visual time of day uses timeOfDay()). */
export function scheduleSlot(d: Date = new Date()): ScheduleSlot {
  const h = d.getHours();
  if (h < 5) return 'owl';
  if (h < 8) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 14) return 'midday';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'dusk';
  return 'night';
}

type Slot = Partial<Record<Weekday | 'any', LocationId>>;

/** Where each pig hangs out when awake. Weekday-specific entries win over 'any'. See GAME_DESIGN.md §5. */
const SCHEDULE: Record<PigId, Record<ScheduleSlot, Slot>> = {
  'piggy-1': {
    dawn: { any: 'dorm' },
    morning: { any: 'malachowsky' },
    midday: { any: 'malachowsky' },
    afternoon: { any: 'malachowsky' },
    dusk: { any: 'volleyball_courts' },
    night: { any: 'dorm', fri: 'midtown', sat: 'midtown' },
    owl: { any: 'dorm' },
  },
  'piggy-2': {
    dawn: { any: 'shands', sun: 'dorm' },
    morning: { any: 'communicore', sun: 'dorm' },
    midday: { any: 'communicore', fri: 'plaza', sun: 'dorm' },
    afternoon: { any: 'shands', tue: 'anatomy_lab', thu: 'anatomy_lab', sun: 'reitz' },
    dusk: { any: 'communicore', sat: 'marston', sun: 'marston' },
    night: { any: 'marston' },
    owl: { any: 'dorm' },
  },
  'piggy-3': {
    dawn: { any: 'dorm' },
    morning: { any: 'physics', sun: 'dorm' },
    midday: { any: 'physics', fri: 'plaza', sun: 'reitz' },
    afternoon: { any: 'physics', sun: 'reitz' },
    dusk: { any: 'lake_alice' },
    night: { any: 'marston', sat: 'midtown' },
    owl: { any: 'marston' },
  },
};

/** Where a pig is right now ('dorm' = Sakura House, also when asleep). */
export function whereIs(pig: PigId, d: Date = new Date()): LocationId {
  if (isBedtime(pig, d)) return 'dorm';
  const slot = SCHEDULE[pig][scheduleSlot(d)];
  return slot[weekday(d)] ?? slot.any ?? 'dorm';
}

/** Pigs (awake, out on campus) at a location right now. */
export function pigsAt(loc: LocationId, d: Date = new Date()): PigId[] {
  if (loc === 'dorm') return [];
  return (Object.keys(SCHEDULE) as PigId[]).filter((p) => whereIs(p, d) === loc);
}
