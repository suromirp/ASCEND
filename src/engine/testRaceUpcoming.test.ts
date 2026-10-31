import { describe, it, expect } from 'vitest';
import { hasTestOrRaceThatDay, nextTestOrRace, testOrRaceKind } from './testRaceUpcoming';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionTemplate } from '../models/training';

const { templates } = buildDefaultProgramData();
const ps = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-10-19', status: 'planned', order: 0, ...extra,
});

describe('nextTestOrRace', () => {
  const sessions = [ps('a', 'tpl_easy_run', '2026-10-23'), ps('t', 'tpl_test_run', '2026-10-28'), ps('r', 'tpl_race', '2026-11-02')];

  it('vindt de eerstvolgende test of wedstrijd binnen twee weken', () => {
    expect(nextTestOrRace(sessions, [], '2026-10-22', templates)).toMatchObject({ kind: 'test', session: { id: 't' } });
  });

  it('slaat een overgeslagen of al gelopen test over', () => {
    expect(nextTestOrRace([ps('t', 'tpl_test_run', '2026-10-28', { status: 'skipped' }), sessions[2]], [], '2026-10-22', templates)).toMatchObject({ kind: 'race' });
    expect(nextTestOrRace(sessions, [{ plannedSessionId: 't' }], '2026-10-22', templates)).toMatchObject({ kind: 'race' });
  });

  it('kijkt naar de rol op het sjabloon, niet naar het id', () => {
    const custom: SessionTemplate = { ...templates.find((t) => t.id === 'tpl_easy_run')!, id: 'mijn_proef', roles: ['test'] };
    expect(nextTestOrRace([ps('x', 'mijn_proef', '2026-10-25')], [], '2026-10-22', [...templates, custom])).toMatchObject({ kind: 'test' });
    expect(testOrRaceKind('mijn_proef', [...templates, { ...custom, roles: ['race'] }])).toBe('race');
  });

  it('geeft niets terug zonder test of wedstrijd in de buurt', () => {
    expect(nextTestOrRace(sessions, [], '2026-10-01', templates)).toBeUndefined();
  });
});

describe('hasTestOrRaceThatDay', () => {
  it('telt een test die vervalt niet mee', () => {
    expect(hasTestOrRaceThatDay([{ templateId: 'tpl_test_run' }], templates)).toBe(true);
    expect(hasTestOrRaceThatDay([{ templateId: 'tpl_test_run', change: 'vervalt' }, { templateId: 'tpl_easy_run' }], templates)).toBe(false);
  });
});
