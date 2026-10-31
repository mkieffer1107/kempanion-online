import { expect, test } from 'bun:test';
import { createHaptics } from '../src/lib/haptics';

function fixture(apple = false) {
  const pulses: number[] = [];
  const handlers = new Map<string, Function>();
  let toggles = 0;
  let removed = false;
  let restored = false;
  let blurred = false;
  const previous = { focus(opts: FocusOptions) { restored = opts.preventScroll === true; } };
  const hiddenInput = { blur() { blurred = true; } };
  const label = { style: {}, setAttribute() {}, append() {}, click() { toggles++; doc.activeElement = hiddenInput as unknown as typeof previous; }, contains(el: unknown) { return el === hiddenInput; }, remove() { removed = true; } };
  const input = { style: {}, setAttribute() {} };
  const doc = {
    activeElement: previous, visibilityState: 'visible', body: { append() {} },
    createElement: (tag: string) => tag === 'label' ? label : input,
    addEventListener: (name: string, fn: Function) => handlers.set(name, fn),
    removeEventListener: (name: string) => handlers.delete(name),
  };
  let enabled = true;
  const nav = { userAgent: apple ? 'iPhone' : 'Android', platform: '', maxTouchPoints: 1, vibrate: (n: number) => pulses.push(n) };
  const h = createHaptics(doc as unknown as Document, nav as unknown as Navigator, () => enabled);
  const gesture = (overrides = {}) => ({ isTrusted: true, pointerType: 'touch', isPrimary: true, button: 0, ...overrides }) as unknown as Event;
  return { h, doc, handlers, pulses, gesture, disable() { enabled = false; }, get toggles() { return toggles; }, get removed() { return removed; }, get restored() { return restored; }, get blurred() { return blurred; } };
}

test('only a visible, enabled, trusted primary touch gesture pulses; duplicate taps are bounded', () => {
  const f = fixture();
  for (const overrides of [{ isTrusted: false }, { pointerType: 'mouse' }, { pointerType: '' }, { isPrimary: false }, { button: 2 }]) f.h.tap(f.gesture(overrides));
  expect(f.pulses).toEqual([]);
  f.doc.visibilityState = 'hidden'; f.h.tap(f.gesture());
  expect(f.pulses).toEqual([]);
  f.doc.visibilityState = 'visible'; f.h.tap(f.gesture()); f.h.tap(f.gesture());
  expect(f.pulses).toEqual([12]);
  f.h.destroy();
  expect(f.pulses).toEqual([12, 0]);
  expect(f.handlers.size).toBe(0);
});

test('opt-out prevents both native vibration and Safari fallback', () => {
  for (const apple of [false, true]) {
    const f = fixture(apple); f.disable(); f.h.tap(f.gesture());
    expect(f.pulses).toEqual([]); expect(f.toggles).toBe(0); f.h.destroy();
  }
});

test('Safari gets one synchronous switch toggle and cleanup, with no vibration pattern', () => {
  const f = fixture(true); f.h.tap(f.gesture()); f.h.tap(f.gesture());
  expect(f.toggles).toBe(1); expect(f.pulses).toEqual([]);
  f.h.destroy(); expect(f.removed).toBe(true);
});

test('hiding the page cancels native vibration', () => {
  const f = fixture(); f.doc.visibilityState = 'hidden'; f.handlers.get('visibilitychange')?.();
  expect(f.pulses).toEqual([0]); f.h.destroy();
});

test('older Safari MouseEvent clicks require a recent trusted touch on the same target', () => {
  const f = fixture(true);
  const target = {};
  f.h.tap(f.gesture({ type: 'click', pointerType: undefined, target }));
  expect(f.toggles).toBe(0);
  f.handlers.get('touchend')?.({ isTrusted: true, target });
  f.h.tap(f.gesture({ type: 'click', pointerType: undefined, target: {} }));
  expect(f.toggles).toBe(0);
  f.h.tap(f.gesture({ type: 'click', pointerType: undefined, target }));
  expect(f.toggles).toBe(1);
  f.h.destroy();
});

// Chromium click PointerEvents do not carry the preceding pointer's primary status.
test('trusted touch click may report isPrimary false', () => {
  const f = fixture(); f.h.tap(f.gesture({ type: 'click', isPrimary: false }));
  expect(f.pulses).toEqual([12]); f.h.destroy();
});

test('WebKit touch compatibility mouse click retains same-target touch provenance', () => {
  const f = fixture(true); const target = {};
  f.handlers.get('touchend')?.({ isTrusted: true, target });
  f.h.tap(f.gesture({ type: 'click', pointerType: 'mouse', target }));
  expect(f.toggles).toBe(1); f.h.destroy();
});

test('Safari fallback restores prior focus without scrolling', () => {
  const f = fixture(true); f.h.tap(f.gesture());
  expect(f.blurred).toBe(true); expect(f.restored).toBe(true); f.h.destroy();
});
