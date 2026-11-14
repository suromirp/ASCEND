// ASCEND: de Racedag van nu voor Vandaag en het blad van een doel (engine/raceDay.ts). Leest alleen.

import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { goalDetailsOf } from '../engine/goalLabels';
import { expectedRaceTime } from '../engine/raceReadiness';
import { raceDayMoment, raceDayOn, raceDayView, raceLogFor, type RaceDayView } from '../engine/raceDay';
import { todayISO } from '../utils/dates';

// Het blad en de rij van nu, of niets (instelling uit, geen 10 km in de laatste week of gisteren).
// `goalId`: alleen voor dat doel (het blad van het doel).
export function useRaceDay(goalId?: string): RaceDayView | undefined {
  const { settings, trainingGoals, sessionLogs, plannedSessions, templates, weather } = useAppData();
  const today = todayISO();
  return useMemo(() => {
    if (!raceDayOn(settings)) return undefined;
    const goals = goalId ? trainingGoals.filter((g) => g.id === goalId) : trainingGoals;
    const moment = raceDayMoment(goals, today);
    if (!moment) return undefined;
    const km = goalDetailsOf(moment.goal).distanceKm ?? 10;
    const time = moment.phase === 'after' ? undefined : expectedRaceTime(sessionLogs, today, km, { judgments: settings.testJudgments, ask: settings.askDoubtTest !== false });
    return raceDayView({
      moment,
      expectedMinutes: time?.status === 'ok' ? time.minutes : undefined,
      forecast: weather.forecast,
      raceLog: moment.phase === 'after' ? raceLogFor(sessionLogs, plannedSessions, moment.raceDate, templates) : undefined,
    });
  }, [settings, goalId, trainingGoals, sessionLogs, plannedSessions, templates, weather.forecast, today]);
}

