import type { Song } from '../mml';

// Marston Science Library after dark. G mixolydian (the F natural is the lamp-light colour), 84 BPM swing lofi
// (8ths written as 6 + 12 triplets). 30 bars. Form: intro 2 (comping alone; not looped) | A 8 (e-piano melody over
// G9–F6/9–Em7–Dm7, Cmaj7–Bm7♭5–Am7–D7sus4) | B 8 (a late-night thought climbs over Cmaj7–Dm7–Em7–Fmaj7,
// G7sus4→G7) | A' 8 (new ending) | breakdown 4 (G9 ⇄ F6/9, just the bass, brushes and the record crackle).
const song: Song = {
  id: 'library',
  title: 'Marston After Dark',
  bpm: 84,
  loop: true,
  echo: 0.3,
  tracks: [
    {
      // E-piano melody (right hand)
      inst: 'epiano',
      vol: 0.8,
      mml: `
        @epiano v12 q7
        r1 | r1 | L
        ; A
        o5 d6 e12 d6 < b12 a4 r4 | r6 > c12 d6 f12 a6 g12 f4 | g4 e6 d12 e2 | r4 f6 e12 d6 c12 < a4 |
        > e6 g12 b6 > d12 c4 < b4 | a6 f12 d6 < b12 > d2 | c6 e12 g6 a12 g4 e4 | d2. r4 |
        ; B
        o5 e4 r6 d12 e6 g12 b4 | a4 r6 f12 a6 > c12 d4 < | b4 r6 g12 b6 > d12 e4 < | a2 g4 e4 |
        e4 r6 d12 e6 g12 b4 | a4 r6 f12 a6 > c12 d4 < | a4 > c4 < a4 e4 | c4 d4 < b4 r4 |
        ; A'
        o5 d6 e12 d6 < b12 a4 r4 | r6 > c12 d6 f12 a6 g12 f4 | g4 e6 d12 e2 | r4 f6 e12 d6 c12 < a4 |
        > g6 e12 g6 b12 > d4 c4 | o5 b6 a12 f6 d12 f2 | e6 g12 a6 > c12 < a4 g4 | g2. r4 |
        ; breakdown
        r1 | r1 | r1 | r1 |
      `,
    },
    {
      // E-piano comping (left hand)
      inst: 'epiano',
      vol: 0.46,
      pan: -0.3,
      mml: `
        @epiano v8 q7 o4
        'f a b > d'2 r6 'f a b > d'12 r4 | 'd g a > c'2 r6 'd g a > c'12 r4 | L
        ; A
        'f a b > d'2 r6 'f a b > d'12 r4 | 'd g a > c'2 r6 'd g a > c'12 r4 | 'd g b'2 r6 'd g b'12 r4 | 'c f a'2 r6 'c f a'12 r4 |
        'e g b'2 r6 'e g b'12 r4 | 'd f a'2 r6 'd f a'12 r4 | 'g > c e'2 r6 'g > c e'12 r4 | 'g a > c'2 r6 'g a > c'12 r4 |
        ; B
        'e g b'2 r6 'e g b'12 r4 | 'c f a'2 r6 'c f a'12 r4 | 'd g b'2 r6 'd g b'12 r4 | 'c e a'2 r6 'c e a'12 r4 |
        'e g b'2 r6 'e g b'12 r4 | 'c f a'2 r6 'c f a'12 r4 | 'c e a'2 r6 'c e a'12 r4 | 'f > c d'2 'f b > d'2 |
        ; A'
        'f a b > d'2 r6 'f a b > d'12 r4 | 'd g a > c'2 r6 'd g a > c'12 r4 | 'd g b'2 r6 'd g b'12 r4 | 'c f a'2 r6 'c f a'12 r4 |
        'e g b'2 r6 'e g b'12 r4 | 'd f a'2 r6 'd f a'12 r4 | 'g > c e'2 r6 'g > c e'12 r4 | 'g a > c'2 r6 'g a > c'12 r4 |
        ; breakdown
        [v7 'f a b > d'2 r6 'f a b > d'12 r4 | 'd g a > c'2 r6 'd g a > c'12 r4 |]2
      `,
    },
    {
      inst: 'bass',
      vol: 0.7,
      mml: `
        @bass v11 q6
        r1 | r1 | L
        ; A
        o2 g2 r6 g12 d4 | f2 r6 f12 > c4 < | e2 r6 e12 b4 | d2 r6 d12 a4 |
        o3 c2 r6 c12 < g4 | b2 r6 b12 f4 | a2 r6 a12 e4 | d2 r6 d12 a4 |
        ; B
        o3 c2 r6 c12 < g4 | d2 r6 d12 a4 | e2 r6 e12 b4 | f2 r6 f12 > c4 < |
        o3 c2 r6 c12 < g4 | d2 r6 d12 a4 | f2 r6 f12 > c4 < | g2 r6 g12 d4 |
        ; A'
        o2 g2 r6 g12 d4 | f2 r6 f12 > c4 < | e2 r6 e12 b4 | d2 r6 d12 a4 |
        o3 c2 r6 c12 < g4 | b2 r6 b12 f4 | a2 r6 a12 e4 | d2 r6 d12 a4 |
        ; breakdown
        [o2 g2 r6 g12 d4 | f2 r6 f12 > c4 < |]2
      `,
    },
    {
      // Brushy boom-bap swing
      inst: 'drums',
      vol: 0.5,
      mml: `
        @drums
        r1 | [v3 e6 v2 e12]4 | L
        ; A
        [v8 c6 v3 e12 v6 d6 v3 e12 v4 e6 v7 c12 v6 d6 v4 e12 |]7
        v8 c6 v3 e12 v6 d6 v3 e12 v5 d12 v5 d12 v6 d12 v6 d12 v7 d12 v7 d12 |
        ; B
        [v8 c6 v3 e12 v6 d6 v3 e12 v4 e6 v7 c12 v6 d6 v4 e12 |]7
        v8 c6 v3 e12 v6 d6 v3 e12 v5 d12 v5 d12 v6 d12 v6 d12 v7 d12 v7 d12 |
        ; A'
        [v8 c6 v3 e12 v6 d6 v3 e12 v4 e6 v7 c12 v6 d6 v4 e12 |]7
        v8 c6 v3 e12 v6 d6 v3 e12 v5 d12 v5 d12 v6 d12 v6 d12 v7 d12 v7 d12 |
        ; breakdown — kick and brushes
        [v7 c6 v3 e12 v4 e6 v3 e12 v4 e6 v6 c12 v4 e6 v3 e12 |]3
        v7 c6 v3 e12 v4 e6 v3 e12 v4 d12 v5 d12 v5 d12 v6 d12 v6 d12 v7 d12 |
      `,
    },
    {
      // Record crackle
      inst: 'noise',
      vol: 0.5,
      pan: 0.15,
      mml: `
        @noise q1
        r8 o6 v6 c32 r32 r16 r4 r8. o7 v8 c32 r32 r4 | r4 r16 o6 v6 c32 r32 r8 r4 r8 o7 v6 c32 r32 r16 | L
        [r8 o6 v6 c32 r32 r16 r4 r8. o7 v8 c32 r32 r4 | r4 r16 o6 v6 c32 r32 r8 r4 r8 o7 v6 c32 r32 r16 |]14
      `,
    },
  ],
};

export default song;
