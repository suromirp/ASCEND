import { describe, it, expect, afterEach } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyPlanChangeItems } from './proposalEngine';
import { planPass } from './planPass';
import { setFreshnessContext } from './scheduler';
import { addDays } from '../utils/dates';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const lockProposal = { by: 'proposal' as const, at: '2026-10-28T08:00:00Z' };
const lockUser = { by: 'user' as const, at: '2026-10-20T08:00:00Z' };

// Nagemaakte test van di 27 oktober met 136 seconden stilstand in 4 stops.
const testLog = (): SessionLog => ({
  id: 'log-test', templateId: 'tpl_test_run', type: 'cardio', completedDate: '2026-10-27', completedAt: '2026-10-27T10:00:00Z', variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 4, stoppedSec: 136 },
} as SessionLog);
const planned = (id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 });
const inputs = (plannedSessions: PlannedSession[], over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: [testLog()], plannedSessions, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-10-28', ...over,
});
const retryOf = (sessions: PlannedSession[], over: Partial<AdviceInputs> = {}) => computeAdvice(inputs(sessions, over)).find((a) => a.ruleId === 'TEST-RETRY');

// Nagemaakte week van de eigenaar: de rustdag (ma 2 november) is de herstelwandeling, de rest van de week is vol.
const ownerWeek = (over: Record<string, Partial<PlannedSession>> = {}): PlannedSession[] => [
  planned('upA', 'tpl_upper_a', '2026-10-28', '2026-10-26'),
  planned('legs', 'tpl_lower_a', '2026-10-29', '2026-10-26'),
  planned('upB', 'tpl_upper_b', '2026-10-30', '2026-10-26'),
  planned('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
  planned('long', 'tpl_long_run', '2026-11-01', '2026-10-26'),
  planned('walk', 'tpl_herstel', '2026-11-02', '2026-11-02'),
  planned('upA2', 'tpl_upper_a', '2026-11-03', '2026-11-02'),
  planned('legs2', 'tpl_lower_a', '2026-11-04', '2026-11-02'),
  planned('easy', 'tpl_easy_run', '2026-11-05', '2026-11-02'),
  planned('upB2', 'tpl_upper_b', '2026-11-06', '2026-11-02'),
  planned('sprints', 'tpl_hills_descent', '2026-11-07', '2026-11-02'),
  planned('long2', 'tpl_long_run', '2026-11-08', '2026-11-02'),
].map((s) => ({ ...s, ...(over[s.id] ?? {}) }));

const trainedDays = (list: PlannedSession[], monday: string) => {
  const typeOf = (s: PlannedSession) => templates.find((t) => t.id === s.templateId)?.type;
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return new Set(list.filter((s) => s.status !== 'skipped' && typeOf(s) !== 'recovery' && week.includes(s.scheduledDate)).map((s) => s.scheduledDate)).size;
};

afterEach(() => setFreshnessContext(undefined));

describe('TEST-RETRY neemt de rustdag van een week alleen in als die week een andere krijgt', () => {
  it('laat de rustige duurloop vervallen als de lange duurloop op de rustdag moet', () => {
    const a = retryOf(ownerWeek())!;
    expect(a).toBeDefined();
    const ch = a.proposal!.changes;
    expect(ch.find((c) => c.plannedSessionId === 'long')).toMatchObject({ action: 'move', toDate: '2026-11-02' });
    expect(ch.find((c) => c.plannedSessionId === 'easy')?.action).toBe('remove');
    expect(a.effect).toContain('Rustige duurloop van do 5 november vervalt: dat wordt je rustdag.');
    expect(a.effect).not.toMatch(/[–—]/);
  });

  for (const [name, setContext] of [
    ['zonder frisheidscontext', () => setFreshnessContext(undefined)],
    ['met frisheidscontext zoals de app', () => setFreshnessContext({ today: '2026-10-28', bodyKg: 86, minutesOf: (_s, t) => t.durationVariants.full })],
  ] as const) {
    it(`simulatie ${name}: na Akkoord een rustdag, geen REST-DAY-bevinding en geen herstelling`, () => {
      setContext();
      const a = retryOf(ownerWeek())!;
      const applied = applyPlanChangeItems(a.proposal!.changes, ownerWeek(), undefined, lockProposal).sessions;
      expect(trainedDays(applied, '2026-11-02')).toBeLessThanOrEqual(6);
      const pass = planPass(applied, { today: '2026-10-28', logs: [testLog()], templates, program: null, blocks: [], restDay: 1, newId: () => 'new' });
      expect(pass.repairs).toEqual([]);
      const key = (list: PlannedSession[]) => list.map((s) => `${s.id}:${s.scheduledDate}:${s.status}`).sort();
      expect(key(pass.sessions)).toEqual(key(applied));
      expect(trainedDays(pass.sessions, '2026-11-02')).toBeLessThanOrEqual(6);
    });
  }

  it('laat de lange duurloop deze keer vervallen als er geen lichte training te schrappen is', () => {
    // Alles van de week erna is van jou of zwaar: er is niets lichts dat de rustdag kan teruggeven.
    const a = retryOf(ownerWeek({ easy: { lock: lockUser }, upB2: { lock: lockUser }, upA2: { lock: lockUser } }))!;
    expect(a).toBeDefined();
    const ch = a.proposal!.changes;
    expect(ch.find((c) => c.plannedSessionId === 'long')?.action).toBe('remove');
    expect(ch.find((c) => c.plannedSessionId === 'walk')).toBeUndefined();
    expect(a.effect).toContain('Lange duurloop van zo 1 november vervalt deze keer: zo houd je die week een rustdag.');
  });

  it('laat de lange duurloop gewoon schuiven als de week een andere rustdag houdt', () => {
    const sessions = ownerWeek().filter((s) => s.id !== 'easy');
    const a = retryOf(sessions)!;
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'long')).toMatchObject({ action: 'move' });
    expect(a.proposal!.changes.some((c) => c.action === 'remove' && c.plannedSessionId !== 'legs' && c.plannedSessionId !== 'walk')).toBe(false);
  });
});
