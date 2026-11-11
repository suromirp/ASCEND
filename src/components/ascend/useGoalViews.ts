import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { RaceReadiness } from '../../engine/raceReadiness';
import { goalReadinessFor } from '../../engine/goalReadinessFor';
import { goalTiming, type GoalTiming } from '../../engine/goalRoute';
import type { ListedGoal } from '../../engine/goalList';
import { nextKeySession, type NextKeySession } from '../../engine/keySession';
import { useKeyFocus } from '../useKeyFocus';
import { todayISO } from '../../utils/dates';

export interface GoalView {
  item: ListedGoal;
  readiness?: RaceReadiness;
  timing: GoalTiming;
}

// De uitkomst van "Klaar voor je doel" per doel. Het doel met de mijlpalen rekent precies zoals
// Je stand (computeMainGoalReadiness): tocht met hutten, twee dagen achter elkaar.
export function useGoalViews(listed: ListedGoal[]): { views: GoalView[]; next: NextKeySession | undefined } {
  const { sessionLogs, plannedSessions, templates, program, settings } = useAppData();
  const keyFocus = useKeyFocus();
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
  // Dezelfde sleuteltraining als het inhalen (engine/keySession.ts): het hoofddoel, of de richting.
  const { leavePeriods } = settings;
  const next = useMemo(
    () => nextKeySession(plannedSessions, templates, sessionLogs, today, keyFocus, program, leavePeriods),
    [plannedSessions, templates, sessionLogs, today, program, keyFocus, leavePeriods],
  );
  return { views, next };
}
