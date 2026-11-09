import { describe, expect, it } from 'vitest';
import { AVALANCHE_FILES, AVALANCHE_MISSING_LINE, avalancheLine, avalancheTarget, dangerWord, regionAt, regionFilesAt } from './avalanche';
import type { LeavePeriod, TrekDetails } from '../models/leave';
import type { AvalancheRegion } from '../integrations/eaws';

// Nagemaakte plekken en tochten.
const HUT = { name: 'Col du Test', lat: 45.9, lon: 6.9 };
const HERE = { name: 'Mijn locatie', lat: 45.5, lon: 6.5 };
const trek = (over: Partial<TrekDetails> = {}): TrekDetails => ({ name: 'Proeftocht', terrain: 'mountain', tent: false, importance: 'main', ...over }) as TrekDetails;
const period = (startDate: string, endDate: string, t: TrekDetails, kind: LeavePeriod['kind'] = 'trek'): LeavePeriod => ({ id: 'p', kind, startDate, endDate, trek: t });

describe('avalancheTarget', () => {
  it('alleen in het sneeuwseizoen en met een plek voor de tocht', () => {
    const winter = period('2027-02-10', '2027-02-14', trek({ place: HUT }));
    expect(avalancheTarget([winter], '2027-02-09', undefined, false)).toEqual({ date: '2027-02-10', when: 'morgen', place: HUT });
    expect(avalancheTarget([winter], '2027-02-12', undefined, false)).toEqual({ date: '2027-02-12', when: 'vandaag', place: HUT });
    const summer = period('2027-07-10', '2027-07-14', trek({ place: HUT }));
    expect(avalancheTarget([summer], '2027-07-11', undefined, false)).toBeUndefined();
  });

  it('terrein sneeuw telt het hele jaar', () => {
    const glacier = period('2027-07-10', '2027-07-14', trek({ place: HUT, terrain: 'snow' }));
    expect(avalancheTarget([glacier], '2027-07-11', undefined, false)?.when).toBe('vandaag');
  });

  it('zonder eigen plek alleen op de dag zelf als het weer je locatie volgt', () => {
    const p = period('2027-02-10', '2027-02-14', trek());
    expect(avalancheTarget([p], '2027-02-09', HERE, true)).toBeUndefined();
    expect(avalancheTarget([p], '2027-02-11', HERE, false)).toBeUndefined();
    expect(avalancheTarget([p], '2027-02-11', HERE, true)?.place).toEqual(HERE);
  });

  it('niet bij een tocht in heuvels of zonder tocht', () => {
    expect(avalancheTarget([period('2027-02-10', '2027-02-14', trek({ place: HUT, terrain: 'uneven_trail' }))], '2027-02-11', undefined, false)).toBeUndefined();
    expect(avalancheTarget([], '2027-02-11', HUT, true)).toBeUndefined();
  });
});

describe('gebieden', () => {
  it('kiest de bestanden die de plek bevatten, het lichtste eerst', () => {
    // Aosta ligt in de grenzen van FR, IT-21 en IT-23; bij de Mont Blanc komt CH erbij, en FR gaat voor.
    expect(regionFilesAt(45.75, 7.3)).toEqual(['FR', 'IT-23', 'IT-21']);
    expect(regionFilesAt(45.92, 6.87)).toEqual(['FR', 'IT-23', 'CH', 'IT-21']);
    expect(regionFilesAt(52.1, 5.1)).toEqual([]);
    for (const f of AVALANCHE_FILES) expect(f.bbox[0]).toBeLessThan(f.bbox[2]);
  });

  const square = (x: number, y: number, s: number) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
  const regions: AvalancheRegion[] = [
    { id: 'XX-01', polygons: [[square(6, 45, 1), square(6.4, 45.4, 0.2)]] },
    { id: 'XX-02', polygons: [[square(7, 45, 1)]], endDate: '2026-10-01' },
    { id: 'XX-03', polygons: [[square(7, 45, 1)]], startDate: '2026-10-01' },
  ];

  it('vindt het gebied, niet in een gat, en alleen een geldig gebied', () => {
    expect(regionAt(regions, 45.2, 6.2, '2027-02-01')).toBe('XX-01');
    expect(regionAt(regions, 45.5, 6.5, '2027-02-01')).toBeUndefined();
    expect(regionAt(regions, 45.5, 7.5, '2027-02-01')).toBe('XX-03');
    expect(regionAt(regions, 45.5, 7.5, '2026-02-01')).toBe('XX-02');
    expect(regionAt(regions, 50, 10, '2027-02-01')).toBeUndefined();
  });
});

describe('avalancheLine', () => {
  it('het droge feit eerst, met het woord en het getal', () => {
    expect(avalancheLine(3, { date: '2027-02-10', when: 'morgen', place: HUT })).toBe('Lawinegevaar aanzienlijk, 3 van 5, morgen rond Col du Test.');
    expect(avalancheLine(1, { date: '2027-02-10', when: 'vandaag', place: HERE })).toBe('Lawinegevaar gering, 1 van 5, vandaag op je plek.');
  });

  it('zonder bulletin geen regel', () => {
    expect(avalancheLine(undefined, { date: '2027-02-10', when: 'vandaag', place: HUT })).toBeUndefined();
    expect(avalancheLine(0, { date: '2027-02-10', when: 'vandaag', place: HUT })).toBeUndefined();
    expect(dangerWord(6)).toBeUndefined();
    expect(dangerWord(5)).toBe('zeer groot');
  });
});

describe('AVALANCHE_MISSING_LINE', () => {
  it('zegt dat er geen bulletin was, zonder gedachtestreepje', () => {
    expect(AVALANCHE_MISSING_LINE).toBe('Geen lawinebulletin gevonden voor je tocht. Kijk bij de lawinedienst.');
    expect(AVALANCHE_MISSING_LINE).not.toMatch(/[\u2013\u2014]/);
  });
});
