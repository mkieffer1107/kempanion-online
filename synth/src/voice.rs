//! One synth voice: up to two oscillators (or 2-op FM), noise, ADSR, pitch/filter envelopes, vibrato,
//! tremolo, PWM and a state-variable filter. Modulators run at control rate (every CTRL samples);
//! the amplitude envelope and oscillators run per sample.

use crate::dsp::*;
use crate::preset::{Osc, Patch, BASE};

pub const CTRL: u32 = 16;
const SILENT: f32 = 1e-4;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Stage {
    Off,
    Attack,
    Decay,
    Sustain,
    Release,
}

/// Per-note parameters (the patch describes the timbre).
#[derive(Clone, Copy, Debug)]
pub struct NoteOn {
    pub freq: f32,
    /// Linear amplitude (patch gain × velocity curve × volume).
    pub amp: f32,
    /// 0..1 velocity (for FM brightness).
    pub vel: f32,
    /// Samples until release; u32::MAX = never (one-shots).
    pub gate: u32,
    pub key: i32,
    /// Glide from the voice's current pitch and keep its envelope level.
    pub legato: bool,
    /// Vibrato depth in semitones; negative = patch default.
    pub vib: f32,
    pub pan: f32,
    pub echo: f32,
}

#[derive(Clone, Copy)]
pub struct Voice {
    pub stage: Stage,
    pub level: f32,
    pub key: i32,
    pub order: u32,
    pub gate: u32,
    pub rel_age: u32,
    pub pan_l: f32,
    pub pan_r: f32,
    pub echo: f32,
    p: Patch,
    sr: f32,
    amp: f32,
    att_inc: f32,
    dec_coef: f32,
    rel_coef: f32,
    base: f32,
    cur_freq: f32,
    age: u32,
    ctrl: u32,
    p1: f32,
    p2: f32,
    m1: f32,
    m2: f32,
    inc1: f32,
    inc2: f32,
    incm1: f32,
    incm2: f32,
    duty: f32,
    osc2_ratio: f32,
    pe: f32,
    pe_coef: f32,
    glide: f32,
    glide_coef: f32,
    sweep_total: f32,
    sweep_len: f32,
    vib_depth: f32,
    vib_phase: f32,
    vib_inc: f32,
    vib_delay: f32,
    trem: f32,
    trem_phase: f32,
    trem_inc: f32,
    pwm_phase: f32,
    pwm_inc: f32,
    fm1: f32,
    fm1_end: f32,
    fm1_coef: f32,
    fm2: f32,
    fm2_coef: f32,
    o1: f32,
    o1_coef: f32,
    chiff: f32,
    chiff_coef: f32,
    burst: f32,
    lfsr: u16,
    n_acc: f32,
    n_inc: f32,
    white: u32,
    breath_lp: f32,
    breath_a: f32,
    svf: Svf,
    fenv: f32,
    fenv_coef: f32,
    fattack: f32,
    cut_oct: f32,
    cut_len: f32,
    stepped: bool,
}

impl Voice {
    pub fn new(seed: u32) -> Voice {
        Voice {
            stage: Stage::Off,
            level: 0.0,
            key: -1,
            order: 0,
            gate: u32::MAX,
            rel_age: 0,
            pan_l: 0.707,
            pan_r: 0.707,
            echo: 0.0,
            p: BASE,
            sr: 48000.0,
            amp: 0.0,
            att_inc: 1.0,
            dec_coef: 0.0,
            rel_coef: 0.0,
            base: 440.0,
            cur_freq: 0.0,
            age: 0,
            ctrl: 0,
            p1: 0.0,
            p2: 0.0,
            m1: 0.0,
            m2: 0.0,
            inc1: 0.0,
            inc2: 0.0,
            incm1: 0.0,
            incm2: 0.0,
            duty: 0.5,
            osc2_ratio: 1.0,
            pe: 0.0,
            pe_coef: 0.0,
            glide: 0.0,
            glide_coef: 0.0,
            sweep_total: 0.0,
            sweep_len: 0.0,
            vib_depth: 0.0,
            vib_phase: 0.0,
            vib_inc: 0.0,
            vib_delay: 0.0,
            trem: 1.0,
            trem_phase: 0.0,
            trem_inc: 0.0,
            pwm_phase: 0.0,
            pwm_inc: 0.0,
            fm1: 0.0,
            fm1_end: 0.0,
            fm1_coef: 0.0,
            fm2: 0.0,
            fm2_coef: 0.0,
            o1: 1.0,
            o1_coef: 1.0,
            chiff: 0.0,
            chiff_coef: 0.0,
            burst: 1.0,
            lfsr: 1,
            n_acc: 0.0,
            n_inc: 0.0,
            white: 0x9E37_79B9 ^ seed.wrapping_mul(0x85EB_CA6B) | 1,
            breath_lp: 0.0,
            breath_a: 0.3,
            svf: Svf::default(),
            fenv: 0.0,
            fenv_coef: 0.0,
            fattack: 0.0,
            cut_oct: 0.0,
            cut_len: 0.0,
            stepped: false,
        }
    }

    #[inline]
    pub fn is_active(&self) -> bool {
        self.stage != Stage::Off
    }

    /// Whether a legato note may glide from this voice (still sounding, or released very recently).
    pub fn can_glide(&self, sr: f32) -> bool {
        self.stage != Stage::Off
            && self.level > 0.02
            && (self.stage != Stage::Release || (self.rel_age as f32) < 0.05 * sr)
    }

    pub fn note_on(&mut self, patch: &Patch, n: &NoteOn, sr: f32, order: u32) {
        let was_active = self.stage != Stage::Off && self.level > 0.001;
        let legato = n.legato && was_active && self.cur_freq > 0.0;
        let prev_freq = self.cur_freq;
        let p = *patch;
        let ctrl = CTRL as f32;
        self.p = p;
        self.sr = sr;
        self.key = n.key;
        self.order = order;
        self.age = 0;
        self.rel_age = 0;
        self.gate = n.gate;
        self.amp = if n.amp.is_finite() { n.amp.clamp(0.0, 4.0) } else { 0.0 };
        let pan = if n.pan.is_finite() { n.pan.clamp(-1.0, 1.0) } else { 0.0 };
        let a = (pan + 1.0) * 0.125; // turns: 0 → hard left, 0.25 → hard right
        self.pan_l = sin_turns(a + 0.25);
        self.pan_r = sin_turns(a);
        self.echo = if n.echo.is_finite() { n.echo.clamp(0.0, 2.0) } else { 0.0 };
        self.base = if n.freq.is_finite() { n.freq.clamp(1.0, 96_000.0) } else { 440.0 };

        if legato {
            self.glide = 12.0 * (prev_freq / self.base).log2();
            self.glide_coef = decay_coef(p.glide, ctrl, sr);
        } else {
            self.glide = 0.0;
            self.glide_coef = 0.0;
        }
        self.pe = p.pitch_env;
        self.pe_coef = decay_coef(p.pitch_time, ctrl, sr);
        if p.sweep_to > 0.0 {
            self.sweep_total = 12.0 * (p.sweep_to.clamp(1.0, 96_000.0) / self.base).log2();
            self.sweep_len = p.sweep_time.max(0.001) * sr;
        } else {
            self.sweep_total = 0.0;
            self.sweep_len = 0.0;
        }
        self.vib_depth = if n.vib >= 0.0 { n.vib } else { p.vib_depth }.clamp(0.0, 12.0);
        if !legato {
            self.vib_phase = 0.0;
        }
        self.vib_inc = p.vib_rate.max(0.0) * ctrl / sr;
        self.vib_delay = p.vib_delay.max(0.0) * sr;
        self.trem = 1.0;
        self.trem_inc = p.trem_rate.max(0.0) * ctrl / sr;
        self.pwm_inc = p.pwm_rate.max(0.0) * ctrl / sr;
        self.duty = p.duty.clamp(0.02, 0.98);

        let vel = n.vel.clamp(0.0, 1.0);
        let vel_scale = 1.0 - p.fm_vel + p.fm_vel * vel;
        let key_scale = if p.fm_key > 0.0 && self.base > p.fm_key { (p.fm_key / self.base).sqrt() } else { 1.0 };
        let s = vel_scale * key_scale / TAU; // radians → turns
        self.fm1 = p.fm_index * s;
        self.fm1_end = p.fm_index_end * s;
        self.fm1_coef = decay_coef(p.fm_time, ctrl, sr);
        self.fm2 = p.fm2_index * s;
        self.fm2_coef = decay_coef(p.fm2_time, ctrl, sr);
        self.o1 = 1.0;
        self.o1_coef = if p.osc1_decay > 0.0 { decay_coef(p.osc1_decay, ctrl, sr) } else { 1.0 };
        self.chiff = p.chiff;
        self.chiff_coef = decay_coef(p.chiff_time.max(0.0005), ctrl, sr);
        self.burst = 1.0;
        self.osc2_ratio = exp2(p.osc2_semi / 12.0);
        self.breath_a = onepole_coef(3500.0, sr);

        self.fenv = if p.filt_attack > 0.0 { 0.0 } else { 1.0 };
        self.fattack = p.filt_attack.max(0.0) * sr;
        self.fenv_coef = decay_coef(p.filt_time, ctrl, sr);
        if p.cutoff_to > 0.0 && p.cutoff > 0.0 {
            self.cut_oct = (p.cutoff_to / p.cutoff).log2();
            self.cut_len = if p.sweep_time > 0.0 {
                p.sweep_time * sr
            } else if n.gate != u32::MAX {
                n.gate as f32
            } else {
                0.1 * sr
            }
            .max(1.0);
        } else {
            self.cut_oct = 0.0;
            self.cut_len = 0.0;
        }
        self.svf.force_update();

        if !was_active {
            self.svf.reset();
            self.breath_lp = 0.0;
            self.p1 = 0.0;
            self.p2 = 0.0;
            self.m1 = 0.0;
            self.m2 = 0.0;
            self.n_acc = 0.0;
            self.level = 0.0;
        }
        self.att_inc = 1.0 / (p.attack.max(0.0005) * sr);
        self.dec_coef = expf(-6.9 / (p.decay.max(0.001) * sr));
        self.rel_coef = expf(-6.9 / (p.release.max(0.001) * sr));
        self.stage = Stage::Attack;
        self.ctrl = 0;
    }

    pub fn release(&mut self) {
        if self.stage != Stage::Off && self.stage != Stage::Release {
            self.stage = Stage::Release;
            self.rel_age = 0;
        }
        self.gate = u32::MAX;
    }

    /// Fast release (hi-hat choke, voice steal).
    pub fn choke(&mut self, secs: f32) {
        if self.stage != Stage::Off {
            self.rel_coef = expf(-6.9 / (secs.max(0.001) * self.sr));
            self.stage = Stage::Release;
            self.rel_age = 0;
            self.gate = u32::MAX;
        }
    }

    pub fn kill(&mut self) {
        self.stage = Stage::Off;
        self.level = 0.0;
        self.gate = u32::MAX;
    }

    fn control(&mut self) {
        let sr = self.sr;
        let p = &self.p;
        let age = self.age as f32;

        let mut semis = self.pe + self.glide;
        self.pe *= self.pe_coef;
        self.glide *= self.glide_coef;
        if self.sweep_len > 0.0 {
            semis += self.sweep_total * (age / self.sweep_len).min(1.0);
        }
        if self.vib_depth > 0.0 && age >= self.vib_delay {
            let ramp = ((age - self.vib_delay) / (0.15 * sr)).min(1.0);
            semis += self.vib_depth * ramp * sin_turns(self.vib_phase);
            self.vib_phase = fract(self.vib_phase + self.vib_inc);
        }
        let f = self.base * exp2(semis * (1.0 / 12.0));
        self.cur_freq = f;
        self.inc1 = (f / sr).clamp(1e-7, 0.45);
        self.inc2 = (f * self.osc2_ratio / sr).clamp(1e-7, 0.45);
        match p.osc {
            Osc::Fm => {
                self.incm1 = (f * p.fm_ratio / sr).clamp(0.0, 0.49);
                self.incm2 = (f * p.fm2_ratio / sr).clamp(0.0, 0.49);
                self.fm1 = self.fm1_end + (self.fm1 - self.fm1_end) * self.fm1_coef;
                self.fm2 *= self.fm2_coef;
            }
            Osc::Noise | Osc::Metal => {
                let clock = if p.noise_rate > 0.0 { f * p.noise_rate } else { f };
                self.n_inc = (clock / sr).clamp(0.0, 1.0);
            }
            _ => {}
        }
        self.stepped = p.osc == Osc::TriNes && f < 600.0;
        self.o1 *= self.o1_coef;
        self.chiff = flush(self.chiff * self.chiff_coef);
        if p.pwm_depth > 0.0 {
            self.duty = (p.duty + p.pwm_depth * sin_turns(self.pwm_phase)).clamp(0.02, 0.98);
            self.pwm_phase = fract(self.pwm_phase + self.pwm_inc);
        }
        if p.trem_depth > 0.0 {
            self.trem = 1.0 - p.trem_depth * 0.5 * (1.0 + sin_turns(self.trem_phase));
            self.trem_phase = fract(self.trem_phase + self.trem_inc);
        }
        if p.bursts > 0.0 {
            let t = age / sr;
            let gap = p.burst_gap.max(0.001);
            self.burst = if t < p.bursts * gap {
                let ph = t - (t / gap).floor() * gap;
                exp2(-ph * (core::f32::consts::LOG2_E / 0.0035))
            } else {
                1.0
            };
        }
        if p.filter != FilterMode::Off {
            let mut fc = if p.cutoff_key > 0.0 { f * p.cutoff_key } else { p.cutoff };
            if self.cut_len > 0.0 {
                fc *= exp2(self.cut_oct * (age / self.cut_len).min(1.0));
            }
            if p.filt_env != 0.0 {
                if age < self.fattack {
                    self.fenv = age / self.fattack;
                } else {
                    self.fenv = p.filt_sus + (self.fenv - p.filt_sus) * self.fenv_coef;
                }
                fc *= (1.0 + p.filt_env * self.fenv).max(0.05);
            }
            self.svf.set(fc, p.q, sr);
        }
    }

    /// Add this voice's mono output into `out`.
    pub fn render(&mut self, out: &mut [f32]) {
        if self.stage == Stage::Off {
            return;
        }
        let osc = self.p.osc;
        let osc2 = self.p.osc2;
        let mode = self.p.filter;
        let noise_only = self.p.filter_noise_only;
        let o2mix = self.p.osc2_mix;
        let o2duty = self.p.osc2_duty;
        let breath = self.p.breath;
        let short = osc == Osc::Metal;
        let sustain = self.p.sustain;

        for s in out.iter_mut() {
            if self.ctrl == 0 {
                self.control();
                self.ctrl = CTRL;
            }
            self.ctrl -= 1;

            if self.gate != u32::MAX {
                if self.gate == 0 {
                    self.release();
                } else {
                    self.gate -= 1;
                }
            }
            match self.stage {
                Stage::Attack => {
                    self.level += self.att_inc;
                    if self.level >= 1.0 {
                        self.level = 1.0;
                        self.stage = Stage::Decay;
                    }
                }
                Stage::Decay => {
                    self.level = sustain + (self.level - sustain) * self.dec_coef;
                    if sustain <= 0.0 {
                        if self.level < SILENT {
                            self.stage = Stage::Off;
                        }
                    } else if self.level - sustain < SILENT {
                        self.level = sustain;
                        self.stage = Stage::Sustain;
                    }
                }
                Stage::Sustain => {}
                Stage::Release => {
                    self.level *= self.rel_coef;
                    self.rel_age = self.rel_age.saturating_add(1);
                    if self.level < SILENT {
                        self.stage = Stage::Off;
                    }
                }
                Stage::Off => {}
            }
            if self.stage == Stage::Off {
                self.level = 0.0;
                break;
            }

            let t = self.p1;
            let inc = self.inc1;
            let mut tone = match osc {
                Osc::Fm => {
                    let mut ph = t + self.fm1 * sin_turns(self.m1);
                    if self.fm2 > 1e-6 {
                        ph += self.fm2 * sin_turns(self.m2);
                    }
                    self.m1 += self.incm1;
                    if self.m1 >= 1.0 {
                        self.m1 -= 1.0;
                    }
                    self.m2 += self.incm2;
                    if self.m2 >= 1.0 {
                        self.m2 -= 1.0;
                    }
                    sin_turns(ph)
                }
                Osc::Noise | Osc::Metal => {
                    self.n_acc += self.n_inc;
                    if self.n_acc >= 1.0 {
                        self.n_acc -= 1.0;
                        self.lfsr = lfsr_step(self.lfsr, short);
                    }
                    if self.lfsr & 1 == 1 {
                        1.0
                    } else {
                        -1.0
                    }
                }
                Osc::None | Osc::White => 0.0,
                _ => wave(osc, t, inc, self.duty, self.stepped),
            };
            self.p1 = t + inc;
            if self.p1 >= 1.0 {
                self.p1 -= 1.0;
            }
            tone *= self.o1;

            let mut noise = 0.0;
            if osc2 != Osc::None {
                if osc2 == Osc::White {
                    noise += xorshift(&mut self.white) * o2mix;
                } else {
                    tone += wave(osc2, self.p2, self.inc2, o2duty, false) * o2mix;
                    self.p2 += self.inc2;
                    if self.p2 >= 1.0 {
                        self.p2 -= 1.0;
                    }
                }
            }
            let bl = breath + self.chiff;
            if bl > 0.0 {
                self.breath_lp = flush(self.breath_lp + self.breath_a * (xorshift(&mut self.white) - self.breath_lp));
                noise += self.breath_lp * bl * 2.0;
            }
            let y = match mode {
                FilterMode::Off => tone + noise,
                _ if noise_only => tone + self.svf.run(noise, mode),
                _ => self.svf.run(tone + noise, mode),
            };
            *s += y * self.level * self.amp * self.trem * self.burst;
            self.age = self.age.wrapping_add(1);
        }
    }
}

/// Band-limited (polyBLEP) pulse/saw, triangle (optionally NES-stepped) and sine.
#[inline(always)]
pub fn wave(osc: Osc, t: f32, inc: f32, duty: f32, stepped: bool) -> f32 {
    match osc {
        Osc::Pulse => {
            let mut v = if t < duty { 1.0 } else { -1.0 };
            v += blep(t, inc);
            let mut t2 = t + 1.0 - duty;
            if t2 >= 1.0 {
                t2 -= 1.0;
            }
            v -= blep(t2, inc);
            v - (2.0 * duty - 1.0)
        }
        Osc::Saw => 2.0 * t - 1.0 - blep(t, inc),
        Osc::Tri | Osc::TriNes => {
            let mut u = t + 0.25;
            if u >= 1.0 {
                u -= 1.0;
            }
            let v = 1.0 - 4.0 * (u - 0.5).abs();
            if stepped {
                ((v + 1.0) * 7.5 + 0.5).floor() * (1.0 / 7.5) - 1.0
            } else {
                v
            }
        }
        Osc::Sine => sin_turns(t),
        _ => 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::preset::{drum, instrument, N_INSTRUMENTS};

    const SR: f32 = 48000.0;

    fn note(freq: f32, gate_s: f32) -> NoteOn {
        NoteOn { freq, amp: 1.0, vel: 0.8, gate: (gate_s * SR) as u32, key: 60, legato: false, vib: -1.0, pan: 0.0, echo: 0.0 }
    }

    fn run(v: &mut Voice, secs: f32) -> Vec<f32> {
        let mut out = vec![0.0; (secs * SR) as usize];
        for chunk in out.chunks_mut(128) {
            v.render(chunk);
        }
        out
    }

    #[test]
    fn adsr_shape() {
        let p = Patch { osc: crate::preset::Osc::Sine, attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1, ..BASE };
        let mut v = Voice::new(1);
        v.note_on(&p, &note(440.0, 0.5), SR, 1);
        let mut buf = vec![0.0; (0.01 * SR) as usize + 2];
        v.render(&mut buf);
        assert!(v.level > 0.95, "attack reached {}", v.level);
        let mut buf = vec![0.0; (0.2 * SR) as usize];
        v.render(&mut buf);
        assert!((v.level - 0.5).abs() < 0.01, "sustain {}", v.level);
        let mut buf = vec![0.0; (0.3 * SR) as usize];
        v.render(&mut buf);
        assert_eq!(v.stage, Stage::Release);
        let mut buf = vec![0.0; (0.1 * SR) as usize];
        v.render(&mut buf);
        assert!(v.level < 0.5 * 0.0011, "release falls 60 dB in its time: {}", v.level);
        let mut buf = vec![0.0; (0.04 * SR) as usize];
        v.render(&mut buf);
        assert_eq!(v.stage, Stage::Off, "voice frees itself at -80 dB");
    }

    #[test]
    fn every_instrument_is_finite_and_bounded_across_the_keyboard() {
        for id in 0..N_INSTRUMENTS {
            for midi in [12.0f32, 36.0, 60.0, 84.0, 108.0, 127.0] {
                let (p, f) = if id == crate::preset::DRUMS {
                    let (p, f, _) = drum(midi as i32, 0.0);
                    (p, f)
                } else {
                    (instrument(id), midi_to_freq(midi))
                };
                let mut v = Voice::new(id as u32);
                let mut n = note(f, 0.4);
                n.amp = p.gain;
                v.note_on(&p, &n, SR, 1);
                let out = run(&mut v, 1.0);
                for x in &out {
                    assert!(x.is_finite(), "instrument {id} midi {midi} produced NaN");
                    assert!(x.abs() < 1.5, "instrument {id} midi {midi} peak {x}");
                }
            }
        }
    }

    #[test]
    fn one_shots_end_by_themselves() {
        for pc in 0..12 {
            let (p, f, _) = drum(pc, 0.0);
            let mut v = Voice::new(3);
            let mut n = note(f, 0.0);
            n.gate = u32::MAX;
            v.note_on(&p, &n, SR, 1);
            run(&mut v, 3.0);
            assert!(!v.is_active(), "drum {pc} still ringing after 3 s");
        }
    }

    #[test]
    fn pulse_has_no_dc() {
        for duty in [0.125f32, 0.25, 0.5, 0.75] {
            let p = Patch { osc: crate::preset::Osc::Pulse, duty, attack: 0.0005, sustain: 1.0, decay: 0.01, ..BASE };
            let mut v = Voice::new(1);
            v.note_on(&p, &note(441.0, 2.0), SR, 1);
            let out = run(&mut v, 1.0);
            let mean: f32 = out[4800..].iter().sum::<f32>() / (out.len() - 4800) as f32;
            assert!(mean.abs() < 0.01, "duty {duty} dc {mean}");
        }
    }
}
