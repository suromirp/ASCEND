// Made-up strength trainings for the tests of the strength model and for looking
// at the page Kracht on a phone. Nothing here is a real person's data.
//
// Eleven trainings in six weeks: an upper body training on Mondays (bench press,
// pull-up with help of the machine, seated cable row) and a lower body training
// on Thursdays (squat, leg press, Romanian deadlift). On Wednesday 14 October
// there is a mountain hike with 900 m of climbing, the day before the last
// lower body training.

import type { SessionLog, SetLog } from '../../models/training';
import type { WeightEntry } from '../../models/metrics';

type Row = [reps: number, weightKg: number, rir: number];

const setsOf = (rows: Row[]): SetLog[] => rows.map(([reps, weightKg, rir]) => ({ reps, weightKg, rir }));

function training(id: string, templateId: string, date: string, exercises: [exerciseId: string, name: string, rows: Row[]][], minutes = 55): SessionLog {
  return {
    id,
    templateId,
    type: 'strength',
    completedDate: date,
    completedAt: `${date}T18:30:00.000Z`,
    variant: 'custom',
    durationMinutes: minutes,
    source: 'macrofactor',
    externalId: `macrofactor:${date}:${templateId}`,
    strengthData: exercises.map(([exerciseId, exerciseName, rows]) => ({ exerciseId, exerciseName, sets: setsOf(rows) })),
  };
}

const BENCH = 'bench-press';
const PULL = 'assisted-pull-up';
const ROW = 'seated-cable-row';
const SQUAT = 'back-squat';
const PRESS = 'leg-press';
const RDL = 'romanian-deadlift';

export function demoStrengthLogs(): SessionLog[] {
  const upper = (id: string, date: string, bench: number, assist: number, row: number, reps = 8): SessionLog =>
    training(id, 'tpl_upper_a', date, [
      [BENCH, 'Bench Press (Barbell)', [[reps, bench, 2], [reps, bench, 2], [reps - 1, bench, 1]]],
      [PULL, 'Assisted Pull-Up (Machine)', [[reps, -assist, 2], [reps - 1, -assist, 2], [reps - 2, -assist, 1]]],
      [ROW, 'Seated Cable Row', [[10, row, 2], [9, row, 2], [9, row, 1]]],
    ]);
  const lower = (id: string, date: string, squat: number, press: number, rdl: number, reps = 8): SessionLog =>
    training(id, 'tpl_lower_a', date, [
      [SQUAT, 'Back Squat (Barbell)', [[reps, squat, 2], [reps, squat, 2], [reps - 1, squat, 1]]],
      [PRESS, 'Leg Press (Machine)', [[10, press, 2], [10, press, 2], [9, press, 1]]],
      [RDL, 'Romanian Deadlift (Barbell)', [[10, rdl, 2], [9, rdl, 2], [9, rdl, 1]]],
    ]);

  const hike: SessionLog = {
    id: 'demo-hike',
    templateId: 'tpl_mountain_hike',
    type: 'hiking',
    sport: 'hiking',
    completedDate: '2026-10-14',
    completedAt: '2026-10-14T16:00:00.000Z',
    variant: 'full',
    durationMinutes: 300,
    source: 'manual',
    outdoorData: { durationMinutes: 300, elevationGainM: 900, elevationLossM: 900, backpackWeightKg: 10, source: 'manual' },
  };

  return [
    upper('demo-u1', '2026-09-14', 60, 40, 40),
    lower('demo-l1', '2026-09-17', 70, 100, 70),
    upper('demo-u2', '2026-09-21', 62.5, 40, 40),
    lower('demo-l2', '2026-09-24', 72.5, 100, 70),
    upper('demo-u3', '2026-09-28', 62.5, 35, 45),
    lower('demo-l3', '2026-10-01', 75, 110, 72.5),
    upper('demo-u4', '2026-10-05', 65, 35, 45),
    lower('demo-l4', '2026-10-08', 77.5, 110, 75),
    upper('demo-u5', '2026-10-12', 65, 30, 45),
    hike,
    // The day after the hike the legs give less: the weight stays, the reps drop.
    lower('demo-l5', '2026-10-15', 77.5, 110, 75, 6),
    upper('demo-u6', '2026-10-19', 67.5, 30, 50),
  ];
}

export const demoWeights: WeightEntry[] = [{ date: '2026-09-01', kg: 82, source: 'manual' }];
