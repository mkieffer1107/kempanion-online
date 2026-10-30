import type { Song } from '../mml';

// Comedy. Written in C, sounds in F (k-7, puts the pulse12 "bassoon" in bassoon range; drums untransposed).
// Oom-pah: tuba bass on 1 and 3, banjo-ish pluck stabs on 2 and 4, woodblock (high tom) on the offbeats.
// A 8: sneaky staccato bassoon with chromatic slides | B 8: pulse25 answers with 32nd-note slides (F–Fm–C–A7…) |
// A' 8: xylophone (marimba) doubles the bassoon | C 8: pratfall — a chromatic slide down, CRASH, a silent beat,
// tiptoe back in, bonk-bonk-bonk → A.
const song: Song = {
  id: 'comedy',
  title: 'The Banana Bandit Incident',
  bpm: 120,
  loop: true,
  echo: 0.15,
  tracks: [
    {
      // Bassoon-ish pulse12
      inst: 'pulse12',
      vol: 0.94,
      mml: `
        @pulse12 v13 q4 k-7 l8
        o4 c r e r g4 a- a | b r > d r < b4 g4 | e r g r > c4 < b- a | a- g f r d4 r4 |
        c r e r g4 a- a | b- r g r e4 c4 | a a- g f+ f4 a4 | g r g r g4 r4 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        o4 c r e r g4 a- a | b r > d r < b4 g4 | e r g r > c4 < b- a | a- g f r d4 r4 |
        c r e r g4 a- a | b- r g r e4 c4 | a a- g f+ f4 a4 | g r g r g4 r4 |
        o5 g16 f+16 f16 e16 d+16 d16 c+16 c16 < b16 a+16 a16 g+16 g16 f+16 f16 e16 | r1 |
        o4 c r r4 e r r4 | g r r4 b r r4 | > c r r4 < g r r4 | f r e r d r < b r |
        > c r e r g r > c r | < g r g r g4 r4 |
      `,
    },
    {
      // Pulse25: the B answers with chromatic slides, a "boing" after the pratfall
      inst: 'pulse25',
      vol: 0.78,
      pan: 0.2,
      mml: `
        @pulse25 v12 q5 k-7 l8
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        o5 f r a r > c32 c+32 d32 e32 f4 r | e-4 d c < a-4 r4 | g r e r c4 r32 c+32 d32 d+32 e | c+ r e r a4 g4 |
        f r a r > c4 < b a | g f+ g a- g f d < b | > c4 r32 c+32 d32 d+32 e4 g4 r | g r f r d r < b r |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r4 o6 c32 < g32 e32 c32 r8 r2 | r1 | r1 | r1 | r1 | r1 | r1 |
      `,
    },
    {
      // Oom-pah stabs
      inst: 'pluck',
      vol: 0.56,
      pan: -0.3,
      mml: `
        @pluck v9 q4 k-7 l8 o4
        [r4 'e > c e' r r4 'e > c e' r | r4 'd f b' r r4 'd f b' r]2
        r4 'e > c e' r r4 'e > c e' r | r4 'e g b-' r r4 'e g b-' r | r4 'f a > c' r r4 'f a > c' r | r4 'd f b' r r4 'd f b' r |
        r4 'f a > c' r r4 'f a > c' r | r4 'f a- > c' r r4 'f a- > c' r | r4 'e > c e' r r4 'e > c e' r | r4 'e g > c+' r r4 'e g > c+' r |
        r4 'f a > c' r r4 'f a > c' r | r4 'd f b' r r4 'd f b' r | r4 'e > c e' r r4 'e > c e' r | r4 'd f b' r r4 'd f b' r |
        [r4 'e > c e' r r4 'e > c e' r | r4 'd f b' r r4 'd f b' r]2
        r4 'e > c e' r r4 'e > c e' r | r4 'e g b-' r r4 'e g b-' r | r4 'f a > c' r r4 'f a > c' r | r4 'd f b' r r4 'd f b' r |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r4 'd f b' r r2 |
      `,
    },
    {
      // Tuba
      inst: 'bass',
      vol: 1.0,
      mml: `
        @bass v12 q4 k-7
        [o3 c4 r4 o2 g4 r4 | o2 g4 r4 b4 r4]2
        o3 c4 r4 o2 g4 r4 | o3 c4 r4 o2 g4 r4 | o2 f4 r4 o3 c4 r4 | o2 g4 r4 b4 r4 |
        o2 f4 r4 o3 c4 r4 | o2 f4 r4 o3 c4 r4 | o3 c4 r4 o2 g4 r4 | o2 a4 r4 o3 e4 r4 |
        o3 d4 r4 o2 a4 r4 | o2 g4 r4 b4 r4 | o3 c4 r4 o2 g4 r4 | o2 g4 r4 b4 r4 |
        [o3 c4 r4 o2 g4 r4 | o2 g4 r4 b4 r4]2
        o3 c4 r4 o2 g4 r4 | o3 c4 r4 o2 g4 r4 | o2 f4 r4 o3 c4 r4 | o2 g4 r4 b4 r4 |
        o2 g4 r4 r2 | r1 | o3 c4 r2. | o2 g4 r2. | o3 c4 r2. | o2 g4 r2. | o3 c4 r4 o2 g4 r4 | o2 g4 r4 g4 r4 |
      `,
    },
    {
      inst: 'drums',
      vol: 0.62,
      mml: `
        @drums l8
        [v9 c v6 b v7 d v6 b v9 c v6 b v7 d v6 b]7
        v9 c v6 b v7 d v6 b v9 c c 'c f'4
        v11 'c f' v6 b v7 d v6 b v9 c v6 b v7 d v6 b
        [v9 c v6 b v7 d v6 b v9 c v6 b v7 d v6 b]6
        v9 c v6 b v7 d v6 b v8 b16 b16 a16 a16 v9 d16 d16 d16 d16
        [v9 c v6 b v7 d v6 b v9 c v6 b v7 d v6 b]7
        v9 c v6 b v7 d v6 b v9 c c 'c f'4
        v8 b16 b16 b16 b16 a16 a16 a16 a16 v9 a16 a16 a16 a16 v10 c16 c16 c16 c16 | v12 'c f'4 r4 r2 |
        v5 b r r4 b r r4 | b r r4 b r r4 | b r r4 b r r4 | v6 b r b r b r b r |
        v8 c r v6 b r v8 c r v6 b r | v10 c r c r 'c f'4 r4 |
      `,
    },
    {
      // Xylophone: doubles the bassoon an octave up in A'
      inst: 'marimba',
      vol: 0.62,
      pan: 0.3,
      mml: `
        @marimba v11 q5 k-7 l8
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        o5 c r e r g4 a- a | b r > d r < b4 g4 | e r g r > c4 < b- a | a- g f r d4 r4 |
        c r e r g4 a- a | b- r g r e4 c4 | a a- g f+ f4 a4 | g r g r g4 r4 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
      `,
    },
  ],
};

export default song;
