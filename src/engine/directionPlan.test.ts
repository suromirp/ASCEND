import { describe, expect, it } from 'vitest';
import { baseMinutes, directionFactors, patternCounted, programDirection, waveBudgets, FACTOR_MAX } from './directionPlan';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

// Nagemaakte data.
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const pattern = ['tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_hill_intervals', 'tpl_long_run', 'tpl_herstel'].map(tpl);
const opts = { doubleHard: true };
const TODAY = '2026-11-02';
const run = (id: string, daysAgo: number, minutes: number): SessionLog => ({
  id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: addDays(TODAY, -daysAgo), completedAt: `${addDays(TODAY, -daysAgo)}T10:00:00.000Z`, variant: 'full', durationMinutes: minutes, source: 'manual', rpe: 4,
});

describe('patternCounted', () => {
  it('telt alleen duur, de heuvelloop dubbel, kracht en herstel niet', () => {
    const easy = baseMinutes(tpl('tpl_easy_run'))!;
    const hill = baseMinutes(tpl('tpl_hill_intervals'))!;
    const long = baseMinutes(tpl('tpl_long_run'))!;
    expect(patternCounted(pattern)).toBe(easy + hill * 2 + long);
    expect(patternCounted(pattern, false)).toBe(easy + hill + long);
  });
});

describe('waveBudgets', () => {
  it('Fit blijven: drie keer 150 en een lichtere vierde', () => {
    expect(waveBudgets({ id: 'maintain', settings: { directionStart: TODAY }, logs: [], today: TODAY, countOptions: opts })).toEqual([150, 150, 150, 100]);
  });

  it('Fitter worden: begint bij je eigen weken en groeit 10% per week', () => {
    const logs = [3, 10, 17, 24].map((d, i) => run(`r${i}`, d, 140));
    const b = waveBudgets({ id: 'improve', settings: { directionStart: TODAY }, logs, today: TODAY, countOptions: opts });
    expect(b[0]).toBe(140);
    expect(b[1]).toBe(155);
    expect(b[2]).toBe(170);
    expect(b[3]).toBeLessThan(b[2]);
  });

  it('Rustig aan: een vaste week', () => {
    expect(waveBudgets({ id: 'easy', settings: {}, logs: [], today: TODAY, countOptions: opts })).toEqual([90]);
  });

  it('je eigen weekbudget telt', () => {
    expect(waveBudgets({ id: 'maintain', settings: { weekBudget: { minutes: 180 }, directionStart: TODAY }, logs: [], today: TODAY, countOptions: opts })[0]).toBe(180);
  });
});

describe('directionFactors', () => {
  it('budget gedeeld door wat het patroon telt, begrensd', () => {
    expect(directionFactors([150, 100], 150)).toEqual([1, 0.67]);
    expect(directionFactors([600], 100)).toEqual([FACTOR_MAX]);
    expect(directionFactors([150], 0)).toBeUndefined();
  });
});

describe('programDirection', () => {
  it('geeft de richting met een factor per week', () => {
    const d = programDirection({ id: 'maintain', settings: { directionStart: TODAY }, pattern, logs: [], today: TODAY, countOptions: opts });
    expect(d.id).toBe('maintain');
    expect(d.factors).toHaveLength(4);
    expect(d.factors![3]).toBeLessThan(d.factors![0]);
  });
});
