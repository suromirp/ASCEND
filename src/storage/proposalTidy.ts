// ASCEND: oude, besliste voorstellen samenvatten (engine/proposalTidy.ts beslist welke en hoe).
// Draait bij het opstarten (storage/bootMigrations.ts) en vlak voor een back-up
// (AppDataContext#exportData). Raakt alleen planChangeProposals, in één transactie, en nooit
// SessionLog of MilestoneProgress. Idempotent: wat al samengevat is, blijft zoals het is.

import { getDB, PlanChangeProposalsRepo, PlannedSessionsRepo, SettingsRepo } from './database';
import { proposalsToSummarize, resolveProposalTidyMonths } from '../engine/proposalTidy';
import { todayISO } from '../utils/dates';

// Geeft terug hoeveel voorstellen zijn samengevat.
export async function tidyOldProposals(options: { today?: string; now?: string } = {}): Promise<number> {
  const settings = await SettingsRepo.get();
  const months = resolveProposalTidyMonths(settings.proposalTidyMonths);
  if (months === 0) return 0;
  const [proposals, plannedSessions] = await Promise.all([PlanChangeProposalsRepo.getAll(), PlannedSessionsRepo.getAll()]);
  const summaries = proposalsToSummarize(proposals, {
    plannedSessions,
    leavePeriodIds: (settings.leavePeriods ?? []).map((p) => p.id),
    today: options.today ?? todayISO(),
    months,
    now: options.now ?? new Date().toISOString(),
  });
  if (summaries.length === 0) return 0;
  const db = await getDB();
  const tx = db.transaction('planChangeProposals', 'readwrite');
  await Promise.all([...summaries.map((p) => tx.store.put(p)), tx.done]);
  return summaries.length;
}
