import { describe, it, expect, afterEach } from 'vitest';
import { findHeavyConflicts, isLongRunThenLegsAllowed, legSpacingDays, respectsHeavySpacing, setLongRunThenLegs, withLongRunThenLegs } from './scheduler';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

// 48 uur tussen zware beenkracht en de lange duurloop, in beide volgordes
// (docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md,
// docs/onderzoek/Lange duurloop en een zware beendag.md, vraag 4).

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const t = (id: string) => byId.get(id)!;
const ps = (templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id: `p-${templateId}-${date}`, templateId, scheduledDate: date, weekStartDate: '2026-10-12', status: 'planned', order: 0, ...extra });
// 2026-10-12 is een maandag, 2026-10-17 zaterdag, 2026-10-18 zondag.
const fits = (templateId: string, date: string, others: PlannedSession[], logs: SessionLog[] = []) => respectsHeavySpacing(date, t(templateId), others, byId, logs);
const log = (session: PlannedSession, rpe: number): SessionLog => ({ id: `l-${session.id}`, plannedSessionId: session.id, templateId: session.templateId, type: 'cardio', completedDate: session.scheduledDate, completedAt: '', variant: 'full', durationMinutes: 90, source: 'manual', rpe });

afterEach(() => setLongRunThenLegs(false));

describe('zware beenkracht en de lange duurloop: 48 uur', () => {
  it('lange duurloop eerst: Benen A de dag erna botst, twee dagen erna mag', () => {
    const long = [ps('tpl_long_run', '2026-10-18')];
    expect(fits('tpl_lower_a', '2026-10-19', long)).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-20', long)).toBe(true);
  });

  it('Benen A eerst: de lange duurloop de dag erna botst, twee dagen erna mag', () => {
    const legs = [ps('tpl_lower_a', '2026-10-16')];
    expect(fits('tpl_long_run', '2026-10-17', legs)).toBe(false);
    expect(fits('tpl_long_run', '2026-10-18', legs)).toBe(true);
  });

  it('ook vanaf de andere kant gezien: de lange duurloop plaatsen naast Benen A', () => {
    expect(fits('tpl_long_run', '2026-10-18', [ps('tpl_lower_a', '2026-10-19')])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-17', [ps('tpl_long_run', '2026-10-18')])).toBe(false);
  });

  it('legSpacingDays geeft 1 in beide volgordes', () => {
    expect(legSpacingDays(t('tpl_long_run'), t('tpl_lower_a'))).toBe(1);
    expect(legSpacingDays(t('tpl_lower_a'), t('tpl_long_run'))).toBe(1);
    expect(legSpacingDays(t('tpl_long_run'), t('tpl_lower_b'))).toBe(1);
  });
});

describe('wat blijft zoals het was', () => {
  it('het weekendblok: heuvels zaterdag, lange duurloop zondag, alleen in die volgorde', () => {
    expect(fits('tpl_long_run', '2026-10-18', [ps('tpl_hill_intervals', '2026-10-17')])).toBe(true);
    expect(fits('tpl_hill_intervals', '2026-10-17', [ps('tpl_long_run', '2026-10-18')])).toBe(true);
    // Andersom (lange loop zaterdag, heuvels zondag) is twee zware beendagen achter elkaar.
    expect(fits('tpl_hill_intervals', '2026-10-18', [ps('tpl_long_run', '2026-10-17')])).toBe(false);
  });

  it('72 uur na een bergtocht, ook voor de lange duurloop', () => {
    const hike = [ps('tpl_mountain_hike', '2026-10-12')];
    expect(fits('tpl_lower_a', '2026-10-14', hike)).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-15', hike)).toBe(true);
    expect(legSpacingDays(t('tpl_mountain_hike'), t('tpl_long_run'))).toBe(2);
  });

  it('48 uur tussen heuvels met afdalen en kracht, en tussen twee krachtdagen voor de benen', () => {
    expect(fits('tpl_lower_a', '2026-10-13', [ps('tpl_hills_descent', '2026-10-12')])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-14', [ps('tpl_hills_descent', '2026-10-12')])).toBe(true);
    expect(fits('tpl_lower_b', '2026-10-13', [ps('tpl_lower_a', '2026-10-12')])).toBe(false);
    expect(fits('tpl_lower_b', '2026-10-14', [ps('tpl_lower_a', '2026-10-12')])).toBe(true);
  });

  it('een gelogde RPE van 9 op de lange duurloop maakt er 72 uur van', () => {
    const long = ps('tpl_long_run', '2026-10-18');
    expect(fits('tpl_lower_a', '2026-10-20', [long], [log(long, 9)])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-21', [long], [log(long, 9)])).toBe(true);
    expect(fits('tpl_lower_a', '2026-10-20', [long], [log(long, 7)])).toBe(true);
  });
});

describe('instelling: Beenkracht de dag na de lange duurloop', () => {
  it('staat standaard uit', () => {
    expect(isLongRunThenLegsAllowed()).toBe(false);
  });

  it('aan: lange duurloop zondag, Benen A maandag mag', () => {
    setLongRunThenLegs(true);
    expect(fits('tpl_lower_a', '2026-10-19', [ps('tpl_long_run', '2026-10-18')])).toBe(true);
    expect(legSpacingDays(t('tpl_long_run'), t('tpl_lower_a'))).toBe(0);
  });

  it('aan: de andere volgorde blijft 48 uur', () => {
    setLongRunThenLegs(true);
    expect(fits('tpl_long_run', '2026-10-17', [ps('tpl_lower_a', '2026-10-16')])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-17', [ps('tpl_long_run', '2026-10-18')])).toBe(false);
    expect(legSpacingDays(t('tpl_lower_a'), t('tpl_long_run'))).toBe(1);
  });

  it('aan: niet als de dag vóór de lange duurloop al beenzwaar is, zodat er nooit drie op rij komen', () => {
    setLongRunThenLegs(true);
    const weekend = [ps('tpl_hill_intervals', '2026-10-17'), ps('tpl_long_run', '2026-10-18')];
    expect(fits('tpl_lower_a', '2026-10-19', weekend)).toBe(false);
    // Ook als de lange duurloop zelf wordt geplaatst, met heuvels ervoor en Benen A erna.
    expect(fits('tpl_long_run', '2026-10-18', [ps('tpl_hill_intervals', '2026-10-17'), ps('tpl_lower_a', '2026-10-19')])).toBe(false);
    // En vanaf de andere kant: heuvels plaatsen voor een lange loop met Benen A de dag erna.
    expect(fits('tpl_hill_intervals', '2026-10-17', [ps('tpl_long_run', '2026-10-18'), ps('tpl_lower_a', '2026-10-19')])).toBe(false);
    expect(respectsHeavySpacing('2026-10-16', t('tpl_hills_descent'), [ps('tpl_long_run', '2026-10-17'), ps('tpl_lower_a', '2026-10-18')], byId)).toBe(false);
    const clash = findHeavyConflicts('nieuw', t('tpl_hill_intervals'), '2026-10-17', [ps('tpl_long_run', '2026-10-18'), ps('tpl_lower_a', '2026-10-19')], byId);
    expect(clash.map((c) => c.templateId)).toEqual(['tpl_lower_a']);
    // Zonder de instelling botst Benen A daar al met de lange loop; de heuvels zelf staan dan vrij van Benen A.
    setLongRunThenLegs(false);
    expect(fits('tpl_hill_intervals', '2026-10-17', [ps('tpl_long_run', '2026-10-18'), ps('tpl_lower_a', '2026-10-19')])).toBe(true);
    setLongRunThenLegs(true);
    // Een lichte dag ervoor telt niet.
    expect(fits('tpl_lower_a', '2026-10-19', [ps('tpl_easy_run', '2026-10-17'), ps('tpl_long_run', '2026-10-18')])).toBe(true);
    // Een overgeslagen heuvelsessie telt ook niet.
    expect(fits('tpl_lower_a', '2026-10-19', [ps('tpl_hill_intervals', '2026-10-17', { status: 'skipped' }), ps('tpl_long_run', '2026-10-18')])).toBe(true);
  });

  it('aan: een gelogde RPE van 9 houdt de extra dag', () => {
    setLongRunThenLegs(true);
    const long = ps('tpl_long_run', '2026-10-18');
    expect(fits('tpl_lower_a', '2026-10-19', [long], [log(long, 9)])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-20', [long], [log(long, 9)])).toBe(true);
  });

  it('aan: twee krachtdagen en een bergtocht veranderen niet', () => {
    setLongRunThenLegs(true);
    expect(fits('tpl_lower_b', '2026-10-13', [ps('tpl_lower_a', '2026-10-12')])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-14', [ps('tpl_mountain_hike', '2026-10-12')])).toBe(false);
  });

  it('withLongRunThenLegs geldt maar voor één aanroep', () => {
    expect(withLongRunThenLegs(true, () => isLongRunThenLegsAllowed())).toBe(true);
    expect(isLongRunThenLegsAllowed()).toBe(false);
    expect(withLongRunThenLegs(undefined, () => isLongRunThenLegsAllowed())).toBe(false);
    expect(() => withLongRunThenLegs(true, () => { throw new Error('x'); })).toThrow();
    expect(isLongRunThenLegsAllowed()).toBe(false);
  });
});

describe('een week met Benen A op maandag na de lange duurloop', () => {
  // Je kijkt op maandag: de lange duurloop van gisteren is voorbij, Benen A staat vandaag. Woensdag is vrij.
  const SUNDAY = '2026-10-25';
  const MONDAY = '2026-10-26';
  const TODAY = MONDAY;
  const DAYS = ['tpl_lower_a', 'tpl_upper_a', null, 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
  const week: PlannedSession[] = [
    { id: 'zo-long', templateId: 'tpl_long_run', scheduledDate: SUNDAY, weekStartDate: '2026-10-19', status: 'planned', order: 0 },
    { id: 'za-hills', templateId: 'tpl_hill_intervals', scheduledDate: addDays(SUNDAY, -1), weekStartDate: '2026-10-19', status: 'planned', order: 0 },
    ...DAYS.flatMap((templateId, i): PlannedSession[] => (templateId ? [{ id: `w-${i}`, templateId, scheduledDate: addDays(MONDAY, i), weekStartDate: MONDAY, status: 'planned', order: i }] : [])),
  ];
  const budget = { preferredMinutes: 90, softFlexMinutes: 15 };
  const dailyTimeBudget = { mon: budget, tue: budget, wed: budget, thu: { preferredMinutes: 10, softFlexMinutes: 15 }, fri: budget, sat: { preferredMinutes: 200, softFlexMinutes: 30 }, sun: { preferredMinutes: 200, softFlexMinutes: 30 } };
  const input = (list: PlannedSession[]): CheckInput => ({ sessions: list, logs: [], templates, today: TODAY, restDay: 4, goalDay: '2027-08-01', dailyTimeBudget });
  const legSpacing = (list: PlannedSession[]) => validateWeeks(input(list)).filter((f) => f.rule === 'LEG-SPACING');

  it('de weekcontrole ziet Benen A te dicht op de lange duurloop', () => {
    const found = legSpacing(week);
    expect(found).toEqual([expect.objectContaining({ sessionIds: ['zo-long', 'w-0'], subjectId: 'w-0', level: 3 })]);
    expect(found[0].message).toContain('te dicht op elkaar');
  });

  it('wat het systeem plande schuift naar een dag met 48 uur ertussen, en een tweede ronde doet niets', () => {
    const r = repairWeeks(input(week));
    const legs = r.sessions.find((s) => s.id === 'w-0')!;
    expect(legs.scheduledDate).toBe('2026-10-28');
    expect(respectsHeavySpacing(legs.scheduledDate, t('tpl_lower_a'), r.sessions, byId, [], legs.id)).toBe(true);
    expect(r.repairs.map((x) => x.sessionId)).toEqual(['w-0']);
    expect(r.remaining.filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
    // De lange duurloop en de heuvels blijven op hun dag.
    expect(r.sessions.find((s) => s.id === 'zo-long')!.scheduledDate).toBe(SUNDAY);
    expect(r.sessions.find((s) => s.id === 'w-6')!.scheduledDate).toBe(addDays(MONDAY, 6));
    expect(repairWeeks(input(r.sessions)).repairs).toEqual([]);
  });

  it('wat jij of een voorstel vastzette blijft staan, en Week meldt het', () => {
    for (const by of ['user', 'proposal'] as const) {
      const locked = week.map((s) => (s.id === 'w-0' ? { ...s, lock: { by, at: '' } } : s));
      const r = repairWeeks(input(locked));
      expect(r.sessions.find((s) => s.id === 'w-0')!.scheduledDate).toBe(MONDAY);
      expect(r.repairs.filter((x) => x.sessionId === 'w-0')).toEqual([]);
      expect(r.remaining.filter((f) => f.rule === 'LEG-SPACING')).toEqual([expect.objectContaining({ sessionIds: ['zo-long', 'w-0'], level: 1 })]);
    }
  });

  it('wat al gelogd is, wordt nooit aangeraakt', () => {
    const logs: SessionLog[] = [{ id: 'l-mon', plannedSessionId: 'w-0', templateId: 'tpl_lower_a', type: 'strength', completedDate: MONDAY, completedAt: '', variant: 'full', durationMinutes: 60, source: 'manual' }];
    const r = repairWeeks({ ...input(week), logs, today: '2026-10-27' });
    expect(validateWeeks({ ...input(week), logs, today: '2026-10-27' }).filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
    expect(r.sessions.find((s) => s.id === 'w-0')!.scheduledDate).toBe(MONDAY);
    expect(r.repairs.filter((x) => x.sessionId === 'w-0' || x.sessionId === 'zo-long')).toEqual([]);
  });

  it('met de instelling aan blijft Benen A ook staan, behalve na het weekendblok', () => {
    setLongRunThenLegs(true);
    // Met heuvels op zaterdag zouden het drie beendagen op rij worden.
    expect(legSpacing(week).length).toBe(1);
    // Zonder heuvels op zaterdag mag maandag.
    const noHills = week.filter((s) => s.id !== 'za-hills');
    expect(legSpacing(noHills)).toEqual([]);
  });
});
