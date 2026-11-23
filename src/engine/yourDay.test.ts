import { describe, it, expect } from 'vitest';
import { tomorrowEntry, tomorrowText, trainingRowState } from './yourDay';
import { deriveSessionStatus } from './sessionStatus';
import { todayISO } from '../utils/dates';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';

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

// De Morgen-regel leest het dagbeeld (engine/dayPlan.ts), zoals de balk: een training van morgen die je vandaag al
// deed, staat er niet meer (Lookout, 23 november; nagemaakt).
const logOn = (s: PlannedSession, completedDate: string): SessionLog => ({
  id: `log-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: byId.get(s.templateId)!.type, completedDate, completedAt: `${completedDate}T07:00:00Z`, variant: 'full', durationMinutes: 45, source: 'manual',
} as SessionLog);

describe('tomorrowEntry uit het dagbeeld', () => {
  it('de training van morgen die vandaag gelogd is, noemt de Morgen-regel niet; een vrije dag zegt Niets gepland', () => {
    const upper = ps('a', 'tpl_upper_a', '2026-11-05');
    const e = tomorrowEntry('2026-11-04', [upper], byId, program, [logOn(upper, '2026-11-04')]);
    expect(e.kind).toBe('none');
    expect(tomorrowText(e)).toBe('Niets gepland');
    // Zonder log blijft hij gewoon morgen.
    expect(tomorrowEntry('2026-11-04', [upper], byId, program, []).name).toBe('Bovenlichaam A');
  });

  it('met een tweede training morgen noemt hij die, en een rustdag blijft een rustdag', () => {
    const upper = ps('a', 'tpl_upper_a', '2026-11-05');
    const run = ps('b', 'tpl_easy_run', '2026-11-05', 'planned', 1);
    expect(tomorrowEntry('2026-11-04', [upper, run], byId, program, [logOn(upper, '2026-11-04')]).name).toBe(byId.get('tpl_easy_run')!.name);
    const rest = ps('r', 'tpl_herstel', '2026-11-05', 'planned', 1);
    expect(tomorrowEntry('2026-11-04', [upper, rest], byId, program, [logOn(upper, '2026-11-04')]).kind).toBe('rest');
  });

  it('over de weekgrens: zondag kijkt naar maandag, ook wat je zondag al deed', () => {
    const monday = ps('m', 'tpl_upper_a', '2026-11-09');
    expect(tomorrowEntry('2026-11-08', [monday], byId, program, []).name).toBe('Bovenlichaam A');
    expect(tomorrowEntry('2026-11-08', [monday], byId, program, [logOn(monday, '2026-11-08')]).kind).toBe('none');
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
