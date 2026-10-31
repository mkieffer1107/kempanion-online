// Piggy 1's thought pool for the idle thought bubbles: 58 thoughts plus 4 sick ones (thoughts final.md §16.1).
// Sunny hype-man: exclamation marks, stats, volleyball and code as metaphors for each other, "teammate" (and "captain"
// only at tier:W), a little sheepish about his code. Germany is background (cap 3), food never reads as a want.
// Data only: the seeded scheduler that picks from it is ../thoughts.ts. Row order is part of the data (weighted picks walk it).
import type { PigThoughts, ThoughtDef, TopicRule } from './types';

/** Every topic the pool uses; rules only where the default (weighted, never twice in a row) isn't right. */
const topics: Readonly<Record<string, TopicRule>> = {
  volleyball: {},
  cs: {},
  haikyu: {},
  /** His research stint in Germany is background, not a theme. */
  germany: { cap: 3 },
  /** Food and drink thoughts must not read like wants. */
  food: { cap: 2 },
  campus: {},
  friends: {},
  player: {},
  life: {},
  birthday: {},
  'p2bday-soon': { cap: 1 },
  'p3bday-soon': { cap: 1 },
  'holiday-soon': { cap: 1 },
  /** Reserved: his whole pool while he is sick, never picked otherwise. */
  sick: {},
};

const thoughts: readonly ThoughtDef[] = [
  {
    id: 'p1.sunrise-61', topic: 'volleyball', label: 'Sunrise #61', icon: 'sun', face: 'excited', when: ['time:morning'],
    line: "Sunrise number 61 this semester, and I haven't gotten tired of a single one. Sixty-one for sixty-one!",
  },
  {
    id: 'p1.toss-left', topic: 'volleyball', label: 'Toss drifts left', icon: 'ball', face: 'laughing', when: ['place:volleyball_courts'],
    line: "My jump-serve toss drifts left when I'm nervous. So now I aim right, and I'm nervous in the correct direction!",
  },
  {
    id: 'p1.pancake-drill', topic: 'volleyball', label: 'Pancake drill', icon: 'hand', face: 'excited', when: ['place:volleyball_courts'],
    line: 'Pancake drill: hand flat on the sand, ball pops off the back of it. Breakfast AND defense, same word!',
  },
  {
    id: 'p1.rally-31', topic: 'volleyball', label: 'Longest rally: 31', icon: 'ball', face: 'excited', when: ['time:evening'],
    line: 'Longest rally at practice: 31 touches! My heart was going like a hackathon deadline.',
  },
  {
    id: 'p1.more-tape', topic: 'volleyball', label: 'More tape than pad', icon: 'knee_pad_tape', face: 'proud',
    line: "My knee pads are more tape than pad now. That's not wear and tear, teammate, that's experience!",
  },
  {
    id: 'p1.libero-envy', topic: 'volleyball', label: 'Libero envy', icon: 'jersey', face: 'laughing',
    line: "The libero gets a different-color jersey so everyone can track them. I want one for whenever I'm right.",
  },
  {
    id: 'p1.called-yours', topic: 'volleyball', label: 'Called YOURS twice', icon: 'talk', face: 'bashful_smile', when: ['tier:FW'],
    line: "Called “Yours!” twice at practice instead of “Mine!” For me, that's basically a winning streak.",
  },
  {
    id: 'p1.thirty-minutes', topic: 'volleyball', label: '30-minute rule', icon: 'energy', face: 'sad', when: ['weather:storm'],
    line: 'Thunder means thirty minutes off the sand after the last rumble. Twenty-six... twenty-seven...',
  },
  {
    id: 'p1.hallway-passes', topic: 'volleyball', label: 'Hallway passes', icon: 'home', face: 'happy', when: ['weather:rain'],
    line: "Rain day, so it's wall passes in the Sakura House hallway. 143 in a row, and the wall looks tired!",
  },
  {
    id: 'p1.golden-petal', topic: 'volleyball', label: 'Golden petal dive', icon: 'petal_gold', face: 'laughing',
    line: "Saw a golden petal and dove for it twice— missed both! That's what knee pads are for.",
  },
  {
    id: 'p1.float-serve', topic: 'volleyball', label: 'Float serve rules', icon: 'ball', face: 'excited',
    line: "Rule one of the float serve: never apologize to the ball. I'm saving the other rules for when you're ready, teammate!",
  },
  {
    id: 'p1.counting-serves', topic: 'volleyball', label: 'Counting serves', icon: 'moon', face: 'sleepy', when: ['need:sleepy'],
    line: "Counting serves to fall asleep. I'm usually out by thirty, but last night I hit ninety and got way too excited.",
  },
  {
    id: 'p1.free-ball', topic: 'volleyball', label: 'Free ball!', icon: 'ball', face: 'happy',
    line: "“Free ball!” is the nicest call in volleyball. It means: here's a gift, take your time, make it pretty.",
  },
  {
    id: 'p1.flaky-test', topic: 'cs', label: 'Flaky test', icon: 'bug', face: 'thinking',
    line: "One of my tests only passes on Tuesdays. I respect the schedule, but it's getting benched.",
  },
  {
    id: 'p1.bracket-tree', topic: 'cs', label: 'Bracket = tree', icon: 'laptop', face: 'thinking',
    line: "A tournament bracket is just an upside-down binary tree! Every match is a node, and I'm aiming for the root.",
  },
  {
    id: 'p1.two-pointers', topic: 'cs', label: 'Two pointers', icon: 'laptop', face: 'proud',
    line: 'Solved a contest problem in fourteen minutes! Two pointers closing in, like two blockers sealing the seam.',
  },
  {
    id: 'p1.sprite-16', topic: 'cs', label: '16x16 volleyball', icon: 'ball', face: 'proud',
    line: "Spent two hours drawing a 16-by-16 volleyball sprite for my game. It's a circle— a REALLY good circle.",
  },
  {
    id: 'p1.merge-net', topic: 'cs', label: 'Merge conflict', icon: 'bug', face: 'thinking',
    line: 'Merge conflicts and net violations are the same call: two of us touched the same thing. Replay the point!',
  },
  {
    id: 'p1.coverage-92', topic: 'cs', label: 'Coverage: 92%', icon: 'stats', face: 'thinking',
    line: 'Test coverage hit 92%. The missing 8% is where the bug hides, like a ball in the back corner.',
  },
  {
    id: 'p1.pair-prog', topic: 'cs', label: 'Pair programming', icon: 'laptop', face: 'happy',
    line: 'Pair-programming with Piggy 3 is like sand doubles: he reads the court, I chase everything. Great split!',
  },
  {
    id: 'p1.hackathon-plan', topic: 'cs', label: 'Hackathon plan', icon: 'log', face: 'laughing', when: ['day:weekday'],
    line: 'Hackathon plan: code, snack, code, nap, code. Piggy 2 crossed out two of the codes and wrote SLEEP.',
  },
  {
    id: 'p1.haikyu-hype', topic: 'haikyu', label: 'Haikyu!! hype', icon: 'manga', face: 'excited',
    line: 'One Haikyu!! episode before practice and my serves go up four percent. Unofficial stat, real hype!',
  },
  {
    id: 'p1.quick-attack', topic: 'haikyu', label: 'Quick attack', icon: 'manga', face: 'excited',
    line: "That quick attack from season one: the hitter jumps before the set even arrives. That's trust, teammate!",
  },
  {
    id: 'p1.training-camp', topic: 'haikyu', label: 'Training camp arc', icon: 'manga', face: 'excited',
    line: 'Training-camp arcs are my favorite: everybody gets better at once, and nobody sleeps. Relatable!',
  },
  {
    id: 'p1.apfelschorle', topic: 'germany', label: 'Apfelschorle', icon: 'drink', face: 'happy',
    line: 'After games in Germany, everybody drank Apfelschorle: half apple juice, half sparkling water. Hydration with fizz!',
  },
  {
    id: 'p1.mensa-thursday', topic: 'germany', label: 'Mensa Thursdays', icon: 'dining_tray', face: 'proud',
    line: 'The Mensa, my old campus cafeteria in Germany, had the best lunch special every Thursday. I have the data!',
  },
  {
    id: 'p1.german-sundays', topic: 'germany', label: 'German Sundays', icon: 'sun', face: 'happy', when: ['day:sun'],
    line: 'In Germany almost every shop closes on Sundays, so everyone just walks and rests. Piggy 2 would call that based!',
  },
  {
    id: 'p1.winter-sunrise', topic: 'germany', label: 'Sunrise at 8:15?!', icon: 'moon', face: 'laughing', when: ['time:morning'],
    line: "In German winter, the sun didn't come up until 8:15. I had to WAIT for my own sunrise practice!",
  },
  {
    id: 'p1.spaghettieis', topic: 'germany', label: 'Spaghettieis', icon: 'vegan_ice_cream', face: 'shy_blush', when: ['tier:FW'],
    line: "German spaghetti ice cream: vanilla pressed into noodles, strawberry sauce on top. Not that I'm a strawberry guy.",
  },
  {
    id: 'p1.du-or-sie', topic: 'germany', label: 'Du or Sie?', icon: 'talk', face: 'confused',
    line: "In German I had to pick “du” or “Sie” for every new person. Here everybody's just “teammate,” which is way easier!",
  },
  {
    id: 'p1.electrolytes', topic: 'food', label: 'Electrolytes!', icon: 'sideline_sip', face: 'proud',
    line: "Electrolytes are teammates for your cells: sodium sets, potassium spikes. Piggy 2 says that's not how it works.",
  },
  {
    id: 'p1.orange-count', topic: 'food', label: 'Orange count: 4/6', icon: 'oranges', face: 'proud', when: ['time:day'],
    line: 'Four oranges down, two to go! The last two are in my bag, waiting for their big moment.',
  },
  {
    id: 'p1.whole-sub', topic: 'food', label: 'Whole sub or half?', icon: 'tender_sub', face: 'excited', when: ['need:hungry'],
    line: "Half a tender sub and I'm hungry again by two. Whole sub it is— the data has spoken!",
  },
  {
    id: 'p1.tiny-volleyballs', topic: 'food', label: 'Tiny volleyballs', icon: 'boba_tea', face: 'laughing',
    line: "Boba pearls are tiny volleyballs. I'm not saying I bump them up the straw, but I'm not NOT saying it.",
  },
  {
    id: 'p1.forgot-lunch', topic: 'food', label: 'Forgot lunch again', icon: 'feed', face: 'sad', when: ['need:hungry'],
    line: 'Packed knee pads, three chargers, and a spare ball... and forgot lunch. My priorities need a time-out.',
  },
  {
    id: 'p1.nook-taken', topic: 'campus', label: 'Nook taken!', icon: 'book', face: 'angry', when: ['place:malachowsky'],
    line: "Someone's in MY Malachowsky nook! Fine, I took the next one over— it's a rebuilding year.",
  },
  {
    id: 'p1.beat-elevator', topic: 'campus', label: 'Beat the elevator', icon: 'medal_gold', face: 'proud', when: ['place:malachowsky'],
    line: "Raced the Malachowsky elevator up four floors and won by two seconds. The elevator doesn't know it lost.",
  },
  {
    id: 'p1.turtle-lineup', topic: 'campus', label: 'Turtle lineup', icon: 'turtle', face: 'happy', when: ['place:lake_alice'],
    line: "Nine turtles sunning on one Lake Alice log, perfectly spaced. That's a better serve-receive formation than ours!",
  },
  {
    id: 'p1.game-day', topic: 'campus', label: 'Game day!', icon: 'pennant', face: 'excited', when: ['day:gameday'],
    line: "Swamp capacity: 88,548. Hype capacity: 88,549, because I'm going!",
  },
  {
    id: 'p1.porch-light', topic: 'campus', label: 'Porch light hum', icon: 'light', face: 'happy', when: ['place:dorm', 'time:night'],
    line: "The Sakura House porch light hums in B-flat. I've harmonized with it 58 nights straight!",
  },
  {
    id: 'p1.midtown-slice', topic: 'campus', label: 'Midtown: one slice', icon: 'pizza_slice', face: 'happy', when: ['place:midtown'],
    line: "Midtown rule: one slice, one walk, and home by 10:30. I've only broken it twice!",
  },
  {
    id: 'p1.based-count', topic: 'friends', label: 'Based count: 14', icon: 'talk', face: 'proud', when: ['with:piggy-2'],
    line: "Piggy 2 said “Based” fourteen times today, and I said “Let's go” thirty-one times. We're both winning!",
  },
  {
    id: 'p1.pulse-168', topic: 'friends', label: 'Post-practice pulse', icon: 'heart', face: 'proud',
    line: "Piggy 2 took my pulse after practice: 168. He called it “impressive and also concerning,” so I'm framing it!",
  },
  {
    id: 'p1.which-metric', topic: 'friends', label: 'Which metric?', icon: 'stats', face: 'thinking',
    line: "Piggy 3 asked which serve stat matters most. I said aces, he said “compared to what?” and now I'm doing statistics.",
  },
  {
    id: 'p1.thread-commentary', topic: 'friends', label: 'Thread commentary', icon: 'phone_feed', face: 'excited',
    line: 'Piggy 3 narrates his X feed like a sports broadcast, “Thread, one of twenty-seven!” Best commentary on campus.',
  },
  {
    id: 'p1.p2bday-soon', topic: 'p2bday-soon', label: 'Sparkler plan', icon: 'apple_pie', face: 'excited', when: ['date:06-27..07-04'],
    line: "Piggy 2's birthday is the Fourth of July! Plan: apple pie, sparklers, and ONE “Let's go!” out of him.",
  },
  {
    id: 'p1.p3bday-soon', topic: 'p3bday-soon', label: 'Surprise plan', icon: 'gift', face: 'happy', when: ['date:11-01..11-07'],
    line: "Piggy 3's birthday is November 7, and I'm planning a surprise. If he asks “best for what?”, I'll say “for YOU!”",
  },
  {
    id: 'p1.stat-column', topic: 'player', label: 'Your stat column', icon: 'stats', face: 'bashful_smile', when: ['tier:FW'],
    line: 'I gave you your own column in my spreadsheet, and every cell just says “clutch.” No data needed for that one.',
  },
  {
    id: 'p1.lunch-assist', topic: 'player', label: 'Lunch assist', icon: 'hunger', face: 'loving', when: ['time:day'],
    line: 'Hope you ate real food today, teammate. Snacks are the assist, but lunch is the kill.',
  },
  {
    id: 'p1.loudest-cheer', topic: 'player', label: 'Loudest cheer', icon: 'heart', face: 'flustered_blush', when: ['tier:W'],
    line: "I cheer for everybody, but I cheer for you the loudest, captain. That's not bias, that's... okay, it's bias.",
  },
  {
    id: 'p1.good-luck-text', topic: 'player', label: 'Good-luck text', icon: 'kempapager', face: 'affectionate_blush', when: ['tier:W'],
    line: "Sunrise practice is better when I know you'll text “nice serve” later. You don't even have to see the serve.",
  },
  {
    id: 'p1.pink-carton', topic: 'player', label: 'Pink carton', icon: 'strawberry_milk', face: 'shy_blush', when: ['secret'],
    line: "You know about the strawberry milk, so: a cold carton after sunrise practice beats any trophy. Don't tell the team.",
  },
  {
    id: 'p1.sitting-52', topic: 'life', label: '52 min of sitting', icon: 'play', face: 'sad', when: ['need:bored'],
    line: "Fifty-two minutes in a chair— that's two whole sets! Quick pepper break, even just two touches?",
  },
  {
    id: 'p1.keyboard-sand', topic: 'life', label: 'Keyboard sand', icon: 'wash', face: 'confused', when: ['need:dirty'],
    line: 'Found sand in my keyboard, my sock, and somehow my granola bar. Bath before it reaches the code?',
  },
  {
    id: 'p1.fifth-set', topic: 'life', label: 'Fifth-set energy', icon: 'moon', face: 'sleepy', when: ['time:late'],
    line: "Bedtime's calling, so this is my fifth set. Fifth sets go to fifteen points, and my energy is at, like, three.",
  },
  {
    id: 'p1.birthday-serves', topic: 'birthday', label: 'Birthday serves', icon: 'cake', face: 'excited', when: ['date:09-04'],
    line: 'Birthday challenge: 4 perfect serves on September 4! Okay, three in— still a party!',
  },
  {
    id: 'p1.candy-sheet', topic: 'holiday-soon', label: 'Candy spreadsheet', icon: 'stats', face: 'excited', when: ['date:10-24..10-31'],
    line: 'Halloween plan: costume, Lake Alice bats, and candy sorted by color in a spreadsheet. Normal stuff!',
  },
  {
    id: 'p1.friendsgiving', topic: 'holiday-soon', label: 'Friendsgiving', icon: 'key_lime_pie', face: 'happy', when: ['date:thanksgiving'],
    line: "Friendsgiving at Sakura House! I'm on oranges and hype, Piggy 2's on pie, and Piggy 3 is making “a little thing.”",
  },
  {
    id: 'p1.sick-bench', topic: 'sick', label: 'Benched today', icon: 'ball', face: 'sad',
    line: "Coach calls this a rest day. I call it the longest bench of my life, and I'm waiting to be subbed back in.",
  },
  {
    id: 'p1.sick-rewatch', topic: 'sick', label: 'Haikyu!! rewatch', icon: 'manga', face: 'happy',
    line: 'Sick-day plan: Haikyu!! from episode one. Does yelling at the screen count as cardio?',
  },
  {
    id: 'p1.sick-zero', topic: 'sick', label: 'Stats: 0 for 0', icon: 'stats', face: 'laughing',
    line: "Today's serve stats: zero for zero. Technically that's undefined, which is still better than a miss!",
  },
  {
    id: 'p1.sick-sips', topic: 'sick', label: 'Tiny timeouts', icon: 'sideline_sip', face: 'sleepy',
    line: "Small sips, like timeouts between points. I'm winning this match slowly— very slowly.",
  },
];

/** Piggy 1's topics (with their rules) and thoughts: 58 everyday ones and 4 for when he's sick. */
export const PIGGY_1_THOUGHTS: PigThoughts = { pig: 'piggy-1', topics, thoughts };
