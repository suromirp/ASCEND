// De planningssync: een ronde tegelijk, alleen als er iets veranderde, en de registers
// die elke planningsstap leest. Ook het kanaal naar andere open vensters.

import { useEffect } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { TrainingGoal } from '../models/goals';
import {
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  SettingsRepo,
  type AppSettings,
} from '../storage/database';
import { currentBodyKg } from '../engine/bodyWeight';
import { packWeightOf } from '../engine/gr5Profile';
import { resolveTestRest, setFreshnessContext, setHardSameDayAllowed, setLongRunThenLegs, setTestRestHours } from '../engine/scheduler';
import { leaveKey } from '../engine/leaveEdit';
import { createSerialQueue } from '../utils/serialQueue';
import type { RecentPlanChange } from '../models/planChange';
import { todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { setDurationAdjustments, setRecentSessionMaxima, recentSessionMaxima, setLearnedDurations, setFixedSessionMinutes, setAmbition, setKindAmounts, resolveVariantDuration } from '../engine/substitutions';
import { durationScopeFor } from '../engine/durationScope';
import { syncProgramHorizon, type ProgramHorizonResult } from '../storage/database';
import { programAnchorDate } from '../engine/programLayout';
import { isRaceGoal } from '../engine/raceBlock';
import { bootSettled } from './boot';

export const syncChannel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ascend-data') : null;

// The program follows the main goal's date (storage/database.ts
// #syncProgramHorizon). Checked on every refresh, but only run when
// something it depends on changed: the goal date, the start of week 1, the
// sports, the long-Sunday choice, or a new day. Serialized, so two
// refreshes at once can never add the same weeks twice.
export let lastHorizonKey = '';
export function setLastHorizonKey(key: string) {
  lastHorizonKey = key;
}
function planFingerprint(planned: PlannedSession[]): number {
  let h = 0;
  for (const s of [...planned].sort((a, b) => a.id.localeCompare(b.id))) {
    const line = `${s.id}|${s.scheduledDate}|${s.status}|${s.templateId}|${s.plannedMinutes ?? ''}|${s.lock ? 1 : 0}`;
    for (let i = 0; i < line.length; i++) h = (Math.imul(h, 31) + line.charCodeAt(i)) | 0;
  }
  return h;
}
// One sync at a time, always (utils/serialQueue.ts): the next one starts only
// when the one before has really finished. A caller that waited longer than a
// minute is let go, so no button or screen waits for ever on the planning.
export const horizonQueue = createSerialQueue({ timeoutMs: 60_000, name: 'Planningssync' });
// Everything that changes the plan waits for the syncs already queued, so it
// never works on the plan of before a sync that is still writing (the app opens
// before its first sync has run, engine/bootWatch.ts). It reads the stored plan
// afterwards, never the state on screen.
export function planSettled(): Promise<void> {
  return horizonQueue.run(async () => undefined).then(() => undefined);
}

// Een melding dat iets niet lukte: geen rijen om terug te zetten, dus geen Ongedaan maken (ChangeNotice).
export function failureNotice(title: string, line: string): RecentPlanChange {
  return { id: makeId('failed'), trigger: 'session_moved', title, lines: [line], summary: line, why: '', before: [], addedIds: [], failed: true, createdAt: new Date().toISOString() };
}
// Raised after every Akkoord and every move or skip of your own, so the sync
// checks the week right away instead of the next day (docs/onderzoek/Planning op een
// lijn.md, conflict 9).

let planRevision = 0;
export function bumpPlanRevision() {
  planRevision++;
}
// The durations, spacing and leg index every planning step reads (engine/
// substitutions.ts, engine/scheduler.ts). Set before the sync too, so the
// sync and its week check never work with the state of the refresh before
// (docs/onderzoek/Planning op een lijn.md, conflict 10).
export function setPlanningRegisters(program: Program | null, tpls: SessionTemplate[], planned: PlannedSession[], logs: SessionLog[], loadedSettings: AppSettings, goals: TrainingGoal[]) {
  // Volume after illness follows the illness history everywhere a duration
  // is shown or planned; strength trainings take your estimate or the
  // duration learned from logs; the ambition in force (engine/durationScope.ts).
  const scope = durationScopeFor(loadedSettings, logs, tpls, program, todayISO());
  setDurationAdjustments(scope.durationAdjustments);
  // No session in the next two weeks asks for more than 110% of the
  // longest of its kind in the last 30 days.
  // A run on the date of a running goal is that race (engine/runGrowth.ts), not a reference for the 110%.
  const raceGoalDates = new Set(goals.filter((g) => g.targetDate && isRaceGoal(g)).map((g) => g.targetDate!));
  setRecentSessionMaxima(recentSessionMaxima(logs, todayISO(), raceGoalDates));
  setLearnedDurations(scope.learnedDurations);
  setHardSameDayAllowed(!!loadedSettings.hardSameDay);
  setLongRunThenLegs(!!loadedSettings.longRunThenLegs);
  setTestRestHours(resolveTestRest(loadedSettings.testRest));
  // The planner's leg index with the same inputs as the Benen card.
  const lastWeight = currentBodyKg(loadedSettings.weightEntries, loadedSettings.weightFromMacroFactor);
  setFreshnessContext({ today: todayISO(), bodyKg: lastWeight, program, minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program) });
  setFixedSessionMinutes(planned);
  setAmbition(scope.ambition);
  setKindAmounts(scope.kindAmounts);
}

// Always as stored. A proposal's preview never sets these to values you did
// not accept: it passes its own registers to the planning run
// (storage/horizonPlan.ts, Warden Planning punt 3).
export async function primePlanningRegisters() {
  const [programs, tpls, planned, logs, loadedSettings, goals] = await Promise.all([ProgramsRepo.getAll(), SessionTemplatesRepo.getAll(), PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), SettingsRepo.get(), TrainingGoalsRepo.getAll()]);
  setPlanningRegisters(programs[0] ?? null, tpls, planned, logs, loadedSettings, goals);
}

// What the week check put right in the last sync, until refresh() shows it.
export let pendingRepairs: ProgramHorizonResult['repairs'];
export function clearPendingRepairs() {
  pendingRepairs = undefined;
}

// The stored phases are part of the key, so a reset or an import that
// rewrites the program also triggers a sync.
export async function horizonKey(): Promise<string> {
    const [programs, goals, milestones, settings, planned] = await Promise.all([
      ProgramsRepo.getAll(), TrainingGoalsRepo.getAll(), GoalMilestonesRepo.getAll(), SettingsRepo.get(), PlannedSessionsRepo.getAll(),
    ]);
    return JSON.stringify([
      todayISO(),
      planRevision,
      // Any change to the planned sessions, by whatever step or by you: the
      // sync and its week check run again (docs/onderzoek/Planning op een
      // lijn.md, conflict 9).
      planFingerprint(planned),
      programs[0]?.startDate,
      programs[0]?.phases,
      // A repeated week changes the wave week the Saturday follows; a rest week
      // trained through and the days held before a change do the same.
      programs[0]?.repeatedWeeks,
      programs[0]?.skippedRestWeeks,
      programs[0]?.heldWeekDays,
      programAnchorDate(goals, milestones, todayISO()),
      settings.longSundaySession,
      settings.enabledSports,
      settings.programPhaseOverrides,
      settings.restDay,
      // Free days, holidays and treks (engine/leave.ts): what the planning reads,
      // never the note, so a new note starts no planning run.
      leaveKey(settings.leavePeriods),
      // Soft or strict rest after a bergtocht: switching it plans again at once.
      settings.trekLegRest,
      // Let go or shift a training that moves for a holiday (engine/leaveSpacing.ts).
      settings.leaveCrowding,
      // How fast the long run grows toward a race (engine/runGrowth.ts).
      settings.longRunGrowth,
      // Planning after the main goal (engine/programLayout.ts#planEndDay).
      settings.afterMainGoal,
      // Je Akkoord op neutrale golven zonder doel (engine/noGoalWaves.ts).
      settings.noGoalWaves,
      // The fourth run in Opbouw (engine/extraRun.ts) is off on Rustig.
      settings.ambition,
      // Tussendoelen (engine/raceBlock.ts) change the plan too. The rucksack
      // target of the main goal sets the pack ladder (engine/packLadder.ts).
      goals.map((g) => [g.id, g.status, g.targetDate, g.planRole, g.priorityChosen, g.requirements.length, packWeightOf(g.requirements)]),
    ]);
}

// True when the sync ran (something it depends on had changed).
export function syncProgramHorizonWhenChanged(prime?: () => Promise<void>): Promise<boolean> {
  const currentKey = horizonKey;
  return horizonQueue
    .run(async () => {
      // A repair from the opening that went over its time may still write the
      // plan (storage/bootLock.ts): first let it finish.
      await bootSettled;
      if ((await currentKey()) === lastHorizonKey) return false;
      await prime?.();
      const result = await syncProgramHorizon();
      // Two syncs before one refresh: both notices count.
      if (result.repairs) pendingRepairs = pendingRepairs
        ? { lines: [...pendingRepairs.lines, ...result.repairs.lines], before: [...pendingRepairs.before, ...result.repairs.before.filter((b) => !pendingRepairs!.before.some((p) => p.id === b.id))], stored: [...pendingRepairs.stored, ...result.repairs.stored.filter((b) => !pendingRepairs!.stored.some((p) => p.id === b.id))], addedIds: [...(pendingRepairs.addedIds ?? []), ...(result.repairs.addedIds ?? [])] }
        : result.repairs;
      lastHorizonKey = await currentKey();
      return true;
    })
    .then((ran) => ran ?? false);
}

export function simpleHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Een ander open venster schreef iets: lees opnieuw, zonder zelf weer een sync te starten.
export function useRefreshFromOtherWindows(deps: {
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { refresh } = deps;
  useEffect(() => {
    if (!syncChannel) return;
    const onMessage = () => void refresh(true);
    syncChannel.addEventListener('message', onMessage);
    return () => syncChannel.removeEventListener('message', onMessage);
  }, [refresh]);
}
