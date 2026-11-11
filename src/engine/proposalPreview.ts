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
  // 'length': dezelfde dag en training, een andere lengte (`minutes`; zonder: de gewone lengte).
  // 'mark': dezelfde dag en training, die nu wel (`leaveOn`) of niet meer bij een vakantie of tocht hoort.
  action: 'move' | 'add' | 'remove' | 'change' | 'reset' | 'length' | 'mark';
  from?: string;
  to?: string;
  // For 'change': the training it becomes.
  newName?: string;
  // Bij een nieuwe rij (`isNew`) staat in `minutes` hoe lang de training duurt, voor de regel in het voorstel.
  // De rij van deze regel; bij een nieuwe rij het id dat het voorbeeld hem gaf.
  sessionId?: string;
  // Een rij die er nog niet was.
  isNew?: true;
  minutes?: number;
  leaveOn?: boolean;
}

export interface ProposalPreviewData {
  moves: PreviewMove[];
  weeks: PreviewWeek[];
  // Rijen die zichtbaar veranderen (dag, training, wel of niet gepland, lengte, merkteken, weg of nieuw),
  // los van de regels bepaald: sheetAnswer kijkt of elk ervan een regel heeft.
  changedIds?: string[];
  // Het voorstel kon niet worden toegepast (een item dat niet kan): niets te tonen.
  failed?: true;
}

// Ziet de gebruiker verschil aan deze rij? Een slot telt niet; een overgeslagen rij die overgeslagen blijft ook niet.
export function visiblyChanged(was: PlannedSession | undefined, now: PlannedSession | undefined): boolean {
  if (!was || !now) return (!!was && was.status !== 'skipped') || (!!now && now.status !== 'skipped');
  if ((was.status === 'skipped') !== (now.status === 'skipped')) return true;
  if (now.status === 'skipped') return false;
  return was.scheduledDate !== now.scheduledDate || was.templateId !== now.templateId || was.plannedMinutes !== now.plannedMinutes
    || JSON.stringify(was.leave ?? null) !== JSON.stringify(now.leave ?? null);
}

const MAX_WEEKS = 2;

// Verplaatsingen eerst, dan wat anders wordt, dan wat vervalt, dan wat erbij komt; elk op datum.
export const MOVE_ORDER: Record<PreviewMove['action'], number> = { move: 0, change: 1, reset: 1, length: 1, mark: 1, remove: 2, add: 3 };

// `pass`: the rest of the planning run (engine/planPass.ts) over the week
// the proposal gives, so what follows from it shows too: a leg day the race
// block shifts, something the week check puts right. Applied the way Akkoord
// applies it, with what the proposal shows fixed in place.
// `leave`: the periods after the proposal, so the days show as holiday, trek
// or free days.
export function previewProposal(items: PlanChangeItem[], sessions: PlannedSession[], templates: SessionTemplate[], pass?: (sessions: PlannedSession[]) => PlannedSession[], leave?: LeavePeriod[]): ProposalPreviewData {
  const empty = { moves: [], weeks: [] };
  // Een keep die alleen het merkteken van een periode weghaalt, verandert de rij wel.
  const real = items.filter((i) => (i.action !== 'keep' || i.leave === null) && i.action !== 'replace');
  if (real.length === 0) return empty;
  let n = 0;
  const applied = applyPlanChangeItems(items.filter((i) => i.action !== 'replace'), sessions, () => `preview-${n++}`, { by: 'proposal', at: 'preview' });
  if (applied.unsupported.length > 0) return { ...empty, failed: true };
  return previewBetween(sessions, pass ? pass(applied.sessions) : applied.sessions, templates, leave);
}

// Het verschil tussen het plan nu (`sessions`) en zoals het wordt (`after`), dag voor dag. `alsoWeeks`: weken
// die er ook in horen (een voorstel met een eigen lijst, zoals Week opnieuw plannen).
export function previewBetween(sessions: PlannedSession[], after: PlannedSession[], templates: SessionTemplate[], leave?: LeavePeriod[], alsoWeeks: string[] = []): ProposalPreviewData {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const info = (s: PlannedSession) => ({ name: byId.get(s.templateId)?.name ?? 'Training', type: byId.get(s.templateId)?.type ?? ('cardio' as SessionType), templateId: s.templateId, plannedMinutes: s.plannedMinutes });
  // De lengte van een nieuwe rij, alleen als die vaststaat: een eigen lengte op de rij, of een sjabloon zonder
  // weekopbouw. Bij een weekopbouw hangt de lengte van de week af en zegt het voorstel liever niets dan iets dat niet klopt.
  const newMinutes = (s: PlannedSession): number | undefined => {
    const t = byId.get(s.templateId);
    return s.plannedMinutes ?? (t && !t.weeklyProgression?.length ? t.durationVariants.full : undefined);
  };
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
    moves.push({ name: info(s).name, action: 'remove', from: s.scheduledDate, sessionId: s.id });
  }
  const other = new Map<string, PlannedSession>();
  for (const s of after) {
    const was = before.get(s.id);
    if (!was) {
      if (s.status === 'skipped') continue;
      added.add(s.id);
      moves.push({ name: info(s).name, action: 'add', to: s.scheduledDate, sessionId: s.id, isNew: true, minutes: newMinutes(s) });
    } else if (was.status === 'skipped' && s.status !== 'skipped') {
      // A session that was let go and comes back on the plan.
      added.add(s.id);
      moves.push({ name: info(s).name, action: 'add', to: s.scheduledDate, sessionId: s.id });
    } else if (was.status !== 'skipped' && s.status === 'skipped') {
      gone.push(was);
      moves.push({ name: info(was).name, action: 'remove', from: was.scheduledDate, sessionId: s.id });
    } else if (s.status === 'skipped') {
      continue;
    } else if (was.scheduledDate !== s.scheduledDate) {
      moved.set(s.id, { from: was.scheduledDate, to: s.scheduledDate });
      moves.push({ name: info(s).name, action: 'move', from: was.scheduledDate, to: s.scheduledDate, sessionId: s.id });
    } else if (was.templateId !== s.templateId) {
      changed.set(s.id, info(was).name);
      moves.push({ name: info(was).name, action: 'change', to: s.scheduledDate, newName: info(s).name, sessionId: s.id });
    } else if (was.plannedMinutes !== s.plannedMinutes) {
      other.set(s.id, s);
      moves.push({ name: info(s).name, action: 'length', to: s.scheduledDate, sessionId: s.id, ...(s.plannedMinutes !== undefined ? { minutes: s.plannedMinutes } : {}) });
    } else if (JSON.stringify(was.leave ?? null) !== JSON.stringify(s.leave ?? null)) {
      other.set(s.id, s);
      moves.push({ name: info(s).name, action: 'mark', to: s.scheduledDate, sessionId: s.id, leaveOn: !!s.leave });
    }
  }
  // Moves first, then what changes, then what goes, then what comes; each in date order.
  moves.sort((a, b) => MOVE_ORDER[a.action] - MOVE_ORDER[b.action] || (a.from ?? a.to ?? '').localeCompare(b.from ?? b.to ?? ''));

  const weeks = new Set<string>(alsoWeeks);
  for (const s of other.values()) weeks.add(mondayOfWeek(s.scheduledDate));
  for (const id of added) weeks.add(mondayOfWeek(after.find((s) => s.id === id)!.scheduledDate));
  for (const m of moved.values()) { weeks.add(mondayOfWeek(m.to)); weeks.add(mondayOfWeek(m.from)); }
  for (const s of gone) weeks.add(mondayOfWeek(s.scheduledDate));
  for (const id of changed.keys()) weeks.add(mondayOfWeek(after.find((s) => s.id === id)!.scheduledDate));

  const afterById = new Map(after.map((s) => [s.id, s]));
  const changedIds = [...new Set([...sessions.map((s) => s.id), ...after.map((s) => s.id)])].filter((id) => visiblyChanged(before.get(id), afterById.get(id)));
  return {
    moves,
    changedIds,
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

export function sheetAnswer(o: { answerless?: boolean; items: readonly PlanChangeItem[]; data: Pick<ProposalPreviewData, 'moves' | 'changedIds' | 'failed'>; extraLines: number }): SheetAnswer {
  if (o.answerless) return { showEmpty: true, canAccept: false, unshown: false };
  // Echte items: wat een rij van het plan verandert. Een voorschrift (replace, reduce) en "blijft staan" (keep) niet.
  const real = o.items.filter((i) => i.action !== 'keep' && i.action !== 'replace' && i.action !== 'reduce');
  const listed = o.data.moves.length + o.extraLines;
  const unshown = { showEmpty: false, canAccept: false, unshown: true };
  if (real.length > 0 && (o.data.failed || listed === 0)) return unshown;
  // Elke rij die zichtbaar verandert heeft een regel, en elk echt item dat zijn rij zichtbaar verandert ook;
  // een item voor een nieuwe rij telt als een regel "erbij".
  const lineIds = new Set(o.data.moves.map((m) => m.sessionId).filter(Boolean));
  const changed = new Set(o.data.changedIds ?? []);
  if ([...changed].some((id) => !lineIds.has(id))) return unshown;
  if (real.some((i) => i.plannedSessionId && changed.has(i.plannedSessionId) && !lineIds.has(i.plannedSessionId))) return unshown;
  const newAdds = real.filter((i) => i.action === 'add' && !i.plannedSessionId).length;
  if (newAdds > o.data.moves.filter((m) => m.isNew).length) return unshown;
  return { showEmpty: real.length === 0 && listed === 0, canAccept: true, unshown: false };
}
