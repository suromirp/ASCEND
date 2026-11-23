// ASCEND: de opstartstap beschikbaarheid, los van React (stond in state/strengthAndReplan.ts#runForecastReplan).
// Wat in de vervolgweken op een dag staat waarop je niet kunt, schuift naar een vrije dag in die week of vervalt
// (engine/adaptiveReplanner.ts#computeForecastReplan). Een test, wedstrijd of rij met een slot blijft staan. Zonder
// doel met een vraag doet hij niets. Los, zodat een test hem kan draaien zoals de opening hem draait (I-14 stap 4).

import { GoalEngineConfigRepo, PlanChangeProposalsRepo, PlannedSessionsRepo, SessionTemplatesRepo, TrainingGoalsRepo } from './database';
import { activeGoalDemandKeys } from '../engine/progressionDecisions';
import { computeForecastReplan } from '../engine/adaptiveReplanner';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { todayISO } from '../utils/dates';

// De zin voor de melding als er iets veranderde, anders niets.
export async function runAvailabilityStep(asOf: string = todayISO()): Promise<{ passiveSummary: string } | undefined> {
  const [goals, planned, tpls, engineConfig] = await Promise.all([
    TrainingGoalsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    GoalEngineConfigRepo.get(),
  ]);
  // Geen actief doel met een vraag: niets om de vervolgweken omheen te leggen.
  if (activeGoalDemandKeys(goals).length === 0) return undefined;

  const { proposal, passiveSummary } = computeForecastReplan({ plannedSessions: planned, templates: tpls, availability: engineConfig.availability, asOf });
  if (proposal.changes.length === 0) return undefined;

  const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned);
  if (unsupported.length > 0) {
    // Never an unintended partial apply: if any item in this batch can't be honored, nothing from this run is
    // persisted. The next boot recomputes fresh against then-current data.
    console.error('Adaptive Replanner: refusing to apply, unsupported plan change items present', unsupported);
    return undefined;
  }

  const touchedIds = new Set(proposal.changes.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
  const originalIds = new Set(planned.map((s) => s.id));
  for (const session of updatedSessions) {
    if (touchedIds.has(session.id) || !originalIds.has(session.id)) await PlannedSessionsRepo.put(session);
  }
  // Append-only audit trail; the forecast range auto-applies, never user-confirmed.
  await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });
  return { passiveSummary };
}
