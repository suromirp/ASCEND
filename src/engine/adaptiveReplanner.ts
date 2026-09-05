// ASCEND — Adaptive Replanner (Technical Architecture v0.3.1 REVISED,
// Phase 6 — "live for the forecast range, full add/move/replace/remove/
// reduce, not prescription-only").
//
// The only module ever allowed to touch the forecast range (week +2
// onward) — Planning Horizon (Phase 5) draws that boundary, the Proposal
// Engine (Phase 5) owns the committed range exclusively. Built entirely on
// existing machinery, never a new decision-making formula of its own:
//
//   - Planning Horizon (engine/planningHorizon.ts) for the forecast zone
//   - proposeNoTimeToday (engine/scheduler.ts, unchanged) for the
//     TrainingAvailability pass — the exact same "move to the next free
//     day this week, or skip" logic that already exists for "no time
//     today", just triggered by an availability exception instead
//   - ProgressionDecision (engine/progressionOrchestrator.ts) + the
//     Running/Mountain-Adventure specialists (Phase 3) + Goal Arbiter's
//     preserveStrengthRole (Phase 4) for the progression-driven pass
//   - engine/prescriptionWriter.ts (Phase 6) to actually persist what a
//     'reduce'/'replace' item points at — never silently no-op

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability, TrainingStrategyProfile } from '../models/goalEngineConfig';
import type { ProgressionDecision, ProgressionState } from '../models/progression';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { TrainingPrescription, TrainingPrescriptionCandidate, SessionRole } from '../models/prescription';
import { resolveHorizonZone, isDateInForecastRange } from './planningHorizon';
import { inferCapabilityKeysForTemplate } from './sessionContribution';
import { keyId } from './capability';
import { proposeNoTimeToday } from './scheduler';
import { writeTrainingPrescription } from './prescriptionWriter';
import { preserveStrengthRole } from './goalArbiter';
import { proposeRunningPrescription } from './specialists/running';
import { proposeMountainAdventurePrescription } from './specialists/mountainAdventure';
import { findAlgorithmRule } from '../data/algorithmRules';
import { isoWeekday, mondayOfWeek } from '../utils/dates';
import { makeId } from '../utils/id';

// A bare ruleId is a stable identifier, but the *metadata it resolves to*
// (data/algorithmRules.ts#ruleVersion) can be recalibrated later under the
// same id (SYSTEM_INVARIANTS' own "same input + engine version + rule
// version -> same output" already treats rule version as a distinct axis
// of change). Stamping the version NOW, at decision time, onto the
// permanent audit item means a much later lookup by ruleId alone can never
// silently misattribute an old entry to a rule version that didn't exist
// yet when it was written. Any entry that isn't a known ruleId (a file/
// module path, e.g. 'engine/specialists/running.ts') passes through
// unchanged — this only ever stamps entries findAlgorithmRule resolves.
function stampGeneratedBy(entries: string[]): string[] {
  return entries.map((entry) => {
    const rule = findAlgorithmRule(entry);
    return rule ? `${entry}@v${rule.ruleVersion}` : entry;
  });
}

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function isDateAvailable(dateIso: string, availability: TrainingAvailability): boolean {
  const exception = availability.temporaryExceptions.find((e) => e.date === dateIso);
  if (exception) return exception.available;
  return availability.allowedDays.includes(WEEKDAY_ORDER[isoWeekday(dateIso) - 1]);
}

// The same role vocabulary each Phase 3 specialist maps independently
// (deliberately not shared between them — engine module map: "Must NOT
// share one generic formula across disciplines"); strength has no
// discipline specialist of its own, so this is its one, direct mapping.
function roleForState(state: ProgressionState): SessionRole {
  switch (state) {
    case 'progress': return 'key';
    case 'consolidate': return 'support';
    case 'reduce': return 'maintenance';
    case 'recover': return 'recovery';
    case 'taper': return 'maintenance';
    case 'assess': return 'assessment';
  }
}

function buildPrescriptionCandidate(
  template: SessionTemplate,
  decision: ProgressionDecision,
  plannedSessionId: string,
  strengthProtection: TrainingStrategyProfile['strengthProtection'],
): TrainingPrescriptionCandidate {
  if (template.type === 'cardio') return proposeRunningPrescription({ decision, plannedSessionId });
  if (template.type === 'hiking') return proposeMountainAdventurePrescription({ decision, plannedSessionId });
  // Strength (Phase 3 built no discipline specialist for it): role-only,
  // floored at 'maintenance' by Goal Arbiter's §24 rule — an endurance
  // goal's own pressure never demotes strength further than that.
  return {
    plannedSessionId,
    role: preserveStrengthRole(roleForState(decision.state), strengthProtection),
    generatedBy: ['engine/adaptiveReplanner.ts', decision.ruleId],
    reason: decision.reason,
  };
}

function buildPassiveSummary(items: PlanChangeItem[]): string {
  if (items.length === 0) return 'Geen aanpassingen nodig in de vervolgweken.';
  const counts: Partial<Record<PlanChangeItem['action'], number>> = {};
  for (const item of items) counts[item.action] = (counts[item.action] ?? 0) + 1;
  const parts: string[] = [];
  if (counts.remove) parts.push(`${counts.remove} overgeslagen`);
  if (counts.reduce) parts.push(`${counts.reduce} verlicht`);
  if (counts.replace) parts.push(`${counts.replace} aangepast`);
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
  // Caller-computed (Progression Orchestrator), keyed by
  // engine/capability.ts#keyId — this module never computes a
  // ProgressionDecision, CapabilityEstimate or ReadinessBreakdown itself.
  decisionsByKey: Map<string, ProgressionDecision>;
  availability: TrainingAvailability;
  strengthProtection: TrainingStrategyProfile['strengthProtection'];
  asOf: string;
}

export interface ForecastReplanResult {
  proposal: PlanChangeProposal;
  // Real TrainingPrescription rows a 'reduce'/'replace' item points at via
  // newPrescriptionId — the caller must persist these (TrainingPrescriptionsRepo)
  // for the change to actually mean anything, never assumed to already exist.
  prescriptions: TrainingPrescription[];
  passiveSummary: string;
}

export function computeForecastReplan(inputs: ForecastReplanInputs): ForecastReplanResult {
  const { plannedSessions, templates, decisionsByKey, availability, strengthProtection, asOf } = inputs;
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const forecastSessions = plannedSessions.filter(
    (s) => s.status !== 'skipped' && resolveHorizonZone(s.weekStartDate, asOf) === 'forecast',
  );

  const items: PlanChangeItem[] = [];
  const prescriptions: TrainingPrescription[] = [];
  const handledIds = new Set<string>();

  // --- Pass 1: TrainingAvailability (module map's explicit input) ---
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

  // --- Pass 2: ProgressionDecision-driven adaptation ---
  for (const session of forecastSessions) {
    if (handledIds.has(session.id)) continue; // already addressed above
    const template = templateById.get(session.templateId);
    // Recovery sessions are never adapted — their whole point is already
    // minimal load; there is nothing to reduce and removing one during a
    // genuine recovery need would be counterproductive.
    if (!template || template.type === 'recovery') continue;

    const keys = inferCapabilityKeysForTemplate(template);
    const decision = keys.map((k) => decisionsByKey.get(keyId(k))).find((d): d is ProgressionDecision => d !== undefined);
    if (!decision) continue; // nothing tracked for this session — leave it alone

    if (decision.state === 'progress') continue; // the template's own progression is already the plan

    // consolidate/assess -> 'replace' (different role, same load target);
    // reduce/taper/recover -> 'reduce' (same role family, lighter target/
    // volume). recover deliberately does NOT map to 'remove': the
    // Algorithm Contract's own cutback/deload vocabulary (§31) never lists
    // full removal as a response to deteriorating readiness, only reduce/
    // consolidate/taper — and the specialists (engine/specialists/*.ts)
    // already treat 'recover' and 'reduce' identically for stress-override
    // purposes (both cap intensity to 'low'). A full, unconfirmed removal
    // of a future session is a stronger, less reversible action than
    // Phase 5 was willing to apply even to a same-day skip (which still
    // goes through a confirmation dialog) — 'reduce' (role: 'recovery',
    // lighter load) is the semantically correct, proportionate response.
    const action: 'reduce' | 'replace' = decision.state === 'reduce' || decision.state === 'taper' || decision.state === 'recover' ? 'reduce' : 'replace';
    const candidate = buildPrescriptionCandidate(template, decision, session.id, strengthProtection);
    const written = writeTrainingPrescription(candidate);
    prescriptions.push(written);
    // reason/generatedBy duplicated from the written prescription onto the
    // item itself, deliberately — TrainingPrescriptionsRepo keeps only the
    // one *current* row per session (the previous one is deleted the next
    // time this replanner runs), so without its own copy this permanent,
    // append-only audit record would lose exactly the "why"/"which
    // rule/engine version" it exists to preserve the moment a later run
    // supersedes that prescription.
    items.push({ plannedSessionId: session.id, action, newPrescriptionId: written.id, reason: written.reason, generatedBy: stampGeneratedBy(written.generatedBy) });
  }

  const proposal: PlanChangeProposal = {
    id: makeId('planchange'),
    trigger: 'new_training_data',
    issue: items.length > 0 ? 'Aanpassingen in de vervolgweken' : 'Geen aanpassingen nodig',
    changes: items,
    alternatives: [],
    consequences: 'Wordt automatisch toegepast op het forecast-bereik (week +2 en verder) — nooit op de huidige of volgende week.',
    explanation: 'Gebaseerd op readiness, capability-trend en beschikbaarheid; niets hiervan raakt de bevestigde (committed) weken.',
    createdAt: new Date().toISOString(),
  };

  return { proposal, prescriptions, passiveSummary: buildPassiveSummary(items) };
}
