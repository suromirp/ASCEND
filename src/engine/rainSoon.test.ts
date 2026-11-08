import { describe, it, expect } from 'vitest';
import { rainSoonNote, type RainSoonInput } from './rainSoon';
import type { RainSoonForecast } from '../integrations/openMeteo';
import { mapRainSoon, rainSoonUrl } from '../integrations/openMeteo';
import { pad } from '../utils/pad';

// Amsterdam in november: wintertijd, UTC+1. De klok van de plek is de klok van de slots.
const CET = 3600;
const place = { name: 'Teststad', lat: 52.1, lon: 5.3 };

// Een tijd op de klok van de plek als moment: 17:40 CET is 16:40 UTC.
const local = (iso: string, offsetSec = CET) => new Date(Date.parse(`${iso}:00Z`) - offsetSec * 1000);

// Kwartierslots: `end` is het einde van een kwartier. `wet` zijn de eindtijden met regen.
function forecast(firstEnd: string, wet: string[], opts: { count?: number; offsetSec?: number; fetchedAt?: Date; mm?: number } = {}): RainSoonForecast {
  const start = Date.parse(`${firstEnd}:00Z`);
  const slots = Array.from({ length: opts.count ?? 16 }, (_, i) => {
    const d = new Date(start + i * 15 * 60_000);
    const time = `${d.toISOString().slice(0, 10)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    return { time, mm: wet.includes(time.slice(11)) ? (opts.mm ?? 0.6) : 0 };
  });
  const offsetSec = opts.offsetSec ?? CET;
  return { fetchedAt: (opts.fetchedAt ?? local('2026-11-08T17:40', offsetSec)).toISOString(), place, utcOffsetSec: offsetSec, slots };
}

const base = (over: Partial<RainSoonInput> = {}): RainSoonInput => ({
  forecast: forecast('2026-11-08T17:45', ['18:15', '18:30']),
  date: '2026-11-08',
  startMinutes: 18 * 60,
  durationMinutes: 45,
  now: local('2026-11-08T17:40'),
  ...over,
});

describe('rainSoonNote: de regel', () => {
  it('regen over twintig minuten, en wanneer het droog is', () => {
    expect(rainSoonNote(base())).toBe('Over 20 minuten regen; nu gaan of om 18:30.');
  });

  it('regen die begint na het einde van de training raakt je niet', () => {
    const f = forecast('2026-11-08T17:45', ['18:45', '19:00']);
    expect(rainSoonNote(base({ forecast: f, durationMinutes: 30 }))).toBeUndefined();
  });

  it('regen die voorbij is voor de training begint raakt je niet', () => {
    // Regen van 17:45 tot 18:00, training om 18:30.
    const f = forecast('2026-11-08T17:45', ['18:00']);
    expect(rainSoonNote(base({ forecast: f, startMinutes: 18 * 60 + 30 }))).toBeUndefined();
  });

  it('het regent nu en het wordt droog: zegt wanneer', () => {
    const f = forecast('2026-11-08T17:45', ['17:45', '18:00', '18:15']);
    expect(rainSoonNote(base({ forecast: f }))).toBe('Het regent nu; om 18:15 is het droog.');
  });

  it('het regent nu en blijft regenen tot het eind van de data: niets (de weerregel zegt regen al)', () => {
    const f = forecast('2026-11-08T17:45', Array.from({ length: 16 }, (_, i) => { const t = 17 * 60 + 45 + i * 15; return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; }));
    expect(rainSoonNote(base({ forecast: f }))).toBeUndefined();
  });

  it('regen die blijft zegt dat zonder een eindtijd te verzinnen', () => {
    const wet = Array.from({ length: 14 }, (_, i) => { const t = 18 * 60 + 15 + i * 15; return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; });
    const f = forecast('2026-11-08T17:45', wet);
    expect(rainSoonNote(base({ forecast: f }))).toBe('Over 20 minuten regen die blijft; nu gaan of een ander moment.');
  });

  it('een miezer onder 0,1 mm telt niet', () => {
    const f = forecast('2026-11-08T17:45', ['18:15', '18:30'], { mm: 0.05 });
    expect(rainSoonNote(base({ forecast: f }))).toBeUndefined();
  });

  it('regen later dan een uur vanaf nu is niet het komende uur', () => {
    const f = forecast('2026-11-08T17:45', ['19:00', '19:15']);
    expect(rainSoonNote(base({ forecast: f, startMinutes: 19 * 60, durationMinutes: 60 }))).toBeUndefined();
  });
});

describe('rainSoonNote: wanneer niets', () => {
  it('alleen op de dag zelf', () => {
    expect(rainSoonNote(base({ date: '2026-11-09', startMinutes: 8 * 60 }))).toBeUndefined();
    expect(rainSoonNote(base({ date: '2026-11-07' }))).toBeUndefined();
  });

  it('een training over twee uur of meer krijgt geen regel', () => {
    // Nu 17:40, regen vanaf 18:00 die blijft. Training om 19:40 (precies twee uur): niets; om 19:39: wel.
    const wet = Array.from({ length: 14 }, (_, i) => { const t = 18 * 60 + 15 + i * 15; return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; });
    const f = forecast('2026-11-08T17:45', wet);
    expect(rainSoonNote(base({ forecast: f, startMinutes: 19 * 60 + 40 }))).toBeUndefined();
    expect(rainSoonNote(base({ forecast: f, startMinutes: 19 * 60 + 39, durationMinutes: 120 }))).toBeTypeOf('string');
  });

  it('een training die al lang begon geeft geen regel', () => {
    expect(rainSoonNote(base({ startMinutes: 16 * 60 }))).toBeUndefined();
  });

  it('geen voorspelling, geen slots of onzin geeft niets', () => {
    expect(rainSoonNote(base({ forecast: undefined }))).toBeUndefined();
    expect(rainSoonNote(base({ forecast: { ...forecast('2026-11-08T17:45', []), slots: [] } }))).toBeUndefined();
    expect(rainSoonNote(base({ forecast: { ...forecast('2026-11-08T17:45', ['18:15']), utcOffsetSec: Number.NaN } }))).toBeUndefined();
    expect(rainSoonNote(base({ forecast: { ...forecast('2026-11-08T17:45', ['18:15']), fetchedAt: 'gisteren' } }))).toBeUndefined();
  });

  it('een kwartierbeeld van een uur oud is te oud', () => {
    const f = forecast('2026-11-08T17:45', ['18:15'], { fetchedAt: local('2026-11-08T16:30') });
    expect(rainSoonNote(base({ forecast: f }))).toBeUndefined();
  });

  it('slots die niet bij nu beginnen geven niets', () => {
    // Het eerste kwartier eindigt pas om 18:15: wat er nu is weten we niet.
    const f = forecast('2026-11-08T18:15', ['18:30', '18:45']);
    expect(rainSoonNote(base({ forecast: f }))).toBeUndefined();
  });
});

describe('rainSoonNote: middernacht en tijdzone', () => {
  it('rekent door middernacht heen', () => {
    // 23:40, training om 23:50; regen van 23:45 tot 00:15 (slots die om 00:00 en 00:15 eindigen).
    const now = local('2026-11-08T23:40');
    const f = forecast('2026-11-08T23:45', ['00:00', '00:15'], { count: 8, fetchedAt: now });
    expect(rainSoonNote(base({ forecast: f, now, startMinutes: 23 * 60 + 50, durationMinutes: 60 }))).toBe('Over 5 minuten regen; nu gaan of om 00:15.');
  });

  it('vlak na middernacht is het al de nieuwe dag', () => {
    const f = forecast('2026-11-09T00:15', ['00:30', '00:45'], { fetchedAt: local('2026-11-09T00:05') });
    expect(rainSoonNote(base({ forecast: f, now: local('2026-11-09T00:05'), date: '2026-11-08', startMinutes: 23 * 60 }))).toBeUndefined();
    expect(rainSoonNote(base({ forecast: f, now: local('2026-11-09T00:05'), date: '2026-11-09', startMinutes: 30 }))).toBe('Over 10 minuten regen; nu gaan of om 00:45.');
  });

  it('zomertijd (UTC+2) en wintertijd geven dezelfde regel op dezelfde klok', () => {
    const summer = 7200;
    const f = forecast('2026-07-08T17:45', ['18:15', '18:30'], { offsetSec: summer, fetchedAt: local('2026-07-08T17:40', summer) });
    expect(rainSoonNote(base({ forecast: f, date: '2026-07-08', now: local('2026-07-08T17:40', summer) }))).toBe('Over 20 minuten regen; nu gaan of om 18:30.');
  });

  it('de klok van de plek gaat voor die van de telefoon: 23:50 in de plek is al de volgende dag elders', () => {
    // Plek op UTC+1: het is 23:50 daar, ook al is het op de telefoon (UTC) 22:50.
    const now = new Date('2026-11-08T22:50:00Z');
    const f = forecast('2026-11-08T23:55', ['00:10'], { fetchedAt: now });
    expect(rainSoonNote({ forecast: f, date: '2026-11-08', startMinutes: 23 * 60 + 55, durationMinutes: 30, now })).toBe('Over 5 minuten regen; nu gaan of om 00:10.');
  });
});

describe('de adapter: minutely_15', () => {
  it('de aanvraag vraagt kwartieren met de afgeronde plek', () => {
    const url = rainSoonUrl({ name: 'x', lat: 52.1234, lon: 5.6789 });
    expect(url).toContain('minutely_15=precipitation');
    expect(url).toContain('forecast_minutely_15=16');
    expect(url).toContain('latitude=52.12');
    expect(url).toContain('longitude=5.68');
  });

  it('leest de kwartieren en de klok van de plek', () => {
    const raw = { utc_offset_seconds: 3600, minutely_15: { time: ['2026-11-08T17:45', '2026-11-08T18:00', 'kapot'], precipitation: [0, 0.4, 1] } };
    const f = mapRainSoon(raw, place, '2026-11-08T16:40:00.000Z');
    expect(f.utcOffsetSec).toBe(3600);
    expect(f.slots).toEqual([{ time: '2026-11-08T17:45', mm: 0 }, { time: '2026-11-08T18:00', mm: 0.4 }]);
  });

  it('een lege of beschadigde reeks is een fout, zodat er niets getoond wordt', () => {
    expect(() => mapRainSoon({ utc_offset_seconds: 3600, minutely_15: { time: [], precipitation: [] } }, place, 'x')).toThrow();
    expect(() => mapRainSoon({ minutely_15: { time: ['2026-11-08T17:45'], precipitation: [0] } }, place, 'x')).toThrow();
    expect(() => mapRainSoon(null, place, 'x')).toThrow();
  });
});
