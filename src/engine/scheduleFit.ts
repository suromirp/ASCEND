// ASCEND — does the existing calendar still fit after a scheduling
// setting changed (daily time budget, "meerdere trainingen op één dag")?
// Fase 2 — production report: changing the pairing preference had no
// visible effect at all. This answers it honestly: a relaxed setting
// changes nothing that's already planned (new planning simply gets the
// extra room); a stricter one can leave days over their new limit, and
// only those overflowing sessions are moved — within their own week, via
// the same Groep C placement search every other move uses, respecting the
// leg-heavy spacing rule. Never removes anything; a session with no valid
// day left stays where it is and is reported, not silently dropped.
//
// The other direction (production feedback: "waarom schuift hij dan niet
// gelijk of geeft hij daar een optie voor?"): when a setting makes room, a
// session in this or next week that sits LATER than the day it was meant
// for (its template's own weekday, or where it was moved from) is offered
// the earliest day back toward it that now has room and keeps the 48-hour
// rule. Only ever proposed, through the same confirm sheet as any other
// change in this or next week.

import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { dayHasRoomFor, findHeavyConflict } from './scheduler';
import { committedWeekStartDates } from './planningHorizon';
import { compareRotation, interchangeKey } from './rotationOrder';
import { searchWeeklyPlacement, type PlacementRequest } from './candidatePlacement';
import { addDays, formatDateNL, weekDates, weekdayShortNL } from '../utils/dates';
import { makeId } from '../utils/id';

export interface ScheduleFitInputs {
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  sessionLogs: SessionLog[];
  program: Program | null | undefined;
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined;
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'];
  asOf: string;
  settingLabel: string; // "Meerdere trainingen op één dag", "Trainingstijd per dag"
}

export interface ScheduleFitResult {
  proposal: PlanChangeProposal;
  stuck: string[]; // template names that no longer fit anywhere in their week
}

export function computeScheduleFit(inputs: ScheduleFitInputs): ScheduleFitResult {
  const { plannedSessions, templates, sessionLogs, program, dailyTimeBudget, sameDayPairingPreference, asOf, settingLabel } = inputs;
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(sessionLogs.map((l) => l.plannedSessionId).filter(Boolean));
  const movable = (s: PlannedSession) => s.status !== 'skipped' && s.scheduledDate >= asOf && !logged.has(s.id);

  const items: PlanChangeItem[] = [];
  const stuck: string[] = [];
  const weekStarts = [...new Set(plannedSessions.filter(movable).map((s) => s.weekStartDate))].sort();

  for (const weekStart of weekStarts) {
    let week = plannedSessions.filter((s) => s.weekStartDate === weekStart && s.status !== 'skipped');
    const byDate = new Map<string, PlannedSession[]>();
    for (const s of week) byDate.set(s.scheduledDate, [...(byDate.get(s.scheduledDate) ?? []), s]);

    // Rebuild each day in its existing order; whatever no longer has room
    // under the new setting overflows.
    const overflow: PlannedSession[] = [];
    for (const [date, daySessions] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (daySessions.length < 2) continue;
      const kept: PlannedSession[] = [];
      for (const s of [...daySessions].sort((a, b) => Number(movable(a)) - Number(movable(b)) || a.order - b.order)) {
        const template = templateById.get(s.templateId);
        if (!template || kept.length === 0 || !movable(s)) { kept.push(s); continue; }
        if (dayHasRoomFor(date, template, kept, templateById, program, dailyTimeBudget, sameDayPairingPreference)) kept.push(s);
        else overflow.push(s);
      }
    }

    for (const s of overflow) {
      const template = templateById.get(s.templateId);
      if (!template) continue;
      const fixed = week.filter((w) => w.id !== s.id);
      const toPlace: PlacementRequest[] = [{ template, source: 'cascade', sessionId: s.id }];
      const provider = (t: SessionTemplate, tentative: { sessionOrDraft: string; date: string }[]) => {
        const tentativeSessions: PlannedSession[] = tentative.map((p, i) => ({ id: p.sessionOrDraft, templateId: t.id, scheduledDate: p.date, weekStartDate: weekStart, status: 'planned' as const, order: 1000 + i }));
        return weekDates(weekStart).filter(
          (d) => d >= asOf && d !== s.scheduledDate && dayHasRoomFor(d, t, [...fixed, ...tentativeSessions], templateById, program, dailyTimeBudget, sameDayPairingPreference),
        );
      };
      const result = searchWeeklyPlacement(toPlace, fixed, provider, templateById, sessionLogs, new Map());
      const newDate = result.status === 'clean' || result.status === 'compromised' ? result.bestFound.placements[0]?.date : undefined;
      if (!newDate) {
        stuck.push(template.name);
        continue;
      }
      items.push({
        plannedSessionId: s.id,
        action: 'move',
        fromDate: s.scheduledDate,
        toDate: newDate,
        reason: `Past niet meer op dezelfde dag met de nieuwe instelling "${settingLabel}".`,
        generatedBy: ['engine/scheduleFit.ts#computeScheduleFit'],
      });
      week = week.map((w) => (w.id === s.id ? { ...w, scheduledDate: newDate } : w));
    }
  }

  // ---- Room freed up: bring sessions back toward their intended day. ----
  let current = plannedSessions.map((s) => {
    const moved = items.find((i) => i.plannedSessionId === s.id);
    return moved?.toDate ? { ...s, scheduledDate: moved.toDate } : s;
  });
  const overflowIds = new Set(items.map((i) => i.plannedSessionId));
  let pulledBack = 0;
  for (const weekStart of committedWeekStartDates(asOf)) {
    const candidates = current
      .filter((s) => s.weekStartDate === weekStart && movable(s) && !overflowIds.has(s.id))
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order);
    for (const candidate of candidates) {
      const session = current.find((s) => s.id === candidate.id)!;
      const template = templateById.get(session.templateId);
      if (!template) continue;
      const defaultDate = template.defaultDayOfWeek ? addDays(weekStart, template.defaultDayOfWeek - 1) : undefined;
      const intended = [defaultDate, session.movedFromDate].filter((d): d is string => !!d && weekDates(weekStart).includes(d)).sort()[0];
      if (!intended || intended >= session.scheduledDate) continue;
      const week = current.filter((s) => s.weekStartDate === weekStart && s.status !== 'skipped' && s.id !== session.id);
      const nearby = current.filter((s) => s.status !== 'skipped' && s.id !== session.id);
      const target = weekDates(weekStart).find((d) =>
        d >= asOf && d >= intended && d < session.scheduledDate
        && dayHasRoomFor(d, template, week, templateById, program, dailyTimeBudget, sameDayPairingPreference)
        && !findHeavyConflict(session.id, template, d, nearby, templateById, sessionLogs)
        // Never jump ahead of a sibling that comes first (Bovenlichaam A before B).
        && !week.some((o) => {
          const ot = templateById.get(o.templateId);
          return ot && interchangeKey(ot) === interchangeKey(template) && compareRotation(ot, template) < 0 && o.scheduledDate >= d;
        }),
      );
      if (!target) continue;
      items.push({
        plannedSessionId: session.id,
        action: 'move',
        fromDate: session.scheduledDate,
        toDate: target,
        reason: `Er is nu ruimte op ${weekdayShortNL(target).toLowerCase()} ${formatDateNL(target)}: ${template.name} kan eerder in de week, dichter bij de dag waarvoor hij bedoeld is.`,
        generatedBy: ['engine/scheduleFit.ts#computeScheduleFit'],
      });
      current = current.map((s) => (s.id === session.id ? { ...s, scheduledDate: target } : s));
      pulledBack++;
    }
  }

  const stuckNames = [...new Set(stuck)].join(', ');
  const stuckNote = stuck.length > 0 ? ` Voor ${stuckNames} is in die week geen andere dag vrij, dus die blijft staan waar hij staat. Verplaats hem zelf als je wilt.` : '';
  return {
    stuck,
    proposal: {
      id: makeId('planchange'),
      trigger: 'availability_changed',
      issue: `Instelling gewijzigd: ${settingLabel}`,
      changes: items,
      alternatives: [],
      consequences: items.length > 0
        ? [
          items.length > pulledBack ? `Sessies die niet meer samen op een dag passen, schuiven binnen hun eigen week op.${stuckNote}` : '',
          pulledBack > 0 ? `Er is ruimte vrijgekomen: ${pulledBack === 1 ? 'een sessie kan' : `${pulledBack} sessies kunnen`} eerder in de week, dichter bij de bedoelde dag.` : '',
        ].filter(Boolean).join(' ')
        : stuck.length > 0
          ? `Nieuwe planning gebruikt de nieuwe instelling.${stuckNote}`
          : 'Je huidige planning past al binnen de nieuwe instelling. Nieuwe planning gebruikt hem vanaf nu.',
      explanation: `Gewijzigd in Instellingen: ${settingLabel}.`,
      createdAt: new Date().toISOString(),
    },
  };
}

// Switching a sport off (Settings → Training → Sporten): its future,
// not-yet-logged sessions come off the calendar — only when the user
// chooses "nu toepassen"; "alleen nieuwe planning" leaves them.
export function computeSportDisableProposal(
  isSessionOfSport: (s: PlannedSession) => boolean,
  sportLabel: string,
  plannedSessions: PlannedSession[],
  sessionLogs: SessionLog[],
  asOf: string,
): PlanChangeProposal {
  const logged = new Set(sessionLogs.map((l) => l.plannedSessionId).filter(Boolean));
  const items: PlanChangeItem[] = plannedSessions
    .filter((s) => s.status !== 'skipped' && s.scheduledDate >= asOf && !logged.has(s.id) && isSessionOfSport(s))
    .map((s) => ({
      plannedSessionId: s.id,
      action: 'remove' as const,
      reason: `${sportLabel} staat uit in Instellingen → Training.`,
      generatedBy: ['engine/scheduleFit.ts#computeSportDisableProposal'],
    }));
  return {
    id: makeId('planchange'),
    trigger: 'strategy_changed',
    issue: `${sportLabel} uitgezet`,
    changes: items,
    alternatives: [],
    consequences: items.length > 0 ? `${items.length} geplande sessie(s) vervallen (${sportLabel.toLowerCase()}). Loggen blijft altijd mogelijk.` : `Er stond niets meer gepland (${sportLabel.toLowerCase()}).`,
    explanation: `${sportLabel} uitgezet in Instellingen → Training.`,
    createdAt: new Date().toISOString(),
  };
}

// Switching a sport back ON: its sessions from the program's weekly
// pattern return to every upcoming week that doesn't have them — on their
// usual day, only where that day has room under the user's time budget and
// pairing preference. A sport without a fixed weekly day (cycling) has
// nothing to put back; the caller says so.
export function computeSportEnableProposal(
  sportTemplates: SessionTemplate[],
  sportLabel: string,
  plannedSessions: PlannedSession[],
  allTemplates: SessionTemplate[],
  program: Program | null | undefined,
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'],
  asOf: string,
): { proposal: PlanChangeProposal; noRoom: number } {
  const templateById = new Map(allTemplates.map((t) => [t.id, t]));
  const patterned = sportTemplates.filter((t) => t.defaultDayOfWeek);
  const weekStarts = [...new Set(plannedSessions.filter((s) => s.scheduledDate >= asOf).map((s) => s.weekStartDate))].sort();
  const items: PlanChangeItem[] = [];
  let noRoom = 0;
  for (const weekStart of weekStarts) {
    const week = plannedSessions.filter((s) => s.weekStartDate === weekStart && s.status !== 'skipped');
    const added: PlannedSession[] = [];
    for (const t of patterned) {
      if (week.some((s) => s.templateId === t.id)) continue;
      const date = weekDates(weekStart)[(t.defaultDayOfWeek as number) - 1];
      if (date < asOf) continue;
      if (!dayHasRoomFor(date, t, [...week, ...added], templateById, program, dailyTimeBudget, sameDayPairingPreference)) {
        noRoom += 1;
        continue;
      }
      added.push({ id: `draft:${weekStart}:${t.id}`, templateId: t.id, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order: 99 });
      items.push({
        action: 'add',
        newSessionDraft: { templateId: t.id, scheduledDate: date, weekStartDate: weekStart },
        reason: `${sportLabel} staat weer aan in Instellingen → Training.`,
        generatedBy: ['engine/scheduleFit.ts#computeSportEnableProposal'],
      });
    }
  }
  const noRoomNote = noRoom > 0 ? ` In ${noRoom} ${noRoom === 1 ? 'week' : 'weken'} zat die dag al vol, daar is niets toegevoegd.` : '';
  return {
    noRoom,
    proposal: {
      id: makeId('planchange'),
      trigger: 'strategy_changed',
      issue: `${sportLabel} weer aangezet`,
      changes: items,
      alternatives: [],
      consequences: items.length > 0
        ? `${sportLabel} komt terug op de vaste dagen in de komende weken.${noRoomNote}`
        : noRoom > 0
          ? `Er is niets toegevoegd: op die dag staat al een andere sessie en er is geen ruimte voor een tweede. Kies een andere dag, of geef die dag meer tijd bij Trainingstijd per dag.`
          : `Er hoeft niets bij: ${sportLabel.toLowerCase()} staat al op de planning.`,
      explanation: `${sportLabel} aangezet in Instellingen → Training.`,
      createdAt: new Date().toISOString(),
    },
  };
}
