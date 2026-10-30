import type { Song } from '../mml';

// Late-night lofi. Written in C, sounds in Db (k1; drums untransposed). Swing comes from the triplet grid
// (an 8th pair = l6 + l12). E-piano pushes each bar's second chord to the swung "and" of 2.
// Intro 2 (not looped) | A 8: Fmaj9 E7b9 Am9 Gm9-C9, lazy flute | B 8: ii–V–I–VI turnarounds |
// C 4: breakdown, glock lamp-post twinkles | A' 8 → A.
const song: Song = {
  id: 'night',
  title: 'Lamp Posts & Live Oaks',
  bpm: 80,
  loop: true,
  echo: 0.35,
  tracks: [
    {
      inst: 'flute',
      vol: 0.62,
      pan: 0.15,
      mml: `
        @flute v12 y4 k1
        r1 | r1 | L
        o5 r6 c12 e6 g12 a4 g6 e12 | f4 d6 < b12 g+2 | a6 > c12 e6 g12 b4 a4 | g4 f6 d12 e2 |
        r6 c12 e6 g12 a4 g6 e12 | f4 d6 < b12 g+2 | a6 > c12 e6 g12 > c4 < b4 | b-4 a6 f12 g2 |
        r4 f6 a12 > c4 < a4 | b4 a6 g12 e2 | r4 e6 g12 b4 > d4 | c+4 < b-6 g12 e2 |
        r4 f6 a12 > c4 < a4 | b4 a6 g12 e4 d4 | g4 f+6 e12 g6 a12 b4 | b-4 a6 f12 g2 |
        r1 | r1 | r1 | r1 |
        r6 c12 e6 g12 a6 > c12 < a6 g12 | f4 d6 < b12 g+2 | a6 > c12 e6 g12 b4 a4 | g4 f6 d12 e2 |
        r4 > c6 < a12 g6 e12 c4 | d4 < b6 g+12 > d2 | e6 g12 a6 b12 > c4 < a4 | b-4 a6 f12 g2 |
      `,
    },
    {
      // E-piano: rootless 9th voicings, hit on 1 and pushed to the swung "and" of 2
      inst: 'epiano',
      vol: 0.58,
      pan: -0.2,
      mml: `
        @epiano v9 q8 k1 o3
        'a > c e g'3^12 'a > c e g'2^12 | 'f a b- > d'3^12 'e g b- > d'2^12 | L
        ['a > c e g'3^12 'a > c e g'2^12 | 'g+ b > d f'3^12 'g+ b > d f'2^12 | 'g a > c e'3^12 'g a > c e'2^12 | 'f a b- > d'3^12 'e g b- > d'2^12]2
        'f a > c g'3^12 'f a > c g'2^12 | 'f a b > e'3^12 'f a b > e'2^12 | 'e g b > d'3^12 'e g b > d'2^12 | 'g > c+ e b-'3^12 'g > c+ e b-'2^12 |
        'f a > c g'3^12 'f a > c g'2^12 | 'f a b > e'3^12 'f a b > e'2^12 | 'e g b > d'3^12 'g b > c+ e'2^12 | 'f a b- > d'3^12 'e g b- > d'2^12 |
        v8 'a > c e g'1 | 'g+ b > d f'1 | 'g a > c e'1 | 'f a b- > d'2 'e g b- > d'2 |
        v9 ['a > c e g'3^12 'a > c e g'2^12 | 'g+ b > d f'3^12 'g+ b > d f'2^12 | 'g a > c e'3^12 'g a > c e'2^12 | 'f a b- > d'3^12 'e g b- > d'2^12]2
      `,
    },
    {
      // Round bass with swung pickups
      inst: 'bass',
      vol: 0.75,
      mml: `
        @bass v11 q7 k1 o2
        f4 r6 f12^4 > c6 < e12 | g4 r6 > c12^4 < g6 e12 | L
        [f4 r6 f12^4 > c6 < e12 | e4 r6 e12^4 b6 g+12 | a4 r6 a12^4 e6 g12 | g4 r6 > c12^4 < g6 e12]2
        d4 r6 d12^4 a6 f+12 | g4 r6 g12^4 d6 b12 | > c4 r6 c12^4 < g6 b-12 | a4 r6 a12^4 e6 e12 |
        d4 r6 d12^4 a6 f+12 | g4 r6 g12^4 d6 b12 | e4 r6 a12^4 e6 g12 | g4 r6 > c12^4 < g6 e12 |
        v10 f1 | e1 | a1 | g2 > c2 < |
        v11 [f4 r6 f12^4 > c6 < e12 | e4 r6 e12^4 b6 g+12 | a4 r6 a12^4 e6 g12 | g4 r6 > c12^4 < g6 e12]2
      `,
    },
    {
      // Kick & snare (boom-bap, swung)
      inst: 'drums',
      vol: 0.55,
      mml: `
        @drums
        r1 | r1 | L
        [v11 c6 r12 v10 d6 v8 c12 r6 v9 c12 v10 d6 r12]7
        v11 c6 r12 v10 d6 v8 c12 r6 v9 c12 v8 d12 v9 d12 v10 d12
        [v11 c6 r12 v10 d6 v8 c12 r6 v9 c12 v10 d6 r12]7
        v11 c6 r12 v10 d6 v8 c12 r6 v9 c12 v8 d12 v9 d12 v10 d12
        [v9 c4 r4 r2]4
        [v11 c6 r12 v10 d6 v8 c12 r6 v9 c12 v10 d6 r12]7
        v11 c6 r12 v10 d6 v8 c12 r6 v9 c12 v8 d12 v9 d12 v10 d12
      `,
    },
    {
      // Swung hats, open hat every other bar
      inst: 'drums',
      vol: 0.4,
      pan: 0.25,
      mml: `
        @drums
        [v6 e6 v4 e12]4 | [v6 e6 v4 e12]3 v6 e6 v5 f12 | L
        [[v6 e6 v4 e12]4 [v6 e6 v4 e12]3 v6 e6 v5 f12]8
        [v5 e6 v3 e12]8 [v5 e6 v3 e12]8
        [[v6 e6 v4 e12]4 [v6 e6 v4 e12]3 v6 e6 v5 f12]4
      `,
    },
    {
      // Lamp-post twinkles
      inst: 'glock',
      vol: 0.4,
      pan: 0.35,
      mml: `
        @glock v8 k1
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r4 o5 g4 r2 | r2 f4 r4 | r4 b4 r2 | r2 > e4 r4 |
        r1 | r2. o6 d4 | r1 | r2. e4 | r1 | r2. d4 | r1 | r2. e4 |
      `,
    },
  ],
};

export default song;
