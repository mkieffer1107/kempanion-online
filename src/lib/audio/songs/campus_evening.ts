import type { Song } from '../mml';

// Golden hour. Written in C, sounds in F (k-7, a fifth down — warm register). Intro 2 (not looped) |
// A 8: e-piano sings the TITLE motif's first bar over a descending IV–iii–ii–I | B 8: the strings take a long soaring line |
// A' 8: e-piano again, bell doubles the motif, low strings counter-line | coda 4: strings play the motif in slow motion → A.
const song: Song = {
  id: 'campus_evening',
  title: 'Golden Hour on the Quad',
  bpm: 96,
  loop: true,
  echo: 0.3,
  tracks: [
    {
      // E-piano: melody in A/A', arpeggios in B and the coda
      inst: 'epiano',
      vol: 0.72,
      mml: `
        @epiano v9 q8 k-7 l8
        o4 d f a > c < a f d f | o4 g > c d f d c < g > c | L
        v12 q7
        o5 e g a4 g e d4 | e2. r4 | f a > c4 < b a g4 | g2 e4 d4 |
        e g a4 g e d4 | e4 g4 a4 > c+4 | d2 < b4 g4 | > c2. r4 |
        v8 q8
        o4 e a > c e c < a e a | o4 e g b > d < b g e g | o4 f a > c e c < a f a | o4 e g > c e c < g e g |
        o4 d f a > c < a f d f | o4 e g b > d < b g e g | o4 f a > c e c < a f a | o4 g > c d f o4 g b > d f |
        v12 q7
        o5 e g a4 g e d4 | e4 g4 b4. a | f a > c4 < b a g4 | e2 d4 c4 |
        e g a4 g e d4 | e4 g4 a4 > c+4 | d4. c < b4 g4 | > c1 |
        v8 q8
        o4 f a > c e c < a f a | o4 e g b > d < b g e g | o4 d f a > c < a f d f | o4 g > c d f d c < g > c |
      `,
    },
    {
      // Strings pad
      inst: 'strings',
      vol: 0.45,
      pan: -0.25,
      mml: `
        @strings v7 q8 k-7 o4
        'c f a'1 | 'c f g'1 | L
        'c f a'1 | '<b>d g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | '<b>d g'2 'c+ e g'2 | 'c f a'2 '<b>d f'2 | '<b>e g'1 |
        'c e g'1 | '<b>d g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | '<b>d g'1 | 'c f a'1 | 'c f g'2 '<b>d f'2 |
        'c f a'1 | '<b>d g'1 | 'c f a'1 | 'c e g'1 | 'c f a'1 | '<b>d g'2 'c+ e g'2 | 'c f a'2 '<b>d f'2 | '<b>e g'1 |
        'c f a'1 | '<b>d g'1 | 'c f a'1 | 'c f g'1 |
      `,
    },
    {
      // Strings voice: soaring B melody, low counter-line in A', the motif in slow motion for the coda
      inst: 'strings',
      vol: 0.62,
      pan: 0.2,
      mml: `
        @strings v11 q8 k-7 y3 l8
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        o5 e2 a4 > c4 | < b2. g4 | a2 > c4 e4 | d2. c4 | < a2 > d4 f4 | e2. d4 | c2 < a4 > c4 | d2 < b2 |
        v9 o4 a1 | g1 | f1 | e1 | a1 | g2 a2 | f1 | e1 |
        v11 o5 e2 g2 | a1 | g2 e2 | d1 |
      `,
    },
    {
      inst: 'bass',
      vol: 0.75,
      mml: `
        @bass v11 q7 k-7 o3 l8
        d2 a4 d4 | g2 d4 g4 | L
        f2 > c4 < f4 | e2 b4 e4 | d2 a4 d4 | c2 g4 c4 | f2 > c4 < f4 | e2 a2 | d2 g2 | c2 g4 c4 |
        a2 e4 a4 | e2 b4 e4 | f2 > c4 < f4 | e2 c4 e4 | d2 a4 d4 | e2 b4 e4 | f2 > c4 < f4 | g2 g4 f4 |
        f2 > c4 < f4 | e2 b4 e4 | d2 a4 d4 | c2 g4 c4 | f2 > c4 < f4 | e2 a2 | d2 g2 | c2 g4 c4 |
        f2 > c4 < f4 | e2 b4 e4 | d2 a4 d4 | g2 d4 g4 |
      `,
    },
    {
      // Soft groove: kick, clap on 2 and 4, hushed hats
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums l8
        r1 | r1 | L
        [v9 c v5 e e v5 e v8 c v5 e e e]4
        [v9 c v5 e v7 g v5 e v8 c c v7 g v5 e]3
        v9 c v5 e v7 g v5 e v8 b16 b16 a16 a16 v9 g v5 e
        [v9 c v5 e v7 g v5 e v8 c c v7 g v5 e]7
        v9 c v5 e v7 g v5 e v8 b16 b16 a16 a16 v9 g v5 e
        [v9 c v5 e v7 g v5 e v8 c c v7 g v5 e]7
        v9 c v5 e v7 g v5 e v8 c v7 g g16 g16 v5 e
        [v8 c v4 e e e v6 c v4 e e e]3
        v7 c v4 e e e v6 c r r4
      `,
    },
    {
      // Golden glints; doubles the motif in A'
      inst: 'bell',
      vol: 0.5,
      pan: 0.35,
      mml: `
        @bell v8 k-7 l8
        r2 o6 c2 | r2 < a2 | L
        r1 | r2 o5 b2 | r1 | r2 > e2 | r1 | r1 | r1 | r2 < g2 |
        r1 | r1 | r1 | r2 > g2 | r1 | r1 | r1 | r2 f2 |
        v9 o6 e g a4 g e d4 | r1 | r1 | r1 | e g a4 g e d4 | r1 | r1 | r2 o5 g2 |
        r1 | r1 | r1 | r2 > d2 |
      `,
    },
  ],
};

export default song;
