// ASCEND — your own rest day (Settings → Training → Rustdag).
//
// The weekly pattern has its rest day on Monday. When you pick another
// weekday, the weekday trainings are spread again over the days that are
// left: of every possible spread, the one that keeps the spacing between
// heavy sessions (engine/scheduler.ts, also against the weekend before and
// after, in the hike phases too) and moves sessions the least from their
// usual day. Saturday and Sunday stay for the long sessions, so the rest
// day is one of Monday to Friday.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { respectsHeavySpacing } from './scheduler';
import { PATTERN_SWAPS } from './programLayout';
import { addDays } from '../utils/dates';

export type RestWeekday = 1 | 2 | 3 | 4 | 5;
export const REST_DAY_OPTIONS: RestWeekday[] = [1, 2, 3, 4, 5];

const BASE_MONDAY = '2026-01-05';

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

// Every template of the pattern with the weekday it gets for this rest day.
export function arrangeWeekForRestDay(pattern: SessionTemplate[], allTemplates: SessionTemplate[], restDay: RestWeekday | undefined): SessionTemplate[] {
  const rest = pattern.find((t) => t.type === 'recovery');
  if (!restDay || !rest || rest.defaultDayOfWeek === restDay) return pattern;
  const byId = new Map(allTemplates.map((t) => [t.id, t]));
  const weekday = pattern.filter((t) => t !== rest && (t.defaultDayOfWeek ?? 0) >= 1 && (t.defaultDayOfWeek ?? 0) <= 5);
  const weekend = pattern.filter((t) => (t.defaultDayOfWeek ?? 0) >= 6);
  // The weekend as it can look: the pattern itself, and with each hike swap.
  const weekends = [weekend, weekend.map((t) => {
    const to = byId.get(PATTERN_SWAPS.find((s) => s.from === t.id)?.to ?? '');
    return to ? { ...to, defaultDayOfWeek: t.defaultDayOfWeek } : t;
  })];
  const freeDays = ([1, 2, 3, 4, 5] as number[]).filter((d) => d !== restDay);

  let best: { days: number[]; score: number } | undefined;
  for (const days of permutations(freeDays.slice(0, weekday.length))) {
    let conflicts = 0;
    for (const end of weekends) {
      // Last week's weekend, this week, next week's weekdays.
      const sessions: { t: SessionTemplate; date: string }[] = [
        ...end.map((t) => ({ t, date: addDays(BASE_MONDAY, (t.defaultDayOfWeek as number) - 8) })),
        ...weekday.map((t, i) => ({ t, date: addDays(BASE_MONDAY, days[i] - 1) })),
        ...end.map((t) => ({ t, date: addDays(BASE_MONDAY, (t.defaultDayOfWeek as number) - 1) })),
        ...weekday.map((t, i) => ({ t, date: addDays(BASE_MONDAY, days[i] + 6) })),
      ];
      const planned: PlannedSession[] = sessions.map((s, i) => ({ id: `s${i}`, templateId: s.t.id, scheduledDate: s.date, weekStartDate: BASE_MONDAY, status: 'planned', order: i }));
      const map = new Map([...allTemplates, ...sessions.map((s) => s.t)].map((t) => [t.id, t]));
      planned.forEach((p, i) => {
        if (!respectsHeavySpacing(p.scheduledDate, sessions[i].t, planned.filter((o) => o.id !== p.id), map)) conflicts++;
      });
    }
    const moved = weekday.reduce((n, t, i) => n + Math.abs(days[i] - (t.defaultDayOfWeek as number)), 0);
    const score = conflicts * 100 + moved;
    if (!best || score < best.score) best = { days, score };
  }
  if (!best) return pattern;
  const dayOf = new Map(weekday.map((t, i) => [t.id, best!.days[i]]));
  return pattern.map((t) => (t === rest ? { ...t, defaultDayOfWeek: restDay } : dayOf.has(t.id) ? { ...t, defaultDayOfWeek: dayOf.get(t.id) } : t));
}
