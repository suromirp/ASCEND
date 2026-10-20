import { describe, it, expect } from 'vitest';
import { declinedRules, indexChecks, learnFromDeclines, DECLINED_NOTE, type StoredResponse } from './learning';
import type { Advice } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';

const TODAY = '2026-10-21';
const r = (ruleId: string, response: StoredResponse['response'], at: string): StoredResponse => ({ ruleId, response, at: `${at}T09:00:00Z` });

describe('proposals you turn down', () => {
  it('a rule declined twice in a row in six weeks goes quiet; one yes in between, or long ago, not', () => {
    const quiet = declinedRules({
      a: r('REST-PULL', 'declined', '2026-10-01'), b: r('REST-PULL', 'declined', '2026-10-15'),
      c: r('MISSED-CATCH-UP', 'declined', '2026-10-01'), d: r('MISSED-CATCH-UP', 'accepted', '2026-10-10'),
      e: r('LIGHT-TWICE', 'declined', '2026-07-01'), f: r('LIGHT-TWICE', 'declined', '2026-07-08'),
      g: r('MORNING-CHECK', 'declined', '2026-10-01'), h: r('MORNING-CHECK', 'declined', '2026-10-02'),
      i: { response: 'declined', at: '2026-10-02T09:00:00Z' },
    }, TODAY);
    expect([...quiet]).toEqual(['REST-PULL']);
  });

  it('moves that kind of advice to the end and says why, without hiding it', () => {
    const advice = [{ id: '1', ruleId: 'REST-PULL', priority: 3, why: 'Reden.' }, { id: '2', ruleId: 'LIGHT-TWICE', priority: 1, why: 'Ook.' }] as Advice[];
    const out = learnFromDeclines(advice, new Set(['REST-PULL']));
    expect(out.map((a) => a.id)).toEqual(['2', '1']);
    expect(out[1].why).toContain(DECLINED_NOTE);
  });
});

describe('the index against your legs', () => {
  const { templates } = buildDefaultProgramData();
  const type = (id: string) => templates.find((t) => t.id === id)!.type;
  let n = 0;
  const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
    id: `l${n++}`, templateId, type: type(templateId), completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
  });

  it('agrees on fresh legs after rest, and flags heavy legs the index called fresh', () => {
    const checks = indexChecks([
      log('tpl_test_run', '2026-10-10', 30, { legsAtStart: 'fris' }),
      log('tpl_tempo_run', '2026-10-20', 40, { legsAtStart: 'zwaar' }),
    ], templates);
    expect(checks).toHaveLength(2);
    expect(checks.find((c) => c.date === '2026-10-10')!.agrees).toBe(true);
    const tempo = checks.find((c) => c.date === '2026-10-20')!;
    expect(tempo.indexTooLow).toBe(true);
    expect(tempo.agrees).toBe(false);
  });

  it('heavy legs the day after a hard leg day agree with the index', () => {
    const checks = indexChecks([log('tpl_lower_a', '2026-10-19', 70, { rpe: 9 }), log('tpl_tempo_run', '2026-10-20', 40, { legsAtStart: 'zwaar' })], templates);
    expect(checks[0].agrees).toBe(true);
  });
});
