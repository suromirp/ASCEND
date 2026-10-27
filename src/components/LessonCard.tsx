import { useNavigate } from 'react-router-dom';
import { knowledgeContent, CATEGORY_LABEL } from '../data/knowledge';
import { useWeeklyLesson } from './useWeeklyLesson';
import { Card, Eyebrow } from './ui';
import { TextButton } from './TextButton';

// Today: the lesson of the week, one tap to the text and videos.
export function LessonCard() {
  const navigate = useNavigate();
  const { topic, read } = useWeeklyLesson();
  if (!topic) return null;
  const content = knowledgeContent(topic.id);
  return (
    <Card className="flex flex-col gap-2" texture>
      <div className="flex items-baseline justify-between">
        <Eyebrow>Les van de week</Eyebrow>
        <span className="text-xs" style={{ color: read ? 'var(--color-success)' : 'var(--color-ink-dim)' }}>{read ? 'gelezen' : CATEGORY_LABEL[topic.category].toLowerCase()}</span>
      </div>
      <p className="font-display text-lg leading-snug" style={{ color: 'var(--color-ink)' }}>{topic.title}</p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{content?.weeklyTip ?? topic.summary}</p>
      <TextButton onClick={() => navigate(`/kennis/${topic.id}`)} className="self-start" icon="verder">
        {read ? 'Nog eens lezen' : 'Lees en kijk'}
      </TextButton>
    </Card>
  );
}
