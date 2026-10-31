# Piggy 2 — "Perfusion Route" (GAME_DESIGN §10, research/design-story §8). Voice: characters/piggy-2.md.
# Heart events p2_h1..p2_h7, the ending p2_ending ("Sakura Rounds") with its invite page, and three extras:
# p2_rounds (no trigger: the hub calls it for Doctor's Rounds), p2_coach_medic (with Piggy 1),
# p2_brains_builders (with Piggy 3).
# Hard rule: when the player says "Based." he answers exactly "Patriot."
# He wears scrubs in p2_h1, p2_h3 and the ending: those scenes use only scrubs-supported poses.
#
# Flags written here:
#   p2_based_h1 / p2_based_h6   picked "Based." (call and response) in that event
#   p2_quiz                     neuro quiz score 0..3 (p2_h2)          p2_neuro_trivia   daily Neuro Trivia unlocked
#   outfit_scrubs               scrubs unlocked (p2_h3; [outfit] sets it too)
#   p2_h3_banana                handed him a banana in the sim lab
#   p2_nickname                 intern | resident | partner, his ♥4 nickname for you (p2_h4)
#   p2_accepts_bedtime          he takes bedtime nudges from now on (p2_h5)
#   p2_h7_care                  what you did when he crashed (quoted in his chart note)
#   p2_promise                  followup | rest | snacks (p2_ending)
#   p2_pager / p2_night_pager   backup | oink | apples; the overnight pager exists (p2_brains_builders)

# ───────────────────────── ♥1 ─────────────────────────

=== p2_h1
title: Pupils Equal, Round, Reactive
pig: piggy-2
heart: 1
trigger: location=reitz; time=morning,day,evening
priority: 50
cg: cg_p2_follow_the_hoof
summary: A follow-up wellness check at the Kempanion booth. Follow the hoof.
---
[bg reitz fade]
[bgm piggy2_theme]
narrator: The Kempanion booth is still set up outside the Reitz Union, wedged between a boba pop-up and a chess club bribing people with donuts.
narrator: A hand-lettered sign is taped to the folding table: FREE WELLNESS CHECKS — NO APPOINTMENT NEEDED.
[show piggy-2@scrubs neutral center]
piggy-2 neutral: You're back.
[sfx surprise]
piggy-2 surprised: For your follow-up.
piggy-2 happy: Nobody comes back for their follow-up. Based.
player: I was just walking by.
piggy-2 confused: You walked by twice. That's a pattern.
piggy-2 neutral: Sit. Last time, you got the express check.
piggy-2 happy: Today you get the full neuro exam.
[sfx step]
narrator: You sit on a folding chair. He clicks a penlight on and off, on and off, like a very serious pen.
piggy-2 clinical: Look at me. Keep your head still.
[sfx sparkle]
piggy-2 neutral: Follow my hoof.
[cg cg_p2_follow_the_hoof]
narrator: One hoof hangs in the air between you, level as a scalpel. Behind it, his face does not move at all.
narrator: Even the boba line goes quiet. Nobody wants to interrupt a neurological exam.
[cg off]
? (Follow the hoof.)
  [bond piggy-2 +20]
  narrator: Left, right, up, down. Your eyes trace a careful H in the air.
  piggy-2 happy: Smooth pursuit. No nystagmus.
  piggy-2 happy: Cranial nerves three, four and six: intact. Based.
? Based.
  [bond piggy-2 +25]
  [set p2_based_h1]
  [wait 400]
  piggy-2 neutral: Patriot.
  [sfx heart]
  narrator: He says it like a salute. Then he writes something on his clipboard and underlines it twice.
  piggy-2 bashful_smile: Call and response: intact. Rare finding.
? Are you a doctor?
  [bond piggy-2 +15]
  piggy-2 neutral: Yes. Fourth-year neurosurgery resident. Legally and spiritually.
  piggy-2 confused: The folding table undermines both. I'm aware.
narrator: The penlight clicks on. A tiny sun crosses one eye, then the other.
piggy-2 neutral: Pupils equal, round, reactive to light.
piggy-2 happy: PERRL. The most beautiful acronym in medicine.
piggy-2 clinical: Vitals stable. Perfusion appears excellent.
piggy-2 happy: You're cleared.
narrator: He clicks the penlight off. Then he yawns, hides it behind his clipboard, and pretends it didn't happen.
? Your turn. Follow MY hand.
  [bond piggy-2 +15]
  narrator: You hold up one hand. He stares at it like an instrument he was never trained on.
  piggy-2 flustered_blush: That's— I'm the one who— this isn't—
  narrator: His eyes follow your hand anyway, left and right, very slowly.
  piggy-2 shy_blush: ...Fine. Pupils equal, probably.
  piggy-2 bashful_smile: ...Based.
? When did you last eat?
  [bond piggy-2 +10]
  piggy-2 confused: Define "eat."
  piggy-2 neutral: Black coffee at five. Technically a fluid.
  piggy-2 bashful_smile: ...Noted. I'll get a sandwich after my shift.
piggy-2 neutral: Here. Refill.
[sfx gift]
[give water_bottle 1]
narrator: He slides another water bottle across the table. A strip of tape on this one reads: WATER (PERFUSION).
piggy-2 neutral: Hydration is not a one-time event.
piggy-2 bashful_smile: I label everything. It's a coping mechanism.
piggy-2 happy: Come back for your next follow-up, {player}.
piggy-2 neutral: That's not a request. ...It's a strong recommendation.
[bond piggy-2 +20]
narrator: ♥ Memory: Follow the Hoof. A folding table, a penlight, and the most serious hoof in Gainesville.

# ───────────────────────── ♥2 ─────────────────────────

=== p2_h2
title: To Perfuse or Not to Perfuse
pig: piggy-2
heart: 2
trigger: location=communicore; slot=morning,midday
priority: 50
cg: cg_p2_poor_willis
summary: A brain model named Willis, a one-pig Hamlet, and a three-question neuro quiz.
---
[bg communicore fade]
[bgm lab]
narrator: The Communicore's second floor never closes for health-science students. It smells like coffee, highlighter and quiet panic.
narrator: In an empty classroom, Piggy 2 stands alone at the lectern, holding a squishy brain model at arm's length.
[show piggy-2 thinking center]
piggy-2 thinking: To perfuse, or not to perfuse.
piggy-2 sad: That is the question.
player: Are you doing Hamlet? To a brain?
piggy-2 neutral: The answer is perfuse. Always perfuse.
piggy-2 thinking: The play would have been very short.
[sfx sparkle]
[cg cg_p2_poor_willis]
narrator: He raises the model to eye level, one hoof pressed to his chest, like an actor in a very small theater.
player: Alas, poor Yorick?
piggy-2 sad: Willis. Alas, poor Willis.
piggy-2 sad: I knew him well.
narrator: On the base of the model, in tiny careful letters, someone has written WILLIS.
[cg off]
piggy-2 neutral: Named after the circle of Willis.
player: Is that a real thing?
piggy-2 excited: Extremely real. A ring of arteries under the brain.
piggy-2 explaining: Blood comes in from the front and the back, and the ring connects them. If one road closes, blood takes another.
piggy-2 proud: A roundabout for blood. Perfusion's entire personality.
narrator: He sets Willis down on the lectern very gently, as if he might wake up.
piggy-2 neutral: You came to the Communicore voluntarily. Based.
piggy-2 thinking: Pop quiz. Three questions, no pressure.
piggy-2 neutral: Except intracranial pressure. We'll get to that.
[set p2_quiz = 0]
piggy-2 thinking: Question one. Your brain is about two percent of your body weight.
piggy-2 neutral: What share of your oxygen does it use?
? About 2%.
  [bond piggy-2 +4]
  piggy-2 neutral: Logical. Incorrect.
  piggy-2 thinking: About twenty percent. A fifth of your oxygen for one organ.
? About 20%.
  [set p2_quiz += 1]
  [bond piggy-2 +10]
  piggy-2 proud: Correct. A fifth of your oxygen for one organ.
  piggy-2 happy: Expensive. Worth every molecule.
? About 200%.
  [bond piggy-2 +4]
  [sfx surprise] [shake 0.3 200]
  piggy-2 surprised: That would be a perfusion emergency.
  piggy-2 neutral: It's twenty. I admire the ambition.
piggy-2 thinking: Question two. Blood flow drops below what a tissue needs.
piggy-2 neutral: What do we call that?
? Ischemia.
  [set p2_quiz += 1]
  [bond piggy-2 +10]
  piggy-2 excited: Ischemia. Yes.
  piggy-2 sad: The enemy. We fight it every day.
? Perfusion.
  [bond piggy-2 +4]
  piggy-2 neutral: That's the hero. You named the hero.
  piggy-2 sad: The villain is ischemia. Not enough blood flow.
? A Monday.
  [bond piggy-2 +4]
  [shake 0.3 200]
  piggy-2 laughing: ...Clinically adjacent.
  piggy-2 neutral: Officially, ischemia. Not enough blood flow.
piggy-2 thinking: Final question. Cerebral perfusion pressure equals mean arterial pressure minus what?
? Intracranial pressure.
  [set p2_quiz += 1]
  [bond piggy-2 +10]
  piggy-2 excited: ICP, yes. CPP equals MAP minus ICP.
  piggy-2 loving: Perfusion is my love language.
? Peer pressure.
  [bond piggy-2 +4]
  piggy-2 deadpan: Peer pressure is real. Not in this equation.
  piggy-2 thinking: Intracranial pressure. The skull is a closed box.
  piggy-2 neutral: More pressure inside means less blood gets in.
? Finals pressure.
  [bond piggy-2 +4]
  piggy-2 sad: Also real. Also not in this equation.
  piggy-2 thinking: Intracranial pressure. The skull is a closed box.
  piggy-2 neutral: More pressure inside means less blood gets in.
[sfx success]
[if flag(p2_quiz) >= 3]
  piggy-2 surprised: Three for three.
  piggy-2 proud: Board-certified. Spiritually, not legally.
[elif flag(p2_quiz) >= 1]
  piggy-2 happy: {flag:p2_quiz|1} out of 3. Passing.
  piggy-2 proud: Every neuron you used just now was based.
[else]
  piggy-2 thinking: Zero out of three. But you took a neuro quiz at {time}, voluntarily.
  piggy-2 proud: Clinically, that is the most based score there is.
[endif]
[set p2_neuro_trivia]
piggy-2 neutral: Same time tomorrow. I'll bring new questions.
piggy-2 bashful_smile: And Willis. He enjoyed this.
narrator: He tucks the brain model under one arm, carefully, like a football he respects.
[bond piggy-2 +30]
narrator: ♥ Memory: Alas, Poor Willis. A one-pig Hamlet, a brain with a name, and your first neuro quiz.

# ───────────────────────── ♥3 ─────────────────────────

=== p2_h3
title: Scrub In: Sim Edition
pig: piggy-2
heart: 3
trigger: location=shands; slot=dawn,morning,midday,afternoon
priority: 50
cg: cg_p2_scrubbed_in
summary: Research-year practice in the sim lab, a lumbar drain on a mannequin named Gerald, and his scrubs.
---
[unset p2_h3_banana]
[bg shands fade]
[bgm hospital]
narrator: Shands never sleeps. Tired scrubs walk out, fresh scrubs walk in, and everyone is holding coffee.
[show piggy-2 neutral center]
[sfx surprise]
piggy-2 surprised: You came.
[if slot = dawn]
  piggy-2 neutral: The sim lab opens at six, and most people's alarms don't. Based.
[else]
  piggy-2 neutral: I've had the sim lab since six. I'm not tired; my coffee is tired.
[endif]
piggy-2 thinking: Research year means fewer OR days. Surgical skills fade without reps. Mine won't.
piggy-2 neutral: Lumbar drain today. You can observe.
piggy-2 neutral: Give me thirty seconds.
[hide piggy-2]
[bg or_suite fade]
[sfx door]
narrator: The sim suite hums. Green monitors glow over a training mannequin draped in blue, with a sticky note on its forehead: GERALD.
[sfx bath]
narrator: Water runs at the scrub sink. Two minutes per hoof, and you can hear him counting under his breath.
[outfit piggy-2 scrubs]
[set outfit_scrubs]
[show piggy-2@scrubs neutral center]
[sfx sparkle]
piggy-2 neutral: Scrubbed in.
[cg cg_p2_scrubbed_in]
narrator: He holds his hooves up at chest height, so nothing unsterile can touch them. Under the lights he looks like someone very sure.
piggy-2 neutral: Today's patient: Gerald. Very compliant, never complains.
[cg off]
player: What's a lumbar drain, exactly?
piggy-2 neutral: A thin, soft tube into the fluid space around the lower spine.
piggy-2 neutral: That fluid is CSF. Cerebrospinal fluid.
piggy-2 happy: We drain a little CSF, pressure comes down, the brain says thank you.
piggy-2 neutral: In big aortic surgeries it protects the spinal cord. Less pressure around the cord, better perfusion.
piggy-2 laughing: Liquid gold, but clear. You make about half a liter a day.
piggy-2 neutral: Sterile field is set. I need you to hand me something.
narrator: On the tray, sterile gloves in a paper sleeve. In your pockets, your phone and the banana you were saving for later.
? (Hand him the sterile gloves.)
  [bond piggy-2 +30]
  [sfx ui_select]
  piggy-2 surprised: You held the sleeve by the outer edge. You didn't touch the inside.
  piggy-2 happy: That's... actually correct. Based scrub tech.
? (Hand him your phone.)
  [bond piggy-2 +10]
  [sfx ui_error] [shake 0.3 200]
  piggy-2 surprised: Contaminated.
  piggy-2 laughing: Based, but contaminated.
  piggy-2 neutral: Put it in a bag. Then put the bag in a bag.
  narrator: You trade the phone for the gloves. He accepts them with the dignity of a pig whose sterile field survived.
? (Hand him the banana.)
  [bond piggy-2 +20]
  [set p2_h3_banana]
  piggy-2 confused: ...
  [wait 600]
  piggy-2 neutral: ...Later.
  narrator: You set the banana on the counter by the door. He looks at it a moment longer than necessary, then nods at the gloves.
[bgm tension]
[sfx monitor_beep]
narrator: The room goes quiet except for the monitor. He works slowly, narrating each step to Gerald as if Gerald can hear him.
piggy-2 neutral: Patient positioned, back flexed. Landmarks confirmed.
piggy-2 neutral: Catheter placed. Fluid return... clear.
[sfx sparkle]
piggy-2 happy: Look at that. Textbook.
piggy-2 neutral: Drain height set. Overdraining is not based.
[sfx monitor_beep]
[wait 500]
[sfx success]
[bgm happy]
piggy-2 laughing: Clinical success. Gerald will walk again.
player: Gerald has never walked. Gerald is a torso.
piggy-2 neutral: Spiritually, he walks.
narrator: He peels off the gloves inside-out in one clean motion. Then he sways, just slightly, and puts a hoof on the counter.
player: When did you last sleep?
piggy-2 confused: Define "sleep."
piggy-2 neutral: My sleep schedule isn't bad. It's mildly ischemic.
player: That's not a real diagnosis.
piggy-2 bashful_smile: Not yet. I'm writing the paper.
[if flag(p2_h3_banana)]
  narrator: On the way out, he picks up the banana and peels it with surgical precision.
  piggy-2 happy: Potassium. Based.
  piggy-2 bashful_smile: ...Thanks for breakfast.
[endif]
piggy-2 happy: You were a good scrub tech today, {player}.
piggy-2 bashful_smile: Come back sometime. Gerald liked you.
[bond piggy-2 +30]
narrator: Unlocked: Piggy 2's scrubs.
narrator: ♥ Memory: Scrubbed In. Sim lab practice, hooves held high, and a mannequin named Gerald.

# ───────────────────────── ♥4 ─────────────────────────

=== p2_h4
title: The Porcine Advantage
pig: piggy-2
heart: 4
trigger: location=communicore; slot=afternoon,dusk,night
priority: 50
cg: cg_p2_light_box
summary: Spine scans after hours, why pigs are the model, and three lab pigs with excellent names.
---
[bg communicore fade]
[bgm lab]
[if slot = afternoon]
  narrator: Late afternoon at the Communicore. Lectures let out, and one classroom stays lit: a monitor full of gray slices, stacked like coins.
[elif slot = night]
  narrator: Night at the Communicore. The hallways are empty, and one classroom still glows: a monitor full of gray slices, stacked like coins.
[else]
  narrator: Dusk at the Communicore. The hallways empty out, and one classroom still glows: a monitor full of gray slices, stacked like coins.
[endif]
[show piggy-2 thinking center]
piggy-2 thinking: Sagittal T2, thoracic spine. Look at that cord.
[cg cg_p2_light_box]
narrator: He leans in until the screen paints his snout blue, scrolling one slice at a time, slowly, like pages of a letter.
piggy-2 neutral: Zero motion artifact. The patient held perfectly still, like a professional.
[cg off]
player: Whose scan is it?
piggy-2 happy: Professor Snout's. Lead pig on our spinal cord study.
piggy-2 neutral: He's recovering from his spinal procedure. Ahead of projections.
player: Wait. A pig... studying pigs?
piggy-2 neutral: Swine are the best translational model.
piggy-2 bashful_smile: I'm biased. Literally.
piggy-2 explaining: A pig's spinal cord is about seven millimeters wide. Yours is about eight.
piggy-2 excited: Same blueprint, more snout. If it works in a pig's spine, it has a real chance in yours.
piggy-2 thinking: Brains too. Pig brains are gyrencephalic: folded, like yours.
piggy-2 proud: Gold-standard model. Based.
piggy-2 neutral: So pigs teach us spine surgery, and how draining CSF takes pressure off an injured cord.
piggy-2 neutral: And electrodes that listen to the brain.
? Isn't that weird, as a pig?
  [bond piggy-2 +20]
  piggy-2 neutral: Weird? No.
  piggy-2 proud: It's an honor.
  piggy-2 neutral: They're helping every patient who comes after them. Human and pig.
  piggy-2 thinking: My job is making sure every one of their days is a good day. That's the deal.
? Tell me about the microchips.
  [bond piggy-2 +25]
  piggy-2 excited: Wait. Yes, okay.
  piggy-2 excited: Tiny electrodes on the surface, and a chip that reads the signals. Huge data.
  piggy-2 excited: We can watch a spinal cord talk in real time. Then help it talk louder.
  piggy-2 proud: We put a tiny chip in. The pig gets a tiny upgrade.
? Do they have names?
  [bond piggy-2 +30]
  [sfx surprise]
  piggy-2 surprised: ...Yes.
  piggy-2 happy: Professor Snout. Very distinguished, ears like a tenured faculty member.
  piggy-2 happy: Sir Lancelot. Brave, but afraid of the mop.
  piggy-2 angry: The third one arrived with a name off a breakfast menu. Not based.
  piggy-2 proud: We renamed him Truffle.
  piggy-2 neutral: Pigs find truffles. It's a dignified profession.
piggy-2 neutral: A vet checks Snout, Lancelot and Truffle every day. Apples on Tuesdays.
piggy-2 thinking: A committee reviews every study before it starts. Replace, reduce, refine.
piggy-2 neutral: We take care of them. They take care of everyone after them.
piggy-2 proud: Porcine solidarity.
narrator: On the screen, the slices of Professor Snout's spine glow quietly, one after another.
piggy-2 thinking: If he walks normally at his twelve-week assessment, it means something. For pigs, then for people.
piggy-2 sad: It would be the first thing I've done that's really mine.
narrator: He says it to the screen, not to you. Then he clears his throat and turns around.
piggy-2 neutral: You've been on rounds with me four times now.
piggy-2 thinking: Rounds teams have titles, and you need one. Pick.
? Intern.
  [set p2_nickname = intern]
  piggy-2 teasing: Intern. Bottom of the hierarchy, infinite potential.
  piggy-2 proud: Based.
? Resident.
  [set p2_nickname = resident]
  piggy-2 surprised: Resident. Same as me. Bold, since you haven't even matched.
  piggy-2 happy: ...I'll allow it.
? Partner.
  [set p2_nickname = partner]
  piggy-2 surprised: Partner.
  piggy-2 flustered_blush: As in research partner. As in— partner.
  piggy-2 shy_blush: ...Patriot.
[bond piggy-2 +10]
[remember piggy-2 "{player}'s rounds title is {flag:p2_nickname|intern}."]
piggy-2 neutral: Go eat dinner, {flag:p2_nickname|intern}. That's an order.
piggy-2 bashful_smile: Leave the monitor on. Snout looks good in the dark.
[bond piggy-2 +30]
narrator: ♥ Memory: Light Box. Blue light on a pig's spine, and three names said like a promise.

# ───────────────────────── ♥5 ─────────────────────────

=== p2_h5
title: Mildly Ischemic
pig: piggy-2
heart: 5
trigger: location=dorm,hub; hour=6-21
priority: 50
cg: cg_p2_blanket_burrito
summary: He has a fever and a plan to go to Shands anyway. You have a better plan.
---
[bg sakura_house fade]
[bgm dorm]
narrator: You swing by Sakura House to grab your charger. From the porch comes the smallest, most dignified sneeze you have ever heard.
[sfx sneeze]
[show piggy-2 sick center]
narrator: Piggy 2 is halfway down the steps, bag on one shoulder, scarf wrapped three times around his neck. He is listing gently to the left.
piggy-2 sick: Heading to Shands. The hospital never closes.
player: You sound like a kazoo with a cold.
piggy-2 neutral: Mild upper respiratory symptoms. Irrelevant.
player: You're shivering.
piggy-2 thinking: I took my temperature. The number was... a number.
piggy-2 sick: I'm not sick. My perfusion is merely philosophical.
[sfx shake] [shake 0.4 250]
narrator: He turns toward the street with great purpose and walks directly into the porch post.
piggy-2 confused: ...That post moved.
? Bed. Now.
  [bond piggy-2 +30]
  [need piggy-2 energy +25]
  [sfx surprise]
  piggy-2 surprised: You're not my attending.
  player: Today I am. Bed.
  piggy-2 sad: ...That's a fair assessment.
  narrator: He lets you steer him back inside by the elbow. He doesn't argue, which is how you know it's bad.
? Bring {fact:comfort_food|soup}.
  [bond piggy-2 +25]
  [need piggy-2 hunger +25]
  narrator: You sit him on the steps and come back twenty minutes later with {fact:comfort_food|soup}, still warm.
  piggy-2 confused: That's not a hospital diet.
  [wait 500]
  piggy-2 shy: ...Based.
  narrator: He eats every bite. Then he lets you walk him back inside, which was your plan all along.
? Text the Pig Pen.
  [bond piggy-2 +20]
  [bond piggy-1 +10]
  [bond piggy-3 +10]
  [sfx notify]
  narrator: You text the Pig Pen group chat: "P2 sick, refuses bed. Need backup."
  [sfx door]
  [show piggy-1 excited left]
  piggy-1 excited: Medic down! Medic down!
  piggy-1 happy: I brought oranges! TEAM SNACK!
  [show piggy-3 thinking right]
  piggy-3 thinking: Okay, so I made a little hydration timer. It beeps every hour.
  piggy-3 happy: Actually, every forty-five minutes. Because you're sick, so.
  piggy-2 sick: You're both very loud.
  [wait 500]
  piggy-2 shy: ...Based.
  narrator: Piggy 1 takes his bag, Piggy 3 takes his phone, and you take his elbow.
  narrator: The three of you march him back to bed like a very small parade.
  [hide piggy-1]
  [hide piggy-3]
[hide piggy-2]
[bg home_p2 fade]
[bgm sleep]
narrator: His room is less a bedroom than a supply closet that learned to dream. Boxes of gauze, a model spine, eleven labeled water bottles.
[show piggy-2 sleepy center]
narrator: You build a blanket burrito around him until only his face and his spikes poke out.
[cg cg_p2_blanket_burrito]
piggy-2 sleepy: Temperature: warm. Burrito: structurally sound.
piggy-2 sleepy: You're a very good attending.
[cg off]
narrator: For a while there's only the hum of the mini-fridge. You think he's asleep.
piggy-2 sleepy: Can I tell you something unscientific?
piggy-2 sad: Everyone in my program is brilliant. They publish, they present, and they don't sleep either.
piggy-2 sad: If I stop for one day, I'm just... a pig in scrubs.
piggy-2 crying: Ordinary. I'm scared of being ordinary.
[wait 700]
? You'd never let a patient skip rest. Why yourself?
  [bond piggy-2 +20]
  piggy-2 surprised: ...
  piggy-2 sad: That's a good point. I hate it.
  piggy-2 thinking: Perfusion applies to me too. Reluctantly noted.
? You're not ordinary to me.
  [bond piggy-2 +15]
  piggy-2 flustered_blush: My heart rate just— that's a normal rate. Probably.
  piggy-2 shy_blush: ...Thank you. Based.
? Ordinary pigs don't name their brain model Willis.
  [bond piggy-2 +15]
  piggy-2 laughing: ...Strong data point.
  piggy-2 bashful_smile: Willis would agree. He's very supportive.
[set p2_accepts_bedtime]
piggy-2 sleepy: Wake me in twenty minutes.
[burst zzz]
[sfx zzz]
piggy-2 sleepy: ...Or tomorrow. Tomorrow is also fine.
[hide piggy-2]
narrator: He's asleep before you reach the door. You leave a full water bottle on his nightstand: number twelve.
[remember piggy-2 "{player} took care of me when I was sick and made me rest."]
[bond piggy-2 +30]
narrator: ♥ Memory: Blanket Burrito. The day the doctor let someone else take his temperature.

# ───────────────────────── ♥6 ─────────────────────────

=== p2_h6
title: Clinical Success
pig: piggy-2
heart: 6
trigger: location=communicore,hub; hour=6-21
priority: 50
cg: cg_p2_he_walks
summary: A video call from the lab. Twelve weeks later, Professor Snout takes his first steps.
---
[sfx notify]
narrator: A message from Piggy 2 lights up your KempaPager: "Communicore, second floor. Now."
narrator: A second message: "Not an emergency. The opposite of an emergency."
[bg communicore fade]
[bgm lab]
narrator: You find him in a study room with the door propped open and a laptop balanced on a stack of textbooks.
[show piggy-2 scared center]
piggy-2 scared: You came. Good— sit.
[if time = night]
  piggy-2 neutral: The overnight vet tech just called. Snout stood up on his own and refuses to sit back down.
  piggy-2 thinking: She's filming his gait assessment. Twelve weeks, to the day.
[else]
  piggy-2 neutral: The lab calls in two minutes. Professor Snout's twelve-week gait assessment.
[endif]
piggy-2 thinking: My heart rate is one-ten. Sinus tachycardia, emotional cause.
player: Is it bad?
piggy-2 sad: Not bad. It's everything: twelve weeks of work in one walk.
[bgm stop 800]
[sfx notify]
narrator: The laptop chimes. A video window opens on the lab: a padded walkway, bright lights, a voice off-camera saying, "Okay, here he comes."
narrator: A pink snout enters the frame. Then two ears, then four careful hooves.
[sfx step]
[wait 600]
[sfx step]
[sfx surprise]
piggy-2 surprised: He's weight-bearing. Both hind legs.
[sfx heartbeat]
narrator: Professor Snout takes one step, then another. Then he trots straight at the camera, ears flapping, and boops the lens with his nose.
[sfx oink_happy]
[bgm happy]
[cg cg_p2_he_walks]
piggy-2 crying: He's walking!
piggy-2 crying: Perfusion. Restored.
narrator: It's the loudest you have ever heard him. Then he cries, quietly and efficiently, the way he does everything.
narrator: He doesn't look away from the screen once.
[cg off]
? (Hug him.)
  [bond piggy-2 +40]
  [burst hearts]
  [sfx heart]
  narrator: You wrap your arms around him. He goes stiff for one second, protocol unclear, and then he leans in all the way.
  piggy-2 crying: ...Thank you. For being here.
  piggy-2 loving: You're the first one I wanted to tell.
  piggy-2 bashful_smile: Before my PI— my boss. Don't tell her.
? Based.
  [bond piggy-2 +35]
  [set p2_based_h6]
  [wait 500]
  piggy-2 crying: Patriot.
  narrator: It comes out wobbly. He says it again anyway, steadier, like a salute.
  piggy-2 loving: Patriot. ...Thank you for being here.
? (High hoof.)
  [bond piggy-2 +30]
  [sfx pet]
  narrator: You hold up a hand. He meets it with a hoof: a clean, loud, perfect high five that echoes down the hallway.
  piggy-2 happy: Clean contact. Based.
  piggy-2 crying: Sorry. My eyes are just... hydrating.
piggy-2 neutral: Twelve weeks ago, he couldn't stand.
piggy-2 thinking: We kept his cord perfused. Every hour, for weeks.
piggy-2 thinking: Every apple, every belly scratch, every check at four in the morning.
piggy-2 crying: It worked. It actually worked.
piggy-2 thinking: Someday it's a person. Somebody walks out of Shands because a pig named Professor Snout walked first.
narrator: On the screen, Snout has discovered a vet tech's shoelace and is untying it with tremendous concentration.
piggy-2 laughing: Fully recovered. Including his personality.
[sfx notify]
narrator: The Pig Pen group chat lights up. Piggy 1: "SNOUT!!! LET'S GOOOO"
narrator: Piggy 3: "okay I've watched it four times. actually five"
piggy-2 laughing: They're— okay. They're all very based.
piggy-2 affectionate_blush: So are you.
piggy-2 bashful_smile: Heart rate's back to normal sinus rhythm, by the way. Mostly.
[remember piggy-2 "{player} was there when Professor Snout walked again."]
[bond piggy-2 +40]
narrator: ♥ Memory: He Walks. A video call, four careful hooves, and the happiest tears in the Communicore.

# ───────────────────────── ♥7 ─────────────────────────

=== p2_h7
title: Discharge Summary
pig: piggy-2
heart: 7
trigger: location=marston,hub; time=day,evening,night
priority: 50
cg: cg_p2_discharge_summary
summary: His biggest grant deadline yet lands in finals week: three days of surgical focus, and a chart note at dawn.
---
[bg marston fade]
[time evening]
[bgm library]
narrator: Finals week. Marston stays open all night, and so, apparently, does Piggy 2.
narrator: You find him on the third floor behind a fortress of textbooks and printed drafts, in what he calls surgical focus.
[show piggy-2 thinking center]
piggy-2 thinking: Specific aims, approach, budget. Triaged by threat level.
piggy-2 neutral: Grant due in three days. My biggest yet.
piggy-2 neutral: I'm already PI on a small one. Principal investigator: the pig in charge.
piggy-2 neutral: Day one: vitals stable, coffee adequate.
narrator: You set a warm guava-and-cheese pastelito on his notes. He eats it without looking up, and then he looks up.
piggy-2 happy: Guava and cheese. Based.
[fade black 500]
[time night]
[fade clear 500]
narrator: Day two, 2:14 a.m. The fortress has grown a second tower.
piggy-2 neutral: Figure one: Professor Snout, walking. Figure two: his perfusion data. Both based.
player: Have you slept?
piggy-2 thinking: I'm in a state of focus. Surgeons call it flow.
player: You're in a state of 2 a.m.
piggy-2 sad: ...Ischemic take. Accurate, but ischemic.
narrator: You bring him water, then a veggie wrap, then more water. He accepts each one with a small nod, like a surgeon taking an instrument.
[fade black 500]
[fade clear 500]
narrator: Day three, 3:47 a.m. His pen is still moving; his eyes are not.
piggy-2 sleepy: Aim two: keep the injured cord perfused. Perfused. Perfu—
[burst zzz]
[sfx zzz]
narrator: He folds onto his notes like a closing book, snout on the budget justification. Out cold.
[hide piggy-2]
? (Let him sleep.)
  [bond piggy-2 +45]
  [set p2_h7_care = "one (1) jacket"]
  narrator: You switch off his desk lamp, slide the pen out of his hoof, and drape your jacket over his shoulders.
  narrator: Then you pull your chair up next to his and keep studying, so the first thing he sees when he wakes up is a friend.
? (Set an alarm for one hour.)
  [bond piggy-2 +30]
  [set p2_h7_care = "one (1) alarm, reset from one hour to five"]
  narrator: You set an alarm on his phone for one hour. Then you look at him, look at the phone, and change it to five.
? (Fold your scarf into a pillow.)
  [bond piggy-2 +35]
  [set p2_h7_care = "one (1) scarf, used as a pillow"]
  narrator: You slide a folded scarf under his snout. He mumbles "...sterile field..." and settles deeper into it.
[fade black 900]
[time morning]
[bgm morning]
[fade clear 900]
narrator: You wake with your cheek on a textbook. Sunlight floods the third floor, and somewhere an espresso machine hisses.
narrator: His chair is empty. On your notebook sits one sheet of paper in very neat handwriting, formatted exactly like a chart.
[sfx sparkle]
[cg cg_p2_discharge_summary]
narrator: DISCHARGE SUMMARY — Patient: Piggy 2. Admitted: Marston, third floor, finals week.
narrator: Hospital course: refused sleep for three days. Visitor provided food, fluids, and {flag:p2_h7_care|one (1) jacket}.
narrator: Patient slept five hours. Patient did not hate it.
narrator: Patient presents with chronic friendship. Prognosis: excellent.
narrator: Plan: continue indefinitely.
narrator: Attending: {player}. Unlicensed, but highly effective.
[cg off]
[sfx step]
[show piggy-2 neutral center]
piggy-2 neutral: You're awake. Good.
narrator: He's holding two coffees. The fur on one side of his face is flat from sleeping on the budget.
piggy-2 neutral: Black for me, milk for you. I observed your preferences.
piggy-2 happy: I slept and I ate. The grant goes in at nine. Eight hours early.
piggy-2 thinking: The next one is due in six weeks. I've scheduled sleep for it. Tentatively.
player: You wrote me a discharge summary.
piggy-2 shy_blush: Standard practice. When a patient leaves your care.
piggy-2 affectionate_blush: That's the original. I kept a copy for my records.
piggy-2 bashful_smile: ...Several copies.
player: "Chronic friendship"?
piggy-2 bashful_smile: Incurable. I checked the literature: no known treatment.
piggy-2 thinking: One more thing. There's a legend about the big sakura by Century Tower.
piggy-2 neutral: Make a promise under it at dusk, and it blooms forever. Zero peer-reviewed evidence.
piggy-2 shy_blush: ...I'd like to test it sometime. With you.
[remember piggy-2 "{player} kept me fed and made me sleep the week my big grant was due."]
[bond piggy-2 +50]
narrator: ♥ Memory: Discharge Summary. Three days of surgical focus, five hours of sleep, and one very official note.

# ───────────────────────── Ending ─────────────────────────

=== p2_ending_invite
title: A Page from Piggy 2
pig: piggy-2
trigger: location=hub; hearts>=8; seen=p2_h7; seen!=p2_ending; slot!=dusk
priority: 30
replayable: false
summary: Piggy 2 has a hypothesis about the legendary sakura.
---
[sfx notify]
narrator: Your KempaPager buzzes. A message from Piggy 2: "Hypothesis: the legend of the Century Sakura is real."
narrator: Another message: "Method: you, me, the big tree by Century Tower, at dusk. Any day."
narrator: A third: "Bring yourself. That's the whole list."
narrator: (Meet Piggy 2 at Century Tower at dusk.)

=== p2_ending
title: Sakura Rounds
pig: piggy-2
ending: true
trigger: location=century_tower,hub; slot=dusk; hearts>=8; seen=p2_h7
priority: 60
cg: cg_p2_rx_refills
summary: Century Tower at dusk. One last exam under the legendary sakura.
---
[sfx notify]
narrator: A message from Piggy 2: "Century Tower. Dusk. Don't be late."
[bg century_tower fade]
[bgm stop 1200]
narrator: The sun slides down behind Century Tower. Students drift across the lawn with their headphones in, and nobody looks up.
[bg legend_sakura fade]
[petals normal]
narrator: Beside the tower, the oldest sakura on campus is in full bloom, as always. Nobody can explain it, and Piggy 2 has stopped trying.
[show piggy-2@scrubs neutral center]
[sfx surprise]
piggy-2 surprised: You're early.
piggy-2 bashful_smile: Based.
narrator: He's still in scrubs, his Shands badge clipped to the pocket. He came straight from the lab.
piggy-2 neutral: Didn't change. Didn't want to risk being late.
piggy-2 neutral: The legend says two people make a promise here while the carillon plays at dusk. Then it blooms forever.
piggy-2 confused: Zero peer-reviewed evidence. Sample size: unclear.
piggy-2 neutral: I prepared a promise anyway. Protocol.
narrator: He unfolds an index card. His hooves are steady; his ears are not.
piggy-2 neutral: I will eat lunch. Most days.
piggy-2 neutral: I will sleep before two. Most nights.
piggy-2 shy_blush: And I will let you check my perfusion. Whenever you want.
piggy-2 bashful_smile: Your turn. You don't need a card.
? I'll keep showing up. For every follow-up.
  [set p2_promise = followup]
  piggy-2 surprised: Every follow-up.
  piggy-2 affectionate_blush: That's the most based promise I've ever heard.
? I'll make sure you rest.
  [set p2_promise = rest]
  piggy-2 laughing: Enforcement. Good, I'm going to need it.
  piggy-2 bashful_smile: Doctor's orders. Yours, this time.
? I'll bring snacks to the lab. Forever.
  [set p2_promise = snacks]
  piggy-2 happy: A friend who brings snacks to the lab. Top three on the based scale.
  piggy-2 affectionate_blush: You're number one, by the way. The snacks are number two.
[sfx bell]
narrator: Up in the tower, the carillon begins. The first bell rolls out over the lawn, low and golden, and the whole tree seems to listen.
[sfx bell]
piggy-2 neutral: Right on time.
piggy-2 neutral: Final exam. Follow my hoof.
narrator: He raises one hoof, level and steady, exactly like that first day at the booth. You follow it: left, right.
narrator: Then up. Past his ears, past the lowest branch, into the blossoms, where the last light is turning every petal gold.
[petals heavy]
[bgm romance]
[cg cg_p2_rx_refills]
piggy-2 neutral: Diagnosis: best friend.
piggy-2 neutral: Prognosis: chronic. Treatment: none indicated.
narrator: He tears a slip off a prescription pad and presses it into your hand.
narrator: RX: ONE (1) BEST FRIEND — SIG: DAILY — REFILLS: ∞
player: Based.
[wait 500]
piggy-2 neutral: Patriot.
[wait 900]
piggy-2 affectionate_blush: Perfusion: excellent.
[burst hearts]
[sfx heart]
narrator: The bells keep ringing and the petals keep falling. Neither of you looks away first.
[cg off]
piggy-2 bashful_smile: Same time tomorrow?
player: Same time tomorrow.
piggy-2 bashful_smile: Patriot.
[remember piggy-2 "{player} made a promise with me under the legendary sakura."]
[bond piggy-2 +50]
narrator: ♥ Memory: Rx: Refills ∞. A prescription with no expiration date, written under the oldest sakura on campus.

# ───────────────────────── Extras ─────────────────────────

# Doctor's Rounds (GAME_DESIGN §6). No trigger: the hub plays it by id when you ask Piggy 2 (♥4+) to check your sick
# Kempanion. The cure itself stays in pet doctorsRounds(); this scene is the bedside visit.
=== p2_rounds
title: Doctor's Rounds
pig: piggy-2
repeat: true
replayable: false
summary: Piggy 2 makes a house call on your sick Kempanion.
---
[sfx door]
[if flag(outfit_scrubs)]
  [show piggy-2@scrubs neutral right]
[else]
  [show piggy-2 neutral right]
[endif]
piggy-2 neutral: Rounds. I heard I have a patient.
[if companion = piggy-1]
  [show piggy-1 sick left]
  piggy-1 sick: Heyyy, Doc. I'm benched, day-to-day.
  piggy-2 neutral: Follow my hoof.
  narrator: Piggy 1's eyes track the hoof perfectly. Then his hands drift up to set it.
  piggy-2 confused: Don't set my hoof.
  piggy-2 neutral: Pupils equal and reactive. Temperature: elevated.
  piggy-2 happy: Competitiveness: also elevated. That's baseline.
  piggy-1 sad: Can I still make sunrise practice?
  piggy-2 neutral: Fluids, rest, one day off the sand. Then go spike something.
  piggy-1 happy: Copy that, Doc.
[elif companion = piggy-3]
  [show piggy-3 sick left]
  piggy-3 sick: Oh— hi. I'm fine.
  piggy-3 sad: I'm basically— okay, I'm not fine.
  piggy-2 neutral: Follow my hoof.
  piggy-3 confused: Wait, which— okay. Following.
  piggy-2 neutral: Pupils reactive, temperature elevated.
  piggy-2 confused: Curls: structurally compromised.
  piggy-3 thinking: I was actually going to build a little thermometer for this—
  piggy-2 neutral: You are the thermometer. You read hot.
  piggy-2 neutral: Close the laptop.
  piggy-3 sad: Can I just finish this one print—
  piggy-2 neutral: The printer will survive. Fluids and sleep.
  piggy-3 bashful_smile: ...Okay, yeah. Thanks.
[else]
  piggy-2 confused: No patients on my list. Everyone's perfusion looks fine.
  piggy-2 neutral: Hydrate anyway. Doctor's orders.
  [end]
[endif]
narrator: He writes in a tiny chart with a tiny pen. The handwriting is immaculate, which for a doctor is a rare clinical finding.
piggy-2 neutral: Diagnosis: a cold. Plan: rest, fluids, warm food.
piggy-2 happy: Prescribing {fact:comfort_food|soup}.
piggy-2 neutral: Doctor's orders. Neurosurgeon's, technically. Overqualified for a cold.
piggy-2 neutral: Keep him warm. Page me if anything changes.
[sfx medicine]
piggy-2 happy: He'll be fine. Good catch, {flag:p2_nickname|intern}.
[hide all]

=== p2_coach_medic
title: Coach & Medic
pig: piggy-2
trigger: location=volleyball_courts; present=piggy-1; seen=p2_h2; chapter>=2
priority: 20
summary: Piggy 1 drags Piggy 2 to the sand for cardio. Piggy 2 brings a penlight.
---
[bg volleyball_courts fade]
[bgm piggy1_theme]
narrator: The sand courts. Piggy 1 is mid-drill, diving after every ball like it owes him money.
narrator: On the sideline, in the only patch of shade, stands Piggy 2, holding a water bottle like a clipboard.
[if flag(outfit_volleyball)]
  [show piggy-1@volleyball happy left]
[else]
  [show piggy-1 happy left]
[endif]
[show piggy-2 neutral right]
piggy-1 happy: Teammate! You're just in time— I finally got him out here!
piggy-2 neutral: I was told this was cardio. I was not told about the sand.
piggy-1 laughing: Your perfusion needs reps, Doc! You said so yourself!
piggy-2 confused: I said perfusion. I never said reps.
narrator: A ball sails long. Piggy 1 launches after it with a battle cry.
piggy-1 surprised: Mine! MINE!
[sfx ball_hit]
[shake 0.5 300]
narrator: He gets the dig. He also gets a faceful of sand and rolls twice in a little cloud of it.
[sfx step]
piggy-2 neutral: Don't move. Follow my hoof.
piggy-1 confused: I'm fine, I'm fi— okay. Following.
piggy-2 thinking: Pupils equal, neck fine, ankles fine.
piggy-2 neutral: Textbook lumbar extension. Zero ankle discipline.
piggy-1 laughing: That's the nicest thing anyone's ever said about my dig!
piggy-1 happy: Okay, Doc— say "Let's go" just once!
piggy-2 neutral: Based.
piggy-1 laughing: I'll take it!
piggy-1 happy: New chant! I yell "Patriot," you yell back!
piggy-1 happy: PATRIOT!
piggy-2 neutral: Based.
narrator: It is barely above a whisper. Piggy 1 pumps his fist like they just won nationals.
? (Join the drill.)
  [bond piggy-1 +15]
  narrator: You kick off your shoes and take the other side. Piggy 1 tosses you an easy one, and you bump it straight up.
  [sfx ball_hit]
  narrator: It comes down directly on Piggy 2's head.
  [sfx surprise] [shake 0.3 200]
  piggy-2 neutral: ...Concussion protocol. On myself.
  piggy-1 laughing: Free ball!
? (Assist the medic.)
  [bond piggy-2 +15]
  narrator: You hold the water bottles while Piggy 2 runs a full sideline check, naming every instrument as you hand it over.
  piggy-2 happy: Based assistant. You're hired.
? (Keep the stats.)
  [bond piggy-1 +10]
  [bond piggy-2 +5]
  narrator: You borrow Piggy 1's clipboard and track everything.
  narrator: Digs: 14 — tumbles: 9 — times Piggy 2 said "based": 6
  piggy-1 surprised: Six?! That's a personal record for him!
  piggy-2 neutral: Seven. Based.
piggy-2 neutral: Your recovery protocol is based, by the way.
piggy-2 neutral: Stretching, fluids, sleep. You actually do it.
piggy-1 shy_blush: Wait, you noticed? That's— that's really cool.
piggy-1 happy: Same time Wednesday? Your perfusion needs reps!
piggy-2 neutral: ...Patriot.
[give oranges 1]
narrator: Piggy 1 tosses you an orange for the road. "Team snack!"
[bond piggy-2 +10]
[bond piggy-1 +10]
narrator: Somewhere in the Pig Pen chat, a new nickname is born: Coach & Medic.

# Companion piece to piggy3.ks p3_brains_builders (they design the viewer there); here it meets real data.
=== p2_brains_builders
title: Brains & Builders: Signal and Noise
pig: piggy-2
trigger: location=physics; present=piggy-3; seen=p2_h4
priority: 20
summary: Piggy 3's model mistakes an apple for a problem, then learns to page Piggy 2 only when it matters.
---
[bg physics_lab fade]
[bgm physics]
narrator: Piggy 3's lab: two monitors, a rack of 3D-printed cable clips, one very good chair. Piggy 2 has brought his own chair.
[if flag(outfit_hoodie)]
  [show piggy-3@hoodie happy left]
[else]
  [show piggy-3 happy left]
[endif]
[show piggy-2 neutral right]
piggy-3 happy: Oh, hey! Okay, perfect timing— we're testing the viewer on real recordings today.
piggy-2 neutral: Overnight EEG from the lab pigs, anonymized.
piggy-2 thinking: As anonymous as a pig named Sir Lancelot gets.
[if seen(p3_brains_builders)]
  piggy-3 bashful_smile: It still has exactly one red thing, like we agreed. Only when it matters.
[endif]
piggy-3 happy: And I trained a little model on top, like a small one.
piggy-3 happy: It marks the parts that look weird, so he doesn't have to scroll through eight hours of sleep.
[sfx typing]
narrator: Piggy 3 opens a recording. A forest of squiggly lines fills the screen, and half of it lights up lavender.
piggy-3 surprised: Wait. Why is it flagging all of these?
piggy-2 thinking: Those are artifacts. Muscle noise, not brain.
piggy-2 laughing: He was chewing. Lancelot ate an apple in the middle of the recording.
piggy-3 laughing: So my model's very first discovery is... an apple.
piggy-2 happy: Your model found the chewing artifact before I did. Based.
piggy-2 neutral: Slightly threatening. But based.
piggy-3 confused: Okay, so it can't tell apples from problems yet. I need to teach it what actually matters.
piggy-3 confused: Like— what would you want it to wake you up for? At four in the morning?
piggy-2 neutral: It doesn't need to wake me up. I'm already awake at four in the morning.
piggy-3 sad: ...Yeah. That's kind of the whole point of the feature.
narrator: Piggy 3 turns the laptop around. In the corner of the viewer sits a new button: PAGE PIGGY 2 — ONLY IF IT MATTERS.
piggy-3 bashful_smile: So basically it watches the overnight data. If something actually needs you, it pages you.
piggy-3 happy: The vet techs still check on them, obviously. But if it's just Lancelot eating, it lets you sleep.
[sfx surprise]
piggy-2 surprised: ...
piggy-2 neutral: You built this so I would sleep.
piggy-3 shy_blush: I mean— I built it so the pigs are safe. And so you'd sleep.
piggy-3 bashful_smile: Both. Mostly the second one.
? Have it page me too.
  [set p2_pager = backup]
  [bond piggy-2 +10]
  piggy-2 surprised: Two pagers. Redundancy.
  piggy-2 bashful_smile: That's how hospitals do it. ...Based.
? Give it a tiny oink alert.
  [set p2_pager = oink]
  [bond piggy-3 +10]
  piggy-3 laughing: Okay, that's actually— yes, a tiny oink. I'm doing it right now.
  [sfx oink]
  piggy-2 neutral: ...I'll allow the oink.
? Teach it apples first.
  [set p2_pager = apples]
  [bond piggy-2 +5]
  [bond piggy-3 +5]
  piggy-3 happy: Apple detection, phase one. Test it before we trust it.
  piggy-2 happy: Validate, then deploy. Based.
piggy-2 neutral: Okay. I'll trust the pager, some nights.
piggy-2 bashful_smile: Your model makes my signals make sense. That's a big deal.
piggy-3 shy_blush: ...Okay, yeah. Thanks.
narrator: For the next hour they argue happily about filter settings. You understand maybe a third of it, and all of the important part: they're having fun.
[set p2_night_pager]
[bond piggy-2 +10]
[bond piggy-3 +10]
narrator: That night, the pager stays quiet. Piggy 2 sleeps seven hours and reports it to the group chat like a personal best.
