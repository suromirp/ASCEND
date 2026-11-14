import { describe, expect, it } from 'vitest';
import { watchSheet, WATCH_SHEET_TEXT, type WatchSheetInput } from './watchSheet';
import { resolveWatchModel } from './watchFields';

const model = resolveWatchModel(undefined);
const longRun = { id: 'tpl_long_run', type: 'cardio' as const, roles: undefined };
const garmin = { sport: 'Hardlopen', lines: ['Warming-up · 10:00 · doel: hartslag zone 2', 'Herhaal 4×', '   Hard · 3:00 · doel: inspanning hard (RPE 8-9)', '   Rustig · 2:00 · doel: hartslag zone 1', 'Cooling-down · 10:00 · doel: hartslag zone 1'] };

function input(over: Partial<WatchSheetInput> = {}): WatchSheetInput {
  return { template: longRun, garmin, status: 'sent', showStatus: true, fieldsShown: true, model, store: undefined, hasZonesNote: false, ...over };
}

describe('watchSheet', () => {
  it('een loop met koppeling: eerst de stand, dan zelf nabouwen, dan de datavelden als tekst', () => {
    const view = watchSheet(input());
    expect(view.hasWatchSheet).toBe(true);
    expect(view.workout.parts.map((p) => p.kind)).toEqual(['status', 'manual']);
    const manual = view.workout.parts[1];
    expect(manual).toMatchObject({ title: WATCH_SHEET_TEXT.manual, sub: 'Hardlopen, 4 stappen' });
    expect(view.fields?.state).toBe('ready');
    expect(view.fields?.title).toBe('Datavelden · Lange duurloop');
    expect(view.fields?.lines[0]).toMatch(/^Pagina 1: /);
    expect(view.fields?.lines.every((l, i) => l.startsWith(`Pagina ${i + 1}: `))).toBe(true);
    expect(view.fields?.why).toBeTruthy();
    expect(view.fields?.to).toBe('/horloge/datavelden?soort=longRun');
    expect(view.fields?.ownVersionLine).toBeUndefined();
  });

  it('versturen mislukt of nog niet verstuurd: de stand blijft bovenaan, daar zit Opnieuw of Nu versturen', () => {
    for (const status of ['failed', 'stale', 'pending', 'later'] as const) {
      expect(watchSheet(input({ status })).workout.parts[0].kind).toBe('status');
    }
  });

  // Bewust mee (14 november): intervals.icu staat altijd bovenaan, ook zonder koppeling (vraag 4).
  it('geen koppeling met intervals.icu: eerst de zin en Vanzelf laten sturen, dan zelf nabouwen', () => {
    const view = watchSheet(input({ status: 'unlinked' }));
    expect(view.workout.parts.map((p) => p.kind)).toEqual(['unlinked', 'manual']);
    expect(view.workout.parts[0]).toMatchObject({ text: WATCH_SHEET_TEXT.notLinked, rowTitle: WATCH_SHEET_TEXT.linkRow, to: '/koppelen/garmin' });
  });

  it('een losse training (geen stand): alleen zelf nabouwen en de datavelden', () => {
    const view = watchSheet(input({ status: undefined }));
    expect(view.workout.parts.map((p) => p.kind)).toEqual(['manual']);
    expect(view.hasWatchSheet).toBe(true);
  });

  it('Laten zien of het gelukt is uit: geen stand en geen vraag om te koppelen', () => {
    expect(watchSheet(input({ showStatus: false })).workout.parts.map((p) => p.kind)).toEqual(['manual']);
    expect(watchSheet(input({ status: 'unlinked', showStatus: false })).workout.parts.map((p) => p.kind)).toEqual(['manual']);
  });

  it('de instelling Datavelden uit: de groep valt weg, het blad blijft voor de workout', () => {
    const view = watchSheet(input({ fieldsShown: false }));
    expect(view.fields).toBeUndefined();
    expect(view.hasWatchSheet).toBe(true);
  });

  it('een soort zonder advies (fietsen): de zin zonder advies en de rij opent op Zone 2', () => {
    const bike = { id: 'tpl_bike_easy', type: 'cardio' as const, roles: undefined };
    const view = watchSheet(input({ template: bike }));
    expect(view.hasWatchSheet).toBe(true);
    expect(view.fields).toMatchObject({ state: 'noAdvice', noAdviceText: WATCH_SHEET_TEXT.noAdvice, to: '/horloge/datavelden', lines: [] });
  });

  it('een eigen versie: de regel erbij, de regels blijven het advies', () => {
    const plain = watchSheet(input());
    const store = { longRun: { v2: { pages: [['heartRate', 'timer']] } } };
    const view = watchSheet(input({ store }));
    expect(view.fields?.ownVersionLine).toBe(WATCH_SHEET_TEXT.ownVersion);
    expect(view.fields?.lines).toEqual(plain.fields?.lines);
    // Een kapotte bewaarde waarde telt niet als eigen versie.
    expect(watchSheet(input({ store: { longRun: { v2: 'kapot' } } })).fields?.ownVersionLine).toBeUndefined();
  });

  it('kracht: geen workout en geen advies, dus geen blad en geen knop Horloge', () => {
    const strength = { id: 'tpl_upper_a', type: 'strength' as const, roles: undefined };
    const view = watchSheet(input({ template: strength, garmin: undefined, status: 'none', hasZonesNote: true }));
    expect(view.hasWatchSheet).toBe(false);
    expect(view.workout.emptyText).toBe(WATCH_SHEET_TEXT.noWorkout);
    expect(view.fields).toBeUndefined();
    expect(view.zones).toBeUndefined();
  });

  it('een tocht zonder workout maar met advies: wel een blad, de workout zegt dat hij niet naar het horloge gaat', () => {
    const hike = { id: 'tpl_mountain_hike', type: 'hiking' as const, roles: undefined };
    const view = watchSheet(input({ template: hike, garmin: undefined, status: 'none' }));
    expect(view.hasWatchSheet).toBe(true);
    expect(view.workout).toEqual({ parts: [], emptyText: WATCH_SHEET_TEXT.noWorkout });
    expect(view.fields?.state).toBe('ready');
  });

  it('zonder workout, met Datavelden uit: geen blad', () => {
    const hike = { id: 'tpl_mountain_hike', type: 'hiking' as const, roles: undefined };
    expect(watchSheet(input({ template: hike, garmin: undefined, status: 'none', fieldsShown: false })).hasWatchSheet).toBe(false);
  });

  it('de rij Je horloge instellen alleen als de gids die opmerking heeft', () => {
    expect(watchSheet(input()).zones).toBeUndefined();
    expect(watchSheet(input({ hasZonesNote: true })).zones).toEqual({ title: WATCH_SHEET_TEXT.zones, to: '/koppelen/garmin', section: 'horloge-instellen' });
  });

  it('een wedstrijd krijgt wel een blad: de workout gaat op je horloge, de datavelden zonder advies', () => {
    const race = { id: 'tpl_race', type: 'cardio' as const, roles: ['race' as const] };
    const view = watchSheet(input({ template: race, garmin: { sport: 'Hardlopen', lines: ['Hardlopen · 60:00 · doel: inspanning hard (RPE 8-9)'] } }));
    expect(view.hasWatchSheet).toBe(true);
    expect(view.workout.parts.map((p) => p.kind)).toEqual(['status', 'manual']);
    expect(view.fields?.state).toBe('noAdvice');
  });

  it('de regel onder de rij Je horloge: de stand als die er is, anders Workout en datavelden', () => {
    expect(watchSheet(input({ statusText: 'Verstuurd naar je horloge om 07:12' })).rowSub).toBe('Verstuurd naar je horloge om 07:12');
    expect(watchSheet(input({ status: 'unlinked', statusText: 'Naar je horloge sturen?' })).rowSub).toBe(WATCH_SHEET_TEXT.rowSub);
    expect(watchSheet(input({ showStatus: false, statusText: 'Verstuurd naar je horloge om 07:12' })).rowSub).toBe(WATCH_SHEET_TEXT.rowSub);
    expect(watchSheet(input({ status: undefined })).rowSub).toBe(WATCH_SHEET_TEXT.rowSub);
  });

  it('geen gedachtestreepjes in de teksten', () => {
    expect(Object.values(WATCH_SHEET_TEXT).join(' ')).not.toMatch(/[\u2013\u2014]/);
  });
});
