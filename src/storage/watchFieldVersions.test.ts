import { describe, expect, it } from 'vitest';
import { cleanSettings } from './backupClean';
import { resolveVersion, resolveWatchModel } from '../engine/watchFields';

// Datavelden voor je horloge in een back-up (nagemaakt voorbeeld).
describe('datavelden voor je horloge in een back-up', () => {
  const good = { pages: [['hrZone', 'heartRate', 'cadence'], ['distance']] };

  it('een oude back-up zonder de velden blijft zoals hij is', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ stravaText: true }, skipped)!;
    expect('watchFieldsShown' in out || 'watchModel' in out || 'watchFieldVersions' in out).toBe(false);
    expect(skipped.n).toBe(0);
  });

  it('houdt geldige waarden, ook door export en import heen', () => {
    const skipped = { n: 0 };
    const settings = { watchFieldsShown: false, watchModel: 'fr255', watchFieldVersions: { zone2: { v2: good }, hills: { v3: good } } };
    const out = cleanSettings(JSON.parse(JSON.stringify(settings)), skipped)!;
    expect(out).toMatchObject(settings);
    expect(skipped.n).toBe(0);
  });

  it('een kapotte waarde valt weg en telt', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ watchFieldsShown: 'ja', watchModel: 'onbekend', watchFieldVersions: { zone2: { v2: good, v3: { pages: 'kapot' } }, onzin: 3 } }, skipped)!;
    expect('watchFieldsShown' in out).toBe(false);
    expect('watchModel' in out).toBe(false);
    expect(out.watchFieldVersions).toEqual({ zone2: { v2: good } });
    expect(skipped.n).toBe(3);
  });

  it('helemaal kapot: het veld is weg', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ watchFieldVersions: 'kapot' }, skipped)!;
    expect('watchFieldVersions' in out).toBe(false);
    expect(skipped.n).toBe(1);
  });

  it('een veld dat het model niet kent blijft in de back-up en wordt bij het lezen vervangen', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ watchFieldVersions: { zone2: { v2: { pages: [['heartRate', 'veldVanLater']] } } } }, skipped)!;
    expect(skipped.n).toBe(0);
    expect(out.watchFieldVersions?.zone2?.v2?.pages[0]).toEqual(['heartRate', 'veldVanLater']);
    const read = resolveVersion(out.watchFieldVersions, 'zone2', 'v2', resolveWatchModel(out.watchModel))!;
    expect(read.replaced).toBe(1);
    expect(read.version.pages[0][0]).toBe('heartRate');
    expect(read.version.pages[0][1]).not.toBe('veldVanLater');
  });
});
