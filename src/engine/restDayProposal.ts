// ASCEND: changing your rest day is a proposal with Akkoord, never a silent
// change of the planning (Doorloop, punt 5). The new rest day gives every
// session the system planned the day its place in the week has in the new
// spread (relayoutForRestDay, the same step the sync used to run on its own),
// then the rest of the planning run (engine/planPass.ts) with the new rest day.
// What differs from the stored plan becomes the items of a PlanChangeProposal,
// so the proposal sheet shows the real change and its count, this week
// included, and nothing changes before Akkoord.
//
// The sessions keep being the system's own: the items put them where the
// system plans them (restore, no lock and no fixed length), so a later week
// check may still move them. What you moved or skipped yourself, what an
// accepted proposal fixed, a tocht's sessions, logged sessions and past days
// stay where they are.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, isoWeekday, mondayOfWeek, weekdayLongNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { patternSlotOf } from './programLayout';
import { planPass, type PlanPassContext } from './planPass';

const SOURCE = ['engine/restDayProposal.ts'];

export interface RelayoutInput {
  today: string;
  // The main goal's day: nothing is laid out on or after it.
  anchor?: string;
  logged: Set<string | undefined>;
  // The weekday of each pattern slot for the new rest day (engine/planPass.ts#patternDays).
  slotDays: Map<string, number>;
}

// Every open session the system planned on the day its slot has for the new
// rest day, within its own week. Only the rows that change are returned.
export function relayoutForRestDay(sessions: PlannedSession[], input: RelayoutInput): PlannedSession[] {
  const out: PlannedSession[] = [];
  for (const s of sessions) {
    if (s.scheduledDate < input.today || input.logged.has(s.id) || s.status === 'moved' || s.lock || s.leave) continue;
    const to = input.slotDays.get(patternSlotOf(s.templateId));
    if (!to || isoWeekday(s.scheduledDate) === to) continue;
    const date = addDays(mondayOfWeek(s.scheduledDate), to - 1);
    if (date < input.today || (input.anchor && date >= input.anchor)) continue;
    // A leg swap of the race block starts over: no marker, and the full length again.
    const { raceBlock: mark, ...rest } = s;
    const fresh: PlannedSession = { ...rest, scheduledDate: date, weekStartDate: mondayOfWeek(date) };
    if (mark?.short) delete fresh.plannedMinutes;
    out.push(fresh);
  }
  return out;
}

export interface RestDayPlanInput {
  restDay: number;
  sessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
  anchor?: string;
  // The planning run with the new rest day (its slotDays are used for the layout).
  context: PlanPassContext;
}

export interface RestDayPlan {
  restDay: number;
  proposal: PlanChangeProposal;
  // How many of the changes fall in this week and the next (the rest are later weeks).
  near: number;
}

export function planRestDayChange(input: RestDayPlanInput): RestDayPlan {
  const { restDay, sessions, logs, today, anchor, context } = input;
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const relaid = new Map(relayoutForRestDay(sessions, { today, anchor, logged, slotDays: context.slotDays ?? new Map() }).map((s) => [s.id, s]));
  const start = sessions.map((s) => relaid.get(s.id) ?? s);
  let drafts = 0;
  const result = planPass(start, { ...context, newId: () => `restday-draft-${++drafts}` });
  const after = new Map(result.sessions.map((s) => [s.id, s]));
  const stored = new Set(sessions.map((s) => s.id));
  const open = (s: PlannedSession) => s.scheduledDate >= today && !logged.has(s.id);
  const day = (iso: string) => `${weekdayLongNL(iso)} ${Number(iso.slice(8, 10))}`;
  const items: PlanChangeItem[] = [];

  for (const s of sessions) {
    if (!open(s)) continue;
    const a = after.get(s.id);
    if (s.status === 'skipped') {
      if (a && a.status !== 'skipped') items.push({ plannedSessionId: s.id, action: 'add', newSessionDraft: { templateId: a.templateId, scheduledDate: a.scheduledDate, weekStartDate: mondayOfWeek(a.scheduledDate) }, toDate: a.scheduledDate, reason: 'Past weer in de week met je nieuwe rustdag.', generatedBy: SOURCE });
      continue;
    }
    if (!a || a.status === 'skipped') {
      items.push({ plannedSessionId: s.id, action: 'remove', fromDate: s.scheduledDate, reason: 'Past niet meer in de week met je nieuwe rustdag.', generatedBy: SOURCE });
      continue;
    }
    if (a.scheduledDate === s.scheduledDate && a.plannedMinutes === s.plannedMinutes && a.templateId === s.templateId) continue;
    items.push({
      plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: a.scheduledDate,
      // Where the system plans it: not fixed in place, its own length only when the run gives one.
      restore: true, ...(a.plannedMinutes !== undefined ? { plannedMinutes: a.plannedMinutes } : {}),
      reason: a.scheduledDate !== s.scheduledDate ? `Van ${day(s.scheduledDate)} naar ${day(a.scheduledDate)}: je nieuwe rustdag.` : 'Andere lengte in de week met je nieuwe rustdag.',
      generatedBy: SOURCE,
    });
  }
  for (const a of result.sessions) {
    if (stored.has(a.id) || a.status === 'skipped' || a.scheduledDate < today) continue;
    items.push({ action: 'add', newSessionDraft: { templateId: a.templateId, scheduledDate: a.scheduledDate, weekStartDate: mondayOfWeek(a.scheduledDate) }, toDate: a.scheduledDate, reason: 'Nieuw in de week met je nieuwe rustdag.', generatedBy: SOURCE });
  }

  const nearEnd = addDays(mondayOfWeek(today), 13);
  const near = items.filter((i) => (i.fromDate ?? i.toDate ?? '') <= nearEnd).length;
  const name = weekdayLongNL(addDays('2026-01-05', restDay - 1));
  const proposal: PlanChangeProposal = {
    id: makeId('planchange'),
    trigger: 'availability_changed',
    issue: `Rustdag naar ${name}`,
    changes: items,
    alternatives: [],
    consequences: items.length === 0
      ? 'Je planning hoefde niet te veranderen.'
      : `${items.length === 1 ? 'Eén training schuift' : `${items.length} trainingen schuiven`} naar de dag die ze in de week met je nieuwe rustdag hebben, met genoeg afstand tussen zware dagen.`,
    explanation: 'Een andere rustdag verandert je planning nooit ongemerkt. ASCEND laat zien wat er verschuift, ook deze week, en past het pas toe na jouw akkoord. Wat je zelf verplaatste of al afvinkte blijft staan.',
    createdAt: new Date().toISOString(),
  };
  return { restDay, proposal, near };
}
