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
import { LegMark, WeekStatusIcon } from './WeekIcons';
import { LogDisc, SportDisc } from './SportDisc';
import { SPORT_LOOK, sportKeyOfLog } from './logbook/sportLook';
import { zoneOfTemplate } from './vandaag/zone';
import { Icon } from './icons';
import { useWatchStatuses } from './useWatchStatus';
import type { WatchStatusKind } from '../engine/watchStatus';
import { addDays, weekDates, weekdayShortNL, todayISO } from '../utils/dates';
import { Eyebrow, StatusPill } from './ui';
import { EFFORT_COLOR } from './effortColor';
import { HeartSign } from './influence/HeartSign';
import { useDeviations } from './influence/useInfluence';
import { entryForLog, signState, type SignState } from '../engine/influence';
import { useMemo } from 'react';

// De week als compacte lijst op één scherm: per dag een regel met status,
// dag, sport, naam en duur. Een tik opent de actiesheet van die training
// (Week.tsx). Een dag zonder training is een dal; een vakantie of tocht
// staat als rustige band op zijn dagen.

const dayLabel = (date: string) => {
  const short = weekdayShortNL(date).toLowerCase();
  return `${short.charAt(0).toUpperCase()}${short.slice(1)} ${Number(date.slice(8, 10))}`;
};

// Vandaag heeft een streepje in ijs en een lichte gloed; een rustdag een lichte tint.
const todayStyle = {
  background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-status) 12%, transparent), transparent 80%)',
  boxShadow: 'inset 3px 0 0 var(--color-status)',
};
const restStyle = { background: 'color-mix(in srgb, var(--color-status) 6%, transparent)' };

function SessionRow({
  session, template, date, logs, program, templates, onTap, adjusted, isToday, watch, sign,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  date: string;
  logs: SessionLog[];
  program?: Program | null;
  templates: SessionTemplate[];
  onTap: () => void;
  adjusted: boolean;
  isToday: boolean;
  // Only 'sent' and 'failed' get a mark; everything else stays quiet.
  watch?: WatchStatusKind;
  // Het hartslagteken van "Wat speelde er", naast de naam van een gedane training.
  sign?: SignState;
}) {
  const restMode = useAppData().settings.restDayMode ?? 'rest';
  const isRest = template.type === 'recovery';
  const { status, wasMoved } = deriveSessionStatus(session, logs, isRest);
  const duration = resolveEffectiveFullDuration(template, session.scheduledDate, program);
  const dim = status === 'skipped' || status === 'missed';
  const note = status === 'completed' ? undefined : adjusted ? 'aangepast' : wasMoved ? 'verplaatst' : undefined;
  const zone = isRest ? undefined : zoneOfTemplate(template, session.scheduledDate, program, templates);
  const legs = !isRest && isLegHeavyTemplate(template);
  const doneNow = status === 'completed';
  const showToday = isToday && !doneNow && status !== 'skipped';
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex min-h-[64px] w-full items-center gap-3 border-t px-3 py-2 text-left transition-colors active:opacity-75 first:border-t-0"
      style={{ borderColor: 'var(--color-card-border)', opacity: dim ? 0.55 : 1, ...(isToday ? todayStyle : isRest ? restStyle : {}) }}
    >
      <SportDisc template={template} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 break-words text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>
            {isRest ? REST_DAY_COPY[restMode].title : template.name}
          </span>
          {legs && <LegMark />}
          {sign && <HeartSign state={sign} />}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-4 tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          <span>{dayLabel(date)}</span>
          {isRest ? (
            <span>· bewust herstel</span>
          ) : (
            <>
              <span aria-hidden="true">·</span>
              {zone && (
                <>
                  <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: EFFORT_COLOR[zone] }} aria-hidden="true" />
                  <span className="sr-only">Zone {zone}</span>
                </>
              )}
              <span>{duration} min</span>
            </>
          )}
          {note && <span style={{ color: 'var(--color-status)' }}>· {note}</span>}
        </span>
      </span>
      {/* Rechts: wat er te zien is van het horloge en de stand van de training. */}
      <span className="flex shrink-0 items-center gap-2">
        {watch === 'sent' && <span className="flex" style={{ color: 'var(--color-success-text)' }}><Icon name="horloge" size={14} label="Verstuurd naar je horloge" /></span>}
        {watch === 'failed' && <span className="flex" style={{ color: 'var(--color-warning)' }}><Icon name="horloge" size={14} label="Versturen naar je horloge is niet gelukt" /></span>}
        {doneNow ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-progress)', color: 'var(--color-progress)' }}>
            <Icon name="vinkje" size={14} />
            <span className="sr-only">Gedaan</span>
          </span>
        ) : showToday ? (
          <StatusPill tone="action">Vandaag</StatusPill>
        ) : isRest ? (
          <StatusPill tone="status">{status === 'skipped' ? 'Overgeslagen' : 'Herstel'}</StatusPill>
        ) : status === 'planned' || status === 'moved' ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-control-border)' }}>
            <span className="sr-only">Gepland</span>
          </span>
        ) : (
          <WeekStatusIcon status={status} />
        )}
      </span>
    </button>
  );
}

// Een training die je deed zonder dat hij gepland stond (een losse training, een
// Garmin-activiteit die je als zodanig bewaarde): een gedane rij zoals een gedane
// geplande training, met "zonder plan" erbij. Een tik opent het logblad.
function LooseRow({ log, template, isToday, onTap, sign }: { log: SessionLog; template?: SessionTemplate; isToday: boolean; onTap: () => void; sign?: SignState }) {
  const name = template?.name ?? SPORT_LOOK[sportKeyOfLog(log)].label;
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex min-h-[64px] w-full items-center gap-3 border-t px-3 py-2 text-left transition-colors active:opacity-75 first:border-t-0"
      style={{ borderColor: 'var(--color-card-border)', ...(isToday ? todayStyle : {}) }}
    >
      <LogDisc log={log} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 break-words text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{name}</span>
          {sign && <HeartSign state={sign} />}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-4 tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          <span>{dayLabel(log.completedDate)}</span>
          {log.durationMinutes > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{log.durationMinutes} min</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>zonder plan</span>
        </span>
      </span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-progress)', color: 'var(--color-progress)' }}>
        <Icon name="vinkje" size={14} />
        <span className="sr-only">Gedaan</span>
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
  onAddFree,
  looseLogs = [],
  onSelectLog,
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
  // De plus op een vrije dag van vandaag: de bestaande "Losse training".
  onAddFree?: () => void;
  // Logs of this week without a planned training (engine/weekLogs.ts#looseLogsOfWeek),
  // shown on their day as a done row; a tap opens the log (onSelectLog).
  looseLogs?: SessionLog[];
  onSelectLog?: (log: SessionLog) => void;
}) {
  const days = weekDates(weekStartDate);
  const today = todayISO();
  const loggedIds = new Set(logs.map((l) => l.plannedSessionId));
  const { statusOf } = useWatchStatuses();
  const { settings } = useAppData();
  const showWatch = settings.showWatchStatusOnWeek !== false;
  // "Wat speelde er": the sign by a done run with a heart rate that stands out.
  const weekLogs = useMemo(() => {
    const dates = weekDates(weekStartDate);
    return logs.filter((l) => l.completedDate >= dates[0] && l.completedDate <= dates[dates.length - 1]);
  }, [logs, weekStartDate]);
  const deviations = useDeviations(weekLogs);
  const signOf = (log: SessionLog | undefined): SignState | undefined => (log ? signState(deviations.get(log.id), entryForLog(settings.influences, log.id), settings.influenceSign) : undefined);
  const templates = Array.from(templateById.values());

  if (days.length === 0) return <Eyebrow>Geen data</Eyebrow>;

  return (
    <div className="mx-stagger overflow-hidden rounded-2xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
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
        const loose = looseLogs.filter((l) => l.completedDate === date);
        const showEmpty = rows.length === 0 && !leaveLabel && loose.length === 0;
        return (
          <div key={date} className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
            {leaveLabel && (
              <div className="flex items-center gap-3 px-3 py-2" style={isToday ? todayStyle : undefined}>
                <WeekStatusIcon status="rest" />
                <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: isToday ? 'var(--color-status)' : 'var(--color-ink-dim)' }}>{dayLabel(date)}</span>
                <div className="min-w-0 flex-1"><LeaveBand label={leaveLabel} /></div>
              </div>
            )}
            {rows.map(({ s, template }) => (
              <SessionRow
                key={s.id}
                session={s}
                template={template}
                date={date}
                templates={templates}
                logs={logs}
                program={program}
                onTap={() => onSelectSession(s)}
                adjusted={!!adjustedIds?.has(s.id)}
                isToday={isToday}
                watch={showWatch ? statusOf(s, template).kind : undefined}
                sign={signOf(logs.find((l) => l.plannedSessionId === s.id))}
              />
            ))}
            {loose.map((l) => (
              <LooseRow key={l.id} log={l} template={templateById.get(l.templateId)} isToday={isToday} onTap={() => onSelectLog?.(l)} sign={signOf(l)} />
            ))}
            {showEmpty && (
              <div className="flex min-h-[64px] items-center gap-3 px-3 py-2" style={isToday ? todayStyle : undefined}>
                <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 rounded-full" style={{ border: '1.5px dashed var(--color-control-border)' }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Vrij</span>
                  <span className="block text-xs leading-4 tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{dayLabel(date)} · niets gepland</span>
                </span>
                {isToday && onAddFree && (
                  <button type="button" onClick={onAddFree} aria-label="Losse training toevoegen" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ color: 'var(--color-action)' }}>
                    <Icon name="plus" size={20} />
                  </button>
                )}
              </div>
            )}
            {advice && (
              <p className="flex flex-wrap items-center gap-x-1.5 px-3 pb-2 pl-[68px] text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                <span style={{ color: advice.avoid ? 'var(--color-warning)' : 'var(--color-progress)' }}>{advice.avoid ? 'Beter niet op één dag' : advice.headline}</span>
                {advice.gapHours && <span>· liefst {advice.gapHours} uur ertussen</span>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
