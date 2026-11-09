import { describe, expect, it } from 'vitest';
import { mapRatings, mapRegions, ratingsUrl, regionsUrl } from './eaws';
import { mapWarningForecast, warningForecastUrl } from './openMeteoWarnings';

describe('EAWS-bestanden lezen', () => {
  it('bouwt de adressen zonder plek, alleen een bestand en een datum', () => {
    expect(regionsUrl('FR')).toBe('https://regions.avalanches.org/micro-regions/FR_micro-regions.geojson.json');
    expect(ratingsUrl('2027-02-10')).toBe('https://static.avalanche.report/eaws_bulletins/2027-02-10/2027-02-10.ratings.json');
  });

  it('leest gebieden als Polygon en MultiPolygon, met geldigheid, en slaat kapotte over', () => {
    const ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const raw = {
      features: [
        { properties: { id: 'XX-01' }, geometry: { type: 'Polygon', coordinates: [ring] } },
        { properties: { id: 'XX-02', start_date: '2024-11-01', end_date: null }, geometry: { type: 'MultiPolygon', coordinates: [[ring]] } },
        { properties: { id: 'XX-03' }, geometry: { type: 'Point', coordinates: [0, 0] } },
        { properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
      ],
    };
    expect(mapRegions(raw)).toEqual([
      { id: 'XX-01', polygons: [[ring]] },
      { id: 'XX-02', polygons: [[ring]], startDate: '2024-11-01' },
    ]);
    expect(mapRegions(null)).toEqual([]);
  });

  it('leest alleen de gewone klassen van 1 tot 5', () => {
    expect(mapRatings({ maxDangerRatings: { 'XX-01': 3, 'XX-01:pm': 4, 'XX-02': 0, 'XX-03': 'drie', 'XX-04': 5 } })).toEqual({ 'XX-01': 3, 'XX-04': 5 });
    expect(mapRatings('kapot')).toEqual({});
  });
});

describe('Open-Meteo voor de waarschuwingen', () => {
  it('vraagt twee dagen met de afgeronde plek', () => {
    const url = warningForecastUrl({ name: 'Bergdorp', lat: 45.1234, lon: 6.9876 });
    expect(url).toContain('latitude=45.12');
    expect(url).toContain('longitude=6.99');
    expect(url).toContain('hourly=temperature_2m,wind_gusts_10m,weather_code');
    expect(url).toContain('forecast_days=2');
  });

  it('gooit bij een antwoord zonder uren', () => {
    expect(() => mapWarningForecast({}, { name: 'x', lat: 1, lon: 1 }, '2027-01-01T00:00:00Z')).toThrow();
  });
});
