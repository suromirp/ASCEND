// ASCEND — "zo ziet je week eruit" for a proposal (advice with Akkoord): the
// weeks it touches, day by day, with what changes marked, plus one line per
// change for the summary on top. Computed by applying the proposal's items
// to a copy of the plan; nothing is saved.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeItem } from '../models/planChange';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionTemplate, SessionType } from '../models/training';
import { applyPlanChangeItems } from './proposalEngine';
import { mondayOfWeek, weekDates } from '../utils/dates';
import { leaveLabelOn, type LeaveLabel } from './leave';

// 'anders': the same day, another training (a long run that becomes a mountain hike).
type PreviewChange = 'nieuw' | 'hierheen' | 'weg' | 'vervalt' | 'anders';

export interface PreviewEntry {
  name: string;
  type: SessionType;
  templateId: string;
  plannedMinutes?: number;
  change?: PreviewChange;
  // For a move: the other end (where it came from, or where it goes).
  otherDate?: string;
  // For 'anders': the training it was.
  otherName?: string;
}

interface PreviewDay {
  date: string;
  entries: PreviewEntry[];
  changed: boolean;
  // The day is part of a holiday, a trek or free days (engine/leave.ts).
  leave?: LeaveLabel;
}

interface PreviewWeek {
  weekStart: string;
  days: PreviewDay[];
}

export interface PreviewMove {
  name: string;
  // 'reset': dezelfde dag en training, maar weer zoals het plan hem maakt (zonder slot of vaste lengte).
  action: 'move' | 'add' | 'remove' | 'change' | 'reset';
  from?: string;
  to?: string;
  // For 'change': the training it becomes.
  newName?: string;
}

export interface ProposalPreviewData {
  moves: PreviewMove[];
  weeks: PreviewWeek[];
}

const MAX_WEEKS = 2;

// `pass`: the rest of the planning run (engine/planPass.ts) over the week
// the proposal gives, so what follows from it shows too: a leg day the race
// block shifts, something the week check puts right. Applied the way Akkoord
// applies it, with what the proposal shows fixed in place.
// `leave`: the periods after the proposal, so the days show as holiday, trek
// or free days.
export function previewProposal(items: PlanChangeItem[], sessions: PlannedSession[], templates: SessionTemplate[], pass?: (sessions: PlannedSession[]) => PlannedSession[], leave?: LeavePeriod[]): ProposalPreviewData {
  const empty = { moves: [], weeks: [] };
  const real = items.filter((i) => i.action !== 'keep' && i.action !== 'replace');
  if (real.length === 0) return empty;
  let n = 0;
  const applied = applyPlanChangeItems(items.filter((i) => i.action !== 'replace'), sessions, () => `preview-${n++}`, { by: 'proposal', at: 'preview' });
  if (applied.unsupported.length > 0) return empty;
  return previewBetween(sessions, pass ? pass(applied.sessions) : applied.sessions, templates, leave);
}

// Het verschil tussen het plan nu (`sessions`) en zoals het wordt (`after`), dag voor dag. `alsoWeeks`: weken
// die er ook in horen (een voorstel met een eigen lijst, zoals Week opnieuw plannen).
export function previewBetween(sessions: PlannedSession[], after: PlannedSession[], templates: SessionTemplate[], leave?: LeavePeriod[], alsoWeeks: string[] = []): ProposalPreviewData {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const info = (s: PlannedSession) => ({ name: byId.get(s.templateId)?.name ?? 'Training', type: byId.get(s.templateId)?.type ?? ('cardio' as SessionType), templateId: s.templateId, plannedMinutes: s.plannedMinutes });
  const before = new Map(sessions.map((s) => [s.id, s]));
  const afterIds = new Set(after.map((s) => s.id));

  const moves: PreviewMove[] = [];
  const added = new Set<string>();
  const moved = new Map<string, { from: string; to: string }>();
  const changed = new Map<string, string>();
  const gone: PlannedSession[] = [];
  for (const s of sessions) {
    if (afterIds.has(s.id) || s.status === 'skipped') continue;
    gone.push(s);
    moves.push({ name: info(s).name, action: 'remove', from: s.scheduledDate });
  }
  for (const s of after) {
    const was = before.get(s.id);
    if (!was) {
      added.add(s.id);
      moves.push({ name: info(s).name, action: 'add', to: s.scheduledDate });
    } else if (was.status === 'skipped' && s.status !== 'skipped') {
      // A session that was let go and comes back on the plan.
      added.add(s.id);
      moves.push({ name: info(s).name, action: 'add', to: s.scheduledDate });
    } else if (was.status !== 'skipped' && s.status === 'skipped') {
      gone.push(was);
      moves.push({ name: info(was).name, action: 'remove', from: was.scheduledDate });
    } else if (was.scheduledDate !== s.scheduledDate) {
      moved.set(s.id, { from: was.scheduledDate, to: s.scheduledDate });
      moves.push({ name: info(s).name, action: 'move', from: was.scheduledDate, to: s.scheduledDate });
    } else if (was.templateId !== s.templateId) {
      changed.set(s.id, info(was).name);
      moves.push({ name: info(was).name, action: 'change', to: s.scheduledDate, newName: info(s).name });
    }
  }
  // Moves first, then what changes, then what goes, then what comes; each in date order.
  const order = { move: 0, change: 1, reset: 1, remove: 2, add: 3 };
  moves.sort((a, b) => order[a.action] - order[b.action] || (a.from ?? a.to ?? '').localeCompare(b.from ?? b.to ?? ''));

  const weeks = new Set<string>(alsoWeeks);
  for (const id of added) weeks.add(mondayOfWeek(after.find((s) => s.id === id)!.scheduledDate));
  for (const m of moved.values()) { weeks.add(mondayOfWeek(m.to)); weeks.add(mondayOfWeek(m.from)); }
  for (const s of gone) weeks.add(mondayOfWeek(s.scheduledDate));
  for (const id of changed.keys()) weeks.add(mondayOfWeek(after.find((s) => s.id === id)!.scheduledDate));

  return {
    moves,
    weeks: [...weeks].sort().slice(0, MAX_WEEKS).map((weekStart) => ({
      weekStart,
      days: weekDates(weekStart).map((date) => {
        const entries: PreviewEntry[] = [];
        for (const s of after) {
          if (s.scheduledDate !== date || s.status === 'skipped') continue;
          const m = moved.get(s.id);
          const was = changed.get(s.id);
          entries.push({ ...info(s), change: added.has(s.id) ? 'nieuw' : m ? 'hierheen' : was ? 'anders' : undefined, otherDate: m?.from, ...(was ? { otherName: was } : {}) });
        }
        for (const s of after) {
          const m = moved.get(s.id);
          if (m && m.from === date) entries.push({ ...info(s), change: 'weg', otherDate: m.to });
        }
        for (const s of gone) if (s.scheduledDate === date) entries.push({ ...info(s), change: 'vervalt' });
        return { date, entries, changed: entries.some((e) => e.change), ...(leave?.length ? { leave: leaveLabelOn(date, leave) } : {}) };
      }),
    })),
  };
}

// Wat het blad onderaan laat zien. Nooit Akkoord naast een lege lijst terwijl het voorstel wel iets
// verandert, en nooit "er verandert niets" naast Akkoord als het voorstel wel iets doet.
// - answerless: er is niets te beslissen; alleen de lege tekst en Begrepen.
// - het voorstel heeft echte wijzigingen maar het blad kan ze niet tonen: geen Akkoord, alleen Annuleren
//   en een zin dat het niet te tonen is.
// - anders Liever niet en Akkoord; de lege tekst alleen als het voorstel zelf niets aan het plan doet
//   (een periode of instelling die bij Akkoord bewaard wordt).
export interface SheetAnswer {
  showEmpty: boolean;
  canAccept: boolean;
  unshown: boolean;
}

export function sheetAnswer(o: { answerless?: boolean; realItems: number; moves: number; extraLines: number }): SheetAnswer {
  if (o.answerless) return { showEmpty: true, canAccept: false, unshown: false };
  const listed = o.moves + o.extraLines;
  if (o.realItems > 0 && listed === 0) return { showEmpty: false, canAccept: false, unshown: true };
  return { showEmpty: o.realItems === 0 && listed === 0, canAccept: true, unshown: false };
}
