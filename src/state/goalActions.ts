// Doelen en mijlpalen bijwerken, kracht elders bijhouden, instellingen bewaren en een melding zonder
// verandering in de agenda.

import { useCallback } from 'react';
import type { TrainingGoal, GoalMilestone } from '../models/goals';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { CelebrationEvent } from '../components/CompletionMoment';
import { haptics } from '../utils/haptics';
import { playMilestoneChime } from '../utils/sound';
import { pickVictoryQuote } from '../utils/quotes';
import { TrainingGoalsRepo, GoalMilestoneProgressRepo, StrengthProgramStrategiesRepo, SettingsRepo, type AppSettings } from '../storage/database';
import { withPackWeight } from '../engine/gr5Profile';
import { orderForRestored } from '../engine/goalList';
import type { PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import { activeStrengthStrategy, strengthTrackedExternally } from '../engine/strengthProgram';
import { todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { isMarathonGoal } from '../engine/mainGoal';
import type { UndoRestore } from './appDataTypes';
import type { Dispatch, SetStateAction } from 'react';

export function useGoalActions(deps: {
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  setCelebration: Dispatch<SetStateAction<CelebrationEvent | null>>;
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  strengthProgramStrategies: StrengthProgramStrategy[];
  setStrengthProgramStrategies: Dispatch<SetStateAction<StrengthProgramStrategy[]>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { trainingGoals, goalMilestones, settings, setSettings, setCelebration, setRecentChange, strengthProgramStrategies, setStrengthProgramStrategies, refresh } = deps;
  const clearMilestoneManually = useCallback(
    async (goalId: string, milestoneId: string) => {
      await GoalMilestoneProgressRepo.put({
        id: makeId('progress'),
        goalId,
        milestoneId,
        clearedDate: todayISO(),
      });
      const title = goalMilestones.find((m) => m.goalId === goalId && m.id === milestoneId)?.title;
      await refresh();
      haptics.success();
      if (settings.introSoundEnabled) playMilestoneChime();
      if (title) setCelebration({ id: makeId('celebration'), kind: 'milestone', title, quote: pickVictoryQuote() });
    },
    [goalMilestones, refresh, settings.introSoundEnabled, setCelebration],
  );

  // Only targetDate/targetDistanceKm are editable from the UI today — the
  // ladder content itself (name, milestones) is static, migrated once from
  // data/defaultProgram.ts (storage/goalMigration.ts). targetDistanceKm
  // isn't a direct TrainingGoal field (Technical Architecture v0.3.1
  // REVISED) — it's expressed as a 'distance'/'TOTAL_EVENT' GoalRequirement,
  // upserted here by kind. Setting/clearing targetDate also flips the
  // discriminated union's status between 'active' and 'paused', since an
  // active goal cannot exist without one.
  const updateGoal = useCallback(
    async (goalId: string, patch: { targetDistanceKm?: number; packWeightKg?: number }) => {
      const goal = trainingGoals.find((g) => g.id === goalId);
      if (!goal) return;
      const now = new Date().toISOString();
      let requirements = goal.requirements;
      if ('targetDistanceKm' in patch) {
        const withoutDistance = goal.requirements.filter((r) => r.kind !== 'distance');
        // discipline: 'hiking' — this function is only ever called for the
        // GR5 goal (the one goal with a milestone ladder; the marathon goal
        // uses its own AppSettings-backed MarathonGoalCard/updateSettings
        // path). Without it, computeDemand's endurance_duration/
        // mechanical_tolerance keys would carry discipline: undefined,
        // which can never match any real evidence — extractEvidenceFromLog
        // only ever produces a discipline-specific key. Phase 4/6 surfaced
        // this: the Gap/Feasibility/Adaptive Replanner pipeline silently
        // never engaged with GR5's own distance demand at all.
        requirements = patch.targetDistanceKm !== undefined
          ? [...withoutDistance, { id: makeId('req'), kind: 'distance' as const, scope: 'TOTAL_EVENT' as const, target: { amount: patch.targetDistanceKm, unit: 'km' as const }, discipline: 'hiking' }]
          : withoutDistance;
      }
      // The rucksack target of this goal (engine/gr5Profile.ts): each goal
      // carries its own, so a different trip can have a different weight.
      if ('packWeightKg' in patch) requirements = withPackWeight({ ...goal, requirements }, patch.packWeightKg, now).requirements;
      // The date stays: another date is a proposal (planGoalChange).
      await TrainingGoalsRepo.put({ ...goal, requirements, updatedAt: now });
      await refresh();
    },
    [trainingGoals, refresh],
  );

  const archiveGoal = useCallback(
    async (goalId: string) => {
      const goal = trainingGoals.find((g) => g.id === goalId);
      if (!goal) return;
      await TrainingGoalsRepo.put({ ...goal, status: 'archived', targetDate: undefined, updatedAt: new Date().toISOString() });
      // MarathonGoalCard's populated view is gated on settings.marathonRaceType
      // (the quick-pick field), not on whether a live TrainingGoal exists —
      // without this, archiving the Marathon goal left that field set, so the
      // card kept showing exactly as before (production feedback: "verwijderen
      // doet niks", and it read as a permanent, undeletable goal slot).
      // Clearing it here resets the card to its unconfigured state, the same
      // as GR5's own dedicated card disappearing once archived.
      if (isMarathonGoal(goal)) {
        const nextSettings = await SettingsRepo.set({ marathonRaceType: undefined, marathonTargetDate: undefined, marathonTargetTimeMinutes: undefined });
        setSettings(nextSettings);
      }
      await refresh();
    },
    [trainingGoals, refresh, setSettings],
  );

  const unarchiveGoal = useCallback(
    async (goalId: string) => {
      const goal = trainingGoals.find((g) => g.id === goalId);
      if (!goal || goal.status !== 'archived') return;
      // Een teruggehaald doel komt achteraan de lijst die je nu ziet.
      const order = orderForRestored(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), todayISO());
      await TrainingGoalsRepo.put({ ...goal, status: 'paused', order, updatedAt: new Date().toISOString() });
      await refresh();
    },
    [trainingGoals, goalMilestones, refresh],
  );

  const strengthExternal = strengthTrackedExternally(strengthProgramStrategies, settings.strengthTrackedExternally);

  // One switch: the settings flag and the active block's source move together.
  const setStrengthExternal = useCallback(async (external: boolean) => {
    const active = activeStrengthStrategy(await StrengthProgramStrategiesRepo.getAll());
    if (active && (active.source !== 'manual') !== external) {
      await StrengthProgramStrategiesRepo.put({ ...active, source: external ? 'macrofactor_workouts' : 'manual', updatedAt: new Date().toISOString() });
    }
    // The switch shows its new place at once; the rest follows in refresh.
    setSettings(await SettingsRepo.set({ strengthTrackedExternally: external }));
    setStrengthProgramStrategies(await StrengthProgramStrategiesRepo.getAll());
    await refresh();
  }, [refresh, setSettings, setStrengthProgramStrategies]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>): Promise<AppSettings> => {
    const next = await SettingsRepo.set(patch);
    setSettings(next);
    return next;
  }, [setSettings]);

  // An illness status change that didn't need any calendar change still
  // gets its own notice, so "Ongedaan maken" always undoes this tap and
  // never an older change.
  const showStatusOnlyChange = useCallback(async (proposal: PlanChangeProposal, restore?: UndoRestore) => {
    setRecentChange({
      id: proposal.id,
      trigger: proposal.trigger,
      title: proposal.issue,
      lines: ['Je planning hoefde niet te veranderen.'],
      why: proposal.consequences,
      before: [],
      addedIds: [],
      settingsBefore: restore?.settings,
      configBefore: restore?.config,
      createdAt: new Date().toISOString(),
    });
    await refresh();
  }, [refresh, setRecentChange]);

  return { clearMilestoneManually, updateGoal, archiveGoal, unarchiveGoal, strengthExternal, setStrengthExternal, updateSettings, showStatusOnlyChange };
}
