import { describe, it, expect } from 'vitest';
import { computeAdvice, retryTestRows, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyPlanChangeItems } from './proposalEngine';
import { findHeavyConflicts } from './scheduler';
import { validateWeeks, type CheckInput, type Finding } from './weekValidator';
import { CONCERN_RULES } from './weekConcerns';
import type { PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));

// Nagemaakt voorbeeld: een testloop op dinsdag 29 september 2026 met veel stilstand. TEST-RETRY werd
// geaccepteerd en maakte van een harde loop op zondag 4 oktober een herkansing; die zette je zelf op
// overgeslagen. Vandaag is maandag 5 oktober.
const TEST_DAY = '2026-09-29';
const TODAY = '2026-10-05';
const MONDAY = '2026-10-05';
const userLock = { by: 'user' as const, at: '2026-10-04T18:00:00Z' };

const testLog = (date = TEST_DAY, over: Partial<NonNullable<SessionLog['bestEffort']>> = {}): SessionLog => ({
  id: `log-${date}`, templateId: 'tpl_test_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 5, stoppedSec: 136, ...over },
} as SessionLog);

const row = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate, weekStartDate: scheduledDate >= MONDAY ? (scheduledDate >= '2026-10-12' ? '2026-10-12' : MONDAY) : '2026-09-28', status: 'planned', order: 0, ...over,
});

// De herkansing (overgeslagen, jouw slot) en een week waarin je zelf de heuvels en de lange duurloop
// naar maandag en dinsdag sleepte.
const plan = (retry: Partial<PlannedSession> = {}): PlannedSession[] => [
  row('retry', 'tpl_test_run', '2026-10-04', { status: 'skipped', lock: userLock, movedFromDate: '2026-10-03', ...retry }),
  row('hills', 'tpl_hills_descent', '2026-10-05', { status: 'moved', lock: userLock, movedFromDate: '2026-10-10' }),
  row('long', 'tpl_long_run', '2026-10-06', { status: 'moved', lock: userLock, movedFromDate: '2026-10-04' }),
  row('upperA', 'tpl_upper_a', '2026-10-07', { status: 'moved', lock: userLock, movedFromDate: '2026-10-06' }),
  row('easy', 'tpl_easy_run', '2026-10-08'),
  row('legs', 'tpl_lower_a', '2026-10-09', { status: 'moved', lock: userLock, movedFromDate: '2026-10-07' }),
  row('upperB', 'tpl_upper_b', '2026-10-09'),
  row('long2', 'tpl_long_run', '2026-10-11'),
  row('rest2', 'tpl_herstel', '2026-10-12'),
  row('upperA2', 'tpl_upper_a', '2026-10-13'),
  row('legs2', 'tpl_lower_a', '2026-10-14'),
  row('easy2', 'tpl_easy_run', '2026-10-15'),
];

const inputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: [testLog()], plannedSessions: plan(), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic',
  respondedIds: new Set([`retest:${TEST_DAY}`]), retryRows: new Set(['retry']), asOf: TODAY, restDay: 1, ...over,
});
const again = (over: Partial<AdviceInputs> = {}) => computeAdvice(inputs(over)).find((a) => a.id === `retest:${TEST_DAY}:opnieuw`);
const moveOf = (a: NonNullable<ReturnType<typeof again>>) => a.proposal!.changes.find((c) => c.plannedSessionId === 'retry')!;

describe('retryTestRows: welke rij een geaccepteerde herkansing werd', () => {
  const p = (over: Partial<PlanChangeProposal>): PlanChangeProposal => ({
    id: 'p1', trigger: 'session_skipped', issue: '', alternatives: [], consequences: '', explanation: '', createdAt: '2026-09-30T08:00:00Z', resolution: 'accepted',
    changes: [
      { plannedSessionId: 'herstel', action: 'remove', reason: '', generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] },
      { plannedSessionId: 'retry', action: 'move', fromDate: '2026-10-03', toDate: '2026-10-03', templateId: 'tpl_test_run', reason: '', generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] },
    ],
    ...over,
  });
  it('neemt alleen de rij die een testloop werd, uit een aangenomen voorstel', () => {
    expect([...retryTestRows([p({})])]).toEqual(['retry']);
    expect(retryTestRows([p({ resolution: 'rejected' })]).size).toBe(0);
    expect(retryTestRows([p({ resolution: undefined })]).size).toBe(0);
  });
  it('telt een ongedaan gemaakt voorstel niet', () => {
    expect(retryTestRows([p({}), p({ id: 'undo', revertsProposalId: 'p1', changes: [] })]).size).toBe(0);
  });
  it('telt een testloop van een andere regel niet', () => {
    const other = p({ changes: [{ plannedSessionId: 'x', action: 'move', fromDate: '2026-10-03', toDate: '2026-10-05', templateId: 'tpl_test_run', reason: '', generatedBy: ['engine/adviceEngine.ts', 'TEST-MAKE-ROOM'] }] });
    expect(retryTestRows([other]).size).toBe(0);
  });
});

describe('TEST-RETRY opnieuw: de herkansing ging niet door', () => {
  it('stelt één keer opnieuw een test voor, als voorstel met Akkoord en Liever niet', () => {
    const a = again()!;
    expect(a).toBeDefined();
    expect(a.ruleId).toBe('TEST-RETRY');
    expect(a.title).toBe('Je herkansing van zo 4 oktober ging niet door');
    expect(a.lead).toBe('Je testloop van di 29 september had 2:16 stilstand, dus hij is iets te gunstig. De herkansing van zo 4 oktober ging niet door.');
    expect(a.effect).toContain('Met Liever niet blijft alles staan en vraagt ASCEND er niet meer naar, tot je een nieuwe test logt.');
    expect(a.brief).toBe('Zo 4 okt: herkansing ging niet door');
    expect(`${a.title}${a.effect}${a.why}${a.lead}`).not.toMatch(/[\u2013\u2014]/);
    // De overgeslagen rij zelf komt terug op een nieuwe dag: geen nieuwe rij, geen historie herschreven.
    const move = moveOf(a);
    expect(move).toMatchObject({ action: 'move', fromDate: '2026-10-04' });
    expect(move.toDate! > TODAY).toBe(true);
  });

  it('kiest een dag die past: 48 uur na een zware beendag en met frisse benen', () => {
    const a = again()!;
    for (const option of [a.proposal!, ...(a.options ?? []).map((o) => o.proposal)]) {
      const { sessions } = applyPlanChangeItems(option.changes, plan(), undefined, { by: 'proposal', at: 'x' });
      const test = sessions.find((s) => s.id === 'retry')!;
      expect(test.status).not.toBe('skipped');
      expect(findHeavyConflicts(test.id, byId.get('tpl_test_run')!, test.scheduledDate, sessions, byId, [testLog()])).toEqual([]);
    }
  });

  it('raakt niets aan wat je zelf vastzette', () => {
    const a = again()!;
    const yours = new Set(plan().filter((s) => s.lock?.by === 'user' && s.id !== 'retry').map((s) => s.id));
    for (const option of [a.proposal!, ...(a.options ?? []).map((o) => o.proposal)]) {
      expect(option.changes.filter((c) => yours.has(c.plannedSessionId ?? ''))).toEqual([]);
    }
  });

  it('komt ook als de herkansing gemist is (voorbij, niet gelogd, niet overgeslagen)', () => {
    expect(again({ plannedSessions: plan({ status: 'planned', lock: undefined }) })).toBeDefined();
  });

  it('vraagt het na Liever niet niet nog eens, tot er een nieuwe test is gelogd', () => {
    expect(again({ respondedIds: new Set([`retest:${TEST_DAY}`, `retest:${TEST_DAY}:opnieuw`]) })).toBeUndefined();
    // Een nieuwe test zonder stilstand: niets meer te herkansen.
    const fresh = testLog('2026-10-03', { stops: 0, stoppedSec: 0 });
    expect(computeAdvice(inputs({ logs: [testLog(), fresh] })).some((x) => x.ruleId === 'TEST-RETRY')).toBe(false);
    // Een nieuwe test met weer veel stilstand: de gewone eerste vraag voor die test, met zijn eigen id.
    const shaky = testLog('2026-10-02');
    const first = computeAdvice(inputs({ logs: [testLog(), shaky], respondedIds: new Set([`retest:${TEST_DAY}`, `retest:${TEST_DAY}:opnieuw`]) })).filter((x) => x.ruleId === 'TEST-RETRY');
    expect(first.every((x) => x.id.startsWith('retest:2026-10-02'))).toBe(true);
  });

  it('niet voordat de eerste vraag beantwoord is, en niet zonder herkansing van TEST-RETRY', () => {
    expect(again({ respondedIds: new Set() })).toBeUndefined();
    expect(again({ retryRows: new Set() })).toBeUndefined();
    expect(again({ retryRows: undefined })).toBeUndefined();
  });

  it('niet als de herkansing gedaan is of nog komt', () => {
    const done = { ...testLog('2026-10-04', { stops: 0, stoppedSec: 0 }), plannedSessionId: 'retry' } as SessionLog;
    expect(computeAdvice(inputs({ logs: [testLog(), done] })).some((x) => x.ruleId === 'TEST-RETRY')).toBe(false);
    const ahead = plan({ status: 'planned', scheduledDate: '2026-10-08', lock: userLock });
    expect(again({ plannedSessions: ahead })).toBeUndefined();
  });

  it('TEST-MAKE-ROOM spreekt niet ook voor dezelfde overgeslagen herkansing: één stem', () => {
    const all = computeAdvice(inputs());
    expect(all.some((x) => x.id === 'testroom:retry')).toBe(false);
    expect(all.filter((x) => x.proposal?.changes.some((c) => c.plannedSessionId === 'retry'))).toHaveLength(1);
  });

  it('niet in een vakantie, en niets als er geen dag past', () => {
    const off = { id: 'v', kind: 'no_training' as const, startDate: '2026-10-06', endDate: '2026-10-10' };
    const a = again({ leave: [off] });
    if (a) for (const o of [a.proposal!, ...(a.options ?? []).map((x) => x.proposal)]) {
      const to = o.changes.find((c) => c.plannedSessionId === 'retry')!.toDate!;
      expect(to < off.startDate || to > off.endDate).toBe(true);
    }
    expect(again({ leave: [{ ...off, endDate: '2026-10-20' }] })).toBeUndefined();
  });

  it('niet als je ziek bent of de instelling uit staat', () => {
    expect(again({ illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-10-04' }] })).toBeUndefined();
    expect(again({ newTestOnStops: false })).toBeUndefined();
  });

  it('de eindstand van elke keuze geeft geen nieuwe melding over wat hij raakt', () => {
    const a = again()!;
    const check = (sessions: PlannedSession[]): CheckInput => ({ sessions, logs: [testLog()], templates, today: TODAY, restDay: 1, reportYours: true });
    const key = (f: Finding) => `${f.rule}:${[...f.sessionIds].sort().join(',')}`;
    const before = new Set(validateWeeks(check(plan())).map(key));
    for (const option of [a.proposal!, ...(a.options ?? []).map((o) => o.proposal)]) {
      const touched = new Set(option.changes.map((c) => c.plannedSessionId));
      const { sessions } = applyPlanChangeItems(option.changes, plan(), undefined, { by: 'proposal', at: 'x' });
      const fresh = validateWeeks(check(sessions)).filter((f) => CONCERN_RULES.includes(f.rule) && !before.has(key(f)) && f.sessionIds.some((id) => touched.has(id)));
      expect(fresh).toEqual([]);
    }
  });

  it('na Akkoord op het tweede voorstel en weer overslaan: geen derde voorstel en geen TEST-MAKE-ROOM', () => {
    const a = again()!;
    const { sessions } = applyPlanChangeItems(a.proposal!.changes, plan(), undefined, { by: 'proposal', at: 'x' });
    const skippedAgain = sessions.map((s) => (s.id === 'retry' ? { ...s, status: 'skipped' as const, lock: userLock } : s));
    const later = computeAdvice(inputs({
      plannedSessions: skippedAgain,
      respondedIds: new Set([`retest:${TEST_DAY}`, `retest:${TEST_DAY}:opnieuw`]),
      asOf: '2026-10-07',
    }));
    expect(later.filter((x) => x.ruleId === 'TEST-RETRY')).toEqual([]);
    expect(later.some((x) => x.id === 'testroom:retry')).toBe(false);
  });
});

describe('TEST-RETRY opnieuw: wat al in een ander voorstel staat, en kracht naar een vakantie', () => {
  // Nagemaakte korte week: beenkracht op dinsdag, daarna een vakantie, zodat de test deze week moet vallen.
  const short = (extra: PlannedSession[] = []): PlannedSession[] => [
    row('retry', 'tpl_test_run', '2026-10-04', { status: 'skipped', lock: userLock }),
    row('legs', 'tpl_lower_a', '2026-10-06'),
    row('easy', 'tpl_easy_run', '2026-10-08'),
    row('long', 'tpl_long_run', '2026-10-11'),
    ...extra,
  ];
  const holiday = { id: 'v', kind: 'no_training' as const, startDate: '2026-10-12', endDate: '2026-10-25' };
  const all = (sessions: PlannedSession[], leave = [holiday], logs: SessionLog[] = [testLog()]) => computeAdvice(inputs({ plannedSessions: sessions, leave, logs }));
  const ways = (a: { proposal?: { changes: { plannedSessionId?: string; toDate?: string }[] }; options?: { proposal: { changes: { plannedSessionId?: string; toDate?: string }[] } }[] }) => [a.proposal!, ...(a.options ?? []).map((o) => o.proposal)];

  it('zonder ander voorstel schuift de beenkracht mee naar na de test', () => {
    const a = all(short()).find((x) => x.id === `retest:${TEST_DAY}:opnieuw`)!;
    expect(ways(a).some((p) => p.changes.some((c) => c.plannedSessionId === 'legs'))).toBe(true);
  });

  it('staat dezelfde krachttraining al in een open voorstel, dan raakt het tweede voorstel hem niet', () => {
    // Een zware loop vandaag: HARD-THEN-SPACE stelt voor om de beenkracht van morgen een dag later te doen.
    const hard = { id: 'log-hard', templateId: 'tpl_easy_run', type: 'cardio', completedDate: TODAY, completedAt: `${TODAY}T07:00:00Z`, variant: 'full', durationMinutes: 30, rpe: 9, source: 'manual', cardioData: { durationMinutes: 30, distanceKm: 5, source: 'manual' } } as SessionLog;
    const list = all(short(), [holiday], [testLog(), hard]);
    expect(list.some((x) => x.proposal?.changes.some((c) => c.plannedSessionId === 'legs') && x.ruleId !== 'TEST-RETRY')).toBe(true);
    for (const a of list.filter((x) => x.ruleId === 'TEST-RETRY')) {
      for (const p of ways(a)) expect(p.changes.some((c) => c.plannedSessionId === 'legs')).toBe(false);
    }
  });

  it('kracht schuift nooit naar een vakantie-, tocht- of lichte dag', () => {
    const off = { id: 'w', kind: 'no_training' as const, startDate: '2026-10-07', endDate: '2026-10-07' };
    const a = all(short(), [holiday, off]).find((x) => x.id === `retest:${TEST_DAY}:opnieuw`);
    for (const p of a ? ways(a) : []) {
      for (const c of p.changes) if (c.toDate) expect(c.toDate === '2026-10-07' || (c.toDate >= holiday.startDate && c.toDate <= holiday.endDate)).toBe(false);
    }
  });
});
