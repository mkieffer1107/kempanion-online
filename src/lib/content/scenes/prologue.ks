# Prologue. New Game plays this scene, then the hub (where tutorial_hub takes over).
# Intake form (GAME_DESIGN §3), three short first meetings (each pig's heart event 1 is its own scene),
# the pairing under the Century Tower sakura, and the first night at Sakura House.
#
# The intake writes the same flags and facts as the UI's fallback form (ui/meta/content.ts applyIntake):
#   intake.why_uf = computing | medicine | physics | arts | undecided     fact.why_uf = its label
#   intake.sleep  = early | night | nosleep                               fact.sleep  = its label
#   fact.comfort_food (from [input])    intake.done    met_p1 met_p2 met_p3

=== prologue
title: Sakura Campus Days
summary: Gainesville, a Kempa AI intake form, three pigs, and one choice under the Century Tower sakura.
cg: cg_trio_key_visual
---
[nameplate piggy-1 "???"]
[nameplate piggy-2 "???"]
[nameplate piggy-3 "???"]
[fade black 0]
[bg century_tower cut]
[time morning]
[petals light]
[bgm prologue]
[fade clear 1500]
narrator: The bus hisses, pulls away, and leaves you at the edge of campus with a heavy bag and a map you don't trust yet.
[if month = 1]
  narrator: Gainesville, January. It's 48°F, and the whole campus has panicked into parkas.
  narrator: The sakura bloom anyway. They always do.
[elif month = 2]
  narrator: Gainesville, February. Somewhere out there, the pollen is getting ready.
  narrator: The sakura got here first. They always do.
[elif month = 3]
  narrator: Gainesville, March. The azaleas went full pink this week.
  narrator: The sakura took it personally.
[elif month = 4]
  narrator: Gainesville, April. Lovebug season, so keep your mouth closed on the bike.
  narrator: The sakura, for the record, have been blooming the whole time.
[elif month = 5]
  narrator: Gainesville, May. It's 88°F and climbing.
  narrator: The sakura look completely unbothered.
[elif month = 6]
  narrator: Gainesville, June. Blue sky at 3:07, thunderstorm at 3:09.
  narrator: The sakura bloom straight through it.
[elif month = 7]
  narrator: Gainesville, July. The air has the texture of soup.
  narrator: The sakura are thriving. Nobody knows how.
[elif month = 8]
  narrator: Gainesville, August. It's 91°F in the shade, and the shade is also 91°F.
  narrator: The sakura, naturally, are in full bloom.
[elif month = 9]
  narrator: Gainesville, September. Still summer, and it will be summer for a while.
  narrator: The sakura didn't notice.
[elif month = 10]
  narrator: Gainesville, October. Still 85°F.
  narrator: The trees did not get the memo.
[elif month = 11]
  narrator: Gainesville, November. Finally cool enough for a hoodie, for about an hour.
  narrator: The sakura are still blooming. Of course they are.
[else]
  narrator: Gainesville, December. It's 69°F, which the locals are calling winter.
  narrator: The sakura bloom like it's April.
[endif]
narrator: Live oaks drip Spanish moss over the brick paths. Between them, everywhere, sakura.
narrator: They bloom here all year. Nobody knows why, and nobody asks.

# ── the Kempa AI intake form ──
[sfx notify]
narrator: Your phone buzzes. A pink screen slides up: KEMPA AI, Kempanion Program.
narrator: 【KEMPA AI】Welcome to the University of Florida! Let's find your Kempanion.
narrator: 【KEMPA AI】Intake form, question 1 of 4. What should we call you?
[name]
[sfx ui_select]
narrator: 【KEMPA AI】Nice to meet you, {player}!
narrator: 【KEMPA AI】Question 2 of 4. What brings you to UF?
? Computing
  [set intake.why_uf = computing]
  [set fact.why_uf = "Computing"]
  [remember all "why_uf=Computing"]
  [bond piggy-1 +30]
  narrator: 【KEMPA AI】Computing! Malachowsky Hall is the big glass one, with great outlets.
? Medicine & Life Sciences
  [set intake.why_uf = medicine]
  [set fact.why_uf = "Medicine & Life Sciences"]
  [remember all "why_uf=Medicine & Life Sciences"]
  [bond piggy-2 +30]
  narrator: 【KEMPA AI】Medicine & Life Sciences! Please remember to hydrate (a Kempanion insisted we add that).
? Physics & Engineering
  [set intake.why_uf = physics]
  [set fact.why_uf = "Physics & Engineering"]
  [remember all "why_uf=Physics & Engineering"]
  [bond piggy-3 +30]
  narrator: 【KEMPA AI】Physics & Engineering! Fun fact: a physics student rebuilt our pager interface, unprompted.
? Something else...
  narrator: 【KEMPA AI】Tell us more!
  ? Arts & Humanities
    [set intake.why_uf = arts]
    [set fact.why_uf = "Arts & Humanities"]
    [remember all "why_uf=Arts & Humanities"]
    [bond piggy-1 +10]
    [bond piggy-2 +10]
    [bond piggy-3 +10]
    narrator: 【KEMPA AI】Arts & Humanities! Every team needs someone who makes things beautiful.
  ? Still deciding
    [set intake.why_uf = undecided]
    [set fact.why_uf = "Still deciding"]
    [remember all "why_uf=Still deciding"]
    [bond piggy-1 +10]
    [bond piggy-2 +10]
    [bond piggy-3 +10]
    narrator: 【KEMPA AI】Still deciding! That's allowed, and honestly encouraged.
narrator: 【KEMPA AI】Question 3 of 4. Early bird or night owl?
? Early bird.
  [set intake.sleep = early]
  [set fact.sleep = "Early bird"]
  [remember all "sleep=Early bird"]
  [bond piggy-1 +20]
  narrator: 【KEMPA AI】Early bird! Someone you're about to meet agrees with you, loudly.
? Night owl.
  [set intake.sleep = night]
  [set fact.sleep = "Night owl"]
  [remember all "sleep=Night owl"]
  [bond piggy-3 +20]
  narrator: 【KEMPA AI】Night owl! Marston Science Library is open late, and someone you'll meet basically lives there.
? What's sleep?
  [set intake.sleep = nosleep]
  [set fact.sleep = "What's sleep?"]
  [remember all "sleep=What's sleep?"]
  [bond piggy-2 +20]
  narrator: 【KEMPA AI】...Noted. A Kempanion has been notified.
narrator: 【KEMPA AI】Last one, question 4 of 4. What's your comfort food?
[input comfort_food "Comfort food?" "soup"]
[set intake.done]
[sfx success]
narrator: 【KEMPA AI】Thank you, {player}! Your pairing ceremony is today at dusk, under the Century Tower sakura.
narrator: 【KEMPA AI】First stop: the Kempanion booth at the Reitz Union, to pick up your KempaPager. Have fun!
narrator: You open the campus map, turn it sideways, then turn it back.

# ── Plaza of the Americas: Piggy 1 ──
[bg plaza fade]
[time day]
[bgm plaza]
narrator: Twenty minutes later, you are not at the Reitz Union.
narrator: You're on a huge lawn under live oaks, with students napping in hammocks and a map that insists this is fine.
[sfx bell]
narrator: Above the trees, bells start to play. A real carillon, live, for the lunch hour.
narrator: It's beautiful. It does not tell you where the Reitz Union is.
[sfx ball_hit]
[shake 0.2 150]
narrator: Something bonks off your shoe. A white, blue and yellow volleyball rolls to a stop at your feet.
[sfx step]
[show piggy-1 surprised center]
piggy-1 surprised: Heads up! Oh, you already stopped it— nice feet!
piggy-1 happy: Sorry! I was passing against that oak tree, and the oak tree is three and oh this week.
piggy-1 thinking: Wait. Is your map upside down?
player: ...Maybe. I'm looking for a Kempanion booth at the Reitz Union?
piggy-1 excited: The Kempanion booth?! I'm IN that program— you're a new recruit!
piggy-1 happy: Okay, the Reitz is that way. Past Turlington, then left at the Potato.
player: The potato?
piggy-1 laughing: It's a ten-ton rock! Everybody says "meet at the Potato," and you can't miss it.
narrator: You pick up the ball.
? Toss it back underhand.
  [bond piggy-1 +5]
  [sfx ball_hit]
  piggy-1 excited: Ooh, right on target! Soft hands— I'm writing that down.
? Hand it back, very formally.
  [bond piggy-1 +5]
  piggy-1 laughing: A formal handoff! That's a clean API call, right there.
piggy-1 surprised: Wait, is it 12:44? Period six starts at 12:50, and I'm all the way over at Malachowsky!
piggy-1 proud: Six minutes is a tenth of an hour. I can make it.
piggy-1 happy: I'm Piggy 1!
[nameplate piggy-1]
piggy-1 happy: See you at the pairing tonight, teammate— let's goooo!
[hide piggy-1]
[sfx whoosh]
narrator: He sprints off, dribbling the volleyball like a basketball. You're fairly sure that's not how volleyballs work.
[set met_p1]

# ── Reitz Union, the Kempanion booth: Piggy 2, then Piggy 3 ──
[bg reitz fade]
[time day]
[bgm campus_day]
narrator: The Reitz Union, finally. Big windows, two tall banners, and a folding table under a sakura.
narrator: The sign says KEMPANION PROGRAM. Somebody has added, in marker: FIND YOUR PERSON (OR PIG).
narrator: Behind the table, a pig in scrubs is giving every new student a wellness check. The line moves very efficiently.
[show piggy-2@scrubs neutral center]
piggy-2 neutral: Next.
piggy-2 neutral: Name.
player: {player}.
piggy-2 neutral: {player}. Kempa intake form, page one, reviewing now.
[if flag(intake.sleep) = nosleep]
  piggy-2 angry: Sleep schedule: "What's sleep?"
  piggy-2 neutral: Sit down.
  piggy-2 neutral: Sleep is when your brain takes out the trash. The glymphatic system does most of its work at night.
  piggy-2 neutral: Seven hours, minimum. I'm not your doctor, but I'm right.
  piggy-2 neutral: ...You can stand up now.
[endif]
[if flag(fact.comfort_food) = bacon, ham, pork, sausage, sausages, pepperoni, prosciutto, chorizo, salami, carnitas, ribs, "pork chops", "pulled pork", "hot dog", "hot dogs", "bacon and eggs", "cuban sandwich", tonkatsu]
  piggy-2 neutral: Comfort food...
  [wait 700]
  piggy-2 angry: ...Not based.
  [set fact.comfort_food = soup]
  piggy-2 neutral: I'm writing down soup. Soup is always based.
[else]
  piggy-2 neutral: Comfort food: {fact:comfort_food|soup}. Noted.
[endif]
piggy-2 neutral: There's a volleyball scuff on your shoe. You met Piggy 1 at the Plaza.
piggy-2 neutral: Then you walked here, in this heat, without water.
piggy-2 neutral: Mild dehydration. Probable.
[give water_bottle 1]
narrator: He slides a water bottle across the table. It has a label that says WATER, in his handwriting.
piggy-2 neutral: Drink this. Doctor's orders— resident's orders. An attending would co-sign.
? Drink it right now.
  [bond piggy-2 +5]
  [sfx drink]
  piggy-2 happy: Immediate compliance. Based.
? Save it for later.
  [bond piggy-2 +5]
  piggy-2 neutral: Delayed compliance. Acceptable if finished by 1600.
  piggy-2 neutral: That's four o'clock. I'll know.
piggy-2 neutral: I'm Piggy 2. MD, fourth-year neurosurgery resident.
[nameplate piggy-2]
piggy-2 neutral: Research year: fewer surgeries, more lab pigs. So I volunteer here.
piggy-2 happy: The scrubs are for authority.
piggy-2 neutral: Your KempaPager is on its way. A friend is bringing them.
piggy-2 neutral: He's nine minutes late. That's within his normal range.
[sfx step]
[show piggy-2@scrubs neutral left]
[show piggy-3 surprised right]
piggy-3 surprised: Sorry, sorry, I'm here! I'm nine minutes late, which is basically within my normal range.
piggy-2 neutral: I said that.
piggy-3 happy: Oh, nice. We agree.
piggy-3 bashful_smile: I'm Piggy 3, by the way. Probably should've led with that.
[nameplate piggy-3]
piggy-3 happy: Okay, so— you're {player}? This one's yours.
[give kempapager 1]
[sfx sparkle]
narrator: He hands you a little egg-shaped device with a pixel screen. A tiny pink pig blinks up at you.
piggy-3 thinking: Basically the stock UI looked like a microwave clock, so I redid it.
piggy-3 bashful_smile: That's— yeah. That's why I'm late.
piggy-3 happy: The little window—the status window—shows how your Kempanion's doing. Food, energy, clean, fun.
piggy-3 bashful_smile: And I made the petals fall a little slower. It's nicer, you'll see.
? It looks amazing.
  [bond piggy-3 +5]
  piggy-3 shy_blush: Oh. Okay.
  piggy-3 shy_blush: It's not done, the icons are still kind of rough— but thank you. Really.
? What was wrong with microwave clocks?
  [bond piggy-3 +5]
  piggy-3 laughing: Nothing, for a microwave! This one's for a friend, though, so— different requirements.
piggy-2 neutral: Pairing ceremony, dusk, Century Tower. Don't be late.
piggy-3 confused: Was that at me?
piggy-2 neutral: Yes.
[set met_p2]
[set met_p3]

# ── Century Tower at dusk: the pairing ──
[hide all]
[bg century_tower fade]
[time evening]
[bgm campus_evening]
[petals heavy]
narrator: Dusk. Century Tower glows red-gold, and the sakura around it look lit from the inside.
narrator: New students mill around the lawn, clutching brand-new KempaPagers.
[sfx notify]
narrator: 【KEMPA STAFF】Pairing time! You'll pair with one Kempanion, and you'll still see everyone.
narrator: 【KEMPA STAFF】It's a small campus!
[wait 600]
narrator: It is not a small campus.
[show piggy-1 excited left]
piggy-1 excited: Made it! Class, practice and now this— three for three today!
[show piggy-2 neutral center]
narrator: Piggy 2 has changed out of his scrubs. There's still a pen behind his ear.
piggy-2 neutral: Off duty. Mostly.
[show piggy-3 happy right]
piggy-3 happy: Hi again! Is the pager working?
piggy-3 happy: It's working. Okay, good.
# Piggy 3 and his phone. He's already on stage at right, so the face sets the pose: "phone" (holding it out), then
# "phone_mumble" (muttering at it, quiet and fast), then the snap-out. Piggy 1 and Piggy 2 react to the video.
piggy-3 phone: Oh— hey, did you see this on X today?
narrator: He holds his phone out at arm's length. On the screen, a robot hand folds one sock, very slowly.
piggy-1 excited: Whoa! Can it set a volleyball?
piggy-3 phone_mumble: wait, action chunking? Temporal ensembling? Is the foundation model autoregressive or diffusion-based— flow matching? System 1, System 2, Jev, JEPA… receding-horizon sock control… wait, how many action tokens per sock? Is that zero-shot laundry, or did it train on that sock—
piggy-2 neutral: Is it autonomous, or is someone off-camera holding a controller?
piggy-3 phone_mumble: ...wait, is it sped up? Where's the 1x label? Is that a controller in the corner of the—
piggy-3 flustered_blush: Sorry. Phone away. Ceremony first.
piggy-3 thinking: Did you read the Kempa brochure? There's a legend about the big sakura by the tower.
piggy-1 excited: The promise thing!
piggy-3 happy: If two people make a promise under the sakura by Century Tower while the carillon plays at dusk...
piggy-3 bashful_smile: ...the promise blooms forever. Also, the brochure's UI is really bad.
piggy-2 neutral: Unverified. Based, but unverified.
piggy-1 happy: The brochure says there are 1,853 trees, one for 1853. Nobody's ever counted.
piggy-3 thinking: I want to count them. Not tonight, but I want to.
[sfx notify]
narrator: 【KEMPA STAFF】Kempanions, introduce yourselves! Thirty seconds each!
piggy-1 excited: Piggy 1! Computer science, club volleyball, outside hitter— I bring snacks, sunrises and hype!
piggy-2 neutral: Piggy 2, neurosurgery resident at Shands. Fourth year, research year. I bring hydration and perfusion facts, daily.
piggy-3 thinking: Piggy 3, physics, mostly computational. I make... little things.
piggy-3 bashful_smile: Okay, that's— yeah. That's my pitch.
piggy-1 happy: That was great!
piggy-3 shy_blush: It was, like, eight seconds.
[sfx bell]
narrator: Up in the tower, the bells ring the quarter hour. All at once, the petals let go.
[cg cg_trio_key_visual]
[wait 600]
narrator: Three pigs under a sakura, waiting on you. It feels like the first page of something.
[cg off]
narrator: 【KEMPA STAFF】{player}, please choose your Kempanion!
[companion pick]
[if companion = piggy-1]
  [sfx cheer]
  [burst hearts]
  [shake 0.3 200]
  piggy-1 excited: TEAM OF TWO! Let's goooooo!
  piggy-1 happy: Breakfast is at six-thirty. Sunrise practice is optional, but breakfast is not.
  piggy-2 neutral: Defensible choice. Still based.
  piggy-3 happy: Oh— no, totally, that makes sense. Best for what you need, right?
  piggy-3 bashful_smile: ...I'll make you a keychain anyway.
  [bond piggy-1 +10]
[elif companion = piggy-2]
  [sfx heart]
  [burst hearts]
  piggy-2 proud: Patient accepted— partner. I meant partner.
  piggy-2 shy_blush: ...Based.
  piggy-1 happy: Respect! I'm still recruiting you for intramurals.
  piggy-3 happy: Oh— no, totally, that makes sense. Best for what you need, right?
  piggy-3 bashful_smile: ...I'll make you a keychain anyway.
  [bond piggy-2 +10]
[else]
  [sfx sparkle]
  [burst hearts]
  piggy-3 surprised: Wait— me? Okay okay okay.
  piggy-3 bashful_smile: I'm making the home screen so good.
  piggy-1 happy: Respect! I'm still recruiting you for intramurals.
  piggy-2 neutral: Defensible choice. Still based.
  [bond piggy-3 +10]
[endif]
piggy-1 excited: Team dinner? Team dinner— Pig Pen, move out!

# ── Sakura House: home ──
[hide all]
[bg sakura_house fade]
[time night]
[bgm dorm]
[petals normal]
narrator: Sakura House. A creaky co-op a block off University Ave, with a yard sakura that blooms all year.
narrator: All three pigs live here. Your Kempanion's room is right across the hall from yours.
[if companion = piggy-1]
  [show piggy-1 happy center]
  piggy-1 happy: Welcome home, teammate! Lights out at 10:30, and I'm up at six.
  piggy-1 laughing: You don't have to be up at six. But you could, just saying.
[elif companion = piggy-2]
  [show piggy-2 neutral center]
  piggy-2 neutral: Welcome home. I already put water by your bed.
  piggy-2 happy: Goodnight, partner. Patriot.
[else]
  [show piggy-3 happy center]
  piggy-3 happy: Welcome home! Oh— the porch light flickers, but I'm going to fix it.
  piggy-3 bashful_smile: Eventually. Basically eventually.
[endif]
[sfx notify]
narrator: Your KempaPager chirps. On its little screen, {companion} waves at you.
narrator: Keep {companion} fed, rested, clean and happy. Hang out with all three pigs around campus.
narrator: The clock here is real: they eat lunch when you do, and fall asleep when you should. Welcome to the semester.
[end]
