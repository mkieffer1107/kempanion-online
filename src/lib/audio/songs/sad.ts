import type { Song } from '../mml';

// Sad scenes, A minor. Intro 2 (not looped) | A 8: the strings sigh over i–i/b7–IVmaj7–V7, e-piano arpeggios |
// B 8: the e-piano remembers the TITLE motif, reharmonized in minor (Am → Fmaj7), over bare strings |
// A' 8: the strings an octave higher → A. Sparse glock raindrops (E and B only, safe over every chord) throughout.
const song: Song = {
  id: 'sad',
  title: 'Rainy Window',
  bpm: 70,
  loop: true,
  echo: 0.35,
  tracks: [
    {
      // Strings voice: melody in A/A', a quiet inner line in B
      inst: 'strings',
      vol: 0.66,
      mml: `
        @strings v11 q8 y4 l8
        r1 | r1 | L
        o4 a4. b > c4 e4 | d2. c4 | < a2 g4 a4 | b2 g+2 | a4. b > c4 e4 | g2. e4 | f4. e d4 c4 | < b2 a4 g+4 |
        v8 o4 a1 | a1 | a1 | a2 g+2 | a1 | a1 | f1 | e1 |
        v12 o5 a4. b > c4 e4 | d2. c4 | < a2 g4 a4 | b2 g+2 | o4 a4. b > c4 e4 | g2. e4 | f4. e d4 c4 | < b2 a4 g+4 |
      `,
    },
    {
      // E-piano: arpeggios, then the TITLE motif in B
      inst: 'epiano',
      vol: 0.6,
      pan: -0.2,
      mml: `
        @epiano v8 q8 l8
        o3 a > e a > e c < a e c | o3 f > c f a > c e c < a | L
        o3 a > e a > e c < a e c | o3 g > e a > e c < a e c | o3 f > c f a > c e c < a | o3 e b > d g+ b g+ d < b |
        o3 a > e a > e c < a e c | o3 g > e a > e c < a e c | o3 d a > c f a f c < a | o3 e b > e a o3 e b > d g+ |
        v11 q7 o5 e g a4 g e d4 | c d e4 d4 r4 | f a > c4 < b a g4 | e2 r4 < b > d |
        e g a4 g e d4 | c d e4 g4 a4 | b4. a f4 d4 | e2 g+2 |
        v8 q8
        o3 a > e a > e c < a e c | o3 g > e a > e c < a e c | o3 f > c f a > c e c < a | o3 e b > d g+ b g+ d < b |
        o3 a > e a > e c < a e c | o3 g > e a > e c < a e c | o3 d a > c f a f c < a | o3 e b > e a o3 e b > d g+ |
      `,
    },
    {
      inst: 'pad',
      vol: 0.42,
      pan: 0.25,
      mml: `
        @pad v7 q8 o4
        'c e a'1 | 'c f a'1 | L
        'c e a'1 | 'c e a'1 | 'c f a'1 | '<b > d g+'1 | 'c e a'1 | 'c e a'1 | 'c f a'1 | '<b > e a'2. '<b > d g+'4 |
        'c e a'1 | 'c f a'1 | 'c f a'1 | '<b > e a'2 '<b > d g+'2 | 'c e a'1 | 'c f a'1 | 'd f a'1 | '<b > d g+'1 |
        'c e a'1 | 'c e a'1 | 'c f a'1 | '<b > d g+'1 | 'c e a'1 | 'c e a'1 | 'c f a'1 | '<b > e a'2. '<b > d g+'4 |
      `,
    },
    {
      inst: 'bass',
      vol: 0.7,
      mml: `
        @bass v10 q8 o2
        a1 | f1 | L
        a1 | g1 | f1 | e1 | a1 | g1 | d1 | e1 |
        a1 | f1 | d1 | e1 | a1 | f1 | b1 | e1 |
        a1 | g1 | f1 | e1 | a1 | g1 | d1 | e1 |
      `,
    },
    {
      // Raindrops
      inst: 'glock',
      vol: 0.32,
      pan: 0.4,
      mml: `
        @glock v5
        r2 r8 o6 e16 r16 r4 | r8 o7 e16 r16 r4 r4 o6 b16 r8. | L
        [r4. o6 e16 r16 r8 o7 e16 r16 r4 | o6 b16 r16 r8 r4 r8 o7 e16 r16 r4 | r8 o7 e16 r16 r4 r4 o6 b16 r8. | r2 r8 o6 e16 r16 r4]6
      `,
    },
  ],
};

export default song;
