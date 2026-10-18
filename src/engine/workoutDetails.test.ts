import { describe, it, expect } from 'vitest';
import { cleanDetails, formatRep, plannedDetails, stepRepSeconds, workoutLine } from './workoutDetails';
import { buildWorkoutPlan } from './workoutPlan';
import { buildDefaultProgramData } from '../data/defaultProgram';

const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;

describe('what the hard part of a session was', () => {
  it('starts at the plan: hill intervals as repeats of 60 s, the tempo run as minutes at tempo', () => {
    const hills = plannedDetails('tpl_hill_intervals', buildWorkoutPlan(tpl('tpl_hill_intervals'), undefined, undefined));
    expect(hills.reps).toBeGreaterThan(0);
    expect(hills.repSeconds).toBe(60);
    const tempo = plannedDetails('tpl_tempo_run', buildWorkoutPlan(tpl('tpl_tempo_run'), undefined, undefined));
    expect(tempo.blockMinutes).toBeGreaterThan(0);
    expect(plannedDetails('tpl_easy_run', buildWorkoutPlan(tpl('tpl_easy_run'), undefined, undefined))).toEqual({});
  });

  it('steps the repeat length by 15 s, by 30 s from 2 minutes', () => {
    expect(stepRepSeconds(60, 1)).toBe(75);
    expect(stepRepSeconds(120, 1)).toBe(150);
    expect(stepRepSeconds(150, -1)).toBe(120);
    expect(stepRepSeconds(120, -1)).toBe(105);
    expect(stepRepSeconds(15, -1)).toBe(15);
    expect(formatRep(75)).toBe('75 s');
    expect(formatRep(240)).toBe('4 min');
    expect(formatRep(150)).toBe('2:30 min');
  });

  it('reads as one line, and an empty form saves nothing', () => {
    expect(workoutLine({ templateId: 'tpl_hill_intervals', workout: { reps: 7, repSeconds: 75, peakHeartRate: 186 } })).toBe('7 × 75 s bergop · piek 186');
    expect(workoutLine({ templateId: 'tpl_tempo_run', workout: { blockMinutes: 20, blockHeartRate: 172 } })).toBe('20 min stevig, gem. 172');
    expect(cleanDetails({ reps: 0, peakHeartRate: undefined })).toBeUndefined();
    expect(cleanDetails({ reps: 6, repSeconds: 60 })).toEqual({ reps: 6, repSeconds: 60 });
  });
});
