import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { canAdjustDuration, chosenDurationLine, fileDurationSentence, isValidMinutes, suggestedDuration, withChosenDuration } from './macrofactorDuration';
import { planMacroFactor } from './macrofactorLink';
import { readMacroFactorCsv } from './macrofactorImport';

// Made-up file: one upper-body workout whose clock ran for 6 hours 16 minutes.
const CSV = [
  'Date,Workout Duration,Workout,Exercise,Set Type,Weight (kg),Reps,RIR',
  '2026-10-28,22560,Upper A,Bench Press (Barbell),Working,70,8,3',
  '2026-10-28,22560,Upper A,Bench Press (Barbell),Working,70,7,2',
  '2026-10-28,22560,Upper A,Row (Cable),Working,50,10,2',
].join('\n');
const { templates } = buildDefaultProgramData();
const upper = templates.find((t) => t.id === 'tpl_upper_a')!;
const workouts = readMacroFactorCsv(CSV).workouts;
const plan = (w = workouts) => planMacroFactor(w, { 'upper a': 'tpl_upper_a' }, [], [], templates, [], true, [], '2026-10-29').proposals;

describe('a row that only doubts the duration', () => {
  it('can be adjusted', () => {
    const [p] = plan();
    expect(p.kind).toBe('new');
    expect(p.kind !== 'unmapped' && p.doubt).toContain('6 uur 16 min');
    expect(canAdjustDuration(p, '2026-10-29')).toBe(true);
  });

  it('cannot when something else is wrong too', () => {
    const odd = { ...workouts[0], exercises: [{ ...workouts[0].exercises[0], sets: [{ reps: 900, weightKg: 70 }] }] };
    expect(canAdjustDuration(plan([odd])[0], '2026-10-29')).toBe(false);
  });

  it('cannot on a row with a normal duration', () => {
    expect(canAdjustDuration(plan([{ ...workouts[0], durationSec: 3000 }])[0], '2026-10-29')).toBe(false);
  });
});

describe('the suggestion', () => {
  it('is the estimate of the training, or the median of your own logs', () => {
    expect(suggestedDuration(upper, [], 55)).toBe(55);
    const own = (d: number, i: number): SessionLog => ({
      id: `l${i}`, templateId: upper.id, type: 'strength', completedDate: `2026-10-0${i + 1}`, completedAt: `2026-10-0${i + 1}T10:00:00.000Z`, variant: 'full', durationMinutes: d, source: 'manual',
    });
    expect(suggestedDuration(upper, [own(40, 1), own(45, 2), own(50, 3)], 90)).toBe(45);
  });

  it('accepts only minutes a strength training can last', () => {
    expect(isValidMinutes(45)).toBe(true);
    expect(isValidMinutes(0)).toBe(false);
    expect(isValidMinutes(241)).toBe(false);
    expect(isValidMinutes(undefined)).toBe(false);
  });

  it('says what the file said', () => {
    expect(fileDurationSentence(workouts[0])).toBe('Het bestand zegt 6 uur 16 min. Je klok liep waarschijnlijk door.');
  });
});

describe('the row and the log after the choice', () => {
  it('a chosen duration is the duration of the log and the file duration is kept', () => {
    const [p] = plan();
    if (!canAdjustDuration(p, '2026-10-29')) throw new Error('expected a new row');
    const after = withChosenDuration(p, 50);
    expect(after.doubt).toBeUndefined();
    expect(after.draft.durationMinutes).toBe(50);
    expect(after.draft.fileDurationMinutes).toBe(376);
    expect(after.draft.completedAt).toBe(new Date(new Date(p.workout.start).getTime() + 50 * 60_000).toISOString());
    expect(after.draft.strengthData).toEqual(p.draft.strengthData);
    expect(after.draft.externalId).toBe(p.draft.externalId);
    expect(chosenDurationLine(after)).toBe('Duur 50 min (het bestand zegt 6 uur 16 min).');
    // The proposal it came from is not changed.
    expect(p.draft.durationMinutes).not.toBe(50);
  });

});

describe('migrateLogFileDuration', () => {
  it('houdt alleen een getal boven nul', async () => {
    const { migrateLogFileDuration } = await import('../storage/migrations');
    const base = { id: 'l', templateId: 't', completedDate: '2026-10-28', completedAt: '2026-10-28T10:00:00Z', durationMinutes: 60 } as unknown as SessionLog;
    expect(migrateLogFileDuration({ ...base, fileDurationMinutes: 376 } as SessionLog).fileDurationMinutes).toBe(376);
    expect('fileDurationMinutes' in migrateLogFileDuration({ ...base, fileDurationMinutes: 'zes uur' } as unknown as SessionLog)).toBe(false);
    expect('fileDurationMinutes' in migrateLogFileDuration({ ...base, fileDurationMinutes: Number.NaN } as SessionLog)).toBe(false);
  });
});
