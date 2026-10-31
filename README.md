# Kempanion Online

*A Kempa AI production.* Play it at **https://kempanion.online**.

![Piggy 1, Piggy 2 and Piggy 3 under the sakura at Century Tower](docs/images/key-visual.png)

A Japanese-visual-novel × Tamagotchi game set at the University of Florida (with year-round sakura). Pick one of
three campus piggies as your **Kempanion**: keep him fed, rested, clean and happy on your real local clock, hang out
with all three around a pixel-art UF campus, play their mini-games, and grow each bond through scripted heart events
toward the Legend of the Century Sakura.

Everything runs in the browser as a static site. Chat works offline with the deterministic **Heuristic Brain**; players
can opt into the **Big Brain**, a local LLM (Liquid AI **LFM3-1.7B**, or LFM2.5 1.2B / 350M) that runs on their own GPU via
WebGPU and never sends anything anywhere. The title screen asks once (with the download size); after the KempaPager
tutorial your Kempanion shows you the brain chip. The three preset reply options always get the hand-written
answer; only what you type yourself goes to the Big Brain.

Pick your pig up (Pocket-God style: the pointer hand turns to grab, he wiggles while held) and toss him around the
room; he bounces, lands, and has opinions about it.

## Run it

```bash
bun install
bun run dev
```

Open the printed URL. Useful URL flags: `?debug` (debug panel: time warp, bond/acorn cheats, scene launcher) and
`?now=2026-10-31T18:52` (pretend it's a specific local time).

```bash
bun test          # unit tests (MML, KScript validator, pet sim, chat brains…)
bun run check     # svelte-check / TypeScript
bun run build     # characters → Rust synth (wasm) → vite build into dist/
bun run preview   # serve dist/
```

## Deploy

In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
The `Deploy to GitHub Pages` workflow builds the game, checks Svelte/TypeScript, runs the tests against the built
assets, and publishes `dist/` on a push to `main` (or a manual workflow run).

Do not select **Deploy from a branch** for this source tree: that runs Jekyll over the research Markdown instead
of building the game. The custom domain remains `kempanion.online`.

## How it's built

| Piece | Tech |
|---|---|
| App / UI | Vite 8, Svelte 5 (runes), TypeScript 6, Bun |
| Stage | Canvas 2D at 480×270 logical pixels, sharp nearest-neighbor scaling, procedural sakura/weather/particles |
| Music & SFX | Original chiptune written in MML, compiled in TS and synthesized in real time by a **Rust → WebAssembly** synth inside an AudioWorklet; Ace-Attorney-style text blips per character |
| Story | KScript scene files (`src/lib/content/scenes/*.ks`) run by the VN engine |
| Pet sim | Pure TS over the save (`src/lib/pet`), real-time decay with gentle offline floors |
| Big Brain | transformers.js 4.3.2 on WebGPU in a worker, regex-constrained `[expression] "line"` output picks the sprite |
| Offline | Service worker caches the app shell; models are cached by the browser after the first download |

Docs: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) (design), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
(contracts, KScript and MML formats), [`docs/research/`](docs/research) (design proposals, UF lore, LLM research).

## Content pipelines

- **Personalities** — `characters/piggy-{1,2,3}.md` are the source of truth for each pig's profile and voice. Their
  frontmatter fills the profile cards and their "Compact character prompt" becomes the Big Brain system prompt
  (`bun run gen` regenerates `src/generated/characters.json`; `dev`/`build` do it automatically).
- **Sprites** — the piggy sprite pack is processed into pixelated atlases (0.5×, alpha-thresholded, palette-quantized):
  ```bash
  bun run sync-sprites
  ```
  The pack lives in `art-src/sprite-pack/` (git-ignored: about 280 MB of source frames). The script only reads it and
  rewrites `public/assets/sprites/` + `src/generated/sprites.json`; game-made extra clips come from
  `art-src/sprites-extra/`. Re-run it when the sprites change.
- **Backgrounds & CGs** — generated pixel art (prompts in `art-src/bg/prompts/`, reference-photo credits in
  [`art-src/bg/REFERENCES.md`](art-src/bg/REFERENCES.md)) is snapped onto an exact 480×270 grid by
  `bun run bake-backgrounds` (raw generations live in the git-ignored `art-src/raw/`).
- **Music** — one MML song per file in `src/lib/audio/songs/`; `bun scripts/render-songs.ts` renders them offline and
  checks for clipping/silence.
