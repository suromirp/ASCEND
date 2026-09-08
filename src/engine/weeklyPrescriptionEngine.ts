// ASCEND — Weekly Prescription Engine: forecast-batch orchestrator (Weekly
// Prescription Builder architecture pass, Fase 5).
//
// Wires the pure Fase 4 line-derivation (engine/weeklyPrescriptionBuilder.ts)
// to placement (engine/weekReconciliation.ts's generic
// reconcileWeekComposition, Groep C's searchWeeklyPlacement underneath) —
// this is the one place that folds the two together, sequentially, week by
// week. Forecast range ONLY (week +2 onward, engine/planningHorizon.ts) —
// the caller is responsible for never passing a committed-range weekStart
// in (SYSTEM_INVARIANTS: confirmation_horizon_respected). No IO here — the
// caller (state/AppDataContext.tsx, Fase 7) persists WeeklyPrescription/
// TrainingPrescription rows and applies the returned PlanChangeItems.

import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { TrainingAvailability, TrainingStrategyProfile } from '../models/goalEngineConfig';
import type { PlanChangeProposal, PlanChangeItem } from '../models/planChange';
import type { TrainingGoal } from '../models/goals';
import type { ProgressionDecision } from '../models/progression';
import type { TrainingPrescription } from '../models/prescription';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { WeeklyPrescription } from '../models/weeklyPrescription';
import type { GoalOverview } from './goalOverview';
import { keyId } from './capability';
import { committedWeekStartDates } from './planningHorizon';
import { reconcileWeekComposition, type ReconciliationTarget } from './weekReconciliation';
import { URGENT_GOAL_SWAP_THRESHOLD_PCT, CALM_GOAL_SWAP_THRESHOLD_PCT } from './strengthScheduling';
import {
  resolveWeeklyCapabilityDemand,
  computeBaselineCoverage,
  buildWeeklyPrescription,
  dedupeDesiredSlots,
  type DesiredSlot,
} from './weeklyPrescriptionBuilder';
import { proposeRunningPrescription } from './specialists/running';
import { proposeMountainAdventurePrescription } from './specialists/mountainAdventure';
import { writeTrainingPrescription } from './prescriptionWriter';
import { addDays } from '../utils/dates';
import { makeId } from '../utils/id';

const SOURCE = 'engine/weeklyPrescriptionEngine.ts#computeWeeklyPrescriptionPlan';
// Recovery is never a candidate — same reasoning/precedent as
// engine/strengthScheduling.ts's own SWAP_PROTECTED_TYPES.
const PROTECTED_TYPES = new Set(['recovery'] as const);

// Combines the deduplicated new-session requests (invariant b,
// dedupeDesiredSlots — non-'keep' lines only) with every 'keep' line's own
// already-correct template/count, one more max-per-template merge so a
// template shared between a 'keep' line and a growing line is still never
// double-counted. This is the FULL desired composition
// reconcileWeekComposition needs (it diffs against this to find what's
// actually missing/off-target) — dedupeDesiredSlots alone only ever covers
// the "needs a new physical session" subset.
function buildTargetTemplateIds(lines: WeeklyPrescription['lines'], desiredSlots: DesiredSlot[]): string[] {
  const countByTemplate = new Map<string, number>();
  for (const slot of desiredSlots) {
    countByTemplate.set(slot.templateId, Math.max(countByTemplate.get(slot.templateId) ?? 0, slot.count));
  }
  for (const line of lines) {
    if (line.decision !== 'keep') continue;
    const templateId = line.candidateTemplateIds[0];
    if (!templateId || line.targetSessionCount <= 0) continue;
    countByTemplate.set(templateId, Math.max(countByTemplate.get(templateId) ?? 0, line.targetSessionCount));
  }
  return [...countByTemplate.entries()].flatMap(([templateId, count]) => Array<string>(count).fill(templateId));
}

function buildReconciliationTarget(lines: WeeklyPrescription['lines'], desiredSlots: DesiredSlot[]): ReconciliationTarget {
  const familyTemplateIds = new Set(lines.flatMap((l) => l.candidateTemplateIds));
  const targetTemplateIds = buildTargetTemplateIds(lines, desiredSlots);

  return {
    isInFamily: (_session, template) => familyTemplateIds.has(template.id),
    targetTemplateIds,
    removeReason: (template) => `Weekprescriptie: ${template.name} hoort niet meer bij de berekende samenstelling van deze week.`,
    addReason: (template) => `Weekprescriptie: ${template.name} toegevoegd volgens de berekende weekprescriptie.`,
    protectedTypes: PROTECTED_TYPES,
    urgentSwapThresholdPct: URGENT_GOAL_SWAP_THRESHOLD_PCT,
    calmSwapThresholdPct: CALM_GOAL_SWAP_THRESHOLD_PCT,
    source: SOURCE,
  };
}

// Alleen sjabloontypes met een echte discipline-specialist (Fase 3) krijgen
// hier een geschreven TrainingPrescription — zelfde precedent/uitsluiting
// als engine/adaptiveReplanner.ts#buildPrescriptionCandidate. Kracht wordt
// hier nooit aangeraakt (StrengthProgramStrategy blijft alleen een
// bezettingssnapshot); recovery heeft structureel niets om te schalen.
function buildPrescriptionForLine(
  template: SessionTemplate,
  decision: ProgressionDecision,
  plannedSessionId: string,
  line: WeeklyPrescription['lines'][number],
): TrainingPrescription | null {
  const midpoint = (range?: { min: { amount: number }; max: { amount: number } }) => (range ? (range.min.amount + range.max.amount) / 2 : undefined);

  if (template.type === 'cardio') {
    const candidate = proposeRunningPrescription({ decision, plannedSessionId, candidateDistanceKm: midpoint(line.targetDistance) });
    return writeTrainingPrescription(candidate);
  }
  if (template.type === 'hiking') {
    const candidate = proposeMountainAdventurePrescription({
      decision,
      plannedSessionId,
      candidateElevationGainM: midpoint(line.elevationGain),
      candidateElevationLossM: midpoint(line.elevationLoss),
      candidatePackWeightKg: line.packWeight?.amount,
    });
    return writeTrainingPrescription(candidate);
  }
  return null;
}

export interface WeeklyPrescriptionPlanResult {
  prescriptions: WeeklyPrescription[];
  newTrainingPrescriptions: TrainingPrescription[];
  proposal: PlanChangeProposal;
}

export function computeWeeklyPrescriptionPlan(
  weekStarts: string[],
  goals: TrainingGoal[],
  goalOverviews: GoalOverview[],
  decisionsByKey: Map<string, ProgressionDecision>,
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  availability: TrainingAvailability,
  strengthStrategy: StrengthProgramStrategy | null,
  previousPrescriptions: WeeklyPrescription[],
  sessionLogs: SessionLog[],
  program: Program | null | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'] | undefined,
  asOf: string,
): WeeklyPrescriptionPlanResult {
  void goals; // audit context only — every real input this file needs is already resolved into goalOverviews/decisionsByKey
  const templateById = new Map(templates.map((t) => [t.id, t]));

  // Stap 0 — één keer, vóór de weeklus (eindreview-invariant c):
  // cross-goal-arbitratie via bestaande Goal Focus-logica.
  const resolvedDemand = resolveWeeklyCapabilityDemand(goalOverviews, decisionsByKey);

  // De vaste, oorspronkelijke baseline — de laatst echt geplande/committed
  // week (nooit een forecast-week se eigen, nog-niet-uitgevoerde
  // prescriptie; eindreview-invariant a). committedWeekStartDates()[1] is
  // de week die het dichtst tegen het forecast-bereik aan ligt.
  const [, latestCommittedWeekStart] = committedWeekStartDates(asOf);
  const anchorBaselineCoverage = computeBaselineCoverage(latestCommittedWeekStart, plannedSessions, templates);

  const prescriptions: WeeklyPrescription[] = [];
  const items: PlanChangeItem[] = [];
  const alternatives: PlanChangeProposal['alternatives'] = [];
  const newTrainingPrescriptions: TrainingPrescription[] = [];
  let noFreeDayWeekCount = 0;
  let legHeavyConflictWeekCount = 0;

  // Sequentieel vouwen — week N+1's KEEP-vergelijking heeft week N se
  // vers berekende rij nodig zodra nog geen gepersisteerde rij bestaat.
  // De gepersisteerde rij (echte geschiedenis over eerdere aanroepen heen,
  // bv. wanneer de forecast-batch een week opschuift en een eerdere week
  // niet meer wordt herberekend) heeft ALTIJD voorrang boven een vers
  // berekende rij uit deze aanroep — die vult alleen het gat wanneer er
  // structureel nog niets gepersisteerd is (een gloednieuwe forecast-week
  // die nu voor het eerst in beeld komt).
  const persistedByWeek = new Map(previousPrescriptions.map((p) => [p.weekStartDate, p]));
  const freshByWeek = new Map<string, WeeklyPrescription>();

  const sortedWeekStarts = [...weekStarts].sort();
  sortedWeekStarts.forEach((weekStartDate, index) => {
    const weeksIntoForecast = index + 1; // 1-geïndexeerd: week+2=1, week+3=2, ...
    const previousWeekStart = addDays(weekStartDate, -7);
    const previousWeekPrescription = persistedByWeek.get(previousWeekStart) ?? freshByWeek.get(previousWeekStart) ?? null;

    const prescription = buildWeeklyPrescription({
      weekStartDate,
      weeksIntoForecast,
      goalOverviews,
      resolvedDemand,
      anchorBaselineCoverage,
      plannedSessions,
      templates,
      previousWeekPrescription,
      strengthStrategy,
      asOf,
    });
    prescriptions.push(prescription);
    freshByWeek.set(weekStartDate, prescription);

    // Stap 2 — vóór reconciliatie: dedupeDesiredSlots over alle lijnen
    // samen (eindreview-invariant b), nooit lijn voor lijn apart.
    const desiredSlots = dedupeDesiredSlots(prescription.lines, templates);
    const target = buildReconciliationTarget(prescription.lines, desiredSlots);

    const week = reconcileWeekComposition(
      weekStartDate, target, plannedSessions, templateById, availability, new Set(), goalOverviews, sessionLogs, program, sameDayPairingPreference,
    );
    items.push(...week.items);
    alternatives.push(...week.alternatives);
    if (week.noFreeDay) noFreeDayWeekCount++;
    if (week.legHeavyConflict) legHeavyConflictWeekCount++;

    // Stap 3 — lijnen waar de telling gelijk bleef maar de numerieke
    // inhoud (volume/karakter) wél veranderde: bestaande, al-geplande
    // sessies krijgen een bijgewerkte TrainingPrescription via dezelfde
    // specialist als de Adaptive Replanner altijd al gebruikte — nu mét
    // echte candidate-getallen (het gedichte gat).
    const handledSessionIds = new Set(items.map((i) => i.plannedSessionId).filter((id): id is string => !!id));
    const weekSessions = plannedSessions.filter((s) => s.weekStartDate === weekStartDate && s.status !== 'skipped');

    for (const line of prescription.lines) {
      if (line.decision !== 'progress' && line.decision !== 'reduce' && line.decision !== 'taper') continue;
      const servingSessions = weekSessions.filter((s) => !handledSessionIds.has(s.id) && line.candidateTemplateIds.includes(s.templateId));
      const sourceDecision = resolvedDemand.get(keyId(line.primaryKey))?.decision;
      if (!sourceDecision) continue;

      for (const session of servingSessions) {
        const template = templateById.get(session.templateId);
        if (!template) continue;

        const written = buildPrescriptionForLine(template, sourceDecision, session.id, line);
        if (!written) continue;
        newTrainingPrescriptions.push(written);
        handledSessionIds.add(session.id);
        items.push({ plannedSessionId: session.id, action: 'replace', newPrescriptionId: written.id, reason: written.reason, generatedBy: written.generatedBy });
      }
    }
  });

  const unplaceableParts: string[] = [];
  if (noFreeDayWeekCount > 0) {
    unplaceableParts.push(`in ${noFreeDayWeekCount} week(en) zit elke dag al vol — er was geen vrije dag om de berekende weekprescriptie volledig te plaatsen`);
  }
  if (legHeavyConflictWeekCount > 0) {
    unplaceableParts.push(`in ${legHeavyConflictWeekCount} week(en) kon een sessie niet geplaatst worden zonder de 48-uursregel voor zware beenbelasting te schenden`);
  }
  const unplaceableNote = unplaceableParts.length > 0 ? ` Let op: ${unplaceableParts.join('; ')}.` : '';

  const proposal: PlanChangeProposal = {
    id: makeId('planchange'),
    trigger: 'weekly_prescription_computed',
    issue: items.length > 0 ? 'Weekprescriptie bijgewerkt' : unplaceableParts.length > 0 ? 'Kon niet volledig plaatsen' : 'Geen aanpassingen nodig',
    changes: items,
    alternatives,
    consequences: `Wordt toegepast op het forecast-bereik (week +2 en verder) — nooit op de huidige of volgende week.${unplaceableNote}`,
    explanation: 'Gebaseerd op actieve doelen, voortgang, herstel en de MacroFactor-krachtbezetting — MacroFactor blijft de inhoud van elke krachtsessie bepalen; dit bestand raakt kracht nooit inhoudelijk.',
    createdAt: new Date().toISOString(),
  };

  return { prescriptions, newTrainingPrescriptions, proposal };
}
