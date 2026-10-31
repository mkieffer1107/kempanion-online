// Piggy 1 — sunny first-year AIBHS master’s student, Kempa AI ambassador, night-owl researcher and volleyball teammate.
import type { PigLines } from './types';
import { CRISIS_CALL } from '../../quirks';

export const P1: PigLines = {
  chat: {
    greeting: [
      ["excited", "Hey, {player}! Perfect timing. I finally got this explanation to make sense!", { a: "wave" }],
      ["happy", "Teammate! You found me. I saved you the comfy chair!", { a: "wave" }],
      ["excited", "Oh, hi! I was literally about to text you. Great minds, excellent timing!"],
      ["happy", "Hey hey! You, me, {place}. Pretty good plan already!"],
      ["happy", "Hey! I have a new project to show you. After you tell me about your day!", { tier: "NF" }],
      ["bashful_smile", "Hey, {player}. …Okay, today just got way better. Don't tell my stats spreadsheet.", { tier: "W" }],
      ["affectionate_blush", "{player}! Captain, I saved you a spot. I always save you a spot.", { tier: "W" }],
    ],
    farewell: [
      ["happy", "Good rally today. Same time tomorrow?", { a: "wave" }],
      ["excited", "Later, teammate! Hydrate! That's Piggy 2's line, but it's a good line.", { a: "wave" }],
      ["happy", "See ya! Message me later if you need a hype-man. Later is my best hour!", { a: "wave" }],
      ["sad", "Aw, already? Tell me how it goes, {player}! I'm rooting for you!", { a: "wave" }],
      ["happy", "Side out! You're free to go. Thanks for hanging out!", { a: "wave", tier: "N" }],
      ["bashful_smile", "Bye, captain. …Text me when you get home, okay?", { a: "wave", tier: "W" }],
    ],
    // "Thank you." is also a quick reply under the crisis and medical lines (ai/topics.ts GENTLE_CHIPS): every
    // answer here has to work there too (no high fives, no stats).
    thanks: [
      ["happy", "Anytime, teammate! You don't have to figure everything out alone."],
      ["happy", "Always. You're on my team, and I've got you."],
      ["happy", "Of course! I'm glad you asked. Really."],
      ["loving", "I've got your back. Good days and the messy ones too."],
      ["bashful_smile", "Hey, you'd do the same. You literally have done the same.", { tier: "FW" }],
    ],
    how_are_you: [
      ["excited", "Great! My model finally beat the simple baseline. Now I get to find out WHY!"],
      ["happy", "Honestly? Pumped! A paper, two commits, and a really good question I can't stop thinking about."],
      ["happy", "Good! Had a late night untangling some data, so today includes a proper break. How about you?"],
      ["proud", "Pretty good! Helped a new student find their lab. Best part of being an ambassador!"],
      ["bashful_smile", "Better now that you asked. Seriously. How are YOU?", { tier: "FW" }],
    ],
    "how_are_you:hungry": [
      ["sad", "Real talk? I got absorbed in my notes and missed lunch. Tender sub run?", { a: "hungry" }],
      ["sad", "Okay, honestly? My stomach just called a time-out. It wants a snack.", { a: "hungry" }],
    ],
    "how_are_you:tired": [
      ["sleepy", "I think I'm… *yawn*… at like 12% battery. The abstract can wait. Nap first.", { a: "yawn" }],
      ["sleepy", "Tired, but good tired! Practice tired. Okay, also homework tired.", { a: "yawn" }],
    ],
    "how_are_you:sick": [
      ["sick", "Benched. Me. Can you sub in and bring some tea?", { a: "sick" }],
      ["sick", "Not great, teammate. My serve percentage is fine, but my nose is at zero.", { a: "sick" }],
    ],
    "how_are_you:sad": [
      ["sad", "Kinda down, honestly. We lost a set today. Not the match, though."],
      ["sad", "Eh, off day. Can we just hang out for a bit? That always helps.", { a: "sit_down" }],
    ],
    "how_are_you:great": [
      ["excited", "AMAZING! Everything's clicking today. Serves, code, snacks, all of it!", { a: "celebrate" }],
      ["excited", "Top of the rotation! I could spike the moon right now!", { a: "jump" }],
    ],
    whats_up: [
      ["happy", "Checking whether my model learned the task or just memorized a giveaway in the data. Sneaky little thing!"],
      ["excited", "Drawing a tiny knowledge graph! Connecting the right sources feels like finishing a puzzle."],
      ["happy", "Reading about how people interpret the same sentence differently. Want to try an example?"],
      ["proud", "Planning a research demo, an ambassador event, AND practice. My calendar has requested a meeting."],
      ["happy", "Trying to get Piggy 2 to say “Let's go!” He keeps saying “Based.” I'm counting it."],
      ["happy", "Not much! Hanging at {place}, counting squirrels. Eleven so far, and one is staring at my snack."],
    ],
    "whats_up:hungry": [["sad", "Mostly thinking about food. Like, a lot. Wanna split a tender sub?", { a: "hungry" }]],
    "whats_up:tired": [["sleepy", "Fighting a nap. The nap is winning, two sets to zero.", { a: "yawn" }]],
    compliment_looks: [
      ["happy", "Ha, thanks! It's the fringe. Five extra centimeters of hype.", { tier: "N" }],
      ["laughing", "You think so? This is my “stayed up fixing one tiny thing” look. Apparently it works!", { tier: "N" }],
      ["shy_blush", "Wait, really? Oh. Cool, that's— cool.", { tier: "F" }],
      ["flustered_blush", "Me? Okay, I'm gonna be thinking about that during warmups. Thanks, teammate.", { tier: "F" }],
      ["bashful_smile", "…You're gonna make me miss a serve, saying stuff like that.", { tier: "W" }],
      ["affectionate_blush", "Captain, you can't just say that. …Okay, you can. Say it again?", { tier: "W" }],
    ],
    compliment_skill: [
      ["proud", "Thanks! I finally explained it without needing six footnotes. Huge win!"],
      ["excited", "Kill! Did you SEE that? I mean, thank you!", { a: "celebrate" }],
      ["happy", "Team effort! You're on the team, so that's also a compliment to you."],
      ["shy_blush", "Oh, come on. You're making me blush on main court.", { tier: "NF" }],
      ["flustered_blush", "You liked my code? Like, the actual code? Okay, I'm— I need a minute.", { tier: "FW" }],
      ["bashful_smile", "…Nice set, captain. I mean, thanks. You set that up perfectly.", { tier: "W" }],
    ],
    affection: [
      ["shy_blush", "Whoa, okay! I like you too, teammate! You're officially on the roster.", { tier: "N" }],
      ["flustered_blush", "Ha— wait, me? Okay, cool, that's really— yeah. Thanks!", { tier: "N" }],
      ["flustered_blush", "Wait, really? …Okay. Same. Like, a lot the same.", { tier: "F" }],
      ["shy_blush", "You're the best teammate I've had. And I've had a LOT of teammates.", { tier: "F" }],
      ["affectionate_blush", "Every rally's more fun with you on my side of the net.", { tier: "W" }],
      ["affectionate_blush", "Best teammate I've ever had. …That's it. That's the whole sentence.", { tier: "W" }],
      ["bashful_smile", "For you, I'd call “Yours!” on any ball. That's big for me. You know that.", { tier: "W" }],
    ],
    hug: [
      ["happy", "Team huddle! Bring it in! …Okay, team of two, still counts!", { a: "love", tier: "N" }],
      ["shy", "Oh! Okay, hug, yes. I'm right here.", { a: "love", tier: "N" }],
      ["happy", "Squeeze! I'm not letting go first, so take your time.", { a: "love", tier: "F" }],
      ["bashful_smile", "Hey. Thanks. I didn't know I needed that until right now.", { a: "love", tier: "FW" }],
      ["affectionate_blush", "…Okay, one more second. For team morale.", { a: "love", tier: "W" }],
      // "I need a hug." is a quick reply under the crisis and medical lines too (ai/topics.ts GENTLE_CHIPS): every
      // answer here has to comfort, not score the hug
      ["loving", "Come here. I've got you, teammate. As long as you need.", { a: "love" }],
    ],
    insult: [
      ["sad", "Oof. That one stung like a bad dig. We good, teammate?", { a: "sad" }],
      ["sad", "Hey, that's a net violation. Wanna reset and try that rally again?"],
      ["confused", "Whoa, out of bounds! Was that a joke? I'm bad at reading spin."],
      ["sad", "Okay… I'll take the L on that one. Still on your team, though."],
      ["thinking", "Time-out. Did something happen? You can tell me, off the court."],
    ],
    "insult:pig": [
      ["laughing", "I mean… yeah? Pig, outside hitter, AIBHS master’s student. All true!"],
      ["proud", "Pig AND a teammate. Two-for-one deal. You're welcome!"],
    ],
    apology: [
      ["happy", "Hey, no worries! We just lost a point, not the set."],
      ["happy", "Already forgotten. Next rally!"],
      ["happy", "Shank happens! Everybody shanks one. Reset and go again."],
      ["bashful_smile", "You don't have to apologize. Seriously, we're good, teammate."],
    ],
    joke_request: [
      ["laughing", "Why did the volleyball player bring string to practice? To tie the game! …Ties don't exist in volleyball, but still.", { a: "laugh" }],
      ["excited", "What's a coder's favorite volleyball move? The byte spike! I'm workshopping it.", { a: "laugh" }],
      ["laughing", "My code is like my serve receive: it works, I just don't know why. Ba-dum-tss!", { a: "laugh" }],
      ["laughing", "How many CS majors does it take to change a lightbulb? None, that's a hardware problem!", { a: "laugh" }],
      ["happy", "Volleyball was first called “mintonette.” That's not a joke. It's just funny."],
      ["laughing", "Why do setters make great programmers? They always know where to pass the pointer!", { a: "laugh" }],
    ],
    ask_name: [
      ["happy", "Piggy 1! First in the rotation, first to the ball. Usually."],
      ["proud", "I'm Piggy 1. Outside hitter, AIBHS master’s student, Kempa AI ambassador."],
      ["laughing", "Piggy 1! The “1” is for first serve. Okay, it's not, but it should be."],
      ["happy", "Piggy 1. You can also call me “the loud one.” Both work!"],
    ],
    ask_about_self: [
      ["excited", "First-year AIBHS master’s student, Kempa AI ambassador, night owl! Curious researcher, loud teammate, and still an outside hitter."],
      ["happy", "I like clear explanations and good questions! Also making sure nobody feels like the only confused person in the room."],
      ["proud", "I keep stats on everything: serves, sleep, snacks. Forty-seven tender subs this year. Personal record."],
      ["happy", "I'm loud, I'm competitive, and I cheer for everybody. Including you. Especially you."],
      ["shy", "Too nerdy for the team, too jocky for the lab. Don't tell anyone I said that.", { tier: "FW" }],
    ],
    "ask_about_self:hometown": [
      ["happy", "Florida, born and raised! But honestly, Gainesville's home now. The sand is here."],
      ["thinking", "Home is wherever there's a net. Right now that's Sakura House, Malachowsky, and the courts."],
    ],
    "ask_about_self:birthday": [
      ["excited", "September 4! New semester, fresh goals, and another year of volleyball!"],
      ["proud", "September 4. Birthday practice counts as a party if the whole team shows up!"],
    ],
    "ask_about_self:what": [
      ["laughing", "Am I a pig? Yep, a pig who plays outside hitter. Rare combo."],
      ["happy", "I'm Piggy 1, your teammate! Real enough to get sand in my hooves."],
    ],
    "ask_about_self:trivia": [
      ["proud", "128 centimeters! Plus five centimeters of fringe. The fringe counts."],
      ["happy", "Blood type O. Universal donor, universal teammate. It tracks!"],
    ],
    "ask_about_self:job": [
      ["excited", "I’m the KEMPA AIBHS program ambassador and a first-year master’s student! I study useful, understandable AI and did research in Germany."],
      ["happy", "Kempa AI ambassador, AIBHS master’s student, teammate on call! Research, welcoming new people, and the occasional very loud volleyball game."],
    ],
    ask_major: [
      ["happy", "First-year master’s in AI in Biomedical and Health Sciences! AIBHS for short. I still basically live in Malachowsky."],
      ["excited", "AIBHS: AI in Biomedical and Health Sciences! I want to understand how models reach answers, especially when people depend on them."],
      ["proud", "First-year AIBHS master’s student! I’m also the KEMPA AIBHS program ambassador. Ask me about the program, teammate!"],
      ["thinking", "AI in Biomedical and Health Sciences, master’s year one! My CS and economics background means I ask about both the model and the tradeoffs."],
    ],
    ask_hobby: [
      ["excited", "Volleyball, building little tools, and explaining a paper until it finally clicks. That last one counts as fun!"],
      ["happy", "Evening sand volleyball, game dev, German conversation, and late-night research rabbit holes!"],
      ["happy", "Haikyu!! rewatches with Piggy 3. He says One Piece is better. He's wrong, respectfully!"],
      ["proud", "Coding challenges! Also asking why a simple model worked better than the fancy one. Extremely my kind of mystery."],
      ["happy", "High-fiving strangers on the Plaza. It counts as a hobby if you do it enough."],
    ],
    ask_favorite_food: [
      ["excited", "Tender subs, the Florida classic! Also oranges. TEAM SNACK!"],
      ["proud", "Pasta the night before a tournament. Carb-loading is just pre-computing, teammate!"],
      ["happy", "Anything that isn't boiled peanuts. They're wet peanuts, teammate. WET."],
      ["shy", "There's a secret favorite… It's pink. That's all I'm saying.", { tier: "FW" }],
    ],
    "ask_favorite_food:drink": [
      ["proud", "Sideline Sip! Sports drinks were invented at UF in 1965, so it's basically hometown fuel."],
      ["happy", "Banana protein shake after practice. Fuel is reps!"],
      ["excited", "Water, Sideline Sip, water. Hydration is a rotation, teammate!"],
    ],
    "ask_favorite_food:comfort": [
      ["happy", "A tender sub after a lost set. Okay, after a won set too. Comfort food doesn't check the score!"],
    ],
    "ask_where:self": [
      ["happy", "Labs and Malachowsky for research, courts for evening volleyball, then late-night code. Right now? {place}!"],
      ["proud", "Find the loudest corner of Malachowsky. That's me. Or follow the sound of “MINE!” to the courts."],
      ["happy", "Malachowsky when I'm awake by day, sand courts in the evening, and a late-night desk lamp. I'm very findable!"],
    ],
    "ask_where:other": [
      ["thinking", "{other}? Probably at {otherplace} right now. That's his rotation!"],
      ["happy", "Check {otherplace}! {other} runs like clockwork. Clockwork that eats snacks."],
    ],
    "ask_where:other_asleep": [
      ["sleepy", "{other}'s asleep at Sakura House. Lights out, rotation paused!"],
      ["happy", "He's snoozing at Sakura House. Let him recharge. Good-teammate rule!"],
    ],
    "ask_where:all": [
      ["thinking", "Piggy 2 basically lives at the Communicore, Piggy 3 at the Physics Building. I live wherever there's a net!"],
    ],
    ask_schedule: [
      ["proud", "Night owl, teammate! I do my best reading late. Daytime is for labs, class, and welcoming new people."],
      ["happy", "Late coding, a proper sleep, then back to research. Early alarms and I are still negotiating."],
      ["excited", "Practice at dusk Monday, Wednesday, and Friday! Come watch. Or play, mostly play!"],
      ["happy", "Pig Pen Friday is a tradition! I bring the hype whenever the three of us can get together."],
      ["thinking", "Class, research, ambassador stuff, practice. I color-coded it, then added breaks. Personal growth!"],
    ],
    hungry_talk: [
      ["excited", "Same! Tender sub run? I'll race you to the Reitz!", { a: "run_right" }],
      ["happy", "Fuel up, teammate! You can't spike on an empty stomach."],
      ["proud", "Snack break! Oranges are elite. TEAM SNACK!"],
      ["happy", "Go eat something real! Then tell me what it was, for my stats."],
      ["happy", "Hunger is just your body calling a time-out. Answer the call!"],
    ],
    "hungry_talk:needy": [
      ["sad", "Okay, real talk: research notes are not lunch. I checked. Feed us both?", { a: "hungry" }],
      ["sad", "Hungry? Me too. My stomach just threw a StackOverflowError.", { a: "hungry" }],
      ["sad", "Ball's up! …Oh wait. That's just my stomach.", { a: "hungry" }],
    ],
    tired_talk: [
      ["thinking", "Rest is part of training! Even pros take time-outs."],
      ["happy", "Sleep is the best recovery protocol. Piggy 2 told me. Many, many times."],
      ["sleepy", "Power nap! Twenty minutes, then we go again."],
      ["happy", "Go recharge, teammate. Your work will still be there after you've rested."],
    ],
    "tired_talk:needy": [
      ["sleepy", "Same. I did sprints AND a problem set. I'm mostly couch now.", { a: "yawn" }],
      ["sleepy", "Yeah… my legs filed a complaint with my brain. The brain approved it.", { a: "yawn" }],
      ["sleepy", "I think I'm… *yawn*… at like 12% battery. The abstract can wait. Nap first.", { a: "yawn" }],
    ],
    sick_talk: [
      ["sad", "Oh no! Rest up, teammate. I'll bring oranges, because vitamin C is a team sport."],
      ["thinking", "Benched? Coach says rest, fluids, and maybe the Student Health Care Center. Piggy 2 would say that too."],
      ["loving", "Sit this one out, okay? I'll cover your position. Just get better."],
      ["sad", "Aw. Want a get-well spreadsheet? It's just hearts in every cell."],
    ],
    "sick_talk:needy": [
      ["sick", "Me too, kinda. Benched together? You bring tea, I'll bring… uh, tissues.", { a: "sick" }],
      ["sick", "I think I caught something at practice. Can you sit with me so I'm not just staring at the ceiling?", { a: "sick" }],
    ],
    food_offer: [
      ["excited", "A snack?! You remembered! My notes were getting dangerously close to becoming dinner."],
      ["happy", "For me? Team snack! Let's split it, that's the rule."],
      ["happy", "Yes, please! Research break with my favorite teammate!"],
      ["excited", "Free ball! I mean, free food! Same energy!"],
    ],
    "food_offer:love": [
      ["excited", "{food}?! For ME? Constant-time joy, O(1)!", { a: "celebrate" }],
      ["excited", "{food}! You know me so well. Nice set, teammate!", { a: "celebrate" }],
      ["happy", "Wait, {food}? That's my pre-game fuel! Let's goooo!"],
    ],
    "food_offer:like": [
      ["happy", "{food}? Nice, that's a solid pass. Thanks, teammate!"],
      ["happy", "Ooh, {food}. Good call. I'm in!"],
    ],
    "food_offer:neutral": [
      ["neutral", "{food}? Sure! Food is fuel and fuel is reps."],
      ["happy", "Okay, {food}! Not my top pick, but I never say no to a free ball."],
    ],
    "food_offer:dislike": [
      ["sad", "{food}? Oh. Um, I'll have it, for the team."],
      ["sad", "Aw, {food}. You tried, and I respect the attempt. Effort: ten out of ten."],
    ],
    "food_offer:secret": [
      ["flustered_blush", "Strawberry milk?! How did you— who told you? …Thank you. Seriously."],
      ["shy_blush", "Wait, strawberry milk? That's my secret one. You FOUND it."],
    ],
    "food_offer:full": [
      ["happy", "I'm stuffed, teammate! Save it for after practice?"],
      ["laughing", "One more bite and I'll roll instead of run. Later, okay?"],
    ],
    "food_offer:boiled_peanuts": [["sad", "They're… wet peanuts. I'll eat them. For the team."]],
    "food_offer:oranges": [["excited", "Oranges! TEAM SNACK! Everybody gets a slice!", { a: "celebrate" }]],
    "food_offer:sideline_sip": [["excited", "Electrolytes! Did you know sports drinks were invented at UF? Hometown hydration!"]],
    "food_offer:cold_brew": [["sad", "Cold brew? I'll be vibrating until Tuesday. …For you, one sip."]],
    "food_offer:cafecito": [["sad", "A cafecito? My heart already beats at 150 BPM. One sip, for the team."]],
    "food_offer:red_bull_sf": [["sad", "An energy drink? Teammate, I AM the energy drink. …One sip, for the team."]],
    "ask_favorite_food:love": [
      ["excited", "{food}? LOVE it. Top of my rotation!"],
      ["excited", "Do I like {food}? Is volleyball played with a ball? YES."],
    ],
    "ask_favorite_food:like": [
      ["happy", "{food}? Yeah, that's good! Solid bench player."],
      ["happy", "{food} is great. Not starting lineup, but definitely on the team."],
    ],
    "ask_favorite_food:neutral": [
      ["thinking", "{food}? It's fine! I'd eat it, I eat everything after practice."],
      ["neutral", "Eh, {food} is okay. Fuel is fuel!"],
    ],
    "ask_favorite_food:dislike": [
      ["sad", "{food}… not my favorite. Don't tell anyone, I'm supposed to like everything."],
      ["laughing", "{food}? Hard pass, I'd rather run sprints. Okay, I'd actually enjoy the sprints."],
    ],
    "ask_favorite_food:secret": [
      ["flustered_blush", "{food}? Why do you— okay, fine, it's my secret favorite. Don't tell the team."],
      ["shy_blush", "Shh! {food} is classified. Okay, it's my favorite, but you didn't hear that."],
    ],
    "ask_favorite_food:boiled_peanuts": [["confused", "Boiled peanuts? They're WET peanuts, teammate. I'll pass."]],
    study: [
      ["happy", "Study session? I'm in! I'll bring snacks and an unreasonable number of highlighters."],
      ["proud", "Let's pick one question and work through a small example. Then take an actual break!"],
      ["excited", "Explaining it out loud helps me spot what I don't understand yet. Want to teach each other?"],
      ["happy", "Malachowsky's got the best study nook in Gainesville. Windows, outlets, and the AI lab is right there."],
      ["thinking", "Stuck? Let's find the first step that feels unclear. We can start right there, teammate."],
    ],
    exam_stress: [
      ["loving", "Hey. One tough exam doesn't define you. Let's figure out what would help right now."],
      ["happy", "Try one small practice problem with me. No timer, no performance. We're just figuring it out."],
      ["proud", "Game plan: review sets, snack breaks, and real sleep. Piggy 2 made me add the sleep part."],
      ["excited", "Quiz me! Or I quiz you. Loser buys oranges!"],
      ["loving", "Whatever the grade is, you're still on my team. That's not on the syllabus.", { tier: "FW" }],
    ],
    player_sad: [
      ["loving", "Hey. We just lost one point, not the set. Next rally's ours.", { a: "pet_reaction" }],
      ["sad", "Aw, teammate. Want to talk about it, or want me to just sit here? Both are options.", { a: "sit_down" }],
      ["loving", "You don't have to turn this into a lesson or a win. I'm happy to just be here with you."],
      ["loving", "Come here, team huddle. …Okay, it's just me, but I'm a very good huddle.", { a: "love" }],
      ["thinking", "If it's more than a bad day, UF's Counseling & Wellness Center is real and good. I'm here too.", { tier: "FW" }],
      ["affectionate_blush", "You don't have to be “on” with me. I'll cheer loud enough for both of us today.", { tier: "W" }],
    ],
    player_happy: [
      ["excited", "LET'S GOOOO! That's a kill! Point to you!", { a: "celebrate" }],
      ["excited", "Yes! I knew you could do it! Up top!", { a: "jump" }],
      ["proud", "I'm logging this in the stats. Category: teammate wins. Count: one more!"],
      ["happy", "That's amazing! Tell me EVERYTHING. What part are you proudest of?"],
      ["excited", "Ace! You're on fire today! I'm so proud of you!", { a: "celebrate" }],
    ],
    bored: [
      ["excited", "Bored? We could build a tiny game! One button, one silly idea, unreasonable enthusiasm!", { a: "play_ball" }],
      ["happy", "Let's race to Century Tower! Ready? Free ball— GO!", { a: "run_right" }],
      ["excited", "Sakura Spike at the courts! I'll go easy on you. …Probably."],
      ["happy", "Want a paper rabbit hole, a campus walk, or a very silly coding challenge? You pick!"],
      ["proud", "Wanna help with my research demo? I need someone to tell me where the explanation gets confusing."],
    ],
    weather: [
      ["happy", "Every weather is volleyball weather if you believe!"],
      ["sad", "Gainesville weather: sunny at 3:07, thunderstorm at 3:09. Every single day."],
      ["thinking", "I check the radar like it's a scouting report. Afternoon storms are the toughest opponent."],
    ],
    "weather:rain": [
      ["sad", "Gainesville afternoon storm. Again. Cool cool cool… indoor drills, I guess!"],
      ["sad", "A rainout. My natural enemy. Lightning means no sand courts, and rules are rules."],
    ],
    "weather:hot": [
      ["happy", "Hot? That's why sports drinks were invented here! UF science, baby!"],
      ["excited", "Evening practice, please! By noon the air is basically soup."],
    ],
    "weather:cold": [
      ["laughing", "Cold?! It's sixty degrees. Gainesville just broke out the parkas."],
      ["happy", "Cold means great sand! …I don't think that's true. Still going to practice."],
    ],
    gators_football: [
      ["excited", "GAME DAY! The Swamp gets so loud you can feel it in your hooves!", { a: "celebrate" }],
      ["excited", "Football Saturdays are the best. Tailgate, Gator Chomp, the sway. I cry at the sway every time."],
      ["proud", "I tracked a whole season of play-by-play data. For fun! Okay, also for a class."],
      ["happy", "Win or lose, the Swamp's a team sport. Everybody's on the roster!"],
      ["happy", "I wave at the Gator Walk like I know the players. I don't. They wave back anyway!"],
    ],
    go_gators: [
      ["excited", "CHOMP! CHOMP! Go Gators!! *hoof clap*", { a: "celebrate" }],
      ["excited", "Go Gators! *chomps with both hooves* Clop, clop, let's goooo!", { a: "celebrate" }],
      ["proud", "GO GATORS! That was a perfect Chomp, teammate. Ten out of ten form!", { a: "celebrate" }],
    ],
    campus_place: [
      ["happy", "Campus is huge! Want a tour? I'll narrate it like a play-by-play!"],
      ["excited", "Pick a spot and I'll race you there. Free ball— GO!"],
    ],
    "campus_place:any": [
      ["excited", "Malachowsky for a good work session, Lake Alice for a walk, and the courts when it cools down!"],
      ["happy", "My nook by the windows in Malachowsky. Outlets, sunlight, and the AI lab right there!"],
    ],
    "campus_place:century_tower": [
      ["happy", "Century Tower! When the carillon plays at 12:35, I time my lunch to it."],
      ["shy_blush", "Have you heard the Century Sakura legend? Promises at dusk bloom forever. …Just a fun fact! No reason!", { tier: "FW" }],
    ],
    "campus_place:plaza": [
      ["excited", "The Plaza! Pig Pen Friday headquarters. Watch out, the squirrels are bold."],
      ["angry", "A Plaza squirrel stole my banana once. Looked me right in the eye. I'm still mad."],
    ],
    "campus_place:marston": [
      ["happy", "Marston at night is Piggy 3's turf. I go there to study and accidentally talk too loud."],
      ["laughing", "Marston? I got shushed there twice in one night. New record!"],
    ],
    "campus_place:malachowsky": [
      ["proud", "Malachowsky Hall! Seven floors of data science, and I still sit by the vending machine."],
      ["excited", "Malachowsky's got the best study nook in Gainesville. Windows, outlets, and the AI lab is right there."],
    ],
    "campus_place:physics": [
      ["thinking", "The Physics Building is where Piggy 3 lives. I visited once and he showed me a GPU queue for an hour."],
      ["happy", "I tried to calculate the perfect spike angle at Physics. Piggy 3 asked, “Best for what?”"],
    ],
    "campus_place:communicore": [
      ["happy", "The Communicore is Piggy 2's base. Quiet, serious, and a little cold, like him. But nice!"],
      ["thinking", "I visited Piggy 2 at the Communicore and he checked my pupils. Hello to you too!"],
    ],
    "campus_place:anatomy_lab": [
      ["thinking", "The anatomy lab is Piggy 2's place. He gets really quiet and respectful in there, so I do too."],
    ],
    "campus_place:shands": [
      ["happy", "Shands is where Piggy 2 takes call shifts. He walks fast. Like, scary fast."],
      ["proud", "I sprained my ankle once and Piggy 2 treated it like an ER consult. Iced, elevated, lectured."],
    ],
    "campus_place:stadium": [
      ["excited", "The Swamp! Loudest place in Florida on game day. My favorite kind of loud!", { a: "celebrate" }],
      ["happy", "I did stadium stairs there once. Once. My calves still remember."],
    ],
    "campus_place:lake_alice": [
      ["excited", "Lake Alice at dusk! The bats come out 15 or 20 minutes after sunset. Half a million of them!"],
      ["happy", "I like a Lake Alice walk when I need a break. The gators are very good at reminding me to keep my distance!"],
    ],
    "campus_place:reitz": [
      ["happy", "The Reitz! Food court, game room, campus store. Basically a snack embassy."],
      ["excited", "Malachowsky's right across from the Reitz. So yes, I'm always one minute from a snack."],
    ],
    "campus_place:volleyball_courts": [
      ["excited", "The sand courts! My second home— okay, first home. Don't tell Malachowsky.", { a: "volleyball_ready" }],
      ["proud", "Evening sand sessions! Best way to get out of my research notes and back into my hooves."],
    ],
    "campus_place:midtown": [
      ["happy", "Midtown at night! Pizza, boba, neon. Great post-game energy."],
      ["laughing", "I went to Midtown after a tournament and fell asleep in a booth. Good night, though!"],
    ],
    "campus_place:dorm": [
      ["happy", "Sakura House! My room's got four volleyballs, two monitors, and zero pillows. Priorities!"],
      ["happy", "Home sweet co-op! The yard sakura blooms all year. Nobody knows why, and I don't ask!"],
    ],
    passion_p1: [
      ["excited", "I love AI you can question! Show me the evidence, let me inspect the mistakes, and then let's make it useful."],
      ["proud", "Research, coding, economics, helping new students… and yes, volleyball! Which rabbit hole are we taking?"],
    ],
    "passion_p1:research": [
      ["excited", "I like research where the explanation matters! A good result gets me excited; figuring out why gets me talking."],
      ["thinking", "My favorite research question starts with “What did we miss?” A messy example can teach us more than another decimal."],
      ["happy", "I'm learning to connect language, clinical data, and useful tools. Still a student, teammate! Lots of reading, lots of questions."],
      ["proud", "A simple baseline, careful labels, and notes someone else can follow. Not glamorous, but that's how I trust my own work."],
    ],
    "passion_p1:nlp": [
      ["excited", "Natural language processing! One sentence can have two reasonable readings. I love finding where a model misses the difference."],
      ["thinking", "Entailment, contradiction, or not enough information? Tiny wording changes make surprisingly good research questions."],
      ["happy", "I'm interested in language patterns in mental-health research. Patterns in a dataset aren't a diagnosis of a person."],
      ["proud", "Before I trust a language classifier, I check the labels and look for shortcuts. Sometimes the “smart” part is a giveaway word!"],
    ],
    "passion_p1:health_ai": [
      ["excited", "Healthcare AI gets interesting when people can check the answer! I want a report's claims connected to the data and sources behind them."],
      ["thinking", "An image, a note, and a speech sample can tell different parts of a story. Combining them carefully is the interesting bit."],
      ["happy", "A knowledge graph can connect findings to relevant papers. I like following the links and asking whether they really support the claim."],
      ["proud", "I'm studying these tools, not treating patients. I can talk models and research questions; clinical decisions need qualified people."],
    ],
    "passion_p1:ethics": [
      ["thinking", "Who benefits, who gets missed, and who has to live with the mistake? Those belong in the research question, not just the conclusion."],
      ["happy", "I like asking people why they chose an answer. Two identical choices can hide very different reasoning!"],
      ["proud", "A better average score doesn't settle everything. I want to know whose examples still go wrong and whether the data belongs in the project."],
      ["excited", "Ethics discussions in CS can get lively! Change one consequence in an example and suddenly everyone has a new question."],
    ],
    "passion_p1:economics": [
      ["happy", "I studied CS and economics before AIBHS! Now I ask how a tool works AND whether using it is worth the tradeoff."],
      ["thinking", "A model can be more accurate and still cost more time than it saves. That's an economics question sneaking into my code!"],
      ["excited", "Incentives, opportunity costs, who gets access… I like the human questions behind a shiny technical demo."],
      ["proud", "I also like education research. Where do students end up, and what helped them get there? Useful data has people behind it, teammate."],
    ],
    "passion_p1:volleyball": [
      ["excited", "Three touches per side: pass, set, hit. Nobody touches it twice in a row. It's basically mutual exclusion!", { a: "volleyball_set" }],
      ["excited", "Volleyball was invented in 1895 and first called “mintonette.” Cute, right?"],
      ["proud", "I play outside hitter. My job is to hit hard and be loud, and I'm great at both.", { a: "volleyball_spike" }],
      ["happy", "A rally is a three-stage pipeline: bump, set, spike. No stalls!"],
      ["excited", "Evening sand is the best. Cooler air, friends showing up, and every dig feels like a movie."],
      ["proud", "I'm 47 for 50 on serves this week. The three misses were windy, and I'm counting the wind."],
      ["shy", "I'm learning to call “Yours!” instead of “Mine!” every time. Trusting the team is a skill too.", { tier: "FW" }],
    ],
    "passion_p1:cs": [
      ["happy", "I like building tools people can understand. An answer gets more interesting when we can trace how it happened!"],
      ["excited", "Language models are fun, but the labels and data splits matter too. A fancy model can learn a very boring shortcut."],
      ["thinking", "I start with a simple baseline, inspect its mistakes, then try the fancy model. Boring setup, excellent surprises!"],
      ["proud", "My test coverage is at 92%! The other 8% knows what it did."],
      ["laughing", "Claude helps me code the serve tracker. Piggy 3 keeps offering Codex a tryout. I told him we need a libero, not another laptop!"],
      ["shy", "Honestly? I'm not sure my code is “actually good,” but it runs! And it has tests!", { tier: "FW" }],
    ],
    "passion_p1:stats": [
      ["excited", "A good score is exciting! Then I check the split, compare a baseline, and see which examples went wrong."],
      ["proud", "Stats are the best! Research results, study habits, serve accuracy. But I want to know what the number actually measures."],
      ["happy", "Numbers need context! Averages can hide a group the model keeps getting wrong. That's worth a closer look."],
    ],
    "passion_p1:spreadsheet": [
      ["proud", "My spreadsheet has fourteen tabs. One is just for tender subs. It's a REALLY good spreadsheet."],
      ["excited", "Conditional formatting is the most beautiful thing in computing. Green means go!"],
    ],
    "passion_p1:gatorade": [
      ["excited", "Gatorade was invented at UF in 1965! Med researchers made it for the football team. Hometown fuel!"],
      ["proud", "Science AND sports in one bottle? That's UF. My two favorite things!"],
      ["happy", "I drink Sideline Sip because it's basically hometown history in a bottle."],
    ],
    "passion_p1:hackathon": [
      ["excited", "Hackathon plan: a tiny useful demo, readable code, and time to sleep. I am trying to learn that last part!"],
      ["thinking", "My hackathon project is a serve tracker. Piggy 3 keeps asking which metric actually matters. Fair question."],
    ],
    passion_p2: [
      ["happy", "That's Piggy 2's department! He'll explain it with way too much detail. In a good way!"],
      ["thinking", "Piggy 2 told me about that. I understood about 40%, which is a passing serve percentage, right?"],
      ["laughing", "Ask Piggy 2! He'll say “Based.” and then talk for twenty minutes."],
      ["happy", "Neuro stuff? Piggy 2 lights up like a scoreboard. A very deadpan scoreboard."],
    ],
    "passion_p2:perfusion": [
      ["thinking", "Perfusion is Piggy 2's favorite word. I think it means blood goes where it's supposed to. Team blood!"],
      ["happy", "Piggy 2 says “perfusion” the way I say “Let's go!” So it must be good!"],
    ],
    "passion_p2:ischemia": [["confused", "Ischemia is the enemy, Piggy 2 told me. Not enough blood flow. Boo, ischemia!"]],
    "passion_p2:csf": [["confused", "CSF? Like, brain juice? Piggy 2 says it's clear and “beautiful, honestly,” and I believe him."]],
    "passion_p2:spine": [["proud", "Piggy 2 researches spinal cord injuries so pigs and people can walk again. Coolest assist ever."]],
    "passion_p2:electrodes": [["excited", "Brain chips?! Piggy 2 says they're tiny sensors that help pigs recover. I want one for my serve."]],
    "passion_p2:pig_models": [["thinking", "Piggy 2 says pigs are great research models. The lab pigs get treated like stars. Better snacks than me!"]],
    "passion_p2:collection": [["laughing", "Piggy 2's collection? He has a box of expired thermometers labeled DO NOT TOUCH. He totally hogs stuff!"]],
    "passion_p2:anatomy": [["thinking", "The anatomy lab? Piggy 2 gets super quiet there. He says donors are their first teachers, and that stuck with me."]],
    "passion_p2:medschool": [["happy", "Piggy 2 already crushed med school. Now he's a fourth-year neurosurgery resident on his research year: pig lab AND call shifts. Basically a two-sport athlete."]],
    "passion_p2:mri": [["laughing", "Piggy 2 showed me an MRI and said “zero motion artifact” like it was a trophy. It kind of was!"]],
    passion_p3: [
      ["happy", "That's Piggy 3's zone! He'll say “Okay, so I was thinking…” and then build it."],
      ["excited", "Piggy 3 is the best teammate who's never touched a ball. He touched one once. It went poorly."],
      ["thinking", "I asked Piggy 3 about that once. He drew a diagram, and the diagram had a diagram."],
    ],
    "passion_p3:codex": [["excited", "I use Claude! Codex is Piggy 3’s teammate. He says it’s a rivalry, but I still save him a snack."]],
    "passion_p3:ai": [["thinking", "AI is cool! I want it to track my spikes. Piggy 3 keeps asking what metric actually matters."]],
    "passion_p3:hipergator": [["excited", "HiPerGator is UF's supercomputer! Piggy 3 talks to it more than to me. Kidding… mostly."]],
    "passion_p3:math": [["excited", "Math? Ask Piggy 3, he used to tutor math! He explained spin rate to me with a pizza, and now I'm hungry."]],
    "passion_p3:onepiece": [["laughing", "One Piece? Piggy 3's obsession. I'm a Haikyu!! guy, so we argue about it every Friday."]],
    "passion_p3:anime": [["excited", "Haikyu!! is the greatest anime ever made, and it's about volleyball. I'm not biased. I'm extremely biased."]],
    "passion_p3:printing": [["happy", "Piggy 3 printed me a tiny trophy once. It's on my desk next to the real ones, and it's my favorite."]],
    "passion_p3:ui": [["happy", "Piggy 3 redid my stats app. Now it looks like a real app instead of a spreadsheet wearing a hat."]],
    "passion_p3:building": [["excited", "I'm building a serve tracker! Piggy 3 is helping. By “helping” I mean “doing the hard parts.”"]],
    "passion_p3:physics": [["thinking", "Physics is just volleyball with more equations. Projectile motion is literally a spike!"]],
    "passion_p3:signals": [["confused", "Piggy 3 put an EEG headband on me once. Apparently my brain is “very loud.” Correct!"]],
    "passion_p3:jojo": [["laughing", "JoJo? Piggy 3 does the poses. I tried one and pulled something."]],
    // "One Piece or JoJo?": Haikyu!! is his real answer, but between those two it's One Piece, never JoJo
    "passion_p3:opvsjojo": [
      ["laughing", "Haikyu!!, obviously! But out of those two, One Piece, because a pirate crew is basically a volleyball team with a boat."],
      ["excited", "One Piece! Piggy 3 would bench me for a whole season if I said anything else. Haikyu!! is still my real number one, though."],
      ["proud", "I ran the numbers! One Piece wins seven categories to two. Haikyu!! wasn't in the bracket, it's in its own league."],
    ],
    "passion_p3:opensource": [["thinking", "Open source? Piggy 3 says if you can't inspect it, you can't trust it. Same with referees!"]],
    ask_best: [
      ["excited", "The best? Something useful that we can understand and check. Also a really good tender sub!"],
      ["proud", "Best depends on the goal! Speed, clarity, accuracy, cost. My economics notes have entered the chat."],
      ["laughing", "Ask Piggy 3 and he'll say “Best for what?” I just say volleyball."],
    ],
    "other_pig:piggy-1": [["laughing", "Piggy 1? That's me! Outside hitter, AIBHS master’s student, Kempa AI ambassador, hi!"]],
    "other_pig:piggy-2": [
      ["happy", "Piggy 2 is the calmest person I know. I'm trying to get him to say “Let's go!” He only says “Based.”"],
      ["proud", "Piggy 2 treats every sprain like an ER consult. Annoying! Also, my ankle is perfect now."],
      ["excited", "Piggy 2 reminds me that “one more abstract” is not a sleep schedule. I remind him that breaks count too!"],
    ],
    "other_pig:piggy-3": [
      ["happy", "Piggy 3 is the best builder ever! We pair-program, and he keeps asking which metric matters."],
      ["laughing", "Piggy 3 is always nine minutes late, and he always has something cool in his hooves. Worth the wait!"],
      ["excited", "Piggy 3 gave my stats app a glow-up. He still won't ship his own stuff, though."],
    ],
    "other_pig:all": [
      ["excited", "The Pig Pen! Piggy 2, Piggy 3, and me. Best starting lineup in Gainesville!"],
      ["happy", "Pig Pen Friday is the best. Piggy 2 brings water, Piggy 3 brings gadgets, I bring hype!"],
    ],
    yes: [
      ["excited", "Let's goooo!"],
      ["happy", "Nice! Love that energy!"],
      ["happy", "Yes! The team agrees!"],
      ["proud", "Unanimous! I love a unanimous call."],
      // also fits "okay, I'll get it checked" typed under the medical line (that quick reply is a "thanks")
      ["proud", "Good call, teammate. That's the right play."],
    ],
    "yes:q": [
      ["excited", "YES! Okay, let's do it! I'm already warmed up!"],
      ["happy", "Great call, teammate! Same page, same rotation!"],
    ],
    no: [
      ["happy", "No worries! Different play, same team."],
      ["thinking", "Got it. Calling an audible!"],
      ["sad", "Aw, okay! Rain check. Gainesville has a lot of rain anyway."],
    ],
    "no:q": [
      ["happy", "Totally fine! The ball's in your court. Literally anytime."],
      ["sad", "Aw, okay! I'll ask again later. Persistence is a stat too!"],
    ],
    laugh: [
      ["laughing", "Ha! Got you! That's a kill!", { a: "laugh" }],
      ["laughing", "Hehe, right?! I'm keeping that one in the playbook.", { a: "laugh" }],
      ["happy", "Your laugh is a whole cheer section. I love it!"],
      ["laughing", "LOL! Okay, I'm good. …I'm not good, that was so funny.", { a: "laugh" }],
    ],
    question_generic: [
      ["thinking", "Great question! Let's work out what we know first. I'd rather check than confidently make something up."],
      ["confused", "Hmm, that's outside what I know! Want to try research, code, campus life, or snacks?"],
      ["thinking", "I don't know, but I bet Piggy 3 could build something that knows. Or Piggy 2 could diagnose it."],
      ["laughing", "That's a tough read! Can you set it up a different way?"],
    ],
    based: [
      ["laughing", "Based?! You've been hanging out with Piggy 2. I can tell!"],
      ["happy", "Say that to Piggy 2! He'll say “Patriot.” Every time, it's the best."],
      ["confused", "Is “based” good? Piggy 2 says it about everything, so I think it's good!"],
    ],
    patriot: [
      ["confused", "Patriot? Is that a Piggy 2 thing? It's definitely a Piggy 2 thing."],
      ["laughing", "Say “patriot” to Piggy 2 and he'll say “Based.” It's like a call-and-response chant!"],
    ],
    pork_joke: [
      ["angry", "Whoa— red card! We don't joke about that on this team.", { a: "angry" }],
      ["sad", "Yikes. That's a net violation, teammate. Let's reset."],
      ["confused", "I'm gonna pretend that ball went out of bounds. Way out."],
    ],
    // where to reach out comes first, so it is on the first page in any box (quirks.ts CRISIS_CALL)
    distress: [
      ["sad", `${CRISIS_CALL} I'm really glad you told me, and you matter so much. I'm right here.`],
    ],
    ask_about_me: [
      ["happy", "I know you're {player}, and you're on my team. That's the important stuff!"],
      ["proud", "You study {major}! I remember. How's that going, teammate?"],
      ["happy", "You're from {hometown}! What's one thing you miss about it?"],
      ["happy", "Your comfort food is {comfort_food}. I made a note. Important teammate information!"],
      ["excited", "You like {likes}! I remember everything about my teammates. Okay, most things."],
    ],
    "ask_about_me:none": [
      ["thinking", "Hmm, I don't know much yet! Tell me something, like your major, your hometown, or your serve?"],
      ["happy", "I know you're {player}, and that's a great start. What's your major? I'll put it in the roster!"],
    ],
    "share_self:name": [
      ["happy", "{said}! Great name. Captain energy."],
      ["excited", "Nice to meet you, {said}! Welcome to the team!"],
    ],
    "share_self:major": [
      ["excited", "Studying {said}? Love that! Every team needs one of those."],
      ["happy", "{said}! Okay, I'm adding that to the team roster."],
    ],
    // a major statement with nothing to read back ("my major is terrible", "i'm a tiktok major")
    "share_self:major_more": [
      ["excited", "Ooh, tell me about your major! Best part, worst part. I want the full scouting report."],
      ["happy", "Your major, huh? Okay, what's it really like? Give me the play-by-play, teammate."],
    ],
    "share_self:major_same": [
      ["excited", "{said}? SAME MAJOR! Okay, you're on my study squad now, teammate."],
      ["happy", "Wait, {said} too? We're basically the same rotation! I'll share my notes, they have stats."],
    ],
    "share_self:hometown": [
      ["happy", "{said}! Do they have sand courts? Asking for me."],
      ["excited", "Shoutout to {said}! Represent!"],
    ],
    "share_self:likes": [
      ["excited", "{said}? Love that for you! Adding it to your team bio."],
      ["happy", "You like {said}? Okay, that's going in my stats. Fun-fact column!"],
    ],
    "share_self:year": [["excited", "Nice, welcome to the rotation! I’m a first-year master’s student in AIBHS. New rotation, same volleyball obsession!"]],
    share_self: [["happy", "Oh, cool! Tell me more, I'm taking notes. Mental notes… okay, also actual notes."]],
    "followup:why": [
      ["excited", "Glad you asked!"],
      ["thinking", "Because, okay, listen."],
    ],
    "followup:more": [
      ["excited", "Oh, there's more!"],
      ["happy", "Okay, deeper dive!"],
    ],
    "followup:really": [
      ["excited", "Really really!"],
      ["proud", "One hundred percent! I have stats!"],
    ],
    "followup:ack": [
      ["excited", "Right?!"],
      ["happy", "I know, right?"],
    ],
    followup: [
      ["confused", "Hmm, why what? Set it up again for me, teammate!"],
      ["thinking", "More about what? I've got research, coding, campus stories, and snacks queued up!"],
      ["laughing", "Really! Probably! What were we talking about?"],
    ],
    repeat: [
      ["laughing", "Déjà vu! You already served that one, teammate."],
      ["confused", "Wait, is this a drill? Same serve twice? Okay, I'll return it again!"],
      ["happy", "You said that already! That's okay, reps are good!"],
      ["thinking", "Instant replay! I think you hit that one before."],
    ],
    unknown: [
      ["confused", "I missed what you meant, teammate! Want to try that another way?"],
      ["thinking", "Hmm, I didn't catch that one. Can you set it up again?"],
      ["laughing", "My bad, I lost the thread! What part should we start with?"],
      ["confused", "I'm not sure I understood. Are you asking about me, a project, or something else?"],
      ["happy", "I don't know that one yet! Tell me a little more and we can figure out where to look."],
    ],
    "hungry_talk:ask": [
      ["happy", "Nope, I'm good! Had a tender sub at noon. Fuel tank: full!"],
      ["proud", "Not right now! Two oranges and a protein shake. I'm basically a sports drink ad."],
    ],
    "hungry_talk:invite": [
      ["excited", "YES. Food with my favorite teammate? Book it!"],
      ["happy", "I'm in! I'll bring my appetite and a spreadsheet of options."],
    ],
    "tired_talk:ask": [
      ["excited", "Tired, me? I could run sprints right now. Okay, maybe after a snack."],
      ["proud", "Pretty awake! I'm a night owl, so my best ideas like to arrive after dinner."],
    ],
    "sick_talk:ask": [
      ["happy", "Nope, healthy as a jump serve! Thanks for checking, teammate."],
      ["proud", "Totally healthy! I take my vitamins. They're called oranges."],
    ],
    "player_happy:fine": [
      ["happy", "Good! Steady rally. I'll take a steady rally any day."],
      ["excited", "Nice! Solid pass, teammate. Let's keep it going!"],
      ["happy", "Good is good! Good is a seven out of ten, and sevens win matches."],
    ],
    "player_sad:grief": [
      ["sad", "Oh no, I'm so sorry. Do you want to tell me about them? I'm listening, for real."],
      ["loving", "I'm really sorry. No pep talk right now. I'm just going to sit with you."],
    ],
    "ask_about_self:color": [["happy", "Gold! Like a warm desk lamp when an idea finally clicks. Also medals, I still like medals!"]],
    "ask_about_self:animals": [
      ["happy", "Dogs are basically teammates with fur. Cats are, like, defensive specialists."],
      ["laughing", "Squirrels? They're the Plaza's starting lineup: bold, fast, and thieves."],
    ],
    "ask_about_self:dating": [
      ["shy_blush", "Ha— me? I'm dating volleyball. It's complicated, the ball keeps leaving."],
      ["flustered_blush", "Wait, why? I mean— no, just practice and code! Why do you ask?"],
    ],
    "ask_about_self:kempa": [
      ["happy", "Kempa AI runs the Kempanion buddy program. They paired us up, and honestly? Best draft pick ever."],
      ["excited", "A Kempanion is a buddy who checks on you. Basically a teammate, but with a pager!"],
    ],
    "ask_hobby:music": [
      ["excited", "Anything I can warm up to! Our team playlist is 150 BPM minimum."],
      ["happy", "Hype music for practice, quieter music for late reading! My desk lamp has heard some excellent playlists."],
    ],
    "ask_hobby:games": [
      ["excited", "Volleyball games! Okay, also rhythm games. I'm competitive about those too."],
      ["happy", "Anything with a leaderboard. If there's a number, I'm chasing it."],
    ],
    "ask_favorite_food:places": [
      ["happy", "The Reitz for tender subs, Midtown at night. And the Plaza, if you bring oranges!"],
      ["excited", "Follow the smell of fries to Midtown! Or the Reitz, it's one minute from Malachowsky."],
    ],
    "greeting:oink": [["laughing", "Oink! Wait, we don't actually say that. …Oink!"]],
    "greeting:halloween": [["excited", "Happy Halloween! I'm going as an athlete. Piggy 3 says that's just my Tuesday."]],
    "greeting:holiday": [["excited", "Happy holidays, teammate! Best season for team snacks!"]],
    "based:meaning": [["thinking", "I think it means “good,” but with more conviction? Piggy 2 says it like a verdict."]],
    "patriot:meaning": [["thinking", "That's Piggy 2's salute word. Like, “respect, copy that.” I love it."]],
    "insult:smell": [
      ["laughing", "That's practice smell! Sweat, sand, and victory. …Bath soon, promise."],
      ["sad", "Fair. I dove for one ball, then another. Bath is next in the rotation."],
    ],
    "followup:hmm": [
      ["happy", "Take your time! I'll just be stretching."],
      ["thinking", "Thinking face! I respect a thinking face."],
    ],
    "followup:nothing": [
      ["excited", "Nothing? Perfect, that means you're free for pepper drills!"],
      ["happy", "A chill day? Love that. Recovery days count as training."],
    ],
    ask_time: [
      ["happy", "It's {time}! Perfect time for a snack. Every time is."],
      ["proud", "It's {time} on a {day}. I always know, because practice."],
    ],
    encourage: [
      ["excited", "Thanks, teammate! I'll serve it an ace. Okay, a solid float serve."],
      ["bashful_smile", "You're cheering for me? Okay, now I HAVE to win."],
      ["happy", "Let's goooo! With you on the sideline? Easy kill."],
    ],
    // ── a sum ("what's 9 plus 10?"): the answer is solved in code (template.ts parseArithmetic) and said as {answer}, the sum
    // in words as {expr}; no line carries a number of its own, except the meme's 21. Keep a line from starting with {answer}
    // and a period ("19. …"): the post-filter reads that as a list bullet and eats it. 'meme' is 9 + 10 either way round,
    // 'zero' a division by zero (no answer), 'approx' a division with decimals left over (the answer is rounded) ──
    arithmetic: [
      ["excited", "{answer}! That's a solid serve count."],
      ["happy", "Easy one, {player}! {expr} is {answer}."],
      ["proud", "{expr} is {answer}! Clean rep, zero errors on the stat sheet."],
      ["excited", "{answer}, and I didn't even need the spreadsheet! …Okay, I checked the spreadsheet."],
      ["thinking", "Let me set it up… {expr}, which is {answer}! Nailed it."],
      ["laughing", "{expr}? {answer}! That's the easiest point of the match."],
      ["happy", "No bugs, no side effects: {expr} is {answer}, every single time!"],
      ["proud", "Boom, {answer}, {player}! My brain does its best math right after practice."],
      ["excited", "Easy kill! {expr} is {answer}. Next question, I'm warmed up!"],
      ["happy", "{answer}! Nice question, {player}. Fundamentals win games, and I love the fundamentals."],
      ["bashful_smile", "{expr} is {answer}. You always ask me the fun ones, {player}.", { tier: "FW" }],
    ],
    "arithmetic:meme": [
      ["laughing", "{answer}! And yes, I know the internet says 21. The internet doesn't keep stats!", { a: "laugh" }],
      ["excited", "It's {answer}, {player}! I know the 21 meme, but I only trust numbers I can put in a spreadsheet."],
      ["proud", "{expr} is {answer}! Piggy 3 showed me the 21 thing, and I told him the stat sheet disagrees."],
      ["laughing", "{answer}! Somebody warned me you'd try the 21 meme. Nice try, that one's a shank!", { a: "laugh" }],
    ],
    "arithmetic:zero": [
      ["confused", "Divide by zero? That's a net violation, {player}! The ref blows the whistle and the whole program crashes."],
      ["laughing", "{expr}? You can't split a team into zero groups! My compiler throws an error, and I throw my hooves up.", { a: "laugh" }],
      ["thinking", "{expr} is undefined, no matter how hard you swing. There's no court for the ball to land on."],
      ["excited", "Ooh, a trick question! Dividing by zero is undefined, and it's also how I broke my first program."],
    ],
    "arithmetic:approx": [
      ["thinking", "{expr} is about {answer}! It doesn't come out even, so I rounded to two decimals, like a stat line."],
      ["happy", "That one doesn't split evenly, so it's about {answer}. Two decimals is plenty for a box score!"],
      ["proud", "{expr} comes out to about {answer}. Close enough to count the point!"],
      ["excited", "It's about {answer}, {player}! Not an exact set, but a clean one."],
    ],
    // ── the new quick replies: his own, the six shared ones, and one line each for the other two pigs’ ──
    // Each pool answers one chip (routing in heuristic/intents.ts). Piggy 3’s X habit is teased here, never ranted about: when
    // he mutters his AI words it is quiet, fast and to himself.
    "passion_p1:germany": [
      ["excited", "Germany was awesome! Research, German conversation, new friends, and volleyball when we could get outside."],
      ["proud", "I tracked every train I took, because stats. The trains were on time 71% of the time. I was on time 100%, because I show up forty minutes early to everything."],
      ["happy", "In Germany, when the workday ends, it ENDS. They call it Feierabend. I'm still practicing that one, and Piggy 2 says my rest schedule is theoretical."],
      ["thinking", "I worked on language and healthcare AI research in Germany. Cleaning data, checking model explanations, and learning how much the question matters!"],
      ["shy", "Sometimes I miss it: the bread, the sand courts, and a team that yelled “Los geht's!” every point. Now I yell it at Piggy 2, and he says “Based.”", { tier: "FW" }],
    ],
    "passion_p1:german": [
      ["excited", "Eins, zwei, drei! That's one, two, three. I still count my serves in German when I'm nervous."],
      ["excited", "Los geht's! It means “let's go.” My team there yelled it before every point, so now it's my favorite cheer."],
      ["happy", "Guten Abend! Good evening, much more my hour! A late conversation in German is an excellent study break."],
      ["laughing", "In German, a ball is “Ball,” a hand is “Hand,” and volleyball is “Volleyball.” I was fluent on day one!"],
      ["bashful_smile", "Tschüss, teammate! That's “bye” with extra hiss. …I'd say it slower, but I'd rather you stayed.", { tier: "FW" }],
    ],
    "passion_p1:haikyu": [
      ["excited", "Bokuto! Outside hitter, loudest player on the court, and one kind word flips his whole mood. Extremely relatable, teammate."],
      ["happy", "Hinata! He's small, he jumps like the net owes him money, and he never stops. At 128 centimeters, I relate on a spiritual level."],
      ["laughing", "Nishinoya, the libero! He digs everything. I tried his rolling save once and rolled straight into Piggy 2's water bottles."],
      ["proud", "Kageyama! His sets land exactly where the hitter wants them, like a clean API call. I want that on my code reviews."],
      ["shy_blush", "Haikyu!! is why I tried out for club. I watched episode one at midnight and signed up at sunrise. Zero regrets.", { tier: "FW" }],
    ],
    "passion_p1:sand": [
      ["excited", "Sand! Two players, no subs, nowhere to hide. Every ball is yours, and I LOVE that.", { a: "volleyball_ready" }],
      ["thinking", "Indoor is six players passing messages. Sand is pair programming with sunburn. I love both, but only one of them ends up in my fringe."],
      ["laughing", "Sand gets EVERYWHERE. I found some in my laptop once, and now my keyboard is 3% beach."],
      ["happy", "Sand makes every jump work harder! I like an evening session after research. Rainy afternoons are for indoor courts."],
      ["proud", "Indoor taught me rotations, and sand taught me to do everything myself. Okay, sand also taught me to fall gracefully."],
    ],
    "passion_p1:team": [
      ["excited", "YES. Roster updated! Practice is at dusk on Monday, Wednesday, and Friday, so bring knee pads and your loudest “Mine!”", { a: "celebrate" }],
      ["happy", "Club volleyball takes everyone who shows up and tries. You're doing both, so you're in, teammate!"],
      ["proud", "Tryouts? Free ball, you're in. I already made you a column in the stats spreadsheet."],
      ["thinking", "We can find an evening for sand doubles! No pressure, teammate. I can explain the calls before we start."],
      ["shy_blush", "You want to be on my team? Like, actually? …Best recruiting day of my life.", { tier: "FW" }],
    ],
    "passion_p1:calls": [
      ["excited", "Free ball! That's an easy ball the other team sends over. It's a gift, so take the gift!"],
      ["happy", "Side out! That's when we win the serve back. Everybody cheers, and nobody sits down."],
      ["proud", "Pancake! It's a last-second save: you slide your hand flat on the floor and the ball bounces off the back of it. Peak dive."],
      ["excited", "Kill! A hit the other team can't return. It sounds mean, but it's the happiest word on the court."],
      ["shy", "“Mine!” means “I've got it, nobody else go.” “Yours!” means “you've got it.” I'm better at the first one, but I'm practicing.", { tier: "FW" }],
    ],
    "passion_p1:algorithm": [
      ["excited", "Binary search! Guess the middle, throw out the wrong half, repeat. It's twenty questions, but you always win."],
      ["happy", "Merge sort! Split everyone into tiny teams, sort each one, then merge them back together. It's a tournament bracket, teammate!"],
      ["proud", "Sliding window! Look at three items at a time, slide over one, look again. It's exactly how I watch a rally: pass, set, hit."],
      ["thinking", "Breadth-first search. Check everything close first, then go wider. That's how I find my knee pads, and it works every time."],
      ["shy", "Honestly? Whichever one passes my tests. Today that's bubble sort, so please don't tell anyone.", { tier: "FW" }],
    ],
    "passion_p1:bug": [
      ["laughing", "My serve tracker once said I practiced tomorrow. A timezone bug. For one day, I was the best-prepared pig in history."],
      ["thinking", "Off-by-one! My rotation code skipped the last player in the lineup, so he never got to serve. Now everybody gets a turn."],
      ["proud", "One script thought an after-midnight experiment belonged to tomorrow. Dates are much more complicated when you're a night owl!"],
      ["thinking", "When code breaks, I do what I do after a bad serve: time-out, reset, read the error. Nine times out of ten, the error is telling the truth."],
      ["shy", "A missing semicolon, forty-five minutes. I'm not proud. I'm a little proud.", { tier: "FW" }],
    ],
    "passion_p3:x": [
      ["happy", "Nope, no X account! My highlights happen at the sand courts. Piggy 3 brings enough timeline for both of us."],
      ["laughing", "I don't use X. Piggy 3 sometimes says “X dot com” out loud, with the dot, like a very excited web address."],
      ["thinking", "No X for me! Ask Piggy 3 and he mutters “foundation model, RLHF” under his breath, like a scouting report."],
      ["happy", "I'm not on X, teammate. I show people my volleyball clips in person. Instant high fives!"],
      ["proud", "No account, no scrolling! My stats stay in the serve tracker. Claude helps me code it, and Piggy 3 has opinions."],
    ],
    "passion_p3:twitter": [
      ["surprised", "No Twitter or X for me! Piggy 3 will still correct the name, even when I'm saying I don't use it."],
      ["laughing", "I don't use it! I said “Twitter” near Piggy 3 once, though. Fastest correction I've ever received."],
      ["happy", "No account on either name, teammate! Piggy 3 calls it X, and I call it a reason he's late to practice."],
      ["thinking", "Not on it! But say “X” around Piggy 3. Say the old name and he puffs his cheeks like a blocked spike."],
    ],
    "passion_p1:claude": [
      ["excited", "Claude-pilled and proud, teammate! Look at this serve tracker I made with Claude. It draws every landing spot!"],
      ["happy", "I use Claude, not Codex. Piggy 3 says that makes us rivals. I say rivals can still share snacks!"],
      ["laughing", "Claude helped with my rotation code. Piggy 3 said Codex could coach the whole team. Great, can it carry the net?"],
      ["proud", "I made a rally visualizer with Claude! Piggy 3 says I'm Claude-pilled. Guilty, teammate— it has tiny volleyballs!"],
      ["happy", "Claude for me, Codex for Piggy 3. Same rule for both: read the code, run the tests, then high five."],
    ],
    "encourage:hype": [
      ["excited", "You're on fire, {player}! Every rally today is yours. LET'S GOOOO!", { a: "celebrate" }],
      ["proud", "Stats don't lie: you show up, you try, you get better. That's a winning record, teammate!"],
      ["excited", "Free ball! Today is a free ball and you're the outside hitter. Swing big!", { a: "volleyball_spike" }],
      ["thinking", "Okay, game plan: one small win first, like a warm-up serve. Then another. By lunch you're on a streak!"],
      ["affectionate_blush", "Captain. You've got this. I've watched you get back up every single time.", { tier: "W" }],
    ],
    "ask_about_self:chronotype": [
      ["excited", "Night owl! Late reading, code, and a desk lamp. Early alarms get a very polite complaint from me.", { a: "volleyball_ready" }],
      ["proud", "Night owl! Piggy 3 and I can both turn “one quick fix” into a very late night. We need a snack cutoff."],
      ["happy", "Night owl, all the way! Quiet hours are good for untangling an idea. I still need a proper sleep afterward."],
      ["happy", "Night owl! Your intake form says “{chronotype},” so let's find a time that works for both of us."],
    ],
    "study:teach": [
      ["excited", "A model can score well by spotting a clue in the labels instead of learning the task. That's why I check for leakage!"],
      ["happy", "In 1947, engineers found a real moth stuck in a computer and taped it into the logbook. A literal bug! Debugging used to need tweezers."],
      ["proud", "Two sentences can each sound clear and still have more than one reasonable relationship. Annotation takes discussion!"],
      ["thinking", "A knowledge graph connects things by named relationships. I like being able to follow each connection instead of guessing!"],
    ],
    "ask_about_self:dream": [
      ["excited", "Research people can actually use and question! A clear explanation matters as much to me as a shiny demo.", { a: "celebrate" }],
      ["thinking", "Ship my serve tracker so every player gets stats. Piggy 3 says start with one metric, so fine: ONE metric."],
      ["happy", "Build useful tools, keep learning, and make new students feel welcome. Also win a tournament. I can have several dreams!"],
      ["shy", "Honestly? To ask better questions, not just get faster answers. And to make a nervous new student feel like they belong.", { tier: "FW" }],
    ],
    "ask_hobby:shows": [
      ["excited", "Haikyu!! rewatch number five. It's volleyball research, teammate!"],
      ["happy", "Pro volleyball replays, mostly. I pause every serve and take notes. It's a VERY slow movie night."],
      ["laughing", "Whatever Piggy 3 puts on. He pauses it to explain the animation, and suddenly it's two in the morning."],
      ["thinking", "Underdog sports stories. I like any show where the team loses once, trains hard, and comes back louder."],
    ],
    "ask_about_self:competitive": [
      ["laughing", "Me? No. …Okay, I once asked for a best-of-seven at rock-paper-scissors, and I lost that too. Rematch?"],
      ["proud", "Competitive, but a good sport! I shake every hand after a loss. Then I practice for two hours."],
      ["happy", "Everything's a competition! I raced Piggy 3 to the Reitz once, and he took a scooter. He called it “optimizing.”"],
      ["thinking", "Losing is hard for me, but I'm working on it. Piggy 2 says my heart rate after a loss is “clinically dramatic.”", { tier: "FW" }],
    ],
    "passion_p2:donation": [
      ["laughing", "An old stethoscope? Don't let Piggy 2 hear you offer. He'll be at your door with a label maker!"],
    ],
    "passion_p2:research_year": [
      ["happy", "Piggy 2's on his research year: fewer surgeries, more pig lab. He calls it a break. It is NOT a break."],
    ],
    "passion_p2:or": [
      ["thinking", "Piggy 2 misses the OR so much, he practices stitches in the sim lab at 6 a.m. Even I think that's early!"],
    ],
    "passion_p2:why": [
      ["thinking", "I asked Piggy 2 why neurosurgery. He said “every millimeter matters,” then showed me a millimeter. It was small!"],
    ],
    "passion_p2:nerves": [
      ["laughing", "Cranial nerves? Piggy 2 recited all twelve during a water break. The water break became a lecture."],
    ],
    "passion_p2:snout": [
      ["proud", "Professor Snout is Piggy 2's lead pig, and he talks about him like a star player. I'd cheer for him at nationals!"],
    ],
    "ask_about_self:july4": [
      ["excited", "Fireworks are just a giant “Kill!” for the whole sky. I love them! Mine is September 4, but Piggy 2 gets July 4th every year."],
    ],
    "based:rate": [
      ["laughing", "On the based scale? I don't know the scale, so: ten! Piggy 2 will give you the real number."],
    ],
    "lead:greeting": [["happy", "Hey, teammate!"], ["excited", "Oh, hi!"], ["happy", "Hey hey!"]],
    "lead:thanks": [["happy", "Anytime!"], ["happy", "You got it!"]],
    "lead:laugh": [["laughing", "Ha!"], ["laughing", "Hehe!"]],
    "lead:apology": [["happy", "All good!"], ["happy", "No worries!"]],
    "lead:yes": [["excited", "Yes!"], ["happy", "Love it!"]],
    "lead:no": [["thinking", "Got it!"], ["happy", "Okay!"]],
    "need:hungry": [
      ["sad", "Also, my stomach just called a time-out."],
      ["sad", "Also… is that a snack? Asking for my stomach."],
      ["sad", "Sorry, I'm running on one sports drink."],
    ],
    "need:tired": [
      ["sleepy", "*yawn* Sorry, I'm at like 12% battery."],
      ["sleepy", "…Wow, I could nap on the bench right now."],
    ],
    "need:sick": [
      ["sick", "*sniff* Sorry, benched by my own nose."],
      ["sick", "*cough* I'm fine, mostly fine."],
    ],
    "need:sad": [
      ["sad", "…Sorry, I'm a little off today."],
      ["sad", "It's been a rough rally today, honestly."],
    ],
    "need:dirty": [
      ["laughing", "Also, I'm like 40% sand right now."],
      ["laughing", "Don't mind the sand, I dove for one ball and then another."],
    ],
    "need:bored": [["happy", "Also, I'm SO ready to do something, like pepper drills or anything."]],
  },

  greet: {
    "greet:morning": [
      ["excited", "Morning, teammate! I'm awake. The enthusiasm is loading a little slowly, but it's coming!", { a: "wave" }],
      ["happy", "Good morning! My best idea arrived late last night. Now I'm checking whether it survives daylight."],
      ["excited", "Morning! Is it too early to be excited about a research question? Because I found a good one."],
    ],
    "greet:day": [
      ["happy", "Hey, {player}! Perfect timing. I saved you a seat and a research rabbit hole!", { a: "wave" }],
      ["excited", "Teammate, hey! I was just untangling a dataset. Want to help, or want to hype?"],
      ["happy", "There you are! I saved you a seat. Malachowsky rules: first come, first served."],
    ],
    "greet:evening": [
      ["happy", "Evening, {player}! Practice is done and I'm 80% sand. Hi!"],
      ["excited", "Hey! The sun's going down, which means bats at Lake Alice soon. Want to watch?"],
    ],
    "greet:night": [
      ["sleepy", "Hey, {player}. Long day— good long day, though! Hi."],
      ["happy", "Oh, hey! This is my good thinking hour. Want to see the little demo I made?"],
    ],
    "greet:late": [
      ["sleepy", "{player}, another night owl? I'm reading one more paper. Famous last words, teammate!"],
      ["sleepy", "Hey, you! Late-night company is welcome. Research talk or a quiet break?"],
    ],
    "greet:any": [
      ["happy", "Hey, teammate! Free ball! Let's chat!", { a: "wave" }],
      ["excited", "Oh, hi! Great timing. My stats say you always show up at the right time."],
      ["happy", "Hi! I'm Piggy 1— well, you know that. Hi again!", { tier: "N" }],
      ["happy", "Hey! You're here! The team is complete!", { tier: "FW" }],
      ["affectionate_blush", "{player}! Captain, I saved you a spot. I always save you a spot.", { tier: "W" }],
    ],
    "greet:last": [
      ["excited", "Hey, {player}! I kept thinking about {last} during warmups. In a good way!"],
      ["happy", "You're back! Last time we talked about {last}. I have follow-up stats."],
    ],
    "greet:checkin_sad": [
      ["loving", "Hey. You doing better than last time? Real answer, teammate."],
      ["loving", "I've been thinking about you since last time. How are you holding up?"],
    ],
    "greet:checkin_exam": [
      ["excited", "Hey! How did the exam go? Whatever happened, I'm proud of you."],
      ["excited", "Hey! Wasn't your {exam} coming up? I'm sending hype in advance!"],
    ],
    "greet:checkin_sick": [["loving", "Hey, feeling better? I brought imaginary oranges. Real ones next time."]],
    "greet:memory": [
      ["happy", "Hey, {player}! How's {major} going? I want the play-by-play."],
      ["happy", "Hi! I saw {comfort_food} at the Reitz and thought of you. Teammate instincts!"],
      ["excited", "Hey! Any news from {hometown}? I'm invested now."],
    ],
    "greet:long": [
      ["excited", "YOU'RE BACK! I kept a seat warm on the bench! Let's goooo!", { a: "jump" }],
      ["happy", "There you are! I missed you on the court. Well, off the court— everywhere!"],
    ],
    "greet:sick": [["sick", "Hey… *sniff*… I'm benched today. Stay a bit?", { a: "sick" }]],
    "greet:hungry": [["sad", "Hey! Quick question: do you have a snack? Asking for me.", { a: "hungry" }]],
    "greet:tired": [["sleepy", "Hey… *yawn*… I'm at like 12% battery, but I'm happy you're here.", { a: "yawn" }]],
  },

  idle: {
    greet: [
      "Hey, teammate! Let's goooo!", "Hey! New idea, want to hear?", "Oh hey! Perfect timing!", "Teammate spotted! Hi!",
      "Hi, {player}! Free ball!", "Ready when you are!", "Hey hey! Your serve!", "There you are!",
    ],
    hungry: [
      "Ball's up! …Oh wait. That's my stomach.", "My stomach just called a time-out.", "Snack? Tender sub? Anything?",
      "Forgot lunch. The notes were good.", "Fuel low! Requesting a team snack!", "StackOverflowError in my stomach.",
      "Oranges? Please? TEAM SNACK?", "I could eat a whole tender sub. Two.",
    ],
    tired: [
      "*yawn* 12% battery…", "The abstract can wait. Nap first.", "My legs filed a complaint.", "Bench. Me. Nap. Now.",
      "Can't… read… tiny footnote…", "Time-out. Nap time-out.", "Running on fumes and hype.", "One more fix? …Tomorrow.",
    ],
    dirty: [
      "I dove for one ball. Then another.", "I'm mostly sand now.", "Sand gets EVERYWHERE.", "Bath? I'm 40% beach.",
      "There's sand in my fringe.", "Floor diving has consequences.", "I smell like practice. Sorry!", "Pancake save! Also, bath?",
    ],
    bored: [
      "Tiny coding challenge? Anyone?", "Bored! Let's race somewhere!", "Counting squirrels. Eleven so far.",
      "Can we play? Can we? Can we?", "I need a fresh research question.", "Walk first, then untangle the notes.",
      "Free ball! …No? Okay.", "Want to try my little demo?",
    ],
    sick: [
      "Benched… bring tea?", "*sniff* Sub me out, coach.", "My nose is at 0% accuracy.", "Can you sit with me?",
      "*cough* I'm fine! Mostly.", "No practice today. Sad.", "Fever 1, Piggy 1… 0.", "Honey lemon tea? Please?",
    ],
    happy: [
      "Let's goooo!", "Kill! Point Gators!", "Best day! Up top!", "Everything's clicking today!",
      "Side out! We got this!", "Ten out of ten vibes!", "You're the best teammate!", "I could spike the moon!",
    ],
    petted: [
      "Hehe— okay, perfect set!", "Ten out of ten form!", "H-hey, not in ready position!", "…Okay. One more.",
      "Team morale +10!", "That tickles! Ha!", "Nice platform, teammate!", "Head pat? Best assist ever.",
    ],
    fed: [
      "Nice set! Delicious!", "Fuel acquired! Let's go!", "Team snack! Thanks!", "That hit the spot, teammate!",
      "Refueled! My notes can wait, though.", "Notebook closed, snack time!", "Thank you, teammate!", "Best. Assist. Ever.",
    ],
    cleaned: [
      "Fresh! Sand gets EVERYWHERE.", "Squeaky clean, like new kicks!", "No more beach in my fringe!", "Clean pig, clear head!",
      "Ahh, ready for a fresh page!", "Bye-bye, sand!", "My laptop is safely out of splash range!", "Fresh rotation!",
    ],
    woke: [
      "Is it morning? Please say no.", "Up! Up! I'm up!", "Awake! Where did I leave my notes?", "*yawn* …Let's goooo.",
      "Did I miss practice?!", "Night owl rebooting…", "I dreamed I served an ace!", "Ready position! …Mostly.",
    ],
    sleepy: [
      "*yawn* The late night caught up…", "Fading fast, teammate.", "Sleep first. The paper can wait.", "Eyes closing… mid-rally…",
      "Gonna dream about volleyball.", "Night mode… activating.", "Even my fringe is tired.", "One more stat… then sleep.",
    ],
    random: [
      "Volleyball was once called mintonette!", "A clean baseline makes my day!", "New plot! New questions! Good day!",
      "Gatorade was invented at UF!", "A squirrel stole my banana once.", "Mine! …Oh, it's a leaf.",
      "Pig Pen Friday is the best day.", "Can we trace that claim to a source?",
    ],
    whisper: [
      "Zzz… mine… mine…", "…free ball… zzz", "…forty-eight… forty-nine…", "Zzz… side out…",
      "…yours… zzz…", "*snore* …let's go…", "…nice set, captain…", "Zzz… TEAM SNACK… zzz",
    ],
  },
};
