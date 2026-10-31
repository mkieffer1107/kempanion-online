import { describe, expect, test } from 'bun:test';
import { StageWorld } from '../src/lib/engine/world';
import type { AnimId, OutfitId, PigId } from '../src/lib/types';

interface ActorState {
  anim: AnimId;
  total: number;
  busy: number;
  idle: { on: boolean; running: boolean; nextAt: number };
}

function room(pig: PigId = 'piggy-3', outfit: OutfitId = 'everyday') {
  const world = new StageWorld();
  world.attach({
    setActive() {}, bubblesChanged() {}, hitAlpha: () => true,
    canvasRect: () => ({ left: 0, top: 0, width: 480, height: 270 }),
  } as never);
  world.spawnActor('pig', pig, { x: 240, outfit });
  const actor = (world as unknown as { actors: Map<string, ActorState> }).actors.get('pig')!;
  world.idleBehavior('pig', true);
  return { world, actor };
}

async function advance(world: StageWorld, ms: number) {
  world.update(ms);
  // Clip completion and the idle/external continuation each release their own promise.
  await Promise.resolve();
  await Promise.resolve();
}

describe('Piggy 3 reaches for his phone while the hub is idle', () => {
  for (const outfit of ['everyday', 'hoodie'] as const) test(`${outfit}: first phone in 3–5 seconds, two loops, then 4–7 seconds between uses`, async () => {
    const { world, actor } = room('piggy-3', outfit);
    let elapsed = 0;
    expect(actor.idle.nextAt).toBeGreaterThanOrEqual(3000);
    expect(actor.idle.nextAt).toBeLessThanOrEqual(5000);
    for (let i = 0; i < 3; i++) {
      const due = actor.idle.nextAt;
      await advance(world, due - elapsed - 1);
      expect(actor.anim).toBe('idle');
      await advance(world, 1);
      expect(actor.anim).toBe('phone');
      expect(actor.idle.running).toBe(true);
      const duration = actor.total * 2;
      await advance(world, duration - 1);
      expect(actor.anim).toBe('phone');
      await advance(world, 1);
      elapsed = due + duration;
      expect(actor.anim).toBe('idle');
      expect(actor.idle.running).toBe(false);
      expect(actor.idle.nextAt - elapsed).toBeGreaterThanOrEqual(4000);
      expect(actor.idle.nextAt - elapsed).toBeLessThanOrEqual(7000);
    }
  });

  test('suspending for a hub overlay stops the routine; its old continuation cannot revive it', async () => {
    const { world, actor } = room();
    await advance(world, actor.idle.nextAt);
    expect(actor.anim).toBe('phone');
    world.idleBehavior('pig', false);
    await advance(world, 20_000);
    expect(actor.anim).toBe('idle');
    expect(actor.idle).toMatchObject({ on: false, running: false });
    const elapsed = (world as unknown as { time: number }).time;
    world.idleBehavior('pig', true);
    expect(actor.idle.nextAt - elapsed).toBeGreaterThanOrEqual(3000);
    expect(actor.idle.nextAt - elapsed).toBeLessThanOrEqual(5000);
    await advance(world, actor.idle.nextAt - elapsed);
    expect(actor.anim).toBe('phone');
  });

  test('care reactions interrupt scrolling and get a fresh idle delay afterward', async () => {
    const { world, actor } = room();
    const first = actor.idle.nextAt;
    await advance(world, first);
    const reaction = world.playAnim('pig', 'pet_reaction');
    await advance(world, 1);
    expect(actor.anim).toBe('pet_reaction');
    expect(actor.busy).toBe(1);
    const duration = actor.total;
    await advance(world, duration);
    await reaction;
    expect(actor.busy).toBe(0);
    expect(actor.idle.nextAt - first - duration - 1).toBeGreaterThanOrEqual(3000);
    expect(actor.idle.nextAt - first - duration - 1).toBeLessThanOrEqual(5000);
  });

  test('a thought-owned phone clip survives idle suspension instead of being cancelled by its cloud', async () => {
    const { world, actor } = room();
    await advance(world, actor.idle.nextAt);
    const thought = world.playAnim('pig', 'phone', { times: 2 });
    world.idleBehavior('pig', false); // Hub sets thought, requests its pose, then the reactive idle gate closes.
    await advance(world, 1);
    expect(actor.anim).toBe('phone');
    expect(actor.busy).toBe(1);
    expect(actor.idle.running).toBe(false);
    await advance(world, actor.total * 2);
    await thought;
    expect(actor.busy).toBe(0);
    expect(actor.idle.on).toBe(false);
  });

  test('picking him up interrupts the phone and does not restart it while held', async () => {
    const { world, actor } = room();
    await advance(world, actor.idle.nextAt);
    expect(world.holdActor('pig', 240, 210)).toBe(true);
    for (let i = 0; i < 400; i++) await advance(world, 16);
    expect(actor.anim).toBe('held');
    expect(actor.idle.running).toBe(false);
    world.removeActor('pig');
  });

  test('reduced motion stops a running idle phone clip and never picks it again', async () => {
    const { world, actor } = room();
    await advance(world, actor.idle.nextAt);
    world.setReduceMotion(true);
    await advance(world, 1);
    expect(actor.anim).toBe('idle');
    for (let i = 0; i < 60; i++) {
      await advance(world, 1000);
      expect(actor.anim).not.toBe('phone');
    }
  });

  test('other pigs keep their original first idle interval', () => {
    for (const pig of ['piggy-1', 'piggy-2'] as const) {
      const { actor } = room(pig);
      expect(actor.idle.nextAt).toBeGreaterThanOrEqual(1500);
      expect(actor.idle.nextAt).toBeLessThanOrEqual(4000);
    }
  });
});
