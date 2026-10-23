// ASCEND: de opstartstap die oude verplaatsingen door het systeem weer van het
// systeem maakt (engine/systemMoves.ts). Schrijft alleen de rijen die het
// wijzigingslog aanwijst; idempotent.

import { PlannedSessionsRepo, PlanChangeProposalsRepo, SessionLogsRepo } from './database';
import { systemMovedRows } from '../engine/systemMoves';
import { todayISO } from '../utils/dates';

export async function releaseSystemMoves(): Promise<number> {
  const [sessions, proposals, logs] = await Promise.all([PlannedSessionsRepo.getAll(), PlanChangeProposalsRepo.getAll(), SessionLogsRepo.getAll()]);
  const rows = systemMovedRows(sessions, proposals, logs, todayISO());
  for (const row of rows) await PlannedSessionsRepo.put(row);
  return rows.length;
}
