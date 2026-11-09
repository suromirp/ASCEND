// Dag en tijd in Nederland, ook rond middernacht: de dag komt uit de lokale tijd, nooit uit UTC.
// 22:59 UTC op 8 november is 23:59 in Amsterdam; 23:00 UTC is 00:00 op 9 november.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import { fetchedWhen, healthRoundLines } from './healthConnectRound';

describe('fetchedWhen', () => {
  it('zegt vandaag, gisteren of de datum, met de tijd', () => {
    expect(fetchedWhen('2026-11-09T14:07:00.000Z', '2026-11-09')).toBe('vandaag om 15:07');
    expect(fetchedWhen('2026-11-08T18:07:00.000Z', '2026-11-09')).toBe('gisteren om 19:07');
    expect(fetchedWhen('2026-11-05T18:07:00.000Z', '2026-11-09')).toBe('5 nov om 19:07');
    expect(fetchedWhen('2025-12-30T18:07:00.000Z', '2026-11-09')).toBe('30 dec 2025 om 19:07');
  });

  it('rond middernacht telt de dag van het toestel', () => {
    // 23:58 in Amsterdam op 8 november, bekeken om 00:02 op 9 november: gisteren.
    expect(fetchedWhen('2026-11-08T22:58:00.000Z', '2026-11-09')).toBe('gisteren om 23:58');
    // 00:00 op 9 november in Amsterdam is nog 8 november in UTC: toch vandaag.
    expect(fetchedWhen('2026-11-08T23:00:00.000Z', '2026-11-09')).toBe('vandaag om 00:00');
    // Overgang naar wintertijd (25 oktober): de dag blijft 25 oktober.
    expect(fetchedWhen('2026-10-25T01:30:00.000Z', '2026-10-25')).toBe('vandaag om 02:30');
  });

  it('een moment dat niet te lezen is geeft niets', () => {
    expect(fetchedWhen('kapot', '2026-11-09')).toBeUndefined();
  });
});

describe('healthRoundLines', () => {
  it('een regel per soort', () => {
    expect(healthRoundLines({ activities: 6, mornings: 22, weight: 3 })).toEqual(['Trainingen: 6', 'Ochtenden: 22', 'Gewicht: 3 wegingen']);
    expect(healthRoundLines({ activities: 1, mornings: 1, weight: 1 })[2]).toBe('Gewicht: 1 weging');
  });

  it('zegt wat er niet was en waarom', () => {
    expect(healthRoundLines({ activities: 0, mornings: 0, weight: 0 })).toEqual([
      'Trainingen: niets gevonden in de laatste 7 dagen',
      'Ochtenden: niets gevonden in de laatste 28 dagen',
      'Gewicht: niets gevonden in de laatste 28 dagen',
    ]);
    expect(healthRoundLines({ activities: 0, mornings: 0, weight: 'denied' })[2]).toBe('Gewicht: geen toestemming');
    expect(healthRoundLines({ activities: 0, mornings: 0, weight: 'off' })[2]).toBe('Gewicht: staat uit');
  });
});
