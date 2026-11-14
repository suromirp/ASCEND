import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { Program } from '../models/program';
import type { SessionLog } from '../models/training';
import { isShortTraining } from './shortTraining';
import { resolveEffectiveFullDuration } from './substitutions';

const { templates } = buildDefaultProgramData();
const t = (id: string) => templates.find((x) => x.id === id)!;
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 }] };
const DATE = '2026-09-29';
const log = (extra: Partial<SessionLog>): SessionLog => ({ id: 'l', templateId: 'x', type: 'cardio', completedDate: DATE, completedAt: `${DATE}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...extra });

describe('isShortTraining: de grens van de helft', () => {
  it('duur: precies de helft is niet kort, net eronder wel', () => {
    const run = t('tpl_easy_run');
    const planned = resolveEffectiveFullDuration(run, DATE, program);
    expect(planned % 2).toBe(0);
    expect(isShortTraining(log({ durationMinutes: planned / 2 }), run, program)).toBe(false);
    expect(isShortTraining(log({ durationMinutes: planned / 2 - 1 }), run, program)).toBe(true);
  });
  it('werksets: precies de helft is niet kort, één minder wel', () => {
    const upper = t('tpl_upper_a');
    const planned = upper.exercises!.reduce((n, e) => n + e.sets, 0);
    const sets = (n: number) => [{ exerciseId: upper.exercises![0].id, exerciseName: 'x', sets: Array.from({ length: n }, () => ({ reps: 8, weightKg: 20 })) }];
    const minutes = resolveEffectiveFullDuration(upper, DATE, program);
    expect(isShortTraining(log({ type: 'strength', durationMinutes: minutes, strengthData: sets(Math.ceil(planned / 2)) }), upper, program)).toBe(false);
    expect(isShortTraining(log({ type: 'strength', durationMinutes: minutes, strengthData: sets(Math.ceil(planned / 2) - 1) }), upper, program)).toBe(true);
  });
  it('een log zonder werksets of zonder duur is nooit kort', () => {
    const upper = t('tpl_upper_a');
    expect(isShortTraining(log({ type: 'strength', durationMinutes: 0 }), upper, program)).toBe(false);
    expect(isShortTraining(log({ durationMinutes: undefined as unknown as number }), t('tpl_easy_run'), program)).toBe(false);
  });
});
