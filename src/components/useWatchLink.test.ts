import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredWatchLink, storeWatchLink } from './useWatchLink';

// De laatst gelezen koppeling op het toestel (punt 9 van de herstelronde): een koude start begint
// daarmee; zonder bewaarde stand, of als de opslag niet werkt, niets (en dan Gedaan).
function fakeStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

afterEach(() => vi.unstubAllGlobals());

const link = {
  watchLink: { linked: true, autoTick: true, activities: true },
  watchSource: { today: '2026-11-10', linked: true, fetchedAt: new Date().toISOString(), activitiesOn: true, morningsOn: false, activityDays: ['2026-11-09'], morningDays: [], logs: [] },
};

describe('de bewaarde koppeling', () => {
  it('bewaart de koppeling en de dagen, en leest ze terug met de logs en de dag van nu', () => {
    const s = fakeStorage();
    vi.stubGlobal('localStorage', s);
    storeWatchLink(link);
    expect([...s.m.values()][0]).not.toContain('"logs"');
    const back = readStoredWatchLink([]);
    expect(back?.watchLink).toEqual(link.watchLink);
    expect(back?.watchSource?.activityDays).toEqual(['2026-11-09']);
  });
  it('zonder bewaarde stand, met een kapotte waarde of zonder opslag: niets', () => {
    const s = fakeStorage();
    vi.stubGlobal('localStorage', s);
    expect(readStoredWatchLink([])).toBeUndefined();
    s.setItem('ascend.briefingWatchLink', '{kapot');
    expect(readStoredWatchLink([])).toBeUndefined();
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('geblokkeerd'); } });
    expect(readStoredWatchLink([])).toBeUndefined();
  });
  it('een mislukte lezing wist de bewaarde stand', () => {
    const s = fakeStorage();
    vi.stubGlobal('localStorage', s);
    storeWatchLink(link);
    storeWatchLink(undefined);
    expect(readStoredWatchLink([])).toBeUndefined();
  });
  it('een stand van een andere dag geldt niet: dan Gedaan', () => {
    const s = fakeStorage();
    vi.stubGlobal('localStorage', s);
    storeWatchLink({ ...link, watchSource: { ...link.watchSource, fetchedAt: new Date(Date.now() - 3 * 86_400_000).toISOString() } });
    expect(readStoredWatchLink([])).toBeUndefined();
  });
});
