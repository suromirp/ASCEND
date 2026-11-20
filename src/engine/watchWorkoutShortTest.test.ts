import { describe, it, expect, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { racePaces } from './racePaces';
import { buildWatchWorkout, selectWatchWorkouts, shortTestManualFor } from './watchWorkout';
import { buildWorkoutPlan } from './workoutPlan';
import { watchSheet } from './watchSheet';
import { resolveWatchModel } from './watchFields';
import { shortTestBriefing, shortTestRunMinutes, shortTestSessionIds, watchShortTest } from './shortTest';
import { watchStatusFor } from './watchStatus';
import { WATCH_DAYS } from './watchWorkout';
import { addDays } from '../utils/dates';
import { resolvePlace } from './trainingPlace';

// De korte test op het horloge (I-79 stap 3): alleen de rustige loop met de test verandert, en die is dan
// helemaal een tempoworkout, nooit hartslag en tempo door elkaar.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T08:00:00'));
});

const { templates, program, plannedSessions } = buildDefaultProgramData();
const paces = racePaces([{ date: '2026-10-29', km: 5, minutes: 29 + 5 / 60 }]);
const series = { answer: 'accepted' as const, date: program.startDate, paceSecKm: 380 };
const ids = shortTestSessionIds(plannedSessions, series, true);
const shortTest = { ids, paceSecKm: 380 };
const tpl = (id: string) => templates.find((t) => t.id === id)!;

describe('de korte test op het horloge', () => {
  it('elke week staat hij op één rustige loop', () => {
    expect(ids.size).toBeGreaterThan(0);
    for (const id of ids) expect(plannedSessions.find((s) => s.id === id)!.templateId).toBe('tpl_easy_run');
  });

  it('inlopen, de test op tempo, stilstaan en de rest zonder doel', () => {
    const s = plannedSessions.find((p) => ids.has(p.id))!;
    const w = buildWatchWorkout(s, tpl('tpl_easy_run'), program, paces, { namePrefix: 'none', shortTest })!;
    expect(w.target).toBe('PACE');
    const lines = w.description.split('\n').filter((l) => l.startsWith('- '));
    expect(lines[0]).toBe('- Inlopen 10m');
    expect(lines[1]).toBe('- Korte test 4m 6:10/km-6:30/km Pace');
    expect(lines[2]).toBe('- Stilstaan 1m');
    expect(lines[3]).toMatch(/^- Hardlopen \d+m$/);
    expect(w.description).not.toContain('HR');
  });

  it('elke andere workout blijft precies gelijk, ook zijn vingerafdruk', () => {
    const days = 7 * 8;
    const before = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today: program.startDate, days });
    const after = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today: program.startDate, days, options: { shortTest } });
    expect(after.length).toBe(before.length);
    let changed = 0;
    for (let i = 0; i < before.length; i++) {
      if (ids.has(before[i].plannedId)) {
        changed++;
        expect(after[i].fingerprint).not.toBe(before[i].fingerprint);
      } else {
        expect(after[i]).toEqual(before[i]);
      }
    }
    expect(changed).toBeGreaterThan(0);
  });

  it('na versturen staat de rustige loop met de test op sent (Warden, 18 november)', () => {
    const today = program.startDate;
    const done = { today, logged: new Set<string>() };
    const st = watchShortTest({ shortTestSeries: series }, plannedSessions, done)!;
    const s = plannedSessions.find((p) => st.ids.has(p.id) && p.scheduledDate <= addDays(today, WATCH_DAYS - 1))!;
    expect(s).toBeDefined();
    // Wat het versturen schreef: dezelfde workout als storage/watchWorkouts.ts bouwt.
    const sent = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today, options: { shortTest: st } }).find((w) => w.plannedId === s.id)!;
    const items = { [s.id]: { externalId: sent.externalId, date: sent.date, fingerprint: sent.fingerprint, sentAt: `${today}T08:00:00.000Z` } };
    const ctx = { linked: true, items, today, program, paces, logged: new Set<string>() };
    expect(watchStatusFor(s, tpl('tpl_easy_run'), { ...ctx, shortTest: st }).kind).toBe('sent');
    // Zonder de korte test in de stand zou hij blijvend op een wijziging wachten: dat was de fout.
    expect(watchStatusFor(s, tpl('tpl_easy_run'), ctx).kind).toBe('stale');
  });

  // Briefing en horloge lezen dezelfde voorwaarden (shortTestFits, shortTestWay): elke manier van de rustige
  // loop aan beide kanten, ook met "Eigen workout bij een andere manier" uit (Warden, 18 november).
  const ways: [string | undefined, boolean][] = [
    [undefined, true], ['run_outdoor', true], ['run_treadmill', true], ['run_walk', true],
    ['bike_outdoor', false], ['bike_indoor', false], ['stairmaster', true],
  ];
  for (const [way, test] of ways) {
    for (const placeWorkout of [undefined, false]) {
      it(`manier ${way ?? 'standaard'}${placeWorkout === false ? ', eigen workout uit' : ''}: ${test ? 'test' : 'geen test'} in Briefing en op het horloge, en na versturen sent`, () => {
        const today = program.startDate;
        const done = { today, logged: new Set<string>() };
        const st = watchShortTest({ shortTestSeries: series }, plannedSessions, done)!;
        const s = plannedSessions.find((p) => st.ids.has(p.id) && p.scheduledDate <= addDays(today, WATCH_DAYS - 1))!;
        const places = way ? { [s.id]: way } : undefined;
        const options = { shortTest: st, ...(places ? { places } : {}), ...(placeWorkout === false ? { placeWorkout } : {}) };
        const sent = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today, options }).find((w) => w.plannedId === s.id)!;
        const onWatch = sent.description.includes('Korte test');
        // De Briefing krijgt de manier zoals TrainingBriefing hem leest (engine/briefing.ts: resolvePlace); een
        // manier die de rustige loop niet kent (StairMaster) wordt de standaard, hardlopen.
        const brief = shortTestBriefing({ session: s, minutes: sent.movingTimeSec / 60, sessions: plannedSessions, on: true, series, paces, today, logged: done.logged, place: resolvePlace(tpl('tpl_easy_run'), way) });
        expect(onWatch).toBe(test);
        expect(brief?.kind === 'brief').toBe(test);
        const items = { [s.id]: { externalId: sent.externalId, date: sent.date, fingerprint: sent.fingerprint, sentAt: `${today}T08:00:00.000Z` } };
        const ctx = { linked: true, items, today, program, paces, logged: new Set<string>(), shortTest: st, ...(places ? { places } : {}), ...(placeWorkout === false ? { placeWorkout } : {}) };
        expect(watchStatusFor(s, tpl('tpl_easy_run'), ctx).kind).toBe('sent');
      });
    }
  }

  // I-91 punt 4: één regel voor de 25 minuten (shortTestRunMinutes), aan beide kanten dezelfde uitkomst.
  for (const [plannedMinutes, test] of [[undefined, true], [20, false], [24, false], [25, true], [90, true]] as [number | undefined, boolean][]) {
    it(`vaste duur ${plannedMinutes ?? 'geen'}: ${test ? 'test' : 'geen test'} in Briefing en op het horloge`, () => {
      const today = program.startDate;
      const first = plannedSessions.find((p) => ids.has(p.id))!;
      const s = { ...first, ...(plannedMinutes !== undefined ? { plannedMinutes } : {}) };
      const sessions = plannedSessions.map((p) => (p.id === s.id ? s : p));
      const w = buildWatchWorkout(s, tpl('tpl_easy_run'), program, paces, { shortTest })!;
      const minutes = shortTestRunMinutes(s, buildWorkoutPlan(tpl('tpl_easy_run'), s.scheduledDate, program));
      const brief = shortTestBriefing({ session: s, minutes, sessions, on: true, series, paces, today, logged: new Set<string>() });
      expect(w.description.includes('Korte test')).toBe(test);
      expect(brief?.kind === 'brief').toBe(test);
    });
  }

  it('zonder vaste duur verandert de ene regel niets: geen geplande training in het demoprogramma heeft er een', () => {
    // Daarom is elke workout van het demoprogramma byte voor byte gelijk aan die van voor I-91.
    expect(plannedSessions.some((p) => p.plannedMinutes !== undefined)).toBe(false);
    const s = plannedSessions.find((p) => ids.has(p.id))!;
    const w = buildWatchWorkout(s, tpl('tpl_easy_run'), program, paces, { shortTest })!;
    expect(shortTestRunMinutes(s, buildWorkoutPlan(tpl('tpl_easy_run'), s.scheduledDate, program))).toBe(w.movingTimeSec / 60);
  });

  // I-91 punt 2: de korte test in het blad Je horloge, bij Zelf nabouwen in Garmin Connect.
  describe('zelf nabouwen in het blad Je horloge', () => {
    const easy = tpl('tpl_easy_run');
    const s = plannedSessions.find((p) => ids.has(p.id))!;
    const plan = buildWorkoutPlan(easy, s.scheduledDate, program)!;
    const total = plan.timeline.reduce((sum, step) => sum + step.seconds, 0);

    it('dezelfde vier stappen als de workout die verstuurd wordt', () => {
      const manual = shortTestManualFor(s, easy, plan, undefined, undefined, shortTest)!;
      expect(manual.sport).toBe('Hardlopen');
      expect(manual.lines).toEqual([
        'Warming-up · 10:00 · geen doel',
        'Hardlopen · 4:00 · doel: tempo 6:12 tot 6:28 per km',
        'Herstel · 1:00 · stilstaan',
        `Hardlopen · ${Math.floor((total - 900) / 60)}:00 · geen doel`,
      ]);
      expect(manual.note).toBe('Met de korte test aan het begin: 4 minuten op 6:20 per km, daarna 1 minuut rechtop stilstaan.');
      // De stappen tellen op tot de duur van de workout.
      const w = buildWatchWorkout(s, easy, program, paces, { shortTest })!;
      expect(600 + 240 + 60 + (total - 900)).toBe(w.movingTimeSec);
    });

    it('de rij zegt dat de korte test erin zit', () => {
      const manual = shortTestManualFor(s, easy, plan, undefined, undefined, shortTest)!;
      const base = { template: easy, showStatus: true, fieldsShown: false, model: resolveWatchModel(undefined), hasZonesNote: false };
      const part = watchSheet({ ...base, garmin: manual }).workout.parts.find((p) => p.kind === 'manual')!;
      expect(part).toMatchObject({ title: 'Zelf nabouwen in Garmin Connect', sub: 'Hardlopen, 4 stappen, met de korte test' });
      // Zonder de test de rij zoals hij was.
      const plain = watchSheet({ ...base, garmin: plan.garmin }).workout.parts.find((p) => p.kind === 'manual')!;
      expect(plain).toMatchObject({ sub: 'Hardlopen, 1 stap' });
    });

    it('alleen waar het horloge de test ook krijgt', () => {
      // Een rustige loop die de test van zijn week niet draagt.
      const other = { ...s, id: 'andere_rustige_loop' };
      for (const [session, stored, placeWorkout, st] of [
        [s, undefined, undefined, shortTest], [s, 'run_treadmill', undefined, shortTest], [s, 'bike_indoor', undefined, shortTest], [s, 'bike_outdoor', false, shortTest],
        [other, undefined, undefined, shortTest], [s, undefined, undefined, undefined], [{ ...s, plannedMinutes: 20 }, undefined, undefined, shortTest],
      ] as const) {
        const onWatch = buildWatchWorkout(session, easy, program, paces, { shortTest: st, ...(stored ? { places: { [session.id]: stored } } : {}), ...(placeWorkout === false ? { placeWorkout } : {}) })!.description.includes('Korte test');
        const sessionPlan = buildWorkoutPlan(easy, session.scheduledDate, program);
        expect(!!shortTestManualFor(session, easy, sessionPlan, stored, placeWorkout, st)).toBe(onWatch);
      }
      expect(shortTestManualFor(undefined, easy, plan, undefined, undefined, shortTest)).toBeUndefined();
      // Een andere training dan de rustige loop nooit.
      expect(shortTestManualFor(s, tpl('tpl_intervals'), buildWorkoutPlan(tpl('tpl_intervals'), s.scheduledDate, program), undefined, undefined, shortTest)).toBeUndefined();
    });
  });

  it('alleen de rustige loop met de test en een manier die geen hardlopen is krijgt een andere vingerafdruk', () => {
    const days = 7 * 8;
    const today = program.startDate;
    // Elke training op de fiets waar dat een keuze is; de rest blijft hardlopen.
    const places = Object.fromEntries(plannedSessions.filter((p) => p.templateId === 'tpl_easy_run').map((p) => [p.id, 'bike_indoor']));
    const plain = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today, days, options: { places } });
    const withTest = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today, days, options: { places, shortTest } });
    expect(withTest).toEqual(plain);
    // Zonder gekozen manier krijgt de rustige loop met de test hem wel.
    const run = selectWatchWorkouts({ sessions: plannedSessions, logs: [], templates, program, paces, today, days, options: { shortTest } });
    expect(run.filter((w) => w.description.includes('Korte test')).length).toBe([...ids].filter((id) => run.some((w) => w.plannedId === id)).length);
  });
});
