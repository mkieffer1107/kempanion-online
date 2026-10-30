import type { Song } from '../mml';

// Prologue: lost on the Plaza, curious. Written in C, sounds in Bb (k-2; drums untransposed); the lydian #4
// (I – II/I, "D/C") is the "wondering" sound. Intro 2 (not looped) | A 8: flute asks questions over the pluck |
// B 8: IV–iii–ii–V, then bVI–bVII ("finding the way") | C 4: breakdown, flute fragments | A' 8: the pluck takes the
// tune, flute harmonizes, marimba arpeggiates | turnaround 2 → A.
const song: Song = {
  id: 'prologue',
  title: 'First Day, Lost',
  bpm: 104,
  loop: true,
  echo: 0.25,
  tracks: [
    {
      inst: 'flute',
      vol: 0.66,
      mml: `
        @flute v12 y4 k-2 l8
        r1 | r1 | L
        o5 c e g f+4. e d | e2 r4 f+ a | b4. a f+4 d4 | e2. r4 |
        a > c e d4. c < b | a2 r4 > d e | f4. e c4 < a4 | g2 r2 |
        o5 e4. f g4 a4 | b2 g4 e4 | f4. g a4 > c4 | < b2. r4 |
        e4. f g4 a4 | b4 g4 > c+4 e4 | c4. < b- g4 e-4 | d4. f g2 |
        r2 o5 c e g f+ | e2 r2 | r1 | r1 |
        v10 o4 a > c e d4. c < b | > c2 r4 d f+ | f+4. f+ d4 < b4 | b2. r4 |
        > e a > c < b4. a g | f+2 r4 b > c | c4. < a a4 f4 | f2 r2 |
        r1 | r1 |
      `,
    },
    {
      // Pluck: arpeggios, the tune in A'
      inst: 'pluck',
      vol: 0.55,
      pan: -0.25,
      mml: `
        @pluck v9 q6 k-2 l8
        o4 c e g b > d < b g e | o4 c d f+ a > d < a f+ d | L
        o4 c e g b > d < b g e | o4 c d f+ a > d < a f+ d | o3 b > d f+ a b a f+ d | o4 e g b > d e d < b g |
        o4 c e a > c e c < a e | o4 c d f+ a > c < a f+ d | o4 c f a > c e c < a f | o4 d f g > c d c < g f |
        o4 c f a > c e c < a f | o4 e g b > d e d < b g | o4 d f a > c d c < a f | o4 d f g b > d < b g f |
        o4 c f a > c e c < a f | o4 e g b > d o4 e g a > c+ | o4 c e- a- > c e- c < a- e- | o4 d f g b- > d < b- g f |
        o4 c e g b > d < b g e | o4 c d f+ a > d < a f+ d | o4 c e g b > d < b g e | o4 c d f+ a > d < a f+ d |
        v11 q7 o5 c e g f+4. e d | e2 r4 f+ a | b4. a f+4 d4 | e2. r4 |
        a > c e d4. c < b | a2 r4 > d e | f4. e c4 < a4 | g2 r2 |
        v9 q6 o4 c e g b > d < b g e | o4 c d f+ a > d < a f+ d |
      `,
    },
    {
      // Marimba: soft tiptoe chords on 2 and 4; arpeggios while the pluck sings
      inst: 'marimba',
      vol: 0.45,
      pan: 0.3,
      mml: `
        @marimba v8 q3 k-2 l8 o4
        r4 'e g b'4 r4 'e g b'4 | r4 'd f+ a'4 r4 'd f+ a'4 | L
        r4 'e g b'4 r4 'e g b'4 | r4 'd f+ a'4 r4 'd f+ a'4 | r4 'd f+ a'4 r4 'd f+ a'4 | r4 'd g b'4 r4 'd g b'4 |
        r4 'e g > c'4 r4 'e g > c'4 | r4 'f+ a > c'4 r4 'f+ a > c'4 | r4 'f a > c'4 r4 'f a > c'4 | r4 'f g > c'4 r4 'f g > c'4 |
        r4 'f a > c'4 r4 'f a > c'4 | r4 'd g b'4 r4 'd g b'4 | r4 'f a > c'4 r4 'f a > c'4 | r4 'f g b'4 r4 'f g b'4 |
        r4 'f a > c'4 r4 'f a > c'4 | r4 'd g b'4 r4 'c+ e g'4 | r4 'e- a- > c'4 r4 'e- a- > c'4 | r4 'd f g'4 r4 'd f g'4 |
        r4 'e g b'4 r4 'e g b'4 | r4 'd f+ a'4 r4 'd f+ a'4 | r4 'e g b'4 r4 'e g b'4 | r4 'd f+ a'4 r4 'd f+ a'4 |
        v9 q6
        o4 c e g b > d < b g e | o4 c d f+ a > d < a f+ d | o3 b > d f+ a b a f+ d | o4 e g b > d e d < b g |
        o4 c e a > c e c < a e | o4 c d f+ a > c < a f+ d | o4 c f a > c e c < a f | o4 d f g > c d c < g f |
        v8 q3 r4 'e g b'4 r4 'e g b'4 | r4 'd f+ a'4 r4 'd f+ a'4 |
      `,
    },
    {
      // Tiptoe bass
      inst: 'bass',
      vol: 0.75,
      mml: `
        @bass v11 q4 k-2
        o2 c4 g4 > c4 < g4 | o2 c4 a4 > d4 < a4 | L
        o2 c4 g4 > c4 < g4 | o2 c4 a4 > d4 < a4 | o2 b4 f+4 b4 f+4 | o2 e4 b4 > e4 < b4 |
        o2 a4 e4 a4 e4 | o2 d4 a4 > d4 < a4 | o2 f4 > c4 f4 c4 | o2 g4 > d4 < g4 r4 |
        q6 o2 f2 f4 > c4 | o2 e2 e4 b4 | o2 d2 d4 a4 | o2 g2 g4 f4 | o2 f2 f4 > c4 | o2 e2 a2 | o2 a-2 a-4 > e-4 | o2 b-2 b-4 f4 |
        q4 o2 c4 r4 r2 | o2 c4 r4 r2 | o2 c4 r4 g4 r4 | o2 c4 r4 a4 r4 |
        o2 c4 g4 > c4 < g4 | o2 c4 a4 > d4 < a4 | o2 b4 f+4 b4 f+4 | o2 e4 b4 > e4 < b4 |
        o2 a4 e4 a4 e4 | o2 d4 a4 > d4 < a4 | o2 f4 > c4 f4 c4 | o2 g4 > d4 < g4 r4 |
        o2 c4 g4 > c4 < g4 | o2 c4 a4 > d4 < a4 |
      `,
    },
    {
      // Light percussion: shaker hats, woodblock (high tom), soft kick
      inst: 'drums',
      vol: 0.45,
      mml: `
        @drums l16
        [v5 e v3 e v4 e v3 e]8 | L
        [v9 c v5 e v6 e v5 e v6 b v5 e v6 e v5 e v8 c v5 e v7 c v5 e v6 b v5 e v6 e v5 e]7
        v9 c v5 e v6 e v5 e v6 b v5 e v6 e v5 e v7 b b a a v8 a a b b
        [v9 c8 v5 e8 v7 d8 v5 e8 v9 c8 v5 e8 v7 d8 v5 e8]7
        v9 c8 v5 e8 v7 d8 v5 e8 v7 b b b b v8 a a a a
        [v7 b8 r8 r8 b8 r8 r8 a8 r8]4
        [v9 c v5 e v6 e v5 e v6 b v5 e v6 e v5 e v8 c v5 e v7 c v5 e v6 b v5 e v6 e v5 e]7
        v9 c v5 e v6 e v5 e v6 b v5 e v6 e v5 e v7 b b a a v8 a a b b
        [v5 e v3 e v4 e v3 e]7 v6 b b a a
      `,
    },
  ],
};

export default song;
