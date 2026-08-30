import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import { weekDates, weekdayShortNL, formatDateNL, todayISO } from '../utils/dates';
import { SessionCard } from './SessionCard';
import { Eyebrow } from './ui';

export function WeekPlanner({
  weekStartDate,
  sessions,
  templateById,
  logs,
  onSelectSession,
}: {
  weekStartDate: string;
  sessions: PlannedSession[];
  templateById: Map<string, SessionTemplate>;
  logs: SessionLog[];
  onSelectSession: (session: PlannedSession) => void;
}) {
  const days = weekDates(weekStartDate);

  return (
    <div className="flex flex-col gap-4">
      {days.map((date) => {
        const daySessions = sessions.filter((s) => s.scheduledDate === date);
        const isToday = date === todayISO();
        return (
          <div key={date}>
            <div className="mb-2 flex items-baseline gap-2">
              <span
                className="text-xs font-semibold tracking-wide"
                style={{ color: isToday ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}
              >
                {weekdayShortNL(date)}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(date)}</span>
            </div>
            {daySessions.length === 0 ? (
              <p className="pl-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geen sessie gepland</p>
            ) : (
              <div className="flex flex-col gap-2">
                {daySessions.map((s) => {
                  const template = templateById.get(s.templateId);
                  if (!template) return null;
                  return <SessionCard key={s.id} session={s} template={template} logs={logs} onTap={() => onSelectSession(s)} />;
                })}
              </div>
            )}
          </div>
        );
      })}
      {days.length === 0 && <Eyebrow>GEEN DATA</Eyebrow>}
    </div>
  );
}
