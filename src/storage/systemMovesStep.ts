// ASCEND: de opstartstap die oude verplaatsingen door het systeem weer van het
// systeem maakt (engine/systemMoves.ts). Schrijft alleen de rijen die het
// wijzigingslog aanwijst; idempotent.

import { MetaRepo, PlannedSessionsRepo, PlanChangeProposalsRepo, SessionLogsRepo } from './database';
import type { StoredResponse } from '../engine/learning';
import { systemMovedRows } from '../engine/systemMoves';
import { todayISO } from '../utils/dates';

export async function releaseSystemMoves(): Promise<number> {
  const [sessions, proposals, logs, responses] = await Promise.all([
    PlannedSessionsRepo.getAll(), PlanChangeProposalsRepo.getAll(), SessionLogsRepo.getAll(), MetaRepo.get<Record<string, StoredResponse>>('adviceResponses'),
  ]);
  const rows = systemMovedRows(sessions, proposals, logs, todayISO(), responses ?? {});
  for (const row of rows) await PlannedSessionsRepo.put(row);
  return rows.length;
}
