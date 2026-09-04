import { useMemo } from 'react';
import type { PlannedSession, SessionLog } from '../models/training';
import { deriveSessionStatus, type DisplayStatus } from '../engine/sessionStatus';
import { isoWeekday, monthBounds, parseISODate, todayISO, toISODate } from '../utils/dates';

const WEEKDAY_LABELS = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];

// Same status→colour mapping as StatusDot (components/ui.tsx), just dots
// instead of symbol+label — StatusDot's fixed size/symbol don't fit a
// compact calendar cell that can hold several sessions in one day.
const STATUS_COLOR: Record<DisplayStatus, string> = {
  completed: 'var(--color-success)',
  today: 'var(--color-gold)',
  planned: 'var(--color-ink-dim)',
  moved: 'var(--color-sky)',
  skipped: 'var(--color-danger)',
  missed: 'var(--color-warning)',
};

export function MonthCalendar({
  anchor,
  plannedSessions,
  sessionLogs,
  onSelectDate,
}: {
  anchor: string;
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  onSelectDate: (date: string) => void;
}) {
  const { start, end } = monthBounds(anchor);
  const today = todayISO();

  const byDate = useMemo(() => {
    const map = new Map<string, PlannedSession[]>();
    for (const s of plannedSessions) {
      if (s.scheduledDate < start || s.scheduledDate > end) continue;
      const list = map.get(s.scheduledDate);
      if (list) list.push(s);
      else map.set(s.scheduledDate, [s]);
    }
    return map;
  }, [plannedSessions, start, end]);

  const cells = useMemo(() => {
    const firstWeekday = isoWeekday(start); // 1 (Mon) .. 7 (Sun)
    const daysInMonth = parseISODate(end).getDate();
    const monthStartDate = parseISODate(start);
    const list: (string | null)[] = Array.from({ length: firstWeekday - 1 }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      list.push(toISODate(new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), day)));
    }
    return list;
  }, [start, end]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium" style={{ color: 'var(--color-ink-dim)' }}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const daySessions = byDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className="flex flex-col items-center gap-1 rounded-lg py-2"
              style={{
                background: isToday ? 'rgba(198,161,91,0.12)' : 'var(--color-surface)',
                border: isToday ? '1px solid var(--color-gold)' : '1px solid transparent',
              }}
            >
              <span className="text-xs" style={{ color: isToday ? 'var(--color-gold)' : 'var(--color-ink)' }}>
                {parseISODate(date).getDate()}
              </span>
              <div className="flex h-1.5 items-center gap-0.5">
                {daySessions.slice(0, 3).map((s) => (
                  <span
                    key={s.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: STATUS_COLOR[deriveSessionStatus(s, sessionLogs).status] }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
