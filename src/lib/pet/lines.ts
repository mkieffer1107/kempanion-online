// Short speech-bubble lines for care reactions, refusals, wants and the welcome-back letter.
// Voices follow characters/piggy-{1,2,3}.md. Low needs are self-deprecating jokes, never guilt.
import type { PigId } from '../types';
import type { Taste } from './balance';

type Bank = Record<PigId, readonly string[]>;

export const TASTE_LINES: Record<Exclude<Taste, 'secret'>, Bank> = {
  love: {
    'piggy-1': ["Let's goooo! That's a kill-shot snack, teammate!", 'Nice set! You are officially my setter.', 'Fuel acquired. Serve accuracy +10%. Probably.'],
    'piggy-2': ['Based. Extremely based.', 'Perfusion restored. Thank you.', 'Blood glucose trending up. Mood: based.'],
    'piggy-3': ['Okay, this is really good. Like, actually good.', 'Basically the best snack. I ran the numbers. Loosely.', "Oh, you remembered. That's... yeah. Thanks."],
  },
  like: {
    'piggy-1': ['Solid pass! Thanks, teammate.', 'Good snack. 8 out of 10. Would rally again.', 'Ooh, nice! Refueled!'],
    'piggy-2': ['Acceptable. Based, even.', 'Nutritionally sound. Thank you.', 'Vitals approve.'],
    'piggy-3': ['Oh, nice. Yeah, this is good.', 'Okay, I like this. Not in a weird way.', 'Good pick. Solid baseline.'],
  },
  neutral: {
    'piggy-1': ['Fuel is fuel! Thanks!', 'Calories in, reps out!', 'Thanks, teammate!'],
    'piggy-2': ['Calories received. Noted.', 'Fine. Vitals stable.', 'Thank you. Adequate.'],
    'piggy-3': ["It's... food. Good food. Thanks.", 'Okay. Yeah. Thank you.', 'Mm. Works.'],
  },
  dislike: {
    'piggy-1': ['For the team. FOR THE TEAM.', "I'll eat it. A good teammate eats it.", 'Ha... that was a net violation for my tongue.'],
    'piggy-2': ['Not based. But I will survive.', 'Insufficient perfusion of flavor.', 'Clinically edible. Emotionally not.'],
    'piggy-3': ['Hmm. Best for what? ...Not this.', "It's... chalky? Okay. Thanks though.", 'Actually— no. But thank you.'],
  },
};

/** Item-specific reactions (override the generic taste bank). */
export const ITEM_LINES: Record<string, Partial<Record<PigId, string>>> = {
  tender_sub: { 'piggy-1': 'Tender sub?! You are officially my setter. Nice set!' },
  oranges: { 'piggy-1': "TEAM SNACK! Halftime oranges, let's goooo!" },
  protein_shake: { 'piggy-1': 'Banana shake! Recovery protocol: engaged!', 'piggy-3': "It's... chalky? Best for what, exactly? Not taste." },
  sideline_sip: { 'piggy-1': 'Hydration is a team sport! Glug glug glug!' },
  boiled_peanuts: { 'piggy-1': "They're... wet peanuts. I'll eat it. For the team.", 'piggy-2': 'Boiled peanuts. Salty, soft, based.' },
  cafecito: { 'piggy-1': 'Too... strong... my serve is shaking...', 'piggy-2': 'Cafecito. Tiny cup. Enormous perfusion.' },
  cold_brew: { 'piggy-1': "That's not a drink, that's a dare.", 'piggy-3': 'Cold brew. Okay, now I can actually think.' },
  apple_pie: { 'piggy-2': 'Apple pie. The most patriotic dessert. Based.' },
  sweet_tea: { 'piggy-2': 'Sweet tea. Sugar: noteworthy. Taste: based.', 'piggy-3': "Okay, that's like ninety percent sugar. Actually, ninety-five." },
  acai_bowl: { 'piggy-2': 'This bowl has insufficient perfusion of flavor.' },
  boba_tea: { 'piggy-2': 'The pearls are a choking hazard. Clinically. ...It is fine.' },
  melonpan: { 'piggy-3': 'Melonpan! Best crunch-to-fluff ratio. I ran the numbers. Loosely.' },
  onigiri: { 'piggy-3': "If this were JoJo, there'd be menacing katakana. It's just me eating onigiri." },
  water_bottle: { 'piggy-2': 'Water. The original perfusion. Based.' },
};

export const SECRET_REVEAL: Record<PigId, string> = {
  'piggy-1': 'Wait. Strawberry milk?! How did you— okay, nobody tell the team.',
  'piggy-2': '...Truffle fries. You found my weakness. This is classified. Based.',
  'piggy-3': "Sakura dango... how did you know? I didn't tell anyone. I'm really happy.",
};

export const SECRET_AGAIN: Bank = {
  'piggy-1': ['Strawberry milk again?! Best setter alive!', 'Pink milk! My one weakness! ...Okay, two.'],
  'piggy-2': ['Truffle fries. Perfusion: maximal. Patriot.', 'You remembered. Based. Classified, but based.'],
  'piggy-3': ['Dango! Okay, this is basically my favorite thing.', 'Okay, three dango, three colors. Perfect UI.'],
};

export const LINES = {
  full: {
    'piggy-1': ["Full! Like, buzzer-beater full. Save it for later?", 'Tank is full, teammate! Later?'],
    'piggy-2': ['Gastric capacity reached. Keep it. Later.', 'Satiated. Store it for later.'],
    'piggy-3': ["Okay, I physically can't. Can we keep that for later?", "I'm full. Like, actually full. Later?"],
  },
  betsubara: {
    'piggy-1': ['Dessert goes in the dessert stomach. Different rotation!'],
    'piggy-2': ['Betsubara. A separate dessert compartment. Anatomically dubious. Based.'],
    'piggy-3': ["Okay so there's a separate dessert stomach. Basically science."],
  },
  jittery: {
    'piggy-1': ['Already buzzing! Any more and I serve into orbit.'],
    'piggy-2': ['Caffeine on board already. No further effect. Noted.'],
    'piggy-3': ['Okay, I already had some. More just makes me type faster, not better.'],
  },
  bath: {
    'piggy-1': ['Fresh! Sand gets EVERYWHERE. Like, everywhere.', 'Squeaky clean! Ready for the next rally!'],
    'piggy-2': ['Scrubbing in. Two minutes per hoof. Non-negotiable.', 'Sterile field achieved. Based.'],
    'piggy-3': ["Warm water is... okay, it's nice. Don't tell anyone.", 'Okay, I feel like a fresh build.'],
  },
  bathCooldown: {
    'piggy-1': ["Already clean! Any cleaner and I'd squeak."],
    'piggy-2': ['I am sterile. Further scrubbing is excessive.'],
    'piggy-3': ["I literally just had one. I'm basically soap now."],
  },
  brush: {
    'piggy-1': ['Minty! Smile check: 100%.', 'Two minutes, timed it. Personal record!'],
    'piggy-2': ['Dental hygiene. Underrated. Based.', 'Gums: perfused. Teeth: pristine.'],
    'piggy-3': ['Okay, minty. Two minutes. I timed it.', 'Fresh. Like a clean install.'],
  },
  brushCooldown: {
    'piggy-1': ['Teeth are already sparkling, teammate!'],
    'piggy-2': ['Over-brushing erodes enamel. Later.'],
    'piggy-3': ["I just did that. They're basically polished."],
  },
  play: {
    'piggy-1': ['Free ball! Again! Again!', "That's twelve in a row! New personal record!", 'Pancake save! Did you see that?!'],
    'piggy-2': ['Hand-eye coordination: intact. Again.', 'Cardio. Good for perfusion. Based.'],
    'piggy-3': ['Okay, I caught it! Mostly. Partially.', 'Wait, can we track the arc? ...Later. Throw it!'],
  },
  tooTired: {
    'piggy-1': ['Battery at 5%... gotta recharge first.'],
    'piggy-2': ['Energy critical. Nap first. Doctor\'s orders.'],
    'piggy-3': ["Okay, I'm too tired to catch anything. Nap?"],
  },
  petLow: {
    'piggy-1': ['Whoa! Oh— hey! Ha, okay.', 'Huh? Oh! High five instead?'],
    'piggy-2': ['...Oh. A head pat. Noted.', 'Tactile stimulus received.'],
    'piggy-3': ['Oh! Um. Hi.', 'Oh— okay. Hi. That was nice.'],
  },
  petMid: {
    'piggy-1': ["H-hey, I wasn't in ready position! ...Okay. One more.", "Ha! Okay, that's nice."],
    'piggy-2': ['Cranial nerves report: acceptable. Continue.', 'Heart rate elevated. Not pathologically.'],
    'piggy-3': ["You can keep doing that. I'm not making it weird.", 'Okay, that is really nice actually.'],
  },
  petHigh: {
    'piggy-1': ['Best. Teammate. Ever.', '...Nice set, captain.'],
    'piggy-2': ['Highly acceptable. Patriot.', 'Your presence improves my perfusion.'],
    'piggy-3': ["...I'm making it weird. Sorry. Don't stop.", "Yeah. I'm glad you're here."],
  },
  petSpam: {
    'piggy-1': ["Okay okay, timeout! You're spiking my hair!"],
    'piggy-2': ['That is enough stimulation. I am not a reflex hammer.'],
    'piggy-3': ['Wait— my curls have a build process. You are breaking it.'],
  },
  sleepTalk: {
    'piggy-1': ['...mine... mine... got it...', '...zzz... side out...'],
    'piggy-2': ['...perfusion... excellent...', '...zzz... based...'],
    'piggy-3': ["...five more minutes... job's almost done...", '...zzz... ship it...'],
  },
  tuck: {
    'piggy-1': ["Practice at seven. You'll still be here, right? ...Night!"],
    'piggy-2': ['Sleep clears the brain. Glymphatics. Based. Goodnight.'],
    'piggy-3': ["Five more minutes, the job's almost— okay. Fine. Night. Thanks."],
  },
  nap: {
    'piggy-1': ['Power nap. Twenty minutes. Okay, thirty.'],
    'piggy-2': ['Strategic rest. Wake me if anything is ischemic.'],
    'piggy-3': ["Okay, just resting my eyes. I'm still thinking."],
  },
  notSleepy: {
    'piggy-1': ["Sleep? Now? The sun's still up! Let's rally!"],
    'piggy-2': ['Energy adequate. Sleep later. Promise.'],
    'piggy-3': ["I'm not tired. Okay, a little. Not nap tired."],
  },
  wake: {
    'piggy-1': ['Huh?! Is it game time? ...Five more minutes.', "I'm up! I'm up! ...Mostly."],
    'piggy-2': ["...I'm up. Vitals... loading.", 'Awake. Coffee would be based.'],
    'piggy-3': ["Mm. Okay. I'm up. Mostly.", 'Wait, what time is it? Okay. Hi.'],
  },
  cured: {
    'piggy-1': ['Off the bench! Thanks, teammate!', 'Back in the rotation! Let\'s goooo!'],
    'piggy-2': ['Symptoms resolving. Excellent care. Based.', 'Prognosis: excellent. Thank you.'],
    'piggy-3': ['Okay, I feel way better. Like, actually.', 'Build fixed. Me. I am the build.'],
  },
  notSick: {
    'piggy-1': ["I'm fine! Healthy as a jump serve!"],
    'piggy-2': ['No indication. Unnecessary meds are not based. Keep it.'],
    'piggy-3': ["I'm not sick though? Keep it for later."],
  },
  soothed: {
    'piggy-1': ['Ahh, bubbly! Feeling better already!'],
    'piggy-2': ['Ginger. Mild antiemetic. Based.'],
    'piggy-3': ['Okay, bubbles. Tummy says thanks.'],
  },
  giftLove: {
    'piggy-1': ["No WAY. This is going in the trophy case. Let's goooo!"],
    'piggy-2': ['This is... very based. Thank you. Seriously.'],
    'piggy-3': ["Oh, this is so cool. Okay, I'm going to use this. Like, today."],
  },
  giftLike: {
    'piggy-1': ['Aw, thanks teammate! Love it!'],
    'piggy-2': ['Thoughtful. Based.'],
    'piggy-3': ['Oh, nice! Thank you. Really.'],
  },
  giftNeutral: {
    'piggy-1': ['Ha, cool! Thanks!'],
    'piggy-2': ['Noted. Thank you.'],
    'piggy-3': ["Okay. Thanks! I'll find a use."],
  },
  tidy: {
    'piggy-1': ["Floor's clear! Court's ready!"],
    'piggy-2': ['Sterile field restored. Based.'],
    'piggy-3': ["Okay, that's way better. Cleaner UI."],
  },
} satisfies Record<string, Bank>;

export const GIFT_SPECIAL: Record<string, Partial<Record<PigId, string>>> = {
  comic_sans_stickers: {
    'piggy-1': 'Comic Sans! Iconic. Unironically.',
    'piggy-2': 'The font is not based. The gesture is.',
    'piggy-3': "...I'll keep it.",
  },
  brain_model: { 'piggy-2': 'A brain. Squishy. Circle of Willis is accurate. Based. Thank you.' },
  signed_volleyball: { 'piggy-1': "Every signature?! And a pig doodle! This is the best day of my career!" },
  sakura_filament: { 'piggy-3': 'Sakura PLA! Okay, so I was thinking we could print a little thing. Together.' },
  pirate_manga: { 'piggy-3': 'Volume 1! Okay, you are going to hear SO much about this.' },
  big_water_bottle: { 'piggy-2': 'One liter. Time markings. Hydration is based. Thank you.' },
  knee_pad_tape: { 'piggy-1': 'Tape! Now I can dive for everything! More than I already do!' },
};

/** Narrator-style refusal reasons (shown as toasts). */
export const REASONS = {
  asleep: 'Shh — he is asleep.',
  noItem: "You don't have any of those.",
  needItem: 'Pick something from the bag first.',
  wrongKind: "That's not something you can use like that.",
  notCompanion: 'He takes care of that himself — only your Kempanion needs it.',
  noCompanion: 'Choose your Kempanion first.',
  giftLocked: 'Gifts unlock at ♥1 — get to know him a little first!',
  noMess: 'Already spotless!',
  alreadyAsleep: 'Already asleep. Zzz.',
  alreadyAwake: "He's already up.",
  sickNoRounds: 'Doctor\'s Rounds is only for a sick Kempanion.',
};

// ── wants ──

export const WANT_LINES = {
  food: {
    'piggy-1': ['Craving {x}. Pre-game fuel?', '{x} would hit SO hard right now.'],
    'piggy-2': ['Requesting {x}. For perfusion.', '{x}. Clinically indicated.'],
    'piggy-3': ['Okay, so... {x}? Could we?', "I keep thinking about {x}. Is that weird?"],
  },
  play: {
    'piggy-1': ['Free ball? Toss it to me!', 'Pass drill? Pleeease?'],
    'piggy-2': ['Brief cardio would be based.', 'Play break. For circulation.'],
    'piggy-3': ['Can we play something? Like, a little thing?', 'Throw the ball? I need a break from the build.'],
  },
  bath: {
    'piggy-1': ['Too much sand. Bath time?', 'I smell like a sand court.'],
    'piggy-2': ['Scrub in? Hygiene is based.', 'Requesting a bath. Sterile is a lifestyle.'],
    'piggy-3': ['Okay, a bath would be nice. Actually.', 'Warm water... yeah, that.'],
  },
  pet: {
    'piggy-1': ['High five? Or... a head pat?', 'Morale boost? A pat would do it.'],
    'piggy-2': ['A head pat would be... acceptable.', 'Requesting a pat. For science.'],
    'piggy-3': ["Um. A pat? If that's okay.", 'Could I get a pat? Low-key.'],
  },
  minigame: {
    'piggy-1': ['Sakura Spike? I need reps!', 'Courts? Bump, set, spike?'],
    'piggy-2': ['Perfusion! drill? Rhythm is based.', 'Run the ECG drill with me?'],
    'piggy-3': ['Bug Hunt? I found some weird code.', 'Okay, so I have bugs. Code bugs. Help?'],
  },
  place: {
    'piggy-1': ['Wanna hit {x}?', '{x}! Field trip, teammate!'],
    'piggy-2': ['{x}. Join me?', 'Field visit: {x}. Based.'],
    'piggy-3': ['Could we go to {x}? I had an idea.', 'Okay, {x}? Just for a bit.'],
  },
  talk: {
    'piggy-1': ['Ask me about my serve stats!', 'I have a volleyball fact. Ask me!'],
    'piggy-2': ['Ask me about lumbar drains.', 'I have thoughts on perfusion. Ask.'],
    'piggy-3': ['Have you used Codex? Ask me.', 'Okay, so I was thinking... ask me about it?'],
  },
} satisfies Record<string, Bank>;

// ── welcome-back letter ──

export interface DiaryEntry { did: string; line: string; when?: 'night' | 'day' }

export const DIARY: Record<PigId, readonly DiaryEntry[]> = {
  'piggy-1': [
    { did: 'ran sunrise drills at the sand courts.', line: 'You missed a SICK rally. I will reenact it!', when: 'day' },
    { did: 'updated his serve-stats spreadsheet.', line: "87.5% this week. Okay, it's a spreadsheet. A really good one." },
    { did: 'dug a volleyball out of a sakura tree.', line: "Counts as a save. I'm counting it." },
    { did: 'did homework in his Malachowsky nook.', line: 'A rotation IS a circular buffer. I am a genius. Maybe.', when: 'day' },
    { did: 'slept like a libero.', line: 'Eight hours! Recovery is part of training!', when: 'night' },
    { did: 'taught a squirrel to bump. Kind of.', line: 'It stole my orange. Respect, honestly.', when: 'day' },
  ],
  'piggy-2': [
    { did: 'finished rounds at Shands.', line: 'Vitals stable. Mood: based.', when: 'day' },
    { did: 'reread a spinal cord case report.', line: 'Very relatable anatomy. Based.' },
    { did: 'checked on Professor Snout at the lab.', line: 'He ate a whole apple and walked a lap. Patriot.', when: 'day' },
    { did: 'studied late at Marston.', line: 'Circle of Willis, memorized. Again. For fun.', when: 'night' },
    { did: 'actually rested. Voluntarily.', line: "I slept. Don't make it a thing.", when: 'night' },
    { did: 'organized his pens by color.', line: 'Charting supplies: optimized. Based.' },
  ],
  'piggy-3': [
    { did: 'printed a tiny Century Tower.', line: "It leans. That's a feature." },
    { did: 'ran a job on HiPerGator.', line: "Okay, so it finished. Mostly. I'll show you.", when: 'day' },
    { did: 'redid the KempaPager menu icons.', line: 'Actually, the new ones are way more chill.' },
    { did: 'watched the bats at Lake Alice.', line: 'Half a million bats. I counted like twelve.', when: 'day' },
    { did: 'pair-programmed with a coding agent until 2 AM.', line: 'I did the hard part. Well— we did. Mostly it did.', when: 'night' },
    { did: 'fell asleep on his keyboard.', line: 'My cheek typed a whole function. It compiled??', when: 'night' },
  ],
};

export const PARTY_LINES: Record<PigId, string> = {
  'piggy-1': 'YOU\'RE BACK! Team huddle! Everybody in!',
  'piggy-2': 'Patient returned after prolonged absence. Prognosis: party. Based.',
  'piggy-3': 'Okay, so we made a little welcome-back thing. It has streamers.',
};
