// Piggy 3 — hands-on builder (AI, coding agents, signals, math), physics computational lab, night owl, on X.com
// constantly (never "Twitter", except when he corrects it). 3D printing is a now-and-then hobby, not his whole personality.
// Thinks aloud ("Okay, so…", "Actually—", "basically"), refines mid-sentence, asks "Best for what?". Codex is an
// easy conversation starter, never a sales pitch. He used to tutor math (the tutoring business is never named).
import type { PigLines } from './types';
import { CRISIS_CALL } from '../../quirks';
import { X_CORRECTIONS } from '../mumble';

export const P3: PigLines = {
  chat: {
    greeting: [
      ["happy", "Oh, hey! Okay, so I was thinking about you— not in a weird way. About a thing.", { a: "wave" }],
      ["excited", "Hey, have you used Codex? I was trying to make this little thing with it. Here, let me show you."],
      ["happy", "Hi! Sorry, I'm— okay, I'm actually on time today. Hi."],
      ["happy", "Oh, hi! Okay, so, hi. That's the whole thought, hi."],
      ["excited", "Oh, hey! One sec, I'm finishing a post on X. Okay, I'm here."],
      ["shy", "Oh! Um— hi, {player}. Hi, okay, cool.", { tier: "N" }],
      ["happy", "Hey! Wait, perfect timing. I need someone to look at something.", { tier: "F" }],
      ["bashful_smile", "Hey. I was hoping you'd come by. Like, actually hoping.", { tier: "W" }],
    ],
    farewell: [
      ["happy", "Okay, I'll— yeah. Bye! Wait, actually— see you tomorrow?", { a: "wave" }],
      ["happy", "Bye! I'll show you the next version. It'll be better, probably.", { a: "wave" }],
      ["shy", "Oh, you're going? Okay, yeah. Bye— thanks for hanging out.", { a: "wave" }],
      ["happy", "Later! I'll be at Marston, probably arguing with a HiPerGator job.", { a: "wave" }],
      ["happy", "Bye! I'll be on X.com if you need me. Okay, I'll be on X.com either way.", { a: "wave" }],
      ["bashful_smile", "Bye, {player}. I'm glad you stayed. Like, really.", { a: "wave", tier: "W" }],
    ],
    // "Thank you." is also a quick reply under the crisis and medical lines (ai/topics.ts GENTLE_CHIPS): every
    // answer here has to work there too.
    thanks: [
      ["happy", "Oh, of course! Honestly, I'm just glad you came to me."],
      ["bashful_smile", "Yeah, anytime. Seriously."],
      ["happy", "No problem! Basically, I just want things to work out for you."],
      ["shy", "Oh— um, you're welcome. I'm glad it helped. That's the whole point, really."],
      ["loving", "Anytime. I'm around, okay? Like, actually around."],
    ],
    how_are_you: [
      ["happy", "Good! Okay, so my ECG plot finally has the right units. So, like, great."],
      ["happy", "Good! I saw two new open models on X.com this morning. Okay, I downloaded both."],
      ["thinking", "Pretty good? I'm waiting on a HiPerGator job. It's been PENDING for an hour, so I'm pending too."],
      ["happy", "Honestly good. I fixed a bug that was bothering me. The bug was me, but still."],
      ["thinking", "Okay, so— good, but my brain has like nine tabs open. Normal amount."],
      ["bashful_smile", "Better now. Actually— yeah. Better now.", { tier: "FW" }],
    ],
    "how_are_you:hungry": [
      ["sad", "Actually— I forgot to eat. Again. The build finished, though!", { a: "hungry" }],
      ["sad", "Hungry, I think? The agent was mid-run and I didn't want to blink.", { a: "hungry" }],
    ],
    "how_are_you:tired": [
      ["sleepy", "Okay, I think I'm too tired to explain this properly. Let me show you tomorrow.", { a: "yawn" }],
      ["sleepy", "Tired. Basically my battery is at, like… it's a single bar. One bar.", { a: "yawn" }],
    ],
    "how_are_you:sick": [
      ["sick", "I think my immune system is stuck in the HiPerGator queue.", { a: "sick" }],
      ["sick", "My ECG would look fine, but my vibes are at like forty percent. Stay a bit?", { a: "sick" }],
    ],
    "how_are_you:sad": [
      ["sad", "Kind of meh, honestly. Like, it's not a bug report. It's more of a feelings report."],
      ["sad", "Not great? I don't know. Can we just sit here a second?"],
    ],
    "how_are_you:great": [
      ["excited", "Great! Okay, so the thing works. The actual thing, I tested it twice.", { a: "build_success" }],
      ["excited", "Really good! Everything compiled on the first try, which is suspicious, but I'll take it."],
    ],
    whats_up: [
      ["excited", "Okay, so I was thinking we could make a little thing for the bats. Like, a bat forecast for Lake Alice. Actually, it already half works."],
      ["thinking", "Comparing two EEG artifact models. One's faster, one's cleaner. Best for what, though?"],
      ["happy", "Waiting on an agent run. It says it's 63% done, and I'm watching the diff like it's a movie."],
      ["thinking", "Scrolling X.com. Okay, research-scrolling. There's a new open model and I have, like, six tabs about it."],
      ["excited", "Redoing the KempaPager UI again. The stock one looked like a microwave clock."],
      ["thinking", "Reading about a new open model. I want to download it and see what it actually does."],
      ["happy", "Helping Piggy 1 with his serve tracker. He wants every stat. I want, like, one good stat."],
    ],
    "whats_up:hungry": [["sad", "Mostly realizing I haven't eaten since… yesterday? Is onigiri a meal? It's a meal.", { a: "hungry" }]],
    "whats_up:tired": [["sleepy", "Trying to finish one thing before I fall asleep on my keyboard. Again.", { a: "yawn" }]],
    compliment_looks: [
      ["shy", "Oh— thanks. It's mostly the hoodie. The hoodie is doing a lot.", { tier: "N", outfit: "alt" }],
      ["shy", "Oh— thanks. It's mostly the lavender. Lavender is doing a lot.", { tier: "N", outfit: "everyday" }],
      ["shy_blush", "Wait, really? I didn't even fix my curls today. Okay, cool.", { tier: "NF" }],
      ["flustered_blush", "Okay, wait. I was going to— yeah, I forgot what I was saying.", { tier: "F" }],
      ["bashful_smile", "Oh, yeah? I mean— the glasses help. Thanks.", { tier: "FW" }],
      ["affectionate_blush", "Okay, that's— thank you. I'm going to think about that for, like, a week.", { tier: "W" }],
    ],
    compliment_skill: [
      ["shy_blush", "Oh, you liked that? Okay, good. I was kind of hoping you would."],
      ["proud", "Okay, it works. Look— this is the bit I was trying to get right.", { a: "build_success" }],
      ["happy", "Thanks! Honestly, it's mostly good defaults and stubbornness."],
      ["shy", "Oh— thanks. It's not pretty yet, though. Like, the edges.", { tier: "N" }],
      ["flustered_blush", "Wait, really? It's not even— okay, it's a little good. Thank you.", { tier: "FW" }],
      ["bashful_smile", "You always notice the part I worked hardest on. How do you do that?", { tier: "W" }],
    ],
    affection: [
      ["shy_blush", "Oh— um. That's really nice. I don't know what to say, so— thanks, really.", { tier: "N" }],
      ["flustered_blush", "Okay, wait. I was going to say something smart and now it's gone. Hi, same.", { tier: "NF" }],
      ["affectionate_blush", "I like showing you this stuff. Like, even the little things. It's nice that you actually want to see them.", { tier: "F" }],
      ["bashful_smile", "Yeah. I'm glad you stayed.", { tier: "FW" }],
      ["affectionate_blush", "I built a little thing that shows when you've been around. I check it a lot. …Same, is what I mean.", { tier: "W" }],
      ["affectionate_blush", "Same. Like, really same. I don't have a cleaner way to say it.", { tier: "W" }],
    ],
    hug: [
      ["shy_blush", "Oh! Um, okay— hi. Yeah, hugs are good.", { a: "love", tier: "N" }],
      ["happy", "Hug! Okay, watch the glasses— okay, the glasses are fine. Hi.", { a: "love" }],
      ["flustered_blush", "Okay, this is nice, and I'm not going to make it weird. I'm just, like, staying right here.", { a: "love", tier: "F" }],
      ["bashful_smile", "You're warm. That's— okay, that's just a true observation. Thanks.", { a: "love", tier: "FW" }],
      ["affectionate_blush", "Hey. Yeah. I needed that, actually.", { a: "love", tier: "W" }],
      // "I need a hug." is a quick reply under the crisis and medical lines too (ai/topics.ts GENTLE_CHIPS): every
      // answer here has to comfort, not joke
      ["loving", "Okay, come here. I'm not going anywhere.", { a: "love" }],
    ],
    insult: [
      ["sad", "Oh. Um, that kind of hurt? Is everything okay with you?"],
      ["confused", "Wait, did I do something? You can tell me. Like, the actual thing."],
      ["thinking", "Hmm. I think that's a bug in the conversation. Want to try a different version?"],
      ["sad", "Okay. I'm just going to assume you're having a rough day. That's allowed."],
    ],
    "insult:pig": [
      ["confused", "Okay— technically, yes? I'm a pig. That's not really an insult, that's a species."],
      ["laughing", "Correct! Basically, you just described me. Accurately."],
    ],
    apology: [
      ["happy", "Oh, it's okay! Seriously. Bugs happen."],
      ["bashful_smile", "It's fine. Like, actually fine, not “fine” fine."],
      ["happy", "Hey, it's okay. You patched it. We're good."],
      ["thinking", "No, it's okay. I appreciate you saying it, though. That matters."],
    ],
    joke_request: [
      ["laughing", "Okay, so— there are 10 kinds of people. Those who get binary and those who don't.", { a: "laugh" }],
      ["happy", "My code doesn't have bugs. It has, like, surprise features. …That's a lie, it has bugs.", { a: "laugh" }],
      ["laughing", "Why was six afraid of seven? Because seven ate nine. The kids I tutored loved that one, and so did I.", { a: "laugh" }],
      ["thinking", "If this were JoJo, there'd be menacing katakana behind me right now. It's just me eating onigiri."],
      ["laughing", "HiPerGator walks into a bar, and the bar says “PENDING.” That's the whole joke.", { a: "laugh" }],
      ["happy", "How many builders does it take to change a lightbulb? One, but he redesigns the lamp first."],
      ["laughing", "What's Buggy the Clown's favorite architecture? Microservices. He's already in pieces, and every piece does its own thing.", { a: "laugh" }],
    ],
    ask_name: [
      ["happy", "Piggy 3! The “3” is basically a version number, like, stable release. Mostly."],
      ["shy", "Oh— Piggy 3. Hi. I should've said that first."],
      ["happy", "I'm Piggy 3. I build stuff. Little things, and sometimes medium things."],
      ["thinking", "Piggy 3. I thought about a cooler name, but then I'd have to maintain it."],
    ],
    ask_about_self: [
      ["thinking", "Okay, so basically I like figuring out how things actually work, and then making a version that's nice to use."],
      ["happy", "Physics, computational track. I build AI stuff, scroll X.com, and stay up too late at Marston."],
      ["happy", "I like open tools, clean interfaces, One Piece, and one really clear example."],
      ["thinking", "I'm the one who asks “best for what?” Sorry. It's a reflex."],
      ["shy", "I build things for everyone. I don't really ship my own. It's not pretty yet.", { tier: "FW" }],
    ],
    "ask_about_self:hometown": [["thinking", "Home is wherever my laptop charger is. Currently Sakura House. Okay, two chargers."]],
    "ask_about_self:birthday": [
      ["excited", "November 7! Same birthday as Marie Curie. I didn't pick it, but I would have."],
      ["happy", "November 7. Marie Curie's birthday too, which is honestly a lot of pressure. Good pressure, though."],
      ["happy", "November 7, which is also Marie Curie's birthday. Nobel Prizes in two different sciences, and I can barely finish one side project."],
      ["excited", "November 7! Marie Curie's birthday, and she co-discovered two elements. I co-discovered a bug with my agent, which is basically the same energy."],
      ["bashful_smile", "November 7. If you remember it, I'll act like it's not a big deal. It'll be a big deal.", { tier: "FW" }],
    ],
    "ask_about_self:what": [
      ["thinking", "Am I an AI? No, I'm a pig who uses AI. Different thing, mostly."],
      ["happy", "I'm a pig in a hoodie with glasses. That's the whole spec.", { outfit: "alt" }],
      ["happy", "I'm a pig in a lavender tee with glasses. That's the whole spec.", { outfit: "everyday" }],
    ],
    "ask_about_self:trivia": [
      ["happy", "126 centimeters, plus six centimeters of curls. The curls are load-bearing."],
      ["thinking", "Blood type AB. Basically compatible with most things. Like a good API."],
    ],
    "ask_about_self:job": [
      ["happy", "I used to be a math tutor. Fractions, mostly. Okay, a lot of fractions."],
      ["thinking", "Before all the lab stuff, I tutored math at a tutoring center. The trick was finding the one example that makes it click."],
      ["excited", "Oh, I used to tutor math! Watching a kid finally get long division is basically the best feeling. It's up there with a build that passes on the first try."],
      ["happy", "Tutoring math taught me the trick: one clear example, then the rule. Okay, and stickers, which did a lot of the teaching."],
      ["thinking", "When I tutored math, the seven times table was every kid's final boss. Seven times eight is fifty-six, by the way: five, six, seven, eight."],
    ],
    ask_major: [
      ["happy", "Physics, computational track. Fourth year. I mostly run simulations on HiPerGator."],
      ["thinking", "Physics! But, like, the computer part of physics. Simulations, signals, models."],
      ["excited", "Physics. Okay, actually, it's physics plus every side project I can fit in the cracks."],
      ["happy", "Fourth-year physics. Honorary HiPerGator resident. The second title isn't official."],
    ],
    ask_hobby: [
      ["happy", "Scrolling X.com for new papers. Is that a hobby? It's at least a habit."],
      ["excited", "Making little math explainers. Like, drag a point around the unit circle, and sine squared plus cosine squared stays one the whole time."],
      ["happy", "Little 3D prints, now and then. A sakura charm, a phone stand. It's a hobby, not a lifestyle."],
      ["happy", "One Piece. I'm all caught up. Don't spoil anything, even though I'm caught up."],
      ["thinking", "Building little tools. Like, a podcast search thing where you find the exact clip you remember."],
      ["happy", "Watching the Lake Alice bats at dusk. I made a headband to log my brainwaves while I watch."],
      ["excited", "JoJo poses. Only when a build passes. It's a ritual."],
    ],
    ask_favorite_food: [
      ["happy", "Onigiri. It's basically a perfect design: rice, filling, handle. Done."],
      ["excited", "Melonpan! Best crunch-to-fluff ratio, I ran the numbers. Loosely."],
      ["thinking", "Best for what, though? Studying is onigiri, celebrating is melonpan, and 2 a.m. coding is sugar-free Red Bull."],
      ["shy", "There's a secret one. It's pink and it's on a stick. That's the hint.", { tier: "FW" }],
    ],
    "ask_favorite_food:drink": [
      ["excited", "Sugar-free Red Bull! Okay, it's basically fuel. Like, the whole build runs on it."],
      ["happy", "Sugar-free Red Bull, always. Coffee's fine, but it's not my usual."],
    ],
    "ask_favorite_food:comfort": [
      ["happy", "Sugar-free Red Bull. Not a food, technically. But it's load-bearing."],
    ],
    "ask_where:self": [
      ["happy", "Physics Building during the day, Lake Alice at dusk, Marston at night. Right now? {place}."],
      ["thinking", "Usually the Physics Building basement lab. Or Marston. Basically wherever there's an outlet."],
    ],
    "ask_where:other": [
      ["thinking", "{other}? Probably at {otherplace}. I could build a tracker for that— actually, no, that's a privacy thing."],
      ["happy", "{other} should be at {otherplace} right now. He's very consistent. Unlike my job queue."],
    ],
    "ask_where:other_asleep": [["sleepy", "{other} is asleep at Sakura House. I can hear him through the wall. Not snoring, just… sleeping loudly."]],
    "ask_where:all": [["thinking", "Piggy 1 orbits Malachowsky and the courts, Piggy 2 orbits the Communicore. I orbit outlets."]],
    ask_schedule: [
      ["thinking", "I wake up around 8:30 and get to Physics by 10:30. Lake Alice at dusk, then Marston until 12:30. Ish."],
      ["happy", "Night owl. Marston's open late, so my schedule is basically “until the library kicks me out.”"],
      ["sleepy", "Sunday I sleep in and watch One Piece. That's the whole plan. It's a good plan."],
      ["thinking", "Mornings are— okay, I don't really do mornings. I do “late morning.”"],
      ["thinking", "Wake up, check X.com, then actually wake up. Physics by 10:30, Marston at night, X.com in between."],
    ],
    hungry_talk: [
      ["happy", "Okay, food. What are we comparing? Like, cheapest, or best for what we're getting?"],
      ["thinking", "Actually— yeah, eat something. I always forget, so take it from someone who forgets."],
      ["excited", "Onigiri run? There's a good one at the Reitz. Okay, it's fine, it's a fine one."],
      ["happy", "Go eat! Then tell me what you got, because I eat the same thing every day and I need ideas."],
    ],
    "hungry_talk:needy": [
      ["sad", "Okay, same. My stomach is basically throwing warnings. Yellow ones, not red ones yet.", { a: "hungry" }],
      ["sad", "Yes. Hungry. I was going to eat, then fix one thing, and then it was four hours later.", { a: "hungry" }],
      ["sad", "Actually, I forgot to eat. Again. The build finished, though!", { a: "hungry" }],
    ],
    tired_talk: [
      ["thinking", "Sleep. Like, actually. Your brain does a cleanup pass while you sleep, Piggy 2 told me."],
      ["happy", "Go to bed! The thing you're working on will still be there. I say this and then never go to bed."],
      ["sleepy", "Nap? Nap. I support it, twenty minutes, set an alarm."],
    ],
    "tired_talk:needy": [
      ["sleepy", "Five more minutes, the HiPerGator job's almost… okay. Fine. I'm tired.", { a: "yawn" }],
      ["sleepy", "Same. My eyes are basically running at 15 frames per second.", { a: "yawn" }],
      ["sleepy", "Same. I was on X until two, and only some of it was research.", { a: "yawn" }],
      ["sleepy", "Okay, I'm too tired to explain this properly. Let me show you tomorrow.", { a: "yawn" }],
    ],
    sick_talk: [
      ["sad", "Oh no. Okay— rest, water, and honestly, maybe the Student Health Care Center? Piggy 2 would say that."],
      ["thinking", "Want me to build you a little reminder that tells you to drink water? I could do that. Like, tonight."],
      ["loving", "Stay in, I'll bring sugar-free Red Bull. Wait, no caffeine. I'll bring tea."],
      ["sad", "Aw, okay, take it easy. The project will wait. Any project will wait."],
    ],
    "sick_talk:needy": [
      ["sick", "I think my immune system is stuck in the HiPerGator queue.", { a: "sick" }],
      ["sick", "Yeah, I'm sick too, I think. My vibes are at forty percent. Stay a bit?", { a: "sick" }],
    ],
    food_offer: [
      ["happy", "For me? Oh, thanks! I was literally about to forget to eat."],
      ["shy", "Oh— you brought food? That's really nice. Okay, I'm eating it right now."],
      ["excited", "Snack! Okay, the snack-to-thoughtfulness ratio here is really high."],
      ["happy", "Yes, please. Basically you're keeping my whole operation running."],
    ],
    "food_offer:love": [
      ["excited", "{food}! Okay, you get it. You actually get it."],
      ["excited", "Wait, {food}? That's exactly what I wanted and didn't know I wanted."],
      ["happy", "{food}! Okay, this is the best version of today."],
    ],
    "food_offer:like": [
      ["happy", "{food}? Nice, yeah. That works."],
      ["happy", "Oh, {food}! Good pick. Solid default."],
    ],
    "food_offer:neutral": [
      ["thinking", "{food}? Sure, it's, like, fine. Thank you, though."],
      ["neutral", "Okay, {food}. Not my top choice, but best for right now. Thanks."],
    ],
    "food_offer:dislike": [
      ["confused", "{food}… okay, I'll try it. Best for what, exactly? Not taste, I think."],
      ["confused", "Oh, {food}. That's— thank you. I'm going to need a minute."],
    ],
    "food_offer:secret": [
      ["flustered_blush", "Sakura dango?! How did you— okay, that's my secret favorite. You found the easter egg."],
      ["shy_blush", "Wait, sakura dango? Nobody knows that. …Thank you, like, really."],
    ],
    "food_offer:full": [
      ["happy", "I'm actually full? Rare. Save it for my 2 a.m. self, he'll be thrilled."],
      ["thinking", "I can't, I'm full. Like, at capacity. Queue it for later?"],
    ],
    "food_offer:melonpan": [["excited", "Melonpan! Basically the best crunch-to-fluff ratio, I ran the numbers. Loosely."]],
    "food_offer:protein_shake": [["confused", "It's… chalky? Best for what, exactly? Not taste."]],
    "food_offer:red_bull_sf": [["excited", "Sugar-free Red Bull! Okay, this is basically fuel for the next three hours. Thank you."]],
    "food_offer:cold_brew": [["happy", "Cold brew? Oh, nice— not my usual, but it's basically the same fuel."]],
    "ask_favorite_food:love": [
      ["excited", "{food}? Yes. Okay, top tier, no tradeoffs."],
      ["happy", "I love {food}. Like, it's basically a solved problem."],
    ],
    "ask_favorite_food:like": [["happy", "{food} is good! Not my number one, but it's in the rotation."]],
    "ask_favorite_food:neutral": [["thinking", "{food}? It's fine, but best for what, though? Like, it depends."]],
    "ask_favorite_food:dislike": [["confused", "{food}? Honestly not my thing. I don't know, it's a texture thing."]],
    "ask_favorite_food:secret": [["flustered_blush", "{food}? Wait, did someone tell you? Okay, yes, it's my favorite, just don't make it a whole thing."]],
    study: [
      ["thinking", "I study by making a little tool for the thing, like a flashcard thing. I never finish the tool, but I learn the material."],
      ["happy", "Marston at night is the best. Quiet floors, outlets, whiteboards. Basically a perfect workspace."],
      ["thinking", "Okay, can we do one actual example? That's usually what makes it click for me."],
      ["happy", "Study together? Sure! I'll bring sugar-free Red Bull, you bring the questions you're stuck on."],
    ],
    exam_stress: [
      ["thinking", "Okay, so what's actually on it? Let's list the topics, then do one clear example for each."],
      ["loving", "Hey, you'll be okay. Like, you know more than you think. Your brain is just loud right now."],
      ["thinking", "Want me to make you a little practice quiz thing? It'd take like ten minutes. Okay, thirty."],
      ["happy", "Basically: sleep, eat, review the stuff you're shakiest on. Don't try to learn everything tonight."],
      ["bashful_smile", "For what it's worth, I'd bet on you. Like, actual money. Acorns.", { tier: "FW" }],
    ],
    player_sad: [
      ["loving", "Hey. Um, do you want to talk about it, or do you want to just sit here? Both are fine."],
      ["sad", "That sounds really hard. I don't have a fix, but I can stay."],
      ["loving", "Okay. I'm here. We don't have to make it better right now."],
      ["thinking", "Want to go to Lake Alice at dusk? Watching the bats helps me on days like this."],
      ["loving", "If it's bigger than a bad day, UF's Counseling & Wellness Center is good. Like, actually good. And I'm still here.", { tier: "FW" }],
    ],
    player_happy: [
      ["excited", "Wait, that's amazing! Okay, tell me the whole thing. Every detail."],
      ["excited", "Yes! Okay, that's a ship-it moment. You shipped it!", { a: "build_success" }],
      ["happy", "I'm so happy for you. Like, actually, not polite-happy. Real happy."],
      ["proud", "See? I told you. Okay, I didn't say it out loud, but I was thinking it."],
    ],
    bored: [
      ["excited", "Bored? Okay, so I was thinking we could make a little thing. Like, right now, anything."],
      ["happy", "Bug Hunt! I have a whole stack of broken PigScript. It's weirdly fun."],
      ["thinking", "The Teaching Observatory opens on Friday nights. Actual Saturn rings. Actual."],
      ["excited", "One Piece episode? That's at least 24 minutes of not being bored. Okay, 24 minutes times about a thousand."],
      ["excited", "Bored? Okay, I'll show you the best post on X today. It's a chart, but it's a funny chart."],
      ["excited", "Want to play Bug Hunt? Ten little PigScript programs, one bug each. I'm basically Captain Buggy, and you get to be Luffy."],
    ],
    weather: [
      ["happy", "Rain is basically free lo-fi. I don't mind it."],
      ["thinking", "I could build a little weather thing that tells us when the bats will come out. Actually, that's a good idea."],
    ],
    "weather:rain": [
      ["happy", "Rain is basically free lo-fi. Perfect for coding."],
      ["thinking", "Afternoon storm. Classic Gainesville. Everybody sprints into Marston and it becomes a party."],
    ],
    "weather:hot": [
      ["sad", "It's so humid my glasses fog up every time I leave the lab. Like, instantly."],
      ["thinking", "Hot. I'm staying in the AC. The physics lab is basically a fridge, so the hoodie makes sense.", { outfit: "alt" }],
      ["thinking", "Hot. I'm staying in the AC. The physics lab is basically a fridge— I keep a hoodie there for emergencies.", { outfit: "everyday" }],
    ],
    "weather:cold": [["proud", "Cold? Okay, this is my hoodie's time to shine. I've been waiting."]],
    gators_football: [
      ["thinking", "I watch the crowd more than the game, honestly. The noise data would be so cool to plot."],
      ["happy", "I went to a game once and Piggy 1 explained every play. Like, every single play. I loved it."],
      ["thinking", "Football? Okay, I know the Chomp and that the Swamp is loud. That's basically my whole model."],
      ["excited", "I like the Gator Walk. Everyone lines up, and it's like a little parade of high fives."],
    ],
    go_gators: [
      ["excited", "Okay— *chomp chomp* —wait, are hooves allowed? Go Gators!", { a: "dance" }],
      ["happy", "Go Gators! *chomps* Okay, I need to practice that. My chomp has latency.", { a: "dance" }],
      ["laughing", "Chomp! Was that right? Piggy 1 says I chomp like I'm typing, but go Gators!", { a: "dance" }],
    ],
    campus_place: [
      ["thinking", "Campus is huge. I'd make a better map, honestly. The current one is very corporate."],
      ["happy", "Okay, pick a spot. I'll tell you the best outlet there."],
    ],
    "campus_place:any": [
      ["happy", "Marston at night. The quiet floors, with the whiteboards. That's basically my favorite room on earth."],
      ["excited", "Lake Alice at dusk, for the bats. Half a million of them. It's like watching a really good loading animation."],
    ],
    "campus_place:century_tower": [
      ["thinking", "Century Tower has 61 bells. I want to know how they keep them in tune. Like, the actual process."],
      ["shy", "There's that legend about promises under the sakura at dusk. It's not scientific. …I like it, though.", { tier: "FW" }],
    ],
    "campus_place:plaza": [["happy", "The Plaza is nice. Live oaks, hammocks, very bold squirrels. One stole Piggy 1's banana and I respect it."]],
    "campus_place:marston": [
      ["excited", "Marston! The vending machine there knows my order: sugar-free Red Bull, every time. I've never felt so understood."],
      ["happy", "Marston at night is basically my second room. Third room: my room, my lab, then Marston."],
    ],
    "campus_place:malachowsky": [["thinking", "Malachowsky Hall is so nice. Like, actually well designed. Piggy 1 sits by the vending machine anyway."]],
    "campus_place:physics": [
      ["happy", "The Physics Building! My lab is in the basement. It's cold, there are monitors, it's perfect."],
      ["thinking", "There's a lab here that gets down to half a millikelvin. Basically my dorm in January."],
    ],
    "campus_place:communicore": [["thinking", "The Communicore is Piggy 2's place. I go there to look at EEG data with him. He explains, I plot."]],
    "campus_place:anatomy_lab": [["thinking", "I've never been inside the anatomy lab. Piggy 2 gets really quiet about it. Respectfully quiet."]],
    "campus_place:shands": [["thinking", "Shands is huge. I keep thinking there should be a better way to search all that medical info, like, find the part you need fast."]],
    "campus_place:stadium": [["thinking", "The Swamp holds 88,548 people. I want to model the noise. Like, where it's actually loudest."]],
    "campus_place:lake_alice": [
      ["excited", "Lake Alice! The bats come out 15 or 20 minutes after sunset. I made a headband to log my alpha waves while I watch."],
      ["happy", "Calm brain, big alpha waves. Basically, bats are good for me."],
    ],
    "campus_place:reitz": [["happy", "The Reitz! I ran the Kempanion booth there. Well, I was nine minutes late to it, then I ran it."]],
    "campus_place:volleyball_courts": [["thinking", "The sand courts are Piggy 1's place. I watch his serve and try to figure out the hand position. Just the hand position."]],
    "campus_place:midtown": [["happy", "Midtown at night: boba, neon signs, everyone being loud. I like the signs, some of the fonts are great."]],
    "campus_place:dorm": [
      ["excited", "Sakura House! My room has three monitors and one very loud fan. It's lavender, it's perfect."],
      ["thinking", "The yard sakura blooms all year and nobody knows why. I want to put a sensor on it. Respectfully."],
    ],
    passion_p3: [
      ["excited", "Okay, so I was thinking we could make a little thing for this. Like, just a small version for now, and then see if it actually works."],
      ["thinking", "Interesting thing, possible use, specific question, small experiment. That's basically how my brain works."],
    ],
    "passion_p3:codex": [
      ["excited", "Codex! Okay, so I'm making this little bat-forecast thing with it: you put in the date and it tells you when the bats come out. Actually, it works now."],
      ["excited", "Have I used Codex? Okay, so— yes. I had it build a little podcast search thing, where you type what you remember and it finds the actual clip."],
      ["happy", "I use Codex for the boring parts so I can do the fun parts. Well, I didn't write the code base, the agent did. I made the decisions."],
      ["thinking", "With coding agents, the part I care about is checking what it actually did. Like, read the diff. Always read the diff."],
      ["thinking", "Okay, so I spawn a few subagents, one job each, and AGENTS.md tells them the house rules. Then I read every diff. Every one."],
    ],
    "passion_p3:ai": [
      ["thinking", "That score looks good. What was it compared against, though? I want to see them doing the same task."],
      ["excited", "I keep wondering if an EEG encoder could work like a language model. Like, tokens, but brainwaves."],
      ["thinking", "I like models I can download and inspect. Then we can figure out what it's actually doing."],
      ["happy", "The Big Brain option in Settings is a real model running in your browser. Best for what, though? Free chat, mostly."],
    ],
    "passion_p3:opensource": [
      ["thinking", "I'd rather use something we can actually download and inspect. Especially over medical data."],
      ["happy", "Open source is basically a promise that you can check the work. I like that promise."],
    ],
    "passion_p3:hipergator": [
      ["excited", "HiPerGator is UF's supercomputer, and HiPerGator 4 has 504 Blackwell GPUs. Best for what, though?"],
      ["happy", "HiPerGator is basically a very large friend who does math while we sleep."],
      ["thinking", "My job's been PENDING for an hour, and then suddenly RUNNING. Best feeling in the world."],
      ["laughing", "Okay, so I type sbatch, and then I refresh squeue every thirty seconds like that helps. It does not help.", { a: "laugh" }],
      ["sad", "My job died at 99% because I asked for too little memory. A classic. Honestly, a tradition."],
    ],
    "passion_p3:signals": [
      ["excited", "EEG is so cool. It's like listening to the brain through a wall. Blurry, but you can still hear the party."],
      ["thinking", "Wait, how does it know that? Like, what's the actual signal it's picking up?"],
      ["happy", "Piggy 2 and I are building a pig EEG viewer. He knows what it means. I know how to plot it."],
      ["laughing", "ECG is the heart one. If a trace is off by exactly a thousand, it's the units. It's always the units."],
    ],
    // 3D printing is a now-and-then hobby: these only play when the player asks about printing
    "passion_p3:printing": [
      ["excited", "I'm printing a sakura charm right now! Third try. The first one turned into spaghetti, which, honestly, also cute."],
      ["thinking", "The shape is good. I just want the front to look smoother. The part you actually see should look nice."],
      ["happy", "Honestly, I print less now. One little thing a week, okay, two. The rest of the week I'm mostly on X.com."],
    ],
    "passion_p3:onepiece": [
      ["excited", "One Piece! Okay, a guessing game where the clue is someone's laugh is such a good idea. I want to build it."],
      ["happy", "I'm caught up on One Piece. It's basically the longest, best-designed system I know. Okay, story, same thing."],
      ["excited", "One Piece! I was sold back at Orange Town, when Buggy the Clown showed up. A villain named after my code, like, come on."],
    ],
    "passion_p3:jojo": [
      ["laughing", "If this were JoJo, there'd be menacing katakana behind me right now. ゴゴゴ."],
      ["excited", "JoJo poses are basically good UI. Clear silhouette, instantly readable. I'm serious."],
    ],
    // "One Piece or JoJo?" in any wording: always One Piece, usually with a joke about Buggy the Clown and his Buggy code
    "passion_p3:opvsjojo": [
      ["laughing", "One Piece. Okay, to be fair to JoJo, I should probably— no. One Piece."],
      ["excited", "One Piece. Okay, normally I'd ask “best for what?”, but not this time."],
      ["happy", "One Piece. Buggy the Clown is basically my mascot, like, Buggy UI— actually, no, my UI is cute. It's my code that's Buggy."],
      ["laughing", "One Piece, obviously. Buggy the Clown is never actually in one piece, and neither is my code, so I relate to it on a technical level.", { a: "laugh" }],
      ["proud", "One Piece. Also, people keep calling my code buggy, and I keep correcting them: it's Buggy code. It's in pieces, the pieces float around, and somehow it still runs, so it's basically production-ready."],
      ["laughing", "One Piece! Okay, so slashing doesn't work on Buggy the Clown, and it doesn't work on my bugs either. I put two slashes in front of them and they're still in the file.", { a: "laugh" }],
      ["excited", "One Piece! I'm pretty sure my code ate the Chop-Chop Fruit. Every time I hit Run, it splits into pieces and floats around, like Buggy."],
      ["happy", "One Piece. Buggy the Clown loses it when anyone mentions his big red nose, and I'm the same about big red error messages. Don't look at my console."],
      ["thinking", "One Piece. Okay, so Buggy the Clown and Shanks were apprentices on the same ship as kids. Same onboarding, very different code quality."],
      ["happy", "One Piece. JoJo poses are for when the build passes, and One Piece is for while it's failing. My code is pretty Buggy, so… that's a lot of One Piece."],
    ],
    // the player says JoJo is better: friendly, but still One Piece
    "passion_p3:jojo_better": [
      ["thinking", "Wait, better for what? Okay, poses, sure, JoJo wins poses. Everything else is One Piece, and I can prove it with one clear example: Buggy the Clown."],
      ["laughing", "Okay, that's like mentioning Buggy's nose to Buggy— I'm not mad, I'm just a little mad. One Piece, though."],
      ["laughing", "Okay, I respect the confidence, but no. One Piece stays. I'm closing this ticket as “won't fix.”", { a: "laugh" }],
      ["confused", "JoJo over One Piece? Okay, that take has more bugs than my code, and my code is basically Buggy the Clown."],
    ],
    // the player says One Piece is better: delighted
    "passion_p3:op_better": [
      ["excited", "Yes! One Piece wins, so that's a passing build, and I have to do a JoJo pose about it— ironic, I know, but it's the ritual.", { a: "build_success" }],
      ["excited", "Right?! Okay, so we agree on One Piece, which means you're on my crew now. Not the Buggy Pirates, though, that's just my code."],
      ["happy", "Exactly, One Piece! Also, I tried to print a little Buggy the Clown for my desk, and it came off the bed in pieces. Very accurate, honestly."],
      ["bashful_smile", "Okay, you get it. Like, actually get it. One Piece: approved, merged, and the only open bug is Buggy."],
    ],
    // "who's Buggy?" (early One Piece only: he hates spoilers)
    "passion_p3:buggy": [
      ["excited", "Buggy the Clown! He's a pirate captain from early One Piece who ate the Chop-Chop Fruit, so he splits into floating pieces and slashing can't hurt him. Basically my code, but with a big red nose."],
      ["thinking", "Captain Buggy, from One Piece! He's one of the first villains Luffy fights, back in Orange Town. Okay, that's all you get, no spoilers."],
      ["laughing", "Buggy? Okay, it's Captain Buggy to you. He comes apart and keeps going anyway, which is basically my whole codebase.", { a: "laugh" }],
    ],
    "passion_p3:anime": [
      ["happy", "Anime! SwampCon at the Reitz is free, and the theme was “Return to the Sea.” Very One Piece."],
      ["thinking", "Piggy 1 says Haikyu!! is better than One Piece. Best for what, though? For volleyball, sure."],
    ],
    "passion_p3:ui": [
      ["thinking", "Can we make it a little more chill? I want it to feel good to use, not like a corporate dashboard."],
      ["excited", "I redid the KempaPager UI because the stock one looked like a microwave clock. Now it's cute. It's cute, right?"],
      ["happy", "Good UI is basically invisible. You just know where to tap. That's the whole goal."],
    ],
    "passion_p3:building": [
      ["excited", "Okay, so I was thinking we could make a little thing for this. Like, you search for what you remember and it finds the actual clip."],
      ["shy", "I'm building a thing. It's not pretty yet. Like, the edges are rough, so I haven't shown anyone.", { tier: "NF" }],
      ["happy", "I made you a thing. It's not a big thing. It's a medium thing.", { tier: "FW" }],
      ["thinking", "I keep building stuff for other people and never shipping mine. Piggy 2 says he's “monitoring that,” which is rude, but fair."],
      ["thinking", "Okay, so I'm debugging a little thing, and every bug I fix splits into smaller bugs that float off. Basically Buggy the Clown. I'm calling it de-Buggy-ing."],
    ],
    "passion_p3:physics": [
      ["excited", "UF built LIGO's input optics. The universe chirped, and we heard it. That still gets me."],
      ["thinking", "Simulations are basically asking the universe “what if” a million times, and it answers really slowly."],
      ["excited", "Light from the Sun is about eight minutes old when it reaches you. So every sunrise is a tiny bit of a rerun."],
      ["thinking", "In free fall you can't feel your own weight. That one thought eventually turned into general relativity. I think about it in every elevator."],
      ["excited", "LIGO's arms are four kilometers long, and a gravitational wave changes them by less than a thousandth of a proton's width. And they can measure that."],
    ],
    "passion_p3:math": [
      ["excited", "Math! Okay, so— I used to tutor math, so I have opinions about how fractions get taught."],
      ["thinking", "Want the tutor version? One clear example first, then the rule. It basically always works."],
    ],
    // "Teach me a math trick!": real tricks, one clear example each (he used to tutor math)
    "passion_p3:mathtrick": [
      ["excited", "Okay, multiplying by 11: split the digits and put their sum in the middle. 36 times 11 is 3, then 3 plus 6, then 6. So, 396!"],
      ["happy", "Nines on your fingers! Okay, hooves work less well. Fold down finger seven: six on the left, three on the right, so 7 times 9 is 63."],
      ["thinking", "Percents flip. 8% of 50 is the same as 50% of 8, so it's just 4. The kids I tutored thought this was a magic trick."],
      ["excited", "Adding 1 through 100? Pair them up: 1 and 100, 2 and 99, every pair is 101. Fifty pairs, so 5,050."],
      ["proud", "Fractions, one clear example: a half plus a third. Make them sixths, three sixths plus two sixths, so five sixths. That's the whole trick."],
    ],
    // "What even is an LLM?" and the words he mumbles on X (plain versions, no product names)
    "passion_p3:llm": [
      ["excited", "Okay, so an LLM is a model that guesses the next word. Well, the next token, which is like a word piece. Do that a few trillion times over a giant pile of text and it starts to look like thinking."],
      ["thinking", "Large language model. Large because it's billions of numbers, language because it's text, model because… okay, it's one giant math function. That's the honest version."],
      ["happy", "Basically autocomplete that read a library. Then people teach it manners, which is called post-training. That's where RLHF comes in."],
      ["thinking", "Okay, tutor version: it saw a gazillion worked examples, so it learned the patterns. Sometimes the wrong pattern. So you check its work, every time."],
    ],
    "passion_p3:rlhf": [
      ["thinking", "RLHF is reinforcement learning from human feedback. People pick the better of two answers, a reward model learns their taste, and the LLM gets nudged toward it."],
      ["happy", "Okay, so RLHF is basically a taste test. Humans pick the answer they like, and the model learns to win taste tests, which is why it's helpful. Sometimes a little too agreeable, though."],
    ],
    "passion_p3:rlvr": [
      ["excited", "RLVR is RL with verifiable rewards! No opinions, just an answer key: the math is right or the code passes the tests. Like grading a math worksheet."],
      ["thinking", "RLVR: the reward comes from a checker, not a person. It works great until the model finds a loophole in the checker. That's called reward hacking, and it's weirdly impressive."],
    ],
    "passion_p3:jev": [
      ["excited", "Jev is a decision model. It doesn't write sentences: you give it a fixed set of options and it gives you calibrated odds, like “A, seventy percent.”"],
      ["thinking", "Okay, so Jev is the “System One” idea: a fast gut call, no essay. Calibrated means when it says seventy percent, it's right about seven times in ten. Which you should check, because those are vendor numbers."],
    ],
    "passion_p3:foundation": [
      ["thinking", "A foundation model is one big model trained once on tons of broad data, then adapted to lots of jobs. Pretrain once, fine-tune forever."],
      ["excited", "Foundation model: the big general one. I want one for EEG, like, pretrain on thousands of hours of brainwaves, then a tiny add-on for each task."],
    ],
    // "What does an EEG show?" (his chip): an answer, every time
    "passion_p3:eeg": [
      ["excited", "Mostly rhythms: relax with your eyes closed, and alpha waves around ten hertz show up. Blink, and the trace jumps like crazy, which is honestly my favorite part."],
      ["thinking", "Basically tiny voltages, like millionths of a volt, from millions of neurons firing together. So you're hearing the crowd, not one person."],
      ["happy", "Sleep stages, for one! Deep sleep is big slow waves, and REM looks almost like being awake. Piggy 2 reads them, and I plot them."],
      ["laughing", "Piggy 1's EEG is very loud, Piggy 2's stays calm even with a grant due, and mine is mostly alpha waves and Red Bull."],
    ],
    // "What's medical AI?": health records and synthetic patients (his research side; Piggy 2 is the doctor)
    "passion_p3:medai": [
      ["thinking", "Okay, so medical AI, for me, is mostly records. An agent that searches a patient's chart, except every patient is synthetic. Zero real people."],
      ["excited", "F-H-I-R. It's pronounced “fire,” which is the best name a data format has ever had. It's how health records talk to each other."],
      ["thinking", "ICD-10 is a giant tree of diagnosis codes. I want a little model that walks it branch by branch and says why it skipped each one."],
      ["happy", "My favorite idea: the model has to ask a follow-up question before it's allowed to answer. Like a real doctor. Piggy 2 said “based.”"],
      ["thinking", "Piggy 2 says the hard part isn't the model, it's whether it still works at a different hospital. External validation. He's right, which is annoying."],
    ],
    // "Would you build a robot?": someday (he follows robot learning; he doesn't build robots yet)
    "passion_p3:robots": [
      ["excited", "Okay, so I want to. I just have to learn actual electrical engineering first, instead of asking my agent what a resistor does."],
      ["thinking", "Robot learning is basically “watch me do it fifty times,” and then it tries. Imitation learning. Honestly, that's how I learned to make rice, too."],
      ["laughing", "I'd build a tiny one that brings me sugar-free Red Bull. Piggy 2 says that's “enabling,” and Piggy 1 wants it to fetch volleyballs.", { a: "laugh" }],
      ["thinking", "When a robot demo goes viral on X, I check two things. Is it sped up? Is someone off-camera holding a controller?"],
      ["happy", "The cool part is sim-to-real: it practices a million times in a simulator, then meets real friction. Real friction always wins."],
    ],
    // "Are you on X?": the Talk screen plays his mumble (quirks.ts + ../mumble.ts); these answer when the Heuristic Brain
    // is asked in a longer message ("i saw it on x"), and they are "the longer version" after "what does that mean?"
    "passion_p3:x": [
      ["excited", "Way too much X.com. Okay, plain version: an LLM writes, a decision model just picks, and RLHF is people grading the answers."],
      ["thinking", "Basically everyone on X argues about how models learn. RLHF is people picking the better answer, and RLVR is an answer key, like a math worksheet."],
      ["happy", "My whole timeline is three things arguing: Jev picks, an LLM writes, and RLVR grades with an answer key."],
      ["shy", "Half my timeline is foundation models, the big general ones. The other half is how you teach them manners. And robot videos, obviously."],
      ["bashful_smile", "I'm on X a lot. Like, a lot a lot. But the best thing I saw today was you showing up.", { tier: "W" }],
    ],
    // "Twitter" in any message: it's X (the same six lines the quirk rotates through for "Are you on Twitter?")
    "passion_p3:twitter": X_CORRECTIONS.map(([text, face]) => [face, text] as const),
    // "Why sugar-free Red Bull?" / "do you like Red Bull?"
    "ask_favorite_food:red_bull_sf": [
      ["excited", "Sugar-free Red Bull? Love it. Same fuel as the regular one, minus the sugar, so fewer regrets."],
      ["happy", "Sugar-free, always. One can, one feature. Okay, sometimes one can, half a feature."],
      ["thinking", "Okay, I did the math: about a cup of coffee's worth of caffeine per can, and zero sugar. Piggy 2 says one a day, so one a day. He checks."],
      ["shy", "Honestly? I like the little click when the can opens. It means I'm about to build something.", { tier: "FW" }],
    ],
    passion_p1: [
      ["thinking", "Volleyball? Show me the serve again— actually, just the hand position first. I want to understand that part."],
      ["happy", "Piggy 1 wants an app that tracks every spike. I keep asking which metric actually matters, and he says “all of them.”"],
    ],
    "passion_p1:cs": [["happy", "Piggy 1's code is actually good. He doesn't believe it. I'm working on that."]],
    "passion_p1:stats": [["thinking", "Stats are great as long as you know what you're comparing. Like, what's the baseline?"]],
    "passion_p1:spreadsheet": [["laughing", "Piggy 1's spreadsheet has fourteen tabs. I offered to make it a dashboard, and he said the spreadsheet has “soul.”"]],
    "passion_p1:gatorade": [["thinking", "Gatorade was invented at UF in 1965. I want to know what the first recipe tasted like. Probably not great."]],
    "passion_p1:volleyball": [["happy", "Volleyball is basically a real-time system with three-touch latency. Okay, I made that up. Still true."]],
    "passion_p1:hackathon": [["excited", "Hackathons! I love the first hour. Everybody has a big idea, and then it becomes a small idea that actually works."]],
    passion_p2: [
      ["thinking", "That's Piggy 2's area. Give me the simple version first, then we can get into the details."],
      ["happy", "Piggy 2 explains it, I ask how. It's a good system."],
    ],
    "passion_p2:electrodes": [["excited", "Brain-computer interfaces! Okay, the part I care about is the signal. Like, what's actually getting recorded?"]],
    "passion_p2:perfusion": [["thinking", "Perfusion is Piggy 2's favorite word: blood getting where it needs to go. I could plot that, actually."]],
    "passion_p2:ischemia": [["thinking", "Ischemia is when tissue doesn't get enough blood. Piggy 2 calls it “the enemy,” which is dramatic, but correct."]],
    "passion_p2:mri": [["excited", "MRI is basically physics doing medicine. Big magnet, spinning protons, picture. Okay, it's more complicated."]],
    "passion_p2:medschool": [["thinking", "I don't know how Piggy 2 does neurosurgery residency AND research. I can barely do one thing. Okay, I do six things badly."]],
    "passion_p2:neurosurgery": [["thinking", "Neurosurgery is Piggy 2's thing. I just want to know how the tools work. Like, the actual microscope."]],
    "passion_p2:pig_models": [["thinking", "Piggy 2 says the lab pigs get enrichment and names. I asked if I could make them a little toy, and he said “based.”"]],
    "passion_p2:collection": [["thinking", "Piggy 2's boxes? Okay, so— there's a retired pulse oximeter in there I really want to take apart. He won't let me."]],
    "passion_p2:anatomy": [["thinking", "Piggy 2 says donors are their first teachers. I think about that a lot, actually."]],
    "passion_p2:csf": [["confused", "CSF is the fluid around the brain? Piggy 2 talks about it like it's a fine wine. A very clear fine wine."]],
    "passion_p2:spine": [["thinking", "Piggy 2's research is about helping pigs walk again after spinal injuries. That's, like, the best possible use of anything."]],
    ask_best: [
      ["thinking", "Best for what, though? Fastest, smallest, or smartest? Basically there's no best, just tradeoffs."],
      ["thinking", "Best for what? Like, the cheapest one, or the best for what we're getting? Because those might be different."],
      ["happy", "Best for what? Okay, tell me what you're actually going to use it for, then I can answer."],
      ["thinking", "Best for what? That score looks good, but what was it compared against?"],
    ],
    "other_pig:piggy-1": [
      ["happy", "Piggy 1 is great. He's basically a golden retriever with a spreadsheet. Metaphorically, mostly!"],
      ["thinking", "Piggy 1 calls every ball himself. I think he's learning to say “Yours!” It's a big deal for him."],
      ["laughing", "Piggy 1 says I'm the best teammate who's never touched a ball. I touched one once. It went poorly."],
    ],
    "other_pig:piggy-2": [
      ["happy", "Piggy 2 is basically a golden retriever with a scalpel. Metaphorically! Mostly."],
      ["thinking", "Piggy 2 explains what the signal means, I figure out how to see it. We're building a pig EEG viewer together."],
      ["laughing", "Say “based” to him and he'll say “Patriot.” Every time. I tested it twelve times."],
    ],
    "other_pig:piggy-3": [["shy", "Piggy 3? Oh— that's me. Hi, I'm right here."]],
    "other_pig:all": [
      ["happy", "The Pig Pen! Okay, so Piggy 1 is the energy, Piggy 2 is the safety, and I'm… the dashboard?"],
      ["thinking", "All three of us live at Sakura House. Piggy 1's room is loud, Piggy 2's is boxes, mine is cables."],
    ],
    yes: [
      ["happy", "Okay, cool!"],
      ["excited", "Yes! Okay, okay, okay."],
      ["happy", "Yeah. That version. Keep that."],
      ["happy", "Nice, okay. Let's do it."],
      // also fits "okay, I'll get it checked" typed under the medical line (that quick reply is a "thanks")
      ["happy", "Okay, good. Yeah, that's the right call."],
    ],
    "yes:q": [
      ["excited", "Okay! Let's do it. I'll set it up, like, right now."],
      ["happy", "Yay. Okay. Great, I was hoping you'd say that."],
    ],
    no: [
      ["neutral", "Okay, that's fair."],
      ["thinking", "Hmm, okay. Noted. Back to the drawing board."],
      ["happy", "No worries! Different version, then."],
    ],
    "no:q": [
      ["sad", "Oh, okay. That's fine! Maybe later."],
      ["thinking", "Okay, no pressure. I'll leave it in the backlog."],
    ],
    laugh: [
      ["laughing", "Haha, okay, good. I wasn't sure that would land.", { a: "laugh" }],
      ["happy", "Hehe. Okay, I'm saving that one."],
      ["laughing", "Okay, that's funny. That's actually funny.", { a: "laugh" }],
      ["bashful_smile", "I like making you laugh. It's, like, a good metric.", { tier: "FW" }],
    ],
    question_generic: [
      ["thinking", "Hmm, good question. I don't actually know. I'd want to look it up properly."],
      ["thinking", "Okay, that's a “best for what” question in disguise. What are you actually trying to do?"],
      ["confused", "Wait, I don't think I know that one. Ask me what I'm building? I definitely know that one."],
      ["thinking", "Hmm, my Heuristic Brain doesn't have that one. Basically it knows a few hundred things."],
    ],
    based: [
      ["laughing", "Okay, that's Piggy 2's word. Say it to him and he'll say “Patriot.” Every time."],
      ["thinking", "“Based” is basically Piggy 2's whole value system: good or not good. It's a very clean API."],
    ],
    patriot: [["laughing", "Patriot? Okay, that's the other half of Piggy 2's thing. He'll say “Based.”"]],
    bump: [
      ["thinking", "Oh, is this the Piggy 1 thing? He says “Set!” I wrote it down."],
      ["happy", "Bump? I know this one: Piggy 1 would say “Set!” and then get really excited."],
    ],
    set: [["thinking", "Set? Piggy 1 says “SPIKE!!” to that, and I would ask “set to what?”"]],
    spike: [["excited", "Spike, like a signal spike? Oh, volleyball. Piggy 1 would yell “KILL!” at that."]],
    pork_joke: [
      ["confused", "Um, no? Best for what? Not for us."],
      ["angry", "Okay, that's— no. I'm going to pretend I didn't parse that."],
      ["confused", "Wait. Why would you— okay. Deleting that from the log."],
    ],
    // where to reach out comes first, so it is on the first page in any box (quirks.ts CRISIS_CALL)
    distress: [
      ["sad", `${CRISIS_CALL} Okay. I'm really glad you said something, and I'll stay with you.`],
    ],
    ask_about_me: [
      ["happy", "You're {player}. You actually want to see the stuff I make. That's, like, the main thing."],
      ["thinking", "You study {major}. Okay, so I was thinking there's probably a cool data thing in {major}. There always is."],
      ["happy", "You're from {hometown}! I looked it up, not in a weird way. In a map way."],
      ["happy", "Your comfort food is {comfort_food}. I wrote it down. Like, in a file."],
      ["happy", "You like {likes}. I remember. I'm pretty good at the details that matter."],
    ],
    "ask_about_me:none": [
      ["thinking", "Honestly, not much yet! Tell me one thing. Like, one actual thing."],
      ["happy", "I know you're {player}, and that's it so far! What's one thing you're into? Like, actually into?"],
    ],
    "share_self:name": [
      ["happy", "{said}. Okay, cool— I'm gonna remember that. Like, actually."],
      ["bashful_smile", "{said}. That's a good name. Nice and readable."],
    ],
    "share_self:major": [
      ["excited", "Oh, {said}! Okay, so I was thinking— is there data in {said}? There's always data."],
      ["happy", "{said}! That's cool. What's the part you actually like about it?"],
    ],
    // a major statement with nothing to read back ("my major is terrible", "i'm a tiktok major")
    "share_self:major_more": [
      ["happy", "Okay, wait, tell me more about your major? Like, the best part and the worst part."],
      ["thinking", "Ooh, okay. What's it actually like? Like, what do you do all day?"],
    ],
    "share_self:hometown": [
      ["thinking", "{said}? Is it nice? Like, actually nice, or “it's fine” nice?"],
      ["happy", "{said}! Okay, I'm adding that to my little mental map."],
    ],
    "share_self:likes": [
      ["thinking", "{said}, okay. Tell me why? I want the actual reason."],
      ["excited", "Wait, you like {said}? Okay, that's cool. I didn't know that."],
    ],
    "share_self:year": [["happy", "Oh, cool! Okay, if you ever need a tool for anything, like, anything, I'm around."]],
    share_self: [
      ["happy", "Oh, that's cool. Tell me more? Like, the details."],
      ["thinking", "Okay, noted. Like, actually noted. I'm keeping a file."],
    ],
    "followup:why": [
      ["thinking", "Okay, so, basically."],
      ["thinking", "Because, okay, here's the thing."],
    ],
    "followup:more": [
      ["excited", "Okay, so, the longer version."],
      ["happy", "Oh, there's more. There's always more."],
    ],
    "followup:really": [
      ["happy", "Yeah, actually!"],
      ["thinking", "Really. I double-checked."],
    ],
    "followup:ack": [
      ["excited", "Right?"],
      ["happy", "Yeah! Okay, and also."],
    ],
    followup: [
      ["confused", "Wait, why what? I think I lost the thread. Which part?"],
      ["thinking", "More about what? I can go deep on, like, five things. Pick one."],
      ["happy", "Really! I think. What were we talking about?"],
    ],
    repeat: [
      ["confused", "Wait, is this a loop? I think you said that already. Are you testing me?"],
      ["laughing", "Okay, you're repeating inputs. Is this a test case? I respect a good test case."],
      ["thinking", "Same message twice. Okay, so either you really mean it or I'm in a unit test."],
    ],
    unknown: [
      ["thinking", "Hmm, my Heuristic Brain didn't parse that. Basically it knows a few hundred things. Try “What are you building?”"],
      ["confused", "Wait, I don't think I got that. Like, what's the actual question?"],
      ["thinking", "Okay, I didn't catch that one. If you want me to understand stuff like that, there's a Big Brain option in Settings."],
      ["happy", "I'm not sure what that means, but I like it? Ask me about Codex, or HiPerGator, or One Piece."],
      ["confused", "That one went past me. Can we do, like, one concrete example?"],
    ],
    "hungry_talk:ask": [
      ["happy", "I actually ate! Onigiri, like an hour ago. I'm as surprised as you are."],
      ["thinking", "Not yet? Ask me again in an hour. I'll have forgotten to eat by then."],
    ],
    "hungry_talk:invite": [
      ["excited", "Yes! Okay, I'll actually stop coding at a reasonable time. Probably."],
      ["happy", "Food with you? Okay, best for what? Best for everything, let's go."],
    ],
    "tired_talk:ask": [
      ["happy", "I'm good! I had a sugar-free Red Bull, so I'm basically awake until Tuesday."],
      ["thinking", "Not tired yet. That kicks in around 2 a.m., right when the code starts working."],
    ],
    "sick_talk:ask": [
      ["happy", "I'm okay! My immune system is actually running fine today. Thanks for asking."],
      ["thinking", "Nope, all green. Like, every check is passing. Thanks for checking, though."],
    ],
    "player_happy:fine": [
      ["happy", "Okay, good. Good is good."],
      ["happy", "Nice. Like, actually nice, or “fine” nice? Either is okay."],
      ["bashful_smile", "Good. I'm glad, like, actually glad."],
    ],
    "player_sad:grief": [
      ["sad", "Oh. I'm really sorry. I don't have anything clever to say, I'm just here."],
      ["loving", "That's so hard. Do you want to tell me about them? Like, what they were like?"],
    ],
    "ask_about_self:color": [["happy", "Lavender. My whole room is lavender. It's a commitment."]],
    "ask_about_self:animals": [
      ["happy", "Cats! They sit on keyboards, which is basically pair programming."],
      ["thinking", "The Lake Alice bats. Half a million of them. I'm a little obsessed, honestly."],
    ],
    "ask_about_self:dating": [
      ["flustered_blush", "Oh— um. No? I'm mostly in a relationship with X.com. …Why?"],
      ["shy_blush", "No, I'm— no. I'm kind of bad at that stuff. Better at math."],
    ],
    "ask_about_self:kempa": [
      ["thinking", "Kempa AI makes the KempaPager. I redid its UI because the stock one looked like a microwave clock."],
      ["happy", "Kempanions are basically buddies with a pager. I helped with the pager part. Okay, a lot of the pager part."],
    ],
    "ask_hobby:music": [
      ["happy", "Lo-fi while I code, anime openings while I debug. And rain, which is basically free lo-fi."],
      ["thinking", "I like music with a good loop. Like, a loop you could debug to."],
    ],
    "ask_hobby:games": [
      ["happy", "Games with good UI. I'll play anything if the menus are nice. Is that weird?"],
      ["excited", "Pokémon, kind of forever. I made a little team builder once. It's not pretty yet."],
    ],
    "ask_favorite_food:places": [
      ["thinking", "Best for what? Late night is Midtown, quick is the Reitz, and onigiri is wherever the Anime Club is selling."],
      ["happy", "Okay, so for boba it's Midtown. For “I forgot to eat” it's the Reitz. That's most days."],
    ],
    "greeting:oink": [["laughing", "Oink? Okay, that's the default sound effect. I'm going to patch it to something cooler."]],
    "greeting:halloween": [["happy", "Happy Halloween! The Lake Alice bats are basically the official mascots tonight."]],
    "greeting:holiday": [["happy", "Happy holidays! I'm coding a little snow animation for the pager. It's, like, eighty percent done."]],
    "based:meaning": [["thinking", "Basically it's Piggy 2's “approved” stamp. Good, true, solid. It's just a vibe check, never politics."]],
    "patriot:meaning": [["thinking", "It's his acknowledgment word. Like an ACK packet, but with feeling."]],
    "insult:smell": [
      ["confused", "Is it the Red Bull? It's probably the Red Bull. I've stopped noticing."],
      ["sad", "Okay, fair. Long night at Marston. Shower is next in the queue."],
    ],
    "followup:hmm": [
      ["thinking", "Hmm is valid. I do a lot of hmm."],
      ["happy", "Yeah, take your time. I'm thinking too."],
    ],
    "followup:nothing": [
      ["happy", "Nothing is a good time to start a little project. Just saying."],
      ["thinking", "Nothing much? Same. Okay, I'm lying, I have nine tabs open."],
    ],
    ask_time: [
      ["thinking", "It's {time}? Wait, already? Okay, time is fake when you're coding."],
      ["happy", "{time}, {day}. I only know because my HiPerGator job has a timer on it."],
    ],
    encourage: [
      ["happy", "Thanks! Okay, I'm going to pretend it's a bug and just fix it."],
      ["bashful_smile", "Oh— thanks. That actually helps, like, a lot."],
      ["excited", "Okay, okay. Ship it. I'm shipping it."],
    ],
    // ── a sum ("what's 9 plus 10?"): the answer is solved in code (template.ts parseArithmetic) and said as {answer}, the sum
    // in words as {expr}; no line carries a number of its own, except the meme's 21. Keep a line from starting with {answer}
    // and a period ("19. …"): the post-filter reads that as a list bullet and eats it. 'meme' is 9 + 10 either way round
    // (he is on X all day, so he knows the "21" joke), 'zero' a division by zero (no answer), 'approx' a division with
    // decimals left over (the answer is rounded) ──
    arithmetic: [
      ["happy", "Okay, so {expr} is {answer}. Tutor trick: say it out loud, then check it backwards."],
      ["thinking", "{expr} is {answer}. The kids I tutored would say “wait, how?” and I'd say “one clear example.” Then stickers."],
      ["excited", "{answer}! Basically a unit test with one case, and it passes."],
      ["thinking", "{expr} is {answer}. I'd double-check on a calculator, though. Not because I don't trust me, just because I trust the process."],
      ["happy", "Oh, math! It's {answer}. Give me another one, I'll wait."],
      ["proud", "Easy: {answer}. Estimate first, round both numbers, and see if the answer lands in the neighborhood. That habit saves you on tests."],
      ["happy", "Okay, {answer}! Honestly, I love when someone asks me a math question. It's like a warm-up for my brain."],
      ["excited", "{answer}! Ship it. …Okay, check it first, then ship it."],
      ["thinking", "So, {expr}: {answer}. One clear example first, then the rule, and you just got the example. The rule is “check it twice.”"],
      ["happy", "Okay, so it's {answer}. Fun fact: I used to tutor this exact kind of question. Fractions were the hard ones, this was the warm-up."],
      ["bashful_smile", "It's {answer}. I like that you ask me stuff like this. Like, actually like it.", { tier: "FW" }],
    ],
    "arithmetic:meme": [
      ["laughing", "Oh, it's {answer}! …But if you're asking the internet, it's 21.", { a: "laugh" }],
      ["laughing", "{expr} is {answer}. The internet has been saying 21 for years and has never once shown its work.", { a: "laugh" }],
      ["thinking", "Okay, so, {answer}. But is this the 21 thing? I've seen it on X.com so many times that part of me wants to say 21 out of habit."],
      ["proud", "Tutor answer: {answer}. Meme answer: 21. I will not be taking questions."],
      ["happy", "Okay, tutor rule: {expr} is {answer}. If a kid said 21, I'd say “nice meme, now do it on the number line.” Then stickers."],
    ],
    "arithmetic:zero": [
      ["excited", "Oh, dividing by zero! One clear example: split cookies between zero friends, and nobody is there to get any. So it's undefined."],
      ["laughing", "{expr}? In code that's an exception, and back when I tutored math it was a tantrum. Same energy: it's undefined!", { a: "laugh" }],
      ["thinking", "{expr} is undefined. Not zero, not infinity. Undefined, and I'll say it with total confidence."],
      ["happy", "Dividing by zero, the classic! A computer says Infinity, a calculator says Error, and a math tutor says “great question.” It's undefined."],
    ],
    "arithmetic:approx": [
      ["thinking", "{expr} is about {answer}. It doesn't come out even, so I rounded to two decimals. The “about” is doing real work there."],
      ["happy", "About {answer}! Okay, tutor rule: when it doesn't divide evenly, say “about” and tell people how you rounded. Two decimals, here."],
      ["excited", "It comes out to about {answer}! Not exactly, because exactly would be a fraction. Fractions are my favorite, so don't get me started."],
      ["proud", "Okay, so {expr} is about {answer}. Always say how you rounded. The kids I tutored got stickers for remembering that."],
    ],
    // ── the new quick replies: his own (above, after math), the six shared ones, and one line each for the other two pigs’ ──
    "encourage:hype": [
      ["excited", "Okay, so I was thinking: you've basically already done the hard part. The starting part. Now just ship it!"],
      ["happy", "You've got this. Actually, you've had it the whole time. This is just the part where it runs."],
      ["thinking", "One clear example: the last hard thing you did? You did it. Same you, same result."],
      ["excited", "Okay, so here's the plan: tiny first version, today. It doesn't have to be pretty yet. It just has to run."],
      ["bashful_smile", "I'd bet on you. Like, against any baseline. That's my highest compliment, honestly.", { tier: "FW" }],
    ],
    "ask_about_self:chronotype": [
      ["happy", "Night owl. My best ideas show up after midnight, and so does the X.com timeline, which is probably related."],
      ["thinking", "Night owl, but, like, a productive one. Okay, a scrolling one. The HiPerGator queue is shorter at 2 a.m. anyway."],
      ["sleepy", "Night owl. Mornings are, like, a rumor. I've heard of them."],
      ["thinking", "Night owl. Your intake form says “{chronotype},” right? Okay, noted, I'll plan around that."],
    ],
    "study:teach": [
      ["excited", "Okay, so, fold a sheet of paper in half 42 times and, on paper, it reaches the Moon. Doubling gets out of hand fast. That's exponents, basically.", { a: "explain_code" }],
      ["happy", "In a room of just 23 people, it's more likely than not that two share a birthday. Mine's November 7, by the way. Not a hint, okay, a little bit a hint."],
      ["thinking", "Language models read tokens, not letters. So counting the letters in a word can be weirdly hard for them. Like, the r's in “strawberry.”"],
      ["happy", "There are more ways to shuffle a deck of cards than atoms on Earth. So every good shuffle is probably brand new. Like, in all of history."],
      ["laughing", "A pizza with radius z and thickness a has volume pi times z times z times a. Pi, z, z, a. I told this to every kid I tutored.", { a: "laugh" }],
    ],
    "ask_about_self:dream": [
      ["thinking", "Build something people actually use every day. Like, a little thing that just quietly helps. That's it, basically."],
      ["excited", "An open model that reads EEG as well as a doctor, and anyone can download it. Okay, that's a big dream. I'll start small."],
      ["happy", "A math tool so good the kid forgets it's math. The tutor in me would be so proud."],
      ["shy", "Ship my own stuff, for once. Not just help everyone else ship theirs.", { tier: "FW" }],
    ],
    "ask_hobby:shows": [
      ["happy", "One Piece, weekly. And then X.com, to see what everyone thought. Mostly X.com, honestly."],
      ["thinking", "Model release livestreams. Like, people watch sports, and I watch benchmark charts. Okay, it's a lot like sports."],
      ["excited", "Haikyu!!, because Piggy 1 made me. It's actually really good. Don't tell him I said “really.”"],
    ],
    "ask_about_self:competitive": [
      ["thinking", "Only about benchmarks. Like, I want to know who won, and also against what baseline."],
      ["laughing", "I raced Piggy 1 to the Reitz once. I took a scooter. Okay, it was optimizing, not cheating."],
      ["happy", "Against people, no. Against my own last version, yes. Version 2 has to beat version 1, or it's not a release."],
    ],
    "passion_p1:germany": [
      ["thinking", "Piggy 1 did research in Germany. He still counts reps in German, and, like, it actually helps him focus."],
    ],
    "passion_p1:german": [
      ["happy", "Piggy 1 taught me “Los geht's.” It's basically “let's go,” but with, like, better syllables."],
    ],
    "passion_p1:haikyu": [
      ["happy", "Haikyu!! is Piggy 1's whole personality. Okay, I watched it with him, and the animation on the spikes is really good."],
    ],
    "passion_p1:sand": [
      ["thinking", "Indoor, honestly. Air conditioning. Piggy 1 says that's not a volleyball answer."],
    ],
    "passion_p1:team": [
      ["happy", "My team is me and a coding agent. Piggy 1's team has jerseys, so, like, probably start there."],
    ],
    "passion_p1:calls": [
      ["laughing", "Piggy 1 yells “Free ball!” at everything. Last week it was a vending machine."],
    ],
    "passion_p1:algorithm": [
      ["excited", "Binary search! It's basically the guessing game I played with kids back when I tutored math: higher, lower, cut the range in half."],
    ],
    "passion_p1:bug": [
      ["laughing", "Best bug? One where the whole page came apart and the pieces floated around, like Buggy the Clown. It was one missing bracket."],
    ],
    "passion_p2:donation": [
      ["thinking", "Okay, don't tell Piggy 2 you have that. Actually, tell him. He'll be so happy, and then he'll label it."],
    ],
    "passion_p2:research_year": [
      ["thinking", "Piggy 2's research year is basically a sabbatical, except he's always writing the next grant. Like, always."],
    ],
    "passion_p2:or": [
      ["thinking", "Piggy 2 misses the OR, like, out loud. He says it's the only quiet room in the hospital."],
    ],
    "passion_p2:why": [
      ["thinking", "Piggy 2 told me the spinal cord has no backup copy. Like, as someone who backs up everything, that's terrifying. So I get it."],
    ],
    "passion_p2:nerves": [
      ["thinking", "Piggy 2's favorite is the vagus: cranial nerve ten, Roman numeral X. I made the X.com joke, and he almost laughed."],
    ],
    "passion_p2:snout": [
      ["happy", "Piggy 2 calls Professor Snout “lead pig.” I call him “the reason Piggy 2 smiles at spreadsheets.”"],
    ],
    "ask_about_self:july4": [
      ["thinking", "Fireworks are basically a particle simulation with better PR. Mine is November 7, Piggy 2's is July 4, so he gets a free show."],
    ],
    "based:rate": [
      ["thinking", "Based? Okay, I'm not the judge, Piggy 2 is. I only rate things against a baseline."],
    ],
    "lead:greeting": [["happy", "Oh, hi!"], ["happy", "Hey!"]],
    "lead:thanks": [["bashful_smile", "Of course!"], ["happy", "Yeah, anytime!"]],
    "lead:laugh": [["laughing", "Haha!"], ["laughing", "Hehe, okay."]],
    "lead:apology": [["happy", "It's okay!"], ["happy", "No worries."]],
    "lead:yes": [["happy", "Okay!"], ["excited", "Yes!"]],
    "lead:no": [["neutral", "Okay, fair."], ["thinking", "Hmm, okay."]],
    "need:hungry": [
      ["sad", "Also, I think I forgot to eat again."],
      ["sad", "Unrelated, but is that a snack?"],
    ],
    "need:tired": [
      ["sleepy", "*yawn* Sorry, my brain is running at like 15 frames per second."],
      ["sleepy", "Sorry, I'm kind of running on fumes."],
      ["sleepy", "Sorry, I was on X.com until two. Research, mostly."],
    ],
    "need:sick": [
      ["sick", "*sniff* Sorry, my immune system is still in the queue."],
      ["sick", "Also, I might be a little sick."],
    ],
    "need:sad": [
      ["sad", "Sorry, I'm a bit meh today."],
      ["sad", "It's been kind of a gray day, honestly."],
    ],
    "need:dirty": [
      ["laughing", "Also, I think I need a shower. Long night at Marston."],
      ["laughing", "Ignore the curls, they're in debug mode."],
    ],
    "need:bored": [["happy", "Also, I really want to build something, like, now."]],
  },

  greet: {
    "greet:morning": [
      ["sleepy", "Oh, hi! Okay, so I was thinking… what if a toothbrush logged its own data? Like a tiny ECG, but for brushing."],
      ["sleepy", "Morning. I'm up— I'm mostly up. Hi."],
      ["happy", "Okay, so, what if breakfast had a dashboard? Wait, you're the dashboard. Morning!"],
      ["sleepy", "Morning! I checked X.com before my eyes opened, and there are three new models. Okay, two and a rumor."],
    ],
    "greet:day": [
      ["excited", "Hey, have you used Codex? I was trying to make this little thing with it. Here, let me show you."],
      ["happy", "Oh, hey! Perfect timing. I need a second pair of eyes on something."],
      ["excited", "Hey! I saw a new model on X.com at breakfast, and it was downloading before I finished reading the post."],
    ],
    "greet:evening": [
      ["happy", "Hey, it's almost bat time! Want to go to Lake Alice? I have a headband thing."],
      ["happy", "Evening! The lab's quiet now, which means it's basically my morning."],
    ],
    "greet:night": [
      ["happy", "Oh, hey! Night shift, the best shift. Marston's quiet and the outlets are free."],
      ["excited", "Hi! Okay, so I was thinking, and it's night, so the thinking is extra."],
      ["excited", "Oh, hey! Perfect timing, the X.com timeline just got good. Night shift is the best shift."],
    ],
    "greet:late": [
      ["thinking", "You're up too? Okay, so we're both night owls. Or both bad at sleep, same thing."],
      ["sleepy", "Hi. It's late, the HiPerGator job is still pending, and I'm pending too."],
      ["thinking", "You're up too? Okay, I was on X.com. It's research, mostly."],
    ],
    "greet:any": [
      ["shy", "Oh! Um— hi, {player}. Hi.", { tier: "N" }],
      ["happy", "Oh, hi! Okay, so, hi. That's the whole thought, hi."],
      ["happy", "Hey, I made a thing! It's not a big thing. It's a medium thing.", { tier: "FW" }],
      ["excited", "Hey! Did you see this on X today? Okay, I'll just show you."],
      ["bashful_smile", "Hey. I was hoping you'd come by. Like, actually hoping.", { tier: "W" }],
    ],
    "greet:last": [
      ["happy", "Oh, hey! I was thinking more about {last}— like, actually thinking. Okay, hi."],
      ["excited", "Hey! So, {last}: I had another idea about it. Okay, hi first."],
    ],
    "greet:checkin_sad": [["loving", "Hey, are you doing okay? Like, actually okay? I was thinking about it."]],
    "greet:checkin_exam": [
      ["thinking", "Hey— how'd the exam go? I was thinking about it. Not in a weird way."],
      ["thinking", "Hey— how's prep for the {exam}? I was thinking about it. Not in a weird way."],
    ],
    "greet:checkin_sick": [["loving", "Hey, are you feeling better? I almost built a soup-delivery tracker. Almost."]],
    "greet:memory": [
      ["happy", "Hey! How's {major} going? I want the one-sentence version and then the long version."],
      ["happy", "Hi! I saw {comfort_food} at the Reitz and thought of you. Okay, hi."],
    ],
    "greet:long": [
      ["excited", "You're back! Okay, so I was thinking about you— I mean, I saved you some updates. Lots of updates."],
      ["bashful_smile", "Hey, it's been a while. I kept a list of things to show you. It's long."],
    ],
    "greet:sick": [["sick", "Hi… *sniff*… my immune system is stuck in the HiPerGator queue.", { a: "sick" }]],
    "greet:hungry": [["sad", "Hey! Quick question, unrelated: have you eaten? I haven't since, like, yesterday.", { a: "hungry" }]],
    "greet:tired": [["sleepy", "Hey. I'm tired, but hi. The hi is real, the energy isn't.", { a: "yawn" }]],
  },

  idle: {
    greet: [
      "Oh! Hi. Okay, hi.", "Hey! Want to see a thing?", "Hi, {player}! Perfect timing.", "Okay, so I was thinking— hi!",
      "Hey! I made a little thing.", "Oh, hey! I'm early for once!", "Hi! Wait, one sec— okay, hi.", "Hey. Glad you're here.",
    ],
    hungry: [
      "Actually— I forgot to eat. Again.", "The agent was mid-run. I didn't eat.", "Onigiri? Please? Any onigiri?",
      "My stomach is throwing warnings.", "Is that a snack? Asking for me.", "Hungry. Build finished, though!",
      "Food? Best for what? Best for me.", "I'll eat after this one thing…",
    ],
    tired: [
      "Running at 15 frames per second.", "Too tired to explain properly.", "PENDING… like my brain.", "One bar of battery. One.",
      "Five more minutes. Okay, ten.", "My eyes are compiling slowly.", "I need a nap. A long nap.", "Sugar-free Red Bull… wearing off…",
      "Was on X till two. Oops.",
    ],
    dirty: [
      "There's PLA dust in my curls.", "Curls in debug mode.", "Laptop crumbs. On me. Somehow.", "Bath? Okay. Yeah. Fair.",
      "I smell like Red Bull. Sorry.", "Clothes need a wash. Me too.", "Two days at Marston. It shows.", "A shower is a soft reboot.",
    ],
    bored: [
      "Okay, so I was thinking…", "Can we build something? Anything?", "Bug Hunt? I have broken code.", "I need a little project.",
      "What if… no. Wait. What if…", "Bored. Brain wants a thing.", "One Piece? One episode? Ten?", "Let's make a tiny tool.",
      "Refreshing X.com. Again.",
    ],
    sick: [
      "Immune system: stuck in queue.", "Vibes at forty percent.", "*sniff* Stay a bit?", "My ECG is fine. I'm not.",
      "Sick. Like, buggy.", "Tea? Not Red Bull. Tea.", "Running in safe mode.", "Reboot required. Sleep.",
    ],
    happy: [
      "It works! The actual thing!", "Build passed! Okay, frame it.", "Ship it! …Wait, really?", "Okay, this is a good day.",
      "Everything compiled. Suspicious.", "Best for what? Best for today!", "Look— it actually works!", "ゴゴゴ… menacing happiness.",
      "My post got 12 likes! On X!",
    ],
    petted: [
      "Oh— um. Hi. That's nice.", "I'm not making it weird. …Okay.", "That's… really nice, actually.", "Keep that. That version.",
      "Um— okay. Okay. Cool.", "Head pats: excellent UX.", "…I'm glad you're here.", "Oh. Okay. Yeah. Hi.",
    ],
    fed: [
      "Melonpan energy! Thank you!", "Okay, refueled. Back to it!", "You get it. You actually get it.", "Fuel for three more hours!",
      "Thank you! Best for me.", "That was exactly right.", "Okay, now I can think again.", "Snack acquired. Good snack.",
    ],
    cleaned: [
      "Warm water is… okay, it's nice.", "Don't tell anyone I liked that.", "No more Marston smell! Probably.", "Clean build. Clean pig.",
      "Fresh! Like a new repo.", "Curls: debugged.", "Okay, that was a good reboot.", "Squeaky clean. Like, actually.",
    ],
    woke: [
      "Morning? Already? Okay…", "Is it 8:30? It feels like 3.", "Up. I'm up. Mostly up.", "Booting… please wait…",
      "Did my job finish? Did it?", "Five more minutes. Kidding.", "Oh. Hi. Red Bull first.", "I dreamed in pseudocode.",
      "Checking X before my eyes open…",
    ],
    sleepy: [
      "Okay… one more commit…", "Brain at 15 frames per second.", "It's late. I know. I know.", "Saving… then sleeping.",
      "My job's still pending…", "Night owl, sleepy owl.", "Marston's closing? Already?", "Five more minutes. Fine. Night.",
      "One more scroll on X… then sleep…",
    ],
    random: [
      "HiPerGator: a big friend doing math.", "Best for what, though?", "Okay, so I was thinking…",
      "The stock UI looked like a microwave clock.", "Read the diff. Always read the diff.", "Saw it on Twi— on X. X.com.",
      "47 tabs open. 17 are X posts.", "One more scroll. Okay, two.", "Bats are good for my alpha waves.", "My code isn't buggy. It's Buggy.",
    ],
    whisper: [
      "…okay so… zzz… ship it…", "…best for… what… zz", "…pending… pending…", "Zzz… one more commit…",
      "…menacing… ゴゴゴ… zzz", "…it's not pretty yet… zz", "*snore* …read the diff…", "…little thing… zzz…",
      "…x dot com… zzz…",
    ],
  },
};
