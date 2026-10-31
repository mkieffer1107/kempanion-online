> **Note for implementers:** this is an input proposal. `docs/GAME_DESIGN.md` is canonical and wins on any conflict. Placeholder nicknames from the proposal have been normalized to the canonical names **Piggy 1 / Piggy 2 / Piggy 3**. Currency is **acorns** (not Gator Bucks). Krishna Lunch is not used.

# Kempanion Online: Virtual-Pet Core Design ("Tamagotchi Depth First")

*Kempa AI · proposal v0.1 · 2026-10-30. Scope: the pet simulation, the economy, the mini-games and the retention loops. The VN layer and the optional LLM plug into this core, but the core does not need either of them.*

**Cast.** These are working nicknames; the final names are still to be decided.
- **Piggy 1** (Piggy 1, home: Malachowsky Hall). A cheerful outside hitter and CS major who talks in volleyball and algorithm metaphors ("Let me cook. No wait, let me compile."). He gets up early, eats a lot, hypes everyone up and gets restless easily.
- **Piggy 2** (Piggy 2, home: Communicore/Shands). A precise fourth-year neurosurgery resident (already an MD) on his research year, whose favorite words are "based," "patriot," "ischemia" and "perfusion." He also loves pig spines and CSF.
- **Piggy 3** (Piggy 3, home: New Physics Building). He thinks out loud, builds things, asks "best for what?" and is shy and affectionate.

## 0. Pillars
1. **Players should always have a reason to come back and never a reason to feel guilty.** Needs go down, but pigs never die, never leave and never lose progress.
2. **The sprite is the UI.** Every low need has a status clip (hungry, thirsty, dirty, yawn, bored, sad). The numbers are there to back that up.
3. **The care routine is the same for all three pigs, but each has his own temperament.** Each pig has his own decay rates, tastes, bedtime and mini-game.
4. **Numbers live in data, not code.** Every number in this doc goes in `balance.json`.

## 1. Loops
| Loop | Beat |
|---|---|
| Micro (5–20 s) | status clip → care action → reaction clip, blip line, number pop |
| Session (3–10 min) | Roll Call → top up needs → 1–2 mini-games or a Practice send-off → chat → in the evening, brush and tuck in |
| Day | Decay is tuned so the morning, lunch and evening visits each find 1–3 needs per pig. Evening is the big care session. |
| Week | Report Card, Weekly Seminar, 1–2 bond levels per pig, one decor purchase |
| Arc (6–10 weeks) | Bond Lv10 with all three pigs, care-style Paths, Legendary Sakura events, decor and jukebox collections |

## 2. Needs and decay
Each pig has six visible needs (0–100), two hidden meters, a Mood value derived from the needs, and a Bond value for progression.

| Need (HUD label) | Base decay/h | Low-need clip | Refills |
|---|---|---|---|
| Hunger ("Tummy") | 7 | hungry | food |
| Thirst ("Hydration") | 9 | thirsty | drinks, juicy food |
| Energy | 5 | yawn → sit_down (auto-nap below 5) | sleep +15/h, naps, caffeine |
| Hygiene ("Clean") | 3.5 | dirty | bath → 100, brushing +10 |
| Fun | 6 | bored | play, mini-games, walks |
| Affection ("Heart") | 5 | sad, look_around (searching for you) | pets, talk, gifts, tuck-in |

The two hidden meters are **Sugar** (rises with food sugar, falls 3/h, brushing resets it to 0) and **Germs** (§6).

| Decay multiplier | Hunger | Thirst | Energy | Clean | Fun | Heart |
|---|---|---|---|---|---|---|
| Piggy 1 | 1.25 | 1.2 | 1.0 | 1.3 (sand) | 1.2 | 0.9 |
| Piggy 2 | 1.0 | 1.0 | 1.15 (5 a.m. rounds) | 0.8 (always scrubbing in) | 0.9 | 1.0 |
| Piggy 3 | 0.9 | 1.1 (forgets water while coding) | 0.95 | 1.0 | 0.8 (keeps himself busy) | 1.25 (shy, but wants company) |

```
need -= base[need] * pigMult * stateMult * intensity * modMult * dtHours
need  = clamp(need, floor, 100)          // floor 0 while present, 20 otherwise
```
- **stateMult:** present 1.0. Offline 0.7 ("they can find the dining hall on their own"). Asleep 0.25 (Clean 0.5, and Energy gains 15/h instead of decaying). Sick: Energy decays ×1.5.
- **Present** means the tab is visible and the player gave input in the last 10 minutes. A tab left open in the background counts as offline, so leaving the game open is never worse than closing it.
- **Care Intensity** is a setting: Chill 0.5, Standard 1.0, Devoted 1.4. Devoted also gives +20% acorns and +20% bond XP.
- **Thresholds:**
  - 60 or more: fine.
  - 30–59: mild. An icon shows, and 10% of idles play the status clip.
  - 15–29: needs you. 30% of idles play the status clip, and the pig says what he needs when tapped.
  - Under 15: urgent. This can only happen while the player is present. The pig sits down and loops the status clip 60% of the time.
- **Bedtimes** follow the local clock and can be shifted ±2 h in Settings: Piggy 1 22:30–06:30, Piggy 2 22:00–05:00, Piggy 3 00:30–08:30.

**Tuning check: a typical day for the Piggy 1, the pig with the most needs**
| When the player arrives | Hun | Thr | Eng | Clean | Fun | Heart | What the player does |
|---|---|---|---|---|---|---|---|
| 08:00 (after sleep) | 63 | 57 | 95 | 72 | 63 | 81 | breakfast, drink, Practice send-off |
| 12:30 | 63 | 67 | 80 | 58 | 61 | 77 | snack, one mini-game |
| 21:00 | 40 | 23 | 39 | 22 | 46 | 64 | thirsty and dirty clips are showing: big care session, then tuck-in |
| after a skipped day | 20 | 20 | 50–70 | 25 | 20 | 30 | welcome-back care, diary, rested XP |

Three visits a day keep every need above 20. Piggy 2's and the Piggy 3's needs fall about 20% more slowly.

## 3. Offline and time
- On load and on focus, the game simulates the missed time in 15-minute steps (up to 72 h) and respects each pig's bedtime by the local clock.
- **Floors:** while offline, no need drops below 20 (30 for Hunger and Thirst if the Mini Fridge is owned). Germs build up at half speed offline. The only illness offline time can cause is Sniffles, and only one pig at a time can get it.
- **Away more than 72 h:** skip the simulation. Each need becomes max(current, 55), Germs become 10 and Sugar becomes 0. Then a **Welcome Back Party** plays: a group scene, one loved food per pig and 100 acorns.
- **Study Abroad** (vacation toggle): freezes everything for up to 14 days. The pigs come back with a postcard scene and a souvenir snack.
- **Rested Bond:** being away 20 h or more fills a pool of min(200, 8 × hours away) per pig. Bond XP is doubled until the pool is used up.
- **Pig Diary:** at each simulated step, each pig has a 6% chance to write an entry, up to 3 per absence. 40% of entries come with 5–15 acorns "found under the couch." Examples:
  - Piggy 1: "Ran drills at Southwest Rec. Dug a ball out of a sakura tree. Counts as a save."
  - Piggy 2: "Reread a porcine spinal fusion case report. Very relatable anatomy. Based."
  - Piggy 3: "Okay, so I was thinking... I printed a tiny Century Tower. It leans. That's a feature."
- **Clock:** negative time jumps are ignored and the clock is re-anchored. The game is single-player, so we don't try to stop players who change their clock.

## 4. Care actions mapped to existing clips
| Action | Clips | Effect | Limits |
|---|---|---|---|
| Feed | eat → taste reaction | depends on the item (§4.2) | refused at Hunger ≥ 90 (the item is kept), except for Betsubara |
| Drink | drink → happy | depends on the item | refused at Thirst ≥ 95 |
| Bath | bath → happy (Piggy 2: proud) | Clean 100, Germs −25, Fresh +5 mood for 4 h. Fun: Piggy 2 +10, Piggy 3 −5 | once every 3 h |
| Brush | brush_teeth → blink | Sugar 0, Clean +10, Minty +3 mood for 2 h | once every 2 h |
| Pet (tap) | pet_reaction → surprised (Lv1–2) / shy (Lv3–5) / love (Lv6+) | Heart +8 × 0.6^(n−1), where n = pets in the last 15 min | 6 taps in 3 s → pout (angry clip) and a line, no penalty |
| Play ball | play_ball → laugh | Fun +20, Energy −8, Clean −6, Thirst −5 | starter ball is free |
| Dance | dance → celebrate | Fun +15, Energy −5 | radio is free |
| Nap | yawn → sit_down → sleep → wake_up | Energy +12 per 10 real minutes, up to 30 min, cap 85 | only when Energy < 60 |
| Tuck in | yawn → sleep | Tucked in +6 mood for 8 h, Heart +10, bond +10 | within 90 min of bedtime. Pigs who aren't tucked in go to bed 30 min late on their own, with no penalty. |
| Talk | thinking (while the reply generates) → portraits | Heart +6 and Fun +3 per exchange, ×0.8 for each repeat within 30 min | |
| Comfort | cry/scared → pet_reaction → shy | Comforted +10 mood for 2 h, Heart +15, bond +15 | when the pig is Blue, scared or crying |
| Walk | walk_*, or run_* when Radiant | Fun +5, Heart +5, Energy −3 | |
| Gift | surprised → love / happy / confused | Heart and bond +15 / +8 / +3 | 1 gift per pig per day counts |
| Hangout (all three) | sit_down → laugh / happy | Fun +20, Heart +10, bond +5, Good Vibes +6 mood for 4 h | from 18:00 until the first bedtime, once a day |

**System clips:**
- wave: session start.
- jump: greeting after 8+ h away.
- celebrate/proud: level-ups and medals.
- scared: thunderstorms. Weather is a roll seeded by the date: 25% of afternoons from June to September, 8% otherwise.
- tumble: overexertion and acorns.

**Outfit rule.** Alt outfits have only 13 clips.
- Each pig automatically wears his alt outfit in his mini-game, at Practice and at his home spot.
- From Bond Lv4 he can wear it anywhere.
- If an action needs a clip the current outfit doesn't have, a 300 ms sakura-petal wipe switches him into everyday clothes.
- Portraits fall back along a chain: flustered_blush → shy_blush → shy → neutral.

### 4.1 Taste tiers
| Tier | Fill × | Moodlet | Bond XP | Reaction |
|---|---|---|---|---|
| Secret favorite | 1.3 | +15 for 4 h | +20 (the first time: +50 and a reveal scene) | eat → love → shy |
| Love | 1.2 | +12 for 3 h | +10 | eat → love |
| Like | 1.0 | +6 for 2 h | +4 | eat → happy |
| Neutral | 1.0 | — | +1 | eat → idle |
| Dislike | 0.8 | −5 for 1 h | 0 | eat → sad (Piggy 1) / pout with the angry clip (Piggy 2) / confused (Piggy 3) |

- Bond XP from food is capped at 40 per pig per day.
- **Balanced diet:** eating 3 or more different foods within 24 h gives +4 mood and Hunger decay ×0.9 for 12 h. Getting the same item 3 times in a row halves its moodlet ("Again? ...I mean, thank you.").
- **Betsubara** (the "separate dessert stomach"): one dessert (Sugar ≥ 15) is allowed at Hunger ≥ 90 every 2 h. A second one risks a Tummy Ache, and Piggy 2 warns you first.
- **Caffeine** adds Jittery: Energy decays ×1.3 for 3 h. A second dose within 3 h gives no Energy.

### 4.2 Menu (L = love, + = like, − = dislike, S = secret favorite)
| Item | acorns | Hun | Thr | Sug | Note | Piggy 1 | Piggy 2 | Tink |
|---|---|---|---|---|---|---|---|---|
| Dining Hall Tray (Gator Corner) | free | 25 | | | always stocked | | | |
| Water Fountain | free | | 25 | | always available | | | |
| Plaza Veggie Plate | 8 | 40 | | | | | | + |
| Reitz Union Pizza Slice | 10 | 35 | −5 | 5 | | + | | + |
| Chicken Tender Sub | 18 | 55 | | | a Florida institution | L | + | |
| Cup Ramen | 5 | 30 | −10 | | | | | + |
| Onigiri (Anime Club sale) | 9 | 30 | | | | | | L |
| Melonpan | 12 | 25 | | 15 | dessert | | | L |
| Apple Pie Slice | 15 | 20 | | 25 | dessert | | L | |
| Key Lime Pie | 15 | 20 | | 25 | dessert | + | + | |
| Boiled Peanuts | 6 | 20 | −10 | | | − | + | |
| Acai Bowl | 14 | 30 | 10 | 15 | | + | − | |
| Banana Protein Shake | 12 | 30 | 15 | 5 | Energy +5 | L | | − |
| Watermelon Slice | 8 | 15 | 20 | 10 | | + | + | + |
| Sakura Dango | 14 | 15 | | 20 | dessert; weekly Daily Special | | | S |
| Truffle Fries | 3 GT | 40 | −5 | | | + | S | + |
| Sideline Sip (the sports drink invented at UF) | 8 | | 45 | 10 | cures Heat Daze | L | | |
| Florida OJ | 8 | 5 | 35 | 15 | Germs −5 | + | + | |
| Sweet Tea | 6 | | 35 | 20 | | | L | − |
| Cafecito | 7 | | 10 | 15 | Energy +20, Jittery | − | L | |
| Library West Cold Brew | 9 | | 20 | 5 | Energy +15, Jittery | − | | + |
| Sugar-Free Red Bull | 9 | | 20 | 0 | Energy +15, Jittery; slim can | − | − | L |
| Boba Milk Tea | 12 | 10 | 30 | 25 | | | − | + |
| Strawberry Milk | 8 | 5 | 30 | 15 | | S | | |

There is no pork on the menu, obviously. Medicine is listed in §6.

## 5. Mood
```
target = Σ w[pig][need] * need          // weights below sum to 1.0
       − Σ 0.6 * max(0, 25 − need)      // distress: up to −15 per empty need
       + clamp(Σ moodlets, −30, +30)
       + bondLevel                       // Lv10 = +10 baseline
mood eases toward target at ≤ 10 points/min   // no flicker
```
| Weights | Hun | Thr | Eng | Clean | Fun | Heart |
|---|---|---|---|---|---|---|
| Piggy 1 | .22 | .15 | .15 | .10 | .23 | .15 |
| Piggy 2 | .18 | .15 | .20 | .20 | .12 | .15 |
| Piggy 3 | .18 | .12 | .15 | .10 | .20 | .25 |

| Band | Range | Idle clips | Portrait | Effect |
|---|---|---|---|---|
| Radiant | 
85–100 | happy, dance, jump; runs instead of walking | excited | +10% acorns and bond XP |
| Content | 65–84 | idle, blink, look_around, wave; specialty idles at home spot | happy | — |
| Meh | 45–64 | idle, bored, thinking | neutral | — |
| Down | 25–44 | sad, bored, sit_down | sad | bond XP −25% |
| Blue | 0–24 | cry, sad | crying | Comfort action lights up |

Being sick, being asleep and Energy under 15 all override the mood band.

**Moodlets:**
- Positive: loved food +12, secret favorite +15, Fresh +5, Minty +3, Tucked in +6, Well rested +6, Won (silver or better) +8, Comforted +10.
- Good Vibes +4: lasts while all three pigs are Content or better.
- Worried −4: a roommate is sick or Blue.
- Sick −15. Icky (disliked food) −5.
- Game Day +10: Saturdays, Sep–Nov.
- Rainy day −3. The Piggy 3 gets +3 instead: "rain is basically free lo-fi."

**Wants** are Tamagotchi attention calls without the guilt.
- About every 3 h of present time, each pig shows a Want in a thought bubble: a food, an activity, a place or a chat topic ("Piggy 2 wants to talk about lumbar drains").
- Filling it within 2 h gives +8 bond and +5 mood.
- An unfilled Want just expires.

## 6. Sickness and recovery
**Germs (0–100):**

| Condition | Germs |
|---|---|
| Clean under 30 | +4/h |
| Clean under 15 | +7/h |
| Energy under 15 | +3/h |
| Eating a meal at Clean under 20 ("unwashed hooves") | +8 |
| Clean 60+ and Energy 40+ | −3/h |
| Asleep | −2/h |
| Bath | −25 |
| Florida OJ | −5 |

Germs build up at half speed offline.

Every 30 simulated minutes with Germs ≥ 60, the pig rolls for illness: `p(sick) = 0.005 × (Germs − 55)`. That is 2.5% at 60 and 22.5% at 100. When an illness starts, Germs reset to 30. Normal care keeps Germs under 20, so the target is about one illness per pig every 10–14 days, mostly toothaches from treats the player chose to give.

| Illness (sick clip + sick portrait) | Cause | Effect | Fast cure | Free cure |
|---|---|---|---|---|
| Sniffles | Germs roll. Nov–Feb adds 1% per day if Germs ≥ 30. | Energy decay ×1.5, Fun gains ×0.5, mini-game pay −50% | Honey Lemon Tea (20 acorns) + 1 h rest | one night's sleep |
| Toothache | 35% chance at bedtime if Sugar ≥ 50 and no brushing since dessert | no desserts, −10 mood | brush with Mint Toothpaste (80 acorns, reusable) | brush twice, 3 h apart |
| Tummy Ache | 50% on a second Betsubara dessert within 2 h. 25% on a disliked food at Hunger ≥ 80. | can't eat for 1 h | Ginger Ale (15 acorns) | 1 h rest |
| Heat Daze | 40% on outdoor play with Thirst under 25, May–Oct | tumble, Energy −20, indoors for 1 h | Sideline Sip + 5 min sit_down under a sakura | 1 h indoors |
| All-Nighter Fog | awake 2 h past bedtime | Energy capped at 60 | none. Piggy 2: "There's no pill for this. Sleep." | one full night |

- **Student Health Care Center (SHCC):**
  - Free once per pig per day.
  - Cures any illness after 30 real minutes in the infirmary.
  - Any illness that reaches 24 h ends on its own with an SHCC scene ("The nurse said I'm fine. She also said, quote, 'drink water, goober.'").
- **Doctor's Rounds** (Piggy 2 at Bond Lv4):
  - Once per illness, Piggy 2 examines a sick roommate (neuro_exam → write_chart), which halves the time left.
  - "Pupils equal and reactive. Perfusion's great. Prescribing soup. Based."
- **Caps:**
  - At most one random illness in the household at a time.
  - Any illness caused by a player choice is announced by a warning line first.
  - Illness never lowers Bond.

## 7. Growth and progression
### 7.1 Bond levels (per pig)
XP needed for the next level = `round(60 × L^1.6, −1)`

| Lv | Title | XP to next | Total XP | Unlock |
|---|---|---|---|---|
| 1 | Classmate | 60 | 0 | care, chat, his mini-game |
| 2 | Lab Partner | 180 | 60 | Practice; he picks a nickname for you |
| 3 | Study Buddy | 350 | 240 | visits to his home spot, with specialty idles (Piggy 1 sets a volleyball to himself in the Malachowsky atrium between lectures) |
| 4 | Friend | 550 | 590 | **alt outfit anywhere, plus its ability**, with an event scene |
| 5 | Close Friend | 790 | 1,140 | **care-style Path**, Hard mode, a hint about his secret favorite |
| 6 | Good Friend | 1,060 | 1,930 | Pep Talk: gives a roommate +8 mood for 2 h, once a day |
| 7 | Best Friend | 1,350 | 2,990 | a signature decor gift; a dusk walk to see the Lake Alice bats |
| 8 | Partner-in-Crime | 1,670 | 4,340 | his chiptune theme song; Practice pays +25% acorns |
| 9 | Kindred Spirit | 2,020 | 6,010 | chat lines with the affectionate_blush portrait |
| 10 | Kempanion | — | 8,030 | Legendary Sakura event at Century Tower, gold name plate, Path re-check |

The Lv10 scene nods to the legendary tree in Tokimeki Memorial, kept PG: the two of you promise under the Century Tower sakura to stay friends after graduation.

**Bond XP sources per pig (daily cap in parentheses):**
- Care action when that need was below 60: +3 (30)
- Taste bonus from food (40)
- Pet: +2 (10)
- Talk: +2 (20)
- Gift: +15 / +8 / +3 (one gift a day)
- Tuck-in: +10
- His mini-game: 10 + 5 per medal tier (100)
- Practice: +5 per hour (20)
- Daily task featuring him: +10 (30)
- Comfort: +15
- Story scenes: +30 to +50

A regular player earns about 150 XP per pig per day:
- Lv4 (alt outfit) on day 4.
- Lv5 around day 8.
- Lv10 in about 7–8 weeks.

Heavy players reach Lv10 in about 4 weeks. Rested XP keeps it within reach for light players.

### 7.2 Care-style Paths (evolutions without new art)
A Tamagotchi evolves based on how it was raised. Our pigs do the same through titles, perks and dialogue pools, so no new art is needed. Over a rolling 14 days, each pig keeps three scores:
- **Active:** play ball, dance or walk +1. A Sakura Spike or Petal Catch run +3.
- **Scholar:** Practice +2 per hour. A Swinus Rhythms or Bug Hunt run +3. A library visit +1.
- **Cozy:** pet or talk +1 (up to 5 a day each). Tuck-in or gift +2. Bath or loved food +1.

At Lv5 the highest score picks his Path; a tie goes to Cozy. Lv10 checks again and can change it.

| | Active | Scholar | Cozy |
|---|---|---|---|
| Piggy 1 | **Piggy 1 Spiker:** Sakura Spike perfect window +15% | **Full-Stack Libero:** Practice +20% acorns; earns bond from Bug Hunt runs (he reviews your fixes) | **Hype Captain:** roommates' Fun decays ×0.85 while he's home |
| Piggy 2 | **Team Physician:** any pig gets +5 Energy after a mini-game | **Chief Resident:** Swinus Rhythms timing windows +15%, Practice +20% acorns | **Bedside Manner:** illnesses last 25% less time |
| Piggy 3 | **Field Engineer:** walks find an item 25% of the time | **Open-Source Sensei:** free Bug Hunt hint at 3 s, Practice +20% acorns | **Comfy Maker:** Night Build makes 2 items |

### 7.3 Alt-outfit abilities (Bond Lv4)
- **Piggy 1, volleyball uniform, "Team Spirit":** Fun decays ×0.8 for every pig in the room. Sakura Spike pays +20% acorns.
- **Piggy 2, scrubs, "Doctor's Rounds":** see §6. Swinus Rhythms pays +20% acorns.
- **Piggy 3, black hoodie, "Night Build":** he 3D-prints one random toy or gift overnight, waiting at Roll Call. Owning the 3D Printer decor unlocks a rare pool. Bug Hunt pays +20% acorns.

### 7.4 Practice (idle send-off)
Each pig has his own Practice:
- Piggy 1: drills at Southwest Rec.
- Piggy 2: lab-pig rounds and the sim lab.
- Piggy 3: the lab, running jobs on HiPerGator.

| Length | Pay |
|---|---|
| 30 min | 15 acorns |
| 2 h | 45 acorns |
| 4 h (needs Energy ≥ 40) | 75 acorns |

Rules:
- Practice costs about 6 Energy per hour.
- While he's away, his needs decay at the present rate, but the offline floors still apply.
- He can't start Practice while sick, and a session can't run past his bedtime.
- Each return brings a diary card.

How each pig comes back:
- Piggy 1: sandy, Clean −5/h.
- Piggy 2: freshly scrubbed, Clean +10.
- Piggy 3: pleased, Fun +5.

### 7.5 Campus Rank (sum of the three bond levels)
| Rank | Bond total | Unlocks |
|---|---|---|
| Freshman | 3–8 | Dorm, Plaza of the Americas, Reitz Union shop |
| Sophomore | 9–14 | Marston Library, Lake Alice, second half of the decor catalog |
| Junior | 15–20 | Century Tower, tier-2 decor upgrades |
| Senior | 21–26 | Ben Hill Griffin Stadium on Game Days |
| Grad Student | 27–30 | HiPerGator machine-room event |

## 8. Currency, shop and decor
**Currencies:**
- **acorns (acorns)** are the everyday currency.
- **Golden Truffles (GT)** are rare and buy cosmetics, jukebox tracks and Truffle Fries.
- There is no real-money purchase anywhere.

**Golden petals:** a golden sakura petal floats across the screen every 3–6 minutes of active play. Tapping it gives 5 acorns, up to 10 petals a day.

| acorns per day | Light (1 × 10 min) | Regular (3 visits, ~25 min) | Heavy (60+ min) |
|---|---|---|---|
| Login stamp (average) | 50 | 50 | 50 |
| Daily tasks | 25 | 75 | 75 |
| Mini-games | 50 | 140 | 330 |
| Practice | 15 | 60 | 120 |
| Petals and diary | 20 | 40 | 55 |
| **Total** | **about 160** | **about 365** | **about 630** |

**GT income:**

| Source | GT |
|---|---|
| All 3 daily tasks done | +1 |
| Login stamps 4 and 7 | +1 each |
| Report Card | 1–7 |
| Weekly Seminar | 3 |
| Each bond level-up | 2 |
| Each achievement | 1–10 |

A regular player earns about 17 GT a week.

**What acorns buys:**
- Basic care is always free. Treats cost 5–20 acorns, about one mini-game run.
- Care items:
  - Rubber Duck: 60 acorns, bath Fun +10.
  - Mint Toothpaste: 80 acorns.
  - Lavender Soap: 120 acorns, Fresh lasts 8 h.
- Gifts:
  - Knee Pads: 70 acorns, Piggy 1 loves.
  - Squishy Brain Model: 90 acorns, Piggy 2 loves.
  - 3D-Print Filament: 30 acorns, Piggy 3 loves.
  - Pirate Manga: 40 acorns, Piggy 3 loves.
  - Gator Pennant: 50 acorns, all three like.

**Decor:** the room has 5 slots: Wall, Desk, Floor ×2 and Window. With limited slots, you have to pick which bonuses you want.

| Decor | Slot | Price | Passive bonus |
|---|---|---|---|
| Brain Anatomy Poster / Pirate Flag Tapestry | Wall | 300 | Piggy 2's / Piggy 3's Fun decays ×0.85 at home |
| CRT Retro PC | Desk | 500 | Piggy 1's and Piggy 3's Fun decays ×0.9 |
| 3D Printer | Desk | 800 | Night Build rare pool; Piggy 3 Fun +10 at home |
| Jukebox | Desk | 600 | choose dance tracks, +2 mood |
| Mini Fridge | Floor | 450 | offline floor for Hunger and Thirst becomes 30 |
| Bean Bag | Floor | 350 | naps give +25% Energy |
| Air Purifier | Floor | 400 | Germs build up ×0.75 |
| Mini Volleyball Net | Floor | 250 | play_ball gives Fun +30 |
| Sakura view / Lake Alice sunset | Window | 10 GT | +3 mood / tuck-in +4 |

Tier-2 upgrades cost 2.5× and give 1.5× the effect. They stretch decor to 6–8 weeks for a regular player.

The GT catalog totals about 200 GT, roughly 10–12 weeks of play:
- 16 jukebox tracks at 5 GT each.
- 4 background variants at 12 GT each: night, rain, golden hour, snow day.
- 6 name-plate frames at 6 GT each.
- Consumables.

**Shop:** the Reitz Union Campus Store. The pig of the day works the register, using his existing portraits. One Daily Special is 30% off. Piggy 2 at the register: "Fifteen acorns. Based purchase."

## 9. Mini-games
**Shared rules:**
- All four games are on the Campus Map from day 1.
- A pig needs Energy ≥ 20 to play. Below that, he suggests a nap or a coffee.
- No lives, no tickets and no fail-out.
- Every finished run pays at least 5 acorns, and each game's first run of the day pays double.
- Assist mode (timing windows ×1.5, speed ×0.8) still pays full rewards.
- Hard mode unlocks at that pig's Lv5: speed ×1.2, windows ×0.8, acorns cap +50%.
- A reduce-flash setting replaces full-screen tints with colored borders.

| Game | Pig, place | Length | Eng | Fun | Clean | Thr | acorns formula (cap) | Bronze / Silver / Gold |
|---|---|---|---|---|---|---|---|---|
| Sakura Spike | Piggy 1, Southwest Rec sand courts | 60 s | −12 | +25 | −10 | −10 | 5 + score/120 (45) | 1,500 / 3,500 / 6,000 |
| Swinus Rhythms | Piggy 2, Communicore Sim Lab | ~65 s | −10 | +20 | −3 | −5 | 5 + 0.4 × accuracy% (45) | 70 / 85 / 95% |
| Bug Hunt | Piggy 3, New Physics Building lab | 10 rounds | −8 | +20 | 0 | −5 | 5 + score/5 (45) | 6 / 8 / 10 correct (gold needs no hints) |
| Petal Catch | any pig, Plaza of the Americas | 45 s | −10 | +25 | −5 | −8 | 5 + score/4 (40) | 60 / 100 / 150 |

**Sakura Spike** is a one-button timing game.
- It opens with volleyball_ready → volleyball_serve.
- Each incoming ball casts a shadow with a shrinking ring. The player taps three times per point: bump, set, spike, each with its own clip.
- Perfect (±60 ms) scores 100 and Good (±130 ms) scores 50.
- The combo multiplier is 1 + 0.1 for every 5 hits in a row, up to ×2.
- Once per point, a late tap (within 250 ms) plays volleyball_dig and saves the rally.
- 20% of returns are opponent spikes. One tap blocks them with volleyball_block (+150).
- Speed goes up 5% every 10 touches, to a maximum of +60%. The run ends on volleyball_win.
- The other pigs cheer from the sideline in everyday clothes (happy and celebrate clips) and get +10 Fun.

**Swinus Rhythms** (formerly "Perfusion!"; a play on "sinus rhythm") is a rhythm game.
- Intro: scrub_up (alternate taps for 3 s, +5% score), then preop_check (tap a 3-item checklist in order, +5%).
- Main game: an ECG line scrolls across a pixel monitor while Piggy 2 holds surgical_focus. There are three note types:
  - **Beat:** tap on the spike.
  - **Drain:** hold ("Draining CSF... pressure normalizing").
  - **Skip:** a gray flat line; don't tap.
- 64 notes, in three phases at 72, 96 and 120 BPM. The procedural chiptune uses the heartbeat as its kick drum.
- A perfusion meter starts at 70. Perfect (±50 ms) +3, Good (±110 ms) +1, Miss −6.
- If the meter drops below 30, the screen tints blue and Piggy 2 shouts "ISCHEMIA!" with obvious delight, then "I mean, oh no. Fix it." The run continues; there is no fail-out.
- Results: clinical_success, then write_chart grades the run. review_mri plays on the cards between phases.

**Bug Hunt** is a debugging puzzle.
- It opens with invite_to_code. Each of the 10 rounds shows 4–7 lines of Python-style "PigScript" with exactly one broken line. The player taps it within 12 s (20 s in Assist).
- Score per round is 10 + seconds left.
- A wrong tap loses the round and plays confused → explain_code.
- At 6 s, ai_idea offers a hint that highlights 3 lines, at a cost of 2 points.
- Puzzles are generated from about 30 templates themed on the game itself (feeding loops, rally scoring, EEG sampling). Each one gets one of 8 bugs:
  - typo
  - wrong constant
  - flipped comparison
  - `=` instead of `==`
  - `=` instead of `+=`
  - swapped arguments
  - missing increment
  - off-by-one
- Each bug type has a one-line explanation template.
- Rounds 1–3 use typos a non-coder can spot, rounds 4–7 use logic bugs, and rounds 8–10 use off-by-ones.
- coffee_break plays after round 5, code_review on the results screen, and build_success on a gold run.

```
def feed_all(pigs):
    for i in range(len(pigs) - 1):   # the bug
        pigs[i].hunger += 25
```
Piggy 3: "Actually, that's an off-by-one. The loop skips the last pig. Which is me. Rude."

**Petal Catch** is the cheapest game to build.
- Any pig, in everyday clothes, runs left and right with run_left/run_right.
- Catch:
  - Pink petals: +1.
  - Golden petals: +10.
  - Snacks (onigiri and oranges): +2 score and +5 Hunger each, up to +30 per run, so playing also feeds him for free.
- Acorns from the Plaza's famously bold squirrels make him tumble for 0.8 s but cost no points.

## 10. Daily and weekly loops
**Roll Call** runs on the first open after 05:00.
- The pig with the lowest Heart greets you, which quietly nudges you to spread care evenly.
- Then, in order: diary, login stamp, omikuji, daily tasks, Daily Special.

**Login calendar:** you get one stamp for each day you play. It **pauses when you miss a day and never resets.**

| Stamp | Reward |
|---|---|
| 1 | 30 acorns |
| 2 | 40 acorns + Plaza Veggie Plate |
| 3 | 50 acorns |
| 4 | 1 GT |
| 5 | 60 acorns + a loved food |
| 6 | 70 acorns + 2 drinks |
| 7 | 100 acorns + 1 GT + a "Weekend Hangout" group scene |

**Omikuji:** a daily fortune slip from the Century Tower sakura. There are no bad-luck slips. Piggy 2: "Those were all tied to the tree already. Sanitary. Based."

| Slip | Chance | Effect |
|---|---|---|
| Great Blessing | 10% | +25% acorns today |
| Blessing | 30% | first-run bonus ×3 |
| Small Blessing | 40% | one item at half price |
| Future Blessing | 20% | tie it to the tree; tomorrow's stamp is doubled |

**Daily tasks:**
- 3 tasks a day drawn from a pool of about 40, with one free reroll.
- Each pays 25 acorns and +10 bond with the pig it features. Finishing all three adds 1 GT.
- Examples:
  - Feed Piggy 2 something he loves.
  - Get a 20-touch rally.
  - Brush everyone's teeth after dessert.
  - Say "based" to Piggy 2.
  - Ask the Piggy 3 what's best for something.
  - Walk a pig to Lake Alice.
  - Tuck all three in.

**Bedtime routine:** brushing plus a tuck-in (+9 mood overnight) is the natural way to end a session.

**Weekly Report Card** (Friday after 17:00): Piggy 2 reviews the week with write_chart. A "care day" is a day on which every pig got at least one care action. Grades are always in the A range ("the Gator curve").

| Care days | Reward |
|---|---|
| 1–2 | 1 GT |
| 3–4 | 3 GT |
| 5–6 | 5 GT |
| 7 | 7 GT + a sticker |

**Weekly Seminar:** one bigger goal for 3 GT, such as three gold medals, ten different foods, or finding a secret favorite.

**Worry Bubble:** a kind version of the "bomb" from Tokimeki Memorial.
- A thought bubble appears over a pig who got fewer than 3 direct interactions a day across 3 play-days.
- It has no downside.
- Tapping it opens a heart-to-heart scene: +50 bond, Heart +30, and "Seen" (+10 mood for 12 h).

**Yearbook:**
- Tracks days together, discovered tastes, diary cards, replayable scenes and medals. The completion percentage is a long-term goal.
- Photo Mode saves the screen as a PNG.

**Event calendar** (dates in data):
- **Spooky Sakura is running now (Oct 24–Nov 1):** pumpkin background variants, candy that raises Sugar, a trick-or-treat action, and a gentle jump scare using the scared clip.
- Then:
  - Homecoming week.
  - Game Day Saturdays.
  - Finals Week (Practice +25%).
  - Hanami (Mar 20–Apr 10, Sakura Dango always in stock).
  - Summer storm season.

## 11. Achievements (GT reward in parentheses)
**Care**
- Lights Out: tuck in all three in one night (1)
- Squeaky Clean: bathe all three within 10 min (1)
- Flossophy: brush morning and night for 7 days (2)
- Betsubara: give a full pig dessert (1)
- Five-Star Dining: serve every menu item (3)
- House Call: cure 5 illnesses (2)

**Bond**
- Lab Partners: any pig reaches Lv2 (1)
- Wardrobe Change: unlock the first alt outfit (2)
- Secret Menu: find all 3 secret favorites (3)
- You Were Missed: resolve a Worry Bubble (1)
- Legend of the Sakura: any pig reaches Lv10 (5)
- Kempanions Assemble: all three reach Lv10 (10 + a jukebox track)

**Mini-games**
- Rally Royalty: 30 hits in a row in Sakura Spike (2)
- Textbook Perfusion: 100% perfusion in Swinus Rhythms (3)
- Zero-Day Hunter: 10/10 in Bug Hunt with no hints (3)
- Petal Pusher: 150 petals in one run (2)
- Triple Gold: gold in all four games (5)

**Campus and secrets**
- **patriot**: say "based" to Piggy 2 (1)
- Best For What?: ask the Piggy 3 what's best (1)
- Bat Signal: visit Lake Alice within 30 min of sunset (2)
- Go Gators!: play on a Game Day (1)
- Early Rounds: greet Piggy 2 before 06:00 (1)
- Interior Decorator: fill all 5 decor slots (3)

## 12. Anti-frustration rules
1. No death, no running away, and no permanent loss of stats or bond. The worst case is a sad, sniffly pig who is happy to see you.
2. Needs never drop below 20 while you're offline. After more than 72 h away, needs reset to 55 and there's a welcome-back party.
3. Basic food, water, baths and tooth-brushing are free and always available.
4. Login stamps pause instead of resetting. Excused Absence notes protect the streak achievement: 2 free a month, then 5 GT each.
5. Rested Bond XP after an absence, and Study Abroad mode can freeze the game for up to 14 days.
6. A full pig refuses food without using up the item. Before any player choice can cause an illness, a pig warns about it in his own voice.
7. Nights are protected: needs decay at 25% while asleep, and bedtimes are adjustable.
8. Only one random illness at a time. The SHCC cures anything for free, and no illness lasts more than 24 h.
9. Negative moodlets can add up to −30 at most, and Comfort always works.
10. Mini-games have no fail state and always pay a minimum. Assist mode pays full rewards.
11. The writing never guilt-trips the player. When needs are low, the pigs joke about themselves.
12. Reminders stay inside the tab: a title badge like "(2) Kempanion" and an optional browser notification while the tab is open. That's at most 2 a day, off by default, with no push server.

## 13. Voices (heuristic engine; no LLM needed)
| Situation | Piggy 1 | Piggy 2 | Piggy 3 |
|---|---|---|---|
| Roll Call | "Morning! Fifty serves done, half a LeetCode. Let's goooo!" | "0500, rounded on the lab pigs. Vitals stable, perfusion excellent. Based." | "Okay, so I was thinking... what if breakfast had a dashboard? Oh wait. You're the dashboard. Morning!" |
| Hungry | "My stomach just threw a StackOverflowError. Snack, please?" | "Blood glucose trending down. Feed me before I explain ischemia. In detail." | "Actually, I forgot to eat. The agent was mid-run and I didn't want to blink." |
| Loved food | "Tender sub?! You're officially my setter. Nice set!" | "Apple pie. The most patriotic dessert. Based." | "Melonpan! Basically the best crunch-to-fluff ratio. I ran the numbers. Loosely." |
| Disliked food | "They're... wet peanuts. I'll eat it. For the team." | "This bowl has insufficient perfusion of flavor." | "It's... chalky? Best for what, exactly? Not taste." |
| Bath | "Fresh! Sand gets EVERYWHERE." | "Scrubbing in. Two minutes per hoof. Non-negotiable." | "Warm water is... okay, it's nice. Don't tell anyone." |
| Pet (Lv6+) | "H-hey, I wasn't in ready position! ...Okay. One more." | "Your hand is on my head. Cranial nerves report: acceptable. Highly acceptable. Continue." | "You can keep doing that. I'm not going to make it weird. ...I'm making it weird. Sorry." |
| Sick | "Benched. Me. Sit with me so I'm not just staring at the ceiling?" | "Febrile, sniffly, fatigued. Plan: soup, nap, and you reading me a spinal fusion case report." | "My ECG would look fine, but my vibes are at like forty percent. Stay a bit?" |
| Win | "THAT is how you close a rally! Up top!" | "Clinical success. Perfusion maintained. Patriot." | "Build passed! Okay, so I was thinking: we should frame this terminal." |
| Tuck-in | "Practice at seven. You'll still be here at seven, right? ...Night!" | "Sleep is when your glymphatic system clears out the brain. Based biology. Goodnight." | "Five more minutes, the HiPerGator job's almost... okay. Fine. Night. Thanks for checking on me." |
| Worry Bubble | "Hey... can we talk? Off the court, I mean." | "May I present a case? Patient: me. Chief complaint: you've been busy." | "Um. It's not a bug report. It's more of a... feelings report?" |

**Fixed rules and extra line pools:**
- **The "based" rule:** if the player's message is exactly "based" (ignoring punctuation and capitalization), Piggy 2 replies `patriot` and nothing else. There's no LLM call, he shows the proud portrait, and it plays one blip.
- **After a safety line:** right under the crisis line (988 and the Counseling & Wellness Center) or the medical line (the Student Health Care Center, 911), the quick replies are gentle: "Thank you." (or "Thanks, I'll get it checked."), "I need a hug." and "What did you do today?". There are no cheers, jokes, quirk words or "Pig Pen Friday!". They stay gentle for two more messages, or until the player changes the subject. Each pig answers them warmly in his own voice, and Piggy 2 can answer "Thank you." with a very soft "…Patriot." (`GENTLE_CHIPS` in `src/lib/ai/topics.ts`).
- About 30% of Piggy 2's lines end in "Based." He calls the player "a true patriot" after kind acts.
- Piggy 2's idle trivia:
  - "You make about half a liter of CSF a day. I think about draining it a completely normal amount."
  - "Pigs are the classic large-animal model for spine surgery. Very relatable anatomy."
  - "Someday I'll put a microchip in a pig's brain. With fully informed consent. Probably mine."
- The Piggy 3 answers any "what's the best..." question with "Best for what?" followed by two options and their tradeoffs.
- Piggy 3 idle line: "If this were JoJo, there'd be menacing katakana behind me right now. It's just me eating onigiri."

## 14. Build notes (static site, all client-side)
**Save**
- One JSON object in `localStorage` (`kempanion.save.v1`).
- Autosaves every 30 s and whenever the tab is hidden or shown.
- Keeps 3 rotating backups, plus an export/import code for moving to another device.
- LLM weights are cached separately in IndexedDB.

**Simulation**
- Updates every 10 s during play and catches up on load and focus.
- All constants live in `balance.json`.
- A debug time-warp slider (×60, ×3600) makes tuning practical.

**Behavior picker**
- Runs every 4–8 s and picks the first match:
  1. Forced states: sleep, sick, away.
  2. An urgent-need clip, 60% of the time.
  3. A low-need clip, 30% of the time.
  4. An idle clip for the current mood band.
  5. At his home spot, a specialty idle 10% of the time.
- Clip fallbacks:
  - celebrate → happy → idle.
  - run → walk.
  - A clip missing from the alt outfit triggers the switch to everyday clothes.

**Dialogue**
- Line pools are keyed by pig, situation, mood band and bond tier. None of the last 8 lines repeats.
- When the LLM is loaded, it gets a one-line summary such as "Piggy 2: hungry, Content, bond 6, just ate apple pie (loved)".
- The LLM can only talk. Stats change only through the same capped Talk rule, so the game plays the same without it.
- The thinking clip covers the wait while a reply is generated.

**Audio**
- Text-blip voices, each with ±30 cents of random pitch variation:

| Pig | Wave | Pitch |
|---|---|---|
| Piggy 1 | 12.5% pulse | ~880 Hz |
| Piggy 2 | triangle | ~440 Hz |
| Piggy 3 | 25% pulse | ~660 Hz |

- Short jingles: a two-note fall for hungry, a 4-note arpeggio for level-up, a minor chord for sick.
- The average mood of the household picks major (50 or above) or minor key, and sets the tempo.

**Layout**
- An 8-button care bar: Feed, Drink, Clean, Play, Rest, Talk, Go, Bag.
- In portrait orientation, one pig is on screen and you swipe between them. In landscape, all three are on stage with small need indicators.
- Shipped as a PWA so phones can add it to the home screen.

**Build order**

| Day | Work |
|---|---|
| 1 | state, decay, offline simulation, saving |
| 2 | behavior picker, care actions, HUD |
| 3 | tastes, mood, sickness, shop |
| 4 | Sakura Spike, Petal Catch |
| 5 | Swinus Rhythms, Bug Hunt generator |
| 6 | Roll Call, tasks, achievements, Report Card |
| 7 | tuning |

**Open questions**
- Final names for the three pigs.
- Which 5 everyday clips each alt outfit includes besides its specialty clips. The fallback chain handles any answer.
- Campus details to check before launch, such as where the sand volleyball courts are and the Homecoming date.