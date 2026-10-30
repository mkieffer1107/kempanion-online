//! The whole synth: BGM + jingle sequencers, SFX and voice (text blip) banks, master stereo echo,
//! ducking, volumes, limiter and soft clip. All memory is allocated in `Engine::new`.

use crate::dsp::*;
use crate::format::*;
use crate::preset::{drum, instrument, wave_osc, Patch, BASE, DRUMS, N_INSTRUMENTS};
use crate::song::{PlayState, Player};
use crate::voice::{NoteOn, Voice};

pub const BLOCK: usize = 128;
pub const MAX_FRAMES: usize = 4096;
pub const SFX_VOICES: usize = 16;
pub const SFX_PENDING: usize = 256;
pub const BLIP_VOICES: usize = 8;

/// Jingles duck the BGM to this gain; text blips to `BLIP_DUCK`.
const JINGLE_DUCK: f32 = 0.2;
const BLIP_DUCK: f32 = 0.72;
const LIMIT: f32 = 0.92;

pub const STAT_PEAK_MIX: usize = 0;
pub const STAT_PEAK_OUT: usize = 1;
pub const STAT_MAX_VOICES: usize = 2;
pub const STAT_STEALS: usize = 3;
pub const STAT_NAN_RESETS: usize = 4;
pub const STAT_MIN_LIMITER_GAIN: usize = 5;
pub const STAT_SUM_SQ: usize = 6;
pub const STAT_FRAMES: usize = 7;

struct Pending {
    at: u32,
    patch: Patch,
    note: NoteOn,
}

/// A pool of free-running voices with their own pan and echo send (SFX, blips).
pub struct Bank {
    pub voices: Vec<Voice>,
    pending: Vec<Pending>,
    order: u32,
    sr: f32,
}

impl Bank {
    fn new(n: usize, pending: usize, sr: f32, seed: u32) -> Bank {
        Bank {
            voices: (0..n).map(|i| Voice::new(seed.wrapping_add(i as u32 * 104_729))).collect(),
            pending: Vec::with_capacity(pending),
            order: 0,
            sr,
        }
    }

    fn schedule(&mut self, at: u32, patch: Patch, note: NoteOn) -> bool {
        if self.pending.len() >= self.pending.capacity() {
            return false;
        }
        self.pending.push(Pending { at, patch, note });
        true
    }

    fn start(&mut self, patch: &Patch, note: &NoteOn) -> bool {
        self.order = self.order.wrapping_add(1);
        let (idx, stolen) = match self.voices.iter().position(|v| !v.is_active()) {
            Some(i) => (i, false),
            None => (self.voices.iter().enumerate().min_by_key(|(_, v)| v.order).map_or(0, |(i, _)| i), true),
        };
        self.voices[idx].note_on(patch, note, self.sr, self.order);
        stolen
    }

    /// Start pending layers that are due within the next `n` samples.
    fn start_due(&mut self, n: usize) -> u32 {
        let mut steals = 0;
        let mut i = 0;
        while i < self.pending.len() {
            if (self.pending[i].at as usize) < n {
                let p = self.pending.swap_remove(i);
                if self.start(&p.patch, &p.note) {
                    steals += 1;
                }
            } else {
                self.pending[i].at -= n as u32;
                i += 1;
            }
        }
        steals
    }

    fn render(&mut self, l: &mut [f32], r: &mut [f32], e: &mut [f32], sc: &mut [f32]) {
        for v in self.voices.iter_mut() {
            if !v.is_active() {
                continue;
            }
            sc.fill(0.0);
            v.render(sc);
            let (gl, gr, ge) = (v.pan_l, v.pan_r, v.echo);
            for (((x, lo), ro), eo) in sc.iter().zip(l.iter_mut()).zip(r.iter_mut()).zip(e.iter_mut()) {
                *lo += x * gl;
                *ro += x * gr;
                *eo += x * ge;
            }
        }
    }

    pub fn active(&self) -> usize {
        self.voices.iter().filter(|v| v.is_active()).count()
    }

    fn clear(&mut self) {
        self.pending.clear();
        for v in self.voices.iter_mut() {
            v.kill();
        }
    }
}

/// Stereo ping-pong echo (dotted eighth of the current song) with damped, high-passed feedback.
struct Echo {
    l: Vec<f32>,
    r: Vec<f32>,
    w: usize,
    d: f32,
    target: f32,
    fb: f32,
    wet: f32,
    lpa: f32,
    hpa: f32,
    lpl: f32,
    lpr: f32,
    hpl: f32,
    hpr: f32,
    sr: f32,
}

impl Echo {
    fn new(sr: f32) -> Echo {
        let len = (sr * 1.0) as usize + 8;
        let mut e = Echo {
            l: vec![0.0; len],
            r: vec![0.0; len],
            w: 0,
            d: 0.0,
            target: 0.0,
            fb: 0.4,
            wet: 0.55,
            lpa: onepole_coef(2800.0, sr),
            hpa: onepole_coef(180.0, sr),
            lpl: 0.0,
            lpr: 0.0,
            hpl: 0.0,
            hpr: 0.0,
            sr,
        };
        e.set_bpm(120.0);
        e.d = e.target;
        e
    }

    fn set_bpm(&mut self, bpm: f32) {
        let secs = (0.75 * 60.0 / bpm.max(20.0)).clamp(0.12, 0.95);
        self.target = (secs * self.sr).min((self.l.len() - 4) as f32);
    }

    fn clear(&mut self) {
        self.l.fill(0.0);
        self.r.fill(0.0);
        self.lpl = 0.0;
        self.lpr = 0.0;
        self.hpl = 0.0;
        self.hpr = 0.0;
    }

    #[inline(always)]
    fn process(&mut self, x: f32) -> (f32, f32) {
        let len = self.l.len();
        self.d += (self.target - self.d) * 0.0004;
        let rp = self.w as f32 + len as f32 - self.d;
        let fi = rp.floor();
        let fr = rp - fi;
        let mut i0 = fi as usize;
        while i0 >= len {
            i0 -= len;
        }
        let mut i1 = i0 + 1;
        if i1 >= len {
            i1 -= len;
        }
        let yl = self.l[i0] + (self.l[i1] - self.l[i0]) * fr;
        let yr = self.r[i0] + (self.r[i1] - self.r[i0]) * fr;
        self.lpl = flush(self.lpl + self.lpa * (yr - self.lpl));
        self.lpr = flush(self.lpr + self.lpa * (yl - self.lpr));
        self.hpl = flush(self.hpl + self.hpa * (self.lpl - self.hpl));
        self.hpr = flush(self.hpr + self.hpa * (self.lpr - self.hpr));
        self.l[self.w] = flush(x * 0.85 + (self.lpl - self.hpl) * self.fb);
        self.r[self.w] = flush(x * 0.3 + (self.lpr - self.hpr) * self.fb);
        self.w += 1;
        if self.w >= len {
            self.w = 0;
        }
        (yl * self.wet, yr * self.wet)
    }
}

struct Bus {
    l: [f32; BLOCK],
    r: [f32; BLOCK],
    e: [f32; BLOCK],
}

impl Bus {
    fn new() -> Bus {
        Bus { l: [0.0; BLOCK], r: [0.0; BLOCK], e: [0.0; BLOCK] }
    }
    fn clear(&mut self, n: usize) {
        self.l[..n].fill(0.0);
        self.r[..n].fill(0.0);
        self.e[..n].fill(0.0);
    }
}

pub struct Engine {
    pub sr: f32,
    pub bgm: Player,
    pub jingle: Player,
    pub sfx: Bank,
    pub vox: Bank,
    echo: Echo,
    vol: [f32; 4],
    vol_cur: [f32; 4],
    vol_a: f32,
    duck: f32,
    duck_down: f32,
    duck_up: f32,
    blip_hold: u32,
    lim_env: f32,
    lim_att: f32,
    lim_rel: f32,
    b_bgm: Bus,
    b_jin: Bus,
    b_sfx: Bus,
    b_vox: Bus,
    scratch: [f32; BLOCK],
    out: Vec<f32>,
    stats: [f32; 8],
    sfx_steals: u32,
    sum_sq: f64,
    frames: f64,
}

impl Engine {
    pub fn new(sample_rate: f32) -> Engine {
        let sr = if sample_rate.is_finite() { sample_rate.clamp(8000.0, 384_000.0) } else { 48000.0 };
        let mut e = Engine {
            sr,
            bgm: Player::new(sr, 1),
            jingle: Player::new(sr, 2),
            sfx: Bank::new(SFX_VOICES, SFX_PENDING, sr, 3),
            vox: Bank::new(BLIP_VOICES, 0, sr, 4),
            echo: Echo::new(sr),
            vol: [1.0; 4],
            vol_cur: [1.0; 4],
            vol_a: onepole_coef(30.0, sr),
            duck: 1.0,
            duck_down: onepole_coef(1.0 / (TAU * 0.05), sr),
            duck_up: onepole_coef(1.0 / (TAU * 0.45), sr),
            blip_hold: 0,
            lim_env: 0.0,
            lim_att: onepole_coef(1.0 / (TAU * 0.0015), sr),
            lim_rel: onepole_coef(1.0 / (TAU * 0.15), sr),
            b_bgm: Bus::new(),
            b_jin: Bus::new(),
            b_sfx: Bus::new(),
            b_vox: Bus::new(),
            scratch: [0.0; BLOCK],
            out: vec![0.0; MAX_FRAMES * 2],
            stats: [0.0; 8],
            sfx_steals: 0,
            sum_sq: 0.0,
            frames: 0.0,
        };
        e.reset_stats();
        e
    }

    pub fn load_song(&mut self, d: &[f32]) -> i32 {
        self.bgm.load(d)
    }

    pub fn play(&mut self, fade_out_ms: f32, fade_in_ms: f32, serial: u32) -> i32 {
        let fo = if fade_out_ms.is_finite() { fade_out_ms / 1000.0 } else { 0.5 };
        let fi = if fade_in_ms.is_finite() { fade_in_ms / 1000.0 } else { 0.0 };
        self.bgm.play(fo.clamp(0.0, 30.0), fi.clamp(0.0, 30.0), serial)
    }

    pub fn stop(&mut self, fade_ms: f32) {
        let f = if fade_ms.is_finite() { fade_ms / 1000.0 } else { 0.5 };
        self.bgm.stop(f.clamp(0.0, 30.0));
    }

    pub fn jingle(&mut self, d: &[f32]) -> i32 {
        let r = self.jingle.load(d);
        if r == 0 {
            self.jingle.play(0.03, 0.0, 0)
        } else {
            r
        }
    }

    pub fn stop_jingle(&mut self, fade_ms: f32) {
        self.jingle.stop((fade_ms / 1000.0).clamp(0.0, 10.0));
    }

    pub fn set_volumes(&mut self, master: f32, bgm: f32, sfx: f32, voice: f32) {
        for (slot, v) in self.vol.iter_mut().zip([master, bgm, sfx, voice]) {
            if v.is_finite() {
                *slot = v.clamp(0.0, 2.0);
            }
        }
    }

    /// Schedule an SFX blob (layers on the SFX bus). Returns 0, or a negative error code.
    pub fn trigger_sfx(&mut self, d: &[f32]) -> i32 {
        if d.len() < SFX_HEADER {
            return -1;
        }
        if d[0] != KIND_SFX || d[1] != VERSION {
            return -2;
        }
        let n = d[2];
        if !(n >= 0.0 && n <= MAX_LAYERS as f32) {
            return -3;
        }
        let n = n as usize;
        if d.len() < SFX_HEADER + n * LAYER_STRIDE {
            return -4;
        }
        let gain = if d[3].is_finite() { d[3].clamp(0.0, 4.0) } else { 1.0 };
        let sr = self.sr;
        for i in 0..n {
            let l = &d[SFX_HEADER + i * LAYER_STRIDE..SFX_HEADER + (i + 1) * LAYER_STRIDE];
            if !l.iter().all(|x| x.is_finite()) {
                continue;
            }
            let (patch, note) = layer(l, gain, sr);
            let at = (l[L_AT].clamp(0.0, 20.0) * sr) as u32;
            self.sfx.schedule(at, patch, note);
        }
        0
    }

    /// Text blip on the voice bus. `wave` is a W_* id.
    #[allow(clippy::too_many_arguments)]
    pub fn blip(&mut self, wave: u32, freq: f32, len_ms: f32, vol: f32, attack_ms: f32, release_ms: f32, glide: f32, lowpass: f32, pan: f32) {
        if !(freq.is_finite() && len_ms.is_finite() && vol.is_finite()) || vol <= 0.0 {
            return;
        }
        let (osc, duty) = wave_osc(wave);
        let ms = |x: f32, lo: f32, hi: f32, def: f32| if x.is_finite() && x > 0.0 { (x / 1000.0).clamp(lo, hi) } else { def };
        let len = ms(len_ms, 0.003, 1.0, 0.03);
        let mut p = Patch {
            osc,
            duty,
            attack: ms(attack_ms, 0.0005, 0.2, 0.001),
            decay: 0.05,
            sustain: 1.0,
            release: ms(release_ms, 0.001, 0.3, 0.008),
            gain: 1.0,
            echo: 0.0,
            ..BASE
        };
        if glide.is_finite() && glide != 0.0 {
            p.sweep_to = freq * exp2(glide.clamp(-24.0, 24.0) / 12.0);
            p.sweep_time = len;
        }
        if lowpass.is_finite() && lowpass > 0.0 {
            p.filter = FilterMode::Lp;
            p.cutoff = lowpass;
        }
        let note = NoteOn {
            freq: freq.clamp(20.0, 20_000.0),
            amp: vol.clamp(0.0, 1.5),
            vel: 1.0,
            gate: (len * self.sr) as u32,
            key: -1,
            legato: false,
            vib: -1.0,
            pan: if pan.is_finite() { pan } else { 0.0 },
            echo: 0.0,
        };
        self.vox.start(&p, &note);
        self.blip_hold = (0.16 * self.sr) as u32;
    }

    pub fn all_off(&mut self) {
        self.bgm.kill_all();
        self.jingle.kill_all();
        self.sfx.clear();
        self.vox.clear();
        self.echo.clear();
        self.lim_env = 0.0;
    }

    pub fn song_position(&self) -> f64 {
        if self.bgm.state == PlayState::Idle {
            0.0
        } else {
            self.bgm.elapsed as f64 / self.sr as f64
        }
    }

    /// 0 idle, 1 playing, 2 fading out (to stop or to the next song), 3 finished (non-looping song ended).
    pub fn song_state(&self) -> u32 {
        match self.bgm.state {
            PlayState::Idle => 0,
            PlayState::Playing if self.bgm.is_fading_out() => 2,
            PlayState::Playing => 1,
            PlayState::Finished => 3,
        }
    }

    pub fn stats(&self) -> &[f32; 8] {
        &self.stats
    }

    pub fn reset_stats(&mut self) {
        self.stats = [0.0; 8];
        self.stats[STAT_MIN_LIMITER_GAIN] = 1.0;
        self.bgm.steals = 0;
        self.jingle.steals = 0;
        self.sfx_steals = 0;
        self.sum_sq = 0.0;
        self.frames = 0.0;
    }

    /// Render `frames` (≤ MAX_FRAMES) of interleaved stereo. Never allocates.
    pub fn render(&mut self, frames: usize) -> &[f32] {
        let frames = frames.min(MAX_FRAMES);
        let mut done = 0;
        while done < frames {
            let n = (frames - done).min(BLOCK);
            self.render_block(done, n);
            done += n;
        }
        self.stats[STAT_STEALS] = (self.bgm.steals + self.jingle.steals + self.sfx_steals) as f32;
        &self.out[..frames * 2]
    }

    fn render_block(&mut self, off: usize, n: usize) {
        self.b_bgm.clear(n);
        self.b_jin.clear(n);
        self.b_sfx.clear(n);
        self.b_vox.clear(n);
        self.sfx_steals += self.sfx.start_due(n);

        let sc = &mut self.scratch[..n];
        self.bgm.render(&mut self.b_bgm.l[..n], &mut self.b_bgm.r[..n], &mut self.b_bgm.e[..n], sc);
        self.jingle.render(&mut self.b_jin.l[..n], &mut self.b_jin.r[..n], &mut self.b_jin.e[..n], sc);
        self.sfx.render(&mut self.b_sfx.l[..n], &mut self.b_sfx.r[..n], &mut self.b_sfx.e[..n], sc);
        self.vox.render(&mut self.b_vox.l[..n], &mut self.b_vox.r[..n], &mut self.b_vox.e[..n], sc);
        if self.bgm.tempo_dirty {
            self.bgm.tempo_dirty = false;
            self.echo.set_bpm(self.bgm.bpm);
        }
        self.jingle.tempo_dirty = false;

        let mut target = if self.jingle.sounding() { JINGLE_DUCK } else { 1.0 };
        if self.blip_hold > 0 {
            target *= BLIP_DUCK;
            self.blip_hold = self.blip_hold.saturating_sub(n as u32);
        }

        let mut peak_mix = self.stats[STAT_PEAK_MIX];
        let mut peak_out = self.stats[STAT_PEAK_OUT];
        let mut min_gain = self.stats[STAT_MIN_LIMITER_GAIN];
        let mut sum_sq = 0.0f32;
        let out = &mut self.out[off * 2..(off + n) * 2];
        for k in 0..n {
            for (c, t) in self.vol_cur.iter_mut().zip(self.vol.iter()) {
                *c += (*t - *c) * self.vol_a;
            }
            let [master, bgm, sfx, voice] = self.vol_cur;
            let a = if target < self.duck { self.duck_down } else { self.duck_up };
            self.duck += (target - self.duck) * a;
            let bg = bgm * self.duck;
            let mut l = self.b_bgm.l[k] * bg + self.b_jin.l[k] * bgm + self.b_sfx.l[k] * sfx + self.b_vox.l[k] * voice;
            let mut r = self.b_bgm.r[k] * bg + self.b_jin.r[k] * bgm + self.b_sfx.r[k] * sfx + self.b_vox.r[k] * voice;
            let send = self.b_bgm.e[k] * bg + self.b_jin.e[k] * bgm + self.b_sfx.e[k] * sfx;
            let (el, er) = self.echo.process(send);
            l = (l + el) * master;
            r = (r + er) * master;
            let pk = l.abs().max(r.abs());
            peak_mix = peak_mix.max(pk);
            let c = if pk > self.lim_env { self.lim_att } else { self.lim_rel };
            self.lim_env = flush(self.lim_env + (pk - self.lim_env) * c);
            let g = if self.lim_env > LIMIT { LIMIT / self.lim_env } else { 1.0 };
            min_gain = min_gain.min(g);
            let lo = soft_clip(l * g);
            let ro = soft_clip(r * g);
            out[2 * k] = lo;
            out[2 * k + 1] = ro;
            peak_out = peak_out.max(lo.abs().max(ro.abs()));
            sum_sq += lo * lo + ro * ro;
        }

        if !sum_sq.is_finite() || !peak_mix.is_finite() {
            // Something blew up (should never happen): silence this block and reset all DSP state.
            out.fill(0.0);
            self.all_off();
            self.stats[STAT_NAN_RESETS] += 1.0;
            return;
        }
        self.stats[STAT_PEAK_MIX] = peak_mix;
        self.stats[STAT_PEAK_OUT] = peak_out;
        self.stats[STAT_MIN_LIMITER_GAIN] = min_gain;
        self.sum_sq += sum_sq as f64;
        self.frames += n as f64;
        self.stats[STAT_SUM_SQ] = self.sum_sq as f32;
        self.stats[STAT_FRAMES] = self.frames as f32;
        let voices = self.sfx.active()
            + self.vox.active()
            + self.bgm.channels.iter().chain(self.jingle.channels.iter()).map(|c| c.voices.iter().filter(|v| v.is_active()).count()).sum::<usize>();
        self.stats[STAT_MAX_VOICES] = self.stats[STAT_MAX_VOICES].max(voices as f32);
    }
}

/// Build a voice from one SFX layer.
fn layer(l: &[f32], gain: f32, sr: f32) -> (Patch, NoteOn) {
    let inst = l[L_INST];
    let mut freq = l[L_FREQ].clamp(1.0, 96_000.0);
    let vol = l[L_VOL].clamp(0.0, 4.0) * gain;
    let len = l[L_LEN].clamp(0.001, 30.0);
    let mut patch;
    let mut amp = vol;
    if inst >= 0.0 {
        let id = (inst as usize).min(N_INSTRUMENTS - 1);
        if id == DRUMS {
            let m = freq_to_midi(freq).round() as i32;
            let (p, f, _) = drum(m, 0.0);
            patch = p;
            freq = f;
        } else {
            patch = instrument(id);
        }
        amp = patch.gain * vol;
        if l[L_FREQ_TO] > 0.0 {
            patch.sweep_to = l[L_FREQ_TO];
            patch.sweep_time = l[L_GLIDE].max(0.001);
        }
    } else {
        let (osc, duty) = wave_osc(l[L_WAVE].max(0.0) as u32);
        let filter = match l[L_FILTER] as i32 {
            1 => FilterMode::Lp,
            2 => FilterMode::Bp,
            3 => FilterMode::Hp,
            _ => FilterMode::Off,
        };
        patch = Patch {
            osc,
            duty: if l[L_DUTY] > 0.0 && l[L_DUTY] < 1.0 { l[L_DUTY] } else { duty },
            attack: l[L_ATTACK].clamp(0.0, 10.0),
            decay: l[L_DECAY].clamp(0.0, 30.0),
            sustain: l[L_SUSTAIN].clamp(0.0, 1.0),
            release: l[L_RELEASE].clamp(0.0, 10.0),
            gain: 1.0,
            sweep_to: l[L_FREQ_TO].max(0.0),
            sweep_time: l[L_GLIDE].max(0.0),
            vib_depth: l[L_VIB_DEPTH].clamp(0.0, 12.0),
            vib_rate: l[L_VIB_RATE].clamp(0.0, 200.0),
            vib_delay: 0.0,
            trem_depth: l[L_TREM_DEPTH].clamp(0.0, 1.0),
            trem_rate: l[L_TREM_RATE].clamp(0.0, 200.0),
            filter,
            cutoff: l[L_CUTOFF].clamp(10.0, 40_000.0),
            cutoff_to: l[L_CUTOFF_TO].max(0.0),
            q: l[L_Q].clamp(0.3, 20.0),
            fm_ratio: l[L_FM_RATIO].clamp(0.0, 32.0),
            fm_index: l[L_FM_INDEX].clamp(0.0, 30.0),
            fm_index_end: l[L_FM_INDEX_END].clamp(0.0, 30.0),
            fm_time: l[L_FM_TIME].max(0.001),
            breath: l[L_NOISE].clamp(0.0, 2.0),
            pitch_env: l[L_PITCH_ENV].clamp(-48.0, 48.0),
            pitch_time: l[L_PITCH_TIME].max(0.0005),
            bursts: l[L_BURSTS].clamp(0.0, 16.0),
            burst_gap: l[L_BURST_GAP].max(0.001),
            echo: 1.0,
            ..BASE
        };
    }
    let note = NoteOn {
        freq,
        amp,
        vel: vol.min(1.0),
        gate: if patch.one_shot { u32::MAX } else { (len * sr) as u32 },
        key: -1,
        legato: false,
        vib: if l[L_VIB_DEPTH] > 0.0 && inst >= 0.0 { l[L_VIB_DEPTH] } else { -1.0 },
        pan: l[L_PAN],
        echo: l[L_ECHO].clamp(0.0, 1.0),
    };
    (patch, note)
}
