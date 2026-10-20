import { describe, it, expect } from 'vitest';
import { previewProposal } from './proposalPreview';
import { prescriptionSummary } from './changeImpact';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import type { PlanChangeItem } from '../models/planChange';

const { templates } = buildDefaultProgramData();
const s = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-10-26', status: 'planned', order: 0 });
const week = [s('a', 'tpl_upper_a', '2026-10-27'), s('b', 'tpl_lower_a', '2026-10-28'), s('t', 'tpl_test_run', '2026-10-29'), s('r', 'tpl_herstel', '2026-10-29'), s('c', 'tpl_upper_b', '2026-10-30')];

describe('the week as a proposal would leave it', () => {
  it('marks the moved test: away from Thursday, here on Tuesday, the rest unchanged; one summary line', () => {
    const move: PlanChangeItem = { plannedSessionId: 't', action: 'move', fromDate: '2026-10-29', toDate: '2026-10-27', reason: '', generatedBy: ['x'] };
    const { moves, weeks: [w] } = previewProposal([move], week, templates);
    expect(moves).toEqual([{ name: 'Testloop 5 km', action: 'move', from: '2026-10-29', to: '2026-10-27' }]);
    expect(w.weekStart).toBe('2026-10-26');
    const day = (d: string) => w.days.find((x) => x.date === d)!;
    expect(day('2026-10-27').entries.map((e) => [e.name, e.change])).toEqual([['Bovenlichaam A', undefined], ['Testloop 5 km', 'hierheen']]);
    expect(day('2026-10-29').entries.find((e) => e.name === 'Testloop 5 km')).toMatchObject({ change: 'weg', otherDate: '2026-10-27' });
    expect(day('2026-10-29').entries.some((e) => e.type === 'recovery' && !e.change)).toBe(true);
    expect(day('2026-10-28').changed).toBe(false);
    // Nothing was saved or changed in the input.
    expect(week.find((x) => x.id === 't')!.scheduledDate).toBe('2026-10-29');
  });

  it('shows a removal struck through, and nothing for content-only changes', () => {
    const remove: PlanChangeItem = { plannedSessionId: 'c', action: 'remove', reason: '', generatedBy: ['x'] };
    const { moves, weeks: [w] } = previewProposal([remove], week, templates);
    expect(moves).toEqual([{ name: 'Bovenlichaam B', action: 'remove', from: '2026-10-30' }]);
    expect(w.days.find((d) => d.date === '2026-10-30')!.entries).toEqual([{ name: 'Bovenlichaam B', type: 'strength', change: 'vervalt' }]);
    expect(previewProposal([{ plannedSessionId: 'c', action: 'replace', reason: '', generatedBy: ['x'] }], week, templates).weeks).toEqual([]);
  });
});

describe('the notice after the weekly prescription', () => {
  const item = (action: PlanChangeItem['action']): PlanChangeItem => ({ action, reason: '', generatedBy: ['x'] });
  it('does not call content adjustments "85 sessies aangepast"', () => {
    expect(prescriptionSummary(Array.from({ length: 85 }, () => item('replace')))).toBe('De inhoud van 85 trainingen in de komende weken bijgesteld');
    expect(prescriptionSummary([item('remove'), item('replace'), item('replace')])).toBe('1 training verplaatst, toegevoegd of vervallen, de inhoud van 2 trainingen in de komende weken bijgesteld');
  });
});
