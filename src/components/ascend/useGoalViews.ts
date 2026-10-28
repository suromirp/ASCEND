import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { GoalKindId } from '../../models/goals';
import { computeGoalReadiness, readinessInputOf } from '../../engine/goalReadiness';
import { computeRaceReadiness, resolveReadinessWeighting, type RaceReadiness } from '../../engine/raceReadiness';
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
  readiness?: RaceReadiness;
  timing: GoalTiming;
}

// De uitkomst van "Klaar voor je doel" per doel. Het doel met de mijlpalen rekent precies zoals
// Je stand (computeGr5Readiness): tocht met hutten, twee dagen achter elkaar.
export function useGoalViews(listed: ListedGoal[]): { views: GoalView[]; next: NextKeySession | undefined } {
  const { sessionLogs, plannedSessions, templates, program, settings } = useAppData();
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
        if (input.kind === 'run_race') {
          const race = computeRaceReadiness(g, sessionLogs, today, {
            naming: { the: naming, your: naming }, judgments: settings.testJudgments, ask: settings.askDoubtTest !== false, weighting: resolveReadinessWeighting(settings.readinessWeighting),
          });
          if (race) return { item, timing, readiness: race };
        }
        return { item, timing, readiness: computeGoalReadiness(input, sessionLogs, today, { naming: { the: naming, your: naming } }) };
      }),
    [listed, sessionLogs, today, settings.testJudgments, settings.askDoubtTest, settings.readinessWeighting],
  );
  const next = useMemo(
    () => nextKeySession(plannedSessions, templates, sessionLogs, today, (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program)),
    [plannedSessions, templates, sessionLogs, today, program],
  );
  return { views, next };
}
