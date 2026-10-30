//! Binary formats shared with `src/lib/audio/encode.ts`. Everything is a flat `f32` array.
//!
//! SONG  = header[SONG_HEADER] + tracks[n_tracks × TRACK_STRIDE] + events[n_events × EVENT_STRIDE]
//!   header: kind=1, version, bpm, loop(0|1), echo(0..1), length(ticks), loop_tick, n_tracks, n_events, 0, 0, 0
//!   track:  inst, vol(0..1), pan(-1..1), 0
//!   event:  tick, track, type, a, b, c, d, 0      (sorted by tick; control events before notes at equal ticks)
//!     NOTE  a=midi  b=gate ticks  c=velocity 0..1  d=chord size (1 = single note)
//!     INST  a=instrument id (index into mml.ts INSTRUMENT_IDS)
//!     PAN   a=-1..1        VIB a=depth 0..15 (MML `y`)        TEMPO a=bpm
//!
//! SFX   = header[SFX_HEADER] + layers[n × LAYER_STRIDE]
//!   header: kind=2, version, n_layers, gain
//!   layer:  see the `L_*` offsets. Times are seconds, frequencies Hz. `inst >= 0` uses an instrument
//!           preset (only at/freq/sweep/len/vol/pan/vib/echo are read); `inst < 0` is a raw voice.

pub const VERSION: f32 = 1.0;
pub const KIND_SONG: f32 = 1.0;
pub const KIND_SFX: f32 = 2.0;

pub const SONG_HEADER: usize = 12;
pub const TRACK_STRIDE: usize = 4;
pub const EVENT_STRIDE: usize = 8;
pub const SFX_HEADER: usize = 4;
pub const LAYER_STRIDE: usize = 32;

pub const MAX_TRACKS: usize = 16;
pub const MAX_EVENTS: usize = 200_000;
pub const MAX_LAYERS: usize = 64;

pub const EV_NOTE: u8 = 0;
pub const EV_INST: u8 = 1;
pub const EV_PAN: u8 = 2;
pub const EV_VIB: u8 = 3;
pub const EV_TEMPO: u8 = 4;

/// Ticks per quarter note (mml.ts TICKS_PER_QUARTER).
pub const TICKS_PER_QUARTER: f64 = 96.0;

// Raw waveform ids (blips and raw SFX layers). Mirrored by WAVES in encode.ts.
pub const W_PULSE12: u32 = 0;
pub const W_PULSE25: u32 = 1;
pub const W_PULSE50: u32 = 2;
pub const W_PULSE75: u32 = 3;
pub const W_TRI: u32 = 4;
pub const W_NES: u32 = 5;
pub const W_SAW: u32 = 6;
pub const W_SINE: u32 = 7;
pub const W_NOISE: u32 = 8;
pub const W_METAL: u32 = 9;
pub const W_FM: u32 = 10;

// SFX layer field offsets.
pub const L_AT: usize = 0;
pub const L_INST: usize = 1;
pub const L_WAVE: usize = 2;
pub const L_DUTY: usize = 3;
pub const L_FREQ: usize = 4;
pub const L_FREQ_TO: usize = 5;
pub const L_GLIDE: usize = 6;
pub const L_LEN: usize = 7;
pub const L_ATTACK: usize = 8;
pub const L_DECAY: usize = 9;
pub const L_SUSTAIN: usize = 10;
pub const L_RELEASE: usize = 11;
pub const L_VOL: usize = 12;
pub const L_PAN: usize = 13;
pub const L_VIB_DEPTH: usize = 14;
pub const L_VIB_RATE: usize = 15;
pub const L_TREM_DEPTH: usize = 16;
pub const L_TREM_RATE: usize = 17;
pub const L_FILTER: usize = 18;
pub const L_CUTOFF: usize = 19;
pub const L_CUTOFF_TO: usize = 20;
pub const L_Q: usize = 21;
pub const L_FM_RATIO: usize = 22;
pub const L_FM_INDEX: usize = 23;
pub const L_FM_INDEX_END: usize = 24;
pub const L_FM_TIME: usize = 25;
pub const L_NOISE: usize = 26;
pub const L_PITCH_ENV: usize = 27;
pub const L_PITCH_TIME: usize = 28;
pub const L_ECHO: usize = 29;
pub const L_BURSTS: usize = 30;
pub const L_BURST_GAP: usize = 31;
