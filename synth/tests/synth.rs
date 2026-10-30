mod common;

use common::*;
use kempa_synth::engine::{STAT_NAN_RESETS, STAT_PEAK_MIX};
use kempa_synth::format::*;
use kempa_synth::Engine;

fn assert_clean(out: &[f32], what: &str) {
    for (i, x) in out.iter().enumerate() {
        assert!(x.is_finite(), "{what}: NaN/inf at sample {i}");
        assert!(x.abs() <= 1.0, "{what}: sample {i} out of range: {x}");
    }
}

#[test]
fn idle_engine_is_silent() {
    let mut e = Engine::new(SR);
    let out = render_secs(&mut e, 0.5);
    assert!(out.iter().all(|x| *x == 0.0));
    assert_eq!(e.song_position(), 0.0);
    assert_eq!(e.song_state(), 0);
}

#[test]
fn busy_song_is_clean_balanced_and_audible() {
    let mut e = Engine::new(SR);
    assert_eq!(e.load_song(&busy_song(true).blob()), 0);
    assert_eq!(e.play(0.0, 0.0, 7), 0);
    let out = render_secs(&mut e, 16.0);
    assert_clean(&out, "busy song");
    let st = *e.stats();
    assert!(rms(&out) > 0.03, "too quiet: rms {}", rms(&out));
    assert!(st[STAT_PEAK_MIX] < 0.95, "six-track mix should peak below ~0.9 before the limiter, got {}", st[STAT_PEAK_MIX]);
    assert_eq!(st[STAT_NAN_RESETS], 0.0);
    assert_eq!(e.bgm.serial, 7);
}

#[test]
fn loops_wrap_seamlessly_and_position_keeps_counting() {
    let mut s = SongBuilder::new(120.0, true);
    let t = s.track(1, 0.8, 0.0);
    s.note(t, 0.0, 60.0, Q, 0.8); // intro
    for i in 1..4 {
        s.note(t, i as f32 * Q, 62.0 + i as f32, Q, 0.8);
    }
    s.loop_tick = Q;
    let mut e = Engine::new(SR);
    assert_eq!(e.load_song(&s.blob()), 0);
    e.play(0.0, 0.0, 1);
    // 4 beats at 120 BPM = 2 s; loop body = 3 beats = 1.5 s.
    let mut last_pos = 0.0;
    for _ in 0..100 {
        render_secs(&mut e, 0.1);
        let p = e.song_position();
        assert!(p > last_pos, "song position must keep increasing across loops");
        last_pos = p;
        let tick = e.bgm.pos;
        assert!((0.0..4.0 * Q as f64 + 1.0).contains(&tick), "tick {tick} outside the song");
        if e.bgm.loops > 0 {
            assert!(tick >= Q as f64 - 1.0, "after looping the tick must stay inside the loop body, got {tick}");
        }
    }
    // wraps at 2.0, 3.5, 5.0, 6.5, 8.0 and 9.5 s
    assert_eq!(e.bgm.loops, 6);
    assert!((e.song_position() - 10.0).abs() < 0.01);
    // intro note once + 3 notes per pass: first pass 4 notes, then 3 per loop (+ partial 6th pass)
    assert!(e.bgm.notes >= 4 + 5 * 3);
}

#[test]
fn loop_restores_channel_state_at_loop_point() {
    let mut s = SongBuilder::new(240.0, true);
    let t = s.track(1, 0.8, 0.0);
    s.ctrl(t, 0.0, EV_INST, 5.0); // intro on sine
    s.note(t, 0.0, 60.0, Q, 0.8);
    s.ctrl(t, Q, EV_INST, 2.0); // loop body starts on pulse50
    s.note(t, Q, 62.0, Q, 0.8);
    s.ctrl(t, 2.0 * Q, EV_INST, 7.0); // switches to pluck mid-loop
    s.note(t, 2.0 * Q, 64.0, Q, 0.8);
    s.ctrl(t, 3.0 * Q, EV_TEMPO, 120.0);
    s.note(t, 3.0 * Q, 65.0, Q, 0.8);
    s.loop_tick = Q;
    let mut e = Engine::new(SR);
    e.load_song(&s.blob());
    e.play(0.0, 0.0, 1);
    render_secs(&mut e, 1.0);
    assert_eq!(e.bgm.bpm, 120.0, "tempo change near the end");
    assert_eq!(e.bgm.channels[0].st.inst, 7);
    // first pass = 0.75 s at 240 BPM + 0.5 s at 120 BPM; step until the wrap
    while e.bgm.loops == 0 {
        e.render(64);
    }
    e.render(64);
    // Right after the wrap: tempo and instrument are back to their loop-point values.
    assert_eq!(e.bgm.bpm, 240.0);
    assert_eq!(e.bgm.channels[0].st.inst, 2);
    assert!((e.song_position() - 1.25).abs() < 0.01, "wrapped at {}", e.song_position());
}

#[test]
fn tempo_events_change_speed() {
    let mut s = SongBuilder::new(120.0, false);
    let t = s.track(0, 0.8, 0.0);
    s.ctrl(t, 0.0, EV_TEMPO, 240.0);
    for i in 0..64 {
        s.note(t, i as f32 * Q, 60.0, Q, 0.5);
    }
    let mut e = Engine::new(SR);
    e.load_song(&s.blob());
    e.play(0.0, 0.0, 1);
    render_secs(&mut e, 1.0);
    // 240 BPM = 4 beats/s = 384 ticks/s
    assert!((e.bgm.pos - 384.0).abs() < 2.0, "pos {}", e.bgm.pos);
}

#[test]
fn non_looping_song_finishes_and_rings_out() {
    let mut s = SongBuilder::new(120.0, false);
    let t = s.track(8, 0.8, 0.0);
    s.note(t, 0.0, 60.0, Q, 0.8);
    let mut e = Engine::new(SR);
    e.load_song(&s.blob());
    e.play(0.0, 0.0, 3);
    render_secs(&mut e, 0.6);
    assert_eq!(e.song_state(), 3);
    let tail = render_secs(&mut e, 6.0);
    let end = &tail[tail.len() - 4800..];
    assert!(peak(end) < 1e-3, "should ring out, got {}", peak(end));
}

#[test]
fn fade_out_then_next_song_with_serial() {
    let mut e = Engine::new(SR);
    e.load_song(&busy_song(true).blob());
    e.play(0.0, 0.0, 1);
    render_secs(&mut e, 1.0);
    let mut b = SongBuilder::new(90.0, true);
    let t = b.track(3, 0.8, 0.0);
    b.note(t, 0.0, 48.0, 4.0 * Q, 0.8);
    e.load_song(&b.blob());
    e.play(500.0, 200.0, 2);
    assert_eq!(e.song_state(), 2);
    assert_eq!(e.bgm.serial, 1, "old song keeps playing while it fades");
    render_secs(&mut e, 0.3);
    assert_eq!(e.bgm.serial, 1);
    render_secs(&mut e, 0.25);
    assert_eq!(e.bgm.serial, 2, "new song starts after the fade-out");
    assert_eq!(e.song_state(), 1);
    assert!(e.song_position() < 0.1);
}

#[test]
fn stop_fades_to_silence() {
    let mut e = Engine::new(SR);
    e.load_song(&busy_song(true).blob());
    e.play(0.0, 0.0, 1);
    render_secs(&mut e, 2.0);
    e.stop(300.0);
    let out = render_secs(&mut e, 0.35);
    assert_eq!(e.song_state(), 0);
    assert_eq!(e.song_position(), 0.0);
    // the fade itself is smooth: no sample-to-sample jump bigger than a normal waveform step
    let max_step = out.chunks(2).zip(out.chunks(2).skip(1)).map(|(a, b)| (a[0] - b[0]).abs()).fold(0.0f32, f32::max);
    assert!(max_step < 0.5, "fade produced a click: step {max_step}");
    let tail = render_secs(&mut e, 8.0);
    assert!(peak(&tail[tail.len() - 9600..]) < 1e-4, "echo tail must die out");
}

#[test]
fn long_silence_flushes_all_state_to_exact_zero() {
    let mut e = Engine::new(SR);
    e.load_song(&busy_song(false).blob());
    e.play(0.0, 0.0, 1);
    render_secs(&mut e, 3.0);
    e.stop(50.0);
    e.trigger_sfx(&sfx_blob(&[raw_layer(0.0, W_NOISE, 8000.0, 0.2, 0.5)]));
    render_secs(&mut e, 40.0);
    let out = render_secs(&mut e, 0.5);
    assert!(out.iter().all(|x| *x == 0.0), "denormal-safe: recursive state should flush to exactly 0");
}

#[test]
fn sfx_layers_respect_delays_and_free_their_voices() {
    let mut e = Engine::new(SR);
    let d = sfx_blob(&[raw_layer(0.0, W_PULSE50, 880.0, 0.05, 0.5), raw_layer(0.2, W_SINE, 440.0, 0.05, 0.5)]);
    assert_eq!(e.trigger_sfx(&d), 0);
    let a = render_secs(&mut e, 0.1);
    assert!(rms(&a) > 0.01);
    let gap = render_secs(&mut e, 0.08);
    assert!(peak(&gap[4800..]) < 1e-3, "silence between layers");
    let b = render_secs(&mut e, 0.1);
    assert!(rms(&b) > 0.01, "second layer plays at 200 ms");
    render_secs(&mut e, 0.5);
    assert_eq!(e.sfx.active(), 0);
}

#[test]
fn sfx_bank_survives_spam() {
    let mut e = Engine::new(SR);
    let d = sfx_blob(&[raw_layer(0.0, W_NOISE, 12000.0, 0.3, 0.8), raw_layer(0.0, W_FM, 600.0, 0.3, 0.8), raw_layer(0.01, W_SAW, 300.0, 0.3, 0.8)]);
    for _ in 0..200 {
        e.trigger_sfx(&d);
        let out = render_secs(&mut e, 0.003);
        assert_clean(&out, "sfx spam");
    }
    let out = render_secs(&mut e, 1.0);
    assert_clean(&out, "sfx spam tail");
}

#[test]
fn instrument_layers_and_drum_layers_work_in_sfx() {
    let mut e = Engine::new(SR);
    let mut l = raw_layer(0.0, 0, 523.25, 0.2, 0.9);
    l[L_INST] = 9.0; // bell
    let mut k = raw_layer(0.0, 0, 261.63, 0.2, 0.9);
    k[L_INST] = 18.0; // drums: C → kick
    assert_eq!(e.trigger_sfx(&sfx_blob(&[l, k])), 0);
    let out = render_secs(&mut e, 0.5);
    assert_clean(&out, "inst layers");
    assert!(rms(&out) > 0.02);
}

#[test]
fn blips_are_short_and_duck_the_bgm() {
    let mut e = Engine::new(SR);
    e.blip(W_PULSE50, 587.0, 30.0, 0.5, 1.0, 8.0, 0.0, 0.0, 0.0);
    let out = render_secs(&mut e, 0.035);
    assert!(rms(&out) > 0.05);
    let after = render_secs(&mut e, 0.05);
    assert!(peak(&after[2400..]) < 1e-3, "blip must end quickly");
    assert_eq!(e.vox.active(), 0);
}

#[test]
fn jingle_ducks_and_releases_bgm() {
    let mut e = Engine::new(SR);
    e.load_song(&busy_song(true).blob());
    e.play(0.0, 0.0, 1);
    render_secs(&mut e, 1.0);
    let mut j = SongBuilder::new(160.0, false);
    let t = j.track(6, 0.8, 0.0);
    for (i, m) in [72.0, 76.0, 79.0, 84.0].iter().enumerate() {
        j.note(t, i as f32 * Q / 2.0, *m, Q / 2.0, 0.9);
    }
    assert_eq!(e.jingle(&j.blob()), 0);
    render_secs(&mut e, 0.3);
    assert!(e.jingle.sounding());
    render_secs(&mut e, 3.0);
    assert!(!e.jingle.sounding(), "jingle ends and stops ducking");
    assert_eq!(e.song_state(), 1, "BGM keeps playing under the jingle");
}

#[test]
fn malformed_input_is_rejected_without_panicking() {
    let mut e = Engine::new(SR);
    assert!(e.load_song(&[]) < 0);
    assert!(e.load_song(&[1.0; 5]) < 0);
    assert!(e.load_song(&[9.0, 1.0, 120.0, 0.0, 0.0, 10.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0]) < 0);
    let mut d = busy_song(false).blob();
    d[8] = 1e9; // absurd event count
    assert!(e.load_song(&d) < 0);
    let mut d = busy_song(false).blob();
    d.truncate(d.len() - 3); // truncated events
    assert!(e.load_song(&d) < 0);
    // NaNs inside events are skipped, not fatal
    let mut d = busy_song(false).blob();
    for i in (SONG_HEADER + 6 * TRACK_STRIDE..d.len()).step_by(37) {
        d[i] = f32::NAN;
    }
    assert_eq!(e.load_song(&d), 0);
    e.play(0.0, 0.0, 1);
    assert_clean(&render_secs(&mut e, 2.0), "nan-riddled song");
    assert!(e.trigger_sfx(&[2.0, 1.0, 99.0, 1.0]) < 0);
    assert!(e.trigger_sfx(&[2.0, 1.0, 3.0, 1.0, 0.0]) < 0);
    let mut l = raw_layer(0.0, 77, f32::INFINITY, -5.0, 1e9);
    l[L_Q] = f32::NAN;
    assert_eq!(e.trigger_sfx(&sfx_blob(&[l])), 0);
    let mut l = raw_layer(0.0, 3, 1e7, 1e7, 3.0);
    l[L_FM_INDEX] = 1e6;
    l[L_PITCH_ENV] = 1e5;
    assert_eq!(e.trigger_sfx(&sfx_blob(&[l])), 0);
    e.blip(99, f32::NAN, 30.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    e.blip(2, 1e9, 1e9, 1e9, -1.0, -1.0, 1e9, -1.0, 9.0);
    e.set_volumes(f32::NAN, 9.0, -1.0, f32::INFINITY);
    assert_clean(&render_secs(&mut e, 2.0), "garbage sfx/blips");
    assert_eq!(e.play(f32::NAN, f32::NAN, 0), -1, "nothing loaded");
}

#[test]
fn rendering_is_deterministic() {
    let run = || {
        let mut e = Engine::new(SR);
        e.load_song(&busy_song(true).blob());
        e.play(0.0, 300.0, 1);
        e.trigger_sfx(&sfx_blob(&[raw_layer(0.1, W_NOISE, 9000.0, 0.2, 0.4)]));
        render_secs(&mut e, 3.0)
    };
    assert_eq!(run(), run());
}

#[test]
fn random_songs_never_blow_up() {
    let mut seed = 0x1234_5678u32;
    let mut rnd = |n: u32| {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        seed % n.max(1)
    };
    for case in 0..24 {
        let mut s = SongBuilder::new(40.0 + rnd(240) as f32, rnd(2) == 0);
        let nt = 1 + rnd(MAX_TRACKS as u32) as usize;
        for _ in 0..nt {
            s.track(rnd(19) as usize, rnd(100) as f32 / 80.0, rnd(200) as f32 / 100.0 - 1.0);
        }
        for _ in 0..(50 + rnd(400)) {
            let tr = rnd(nt as u32) as usize;
            let tick = rnd(16 * 96) as f32;
            match rnd(10) {
                0 => s.ctrl(tr, tick, EV_INST, rnd(19) as f32),
                1 => s.ctrl(tr, tick, EV_PAN, rnd(200) as f32 / 100.0 - 1.0),
                2 => s.ctrl(tr, tick, EV_VIB, rnd(16) as f32),
                3 => s.ctrl(0, tick, EV_TEMPO, 30.0 + rnd(270) as f32),
                4 => {
                    let n = 1 + rnd(4) as usize;
                    let ms: Vec<f32> = (0..n).map(|_| rnd(128) as f32).collect();
                    s.chord(tr, tick, &ms, (1 + rnd(192)) as f32, rnd(16) as f32 / 15.0);
                }
                _ => s.note(tr, tick, rnd(128) as f32, (1 + rnd(384)) as f32, rnd(16) as f32 / 15.0),
            }
        }
        s.loop_tick = rnd(s.length as u32) as f32;
        let mut e = Engine::new(if case % 3 == 0 { 44100.0 } else { SR });
        assert_eq!(e.load_song(&s.blob()), 0, "case {case}");
        e.play(0.0, 0.0, case);
        let out = render_secs(&mut e, 4.0);
        assert_clean(&out, &format!("random song {case}"));
        assert_eq!(e.stats()[STAT_NAN_RESETS], 0.0, "case {case}");
    }
}

#[test]
fn abi_round_trip() {
    use kempa_synth as k;
    let song = busy_song(true).blob();
    unsafe {
        assert_eq!(k::init(44100.0), 1);
        let bytes = (song.len() * 4) as u32;
        let ptr = k::alloc(bytes) as *mut f32;
        assert!(!ptr.is_null());
        std::ptr::copy_nonoverlapping(song.as_ptr(), ptr, song.len());
        assert_eq!(k::load_song(ptr, song.len() as u32), 0);
        k::free(ptr as *mut u8, bytes);
        assert_eq!(k::play(0.0, 0.0, 42), 0);
        k::set_volumes(0.8, 0.6, 0.8, 0.7);
        k::blip(2, 587.0, 30.0, 0.5);
        let mut energy = 0.0;
        for _ in 0..400 {
            let p = k::render(128);
            let s = std::slice::from_raw_parts(p, 256);
            energy += s.iter().map(|x| x * x).sum::<f32>();
        }
        assert!(energy > 1.0);
        assert_eq!(k::song_serial(), 42);
        assert_eq!(k::song_state(), 1);
        assert!((k::song_position_seconds() - 400.0 * 128.0 / 44100.0).abs() < 1e-6);
        let st = std::slice::from_raw_parts(k::stats(), 8);
        assert!(st[1] > 0.0 && st[1] < 1.0);
        assert!(k::load_song(std::ptr::null(), 10) < 0);
        k::stop(100.0);
        k::all_notes_off();
        assert!(std::slice::from_raw_parts(k::render(64), 128).iter().all(|x| x.is_finite()));
    }
}

/// Every pitched instrument plays in tune: autocorrelation pitch of an A4 within 12 cents of 440 Hz
/// (glock's half-integer FM ratio may read an octave low; its pitch class must still match). The carillon
/// bell is deliberately inharmonic (1:1.4 FM), so autocorrelation can't name its pitch: it is skipped.
#[test]
fn instruments_are_in_tune() {
    for inst in 0..17usize {
        if inst == 9 {
            continue;
        }
        let mut s = SongBuilder::new(120.0, false);
        let t = s.track(inst, 0.8, 0.0);
        s.note(t, 0.0, 69.0, 2.0 * Q, 0.8);
        s.echo = 0.0;
        let mut e = Engine::new(SR);
        e.load_song(&s.blob());
        e.play(0.0, 0.0, 1);
        let out = render_secs(&mut e, 0.5);
        let start = if inst == 13 || inst == 14 { 0.3 } else { 0.03 }; // pad/strings attack slowly
        let x: Vec<f32> = out.iter().step_by(2).skip((start * SR) as usize).take(4800).copied().collect();
        let corr = |lag: usize| x.iter().zip(&x[lag..]).map(|(a, b)| a * b).sum::<f32>();
        let (lo, hi) = ((SR / 900.0) as usize, (SR / 200.0) as usize);
        let best = (lo..hi).max_by(|a, b| corr(*a).partial_cmp(&corr(*b)).unwrap()).unwrap();
        let (c0, c1, c2) = (corr(best - 1), corr(best), corr(best + 1));
        let lag = best as f32 + 0.5 * (c0 - c2) / (c0 - 2.0 * c1 + c2);
        let cents = 1200.0 * (SR / lag / 440.0).log2();
        let off = cents - 1200.0 * (cents / 1200.0).round();
        assert!(off.abs() < 12.0, "{} is {cents:.1} cents off", kempa_synth::preset::INSTRUMENT_NAMES[inst]);
        if inst != 10 {
            assert!(cents.abs() < 12.0, "{} reads {cents:.1} cents (octave error)", kempa_synth::preset::INSTRUMENT_NAMES[inst]);
        }
    }
}

/// `cargo test -- --ignored --nocapture levels` prints per-instrument loudness for balancing.
#[test]
#[ignore]
fn levels() {
    for inst in 0..19usize {
        let mut s = SongBuilder::new(120.0, false);
        let t = s.track(inst, 0.8, 0.0);
        if inst == 18 {
            for (i, m) in [60.0, 62.0, 64.0, 65.0, 67.0, 69.0, 71.0, 61.0, 63.0, 66.0, 68.0, 70.0].iter().enumerate() {
                s.note(t, i as f32 * Q, *m, Q, 0.8);
            }
        } else {
            for (i, m) in [48.0, 60.0, 72.0, 84.0].iter().enumerate() {
                s.note(t, i as f32 * 2.0 * Q, *m, 2.0 * Q, 0.8);
            }
        }
        s.echo = 0.0;
        let mut e = Engine::new(SR);
        e.load_song(&s.blob());
        e.play(0.0, 0.0, 1);
        let out = render_secs(&mut e, 4.0);
        let l: Vec<f32> = out.iter().step_by(2).copied().collect();
        // loudness over the sounding part (skip silence)
        let active: Vec<f32> = l.chunks(480).filter(|c| rms(c) > 1e-3).flatten().copied().collect();
        println!("{:>2} {:<8} rms {:.3}  peak {:.3}", inst, kempa_synth::preset::INSTRUMENT_NAMES[inst], rms(&active), peak(&l));
    }
    let mut e = Engine::new(SR);
    e.load_song(&busy_song(true).blob());
    e.play(0.0, 0.0, 1);
    let out = render_secs(&mut e, 16.0);
    println!("busy song: rms {:.3} peak {:.3} mix-peak {:.3} min-limiter-gain {:.3}", rms(&out), peak(&out), e.stats()[0], e.stats()[5]);
}
