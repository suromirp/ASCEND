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
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { WeatherForecast } from '../models/weather';
import { daysBetween, formatDateNL, weekdayLongNL } from '../utils/dates';
import { GOAL_KINDS } from '../data/goalKinds';
import { clothingAdvice } from './clothing';
import { goalDetailsOf, goalKindOf } from './goalLabels';
import { formatPace } from './racePaces';
import { formatRaceTime } from './racePrediction';
import { isStaleRunDetail } from './runDetail';
import { logSport } from './sports';
import { idHasRole, type RoleCarrier } from './templateRoles';
import { clockNL, sessionWeather, usualStartHour } from './weather';

// Hoeveel dagen voor de race de rij verschijnt: de laatste week. Over 8 dagen nog niets.
export const RACE_DAY_DAYS_BEFORE = 7;
// Een doel kent geen starttijd. Staat de race in je planning, dan het uur dat ASCEND overal voor die sessie
// gebruikt (engine/weather.ts#usualStartHour, zoals de Briefing en De avond ervoor); anders 10:00, want een
// 10 km start meestal in de ochtend (eigen keuze). Het blad zegt altijd met welk uur het rekent.
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

// Het 10 km-doel waar het blad nu bij hoort: de race over 0 tot 7 dagen, vandaag, of gisteren. Gearchiveerd
// of gepauzeerd telt niet. Een doel dat al als gehaald staat telt op de racedag en de dag erna (de
// terugblik), niet ervoor. Bij meer dan één de eerstvolgende; een komende race gaat voor een terugblik.
export function raceDayMoment(goals: readonly TrainingGoal[], today: string): RaceDayMoment | undefined {
  const moments: RaceDayMoment[] = [];
  for (const goal of goals) {
    if (goal.status !== 'active' && goal.status !== 'completed') continue;
    if (!goal.targetDate || !isTenKmGoal(goal)) continue;
    const days = daysBetween(today, goal.targetDate);
    const phase: RaceDayPhase | undefined = days === 0 ? 'today' : days > 0 && days <= RACE_DAY_DAYS_BEFORE ? 'before' : days === -1 ? 'after' : undefined;
    if (!phase) continue;
    if (phase === 'before' && goal.status !== 'active') continue;
    moments.push({ goal, raceDate: goal.targetDate, phase, days });
  }
  const rank = (m: RaceDayMoment) => (m.days >= 0 ? m.days : 100);
  return moments.sort((a, b) => rank(a) - rank(b))[0];
}

type Templates = Iterable<RoleCarrier> | ReadonlyMap<string, RoleCarrier>;

const raceSessionsOn = (planned: readonly PlannedSession[], raceDate: string, templates?: Templates) =>
  planned.filter((s) => s.scheduledDate === raceDate && s.status !== 'skipped' && idHasRole(s.templateId, 'race', templates));

// Het log van de race: een log op de racedag van een wedstrijd (de rol van het sjabloon, of de geplande
// sessie die een wedstrijd is). Bij meer dan één het langste.
export function raceLogFor(logs: readonly SessionLog[], planned: readonly PlannedSession[], raceDate: string, templates?: Templates): SessionLog | undefined {
  const raceSessions = new Set(raceSessionsOn(planned, raceDate, templates).map((s) => s.id));
  return logs
    .filter((l) => l.completedDate === raceDate && ((l.plannedSessionId !== undefined && raceSessions.has(l.plannedSessionId)) || idHasRole(l.templateId, 'race', templates)))
    .sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
}

// Een losse loop op de racedag die nog niet aan de race hangt (een horlogelog zonder geplande sessie): dan
// wijst de terugblik op koppelen in plaats van te wachten op een log dat er al is.
export function looseRunOn(logs: readonly SessionLog[], raceDate: string, templates?: Templates): SessionLog | undefined {
  return logs.find((l) => l.completedDate === raceDate && l.plannedSessionId === undefined && !idHasRole(l.templateId, 'race', templates) && logSport(l) === 'running');
}

// Het startuur van de race: zie RACE_START_HOUR.
export function raceStartHour(planned: readonly PlannedSession[], templates: readonly SessionTemplate[], logs: SessionLog[], raceDate: string): number {
  const session = raceSessionsOn(planned, raceDate, templates)[0];
  const template = session ? templates.find((t) => t.id === session.templateId) : undefined;
  return template ? usualStartHour(template, logs, raceDate).hour : RACE_START_HOUR;
}

// De racetijd uit een log. `durationMinutes` van een horlogelog is op de hele minuut; de seconden komen uit
// de run in detail (bewegen plus stilstaan, de tijd van de klok) als die bij het log past, anders uit het
// profiel (bewegende seconden), anders uit de snelste stuk over de hele afstand. Zonder een van die drie
// alleen hele minuten, en nooit als mm:ss.
export interface RaceTime {
  seconds: number;
  exact: boolean;
}

export function raceTimeOf(log: SessionLog, raceKm: number): RaceTime | undefined {
  if (!(log.durationMinutes > 0)) return undefined;
  const km = log.cardioData?.distanceKm ?? log.outdoorData?.distanceKm;
  const rd = log.runDetail;
  if (rd && km !== undefined && !isStaleRunDetail(rd, km, log.durationMinutes) && rd.movingSec > 0) return { seconds: Math.round(rd.movingSec + rd.pauseSec), exact: true };
  if (log.detail && log.detail.movingSec > 0) return { seconds: Math.round(log.detail.movingSec), exact: true };
  const effort = log.bestEffort;
  if (effort && effort.minutes > 0 && Math.abs(effort.km - raceKm) < 0.05) return { seconds: Math.round(effort.minutes * 60), exact: true };
  return { seconds: Math.round(log.durationMinutes) * 60, exact: false };
}

const timeSaid = (t: RaceTime) => (t.exact ? formatRaceTime(t.seconds / 60) : `${Math.round(t.seconds / 60)} minuten`);
const paceSaid = (t: RaceTime, km: number) => (t.exact ? `${exactPace(t.seconds / 60, km)} per km` : `ongeveer ${formatPace(t.seconds / km)} per km`);

export interface RaceDaySection {
  label: string;
  lines: string[];
}

export interface RaceDayView {
  phase: RaceDayPhase;
  // Terugblik: de race is gelopen (de dag erna, of op de racedag zodra het log er is).
  review: boolean;
  // De ene rij op Vandaag en in het blad van het doel.
  row: { eyebrow: string; title: string; line: string };
  // Het blad.
  sheet: { eyebrow: string; title: string; line: string; sections: RaceDaySection[] };
}

export interface RaceDayInput {
  moment: RaceDayMoment;
  // De verwachte tijd van "Klaar voor je doel" (raceReadiness.ts#expectedRaceTime), in minuten.
  expectedMinutes?: number;
  // De voorspelling van thuis; afwezig zonder verbinding of zonder plaats.
  forecast?: WeatherForecast;
  // Is er een plaats voor het weer gekozen? Zonder plaats is er geen voorspelling om te laden.
  weatherPlace?: boolean;
  // Het startuur (raceStartHour); zonder: RACE_START_HOUR.
  startHour?: number;
  // Het log van de race (raceLogFor), voor de terugblik.
  raceLog?: SessionLog;
  // Een losse loop op de racedag (looseRunOn), als er geen racelog is.
  looseRun?: SessionLog;
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
  reviewLabel: 'Je race',
  rowLine: 'Weer, inlopen en je tempo',
  start: (km: string, hour: number) => `${km} km, start om ${hhmm(hour * 60)}.`,
  noForecast: 'Geen weer: de voorspelling laadde niet.',
  noPlace: 'Geen weer: er is nog geen plaats voor het weer gekozen.',
  notYet: 'Het weer volgt zodra de voorspelling zo ver reikt.',
  warmup: [
    '10 tot 15 minuten rustig joggen.',
    'Daarna 3 tot 4 versnellingen van 15 seconden.',
  ],
  noTarget: 'Geen doeltijd. Vul er een in bij je doel voor een tempo per km.',
  noExpected: 'Geen verwachte tijd: er telt nog geen testloop mee.',
  firstKm: (target: boolean) => `Loop de eerste kilometer niet sneller dan je ${target ? 'doeltempo' : 'verwachte tempo'}.`,
  noLog: 'Nog geen log van je race. Komt hij binnen, dan staat je tijd hier.',
  looseRun: 'Je loop van die dag hangt nog niet aan je race. Koppel hem op Vandaag of in je Logboek voor de terugblik.',
  textOnly: 'Alleen tekst: je planning verandert niet.',
} as const;

function whenLine(days: number): string {
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Morgen';
  if (days === -1) return 'Gisteren';
  return `Over ${days} dagen`;
}

function weatherSection(input: RaceDayInput, hour: number, minutes: number): RaceDaySection {
  const { forecast, moment } = input;
  const label = `Weer thuis rond ${hhmm(hour * 60)}`;
  if (!forecast) return { label, lines: [input.weatherPlace === false ? RACE_DAY_TEXT.noPlace : RACE_DAY_TEXT.noForecast] };
  const w = sessionWeather({ forecast, date: moment.raceDate, startHour: hour, durationMinutes: minutes });
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
  if (targetMinutes || expectedMinutes) lines.push(RACE_DAY_TEXT.firstKm(!!targetMinutes));
  return { label: 'Tempo per km', lines };
}

function reviewLines(input: RaceDayInput, time: RaceTime | undefined, km: number, targetMinutes: number | undefined): string[] {
  const log = input.raceLog;
  if (!log || !time) return [input.looseRun ? RACE_DAY_TEXT.looseRun : RACE_DAY_TEXT.noLog];
  const ran = log.cardioData?.distanceKm ?? log.outdoorData?.distanceKm;
  const lines = [ran && ran > 0 ? `Je liep ${kmText(ran)} km in ${timeSaid(time)}, ${paceSaid(time, ran)}.` : `Je liep ${timeSaid(time)}.`];
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
  // De naam van het doel; een lege naam of de naam van de soort ("Hardloopwedstrijd") zegt niets, dan "Je 10 km".
  const own = moment.goal.name.trim();
  const name = own && own !== GOAL_KINDS.run_race.label ? own : `Je ${kmText(km)} km`;
  const date = capital(dayText(moment.raceDate));
  const when = whenLine(moment.days);

  const time = input.raceLog ? raceTimeOf(input.raceLog, km) : undefined;
  if (moment.phase === 'after' || (moment.phase === 'today' && time)) {
    const line = time ? `${when}, ${timeSaid(time)}` : input.looseRun ? `${when}, nog niet gekoppeld` : `${when}, nog zonder log`;
    return {
      phase: moment.phase,
      review: true,
      row: { eyebrow: RACE_DAY_TEXT.reviewEyebrow, title: name, line },
      sheet: { eyebrow: RACE_DAY_TEXT.reviewEyebrow, title: name, line: date, sections: [{ label: RACE_DAY_TEXT.reviewLabel, lines: reviewLines(input, time, km, target) }] },
    };
  }

  const hour = input.startHour ?? RACE_START_HOUR;
  const minutes = Math.round(target ?? expected ?? 60);
  const sections: RaceDaySection[] = [
    { label: 'Start', lines: [RACE_DAY_TEXT.start(kmText(km), hour)] },
    weatherSection(input, hour, minutes),
    { label: 'Inlopen', lines: [...RACE_DAY_TEXT.warmup, `Begin rond ${hhmm(hour * 60 - WARMUP_START_BEFORE_MIN)}, klaar 5 tot 10 minuten voor de start.`] },
    paceSection(km, target, expected),
  ];
  return {
    phase: moment.phase,
    review: false,
    row: { eyebrow: RACE_DAY_TEXT.eyebrow, title: name, line: `${when} · ${RACE_DAY_TEXT.rowLine.toLowerCase()}` },
    sheet: { eyebrow: RACE_DAY_TEXT.eyebrow, title: name, line: `${when}, ${dayText(moment.raceDate)}`, sections },
  };
}

// Alles wat de app voor Racedag leest, in één pure stap (de hook useRaceDay roept alleen dit aan).
export interface RaceDayAppInput {
  on: boolean;
  goals: readonly TrainingGoal[];
  // Alleen voor dit doel (het blad van het doel).
  goalId?: string;
  today: string;
  logs: SessionLog[];
  planned: readonly PlannedSession[];
  templates: readonly SessionTemplate[];
  forecast?: WeatherForecast;
  weatherPlace: boolean;
  // De verwachte tijd over `km` op `today` (raceReadiness.ts#expectedRaceTime), door de aanroeper gegeven.
  expectedMinutes: (km: number) => number | undefined;
}

export function raceDayForApp(i: RaceDayAppInput): RaceDayView | undefined {
  if (!i.on) return undefined;
  const moment = raceDayMoment(i.goalId ? i.goals.filter((g) => g.id === i.goalId) : i.goals, i.today);
  if (!moment) return undefined;
  const raceLog = moment.phase === 'before' ? undefined : raceLogFor(i.logs, i.planned, moment.raceDate, i.templates);
  const km = goalDetailsOf(moment.goal).distanceKm ?? 10;
  return raceDayView({
    moment,
    expectedMinutes: moment.phase === 'after' ? undefined : i.expectedMinutes(km),
    forecast: i.forecast,
    weatherPlace: i.weatherPlace,
    startHour: raceStartHour(i.planned, i.templates, i.logs, moment.raceDate),
    raceLog,
    looseRun: raceLog || moment.phase === 'before' ? undefined : looseRunOn(i.logs, moment.raceDate, i.templates),
  });
}
