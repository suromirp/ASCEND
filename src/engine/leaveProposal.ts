// ASCEND: adding or removing a period of free days, a holiday or a trek is
// a proposal with Akkoord, never a silent change of the planning. This turns
// the planning run (engine/planPass.ts, with the period in it) into the
// items of a PlanChangeProposal: what moves, what is let go, what is added.
// The proposal sheet previews them with the same planning run, so what it
// shows is what you get (engine/proposalPreview.ts), and a second run after
// Akkoord changes nothing.
//
// Adding: run the planning with the period, compare with the stored plan.
// Removing: first put back what the period moved, let go or placed (the
// marks on the sessions, models/leave.ts), then run the planning without it.
//
// History is never touched: only open sessions from today on are compared. A
// session you locked yourself stays where it is, also on a holiday day: it
// is reported in the notes, not moved. A test or race is never moved here.
//
// Pure: no React, no IndexedDB.

import type { LeavePeriod, PlannedLeaveMark } from '../models/leave';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import { makeId } from '../utils/id';
import { LEAVE_KIND_LABEL, LEAVE_KIND_SHORT, dayCount, describePeriodCompact, describePeriodDates, leaveLabelOn, sortPeriods } from './leave';
import { trekLightDaysBefore } from './trekTaper';
import { planPass, type PlanPassContext } from './planPass';
import type { Finding } from './weekValidator';
import { idIsTestOrRace } from './templateRoles';

const SOURCE = ['engine/leaveProposal.ts'];
const AFTER_DAYS = 14;

export interface LeavePlanInput {
  mode: 'add' | 'remove';
  // The period to add (not stored yet) or to remove (stored).
  period: LeavePeriod;
  // The periods as stored now.
  existing: LeavePeriod[];
  // Changing a stored period (a tocht you move or change): the period as it
  // is stored now. What it moved, let go or placed is put back first, then the
  // planning runs with the new period, so no stray walk is left on the old days.
  replaces?: LeavePeriod;
  sessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
  // The planning run for a set of periods: its context (engine/planPass.ts).
  context: (periods: LeavePeriod[]) => PlanPassContext;
}

export interface LeavePlan {
  mode: 'add' | 'remove';
  period: LeavePeriod;
  replaces?: LeavePeriod;
  periodsAfter: LeavePeriod[];
  proposal: PlanChangeProposal;
  // Plain sentences about what stays as it is: yours, a test or a race.
  notes: string[];
}

const dayText = (iso: string) => describePeriodDates({ startDate: iso, endDate: iso });

export function planLeaveChange(input: LeavePlanInput): LeavePlan {
  const { mode, period, existing, sessions, logs, templates, today, replaces } = input;
  const periodsAfter = sortPeriods(mode === 'add' ? [...existing.filter((p) => p.id !== period.id), period] : existing.filter((p) => p.id !== period.id));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const byId = new Map(templates.map((t) => [t.id, t]));
  const nameOf = (templateId: string) => byId.get(templateId)?.name ?? 'Training';
  const windowEnd = addDays(replaces && replaces.endDate > period.endDate ? replaces.endDate : period.endDate, AFTER_DAYS);

  // What the planning looks like without the period's earlier work.
  const start = mode === 'remove' ? putBack(sessions, period.id, today, logged, byId) : replaces ? putBack(sessions, replaces.id, today, logged, byId) : sessions;
  const base = new Map(start.map((s) => [s.id, s]));
  // New sessions get ids of their own here, so they can never be mistaken for a stored one.
  let drafts = 0;
  const result = planPass(start, { ...input.context(periodsAfter), newId: () => `leave-draft-${++drafts}` });

  const reasonFor = (session: PlannedSession | undefined, date: string, what: 'remove' | 'move' | 'add', back = false): string => {
    if (back) return what === 'remove' ? `Hoorde bij de tocht zoals die was: ${dayText(date)} vervalt.` : `Terug naar ${dayText(date)}, de tocht ligt nu anders.`;
    if (mode === 'remove') return what === 'remove' ? `Hoorde bij ${LEAVE_KIND_LABEL[period.kind].toLowerCase()}: ${dayText(date)} vervalt.` : `Terug naar ${dayText(date)}, je periode is weg.`;
    const label = leaveLabelOn(date, periodsAfter);
    if (what === 'add') return label?.kind === 'trek' ? `Tochtdag ${dayText(date)}: een wandeling met je rugzak.` : `Vrije dag ${dayText(date)}: er past een wandeling.`;
    if (label?.kind === 'off') return `Vakantie: geen training op ${dayText(date)}.`;
    if (label?.kind === 'trek') return `Tocht: op ${dayText(date)} alleen de wandeling.`;
    if (label?.kind === 'light') return `${label.title}: ${dayText(date)} blijft licht.`;
    return session ? `${nameOf(session.templateId)} past niet meer op ${dayText(date)} door je periode.` : 'Past bij je periode.';
  };

  // A repair of the week check with a reason of its own (a leg day next to the tocht).
  const ownReason = (id: string, removed = false) => result.repairs.filter((r) => r.sessionId === id && !!r.removed === removed && r.reason).pop()?.reason;

  // A change of length alone counts when it belongs to this tocht: the short
  // version it made (rest after a tocht), or the full length it gives back.
  const minutesChanged = (s: PlannedSession, a: PlannedSession) =>
    a.plannedMinutes !== s.plannedMinutes && (!!ownReason(s.id) || s.leave?.periodId === period.id || s.leave?.periodId === replaces?.id);

  const items: PlanChangeItem[] = [];
  const after = new Map(result.sessions.map((s) => [s.id, s]));
  const stored = new Map(sessions.map((s) => [s.id, s]));
  const inWindow = (date: string) => date >= today && date <= windowEnd;
  const clear = mode === 'remove';
  // The mark a changed session gets. Removing: none (it is put back). Changing
  // a tocht: none when it is back where it naturally was, else a mark of the
  // new period relative to where it stood after putting back.
  const markOf = (s: PlannedSession, a: PlannedSession | undefined, role: 'moved' | 'dropped'): PlannedLeaveMark | null => {
    if (clear) return null;
    // The tocht shortened a leg day (rest after a tocht): the mark says so.
    const shortened = role === 'moved' && a?.leave?.shortened ? { shortened: true as const } : {};
    if (!replaces) return { periodId: period.id, role, from: s.scheduledDate, ...shortened };
    const b = base.get(s.id);
    if (!b) return null;
    if (s.leave?.periodId === replaces.id && a && a.status !== 'skipped' && a.scheduledDate === b.scheduledDate && a.plannedMinutes === b.plannedMinutes && b.status !== 'skipped') return null;
    return { periodId: period.id, role, from: b.scheduledDate, ...shortened };
  };
  const isBack = (s: PlannedSession, a: PlannedSession | undefined) => !!replaces && s.leave?.periodId === replaces.id && markOf(s, a, 'moved') === null;

  for (const s of sessions) {
    if (!inWindow(s.scheduledDate) || logged.has(s.id)) continue;
    const a = after.get(s.id);
    if (s.status === 'skipped') {
      // Let go because of the period, and now back on the plan.
      if (a && a.status !== 'skipped' && inWindow(a.scheduledDate)) {
        const back = !!replaces && base.get(s.id)?.status !== 'skipped';
        // The row itself comes back (not a second one next to the skipped one),
        // and it loses the mark of the period that let it go.
        items.push({ plannedSessionId: s.id, action: 'add', newSessionDraft: { templateId: a.templateId, scheduledDate: a.scheduledDate, weekStartDate: mondayOfWeek(a.scheduledDate) }, toDate: a.scheduledDate, reason: reasonFor(a, a.scheduledDate, 'add', back), generatedBy: SOURCE, leave: null });
      }
      continue;
    }
    if (!a || a.status === 'skipped') {
      // A leg day the week check let go next to the tocht says why in its own words.
      const own = ownReason(s.id, true);
      // A tochtdag this period placed itself goes with it: off the plan, not a
      // skipped row next to the new days (Doorloop, punt 1).
      const ownPlaced = s.leave?.role === 'placed' && (s.leave.periodId === period.id || s.leave.periodId === replaces?.id) && !base.has(s.id);
      if (ownPlaced) {
        items.push({ plannedSessionId: s.id, action: 'remove', discard: true, fromDate: s.scheduledDate, reason: own ?? reasonFor(s, s.scheduledDate, 'remove', !!replaces), generatedBy: SOURCE });
        continue;
      }
      items.push({ plannedSessionId: s.id, action: 'remove', fromDate: s.scheduledDate, reason: own ?? reasonFor(s, s.scheduledDate, 'remove', !!replaces && !base.has(s.id)), generatedBy: SOURCE, leave: markOf(s, a, 'dropped') });
    } else if (a.scheduledDate !== s.scheduledDate || minutesChanged(s, a)) {
      const mark = markOf(s, a, 'moved');
      // One rule for putting back: a session of this tocht that is back where it
      // stood by itself is not fixed in place and has no fixed length. Its length
      // is left to the phase (an own length of the stored plan is kept).
      const restore = mark === null && (s.leave?.periodId === period.id || s.leave?.periodId === replaces?.id);
      items.push({
        plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: a.scheduledDate,
        ...(restore ? (a.plannedMinutes !== undefined ? { plannedMinutes: a.plannedMinutes } : {}) : a.plannedMinutes !== undefined && a.plannedMinutes !== s.plannedMinutes ? { plannedMinutes: a.plannedMinutes } : a.plannedMinutes === undefined && s.plannedMinutes !== undefined && minutesChanged(s, a) ? { plannedMinutes: byId.get(a.templateId)?.durationVariants.full } : {}),
        ...(restore ? { restore: true } : {}),
        reason: ownReason(s.id) ?? reasonFor(s, s.scheduledDate, 'move', isBack(s, a)), generatedBy: SOURCE,
        leave: mark,
      });
    }
  }
  for (const a of result.sessions) {
    if (stored.has(a.id) || !inWindow(a.scheduledDate) || a.status === 'skipped') continue;
    const mark: PlannedLeaveMark | null | undefined = clear ? null : a.leave;
    items.push({ action: 'add', newSessionDraft: { templateId: a.templateId, scheduledDate: a.scheduledDate, weekStartDate: mondayOfWeek(a.scheduledDate) }, toDate: a.scheduledDate, reason: reasonFor(a, a.scheduledDate, 'add'), generatedBy: SOURCE, ...(mark !== undefined ? { leave: mark } : {}) });
  }

  // De titel staat ook in de meldingsbalk, dus kort: het belangrijkste woord eerst, dan de datum.
  const label = LEAVE_KIND_SHORT[period.kind];
  const when = describePeriodCompact(period);
  const title = period.trek?.name ? `Tocht ${period.trek.name}` : label;
  const proposal: PlanChangeProposal = {
    id: makeId('planchange'),
    trigger: mode === 'add' ? 'leave_added' : 'leave_removed',
    leavePeriodId: period.id,
    issue: mode === 'add' ? `${replaces ? `${title} gewijzigd` : title}, ${when}` : `${title} verwijderd, ${when}`,
    changes: items,
    alternatives: [],
    consequences: explain(mode, period, items.length, !!replaces),
    explanation: 'Een vrije periode verandert je planning nooit ongemerkt. ASCEND laat zien wat er verschuift, vervalt of erbij komt, en past het pas toe na jouw akkoord. Wat je zelf vastzette, een geplande test of wedstrijd en alles wat al geweest is blijven zoals het is.',
    createdAt: new Date().toISOString(),
  };
  const notes = notesFor(result.remaining, inWindow, mode);
  // A test or race right before or inside a trek stays where it is: say so.
  if (mode === 'add' && period.kind === 'trek') {
    for (const s of result.sessions) {
      if (s.status === 'skipped' || !idIsTestOrRace(s.templateId, byId) || s.scheduledDate < addDays(period.startDate, -trekLightDaysBefore(dayCount(period), period.trek?.importance)) || s.scheduledDate > period.endDate) continue;
      notes.push(`${nameOf(s.templateId)} op ${dayText(s.scheduledDate)} valt bij je tocht. Die verplaatst ASCEND niet zomaar. Kies zelf een andere dag als je fris wilt vertrekken.`);
    }
  }
  return { mode, period, ...(replaces ? { replaces } : {}), periodsAfter, proposal, notes: [...new Set(notes)] };
}

function explain(mode: 'add' | 'remove', period: LeavePeriod, count: number, changed = false): string {
  if (count === 0) {
    if (changed) return 'De tocht is bijgewerkt en ASCEND houdt er rekening mee.';
    return mode === 'add'
      ? 'De periode is bewaard en ASCEND houdt er rekening mee.'
      : 'De periode is verwijderd.';
  }
  if (mode === 'remove') return 'Wat de periode verschoof of liet vervallen, staat weer op zijn plek.';
  if (period.kind === 'no_training') return 'Op je vakantiedagen staat geen training meer. Wat er stond, schuift naar een andere dag van die week of vervalt, binnen de gewone regels voor rust tussen zware dagen.';
  if (period.kind === 'trek' && period.trek?.importance === 'goal') return 'Elke tochtdag is een wandeldag met je rugzak. De dagen ervoor blijven licht, zodat je fris vertrekt, en de dag erna ook. Zware beendagen houden de gewone rust tot en na de tocht.';
  if (period.kind === 'trek') return 'Elke tochtdag is een wandeldag met je rugzak. De dag ervoor en erna blijft licht, en zware beendagen houden de gewone rust tot en na de tocht.';
  return 'Op je vrije dag past een wandeling, binnen de gewone regels voor rust tussen zware dagen.';
}

// What the planning could not or may not change, in plain words.
function notesFor(remaining: Finding[], inWindow: (date: string) => boolean, mode: 'add' | 'remove'): string[] {
  if (mode === 'remove') return [];
  const lines: string[] = [];
  for (const f of remaining) {
    if ((f.rule !== 'LEAVE-OFF' && f.rule !== 'LEAVE-LIGHT' && f.rule !== 'LEG-SPACING') || !inWindow(f.date)) continue;
    if (f.level === 1) lines.push(`${f.message} Die heb je zelf vastgezet, dus die blijft staan.`);
    else if (f.level === 2) lines.push(`${f.message} Een test of wedstrijd verplaatst ASCEND niet zomaar. Kies zelf een andere dag.`);
    else lines.push(f.message);
  }
  return [...new Set(lines)];
}

// Removing a period: what it moved is moved back, what it let go of comes
// back, what it placed goes. Never what is logged or past, and never what you
// moved yourself after it.
function putBack(sessions: PlannedSession[], periodId: string, today: string, logged: Set<string | undefined>, byId: Map<string, SessionTemplate>): PlannedSession[] {
  const out: PlannedSession[] = [];
  for (const s of sessions) {
    const mark = s.leave;
    if (!mark || mark.periodId !== periodId || logged.has(s.id) || s.scheduledDate < today) { out.push(s); continue; }
    const byYou = s.lock?.by === 'user';
    if (mark.role === 'placed') {
      // Skipped by you: nothing to take out. Otherwise it goes with the period.
      if (s.status === 'skipped') out.push(s);
      continue;
    }
    if (byYou || !mark.from || mark.from < today) { out.push(s); continue; }
    const back: PlannedSession = { ...s, status: 'planned', scheduledDate: mark.from, weekStartDate: mondayOfWeek(mark.from) };
    delete back.lock;
    delete back.leave;
    delete back.movedFromDate;
    // A heavy leg day the tocht made short (rest after a tocht) is full again.
    const t = byId.get(s.templateId);
    // Only when the mark says the tocht shortened it, not when it was short for another reason.
    if (mark.role === 'moved' && mark.shortened && t?.type === 'strength' && back.plannedMinutes !== undefined && back.plannedMinutes === t.durationVariants.short) delete back.plannedMinutes;
    out.push(back);
  }
  return out;
}
