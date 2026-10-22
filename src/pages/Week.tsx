import { useMemo, useState } from 'react';
import type { StrengthDoneExtra } from '../components/StrengthDoneElsewhere';
import { useAppData } from '../state/AppDataContext';
import { addDays, formatHoursMinutesNL, mondayOfWeek, resolveProgramWeek, todayISO } from '../utils/dates';
import { resolveVariantDuration } from '../engine/substitutions';
import type { PlannedSession, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { WeekPlanner } from '../components/WeekPlanner';
import { ChangeLogCard } from '../components/ChangeLogCard';
import { LeavePeriodsCard } from '../components/LeavePeriods';
import { adjustedSessionReasons } from '../engine/changeLog';
import { SeasonOverview } from '../components/SeasonOverview';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { Card, Eyebrow, SecondaryButton } from '../components/ui';
import { restWeekState } from '../engine/restWeek';
import { repeatState } from '../engine/repeatWeek';
import type { ScheduleProposal } from '../engine/scheduler';
import { asPlannedLog, canTickOffAsPlanned } from '../engine/asPlanned';
import { AdviceItem } from '../components/CoachCard';

const REST_RULES = ['REST-PULL', 'REST-SWAP', 'SKIPPED-KEY-TO-REST'];

export function WeekPage() {
  const { setRestWeekSkipped, setWeekRepeated, suggestMoves, program, sessionLogs, settings, strengthExternal, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, logSession, undoLog, planChangeLog, advice, leavePeriods } = useAppData();
  const adjustedIds = useMemo(() => new Set(adjustedSessionReasons(planChangeLog, todayISO()).keys()), [planChangeLog]);
  const [weekStart, setWeekStart] = useState(mondayOfWeek(todayISO()));
  const [monthView, setMonthView] = useState(false);
  const [selected, setSelected] = useState<PlannedSession | null>(null);
  const [logging, setLogging] = useState<{ session: PlannedSession; variant: SessionVariant } | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);

  // A rest day ASCEND gave up for a catch-up is simply gone, not "skipped".
  // Rest-day proposals show up right where you just moved a training.
  const restAdvice = advice.filter((a) => REST_RULES.includes(a.ruleId) && weekStart <= todayISO() && todayISO() <= addDays(weekStart, 6));
  const extraAdvice = advice.filter((a) => a.ruleId === 'EXTRA-SESSION' && a.proposal?.changes.some((c) => c.newSessionDraft?.weekStartDate === weekStart));
  // What a holiday or a trek let go of is explained by the band on those days: not listed, not counted.
  const sessions = sessionsForWeek(weekStart).filter((s) => !(s.status === 'skipped' && (templateById.get(s.templateId)?.type === 'recovery' || s.leave?.role === 'dropped')));
  const position = program ? resolveProgramWeek(program, weekStart) : null;
  const restWeek = program && weekStart >= mondayOfWeek(todayISO()) ? restWeekState(program, weekStart, sessionLogs, todayISO()) : undefined;
  const repeat = program && weekStart >= mondayOfWeek(todayISO()) ? repeatState(program, weekStart) : undefined;
  const selectedLog = selected ? sessionLogs.find((l) => l.plannedSessionId === selected.id) : undefined;

  // Sum of each planned session's target ('full' variant) duration — an
  // at-a-glance weekly volume, not tied to whether a session is already
  // logged. Mirrors History.tsx's own Trainingstijd stat in including every
  // session type (recovery included), for the same "total time this week
  // asks of you" reading.
  const totalWeekMinutes = sessions.reduce((sum, s) => {
    const template = templateById.get(s.templateId);
    // A rest day is no training time.
    return template && template.type !== 'recovery' ? sum + resolveVariantDuration(template, 'full', s.scheduledDate, program) : sum;
  }, 0);

  // A completed session is still selectable — SessionActionSheet shows an
  // "ongedaan maken" (undo) view for it instead of the start/move/skip one.
  function selectSession(session: PlannedSession) {
    setSelected(session);
  }

  // Mirrors Today.tsx: with Krachttraining "Bijgehouden in MacroFactor" on,
  // starting a strength session logs it immediately instead of opening the
  // exercise-entry modal.
  function isQuickComplete(template?: SessionTemplate) {
    return template?.type === 'strength' && strengthExternal;
  }

  function startSession(session: PlannedSession, template: SessionTemplate, variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number, extra?: StrengthDoneExtra) {
    if (isQuickComplete(template)) {
      logSession({
        plannedSessionId: session.id,
        templateId: template.id,
        type: template.type,
        variant,
        durationMinutes: durationMinutes ?? resolveVariantDuration(template, variant, session.scheduledDate, program),
        subjectiveFeel: feel,
        rpe: extra?.rpe,
        strengthRir: extra?.rir,
        // Ticked off afterwards: it happened on its own day.
        completedDate: session.scheduledDate < todayISO() ? session.scheduledDate : undefined,
      });
    } else {
      setLogging({ session, variant });
    }
  }

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-6 pt-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="text-lg"
          style={{ color: 'var(--color-ink-dim)', visibility: monthView ? 'hidden' : undefined }}
          aria-label="Vorige week"
        >
          ‹
        </button>
        <button
          onClick={() => setMonthView((v) => !v)}
          className="flex flex-col items-center gap-0.5 text-center"
        >
          <Eyebrow>{monthView ? 'JAAROVERZICHT' : position ? `WEEK ${position.weekInProgram} • ${position.phase.name}` : 'WEEK'}</Eyebrow>
          {!monthView && weekStart === mondayOfWeek(todayISO()) && (
            <p className="text-[11px]" style={{ color: 'var(--color-gold)' }}>huidige week</p>
          )}
          {!monthView && totalWeekMinutes > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>
              {formatHoursMinutesNL(totalWeekMinutes)} gepland
            </p>
          )}
          <span className="text-[10px] tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>
            {monthView ? '▴ terug naar week' : '▾ jaaroverzicht'}
          </span>
        </button>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="text-lg"
          style={{ color: 'var(--color-ink-dim)', visibility: monthView ? 'hidden' : undefined }}
          aria-label="Volgende week"
        >
          ›
        </button>
      </div>

      {!monthView && restAdvice.length > 0 && (
        <Card className="flex flex-col gap-3" texture>
          <Eyebrow>RUSTDAG</Eyebrow>
          {restAdvice.map((a) => (
            <div key={a.id}>
              <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{a.title}</p>
              <AdviceItem advice={a} compact />
            </div>
          ))}
        </Card>
      )}

      {!monthView && restWeek?.isRestWeek && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>{restWeek.skipped ? 'RUSTWEEK OVERGESLAGEN' : 'RUSTWEEK'}</Eyebrow>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            {restWeek.skipped
              ? 'Je traint deze week door, als een normale opbouwweek. Voelen je benen zwaar, slaap je slecht of gaat het tempo bij dezelfde hartslag omlaag? Zet de rustweek dan terug.'
              : 'Deze week schakel je terug, zodat de opbouw van de vorige weken binnenkomt. Voel je je fris en ging alles goed? Dan kun je doortrainen: de week wordt een normale opbouwweek, geen tweede zwaarste week.'}
          </p>
          {restWeek.skipped ? (
            <SecondaryButton onClick={() => void setRestWeekSkipped(weekStart, false)}>RUSTWEEK TERUGZETTEN</SecondaryButton>
          ) : restWeek.canSkip ? (
            <SecondaryButton onClick={() => void setRestWeekSkipped(weekStart, true)}>DOORTRAINEN</SecondaryButton>
          ) : restWeek.reason ? (
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{restWeek.reason}</p>
          ) : null}
        </Card>
      )}

      {!monthView && repeat?.repeated && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>DEZE WEEK NOG EEN KEER</Eyebrow>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            Je minuten, hoogtemeters en rugzak blijven op het niveau van vorige week, in plaats van een stap omhoog. De rustweek en de weken daarna staan nog op de kalender. Gaat het toch goed? Dan kun je de herhaling terugzetten.
          </p>
          <SecondaryButton onClick={() => void setWeekRepeated(weekStart, false)}>HERHALING TERUGZETTEN</SecondaryButton>
        </Card>
      )}

      {!monthView && repeat?.shifted && !repeat.repeated && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>EEN STAP ACHTER</Eyebrow>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            Eerder in deze golf herhaalde je een week. Deze week bouwt daarom een stap achter op de kalender; de rustweek en de volgende golf lopen weer gewoon door.
          </p>
        </Card>
      )}

      {!monthView && extraAdvice.length > 0 && (
        <Card className="flex flex-col gap-3" texture>
          <Eyebrow>EXTRA TRAINING</Eyebrow>
          {extraAdvice.map((a) => (
            <div key={a.id}>
              <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{a.title}</p>
              <AdviceItem advice={a} compact />
            </div>
          ))}
        </Card>
      )}

      {monthView ? (
        <SeasonOverview
          onSelectWeek={(w) => {
            setWeekStart(mondayOfWeek(w));
            setMonthView(false);
            window.scrollTo({ top: 0 });
          }}
        />
      ) : (
        <WeekPlanner
          weekStartDate={weekStart}
          sessions={sessions}
          templateById={templateById}
          logs={sessionLogs}
          program={program}
          onSelectSession={selectSession}
          adjustedIds={adjustedIds}
          leave={leavePeriods}
        />
      )}

      {!monthView && <ChangeLogCard weekStart={weekStart} />}
      {!monthView && <LeavePeriodsCard />}

      {selected && templateById.get(selected.templateId) && (
        <SessionActionSheet
          session={selected}
          template={templateById.get(selected.templateId)!}
          program={program}
          quickComplete={isQuickComplete(templateById.get(selected.templateId))}
          completedLog={selectedLog}
          onDoneAsPlanned={!selectedLog && selected.scheduledDate <= todayISO() && canTickOffAsPlanned(templateById.get(selected.templateId)!, strengthExternal, settings.restDayMode)
            ? () => {
                void logSession(asPlannedLog(selected, templateById.get(selected.templateId)!, program, todayISO()));
                setSelected(null);
              }
            : undefined}
          onStart={(variant, feel, durationMinutes, extra) => {
            startSession(selected, templateById.get(selected.templateId)!, variant, feel, durationMinutes, extra);
            setSelected(null);
          }}
          onMove={(date) => {
            // Clean move: apply at once (undo in the notice); a cascade asks first.
            const proposal = moveSession(selected.id, date);
            if (proposal.resolved && proposal.changes.length === 1) void applyProposal(proposal);
            else setPendingProposal(proposal);
            setSelected(null);
          }}
          suggestions={suggestMoves(selected.id)}
          onPickSuggestion={(sug) => {
            void applyProposal(sug.proposal);
            setSelected(null);
          }}
          onSkip={() => {
            setPendingProposal(proposeSkip(selected.id));
            setSelected(null);
          }}
          onUndo={() => {
            if (selectedLog) undoLog(selectedLog.id);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {logging && templateById.get(logging.session.templateId) && (
        <ExerciseLogger
          template={templateById.get(logging.session.templateId)!}
          plannedSessionId={logging.session.id}
          scheduledDate={logging.session.scheduledDate}
          program={program}
          initialVariant={logging.variant}
          onClose={() => setLogging(null)}
        />
      )}

      {pendingProposal && (
        <RescheduleDialog
          proposal={pendingProposal}
          onApply={() => {
            applyProposal(pendingProposal);
            setPendingProposal(null);
          }}
          onCancel={() => setPendingProposal(null)}
        />
      )}
    </div>
  );
}
