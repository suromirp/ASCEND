import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';
import { adviceSessionIds, weekFixId, weekNotice, weekNoticeConcerns } from './weekFixProposal';
import type { CheckInput } from './weekValidator';

// De meldingen van een week komen direct, het voorstel pas op verzoek
// (docs/beslissingen/2026-10-28-voorstel-eindstand.md, punt C).
const { templates } = buildDefaultProgramData();
const MONDAY = '2026-10-26';
const lock = { by: 'proposal' as const, at: '2026-10-20T10:00:00.000Z' };
const FULL = ['tpl_long_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hills_descent', 'tpl_long_run'];
const sessions: PlannedSession[] = FULL.map((templateId, i) => ({ id: `w-${i}`, templateId, scheduledDate: addDays(MONDAY, i), weekStartDate: MONDAY, status: 'moved', order: i, lock }));
const input: CheckInput = { sessions, logs: [], templates, today: '2026-10-21', restDay: 4, goalDay: '2027-08-01' };

describe('weekNoticeConcerns', () => {
  it('geeft dezelfde meldingen als weekNotice, zonder voorstellen', () => {
    const quick = weekNoticeConcerns(input, MONDAY);
    const full = weekNotice(input, MONDAY, true);
    expect(quick.concerns.map((c) => c.key)).toEqual(full.concerns.map((c) => c.key));
    expect(quick.fixes).toEqual({});
    expect(Object.keys(full.fixes).length).toBeGreaterThan(0);
  });

  it('weet uit het id van een melding welk voorstel er bij hoort, zonder het uit te rekenen', () => {
    const full = weekNotice(input, MONDAY, true);
    for (const c of weekNoticeConcerns(input, MONDAY).concerns) {
      if (full.fixes[c.key]) expect(weekFixId(c, sessions)).toBe(full.fixes[c.key].id);
    }
  });

  it('telt mee wat Vandaag al dekt', () => {
    const quick = weekNoticeConcerns(input, MONDAY);
    const taken = adviceSessionIds([{ id: 'x', trigger: 'plan_update', ruleId: 'R', title: '', effect: '', why: '', priority: 1, proposal: { id: 'p', trigger: 'plan_check', issue: '', changes: [{ plannedSessionId: 'w-3', action: 'remove', reason: '', generatedBy: [] }], alternatives: [], consequences: '', explanation: '', createdAt: '' } }]);
    expect(weekNoticeConcerns(input, MONDAY, taken).covered.length).toBeGreaterThan(0);
    expect(quick.covered).toEqual([]);
  });

  it('kost een fractie van het voorstel, zodat het tekenen niet wacht', () => {
    weekNoticeConcerns(input, MONDAY);
    const t0 = performance.now();
    weekNoticeConcerns(input, MONDAY);
    const quick = performance.now() - t0;
    const t1 = performance.now();
    weekNotice(input, MONDAY, true);
    const full = performance.now() - t1;
    expect(quick).toBeLessThan(50);
    expect(quick).toBeLessThan(full);
  });
});
