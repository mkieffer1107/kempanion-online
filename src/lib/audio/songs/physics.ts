import type { Song } from '../mml';

// Physics Building — "Lab of Light". Written in F lydian, sounds in D lydian (k-3; drums untransposed), 90 BPM.
// 30 bars. Form: intro 2 (pad + a glock twinkle; not looped) | A 8 (PIGGY 3 motif on a theremin-ish sine over an
// F pedal, Fmaj7 ⇄ G/F, unresolved Gsus4) | B 8 (the bell sings the motif at half speed over Dm7–Am7–G/F–C, then a
// step higher; the sine floats long notes) | A' 8 (motif + bell answers, half-time clap) |
// coda 4 (the bell tolls F… A… C… B — the motif's first notes — back into A).
const song: Song = {
  id: 'physics',
  title: 'Lab of Light',
  bpm: 90,
  loop: true,
  echo: 0.4,
  tracks: [
    {
      // Sine "theremin"
      inst: 'sine',
      vol: 0.56,
      mml: `
        @sine v13 y6 k-3 l8
        r1 | r1 | L
        ; A
        o5 f a > c < b a4 r > c | < b g a f g4 r4 | r2 g a b > d | c4 < b4 a2 |
        f a > c < b a4 r > e | d c < b g a2 | g4 a4 b4 > d4 | c2. r4 |
        ; B — the bell has the motif
        r1 | r1 | r1 | r1 | o6 d1 | e1 | e1 | d1 |
        ; A'
        o5 f a > c < b a4 r > c | < b g a f g4 r4 | r2 g a b > d | c4 < b4 a2 |
        f a > c < b a4 r > e | d c < b g a2 | g4 a4 b4 > d4 | c2. r4 |
        ; coda
        r1 | r1 | r1 | r1 |
      `,
    },
    {
      // Bell: low tolls, the motif at half speed, answers, the coda's foreshadowing
      inst: 'bell',
      vol: 0.64,
      pan: -0.3,
      mml: `
        @bell v8 k-3
        r1 | r1 | L
        ; A
        o4 f2 r2 | r1 | g2 r2 | r1 | f2 r2 | r1 | g2 r2 | r1 |
        ; B
        v10 o5 f4 a4 > c4 < b4 | a2 r4 > c4 | < b4 g4 a4 f4 | g2 r2 |
        g4 b4 > d4 c4 | < b2 r4 > d4 | c4 < a4 b4 g4 | a2 r2 |
        ; A'
        v8 o4 f2 r2 | r2. o5 e4 | o4 g2 r2 | r2. o5 d4 | o4 f2 r2 | r2. o5 e4 | o4 g2 r2 | r2. o5 g4 |
        ; coda — F… A… C… B…
        v9 o5 f1 | a1 | > c1 | < b1 |
      `,
    },
    {
      // Glock sparkles (Fmaj7♯11: C E G B / G/F: B D G B)
      inst: 'glock',
      vol: 0.52,
      pan: 0.35,
      mml: `
        @glock v9 q4 k-3
        r2 o6 c32 e32 g32 b32 r8 r4 | r1 | L
        ; A
        r1 | r2. o6 c32 e32 g32 b32 r8 | r1 | r2. o5 b32 > d32 g32 b32 r8 |
        r1 | r2. o6 c32 e32 g32 b32 r8 | r1 | r2. o5 b32 > d32 g32 b32 r8 |
        ; B
        v8 r4 o6 c32 d32 f32 a32 r8 r2 | r4 o6 c32 e32 g32 a32 r8 r2 | r4 o5 b32 > d32 g32 b32 r8 r2 | r4 o5 g32 > c32 e32 g32 r8 r2 |
        r4 o5 b32 > d32 g32 b32 r8 r2 | r4 o5 b32 > d32 e32 g32 r8 r2 | r4 o6 c32 e32 g32 a32 r8 r2 | r4 o5 b32 > d32 g32 b32 r8 r2 |
        ; A' — busier
        v9 [r4 o6 c32 e32 g32 b32 r8]2 | [r4 o6 c32 e32 g32 b32 r8]2 | [r4 o5 b32 > d32 g32 b32 r8]2 | [r4 o5 b32 > d32 g32 b32 r8]2 |
        [r4 o6 c32 e32 g32 b32 r8]2 | [r4 o6 c32 e32 g32 b32 r8]2 | [r4 o5 b32 > d32 g32 b32 r8]2 | [r4 o5 b32 > d32 g32 b32 r8]2 |
        ; coda
        v8 [r4 o6 c32 e32 g32 b32 r8]2 | [r4 o5 b32 > d32 g32 b32 r8]2 | r4 o6 c32 e32 g32 b32 r8 r2 | r1 |
      `,
    },
    {
      inst: 'pad',
      vol: 0.6,
      pan: 0.1,
      mml: `
        @pad v6 q8 k-3 o4
        'f a > c'1 | v7 'f a > c'1 | L
        ; A
        v8 'f a > c'1 | 'f a > c'1 | 'g b > d'1 | 'g > c d'1 | 'f a > c'1 | 'f a > c'1 | 'g b > d'1 | 'g > c d'1 |
        ; B
        'f a > c'1 | 'g > c e'1 | 'g b > d'1 | 'g > c e'1 | 'g b > d'2 'g > c d'2 | 'g b > d'1 | 'g > c e'1 | 'g b > d'1 |
        ; A'
        'f a > c'1 | 'f a > c'1 | 'g b > d'1 | 'g > c d'1 | 'f a > c'1 | 'f a > c'1 | 'g b > d'1 | 'g > c d'1 |
        ; coda
        v7 'f a > c'1 | 'g b > d'1 | 'f a > c'1 | 'g b > d'1 |
      `,
    },
    {
      // Pedal bass
      inst: 'bass',
      vol: 0.7,
      mml: `
        @bass v11 q8 k-3 o2
        f1 | f1 | L
        ; A — lydian pedal
        f1 | f1 | f1 | f1 | f1 | f1 | f1 | f1 |
        ; B
        d1 | a1 | f1 | o3 c1 | o2 g1 | e1 | a1 | f1 |
        ; A'
        f1 | f1 | f1 | f1 | f1 | f1 | f1 | f1 |
        ; coda
        f1 | f1 | f1 | f1 |
      `,
    },
    {
      // A soft pulse; half-time clap in A'
      inst: 'drums',
      vol: 0.45,
      mml: `
        @drums l8
        r1 | r1 | L
        ; A
        [v7 c4 v3 e v2 e v3 e v2 e v3 e v2 e]8 |
        ; B — ticks only
        [v3 e v2 e]32 |
        ; A'
        [v8 c v3 e e v4 e v7 'c g' v3 e e v4 e]7 |
        v8 c v3 e e v4 e l16 v5 a a v6 a a v7 a a v8 a a l8 |
        ; coda
        r1 | r1 | r1 | r1 |
      `,
    },
  ],
};

export default song;
