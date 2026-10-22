// ASCEND — de weekprescriptie-stap van de opstart, los van React.
//
// Dit stond als runWeeklyPrescriptionBuild in state/AppDataContext.tsx en was
// daar niet te testen. De stap leest alles, laat de weekplanning rekenen
// (engine/weeklyPrescriptionEngine.ts), houdt alleen over wat inhoudelijk
// anders is dan wat er ligt (engine/weeklyPrescriptionDiff.ts) en schrijft
// alleen dat. Verandert er niets, dan schrijft hij niets, meldt hij niets en
// komt er geen regel in het wijzigingslogboek.
//
// De aanroeper (AppDataContext) zet met de uitkomst de melding of het
// voorstel op het scherm; dat hoort bij React, de rest hier niet.

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import {
  TrainingGoalsRepo,
  SessionLogsRepo,
  CapabilityEvidenceRepo,
  PlannedSessionsRepo,
  SessionTemplatesRepo,
  GoalEngineConfigRepo,
  StrengthProgramStrategiesRepo,
  WeeklyPrescriptionsRepo,
  TrainingPrescriptionsRepo,
  PlanChangeProposalsRepo,
  GoalMilestonesRepo,
  ProgramsRepo,
  SettingsRepo,
} from './database';
import { todayISO } from '../utils/dates';
import { activeGoalDemandKeys, computeProgressionDecisionsForKeys } from '../engine/progressionDecisions';
import { resolveHorizonZone } from '../engine/planningHorizon';
import { extractEvidenceFromLogs } from '../engine/capability';
import { computeReadiness } from '../engine/readiness';
import { computeCapacity } from '../engine/capacity';
import { targetPackWeightKg } from '../engine/demand';
import { computeActiveGoalOverviews } from '../engine/goalOverview';
import { computeWeeklyPrescriptionPlan } from '../engine/weeklyPrescriptionEngine';
import { diffWeeklyPrescriptionPlan } from '../engine/weeklyPrescriptionDiff';
import { activeStrengthStrategy } from '../engine/strengthProgram';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { programAnchorDate } from '../engine/programLayout';
import { isTemplatePlannable, fixedFrequencySports, templateSport, type Sport } from '../engine/sports';

export type WeeklyPrescriptionStepOutcome =
  // Niets te doen, of niets dat anders is: er is niets geschreven.
  | { kind: 'unchanged'; wrote: boolean }
  // Instelling "altijd eerst vragen": de wijzigingen zijn een voorstel om te
  // accepteren. Er is niets geschreven.
  | { kind: 'ask'; wrote: false; proposal: PlanChangeProposal; realChanges: PlanChangeItem[]; planned: PlannedSession[]; templates: SessionTemplate[] }
  // Toegepast en vastgelegd (met een regel in het wijzigingslogboek).
  | { kind: 'applied'; wrote: true; proposal: PlanChangeProposal; realChanges: PlanChangeItem[]; planned: PlannedSession[]; templates: SessionTemplate[]; updatedSessions: PlannedSession[] };

const sameSession = (a: PlannedSession, b: PlannedSession) => JSON.stringify(a) === JSON.stringify(b);

export async function runWeeklyPrescriptionStep(asOf: string = todayISO()): Promise<WeeklyPrescriptionStepOutcome> {
  const [goals, logs, manualEvidence, planned, tpls, engineConfig, strategies, previousPrescriptions, programs, appSettings, storedTraining] = await Promise.all([
    TrainingGoalsRepo.getAll(),
    SessionLogsRepo.getAll(),
    CapabilityEvidenceRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    GoalEngineConfigRepo.get(),
    StrengthProgramStrategiesRepo.getAll(),
    WeeklyPrescriptionsRepo.getAll(),
    ProgramsRepo.getAll(),
    SettingsRepo.get(),
    TrainingPrescriptionsRepo.getAll(),
  ]);

  const keys = activeGoalDemandKeys(goals);
  if (keys.length === 0) return { kind: 'unchanged', wrote: false }; // no active goal's demand to prescribe around

  const forecastWeekStarts = [
    ...new Set(planned.filter((s) => resolveHorizonZone(s.weekStartDate, asOf) === 'forecast').map((s) => s.weekStartDate)),
  ].sort();
  if (forecastWeekStarts.length === 0) return { kind: 'unchanged', wrote: false }; // nothing scheduled that far out yet — a real, unresolved dependency (see CLAUDE.md's "16-week horizon" note)

  const allEvidence = [...extractEvidenceFromLogs(logs), ...manualEvidence];
  const readiness = computeReadiness(logs, planned, 28, asOf, programs[0]?.startDate);
  const packWeightTargetKg = goals
    .filter((g) => g.status === 'active')
    .map((g) => targetPackWeightKg(g.requirements))
    .find((v) => v !== undefined);
  const capacity = computeCapacity(logs, 28, asOf, packWeightTargetKg);
  const recentLogs = [...logs].sort((a, b) => b.completedDate.localeCompare(a.completedDate));
  const decisionsByKey = computeProgressionDecisionsForKeys(keys, allEvidence, readiness, capacity, engineConfig.guardrails, recentLogs, asOf, goals);
  const overviews = computeActiveGoalOverviews(goals, allEvidence, engineConfig.availability, engineConfig.guardrails, asOf);

  const { prescriptions, newTrainingPrescriptions, proposal } = computeWeeklyPrescriptionPlan(
    forecastWeekStarts, goals, overviews, decisionsByKey, planned, tpls, engineConfig.availability,
    activeStrengthStrategy(strategies) ?? null, previousPrescriptions, [], programs[0] ?? null,
    engineConfig.strategy.sameDayPairingPreference, asOf,
    // Sports pinned to a number per week keep that count; the automatic
    // planning neither adds nor removes their sessions.
    (t) => isTemplatePlannable(t, appSettings.enabledSports) && !fixedFrequencySports(appSettings).includes(templateSport(t) as Sport),
  );

  // Never a session on or after the main goal's own day (the plan ends the
  // day before; production: "Lange duurloop toegevoegd op zo 1 augustus
  // 2027", the GR5 start), nor next to a tussendoel's race on its day.
  const anchorDay = programAnchorDate(goals, await GoalMilestonesRepo.getAll(), asOf);
  const raceDays = new Set(planned.filter((s) => s.templateId === 'tpl_race').map((s) => s.scheduledDate));
  const blockedDay = (date: string | undefined) => !!date && ((!!anchorDay && date >= anchorDay) || raceDays.has(date));
  const allowedChanges = proposal.changes.filter((c) => !blockedDay(c.action === 'add' ? c.newSessionDraft?.scheduledDate : c.action === 'move' ? c.toDate : undefined));

  // Alleen wat inhoudelijk anders is dan wat er ligt. De engine geeft elke
  // keer verse id's en tijdstempels; zonder deze vergelijking schreef elke
  // opening dezelfde voorschriften opnieuw en meldde "bijgewerkt".
  const delta = diffWeeklyPrescriptionPlan(
    { prescriptions, newTrainingPrescriptions, changes: allowedChanges },
    { weekly: previousPrescriptions, training: storedTraining },
  );
  proposal.changes = delta.changes;

  // 'keep' is geen wijziging.
  const realChanges = proposal.changes.filter((c) => c.action !== 'keep');

  // Fase 3 — "Wijzigingen toepassen: altijd eerst vragen": the forecast
  // changes become a coach item to accept or decline instead of being
  // applied in the background. A declined set isn't asked again (the id
  // is derived from the changes themselves).
  if (appSettings.changeApplyMode === 'always_ask' && realChanges.length > 0) {
    return { kind: 'ask', wrote: false, proposal, realChanges, planned, templates: tpls };
  }

  const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned);
  if (unsupported.length > 0) {
    // Same atomicity guarantee as runForecastReplan: never an
    // unintended partial apply.
    console.error('Weekly Prescription Builder: refusing to apply, unsupported plan change items present', unsupported);
    return { kind: 'unchanged', wrote: false };
  }

  let wrote = false;

  const plannedById = new Map(planned.map((s) => [s.id, s]));
  for (const session of updatedSessions) {
    const before = plannedById.get(session.id);
    if (!before || !sameSession(before, session)) {
      await PlannedSessionsRepo.put(session);
      wrote = true;
    }
  }

  // A session gets at most one *current* prescription — replace, never
  // accumulate, across repeated builder runs on later app opens.
  for (const prescription of delta.trainingToWrite) {
    const existing = await TrainingPrescriptionsRepo.byPlannedSession(prescription.plannedSessionId);
    if (existing) await TrainingPrescriptionsRepo.delete(existing.id);
    await TrainingPrescriptionsRepo.put(prescription);
    wrote = true;
  }

  // Eén huidige rij per week (Fase 1) — oude rij voor diezelfde week
  // verwijderen, nieuwe zetten; de audit trail van waarom leeft in
  // PlanChangeProposalsRepo hieronder, nooit hier gedupliceerd.
  for (const wp of delta.weeklyToWrite) {
    const existing = await WeeklyPrescriptionsRepo.byWeekStartDate(wp.weekStartDate);
    if (existing) await WeeklyPrescriptionsRepo.delete(existing.id);
    await WeeklyPrescriptionsRepo.put(wp);
    wrote = true;
  }

  // Geen echte wijziging aan de planning: geen regel in het logboek en geen
  // melding. De bijgewerkte weekvoorschriften hierboven zijn afgeleide
  // gegevens, geen planwijziging.
  if (realChanges.length === 0) return { kind: 'unchanged', wrote };

  // Append-only audit trail — resolvedAt/resolution set immediately since
  // the forecast range auto-applies, never user-confirmed.
  await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });

  return { kind: 'applied', wrote: true, proposal, realChanges, planned, templates: tpls, updatedSessions };
}
