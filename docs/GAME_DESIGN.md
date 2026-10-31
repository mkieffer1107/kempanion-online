# Kempanion Online — Game Design v1

*A Kempa AI production.* A PC-98-style visual novel (ADV text box, name plate, waist-up busts, choices,
backlog) built on top of a Tamagotchi-style virtual pet, set at the University of Florida with year-round
sakura. Fully playable offline with a deterministic chat brain; an optional local LLM (WebGPU) adds free chat.

## 1. Pitch

One semester, three pig boys, and a campus full of sakura trees nobody can explain. You're a new UF student.
Kempa AI's **Kempanion** buddy program pairs you with one of three campus piggies. Your Kempanion lives
across the hall at **Sakura House** (a creaky co-op a block off University Ave whose yard sakura blooms all year).
All three pigs live at Sakura House, each in his own very distinct room (Piggy 1: volleyballs and dual monitors; Piggy 2: a
chaotic neuro lab-office with boxes of medical supplies everywhere; Piggy 3: a lavender maker's den with three 3D printers).
Keep them fed, rested, clean and happy; hang out with all three around campus; grow each bond through
scripted heart events until the **Legend of the Century Sakura** at the end of the semester.

The clock is your real local clock: the pigs eat lunch when you do, watch the Lake Alice bats at dusk,
and fall asleep at their bedtimes.

## 2. Cast (names stay "Piggy 1/2/3")

| | Piggy 1 | Piggy 2 | Piggy 3 |
|---|---|---|---|
| Who | First-year master's student in AI in Biomedical and Health Sciences (AIBHS); Kempa AI program ambassador; club volleyball outside hitter | MD; fourth-year (PGY-4) neurosurgery resident at UF Health Shands on his research year (pig spinal-cord lab, papers, grants, the occasional call shift), still studying | Builder: AI, coding agents, signals, 3D printing; physics computational lab |
| Home spot | Malachowsky Hall; sand courts at dawn/dusk | Communicore (College of Medicine), anatomy lab, his pig lab, Shands (sim lab, call shifts) | Physics Building lab; Marston at night |
| Work outfit | volleyball uniform | scrubs | black hoodie |
| Voice | hype, stats, volleyball calls, calls you "teammate" | deadpan, "Based." / "Patriot.", ischemia & perfusion | "Okay, so I was thinking…", "Actually—", "basically", "Best for what?" |
| Hard quirks | bump→"Set!", set→"SPIKE!!", spike→"KILL! Point Gators!" | "based"→"Patriot." (only), "patriot"→"Based." | "codex" / "have you used codex?" → lights up about his little project |
| Secret | too nerdy for the team, too jocky for the lab; calls every ball himself | afraid of being ordinary; won't rest | builds for everyone, never ships his own ("it's not pretty yet") |
| Arc | learns to call "Yours!" (trust the team) | learns perfusion applies to him too (rest) | learns shipped & shared beats perfect |
| Theme | "Rally!" ~150 BPM, bright square leads | "Perfusion" 72 BPM over a heartbeat kick | "So I Was Thinking" 96 BPM, triangle/e-piano arpeggios |
| Blip | high pulse25, fast | low pulse50, clipped, steady | soft triangle, slows on "…" |

Personality files in `characters/` are the source of truth for voice. Sensitivity: "based/patriot" is only a
verbal tic (never political). Lab pigs are always well cared for; procedures are never shown. Piggy 2 never
jokes about anatomy-lab donors ("Donors are our first teachers."). All bond is warm friendship; blush = flustered.

## 3. Player & intro

- Unseen first-person protagonist; name on the name plate. **Intake form** (Kempa AI tablet): name;
  *What brings you to UF?* (Computing / Medicine & Life Sciences / Physics & Engineering / Arts & Humanities / Still deciding);
  *Early bird or night owl?* (or *"What's sleep?"*); *Comfort food?* (free text, default "muffin"). Name and comfort food each ask for confirmation, with an option to edit the answer.
  Each answer becomes a memory fact. Computing → Piggy 1 +30 bond, Medicine → Piggy 2 +30, Physics → Piggy 3 +30;
  early bird → P1 +20, night owl → P3 +20, "What's sleep?" → P2 +20 (+ a lecture).
- **Prologue** (~6–8 min, skippable on replay): Plaza of the Americas at midday, lost, carillon plays, a volleyball rolls to
  your feet (Piggy 1). Reitz Union Kempanion booth: a pig in scrubs giving "wellness checks" (Piggy 2). Piggy 3 arrives nine
  minutes late with your **KempaPager** (the in-world Tamagotchi device; he redid its UI because "the stock UI looked like a
  microwave clock"). Century Tower sakura at dusk: choose your Kempanion from three profile cards. Warm reactions from all.
- Re-pairing (switch Kempanion) is allowed once per day from Profiles; plays a 3-line moving gag.

## 4. Screens & loop

- **KempaPager (hub)**: your Kempanion, full-body and animated, at their *current* location (from the schedule; Sakura House at
  night/asleep). Need meters, hearts, acorns, clock, care bar (Feed · Clean · Play · Rest · Talk · Go · Bag · Menu). Tap the
  pig to pet. A solid paper bubble beside his head is a Want; a lilac thought cloud is just what's on his mind (§6, tap it
  for his line). Golden petals drift by (tap = +5 acorns, 10/day).
- **Campus map**: pins with face icons of whoever is there now; a ♥ on a pin when a heart event is ready there.
- **Location**: background + waist-up busts of pigs present → Talk / Gift / location action (mini-game, shop, omikuji, bats…).
- **Talk**: VN text box with typewriter + blips; quick-reply chips + free text; brain = heuristic or LLM.
- **Scenes**: scripted KScript events (heart, trio, location, prologue, endings) with CGs and choices.
- Session loop (3–10 min): roll call (daily stamp, omikuji, tasks) → top up needs → chat or a mini-game → a heart event if ready → bedtime routine.

## 5. Time & schedule

Visual periods: morning 05–10, day 10–17, evening 17–20, night 20–05 (day/night background variants, graded blends between).
Schedule slots (finer): dawn 05–08, morning 08–12, midday 12–14, afternoon 14–17, dusk 17–20, night 20–24, owl 00–05.
Bedtimes: Piggy 1 22:30–06:30 · Piggy 2 22:00–05:00 · Piggy 3 00:30–08:30 (asleep pigs are at Sakura House).

| Slot | Piggy 1 | Piggy 2 | Piggy 3 |
|---|---|---|---|
| dawn | volleyball courts (Tu/Th/Sa), else asleep→Sakura House | Shands (lab-pig rounds, sim lab, call shifts) | asleep |
| morning | Malachowsky | Communicore | physics (from 10:30) |
| midday | Plaza | Communicore | physics |
| afternoon | Malachowsky | Shands (M/W/F) / anatomy lab (Tu/Th) | physics |
| dusk | volleyball courts (M/W/F) / Lake Alice (Tu/Th) | Communicore | Lake Alice |
| night | Sakura House | Marston → home 22:00 | Marston |
| owl | asleep | asleep | Marston until 00:30 |

Overrides: Friday midday → all three at the Plaza ("Pig Pen Friday"). Weekends: P1 courts/Plaza, P2 Lake Alice (Sun dusk),
P3 Reitz (Sun). Saturday home-game days in fall → stadium afternoon. Sunday mornings everyone sleeps in.

## 6. Pet simulation (companion only; the other two take care of themselves)

Needs 0–100 (100 = satisfied): **hunger** (Tummy), **energy**, **hygiene** (Clean), **fun**. Hidden **health** 0–100.

Decay per hour while present (tab visible + input within 10 min): hunger 6, energy 4.5 (awake), hygiene 3, fun 5.
Per-pig multipliers — P1: hunger ×1.2, hygiene ×1.25 (sand), fun ×1.2 · P2: energy ×1.15, hygiene ×0.8, fun ×0.9 · P3: hunger ×0.9, fun ×0.8.
Offline/background ×0.7, asleep ×0.25 (energy instead +15/h). **Floors**: offline needs never drop below 20.
Away > 72 h → needs = max(current, 55), welcome-back party scene, +100 acorns. Catch-up simulated in 15-minute steps.

Thresholds: ≥60 fine · 30–59 mild (icon) · 15–29 needs you (status clip 30% of idles, bubble line) · <15 urgent.
Status clips: hungry, thirsty (hunger also covers drinks), dirty, yawn/sleep, bored, sad, sick.

Mood tier from the weighted needs average minus distress (each need under 25 subtracts up to 15) plus bond level:
great ≥85 · good 65–84 · okay 45–64 · low 25–44 · awful <25. Sick/asleep override the visuals.

Health: −4/h for each need under 15; +3/h when all needs ≥ 50. Health < 30 → **sick** (sick clip/portrait, energy decay ×1.5,
fun gains ×0.5). Cure: Cold Medicine or Honey Lemon Tea (+ rest), the Shands pharmacy (free check once per day),
or overnight sleep with hunger ≥ 40. **Doctor's Rounds**: with Piggy 2 at ♥4+, ask him (wherever he is) to check a sick Kempanion
(neuro_exam → write_chart) — instant cure once per illness. No illness lasts > 24 h. Never lowers bond. At most one illness at a time.

Care actions (free unless an item): Feed (item) · Clean/bath (hygiene →100, 3 h cooldown; brushing teeth +10, 2 h cooldown) ·
Play (play_ball: fun +20, energy −8, hygiene −6) · Pet/tap (fun +6 × 0.6^(n−1) within 15 min; spam = playful pout, no penalty) ·
Rest (tuck in near bedtime: +bond, sleeps; nap when energy < 60) · Wake · Medicine · Gift · Tidy (crumbs).
Feeding refused at hunger ≥ 90 (item kept), except one dessert ("betsubara") every 2 h.

**Tastes**: each food is love / like / neutral / dislike per pig, plus one **secret favorite** each (Piggy 1 Strawberry Milk,
Piggy 2 Truffle Fries, Piggy 3 Sakura Dango). Love: fill ×1.2, bond +10 · like +4 · neutral +1 · dislike: fill ×0.8, 0 bond, funny line.
Food bond is capped at 40/day/pig. First secret favorite discovery: +50 bond and a reveal line.

**Wants**: roughly every 3 h present, the Kempanion shows a want bubble, a solid paper box (a food, activity, place or chat topic).
Fulfil within 2 h → +8 bond, +5 fun. Unfilled wants just expire.

**Thoughts**: wants are actions, thoughts are flavor. Whenever his want isn't live, a pig daydreams in a lilac pixel cloud (an
icon and a label of up to 20 characters, 6–8 s; tap for his line and face). No bond, no acorns, never a timed choice. Picks are
seeded per pig and day from his personality bank (`pet/thought-bank/`): no repeats, at most 40 a day, weighted by place, time,
weather, needs, date, company and hearts; his own birthday comes first that day; a sick pig only has sick thoughts. Piggy 3
thinks about X about half the time. Hub: about 70% of the ambient beats (the rest are spoken lines), calmer later in a visit;
place screens: one cloud on phones, at most two on wide stages. Settings → Display → Thought bubbles: Lots / Some / Off.

## 7. Bond & progression (all three pigs)

Bond points 0–1000 per pig; **hearts = floor(bond/100)** (0–10). Titles: 0 Stranger · 1 Classmate · 2 Lab Partner · 3 Study Buddy ·
4 Friend · 5 Good Friend · 6 Close Friend · 7 Best Friend · 8 Partner-in-Crime · 9 Kindred Spirit · 10 Kempanion.
Routine gains (care, pets, talk, gifts, wants, mini-games) are capped at **120/day per pig** (companion's chat gains ×1.25).
Heart events give +40…+100, uncapped. **Heart gate**: bond can't exceed `(next unseen heart event's requirement + 1) × 100 − 1`
until that event is seen. Story chapter = distinct days played: Ch1 day 1, Ch2 day 2+, Ch3 day 4+, Ch4 day 6+.
Heart event *n* needs hearts ≥ n−1 and chapter: events 1–2 Ch1, 3–4 Ch2, 5–6 Ch3, 7 Ch4.

Unlocks: ♥1 uses your name, gifts · ♥2 lunch invites · ♥3 alt outfit (via an event) · ♥4 picks a nickname for you · ♥5 "Walk with me"
(companion follows you on the map) · ♥7 unique home idle · ♥8 + event 7 seen → ending eligible · ♥10 gold name plate.
Debug: `?debug` URL flag shows a panel (time warp, +bond, +money, unlock all, trigger scene).

## 8. Economy & dailies

Currency **acorns** (UF's live oaks drop plenty, and pigs love them; icon: a pixel acorn); start with 100. Earn: daily stamp (30–100), daily tasks (25 each), mini-games (5–45 per run;
first run of each game per day ×2), golden petals (5, max 10/day), selling nothing. No real money anywhere.
**Login stamps**: 7-stamp card (30, 40+item, 50, 60, 70+item, 80, 100+group scene); missed days pause, never reset.
**Omikuji** (Century Tower sakura, once per day, no bad luck): Great Blessing (+25% acorns today) 10% · Blessing (first-run bonus ×3) 30% ·
Small Blessing (one item half price) 40% · Future Blessing (tomorrow's stamp doubled) 20%.
**Daily tasks**: 3 per day from a pool (~25): "Feed Piggy 2 something he loves", "Say 'based' to Piggy 2", "Ask Piggy 3 what's best",
"Get a 20-touch rally", "Visit Lake Alice at dusk", "Tuck in your Kempanion"… each +25 acorns and +10 bond with that pig.
**Shop**: Reitz Union campus store (food, drinks, care, gifts) and Midtown at night (late-night food). Shands pharmacy: medicine.

Menu (no pork, ever; prices in acorns): Dining Hall Tray (free, hunger 25) · Water Bottle (free drink) · Chicken Tender Sub 18 (P1 love) ·
Reitz Pizza Slice 10 · Cup Ramen 5 · Onigiri 9 (P3 love) · Melonpan 12 (P3 love, dessert) · Apple Pie 15 (P2 love, dessert) ·
Key Lime Pie 15 (dessert) · Boiled Peanuts 6 (P1 dislike, P2 like) · Acai Bowl 14 · Banana Protein Shake 12 (P1 love) ·
Watermelon Slice 8 · Florida Oranges 6 (P1 "TEAM SNACK") · Sakura Dango 14 (P3 secret) · Truffle Fries 20 (P2 secret) ·
Sideline Sip sports drink 8 (P1 love) · Florida OJ 8 · Sweet Tea 6 (P2 love) · Cafecito 7 (P2 love, energy +20) ·
Cold Brew 9 (P3 like, energy +15) · Sugar-Free Red Bull 9 (P3 love, energy +15) · Boba Milk Tea 12 · Strawberry Milk 8 (P1 secret).
Care: Lavender Soap 40 · Mint Toothpaste 30 · Honey Lemon Tea 20 (cure) · Cold Medicine 35 (cure) · Ginger Ale 15.
Gifts: Knee Pad Tape 45 (P1 love) · Signed Volleyball 70 (P1 love) · Squishy Brain Model 60 (P2 love) · 1 L Water Bottle 30 (P2 love) ·
Sakura PLA Filament 40 (P3 love) · Pirate Manga 35 (P3 love) · Gator Pennant 50 (all like) · Sakura Charm 25 (all like) · Comic Sans Stickers 10 (P3 "…I'll keep it").

**Canonical item ids** (use exactly these in code and KScript `[give id n]`):
food/drink — `dining_tray` `water_bottle` `tender_sub` `pizza_slice` `cup_ramen` `onigiri` `melonpan` `apple_pie` `key_lime_pie`
`boiled_peanuts` `acai_bowl` `protein_shake` `watermelon` `oranges` `pastelito` `blueberries` `sakura_dango` `truffle_fries`
`sideline_sip` `florida_oj` `sweet_tea` `cafecito` `cold_brew` `red_bull_sf` `boba_tea` `strawberry_milk` `vegan_ice_cream` ·
care — `lavender_soap` `mint_toothpaste` `honey_lemon_tea` `cold_medicine` `ginger_ale` ·
gifts — `knee_pad_tape` `signed_volleyball` `brain_model` `big_water_bottle` `sakura_filament` `pirate_manga` `pennant`
`sakura_charm` `comic_sans_stickers` · key items (not sold) — `kempapager` `name_badge` `sakura_keychain`.
(`pastelito` = guava & cheese pastry, P2 like; `blueberries` = UF-bred 'Sharpblue', all like; `vegan_ice_cream` = Karma Cream-style scoop, P3 like.)

## 9. Mini-games (no fail state; always pay ≥ 5 acorns; Assist toggle pays full)

- **Sakura Spike** (Piggy 1, volleyball courts, 60 s): one-button timing — shrinking ring on the ball's shadow; tap for bump → set → spike
  (volleyball_bump/set/spike); Perfect ±60 ms = 100, Good ±130 ms = 50; combo ×(1 + 0.1 per 5 hits, max ×2); late tap within 250 ms
  plays volleyball_dig and saves once per point; 20% opponent spikes → tap to block (+150); speed +5% per 10 touches (max +60%).
- **Swinus Rhythms** (Piggy 2, Communicore sim lab, ~65 s; a play on "sinus rhythm"; id `perfusion`): rhythm on a scrolling ECG — Beat (tap on the spike), Drain (hold:
  "Draining CSF… pressure normalizing"), Skip (flat line, don't tap). The song is a steady 96 BPM lub-dub; the monitor's heart rate
  climbs 72 → 96 → 120 as the notes get denser (every other beat, every beat, every beat + off-beat doubles). Perfusion meter from 70:
  Perfect ±50 ms +3, Good ±110 ms +1, Miss −6; under 30 → blue tint, Piggy 2: "ISCHEMIA!" (delighted), "I mean, oh no. Fix it."
- **Bug Hunt** (Piggy 3, physics lab, 10 rounds): 4–7 lines of friendly "PigScript"; tap the one broken line within 12 s
  (typo, wrong constant, flipped comparison, `=` vs `==`, missing increment, off-by-one…). Hint at 6 s highlights 3 lines (−2).
  Score per round 10 + seconds left. Piggy 3 explains each bug in one line ("Actually, that's an off-by-one. The loop skips the last pig. Which is me. Rude.").
- **Petal Catch** (any pig, Plaza, 45 s): run left/right; pink petals +1, golden +10, snacks +2 (and +5 hunger, max +30);
  bold Plaza squirrels' acorns make the pig tumble for 0.8 s.
- **Steady Hoof** (Piggy 2, Shands sim suite after hours, ~80 s; id `surgery`): a skills night on training models only, with Gerald
  the mannequin supervising from a sticky note. One instrument tip, three 24 s stations: **Close the Seam** (trace a dotted seam on
  a silicone pad; each sakura blossom passed becomes a NEAT/GOOD/LOOSE stitch; the seam closes no faster than the 14 u/s pace
  limit, and a stitch thrown while the hand is over it is LOOSE, worth 2 and costs that seam its bonus; watertight +60, closed +30),
  **Under the Scope** (×4: hold the tip in a ring on a silicone vessel that pulses with piggy2_theme's beat until it fills),
  **Electrodes** (carry a contact on a soft, springy lead to numbered marks on a gel phantom; hold still to set it; 4 = a set).
  The tip sways a little and calms on the exhale of a shared 5 s breath (OUT/IN gauge, halo tightens). Input: drag anywhere
  (relative, 0.3 tray units per px), mouse/pen (absolute) or ←↑↓→/WASD (Shift = fine). Medals by score 900 / 1600 / 2300.
- **For You Pig** (Piggy 3, Marston Science Library button, 75 s; id `xfeed`): Piggy 3 holds out his phone and his X feed scrolls itself, faster each
  tab (Following → For You → Trending → 3 AM). Swipe right to LIKE posts that show their work, left to MUTE hype (and anyone who still says "Twitter"),
  LIKE friend posts (pig faces) for 150, SAVE the rare gold posts for 300, let filler pass; a wrong call costs 100. Other bookmarks score 0 and keep the combo. Six right calls in a row start Mumble Mode (points ×2; the same bit as Talk's
  "Are you on X?": he mutters buzzwords to himself, then snaps out, embarrassed). Hype that gets through drains his brain battery (80% to start);
  at 0% he puts the phone down and touches grass for 3 s. Medals by score 2000 / 3800 / 7500.
Rewards: bond +10 + 5 per medal tier (bronze/silver/gold), fun +20…25, energy −8…−12. Needs energy ≥ 20 to play.

## 10. Story

**Prologue** (§3) → **meet** scenes → choose Kempanion.
**Heart events** (7 per pig; every choice is positive, the arc-fitting answer scores highest; replayable from the Album with no bond change):

Piggy 1 — "Rally Route": 1 MINE! MINE! (Plaza; stray ball, tumble into a sakura; CG "Petal Dive") · 2 Circular Rotation (Malachowsky;
circular-queue homework as a volleyball rotation; "A rotation IS a circular buffer that sweats!") · 3 Dawn Patrol (volleyball courts, dawn;
first look at the uniform; serve-receive; unlocks outfit + Sakura Spike bonus; CG "Sunrise Serve") · 4 Too Nerdy for the Team
(Sakura House porch, night; "You're both. That's your whole superpower.") · 5 Watch Me Spike (courts, weekend; club match; pick chants on the beat)
· 6 Yours! (Plaza; hackathon demo + practice collide; he finally calls "Yours!") · 7 2:47 AM (Marston/Library, late; quizzes you with volleyball hand signals, falls asleep).

Piggy 2 — "Perfusion Route": 1 Pupils Equal, Round, Reactive (Reitz booth, scrubs; "Follow my hoof."; say "Based." → "Patriot.")
· 2 To Perfuse or Not to Perfuse (Communicore; brain_model as Yorick; circle of Willis; 3-question quiz) · 3 Scrub In: Sim Edition
(Shands sim lab; research year means fewer OR days, so he practices a lumbar drain on a mannequin; hand him sterile gloves; unlocks scrubs) · 4 The Porcine Advantage (Communicore dusk;
review_mri; why pigs are the model for spine surgery, CSF drainage and brain electrodes; the lab pigs' names — Professor Snout, Sir Lancelot)
· 5 Mildly Ischemic (Sakura House; he's sick and still heading to Shands: "My perfusion is merely philosophical.") · 6 Clinical Success
(video call: Professor Snout walks after his spinal procedure; "Perfusion. Restored."; tears; "Based." → "Patriot.") · 7 Discharge Summary
(Marston, finals week, his biggest grant application yet is due, with Professor Snout's walk as figure one; he is already PI on a small grant and always writing the next one, so there is always another deadline; three days of surgical_focus; a write_chart note: "Patient presents with chronic friendship. Prognosis: excellent.").

Piggy 3 — "Ship It Route": 1 Okay, So I Was Thinking… (Reitz booth; 3D-printed name badge; pick an accent color that themes the UI)
· 2 Best for What? (physics lab, hoodie; two EEG-artifact models; "Whichever people will actually use." unlocks hoodie) · 3 Print Queue
(Marston night; a sakura charm print turns to spaghetti; "The spaghetti one is perfect.") · 4 Brainwaves at the Bat Houses (Lake Alice, dusk;
DIY EEG headband; half a million bats; "If I'm not building something, what am I for?") · 5 Invite to Code (Sakura House, Sunday;
pair-program; pick a feature that ships into the game) · 6 It's Not Pretty Yet (Reitz demo day; Piggy 1 & 2 show up with a sign; "Ship it.")
· 7 Long Job on HiPerGator (Marston, late; a hidden KempaPager screen — a pixel sakura that grew a branch for every day you hung out).

**Trio events**: Pig Pen Friday (Plaza lunch, best-study-spot debate; a squirrel steals Piggy 1's banana) · Bats & Boo (Lake Alice, Halloween
or any Ch2 dusk; costumes are their work outfits: "I'm a surgeon." "You ARE a surgeon.") · Gameday at the Swamp (fall Saturday; Gator Chomp,
the sway, Piggy 2 makes everyone hydrate: "The heat index is a perfusion emergency.") · The 3 AM Study Pact (finals; all three asleep at dawn).

**Endings — the Legend of the Century Sakura**: "If two people make a promise under the sakura by Century Tower while the carillon plays at dusk,
the promise blooms forever." Eligible at ♥8 with event 7 seen; your pig texts "Century Tower. Dusk. Don't be late."
Piggy 1 "Last Rally" (spike into the petals; "Be my setter?") · Piggy 2 "Sakura Rounds" ("Diagnosis: best friend. Prognosis: chronic.";
"Based." → "Patriot." → "Perfusion: excellent.") · Piggy 3 "Commit Message" (you write the commit message; it becomes the last credits line).
True ending "Hanami for Four" (all three ♥7+ and all trio events): "To the team!" / "To perfusion!" / "To… best for what? Best for us."
Default "See You Next Semester". No bad endings. After credits the pet sim continues ("Spring Semester").

**Small events**: location vignettes (carillon at 12:35/16:55, bats ~15–20 min after sunset, afternoon thunderstorms May–Sep, squirrels,
gameday traffic…), pig-to-pig "Overheard" bubbles when two share a location, the Pig Pen group chat (2–3 pings/day on the KempaPager).

## 11. Chat

Pipeline per message: **intercepts** (hard quirks; medical questions → "I'm a pig doctor in a game, not your doctor. Student Health Care Center. Go, and call 911 if it's an emergency.";
distress keywords → a warm pointer to UF's Counseling & Wellness Center) → brain (heuristic; the LLM only when it is loaded and enabled
**and the player typed the message** — the preset reply options always get the scripted heuristic answer) → post-filter
(≤ 3 sentences, no AI-isms, PG) → expression (LLM `[tag]` or lexicon) → memory extraction (regex: name, major, hometown, likes, exams…).
The LLM only talks: it never changes stats; chat bond is scored by the game (+2 per exchange, topic match +1, daily cap).
"What {Pig} knows about you" lists remembered facts; tap to forget.
Reply options: three presets (How are you? · Your thing · Campus · Food · Feelings · Ask about me…) plus a fourth "say something else"
that opens a short typed line. Big Brain: asked once at the title screen (size, runs on your device, kept in the browser cache);
declining keeps its UI out of the game. After the KempaPager tutorial, your Kempanion points at the brain chip once
("here's how you can make me smarter"); the chip opens the installer.

## 12. Achievements (~20)

Lab Partners (any ♥2) · Wardrobe Change (first outfit) · Secret Menu (all 3 secret favorites) · Legend of the Sakura (any ♥10) ·
Kempanions Assemble (all ♥10) · Patriot (say "based" to Piggy 2) · Best For What? (ask Piggy 3 what's best) · Set! Spike! (bump→set→spike call-and-response) ·
Bat Signal (Lake Alice at dusk) · Go Gators! (play on a game day) · Early Rounds (greet Piggy 2 before 06:00) · Lights Out (tuck in your Kempanion 7 nights) ·
Squeaky Clean (10 baths) · Five-Star Dining (serve every food) · House Call (cure 3 illnesses) · Rally Royalty (30-hit rally) ·
Textbook Perfusion (100%) · Zero-Day Hunter (10/10 no hints) · Petal Pusher (150 petals) · Triple Gold (gold in 3 games).

## 13. Anti-frustration

No death, no running away, no permanent loss. Offline floors. Stamps pause instead of resetting. Basic food/water/baths free. A full pig refuses
food without consuming it. Mini-games always pay. The writing never guilt-trips: low needs are self-deprecating jokes. Reminders stay in-tab
(title badge "(2) Kempanion Online"). Reduce-motion and reduce-flash respected.

## 14. UX, look & feel (summary — full spec in docs/research/design-ux.md)

- **Gate → splash → title.** A tiny inline "PRESS ANY KEY / TAP" gate unlocks audio; the splash shows **KEMPA AI** with a dither-in
  and the Kempa chime (C5–G5–C6 pulse arpeggio + tiny oink); title over Century Tower at golden hour with petals; logo
  "KEMPANION ONLINE", katakana ケンパニオン・オンライン, tilde subtitle 「～Sakura Campus Days～」. Footer:
  "© 2026 Kempa AI · fan-made, not affiliated with or endorsed by the University of Florida". **No UF logos/marks anywhere.**
- **Layout modes**: **W** (aspect ≥ 1.25 and height ≥ 500 px: letterboxed 16:9 stage, UI overlays inside it, sakura wallpaper in the
  margins) · **T** (phone portrait: device shell — status bar, icon row, full-width stage, icon row, VN box, stats, thumb bar) ·
  **S** (phone landscape: stage fills height, side rails ≥ 64 px for icons/buttons, VN box overlays the stage bottom).
  `--u` = CSS px per stage px; sharp scaling (integer nearest-neighbor upscale offscreen, then CSS fit).
- **Hub = KempaPager**: LCD-segment care icons (FEED · DRINK · PLAY · WASH / LIGHT · CARE · TALK · STATS) + attention light; direct play
  (tap = pet; press-and-drag = pick him up Pocket-God style: the pixel hand cursor turns to grab, he dangles and wiggles,
  rub while holding = tickle, release = toss with your flick's speed, 2D only (walls, ceiling, floor: no depth); landings react
  soft/drop/hard/pop; too many tosses → he pouts; asleep = no pick-up; drag food onto him, tap empty stage = petals); idle picker;
  whispered lines while asleep.
- **Dialogue**: push-in 1.1× + 30% dim, portrait rises, box opens in 4 steps; per-pig typewriter speeds (P1 45 cps, P2 35, P3 32 at Normal);
  pauses (comma 120 ms, .!? 250 ms, — 180 ms, … 450 ms); ▼ bobs; LOG · AUTO · SKIP · HIDE · MENU; choices numbered 1–4, never timed.
- **Brains**: the LLM is called **Big Brain** in the UI; the default deterministic engine is the **Heuristic Brain**. Big Brain is asked
  about once per device on the title screen (Piggy 3 explains: optional, runs on your GPU, size, kept in the browser cache; never
  auto-downloaded). "No thanks" keeps every Big Brain control out of the game (Settings → Brain can still change it). After a yes,
  the brain chip shows progress, your Kempanion's one-time "make me smarter" tutorial points at it, and the chip opens the installer.
  Preset reply options always get the Heuristic answer; only what the player types goes to Big Brain. Every failure falls back.
- **Blip voices**: P1 50% square D5 bouncy (pentatonic ±2 st, every 2nd letter); P2 12.5% pulse G3 + triangle octave below, steady,
  every 3rd letter, `Patriot.` = one G3+C4 two-note blip; P3 triangle B4, wandering ±1 st, "…" pauses 450 ms. G3/B4/D5 form a G-major chord
  for lines all three say together. Whispered lines (asleep/late): −9 dB, low-passed.
- **Juice**: talk bob, breathing, expression pop, surprise hop, anger shake, hearts, trauma-based screen shake (stage only), hit-stop,
  number pops, stepped panel openings; petals 28 (W) / 16 (T, S) with gusts and landings; transitions: dither dissolve, sakura wipe,
  blinds, iris, push-in; all become 200 ms crossfades under reduced motion.
- **Welcome-back letter** after > 2 h away: each pig reports what he did, in his voice. Album: Memories (CGs + scene replays),
  Faces/Moves sprite viewer, Glossary (Piggy 2's medical words, Piggy 3's tech words, Piggy 1's volleyball words), Music Room.
- **Accessibility**: aria-live line announcements (typewriter spans aria-hidden), canvas role=img with a scene summary, full keyboard
  (Z/X/C = device A/B/C; Enter/Space advance; Esc menu; L backlog; A auto; S skip; H hide; T focus chat; [ ] switch pig; M map; B bag),
  sizes S–XL, 44 px targets, no timed choices, Gentle mode (no sickness, needs frozen while away).
- **Storage on GitHub Pages**: all project sites on `<user>.github.io` share one origin → prefix keys with `kempanion`, never call
  `localStorage.clear()`.

## 15. Source material

`docs/research/` holds the four input proposals this design synthesizes (pet sim, story, UX, UF lore). Use them for depth
(line seeds, event beats, random daily events, food notes, sensitivities). **This file wins on conflicts.**
Sensitivities (from uf-lore.md §6): never use the retired "Gator Bait" chant; nothing about the 34th Street Wall memorial;
no Krishna Lunch; never reproduce copyrighted songs/lyrics (fight song, "Jaws", "I Won't Back Down") — Westminster-style chimes are
public domain; no UF logos/Albert & Alberta likenesses; real people are background facts only; anatomy donors are always respected.
