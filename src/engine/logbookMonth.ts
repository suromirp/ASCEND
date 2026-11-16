// ASCEND: de kaart bovenaan het Logboek. Het Logboek is wat je deed: geen noemer met wat gepland stond en
// geen "Gemist" (die telling staat bij Ritme op Stand). De vergelijking gaat tegen dezelfde dagen van vorige
// maand, pas vanaf de zevende dag van de maand; voor een afgesloten maand tegen de hele vorige maand. Een
// verschil is nooit rood. Puur: geen React, niets wordt opgeslagen
// (docs/beslissingen/2026-11-02-gegevens-herinrichting.md).

import type { SessionLog } from '../models/training';
import { logsInRange, type PlannedById } from './logDay';
import { isRestLog } from './savedMoments';
import { addDays, formatHoursMinutesNL, monthBounds, parseISODate, shiftMonthAnchor, toISODate } from '../utils/dates';

// Vanaf deze dag van de lopende maand zegt een vergelijking iets.
const COMPARE_FROM_DAY = 7;

export interface MonthTotals { minutes: number; count: number }

export interface MonthCompare {
  // De vergelijking: tegen welke dagen, en het verschil. Afwezig als die niets zegt.
  vs?: { from: string; to: string; whole: boolean; minutes: number; count: number; diffMinutes: number; diffCount: number };
  // De maand loopt, het is nog vroeg en er staat nog geen enkel log in: dan staat er "Nog niets in november".
  // Een herstelwandeling telt niet als training, maar is wel iets: dan is het nooit "nog niets".
  nothingYet: boolean;
  totals: MonthTotals;
  // De echte herstellogs in deze maand (`isRestLog`). Die tellen niet in `totals.count` (Trainingen) en niet in de
  // vergelijking (die vraagt een training vorige maand); hun minuten zitten wel in `totals.minutes`, net als in
  // Getraind op het scherm.
  recovery: MonthTotals;
  // De gewone wandelingen (type recovery, rol plain_walk): geen herstel en geen training, zelfde regels als `recovery`.
  walks: MonthTotals;
}

const totalsOf = (logs: SessionLog[]): MonthTotals => {
  const trainings = logs.filter((l) => l.type !== 'recovery');
  return { minutes: Math.round(logs.reduce((n, l) => n + l.durationMinutes, 0)), count: trainings.length };
};

const sumOf = (logs: SessionLog[]): MonthTotals => ({ minutes: Math.round(logs.reduce((n, l) => n + l.durationMinutes, 0)), count: logs.length });
const recoveryOf = (logs: SessionLog[]): MonthTotals => sumOf(logs.filter((l) => isRestLog(l)));
const walksOf = (logs: SessionLog[]): MonthTotals => sumOf(logs.filter((l) => l.type === 'recovery' && !isRestLog(l)));

export function monthCompare(input: { anchor: string; today: string; logs: SessionLog[]; plannedById: PlannedById }): MonthCompare {
  const { anchor, today, logs, plannedById } = input;
  const { start, end } = monthBounds(anchor);
  const inMonth = logsInRange(logs, plannedById, start, end);
  const totals = totalsOf(inMonth);
  const recovery = recoveryOf(inMonth);
  const walks = walksOf(inMonth);
  const prev = monthBounds(shiftMonthAnchor(anchor, -1));
  const current = today >= start && today <= end;
  const future = start > today;

  if (future) return { nothingYet: false, totals, recovery, walks };
  if (current) {
    const dayOfMonth = parseISODate(today).getDate();
    const nothingYet = dayOfMonth < COMPARE_FROM_DAY && inMonth.length === 0;
    if (dayOfMonth < COMPARE_FROM_DAY) return { nothingYet, totals, recovery, walks };
    // Dezelfde dagen van vorige maand; een kortere maand loopt tot zijn laatste dag.
    const lastDay = parseISODate(prev.end).getDate();
    const to = toISODate(new Date(parseISODate(prev.start).getFullYear(), parseISODate(prev.start).getMonth(), Math.min(dayOfMonth, lastDay)));
    const before = totalsOf(logsInRange(logs, plannedById, prev.start, to));
    if (before.count === 0) return { nothingYet: false, totals, recovery, walks };
    return { nothingYet: false, totals, recovery, walks, vs: { from: prev.start, to, whole: false, ...before, diffMinutes: totals.minutes - before.minutes, diffCount: totals.count - before.count } };
  }
  const before = totalsOf(logsInRange(logs, plannedById, prev.start, prev.end));
  if (before.count === 0) return { nothingYet: false, totals, recovery, walks };
  return { nothingYet: false, totals, recovery, walks, vs: { from: prev.start, to: prev.end, whole: true, ...before, diffMinutes: totals.minutes - before.minutes, diffCount: totals.count - before.count } };
}

// De kop van een maand zonder trainingen: voor je eerste training, met alleen herstel, met alleen wegingen, of
// helemaal leeg. De kop zegt nooit "niets" of "geen trainingen" als de lijst eronder een log heeft
// (`listLogs`: de logs van de lijst, op de datum van het bestand). Herstel en gewone wandelingen tellen niet als
// training, dus noemt de kop ze apart met de minuten; een wandeling heet nooit herstel. Een log dat in de lijst staat maar bij de maand van zijn geplande training telt
// (een MacroFactor-training na middernacht, engine/logDay.ts) krijgt een eigen zin.
export function emptyMonthTitle(input: { beforeFirst: boolean; weighings: number; recovery: MonthTotals; walks?: MonthTotals; listLogs: number }): string {
  const walks = input.walks ?? { minutes: 0, count: 0 };
  if (input.recovery.count > 0 && walks.count > 0) return `Alleen herstel en wandelen in deze maand: ${formatHoursMinutesNL(input.recovery.minutes + walks.minutes)}.`;
  if (walks.count > 0) return `Alleen wandelen in deze maand: ${formatHoursMinutesNL(walks.minutes)}.`;
  if (input.recovery.count > 0) return `Alleen herstel in deze maand: ${formatHoursMinutesNL(input.recovery.minutes)}.`;
  if (input.listLogs > 0) return 'Wat hier staat telt bij de maand van de geplande training.';
  if (input.beforeFirst) return 'Hier begon je nog niet.';
  return input.weighings > 0 ? 'Geen trainingen in deze maand.' : 'Nog niets in deze maand.';
}

// De maandag van de week waarin een dag valt, voor het groeperen van de lijst per week.
export function mondayKey(iso: string): string {
  const day = (parseISODate(iso).getDay() + 6) % 7;
  return addDays(iso, -day);
}

// De logs van een maand per week, nieuwste week bovenaan en binnen een week nieuwste training eerst.
export function groupByWeek(logs: SessionLog[]): { weekStart: string; logs: SessionLog[] }[] {
  const map = new Map<string, SessionLog[]>();
  for (const l of logs) {
    const key = mondayKey(l.completedDate);
    map.set(key, [...(map.get(key) ?? []), l]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStart, list]) => ({ weekStart, logs: [...list].sort((a, b) => (a.completedDate === b.completedDate ? b.completedAt.localeCompare(a.completedAt) : b.completedDate.localeCompare(a.completedDate))) }));
}
