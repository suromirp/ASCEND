import { describe, it, expect } from 'vitest';
import { goalReadinessFor } from './goalReadinessFor';
import { computeMainGoalReadiness } from './gr5Readiness';
import { estimatedHikingMinutes } from './goalRoute';
import type { GoalDetails, GoalKindId, TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';

// Nagemaakte gegevens.
const TODAY = '2026-10-28';
const OLD = '2026-01-01T10:00:00Z';
const goal = (kind: GoalKindId, details: GoalDetails, createdAt = OLD): TrainingGoal => ({
  id: `g-${kind}`, name: 'Doel', status: 'active', targetDate: '2027-06-01', createdAt, updatedAt: createdAt, kind, details, requirements: [],
} as TrainingGoal);

let n = 0;
const base = (date: string, minutes: number): SessionLog => ({
  id: `l${n++}`, templateId: 't', type: 'hiking', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
});
const hike = (date: string, minutes: number, km: number, upDown: number): SessionLog => ({
  ...base(date, minutes), outdoorData: { durationMinutes: minutes, distanceKm: km, elevationGainM: upDown, elevationLossM: upDown, source: 'manual' },
} as SessionLog);
const run = (date: string, minutes: number, km: number, gain = 0): SessionLog => ({
  ...base(date, minutes), type: 'cardio', sport: 'running', templateId: 'tpl_easy_run',
  cardioData: { modality: 'run', durationMinutes: minutes, distanceKm: km, elevationGainM: gain, source: 'manual' },
} as SessionLog);
const lift = (date: string, kg: number): SessionLog => ({
  ...base(date, 60), type: 'strength', sport: 'strength', templateId: 'tpl_lower',
  strengthData: [{ exerciseId: 'squat', exerciseName: 'Squat', sets: [{ reps: 5, weightKg: kg, rir: 0 }] }],
} as unknown as SessionLog);

const DIN = estimatedHikingMinutes(10, 500, 500);
const hikesAt = (dates: string[]) => dates.map((d) => hike(d, Math.round(DIN * 1.15), 10, 500));
const day = (createdAt?: string) => goal('day_hike', { distanceKm: 16, gainM: 1200, timeLimitMinutes: 420 }, createdAt);

describe('welke berekening bij welk doel hoort', () => {
  it('een dagtocht met een tijdslimiet krijgt de meter Tempo, een trail met een cutoff ook', () => {
    const r = goalReadinessFor(day(), hikesAt(['2026-10-20', '2026-10-13', '2026-10-06']), TODAY, {})!;
    expect(r.meters.some((m) => m.key === 'tempo')).toBe(true);
    const trail = goal('trail', { variant: 'ultra', distanceKm: 50, gainM: 2500, expectedMinutes: 660, cutoffMinutes: 660 });
    const t = goalReadinessFor(trail, [run('2026-10-15', 270, 25, 1000)], TODAY, {})!;
    expect(t.meters.some((m) => m.key === 'tempo')).toBe(true);
  });

  it('een hardloopwedstrijd met een doeltijd krijgt de feiten van de wedstrijd', () => {
    const r = goalReadinessFor(goal('run_race', { variant: '10k', distanceKm: 10, targetMinutes: 50 }), [], TODAY, {})!;
    expect(r.race?.status).toBe('none');
  });

  it('Sterker worden krijgt de krachtmeter', () => {
    const g = goal('stronger', { strengthTargets: [{ exercise: 'Squat', kg: 100, reps: 5 }] });
    const r = goalReadinessFor(g, [lift('2026-10-20', 90)], TODAY, {})!;
    expect(r.meters.find((m) => m.key === 'krachttrend')?.text).toBe('Squat nog 10 kg voor 5 herhalingen');
  });

  it('het doel met de mijlpalen rekent zoals Je stand, en zegt niets zolang er niets te meten is', () => {
    const g = { ...goal('trek_hut', {}), requirements: [] } as TrainingGoal;
    const direct = computeMainGoalReadiness(g.requirements, [], TODAY);
    const r = goalReadinessFor(g, [], TODAY, {}, { isMain: true });
    expect(r === undefined).toBe(direct.percent === undefined);
    if (r) expect(r.percent).toBe(direct.percent);
  });

  it('een doel zonder eigen berekening krijgt de gewone', () => {
    const r = goalReadinessFor(goal('fit', { weeklyMinutes: 150, strengthDays: 2 }), [run('2026-10-20', 40, 6)], TODAY, {})!;
    expect(r.race).toBeUndefined();
    expect(r.meters.length).toBeGreaterThan(0);
  });
});

describe('de instellingen gaan door naar de berekening', () => {
  const logs = hikesAt(['2026-10-20', '2026-10-13', '2026-10-06']);
  const tempo = (settings: Parameters<typeof goalReadinessFor>[3]) => goalReadinessFor(day(), logs, TODAY, settings)!.meters.find((m) => m.key === 'tempo')!.share;

  it('de marge bij een tijdslimiet: geen marge geeft een hogere meter dan 5% en dan 10%', () => {
    expect(tempo({ limitMargin: 'none' })).toBeGreaterThan(tempo({ limitMargin: 'five' }));
    expect(tempo({ limitMargin: 'five' })).toBeGreaterThan(tempo({ limitMargin: 'ten' }));
    expect(tempo({})).toBe(tempo({ limitMargin: 'ten' }));
    expect(tempo({ limitMargin: 'zomaar' })).toBe(tempo({}));
  });

  it('de groei bij het rekenen: voorzichtig geeft een lagere meter', () => {
    expect(tempo({ goalGrowth: 'careful' })).toBeLessThan(tempo({}));
    expect(tempo({ goalGrowth: 'kapot' })).toBe(tempo({}));
  });

  it('de groei geldt ook voor Sterker worden', () => {
    const g = goal('stronger', { strengthTargets: [{ exercise: 'Squat', kg: 100, reps: 5 }] });
    const l = [lift('2026-10-20', 90)];
    const avg = goalReadinessFor(g, l, TODAY, {})!.meters.find((m) => m.key === 'krachttrend')!.share;
    const careful = goalReadinessFor(g, l, TODAY, { goalGrowth: 'careful' })!.meters.find((m) => m.key === 'krachttrend')!.share;
    expect(careful).toBeLessThan(avg);
  });
});

describe('het verschil met vier weken terug (since)', () => {
  const dates = ['2026-09-28', '2026-09-23', '2026-09-18'];
  it('bij een dagtocht telt het pas als het doel zelf al vier weken bestond', () => {
    const fresh = goalReadinessFor(day('2026-10-27T10:00:00Z'), hikesAt(dates), TODAY, {})!;
    expect(fresh.change).toBeUndefined();
    const old = goalReadinessFor(day(), hikesAt(dates), TODAY, {})!;
    expect(typeof old.change).toBe('number');
  });

  it('bij Sterker worden en een trailrun ook', () => {
    const s = goal('stronger', { strengthTargets: [{ exercise: 'Squat', kg: 100, reps: 5 }] }, '2026-10-27T10:00:00Z');
    expect(goalReadinessFor(s, [lift('2026-09-28', 90), lift('2026-10-20', 92)], TODAY, {})!.change).toBeUndefined();
    const t = goal('trail', { variant: 'ultra', distanceKm: 50, gainM: 2500, cutoffMinutes: 660 }, '2026-10-27T10:00:00Z');
    expect(goalReadinessFor(t, [run('2026-09-28', 270, 25, 1000), run('2026-10-20', 270, 25, 1000)], TODAY, {})!.change).toBeUndefined();
  });
});
