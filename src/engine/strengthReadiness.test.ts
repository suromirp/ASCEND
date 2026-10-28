import { describe, it, expect } from 'vitest';
import { computeStrengthReadiness, strengthLevelFor } from './strengthReadiness';
import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';

// Nagemaakte gegevens: doel squat 100 kg voor 5 (geschat maximum ongeveer 117).
const TODAY = '2026-10-28';
const naming = { the: 'je krachtdoel', your: 'je krachtdoel' };
const goal = (targets: { exercise: string; kg: number; reps: number }[] = [{ exercise: 'Squat', kg: 100, reps: 5 }]): TrainingGoal => ({
  id: 'sterker', name: 'Sterker worden', status: 'active', targetDate: '2027-06-01', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z',
  kind: 'stronger', details: { strengthTargets: targets }, requirements: [],
} as TrainingGoal);

let n = 0;
type S = { reps: number; weightKg: number; rir?: number; rirAssumed?: boolean; kind?: 'warmup' };
const lift = (date: string, sets: S[], name = 'Squat'): SessionLog => ({
  id: `k${n++}`, templateId: 'tpl_lower', type: 'strength', sport: 'strength', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full',
  durationMinutes: 60, source: 'manual',
  strengthData: [{ exerciseId: name.toLowerCase(), exerciseName: name, sets: sets.map((s) => ({ rir: 0, ...s })) }],
} as unknown as SessionLog);

describe('Sterker worden met een doelgewicht', () => {
  it('rekent 90 kg voor 5 tegen 100 kg voor 5 als gat in weken, gevorderd bij een korte geschiedenis', () => {
    const r = computeStrengthReadiness(goal(), [lift('2026-10-20', [{ reps: 5, weightKg: 90 }])], TODAY, { naming })!;
    const m = r.meters.find((x) => x.key === 'krachttrend')!;
    expect(m.text).toBe('Squat nog 10 kg voor 5 herhalingen');
    // ln(116,7 / 105) / ln(1,0025), ongeveer 42 weken: 10 / 52 = 19%.
    expect(Math.round(m.share * 100)).toBe(19);
    expect(r.derivedNote).toContain('gevorderd');
    expect(r.derivedNote).toMatch(/ongeveer 4\d weken/);
  });

  it('kiest het niveau uit de lengte van de geschiedenis, nooit beginner', () => {
    expect(strengthLevelFor(0)).toBe('gevorderd');
    expect(strengthLevelFor(729)).toBe('gevorderd');
    expect(strengthLevelFor(731)).toBe('ervaren');
  });

  it('is vol als het doel gehaald is', () => {
    const r = computeStrengthReadiness(goal(), [lift('2026-10-20', [{ reps: 5, weightKg: 100 }])], TODAY, { naming })!;
    const m = r.meters.find((x) => x.key === 'krachttrend')!;
    expect(m.share).toBe(1);
    expect(m.text).toBe('Squat: gehaald');
  });

  it('neemt het niveau ervaren bij meer dan twee jaar geschiedenis op die oefening', () => {
    const logs = [lift('2024-06-01', [{ reps: 5, weightKg: 80 }]), lift('2026-10-20', [{ reps: 5, weightKg: 90 }])];
    const r = computeStrengthReadiness(goal(), logs, TODAY, { naming })!;
    expect(r.derivedNote).toContain('ervaren');
    expect(Math.round(r.meters[0].share * 100)).toBe(9);
  });

  it('telt geen opwarmset, geen aangenomen RIR en geen set ver van falen', () => {
    const logs = [lift('2026-10-20', [{ reps: 5, weightKg: 140, kind: 'warmup' }, { reps: 5, weightKg: 120, rirAssumed: true }, { reps: 5, weightKg: 120, rir: 5 }, { reps: 5, weightKg: 90 }])];
    const r = computeStrengthReadiness(goal(), logs, TODAY, { naming })!;
    expect(r.meters[0].text).toBe('Squat nog 10 kg voor 5 herhalingen');
  });

  it('kijkt alleen naar de laatste vier weken (KR-2) en naar de juiste oefening', () => {
    const logs = [lift('2026-08-01', [{ reps: 5, weightKg: 100 }]), lift('2026-10-20', [{ reps: 5, weightKg: 60 }], 'Bankdrukken')];
    const r = computeStrengthReadiness(goal(), logs, TODAY, { naming })!;
    expect(r.meters.some((m) => m.key === 'krachttrend')).toBe(false);
    expect(r.missing.some((m) => m.key === 'krachttrend')).toBe(true);
  });

  it('middelt meerdere oefeningen en noemt er een per stuk', () => {
    const g = goal([{ exercise: 'Squat', kg: 100, reps: 5 }, { exercise: 'Bankdrukken', kg: 80, reps: 5 }]);
    const logs = [lift('2026-10-20', [{ reps: 5, weightKg: 90 }]), lift('2026-10-21', [{ reps: 5, weightKg: 80 }], 'Bankdrukken')];
    const r = computeStrengthReadiness(g, logs, TODAY, { naming })!;
    const m = r.meters.find((x) => x.key === 'krachttrend')!;
    expect(m.text).toBe('Squat nog 10 kg voor 5 herhalingen, Bankdrukken: gehaald');
    expect(Math.round(m.share * 100)).toBe(60);
  });

  it('zonder doelgewicht blijft de meter ontbrekend, en er staat geen "je max is"', () => {
    const r = computeStrengthReadiness(goal([]), [lift('2026-10-20', [{ reps: 5, weightKg: 90 }])], TODAY, { naming })!;
    expect(r.meters.some((m) => m.key === 'krachttrend')).toBe(false);
    const all = JSON.stringify(r).toLowerCase();
    expect(all).not.toContain('je max is');
    expect(all).not.toMatch(/[–—]/);
  });
});
