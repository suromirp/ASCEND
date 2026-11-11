import { describe, it, expect, afterEach } from 'vitest';
import { setHardSameDayAllowed } from './scheduler';
import { lockLevel, repairWeeks, validateWeeks, type CheckInput } from './weekValidator';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21'; // a Wednesday
const MONDAY = '2026-10-26';
// The pattern with the rest day on Thursday, as in production.
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const sessions = [...week(MONDAY), ...week(addDays(MONDAY, 7))];
const input = (list: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions: list, logs: [], templates, today: TODAY, restDay: 4, goalDay: '2027-08-01', ...over });
const set = (list: PlannedSession[], id: string, patch: Partial<PlannedSession>) => list.map((s) => (s.id === id ? { ...s, ...patch } : s));
const budget = { preferredMinutes: 90, softFlexMinutes: 15 };
const dailyTimeBudget = { mon: budget, tue: budget, wed: budget, thu: { preferredMinutes: 10, softFlexMinutes: 15 }, fri: budget, sat: { preferredMinutes: 200, softFlexMinutes: 30 }, sun: { preferredMinutes: 200, softFlexMinutes: 30 } };

describe('levels', () => {
  it('history, yours, an anchor, the system', () => {
    const logged = new Set(['done']);
    const s = sessions[0];
    expect(lockLevel({ ...s, id: 'done' }, logged, TODAY)).toBe(0);
    expect(lockLevel({ ...s, scheduledDate: '2026-10-20' }, logged, TODAY)).toBe(0);
    expect(lockLevel({ ...s, lock: { by: 'user', at: '' } }, logged, TODAY)).toBe(1);
    expect(lockLevel({ ...s, status: 'moved' }, logged, TODAY)).toBe(1);
    expect(lockLevel({ ...s, templateId: 'tpl_test_run' }, logged, TODAY)).toBe(2);
    expect(lockLevel(s, logged, TODAY)).toBe(3);
  });
});

describe('a clean pattern week', () => {
  it('has no findings and nothing to repair', () => {
    expect(validateWeeks(input(sessions, { dailyTimeBudget }))).toEqual([]);
    expect(repairWeeks(input(sessions, { dailyTimeBudget })).repairs).toEqual([]);
  });
});

describe('the rest day', () => {
  it('a session of the system on it moves to a free day nearby, and a second run changes nothing', () => {
    const list = set(sessions, `${MONDAY}-4`, { scheduledDate: '2026-10-29' }); // Upper B onto Thursday
    expect(validateWeeks(input(list)).map((f) => f.rule)).toContain('REST-DAY');
    const r = repairWeeks(input(list, { dailyTimeBudget }));
    expect(r.repairs).toEqual([expect.objectContaining({ sessionId: `${MONDAY}-4`, rule: 'REST-DAY', from: '2026-10-29' })]);
    expect(r.sessions.find((s) => s.id === `${MONDAY}-4`)!.scheduledDate).not.toBe('2026-10-29');
    expect(r.remaining).toEqual([]);
    expect(repairWeeks(input(r.sessions, { dailyTimeBudget })).repairs).toEqual([]);
  });

  it('what you put there yourself is your choice: not reported, not moved', () => {
    const list = set(sessions, `${MONDAY}-4`, { scheduledDate: '2026-10-29', lock: { by: 'user', at: '' } });
    expect(validateWeeks(input(list))).toEqual([]);
    expect(repairWeeks(input(list)).repairs).toEqual([]);
  });

  it('a test on it is reported, never moved: that is a proposal', () => {
    const list = [...set(sessions, `${MONDAY}-0`, { templateId: 'tpl_test_run', scheduledDate: '2026-10-29' })];
    const r = repairWeeks(input(list, { dailyTimeBudget }));
    expect(r.sessions.find((s) => s.id === `${MONDAY}-0`)!.scheduledDate).toBe('2026-10-29');
    expect(r.remaining.some((f) => f.rule === 'REST-DAY' && f.level === 2)).toBe(true);
  });
});

describe('the other rules', () => {
  it('a day over your time: the session of the system that is off its own place moves', () => {
    const list = set(sessions, `${MONDAY}-0`, { scheduledDate: '2026-10-27' }); // easy run onto Tuesday with Upper A
    const r = repairWeeks(input(list, { dailyTimeBudget, slotDays: new Map(DAYS.map((t, i) => [t, i + 1])) }));
    expect(r.repairs[0]).toMatchObject({ sessionId: `${MONDAY}-0`, rule: 'DAY-FULL', to: '2026-10-26' });
  });

  it('nothing heavy the day after a test, but the short long run after a race is fine', () => {
    const afterTest = set(set(sessions, `${MONDAY}-5`, { templateId: 'tpl_test_run', status: 'planned' }), `${MONDAY}-5`, { lock: { by: 'proposal', at: '' } });
    expect(validateWeeks(input(afterTest)).some((f) => f.rule === 'AFTER-TEST')).toBe(true);
    const race = set(set(sessions, `${MONDAY}-5`, { templateId: 'tpl_race' }), `${MONDAY}-6`, { plannedMinutes: templates.find((t) => t.id === 'tpl_long_run')!.durationVariants.short });
    expect(validateWeeks(input(race)).some((f) => f.rule === 'AFTER-TEST')).toBe(false);
  });

  it('two hard runs on one day', () => {
    const list = set(sessions, `${MONDAY}-0`, { templateId: 'tpl_tempo_run', scheduledDate: '2026-10-31' });
    const f = validateWeeks(input(list)).find((x) => x.rule === 'TWO-HARD-RUNS');
    expect(f?.message).toMatch(/^Twee harde lopen op /);
  });

  it('a second full long session in a week goes short; a duplicate goes', () => {
    const extra = { ...sessions[6], id: 'extra-long', scheduledDate: '2026-10-30' };
    const r = repairWeeks(input([...sessions, extra]));
    expect(r.repairs.some((x) => x.rule === 'ONE-LONG' && !!x.plannedMinutes)).toBe(true);
    const dup = { ...sessions[1], id: 'zz-dup' };
    const d = repairWeeks(input([...sessions, dup]));
    expect(d.repairs).toContainEqual(expect.objectContaining({ sessionId: 'zz-dup', rule: 'DUPLICATE', removed: true }));
  });

  it('never touches what is logged or past', () => {
    const past = set(sessions, `${MONDAY}-4`, { scheduledDate: '2026-10-15', weekStartDate: '2026-10-12' });
    const pastOnRest = [...past, { id: 'old', templateId: 'tpl_upper_b', scheduledDate: '2026-10-15', weekStartDate: '2026-10-12', status: 'planned' as const, order: 0 }];
    expect(repairWeeks(input(pastOnRest)).repairs).toEqual([]);
    const loggedOnRest = set(sessions, `${MONDAY}-4`, { scheduledDate: '2026-10-29' });
    const logs = [{ id: 'l', plannedSessionId: `${MONDAY}-4`, templateId: 'tpl_upper_b', type: 'strength' as const, completedDate: '2026-10-29', completedAt: '', variant: 'full' as const, durationMinutes: 60, source: 'manual' as const }];
    expect(repairWeeks(input(loggedOnRest, { logs })).repairs).toEqual([]);
  });

  afterEach(() => setHardSameDayAllowed(false));

  it('never puts leg strength on the test day itself, unless "Zware dingen op één dag" is on', () => {
    let list = set(sessions, `${MONDAY}-0`, { templateId: 'tpl_test_run', scheduledDate: '2026-10-28', lock: { by: 'proposal', at: '' } });
    list = set(list, `${MONDAY}-2`, { scheduledDate: '2026-10-27' });
    list = set(list, `${MONDAY}-1`, { scheduledDate: '2026-10-26' });
    const r = repairWeeks(input(list));
    expect(r.sessions.filter((s) => s.scheduledDate === '2026-10-28').map((s) => s.templateId)).toEqual(['tpl_test_run']);
    const onTestDay = set(list, `${MONDAY}-2`, { scheduledDate: '2026-10-28' });
    expect(validateWeeks(input(onTestDay)).some((f) => f.rule === 'TEST-DAY')).toBe(true);
  });

  it('a test made fresh by moving or shortening leg strength before it, never the long run or the hills', () => {
    setHardSameDayAllowed(true);
    // Test on Wednesday 28th: Lower A the day before it.
    let list = set(sessions, `${MONDAY}-0`, { templateId: 'tpl_test_run', scheduledDate: '2026-10-28', lock: { by: 'proposal', at: '' } });
    list = set(list, `${MONDAY}-2`, { scheduledDate: '2026-10-27' });
    list = set(list, `${MONDAY}-1`, { scheduledDate: '2026-10-26' });
    const r = repairWeeks(input(list, { dailyTimeBudget }));
    expect(r.repairs.length).toBeGreaterThan(0);
    for (const x of r.repairs) expect(['tpl_lower_a', 'tpl_upper_a', 'tpl_upper_b']).toContain(list.find((s) => s.id === x.sessionId)!.templateId);
    expect(r.remaining.some((f) => f.rule === 'TEST-FRESH')).toBe(false);
  });
});

describe('gelijke gevallen beslist het id', () => {
  // De oorzaak van een wankele test in storage/horizonPlan.test.ts: de id's van geplande
  // sessies zijn willekeurig, en als twee sessies op een volle dag verder gelijk staan,
  // beslist het id welke van de twee verschuift. Dat is bedoeld (dezelfde gegevens geven
  // altijd hetzelfde antwoord), maar een test mag er niet op rekenen welke het wordt.
  const moved = (legsId: string, runId: string) => {
    let list = set(sessions, `${MONDAY}-2`, { scheduledDate: MONDAY, id: legsId });
    list = set(list, `${MONDAY}-0`, { id: runId });
    return repairWeeks(input(list, { dailyTimeBudget })).repairs.map((r) => list.find((s) => s.id === r.sessionId)!.templateId);
  };
  it('met de ene volgorde van id\'s verschuift de beenkracht, met de andere de loop', () => {
    expect(moved('a-legs', 'b-run')).toEqual(['tpl_easy_run']);
    expect(moved('b-legs', 'a-run')).toEqual(['tpl_lower_a']);
  });
});

describe('de laatste vrije dag van een week', () => {
  // Nagemaakt, met verschoven datums: de rustdag is maandag, maar daar staan de heuvels die je er zelf neerzette.
  // Vrijdag is te vol (Benen A van jou en Bovenlichaam B van het systeem), zaterdag is de enige vrije dag.
  // De planningsronde mag Bovenlichaam B verplaatsen, maar niet naar zaterdag: dan heeft de week geen rustdag meer.
  const userLock = { by: 'user' as const, at: '2026-10-25T20:00:00.000Z' };
  const row = (id: string, templateId: string, day: number, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: addDays(MONDAY, day), weekStartDate: MONDAY, status: 'planned', order: day, ...over });
  const list: PlannedSession[] = [
    row('heuvel', 'tpl_hills_descent', 0, { status: 'moved', lock: userLock }),
    row('kort', 'tpl_easy_run', 1, { status: 'moved', lock: userLock }),
    row('boven-a', 'tpl_upper_a', 2, { status: 'moved', lock: userLock }),
    row('rustig', 'tpl_easy_run', 3, { status: 'moved', lock: userLock }),
    row('benen', 'tpl_lower_a', 4, { status: 'moved', lock: userLock }),
    row('boven-b', 'tpl_upper_b', 4, { order: 9 }),
    row('lang', 'tpl_long_run', 6),
  ];
  const fri = { preferredMinutes: 60, softFlexMinutes: 15 };
  const budgets = { ...dailyTimeBudget, thu: budget, fri };
  const at = (over: Partial<CheckInput> = {}) => input(list, { today: MONDAY, restDay: 1, dailyTimeBudget: budgets, ...over });

  it('vrijdag is te vol en zaterdag is de enige vrije dag', () => {
    expect(validateWeeks(at(), new Set([MONDAY])).some((f) => f.rule === 'DAY-FULL' && f.subjectId === 'boven-b')).toBe(true);
  });

  it('de planningsronde zet Bovenlichaam B niet op de laatste vrije dag', () => {
    const r = repairWeeks(at());
    const moved = r.sessions.find((s) => s.id === 'boven-b')!;
    expect(moved.scheduledDate).not.toBe(addDays(MONDAY, 5));
    // Wat van jou is blijft staan.
    for (const id of ['heuvel', 'kort', 'boven-a', 'rustig', 'benen']) expect(r.sessions.find((s) => s.id === id)).toEqual(list.find((s) => s.id === id));
  });

  it('een vakantiedag met twee trainingen: de eerste mag naar de laatste vrije dag, want de vakantiedag wordt vrij', () => {
    // Woensdag is een vakantiedag met twee trainingen van het systeem. Zaterdag is de enige andere vrije dag.
    // Zolang de tweede er nog staat, telt woensdag niet als vrij; de uitzondering voor een vakantie houdt de
    // verhuizing naar zaterdag toch mogelijk, zoals voor deze wijziging.
    const leave = [{ id: 'v', kind: 'no_training' as const, startDate: addDays(MONDAY, 2), endDate: addDays(MONDAY, 2) }];
    const trip: PlannedSession[] = [
      row('heuvel', 'tpl_hills_descent', 0, { status: 'moved', lock: userLock }),
      row('kort', 'tpl_easy_run', 1, { status: 'moved', lock: userLock }),
      row('boven-a', 'tpl_upper_a', 2),
      row('boven-b', 'tpl_upper_b', 2, { order: 9 }),
      row('rustig', 'tpl_easy_run', 3, { status: 'moved', lock: userLock }),
      row('benen', 'tpl_lower_a', 4, { status: 'moved', lock: userLock }),
      row('lang', 'tpl_long_run', 6),
    ];
    const r = repairWeeks(input(trip, { today: MONDAY, restDay: 1, leave }));
    const off = r.repairs.filter((x) => x.rule === 'LEAVE-OFF');
    expect(off.map((x) => x.sessionId).sort()).toEqual(['boven-a', 'boven-b']);
    // Zoals voor deze wijziging: de eerste (Bovenlichaam A) gaat naar zaterdag, de tweede past nergens meer en vervalt.
    expect(off.find((x) => x.sessionId === 'boven-a')).toMatchObject({ to: addDays(MONDAY, 5) });
    expect(off.find((x) => x.sessionId === 'boven-b')).toMatchObject({ removed: true });
    // Wat van jou is blijft staan.
    for (const id of ['heuvel', 'kort', 'rustig', 'benen']) expect(r.sessions.find((s) => s.id === id)).toEqual(trip.find((s) => s.id === id));
  });

  it('met een vrije rustdag mag zaterdag gewoon', () => {
    const free = at({ sessions: list.filter((s) => s.id !== 'heuvel') });
    const r = repairWeeks(free);
    expect(r.repairs.find((x) => x.sessionId === 'boven-b')?.to).toBe(addDays(MONDAY, 5));
  });
});
