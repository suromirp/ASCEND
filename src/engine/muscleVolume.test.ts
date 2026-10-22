import { describe, expect, it } from 'vitest';
import type { ExerciseSetLog, SessionLog } from '../models/training';
import { countsAsHardSet, muscleVolumeByWeek, muscleVolumeForWeek } from './muscleVolume';

function log(id: string, date: string, strengthData: ExerciseSetLog[]): SessionLog {
  return { id, templateId: 'tpl', type: 'strength', completedDate: date, completedAt: `${date}T18:00:00.000Z`, variant: 'full', durationMinutes: 60, source: 'manual', strengthData };
}

const squat = (sets: ExerciseSetLog['sets']): ExerciseSetLog => ({ exerciseId: 'mf_barbell_back_squat', exerciseName: 'Barbell Back Squat', sets });

describe('which sets count (KR-10)', () => {
  it('counts working sets with at most 4 reps in reserve, and sets without a known RIR', () => {
    expect(countsAsHardSet({ reps: 5, weightKg: 100, rir: 2 })).toBe(true);
    expect(countsAsHardSet({ reps: 5, weightKg: 100, rir: 4 })).toBe(true);
    expect(countsAsHardSet({ reps: 5, weightKg: 100, rir: 0 })).toBe(true);
    expect(countsAsHardSet({ reps: 5, weightKg: 100 })).toBe(true);
    expect(countsAsHardSet({ reps: 5, weightKg: 100, rir: 5 })).toBe(false);
    expect(countsAsHardSet({ reps: 8, weightKg: 40, kind: 'warmup' })).toBe(false);
    expect(countsAsHardSet({ reps: 8, weightKg: 40, kind: 'work' })).toBe(true);
  });
});

describe('sets per muscle group per week', () => {
  it('gives a primary muscle 1 per set and a secondary a half', () => {
    const week = muscleVolumeByWeek([log('a', '2026-10-14', [squat([{ reps: 5, rir: 2 }, { reps: 5, rir: 1 }, { reps: 5, rir: 1 }, { reps: 5, rir: 0 }])])])[0];
    expect(week.weekStart).toBe('2026-10-12');
    expect(week.sets.quadriceps).toBe(4);
    expect(week.sets.glutes).toBe(4);
    expect(week.sets.hamstrings).toBe(2);
    expect(week.sets.core).toBe(2);
    expect(week.sets.calves).toBe(0);
    expect(week.sets.biceps).toBe(0);
  });

  it('leaves out warm-ups and sets with more than 4 left, but keeps a set without RIR', () => {
    const week = muscleVolumeByWeek([
      log('a', '2026-10-14', [squat([{ reps: 8, weightKg: 40, kind: 'warmup' }, { reps: 12, rir: 6 }, { reps: 5, rir: 3 }, { reps: 5 }])]),
    ])[0];
    expect(week.sets.quadriceps).toBe(2);
  });

  it('adds trainings of the same week and keeps weeks apart (Monday to Sunday)', () => {
    const weeks = muscleVolumeByWeek([
      log('c', '2026-10-19', [squat([{ reps: 5, rir: 2 }])]),
      log('a', '2026-10-12', [squat([{ reps: 5, rir: 2 }])]),
      log('b', '2026-10-18', [squat([{ reps: 5, rir: 2 }, { reps: 5, rir: 2 }])]),
    ]);
    expect(weeks.map((w) => [w.weekStart, w.sets.quadriceps])).toEqual([['2026-10-12', 3], ['2026-10-19', 1]]);
    expect(muscleVolumeForWeek([log('a', '2026-10-12', [squat([{ reps: 5 }])])], '2026-10-26').sets.quadriceps).toBe(0);
  });

  it('finds an exercise by its own id or by its name, and counts the ones it does not know apart', () => {
    const own: ExerciseSetLog = { exerciseId: 'tibialis-raise', exerciseName: 'iets anders', sets: [{ reps: 20 }, { reps: 20 }] };
    const unknown: ExerciseSetLog = { exerciseId: 'x1', exerciseName: 'Zumba', sets: [{ reps: 20 }] };
    const week = muscleVolumeByWeek([log('a', '2026-10-14', [own, unknown, squat([{ reps: 5 }])])])[0];
    expect(week.sets.tibialis).toBe(2);
    expect(week.sets.quadriceps).toBe(1);
    expect(week.unknownSets).toBe(1);
  });

  it('shows the lack of work the mountains ask for: calves, shin muscles and hip abductors at 0', () => {
    const week = muscleVolumeByWeek([log('a', '2026-10-14', [squat([{ reps: 5 }])])])[0];
    expect([week.sets.calves, week.sets.tibialis, week.sets.hip_abductors]).toEqual([0, 0, 0]);
  });

  it('ignores a log without sets', () => {
    expect(muscleVolumeByWeek([{ ...log('a', '2026-10-14', []), strengthData: undefined }])).toEqual([]);
  });
});
