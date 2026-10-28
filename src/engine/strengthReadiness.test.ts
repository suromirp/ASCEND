import { describe, it, expect } from 'vitest';
import { computeStrengthReadiness, strengthLevelFor, weeksWorkSaid } from './strengthReadiness';
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

  it('zegt alleen "gehaald" als de meter vol is, en anders eerlijk hoe klein het gat is', () => {
    for (let kg = 90; kg <= 102; kg += 0.25) {
      const r = computeStrengthReadiness(goal(), [lift('2026-10-20', [{ reps: 5, weightKg: kg }])], TODAY, { naming })!;
      const m = r.meters.find((x) => x.key === 'krachttrend')!;
      expect(m.text.includes('gehaald')).toBe(m.share === 1);
    }
    const near = computeStrengthReadiness(goal(), [lift('2026-10-20', [{ reps: 5, weightKg: 99.9 }])], TODAY, { naming })!;
    const m = near.meters.find((x) => x.key === 'krachttrend')!;
    expect(m.share).toBeLessThan(1);
    expect(m.text).toBe('Squat nog minder dan een halve kilo voor 5 herhalingen');
  });

  it('zegt weken in enkelvoud en "minder dan een week" waar dat klopt', () => {
    expect(weeksWorkSaid(0.3)).toBe('minder dan een week werk');
    expect(weeksWorkSaid(1.2)).toBe('ongeveer 1 week werk');
    expect(weeksWorkSaid(6.4)).toBe('ongeveer 6 weken werk');
    const near = computeStrengthReadiness(goal(), [lift('2026-10-20', [{ reps: 5, weightKg: 99.9 }])], TODAY, { naming })!;
    expect(near.derivedNote).toContain('minder dan een week werk');
  });

  it('voorzichtige groei geeft een lagere meter, en Gelijk laat de meters even zwaar wegen', () => {
    const logs = [lift('2026-10-20', [{ reps: 5, weightKg: 90 }])];
    const average = computeStrengthReadiness(goal(), logs, TODAY, { naming })!;
    const careful = computeStrengthReadiness(goal(), logs, TODAY, { naming, growth: 'careful' })!;
    expect(careful.meters.find((x) => x.key === 'krachttrend')!.share).toBeLessThan(average.meters.find((x) => x.key === 'krachttrend')!.share);
    const equal = computeStrengthReadiness(goal(), logs, TODAY, { naming, weighting: 'equal' })!;
    expect(equal.percent).toBeDefined();
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

  it('telt een log onder een alias of onder het id van de oefening mee', () => {
    const g = goal([{ exercise: 'Barbell Back Squat', kg: 100, reps: 5 }]);
    const viaAlias = computeStrengthReadiness(g, [lift('2026-10-20', [{ reps: 5, weightKg: 90 }], 'Back Squat')], TODAY, { naming })!;
    expect(viaAlias.meters.find((x) => x.key === 'krachttrend')?.text).toBe('Barbell Back Squat nog 10 kg voor 5 herhalingen');
    const viaId = computeStrengthReadiness(g, [lift('2026-10-20', [{ reps: 5, weightKg: 90 }], 'back-squat')], TODAY, { naming })!;
    expect(viaId.meters.some((x) => x.key === 'krachttrend')).toBe(true);
    // Een oud opgeslagen doel met een id telt ook mee voor een log met de naam.
    const stored = goal([{ exercise: 'back-squat', kg: 100, reps: 5 }]);
    expect(computeStrengthReadiness(stored, [lift('2026-10-20', [{ reps: 5, weightKg: 90 }], 'Barbell Back Squat')], TODAY, { naming })!.meters.some((x) => x.key === 'krachttrend')).toBe(true);
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
