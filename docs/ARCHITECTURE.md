# Kempanion Online — Architecture & Module Contracts

Static, client-only web game: **Vite 8 + Svelte 5 (runes) + TypeScript 6**, packages via **Bun**,
audio synth in **Rust → WebAssembly (AudioWorklet)**, optional local LLM via **transformers.js 4 on WebGPU**
(WASM fallback). Deployed to GitHub Pages with relative base `./`.

> Svelte 5 **runes only**: `$state`, `$derived`, `$effect`, `$props`, `{#snippet}`, `onclick={...}`.
> Never use Svelte 4 syntax (`export let`, `$:`, `on:click`, stores-with-`$` auto-subscribe for new code).

## 1. Layout & ownership

```
index.html, vite.config.ts, svelte.config.js, tsconfig.json   (integrator)
characters/piggy-{1,2,3}.md        human-editable personality files (source of truth for voice)
docs/                              this file, GAME_DESIGN.md
scripts/
  sync-sprites.ts                  sprite pack → public/assets/sprites (pixelated) + src/generated/sprites.json
  bake-backgrounds.ts              art-src/bg/*.png → public/assets/bg/*.png (480x270, quantized)
  build-synth.ts                   cargo → public/assets/audio/kempa_synth.wasm
synth/                             Rust crate (cdylib, wasm32-unknown-unknown, no wasm-bindgen)
public/
  assets/bg/<id>.png               480x270 backgrounds (+ <id>_night.png variants)
  assets/cg/<id>.png               480x270 event CGs
  assets/sprites/...               pixelated atlases
  assets/audio/kempa_synth.wasm
  manifest.webmanifest, icons/, sw.js
src/
  main.ts, App.svelte              boot + screen router            (integrator / UI)
  styles/global.css                design tokens & pixel classes   (integrator; read-only for others)
  lib/types.ts                     shared contracts                (integrator; READ-ONLY for everyone else)
  lib/state/                       game store, save/load, nav      (UI agent)
  lib/engine/                      canvas renderer, sprites, particles, transitions, time-of-day (renderer agent)
  lib/vn/                          KScript parser + runner, dialogue controller (VN agent)
  lib/audio/                       engine, worklet, MML compiler, instruments, sfx, voices (audio agent)
  lib/audio/songs/                 one file per song (composer agent)
  lib/ai/                          LLM worker/client, model manager, prompts, emotion, quirks, memory (AI agent)
  lib/ai/heuristic/                deterministic chat brain + response banks (heuristic agent)
  lib/pet/                         simulation, items, shop, achievements (pet agent)
  lib/minigames/                   3 mini-games (pet agent)
  lib/content/                     characters/profiles, locations, schedule, icons (content owners noted inline)
  lib/content/scenes/*.ks          KScript story scenes (story agents)
  lib/ui/                          screens + components (UI agent)
  generated/                       machine-written JSON (sprites.json)
tests/                             bun test suites
```

Agents only write inside the directories they own. Shared contracts live in `src/lib/types.ts`.
If a module needs a new shared type, define it locally and export it from that module.

## 2. Screen flow

```
splash (Kempa AI sting) → title ─┬─ New Game → scene:prologue → name entry → scene:meet → select → hub
                                 ├─ Continue → hub (with "welcome back" summary of time away)
                                 ├─ Profiles  (VN profile cards)
                                 ├─ Extras    (album / music room / achievements)
                                 ├─ Settings
                                 └─ Credits
hub ⇄ talk (VN free chat) ⇄ map → location → (talk | scene | minigame | shop)
```

`ScreenId = 'splash'|'title'|'newgame'|'select'|'hub'|'talk'|'map'|'location'|'shop'|'bag'|'profiles'|'extras'|'settings'|'credits'|'minigame'|'scene'`

## 3. Rendering

- One `<canvas>` stage with a **logical height of 270 px**; logical width = `clamp(150, round(270 * aspect), 480)`
  where `aspect` is the stage box's CSS aspect ratio. The logical frame is upscaled by an integer factor with
  nearest-neighbor, then CSS-fitted to its box (even, crisp pixels at any size; `--u` = CSS px per stage px). Backgrounds are 480x270 and drawn 1:1, horizontally cropped around a per-location
  `focusX` so portrait phones still see the important part.
- Layers (back→front): background → time-of-day grade → back particles (stars, bats, rain far) →
  full-body actors (hub) → VN portraits → front particles (sakura petals, rain near, zzz, hearts) →
  CG layer → fade/flash/shake. All UI is DOM over the canvas.
- Time of day from the **player's real local clock**: morning 05–10, day 10–17, evening 17–20, night 20–05.
  Outdoor backgrounds have `<id>.png` (day) and `<id>_night.png`; morning/evening are color-graded blends.
- Sprites are pre-pixelated at **0.5×** by `scripts/sync-sprites.ts`: animation frames 128×128 (pivot 64,114),
  portraits 192×256, alpha thresholded, color-quantized. `src/generated/sprites.json` describes atlases.
- Juice: talking portraits bob 1 px on a 2-frame step while text types; enter/exit slides of 8–16 px with fades;
  screen shake on surprise; heart particles on bond gains; petals everywhere (disabled by reduceMotion).

## 4. VN engine — KScript (`src/lib/content/scenes/*.ks`)

A small line-based language. One file may contain many scenes.

```
# comment
=== p2_h1                                  ← scene id (unique, [a-z0-9_]; heart events MUST be p<N>_h<n>)
title: Perfusion Is Everything             ← metadata lines until '---'
pig: piggy-2
trigger: location=communicore; time=day,morning; bond>=2; seen!=p2_h1
priority: 50
cg: cg_p2_lab                               ← album id unlocked when the scene finishes (optional)
---
[bg communicore fade]                       ← background (+ optional transition: fade|cut|wipe|iris)
[bgm piggy2_theme]                          ← song id; [bgm stop] to fade out
[show piggy-2@scrubs neutral center]        ← portrait: pig[@outfit] expression position(left|center|right)
[hide piggy-2]
[sfx oink]
[wait 400]                                  ← ms
[shake] [flash] [petals heavy|normal|off] [weather rain|clear]
[cg cg_p2_lab]   [cg off]                   ← full-screen event picture
piggy-2 happy: Hey, {player}! You found the Communicore. Based.
piggy-2: (expression omitted → keeps the current one)
narrator: The hallway smells faintly of formaldehyde and coffee.
player: Hi! (shows the player's name plate)
? Based.                                    ← choice option; block below is indented (2 spaces)
  [bond piggy-2 +3]
  piggy-2 proud: Patriot.
? What is this place?
  piggy-2 excited: The College of Medicine! Lecture halls downstairs, anatomy lab upstairs.
[if bond(piggy-2) >= 5]                     ← conditions: bond(pig) cmp n | flag(name) | !flag(name) | money>=n | item(id)>=n | time=day | companion=piggy-2
  piggy-2 shy_blush: You keep coming back here...
[else]
  piggy-2: Anyway.
[endif]
[set met_p2]  [set p2_mood = 3]  [unset met_p2]
[bond piggy-2 +5]  [money +20]  [give tender_sub 1]  [take tender_sub 1]  [need piggy-2 fun +10]
*label_name                                 ← label
[goto label_name]
[chat piggy-2 "Ask him anything about the lab!"]   ← hands control to free chat, then returns
[minigame volley]                           ← runs a mini-game (volley|perfusion|debug|petals), then continues
[outfit piggy-2 scrubs]                     ← switch a pig's outfit for portraits in this scene (and unlock it)
[name]                                      ← player name entry (UI hook)
[input comfort_food "Comfort food?"]        ← free text stored as memory fact key=value (UI hook = dialogue.ask)
[companion pick]                            ← the choose-your-Kempanion cards (UI hook)
[petals heavy] [weather rain] [time evening] ← ambience overrides for this scene
[end]
```

- `{player}` `{companion}` `{time}` interpolate. Text may contain `\n` for a manual break.
- Metadata keys: `title`, `pig`, `heart` (heart-event number 1–7 for that pig), `chapter` (min chapter; defaults from heart:
  1–2→1, 3–4→2, 5–6→3, 7→4), `trio: true`, `ending: true`, `trigger`, `priority` (default 10; heart events 50, trio 40),
  `cg` (album id unlocked on finish), `repeat: true` (may replay), `replayable: false` (hide from album).
- Trigger keys (`;`-separated, all must hold): `location=` (comma list of LocationId and/or `hub` = the KempaPager screen),
  `time=` (morning,day,evening,night), `slot=` (dawn,morning,midday,afternoon,dusk,night,owl), `weekday=` (mon..sun),
  `hearts>=N` (alias `bond>=N`; hearts of the scene's `pig`), `seen=id` / `seen!=id`, `flag=name` / `!flag=name`,
  `companion=pig`, `present=pig` (that pig is at the location now), `chance=0..1`, `month=10,11`, `date=10-31`.
  Heart events additionally require hearts ≥ heart−1, the chapter, and that heart event heart−1 was seen.
  Scenes are offered when the player arrives at a location or opens the hub; highest `priority` among eligible wins;
  a scene plays at most once unless `repeat: true`. A scene with no `trigger` only runs when called by id.
- Parser: `parseKScript(src, file) → Scene[]`, throws `KScriptError` with file:line on bad syntax.
  `bun test` parses every `.ks` file and validates ids, speakers, expressions, songs, sfx, backgrounds, locations.

## 5. Audio

- `AudioEngine` (`src/lib/audio/engine.ts`), created on first user gesture:
  `init()`, `playSong(id, {fadeMs})`, `stopSong(fadeMs)`, `jingle(id)` (plays over ducked BGM),
  `sfx(id)`, `blip(voice)`, `setVolumes(master,bgm,sfx,voice)`, `suspend()/resume()` on visibilitychange.
- Synth: Rust crate `synth/` compiled to `wasm32-unknown-unknown` (no wasm-bindgen), loaded into an
  `AudioWorkletProcessor` (raw bytes posted from main thread, instantiated inside the worklet).
  Waveforms: pulse (duty 12.5/25/50/75), triangle, saw, sine, LFSR noise (long + periodic), 2-op FM.
  Per voice ADSR, pitch envelope (slides/drums), vibrato; per channel volume/pan/one-pole lowpass/echo send;
  master stereo echo + soft clip. Song tracks are polyphonic up to 4 voices (chords).
- Songs are written in **MML** inside TS files: `export default { id, title, bpm, loop, tracks: [{inst, vol, pan, mml}] }`.

```
o4 c          octave (middle C = o4 c = MIDI 60); < > octave down/up
l8            default length (1 2 4 8 16 32 64, triplets 3 6 12 24 48), dots allowed: l8.
c d e f g a b note, then accidentals + # - , then optional length and dots: f+8. b-4
r  r8         rest
^8            tie: extend previous note/rest by a length
'ceg'2        chord (up to 4 notes; < > allowed inside quotes)
v0..v15       volume       @inst  instrument     p-50..p50 pan      q1..q8 gate (eighths; default 7)
y0..y15       vibrato depth      t120 tempo (first track only)
[ ... ]3      repeat (nestable)   L  loop point    |  bar line (ignored)    ; comment to end of line
```
  Drum instrument `@drums` maps notes: c=kick d=snare e=closed hat f=open hat g=clap a=low tom b=high tom.
  The compiler (`compileSong`) returns per-track lengths; tests require all tracks to have equal length.
- SFX are tiny MML snippets on reserved SFX channels; text blips are per-voice instrument + pitch + jitter.

## 6. AI dialogue

- `Brain` interface: `respond(req: ChatRequest, onToken?, signal?) → Promise<ChatReply>`.
  `heuristicBrain` (always available, deterministic for a given input+state) and `llmBrain` (when loaded).
- Pipeline for every player message: **quirk layer** (hard-coded responses, e.g. Piggy 2: "based" → "Patriot.")
  → brain → **post-filter** (strip AI-isms, enforce ≤3 sentences, keep PG) → **expression** (LLM tag
  `[happy]` parsed from the stream start, else lexicon classifier) → memory extraction (name/likes/major).
- LLM runs in a module Web Worker (`llm.worker.ts`) with transformers.js; streams tokens; can be interrupted.
  Model is downloaded only after explicit consent showing its size; cached by the browser for next time.
  See §9 for model ids (filled from research).

## 7. Pet simulation

Pure functions in `src/lib/pet/sim.ts` operating on `SaveData` (see GAME_DESIGN.md for tuning):
`newSave(now)`, `advance(save, now) → SimEvent[]`, `applyAction(save, pig, action, itemId?, now?) → ActionResult`,
`bondLevel(bond)`, `bondProgress(bond)`, `moodOf(pig)`, `claimDaily(save, now)`.
Real-time decay runs on load (catch-up capped) and every 10 s while open.

## 8. Save

`localStorage['kempanion.save.v1']` JSON (`SaveData`), debounced writes (750 ms) plus flush on
`visibilitychange`/`pagehide`. Settings live inside the save. Export/import as a `.json` file from Settings.

## 9. LLM models ("Big Brain")

Research: docs/research/llm-models.md and llm-runtime.md (+ llm-scripts/). transformers.js **4.3.2** pinned, WebGPU only
(the WASM path decodes at ~1 tok/s — unusable; no WebGPU → Heuristic Brain), module worker, lazy import.

| Tier | Repo | dtype (shader-f16 / not) | Download | Notes |
|---|---|---|---|---|
| **Best** (default on desktop with shader-f16) | `onnx-community/LFM3-1.7B-ONNX` | q4f16 1.09 GB / q4 1.30 GB | LFM3 (released 2026-10-27), best roleplay, ~71 tok/s on M1 Max | `enable_thinking:false`, `bad_words_ids:[[124901],[124902]]` (`<think>`,`</think>`), regex-constrained output |
| Standard | `LiquidAI/LFM2.5-1.2B-Instruct-ONNX` | q4f16 0.76 GB / q4 0.85 GB | ~101 tok/s | non-reasoning; formulaic but safe |
| Lite (phones / iOS) | `onnx-community/LFM2.5-350M-ONNX` | q4f16 0.26 GB / q4 0.29 GB | ~134 tok/s | only tier that fits iOS; needs the regex constraint + strong few-shot |

Output contract for every tier: `@huggingface/transformers-structured-output` `StructuredOutputProcessor` with regex
`\[(neutral|happy|…20 expressions)\] "[^"\n]{1,240}"` → the reply's own expression tag picks the portrait (Liquid's d1
decision models were evaluated for expression classification and rejected: +0.24–1.6 GB, custom glue, no better than this).
Sampling: temperature ~0.6, top_k 50, repetition_penalty 1.1, max_new_tokens 96. Hard quirks (based→Patriot etc.) are
handled in code, never in the prompt ("says X a lot" makes small models answer "Patriot." to "hi!").
Stable per-pig system prompt; dynamic state goes at the start of the newest user turn so the KV cache prefix can be reused.

## 10. Build & deploy

`bun install --frozen-lockfile` → `bun run build` (= `build:synth` + `vite build`) → `dist/` uploaded with
`actions/upload-pages-artifact` and deployed by `actions/deploy-pages`. The `.wasm` is also committed so
`bun run build:web` works without Rust.

## 11. Conventions every module follows

- **Time**: never call `Date.now()`/`new Date()` for game logic — use `now()` / `nowDate()` from `src/lib/state/clock.ts`
  (debug time-warp + `?now=2026-10-31T18:52` URL override).
- **Assets**: always resolve with `import.meta.env.BASE_URL` (base is `./`), e.g. `${import.meta.env.BASE_URL}assets/bg/dorm.png`.
- **Backgrounds** (`public/assets/bg`, 480×270; `<id>_night` variants exist for outdoor places and homes — see
  `src/generated/backgrounds.json`): `century_tower` `plaza` `marston` `malachowsky` `physics` `physics_lab` `communicore`
  `anatomy_lab` `shands` `or_suite` (research OR, based on the user's photo) `stadium` (inside the Swamp) `reitz` `lake_alice`
  `volleyball_courts` `midtown` `sakura_house` (co-op exterior/porch with the yard sakura) `legend_sakura` (endings) `title`
  `dorm` (a cozy generic dorm room) and the three **distinct homes** `home_p1` (volleyball + coding), `home_p2` (chaotic neuro
  lab-office, boxes of medical supplies everywhere), `home_p3` (maker's den with three 3D printers). `map` is 480×320 (3:2).
  Use `backgroundFor(loc, pig)` from `src/lib/content/locations.ts` — at home ('dorm') each pig is shown in HIS room.
  The renderer must draw a tasteful placeholder for any id not present.
- **CGs** (`public/assets/cg/<id>.png`, 480×270): ids `cg_<p1|p2|p3|trio>_<slug>`; story writers list each CG they use with a
  one-sentence visual description in their report so it can be painted.
- **Songs** live in `src/lib/audio/songs/<id>.ts`; the registry `songs/index.ts` (import.meta.glob) is Vite-only.
- **UI hooks**: `vnHooks` in `src/lib/vn` lets the UI provide `pickCompanion()`, `enterName()`, `runMinigame(id)`.
- **Never** reference Krishna Lunch, the "Gator Bait" chant, UF logos/Albert & Alberta likenesses, or copyrighted songs/lyrics.
- **Bun tests** must not import modules that use `import.meta.glob` or `?raw` (keep pure logic in pure modules).

## 12. VN engine notes (from the implementation)

`src/lib/vn/kscript.ts` documents every supported command at the top of the file, including extensions beyond §4:
`[elif]`, `[set x += n]`, conditional choices, `[call id]`, `[jingle id]`, `[burst kind]`. `{time}` is the clock time and
`{timeofday}` the period. `[input key]` answers are stored as `flags['fact.<key>']` plus a `key=value` memory. `[outfit pig x]`
sets flag `outfit_<x>`; `[minigame]` sets `minigame_score` / `minigame_won`. Read-line tracking for skip mode lives in
localStorage key `kempanion.vn.read.v1`. Chapter gating reads `counters.days_played` (pet `recordDayPlayed`).
