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

const { templates } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const LONG = byId('tpl_long_run');
const HIKE = byId('tpl_mountain_hike');
const STRENGTH = byId('tpl_upper_a');
const REST = byId('tpl_herstel');
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

  it('zonder koppeling: zelf nabouwen bovenaan, dan Vanzelf laten sturen; de datavelden staan er gewoon', () => {
    const view = sheet(LONG, { status: 'unlinked' });
    expect(view.workout.parts.map((p) => p.kind)).toEqual(['manual', 'unlinked']);
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
