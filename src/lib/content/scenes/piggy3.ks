# Piggy 3 — "Ship It Route" (GAME_DESIGN §10). Voice: characters/piggy-3.md.
# Heart events p3_h1..p3_h7, the ending p3_ending ("Commit Message"), and three small scenes:
# p3_big_brain_offer (no trigger; the UI calls it), p3_anime_apps (with Piggy 1)
# and p3_brains_builders (with Piggy 2; piggy2.ks p2_brains_builders is its sequel).
# Hoodie scenes use only the 12 alt-outfit portraits. Hub-triggered events open with a KempaPager text.
# Reads flags from other files: intake.why_uf (prologue), p1_captain (piggy1), p2_nickname (piggy2).
#
# Flags written here that game code may read:
#   ui_accent = pink | orange | lavender                          p3_h1: KempaPager UI accent color
#   outfit_hoodie                                                 p3_h2: hoodie unlocked ([outfit] also sets it)
#   p3_feature = bat_forecast | carillon_alarm | hydration_timer  p3_h5: the feature that "ships into the game"
#   fact.commit_message                                           p3_ending: last line of the credits
#   big_brain_offer = open | later | never                        p3_big_brain_offer: what the player picked
# Scene-only flags: p3_use_it (h2 → h6), p3_spaghetti (h3 → h6), p3_nickname (h5 → h6, ending).


# ───────────────────────── ♥1 ─────────────────────────

=== p3_h1
title: Okay, So I Was Thinking…
pig: piggy-3
heart: 1
trigger: location=reitz; time=day,evening,night
priority: 50
cg: cg_p3_name_badge
summary: Nine minutes late, Piggy 3 brings a 3D-printed name badge and one question: what color should your KempaPager be?
---
[bg reitz fade]
[bgm piggy3_theme]
narrator: The Reitz Union. The Kempanion booth is still here: one folding table, one banner, zero Piggy 3.
narrator: A sign is taped to the table in very neat handwriting: WELLNESS CHECKS, BACK IN 5. HYDRATE.
narrator: Fourteen minutes ago, he texted you: "meet at the booth in 5? have a thing for you"
[sfx step]
[wait 250]
[sfx step]
[show piggy-3 surprised center]
[shake 0.2 200]
piggy-3 surprised: Hi! Hi— okay, I'm here, sorry.
piggy-3 confused: Nine minutes late, again. Which— okay, at least it's consistent?
piggy-3 thinking: Like, if it's always nine minutes, that's basically a constant offset. You can just correct for it.
player: So I should start showing up nine minutes late.
piggy-3 laughing: Then we'd both be on time! Okay, no, that's— wait, that would actually work.
piggy-3 happy: Okay, so I was thinking: two things. Actually— one and a half things.
piggy-3 happy: First thing— here.
[sfx gift]
narrator: He sets something small on the table: a name badge, 3D-printed, with your name raised in tidy little letters.
piggy-3 bashful_smile: The paper ones looked sad. Like, the marker kind, where the ink bleeds and it falls off by lunch.
piggy-3 thinking: I tried six fonts— actually, nine. This one's the least… corporate?
[cg cg_p3_name_badge]
narrator: {player}, pressed into pale lavender plastic, perfectly straight. Even the edges are smooth.
player: You made this? For me?
piggy-3 flustered_blush: I mean— the printer made it. I just told it what to do, and then argued with it a little.
[cg off]
[give name_badge 1]
piggy-3 neutral: Okay, second thing— the half thing. Your KempaPager.
piggy-3 thinking: So, basically, the stock UI looked like a microwave clock. I think I told you that— I tell everyone that.
piggy-3 excited: Green segments, one font, everything blinking 12:00. So I redid it— mostly.
piggy-3 thinking: Except the accent color. Like, the highlight— the little color on the buttons and the hearts.
piggy-3 confused: I made eleven versions, and they're all good for something. Best for what, though?
piggy-3 happy: And then I realized it's your pager. So I was thinking you should pick.
? Sakura pink.
  [set ui_accent = pink]
  [bond piggy-3 +20]
  piggy-3 excited: Obviously. Yes— okay, that was my favorite, I just didn't want to say it first.
  [remember piggy-3 "Player picked sakura pink for their KempaPager."]
? Gator orange.
  [set ui_accent = orange]
  [bond piggy-3 +12]
  piggy-3 laughing: Okay, loud. I like it— very game-day.
  piggy-3 thinking: I'll bump the contrast so it doesn't buzz on the dark screen. Orange does that, it sort of vibrates.
  [remember piggy-3 "Player picked Gator orange for their KempaPager."]
? Surprise me.
  [set ui_accent = lavender]
  [bond piggy-3 +16]
  piggy-3 surprised: Oh. Okay, um—
  piggy-3 shy_blush: Lavender? It's sort of… my color, is that weird?
  piggy-3 bashful_smile: No, it's good, it's calm. It's a good color for a thing you look at a lot.
  [remember piggy-3 "Player let Piggy 3 pick lavender for their KempaPager."]
[sfx typing]
narrator: He types three quick lines into his laptop, then holds his breath, like that helps.
[sfx notify]
[flash #ffffff 120]
narrator: Your KempaPager chirps. Every highlight on the screen blooms into the new color.
piggy-3 proud: Okay. It works.
piggy-3 happy: Look— see the hearts? That's the bit I was trying to get right.
piggy-3 thinking: The hearts used to be the same color as the low-battery icon. Which, like, says something— just not the right thing.
piggy-3 happy: Honestly, this is the first thing I've actually finished in a month.
piggy-3 confused: I have a lot of stuff at ninety percent. The last ten percent is somehow the hard ninety percent.
piggy-3 excited: Oh— hey, have you used Codex? I had my coding agent do the boring part of this, and it was—
piggy-3 flustered_blush: Wait. I was going to— no, that's a whole other thing, I'll show you sometime.
[bond piggy-3 +40]
piggy-3 bashful_smile: Okay, that's the one and a half things. Thanks for coming, even though I was the late one.
narrator: You pin the badge on. It's still a little warm from the printer.
[end]


# ───────────────────────── ♥2 ─────────────────────────

=== p3_h2
title: Best for What?
pig: piggy-3
heart: 2
trigger: location=physics; time=day,evening,night
priority: 50
cg: cg_p3_two_monitors
summary: Two models clean the same brainwaves. Piggy 3 asks which one is best, and your answer settles it.
---
[bg physics fade]
[bgm physics]
narrator: The Physics Building on Museum Road. At the end of the hall, a door is propped open with a 3D-printed wedge.
[bg physics_lab fade]
narrator: The computational lab. It is very, very cold in here.
[outfit piggy-3 hoodie]
[set outfit_hoodie]
[show piggy-3@hoodie happy center]
piggy-3 happy: Oh! You found it.
piggy-3 laughing: Sorry about the cold. The AC in this building has two settings: off, and Antarctica.
piggy-3 bashful_smile: Hence the hoodie. It's black so the PLA dust doesn't show— mostly.
player: The hoodie's a look.
piggy-3 flustered_blush: Oh— it's just a hoodie. Okay, thanks.
piggy-3 neutral: Okay, so I was thinking— actually, come look. It's easier if you can see it.
[sfx ui_open]
[cg cg_p3_two_monitors]
narrator: Two monitors, side by side. Both show the same wobbly lines scrolling past.
piggy-3 neutral: That's EEG— brain signals, recorded from the scalp. Like, really tiny voltages.
piggy-3 neutral: See those big spikes? Those aren't the brain, that's somebody blinking.
piggy-3 happy: Blinks, jaw clenches, a phone near a wire— everything that isn't the brain shows up too. Those are called artifacts.
piggy-3 neutral: Both of these models clean that up. That's the whole job: take out the blinks, keep the brain.
[cg off]
piggy-3 happy: The left one's small. It runs on a laptop, in real time, and you can open it up and see what it's doing.
piggy-3 confused: The right one's huge, and it scores higher on the benchmark. It needs HiPerGator just to wake up.
piggy-3 neutral: Also, it's closed, so you'd have to send the recordings to somebody else's server. Which, for medical data… yeah.
piggy-3 confused: And the benchmark has no baseline. Like, higher than what— higher than nothing?
piggy-3 neutral: Piggy 2 wants to use one for his lab data. He said, and I quote, "make it based."
[if flag(intake.why_uf) = medicine]
  piggy-3 happy: Actually— you're in medicine, right? So you'd know what a doctor would actually put up with.
[elif flag(intake.why_uf) = physics]
  piggy-3 happy: Actually— you're physics too, right? So you already know my thing about baselines.
[elif flag(intake.why_uf) = computing]
  piggy-3 happy: Actually— you're in computing, right? So you know how the demo works, and then the real thing doesn't.
[endif]
piggy-3 neutral: So I keep going back and forth. Okay— one question, just answer this one.
piggy-3 neutral: Which one is best?
? The fastest one.
  [bond piggy-3 +15]
  piggy-3 neutral: Yeah, fast matters. If cleaning takes a minute per recording, people just… won't.
  piggy-3 happy: Which is sort of the same answer, right? The fast one is the one people actually use.
? The most accurate one.
  [bond piggy-3 +15]
  piggy-3 neutral: That's what the paper would say. Accurate on what, though— their data, or Piggy 2's?
  piggy-3 confused: Because if it's amazing on theirs and nobody can run it on ours, it's accurate on… nothing we have.
? Whichever one people will actually use.
  [set p3_use_it]
  [bond piggy-3 +30]
  [shake 0.15 150]
  piggy-3 surprised: Okay— actually— yes.
  piggy-3 laughing: Yes! That's the actual answer— if it's ugly, or slow, or locked up somewhere, nobody uses it.
  piggy-3 happy: The best model is the one that's running. On the actual machine, in the actual lab.
piggy-3 happy: Okay, so I was thinking we could make a little thing for this. Like, wrap the small model in a really simple window.
piggy-3 happy: You drop a recording in, it shows before and after, and it highlights what it took out.
piggy-3 neutral: Actually— the part I care about is the checking. A doctor should be able to see exactly what it removed.
piggy-3 confused: Also a slider for the— no. No slider, the first version is just the window.
piggy-3 bashful_smile: Sorry, I get carried away. What do you think?
player: I think you should build it.
piggy-3 happy: Yeah. Okay— yeah.
piggy-3 neutral: I'll still run the big one tonight, for a baseline. HiPerGator's basically a very large friend who does math while we sleep.
piggy-3 shy_blush: You know what's funny? I sort of knew the answer, I just needed somebody to say it out loud.
piggy-3 affectionate_blush: So, um— thanks for being the somebody.
[bond piggy-3 +45]
piggy-3 bashful_smile: Come back sometime? It's always freezing in here, so I'll bring the second hoodie.
narrator: On your way out, the left monitor is still running, quietly erasing blinks from somebody's brainwaves.
[end]


# ───────────────────────── ♥3 ─────────────────────────

=== p3_h3
title: Print Queue
pig: piggy-3
heart: 3
trigger: location=marston,hub; time=evening,night
priority: 50
cg: cg_p3_first_layer
summary: A sakura charm for your KempaPager turns into spaghetti. Piggy 3 debugs; you get a vote.
---
[bg marston fade]
[bgm library]
narrator: An hour ago, Piggy 3 texted you: "printing u a thing at marston. come see?"
narrator: Marston Science Library. In the makerspace the printers hum, and one pig is crouched in front of the smallest.
[show piggy-3 excited center]
piggy-3 excited: You came! Okay, don't look yet.
piggy-3 happy: Actually, you can look. It's at the good part.
piggy-3 happy: It's a charm for your KempaPager. A little sakura, like the one in the yard.
[if companion != piggy-3]
  piggy-3 bashful_smile: I said I'd make you a keychain anyway, remember? So— keychain.
[endif]
piggy-3 thinking: I modeled the petals so they overlap. Five petals, and the middle sort of sits on top, and it's going to be really—
[sfx fail]
[shake 0.3 300]
narrator: The nozzle drags a pink strand across the print bed, then another. Then the whole flower lifts off and becomes a tangle.
narrator: Spaghetti. Pink spaghetti.
piggy-3 surprised: No. No no no no.
piggy-3 sad: It was at forty percent, and it was going so well. It's a bird's nest now.
? Try again.
  [bond piggy-3 +18]
  piggy-3 thinking: Yeah. Okay, yeah— but I want to know why first, otherwise it just does it again.
? What went wrong?
  [bond piggy-3 +15]
  piggy-3 excited: Okay, so— good question, actually the best question. Come here, look at the bottom.
? The spaghetti one is perfect.
  [set p3_spaghetti]
  [bond piggy-3 +28]
  piggy-3 surprised: …
  piggy-3 shy: It's— you— it's literally a mess.
  piggy-3 shy_blush: …You can have both. I'm still printing you a good one, but you can have both.
  [remember piggy-3 "Player thinks the spaghetti print is perfect."]
piggy-3 thinking: So, basically, the first layer didn't stick. That's the whole thing— the first layer.
piggy-3 thinking: If the first layer's bad, everything on top of it is bad. It doesn't matter how good the rest is.
narrator: He wipes the bed, nudges a knob a quarter turn, and slides a sheet of paper under the nozzle like he's checking a pulse.
[sfx ui_select]
piggy-3 happy: Okay, restarting. Forty minutes— coffee?
[sfx drink]
narrator: The library café. Piggy 3 orders a cold brew and holds it in both hooves like a hand warmer, even though it's cold brew.
piggy-3 happy: Fun fact: if you don't pick up a print here in fourteen days, it becomes library property.
piggy-3 laughing: I have basically donated a small army. There's a whole shelf, and it's all my stuff.
player: You make a lot of things for people.
piggy-3 thinking: Yeah, I like that part. Like, it gives me a reason to finish something.
piggy-3 sad: My own stuff I mostly… don't.
piggy-3 sad: There's always one more thing to fix. It's never— it's not pretty yet.
piggy-3 confused: I've got a search thing for a podcast, an EEG thing, a thing that waters plants— all at ninety percent.
piggy-3 neutral: Anyway, that's a lot, sorry. How's your drink?
player: It's good. You're good company.
piggy-3 shy_blush: Oh— okay. That's— yeah, you too.
narrator: Forty minutes later, the smallest printer chirps.
[sfx build_ok]
piggy-3 excited: Okay— okay! Look at the edges, that's what it's supposed to look like.
[cg cg_p3_first_layer]
narrator: Two sakura charms side by side on the print bed: one crisp, with five clean petals, and one tangled pink nest.
[if flag(p3_spaghetti)]
  piggy-3 bashful_smile: So, as promised: both. I put them on one ring.
  piggy-3 shy_blush: The good one, and the… perfect one.
[else]
  piggy-3 proud: Here— the good one, for your pager.
  piggy-3 bashful_smile: I'm keeping the spaghetti one, as, like, a reminder to level the bed.
  piggy-3 shy: Or— I don't know. I sort of like it now.
[endif]
[cg off]
[give sakura_keychain 1]
[sfx sparkle]
[bgm piggy3_theme]
narrator: He clips it to your KempaPager himself, very carefully, the way he handles the printer.
piggy-3 happy: There. It won't wilt, at least— that's the one advantage plastic has over flowers.
[bond piggy-3 +45]
piggy-3 bashful_smile: Thanks for waiting with me. Waiting's the worst part, and it was— it wasn't bad, at all.
narrator: On the walk home, the charm taps against your KempaPager with every step.
[end]


# ───────────────────────── ♥4 ─────────────────────────

=== p3_h4
title: Brainwaves at the Bat Houses
pig: piggy-3
heart: 4
trigger: location=lake_alice,hub; time=evening
priority: 50
cg: cg_p3_bat_river
summary: Half a million bats, one homemade EEG headband, and a question Piggy 3 has never said out loud.
---
[sfx notify]
narrator: Your KempaPager buzzes: "bats in 15 min. lake alice? i have a hat"
[time evening]
[bg lake_alice fade]
[bgm lake_alice]
narrator: Lake Alice at dusk. By the bat barns on Museum Road, a small crowd waits with their phones out.
narrator: Piggy 3 is wearing a headband with wires. It has, you're fairly sure, a 3D-printed clip holding a tiny circuit board.
[show piggy-3 excited center]
piggy-3 excited: Okay, so I was thinking— don't laugh— what if I recorded my brain while we watch the bats?
piggy-3 happy: It's a DIY EEG: four electrodes, a little board, a laptop.
piggy-3 laughing: It's not medical. It's basically a very fancy hat.
player: It's a very good hat.
piggy-3 laughing: Thank you. It took one weekend and most of a roll of tape.
piggy-3 thinking: So, there's this thing called alpha waves— a rhythm around ten cycles a second. It gets big when you're calm.
piggy-3 happy: It's sort of the brain's idle animation.
piggy-3 confused: Technically it's biggest with your eyes closed. Which is a problem, because— bats.
piggy-3 thinking: So it'll be smaller with my eyes open. But I want to see if it's bigger here than in the lab, like, as a baseline.
narrator: The sky goes orange, then pink. Nothing happens yet.
piggy-3 happy: Fun fact while we wait: when UF built the first bat house, the bats just… ignored it.
piggy-3 laughing: For, like, three years, it sat there totally empty. Zero users.
piggy-3 thinking: And then they finally moved in. Now there are whole barns, and half a million bats.
piggy-3 bashful_smile: I think about that a lot, actually. Sometimes it just takes a while for anyone to show up.
[sfx bats]
[shake 0.1 400]
narrator: Then it starts. A few bats flicker out of the barns, then dozens, then hundreds.
narrator: Then a river: a dark, chittering river pouring across the orange sky.
[cg cg_p3_bat_river]
piggy-3 excited: Half a million Brazilian free-tailed bats. They eat, like, two and a half billion bugs a night.
piggy-3 happy: Basically the best pest control in Florida. And they can fly a hundred miles an hour— a hundred!
narrator: The laptop on the boardwalk beside him draws a soft, rolling line.
piggy-3 surprised: Oh— look, look at that. Big alpha.
piggy-3 laughing: Calm brain, big alpha. Basically, bats are good for me— that's my new paper.
[cg off]
[bgm stop 1500]
narrator: The river thins to a trickle. Piggy 3 watches the line on his screen, and it's getting smaller.
piggy-3 thinking: Huh. It dropped.
piggy-3 neutral: Can I tell you something kind of dumb?
piggy-3 sad: I don't really know what to do when I'm not building something. Like, just— being somewhere, without a project.
piggy-3 sad: If I'm not building something, what am I for?
? You're for you.
  [bond piggy-3 +30]
  narrator: He doesn't answer for a while. On the screen, the line slowly starts to climb.
  piggy-3 surprised: …Huh. It went back up.
  piggy-3 shy_blush: Okay. I'm going to be thinking about that for, like, a week.
? You're my favorite builder.
  [bond piggy-3 +22]
  piggy-3 flustered_blush: Okay, that's— that's a really nice thing to say to someone wearing a hat with wires on it.
  piggy-3 bashful_smile: Thank you. I mean it— thanks.
? Show me your alpha waves again.
  [bond piggy-3 +18]
  piggy-3 laughing: You just want to see the bat spike again.
  piggy-3 happy: …Okay, me too. Look, here— this part right here, that's the river.
[bgm piggy3_theme]
piggy-3 thinking: Okay, so next time I could add two more electrodes, and a better clip, and—
narrator: He stops. Then, carefully, he unclips the headband and closes the laptop.
piggy-3 bashful_smile: No. Next time I'm just going to watch.
piggy-3 affectionate_blush: With you. If that's— yeah, with you.
[bond piggy-3 +50]
narrator: The last bats wink out against the purple sky. He doesn't open the laptop again.
[end]


# ───────────────────────── ♥5 ─────────────────────────

=== p3_h5
title: Invite to Code
pig: piggy-3
heart: 5
trigger: location=dorm,hub; weekday=fri,sat,sun; hour=9-23
priority: 50
cg: cg_p3_pair_programming
summary: A day off at Sakura House, a laptop, and his coding agent. Together you ship one real feature into the KempaPager.
---
[bg dorm fade]
[bgm dorm]
[if weekday = fri]
  narrator: Sakura House, on a Friday, which Piggy 3 has declared "basically the weekend."
[else]
  narrator: Sakura House, on a slow {weekday}. Nobody has anywhere to be.
[endif]
[sfx door]
narrator: A knock on your door: twice, a pause, then once more, softer.
[show piggy-3@hoodie happy center]
piggy-3 happy: Hi. Okay, so I was thinking.
piggy-3 happy: Do you want to make something? Like, right now?
piggy-3 bashful_smile: A little thing. It ships tonight, into your actual pager.
[bg home_p3 fade]
narrator: His room smells like warm plastic and cold brew: lavender walls, fairy lights, a shelf of pirate manga.
piggy-3 laughing: Welcome to the den. That's a printer, that's a printer, and that's a smaller printer.
piggy-3 neutral: Okay. Remember when I asked if you'd used Codex, and then didn't explain anything?
piggy-3 happy: This is me explaining. It's a coding agent: you tell it what you want, it writes the code, you read what it did.
piggy-3 neutral: And then you argue with it a little. The part I care about is the reading, because you still have to know what it did.
piggy-3 flustered_blush: I should say, I didn't write all of your pager. The agent wrote a lot of it.
piggy-3 bashful_smile: I told it what I wanted, and I checked everything.
piggy-3 neutral: Which— honestly, that's sort of the actual job now? Knowing what you want, and knowing when it's wrong.
[cg cg_p3_pair_programming]
narrator: You sit on the floor, shoulder to shoulder, the laptop balanced on a cushion. The printers hum like a small, contented choir.
piggy-3 neutral: Okay, first thing: the commit gets a co-author line. Like, at the bottom it says who made it.
piggy-3 bashful_smile: I want it to say you.
piggy-3 flustered_blush: Also, um— what do I call you? I keep wanting to say "co-pilot."
? Co-pilot works.
  [set p3_nickname = co-pilot]
  [bond piggy-3 +5]
  piggy-3 happy: Okay, co-pilot. Yes— that's really nice to say out loud.
? Beta tester.
  [set p3_nickname = "beta tester"]
  [bond piggy-3 +5]
  piggy-3 laughing: Beta tester! You're very good at finding things I broke, so that tracks.
? Just {player}.
  [unset p3_nickname]
  [bond piggy-3 +5]
  piggy-3 shy_blush: {player}. Yeah— honestly, that's my favorite one anyway.
[cg off]
piggy-3 happy: Okay, now the real question. One feature, small enough to finish today— which one?
? Bat Forecast: when the bats fly tonight
  [set p3_feature = bat_forecast]
  [bond piggy-3 +15]
  piggy-3 happy: Okay, so: sunset for Gainesville, plus fifteen to twenty minutes— the bat delay.
  piggy-3 neutral: And if it's cold or rainy, it just says "probably not tonight." The bats are kind of divas about weather.
  [remember piggy-3 "Player built the Bat Forecast with Piggy 3."]
? Carillon Alarm: a chime before the bells
  [set p3_feature = carillon_alarm]
  [bond piggy-3 +15]
  piggy-3 happy: Oh, that's nice. The live sets are weekdays at 12:35 and 4:55, so the pager chimes a minute before.
  piggy-3 neutral: Like a little heads-up, so you can stop and listen instead of catching the last ten seconds.
  [remember piggy-3 "Player built the Carillon Alarm with Piggy 3."]
? Hydration Timer: water reminders for Piggy 2
  [set p3_feature = hydration_timer]
  [bond piggy-3 +15]
  piggy-3 laughing: He tells everyone to hydrate and then forgets for nine hours. He's going to pretend he hates it.
  piggy-3 happy: He's going to love it. It's basically a timer, for a guy who says "perfusion" a lot.
  [remember piggy-3 "Player built Piggy 2's Hydration Timer with Piggy 3."]
[sfx typing]
narrator: He describes the feature to the agent in three plain sentences. Code pours into the editor faster than you can read it.
piggy-3 neutral: Okay, now we read. Every line— that's the deal.
piggy-3 confused: Wait, the tests are failing. There's a bug in here somewhere.
piggy-3 happy: Want to find it with me? You take the left half of my brain.
[unset minigame_won]
[minigame debug]
[if flag(minigame_won)]
  piggy-3 surprised: You found that before I did. Okay, that's— that's really cool.
  piggy-3 happy: I'm putting it in the commit message: "Bug found by co-author." Very official.
[else]
  piggy-3 laughing: Okay, that one was sneaky. Bugs are hard— that's why you do it with two people.
  piggy-3 happy: Found it, though, together. That counts.
[endif]
[bgm piggy3_theme]
[sfx build_ok]
narrator: Green checkmarks. All of them.
piggy-3 laughing: Tests pass— okay! Pushing.
[sfx notify]
narrator: Your KempaPager buzzes. A new feature, with a plain gray square for an icon.
piggy-3 happy: See, this part's easy. When it's for somebody else, I just— ship it.
player: And when it's for you?
piggy-3 confused: …That's different. That's— don't look at me like that.
piggy-3 laughing: Okay, okay, I know. It's on the list of things I know about myself.
piggy-3 affectionate_blush: Anyway, that's the first thing I've ever shipped with somebody. Like, really with somebody.
[bond piggy-3 +50]
[if flag(p3_nickname)]
  piggy-3 bashful_smile: Good work, {flag:p3_nickname|co-pilot}.
[else]
  piggy-3 bashful_smile: Good work, {player}.
[endif]
narrator: At the bottom of the commit, in small gray letters: Co-authored-by: {player}.
[end]


# ───────────────────────── ♥6 ─────────────────────────

=== p3_h6
title: It's Not Pretty Yet
pig: piggy-3
heart: 6
trigger: location=reitz,hub; hour=10-22
priority: 50
cg: cg_p3_demo_day
summary: Showcase day at the Reitz. Piggy 3 wants to pull his demo. Piggy 1 and Piggy 2 brought a sign.
---
[sfx notify]
narrator: Your KempaPager buzzes. The Pig Pen group chat.
narrator: Piggy 1: "SHOWCASE TODAY!! reitz!! he's table 14!!" Piggy 2: "Bring water."
narrator: Then Piggy 3, a minute later: "pls don't come"
[bg reitz fade]
[bgm tension]
narrator: The Reitz Union, showcase day. Folding tables, extension cords, and a hundred laptops all trying to look impressive.
narrator: At table 14: one laptop, a stack of KempaPagers, and a black hoodie with the hood all the way up.
[show piggy-3@hoodie scared center]
piggy-3 scared: Oh— hi, you came. Okay— I'm pulling it.
player: Pulling what?
piggy-3 sad: The demo, my demo. The EEG thing— the little window from the lab.
piggy-3 confused: It's not pretty yet. The legend overlaps the trace on small screens.
piggy-3 scared: The loading spinner is two pixels off-center. People are going to notice two pixels.
piggy-3 sad: And it's mine, you know? When it's for somebody else, I can ship it.
piggy-3 sad: When it's mine, it's just… never done.
[sfx surprise]
[show piggy-1 excited left]
piggy-1 excited: THERE he is! Free ball— we made a sign!
[show piggy-2 neutral right]
piggy-2 neutral: I held the marker. Piggy 1 provided the volume.
narrator: The sign is poster board. It says SHIP IT in huge, uneven, very glittery capitals.
piggy-1 proud: Glitter is forty percent of the sign. I tracked it.
piggy-2 proud: I added "based" in the bottom right corner. Small, tasteful.
piggy-3 surprised: You guys made a sign? For me?
piggy-1 happy: Obviously! I moved practice, and Piggy 2 moved a nap.
piggy-2 neutral: I don't nap. I had a scheduled period of decreased consciousness.
piggy-1 laughing: He moved a nap.
piggy-3 sad: I really appreciate it, I do. It's just… it's not pretty yet.
piggy-2 thinking: Define "pretty."
piggy-3 confused: Like— done. Nothing wrong with it.
piggy-2 neutral: Patients are never done. We discharge them when they're ready, and they keep healing at home.
piggy-2 neutral: Your demo is ready. Discharge it.
piggy-2 proud: Based.
piggy-1 happy: You don't wait for a perfect set, teammate. You hit the one you get!
narrator: All three of them look at you.
piggy-3 sad: Um— {player}? What do you think?
? Ship it.
  [bond piggy-3 +35]
  piggy-3 surprised: …
  piggy-3 laughing: Okay— okay! Ship it.
? One more polish pass. Then ship it.
  [bond piggy-3 +18]
  piggy-3 happy: Okay, one pass. Just the spinner— just the two pixels.
  narrator: He fixes the spinner, then the legend. Then something nobody else will ever see.
  narrator: He's ready nine minutes after his demo slot starts. It's gorgeous, though.
  piggy-3 laughing: Constant offset! I corrected for it— mostly!
? I'll present it with you.
  [bond piggy-3 +30]
  piggy-3 surprised: You'd— with me? Like, standing right here?
  piggy-3 affectionate_blush: Okay, yeah. If you're here, I can do it.
  piggy-3 happy: You do the "wow," I'll do the "how."
narrator: Piggy 3 stands up and pushes the hood back. Then, very slowly, he pushes his glasses up.
[sfx shake]
[shake 0.35 600]
narrator: ゴ ゴ ゴ ゴ ゴ
piggy-1 surprised: Whoa. Do you guys hear that?
piggy-2 neutral: That's the HVAC.
piggy-3 laughing: It's a JoJo thing. You have to stand like this when you ship something— it's the rule.
piggy-2 proud: Menacing. Based.
[cg cg_p3_demo_day]
[bgm happy]
narrator: The demo runs. A grad student drops in a recording, and the little window shows before and after, the blinks highlighted in soft color.
narrator: She leans in: "Wait, can I use this? Like, on my actual data?"
[cg off]
piggy-3 surprised: Somebody wants to use it. Like, actually use it.
piggy-1 excited: SIDE OUT! That's a point, let's goooo!
piggy-2 proud: Clinical success. Write that down.
[bond piggy-1 +10]
[bond piggy-2 +10]
[hide piggy-1]
[hide piggy-2]
[bgm piggy3_theme]
piggy-3 happy: I told her yes. It's open, so she can download it and look inside.
piggy-3 laughing: It's like the bat house, except somebody moved in on the first day.
[if flag(p3_use_it)]
  piggy-3 bashful_smile: "Whichever one people will actually use." You said that, in the freezing lab.
[endif]
[if flag(p3_spaghetti)]
  piggy-3 shy_blush: And you still have the spaghetti one on your pager. You said it was perfect, and you meant it.
[else]
  piggy-3 shy_blush: You know I still have that spaghetti print? It's on my monitor, and it's a mess, and I look at it every day.
[endif]
piggy-3 affectionate_blush: I think I get it now. It's not about pretty— it's about it being out here, with people.
piggy-3 happy: It's still not pretty. It's out, though.
[bond piggy-3 +55]
[if flag(p3_nickname)]
  piggy-3 bashful_smile: Thanks, {flag:p3_nickname|co-pilot}. Really.
[else]
  piggy-3 bashful_smile: Thanks, {player}. Really.
[endif]
narrator: By the end of the day the sign has lost most of its glitter. Piggy 3 carries it home anyway.
[end]


# ───────────────────────── ♥7 ─────────────────────────

=== p3_h7
title: Long Job on HiPerGator
pig: piggy-3
heart: 7
trigger: location=marston,hub; time=evening,night
priority: 50
cg: cg_p3_job_complete
summary: While a job waits in the HiPerGator queue, Piggy 3 shows you a screen he hid inside your KempaPager.
---
[sfx notify]
narrator: Your KempaPager buzzes: "long job on hipergator. marston. company?"
[time night]
[bg marston fade]
[bgm night]
narrator: Marston Science Library, late. On the quiet floor, the only sounds are pages, keys, and a printer somewhere far below.
[if hour < 5]
  narrator: It's {time}. Piggy 3 should be asleep, and Piggy 3 is extremely not asleep.
[endif]
[show piggy-3@hoodie happy center]
piggy-3 happy: Hey, you came.
piggy-3 bashful_smile: Here— I saved you the good chair. It's the one that doesn't squeak.
narrator: On his laptop, a terminal shows one word, refreshed every minute: PENDING.
piggy-3 confused: It's a job on HiPerGator, training the big EEG model for the baseline. It's been pending for three hours.
piggy-3 laughing: HiPerGator is basically a very large friend who's also friends with seven thousand other people.
player: How long until it runs?
piggy-3 confused: Could be five minutes, could be five hours. The queue is a mystery— like weather, but for math.
narrator: He rubs his eyes under his glasses. The hood is up again, but only halfway.
piggy-3 neutral: Did you eat? You wrote "{fact:comfort_food|soup}" on your intake form, under comfort food.
piggy-3 flustered_blush: I— okay, I read the intake form. I read everyone's, I just read yours more than once.
player: You remembered that?
piggy-3 shy_blush: I remember a lot of stuff about you. That's sort of what I wanted to show you, actually.
piggy-3 neutral: Okay, so— can I show you something? It's— it's not pretty yet.
narrator: He stops. You can see him decide something.
piggy-3 bashful_smile: No. Actually, I'm just going to show you.
piggy-3 happy: Hold the A and C buttons on your pager, both, for three seconds.
[sfx ui_open]
[wait 600]
[sfx sparkle]
narrator: The screen goes dark. Then, pixel by pixel, a tiny sakura tree grows up from the bottom edge.
narrator: Branch after branch after branch, each one tipped with a blossom.
[if flag(ui_accent) = orange]
  narrator: The blossoms are Gator orange. It shouldn't work, and it really works.
[elif flag(ui_accent) = lavender]
  narrator: The blossoms are lavender, the color he picked when you told him to surprise you.
[else]
  narrator: The blossoms are sakura pink. Obviously.
[endif]
piggy-3 happy: It's an L-system— basically a tiny grammar for plants. Like, "a branch becomes a branch with two smaller branches."
piggy-3 shy_blush: And every day you hung out with me, it grew one more branch.
piggy-3 flustered_blush: The left side clips a little, and the trunk's too thick. I was going to fix it before I showed you, but—
player: Why did you make it?
[bgm romance]
piggy-3 affectionate_blush: I built it so I'd have a reason to check on you.
narrator: He says it quietly, like he's been holding it for a long time.
piggy-3 flustered_blush: That came out— okay, no. That came out exactly how I meant it.
? I'm really glad you showed me.
  [bond piggy-3 +35]
  piggy-3 bashful_smile: Yeah. Me too.
  piggy-3 affectionate_blush: I never show anyone stuff before it's done. This one's not done, and I don't think it's supposed to be.
? You never needed a reason.
  [bond piggy-3 +30]
  piggy-3 shy_blush: …Okay. Noted.
  piggy-3 bashful_smile: I'm going to keep checking anyway. The tree needs data.
? Can I check on you too?
  [bond piggy-3 +30]
  piggy-3 surprised: Oh.
  piggy-3 affectionate_blush: Yeah, please. I'm— honestly, I'm really bad at eating dinner.
[bond piggy-3 +60]
piggy-3 neutral: I'm going to watch the queue. You can stay if you want— it's nice when you're here.
[hide piggy-3]
[fade black 800]
[bgm sleep]
narrator: An hour later, the quiet floor is even quieter.
[fade clear 800]
[sfx build_ok]
narrator: The terminal blinks: JOB COMPLETED.
[sfx zzz]
[cg cg_p3_job_complete]
narrator: Piggy 3 is asleep on the keyboard, hood half over his glasses.
narrator: His cheek is on the J key, and the terminal is filling up with j's.
narrator: You save his work for him. It seems like the right thing to do.
[cg off]
narrator: On your KempaPager, the little sakura grows one more branch.
[end]


# ───────────────────────── Ending ─────────────────────────

# The ending only plays at dusk; outside dusk, this hub text tells the player where and when to go.
=== p3_ending_invite
title: A Text from Piggy 3
pig: piggy-3
trigger: location=hub; hearts>=8; seen=p3_h7; seen!=p3_ending; time=morning,day,night
priority: 30
replayable: false
summary: Piggy 3 asks you to meet him at Century Tower at dusk.
---
[sfx notify]
narrator: Your KempaPager buzzes. The text says: "century tower. dusk. don't be late"
narrator: A second text, right after: "i will also try to not be late"
narrator: Dusk, under the great sakura by Century Tower. Any evening between five and eight, he'll be there.
[end]

=== p3_ending
title: Commit Message
pig: piggy-3
ending: true
trigger: location=century_tower,hub; time=evening; hearts>=8; seen=p3_h7
priority: 60
cg: cg_p3_full_bloom
summary: Under the Century Sakura at dusk, Piggy 3 is early for once, and you write the commit message.
---
[if seen(p3_ending_invite)]
  narrator: Dusk. You head for Century Tower, like he asked.
[else]
  [sfx notify]
  narrator: Your KempaPager buzzes. The text says: "century tower. dusk. don't be late"
  narrator: A second text, right after: "i will also try to not be late"
[endif]
[time evening]
[bg legend_sakura fade]
[bgm piggy3_theme]
[petals normal]
narrator: The great sakura by Century Tower. The one from the brochure.
narrator: They say if two people make a promise under it while the carillon plays at dusk, the promise blooms forever.
[show piggy-3 happy center]
piggy-3 happy: Hi! You're here, I'm here— I was here first.
piggy-3 laughing: Forty minutes first, actually. I corrected for the offset— overcorrected, basically.
player: You're early. You're never early.
piggy-3 shy_blush: Yeah, well. I really didn't want to be late for this one.
piggy-3 thinking: Also, I redid the brochure while I waited, which nobody asked for. The legend part was in four different fonts.
piggy-3 flustered_blush: Sorry, I'm rambling. I ramble when I'm— yeah.
[if flag(p3_feature) = carillon_alarm]
  piggy-3 laughing: Oh— and your carillon alarm went off in my pocket. While I was standing under the actual carillon.
[elif flag(p3_feature) = bat_forecast]
  piggy-3 happy: Oh, and the bat forecast says twenty minutes, so we have time. I checked twice.
[elif flag(p3_feature) = hydration_timer]
  piggy-3 laughing: Oh, and Piggy 2's hydration timer went off. He texted me "drink water" with no period, so I think he's happy.
[endif]
piggy-3 neutral: Okay, I want to show you something. Hold A and C.
[sfx sparkle]
narrator: On your KempaPager, the little sakura is in full bloom. There isn't a bare branch left.
[cg cg_p3_full_bloom]
[petals heavy]
piggy-3 bashful_smile: It's still not pretty. The left side still clips, and the trunk's still too thick.
piggy-3 happy: I'm shipping it anyway.
narrator: Above you, the real sakura moves in the wind, and petals drift down over both of you.
[cg off]
piggy-3 thinking: Okay, so I was thinking…
[wait 700]
piggy-3 bashful_smile: Actually, no. I wasn't thinking.
piggy-3 affectionate_blush: I'm just really glad it was you.
[sfx bell]
[bgm romance]
narrator: Somewhere above you, the carillon begins to play.
piggy-3 flustered_blush: Okay— okay, there's the bells. That's the legend thing, this is— we're doing this.
piggy-3 bashful_smile: So the legend says you make a promise. I don't really know how to do promises, but I know how to do commits.
piggy-3 thinking: A commit's basically a promise. You're saying, "this changed, and it's real now."
piggy-3 affectionate_blush: Every commit needs a message, like a little note about what changed. I want you to write this one.
? feat: best friend
  [set fact.commit_message = "feat: best friend"]
  [remember piggy-3 "commit_message=feat: best friend"]
  [bond piggy-3 +30]
  piggy-3 happy: Feat, like a new feature. Best friend.
  piggy-3 affectionate_blush: …Yeah. That's exactly what changed.
? fix: lonely
  [set fact.commit_message = "fix: lonely"]
  [remember piggy-3 "commit_message=fix: lonely"]
  [bond piggy-3 +30]
  piggy-3 surprised: Fix: lonely.
  piggy-3 shy_blush: Okay, that's— yeah. That one's really accurate, almost too accurate.
? docs: us
  [set fact.commit_message = "docs: us"]
  [remember piggy-3 "commit_message=docs: us"]
  [bond piggy-3 +30]
  piggy-3 laughing: Docs, like documentation. Of us.
  piggy-3 loving: That's so nerdy, I love it. Okay— I really love it.
? Let me write my own.
  [input commit_message "Commit message?" "feat: best friend"]
  [bond piggy-3 +30]
  narrator: He reads it once. Then again, slower.
  piggy-3 affectionate_blush: Okay, yeah. That's the one.
[sfx typing]
narrator: He types it in, reads it back to you out loud, and presses Enter.
[sfx build_ok]
narrator: git commit -m "{fact:commit_message|feat: best friend}"
piggy-3 happy: Shipped.
player: So it's a promise?
piggy-3 laughing: It's committed. I mean, technically you could revert it.
piggy-3 affectionate_blush: I'm never reverting it.
piggy-3 thinking: You know how I always ask "best for what?" Like, about everything?
piggy-3 affectionate_blush: I think I finally found one where I don't have to ask.
[if flag(p3_nickname)]
  piggy-3 bashful_smile: Okay, {flag:p3_nickname|co-pilot}— same time tomorrow? I'll be nine minutes early.
[else]
  piggy-3 bashful_smile: Okay, {player}— same time tomorrow? I'll be nine minutes early.
[endif]
narrator: The carillon plays on. Under the sakura, the promise blooms, and somewhere in a repository, it's already saved.
[end]


# ───────────────────────── Small scenes ─────────────────────────

# Called by the UI after the player's 3rd free-chat exchange (design-ux §4.8). Afterwards the UI reads
# flags.big_brain_offer: "open" → show the Big Brain panel, "later" → ask again in a few days, "never" → don't ask.
=== p3_big_brain_offer
title: Big Brain
pig: piggy-3
replayable: false
summary: Piggy 3 explains the optional on-device language model, tradeoffs first.
---
[sfx question]
[show piggy-3 thinking center]
piggy-3 thinking: Hey— sorry, quick thing.
piggy-3 thinking: Okay, so I was thinking. Can I tell you about a nerdy thing?
piggy-3 happy: Right now, when we chat, you're talking to the Heuristic Brain. It's basically a big, careful list of things we know how to say.
piggy-3 happy: It's instant, and it works offline. But it only knows a few hundred things.
piggy-3 excited: There's another option: a small language model that runs right in your browser. We call it Big Brain.
piggy-3 thinking: The idea being, we could talk about basically anything. Not just the few hundred things.
piggy-3 neutral: And it runs on your device, on your actual GPU. What you type never leaves your device.
piggy-3 happy: It's an open model, too, so you can download it and look inside. I really like that part.
piggy-3 confused: Okay, tradeoffs, though. There are always tradeoffs.
piggy-3 thinking: It's a download. About a quarter of a gigabyte for the smallest one, up to a bit over a gigabyte for the best one.
piggy-3 thinking: It's one time, and then your browser keeps it. It needs WebGPU, so some browsers can't run it yet.
piggy-3 confused: Phones might get warm, and Wi-Fi is better than data. And small models say weird stuff sometimes.
piggy-3 laughing: I'll still be me, though. Like, ninety percent me.
piggy-3 thinking: So— best for what, though?
piggy-3 happy: If you just want to hang out, the Heuristic Brain is great, and it's already here. If you want to talk about anything, Big Brain.
piggy-3 bashful_smile: No wrong answer. I'll be here either way.
? Show me the options.
  [set big_brain_offer = open]
  piggy-3 excited: Okay! I'll pull up the panel— it shows the exact sizes for your device.
? Maybe later.
  [set big_brain_offer = later]
  piggy-3 happy: Totally. It's in Settings, under Brain, whenever you want it.
? I'll keep the Heuristic Brain.
  [set big_brain_offer = never]
  piggy-3 laughing: Respect. Honestly, it's a really good little brain— I'm a little biased.
[end]


=== p3_anime_apps
title: Anime & Apps
pig: piggy-3
trigger: location=volleyball_courts; present=piggy-1; hearts(piggy-3)>=2; hearts(piggy-1)>=1
priority: 20
summary: Piggy 3 turns Piggy 1's twelve-column serve spreadsheet into one chart. The anime argument goes less well.
---
[bg volleyball_courts fade]
[bgm piggy1_theme]
narrator: The sand courts. Piggy 1 is mid-serve when Piggy 3 shuffles across the sand, holding his phone up like a trophy.
[show piggy-1 surprised left]
[show piggy-3 happy right]
[if hour < 9]
  piggy-3 neutral: Okay, so I haven't slept yet. So technically this is late, not early.
[endif]
piggy-3 happy: Okay, so I was thinking about your serve spreadsheet. The one with twelve columns.
piggy-1 proud: It's a REALLY good spreadsheet. Eighty-seven point five percent this week!
piggy-3 laughing: It looks like a tax form. Twelve columns, same size, same gray.
piggy-1 surprised: It does NOT look like a tax form!
piggy-3 bashful_smile: So I made you a little app instead. Version one— just one chart.
narrator: On the screen: a tiny pixel court in sakura pink, and under it, one button. TAP WHERE IT LANDS.
piggy-3 thinking: You serve, I tap where it lands: in goes pink, out goes red. That's the whole app.
[if flag(p1_captain)]
  piggy-1 excited: Captain, watch this— ten serves, let's goooo!
[else]
  piggy-1 excited: Teammate, watch this— ten serves, let's goooo!
[endif]
[sfx ball_hit]
[wait 300]
[sfx ball_hit]
[wait 300]
[sfx ball_hit]
narrator: Ten serves. Piggy 3 taps ten times, very seriously, tongue between his teeth.
piggy-1 proud: Eight for ten, eighty percent! …Wait, that's lower than my spreadsheet.
piggy-3 laughing: The spreadsheet was very generous to you.
piggy-3 thinking: Okay, but look— that part right here. Both misses went long, on the left.
piggy-1 surprised: Both of them?
piggy-3 happy: Both, so it's not "I miss sometimes," it's one thing. One thing is fixable.
piggy-1 thinking: …I toss a little behind me when I'm tired. Coach keeps saying that, and I never believed him.
piggy-1 excited: The chart believes him!
piggy-3 happy: That's basically the whole point of a chart. It doesn't care what you believe.
piggy-1 excited: Okay, now add spikes! And blocks, and digs, and how many oranges I ate!
piggy-3 laughing: Okay, so that's— no. That's a corporate dashboard again.
piggy-3 neutral: Version one does one thing. You use it for a week, then we see what's missing.
piggy-1 confused: Wait, why does the icon have a tiny pirate hat on it?
piggy-3 bashful_smile: Because it's my app, and the pirate one is the best anime. That's just true.
piggy-1 surprised: Excuse me? The volleyball one is the best anime— it's literally about my life.
piggy-3 happy: The pirate one is about a crew, though, so it's basically about a team. The most team a team can be.
piggy-1 thinking: …Okay, that's annoyingly good.
piggy-1 excited: {player}, settle this!
? Team volleyball anime.
  [bond piggy-1 +10]
  [bond piggy-3 +5]
  piggy-1 excited: YES! Free ball— the people have spoken!
  piggy-3 laughing: The people have watched one season.
? Team pirate anime.
  [bond piggy-3 +10]
  [bond piggy-1 +5]
  piggy-3 excited: Okay, thank you! Somebody gets it!
  piggy-1 sad: Betrayal. On my own court.
? Why not watch both, together?
  [bond piggy-1 +8]
  [bond piggy-3 +8]
  piggy-1 excited: Watch party in the Sakura House common room! I'll bring oranges!
  piggy-3 happy: Okay, I'll make a little thing that tracks which episodes we're on. Like, a shared list.
  piggy-1 laughing: Of course you will.
piggy-1 happy: Okay. Same time next week, and the chart comes too.
piggy-3 bashful_smile: Yeah. It's a good chart— and honestly, a good spreadsheet, too.
narrator: That night, Piggy 1 posts a screenshot to the group chat: one pink court, eight pink dots, two red ones. "WE HAVE DATA."
[end]


=== p3_brains_builders
title: Brains & Builders
pig: piggy-3
trigger: location=communicore; present=piggy-2; hearts(piggy-3)>=2; hearts(piggy-2)>=1
priority: 20
summary: Piggy 2 brings the signals. Piggy 3 brings the interface. Somebody brings up lunch.
---
[bg communicore fade]
[bgm lab]
narrator: The Communicore. Piggy 3's laptop is balanced on a stack of Piggy 2's flashcards, which Piggy 2 has decided to allow.
[show piggy-2 neutral left]
[show piggy-3 excited right]
piggy-3 excited: Oh, hi! Okay, come look— we're building a viewer for his lab data.
piggy-2 proud: The lab pigs are doing great. They have enrichment schedules, and one of them has a favorite ball.
piggy-3 thinking: Okay, so what are you actually looking for in the signal? Give me the simple version first.
piggy-2 neutral: Overnight EEG, mostly. And one test: a tiny, gentle pulse at the hind leg, then we watch for it at the brain.
piggy-2 proud: If it arrives, the spinal cord is carrying the message.
piggy-2 happy: Every week, a little stronger. That's recovery.
piggy-3 happy: Okay, so the big thing on screen is: did it arrive, yes or no? Then how strong.
piggy-2 thinking: Make every alarm red. Red is urgency, red is ischemia.
piggy-3 confused: Okay, but if everything's red, nothing's red. You just stop seeing it.
piggy-2 neutral: …
piggy-2 proud: Based.
piggy-3 laughing: Thank you! One red thing, only when it matters.
piggy-2 happy: His code reads my electrode data. My data makes his code useful.
piggy-2 proud: Based collaboration.
piggy-3 happy: He's basically a golden retriever with a scalpel. Metaphorically— mostly!
piggy-2 neutral: I'm holding a pen.
piggy-3 laughing: Metaphorically!
piggy-2 thinking: Also, he hasn't eaten. Look at him— his perfusion is questionable.
piggy-3 confused: I had a granola bar.
piggy-2 neutral: When.
piggy-3 sad: …Yesterday.
piggy-2 neutral: Feed him, {flag:p2_nickname|intern}. Doctor's orders— well, future doctor's orders.
? Let's all get lunch.
  [bond piggy-2 +10]
  [bond piggy-3 +10]
  piggy-2 proud: Group perfusion. Based.
  piggy-3 happy: Okay, but we're naming the viewer at lunch. That's the deal.
? Name the viewer first. Then lunch.
  [bond piggy-3 +10]
  [bond piggy-2 +6]
  piggy-3 excited: Yes! Okay, ideas— go.
  piggy-2 neutral: Perfusion Viewer.
  piggy-3 confused: It's brain signals. It doesn't show perfusion at all.
  piggy-2 proud: Everything is a perfusion viewer if you believe.
? Call it Snout Scope.
  [bond piggy-3 +8]
  [bond piggy-2 +8]
  piggy-3 surprised: Oh, that's actually really good. Snout Scope.
  piggy-2 proud: Snout Scope. Based.
narrator: Ten minutes later, all three of you are walking to lunch, still arguing about fonts.
[end]
