import type { Song } from '../mml';

// Home theme. Written in C, sounds in Eb (k3; drums untransposed). 32 bars:
// A 8: marimba tune over a walking-down bass (C–B–A–G–F) with a cozy minor iv (Fm6), e-piano on the offbeats |
// B 8: the e-piano sings, marimba comps | breakdown 4 | A' 8: marimba + e-piano harmony | tag 4 → A.
const song: Song = {
  id: 'dorm',
  title: 'Sakura House',
  bpm: 92,
  loop: true,
  echo: 0.22,
  tracks: [
    {
      inst: 'marimba',
      vol: 0.86,
      mml: `
        @marimba v13 k3 l8
        o5 c4 e g a4 g4 | e4 g+ b > d4 < b4 | > c4 < a g e4 c4 | e2 b-4 g4 |
        a4 g a > c4 < a4 | a-4 g f d4 f4 | e4 g4 d4 f4 | e2. r4 |
        v9 q4 o4 r 'a > c e' r 'a > c e' r 'a > c e' r 'a > c e' | r 'f g b' r 'f g b' r 'f g b' r 'f g b' |
        r 'g b > d' r 'g b > d' r 'g > c+ e' r 'g > c+ e' | r 'f a > c' r 'f a > c' r 'f a > c' r 'f a > c' |
        r 'a > c e' r 'a > c e' r 'a > c e' r 'a > c e' | r 'f g b' r 'f g b' r 'f g b' r 'f g b' |
        r 'g b > d' r 'g b > d' r 'g > c+ e' r 'g > c+ e' | r 'f a > c' r 'f a > c' r 'f g b' r 'f g b' |
        v8 'e g > c' r 'e g > c' r r 'e g > c' r4 | 'e a > c' r 'e a > c' r r 'e a > c' r4 |
        'f a > c' r 'f a > c' r r 'f a > c' r4 | 'f g b' r 'f g b' r r 'f g b' r4 |
        v13 q7 o5 c4 e g a4 g4 | e4 g+ b > d4 < b4 | > c4 < a g e4 c4 | e2 b-4 g4 |
        a4 g a > c4 < a4 | a-4 g f d4 f4 | e4 g4 d4 f4 | c2. r4 |
        v12 a2. g4 | a-2. g4 | e2 c+2 | d2 < b2 |
      `,
    },
    {
      // E-piano: offbeat comp, sings B, harmony in A'
      inst: 'epiano',
      vol: 0.67,
      pan: -0.25,
      mml: `
        @epiano v8 q4 k3 l8 o4
        r 'e g > c' r 'e g > c' r 'e g > c' r 'e g > c' | r 'd e g+' r 'd e g+' r 'd e g+' r 'd e g+' |
        r 'e a > c' r 'e a > c' r 'e a > c' r 'e a > c' | r 'e b- > c' r 'e b- > c' r 'e b- > c' r 'e b- > c' |
        r 'f a > c' r 'f a > c' r 'f a > c' r 'f a > c' | r 'f a- > d' r 'f a- > d' r 'f a- > d' r 'f a- > d' |
        r 'e g > c' r 'e g > c' r 'f g b' r 'f g b' | r 'e g > c' r 'e g > c' r 'e g > c' r 'e g > c' |
        v12 q7 o5 > c4. < a g4 e4 | f4. e d4 < b4 | > e4 g4 a4 g4 | f2. r4 |
        > c4. < a g4 e4 | f4. e d4 g4 | b4 g4 a4 > c+4 | d4 c4 < b4 g4 |
        v7 q8 o4 'e g > c'1 | 'e a > c'1 | 'f a > c'1 | 'f g b'1 |
        v9 q7 o4 g4 > c e c4 e4 | < b4 > e g+ b4 g+4 | a4 e e c4 < a4 | > c2 g4 e4 |
        f4 e f a4 f4 | f4 e- d < a-4 > d4 | c4 e4 < b4 > d4 | c2. r4 |
        v8 q4 o4 r 'f a > c' r 'f a > c' r 'f a > c' r 'f a > c' | r 'f a- > d' r 'f a- > d' r 'f a- > d' r 'f a- > d' |
        r 'g b > d' r 'g b > d' r 'g > c+ e' r 'g > c+ e' | r 'f a > c' r 'f a > c' r 'f g b' r 'f g b' |
      `,
    },
    {
      // Bouncy octave bass
      inst: 'bass',
      vol: 0.92,
      mml: `
        @bass v12 q5 k3 l8
        o2 c r > c < c r c > c < c | o1 b r > b < b r b > b < b | o1 a r > a < a r a > a < a | o1 g r > g < g r g > g < g |
        o1 f r > f < f r f > f < f | o1 f r > f < f r f > f < f | o1 g r > g < g r g > g < g | o2 c r > c < c r c d e |
        [o2 f r > f < f r f > f < f | o2 g r > g < g r g > g < g | o2 e r > e < e a r > a < a | o2 d r > d < d r d > d < d]2
        o2 c4 r4 c4 r4 | o1 a4 r4 a4 r4 | o2 d4 r4 d4 r4 | o1 g4 r4 g4 g b |
        o2 c r > c < c r c > c < c | o1 b r > b < b r b > b < b | o1 a r > a < a r a > a < a | o1 g r > g < g r g > g < g |
        o1 f r > f < f r f > f < f | o1 f r > f < f r f > f < f | o1 g r > g < g r g > g < g | o2 c r > c < c r c d e |
        o2 f r > f < f r f > f < f | o2 f r > f < f r f > f < f | o2 e r > e < e a r > a < a | o2 d r > d < d g r > g < g |
      `,
    },
    {
      inst: 'drums',
      vol: 0.57,
      mml: `
        @drums l8
        [v9 c v5 e v6 g v5 e v8 c v5 e v6 g v5 e]7
        v9 c v5 e v6 g v5 e v8 b16 b16 a16 a16 v9 g v6 g
        [v9 c v5 e v6 g v5 e v8 c c v6 g v5 f]7
        v9 c v5 e v6 g v5 e v8 b16 b16 a16 a16 v9 g v6 g
        [v8 c4 v5 e4 v8 c4 v5 e4]3
        v6 g g v7 g g v8 g g v9 g g
        [v9 c v5 e v6 g v5 e v8 c v5 e v6 g v5 e]7
        v9 c v5 e v6 g v5 e v8 b16 b16 a16 a16 v9 g v6 g
        [v9 c v5 e v6 g v5 e v8 c c v6 g v5 f]3
        v9 c v5 e v6 g v5 e v8 b16 b16 a16 a16 v8 a16 a16 b16 b16
      `,
    },
    {
      inst: 'pad',
      vol: 0.44,
      pan: 0.25,
      mml: `
        @pad v6 q8 k3 o4
        'c e g'1 | '<b > d e g+'1 | 'c e g'1 | '<b- > c e g'1 | 'c f a'1 | 'c f a-'1 | 'c e g'2 '<b > d f'2 | 'c e g'1 |
        ['c f a'1 | '<b > d f'1 | '<b > d g'2 'c+ e g'2 | 'c f a'1]2
        'c e g'1 | 'c e g'1 | 'c f a'1 | '<b > d f'1 |
        'c e g'1 | '<b > d e g+'1 | 'c e g'1 | '<b- > c e g'1 | 'c f a'1 | 'c f a-'1 | 'c e g'2 '<b > d f'2 | 'c e g'1 |
        'c f a'1 | 'c f a-'1 | '<b > d g'2 'c+ e g'2 | 'c f a'2 '<b > d f'2 |
      `,
    },
  ],
};

export default song;
