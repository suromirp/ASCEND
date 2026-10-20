// ASCEND — "zo ziet je week eruit" for a proposal (advice with Akkoord): the
// weeks it touches, day by day, with what changes marked, plus one line per
// change for the summary on top. Computed by applying the proposal's items
// to a copy of the plan; nothing is saved.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession, SessionTemplate, SessionType } from '../models/training';
import { applyPlanChangeItems } from './proposalEngine';
import { mondayOfWeek, weekDates } from '../utils/dates';

export type PreviewChange = 'nieuw' | 'hierheen' | 'weg' | 'vervalt';

export interface PreviewEntry {
  name: string;
  type: SessionType;
  change?: PreviewChange;
  // For a move: the other end (where it came from, or where it goes).
  otherDate?: string;
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

export interface PreviewMove {
  name: string;
  action: 'move' | 'add' | 'remove';
  from?: string;
  to?: string;
}

export interface ProposalPreviewData {
  moves: PreviewMove[];
  weeks: PreviewWeek[];
}

const MAX_WEEKS = 2;

export function previewProposal(items: PlanChangeItem[], sessions: PlannedSession[], templates: SessionTemplate[]): ProposalPreviewData {
  const empty = { moves: [], weeks: [] };
  const real = items.filter((i) => i.action !== 'keep' && i.action !== 'replace');
  if (real.length === 0) return empty;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const info = (s: PlannedSession) => ({ name: byId.get(s.templateId)?.name ?? 'Training', type: byId.get(s.templateId)?.type ?? ('cardio' as SessionType) });
  const before = new Map(sessions.map((s) => [s.id, s]));
  let n = 0;
  const { sessions: after, unsupported } = applyPlanChangeItems(real, sessions, () => `preview-${n++}`);
  if (unsupported.length > 0) return empty;

  const moves: PreviewMove[] = [];
  const added = new Set<string>();
  const moved = new Map<string, { from: string; to: string }>();
  const gone: PlannedSession[] = [];
  for (const s of after) {
    const was = before.get(s.id);
    if (!was) {
      added.add(s.id);
      moves.push({ name: info(s).name, action: 'add', to: s.scheduledDate });
    } else if (was.status !== 'skipped' && s.status === 'skipped') {
      gone.push(was);
      moves.push({ name: info(was).name, action: 'remove', from: was.scheduledDate });
    } else if (was.scheduledDate !== s.scheduledDate) {
      moved.set(s.id, { from: was.scheduledDate, to: s.scheduledDate });
      moves.push({ name: info(s).name, action: 'move', from: was.scheduledDate, to: s.scheduledDate });
    }
  }
  // Moves first, then what goes, then what comes; each in date order.
  const order = { move: 0, remove: 1, add: 2 };
  moves.sort((a, b) => order[a.action] - order[b.action] || (a.from ?? a.to ?? '').localeCompare(b.from ?? b.to ?? ''));

  const weeks = new Set<string>();
  for (const id of added) weeks.add(mondayOfWeek(after.find((s) => s.id === id)!.scheduledDate));
  for (const m of moved.values()) { weeks.add(mondayOfWeek(m.to)); weeks.add(mondayOfWeek(m.from)); }
  for (const s of gone) weeks.add(mondayOfWeek(s.scheduledDate));

  return {
    moves,
    weeks: [...weeks].sort().slice(0, MAX_WEEKS).map((weekStart) => ({
      weekStart,
      days: weekDates(weekStart).map((date) => {
        const entries: PreviewEntry[] = [];
        for (const s of after) {
          if (s.scheduledDate !== date || s.status === 'skipped') continue;
          const m = moved.get(s.id);
          entries.push({ ...info(s), change: added.has(s.id) ? 'nieuw' : m ? 'hierheen' : undefined, otherDate: m?.from });
        }
        for (const s of after) {
          const m = moved.get(s.id);
          if (m && m.from === date) entries.push({ ...info(s), change: 'weg', otherDate: m.to });
        }
        for (const s of gone) if (s.scheduledDate === date) entries.push({ ...info(s), change: 'vervalt' });
        return { date, entries, changed: entries.some((e) => e.change) };
      }),
    })),
  };
}
