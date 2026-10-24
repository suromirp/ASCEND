import { useEffect, useMemo, useState } from 'react';
import type { StrengthDoneExtra } from '../components/StrengthDoneElsewhere';
import { useAppData } from '../state/AppDataContext';
import { resolveProgramWeek } from '../utils/dates';
import { addDays, daysBetween, formatDateNL, isoWeekday, mondayOfWeek, todayISO, weekdayShortNL } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { activeIllness, isHeavySession } from '../engine/illness';
import { hillIntervalsDegradingLongRun } from '../engine/recoveryCheck';
import { suggestSameDayOrder } from '../engine/concurrentTraining';
import { dayOrder, orderDay } from '../engine/dayOrder';
import { Icon } from '../components/icons';
import { DayOrderCard } from '../components/DayOrderCard';
import { resolveEffectiveFullDuration, resolveVariantDuration, weeklyProgressionNote } from '../engine/substitutions';
import type { PlannedSession, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { TodayMissionCard } from '../components/TodayMissionCard';
import { NextTrekLine } from '../components/NextTrekLine';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { IllnessStatusCard, NotFitLink } from '../components/IllnessCard';
import { WeightReminder } from '../components/WeightCard';
import { WatchActivityCard } from '../components/WatchActivityCard';
import { WatchAlignCard } from '../components/WatchAlignCard';
import { MacroFactorCard } from '../components/MacroFactorCard';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { DailyStretchCard } from '../components/DailyStretchCard';
import { StandSummaryCard } from '../components/StandSummaryCard';
import { MorningCheckInCard } from '../components/MorningCheckInCard';
import { MorningCard, MorningDeepLink } from '../components/MorningCard';
import { useSleepRefetch } from '../components/useSleepRefetch';
import { useMorningCardVisible } from '../components/useMorningCardVisible';
import { ExportReminderBanner } from '../components/ExportReminderBanner';
import { FreshStartCard } from '../components/FreshStartCard';
import { asPlannedLog } from '../engine/asPlanned';
import { REST_DAY_COPY } from '../data/restDayCopy';
import { ForecastAdjustmentBanner } from '../components/ForecastAdjustmentBanner';
import { ScheduleAnomalyCard } from '../components/ScheduleAnomalyCard';
import { QuoteCard } from '../components/QuoteCard';
import { WeekReviewCard } from '../components/WeekReview';
import { JourneyWeekCard } from '../components/JourneyWeekCard';
import { WeeklyQuestionCard } from '../components/WeeklyQuestionCard';
import { reviewWeekToShow, morningCheckInMode, showWeeklyQuestion } from '../engine/overviewSettings';
import { leaveLabelOn } from '../engine/leave';
import { coachLineForToday } from '../engine/coach';
import { CoachCard } from '../components/CoachCard';
import { AdHocLogSheet } from '../components/AdHocLogSheet';
import { MORNING_ROUTINE, EVENING_ROUTINE } from '../data/stretches';
import { Card, Eyebrow } from '../components/ui';
import { DayRow, YourDay } from '../components/vandaag/DayRow';
import { DoneTodayCard, QuietDayCard } from '../components/vandaag/QuietDayCard';
import { missionFacts } from '../engine/missionFacts';
import { tomorrowEntry, tomorrowText, trainingRowState } from '../engine/yourDay';
import { buildSessionBrief } from '../engine/sessionBrief';
import { racePaces } from '../engine/racePaces';
import { testResults } from '../engine/racePrediction';
import { useLocation, useNavigate } from 'react-router-dom';
import { wantsLogShortcut, withoutShortcut } from '../engine/shortcutAction';
import { dailyQuote } from '../utils/quotes';
import type { ScheduleProposal } from '../engine/scheduler';
import { goalTiming } from '../engine/goalRoute';
import { SkyBand } from '../components/SkyBand';
import { StretchMenuButton } from '../components/StretchMenuButton';
import { WeekStrip } from '../components/vandaag/WeekStrip';
import { zoneOfTemplate } from '../components/vandaag/zone';

export function TodayPage() {
  const { suggestMoves, program, plannedSessions, sessionLogs, settings, strengthExternal, stretchCompletion, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, proposeBackOnPlan, logSession, undoLog, toggleStretchRoutine, exportData, updateSettings, forecastSummary, dismissForecastSummary, templates, leavePeriods, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  // Ochtend vóór 12:00, Avond erna — only one of the two daily routines is
  // ever shown, matched to the current time of day.
  const isMorning = new Date().getHours() < 12;
  const morningCardVisible = useMorningCardVisible();
  useSleepRefetch();
  const [loggingSession, setLoggingSession] = useState<PlannedSession | null>(null);
  const [adHocOpen, setAdHocOpen] = useState(false);
  const [adHocTemplate, setAdHocTemplate] = useState<SessionTemplate | null>(null);
  const [loggingVariant, setLoggingVariant] = useState<SessionVariant>('full');
  // "Gedaan" opens the logger right at the how-did-it-go form.
  const [loggingAtForm, setLoggingAtForm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [actionSheetSession, setActionSheetSession] = useState<PlannedSession | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);

  const position = program ? resolveProgramWeek(program, today) : null;
  const weekStart = mondayOfWeek(today);
  const weekSessions = sessionsForWeek(weekStart);
  // A rest day ASCEND gave up for a training is simply gone, as in Week.
  // Two trainings today: in the advised order (engine/dayOrder.ts).
  const dayOrderAdvice = dayOrder(
    weekSessions.filter((s) => s.scheduledDate === today && !sessionLogs.some((l) => l.plannedSessionId === s.id)),
    plannedSessions.filter((s) => s.scheduledDate === addDays(today, 1)),
    templateById,
  );
  const todaySessions = orderDay(weekSessions.filter((s) => s.scheduledDate === today && !(s.status === 'skipped' && (templateById.get(s.templateId)?.type === 'recovery' || s.leave?.role === 'dropped'))), dayOrderAdvice);
  // No `?? todaySessions[0]` fallback here: .find() only returns undefined
  // when every session today is already completed or skipped, and falling
  // back to one of those would re-show a finished session as if it still
  // needed to be started.
  // While ill, today's mission follows the illness for as long as it lasts,
  // not only the two days cleared when it was reported: nothing with fever
  // or stomach flu, only light sessions with a cold above the neck.
  const illness = activeIllness(settings.illnessEpisodes);
  const allowedWhileIll = (s: PlannedSession) => {
    if (!illness) return true;
    if (illness.kind !== 'above_neck') return false;
    const t = templateById.get(s.templateId);
    return !!t && !isHeavySession(t);
  };
  // A rest day is no training to start or tick off (production feedback:
  // "een herstelmoment ga je niet los loggen"). It gets its own quiet card
  // and never counts in the week's numbers.
  const isRestSession = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';
  const primary = todaySessions.find((s) => !isRestSession(s) && deriveSessionStatus(s, sessionLogs).status !== 'completed' && s.status !== 'skipped' && allowedWhileIll(s));
  const restToday = !primary ? todaySessions.find((s) => isRestSession(s) && s.status !== 'skipped' && !sessionLogs.some((l) => l.plannedSessionId === s.id)) : undefined;
  const allTodayDone = todaySessions.some((s) => !isRestSession(s)) && !primary;
  const anyDoneToday = todaySessions.some((s) => deriveSessionStatus(s, sessionLogs).status === 'completed');

  // A short look-back nudge — only worth showing right at the week
  // boundary (closing out the week that just ended, or opening the new
  // one), not as a permanent fixture crowding every day's Today screen.
  const reviewWeek = reviewWeekToShow(today, isoWeekday(today), settings.overviews);

  // Weekly nudge to back up: local-only storage means a wiped browser/cache
  // means everything is gone. No reference yet (never exported, never
  // dismissed) reads as "always show" as long as there's actually
  // something worth backing up, rather than trying to guess a sensible
  // start date from seed/demo data.
  // Without any backup yet, the clock starts at the first log: a fresh
  // install isn't nagged after its very first session.
  const backupTouchedAt = [settings.lastExportedAt, settings.lastExportReminderDismissedAt].filter((d): d is string => !!d).sort().at(-1);
  const firstLogDate = sessionLogs.map((l) => l.completedDate).sort()[0];
  const reminderReference = backupTouchedAt?.slice(0, 10) ?? firstLogDate;
  const showExportReminder = !!reminderReference && daysBetween(reminderReference, today) >= 7;
  const logsSinceBackup = settings.lastExportedAt ? sessionLogs.filter((l) => l.completedAt > settings.lastExportedAt!).length : sessionLogs.length;

  const quote = dailyQuote(today);
  // On a holiday day (engine/leave.ts) the empty day says so.
  const onHoliday = leaveLabelOn(today, leavePeriods)?.kind === 'off';
  // During and after the main goal nothing is planned (engine/programLayout.ts#planEndDay): say why.
  const mainGoal = trainingGoals.find((g) => g.status === 'active' && goalMilestones.some((m) => m.goalId === g.id));
  const timingNow = mainGoal ? goalTiming(mainGoal, today) : undefined;
  // With maintenance weeks after the goal (AppSettings.afterMainGoal) the days after it are ordinary days.
  const mainTiming = timingNow?.state === 'past' && settings.afterMainGoal === 'maintain' ? undefined : timingNow;

  // A clean move (nothing else has to shift) applies at once, with undo
  // in the notice; anything that pushes another session asks first.
  function handleMove(sessionId: string, date: string) {
    const proposal = moveSession(sessionId, date);
    if (proposal.resolved && proposal.changes.length === 1) void applyProposal(proposal);
    else setPendingProposal(proposal);
  }

  function handleSkip(sessionId: string) {
    setPendingProposal(proposeSkip(sessionId));
  }

  const primaryTemplate = primary ? templateById.get(primary.templateId) : undefined;
  // Two 'worse' Lange Duurloop logs in a row after Heuvel-/Incline-
  // Intervallen is a pattern, not a single off day — only worth a nudge on
  // the day it's actually actionable (Saturday, before you've decided how
  // hard to go into the hill session).
  const longRunDegrading = useMemo(() => hillIntervalsDegradingLongRun(sessionLogs), [sessionLogs]);
  const showRecoveryWarning = longRunDegrading && primaryTemplate?.id === 'tpl_hill_intervals';
  // Sports-science review, item A2 — a soft, never-blocking suggestion when
  // today combines a strength session with a cardio/hiking one.
  // The order card has its own say; the old tip only for what it doesn't cover.
  const concurrentTrainingTip = dayOrderAdvice ? null : suggestSameDayOrder(todaySessions, templateById);
  // The mission's three key numbers; the pace comes from the latest test run.
  const paces = useMemo(() => racePaces(testResults(sessionLogs)), [sessionLogs]);
  const mission = primary && primaryTemplate
    ? missionFacts(primaryTemplate.id, buildSessionBrief(primaryTemplate, primary.scheduledDate, program, { templates }), paces)
    : undefined;
  const tomorrow = tomorrowEntry(today, plannedSessions, templateById, program);
  const tomorrowLine = `Morgen: ${tomorrowText(tomorrow)}`;
  const doneToday = sessionLogs.filter((l) => l.completedDate === today);
  const restMode = settings.restDayMode ?? 'rest';
  const loggingTemplate = loggingSession ? templateById.get(loggingSession.templateId) : undefined;
  const actionSheetTemplate = actionSheetSession ? templateById.get(actionSheetSession.templateId) : undefined;
  const actionSheetLog = actionSheetSession ? sessionLogs.find((l) => l.plannedSessionId === actionSheetSession.id) : undefined;

  // When Settings → Krachttraining "Bijgehouden in MacroFactor" is on,
  // starting a strength session skips the exercise-entry modal entirely —
  // it's logged immediately, one tap, instead of opening ExerciseLogger.
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
      setLoggingVariant(variant);
      setLoggingAtForm(false);
      setLoggingSession(session);
    }
  }

  // Snelkoppeling "Training afvinken": één keer lezen, dan uit het adres halen.
  // Is er vandaag geen training om af te vinken, dan blijft het gewoon Vandaag.
  const [shortcutPending, setShortcutPending] = useState(() => wantsLogShortcut(location.search));
  if (shortcutPending) {
    setShortcutPending(false);
    if (primary) {
      setLoggingVariant('full');
      setLoggingAtForm(true);
      setLoggingSession(primary);
    }
  }
  useEffect(() => {
    if (wantsLogShortcut(location.search)) navigate({ pathname: location.pathname, search: withoutShortcut(location.search) }, { replace: true });
    // Alleen bij het openen van de pagina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restHeader = !!restToday && !primary;
  const trainingRows = todaySessions.filter((s) => !(restToday && s.id === restToday.id));
  const stretchRow = isMorning ? (
    <DailyStretchCard label="Ochtend" title="Rekken" stretches={MORNING_ROUTINE} completed={stretchCompletion.morning === today} onToggleComplete={() => toggleStretchRoutine('morning')} />
  ) : (
    <DailyStretchCard label="Avond" title="Rekken" stretches={EVENING_ROUTINE} completed={stretchCompletion.evening === today} onToggleComplete={() => toggleStretchRoutine('evening')} />
  );

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6">
      {/* De lucht met de kop: merkteken, rekken en het tandwiel, daaronder de
          datum en de week. De schermronde zet de eerste kaart erop. */}
      <SkyBand actions={<StretchMenuButton />}>
        <header className="flex flex-col gap-1">
          <Eyebrow>{weekdayShortNL(today)} {formatDateNL(today)}</Eyebrow>
          {position && (
            <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              Week {position.weekInProgram} van de {position.phase.name.replace(/fase$/i, '').trim().toLowerCase() || position.phase.name.toLowerCase()}{restHeader ? ' · rustdag' : ''}
            </p>
          )}
        </header>
        <WeekStrip weekStart={weekStart} sessions={weekSessions} logs={sessionLogs} templateById={templateById} program={program} today={today} />
      </SkyBand>

      {/* Boven de missie alleen wat echt eerst moet: ziek, nieuw begonnen, back-up. */}
      <IllnessStatusCard />

      <FreshStartCard />

      {showExportReminder && (
        <ExportReminderBanner
          logsSinceBackup={logsSinceBackup}
          neverBackedUp={!settings.lastExportedAt}
          onExport={() => exportData()}
          onDismiss={() => updateSettings({ lastExportReminderDismissedAt: new Date().toISOString() })}
        />
      )}

      {/* De ochtendvraag staat boven de missie: wat je antwoordt kan de dag veranderen. */}
      {morningCardVisible && <MorningCard />}
      <MorningDeepLink />

      {primary && primaryTemplate && mission ? (
        <TodayMissionCard
          session={primary}
          template={primaryTemplate}
          fullDuration={resolveEffectiveFullDuration(primaryTemplate, primary.scheduledDate, program)}
          weekNote={weeklyProgressionNote(primaryTemplate, primary.scheduledDate, program)}
          chips={mission.chips}
          zone={zoneOfTemplate(primaryTemplate, primary.scheduledDate, program, templates)}
          paceNote={mission.paceNote}
          quickComplete={isQuickComplete(primaryTemplate)}
          onStart={(variant, feel, durationMinutes, extra) => startSession(primary, primaryTemplate, variant, feel, durationMinutes, extra)}
          onLog={(variant) => { setLoggingVariant(variant); setLoggingAtForm(true); setLoggingSession(primary); }}
          onShowPlan={() => { setLoggingVariant('full'); setLoggingAtForm(false); setLoggingSession(primary); }}
          onMove={(date) => handleMove(primary.id, date)}
          onSkip={() => handleSkip(primary.id)}
          suggestions={suggestMoves(primary.id)}
          onPickSuggestion={(sug) => void applyProposal(sug.proposal)}
          originalDate={primary.movedFromDate}
          coachLine={coachLineForToday({
            template: primaryTemplate,
            date: primary.scheduledDate,
            program,
            tomorrow: plannedSessions.filter((s) => s.scheduledDate === addDays(today, 1) && s.status !== 'skipped').map((s) => templateById.get(s.templateId)).filter((t): t is SessionTemplate => !!t),
            yesterdayLogs: sessionLogs.filter((l) => l.completedDate === addDays(today, -1)),
            templateById,
          })}
        />
      ) : restToday && !allTodayDone ? (
        <QuietDayCard
          title={REST_DAY_COPY[restMode].title}
          body={REST_DAY_COPY[restMode].valley}
          detail={restMode === 'active' ? REST_DAY_COPY.active.detail : undefined}
          doneLabel={restMode === 'active' ? 'Gedaan' : undefined}
          onDone={() => { const t = templateById.get(restToday.templateId); if (t) void logSession(asPlannedLog(restToday, t, program, today)); }}
          linkLabel={restMode === 'active' ? 'Invullen wat je deed' : 'Toch gewandeld?'}
          onLink={() => { const t = templateById.get(restToday.templateId); if (t) startSession(restToday, t, 'full'); }}
          tomorrow={tomorrowLine}
        />
      ) : allTodayDone && anyDoneToday ? (
        <DoneTodayCard
          title="Klaar voor vandaag"
          line={`${doneToday.map((l) => templateById.get(l.templateId)?.name).filter(Boolean).join(' en ')} gedaan, ${doneToday.reduce((sum, l) => sum + l.durationMinutes, 0)} min`}
          tomorrow={tomorrowLine}
        />
      ) : (
        <QuietDayCard
          title={mainTiming?.state === 'underway' ? `${mainGoal!.name}, dag ${mainTiming.day} van ${mainTiming.days}` : mainTiming?.state === 'past' ? 'Je hoofddoel ligt achter je' : onHoliday ? 'Vakantie' : allTodayDone ? 'Vandaag geen training' : 'Rust of vrije dag'}
          body={mainTiming?.state === 'underway'
            ? 'De tocht is de training. ASCEND plant tot het eind niets.'
            : mainTiming?.state === 'past'
              ? 'Na je hoofddoel plant ASCEND geen training meer. Kies een nieuw doel bij Ascend, of zet dit doel op behaald.'
            : onHoliday
            ? 'Je bent vrij. Er staat niets op de planning.'
            : allTodayDone
              ? illness
                ? 'Je bent ziek gemeld. Rust; wat je nu mist, hoef je niet in te halen.'
                : 'Je training van vandaag is van de planning gehaald. Rust is ook training.'
              : 'Geen training gepland voor vandaag.'}
          tomorrow={tomorrowLine}
        />
      )}

      {/* Direct onder de missie: wat bevestigd moet worden. */}
      <WatchActivityCard />
      <WatchAlignCard />

      <NextTrekLine onlyWhenOn />

      <MacroFactorCard />

      {forecastSummary && (
        <ForecastAdjustmentBanner summary={forecastSummary} onDismiss={dismissForecastSummary} />
      )}

      <ScheduleAnomalyCard />

      {showRecoveryWarning && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>HERSTELSIGNAAL</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
            De lange duurloop voelde de laatste twee weken slechter na de heuvelintervallen. Overweeg vandaag
            rustiger te gaan, minder herhalingen, lagere helling, of een kortere sessie.
          </p>
        </Card>
      )}

      {dayOrderAdvice && <DayOrderCard advice={dayOrderAdvice} sessions={todaySessions} templateById={templateById} />}

      {concurrentTrainingTip && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>TIP VOOR VANDAAG</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{concurrentTrainingTip.reason}</p>
        </Card>
      )}

      <CoachCard />

      {reviewWeek && <WeekReviewCard weekStart={reviewWeek} />}

      <YourDay>
        {isMorning && stretchRow}
        {morningCheckInMode(settings.overviews, today, sessionLogs) !== 'none' && <MorningCheckInCard painOnly={morningCheckInMode(settings.overviews, today, sessionLogs) === 'pain_only'} hideTodo={morningCardVisible} />}
        {trainingRows.map((s) => {
          const t = templateById.get(s.templateId);
          if (!t) return null;
          const { status, wasMoved } = deriveSessionStatus(s, sessionLogs);
          const rest = isRestSession(s);
          const done = status === 'completed';
          const skipped = status === 'skipped';
          return (
            <DayRow
              key={s.id}
              label={done ? 'Gedaan' : 'Training'}
              template={t}
              state={trainingRowState(status, s.id === primary?.id)}
              onClick={() => setActionSheetSession(s)}
              trailing={rest ? REST_DAY_COPY[restMode].badge : `${resolveEffectiveFullDuration(t, s.scheduledDate, program)} min`}
            >
              {rest ? REST_DAY_COPY[restMode].title : t.name}
              {skipped ? <span> · overgeslagen</span> : wasMoved && !done ? <span style={{ color: 'var(--color-status)' }}> · verplaatst</span> : null}
            </DayRow>
          );
        })}
        {!isMorning && stretchRow}
        <JourneyWeekCard />
        {showWeeklyQuestion(settings.overviews) && <WeeklyQuestionCard />}
        <WeightReminder />
        <DayRow label="Morgen" onClick={() => navigate('/week')} trailing={tomorrow.kind === 'training' ? `${tomorrow.minutes} min` : undefined}>
          {tomorrow.kind === 'training' ? tomorrow.name : tomorrowText(tomorrow)}
        </DayRow>
      </YourDay>

      <StandSummaryCard />

      <div className="-mt-2 flex items-center justify-center gap-5">
        <button onClick={() => setAdHocOpen(true)} className="inline-flex min-h-[44px] items-center text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="plus" size={16} className="mr-1" />
          Losse training
        </button>
        {!primary && <NotFitLink plain />}
      </div>

      <QuoteCard quote={quote} />

      {loggingSession && loggingTemplate && (
        <ExerciseLogger
          key={loggingSession.id}
          template={loggingTemplate}
          plannedSessionId={loggingSession.id}
          scheduledDate={loggingSession.scheduledDate}
          program={program}
          initialVariant={loggingVariant}
          startAtForm={loggingAtForm}
          onClose={() => setLoggingSession(null)}
        />
      )}

      {adHocOpen && (
        <AdHocLogSheet
          templates={templates}
          onPick={(t) => { setAdHocOpen(false); setAdHocTemplate(t); }}
          onClose={() => setAdHocOpen(false)}
        />
      )}
      {adHocTemplate && (
        <ExerciseLogger template={adHocTemplate} scheduledDate={today} program={program} onClose={() => setAdHocTemplate(null)} />
      )}

      {actionSheetSession && actionSheetTemplate && (
        <SessionActionSheet
          session={actionSheetSession}
          template={actionSheetTemplate}
          program={program}
          quickComplete={isQuickComplete(actionSheetTemplate)}
          completedLog={actionSheetLog}
          onStart={(variant, feel, durationMinutes, extra) => {
            startSession(actionSheetSession, actionSheetTemplate, variant, feel, durationMinutes, extra);
            setActionSheetSession(null);
          }}
          onLog={(variant) => {
            setLoggingVariant(variant);
            setLoggingAtForm(true);
            setLoggingSession(actionSheetSession);
            setActionSheetSession(null);
          }}
          onMove={(date) => {
            handleMove(actionSheetSession.id, date);
            setActionSheetSession(null);
          }}
          suggestions={suggestMoves(actionSheetSession.id)}
          onPickSuggestion={(sug) => {
            void applyProposal(sug.proposal);
            setActionSheetSession(null);
          }}
          onSkip={() => {
            handleSkip(actionSheetSession.id);
            setActionSheetSession(null);
          }}
          onBackOnPlan={() => {
            const proposal = proposeBackOnPlan(actionSheetSession.id);
            if (proposal.resolved && proposal.changes.length === 1) void applyProposal(proposal);
            else if (proposal.changes.length > 0) setPendingProposal(proposal);
            setActionSheetSession(null);
          }}
          onUndo={() => {
            if (actionSheetLog) undoLog(actionSheetLog.id);
            setActionSheetSession(null);
          }}
          onClose={() => setActionSheetSession(null)}
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
