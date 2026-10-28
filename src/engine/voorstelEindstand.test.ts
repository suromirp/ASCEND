import { describe, it, expect, afterEach } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyPlanChangeItems } from './proposalEngine';
import { setFreshnessContext } from './scheduler';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-28';
const row = (id: string, templateId: string, scheduledDate: string, weekStartDate: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0, ...extra });
const testLog = (): SessionLog => ({
  id: 'log-test', plannedSessionId: 'p-tue', templateId: 'tpl_test_run', type: 'cardio', completedDate: '2026-10-27', completedAt: '2026-10-27T10:00:00Z', variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 4, stoppedSec: 136 },
} as SessionLog);
// Nagemaakte week: Benen A staat vast op do 29 oktober, de lange duurloop op zo 1 november.
const week = (): PlannedSession[] => [
  row('p-tue', 'tpl_test_run', '2026-10-27', '2026-10-26'),
  row('p-thu', 'tpl_lower_a', '2026-10-29', '2026-10-26', { lock: { by: 'user', at: '2026-10-20T10:00:00Z' } }),
  row('p-sat', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
  row('p-sun', 'tpl_long_run', '2026-11-01', '2026-10-26'),
  row('p-mon', 'tpl_herstel', '2026-11-02', '2026-11-02'),
  row('p-thu2', 'tpl_easy_run', '2026-11-05', '2026-11-02'),
];
const inputs = (plannedSessions: PlannedSession[], restDay?: number): AdviceInputs => ({
  logs: [testLog()], plannedSessions, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: TODAY,
  ...(restDay ? { extraSession: { restDay } as never } : {}),
});

afterEach(() => setFreshnessContext(undefined));

describe('TEST-RETRY toetst zijn eigen eindstand', () => {
  for (const restDay of [undefined, 4]) {
    it(`rustdag ${restDay ?? 'standaard'}: na Akkoord geen nieuw advies over de geraakte sessies`, () => {
      const before = computeAdvice(inputs(week(), restDay));
      const retry = before.find((a) => a.ruleId === 'TEST-RETRY');
      const knownIds = new Set(before.map((a) => a.id));
      const proposals = retry ? [retry.proposal!, ...(retry.options?.map((o) => o.proposal) ?? [])] : [];
      for (const p of proposals) {
        const after = applyPlanChangeItems(p.changes, week(), undefined, { by: 'proposal', proposalId: p.id, at: `${TODAY}T08:00:00Z` }).sessions;
        const touched = new Set(p.changes.map((c) => c.plannedSessionId));
        const fresh = computeAdvice(inputs(after, restDay)).filter((a) => !knownIds.has(a.id) && [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])].some((q) => q?.changes.some((c) => touched.has(c.plannedSessionId!))));
        expect(fresh.map((a) => `${a.ruleId} ${a.title}`)).toEqual([]);
      }
    });
  }

  it('de lange duurloop en Benen A op twee dagen achter elkaar geven geen advies, net als in de planning', () => {
    const old = week().map((s) => (s.id === 'p-sun' ? { ...s, scheduledDate: '2026-11-02', weekStartDate: '2026-11-02' } : s.id === 'p-thu' ? { ...s, scheduledDate: '2026-11-03', weekStartDate: '2026-11-02' } : s.id === 'p-mon' ? { ...s, status: 'skipped' as const } : s));
    const fresh = computeAdvice(inputs(old)).filter((a) => a.ruleId === 'SAME-MUSCLE-SPACING');
    expect(fresh).toEqual([]);
  });
});
