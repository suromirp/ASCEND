import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEEKDAY_HOUR,
  DEFAULT_WEEKEND_HOUR,
  clockNL,
  isForecastStale,
  isWeatherSensitive,
  nextOutdoorTraining,
  sessionWeather,
  updatedLabel,
  usualStartHour,
  verdictLine,
  weatherForTraining,
} from './weather';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { WeatherHour } from '../models/weather';
import { makeForecast } from './fixtures/weatherFixture';

const run: SessionTemplate = { id: 'run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 45 } };
const hike: SessionTemplate = { id: 'hike', name: 'Bergtocht', type: 'hiking', durationVariants: { full: 180 } };
const lower: SessionTemplate = { id: 'lower', name: 'Benen A', type: 'strength', durationVariants: { full: 50 } };
const rest: SessionTemplate = { id: 'rest', name: 'Herstel', type: 'recovery', durationVariants: { full: 20 } };

const WEEKDAY = '2026-10-21'; // Wednesday
const SATURDAY = '2026-10-24';
const forecast = (tweak?: Parameters<typeof makeForecast>[1], options?: Parameters<typeof makeForecast>[2]) => makeForecast('2026-10-20', tweak, options);

// A log that ENDED at the given local clock time, so it started `minutes` earlier.
function endedAt(id: string, date: string, hour: number, minute: number, minutes: number, extra: Partial<SessionLog> = {}): SessionLog {
  const [y, m, d] = date.split('-').map(Number);
  return {
    id, templateId: 'run', type: 'cardio', completedDate: date, completedAt: new Date(y, m - 1, d, hour, minute).toISOString(),
    variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
  };
}

describe('usualStartHour', () => {
  it('is 18.00 on a weekday and 10.00 in the weekend without enough logs', () => {
    expect(usualStartHour(run, [], WEEKDAY)).toEqual({ hour: DEFAULT_WEEKDAY_HOUR, basis: 'standaard' });
    expect(usualStartHour(run, [], SATURDAY)).toEqual({ hour: DEFAULT_WEEKEND_HOUR, basis: 'standaard' });
    // Two logs are not a habit yet.
    const two = [endedAt('a', '2026-10-12', 7, 30, 30), endedAt('b', '2026-10-13', 7, 30, 30)];
    expect(usualStartHour(run, two, WEEKDAY).basis).toBe('standaard');
  });

  it('takes the median start of earlier runs: end time minus duration', () => {
    // Ended 07:30, 07:45 and 07:15 after 30 minutes: starts 7.00, 7.25 and 6.75 -> 7.
    const logs = [endedAt('a', '2026-10-12', 7, 30, 30), endedAt('b', '2026-10-13', 7, 45, 30), endedAt('c', '2026-10-14', 7, 15, 30)];
    expect(usualStartHour(run, logs, WEEKDAY)).toEqual({ hour: 7, basis: 'logs' });
  });

  it('keeps one late-typed log from deciding', () => {
    const logs = [endedAt('a', '2026-10-12', 18, 30, 45), endedAt('b', '2026-10-13', 18, 45, 45), endedAt('c', '2026-10-14', 18, 20, 45), endedAt('late', '2026-10-15', 23, 0, 45)];
    expect(usualStartHour(run, logs, WEEKDAY).hour).toBe(18);
  });

  it('keeps weekdays and the weekend apart once each has enough logs', () => {
    const week = [endedAt('a', '2026-10-12', 19, 0, 60), endedAt('b', '2026-10-13', 19, 0, 60), endedAt('c', '2026-10-14', 19, 0, 60)];
    const weekend = [endedAt('d', '2026-10-10', 10, 0, 120), endedAt('e', '2026-10-11', 10, 0, 120), endedAt('f', '2026-10-17', 10, 0, 120)];
    expect(usualStartHour(run, [...week, ...weekend], WEEKDAY).hour).toBe(18);
    expect(usualStartHour(run, [...week, ...weekend], SATURDAY).hour).toBe(8);
  });

  it('falls back to all days when one kind of day has too few logs', () => {
    const week = [endedAt('a', '2026-10-12', 19, 0, 60), endedAt('b', '2026-10-13', 19, 0, 60), endedAt('c', '2026-10-14', 19, 0, 60)];
    expect(usualStartHour(run, week, SATURDAY)).toEqual({ hour: 18, basis: 'logs' });
  });

  it('ignores other sports, the treadmill, old logs and logs after the day', () => {
    const logs = [
      endedAt('h1', '2026-10-12', 7, 30, 30, { templateId: 'hike', type: 'hiking' }),
      endedAt('h2', '2026-10-13', 7, 30, 30, { templateId: 'hike', type: 'hiking' }),
      endedAt('h3', '2026-10-14', 7, 30, 30, { templateId: 'hike', type: 'hiking' }),
      endedAt('t1', '2026-10-12', 7, 30, 30, { cardioData: { durationMinutes: 30, environment: 'treadmill', source: 'manual' } }),
      endedAt('t2', '2026-10-13', 7, 30, 30, { cardioData: { durationMinutes: 30, environment: 'treadmill', source: 'manual' } }),
      endedAt('t3', '2026-10-14', 7, 30, 30, { cardioData: { durationMinutes: 30, environment: 'treadmill', source: 'manual' } }),
      endedAt('o1', '2026-05-01', 7, 30, 30), endedAt('o2', '2026-05-02', 7, 30, 30), endedAt('o3', '2026-05-03', 7, 30, 30),
      endedAt('f1', '2026-11-12', 7, 30, 30), endedAt('f2', '2026-11-13', 7, 30, 30), endedAt('f3', '2026-11-14', 7, 30, 30),
    ];
    expect(usualStartHour(run, logs, WEEKDAY).basis).toBe('standaard');
  });

  it('has nothing to say for strength', () => {
    expect(usualStartHour(lower, [], WEEKDAY).basis).toBe('standaard');
  });
});

describe('sessionWeather: the line', () => {
  it('reads like "14 graden, droog, licht tot 18.12"', () => {
    const w = sessionWeather({ forecast: forecast(), date: WEEKDAY, startHour: 17, durationMinutes: 45 })!;
    expect(w.verdict).toBe('prima');
    expect(w.line).toBe('14 graden, droog, licht tot 18.12');
    expect(w.daylight).toMatchObject({ sunset: '18:12', endsAfterSunset: false, lampNeeded: false });
  });

  it('says to take a light when you finish after sunset', () => {
    const w = sessionWeather({ forecast: forecast(), date: WEEKDAY, startHour: 18, durationMinutes: 60 })!;
    expect(w.daylight).toMatchObject({ endsAfterSunset: true, lampNeeded: true });
    expect(w.line).toBe('14 graden, droog, donker vanaf 18.12, neem een lampje mee');
  });

  it('the last minute counts: ending exactly at sunset is still light', () => {
    const w = sessionWeather({ forecast: forecast(), date: WEEKDAY, startHour: 17, durationMinutes: 72 })!;
    expect(w.daylight?.endsAfterSunset).toBe(false);
    expect(sessionWeather({ forecast: forecast(), date: WEEKDAY, startHour: 17, durationMinutes: 73 })!.daylight?.endsAfterSunset).toBe(true);
  });

  it('says to take a light when you start before sunrise', () => {
    const w = sessionWeather({ forecast: forecast(), date: WEEKDAY, startHour: 7, durationMinutes: 60 })!;
    expect(w.daylight).toMatchObject({ startsBeforeSunrise: true, lampNeeded: true });
    expect(w.line).toContain('donker tot 8.05, neem een lampje mee');
  });

  it('adds the felt temperature when it differs by four degrees or more', () => {
    const w = sessionWeather({ forecast: forecast((_, h) => (h === 18 ? { tempC: 9, feelsC: 4 } : undefined)), date: WEEKDAY, startHour: 18, durationMinutes: 30 })!;
    expect(w.line.startsWith('9 graden, voelt als 4, droog')).toBe(true);
  });

  it('names the rain and the wind', () => {
    const w = sessionWeather({ forecast: forecast((_, h) => (h === 18 ? { precipMm: 1.4, precipProb: 80, windKmh: 40, gustKmh: 58 } : undefined)), date: WEEKDAY, startHour: 18, durationMinutes: 30 })!;
    expect(w.line).toContain('lichte regen');
    expect(w.line).toContain('harde wind, vlagen tot 58 km/u');
  });

  it('mentions a chance of a shower when it is likely but nothing is forecast to fall', () => {
    const w = sessionWeather({ forecast: forecast((_, h) => (h === 18 ? { precipProb: 60 } : undefined)), date: WEEKDAY, startHour: 18, durationMinutes: 30 })!;
    expect(w.verdict).toBe('prima');
    expect(w.line).toContain('kans op een bui');
  });
});

describe('sessionWeather: the verdict', () => {
  const verdictFor = (tweak: Parameters<typeof makeForecast>[1], minutes = 45) => sessionWeather({ forecast: forecast(tweak), date: WEEKDAY, startHour: 18, durationMinutes: minutes })!;
  const evening = (patch: Partial<WeatherHour>) => (_: string, h: number) => (h >= 18 && h <= 19 ? patch : undefined);

  it('prima in mild, dry weather', () => {
    expect(verdictFor(() => undefined)).toMatchObject({ verdict: 'prima', reasons: [] });
    expect(verdictLine(verdictFor(() => undefined))).toBe('Prima weer');
  });

  it('let op: wind, rain, snow, fog, heat and cold', () => {
    expect(verdictFor(evening({ windKmh: 40 }))).toMatchObject({ verdict: 'let_op', watch: ['harde wind'] });
    expect(verdictFor(evening({ gustKmh: 70 }))).toMatchObject({ verdict: 'let_op', watch: ['harde wind'] });
    expect(verdictFor(evening({ precipMm: 1.5 }), 120)).toMatchObject({ verdict: 'let_op', watch: ['regen'] });
    expect(verdictFor(evening({ precipMm: 0.6 }), 60)).toMatchObject({ verdict: 'let_op', watch: ['regen'] });
    expect(verdictFor(evening({ precipMm: 0.2 }), 60)).toMatchObject({ verdict: 'prima' });
    expect(verdictFor(evening({ code: 73, precipMm: 0.1 }))).toMatchObject({ verdict: 'let_op', watch: ['sneeuw'] });
    expect(verdictFor(evening({ code: 45 }))).toMatchObject({ verdict: 'let_op', watch: ['mist'] });
    expect(verdictFor(evening({ feelsC: 28, tempC: 26 }))).toMatchObject({ verdict: 'let_op', watch: ['warm'] });
    expect(verdictFor(evening({ feelsC: -6, tempC: -2 }))).toMatchObject({ verdict: 'let_op', watch: ['koud'] });
  });

  it('slecht: thunder, ice, heavy snow, storm, heavy rain, extreme heat and cold', () => {
    expect(verdictFor(evening({ code: 95 }))).toMatchObject({ verdict: 'slecht', bad: ['onweer'] });
    expect(verdictFor(evening({ code: 99 }))).toMatchObject({ verdict: 'slecht', bad: ['onweer'] });
    expect(verdictFor(evening({ code: 56 }))).toMatchObject({ verdict: 'slecht', bad: ['ijzel'] });
    expect(verdictFor(evening({ code: 67 }))).toMatchObject({ verdict: 'slecht', bad: ['ijzel'] });
    expect(verdictFor(evening({ code: 75 }))).toMatchObject({ verdict: 'slecht', bad: ['zware sneeuw'] });
    expect(verdictFor(evening({ windKmh: 65 }))).toMatchObject({ verdict: 'slecht', bad: ['storm'] });
    expect(verdictFor(evening({ gustKmh: 95 }))).toMatchObject({ verdict: 'slecht', bad: ['storm'] });
    expect(verdictFor(evening({ precipMm: 4.5 }))).toMatchObject({ verdict: 'slecht', bad: ['zware regen'] });
    expect(verdictFor(evening({ precipMm: 5.5 }), 120)).toMatchObject({ verdict: 'slecht', bad: ['zware regen'] });
    expect(verdictFor(evening({ feelsC: 33, tempC: 31 }))).toMatchObject({ verdict: 'slecht', bad: ['extreme hitte'] });
    expect(verdictFor(evening({ feelsC: -16, tempC: -9 }))).toMatchObject({ verdict: 'slecht', bad: ['strenge kou'] });
  });

  it('a bad reason is not also listed as a milder one', () => {
    const w = verdictFor(evening({ windKmh: 70, gustKmh: 100, precipMm: 6 }), 120);
    expect(w.bad).toEqual(['storm', 'zware regen']);
    expect(w.watch).toEqual([]);
    expect(verdictLine(w)).toBe('Slecht weer: storm en zware regen');
  });

  it('gives the verdict in words', () => {
    expect(verdictLine(verdictFor(evening({ windKmh: 40, precipMm: 1.5 }), 120))).toBe('Let op: harde wind en regen');
  });

  it('only weighs the hours of the training, and the worst of them', () => {
    // Thunder at 13.00 does not matter for an evening run, but a 6-hour hike from 10.00 meets it.
    const tweak = (_: string, h: number) => (h === 13 ? { code: 95 } : undefined);
    expect(sessionWeather({ forecast: forecast(tweak), date: WEEKDAY, startHour: 18, durationMinutes: 45 })!.verdict).toBe('prima');
    expect(sessionWeather({ forecast: forecast(tweak), date: WEEKDAY, startHour: 10, durationMinutes: 360 })!.verdict).toBe('slecht');
    // Rain adds up over the hours: 0.4 mm an hour for 3 hours is 1.2 mm.
    const drizzle = (_: string, h: number) => (h >= 10 && h < 13 ? { precipMm: 0.4 } : undefined);
    expect(sessionWeather({ forecast: forecast(drizzle), date: WEEKDAY, startHour: 10, durationMinutes: 180 })!.watch).toEqual(['regen']);
  });
});

describe('sessionWeather: the window', () => {
  it('starts at the current hour when the usual time has passed today', () => {
    const tweak = (_: string, h: number) => (h < 12 ? { code: 95 } : undefined);
    const f = forecast(tweak);
    const morning = new Date(2026, 9, 21, 9, 30);
    const afternoon = new Date(2026, 9, 21, 14, 10);
    expect(sessionWeather({ forecast: f, date: WEEKDAY, startHour: 10, durationMinutes: 120, now: morning })!.verdict).toBe('slecht');
    const later = sessionWeather({ forecast: f, date: WEEKDAY, startHour: 10, durationMinutes: 120, now: afternoon })!;
    expect(later.startHour).toBe(14);
    expect(later.verdict).toBe('prima');
    // Another day is not cut.
    expect(sessionWeather({ forecast: f, date: '2026-10-22', startHour: 10, durationMinutes: 120, now: afternoon })!.startHour).toBe(10);
  });

  it('stops at midnight', () => {
    const w = sessionWeather({ forecast: forecast(), date: WEEKDAY, startHour: 22, durationMinutes: 240 })!;
    expect(w.endHour).toBe(24);
    expect(w.daylight?.endsAfterSunset).toBe(true);
  });

  it('is undefined beyond the forecast', () => {
    expect(sessionWeather({ forecast: forecast(), date: '2026-11-20', startHour: 18, durationMinutes: 45 })).toBeUndefined();
    expect(sessionWeather({ forecast: forecast(undefined, { days: 2 }), date: '2026-10-24', startHour: 18, durationMinutes: 45 })).toBeUndefined();
  });

  it('works without sunrise and sunset, just without the daylight part', () => {
    const f = forecast();
    f.days = [];
    const w = sessionWeather({ forecast: f, date: WEEKDAY, startHour: 18, durationMinutes: 45 })!;
    expect(w.daylight).toBeUndefined();
    expect(w.line).toBe('14 graden, droog');
  });
});

describe('weatherForTraining', () => {
  it('uses the usual hour of the runs you did', () => {
    const logs = [endedAt('a', '2026-10-12', 7, 30, 30), endedAt('b', '2026-10-13', 7, 45, 30), endedAt('c', '2026-10-14', 7, 15, 30)];
    const f = forecast((_, h) => (h === 7 ? { code: 95 } : undefined));
    const w = weatherForTraining({ forecast: f, template: run, logs, date: WEEKDAY, durationMinutes: 30 })!;
    expect(w.startHour).toBe(7);
    expect(w.verdict).toBe('slecht');
  });

  it('is nothing for strength, a rest day or no forecast', () => {
    expect(weatherForTraining({ forecast: forecast(), template: lower, logs: [], date: WEEKDAY, durationMinutes: 50 })).toBeUndefined();
    expect(weatherForTraining({ forecast: forecast(), template: rest, logs: [], date: WEEKDAY, durationMinutes: 20 })).toBeUndefined();
    expect(weatherForTraining({ forecast: undefined, template: run, logs: [], date: WEEKDAY, durationMinutes: 45 })).toBeUndefined();
  });

  it('knows which trainings care about the weather', () => {
    expect(isWeatherSensitive(run)).toBe(true);
    expect(isWeatherSensitive(hike)).toBe(true);
    expect(isWeatherSensitive({ ...run, sport: 'cycling' })).toBe(true);
    expect(isWeatherSensitive(lower)).toBe(false);
    expect(isWeatherSensitive(rest)).toBe(false);
  });
});

describe('showing it', () => {
  it('writes clock times the Dutch way', () => {
    expect(clockNL('18:12')).toBe('18.12');
    expect(clockNL('08:05')).toBe('8.05');
  });

  it('says when the forecast was updated, in local time', () => {
    expect(updatedLabel(new Date(2026, 9, 22, 13, 5).toISOString())).toBe('bijgewerkt om 13.05');
    expect(updatedLabel('nonsense')).toMatch(/onbekend/);
  });

  it('calls a forecast stale after two hours', () => {
    const fetched = '2026-10-22T10:00:00.000Z';
    expect(isForecastStale(fetched, new Date('2026-10-22T11:59:00.000Z'))).toBe(false);
    expect(isForecastStale(fetched, new Date('2026-10-22T12:01:00.000Z'))).toBe(true);
    expect(isForecastStale('nonsense', new Date())).toBe(true);
  });
});

describe('de eerstvolgende buitentraining voor de pagina Weer', () => {
  const byId = new Map([run, hike, lower, rest].map((t) => [t.id, t]));
  const plan = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
    id, templateId, scheduledDate: date, weekStartDate: '2026-10-19', status: 'planned', order: 0, ...extra,
  });
  const done = (s: PlannedSession): SessionLog => ({
    id: `log-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: 'cardio', completedDate: s.scheduledDate,
    completedAt: `${s.scheduledDate}T18:00:00Z`, variant: 'full', durationMinutes: 45, source: 'manual',
  });

  it('vandaag buiten: die', () => {
    const today = plan('a', 'run', WEEKDAY);
    expect(nextOutdoorTraining([plan('k', 'lower', WEEKDAY), today], [], byId, WEEKDAY)?.session.id).toBe('a');
  });

  it('vandaag alleen binnen of al gedaan: morgen of later', () => {
    const ran = plan('a', 'run', WEEKDAY);
    const tomorrow = plan('b', 'hike', '2026-10-22');
    const next = nextOutdoorTraining([plan('k', 'lower', WEEKDAY), ran, tomorrow], [done(ran)], byId, WEEKDAY);
    expect(next?.session.id).toBe('b');
    expect(next?.date).toBe('2026-10-22');
  });

  it('een overgeslagen training telt niet', () => {
    const skipped = plan('a', 'run', WEEKDAY, { status: 'skipped' });
    expect(nextOutdoorTraining([skipped, plan('b', 'run', SATURDAY)], [], byId, WEEKDAY)?.session.id).toBe('b');
  });

  it('op een dag met twee buitentrainingen: de eerste in de volgorde van de dag', () => {
    const first = plan('a', 'hike', WEEKDAY, { order: 0 });
    const second = plan('b', 'run', WEEKDAY, { order: 1 });
    expect(nextOutdoorTraining([second, first], [], byId, WEEKDAY)?.session.id).toBe('a');
  });

  it('niets buiten binnen zeven dagen: niets', () => {
    expect(nextOutdoorTraining([plan('k', 'lower', WEEKDAY), plan('r', 'rest', SATURDAY), plan('far', 'run', '2026-10-28')], [], byId, WEEKDAY)).toBeUndefined();
  });
});
