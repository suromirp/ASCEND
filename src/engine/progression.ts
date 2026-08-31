import type { SessionLog } from '../models/training';
import type { Objective, MilestoneDefinition, MilestoneProgress, MilestoneRequirement, MilestoneStatus } from '../models/objectives';
import { addDays } from '../utils/dates';

// Does a single SessionLog satisfy a given requirement on its own?
// ('manual' requirements can never be auto-satisfied — they always need an
// explicit MilestoneProgress entry, created by the user tapping "markeer als
// behaald" on the Ascend screen.)
export function logSatisfiesRequirement(log: SessionLog, requirement: MilestoneRequirement): boolean {
  switch (requirement.kind) {
    case 'duration':
      return log.type === requirement.activityType && log.durationMinutes >= requirement.minMinutes;
    case 'elevation': {
      const gain = log.outdoorData?.elevationGainM ?? log.cardioData?.elevationGainM ?? 0;
      const loss = log.outdoorData?.elevationLossM ?? 0;
      return gain >= requirement.minMeters && (requirement.minLossMeters === undefined || loss >= requirement.minLossMeters);
    }
    case 'distance':
      return (log.outdoorData?.distanceKm ?? log.cardioData?.distanceKm ?? 0) >= requirement.minKm;
    case 'distanceAndElevation':
      return (
        (log.outdoorData?.distanceKm ?? 0) >= requirement.minKm &&
        (log.outdoorData?.elevationGainM ?? 0) >= requirement.minMeters &&
        (requirement.minLossMeters === undefined || (log.outdoorData?.elevationLossM ?? 0) >= requirement.minLossMeters)
      );
    case 'backpack':
      return (
        (log.outdoorData?.backpackWeightKg ?? 0) >= requirement.minWeightKg &&
        (requirement.minKm === undefined || (log.outdoorData?.distanceKm ?? 0) >= requirement.minKm)
      );
    case 'consecutiveDays':
      return false; // evaluated across the whole log set, see below
    case 'manual':
      return false;
  }
}

function hasConsecutiveTrainingDays(logs: SessionLog[], days: number): boolean {
  const dates = Array.from(new Set(logs.filter((l) => l.type !== 'recovery').map((l) => l.completedDate))).sort();
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (addDays(dates[i - 1], 1) === dates[i]) {
      streak++;
      if (streak >= days) return true;
    } else {
      streak = 1;
    }
  }
  return days <= 1 && dates.length > 0;
}

// A requirement is "auto-clearable" if any single log (or, for
// consecutiveDays, the log history as a whole) satisfies it.
export function requirementAutoSatisfied(requirement: MilestoneRequirement, logs: SessionLog[]): boolean {
  if (requirement.kind === 'consecutiveDays') return hasConsecutiveTrainingDays(logs, requirement.days);
  if (requirement.kind === 'manual') return false;
  return logs.some((log) => logSatisfiesRequirement(log, requirement));
}

export interface MilestoneView {
  definition: MilestoneDefinition;
  status: MilestoneStatus;
  clearedDate?: string;
}

export interface ObjectiveProgress {
  objective: Objective;
  milestones: MilestoneView[];
  completedCount: number;
  totalCount: number;
  readinessPct: number;
  currentMilestone?: MilestoneView;
}

// Builds the full Ascent Ladder view-model for one objective: every
// milestone gets a status derived from explicit MilestoneProgress rows
// (never mutated) plus, defensively, from what the log history alone would
// already satisfy — so a manually-imported log still lights up a milestone
// even if the user never tapped a "mark complete" button.
export function computeObjectiveProgress(
  objective: Objective,
  progressRows: MilestoneProgress[],
  logs: SessionLog[],
): ObjectiveProgress {
  const clearedByRow = new Map(progressRows.filter((p) => p.objectiveId === objective.id).map((p) => [p.milestoneId, p]));

  const milestones: MilestoneView[] = objective.milestones
    .sort((a, b) => a.order - b.order)
    .map((definition) => {
      const row = clearedByRow.get(definition.id);
      const cleared = !!row || requirementAutoSatisfied(definition.requirement, logs);
      return { definition, status: cleared ? ('completed' as const) : ('future' as const), clearedDate: row?.clearedDate };
    });

  const firstIncompleteIdx = milestones.findIndex((m) => m.status !== 'completed');
  if (firstIncompleteIdx !== -1) {
    milestones[firstIncompleteIdx] = { ...milestones[firstIncompleteIdx], status: 'current' };
    for (let i = firstIncompleteIdx + 1; i < milestones.length; i++) {
      milestones[i] = { ...milestones[i], status: i === firstIncompleteIdx + 1 ? 'upcoming' : 'future' };
    }
  }

  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const totalCount = milestones.length;

  return {
    objective,
    milestones,
    completedCount,
    totalCount,
    readinessPct: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    currentMilestone: milestones.find((m) => m.status === 'current'),
  };
}
