> **Note for implementers:** this is an input proposal. `docs/GAME_DESIGN.md` is canonical and wins on any conflict. Placeholder nicknames from the proposal have been normalized to the canonical names **Piggy 1 / Piggy 2 / Piggy 3**. Currency is **acorns** (not Gator Bucks). Krishna Lunch is not used.

# Kempanion Online: Narrative Design Proposal
**Track:** Visual novel / story depth first · **Studio:** Kempa AI · **Draft:** 2026-10-30

> **Pitch.** One semester, three pig boys, and 1,853 sakura trees nobody can explain. You're a new UF student, and Kempa AI's buddy program pairs you with a "Kempanion." The campus clock is your real clock. The pigs eat lunch when you do, watch the Lake Alice bats at tonight's real sunset, and fall asleep in Library West at 2:47 AM during finals. It's a PC-98-style ADV (name plate, text box, busts, choices, backlog) built on top of a Tamagotchi.

**Pillars**
1. **The clock is real and the player sets the story's pace.** Nothing is missable forever.
2. **Every quirk is a joke in event 1 and an emotional payoff by event 7.**
3. **The script owns the plot; chat adds texture.** The game is fully playable offline. The optional LLM adds conversation that the story remembers.
4. **No new character art.** CGs are built from existing clips, busts, backgrounds and procedural FX.

**Notation:** `clip` means a sprite animation and [bust] means a portrait.
- Specialty clips exist only in the alt outfits. "Work mode" scenes therefore open with a quick change: "Give me thirty seconds." → cut → scrubs.
- Alt outfits have only 12 busts. A missing bust falls back to the nearest one (`flustered_blush → shy`).

---

## 1. Cast
These are working names. Real names live in `characters.json`.

| | **Piggy 1** (Piggy 1) | **Piggy 2** (Piggy 2) | **Piggy 3** (Piggy 3) |
|---|---|---|---|
| Who | CS junior; outside hitter on the club volleyball team | MD and fourth-year (PGY-4) neurosurgery resident at Shands, still studying; on his research year in a large-animal neuro lab (spinal cord injury in pigs, papers, grants, the occasional call shift) | Grad researcher in biosignals and 3D printing; HiPerGator regular |
| Day base | Malachowsky Hall ("the Starship") | HSC Communicore, then Shands | Physics Building basement lab |
| Work mode | Volleyball uniform | Scrubs | Black hoodie |
| Tics | "Mine!" "Free ball!" "Next rally." Calls you "team." | "Based." If you say "based," he replies only `patriot`. Rates everything as **perfusion** or **ischemia**. | "Okay, so I was thinking…" "Actually—" "basically." Answers questions with "Best for what?" |
| Secret | Too nerdy for the team and too jocky for the lab; calls every ball himself | Afraid of being ordinary; won't rest | Builds things for everyone but never ships his own ("it's not pretty yet") |
| Arc | Learns to call "Yours!" | Learns that perfusion applies to him too | Learns that shipped and shared beats perfect |
| Theme / blip | "Rally!" at 150 BPM, square leads; bright, fast blips | "Perfusion" at 72 BPM (a resting heart rate) over a heartbeat kick; low, clipped blips | "So I Was Thinking" at 96 BPM, triangle arpeggios; soft blips that slow down on "…" |

**Voice seeds**
- **Piggy 1**
  - "A rotation is just a circular buffer that sweats."
  - "Bump, set, ship."
  - "You complimented my *code*? Nobody compliments my code. Hold on, I need to sit down." (`sit_down`, [flustered_blush])
- **Piggy 2**
  - "My sleep schedule isn't bad. It's mildly ischemic."
  - "Pig brains are gyrencephalic. Folded, like yours. Gold-standard model. Based."
  - "Microchips in pig brains? Sign me up. Cut out the middle-pig."
- **Piggy 3**
  - "Okay, so I was thinking— actually, wait. Yes. I was thinking."
  - "HiPerGator is basically a very large friend who does math while we sleep."
  - "I made you a thing. It's not a big thing. It's a medium thing."

## 2. You, and Sakura House
- **You** are an unseen first-person protagonist, as in Tokimeki Memorial. There's no sprite, and your name appears on the name plate.
- **The Kempa AI Intake Form** is an in-world tablet. It asks:
  - Name and pronouns.
  - *What brings you to UF?* (Computing / Medicine & Life Sciences / Physics & Engineering / Arts & Humanities / Still deciding).
  - *Early bird or night owl?* (or *"What's sleep?"*).
  - *Comfort food?*
- **Each answer becomes a memory fact and a small bond bonus:**
  - Computing gives Piggy 1 +3, Medicine gives Piggy 2 +3, and Physics gives Piggy 3 +3.
  - Early bird gives Piggy 1 +2, and night owl gives Piggy 3 +2.
  - "What's sleep?" gives Piggy 2 +2, plus a lecture.
- **Home is Sakura House,** a creaky co-op a block off University Ave. A sakura in the yard blooms all year, and nobody asks why.
  - The house is the Tamagotchi screen.
  - Your Kempanion lives across the hall and the other two live upstairs. Evenings become found-family VN time, a nod to *Sakurasou*.

## 3. Intro (~8 min, skippable on replay)
1. **Opening.** A Kempa AI splash with a 3-note jingle, then the title over Century Tower at dusk. The opening line changes by month; October's is "Gainesville. Still 85°F. The trees did not get the memo." Then the intake form.
2. **Plaza of the Americas, 12:35.** The carillon plays and you're lost. A volleyball rolls to your feet → **Piggy 1 1**.
3. **Reitz Union, Kempanion booth.** A pig in scrubs is giving every freshman a "wellness check" → **Piggy 2 1**. Nine minutes later, Piggy 3 shows up with your KempaPager, the program's Tamagotchi-style egg → **Piggy 3 1**.
4. **Century Tower sakura, dusk.** KEMPA STAFF (text only): "You'll pair with one Kempanion. You'll still see everyone. It's a small campus." (It is not a small campus.) You pick from three bust cards, and tapping a card turns [neutral] into [excited].
5. **Reactions.** Nobody sulks for real.
   - If not picked:
     - Piggy 1: "Respect. I'm still recruiting you for intramurals."
     - Piggy 2: "Defensible choice. Still based."
     - Piggy 3: "Oh! No, totally, that makes sense. Best for what you need, right? …I'll make you a keychain anyway."
   - If picked:
     - Piggy 1 (`celebrate`): "TEAM OF TWO!"
     - Piggy 2 ([proud]): "Patient accepted. *Partner.* I meant partner."
     - Piggy 3 ([bashful_smile]): "Okay okay okay. I'm making the home screen *so* good."

## 4. Your Kempanion vs. the other two
- **What your Kempanion gets:**
  - Their needs drive the pet layer.
  - 12 Kempanion-only "home moments," such as brushing teeth side by side at 23:00 or a shared `yawn` at 07:00.
  - +25% bond from chat.
  - **Walk with me:** they come along to your next stop if their schedule slot is `free`.
- **The other two** keep full heart ladders, chat, gifts and mini-games. Their bond just grows more slowly.
- **Re-pairing** is allowed once per in-game day. It costs no bond and plays a 3-line moving scene. Running gag:
  - Piggy 1 owns four volleyballs and zero pillows.
  - Piggy 2 owns a brain model and eleven water bottles.
  - Piggy 3 owns a printer, a printer, and a smaller printer.
- **Jealousy is warm, never a guilt trip.** Piggy 3: "You've been hanging out with Piggy 1 a lot! Which is great! Best for what? Best for you."

## 5. Time & calendar
- **Clock:** the player's wall clock, so the pigs sleep when you do.
- **Dusk:** Gainesville's real sunset for today's date (29.65°N, 82.35°W), computed offline with a ~20-line NOAA formula.

| Slot | Window | What's happening |
|---|---|---|
| Dawn | 05:00–07:59 | Piggy 1 practices, Piggy 2 rounds on the lab pigs, Piggy 3 sleeps |
| Morning | 08:00–11:59 | Classes |
| Midday | 12:00–13:59 | Plaza lunch; carillon at 12:35 |
| Afternoon | 14:00 → dusk | Labs and practice; carillon at 16:55 |
| Dusk | sunset ±45 min | Lake Alice bats ~15–20 min after sunset |
| Night | → 23:59 | Libraries, Sakura House |
| Owl | 00:00–04:59 | Most pigs asleep; your Kempanion nags *you* to sleep |

- **Week:**
  - Mon–Thu: classes.
  - Friday: **Pig Pen Friday** lunch with all three at the Plaza, then Gator Nights at the Reitz.
  - Fall Saturdays: Gameday (dates in `calendar.json`).
  - Sunday: Piggy 2 sleeps till noon and Piggy 3 binges One Piece.
- **Seasons:**
  - Halloween: a spooky carillon remix.
  - Thanksgiving: the pigs go home and care pauses.
  - December: finals mode.
  - Spring: twice the petals.
- **Story calendar.** In Real Time mode, a story day is a real day. In **Free Time** mode you pick time slots on the map, and the day ends when you choose Sleep.
  - Chapters: **1 Preview** (days 1–2), **2 Midterms** (day 3+), **3 Gameday** (day 6+), **4 Finals** (day 9+).
  - Each pig gets at most one heart event per day.
  - **Missed-window mercy:** if an event misses its window two days running, it opens up to any time slot.
- **QA:** a `?now=2026-10-31T18:52` debug clock.
- **Launch week:** Sat 10/31 is Halloween, so the bats trio event can fire on the real night. DST ends Sun 11/1, so test the sunset math across the switch.

## 6. Campus map & who's where
There are **13 backgrounds**. Each is a single painting with procedural day, dusk and night tints:
- Sakura House
- Century Tower & the Legendary Sakura
- Plaza of the Americas
- Reitz Union
- Malachowsky Hall (across from the Reitz)
- Physics Building (Gale Lemerand & Museum Rd)
- Lake Alice Bat Houses
- Library West
- Marston Science Library
- HSC Communicore. Piggy 2 never jokes past the anatomy-lab doors: "Donors are our first teachers."
- Shands sim lab
- Southwest Rec
- Ben Hill Griffin Stadium (event only)

Map pins show cropped busts, plus a ♥ when an event is ready. Petal density scales with total bond, so the campus blooms as your friendships grow.

| Weekday | Piggy 1 | Piggy 2 | Piggy 3 |
|---|---|---|---|
| Dawn | SW Rec (Tu/Th/Sa), else asleep | Shands (lab-pig rounds, sim lab, call shifts) | Asleep |
| Morning | Malachowsky | Communicore | Asleep → Physics at 10:30 |
| Midday | Plaza | Communicore ("Lunch is a social construct.") | Physics, `coffee_break` |
| Afternoon | Malachowsky | Shands M/W/F, Communicore Tu/Th | Physics |
| Dusk | SW Rec M/W/F, Lake Alice jog Tu/Th | Communicore | Lake Alice |
| Night | Home until 22:30 | Library West → home at 22:00 | Marston |
| Owl | Asleep | Home, `write_chart` until 01:00 | Home, `typing` until 02:00 |

**Overrides**
- Friday midday: everyone at the Plaza.
- Gameday: the Swamp.
- Finals week, Night through Owl: Piggy 1 and Piggy 2 are at Library West, and Piggy 3 is at Marston.

When two pigs share a slot, an **Overheard** exchange plays: 2–4 bubbles from a pool of 60, with no repeats within a week.

## 7. Bond scale
Each pig has 0–100 bond, shown as 10 hearts.

| ♥ | Tier | Unlock |
|---|---|---|
| 1 | Classmate | Uses your name |
| 2 | Lunch Buddy | Lunch invites |
| 3 | Friend | Private DMs |
| 4 | Good Friend | A nickname for you, which you pick from three (Piggy 1: *Libero/Captain/Setter*; Piggy 2: *Intern/Resident/Partner*; Piggy 3: *Co-pilot/Beta Tester/{name}-san*) |
| 5–6 | Close → Best Friend | Night "real talk"; **Walk with me** works even when he's busy |
| 7 | Inseparable | Unique home idle |
| 8 | Sakura Bond | Ending eligible |
| 10 | Full Bloom | Gold petals |

- **Routine points** are capped at 12 per pig per day:
  - First greeting: +1.
  - Good chat exchange: +1 each, max 4.
  - Favorite topic: +1 each, max 2.
  - One gift: liked +2, loved +4, disliked −1.
  - Mini-game: +2.
  - Kempanion care: +1 each, max 3.
  - Visiting his day base: +1.
- **Heart events** give +3 to +10, with no cap.
- **Heart gates** (as in Persona): bond can't rise more than 9 points past the threshold of the next unseen event.
- **Gentle decay** applies only to your Kempanion, and only after 3 days without contact. It costs 1 point per day and never drops below the current heart. There are no bad endings and no lost hearts.
- **Pace:** about 2 weeks per route, and about 3 for all three.
- **Gift favorites:**
  - Piggy 1: knee-pad tape and oranges ("TEAM SNACK").
  - Piggy 2: a 1 L water bottle ("Hydration is perfusion."). Energy drinks get "Arrhythmia in a can."
  - Piggy 3: sakura-pink PLA filament and One Piece volumes. Comic Sans stickers get "…I'll keep it."

## 8. Heart events
- **Requirement:** event *n* needs (*n*−1)♥.
- **Chapter gates:** events 3–4 also need Ch.2, events 5–6 need Ch.3, and event 7 needs Ch.4.
- **Location:** events follow the pig's schedule unless marked as a special day.
- **Choices:** every option is positive. The answer that fits the pig's arc scores highest.
- **Replay:** seen events replay from the Memories album with all branches open and no bond change, so there's no reason to save-scum.

### Piggy 1: "Rally Route"
1. **MINE! MINE!** *(Plaza, intro)*
   - **Scene:** He chases a stray ball yelling "Mine!" (`run_right`) and `tumble`s into a sakura.
   - **Choices:**
     - *Bump it back* (+5): "You've got platform! You're on my team now."
     - *Catch it* (+3).
     - *Duck* (+2, `laugh`): "Valid. Self-preservation is a skill."
   - **CG:** "Petal Dive."
2. **Circular Rotation** *(Malachowsky, weekday afternoon)*
   - **Scene:** A circular-queue assignment has him pacing the whiteboard (`walk_left`, `confused`).
   - **Choices:**
     - *Draw it as a volleyball rotation* (+7, `celebrate`): "A rotation IS a circular buffer that sweats!"
     - *Ask Piggy 3* (+4; sets the Piggy 1×Piggy 3 flag).
     - *Snack break* (+4, `eat`).
   - **CG:** "The Whiteboard."
3. **Dawn Patrol** *(SW Rec, Dawn)*
   - **Scene:** 6:30 practice, and your first look at the uniform. "Platform: thumbs together, like a USB plug. No, the other way."
   - **Choices** (a tap-timing serve receive):
     - *Perfect* (+8, `volleyball_bump`): "LIBERO!!"
     - *Shank* (+5): his `volleyball_dig` saves it and the ball bonks his glasses.
   - **CG:** "Sunrise Serve," a jump-serve silhouette with Century Tower in the windows.
   - **Unlocks:** the uniform, the daily **Pepper** rhythm mini-game, and the fact `player_position`.
4. **Too Nerdy for the Team** *(Sakura House porch, Night)*
   - **Scene:** In the lab he's "the volleyball guy." At practice he's "the CS guy."
   - **Choices:**
     - *"You're both. That's your whole superpower."* (+8, [bashful_smile]).
     - *"Who said that? I'll fight them."* (+6, [laughing]): "Easy, libero."
     - *"Pick whatever makes you happy."* (+4).
   - **CG:** "Two Screens," him on `sit_down` on the porch steps, lit by laptop glow.
5. **Watch Me Spike** *(SW Rec, weekend afternoon, club tournament)*
   - **Scene:** He's [scared] before the first serve. Over three rallies you pick the right chant on the beat ("Free ball!", "Side out!", "LET'S GO ACE!").
   - **Outcome:** A win plays `volleyball_win`. A loss shows [sad], you say "Next rally," and he laughs. Either way, +8.
   - **CG:** "Kill Shot."
6. **Yours!** *(Plaza, weekday midday)*
   - **Scene:** His hackathon demo and practice land on the same afternoon. He tries to do both alone and `tumble`s down the Plaza steps.
   - **Choices:**
     - *"Let me set for you. I'll run the demo."* (+9).
     - *"Call Piggy 2 and Piggy 3."* (+6 to all three).
     - *"Drop one."* (+3).
   - **Payoff:** That evening he calls **"Yours!"** for the first time.
   - **CG:** "Yours!", a POV shot of the ball arcing toward the camera off his `volleyball_set`.
7. **2:47 AM** *(Library West, finals, Owl)*
   - **Scene:** He quizzes you on {{major|your classes}} with volleyball hand signals. "One finger behind the back is a quick set. For you it means B-tree." He nods off mid-signal (`sleep`).
   - **Choices:**
     - *Let him sleep* (+8).
     - *Wake him for one last review* (+6, `wake_up`): "Next rally."
   - **CG:** "2:47 AM."

### Piggy 2: "Perfusion Route"
1. **Pupils Equal, Round, Reactive** *(Reitz booth, intro, scrubs)*
   - **Scene:** `neuro_exam`. "Follow my hoof."
   - **Choices:**
     - *Follow it* (+3): "Cranial nerves intact. Based."
     - ***"Based."*** (+5): he says only `patriot`, which unlocks the *Call & Response* achievement.
     - *"Are you a doctor?"* (+2): "Yes. Fourth-year neurosurgery resident. Legally and spiritually."
   - **CG:** "Follow the Hoof."
2. **To Perfuse or Not to Perfuse** *(Communicore, weekday morning)*
   - **Scene:** He holds up a `brain_model` like Yorick's skull. "The circle of Willis: a roundabout for blood. Perfusion's entire personality."
   - **Choices:** a 3-question quiz, +2 per right answer. Every score ends on [proud].
   - **CG:** "Alas, Poor Willis."
   - **Unlocks:** daily **Neuro Trivia**.
3. **Scrub In: Sim Edition** *(Shands sim lab, Dawn/Morning)*
   - **Scene:** `scrub_up` → `preop_check` → `surgical_focus` as he practices a lumbar drain on an offscreen mannequin (research year means fewer OR days, so he keeps his skills up in the sim lab). "We drain a little CSF, pressure comes down, the brain says thank you."
   - **Choices** (hand him…):
     - *Sterile gloves* (+8).
     - *Your phone* (+2): "Contaminated. Based, but contaminated."
     - *A banana* (+4): "…Later."
   - **CG:** "Scrubbed In."
   - **Unlocks:** scrubs, a 20-second **Scrub Up** hand-wash rhythm game, and a "Monitor" KempaPager skin that shows stats as vitals (his HR reads 72).
4. **The Porcine Advantage** *(Communicore, Dusk)*
   - **Scene:** `review_mri` over pig scans. He explains why pigs are the model for spine surgery, CSF drainage and brain electrodes, then lights up about the lab pigs' enrichment schedule.
   - **Choices:**
     - *"Isn't that weird, as a pig?"* (+5): "It's an honor. Porcine solidarity."
     - *"Tell me about the microchips."* (+6).
     - *"Do they have names?"* (+8): "Professor Snout. Sir Lancelot. Patriot. He earned that name."
   - **CG:** "Light Box."
5. **Mildly Ischemic** *(Sakura House; triggers when his energy stat has been low for 2 days or he skipped Pig Pen Friday)*
   - **Scene:** He's `sick` and still heading for Shands. "I'm not sick. My perfusion is merely philosophical."
   - **Choices:**
     - *"Bed. Now."* (+8, `sleep`).
     - *Bring {{comfort_food|soup}}* (+7, `eat`): "Not hospital diet. …Based."
     - *Text the Pig Pen* (+5 to all): Piggy 1 brings oranges, and Piggy 3 builds a hydration timer.
   - **Afterward:** Half asleep, he admits he's scared of being ordinary.
   - **CG:** "Blanket Burrito."
   - **Unlocks:** he starts accepting bedtime nudges.
6. **Clinical Success** *(Communicore, Tu/Th afternoon)*
   - **Scene:** On a video call from the lab, Professor Snout walks after his spinal procedure. `clinical_success`, then [crying]: "Perfusion. Restored."
   - **Choices:**
     - *Hug* (+9, `love`).
     - *High hoof* (+7).
     - *"Based."* (+8): `patriot`, through tears.
   - **CG:** "He Walks." Piggy 2 is lit by the call window while a procedural EMG trace spikes. The pig is never drawn.
7. **Discharge Summary** *(Library West, finals, Night)*
   - **Scene:** His biggest grant application yet (research year; Professor Snout's walk is figure one) is due in finals week. He is already PI on a small grant and is always writing the next one, so there is always another deadline. Three days of `surgical_focus`. You bring food until he crashes, and you wake to a `write_chart` note: "Patient presents with chronic friendship. Prognosis: excellent. Plan: continue indefinitely."
   - **CG:** "Discharge Summary."

### Piggy 3: "Ship It Route"
1. **Okay, So I Was Thinking…** *(Reitz booth, intro, 9 min late)*
   - **Scene:** He brings your KempaPager and a 3D-printed name badge ("The paper ones looked sad."). "Basically the stock UI looked like a microwave clock, so I redid it."
   - **Choices:** an accent color that actually **themes the game's UI**.
     - *Sakura pink* (+6): "Obviously."
     - *Gator orange* (+4).
     - *Surprise me* (+5): lavender.
   - **CG:** "Name Badge."
2. **Best for What?** *(Physics, weekday afternoon, hoodie)*
   - **Scene:** `explain_code`. He's comparing two models for cleaning EEG artifacts: "Which is best?"
   - **Choices:**
     - *Fastest* (+5).
     - *Most accurate* (+5).
     - *"Whichever people will actually use."* (+8): "Okay— actually— yes. If it's ugly, nobody uses it."
   - **CG:** "Two Monitors."
   - **Unlocks:** the hoodie and HiPerGator chat topics.
3. **Print Queue** *(Marston, Night)*
   - **Scene:** A sakura-charm print turns into spaghetti (`debugging`), so you both take a `coffee_break`.
   - **Choices:**
     - *"Try again."* (+6).
     - *"The spaghetti one is perfect."* (+8, [shy]): "…You can have both."
   - **Result:** The charm now dangles from your KempaPager.
   - **CG:** "First Layer."
   - **Unlocks:** the **Debug** mini-game.
4. **Brainwaves at the Bat Houses** *(Lake Alice, 10–40 min after sunset)*
   - **Scene:** His DIY EEG headband plots his alpha waves while half a million bats pour out. "Calm brain, big alpha. Basically, bats are good for me." Then, quieter: "If I'm not building something, what am I for?"
   - **Choices:**
     - *"You're for you."* (+8).
     - *"You're my favorite builder."* (+6).
     - *"Show me your alpha waves again."* (+5, [laughing]).
   - **CG:** "Bat River."
5. **Invite to Code** *(Sakura House, Sunday)*
   - **Scene:** `invite_to_code`. You pair-program with his coding agent, and the feature you pick **ships into the game**.
   - **Choices** (+7 each):
     - *Bat Forecast:* tonight's emergence time on the map.
     - *Carillon Alarm:* a chime at 12:35 and 16:55.
     - *Piggy 2 Hydration Timer:* Piggy 2's thirst decays more slowly.
   - **CG:** "Pair Programming."
6. **It's Not Pretty Yet** *(Reitz, weekday afternoon)*
   - **Scene:** It's showcase day and he wants to pull his demo. Piggy 1 and Piggy 2 show up with a sign.
   - **Choices:**
     - *"Ship it."* (+9, `build_success`).
     - *"One more polish pass."* (+5): he's late, but it's gorgeous.
     - *"I'll present with you."* (+8).
   - **CG:** "Demo Day," with ゴゴゴ kana rising behind him (the JoJo menace effect).
7. **Long Job on HiPerGator** *(Marston, finals, Owl)*
   - **Scene:** While a job sits in the queue, he shows you a hidden KempaPager screen. It's a pixel sakura (procedural L-system) that grew a branch for every day you hung out. "I built it so I'd have a reason to check on you." [affectionate_blush]
   - **CG:** "Job Complete," with him asleep on the keys.

### Trio events
- **T1 · Pig Pen Friday** *(Plaza, Ch.2)*
  - **Scene:** A debate over the best study spot.
    - Piggy 1: "Club Marston, basement, maximum hype."
    - Piggy 2: "Communicore. The silence has excellent perfusion."
    - Piggy 3: "Best for *what*?"
  - **Payoff:** Your pick gets a permanent study bonus. A squirrel steals Piggy 1's banana (`angry`).
  - **CG:** "Lunch on the Lawn."
- **T2 · Bats & Boo** *(Lake Alice; the real Oct 31, or any Ch.2 dusk)*
  - **Scene:** Their costumes are their alt outfits.
    - Piggy 1: "I'm… an athlete." Piggy 3: "That's your Tuesday."
    - Piggy 2: "I'm a surgeon." Piggy 3: "You ARE a surgeon." Piggy 2: "Maximum authenticity. Based."
  - **CG:** "Costume Contest."
- **T3 · Gameday at the Swamp** *(fall Saturday, Ch.3; off-season it becomes the spring Orange & Blue Game)*
  - **Scene:** Tailgate → Mr. Two Bits → Gator Chomp (`dance`) → the arm-in-arm sway between the 3rd and 4th quarters.
  - **Piggy 2** makes everyone `drink` each quarter: "The heat index is a perfusion emergency."
  - **Choice:** pick who sits next to you (+4).
  - **CG:** "Swamp Sway."
- **T4 · The 3 AM Study Pact** *(Library West, Ch.4, Owl)*
  - **Scene:** Piggy 2 prescribes sleep. Piggy 3 builds a Pomodoro timer. Piggy 1 leads stretch breaks (`jump`). All three `sleep` at the table as dawn lights the windows.
  - **CG:** "Library West, Sunrise."

## 9. Pig-to-pig life
- **Piggy 1 ↔ Piggy 2: "Coach & Medic."**
  - Piggy 2 runs a `neuro_exam` after every Piggy 1 tumble: "Textbook lumbar extension. Zero ankle discipline."
  - Piggy 1 drags Piggy 2 to cardio: "Your perfusion needs reps."
- **Piggy 1 ↔ Piggy 3: "Anime & Apps."**
  - They argue *Haikyu!!* vs *One Piece*.
  - Piggy 3 gives Piggy 1's SideOut stats app a glow-up.
  - Piggy 1 on Piggy 3: "Best teammate who's never touched a ball. He touched one once. It went poorly."
- **Piggy 2 ↔ Piggy 3: "Brains & Builders."**
  - They build a pig-EEG viewer together.
  - Piggy 3 on Piggy 2: "He's basically a golden retriever with a scalpel. Metaphorically! Mostly."
- **The Pig Pen group chat** pings the KempaPager 2–3 times a day. Messages depend on the time and story flags:
  > **Piggy 1:** who stole my banana
  > **Piggy 2:** Squirrel. Based squirrel.
  > **Piggy 3:** okay so I was thinking we put a camera on the plaza and— actually no, that's a privacy thing
- **Kind gossip:** shareable facts travel between the pigs ("Piggy 1 says you like ramen?"). Anything you said with "don't tell" never does.

## 10. LLM chat × scripted story
**Three layers**
1. **Script:** canon, deterministic, offline.
2. **Heuristic chat:** always on.
   - A 6-button topic wheel: How are you? / Your thing / Campus / Food / Feelings / Ask about me.
   - Free text is matched to ~30 intents with regex and keywords.
   - 3–5 lines per intent, per pig, per tier, filled in with facts.
3. **LLM chat:** an optional WebGPU LFM model. It replaces only the line generator.

**Rules**
- **Intercepts run before either engine:**
  - Saying "based" (regex `\bbased\b`) to Piggy 2 returns exactly `patriot`, with [proud].
  - Saying it to Piggy 1 or Piggy 3 while Piggy 2 is at the same location gets the same reply from offscreen.
  - Medical questions get "I'm a pig doctor in a game, not your doctor. Student Health Care Center. Go, and call 911 if it's an emergency."
  - Distress keywords get a warm, scripted pointer to UF's Counseling & Wellness Center.
- **The LLM never writes state.**
  - The game scores chat bond itself (length, kindness, topic match; capped).
  - The model may only return a line with an emotion tag (`[happy]` → bust) and up to 2 proposed facts in a trailing JSON line. Those facts are checked against an allowlist of fact types.
- **Prompt (~450 tokens):**
  - A persona card: voice rules, 3 sample lines, and a *never* list (no romance, no politics, no real medical advice, no memories outside FACTS).
  - The top 8 facts.
  - A pre-written 2-sentence "story so far" for each seen event.
  - Place, time and the last 6 turns.
  - Replies are capped at 2 sentences.
- **Memory ledger (IndexedDB):**
  - Facts are stored as `{type, value, source, shareable, followUpAt}`, up to 40 per pig.
  - Regex extracts facts even without the LLM ("I'm from…", "I have an exam…").
  - Players can open **"What {Pig} knows about you"** and tap any fact to forget it.
- **Callbacks:** facts with a `followUpAt` date and one-line chat summaries feed the pigs' greetings. Piggy 3: "Hey— how'd the chem exam go? I was thinking about it. Not in a weird way."
- **Events use fact slots with fallbacks** (`{{comfort_food|soup}}`), so no scene needs a fact to exist. A tiny petal in the backlog marks lines that use a remembered fact.
- **Hooks:** when an event is ready, chat opens on its hook line ("Hey— actually, are you free right now?") with a ♥ button. Free chat never starts a scene by itself.

## 11. Endings: the Legend of the Century Sakura
> "If two people make a promise under the sakura by Century Tower while the carillon plays at dusk, the promise blooms forever." (Per the Kempa brochure: 1,853 trees, one for 1853, the year UF's story begins. Piggy 3 says the brochure UI is ugly.)

**Last Day of Classes**
- **Trigger:** unlocks after 3 days of Ch.4. You launch it from the KempaPager, so you decide when the semester ends.
- **Timing:** your pig texts "Century Tower. 4:55. Don't be late." The scene plays at the next 16:55 on any day, or right away in Free Time.
- **Eligibility:** pigs at 8♥ with all 7 events seen. If several qualify, you choose whom to walk toward; your Kempanion is pre-selected.

**Piggy 1: "Last Rally"**
- He's in uniform, holding a ball the club signed *Assists: {{name}}*.
- Toss, bump, set, and you spike into the petals.
- "Be my setter? Like… life's rotation. Mostly volleyball."
- *Mine.* / *Yours.* / *Ours.* each gets its own last line.
- **CG:** "Petal Spike," which mirrors "Petal Dive."

**Piggy 2: "Sakura Rounds"**
- He comes straight from Shands. "Follow my hoof." The hoof points up into the blossoms.
- "Diagnosis: best friend. Prognosis: chronic. Treatment: none indicated."
- Say *"Based."* and he answers `patriot`. A beat, then [affectionate_blush]: "Perfusion: excellent."
- **CG:** "Rx: Refills ∞."

**Piggy 3: "Commit Message"**
- The hidden sakura screen is in full bloom.
- "Okay, so I was thinking… actually, no. I wasn't thinking. I'm just really glad it was you."
- You write the commit message: free text, or *feat: best friend* / *fix: lonely* / *docs: us*. It becomes the last line of the credits.
- **CG:** "Full Bloom."

**True ending: "Hanami for Four"**
- Requires all three at 7♥ or higher, plus all trio events.
- A spring picnic under the tree.
- The toasts: "To the team!" / "To perfusion!" / "To… best for what? Best for us."
- Credits roll over a CG montage, scored with a carillon arrangement of the title theme.

**Friend ending: "See You Next Semester"** (default)
- Three `wave`s at the RTS bus stop.
- There are no bad endings.

**After the credits**
- The pet sim continues in "Spring Semester" free play.
- **NG+ "Sophomore Year"** keeps your facts and CGs, and every pig starts at 3♥.

## 12. UF flavor bank (`campus.json`)
- **Century Tower carillon:** 61 bells, with weekday sets around 12:35 and 16:55 during the semester. These drive the in-game bell breaks and the ending window.
- **Lake Alice bats:** UF estimates 450,000–500,000 Brazilian free-tailed bats.
  - They emerge about 15–20 minutes after sunset on warm, calm evenings, so the game should skip them on Dec–Jan cold-front days.
  - Piggy 2: "Half a million bats. Incredible cardiac output."
- **Gameday:** Mr. Two Bits, the Chomp, the sway, the heat, and a text cameo from Albert & Alberta.
- **Krishna Lunch:** rice, dal and the famous dressing on the lawn. Read §14 first.
- **Also:** Plaza squirrels, Gator Nights, "the Starship," HiPerGator, RTS buses.

## 13. Build plan (small team, ~5 days)
**Scene DSL.** A lightweight Ren'Py-style format, parsed client-side. It has 14 commands: `bg show hide anim say choice bond flag fact cg sfx bgm wait if`.

```
@event doc_1 loc=reitz slot=any req=intro
bg reitz tint=day
show doc outfit=scrubs anim=neuro_exam
doc: Follow my hoof.
doc[thinking]: ...Pupils equal, round, reactive.
choice
  "Follow the hoof."  -> bond doc +3 ; doc[proud]: Cranial nerves intact. Based.
  "Based."            -> bond doc +5 ; flag call_response ; doc: patriot
  "Are you a doctor?" -> bond doc +2 ; doc: Yes. Fourth-year neurosurgery resident. Legally and spiritually.
cg doc_follow_the_hoof
```

**CGs.** 29 JSON files. Each one specifies:
- A background and tint.
- Up to 3 sprites, each with a clip, a frozen frame, ×2/×3 nearest-neighbor scaling, and a flip.
- FX: petals, speed lines, glow, bats, kana, waveform, letterbox, caption.

**Layout**
- **Landscape:** a classic ADV on a 640×400 canvas, with the bust on the right.
- **Portrait:** the bust sits above the text box, and choices are full-width buttons.

**Script budget.** About 17k words in total; the heart events alone are 21 × ~300 words. That's roughly 3 writer-days, including a punch-up pass.

**Schedule**

| Day | Work |
|---|---|
| D1 | DSL, event triggers, debug clock |
| D2 | Intro and events 1–3 |
| D3 | Events 4–7 and trio events |
| D4 | Endings, memory, heuristic chat |
| D5 | LLM, plus a time-travel QA matrix (every event × every slot) |

## 14. Fact-check & sensitivity flags
- **Krishna Lunch: verify before shipping.**
  - Plaza service was suspended after a Feb 23, 2026 incident in which a Krishna Lunch vehicle struck a student.
  - WUFT (Aug 27, 2026) reports the group's adviser saying UF ended the on-campus arrangement.
  - Make the location a config value (`plaza | krishna_house | off`) and never reference the incident.
- **Carillon times and bat figures** come from UF pages. Keep them in `campus.json`.
- **"Based"/"patriot"** stays a verbal tic. It's never tied to politics, flags or public figures.
- **Lab pigs** are always shown well cared for. Procedures are never shown, and neither is the anatomy lab.
- **If the pigs are modeled on real people,** keep it affectionate. All bond is friendship, and a blush bust just means he's flustered by a compliment.

Sources: [ISKCON News](https://iskconnews.org/krishna-lunch-finds-new-ways-to-continue-serving-gainesville/) · [WUFT, Aug 27 2026](https://www.wuft.org/heard-on-wuft-fm/2026-08-27/uf-ends-contract-allowing-krisha-lunch-on-campus-groups-adviser-says) · [UF Arts: Carillon](https://arts.ufl.edu/event/carillon-recital/) · [UF Bat Houses](https://www.floridamuseum.ufl.edu/bats/visit) · [Malachowsky Hall](https://en.wikipedia.org/wiki/Malachowsky_Hall_for_Data_Science_%26_Information_Technology) · [UF Physics](https://people.clas.ufl.edu/dlaroc10/contact/)