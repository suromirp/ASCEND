import { useEffect } from 'react';
import { useAppData } from '../state/AppDataContext';
import { KNOWLEDGE_TOPICS, knowledgeContent, topicById, type KnowledgeTopic } from '../data/knowledge';
import { pickLesson } from '../engine/weeklyLesson';
import { trekDepartureDate } from '../engine/journeyAccess';
import { useHasTrekGoal } from './reis/useHasTrekGoal';
import { mondayOfWeek, todayISO } from '../utils/dates';

// The lesson of the week, kept in the settings for the whole week.
export function useWeeklyLesson(): { topic?: KnowledgeTopic; read: boolean } {
  const { settings, updateSettings, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  // De Kennisbank hoort bij een tocht: zonder tocht als doel geen les van de week.
  const trek = useHasTrekGoal();
  const goalDate = trekDepartureDate(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), today);
  const topicId = trek ? pickLesson(KNOWLEDGE_TOPICS, (id) => !!knowledgeContent(id), settings.knowledge, today, goalDate) : undefined;
  const weekStart = mondayOfWeek(today);
  const kept = settings.knowledge?.week;

  useEffect(() => {
    if (topicId && (kept?.weekStart !== weekStart || kept.topicId !== topicId)) {
      void updateSettings({ knowledge: { ...settings.knowledge, week: { weekStart, topicId } } });
    }
  }, [topicId, kept?.weekStart, kept?.topicId, weekStart, settings.knowledge, updateSettings]);

  return { topic: topicId ? topicById(topicId) : undefined, read: !!topicId && !!settings.knowledge?.read?.includes(topicId) };
}
