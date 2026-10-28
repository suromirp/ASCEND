import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { RaceReadiness } from '../../engine/raceReadiness';
import { goalReadinessFor } from '../../engine/goalReadinessFor';
import { goalTiming, type GoalTiming } from '../../engine/goalRoute';
import { nextKeySession, type ListedGoal, type NextKeySession } from '../../engine/goalList';
import { resolveVariantDuration } from '../../engine/substitutions';
import { todayISO } from '../../utils/dates';

export interface GoalView {
  item: ListedGoal;
  readiness?: RaceReadiness;
  timing: GoalTiming;
}

// De uitkomst van "Klaar voor je doel" per doel. Het doel met de mijlpalen rekent precies zoals
// Je stand (computeGr5Readiness): tocht met hutten, twee dagen achter elkaar.
export function useGoalViews(listed: ListedGoal[]): { views: GoalView[]; next: NextKeySession | undefined } {
  const { sessionLogs, plannedSessions, templates, program, settings } = useAppData();
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
  const next = useMemo(
    () => nextKeySession(plannedSessions, templates, sessionLogs, today, (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program)),
    [plannedSessions, templates, sessionLogs, today, program],
  );
  return { views, next };
}
