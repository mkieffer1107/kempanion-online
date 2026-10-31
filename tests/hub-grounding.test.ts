import { expect, test } from 'bun:test';
import { StageWorld } from '../src/lib/engine/world';

// Exercise the actual draw path: responsive feet placement must move the painting too,
// without resizing its pixels or leaking that framing into the next visual-novel scene.
test('mobile hub floor stays with feet and normal framing is restored on exit/reset', () => {
  const world = new StageWorld();
  const calls: number[][] = [];
  const ctx = { drawImage(_image: unknown, ...coords: number[]) { calls.push(coords); } };
  const draw = () => {
    calls.length = 0;
    (world as unknown as { drawBgLayer(ctx: unknown, bg: unknown): void })
      .drawBgLayer(ctx, { canvas: {}, focusX: 240 });
    return calls[0];
  };
  const normal = draw().slice();
  for (const feet of [150, 180, 205, 230, 252]) {
    world.setGroundY(feet);
    world.setBackgroundGroundY(feet);
    const [sx, sy, sw, sh, dx, dy, dw, dh] = draw();
    expect(252 - sy + dy).toBe(feet);
    expect(sw).toBe(dw);
    expect(sh).toBe(dh);
    expect(sx).toBe(normal[0]);
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  }
  world.setBackgroundGroundY(252, 264); // Marston sidewalk is below the planter's front face.
  expect(264 - draw()[1]).toBe(252);
  world.setBackgroundGroundY(null);
  expect(draw()).toEqual(normal);
  world.setBackgroundGroundY(180);
  world.reset();
  expect(draw()).toEqual(normal);
});


test('the mobile room aisle governs standing and walking and clears on exit', async () => {
  const world = new StageWorld();
  world.setGroundBand({ min: 115, max: 165 });
  world.spawnActor('pig', 'piggy-2', { x: 100 });
  expect(world.actorPosition('pig')?.x).toBe(115);
  await world.moveActor('pig', 220);
  expect(world.actorPosition('pig')?.x).toBe(165);
  world.setGroundBand(null);
  await world.moveActor('pig', 220);
  expect(world.actorPosition('pig')?.x).toBe(220);
});
