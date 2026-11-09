import { describe, expect, it } from 'vitest';
import type { WeightEntry } from '../models/metrics';
import type { SessionLog } from '../models/training';
import { logbookWeeks, weighingsInRange, weightCardData, weightCardOn, weightSourceLabel } from './weightCard';

const w = (date: string, kg: number, source: WeightEntry['source'] = 'manual'): WeightEntry => ({ date, kg, source });
const log = (id: string, completedDate: string): SessionLog => ({ id, completedDate, completedAt: `${completedDate}T08:00:00Z`, durationMinutes: 30 } as SessionLog);

describe('weightCardOn', () => {
  it('is aan zodra er een weging is, tenzij false', () => {
    expect(weightCardOn(undefined, [w('2026-11-01', 80)])).toBe(true);
    expect(weightCardOn(true, [w('2026-11-01', 80)])).toBe(true);
    expect(weightCardOn(false, [w('2026-11-01', 80)])).toBe(false);
    expect(weightCardOn(undefined, [])).toBe(false);
    expect(weightCardOn(undefined, undefined)).toBe(false);
  });
});

describe('weightCardData', () => {
  it('geeft niets zonder wegingen', () => {
    expect(weightCardData([], undefined, '2026-11-09')).toBeUndefined();
  });
  it('met één weging is dat de grote waarde, zonder lijn', () => {
    const d = weightCardData([w('2026-11-08', 84.6)], undefined, '2026-11-09')!;
    expect(d).toMatchObject({ kg: 84.6, isTrend: false, latest: { kg: 84.6, date: '2026-11-08', source: 'manual' } });
    expect(d.points).toHaveLength(1);
  });
  it('met genoeg wegingen is de trend groot en de laatste weging klein', () => {
    const entries = [w('2026-11-02', 84), w('2026-11-05', 85), w('2026-11-09', 86)];
    const d = weightCardData(entries, undefined, '2026-11-09')!;
    expect(d.isTrend).toBe(true);
    expect(d.kg).not.toBe(86);
    expect(d.latest.kg).toBe(86);
  });
  it('met Gewichtstrend uit is de laatste weging groot', () => {
    const entries = [w('2026-11-02', 84), w('2026-11-05', 85), w('2026-11-09', 86)];
    expect(weightCardData(entries, false, '2026-11-09')).toMatchObject({ kg: 86, isTrend: false });
  });
  it('maakt hoogstens één punt per week en slaat weken zonder recente weging over', () => {
    const entries = [w('2026-09-01', 90), w('2026-10-20', 85), w('2026-11-09', 84)];
    const d = weightCardData(entries, false, '2026-11-09')!;
    expect(d.points.map((p) => p.label)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(d.points.map((p) => p.value)).toEqual([85, 85, 84]);
  });
});

describe('weighingsInRange en logbookWeeks', () => {
  it('kiest de wegingen van de maand, nieuwste eerst', () => {
    const r = weighingsInRange([w('2026-10-31', 1), w('2026-11-02', 2), w('2026-11-20', 3)], '2026-11-01', '2026-11-30');
    expect(r.map((e) => e.date)).toEqual(['2026-11-20', '2026-11-02']);
  });
  it('zet een weging tussen de trainingen, de training eerst op dezelfde dag', () => {
    const weeks = logbookWeeks([log('a', '2026-11-03'), log('b', '2026-11-05')], [w('2026-11-05', 80), w('2026-11-04', 81)]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].items.map((i) => (i.kind === 'log' ? i.log.id : `w${i.entry.date.slice(-2)}`))).toEqual(['b', 'w05', 'w04', 'a']);
  });
  it('toont een week met alleen een weging', () => {
    const weeks = logbookWeeks([log('a', '2026-11-03')], [w('2026-11-12', 80)]);
    expect(weeks.map((x) => x.weekStart)).toEqual(['2026-11-09', '2026-11-02']);
  });
});

describe('weightSourceLabel', () => {
  it('noemt de bron in gewone woorden', () => {
    expect(weightSourceLabel('manual')).toBe('Zelf ingevuld');
    expect(weightSourceLabel('macrofactor')).toBe('MacroFactor');
    expect(weightSourceLabel('health-connect')).toBe('Health Connect');
  });
});
