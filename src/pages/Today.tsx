import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StrengthDoneExtra } from '../components/StrengthDoneElsewhere';
import { useAppData } from '../state/AppDataContext';
import { resolveProgramWeek } from '../utils/dates';
import { weekPositionLabel } from '../engine/weekLabel';
import { waveHeader } from '../engine/programLayout';
import { addDays, daysBetween, formatDateNL, isoWeekday, mondayOfWeek, todayISO, weekdayShortNL, localDateOf } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { activeIllness, isHeavySession, recoveryRamp } from '../engine/illness';
import { QUIET_TODAY_LINES, capAboveMission, isSafetyCard, placeTodayCards, resolveAboveMission, type TodayCardId } from '../engine/todayCards';
import { hasRole } from '../engine/templateRoles';
import { hillIntervalsDegradingLongRun } from '../engine/recoveryCheck';
import { suggestSameDayOrder } from '../engine/concurrentTraining';
import { dayOrder, orderDay } from '../engine/dayOrder';
import { Icon } from '../components/icons';
import { DayOrderCard } from '../components/DayOrderCard';
import { resolveEffectiveFullDuration, resolveVariantDuration, weeklyProgressionNote } from '../engine/substitutions';
import type { PlannedSession, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { TodayMissionCard } from '../components/TodayMissionCard';
import { EveningBeforeCard } from '../components/EveningBeforeCard';
import { NextTrekLine } from '../components/NextTrekLine';
import { MountainWeatherCard } from '../components/MountainWeatherCard';
import { StagePositionLine } from '../components/StagePositionLine';
import { TestPendingLine } from '../components/TestPendingLine';
import { SportAskLine } from '../components/sports/SportAskLine';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { IllnessStatusCard, NotFitLink } from '../components/IllnessCard';
import { WeightReminder } from '../components/WeightCard';
import { useCheckInRow, useJourneyRow, useWeightRow } from '../components/vandaag/yourDayRows';
import { WatchActivityCard } from '../components/WatchActivityCard';
import { WatchAskSheet } from '../components/WatchAskSheet';
import { useWatchQuestion } from '../components/vandaag/useWatchQuestion';
import { afterRunTitle, AFTER_RUN_TEXT, resolveAfterRunQuestions, withoutAskedTraining } from '../engine/afterRun';
import { WatchAlignCard } from '../components/WatchAlignCard';
import { MissedTrainingCard } from '../components/MissedTrainingCard';
import { useMissedTraining } from '../components/useMissedTraining';
import { SourceSilenceLine } from '../components/SourceSilenceLine';
import { IllnessSignCard } from '../components/IllnessSignCard';
import { useIllnessSign } from '../components/useIllnessSign';
import { WeatherWarningCard } from '../components/WeatherWarningCard';
import { useWeatherWarnings } from '../components/useWeatherWarnings';
import { MacroFactorCard } from '../components/MacroFactorCard';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { DailyStretchCard } from '../components/DailyStretchCard';
import { StandSummaryCard } from '../components/StandSummaryCard';
import { MorningCheckInCard } from '../components/MorningCheckInCard';
import { MorningCard, MorningDeepLink } from '../components/MorningCard';
import { useSleepRefetch } from '../components/useSleepRefetch';
import { useMorningCardVisible } from '../components/useMorningCardVisible';
import { ExportReminderBanner } from '../components/ExportReminderBanner';
import { useAutoBackupStatus } from '../components/useAutoBackupStatus';
import { backupOutcomeText } from '../engine/manualBackup';
import { autoBackupFailureText, backupCardOnToday, resolveAutoBackup } from '../engine/autoBackup';
import { FreshStartCard } from '../components/FreshStartCard';
import { useFreshStart } from '../components/useFreshStart';
import { StartWelcome } from '../components/start/StartWelcome';
import { needsFirstPlan } from '../engine/freshStart';
import { asPlannedLog } from '../engine/asPlanned';
import { REST_DAY_COPY } from '../data/restDayCopy';
import { ForecastAdjustmentBanner } from '../components/ForecastAdjustmentBanner';
import { ScheduleAnomalyCard } from '../components/ScheduleAnomalyCard';
import { QuoteCard } from '../components/QuoteCard';
import { WeekReviewCard } from '../components/WeekReview';
import { BodyCheckCard } from '../components/BodyCheckCard';
import { JourneyWeekCard } from '../components/JourneyWeekCard';
import { WeeklyQuestionCard } from '../components/WeeklyQuestionCard';
import { reviewWeekToShow, morningCheckInMode, showWeeklyQuestion } from '../engine/overviewSettings';
import { leaveLabelOn } from '../engine/leave';
import { coachLineForToday } from '../engine/coach';
import { CoachCard } from '../components/CoachCard';
import { LegEaseCard } from '../components/LegEaseCard';
import { InfluenceMoveCard } from '../components/influence/InfluenceMoveCard';
import { MorningProposalCard } from '../components/MorningProposalCard';
import { AdHocLogSheet } from '../components/AdHocLogSheet';
import { MORNING_ROUTINE, EVENING_ROUTINE } from '../data/stretches';
import { Card, Eyebrow } from '../components/ui';
import { DayRow, YourDay, type YourDayEntry } from '../components/vandaag/DayRow';
import { DoneTodayCard, QuietDayCard } from '../components/vandaag/QuietDayCard';
import { missionFacts } from '../engine/missionFacts';
import { recentRunPace } from '../engine/recentRunPace';
import { standTomorrow, tomorrowEntry, tomorrowText, trainingRowState, trainingRowsForYourDay } from '../engine/yourDay';
import { buildSessionBrief } from '../engine/sessionBrief';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { useLocation, useNavigate } from 'react-router-dom';
import { wantsLogShortcut, withoutShortcut } from '../engine/shortcutAction';
import { resolveQuoteLanguage } from '../engine/quoteSettings';
import { dailyQuote } from '../utils/quotes';
import type { ScheduleProposal } from '../engine/scheduler';
import { goalTiming } from '../engine/goalRoute';
import { SkyBand } from '../components/SkyBand';
import { StretchMenuButton } from '../components/StretchMenuButton';
import { WeekStrip } from '../components/vandaag/WeekStrip';
import { zoneOfTemplate } from '../components/vandaag/zone';
import { logDay, plannedByIdOf } from '../engine/logDay';
import { mainGoal as findMainGoal } from '../engine/mainGoal';
import { planShorter, resolveShorterToday, shorterAdvice } from '../engine/shorterToday';
import type { Advice } from '../engine/adviceEngine';
import { ProposalSheet } from '../components/ProposalSheet';

function TodayContent() {
  const { advice, suggestMoves, program, plannedSessions, sessionLogs, settings, strengthExternal, stretchCompletion, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, proposeBackOnPlan, logSession, undoLog, toggleStretchRoutine, exportData, updateSettings, forecastSummary, dismissForecastSummary, templates, leavePeriods, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  // Ochtend vóór 12:00, Avond erna — only one of the two daily routines is
  // ever shown, matched to the current time of day.
  const isMorning = new Date().getHours() < 12;
  const morningCardVisible = useMorningCardVisible();
  // Of de rijen van Je dag er staan, met dezelfde regels als de rijen zelf.
  const checkInRow = useCheckInRow({ painOnly: morningCheckInMode(settings.overviews, today, sessionLogs) === 'pain_only', hideTodo: morningCardVisible });
  const weightRow = useWeightRow();
  const journeyRow = useJourneyRow();
  // Hoe ging het? na een training die je horloge afvinkte: een rij bovenaan Je dag (engine/afterRun.ts).
  const watchQuestion = useWatchQuestion();
  const [watchAskOpen, setWatchAskOpen] = useState(false);
  // De vraag is weg (beantwoord, Klopt niet, of ouder dan 72 uur): het blad ook, zodat een volgende vraag niet vanzelf opent.
  if (watchAskOpen && !watchQuestion) setWatchAskOpen(false);
  useSleepRefetch();
  const illnessSignState = useIllnessSign();
  const weatherWarnings = useWeatherWarnings();
  const freshStart = useFreshStart();
  const missed = useMissedTraining();
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
  // "Minder tijd vandaag": het voorstel met wat er verandert (engine/shorterToday.ts).
  const [shorter, setShorter] = useState<{ advice: Advice; lines: string[] } | null>(null);

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
  const reminderReference = (backupTouchedAt ? localDateOf(backupTouchedAt) : undefined) ?? firstLogDate;
  const reminderDue = !!reminderReference && daysBetween(reminderReference, today) >= 7;
  // Met de automatische back-up aan komt de kaart op zijn moment, onder de missie; uit blijft de
  // herinnering na 7 dagen (engine/autoBackup.ts#backupCardOnToday).
  const autoBackup = useAutoBackupStatus();
  const backupCard = backupCardOnToday({
    frequency: resolveAutoBackup(settings.autoBackup),
    now: new Date(),
    lastBackupAt: settings.lastExportedAt,
    dismissedAt: settings.lastExportReminderDismissedAt,
    hasData: sessionLogs.length > 0 || plannedSessions.length > 0,
    checked: autoBackup.checked,
    reminderDue,
  });
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupResult, setBackupResult] = useState<{ text: string; ok: boolean } | undefined>();
  // Back-up maken vanaf de kaart; de uitkomst blijft zichtbaar, ook als de kaart na een gelukte back-up
  // anders weg zou zijn.
  const makeBackup = async () => {
    setBackupBusy(true);
    setBackupResult(undefined);
    try {
      const outcome = await exportData();
      const text = backupOutcomeText(outcome);
      if (text) setBackupResult({ text, ok: outcome.status !== 'failed' });
    } finally {
      setBackupBusy(false);
    }
  };
  const backupResultProps = { busy: backupBusy, result: backupResult, onDismissResult: () => setBackupResult(undefined) };
  const showExportReminder = backupCard === 'reminder' || (backupCard === null && !!backupResult);
  const logsSinceBackup = settings.lastExportedAt ? sessionLogs.filter((l) => l.completedAt > settings.lastExportedAt!).length : sessionLogs.length;

  const quoteLanguage = resolveQuoteLanguage(settings);
  const quote = dailyQuote(today, quoteLanguage === 'off' ? undefined : quoteLanguage);
  // On a holiday day (engine/leave.ts) the empty day says so.
  const onHoliday = leaveLabelOn(today, leavePeriods)?.kind === 'off';
  // During and after the main goal nothing is planned (engine/programLayout.ts#planEndDay): say why.
  const mainGoal = findMainGoal(trainingGoals, goalMilestones);
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
  const showRecoveryWarning = longRunDegrading && !!primaryTemplate && hasRole(primaryTemplate, 'hills');
  // Sports-science review, item A2 — a soft, never-blocking suggestion when
  // today combines a strength session with a cardio/hiking one.
  // The order card has its own say; the old tip only for what it doesn't cover.
  const concurrentTrainingTip = dayOrderAdvice ? null : suggestSameDayOrder(todaySessions, templateById);
  // The mission's three key numbers; the pace comes from the latest test run.
  const paces = useMemo(() => pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces, [sessionLogs, settings]);
  const recentPaceOfRuns = primaryTemplate ? recentRunPace(sessionLogs, primaryTemplate.id, today) : undefined;
  const mission = primary && primaryTemplate
    ? missionFacts(primaryTemplate.id, buildSessionBrief(primaryTemplate, primary.scheduledDate, program, { templates }), paces, resolveEffectiveFullDuration(primaryTemplate, primary.scheduledDate, program), recentPaceOfRuns?.range, recentPaceOfRuns?.runs)
    : undefined;
  const tomorrow = tomorrowEntry(today, plannedSessions, templateById, program);
  const tomorrowLine = `Morgen: ${tomorrowText(tomorrow)}`;
  // Een stille dag zegt al dat er niets staat; "Morgen: Niets gepland" erachter herhaalt dat alleen.
  const quietTomorrow = tomorrow.kind === 'none' ? undefined : tomorrowLine;
  // Gedaan vandaag: een log die vandaag telt (engine/logDay.ts: een training uit MacroFactor die gisteren begon
  // en vandaag afliep draagt de datum van het bestand, maar telt op de dag van zijn geplande training).
  const plannedById = plannedByIdOf(plannedSessions);
  const doneToday = sessionLogs.filter((l) => logDay(l, plannedById) === today);
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
  // De training die de rij Hoe ging het? al noemt staat er niet nog eens als gedaan (regel 1).
  const askedPlannedId = watchQuestion?.question.log.plannedSessionId;
  const trainingRows = trainingRowsForYourDay(
    withoutAskedTraining(todaySessions.filter((s) => !(restToday && s.id === restToday.id)), askedPlannedId),
    primary?.id,
    (s) => deriveSessionStatus(s, sessionLogs).status,
  );
  const stretchRow = isMorning ? (
    <DailyStretchCard label="Ochtend" title="Rekken" stretches={MORNING_ROUTINE} completed={stretchCompletion.morning === today} onToggleComplete={() => toggleStretchRoutine('morning')} />
  ) : (
    <DailyStretchCard label="Avond" title="Rekken" stretches={EVENING_ROUTINE} completed={stretchCompletion.evening === today} onToggleComplete={() => toggleStretchRoutine('evening')} />
  );

  // De rijen van Je dag, elk met of hij af is; de volgorde en de grens van vier doet engine/yourDay.ts.
  const checkInMode = morningCheckInMode(settings.overviews, today, sessionLogs);
  const yourDayItems: YourDayEntry[] = [];
  if (watchQuestion) {
    const t = watchQuestion.template;
    yourDayItems.push({
      key: 'watch',
      kind: 'watch',
      done: false,
      word: 'hoe ging het',
      node: (
        <DayRow label={AFTER_RUN_TEXT.row} template={t} onClick={() => setWatchAskOpen(true)} sheetFrom>
          {afterRunTitle(t?.name)}
        </DayRow>
      ),
    });
  }
  if (checkInMode !== 'none' && checkInRow.shown) {
    yourDayItems.push({ key: 'checkin', kind: 'checkin', done: checkInRow.done, pain: checkInRow.pain, word: checkInRow.pain ? 'pijnplek' : 'gevoel', node: <MorningCheckInCard painOnly={checkInMode === 'pain_only'} hideTodo={morningCardVisible} /> });
  }
  for (const s of trainingRows) {
    const t = templateById.get(s.templateId);
    if (!t) continue;
    const { status, wasMoved } = deriveSessionStatus(s, sessionLogs);
    const rest = isRestSession(s);
    const done = status === 'completed';
    const skipped = status === 'skipped';
    yourDayItems.push({
      key: `training-${s.id}`,
      kind: 'training',
      done: done || skipped,
      word: rest ? REST_DAY_COPY[restMode].title : t.name,
      node: (
        <DayRow
          label={done ? 'Gedaan' : 'Training'}
          template={t}
          state={trainingRowState(status, false)}
          onClick={() => setActionSheetSession(s)}
          sheetFrom
          trailing={rest ? REST_DAY_COPY[restMode].badge : `${resolveEffectiveFullDuration(t, s.scheduledDate, program)} min`}
        >
          {rest ? REST_DAY_COPY[restMode].title : t.name}
          {skipped ? <span> · overgeslagen</span> : wasMoved && !done ? <span> · verplaatst</span> : null}
        </DayRow>
      ),
    });
  }
  yourDayItems.push({ key: 'stretch', kind: 'stretch', done: isMorning ? stretchCompletion.morning === today : stretchCompletion.evening === today, word: 'rekken', node: stretchRow });
  if (weightRow.shown) yourDayItems.push({ key: 'weight', kind: 'weight', done: false, word: 'gewicht', node: <WeightReminder /> });
  if (journeyRow.shown && !(journeyRow.journey.pick?.state === 'postponed')) yourDayItems.push({ key: 'journey', kind: 'journey', done: journeyRow.done, word: 'reis', node: <JourneyWeekCard /> });

  const shorterSetting = resolveShorterToday(settings.shorterToday);
  function proposeShorter(session: PlannedSession, template: SessionTemplate, minutes: number) {
    if (shorterSetting === 'off') return;
    const plan = planShorter({ template, fullMinutes: resolveEffectiveFullDuration(template, session.scheduledDate, program), available: minutes, how: shorterSetting });
    if (plan.kind !== 'ok') return;
    setShorter({ advice: shorterAdvice({ session, template, plan, now: new Date().toISOString() }), lines: plan.lines });
  }

  // Regel 5: één gevulde mint knop op Vandaag. Heeft de missie hem (een training, of Gedaan op een hersteldag), dan
  // zijn de knoppen op de andere kaarten omlijnd; een beslissing is altijd omlijnd (regel 6, besluit
  // 2026-11-12-missiekaart.md).
  const missionMint = !!(primary && primaryTemplate && mission) || (!!restToday && !allTodayDone && restMode === 'active');

  // De missie: je training van vandaag, of de rustige kaart van een dag zonder.
  const missionCard: ReactNode = primary && primaryTemplate && mission ? (
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
      onShorter={shorterSetting === 'off' ? undefined : (minutes) => proposeShorter(primary, primaryTemplate, minutes)}
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
      tomorrow={quietTomorrow}
    />
  ) : allTodayDone && anyDoneToday ? (
    <DoneTodayCard
      title="Vandaag zit erop"
      line={`${doneToday.map((l) => templateById.get(l.templateId)?.name).filter(Boolean).join(' en ')} gedaan, ${doneToday.reduce((sum, l) => sum + l.durationMinutes, 0)} min`}
      tomorrow={tomorrowLine}
    />
  ) : (
    <QuietDayCard
      title={mainTiming?.state === 'underway' ? `${mainGoal!.name}, dag ${mainTiming.day} van ${mainTiming.days}` : mainTiming?.state === 'past' ? 'Je hoofddoel ligt achter je' : onHoliday ? 'Vakantie' : allTodayDone ? 'Vandaag geen training' : 'Rust of vrije dag'}
      body={mainTiming?.state === 'underway'
        ? 'De tocht is je training. Tot het eind plant ASCEND niets.'
        : mainTiming?.state === 'past'
          ? 'Na je hoofddoel plant ASCEND niets meer. Kies een nieuw doel bij Ascend.'
        : onHoliday
        ? 'Vrij vandaag. Er staat niets op de planning.'
        : allTodayDone
          ? illness
            ? 'Je bent ziek gemeld. Rust uit. Wat je mist, hoef je niet in te halen.'
            : 'Je training van vandaag is van de planning gehaald. Rust is ook training.'
          : 'Vandaag staat er niets gepland.'}
      tomorrow={quietTomorrow}
    />
  );

  // De kaarten die met de missie om de plek bovenaan concurreren, en waar ze nu staan.
  const presentCards: TodayCardId[] = [
    ...(illness ? (['ill'] as const) : []),
    ...(illnessSignState.shown ? (['illnessSign'] as const) : []),
    ...(weatherWarnings.shown ? (['weatherWarning'] as const) : []),
    ...(morningCardVisible ? (['morning'] as const) : []),
    ...(!illness && recoveryRamp(settings.illnessEpisodes, today) ? (['ramp'] as const) : []),
    ...(advice.length > 0 ? (['advice'] as const) : []),
    ...(missed.item ? (['missed'] as const) : []),
    ...(freshStart.shown ? (['freshStart'] as const) : []),
    ...(showExportReminder ? (['backup'] as const) : []),
    ...(backupCard === 'due' ? (['backupDue'] as const) : []),
    // De rustige regels weten zelf of ze er zijn; ze staan altijd onder de missie, op hun plek in de rij.
    ...QUIET_TODAY_LINES,
  ];
  // Hoogstens twee boven de missie; een vraag over vandaag direct eronder, een melding die niet over vandaag gaat
  // onder Je dag (engine/todayCards.ts#placeTodayCards, regel 6).
  const aboveLimit = capAboveMission(resolveAboveMission(settings.cardsAboveMission));
  const placement = placeTodayCards(presentCards, aboveLimit);
  // Elke kaart in een omhulsel zonder eigen vak (`contents`), zodat de tekstkaart kan tellen wat boven de missie
  // staat (scripts/app-kaart/kaart.mjs, invariant "Hoogstens het afgesproken aantal kaarten boven de missie").
  const around = (id: TodayCardId) => (
    <div key={id} className="contents" data-today-card={id} data-today-safety={isSafetyCard(id) ? '' : undefined}>
      {aroundMission[id]}
    </div>
  );
  const aroundMission: Record<TodayCardId, ReactNode> = {
    // Ziek gemeld, of weer opbouwen: dezelfde kaart, op een andere plek in de volgorde.
    ill: <IllnessStatusCard quiet={missionMint} />,
    ramp: <IllnessStatusCard quiet={missionMint} />,
    // Rusthartslag en HRV wijken een paar ochtenden samen af: een vraag, geen waarschuwing.
    illnessSign: <IllnessSignCard state={illnessSignState} />,
    // Onweer, storm, hitte of lawinegevaar bij een tocht of een lange training buiten: het feit, altijd helemaal.
    weatherWarning: <WeatherWarningCard state={weatherWarnings} />,
    // De ochtendvraag: wat je antwoordt kan de dag veranderen.
    morning: <MorningCard />,
    advice: <CoachCard />,
    // Een training die niet doorging: één vraag of een koppelvoorstel, de oudste eerst (engine/missedTraining.ts).
    missed: <MissedTrainingCard state={missed} onLogNow={setActionSheetSession} />,
    freshStart: <FreshStartCard state={freshStart} quiet={missionMint || !!illness} />,
    // Een etappe van vandaag met coordinaten en Je locatie aan: hoeveel nog tot het eind (engine/stagePosition.ts).
    stagePosition: <StagePositionLine />,
    // Een sport van je horloge zonder gekozen rol: een rustige vraag, geen kaart (docs/visie/Sporten die meetellen.md, 2.5).
    sportAsk: <SportAskLine />,
    backup: (
      <ExportReminderBanner
        logsSinceBackup={logsSinceBackup}
        neverBackedUp={!settings.lastExportedAt}
        onExport={() => void makeBackup()}
        {...backupResultProps}
        onDismiss={() => updateSettings({ lastExportReminderDismissedAt: new Date().toISOString() })}
      />
    ),
    backupDue: (
      <ExportReminderBanner
        due
        logsSinceBackup={logsSinceBackup}
        neverBackedUp={!settings.lastExportedAt}
        failure={autoBackup.failure ? autoBackupFailureText(autoBackup.failure.reason, autoBackup.platform) : undefined}
        onExport={() => void makeBackup()}
        {...backupResultProps}
        onDismiss={() => updateSettings({ lastExportReminderDismissedAt: new Date().toISOString() })}
      />
    ),
  };

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6">
      {/* De lucht met de kop: merkteken, rekken en het tandwiel, daaronder de
          datum en de week. De schermronde zet de eerste kaart erop. */}
      <SkyBand actions={<StretchMenuButton />}>
        <header className="flex flex-col gap-1">
          <Eyebrow>{weekdayShortNL(today)} {formatDateNL(today)}</Eyebrow>
          {position && (
            <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              {waveHeader(position) ?? weekPositionLabel(position)}{restHeader ? ' · rustdag' : ''}
            </p>
          )}
        </header>
        <WeekStrip weekStart={weekStart} sessions={weekSessions} logs={sessionLogs} templateById={templateById} program={program} today={today} />
      </SkyBand>

      {/* Kaarten rond de missie in een vaste volgorde, hoogstens twee erboven (engine/todayCards.ts,
          docs/beslissingen/2026-11-01-vandaag-volgorde.md en 2026-11-12-missiekaart.md). De missie staat op een vaste
          plek: verdwijnt er een kaart, dan verhuist de missie zelf niet. */}
      {placement.above.map(around)}
      <div className="contents" data-today-mission="" data-above-limit={String(aboveLimit)}>{missionCard}</div>
      {/* Direct onder de missie: de ochtendvraag (een vraag is een taak van vandaag), dan de beslissingen en
          waarschuwingen die over vandaag gaan. Een beslissing heeft hier een omlijnde knop (regel 6). */}
      {/* Komende weken bijgesteld: een melding over je planning, één rij met een pijltje naar het blad met Begrepen,
          direct onder de missie zodat je ziet dat je week veranderde zonder te scrollen (regel 6). */}
      {forecastSummary && <ForecastAdjustmentBanner summary={forecastSummary} onDismiss={dismissForecastSummary} />}
      {placement.underMission.map(around)}
      {/* Een voorstel om de test te verschuiven na wat je zelf vastlegde (alleen als het geldt). */}
      <InfluenceMoveCard />
      {/* Twee van de drie getallen van je horloge wijken af op de ochtend van een zware training (engine/morningProposal.ts). */}
      <MorningProposalCard />
      {/* Wat bevestigd moet worden. */}
      <WatchActivityCard quiet />
      <WatchAlignCard />
      {/* Een tochtdag in de bergen of de sneeuw: het weer op de hoogte van je tocht (engine/mountainWeather.ts). */}
      <MountainWeatherCard />
      <MacroFactorCard primary={false} />
      <ScheduleAnomalyCard quiet />

      {showRecoveryWarning && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>Herstelsignaal</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
            Je lange duurloop voelde de laatste twee weken slechter na de heuvelintervallen. Vandaag rustiger?
            Minder herhalingen, een lagere helling of een kortere training kan helpen.
          </p>
        </Card>
      )}

      {dayOrderAdvice && <DayOrderCard advice={dayOrderAdvice} sessions={todaySessions} templateById={templateById} />}

      {/* Je dag: wat je vandaag naast je training zelf nog doet, hoogstens vier rijen
          (docs/visie/Ontwerp Je dag.md). De training van de grote kaart staat er niet nog eens. */}
      <YourDay items={yourDayItems} />

      {/* De vraag van de week hoort bij de week, niet bij Je dag: aan staat hij als eigen regel eronder. */}
      {showWeeklyQuestion(settings.overviews) && (
        <ol aria-label="Vraag van de week" className="overflow-hidden rounded-2xl border empty:hidden" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
          <WeeklyQuestionCard />
        </ol>
      )}

      {/* Stand en morgen. Noemt de kaart van de dag morgen al (rustdag, stille dag, Vandaag zit erop), dan geen regel
          Morgen (engine/yourDay.ts#standTomorrow). */}
      <StandSummaryCard tomorrow={standTomorrow(tomorrow, !!(primary && primaryTemplate && mission))} />

      <div className="-mt-2 flex items-center justify-center gap-5">
        <button onClick={() => setAdHocOpen(true)} className="inline-flex min-h-[44px] items-center text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="plus" size={16} className="mr-1" />
          Losse training
        </button>
        {!primary && <NotFitLink plain />}
      </div>

      {/* Onder Je dag: wat niet over vandaag gaat of niets vraagt (regel 6): kaarten die niet boven de missie
          pasten, meldingen, de avond ervoor en tips, in de vaste volgorde. */}
      {placement.underDay.map(around)}
      {/* De snelkoppeling naar de ochtendvraag: alleen een blad, geen kaart
          (docs/beslissingen/2026-11-02-vandaag-en-ongedaan.md). */}
      <MorningDeepLink />
      {/* De avond ervoor: vanaf de gekozen tijd de training van morgen met wat je klaarlegt
          (docs/beslissingen/2026-11-11-avond-ervoor.md). */}
      <EveningBeforeCard />
      {/* Een trage test die wacht op je antwoord: een rustige regel, tot je kiest. */}
      <TestPendingLine />
      {/* Komt er van je horloge niets meer binnen terwijl de koppeling werkt: één rustige zin. */}
      <SourceSilenceLine />
      <NextTrekLine onlyWhenOn />


      {concurrentTrainingTip && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>Tip voor vandaag</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{concurrentTrainingTip.reason}</p>
        </Card>
      )}

      <LegEaseCard />

      {reviewWeek && <WeekReviewCard weekStart={reviewWeek} />}

      <BodyCheckCard />

      {quoteLanguage !== 'off' && <QuoteCard quote={quote} language={quoteLanguage} />}

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

      {watchAskOpen && watchQuestion && (
        <WatchAskSheet
          key={watchQuestion.question.entry.externalId}
          log={watchQuestion.question.log}
          template={watchQuestion.template}
          mode={resolveAfterRunQuestions(settings.afterRunQuestions)}
          canReject={watchQuestion.canReject}
          onAnswer={watchQuestion.answer}
          onReject={watchQuestion.reject}
          onClose={() => setWatchAskOpen(false)}
        />
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

      {shorter && (
        <ProposalSheet
          advice={shorter.advice}
          eyebrow="Minder tijd vandaag"
          summary={shorter.advice.effect}
          extraLines={shorter.lines}
          extraTitle="Wat er vandaag verandert"
          onClose={() => setShorter(null)}
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

// Een app zonder programma en zonder planning (een nieuwe installatie) opent
// met het welkom in plaats van met een missie
// (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md). Het welkom blijft
// staan zolang een van zijn twee wegen open is, ook als de gegevens intussen
// binnen zijn.
export function TodayPage() {
  const { program, plannedSessions } = useAppData();
  const [hold, setHold] = useState(false);
  const onHold = useCallback((value: boolean) => setHold(value), []);
  const empty = needsFirstPlan({ programs: program ? 1 : 0, plannedSessions: plannedSessions.length });
  if (empty || hold) return <StartWelcome onHold={onHold} />;
  return <TodayContent />;
}
