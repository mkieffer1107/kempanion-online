//! Song data (parsed from the binary format) and the sequencer that plays it: tempo, seamless looping,
//! fades, per-track channels (instrument, volume, pan, vibrato, one-pole low-pass, echo send) with up to
//! four voices each.

use crate::dsp::*;
use crate::format::*;
use crate::preset::{drum, instrument, DRUMS, N_INSTRUMENTS};
use crate::voice::{NoteOn, Stage, Voice};

/// Voice slots per track: MML chords have at most 4 notes; the extra slots let release tails of the
/// previous chord overlap the next one instead of being stolen.
pub const VOICES_PER_TRACK: usize = 8;
/// MML `y` step → vibrato depth in semitones.
pub const VIB_STEP: f32 = 0.04;

#[derive(Clone, Copy, Default, Debug)]
pub struct Event {
    pub tick: f64,
    pub track: u8,
    pub kind: u8,
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub d: f32,
}

#[derive(Clone, Copy, Debug)]
pub struct TrackState {
    pub inst: u8,
    pub vol: f32,
    pub pan: f32,
    /// MML vibrato depth 0..15, or -1 for the instrument's default.
    pub vib: f32,
}

impl Default for TrackState {
    fn default() -> Self {
        TrackState { inst: 2, vol: 0.8, pan: 0.0, vib: -1.0 }
    }
}

fn prio(kind: u8) -> u8 {
    match kind {
        EV_TEMPO => 0,
        EV_INST => 1,
        EV_PAN => 2,
        EV_VIB => 3,
        _ => 4,
    }
}

fn inst_id(x: f32) -> u8 {
    if x.is_finite() && x >= 0.0 && (x as usize) < N_INSTRUMENTS {
        x as u8
    } else {
        2
    }
}

fn apply_ctrl(states: &mut [TrackState; MAX_TRACKS], bpm: &mut f32, ev: &Event) {
    let st = &mut states[ev.track as usize];
    match ev.kind {
        EV_INST => st.inst = inst_id(ev.a),
        EV_PAN => st.pan = ev.a.clamp(-1.0, 1.0),
        EV_VIB => st.vib = ev.a.clamp(0.0, 15.0),
        EV_TEMPO => *bpm = ev.a.clamp(20.0, 400.0),
        _ => {}
    }
}

pub struct SongData {
    pub bpm: f32,
    pub looping: bool,
    pub echo: f32,
    pub length: f64,
    pub loop_tick: f64,
    pub n_tracks: usize,
    pub init: [TrackState; MAX_TRACKS],
    pub at_loop: [TrackState; MAX_TRACKS],
    pub loop_bpm: f32,
    pub loop_cursor: usize,
    pub events: Vec<Event>,
}

impl SongData {
    pub fn new() -> SongData {
        SongData {
            bpm: 120.0,
            looping: false,
            echo: 0.25,
            length: 0.0,
            loop_tick: 0.0,
            n_tracks: 0,
            init: [TrackState::default(); MAX_TRACKS],
            at_loop: [TrackState::default(); MAX_TRACKS],
            loop_bpm: 120.0,
            loop_cursor: 0,
            events: Vec::with_capacity(8192),
        }
    }

    /// Parse a SONG blob. Malformed events are skipped; a malformed header is an error (negative code).
    pub fn parse(&mut self, d: &[f32]) -> Result<(), i32> {
        if d.len() < SONG_HEADER {
            return Err(-1);
        }
        if d[0] != KIND_SONG || d[1] != VERSION {
            return Err(-2);
        }
        let fin = |x: f32, def: f32| if x.is_finite() { x } else { def };
        let bpm = fin(d[2], 120.0).clamp(20.0, 400.0);
        let looping = fin(d[3], 0.0) >= 0.5;
        let echo = fin(d[4], 0.25).clamp(0.0, 1.0);
        let mut length = fin(d[5], 0.0).max(0.0) as f64;
        let mut loop_tick = fin(d[6], 0.0).max(0.0) as f64;
        let nt = fin(d[7], 0.0);
        let ne = fin(d[8], -1.0);
        if !((1.0..=MAX_TRACKS as f32).contains(&nt) && (0.0..=MAX_EVENTS as f32).contains(&ne)) {
            return Err(-3);
        }
        let (nt, ne) = (nt as usize, ne as usize);
        if d.len() < SONG_HEADER + nt * TRACK_STRIDE + ne * EVENT_STRIDE {
            return Err(-4);
        }
        self.bpm = bpm;
        self.looping = looping;
        self.echo = echo;
        self.n_tracks = nt;
        self.init = [TrackState::default(); MAX_TRACKS];
        for i in 0..nt {
            let o = SONG_HEADER + i * TRACK_STRIDE;
            self.init[i] = TrackState {
                inst: inst_id(d[o]),
                vol: fin(d[o + 1], 0.8).clamp(0.0, 1.5),
                pan: fin(d[o + 2], 0.0).clamp(-1.0, 1.0),
                vib: -1.0,
            };
        }

        self.events.clear();
        let base = SONG_HEADER + nt * TRACK_STRIDE;
        let mut sorted = true;
        let mut last = (f64::NEG_INFINITY, 0u8);
        let mut max_end = 0.0f64;
        for i in 0..ne {
            let e = &d[base + i * EVENT_STRIDE..base + (i + 1) * EVENT_STRIDE];
            if !e.iter().all(|x| x.is_finite()) {
                continue;
            }
            if e[1] < 0.0 || e[1] >= nt as f32 || e[2] < 0.0 || e[2] > EV_TEMPO as f32 {
                continue;
            }
            let ev = Event { tick: e[0].max(0.0) as f64, track: e[1] as u8, kind: e[2] as u8, a: e[3], b: e[4], c: e[5], d: e[6] };
            if ev.kind == EV_NOTE {
                if !(0.0..=127.0).contains(&ev.a) {
                    continue;
                }
                max_end = max_end.max(ev.tick + ev.b.max(1.0) as f64);
            }
            let key = (ev.tick, prio(ev.kind));
            if key < last {
                sorted = false;
            }
            last = key;
            self.events.push(ev);
        }
        if !sorted {
            self.events.sort_by(|a, b| a.tick.total_cmp(&b.tick).then(prio(a.kind).cmp(&prio(b.kind))));
        }
        if length <= 0.0 {
            length = max_end.max(self.events.last().map_or(0.0, |e| e.tick));
        }
        if length <= 0.0 {
            return Err(-5);
        }
        if loop_tick >= length {
            loop_tick = 0.0;
        }
        self.length = length;
        self.loop_tick = loop_tick;

        // Channel state and tempo in effect at the loop point (applied on every wrap).
        self.at_loop = self.init;
        let mut lb = bpm;
        self.loop_cursor = self.events.len();
        for (i, ev) in self.events.iter().enumerate() {
            if ev.tick >= loop_tick {
                self.loop_cursor = i;
                break;
            }
            apply_ctrl(&mut self.at_loop, &mut lb, ev);
        }
        self.loop_bpm = lb;
        Ok(())
    }
}

impl Default for SongData {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Copy)]
pub struct Channel {
    pub st: TrackState,
    pub voices: [Voice; VOICES_PER_TRACK],
    lp: f32,
    lp_a: f32,
    gl: f32,
    gr: f32,
    send: f32,
}

impl Channel {
    fn new(seed: u32) -> Channel {
        let mut voices = [Voice::new(0); VOICES_PER_TRACK];
        for (i, v) in voices.iter_mut().enumerate() {
            *v = Voice::new(seed.wrapping_mul(31).wrapping_add(i as u32 + 1));
        }
        Channel { st: TrackState::default(), voices, lp: 0.0, lp_a: 1.0, gl: 0.0, gr: 0.0, send: 0.0 }
    }

    fn update(&mut self, song_echo: f32, sr: f32) {
        let p = instrument(self.st.inst as usize);
        self.lp_a = onepole_coef(p.chan_lp, sr);
        let a = (self.st.pan + 1.0) * 0.125;
        self.gl = self.st.vol * sin_turns(a + 0.25);
        self.gr = self.st.vol * sin_turns(a);
        self.send = self.st.vol * song_echo * p.echo;
    }

    fn active(&self) -> bool {
        self.voices.iter().any(|v| v.is_active())
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PlayState {
    Idle,
    Playing,
    Finished,
}

#[derive(Clone, Copy, PartialEq, Debug)]
enum After {
    None,
    Stop,
    Next(f32),
}

/// A sequencer slot (BGM or jingle). `next` holds a loaded song waiting for `play`.
pub struct Player {
    pub song: SongData,
    next: SongData,
    has_next: bool,
    next_serial: u32,
    pub state: PlayState,
    pub serial: u32,
    pub pos: f64,
    cursor: usize,
    pub bpm: f32,
    tps: f64,
    pub elapsed: u64,
    pub loops: u32,
    pub notes: u64,
    pub channels: Vec<Channel>,
    fade: f32,
    fade_target: f32,
    fade_step: f32,
    after: After,
    order: u32,
    sr: f32,
    pub tempo_dirty: bool,
    pub steals: u32,
}

impl Player {
    pub fn new(sr: f32, seed: u32) -> Player {
        let mut p = Player {
            song: SongData::new(),
            next: SongData::new(),
            has_next: false,
            next_serial: 0,
            state: PlayState::Idle,
            serial: 0,
            pos: 0.0,
            cursor: 0,
            bpm: 120.0,
            tps: 0.0,
            elapsed: 0,
            loops: 0,
            notes: 0,
            channels: (0..MAX_TRACKS).map(|i| Channel::new(seed.wrapping_add(i as u32 * 7919))).collect(),
            fade: 1.0,
            fade_target: 1.0,
            fade_step: 0.0,
            after: After::None,
            order: 0,
            sr,
            tempo_dirty: false,
            steals: 0,
        };
        p.set_bpm(120.0);
        p
    }

    pub fn load(&mut self, d: &[f32]) -> i32 {
        match self.next.parse(d) {
            Ok(()) => {
                self.has_next = true;
                0
            }
            Err(e) => {
                self.has_next = false;
                e
            }
        }
    }

    /// Start the loaded song: fade the current one out first (if audible), then fade the new one in.
    pub fn play(&mut self, fade_out: f32, fade_in: f32, serial: u32) -> i32 {
        if !self.has_next {
            return -1;
        }
        self.next_serial = serial;
        if self.state == PlayState::Playing && self.fade > 0.0005 {
            self.after = After::Next(fade_in.max(0.0));
            self.begin_fade(0.0, fade_out.max(0.015));
        } else {
            self.start_next(fade_in.max(0.0));
        }
        0
    }

    pub fn stop(&mut self, fade: f32) {
        self.has_next = false;
        match self.state {
            PlayState::Playing => {
                self.after = After::Stop;
                self.begin_fade(0.0, fade.max(0.015));
            }
            PlayState::Finished => self.state = PlayState::Idle,
            PlayState::Idle => {}
        }
    }

    pub fn is_fading_out(&self) -> bool {
        self.after != After::None
    }

    /// Playing, or still ringing out after the last note.
    pub fn sounding(&self) -> bool {
        self.state == PlayState::Playing || self.channels.iter().any(|c| c.active())
    }

    pub fn kill_all(&mut self) {
        for ch in self.channels.iter_mut() {
            for v in ch.voices.iter_mut() {
                v.kill();
            }
            ch.lp = 0.0;
        }
    }

    fn begin_fade(&mut self, target: f32, secs: f32) {
        self.fade_target = target;
        self.fade_step = 1.0 / (secs * self.sr).max(1.0);
    }

    fn set_bpm(&mut self, bpm: f32) {
        self.bpm = bpm.clamp(20.0, 400.0);
        self.tps = self.bpm as f64 * TICKS_PER_QUARTER / 60.0 / self.sr as f64;
        self.tempo_dirty = true;
    }

    fn start_next(&mut self, fade_in: f32) {
        std::mem::swap(&mut self.song, &mut self.next);
        self.has_next = false;
        self.serial = self.next_serial;
        if self.fade > 0.001 {
            // the previous song may still be ringing out (it finished, or was never faded): 20 ms choke
            for ch in self.channels.iter_mut() {
                for v in ch.voices.iter_mut() {
                    v.choke(0.02);
                }
            }
        } else {
            self.kill_all();
        }
        self.pos = 0.0;
        self.cursor = 0;
        self.elapsed = 0;
        self.loops = 0;
        self.after = After::None;
        self.set_bpm(self.song.bpm);
        let echo = self.song.echo;
        for i in 0..MAX_TRACKS {
            let st = if i < self.song.n_tracks { self.song.init[i] } else { TrackState::default() };
            let ch = &mut self.channels[i];
            ch.st = st;
            ch.update(echo, self.sr);
        }
        if fade_in > 0.001 {
            self.fade = 0.0;
            self.begin_fade(1.0, fade_in);
        } else {
            self.fade = 1.0;
            self.fade_target = 1.0;
        }
        self.state = PlayState::Playing;
    }

    /// Render `l.len()` samples into the (cleared) bus buffers.
    pub fn render(&mut self, l: &mut [f32], r: &mut [f32], e: &mut [f32], scratch: &mut [f32]) {
        let n = l.len();
        let mut i = 0;
        while i < n {
            if self.state == PlayState::Playing {
                self.dispatch();
            }
            let mut m = n - i;
            if self.state == PlayState::Playing {
                let next = match self.song.events.get(self.cursor) {
                    Some(ev) => ev.tick.min(self.song.length),
                    None => self.song.length,
                };
                let dt = next - self.pos;
                let s = if dt <= 0.0 { 1.0 } else { (dt / self.tps).ceil() };
                if s < m as f64 {
                    m = (s as usize).max(1);
                }
            }
            self.mix(&mut l[i..i + m], &mut r[i..i + m], &mut e[i..i + m], &mut scratch[..m]);
            if self.state == PlayState::Playing {
                self.pos += m as f64 * self.tps;
                self.elapsed += m as u64;
            }
            i += m;
            if self.fade <= 0.0 && self.fade_target <= 0.0 {
                match self.after {
                    After::Stop => {
                        self.kill_all();
                        self.state = PlayState::Idle;
                        self.after = After::None;
                        self.fade = 1.0;
                        self.fade_target = 1.0;
                    }
                    After::Next(fade_in) => self.start_next(fade_in),
                    After::None => {}
                }
            }
        }
    }

    fn mix(&mut self, l: &mut [f32], r: &mut [f32], e: &mut [f32], sc: &mut [f32]) {
        for ch in self.channels.iter_mut() {
            if !ch.active() {
                ch.lp = 0.0;
                continue;
            }
            sc.fill(0.0);
            for v in ch.voices.iter_mut() {
                v.render(sc);
            }
            let (a, gl, gr, send) = (ch.lp_a, ch.gl, ch.gr, ch.send);
            let mut y = ch.lp;
            for (((x, lo), ro), eo) in sc.iter().zip(l.iter_mut()).zip(r.iter_mut()).zip(e.iter_mut()) {
                y += a * (*x - y);
                *lo += y * gl;
                *ro += y * gr;
                *eo += y * send;
            }
            ch.lp = flush(y);
        }
        if self.fade != 1.0 || self.fade_target != 1.0 {
            for ((lo, ro), eo) in l.iter_mut().zip(r.iter_mut()).zip(e.iter_mut()) {
                if self.fade < self.fade_target {
                    self.fade = (self.fade + self.fade_step).min(self.fade_target);
                } else if self.fade > self.fade_target {
                    self.fade = (self.fade - self.fade_step).max(self.fade_target);
                }
                let g = self.fade * self.fade;
                *lo *= g;
                *ro *= g;
                *eo *= g;
            }
        }
    }

    fn dispatch(&mut self) {
        for _ in 0..1_000_000 {
            if let Some(ev) = self.song.events.get(self.cursor) {
                if ev.tick <= self.pos + 1e-9 {
                    let ev = *ev;
                    self.cursor += 1;
                    self.apply(&ev);
                    continue;
                }
            }
            if self.pos >= self.song.length - 1e-9 {
                if self.song.looping {
                    self.pos -= self.song.length - self.song.loop_tick;
                    self.cursor = self.song.loop_cursor;
                    let echo = self.song.echo;
                    for t in 0..self.song.n_tracks {
                        self.channels[t].st = self.song.at_loop[t];
                        self.channels[t].update(echo, self.sr);
                    }
                    self.set_bpm(self.song.loop_bpm);
                    self.loops += 1;
                    continue;
                }
                self.state = PlayState::Finished;
            }
            return;
        }
    }

    fn apply(&mut self, ev: &Event) {
        let t = ev.track as usize;
        let echo = self.song.echo;
        match ev.kind {
            EV_NOTE => self.note(ev),
            EV_INST => {
                self.channels[t].st.inst = inst_id(ev.a);
                self.channels[t].update(echo, self.sr);
            }
            EV_PAN => {
                self.channels[t].st.pan = ev.a.clamp(-1.0, 1.0);
                self.channels[t].update(echo, self.sr);
            }
            EV_VIB => self.channels[t].st.vib = ev.a.clamp(0.0, 15.0),
            EV_TEMPO => self.set_bpm(ev.a),
            _ => {}
        }
    }

    fn note(&mut self, ev: &Event) {
        let sr = self.sr;
        let tps = self.tps;
        let ch = &mut self.channels[ev.track as usize];
        let inst = ch.st.inst as usize;
        let midi = ev.a;
        let vel = ev.c.clamp(0.0, 1.0);
        let is_drum = inst == DRUMS;
        let (patch, freq, key) = if is_drum {
            let m = midi.round() as i32;
            let tune = ((m.div_euclid(12) - 5) as f32 * 2.0).clamp(-6.0, 6.0);
            let (p, f, k) = drum(m, tune);
            (p, f, 1000 + k)
        } else {
            (instrument(inst), midi_to_freq(midi), midi.round() as i32)
        };
        let gate = if patch.one_shot {
            u32::MAX
        } else {
            (ev.b.max(1.0) as f64 / tps).round().clamp(1.0, (u32::MAX - 1) as f64) as u32
        };
        let legato = patch.legato && ev.d <= 1.0;
        let vib = if ch.st.vib >= 0.0 { ch.st.vib * VIB_STEP } else { -1.0 };
        if is_drum && key == 1004 {
            // closed / pedal hat chokes the open hat
            for v in ch.voices.iter_mut() {
                if v.is_active() && v.key == 1005 {
                    v.choke(0.03);
                }
            }
        }
        let (idx, stolen) = pick(&ch.voices, key, legato, is_drum);
        if stolen {
            self.steals += 1;
        }
        self.order = self.order.wrapping_add(1);
        self.notes += 1;
        let v = &mut ch.voices[idx];
        let glide = legato && v.can_glide(sr);
        let amp = patch.gain * vel.powf(1.2);
        v.note_on(&patch, &NoteOn { freq, amp, vel, gate, key, legato: glide, vib, pan: 0.0, echo: 0.0 }, sr, self.order);
    }
}

/// Choose a voice: retrigger the same drum, continue a legato line, take a free voice, or steal
/// (quietest released voice first, then the oldest).
pub fn pick(voices: &[Voice], key: i32, legato: bool, drum: bool) -> (usize, bool) {
    if drum {
        if let Some(i) = voices.iter().position(|v| v.is_active() && v.key == key) {
            return (i, false);
        }
    }
    if legato {
        if let Some((i, _)) = voices.iter().enumerate().filter(|(_, v)| v.is_active()).max_by_key(|(_, v)| v.order) {
            return (i, false);
        }
    }
    if let Some(i) = voices.iter().position(|v| !v.is_active()) {
        return (i, false);
    }
    let mut best: Option<(usize, f32)> = None;
    for (i, v) in voices.iter().enumerate() {
        if v.stage == Stage::Release && best.is_none_or(|(_, l)| v.level < l) {
            best = Some((i, v.level));
        }
    }
    if let Some((i, _)) = best {
        return (i, true);
    }
    let oldest = voices.iter().enumerate().min_by_key(|(_, v)| v.order).map_or(0, |(i, _)| i);
    (oldest, true)
}
