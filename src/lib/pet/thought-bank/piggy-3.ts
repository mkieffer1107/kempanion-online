// Piggy 3's thought pool for the idle thought bubbles: 60 thoughts plus 4 sick ones (thoughts final.md §16.3).
// Thinks aloud: "like,", "okay", restarts with an em dash, "one clear example", "basically", and not a punchline in every line.
// He is on X all the time (30 of his 60 thoughts, about half of everything he thinks) and sometimes says "X.com". The x
// thoughts are wholesome (spinners, notifications, threads, drafts, buzzword mumbling, the For You page, a chart with no
// baseline): nobody is named, it is "post" never "tweet", and the old name appears only as someone else's word in a line
// that also says X (the label "They said Twitter" is the one exception). 3D printing is one thought. His privacy rule holds:
// no project names, no quotes from the owner's notes.
// Data only: the seeded scheduler that picks from it is ../thoughts.ts. Row order is part of the data (weighted picks walk it).
import type { PigThoughts, ThoughtDef, TopicRule } from './types';

/** Every topic the pool uses; rules only where the default (weighted, never twice in a row) isn't right. */
const topics: Readonly<Record<string, TopicRule>> = {
  /** "Piggy 3 should think about stuff on X a lot": takes 60% of every pick (4.5 : 1 odds for his first thought of the day),
   *  never three in a row. When he thinks about X he pulls out his phone (add `pose: 'phone'` once 'phone' is an AnimId, spec 15). */
  x: { share: 0.6, streak: 2, mult: { first: 3, 'time:late': 1.5 }, hint: 'probably on X', pose: 'phone' },
  math: {},
  agents: {},
  signals: {},
  robotics: {},
  hpc: {},
  onepiece: {},
  /** An occasional hobby: one thought in the pool, the cap is a guard for later additions. */
  print3d: { cap: 1 },
  /** His drink, not his personality. */
  redbull: { cap: 2 },
  'birthday-soon': { cap: 1 },
  birthday: {},
  'p1bday-soon': { cap: 1 },
  'p2bday-soon': { cap: 1 },
  friends: {},
  campus: {},
  weather: {},
  life: {},
  player: {},
  /** Reserved: his whole pool while he is sick, never picked otherwise. */
  sick: {},
};

const thoughts: readonly ThoughtDef[] = [
  {
    id: 'p3.loading', topic: 'x', label: 'X.com is loading...', icon: 'spinner', face: 'thinking',
    line: "X.com is still loading— okay, still loading. The spinner's really nicely designed, though, so honestly I'm fine.",
  },
  {
    id: 'p3.notifs', topic: 'x', label: '3 notifications', icon: 'bell', face: 'happy',
    line: "Three notifications! Okay, two are bots, but one is a real like from an actual person, so I'm focusing on that one.",
  },
  {
    id: 'p3.mutual-like', topic: 'x', label: 'A mutual liked it', icon: 'heart', face: 'excited',
    line: "A mutual liked my post, someone whose posts I actually read. I'm being normal about it— I'm not being normal about it.",
  },
  {
    id: 'p3.said-twitter', topic: 'x', label: 'They said Twitter', icon: 'anger_vein', face: 'angry',
    line: "Someone just called it “Twitter.” It's X— X.com— and it's been X for years, so I'm calm, I'm— no, I'm not calm.",
  },
  {
    id: 'p3.breakfast-twitter', topic: 'x', label: 'Breakfast incident', icon: 'anger_vein', face: 'angry', when: ['time:morning'],
    line: 'Piggy 1 said “Twitter” at breakfast, on purpose, grinning. I said “X” four times, slower every time.',
  },
  {
    id: 'p3.drafting', topic: 'x', label: 'Drafting a post', icon: 'log', face: 'thinking',
    line: "Drafting a post: “ok so i made a little thing.” Wait, every post I write starts like that, so it's a format now.",
  },
  {
    id: 'p3.for-you', topic: 'x', label: 'For You page', icon: 'phone_feed', face: 'laughing',
    line: "My For You page is robot arms, One Piece, EEG papers, and cats. That's the whole algorithm— it's basically just me.",
  },
  {
    id: 'p3.data-work', topic: 'x', label: 'Behind the data', icon: 'book', face: 'thinking',
    line: "Cool model, but who collected and cleaned the data? I want that part of the thread too.",
  },
  {
    id: 'p3.thread-27', topic: 'x', label: 'Thread 1/27', icon: 'thread', face: 'excited',
    line: "There's a thread, and it says 1/27. Okay, I'm committing— I'm reading all twenty-seven before I reply to anything.",
  },
  {
    id: 'p3.mumble', topic: 'x', label: 'Mumble mumble', icon: 'talk', face: 'shy',
    line: 'Was I mumbling? Piggy 1 says I mutter “...tokens... evals... agents...” like Deku, and, okay, yeah, I see it.',
  },
  {
    id: 'p3.rlvr', topic: 'x', label: 'RLVR discourse', icon: 'star', face: 'excited',
    line: 'RLVR means the reward comes from a checkable answer, like math: right or wrong, no vibes. My old tutor brain approves.',
  },
  {
    id: 'p3.jepa', topic: 'x', label: 'JEPA thread', icon: 'thread', face: 'confused',
    line: 'Reading a JEPA thread: it predicts the missing part in embedding space, not pixels? I think I need one clear example.',
  },
  {
    id: 'p3.ttc', topic: 'x', label: 'Test-time compute', icon: 'clock', face: 'happy',
    line: 'Test-time compute is basically letting the model think longer before it answers. Honestly, I should also try that.',
  },
  {
    id: 'p3.scaling', topic: 'x', label: 'Scaling laws again', icon: 'stats', face: 'happy',
    line: 'Scaling laws again: bigger model, more data, a straight line on a log-log plot. I just like the plot.',
  },
  {
    id: 'p3.agents-all', topic: 'x', label: 'Agents discourse', icon: 'brain_heur', face: 'laughing',
    line: 'The timeline says agents can do everything now. Mine just named a variable “temp2,” so, like, almost everything.',
  },
  {
    id: 'p3.evals', topic: 'x', label: 'Evals discourse', icon: 'trophy', face: 'thinking',
    line: "Evals fight: did the model see the test in training? That's the kid who memorized the answer key— I tutored that kid.",
  },
  {
    id: 'p3.world-models', topic: 'x', label: 'World models', icon: 'map', face: 'thinking',
    line: "World models predict what happens next in a whole world. I'd settle for one that predicts Piggy 1's stray volleyballs.",
  },
  {
    id: 'p3.vla', topic: 'x', label: 'VLA robot demo', icon: 'robot', face: 'excited',
    line: 'A VLA robot folded a towel on my timeline— vision, language, action. It took four minutes, and I watched it twice.',
  },
  {
    id: 'p3.eeg-model', topic: 'x', label: 'New EEG model!', icon: 'ecg', face: 'excited',
    line: "Someone posted an EEG foundation model with open weights! I'm downloading it tonight to try on Piggy 2's pig EEG.",
  },
  {
    id: 'p3.one-more-scroll', topic: 'x', label: 'One more scroll', icon: 'moon', face: 'sleepy', whenAny: ['low:sleepy', 'time:late'],
    line: 'Okay, one more scroll, then sleep. ...That was eleven more scrolls, and I counted, which somehow makes it worse.',
  },
  {
    id: 'p3.lunch-thread', topic: 'x', label: 'Lunch can wait', icon: 'onigiri', face: 'sad', when: ['low:hungry'],
    line: "The thread had a part two, then a part three, and now I'm really hungry. Is there onigiri?",
  },
  {
    id: 'p3.refresh', topic: 'x', label: 'Refresh. Refresh.', icon: 'spinner', face: 'neutral', when: ['low:bored'],
    line: 'Refresh, nothing new, refresh, still nothing. I know how this looks, so can we go do, like, anything?',
  },
  {
    id: 'p3.marston-wifi', topic: 'x', label: 'Marston Wi-Fi', icon: 'phone_feed', face: 'happy', when: ['place:marston', 'time:night'],
    line: "Marston's Wi-Fi at night is so fast the timeline loads before I even scroll. That's dangerous, for me specifically.",
  },
  {
    id: 'p3.sim-x-loop', topic: 'x', label: 'Sim, X, sim, X', icon: 'rack', face: 'thinking', when: ['place:physics'],
    line: "While my simulation runs on HiPerGator, I check X, and while X loads, I check the simulation. It's a very stable loop.",
  },
  {
    id: 'p3.swamp-chomp', topic: 'x', label: 'Swamp timeline', icon: 'pennant', face: 'excited', when: ['day:gameday'],
    line: "Everyone in the Swamp is posting the same chomp from eighty thousand angles. That's basically a 3D scan of one chomp.",
  },
  {
    id: 'p3.are-you-on-x', topic: 'x', label: 'Follow-back plan', icon: 'phone_feed', face: 'shy', when: ['tier:N'],
    line: "I keep wanting to ask if you're on X. No pressure— I'd follow you back, like, instantly, which is a little pressure.",
  },
  {
    id: 'p3.phone-face-down', topic: 'x', label: 'Phone face-down', icon: 'heart', face: 'affectionate_blush', when: ['tier:W'],
    line: "When you're here, I put my phone face-down. Like, actually face-down, which is kind of a big deal for me.",
  },
  {
    id: 'p3.four-bit', topic: 'x', label: '4-bit and fine?', icon: 'brain_heur', face: 'excited',
    line: 'Someone ran a 4-bit quantized model on one GPU and it still works? Rounding the weights is basically free, mostly.',
  },
  {
    id: 'p3.no-baseline', topic: 'x', label: 'Chart, no baseline', icon: 'stats', face: 'thinking',
    line: "A huge chart with an amazing number and no baseline. Compared to what, though— I'll keep scrolling until someone asks.",
  },
  {
    id: 'p3.spoiler-mute', topic: 'x', label: 'Spoiler-proofing', icon: 'pirate_manga', face: 'confused',
    line: 'I muted every One Piece spoiler word I can think of. My feed is quiet, which is peaceful and kind of suspicious.',
  },
  {
    id: 'p3.posts-vs-commits', topic: 'x', label: 'Posts vs commits', icon: 'log', face: 'shy',
    line: "I posted about the little thing three times and committed zero times. Okay, so I know what I'm doing next.",
  },
  {
    id: 'p3.proof-squares', topic: 'math', label: 'A cute proof', icon: 'chalkboard', face: 'excited',
    line: '1, then 1+3, then 1+3+5 gives 1, 4, 9— squares! Each odd number is an L around the last square, so you can see it.',
  },
  {
    id: 'p3.point-nine', topic: 'math', label: '0.999... = 1', icon: 'chalkboard', face: 'laughing',
    line: '0.999 repeating is exactly 1, because a third is 0.333... and you multiply by three. The kids got so mad, fun mad.',
  },
  {
    id: 'p3.tutor-fractions', topic: 'math', label: 'Tutoring memory', icon: 'chalkboard', face: 'happy',
    line: 'A kid I tutored asked why you flip the fraction to divide, so we cut a chocolate bar in quarters. He got it— best day.',
  },
  {
    id: 'p3.codex-colors', topic: 'agents', label: 'Codex made a thing', icon: 'light', face: 'proud',
    line: 'I had Codex build a little bat counter in ten minutes. Then I spent three hours on the colors, which is worth it.',
  },
  {
    id: 'p3.who-built', topic: 'agents', label: 'Who built it?', icon: 'brain_heur', face: 'shy',
    line: 'I built this— well, I set it up, and an agent wrote most of it. Okay, all of it, and I wrote the spec.',
  },
  {
    id: 'p3.tests-pass', topic: 'agents', label: 'Tests pass (which?)', icon: 'bug', face: 'confused',
    line: 'The agent says all tests pass, but which tests? Mine, or the ones it wrote so it would pass?',
  },
  {
    id: 'p3.blink', topic: 'signals', label: 'Blink artifacts', icon: 'ecg', face: 'thinking',
    line: "Every blink makes a huge bump in EEG, and it's your eyelids, not your brain. I want a model that just knows that.",
  },
  {
    id: 'p3.ecg-bumps', topic: 'signals', label: 'ECG bumps', icon: 'ecg', face: 'happy',
    line: 'An ECG has the big spike, but the little bumps around it matter too. I keep asking Piggy 2 which bump means what.',
  },
  {
    id: 'p3.paper-no-code', topic: 'signals', label: 'Paper, no code', icon: 'book', face: 'thinking',
    line: 'A medical AI paper with amazing results and no code. I believe it, like, sixty percent— seventy if they share the data.',
  },
  {
    id: 'p3.box-fetch-robot', topic: 'robotics', label: 'Box-fetching robot', icon: 'robot', face: 'excited',
    line: "A little robot arm could fetch Piggy 2's boxes for him. He has, like, a dozen, so step one is a map of the boxes.",
  },
  {
    id: 'p3.gpu-hours', topic: 'hpc', label: 'GPU hours left', icon: 'rack', face: 'thinking',
    line: 'I only get so many GPU hours on HiPerGator this month, so every experiment has to earn its seat. Which one earns it?',
  },
  {
    id: 'p3.job-3am', topic: 'hpc', label: 'Job done at 3 a.m.', icon: 'rack', face: 'happy', when: ['time:morning'],
    line: "My job finished at 3 a.m. while I was asleep. The log says it worked, so I'm going to pretend I watched.",
  },
  {
    id: 'p3.devil-fruit', topic: 'onepiece', label: 'Devil Fruit pick', icon: 'pirate_manga', face: 'laughing',
    line: "If I ate a Devil Fruit, I'd pick the one where compile errors just bounce off me. Okay, but then I couldn't swim.",
  },
  {
    id: 'p3.crew-of-three', topic: 'onepiece', label: 'Crew of three', icon: 'pirate_manga', face: 'happy',
    line: "One Piece is basically about found family, like us. Piggy 1's the captain, Piggy 2's the doctor, I'm the shipwright.",
  },
  {
    id: 'p3.new-chapter', topic: 'onepiece', label: 'New chapter today', icon: 'pirate_manga', face: 'excited', when: ['day:weekend'],
    line: "New chapter's out! I read it twice: once fast for the story, then slowly for the panels, because the panels deserve it.",
  },
  {
    id: 'p3.straw-hat', topic: 'print3d', label: 'Tiny straw hat', icon: 'sakura_filament', face: 'happy',
    line: "I want to print a tiny straw hat for my monitor. It's been a while since I printed anything, so it's a comeback.",
  },
  {
    id: 'p3.last-red-bull', topic: 'redbull', label: 'Last Red Bull', icon: 'red_bull_sf', face: 'thinking', when: ['time:evening,night'],
    line: 'One sugar-free Red Bull left and the whole night ahead. Okay, so this is a resource allocation problem.',
  },
  {
    id: 'p3.bday-soon', topic: 'birthday-soon', label: 'Birthday soon!', icon: 'gift', face: 'bashful_smile', when: ['date:10-28..11-06'],
    line: "November 7 is coming up. I'm not hinting— okay, I'm hinting a little, like a medium amount.",
  },
  {
    id: 'p3.bday-post', topic: 'birthday', label: 'Birthday post', icon: 'gift', face: 'proud', when: ['date:11-07'],
    line: "It's my birthday, same as Marie Curie! She won two Nobel Prizes; I wrote one birthday post, and it's a good post.",
  },
  {
    id: 'p3.p1bday-soon', topic: 'p1bday-soon', label: 'Evening courts', icon: 'gift', face: 'happy', when: ['date:08-31..09-04'],
    line: "Evening courts and snacks for Piggy 1's September 4 birthday. I'll be there, but “athletic” is a strong word.",
  },
  {
    id: 'p3.p2bday-soon', topic: 'p2bday-soon', label: 'Gift for Piggy 2', icon: 'gift', face: 'laughing', when: ['date:06-30..07-04'],
    line: "Piggy 2's birthday is coming. I wanted to get him something for his collection, but everything I found still works.",
  },
  {
    id: 'p3.box-label-fonts', topic: 'friends', label: 'Box label fonts', icon: 'comic_sans_stickers', face: 'confused', when: ['with:piggy-2'],
    line: "Piggy 2's box labels are in three fonts. I made a template, and he said “curated means handwritten,” so, respect.",
  },
  {
    id: 'p3.pig-pen-friday', topic: 'friends', label: 'Pig Pen Friday', icon: 'acorn', face: 'happy', when: ['place:plaza', 'day:fri'],
    line: 'Pig Pen Friday! Piggy 1 narrates the squirrels like a volleyball match, Piggy 2 hands me water, and I love these guys.',
  },
  {
    id: 'p3.cypress-knees', topic: 'campus', label: 'Cypress knees', icon: 'sparkle', face: 'thinking', when: ['place:lake_alice'],
    line: "Those cypress knees poking out of Lake Alice? Nobody's totally sure what they're for, and I love an open question.",
  },
  {
    id: 'p3.thunder-count', topic: 'weather', label: 'Thunder counting', icon: 'energy', face: 'thinking', when: ['weather:storm'],
    line: "Lightning, then count until the thunder: every five seconds is about a mile. That one was close, so let's stay inside.",
  },
  {
    id: 'p3.petal-tile', topic: 'weather', label: 'Petal pavement', icon: 'petal_pink', face: 'happy', when: ['weather:rain'],
    line: 'The rain stuck sakura petals all over the sidewalk, and it looks like a pixel-art texture. Like, a really good tile.',
  },
  {
    id: 'p3.hoodie-laundry', topic: 'life', label: 'Hoodie laundry', icon: 'bubbles', face: 'shy', when: ['low:dirty'],
    line: "My hoodie's been on for three days. It's not dirty, it's broken in— okay, it's dirty, so laundry's next.",
  },
  {
    id: 'p3.one-clear-example', topic: 'player', label: 'One clear example', icon: 'light', face: 'proud',
    line: "I prepared one clear example for next time you ask me anything. I don't know what you'll ask, but I'm prepared.",
  },
  {
    id: 'p3.plot-for-you', topic: 'player', label: 'A plot for you', icon: 'stats', face: 'bashful_smile', when: ['tier:FW'],
    line: "I made a plot I really want to show you. It's just one line, but it's a really good line.",
  },
  {
    id: 'p3.dango-hierarchy', topic: 'player', label: 'Color hierarchy', icon: 'sakura_dango', face: 'bashful_smile', when: ['secret'],
    line: "Sakura dango: pink, white, green, in that order. It's the only snack with a correct color hierarchy.",
  },
  {
    id: 'p3.sick-onx', topic: 'sick', label: 'Still on X', icon: 'phone_feed', face: 'sleepy',
    line: "Okay, I'm resting— on X, but lying down while scrolling counts as resting, I'm pretty sure.",
  },
  {
    id: 'p3.sick-thermo', topic: 'sick', label: 'Thermometer UI', icon: 'stats', face: 'thinking',
    line: "This thermometer gives me one number, like, where's the trend line? I want the actual chart.",
  },
  {
    id: 'p3.sick-onepiece', topic: 'sick', label: 'One Piece in bed', icon: 'pirate_manga', face: 'happy',
    line: 'Sick-day plan: One Piece from an arc I love. No spoilers, not even from my fever dreams.',
  },
  {
    id: 'p3.sick-buffering', topic: 'sick', label: 'Buffering...', icon: 'clock', face: 'sick',
    line: "My brain's buffering, like a video on bad Wi-Fi. I think it loads faster when someone's sitting nearby.",
  },
];

/** Piggy 3's topics (with their rules) and thoughts: 61 everyday ones and 4 for when he's sick. */
export const PIGGY_3_THOUGHTS: PigThoughts = { pig: 'piggy-3', topics, thoughts };
