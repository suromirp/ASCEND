import { describe, it, expect } from 'vitest';
import { buildSeasonPlan } from './seasonPlan';
import { layoutPhasesForGoal, PHASE_BASIS } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { PlannedSession } from '../models/training';

const { templates } = buildDefaultProgramData();
const program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: layoutPhasesForGoal('2026-09-28', '2027-08-01', { [PHASE_BASIS]: 4 })! };
const DAYS = ['tpl_herstel', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const planned: PlannedSession[] = Array.from({ length: 12 }, (_, w) => addDays('2026-09-28', w * 7)).flatMap((monday) =>
  DAYS.map((templateId, d) => ({ id: `${monday}-${d}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned' as const, order: d })));

describe('buildSeasonPlan', () => {
  it('one card per phase with its dates, the current one marked, and its weeks with the wave', () => {
    const plan = buildSeasonPlan(program, planned, [], templates, '2026-10-14');
    expect(plan.map((p) => p.name)).toEqual(['BASISFASE', 'OPBOUW', 'BERGCAPACITEIT', 'EXPEDITIEKLAAR', 'NAAR DE START']);
    expect(plan[0]).toMatchObject({ from: '2026-09-28', until: '2026-10-25', current: true });
    expect(plan[1].weeks.map((w) => w.waveLabel).slice(0, 4)).toEqual(['Wennen', 'Opbouw', 'Zwaarste week', 'Rustweek']);
    expect(plan[0].weeks[2]).toMatchObject({ number: 3, current: true });
    expect(plan[0].weeks[0].past).toBe(true);
  });

  it('says what changes: the long run growing, the Saturday sessions', () => {
    const opbouw = buildSeasonPlan(program, planned, [], templates, '2026-10-14')[1];
    expect(opbouw.changes.find((c) => c.startsWith('Lange duurloop'))).toMatch(/tot \d+ min/);
    expect(opbouw.changes).toContain('Zaterdag: heuvelintervallen');
    expect(opbouw.weeks[0].items.some((i) => i.kind === 'long' && i.label.startsWith('Lange duurloop'))).toBe(true);
  });
});

// I-58: in het jaaroverzicht telt een training ook op de dag van uitvoeren. De lange duurloop van zondag 4 oktober,
// gedaan op maandag 5 oktober, gaat van de ene week naar de andere.
describe('x van n per week op de dag van uitvoeren', () => {
  it('de week van de planning telt hem niet meer, de week van uitvoeren wel', () => {
    const lr = planned.find((s) => s.templateId === 'tpl_long_run' && s.scheduledDate === '2026-10-04')!;
    const log = { id: 'l', plannedSessionId: lr.id, templateId: lr.templateId, type: 'hiking' as const, completedDate: '2026-10-05', completedAt: '2026-10-05T10:00:00Z', variant: 'full' as const, durationMinutes: 90, source: 'manual' as const };
    const weeks = buildSeasonPlan(program, planned, [log], templates, '2026-10-20').flatMap((p) => p.weeks);
    const before = buildSeasonPlan(program, planned, [], templates, '2026-10-20').flatMap((p) => p.weeks);
    const at = (ws: typeof weeks, start: string) => ws.find((w) => w.weekStart === start)!.done!;
    expect(at(weeks, '2026-09-28')).toEqual({ done: 0, planned: at(before, '2026-09-28').planned - 1 });
    expect(at(weeks, '2026-10-05')).toEqual({ done: 1, planned: at(before, '2026-10-05').planned + 1 });
  });
});
