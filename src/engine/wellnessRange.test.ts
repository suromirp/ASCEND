import { describe, it, expect } from 'vitest';
import { CHUNK_DAYS, KEEP_DAYS, neededFrom, wellnessPlan } from './wellnessRange';
import { baselineValues, todayWellness } from './wellnessCheck';
import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';

const TODAY = '2026-10-25';

describe('welk stuk ochtendgetallen wordt opgehaald', () => {
  const normal = { from: addDays(TODAY, -28), to: TODAY };

  it('zonder notities alleen de gewone 28 dagen', () => {
    expect(wellnessPlan({ today: TODAY, mornings: [] })).toEqual({ normal, long: [] });
  });

  it('met een recente notitie alleen de paar dagen die de 28 dagen ervoor nog missen', () => {
    expect(wellnessPlan({ today: TODAY, mornings: [addDays(TODAY, -3)] }).long).toEqual([{ from: addDays(TODAY, -31), to: addDays(TODAY, -29) }]);
    expect(wellnessPlan({ today: TODAY, mornings: [addDays(TODAY, -40)] }).long).toHaveLength(1);
  });

  it('met een oude notitie het lange stuk erachter, nieuwste deel eerst, aansluitend', () => {
    const morning = addDays(TODAY, -200);
    const plan = wellnessPlan({ today: TODAY, mornings: [morning, addDays(TODAY, -10)] });
    expect(plan.normal).toEqual(normal);
    expect(plan.long[0].to).toBe(addDays(normal.from, -1));
    expect(plan.long.at(-1)!.from).toBe(addDays(morning, -28));
    for (let i = 1; i < plan.long.length; i++) expect(plan.long[i].to).toBe(addDays(plan.long[i - 1].from, -1));
    expect(plan.long.every((r) => addDays(r.from, CHUNK_DAYS - 1) >= r.to)).toBe(true);
  });

  it('haalt alleen wat nog niet gedekt is', () => {
    const morning = addDays(TODAY, -200);
    const full = wellnessPlan({ today: TODAY, mornings: [morning] });
    const need = addDays(morning, -28);
    expect(wellnessPlan({ today: TODAY, mornings: [morning], coveredFrom: need }).long).toEqual([]);
    const half = wellnessPlan({ today: TODAY, mornings: [morning], coveredFrom: full.long[0].from });
    expect(half.long).toHaveLength(full.long.length - 1);
    const older = wellnessPlan({ today: TODAY, mornings: [addDays(TODAY, -300)], coveredFrom: need });
    expect(older.long[0].to).toBe(addDays(need, -1));
  });

  it('gaat nooit verder terug dan 400 dagen', () => {
    expect(neededFrom(TODAY, [addDays(TODAY, -900)])).toBeUndefined();
    expect(neededFrom(TODAY, [addDays(TODAY, -KEEP_DAYS + 5)])).toBe(addDays(TODAY, -KEEP_DAYS));
    const plan = wellnessPlan({ today: TODAY, mornings: [addDays(TODAY, -KEEP_DAYS + 5)] });
    expect(plan.long.at(-1)!.from).toBe(addDays(TODAY, -KEEP_DAYS));
  });
});

describe('wat de ochtendkaart doet met een jaar aan gegevens', () => {
  const year: RecoveryMetric[] = Array.from({ length: KEEP_DAYS }, (_, i) => ({
    id: `m${i}`, date: addDays(TODAY, -i), restingHeartRate: 50 + (i % 3), hrv: 58 + (i % 4), sleepMinutes: 420 + (i % 5) * 5, source: 'import' as const,
  }));
  const recent = year.filter((m) => m.date >= addDays(TODAY, -35));

  it('houdt het venster van 28 dagen: dezelfde ochtendregels als met 35 dagen', () => {
    expect(todayWellness(TODAY, year)).toEqual(todayWellness(TODAY, recent));
    const pick = (m: RecoveryMetric) => m.restingHeartRate;
    expect(baselineValues(TODAY, year, pick)).toHaveLength(28);
    expect(baselineValues(TODAY, year, pick).sort()).toEqual(baselineValues(TODAY, recent, pick).sort());
  });
});
