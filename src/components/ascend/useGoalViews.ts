import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { GoalKindId } from '../../models/goals';
import { computeGoalReadiness, readinessInputOf, type GoalReadiness } from '../../engine/goalReadiness';
import { computeMainGoalReadiness } from '../../engine/gr5Readiness';
import { goalTiming, type GoalTiming } from '../../engine/goalRoute';
import { nextKeySession, type ListedGoal, type NextKeySession } from '../../engine/goalList';
import { resolveVariantDuration } from '../../engine/substitutions';
import { todayISO } from '../../utils/dates';

// Hoe een doel in de zinnen heet ("die je tocht vraagt").
const NAMING: Record<GoalKindId, string> = {
  trek_hut: 'je tocht', trek_tent: 'je tocht', day_hike: 'je bergtocht', mountaineering: 'je bergtocht', run_race: 'je wedstrijd',
  trail: 'je trailrun', bike: 'je fietsdoel', triathlon: 'je triathlon', stronger: 'je krachtdoel', fit: 'je beweegdoel',
};

export interface GoalView {
  item: ListedGoal;
  readiness?: GoalReadiness;
  timing: GoalTiming;
}

// De uitkomst van "Klaar voor je doel" per doel. Het doel met de mijlpalen rekent precies zoals
// Je stand (computeGr5Readiness): tocht met hutten, twee dagen achter elkaar.
export function useGoalViews(listed: ListedGoal[]): { views: GoalView[]; next: NextKeySession | undefined } {
  const { sessionLogs, plannedSessions, templates, program } = useAppData();
  const today = todayISO();
  const views = useMemo(
    () =>
      listed.map((item): GoalView => {
        const g = item.goal;
        const timing = goalTiming(g, today);
        if (item.isMain) {
          const readiness = computeMainGoalReadiness(g.requirements, sessionLogs, today);
          return { item, timing, readiness: readiness.percent === undefined ? undefined : readiness };
        }
        const input = readinessInputOf(g);
        if (!input) return { item, timing };
        const naming = NAMING[input.kind];
        return { item, timing, readiness: computeGoalReadiness(input, sessionLogs, today, { naming: { the: naming, your: naming } }) };
      }),
    [listed, sessionLogs, today],
  );
  const next = useMemo(
    () => nextKeySession(plannedSessions, templates, sessionLogs, today, (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program)),
    [plannedSessions, templates, sessionLogs, today, program],
  );
  return { views, next };
}
