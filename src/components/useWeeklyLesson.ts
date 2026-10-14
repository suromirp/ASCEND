import { useEffect } from 'react';
import { useAppData } from '../state/AppDataContext';
import { KNOWLEDGE_TOPICS, knowledgeContent, topicById, type KnowledgeTopic } from '../data/knowledge';
import { pickLesson } from '../engine/weeklyLesson';
import { programAnchorDate } from '../engine/programLayout';
import { mondayOfWeek, todayISO } from '../utils/dates';

// The lesson of the week, kept in the settings for the whole week.
export function useWeeklyLesson(): { topic?: KnowledgeTopic; read: boolean } {
  const { settings, updateSettings, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
  const topicId = pickLesson(KNOWLEDGE_TOPICS, (id) => !!knowledgeContent(id), settings.knowledge, today, goalDate);
  const weekStart = mondayOfWeek(today);
  const kept = settings.knowledge?.week;

  useEffect(() => {
    if (topicId && (kept?.weekStart !== weekStart || kept.topicId !== topicId)) {
      void updateSettings({ knowledge: { ...settings.knowledge, week: { weekStart, topicId } } });
    }
  }, [topicId, kept?.weekStart, kept?.topicId, weekStart, settings.knowledge, updateSettings]);

  return { topic: topicId ? topicById(topicId) : undefined, read: !!topicId && !!settings.knowledge?.read?.includes(topicId) };
}
