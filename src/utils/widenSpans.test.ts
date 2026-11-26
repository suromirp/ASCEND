import { describe, expect, it } from 'vitest';
import { widenSpans } from './widenSpans';

describe('widenSpans (I-20, tikdoel jaaroverzicht)', () => {
  it('maakt een smal vak 44 breed ten koste van zijn buren, en de buren houden minstens 44', () => {
    const out = widenSpans([[8, 120], [120, 158], [158, 282]], 44, 0, 296);
    for (const [a, b] of out) expect(b - a).toBeGreaterThanOrEqual(44);
    expect(out[1][1] - out[1][0]).toBe(44);
    expect(out[0][0]).toBe(0);
    expect(out[2][1]).toBe(296);
    // Ze sluiten aan.
    expect(out[0][1]).toBe(out[1][0]);
    expect(out[1][1]).toBe(out[2][0]);
  });

  it('een smal vak aan de rand neemt alles van de ene buur', () => {
    const out = widenSpans([[8, 30], [30, 282]], 44, 0, 296);
    expect(out[0]).toEqual([0, 44]);
    expect(out[1]).toEqual([44, 296]);
  });

  it('laat brede vakken zoals ze zijn, op de buitenste grenzen na', () => {
    expect(widenSpans([[8, 150], [150, 282]], 44, 0, 296)).toEqual([[0, 150], [150, 296]]);
  });
});
