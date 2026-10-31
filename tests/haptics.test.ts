import { expect, test } from 'bun:test';
import { createHaptics } from '../src/lib/haptics';

function fixture(apple = false) {
  const pulses: number[] = [];
  const handlers = new Map<string, Function>();
  const doc = {
    visibilityState: 'visible',
    createElement() { throw new Error('Gesture helper must not synthesize native switches'); },
    addEventListener: (name: string, fn: Function) => handlers.set(name, fn),
    removeEventListener: (name: string) => handlers.delete(name),
  };
  let enabled = true;
  const nav = { userAgent: apple ? 'iPhone' : 'Android', platform: '', maxTouchPoints: 1, vibrate: (n: number) => pulses.push(n) };
  const h = createHaptics(doc as unknown as Document, nav as unknown as Navigator, () => enabled);
  const gesture = (overrides = {}) => ({ isTrusted: true, pointerType: 'touch', isPrimary: true, button: 0, ...overrides }) as unknown as Event;
  return { h, doc, handlers, pulses, gesture, disable() { enabled = false; } };
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

test('opt-out prevents gesture vibration', () => {
  for (const apple of [false, true]) {
    const f = fixture(apple); f.disable(); f.h.tap(f.gesture());
    expect(f.pulses).toEqual([]); f.h.destroy();
  }
});

test('Apple never attempts programmatic switch activation or vibrate', () => {
  const f = fixture(true); f.h.tap(f.gesture());
  expect(f.pulses).toEqual([]); f.h.destroy();
});

test('hiding the page cancels native vibration', () => {
  const f = fixture(); f.doc.visibilityState = 'hidden'; f.handlers.get('visibilitychange')?.();
  expect(f.pulses).toEqual([0]); f.h.destroy();
});

test('legacy mobile MouseEvent click requires recent same-target trusted touch', () => {
  const f = fixture(); const target = {};
  f.h.tap(f.gesture({ type: 'click', pointerType: undefined, target }));
  expect(f.pulses).toEqual([]);
  f.handlers.get('touchend')?.({ isTrusted: true, target });
  f.h.tap(f.gesture({ type: 'click', pointerType: undefined, target: {} }));
  expect(f.pulses).toEqual([]);
  f.h.tap(f.gesture({ type: 'click', pointerType: undefined, target }));
  expect(f.pulses).toEqual([12]); f.h.destroy();
});

// Chromium click PointerEvents do not carry the preceding pointer's primary status.
test('trusted touch click may report isPrimary false', () => {
  const f = fixture(); f.h.tap(f.gesture({ type: 'click', isPrimary: false }));
  expect(f.pulses).toEqual([12]); f.h.destroy();
});
