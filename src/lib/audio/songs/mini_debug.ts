import type { Song } from '../mml';

// Bug Hunt (debugging mini-game). F lydian chiptune, 132 BPM. 34 bars. The hats "type" in uneven 16ths.
// Form: intro 2 (typing + chip arps; not looped) | A 8 (writing code: PIGGY 3 motif on pulse25… then a wrong note,
// an error bleep, and a restart) | B 8 (bug found: A minor with a suspicious E7, tiptoe chromatic bleeps) |
// C 8 (compiling: long rising notes over Fmaj7–G–Em7–Am7–Dm7–Em7, a progress run) | A' 8 (it works: the motif runs
// clean, a success chirp; C → back to F at the loop).
const song: Song = {
  id: 'mini_debug',
  title: 'Bug Hunt',
  bpm: 132,
  loop: true,
  echo: 0.18,
  tracks: [
    {
      inst: 'pulse25',
      vol: 0.7,
      mml: `
        @pulse25 v13 q5 l8
        r1 | r1 | L
        ; A — writing code (with a bug in bar 3)
        o5 f a > c < b a4 r > c | < b g a f g4 r4 | f a > c < b a r > c+ r | r4 r c < b g a b |
        > c4 e4 d c < a4 | b4 > d4 c < b g4 | a4 > c4 < b a f4 | g2. r4 |
        ; B — bug found
        o5 d r f r a g+ a r | g+ r b r > d c+ d r | < c r e r a g+ a r | b4 g+4 e4 r4 |
        f r a r > d c+ d r | < b r > d r e d+ e r | c4 < a4 e4 a4 | g4 b4 > d4 r4 |
        ; C — compiling
        q7 o5 c1 | d1 | e1 | e1 | f1 | g1 | a1 | b2 > c4 d4 |
        ; A' — it works
        q5 o5 f a > c < b a4 r > c | < b g a f g4 r4 | f a > c < b a4 r > c | < b g a b > c d e4 |
        c4 e4 d c < a4 | b4 > d4 c < b g4 | a4 > c4 < b a f4 | g2 > c4 r4 |
      `,
    },
    {
      // Chip arpeggio chords (16ths)
      inst: 'pulse12',
      vol: 0.58,
      pan: -0.3,
      mml: `
        @pulse12 v6 q4 l16
        [o4 f a > c < a]4 | [o4 g b > d < b]4 | L
        ; A
        v7 [o4 f a > c < a]4 | [o4 g b > d < b]4 | [o4 f a > c < a]4 | [o4 g b > d < b]4 |
        [o4 a > c e c <]4 | [o4 g b > d < b]4 | [o4 f a > c < a]4 | [o4 c e g e]4 |
        ; B
        [o4 d f a f]4 | [o4 e g+ b > d <]4 | [o4 a > c e c <]4 | [o4 e g+ b > d <]4 |
        [o4 d f a f]4 | [o4 e g+ b > d <]4 | [o4 a > c e c <]4 | [o4 g b > d < b]4 |
        ; C
        [o4 f a > c e <]4 | [o4 g b > d < b]4 | [o4 e g b > d <]4 | [o4 a > c e g <]4 |
        [o4 d f a > c <]4 | [o4 e g b > d <]4 | [o4 f a > c e <]4 | [o4 g b > d < b]4 |
        ; A'
        [o4 f a > c < a]4 | [o4 g b > d < b]4 | [o4 f a > c < a]4 | [o4 g b > d < b]4 |
        [o4 a > c e c <]4 | [o4 g b > d < b]4 | [o4 f a > c < a]4 | [o4 c e g e]4 |
      `,
    },
    {
      // NES-style triangle bass, octave hops
      inst: 'tri',
      vol: 0.74,
      mml: `
        @tri v12 q5 l8
        r1 | r1 | L
        ; A
        [o2 f o3 f]4 | [o2 g o3 g]4 | [o2 f o3 f]4 | [o2 g o3 g]4 | [o2 a o3 a]4 | [o2 g o3 g]4 | [o2 f o3 f]4 | [o2 c o3 c]4 |
        ; B
        [o2 d o3 d]4 | [o2 e o3 e]4 | [o2 a o3 a]4 | [o2 e o3 e]4 | [o2 d o3 d]4 | [o2 e o3 e]4 | [o2 a o3 a]4 | [o2 g o3 g]4 |
        ; C
        [o2 f o3 f]4 | [o2 g o3 g]4 | [o2 e o3 e]4 | [o2 a o3 a]4 | [o2 d o3 d]4 | [o2 e o3 e]4 | [o2 f o3 f]4 | [o2 g o3 g]4 |
        ; A'
        [o2 f o3 f]4 | [o2 g o3 g]4 | [o2 f o3 f]4 | [o2 g o3 g]4 | [o2 a o3 a]4 | [o2 g o3 g]4 | [o2 f o3 f]4 | [o2 c o3 c]4 |
      `,
    },
    {
      // Typing hats: uneven 16ths over a light kick/snare
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums l16
        v6 e v3 e v5 e r v7 e v4 e r v5 e v6 e v3 e v5 e r v7 e r v4 e v5 e |
        v6 e v6 e r v4 e v7 e r v5 e v6 e v6 e v6 e v4 e r v7 e v5 e v6 e r | L
        ; A
        [v9 c v4 e v6 e r v7 d v5 e r v6 e v9 c v3 e v6 e v4 e v7 d r v6 e v5 e |
         v9 c v6 e r v4 e v7 d r v5 e v6 e v9 c v6 e v4 e r v7 d v5 e v6 e r |]3
        v9 c v4 e v6 e r v7 d v5 e r v6 e v9 c v3 e v6 e v4 e v7 d r v6 e v5 e |
        v9 c v6 e r v4 e v7 d r v5 e v6 e v8 b v8 b v9 a v9 a v10 d v10 d v11 d v11 d |
        ; B — the typing stops
        [v9 c8 v4 e8 v5 e8 v4 e8 v8 'd g'8 v4 e8 v5 e8 v4 e8 |]7
        v9 c8 v4 e8 v5 e8 v4 e8 v8 b v8 b v9 a v9 a v10 d v10 d v11 d v11 d |
        ; C — compiling, the hats speed up
        [v9 c8 v4 e8 v8 d8 v4 e8 v9 c8 v4 e8 v8 d8 v4 e8 |]4
        [v9 c v4 e v6 e v4 e v8 d v4 e v6 e v4 e v9 c v4 e v6 e v4 e v8 d v4 e v6 e v4 e |]2
        [v9 c8 v8 d8]4 | v7 d v7 d v8 d v8 d v9 d v9 d v10 d v10 d v11 d v11 d v12 d v12 d v12 'c g'8 v12 'c g'8 |
        ; A' — claps
        [v9 c v4 e v6 e r v7 'd g' v5 e r v6 e v9 c v3 e v6 e v4 e v7 'd g' r v6 e v5 e |
         v9 c v6 e r v4 e v7 'd g' r v5 e v6 e v9 c v6 e v4 e r v7 'd g' v5 e v6 e r |]3
        v9 c v4 e v6 e r v7 'd g' v5 e r v6 e v9 c v3 e v6 e v4 e v7 'd g' r v6 e v5 e |
        v9 c v6 e r v4 e v7 'd g' r v5 e v6 e v8 b v8 b v9 a v9 a v10 d v10 d v11 d v11 d |
      `,
    },
    {
      // Bleeps: the error, the search, the progress bar, the success chirp
      inst: 'pulse50',
      vol: 0.55,
      pan: 0.35,
      mml: `
        @pulse50 v8 q3
        r1 | r1 | L
        ; A — error bleep after the wrong note
        r1 | r1 | r2. o6 c32 < a32 f+32 d+32 r8 | r1 | r1 | r1 | r1 | r1 |
        ; B — searching
        [r8 o6 e16 r16 r4 r8 a16 r16 r4 | r4 r8 o6 c16 r16 r8 o5 a16 r16 r4 |]4
        ; C — progress run
        r1 | r1 | r1 | r1 | r1 | r1 | l16 v7 o4 f g a b > c d e f g a b > c d e f g | r1 |
        ; A' — success
        v9 o6 c32 e32 g32 > c32 < r8 r4 r2 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
      `,
    },
  ],
};

export default song;
