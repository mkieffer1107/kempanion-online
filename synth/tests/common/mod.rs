// Test helpers: a tiny song/SFX encoder mirroring src/lib/audio/encode.ts.
#![allow(dead_code)]

use kempa_synth::format::*;

pub const SR: f32 = 48000.0;
pub const Q: f32 = 96.0;

#[derive(Default)]
pub struct SongBuilder {
    pub bpm: f32,
    pub looping: bool,
    pub echo: f32,
    pub length: f32,
    pub loop_tick: f32,
    pub tracks: Vec<[f32; 4]>,
    pub events: Vec<[f32; 8]>,
}

impl SongBuilder {
    pub fn new(bpm: f32, looping: bool) -> Self {
        SongBuilder { bpm, looping, echo: 0.25, ..Default::default() }
    }
    pub fn track(&mut self, inst: usize, vol: f32, pan: f32) -> usize {
        self.tracks.push([inst as f32, vol, pan, 0.0]);
        self.tracks.len() - 1
    }
    pub fn note(&mut self, track: usize, tick: f32, midi: f32, dur: f32, vel: f32) {
        self.events.push([tick, track as f32, EV_NOTE as f32, midi, (dur * 7.0 / 8.0).max(1.0), vel, 1.0, dur]);
        self.length = self.length.max(tick + dur);
    }
    pub fn chord(&mut self, track: usize, tick: f32, midis: &[f32], dur: f32, vel: f32) {
        for &m in midis {
            self.events.push([tick, track as f32, EV_NOTE as f32, m, dur * 7.0 / 8.0, vel, midis.len() as f32, dur]);
        }
        self.length = self.length.max(tick + dur);
    }
    pub fn ctrl(&mut self, track: usize, tick: f32, kind: u8, a: f32) {
        self.events.push([tick, track as f32, kind as f32, a, 0.0, 0.0, 0.0, 0.0]);
    }
    pub fn blob(&self) -> Vec<f32> {
        let mut ev = self.events.clone();
        let prio = |k: f32| if k == EV_NOTE as f32 { 1 } else { 0 };
        ev.sort_by(|a, b| a[0].partial_cmp(&b[0]).unwrap().then(prio(a[2]).cmp(&prio(b[2]))));
        let mut d = vec![
            KIND_SONG,
            VERSION,
            self.bpm,
            if self.looping { 1.0 } else { 0.0 },
            self.echo,
            self.length,
            self.loop_tick,
            self.tracks.len() as f32,
            ev.len() as f32,
            0.0,
            0.0,
            0.0,
        ];
        for t in &self.tracks {
            d.extend_from_slice(t);
        }
        for e in &ev {
            d.extend_from_slice(e);
        }
        d
    }
}

/// A busy six-track song (lead, pad chords, bass, drums, pluck arpeggio, e-piano) — 8 bars at 120 BPM.
pub fn busy_song(looping: bool) -> SongBuilder {
    let mut s = SongBuilder::new(120.0, looping);
    let lead = s.track(6, 0.8, 0.0);
    let pad = s.track(13, 0.7, -0.3);
    let bass = s.track(12, 0.85, 0.0);
    let drums = s.track(18, 0.8, 0.0);
    let arp = s.track(7, 0.6, 0.35);
    let ep = s.track(8, 0.6, -0.2);
    let prog = [[60.0, 64.0, 67.0, 71.0], [57.0, 60.0, 64.0, 67.0], [53.0, 57.0, 60.0, 64.0], [55.0, 59.0, 62.0, 65.0]];
    let melody = [72.0, 74.0, 76.0, 79.0, 77.0, 76.0, 74.0, 72.0];
    for bar in 0..8 {
        let t0 = bar as f32 * 4.0 * Q;
        let ch = prog[bar % 4];
        s.chord(pad, t0, &ch, 4.0 * Q, 0.8);
        s.chord(ep, t0, &ch[..3], 2.0 * Q, 0.75);
        s.chord(ep, t0 + 2.0 * Q, &ch[..3], 2.0 * Q, 0.7);
        for i in 0..8 {
            let t = t0 + i as f32 * Q / 2.0;
            s.note(lead, t, melody[(i + bar) % 8], Q / 2.0, 0.8);
            s.note(bass, t, ch[0] - 24.0 + if i % 2 == 1 { 12.0 } else { 0.0 }, Q / 2.0, 0.85);
            s.note(drums, t, if i % 4 == 0 { 60.0 } else if i % 4 == 2 { 62.0 } else { 64.0 }, Q / 2.0, 0.85);
        }
        for i in 0..16 {
            s.note(arp, t0 + i as f32 * Q / 4.0, ch[i % 4] + 12.0, Q / 4.0, 0.7);
        }
    }
    s
}

/// One-layer raw SFX blob.
pub fn sfx_blob(layers: &[[f32; LAYER_STRIDE]]) -> Vec<f32> {
    let mut d = vec![KIND_SFX, VERSION, layers.len() as f32, 1.0];
    for l in layers {
        d.extend_from_slice(l);
    }
    d
}

pub fn raw_layer(at: f32, wave: u32, freq: f32, len: f32, vol: f32) -> [f32; LAYER_STRIDE] {
    let mut l = [0.0; LAYER_STRIDE];
    l[L_AT] = at;
    l[L_INST] = -1.0;
    l[L_WAVE] = wave as f32;
    l[L_FREQ] = freq;
    l[L_LEN] = len;
    l[L_ATTACK] = 0.002;
    l[L_DECAY] = 0.1;
    l[L_SUSTAIN] = 1.0;
    l[L_RELEASE] = 0.03;
    l[L_VOL] = vol;
    l[L_Q] = 0.707;
    l[L_FM_RATIO] = 1.0;
    l[L_PITCH_TIME] = 0.05;
    l[L_CUTOFF] = 8000.0;
    l
}

pub fn render_secs(e: &mut kempa_synth::Engine, secs: f32) -> Vec<f32> {
    let frames = (secs * SR) as usize;
    let mut out = Vec::with_capacity(frames * 2);
    let mut left = frames;
    while left > 0 {
        let n = left.min(512);
        out.extend_from_slice(e.render(n));
        left -= n;
    }
    out
}

pub fn rms(x: &[f32]) -> f32 {
    if x.is_empty() {
        return 0.0;
    }
    (x.iter().map(|v| v * v).sum::<f32>() / x.len() as f32).sqrt()
}

pub fn peak(x: &[f32]) -> f32 {
    x.iter().fold(0.0f32, |m, v| m.max(v.abs()))
}
