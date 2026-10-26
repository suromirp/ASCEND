import { describe, it, expect } from 'vitest';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';

// Ronde 2b: het herstel na een doel (regel AFTER-GOAL in engine/weekValidator.ts), van de soort en
// nooit van het label. Nagemaakte week: dezelfde indeling als in weekValidator.test.ts.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21';
const MONDAY = '2026-10-26';
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const sessions = [...week(MONDAY), ...week(addDays(MONDAY, 7))];
const input = (list: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions: list, logs: [], templates, today: TODAY, restDay: 4, goalDay: '2027-08-01', ...over });
const set = (list: PlannedSession[], id: string, patch: Partial<PlannedSession>) => list.map((s) => (s.id === id ? { ...s, ...patch } : s));
const budget = { preferredMinutes: 90, softFlexMinutes: 15 };
const dailyTimeBudget = { mon: budget, tue: budget, wed: budget, thu: { preferredMinutes: 10, softFlexMinutes: 15 }, fri: budget, sat: { preferredMinutes: 200, softFlexMinutes: 30 }, sun: { preferredMinutes: 200, softFlexMinutes: 30 } };

// Een wedstrijd op zaterdag 24 oktober, 5 dagen herstel: 25 tot en met 29 oktober.
const RACE_DAY = '2026-10-24';
const race: PlannedSession = { id: 'race', templateId: 'tpl_race', scheduledDate: RACE_DAY, weekStartDate: '2026-10-19', status: 'planned', order: 9 };
const afterGoals = [{ date: RACE_DAY, days: 5 }];
const shortOf = (id: string) => templates.find((t) => t.id === id)!.durationVariants.short;
const withRace = [race, ...sessions];
const found = (list: PlannedSession[], over: Partial<CheckInput> = {}) => validateWeeks(input(list, { afterGoals, ...over })).filter((f) => f.rule === 'AFTER-GOAL');

describe('AFTER-GOAL: herstel na een wedstrijd', () => {
  it('meldt zware beenkracht en een harde training binnen het herstel, niet daarbuiten en niet zonder doel', () => {
    const list = found(withRace);
    expect(list.map((f) => f.subjectId)).toEqual([`${MONDAY}-2`]);
    expect(list[0].message).toContain('4 dagen na je wedstrijd');
    expect(validateWeeks(input(withRace)).some((f) => f.rule === 'AFTER-GOAL')).toBe(false);
    // Een harde training op maandag 26 (dag 2).
    const hard = set(withRace, `${MONDAY}-0`, { templateId: 'tpl_tempo_run' });
    expect(found(hard).map((f) => f.subjectId).sort()).toEqual([`${MONDAY}-0`, `${MONDAY}-2`]);
  });

  it('een korte lange loop mag, en een korte beenkracht pas vanaf de derde dag', () => {
    const longShort = set(withRace, `${MONDAY}-6`, { scheduledDate: '2026-10-25', plannedMinutes: shortOf('tpl_long_run') });
    expect(found(longShort).map((f) => f.subjectId)).not.toContain(`${MONDAY}-6`);
    const lowerShort = set(withRace, `${MONDAY}-2`, { plannedMinutes: shortOf('tpl_lower_a') });
    expect(found(lowerShort)).toEqual([]);
    expect(found(set(lowerShort, `${MONDAY}-2`, { scheduledDate: '2026-10-26' })).map((f) => f.subjectId)).toEqual([`${MONDAY}-2`]);
  });

  it('de eerste dag na de wedstrijd blijft van AFTER-TEST, zonder dubbele melding', () => {
    const day1 = set(withRace, `${MONDAY}-5`, { scheduledDate: '2026-10-25', weekStartDate: '2026-10-19' });
    const all = validateWeeks(input(day1, { afterGoals })).filter((f) => f.subjectId === `${MONDAY}-5`);
    expect(all.map((f) => f.rule)).toEqual(['AFTER-TEST']);
  });

  it('wat jij zelf vastzette blijft: gemeld, niet verschoven', () => {
    const own = set(withRace, `${MONDAY}-2`, { lock: { by: 'user', at: '' } });
    const r = repairWeeks(input(own, { afterGoals, dailyTimeBudget }));
    expect(r.sessions.find((s) => s.id === `${MONDAY}-2`)!.scheduledDate).toBe('2026-10-28');
    expect(r.remaining.some((f) => f.rule === 'AFTER-GOAL' && f.level === 1)).toBe(true);
  });

  it('verschuift een zware beendag van het systeem naar een dag buiten het herstel, meldt het en laat een tweede ronde stil', () => {
    const r = repairWeeks(input(withRace, { afterGoals, dailyTimeBudget }));
    const moved = r.repairs.filter((x) => x.rule === 'AFTER-GOAL');
    expect(moved).toHaveLength(1);
    const lower = r.sessions.find((s) => s.id === `${MONDAY}-2`)!;
    expect(lower.scheduledDate >= '2026-10-30' || lower.plannedMinutes === shortOf('tpl_lower_a')).toBe(true);
    expect(found(r.sessions)).toEqual([]);
    expect(repairWeeks(input(r.sessions, { afterGoals, dailyTimeBudget })).repairs).toEqual([]);
  });

  it('maakt het lichter als er in de week geen dag buiten het herstel is', () => {
    // Acht dagen herstel: alle dagen tot en met zondag 1 november zijn bezet.
    const long = [{ date: RACE_DAY, days: 8 }];
    const r = repairWeeks(input(withRace, { afterGoals: long, dailyTimeBudget }));
    const lower = r.sessions.find((s) => s.id === `${MONDAY}-2`)!;
    // Dag 4 is te vroeg voor een korte beendag? Nee: vanaf dag 3 mag de korte versie.
    expect(lower.plannedMinutes).toBe(shortOf('tpl_lower_a'));
    expect(r.repairs.some((x) => x.rule === 'AFTER-GOAL' && x.sessionId === `${MONDAY}-2`)).toBe(true);
    // Een harde training wordt een rustig loopje, of verhuist naar de week erna.
    const hard = set(withRace, `${MONDAY}-0`, { templateId: 'tpl_tempo_run', scheduledDate: '2026-10-27' });
    const h = repairWeeks(input(hard, { afterGoals: long, dailyTimeBudget }));
    const tempo = h.sessions.find((s) => s.id === `${MONDAY}-0`)!;
    expect(tempo.templateId === 'tpl_easy_run' || tempo.scheduledDate > '2026-11-01').toBe(true);
    expect(found(h.sessions, { afterGoals: long }).filter((f) => f.subjectId === `${MONDAY}-0`)).toEqual([]);
  });

  describe('een harde training die het herstel rustig maakte, komt terug', () => {
    const tempo: PlannedSession = { id: 'tempo', templateId: 'tpl_tempo_run', scheduledDate: '2026-10-27', weekStartDate: MONDAY, status: 'planned', order: 1 };
    // Veertien dagen herstel: de hele week is bezet, er is geen andere dag.
    const long = [{ date: RACE_DAY, days: 14 }];
    const run = (list: PlannedSession[], goals: CheckInput['afterGoals']) => repairWeeks(input(list, { afterGoals: goals, dailyTimeBudget }));
    const eased = () => run([race, tempo], long);

    it('wordt een rustig loopje met een markering van wat het was en van welk doel', () => {
      const r = eased();
      const s = r.sessions.find((x) => x.id === 'tempo')!;
      expect(s.templateId).toBe('tpl_easy_run');
      expect(s.afterGoal).toEqual({ templateId: 'tpl_tempo_run', date: RACE_DAY });
      expect(r.repairs.some((x) => x.rule === 'AFTER-GOAL' && x.sessionId === 'tempo')).toBe(true);
      // Een tweede ronde met hetzelfde doel verandert niets.
      expect(run(r.sessions, long).repairs).toEqual([]);
    });

    it('komt terug als het doel verdwijnt of zo ver verschuift dat de dag vrij is', () => {
      const easy = eased().sessions;
      for (const goals of [[], [{ date: '2026-12-05', days: 14 }]]) {
        const back = run(easy, goals);
        const s = back.sessions.find((x) => x.id === 'tempo')!;
        expect(s.templateId).toBe('tpl_tempo_run');
        expect(s.afterGoal).toBeUndefined();
        expect(back.repairs.map((x) => x.sessionId)).toEqual(['tempo']);
        expect(run(back.sessions, goals).repairs).toEqual([]);
      }
    });

    it('blijft rustig zolang een doel de dag nog dekt, ook als het een dag verschuift', () => {
      const easy = eased().sessions;
      const still = run(easy, [{ date: '2026-10-25', days: 14 }]);
      expect(still.sessions.find((x) => x.id === 'tempo')!.templateId).toBe('tpl_easy_run');
    });

    it('van jou geworden (vastgezet) of al gedaan: niet teruggezet, de markering gaat weg', () => {
      const easy = eased().sessions;
      const locked = easy.map((s) => (s.id === 'tempo' ? { ...s, lock: { by: 'user' as const, at: '' } } : s));
      const r = run(locked, []);
      const s = r.sessions.find((x) => x.id === 'tempo')!;
      expect(s.templateId).toBe('tpl_easy_run');
      expect(s.afterGoal).toBeUndefined();
    });
  });

  it('het herstel van het ene doel dat voorbij is, telt niet meer', () => {
    expect(found(withRace, { afterGoals: [{ date: '2026-10-10', days: 5 }] })).toEqual([]);
  });
});
