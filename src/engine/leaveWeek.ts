// ASCEND: de perioden in de weeklijst (docs/beslissingen/2026-11-09-week-band.md). Eén band per
// periode per week, boven de eerste dag die erin valt, in plaats van een kaart per dag. De
// trainingen op die dagen blijven gewone rijen en horen er met een rustige lijn bij. Puur: geen
// React, geen IndexedDB. De dag zelf (welke periode telt, bij overlap de strengste) komt uit
// `leaveDays`; de dagen vóór en na een tocht blijven een los label per dag (`leaveLabelOn`).

import type { LeaveKind, LeavePeriod } from '../models/leave';
import { leaveDays, type LeaveDay } from './leave';
import { noGymLine } from './noGymDetails';
import { formatWeekdayDayMonthNL, weekdayShortNL } from '../utils/dates';

// De soort in een woord of twee, boven in de band.
export const LEAVE_BAND_TITLE: Record<LeaveKind, string> = {
  no_training: 'Vakantie',
  no_gym: 'Zonder sportschool',
  trek: 'Tocht',
  free_days: 'Vrije dagen',
};

// Wat de periode voor de dagen betekent, in één korte regel.
export function leavePeriodLine(period: LeavePeriod): string {
  if (period.kind === 'no_training') return 'Geen training';
  if (period.kind === 'trek') return 'Wandelen met je rugzak';
  if (period.kind === 'no_gym') return noGymLine(period);
  return 'Extra tijd';
}

const QUIET_WORD: Record<LeaveKind, string> = { no_training: 'vakantie', trek: 'tochtdag', no_gym: 'vrij', free_days: 'vrij' };

export interface WeekLeaveBand {
  // Uniek binnen de week: periode en eerste dag.
  key: string;
  period: LeavePeriod;
  // De dagen van deze week waarop deze periode telt, aaneengesloten, op volgorde.
  dates: string[];
  title: string;
  // "za 14 t/m wo 18", of "za 14" bij één dag.
  range: string;
  // "sinds za 7 nov" en/of "loopt door tot ma 24 nov" als de periode buiten deze week doorloopt.
  extent?: string;
  line: string;
  note?: string;
}

const dayShort = (date: string) => `${weekdayShortNL(date).toLowerCase()} ${Number(date.slice(8, 10))}`;

export function describeBandRange(dates: string[]): string {
  return dates.length === 1 ? dayShort(dates[0]) : `${dayShort(dates[0])} t/m ${dayShort(dates[dates.length - 1])}`;
}

function bandOf(period: LeavePeriod, dates: string[]): WeekLeaveBand {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const since = period.startDate < first ? `sinds ${formatWeekdayDayMonthNL(period.startDate)}` : undefined;
  const until = period.endDate > last ? `loopt door tot ${formatWeekdayDayMonthNL(period.endDate)}` : undefined;
  return {
    key: `${period.id}:${first}`,
    period,
    dates,
    // Een tocht heeft zijn eigen naam; de andere soorten heten naar de soort.
    title: period.kind === 'trek' ? (period.trek?.name.trim() || LEAVE_BAND_TITLE.trek) : LEAVE_BAND_TITLE[period.kind],
    range: describeBandRange(dates),
    extent: [since, until].filter(Boolean).join(' · ') || undefined,
    line: leavePeriodLine(period),
    note: period.note?.trim() || undefined,
  };
}

export interface WeekLeave {
  bands: WeekLeaveBand[];
  // Per eerste dag van een band: de band die daarboven komt.
  bandAbove: Map<string, WeekLeaveBand>;
  // Elke dag die onder een band valt.
  inBand: Set<string>;
  // Wat een dag zonder training heet: "vakantie", "tochtdag" of "vrij".
  quietWord: Map<string, string>;
}

// `weekDates`: de zeven dagen van de week. Twee periodes die elkaar overlappen delen de dagen volgens
// `leaveDays` (de strengste telt); valt een periode daardoor in stukken uiteen, dan krijgt elk stuk een band.
export function leaveWeek(weekDates: string[], periods: LeavePeriod[] | undefined): WeekLeave {
  const days = leaveDays(periods);
  const runs: { period: LeavePeriod; dates: string[] }[] = [];
  let previous: LeaveDay | undefined;
  for (const date of weekDates) {
    const day = days.get(date);
    if (day && previous && previous.period.id === day.period.id) runs[runs.length - 1].dates.push(date);
    else if (day) runs.push({ period: day.period, dates: [date] });
    previous = day;
  }
  const bands = runs.map((r) => bandOf(r.period, r.dates));
  return {
    bands,
    bandAbove: new Map(bands.map((b) => [b.dates[0], b])),
    inBand: new Set(bands.flatMap((b) => b.dates)),
    quietWord: new Map(bands.flatMap((b) => b.dates.map((d): [string, string] => [d, QUIET_WORD[b.period.kind]]))),
  };
}
