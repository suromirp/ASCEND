// ASCEND: het echte tempo van je laatste lopen van dezelfde training, voor de
// afstand die Vandaag noemt. Alleen een schatting in tekst; de planning blijft
// zoals hij was.
//
// Pure: no React, no IndexedDB.

import type { SessionLog } from '../models/training';
import { logSport } from './sports';
import { addDays } from '../utils/dates';
import type { PaceRange } from './racePaces';

const LAST_RUNS = 3;
const LOOKBACK_DAYS = 90;
const MIN_KM = 3;
// Eén of twee lopen zeggen weinig over de spreiding; er komt een marge omheen.
const MARGIN = 0.03;

export interface RecentRunPace {
  range: PaceRange;
  runs: number;
}

// De laatste (hoogstens drie) lopen van deze training in de laatste drie maanden,
// zoals je ze echt liep: totale tijd door afstand, hellingen en stops inbegrepen.
export function recentRunPace(logs: SessionLog[], templateId: string, today: string): RecentRunPace | undefined {
  const since = addDays(today, -LOOKBACK_DAYS);
  const paces = logs
    .filter((l) => l.templateId === templateId && logSport(l) === 'running' && l.completedDate >= since && l.completedDate <= today)
    .sort((a, b) => b.completedDate.localeCompare(a.completedDate))
    .flatMap((l) => {
      const d = l.cardioData ?? l.outdoorData;
      const km = d?.distanceKm ?? 0;
      const minutes = d?.durationMinutes || l.durationMinutes;
      return km >= MIN_KM && minutes > 0 ? [(minutes * 60) / km] : [];
    })
    .slice(0, LAST_RUNS);
  if (paces.length === 0) return undefined;
  return { range: { fast: Math.min(...paces) * (1 - MARGIN), slow: Math.max(...paces) * (1 + MARGIN) }, runs: paces.length };
}
