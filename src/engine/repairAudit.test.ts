import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { planCheckRecord, repairAuditItems } from './repairAudit';

// Nagemaakte rijen; alleen de sjablonen komen uit het standaardprogramma.
const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const row = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-11-09', status: 'planned', order: 0, ...extra,
});

describe('repairAuditItems', () => {
  it('een andere soort: de wijziging met het nieuwe sjabloon en de minuten ervoor en erna', () => {
    const before = new Map([['a', row('a', 'tpl_hill_intervals', '2026-11-14')]]);
    const after = new Map([['a', row('a', 'tpl_easy_run', '2026-11-14')]]);
    const items = repairAuditItems({ ids: ['a'], before, after, templates: byId, program: null, reasonOf: () => 'een harde training minder' });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ plannedSessionId: 'a', action: 'move', fromDate: '2026-11-14', toDate: '2026-11-14', templateId: 'tpl_easy_run', reason: 'een harde training minder' });
    expect(typeof items[0].fromMinutes).toBe('number');
    expect(typeof items[0].toMinutes).toBe('number');
  });

  it('een andere lengte: zonder sjabloon, met de minuten', () => {
    const before = new Map([['b', row('b', 'tpl_easy_run', '2026-11-12')]]);
    const after = new Map([['b', row('b', 'tpl_easy_run', '2026-11-12', { plannedMinutes: 20 })]]);
    const [item] = repairAuditItems({ ids: ['b'], before, after, templates: byId, program: null });
    expect(item.templateId).toBeUndefined();
    expect(item.toMinutes).toBe(20);
    expect(item.fromMinutes).not.toBe(20);
  });

  it('alleen een andere dag, erbij, eruit of overgeslagen: geen regel', () => {
    const before = new Map([['c', row('c', 'tpl_easy_run', '2026-11-12')], ['d', row('d', 'tpl_easy_run', '2026-11-13')]]);
    const after = new Map([['c', row('c', 'tpl_easy_run', '2026-11-15')], ['d', row('d', 'tpl_long_run', '2026-11-13', { status: 'skipped' })], ['e', row('e', 'tpl_easy_run', '2026-11-16')]]);
    expect(repairAuditItems({ ids: ['c', 'd', 'e'], before, after, templates: byId, program: null })).toEqual([]);
  });
});

describe('planCheckRecord', () => {
  it('al beslist, met de regels als gevolg en de wijzigingen erin', () => {
    const before = new Map([['a', row('a', 'tpl_hill_intervals', '2026-11-14')]]);
    const after = new Map([['a', row('a', 'tpl_easy_run', '2026-11-14')]]);
    const items = repairAuditItems({ ids: ['a'], before, after, templates: byId, program: null });
    const record = planCheckRecord({ lines: ['Heuvelintervallen: aangepast', 'Rustige duurloop: verplaatst'], items }, 'r1', '2026-11-23T08:00:00.000Z');
    expect(record).toMatchObject({ id: 'r1', trigger: 'plan_check', resolution: 'accepted', consequences: 'Heuvelintervallen: aangepast; Rustige duurloop: verplaatst' });
    expect(record.changes).toEqual(items);
    // Zonder wijzigingen in duur of soort: een leeg record, zoals voorheen.
    expect(planCheckRecord({ lines: ['x'] }, 'r2', '2026-11-23T08:00:00.000Z').changes).toEqual([]);
  });
});
