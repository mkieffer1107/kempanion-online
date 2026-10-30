import type { Song } from '../mml';

// Title theme. C major, royal road (IV–V–iii–vi). Form: intro 4 (epiano + bell foreshadow, not looped) |
// A 8 (TITLE motif on pulse25) | B 8 (chorus, lands on C for the first time) | breakdown 4 (bell sings the motif) |
// A' 8 (motif + flute harmony, ends on Am with a C–D pickup back into the motif).
const song: Song = {
  id: 'title',
  title: 'Sakura Login',
  bpm: 90,
  loop: true,
  echo: 0.3,
  tracks: [
    {
      // Melody
      inst: 'pulse25',
      vol: 0.78,
      mml: `
        @pulse25 v13 y4 l8
        r1 | r1 | r1 | r1 | L
        ; A — TITLE motif
        o5 e g a4 g e d4 | c d e4 d4 r4 | g a b4 > d < b a4 | e2 r4 c d |
        e g a4 g e d4 | c d e4 d e g4 | e g a4 a b > c+4 | d4 c < b > c4 d4 |
        ; B — chorus
        o5 a4 > c4 e4. d | c4 < a4 g2 | g a b4 > d4 < b4 | > c2. r4 |
        < a4 > c4 e4. d | c4 e4 g4. f | e4 d4 c4 < a4 | > c2 < b2 |
        ; breakdown — the bell has it
        r1 | r1 | r1 | r1 |
        ; A'
        o5 e g a4 g e d4 | c d e4 g4 r4 | g a b4 > d < b a4 | > c2 < b4 a g |
        e g a4 g e d4 | c d e4 d e g4 | b4. a g4 e4 | a2 r4 c d |
      `,
    },
    {
      // Bell foreshadow / chimes, flute harmony in the chorus and A'
      inst: 'bell',
      vol: 0.62,
      pan: 0.3,
      mml: `
        @bell v9 l8
        r1 | r1 | o5 e4 g4 a2 | g4 e4 d2 | L
        @bell v7 o6 c1 | r1 | d1 | r1 | c1 | r1 | e1 | r1 |
        @flute v10 y3 o5 e4 a4 > c4. < b | a4 c4 e2 | e f g4 b4 g4 | e2. r4 |
        e4 a4 > c4. < b | a4 > c4 e4. d | c4 < a4 a4 f4 | f2 d2 |
        @bell v10 o5 e g a4 g e d4 | c d e4 d4 r4 | g a b4 > d < b a4 | e2 r2 |
        @flute v9 o5 c e e4 e c < a4 | a g > c4 e4 r4 | e e g4 b g e4 | a2 g4 e d |
        c e e4 e c < a4 | a g > c4 < b g b4 | > g4. f+ e4 < b4 | > e2 r4 < a b |
      `,
    },
    {
      // Electric piano arpeggios (sustained chords in the breakdown)
      inst: 'epiano',
      vol: 0.6,
      pan: -0.3,
      mml: `
        @epiano v9 q8 l8
        o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d < b g e g | o4 e a > c e c < a e a | L
        o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d < b g e g | o4 e a > c e c < a e a |
        o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d o4 a > c+ e g | o4 d f a > c o4 g > c d f |
        v10
        o4 e a > c e c < a e a | o4 f a > c e c < a f a | o4 g b > d g d < b g b | o4 c g > d e d < g e g |
        o4 e a > c e c < a e a | o4 f a > c e c < a f a | o4 d f a > c < a f d f | o4 g > c d g d < b g b |
        v9
        o4 'a > c e'2 'a > c e'2 | 'g > c d'2 'g b > d'2 | 'g b > d'2 'g b > d'2 | 'a > c e'2 'g > c e'2 |
        [o4 f a > c e c < a f a | o4 g > c d g d < b g b | o4 e g b > d < b g e g | o4 e a > c e c < a e a]2
      `,
    },
    {
      // Strings pad
      inst: 'strings',
      vol: 0.55,
      pan: 0.1,
      mml: `
        @strings q8 o4
        r1 | r1 | r1 | r1 | L
        r1 | r1 | r1 | r1 |
        v7 'c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'2 'c+ e g'2 | 'c f a'2 'c f g'2 |
        v9 'c e g'1 | 'c f a'1 | '<b>d g'1 | 'c e g'1 | 'c e g'1 | 'c f a'1 | 'c f a'1 | 'c d g'2 '<b>d g'2 |
        v8 'c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'1 | 'c e g'1 |
        [v8 'c f a'1 | 'c d g'2 '<b>d g'2 | '<b>d g'1 | 'c e g'1]2
      `,
    },
    {
      // Bass
      inst: 'bass',
      vol: 0.8,
      mml: `
        @bass v11 o2 l8
        r1 | r1 | r1 | r1 | L
        f2 c2 | g2 d2 | e2 b2 | a2 e2 |
        f4. f f4 c4 | g4. g g4 d4 | e4. e a4. a | d4. d g4. g |
        v12
        a a a a a a a g | f f f f f f f f+ | g g g g g g g b | > c c c c c c < g g |
        a a a a a a a g | f f f f f f e e | d d d d d d d f+ | g g g g g g g g |
        v10 f1 | g1 | e1 | a1 |
        v11 [f4. f f4 c4 | g4. g g4 d4 | e4. e e4 b4 | a4. a a4 e4]2
      `,
    },
    {
      // Drums: half-time ballad groove, out for the breakdown
      inst: 'drums',
      vol: 0.55,
      mml: `
        @drums l8
        r1 | r1 | r1 | r1 | L
        [v10 c4 v6 e e v9 d4 v6 e e]4
        [v11 c v7 e e v11 c v10 d v7 e e e]3
        v11 c v7 e v10 d v7 e v9 b16 b16 b16 a16 v10 a16 a16 d
        [v11 c v7 e e v11 c v10 d v7 e e e]7
        v11 c v7 e v10 d v7 e v9 b16 b16 b16 a16 v10 a16 a16 d
        r1 | r1 | r1 | r2 v6 d16 d16 v7 d16 d16 v8 d16 d16 v9 d16 d16 |
        v11 'c f' v7 e e v11 c v10 d v7 e e e
        [v11 c v7 e e v11 c v10 d v7 e e e]6
        v11 c v7 e v10 d v7 e v9 b16 b16 b16 a16 v10 a16 a16 d
      `,
    },
  ],
};

export default song;
