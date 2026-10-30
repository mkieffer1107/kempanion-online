import type { Song } from '../mml';

// Bedtime lullaby in F, 12/8 feel on a triplet grid (l12 = one triplet eighth; 4 = one dotted-quarter pulse).
// Intro 2 (not looped) | A 8: music-box melody | the three pig motifs, same pitches, swung and slowed:
// Piggy 1 "Rally!" (moved to F), Piggy 2 "Perfusion" (D minor, open fifths underneath), Piggy 3 "So I Was Thinking"
// (F lydian, plays twice and trails off) | A' 4: the melody's last phrase, C7 back to F.
const song: Song = {
  id: 'sleep',
  title: 'Lullaby for Three',
  bpm: 60,
  loop: true,
  echo: 0.4,
  tracks: [
    {
      // Music-box melody
      inst: 'glock',
      vol: 0.75,
      mml: `
        @glock v10
        r1 | r1 | L
        o5 a4 > c6 < a12 g4 f4 | f4 a6 g12 f4 d4 | d4 f6 d12 c4 < b-4 | > c2. r4 |
        a4 > c6 < a12 g4 f4 | f4 a6 > d12 c4 < a4 | b-4 a6 g12 f4 d4 | e2. r4 |
        ; Piggy 1
        r6 f12 f6 a12 > c4&c6 < a12 | b-6 > c12 < a6 f12 g4 f4 | a4 g6 f12 d4 f4 | g2 e2 |
        ; Piggy 2
        d4 a4 g6 f12 e6 f12 | d2 c4 d4 | f4 d6 c12 < b-4 > d4 | c2 e2 |
        ; Piggy 3
        f6 a12 > c6 < b12 a4 r6 > c12 | < b6 g12 a6 f12 g4 r4 | f6 a12 > c6 < b12 a2 | r2 g4 e4 |
        ; A'
        a4 > c6 < a12 g4 f4 | f4 a6 > d12 c4 < a4 | b-4 a6 g12 f4 d4 | e2. r4 |
      `,
    },
    {
      // Plucked music-box accompaniment, one chord tone per triplet eighth
      inst: 'pluck',
      vol: 0.53,
      pan: -0.2,
      mml: `
        @pluck v7 q6
        [o4 f12 > c12 a12]4 | [o4 e12 b-12 > c12]4 | L
        [o4 f12 > c12 a12]4 | [o4 d12 a12 > f12]4 | [o3 b-12 > f12 > d12]4 | [o4 e12 g12 > c12]4 |
        [o4 f12 > c12 a12]4 | [o4 d12 a12 > f12]4 | [o4 g12 > d12 f12]4 | [o4 e12 b-12 > c12]4 |
        [o4 f12 > c12 a12]4 | [o3 b-12 > f12 > d12]2 [o4 f12 g12 > c12]2 | [o4 d12 a12 > c12]4 | [o4 g12 > d12 f12]2 [o4 e12 b-12 > c12]2 |
        [o4 d12 a12 > d12]4 | [o4 d12 a12 > d12]2 o4 e12 g12 > c12 o4 d12 a12 > d12 | [o3 b-12 > f12 > d12]4 | [o4 f12 g12 > c12]2 [o4 e12 b-12 > c12]2 |
        [o4 f12 > c12 a12]4 | [o4 f12 b12 > d12]4 | [o4 f12 > c12 a12]4 | [o4 g12 > d12 f12]2 [o4 e12 b-12 > c12]2 |
        [o4 f12 > c12 a12]4 | [o4 d12 a12 > f12]4 | [o4 g12 > d12 f12]4 | [o4 e12 b-12 > c12]4 |
      `,
    },
    {
      inst: 'pad',
      vol: 0.5,
      pan: 0.2,
      mml: `
        @pad v6 q8 o4
        'c f a'1 | 'c e g b-'1 | L
        'c f a'1 | 'd f a'1 | 'd f b-'1 | 'c e g'1 | 'c f a'1 | 'd f a'1 | 'd f b-'1 | 'c e g b-'1 |
        'c f a'1 | 'd f b-'2 'c f g'2 | 'c f a'1 | 'd f b-'2 'c e g b-'2 |
        'd a > d'1 | 'd a > d'2 'c e g'4 'd a > d'4 | 'd f b-'1 | 'c f g'2 'c e g b-'2 |
        'c f a'1 | 'd g b'1 | 'c f a'1 | 'd f b-'2 'c e g b-'2 |
        'c f a'1 | 'd f a'1 | 'd f b-'1 | 'c e g b-'1 |
      `,
    },
    {
      // Soft triangle roots
      inst: 'tri',
      vol: 0.69,
      mml: `
        @tri v9 q8 o3
        f1 | c1 | L
        f1 | d1 | < b-1 | > c1 | f1 | d1 | < g1 | > c1 |
        f1 | < b-2 > c2 | d1 | < g2 > c2 |
        d1 | d2 c4 d4 | < b-1 | > c1 |
        f1 | f1 | f1 | < g2 > c2 |
        f1 | d1 | < g1 | > c1 |
      `,
    },
  ],
};

export default song;
