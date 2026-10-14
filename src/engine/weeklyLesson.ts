// ASCEND — the lesson of the week (data/knowledge.ts).
//
// One topic per week, chosen from the topics that have a text and whose
// window (weeks before the main goal) holds this week and that you have not
// marked as read. The one whose window ends soonest comes first, so what is
// about to run out of time is taught before what could wait. Fixed rules,
// no AI. The pick is kept for the week (settings.knowledge.week), so it does
// not jump when you read something else.
//
// Pure: no React, no IndexedDB.

import type { KnowledgeTopic } from '../data/knowledge';
import { daysBetween, mondayOfWeek } from '../utils/dates';

export interface KnowledgeProgress {
  read?: string[]; // topic ids marked as read
  week?: { weekStart: string; topicId: string };
}

export function weeksBeforeGoal(today: string, goalDate: string): number {
  return Math.max(0, Math.ceil(daysBetween(today, goalDate) / 7));
}

export function eligibleTopics(topics: KnowledgeTopic[], hasContent: (id: string) => boolean, read: string[], weeksLeft: number | undefined): KnowledgeTopic[] {
  return topics
    .filter((t) => hasContent(t.id) && !read.includes(t.id) && (weeksLeft === undefined || (weeksLeft <= t.window[0] && weeksLeft >= t.window[1])))
    // The window closes when the weeks left reach its second number: the larger that is, the sooner it closes.
    .sort((a, b) => b.window[1] - a.window[1] || b.window[0] - a.window[0] || a.id.localeCompare(b.id));
}

// The topic id for this week, or undefined when nothing is eligible.
export function pickLesson(topics: KnowledgeTopic[], hasContent: (id: string) => boolean, progress: KnowledgeProgress | undefined, today: string, goalDate: string | undefined): string | undefined {
  const weekStart = mondayOfWeek(today);
  const read = progress?.read ?? [];
  const kept = progress?.week;
  // Kept for the whole week, also after you marked it as read, so the card can say "gelezen".
  if (kept && kept.weekStart === weekStart && topics.some((t) => t.id === kept.topicId) && hasContent(kept.topicId)) return kept.topicId;
  return eligibleTopics(topics, hasContent, read, goalDate ? weeksBeforeGoal(today, goalDate) : undefined)[0]?.id;
}
