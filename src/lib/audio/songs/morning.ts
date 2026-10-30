import type { Song } from '../mml';

// Morning. Written in C, sounds in D (k2; drums untransposed). Intro 2 (not looped): the glock alarm rings, a pluck
// stretches awake | A 8: glock tune over I–IV/I (lydian float) | B 8: pluck sings, ends on a sus4→3 |
// C 4: "snooze" breakdown, the alarm motif returns | A' 8: glock + pluck harmony → A.
const song: Song = {
  id: 'morning',
  title: 'Alarm Clock Sakura',
  bpm: 108,
  loop: true,
  echo: 0.22,
  tracks: [
    {
      inst: 'glock',
      vol: 0.81,
      mml: `
        @glock v12 k2 l8
        o6 e16 e16 e16 e16 r4 e16 e16 e16 e16 r4 | r1 | L
        o5 e g > c d e4 d c | < a2 r4 g a | g e g > c e4 d c | < a2. r4 |
        a > c e d c4 < a4 | > d4 c < a f4 a4 | g2 > c4 d4 | < b2 g4 r4 |
        v7 r1 | r2 o6 c4 r4 | r1 | r2 < a4 r4 | r1 | r2 > d4 r4 | r1 | r2 e4 r4 |
        v11 o6 e16 e16 e16 e16 r4 e16 e16 e16 e16 r4 | f16 f16 f16 f16 r4 f16 f16 f16 f16 r4 |
        e16 e16 e16 e16 r4 e16 e16 e16 e16 r4 | d16 d16 d16 d16 r4 < b16 b16 b16 b16 r4 |
        v12 o5 e g > c d e4 d c | < a2 r4 g a | g e g > c e4 d c | < a2. r4 |
        a > c e d c4 < a4 | > d4 c < a f4 a4 | g2 > c4 d4 | < b2 g4 r4 |
      `,
    },
    {
      // Pluck: arps, the B melody, harmony in A'
      inst: 'pluck',
      vol: 0.72,
      pan: -0.25,
      mml: `
        @pluck v9 q6 k2 l8
        r1 | o5 c d e g > c4 r4 | L
        o4 c g > c e c < g e g | o4 c a > c f c < a f a | o4 c g > c e c < g e g | o4 c a > c f c < a f a |
        o4 e a > c e c < a g a | o4 d a > c f c < a f a | o4 d g > c f c < g f g | o4 d g b > f < b g f g |
        v12 q7 o5 c4 f4 a4 g4 | g4. f e4 d4 | e4 g4 b4 a4 | a2. r4 | f4 a4 > c4 < b4 | b4. a g4 d4 | f2. g4 | e2. r4 |
        v8 q6 o4 c g > c e c < g e g | o4 c a > c f c < a f a | o4 c g > c e c < g e g | o4 d g b > f < b g f g |
        v9 q7 o5 c e g b > c4 < b g | f2 r4 e f | e c e g > c4 < b g | f2. r4 |
        e a > c < b a4 e4 | a4 a f d4 f4 | d2 g4 a4 | g2 d4 r4 |
      `,
    },
    {
      inst: 'strings',
      vol: 0.52,
      pan: 0.25,
      mml: `
        @strings v6 q8 k2 o4
        r1 | r1 | L
        'c e g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | 'c f g'1 | '<b > d f'1 |
        'c f a'1 | '<b > d g'1 | '<b > d g'1 | 'c e g'1 | 'c f a'1 | '<b > d g'1 | 'c f g'1 | 'c e g'1 |
        'c e g'1 | 'c f a'1 | 'c e g'1 | '<b > d f'1 |
        'c e g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | 'c f g'1 | '<b > d f'1 |
      `,
    },
    {
      inst: 'bass',
      vol: 0.98,
      mml: `
        @bass v11 q4 k2 o2
        r1 | r1 | L
        c4 g4 > c4 < g4 | c4 a4 > c4 < a4 | c4 g4 > c4 < g4 | c4 a4 > c4 < a4 |
        a4 > e4 < a4 > e4 < | d4 a4 > d4 < a4 | g4 > d4 < g4 > d4 < | g4 > d4 < g4 b4 |
        f4 > c4 < f4 > c4 < | g4 > d4 < g4 > d4 < | e4 b4 > e4 < b4 | a4 > e4 < a4 > e4 < |
        d4 a4 > d4 < a4 | g4 > d4 < g4 > d4 < | > c4 < g4 > c4 < g4 | > c4 < g4 > c4 < g4 |
        > c4 r4 c4 r4 | c4 r4 c4 r4 | c4 r4 c4 r4 < | g4 r4 g8 a8 b4 |
        c4 g4 > c4 < g4 | c4 a4 > c4 < a4 | c4 g4 > c4 < g4 | c4 a4 > c4 < a4 |
        a4 > e4 < a4 > e4 < | d4 a4 > d4 < a4 | g4 > d4 < g4 > d4 < | g4 > d4 < g4 b4 |
      `,
    },
    {
      inst: 'drums',
      vol: 0.65,
      mml: `
        @drums l8
        r1 | r1 | L
        [v9 c v6 e v7 d v6 e v9 c v6 e v7 d v6 e]7
        v9 c v6 e v7 d v6 e v8 b16 b16 a16 a16 v9 d16 d16 d16 d16
        [v10 c v6 e v8 g v6 e v10 c c v8 g v6 e]7
        v10 c v6 e v8 g v6 e v8 b16 b16 a16 a16 v9 d16 d16 d16 d16
        [v9 c v5 e v5 e v5 e v8 c v5 e v5 e v5 e]3
        v8 d16 d16 d16 d16 v9 d16 d16 d16 d16 v10 d16 d16 d16 d16 v11 d16 d16 d16 d16
        [v9 c v6 e v7 d v6 e v9 c v6 e v7 d v6 e]7
        v9 c v6 e v7 d v6 e v8 b16 b16 a16 a16 v9 d16 d16 d16 d16
      `,
    },
  ],
};

export default song;
