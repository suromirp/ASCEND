import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { RaceReadiness } from '../../engine/raceReadiness';
import { goalReadinessFor } from '../../engine/goalReadinessFor';
import { goalTiming, type GoalTiming } from '../../engine/goalRoute';
import type { ListedGoal } from '../../engine/goalList';
import { keyFocusOf, nextKeySession, type NextKeySession } from '../../engine/keySession';
import { resolveVariantDuration } from '../../engine/substitutions';
import { todayISO } from '../../utils/dates';

export interface GoalView {
  item: ListedGoal;
  readiness?: RaceReadiness;
  timing: GoalTiming;
}

// De uitkomst van "Klaar voor je doel" per doel. Het doel met de mijlpalen rekent precies zoals
// Je stand (computeMainGoalReadiness): tocht met hutten, twee dagen achter elkaar.
export function useGoalViews(listed: ListedGoal[]): { views: GoalView[]; next: NextKeySession | undefined } {
  const { sessionLogs, plannedSessions, templates, program, settings, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  const { testJudgments, askDoubtTest, readinessWeighting, goalGrowth, limitMargin } = settings;
  const views = useMemo(
    () =>
      listed.map((item): GoalView => {
        const g = item.goal;
        const timing = goalTiming(g, today);
        return { item, timing, readiness: goalReadinessFor(g, sessionLogs, today, { testJudgments, askDoubtTest, readinessWeighting, goalGrowth, limitMargin }, { isMain: item.isMain }) };
      }),
    [listed, sessionLogs, today, testJudgments, askDoubtTest, readinessWeighting, goalGrowth, limitMargin],
  );
  // Dezelfde sleuteltraining als het inhalen (engine/keySession.ts): de soort van het doel bovenaan, of de richting.
  const { direction, leavePeriods } = settings;
  const next = useMemo(
    () => nextKeySession(
      plannedSessions, templates, sessionLogs, today,
      keyFocusOf(trainingGoals, goalMilestones, today, { direction }),
      (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
      leavePeriods,
    ),
    [plannedSessions, templates, sessionLogs, today, program, trainingGoals, goalMilestones, direction, leavePeriods],
  );
  return { views, next };
}
