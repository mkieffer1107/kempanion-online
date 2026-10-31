import { describe, expect, test } from 'bun:test';
import { LOCATIONS, LOCATION_IDS } from '../src/lib/content/locations';
import { actionKind, locationKinds } from '../src/lib/ui/location/activities';

describe('map activity labels', () => {
  test('every game destination is marked as a minigame', () => {
    for (const id of LOCATION_IDS) {
      expect(locationKinds(LOCATIONS[id]).includes('minigame')).toBe(LOCATIONS[id].actions.some((a) => a.startsWith('minigame:')));
    }
  });
  test('all three stores are visible, including Shands with its separate free check-up', () => {
    expect(LOCATION_IDS.filter((id) => locationKinds(LOCATIONS[id]).includes('shop')).sort()).toEqual(['midtown', 'reitz', 'shands']);
    expect(locationKinds(LOCATIONS.shands)).toEqual(['minigame', 'shop']);
    expect(actionKind('pharmacy')).toBe('care');
  });
  test('non-game destinations have useful labels and study is not mistaken for a game', () => {
    expect(locationKinds(LOCATIONS.dorm)).toEqual(['home']);
    expect(locationKinds(LOCATIONS.anatomy_lab)).toEqual(['study']);
    expect(locationKinds(LOCATIONS.malachowsky)).toEqual(['study']);
    expect(locationKinds(LOCATIONS.lake_alice)).toEqual(['activity']);
    expect(locationKinds(LOCATIONS.marston)).toEqual(['minigame']);
  });
});
