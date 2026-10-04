// ASCEND — how much a plan change asks of the user (feedback pattern,
// Fase 2). Three levels, one rule set, used by every flow that changes
// the calendar:
//
//   hint      nothing on the calendar changes — just tell the user
//   notice    only the forecast range (week +2 on) changes, nothing is
//             removed: apply, show what changed, offer "ongedaan maken"
//   decision  touches this week or next week, or removes a session:
//             the user decides first (blocking sheet)
//
// The user's "Wijzigingen toepassen" setting then decides how many of
// those levels get asked vs. applied with a notice. Never a new planning
// rule — this only classifies what engine/ already proposed.

import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { isDateInForecastRange } from './planningHorizon';
import { weekdayShortNL, formatDateNL } from '../utils/dates';

export type ChangeImpactLevel = 'hint' | 'notice' | 'decision';
export type ChangeApplyMode = 'always_ask' | 'auto_small' | 'auto_all';

export const CHANGE_APPLY_MODE_LABEL: Record<ChangeApplyMode, { label: string; note: string }> = {
  always_ask: { label: 'Altijd eerst vragen', note: 'ASCEND laat elke wijziging eerst zien en wacht op jouw akkoord.' },
  auto_small: { label: 'Kleine wijzigingen automatisch', note: 'Weken verder weg past ASCEND zelf aan, met een melding die je ongedaan kunt maken. Deze en volgende week, of iets schrappen, vraagt altijd eerst.' },
  auto_all: { label: 'Alles automatisch, met melding', note: 'ASCEND past alles direct aan en laat achteraf zien wat er veranderde, met ongedaan maken.' },
};

function itemDates(item: PlanChangeItem, sessionById: Map<string, PlannedSession>): string[] {
  const dates = [item.fromDate, item.toDate, item.newSessionDraft?.scheduledDate];
  if (item.plannedSessionId) dates.push(sessionById.get(item.plannedSessionId)?.scheduledDate);
  return dates.filter((d): d is string => Boolean(d));
}

export function classifyChangeImpact(items: PlanChangeItem[], sessions: PlannedSession[], asOf: string): ChangeImpactLevel {
  const real = items.filter((i) => i.action !== 'keep');
  if (real.length === 0) return 'hint';
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const touchesNearTerm = real.some((i) => itemDates(i, sessionById).some((d) => !isDateInForecastRange(d, asOf)));
  if (touchesNearTerm || real.some((i) => i.action === 'remove')) return 'decision';
  return 'notice';
}

export function needsConfirmation(level: ChangeImpactLevel, mode: ChangeApplyMode): boolean {
  if (level === 'hint') return false;
  if (mode === 'always_ask') return true;
  if (mode === 'auto_small') return level === 'decision';
  return false;
}

function shortDate(iso: string): string {
  return `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
}

// Plain Dutch lines, one per change: what, and from/to where.
export function describeChanges(items: PlanChangeItem[], sessions: PlannedSession[], templates: SessionTemplate[]): string[] {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const nameOf = (templateId: string | undefined) => (templateId ? templateById.get(templateId)?.name : undefined) ?? 'Sessie';
  const lines: string[] = [];
  // In date order, so a long list reads like a calendar.
  const dateOf = (item: PlanChangeItem) => item.fromDate ?? item.newSessionDraft?.scheduledDate ?? (item.plannedSessionId ? sessionById.get(item.plannedSessionId)?.scheduledDate : undefined) ?? '';
  for (const item of [...items].sort((a, b) => dateOf(a).localeCompare(dateOf(b)))) {
    const session = item.plannedSessionId ? sessionById.get(item.plannedSessionId) : undefined;
    const name = nameOf(session?.templateId ?? item.newSessionDraft?.templateId);
    switch (item.action) {
      case 'move':
      case 'swap': {
        const from = item.fromDate ?? session?.scheduledDate;
        if (from && item.toDate) lines.push(`${name}: ${shortDate(from)} → ${shortDate(item.toDate)}`);
        break;
      }
      case 'add':
        if (item.newSessionDraft) lines.push(`${name} toegevoegd op ${shortDate(item.newSessionDraft.scheduledDate)}`);
        break;
      case 'remove':
        if (session) lines.push(`${name} op ${shortDate(session.scheduledDate)} vervalt`);
        break;
      case 'reduce':
        if (session) lines.push(`${name} op ${shortDate(session.scheduledDate)} wordt lichter`);
        break;
      case 'replace':
        if (session) lines.push(`${name} op ${shortDate(session.scheduledDate)} krijgt een andere invulling`);
        break;
      default:
        break;
    }
  }
  return lines;
}
