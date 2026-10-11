import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { assessOnCourse, type CourseStatus } from '../engine/onCourse';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';

const STATUS_COLOR: Record<CourseStatus, string> = {
  early: 'var(--color-ink)',
  on: 'var(--color-gold)',
  nearly: 'var(--color-bronze)',
  behind: 'var(--color-warning)',
};

// Ascend: the coach's verdict on the last four weeks toward your goal.
export function OnCourseCard({ goalName, goalDate }: { goalName: string; goalDate: string }) {
  const { program, plannedSessions, sessionLogs, templates, planChangeLog, settings } = useAppData();
  const course = useMemo(
    () => assessOnCourse({ today: todayISO(), goalName, goalDate, program, plannedSessions, logs: sessionLogs, templates, planChangeLog, illnessEpisodes: settings.illnessEpisodes }),
    [goalName, goalDate, program, plannedSessions, sessionLogs, templates, planChangeLog, settings.illnessEpisodes],
  );
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>DE COACH</Eyebrow>
      <p className="font-display text-xl" style={{ color: STATUS_COLOR[course.status] }}>{course.headline}</p>
      {course.summary && <p className="-mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{course.summary}</p>}
      <div className="mt-1 flex flex-col gap-1.5">
        {course.lines.map((line) => (
          <p key={line} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{line}</p>
        ))}
      </div>
    </Card>
  );
}
