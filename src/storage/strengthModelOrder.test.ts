import { describe, expect, it } from 'vitest';
import { cleanSettings } from './backupClean';
import { normalizeStrengthSettings } from '../engine/strengthSettings';

// Een geldig krachtmodel met de sleutels in een andere volgorde is niet beschadigd (nagemaakt voorbeeld).
describe('strengthModel in een back-up', () => {
  it('telt een andere volgorde van de sleutels niet als overgeslagen', () => {
    const clean = normalizeStrengthSettings({ enabled: true, activeProfileId: 'a', profiles: [{ id: 'a', name: 'Thuis', barsKg: [20], platesKg: [5] }] });
    expect(clean).toBeDefined();
    const reversed = Object.fromEntries(Object.entries(clean as Record<string, unknown>).reverse());
    const skipped = { n: 0 };
    const out = cleanSettings({ strengthModel: reversed }, skipped);
    expect(skipped.n).toBe(0);
    expect(out?.strengthModel).toEqual(clean);
  });

  it('telt een echt weggevallen waarde nog wel', () => {
    const skipped = { n: 0 };
    cleanSettings({ strengthModel: { enabled: true, activeProfileId: 'a', profiles: [{ id: 'a', name: 'Thuis', barsKg: ['kapot'] }] } }, skipped);
    expect(skipped.n).toBe(1);
  });
});
