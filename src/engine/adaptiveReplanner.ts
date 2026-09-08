// ASCEND — Adaptive Replanner (Technical Architecture v0.3.1 REVISED,
// Phase 6 — "live for the forecast range, availability-driven cascade").
//
// The only module ever allowed to touch the forecast range (week +2
// onward) for AVAILABILITY reasons — Planning Horizon (Phase 5) draws that
// boundary, the Proposal Engine (Phase 5) owns the committed range
// exclusively. Built entirely on existing machinery, never a new
// decision-making formula of its own:
//
//   - Planning Horizon (engine/planningHorizon.ts) for the forecast zone
//   - proposeNoTimeToday (engine/scheduler.ts, unchanged) for the
//     TrainingAvailability pass — the exact same "move to the next free
//     day this week, or skip" logic that already exists for "no time
//     today", just triggered by an availability exception instead
//
// Weekly Prescription Builder architecture pass, Fase 6: the former pass 2
// (a ProgressionDecision-driven replace/reduce loop over existing forecast
// sessions, writing a TrainingPrescription via the Running/Mountain-
// Adventure specialists) has been RETIRED — it is now a strict subset of
// what engine/weeklyPrescriptionEngine.ts does (which additionally
// respects cross-goal arbitration, the bounded planned-trajectory curve,
// and actually supplies real candidate numbers to those same specialists,
// something this pass never did — every prescription it wrote carried
// role but no real target). Running both against the same forecast
// sessions on the same boot would mean two independently-reasoned
// TrainingPrescription rows for one session, with whichever ran last
// silently winning. This file now only ever does pass 1 (availability).

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { resolveHorizonZone, isDateInForecastRange } from './planningHorizon';
import { proposeNoTimeToday } from './scheduler';
import { weekdayOf, mondayOfWeek } from '../utils/dates';
import { makeId } from '../utils/id';

// Exported (Phase 8) so engine/strengthScheduling.ts's forecast-range
// placement checks the exact same availability rule — never a second,
// potentially-drifting reimplementation of "allowed weekday, minus
// temporary exceptions".
export function isDateAvailable(dateIso: string, availability: TrainingAvailability): boolean {
  const exception = availability.temporaryExceptions.find((e) => e.date === dateIso);
  if (exception) return exception.available;
  return availability.allowedDays.includes(weekdayOf(dateIso));
}

function buildPassiveSummary(items: PlanChangeItem[]): string {
  if (items.length === 0) return 'Geen aanpassingen nodig in de vervolgweken.';
  const counts: Partial<Record<PlanChangeItem['action'], number>> = {};
  for (const item of items) counts[item.action] = (counts[item.action] ?? 0) + 1;
  const parts: string[] = [];
  if (counts.remove) parts.push(`${counts.remove} overgeslagen`);
  if (counts.move) parts.push(`${counts.move} verplaatst`);
  // A single, one-line summary (v0.1 §11.3) — never a popup for every
  // small shift, whatever the count.
  return `${items.length} sessie(s) in de vervolgweken bijgewerkt: ${parts.join(', ')}.`;
}

export interface ForecastReplanInputs {
  // ALL planned sessions — the function filters to the forecast zone
  // itself (Planning Horizon), and the availability pass needs full week
  // context (proposeNoTimeToday's own contract) rather than a pre-filtered
  // slice.
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  availability: TrainingAvailability;
  asOf: string;
}

export interface ForecastReplanResult {
  proposal: PlanChangeProposal;
  passiveSummary: string;
}

export function computeForecastReplan(inputs: ForecastReplanInputs): ForecastReplanResult {
  const { plannedSessions, templates, availability, asOf } = inputs;

  const forecastSessions = plannedSessions.filter(
    (s) => s.status !== 'skipped' && resolveHorizonZone(s.weekStartDate, asOf) === 'forecast',
  );

  const items: PlanChangeItem[] = [];
  const handledIds = new Set<string>();

  // Reuses proposeNoTimeToday verbatim — the exact "move every session on
  // this date to the next free day this week, or skip if the week is
  // full" mechanic that already exists, just triggered by an availability
  // exception/blocked weekday instead of "no time today".
  const unavailableDates = [...new Set(forecastSessions.map((s) => s.scheduledDate))].filter(
    (d) => !isDateAvailable(d, availability),
  );
  for (const date of unavailableDates) {
    const weekStart = mondayOfWeek(date);
    const weekSessions = plannedSessions.filter((s) => s.weekStartDate === weekStart && s.status !== 'skipped');
    for (const proposal of proposeNoTimeToday(weekSessions, templates, date)) {
      for (const change of proposal.changes) {
        if (handledIds.has(change.sessionId)) continue;
        // Defensive: never let a resolved cascade land outside the
        // forecast zone (SYSTEM_INVARIANTS' confirmation_horizon_respected
        // — the committed range stays the Proposal Engine/user's alone).
        if (!isDateInForecastRange(change.toDate, asOf)) continue;
        handledIds.add(change.sessionId);
        items.push({
          plannedSessionId: change.sessionId,
          action: change.toDate === change.fromDate ? 'remove' : 'move',
          fromDate: change.fromDate,
          toDate: change.toDate,
          // Captured on the item itself (not only derivable from
          // TrainingAvailability at read time, which may have since
          // changed) — proposal.reason is scheduler.ts's own real,
          // specific text (e.g. the 48h-spacing cascade note), not a
          // generic placeholder.
          reason: `Beschikbaarheid: ${date} niet beschikbaar volgens de ingestelde trainingsbeschikbaarheid. ${proposal.reason}`,
          generatedBy: ['engine/adaptiveReplanner.ts#availability-pass', 'engine/scheduler.ts#proposeNoTimeToday'],
        });
      }
    }
  }

  const proposal: PlanChangeProposal = {
    id: makeId('planchange'),
    trigger: 'new_training_data',
    issue: items.length > 0 ? 'Aanpassingen in de vervolgweken' : 'Geen aanpassingen nodig',
    changes: items,
    alternatives: [],
    consequences: 'Wordt automatisch toegepast op het forecast-bereik (week +2 en verder) — nooit op de huidige of volgende week.',
    explanation: 'Gebaseerd op de ingestelde trainingsbeschikbaarheid; niets hiervan raakt de bevestigde (committed) weken.',
    createdAt: new Date().toISOString(),
  };

  return { proposal, passiveSummary: buildPassiveSummary(items) };
}
