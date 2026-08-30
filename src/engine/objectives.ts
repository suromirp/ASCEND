import type { ObjectiveProgress } from './progression';

export interface NextObjectiveCard {
  objectiveName: string;
  currentTitle: string;
  readinessPct: number;
  upcomingTitles: string[]; // the 2 milestones after the current one, for a short checklist preview
}

// Builds the compact "NEXT OBJECTIVE" summary shown on the Today screen and
// as the Adventure card — a short look-ahead rather than the full ladder.
export function buildNextObjectiveCard(progress: ObjectiveProgress): NextObjectiveCard | null {
  if (!progress.currentMilestone) return null;
  const currentIdx = progress.milestones.findIndex((m) => m.definition.id === progress.currentMilestone!.definition.id);
  const upcoming = progress.milestones.slice(currentIdx + 1, currentIdx + 3).map((m) => m.definition.title);

  return {
    objectiveName: progress.objective.name,
    currentTitle: progress.currentMilestone.definition.title,
    readinessPct: progress.readinessPct,
    upcomingTitles: upcoming,
  };
}
