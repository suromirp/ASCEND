// ASCEND: weerwaarschuwingen bij een tocht of een lange training buiten
// (docs/beslissingen/2026-11-09-gr5-waarschuwingen.md).
//
// Onweer, storm en hitte, als regel met het droge feit eerst: "Onweer verwacht vanaf 15:00 in
// Chamonix." Alleen op de dag zelf of de dag ervoor, met de plek van de tocht of de plek van je
// weer. Meteoalarm is vanuit een webapp niet te lezen (geen CORS), dus vaste drempels op het
// weermodel van Open-Meteo (integrations/openMeteoWarnings.ts). Het is tekst: de planning
// verandert er nooit door, en de regel staat nooit achter een tik.
//
// Wanneer:
// - Een tocht (verlof van soort tocht) die vandaag loopt: met de eigen plek van de tocht, of zonder
//   die plek alleen als het weer je locatie volgt (dan is de plek van het weer waar je bent).
// - Een tocht die morgen begint, alleen met een eigen plek: de dag ervoor ben je meestal nog thuis.
// - Anders een training buiten van minstens anderhalf uur, vandaag of morgen, nog niet gedaan en niet
//   overgeslagen, met de plek van je weer.
// Per dag hoogstens één doel; een tocht gaat voor.
//
// Puur: geen React, geen IndexedDB.

import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { WeatherPlace } from '../models/weather';
import type { WarningForecast } from '../integrations/openMeteoWarnings';
import { isWeatherSensitive } from './weather';
import { isMyLocation } from './weatherLocation';
import { addDays } from '../utils/dates';
import { pad } from '../utils/pad';

// Een training buiten telt als lang vanaf anderhalf uur.
export const LONG_OUTDOOR_MIN = 90;
// WMO-weercode 95 en hoger is onweer (95 onweer, 96 en 99 met hagel).
export const THUNDER_CODE = 95;
// Windstoten vanaf 75 km per uur (de drempel voor code geel in het binnenland bij het KNMI).
export const GUST_KMH = 75;
// Hitte vanaf 30 graden.
export const HEAT_C = 30;
// De uren waarin je buiten bent: van 6 tot en met 22 uur.
export const DAY_HOURS: readonly [number, number] = [6, 22];
// Een voorspelling van meer dan zes uur oud zegt te weinig; dan geen regel.
export const WARNING_MAX_AGE_H = 6;

export interface WarningTarget {
  date: string;
  when: 'vandaag' | 'morgen';
  kind: 'trek' | 'training';
  place: WeatherPlace;
}

export interface WarningTargetsInput {
  periods: readonly LeavePeriod[] | undefined;
  sessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templateById: ReadonlyMap<string, SessionTemplate>;
  today: string;
  // De plek van het gewone weer (Plaats of je locatie).
  weatherPlace: WeatherPlace | undefined;
  followsLocation: boolean;
}

function trekTarget(input: WarningTargetsInput, date: string, when: 'vandaag' | 'morgen'): WarningTarget | undefined {
  for (const p of input.periods ?? []) {
    if (p.kind !== 'trek' || !p.trek) continue;
    const own = p.trek.place;
    if (when === 'vandaag' && p.startDate <= date && date <= p.endDate) {
      const place = own ?? (input.followsLocation ? input.weatherPlace : undefined);
      if (place) return { date, when, kind: 'trek', place };
    }
    if (when === 'morgen' && p.startDate === date && own) return { date, when, kind: 'trek', place: own };
  }
  return undefined;
}

function trainingTarget(input: WarningTargetsInput, date: string, when: 'vandaag' | 'morgen'): WarningTarget | undefined {
  if (!input.weatherPlace) return undefined;
  const done = new Set(input.logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const long = input.sessions.some((s) => {
    if (s.scheduledDate !== date || s.status === 'skipped' || done.has(s.id)) return false;
    const t = input.templateById.get(s.templateId);
    if (!t || !isWeatherSensitive(t)) return false;
    return (s.plannedMinutes ?? t.durationVariants.full) >= LONG_OUTDOOR_MIN;
  });
  return long ? { date, when, kind: 'training', place: input.weatherPlace } : undefined;
}

// Waarvoor een waarschuwing kan gelden: vandaag en morgen, elk hoogstens één.
export function warningTargets(input: WarningTargetsInput): WarningTarget[] {
  const tomorrow = addDays(input.today, 1);
  const today = trekTarget(input, input.today, 'vandaag') ?? trainingTarget(input, input.today, 'vandaag');
  const next = trekTarget(input, tomorrow, 'morgen') ?? trainingTarget(input, tomorrow, 'morgen');
  return [today, next].filter((t): t is WarningTarget => !!t);
}

// "in Chamonix", of "op je plek" als de plek je locatie is zonder naam.
export function placePhrase(place: WeatherPlace): string {
  const name = place.name.trim();
  return !name || isMyLocation(place) ? 'op je plek' : `in ${name}`;
}

const hourOf = (time: string) => Number(time.slice(11, 13));

// De regels voor één doel, de zwaarste eerst: onweer, storm, hitte. Leeg zonder iets te melden,
// met oude data of als de voorspelling niet over die dag gaat.
export function warningLines(forecast: WarningForecast | undefined, target: WarningTarget, now: Date): string[] {
  if (!forecast) return [];
  const age = now.getTime() - Date.parse(forecast.fetchedAt);
  if (!Number.isFinite(age) || age > WARNING_MAX_AGE_H * 3_600_000 || age < -5 * 60_000) return [];
  // "Nu" op de klok van de plek: vandaag tellen alleen de uren die nog komen.
  const placeNow = new Date(now.getTime() + forecast.utcOffsetSec * 1000).toISOString();
  const nowDate = placeNow.slice(0, 10);
  const nowHour = Number(placeNow.slice(11, 13));
  if (target.when === 'vandaag' && nowDate !== target.date) return [];
  const fromHour = target.when === 'vandaag' ? Math.max(DAY_HOURS[0], nowHour) : DAY_HOURS[0];
  const hours = forecast.hours.filter((h) => h.time.startsWith(target.date) && hourOf(h.time) >= fromHour && hourOf(h.time) <= DAY_HOURS[1]);
  if (hours.length === 0) return [];

  const day = target.when === 'morgen' ? 'morgen ' : '';
  const where = placePhrase(target.place);
  const at = (time: string) => `${pad(hourOf(time))}:00`;
  const lines: string[] = [];

  const thunder = hours.find((h) => (h.code ?? 0) >= THUNDER_CODE);
  if (thunder) lines.push(`Onweer verwacht ${day}vanaf ${at(thunder.time)} ${where}.`);

  const gusty = hours.find((h) => (h.gustKmh ?? 0) >= GUST_KMH);
  if (gusty) {
    const max = Math.round(Math.max(...hours.map((h) => h.gustKmh ?? 0)));
    lines.push(`Zware windstoten verwacht ${day}vanaf ${at(gusty.time)} ${where}, tot ${max} km per uur.`);
  }

  const hot = hours.find((h) => (h.tempC ?? -99) >= HEAT_C);
  if (hot) {
    const max = Math.round(Math.max(...hours.map((h) => h.tempC ?? -99)));
    lines.push(`Hitte verwacht ${day}vanaf ${at(hot.time)} ${where}, tot ${max} graden.`);
  }
  return lines;
}
