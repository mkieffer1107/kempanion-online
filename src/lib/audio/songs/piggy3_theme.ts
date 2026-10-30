import type { Song } from '../mml';

// Piggy 3's theme. F lydian (the B natural never resolves), 96 BPM, swung 8ths (written as 6 + 12 triplets), lofi.
// 30 bars. Form: intro 2 (e-piano alone, then hats; not looped) | A 8 (PIGGY 3 motif on a soft triangle: the phrase
// stops mid-thought and restarts, Fmaj7 ⇄ G/F vamp then Am7–Dm7–Em7) | B 8 ("Actually—": livelier runs over
// Dm7–Em7–Fmaj7–G6, Gsus4→G) | A' 8 (motif, then a higher answer) | breakdown 4 (the glock tries the motif, stops
// halfway… and the triangle picks it back up at the loop).
const song: Song = {
  id: 'piggy3_theme',
  title: 'So I Was Thinking',
  bpm: 96,
  loop: true,
  echo: 0.3,
  tracks: [
    {
      // Melody — thinking aloud
      inst: 'tri',
      vol: 0.6,
      mml: `
        @tri v13 y3 q7
        r1 | r1 | L
        ; A
        o5 f6 a12 > c6 < b12 a4 r6 > c12 | < b6 g12 a6 f12 g4 r4 | f6 a12 > c4 r2 | r6 < f12 a6 > c12 d6 e12 d6 < b12 |
        > c6 < b12 a6 g12 e4 r4 | f6 e12 d6 c12 < a4 r6 > c12 | d6 e12 g6 b12 > d4 < b4 | a2 g4 r4 |
        ; B — "Actually—"
        r6 o5 d12 f6 a12 > c4 < a6 g12 | b4 g6 e12 r2 | r6 c12 f6 a12 > c6 e12 d6 c12 | < b4 > d4 e2 |
        r4 d6 c12 < a6 f12 a6 > c12 | < b6 g12 e6 g12 b4 r4 | > c6 < b12 a6 g12 e6 g12 a6 b12 | > c2 < b4 r4 |
        ; A'
        o5 f6 a12 > c6 < b12 a4 r6 > c12 | < b6 g12 a6 f12 g4 r4 | f6 a12 > c4 r2 | r6 < f12 a6 > c12 d6 e12 d6 < b12 |
        > e6 d12 c6 < b12 a4 r4 | > d6 c12 < a6 f12 d4 r6 a12 | b6 g12 e6 g12 b6 > d12 e4 | d2 < b4 r4 |
        ; breakdown — the glock has the idea
        r1 | r1 | r1 | r1 |
      `,
    },
    {
      // E-piano: swung arpeggios
      inst: 'epiano',
      vol: 0.6,
      pan: -0.25,
      mml: `
        @epiano v9 q7
        o3 f6 > c12 a6 > c12 e6 c12 < a6 c12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 | L
        ; A
        o3 f6 > c12 a6 > c12 e6 c12 < a6 c12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 |
        o3 f6 > c12 a6 > c12 e6 c12 < a6 c12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 |
        o3 a6 > e12 g6 > c12 e6 c12 < g6 e12 | o3 d6 a12 > c6 f12 a6 f12 c6 < a12 |
        o3 e6 b12 > d6 g12 b6 g12 d6 < b12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 |
        ; B
        o3 d6 a12 > c6 f12 a6 f12 c6 < a12 | o3 e6 b12 > d6 g12 b6 g12 d6 < b12 |
        o3 f6 > c12 a6 > c12 e6 c12 < a6 c12 | o3 g6 > d12 e6 g12 b6 g12 e6 d12 |
        o3 d6 a12 > c6 f12 a6 f12 c6 < a12 | o3 e6 b12 > d6 g12 b6 g12 d6 < b12 |
        o3 a6 > e12 g6 > c12 e6 c12 < g6 e12 | o3 g6 > d12 g6 > c12 < b6 g12 d6 < b12 |
        ; A'
        o3 f6 > c12 a6 > c12 e6 c12 < a6 c12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 |
        o3 f6 > c12 a6 > c12 e6 c12 < a6 c12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 |
        o3 a6 > e12 g6 > c12 e6 c12 < g6 e12 | o3 d6 a12 > c6 f12 a6 f12 c6 < a12 |
        o3 e6 b12 > d6 g12 b6 g12 d6 < b12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 |
        ; breakdown
        v8 [o3 f6 > c12 a6 > c12 e6 c12 < a6 c12 | o3 f6 > d12 g6 b12 > d6 < b12 g6 d12 |]2
      `,
    },
    {
      // Warm pad
      inst: 'pad',
      vol: 0.56,
      pan: 0.2,
      mml: `
        @pad v7 q8 o4
        r1 | r1 | L
        ; A
        'f a > c'1 | 'g b > d'1 | 'f a > c'1 | 'g b > d'1 | 'g > c e'1 | 'f a > c'1 | 'g b > d'1 | 'g b > d'1 |
        ; B
        'f a > c'1 | 'g b > d'1 | 'f a > c'1 | 'g b > e'1 | 'f a > c'1 | 'g b > d'1 | 'g > c e'1 | 'g > c d'2 'g b > d'2 |
        ; A'
        'f a > c'1 | 'g b > d'1 | 'f a > c'1 | 'g b > d'1 | 'g > c e'1 | 'f a > c'1 | 'g b > d'1 | 'g b > d'1 |
        ; breakdown
        v6 'f a > c'1 | 'g b > d'1 | 'f a > c'1 | 'g b > d'1 |
      `,
    },
    {
      // Laid-back bass
      inst: 'bass',
      vol: 0.74,
      mml: `
        @bass v12 q6
        r1 | r1 | L
        ; A
        o2 f4 r6 f12 r4 o3 c4 | o2 f4 r6 f12 r4 g4 | o2 f4 r6 f12 r4 o3 c4 | o2 f4 r6 f12 r4 g4 |
        o2 a4 r6 a12 r4 o3 e4 | o2 d4 r6 d12 r4 a4 | o2 e4 r6 e12 r4 b4 | o2 f4 r6 f12 r4 g4 |
        ; B
        o2 d4 r6 d12 r4 a4 | o2 e4 r6 e12 r4 b4 | o2 f4 r6 f12 r4 o3 c4 | o2 g4 r6 g12 r4 d4 |
        o2 d4 r6 d12 r4 a4 | o2 e4 r6 e12 r4 b4 | o2 a4 r6 a12 r4 o3 e4 | o2 g4 r6 g12 r4 g4 |
        ; A'
        o2 f4 r6 f12 r4 o3 c4 | o2 f4 r6 f12 r4 g4 | o2 f4 r6 f12 r4 o3 c4 | o2 f4 r6 f12 r4 g4 |
        o2 a4 r6 a12 r4 o3 e4 | o2 d4 r6 d12 r4 a4 | o2 e4 r6 e12 r4 b4 | o2 f4 r6 f12 r4 g4 |
        ; breakdown — just the pedal
        o2 f2 r2 | f2 r4 g4 | f2 r2 | f2 r4 g4 |
      `,
    },
    {
      // Boom-bap swing
      inst: 'drums',
      vol: 0.56,
      mml: `
        @drums
        r1 | [v4 e6 v3 e12]4 | L
        ; A
        [v10 c6 v4 e12 v8 d6 v4 e12 v5 e6 v9 c12 v8 d6 v5 e12]7 |
        v10 c6 v4 e12 v8 d6 v4 e12 v6 d12 v7 d12 v7 d12 v8 d12 v9 d12 v10 d12 |
        ; B
        [v10 c6 v4 e12 v8 'd g'6 v4 e12 v5 e6 v9 c12 v8 'd g'6 v5 e12]7 |
        v10 c6 v4 e12 v8 d6 v4 e12 v6 d12 v7 d12 v7 d12 v8 a12 v9 a12 v10 a12 |
        ; A'
        [v10 c6 v4 e12 v8 d6 v4 e12 v5 e6 v9 c12 v8 d6 v5 e12]7 |
        v10 c6 v4 e12 v8 d6 v4 e12 v6 d12 v7 d12 v7 d12 v8 d12 v9 d12 v10 d12 |
        ; breakdown — kick and hats, a soft pickup
        [v9 c6 v3 e12 v4 e6 v3 e12 v5 e6 v8 c12 v4 e6 v3 e12]3 |
        v9 c6 v3 e12 v4 e6 v3 e12 v5 d12 v6 d12 v6 d12 v7 d12 v8 d12 v8 d12 |
      `,
    },
    {
      // Glock: little "ding" ideas; carries the motif in the breakdown
      inst: 'glock',
      vol: 0.42,
      pan: 0.35,
      mml: `
        @glock v9 q5
        r1 | r1 | L
        ; A
        r1 | r1 | r2 r6 o5 e12 b4 | r1 | r1 | r1 | r1 | r1 |
        ; B
        r1 | r2 r6 o5 b12 > e4 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; A'
        r1 | r1 | r2 r6 o5 e12 b4 | r1 | r1 | r1 | r1 | r1 |
        ; breakdown — the motif, then a pause
        v8 o5 f6 a12 > c6 < b12 a4 r6 > c12 | < b6 g12 a6 f12 g4 r4 | f6 a12 > c4 r2 | r1 |
      `,
    },
  ],
};

export default song;
