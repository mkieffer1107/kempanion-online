# Campus vignettes: short, repeatable location moments and random daily events (uf-lore.md §5).
# All are repeat: true, chance-gated, priority 1-10 (heart events 50 and trio events 40 always win),
# and replayable: false so the album stays about the story. present= requires that pig to be there now.
# Companion texts use 【NAME】 like the Kempa AI messages in the prologue.

# ───────────────────────── Plaza of the Americas ─────────────────────────

=== campus_foggy_glasses
title: Fogged
trigger: location=plaza; weekday=fri; slot=midday; month=5,6,7,8,9,10; present=piggy-1,piggy-2,piggy-3; chance=0.25
priority: 6
repeat: true
replayable: false
---
[bg plaza fade]
narrator: The four of you step out of a freezing guest lecture into a wall of warm, wet Plaza air.
[sfx whoosh]
[show piggy-1 surprised left]
[show piggy-2 neutral center]
[show piggy-3 confused right]
narrator: Three pairs of glasses fog over at exactly the same moment.
piggy-1 surprised: I'm blind! Teammate, call the ball!
piggy-2 neutral: Condensation: cold lenses, humid air. Physics.
piggy-3 confused: That's my line. That's literally my department.
narrator: All three wipe their glasses on their shirts at the same time. It doesn't help, and it never helps.

=== campus_squirrel_crust
title: Clean Steal
pig: piggy-1
trigger: location=plaza; slot=midday; present=piggy-1; chance=0.2
priority: 4
repeat: true
replayable: false
---
[bg plaza fade]
[show piggy-1 happy center]
narrator: You and Piggy 1 eat lunch on the lawn. You set your sandwich down for one second.
[sfx surprise]
narrator: One second is enough. A Plaza squirrel takes your crust and retreats exactly four feet.
piggy-1 surprised: Block, BLOCK! ...Too late.
narrator: The squirrel eats your crust while maintaining direct eye contact.
piggy-1 angry: Look at it. Look at its face— it knows what it did.
piggy-1 laughing: Okay, respect. Rematch tomorrow, squirrel.
[bond piggy-1 +3]

=== campus_carillon_plaza
title: Bell Setter
pig: piggy-1
trigger: location=plaza; weekday=mon,tue,wed,thu,fri; hour=12; present=piggy-1; chance=0.3
priority: 6
repeat: true
replayable: false
---
[bg plaza fade]
[sfx bell]
narrator: Up in Century Tower, a student starts the lunchtime carillon set. The bells roll across the Plaza.
[show piggy-1 excited center]
piggy-1 excited: The bells! Okay, okay— passing reps on the beat, watch!
[sfx ball_hit]
narrator: He bumps a volleyball straight up on every downbeat. Without knowing it, the carillon is setting for him.
piggy-1 proud: Thirty-two in a row! The carillon is the best setter on campus.
piggy-1 shy: Don't tell my actual setter.
[bond piggy-1 +3]

=== campus_potato
title: Meet at the Potato
pig: piggy-1
trigger: location=plaza; slot=midday; present=piggy-1; chance=0.2
priority: 3
repeat: true
replayable: false
---
[bg plaza fade]
narrator: Somewhere near Turlington, someone yells, "Meet at the Potato!" Three different groups turn around.
[show piggy-1 laughing center]
piggy-1 laughing: Ha, every time! It's a ten-ton rock, and it's still the best meeting spot on campus.
piggy-1 thinking: The plaque says it's thirty million years old, and it's famous because it looks like a potato.
piggy-1 excited: That's a legacy. Goals, honestly.
[bond piggy-1 +3]

# ───────────────────────── Century Tower ─────────────────────────

=== campus_carillon_tower
title: Live at the Tower
trigger: location=century_tower; weekday=mon,tue,wed,thu,fri; hour=12,16; chance=0.35
priority: 6
repeat: true
replayable: false
---
[bg century_tower fade]
[sfx bell]
narrator: Someone has climbed the 194 steps of Century Tower to play a carillon of 61 bells, live.
narrator: The music comes down through the sakura like weather. Students stop walking, and a bike slows down.
narrator: You don't know the tune. You stay for all of it anyway.
narrator: When it ends, somebody on a bench claps, alone. You join in.

=== campus_spooktacular
title: Spooktacular
trigger: location=century_tower; date=10-30,10-31; hour=19-20; chance=0.35
priority: 9
repeat: true
replayable: false
---
[bg century_tower fade]
[time night]
[bgm tension]
narrator: Spooktacular night. From the auditorium beside Century Tower, a pipe organ rumbles something enormous.
[sfx bell]
narrator: Then the carillon answers from above, in a minor key. People in costumes scream, then laugh.
[if companion = piggy-1]
  [show piggy-1 scared center]
  piggy-1 scared: I'm not scared, it's just— the organ is SO LOUD! Why is it in my chest?!
[elif companion = piggy-2]
  [show piggy-2 surprised center]
  piggy-2 surprised: I can feel the low notes in my sternum. Spooky, but based.
[elif companion = piggy-3]
  [show piggy-3 happy center]
  piggy-3 happy: The organ and the bells are in the same key. Somebody arranged this, and I need to know who.
[endif]
narrator: It's the best free concert of the year, and half the audience is dressed as something with fangs.

=== campus_holiday_gator
title: Holiday Gator
trigger: location=century_tower; month=12; slot=dusk,night; chance=0.35
priority: 8
repeat: true
replayable: false
---
[bg century_tower fade]
[time night]
narrator: Near Century Tower, a big steel alligator sculpture glows orange and blue with holiday lights.
narrator: A brass band plays carols. It's 61°F, and everyone is wearing a scarf anyway.
[sfx notify]
[if companion = piggy-1]
  narrator: 【PIGGY 1】is the holiday gator lit?? send pic!! orange AND blue??
[elif companion = piggy-2]
  narrator: 【PIGGY 2】Cocoa is fine, and wear the scarf. Sixty-one degrees is not cold, but wear it.
[elif companion = piggy-3]
  narrator: 【PIGGY 3】the LEDs on that thing are so good. I want to know the controller. bringing you a scarf
[endif]

# ───────────────────────── Marston Science Library ─────────────────────────

=== campus_storm_sprint
title: Blue Sky, Then Not
trigger: location=marston; hour=14-17; month=5,6,7,8,9; chance=0.3
priority: 5
repeat: true
replayable: false
---
[bg marston fade]
[weather storm]
[sfx thunder]
[shake 0.3 300]
narrator: Blue sky. Then, two minutes later, a full Gainesville thunderstorm, sideways and warm.
narrator: You and forty strangers sprint for Marston's doors. Somebody's umbrella flips inside out, and nobody is surprised.
[sfx notify]
[if companion = piggy-1]
  narrator: 【PIGGY 1】rain delay!!! courts closed. hallway sock drills later??
[elif companion = piggy-2]
  narrator: 【PIGGY 2】Saw the radar. Stay inside until thirty minutes after the last thunder, then dry off.
[elif companion = piggy-3]
  narrator: 【PIGGY 3】are you ok?? marston 3rd floor has the good outlets btw <3
[endif]
narrator: Fifteen minutes later, the sun is back out, the sidewalks are steaming, and everyone pretends nothing happened.

=== campus_finals_marston
title: Nobody Has Seen the Sun
pig: piggy-3
trigger: location=marston; slot=night,owl; month=4,5,12; present=piggy-3; chance=0.3
priority: 5
repeat: true
replayable: false
---
[bg marston fade]
[time night]
[bgm library]
narrator: Finals season at Marston. Every outlet is claimed, and every table has someone asleep on a highlighter.
[show piggy-3 neutral center]
piggy-3 neutral: I've been here so long the vending machine knows my order. It's sugar-free Red Bull, it's always sugar-free Red Bull.
piggy-3 thinking: Basically, nobody here has seen the sun since Tuesday. We're nocturnal now, it's fine.
narrator: He hands you a sugar-free Red Bull from his stash without asking. The stash is large.
[give red_bull_sf 1]
[bond piggy-3 +3]

# Gated on Piggy 3's heart event 3 (the first spaghetti print), so this one is a callback.
=== campus_print_spaghetti
title: Spaghetti Family
pig: piggy-3
trigger: location=marston; slot=night; present=piggy-3; seen=p3_h3; chance=0.25
priority: 5
repeat: true
replayable: false
---
[bg marston fade]
[time night]
narrator: In the Marston Makerspace, Piggy 3 is staring at a print bed covered in plastic spaghetti.
[show piggy-3 sad center]
piggy-3 sad: It was a phone stand for Piggy 1. Now it's a spaghetti family.
piggy-3 thinking: First layer didn't stick. Okay— level the bed, clean it, reprint, it's a process.
? Keep the spaghetti one too.
  [bond piggy-3 +5]
  [if flag(p3_spaghetti)]
    piggy-3 shy_blush: ...You're doing the thing again. Okay, you're officially starting a collection.
  [else]
    piggy-3 shy_blush: ...Okay, it can go on the shelf next to the first spaghetti one. They're a family now.
  [endif]
? Reprint it. Piggy 1 needs that stand.
  [bond piggy-3 +3]
  piggy-3 happy: Yeah, he keeps dropping his phone in the sand. Okay, reprinting.
piggy-3 laughing: And if I forget to pick it up for fourteen days, the library gets one more thing for my shelf.

=== campus_observatory
title: Actual Moons
pig: piggy-3
trigger: location=marston; weekday=fri; hour=20-21; present=piggy-3; chance=0.3
priority: 6
repeat: true
replayable: false
---
[bg marston fade]
[time night]
[show piggy-3 excited center]
piggy-3 excited: Okay, so— the campus teaching observatory is open tonight. Free telescopes, like, real ones.
narrator: Ten minutes later, you're in a short line by the space sciences building, waiting for the eyepiece.
narrator: A bright little planet, with a line of even tinier moons beside it.
piggy-3 thinking: That's Jupiter, I think. Wait, I should actually know— okay, I'm checking.
piggy-3 happy: Jupiter, and four moons! That's the coolest thing I've seen all week— don't tell my GPUs.
[bond piggy-3 +3]

# ───────────────────────── Malachowsky Hall & the Physics Building ─────────────────────────

=== campus_sub_sale
title: Code Red
pig: piggy-1
trigger: location=malachowsky; slot=morning,afternoon; present=piggy-1; chance=0.2
priority: 4
repeat: true
replayable: false
---
[bg malachowsky fade]
[bgm malachowsky]
[show piggy-1 excited center]
[sfx surprise]
piggy-1 excited: Teammate, code red! Chicken tender subs are ON SALE this week!
piggy-1 proud: I already bought two, and one's for you. That's not a favor, that's logistics.
[give tender_sub 1]
narrator: He hands you the sub with the solemnity of a jersey ceremony.
[bond piggy-1 +3]

=== campus_hipergator_queue
title: PENDING
pig: piggy-3
trigger: location=physics; slot=morning,midday,afternoon; present=piggy-3; chance=0.3
priority: 5
repeat: true
replayable: false
---
[bg physics_lab fade]
[bgm physics]
[show piggy-3 thinking center]
narrator: Piggy 3 is refreshing a terminal. The job status says PENDING.
[sfx typing]
piggy-3 thinking: It's been pending for two hours. HiPerGator is basically a very large friend who does math while we sleep.
narrator: PENDING, PENDING, PENDING...
[sfx build_ok]
narrator: RUNNING.
piggy-3 excited: It's running! Okay okay okay, don't touch anything— don't even breathe on it.
[bond piggy-3 +3]

# ───────────────────────── Health Science Center ─────────────────────────

=== campus_electrolytes
title: Blame 1965
pig: piggy-2
trigger: location=communicore; slot=morning,midday; present=piggy-2; chance=0.25
priority: 5
repeat: true
replayable: false
---
[bg communicore fade]
[bgm lab]
[show piggy-2 neutral center]
narrator: Piggy 2 spots the sports drink in your hand and sets down his pen.
piggy-2 neutral: Sodium, potassium, sugar, water. Invented here, at this college, in 1965.
piggy-2 neutral: A coach asked the kidney doctors why his players barely needed the restroom during games. Answer: they'd sweated it all out.
piggy-2 happy: So they made a drink, and every sports drink since owes them. Blame 1965— based year.
piggy-2 neutral: Here, have another. You're under-hydrated, and I can tell from here.
[give sideline_sip 1]
[bond piggy-2 +3]

=== campus_anatomy_lab
title: First Teachers
pig: piggy-2
trigger: location=anatomy_lab; slot=afternoon; present=piggy-2; chance=0.25
priority: 4
repeat: true
replayable: false
---
[bg communicore fade]
[bgm stop 800]
[show piggy-2@scrubs neutral center]
narrator: In the hallway outside the anatomy lab, Piggy 2 is gowning up to teach the first-years. He isn't joking today.
piggy-2 neutral: Donors are our first teachers. Someone chose to teach us, after everything.
piggy-2 neutral: So in there, we're quiet, we're careful, and we say thank you. Then we learn everything they're teaching us.
narrator: He nods once, more to himself than to you, and goes in.

=== campus_azaleas
title: Genus Rhododendron
pig: piggy-2
trigger: location=shands; month=2,3; present=piggy-2; chance=0.3
priority: 6
repeat: true
replayable: false
---
[bg shands fade]
[show piggy-2@scrubs neutral center]
narrator: Outside Shands, the azaleas have gone completely, aggressively pink.
piggy-2 neutral: Azaleas. Genus Rhododendron, and every part of the plant is toxic, so don't eat them.
player: I wasn't going to eat them.
piggy-2 shy_blush: ...They're also very pretty. I meant to say that first.
[bond piggy-2 +3]

=== campus_shands_cafecito
title: Forty-Eight Degrees
pig: piggy-2
trigger: location=shands; slot=dawn; month=12,1,2; present=piggy-2; chance=0.3
priority: 6
repeat: true
replayable: false
---
[bg shands fade]
[time morning]
[show piggy-2@scrubs neutral center]
narrator: Before sunrise outside Shands, your breath fogs. Gainesville has panicked into parkas.
narrator: Piggy 2 is holding two tiny cups of cafecito.
piggy-2 neutral: Forty-eight degrees, and my call shift starts in ten. One of these is yours.
piggy-2 happy: Espresso, sugar and cold air: peak perfusion. Based.
[give cafecito 1]
[bond piggy-2 +3]

=== campus_evd_page
title: Zero at the Tragus
pig: piggy-2
trigger: location=shands; slot=afternoon; present=piggy-2; chance=0.2
priority: 4
repeat: true
replayable: false
---
[bg shands fade]
[bgm hospital]
[show piggy-2@scrubs neutral center]
[sfx alarm]
narrator: Piggy 2's pager goes off mid-sentence. He reads it in one glance.
piggy-2 neutral: Neuro ICU. A ventricular drain needs re-leveling. Research year, but today I'm on call.
piggy-2 neutral: You zero it at the tragus, the little flap in front of your ear. Touch yours.
? Touch your tragus.
  [bond piggy-2 +3]
  piggy-2 happy: Good— that lines up with the foramen of Monro, deep inside. Based anatomy.
? Ask what the drain does.
  [bond piggy-2 +3]
  piggy-2 happy: It drains extra fluid around the brain, and it measures the pressure too. Beautiful device.
piggy-2 neutral: I have to go. Patriot.
[hide piggy-2]

# ───────────────────────── Lake Alice ─────────────────────────

=== campus_bats_p3
title: Bat Counter
pig: piggy-3
trigger: location=lake_alice; slot=dusk; present=piggy-3; chance=0.3
priority: 5
repeat: true
replayable: false
---
[bg lake_alice fade]
[time evening]
[show piggy-3 happy center]
piggy-3 happy: Oh, you came! They're about to go, like, any second.
[sfx bats]
narrator: The bat barns breathe out. A dark ribbon of bats unspools over the lake and just keeps going.
piggy-3 thinking: I tried to count them with a little script. Frame differencing on a video, basically.
piggy-3 laughing: It crashed at forty thousand. The bats won.
[bond piggy-3 +3]

=== campus_bats_p2
title: Cardiac Output
pig: piggy-2
trigger: location=lake_alice; slot=dusk; weekday=sun; present=piggy-2; chance=0.35
priority: 6
repeat: true
replayable: false
---
[bg lake_alice fade]
[time evening]
[show piggy-2 neutral center]
piggy-2 neutral: Sunday. My one evening off, and I spend it here.
[sfx bats]
narrator: The barns empty into the sky. Piggy 2 watches like it's the best monitor in the hospital.
piggy-2 happy: A small bat's heart can pass a thousand beats a minute in flight. Imagine the cardiac output.
piggy-2 bashful_smile: ...Based. Every single one of them.
[bond piggy-2 +3]

=== campus_gator_basking
title: Rule Number One
trigger: location=lake_alice; slot=morning,midday,afternoon; chance=0.3
priority: 4
repeat: true
replayable: false
---
[bg lake_alice fade]
narrator: On the far bank, a big alligator is basking in the sun, mouth slightly open, deeply unbothered.
narrator: Lake Alice rule number one: never feed the gators. A fed gator stops being afraid of people, and that never ends well.
[sfx notify]
[if companion = piggy-1]
  narrator: 【PIGGY 1】is it big?? how big. in volleyballs
[elif companion = piggy-2]
  narrator: 【PIGGY 2】Do not approach, do not feed, and do not attempt a neuro exam.
[elif companion = piggy-3]
  narrator: 【PIGGY 3】okay we should name it. wait no. we don't get attached to the gator
[endif]
narrator: The gator does not move for twenty minutes. Honestly, a role model.

# ───────────────────────── Sand courts, stadium ─────────────────────────

=== campus_lovebugs
title: Committed
pig: piggy-1
trigger: location=volleyball_courts; slot=dusk; month=4,5,8,9; present=piggy-1; chance=0.3
priority: 6
repeat: true
replayable: false
---
[bg volleyball_courts fade]
[time evening]
[show piggy-1 confused center]
narrator: Lovebug season. A pair of lovebugs, stuck together end to end, lands on Piggy 1's glasses and stays.
piggy-1 confused: Um, hi? Could you two maybe— no, okay.
piggy-1 shy_blush: They're really committed. Honestly, that's great teamwork.
narrator: He finishes the entire serving drill like that. They stay for all of it.
[bond piggy-1 +3]

# Gated on Piggy 1's heart event 3 (the first look at his uniform).
=== campus_sunrise_serves
title: Fifty Serves
pig: piggy-1
trigger: location=volleyball_courts; slot=dawn; present=piggy-1; seen=p1_h3; chance=0.3
priority: 5
repeat: true
replayable: false
---
[bg volleyball_courts fade]
[time morning]
[bgm piggy1_theme]
[show piggy-1@volleyball happy center]
narrator: Sunrise at the sand courts. Piggy 1 is already in uniform, working through a whole cart of balls.
[sfx spike]
piggy-1 happy: Forty-eight... forty-nine...
[sfx spike]
piggy-1 laughing: FIFTY! Morning, teammate!
piggy-1 happy: Help me collect the balls? Serving's fun, but collecting is teamwork.
[bond piggy-1 +3]

=== campus_gator_walk
title: Gator Walk
pig: piggy-1
trigger: location=stadium; weekday=sat; slot=afternoon; month=9,10,11; present=piggy-1; chance=0.3
priority: 7
repeat: true
replayable: false
---
[bg stadium fade]
[bgm stadium]
[sfx cheer]
narrator: A couple of hours before kickoff, fans line the road outside the Swamp. The band plays as the team bus pulls up.
[show piggy-1 excited center]
piggy-1 excited: Gator Walk! Hooves out, teammate— high-five every single player!
narrator: The team walks the gauntlet. Piggy 1 high-fives every hand that passes, then counts on his hooves.
piggy-1 proud: Twenty-three high fives, new personal record! My hooves are numb!
piggy-1 happy: Here, team snack. Oranges are game-day fuel.
[give oranges 1]
[bond piggy-1 +3]

=== campus_boiled_peanuts
title: Peanuts That Gave Up
trigger: location=stadium; weekday=sat; month=9,10,11; present=piggy-1,piggy-2; chance=0.25
priority: 6
repeat: true
replayable: false
---
[bg stadium fade]
narrator: Outside the stadium, a vendor is selling boiled peanuts out of a steaming pot.
[show piggy-2 happy left]
piggy-2 happy: Boiled peanuts: salt, water, patience. Very based.
[show piggy-1 confused right]
piggy-1 confused: They're... wet peanuts. They're peanuts that gave up.
piggy-2 neutral: They're peanuts that achieved hydration. Something you could learn from.
narrator: Piggy 2 buys you a cup. Piggy 1 eats exactly one, for the team, and makes a face for a full minute.
[give boiled_peanuts 1]

# ───────────────────────── Reitz Union, Midtown, Sakura House ─────────────────────────

=== campus_tabling
title: The Tabling Gauntlet
trigger: location=reitz; weekday=mon,tue,wed,thu; slot=midday,afternoon; chance=0.2
priority: 3
repeat: true
replayable: false
---
[bg reitz fade]
narrator: Outside the Reitz, the club tables are out in force: anime club, rocket club, three different a cappella groups.
narrator: You walk the gauntlet. You come out the other side with two flyers, a sticker, a free T-shirt and, somehow, a bag of oranges.
[give oranges 1]
[sfx notify]
narrator: 【KEMPA AI】Reminder: you can't eat flyers. You can eat oranges, which Piggy 1 calls TEAM SNACK.

=== campus_claw_machine
title: Claw Machine Clinic
trigger: location=reitz; weekday=sun; present=piggy-2,piggy-3; chance=0.3
priority: 6
repeat: true
replayable: false
---
[bg reitz fade]
narrator: Sunday at the Reitz game room. Piggy 3 is studying a claw machine like it's a research paper.
[show piggy-3 thinking right]
piggy-3 thinking: Okay, so the grip strength is probably randomized. Basically, you're paying for a probability, not a plushie.
[show piggy-2 neutral left]
piggy-2 neutral: Steady hoof, controlled descent. Same as any procedure.
[sfx success]
narrator: Piggy 2 wins a pink plush pig on his very first try.
piggy-3 surprised: First try?! That's— statistically, that's so rude.
piggy-2 shy_blush: For you. ...Based.
[bond piggy-2 +3]
[bond piggy-3 +3]

=== campus_hogtown
title: Hogtown
pig: piggy-1
trigger: location=midtown; slot=night; present=piggy-1; chance=0.25
priority: 5
repeat: true
replayable: false
---
[bg midtown fade]
[time night]
[bgm midtown]
narrator: University Ave after dark: neon, pizza, and a shop sign with HOGTOWN painted across it.
[show piggy-1 excited center]
piggy-1 excited: HOGTOWN! Teammate, look— they named the whole town after us!
narrator: A passing history major explains: Hogtown was a Seminole village nearby, known for its hogs, long before the city grew around it.
piggy-1 thinking: Oh, so the name's way older than us. That's actually really cool.
piggy-1 happy: Still feels nice to be in Hogtown, though.
[bond piggy-1 +3]

=== campus_ice_cream
title: Twenty-Five Flavors
pig: piggy-3
trigger: location=midtown; weekday=sat; slot=night; present=piggy-3; chance=0.25
priority: 5
repeat: true
replayable: false
---
[bg midtown fade]
[time night]
narrator: An ice cream shop on University Ave. Twenty-five vegan flavors, chalked on a board.
[show piggy-3 thinking center]
piggy-3 thinking: Okay, so there's twenty-five flavors. Best for what, though— first scoop, or with espresso?
piggy-3 confused: Wait, you can pour espresso over the scoop? That changes the whole comparison.
narrator: Twenty minutes later, he orders the first flavor on the board. It's great.
piggy-3 happy: I got you the same one. You're the control group.
[give vegan_ice_cream 1]
[bond piggy-3 +3]

=== campus_yard_sakura
title: Petal Count
pig: piggy-1
trigger: location=dorm; slot=night; present=piggy-1; chance=0.25
priority: 4
repeat: true
replayable: false
---
[bg sakura_house fade]
[time night]
[bgm dorm]
narrator: Night at Sakura House. You sit on the porch steps under the yard sakura, and petals keep landing in your drink.
[show piggy-1 happy center]
piggy-1 happy: Bonus petal! That's your fourth and my sixth— we're keeping score, right?
narrator: A petal lands on his snout. He goes cross-eyed looking at it.
piggy-1 laughing: Seven! Does that count— that counts.
[bond piggy-1 +3]
