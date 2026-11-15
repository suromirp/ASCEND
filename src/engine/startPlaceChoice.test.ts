import { describe, expect, it } from 'vitest';
import { choiceFor, cleanChoices, eveningPlaceTarget, restoredStart, withChoice, type StartPlaceChoice } from './startPlaceChoice';

// Verzonnen plekken: de coördinaten wijzen nergens heen.
const TODAY = '2026-11-15';
const TOMORROW = '2026-11-16';
const FAR: StartPlaceChoice = { date: TOMORROW, name: 'Verwegdal', lat: 50.72, lon: 4.1, placeId: 'pl-1' };
const HOME = { lat: 50.01, lon: 4.01 };

describe('cleanChoices', () => {
  it('kapot of vreemd valt weg, het goede blijft', () => {
    expect(cleanChoices(null)).toEqual({});
    expect(cleanChoices([])).toEqual({});
    expect(cleanChoices({ a: FAR, b: { date: 'morgen', name: 'x', lat: 1, lon: 1 }, c: { ...FAR, lat: 95 }, d: 'x' })).toEqual({ a: FAR });
  });
  it('een treffer gaat mee als hij klopt', () => {
    const found = { name: 'Verwegdal', lat: 50.72, lon: 4.1, region: 'Ergens' };
    expect(cleanChoices({ a: { ...FAR, placeId: undefined, found } }).a?.found).toEqual(found);
    expect(cleanChoices({ a: { ...FAR, found: { name: 3 } } }).a?.found).toBeUndefined();
  });
});

describe('choiceFor en withChoice', () => {
  it('geldt alleen voor die training op die dag, tot de dag voorbij is', () => {
    const map = { s1: FAR };
    expect(choiceFor(map, 's1', TOMORROW, TODAY)).toEqual(FAR);
    expect(choiceFor(map, 's2', TOMORROW, TODAY)).toBeUndefined();
    expect(choiceFor(map, undefined, TOMORROW, TODAY)).toBeUndefined();
    expect(choiceFor(map, 's1', '2026-11-17', TODAY)).toBeUndefined();
    expect(choiceFor(map, 's1', TOMORROW, '2026-11-17')).toBeUndefined();
  });
  it('zetten, wissen en oude dagen opruimen', () => {
    const old = { ...FAR, date: '2026-11-01' };
    const next = withChoice({ old }, 's1', FAR, TODAY);
    expect(next).toEqual({ s1: FAR });
    expect(withChoice(next, 's1', undefined, TODAY)).toEqual({});
  });
});

describe('restoredStart', () => {
  const places = [{ id: 'pl-1', name: 'Verwegdal nieuw', lat: 50.72, lon: 4.1 }];
  it('een bewaarde plek komt terug met zijn huidige naam; een gewiste niet', () => {
    expect(restoredStart(FAR, places)).toEqual({ placeId: 'pl-1', name: 'Verwegdal nieuw', point: { lat: 50.72, lon: 4.1 } });
    expect(restoredStart(FAR, [])).toBeUndefined();
    expect(restoredStart(FAR, undefined)).toBeUndefined();
    expect(restoredStart(FAR, [{ ...places[0], home: true }])).toBeUndefined();
  });
  it('een gezochte plek komt terug met zijn treffer', () => {
    const found = { name: 'Verwegdal', lat: 50.72, lon: 4.1 };
    expect(restoredStart({ ...FAR, placeId: undefined, found }, undefined)).toEqual({ name: 'Verwegdal', point: { lat: 50.72, lon: 4.1 }, found });
  });
});

describe('eveningPlaceTarget', () => {
  const base = { placeWeatherOn: true, rememberOn: true, routeOn: true, sessions: [{ id: 's1', date: TOMORROW, routeShown: true }], choices: { s1: FAR }, today: TODAY, home: HOME };
  it('een verre plek voor morgen: het weer daar, op twee decimalen', () => {
    expect(eveningPlaceTarget(base)).toEqual({ sessionId: 's1', target: { name: 'Verwegdal', lat: 50.72, lon: 4.1 } });
  });
  it('een instelling uit, geen route of een plek dichtbij: geen plek', () => {
    expect(eveningPlaceTarget({ ...base, placeWeatherOn: false })).toBeUndefined();
    expect(eveningPlaceTarget({ ...base, rememberOn: false })).toBeUndefined();
    expect(eveningPlaceTarget({ ...base, routeOn: false })).toBeUndefined();
    expect(eveningPlaceTarget({ ...base, sessions: [{ id: 's1', date: TOMORROW, routeShown: false }] })).toBeUndefined();
    expect(eveningPlaceTarget({ ...base, choices: { s1: { ...FAR, lat: 50.02 } } })).toBeUndefined();
    expect(eveningPlaceTarget({ ...base, choices: undefined })).toBeUndefined();
  });
});
