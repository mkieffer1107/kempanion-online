# Home: the first-hub tutorial, the welcome-back party, the 7th-stamp party, Kempanion-only home moments
# (4 per pig) and the switch-companion moving gags.
#
# Home moments are repeatable hub scenes, chance-gated to hours when the pig is awake (present=) and
# usually home. The first viewing plays the full moment; later ones play a short callback that counts
# up a flag (home_<pig>_<moment>_n). Album replays always show the full version.

# ───────────────────────── system scenes ─────────────────────────

=== tutorial_hub
title: KempaPager Basics
summary: Your Kempanion walks you through the KempaPager.
trigger: location=hub; seen!=tutorial_hub
priority: 100
replayable: false
---
[if companion = piggy-1]
  [bg home_p1 fade]
  [bgm piggy1_theme]
  [show piggy-1 excited center]
  piggy-1 excited: Team huddle, first day on the KempaPager! Look, that's me— tiny me!
  piggy-1 happy: Top row: FEED and DRINK. I burn fuel 1.2 times faster than average, and yes, I did the math.
  piggy-1 happy: PLAY is ball time. WASH is a bath or brushing teeth, because sand gets EVERYWHERE.
  piggy-1 thinking: Bottom row: LIGHT is lights-out. Tuck me in around 10:30 and I'm up for sunrise practice.
  piggy-1 sad: CARE is medicine, in case a cold benches me. It's rare— I'm very durable.
  piggy-1 happy: TALK is us, talking. STATS is my numbers: needs, hearts, all of it.
  piggy-1 excited: Acorns are money! Daily stamp, tasks, mini-games, and golden petals— tap those when they float by.
  piggy-1 proud: Oh, and you can tap me. Or pet me, which is not required, but highly recommended.
  piggy-1 happy: Last thing: the clock's real. When it's lunch for you, it's lunch for me.
  ? Got it, Coach.
    [bond piggy-1 +5]
    piggy-1 flustered_blush: Coach?! Okay, I like that way too much.
    piggy-1 excited: Let's goooo!
  ? Can I pet you now?
    [bond piggy-1 +5]
    [sfx pet]
    [burst hearts]
    piggy-1 shy_blush: H-hey, I wasn't in ready position!
    piggy-1 bashful_smile: ...Okay. Ten out of ten form.
[elif companion = piggy-2]
  [bg home_p2 fade]
  [bgm piggy2_theme]
  [show piggy-2 neutral center]
  piggy-2 neutral: Orientation. Five minutes, then you hydrate.
  piggy-2 neutral: The KempaPager is my chart. You're the attending now.
  piggy-2 neutral: FEED and DRINK: nutrition and fluids. I forget both, which is where you come in.
  piggy-2 happy: PLAY: recreation, which lowers cortisol. Based.
  piggy-2 neutral: WASH: bath and teeth. The sterile field starts at home.
  piggy-2 neutral: LIGHT: sleep. In bed at 2200, up at 0500 for rounds.
  piggy-2 thinking: CARE: medicine. If I get sick, I'll claim I'm fine— overrule me.
  piggy-2 neutral: TALK is conversation. STATS are my vitals, so read them like a chart.
  piggy-2 neutral: Acorns are currency: daily stamp, tasks, mini-games, golden petals. Spend them on food.
  piggy-2 shy: Ideally apple pie. That's not a request, it's a clinical observation.
  piggy-2 neutral: Also, you may pat my head. Cranial nerves will report favorably.
  ? Understood, Doctor.
    [bond piggy-2 +5]
    piggy-2 flustered_blush: Doctor? I'm not— not yet.
    piggy-2 shy_blush: ...Based. Very based.
  ? Pat his head.
    [bond piggy-2 +5]
    [sfx pet]
    [burst hearts]
    piggy-2 shy_blush: ...Highly acceptable. Continue, for science.
[else]
  [bg home_p3 fade]
  [bgm piggy3_theme]
  [show piggy-3 happy center]
  piggy-3 happy: Okay, so— this is the home screen. I redid it, so everything's a little icon, like the old LCD toys.
  piggy-3 thinking: Top row is FEED, DRINK, PLAY, WASH. Bottom row is LIGHT, CARE, TALK, STATS.
  piggy-3 sad: FEED and DRINK are food and drinks. I forget to eat when a build's running, so... yeah, please.
  piggy-3 happy: PLAY is play. WASH is a bath or teeth, because there's usually PLA dust in my curls.
  piggy-3 thinking: LIGHT is lights-out. I'm a night owl, like, after midnight, so don't tuck me in at nine.
  piggy-3 happy: CARE is medicine, TALK is talking, and STATS has the actual numbers. I made the bars chunky so they're readable.
  piggy-3 excited: Acorns are the currency: stamps, tasks, mini-games, and golden petals. Tap those, that part's my favorite.
  piggy-3 bashful_smile: Oh, and you can tap me, or pet me, or— okay. That's the whole tutorial.
  piggy-3 thinking: Wait, was that clear? Actually, I could make a shorter version.
  ? It was perfect.
    [bond piggy-3 +5]
    piggy-3 shy_blush: Okay. Perfect is a lot, but— okay, I'll take it.
  ? Can I pet you now?
    [bond piggy-3 +5]
    [sfx pet]
    [burst hearts]
    piggy-3 flustered_blush: Oh— um, hi. That's... really nice, actually.
[endif]
[sfx notify]
narrator: 【KEMPA AI】Tutorial complete! Your Kempanion is now in your care (no pressure).

# Right after the KempaPager tutorial (and once for saves that already saw it), if you said yes to the Big Brain at the
# title screen: your Kempanion points at the brain chip ("here's how you can make me smarter"). The hub mirrors the
# title-screen answer into flag bigbrain = accepted just before it looks for scenes (no answer or "no" = no chip, no
# tutorial). It ends by setting tut.big_brain_coach, and the hub pulses an arrow on the chip until you tap it.
=== tutorial_big_brain
title: Make Me Smarter
summary: Your Kempanion shows you the Big Brain chip.
trigger: location=hub; seen=tutorial_hub; seen!=tutorial_big_brain; flag=bigbrain; !flag=bigbrain_unsupported
priority: 99
replayable: false
---
[if companion = piggy-1]
  [bg home_p1 fade]
  [bgm piggy1_theme]
  [show piggy-1 thinking center]
  piggy-1 thinking: Oh, wait— one more play before you go!
  piggy-1 happy: See the little brain chip, top of the screen? That's how you make me smarter. Big Brain!
  piggy-1 excited: You said yes at the start, so Piggy 3's been installing it. Tap the brain to check how it's going!
  piggy-1 happy: Once it says BIG, I can actually think about what you say, instead of running my usual playbook.
  piggy-1 thinking: And it all runs right here on your device. Nothing gets sent anywhere. Piggy 3 made me say that part.
[elif companion = piggy-2]
  [bg home_p2 fade]
  [bgm piggy2_theme]
  [show piggy-2 neutral center]
  piggy-2 neutral: One more item before orientation ends.
  piggy-2 neutral: Top of the screen: the brain chip. That's how you make me smarter.
  piggy-2 neutral: You consented to the Big Brain at the start. Tap the chip to monitor the install.
  piggy-2 happy: Once it reads BIG, I can actually think about what you say. Higher cognition. Based.
  piggy-2 shy: I've put electrodes in a lot of pig brains. Nobody's ever upgraded mine. ...Thank you.
[else]
  [bg home_p3 fade]
  [bgm piggy3_theme]
  [show piggy-3 thinking center]
  piggy-3 thinking: Okay, so— one more thing. I built this part, so I'm kind of excited about it.
  piggy-3 happy: See the little brain up top? That's how you make me smarter. It's the Big Brain.
  piggy-3 excited: You said yes at the start, so it's installing! Tap it to see the progress bar. I made it chunky.
  piggy-3 thinking: It basically runs right in your browser, on your graphics card. Nothing gets sent anywhere.
  piggy-3 bashful_smile: When it says BIG, I can actually keep up with you. In conversation, I mean.
[endif]
[set tut.big_brain_coach]
[sfx notify]
narrator: 【KEMPA AI】Tip: tap the brain chip at the top of the screen to check on your Kempanion's Big Brain.

# Played when the pet sim reports an absence of more than 72 h (it sets welcome_party_ready, tops up needs and
# adds the 100 acorns). This scene consumes the flag.
=== welcome_back
title: Welcome-Back Party
summary: You were gone for a few days. Sakura House noticed.
trigger: location=hub; flag=welcome_party_ready
priority: 95
replayable: false
---
[unset welcome_party_ready]
[bg sakura_house fade]
[petals heavy]
[if hour >= 23 || hour < 5]
  [time night]
  [bgm sleep]
  narrator: Sakura House, very late. The porch light is on, and there are streamers on the railing.
  narrator: A hand-painted banner sags over the door: WELCOME BACK {player}!!
  narrator: Underneath it, on the porch swing, three pigs have fallen asleep in a heap, waiting up for you.
  [show piggy-1 sleepy left]
  [show piggy-2 sleepy center]
  [show piggy-3 sleepy right]
  piggy-1 sleepy: ...mm. Is that— YOU'RE BACK! Team huddle, everybody—
  piggy-2 sleepy: Shh. It's the middle of the night, so party at a reasonable hour.
  piggy-2 sleepy: ...Welcome back. Based.
  piggy-3 sleepy: We made a little welcome-back thing. It has streamers, you'll see in the morning...
  [sfx zzz]
  [burst zzz]
  narrator: Three snores, slightly out of sync. You fetch a blanket for the swing and leave the porch light on.
[else]
  [bgm happy]
  narrator: You come up the path to Sakura House and stop.
  narrator: There are streamers on the porch railing, and a hand-painted banner: WELCOME BACK {player}!!
  [sfx cheer]
  [show piggy-1 excited left]
  piggy-1 excited: YOU'RE BACK! Team huddle, everybody in!
  [show piggy-2 neutral center]
  piggy-2 neutral: Patient has returned after a prolonged absence. Prognosis: party.
  [show piggy-3 happy right]
  piggy-3 happy: Okay, so we made a little welcome-back thing. It has streamers, and I printed the streamers.
  piggy-1 laughing: You can't print streamers! ...Wait, he printed streamers.
  piggy-2 neutral: We also made {fact:comfort_food|soup}. It's in your chart as your comfort food.
  piggy-2 happy: Sit and eat. Doctor's orders.
  narrator: Somebody turns the music on. Somebody else turns it down, and Piggy 1 turns it back up.
  ? It's good to be home.
    [bond piggy-1 +5]
    [bond piggy-2 +5]
    [bond piggy-3 +5]
    piggy-1 happy: It's good to HAVE you home! The house is way too quiet without our fourth.
    piggy-3 bashful_smile: Yeah. It was weird, like a missing-semicolon kind of weird.
  ? Did you guys miss me?
    [bond piggy-1 +5]
    [bond piggy-2 +5]
    [bond piggy-3 +5]
    piggy-1 happy: Obviously! I kept your spot on the porch swing warm— literally, I sat in it.
    piggy-2 shy_blush: ...Your absence was noted. Daily, in the chart.
[endif]
narrator: While you were away, the pigs kept your KempaPager ticking. Everyone's fed, rested and very glad you're back.
narrator: They saved you leftovers, too: oranges, a slice of apple pie, and a melonpan with one bite missing.
[give oranges 1]
[give apple_pie 1]
[give melonpan 1]
narrator: On your bed there's a bag of acorns with a note: 100, COUNTED TWICE. —P1
[bond piggy-1 +10]
[bond piggy-2 +10]
[bond piggy-3 +10]

# The pet sim sets stamp_party_ready on every 7th login stamp; this plays on the next hub visit.
=== home_stamp_party
title: Seven Stamps
summary: A full stamp card, and the pigs made it a party.
trigger: location=hub; flag=stamp_party_ready
priority: 80
repeat: true
replayable: false
---
[unset stamp_party_ready]
[set stamp_parties += 1]
[bg sakura_house fade]
[bgm happy]
[petals heavy]
[jingle daily_bonus]
narrator: Your KempaPager plays a tiny fanfare. Seven stamps on the card.
[show piggy-1 excited left]
piggy-1 excited: SEVEN, a full card! That's card number {flag:stamp_parties|1}, and I'm tracking it.
[show piggy-2 neutral center]
piggy-2 neutral: Seven check-ins. Compliance: excellent.
[show piggy-3 happy right]
piggy-3 happy: I made a little stamp for the card. Okay, I made a stamp-shaped cake.
narrator: It is a cake shaped like a stamp. GOOD JOB is piped across it in pink frosting, and the B is a little crooked.
piggy-3 bashful_smile: The B was the hard part. Basically, B's are hard.
piggy-1 happy: Photo! Everybody squeeze in!
[sfx camera]
[flash #ffffff 120]
narrator: Four faces, one cake, and Piggy 2's hoof caught mid-salute.
piggy-2 happy: Based.
[bond piggy-1 +10]
[bond piggy-2 +10]
[bond piggy-3 +10]

# Re-pairing (Profiles, once a day): 3-line moving gags. Scene ids use _ for the pig id's dash:
# switch_companion_piggy_1 = `switch_companion_${pig.replace('-', '_')}`.
=== switch_companion_piggy_1
title: Moving Day (Piggy 1)
pig: piggy-1
summary: Piggy 1 moves across the hall in one trip.
replayable: false
---
[bg sakura_house fade]
[sfx door]
narrator: Moving day. Piggy 1 crosses the hall in one trip, carrying everything he owns.
narrator: Everything he owns is four volleyballs, a laptop, and zero pillows.
[show piggy-1 excited center]
piggy-1 excited: Pillows are just slow volleyballs, teammate. TEAM OF TWO!

=== switch_companion_piggy_2
title: Moving Day (Piggy 2)
pig: piggy-2
summary: Piggy 2 moves across the hall with a brain model and eleven water bottles.
replayable: false
---
[bg sakura_house fade]
[sfx door]
narrator: Moving day. Piggy 2 crosses the hall cradling a brain model like a newborn.
narrator: Then come the water bottles: eleven of them, all labeled by date.
[show piggy-2 proud center]
piggy-2 proud: Hydration is perfusion. Patient accepted— partner, I meant partner.

=== switch_companion_piggy_3
title: Moving Day (Piggy 3)
pig: piggy-3
summary: Piggy 3 needs three trips to move across the hall.
replayable: false
---
[bg sakura_house fade]
[sfx door]
narrator: Moving day takes Piggy 3 three trips.
narrator: He owns a printer, a printer, and a smaller printer.
[show piggy-3 bashful_smile center]
piggy-3 bashful_smile: The small one's for you. Okay okay okay, I'm making the home screen so good.

# ───────────────────────── Piggy 1 home moments ─────────────────────────

=== home_p1_brush
title: Two-Minute Drill
pig: piggy-1
summary: Brushing teeth side by side with Piggy 1, who calls the quadrants.
trigger: location=hub; companion=piggy-1; present=piggy-1; hour=22; weekday=sun,mon,tue,wed,thu; chance=0.3
priority: 12
repeat: true
---
[set home_p1_brush_n += 1]
[bg home_p1 fade]
[time night]
[bgm dorm]
[if replay || flag(home_p1_brush_n) = 1]
  narrator: {time}. You and Piggy 1 reach the hall sink at the same moment, toothbrushes in hand.
  [show piggy-1 happy center]
  piggy-1 happy: Brushing buddy! Two minutes, thirty seconds a quadrant, and I'll call it.
  piggy-1 excited: Top left! Go!
  [sfx brush]
  narrator: He brushes like it's a drill. To him, it is a drill.
  piggy-1 excited: Top right! Bottom left!
  piggy-1 laughing: Bottom right! Tongue— don't forget tongue!
  [sfx brush]
  [burst bubbles]
  piggy-1 proud: And... time! I'd give us a 9.5, because you splashed a little.
  ? Rematch tomorrow. I'm going for a ten.
    [bond piggy-1 +8]
    piggy-1 excited: Oh, it's ON. Same sink, same time!
  ? You splashed more than me.
    [bond piggy-1 +6]
    piggy-1 laughing: Okay, fair. Replay review says... we both splashed.
  piggy-1 sleepy: Lights out soon. Sunrise comes early— it always does.
[else]
  narrator: {time}. Piggy 1 is already at the sink, toothbrush raised like a starting pistol.
  [show piggy-1 excited center]
  piggy-1 excited: Brushing session number {flag:home_p1_brush_n|2}! Two minutes— go!
  [sfx brush]
  [burst bubbles]
  piggy-1 sleepy: ...and time. Same sink tomorrow, teammate.
  [bond piggy-1 +2]
[endif]
[need piggy-1 hygiene +10]

=== home_p1_yawn
title: Broadcast Yawn
pig: piggy-1
summary: A contagious yawn in the hallway at dawn.
trigger: location=hub; companion=piggy-1; present=piggy-1; hour=6-7; weekday=sun,mon,wed,fri; chance=0.35
priority: 12
repeat: true
---
[set home_p1_yawn_n += 1]
[bg sakura_house fade]
[time morning]
[bgm morning]
[if replay || flag(home_p1_yawn_n) = 1]
  narrator: {time}. You stumble into the hallway, and Piggy 1 is already there, stretching like a sunrise.
  [show piggy-1 excited center]
  piggy-1 excited: Morning, teammate! I've been up eleven minutes and I'm already at a hundred perc—
  piggy-1 sleepy: ...hhhaaaaah.
  narrator: He yawns, enormously. You yawn back before you can stop yourself.
  piggy-1 surprised: You caught it! Yawns are contagious, like a broadcast message.
  narrator: He yawns again. So do you.
  piggy-1 laughing: It's an infinite loop! Somebody break the loop!
  ? Break the loop with a high five.
    [bond piggy-1 +8]
    [sfx ball_hit]
    piggy-1 happy: Up top! Loop terminated— good morning, for real.
  ? Yawn one more time, on purpose.
    [bond piggy-1 +6]
    piggy-1 sleepy: Nooo, you're— hhhaaah. That's cheating.
    piggy-1 happy: Okay, breakfast. Then sunrise.
[else]
  narrator: {time}, the hallway. Piggy 1 sees you and yawns before he can even say good morning.
  [show piggy-1 sleepy center]
  narrator: You yawn back. It's tradition now.
  piggy-1 laughing: Broadcast received! That's yawn number {flag:home_p1_yawn_n|2}.
  [bond piggy-1 +2]
[endif]
[need piggy-1 energy +5]

=== home_p1_rain
title: Rain Delay
pig: piggy-1
summary: An afternoon storm cancels practice. Piggy 1 takes it hard, briefly.
trigger: location=hub; companion=piggy-1; present=piggy-1; hour=14-18; month=5,6,7,8,9,10; chance=0.2
priority: 10
repeat: true
---
[set home_p1_rain_n += 1]
[bg sakura_house fade]
[weather storm]
[sfx thunder]
[shake 0.3 300]
[if replay || flag(home_p1_rain_n) = 1]
  [bgm comedy]
  narrator: One minute, blue sky; the next, a Gainesville thunderstorm. Practice is canceled.
  narrator: You find Piggy 1 face down on the porch swing, still wearing his knee pads.
  [show piggy-1 sad center]
  piggy-1 sad: Lightning within ten miles, so the courts are closed. Season over, career over.
  piggy-1 sad: Okay, not career over. Day over.
  ? We just lost a point. Not the set.
    [bond piggy-1 +10]
    piggy-1 surprised: Hey. That's MY line.
    piggy-1 happy: ...It works way better when somebody says it back. Okay— next rally.
  ? Indoor drills?
    [bond piggy-1 +6]
    piggy-1 excited: Indoor drills, yes! I have a rolled-up sock and a hallway!
  narrator: Ten minutes later, you're passing a rolled-up sock back and forth down the hallway. He keeps stats.
  piggy-1 proud: Forty-one in a row, new hallway record. Rain can't stop a real team.
[else]
  [bgm happy]
  narrator: Thunder again. The rolled-up sock comes out without anyone saying a word.
  [show piggy-1 excited center]
  piggy-1 excited: Rain delay number {flag:home_p1_rain_n|2}! Sock drills— beat forty-one!
  [bond piggy-1 +2]
[endif]
[need piggy-1 fun +10]

=== home_p1_snack
title: The Pink Secret
pig: piggy-1
summary: A late knock on your door, and a protein shake that is definitely not strawberry milk.
trigger: location=hub; companion=piggy-1; present=piggy-1; hour=20-21; weekday=sun,mon,tue,wed,thu; chance=0.25
priority: 12
repeat: true
---
[set home_p1_snack_n += 1]
[bg dorm fade]
[time night]
[bgm dorm]
[sfx door]
[if replay || flag(home_p1_snack_n) = 1]
  narrator: {time}. A knock on your door: Piggy 1, holding something behind his back.
  [show piggy-1 shy_blush center]
  piggy-1 shy_blush: Hey, hi! I was just getting a protein shake, for recovery— very serious athlete stuff.
  narrator: The thing behind his back is a strawberry milk. It is extremely pink.
  piggy-1 flustered_blush: Okay, it's strawberry milk! It has protein AND calcium, and it's— it's pink, okay?
  piggy-1 shy: Don't tell the team. They think I run on sports drinks and willpower.
  ? Your secret's safe with me.
    [bond piggy-1 +10]
    piggy-1 affectionate_blush: ...Best teammate, seriously. I got you one too.
    [give strawberry_milk 1]
  ? Can I have some?
    [bond piggy-1 +8]
    piggy-1 laughing: Ha, I knew it! I bought two— team snack!
    [give strawberry_milk 1]
  narrator: You drink strawberry milk in the doorway while he walks you through his serve stats, all of them.
[else]
  narrator: {time}: two knocks, a pause, one knock. That's the strawberry milk knock.
  [show piggy-1 bashful_smile center]
  piggy-1 bashful_smile: Recovery snack number {flag:home_p1_snack_n|2}. Still a secret, still pink.
  [bond piggy-1 +2]
[endif]
[need piggy-1 hunger +10]

# ───────────────────────── Piggy 2 home moments ─────────────────────────

=== home_p2_brush
title: Scrub Technique
pig: piggy-2
summary: Brushing teeth with Piggy 2, at surgical precision, just before 2200.
trigger: location=hub; companion=piggy-2; present=piggy-2; hour=21; chance=0.3
priority: 12
repeat: true
---
[set home_p2_brush_n += 1]
[bg home_p2 fade]
[time night]
[bgm dorm]
[if replay || flag(home_p2_brush_n) = 1]
  narrator: {time}. Piggy 2 gets back from Marston at a brisk walk, heads straight for the sink, and hands you a toothbrush.
  [show piggy-2 neutral center]
  piggy-2 neutral: Two minutes. Forty-five degrees to the gumline, small circles.
  piggy-2 thinking: Surgeons scrub their hands for— actually, you don't want to hear about surgical scrub technique.
  ? I kind of do.
    [bond piggy-2 +10]
    piggy-2 surprised: ...You do?
    piggy-2 happy: Hands to elbows, every surface, a set count of strokes— it's a ritual. Based.
  ? Small circles. Got it.
    [bond piggy-2 +6]
    piggy-2 happy: Good form. You'd pass inspection.
  [sfx brush]
  [burst bubbles]
  narrator: You brush side by side. He keeps perfect time without looking at a clock.
  piggy-2 sleepy: Bed at 2200, so goodnight. Patriot.
[else]
  narrator: {time}. Piggy 2 hands you a toothbrush without a word: brushing protocol, night {flag:home_p2_brush_n|2}.
  [show piggy-2 neutral center]
  [sfx brush]
  [burst bubbles]
  piggy-2 happy: Technique: excellent. You're a true patriot.
  [bond piggy-2 +2]
[endif]
[need piggy-2 hygiene +10]

=== home_p2_yawn
title: 0500
pig: piggy-2
summary: Pre-rounds, a contagious yawn, and five minutes on the stairs.
trigger: location=hub; companion=piggy-2; present=piggy-2; hour=5-6; chance=0.35
priority: 12
repeat: true
---
[set home_p2_yawn_n += 1]
[bg home_p2 fade]
[time morning]
[bgm morning]
[if replay || flag(home_p2_yawn_n) = 1]
  narrator: {time}. You get up for water, and Piggy 2 is already in the hallway in scrubs, coffee in hoof.
  [show piggy-2@scrubs neutral center]
  piggy-2 neutral: Morning. Pre-rounds at Shands, and you're up early.
  narrator: He yawns: a small, controlled, clinical yawn. You yawn back.
  piggy-2 surprised: Don't. If you yawn, I yawn, and then we both lose perfusion to the jaw.
  narrator: He yawns again. So do you.
  piggy-2 laughing: Stop that. Contagious yawning is real, and the literature is... yawning.
  ? Sit for five minutes first. Rounds can wait five minutes.
    [bond piggy-2 +10]
    piggy-2 neutral: Rounds can't—
    piggy-2 shy_blush: ...Five minutes. Clinically justified.
    narrator: He sits on the stairs. By minute three, his head is on your shoulder.
    narrator: You wake him at minute five, as promised.
  ? Pour him a cafecito for the walk.
    [bond piggy-2 +6]
    [sfx drink]
    piggy-2 happy: Espresso and sugar— based. You're a true patriot.
[else]
  narrator: {time}. Piggy 2 is in the hallway in scrubs, and you both yawn on cue.
  [show piggy-2@scrubs neutral center]
  piggy-2 neutral: Yawn number {flag:home_p2_yawn_n|2}. Mirror neurons, possibly, or friendship.
  [bond piggy-2 +2]
[endif]
[need piggy-2 energy +5]

=== home_p2_rain
title: Ten-Minute Break
pig: piggy-2
summary: A storm at Shands, and Piggy 2 actually takes his break.
trigger: location=hub; companion=piggy-2; present=piggy-2; weekday=mon,wed,fri; hour=14-16; month=5,6,7,8,9,10; chance=0.25
priority: 10
repeat: true
---
[set home_p2_rain_n += 1]
[bg shands fade]
[weather storm]
[sfx thunder]
[bgm hospital]
[if replay || flag(home_p2_rain_n) = 1]
  narrator: The sky opens on your walk past Shands. You duck under the hospital overhang, soaked.
  [show piggy-2@scrubs surprised center]
  piggy-2 surprised: {player}. You're wet— extremely wet.
  piggy-2 neutral: I'm on break, ten minutes. Stand here, out of the lightning.
  narrator: He hands you a stack of paper towels he definitely got from somewhere official.
  ? Just watch the rain with him.
    [bond piggy-2 +10]
    narrator: Neither of you says anything for a while. The rain is loud and warm.
    piggy-2 bashful_smile: This is the longest break I've taken all week. It's... nice.
    piggy-2 shy_blush: Don't tell anyone.
  ? Ask what he's working on today.
    [bond piggy-2 +6]
    piggy-2 happy: Spinal cord perfusion, swine model. Keep the pressure up, protect the cord.
    piggy-2 happy: One of the lab pigs walked a full lap of his pen today, and he got a whole apple. Based.
[else]
  narrator: Rain again, and Piggy 2 is under the same overhang with a stack of paper towels. For you.
  [show piggy-2@scrubs happy center]
  piggy-2 happy: I saw the radar. Break number {flag:home_p2_rain_n|2}— stand here.
  [bond piggy-2 +2]
[endif]
[need piggy-2 energy +5]

=== home_p2_snack
title: Quality Control
pig: piggy-2
summary: Truffle fries at Marston, for you. Mostly for you.
trigger: location=hub; companion=piggy-2; present=piggy-2; hour=20; chance=0.25
priority: 12
repeat: true
---
[set home_p2_snack_n += 1]
[bg marston fade]
[time night]
[bgm library]
[if replay || flag(home_p2_snack_n) = 1]
  narrator: {time}, Marston. Piggy 2 slides a paper bag across the table without looking up from his notes.
  [show piggy-2 neutral center]
  piggy-2 neutral: You skipped dinner— your face says glucose seventy. Eat.
  narrator: It's a carton of truffle fries from Midtown. It is already half empty.
  piggy-2 neutral: Quality control. I had to check them, for you.
  narrator: He checks another one, and another.
  ? Push the carton back to him.
    [bond piggy-2 +10]
    piggy-2 flustered_blush: That's— I didn't— these were for—
    piggy-2 shy_blush: ...Based. Don't tell anyone they're my favorite.
  ? Split them down the middle.
    [bond piggy-2 +8]
    piggy-2 happy: Fair allocation, equal perfusion. Patriot.
[else]
  narrator: {time}, Marston. A paper bag appears next to your notes, already half empty.
  [show piggy-2 neutral center]
  piggy-2 neutral: Quality control, round {flag:home_p2_snack_n|2}. Results: still excellent.
  [bond piggy-2 +2]
[endif]
[need piggy-2 hunger +15]

# ───────────────────────── Piggy 3 home moments ─────────────────────────

=== home_p3_brush
title: Best Toothpaste for What?
pig: piggy-3
summary: Piggy 3 reads the toothpaste label like a benchmark.
trigger: location=hub; companion=piggy-3; present=piggy-3; hour=23-0; chance=0.3
priority: 12
repeat: true
---
[set home_p3_brush_n += 1]
[bg home_p3 fade]
[time night]
[bgm dorm]
[if replay || flag(home_p3_brush_n) = 1]
  narrator: {time}. Piggy 3 is back from Marston early, for once, and you end up brushing your teeth side by side.
  [show piggy-3 thinking center]
  narrator: Or rather, you brush. He reads the toothpaste tube.
  piggy-3 thinking: Okay, so— whitening, sensitive, enamel repair, extra fresh.
  piggy-3 thinking: Best for what, though? Like, what's the actual metric here?
  ? The mint one. It's on sale.
    [bond piggy-3 +6]
    piggy-3 laughing: Okay, cost per brush is a totally valid metric. I respect that.
  ? Stop reading the tube and brush, Piggy 3.
    [bond piggy-3 +10]
    piggy-3 bashful_smile: ...Yeah. Okay, fair— brushing.
    narrator: He brushes for exactly two minutes, then reads the tube again anyway.
  [sfx brush]
  [burst bubbles]
  piggy-3 happy: Night! I'm going to read for like ten minutes— okay, twenty.
[else]
  narrator: {time}: toothbrush, toothpaste, and Piggy 3 reading the toothpaste. Some things never change.
  [show piggy-3 happy center]
  piggy-3 happy: Night {flag:home_p3_brush_n|2} of the toothpaste study. Still no clear winner.
  [bond piggy-3 +2]
[endif]
[need piggy-3 hygiene +10]

=== home_p3_yawn
title: Damping Term
pig: piggy-3
summary: A yawn feedback loop, and the physics to stop it.
trigger: location=hub; companion=piggy-3; present=piggy-3; hour=8-9; chance=0.35
priority: 12
repeat: true
---
[set home_p3_yawn_n += 1]
[bg home_p3 fade]
[time morning]
[bgm morning]
[if replay || flag(home_p3_yawn_n) = 1]
  narrator: {time}. Piggy 3 shuffles into the hallway, curls at maximum volume, glasses on crooked.
  [show piggy-3 sleepy center]
  piggy-3 sleepy: Morning. I'm— hhhaaah—
  narrator: He yawns, you yawn, and then he yawns again, which makes you yawn again.
  piggy-3 thinking: Okay, wait— it's a feedback loop. We need, like, a damping term.
  ? Be the damping term: hand him a cold brew.
    [bond piggy-3 +8]
    [sfx drink]
    piggy-3 happy: Oh, critically damped— perfect. Okay, I'm awake, mostly.
  ? Yawn again. Resonance.
    [bond piggy-3 +8]
    piggy-3 laughing: Resonance! Nooo— okay, that was a good physics joke, and I'm mad about it.
[else]
  narrator: {time}. Piggy 3 appears mid-yawn, you yawn back, and the loop is stable.
  [show piggy-3 sleepy center]
  piggy-3 sleepy: Oscillation number {flag:home_p3_yawn_n|2}, still no damping. Morning.
  [bond piggy-3 +2]
[endif]
[need piggy-3 energy +5]

=== home_p3_rain
title: Free Lo-Fi
pig: piggy-3
summary: Rain on the Physics Building, and twenty minutes of good nothing.
trigger: location=hub; companion=piggy-3; present=piggy-3; hour=14-17; month=5,6,7,8,9,10; chance=0.2
priority: 10
repeat: true
---
[set home_p3_rain_n += 1]
[bg physics_lab fade]
[weather rain]
[sfx thunder]
[bgm physics]
[if replay || flag(home_p3_rain_n) = 1]
  narrator: Rain hammers the Physics Building. You duck inside and find Piggy 3's lab door propped open.
  [show piggy-3 happy center]
  piggy-3 happy: Oh, hey, come in! Okay, so— listen.
  piggy-3 happy: The rain and the server fans are, like, in the same key.
  piggy-3 bashful_smile: Rain is basically free lo-fi. That's my whole theory.
  narrator: He turns his music off. Just the rain, the fans, and a 3D printer ticking somewhere.
  ? Sit and listen with him.
    [bond piggy-3 +10]
    narrator: You take the spare stool. For twenty minutes, neither of you works on anything.
    piggy-3 affectionate_blush: I don't usually do nothing. This is— yeah, this is good nothing.
  ? Ask what he's printing.
    [bond piggy-3 +6]
    piggy-3 happy: A phone stand for Piggy 1. He keeps dropping his phone in the sand.
    piggy-3 bashful_smile: Wait, don't look yet. It's not pretty yet.
[else]
  narrator: Rain on the Physics Building again. The lab door is propped open, and the spare stool is already out.
  [show piggy-3 happy center]
  piggy-3 happy: Lo-fi session number {flag:home_p3_rain_n|2}. I saved you the stool.
  [bond piggy-3 +2]
[endif]
[need piggy-3 fun +10]

=== home_p3_snack
title: Low Menace
pig: piggy-3
summary: Onigiri on the porch steps, one more episode, and some menacing katakana.
trigger: location=hub; companion=piggy-3; present=piggy-3; hour=22; chance=0.25
priority: 12
repeat: true
---
[set home_p3_snack_n += 1]
[bg sakura_house fade]
[time night]
[bgm night]
[if replay || flag(home_p3_snack_n) = 1]
  narrator: {time}. You find Piggy 3 on the porch steps, eating onigiri and watching an anime on his phone.
  [show piggy-3 happy center]
  piggy-3 happy: Oh, hi! Don't spoil it— actually, you can't, it's episode four hundred and something.
  narrator: Without looking away from the screen, he holds out a second onigiri.
  piggy-3 thinking: If this were JoJo, there'd be menacing katakana behind me right now.
  [shake 0.2 400]
  narrator: ゴゴゴゴゴ...
  piggy-3 laughing: It's just me eating onigiri, though. Very low menace.
  ? Take the onigiri and watch an episode with him.
    [bond piggy-3 +10]
    narrator: One episode becomes two. The yard sakura drops a petal on his screen right at the big moment.
    piggy-3 affectionate_blush: Okay, that was perfect timing. Like, the tree gets it.
  ? Ask what the show's about.
    [bond piggy-3 +8]
    piggy-3 happy: Okay, so basically it's pirates. But it's really about friends who'd do anything for each other.
    piggy-3 shy_blush: ...Anyway. It's good, you'd like it.
[else]
  narrator: {time}: porch steps, phone, onigiri. There's already a second onigiri on the step next to him.
  [show piggy-3 happy center]
  piggy-3 happy: Episode night number {flag:home_p3_snack_n|2}. No spoilers— sit!
  [bond piggy-3 +2]
[endif]
[need piggy-3 hunger +15]
