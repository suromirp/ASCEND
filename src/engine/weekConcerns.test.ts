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
    expect(rest.why).toContain('Je testloop staat op die dag');
  });

  it('te dicht op elkaar: beide trainingen krijgen hun tekst', () => {
    const list = weekConcerns(input(fullWeek(MONDAY, ['tpl_lower_a', 'tpl_hills_descent', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel']).map((s) => ({ ...s, lock: undefined, status: 'planned' as const })), { restDay: 7 }), MONDAY);
    const spacing = list.find((c) => c.rule === 'LEG-SPACING')!;
    expect(spacing.headline).toBe('Benen A (zwaar) en Heuvelsprints en afdalen liggen te dicht op elkaar.');
    expect(spacing.fact).toBe('Er zit geen dag tussen, liefst 1 dag ertussen (48 uur).');
    expect(spacing.notes).toEqual({ 'w-0': '1 dag voor Heuvelsprints en afdalen', 'w-1': '1 dag na Benen A (zwaar)' });
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
