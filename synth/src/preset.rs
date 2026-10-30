//! Instrument presets. Index order MUST match `INSTRUMENT_IDS` in src/lib/audio/mml.ts.
//!
//! A `Patch` fully describes one voice: oscillators, envelopes, modulation and filter. Song notes, SFX
//! layers and text blips all become a `Patch` + note parameters, so every sound runs through one voice.

use crate::dsp::{exp2, FilterMode};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Osc {
    None,
    Pulse,
    Tri,
    /// Triangle quantized to 16 levels below ~600 Hz (NES-style buzz), smooth above.
    TriNes,
    Saw,
    Sine,
    /// LFSR noise (long mode), clocked at `noise_rate × freq` (or `freq` when noise_rate = 0).
    Noise,
    /// LFSR noise in short 93-step mode: pitched, metallic.
    Metal,
    /// 2-operator FM (+ optional second modulator), carrier = note frequency.
    Fm,
    /// Free-running white noise (only meaningful as osc2).
    White,
}

#[derive(Clone, Copy, Debug)]
pub struct Patch {
    pub osc: Osc,
    pub duty: f32,
    /// Time constant (s) of an extra decay applied to osc1 only (snare/tom body). 0 = none.
    pub osc1_decay: f32,
    pub osc2: Osc,
    pub osc2_duty: f32,
    pub osc2_semi: f32,
    pub osc2_mix: f32,
    pub noise_rate: f32,
    /// Steady breath noise level (low-passed white noise).
    pub breath: f32,
    /// Noise burst at note start (attack chiff / drum click) and its time constant.
    pub chiff: f32,
    pub chiff_time: f32,
    pub attack: f32,
    /// Time (s) for the decay stage to fall 60 dB of the way to `sustain`.
    pub decay: f32,
    pub sustain: f32,
    /// Time (s) to fall 60 dB after release.
    pub release: f32,
    pub gain: f32,
    /// Pitch envelope: starts `pitch_env` semitones off and relaxes with time constant `pitch_time`.
    pub pitch_env: f32,
    pub pitch_time: f32,
    /// Exponential glide to `sweep_to` Hz over `sweep_time` seconds (SFX). 0 = off.
    pub sweep_to: f32,
    pub sweep_time: f32,
    pub vib_depth: f32,
    pub vib_rate: f32,
    pub vib_delay: f32,
    pub trem_depth: f32,
    pub trem_rate: f32,
    pub pwm_depth: f32,
    pub pwm_rate: f32,
    pub fm_ratio: f32,
    pub fm_index: f32,
    pub fm_index_end: f32,
    pub fm_time: f32,
    pub fm2_ratio: f32,
    pub fm2_index: f32,
    pub fm2_time: f32,
    /// 0..1: how much velocity brightens FM.
    pub fm_vel: f32,
    /// Above this note frequency FM indices shrink (natural key scaling, less aliasing). 0 = off.
    pub fm_key: f32,
    pub filter: FilterMode,
    pub cutoff: f32,
    /// > 0: cutoff follows the note (`freq × cutoff_key`) instead of `cutoff`.
    pub cutoff_key: f32,
    /// > 0: cutoff glides (exponentially) to this value over `sweep_time` (or the gate).
    pub cutoff_to: f32,
    pub q: f32,
    /// Filter envelope: cutoff × (1 + filt_env × e), e rises over filt_attack then relaxes to filt_sus.
    pub filt_env: f32,
    pub filt_attack: f32,
    pub filt_time: f32,
    pub filt_sus: f32,
    pub filter_noise_only: bool,
    pub legato: bool,
    pub glide: f32,
    /// Ignore the note's gate and ring out the envelope (drums).
    pub one_shot: bool,
    /// Clap-style re-triggered bursts at the start.
    pub bursts: f32,
    pub burst_gap: f32,
    /// Echo send multiplier.
    pub echo: f32,
    /// Track-level one-pole low-pass when used as a song instrument (Hz, 0 = open).
    pub chan_lp: f32,
}

pub const BASE: Patch = Patch {
    osc: Osc::Pulse,
    duty: 0.5,
    osc1_decay: 0.0,
    osc2: Osc::None,
    osc2_duty: 0.5,
    osc2_semi: 0.0,
    osc2_mix: 0.0,
    noise_rate: 0.0,
    breath: 0.0,
    chiff: 0.0,
    chiff_time: 0.01,
    attack: 0.002,
    decay: 0.2,
    sustain: 0.8,
    release: 0.06,
    gain: 0.2,
    pitch_env: 0.0,
    pitch_time: 0.05,
    sweep_to: 0.0,
    sweep_time: 0.0,
    vib_depth: 0.0,
    vib_rate: 5.5,
    vib_delay: 0.15,
    trem_depth: 0.0,
    trem_rate: 5.0,
    pwm_depth: 0.0,
    pwm_rate: 0.5,
    fm_ratio: 1.0,
    fm_index: 0.0,
    fm_index_end: 0.0,
    fm_time: 0.1,
    fm2_ratio: 1.0,
    fm2_index: 0.0,
    fm2_time: 0.05,
    fm_vel: 0.0,
    fm_key: 0.0,
    filter: FilterMode::Off,
    cutoff: 8000.0,
    cutoff_key: 0.0,
    cutoff_to: 0.0,
    q: 0.707,
    filt_env: 0.0,
    filt_attack: 0.0,
    filt_time: 0.2,
    filt_sus: 0.0,
    filter_noise_only: false,
    legato: false,
    glide: 0.012,
    one_shot: false,
    bursts: 0.0,
    burst_gap: 0.01,
    echo: 1.0,
    chan_lp: 0.0,
};

pub const N_INSTRUMENTS: usize = 19;
pub const DRUMS: usize = 18;

pub const INSTRUMENT_NAMES: [&str; N_INSTRUMENTS] = [
    "pulse12", "pulse25", "pulse50", "tri", "saw", "sine", "lead", "pluck", "epiano", "bell", "glock", "marimba",
    "bass", "pad", "strings", "flute", "brass", "noise", "drums",
];

const PULSE: Patch = Patch { osc: Osc::Pulse, decay: 0.22, sustain: 0.7, release: 0.06, chan_lp: 9000.0, ..BASE };

/// Preset for an instrument id (unknown ids fall back to pulse50).
pub fn instrument(id: usize) -> Patch {
    match id {
        // pulse12 / pulse25 / pulse50 — plain chip pulses (12.5% is thin and nasal, 50% hollow).
        0 => Patch { duty: 0.125, gain: 0.23, ..PULSE },
        1 => Patch { duty: 0.25, gain: 0.19, ..PULSE },
        2 => Patch { duty: 0.5, gain: 0.155, chan_lp: 8000.0, ..PULSE },
        // tri — NES-style stepped triangle (bass lines, soft melodies).
        3 => Patch { osc: Osc::TriNes, gain: 0.34, decay: 0.3, sustain: 0.85, release: 0.05, echo: 0.6, ..BASE },
        // saw — band-limited saw.
        4 => Patch { osc: Osc::Saw, gain: 0.24, decay: 0.3, sustain: 0.65, release: 0.08, attack: 0.003, chan_lp: 8000.0, ..BASE },
        // sine — soft and pure.
        5 => Patch { osc: Osc::Sine, gain: 0.3, attack: 0.004, decay: 0.3, sustain: 0.8, release: 0.1, ..BASE },
        // lead — pulse25 with gentle PWM, delayed vibrato and legato glides.
        6 => Patch {
            osc: Osc::Pulse,
            duty: 0.25,
            pwm_depth: 0.035,
            pwm_rate: 0.7,
            gain: 0.18,
            attack: 0.005,
            decay: 0.45,
            sustain: 0.75,
            release: 0.1,
            vib_depth: 0.14,
            vib_rate: 5.5,
            vib_delay: 0.16,
            legato: true,
            glide: 0.012,
            echo: 1.2,
            chan_lp: 8000.0,
            ..BASE
        },
        // pluck — FM harp / pizzicato: bright attack collapsing to a near-sine, fast decay.
        7 => Patch {
            osc: Osc::Fm,
            fm_ratio: 1.0,
            fm_index: 2.6,
            fm_index_end: 0.12,
            fm_time: 0.06,
            fm_vel: 0.5,
            fm_key: 1200.0,
            osc2: Osc::Tri,
            osc2_semi: 12.0,
            osc2_mix: 0.1,
            attack: 0.001,
            decay: 0.7,
            sustain: 0.0,
            release: 0.18,
            gain: 0.3,
            echo: 1.1,
            ..BASE
        },
        // epiano — DX-style electric piano: warm 1:1 body plus a short high "tine" ding, light tremolo.
        8 => Patch {
            osc: Osc::Fm,
            fm_ratio: 1.0,
            fm_index: 1.5,
            fm_index_end: 0.3,
            fm_time: 0.4,
            fm2_ratio: 14.0,
            fm2_index: 0.9,
            fm2_time: 0.03,
            fm_vel: 0.7,
            fm_key: 900.0,
            attack: 0.001,
            decay: 2.6,
            sustain: 0.0,
            release: 0.3,
            trem_depth: 0.1,
            trem_rate: 4.5,
            gain: 0.28,
            echo: 1.2,
            ..BASE
        },
        // bell — carillon: inharmonic 1:1.4 FM (strong minor-third partial), a strike transient and a
        // hum tone an octave below; long ring.
        9 => Patch {
            osc: Osc::Fm,
            fm_ratio: 1.4,
            fm_index: 3.2,
            fm_index_end: 0.6,
            fm_time: 1.0,
            fm2_ratio: 3.76,
            fm2_index: 1.0,
            fm2_time: 0.06,
            fm_key: 1500.0,
            osc2: Osc::Sine,
            osc2_semi: -12.0,
            osc2_mix: 0.3,
            attack: 0.001,
            decay: 4.5,
            sustain: 0.0,
            release: 1.4,
            gain: 0.2,
            echo: 1.4,
            ..BASE
        },
        // glock — bright, short metallic bell.
        10 => Patch {
            osc: Osc::Fm,
            fm_ratio: 3.5,
            fm_index: 1.4,
            fm_index_end: 0.05,
            fm_time: 0.12,
            fm_key: 2000.0,
            attack: 0.001,
            decay: 1.2,
            sustain: 0.0,
            release: 0.35,
            gain: 0.25,
            echo: 1.2,
            ..BASE
        },
        // marimba — short woody FM (4:1 overtone) with a mallet click.
        11 => Patch {
            osc: Osc::Fm,
            fm_ratio: 4.0,
            fm_index: 2.0,
            fm_index_end: 0.0,
            fm_time: 0.03,
            fm_key: 1500.0,
            chiff: 0.12,
            chiff_time: 0.004,
            attack: 0.001,
            decay: 0.4,
            sustain: 0.0,
            release: 0.1,
            gain: 0.34,
            echo: 0.7,
            ..BASE
        },
        // bass — round FM bass: a little growl on the attack, warm sustain that phone speakers can carry.
        12 => Patch {
            osc: Osc::Fm,
            fm_ratio: 1.0,
            fm_index: 1.3,
            fm_index_end: 0.55,
            fm_time: 0.15,
            fm_vel: 0.3,
            attack: 0.002,
            decay: 0.6,
            sustain: 0.7,
            release: 0.06,
            gain: 0.34,
            echo: 0.0,
            chan_lp: 2600.0,
            ..BASE
        },
        // pad — detuned saw + pulse, slow attack, low-passed: warm strings bed.
        13 => Patch {
            osc: Osc::Saw,
            osc2: Osc::Pulse,
            osc2_duty: 0.5,
            osc2_semi: 0.1,
            osc2_mix: 0.7,
            filter: FilterMode::Lp,
            cutoff: 1900.0,
            q: 0.6,
            attack: 0.35,
            decay: 1.2,
            sustain: 0.85,
            release: 0.7,
            gain: 0.085,
            echo: 1.0,
            chan_lp: 5000.0,
            ..BASE
        },
        // strings — ensemble saws, slower attack, delayed vibrato.
        14 => Patch {
            osc: Osc::Saw,
            osc2: Osc::Saw,
            osc2_semi: -0.08,
            osc2_mix: 1.0,
            filter: FilterMode::Lp,
            cutoff: 3400.0,
            q: 0.6,
            attack: 0.12,
            decay: 0.5,
            sustain: 0.9,
            release: 0.35,
            vib_depth: 0.1,
            vib_rate: 5.2,
            vib_delay: 0.25,
            gain: 0.1,
            echo: 1.0,
            chan_lp: 6500.0,
            ..BASE
        },
        // flute — sine + a touch of 2nd harmonic, breath noise, attack chiff, vibrato.
        15 => Patch {
            osc: Osc::Sine,
            osc2: Osc::Tri,
            osc2_semi: 12.0,
            osc2_mix: 0.06,
            breath: 0.035,
            chiff: 0.2,
            chiff_time: 0.04,
            attack: 0.035,
            decay: 0.25,
            sustain: 0.9,
            release: 0.09,
            vib_depth: 0.12,
            vib_rate: 5.0,
            vib_delay: 0.2,
            gain: 0.25,
            echo: 1.1,
            chan_lp: 9000.0,
            ..BASE
        },
        // brass — saws through a key-tracked low-pass with a "bwah" filter envelope and a small scoop.
        16 => Patch {
            osc: Osc::Saw,
            osc2: Osc::Saw,
            osc2_semi: 0.07,
            osc2_mix: 0.6,
            filter: FilterMode::Lp,
            cutoff_key: 2.0,
            q: 1.0,
            filt_env: 6.0,
            filt_attack: 0.035,
            filt_time: 0.25,
            filt_sus: 0.35,
            pitch_env: -0.4,
            pitch_time: 0.035,
            attack: 0.02,
            decay: 0.35,
            sustain: 0.8,
            release: 0.12,
            vib_depth: 0.06,
            vib_delay: 0.3,
            gain: 0.18,
            echo: 0.9,
            ..BASE
        },
        // noise — chip noise channel; higher notes = brighter noise.
        17 => Patch {
            osc: Osc::Noise,
            noise_rate: 16.0,
            attack: 0.001,
            decay: 0.2,
            sustain: 0.3,
            release: 0.08,
            gain: 0.16,
            echo: 0.5,
            ..BASE
        },
        // drums — notes are mapped by `drum()`; this is only the track default.
        18 => Patch { one_shot: true, sustain: 0.0, echo: 0.3, ..BASE },
        _ => instrument(2),
    }
}

/// Drum kit by pitch class (mml.ts DRUM_MAP: c kick, d snare, e hat, f open hat, g clap, a low tom,
/// b high tom; the black keys are extra kit pieces). `tune` shifts tonal drums in semitones.
/// Returns the patch, its base frequency and a choke group key.
pub fn drum(pc: i32, tune: f32) -> (Patch, f32, i32) {
    let t = exp2(tune / 12.0);
    let kick = Patch {
        osc: Osc::Sine,
        pitch_env: 24.0,
        pitch_time: 0.028,
        chiff: 0.35,
        chiff_time: 0.0025,
        attack: 0.0005,
        decay: 0.38,
        sustain: 0.0,
        release: 0.05,
        one_shot: true,
        gain: 0.6,
        echo: 0.0,
        ..BASE
    };
    let hat = Patch {
        osc: Osc::Metal,
        filter: FilterMode::Hp,
        cutoff: 7000.0,
        q: 0.8,
        attack: 0.0003,
        decay: 0.07,
        sustain: 0.0,
        release: 0.02,
        one_shot: true,
        gain: 0.15,
        echo: 0.15,
        ..BASE
    };
    let tom = Patch {
        osc: Osc::Sine,
        pitch_env: 9.0,
        pitch_time: 0.05,
        chiff: 0.2,
        chiff_time: 0.006,
        attack: 0.0005,
        decay: 0.42,
        sustain: 0.0,
        release: 0.05,
        one_shot: true,
        gain: 0.48,
        echo: 0.3,
        ..BASE
    };
    match pc.rem_euclid(12) {
        0 => (kick, 50.0 * t, 0),
        1 => (Patch { gain: 0.42, decay: 0.22, ..kick }, 55.0 * t, 0),
        2 => (
            Patch {
                osc: Osc::Tri,
                pitch_env: 6.0,
                pitch_time: 0.02,
                osc1_decay: 0.05,
                osc2: Osc::White,
                osc2_mix: 0.9,
                filter: FilterMode::Hp,
                cutoff: 1200.0,
                q: 0.7,
                filter_noise_only: true,
                attack: 0.0005,
                decay: 0.24,
                sustain: 0.0,
                release: 0.04,
                one_shot: true,
                gain: 0.4,
                echo: 0.3,
                ..BASE
            },
            185.0 * t,
            2,
        ),
        3 => (
            Patch {
                osc: Osc::Tri,
                osc1_decay: 0.015,
                osc2: Osc::White,
                osc2_mix: 0.4,
                filter: FilterMode::Hp,
                cutoff: 2000.0,
                filter_noise_only: true,
                attack: 0.0003,
                decay: 0.06,
                sustain: 0.0,
                release: 0.02,
                one_shot: true,
                gain: 0.35,
                echo: 0.3,
                ..BASE
            },
            420.0 * t,
            3,
        ),
        4 => (hat, 44000.0, 4),
        5 => (Patch { decay: 0.45, gain: 0.13, ..hat }, 44000.0, 5),
        6 => (Patch { decay: 0.035, gain: 0.12, ..hat }, 44000.0, 4),
        7 => (
            Patch {
                osc: Osc::Noise,
                filter: FilterMode::Bp,
                cutoff: 1300.0,
                q: 1.4,
                bursts: 3.0,
                burst_gap: 0.009,
                attack: 0.0003,
                decay: 0.2,
                sustain: 0.0,
                release: 0.03,
                one_shot: true,
                gain: 1.0,
                echo: 0.4,
                ..BASE
            },
            44000.0,
            7,
        ),
        8 => (
            Patch {
                osc: Osc::Noise,
                filter: FilterMode::Hp,
                cutoff: 5000.0,
                q: 0.6,
                attack: 0.0005,
                decay: 1.4,
                sustain: 0.0,
                release: 0.2,
                one_shot: true,
                gain: 0.12,
                echo: 0.5,
                ..BASE
            },
            44000.0,
            8,
        ),
        9 => (tom, 98.0 * t, 9),
        10 => (tom, 130.0 * t, 10),
        _ => (Patch { decay: 0.36, gain: 0.45, ..tom }, 165.0 * t, 11),
    }
}

/// Raw waveform id (format.rs W_*) → oscillator + duty.
pub fn wave_osc(w: u32) -> (Osc, f32) {
    match w {
        0 => (Osc::Pulse, 0.125),
        1 => (Osc::Pulse, 0.25),
        2 => (Osc::Pulse, 0.5),
        3 => (Osc::Pulse, 0.75),
        4 => (Osc::Tri, 0.5),
        5 => (Osc::TriNes, 0.5),
        6 => (Osc::Saw, 0.5),
        7 => (Osc::Sine, 0.5),
        8 => (Osc::Noise, 0.5),
        9 => (Osc::Metal, 0.5),
        10 => (Osc::Fm, 0.5),
        _ => (Osc::Sine, 0.5),
    }
}
