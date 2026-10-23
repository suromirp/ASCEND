import { describe, it, expect } from 'vitest';
import { diffHorizon } from './horizonChange';
import { applyPlanChangeItems } from './proposalEngine';
import type { PlannedSession, SessionTemplate } from '../models/training';

// Een andere doeldatum of planningsinstelling wordt een voorstel: wat de
// planningsronde zou doen, als regels die het voorstel laat zien.

const TODAY = '2026-10-21';
const tpl = (id: string, name: string): SessionTemplate => ({ id, name, type: 'hiking', durationVariants: { full: 60, short: 30 } } as SessionTemplate);
const templates = [tpl('tpl_long_run', 'Lange duurloop'), tpl('tpl_mountain_hike', 'Bergtocht'), tpl('tpl_easy_run', 'Rustige duurloop')];
const s = (id: string, templateId: string, date: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-10-19', status: 'planned', order: 0, ...over });

describe('diffHorizon', () => {
  it('geeft wat verschuift, wat een andere training wordt, wat vervalt en wat erbij komt', () => {
    const before = [
      s('a', 'tpl_long_run', '2026-10-25'),
      s('b', 'tpl_easy_run', '2026-10-22'),
      s('c', 'tpl_easy_run', '2027-02-02'),
      s('past', 'tpl_easy_run', '2026-10-20'),
    ];
    const after = [
      { ...before[0], templateId: 'tpl_mountain_hike' },
      { ...before[1], scheduledDate: '2026-10-23' },
      before[3],
      s('n', 'tpl_easy_run', '2026-11-03'),
    ];
    const diff = diffHorizon({ before, after, logs: [], templates, today: TODAY, goalDay: '2027-01-15', reason: 'Volgt je nieuwe doeldatum.' });
    expect(diff.counts).toEqual({ moved: 1, changed: 1, added: 1, removed: 1 });
    const byId = new Map(diff.items.map((i) => [i.plannedSessionId ?? 'new', i]));
    expect(byId.get('a')).toMatchObject({ action: 'move', templateId: 'tpl_mountain_hike', restore: true, fromDate: '2026-10-25', toDate: '2026-10-25' });
    expect(byId.get('b')).toMatchObject({ action: 'move', toDate: '2026-10-23', restore: true });
    expect(byId.get('c')).toMatchObject({ action: 'remove', discard: true, restore: true });
    expect(byId.get('c')?.reason).toContain('hoofddoel');
    expect(byId.get('new')).toMatchObject({ action: 'add', restore: true, newSessionDraft: { templateId: 'tpl_easy_run', scheduledDate: '2026-11-03' } });
    expect(byId.has('past')).toBe(false);
    expect(diff.consequences).toContain('1 training vervalt');

    // Toegepast geeft het precies de planning na de ronde, zonder slot.
    const applied = applyPlanChangeItems(diff.items, before, () => 'n2', { by: 'proposal', at: 'x' }).sessions;
    expect(applied.find((x) => x.id === 'a')).toMatchObject({ templateId: 'tpl_mountain_hike', status: 'planned' });
    expect(applied.find((x) => x.id === 'a')?.lock).toBeUndefined();
    expect(applied.some((x) => x.id === 'c')).toBe(false);
  });

  it('noemt wat jij vastzette en na de nieuwe doeldag blijft staan', () => {
    const mine = s('mine', 'tpl_easy_run', '2027-03-01', { lock: { by: 'user', at: '' } });
    const diff = diffHorizon({ before: [mine], after: [mine], logs: [], templates, today: TODAY, goalDay: '2027-01-15', reason: '' });
    expect(diff.items).toEqual([]);
    expect(diff.notes[0]).toContain('Rustige duurloop');
    expect(diff.notes[0]).toContain('zelf');
  });

  it('laat gelogde trainingen buiten beschouwing', () => {
    const done = s('done', 'tpl_easy_run', '2026-10-21');
    const diff = diffHorizon({ before: [done], after: [], logs: [{ plannedSessionId: 'done' }], templates, today: TODAY, reason: '' });
    expect(diff.items).toEqual([]);
  });
});
