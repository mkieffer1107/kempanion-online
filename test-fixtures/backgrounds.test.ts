import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { gradePixels } from '../src/lib/engine/grade';
import { BG_H, BG_W } from '../src/lib/engine/layout';

const dayPixels = pixels([200, 120, 80, 255]);
const nightPixels = pixels([20, 40, 80, 255]);
const backgrounds = new Set<string>();
const variants = new Set<string>();
const images = new Map<string, Promise<FakeImage | null>>();
const requests: string[] = [];

function pixels(rgba: number[]) {
  const data = new Uint8ClampedArray(BG_W * BG_H * 4);
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return data;
}

class FakeImage {
  naturalWidth = BG_W;
  naturalHeight = BG_H;
  constructor(readonly data: Uint8ClampedArray) {}
}

class FakeCanvas {
  data = new Uint8ClampedArray(BG_W * BG_H * 4);
  placeholder = false;
  context = {
    canvas: this,
    drawImage: (image: FakeImage) => { this.data.set(image.data); },
    clearRect: () => { this.data.fill(0); },
    getImageData: () => ({ data: this.data.slice() }),
    createImageData: () => ({ data: new Uint8ClampedArray(this.data.length) }),
    putImageData: (image: { data: Uint8ClampedArray }) => { this.data.set(image.data); },
  };
}

mock.module('../src/lib/engine/assets', () => ({
  hasBackground: (id: string) => backgrounds.has(id),
  hasNightVariant: (id: string) => variants.has(id),
  hasCG: () => false,
  loadImage: (path: string) => {
    requests.push(path);
    return images.get(path) ?? Promise.resolve(null);
  },
  makeCanvas: () => new FakeCanvas(),
  context2d: (canvas: FakeCanvas) => canvas.context,
}));
mock.module('../src/lib/engine/placeholder', () => ({
  paintPlaceholderBackground: (ctx: FakeCanvas['context']) => { ctx.canvas.placeholder = true; },
  paintPlaceholderCG: () => {},
}));

const { backgroundCanvas } = await import('../src/lib/engine/backgrounds');
const render = async (...args: Parameters<typeof backgroundCanvas>) => await backgroundCanvas(...args) as unknown as FakeCanvas;

function setup(id: string, nightVariant = true) {
  backgrounds.add(id);
  if (nightVariant) variants.add(id);
  images.set(`bg/${id}.png`, Promise.resolve(new FakeImage(dayPixels)));
  images.set(`bg/${id}_night.png`, Promise.resolve(new FakeImage(nightPixels)));
}

beforeEach(() => {
  backgrounds.clear();
  variants.clear();
  images.clear();
  requests.length = 0;
});

describe('background loading', () => {
  test('night renders only its painting, coalesces pending work and reuses its canvas', async () => {
    const id = 'night-painted';
    setup(id);
    let finish!: (image: FakeImage) => void;
    images.set(`bg/${id}_night.png`, new Promise((resolve) => { finish = resolve; }));
    images.delete(`bg/${id}.png`); // A valid night does not depend on an unused day URL succeeding.
    const first = render(id, 'night');
    const second = render(id, 'night');
    expect(requests).toEqual([`bg/${id}_night.png`]);
    finish(new FakeImage(nightPixels));
    const canvas = await first;
    expect(await second).toBe(canvas);
    expect(await render(id, 'night')).toBe(canvas);
    expect(canvas.data).toEqual(nightPixels);
    expect(canvas.placeholder).toBe(false);
    expect(requests).toEqual([`bg/${id}_night.png`]);
  });

  test('failed night loads day once and renders the established synthesized night', async () => {
    const id = 'night-failed';
    setup(id);
    images.set(`bg/${id}_night.png`, Promise.resolve(null));
    const canvas = await render(id, 'night');
    expect(requests).toEqual([`bg/${id}_night.png`, `bg/${id}.png`]);
    expect(canvas.data).toEqual(gradePixels('night', dayPixels, null, BG_W, BG_H));
    expect(canvas.placeholder).toBe(false);
  });

  test('night without a painted variant synthesizes from day without a night request', async () => {
    const id = 'night-unpainted';
    setup(id, false);
    const canvas = await render(id, 'night');
    expect(requests).toEqual([`bg/${id}.png`]);
    expect(canvas.data).toEqual(gradePixels('night', dayPixels, null, BG_W, BG_H));
  });

  test('day keeps its painting unchanged and does not request night', async () => {
    const id = 'day-painted';
    setup(id);
    const canvas = await render(id, 'day');
    expect(requests).toEqual([`bg/${id}.png`]);
    expect(canvas.data).toEqual(dayPixels);
  });

  test('evening still starts both images together and renders their existing blend', async () => {
    const id = 'evening-painted';
    setup(id);
    let finishDay!: (image: FakeImage) => void;
    let finishNight!: (image: FakeImage) => void;
    images.set(`bg/${id}.png`, new Promise((resolve) => { finishDay = resolve; }));
    images.set(`bg/${id}_night.png`, new Promise((resolve) => { finishNight = resolve; }));
    const result = render(id, 'evening');
    expect(requests).toEqual([`bg/${id}.png`, `bg/${id}_night.png`]);
    finishDay(new FakeImage(dayPixels));
    finishNight(new FakeImage(nightPixels));
    expect((await result).data).toEqual(gradePixels('evening', dayPixels, nightPixels, BG_W, BG_H));
  });

  test('disabling grading at night continues to use the unchanged day painting', async () => {
    const id = 'night-ungraded';
    setup(id);
    const canvas = await render(id, 'night', false);
    expect(requests).toEqual([`bg/${id}.png`]);
    expect(canvas.data).toEqual(dayPixels);
  });

  test('failed night and day fall back to the placeholder', async () => {
    const id = 'night-both-failed';
    setup(id);
    images.clear();
    expect((await render(id, 'night')).placeholder).toBe(true);
    expect(requests).toEqual([`bg/${id}_night.png`, `bg/${id}.png`]);
  });

  test('unknown backgrounds retain their placeholder without image requests', async () => {
    expect((await render('unknown-background', 'night')).placeholder).toBe(true);
    expect(requests).toEqual([]);
  });
});
