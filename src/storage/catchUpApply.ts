// ASCEND: een inhaal wegschrijven (engine/catchUp.ts): de gemiste rij wordt overgeslagen en de nieuwe rij
// komt op de gekozen dag. Het ongedaan maken gaat via de melding (before + addedIds, undoPlanChange.ts).
import type { PlanLock, PlannedSession } from '../models/training';
import { catchUpRows } from '../engine/catchUp';
import { PlannedSessionsRepo } from './database';

export async function writeCatchUp(session: PlannedSession, toDate: string, lock: PlanLock, newId: string): Promise<PlannedSession> {
  const { skipped, added } = catchUpRows(session, toDate, lock, newId);
  await PlannedSessionsRepo.put(skipped);
  await PlannedSessionsRepo.put(added);
  return added;
}
