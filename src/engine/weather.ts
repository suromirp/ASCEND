// ASCEND: weather for one training. Pure: a forecast goes in (models/weather.ts,
// filled by integrations/openMeteo.ts), a plain-language verdict comes out.
//
// Three questions, answered one by one:
//   1. WHEN do you usually train? (usualStartHour)
//   2. WHAT is the weather in those hours, and is it fine, to watch, or bad?
//      (sessionWeather, rules WEATHER-* below)
//   3. IS IT STILL LIGHT when you finish? (the daylight part of sessionWeather)
//
// No guessing: the same forecast and the same logs always give the same
// answer, and every threshold below is a number on this page.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { WeatherForecast, WeatherHour } from '../models/weather';
import { isIndoorLog, logSport, templateSport } from './sports';
import { addDays, daysBetween, isoWeekday, toISODate } from '../utils/dates';
import { deriveSessionStatus } from './sessionStatus';

// --- 1. when do you usually train ----------------------------------------------

// Rule WEATHER-START. With at least MIN_LOGS earlier outdoor trainings of the
// same sport in the last 10 weeks, the usual hour is the median start of
// those (the same kind of day first: weekdays and weekend days differ). A log
// holds the time you finished, so the start is that minus the duration; a
// training typed in much later pulls the start late, and the median keeps one
// such log from deciding. Without enough logs: 18.00 on weekdays, 10.00 in
// the weekend, the usual moments for an evening run and a day out.
export const DEFAULT_WEEKDAY_HOUR = 18;
export const DEFAULT_WEEKEND_HOUR = 10;
export const MIN_LOGS = 3;
const LOOKBACK_DAYS = 70;
const EARLIEST_HOUR = 5;
const LATEST_HOUR = 21;

export interface UsualStart {
  hour: number;
  // 'logs': from your earlier trainings. 'standaard': the fixed default.
  basis: 'logs' | 'standaard';
}

const isWeekend = (date: string) => isoWeekday(date) >= 6;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function usualStartHour(template: SessionTemplate, logs: SessionLog[], date: string): UsualStart {
  const fallback: UsualStart = { hour: isWeekend(date) ? DEFAULT_WEEKEND_HOUR : DEFAULT_WEEKDAY_HOUR, basis: 'standaard' };
  const sport = templateSport(template);
  if (!sport) return fallback;
  const starts = logs
    .filter((l) => logSport(l) === sport && !isIndoorLog(l) && l.durationMinutes > 0)
    .filter((l) => { const ago = daysBetween(l.completedDate, date); return ago >= 0 && ago <= LOOKBACK_DAYS; })
    .map((l) => {
      const end = new Date(l.completedAt);
      if (Number.isNaN(end.getTime())) return undefined;
      const start = end.getHours() + end.getMinutes() / 60 - l.durationMinutes / 60;
      return start >= EARLIEST_HOUR && start <= LATEST_HOUR ? { date: l.completedDate, start } : undefined;
    })
    .filter((s): s is { date: string; start: number } => !!s);
  const sameKind = starts.filter((s) => isWeekend(s.date) === isWeekend(date));
  const pool = sameKind.length >= MIN_LOGS ? sameKind : starts;
  if (pool.length < MIN_LOGS) return fallback;
  const hour = Math.min(LATEST_HOUR, Math.max(EARLIEST_HOUR, Math.round(median(pool.map((s) => s.start)))));
  return { hour, basis: 'logs' };
}

// --- 2. what is the weather ----------------------------------------------------

export type WeatherVerdict = 'prima' | 'let_op' | 'slecht';

// Thresholds, one place. Wind speeds are 10 m averages in km/h. Beaufort 6
// (strong breeze) starts at 39, Beaufort 8 (gale) at 62, Beaufort 9 (storm) at 75.
export const WEATHER_RULES = {
  // WEATHER-WIND: harde wind (let op), storm (slecht)
  windWatch: 38,
  gustWatch: 65,
  windBad: 62,
  gustBad: 90,
  // WEATHER-RAIN: regen (let op), zware regen (slecht). Millimetres of water.
  rainWatchTotal: 1,
  rainWatchHour: 0.5,
  rainBadTotal: 10,
  rainBadHour: 4,
  // WEATHER-HEAT and WEATHER-COLD, on the felt temperature in degrees
  heatWatch: 27,
  heatBad: 32,
  coldWatch: -5,
  coldBad: -15,
} as const;

const THUNDER = new Set([95, 96, 99]);
const FREEZING = new Set([56, 57, 66, 67]); // ice on the road and on the path
const HEAVY_SNOW = new Set([75, 86]);
const SNOW = new Set([71, 73, 77, 85]);
const FOG = new Set([45, 48]);

export interface Daylight {
  sunrise: string; // 'HH:MM'
  sunset: string; // 'HH:MM'
  // You finish after sunset / start before sunrise: take a light.
  endsAfterSunset: boolean;
  startsBeforeSunrise: boolean;
  lampNeeded: boolean;
}

export interface SessionWeather {
  date: string;
  startHour: number;
  endHour: number; // exclusive
  hours: number; // forecast hours the figures are taken from
  tempC: number; // average over the window
  feelsC: number; // average felt temperature
  precipMm: number; // total over the window
  precipProb?: number; // highest chance of precipitation
  windKmh: number; // highest
  gustKmh: number; // highest
  uvIndex?: number; // highest UV index in the window; absent when the forecast has none
  verdict: WeatherVerdict;
  // Short words behind the verdict: 'onweer', 'harde wind', 'regen' ...
  reasons: string[];
  // The part of the answer that is the verdict's own problem (let op / slecht).
  watch: string[];
  bad: string[];
  daylight?: Daylight;
  // The text for the one calm line, e.g. "14 graden, droog, licht tot 18.12".
  line: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const hourKey = (date: string, hour: number) => `${date}T${pad(hour)}:00`;
const minutesOfClock = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));

// "18:12" -> "18.12", "08:05" -> "8.05": how Dutch people write a clock time.
export function clockNL(hhmm: string): string {
  return `${Number(hhmm.slice(0, 2))}.${hhmm.slice(3, 5)}`;
}

function joinNL(parts: string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
}

export interface SessionWeatherInput {
  forecast: WeatherForecast;
  date: string;
  startHour: number;
  durationMinutes: number;
  // Only to cut the part of today that is already over off the front.
  now?: Date;
}

export function sessionWeather({ forecast, date, startHour, durationMinutes, now }: SessionWeatherInput): SessionWeather | undefined {
  let from = startHour;
  // Later today you can only still train from now on.
  if (now && toISODate(now) === date) from = Math.max(from, now.getHours());
  const length = Math.max(1, Math.ceil(durationMinutes / 60));
  const to = Math.min(24, from + length);
  const byTime = new Map(forecast.hours.map((h) => [h.time, h]));
  const hours: WeatherHour[] = [];
  for (let h = from; h < to; h++) {
    const hour = byTime.get(hourKey(date, h));
    if (hour) hours.push(hour);
  }
  if (hours.length === 0) return undefined;

  const avg = (pick: (h: WeatherHour) => number) => hours.reduce((sum, h) => sum + pick(h), 0) / hours.length;
  const tempC = avg((h) => h.tempC);
  const feelsC = avg((h) => h.feelsC);
  const precipMm = hours.reduce((sum, h) => sum + h.precipMm, 0);
  const maxHourMm = Math.max(...hours.map((h) => h.precipMm));
  const probs = hours.map((h) => h.precipProb).filter((p): p is number => p !== undefined);
  const precipProb = probs.length ? Math.max(...probs) : undefined;
  const windKmh = Math.max(...hours.map((h) => h.windKmh));
  const gustKmh = Math.max(...hours.map((h) => h.gustKmh));
  const maxFeels = Math.max(...hours.map((h) => h.feelsC));
  const minFeels = Math.min(...hours.map((h) => h.feelsC));
  const uvs = hours.map((h) => h.uvIndex).filter((u): u is number => u !== undefined);
  const uvIndex = uvs.length ? Math.max(...uvs) : undefined;
  const codes = hours.map((h) => h.code);
  const R = WEATHER_RULES;

  const bad: string[] = [];
  const watch: string[] = [];
  if (codes.some((c) => THUNDER.has(c))) bad.push('onweer');
  if (codes.some((c) => FREEZING.has(c))) bad.push('ijzel');
  if (codes.some((c) => HEAVY_SNOW.has(c))) bad.push('zware sneeuw');
  if (windKmh >= R.windBad || gustKmh >= R.gustBad) bad.push('storm');
  if (precipMm >= R.rainBadTotal || maxHourMm >= R.rainBadHour) bad.push('zware regen');
  if (maxFeels >= R.heatBad) bad.push('extreme hitte');
  if (minFeels <= R.coldBad) bad.push('strenge kou');

  const heavyRain = bad.includes('zware regen');
  if (!bad.includes('storm') && (windKmh >= R.windWatch || gustKmh >= R.gustWatch)) watch.push('harde wind');
  if (!heavyRain && !bad.includes('ijzel') && (precipMm >= R.rainWatchTotal || maxHourMm >= R.rainWatchHour)) watch.push('regen');
  if (codes.some((c) => SNOW.has(c)) && !bad.includes('zware sneeuw')) watch.push('sneeuw');
  if (codes.some((c) => FOG.has(c))) watch.push('mist');
  if (maxFeels >= R.heatWatch && !bad.includes('extreme hitte')) watch.push('warm');
  if (minFeels <= R.coldWatch && !bad.includes('strenge kou')) watch.push('koud');

  const verdict: WeatherVerdict = bad.length ? 'slecht' : watch.length ? 'let_op' : 'prima';

  const day = forecast.days.find((d) => d.date === date);
  let daylight: Daylight | undefined;
  if (day) {
    const startMin = from * 60;
    const endMin = startMin + durationMinutes;
    const endsAfterSunset = endMin > minutesOfClock(day.sunset);
    const startsBeforeSunrise = startMin < minutesOfClock(day.sunrise);
    daylight = {
      sunrise: day.sunrise.slice(11, 16),
      sunset: day.sunset.slice(11, 16),
      endsAfterSunset,
      startsBeforeSunrise,
      lampNeeded: endsAfterSunset || startsBeforeSunrise,
    };
  }

  const result: SessionWeather = {
    date, startHour: from, endHour: to, hours: hours.length, tempC, feelsC, precipMm, precipProb, windKmh, gustKmh, uvIndex,
    verdict, reasons: [...bad, ...watch], watch, bad, daylight, line: '',
  };
  result.line = weatherLine(result);
  return result;
}

// --- the rules as rows to read ---------------------------------------------------

export interface WeatherRuleRow {
  label: string; // 'Warm'
  text: string; // 'voelt als 27° of meer'
}

const mm = (n: number) => String(n).replace('.', ',');
const degrees = (n: number) => `${n}°`;
const windText = (avg: number, gust: number) => `gemiddeld ${avg} km/u of vlagen ${gust}`;

// What the Weer page shows under "Zo oordeelt ASCEND": the same numbers the
// verdict above uses (WEATHER_RULES), written out as short rows, so the page
// can never say something else than the engine does. 'prima' has no
// thresholds: it is what is left when nothing below applies.
export function weatherRuleRows(): { watch: WeatherRuleRow[]; bad: WeatherRuleRow[] } {
  const R = WEATHER_RULES;
  return {
    watch: [
      { label: 'Warm', text: `voelt als ${degrees(R.heatWatch)} of meer` },
      { label: 'Koud', text: `voelt als ${degrees(R.coldWatch)} of kouder` },
      { label: 'Wind', text: windText(R.windWatch, R.gustWatch) },
      { label: 'Regen', text: `${mm(R.rainWatchTotal)} mm in totaal of ${mm(R.rainWatchHour)} mm in een uur` },
      { label: 'Sneeuw', text: 'lichte of matige sneeuw' },
      { label: 'Mist', text: 'zicht beperkt' },
    ],
    bad: [
      { label: 'Onweer', text: 'ook ijzel en zware sneeuw' },
      { label: 'Storm', text: windText(R.windBad, R.gustBad) },
      { label: 'Zware regen', text: `${mm(R.rainBadHour)} mm in een uur of ${mm(R.rainBadTotal)} mm in totaal` },
      { label: 'Extreme hitte', text: `voelt als ${degrees(R.heatBad)} of meer` },
      { label: 'Strenge kou', text: `voelt als ${degrees(R.coldBad)} of kouder` },
    ],
  };
}

// --- words ---------------------------------------------------------------------

function rainPhrase(w: SessionWeather): string {
  if (w.bad.includes('onweer')) return 'onweer';
  if (w.bad.includes('ijzel')) return 'ijzel';
  if (w.bad.includes('zware sneeuw')) return 'zware sneeuw';
  if (w.watch.includes('sneeuw')) return 'sneeuw';
  if (w.bad.includes('zware regen')) return 'zware regen';
  if (w.watch.includes('regen')) return w.precipMm < 2.5 ? 'lichte regen' : 'regen';
  if (w.watch.includes('mist')) return 'mist';
  if ((w.precipProb ?? 0) >= 50) return 'kans op een bui';
  return 'droog';
}

function windPhrase(w: SessionWeather): string | undefined {
  if (w.bad.includes('storm')) return `storm, vlagen tot ${Math.round(w.gustKmh)} km/u`;
  if (w.watch.includes('harde wind')) return `harde wind, vlagen tot ${Math.round(w.gustKmh)} km/u`;
  return undefined;
}

// `short`: the clothing advice already says what to take along for the dark.
export function daylightPhrase(d: Daylight, short = false): string {
  if (d.endsAfterSunset) return `donker vanaf ${clockNL(d.sunset)}${short ? '' : ', neem een lampje mee'}`;
  if (d.startsBeforeSunrise) return `donker tot ${clockNL(d.sunrise)}${short ? '' : ', neem een lampje mee'}`;
  return `licht tot ${clockNL(d.sunset)}`;
}

// "14 graden, droog, licht tot 18.12". Heat or cold you feel differently from
// what the thermometer says comes with the felt temperature.
export function weatherLine(w: SessionWeather, opts: { darkInClothing?: boolean } = {}): string {
  const temp = Math.round(w.tempC);
  const feels = Math.round(w.feelsC);
  const parts = [Math.abs(feels - temp) >= 4 ? `${temp} graden, voelt als ${feels}` : `${temp} ${Math.abs(temp) === 1 ? 'graad' : 'graden'}`];
  parts.push(rainPhrase(w));
  const wind = windPhrase(w);
  if (wind) parts.push(wind);
  if (w.watch.includes('warm')) parts.push('warm');
  if (w.watch.includes('koud')) parts.push('koud');
  if (w.bad.includes('extreme hitte')) parts.push('extreme hitte');
  if (w.bad.includes('strenge kou')) parts.push('strenge kou');
  if (w.daylight) parts.push(daylightPhrase(w.daylight, opts.darkInClothing));
  return parts.join(', ');
}

// The verdict as a short sentence: "Prima weer", "Let op: harde wind en regen".
export function verdictLine(w: Pick<SessionWeather, 'verdict' | 'watch' | 'bad'>): string {
  if (w.verdict === 'slecht') return `Slecht weer: ${joinNL(w.bad)}`;
  if (w.verdict === 'let_op') return `Let op: ${joinNL(w.watch)}`;
  return 'Prima weer';
}

// Better = a lower number.
export const VERDICT_RANK: Record<WeatherVerdict, number> = { prima: 0, let_op: 1, slecht: 2 };

// --- which trainings care about the weather ------------------------------------

// A run, a walk with the rucksack, a hike or a ride happens outside. Strength
// and the rest day do not. (A run on the treadmill is the user's own choice
// and still counts: the proposal only offers a better day, never forces one.)
export function isWeatherSensitive(template: SessionTemplate): boolean {
  return template.type !== 'strength' && template.type !== 'recovery' && templateSport(template) !== undefined;
}

// --- showing it ----------------------------------------------------------------

// "bijgewerkt om 13.05", from the time the forecast was fetched.
export function updatedLabel(fetchedAt: string): string {
  const d = new Date(fetchedAt);
  if (Number.isNaN(d.getTime())) return 'bijgewerkt op een onbekend moment';
  return `bijgewerkt om ${d.getHours()}.${pad(d.getMinutes())}`;
}

// Older than this and the line says when it was last updated.
export const STALE_AFTER_MINUTES = 120;

export function isForecastStale(fetchedAt: string, now: Date, maxMinutes = STALE_AFTER_MINUTES): boolean {
  const at = Date.parse(fetchedAt);
  return !Number.isFinite(at) || now.getTime() - at > maxMinutes * 60_000;
}

// The whole day answer for one training in one call: the usual hour, then the
// weather in it. What a screen needs.
export function weatherForTraining(input: {
  forecast: WeatherForecast | undefined;
  template: SessionTemplate;
  logs: SessionLog[];
  date: string;
  durationMinutes: number;
  now?: Date;
}): SessionWeather | undefined {
  if (!input.forecast || !isWeatherSensitive(input.template)) return undefined;
  const { hour } = usualStartHour(input.template, input.logs, input.date);
  return sessionWeather({ forecast: input.forecast, date: input.date, startHour: hour, durationMinutes: input.durationMinutes, now: input.now });
}

// The first training from today up to `days` days on that happens outside
// (isWeatherSensitive, the same question as the weather line) and is still
// open: not done and not skipped, read the way Week and Vandaag read it
// (deriveSessionStatus). For the top of the weather page.
export function nextOutdoorTraining(
  planned: PlannedSession[],
  logs: SessionLog[],
  templateById: Map<string, SessionTemplate>,
  today: string,
  days = 7,
): { session: PlannedSession; template: SessionTemplate; date: string } | undefined {
  for (let offset = 0; offset < days; offset++) {
    const date = addDays(today, offset);
    const onDay = planned.filter((s) => s.scheduledDate === date).sort((a, b) => a.order - b.order);
    for (const session of onDay) {
      const status = deriveSessionStatus(session, logs).status;
      if (status === 'completed' || status === 'skipped') continue;
      const template = templateById.get(session.templateId);
      if (template && isWeatherSensitive(template)) return { session, template, date };
    }
  }
  return undefined;
}
