import { dayOrder, orderDay } from '../engine/dayOrder';
import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import { leaveLabelOn } from '../engine/leave';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { REST_DAY_COPY } from '../data/restDayCopy';
import { useAppData } from '../state/AppDataContext';
import { LeaveBand } from './LeaveBand';
import { LegMark, WeekSportIcon, WeekStatusIcon } from './WeekIcons';
import { Icon } from './icons';
import { useWatchStatuses } from './useWatchStatus';
import type { WatchStatusKind } from '../engine/watchStatus';
import { addDays, weekDates, weekdayShortNL, todayISO } from '../utils/dates';
import { Eyebrow } from './ui';

// De week als compacte lijst op één scherm: per dag een regel met status,
// dag, sport, naam en duur. Een tik opent de actiesheet van die training
// (Week.tsx). Een dag zonder training is een dal; een vakantie of tocht
// staat als rustige band op zijn dagen.

const dayLabel = (date: string) => {
  const short = weekdayShortNL(date).toLowerCase();
  return `${short.charAt(0).toUpperCase()}${short.slice(1)} ${Number(date.slice(8, 10))}`;
};

// Een dag zonder verplichting is licht verlaagd; vandaag heeft een gouden streepje en lichte gloed.
const todayStyle = {
  background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-gold) 10%, transparent), transparent 70%)',
  boxShadow: 'inset 2px 0 0 var(--color-gold)',
};

function SessionRow({
  session, template, date, first, logs, program, onTap, adjusted, isToday, watch,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  date: string;
  first: boolean;
  logs: SessionLog[];
  program?: Program | null;
  onTap: () => void;
  adjusted: boolean;
  isToday: boolean;
  // Only 'sent' and 'failed' get a mark; everything else stays quiet.
  watch?: WatchStatusKind;
}) {
  const restMode = useAppData().settings.restDayMode ?? 'rest';
  const isRest = template.type === 'recovery';
  const { status, wasMoved } = deriveSessionStatus(session, logs, isRest);
  const duration = resolveEffectiveFullDuration(template, session.scheduledDate, program);
  const dim = status === 'skipped' || status === 'missed';
  const note = status === 'completed' ? undefined : adjusted ? 'aangepast' : wasMoved ? 'verplaatst' : undefined;
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex min-h-[52px] w-full items-center gap-2 border-t px-3 py-1.5 text-left transition-colors active:opacity-75 first:border-t-0"
      style={{ borderColor: 'var(--color-card-border)', opacity: dim ? 0.55 : 1, ...(isToday ? todayStyle : {}) }}
    >
      <WeekStatusIcon status={isToday && isRest && status === 'rest' ? 'today' : status} />
      <span className="w-11 shrink-0 whitespace-nowrap text-[13px] font-semibold tabular-nums" style={{ color: isToday ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>
        {first ? dayLabel(date) : ''}
      </span>
      {isRest ? <span className="h-4 w-4 shrink-0" aria-hidden="true" /> : <WeekSportIcon template={template} />}
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] leading-snug" style={{ color: isRest ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
          {isRest ? REST_DAY_COPY[restMode].title : template.name}
        </span>
        {note && <span className="block text-xs" style={{ color: 'var(--color-sky)' }}>{note}</span>}
      </span>
      {/* Eén rechterkolom van vaste breedte: ruit, horloge en duur naast elkaar. */}
      <span className="flex w-[84px] shrink-0 items-center justify-end gap-1.5 whitespace-nowrap text-[13px] tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
        {!isRest && isLegHeavyTemplate(template) && <LegMark />}
        {watch === 'sent' && <span className="flex" style={{ color: 'var(--color-success-text)' }}><Icon name="horloge" size={14} label="Verstuurd naar je horloge" /></span>}
        {watch === 'failed' && <span className="flex" style={{ color: 'var(--color-warning)' }}><Icon name="horloge" size={14} label="Versturen naar je horloge is niet gelukt" /></span>}
        <span>{isRest ? (status === 'completed' ? `${duration} min` : REST_DAY_COPY[restMode].badge.toLowerCase() === REST_DAY_COPY[restMode].title.toLowerCase() ? '' : REST_DAY_COPY[restMode].badge) : `${duration} min`}</span>
      </span>
    </button>
  );
}

export function WeekPlanner({
  weekStartDate,
  sessions,
  templateById,
  logs,
  program,
  onSelectSession,
  adjustedIds,
  leave,
}: {
  weekStartDate: string;
  sessions: PlannedSession[];
  templateById: Map<string, SessionTemplate>;
  logs: SessionLog[];
  program?: Program | null;
  onSelectSession: (session: PlannedSession) => void;
  adjustedIds?: Set<string>;
  // Free days, holidays and treks: shown as a quiet band on their days.
  leave?: LeavePeriod[];
}) {
  const days = weekDates(weekStartDate);
  const today = todayISO();
  const loggedIds = new Set(logs.map((l) => l.plannedSessionId));
  const { statusOf } = useWatchStatuses();
  const showWatch = useAppData().settings.showWatchStatusOnWeek !== false;

  if (days.length === 0) return <Eyebrow>GEEN DATA</Eyebrow>;

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
      {days.map((date) => {
        const advice = dayOrder(sessions.filter((s) => s.scheduledDate === date && !loggedIds.has(s.id)), sessions.filter((s) => s.scheduledDate === addDays(date, 1)), templateById);
        const daySessions = orderDay(sessions.filter((s) => s.scheduledDate === date), advice);
        const isToday = date === today;
        const leaveLabel = leaveLabelOn(date, leave);
        const rows = daySessions.flatMap((s) => {
          const template = templateById.get(s.templateId);
          return template ? [{ s, template }] : [];
        });
        // A day with a band (holiday, tocht, a light day around it) already shows its date there: no second row.
        const showEmpty = rows.length === 0 && !leaveLabel;
        return (
          <div key={date} className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
            {leaveLabel && (
              <div className="flex items-center gap-3 px-3 py-2">
                <WeekStatusIcon status="rest" />
                <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: isToday ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{dayLabel(date)}</span>
                <div className="min-w-0 flex-1"><LeaveBand label={leaveLabel} /></div>
              </div>
            )}
            {rows.map(({ s, template }, i) => (
              <SessionRow
                key={s.id}
                session={s}
                template={template}
                date={date}
                first={i === 0 && !leaveLabel}
                logs={logs}
                program={program}
                onTap={() => onSelectSession(s)}
                adjusted={!!adjustedIds?.has(s.id)}
                isToday={isToday}
                watch={showWatch ? statusOf(s, template).kind : undefined}
              />
            ))}
            {showEmpty && (
              <div className="flex min-h-[52px] items-center gap-3 px-3" style={isToday ? todayStyle : undefined}>
                <WeekStatusIcon status={isToday ? 'today' : 'rest'} />
                <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: isToday ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{dayLabel(date)}</span>
                <span className="text-[15px]" style={{ color: 'var(--color-ink-dim)' }}>Geen training gepland</span>
              </div>
            )}
            {advice && (
              <p className="flex flex-wrap items-center gap-x-1.5 px-3 pb-2 pl-[52px] text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                <span style={{ color: advice.avoid ? 'var(--color-warning)' : 'var(--color-gold)' }}>{advice.avoid ? 'Liever niet op één dag' : advice.headline}</span>
                {advice.gapHours && <span>· liefst {advice.gapHours} uur ertussen</span>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
