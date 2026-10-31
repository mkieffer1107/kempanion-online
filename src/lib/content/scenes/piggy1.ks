# Piggy 1 — "Rally Route" (docs/GAME_DESIGN.md §10). KScript syntax: docs/ARCHITECTURE.md §4.
# Heart events p1_h1..p1_h7, the ending p1_ending ("Last Rally", dusk only; p1_ending_invite is the hub text
# outside dusk) and three pig-to-pig scenes (p1_anime_apps and p1_breakfast with Piggy 3, p1_stat_sheet with Piggy 2).
#
# Arc: he calls "Mine!" on every ball (h1) → learns the lock/deadlock lesson and calls "Yours!" (h6)
# → "Mine / Yours / Ours" under the Legend Sakura. He calls you "teammate" until h6, then "captain".
#
# Scenes that can start from the hub open with a KempaPager message or a time skip, so they read
# right at any hour; [time …] forces the look the scene needs.
#
# Flags written here:
#   sakura_spike_bonus   p1_h3 seen: Sakura Spike bonus unlocked (GAME_DESIGN §10; game code may read it)
#   outfit_volleyball    p1_h3: uniform unlocked ([outfit] sets it too)
#   ending_p1            p1_ending finished; ending_p1_call = mine | yours | ours
#   p1_captain           p1_h6: he calls the player "captain" from now on (piggy3.ks reads it)
#   p1_p3_app            p1_anime_apps: Piggy 3 promised version one of the serve app (piggy3.ks continues it)
#   p1_anime_pick        p1_anime_apps: haikyu | onepiece | both
# Scene-only flags: p1_h1_pick (bump|catch|duck → ending callback), p1_h2_pick, p1_p3_pair, p1_h3_pick,
#   p1_position, p1_h4_pick, p1_h5_score, p1_h5_won, p1_h6_route (you|pigpen|drop), p1_h7_topic, p1_h7_pick.
# CGs: cg_p1_petal_dive cg_p1_whiteboard cg_p1_sunrise_serve cg_p1_two_screens cg_p1_kill_shot
#      cg_p1_yours cg_p1_247am cg_p1_petal_spike

# ───────────────────────── ♥1 ─────────────────────────

=== p1_h1
title: MINE! MINE!
pig: piggy-1
heart: 1
trigger: location=plaza; hour=6-22
priority: 50
cg: cg_p1_petal_dive
summary: A stray volleyball, a very loud call, and one unlucky sakura tree on the Plaza.
---
[jingle event_start]
[bg plaza fade]
[bgm plaza]
[petals normal]
narrator: The Plaza of the Americas. Live oaks, Spanish moss, and one squirrel judging you from a bench.
narrator: Past the oaks, a pickup volleyball game is getting loud.
piggy-1: MINE!
narrator: ...Very loud.
piggy-1: MINE! MIIIIIINE!
[sfx ball_hit]
narrator: A volleyball sails across the lawn. Right behind it, a small pig in a yellow tee sprints flat out, eyes on the sky.
narrator: He is not looking at the sakura tree. The sakura tree is looking at him.
[sfx whoosh]
[wait 250]
[sfx surprise] [shake 0.7 350]
[petals heavy]
[cg cg_p1_petal_dive]
narrator: CRUNCH. Pink everywhere.
piggy-1: ...
piggy-1: GOT IT!
narrator: He's upside down in a drift of petals, holding the ball over his head like a trophy.
[cg off]
[petals normal]
[bgm piggy1_theme]
[show piggy-1 laughing center]
piggy-1 laughing: Ball's safe! Tree's fine!
piggy-1 apologetic: And I'm, like, eighty percent fine.
piggy-1 proud: That's my fourth tree this semester. Personal record.
piggy-1 surprised: Wait. I know you!
piggy-1 excited: {player}! My ball rolled right to your feet on your first day!
piggy-1 skeptical: That's twice now. That ball likes you more than it likes me.
[bond piggy-1 +15]
narrator: Across the lawn, somebody yells, "Ball! Little help?"
piggy-1 excited: They need it back. Think fast, teammate!
[sfx ball_hit]
narrator: He pops the ball straight up. It hangs there for a second, then drops right at you.
? Bump it back!
  [set p1_h1_pick = bump]
  [sfx ball_hit]
  narrator: Arms together, knees bent. The ball floats up in a soft, perfect arc.
  piggy-1 surprised: Whoa—
  piggy-1 excited: SET!
  [sfx ball_hit]
  narrator: He can't help himself. He sets your pass, then jumps after his own set.
  [sfx spike] [shake 0.4 200]
  piggy-1 laughing: KILL! ...Oh no, I touched it twice in a row.
  piggy-1 laughing: That's a double touch. Don't tell the ref!
  piggy-1 encouraging: You've got real platform, {player}. You're on my team now, no take-backs.
  [bond piggy-1 +30]
? Catch it.
  [set p1_h1_pick = catch]
  narrator: You catch it cleanly against your chest. Very sensible.
  piggy-1 happy: In volleyball that's technically a lift. In life it's just great hands.
  piggy-1 proud: I respect a teammate who doesn't drop things.
  [bond piggy-1 +20]
? Duck!
  [set p1_h1_pick = duck]
  [sfx ball_hit]
  narrator: You duck. The ball bonks off the oak behind you and rolls away with great dignity.
  piggy-1 laughing: Valid! Self-preservation is a skill.
  piggy-1 proud: Zero touches, zero injuries. Honestly better stats than mine today.
  [bond piggy-1 +15]
piggy-1 happy: Real talk: sand courts, after class. You should come sometime.
piggy-1 shy_blush: No pressure! Just, like... a lot of hype.
piggy-1 happy: Here. Team snack.
[give oranges 1]
[sfx gift]
narrator: He presses a Florida orange into your hands. It's slightly dented and smells like sunshine.
piggy-1 proud: Natural sugar, vitamin C, comes in its own case. I eat six a day.
[bond piggy-1 +20]
narrator: Across the lawn: "BALL!"
piggy-1 excited: That's me, gotta go! MINE!
[hide piggy-1]
[sfx whoosh]
[wait 400]
[sfx surprise] [shake 0.5 250]
narrator: Somewhere behind the oaks, a second sakura gives up its petals.
piggy-1: I'M OKAY! FIFTH TREE!
narrator: ♥ Memory: Petal Dive. The day a volleyball picked you for the team.
[end]

# ───────────────────────── ♥2 ─────────────────────────

=== p1_h2
title: Circular Rotation
pig: piggy-1
heart: 2
trigger: location=malachowsky; hour=6-22
priority: 50
cg: cg_p1_whiteboard
summary: A circular-queue assignment, a whiteboard on the lawn, and the sweatiest data structure in Gainesville.
---
[jingle event_start]
[bg malachowsky fade]
[bgm malachowsky]
narrator: Malachowsky Hall. Seven stories of folded silver panels and triangle windows, and the home of computer science.
narrator: Out front, someone has wheeled a whiteboard onto the lawn. Nobody has stopped him.
[show piggy-1 confused center]
piggy-1 confused: Head here, tail here. Then the tail wraps... why does the tail WRAP?!
narrator: Piggy 1 is pacing a tight circle, marker in hoof. The whiteboard is a storm of boxes and arrows.
piggy-1 surprised: {player}! Perfect timing, I need a time-out.
piggy-1 happy: Fresh air is a performance enhancer. That's why the whiteboard lives outside now.
[bond piggy-1 +10]
piggy-1 thinking: Data structures homework: a circular queue. Fixed array, six slots.
piggy-1 guiding: You add at the tail and take from the head. Hit the end of the array, and you wrap back to zero.
piggy-1 sad: My queue says it's empty, but it's extremely full. It has six things in it!
piggy-1 confused: When head equals tail, it could mean empty OR full. I've been staring at that for forty-seven minutes.
narrator: He holds up the marker. The cap has been chewed, slightly.
? Draw it as a volleyball rotation.
  [set p1_h2_pick = rotation]
  narrator: You take the marker and draw a court: six circles for six positions, with arrows going around.
  piggy-1 confused: That's... a rotation. When we win the serve back, everybody moves one spot clockwise...
  piggy-1 surprised: And position one wraps to position six. It never runs off the court!
  [bond piggy-1 +35]
? Text Piggy 3 for a hint.
  [set p1_h2_pick = ask]
  [set p1_p3_pair]
  [sfx notify]
  narrator: You text Piggy 3. The reply comes back in eleven seconds.
  piggy-3: okay so I was thinking. draw it like a volleyball rotation? you know that one way better than me
  piggy-1 surprised: He's right. He's always annoyingly right.
  piggy-1 thinking: Six players, one spot clockwise... and position one wraps to position six!
  [bond piggy-1 +25]
? Snack break first.
  [set p1_h2_pick = snack]
  [sfx eat]
  narrator: You split a granola bar on the grass. Piggy 1 chews slowly, staring at the board.
  piggy-1 thinking: Rotate one spot when we win the serve back... and position one wraps to six...
  piggy-1 surprised: Wait, WAIT. Sugar is a debugger!
  [need piggy-1 hunger +10]
  [bond piggy-1 +20]
[sfx sparkle] [shake 0.3 200]
[bgm piggy1_theme]
[cg cg_p1_whiteboard]
piggy-1 excited: A rotation IS a circular buffer that sweats!
narrator: He draws a court right over his diagram. Six slots, arrows looping, a tiny pig serving from position one.
piggy-1 determined: Tail goes to tail plus one, mod six. That's just a rotation, I've done it a thousand times!
piggy-1 inquisitive: And full-or-empty? On a court you never wonder, you just count the players.
piggy-1 happy: So I keep a count! Six means full, zero means empty.
[cg off]
[sfx typing]
narrator: He drops onto the grass with his laptop and types like the keyboard owes him money.
[sfx build_ok]
piggy-1 proud: Twelve for twelve! All tests green!
narrator: You lean over to look. Short functions, careful names, and a comment right above the tricky part.
? "Your code is really clean."
  [bond piggy-1 +15]
  piggy-1 surprised: You read my... code? Like, the actual code?
  piggy-1 flustered_blush: Nobody compliments my code, they compliment my serve. Hold on, I need to sit down.
  piggy-1 flustered_blush: I'm already sitting. Okay, I need to sit down MORE.
? "Your court drawing is great."
  [bond piggy-1 +10]
  piggy-1 proud: I practiced the arrows! Every coach draws arrows, but mine curve.
  piggy-1 shy_blush: The code's okay too, I think? You'd tell me if it wasn't, right?
[sfx camera]
narrator: He snaps a photo of the whiteboard before anyone can erase it.
piggy-1 happy: Going in the spreadsheet. Category: clutch assists.
piggy-1 bashful_smile: Thanks, teammate. That was a clean set.
[bond piggy-1 +20]
narrator: ♥ Memory: The Whiteboard. The day homework learned to rotate.
[end]

# ───────────────────────── ♥3 ─────────────────────────

=== p1_h3
title: Dawn Patrol
pig: piggy-1
heart: 3
trigger: location=volleyball_courts,hub
priority: 50
cg: cg_p1_sunrise_serve
summary: Sunrise on the sand courts, a first look at the uniform, and one very important serve receive.
---
[jingle event_start]
[if hour >= 5 && hour <= 7]
  [bg volleyball_courts fade]
  [bgm morning]
  narrator: Last night, your KempaPager buzzed with one message from Piggy 1: "dawn patrol?? courts??"
  narrator: {time}, and you actually came. The sand is cold, and the sky is the color of a peach.
[else]
  [bgm stop 500]
  [fade black 400]
  [sfx notify]
  narrator: Your KempaPager buzzes. One message from Piggy 1.
  piggy-1: dawn patrol. tomorrow. sand courts, 6:30
  piggy-1: bring nothing, i have nine knee pads. ok bring yourself. that part's important
  [time morning]
  [bg volleyball_courts cut]
  [bgm morning]
  [fade clear 900]
  narrator: The next morning, 6:30 AM. The sand is cold, and the sky is the color of a peach.
[endif]
[petals light]
[sfx ball_hit]
narrator: Thwack, thwack. Somebody is already serving, alone, on the far court.
[outfit piggy-1 volleyball]
[set outfit_volleyball]
[show piggy-1 laughing center]
narrator: It's Piggy 1, in full uniform: teal jersey, navy knee pads, and sand all the way up to his fringe.
piggy-1 laughing: That's my forty-seventh serve this morning! Let's goooo!
piggy-1 surprised: Wait. You came to watch me?
piggy-1 shy_blush: Oh, cool. That's... cool.
narrator: He tugs at his jersey like he's only just remembered he's wearing it.
piggy-1 bashful_smile: This is the club uniform. It's, uh, teal.
piggy-1 laughing: You've seen teal before. Okay, moving on!
[bond piggy-1 +20]
piggy-1 happy: I am NOT a morning person. The club got this court slot, so I set four alarms.
piggy-1 happy: Kempa's intake form asked about sleep. You answered: {fact:sleep|not sure}
piggy-1 laughing: Doesn't matter! Today, everybody's an early bird.
piggy-1 happy: Serve receive! I serve, you pass it back to me.
piggy-1 happy: First: platform. Arms together, thumbs side by side, like a USB plug.
piggy-1 laughing: No, the OTHER other way. USB plugs are always the third try.
piggy-1 happy: Arms straight, don't swing. Let the ball do the work.
narrator: He jogs back to the service line and bounces the ball twice. His face goes quiet and serious.
[bgm piggy1_theme]
[cg cg_p1_sunrise_serve]
narrator: Toss, three steps, and he leaps. For one second he's a small, round silhouette in front of the sun.
[sfx spike] [shake 0.3 200]
narrator: The ball cracks into the empty court, dead center. The sand barely has time to object.
[cg off]
piggy-1 laughing: That's the scary serve! Don't worry, yours is a float.
piggy-1 happy: Nice and friendly. Probably!
[sfx ball_hit]
narrator: He taps an easy serve over the net. It wobbles toward you, slow and floaty, and starts to drop...
? Now!
  [set p1_h3_pick = early]
  narrator: You swing way too early. The ball clips your wrist and shanks off sideways.
  piggy-1 surprised: PANCAKE!
  [sfx ball_hit] [shake 0.4 200]
  narrator: He dives full length and slaps a hoof flat on the sand. The ball bounces off it, straight up, and lands on his glasses.
  piggy-1 laughing: My beautiful glasses! ...They're fine.
  piggy-1 happy: Great save, by me! But your hustle was ten out of ten.
  [bond piggy-1 +20]
? Wait for it...
  [set p1_h3_pick = perfect]
  [set p1_position = libero]
  narrator: You wait, and wait, then drop your hips and let it hit your forearms.
  [sfx ball_hit]
  narrator: The ball pops up in a soft, perfect arc and lands right on his hooves. He doesn't even have to move.
  piggy-1 surprised: ...
  piggy-1 laughing: LIBERO!! Do you know how many people can't do that?!
  piggy-1 happy: That's going in the spreadsheet. Bold font, gold cell.
  [bond piggy-1 +30]
? Now? Now?? NOW??
  [set p1_h3_pick = late]
  narrator: You hesitate. The ball lands on the sand between your feet with a soft, judgmental thump.
  piggy-1 laughing: Ace! Forty-eighth serve, first ace of the day!
  piggy-1 happy: Hey, everybody gets aced, even pros. Next one's yours.
  narrator: He serves again, and again. On the sixth try, you get it back over the net.
  piggy-1 happy: THERE it is! That's the one we remember.
  [bond piggy-1 +20]
narrator: Afterwards, you sit on the bench while the sun clears the trees. He hands you a sports drink without being asked.
piggy-1 happy: Fun fact: electrolyte sports drinks were invented right here in 1965. The football team kept wilting!
piggy-1 laughing: Florida invented a drink for being sweaty in Florida. Peak engineering.
piggy-1 bashful_smile: I don't usually make dawn patrol. Having you here made the alarms worth it.
piggy-1 bashful_smile: But this was... better. Same time next week, teammate?
[set sakura_spike_bonus]
[remember piggy-1 "Player came to dawn patrol at the sand courts with Piggy 1."]
[bond piggy-1 +25]
narrator: ★ Unlocked: Piggy 1's volleyball uniform.
narrator: ♥ Memory: Sunrise Serve. The morning you saw him in his element.
[end]

# ───────────────────────── ♥4 ─────────────────────────

=== p1_h4
title: Too Nerdy for the Team
pig: piggy-1
heart: 4
trigger: location=dorm,hub
priority: 50
cg: cg_p1_two_screens
summary: Late on the Sakura House porch, Piggy 1 admits he never quite fits on either side of the net.
---
[jingle event_start]
[if time = evening,night]
  [time night]
  [bg sakura_house fade]
  [bgm night]
  narrator: Sakura House, after dark. The porch lights hum, and the yard sakura drops a petal whenever the wind remembers it.
[else]
  [bgm stop 500]
  [fade black 400]
  [sfx notify]
  narrator: Your KempaPager buzzes. Piggy 1.
  piggy-1: porch tonight? not a bad thing, just thinking about stuff. you can say no
  [time night]
  [bg sakura_house cut]
  [bgm night]
  [fade clear 900]
  narrator: That night. The porch lights hum, and the yard sakura drops a petal whenever the wind remembers it.
[endif]
narrator: Piggy 1 is sitting on the porch steps with his laptop open. It's the quietest you've ever seen him.
[show piggy-1 thinking center]
piggy-1 surprised: Oh, hey, {player}. Didn't hear you come out.
piggy-1 laughing: That's new, right? Usually I hear everything: squirrels, bad passes, thunder in Ocala.
narrator: Upstairs, a window slides open.
piggy-2: Piggy 1, bedtime in thirty minutes. Based.
narrator: The window slides shut.
piggy-1 laughing: ...He's not even that kind of doctor.
piggy-2: I heard that.
narrator: You sit down next to him. The step creaks like it has opinions.
[bond piggy-1 +15]
piggy-1 thinking: Can I tell you something dumb?
[bgm sad 1200]
piggy-1 sad: In the lab today, someone said, "Ask Piggy 1, he's our volleyball guy." Like that's the main thing about me.
piggy-1 sad: Then at practice, Coach goes, "You're the computer guy. Run the stats sheet this weekend."
piggy-1 thinking: So in the lab, I'm the jock. On the court, I'm the nerd.
piggy-1 sad: I'm always the guy from the other building.
piggy-1 sad: And sometimes I think... what if I'm just medium at two things? Instead of actually good at one?
narrator: A petal lands on his keyboard. He doesn't brush it off.
? "You're both. That's your whole superpower."
  [set p1_h4_pick = both]
  piggy-1 surprised: ...Both?
  player: You explain code with volleyball, and volleyball with code. Nobody else can do that.
  piggy-1 thinking: The rotation thing, the circular buffer... that was both.
  piggy-1 bashful_smile: I never thought of it as a power. I thought it was a scheduling conflict.
  [bond piggy-1 +40]
? "Who said that? I'll fight them."
  [set p1_h4_pick = fight]
  piggy-1 laughing: Easy, teammate! Put the fists down!
  piggy-1 happy: You'd lose, by the way. Coach can block a refrigerator.
  player: Seriously, you're good at both. That's rare.
  piggy-1 bashful_smile: ...Yeah?
  [bond piggy-1 +30]
? "Pick whatever makes you happy."
  [set p1_h4_pick = happy]
  piggy-1 thinking: Whatever makes me happy...
  piggy-1 thinking: Code makes me happy, sand makes me happy. Code ABOUT sand makes me really happy.
  piggy-1 surprised: So... both? Can I just pick both?
  [bond piggy-1 +20]
[bgm dorm 1500]
piggy-1 happy: Can I show you something? I haven't shown the team yet.
narrator: He turns the laptop toward you. A volleyball court on one side of the screen, code on the other.
piggy-1 excited: SideOut, but for the whole team: serves, passes, rotations. Coach could see everybody's progress, not just the stars.
piggy-1 shy_blush: It's half volleyball, half code. I kept thinking it was too weird to show anyone.
[cg cg_p1_two_screens]
narrator: The laptop glow lights up his glasses. A volleyball rests against his hoof, and the sakura leans over both of you.
piggy-1 bashful_smile: Two screens, two buildings. One pig.
piggy-1 thinking: Maybe that's the whole point. Maybe the guy from the other building is exactly who you want on the team.
[cg off]
piggy-1 happy: That's why it's called SideOut. When you win the serve back, you get another chance.
piggy-1 sleepy: Okay, I'm at... *yawn*... twelve percent battery.
piggy-1 sleepy: Thanks for sitting with me, teammate.
piggy-1 bashful_smile: Best pep talk I ever got. And I've gotten a LOT of pep talks.
piggy-1 affectionate_blush: ...Seriously. Thanks.
[bond piggy-1 +20]
narrator: ♥ Memory: Two Screens. The night he stopped being the guy from the other building.
[end]

# ───────────────────────── ♥5 ─────────────────────────

=== p1_h5
title: Watch Me Spike
pig: piggy-1
heart: 5
trigger: location=volleyball_courts,hub
priority: 50
cg: cg_p1_kill_shot
summary: Tournament day on the sand. Piggy 1 is terrified, you're the loudest fan on the beach, and every chant has to land on the beat.
---
[jingle event_start]
[set p1_h5_score = 0]
[if weekday = sat,sun && time = day]
  [bg volleyball_courts fade]
  narrator: Tournament day! The club's fall sand tournament, the Hogtown Sand Classic.
[else]
  [bgm stop 500]
  [fade black 400]
  [sfx notify]
  narrator: Your KempaPager buzzes. Piggy 1.
  piggy-1: club tournament saturday, 2pm, sand courts
  piggy-1: no pressure. you don't have to come. (please come)
  [time day]
  [bg volleyball_courts cut]
  [fade clear 900]
  narrator: Saturday, 2:00 PM. The club's fall sand tournament, the Hogtown Sand Classic.
[endif]
[bgm tension]
narrator: Every pig in Gainesville feels a little seen by that name.
narrator: Every court is full. There's a folding table covered in oranges and about forty very sunburned fans.
[show piggy-1@volleyball scared center]
narrator: Piggy 1 is behind the bench, re-taping a knee pad for the fourth time.
piggy-1 surprised: You came! You actually— okay, okay okay okay.
piggy-1 scared: I'm fine! I'm just going to throw up in a very athletic way.
piggy-1 scared: It's the doubles semifinal, and they're good. Like, merge-conflict-at-the-net good.
piggy-1 sad: What if I shank the first pass with you watching? I'd have to transfer schools, possibly planets.
? "I'm right here. Every single point."
  [bond piggy-1 +15]
  piggy-1 surprised: ...Every point?
  piggy-1 bashful_smile: Okay, yeah. That actually helps, weirdly a lot.
? "Just have fun out there."
  [bond piggy-1 +10]
  piggy-1 laughing: Fun, right, the thing I love! I forgot it was fun for a second.
? "Shank it. I'll still cheer."
  [bond piggy-1 +10]
  piggy-1 laughing: You'd cheer for a shank?! That's terrifying and great.
piggy-1 happy: Do me one favor: be loud, and be on the beat. Chants are rhythm, and rhythm is morale.
narrator: A whistle blows. He jogs onto the sand, turns around to point at you, trips, and recovers.
[hide piggy-1]
[sfx whistle]
[bgm mini_volley]
narrator: First rally! The other team's hitter panics and just pushes the ball over the net.
narrator: It floats across, slow and helpless, and Piggy 1 is right under it. Your moment!
? "FREE BALL!"
  [set p1_h5_score += 1]
  [sfx cheer]
  narrator: Right on the beat. Piggy 1 passes it, his partner sets, and the kill lands.
  piggy-1: That's my teammate! LET'S GOOO!
  [bond piggy-1 +10]
? "BUMP!"
  narrator: Piggy 1 hears you and yells SET on pure reflex, mid-rally. The ball drops while everyone stares.
  piggy-1: SORRY! Pure instinct, I can't control it!
  [bond piggy-1 +5]
? "GO GATORS!"
  [sfx chomp]
  narrator: Half the crowd does the Gator Chomp, and so does Piggy 1, mid-rally. The ball lands between his hooves.
  piggy-1: Worth it! Chomp chomp!
  [bond piggy-1 +5]
narrator: Second rally, on their serve. Piggy 1 and his partner both call it, and both dive.
narrator: A race condition. Somehow the ball goes up anyway, and Piggy 1 slams it down the line.
narrator: The serve comes back to Piggy 1's side!
? "SIDE OUT!"
  [set p1_h5_score += 1]
  [sfx cheer]
  narrator: Exactly the call. Even the line judge nods at you.
  piggy-1: SIDE OUT! Did everybody hear my teammate?!
  [bond piggy-1 +10]
? "PANCAKE!"
  narrator: There was no pancake. A few people look around at the sand, searching for one.
  piggy-1: There WILL be pancakes later! Celebration pancakes!
  [bond piggy-1 +5]
? "MINE!"
  narrator: Piggy 1's head snaps toward you on instinct. He almost leaves the court to get your call.
  piggy-1: Hey, that's MY word! ...It sounds good on you, though.
  [bond piggy-1 +5]
narrator: Match point. The set goes up high, high, higher, and Piggy 1 is already running his approach.
narrator: The whole beach goes quiet. One, two...
? "LET'S GO, PIGGY 1!"
  [set p1_h5_score += 1]
  narrator: Your voice cracks across the sand, right on the beat. He hears it, you can tell.
  [bond piggy-1 +10]
? "FREE BALL!"
  narrator: It is the opposite of a free ball. He hears you anyway, and he grins.
  [bond piggy-1 +5]
? "BASED!"
  narrator: Somewhere in the crowd, a calm, flat voice answers: "Patriot."
  narrator: ...Was that Piggy 2? There's no time to wonder.
  [bond piggy-1 +5]
[sfx whoosh]
[cg cg_p1_kill_shot]
narrator: He leaves the sand. Knees up, arm back, the sun right behind him.
[if flag(p1_h5_score) >= 2]
  [sfx spike] [shake 0.7 300] [flash]
  narrator: KILL. The ball buries itself in the sand before the blockers even land.
  [sfx cheer]
  [jingle victory]
  [set p1_h5_won]
  [cg off]
  [bgm happy]
  [show piggy-1@volleyball laughing center]
  piggy-1 laughing: KILL! Point Gators!
  piggy-1 laughing: We won the semifinal! Let's goooo!
  piggy-1 happy: You were ON the beat! My partner asked who you were, and I said, "That's my teammate!"
  piggy-1 affectionate_blush: Every rally's more fun with you on my side of the net. I mean it.
[else]
  [sfx spike] [sfx fail]
  narrator: Their blocker gets a hoof on it: merge conflict at the net. The ball drops on his side.
  [cg off]
  [bgm sad]
  [show piggy-1@volleyball sad center]
  piggy-1 sad: ...Blocked. That's the match.
  narrator: He sits down hard in the sand. His partner pats his head and wanders off toward the oranges.
  player: Hey. Next rally.
  piggy-1 surprised: ...
  piggy-1 laughing: Next rally?! You stole my line!
  [bgm happy]
  piggy-1 happy: You're right, though. We lost a match, not the season.
  piggy-1 happy: Good game. Rematch next month!
  piggy-1 bashful_smile: And you cheered the whole time, even for the shanks. ESPECIALLY for the shanks.
[endif]
piggy-1 happy: The club wants you in the team photo. Official hype department!
[sfx camera]
narrator: Click. In the picture, Piggy 1 is the only one looking at you instead of the camera.
[bond piggy-1 +25]
narrator: ♥ Memory: Kill Shot. The day your voice landed on the beat.
[end]

# ───────────────────────── ♥6 ─────────────────────────

=== p1_h6
title: Yours!
pig: piggy-1
heart: 6
trigger: location=plaza,hub
priority: 50
cg: cg_p1_yours
summary: Demo day and practice land on the same afternoon, and Piggy 1 tries to touch every ball himself. Then he calls one new word.
---
[jingle event_start]
[time day]
[bg plaza fade]
[bgm comedy]
narrator: Demo day. The Plaza is packed with people eating lunch in the shade.
narrator: Then a small pig comes sprinting down the path with a laptop, a poster tube, a gym bag, and a volleyball.
[show piggy-1 excited center]
piggy-1 excited: {player}, hi! I can stop for exactly eleven seconds.
piggy-1 excited: The hackathon demo is in twenty minutes at Malachowsky. SideOut made the finals!
piggy-1 happy: And Coach moved practice because of the storm forecast. To also twenty minutes from now.
piggy-1 laughing: But it's fine! Demo first, sprint to the courts for the first set, sprint back for questions.
narrator: He shows you the plan, which is a spreadsheet. One column is labeled SPRINT (FAST).
piggy-1 thinking: My hackathon team has midterms, so it's just me. Which is fine, I know every line.
piggy-1 happy: I'll just do all of it. Bump, set, ship!
narrator: He turns to sprint off, steps on his own poster tube, and—
[sfx whoosh]
[hide piggy-1]
[sfx surprise] [shake 0.8 400]
narrator: Down the Plaza steps go bag, tube, ball, and pig. In that order.
narrator: The laptop flies highest of all. You catch it without even deciding to.
[show piggy-1 sad center]
piggy-1 sad: Ow. I'm okay... laptop?
narrator: You hold it up. Not a scratch.
piggy-1 laughing: Nice dig. ...Seriously, nice dig.
[bond piggy-1 +15]
[bgm sad 1200]
narrator: He doesn't get up. He sits on the bottom step with a scraped knee, watching the volleyball roll away.
[sfx bell]
narrator: Behind the Auditorium, the carillon starts playing. He doesn't seem to hear it.
piggy-1 thinking: You know the rule? Nobody touches the ball twice in a row.
piggy-1 sad: And I touch every ball. I've been calling MINE on everything for two years.
piggy-1 thinking: Calling the ball is like a lock. "Mine" grabs it, and nobody else can touch it.
piggy-1 sad: I've been holding the lock on every ball. That's not teamwork, that's a deadlock.
player: Why do you do it?
piggy-1 sad: If I call it and I miss, it's on me. That's fine, I can fix me.
piggy-1 sad: But if I let someone else take it, and it drops... then I didn't do everything I could.
? "Let me set for you. I'll run the demo."
  [set p1_h6_route = you]
  piggy-1 surprised: You? Run SideOut? You don't even know the—
  player: Walk me through it on the way, five minutes. Then you go play.
  piggy-1 thinking: That's... a set. You're giving me a clean ball.
  piggy-1 shy_blush: ...Okay! The demo login is "sideout," all lowercase.
  piggy-1 laughing: Don't click the red button. It's a joke button that plays an air horn.
  [bond piggy-1 +40]
? "Call Piggy 2 and Piggy 3."
  [set p1_h6_route = pigpen]
  [sfx notify]
  narrator: You text the Pig Pen group chat. Two replies come back almost at once.
  piggy-2: On my way with ice and water. Based.
  piggy-3: okay so I was thinking, I can run the demo? I read his repo last week. it's really clean actually
  piggy-1 surprised: He read my repo? He said it's CLEAN?
  piggy-1 flustered_blush: I need a minute. And also— wait, I HAVE a team!
  [bond piggy-1 +30]
  [bond piggy-2 +10]
  [bond piggy-3 +10]
? "Drop one. You can't be in two places."
  [set p1_h6_route = drop]
  piggy-1 sad: Drop one? But I promised both...
  piggy-1 thinking: Coach always says the bench exists for a reason. Maybe I could sit the first set.
  narrator: He calls Coach. It takes him three tries to say, "Can someone else start for me?"
  piggy-1 surprised: He said "FINALLY." Like he's been waiting two years for me to ask!
  [bond piggy-1 +20]
[bgm stop 800]
[fade black 800]
[time evening]
[bg plaza cut]
[fade clear 900]
[bgm campus_evening]
narrator: That evening. The Plaza glows orange, the lunch crowd is gone, and the squirrels have taken back the lawn.
[show piggy-1@volleyball happy center]
[if flag(p1_h6_route) = you]
  piggy-1 laughing: You got a laugh in the first ten seconds! The judges loved the rotation animation!
  piggy-1 happy: Second place! They even invented a prize for us: Best Use of a Circular Buffer.
[elif flag(p1_h6_route) = pigpen]
  piggy-1 laughing: Piggy 3 redesigned my slides in the ELEVATOR. They were so good it's honestly rude.
  piggy-1 happy: And Piggy 2 iced my knee and told every judge to hydrate. Second place, team effort!
[else]
  piggy-1 happy: I sat the first set, and the world didn't end. My sub got two kills!
  piggy-1 laughing: Then I ran the demo with a scraped knee and got second place. Bandages are very in this season.
[endif]
piggy-1 happy: Pepper before the sun goes! You pass, I set, you hit, and nobody touches it twice.
[bgm piggy1_theme]
[sfx ball_hit]
narrator: Pass, set, hit, again and again. The rhythm comes easy now, and the sky turns pink behind the oaks.
[sfx ball_hit]
narrator: Then a bad bounce. The ball drops right between you, the exact spot where, for two years, he has yelled one word.
piggy-1 surprised: Mi—
[wait 600]
narrator: He stops, plants his hooves, and looks right at you.
[shake 0.4 200]
piggy-1 laughing: YOURS!
[sfx ball_hit]
narrator: You get under it. It isn't pretty, but it goes up.
[petals heavy]
[cg cg_p1_yours]
[sfx ball_hit]
narrator: And he's already there, hooves up, setting it right back to you. High, soft, perfect: a clean API call.
[sfx spike] [shake 0.5 250]
narrator: You swing. The ball smacks the lawn, and three squirrels file a noise complaint.
[cg off]
[petals normal]
piggy-1 surprised: ...I called "Yours."
piggy-1 laughing: I called YOURS, out loud, on purpose! And it didn't drop!
piggy-1 bashful_smile: It felt so weird, like letting go of a railing. Good weird.
piggy-1 bashful_smile: ...Nice hit, captain.
player: Captain?
piggy-1 shy_blush: Yeah, captain. You called the play today, and captains call the play.
[set p1_captain]
[remember piggy-1 "Player helped Piggy 1 on hackathon demo day. He calls the player captain now."]
[bond piggy-1 +25]
narrator: ♥ Memory: Yours! The first ball he ever handed off.
[end]

# ───────────────────────── ♥7 ─────────────────────────

=== p1_h7
title: 2:47 AM
pig: piggy-1
heart: 7
trigger: location=marston,hub
priority: 50
cg: cg_p1_247am
summary: Exam season at Marston. A morning pig stays up hours past his bedtime to quiz you with volleyball hand signals.
---
[jingle event_start]
[bgm stop 500]
[fade black 400]
narrator: Exam season, or midterm season. At UF, it's always one of them.
[sfx notify]
piggy-1: marston tonight? i'm bringing flash cards and fuel. lots of fuel
[time night]
[bg marston cut]
[bgm library]
[fade clear 900]
narrator: Marston Science Library, 11:58 PM. Out front, the big yellow steel sculpture everyone calls the French Fries glows under the lamps.
narrator: Inside, the third floor is silent except for highlighters. You have a table, a mountain of notes, and a bad feeling.
[sfx step]
[show piggy-1 happy center]
piggy-1 happy: Captain! Fuel delivery!
narrator: He's whispering. When Piggy 1 whispers, it sounds like a normal person talking.
[sfx gift]
piggy-1 proud: Oranges, two sports drinks, and {fact:comfort_food|soup}. Kempa's form says it's your comfort food.
piggy-1 thinking: Wait, it's way past MY bedtime. My bedtime was ninety minutes ago!
piggy-1 laughing: Piggy 2 said I'd be "clinically unwell" by one AM. I said, watch me.
[bond piggy-1 +10]
piggy-1 happy: Okay! Flash cards, but with a system: volleyball hand signals.
narrator: He tucks one hoof behind his back, the way players at the net signal the next play to their team.
piggy-1 happy: One tap is a quick set, two taps is a back set. A wiggle is... whatever I decide.
piggy-1 thinking: So, captain. What are we studying?
? Data structures.
  [set p1_h7_topic = "data structures"]
  piggy-1 excited: MY PEOPLE. One tap behind the back is a quick set, and for you, it means B-tree.
? Neuroanatomy.
  [set p1_h7_topic = neuroanatomy]
  piggy-1 thinking: One tap is a quick set, and for you it means circle of Willis. Piggy 2 made me learn it twice.
? Physics.
  [set p1_h7_topic = physics]
  piggy-1 happy: One tap is a quick set, and for you it's F equals m a. Force equals my approach jump!
? A little of everything.
  [set p1_h7_topic = "a little of everything"]
  piggy-1 laughing: A generalist! One tap just means "chapter one," very flexible system.
[bond piggy-1 +15]
[sfx ui_select]
narrator: He signals, you answer. Every right answer gets a silent, full-body celebration.
piggy-1 excited: (library voice) Let's goooo.
narrator: When you miss one, he just holds up the signal again. Patient, like there's all the time in the world.
piggy-1 happy: Missed point, not a missed set. Again.
[fade black 600]
[fade clear 600]
narrator: 1:30 AM.
[show piggy-1 sleepy center]
piggy-1 sleepy: I'm good, I'm great. I'm at, like... twelve percent battery.
piggy-1 sleepy: Eleven, ten... okay, one more card.
[fade black 600]
[bgm sleep 1500]
[fade clear 600]
narrator: 2:47 AM.
narrator: He taps his hoof once behind his back, a quick set, and opens his mouth to ask the question...
[sfx zzz]
[burst zzz]
[cg cg_p1_247am]
narrator: ...and falls asleep face-first on the flash cards, hoof still raised.
narrator: A quick set. For you.
narrator: His laptop is still open. The spreadsheet has a tab you've never seen before, labeled CAPTAIN.
narrator: It's a list of every day you hung out: Plaza, whiteboard, dawn patrol (with three exclamation points).
narrator: At the bottom, one cell is highlighted gold: "Best stat: showed up, every time."
? Let him sleep.
  [set p1_h7_pick = sleep]
  narrator: You ease the flash cards out from under his snout and drape your jacket over his shoulders.
  narrator: Then you finish the stack yourself, quietly, one card at a time.
  narrator: You remember more than you thought. Every right answer comes with a tiny, imaginary "let's go."
  [bond piggy-1 +40]
? Wake him for one last card.
  [set p1_h7_pick = wake]
  narrator: You tap his shoulder. He jolts up, glasses crooked, a flash card stuck to his cheek.
  piggy-1 sleepy: Huh? I'm up, next rally!
  narrator: He squints at the card, taps twice behind his back, and asks the last question. You nail it.
  piggy-1 sleepy: ...Let's go, captain.
  narrator: He's asleep again before his hoof even comes down. This time, he's smiling.
  [bond piggy-1 +30]
[cg off]
[fade black 900]
[time morning]
[bgm morning 1500]
[fade clear 1200]
narrator: 5:58 AM. The windows go pale blue, then gold.
[show piggy-1 sleepy center]
piggy-1 sleepy: ...Is it six? My body knows six.
piggy-1 surprised: Wait, I fell asleep? In the middle of a SIGNAL?
[if flag(p1_h7_pick) = sleep]
  piggy-1 surprised: You finished the whole stack by yourself? Is that your jacket?
[else]
  piggy-1 laughing: You woke me up for one card, and I signaled it? That's dedication from both of us.
[endif]
piggy-1 thinking: I always thought I had to stay up. Like, if I fell asleep, the ball would drop.
piggy-1 affectionate_blush: But you had it. You had it the whole time.
piggy-1 affectionate_blush: ...Best teammate I've ever had.
[remember piggy-1 "Player studied {flag:p1_h7_topic|for exams} with Piggy 1 at Marston until 2:47 AM."]
[bond piggy-1 +25]
piggy-1 shy_blush: Hey, after exams... there's this thing people say about the sakura by Century Tower. At dusk.
piggy-1 flustered_blush: Never mind! Later, when I'm above four percent battery!
narrator: ♥ Memory: 2:47 AM. The night he finally let himself fall asleep on the job.
[end]

# ───────────────────────── Ending ─────────────────────────

# The ending only plays at dusk (like the other routes); outside dusk this hub text says where and when.
=== p1_ending_invite
title: A Text from Piggy 1
pig: piggy-1
trigger: location=hub; hearts>=8; seen=p1_h7; seen!=p1_ending; time=morning,day,night
priority: 30
replayable: false
summary: Piggy 1 asks you to meet him at Century Tower at dusk.
---
[sfx notify]
narrator: Your KempaPager buzzes. One message from Piggy 1.
piggy-1: century tower. dusk. don't be late
piggy-1: bring nothing. ok, bring yourself. that part's still the important part
narrator: Dusk, under the great sakura by Century Tower. Any evening between five and eight, he'll be there.
[end]

=== p1_ending
title: Last Rally
pig: piggy-1
ending: true
trigger: location=century_tower,hub; time=evening; hearts>=8; seen=p1_h7
priority: 60
cg: cg_p1_petal_spike
summary: Century Tower at dusk, the carillon ringing, and one last rally under the Legend Sakura.
---
[if seen(p1_ending_invite)]
  narrator: Dusk. You head for Century Tower, like he asked.
[else]
  [bgm stop 500]
  [fade black 400]
  [sfx notify]
  narrator: Your KempaPager buzzes. One message from Piggy 1.
  piggy-1: century tower. dusk. don't be late
  piggy-1: bring nothing. ok, bring yourself. that part's still the important part
[endif]
[time evening]
[bg legend_sakura fade]
[bgm piggy1_theme]
[petals normal]
[fade clear 1000]
narrator: Dusk at Century Tower. The sky behind the clock faces is orange and pink, like a sports drink commercial.
narrator: Under the oldest sakura on campus, the one from the legend, a small pig in a teal jersey is bouncing a volleyball.
[show piggy-1@volleyball shy_blush center]
piggy-1 surprised: You came! Hi, hello, captain.
piggy-1 bashful_smile: I made seventeen note cards. I'm not going to use them.
piggy-1 shy_blush: ...I might use one.
narrator: He holds up the ball. It's covered in signatures from the whole club, and in the middle, in fat marker: ASSISTS: {player}.
piggy-1 happy: The team signed it. Assists are the most important stat in volleyball.
piggy-1 laughing: Took me way too long to figure that out.
piggy-1 happy: You know the legend? Make a promise under this tree while the carillon plays at dusk, and it blooms forever.
piggy-1 laughing: I checked: zero peer-reviewed studies. Doing it anyway.
piggy-1 happy: It all started with tree number four. I dove into a sakura and came out with a teammate.
[if flag(p1_h1_pick) = duck]
  piggy-1 laughing: And you ducked! Honestly the smartest thing anyone's ever done around me.
[elif flag(p1_h1_pick) = catch]
  piggy-1 laughing: And you caught it with those clean hands. I think I knew right then.
[else]
  piggy-1 laughing: And you bumped it right back, and I double-touched it. Of course I did.
[endif]
piggy-1 bashful_smile: Then the whiteboard, dawn patrol, the porch, the tournament, 2:47 AM...
piggy-1 shy_blush: I've kept stats on everything my whole life: serves, subs, sleep. I never figured out how to count this one.
piggy-1 happy: Last rally! I toss, you bump, I set, you hit, and nobody touches it twice.
piggy-1 laughing: Especially not me. I've been rehabilitated.
[bgm stop 600]
[sfx bell]
narrator: Above you, the carillon begins. Bell after bell spills out over the treetops.
[bgm romance 1500]
[sfx ball_hit]
narrator: He tosses you the ball.
player: Bump!
piggy-1 laughing: SET!
[sfx ball_hit]
narrator: He sets it high, higher than you've ever seen him set anything. It hangs right at the edge of the blossoms.
player: SPIKE!
[petals heavy]
[sfx spike] [shake 0.6 300] [flash]
[cg cg_p1_petal_spike]
narrator: You jump and swing with everything you've got. The ball punches straight up into the branches.
narrator: The whole tree lets go. Petals pour down over both of you like a curtain call.
piggy-1 laughing: KILL! Point—
piggy-1 affectionate_blush: ...Point us.
[bond piggy-1 +30]
[cg off]
[show piggy-1@volleyball affectionate_blush center]
piggy-1 bashful_smile: Note card number one. The only one I needed.
piggy-1 affectionate_blush: {player}. Be my setter?
piggy-1 flustered_blush: Like... life's rotation? Mostly volleyball, but also all the rest of it.
narrator: The bells keep ringing. He's holding the ball so tight the signatures squeak.
? "Mine."
  [set ending_p1_call = mine]
  piggy-1 surprised: You— you called MINE. On me.
  piggy-1 laughing: That's not even a legal call! ...Ref says allowed.
  piggy-1 affectionate_blush: Every rally's more fun with you on my side of the net. Every single one, captain.
  [bond piggy-1 +40]
? "Yours."
  [set ending_p1_call = yours]
  piggy-1 surprised: Yours? You're giving me the call?
  piggy-1 bashful_smile: Then I've got you. Not because I have to touch every ball, but because you trusted me with this one.
  piggy-1 affectionate_blush: ...Nice set, captain.
  [bond piggy-1 +40]
? "Ours."
  [set ending_p1_call = ours]
  piggy-1 surprised: ...Ours.
  piggy-1 laughing: There's no "ours" in volleyball! That's not a call!
  piggy-1 affectionate_blush: ...It is now, and it's the best call I've ever heard. Let's goooo, captain.
  [bond piggy-1 +50]
[burst hearts]
narrator: The last bell rings out over campus and fades. Somewhere above you, the sakura decides to bloom forever.
narrator: It was probably going to anyway. But now it's a promise.
[set ending_p1]
narrator: ♥ Memory: Petal Spike. The last rally, and the first one of everything after.
[end]

# ───────────────────────── Pig-to-pig life ─────────────────────────
# p1_anime_apps (Piggy 3) continues in piggy3.ks p3_anime_apps ("Version One"). piggy2.ks p2_coach_medic already
# covers the courts cardio + neuro-exam gag, so the Piggy 2 scene here (p1_stat_sheet) is a different beat.

=== p1_anime_apps
title: Anime & Apps
pig: piggy-1
trigger: location=malachowsky; hour=6-22; seen=p1_h2
priority: 20
summary: Piggy 3 offers to turn Piggy 1's serve spreadsheet into an app. Then the real argument starts.
---
[bg malachowsky fade]
[bgm malachowsky]
[show piggy-1 excited left]
[show piggy-3 thinking right]
narrator: On a bench outside Malachowsky, Piggy 1 and Piggy 3 are sharing one laptop and two very different opinions.
piggy-1 excited: {player}, settle this! Piggy 3 is judging my serve spreadsheet.
piggy-1 proud: Eighty-seven point five percent accuracy this week!
piggy-1 laughing: Okay, it's a spreadsheet. A REALLY good spreadsheet.
piggy-3 thinking: Okay, so I was thinking we could make it a little app. Like, you tap where the serve lands, and it fills in the sheet.
piggy-1 excited: YES. Do that immediately.
piggy-3 confused: Actually— wait. What do you actually want to know, like, which number?
piggy-1 happy: All of them!
piggy-3 thinking: Okay, but best for what? Because "all of them" is sort of... a corporate dashboard.
piggy-1 surprised: Ouch.
piggy-3 happy: Like, if it's for getting better, maybe it's just where your misses land. One chart, that's the whole thing.
piggy-1 thinking: ...One chart. Okay, that's a really good point, and I hate it.
narrator: The conversation drifts, the way it always does with these two, to anime.
piggy-1 excited: Haikyu is literally about volleyball. It's about MY LIFE.
piggy-3 happy: One Piece is about a crew, though, so basically a team. The most team a team has ever been.
piggy-1 thinking: ...That's also a good point, and I also hate it.
piggy-3 laughing: You can't just hate every good point.
piggy-1 laughing: I can, I'm very consistent! {player}, you decide!
? "Haikyu, obviously."
  [set p1_anime_pick = haikyu]
  piggy-1 excited: LET'S GOOO! The people have spoken!
  piggy-3 happy: Okay, that's fair. The serves are really well animated, I'll give it that.
  [bond piggy-1 +10]
? "One Piece."
  [set p1_anime_pick = onepiece]
  piggy-3 shy_blush: Oh— okay. I mean, obviously, but... thanks.
  piggy-1 laughing: Traitor! ...Respect, though.
  [bond piggy-3 +10]
  [bond piggy-1 +5]
? "Why not both?"
  [set p1_anime_pick = both]
  piggy-1 surprised: Both? Is both allowed?
  piggy-3 happy: Okay, that's actually the best answer. Like, objectively.
  [bond piggy-1 +5]
  [bond piggy-3 +5]
piggy-3 thinking: Wait, okay, so I was thinking... what about a volleyball team that sails between tournaments on a ship?
piggy-1 surprised: I would watch that. I would watch that SO hard.
piggy-1 happy: He's my best teammate who's never touched a ball. Well, he touched one once.
piggy-1 laughing: It went poorly.
piggy-3 confused: It went fine.
piggy-1 laughing: It went into Lake Alice!
piggy-3 thinking: The ball was fine, though, it floated.
piggy-3 happy: Actually, a gator was sort of nudging it around. It looked happy.
piggy-1 laughing: The gator has a better bump than you!
piggy-3 happy: Yeah. That's fair.
piggy-3 happy: Okay, I'll make the first version tonight, just the one chart. And, like, sakura pink, not corporate.
piggy-1 bashful_smile: You'd do that? For my spreadsheet?
piggy-3 bashful_smile: Yeah. It's a good spreadsheet.
[set p1_p3_app]
narrator: Piggy 1 doesn't say anything for three whole seconds. For him, that's basically a speech.
[end]

=== p1_stat_sheet
title: Stat Sheet
pig: piggy-1
trigger: location=malachowsky; hour=8-20; seen=p1_h3
priority: 20
summary: Piggy 2 needs a readable chart before lab meeting. Piggy 1 has never been this excited about someone else's data.
---
[bg malachowsky fade]
[bgm comedy]
[show piggy-1 happy left]
narrator: Outside Malachowsky, Piggy 1 is reviewing serve stats on a bench. Then a shadow falls across his laptop.
[sfx step]
[show piggy-2 neutral right]
piggy-2 neutral: Piggy 1, I need a statistician. You're the closest one with a pulse.
piggy-1 excited: A STATS EMERGENCY? On MY bench?!
piggy-2 neutral: Lab meeting in one hour, and I made this chart at 4:12 AM. It is ischemic.
narrator: He turns his laptop around. The chart has nine colors, three fonts, and a legend that covers most of the data.
piggy-1 surprised: Oh no. Oh, buddy.
piggy-2 neutral: It's enrichment data from the lab pigs. Minutes of play per day.
piggy-2 thinking: Toys, straw, a radio, hanging balls. Pigs need play, it's in the protocol.
piggy-1 surprised: Wait. The lab pigs play with BALLS?
piggy-2 neutral: Daily. One of them averages forty minutes with the ball, very dedicated.
piggy-1 excited: Forty minutes?! That's starter minutes, I need to meet this pig!
piggy-2 neutral: They have names. You'll learn them when you're ready.
narrator: Piggy 1 cracks his hooves and starts rebuilding the chart from scratch.
[sfx typing]
piggy-1 happy: Okay, {player}, tiebreaker. What kind of chart?
? "A bar chart."
  piggy-1 happy: Clean and readable, one bar per pig. Everybody can see who's putting in the minutes!
  piggy-2 neutral: Based. The reviewers will read it at a glance.
  [bond piggy-1 +10]
  [bond piggy-2 +5]
? "A pie chart."
  [sfx ui_error]
  piggy-1 surprised: No.
  piggy-2 neutral: No.
  narrator: They said it at the exact same time. They look at each other, deeply moved.
  piggy-1 laughing: Pie charts are a crime against data.
  piggy-2 neutral: Pie charts are ischemic. Bar chart.
  [bond piggy-1 +10]
  [bond piggy-2 +10]
? "Make it sakura pink."
  piggy-1 laughing: Bold, I like it! High contrast, though, so it's readable.
  piggy-2 thinking: ...Approved. The pigs would like it.
  [bond piggy-1 +10]
  [bond piggy-2 +5]
[sfx build_ok]
narrator: Six minutes later, the chart has one color, one font, and a title anyone could read from the back row.
piggy-2 neutral: ...This is clean.
piggy-2 neutral: I read the code too. It's clean, Piggy 1.
piggy-2 proud: Based.
piggy-1 surprised: My... code?
piggy-1 flustered_blush: He read my code and said CLEAN!
piggy-1 flustered_blush: {player}, you heard that, right? You're a witness.
piggy-2 neutral: Lab meeting in fifty-four minutes. Patriot.
[hide piggy-2]
narrator: He walks off toward the Health Science Center at exactly the speed of a pig who is never late.
piggy-1 bashful_smile: He's never going to say that again. I'm framing this moment.
piggy-1 happy: Also, I'm recruiting the ball pig. Don't tell Piggy 2.
[end]

=== p1_breakfast
title: Breakfast Is Not Optional
pig: piggy-1
trigger: location=dorm; hour=7-8; seen=p1_h1
priority: 20
summary: Piggy 1 makes breakfast for the whole house every morning. The whole house is mostly asleep.
---
[time morning]
[bg sakura_house fade]
[bgm morning]
[petals light]
narrator: Sakura House, early. The porch smells like bananas and something slightly burnt.
[show piggy-1 happy center]
piggy-1 happy: {player}, perfect timing! Breakfast is served!
narrator: He has carried the kitchen table out onto the porch. Fresh air is a performance enhancer, apparently.
piggy-1 excited: Banana pancakes, oatmeal, and a mountain of oranges. Fuel for the whole Pig Pen!
narrator: There are four plates, and one already has a sticky note on it in immaculate handwriting.
narrator: The note says: "Ate 4:45. Lab-pig rounds. Based."
piggy-1 sad: He eats at 4:45 every day, like a ghost. Thirty-eight breakfasts this semester, and I've never seen him eat one.
piggy-1 thinking: And Piggy 3 is asleep until 8:30. Minimum.
piggy-1 happy: So! How do we wake him up?
? Knock on his window.
  [sfx door]
  narrator: You tap twice on Piggy 3's window. A muffled voice answers from somewhere inside a blanket.
  piggy-3: five more minutes... actually— ten. best for... sleep
  piggy-1 laughing: Ten more minutes it is! I'll keep his pancakes warm.
  [bond piggy-1 +5]
  [bond piggy-3 +5]
? Bang a pot.
  [sfx shake] [shake 0.3 200]
  narrator: Piggy 1 hands you a pot and a wooden spoon with enormous enthusiasm.
  [show piggy-1 laughing left]
  [show piggy-3 sleepy right]
  piggy-3 sleepy: Okay, okay, I'm up. I'm... mostly up.
  piggy-3 confused: Is that a pot? Why is there a pot?
  piggy-1 laughing: Breakfast is not optional!
  piggy-3 sleepy: Okay, so I was thinking... coffee. That's the whole thought.
  [bond piggy-1 +5]
? Let him sleep. Save him a plate.
  piggy-1 thinking: Let him sleep...
  piggy-1 happy: Yeah, he was up until two again. Plate for later!
  narrator: Piggy 1 covers a stack of pancakes with a second plate and writes P3 on a sticky note, with a little heart.
  piggy-1 bashful_smile: Team snack, delayed delivery. That still counts.
  [bond piggy-1 +10]
[hide piggy-3]
[show piggy-1 happy center]
piggy-1 happy: Most important meal of the day. Also my favorite rep.
[sfx eat]
[need piggy-1 hunger +15]
narrator: You eat pancakes on the porch steps while the yard sakura drops petals into the syrup.
piggy-1 bashful_smile: Thanks for showing up, {player}. Breakfast for two beats four empty chairs.
[bond piggy-1 +10]
[end]

