// ASCEND — "zo ziet je week eruit" for a proposal (advice with Akkoord): the
// weeks it touches, day by day, with what changes marked. Computed by
// applying the proposal's items to a copy of the plan; nothing is saved.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { applyPlanChangeItems } from './proposalEngine';
import { mondayOfWeek, weekDates } from '../utils/dates';

export interface PreviewEntry {
  name: string;
  change?: 'nieuw' | 'verplaatst' | 'vervalt';
}

export interface PreviewDay {
  date: string;
  entries: PreviewEntry[];
  changed: boolean;
}

export interface PreviewWeek {
  weekStart: string;
  days: PreviewDay[];
}

const MAX_WEEKS = 2;

export function previewProposal(items: PlanChangeItem[], sessions: PlannedSession[], templates: SessionTemplate[]): PreviewWeek[] {
  const real = items.filter((i) => i.action !== 'keep' && i.action !== 'replace');
  if (real.length === 0) return [];
  const nameOf = new Map(templates.map((t) => [t.id, t.name]));
  const before = new Map(sessions.map((s) => [s.id, s]));
  const { sessions: after, unsupported } = applyPlanChangeItems(real, sessions, (() => { let n = 0; return () => `preview-${n++}`; })());
  if (unsupported.length > 0) return [];

  // Which sessions changed, and how.
  const kind = new Map<string, PreviewEntry['change']>();
  const gone: PlannedSession[] = [];
  for (const s of after) {
    const was = before.get(s.id);
    if (!was) kind.set(s.id, 'nieuw');
    else if (was.status !== 'skipped' && s.status === 'skipped') gone.push(was);
    else if (was.scheduledDate !== s.scheduledDate) kind.set(s.id, 'verplaatst');
  }
  // Where a moved session came from, it also leaves a mark.
  const weeks = new Set<string>();
  for (const s of after) if (kind.has(s.id)) weeks.add(mondayOfWeek(s.scheduledDate));
  for (const s of gone) weeks.add(mondayOfWeek(s.scheduledDate));
  const ordered = [...weeks].sort().slice(0, MAX_WEEKS);

  return ordered.map((weekStart) => ({
    weekStart,
    days: weekDates(weekStart).map((date) => {
      const entries: PreviewEntry[] = [
        ...after.filter((s) => s.scheduledDate === date && s.status !== 'skipped').map((s): PreviewEntry => ({ name: nameOf.get(s.templateId) ?? 'Training', change: kind.get(s.id) })),
        ...gone.filter((s) => s.scheduledDate === date).map((s): PreviewEntry => ({ name: nameOf.get(s.templateId) ?? 'Training', change: 'vervalt' })),
      ];
      // A move away from this day: the old spot says so.
      for (const s of after) {
        const was = before.get(s.id);
        if (was && was.status !== 'skipped' && s.status !== 'skipped' && kind.get(s.id) === 'verplaatst' && was.scheduledDate === date) entries.push({ name: nameOf.get(s.templateId) ?? 'Training', change: 'vervalt' });
      }
      return { date, entries, changed: entries.some((e) => e.change) };
    }),
  }));
}

