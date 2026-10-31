> **Note for implementers:** this is an input proposal. `docs/GAME_DESIGN.md` is canonical and wins on any conflict. Placeholder nicknames from the proposal have been normalized to the canonical names **Piggy 1 / Piggy 2 / Piggy 3**. Currency is **acorns** (not Gator Bucks). Krishna Lunch is not used.

# Kempanion Online: Interface, UX & Game-Feel Design

*Kempa AI · proposal v0.1 · 2026-10-30 · angle: what the player sees, touches and hears*

## 0. Pillars

1. **The canvas draws the world, and HTML draws the words.** A 480×270 stage renders backgrounds, sprites, petals and effects, scaled with nearest-neighbor. Text boxes, buttons, inputs and menus are HTML elements laid over the stage and sized in stage units. Because text stays in HTML it stays sharp, and screen readers, zoom, phone keyboards and input methods all work normally.
2. **A Tamagotchi you can talk to.** The hub is a pocket device: 8 care icons styled like LCD segments, an attention light, and optional A/B/C buttons. TALK zooms the camera into a PC-98 style adventure-game (ADV) text window. One tap switches between the two views.
3. **Every input gets feedback.** Each input plays a sound and moves something by at least 1 px within 50 ms.
4. **The LLM is optional.** The Heuristic Brain (the built-in rule-based dialogue engine) is the default and supports the complete game. The in-browser LLM, called "Big Brain" in the UI, is an opt-in upgrade. Its download size is printed on its button, and the "no thanks" button is the same size.
5. **Kind by design.** No death, no guilt timers, no weight jokes. The worst outcome is a pig who is sad and wants a hug.

## 1. Cast: UI reference

The IDs `p1/p2/p3` are stable. Display names are working placeholders stored in `characters.json`.

| | **p1 · Piggy 1** | **p2 · Piggy 2** | **p3 · Piggy 3** |
|---|---|---|---|
| Epithet | The Rally Algorithm | The Perfusion Prodigy | The Midnight Piggy 3 |
| VN archetype | genki ace, team hype-man | confident senpai with a catchphrase gag | bashful builder who thinks out loud |
| Name plate / accent | Honey `#F2B33D` | Scrub `#8FB3C9` | Lavender `#B79CE0` |
| Home spot | Malachowsky Hall | Communicore / Shands | New Physics Building (NPB) |
| Alt outfit unlock | volleyball kit: first practice (Bond 2) | scrubs: "shadow day" (Bond 2) | black hoodie: first all-nighter build (Bond 2) |
| Calls the player | "teammate" | "intern" | your name, usually after "um—" |
| Awake | 7 a.m.–11 p.m. | 5 a.m.–9 p.m. (rounds) | 10 a.m.–2 a.m. (night owl) |
| Blip voice | bright square, D5 | nasal pulse, G3 | soft triangle, B4 |

**Piggy 1 (p1).** His personality wasn't in the brief, so it's designed here. Piggy 1 is a CS junior and the setter on the club volleyball team.
- **Outlook:** life is a rally: keep the ball off the floor and set up whoever's open.
- **Voice:** he mixes sports and Big-O in the same breath ("constant-time joy!").
- **Catchphrases:**
  - "Ball's up!" right before something happens
  - "Let's gooo!" when it works out
  - "Nice set!" when you make a good choice
  - "Shank, my bad!" when he messes up
- **Heart:** he only competes with himself and cheers your points louder than his own. Before exams he goes quiet and stress-bakes pancakes for the team.
- **In the volleyball kit:** `volleyball_set` doubles as "nice idea" and `volleyball_dig` as "I'll save this one."

**Piggy 2 (p2)** follows the brief. His surgery talk is always about healing ("relieve the pressure", "help a pig walk again"), never gore. His jargon is highlighted as glossary words (§4.7).

**Piggy 3 (p3)** follows the brief. He presents the Big Brain offer, because comparing tradeoffs is his love language.

## 2. Display & layout system

**Stage and scaling**
- The stage is a 480×270 logical Canvas 2D with `imageSmoothingEnabled = false`. Every draw position is rounded to a whole stage pixel.
- **Sharp scaling** works in two steps, the same trick emulators use:
  1. Upscale with nearest-neighbor to the smallest integer multiple at or above the target size, on an offscreen canvas.
  2. CSS shrinks that image to the exact size with smoothing.
- The result is crisp, evenly sized pixels at any window size. When an exact multiple fits (2× 960×540, 3× 1440×810, 4× 1920×1080), it's used directly. The "Integer only" setting letterboxes instead.
- The CSS variable `--u` holds how many CSS px one stage px is: 3 at 1440×810, 0.8125 on a 390-px-wide phone. W-layout overlays are positioned with `calc(N * var(--u))`, which keeps the HTML UI on the stage's pixel grid.
- Screen shake moves only the stage canvas, never the text box.

**Character art at half source size**
- Sprites go from 256 to 128 px, and portraits from 384×512 to 192×256.
  - On a 270-px stage, that makes a hub pig about a third of the screen height.
  - A waist-up portrait fills the stage height in dialogue, which is the classic ADV framing.
- **Day-1 check:** confirm the art's pixel grid survives a 2:1 nearest-neighbor downscale. If it doesn't, set `BASE = 960×540` and double every number in this doc.
- Atlases:
  - everyday clips: 42 × 6 = 252 frames, so **one 2048×2048 atlas per pig** (16×16 cells, 4 spare)
  - alt clips: 78 frames, 1280×1024
  - portraits: 960×1024 (5×4)
  - alt portraits: 768×768 (4×3)
  - Alt-outfit sheets load only when first needed.
- Clip rates:
  - idle/blink: 6 fps
  - walk: 10 fps
  - run: 12 fps
  - care and emotion clips: 8 fps (750 ms per loop)
  - impact clips (`volleyball_spike`, `clinical_success`, `build_success`): 12 fps, holding the last frame for 200 ms
- **No new character art.** Everything extra is derived from existing assets:
  - 32×32 face tokens are cropped from the `neutral` portraits at build time.
  - Silhouettes for locked entries are the sprites' alpha masks filled with Plum.
  - Emote bubbles are font glyphs (! ? ♥ ♪ …) in a 12×12 bubble.

**Layout modes**

| Mode | When | Shape |
|---|---|---|
| **W** Wide | aspect ≥ 1.25 and height ≥ 500 css px | The stage is letterboxed in the window. All UI overlays sit inside it, and the margins show a sakura wallpaper. |
| **T** Tall | aspect < 1.25 (phone portrait) | A "device shell", top to bottom: status bar, icon row, full-width stage (max 720 px), icon row, VN box, stats, thumb bar. |
| **S** Short | aspect ≥ 1.25 and height < 500 (phone landscape) | The stage fills the height. Side rails (≥ 64 px each) hold icons and buttons, and the VN box overlays the bottom of the stage. |

- **Safe areas:** `viewport-fit=cover`, with `env(safe-area-inset-*)` padding.
- **Chat input:** `interactive-widget=resizes-content` plus `visualViewport` listeners keep the input above the on-screen keyboard.
- **Touch targets:** at least 44×44 css px (48 preferred), with gaps of at least 8 px, under `(pointer: coarse)`. On touch screens, W-layout buttons grow from 12 to 16 stage px tall.
- **Thumb zone:** in T, primary actions sit in the bottom 40% of the screen.
- **Scrolling:** the page never scrolls. Only the backlog, the profile sheet and the settings lists scroll.
- **Overlays:**
  - W: a centered PC-98 window over the dimmed stage.
  - T: a full-screen sheet with a `[< Back]` bar.
  - S: a panel 90% of the screen height, with the rails hidden.

On a 390×844 phone, the T hub stacks to 690 px:

| Part | css px |
|---|---|
| Safe areas | 47 + 34 |
| Status bar | 36 |
| Icon rows | 2 × 52 |
| Stage | 219 |
| VN box | 150 |
| Stats | 44 |
| Thumb bar | 56 |

In dialogue, the icon rows and stats are replaced by a control row (48), chips (40) and the text input (52).

**Look**
- **PC-98 windows:**
  - corners cut at 45° by 2 px, never rounded
  - a 1 px Blossom outer line and a 1 px Plum inner line
  - Ink fill at 88% opacity
  - a 2×2 checkerboard dither band along the top 4 px
- **Name plates:** filled with the speaker's color, with a 1 px Ink outline and Ink text. The plate overlaps the text box by 2 px.
- **Selection:** a `▶` cursor plus inverted colors (Ink on Blossom). Color alone never shows selection.
- **Palette (16 colors):**
  - Ink `#1B1428` · Night `#2E2445` · Plum `#5B3A6E` · Grape `#7D4E9C`
  - Sakura-deep `#D9578C` · Sakura `#F49AC1` · Blossom `#FFD6E7` · Paper `#FFF6E9`
  - Cream `#F3E3C3` · Honey `#F2B33D` · Court-teal `#2FA39A` · Scrub `#8FB3C9`
  - Navy `#2C3E73` · Lavender `#B79CE0` · Leaf `#5FA35A` · Gator-orange `#F07F2C` (attention only)
  - Contrast: body text (Paper on Ink) is about 17:1, and Ink on any name plate is at least 7:1.
- **Type:** all fonts are SIL OFL, self-hosted as woff2 subsets.
  - **DotGothic16** for dialogue and menus. It includes kana for the decorative Japanese.
  - **Silkscreen** for tiny all-caps HUD labels.
  - **Atkinson Hyperlegible** as the readability option.
  - Sizes:
    - In W, size M is 10 stage px, which gives about 80 characters × 3 lines.
    - T and S use CSS px instead. M = 16 px, which is DotGothic16's native pixel grid, so it stays sharp. That gives about 44 characters × 4 lines in T.
    - A line holds at most 160 characters. Longer text splits into ▼ pages at sentence boundaries.
- **Backgrounds:** each UF location is one 480×270 painting plus a `bg.json`. The JSON holds:
  - `groundY`
  - `walkBand`
  - a standing mark for each pig
  - `canopies` (rectangles that spawn petals)
  - a 1-bit `windowsMask`
- **Time of day** is a multiply tint over the painting:
  - dawn: `#FFD7B5` at 20%
  - day: none
  - dusk: `#FF9E7A` at 25%
  - night: `#2E2445` at 55%, with the windows mask glowing Honey
  - That gives four looks from one painting. Stylized sakura trees are painted into every location.

## 3. Flow

```
Gate > Splash > Title --Continue-------------------------------> HUB <--> DIALOGUE
                  \--New Game > Name > Profile > Intro scene ---^
HUB  -> Map (travel) · Bag · Photo · Shop (at Reitz Union)
MENU (Esc): Resume · Save · Load · Bag · Map · Album · Settings · Title
```

## 4. Screens

How to read the wireframes:
- `(X)` is an unlit LCD icon.
- `[X]` is lit or selected.
- `v` is the ▼ indicator.
- `>` is the ▶ cursor.
- `*` is a petal.

### 4.1 Gate & splash

Browsers block audio until the player interacts, and the gate screen is that first interaction. It's inline CSS, so it appears in under 300 ms. The first key or tap starts audio by resuming the `AudioContext`.

```
+------------------------------------------------------------------+
|                                                                  |
|                        KEMPANION  ONLINE                         |
|                                                                  |
|                 >  PRESS ANY KEY  /  TAP  <        (blinks 1 Hz) |
|                                                                  |
|        [ Sound: ON ]            [ Reduce motion: follow system ] |
|        text blips are half the charm - sound on is recommended   |
+------------------------------------------------------------------+
```

**Splash** (2.8 s; any input skips it; from the 3rd launch on it's 1.2 s):
1. 0–0.4 s: black.
2. 0.4–1.2 s: the **KEMPA AI** wordmark fades in with a dither dissolve (4×4 Bayer pattern, 8 steps). It plays over the "Kempa chime": a C5–G5–C6 pulse arpeggio (80 ms per note) over a triangle C4, then a noise sparkle and a tiny synthesized *oink*.
3. 1.2–2.0 s: "presents" types out with system ticks while one petal drifts across.
4. A short hold, then a dither transition to the title.

```
+------------------------------------------------------------------+
|                                                                  |
|                         K E M P A   A I                          |
|                     :::::::::::::::::::::::   <- dither-in       |
|                            presents                              |
|                                                       *          |
|                                                                  |
+------------------------------------------------------------------+
```

### 4.2 Title

```
+------------------------------------------------------------------+
|  [katakana tagline]                    *      *        *         |
|  KEMPANION                       ___                *            |
|      ONLINE                     |   |  Century Tower,            |
|  ~Sakura Campus Days~           | o |  golden hour      [sakura] |
|                                 |   |                            |
|  > CONTINUE  Day 12 - Malachowsky Hall - 3:42 PM                 |
|    NEW GAME                     |   |        *                   |
|    LOAD           [sakura]      |   |    [sakura]                |
|    ALBUM                 ______________________________          |
|    SETTINGS               (Piggy 1)   (Piggy 2)   (Piggy 3)  <- sprites  |
|    CREDITS                 idle      idle     wave      on plaza |
|                                                                  |
| (c) 2026 Kempa AI - fan-made, not affiliated w/ UF   [HEUR] v0.1 |
+------------------------------------------------------------------+
```

```
T layout
+--------------------------------+
| [katakana]  KEMPANION ONLINE   |
|      ~Sakura Campus Days~      |
+--------------------------------+
|  16:9 stage: Century Tower,    |
|  petals, 3 pig sprites         |
|                                |
+--------------------------------+
|  [ CONTINUE  Day 12 - Malach.] |
|  [ NEW GAME                  ] |
|  [ LOAD      ] [ ALBUM       ] |
|  [ SETTINGS  ] [ CREDITS     ] |
|                                |
| (c) 2026 Kempa AI - fan-made   |
+--------------------------------+
```

- **Logo:**
  - "KEMPANION" with a small "ONLINE" beneath
  - the katakana ケンパニオン above it
  - the VN-style tilde subtitle "～Sakura Campus Days～"
- **Scene:** Century Tower at golden hour. The chibi sprites stand on the plaza, and every 6–10 s one of them plays a flavor clip (`wave`, `look_around`, `play_ball`, `yawn`, `laugh`).
- **Title call:** when the logo lands, all three pigs' blip voices sound together. Their base pitches (G3, B4, D5) form a G-major chord.
- **Menu:** ↑/↓ or mouse hover moves the ▶ cursor with a tick sound, and Enter plays a confirm chime.
  - CONTINUE previews the save's day, place and time.
  - NEW GAME on top of an existing save asks once: "Your current save stays in its slot until you overwrite it."
- **Footer:** "© 2026 Kempa AI · fan-made, not affiliated with or endorsed by the University of Florida". No UF logos or marks appear anywhere, only location names.
- **Attract mode:** after 30 s of no input, the camera pans across the plaza while the pigs wander. Any input returns to the menu.

### 4.3 Name entry

A single VN window asks "What should the piggies call you?" It has:
- a native text field (12 characters max) that ticks as you type
- `[Random]` (Alex, Sam, Jordan, Riley, Gator…) and `[OK]`

Piggy 1 reacts: "Nice name! Real team-captain energy."

### 4.4 Profile select

The header reads "WHO'S YOUR KEMPANION? You'll meet all three. Who shows you around first?" Your pick decides the intro scene and which pig guides the tutorial. It doesn't lock anyone out.

```
+------------------------------------------------------------------+
| WHO'S YOUR KEMPANION?   You'll meet all three. Who shows you     |
|                         around first?                            |
| +------------------+ +-----------------------------------------+ |
| |                  | | PIGGY 1            "The Rally Algorithm"  | |
| |    portrait      | | Birthday   Nov 11 (a binary birthday)   | |
| |    192 x 256     | | Blood      O                            | |
| |  neutral->happy  | | Height     130 cm                       | |
| |                  | | Major      Computer Science, 3rd year   | |
| |  bg: home spot,  | | Likes      clean rallies, pancakes      | |
| |  dimmed 40%      | | Dislikes   off-by-one errors, rain      | |
| |                  | | Spot       Malachowsky Hall atrium      | |
| |                  | | "Ball's up! ...Let's ship it."  [play]  | |
| +------------------+ +-----------------------------------------+ |
|  <  [*Piggy 1*]  [ Piggy 2 ]  [Piggy 3]  >          [ CHOOSE PIGGY 1 > ]   |
+------------------------------------------------------------------+
```

```
T layout
+--------------------------------+
| WHO'S YOUR KEMPANION?          |
+--------------------------------+
|  16:9 stage: home bg dimmed,   |
|  portrait centered             |
|  <  swipe to switch  >         |
+--------------------------------+
| PIGGY 1    "The Rally Algorithm" |
| Nov 11 - Blood O - 130 cm      |
| CS 3rd yr - volleyball setter  |
| + clean rallies, pancakes      |
| - off-by-one errors, rain      |
| @ Malachowsky Hall atrium      |
| "Ball's up! ...Let's ship it." |
+--------------------------------+
| [*Piggy 1*]  [ Piggy 2 ]  [ Piggy 3 ]  |
| [       CHOOSE PIGGY 1        ]  |
+--------------------------------+
```

| | Piggy 1 | Piggy 2 | Piggy 3 |
|---|---|---|---|
| Birthday | Nov 11 ("a binary birthday") | Jul 4 ("Patriot. Obviously.") | Nov 7 (Marie Curie's birthday too) |
| Blood type | O | A (porcine A–O system; he will explain) | AB (self-reported; Piggy 2 disputes this) |
| Height | 130 cm (standing reach: classified) | 124 cm (+3 cm of spikes) | 122 cm (123 on humid days) |
| Major / program | Computer Science, 3rd yr; club volleyball setter | MD; PGY-4 neurosurgery resident on his research year (College of Medicine / UF Health Shands) | Physics grad researcher (computational); builds EEG/ECG tools |
| Likes | clean rallies, pancakes, Python one-liners, sports drinks ("Gatorade was invented at UF!") | perfusion, spinal surgery, pig neuroanatomy, 5:30 a.m. rounds, the anthem at the Swamp | coding agents, open tools, model comparisons, HiPerGator, 3D printing, One Piece, JoJo, iced cafecito |
| Dislikes | off-by-one errors, net violations, rained-out practice | poor perfusion, unlabeled specimen tubes, "brain surgery isn't that hard" takes | closed file formats, prints failing at 97%, spoilers |
| Favorite spot | Malachowsky atrium; Southwest Rec court 3 | Communicore study nook | NPB printer corner; Marston at 2 a.m. |
| Quote | "Ball's up! …Let's ship it." | "Stay based. Stay perfused." | "Okay, so I was thinking… what if we just built it?" |

**When you focus a pig:**
- The old portrait slides 12 px left and dithers out while the new one slides in (200 ms). After 600 ms it changes from `neutral` to `happy`.
- His quote types out in his blip voice.
- His instrument layer joins the title music:
  - Piggy 1: bouncy pulse arpeggio
  - Piggy 2: "lub-dub" triangle bass
  - Piggy 3: swung lo-fi arpeggio

**When you choose a pig,** he plays his signature expression (Piggy 1 `excited`, Piggy 2 `proud`, Piggy 3 `bashful_smile`) with a bond chime. A sakura-petal wipe then leads into the intro.

**Controls:** ←/→ or 1–3 switches pigs, and Enter chooses. On touch, swipe or tap a tab.

### 4.5 Hub: pocket pet device meets VN stage

The stage acts as the device's LCD screen. As on the original toy, 8 care icons sit above and below it, drawn as **LCD segments**: unlit icons show at 20% opacity, and the selected one is lit and inverted. A 9th **attention icon** lights up when any need drops below 25%, and beeps twice each time that happens.

| Row | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Top | FEED (`eat`) | DRINK (`drink`) | PLAY (`play_ball`, `dance`, mini-game) | WASH (`bath`, `brush_teeth`) |
| Bottom | LIGHT (`sleep`/`wake_up`) | CARE (`sick` → tea → `happy`) | TALK (dialogue) | STATS (meters, bond, wardrobe) |

```
W layout
+------------------------------------------------------------------+
| Malachowsky Hall  Fri 3:42 PM (sun)    120 acorns  [HEUR] [MENU] |
| (FEED) (DRINK) (PLAY) (WASH)              [Piggy 1*] [Piggy 2] [Piggy 3] |
|                                                                  |
|  [sakura]        background: Malachowsky Hall          [sakura]  |
|     *                       .--.                     *           |
|          *                 ( !! )  <- emote bubble               |
|                          +--------+                              |
|                          | PIGGY 1  |  128 px sprite,              |
|                          | hungry |  clip: hungry                |
|                          +--------+                              |
| ................................................. ground line .. |
| (LIGHT) (CARE) [TALK] (STATS)                              ( ! ) |
| +--------------------------------------------------------------+ |
| | Piggy 1: Ball's up! ...oh wait, that's just my stomach.      v | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

```
T layout                           S layout (phone landscape)
+--------------------------------+ +-------+---------------------------+-------+
| Malachowsky - 3:42 PM  120 ac  | |(FEED) | Malachowsky 3:42  120 ac  |(LIGHT)|
| [Piggy 1*] [Piggy 2] [Piggy 3]  [HEUR] | |       |                    [HEUR] |       |
+--------------------------------+ |(DRINK)|  16:9 stage, full height  |(CARE) |
| (FEED) (DRINK) (PLAY) (WASH)   | |       |        +-----+   ( ! )    |       |
+--------------------------------+ |(PLAY) |        |PIGGY 1|            |[TALK] |
|                                | |       |        +-----+            |       |
|   16:9 stage, full width       | |(WASH) | +-----------------------+ |(STATS)|
|          +------+      ( ! )   | |       | | Piggy 1: Ball's up!   v | |       |
|          |PIGGY 1 |              | +-------+-+-----------------------+-+-------+
|          +------+              |
+--------------------------------+
| (LIGHT) (CARE) [TALK] (STATS)  |
+--------------------------------+
| PIGGY 1                          |
| Ball's up! ...oh wait, that's  |
| just my stomach.             v |
+--------------------------------+
| FULL oo..  DRINK ooo.  FUN oo..|
| CLEAN o... ENERGY oooo  BOND 3 |
+--------------------------------+
| [ MAP ]    [ BAG ]    [ MENU ] |
+--------------------------------+
```

**Classic controls** is a setting. It replaces the T thumb bar with three round device buttons, (A) (B) (C), for cycle, select and cancel. MAP, BAG and MENU then move to the status bar.

**Direct play.** Every gesture also has a button equivalent.
- **Tap the pig** to poke him. He plays `wave`, or `surprised` if he's busy.
- **Rub him** (3 or more direction changes within 1 s) to pet him: `pet_reaction` plus hearts.
- **Long-press him** for `shy` or `love`, depending on bond.
- **Drag food** from the quick bar onto him. The food arcs into his mouth over 400 ms.
- **Tap empty stage** to puff out 5 petals.

**Idle behavior** keeps the stage alive. Every 4–8 s a weighted random picker chooses a clip:

| Clip | Weight |
|---|---|
| `idle`, with a `blink` overlay every 3–6 s | 55% |
| `look_around` | 10% |
| `walk_left` / `walk_right` within the walk band | 15% |
| `sit_down` → `stand_up` | 10% |
| home specialty when in the alt outfit (Piggy 1 `volleyball_ready`, Piggy 2 `review_mri`, Piggy 3 `typing`) | 10% |

- When a need is low, its clip overrides the picker every 20 s: `hungry`, `thirsty`, `dirty`, `bored`, `yawn` or `sick`.
- A one-line ticker shows an ambient line every 20–40 s. Tapping it opens TALK.
- **Sleeping pigs:** the lights dim and his lines are whispered. Poking him plays `wake_up` → `yawn`, never `angry`.

**STATS** is an icon in W and S, and always visible in T:
- FULL, DRINK, ENERGY, CLEAN and FUN each show 4 pips plus a number.
- BOND is a 0–100 bar showing the next unlock ("Bond 2: volleyball kit").

**Kindness rules:**
- Needs drop in real time.
- While you're away, needs drop for at most 8 hours and never fall below 1 pip.
- A pig only gets `sick` after a need has been at zero for a full day, and tea cures it.
- Nobody dies or leaves.

**Switching pigs:**
- Face tabs show a red dot when that pig needs something.
- Switching travels to wherever he is right now, with a 320 ms dither dissolve.
- Use `[`/`]` on a keyboard, or swipe the stage in T.

**Outfits:**
- The wardrobe in STATS swaps outfits behind a 12-petal burst (250 ms), so the swap is never visible.
- If an action needs a clip the current outfit doesn't have, he swaps into the outfit that has it, plays the clip, and swaps back.
- Mini-games swap him into the alt outfit automatically.

### 4.6 Dialogue

**Entering.** TALK, or tapping the ticker, starts dialogue:
- The camera zooms in from 1.0× to 1.1× on the pig over 250 ms.
- The background dims 30%.
- The portrait rises 8 px while fading in (6 stepped frames).
- The text box opens in 4 steps (120 ms), and the name plate slides in from the left.
- Exiting reverses all of this.

**Two modes share the screen:**
- **Scripted:** each pig has one event per day, 6–12 lines long, with 1 choice.
- **Free chat:** a text input plus quick-reply chips.

```
W, scripted with a choice
+------------------------------------------------------------------+
|  bg dimmed 30%, camera pushed in 1.1x                            |
|              +--------------------------------------+            |
|              | 1  Bump it back!                     |            |
|              | 2  Duck!                             |            |
|              | 3  Is that ball O(n)?                |            |
|              +--------------------------------------+            |
|                        +---------------+                         |
|                        |   portrait    |                         |
|                        |   PIGGY 1       |                         |
|                        |   [excited]   |                         |
| +---------+            +---------------+ LOG AUTO SKIP HIDE MENU |
| |  PIGGY 1  |                                                      |
| +---------+----------------------------------------------------+ |
| | Ball's up! Wanna try a serve receive? I'll go easy.          | |
| | ...Probably.                                                 | |
| |                                                              | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

```
W, free chat
+------------------------------------------------------------------+
|                                                      [BIG] chip  |
|                        +---------------+     you: "based"  <echo |
|                        |   portrait    |                         |
|                        |   PIGGY 2         |                         |
|                        |   [proud]     |                         |
| +-------+              +---------------+ LOG AUTO SKIP HIDE MENU |
| |  PIGGY 2  |                                                        |
| +-------+------------------------------------------------------+ |
| | patriot                                                    v | |
| +--------------------------------------------------------------+ |
| ( based ) ( What's ischemia? ) ( Pig spines? ) ( Rounds? )       |
| [ Say something to Piggy 2...                            ] [ SEND ]  |
+------------------------------------------------------------------+
```

```
T, keyboard closed                 T, keyboard open
+--------------------------------+ +--------------------------------+
| < Back       PIGGY 2     [HEUR][=] | | < (face) PIGGY 2            [HEUR] |
+--------------------------------+ +--------------------------------+
|  16:9 stage                    | | PIGGY 2                            |
|        portrait [thinking]     | | Ischemia means a tissue isn't  |
|                                | | getting enough blood flow.     |
+--------------------------------+ | Perfusion fixes it.          v |
| PIGGY 2                            | +--------------------------------+
| Ischemia means a tissue isn't  | | (based) (Pig spines?) (Rounds?)|
| getting enough blood flow.     | | [Ask Piggy 2 anything...  ] [SEND] |
| Perfusion fixes it.          v | +--------------------------------+
+--------------------------------+ | ##### on-screen keyboard ##### |
| [LOG] [AUTO] [SKIP] [HIDE]     | | ############################## |
+--------------------------------+ +--------------------------------+
| (based) (Pig spines?) (Rounds?)|
| [Ask Piggy 2 anything...  ] [SEND] |
+--------------------------------+
```

```
S layout (rails on the right; with the keyboard open the stage hides and
only the last line + input remain, "chat strip" mode)
+----------------------------------------------------------+-------+
|  stage at full height, portrait centered                 | LOG   |
|                    +-----------+                         | AUTO  |
|                    | PIGGY 3     |                         | SKIP  |
|                    | [thinking]|                         | HIDE  |
| +-------+          +-----------+                         | MENU  |
| | PIGGY 3 |                                                |       |
| +-------+----------------------------------------------+ |       |
| | Okay, so I was thinking... what if the toothbrush    | |       |
| | logged its own data? Basically a tiny ECG.         v | |       |
+-+------------------------------------------------------+-+-------+
```

- **Typewriter:** text types out at the speaking pig's speed. Click, tap or Enter while it's typing completes the line. Pressing again advances.
- **▼ indicator** (in the speaker's color):
  - bobs 1 px at 2 Hz when the line is complete
  - becomes ▶▶ in auto mode
  - becomes an animated "…" while a brain is thinking
  - hides while choices are shown
- **Pauses:** comma 120 ms; period, ! and ? 250 ms; em-dash 180 ms; "…" 450 ms.
- **Expressions:** a tag like `[happy]` selects one of the 20 portraits (12 in the alt outfit). Unknown tags fall back to `neutral`.
- **Group scenes:** up to 3 portraits stand at x = 100/240/380. Anyone not speaking dims to 60% and sits 2 px lower.
- **Choices:**
  - 2–4 buttons, each 260×22 stage px, 6 px apart, numbered 1–4
  - they slide in from the right, each starting 60 ms after the previous one
  - the question stays visible in the text box
  - never timed
- **Buttons:** LOG · AUTO · SKIP · HIDE · MENU. In W they're a strip above the text box, in T they're in the thumb bar, and in S they're on the right rail. SKIP only skips lines you've already read, and always stops at choices.
- **Free chat:**
  - The input takes up to 140 characters and uses `enterkeyhint="send"`. Enter sends and Esc leaves the field.
  - Your message appears as a one-line echo bubble while he answers. The backlog logs it under a YOU plate.
  - With the Heuristic Brain, the placeholder suggests topics ("Try: practice, code, snacks…"). With Big Brain it reads "Say anything to Piggy 1…".
  - Each turn shows 3–4 quick-reply chips drawn from the Heuristic Brain's topic list, whichever brain is active. This doubles as a guide to what the Heuristic Brain understands.
- **Thinking:**
  - Heuristic replies wait 250–450 ms on the `thinking` portrait (0 ms at Instant text speed), so they don't feel robotic.
  - Big Brain streams its output straight into the typewriter.
  - If Big Brain produces nothing within 8 s, the Heuristic Brain answers instead. The backlog marks that line with a gear icon instead of the chip icon.

**The "based" rule** is fixed behavior that runs before either brain sees the message.
- **Trigger:** you're talking to Piggy 2 and your message matches `/\bbased\b(?!\s+(on|upon|off|in)\b)/i`. The second half of the regex stops phrases like "based on the data" from triggering it; loosen it if you want.
- **Reply:** exactly `patriot`, nothing else.
- **Delivery:** the text appears instantly, with one low G3+C4 blip, the `proud` portrait and a 1 px nod.
- **Extras:**
  - The first time it happens, it unlocks the album memory "Based Department".
  - After Piggy 2 first says "based" himself, a `based` chip is added to his quick replies.

### 4.7 Backlog & glossary

**Opening the backlog:** L, PageUp, mouse wheel up, or swiping up on the text box. It opens a full-height log of the last 200 lines; older lines load from IndexedDB as you scroll.

**Each entry shows:**
- the speaker's name in his color, and the line
- a ♪ button that replays the line's blips, identically every time
- a chip or gear icon showing which brain wrote it

**Closing it:** Esc, or swipe down.

**Glossary words** appear in the speaker's color with a dotted underline:
- Piggy 2: ischemia, perfusion, CSF, laminectomy, electrode
- Piggy 3: EEG, ECG, HiPerGator, slicer, WebGPU
- Piggy 1: dig, set, pancake, libero

Tapping or focusing a word shows a one-line card:
- "**ischemia**: a tissue isn't getting enough blood flow. (Piggy 2: 'The enemy.')"
- "**perfusion**: blood flow delivering oxygen. (Piggy 2: 'Everything.')"

It works like Piggy 1 Attorney's highlighted red text, but the words become collectibles in Album → Glossary.

### 4.8 Big Brain: the optional in-browser LLM

**States:** `unsupported · available · downloading n% · preparing · warming · ready · error · off`. The status-bar chip shows these as grey HEUR, an amber-striped percentage, or pink BIG.

**When it's offered.** It never downloads on its own and never comes up on first launch. It's offered in three places:
1. After your 3rd free-chat exchange, Piggy 3 shows a small card in the text box: "Psst… want us to chat about *anything*? [Tell me more] [Not now]". It appears at most once every 3 days and has a "Don't ask again" option.
2. Settings → Brain.
3. Tapping the status-bar chip.

```
+------------------------------------------------------------------+
| +--------------------------------------------------------------+ |
| | OPTIONAL: BIG BRAIN (on-device AI)                       [x] | |
| | +--------+ PIGGY 3: "Okay, so I was thinking... a small        | |
| | |portrait| language model can run right in your browser.     | |
| | |bashful | Basically, we could chat about anything. Best for | |
| | | smile  | what, though? Tradeoffs below!"                   | |
| | +--------+                                                   | |
| |  ( ) Tiny      LFM2-350M   ~250 MB   fastest, phones OK      | |
| |  (o) Small     LFM2-700M   ~500 MB   best balance (laptops)  | |
| |  ( ) Standard  LFM2-1.2B   ~800 MB   best replies, newer GPU | |
| |                                                              | |
| |  - One-time download from Hugging Face, then cached here.    | |
| |  - Runs on your GPU (WebGPU). What you type stays on-device. | |
| |  - Needs ~520 MB free. You have ~14 acorns.                      | |
| |  - Phones may get warm. Wi-Fi recommended.                   | |
| |  - Remove anytime: Settings > Brain.                         | |
| |                                                              | |
| |  [  Download 512 MB  ]        [ Keep the Heuristic Brain ]   | |
| |  What's the Heuristic Brain?                                 | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

- **Default model selection:**
  - a phone, or `deviceMemory` < 6 → Tiny
  - a desktop whose GPU supports `shader-f16` → Small
  - Standard is never selected by default
- **Sizes:** read from the model's file list (a HEAD request per file for its Content-Length), never hardcoded. The wireframe shows approximate 4-bit LFM2 sizes. Newer LFM releases can be added to the same picker.
- **Storage:** free space comes from `navigator.storage.estimate()`. After install, `navigator.storage.persist()` asks the browser not to delete the cached model.
- **Equal choice:** both buttons are the same size and weight. "What's the Heuristic Brain?" explains: "Built in, instant, offline. Each piggy knows a few hundred topics and phrases. Nothing to download."
- **Mobile data:** if `navigator.connection` reports `saveData` or a cellular connection, the dialog adds "Looks like you're on mobile data. Maybe wait for Wi-Fi?" It warns but doesn't block.

```
+------------------------------------------------------------------+
| BIG BRAIN - installing (Small, LFM2-700M)               [_]  [x] |
| [##########..........]  52%   266 / 512 MB   6.1 MB/s   ~40 s    |
| [x] WebGPU check  [>] Download  [ ] Prepare shaders  [ ] Warm-up |
| PIGGY 2: "Installing the chip. Perfusion looks great."               |
| [ Keep playing (minimize) ]                  [ Cancel download ] |
+------------------------------------------------------------------+
```

- **Runtime:** the model runs in a module Web Worker using Transformers.js on ONNX Runtime Web with `device: 'webgpu'`. It uses `q4f16` weights when the GPU supports `shader-f16`, and `q4` otherwise.
- **During install:**
  - The game stays playable, and the panel can be minimized into the status-bar chip.
  - The panel shows a 20-block bar, megabytes downloaded, speed, time remaining, and four phases that check off as they finish.
  - Cancel keeps any files that finished downloading (each file is cached separately), so resuming is quick.
  - The pigs comment in the ticker while it runs.
  - When it's ready, a chime plays and a toast says "Big Brain ready. Try asking Piggy 3 anything." Piggy 3 plays `celebrate` (or `build_success` in his hoodie).
- **Every failure falls back to the Heuristic Brain:**
  - **No WebGPU:** "Your browser can't run Big Brain yet (it needs WebGPU: recent Chrome/Edge, or Safari 26+). The Heuristic Brain works great and needs no download." The dialog offers [Chat with the Heuristic Brain] and an expandable Details section.
  - **Low storage:** shows the space needed vs. available, and offers Tiny.
  - **An error, or the GPU disconnects (`device.lost`) mid-game:** a toast says "Big Brain took a nap. Using the Heuristic Brain." Retry is in Settings.
- **Output rules** (checked again after generation):
  - Short replies are one line of at most 160 characters. Normal replies are at most 4 sentences, split into ▼ pages.
  - Every reply starts with an allowed expression tag.
  - Replies stay PG.
  - A rule layer wraps both brains: the based rule, a name guard, and gentle in-character deflections ("Let's keep it wholesome, teammate!").

### 4.9 Loading states

| Situation | What the player sees |
|---|---|
| First paint | an inline-CSS screen under 2 KB: "KEMPANION ONLINE" and a 3-dot pixel loader |
| Boot assets | The gate is already interactive, and the splash covers the rest of the load. |
| Any load over 150 ms | Bottom-right "Now Loading…" with a 64 px pig on `walk_right`. Loads under 150 ms show nothing, so it never flickers. |
| Travel | the 600 ms walk scene (§4.10); likely next locations load ahead of time while idle |
| Brain thinking | `thinking` portrait, animated "…", no blips |
| Big Brain install | the progress panel, or the percentage on the chip |
| Saving | a sakura icon spins top-right for 600 ms, then a "Saved" toast |

### 4.10 Campus map

The map is a stylized, not-to-scale, top-down 480×270 illustration. Century Tower, the Plaza and the stadium are to the north; Shands and Southwest Rec are to the south. Each location is a 12×12 pin. Face tokens show where each pig is right now, and a sun/moon dial shows the time of day.

```
+------------------------------------------------------------------+
| CAMPUS MAP (stylized)                      Fri 3:42 PM (sun) [x] |
|         Marston #   Century Tower #              Stadium [lock]  |
|      Turlington #   Plaza of the Americas #                      |
|                                                                  |
|  Lake Alice #  ~~~~      Reitz Union # (shop)                    |
|   (bats at dusk) ~~~~                                            |
|                          NPB Physics # [Piggy 3]  Malachowsky #    |
|                                                   [Piggy 1]        |
|  Southwest Rec #                          Communicore/Shands #   |
|                                                     [Piggy 2]        |
| +---------------------------------+  # = location pin            |
| | NPB Physics                     |  [Name] = pig is here now    |
| | Piggy 3 is here: debugging, the   |  sakura groves everywhere    |
| | 3D printer is humming.   [ GO ] |                              |
| +---------------------------------+                              |
+------------------------------------------------------------------+
```

```
T layout (the list is also the screen-reader path)
+--------------------------------+
| CAMPUS MAP     3:42 PM    [x]  |
+--------------------------------+
|  16:9 map, pins + pig faces    |
|  (pinch for 2x)                |
+--------------------------------+
| > NPB Physics       Piggy 3   GO |
|   Malachowsky Hall  Piggy 1   GO |
|   Communicore       Piggy 2     GO |
|   Plaza of the Americas     GO |
|   Reitz Union (shop)        GO |
|   Lake Alice (bats at dusk) GO |
|   Century Tower             GO |
|   Southwest Rec             GO |
|   Stadium  [lock: Piggy 2 bond 3]  |
+--------------------------------+
```

**Locations.** The 8 backgrounds needed for launch are in bold:
- **Malachowsky Hall**, **Communicore/Shands** and **NPB**: the three home spots
- **Plaza of the Americas**: picnics and group scenes
- **Reitz Union**: the shop
- **Lake Alice**: bats at dusk
- **Century Tower**: the title screen; its bells chime on the real hour
- **Southwest Rec**: the volleyball mini-game
- Later, if time allows: Marston, the Turlington "Potato" photo spot, and the stadium (Saturday events; locked until Piggy 2 reaches bond 3)

**Schedules** decide where the face tokens appear. For example, Piggy 1 is at Southwest Rec 4–6 p.m., Piggy 2 is at Shands until noon, and Piggy 3 is at Marston 8 p.m.–2 a.m.

**Travel:**
- Pick a pin, then press GO.
- A 600 ms strip shows the pig on `walk_right` with footstep ticks, then a sakura wipe reveals the location. With reduced motion, it's a 200 ms crossfade instead.
- The map's music is "Campus Stroll".

### 4.11 Bag & shop

```
+------------------------------------------------------------------+
| UNION MARKET - Reitz Union     cashier today: Piggy 1   120 acorns |
| [FOOD] [DRINKS] [CARE] [GIFTS]                                   |
| +-----------------------------+ +------------------------------+ |
| |  (i) Acorn bun           5  | |        [ icon 2x ]           | |
| |> (i) Pancake stack      12  | | PANCAKE STACK         12 ac  | |
| |  (i) Brain jello        10  | | "A pancake is also a dig     | |
| |  (i) Cuban sandwich     15  | |  save. Delicious AND legal." | |
| |  (i) Key lime pie       14  | | FULL +2      Loved by: ?     | |
| |                             | | Qty [-] 1 [+]  [ BUY 12 ac ] | |
| +-----------------------------+ +------------------------------+ |
| PIGGY 1: "Pancakes?! You're my favorite customer. Don't tell Piggy 2." |
+------------------------------------------------------------------+
```

```
T layout: Bag
+--------------------------------+
| BAG                 120 ac [x] |
| [Food][Drink][Care][Gift][Keep]|
+--------------------------------+
| [bun x3] [pancake x1] [jello 2]|
| [tea x1] [ empty  ]  [ empty  ]|
+--------------------------------+
| BRAIN JELLO  x2                |
| FULL +1  FUN +2                |
| Loved by: Piggy 2 (discovered)     |
| [  GIVE TO PIGGY 2  ] [ OTHER v ]  |
+--------------------------------+
```

**The currency is acorns.** UF's live oaks drop plenty, and pigs love them. You earn them from:
- your daily visit: +20
- care actions: +1 each, up to 15 per day
- mini-games: 5–30
- events

The shop counter is painted into the Reitz Union background, and each day one of the pigs works it as a part-time cashier (`idle`/`wave`). That means the shopkeeper needs no new art. The "Loved by" field shows "?" until you discover the answer.

| Item | Price | Effect | Loved by |
|---|---|---|---|
| Acorn bun | 5 | FULL +1 | everyone |
| Pancake stack | 12 | FULL +2 | Piggy 1 |
| Cuban sandwich | 15 | FULL +3 | Piggy 2 |
| Brain-shaped jello | 10 | FULL +1, FUN +2 | Piggy 2 ("Anatomically generous. Based.") |
| Key lime pie | 14 | FULL +2, BOND +1 | everyone |
| "Swamp Juice" sports drink | 6 | DRINK +2 | Piggy 1 |
| Iced cafecito | 7 | ENERGY +2, plays `coffee_break` | Piggy 3 |
| Bubble bath / sakura toothpaste | 10 / 6 | CLEAN +3 / +1 | — |
| Ginger tea | 12 | cures `sick` | — |
| Teal knee pads | 40 | BOND +5 | Piggy 1 |
| Pocket brain model | 40 | BOND +5, plays `brain_model` | Piggy 2 |
| Sakura-pink PLA filament | 40 | BOND +5, plays `build_success` | Piggy 3 |
| Straw hat / star-spangled pin | 30 | BOND +3 | Piggy 3 / Piggy 2 ("patriot.") |

### 4.12 Settings

```
+------------------------------------------------------------------+
| SETTINGS                                                    [x]  |
| [TEXT] [SOUND] [DISPLAY] [BRAIN] [ACCESS] [DATA]                 |
| ---------------------------------------------------------------- |
| Text speed     [ slow | >NORMAL< | fast | instant ]              |
|                preview: "Ball's up!" in Piggy 1's voice            |
| Auto delay     [======|------] 1.5 s (+25 ms per character)      |
| Skip           [ >read text only< | everything ]                 |
| Text box       [=========|---] 88% opacity                       |
| Font           [ >PIXEL< | hyperlegible ]   Size [ S >M< L XL ]  |
| ---------------------------------------------------------------- |
| [ Restore defaults ]                     changes apply instantly |
+------------------------------------------------------------------+
```

Defaults are in bold.

**Text**
- **Speed:** slow ×0.5 / **normal** / fast ×1.75 / instant. It scales each pig's base speed.
- **Auto delay:** **1.5 s** plus 25 ms per character, adjustable from 0.5–4 s.
- **Skip:** **read only** / all.
- **Box opacity:** 50–100%, default **88%**.
- **Font:** **pixel** / hyperlegible.
- **Size:** S / **M** / L / XL.

**Sound**
- **Volumes:** master **80**, music **60**, SFX **70**, voice blips **70**.
- **Blip style:** **chiptune** / soft sine / off.
- **Attention beeps:** **on**.
- **Mute when the tab is in the background:** **on**.
- **Haptics:** **on**.

**Display**
- **Filter:** **Crisp** / Scanlines / PC-98 CRT / Pocket LCD.
- **Scaling:** **sharp fit** / integer only.
- **FPS:** **60** / 30.
- **Petals:** lots (default in W) / some (default in T and S) / off.
- **Shake:** **on**.
- Fullscreen.

**Brain**
- **Brain:** **Heuristic** / Big.
- **Model:** Tiny / Small / Standard, with download sizes.
- **Reply length:** **short** / normal.
- **Creativity:** calm 0.5 / **playful 0.8**.
- Clear chat memory.
- Remove model (shows how much space it frees).

**Access**
- **Reduce motion:** **follow system**.
- Screen-reader mode.
- Sound captions.
- High-contrast text box.
- **Skip/auto:** **toggle** / hold.
- Gentle mode: no sickness, and needs stay frozen while you're away.

**Data**
- Save slots, export/import, and storage used.
- Reset all takes two steps: you type `oink` to confirm.

**Filters:**
- **Scanlines:** a CSS gradient overlay with lines 1 stage px apart, at 18% Ink. It covers the stage only, unless "Filter text too" is on.
- **PC-98 CRT:** an optional WebGL effect with scanlines, an RGB phosphor mask, 0.5 px bloom and 2% barrel curvature. Off by default on phones.
- **Pocket LCD:** a 1 px pixel grid plus a 25% `#C8D3B0` multiply tint. This is the Tamagotchi look, and it suits the hub.

### 4.13 Save, continue & welcome back

- **Autosave** runs on every scene change, every 60 s in the hub, and whenever the tab is hidden or closed (`visibilitychange` and `pagehide`). Mobile browsers can kill a tab without warning.
- **Slots:** Auto, Quick (Q), and 3 manual. Each holds the save JSON (under 64 KB) plus a 120×68 thumbnail.
- **Moving devices:** export or import a `.kempanion.json` file.
- **Where data lives:** settings in localStorage; saves, chat memory and thumbnails in IndexedDB.
- **GitHub Pages gotcha:** every project site on `<user>.github.io` shares one origin, so they all share one localStorage.
  - Prefix every key with `kempanion/v1/`.
  - Name the IndexedDB database `kempanion`.
  - Never call `localStorage.clear()`.

```
+------------------------------------------------------------------+
| LOAD                                                        [x]  |
| +----------+ AUTO    Fri Oct 30, 3:42 PM - Day 12                |
| |  thumb   |         Malachowsky Hall - bond: S3  D2  C4         |
| +----------+                                                     |
| +----------+ QUICK   Fri Oct 30, 1:10 PM - Day 12                |
| |  thumb   |         NPB Physics                                 |
| +----------+                                                     |
| +----------+ SLOT 1  Thu Oct 29, 11:02 PM - Day 11               |
| |  thumb   |         Lake Alice (bats!)                          |
| +----------+                                                     |
|  SLOT 2  - empty -        SLOT 3  - empty -                      |
| [ Export save (.json) ]   [ Import save ]                        |
+------------------------------------------------------------------+
```

If you've been away for more than 2 hours, a **welcome-back letter** (a Cream-colored paper window) opens before the hub. Each pig reports what he did, in his own voice:

```
+------------------------------------------------------------------+
|   +----------------------------------------------------------+   |
|   | While you were away (5 h 12 m)...                        |   |
|   |                                                          |   |
|   | PIGGY 1  practiced jump serves.     FUN +1   FULL -2       |   |
|   |        "You missed a SICK rally. I'll reenact it!"       |   |
|   | PIGGY 2    finished rounds.           ENERGY -2              |   |
|   |        "Vitals stable. Mood: based."                     |   |
|   | PIGGY 3  printed something.         KEEPSAKE +1            |   |
|   |        "Okay, so... it's a tiny acorn. For you. Um."     |   |
|   |                                          [ Let's go! ]   |   |
|   +----------------------------------------------------------+   |
+------------------------------------------------------------------+
```

### 4.14 Album

```
+------------------------------------------------------------------+
| ALBUM  [MEMORIES 7/24] [FACES 31/96] [MOVES 40/165] [MUSIC 6/12] |
| +-----------+  +-----------+  +-----------+  +-----------+       |
| |  polaroid |  |  polaroid |  | silhouette|  | silhouette|       |
| |  Piggy 1's  |  | Piggy 2+Piggy 3 |  |    ???    |  |    ???    |       |
| |  1st spike|  | Plaza pic |  |           |  |           |       |
| +-----------+  +-----------+  +-----------+  +-----------+       |
| +-----------+  +-----------+  +-----------+  +-----------+       |
| |  polaroid |  |  "Based   |  | silhouette|  | silhouette|       |
| |  bats at  |  |  Dept."   |  |    ???    |  |    ???    |       |
| |  dusk     |  |           |  |           |  |           |       |
| +-----------+  +-----------+  +-----------+  +-----------+       |
|  < page 1/3 >     [GLOSSARY 12/40]               [ VIEW ]        |
+------------------------------------------------------------------+
```

- **Tabs:**
  - Memories
  - Faces: 96 entries (3 pigs × 32 portraits: 20 everyday + 12 alt)
  - Moves: 165 entries (3 pigs × 55 clips: 42 everyday + 13 alt)
  - Glossary
  - Music
- **Memories are scene descriptions, not images.** Each one is stored as `{bg, timeOfDay, pigs:[{id, clip, frame, x, y}], caption, date}` and redrawn live inside a polaroid frame, so no illustrated event art (CGs) is needed.
  - Story events create memories.
  - **Photo mode** (P, or the camera button) also creates them:
    - A camera viewfinder overlay appears.
    - The pig strikes a pose that depends on bond (`proud`, `happy`, `wave`, `love`).
    - A shutter sound plays with a soft white fade, never a hard flash.
  - The album holds up to 60 memories.
- **Faces and Moves** double as a sprite viewer for fans, with play/pause, 0.5×/1×/2× speed and frame-by-frame stepping.
- **Music Room** lists every track you've heard and includes a blip-voice tester.

### 4.15 Credits

```
+------------------------------------------------------------------+
|                        KEMPANION ONLINE                          |
|                       a Kempa AI production                      |
|                                                                  |
|                Design, code, pixels ..... Kempa AI               |
|                Music ............ procedural chiptune            |
|                Fonts ...... DotGothic16, Silkscreen,             |
|                             Atkinson Hyperlegible (OFL)          |
|                Big Brain ...... Liquid AI LFM2 via               |
|                             Transformers.js + ONNX Runtime Web   |
|                       (scrolls up 20 px/s)                       |
|      *          *               *              *                 |
|   PIGGY 1 >>           PIGGY 2 >>            PIGGY 3 >>   (walk_right)   |
+------------------------------------------------------------------+
```

- **Scroll:** the text rolls over a dusk silhouette of campus with falling petals. Each pig stops once along the way to `wave`.
- **End card:** all three wave and each says a sign-off line, followed by "Thank you for playing! (Kempa AI)". Esc or a tap jumps straight to the end card.
- **Screen-reader copy:** the same credits list is available as plain HTML in Settings → About.
- **Must include:**
  - the UF non-affiliation line
  - the font licenses
  - Transformers.js (Apache-2.0) and ONNX Runtime Web (MIT)
  - Check the LFM license terms for this kind of use.

## 5. Input

On a keyboard, Z/X/C act as the device's A/B/C buttons, in the same left-to-right order. Single-letter shortcuts are disabled while a text field has focus.

| Key | Action |
|---|---|
| Enter · Space · X · left click | OK / advance / finish line (device B) |
| Esc · C · right click | back / cancel / MENU (device C) |
| Z · ← → | next care icon or choice (device A) |
| ↑ ↓ | move cursor |
| 1–4 | pick choice |
| Tab / Shift+Tab | move focus (always works) |
| L · PageUp · wheel up | backlog |
| A / S (or hold Ctrl) | auto / skip read text |
| H · Delete | hide UI |
| T · / | focus chat input |
| [ · ] | previous / next pig |
| M · B · P | map · bag · photo |
| Q · F | quick save · fullscreen |
| ? · F1 | shortcut overlay |

| Touch gesture | Where | Action |
|---|---|---|
| Tap | text box / stage | finish the line, then advance |
| Tap · rub · long-press | pig | poke · pet · shy/love |
| Long-press 500 ms | text box | hide UI while held |
| Swipe up / down | text box / backlog | open / close backlog |
| Swipe left / right | hub stage (T) | switch pig |
| Drag | quick-bar item → pig | give or feed |
| Pinch | map (T) | 1× / 2× |

**Gamepad** (standard layout):
- A: OK. B: back.
- D-pad: move the cursor.
- LB/RB: switch pigs.
- Y: open the log. X: toggle auto.
- Start: open the menu.

**Vibration** uses `navigator.vibrate`, which iOS ignores:
- 10 ms on confirm
- 25 ms on a spike
- two 15 ms pulses on attention

## 6. Juice

| Effect | Spec (stage px) | Trigger | Reduced motion |
|---|---|---|---|
| Talk bob | Portrait rises on each word's first letter and drops back after 70 ms. Piggy 1 moves 2 px, Piggy 2 and Piggy 3 1 px. | typing | off |
| Breathing | y = round(sin(2πt / 2.4 s)) | idle dialogue | off |
| Expression pop | scale 1.00 → 1.04 → 1.00 in 3 stepped frames, 100 ms | portrait change | instant swap |
| Surprise hop | up 6 px (80 ms) and back (120 ms), plus a "!" bubble | `surprised` | bubble only |
| Anger shake | x ±2 at 25 Hz for 200 ms, plus an anger-vein glyph | `angry` | glyph only |
| Scared tremble | x ±1 at random, 30 Hz, 400 ms | `scared` | off |
| Hearts | 3 ♥ glyphs rise 16 px over 700 ms, with a 12% pink vignette | `love`, pet, `affectionate_blush` | static for 500 ms |
| Screen shake | Offset = 4 px × trauma², with trauma decaying 1.6 per second. Spike adds 0.6, surprise 0.25. Moves the stage only. | events | 2 px Sakura border flash |
| Hit-stop | 60 ms freeze | spike contact, bond level-up | kept |
| Number pop | "+2 FULL" rises 12 px over 600 ms. Pips fill one at a time, 60 ms apart, each with a tick. | stat change | no rise |
| Panels / choices / cursor | Panels open in 4 steps over 120 ms. Choices slide in 8 px, each 60 ms after the last. The ▶ cursor nudges 2 px at 3 Hz. | UI | instant, static |

"Trauma" is a 0–1 shake intensity: events add to it and it fades over time.

**Sakura petals** are drawn in code: a 3×3 or 4×3 px Sakura-colored body with a Blossom highlight and 4 flip frames. Petals in front of the characters are larger, 5×4 px.
- **Count:**
  - W: 28 (20 behind the pigs, 8 in front)
  - T and S: 16
  - battery saver: 8
  - reduced motion: off, or 4 slow ones
- **Spawn:** from the background's canopy rectangles.
- **Motion:**
  - fall speed: 10–22 px/s
  - sideways drift: ±6 px/s
  - sway: x += A·sin(ωt + φ), with A = 4–10 px and ω = 1.6–3.2 rad/s
  - frame flip: every 150–300 ms
- **Gusts:** every 25–45 s, the wind ramps up to +35 px/s over 1.2 s and dies down over 2 s, with a faint whoosh at −24 dB.
- **Landing:** up to 12 petals settle on the ground line and fade out over 2 s.
- **Night:** petals are tinted 60% toward Night.

| Transition | Spec | Used for |
|---|---|---|
| Dither dissolve | 4×4 Bayer pattern, 16 steps, 320 ms | pig switch, splash, scene changes |
| Sakura wipe | 140 big petals sweep across (350 ms), the scene swaps while they cover it, then they blow away (350 ms) | title → game, arriving at a location |
| Blinds | 9 horizontal bars, 30 px each; 200 ms close, 200 ms open | Album, Settings, Save |
| Iris | a circle closes in on the pig over 300 ms | lights off, end of day |
| Push-in | zoom 1.0× → 1.1× over 250 ms with a 30% dim | hub → dialogue |
| Crossfade | 200 ms | replaces every transition above under reduced motion |

## 7. Audio

**Engine:**
- Music uses 4 voices modeled on an old sound chip: two pulse waves (12.5/25/50% duty cycle), a triangle wave and noise.
- Text blips and sound effects each get their own mixer channel.
- A scheduler runs every 25 ms and queues notes 100 ms ahead.
- All channels feed a compressor (`DynamicsCompressor`).
- Music drops 6 dB while text is typing (50 ms fade down, 400 ms recovery).

**Songs** are small tracker-style pattern files in JSON.
- Three are written by hand: title, hub and credits.
- Each location's version is generated from these by changing tempo, mode and instrumentation. The location's ID seeds the generator, so the same location always gets the same version.
- Mood variants transform whatever is playing:
  - sick or sad: minor key, 20% slower
  - night: a triangle-only lullaby an octave higher, 30% slower

| Where | Track | BPM | Key / mode | Feel |
|---|---|---|---|---|
| Splash | Kempa Chime | — | C | arpeggio, then *oink* |
| Title, profile | Sakura Campus Days | 92 | D major, yo-scale melody | 3 pig layers on profile |
| Malachowsky | Ball's Up! | 132 | A major | syncopated pulse lead |
| Southwest Rec | Rally Point | 140 | E major | driving noise drums |
| Communicore / Shands | Rounds at Dawn | 96 | F Lydian | calm pads, lub-dub kick |
| NPB, Marston | Thinking Aloud | 84 swing | G Mixolydian | lo-fi, noise crackle |
| Plaza | Picnic on the Plaza | 110 | C major | bouncy |
| Lake Alice | Bat Hour | 72 | A Dorian | sparse, dusk |
| Century Tower | Carillon | 80 | B♭ major | bell-like pulse; chimes on the real hour |
| Map / Shop | Campus Stroll / Union Market | 116 / 120 | F / G major | walking bass / bossa |
| Album / Credits | music-box title / full title, all layers | 80 / 92 | D | — |

| SFX | Where | Recipe |
|---|---|---|
| tick / confirm / cancel | cursor / OK / back | square 1046 Hz 25 ms / 25% pulse C6→G6 / G5→C5 |
| buzz | invalid action | 12.5% pulse 110 Hz, 120 ms, 30 Hz vibrato |
| open / close | panels | noise sweep 2→6 kHz over 90 ms (reversed to close) |
| coin | buy, earn | square B5→E6 |
| beep-beep | attention | square 2093 Hz, two 60 ms beeps with an 80 ms gap |
| crunch / gulp | `eat` (frames 2 and 5) / `drink` | band-passed noise at 1.2 kHz / triangle glide 600→300 Hz |
| bubbles / scrub | `bath` / `brush_teeth` | sine blips 800–1600 Hz at 8/s / noise at 4 kHz pulsing at 6 Hz |
| snore / wake | `sleep` / `wake_up` | triangle 90 Hz plus noise on a 1.2 s cycle / arpeggio C5-E5-G5-C6 |
| wobble / sparkle | `sick` / heal, unlocks | detuned squares at 220/226 Hz / rising arpeggio plus shimmer |
| heart / bond-up | pet, `love` / bond level | sine C6+E6 with tremolo / 4-note fanfare plus hit-stop |
| thump / smack / whistle | bump-set / spike / rally start | triangle 80 Hz / same plus a noise burst and shake / 2.5 kHz with vibrato |
| clack · shutter · save | `typing`/`debugging` · photo · save | noise clicks 8/s · noise click · sine G5→D6 |
| oink | splash, rare pet reaction | noise through a 500 Hz band-pass (Q 6) with a 25 Hz pitch wobble, two 140 ms grunts |

**Text-blip voices** work like Piggy 1 Attorney's talking blips. Blips skip spaces and punctuation, and the backlog's ♪ button replays them identically.

| | Piggy 1 | Piggy 2 | Piggy 3 | System |
|---|---|---|---|---|
| Timbre | 50% square: bright | 12.5% pulse plus a triangle an octave lower at 30%: nasal, deep | triangle with an 8 ms attack: soft | sine tick |
| Base pitch | D5, 587 Hz | G3, 196 Hz | B4, 494 Hz | 1200 Hz |
| Variation | random major-pentatonic notes within ±2 semitones: bouncy | ±0.5 semitone: steady | ±1 semitone plus a slow 0.3 Hz drift: wandering | none |
| Blip length / frequency | 30 ms, every 2nd letter | 45 ms, every 3rd | 35 ms, every 2nd | 10 ms, every 4th, −12 dB |
| Speed at Normal | 45 characters/s | 35 characters/s | 32 characters/s | 60 characters/s |
| ! and ? | "!" jumps 3 semitones; "?" raises the last blip 2 | "!" jumps 2 semitones and 3 dB louder; "?" stays flat (he's sure) | "?" rises 4 semitones; "…" pauses 450 ms | — |
| Signature | "Let's gooo": each extra o plays a semitone higher | `patriot`: one G3+C4 two-note blip, instant text | "Actually—": a 180 ms pause, then the rest of the line 1 semitone higher | — |

The three base pitches form a G-major chord, used for the title call and lines all three say together. Whispered lines (when a pig is asleep or it's late at night) are 9 dB quieter and pass through a 1.2 kHz low-pass filter.

## 8. Voice sheet

| Moment | Piggy 1 | Piggy 2 | Piggy 3 |
|---|---|---|---|
| Morning hello | "Morning, teammate! Two commits and fifty jump serves already. Your serve!" | "Morning, intern. Rounds at 5:30, coffee at 5:31. Based." | "Oh! Hi. Okay, so I was thinking… what if a toothbrush logged its own data? Like a tiny ECG, but for brushing." |
| Hungry | "Ball's up! …Oh wait. That's just my stomach." | "Glucose low. I'd call this pre-hangry ischemia. Not a real diagnosis. Feed me anyway." | "Actually— I forgot to eat. Again. The build finished, though!" |
| Dirty | "I dove for one ball. Then another one. I'm mostly floor now." | "Unsterile. Unacceptable. Bath. Now." | "There's PLA dust in my curls. Basically I'm a 3D print now." |
| Petted | "Hehe— okay, perfect set. Ten out of ten form!" | "…Fine. That was based. Again. For science." | "Oh— um. Hi. That's… really nice, actually." |
| Sick | "Benched… can you sub in and bring tea?" | "Mild fever. I'm fine. I'm a doctor. (Doctors make terrible patients.) Bring tea." | "I think my immune system is stuck in the HiPerGator queue." |
| Loved gift | "Teal knee pads?! Constant-time joy! O(1)!" | "A pocket brain model. Look at those gyri. Patriot." | "Sakura-pink filament?! Okay, I'm printing you something. Right now." |
| Heuristic miss | "Whoa, that one went over the net! Try practice, code, or snacks." | "History unclear. Again, slower. With symptoms." | "Hmm, my heuristic brain didn't parse that. Basically it knows a few hundred things. Try 'what are you building?'" |
| Big Brain loading | "Loading bar at 40%! That's, like, two sets." | "Installing the chip. Perfusion looks great." | "Okay, it's compiling shaders… basically teaching your GPU to talk pig." |
| Goodbye | "Good rally today. Same time tomorrow?" | "Hydrate. Sleep. Doctor's orders. Stay based." | "Okay, I'll— yeah. Bye! Wait, actually— see you tomorrow?" |

**Piggy 2 on his research** (kept PG and always about healing):
- "Pig spines are a great model for human spinal surgery. Same blueprint, more snout."
- "Today we practiced draining extra cerebrospinal fluid. Relieve the pressure, restore the perfusion. Beautiful."
- "Someday a tiny brain chip helps a pig walk again. Then a person. That's the dream."

**Piggy 3 on tradeoffs.** If you ask "What's the best AI model?", he switches to `[thinking]` and says: "Best for what, though? Fastest, smallest download, or smartest? Basically there's no best, just tradeoffs."

**A sample scene,** as it would appear in the choice UI from §4.6:

```
PIGGY 1 [excited]  Ball's up! Wanna try a serve receive? I'll go easy. ...Probably.
 1 "Bump it back!"      -> PIGGY 1 [happy]     "NICE! Perfect platform!"       BOND +2, shake 0.2
 2 "Duck!"              -> PIGGY 1 [laughing]  "Valid strategy. Zero points."  FUN +1
 3 "Is that ball O(n)?" -> PIGGY 1 [proud]     "Only if n is my vertical."     BOND +1
YOU  based
PIGGY 2  patriot
```

## 9. Accessibility

- **Screen-reader announcements:** each line is written once, as a whole, to an `aria-live="polite"` region. The typewriter's letter-by-letter spans are `aria-hidden`, so screen readers don't read every letter. The backlog is `role="log"`.
- **Canvas:** the stage canvas is `role="img"`. Its label is a short scene summary, updated at most every few seconds ("Malachowsky Hall, afternoon. Piggy 1 is sitting; he looks hungry.").
- **Screen-reader mode:**
  - instant text and no blips
  - expression changes announced in brackets ("[Piggy 3 looks shy]")
  - care icons announce the need ("Feed. Piggy 1 is hungry, 1 of 4.")
- **Keyboard:** everything can be reached by keyboard. The focus ring is a 2 px dashed Honey outline with an Ink halo, visible on any background.
- **Contrast and cues:**
  - All text meets at least 4.5:1 contrast; body text is about 17:1.
  - Meters use pips plus numbers, and selection uses ▶ plus inverted colors, so color is never the only cue.
- **Motion and flashing:**
  - Reduced motion follows the system's `prefers-reduced-motion` setting (§6).
  - Nothing flashes more than 3 times a second.
  - The photo "flash" is a soft fade.
- **Sound captions:** "[beep-beep]", "[crunch]", "[oink]". The attention alert is always visual too: the icon blinks and the pig's tab gets a dot.
- **Text:** sizes S–XL, a Hyperlegible font option, and text-box opacity up to 100%.
- **Timing and input:**
  - no timed choices
  - skip and auto can be toggles, so nothing has to be held down
  - auto-advance makes one-button play possible
  - touch targets are at least 44 px
  - every gesture has a button equivalent
- **Markup:** `lang="en"`. The decorative katakana is `aria-hidden`.
- **Gentle mode** is for players who find needs timers stressful.

## 10. Build notes & a 5-day plan

- **Stack:**
  - TypeScript + Vite, built to a static `dist/` folder and served on GitHub Pages (`base: '/kempanion/'`).
  - Canvas 2D for the stage, Web Audio for sound.
  - Transformers.js runs in a worker and only loads after the player agrees to the download.
  - A service worker caches the game for offline play.
  - No backend, no accounts, no analytics.
- **Performance targets:**
  - core JavaScript at most 150 KB gzipped
  - playable within 2 s on 4G
  - 60 fps on a mid-range phone with up to 40 sprites and 30 particles
  - battery saver mode: 30 fps and fewer petals
  - the game loop pauses when the tab is hidden (`visibilitychange`)
- **Assets:**
  - Atlases are compressed with pngquant/oxipng.
  - One 16×16 UI sheet holds the 8 care icons, the attention icon and about 20 item icons.

| Day | What ships |
|---|---|
| 1 | Stage and sharp scaler; W/T/S layouts; atlases and the clip player; the hub at Malachowsky with 8 icons and needs |
| 2 | Dialogue (text box, typewriter, blips, portraits, choices, backlog, chips); the Heuristic Brain and the based rule; 3 daily events |
| 3 | Map, 8 backgrounds and travel; bag and shop; saves, autosave and export; the welcome-back letter |
| 4 | Audio engine with music and SFX; juice (petals, shake, transitions); gate, splash, title, name entry and profile |
| 5 | Big Brain (consent, progress, worker, fallbacks); settings; accessibility pass; album and credits; phone testing on iOS Safari and Android Chrome in both orientations |

**Cut first if time runs out:**
- Music Room
- attract mode
- photo mode
- the CRT shader (keep the CSS scanlines)
- gamepad support
- the extra locations

**Launch-week events** (no new art):
- Halloween night (Oct 31): a deeper night tint, a pumpkin bun in the shop, and a spooky version of each location's music built on diminished chords.
- Piggy 1's birthday event on 11/11, 12 days after launch.

## 11. Open questions

1. Does the art still look right after a 2:1 nearest-neighbor downscale? If not, switch to the 960×540 base.
2. Which non-specialty clips and which 12 portraits do the alt outfits include? The outfit-swap fallback assumes they use the same names as the everyday set.
3. Are Piggy 1, Piggy 2 and Piggy 3 the final names? Either way, changing them means editing one JSON field.
4. Confirm the LFM license terms and the final quantized file sizes before shipping the consent dialog text.