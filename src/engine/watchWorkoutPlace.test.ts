// De eigen workout bij een andere manier (besluit docs/beslissingen/2026-11-12-stairmaster-horloge.md): een
// looptraining met de StairMaster gaat als wandelworkout naar het horloge, en zonder die keuze verandert niets.
import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { getModalities } from '../data/modalities';
import { addDays } from '../utils/dates';
import type { PlannedSession } from '../models/training';
import { racePaces } from './racePaces';
import { buildWatchWorkout, planWatchSync, selectWatchWorkouts, watchPlaceOf, watchSportFor, watchSportOf, type TrackedWorkout } from './watchWorkout';
import { watchStatusFor, type WatchStatusContext } from './watchStatus';

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const today = addDays(program.startDate, 8);
// Nagemaakt: 5 km in 29:05.
const PACES = racePaces([{ date: addDays(today, -10), km: 5, minutes: 29 + 5 / 60 }])!;
const session = (templateId: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id: `ps_${templateId}`, templateId, scheduledDate: today, weekStartDate: program.startDate, status: 'planned', order: 0, ...over });
const HILLS = tpl('tpl_hill_intervals');
const hills = session('tpl_hill_intervals');
const STAIR = { [hills.id]: 'stairmaster_intervals' };

describe('een training zonder wandelkeuze blijft precies als nu', () => {
  it('de vingerafdruk is gelijk zonder keuze, met een lege lijst, met de standaard en met een andere loopmanier', () => {
    let checked = 0;
    for (const t of templates) {
      for (const days of [0, 7, 14, 21]) {
        const s = session(t.id, { scheduledDate: addDays(today, days) });
        for (const paces of [undefined, PACES]) {
          const before = buildWatchWorkout(s, t, program, paces);
          expect(buildWatchWorkout(s, t, program, paces, { places: {} })).toEqual(before);
          for (const m of getModalities(t.id) ?? []) {
            if (watchPlaceOf(t, m.key)) continue;
            expect(buildWatchWorkout(s, t, program, paces, { places: { [s.id]: m.key } }), `${t.id} ${m.key}`).toEqual(before);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('de instelling uit: de workout van de training, ook met de StairMaster gekozen', () => {
    expect(buildWatchWorkout(hills, HILLS, program, PACES, { places: STAIR, placeWorkout: false })).toEqual(buildWatchWorkout(hills, HILLS, program, PACES));
    expect(watchSportFor(HILLS, 'stairmaster_intervals', false)).toBe('Run');
  });

  it('een kapotte of onbekende keuze, of een keuze van een andere training: de workout van de training', () => {
    for (const stored of ['bestaat_niet', 'long_hike_outdoor', 42, null]) expect(watchPlaceOf(HILLS, stored)).toBeUndefined();
  });
});

describe('welke manieren een eigen wandelworkout krijgen', () => {
  it('alleen de StairMaster bij een looptraining: een vaste lijst', () => {
    const own = templates.flatMap((t) => (getModalities(t.id) ?? []).filter((m) => watchPlaceOf(t, m.key)).map((m) => `${t.id} ${m.key}`));
    expect(own.sort()).toEqual(['tpl_hill_intervals stairmaster_intervals', 'tpl_hills_descent stairmaster_intervals']);
  });
  it('de lange duurloop als wandeling buiten blijft de hardloopworkout: geen eigen workout zonder besluit', () => {
    const long = tpl('tpl_long_run');
    const s = session('tpl_long_run');
    expect(watchPlaceOf(long, 'long_hike_outdoor')).toBeUndefined();
    expect(buildWatchWorkout(s, long, program, PACES, { places: { [s.id]: 'long_hike_outdoor' } })).toEqual(buildWatchWorkout(s, long, program, PACES));
  });
  it('elke andere manier die wandelen of fietsen is bij een looptraining: de workout van de training', () => {
    for (const t of templates) {
      if (watchSportOf(t) !== 'Run') continue;
      for (const m of getModalities(t.id) ?? []) if (m.garminProfile !== 'Stair Stepper') expect(watchPlaceOf(t, m.key), `${t.id} ${m.key}`).toBeUndefined();
    }
  });
});

describe('heuvelintervallen op de StairMaster', () => {
  const run = buildWatchWorkout(hills, HILLS, program, PACES)!;
  const walk = buildWatchWorkout(hills, HILLS, program, PACES, { places: STAIR })!;

  it('een wandelworkout met dezelfde opbouw in tijd, zonder tempo', () => {
    expect(run.type).toBe('Run');
    expect(walk.type).toBe('Walk');
    expect(walk.movingTimeSec).toBe(run.movingTimeSec);
    expect(walk.externalId).toBe(run.externalId);
    expect(walk.name).toBe(run.name);
    expect(walk.target).toBe('HR');
    expect(walk.description).not.toMatch(/\/km|Pace/);
    expect(walk.fingerprint).not.toBe(run.fingerprint);
    // Dezelfde stappen en duren, alleen de namen van de manier.
    const steps = (text: string) => text.split('\n').filter((l) => l.startsWith('- ') || /^Herhalingen/.test(l)).map((l) => l.replace('Hard bergop', 'Stevig traplopen').replace('Terug naar beneden', 'Rustig doorstappen'));
    expect(steps(walk.description)).toEqual(steps(run.description));
  });

  it('de workout zoals hij naar intervals.icu gaat', () => {
    // Zonder voorvoegsel, dus zonder de regel met de datum; week 2 van de fase, 40 minuten.
    const w = buildWatchWorkout(hills, HILLS, program, PACES, { places: STAIR, namePrefix: 'none' })!;
    expect({ type: w.type, name: w.name, moving_time: w.movingTimeSec, target: w.target }).toEqual({ type: 'Walk', name: 'Heuvelintervallen', moving_time: 2400, target: 'HR' });
    expect(w.description).toBe(
      [
        'Traplopen, StairMaster. Op gevoel en hartslag, geen tempo. De stevige blokken: RPE 8-9.',
        '',
        'Warming-up',
        '- Opwarmen 11m',
        '',
        'Herhalingen 6x',
        '- Stevig traplopen 1m',
        '- Rustig doorstappen 2m',
        '',
        'Cooling-down',
        '- Uitlopen 11m',
      ].join('\n'),
    );
  });

  it('ook met heuvelsprints en afdalen, en zonder voorvoegsel', () => {
    const s = session('tpl_hills_descent');
    const w = buildWatchWorkout(s, tpl('tpl_hills_descent'), program, PACES, { places: { [s.id]: 'stairmaster_intervals' }, namePrefix: 'none' })!;
    expect(w.type).toBe('Walk');
    expect(w.description.startsWith('Traplopen, StairMaster.')).toBe(true);
    expect(w.description).toContain('Stevig traplopen');
  });

  it('de keuze wisselt: één update op dezelfde training, nooit een tweede', () => {
    const tracked: Record<string, TrackedWorkout> = { [hills.id]: { externalId: run.externalId, date: run.date, fingerprint: run.fingerprint, eventId: 7, type: 'Run' } };
    const toStairs = planWatchSync(selectWatchWorkouts({ sessions: [hills], logs: [], templates, program, paces: PACES, today, options: { places: STAIR } }), tracked, today, new Set());
    expect(toStairs.create).toEqual([]);
    expect(toStairs.remove).toEqual([]);
    expect(toStairs.update.map((u) => [u.workout.type, u.tracked.eventId])).toEqual([['Walk', 7]]);
    // Terug naar buiten: weer de hardloopworkout, niets te doen als die er nog staat.
    const back = planWatchSync(selectWatchWorkouts({ sessions: [hills], logs: [], templates, program, paces: PACES, today, options: { places: { [hills.id]: 'hill_repeats_outdoor' } } }), tracked, today, new Set());
    expect([back.create, back.update, back.remove]).toEqual([[], [], []]);
  });
});

describe('de stand per training', () => {
  const ctx = (over: Partial<WatchStatusContext> = {}): WatchStatusContext => ({ linked: true, items: {}, today, program, paces: PACES, logged: new Set(), ...over });
  const run = buildWatchWorkout(hills, HILLS, program, PACES)!;
  const walk = buildWatchWorkout(hills, HILLS, program, PACES, { places: STAIR })!;
  const sentRun: TrackedWorkout = { externalId: run.externalId, date: run.date, fingerprint: run.fingerprint, eventId: 7, sentAt: '2026-11-11T07:00:00.000Z' };
  const sentWalk: TrackedWorkout = { ...sentRun, fingerprint: walk.fingerprint, type: 'Walk' };

  it('gekozen voor het versturen: wacht, en wil een wandelworkout', () => {
    expect(watchStatusFor(hills, HILLS, ctx({ places: STAIR }))).toEqual({ kind: 'pending', wants: 'Walk' });
  });
  it('gekozen na het versturen: de hardloopworkout staat er nog, de wandelworkout wacht', () => {
    expect(watchStatusFor(hills, HILLS, ctx({ places: STAIR, items: { [hills.id]: sentRun } }))).toEqual({ kind: 'stale', wants: 'Walk', wrote: 'Run' });
    // Een oud record zonder soort was altijd de workout van de training.
    expect(watchStatusFor(hills, HILLS, ctx({ places: STAIR, items: { [hills.id]: { ...sentRun, type: undefined } } })).wrote).toBe('Run');
  });
  it('verstuurd: de wandelworkout staat erop', () => {
    expect(watchStatusFor(hills, HILLS, ctx({ places: STAIR, items: { [hills.id]: sentWalk } }))).toEqual({ kind: 'sent', sentAt: sentWalk.sentAt, wants: 'Walk', wrote: 'Walk' });
  });
  it('versturen mislukt: de oude blijft, met de reden', () => {
    expect(watchStatusFor(hills, HILLS, ctx({ places: STAIR, items: { [hills.id]: sentRun }, lastError: 'Geen verbinding met intervals.icu.' }))).toEqual({ kind: 'failed', reason: 'geen verbinding', wants: 'Walk', wrote: 'Run' });
  });
  it('terug naar buiten: de wandelworkout staat er nog tot de volgende ronde', () => {
    expect(watchStatusFor(hills, HILLS, ctx({ places: { [hills.id]: 'hill_repeats_outdoor' }, items: { [hills.id]: sentWalk } }))).toEqual({ kind: 'stale', wants: 'Run', wrote: 'Walk' });
  });
  it('de avond ervoor en verder weg: dezelfde regel, later gaat hij als zijn dag dichtbij komt', () => {
    const tomorrow = session('tpl_hill_intervals', { scheduledDate: addDays(today, 1) });
    expect(watchStatusFor(tomorrow, HILLS, ctx({ places: { [tomorrow.id]: 'stairmaster_intervals' } }))).toEqual({ kind: 'pending', wants: 'Walk' });
    const far = session('tpl_hill_intervals', { scheduledDate: addDays(today, 9) });
    expect(watchStatusFor(far, HILLS, ctx({ places: { [far.id]: 'stairmaster_intervals' } }))).toMatchObject({ kind: 'later', wants: 'Walk' });
  });
  it('horloge sturen staat uit: niet gekoppeld, er komt niets', () => {
    expect(watchStatusFor(hills, HILLS, ctx({ places: STAIR, linked: false }))).toEqual({ kind: 'unlinked' });
  });
  it('zonder keuze: de stand zoals hij altijd was, zonder soort', () => {
    expect(watchStatusFor(hills, HILLS, ctx({ items: { [hills.id]: sentRun } }))).toEqual({ kind: 'sent', sentAt: sentRun.sentAt });
  });
});
