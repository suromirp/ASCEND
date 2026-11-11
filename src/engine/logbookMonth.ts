// ASCEND: de kaart bovenaan het Logboek. Het Logboek is wat je deed: geen noemer met wat gepland stond en
// geen "Gemist" (die telling staat bij Ritme op Stand). De vergelijking gaat tegen dezelfde dagen van vorige
// maand, pas vanaf de zevende dag van de maand; voor een afgesloten maand tegen de hele vorige maand. Een
// verschil is nooit rood. Puur: geen React, niets wordt opgeslagen
// (docs/beslissingen/2026-11-02-gegevens-herinrichting.md).

import type { SessionLog } from '../models/training';
import { logsInRange, type PlannedById } from './logDay';
import { addDays, monthBounds, parseISODate, shiftMonthAnchor, toISODate } from '../utils/dates';

// Vanaf deze dag van de lopende maand zegt een vergelijking iets.
const COMPARE_FROM_DAY = 7;

export interface MonthTotals { minutes: number; count: number }

export interface MonthCompare {
  // De vergelijking: tegen welke dagen, en het verschil. Afwezig als die niets zegt.
  vs?: { from: string; to: string; whole: boolean; minutes: number; count: number; diffMinutes: number; diffCount: number };
  // De maand loopt, het is nog vroeg en er is nog niets gedaan: dan staat er "Nog niets in november".
  nothingYet: boolean;
  totals: MonthTotals;
}

const totalsOf = (logs: SessionLog[]): MonthTotals => {
  const trainings = logs.filter((l) => l.type !== 'recovery');
  return { minutes: Math.round(logs.reduce((n, l) => n + l.durationMinutes, 0)), count: trainings.length };
};

export function monthCompare(input: { anchor: string; today: string; logs: SessionLog[]; plannedById: PlannedById }): MonthCompare {
  const { anchor, today, logs, plannedById } = input;
  const { start, end } = monthBounds(anchor);
  const totals = totalsOf(logsInRange(logs, plannedById, start, end));
  const prev = monthBounds(shiftMonthAnchor(anchor, -1));
  const current = today >= start && today <= end;
  const future = start > today;

  if (future) return { nothingYet: false, totals };
  if (current) {
    const dayOfMonth = parseISODate(today).getDate();
    const nothingYet = dayOfMonth < COMPARE_FROM_DAY && totals.count === 0;
    if (dayOfMonth < COMPARE_FROM_DAY) return { nothingYet, totals };
    // Dezelfde dagen van vorige maand; een kortere maand loopt tot zijn laatste dag.
    const lastDay = parseISODate(prev.end).getDate();
    const to = toISODate(new Date(parseISODate(prev.start).getFullYear(), parseISODate(prev.start).getMonth(), Math.min(dayOfMonth, lastDay)));
    const before = totalsOf(logsInRange(logs, plannedById, prev.start, to));
    if (before.count === 0) return { nothingYet: false, totals };
    return { nothingYet: false, totals, vs: { from: prev.start, to, whole: false, ...before, diffMinutes: totals.minutes - before.minutes, diffCount: totals.count - before.count } };
  }
  const before = totalsOf(logsInRange(logs, plannedById, prev.start, prev.end));
  if (before.count === 0) return { nothingYet: false, totals };
  return { nothingYet: false, totals, vs: { from: prev.start, to: prev.end, whole: true, ...before, diffMinutes: totals.minutes - before.minutes, diffCount: totals.count - before.count } };
}

// De maandag van de week waarin een dag valt, voor het groeperen van de lijst per week.
// De kop van een maand zonder trainingen: voor je eerste training, met alleen wegingen, of helemaal leeg.
export function emptyMonthTitle(input: { beforeFirst: boolean; weighings: number }): string {
  if (input.beforeFirst) return 'Hier begon je nog niet.';
  return input.weighings > 0 ? 'Geen trainingen in deze maand.' : 'Nog niets in deze maand.';
}

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
