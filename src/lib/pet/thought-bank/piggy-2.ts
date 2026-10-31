// Piggy 2's thought pool for the idle thought bubbles: 61 thoughts plus 4 sick ones (thoughts final.md §16.2).
// Deadpan: short fragments joined by ":" and ";" (the two-sentence limit), contractions, no "!", one strong word per line,
// "based" in about one line in five, sleep as a dry running joke (he barely sleeps; two thoughts, never a rant). He already
// has grants and is always chasing the next one. Medical facts are his own research and physiology, never advice to the
// player; the collection is never used on anyone.
// Data only: the seeded scheduler that picks from it is ../thoughts.ts. Row order is part of the data (weighted picks walk it).
import type { PigThoughts, ThoughtDef, TopicRule } from './types';

/** Every topic the pool uses; rules only where the default (weighted, never twice in a row) isn't right. */
const topics: Readonly<Record<string, TopicRule>> = {
  neuro: {},
  perfusion: {},
  residency: {},
  /** He hogs retired gear, but it's one bit. */
  collection: { cap: 3 },
  based: {},
  /** His birthday: the single-day date:07-04 thought comes first that day; the ungated history trivia fills in. */
  july4: { cap: 1 },
  'july4-soon': { cap: 1 },
  labpigs: {},
  friends: {},
  player: {},
  life: {},
  'p1bday-soon': { cap: 1 },
  'p3bday-soon': { cap: 1 },
  'holiday-soon': { cap: 1 },
  /** Reserved: his whole pool while he is sick, never picked otherwise. */
  sick: {},
};

const thoughts: readonly ThoughtDef[] = [
  {
    id: 'p2.map85', topic: 'perfusion', label: 'MAP above 85', icon: 'ecg', face: 'neutral',
    line: 'Mean arterial pressure above 85 after a cord injury. Translation: the cord is thirsty.',
  },
  {
    id: 'p2.icp-bumps', topic: 'neuro', label: 'ICP waveform', icon: 'ecg', face: 'excited',
    line: 'Normal ICP waveform: three bumps per heartbeat, tallest first, which means the brain has room. Beautiful.',
  },
  {
    id: 'p2.impedance', topic: 'neuro', label: 'Low impedance', icon: 'brain_heur', face: 'proud',
    line: "Electrode impedance under five kilohms: clean contact, clean signal. Today's most based number.",
  },
  {
    id: 'p2.reviewer-2', topic: 'residency', label: 'Reviewer 2', icon: 'log', face: 'thinking',
    line: 'Reviewer 2 asked if we considered ischemia. We consider nothing else, Reviewer 2.',
  },
  {
    id: 'p2.grant-aim2', topic: 'residency', label: 'Next grant: Aim 2', icon: 'log', face: 'thinking',
    line: 'Next grant, Aim 2: maintain cord perfusion after injury. Rewrote one sentence nine times; draft one was right.',
  },
  {
    id: 'p2.next-paper', topic: 'neuro', label: 'Next paper idea', icon: 'light', face: 'thinking',
    line: 'If the chip reads a step before the leg moves, we can help the leg move. Next paper, maybe next decade.',
  },
  {
    id: 'p2.snout-nap', topic: 'labpigs', label: "Snout's nap photo", icon: 'lab_pig', face: 'proud', when: ['time:morning'],
    line: 'The night tech sent a photo of Professor Snout snoring on his blanket. Perfusion: visibly excellent.',
  },
  {
    id: 'p2.apple-tuesday', topic: 'labpigs', label: 'Apple Tuesday', icon: 'lab_pig', face: 'proud', when: ['day:tue'],
    line: 'Tuesday is apple day. Truffle finishes his in two bites, and Lancelot negotiates for a second.',
  },
  {
    id: 'p2.spindles', topic: 'neuro', label: 'Sleep spindles', icon: 'brain_heur', face: 'excited', when: ['time:morning'],
    line: "Truffle's overnight EEG shows sleep spindles, little bursts that file memories. Even asleep, he studies.",
  },
  {
    id: 'p2.mri-print', topic: 'neuro', label: 'Frame-worthy MRI', icon: 'camera', face: 'proud',
    line: "Today's spine MRI: no swelling, no motion blur. Radiology asked why I wanted a print, so I said, “Look at it.”",
  },
  {
    id: 'p2.willis-dust', topic: 'neuro', label: 'Dust on Willis', icon: 'brain_model', face: 'neutral',
    line: 'Willis has dust in his Sylvian fissure, the big side groove. Unacceptable; cleaning him now.',
  },
  {
    id: 'p2.reflex-arc', topic: 'neuro', label: 'Reflex arcs', icon: 'spine', face: 'thinking',
    line: 'Knee-jerk reflex: the cord answers before the brain hears the question. Efficient, and a little rude.',
  },
  {
    id: 'p2.dura-closure', topic: 'residency', label: 'Watertight dura', icon: 'health', face: 'proud',
    line: "Sim lab: a watertight dural closure. The dura is the brain's raincoat, and this one doesn't leak.",
  },
  {
    id: 'p2.snout-walk', topic: 'labpigs', label: "Snout's big walk", icon: 'lab_pig', face: 'loving', when: ['tier:W'],
    line: "Rewatched Professor Snout's walk video: forty seconds of footage, twelve weeks of work. My eyes are hydrating.",
  },
  {
    id: 'p2.dermatomes', topic: 'neuro', label: 'Dermatome map', icon: 'spine', face: 'thinking', when: ['need:bored'],
    line: "Bored, so I'm drawing a dermatome map from memory. Thumb is C6, pinky is C8, and the skin has a wiring diagram.",
  },
  {
    id: 'p2.csf-clear', topic: 'neuro', label: 'Clear CSF', icon: 'health', face: 'neutral',
    line: 'Clear CSF, steady drip: the most calming sight in medicine. Do not tell the meditation apps.',
  },
  {
    id: 'p2.cranial-nerves', topic: 'life', label: 'Bath-time recital', icon: 'wash', face: 'neutral', when: ['need:dirty'],
    line: 'Unsterile, so: a bath, then the twelve cranial nerves out loud, olfactory to hypoglossal. Clean pig, clean recall.',
  },
  {
    id: 'p2.box12-cardio', topic: 'collection', label: 'Box 12: cardio', icon: 'supply_box', face: 'proud',
    line: 'Box twelve, cardiology: a blood pressure cuff from 1987. The hook-and-loop strap still rips open like thunder.',
  },
  {
    id: 'p2.stetho-4', topic: 'collection', label: 'Stethoscope #4', icon: 'stethoscope', face: 'proud',
    line: "Somewhere in Shands, a stethoscope is about to retire, and it will be number four. I alerted the nurses' station.",
  },
  {
    id: 'p2.beige-monitor', topic: 'collection', label: 'Beige monitor', icon: 'ecg', face: 'proud', when: ['place:shands'],
    line: "Shands is retiring a 2003 vital-signs monitor: beige, magnificent. I've filed a formal request.",
  },
  {
    id: 'p2.no-shelf', topic: 'collection', label: 'No shelf for 12', icon: 'supply_box', face: 'thinking', when: ['place:dorm'],
    line: 'Box twelve has no shelf yet. The bathtub is under consideration; the bathtub is not under consideration.',
  },
  {
    id: 'p2.wish-otoscope', topic: 'collection', label: 'Wish list', icon: 'gift', face: 'shy', when: ['tier:FW'],
    line: 'Wish list: a retired otoscope, the little ear light. Not because I need it; because I need it.',
  },
  {
    id: 'p2.box9-rain', topic: 'collection', label: 'Box 9, rainy day', icon: 'supply_box', face: 'neutral', when: ['weather:rain'],
    line: "Rainy day: reorganizing box nine, renal. Kidneys handle water, so it's thematically appropriate.",
  },
  {
    id: 'p2.in-service', topic: 'residency', label: 'In-service exam', icon: 'book', face: 'thinking',
    line: "The in-service exam comes once a year, and I study for it all year. That isn't anxiety; that's spaced repetition.",
  },
  {
    id: 'p2.gameday-call', topic: 'residency', label: 'Game-day call', icon: 'kempapager', face: 'neutral', when: ['day:gameday'],
    line: 'On call on game day: the Swamp roars, the pager buzzes, and I choose the pager. Obviously.',
  },
  {
    id: 'p2.miss-or', topic: 'residency', label: 'I miss the OR', icon: 'health', face: 'sad',
    line: 'Fewer OR days on my research year, and I miss the neuromonitoring beeps. I hum them sometimes, at the correct pitch.',
  },
  {
    id: 'p2.call-room', topic: 'life', label: 'Call-room nap', icon: 'moon', face: 'sleepy', when: ['need:sleepy'],
    line: 'Call-room nap rating: six out of ten. Cot too short, blanket adequate, would nap again.',
  },
  {
    id: 'p2.sleep-chart', topic: 'life', label: 'Sleep, uncharted', icon: 'moon', face: 'sleepy',
    line: "Sleep is the vital sign I never chart. It's trending down; monitoring.",
  },
  {
    // Gated on Communicore, the tower's neighbor: nobody's schedule puts a pig at Century Tower itself, so a
    // `place:century_tower` gate could never hold (tests/thoughts.test.ts checks every place gate against the schedule).
    id: 'p2.century-bells', topic: 'based', label: 'Bells: based', icon: 'music', face: 'proud', when: ['place:communicore', 'time:day'],
    line: 'Century Tower rang exactly on time again. Punctuality is the most underrated vital sign: based bells.',
  },
  {
    id: 'p2.overheard', topic: 'based', label: 'Overheard: based', icon: 'talk', face: 'proud', when: ['place:reitz'],
    line: 'Someone at the Reitz said “based” into their phone, so I said “Patriot.” They looked confused; worth it.',
  },
  {
    id: 'p2.storm-verdict', topic: 'based', label: 'Storm verdict', icon: 'rain', face: 'thinking', when: ['weather:storm'],
    line: 'Thunderstorm verdict: based, since lightning is basically the sky firing an action potential. Stay inside anyway.',
  },
  {
    id: 'p2.pt-fine', topic: 'based', label: 'Vague chart note', icon: 'stamp', face: 'angry',
    line: 'Chart note: “pt fine.” Fine how, fine where; not based.',
  },
  {
    id: 'p2.based-scale', topic: 'based', label: 'Based scale: 9/10', icon: 'star', face: 'proud',
    line: "Today's sky is a nine out of ten on the based scale. One point docked for the glare.",
  },
  {
    id: 'p2.stress-test', topic: 'based', label: 'Football stress test', icon: 'pennant', face: 'proud', when: ['day:gameday'],
    line: 'Game day is a three-hour cardiac stress test with a halftime show. Eighty thousand pulses, zero arrhythmias detected.',
  },
  {
    id: 'p2.july4-soon', topic: 'july4-soon', label: 'July 4th soon', icon: 'fireworks', face: 'bashful_smile', when: ['date:06-27..07-03'],
    line: 'July 4th is my birthday, and the whole country celebrates. Probably a coincidence; still based.',
  },
  {
    id: 'p2.july4', topic: 'july4', label: 'Birthday. Based.', icon: 'cake', face: 'proud', when: ['date:07-04'],
    line: 'July 4th: birthday, apple pie, fireworks tonight; I packed earplugs for everyone, labeled by name. Patriot.',
  },
  {
    id: 'p2.signers', topic: 'july4', label: 'History trivia', icon: 'book', face: 'thinking',
    line: "Most signers signed the Declaration on August 2nd, not July 4th. I still celebrate the 4th; it's my birthday.",
  },
  {
    id: 'p2.p1-ankle', topic: 'friends', label: "Piggy 1's ankle", icon: 'knee_pad_tape', face: 'thinking',
    line: "Piggy 1 says his ankle is “basically fine.” Basically isn't a diagnosis, so I'm bringing ice.",
  },
  {
    id: 'p2.kaffeepause', topic: 'friends', label: 'Kaffeepause', icon: 'cafecito', face: 'proud',
    line: "Piggy 1's old lab in Germany had a daily Kaffeepause, a scheduled coffee break. Very based institution.",
  },
  {
    id: 'p2.p3-x-habit', topic: 'friends', label: "Piggy 3's X habit", icon: 'phone_feed', face: 'neutral', when: ['with:piggy-3'],
    line: 'Piggy 3 checked X four times during my CSF talk. Pure reflex, spinal not cortical; documented.',
  },
  {
    id: 'p2.p3-can', topic: 'friends', label: 'Can number two', icon: 'red_bull_sf', face: 'thinking', when: ['place:marston', 'time:night'],
    line: 'Piggy 3 is on can number two at Marston, so I left a banana by his keyboard. A quiet intervention.',
  },
  {
    id: 'p2.p1bday-soon', topic: 'p1bday-soon', label: 'Birthday: Piggy 1', icon: 'cake', face: 'neutral', when: ['date:06-17..06-21'],
    line: "June 21st is Piggy 1's birthday, the longest day of the year. He'll spend all of it on the sand; I packed sunscreen.",
  },
  {
    id: 'p2.p3bday-soon', topic: 'p3bday-soon', label: 'Birthday: Piggy 3', icon: 'gift', face: 'proud', when: ['date:11-01..11-07'],
    line: "November 7th is Piggy 3's birthday, shared with a two-time Nobel laureate. He'll mention it; I'll allow it.",
  },
  {
    id: 'p2.your-hydration', topic: 'player', label: 'Your hydration', icon: 'water_bottle', face: 'thinking', when: ['tier:NF'],
    line: "I haven't seen you drink water today. Not that I'm watching; I'm watching a little, clinically.",
  },
  {
    id: 'p2.saved-seat', topic: 'player', label: 'Your seat, saved', icon: 'stethoscope', face: 'shy', when: ['place:communicore', 'tier:FW'],
    line: 'Saved you a seat in the Communicore library and put a retired stethoscope on it. Nobody argues with a stethoscope.',
  },
  {
    id: 'p2.heart-rate', topic: 'player', label: 'Heart rate: up', icon: 'heart', face: 'flustered_blush', when: ['tier:W'],
    line: 'Pulse rose when you arrived. Ruled out caffeine, ruled out stairs; remaining differential: you.',
  },
  {
    id: 'p2.bottle-twelve', topic: 'player', label: 'Bottle twelve', icon: 'big_water_bottle', face: 'affectionate_blush', when: ['tier:W'],
    line: "Water bottle twelve, the one you left me, is the only bottle I never labeled. It doesn't need one.",
  },
  {
    id: 'p2.sakura-legend', topic: 'player', label: 'The sakura legend', icon: 'sakura_charm', face: 'shy_blush', when: ['place:communicore', 'tier:W'],
    line: 'The Century Sakura legend remains unpublished. I keep walking past it anyway, for data.',
  },
  {
    id: 'p2.declassified', topic: 'player', label: 'Declassified', icon: 'truffle_fries', face: 'shy_blush', when: ['secret'],
    line: 'Truffle fries: crisp, salty, a little fancy. I declassified them for you, and only you.',
  },
  {
    id: 'p2.bat-hearts', topic: 'life', label: 'Bat heart rates', icon: 'moon', face: 'neutral', when: ['place:lake_alice', 'time:evening'],
    line: "A flying bat's heart can beat past eight hundred times a minute. Mine is at seventy-two; we are not the same.",
  },
  {
    id: 'p2.lunch-skipped', topic: 'life', label: 'Lunch? Skipped.', icon: 'hunger', face: 'sad', when: ['need:hungry', 'time:day'],
    line: "Lunch: skipped, again. Low blood sugar isn't a personality trait, and I'm working on it.",
  },
  {
    id: 'p2.classified', topic: 'life', label: 'Classified snack', icon: 'lock', face: 'flustered_blush', when: ['need:hungry'],
    line: 'I was thinking about nothing. Certainly nothing crispy, salty, or classified.',
  },
  {
    id: 'p2.neuron-costume', topic: 'holiday-soon', label: 'Neuron costume', icon: 'spine', face: 'proud', when: ['date:10-24..10-31'],
    line: 'Halloween costume: a neuron, long axon, many dendrites. Piggy 1 says mop, and Sir Lancelot is afraid of me now.',
  },
  {
    id: 'p2.first-years', topic: 'life', label: 'First-years today', icon: 'name_badge', face: 'happy', when: ['place:anatomy_lab', 'day:tue,thu'],
    line: "Teaching first-years in the anatomy lab. One asked a question I couldn't answer; best feeling, looking it up now.",
  },
  {
    id: 'p2.ordinary', topic: 'life', label: 'Ordinary?', icon: 'star', face: 'thinking', when: ['tier:W'],
    line: "Worried about being ordinary again. Then I remembered Snout walking; ordinary pigs don't do that.",
  },
  {
    id: 'p2.veggie-grill', topic: 'life', label: 'Veggie grill', icon: 'dining_tray', face: 'proud', when: ['day:weekend'],
    line: 'Grill plan: zucchini, peppers, corn, vegetables only, obviously. Char marks at precise intervals.',
  },
  {
    id: 'p2.five-am-coffee', topic: 'life', label: '5 a.m. coffee', icon: 'cold_brew', face: 'neutral', when: ['time:morning'],
    line: "Five a.m., black coffee, empty hallway: the best part of the shift. Don't speak to me before the second sip.",
  },
  {
    id: 'p2.ischemic-day', topic: 'life', label: 'Ischemic day', icon: 'ecg', face: 'sad',
    line: 'Diagnosis for today: low perfusion, mild ischemic mood. Treatment: coffee and a window.',
  },
  {
    id: 'p2.model-collab', topic: 'friends', label: 'Model vs resident', icon: 'brain_heur', face: 'thinking',
    line: "Piggy 3's model spotted an artifact I'd missed. I've decided it's a collaborator, not a competitor.",
  },
  {
    id: 'p2.sim-knots', topic: 'residency', label: 'Sim lab knots', icon: 'suture', face: 'proud',
    line: 'Forty minutes of knots in the sim lab. My hands remember what my schedule forgets.',
  },
  {
    id: 'p2.quiet-pager', topic: 'residency', label: 'Quiet pager', icon: 'kempapager', face: 'thinking',
    line: "The pager has been silent for six hours. That isn't peace; that's the calm before a consult.",
  },
  {
    id: 'p2.sick-chart', topic: 'sick', label: 'Self-charting', icon: 'log', face: 'neutral',
    line: 'Patient: me; chief complaint: also me. Plan: tea, sleep, and nobody tells my program director.',
  },
  {
    id: 'p2.sick-bedrest', topic: 'sick', label: 'Bed rest, noted', icon: 'moon', face: 'sad',
    line: 'I prescribe rest to everyone, and following it myself is a new experience. Not based.',
  },
  {
    id: 'p2.sick-perfusion', topic: 'sick', label: 'Perfusion: meh', icon: 'ecg', face: 'sleepy',
    line: "My perfusion feels subjectively low. Objectively I'd want numbers; subjectively, a blanket.",
  },
  {
    id: 'p2.sick-temp', topic: 'sick', label: 'Temp: 99.1', icon: 'health', face: 'sick',
    line: 'Temperature: 99.1. Technically not a fever; emotionally, a fever.',
  },
];

/** Piggy 2's topics (with their rules) and thoughts: 61 everyday ones and 4 for when he's sick. */
export const PIGGY_2_THOUGHTS: PigThoughts = { pig: 'piggy-2', topics, thoughts };
