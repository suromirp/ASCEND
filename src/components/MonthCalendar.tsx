import { useMemo } from 'react';
import { logDay, plannedByIdOf, withoutLog } from '../engine/logDay';
import type { PlannedSession, SessionLog } from '../models/training';
import { isoWeekday, monthBounds, parseISODate, todayISO, toISODate } from '../utils/dates';
import { SPORT_LOOK, sportKeyOfLog, type SportKey } from './logbook/sportLook';

// De maand als wat je deed: onder het getal van een gedane dag staat een stipje in de kleur van de sport
// (twee stipjes bij twee sporten). Wat nog gepland staat is een stille rand in de baankleur, nooit mint:
// het Logboek is geen planner. Vandaag met een ijsblauwe rand. Het leest de echte logs en het plan; de
// legenda is "Gedaan" en "Gepland", alleen waar het deze maand voorkomt
// (docs/beslissingen/2026-11-02-gegevens-herinrichting.md).

const WEEKDAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export function MonthCalendar({
  anchor,
  plannedSessions,
  sessionLogs,
  isRest = () => false,
  onPickDay,
  notedDates,
}: {
  anchor: string;
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  isRest?: (session: PlannedSession) => boolean;
  // Elke dag tot en met vandaag is tikbaar: het blad van die dag (components/logbook/DaySheet.tsx).
  onPickDay?: (date: string) => void;
  // Dagen met een eigen notitie: een klein gedempt stipje, nooit de reden.
  notedDates?: ReadonlySet<string>;
}) {
  const { start, end } = monthBounds(anchor);
  const today = todayISO();

  const plannedById = useMemo(() => plannedByIdOf(plannedSessions), [plannedSessions]);
  const sportsByDate = useMemo(() => {
    const map = new Map<string, SportKey[]>();
    for (const l of sessionLogs) {
      const day = logDay(l, plannedById);
      if (day < start || day > end || l.type === 'recovery') continue;
      const list = map.get(day) ?? [];
      list.push(sportKeyOfLog(l));
      map.set(day, list);
    }
    return map;
  }, [sessionLogs, plannedById, start, end]);

  const restDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of plannedSessions) {
      if (s.scheduledDate < start || s.scheduledDate > end || s.status === 'skipped') continue;
      if (isRest(s)) set.add(s.scheduledDate);
    }
    return set;
  }, [plannedSessions, start, end, isRest]);

  // Wat vandaag of later nog gepland staat en niet is gedaan: een mint ring.
  // Een sessie met een log is gedaan en telt hier niet meer als gepland.
  const plannedDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of withoutLog(plannedSessions, sessionLogs)) {
      if (s.scheduledDate < today || s.scheduledDate < start || s.scheduledDate > end || s.status === 'skipped') continue;
      if (!isRest(s)) set.add(s.scheduledDate);
    }
    return set;
  }, [plannedSessions, sessionLogs, today, start, end, isRest]);

  const cells = useMemo(() => {
    const firstWeekday = isoWeekday(start);
    const daysInMonth = parseISODate(end).getDate();
    const monthStart = parseISODate(start);
    const list: (string | null)[] = Array.from({ length: firstWeekday - 1 }, () => null);
    for (let day = 1; day <= daysInMonth; day++) list.push(toISODate(new Date(monthStart.getFullYear(), monthStart.getMonth(), day)));
    return list;
  }, [start, end]);

  const hasDone = sportsByDate.size > 0;
  const hasPlanned = [...plannedDates].some((d) => !sportsByDate.has(d));

  // Elk tikvlak is 44 bij 44 px zonder overlap: de rijen sluiten op elkaar aan, en de kalender gebruikt
  // de binnenmarge van de kaart mee, zodat een kolom ook op 360 px minstens 44 px breed is.
  return (
    <div className="-mx-2">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium" style={{ color: 'var(--color-ink-dim)' }}>
        {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} className="h-11" />;
          const sports = sportsByDate.get(date);
          const done = !!sports && sports.length > 0;
          const dots = [...new Set(sports ?? [])].slice(0, 2);
          const planned = !done && plannedDates.has(date);
          const rest = !done && !planned && restDates.has(date);
          const isToday = date === today;
          const day = parseISODate(date).getDate();
          const label = sports ? `${day}: ${sports.map((k) => SPORT_LOOK[k].label.toLowerCase()).join(', ')}` : planned ? `${day}: gepland` : rest ? `${day}: rustdag` : `${day}`;
          const tappable = !!onPickDay && date <= today;
          const noted = notedDates?.has(date) === true;
          const circle = (
              <span
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                style={{
                  color: done ? 'var(--color-ink)' : planned ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                  boxShadow: planned ? 'inset 0 0 0 1.5px var(--color-track)' : undefined,
                  outline: isToday ? '2px solid var(--color-status)' : undefined,
                  outlineOffset: 2,
                }}
              >
                {day}
                {dots.length > 0 && (
                  <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden>
                    {dots.map((k) => <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: SPORT_LOOK[k].color }} />)}
                  </span>
                )}
                {noted && <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ background: 'var(--color-ink-dim)' }} aria-hidden />}
              </span>
          );
          if (!tappable) {
            return (
              <div key={date} className="flex h-11 items-center justify-center" role="img" aria-label={isToday ? `${label}, vandaag` : label}>
                {circle}
              </div>
            );
          }
          return (
            <div key={date} className="flex h-11 items-center justify-center">
              <button
                type="button"
                onClick={() => onPickDay(date)}
                aria-label={`${isToday ? `${label}, vandaag` : label}. Dag bekijken.${noted ? ' Met een notitie.' : ''}`}
                className="relative flex h-11 w-full items-center justify-center"
              >
                {circle}
              </button>
            </div>
          );
        })}
      </div>
      {(hasDone || hasPlanned) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {hasDone && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-ink-dim)' }} aria-hidden />Gedaan</span>}
          {hasPlanned && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-track)' }} aria-hidden />Gepland</span>}
        </div>
      )}
    </div>
  );
}
