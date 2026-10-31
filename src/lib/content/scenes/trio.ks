# Trio events (GAME_DESIGN §10, design-story §8) and the shared endings.
#   trio_pigpen_friday           Plaza, Friday midday, chapter 2+   sets study_spot = malachowsky|communicore|any|plaza
#   trio_bats_and_boo            Lake Alice at dusk, chapter 2+
#   trio_bats_and_boo_halloween  Lake Alice at dusk on Oct 31, any chapter (plays trio_bats_and_boo)
#   trio_gameday                 Stadium, Saturday midday-dusk, chapter 3+ (fall game; other months a scrimmage)
#   trio_study_pact              Marston, night/owl, chapter 4+
#   ending_true_invite           hub, once the true ending is unlocked (tells the player where to go)
#   ending_true                  Century Tower at dusk: all three hearts >= 7 and all four trio events seen
#   ending_friends               no trigger: the default ending, called by the UI
# Work-outfit "costumes" use [show pig@outfit] (portrait only), so a trio event never unlocks an outfit
# ahead of that pig's own heart event.

# ───────────────────────── T1: Pig Pen Friday ─────────────────────────

=== trio_pigpen_friday
title: Pig Pen Friday
summary: Lunch on the Plaza lawn, the great study-spot debate, and a squirrel with no respect for bananas.
trio: true
trigger: location=plaza; weekday=fri; slot=midday; chapter>=2
cg: cg_trio_lunch_on_the_lawn
---
[bg plaza fade]
[time day]
[bgm plaza]
[petals normal]
narrator: Friday, lunchtime. The Plaza lawn is a patchwork of picnic blankets, hammocks and people pretending to read.
narrator: In the middle of it all, on a blanket printed with tiny volleyballs, sits the Pig Pen.
[show piggy-1 excited left]
piggy-1 excited: {player}, over here! We saved you the shade spot!
[show piggy-2 neutral center]
piggy-2 neutral: We saved you the shade spot because the UV index at noon is not a joke. Sit.
[show piggy-3 happy right]
piggy-3 happy: Hi! Okay, so Pig Pen Friday is basically lunch— we just named it.
piggy-1 proud: Every Friday, right here. Piggy 3's attendance is eleven for twelve.
piggy-3 bashful_smile: The one I missed, my print was at layer four hundred. You don't leave at layer four hundred.
narrator: Lunch is spread out on the blanket: a tender sub and a banana, an apple and a sweet tea, a box of onigiri.
piggy-2 neutral: Sweet tea: basically syrup with ice. I respect it.
piggy-1 thinking: Okay, important question. Where's the best study spot on campus?
piggy-1 excited: Malachowsky, fourth floor, the window nook. Outlets for days, and the AI lab's right there.
piggy-2 neutral: Communicore, second floor. It's open all night for health science students.
piggy-2 neutral: The silence has excellent perfusion.
piggy-1 confused: Silence can't have perfusion.
piggy-2 neutral: It can in my heart.
piggy-3 thinking: Okay, but best for what, though?
piggy-3 thinking: Like, cramming is Marston at night, and a group project is the Reitz.
piggy-3 happy: But reading something you actually like? Here, honestly.
piggy-1 laughing: He does this every week.
piggy-3 happy: Because it's a good question every week!
piggy-2 neutral: {player}. Settle it.
? Malachowsky. The window nook sounds perfect.
  [set study_spot = malachowsky]
  [bond piggy-1 +15]
  [bond piggy-2 +5]
  [bond piggy-3 +5]
  piggy-1 excited: YES, side out! I'll save you the seat by the outlet, promise.
  piggy-2 neutral: Acceptable. Bring water, the fourth floor is dry.
? Communicore. I like quiet.
  [set study_spot = communicore]
  [bond piggy-2 +15]
  [bond piggy-1 +5]
  [bond piggy-3 +5]
  piggy-2 happy: Based. I'll show you the good carrel— nobody knows about the good carrel.
  piggy-1 laughing: Okay, fair. Too quiet for me, though— I'd talk.
? Best for what? Depends what we're studying.
  [set study_spot = any]
  [bond piggy-3 +15]
  [bond piggy-1 +5]
  [bond piggy-2 +5]
  piggy-3 surprised: Okay, wait— yes. That's the actual answer.
  piggy-3 shy_blush: Sorry. Nobody ever says it back to me.
? Right here. With you three.
  [set study_spot = plaza]
  [bond piggy-1 +10]
  [bond piggy-2 +10]
  [bond piggy-3 +10]
  piggy-1 surprised: Oh. Okay, that's— that's the best answer, that's not even fair.
  piggy-2 shy_blush: ...Based.
  piggy-3 bashful_smile: Yeah. Okay, yeah, that one wins.
[sfx surprise]
narrator: Something gray and fast streaks across the blanket.
[shake 0.4 300]
piggy-1 surprised: HEY—
narrator: A Plaza squirrel sits three feet away, holding Piggy 1's banana in both paws. It maintains eye contact.
piggy-1 angry: That's my banana! That's my post-lunch potassium!
piggy-2 neutral: Squirrel. Based squirrel.
piggy-1 angry: Whose side are you ON?!
piggy-2 neutral: Look at that grip strength. That squirrel's perfusion is immaculate.
piggy-3 thinking: Okay, so I was thinking we put a little camera on the Plaza and track—
piggy-3 confused: Actually, no, that's a privacy thing. Never mind.
narrator: The squirrel peels the banana slowly, still staring.
piggy-1 sad: It's peeling it. It's peeling it in front of me.
? Share your lunch with Piggy 1.
  [bond piggy-1 +10]
  piggy-1 surprised: Wait, really? Half your lunch?
  piggy-1 affectionate_blush: ...Okay, that's a teammate move. I'm writing that down.
? Tell him it was a clean steal.
  [bond piggy-1 +5]
  piggy-1 laughing: ...It WAS a clean steal. No touch, no foul.
  piggy-1 happy: Good game, squirrel. Rematch next Friday.
[bgm happy]
narrator: Piggy 2 hands out sweet teas. Piggy 3 splits his onigiri four ways without asking.
[give sweet_tea 1]
narrator: Petals settle on everything: the blanket, the onigiri, Piggy 1's sad, banana-less hooves.
[cg cg_trio_lunch_on_the_lawn]
[wait 500]
narrator: For one long lunch hour, nobody has anywhere else to be.
[cg off]
piggy-1 happy: Same time next week?
piggy-2 neutral: It's a standing order.
piggy-3 laughing: It's literally called Pig Pen Friday. It's in the name.
[bond piggy-1 +25]
[bond piggy-2 +25]
[bond piggy-3 +25]
narrator: ♥ Memory: Lunch on the Lawn. Somewhere on the Plaza, a squirrel is having the best lunch of its life.

# ───────────────────────── T2: Bats & Boo ─────────────────────────

=== trio_bats_and_boo
title: Bats & Boo
summary: A costume contest at the Lake Alice bat barns, where everybody came as themselves.
trio: true
trigger: location=lake_alice; slot=dusk; chapter>=2
cg: cg_trio_costume_contest
---
[bg lake_alice fade]
[time evening]
[bgm lake_alice]
[petals light]
[if month = 10 && day = 31]
  narrator: Halloween at Lake Alice. Somewhere across campus, a pipe organ is playing something spooky.
  narrator: Here, a few dozen people line the boardwalk, waiting on the bats.
[else]
  narrator: Dusk at Lake Alice. The water goes orange, then violet, and a few dozen people line the boardwalk.
[endif]
[show piggy-3@hoodie happy right]
piggy-3 happy: {player}! Okay, so— Bats & Boo.
piggy-3 happy: It's a costume thing. I made it up, but it's real now.
[if month = 10 && day = 31]
  piggy-3 happy: It's actually Halloween, so this is extremely on schedule.
[else]
  piggy-3 laughing: It's not Halloween. Basically, Halloween is a state of mind.
[endif]
[show piggy-1@volleyball laughing left]
piggy-1 laughing: Ta-da! Guess what I am!
piggy-3 happy: ...A volleyball player?
piggy-1 happy: An ATHLETE. Full uniform, knee pads and everything.
piggy-3 laughing: That's your Tuesday.
[show piggy-2@scrubs neutral center]
piggy-2 neutral: I'm a surgeon.
piggy-3 surprised: You ARE a surgeon.
piggy-2 neutral: Maximum authenticity. Based.
piggy-1 laughing: He came straight from Shands! That's not a costume, that's a commute!
piggy-1 happy: Okay, Piggy 3, what are you?
piggy-3 happy: Mine's scary. I'm a guy at Marston at 2 AM whose job has been pending for six hours.
piggy-2 neutral: Terrifying.
piggy-1 surprised: That's your every night!
piggy-3 bashful_smile: That's what makes it scary.
piggy-1 happy: And {player} came as...?
? A bat. Obviously.
  [bond piggy-3 +10]
  piggy-3 happy: Okay, that's thematically perfect. You're going to blend right in.
? A ghost. Classic bedsheet.
  [bond piggy-2 +10]
  piggy-2 happy: Bedsheet: breathable cotton, excellent airflow. Based costume.
? ...I forgot there were costumes.
  [bond piggy-1 +5]
  [bond piggy-2 +5]
  [bond piggy-3 +5]
  piggy-1 happy: Free ball, we can fix this! Here, take a knee pad.
  piggy-2 neutral: Surgical cap, bouffant style. Wear it with pride.
  piggy-3 happy: And I printed little bat wings for my keychain— they clip on, you can have them.
  narrator: You are now a volleyball surgeon bat. It's a lot, and it works.
[bgm stop 1500]
narrator: The sun slips behind the cypress trees. The boardwalk goes quiet.
[wait 900]
[sfx bats]
[shake 0.2 600]
narrator: Then the bat barns breathe out. Half a million free-tailed bats pour into the violet sky.
[bgm lake_alice]
piggy-1 surprised: WHOA. That's so many bats!
piggy-2 surprised: Half a million bats. Incredible cardiac output.
piggy-3 happy: It's like a river— a bat river. Basically the sky is a river now.
piggy-1 happy: They eat, like, two and a half billion bugs a night. Best defense in the conference!
piggy-2 neutral: Also, do not stand under the barns. I'm not explaining why.
piggy-3 happy: Okay, so— costume contest, and {player} is the judge. That was always the plan.
? Piggy 1, the athlete.
  [bond piggy-1 +15]
  piggy-1 laughing: KILL, point Gators! I'd like to thank my knee pads.
? Piggy 2, the surgeon.
  [bond piggy-2 +15]
  piggy-2 surprised: ...Me? I just wore my work clothes.
  piggy-2 shy_blush: Based, very based. I'll be insufferable about this.
? Piggy 3, 2 AM at Marston.
  [bond piggy-3 +15]
  piggy-3 surprised: Wait, me? It was literally a hoodie.
  piggy-3 shy_blush: I'm keeping the trophy. There's no trophy, so I'll print one.
? A three-way tie.
  [bond piggy-1 +10]
  [bond piggy-2 +10]
  [bond piggy-3 +10]
  piggy-1 happy: A TIE?! That's a team win— bring it in!
  piggy-2 neutral: Diplomatic. Based.
  piggy-3 happy: Best for everyone. Okay, I respect it.
piggy-1 happy: Photo! Everybody in, bats in the back!
[sfx camera]
[flash #ffffff 120]
[cg cg_trio_costume_contest]
[wait 500]
narrator: Three pigs in their work clothes, one judge, and a sky full of bats.
[cg off]
[bond piggy-1 +20]
[bond piggy-2 +20]
[bond piggy-3 +20]
piggy-2 neutral: Same time next year. I'll come as a surgeon.
piggy-3 laughing: You ARE a—
piggy-2 happy: I know.
narrator: ♥ Memory: Costume Contest. Everybody came as themselves, and it was the best costume party of the year.

=== trio_bats_and_boo_halloween
title: Bats & Boo (Halloween)
summary: On October 31, Bats & Boo can happen in any chapter.
trigger: location=lake_alice; slot=dusk; date=10-31; seen!=trio_bats_and_boo
priority: 45
replayable: false
---
[call trio_bats_and_boo]

# ───────────────────────── T3: Gameday at the Swamp ─────────────────────────

=== trio_gameday
title: Gameday at the Swamp
summary: Orange and blue, a hoof-powered Chomp, mandatory hydration, and the sway.
trio: true
trigger: location=stadium; weekday=sat; slot=midday,afternoon,dusk; chapter>=3
cg: cg_trio_swamp_sway
---
[bg stadium fade]
[time day]
[bgm stadium]
[if month = 9,10,11]
  narrator: Saturday in Gainesville. University Ave is a river of orange and blue, and the Swamp is filling up.
[else]
  narrator: Saturday at the Swamp: an off-season scrimmage. The stakes are low, and the sun is not.
[endif]
narrator: Eighty-eight thousand seats, and you've got four of them, way up high, in full sun.
[show piggy-1 excited left]
piggy-1 excited: GAMEDAY! Look at the grass, {player}— look at the noise!
piggy-1 laughing: You can't look at noise. You know what I mean!
[show piggy-2 neutral center]
piggy-2 neutral: Full sun, three hours, eighty-eight thousand people.
piggy-2 neutral: The heat index is a perfusion emergency. Everyone drinks, now.
[give sideline_sip 1]
[sfx drink]
narrator: He hands out sports drinks from a cooler he carried up every single step.
piggy-2 neutral: The sports drink was invented here in 1965, by a kidney doctor. Honor him— drink.
[show piggy-3 happy right]
piggy-3 happy: Hi! Sorry, I was trying to figure out how they get the field paint so crisp.
piggy-3 bashful_smile: Actually, never mind. Hi.
narrator: Pregame. A guest Mr. Two Bits marches out to lead a cheer the Swamp has done since 1949, and the whole stadium answers him.
piggy-1 excited: I love this part! I've never missed a beat, not once!
piggy-1 happy: I also wrote us some chants— originals, copyright Piggy 1. Pick one!
? Bump! Set! Touchdown!
  [bond piggy-1 +10]
  piggy-1 laughing: Three sports in one chant! That's efficiency!
  piggy-3 confused: That's three different— okay. Okay, I'm doing it.
? Hooves up! Snouts out!
  [bond piggy-1 +5]
  [bond piggy-3 +5]
  piggy-3 laughing: Okay, that one's actually good. Hooves up!
? Hydrate! Hydrate!
  [bond piggy-2 +10]
  piggy-2 happy: Finally. A chant with clinical value.
[sfx whistle]
narrator: Kickoff. The band hits the two notes everybody knows, and the whole stadium starts to chomp.
[sfx chomp]
[shake 0.3 300]
narrator: Eighty-eight thousand pairs of arms, and three pairs of hooves. Clop, clop, clop.
piggy-1 laughing: Hoof Chomp! It's way louder with hooves!
piggy-3 laughing: It's not louder. It's just— okay, it's a little louder.
piggy-2 neutral: Perfect form, elbows aligned. Based.
narrator: End of the first quarter.
piggy-2 neutral: Drink.
narrator: End of the second quarter.
piggy-2 neutral: Drink. Halftime is also a time for drinking— water.
piggy-1 sad: I've had four drinks. I'm basically a water balloon.
piggy-2 neutral: Correct. A well-perfused water balloon.
narrator: End of the third quarter. All around you, people start linking arms.
piggy-3 confused: Wait, what's happening? Is this a thing?
piggy-1 happy: The sway! Everybody links arms— quick, who's next to who?
? Next to Piggy 1.
  [bond piggy-1 +15]
  piggy-1 happy: Yes! Lock in, teammate!
? Next to Piggy 2.
  [bond piggy-2 +15]
  piggy-2 shy_blush: ...Elbow to elbow, don't let go. Based.
? Next to Piggy 3.
  [bond piggy-3 +15]
  piggy-3 shy_blush: Oh— okay. I don't know the timing, so I'll, like, follow you.
? In the middle. Everybody links up.
  [bond piggy-1 +8]
  [bond piggy-2 +8]
  [bond piggy-3 +8]
  piggy-1 happy: Chain formation! Nobody gets left on the bench!
[bgm romance]
narrator: The whole stadium sways, slow, side to side, eighty-eight thousand people moving like one.
[cg cg_trio_swamp_sway]
[wait 600]
narrator: You don't know the words, and it doesn't matter. You lean, and somebody leans back.
piggy-1 affectionate_blush: This is my favorite part. Everybody's on the same team, like, literally everybody.
piggy-2 affectionate_blush: Eighty-eight thousand people, synchronized. Like a heartbeat.
piggy-3 affectionate_blush: I want to make a visualization of this. Actually— no, I just want to be here.
[cg off]
[bgm stadium]
narrator: Later, nobody can remember the final score. Everybody remembers the sway.
[bond piggy-1 +20]
[bond piggy-2 +20]
[bond piggy-3 +20]
piggy-2 neutral: Discharge instructions: water, shade, electrolytes, sleep.
piggy-1 excited: And chant practice!
piggy-2 happy: ...And chant practice. Based.
narrator: ♥ Memory: Swamp Sway. For days afterward, your arms still remember the sway.

# ───────────────────────── T4: The 3 AM Study Pact ─────────────────────────

=== trio_study_pact
title: The 3 AM Study Pact
summary: Finals at Marston: a pact, a pixel tomato, stretch breaks, and four tired friends at sunrise.
trio: true
trigger: location=marston; slot=night,owl; chapter>=4
cg: cg_trio_marston_sunrise
---
[bg marston fade]
[time night]
[bgm library]
narrator: Marston Science Library, late. Every table is taken, and every table wears the same expression: finals.
[show piggy-3@hoodie happy right]
piggy-3 happy: {player}, we saved you a seat! Okay, it's half a seat— the other half is my laptop.
[show piggy-1 sleepy left]
piggy-1 sleepy: I'm awake, I'm so awake. This is my third coffee— is it supposed to buzz?
[show piggy-2 neutral center]
piggy-2 neutral: It's buzzing because you're tachycardic. Put the coffee down.
piggy-1 proud: Okay, team meeting. Nobody leaves until everybody's done— that's the pact.
piggy-2 neutral: Amendment: nobody leaves until everybody sleeps. Memory consolidates during sleep.
piggy-3 happy: Okay, so I was thinking— both? Like, we study in blocks, and the blocks have breaks.
piggy-3 happy: I made a little timer: twenty-five minutes on, five off. Basically it's a tomato, but code.
narrator: His laptop shows a pixel tomato counting down from 25:00. It's very cute.
piggy-1 happy: Nice! Claude helped me fix my serve tracker today.
piggy-3 proud: Codex built this timer. Twenty-five minutes. Extremely accurate minutes.
piggy-1 laughing: Mine passes its tests too, teammate. Different jerseys, same team.
piggy-3 thinking: Okay, but— Codex. I could make a comparison chart.
piggy-2 neutral: You made one yesterday.
piggy-3 bashful_smile: That was the preliminary chart.
[sfx typing]
narrator: First block. Silence, highlighters, the tiny tick of the tomato.
[sfx notify]
piggy-1 excited: Stretch break! Everybody up— arms up, quiet jumping jacks!
narrator: Piggy 1 leads the whole table through silent jumping jacks between the stacks.
piggy-2 neutral: Second break, hydration. Everyone finishes one full bottle.
[sfx drink]
narrator: Third break. Piggy 3 turns his laptop around to show you a progress bar.
piggy-3 happy: My HiPerGator job just started running— it's at four percent. We're doing great.
[wait 600]
narrator: 3:00 AM. The tomato rings for the ninth time, and nobody looks up.
piggy-2 neutral: Clinical assessment: everyone at this table is cognitively impaired. Including me.
piggy-2 neutral: Prescription: sleep. Effective immediately.
piggy-1 sleepy: Five more minutes, one more set. Then sleep, promise.
piggy-3 neutral: My final project works. It's just not pretty yet, so I'm fixing the plot colors.
? Back the doctor. Everybody sleeps.
  [bond piggy-2 +15]
  [bond piggy-1 +5]
  [bond piggy-3 +5]
  piggy-2 happy: Thank you— finally, a patient who listens. Based.
? One more pomodoro. Together.
  [bond piggy-1 +15]
  [bond piggy-2 +5]
  [bond piggy-3 +5]
  piggy-1 happy: That's the spirit! Last set, everybody in!
? Piggy 3, it's good enough. Submit it.
  [bond piggy-3 +15]
  [bond piggy-1 +5]
  [bond piggy-2 +5]
  piggy-3 surprised: Submit it? Like, now, with these colors?
  [sfx build_ok]
  piggy-3 bashful_smile: ...Okay, yeah. Submitted.
narrator: Ten minutes later, nobody has done anything they agreed to.
[sfx zzz]
[burst zzz]
narrator: Piggy 1 is asleep on the volleyball he brought "for morale."
narrator: Piggy 3 is asleep with one hoof still on the trackpad.
narrator: Piggy 2 is asleep sitting perfectly upright, highlighter in hoof, like a statue of a very tired surgeon.
[hide all]
[time morning]
[bgm morning]
narrator: You stay awake and watch the windows go from black to blue to pink.
[cg cg_trio_marston_sunrise]
[wait 800]
narrator: Four friends, three asleep, one awake, and a pixel tomato counting down to nothing.
[cg off]
[show piggy-1 sleepy left]
[show piggy-2 sleepy center]
[show piggy-3@hoodie neutral right]
piggy-1 sleepy: ...whuh. Is it morning— did we win?
piggy-2 sleepy: We slept, so that's a win. ...Based.
piggy-3 bashful_smile: Sunrise. Okay, that's actually really pretty.
[bond piggy-1 +25]
[bond piggy-2 +25]
[bond piggy-3 +25]
narrator: ♥ Memory: Marston, Sunrise. Nobody kept the pact, and everybody kept each other.

# ───────────────────────── Endings ─────────────────────────

=== ending_true_invite
title: Century Tower, Dusk
summary: Three messages, one place, one time.
trigger: location=hub; chapter>=4; hearts(piggy-1)>=7; hearts(piggy-2)>=7; hearts(piggy-3)>=7; seen=trio_pigpen_friday,trio_bats_and_boo,trio_gameday,trio_study_pact; seen!=ending_true
priority: 45
replayable: false
---
[sfx notify]
narrator: Your KempaPager buzzes. Then it buzzes again, and then a third time.
narrator: 【PIGGY 1】century tower. dusk. bring snacks!!! (i'm bringing snacks)
narrator: 【PIGGY 2】Century Tower, dusk, don't be late. Patriot.
narrator: 【PIGGY 3】okay so we're all going to be at the big tree. at dusk. it's a whole thing <3
narrator: Three messages: same place, same time. Somebody planned something.

=== ending_true
title: Hanami for Four
summary: Under the Century Tower sakura at dusk: a picnic, three toasts, and a promise big enough for four.
ending: true
trigger: location=century_tower; slot=dusk; chapter>=4; hearts(piggy-1)>=7; hearts(piggy-2)>=7; hearts(piggy-3)>=7; seen=trio_pigpen_friday,trio_bats_and_boo,trio_gameday,trio_study_pact
priority: 65
cg: cg_trio_hanami_for_four
---
# The trigger already gates everything; this guard only matters when the scene is called by id.
[if hearts(piggy-1) < 7 || hearts(piggy-2) < 7 || hearts(piggy-3) < 7 || !seen(trio_pigpen_friday) || !seen(trio_bats_and_boo) || !seen(trio_gameday) || !seen(trio_study_pact)]
  [call ending_friends]
  [end]
[endif]
[bg legend_sakura fade]
[time evening]
[petals heavy]
[bgm title]
narrator: The great sakura beside Century Tower is in full bloom. It always is, but tonight it looks like it's trying harder.
narrator: Under it, on a blanket covered in petals: a tender sub, an apple pie, a box of onigiri, and three pigs who got here early.
[show piggy-1 excited left]
piggy-1 excited: You made it, right on time! We've been here forty minutes!
[show piggy-3 happy right]
piggy-3 happy: Fifty-one minutes— I was on time, for once. Somebody write that down.
[show piggy-2 neutral center]
piggy-2 neutral: I wrote it down.
narrator: It's the end of the semester. Somehow, the whole thing went by in one long afternoon.
piggy-1 happy: Remember Pig Pen Friday, with the squirrel? I still think about that banana.
piggy-2 neutral: Bats & Boo— we all won. I still have the costume, because it's my work clothes.
piggy-3 happy: The sway. And Marston at sunrise.
piggy-3 bashful_smile: I shipped more stuff this semester than the last three combined. That's— that's because of you guys.
piggy-3 thinking: So, the legend: two people, a promise, the carillon, dusk. I read the brochure again.
piggy-3 happy: It says two people, but it doesn't say ONLY two. Basically, it's a loophole.
piggy-2 happy: Loophole. Based.
piggy-1 excited: A four-person promise?! Is that allowed?!
[sfx bell]
narrator: Up in the tower, the carillon begins to play.
piggy-2 neutral: It's allowed now.
narrator: Three pigs look at you. The petals don't stop falling.
? Same time next semester. All four of us.
  piggy-1 excited: Every semester! That's the rotation— nobody rotates out!
? Whatever happens, we keep showing up for each other.
  piggy-2 affectionate_blush: ...Agreed, indefinitely. I'm writing it in the chart.
? I'm really glad it was you three.
  piggy-3 affectionate_blush: Okay, you can't just say that. I'm going to cry on the onigiri.
[bond piggy-1 +50]
[bond piggy-2 +50]
[bond piggy-3 +50]
piggy-1 excited: Drinks up, toast time! I go first!
piggy-1 happy: To the team!
piggy-2 happy: To perfusion!
piggy-3 thinking: To... okay, best for what?
piggy-3 affectionate_blush: Best for us.
[sfx sparkle]
[bgm credits]
[cg cg_trio_hanami_for_four]
[wait 800]
narrator: Four cups, one sakura, and a promise that never needed a legend to keep it.
piggy-1 affectionate_blush: Best teammates I've ever had. All three of you— you know what I mean.
piggy-2 affectionate_blush: Your presence improves my perfusion— all of you. I've run the numbers.
piggy-3 affectionate_blush: I didn't build anything for tonight, I just came. That's— that's kind of new for me.
[cg off]
narrator: The carillon keeps playing. Nobody wants to be the first to fold up the blanket.
narrator: Spring semester starts soon. Somebody will still need breakfast at six-thirty, a bottle of water, and a reason to log off.
[set ending_true_done]
[set spring_semester]
narrator: ♥ Memory: Hanami for Four. The promise bloomed, and it was always going to.

=== ending_friends
title: See You Next Semester
summary: The semester ends at a bus stop, with three waves and a promise to keep showing up.
ending: true
cg: cg_trio_see_you_next_semester
---
[bg reitz fade]
[time evening]
[bgm campus_evening]
[petals normal]
narrator: The last day of the semester. The bus stop outside the Reitz is crowded with suitcases and goodbyes.
narrator: You're heading home for break. Your bag is heavy again, but this time you know where everything is.
[sfx step]
[show piggy-1 happy left]
piggy-1 happy: There you are! We almost missed you— Piggy 3 was printing something.
[show piggy-3 bashful_smile right]
piggy-3 bashful_smile: It's done. Okay, it's not done, but it's done enough.
narrator: He hands you a tiny 3D-printed bus with three pigs in the windows. One pig is slightly lumpy, and it's perfect.
[show piggy-2 neutral center]
piggy-2 neutral: Travel checklist: water, snacks, charger, sleep on the bus. Patriot.
piggy-1 excited: Text the Pig Pen when you get home— or at any point! We'll answer!
piggy-3 happy: I'll keep the KempaPager server running, so you can basically check on us from anywhere.
[if companion = piggy-1]
  piggy-1 affectionate_blush: Every rally's more fun with you on my side of the net. Just so you know.
[elif companion = piggy-2]
  piggy-2 affectionate_blush: You keep showing up. That's the most based thing anyone's done for me.
[elif companion = piggy-3]
  piggy-3 affectionate_blush: I like showing you stuff, even the little things. It's nice that you actually want to see them.
[endif]
[sfx whoosh]
narrator: The bus pulls up with a long hiss, the same way it did on your very first day.
? See you next semester.
  [bond piggy-1 +10]
  [bond piggy-2 +10]
  [bond piggy-3 +10]
  piggy-1 excited: Next semester, same team! Let's goooo!
? I'll miss you guys.
  [bond piggy-1 +10]
  [bond piggy-2 +10]
  [bond piggy-3 +10]
  piggy-2 shy_blush: ...Likewise. Clinically significant levels of likewise.
? Keep the porch light on for me.
  [bond piggy-1 +10]
  [bond piggy-2 +10]
  [bond piggy-3 +10]
  piggy-3 happy: I fixed it, by the way— the porch light. It took all semester, but it's fixed.
narrator: You get a window seat. Outside, three pigs are waving like it's a competition.
[cg cg_trio_see_you_next_semester]
[wait 800]
narrator: It is a competition. Piggy 1 is winning, Piggy 2 is waving with perfect form, and Piggy 3 is filming it.
[cg off]
[bond piggy-1 +20]
[bond piggy-2 +20]
[bond piggy-3 +20]
[set ending_friends_done]
[set spring_semester]
narrator: ♥ Memory: See You Next Semester. The semester ended, and nothing else did.
