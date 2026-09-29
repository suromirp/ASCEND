// ASCEND — change log (Fase 3): what ASCEND changed on the calendar, when,
// and why — read straight from the append-only PlanChangeProposal audit
// trail. Nothing new is stored for it; this only makes the existing record
// readable (Week page timeline, "aangepast" badges, weekly reflection).

import type { PlanChangeProposal, EngineEvent } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { describeChanges } from './changeImpact';
import { addDays, mondayOfWeek } from '../utils/dates';

export const TRIGGER_LABEL: Record<EngineEvent, string> = {
  goal_created: 'Nieuw doel',
  goal_changed: 'Doel aangepast',
  goal_removed: 'Doel verwijderd',
  goal_paused: 'Doel gepauzeerd',
  strategy_changed: 'Instelling gewijzigd',
  goal_priority_changed: 'Doelprioriteit',
  session_completed: 'Training gelogd',
  session_skipped: 'Advies',
  session_moved: 'Sessie verplaatst',
  no_time_today: 'Geen tijd vandaag',
  injury_added: 'Blessure',
  injury_resolved: 'Blessure hersteld',
  availability_changed: 'Beschikbaarheid',
  new_training_data: 'Nieuwe trainingsdata',
  strength_program_changed: 'Krachtblok',
  schedule_anomaly_detected: 'Planning rechtgezet',
  weekly_prescription_computed: 'Weekplanning',
};

export interface ChangeLogEntry {
  id: string;
  at: string; // ISO datetime
  label: string;
  issue: string;
  undone: boolean;
  lines: string[];
  reasons: string[];
  explanation: string;
}

function revertedIds(proposals: PlanChangeProposal[]): Set<string> {
  return new Set(proposals.map((p) => p.revertsProposalId).filter((id): id is string => Boolean(id)));
}

export function buildChangeLog(proposals: PlanChangeProposal[], sessions: PlannedSession[], templates: SessionTemplate[], sinceIso: string): ChangeLogEntry[] {
  const reverted = revertedIds(proposals);
  return proposals
    .filter((p) => p.resolvedAt && p.createdAt.slice(0, 10) >= sinceIso)
    .filter((p) => p.changes.some((c) => c.action !== 'keep') || p.resolution === 'rejected')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      id: p.id,
      at: p.createdAt,
      label: TRIGGER_LABEL[p.trigger] ?? p.trigger,
      issue: p.issue,
      undone: p.resolution === 'rejected' || reverted.has(p.id),
      lines: describeChanges(p.changes, sessions, templates),
      reasons: [...new Set(p.changes.map((c) => c.reason).filter((r): r is string => Boolean(r)))],
      explanation: p.explanation,
    }));
}

// The latest accepted reason per session that ASCEND moved or re-dosed in
// the last `days` days — what the "aangepast" badge explains.
export function adjustedSessionReasons(proposals: PlanChangeProposal[], asOf: string, days = 14): Map<string, string> {
  const since = addDays(asOf, -days);
  const result = new Map<string, string>();
  const reverted = revertedIds(proposals);
  const accepted = proposals
    .filter((p) => p.resolution === 'accepted' && !reverted.has(p.id) && p.createdAt.slice(0, 10) >= since)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const p of accepted) {
    for (const c of p.changes) {
      if (!c.plannedSessionId || !['move', 'swap', 'reduce', 'replace'].includes(c.action)) continue;
      result.set(c.plannedSessionId, c.reason ?? p.issue);
    }
  }
  return result;
}

// "Volgende week verandert": the changes made in the last 7 days that land
// in next week.
export function nextWeekChangeLines(proposals: PlanChangeProposal[], sessions: PlannedSession[], templates: SessionTemplate[], asOf: string): string[] {
  const nextWeek = addDays(mondayOfWeek(asOf), 7);
  const since = addDays(asOf, -7);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const lines: string[] = [];
  const reverted = revertedIds(proposals);
  for (const p of proposals.filter((x) => x.resolution === 'accepted' && !reverted.has(x.id) && x.createdAt.slice(0, 10) >= since)) {
    const relevant = p.changes.filter((c) => {
      const date = c.toDate ?? c.newSessionDraft?.scheduledDate ?? (c.plannedSessionId ? sessionById.get(c.plannedSessionId)?.scheduledDate : undefined);
      return date !== undefined && mondayOfWeek(date) === nextWeek;
    });
    lines.push(...describeChanges(relevant, sessions, templates));
  }
  return [...new Set(lines)];
}
