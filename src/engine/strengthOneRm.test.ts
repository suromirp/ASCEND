import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { exerciseHistories, exerciseView } from './strengthHistory';
import { oneRmChange, oneRmSeries, type OneRmPoint } from './strengthOneRm';
import { resolveStrengthSettings } from './strengthSettings';

const { templates, program } = buildDefaultProgramData();
const settings = resolveStrengthSettings(undefined);
const logs = demoStrengthLogs();

describe('oneRmSeries', () => {
  it('geeft per training de gladgestreken schatting van het model, zonder eigen formule', () => {
    const deps = { logs, templates, program, bodyKg: demoWeights[0].kg };
    const histories = exerciseHistories(logs.filter((l) => l.strengthData?.length), templates, deps);
    expect(histories.length).toBeGreaterThan(0);
    for (const h of histories) {
      const view = exerciseView(h, settings, deps.bodyKg, '2026-10-22');
      const series = oneRmSeries(view.points);
      expect(series.length).toBe(view.points.filter((p) => p.smoothed !== undefined).length);
      if (series.length > 0) expect(series[series.length - 1].kg).toBe(view.strengthKg);
      expect(series.map((p) => p.date)).toEqual([...series.map((p) => p.date)].sort());
    }
  });
  it('slaat trainingen zonder schatting over', () => {
    const points = [
      { date: '2026-09-01', note: 'first', legsTired: false, workSets: [] },
      { date: '2026-09-08', smoothed: 60, note: 'first', legsTired: false, workSets: [] },
    ] as unknown as Parameters<typeof oneRmSeries>[0];
    expect(oneRmSeries(points)).toEqual([{ date: '2026-09-08', kg: 60 }]);
  });
});

describe('oneRmChange', () => {
  const s = (rows: [string, number][]): OneRmPoint[] => rows.map(([date, kg]) => ({ date, kg }));
  it('vergelijkt het laatste punt met het laatste punt van minstens 4 weken eerder', () => {
    const c = oneRmChange(s([['2026-08-01', 50], ['2026-09-20', 60], ['2026-10-02', 62], ['2026-10-18', 63.5]]));
    expect(c).toEqual({ deltaKg: 3.5, fromDate: '2026-09-20' });
  });
  it('geeft niets bij te weinig punten of een te korte periode', () => {
    expect(oneRmChange(s([['2026-10-01', 60], ['2026-10-15', 62]]))).toBeUndefined();
    expect(oneRmChange(s([['2026-10-01', 60], ['2026-10-08', 61], ['2026-10-15', 62]]))).toBeUndefined();
    expect(oneRmChange(s([['2026-10-15', 62]]))).toBeUndefined();
    expect(oneRmChange([])).toBeUndefined();
  });
  it('kan ook een daling melden', () => {
    expect(oneRmChange(s([['2026-09-01', 70], ['2026-09-20', 68], ['2026-10-18', 66]]))?.deltaKg).toBe(-2);
  });
});
