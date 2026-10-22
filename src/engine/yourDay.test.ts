import { describe, it, expect } from 'vitest';
import { tomorrowEntry, tomorrowText, trainingRowState } from './yourDay';
import { deriveSessionStatus } from './sessionStatus';
import { todayISO } from '../utils/dates';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';

const { templates, program } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const ps = (id: string, templateId: string, date: string, status: PlannedSession['status'] = 'planned', order = 0): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status, order,
});

describe('tomorrowEntry', () => {
  it('geeft de training van morgen met zijn duur', () => {
    const e = tomorrowEntry('2026-11-04', [ps('a', 'tpl_upper_b', '2026-11-05')], byId, program);
    expect(e.kind).toBe('training');
    expect(e.name).toBe('Bovenlichaam B');
    expect(tomorrowText(e)).toMatch(/^Bovenlichaam B, \d+ min$/);
  });

  it('een rustdag is er alleen als er niets anders is', () => {
    expect(tomorrowEntry('2026-11-04', [ps('a', 'tpl_herstel', '2026-11-05')], byId, program).kind).toBe('rest');
    const both = tomorrowEntry('2026-11-04', [ps('a', 'tpl_herstel', '2026-11-05'), ps('b', 'tpl_easy_run', '2026-11-05', 'planned', 1)], byId, program);
    expect(both.kind).toBe('training');
  });

  it('wat is overgeslagen telt niet mee; niets gepland zegt dat', () => {
    const e = tomorrowEntry('2026-11-04', [ps('a', 'tpl_easy_run', '2026-11-05', 'skipped'), ps('b', 'tpl_easy_run', '2026-11-06')], byId, program);
    expect(e.kind).toBe('none');
    expect(tomorrowText(e)).toBe('Niets gepland');
    expect(tomorrowText({ kind: 'rest' })).toBe('Rustdag, wandelen mag');
  });
});

describe('trainingRowState', () => {
  it('een overgeslagen training van vandaag ziet er niet uit als nog te doen', () => {
    const skipped = ps('a', 'tpl_easy_run', todayISO(), 'skipped');
    expect(trainingRowState(deriveSessionStatus(skipped, []).status, false)).toBe('skipped');
    // Ook als het de training zou zijn die nu aan de beurt is.
    expect(trainingRowState(deriveSessionStatus(skipped, []).status, true)).toBe('skipped');
  });

  it('gedaan, nu en nog te doen', () => {
    expect(trainingRowState('completed', true)).toBe('done');
    expect(trainingRowState('today', true)).toBe('now');
    expect(trainingRowState('today', false)).toBe('todo');
    expect(trainingRowState('planned', false)).toBe('todo');
  });
});
