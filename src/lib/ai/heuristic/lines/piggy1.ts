// Piggy 1 — sunny CS junior, club volleyball outside hitter, hype-man, stat-keeper. Calls you "teammate".
import type { PigLines } from './types';

export const P1: PigLines = {
  chat: {
    greeting: [
      ["excited", "Hey, {player}! Perfect timing. I just finished my 50th serve!", { a: "wave" }],
      ["happy", "Teammate! You found me. Free ball, let's talk!", { a: "wave" }],
      ["excited", "Oh, hi! I was literally about to text you. Great minds, same rotation!"],
      ["happy", "Hey hey! You, me, {place}. The starting lineup looks good."],
      ["happy", "Hey! Nice to see you on the court— well, off the court. You know what I mean!", { tier: "NF" }],
      ["bashful_smile", "Hey, {player}. …Okay, today just got way better. Don't tell my stats spreadsheet.", { tier: "W" }],
      ["affectionate_blush", "{player}! Captain, I saved you a spot. I always save you a spot.", { tier: "W" }],
    ],
    farewell: [
      ["happy", "Good rally today. Same time tomorrow?", { a: "wave" }],
      ["excited", "Later, teammate! Hydrate! That's Piggy 2's line, but it's a good line.", { a: "wave" }],
      ["happy", "See ya! I'll be at the sand courts at dawn if you need a hype-man.", { a: "wave" }],
      ["sad", "Aw, already? Okay. Next rally's ours, {player}!", { a: "wave" }],
      ["happy", "Side out! You're free to go. Thanks for hanging out!", { a: "wave", tier: "N" }],
      ["bashful_smile", "Bye, captain. …Text me when you get home, okay?", { a: "wave", tier: "W" }],
    ],
    thanks: [
      ["happy", "Anytime, teammate! That's what the rotation is for."],
      ["proud", "No problem! I'm ten for ten on helping today. Personal record!"],
      ["happy", "Of course! Nobody touches the ball twice in a row, but everybody helps."],
      ["excited", "You got it! Up top! …Okay, hoof five."],
      ["bashful_smile", "Hey, you'd do the same. You literally have done the same.", { tier: "FW" }],
    ],
    how_are_you: [
      ["excited", "Great! I'm 9 for 10 on serves today, and the tenth one hit a squirrel. He's fine, just mad."],
      ["happy", "Honestly? Pumped: two commits and a sand session before 9. Let's goooo!"],
      ["happy", "Good! Little sore from practice, but sore means progress. How about you, teammate?"],
      ["proud", "I'm like a perfect set: right where I need to be. Okay, that was corny, but true!"],
      ["bashful_smile", "Better now that you asked. Seriously. How are YOU?", { tier: "FW" }],
    ],
    "how_are_you:hungry": [
      ["sad", "Real talk? I've been running on one sports drink since 6 a.m. Tender sub run?", { a: "hungry" }],
      ["sad", "Okay, honestly? My stomach just called a time-out. It wants a snack.", { a: "hungry" }],
    ],
    "how_are_you:tired": [
      ["sleepy", "I think I'm… *yawn*… at like 12% battery. Wake me up for nationals.", { a: "yawn" }],
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
      ["happy", "Debugging a circular queue. It's basically a volleyball rotation, so I'm winning."],
      ["excited", "Just tracked my serves: 87.5% this week! Okay, it's a spreadsheet. A REALLY good spreadsheet."],
      ["happy", "Waiting for practice and pretending to read about hash maps. Wanna pretend with me?"],
      ["proud", "Planning a hackathon project and a tournament at the same time. Totally manageable. Probably."],
      ["happy", "Trying to get Piggy 2 to say “Let's go!” He keeps saying “Based.” I'm counting it."],
      ["happy", "Not much! Hanging at {place}, counting squirrels. Eleven so far, and one is staring at my snack."],
    ],
    "whats_up:hungry": [["sad", "Mostly thinking about food. Like, a lot. Wanna split a tender sub?", { a: "hungry" }]],
    "whats_up:tired": [["sleepy", "Fighting a nap. The nap is winning, two sets to zero.", { a: "yawn" }]],
    compliment_looks: [
      ["happy", "Ha, thanks! It's the fringe. Five extra centimeters of hype.", { tier: "N" }],
      ["laughing", "You think so? I've been diving in sand since 6. This is my “after” look!", { tier: "N" }],
      ["shy_blush", "Wait, really? Oh. Cool, that's— cool.", { tier: "F" }],
      ["flustered_blush", "Me? Okay, I'm gonna be thinking about that during warmups. Thanks, teammate.", { tier: "F" }],
      ["bashful_smile", "…You're gonna make me miss a serve, saying stuff like that.", { tier: "W" }],
      ["affectionate_blush", "Captain, you can't just say that. …Okay, you can. Say it again?", { tier: "W" }],
    ],
    compliment_skill: [
      ["proud", "Thanks! I'm 9 for 10 today, so the data agrees with you!"],
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
      ["shy", "Oh! Okay, hug, yes. I'm great at this.", { a: "love", tier: "N" }],
      ["happy", "Squeeze! That's a ten out of ten hug. Form was perfect.", { a: "love", tier: "F" }],
      ["bashful_smile", "Hey. Thanks. I didn't know I needed that until right now.", { a: "love", tier: "FW" }],
      ["affectionate_blush", "…Okay, one more second. For team morale.", { a: "love", tier: "W" }],
    ],
    insult: [
      ["sad", "Oof. That one stung like a bad dig. We good, teammate?", { a: "sad" }],
      ["sad", "Hey, that's a net violation. Wanna reset and try that rally again?"],
      ["confused", "Whoa, out of bounds! Was that a joke? I'm bad at reading spin."],
      ["sad", "Okay… I'll take the L on that one. Still on your team, though."],
      ["thinking", "Time-out. Did something happen? You can tell me, off the court."],
    ],
    "insult:pig": [
      ["laughing", "I mean… yeah? Pig, outside hitter, CS major. All true!"],
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
      ["proud", "I'm Piggy 1. Outside hitter, CS junior, professional hype-man."],
      ["laughing", "Piggy 1! The “1” is for first serve. Okay, it's not, but it should be."],
      ["happy", "Piggy 1. You can also call me “the loud one.” Both work!"],
    ],
    ask_about_self: [
      ["excited", "CS junior, club volleyball outside hitter, morning person. Basically a sunrise with a laptop!"],
      ["happy", "I think life's a rally. Keep the ball off the floor and set up whoever's open."],
      ["proud", "I keep stats on everything: serves, sleep, snacks. Forty-seven tender subs this year. Personal record."],
      ["happy", "I'm loud, I'm competitive, and I cheer for everybody. Including you. Especially you."],
      ["shy", "Too nerdy for the team, too jocky for the lab. Don't tell anyone I said that.", { tier: "FW" }],
    ],
    "ask_about_self:hometown": [
      ["happy", "Florida, born and raised! But honestly, Gainesville's home now. The sand is here."],
      ["thinking", "Home is wherever there's a net. Right now that's Sakura House, Malachowsky, and the courts."],
    ],
    "ask_about_self:birthday": [
      ["excited", "June 21! Longest day of the year. More daylight, more volleyball!"],
      ["proud", "Summer solstice baby, June 21. Maximum practice hours!"],
    ],
    "ask_about_self:what": [
      ["laughing", "Am I a pig? Yep, a pig who plays outside hitter. Rare combo."],
      ["happy", "I'm Piggy 1, your teammate! Real enough to get sand in my hooves."],
    ],
    "ask_about_self:trivia": [
      ["proud", "128 centimeters! Plus five centimeters of fringe. The fringe counts."],
      ["happy", "Blood type O. Universal donor, universal teammate. It tracks!"],
    ],
    ask_major: [
      ["happy", "Computer science, third year! I live in Malachowsky. Not literally… mostly."],
      ["excited", "CS! Algorithms, data structures, and a LOT of volleyball metaphors."],
      ["proud", "CS junior. I'm taking data structures and explaining every one of them with volleyball."],
      ["thinking", "Computer science. Some days I'm sure I'm good at it, and some days the compiler disagrees."],
    ],
    ask_hobby: [
      ["excited", "Volleyball! And coding, and volleyball stats, which is both. Efficiency!"],
      ["happy", "Sunrise sand practice, game dev, and cheering at literally any sport."],
      ["happy", "Haikyu!! rewatches with Piggy 3. He says One Piece is better. He's wrong, respectfully!"],
      ["proud", "Competitive programming! It's like a tournament, but nobody dives into sand."],
      ["happy", "High-fiving strangers on the Plaza. It counts as a hobby if you do it enough."],
    ],
    ask_favorite_food: [
      ["excited", "Tender subs, the Florida classic! Also oranges. TEAM SNACK!"],
      ["happy", "Banana protein shake after practice. Fuel is reps!"],
      ["proud", "Sideline Sip! Sports drinks were invented at UF in 1965, so it's basically hometown fuel."],
      ["happy", "Anything that isn't boiled peanuts. They're wet peanuts, teammate. WET."],
      ["shy", "There's a secret favorite… It's pink. That's all I'm saying.", { tier: "FW" }],
    ],
    "ask_where:self": [
      ["happy", "Malachowsky by day, sand courts at dawn and dusk. Right now? {place}!"],
      ["proud", "Find the loudest corner of Malachowsky. That's me. Or follow the sound of “MINE!” to the courts."],
      ["happy", "Mornings in Malachowsky, lunch on the Plaza, sand courts after. I'm very findable!"],
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
      ["proud", "Dawn: sand courts, Tuesday, Thursday, Saturday. Morning: Malachowsky. Lunch: the Plaza."],
      ["happy", "Bed by 10:30, up at 6:30. I'm a machine. A sleepy machine."],
      ["excited", "Practice at dusk Monday, Wednesday, and Friday! Come watch. Or play, mostly play!"],
      ["happy", "Friday lunch is Pig Pen Friday on the Plaza, all three of us. It's mandatory. I made it mandatory."],
      ["thinking", "Class, practice, homework, repeat. I color-coded it. It's a very rainbow week."],
    ],
    hungry_talk: [
      ["excited", "Same! Tender sub run? I'll race you to the Reitz!", { a: "run_right" }],
      ["happy", "Fuel up, teammate! You can't spike on an empty stomach."],
      ["proud", "Snack break! Oranges are elite. TEAM SNACK!"],
      ["happy", "Go eat something real! Then tell me what it was, for my stats."],
      ["happy", "Hunger is just your body calling a time-out. Answer the call!"],
    ],
    "hungry_talk:needy": [
      ["sad", "Okay, real talk: I've been running on one sports drink since 6 a.m. Feed us both?", { a: "hungry" }],
      ["sad", "Hungry? Me too. My stomach just threw a StackOverflowError.", { a: "hungry" }],
      ["sad", "Ball's up! …Oh wait. That's just my stomach.", { a: "hungry" }],
    ],
    tired_talk: [
      ["thinking", "Rest is part of training! Even pros take time-outs."],
      ["happy", "Sleep is the best recovery protocol. Piggy 2 told me. Many, many times."],
      ["sleepy", "Power nap! Twenty minutes, then we go again."],
      ["happy", "Go recharge, teammate. I need you at full battery for tomorrow's rally!"],
    ],
    "tired_talk:needy": [
      ["sleepy", "Same. I did sprints AND a problem set. I'm mostly couch now.", { a: "yawn" }],
      ["sleepy", "Yeah… my legs filed a complaint with my brain. The brain approved it.", { a: "yawn" }],
      ["sleepy", "I think I'm… *yawn*… at like 12% battery. Wake me up for nationals.", { a: "yawn" }],
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
      ["excited", "A snack?! You're officially my setter. Nice set!"],
      ["happy", "For me? Team snack! Let's split it, that's the rule."],
      ["happy", "Yes, please! Fuel for the next rally!"],
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
      ["proud", "Pro tip: fifty minutes on, ten minutes off. Like sets with a break between."],
      ["excited", "Homework is just practice reps. Rep it out!"],
      ["happy", "Malachowsky's got the best study nook in Gainesville. Windows, outlets, and the AI lab is right there."],
      ["thinking", "Stuck? Break it into rotations, one small problem at a time. Nobody touches the ball twice!"],
    ],
    exam_stress: [
      ["loving", "Hey. We just lost one point, not the set. You've got this."],
      ["happy", "Treat it like a serve receive: breathe, platform, pass. You know more than you think."],
      ["proud", "Game plan: review sets, snack breaks, and real sleep. Piggy 2 made me add the sleep part."],
      ["excited", "Quiz me! Or I quiz you. Loser buys oranges!"],
      ["loving", "Whatever the grade is, you're still on my team. That's not on the syllabus.", { tier: "FW" }],
    ],
    player_sad: [
      ["loving", "Hey. We just lost one point, not the set. Next rally's ours.", { a: "pet_reaction" }],
      ["sad", "Aw, teammate. Want to talk about it, or want me to just sit here? Both are options.", { a: "sit_down" }],
      ["loving", "Bad days happen to everyone. Even setters shank sometimes. You're still my teammate."],
      ["loving", "Come here, team huddle. …Okay, it's just me, but I'm a very good huddle.", { a: "love" }],
      ["thinking", "If it's more than a bad day, UF's Counseling & Wellness Center is real and good. I'm here too.", { tier: "FW" }],
      ["affectionate_blush", "You don't have to be “on” with me. I'll cheer loud enough for both of us today.", { tier: "W" }],
    ],
    player_happy: [
      ["excited", "LET'S GOOOO! That's a kill! Point to you!", { a: "celebrate" }],
      ["excited", "Yes! I knew you could do it! Up top!", { a: "jump" }],
      ["proud", "I'm logging this in the stats. Category: teammate wins. Count: one more!"],
      ["happy", "That's amazing! Tell me EVERYTHING. Play by play!"],
      ["excited", "Ace! You're on fire today! I'm so proud of you!", { a: "celebrate" }],
    ],
    bored: [
      ["excited", "Bored? Pepper drills! I bump, you set, we never stop!", { a: "play_ball" }],
      ["happy", "Let's race to Century Tower! Ready? Free ball— GO!", { a: "run_right" }],
      ["excited", "Sakura Spike at the courts! I'll go easy on you. …Probably."],
      ["happy", "We could count squirrels on the Plaza. I'm at eleven, and it's competitive."],
      ["proud", "Wanna learn a jump serve? Step one: believe. Step two: actually jump."],
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
      ["excited", "That's why I practice at dawn. By noon the air is basically soup!"],
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
      ["excited", "The sand courts at sunrise! Nobody there but me, the birds, and 47 serves."],
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
      ["happy", "Shands is where Piggy 2 does rounds. He walks fast. Like, scary fast."],
      ["proud", "I sprained my ankle once and Piggy 2 treated it like an ER consult. Iced, elevated, lectured."],
    ],
    "campus_place:stadium": [
      ["excited", "The Swamp! Loudest place in Florida on game day. My favorite kind of loud!", { a: "celebrate" }],
      ["happy", "I did stadium stairs there once. Once. My calves still remember."],
    ],
    "campus_place:lake_alice": [
      ["excited", "Lake Alice at dusk! The bats come out 15 or 20 minutes after sunset. Half a million of them!"],
      ["happy", "I jog Lake Alice on Tuesdays and Thursdays. The gators watch, so I run faster."],
    ],
    "campus_place:reitz": [
      ["happy", "The Reitz! Food court, game room, campus store. Basically a snack embassy."],
      ["excited", "Malachowsky's right across from the Reitz. So yes, I'm always one minute from a snack."],
    ],
    "campus_place:volleyball_courts": [
      ["excited", "The sand courts! My second home— okay, first home. Don't tell Malachowsky.", { a: "volleyball_ready" }],
      ["proud", "Sunrise sand sessions are the best part of my day. Come at dawn and I'll save you a court."],
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
      ["excited", "Volleyball and code are the same thing! Roles, rotations, timing, and nobody touches the ball twice."],
      ["proud", "Ask me anything about volleyball or CS. I have stats AND metaphors."],
    ],
    "passion_p1:volleyball": [
      ["excited", "Three touches per side: pass, set, hit. Nobody touches it twice in a row. It's basically mutual exclusion!", { a: "volleyball_set" }],
      ["excited", "Volleyball was invented in 1895 and first called “mintonette.” Cute, right?"],
      ["proud", "I play outside hitter. My job is to hit hard and be loud, and I'm great at both.", { a: "volleyball_spike" }],
      ["happy", "A rally is a three-stage pipeline: bump, set, spike. No stalls!"],
      ["excited", "Sand at sunrise is the best. Cool air, empty courts, and every dig feels like a movie."],
      ["proud", "I'm 47 for 50 on serves this week. The three misses were windy, and I'm counting the wind."],
      ["shy", "I'm learning to call “Yours!” instead of “Mine!” every time. Trusting the team is a skill too.", { tier: "FW" }],
    ],
    "passion_p1:cs": [
      ["happy", "CS is volleyball for your brain! Algorithms are plays, data structures are formations."],
      ["excited", "A rotation is basically round-robin scheduling. Everybody gets a turn to serve!"],
      ["thinking", "A blocked spike is a merge conflict at the net. You reset and go again."],
      ["proud", "My test coverage is at 92%! The other 8% knows what it did."],
      ["shy", "Honestly? I'm not sure my code is “actually good,” but it runs! And it has tests!", { tier: "FW" }],
    ],
    "passion_p1:stats": [
      ["excited", "I wrote a script that tracks my serve accuracy. 87.5% this week!"],
      ["proud", "Stats are the best! Serves, sleep, snacks. If it moves, I track it."],
      ["happy", "Numbers don't lie. Okay, they do if you're bad at Excel, but I'm great at Excel."],
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
      ["excited", "Hackathons are tournaments for code! Twenty-four hours, no sleep, all snacks."],
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
    "passion_p2:anatomy": [["thinking", "The anatomy lab? Piggy 2 gets super quiet there. He says donors are their first teachers, and that stuck with me."]],
    "passion_p2:medschool": [["happy", "Med school sounds intense. Piggy 2 does it AND research. He's basically a two-sport athlete."]],
    "passion_p2:mri": [["laughing", "Piggy 2 showed me an MRI and said “zero motion artifact” like it was a trophy. It kind of was!"]],
    passion_p3: [
      ["happy", "That's Piggy 3's zone! He'll say “Okay, so I was thinking…” and then build it."],
      ["excited", "Piggy 3 is the best teammate who's never touched a ball. He touched one once. It went poorly."],
      ["thinking", "I asked Piggy 3 about that once. He drew a diagram, and the diagram had a diagram."],
    ],
    "passion_p3:codex": [["excited", "Codex? Piggy 3 is ALWAYS building something with it! Ask him, he'll light up like a scoreboard."]],
    "passion_p3:ai": [["thinking", "AI is cool! I want it to track my spikes. Piggy 3 keeps asking what metric actually matters."]],
    "passion_p3:hipergator": [["excited", "HiPerGator is UF's supercomputer! Piggy 3 talks to it more than to me. Kidding… mostly."]],
    "passion_p3:onepiece": [["laughing", "One Piece? Piggy 3's obsession. I'm a Haikyu!! guy, so we argue about it every Friday."]],
    "passion_p3:anime": [["excited", "Haikyu!! is the greatest anime ever made, and it's about volleyball. I'm not biased. I'm extremely biased."]],
    "passion_p3:printing": [["happy", "Piggy 3 printed me a tiny trophy once. It's on my desk next to the real ones, and it's my favorite."]],
    "passion_p3:ui": [["happy", "Piggy 3 redid my stats app. Now it looks like a real app instead of a spreadsheet wearing a hat."]],
    "passion_p3:building": [["excited", "I'm building a serve tracker! Piggy 3 is helping. By “helping” I mean “doing the hard parts.”"]],
    "passion_p3:physics": [["thinking", "Physics is just volleyball with more equations. Projectile motion is literally a spike!"]],
    "passion_p3:signals": [["confused", "Piggy 3 put an EEG headband on me once. Apparently my brain is “very loud.” Correct!"]],
    "passion_p3:jojo": [["laughing", "JoJo? Piggy 3 does the poses. I tried one and pulled something."]],
    "passion_p3:opensource": [["thinking", "Open source? Piggy 3 says if you can't inspect it, you can't trust it. Same with referees!"]],
    ask_best: [
      ["excited", "The best? Volleyball. Next question!"],
      ["proud", "Best is whatever wins the rally. I have stats if you want them."],
      ["laughing", "Ask Piggy 3 and he'll say “Best for what?” I just say volleyball."],
    ],
    "other_pig:piggy-1": [["laughing", "Piggy 1? That's me! Outside hitter, CS junior, hype-man, hi!"]],
    "other_pig:piggy-2": [
      ["happy", "Piggy 2 is the calmest person I know. I'm trying to get him to say “Let's go!” He only says “Based.”"],
      ["proud", "Piggy 2 treats every sprain like an ER consult. Annoying! Also, my ankle is perfect now."],
      ["excited", "Piggy 2 drags me to bed at 10:30, and I drag him to cardio. Fair trade!"],
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
      ["thinking", "Great question! I'll answer it like a serve receive: with enthusiasm and questionable accuracy."],
      ["confused", "Hmm, that one's out of my zone! Ask me about volleyball, code, or snacks!"],
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
    distress: [
      ["sad", "Hey, I'm really glad you told me, and you matter so much. Please reach out right now: call or text 988, or UF's Counseling & Wellness Center. I'm right here with you."],
    ],
    ask_about_me: [
      ["happy", "I know you're {player}, and you're on my team. That's the important stuff!"],
      ["proud", "You study {major}! I remember. I keep stats on my teammates."],
      ["happy", "You're from {hometown}! Do they have sand courts there? Asking for me."],
      ["happy", "Your comfort food is {comfort_food}. It's in the team snack spreadsheet!"],
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
    "share_self:hometown": [
      ["happy", "{said}! Do they have sand courts? Asking for me."],
      ["excited", "Shoutout to {said}! Represent!"],
    ],
    "share_self:likes": [
      ["excited", "{said}? Love that for you! Adding it to your team bio."],
      ["happy", "You like {said}? Okay, that's going in my stats. Fun-fact column!"],
    ],
    "share_self:year": [["excited", "Nice, welcome to the rotation! I'm a junior, so ask me anything. About volleyball, mostly."]],
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
      ["thinking", "More about what? I've got volleyball, code, and snacks queued up!"],
      ["laughing", "Really! Probably! What were we talking about?"],
    ],
    repeat: [
      ["laughing", "Déjà vu! You already served that one, teammate."],
      ["confused", "Wait, is this a drill? Same serve twice? Okay, I'll return it again!"],
      ["happy", "You said that already! That's okay, reps are good!"],
      ["thinking", "Instant replay! I think you hit that one before."],
    ],
    unknown: [
      ["confused", "Whoa, that one went over the net! Try practice, code, or snacks."],
      ["thinking", "Hmm, I didn't catch that one. Can you set it up again?"],
      ["laughing", "Shank, my bad, I missed that! Ask me about volleyball? I'm great at volleyball."],
      ["confused", "That's a weird spin on the ball! Try “How's volleyball?” or “Want a snack?”"],
      ["happy", "No idea, but I support it! Wanna talk volleyball instead?"],
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
      ["proud", "Nope, full battery! Sunrise practice charges me up."],
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
    "ask_about_self:color": [["happy", "Gold! Like sunrise on the sand courts. Also like a gold medal, mostly the medal."]],
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
      ["happy", "Hype music, obviously. If it doesn't make you want to spike something, skip."],
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
      ["excited", "Morning, teammate! Two commits and fifty jump serves already. Your serve!", { a: "wave" }],
      ["happy", "Good morning! Sunrise practice was perfect. Cold sand, empty courts, 47 serves!"],
      ["excited", "Rise and shine! The courts are open and the air isn't soup yet. Let's goooo!"],
    ],
    "greet:day": [
      ["happy", "Hey, {player}! Perfect timing. I just finished my 50th serve.", { a: "wave" }],
      ["excited", "Teammate, hey! I was just debugging a rotation. Want to help, or want to hype?"],
      ["happy", "There you are! I saved you a seat. Malachowsky rules: first come, first served."],
    ],
    "greet:evening": [
      ["happy", "Evening, {player}! Practice is done and I'm 80% sand. Hi!"],
      ["excited", "Hey! The sun's going down, which means bats at Lake Alice soon. Want to watch?"],
    ],
    "greet:night": [
      ["sleepy", "Hey, {player}. Long day— good long day, though! Hi."],
      ["happy", "Oh, hey! I'm winding down, ten-thirty bedtime is sacred. Well, ten-thirty-ish."],
    ],
    "greet:late": [
      ["sleepy", "*yawn* {player}? It's so late. Teammates need sleep. …Okay, five minutes."],
      ["sleepy", "Whoa, it's late. Are you okay? I'm half asleep, but I'm here."],
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
      "Hey, teammate! Let's goooo!", "Morning! Fifty serves done!", "Oh hey! Perfect timing!", "Teammate spotted! Hi!",
      "Hi, {player}! Free ball!", "Ready when you are!", "Hey hey! Your serve!", "There you are!",
    ],
    hungry: [
      "Ball's up! …Oh wait. That's my stomach.", "My stomach just called a time-out.", "Snack? Tender sub? Anything?",
      "Running on one sports drink since 6 a.m.", "Fuel low! Requesting a team snack!", "StackOverflowError in my stomach.",
      "Oranges? Please? TEAM SNACK?", "I could eat a whole tender sub. Two.",
    ],
    tired: [
      "*yawn* 12% battery…", "Wake me up for nationals.", "My legs filed a complaint.", "Bench. Me. Nap. Now.",
      "Can't… spike… too sleepy…", "Time-out. Nap time-out.", "Running on fumes and hype.", "One more set? …Tomorrow.",
    ],
    dirty: [
      "I dove for one ball. Then another.", "I'm mostly sand now.", "Sand gets EVERYWHERE.", "Bath? I'm 40% beach.",
      "There's sand in my fringe.", "Floor diving has consequences.", "I smell like practice. Sorry!", "Pancake save! Also, bath?",
    ],
    bored: [
      "Pepper drills? Anyone? Please?", "Bored! Let's race somewhere!", "Counting squirrels. Eleven so far.",
      "Can we play? Can we? Can we?", "I need a rally. Any rally.", "Sitting still is my weakness.",
      "Free ball! …No? Okay.", "Wanna learn a jump serve?",
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
      "Nice set! Delicious!", "Fuel acquired! Let's go!", "Team snack! Thanks!", "That hit the spot! Kill!",
      "Refueled! Back in rotation!", "Side out for my stomach!", "Thank you, teammate!", "Best. Assist. Ever.",
    ],
    cleaned: [
      "Fresh! Sand gets EVERYWHERE.", "Squeaky clean, like new kicks!", "No more beach in my fringe!", "Clean pig, clean serves!",
      "Ahh, game-day fresh!", "Bye-bye, sand!", "I feel like a new ball!", "Fresh rotation!",
    ],
    woke: [
      "Morning! Is it practice?!", "Up! Up! I'm up!", "Rise and serve!", "*yawn* …Let's goooo.",
      "Did I miss practice?!", "Sunrise mode: on!", "I dreamed I served an ace!", "Ready position! …Mostly.",
    ],
    sleepy: [
      "*yawn* Ten-thirty bedtime…", "Fading fast, teammate.", "Bed soon. Practice at 6:30.", "Eyes closing… mid-rally…",
      "Gonna dream about volleyball.", "Night mode… activating.", "Even my fringe is tired.", "One more stat… then sleep.",
    ],
    random: [
      "Volleyball was once called mintonette!", "A rotation is a round-robin queue!", "47 serves today. New record!",
      "Gatorade was invented at UF!", "A squirrel stole my banana once.", "Mine! …Oh, it's a leaf.",
      "Pig Pen Friday is the best day.", "Code's like a rally: no stalls!",
    ],
    whisper: [
      "Zzz… mine… mine…", "…free ball… zzz", "…forty-eight… forty-nine…", "Zzz… side out…",
      "…yours… zzz…", "*snore* …let's go…", "…nice set, captain…", "Zzz… TEAM SNACK… zzz",
    ],
  },
};
