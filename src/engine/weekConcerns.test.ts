import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';
import { noticeHeadline, rowNotes, weekConcerns } from './weekConcerns';
import { validateWeeks, type CheckInput } from './weekValidator';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21'; // woensdag
const MONDAY = '2026-10-26';
const lock = { by: 'proposal' as const, at: '2026-10-20T10:00:00.000Z' };

// Het nagemaakte geval: een week zonder rustdag na een geaccepteerd voorstel. Alles heeft een slot.
const FULL = ['tpl_long_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hills_descent', 'tpl_long_run'];
export const fullWeek = (monday = MONDAY, ids = FULL): PlannedSession[] => ids.map((templateId, i) => ({ id: `w-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'moved', order: i, lock }));
const input = (sessions: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions, logs: [], templates, today: TODAY, restDay: 4, goalDay: '2027-08-01', ...over });

describe('reportYours', () => {
  it('zonder de optie meldt de controle een training met jouw slot op je rustdag niet', () => {
    expect(validateWeeks(input(fullWeek())).some((f) => f.rule === 'REST-DAY')).toBe(false);
  });
  it('met de optie wel, en alleen op de rustdag', () => {
    const f = validateWeeks(input(fullWeek()), undefined).concat(validateWeeks({ ...input(fullWeek()), reportYours: true }));
    const rest = f.filter((x) => x.rule === 'REST-DAY');
    expect(rest).toHaveLength(1);
    expect(rest[0]).toMatchObject({ subjectId: 'w-3', level: 1 });
  });
});

describe('weekConcerns, testloop en lange duurloop op een dag', () => {
  // Dinsdag: testloop en lange duurloop, allebei door de gebruiker vastgezet. De rest van de week is vrij.
  const userLock = { by: 'user' as const, at: '2026-10-20T10:00:00.000Z' };
  const sessions: PlannedSession[] = [
    { id: 't', templateId: 'tpl_test_run', scheduledDate: '2026-10-27', weekStartDate: MONDAY, status: 'planned', order: 0, lock: userLock },
    { id: 'l', templateId: 'tpl_long_run', scheduledDate: '2026-10-27', weekStartDate: MONDAY, status: 'planned', order: 1, lock: userLock },
  ];

  it('meldt dat de lange duurloop op de dag van je testloop staat', () => {
    const c = weekConcerns(input(sessions), MONDAY).find((x) => x.rule === 'TEST-DAY')!;
    expect(c).toBeDefined();
    expect(c.headline).toBe('Lange duurloop staat op dezelfde dag als je testloop.');
    expect(c.fact).toBe('Lange duurloop en je testloop staan allebei op dinsdag 27.');
    expect(c.why).toContain('niets anders zwaars');
    expect(c.notes).toEqual({ l: 'zelfde dag als je testloop' });
    expect(c.title).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('weekConcerns', () => {
  it('een week zonder rustdag: de kaartregel, het feit en de rijtekst', () => {
    const list = weekConcerns(input(fullWeek()), MONDAY);
    const rest = list.find((c) => c.rule === 'REST-DAY')!;
    expect(rest.headline).toBe('Deze week heeft geen rustdag.');
    expect(rest.fact).toBe('Op elke dag staat een training.');
    expect(rest.notes).toEqual({ 'w-3': 'op je rustdag' });
    // Twee volle lange duurlopen is een tweede punt, met de tekst bij de latere.
    const long = list.find((c) => c.rule === 'ONE-LONG')!;
    expect(long.notes).toEqual({ 'w-6': 'tweede lange training' });
    expect(noticeHeadline(list)).toBe('Deze week heeft 2 punten die niet kloppen.');
    expect(rowNotes(list).get('w-3')).toBe('op je rustdag');
  });

  it('een vrije dag elders: de training op je rustdag heet dat ook zo', () => {
    // Een testloop (niveau 2) op je rustdag wordt gemeld ook als een andere dag vrij is.
    const sessions = fullWeek().filter((s) => s.id !== 'w-1').map((s) => (s.id === 'w-3' ? { ...s, templateId: 'tpl_test_run', lock: undefined, status: 'planned' as const } : s));
    const rest = weekConcerns(input(sessions), MONDAY).find((c) => c.rule === 'REST-DAY')!;
    expect(rest.headline).toBe('Je rustdag heeft een training.');
    expect(rest.fact).toBe('Testloop 5 km staat op donderdag 29, je rustdag.');
    expect(rest.why).toContain('Je testloop schuift niet');
  });

  it('te dicht op elkaar: beide trainingen krijgen hun tekst', () => {
    const list = weekConcerns(input(fullWeek(MONDAY, ['tpl_lower_a', 'tpl_hills_descent', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel']).map((s) => ({ ...s, lock: undefined, status: 'planned' as const })), { restDay: 7 }), MONDAY);
    const spacing = list.find((c) => c.rule === 'LEG-SPACING')!;
    expect(spacing.headline).toBe('Benen A (zwaar) en Heuvelsprints en afdalen liggen te dicht op elkaar.');
    expect(spacing.fact).toBe('Er zit geen dag tussen, liefst 1 dag ertussen (48 uur).');
    expect(spacing.notes).toEqual({ 'w-0': '1 dag voor Heuvelsprints en afdalen', 'w-1': '1 dag na Benen A (zwaar)' });
  });

  it('een zware lange duurloop: de tekst vraagt dezelfde dag extra als de controle', () => {
    // Zondag een lange duurloop met RPE 9, dinsdag zware benen: 1 dag ertussen is dan te weinig.
    const sunday = addDays(MONDAY, -1);
    const long: PlannedSession = { id: 'long', templateId: 'tpl_long_run', scheduledDate: sunday, weekStartDate: addDays(MONDAY, -7), status: 'planned', order: 0 };
    const legs: PlannedSession = { id: 'legs', templateId: 'tpl_lower_a', scheduledDate: addDays(MONDAY, 1), weekStartDate: MONDAY, status: 'planned', order: 0 };
    const log = { id: 'log-long', plannedSessionId: 'long', templateId: 'tpl_long_run', completedDate: sunday, durationMinutes: 90, rpe: 9 } as CheckInput['logs'][number];
    const heavy = weekConcerns(input([long, legs], { logs: [log], today: MONDAY }), MONDAY).find((c) => c.rule === 'LEG-SPACING')!;
    expect(heavy.fact).toBe('Er zit 1 dag tussen, liefst 2 dagen ertussen (72 uur). Lange duurloop was zwaarder dan normaal, daarom een dag extra.');
    expect(heavy.why).toContain('72 uur');
    // Zonder dat zware logboek is 1 dag ertussen genoeg en is er geen melding.
    const calm = weekConcerns(input([long, legs], { logs: [{ ...log, rpe: 6 }], today: MONDAY }), MONDAY);
    expect(calm.some((c) => c.rule === 'LEG-SPACING')).toBe(false);
  });

  it('een eigen training op de rustdag met een vrije dag elders is geen melding', () => {
    const sessions = fullWeek().filter((s) => s.id !== 'w-1').map((s) => ({ ...s, lock: { by: 'proposal' as const, at: '2026-10-28T08:00:00Z' } }));
    expect(weekConcerns(input(sessions), MONDAY).find((c) => c.rule === 'REST-DAY')).toBeUndefined();
  });

  it('twee harde loopjes op een dag', () => {
    const sessions = fullWeek(MONDAY, ['tpl_upper_a', 'tpl_hills_descent', 'tpl_upper_b', 'tpl_herstel', 'tpl_easy_run', 'tpl_tempo_run', 'tpl_herstel']).map((s, i) => (i === 5 ? { ...s, templateId: 'tpl_tempo_run' } : s));
    const two = [...sessions, { ...sessions[1], id: 'extra', templateId: 'tpl_tempo_run', scheduledDate: sessions[1].scheduledDate }];
    const c = weekConcerns(input(two, { restDay: 7 }), MONDAY).find((x) => x.rule === 'TWO-HARD-RUNS')!;
    expect(c.headline).toBe('Twee harde loopjes op dinsdag 27.');
    expect(c.fact).toBe('Tempoloop en Heuvelsprints en afdalen staan op dezelfde dag.');
    expect(c.notes).toEqual({ 'w-1': 'tweede harde loop' });
  });

  it('een verleden week meldt niets', () => {
    expect(weekConcerns(input(fullWeek('2026-10-12')), '2026-10-12')).toEqual([]);
  });

  it('een week die klopt meldt niets', () => {
    const ok = fullWeek(MONDAY, ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hills_descent', 'tpl_long_run']);
    expect(weekConcerns(input(ok), MONDAY)).toEqual([]);
  });
});
