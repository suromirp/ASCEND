import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';
import { applyPlanChangeItems } from './proposalEngine';
import { weekConcerns } from './weekConcerns';
import { adviceSessionIds, planWeekFix, weekNotice } from './weekFixProposal';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21';
const MONDAY = '2026-10-26';
const lock = { by: 'proposal' as const, at: '2026-10-20T10:00:00.000Z' };
const week = (ids: string[]): PlannedSession[] => ids.map((templateId, i) => ({ id: `w-${i}`, templateId, scheduledDate: addDays(MONDAY, i), weekStartDate: MONDAY, status: 'moved', order: i, lock }));
const input = (sessions: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions, logs: [], templates, today: TODAY, restDay: 4, goalDay: '2027-08-01', ...over });
// Het nagemaakte geval: elke dag een training, alles vastgezet door een geaccepteerd voorstel, de rustdag is donderdag.
const FULL = ['tpl_long_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hills_descent', 'tpl_long_run'];

describe('mayMove', () => {
  it('zonder de optie raakt de controle jouw training niet aan', () => {
    expect(repairWeeks(input(week(FULL), { reportYours: true })).repairs).toEqual([]);
  });
  it('met de optie herstelt ze alleen die training, en alleen die van jou', () => {
    const list = week(FULL).map((s) => (s.id === 'w-3' ? { ...s, scheduledDate: '2026-10-29' } : s));
    const r = repairWeeks(input(list, { reportYours: true, mayMove: ['w-3'] }));
    expect(r.repairs.every((x) => x.sessionId === 'w-3')).toBe(true);
    expect(r.repairs.length).toBeGreaterThan(0);
    const past = repairWeeks(input(week(FULL), { reportYours: true, mayMove: ['w-3'], today: '2026-10-30' }));
    expect(past.repairs).toEqual([]);
  });
});

describe('planWeekFix, een week zonder rustdag', () => {
  const sessions = week(FULL);
  const concerns = weekConcerns(input(sessions), MONDAY);
  const rest = concerns.find((c) => c.rule === 'REST-DAY')!;

  it('stelt voor de Rustige duurloop op donderdag te laten vervallen, met Akkoord en zonder iets te verplaatsen', () => {
    const advice = planWeekFix(input(sessions), rest, MONDAY)!;
    expect(advice).toMatchObject({ ruleId: 'WEEK-CHECK', trigger: 'plan_update', title: 'Je week heeft geen rustdag' });
    expect(advice.id).toBe('weekfix:REST-DAY:w-3:2026-10-29');
    expect(advice.effect).toBe('Laat de rustige duurloop op donderdag 29 gaan. Dan heb je donderdag vrij.');
    expect(advice.proposal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'w-3', action: 'remove', fromDate: '2026-10-29' })]);
    expect(advice.proposal!.changes[0].restore).toBeUndefined();
  });

  it('na Akkoord is er geen rustdagmelding meer', () => {
    const advice = planWeekFix(input(sessions), rest, MONDAY)!;
    const after = applyPlanChangeItems(advice.proposal!.changes, sessions, () => 'x', { by: 'proposal', at: 'nu' }).sessions;
    expect(validateWeeks({ ...input(after), reportYours: true }).some((f) => f.rule === 'REST-DAY')).toBe(false);
    expect(weekConcerns(input(after), MONDAY).some((c) => c.rule === 'REST-DAY')).toBe(false);
  });

  it('laat de planning zelf ongemoeid: zonder Akkoord blijft alles staan', () => {
    const copy = JSON.stringify(sessions);
    planWeekFix(input(sessions), rest, MONDAY);
    expect(JSON.stringify(sessions)).toBe(copy);
  });

  it('een lange duurloop, harde loop of beendag op de rustdag wordt nooit zomaar laten vervallen', () => {
    const hard = week(['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_hills_descent', 'tpl_upper_b', 'tpl_easy_run', 'tpl_easy_run']);
    const c = weekConcerns(input(hard), MONDAY).find((x) => x.rule === 'REST-DAY')!;
    const advice = planWeekFix(input(hard), c, MONDAY);
    for (const o of advice?.options ?? [advice!]) {
      const removed = (o.proposal ?? advice!.proposal)!.changes.filter((x) => x.action === 'remove').map((x) => x.plannedSessionId);
      expect(removed).not.toContain('w-3');
      expect(removed).not.toContain('w-2');
    }
  });

  it('twee volle lange duurlopen: de latere wordt de korte versie', () => {
    const long = concerns.find((c) => c.rule === 'ONE-LONG')!;
    const advice = planWeekFix(input(sessions), long, MONDAY)!;
    expect(advice.proposal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'w-6', action: 'move', fromDate: '2026-11-01', toDate: '2026-11-01', plannedMinutes: expect.any(Number) })]);
    expect(advice.effect).toMatch(/^Lange duurloop op zondag 1 wordt de korte versie, \d+ minuten\.$/);
  });

  it('een week zonder oplossing geeft geen voorstel', () => {
    const noShort = templates.map((t) => (t.id === 'tpl_long_run' ? { ...t, durationVariants: { ...t.durationVariants, short: undefined } } : t));
    const long = weekConcerns(input(sessions, { templates: noShort }), MONDAY).find((c) => c.rule === 'ONE-LONG')!;
    expect(planWeekFix(input(sessions, { templates: noShort }), long, MONDAY)).toBeNull();
  });
});

describe('weekNotice naast de voorstellen van Vandaag', () => {
  const sessions = week(FULL);
  const advice = (id: string, changeId: string) => ({
    id, trigger: 'plan_update' as const, ruleId: 'TEST-RETRY', title: 't', effect: 'e', why: 'w', priority: 1,
    proposal: { id: 'p', trigger: 'plan_check' as const, issue: 'i', changes: [{ plannedSessionId: changeId, action: 'move' as const, fromDate: '2026-10-29', toDate: '2026-10-30', reason: 'r', generatedBy: [] }], alternatives: [], consequences: '', explanation: '', createdAt: '' },
  });

  it('verzamelt de ids uit wijzigingen, opties en de test van TEST-MAKE-ROOM', () => {
    const a = { ...advice('testroom:t-9', 'w-1'), options: [{ label: 'x', effect: 'y', proposal: advice('x', 'w-2').proposal }] };
    expect([...adviceSessionIds([a])].sort()).toEqual(['t-9', 'w-1', 'w-2']);
  });

  it('geeft geen eigen voorstel als Vandaag er al een heeft voor dezelfde training', () => {
    const open = weekNotice(input(sessions), MONDAY, true);
    expect(Object.keys(open.fixes)).toContain('REST-DAY:w-3');
    const taken = adviceSessionIds([advice('a', 'w-3')]);
    const n = weekNotice(input(sessions), MONDAY, true, taken);
    expect(n.fixes['REST-DAY:w-3']).toBeUndefined();
    expect(n.covered).toContain('REST-DAY:w-3');
    expect(n.concerns.length).toBe(open.concerns.length);
  });

  it('laat een voorstel staan als het een andere training betreft', () => {
    const n = weekNotice(input(sessions), MONDAY, true, adviceSessionIds([advice('a', 'ander')]));
    expect(n.covered).toEqual([]);
    expect(n.fixes['REST-DAY:w-3']).toBeDefined();
  });

  it('de test van TEST-MAKE-ROOM telt ook als de test zelf niet verschuift', () => {
    const n = weekNotice(input(sessions), MONDAY, true, adviceSessionIds([advice('testroom:w-3', 'w-0')]));
    expect(n.covered).toContain('REST-DAY:w-3');
  });
});

describe('planWeekFix, testloop en lange duurloop op een dag', () => {
  const userLock = { by: 'user' as const, at: '2026-10-20T10:00:00.000Z' };
  const sessions: PlannedSession[] = [
    { id: 't', templateId: 'tpl_test_run', scheduledDate: '2026-10-27', weekStartDate: MONDAY, status: 'planned', order: 0, lock: userLock },
    { id: 'l', templateId: 'tpl_long_run', scheduledDate: '2026-10-27', weekStartDate: MONDAY, status: 'planned', order: 1, lock: userLock },
  ];

  it('stelt de lange duurloop naar een andere dag voor, zonder iets stil te veranderen', () => {
    const copy = JSON.stringify(sessions);
    const concern = weekConcerns(input(sessions), MONDAY).find((c) => c.rule === 'TEST-DAY')!;
    const advice = planWeekFix(input(sessions), concern, MONDAY);
    expect(JSON.stringify(sessions)).toBe(copy);
    expect(advice).not.toBeNull();
    // Alleen de lange duurloop gaat mee, nooit de testloop, en pas na Akkoord.
    expect(advice!.effect).toBe('Lange duurloop gaat van dinsdag 27 naar vrijdag 30.');
    expect(advice!.proposal!.changes.every((c) => c.plannedSessionId === 'l')).toBe(true);
    const after = applyPlanChangeItems(advice!.proposal!.changes, sessions, () => 'x', { by: 'proposal', at: 'nu' }).sessions;
    expect(validateWeeks({ ...input(after), reportYours: true }).some((f) => f.rule === 'TEST-DAY')).toBe(false);
  });
});

describe('planWeekFix, testdag in een volle week', () => {
  // Nagemaakt: de rustdag is maandag maar er staat kracht op, dinsdag de testloop en een lange duurloop die jij
  // erbij zette, woensdag een zware beendag, donderdag rustig, vrijdag bovenlichaam, zaterdag heuvels en zondag
  // weer een lange duurloop. Verplaatsen lost niets op zonder iets nieuws: weghalen is de laatste keuze.
  const userLock = { by: 'user' as const, at: '2026-10-20T10:00:00.000Z' };
  const row = (id: string, templateId: string, day: number, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: addDays(MONDAY, day), weekStartDate: MONDAY, status: 'planned', order: day, ...over });
  const sessions: PlannedSession[] = [
    row('ma', 'tpl_upper_a', 0, { lock: userLock }),
    row('t', 'tpl_test_run', 1, { lock: userLock }),
    row('l', 'tpl_long_run', 1, { lock: userLock, order: 9 }),
    row('wo', 'tpl_lower_a', 2),
    row('do', 'tpl_easy_run', 3),
    row('vr', 'tpl_upper_b', 4),
    row('za', 'tpl_hills_descent', 5),
    row('zo', 'tpl_long_run', 6),
  ];
  const full = (over: Partial<CheckInput> = {}) => input(sessions, { restDay: 1, ...over });
  const concernOf = (i: CheckInput) => weekConcerns(i, MONDAY).find((c) => c.rule === 'TEST-DAY');
  const proposalsOf = (i: CheckInput) => {
    const c = concernOf(i);
    const advice = c ? planWeekFix(i, c, MONDAY) : null;
    return advice ? advice.options?.map((o) => o.proposal!) ?? [advice.proposal!] : [];
  };

  it('biedt het weghalen van de lange duurloop op dinsdag aan, met Akkoord', () => {
    const copy = JSON.stringify(sessions);
    expect(concernOf(full())).toBeDefined();
    const all = proposalsOf(full());
    expect(JSON.stringify(sessions)).toBe(copy);
    const removal = all.find((p) => p.changes.some((c) => c.action === 'remove'))!;
    expect(removal).toBeDefined();
    expect(removal.changes).toEqual([expect.objectContaining({ plannedSessionId: 'l', action: 'remove', fromDate: '2026-10-27' })]);
    expect(removal.consequences).toBe('Laat de lange duurloop op dinsdag 27 gaan. Je houdt de lange duurloop op zondag 1.');
    // Nooit de test, nooit de lange duurloop van zondag.
    for (const p of all) for (const c of p.changes) expect(['t', 'zo']).not.toContain(c.plannedSessionId);
    // Weghalen is de laatste keuze.
    expect(all.at(-1)).toBe(removal);
    // In deze week lost verplaatsen niets op: weghalen is de enige keuze.
    expect(all).toHaveLength(1);
    const after = applyPlanChangeItems(removal.changes, sessions, () => 'x', { by: 'proposal', at: 'nu' }).sessions;
    expect(validateWeeks({ ...full({ sessions: after }), reportYours: true }).some((f) => f.rule === 'TEST-DAY')).toBe(false);
    expect(after.find((s) => s.id === 'zo')).toEqual(sessions.find((s) => s.id === 'zo'));
  });

  it('haalt niets weg zonder tweede sessie met dezelfde rol in de week', () => {
    const i = input(sessions.filter((s) => s.id !== 'zo'), { restDay: 1 });
    for (const p of proposalsOf(i)) expect(p.changes.some((c) => c.action === 'remove')).toBe(false);
  });

  it('haalt een training die het systeem plande niet weg via deze weg', () => {
    const i = input(sessions.map((s) => (s.id === 'l' ? { ...s, lock: undefined } : s)), { restDay: 1 });
    for (const p of proposalsOf(i)) expect(p.changes.some((c) => c.action === 'remove')).toBe(false);
  });
});

describe('een training van jou of van een voorstel op een vakantiedag', () => {
  const leave = [{ id: 'v', kind: 'no_training' as const, startDate: '2026-10-27', endDate: '2026-10-29' }];
  const base = (ids: string[]) => input(ids.map((templateId, i) => ({ id: `l-${i}`, templateId, scheduledDate: addDays(MONDAY, 1 + i), weekStartDate: MONDAY, status: 'moved' as const, order: i, lock })), { leave, reportYours: true });

  it('de stille weekcontrole laat een test en een race staan die een voorstel op een vakantiedag zette', () => {
    const inp = base(['tpl_test_run', 'tpl_race']);
    const r = repairWeeks(inp);
    expect(r.repairs).toEqual([]);
    expect(r.sessions.map((s) => s.scheduledDate)).toEqual(inp.sessions.map((s) => s.scheduledDate));
  });

  it('kracht van een voorstel blijft in de planning staan en wordt in Week een melding met een voorstel met Akkoord', () => {
    const inp = base(['tpl_easy_run', 'tpl_upper_b']);
    expect(repairWeeks({ ...inp, reportYours: false }).repairs).toEqual([]);
    const concerns = weekConcerns(inp, MONDAY).filter((c) => c.rule === 'LEAVE-OFF');
    expect(concerns.length).toBeGreaterThan(0);
    const advice = planWeekFix(inp, concerns[0], MONDAY);
    expect(advice).not.toBeNull();
    expect(advice!.proposal!.changes.length).toBeGreaterThan(0);
    expect(inp.sessions.every((s) => s.status === 'moved')).toBe(true);
  });

  it('een test op een vakantiedag is alleen een melding, zonder voorstel dat hem verplaatst', () => {
    const inp = base(['tpl_easy_run', 'tpl_test_run']);
    const concern = weekConcerns(inp, MONDAY).find((c) => c.rule === 'LEAVE-OFF' && c.finding.subjectId === 'l-1');
    expect(concern).toBeDefined();
    expect(planWeekFix(inp, concern!, MONDAY)).toBeNull();
  });
});

describe('planWeekFix, twee zware beendagen met een tweede lange duurloop in de week', () => {
  // Nagemaakt, met verschoven datums: de rustdag is maandag. Een eerder voorstel zette de lange duurloop van de week
  // ervoor kort (45 minuten) in deze week, op dinsdag; zelf zette je de heuvels op maandag, Bovenlichaam A op woensdag
  // en Benen A op vrijdag. Donderdag de testloop, zaterdag vrij, zondag de eigen lange duurloop van de week.
  // Zaterdag past niet: de dag na Benen A en de dag voor de lange duurloop. Verplaatsen lost niets op; de lange
  // duurloop van dinsdag laten gaan wel, want de week houdt die van zondag.
  const userLock = { by: 'user' as const, at: '2026-10-25T20:00:00.000Z' };
  const row = (id: string, templateId: string, day: number, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: addDays(MONDAY, day), weekStartDate: MONDAY, status: 'planned', order: day, ...over });
  const sessions: PlannedSession[] = [
    row('rust', 'tpl_herstel', 0, { status: 'skipped', lock }),
    row('heuvel', 'tpl_hills_descent', 0, { status: 'moved', lock: userLock, movedFromDate: addDays(MONDAY, 5) }),
    row('lang-kort', 'tpl_long_run', 1, { status: 'moved', lock: userLock, plannedMinutes: 45, movedFromDate: addDays(MONDAY, -1) }),
    row('boven-a', 'tpl_upper_a', 2, { status: 'moved', lock: userLock }),
    row('test', 'tpl_test_run', 3, { status: 'moved', lock, plannedMinutes: 45 }),
    row('rustig', 'tpl_easy_run', 3, { status: 'skipped', lock }),
    row('benen', 'tpl_lower_a', 4, { status: 'moved', lock: userLock }),
    row('boven-b', 'tpl_upper_b', 4, { order: 9 }),
    row('lang', 'tpl_long_run', 6),
  ];
  const at = (over: Partial<CheckInput> = {}) => input(sessions, { today: MONDAY, restDay: 1, ...over });
  const concernOf = (i: CheckInput) => weekConcerns(i, MONDAY).find((c) => c.rule === 'LEG-SPACING');
  const proposalsOf = (i: CheckInput) => {
    const c = concernOf(i);
    const advice = c ? planWeekFix(i, c, MONDAY) : null;
    return advice ? advice.options?.map((o) => o.proposal!) ?? [advice.proposal!] : [];
  };

  it('meldt de heuvels en de lange duurloop achter elkaar', () => {
    const c = concernOf(at());
    expect(c).toBeDefined();
    expect([...c!.finding.sessionIds].sort()).toEqual(['heuvel', 'lang-kort']);
  });

  it('zaterdag lost het niet op: te dicht op Benen A en op de lange duurloop van zondag', () => {
    for (const id of ['heuvel', 'lang-kort']) {
      const moved = sessions.map((s) => (s.id === id ? { ...s, scheduledDate: addDays(MONDAY, 5) } : s));
      const after = validateWeeks({ ...at({ sessions: moved }), reportYours: true }, new Set([MONDAY]));
      expect(after.some((f) => f.rule === 'LEG-SPACING' && f.sessionIds.includes(id))).toBe(true);
    }
  });

  it('biedt als laatste keuze aan de extra lange duurloop van dinsdag te laten gaan, met Akkoord', () => {
    const copy = JSON.stringify(sessions);
    const all = proposalsOf(at());
    expect(JSON.stringify(sessions)).toBe(copy);
    const removal = all.find((p) => p.changes.some((c) => c.action === 'remove'));
    expect(removal).toBeDefined();
    expect(all.at(-1)).toBe(removal);
    expect(removal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'lang-kort', action: 'remove', fromDate: addDays(MONDAY, 1) })]);
    expect(removal!.consequences).toBe('Laat de lange duurloop op dinsdag 27 gaan. Dan heb je dinsdag vrij. Je houdt de lange duurloop op zondag 1.');
    // Nooit de test, nooit de lange duurloop van zondag, nooit iets van het systeem zelf.
    for (const p of all) for (const c of p.changes) expect(['test', 'lang', 'boven-b']).not.toContain(c.plannedSessionId);
    const after = applyPlanChangeItems(removal!.changes, sessions, () => 'x', { by: 'proposal', at: 'nu' }).sessions;
    expect(validateWeeks({ ...at({ sessions: after }), reportYours: true }, new Set([MONDAY])).some((f) => f.rule === 'LEG-SPACING')).toBe(false);
    expect(after.find((s) => s.id === 'lang')).toEqual(sessions.find((s) => s.id === 'lang'));
  });

  it('haalt niets weg als de week geen tweede lange duurloop heeft', () => {
    const i = at({ sessions: sessions.filter((s) => s.id !== 'lang') });
    for (const p of proposalsOf(i)) expect(p.changes.some((c) => c.action === 'remove')).toBe(false);
  });

  it('haalt de heuvels niet weg: die hebben geen tweede in de week', () => {
    for (const p of proposalsOf(at())) expect(p.changes.some((c) => c.action === 'remove' && c.plannedSessionId === 'heuvel')).toBe(false);
  });

  it('laat altijd de kortste gaan: de volle eerst en de korte later geeft geen weghalen', () => {
    // Andersom dan hierboven: dinsdag de volle lange duurloop van jou, zondag een korte.
    const swapped = sessions.map((s) => {
      if (s.id === 'lang-kort') { const { plannedMinutes: _drop, ...rest } = s; void _drop; return rest; }
      if (s.id === 'lang') return { ...s, plannedMinutes: 45 };
      return s;
    });
    const i = at({ sessions: swapped });
    expect(concernOf(i)).toBeDefined();
    for (const p of proposalsOf(i)) expect(p.changes.some((c) => c.action === 'remove')).toBe(false);
  });

  it('biedt het weghalen niet aan als verplaatsen iets oplevert', () => {
    // Zaterdag zonder Benen A op vrijdag en zonder lange duurloop op zondag: de lange duurloop van dinsdag kan
    // gewoon verschuiven, dus geen weghalen. De tweede lange duurloop staat dan op woensdag, met Bovenlichaam A op donderdag.
    const roomy = sessions
      .filter((s) => s.id !== 'benen' && s.id !== 'test' && s.id !== 'rustig')
      .map((s) => (s.id === 'lang' ? { ...s, scheduledDate: addDays(MONDAY, 3), lock: userLock, status: 'moved' as const } : s.id === 'boven-a' ? { ...s, scheduledDate: addDays(MONDAY, 4) } : s));
    const all = proposalsOf(at({ sessions: roomy }));
    expect(all.length).toBeGreaterThan(0);
    for (const p of all) expect(p.changes.some((c) => c.action === 'remove')).toBe(false);
  });

  it('een zelf verplaatste bergtocht valt nooit weg om een lange duurloop', () => {
    // Zaterdag een bergtocht die jij daar zette, de dag na Benen A; zondag de lange duurloop (zelfde taak "lang").
    const hike: PlannedSession[] = [
      row('benen', 'tpl_lower_a', 4, { status: 'moved', lock: userLock }),
      row('berg', 'tpl_mountain_hike', 5, { status: 'moved', lock: userLock, plannedMinutes: 60 }),
      row('lang', 'tpl_long_run', 6),
      ...[0, 1, 2, 3].map((d) => row(`vol-${d}`, d % 2 ? 'tpl_upper_a' : 'tpl_upper_b', d, { status: 'moved', lock: userLock })),
    ];
    const i = at({ sessions: hike });
    expect(concernOf(i)).toBeDefined();
    for (const p of proposalsOf(i)) expect(p.changes.some((c) => c.action === 'remove' && c.plannedSessionId === 'berg')).toBe(false);
  });

  it('een wandeldag van een tocht valt niet weg om een andere dag van die tocht', () => {
    const mark = { periodId: 'tocht', role: 'placed' as const, from: addDays(MONDAY, 5) };
    const trek: PlannedSession[] = [
      row('benen', 'tpl_lower_a', 4, { status: 'moved', lock: userLock }),
      row('tocht-1', 'tpl_mountain_hike', 5, { status: 'moved', lock: userLock, leave: mark }),
      row('tocht-2', 'tpl_mountain_hike', 6, { status: 'moved', lock: userLock, leave: { ...mark, from: addDays(MONDAY, 6) } }),
      ...[0, 1, 2, 3].map((d) => row(`vol-${d}`, d % 2 ? 'tpl_upper_a' : 'tpl_upper_b', d, { status: 'moved', lock: userLock })),
    ];
    expect(concernOf(at({ sessions: trek }))).toBeDefined();
    for (const p of proposalsOf(at({ sessions: trek }))) expect(p.changes.some((c) => c.action === 'remove' && c.plannedSessionId?.startsWith('tocht'))).toBe(false);
  });

  it('een lange duurloop met het merkteken van een vakantie valt zo niet weg', () => {
    const marked = sessions.map((s) => (s.id === 'lang-kort' ? { ...s, leave: { periodId: 'vakantie', role: 'moved' as const, from: addDays(MONDAY, -1) } } : s));
    expect(concernOf(at({ sessions: marked }))).toBeDefined();
    for (const p of proposalsOf(at({ sessions: marked }))) expect(p.changes.some((c) => c.action === 'remove')).toBe(false);
  });
});
