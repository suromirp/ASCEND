import { describe, it, expect } from 'vitest';
import { predictRace, riegel, formatRaceTime } from './racePrediction';
import type { SessionLog } from '../models/training';

const test = (id: string, date: string, minutes: number): SessionLog => ({
  id, templateId: 'tpl_test_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: minutes, distanceKm: 5, source: 'manual' },
});

describe('race prediction', () => {
  it('Riegel: a 5 km in 27:00 is about a 10 km in 56:00', () => {
    expect(formatRaceTime(riegel(27, 5, 10))).toBe('56:18');
  });
  it('predicts from the latest test and compares with the one before', () => {
    const p = predictRace([test('a', '2027-01-14', 28), test('b', '2027-02-18', 27)], 10)!;
    expect(p.latest.minutes).toBe(27);
    expect(formatRaceTime(p.predictedMinutes!)).toBe('56:18');
    expect(p.change!).toBeCloseTo(-0.0357, 3);
  });
  it('gives no prediction for a marathon, where Riegel is too optimistic', () => {
    expect(predictRace([test('a', '2027-01-14', 27)], 42.2)!.predictedMinutes).toBeUndefined();
  });
});
