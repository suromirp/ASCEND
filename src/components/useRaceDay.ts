// ASCEND: de Racedag van nu voor Vandaag en het blad van een doel (engine/raceDay.ts#raceDayForApp). Leest alleen.

import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { expectedRaceTime } from '../engine/raceReadiness';
import { raceDayForApp, raceDayOn, type RaceDayView } from '../engine/raceDay';
import { todayISO } from '../utils/dates';

// Het blad en de rij van nu, of niets. `goalId`: alleen voor dat doel (het blad van het doel).
export function useRaceDay(goalId?: string): RaceDayView | undefined {
  const { settings, trainingGoals, sessionLogs, plannedSessions, templates, weather } = useAppData();
  const today = todayISO();
  return useMemo(() => raceDayForApp({
    on: raceDayOn(settings),
    goals: trainingGoals,
    goalId,
    today,
    logs: sessionLogs,
    planned: plannedSessions,
    templates,
    forecast: weather.forecast,
    weatherPlace: !!weather.place,
    expectedMinutes: (km) => {
      const time = expectedRaceTime(sessionLogs, today, km, { judgments: settings.testJudgments, ask: settings.askDoubtTest !== false });
      return time.status === 'ok' ? time.minutes : undefined;
    },
  }), [settings, goalId, trainingGoals, sessionLogs, plannedSessions, templates, weather.forecast, weather.place, today]);
}
