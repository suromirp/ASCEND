import { useMemo } from 'react';
import { logDay, plannedByIdOf, withoutLog } from '../engine/logDay';
import type { PlannedSession, SessionLog } from '../models/training';
import { isoWeekday, monthBounds, parseISODate, todayISO, toISODate } from '../utils/dates';
import { SPORT_LOOK, sportKeyOfLog, type SportKey } from './logbook/sportLook';

// De maand in bolletjes: per dag een bolletje in de kleur van de sport die je
// deed (lopen, kracht, wandelen), een grijze ring voor een rustdag, een mint ring
// voor een training die nog komt (mint is wat je nog moet doen), vandaag met een
// ijsblauwe rand. Het leest de echte logs en het plan; de legenda toont alleen wat
// deze maand voorkomt.

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
  // Elke dag tot en met vandaag is tikbaar: "Wat speelde er?" (components/influence/).
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

  const present = (Object.keys(SPORT_LOOK) as SportKey[]).filter((k) => [...sportsByDate.values()].some((v) => v.includes(k)));
  const hasRest = [...restDates].some((d) => !sportsByDate.has(d));
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
          const sport = sports?.[0];
          const planned = !sport && plannedDates.has(date);
          const rest = !sport && !planned && restDates.has(date);
          const isToday = date === today;
          const day = parseISODate(date).getDate();
          const label = sports ? `${day}: ${sports.map((k) => SPORT_LOOK[k].label.toLowerCase()).join(', ')}` : planned ? `${day}: gepland` : rest ? `${day}: rustdag` : `${day}`;
          const tappable = !!onPickDay && date <= today;
          const noted = notedDates?.has(date) === true;
          const circle = (
              <span
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                style={{
                  background: sport ? SPORT_LOOK[sport].color : 'transparent',
                  color: sport ? 'var(--color-on-action)' : planned ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                  boxShadow: planned ? 'inset 0 0 0 1.5px var(--color-action)' : rest ? 'inset 0 0 0 1.5px var(--color-control-border)' : undefined,
                  outline: isToday ? '2px solid var(--color-status)' : undefined,
                  outlineOffset: 2,
                }}
              >
                {day}
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
                aria-label={`${isToday ? `${label}, vandaag` : label}. Wat speelde er?${noted ? ' Ingevuld.' : ''}`}
                className="relative flex h-11 w-full items-center justify-center"
              >
                {circle}
              </button>
            </div>
          );
        })}
      </div>
      {(present.length > 0 || hasRest || hasPlanned) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {present.map((k) => (
            <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: SPORT_LOOK[k].color }} aria-hidden />{SPORT_LOOK[k].label}</span>
          ))}
          {hasPlanned && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-action)' }} aria-hidden />Gepland</span>}
          {hasRest && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-control-border)' }} aria-hidden />Rust</span>}
        </div>
      )}
    </div>
  );
}
