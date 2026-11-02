import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { needsFirstPlan } from '../../engine/freshStart';
import { listedGoals } from '../../engine/goalList';
import { plannedRestFor, yourWeek, type YourWeek } from '../../engine/yourWeek';
import { todayISO } from '../../utils/dates';

// Je week voor Je stand: alleen zonder doel en met een plan, anders niets (zie YourWeekStandCard).
export function useStandYourWeek(): YourWeek | undefined {
  const { trainingGoals, goalMilestones, program, plannedSessions, settings, sessionLogs, templates } = useAppData();
  const today = todayISO();
  return useMemo(() => {
    if (needsFirstPlan({ programs: program ? 1 : 0, plannedSessions: plannedSessions.length })) return undefined;
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    if (listedGoals(trainingGoals, ladder, today).length > 0) return undefined;
    return yourWeek({
      settings, goals: [], milestones: ladder, logs: sessionLogs, templates, plannedSessions, today,
      plannedRest: plannedRestFor({ plannedSessions, templates, logs: sessionLogs, program, settings, today }),
    });
  }, [trainingGoals, goalMilestones, program, plannedSessions, settings, sessionLogs, templates, today]);
}

