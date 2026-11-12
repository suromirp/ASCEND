import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';

// Eis 6 van de missiekaart (besluit 2026-11-12-missiekaart.md): een waarschuwing staat nooit achter een tik. Op de
// kaart van een training met een Briefing blijft het weer alleen als het let op of slecht is, en de horlogeregel
// alleen als versturen mislukte. Het weer en de horlogestand zijn nagespeeld.
const fake = vi.hoisted(() => ({ verdict: 'prima' as 'prima' | 'let_op' | 'slecht', watch: 'sent' as string }));
vi.mock('../state/AppDataContext', () => ({
  useAppData: () => ({ weather: { forecast: { fetchedAt: new Date().toISOString() } }, sessionLogs: [], program: undefined, settings: { overviews: {}, homeLocation: { lat: 52, lon: 5 } } }),
}));
vi.mock('../engine/weather', async (orig) => ({
  ...(await orig<typeof import('../engine/weather')>()),
  weatherForTraining: () => ({ verdict: fake.verdict, line: 'Regen en wind', startHour: 8 }),
  isForecastStale: () => false,
}));
vi.mock('../engine/clothing', async (orig) => ({ ...(await orig<typeof import('../engine/clothing')>()), weatherLineForTraining: () => undefined }));
vi.mock('../engine/bestMoment', () => ({ bestMomentForTraining: () => undefined }));
vi.mock('../engine/heatPace', () => ({ heatPace: () => undefined }));
vi.mock('./useAirQualityNote', () => ({ useAirQualityNote: () => undefined }));
vi.mock('./useRainSoonNote', () => ({ useRainSoonNote: () => undefined }));
vi.mock('./useWatchStatus', () => ({ useWatchStatuses: () => ({ statusOf: () => ({ kind: fake.watch, reason: 'Geen verbinding', sentAt: '2026-11-12T07:00:00Z' }), ready: true, reload: async () => undefined }) }));

const { WeatherLine } = await import('./WeatherLine');
const { WatchStatusRow } = await import('./WatchStatusRow');
const { templates } = buildDefaultProgramData();
const run = templates.find((t) => t.id === 'tpl_long_run')!;
const session = { id: 'ps1', templateId: run.id, scheduledDate: new Date().toISOString().slice(0, 10), status: 'planned' } as PlannedSession;

const weather = (onlyWarning: boolean) => renderToStaticMarkup(createElement(WeatherLine, { template: run, date: session.scheduledDate, minutes: 50, onlyWarning }));
const watch = (onlyFailed: boolean) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WatchStatusRow, { session, template: run, offer: false, onlyFailed })));

describe('weer op de missiekaart', () => {
  it('gewoon weer staat in de Briefing, niet op de kaart', () => {
    fake.verdict = 'prima';
    expect(weather(true)).toBe('');
    expect(weather(false)).toContain('Regen en wind');
  });
  it('let op en slecht weer blijven op de kaart, met hun woord vooraan', () => {
    fake.verdict = 'let_op';
    expect(weather(true)).toContain('Let op: Regen en wind');
    fake.verdict = 'slecht';
    expect(weather(true)).toContain('Slecht weer: Regen en wind');
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
