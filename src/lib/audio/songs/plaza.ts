import type { Song } from '../mml';

// Plaza of the Americas at lunch — "Picnic on the Plaza". C major, 110 BPM. 34 bars. Form: intro 2 (marimba alone,
// a chromatic pizzicato pickup; not looped) | A 8 (pizzicato tune over rolling marimba, pizz bass) |
// B 8 (squirrel chase in A minor: tiptoe pizzicato, scurrying marimba 16ths, toms; E7 → F deceptive landing) |
// C 8 (lazy picnic: a whistled flute tune over F–Em7–Dm7–G7, almost no drums) | A' 8 (tune + flute counter-line).
const song: Song = {
  id: 'plaza',
  title: 'Picnic on the Plaza',
  bpm: 110,
  loop: true,
  echo: 0.2,
  tracks: [
    {
      // Pizzicato lead
      inst: 'pluck',
      vol: 0.86,
      mml: `
        @pluck v13 q5 l8
        r1 | r2 o5 d e f f+ | L
        ; A
        o5 g8. e16 c e g > c < g4 | a8. g16 e g a4 r4 | f8. e16 f a > c < a f4 | g r b r > d4 < g4 |
        g8. e16 c e g > c < g4 | a8. g16 e g a > c < a4 | > d c < a f g b > d < b | > c4 < g4 c4 r4 |
        ; B — squirrel chase (tiptoe)
        q3 o5 e e r e f e d+ e | d d r d e d c+ d | e e r e f e d+ e | g+ g+ r g+ a g+ f+ e |
        f f r f g f e f | g g r g a g f+ g | g+ a b > c d e d c | < a e c e < b4 > e4 |
        ; C — lazy picnic: soft arpeggios under the flute
        q6 v10 o4 f4 a4 > c4 < a4 | e4 g4 b4 g4 | d4 f4 a4 f4 | < b4 > d4 f4 d4 |
        f4 a4 > c4 < a4 | e4 g4 b4 g4 | d4 f4 a4 f4 | < b4 > d4 f4 d4 |
        ; A'
        q5 v13 o5 g8. e16 c e g > c < g4 | a8. g16 e g a4 r4 | f8. e16 f a > c < a f4 | g r b r > d4 < g4 |
        g8. e16 c e g > c < g4 | a8. g16 e g a > c < a4 | > d c < a f g b > d < b | > c4 < g4 c4 r4 |
      `,
    },
    {
      // Marimba: rolling arpeggios, the scurry in B, rests for the lazy part
      inst: 'marimba',
      vol: 0.5,
      pan: -0.3,
      mml: `
        @marimba v9 q6 l8
        o4 c g > e < g > c < g > e < g | o3 g > d b d g d b d | L
        ; A
        o4 c g > e < g > c < g > e < g | o3 a > e > c < e a e > c < e | o3 f > c a c f c a c | o3 g > d b d g d b d |
        o4 c g > e < g > c < g > e < g | o3 a > e > c < e a e > c < e | o3 d a > f < a o3 g > d b d | o4 c g > e < g > c4 < r4 |
        ; B — scurry
        l16 o4 a > c e a > c < a e c < a > c e a > c < a e c | o4 g+ b > e g+ b g+ e < b g+ b > d e g+ e d < b |
        o4 a > c e a > c < a e c < a > c e a > c < a e c | o5 e d+ e f+ g+ f+ e d < b > c < b a g+ a b g+ |
        o4 f a > c f a f c < a f a > c f a f c < a | o4 g b > d g b g d < b g b > d g b g d < b |
        o4 g+ b > d e g+ e d < b g+ b > d e g+ b g+ e | o4 a > c e a e c < a > c < g+ b > d e d < b g+ b |
        ; C
        l8 r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; A'
        o4 c g > e < g > c < g > e < g | o3 a > e > c < e a e > c < e | o3 f > c a c f c a c | o3 g > d b d g d b d |
        o4 c g > e < g > c < g > e < g | o3 a > e > c < e a e > c < e | o3 d a > f < a o3 g > d b d | o4 c g > e < g > c4 < r4 |
      `,
    },
    {
      // Flute: whistles the lazy tune, then a counter-line
      inst: 'flute',
      vol: 0.46,
      pan: 0.3,
      mml: `
        @flute v11
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; C
        o5 a2 g4 f4 | g2 e2 | f4 e4 d4 c4 | d2. r4 | a2 > c4 < a4 | g2 b4 g4 | f4 a4 g4 f4 | g2 f4 d4 |
        ; A'
        v9 o5 e1 | e1 | c1 | d1 | e1 | e1 | f2 d2 | e2. r4 |
      `,
    },
    {
      // Pizz bass
      inst: 'bass',
      vol: 0.72,
      mml: `
        @bass v12 q4 l4
        r1 | o2 g g g g | L
        ; A
        o3 c < g > c < g | o2 a e a e | f > c < f > c < | g d g d |
        o3 c < g > c < g | o2 a e a e | d a g d | o3 c < g > c r |
        ; B — the chase
        l8 o2 a a o3 a o2 a a a o3 a o2 a | e e o3 e o2 e e e o3 e o2 g+ |
        a a o3 a o2 a a a o3 a o2 a | e e o3 e o2 e e e o3 e o2 e |
        f f o3 f o2 f f f o3 f o2 f | g g o3 g o2 g g g f e |
        e e o3 e o2 e e e o3 e o2 e | a a o3 a o2 a e e o3 e o2 e |
        ; C
        q6 l2 o2 f > c < | e b | d a | g d | f > c < | e b | d a | g g |
        ; A'
        q4 l4 o3 c < g > c < g | o2 a e a e | f > c < f > c < | g d g d |
        o3 c < g > c < g | o2 a e a e | d a g d | o3 c < g > c r |
      `,
    },
    {
      inst: 'drums',
      vol: 0.45,
      mml: `
        @drums l8
        [v4 e v2 e]4 | [v4 e v2 e]3 l16 v6 d v7 d v8 d v9 d | L
        ; A
        l8 v10 'c f' v4 e v7 d v4 e v9 c v4 e v7 d v4 e | [v9 c v4 e v7 d v4 e v9 c v4 e v7 d v4 e]6 |
        v9 c v4 e v7 d v4 e v9 c v4 e l16 v7 b v8 b v9 a v10 a |
        ; B — chase
        [v9 c v5 e v6 b v5 e v9 d v5 e v6 a v5 e v9 c v5 e v6 b v6 b v9 d v5 e v6 a v7 a]7 |
        v9 c v5 e v6 b v5 e v9 d v5 e v6 a v5 e v8 b b v9 a a v10 d d v11 d d |
        ; C — lazy
        l8 [v6 c v2 e v4 e v2 e v4 e v2 e v4 e v2 e]7 | v6 c v2 e v4 e v2 e v4 e v2 e l16 v5 d v6 d v7 d v8 d |
        ; A' — claps
        l8 v10 'c f' v4 e v7 'd g' v4 e v9 c v4 e v7 'd g' v4 e | [v9 c v4 e v7 'd g' v4 e v9 c v4 e v7 'd g' v4 e]6 |
        v9 c v4 e v7 'd g' v4 e v9 c v4 e l16 v7 b v8 b v9 a v10 a |
      `,
    },
  ],
};

export default song;
