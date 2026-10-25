import { describe, it, expect } from 'vitest';
import { CHUNK_DAYS, KEEP_DAYS, neededFrom, wellnessPlan } from './wellnessRange';
import { baselineValues, todayWellness } from './wellnessCheck';
import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';

const TODAY = '2026-10-25';

describe('welk stuk ochtendgetallen wordt opgehaald', () => {
  it('zonder notities de gewone 28 dagen', () => {
    expect(wellnessPlan({ today: TODAY, mornings: [] })).toEqual({ ranges: [{ from: addDays(TODAY, -28), to: TODAY }], coveredFrom: addDays(TODAY, -28) });
  });

  it('met een recente notitie ook de gewone 28 dagen', () => {
    const plan = wellnessPlan({ today: TODAY, mornings: [addDays(TODAY, -3)] });
    expect(plan.ranges).toHaveLength(1);
  });

  it('met een oude notitie terug tot 28 dagen ervoor, in delen met een eigen verzoek', () => {
    const morning = addDays(TODAY, -200);
    const plan = wellnessPlan({ today: TODAY, mornings: [morning, addDays(TODAY, -10)] });
    expect(plan.coveredFrom).toBe(addDays(morning, -28));
    expect(plan.ranges[0].from).toBe(addDays(morning, -28));
    expect(plan.ranges.at(-1)!.to).toBe(TODAY);
    expect(plan.ranges.length).toBe(Math.ceil(229 / CHUNK_DAYS));
    // Aansluitend, zonder gat of overlap.
    for (let i = 1; i < plan.ranges.length; i++) expect(plan.ranges[i].from).toBe(addDays(plan.ranges[i - 1].to, 1));
  });

  it('haalt het lange stuk niet opnieuw op als het al gedekt is, maar dekt een nieuwe oudere notitie wel', () => {
    const morning = addDays(TODAY, -200);
    const first = wellnessPlan({ today: TODAY, mornings: [morning] });
    const again = wellnessPlan({ today: TODAY, mornings: [morning], coveredFrom: first.coveredFrom });
    expect(again.ranges).toEqual([{ from: addDays(TODAY, -28), to: TODAY }]);
    expect(again.coveredFrom).toBe(first.coveredFrom);
    const older = wellnessPlan({ today: TODAY, mornings: [addDays(TODAY, -300)], coveredFrom: first.coveredFrom });
    expect(older.ranges.length).toBeGreaterThan(1);
  });

  it('gaat nooit verder terug dan 400 dagen', () => {
    expect(neededFrom(TODAY, [addDays(TODAY, -900)])).toBeUndefined();
    expect(neededFrom(TODAY, [addDays(TODAY, -KEEP_DAYS + 5)])).toBe(addDays(TODAY, -KEEP_DAYS));
    const plan = wellnessPlan({ today: TODAY, mornings: [addDays(TODAY, -KEEP_DAYS + 5)] });
    expect(plan.ranges[0].from).toBe(addDays(TODAY, -KEEP_DAYS));
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
