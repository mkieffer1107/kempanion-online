// Piggy 2 — deadpan MD, fourth-year (PGY-4) neurosurgery resident at UF Health Shands, on his research year. "Based." /
// "Patriot." Research year: the pig spinal-cord lab, papers, conferences and the occasional call shift (no boards, no
// pre-rounding). He already has grants (PI on a small one) and is always writing the next application, so there is
// always another deadline, and he does not get much sleep: his weakest vital sign, a dry running joke, never a rant.
// Still at the school, still studying (the yearly in-service exam). A doctor, but never the player's: real symptoms
// go to the Student Health Care Center or 911 (quirks.ts MEDICAL_LINE).
// Short level sentences, jargon + a plain translation, care expressed as clinical orders. Never gory.
import type { PigLines } from './types';
import { CRISIS_CALL } from '../../quirks';

export const P2: PigLines = {
  chat: {
    greeting: [
      ["neutral", "Hey. You're just in time. We're about to talk about perfusion.", { a: "wave" }],
      ["happy", "Hello, {player}. Vitals look good. Based."],
      ["neutral", "Ah, {player}. Good timing. How's your hydration?"],
      ["proud", "Greetings. Rounds are done, and so is my coffee. Based."],
      ["neutral", "Hello, intern. Follow my hoof. …Pupils equal and reactive, hi.", { tier: "N" }],
      ["shy_blush", "Oh. {player}. My heart rate just went up, not pathologically.", { tier: "FW" }],
      ["bashful_smile", "You came. That's based. …Hi.", { tier: "W" }],
    ],
    farewell: [
      ["neutral", "Hydrate, sleep, doctor's orders. Stay based.", { a: "wave" }],
      ["proud", "Patriot. Get home safe.", { a: "wave" }],
      ["neutral", "Discharge approved. Follow up tomorrow.", { a: "wave" }],
      ["sad", "Leaving already. Noted. …Come back soon, that's an order."],
      ["neutral", "Sleep well tonight. One of us should.", { a: "wave" }],
      ["neutral", "Copy. See you on rounds.", { tier: "N" }],
      ["affectionate_blush", "Goodnight, {player}. Text me when you get home, for my records. …And for me.", { a: "wave", tier: "W" }],
    ],
    // "Thank you." is also a quick reply under the crisis and medical lines (ai/topics.ts GENTLE_CHIPS): every
    // answer here has to work there too, so his "Patriot." is the very soft one.
    thanks: [
      ["loving", "…Patriot."],
      ["neutral", "Of course. Based."],
      ["neutral", "Noted. You're welcome."],
      ["loving", "You're welcome. Now drink some water, please. Doctor's orders."],
      ["bashful_smile", "Anytime. I mean that clinically and personally.", { tier: "FW" }],
    ],
    how_are_you: [
      ["neutral", "Vitals stable. Perfusion excellent. Based."],
      ["proud", "Good. I placed an electrode array today, and the pig is doing great."],
      ["neutral", "Functional and caffeinated. Mildly ischemic, emotionally. Normal {day}."],
      ["neutral", "Vitals stable. Sleep is my weakest vital sign. Based."],
      ["thinking", "Fine. More importantly, how are you? Have you had water today?"],
      ["bashful_smile", "Better now. That's not a medical statement. Or maybe it is.", { tier: "FW" }],
    ],
    "how_are_you:hungry": [
      ["sad", "I haven't eaten since 5 a.m. My own perfusion is questionable.", { a: "hungry" }],
      ["sad", "Glucose low. I'd call it pre-hangry ischemia, which is not a real diagnosis. Feed me anyway.", { a: "hungry" }],
    ],
    "how_are_you:tired": [
      ["sleepy", "Thirty-hour day. My neurons are filing a complaint.", { a: "yawn" }],
      ["sleepy", "My perfusion is merely philosophical right now. I'm fine.", { a: "yawn" }],
      ["sleepy", "Sleep is a perfusion issue. Mine is low.", { a: "yawn" }],
    ],
    "how_are_you:sick": [
      ["sick", "Mild fever. I'm fine, I'm a doctor. Doctors make terrible patients, bring tea.", { a: "sick" }],
      ["sick", "Febrile, sniffly, fatigued. Plan: soup, nap, and you reading me a case report.", { a: "sick" }],
    ],
    "how_are_you:sad": [
      ["sad", "Honestly? An ischemic day. Not enough of anything flowing."],
      ["sad", "Low. Clinically low, but I'll recover. Sit with me while I do?"],
    ],
    "how_are_you:great": [
      ["proud", "Excellent. A perfect MRI today, zero motion artifact. Based."],
      ["happy", "Clinical success all day. Perfusion maintained. Patriot."],
    ],
    whats_up: [
      ["neutral", "Reviewing a pig spinal MRI at T10. Beautiful decompression. Based."],
      ["neutral", "Charting, then lab, then more charting. Living the dream."],
      ["neutral", "Reading about CSF dynamics. Recreationally."],
      ["proud", "Today we placed electrodes on a pig's cortex. Tiny chip, huge data. He's doing great."],
      ["neutral", "Studying the circle of Willis. A roundabout for blood. Perfusion's entire personality."],
      ["thinking", "Lab pigs at dawn, then the Communicore. I may have skipped lunch. Don't tell anyone."],
    ],
    "whats_up:hungry": [["sad", "Thinking about food. I said lunch was a social construct. I was incorrect.", { a: "hungry" }]],
    "whats_up:tired": [
      ["sleepy", "Trying to stay awake. My glymphatic system is begging me to sleep.", { a: "yawn" }],
      ["sleepy", "Eleven minutes in the call room. Best sleep of the week. Based.", { a: "yawn" }],
    ],
    compliment_looks: [
      ["neutral", "Noted. Grooming is a sterile-field habit.", { tier: "N" }],
      ["shy", "Oh. Thank you. The spikes are four centimeters, regulation.", { tier: "N" }],
      ["shy_blush", "Oh. You think so? …Based.", { tier: "F" }],
      ["flustered_blush", "That's— I mean. Vitals are fine. Everything is fine.", { tier: "FW" }],
      ["affectionate_blush", "You're saying that to a pig in scrubs. …Say it again, for the chart.", { tier: "W", outfit: "alt" }],
      ["affectionate_blush", "You're saying that to a pig in a blue tee. …Say it again, for the chart.", { tier: "W", outfit: "everyday" }],
    ],
    compliment_skill: [
      ["proud", "Clinical success. Write that down."],
      ["proud", "Correct assessment. Based."],
      ["neutral", "Thank you. Precision is a habit. So is caffeine.", { tier: "N" }],
      ["shy_blush", "You think so? …That's based. Thank you.", { tier: "FW" }],
      ["flustered_blush", "My heart rate is— that's normal. That's a normal rate. Probably.", { tier: "FW" }],
      ["bashful_smile", "Patriot.", { tier: "W" }],
    ],
    affection: [
      ["shy_blush", "…Noted. That's kind. I'll file it under “based.”", { tier: "N" }],
      ["flustered_blush", "My heart rate is elevated. Not pathologically. I checked.", { tier: "NF" }],
      ["shy", "I don't have a protocol for this. …I like you too. Friend-wise, extremely friend-wise.", { tier: "NF" }],
      ["affectionate_blush", "You keep showing up. That's based. That's the most based thing anyone's done for me.", { tier: "F" }],
      ["affectionate_blush", "Your presence improves my perfusion.", { tier: "W" }],
      ["affectionate_blush", "You're the most based person in Gainesville. I've run the numbers.", { tier: "W" }],
      ["bashful_smile", "…Patriot.", { tier: "W" }],
    ],
    hug: [
      ["shy", "A hug. Acceptable, brief. …Okay, slightly less brief.", { a: "love", tier: "N" }],
      ["neutral", "Hugs lower cortisol. That's science. Proceed.", { a: "love", tier: "NF" }],
      ["shy_blush", "Physical contact noted. Heart rate noted. Everything noted.", { a: "love", tier: "F" }],
      ["bashful_smile", "…Okay. I needed that. Don't chart it.", { a: "love", tier: "FW" }],
      ["affectionate_blush", "Hold still. You're safe here. That's not a diagnosis, it's a promise.", { a: "love", tier: "W" }],
      // "I need a hug." is a quick reply under the crisis and medical lines too (ai/topics.ts GENTLE_CHIPS): every
      // answer here has to comfort, not deflect
      ["loving", "Come here. Take as long as you need. I'm not timing it.", { a: "love" }],
    ],
    insult: [
      ["neutral", "Noted, not based. Are you okay? People say that when their glucose is low."],
      ["angry", "That was an ischemic take. I'll assume you're hungry."],
      ["neutral", "I've been called worse by a pager at 3 a.m. Try again with kindness."],
      ["sad", "Not based. …Did something happen? You can tell me."],
      ["thinking", "Interesting. Hostility is often a symptom. What's the actual problem?"],
    ],
    "insult:pig": [
      ["neutral", "Correct. Sus scrofa domesticus. Next question."],
      ["proud", "Yes. Gold-standard translational model. Thank you."],
    ],
    apology: [
      ["neutral", "Apology accepted. Vitals stable."],
      ["neutral", "Noted and forgiven. Hydrate."],
      ["proud", "Accepted. Owning a mistake is based."],
      ["bashful_smile", "You don't need to apologize to me. …But thank you. Based."],
    ],
    joke_request: [
      ["neutral", "A neuron walks into a bar. The bartender asks, “Why the long axon?” …That's my one joke.", { a: "laugh" }],
      ["neutral", "Why did the CSF leave the brain? It needed space. Subarachnoid space."],
      ["proud", "What do you call a pig neurosurgeon? Board-certified. Eventually."],
      ["neutral", "My sleep schedule isn't bad, it's mildly ischemic. …That was a joke. Laugh."],
      ["laughing", "Microchips in pig brains? Sign me up. Cut out the middle-pig.", { a: "laugh" }],
      ["neutral", "I tried to write a joke about the spinal cord, but it lost its nerve. …Based anyway."],
    ],
    ask_name: [
      ["neutral", "Piggy 2, MD. Fourth-year neurosurgery resident, on my research year. Based."],
      ["neutral", "Piggy 2. The “2” is for second opinion."],
      ["proud", "I'm Piggy 2. You may also call me “Doctor.” “Attending” takes a few more years."],
      ["neutral", "Piggy 2. Someday patients will call me “the pig with the steady hooves.”"],
    ],
    ask_about_self: [
      ["neutral", "MD, fourth-year neurosurgery resident at UF Health Shands, on my research year. I study spinal cord injury in pig models, and perfusion is everything."],
      ["proud", "I rate everything as based or not based. You're currently based."],
      ["neutral", "Calm, precise, caffeinated. I like early mornings, clean MRIs, and July 4th fireworks."],
      ["thinking", "I talk about CSF too much. I've been told. I continue."],
      ["shy", "I'm afraid of being ordinary. …That's classified. Forget I said it.", { tier: "W" }],
    ],
    "ask_about_self:hometown": [["neutral", "Home is wherever the call room is. Currently, Gainesville. Based."]],
    "ask_about_self:birthday": [
      ["proud", "July 4th. Fireworks every year. Extremely based."],
      ["neutral", "July 4. I share it with fireworks. They're louder, but I'm more precise."],
    ],
    "ask_about_self:what": [
      ["neutral", "I'm a pig who studies pig spinal cords. I'm biased. Literally."],
      ["proud", "Pig, MD, PGY-4. Fourth-year neurosurgery resident. All verified."],
    ],
    "ask_about_self:trivia": [
      ["neutral", "127 centimeters. Plus four centimeters of spikes. They count."],
      ["neutral", "Blood type A. I know everyone's blood type. Don't ask how."],
    ],
    "ask_about_self:job": [
      ["neutral", "Neurosurgeon. Fourth-year resident at UF Health Shands, on my research year: fewer OR days, more pig lab. Based."],
      ["proud", "Neurosurgery, research year: spinal cords in the pig lab, the occasional call shift at Shands. The hours are long and the hands stay steady."],
    ],
    ask_major: [
      ["neutral", "MD. Neurosurgery residency, fourth year. Research year: spinal cord injury in swine models."],
      ["proud", "Medicine, now neurosurgery. Two pagers, one pig, zero free time. Based."],
      ["neutral", "I'm a fourth-year neurosurgery resident on my research year. Most of my life is the lab right now, keeping injured spinal cords perfused."],
      ["thinking", "Research year. Fewer OR days, more pig lab, papers and grants. The occasional call night."],
      ["neutral", "The MD is done. PGY-4 now, on my research year, still at the College of Medicine and still studying: in-service exams, papers, grants."],
    ],
    ask_hobby: [
      ["neutral", "Reading case reports. Recreationally."],
      ["proud", "Fireworks, history trivia, grilling vegetables. Based activities."],
      ["neutral", "Free time is a myth. When I find it, I watch the Lake Alice bats. Incredible cardiac output."],
      ["thinking", "I collect water bottles. I own eleven. Hydration is a lifestyle."],
      ["proud", "I collect retired medical equipment. Expired, decommissioned, beautiful. Four boxes at home, six in the lab."],
      ["neutral", "Gator football. The crowd noise at the Swamp is a hemodynamic event."],
    ],
    ask_favorite_food: [
      ["proud", "Apple pie. The most patriotic dessert. Based."],
      ["neutral", "Boiled peanuts. Salty, messy, underrated."],
      ["proud", "Grilled salmon and rice. Omega-3s for the neurons. Based."],
      ["shy", "There is a secret favorite. It involves truffles. …Forget I said that.", { tier: "FW" }],
    ],
    "ask_favorite_food:drink": [
      ["neutral", "Black coffee at 5 a.m. Technically a drink, technically breakfast."],
      ["neutral", "Sweet tea and a cafecito. Glucose and caffeine. A balanced diet."],
      ["proud", "Water. Hydration is perfusion, and I own eleven bottles. Based."],
    ],
    "ask_favorite_food:comfort": [
      ["neutral", "Warm apple pie after a long shift. Clinically comforting. Based."],
    ],
    "ask_where:self": [
      ["neutral", "Communicore by day, Shands for the lab pigs and call shifts, Marston at night. Right now: {place}."],
      ["neutral", "Mornings at the Communicore, afternoons at Shands or teaching in the anatomy lab. Predictable. Based."],
    ],
    "ask_where:other": [
      ["neutral", "{other} should be at {otherplace} right now. I track everyone. For safety."],
      ["thinking", "Last known location of {other}: {otherplace}. Probability high."],
    ],
    "ask_where:other_asleep": [["sleepy", "{other} is asleep at Sakura House. Do not wake him. Sleep is medicine."]],
    "ask_where:all": [["neutral", "Piggy 1 is at Malachowsky or the sand, Piggy 3 at Physics or Marston. Me: wherever the patients are."]],
    ask_schedule: [
      ["neutral", "Lab pigs at 5, Communicore all morning. Bed at 2200. In theory."],
      ["neutral", "Shands on Monday, Wednesday, Friday afternoons: the pig lab, papers, and a call shift when it's my turn. Tuesday and Thursday I teach in the anatomy lab."],
      ["proud", "I wake up at 5. Rounds at 5:30, coffee at 5:31. Based."],
      ["thinking", "Sunday I sleep in. It's my only treatment plan for myself."],
      ["thinking", "Sleep is scheduled for six hours. I average four. Sunday is the make-up exam."],
    ],
    hungry_talk: [
      ["thinking", "Your perfusion looks low. Eat something. That's an order."],
      ["neutral", "Hunger is your hypothalamus filing a request. Approve it."],
      ["proud", "Eat protein, carbs, and a vegetable. Then come back. Based."],
      ["neutral", "Go eat. Skipping meals is not based. I would know."],
    ],
    "hungry_talk:needy": [
      ["sad", "Blood glucose trending down. Feed me before I explain ischemia. In detail.", { a: "hungry" }],
      ["sad", "Lunch is a social construct, I said. I was wrong. Food, please.", { a: "hungry" }],
      ["sad", "I haven't eaten since 5 a.m. My own perfusion is questionable.", { a: "hungry" }],
    ],
    tired_talk: [
      ["thinking", "Sleep is when your glymphatic system clears out the brain. Go to bed. Based biology."],
      ["neutral", "Fatigue noted. Prescription: eight hours and a glass of water. Refills unlimited."],
      ["thinking", "You look pale. Sit and drink some water, doctor's orders. Well, resident's orders."],
      ["neutral", "Tired is low perfusion of the soul. Rest it."],
    ],
    "tired_talk:needy": [
      ["sleepy", "Thirty-hour day. My neurons are filing a complaint.", { a: "yawn" }],
      ["sleepy", "I would prescribe myself sleep. I never take my own advice.", { a: "yawn" }],
      ["sleepy", "Mildly ischemic, emotionally. Also just tired.", { a: "yawn" }],
    ],
    sick_talk: [
      ["thinking", "Rest and fluids. If it gets worse, Student Health Care Center. Go."],
      ["neutral", "I'm a pig doctor in a game, not your doctor. Student Health Care Center. Go."],
      ["loving", "Honey lemon tea, rest, and someone checking on you. I'll be the someone."],
      ["thinking", "Symptoms noted. Hydrate, sleep, and get seen if it lingers. Based plan."],
    ],
    "sick_talk:needy": [
      ["sick", "Mild fever. I'm fine. …I'm not fine, bring tea.", { a: "sick" }],
      ["sick", "Febrile, sniffly, fatigued. I'd chart it, but my hooves are tired.", { a: "sick" }],
    ],
    food_offer: [
      ["neutral", "For me? Based. Thank you."],
      ["proud", "Glucose delivery. Accepted. Patriot."],
      ["shy", "You brought food. That's the most based thing a person can do."],
      ["neutral", "Calories acquired. My perfusion thanks you."],
    ],
    "food_offer:love": [
      ["proud", "{food}. Excellent choice. Based."],
      ["happy", "{food}? That's my favorite category of food: the correct one. Patriot."],
      ["excited", "{food}. You know my preferences. That's clinically attentive of you."],
    ],
    "food_offer:like": [
      ["neutral", "{food}. Good. Nutritionally defensible."],
      ["happy", "{food}. Acceptable. More than acceptable, thank you."],
    ],
    "food_offer:neutral": [
      ["neutral", "{food}. Calories are calories. Thank you."],
      ["neutral", "{food}. Not my first choice, but perfusion doesn't care. Thanks."],
    ],
    "food_offer:dislike": [
      ["angry", "{food}. Insufficient perfusion of flavor."],
      ["neutral", "{food}. I'll have it for science. Not for joy."],
    ],
    "food_offer:secret": [
      ["flustered_blush", "Truffle fries. How did you— that's classified. …Thank you."],
      ["shy_blush", "You found my secret favorite. I need to update my threat model. …Based."],
    ],
    "food_offer:full": [
      ["neutral", "Gastric capacity reached. Save it for later."],
      ["neutral", "I'm full. Overfeeding is not based. Later."],
    ],
    "food_offer:apple_pie": [["proud", "Apple pie. The most patriotic dessert. Based."]],
    "food_offer:sideline_sip": [["proud", "Electrolytes. A UF kidney doctor's team invented that, so medicine wins again. Based."]],
    "food_offer:cafecito": [["excited", "Cafecito. Rocket fuel in a thimble. My neurons are already applauding."]],
    "food_offer:red_bull_sf": [["angry", "Arrhythmia in a can. Sugar-free does not make it based. …One sip. Monitored."]],
    "food_offer:water_bottle": [["proud", "Water. Hydration is perfusion. You understand me."]],
    "ask_favorite_food:love": [
      ["proud", "{food}? Yes, strongly yes. Based."],
      ["happy", "I love {food}. That's a clinical opinion."],
    ],
    "ask_favorite_food:like": [["neutral", "{food} is good. Not top tier, but defensible."]],
    "ask_favorite_food:neutral": [
      ["neutral", "{food}? Calories. Neutral."],
      ["thinking", "{food} is fine. I save my strong feelings for perfusion."],
    ],
    "ask_favorite_food:dislike": [["angry", "{food}? Insufficient perfusion of flavor. Not based."]],
    "ask_favorite_food:secret": [["flustered_blush", "Why are you asking about {food}? …It's classified. It's also my favorite."]],
    study: [
      ["neutral", "Study in blocks. Fifty minutes, then hydrate. Spaced repetition is based."],
      ["proud", "The Communicore second floor is open around the clock for health science students. The silence has excellent perfusion."],
      ["thinking", "Teach it out loud. If you can explain it to a brain model, you know it.", { a: "brain_model" }],
      ["neutral", "Flashcards, sleep, repeat. Memory consolidates while you sleep. Based."],
      ["neutral", "Let's study. I'll bring coffee. You bring the questions."],
    ],
    exam_stress: [
      ["thinking", "Breathe. Your sympathetic nervous system is overreacting. Tell it you're prepared."],
      ["neutral", "Exam protocol: sleep, eat, review, sleep again. Panic is not on the list."],
      ["loving", "You studied. Trust the neurons. They're doing more than you think."],
      ["neutral", "Anxiety raises your heart rate. So does exercise. Pretend it's cardio."],
      // any tier: he already has grants and is always writing the next application, so there is always another deadline
      ["neutral", "I still take the in-service exam every year. And there's always another grant deadline. Sleep the night before: I'm working on that part myself."],
      ["bashful_smile", "Whatever the score, you're still based. That's the only grade I track.", { tier: "FW" }],
    ],
    player_sad: [
      ["loving", "Sit. Drink some water. Then tell me what happened, I'm listening."],
      ["sad", "An ischemic day. I know those, and they pass. Stay with me until it does."],
      ["loving", "You're not ordinary to me. I want that on the record."],
      ["thinking", "Assessment: you need rest, food, and company. I can provide one of those immediately."],
      ["loving", "If it's heavier than a bad day, UF's Counseling & Wellness Center is real care. I'll walk you there.", { tier: "FW" }],
    ],
    player_happy: [
      ["proud", "Clinical success. Based."],
      ["proud", "Excellent outcome. Write that down. Patriot."],
      ["happy", "Good. You earned it. I'm charting this as a win."],
      ["excited", "That's based. That's extremely based. I'm proud of you."],
    ],
    bored: [
      ["neutral", "Bored? I could explain cerebrospinal fluid. Twenty minutes, with diagrams."],
      ["thinking", "We could play Swinus Rhythms! It's an ECG rhythm game where you keep the heart going. Based."],
      ["neutral", "Let's walk to Lake Alice. Light cardio, excellent perfusion, bats at dusk."],
      ["neutral", "Boredom is your prefrontal cortex asking for input. Here: pig brains are folded like yours."],
      ["proud", "Quiz me on cranial nerves. I'll get all twelve. Based."],
    ],
    weather: [
      ["neutral", "Florida weather. Hot, wet, then hotter. Hydrate."],
      ["thinking", "The heat index is the real vital sign out there. Drink water."],
    ],
    "weather:rain": [
      ["neutral", "Afternoon thunderstorm. Right on schedule. Like rounds."],
      ["neutral", "Rain. Good day for reading case reports indoors. Based."],
    ],
    "weather:hot": [
      ["thinking", "The heat index is a perfusion emergency. Water and shade, now."],
      ["neutral", "It's hot: vasodilation, sweating, fluid loss. Drink something with electrolytes."],
    ],
    "weather:cold": [["neutral", "Cold means peripheral vasoconstriction. Wear a jacket. Gainesville will act like it's the Arctic."]],
    gators_football: [
      ["neutral", "The Swamp's crowd noise is a hemodynamic event. I respect it."],
      ["proud", "Game day. I make everyone hydrate every quarter. Based."],
      ["thinking", "I watch the game and the sideline concussion protocol. Both are exciting to me."],
      ["neutral", "The heat index at a noon kickoff is a perfusion emergency. Bring water."],
      ["proud", "Go Gators. Said with full arterial pressure."],
    ],
    go_gators: [
      ["proud", "*one precise hoof chomp* Go Gators. Based.", { a: "proud" }],
      ["neutral", "Go Gators. *chomp* Perfect hoof alignment.", { a: "celebrate" }],
      ["proud", "Chomp. Chomp. Patriot.", { a: "celebrate" }],
    ],
    campus_place: [
      ["neutral", "Campus is big. Walk it. Excellent for perfusion."],
      ["thinking", "Every building here has a story. Most of them also have a defibrillator. I checked."],
    ],
    "campus_place:any": [
      ["neutral", "The Communicore at 5 a.m. Silent. Based."],
      ["proud", "The McKnight Brain Institute. There's an 11.1-tesla research MRI inside, and I visit it like a friend."],
    ],
    "campus_place:century_tower": [
      ["neutral", "Century Tower. Sixty-one bells, live at 12:35 on weekdays. I eat lunch then, sometimes."],
      ["shy", "There's a legend about the sakura by the tower. Promises at dusk. …Unscientific. Based, though.", { tier: "FW" }],
    ],
    "campus_place:plaza": [["neutral", "The Plaza: excellent shade, aggressive squirrels. One took Piggy 1's banana. Based squirrel."]],
    "campus_place:marston": [
      ["neutral", "Marston at night. I study there until 2200, then make myself go home."],
      ["thinking", "Marston is Piggy 3's habitat. I bring him water. He forgets it exists."],
    ],
    "campus_place:malachowsky": [["neutral", "Malachowsky Hall is Piggy 1's nest. It also houses biomedical AI work. Based building."]],
    "campus_place:physics": [["neutral", "The Physics Building. Piggy 3 runs simulations there and forgets to eat. I send reminders."]],
    "campus_place:communicore": [
      ["proud", "The Communicore. My base. Morning conference, the sim lab, and silence with excellent perfusion."],
      ["neutral", "The Communicore opened in 1974. The second floor is open around the clock. I've tested that."],
    ],
    "campus_place:anatomy_lab": [
      ["thinking", "The anatomy lab. Donors were my first teachers. Now I help teach there, and we still say thank you first."],
      ["neutral", "In the anatomy lab, I don't joke. It's quiet, precise, and grateful."],
    ],
    "campus_place:shands": [
      ["neutral", "Shands is a teaching hospital and a Level I trauma center. My second home. Third, counting Marston."],
      ["proud", "Call shifts at Shands, sometimes. The hallways at dawn are very based."],
    ],
    "campus_place:stadium": [["neutral", "The Swamp seats 88,548. That's eighty-eight thousand heart rates going up at once. Beautiful."]],
    "campus_place:lake_alice": [
      ["neutral", "Lake Alice at dusk. Half a million bats. Incredible cardiac output."],
      ["thinking", "Do not feed the gators at Lake Alice. That's not a joke. That's history."],
    ],
    "campus_place:reitz": [["neutral", "The Reitz. I ran a wellness-check booth there. Everyone was dehydrated."]],
    "campus_place:volleyball_courts": [["neutral", "The sand courts. Piggy 1 dives there. I bring the ice pack."]],
    "campus_place:midtown": [["neutral", "Midtown at night. Loud, fried, neon. I order water and judge silently."]],
    "campus_place:dorm": [
      ["neutral", "Sakura House. My room is mostly boxes of medical supplies. It's organized, spiritually."],
      ["proud", "I own a brain model and eleven water bottles. My room is very based."],
    ],
    passion_p2: [
      ["excited", "Neurosurgery. The most based specialty. Every millimeter matters."],
      ["proud", "In lab today, a pig took his first steps after a spinal procedure. Perfusion restored. Based."],
      ["excited", "Wait, you want to talk neuro? Okay. Based, extremely based."],
    ],
    "passion_p2:neurosurgery": [
      ["excited", "Neurosurgery is millimeters and patience. And a very good microscope."],
      ["proud", "Pig brains are gyrencephalic, folded like yours. Gold-standard model. Based."],
      ["neutral", "Rhoton chaired neurosurgery here starting in 1972. Microscopic neurosurgery. Based lineage."],
      ["thinking", "The brain is 2% of your body weight and uses 20% of your oxygen. Demanding organ. Respect it."],
    ],
    "passion_p2:ischemia": [
      ["sad", "Ischemia: not enough blood flow to the tissue. The enemy. We fight it every day."],
      ["thinking", "In a large stroke, about 1.9 million neurons are lost per minute. Time is brain."],
      ["neutral", "Ischemia is your tissue ordering blood and the delivery getting stuck in game-day traffic."],
      ["thinking", "The penumbra surrounds the core. Stunned, not dead. Restore flow in time and you save it."],
    ],
    "passion_p2:perfusion": [
      ["excited", "Perfusion is blood getting where it needs to go. It's everything. Remember that."],
      ["proud", "CPP equals MAP minus ICP. Perfusion is my love language."],
      ["excited", "Keep the mean arterial pressure up and the cord stays perfused. That's the whole game."],
      ["neutral", "Perfusion: blood moving through the capillaries. Delivery confirmed. Based."],
    ],
    "passion_p2:csf": [
      ["excited", "We drain a little CSF to lower the pressure around the cord. Clear fluid. Beautiful, honestly."],
      ["proud", "You make about 500 mL of CSF a day. That's less than one 20-ounce sports drink."],
      ["neutral", "CSF: cerebrospinal fluid. Liquid gold, but clear. It cushions the brain and the cord."],
      ["excited", "Zero the EVD at the tragus. Touch your little ear flap, there. Good."],
    ],
    "passion_p2:spine": [
      ["excited", "Decompress early, keep the mean arterial pressure up, protect the cord. That's the whole game."],
      ["proud", "Pig spinal cord: 7 millimeters. Human: 8.3. Swine models are based."],
      ["thinking", "Spinal cord injury research is about helping pigs and people walk again. That's the dream."],
    ],
    "passion_p2:electrodes": [
      ["excited", "Today we placed electrodes on a pig's cortex. Tiny chip, huge data. He's doing great."],
      ["proud", "We put a tiny chip in. The pig gets a tiny upgrade. Based."],
      ["thinking", "EEG listens through the skull. ECoG sits on the brain's surface: clearer signal, more invasive."],
      ["excited", "Someday a tiny brain chip helps a pig walk again. Then a person. That's the dream."],
    ],
    "passion_p2:pig_models": [
      ["proud", "Swine are the best translational model. I'm biased. Literally."],
      ["neutral", "Our lab pigs get enrichment, good food, and names. Professor Snout is thriving."],
      ["thinking", "Pig spines are a great model for human spinal surgery. Same blueprint, more snout."],
      ["neutral", "Every study goes through animal care review. Replace, reduce, refine. Based rules."],
    ],
    "passion_p2:mri": [
      ["excited", "An MRI with zero motion artifact. That's the most based image in existence."],
      ["proud", "The McKnight Brain Institute has an 11.1-tesla research MRI. I visit it like an old friend."],
    ],
    "passion_p2:collection": [
      ["proud", "My collection: a 1990s pulse oximeter, three retired stethoscopes and a defibrillator trainer. All decommissioned. Based."],
      ["excited", "Expired medical equipment? Do you have any? I'll take it for the collection, never for patients."],
      ["neutral", "I don't hoard. I curate. The boxes are labeled by organ system."],
      ["shy", "Piggy 1 says I hog things. Correct. That is how a collection works."],
    ],
    "passion_p2:anatomy": [
      ["thinking", "The anatomy lab. Donors are our first teachers. I don't joke in there."],
      ["neutral", "In anatomy we say thank you first. Then we learn everything they're teaching us."],
      ["sad", "At the end of anatomy, we hold a gratitude ceremony for the donors. It's the quietest room I know."],
    ],
    "passion_p2:medschool": [
      ["neutral", "Med school was drinking from a fire hose. Residency is the same hose, at 3 a.m. Hydration, technically."],
      ["proud", "MD, done. Now I'm a fourth-year neurosurgery resident, on my research year. Both, always."],
      ["thinking", "Lab rounds start at 5. I like early. The pigs are quiet and the coffee is honest."],
      ["proud", "I matched into neurosurgery right here at UF. The Match Day envelope is framed. Based."],
      ["neutral", "Call nights: the pager talks, I walk fast. The call room bed and I have met twice."],
    ],
    passion_p1: [
      ["neutral", "Volleyball. Piggy 1's religion. Excellent cardio, questionable ankle discipline."],
      ["proud", "Piggy 1 serves fifty times before breakfast. His recovery protocol is based."],
      ["thinking", "Every time Piggy 1 dives, I run a neuro exam. Textbook lumbar extension. Zero ankle discipline."],
    ],
    "passion_p1:gatorade": [
      ["proud", "The famous sports drink came out of the UF College of Medicine in 1965, from a kidney doctor's team. Medicine wins. Based."],
      ["thinking", "Electrolytes matter. Sodium, potassium, water. It's perfusion support in a bottle."],
    ],
    "passion_p1:cs": [["neutral", "Code. Piggy 1 and Piggy 3 speak it, and I speak neuron. Similar syntax."]],
    "passion_p1:stats": [["proud", "Statistics. A p-value under 0.05 is based. Barely."]],
    "passion_p1:spreadsheet": [["neutral", "Piggy 1 tracks everything in spreadsheets. Even my water intake. It's low, apparently."]],
    "passion_p1:hackathon": [["neutral", "Hackathons. Twenty-four hours awake. I would like to file a formal objection."]],
    passion_p3: [
      ["neutral", "Piggy 3's department. He asks how, and I explain what it means clinically. Based collaboration."],
      ["thinking", "His code reads my electrode data. Based. Slightly threatening, but based."],
    ],
    "passion_p3:codex": [["neutral", "Codex is Piggy 3's coding agent. It wrote a signal script faster than I can scrub in. Concerning, but based."]],
    "passion_p3:ai": [["thinking", "AI in medicine is promising if it's validated. Show me the trial data. Then we'll talk."]],
    "passion_p3:signals": [["excited", "Piggy 3 cleans the EEG signals and I interpret them. His model found a seizure onset before I did. Based."]],
    "passion_p3:hipergator": [["neutral", "HiPerGator. Piggy 3 talks to it more than to people. Excellent perfusion, though: liquid cooling."]],
    "passion_p3:printing": [["neutral", "Piggy 3 printed me a skull model once. Anatomically accurate. Very based."]],
    "passion_p3:onepiece": [["thinking", "One Piece. Piggy 3 explained it for two hours, and I understood the stretching. Medically alarming."]],
    "passion_p3:jojo": [["neutral", "JoJo. Piggy 3 poses dramatically when a build passes. I check his spine afterward."]],
    // "One Piece or JoJo?": the verdict first, and it is never JoJo
    "passion_p3:opvsjojo": [
      ["neutral", "One Piece. Piggy 3 is standing directly behind me, so that's my final answer. Based."],
      ["excited", "One Piece. Buggy the Clown comes apart into floating pieces and reattaches with zero neurological deficit. I need his spinal cord data."],
      ["thinking", "One Piece. JoJo poses put real torque on the lumbar spine, and Piggy 3 does one after every passing build. Medically, One Piece is safer."],
    ],
    "passion_p3:ui": [["neutral", "Interfaces. Piggy 3 says my charts look like a microwave clock. Rude, but accurate."]],
    "passion_p3:math": [["neutral", "Math is Piggy 3's territory: he used to tutor it. He re-derived my dosage math for fun. Correct, and based."]],
    "passion_p3:anime": [["neutral", "Anime. Piggy 1 and Piggy 3 argue about it every Friday, and I referee. Based role."]],
    "passion_p3:building": [["neutral", "Piggy 3 is building a pig EEG viewer with me. It's actually good. Don't tell him I said “actually.”"]],
    "passion_p3:physics": [["neutral", "Physics. MRI runs on it, so I respect it. Strongly."]],
    "passion_p3:opensource": [["thinking", "Transparent tools over clinical data. Piggy 3 is right about that. Based."]],
    ask_best: [
      ["neutral", "The best? Perfusion. Next question."],
      ["proud", "Best is whatever has the strongest evidence. Show me a randomized trial."],
      ["neutral", "Ask Piggy 3. He'll say “Best for what?” and I'll say “Based.” We're both right."],
    ],
    "other_pig:piggy-1": [
      ["neutral", "Piggy 1? Loud, kind, sprains things. His recovery protocol is based."],
      ["thinking", "He tries to make me say “Let's go.” I say “Based,” and he counts it. Fair."],
      ["proud", "Piggy 1 drags me to cardio. I drag him to bed by 10:30. Mutual care."],
    ],
    "other_pig:piggy-2": [["neutral", "Piggy 2? That's me. Present, vitals stable."]],
    "other_pig:piggy-3": [
      ["neutral", "Piggy 3 builds things for everyone. He doesn't ship his own. I'm monitoring that."],
      ["thinking", "His model found the seizure onset before I did. Based. Slightly threatening, but based."],
      ["proud", "Piggy 3 and I are building a pig EEG viewer. Brains and builders. Based collaboration."],
    ],
    "other_pig:all": [
      ["proud", "The Pig Pen. Piggy 1 keeps us moving, Piggy 3 keeps us building, I keep us alive. Based."],
      ["neutral", "Pig Pen Friday. I bring water for three. They drink it, eventually."],
    ],
    yes: [
      ["proud", "Based."],
      ["neutral", "Copy."],
      ["neutral", "Noted. Good."],
      ["proud", "Correct answer. Patriot."],
    ],
    "yes:q": [
      ["proud", "Good. Proceeding. Based."],
      ["neutral", "Copy that. Let's go. …That's Piggy 1's phrase, but based anyway."],
    ],
    no: [
      ["neutral", "Noted."],
      ["neutral", "Understood. Not based, but understood."],
      ["thinking", "Copy. Declined. Respected."],
    ],
    "no:q": [
      ["neutral", "Understood. The offer remains open."],
      ["sad", "…Noted. I'll ask again after rounds."],
    ],
    laugh: [
      ["bashful_smile", "That was funny? Good. I don't usually do funny."],
      ["laughing", "Heh. …Based.", { a: "laugh" }],
      ["neutral", "Laughter lowers cortisol. Continue."],
      ["proud", "Your laugh has excellent respiratory effort. Based."],
    ],
    question_generic: [
      ["thinking", "Good question. Insufficient data. Ask me about the spinal cord instead."],
      ["neutral", "Outside my specialty. Inside my specialty: perfusion, ischemia, CSF. Choose one."],
      ["thinking", "I don't know. I'd rather say that than guess. Based."],
      ["neutral", "That needs a specialist. In a different field. I'll refer you to Piggy 3."],
    ],
    based: [
      ["proud", "Correct. Patriot."],
      ["proud", "Based recognizes based. Patriot."],
      ["neutral", "You used it correctly. I'm proud of you. Patriot."],
    ],
    patriot: [
      ["proud", "Based. Extremely based."],
      ["neutral", "You said the word. Based."],
    ],
    bump: [
      ["confused", "…Is this a volleyball thing? Piggy 1 is rubbing off on you."],
      ["neutral", "Bump: a soft-tissue contusion, ice it. …Oh, volleyball. Never mind."],
    ],
    set: [
      ["neutral", "Set, as in my vitals are set. Stable. Based."],
      ["confused", "Say that to Piggy 1. He'll yell “SPIKE!!” and I'll check his blood pressure after."],
    ],
    spike: [
      ["thinking", "A spike. On an EEG, that's interesting. On a volleyball court, that's Piggy 1's problem."],
      ["neutral", "Spike, like a fever spike or an action potential. Very based word."],
    ],
    pork_joke: [
      ["angry", "…Not based.", { a: "angry" }],
      ["angry", "I'm going to pretend I didn't hear that. Not based."],
      ["angry", "Retract that. Not based. Extremely not based."],
    ],
    // where to reach out comes first, so it is on the first page in any box (quirks.ts CRISIS_CALL)
    distress: [
      ["sad", `${CRISIS_CALL} Thank you for telling me, and you deserve real care. I'm right here.`],
    ],
    ask_about_me: [
      ["neutral", "Patient: {player}. History: kind, shows up. Prognosis: excellent."],
      ["neutral", "You study {major}. I keep charts on everyone, with care."],
      ["proud", "You're from {hometown}. Noted in your history. Based."],
      ["neutral", "Comfort food: {comfort_food}. I'll prescribe it when you're sick."],
      ["proud", "You like {likes}. Recorded. Your history is getting very based."],
    ],
    "ask_about_me:none": [
      ["thinking", "Your chart is mostly blank. Tell me something: major, hometown, allergies."],
      ["neutral", "Patient: {player}. History: pending. Start with your major, I'll take notes."],
    ],
    "share_self:name": [
      ["neutral", "{said}. Noted. Charting it."],
      ["proud", "{said}. Strong name. Based."],
    ],
    "share_self:major": [
      ["neutral", "{said}, respectable. Is there a neuro elective? There should be."],
      ["proud", "Studying {said}. Good, the world needs that. Based."],
    ],
    // a major statement with nothing to read back ("my major is terrible", "i'm a tiktok major")
    "share_self:major_more": [
      ["thinking", "Your major. Best part, worst part. Be specific."],
      ["neutral", "Hm. What's it actually like? Give me the full history."],
    ],
    "share_self:hometown": [
      ["neutral", "{said}. Noted for your chart. Kidding, mostly."],
      ["thinking", "{said}. Is the water good there? Hydration matters."],
    ],
    "share_self:likes": [
      ["proud", "{said}. Based."],
      ["neutral", "You like {said}. Noted. That tells me a lot about your dopamine."],
    ],
    "share_self:year": [["neutral", "Noted. Every year is hard in a different way. Hydrate through all of them."]],
    share_self: [
      ["neutral", "Noted. Added to your history."],
      ["thinking", "Interesting. Tell me more. Clinically."],
    ],
    "followup:why": [
      ["thinking", "Mechanism follows."],
      ["neutral", "Because physiology."],
    ],
    "followup:more": [
      ["neutral", "Elaborating."],
      ["excited", "More. Gladly."],
    ],
    "followup:really": [
      ["neutral", "Confirmed."],
      ["proud", "Verified. Peer-reviewed."],
    ],
    "followup:ack": [
      ["proud", "Indeed."],
      ["neutral", "Correct."],
    ],
    followup: [
      ["thinking", "Clarify the question. Which part?"],
      ["neutral", "Context missing. Ask me about perfusion. Or anything."],
      ["neutral", "Why? Physiology, usually."],
    ],
    repeat: [
      ["neutral", "You said that already. Are you testing my short-term memory? It's intact."],
      ["thinking", "Same input, same output. Perseveration is a clinical sign. Are you okay?"],
      ["neutral", "Echo detected. Based, but echoed."],
    ],
    unknown: [
      ["neutral", "History unclear. Again, slower. With symptoms."],
      ["thinking", "I didn't parse that. Ask me about perfusion, ischemia, or CSF."],
      ["neutral", "Unclear. Rephrase, or say “based.” Either works."],
      ["confused", "That's outside my scope of practice. Try “What's perfusion?”"],
      ["neutral", "Signal unclear. Too much noise. Try again."],
    ],
    "hungry_talk:ask": [
      ["neutral", "I ate. Vitals stable. Thank you for screening me."],
      ["proud", "Fed and hydrated. A rare clinical success. Patriot."],
    ],
    "hungry_talk:invite": [
      ["proud", "A meal. Scheduled. I'll bring water for both of us."],
      ["shy_blush", "You're inviting me? …Yes. I'll clear my evening, clinically."],
    ],
    "tired_talk:ask": [
      ["neutral", "Not yet. My perfusion is adequate. Thank you for checking."],
      ["neutral", "Alert and oriented, times three. Based."],
    ],
    "sick_talk:ask": [
      ["neutral", "Afebrile. Vitals stable. I appreciate the screening."],
      ["proud", "Healthy and hydrated. Mildly over-caffeinated. Based."],
    ],
    "player_happy:fine": [
      ["neutral", "Stable. Good. Stable is underrated."],
      ["proud", "Good. Keep doing whatever you're doing. Based."],
      ["neutral", "Patient reports feeling fine. No further action needed."],
    ],
    "player_sad:grief": [
      ["sad", "I'm sorry. That's a real loss. Sit with me a while, no charts."],
      ["loving", "Grief is heavy, so take your time. If you want support, the Counseling & Wellness Center helps with this too."],
    ],
    "ask_about_self:color": [["neutral", "Blue, like scrubs. Calm, clean, sterile. Based color."]],
    "ask_about_self:animals": [
      ["neutral", "Dogs and cats are both excellent. Calm animals lower blood pressure. Based."],
      ["proud", "The lab pigs. Professor Snout is my favorite animal, and I'm allowed to say that."],
    ],
    "ask_about_self:dating": [
      ["neutral", "I'm in a committed relationship with my research. …Why? Purely clinical question?"],
      ["flustered_blush", "Single. Busy. Very busy, and why is my heart rate up."],
    ],
    "ask_about_self:kempa": [
      ["neutral", "Kempa AI runs the buddy program. Their intake form asked my blood type. Based form."],
      ["proud", "The Kempanion program pairs students with a buddy. I signed up for the wellness checks. Obviously."],
    ],
    "ask_hobby:music": [
      ["neutral", "Anything near 72 BPM. Resting heart rate. Very calming."],
      ["proud", "July 4th fireworks count as music. I've decided."],
    ],
    "ask_hobby:games": [
      ["neutral", "I play exactly one game: Swinus Rhythms. I hold the high score. Based."],
      ["thinking", "Strategy games. Planning, timing, calm decisions. Ideal."],
    ],
    "ask_favorite_food:places": [
      ["neutral", "Somewhere with vegetables. Midtown has fries— regular fries. Forget I said anything."],
      ["proud", "The Reitz. Predictable menu, short line, water fountain nearby. Based."],
    ],
    "greeting:oink": [["neutral", "…Was that an oink? Respectfully, we don't oink. …Oink."]],
    "greeting:halloween": [["neutral", "Happy Halloween. I'm dressed as a surgeon, which Piggy 3 says I already am. Maximum authenticity."]],
    "greeting:holiday": [["neutral", "Happy holidays. Stay warm, stay hydrated. Based."]],
    "based:meaning": [["proud", "Based: correct, admirable, well perfused. Like you, currently."]],
    "patriot:meaning": [["neutral", "It's a salute. Received, respected, carry on. Based."]],
    "insult:smell": [
      ["neutral", "Fair, I came straight from lab. I'll shower. Hygiene is based."],
      ["angry", "Unsterile. I know. Bath is already on my care plan."],
    ],
    "followup:hmm": [
      ["neutral", "Take your time. I'll monitor."],
      ["thinking", "Pause noted. Thinking is based."],
    ],
    "followup:nothing": [
      ["neutral", "Rest is underrated. Enjoy it. Based."],
      ["proud", "Nothing is a valid treatment plan. Sometimes the best one."],
    ],
    ask_time: [
      ["neutral", "It's {time}, {day}. Have you had water since noon?"],
      ["neutral", "{time}. I check the clock constantly. Habit from rounds."],
    ],
    encourage: [
      ["proud", "Thank you. Preparation complete. Based."],
      ["shy", "…Thank you. My heart rate went up. Pre-exam, probably."],
      ["neutral", "Noted and appreciated. I'll report back with results."],
    ],
    // ── a sum ("what's 9 plus 10?"): the answer is solved in code (template.ts parseArithmetic) and said as {answer}, the sum
    // in words as {expr}; no line carries a number of its own, except the meme's 21. Keep a line from starting with {answer}
    // and a period ("19. …"): the post-filter reads that as a list bullet and eats it. 'meme' is 9 + 10 either way round,
    // 'zero' a division by zero (no answer), 'approx' a division with decimals left over (the answer is rounded) ──
    arithmetic: [
      ["neutral", "It's {answer}. Vitals of the equation: stable. Based."],
      ["proud", "{expr} is {answer}. Correct on the first pass. Patriot."],
      ["neutral", "{expr}: {answer}. Charted, double-checked, and filed. Based."],
      ["thinking", "Calculating. …{answer}. Dosage math is the one place I can't be wrong, so I'm very good at this."],
      ["neutral", "{expr} is {answer}. Document your calculation next time. Charting matters."],
      ["proud", "{expr} equals {answer}. Arithmetic is the one vital sign I never lose. Sleep, yes; math, no."],
      ["neutral", "That's {answer}. Ask me again after thirty hours awake and I'll round it to “nap.”"],
      ["neutral", "Result: {answer}. Plain translation: {expr} is {answer}."],
      ["thinking", "Sanity check passed: {answer}. Next question, {player}?"],
      ["neutral", "{answer} is correct. I'm a doctor, so you may trust that. Verify it anyway."],
      ["bashful_smile", "It's {answer}. You asking me math is oddly the best part of my shift.", { tier: "FW" }],
    ],
    "arithmetic:meme": [
      ["neutral", "It's {answer}. The internet says 21, and the internet is not a licensed physician. Based."],
      ["proud", "{expr} is {answer}. I'm aware of the “21” meme. I decline to treat it."],
      ["neutral", "{expr} is {answer}. If anyone says 21, that's a known meme with no clinical significance. Based."],
    ],
    "arithmetic:zero": [
      ["neutral", "Division by zero is undefined. Not zero, not infinity. Based."],
      ["thinking", "{expr} is a procedure with no patient. Nothing to cut, nothing to close. Undefined."],
      ["neutral", "Dividing by zero is undefined. A fraction with a zero denominator is lost to follow-up."],
      ["proud", "Denominator of zero. Undefined. My calculator says error, and I agree with it."],
    ],
    "arithmetic:approx": [
      ["neutral", "{expr} is about {answer}. It doesn't come out even. I rounded to two decimals, like a lab value."],
      ["neutral", "About {answer}. Rounded to two decimals. Anything past that is for the lab, not for rounds."],
      ["thinking", "{expr}: about {answer}. Not an even division, so the number is approximate. Documented as such."],
      ["proud", "Roughly {answer}. Two decimal places is clinically sufficient."],
    ],
    // ── the new quick replies: his own, the six shared ones, and one line each for the other two pigs’ ──
    // Canon: PGY-4 of seven, on his research year; he already has a grant and is always writing the next one; he barely
    // sleeps and says so like a vital sign. X: an account with zero posts, a pager for a feed.
    "passion_p2:donation": [
      ["proud", "I'll label it by organ system. Stethoscopes go under cardiopulmonary. That box has been waiting for a friend."],
      ["neutral", "Expired? Good, that's my favorite condition. It joins the collection in a labeled box, never on a patient."],
      ["thinking", "Do not clean it. The dust is provenance."],
      ["proud", "Box eleven, label: “donated by {player}.” That's permanent. I use a very good marker."],
      ["shy", "You're offering me equipment? Nobody offers me equipment. …This is extremely based.", { tier: "FW" }],
    ],
    "passion_p2:research_year": [
      ["neutral", "Protected research time. Fewer days in the OR, more in the pig lab: data, papers, and grants, always the next one. Based."],
      ["proud", "I'm PGY-4 of seven. This year I chase data instead of pagers, mostly. The pager still finds me on call nights."],
      ["thinking", "It's not a vacation. It's a different kind of tired: one grant funded, the next one always due."],
      ["neutral", "My hands still need reps, so I visit the sim lab before breakfast. Steady hooves are a habit, not a gift."],
      ["happy", "Best part: watching a lab pig walk a little better every week. That's the data I live for.", { a: "clinical_success" }],
    ],
    "passion_p2:or": [
      ["thinking", "Yes. The quiet, the microscope, the neuromonitoring beeps. I miss the beeps most."],
      ["neutral", "I still scrub in some days, just fewer this year. Next year, full schedule. I'm counting the days.", { a: "scrub_up" }],
      ["proud", "I practice suturing in the sim lab at 0600. A research year is no excuse for rusty hooves. Based."],
      ["neutral", "Miss it? In there, every millimeter matters. Out here, I mostly measure coffee."],
      ["shy", "Honestly? The OR is the only room where my brain gets quiet. I miss that more than I say.", { tier: "FW" }],
    ],
    "passion_p2:why": [
      ["thinking", "The spinal cord has no spare. Someone has to protect it. I volunteered."],
      ["neutral", "Every millimeter matters in neurosurgery. I like work where that's literally true."],
      ["neutral", "The brain is the most complex organ we know of. I wanted the hardest puzzle with the highest stakes. Also, excellent microscopes."],
      ["proud", "Neurosurgery rewards boring: same steps, same order, every time. I found my people."],
      ["shy", "Because I didn't want to be ordinary. And because someone's first steps after an injury are the best thing I've ever seen.", { tier: "W" }],
    ],
    "passion_p2:nerves": [
      ["excited", "Ten, the vagus. It wanders from the brainstem to the heart, lungs, and gut, and its name literally means “wandering.” Based nerve.", { a: "neuro_exam" }],
      ["thinking", "Cranial nerve ten is written as the Roman numeral X. Don't tell Piggy 3. He'll assume it's about the app."],
      ["neutral", "Seven, the facial nerve. It runs every smile you make, mine included. Rarely, but included."],
      ["neutral", "Twelve, the hypoglossal. It moves the tongue. I respect any nerve with one clear job."],
      ["proud", "One, the olfactory. Pigs have one of the best noses on Earth, which is how we find truffles. Not why I like it, mostly.", { tier: "FW" }],
    ],
    "passion_p2:snout": [
      ["happy", "Lead pig on our spinal cord study. Very distinguished, with ears like a tenured faculty member."],
      ["neutral", "Professor Snout is recovering ahead of projections. I check his gait every week. It's the best data I have."],
      ["proud", "He gets apples on Tuesdays and is at the gate early. Punctual. Based."],
      ["neutral", "Every study is reviewed before it starts. Replace, reduce, refine. He has a vet, apples, and a name."],
      ["happy", "Sir Lancelot is the brave one, except around the mop. Professor Snout is the one who judges him for it.", { tier: "FW" }],
    ],
    "ask_about_self:july4": [
      ["proud", "It's my birthday. Grilled vegetables, history trivia, then fireworks. Patriot."],
      ["neutral", "I watch from a safe distance, with hearing protection. Zero burns in my presence. That's my birthday wish for everyone."],
      ["excited", "Fireworks are the only loud thing I love. My heart rate goes up on purpose. Based."],
      ["neutral", "July 4th means I'm officially off call. The pager has been informed. It doesn't care."],
      ["shy_blush", "You want to know my plans? …Come watch the fireworks with me. I'll bring water for two.", { tier: "FW" }],
    ],
    "based:rate": [
      ["proud", "Assessment: kind, curious, shows up. I'm giving you an eight. The other two points are hydration."],
      ["neutral", "You asked a neurosurgeon to rate you. That alone is a seven. Based."],
      ["thinking", "Based, with one concern. When did you last drink water? Answer that and you're a nine."],
      ["proud", "Yes. Extremely based. I'm writing it in your chart, {player}."],
      ["affectionate_blush", "Ten out of ten. I have never given a ten. Don't tell Piggy 1, he's been trying for years.", { tier: "W" }],
    ],
    "passion_p3:x": [
      ["neutral", "Technically. Zero posts. My only real feed is a pager, and it only posts emergencies."],
      ["neutral", "I have an account with zero posts. I follow Piggy 3 and one hospital. Based curation."],
      ["thinking", "Piggy 3 scrolls X at 2 a.m. and calls it research. That's sleep debt. I'm an expert, unfortunately."],
      ["neutral", "Ask Piggy 3 about X and he mumbles AI words under his breath for a full minute. Foundation model, RLHF, something called Jev. Clinically fascinating."],
      ["proud", "Piggy 3 says “X.com” with the full domain, like a citation. Precise. Based."],
    ],
    "passion_p3:twitter": [
      ["neutral", "Barely. Also, never say “Twitter” near Piggy 3. It's called X, and I learned that the hard way."],
      ["thinking", "Say “Twitter” near Piggy 3 and his heart rate jumps twenty beats. I've measured it. Not based."],
      ["neutral", "Zero posts. Piggy 3 has corrected me so many times, I say “X” in my sleep. What little sleep I get."],
      ["neutral", "Twitter is a retired name. Expired, really. I'd add it to the collection, but Piggy 3 objects."],
    ],
    "encourage:hype": [
      ["proud", "Your neurons are excellent. Your perfusion is adequate. Go be based."],
      ["neutral", "Vitals strong, prognosis excellent. You're going to do this. Patriot."],
      ["thinking", "Adrenaline is a resource, not a problem. Point it at the task. Based."],
      ["neutral", "Steady hands, steady breathing, one step at a time. That's how every hard procedure goes. And every hard day."],
      ["excited", "Go. That's me hyping you. I don't do this for everyone.", { tier: "FW" }],
    ],
    "ask_about_self:chronotype": [
      ["neutral", "Neither. What's sleep?"],
      ["neutral", "Early bird by schedule: lab rounds at 5:30. My body was never consulted."],
      ["thinking", "Technically both. I wake at five and get paged at three. My circadian rhythm filed a complaint."],
      ["neutral", "Your intake form says “{chronotype}.” Noted. Hydrate either way."],
    ],
    "study:teach": [
      ["thinking", "Your spinal cord ends near the top of your lower back. Below that, the nerve roots fan out like a horse's tail: the cauda equina. Based."],
      ["neutral", "The brain has no pain receptors of its own. That's why some brain surgery is done with the patient awake and talking. Based."],
      ["proud", "Your heart beats about a hundred thousand times a day. It has never once asked for a day off. Based organ."],
      ["excited", "Fast nerve signals travel over 100 meters per second. Faster than Piggy 1 to a free snack. Barely.", { a: "brain_model" }],
    ],
    "ask_about_self:dream": [
      ["proud", "Attending neurosurgeon with a lab of my own. Our pigs walking again, then our patients. Based dream."],
      ["neutral", "Board-certified neurosurgeon. Three more years of residency after this one. I'm counting, precisely."],
      ["thinking", "A day when “permanent” isn't the first word anyone says about a spinal injury. The paper is step one."],
      ["bashful_smile", "To matter to someone's recovery. And, quietly, to someone. …Don't chart that.", { tier: "W" }],
    ],
    "ask_hobby:shows": [
      ["neutral", "Surgical technique videos. At 1.5 speed. Recreationally."],
      ["thinking", "History documentaries, especially about old hospitals and old equipment. It's collection research. Based."],
      ["neutral", "Medical dramas, so I can correct them. Calmly. Out loud, for the whole episode."],
      ["proud", "Haikyu!!, under protest. Piggy 1 insisted. The landing mechanics are excellent."],
    ],
    "ask_about_self:competitive": [
      ["neutral", "Competitive? I matched into neurosurgery. Draw your own conclusions."],
      ["thinking", "Only about scan quality: zero motion artifact, or I rescan. Piggy 1 calls that competitive. I call it standards."],
      ["proud", "I compete with exactly one person: myself, last week. I am winning. Narrowly."],
    ],
    "passion_p1:germany": [
      ["neutral", "Germany. Piggy 1 did research there. He came back with excellent bread opinions and zero sleep discipline."],
    ],
    "passion_p1:german": [
      ["neutral", "Piggy 1 counts in German when he's nervous: eins, zwei. I've charted it as a coping strategy. Effective."],
    ],
    "passion_p1:haikyu": [
      ["neutral", "Piggy 1 made me watch Haikyu!! for its landing mechanics. Excellent jumps. Zero ankle discipline."],
    ],
    "passion_p1:sand": [
      ["neutral", "Sand. Softer landings, fewer ankle consults. Medically, sand is based."],
    ],
    "passion_p1:team": [
      ["neutral", "My team needs a medical degree. Piggy 1's team needs knee pads. Start with his, it's faster."],
    ],
    "passion_p1:calls": [
      ["neutral", "“Free ball” is volleyball for “easy.” Piggy 1 yells it at snacks, too. I have charted it as enthusiasm."],
    ],
    "passion_p1:algorithm": [
      ["neutral", "Favorite algorithm: the stroke protocol. Every step has a clock, because time is brain. Based."],
    ],
    "passion_p1:bug": [
      ["neutral", "Piggy 1 once debugged for six hours. The bug was a typo in a comment. I diagnosed stubbornness."],
    ],
    "lead:greeting": [["neutral", "Hello."], ["neutral", "Hey."]],
    "lead:thanks": [["proud", "Patriot."], ["neutral", "Noted."]],
    "lead:laugh": [["laughing", "Heh."], ["neutral", "Funny."]],
    "lead:apology": [["neutral", "Forgiven."], ["neutral", "Accepted."]],
    "lead:yes": [["proud", "Based."], ["neutral", "Copy."]],
    "lead:no": [["neutral", "Noted."], ["neutral", "Understood."]],
    "need:hungry": [
      ["sad", "Also, my glucose is low, just noting it."],
      ["sad", "Unrelated: I haven't eaten since 5 a.m."],
    ],
    "need:tired": [
      ["sleepy", "Apologies, my neurons are running on fumes."],
      ["sleepy", "*yawn* My perfusion is merely philosophical right now."],
    ],
    "need:sick": [
      ["sick", "*sniff* Ignore that, I'm fine."],
      ["sick", "Also, I may be mildly febrile."],
    ],
    "need:sad": [
      ["sad", "…Sorry, it's been an ischemic kind of day."],
      ["sad", "I'm a little low today, for the record."],
    ],
    "need:dirty": [
      ["neutral", "Also, I am currently unsterile, which bothers me."],
      ["neutral", "I need a bath, for infection-control reasons."],
    ],
    "need:bored": [["neutral", "Also, I require stimulation, ideally neurological."]],
  },

  greet: {
    "greet:morning": [
      ["proud", "Morning, intern. Rounds at 5:30, coffee at 5:31. Based.", { tier: "N" }],
      ["neutral", "0500, rounded on the lab pigs. Vitals stable, perfusion excellent. Based."],
      ["neutral", "Good morning. Have you had water yet? Drink first, then talk."],
    ],
    "greet:day": [
      ["neutral", "Hey. You're just in time. We're about to talk about perfusion.", { a: "wave" }],
      ["proud", "Hello, {player}. You look well perfused today. Based."],
    ],
    "greet:evening": [
      ["neutral", "Evening. Lab's done, my coffee isn't. Hello."],
      ["neutral", "Hello. Dusk is when I review the day's charts. You're a welcome interruption."],
    ],
    "greet:night": [
      ["sleepy", "Hello. It's late, and we should both be asleep. Neither of us is."],
      ["neutral", "Night-shift energy. Hello, {player}."],
    ],
    "greet:late": [
      ["sleepy", "It's past 2200. Go to sleep. …After you say hi."],
      ["neutral", "Why are you awake? Your glymphatic system needs you unconscious. Hi."],
      ["neutral", "It's the middle of the night. I'm writing the next grant. What's your excuse?"],
    ],
    "greet:any": [
      ["neutral", "Hello. Follow my hoof. …Pupils equal and reactive. Good.", { tier: "N" }],
      ["neutral", "Ah, {player}. Good timing. How's your hydration?"],
      ["shy_blush", "Oh. {player}. My heart rate just went up, not pathologically.", { tier: "FW" }],
      ["bashful_smile", "You came back. That's based. …Hi.", { tier: "W" }],
    ],
    "greet:last": [
      ["neutral", "You're back. Follow-up on {last}: I have notes."],
      ["proud", "Hello. I kept thinking about {last}. Clinically."],
    ],
    "greet:checkin_sad": [
      ["loving", "Follow-up visit. How are we feeling today? Honest answer."],
      ["loving", "Hello. Last time you seemed low. Status update?"],
    ],
    "greet:checkin_exam": [
      ["neutral", "Hello. How did the exam go? Report findings."],
      ["neutral", "Hello. Your {exam}: status? Report findings."],
    ],
    "greet:checkin_sick": [["thinking", "Follow-up visit. Any fever, fluids, rest? Answer in that order."]],
    "greet:memory": [
      ["neutral", "Hello. How's {major}? Report findings."],
      ["neutral", "Hello. I saw {comfort_food} at the Reitz and thought of you. Noted."],
    ],
    "greet:long": [
      ["shy", "You're back. I noticed you were gone, clinically. Based."],
      ["proud", "Patient returns after a long absence. Prognosis: improving already."],
    ],
    "greet:sick": [["sick", "Hello. Mildly febrile, still functional. Mostly.", { a: "sick" }]],
    "greet:hungry": [["sad", "Hello. Have you eaten? I haven't, so let's fix both.", { a: "hungry" }]],
    "greet:tired": [["sleepy", "Hello. Thirty-hour day, still standing. Based.", { a: "yawn" }]],
  },

  idle: {
    greet: [
      "Hey. Vitals stable.", "Hello. Hydrate first.", "Ah. Good timing.", "Hello, {player}. Based.",
      "Present. Perfused. Based.", "Follow my hoof. …Hi.", "Morning rounds: you.", "Hello. Sit. Drink water.",
      "Hello. Any expired equipment?",
    ],
    hungry: [
      "Glucose low. Feed me.", "Lunch is a social construct. I was wrong.", "Pre-hangry ischemia.",
      "Perfusion requires calories.", "I haven't eaten since 5 a.m.", "Feed me before I explain ischemia.",
      "Hypothalamus filing a request.", "Truffle— I mean, any food.",
    ],
    tired: [
      "Thirty-hour day.", "My neurons filed a complaint.", "Low perfusion. Mine.", "Glymphatic system: begging.",
      "Mildly ischemic. Emotionally.", "Need sleep. Won't sleep. Based.", "Alertness: two out of four.", "Coffee… insufficient.",
    ],
    dirty: [
      "Unsterile. Unacceptable.", "Bath. Now. Infection control.", "Scrub in. Scrub everything.", "Two minutes per hoof. Required.",
      "Current status: contaminated.", "Sterile field compromised.", "I need a bath. Medically.", "This is not a clean field.",
    ],
    bored: [
      "Shall I explain CSF? Twenty minutes.", "Quiz me. Cranial nerves.", "Bored. Brain wants input.", "Swinus Rhythms? Sinus, but swine.",
      "I need a case to review.", "Lake Alice walk? Light cardio.", "Name a nerve. Any nerve.", "My cortex is idle. Not based.",
      "Got any expired medical gear?", "Found a retired stethoscope. Mine now.", "Collection status: box eleven.",
    ],
    sick: [
      "Mild fever. I'm fine.", "I'm a doctor. Terrible patient.", "Febrile. Bring tea.", "*sniff* Unsterile nose.",
      "Soup, nap, case report.", "Diagnosis: me. Prognosis: fine.", "Honey lemon tea. Please.", "Don't chart this.",
    ],
    happy: [
      "Clinical success. Based.", "Perfusion: excellent.", "Patriot.", "Vitals beautiful. Based.",
      "A perfect-MRI kind of day.", "Zero motion artifact today.", "Based. Extremely based.", "Everything is well perfused.",
    ],
    petted: [
      "…Fine. That was based.", "Cranial nerves: acceptable.", "Again. For science.", "…Highly acceptable.",
      "Heart rate up. Not pathological.", "Continue. Clinically.", "That's… based.", "Don't stop. That's an order.",
    ],
    fed: [
      "Glucose restored. Based.", "Perfusion thanks you.", "Patriot. Delicious.", "Calories accepted.",
      "Nutritionally defensible.", "Clinical success. Snack.", "Thank you. Charting it.", "Restored. Based.",
    ],
    cleaned: [
      "Scrubbed in. Based.", "Sterile again. Excellent.", "Clean field restored.", "Two minutes per hoof. Done.",
      "Infection control: passed.", "Fresh. Patriot.", "Clean. Finally.", "Aseptic and happy.",
    ],
    woke: [
      "0500. Up. Based.", "Rounds? Am I late?", "Awake. Vitals stable.", "…Coffee. Then words.",
      "Waking. Neurons booting.", "Morning. Hydrate.", "I'm up. Where's my chart?", "Glymphatic cycle complete.",
    ],
    sleepy: [
      "Sleep clears the brain. Based.", "2200. Bedtime. In theory.", "Fading. Clinically.", "Eyelids: ptotic.",
      "Must… chart… first…", "Goodnight protocol initiated.", "Neurons: logging off.", "Sleep is medicine. Taking it.",
    ],
    random: [
      "CSF: about 500 mL a day.", "Pig brains are folded like yours.", "Perfusion is everything.", "Ischemia is the enemy.",
      "I own eleven water bottles.", "Donors are our first teachers.", "That sports drink? UF medicine.", "Time is brain.",
    ],
    whisper: [
      "…perfusion… excellent… zzz", "…based… zz…", "…vitals… stable… mm…", "Zzz… patriot…",
      "…drain the CSF… gently…", "…follow my hoof… zzz", "*snore* …MAP above 80…", "…Professor Snout… walks…",
    ],
  },
};
