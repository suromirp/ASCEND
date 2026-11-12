import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';

// Eis 6 van de missiekaart (besluit 2026-11-12-missiekaart.md): een waarschuwing staat nooit achter een tik. Op de
// kaart van een training met een Briefing blijft het weer alleen als het let op of slecht is, en de horlogeregel
// alleen als versturen mislukte. Het weer en de horlogestand zijn nagespeeld.
const fake = vi.hoisted(() => ({ verdict: 'prima' as 'prima' | 'let_op' | 'slecht', watch: 'sent' as string, feelsC: 12, rain: false, air: false }));
vi.mock('../state/AppDataContext', () => ({
  useAppData: () => ({ weather: { forecast: { fetchedAt: new Date().toISOString() } }, sessionLogs: [], program: undefined, settings: { overviews: {}, homeLocation: { lat: 52, lon: 5 } } }),
}));
vi.mock('../engine/weather', async (orig) => ({
  ...(await orig<typeof import('../engine/weather')>()),
  weatherForTraining: () => ({ verdict: fake.verdict, line: 'Regen en wind', startHour: 8, feelsC: fake.feelsC, dewPointC: 8, bad: false }),
  isForecastStale: () => false,
}));
vi.mock('../engine/clothing', async (orig) => ({ ...(await orig<typeof import('../engine/clothing')>()), weatherLineForTraining: () => undefined }));
vi.mock('../engine/bestMoment', () => ({ bestMomentForTraining: () => undefined }));
// Regen en lucht komen uit een effect, dat zonder DOM niet draait (het project heeft geen jsdom). De hooks geven hier
// de echte uitkomst van de engine (engine/rainSoon.ts, engine/airQuality.ts) op een nagemaakte voorspelling; alleen het
// ophalen valt weg. Hitte rekent de echte engine/heatPace.ts in WeatherLine zelf.
vi.mock('./useAirQualityNote', async () => {
  const { airQualityNote } = await import('../engine/airQuality');
  return { useAirQualityNote: ({ date }: { date: string }) => (fake.air ? airQualityNote([{ time: `${date}T08:00`, aqi: 90, ozone: 200 }], date, 8, 50, date) : undefined) };
});
vi.mock('./useRainSoonNote', async () => {
  const { rainSoonNote } = await import('../engine/rainSoon');
  return {
    useRainSoonNote: ({ date }: { date: string }) => {
      if (!fake.rain) return undefined;
      const now = new Date(`${date}T07:50:00Z`);
      const slots = ['08:00', '08:15', '08:30', '08:45', '09:00'].map((t, i) => ({ time: `${date}T${t}`, mm: i >= 1 ? 1.2 : 0 }));
      return rainSoonNote({ forecast: { fetchedAt: now.toISOString(), utcOffsetSec: 0, slots } as never, date, startMinutes: 8 * 60, durationMinutes: 50, now });
    },
  };
});
vi.mock('./useWatchStatus', () => ({ useWatchStatuses: () => ({ statusOf: () => ({ kind: fake.watch, reason: 'Geen verbinding', sentAt: '2026-11-12T07:00:00Z' }), ready: true, reload: async () => undefined }) }));

const { WeatherLine } = await import('./WeatherLine');
const { WatchStatusRow } = await import('./WatchStatusRow');
const { templates } = buildDefaultProgramData();
const run = templates.find((t) => t.id === 'tpl_long_run')!;
const session = { id: 'ps1', templateId: run.id, scheduledDate: new Date().toISOString().slice(0, 10), status: 'planned' } as PlannedSession;

const weather = (onlyWarning: boolean) => renderToStaticMarkup(createElement(WeatherLine, { template: run, date: session.scheduledDate, minutes: 50, onlyWarning }));
const watch = (onlyFailed: boolean) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WatchStatusRow, { session, template: run, offer: false, onlyFailed })));

beforeEach(() => {
  fake.verdict = 'prima';
  fake.feelsC = 12;
  fake.rain = false;
  fake.air = false;
});

describe('weer op de missiekaart', () => {
  it('gewoon weer staat in de Briefing, niet op de kaart', () => {
    expect(weather(true)).toBe('');
    expect(weather(false)).toContain('Regen en wind');
  });
  it('let op en slecht weer blijven op de kaart, met hun woord vooraan', () => {
    fake.verdict = 'let_op';
    expect(weather(true)).toContain('Let op: Regen en wind');
    fake.verdict = 'slecht';
    expect(weather(true)).toContain('Slecht weer: Regen en wind');
  });
  it('bij gewoon weer blijven hitte, regen binnen het uur en slechte lucht op de kaart, zonder de hoofdregel', () => {
    fake.feelsC = 27;
    const heat = weather(true);
    expect(heat).toContain('Loop op hartslag');
    expect(heat).not.toContain('Regen en wind');
    fake.feelsC = 12;
    fake.rain = true;
    const rain = weather(true);
    expect(rain).not.toBe('');
    expect(rain).not.toContain('Regen en wind');
    fake.rain = false;
    fake.air = true;
    const air = weather(true);
    expect(air).not.toBe('');
    expect(air).not.toContain('Regen en wind');
  });
});

describe('horloge op de missiekaart', () => {
  it('verstuurd staat in de Briefing, niet op de kaart', () => {
    fake.watch = 'sent';
    expect(watch(true)).toBe('');
    expect(watch(false)).not.toBe('');
  });
  it('mislukt blijft op de kaart', () => {
    fake.watch = 'failed';
    expect(watch(true)).not.toBe('');
    expect(watch(true)).toContain('color:var(--color-warning)');
  });
});
