import type { Song } from '../mml';

// Lake Alice at dusk — "Bat Hour". A dorian (the F♯ is the dusk-light colour), 80 BPM in a rocking 12/8 feel
// (triplets inside 4/4 bars). 26 bars. Form: intro 2 (harp alone, the pad breathes in; not looped) |
// A 8 (flute over Am7–D/A, then Cmaj7–G–Bm7–Em7, a few glock chirps) | B 8 (bat hour: the flute climbs over
// Cmaj7–D–Bm7–Em7, soft triplet shaker, a flurry of tiny high chirps) | A' 8 (the tune again, a new ending).
const song: Song = {
  id: 'lake_alice',
  title: 'Bat Hour',
  bpm: 80,
  loop: true,
  echo: 0.36,
  tracks: [
    {
      inst: 'flute',
      vol: 0.62,
      mml: `
        @flute v12 q7
        r1 | r1 | L
        ; A
        o5 e4 a6 g12 e4 d4 | f+6 e12 d6 e12 f+2 | e4 a6 b12 > c4 < b6 a12 | f+2. r4 |
        g4 e6 g12 b4 a6 g12 | d4 g6 a12 b2 | a6 b12 a6 f+12 d2 | e2. r4 |
        ; B — bat hour
        o5 g12 a12 b12 > c6 d12 e4 d6 c12 | d4 < a6 f+12 a2 > | d6 c12 < b6 a12 f+4 b4 > | e2. r4 |
        < g12 a12 b12 > c6 d12 e4 g4 | f+2 e4 d4 | d6 c12 < b6 a12 b2 | g2. r4 |
        ; A'
        o5 e4 a6 g12 e4 d4 | f+6 e12 d6 e12 f+2 | e4 a6 b12 > c4 < b6 a12 | f+2. r4 |
        g4 e6 g12 b4 > c6 d12 | d2 < b4 g4 | a6 b12 a6 f+12 d4 e4 | e2. r4 |
      `,
    },
    {
      // Pluck harp: triplet arpeggios
      inst: 'pluck',
      vol: 0.62,
      pan: -0.3,
      mml: `
        @pluck v9 q7 l12
        o3 a > e a > c < a e o3 a > e g > c < g e | o3 a > d f+ a f+ d o3 a > d f+ a f+ d | L
        ; A
        o3 a > e a > c < a e o3 a > e g > c < g e | o3 a > d f+ a f+ d o3 a > d f+ a f+ d |
        o3 a > e a > c < a e o3 a > e g > c < g e | o3 a > d f+ a f+ d o3 a > d f+ a f+ d |
        o4 c g b > e < b g o4 c g b > e < b g | o3 g > d g b g d o3 g > d g b g d |
        o3 b > f+ a > d < a f+ o3 b > f+ a > d < a f+ | o3 e b > d g d < b o3 e b > d g d < b |
        ; B
        o4 c g b > e < b g o4 c g b > e < b g | o4 d a > d f+ d < a o4 d a > d f+ d < a |
        o3 b > f+ a > d < a f+ o3 b > f+ a > d < a f+ | o3 e b > d g d < b o3 e b > d g d < b |
        o4 c g b > e < b g o4 c g b > e < b g | o4 d a > d f+ d < a o4 d a > d f+ d < a |
        o3 b > f+ a > d < a f+ o3 b > f+ a > d < a f+ | o3 e b > d g d < b o3 e b > d g d < b |
        ; A'
        o3 a > e a > c < a e o3 a > e g > c < g e | o3 a > d f+ a f+ d o3 a > d f+ a f+ d |
        o3 a > e a > c < a e o3 a > e g > c < g e | o3 a > d f+ a f+ d o3 a > d f+ a f+ d |
        o4 c g b > e < b g o4 c g b > e < b g | o3 g > d g b g d o3 g > d g b g d |
        o3 b > f+ a > d < a f+ o3 b > f+ a > d < a f+ | o3 e b > d g d < b o3 e b > d g d < b |
      `,
    },
    {
      inst: 'pad',
      vol: 0.55,
      pan: 0.25,
      mml: `
        @pad v6 q8 o4
        r1 | 'f+ a > d'1 | L
        ; A
        v7 'g > c e'1 | 'f+ a > d'1 | 'g > c e'1 | 'f+ a > d'1 | 'e g b'1 | 'd g b'1 | 'f+ a > d'1 | 'e g b'1 |
        ; B
        v8 'e g > c'1 | 'f+ a > d'1 | 'f+ a > d'1 | 'e g b'1 | 'e g > c'1 | 'f+ a > d'1 | 'f+ a > d'1 | 'e g b'1 |
        ; A'
        v7 'g > c e'1 | 'f+ a > d'1 | 'g > c e'1 | 'f+ a > d'1 | 'e g > c'1 | 'd g b'1 | 'f+ a > d'1 | 'e g b'1 |
      `,
    },
    {
      inst: 'bass',
      vol: 0.6,
      mml: `
        @bass v10 q7 o2
        r1 | a1 | L
        ; A
        a1 | a1 | a1 | a1 | > c1 < | g1 | b1 | e1 |
        ; B
        > c1 < | d1 | b1 | e1 | > c1 < | d1 | b1 | e1 |
        ; A'
        a1 | a1 | a1 | a1 | > c1 < | g1 | b1 | e1 |
      `,
    },
    {
      // Tiny high chirps
      inst: 'glock',
      vol: 0.45,
      pan: 0.45,
      mml: `
        @glock v7 q2
        r1 | r1 | L
        ; A
        r1 | r2. o6 a32 e32 r16 r8 | r1 | r2 o6 b32 f+32 r16 r8 r4 | r1 | r1 | r1 | r4 o6 e32 b32 r16 r8 r2 |
        ; B — the bats are out
        r4 o7 d32 r32 d32 r32 r8 r2 | r2. o6 a32 b32 r16 r8 | r8 o7 d32 r32 r16 r4 r8 o6 b32 r32 r16 r4 | r2 o6 e32 a32 r16 r8 r4 |
        r4 o7 d32 r32 d32 r32 r8 r2 | r2. o6 f+32 a32 r16 r8 | r8 o7 d32 r32 r16 r4 r8 o6 b32 r32 r16 r4 | r2 o6 e32 b32 r16 r8 r4 |
        ; A'
        r1 | r2. o6 a32 e32 r16 r8 | r1 | r2 o6 b32 f+32 r16 r8 r4 | r1 | r1 | r1 | r4 o6 e32 b32 r16 r8 r2 |
      `,
    },
    {
      // Soft triplet shaker (B and A')
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums l12
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        [v6 c v2 e e v3 e v2 e e v4 a v2 e e v3 e v2 e e |]16
      `,
    },
  ],
};

export default song;
