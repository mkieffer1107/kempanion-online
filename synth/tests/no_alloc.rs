// Verifies the real-time contract: `Engine::render` never touches the allocator.
mod common;

use common::*;
use kempa_synth::format::*;
use kempa_synth::Engine;
use std::alloc::{GlobalAlloc, Layout, System};
use std::cell::Cell;
use std::sync::atomic::{AtomicUsize, Ordering};

struct Counting;
static ALLOCS: AtomicUsize = AtomicUsize::new(0);
thread_local! {
    static ON: Cell<bool> = const { Cell::new(false) };
}

unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, l: Layout) -> *mut u8 {
        if ON.with(|c| c.get()) {
            ALLOCS.fetch_add(1, Ordering::SeqCst);
        }
        System.alloc(l)
    }
    unsafe fn dealloc(&self, p: *mut u8, l: Layout) {
        if ON.with(|c| c.get()) {
            ALLOCS.fetch_add(1, Ordering::SeqCst);
        }
        System.dealloc(p, l)
    }
    unsafe fn realloc(&self, p: *mut u8, l: Layout, n: usize) -> *mut u8 {
        if ON.with(|c| c.get()) {
            ALLOCS.fetch_add(1, Ordering::SeqCst);
        }
        System.realloc(p, l, n)
    }
}

#[global_allocator]
static GLOBAL: Counting = Counting;

#[test]
fn render_never_allocates() {
    let mut e = Engine::new(SR);
    e.load_song(&busy_song(true).blob());
    e.play(0.0, 500.0, 1);
    let sfx = sfx_blob(&[raw_layer(0.0, W_NOISE, 9000.0, 0.2, 0.4), raw_layer(0.05, W_FM, 700.0, 0.2, 0.4)]);
    let mut jingle = SongBuilder::new(150.0, false);
    let t = jingle.track(9, 0.8, 0.0);
    jingle.note(t, 0.0, 72.0, 96.0, 0.9);
    let jingle = jingle.blob();
    for i in 0..1500 {
        // control calls happen between renders (as messages arrive in the worklet)
        if i % 50 == 0 {
            e.trigger_sfx(&sfx);
        }
        if i % 7 == 0 {
            e.blip(W_PULSE50, 587.0, 30.0, 0.5, 1.0, 8.0, 0.0, 0.0, 0.0);
        }
        if i == 300 {
            e.jingle(&jingle);
        }
        ON.with(|c| c.set(true));
        let out = e.render(128);
        ON.with(|c| c.set(false));
        assert!(out[0].is_finite());
    }
    assert_eq!(ALLOCS.load(Ordering::SeqCst), 0, "render() allocated");
}
