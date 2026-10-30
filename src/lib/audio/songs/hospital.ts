import type { Song } from '../mml';

// Shands before dawn. D minor, 76 BPM, calm and serious. 26 bars. Form: intro 2 (low strings + two distant bell tolls;
// not looped) | A 8 (PIGGY 2 motif at half speed on solo strings; Dm–Gm7–Bbmaj7, open fifths, Asus4→A) |
// B 8 (first light: a lyrical line over the Bb–F/A–Gm7 lament bass, a bell counter-line, e-piano arpeggios) |
// A' 8 (the motif an octave up, the bell answering, a faint heartbeat; A → back to Dm).
const song: Song = {
  id: 'hospital',
  title: 'Shands, 5 AM',
  bpm: 76,
  loop: true,
  echo: 0.35,
  tracks: [
    {
      // Solo strings — the motif, slowed
      inst: 'strings',
      vol: 0.95,
      mml: `
        @strings v13 q8
        r1 | r1 | L
        ; A
        o4 d2 a2 | g4 f4 e4 f4 | d1 | c2 d2 | f2 > c2 < | b-4 a4 g4 a4 | f2. e4 | d2 c+2 |
        ; B — first light
        o5 f2 d4 f4 | a2. g4 | f2 d4 < b-4 > | c1 | f2 d4 f4 | a2 > c2 < | b-2 a4 g4 | e2 c+2 |
        ; A' — an octave up
        o5 d2 a2 | g4 f4 e4 f4 | d1 | c2 d2 | f2 > c2 < | b-4 a4 g4 a4 | f2. e4 | d2 c+2 |
      `,
    },
    {
      // String chords
      inst: 'strings',
      vol: 0.52,
      pan: -0.2,
      mml: `
        @strings v8 q8 o3
        r1 | v6 'd f a'1 | L
        ; A
        v8 'd f a'1 | 'f b- > d'2 'g > c'2 | 'f a > d'1 | 'e g > c'2 'f a > d'2 |
        'f a > c'1 | 'f b- > d'2 'g > c'2 | 'd f a'1 | 'e a > d'2 'e a > c+'2 |
        ; B
        v9 'f a > d'1 | 'f a > c'1 | 'f b- > d'1 | 'e g > c'1 | 'f a > d'1 | 'f a > c'1 | 'f b- > d'1 | 'e a > d'2 'e a > c+'2 |
        ; A'
        v8 'd f a'1 | 'f b- > d'2 'g > c'2 | 'f a > d'1 | 'e g > c'2 'f a > d'2 |
        'f a > c'1 | 'f b- > d'2 'g > c'2 | 'd f a'1 | 'e a > d'2 'e a > c+'2 |
      `,
    },
    {
      // Distant bell
      inst: 'bell',
      vol: 0.66,
      pan: 0.3,
      mml: `
        @bell v8
        o5 a1 | d1 | L
        ; A
        o5 a2 r2 | r1 | f2 r2 | r1 | a2 r2 | r1 | f2 r2 | r2 e2 |
        ; B — a counter-line
        v9 o5 f2 r2 | e2 r2 | d2 r2 | e2 r2 | f2 r2 | e2 r2 | d2 r2 | c+2 r2 |
        ; A'
        v8 o5 a2 r2 | d2 r2 | f2 r2 | e2 r2 | f2 r2 | d2 r2 | a2 r2 | e2 r2 |
      `,
    },
    {
      // E-piano arpeggios (B and A')
      inst: 'epiano',
      vol: 0.52,
      pan: 0.2,
      mml: `
        @epiano v7 l8
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        ; B
        o2 b- > f a > d f d < a f | o2 a > c f a > c < a f c | o2 g > d f b- > d < b- f d | o2 g > c e g > c < g e c |
        o2 b- > f a > d f d < a f | o2 a > c f a > c < a f c | o2 g > d f b- > d < b- f d | o2 a > e a > d < a > c+ < a e |
        ; A'
        o2 d a > d f a f d < a | o2 g > d f b- o2 g > c f g | o2 b- > f a > d f d < a f | o2 g > c e g o2 a > d f a |
        o2 f > c f a > c < a f c | o2 g > d f b- o2 g > c e g | o2 d a > d f a f d < a | o2 a > e a > d < a > c+ < a e |
      `,
    },
    {
      // Low strings (cello line)
      inst: 'strings',
      vol: 0.62,
      mml: `
        @strings v11 q8 o2
        d1 | d1 | L
        ; A
        d1 | g2 > c2 < | b-1 | > c2 < d2 | f1 | g2 > c2 < | d1 | a1 |
        ; B — lament bass
        b-1 | a1 | g1 | > c1 < | b-1 | a1 | g1 | a1 |
        ; A'
        d1 | g2 > c2 < | b-1 | > c2 < d2 | f1 | g2 > c2 < | d1 | a1 |
      `,
    },
    {
      // A faint heartbeat, only in A'
      inst: 'drums',
      vol: 0.42,
      mml: `
        @drums
        r1 | r1 | L
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        r1 | r1 | r1 | r1 | r1 | r1 | r1 | r1 |
        [o4 v7 c16 o5 v5 c16 r8]32 |
      `,
    },
  ],
};

export default song;
