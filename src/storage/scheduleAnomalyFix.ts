// ASCEND: de oplossing van "Opgevallen in je schema" (engine/scheduleAnomalies.ts),
// toegepast na jouw Aanpassen. Dat is jouw akkoord op een voorstel, dus wat het
// verplaatst krijgt het slot van een aangenomen voorstel, net als commitPlanChange
// (Warden Planning punt 4): de automatische planning laat het daarna staan.
//
// Rekent vlak voor het schrijven opnieuw uit tegen de opgeslagen planning, niet
// tegen wat de kaart liet zien. Geeft false als er niets meer op te lossen is.

import { GoalEngineConfigRepo, PlanChangeProposalsRepo, PlannedSessionsRepo, SessionLogsRepo, SessionTemplatesRepo } from './database';
import { detectConsecutiveRestDays, buildConsecutiveRestFixProposal } from '../engine/scheduleAnomalies';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { todayISO } from '../utils/dates';

export async function applyScheduleAnomalyFixNow(): Promise<boolean> {
  const [planned, tpls, logs, engineConfig] = await Promise.all([
    PlannedSessionsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    SessionLogsRepo.getAll(),
    GoalEngineConfigRepo.get(),
  ]);
  const templateById = new Map(tpls.map((t) => [t.id, t]));
  const runs = detectConsecutiveRestDays(planned, templateById, logs, todayISO());
  const proposal = buildConsecutiveRestFixProposal(runs, planned, templateById, engineConfig.availability, logs);
  if (!proposal) return false;

  const now = new Date().toISOString();
  const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned, undefined, { by: 'proposal', proposalId: proposal.id, at: now });
  if (unsupported.length > 0) {
    console.error('Schedule anomaly fix: refusing to apply, unsupported plan change items present', unsupported);
    return false;
  }

  const touchedIds = new Set(proposal.changes.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
  const originalIds = new Set(planned.map((s) => s.id));
  for (const session of updatedSessions) {
    if (touchedIds.has(session.id) || !originalIds.has(session.id)) await PlannedSessionsRepo.put(session);
  }
  await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: now, resolution: 'accepted' });
  return true;
}
