import { describe, it, expect, afterEach } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyPlanChangeItems } from './proposalEngine';
import { planPass } from './planPass';
import { setFreshnessContext } from './scheduler';
import { moveLegNote } from './legDayEase';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const lockUser = { by: 'user' as const, at: '2026-10-20T08:00:00Z' };
const lockProposal = { by: 'proposal' as const, at: '2026-10-28T08:00:00Z' };

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

// Standaardweek: wo Bovenlichaam A, do Benen A, vr Bovenlichaam B, za Heuvelintervallen, zo Lange duurloop,
// ma Herstelwandeling (rustdag), di Bovenlichaam A, wo Benen A.
const standard = (legsLock?: typeof lockUser): PlannedSession[] => [
  planned('upA', 'tpl_upper_a', '2026-10-28', '2026-10-26'),
  { ...planned('legs', 'tpl_lower_a', '2026-10-29', '2026-10-26'), lock: legsLock },
  planned('upB', 'tpl_upper_b', '2026-10-30', '2026-10-26'),
  planned('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
  planned('long', 'tpl_long_run', '2026-11-01', '2026-10-26'),
  planned('walk', 'tpl_herstel', '2026-11-02', '2026-11-02'),
  planned('upA2', 'tpl_upper_a', '2026-11-03', '2026-11-02'),
  planned('legs2', 'tpl_lower_a', '2026-11-04', '2026-11-02'),
];

afterEach(() => setFreshnessContext(undefined));

// Zondag 1 november is leeg: daar kan Benen A heen.
const sundayFree = (legsLock?: typeof lockUser) => standard(legsLock).filter((x) => !['long', 'walk', 'upA2', 'legs2'].includes(x.id));
const strip = (list: PlannedSession[]) => list.map((x) => ({ id: x.id, t: x.templateId, d: x.scheduledDate, st: x.status })).sort((x, y) => x.id.localeCompare(y.id));

const contexts = [
  ['zonder frisheidscontext', () => setFreshnessContext(undefined)],
  ['met frisheidscontext zoals de app', () => setFreshnessContext({ today: '2026-10-28', bodyKg: 86, minutesOf: (_s, t) => t.durationVariants.full })],
] as const;

describe('TEST-RETRY: eerst verschuiven, dan pas laten vervallen', () => {
  it('verschuift een beendag van het systeem naar na de test in plaats van hem te laten vervallen', () => {
    const a = retryOf(sundayFree())!;
    const legs = a.proposal!.changes.find((c) => c.plannedSessionId === 'legs')!;
    expect(legs).toMatchObject({ action: 'move', fromDate: '2026-10-29', toDate: '2026-11-01' });
    expect(a.proposal!.changes.some((c) => c.action === 'remove')).toBe(false);
    expect(a.effect).toContain('Benen A (zwaar) van do 29 oktober gaat naar zo 1 november, na de test.');
    expect(a.effect).not.toContain('laat je');
    expect(a.options).toBeUndefined();
  });

  it('biedt een door jou vastgezette beendag eerst een verschuiving aan, met naam, en laten vervallen als tweede optie', () => {
    const a = retryOf(sundayFree(lockUser))!;
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'legs')).toMatchObject({ action: 'move', toDate: '2026-11-01' });
    expect(a.effect).toContain('Benen A (zwaar) van do 29 oktober, die je zelf vastzette, gaat naar zo 1 november, na de test.');
    expect(a.options).toHaveLength(2);
    expect(a.options![0].proposal.changes.find((c) => c.plannedSessionId === 'legs')!.action).toBe('move');
    expect(a.options![1].proposal.changes.find((c) => c.plannedSessionId === 'legs')!.action).toBe('remove');
    expect(a.options![1].effect).toContain('Benen A (zwaar) van do 29 oktober, die je zelf vastzette, laat je deze week gaan, zodat je benen zaterdag fris zijn.');
    expect(`${a.effect}${a.options![1].effect}`).not.toMatch(/[\u2013\u2014]/);
  });

  it('laat een vastgezette beendag alleen vervallen als hij nergens heen kan, en zwaarder dan een systeemdag', () => {
    const stuck = retryOf(standard(lockUser))!;
    expect(stuck.proposal!.changes.find((c) => c.plannedSessionId === 'legs')!.action).toBe('remove');
    expect(stuck.options).toBeUndefined();
  });

  for (const [name, setContext] of contexts) {
    for (const [lockName, legsLock, sessions] of [['zonder lock', undefined, standard], ['met lock op Benen A', lockUser, standard], ['met een lege zondag', undefined, sundayFree], ['met een lege zondag en lock', lockUser, sundayFree]] as const) {
      it(`simulatie ${name}, ${lockName}: na Akkoord geen TEST-MAKE-ROOM en geen extra herstelling`, () => {
        setContext();
        const a = retryOf(sessions(legsLock))!;
        expect(a).toBeDefined();
        const applied = applyPlanChangeItems(a.proposal!.changes, sessions(legsLock), undefined, lockProposal).sessions;
        const pass = planPass(applied, { today: '2026-10-28', logs: [testLog()], templates, program: null, blocks: [], restDay: 1, newId: () => 'new' });
        expect(strip(pass.sessions)).toEqual(strip(applied));
        expect(pass.repairs).toEqual([]);
        const after = computeAdvice(inputs(pass.sessions));
        expect(after.filter((x) => x.ruleId === 'TEST-MAKE-ROOM' || x.ruleId === 'TEST-INFLUENCE' || x.ruleId === 'TEST-RETRY')).toEqual([]);
      });
    }
  }

  it('raakt geen sessie die al in een ander voorstel staat', () => {
    const sessions = [...standard().filter((x) => x.id !== 'upA' && x.id !== 'legs'), planned('todayLegs', 'tpl_lower_a', '2026-10-28', '2026-10-26')];
    const all = computeAdvice(inputs(sessions));
    const other = all.find((x) => x.ruleId === 'HARD-THEN-SPACE')!;
    expect(other.proposal!.changes.some((c) => c.plannedSessionId === 'todayLegs')).toBe(true);
    const retry = all.find((x) => x.ruleId === 'TEST-RETRY');
    expect(retry?.proposal?.changes.some((c) => c.plannedSessionId === 'todayLegs')).toBeFalsy();
  });
});

describe('de stille beenregel in het voorstelblad rekent op de eindstand', () => {
  it('zegt niets over de testdag als het voorstel zelf de benen fris maakt', () => {
    const a = retryOf(standard())!;
    const applied = planPass(applyPlanChangeItems(a.proposal!.changes, standard(), undefined, lockProposal).sessions, { today: '2026-10-28', logs: [testLog()], templates, program: null, blocks: [], restDay: 1, newId: () => 'new' }).sessions;
    const deps = (plannedSessions: PlannedSession[]) => ({ logs: [testLog()], plannedSessions, templates, program: null, bodyKg: 86, today: '2026-10-28', minutesOf: (_s: PlannedSession, t: { durationVariants: { full: number } }) => t.durationVariants.full, injuries: [], checkIns: [] });
    // Op de planning van nu is Benen A er nog en de dag erna "zwaar"; op de eindstand is de testdag de testloop zelf.
    expect(moveLegNote({ sessionId: 'hills', toDate: '2026-10-31', deps: deps(applied) as never, mode: 'voorstel' })).toBeUndefined();
  });
});
