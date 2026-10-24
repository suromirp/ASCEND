import { describe, expect, it } from 'vitest';
import { countNewReadings, externalKey, externalOneRmByKey, latestReading, mergeExternalOneRm } from './externalOneRm';
import type { ExternalOneRm } from '../models/metrics';

// Made-up readings only.
const series = (exerciseName: string, rows: [string, number][], source: ExternalOneRm['source'] = 'macrofactor'): ExternalOneRm => ({
  exerciseName,
  source,
  points: rows.map(([date, kg]) => ({ date, kg })),
});

describe('externalKey', () => {
  it('geeft dezelfde sleutel als Forge: het id van de oefening, anders de nette naam', () => {
    expect(externalKey('Back Squat')).toBe('back-squat');
    expect(externalKey('Barbell Back Squat')).toBe('back-squat');
    expect(externalKey('Fantasie Oefening')).toBe('naam:fantasie oefening');
  });
});

describe('mergeExternalOneRm', () => {
  const stored = [series('Back Squat', [['2026-10-05', 100], ['2026-10-12', 101]])];

  it('zet er nieuwe dagen bij, neemt de nieuwe waarde van een dag over en houdt een dag die alleen is opgeslagen', () => {
    const merged = mergeExternalOneRm(stored, [series('Back Squat', [['2026-10-12', 102], ['2026-10-19', 103]])]);
    expect(merged).toHaveLength(1);
    expect(merged[0].points).toEqual([{ date: '2026-10-05', kg: 100 }, { date: '2026-10-12', kg: 102 }, { date: '2026-10-19', kg: 103 }]);
  });

  it('voegt een nieuwe oefening toe en houdt een oefening die het bestand niet heeft', () => {
    const merged = mergeExternalOneRm(stored, [series('Hanging Leg Raise', [['2026-10-12', 40]])]);
    expect(merged.map((s) => s.exerciseName)).toEqual(['Back Squat', 'Hanging Leg Raise']);
  });

  it('ziet "Back Squat" en "Barbell Back Squat" als dezelfde oefening, en houdt bronnen uit elkaar', () => {
    const merged = mergeExternalOneRm(stored, [series('Barbell Back Squat', [['2026-10-19', 103]]), series('Back Squat', [['2026-10-19', 90]], 'manual')]);
    expect(merged).toHaveLength(2);
    expect(merged.find((s) => s.source === 'macrofactor')?.points.map((p) => p.date)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
    expect(merged.find((s) => s.source === 'manual')?.points).toEqual([{ date: '2026-10-19', kg: 90 }]);
  });

  it('wijzigt de opgeslagen reeks niet en werkt zonder opgeslagen reeks', () => {
    const copy = JSON.parse(JSON.stringify(stored));
    mergeExternalOneRm(stored, [series('Back Squat', [['2026-10-19', 103]])]);
    expect(stored).toEqual(copy);
    expect(mergeExternalOneRm(undefined, stored)).toEqual(stored);
  });
});

describe('countNewReadings', () => {
  const stored = [series('Back Squat', [['2026-10-05', 100], ['2026-10-12', 101]])];
  it('telt alleen dagen die er nog niet waren, en bij hoeveel oefeningen', () => {
    expect(countNewReadings(stored, [series('Back Squat', [['2026-10-12', 105], ['2026-10-19', 103]]), series('Hanging Leg Raise', [['2026-10-12', 40]])])).toEqual({ exercises: 2, added: 2 });
    expect(countNewReadings(stored, [series('Back Squat', [['2026-10-05', 100]])])).toEqual({ exercises: 0, added: 0 });
    expect(countNewReadings(undefined, stored)).toEqual({ exercises: 1, added: 2 });
  });
});

describe('externalOneRmByKey', () => {
  it('geeft de reeks per Forge-sleutel, van één bron, oudste eerst', () => {
    const stored = [
      series('Back Squat', [['2026-10-12', 101], ['2026-10-05', 100]]),
      series('Fantasie Oefening', [['2026-10-12', 60]]),
      series('Back Squat', [['2026-10-12', 55]], 'manual'),
    ];
    const byKey = externalOneRmByKey(stored);
    expect(byKey.get('back-squat')).toEqual([{ date: '2026-10-05', kg: 100 }, { date: '2026-10-12', kg: 101 }]);
    expect(byKey.get('naam:fantasie oefening')).toEqual([{ date: '2026-10-12', kg: 60 }]);
    expect(externalOneRmByKey(stored, 'manual').get('back-squat')).toEqual([{ date: '2026-10-12', kg: 55 }]);
    expect(externalOneRmByKey(undefined).size).toBe(0);
  });

  it('latestReading is de laatste meting of niets', () => {
    expect(latestReading([{ date: '2026-10-05', kg: 100 }, { date: '2026-10-12', kg: 101 }])).toEqual({ date: '2026-10-12', kg: 101 });
    expect(latestReading([])).toBeUndefined();
    expect(latestReading(undefined)).toBeUndefined();
  });
});
