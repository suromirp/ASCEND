import { describe, expect, it } from 'vitest';

import { makeForecast } from './fixtures/weatherFixture';
import { readWeatherPageLink, weatherPageLink, weatherPageNote, weatherPageView } from './weatherPageLink';

// Verzonnen plek: de coördinaten wijzen nergens heen.
const PLACE = { name: 'Verwegdal', lat: 50.72, lon: 4.1 };
const TODAY = '2026-11-13';

describe('weatherPageLink: wat de Briefing meegeeft aan de pagina Weer', () => {
  it('een gekozen plek gaat mee met de training en de dag', () => {
    expect(weatherPageLink(PLACE, 'tpl-run', TODAY)).toEqual({ weatherPlace: { place: PLACE, templateId: 'tpl-run', date: TODAY } });
  });
  it('geen plek gekozen: er gaat niets mee, de pagina toont thuis', () => {
    expect(weatherPageLink(undefined, 'tpl-run', TODAY)).toBeUndefined();
    expect(readWeatherPageLink(weatherPageLink(undefined, 'tpl-run', TODAY), TODAY)).toBeUndefined();
  });
  it('heen en terug: de pagina leest precies wat de Briefing meegaf', () => {
    expect(readWeatherPageLink(weatherPageLink(PLACE, 'tpl-run', TODAY), TODAY)).toEqual({ place: PLACE, templateId: 'tpl-run', date: TODAY });
  });
});

describe('readWeatherPageLink: een onbekende of kapotte plek is thuis, zonder fout', () => {
  const link = (over: Record<string, unknown>) => ({ weatherPlace: { place: PLACE, templateId: 'tpl-run', date: TODAY, ...over } });
  it('niets, iets anders of een lege vorm: thuis', () => {
    for (const raw of [undefined, null, 'weer', 7, [], {}, { weatherPlace: null }, { weatherPlace: 'Verwegdal' }, { weatherPlace: {} }]) {
      expect(readWeatherPageLink(raw, TODAY)).toBeUndefined();
    }
  });
  it('een plek zonder bruikbare coördinaten: thuis', () => {
    expect(readWeatherPageLink(link({ place: { name: 'Kapot', lat: Number.NaN, lon: 4 } }), TODAY)).toBeUndefined();
    expect(readWeatherPageLink(link({ place: { name: 'Buiten de aarde', lat: 95, lon: 4 } }), TODAY)).toBeUndefined();
    expect(readWeatherPageLink(link({ place: { name: 'Tekst', lat: '50', lon: '4' } }), TODAY)).toBeUndefined();
    expect(readWeatherPageLink(link({ place: undefined }), TODAY)).toBeUndefined();
  });
  it('geen training of geen geldige dag: thuis', () => {
    expect(readWeatherPageLink(link({ templateId: '' }), TODAY)).toBeUndefined();
    expect(readWeatherPageLink(link({ templateId: 4 }), TODAY)).toBeUndefined();
    expect(readWeatherPageLink(link({ date: 'morgen' }), TODAY)).toBeUndefined();
    expect(readWeatherPageLink(link({ date: undefined }), TODAY)).toBeUndefined();
  });
  it('een training van gisteren (een oude stap in de geschiedenis): thuis; vandaag en morgen tellen', () => {
    expect(readWeatherPageLink(link({ date: '2026-11-12' }), TODAY)).toBeUndefined();
    expect(readWeatherPageLink(link({ date: TODAY }), TODAY)).toBeDefined();
    expect(readWeatherPageLink(link({ date: '2026-11-14' }), TODAY)).toBeDefined();
  });
  it('een naam die geen tekst is wordt een plek zonder naam; de coördinaten gaan op twee decimalen', () => {
    expect(readWeatherPageLink(link({ place: { name: 12, lat: 50.87654, lon: 4.12345 } }), TODAY)?.place).toEqual({ name: '', lat: 50.88, lon: 4.12 });
    expect(readWeatherPageLink(link({ place: { name: '  Verwegdal ', lat: 50.72, lon: 4.1 } }), TODAY)?.place.name).toBe('Verwegdal');
  });
});

describe('weatherPageView: welke voorspelling de kaart leest en wat erbij staat', () => {
  const home = makeForecast(TODAY);
  const there = { ...makeForecast(TODAY), place: PLACE };
  const link = { place: PLACE, templateId: 'tpl-run', date: TODAY };

  it('geen plek: het weer van thuis, zonder regel', () => {
    expect(weatherPageView(undefined, undefined, home)).toEqual({ forecast: home, loading: false });
  });
  it('de plek laadt nog: geen getallen van thuis, wel een regel', () => {
    const v = weatherPageView(link, { status: 'loading' }, home);
    expect(v).toEqual({ forecast: undefined, loading: true, note: weatherPageNote.loading('Verwegdal') });
    expect(weatherPageView(link, undefined, home).loading).toBe(true);
  });
  it('gelukt: de voorspelling van de plek, met de plek bij naam', () => {
    const v = weatherPageView(link, { status: 'ok', forecast: there }, home);
    expect(v.forecast).toBe(there);
    expect(v.note).toBe('Weer in Verwegdal, de plek uit je Briefing.');
    expect(v.place).toBe(true);
  });
  it('mislukt: het weer van thuis met een eerlijke regel', () => {
    const v = weatherPageView(link, { status: 'failed' }, home);
    expect(v.forecast).toBe(home);
    expect(v.note).toBe('Weer in Verwegdal laadde niet. Dit is het weer van thuis.');
    expect(v.place).toBeUndefined();
  });
  it('mislukt en ook geen weer van thuis: alleen het feit', () => {
    expect(weatherPageView(link, { status: 'failed' }, undefined)).toEqual({ forecast: undefined, loading: false, note: 'Weer in Verwegdal laadde niet.' });
  });
  it('een plek zonder naam heet je plek', () => {
    const nameless = { ...link, place: { ...PLACE, name: '' } };
    expect(weatherPageView(nameless, { status: 'ok', forecast: there }, home).note).toBe('Weer op je plek uit de Briefing.');
    expect(weatherPageView(nameless, { status: 'loading' }, home).note).toBe('Weer op je plek wordt opgehaald.');
    expect(weatherPageView(nameless, { status: 'failed' }, home).note).toBe('Weer op je plek laadde niet. Dit is het weer van thuis.');
  });
  it('geen gedachtestreepjes in de teksten', () => {
    const all = [weatherPageNote.loading('X'), weatherPageNote.shown('X'), weatherPageNote.failed('X', true), weatherPageNote.failed('', false)].join(' ');
    expect(all).not.toMatch(/[–—]/);
  });
});
