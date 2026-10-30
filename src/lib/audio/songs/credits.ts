import type { Song } from '../mml';

// Credits medley, 46 bars, loops from the top. Carillon intro (Westminster-style changes, public domain) |
// TITLE motif, C (royal road; ii–V into G) | Piggy 1 "Rally!", G major, square lead (ends on D) |
// Piggy 2 "Perfusion", D dorian over a lub-dub kick (D major → D minor) | Piggy 3 "So I Was Thinking", F lydian,
// triangle + e-piano arps | finale: the title chorus with everyone, a big C, one bar of breath, and the bells again.
const song: Song = {
  id: 'credits',
  title: 'See You Next Semester',
  bpm: 96,
  loop: true,
  echo: 0.3,
  tracks: [
    {
      // Lead: changes voice for each character
      inst: 'pulse25',
      vol: 0.75,
      mml: `
        @pulse25 v13 y4 l8
        r1 | r1 | r1 | r1 |
        ; TITLE
        o5 e g a4 g e d4 | c d e4 d4 r4 | g a b4 > d < b a4 | e2 r4 c d |
        e g a4 g e d4 | c d e4 d e g4 | e g a4 a b > c+4 | c4 < a b > c4 < a4 |
        ; Piggy 1 — Rally!
        @pulse50 v12 y0
        r o5 g g b > d4. < b | > c d < b g a4 g4 | r g g b > d4. < b | > c d < b g a4 b4 |
        > c4 e4 d4 c4 | < b4 > d4 < a4 b4 | a4 > c4 < b4 a4 | f+4 a4 > d2 |
        ; Piggy 2 — Perfusion
        @pulse50 v12 q6
        o4 d4 a4 g f e f | d2 c4 d4 | b4 a4 g a b4 | > d2. r4 |
        o5 d4 a4 g f e f | d2 c4 d4 | f4 d4 c4 < b-4 | > c2 e2 |
        ; Piggy 3 — So I Was Thinking
        @tri v13 q7 y3
        o5 f a > c < b a4 r > c | < b g a f g4 r4 | f a > c < b a4 r > c | < b > c d e f4 r4 |
        < f4 a4 > c4 < b4 | a2 r4 g4 | b4 g4 a4 e4 | f2 g2 |
        ; finale — the chorus
        @pulse25 v13 q7 y4
        o5 a4 > c4 e4. d | c4 < a4 g2 | g a b4 > d4 < b4 | > c2. r4 |
        < a4 > c4 e4. d | c4 e4 g4. f | e4 d4 c4 < a4 | > c2 < b2 |
        > c1 | r1 |
      `,
    },
    {
      // Carillon
      inst: 'bell',
      vol: 0.65,
      pan: 0.25,
      mml: `
        @bell v11 l4
        o5 e d c < g | > c e d < g | > e c d < g | g > d e c |
        v8 o6 c1 | r1 | d1 | r1 | c1 | r1 | e1 | r1 |
        v8 o6 d1 | r1 | e1 | r1 | e1 | r1 | c1 | r1 |
        v7 o5 a1 | r1 | b1 | r1 | a1 | r1 | f1 | r1 |
        v8 o6 e1 | r1 | e1 | r1 | < a1 | r1 | > d1 | r1 |
        v10 o5 e1 | c1 | d1 | e1 | e1 | c1 | d1 | d2 < b2 |
        v11 o5 'c e g > c'1 | r1 |
      `,
    },
    {
      // Arpeggios: e-piano, pluck for Piggy 1, steady chords for Piggy 2
      inst: 'epiano',
      vol: 0.55,
      pan: -0.3,
      mml: `
        @epiano v8 q8 l8
        r1 | r1 | r1 | r1 |
        o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d < b g e g | o4 e a > c e c < a e a |
        o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d o4 a > c+ e g | o4 e a > c e o4 f+ a > c d |
        @pluck v10 q6
        o4 g b > d g d < b g b | o4 e g > c e c < g e g | o4 e g b > d < b g e g | o4 g > c e g o4 f+ a > c d |
        o4 e g > c e c < g e g | o3 b > d g b g d < b > d | o4 e a > c e c < a e a | o4 f+ a > d f+ d < a f+ a |
        @epiano v8 q8
        o5 'd a > d'2 'd a > d'2 | 'd a > d'2 'c e g'4 'd a > d'4 | 'd g b'2 'd g b'2 | 'd f a'1 |
        o4 'd a > d'2 'd a > d'2 | 'd a > d'2 'c e g'4 'd a > d'4 | 'd f b-'2 'd f b-'2 | 'c e g'2 'c e g'2 |
        v9
        o4 f a > c e c < a f a | o4 f g b > d < b g f g | o4 f a > c e c < a f a | o4 f a > c e c < a f a |
        o4 f a > c e c < a f a | o4 f g b > d < b g f g | o4 e g b > d < b g e g | o4 d f a > c o4 f g b > d |
        o4 e a > c e c < a e a | o4 f a > c e c < a f a | o4 g b > d g d < b g b | o4 c g > d e d < g e g |
        o4 e a > c e c < a e a | o4 f a > c e c < a f a | o4 d f a > c < a f d f | o4 g > c d g d < b g b |
        o4 'c e g > c'1 | r1 |
      `,
    },
    {
      // Strings pad
      inst: 'strings',
      vol: 0.5,
      pan: 0.1,
      mml: `
        @strings v8 q8 o4
        'c e g'1 | 'c e a'1 | 'c f a'1 | 'c e g'1 |
        'c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'1 | 'c e g'1 | 'c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'2 'c+ e g'2 | 'c e g'2 'c f+ a'2 |
        'd g b'1 | 'c e g'1 | 'd g b'1 | 'c e g'2 'c f+ a'2 | 'c e g'1 | 'd g b'1 | 'c e a'1 | 'd f+ a'1 |
        v7 'd a > d'1 | 'd a > d'2 'c e g'4 'd a > d'4 | 'd g b'1 | 'd f a'1 | 'd a > d'1 | 'd a > d'2 'c e g'4 'd a > d'4 | 'd f b-'1 | 'c e g'1 |
        'c f a'1 | 'd g b'1 | 'c f a'1 | 'c f a'1 | 'c f a'1 | 'd g b'1 | '<b>d g'1 | 'c f a'2 '<b>d f'2 |
        v9 'c e g'1 | 'c f a'1 | '<b>d g'1 | 'c e g'1 | 'c e g'1 | 'c f a'1 | 'c f a'1 | 'c d g'2 '<b>d g'2 |
        'c e g'1 | r1 |
      `,
    },
    {
      inst: 'bass',
      vol: 0.8,
      mml: `
        @bass v11 o2 l8
        c1 | a1 | f1 | c1 |
        f2 c2 | g2 d2 | e2 b2 | a2 e2 | f4. f f4 c4 | g4. g g4 d4 | e4. e a4. a | a4. a d4. d |
        v12
        g g g g g g a b | > c c c c c c < g g | e e e e e e f+ g | > c c c c d d d d < |
        > c c c c c c c c < | b b b b b b b b | a a a a a a a a | d d d d f+ f+ a a |
        q4 d4 d4 d4 d4 | d4 d4 > c4 < d4 | d4 d4 d4 d4 | d4 d4 d4 d4 |
        d4 d4 d4 d4 | d4 d4 > c4 < d4 | b-4 b-4 b-4 b-4 | > c4 c4 c4 c4 < |
        q7 f4. f f4 r4 | f4. f f4 r4 | f4. f f4 r4 | f4. f f4 r4 |
        f2 > c2 < | f2 f2 | e2 b2 | d2 g2 |
        a a a a a a a g | f f f f f f f f+ | g g g g g g g b | > c c c c c c < g g |
        a a a a a a a g | f f f f f f e e | d d d d d d d f+ | g g g g g g g g |
        > c1 < | r1 |
      `,
    },
    {
      inst: 'drums',
      vol: 0.55,
      mml: `
        @drums l8
        r1 | r1 | r1 | r1 |
        [v10 c4 v6 e e v9 d4 v6 e e]4
        [v11 c v7 e e v11 c v10 d v7 e e e]3
        v11 c v7 e v10 d v7 e v9 b16 b16 b16 a16 v10 a16 a16 d
        v12 'c f' v7 e v10 d v7 e v11 c c v10 d v7 e
        [v11 c v7 e v10 d v7 e v11 c c v10 d v7 e]6
        v11 c v7 e v10 d v7 e v10 d16 d16 b16 b16 a16 a16 d
        [v12 c16 v9 c16 r v6 e4 v12 c16 v9 c16 r v6 e4]7
        v12 c16 v9 c16 r v6 e4 v9 a a b b
        [v9 c4 v6 e e v8 d4 v6 e e]7
        v9 c4 v6 e e v8 b16 b16 a16 a16 v10 d d
        v12 'c f' v7 e v10 d v7 e v11 c c v10 d v7 e
        [v11 c v7 e v10 d v7 e v11 c c v10 d v7 e]6
        v11 c v7 e v10 d d v11 b16 b16 b16 b16 a16 a16 a16 a16
        v12 'c f'2 r2 | r1 |
      `,
    },
    {
      // Harmony voice: Piggy 1's second square, Piggy 2's triangle shadow, flute in the finale
      inst: 'pulse12',
      vol: 0.5,
      pan: -0.2,
      mml: `
        @pulse12 v9 l8
        r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r o5 e e g b4. g | a b g e e4 e4 | r e e g b4. g | a b g e f+4 d4 |
        a4 > c4 < b4 a4 | g4 b4 f+4 g4 | f+4 a4 g4 f+4 | d4 f+4 a2 |
        @tri v10 q6 o3 d4 a4 g f e f | d2 c4 d4 | b4 a4 g a b > c | d2. r4 |
        r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        @flute v10 q7 y3 o5 e4 a4 > c4. < b | a4 c4 e2 | e f g4 b4 g4 | e2. r4 |
        e4 a4 > c4. < b | a4 > c4 e4. d | c4 < a4 a4 f4 | f2 d2 |
        e1 | r1 |
      `,
    },
  ],
};

export default song;
