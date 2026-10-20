import { dayOrder, orderDay } from '../engine/dayOrder';
import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import { addDays, weekDates, weekdayShortNL, formatDateNL, todayISO } from '../utils/dates';
import { SessionCard } from './SessionCard';
import { Eyebrow } from './ui';

export function WeekPlanner({
  weekStartDate,
  sessions,
  templateById,
  logs,
  program,
  onSelectSession,
  adjustedIds,
}: {
  weekStartDate: string;
  sessions: PlannedSession[];
  templateById: Map<string, SessionTemplate>;
  logs: SessionLog[];
  program?: Program | null;
  onSelectSession: (session: PlannedSession) => void;
  adjustedIds?: Set<string>;
}) {
  const days = weekDates(weekStartDate);

  return (
    <div className="flex flex-col gap-4">
      {days.map((date, i) => {
        const loggedIds = new Set(logs.map((l) => l.plannedSessionId));
        const advice = dayOrder(sessions.filter((s) => s.scheduledDate === date && !loggedIds.has(s.id)), sessions.filter((s) => s.scheduledDate === addDays(date, 1)), templateById);
        const daySessions = orderDay(sessions.filter((s) => s.scheduledDate === date), advice);
        const isToday = date === todayISO();
        return (
          <div key={date} className="animate-rise-in" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="mb-2 flex items-baseline gap-2">
              <span
                className="text-xs font-semibold tracking-wide"
                style={{ color: isToday ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}
              >
                {weekdayShortNL(date)}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(date)}</span>
            </div>
            {advice && (
              <p className="mb-2 flex flex-wrap items-center gap-x-1.5 pl-1 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                <span style={{ color: advice.avoid ? 'var(--color-warning)' : 'var(--color-gold)' }}>{advice.avoid ? 'Liever niet op één dag' : advice.headline}</span>
                {advice.gapHours && <span>· liefst {advice.gapHours} uur ertussen</span>}
              </p>
            )}
            {daySessions.length === 0 ? (
              <p className="pl-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geen training gepland</p>
            ) : (
              <div className="flex flex-col gap-2">
                {daySessions.map((s) => {
                  const template = templateById.get(s.templateId);
                  if (!template) return null;
                  return (
                    <SessionCard key={s.id} session={s} template={template} logs={logs} program={program} onTap={() => onSelectSession(s)} adjusted={adjustedIds?.has(s.id)} />
                  );
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
