// ASCEND — Weekly Prescription Builder: line derivation (Weekly
// Prescription Builder architecture pass, Fase 4).
//
// Pure functions only — no IO, no scheduling. The caller
// (engine/weeklyPrescriptionEngine.ts, Fase 5) is the only place that
// persists anything or hands the result to
// engine/weekReconciliation.ts#reconcileWeekComposition (placement stays
// entirely downstream, unaware of any of this).
//
// Three eindreview invariants this file must never violate (approved plan,
// Fase 4):
// (a) FORECAST-NO-RUNAWAY-COMPOUNDING — the planned trajectory multiplier
//     is always a bounded function of weeksIntoForecast applied to a FIXED
//     anchorBaselineCoverage (the last real, committed week), never to the
//     previous forecast week's own speculative output. Session-count
//     growth is a one-time delta, never repeated per forecast week within
//     the same 'progress' streak.
// (b) TEMPLATE-DEDUP-ACROSS-LINES — a physical template structurally
//     covering multiple CapabilityKeys is never requested more than once
//     per week for the same underlying need (dedupeDesiredSlots) — this is
//     explicitly NOT merge: no new session is synthesized, only an
//     already-multi-capability template's duplicate request is collapsed.
// (c) MULTI-GOAL-ARBITRATION-BEFORE-PRESCRIPTION — cross-goal attribution
//     on a contested CapabilityKey is resolved once, before any line
//     exists (resolveWeeklyCapabilityDemand), reusing Goal Focus exactly
//     like engine/goalArbiter.ts#arbitrateContestedSlot already does —
//     never a second, invented priority rule inside buildWeeklyPrescription.
//     decisionsByKey itself already carries exactly one ProgressionDecision
//     per key (engine/progressionDecisions.ts, nearest-active-goal taper
//     applied) — this function is never a second place that computes or
//     overrides that state, only the goalIds attribution/ordering used for
//     audit and for picking which goal's own CapabilityGap informs a
//     line's specificity weight.

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { CapabilityKey, Criticality, GapStatus } from '../models/capability';
import type { ProgressionDecision } from '../models/progression';
import type { MeasuredValue } from '../models/units';
import type { WeeklyPrescription, WeeklyPrescriptionLine, WeeklyPrescriptionDecision, SpecificityRampBand } from '../models/weeklyPrescription';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { GoalOverview } from './goalOverview';
import { keyId } from './capability';
import { inferCapabilityKeysForTemplate } from './sessionContribution';
import { computeSpecificityRampBand, computeSpecificityWeight } from './specificityRamp';
import { daysBetween } from '../utils/dates';
import { makeId } from '../utils/id';

// --- Baseline coverage (real, observed composition — never fabricated) -----

export interface CoverageEntry {
  count: number;
  sessionIds: string[];
}

// Hergebruikt engine/sessionContribution.ts#inferCapabilityKeysForTemplate —
// nooit een tweede sjabloon-scanformule (zie koptekst invariant b). Alleen
// sessies die deze specifieke week (weekStart) daadwerkelijk gepland staan
// tellen mee; 'skipped' sessies zijn opgegeven en tellen niet als dekking.
// Dit is de eerlijke basis waar elke aanpassing vandaan een begrensde,
// beredeneerde delta t.o.v. is — nooit een verzonnen absoluut target.
export function computeBaselineCoverage(weekStart: string, plannedSessions: PlannedSession[], templates: SessionTemplate[]): Map<string, CoverageEntry> {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const coverage = new Map<string, CoverageEntry>();

  const weekSessions = plannedSessions.filter((s) => s.weekStartDate === weekStart && s.status !== 'skipped');

  for (const session of weekSessions) {
    const template = templateById.get(session.templateId);
    if (!template) continue;
    for (const key of inferCapabilityKeysForTemplate(template)) {
      const kId = keyId(key);
      const existing = coverage.get(kId);
      if (existing) {
        existing.count += 1;
        existing.sessionIds.push(session.id);
      } else {
        coverage.set(kId, { count: 1, sessionIds: [session.id] });
      }
    }
  }

  return coverage;
}

// Deterministisch, NOOIT makeId() — dit is wat week-op-week KEEP-
// vergelijking (zelfde primaryKey + zelfde goalIds-verzameling) uberhaupt
// mogelijk maakt. goalIds wordt gesorteerd zodat aanroepvolgorde nooit de
// identity beinvloedt.
export function slotIdFor(key: CapabilityKey, goalIds: string[]): string {
  return `${keyId(key)}::${[...goalIds].sort().join(',')}`;
}

// --- (b) Template dedup across lines ----------------------------------------

export interface DesiredSlot {
  templateId: string;
  count: number;
  satisfiesSlotIds: string[];
}

// Wanneer twee of meer lijnen se dominante kandidaat-sjabloon
// (candidateTemplateIds[0], al geordend in buildWeeklyPrescription op
// hoeveel van de resolvedDemand-keys dat sjabloon structureel dekt)
// overlapt, wordt maximaal ÉÉN fysieke sessie van dat sjabloon aangevraagd
// (het HOOGSTE targetSessionCount van de afzonderlijke lijnen, nooit de
// som) — met alle betrokken lijnen se slotId's vastgelegd voor audit.
// 'keep'-lijnen vragen nooit iets aan (geen actie nodig); een lijn zonder
// bruikbaar kandidaat-sjabloon wordt overgeslagen (er is structureel niets
// te plaatsen).
//
// 'count' is het gewenste ABSOLUTE weekaantal van dat fysieke sjabloon —
// geen losse delta. engine/weekReconciliation.ts#reconcileWeekComposition
// bepaalt zelf, door te diffen tegen wat er al staat, wat daadwerkelijk nog
// toegevoegd moet worden — exact hetzelfde contract als
// StrengthProgramStrategy's eigen targetTemplateIds vandaag al gebruikt.
export function dedupeDesiredSlots(lines: WeeklyPrescriptionLine[], templates: SessionTemplate[]): DesiredSlot[] {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const groups = new Map<string, DesiredSlot>();

  for (const line of lines) {
    if (line.decision === 'keep') continue;
    const dominantTemplateId = line.candidateTemplateIds[0];
    if (!dominantTemplateId || !templateById.has(dominantTemplateId) || line.targetSessionCount <= 0) continue;

    const existing = groups.get(dominantTemplateId);
    if (!existing) {
      groups.set(dominantTemplateId, { templateId: dominantTemplateId, count: line.targetSessionCount, satisfiesSlotIds: [line.slotId] });
    } else {
      existing.count = Math.max(existing.count, line.targetSessionCount);
      existing.satisfiesSlotIds.push(line.slotId);
    }
  }

  return [...groups.values()];
}

// --- (c) Cross-goal arbitration before prescription -------------------------

export interface ResolvedCapabilityDemand {
  decision: ProgressionDecision;
  goalIds: string[]; // audit-only herkomst, geordend op Goal Focus (winnaar eerst) — nooit zelf de arbitratieregel
}

// Eén resolutiestap per CapabilityKey over ALLE actieve doelen heen,
// vóórdat er één WeeklyPrescriptionLine bestaat. decisionsByKey draagt al
// precies één ProgressionDecision per key (engine/progressionDecisions.ts —
// al inclusief de dichtstbijzijnde-actieve-doel taper-override) — dat
// getal wordt hier letterlijk hergebruikt, nooit herberekend of een tweede
// keer overruled. Wat deze functie wél doet: bepalen welke doelen een
// gecontesteerde key legitiem claimen en in welke volgorde (voor audit en
// voor het kiezen van welk doel se CapabilityGap een lijn se
// specificityWeight informeert) — via exact hetzelfde Goal Focus-mechanisme
// als engine/goalArbiter.ts#arbitrateContestedSlot, nooit een tweede,
// verzonnen prioriteitsregel.
//
// Een key die decisionsByKey wel kent maar geen enkel actief doel meer
// vraagt (bv. na een goal-archivering) wordt overgeslagen — nooit een
// weesvraag doorgeven aan de lijnafleiding.
export function resolveWeeklyCapabilityDemand(goalOverviews: GoalOverview[], decisionsByKey: Map<string, ProgressionDecision>): Map<string, ResolvedCapabilityDemand> {
  const goalIdsByKeyId = new Map<string, Set<string>>();
  for (const overview of goalOverviews) {
    for (const gap of overview.gaps) {
      const kId = keyId(gap.key);
      if (!goalIdsByKeyId.has(kId)) goalIdsByKeyId.set(kId, new Set());
      goalIdsByKeyId.get(kId)!.add(overview.goal.id);
    }
  }

  const focusById = new Map(goalOverviews.map((o) => [o.goal.id, o.focus]));
  const resolved = new Map<string, ResolvedCapabilityDemand>();

  for (const [kId, goalIdSet] of goalIdsByKeyId) {
    const decision = decisionsByKey.get(kId);
    if (!decision) continue; // niets getrackt voor deze key — nooit een gegokte staat verzinnen

    const goalIds = [...goalIdSet].sort((a, b) => {
      const diff = (focusById.get(b)?.normalizedPct ?? 0) - (focusById.get(a)?.normalizedPct ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });

    resolved.set(kId, { decision, goalIds });
  }

  return resolved;
}

// --- Line derivation ---------------------------------------------------------

// ASCEND_HEURISTIC(PLANNED-TRAJECTORY-CAP): een geplande opbouwcurve over
// de forecast-batch, NOOIT een compounding van eerdere speculatieve weken —
// altijd toegepast op dezelfde vaste anchorBaselineCoverage, nooit op
// vorige-week-se-eigen-uitvoer (invariant a).
const PLANNED_GROWTH_STEP_PER_WEEK = 0.12;
const MAX_PLANNED_GROWTH_FACTOR = 1.3;

export function computePlannedTrajectoryMultiplier(weeksIntoForecast: number): number {
  return Math.min(1 + PLANNED_GROWTH_STEP_PER_WEEK * weeksIntoForecast, MAX_PLANNED_GROWTH_FACTOR);
}

// ASCEND_HEURISTIC(WEEKLY-PRESCRIPTION-STATE-DELTA): zie de beslistabel in
// het goedgekeurde plan (Fase 4) — expliciet ongevalideerd, een eerlijk
// startpunt.
const REDUCE_VOLUME_MULTIPLIER = 0.8;
// Een per-key plafond op hoeveel sessies 'progress' er in één keer bij mag
// zetten voordat verdere groei wordt ingehouden — een cap, geen streefgetal.
const PROGRESS_SESSION_COUNT_CAP = 2;
// ASCEND_HEURISTIC(SKELETON-STALENESS-REVIEW-4-WEEKS): precedent-verwijzend
// naar ProgressionDecision.accumulationReviewDue's "3 opeenvolgende
// PROGRESS" — hier 4 opeenvolgende ongewijzigde weekskeletten. Dwingt zelf
// nooit iets af, puur een "verdient een blik"-vlag.
const REVIEW_DUE_AFTER_CONSECUTIVE_KEEP_WEEKS = 4;

// ASCEND_HEURISTIC(WEEKLY-PRESCRIPTION-RANGE-SPREAD): een weekniveau-target
// is inherent een bereik, geen puntwaarde — ±10% rond het geschaalde
// puntgetal (afgeleid van het dominante kandidaat-sjabloon se eigen, echte
// veld) is een eerlijk, ongevalideerd startpunt, geen gemeten spreiding.
const RANGE_SPREAD = 0.1;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function rangeAround(amount: number, unit: MeasuredValue['unit']): { min: MeasuredValue; max: MeasuredValue } {
  return {
    min: { amount: round1(amount * (1 - RANGE_SPREAD)), unit },
    max: { amount: round1(amount * (1 + RANGE_SPREAD)), unit },
  };
}

// Leest UITSLUITEND het dominante kandidaat-sjabloon se eigen, echte
// velden (durationVariants.full, outdoorTarget.*) — nooit een verzonnen
// absoluut getal. Er is geen elevationLoss-veld op SessionTemplate (alleen
// op een geLOGDE sessie) — dus elevationLoss blijft hier altijd undefined,
// eerlijker dan een geraden waarde.
function numericBaselineRanges(
  template: SessionTemplate | undefined,
  multiplier: number,
): Pick<WeeklyPrescriptionLine, 'targetDuration' | 'targetDistance' | 'elevationGain' | 'packWeight'> {
  if (!template) return {};
  const result: Pick<WeeklyPrescriptionLine, 'targetDuration' | 'targetDistance' | 'elevationGain' | 'packWeight'> = {};

  if (template.durationVariants.full > 0) {
    result.targetDuration = rangeAround(template.durationVariants.full * multiplier, 'min');
  }
  const distanceKm = template.outdoorTarget?.targetDistanceKm ?? template.cardioTarget?.targetDistanceKm;
  if (distanceKm !== undefined && distanceKm > 0) {
    result.targetDistance = rangeAround(distanceKm * multiplier, 'km');
  }
  const elevationM = template.outdoorTarget?.targetElevationM;
  if (elevationM !== undefined && elevationM > 0) {
    result.elevationGain = rangeAround(elevationM * multiplier, 'm_elevation_gain');
  }
  // packWeight is event-specifiek, nooit een bereik — zelfde precedent als
  // demand.ts#targetPackWeightKg.
  const packKg = template.outdoorTarget?.backpackWeightKg;
  if (packKg !== undefined && packKg > 0) {
    result.packWeight = { amount: round1(packKg * multiplier), unit: 'kg' };
  }

  return result;
}

// Sjabloon x CapabilityKey-bijdrage: rangeschikt op hoeveel van deze week
// se resolvedDemand-keys elk kandidaat-sjabloon structureel dekt (hoogste
// eerst) — zodat lijnen die eenzelfde rijk, multi-capability sjabloon delen
// (bv. een "loaded hill"-sessie) natuurlijk convergeren op hetzelfde
// dominante sjabloon, wat dedupeDesiredSlots (invariant b) nodig heeft om
// ze samen te vouwen.
function rankCandidateTemplates(key: CapabilityKey, templates: SessionTemplate[], relevantKeyIds: Set<string>): string[] {
  const kId = keyId(key);
  return templates
    .map((t) => ({ id: t.id, keys: inferCapabilityKeysForTemplate(t) }))
    .filter((t) => t.keys.some((k) => keyId(k) === kId))
    .sort((a, b) => {
      const scoreA = a.keys.filter((k) => relevantKeyIds.has(keyId(k))).length;
      const scoreB = b.keys.filter((k) => relevantKeyIds.has(keyId(k))).length;
      return scoreB - scoreA || a.id.localeCompare(b.id);
    })
    .map((t) => t.id);
}

function gapAndCriticalityFor(kId: string, winningGoalId: string | undefined, goalOverviews: GoalOverview[]): { criticality: Criticality | undefined; gapStatus: GapStatus | undefined } {
  const overview = goalOverviews.find((o) => o.goal.id === winningGoalId);
  const gap = overview?.gaps.find((g) => keyId(g.key) === kId);
  return { criticality: gap?.criticality, gapStatus: gap?.status };
}

function activeGoalTargetDate(goal: GoalOverview['goal']): string | undefined {
  return goal.status === 'active' ? goal.targetDate : undefined;
}

function rangeCloseEnough(a?: { min: MeasuredValue; max: MeasuredValue }, b?: { min: MeasuredValue; max: MeasuredValue }): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const CLOSE = 0.5; // kleine afrondingsmarge, zelfde geest als capability.ts#peakConfirmationMarginFor
  return Math.abs(a.min.amount - b.min.amount) <= CLOSE && Math.abs(a.max.amount - b.max.amount) <= CLOSE;
}

function linesMaterialyEqual(a: WeeklyPrescriptionLine, b: WeeklyPrescriptionLine): boolean {
  if (a.targetSessionCount !== b.targetSessionCount) return false;
  if (a.candidateTemplateIds.join('|') !== b.candidateTemplateIds.join('|')) return false;
  if (!rangeCloseEnough(a.targetDuration, b.targetDuration)) return false;
  if (!rangeCloseEnough(a.targetDistance, b.targetDistance)) return false;
  if (!rangeCloseEnough(a.elevationGain, b.elevationGain)) return false;
  if (!rangeCloseEnough(a.elevationLoss, b.elevationLoss)) return false;
  return true;
}

export interface WeeklyPrescriptionBuildInputs {
  weekStartDate: string; // aanroeper garandeert forecast-zone (planningHorizon.ts) — dit bestand kent zelf geen zonebewustzijn
  weeksIntoForecast: number; // 1-geïndexeerd (week+2=1, week+3=2, ...) — drijft ALLEEN de begrensde trajectory-curve, nooit de sessietelling-groei
  goalOverviews: GoalOverview[];
  resolvedDemand: Map<string, ResolvedCapabilityDemand>; // output van resolveWeeklyCapabilityDemand — NOOIT rechtstreeks een per-goal decisionsByKey
  anchorBaselineCoverage: Map<string, CoverageEntry>; // vaste, oorspronkelijke baseline — voor élke week in de forecast-batch identiek
  plannedSessions: PlannedSession[]; // deze specifieke week
  templates: SessionTemplate[];
  previousWeekPrescription: WeeklyPrescription | null; // null bij eerste-ooit-afleiding — alleen voor KEEP-vergelijking, nooit voor de trajectory-berekening zelf
  strengthStrategy: StrengthProgramStrategy | null; // alleen als bezettingssnapshot
  asOf: string;
}

function deriveLine(
  kId: string,
  key: CapabilityKey,
  entry: ResolvedCapabilityDemand,
  inputs: WeeklyPrescriptionBuildInputs,
  band: SpecificityRampBand,
  allRelevantKeyIds: Set<string>,
): WeeklyPrescriptionLine {
  const { anchorBaselineCoverage, templates, goalOverviews, weeksIntoForecast, previousWeekPrescription } = inputs;
  const baseline = anchorBaselineCoverage.get(kId)?.count ?? 0;
  const state = entry.decision.state;

  const { criticality, gapStatus } = gapAndCriticalityFor(kId, entry.goalIds[0], goalOverviews);
  const specificityWeight = computeSpecificityWeight({ criticality, gapStatus, band });

  let sessionCountDelta = 0;
  let volumeMultiplier = 1.0;
  let preKeepDecision: WeeklyPrescriptionDecision = 'consolidate';

  switch (state) {
    case 'progress': {
      const growthAllowed = (band === 'build' || band === 'specific') && baseline < PROGRESS_SESSION_COUNT_CAP;
      sessionCountDelta = growthAllowed ? 1 : 0;
      volumeMultiplier = computePlannedTrajectoryMultiplier(weeksIntoForecast);
      preKeepDecision = 'progress';
      break;
    }
    case 'consolidate':
      sessionCountDelta = 0;
      volumeMultiplier = 1.0;
      preKeepDecision = 'consolidate';
      break;
    case 'assess':
      // Onvoldoende data groeit/krimpt nooit iets — zelfde precedent als de
      // Progression Orchestrator zelf.
      sessionCountDelta = 0;
      volumeMultiplier = 1.0;
      preKeepDecision = 'consolidate';
      break;
    case 'reduce':
    case 'recover':
      // 'recover' krijgt dezelfde mapping als 'reduce' — zelfde precedent
      // als engine/adaptiveReplanner.ts.
      sessionCountDelta = -1;
      volumeMultiplier = REDUCE_VOLUME_MULTIPLIER;
      preKeepDecision = 'reduce';
      break;
    case 'taper':
      // Compositie bevriest — taperReductionFactor (al berekend en op de
      // ProgressionDecision meegegeven door goalArbiter.ts#applyTaperOverride)
      // wordt letterlijk hergebruikt, nooit hier herberekend.
      sessionCountDelta = 0;
      volumeMultiplier = 1 - (entry.decision.taperReductionFactor ?? 0);
      preKeepDecision = 'taper';
      break;
  }

  let targetSessionCount = baseline + sessionCountDelta;
  if (sessionCountDelta < 0 && criticality === 'critical') {
    targetSessionCount = Math.max(targetSessionCount, 1); // CRITICAL-FLOOR — nooit naar 0
  }
  targetSessionCount = Math.max(targetSessionCount, 0);

  const candidateTemplateIds = rankCandidateTemplates(key, templates, allRelevantKeyIds);
  const dominantTemplate = templates.find((t) => t.id === candidateTemplateIds[0]);
  const numericRanges = numericBaselineRanges(dominantTemplate, volumeMultiplier);

  const slotId = slotIdFor(key, entry.goalIds);
  const previousLine = previousWeekPrescription?.lines.find((l) => l.slotId === slotId);

  let decision: WeeklyPrescriptionDecision = preKeepDecision;
  if (previousLine && targetSessionCount === previousLine.targetSessionCount && candidateTemplateIds.join('|') !== previousLine.candidateTemplateIds.join('|')) {
    decision = 'replace';
  }

  const line: WeeklyPrescriptionLine = {
    id: makeId('weeklyline'),
    slotId,
    primaryKey: key,
    goalIds: entry.goalIds,
    targetSessionCount,
    ...numericRanges,
    candidateTemplateIds,
    decision,
    reason: entry.decision.reason,
    ruleId: 'ASCEND_HEURISTIC(WEEKLY-PRESCRIPTION-STATE-DELTA)',
    sourceProgressionState: state,
    specificityWeight,
  };

  if (previousLine && linesMaterialyEqual(line, previousLine)) {
    line.decision = 'keep';
  }

  return line;
}

// KEEP/stabiliteit: deze functie herberekent ALTIJD volledig elke lijn elke
// aanroep — bewust GEEN "sla over als signature matcht"-snelweg. Stabiliteit
// is een UITVOER-eigenschap: wanneer een vers afgeleide lijn materieel
// identiek is aan vorige week se gepersisteerde lijn voor dezelfde slotId,
// wordt decision 'keep'. consecutiveKeepWeeks/reviewDue zijn een
// WEEKNIVEAU-eigenschap (het hele skelet), los van individuele
// lijn-'keep's — skeletonSignature is een audit-fingerprint, NOOIT een
// rekenkortere weg: elke lijn wordt altijd volledig herberekend, de
// signature wordt er pas ACHTERAF van afgeleid.
export function buildWeeklyPrescription(inputs: WeeklyPrescriptionBuildInputs): WeeklyPrescription {
  const { goalOverviews, resolvedDemand, asOf, weekStartDate, previousWeekPrescription } = inputs;

  const goalDaysToGoal = goalOverviews
    .map((o) => ({ goalId: o.goal.id, targetDate: activeGoalTargetDate(o.goal) }))
    .filter((g): g is { goalId: string; targetDate: string } => g.targetDate !== undefined)
    .map((g) => ({ goalId: g.goalId, daysToGoal: daysBetween(asOf, g.targetDate) }));

  const nearestDaysToGoal = goalDaysToGoal.length > 0 ? Math.min(...goalDaysToGoal.map((g) => g.daysToGoal)) : undefined;
  const specificityRampBand: SpecificityRampBand = nearestDaysToGoal !== undefined ? computeSpecificityRampBand(nearestDaysToGoal) : 'base';

  // CapabilityKey-object per keyId, herleid uit elke doel se eigen gaps —
  // resolvedDemand draagt zelf alleen de string-id, nooit een tweede,
  // losstaande sleutel-vorm.
  const keyByKeyId = new Map<string, CapabilityKey>();
  for (const overview of goalOverviews) {
    for (const gap of overview.gaps) keyByKeyId.set(keyId(gap.key), gap.key);
  }

  const allRelevantKeyIds = new Set(resolvedDemand.keys());

  const lines: WeeklyPrescriptionLine[] = [];
  for (const [kId, entry] of resolvedDemand) {
    const key = keyByKeyId.get(kId);
    if (!key) continue; // structureel onmogelijk als resolvedDemand uit resolveWeeklyCapabilityDemand komt — nooit verzinnen
    lines.push(deriveLine(kId, key, entry, inputs, specificityRampBand, allRelevantKeyIds));
  }

  lines.sort((a, b) => a.slotId.localeCompare(b.slotId)); // deterministisch, nooit Map-iteratie-volgorde-afhankelijk

  const skeletonSignature = lines.map((l) => `${l.slotId}:${l.targetSessionCount}:${l.candidateTemplateIds.join('|')}`).join(';');
  const skeletonUnchanged = previousWeekPrescription !== null && previousWeekPrescription.skeletonSignature === skeletonSignature;
  const consecutiveKeepWeeks = skeletonUnchanged ? previousWeekPrescription!.consecutiveKeepWeeks + 1 : 0;
  const reviewDue = consecutiveKeepWeeks >= REVIEW_DUE_AFTER_CONSECUTIVE_KEEP_WEEKS;

  return {
    id: makeId('weeklyprescription'),
    weekStartDate,
    lines,
    strengthConstraintSnapshot: inputs.strengthStrategy
      ? { strategyId: inputs.strengthStrategy.id, sessionsPerWeek: inputs.strengthStrategy.sessionsPerWeek }
      : undefined,
    skeletonSignature,
    consecutiveKeepWeeks,
    reviewDue,
    specificityRampBand,
    goalSnapshot: goalDaysToGoal,
    generatedBy: ['engine/weeklyPrescriptionBuilder.ts#buildWeeklyPrescription'],
    computedAt: new Date().toISOString(),
  };
}
