//! Small DSP building blocks: f32 only, allocation-free, deterministic and denormal-safe.

pub const PI: f32 = core::f32::consts::PI;
pub const TAU: f32 = core::f32::consts::TAU;

/// Flush tiny values to zero so recursive state never drifts into (slow) denormals.
#[inline(always)]
pub fn flush(x: f32) -> f32 {
    if x.abs() < 1e-18 {
        0.0
    } else {
        x
    }
}

/// Fractional part for non-negative-ish phases.
#[inline(always)]
pub fn fract(x: f32) -> f32 {
    x - x.floor()
}

/// sin(2π·t) with t in turns (any range). Max error ≈ 4e-6 (−108 dB).
#[inline(always)]
pub fn sin_turns(t: f32) -> f32 {
    let mut x = t - (t + 0.5).floor(); // [-0.5, 0.5)
    if x > 0.25 {
        x = 0.5 - x;
    } else if x < -0.25 {
        x = -0.5 - x;
    }
    let r = x * TAU;
    let r2 = r * r;
    r * (1.0 + r2 * (-1.666_666_7e-1 + r2 * (8.333_333e-3 + r2 * (-1.984_127e-4 + r2 * 2.755_731_9e-6))))
}

/// 2^x with relative error < 2e-5 (≈ 0.03 cents). Identical on native and wasm.
#[inline]
pub fn exp2(x: f32) -> f32 {
    let x = if x.is_finite() { x.clamp(-125.0, 125.0) } else { 0.0 };
    let xi = x.floor();
    let f = x - xi;
    // Taylor series of e^(f·ln2), 6 terms
    let p = 1.0
        + f * (core::f32::consts::LN_2
            + f * (0.240_226_5 + f * (0.055_504_11 + f * (0.009_618_129 + f * (0.001_333_355 + f * 0.000_154_035)))));
    f32::from_bits(((xi as i32 + 127) as u32) << 23) * p
}

#[inline]
pub fn expf(x: f32) -> f32 {
    exp2(x * core::f32::consts::LOG2_E)
}

/// Per-step multiplier for an exponential decay with time constant `tau` seconds,
/// applied once every `step` samples.
#[inline]
pub fn decay_coef(tau: f32, step: f32, sr: f32) -> f32 {
    if tau <= 0.0 {
        0.0
    } else {
        expf(-step / (tau * sr))
    }
}

pub fn midi_to_freq(m: f32) -> f32 {
    440.0 * exp2((m - 69.0) / 12.0)
}

pub fn freq_to_midi(f: f32) -> f32 {
    69.0 + 12.0 * (f.max(1e-3) / 440.0).log2()
}

/// PolyBLEP residual for a unit-phase oscillator (step of size 2).
#[inline(always)]
pub fn blep(t: f32, dt: f32) -> f32 {
    if t < dt {
        let x = t / dt;
        x + x - x * x - 1.0
    } else if t > 1.0 - dt {
        let x = (t - 1.0) / dt;
        x * x + x + x + 1.0
    } else {
        0.0
    }
}

/// 15-bit NES-style LFSR: long mode (32767 steps) or short "metallic" mode (93 steps).
#[inline(always)]
pub fn lfsr_step(s: u16, short: bool) -> u16 {
    let fb = (s ^ (s >> if short { 6 } else { 1 })) & 1;
    (s >> 1) | (fb << 14)
}

/// Deterministic white noise in [-1, 1).
#[inline(always)]
pub fn xorshift(s: &mut u32) -> f32 {
    let mut x = *s;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    *s = x;
    (x as i32 as f32) * (1.0 / 2_147_483_648.0)
}

/// One-pole low-pass coefficient (y += a·(x − y)). `fc <= 0` → bypass (a = 1).
pub fn onepole_coef(fc: f32, sr: f32) -> f32 {
    if fc <= 0.0 {
        1.0
    } else {
        1.0 - expf(-TAU * fc.min(sr * 0.49) / sr)
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum FilterMode {
    Off,
    Lp,
    Bp,
    Hp,
}

/// Topology-preserving-transform state-variable filter (stable under fast modulation).
#[derive(Clone, Copy, Debug, Default)]
pub struct Svf {
    ic1: f32,
    ic2: f32,
    a1: f32,
    a2: f32,
    a3: f32,
    k: f32,
    pub fc: f32,
}

impl Svf {
    /// Update coefficients; skips the `tan` when the cutoff barely moved.
    pub fn set(&mut self, fc: f32, q: f32, sr: f32) {
        let fc = fc.clamp(10.0, sr * 0.45);
        if self.a1 != 0.0 && (fc - self.fc).abs() <= self.fc * 0.002 {
            return;
        }
        self.fc = fc;
        let g = (PI * fc / sr).tan();
        let k = 1.0 / q.clamp(0.3, 20.0);
        self.k = k;
        self.a1 = 1.0 / (1.0 + g * (g + k));
        self.a2 = g * self.a1;
        self.a3 = g * self.a2;
    }

    pub fn force_update(&mut self) {
        self.a1 = 0.0;
    }

    pub fn reset(&mut self) {
        self.ic1 = 0.0;
        self.ic2 = 0.0;
    }

    #[inline(always)]
    pub fn run(&mut self, x: f32, mode: FilterMode) -> f32 {
        let v3 = x - self.ic2;
        let v1 = self.a1 * self.ic1 + self.a2 * v3;
        let v2 = self.ic2 + self.a2 * self.ic1 + self.a3 * v3;
        self.ic1 = flush(2.0 * v1 - self.ic1);
        self.ic2 = flush(2.0 * v2 - self.ic2);
        match mode {
            FilterMode::Lp => v2,
            FilterMode::Bp => self.k * v1,
            FilterMode::Hp => x - self.k * v1 - v2,
            FilterMode::Off => x,
        }
    }
}

pub const CLIP_KNEE: f32 = 0.9;
pub const CLIP_CEIL: f32 = 0.99;

/// Transparent below the knee, smoothly saturating to ±CLIP_CEIL above it (slope-continuous).
#[inline(always)]
pub fn soft_clip(x: f32) -> f32 {
    let a = x.abs();
    if a <= CLIP_KNEE {
        x
    } else {
        let o = (a - CLIP_KNEE) / (CLIP_CEIL - CLIP_KNEE);
        (CLIP_KNEE + (CLIP_CEIL - CLIP_KNEE) * o / (1.0 + o)).copysign(x)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sine_is_accurate() {
        let mut worst = 0.0f32;
        for i in -2000..2000 {
            let t = i as f32 / 997.0;
            let e = (sin_turns(t) - (t as f64 * std::f64::consts::TAU).sin() as f32).abs();
            worst = worst.max(e);
        }
        assert!(worst < 2e-5, "sin error {worst}");
    }

    #[test]
    fn exp2_is_accurate() {
        for i in -400..400 {
            let x = i as f32 / 37.0;
            let want = 2f64.powf(x as f64) as f32;
            let got = exp2(x);
            assert!(((got - want) / want).abs() < 3e-5, "exp2({x}) = {got}, want {want}");
        }
        assert!(exp2(f32::NAN).is_finite());
    }

    #[test]
    fn lfsr_periods() {
        let mut s = 1u16;
        let mut n = 0;
        loop {
            s = lfsr_step(s, false);
            n += 1;
            if s == 1 {
                break;
            }
        }
        assert_eq!(n, 32767);
        let mut s = 1u16;
        let mut seen = std::collections::HashSet::new();
        for _ in 0..200 {
            s = lfsr_step(s, true);
            seen.insert(s);
        }
        assert!(seen.len() <= 93);
    }

    #[test]
    fn soft_clip_is_bounded_and_monotonic() {
        let mut last = -1.0;
        for i in -2000..2000 {
            let x = i as f32 / 100.0;
            let y = soft_clip(x);
            assert!(y.abs() < CLIP_CEIL);
            assert!(y >= last);
            last = y;
        }
        assert_eq!(soft_clip(0.5), 0.5);
    }

    #[test]
    fn svf_flushes_to_zero() {
        let mut f = Svf::default();
        f.set(1000.0, 4.0, 48000.0);
        f.run(1.0, FilterMode::Bp);
        for _ in 0..200_000 {
            f.run(0.0, FilterMode::Lp);
        }
        assert_eq!(f.run(0.0, FilterMode::Lp), 0.0);
    }
}
