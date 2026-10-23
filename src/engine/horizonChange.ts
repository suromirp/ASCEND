// ASCEND: een andere doeldatum, een gearchiveerd doel of een instelling die de
// planningsronde anders laat lopen (De lange zondag, faselengtes, Ambitie, een
// sport, Rust na een bergtocht) verandert de planning nooit stil (Warden Logica
// punten 1 en 2, docs/beslissingen/2026-10-23-planning-nooit-stil.md).
//
// De planningsronde rekent de verandering eerst in het geheugen uit
// (storage/database.ts#previewProgramHorizon). Dit zet het verschil tussen de
// planning zoals hij is en zoals hij na de ronde zou zijn om in de regels van
// een voorstel: wat verschuift, wat een andere training wordt, wat vervalt en
// wat erbij komt. Het voorstelblad (ProposalSheet) laat ze zien; na Akkoord
// draait dezelfde ronde echt, zodat je krijgt wat je zag.
//
// Alleen open trainingen (vandaag of later, niet gelogd) tellen; historie
// verandert nooit. Wat jij zelf vastzette laat de ronde staan (lockLevel 1):
// staat dat na de nieuwe doeldag, dan noemt het voorstel het. De regels zetten
// geen slot (restore): het blijft de planning van het systeem.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { formatDateNL, mondayOfWeek, weekdayShortNL } from '../utils/dates';
import { lockLevel } from './weekValidator';

const SOURCE = ['engine/horizonChange.ts'];

export interface HorizonDiffInput {
  // The plan as it is now, and as it would be after the planning run.
  before: PlannedSession[];
  after: PlannedSession[];
  logs: Pick<SessionLog, 'plannedSessionId'>[];
  templates: SessionTemplate[];
  today: string;
  // The day the plan ends after the change (the main goal's day).
  goalDay?: string;
  // Why, in plain words, for a change that is not about the goal day.
  reason: string;
}

export interface HorizonDiff {
  items: PlanChangeItem[];
  // What stays as it is although it falls on or after the goal day: yours.
  notes: string[];
  counts: { moved: number; changed: number; added: number; removed: number };
  // One sentence for the proposal.
  consequences: string;
}

const day = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;

export function diffHorizon(input: HorizonDiffInput): HorizonDiff {
  const { before, after, today, goalDay, reason } = input;
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const nameById = new Map(input.templates.map((t) => [t.id, t.name]));
  const nameOf = (id: string) => nameById.get(id) ?? 'Training';
  const afterById = new Map(after.map((s) => [s.id, s]));
  const beforeIds = new Set(before.map((s) => s.id));
  const open = (s: PlannedSession) => s.scheduledDate >= today && !logged.has(s.id);
  const pastGoal = (date: string) => !!goalDay && date >= goalDay;
  const items: PlanChangeItem[] = [];
  const counts = { moved: 0, changed: 0, added: 0, removed: 0 };

  for (const b of before) {
    if (!open(b)) continue;
    const a = afterById.get(b.id);
    if (b.status === 'skipped') {
      if (a && a.status !== 'skipped') {
        items.push({ plannedSessionId: b.id, action: 'add', restore: true, newSessionDraft: { templateId: a.templateId, scheduledDate: a.scheduledDate, weekStartDate: mondayOfWeek(a.scheduledDate) }, toDate: a.scheduledDate, reason, generatedBy: SOURCE });
        counts.added++;
      }
      continue;
    }
    if (!a || a.status === 'skipped') {
      const why = pastGoal(b.scheduledDate) ? 'Na de dag van je hoofddoel plant ASCEND niets meer.' : reason;
      // Off the plan entirely, as the planning run does it; undo puts it back.
      items.push({ plannedSessionId: b.id, action: 'remove', restore: true, ...(a ? {} : { discard: true }), fromDate: b.scheduledDate, reason: why, generatedBy: SOURCE });
      counts.removed++;
      continue;
    }
    const otherTemplate = a.templateId !== b.templateId;
    const otherDay = a.scheduledDate !== b.scheduledDate;
    const otherLength = a.plannedMinutes !== b.plannedMinutes;
    if (!otherTemplate && !otherDay && !otherLength) continue;
    items.push({
      plannedSessionId: b.id, action: 'move', fromDate: b.scheduledDate, toDate: a.scheduledDate, restore: true,
      ...(otherTemplate ? { templateId: a.templateId } : {}),
      ...(a.plannedMinutes !== undefined ? { plannedMinutes: a.plannedMinutes } : {}),
      reason: otherTemplate ? `${nameOf(b.templateId)} wordt ${nameOf(a.templateId)}. ${reason}`.trim() : reason,
      generatedBy: SOURCE,
    });
    if (otherTemplate) counts.changed++;
    else counts.moved++;
  }
  for (const a of after) {
    if (beforeIds.has(a.id) || a.status === 'skipped' || a.scheduledDate < today) continue;
    items.push({ action: 'add', restore: true, newSessionDraft: { templateId: a.templateId, scheduledDate: a.scheduledDate, weekStartDate: mondayOfWeek(a.scheduledDate) }, toDate: a.scheduledDate, reason, generatedBy: SOURCE });
    counts.added++;
  }

  const notes: string[] = [];
  for (const a of after) {
    if (!open(a) || a.status === 'skipped' || !pastGoal(a.scheduledDate) || lockLevel(a, logged, today) !== 1) continue;
    notes.push(`${nameOf(a.templateId)} op ${day(a.scheduledDate)} blijft staan, ook al valt hij na je doeldag: die zette je zelf vast. Haal hem zelf weg als hij niet meer past.`);
  }

  return { items, notes, counts, consequences: describeCounts(counts) };
}

const n = (count: number, one: string, many: string) => (count === 1 ? `1 ${one}` : `${count} ${many}`);

function describeCounts(c: HorizonDiff['counts']): string {
  const parts: string[] = [];
  if (c.removed) parts.push(n(c.removed, 'training vervalt', 'trainingen vervallen'));
  if (c.changed) parts.push(n(c.changed, 'training wordt een andere training', 'trainingen worden een andere training'));
  if (c.moved) parts.push(n(c.moved, 'training verschuift of krijgt een andere lengte', 'trainingen verschuiven of krijgen een andere lengte'));
  if (c.added) parts.push(n(c.added, 'training komt erbij', 'trainingen komen erbij'));
  if (parts.length === 0) return 'Je planning hoeft niet te veranderen.';
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}. Wat je al deed en wat je zelf vastzette blijft staan.`;
}
