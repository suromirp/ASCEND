import { useMemo, useState } from 'react';
import { usePageState } from '../components/usePageState';
import { useBackToClose } from '../utils/useBackToClose';
import { scrollMainToTop } from '../utils/scrollMain';
import { buildWeekReview } from '../engine/weekReview';
import { dayLoads, weekMinutes, weekProgress } from '../engine/weekProfile';
import { WeekRidge } from '../components/WeekRidge';
import { WeekReviewSheet } from '../components/WeekReview';
import { ChevronIcon, MapIcon } from '../components/WeekIcons';
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
  const { setRestWeekSkipped, setWeekRepeated, suggestMoves, program, plannedSessions, templates, sessionLogs, settings, strengthExternal, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, proposeBackOnPlan, logSession, undoLog, planChangeLog, advice, leavePeriods } = useAppData();
  const adjustedIds = useMemo(() => new Set(adjustedSessionReasons(planChangeLog, todayISO()).keys()), [planChangeLog]);
  // The chosen week and the year overview belong to this step in the history:
  // to a training and back, the page is as you left it.
  const [weekStart, setWeekStart] = usePageState('weekStart', mondayOfWeek(todayISO()));
  const [monthView, setMonthView] = usePageState('monthView', false);
  // The back button leaves the year overview first, then the page.
  useBackToClose(monthView, () => { setMonthView(false); scrollMainToTop(); });
  const [selected, setSelected] = useState<PlannedSession | null>(null);
  const [logging, setLogging] = useState<{ session: PlannedSession; variant: SessionVariant } | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

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

  // The time this week asks: open trainings at their planned length, done ones
  // at the length they took, a skipped training and a rest day not at all
  // (engine/weekProfile.ts#weekMinutes).
  const totalWeekMinutes = weekMinutes(sessions, sessionLogs, templateById, (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program));

  // De bergkam: belasting per dag van deze week en van de week ervoor (engine/weekProfile.ts).
  const today = todayISO();
  const profile = useMemo(() => {
    const minutesOf = (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program);
    return {
      days: dayLoads({ weekStart, plannedSessions, logs: sessionLogs, templates, today, minutesOf }),
      previous: dayLoads({ weekStart: addDays(weekStart, -7), plannedSessions, logs: sessionLogs, templates, today, minutesOf }),
    };
  }, [weekStart, plannedSessions, sessionLogs, templates, today, program]);
  const progress = weekProgress(sessions, sessionLogs, templateById);
  const review = weekStart <= today ? buildWeekReview({ weekStart, plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: today, illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks }) : null;
  const phaseName = position ? position.phase.name.replace(/fase$/i, '') || position.phase.name : '';

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
      <header className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center"
          style={{ color: 'var(--color-ink-dim)', visibility: monthView ? 'hidden' : undefined }}
          aria-label="Vorige week"
        >
          <ChevronIcon dir="left" />
        </button>
        <div className="flex flex-col items-center gap-1 text-center">
          <Eyebrow>{monthView ? 'Jaaroverzicht' : position ? `Week ${position.weekInProgram} · ${phaseName}` : 'Week'}</Eyebrow>
          {monthView && (
            <button onClick={() => { setMonthView(false); scrollMainToTop(); }} className="min-h-[44px] text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>
              Terug naar de week
            </button>
          )}
          {!monthView && (
            <p className="text-[13px] tabular-nums" style={{ color: 'var(--color-ink)' }}>
              {totalWeekMinutes > 0 ? `${formatHoursMinutesNL(totalWeekMinutes)} gepland` : 'Niets gepland'}
              {progress.total > 0 && <span style={{ color: 'var(--color-ink-dim)' }}> · {progress.done} van {progress.total} gedaan</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center"
          style={{ color: 'var(--color-ink-dim)', visibility: monthView ? 'hidden' : undefined }}
          aria-label="Volgende week"
        >
          <ChevronIcon dir="right" />
        </button>
      </header>

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
            scrollMainToTop();
          }}
        />
      ) : (
        <>
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
          <WeekRidge days={profile.days} previous={profile.previous} today={today} />
        </>
      )}

      <div className="-mt-1 flex items-center justify-between">
        <button
          onClick={() => {
            setMonthView((v) => !v);
            scrollMainToTop();
          }}
          className="flex min-h-[44px] items-center gap-1.5 text-sm font-medium"
          style={{ color: 'var(--color-ink-dim)' }}
        >
          <MapIcon />
          {monthView ? 'Terug naar de week' : 'Jaaroverzicht'}
        </button>
        {!monthView && review && review.planned > 0 && (
          <button onClick={() => setReviewOpen(true)} className="flex min-h-[44px] items-center gap-0.5 text-sm font-medium" style={{ color: 'var(--color-ink-dim)' }}>
            Weekterugblik
            <ChevronIcon dir="right" />
          </button>
        )}
      </div>
      {!monthView && weekStart !== mondayOfWeek(today) && (
        <button
          onClick={() => setWeekStart(mondayOfWeek(today))}
          className="-mt-2 flex min-h-[44px] items-center self-start text-sm font-medium"
          style={{ color: 'var(--color-ink-dim)' }}
        >
          Naar deze week
        </button>
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
            <SecondaryButton onClick={() => void setRestWeekSkipped(weekStart, false)}>Rustweek terugzetten</SecondaryButton>
          ) : restWeek.canSkip ? (
            <SecondaryButton onClick={() => void setRestWeekSkipped(weekStart, true)}>Doortrainen</SecondaryButton>
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
          <SecondaryButton onClick={() => void setWeekRepeated(weekStart, false)}>Herhaling terugzetten</SecondaryButton>
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

      {reviewOpen && review && <WeekReviewSheet review={review} onClose={() => setReviewOpen(false)} />}

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
          onBackOnPlan={() => {
            // Fits on its day: back at once (undo in the notice); a clash asks first.
            const proposal = proposeBackOnPlan(selected.id);
            if (proposal.resolved && proposal.changes.length === 1) void applyProposal(proposal);
            else if (proposal.changes.length > 0) setPendingProposal(proposal);
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
