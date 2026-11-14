// Richting A van het Info-blad (docs/beslissingen/2026-11-14-info-blad-a.md): de randgevallen uit de opdracht.
// Een training zonder horloge-koppeling, met intervals.icu, een Forge-training, een rustdag en offline (geen
// weer). Nagemaakte trainingen; de klok staat op Europe/Amsterdam zoals bij de eigenaar.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { makeForecast } from './fixtures/weatherFixture';
import { resolveWatchModel } from './watchFields';
import { watchSheet, type WatchSheetInput } from './watchSheet';
import { BRIEFING_TEXT, briefing, type BriefingInput } from './briefing';
import { guideMenu } from './guideMenu';
import { buildWorkoutPlan } from './workoutPlan';
import { showSpotsFor, spotsPageFor } from './trainingSpots';
import { placeIsOutdoor } from './trainingPlace';

const { templates } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const LONG = byId('tpl_long_run');
const HIKE = byId('tpl_mountain_hike');
const STRENGTH = byId('tpl_upper_a');
const REST = byId('tpl_herstel');
const HILLS = byId('tpl_hill_intervals');
const TODAY = '2026-11-11';
const NOW = new Date(2026, 10, 11, 8, 0);
const model = resolveWatchModel(undefined);
const plan = (templateId: string): PlannedSession => ({ id: 'p1', templateId, scheduledDate: TODAY, weekStartDate: '2026-11-09', status: 'planned', order: 0 });

function sheet(template: SessionTemplate, over: Partial<WatchSheetInput> = {}) {
  const garmin = buildWorkoutPlan(template, TODAY, null)?.garmin;
  return watchSheet({ template, garmin, status: 'sent', showStatus: true, fieldsShown: true, model, store: undefined, hasZonesNote: false, ...over });
}

function brief(over: Partial<BriefingInput> = {}) {
  return briefing({
    template: LONG,
    session: plan(LONG.id),
    date: TODAY,
    now: NOW,
    program: null,
    logs: [],
    routeOn: true,
    watchLink: { linked: true, autoTick: true, activities: true },
    watch: { showStatus: true, fieldsShown: true, model, store: undefined, hasZonesNote: false },
    watchStatus: { kind: 'sent', sentAt: new Date(2026, 10, 11, 7, 18).toISOString() },
    forecast: makeForecast(TODAY, () => ({ tempC: 9, feelsC: 8 })),
    weatherOn: true,
    clothingOn: true,
    fuelOn: true,
    ...over,
  });
}

describe('Je horloge: beide wegen (vraag 4) en eerst het advies (vraag 2)', () => {
  it('met intervals.icu: de stand bovenaan, daaronder zelf nabouwen, daarna de datavelden van het advies', () => {
    const view = sheet(LONG);
    expect(view.hasWatchSheet).toBe(true);
    expect(view.workout.parts.map((p) => p.kind)).toEqual(['status', 'manual']);
    expect(view.fields?.state).toBe('ready');
    expect(view.fields?.ownVersionLine).toBeUndefined();
  });

  it('zonder koppeling: Vanzelf laten sturen bovenaan, zelf nabouwen eronder; de datavelden staan er gewoon', () => {
    const view = sheet(LONG, { status: 'unlinked' });
    expect(view.workout.parts.map((p) => p.kind)).toEqual(['unlinked', 'manual']);
    expect(view.fields?.state).toBe('ready');
  });

  it('Forge-training: kracht gaat niet naar het horloge en heeft geen datavelden, dus geen blad', () => {
    expect(sheet(STRENGTH, { status: 'none' }).hasWatchSheet).toBe(false);
  });

  it('rustdag: geen blad', () => {
    expect(sheet(REST, { status: 'none' }).hasWatchSheet).toBe(false);
  });
});

describe('Waarom deze training: korter, niets dubbel', () => {
  it('een loop: hoogstens vier rijen, geen stappen of plekken', () => {
    const rows = guideMenu({ plan: buildWorkoutPlan(LONG, TODAY, null), easeOffCount: 1, modalityCount: 2, backgroundCount: 3, hasGear: true, sourceCount: 2 });
    expect(rows.length).toBeLessThanOrEqual(4);
    expect(rows.map((r) => r.id as string)).not.toContain('stappen');
    expect(rows.map((r) => r.id as string)).not.toContain('plekken');
  });

  it('rustdag zonder plan: alleen wat de gids heeft', () => {
    const rows = guideMenu({ plan: buildWorkoutPlan(REST, TODAY, null), easeOffCount: 0, modalityCount: 0, backgroundCount: 1, hasGear: false, sourceCount: 0 });
    expect(rows.map((r) => r.id).filter((id) => id !== 'weken')).toEqual(['achtergrond']);
  });
});

describe('Waar kun je dit doen? op het trainingsscherm en in de Briefing', () => {
  it('dezelfde voorwaarde als het oude Info-blad: eigen filter, D+ of wandelen; niet kracht of rust', () => {
    expect(showSpotsFor(LONG)).toBe(true);
    expect(showSpotsFor(HIKE)).toBe(true);
    expect(showSpotsFor(STRENGTH)).toBe(false);
    expect(showSpotsFor(REST)).toBe(false);
    expect(showSpotsFor({ id: 'tpl_x', type: 'cardio' }, 'D+ 300 m')).toBe(true);
    expect(showSpotsFor(undefined)).toBe(false);
  });

  it('de pagina is gefilterd op de training als er een filter is', () => {
    expect(spotsPageFor(LONG.id)).toBe('/plekken?training=tpl_long_run');
    expect(spotsPageFor('tpl_bike')).toBe('/plekken');
  });

  it('Briefing buiten: de rij Plekken opent een pagina', () => {
    expect(brief()?.rows.find((r) => r.id === 'spots')).toEqual({ id: 'spots', label: BRIEFING_TEXT.spots, line: BRIEFING_TEXT.spotsLine, opens: true });
  });

  it('Briefing binnen (loopband): geen plekken', () => {
    expect(brief({ storedPlace: 'long_run_treadmill' })?.rows.some((r) => r.id === 'spots')).toBe(false);
  });
});

describe('weer en kleding (vraag 5)', () => {
  it('offline: geen weer, de Briefing zegt het in één regel en de rest staat er gewoon', () => {
    const view = brief({ forecast: undefined });
    expect(view?.rows.find((r) => r.id === 'weather')?.line).toBe(BRIEFING_TEXT.noWeather);
    expect(view?.rows.some((r) => r.id === 'watch')).toBe(true);
  });

  it('zonder horloge-koppeling: de Briefing toont nog steeds weer', () => {
    const view = brief({ watchLink: { linked: false, autoTick: false, activities: false }, watchStatus: undefined });
    expect(view?.rows.some((r) => r.id === 'weather')).toBe(true);
  });
});

// Herstelronde na Warden (14 november).
describe('buiten of binnen: één regel voor de Briefing en het trainingsscherm', () => {
  it('zonder gekozen plek buiten; fietsen binnen niet; rust niet', () => {
    expect(placeIsOutdoor('tpl_bike', undefined)).toBe(true);
    expect(placeIsOutdoor('tpl_bike', 'bike_outdoor')).toBe(true);
    expect(placeIsOutdoor('tpl_bike', 'bike_indoor')).toBe(false);
    expect(placeIsOutdoor('tpl_herstel', 'rest')).toBe(false);
    expect(placeIsOutdoor('tpl_long_run', 'long_run_treadmill')).toBe(false);
  });

  it('plekken volgen dezelfde regel: op de loopband geen plekken', () => {
    expect(showSpotsFor(LONG, undefined, 'long_run_outdoor')).toBe(true);
    expect(showSpotsFor(LONG, undefined, 'long_run_treadmill')).toBe(false);
  });
});

describe('de heuvelregel staat in de Briefing', () => {
  const hills = (over: Partial<BriefingInput> = {}) => brief({ template: HILLS, session: plan(HILLS.id), ...over });
  it('Heuvelintervallen buiten: de heuvelregel staat er', () => {
    expect(hills({ storedPlace: 'hill_repeats_outdoor' })?.hills).toBe(true);
    expect(hills()?.hills).toBe(true);
  });
  it('Heuvelintervallen op de loopband: geen heuvelregel', () => {
    expect(hills({ storedPlace: 'incline_treadmill_intervals' })?.hills).toBe(false);
  });
  it('al gedaan: geen heuvelregel', () => {
    const log = { id: 'l1', plannedSessionId: 'p1', templateId: HILLS.id, date: TODAY, completedAt: NOW.toISOString(), durationMinutes: 45, variant: 'full' };
    expect(hills({ logs: [log as never] })?.hills).toBe(false);
  });
});
