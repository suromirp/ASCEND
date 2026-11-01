import { describe, it, expect } from 'vitest';
import type { LeavePeriod } from '../models/leave';
import type { MountainForecast, MountainHour } from '../integrations/openMeteo';
import { mapMountainForecast, mountainForecastUrl } from '../integrations/openMeteo';
import { MOUNTAIN_WEATHER_LINK, mountainTrekDay, mountainUpdatedLabel, mountainWeatherLine } from './mountainWeather';

// Nagemaakte tochten en een nagemaakte plek.
const PLACE = { name: 'Bergdorp', lat: 45.12345, lon: 6.98765 };
function trek(start: string, end: string, terrain: 'mountain' | 'snow' | 'uneven_trail', highestM?: number): LeavePeriod {
  return { id: `trek_${start}`, kind: 'trek', startDate: start, endDate: end, trek: { name: 'Bergweek', terrain, tent: false, importance: 'training', ...(highestM ? { highestM } : {}) } };
}

describe('de vraag aan Open-Meteo', () => {
  it('vraagt dezelfde afgeronde plek met de hoogte erbij, en leest wat er komt', () => {
    const url = new URL(mountainForecastUrl(PLACE, 2512.4));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('45.12');
    expect(url.searchParams.get('longitude')).toBe('6.99');
    expect(url.searchParams.get('elevation')).toBe('2512');
    expect(url.searchParams.get('hourly')).toBe('temperature_2m,wind_gusts_10m,cape,freezing_level_height,weather_code');
    const f = mapMountainForecast({ hourly: { time: ['2027-07-02T14:00', 'kapot'], temperature_2m: [4.2, 3], wind_gusts_10m: [48], cape: [1200], freezing_level_height: [3100], weather_code: [95] } }, PLACE, 2500, '2027-07-01T19:00:00.000Z');
    expect(f.hours).toEqual([{ time: '2027-07-02T14:00', tempC: 4.2, gustKmh: 48, capeJkg: 1200, freezingM: 3100, code: 95 }]);
    expect(f.place).toEqual({ name: 'Bergdorp', lat: 45.12, lon: 6.99 });
    expect(() => mapMountainForecast({}, PLACE, 2500, '2027-07-01T19:00:00.000Z')).toThrow();
  });
});

describe('mountainTrekDay: wanneer er bergweer is', () => {
  it('alleen bij een tocht in de bergen of de sneeuw met een hoogste punt, vandaag of morgen', () => {
    const t = trek('2027-07-02', '2027-07-05', 'mountain', 2500);
    expect(mountainTrekDay([t], '2027-06-30')).toBeUndefined();
    expect(mountainTrekDay([t], '2027-07-01')).toMatchObject({ date: '2027-07-02', when: 'morgen', highestM: 2500 });
    expect(mountainTrekDay([t], '2027-07-03')).toMatchObject({ date: '2027-07-03', when: 'vandaag' });
    expect(mountainTrekDay([t], '2027-07-05')).toMatchObject({ date: '2027-07-05', when: 'vandaag' });
    expect(mountainTrekDay([t], '2027-07-06')).toBeUndefined();
    expect(mountainTrekDay([trek('2027-07-02', '2027-07-05', 'uneven_trail', 600)], '2027-07-03')).toBeUndefined();
    expect(mountainTrekDay([trek('2027-07-02', '2027-07-05', 'snow')], '2027-07-03')).toBeUndefined();
    expect(mountainTrekDay([trek('2027-07-02', '2027-07-05', 'snow', 1800)], '2027-07-03')).toMatchObject({ highestM: 1800 });
  });
});

function hours(date: string, make: (h: number) => Partial<MountainHour>): MountainHour[] {
  return Array.from({ length: 24 }, (_, h) => ({ time: `${date}T${String(h).padStart(2, '0')}:00`, tempC: 5, ...make(h) }));
}
const forecast = (hs: MountainHour[]): MountainForecast => ({ fetchedAt: '2027-07-01T19:10:00.000Z', place: { name: 'Bergdorp', lat: 45.12, lon: 6.99 }, elevationM: 2500, hours: hs });

describe('mountainWeatherLine: alleen informatie, geen oordeel', () => {
  it('noemt de temperatuur op hoogte, de windstoten, onweer in de middag en het vriespunt', () => {
    const f = forecast(hours('2027-07-02', (h) => ({ tempC: h < 12 ? 2 : 8, gustKmh: h === 15 ? 52 : 20, capeJkg: h === 15 ? 1400 : 100, freezingM: 3100 })));
    const r = mountainWeatherLine(f, '2027-07-02', 'morgen')!;
    expect(r.line).toBe('Op 2.500 m morgen tussen 2 en 8 graden, windstoten tot 52 km per uur, kans op onweer in de middag. Het vriespunt ligt rond 3.100 m.');
    expect(r.line).not.toMatch(/ga niet|gevaarlijk|veilig/i);
  });

  it('zegt rond bij weinig verschil en noemt geen onweer als het er niet is', () => {
    const f = forecast(hours('2027-07-02', () => ({ tempC: 4, gustKmh: 25 })));
    expect(mountainWeatherLine(f, '2027-07-02', 'vandaag')!.line).toBe('Op 2.500 m vandaag rond 4 graden, windstoten tot 25 km per uur.');
  });

  it('zegt niets zonder uren voor die dag', () => {
    expect(mountainWeatherLine(forecast(hours('2027-07-05', () => ({}))), '2027-07-02', 'morgen')).toBeUndefined();
  });

  it('heeft een vaste verwijzing naar het officiële bergweer', () => {
    expect(MOUNTAIN_WEATHER_LINK.url).toMatch(/^https:\/\//);
  });
});

describe('mountainUpdatedLabel: van gisteren blijft staan, met de dag erbij', () => {
  it('zegt gisteren of de datum als het niet van vandaag is', () => {
    const at = new Date(2027, 6, 1, 21, 10).toISOString();
    expect(mountainUpdatedLabel(at, '2027-07-01')).toBe('bijgewerkt om 21.10');
    expect(mountainUpdatedLabel(at, '2027-07-02')).toBe('gisteren bijgewerkt om 21.10');
    expect(mountainUpdatedLabel(at, '2027-07-04')).toBe('bijgewerkt om 21.10 op 1 jul');
  });
});
