// ASCEND: je gewicht ook buiten Instellingen zien: de kaart Gewicht op Je stand en een weging als eigen
// regel in het Logboek (docs/beslissingen/2026-11-09-gewicht-buiten-instellingen.md). Puur: geen React,
// niets wordt opgeslagen en de planning leest hier niets van.
//
// De kaart toont wat het blad Lichaamsgewicht groot toont (`weightShown`: de trend als die er is,
// anders de laatste weging), de laatste weging klein, en een rustige lijn van de laatste weken.

import type { WeightEntry } from '../models/metrics';
import type { SessionLog } from '../models/training';
import { groupByWeek, mondayKey } from './logbookMonth';
import { addDays, daysBetween } from '../utils/dates';
import { latestWeight } from './bodyWeight';
import type { TrendPoint } from './readiness';
import { weightShown } from './weightTrend';

export const WEIGHT_LINE_WEEKS = 6;
// Een punt op de lijn zegt niets als de weging waar het op rust al ouder is dan dit.
const POINT_MAX_AGE_DAYS = 14;

// "Gewicht op Je stand": afwezig is aan zodra er een weging is, false is uit.
export const weightCardOn = (setting: boolean | undefined, entries: WeightEntry[] | undefined): boolean =>
  setting !== false && (entries ?? []).length > 0;

export interface WeightCardData {
  // Groot: de trend, of de laatste weging als er geen trend is.
  kg: number;
  isTrend: boolean;
  // Klein: de laatste weging zelf.
  latest: { kg: number; date: string; source: string };
  // De lijn: één punt per week, nieuwste laatst. Minder dan twee punten is geen lijn.
  points: TrendPoint[];
}

export function weightCardData(entries: WeightEntry[] | undefined, trendOn: boolean | undefined, today: string): WeightCardData | undefined {
  const shown = weightShown(entries, trendOn);
  if (!shown) return undefined;
  const points: TrendPoint[] = [];
  for (let i = WEIGHT_LINE_WEEKS - 1; i >= 0; i--) {
    const day = addDays(today, -7 * i);
    const upTo = (entries ?? []).filter((e) => e.date <= day);
    const last = latestWeight(upTo);
    if (!last || daysBetween(last.date, day) > POINT_MAX_AGE_DAYS) continue;
    const at = weightShown(upTo, trendOn);
    if (at) points.push({ label: day, value: at.kg });
  }
  return { kg: shown.kg, isTrend: shown.trend !== undefined, latest: { kg: shown.latest.kg, date: shown.latest.date, source: shown.latest.source }, points };
}

// De bron van een weging in het Logboek, in gewone woorden.
export function weightSourceLabel(source: string): string {
  if (source === 'macrofactor') return 'MacroFactor';
  if (source === 'health-connect') return 'Health Connect';
  if (source === 'garmin') return 'Garmin';
  if (source === 'import') return 'Import';
  return 'Zelf ingevuld';
}

// De wegingen van een periode voor het Logboek, nieuwste eerst.
export function weighingsInRange(entries: WeightEntry[] | undefined, start: string, end: string): WeightEntry[] {
  return (entries ?? []).filter((e) => e.date >= start && e.date <= end).sort((a, b) => b.date.localeCompare(a.date));
}

// Het Logboek per week: de trainingen (zoals `groupByWeek`) met de wegingen als eigen regels tussen
// de trainingen, nieuwste dag eerst en op één dag de training voor de weging. Een week met alleen
// een weging staat er ook.
export type LogbookItem = { kind: 'log'; log: SessionLog } | { kind: 'weight'; entry: WeightEntry };

export function logbookWeeks(logs: SessionLog[], weighings: WeightEntry[]): { weekStart: string; items: LogbookItem[] }[] {
  const weeks = new Map<string, LogbookItem[]>();
  for (const w of groupByWeek(logs)) weeks.set(w.weekStart, w.logs.map((log) => ({ kind: 'log', log })));
  for (const entry of weighings) {
    const key = mondayKey(entry.date);
    weeks.set(key, [...(weeks.get(key) ?? []), { kind: 'weight', entry }]);
  }
  const dayOf = (i: LogbookItem) => (i.kind === 'log' ? i.log.completedDate : i.entry.date);
  return [...weeks.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStart, items]) => ({
      weekStart,
      items: items
        .map((item, n) => ({ item, n }))
        .sort((a, b) => dayOf(b.item).localeCompare(dayOf(a.item)) || (a.item.kind === b.item.kind ? a.n - b.n : a.item.kind === 'log' ? -1 : 1))
        .map((x) => x.item),
    }));
}
