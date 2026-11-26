// I-164: Langer voor hoogtemeters is een optioneel veld. Een oude back-up zonder het veld importeert zonder
// overgeslagen waarde en krijgt het advies; een vreemde waarde valt weg, een geldige blijft.
import { describe, expect, it } from 'vitest';
import { cleanSettings } from './backupClean';
import { resolveAscentLength } from '../engine/routeClimbPlan';

describe('Langer voor hoogtemeters in een back-up', () => {
  it('zonder het veld: niets overgeslagen, het advies 1,3', () => {
    const count = { n: 0 };
    const out = cleanSettings({ routeDriveMinutes: 30 }, count);
    expect(out && 'routeAscentLength' in out).toBe(false);
    expect(count.n).toBe(0);
    expect(resolveAscentLength(out?.routeAscentLength)).toBe(1.3);
  });

  it('een geldige waarde blijft, een vreemde valt weg', () => {
    const ok = { n: 0 };
    expect(cleanSettings({ routeAscentLength: 2 }, ok)?.routeAscentLength).toBe(2);
    expect(ok.n).toBe(0);
    const bad = { n: 0 };
    const out = cleanSettings({ routeAscentLength: 1.7 }, bad);
    expect(out && 'routeAscentLength' in out).toBe(false);
    expect(bad.n).toBe(1);
  });
});
