import { describe, expect, it } from 'vitest';
import { airQualityNote } from './airQuality';
import { airQualityUrl, mapAirQuality, type AirQualityHour } from '../integrations/openMeteo';

const today = '2026-07-10';
const hour = (h: number, v: Omit<AirQualityHour, 'time'>): AirQualityHour => ({ time: `${today}T${String(h).padStart(2, '0')}:00`, ...v });

describe('luchtkwaliteit bij een harde training', () => {
  it('zegt niets bij gewone lucht of zonder getallen', () => {
    expect(airQualityNote([hour(18, { aqi: 35, ozone: 90 })], today, 18, 60, today)).toBeUndefined();
    expect(airQualityNote([], today, 18, 60, today)).toBeUndefined();
  });

  it('veel ozon in de uren van de training geeft de raad om s ochtends te gaan', () => {
    const note = airQualityNote([hour(15, { aqi: 72, ozone: 160 }), hour(16, { aqi: 66, ozone: 150 })], today, 15, 75, today)!;
    expect(note.cause).toBe('ozon');
    expect(note.text).toBe("Veel ozon vanmiddag. Liever 's ochtends, of vandaag rustig.");
  });

  it('fijnstof en andere slechte lucht zeggen kan helpen', () => {
    expect(airQualityNote([hour(19, { aqi: 65, ozone: 40, pm25: 38 })], today, 19, 45, today)?.text).toBe('Veel fijnstof in de lucht vanavond. Een rustige training of binnen kan helpen.');
    expect(airQualityNote([hour(8, { aqi: 61 })], '2026-07-11', 8, 45, today)).toBeUndefined();
    expect(airQualityNote([{ time: '2026-07-11T08:00', aqi: 61 }], '2026-07-11', 8, 45, today)?.text).toBe('Slechte luchtkwaliteit op dat uur. Een rustige training of binnen kan helpen.');
  });

  it('vraagt de index, ozon en fijnstof op de afgeronde plek en leest ze per uur', () => {
    const url = airQualityUrl({ name: 'Ergens', lat: 52.1234, lon: 5.1678 });
    expect(url).toContain('air-quality-api.open-meteo.com');
    expect(url).toContain('latitude=52.12&longitude=5.17');
    expect(url).toContain('hourly=european_aqi,ozone,pm2_5');
    const f = mapAirQuality({ hourly: { time: ['2026-07-10T15:00', 'rommel'], european_aqi: [72, 10], ozone: [160, 1], pm2_5: [null, 1] } }, { name: 'Ergens', lat: 52.1, lon: 5.1 }, '2026-07-10T08:00:00.000Z');
    expect(f.hours).toEqual([{ time: '2026-07-10T15:00', aqi: 72, ozone: 160 }]);
    expect(() => mapAirQuality({}, { name: 'Ergens', lat: 52.1, lon: 5.1 }, '')).toThrow();
  });
});
