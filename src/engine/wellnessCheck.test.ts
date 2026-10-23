import { describe, it, expect } from 'vitest';
import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';
import { baselineValues, NO_SLEEP_TEXT, sleepLabel, suggestEnergyFeeling, suggestSleepFeeling, todayWellness, watchSummaryLine } from './wellnessCheck';

// Made-up nights only.
const TODAY = '2026-10-22';

function day(offset: number, extra: Partial<RecoveryMetric> = {}): RecoveryMetric {
  const date = addDays(TODAY, offset);
  return { id: `test:${date}`, date, source: 'import', ...extra };
}

// Four weeks of your own days: resting heart rate 50 to 54 (average 52), HRV 46 to 54 (average 50).
function history(): RecoveryMetric[] {
  return Array.from({ length: 28 }, (_, i) =>
    day(-(i + 1), { restingHeartRate: 50 + (i % 5), hrv: 46 + (i % 5) * 2, sleepMinutes: 420 + (i % 3) * 15 }),
  );
}

const line = (key: string, metrics: RecoveryMetric[]) => todayWellness(TODAY, metrics)?.lines.find((l) => l.key === key);

describe('sleepLabel', () => {
  it('says hours and minutes the Dutch way', () => {
    expect(sleepLabel(340)).toBe('5 uur 40');
    expect(sleepLabel(420)).toBe('7 uur');
    expect(sleepLabel(45)).toBe('45 min');
  });
});

describe('todayWellness', () => {
  it('is nothing when the watch has said nothing today', () => {
    expect(todayWellness(TODAY, [])).toBeUndefined();
    expect(todayWellness(TODAY, history())).toBeUndefined();
    expect(todayWellness(TODAY, [day(0)])).toBeUndefined();
  });

  it('shows the three lines it has, each with a few words', () => {
    const reading = todayWellness(TODAY, [...history(), day(0, { sleepMinutes: 340, sleepScore: 72, restingHeartRate: 52, hrv: 50 })])!;
    expect(reading.lines.map((l) => l.key)).toEqual(['sleep', 'restingHeartRate', 'hrv']);
    const sleep = reading.lines[0];
    expect(sleep.value).toBe('5 uur 40');
    expect(sleep.note).toContain('Jouw gemiddelde is 7 uur');
    expect(sleep.note).toContain('Slaapscore 72 van 100');
    for (const l of reading.lines) expect(l.note.length).toBeGreaterThan(10);
  });

  it('compares resting heart rate with your own average, not a norm', () => {
    const base = history();
    const high = line('restingHeartRate', [...base, day(0, { restingHeartRate: 59 })])!;
    expect(high.tone).toBe('attention');
    expect(high.note).toContain('7 hoger dan jouw gemiddelde van 52');

    const normal = line('restingHeartRate', [...base, day(0, { restingHeartRate: 53 })])!;
    expect(normal.tone).toBe('normal');
    expect(normal.note).toContain('Zoals jouw gemiddelde van 52');

    const slightly = line('restingHeartRate', [...base, day(0, { restingHeartRate: 55 })])!;
    expect(slightly.tone).toBe('normal');
    expect(slightly.note).toContain('3 hoger');

    const low = line('restingHeartRate', [...base, day(0, { restingHeartRate: 47 })])!;
    expect(low.tone).toBe('normal');
    expect(low.note).toContain('5 lager');
  });

  it('the same number is high for one person and normal for another', () => {
    const calm = Array.from({ length: 14 }, (_, i) => day(-(i + 1), { restingHeartRate: 44 }));
    const busy = Array.from({ length: 14 }, (_, i) => day(-(i + 1), { restingHeartRate: 60 }));
    expect(line('restingHeartRate', [...calm, day(0, { restingHeartRate: 55 })])!.tone).toBe('attention');
    expect(line('restingHeartRate', [...busy, day(0, { restingHeartRate: 55 })])!.tone).toBe('normal');
  });

  it('compares HRV with your own range and flags only a low day', () => {
    const base = history();
    expect(line('hrv', [...base, day(0, { hrv: 34 })])!.tone).toBe('attention');
    expect(line('hrv', [...base, day(0, { hrv: 34 })])!.note).toContain('Lager dan jouw gewone bereik');
    expect(line('hrv', [...base, day(0, { hrv: 50 })])!.note).toContain('Binnen jouw gewone bereik');
    const high = line('hrv', [...base, day(0, { hrv: 70 })])!;
    expect(high.tone).toBe('normal');
    expect(high.note).toContain('Hoger dan jouw gewone bereik');
  });

  it('says it has nothing to compare with yet, instead of guessing', () => {
    const few = [day(-1, { restingHeartRate: 50, hrv: 50 }), day(-2, { restingHeartRate: 51, hrv: 52 }), day(0, { restingHeartRate: 62, hrv: 30 })];
    const rhr = line('restingHeartRate', few)!;
    expect(rhr.tone).toBe('normal');
    expect(rhr.note).toContain('Nog te weinig dagen');
    expect(line('hrv', few)!.tone).toBe('normal');
  });

  it('counts only the four weeks before today, and each day once', () => {
    const metrics = [
      day(0, { restingHeartRate: 99 }),
      day(-29, { restingHeartRate: 99 }),
      day(-1, { restingHeartRate: 50 }),
      { ...day(-1, { restingHeartRate: 80 }), id: 'other' },
      day(-28, { restingHeartRate: 52 }),
    ];
    expect(baselineValues(TODAY, metrics, (m) => m.restingHeartRate).sort()).toEqual([50, 52]);
  });

  it('a short night is flagged, a good one is not', () => {
    expect(line('sleep', [day(0, { sleepMinutes: 330 })])!.tone).toBe('attention');
    expect(line('sleep', [day(0, { sleepMinutes: 330 })])!.note).toContain('Kort');
    expect(line('sleep', [day(0, { sleepMinutes: 450 })])!.tone).toBe('normal');
  });

  it('works with a sleep score alone, and merges the fields of two sources for one day', () => {
    expect(line('sleep', [day(0, { sleepScore: 81 })])!.value).toBe('score 81 van 100');
    const reading = todayWellness(TODAY, [day(0, { restingHeartRate: 51 }), { ...day(0, { hrv: 48 }), id: 'second', source: 'garmin' }])!;
    expect(reading.lines.map((l) => l.key)).toEqual(['restingHeartRate', 'hrv']);
  });
});

describe('suggestSleepFeeling', () => {
  it('follows the length of the night', () => {
    expect(suggestSleepFeeling({ sleepMinutes: 450 })).toBe('goed');
    expect(suggestSleepFeeling({ sleepMinutes: 380 })).toBe('gewoon');
    expect(suggestSleepFeeling({ sleepMinutes: 320 })).toBe('matig');
    expect(suggestSleepFeeling({ sleepMinutes: 240 })).toBe('slecht');
  });

  it('a poor score pulls it one step down, never further than slecht', () => {
    expect(suggestSleepFeeling({ sleepMinutes: 450, sleepScore: 55 })).toBe('gewoon');
    expect(suggestSleepFeeling({ sleepMinutes: 240, sleepScore: 40 })).toBe('slecht');
    expect(suggestSleepFeeling({ sleepMinutes: 450, sleepScore: 85 })).toBe('goed');
  });

  it('uses the score when there is no length, and nothing when there is neither', () => {
    expect(suggestSleepFeeling({ sleepScore: 85 })).toBe('goed');
    expect(suggestSleepFeeling({ sleepScore: 45 })).toBe('slecht');
    expect(suggestSleepFeeling({})).toBeUndefined();
  });
});

describe('suggestedEnergy', () => {
  it('says moe only when resting heart rate is clearly up and HRV clearly down', () => {
    const r = todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 60, hrv: 30 })])!;
    expect(r.suggestedEnergy).toBe('moe');
  });

  it('says fit only when both point the good way', () => {
    const r = todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 47, hrv: 70 })])!;
    expect(r.suggestedEnergy).toBe('fit');
  });

  it('stays empty with one signal, mixed signals or an ordinary morning', () => {
    expect(todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 60, hrv: 50 })])!.suggestedEnergy).toBeUndefined();
    expect(todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 60, hrv: 70 })])!.suggestedEnergy).toBeUndefined();
    expect(todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 52, hrv: 50 })])!.suggestedEnergy).toBeUndefined();
    expect(todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 60 })])!.suggestedEnergy).toBeUndefined();
  });

  it('stays empty without about a week of your own days', () => {
    expect(suggestEnergyFeeling({ restingHeartRate: 60, hrv: 30 }, TODAY, history().slice(0, 3))).toBeUndefined();
  });
});

describe('watchSummaryLine', () => {
  it('puts sleep, resting heart rate against your average and HRV in one line', () => {
    const line = watchSummaryLine(todayWellness(TODAY, [...history(), day(0, { sleepMinutes: 400, restingHeartRate: 49, hrv: 50 })]));
    expect(line).toBe('Slaap 6 uur 40 · rusthartslag 49, 3 onder je gemiddelde · HRV 50 ms');
  });

  it('says honestly that there is no sleep, and keeps what else there is', () => {
    expect(watchSummaryLine(undefined)).toBe(NO_SLEEP_TEXT);
    const line = watchSummaryLine(todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 52 })]));
    expect(line).toBe(`${NO_SLEEP_TEXT} · rusthartslag 52, zoals je gemiddelde`);
  });

  it('stays quiet about sleep when sleep is switched off for the watch', () => {
    expect(watchSummaryLine(undefined, { sleepExpected: false })).toBe('');
    expect(watchSummaryLine(todayWellness(TODAY, [...history(), day(0, { restingHeartRate: 52 })]), { sleepExpected: false })).toBe('Rusthartslag 52, zoals je gemiddelde');
  });

  it('marks an HRV outside your range', () => {
    expect(watchSummaryLine(todayWellness(TODAY, [...history(), day(0, { sleepMinutes: 420, hrv: 30 })]))).toContain('HRV 30 ms, lager dan gewoonlijk');
  });
});
