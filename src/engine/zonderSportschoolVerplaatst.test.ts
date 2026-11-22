// Een sportschooltraining die in een periode zonder sportschool belandt (docs/beslissingen/2026-11-15-zonder-sportschool-verplaatst.md).
// Melding van de eigenaar, zondag 15 november 22:00: periode Zonder sportschool za 14 t/m wo 18 november, ma 16 de
// lange duurloop doorgestreept (ziek gemeld), di 17 Eigen gewicht (goed), maar wo 18 "Bovenlichaam A · verplaatst van".
// Alles nagemaakt.

import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import type { Advice } from './adviceShared';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { catchUpRows } from './catchUp';
import { planIllnessChange } from './illness';
import { planLeaveChange } from './leaveProposal';
import { keptDayReason, suggestMoveDates } from './moveSuggestions';
import { applyNoGymDays } from './noGym';
import { landsGymOnNoGym, NO_GYM_ASK, planNoGymFix, withoutGymOnNoGym } from './noGymGuard';
import { leaveDays } from './leave';
import { planPass } from './planPass';
import { applyPlanChangeItems } from './proposalEngine';
import { dayVerdicts, decideMove, dragEligibility, LEAVE_ASK_REASON, type DragContext } from './weekDrag';
import { checkSwap, withSwapVerdicts } from './weekSwap';
import { rowNotes, weekConcerns } from './weekConcerns';
import { planWeekFix } from './weekFixProposal';
import { lockLevel, validateWeeks, type CheckInput } from './weekValidator';
import { proposeMove } from './scheduler';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program = { ...base, startDate: '2026-10-05' };
const byId = new Map(templates.map((t) => [t.id, t]));
const TODAY = '2026-11-15';
const PERIOD: LeavePeriod = { id: 'p1', kind: 'no_gym', startDate: '2026-11-14', endDate: '2026-11-18' };
const ILL = [{ id: 'ill1', kind: 'above_neck' as const, startDate: TODAY }];
const LOCK = { by: 'user' as const, at: `${TODAY}T21:00:00.000Z` };

const ps = (id: string, templateId: string, d: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: d, weekStartDate: mondayOfWeek(d), status: 'planned', order: 0, ...over,
});
const log = (s: PlannedSession, min = 60): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: byId.get(s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: min, source: 'manual',
} as SessionLog);

// De twee weken van de eigenaar op zondag 15 november 22:00, na de ziekmelding. Wat de periode zelf deed staat erin:
// di 17 Bovenlichaam A werd Eigen gewicht, wo 18 Benen A verviel (48 uur na Eigen gewicht).
function ownerPlan(): { plan: PlannedSession[]; logs: SessionLog[] } {
  const dropped = (from: string) => ({ status: 'skipped' as const, leave: { periodId: 'p1', role: 'dropped' as const, from } });
  const placed = (from: string) => ({ leave: { periodId: 'p1', role: 'placed' as const, from } });
  const plan: PlannedSession[] = [
    ps('rest9', 'tpl_herstel', '2026-11-09'),
    ps('ua10', 'tpl_upper_a', '2026-11-10'),
    ps('la11', 'tpl_lower_a', '2026-11-11'),
    ps('er12', 'tpl_easy_run', '2026-11-12'),
    ps('ub13', 'tpl_upper_b', '2026-11-13', { status: 'skipped' }),
    ps('lr14', 'tpl_long_run', '2026-11-14'),
    ps('bw15', 'tpl_bodyweight', '2026-11-15', { status: 'skipped', ...placed('2026-11-15') }),
    ps('hi15', 'tpl_hill_intervals', '2026-11-15', { order: 1 }),
    ps('rest16', 'tpl_herstel', '2026-11-16'),
    ps('ua17', 'tpl_upper_a', '2026-11-17', dropped('2026-11-17')),
    ps('bw17', 'tpl_bodyweight', '2026-11-17', placed('2026-11-17')),
    ps('la18', 'tpl_lower_a', '2026-11-18', dropped('2026-11-18')),
    ps('er19', 'tpl_easy_run', '2026-11-19'),
    ps('ub20', 'tpl_upper_b', '2026-11-20'),
    ps('lr21', 'tpl_long_run', '2026-11-21'),
    ps('hi22', 'tpl_hill_intervals', '2026-11-22'),
  ];
  return { plan, logs: [log(plan[2]), log(plan[3])] };
}

const checkInput = (sessions: PlannedSession[], logs: SessionLog[], over: Partial<CheckInput> = {}): CheckInput => ({
  sessions, logs, templates, today: TODAY, restDay: 1, program, leave: [PERIOD], ...over,
});
const drag = (sessions: PlannedSession[], logs: SessionLog[]): DragContext => ({
  sessions, templates, logs, program, asOf: TODAY, sameDayPairingPreference: 'automatic', move: { leave: [PERIOD], restDay: 1, illness: ILL },
});
const gymOnNoGym = (sessions: PlannedSession[]) => sessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= PERIOD.startDate && s.scheduledDate <= PERIOD.endDate && ['tpl_upper_a', 'tpl_upper_b', 'tpl_lower_a', 'tpl_lower_b'].includes(s.templateId));

describe('het scherm van de eigenaar (zondag 15 november 22:00)', () => {
  it('ziek melden haalt alleen weg en zet niets op een andere dag', () => {
    const { plan, logs } = ownerPlan();
    const p = planIllnessChange({ action: 'report', kind: 'above_neck' }, [], plan, templates, logs, TODAY)!;
    expect(p.proposal.changes.every((c) => c.action === 'remove')).toBe(true);
  });

  it('de stap zonder sportschool laat een vastgezette Bovenlichaam A op wo 18 staan: de oorzaak dat hij bleef', () => {
    const { plan, logs } = ownerPlan();
    // Een Bovenlichaam A die gemist was (niet gelogd), via Niet gedaan? en Verplaatsen op de eerste voorgestelde dag.
    const missed = plan;
    const mine = new Set(logs.map((l) => l.plannedSessionId));
    const { added } = catchUpRows(missed.find((s) => s.id === 'ua10')!, '2026-11-18', LOCK, 'ua18');
    expect(lockLevel(added, mine, TODAY)).toBe(1);
    const step = applyNoGymDays({ sessions: [...plan, added], days: leaveDays([PERIOD]), today: TODAY, templates, logged: mine, newId: () => 'x', restDay: 1 });
    expect(step.sessions.find((s) => s.id === 'ua18')!.status).toBe('planned');
    expect(step.repairs.filter((r) => r.sessionId === 'ua18')).toEqual([]);
  });
});

describe('elke weg naar een dag zonder sportschool', () => {
  const { plan, logs } = ownerPlan();
  // Bovenlichaam A van di 10, niet gedaan: de weg via het actieblad (Verplaatsen, de voorgestelde dagen).
  const withMissed = plan;
  const noLogs = logs.filter((l) => l.plannedSessionId !== 'ua10');

  it('Verplaatsen: de voorgestelde dagen slaan een dag zonder sportschool over voor een sportschooltraining', () => {
    expect(keptDayReason({ leave: [PERIOD], restDay: 1 }, byId.get('tpl_upper_a')!, '2026-11-18', TODAY)).toBe('nogym');
    expect(keptDayReason({ leave: [PERIOD], restDay: 1 }, byId.get('tpl_easy_run')!, '2026-11-18', TODAY)).toBeUndefined();
    expect(keptDayReason({ leave: [PERIOD], restDay: 1 }, byId.get('tpl_bodyweight')!, '2026-11-18', TODAY)).toBeUndefined();
    const days = suggestMoveDates(withMissed, templates, 'ua10', noLogs, program, undefined, 'automatic', TODAY, 3, { leave: [PERIOD], restDay: 1, illness: ILL }).map((s) => s.date);
    // Met de ziekte (zo en ma) en de volle dagen eromheen was wo 18 de enige vrije dag die het blad voorstelde.
    expect(days).toEqual([]);
    for (const d of days) expect(d > PERIOD.endDate || d < PERIOD.startDate, d).toBe(true);
    // Een loop mag wel op een dag zonder sportschool.
    const run = suggestMoveDates([...withMissed, ps('er10', 'tpl_easy_run', '2026-11-10')], templates, 'er10', noLogs, program, undefined, 'automatic', TODAY, 3, { leave: [PERIOD], restDay: 1, illness: ILL }).map((s) => s.date);
    expect(run).toContain('2026-11-18');
  });

  it('slepen: wo 18 mag, maar eerst de vraag; daarna zegt Week het in amber', () => {
    const verdict = dayVerdicts(drag(withMissed, noLogs), 'ub20', '2026-11-16').find((v) => v.date === '2026-11-18')!;
    expect(verdict).toMatchObject({ kind: 'nogym', droppable: true, tone: 'warn', ask: true, askReason: NO_GYM_ASK, chip: 'Zonder sportschool' });
    const decision = decideMove(proposeMove(withMissed, templates, 'ub20', '2026-11-18', noLogs, program, undefined, 'automatic', TODAY), { verdict });
    expect(decision.action).toBe('ask');
    expect(decision.proposal.reason).toContain(NO_GYM_ASK);
    // Een loop slepen naar wo 18 is gewoon een vrije dag.
    expect(dayVerdicts(drag(withMissed, noLogs), 'er19', '2026-11-16').find((v) => v.date === '2026-11-18')!.kind).toBe('free');
  });

  it('een datum kiezen in het actieblad (Week en Vandaag): eerst de vraag', () => {
    const decision = decideMove(proposeMove(withMissed, templates, 'ub20', '2026-11-18', noLogs, program, undefined, 'automatic', TODAY), { extraAsk: NO_GYM_ASK });
    expect(decision.action).toBe('ask');
    expect(decision.proposal.reason).toContain(NO_GYM_ASK);
  });

  it('ruilen naar een dag zonder sportschool vraagt eerst', () => {
    const sessions = [...withMissed, ps('er18', 'tpl_easy_run', '2026-11-18')];
    const swap = checkSwap(drag(sessions, noLogs), 'ub20', 'er18');
    expect(swap.ok).toBe(true);
    if (swap.ok) {
      expect(swap.asks.join(' ')).toContain('sportschool nodig, en je zit zonder sportschool');
      expect(swap.hard).toBe(true);
    }
  });

  it('een voorstel van ASCEND zet nooit een sportschooltraining op zo\'n dag (het vangnet)', () => {
    const move = (to: string) => ({ id: 'x', trigger: 'plan_update' as const, issue: '', alternatives: [], consequences: '', explanation: '', createdAt: '', changes: [{ plannedSessionId: 'ub20', action: 'move' as const, fromDate: '2026-11-20', toDate: to }] });
    const advice = [
      { id: 'a', proposal: move('2026-11-18') },
      { id: 'b', proposal: move('2026-11-18'), options: [{ proposal: move('2026-11-18') }, { proposal: move('2026-11-19') }] },
      { id: 'c', proposal: move('2026-11-19') },
      { id: 'd' },
    ];
    const kept = withoutGymOnNoGym(advice, withMissed, byId, [PERIOD]);
    expect(kept.map((a) => a.id)).toEqual(['b', 'c', 'd']);
    expect(kept[0].proposal!.changes[0].toDate).toBe('2026-11-19');
    expect(kept[0].options).toBeUndefined();
    // Eigen gewicht en een loop mogen wel.
    expect(landsGymOnNoGym([{ action: 'add', newSessionDraft: { templateId: 'tpl_bodyweight', scheduledDate: '2026-11-18', weekStartDate: '2026-11-16' } }], withMissed, byId, [PERIOD])).toBe(false);
    expect(landsGymOnNoGym([{ action: 'move', plannedSessionId: 'er19', toDate: '2026-11-18' }], withMissed, byId, [PERIOD])).toBe(false);
  });

  it('de voorstellen van Vandaag in de stand van de eigenaar, ook zonder ziekte: geen sportschooltraining op een dag zonder sportschool', () => {
    for (const illness of [ILL, []]) {
      for (const asOf of ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']) {
        const inputs: AdviceInputs = {
          logs: noLogs, plannedSessions: withMissed, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic',
          respondedIds: new Set(), asOf, restDay: 1, leave: [PERIOD], illnessEpisodes: illness,
        };
        const all = computeAdvice(inputs).flatMap((a: Advice) => [a.proposal, ...(a.options ?? []).map((o) => o.proposal)]).flatMap((p) => p?.changes ?? []);
        expect(landsGymOnNoGym(all, withMissed, byId, [PERIOD]), asOf).toBe(false);
      }
    }
  });
});

describe('de stand van de eigenaar: Bovenlichaam A staat al op wo 18', () => {
  const { plan, logs } = ownerPlan();
  // Precies de vorm uit de back-up (coördinator, naspelen): zelf verplaatst op 10 november, van di 10 naar wo 18, met
  // jouw slot en zonder merk van de periode.
  const ua18 = ps('ua18', 'tpl_upper_a', '2026-11-18', { status: 'moved', movedFromDate: '2026-11-10', lock: { by: 'user', at: '2026-11-10T20:36:00.000Z' } });
  const sessions = [...plan, ua18];

  it('Let op zegt het in amber, met een voorstel: de training vervalt (eigen gewicht staat al op di 17)', () => {
    const input = checkInput(sessions, logs);
    const concerns = weekConcerns(input, '2026-11-16');
    const c = concerns.find((x) => x.rule === 'NO-GYM')!;
    expect(c.headline).toBe('Sportschool nodig, en je zit zonder sportschool.');
    expect(c.fact).toBe('Bovenlichaam A staat op woensdag 18, in je periode zonder sportschool.');
    expect(c.title).toBe('Bovenlichaam A zonder sportschool');
    expect(rowNotes(concerns).get('ua18')).toBe('geen sportschool');
    const fix = planWeekFix(input, c, '2026-11-16')!;
    expect(fix.title).toBe('Bovenlichaam A zonder sportschool');
    expect(fix.effect).toBe('Geen sportschool: Bovenlichaam A vervalt. Een sessie met je eigen gewicht past niet, want tussen twee krachtsessies zit minstens 48 uur.');
    expect(fix.proposal!.changes).toHaveLength(1);
    expect(fix.proposal!.changes[0]).toMatchObject({ plannedSessionId: 'ua18', action: 'remove', leave: { periodId: 'p1', role: 'dropped', from: '2026-11-18' } });
    // Na Akkoord: overgeslagen met het merk van de periode, en de planning laat het zo (twee keer achter elkaar).
    const applied = applyPlanChangeItems(fix.proposal!.changes, sessions, () => 'n', { by: 'proposal', proposalId: 'x', at: TODAY });
    expect(applied.unsupported).toEqual([]);
    expect(gymOnNoGym(applied.sessions)).toEqual([]);
    expect(weekConcerns(checkInput(applied.sessions, logs), '2026-11-16').some((x) => x.rule === 'NO-GYM')).toBe(false);
    const ctx = { today: TODAY, logs, templates, program, blocks: [], restDay: 1, leave: [PERIOD], newId: () => 'q' };
    const once = planPass(applied.sessions, ctx).sessions;
    expect(planPass(once, ctx).sessions).toEqual(once);
    expect(gymOnNoGym(once)).toEqual([]);
  });

  it('past eigen gewicht wel, dan wordt hij eigen gewicht op die dag, zoals op dinsdag', () => {
    const free = sessions.filter((s) => s.id !== 'bw17');
    const input = checkInput(free, logs);
    const c = weekConcerns(input, '2026-11-16').find((x) => x.rule === 'NO-GYM')!;
    const fix = planNoGymFix(input, c.finding.subjectId)!;
    expect(fix.bodyweight).toBe(true);
    expect(fix.effect).toBe('Geen sportschool: Bovenlichaam A wordt een korte sessie met je eigen gewicht.');
    expect(fix.items.map((i) => [i.action, i.newSessionDraft?.templateId ?? i.plannedSessionId, i.toDate ?? i.fromDate])).toEqual([
      ['remove', 'ua18', '2026-11-18'], ['add', 'tpl_bodyweight', '2026-11-18'],
    ]);
    const option = planWeekFix(input, c, '2026-11-16')!;
    expect((option.options?.[0] ?? option).proposal!.changes).toEqual(fix.items.map((i) => expect.objectContaining({ action: i.action })));
  });

  it('de planningsronde leest de regel niet: zonder Week geen bevinding, en golden blijft stil', () => {
    expect(validateWeeks(checkInput(sessions, logs)).some((f) => f.rule === 'NO-GYM')).toBe(false);
    expect(validateWeeks({ ...checkInput(sessions, logs), reportYours: true }).some((f) => f.rule === 'NO-GYM')).toBe(true);
  });

  it('een gelogde of voorbije sportschooltraining op zo\'n dag blijft historie: geen melding, geen voorstel', () => {
    const past = ps('ub14', 'tpl_upper_b', '2026-11-14', { status: 'moved', lock: LOCK });
    const done = { ...ua18, id: 'ua15', scheduledDate: TODAY };
    const input = checkInput([...plan, past, done], [...logs, log(done)]);
    expect(weekConcerns(input, '2026-11-09').some((x) => x.rule === 'NO-GYM')).toBe(false);
    expect(planNoGymFix(input, 'ub14')).toBeUndefined();
    expect(planNoGymFix(input, 'ua15')).toBeUndefined();
  });

  it('een vakantiedag gaat voor: daar zegt LEAVE-OFF het, niet deze regel', () => {
    const holiday: LeavePeriod = { id: 'v1', kind: 'no_training', startDate: '2026-11-18', endDate: '2026-11-18' };
    const input = checkInput(sessions, logs, { leave: [PERIOD, holiday] });
    const rules = weekConcerns(input, '2026-11-16').filter((x) => x.finding.subjectId === 'ua18').map((x) => x.rule);
    expect(rules).toEqual(['LEAVE-OFF']);
  });
});

describe('de weg van de eigenaar: dinsdag 10 november, Bovenlichaam A naar wo 18 in een bestaande periode', () => {
  const MON10 = '2026-11-10';
  const { plan } = ownerPlan();
  // Op 10 november stond Bovenlichaam A nog open op die dag; de periode bestond al.
  const before = plan;
  const onMon10: DragContext = { ...drag(before, []), asOf: MON10, move: { leave: [PERIOD], restDay: 1 } };

  it('het blad stelt wo 18 niet meer voor, slepen en een datum kiezen vragen eerst', () => {
    const days = suggestMoveDates(before, templates, 'ua10', [], program, undefined, 'automatic', MON10, 3, { leave: [PERIOD], restDay: 1 }).map((s) => s.date);
    for (const d of days) expect(d >= PERIOD.startDate && d <= PERIOD.endDate, d).toBe(false);
    const proposal = proposeMove(before, templates, 'ua10', '2026-11-18', [], program, undefined, 'automatic', MON10);
    expect(decideMove(proposal, { extraAsk: NO_GYM_ASK }).action).toBe('ask');
    expect(dayVerdicts(onMon10, 'ua10', '2026-11-16').find((v) => v.date === '2026-11-18')).toMatchObject({ kind: 'nogym', ask: true });
  });

  it('komt de periode pas na de vastzetting, of wordt hij langer, dan meldt Week het ook', () => {
    const { plan, logs } = ownerPlan();
    const ua18 = ps('ua18', 'tpl_upper_a', '2026-11-18', { status: 'moved', movedFromDate: '2026-11-10', lock: { by: 'user', at: '2026-11-10T20:36:00.000Z' } });
    const shorter: LeavePeriod = { ...PERIOD, endDate: '2026-11-17' };
    // Eerst tot di 17: niets op wo 18. Daarna verlengd tot wo 18: het punt staat er.
    expect(weekConcerns(checkInput([...plan, ua18], logs, { leave: [shorter] }), '2026-11-16').some((c) => c.rule === 'NO-GYM')).toBe(false);
    expect(weekConcerns(checkInput([...plan, ua18], logs, { leave: [PERIOD] }), '2026-11-16').some((c) => c.rule === 'NO-GYM')).toBe(true);
    // De planningsronde van het voorstel voor de periode laat de vastgezette staan (jouw slot), dus Let op is de plek.
    const ctx = { today: '2026-11-10', logs: [], templates, program, blocks: [], restDay: 1, leave: [PERIOD], newId: () => 'q' };
    const after = planPass([...plan.map((s) => (s.leave ? { ...s, leave: undefined, status: 'planned' as const } : s)), ua18], ctx).sessions;
    expect(after.find((s) => s.id === 'ua18')).toMatchObject({ scheduledDate: '2026-11-18', status: 'moved' });
  });
});

describe('na Warden (16 november)', () => {
  const ua18 = (): PlannedSession => ps('ua18', 'tpl_upper_a', '2026-11-18', { status: 'moved', movedFromDate: '2026-11-10', lock: { by: 'user', at: '2026-11-10T20:36:00.000Z' } });
  const LONGER: LeavePeriod = { ...PERIOD, endDate: '2026-11-20' };
  const context = (periods: LeavePeriod[]) => ({ today: TODAY, logs: [] as SessionLog[], templates, program, blocks: [], restDay: 1, leave: periods, newId: () => 'c' });
  // Akkoord op het voorstel in Let op, met de periode 14 t/m 20 november.
  const accepted = () => {
    const { plan, logs } = ownerPlan();
    const sessions = [...plan, ua18()];
    const input = checkInput(sessions, logs, { leave: [LONGER] });
    const fix = planNoGymFix(input, 'ua18')!;
    const applied = applyPlanChangeItems(fix.items, sessions, () => 'n', { by: 'proposal', proposalId: 'x', at: TODAY }).sessions;
    expect(applied.find((s) => s.id === 'ua18')).toMatchObject({ status: 'skipped', lock: { by: 'user' }, leave: { role: 'dropped' } });
    return { applied, logs };
  };
  const after = (plan: ReturnType<typeof planLeaveChange>, sessions: PlannedSession[]) =>
    applyPlanChangeItems(plan.proposal.changes, sessions, () => 'm', { by: 'proposal', proposalId: 'y', at: TODAY }).sessions.find((s) => s.id === 'ua18')!;

  it('moet 1: de periode weghalen zet Bovenlichaam A terug op wo 18, met jouw slot en "verplaatst van di 10"', () => {
    const { applied, logs } = accepted();
    const plan = planLeaveChange({ mode: 'remove', period: LONGER, existing: [LONGER], sessions: applied, logs, templates, today: TODAY, context });
    expect(after(plan, applied)).toMatchObject({ status: 'moved', scheduledDate: '2026-11-18', movedFromDate: '2026-11-10', lock: { by: 'user' } });
    expect(after(plan, applied).leave).toBeUndefined();
  });

  it('moet 1: korter maken tot di 17 zet hem terug; korter maar wo 18 nog erin laat hem vervallen', () => {
    const { applied, logs } = accepted();
    const shorter: LeavePeriod = { ...LONGER, endDate: '2026-11-17' };
    const back = planLeaveChange({ mode: 'add', period: shorter, replaces: LONGER, existing: [LONGER], sessions: applied, logs, templates, today: TODAY, context });
    expect(after(back, applied)).toMatchObject({ status: 'moved', scheduledDate: '2026-11-18', lock: { by: 'user' } });
    const still = planLeaveChange({ mode: 'add', period: PERIOD, replaces: LONGER, existing: [LONGER], sessions: applied, logs, templates, today: TODAY, context });
    expect(after(still, applied).status).toBe('skipped');
  });

  it('moet 2: een dag in je ziekte en je doeldag blijven dicht, ook in een periode zonder sportschool', () => {
    const t = byId.get('tpl_upper_a')!;
    // Neus of keel houdt alleen wat zwaar is tegen, en vraagt dan (de ene regel, I-67 gat 5); koorts houdt de dag dicht.
    const FEVER = [{ id: 'ill1', kind: 'below_neck' as const, startDate: TODAY }];
    expect(keptDayReason({ leave: [PERIOD], illness: ILL }, t, '2026-11-16', TODAY)).toBe('ill_light');
    expect(keptDayReason({ leave: [PERIOD], illness: FEVER }, t, '2026-11-16', TODAY)).toBe('ill');
    expect(keptDayReason({ leave: [PERIOD], goalDay: '2026-11-17' }, t, '2026-11-17', TODAY)).toBe('goal');
    expect(keptDayReason({ leave: [PERIOD], restDay: 3 }, t, '2026-11-18', TODAY)).toBe('rest');
    const { plan } = ownerPlan();
    const ctx = (move: DragContext['move']): DragContext => ({ ...drag(plan, []), move });
    expect(dayVerdicts(ctx({ leave: [PERIOD], illness: FEVER }), 'ub20', '2026-11-16').find((v) => v.date === '2026-11-16')).toMatchObject({ kind: 'blocked', droppable: false });
    expect(dayVerdicts(ctx({ leave: [PERIOD], illness: ILL }), 'ub20', '2026-11-16').find((v) => v.date === '2026-11-16')).toMatchObject({ kind: 'ask', droppable: true, askReason: 'Je bent verkouden, dus niets zwaars. Sportschool nodig, en je zit zonder sportschool.', skipRules: ['NO-GYM', 'ILL'] });
    expect(dayVerdicts(ctx({ leave: [PERIOD], goalDay: '2026-11-18' }), 'ub20', '2026-11-16').find((v) => v.date === '2026-11-18')).toMatchObject({ kind: 'blocked', droppable: false });
    const swapIll = checkSwap(ctx({ leave: [PERIOD], illness: ILL }), 'ub20', 'rest16');
    expect(swapIll.ok).toBe(false);
  });

  it('moet 2: op je rustdag in de periode vragen beide, de rustdag en de sportschool', () => {
    const { plan } = ownerPlan();
    const ctx: DragContext = { ...drag(plan, []), move: { leave: [PERIOD], restDay: 3 } };
    const v = dayVerdicts(ctx, 'ub20', '2026-11-16').find((x) => x.date === '2026-11-18')!;
    expect(v).toMatchObject({ kind: 'rest', ask: true });
    // Beide, hoogstens twee zinnen, de sterkste reden eerst (I-67, Lookout op 360).
    expect(v.askReason).toBe(`${NO_GYM_ASK} Dit is je rustdag.`);
    expect(v.skipRules).toEqual(['REST-DAY', 'NO-GYM']);
    const sessions = [...plan, ps('er18', 'tpl_easy_run', '2026-11-18')];
    const swap = checkSwap({ ...drag(sessions, []), move: { leave: [PERIOD], restDay: 3 } }, 'ub20', 'er18');
    expect(swap.ok && swap.asks.join(' ')).toContain('is je rustdag');
    expect(swap.ok && swap.asks.join(' ')).toContain('sportschool nodig');
  });

  it('moet 3: kracht laten vervallen met Heuvels in de buurt zegt vervallen, en de heuvelloop zit niet in dit voorstel', () => {
    const drop: LeavePeriod = { ...PERIOD, noGym: { amount: 'light', strength: 'drop', hills: true } };
    const { plan, logs } = ownerPlan();
    const sessions = [...plan.filter((s) => s.id !== 'bw17'), ua18()];
    const input = checkInput(sessions, logs, { leave: [drop] });
    const fix = planNoGymFix(input, 'ua18')!;
    expect(fix.bodyweight).toBe(false);
    expect(fix.items.map((i) => i.action)).toEqual(['remove']);
    expect(fix.effect).toBe('Geen sportschool: Bovenlichaam A vervalt.');
    const c = weekConcerns(input, '2026-11-16').find((x) => x.rule === 'NO-GYM')!;
    expect((planWeekFix(input, c, '2026-11-16')!.options?.[0] ?? { label: 'Bovenlichaam A laten vervallen' }).label).toBe('Bovenlichaam A laten vervallen');
  });

  it('valt de eerste keuze weg, dan volgen effect en regel de nieuwe eerste', () => {
    const move = (to: string) => ({ changes: [{ plannedSessionId: 'ub20', action: 'move' as const, fromDate: '2026-11-20', toDate: to }] });
    const { plan } = ownerPlan();
    const [kept] = withoutGymOnNoGym([{ effect: 'naar wo 18', firstOptionNote: 'de kleinste verandering', proposal: move('2026-11-18'), options: [{ effect: 'naar wo 18', proposal: move('2026-11-18') }, { effect: 'naar do 19', proposal: move('2026-11-19') }] }], plan, byId, [PERIOD]);
    expect(kept.effect).toBe('naar do 19');
    expect(kept.firstOptionNote).toBeUndefined();
  });
});

describe('na Lookout (16 november)', () => {
  const lock = { by: 'user' as const, at: '2026-11-10T20:36:00.000Z' };
  const RUN_LEAVE = { periodId: 'p1', role: 'moved' as const, from: '2026-11-18', shortened: true as const };

  it('a: de reden noemt de soort periode, niet altijd je vakantie', () => {
    const run = ps('er18', 'tpl_easy_run', '2026-11-18', { plannedMinutes: 30, leave: RUN_LEAVE });
    const t = byId.get('tpl_easy_run')!;
    expect(dragEligibility(run, t, { logged: false, today: TODAY, periods: [PERIOD] })).toEqual({ ok: true, askAlways: 'Deze training werd korter door je periode zonder sportschool. Verplaats je hem, dan blijft hij op de nieuwe dag staan.' });
    const holiday: LeavePeriod = { id: 'p1', kind: 'no_training', startDate: '2026-11-14', endDate: '2026-11-18' };
    expect(dragEligibility({ ...run, leave: { periodId: 'p1', role: 'moved', from: '2026-11-17' } }, t, { logged: false, today: TODAY, periods: [holiday] })).toEqual({ ok: true, askAlways: LEAVE_ASK_REASON });
    const { plan } = ownerPlan();
    const sessions = [...plan.filter((x) => x.id !== 'bw17'), ps('ua17b', 'tpl_upper_a', '2026-11-17', { status: 'moved', lock }), run];
    const swap = checkSwap(drag(sessions, []), 'ua17b', 'er18');
    expect(swap.ok && swap.asks.join(' ')).toContain('Rustige duurloop werd korter door je periode zonder sportschool. Ruil je hem');
    expect(swap.ok && swap.asks.join(' ')).not.toContain('vakantie');
  });

  it('b: twee keer Bovenlichaam A in een week: de andere heeft zijn dag erbij, nooit dicht op zichzelf', () => {
    const { plan } = ownerPlan();
    const sessions = [...plan.filter((x) => x.id !== 'bw17'), ps('ua17b', 'tpl_upper_a', '2026-11-17', { status: 'moved', lock }), ps('er18', 'tpl_easy_run', '2026-11-18'), ps('ua19', 'tpl_upper_a', '2026-11-19', { status: 'moved', lock })];
    const swap = checkSwap(drag(sessions, []), 'ua17b', 'er18');
    const text = swap.ok ? swap.asks.join(' ') : '';
    expect(text).not.toMatch(/valt dicht op Bovenlichaam A\./);
    expect(text).toContain('valt dicht op Bovenlichaam A van donderdag 19.');
    // Alleen: geen tweede Bovenlichaam A, dan ook geen "dicht op".
    const alone = checkSwap(drag(sessions.filter((x) => x.id !== 'ua19'), []), 'ua17b', 'er18');
    expect(alone.ok && alone.asks.join(' ')).not.toContain('valt dicht op Bovenlichaam A');
  });

  it('c: de sleepregel bij ruilen is één feit (sportschool nodig voorop) en de korte vraag; het blad noemt alles', () => {
    const { plan } = ownerPlan();
    const run = ps('er18', 'tpl_easy_run', '2026-11-18', { plannedMinutes: 30, leave: RUN_LEAVE });
    const sessions = [...plan.filter((x) => x.id !== 'bw17'), ps('ua17b', 'tpl_upper_a', '2026-11-17', { status: 'moved', lock }), run, ps('ua19', 'tpl_upper_a', '2026-11-19', { status: 'moved', lock })];
    const ctx = drag(sessions, []);
    const check = checkSwap(ctx, 'ua17b', 'er18');
    expect(check.ok && check.asks.length).toBeGreaterThanOrEqual(3);
    const v = withSwapVerdicts(ctx, 'ua17b', dayVerdicts(ctx, 'ua17b', '2026-11-16')).find((x) => x.date === '2026-11-18')!;
    expect(v.kind).toBe('swap');
    expect(v.line).toBe('Woensdag 18 november. Bovenlichaam A: sportschool nodig, en je zit zonder sportschool. Als je loslaat, komt eerst de vraag.');
    expect(v.askReason).toBe(check.ok ? check.asks.join(' ') : '');
  });

  it('c: zonder vraag blijft de regel de ruil zelf', () => {
    const { plan } = ownerPlan();
    const ctx = drag(plan, []);
    const clean = withSwapVerdicts(ctx, 'er19', dayVerdicts(ctx, 'er19', '2026-11-16')).filter((x) => x.kind === 'swap' && !x.ask);
    expect(clean.length).toBeGreaterThan(0);
    for (const v of clean) expect(v.line).toMatch(/^[A-Z][a-z]+ \d+ november\. Ruilen met .+, die gaat naar /);
  });

  it('2: "werd korter" alleen bij een rij die echt korter staat; anders "schoof opzij"', () => {
    const t = byId.get('tpl_easy_run')!;
    const reason = (over: Partial<PlannedSession>) => {
      const e = dragEligibility(ps('er18', 'tpl_easy_run', '2026-11-18', over), t, { logged: false, today: TODAY, periods: [PERIOD] });
      return e.ok ? e.askAlways : undefined;
    };
    expect(reason({ plannedMinutes: t.durationVariants.short, leave: RUN_LEAVE })).toBe('Deze training werd korter door je periode zonder sportschool. Verplaats je hem, dan blijft hij op de nieuwe dag staan.');
    // Het merk zegt korter, maar de rij staat op volle lengte (of zonder eigen lengte): niets is korter.
    expect(reason({ leave: RUN_LEAVE })).toBe('Deze training schoof opzij voor je periode zonder sportschool. Verplaats je hem, dan blijft hij op de nieuwe dag staan.');
    expect(reason({ plannedMinutes: t.durationVariants.full, leave: RUN_LEAVE })).toContain('schoof opzij');
    expect(reason({ leave: { periodId: 'p1', role: 'moved', from: '2026-11-17' } })).toContain('schoof opzij');
  });

  it('3: schuift een andere training door de verplaatsing naar je rustdag, dan zegt het blad het', () => {
    const proposal = { resolved: false, reason: 'Bovenlichaam A schuift op.', changes: [
      { sessionId: 'ua17b', templateId: 'tpl_upper_a', templateName: 'Bovenlichaam A', fromDate: '2026-11-17', toDate: '2026-11-19' },
      { sessionId: 'ua19', templateId: 'tpl_upper_a', templateName: 'Bovenlichaam A', fromDate: '2026-11-19', toDate: '2026-11-16' },
    ] };
    const d = decideMove(proposal, { extraAsk: NO_GYM_ASK, restDay: 1 });
    expect(d.action).toBe('ask');
    expect(d.proposal.reason).toContain('Bovenlichaam A gaat naar maandag 16, je rustdag.');
    // Geen rustdag geraakt: geen regel.
    expect(decideMove(proposal, { extraAsk: NO_GYM_ASK, restDay: 3 }).proposal.reason).not.toContain('je rustdag');
  });

  it('e: laten vervallen staat er als eigen gewicht niet past (48 uur) of als de periode kracht laat vallen; anders eigen gewicht', () => {
    const { plan, logs } = ownerPlan();
    const ua18 = ps('ua18', 'tpl_upper_a', '2026-11-18', { status: 'moved', movedFromDate: '2026-11-10', lock });
    // Eigen gewicht staat op di 17: binnen 48 uur, dus vervallen.
    // Met één keuze toont het blad het effect en de wijzigingen; de naam van de keuze staat alleen bij meer keuzes.
    const near = checkInput([...plan, ua18], logs);
    const dropFix = planWeekFix(near, weekConcerns(near, '2026-11-16').find((c) => c.rule === 'NO-GYM')!, '2026-11-16')!;
    expect(dropFix.effect).toBe('Geen sportschool: Bovenlichaam A vervalt. Een sessie met je eigen gewicht past niet, want tussen twee krachtsessies zit minstens 48 uur.');
    expect(dropFix.proposal!.changes.map((c) => c.action)).toEqual(['remove']);
    // Geen kracht in de buurt: eigen gewicht op die dag (wat Lookout zag).
    const free = checkInput([...plan.filter((x) => x.id !== 'bw17'), ua18], logs);
    const fix = planWeekFix(free, weekConcerns(free, '2026-11-16').find((c) => c.rule === 'NO-GYM')!, '2026-11-16')!;
    expect(fix.effect).toBe('Geen sportschool: Bovenlichaam A wordt een korte sessie met je eigen gewicht.');
    expect(fix.proposal!.changes.map((c) => [c.action, c.newSessionDraft?.templateId])).toEqual([['remove', undefined], ['add', 'tpl_bodyweight']]);
  });

  it('Warden klein 1: een rij van jou die op een andere dag terugkomt, komt zonder slot', () => {
    const row = ps('ua18', 'tpl_upper_a', '2026-11-18', { status: 'skipped', movedFromDate: '2026-11-10', lock, leave: { periodId: 'p1', role: 'dropped', from: '2026-11-18' } });
    const add = (date: string) => applyPlanChangeItems([{ plannedSessionId: 'ua18', action: 'add', toDate: date, newSessionDraft: { templateId: 'tpl_upper_a', scheduledDate: date, weekStartDate: mondayOfWeek(date) }, leave: null }], [row]).sessions[0];
    expect(add('2026-11-18')).toMatchObject({ status: 'moved', lock: { by: 'user' }, movedFromDate: '2026-11-10' });
    const elsewhere = add('2026-11-19');
    expect(elsewhere.status).toBe('planned');
    expect(elsewhere.lock).toBeUndefined();
    expect(elsewhere.movedFromDate).toBeUndefined();
  });

  it('Warden klein 2: weghalen van de periode laat een voorbije of gelogde vervallen rij staan', () => {
    const { plan, logs } = ownerPlan();
    const LONGER: LeavePeriod = { ...PERIOD, endDate: '2026-11-20' };
    const dropped = (id: string, date: string) => ps(id, 'tpl_upper_a', date, { status: 'skipped', movedFromDate: '2026-11-10', lock, leave: { periodId: 'p1', role: 'dropped', from: date } });
    const past = dropped('uaPast', '2026-11-14');
    const done = dropped('uaDone', '2026-11-19');
    const sessions = [...plan, past, done];
    const context = (periods: LeavePeriod[]) => ({ today: TODAY, logs, templates, program, blocks: [], restDay: 1, leave: periods, newId: () => 'c' });
    const remove = planLeaveChange({ mode: 'remove', period: LONGER, existing: [LONGER], sessions, logs: [...logs, log(done)], templates, today: TODAY, context });
    const touched = remove.proposal.changes.filter((c) => c.plannedSessionId === 'uaPast' || c.plannedSessionId === 'uaDone');
    expect(touched.filter((c) => c.action === 'add')).toEqual([]);
  });
});

describe('zonder periode verandert er niets', () => {
  it('geen nogym-dag, geen vraag, geen melding', () => {
    const { plan, logs } = ownerPlan();
    const t: SessionTemplate = byId.get('tpl_upper_a')!;
    expect(keptDayReason({ restDay: 1 }, t, '2026-11-18', TODAY)).toBeUndefined();
    expect(weekConcerns(checkInput(plan, logs, { leave: [] }), '2026-11-16').some((x) => x.rule === 'NO-GYM')).toBe(false);
    const words: { id: string; proposal?: undefined }[] = [{ id: 'a' }];
    expect(withoutGymOnNoGym(words, plan, byId, [])).toEqual([{ id: 'a' }]);
    expect(addDays(TODAY, 0)).toBe(TODAY);
  });
});
