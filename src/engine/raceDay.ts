// ASCEND: Racedag voor een 10 km (besluit docs/beslissingen/2026-11-14-racedag-10km.md).
//
// In de laatste week voor een 10 km-doel (de race zelf meegeteld) één rij op Vandaag en in het blad van
// het doel, met daarachter het blad Racedag: de start, het weer thuis op het startuur met wat je aantrekt,
// het inlopen, en een tempo per km voor je doeltijd en voor je verwachte tijd. De dag erna een korte
// terugblik met de tijd uit het log. Alles is tekst: het plant niets, bewaart niets en beoordeelt de
// doeltijd niet (het doel blijft het doel, docs/werkbriefjes/doelen.md); beide tempo's staan er zonder oordeel.
//
// De verwachte tijd is die van "Klaar voor je doel" (engine/raceReadiness.ts, uit racePaces.ts), zodat
// het blad en de kaart van het doel nooit een ander getal noemen. Het weer komt uit dezelfde voorspelling
// als Vandaag (engine/weather.ts#sessionWeather) en de kleding uit engine/clothing.ts, soort 'race'.
//
// Puur: geen React, geen IndexedDB.

import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionLog } from '../models/training';
import type { WeatherForecast } from '../models/weather';
import { daysBetween, formatDateNL, weekdayLongNL } from '../utils/dates';
import { clothingAdvice } from './clothing';
import { goalDetailsOf, goalKindOf } from './goalLabels';
import { formatPace } from './racePaces';
import { formatRaceTime } from './racePrediction';
import { idHasRole, type RoleCarrier } from './templateRoles';
import { clockNL, sessionWeather } from './weather';

// Hoeveel dagen voor de race de rij verschijnt: de laatste week. Over 8 dagen nog niets.
export const RACE_DAY_DAYS_BEFORE = 7;
// Een doel kent geen starttijd. Een 10 km start meestal in de ochtend; ASCEND rekent met 10:00 en zegt dat
// (eigen keuze, zoals DEFAULT_WEEKEND_HOUR in engine/weather.ts).
export const RACE_START_HOUR = 10;
// Inlopen: 10 tot 15 minuten rustig, dan een paar korte versnellingen, klaar 5 tot 10 minuten voor de start.
// Gangbare praktijk bij een 10 km; de rust voor de start houdt de opwarming vast (Bishop 2003, een review
// over warming-up: een pauze van 5 tot 15 minuten). Onzeker: expertpraktijk, geen studie bij 10 km zelf.
export const WARMUP_START_BEFORE_MIN = 25;

// Instelling Racedag-blad (AppSettings.raceDay). Afwezig is aan.
export const raceDayOn = (s: { raceDay?: boolean } | undefined): boolean => s?.raceDay !== false;

export type RaceDayPhase = 'before' | 'today' | 'after';

export interface RaceDayMoment {
  goal: TrainingGoal;
  raceDate: string;
  phase: RaceDayPhase;
  // Dagen tot de race (0 op de dag zelf, -1 de dag erna).
  days: number;
}

// Is dit een 10 km-wedstrijd? Een hardloopwedstrijd met een afstand rond 10 km (goalDetailsOf: variant '10k').
export function isTenKmGoal(goal: TrainingGoal): boolean {
  return goalKindOf(goal) === 'run_race' && goalDetailsOf(goal).variant === '10k';
}

// Het 10 km-doel waar het blad nu bij hoort: de race over 0 tot 7 dagen, of gisteren. Gearchiveerd of
// gepauzeerd telt niet; een doel dat de dag erna al als gehaald staat wel. Bij meer dan één de eerstvolgende,
// een komende race gaat voor een terugblik.
export function raceDayMoment(goals: readonly TrainingGoal[], today: string): RaceDayMoment | undefined {
  const moments: RaceDayMoment[] = [];
  for (const goal of goals) {
    if (goal.status !== 'active' && goal.status !== 'completed') continue;
    if (!goal.targetDate || !isTenKmGoal(goal)) continue;
    const days = daysBetween(today, goal.targetDate);
    const phase: RaceDayPhase | undefined = days === 0 ? 'today' : days > 0 && days <= RACE_DAY_DAYS_BEFORE ? 'before' : days === -1 ? 'after' : undefined;
    if (!phase) continue;
    if (phase !== 'after' && goal.status !== 'active') continue;
    moments.push({ goal, raceDate: goal.targetDate, phase, days });
  }
  const rank = (m: RaceDayMoment) => (m.days >= 0 ? m.days : 100);
  return moments.sort((a, b) => rank(a) - rank(b))[0];
}

// Het log van de race: een log op de racedag van een wedstrijd (de rol van het sjabloon, of de geplande
// sessie die een wedstrijd is). Bij meer dan één het langste.
export function raceLogFor(
  logs: readonly SessionLog[],
  planned: readonly PlannedSession[],
  raceDate: string,
  templates?: Iterable<RoleCarrier> | ReadonlyMap<string, RoleCarrier>,
): SessionLog | undefined {
  const raceSessions = new Set(planned.filter((s) => s.scheduledDate === raceDate && idHasRole(s.templateId, 'race', templates)).map((s) => s.id));
  return logs
    .filter((l) => l.completedDate === raceDate && ((l.plannedSessionId !== undefined && raceSessions.has(l.plannedSessionId)) || idHasRole(l.templateId, 'race', templates)))
    .sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
}

export interface RaceDaySection {
  label: string;
  lines: string[];
}

export interface RaceDayView {
  phase: RaceDayPhase;
  // De ene rij op Vandaag en in het blad van het doel.
  row: { eyebrow: string; title: string; line: string };
  // Het blad.
  sheet: { eyebrow: string; title: string; line: string; sections: RaceDaySection[] };
}

export interface RaceDayInput {
  moment: RaceDayMoment;
  // De verwachte tijd van "Klaar voor je doel" (RaceFacts.expectedMinutes), in minuten.
  expectedMinutes?: number;
  // De voorspelling van thuis; afwezig zonder verbinding of zonder plaats.
  forecast?: WeatherForecast;
  // Het log van de race (raceLogFor), alleen voor de terugblik.
  raceLog?: SessionLog;
}

const kmText = (km: number) => String(Math.round(km * 10) / 10).replace('.', ',');
// Een tempo per km op de seconde: een doeltijd gedeeld door de afstand is een rekensom, geen schatting.
function exactPace(minutes: number, km: number): string {
  const s = Math.round((minutes * 60) / km);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
const dayText = (iso: string) => `${weekdayLongNL(iso)} ${formatDateNL(iso).replace(/ \d{4}$/, '')}`;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hhmm = (minutesOfDay: number) => clockNL(`${String(Math.floor(minutesOfDay / 60)).padStart(2, '0')}:${String(minutesOfDay % 60).padStart(2, '0')}`);

export const RACE_DAY_TEXT = {
  eyebrow: 'Racedag',
  reviewEyebrow: 'Terugblik',
  rowLine: 'Weer, inlopen en je tempo',
  startAssumed: `ASCEND rekent met een start om ${hhmm(RACE_START_HOUR * 60)}.`,
  noForecast: 'Geen weer: de voorspelling laadde niet.',
  notYet: 'Het weer volgt zodra de voorspelling zo ver reikt.',
  warmup: [
    '10 tot 15 minuten rustig joggen.',
    'Daarna 3 tot 4 versnellingen van 15 seconden.',
  ],
  noTarget: 'Geen doeltijd. Vul er een in bij je doel voor een tempo per km.',
  noExpected: 'Geen verwachte tijd: er telt nog geen testloop mee.',
  firstKm: 'Loop de eerste kilometer niet sneller dan je tempo.',
  noLog: 'Nog geen log van je race. Komt hij binnen, dan staat je tijd hier.',
  textOnly: 'Alleen tekst: je planning verandert niet.',
} as const;

function whenLine(days: number): string {
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Morgen';
  return `Over ${days} dagen`;
}

function weatherSection(input: RaceDayInput, minutes: number): RaceDaySection {
  const { forecast, moment } = input;
  const label = `Weer thuis rond ${hhmm(RACE_START_HOUR * 60)}`;
  if (!forecast) return { label, lines: [RACE_DAY_TEXT.noForecast] };
  const w = sessionWeather({ forecast, date: moment.raceDate, startHour: RACE_START_HOUR, durationMinutes: minutes });
  if (!w) return { label, lines: [RACE_DAY_TEXT.notYet] };
  const clothes = clothingAdvice({
    kind: 'race', minutes, feelsC: w.feelsC, windKmh: w.windKmh, gustKmh: w.gustKmh, precipMm: w.precipMm,
    precipProb: w.precipProb, uvIndex: w.uvIndex, dark: !!w.daylight?.lampNeeded,
    snow: w.watch.includes('sneeuw') || w.bad.includes('zware sneeuw'),
  });
  return { label, lines: [`${capital(w.line)}.`, ...clothes.lines] };
}

function paceSection(km: number, targetMinutes: number | undefined, expectedMinutes: number | undefined): RaceDaySection {
  const lines: string[] = [];
  lines.push(targetMinutes ? `Doeltijd ${formatRaceTime(targetMinutes)}: ${exactPace(targetMinutes, km)} per km.` : RACE_DAY_TEXT.noTarget);
  lines.push(expectedMinutes ? `Verwacht ${formatRaceTime(expectedMinutes)}: ongeveer ${formatPace((expectedMinutes * 60) / km)} per km.` : RACE_DAY_TEXT.noExpected);
  if (targetMinutes || expectedMinutes) lines.push(RACE_DAY_TEXT.firstKm);
  return { label: 'Tempo per km', lines };
}

function reviewLines(input: RaceDayInput, km: number, targetMinutes: number | undefined): string[] {
  const log = input.raceLog;
  if (!log || !(log.durationMinutes > 0)) return [RACE_DAY_TEXT.noLog];
  const ran = log.cardioData?.distanceKm ?? log.outdoorData?.distanceKm;
  const time = formatRaceTime(log.durationMinutes);
  const lines = [ran && ran > 0 ? `Je liep ${kmText(ran)} km in ${time}, ${exactPace(log.durationMinutes, ran)} per km.` : `Je liep ${time}.`];
  if (targetMinutes) lines.push(`Je doeltijd was ${formatRaceTime(targetMinutes)}, ${exactPace(targetMinutes, km)} per km.`);
  if (log.rpe) lines.push(`Zwaarte: ${log.rpe} van 10.`);
  return lines;
}

export function raceDayView(input: RaceDayInput): RaceDayView {
  const { moment } = input;
  const d = goalDetailsOf(moment.goal);
  const km = d.distanceKm && d.distanceKm > 0 ? d.distanceKm : 10;
  const target = d.targetMinutes && d.targetMinutes > 0 ? d.targetMinutes : undefined;
  const expected = input.expectedMinutes && input.expectedMinutes > 0 ? input.expectedMinutes : undefined;
  const name = moment.goal.name || 'Je race';
  const date = capital(dayText(moment.raceDate));

  if (moment.phase === 'after') {
    const log = input.raceLog;
    const line = log && log.durationMinutes > 0 ? `Gisteren, ${formatRaceTime(log.durationMinutes)}` : 'Gisteren, nog zonder log';
    return {
      phase: 'after',
      row: { eyebrow: RACE_DAY_TEXT.reviewEyebrow, title: name, line },
      sheet: { eyebrow: RACE_DAY_TEXT.reviewEyebrow, title: name, line: date, sections: [{ label: 'Hoe ging het', lines: reviewLines(input, km, target) }] },
    };
  }

  const minutes = Math.round(target ?? expected ?? 60);
  const startMin = RACE_START_HOUR * 60;
  const sections: RaceDaySection[] = [
    { label: 'Start', lines: [`${date}, ${kmText(km)} km.`, RACE_DAY_TEXT.startAssumed] },
    weatherSection(input, minutes),
    { label: 'Inlopen', lines: [...RACE_DAY_TEXT.warmup, `Begin rond ${hhmm(startMin - WARMUP_START_BEFORE_MIN)}, klaar 5 tot 10 minuten voor de start.`] },
    paceSection(km, target, expected),
  ];
  return {
    phase: moment.phase,
    row: { eyebrow: RACE_DAY_TEXT.eyebrow, title: name, line: `${whenLine(moment.days)} · ${RACE_DAY_TEXT.rowLine.toLowerCase()}` },
    sheet: { eyebrow: RACE_DAY_TEXT.eyebrow, title: name, line: `${whenLine(moment.days)}, ${dayText(moment.raceDate)}`, sections },
  };
}
