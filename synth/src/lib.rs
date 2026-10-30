//! Kempa Synth — the real-time chiptune synthesizer of Kempanion Online.
//!
//! Built for `wasm32-unknown-unknown` without wasm-bindgen and driven from an AudioWorklet through the
//! plain C ABI below (`#[no_mangle]` only on wasm so native test builds never shadow libc symbols).
//! Binary formats live in `format.rs` and are mirrored by `src/lib/audio/encode.ts`.
//! All memory is allocated by `init`/`load_song`/`trigger_sfx`; `render` never allocates.

pub mod dsp;
pub mod engine;
pub mod format;
pub mod preset;
pub mod song;
pub mod voice;

pub use engine::Engine;

use std::alloc::{alloc as heap_alloc, dealloc, Layout};
use std::ptr::{null, null_mut};

static mut ENGINE: *mut Engine = null_mut();

#[inline]
fn engine() -> Option<&'static mut Engine> {
    // SAFETY: the synth lives on a single thread (the audio worklet); only `init` replaces the pointer.
    unsafe { ENGINE.as_mut() }
}

/// # Safety
/// `ptr` must point to `len` readable f32 values (or be null).
unsafe fn floats<'a>(ptr: *const f32, len: u32) -> Option<&'a [f32]> {
    if ptr.is_null() || (ptr as usize) % 4 != 0 || len == 0 || len > 8_000_000 {
        return None;
    }
    Some(std::slice::from_raw_parts(ptr, len as usize))
}

/// Create (or re-create) the engine for this sample rate. Returns 1.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn init(sample_rate: f32) -> u32 {
    let e = Box::into_raw(Box::new(Engine::new(sample_rate)));
    unsafe {
        let old = ENGINE;
        ENGINE = e;
        if !old.is_null() {
            drop(Box::from_raw(old));
        }
    }
    1
}

/// Allocate `bytes` (8-byte aligned) for passing data in. Pair with `free(ptr, bytes)`.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn alloc(bytes: u32) -> *mut u8 {
    match Layout::from_size_align((bytes as usize).max(1), 8) {
        Ok(layout) => unsafe { heap_alloc(layout) },
        Err(_) => null_mut(),
    }
}

/// # Safety
/// `ptr` must come from `alloc(bytes)` with the same `bytes`.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub unsafe extern "C" fn free(ptr: *mut u8, bytes: u32) {
    if ptr.is_null() {
        return;
    }
    if let Ok(layout) = Layout::from_size_align((bytes as usize).max(1), 8) {
        dealloc(ptr, layout);
    }
}

/// Parse a SONG blob (`len` f32 values) into the BGM's "next" slot. 0 = ok, < 0 = error.
///
/// # Safety
/// `ptr` must point to `len` f32 values.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub unsafe extern "C" fn load_song(ptr: *const f32, len: u32) -> i32 {
    match (engine(), floats(ptr, len)) {
        (Some(e), Some(d)) => e.load_song(d),
        (None, _) => -100,
        _ => -101,
    }
}

/// Fade the current song out (if any), then start the loaded one with a fade-in. `serial` is echoed
/// back by `song_serial()` once the new song is audible.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn play(fade_out_ms: f32, fade_in_ms: f32, serial: u32) -> i32 {
    engine().map_or(-100, |e| e.play(fade_out_ms, fade_in_ms, serial))
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stop(fade_ms: f32) {
    if let Some(e) = engine() {
        e.stop(fade_ms);
    }
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn set_volumes(master: f32, bgm: f32, sfx: f32, voice: f32) {
    if let Some(e) = engine() {
        e.set_volumes(master, bgm, sfx, voice);
    }
}

/// Play an SFX blob on the SFX bus.
///
/// # Safety
/// `ptr` must point to `len` f32 values.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub unsafe extern "C" fn trigger_sfx(ptr: *const f32, len: u32) -> i32 {
    match (engine(), floats(ptr, len)) {
        (Some(e), Some(d)) => e.trigger_sfx(d),
        (None, _) => -100,
        _ => -101,
    }
}

/// Play a SONG blob once on the jingle sequencer; the BGM is ducked while it sounds.
///
/// # Safety
/// `ptr` must point to `len` f32 values.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub unsafe extern "C" fn jingle(ptr: *const f32, len: u32) -> i32 {
    match (engine(), floats(ptr, len)) {
        (Some(e), Some(d)) => e.jingle(d),
        (None, _) => -100,
        _ => -101,
    }
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stop_jingle(fade_ms: f32) {
    if let Some(e) = engine() {
        e.stop_jingle(fade_ms);
    }
}

/// One text blip on the voice bus (`wave` = W_* id).
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn blip(wave: u32, freq_hz: f32, len_ms: f32, vol: f32) {
    if let Some(e) = engine() {
        e.blip(wave, freq_hz, len_ms, vol, 1.0, 8.0, 0.0, 0.0, 0.0);
    }
}

/// Blip with envelope, pitch glide (semitones over the blip), optional low-pass (Hz, 0 = off) and pan.
#[allow(clippy::too_many_arguments)]
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn blip_ex(wave: u32, freq_hz: f32, len_ms: f32, vol: f32, attack_ms: f32, release_ms: f32, glide: f32, lowpass_hz: f32, pan: f32) {
    if let Some(e) = engine() {
        e.blip(wave, freq_hz, len_ms, vol, attack_ms, release_ms, glide, lowpass_hz, pan);
    }
}

/// Render `frames` (≤ max_frames()) of interleaved stereo; returns a pointer into wasm memory.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn render(frames: u32) -> *const f32 {
    engine().map_or(null(), |e| e.render(frames as usize).as_ptr())
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn max_frames() -> u32 {
    engine::MAX_FRAMES as u32
}

/// Seconds since the current song started (does not wrap at the loop point). 0 when idle.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn song_position_seconds() -> f64 {
    engine().map_or(0.0, |e| e.song_position())
}

/// Current tick inside the song (wraps at the loop point).
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn song_tick() -> f64 {
    engine().map_or(0.0, |e| e.bgm.pos)
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn song_serial() -> u32 {
    engine().map_or(0, |e| e.bgm.serial)
}

/// 0 idle, 1 playing, 2 fading out, 3 finished.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn song_state() -> u32 {
    engine().map_or(0, |e| e.song_state())
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn song_loops() -> u32 {
    engine().map_or(0, |e| e.bgm.loops)
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn jingle_playing() -> u32 {
    engine().map_or(0, |e| e.jingle.sounding() as u32)
}

/// Pointer to 8 f32 stats: peak before limiter, peak out, max voices, steals, NaN resets,
/// min limiter gain, sum of squares out, frames.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn stats() -> *const f32 {
    engine().map_or(null(), |e| e.stats().as_ptr())
}

#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn reset_stats() {
    if let Some(e) = engine() {
        e.reset_stats();
    }
}

/// Silence everything immediately (voices, pending SFX, echo tail).
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn all_notes_off() {
    if let Some(e) = engine() {
        e.all_off();
    }
}
