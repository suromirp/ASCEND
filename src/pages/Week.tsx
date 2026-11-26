import { resolveIntensityCounting } from '../engine/intensitySettings';
import { hiddenFromDay, weekPlan } from '../engine/dayPlan';
import { useKeyFocus } from '../components/useKeyFocus';
import { useMemo, useState } from 'react';
import { WeekdayPatternLine } from '../components/WeekdayPatternLine';
import { usePageState } from '../components/usePageState';
import { validWeekStart } from '../utils/pageMemory';
import { useBackToClose } from '../utils/useBackToClose';
import { scrollMainToTop } from '../utils/scrollMain';
import { buildWeekReview } from '../engine/weekReview';
import { weekHeading } from '../engine/weekLabel';
import { dayLoads, weekProgress } from '../engine/weekProfile';
import { plannedByIdOf } from '../engine/logDay';
import { leftOutOfCount, looseLogsOfWeek, weekDoneMinutes } from '../engine/weekLogs';
import { WeekRidge } from '../components/WeekRidge';
import { WeekReviewSheet } from '../components/WeekReview';
import type { StrengthDoneExtra } from '../components/StrengthDoneElsewhere';
import { useAppData } from '../state/AppDataContext';
import { tickOff } from '../state/logSave';
import { addDays, mondayOfWeek, resolveProgramWeek, todayISO } from '../utils/dates';
import { resolveVariantDuration } from '../engine/substitutions';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { WeekPlanner } from '../components/WeekPlanner';
import { useWeekDrag } from '../components/useWeekDrag';
import { WeekNotice } from '../components/WeekNotice';
import { WeekReplanRow } from '../components/WeekReplanRow';
import { WeekProposalRow } from '../components/WeekProposalRow';
import { SheetRow, SheetRows } from '../components/SheetRows';
import { TextButton } from '../components/TextButton';
import { missedInWeek, replanSub, SEASON_ROW, weekBox, weekSkyLine, weekSoFarRow } from '../engine/weekList';
import { elsewhereNotes, hasWeekTally, onlyElsewhereText, shiftedProgress } from '../engine/weekGlance';
import { raceDatesOf } from '../engine/raceWindow';
import { rowNotes } from '../engine/weekConcerns';
import { allowedPairs } from '../engine/allowedPair';
import { WeekAdjustmentsRow } from '../components/WeekAdjustments';
import { LeavePeriodsRow } from '../components/LeavePeriods';
import { usePublicHolidays } from '../state/usePublicHolidays';
import { quietHolidays } from '../engine/publicHolidays';
import { adjustedIdsOf, weekAdjustments } from '../engine/changeLog';
import { placeReason } from '../engine/placeReason';
import { patternDays } from '../engine/planPass';
import { SeasonOverview } from '../components/SeasonOverview';
import { useSeasonHeader } from '../components/useSeasonHeader';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { useBriefingReturn } from '../utils/briefingReturn';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { Card, Eyebrow, Num } from '../components/ui';
import { AdHocLogFlow } from '../components/AdHocLogSheet';
import { LogDetailSheet } from '../components/LogDetailSheet';
import { WeekLoadRow } from '../components/WeekLoadCards';
import type { ScheduleProposal } from '../engine/scheduler';
import { catchUpEligibility, caughtUpMap, caughtUpNoteFor } from '../engine/catchUp';
import { dragHandlesShown } from '../components/weekDragShown';
import { decideMove, dragEligibility, type DecideOptions, type MoveDecision } from '../engine/weekDrag';
import { restDayFollowAfterMove, withRestDayFollow } from '../engine/restDayFollows';
import { REST_DAY_COPY } from '../data/restDayCopy';
import { keptAsk, keptRefusal } from '../engine/moveSuggestions';
import { SWAP_STALE } from '../storage/weekSwap';
import { asPlannedLog, canTickOffAsPlanned } from '../engine/asPlanned';
import { AdviceItem } from '../components/CoachCard';
import { REST_BACK_RULE } from '../engine/restDayBack';
import { descentRowNotes } from '../engine/descentClock';
import { SkyBand } from '../components/SkyBand';
import { Icon } from '../components/icons';

const REST_RULES = ['REST-PULL', 'REST-SWAP', 'SKIPPED-KEY-TO-REST'];
// Wat de melding zegt als een ruil of verplaatsing niet weggeschreven kon worden.
const SWAP_FAILED = 'Beide trainingen staan nog op hun eigen dag.';
const MOVE_FAILED = 'Kijk in je week wat er nu staat.';

export function WeekPage() {
  const { suggestMoves, program, plannedSessions, templates, sessionLogs, settings, strengthExternal, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, proposeBackOnPlan, logSession, reportStorageError, withdrawStorageNotice, refresh, undoLog, planChangeLog, advice, leavePeriods, weekNoticeFor, legsCloseAt, proposeSwap, swapOptionsFor, showFailure, openDraftId, moveContext } = useAppData();
  // Afvinken met één tik: grens in tijd en de melding bovenin (state/logSave.ts#tickOff).
  const tickNotice = { report: reportStorageError, withdraw: withdrawStorageNotice, refresh };
  // Feestdagen (engine/publicHolidays.ts): het voorstel staat bij Vrije dagen en vakanties, de naam stil op een lege dag.
  const holidays = usePublicHolidays(settings);
  const holidayNames = useMemo(() => quietHolidays({ holidays: holidays.holidays, country: holidays.country, periods: leavePeriods, enabled: holidays.enabled }), [holidays.holidays, holidays.country, holidays.enabled, leavePeriods]);
  const keyFocus = useKeyFocus();
  // The chosen week and the year overview belong to this step in the history:
  // to a training and back, the page is as you left it.
  const [weekStart, setWeekStart] = usePageState('weekStart', mondayOfWeek(todayISO()), (v) => validWeekStart(v, todayISO()));
  const [monthView, setMonthView] = usePageState('monthView', false);
  const seasonHeader = useSeasonHeader();
  // The back button leaves the year overview first, then the page.
  useBackToClose(monthView, () => { setMonthView(false); scrollMainToTop(); });
  const [selected, setSelected] = useState<PlannedSession | null>(null);
  // Een tik op de greep opent het actieblad direct op de stap Verplaatsen.
  const [openOnMove, setOpenOnMove] = useState(false);
  // Terug vanaf een pagina die je uit de Briefing van een blad opende: het blad opent weer met de Briefing
  // erover (engine/briefingReturn.ts). Alleen voor dit ene blad.
  const [briefingFor, setBriefingFor] = useState<string | null>(null);
  useBriefingReturn('sheet', (m) => {
    const back = plannedSessions.find((s) => s.id === m.sessionId);
    if (!back) return;
    setBriefingFor(back.id);
    setSelected(back);
  });
  // Gaat het blad dicht, dan is het op: een latere tik op dezelfde training opent geen Briefing.
  if (briefingFor && selected?.id !== briefingFor) setBriefingFor(null);
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  // A training done without a plan (a loose one), opened from its row: the same log sheet as the Logboek.
  const [openLog, setOpenLog] = useState<SessionLog | null>(null);
  const [logging, setLogging] = useState<{ session: PlannedSession; variant: SessionVariant; atForm?: boolean } | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  // De plus op een vrije dag van vandaag: dezelfde "Losse training" als op Vandaag.
  const [adHocOpen, setAdHocOpen] = useState(false);

  // What is wrong in this week, for the card and the lines in the rows (engine/weekFixProposal.ts).
  const notice = useMemo(() => weekNoticeFor(weekStart), [weekNoticeFor, weekStart]);
  const concernNotes = useMemo(() => rowNotes(notice.concerns), [notice]);
  // Een rustige loop en beenkracht op twee dagen achter elkaar is bewust toegestaan: een stille tekst, geen melding.
  const pairs = useMemo(() => allowedPairs(plannedSessions, templates, sessionLogs), [plannedSessions, templates, sessionLogs]);
  // Ook de trapsessie achter een rustige training zegt kort wat je doet (engine/descentClock.ts). Trap af is nooit
  // de tweede van een toegestaan paar (dat is kracht of een loop), dus de twee lijsten delen geen id.
  const pairNotes = useMemo(() => new Map([...[...pairs].map(([id, p]): [string, string] => [id, p.rowNote]), ...descentRowNotes(plannedSessions, templates)]), [pairs, plannedSessions, templates]);

  // A rest day ASCEND gave up for a catch-up is simply gone, not "skipped".
  // Rest-day proposals show up right where you just moved a training.
  const restAdvice = advice.filter((a) => REST_RULES.includes(a.ruleId) && weekStart <= todayISO() && todayISO() <= addDays(weekStart, 6));
  // Een rustdag die weer vrij is (engine/restDayBack.ts) staat bij de week waarin hij valt.
  const restBackAdvice = advice.filter((a) => a.ruleId === REST_BACK_RULE && a.proposal?.changes.some((c) => c.newSessionDraft?.weekStartDate === weekStart));
  const restCard = [...restAdvice, ...restBackAdvice];
  const extraAdvice = advice.filter((a) => a.ruleId === 'EXTRA-SESSION' && a.proposal?.changes.some((c) => c.newSessionDraft?.weekStartDate === weekStart));
  // What a holiday or a trek let go of is explained by the band on those days: not listed, not counted.
  const sessions = sessionsForWeek(weekStart).filter((s) => !hiddenFromDay(s, templateById));
  const position = program ? resolveProgramWeek(program, weekStart) : null;
  const caughtUp = useMemo(() => caughtUpMap(plannedSessions), [plannedSessions]);
  const selectedLog = selected ? sessionLogs.find((l) => l.plannedSessionId === selected.id) : undefined;
  // "Waarom staat dit hier?": alleen uit wat er al bewaard is (engine/placeReason.ts).
  const slotDays = useMemo(() => patternDays(templates, settings, settings.restDay ?? 1), [templates, settings]);
  const selectedPlace = useMemo(
    () => (selected ? placeReason({ session: selected, proposals: planChangeLog, patternDay: slotDays.get(selected.templateId), leavePeriods }) : undefined),
    [selected, planChangeLog, slotDays, leavePeriods],
  );

  // De gedane tijd deze week, dezelfde som als de weekterugblik (een losse training telt mee, een rustdag niet).
  const plannedById = useMemo(() => plannedByIdOf(plannedSessions), [plannedSessions]);
  const doneMinutes = weekDoneMinutes(sessionLogs, templateById, weekStart, plannedById);
  // Done without a plan: a row on their day (WeekPlanner), not in the count of planned trainings.
  const looseLogs = useMemo(() => looseLogsOfWeek(sessionLogs, plannedSessions, weekStart), [sessionLogs, plannedSessions, weekStart]);

  // De bergkam: belasting per dag van deze week en van de week ervoor (engine/weekProfile.ts).
  const today = todayISO();
  // Het dagbeeld (engine/dayPlan.ts): de rijen per dag, dezelfde afleiding als Vandaag en de weekbalk.
  const plan = useMemo(() => weekPlan({ weekStart, sessions: plannedSessions, logs: sessionLogs, templateById, today, illness: settings.illnessEpisodes }), [weekStart, plannedSessions, sessionLogs, templateById, today, settings.illnessEpisodes]);
  const profile = useMemo(() => {
    const minutesOf = (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program);
    return {
      days: dayLoads({ weekStart, plannedSessions, logs: sessionLogs, templates, today, minutesOf }),
      previous: dayLoads({ weekStart: addDays(weekStart, -7), plannedSessions, logs: sessionLogs, templates, today, minutesOf }),
    };
  }, [weekStart, plannedSessions, sessionLogs, templates, today, program]);
  // De races in de planning: een training uit de afbouw die na de race niet gedaan is, vervalt (engine/raceWindow.ts).
  const races = useMemo(() => raceDatesOf(plannedSessions, templateById), [plannedSessions, templateById]);
  const progress = weekProgress(sessions, sessionLogs, templateById, leftOutOfCount(plannedSessions, planChangeLog, settings.illnessEpisodes, today, program?.startDate, { periods: settings.leavePeriods, templates: templateById, loggedIds: new Set(sessionLogs.map((l) => l.plannedSessionId)), races, openDraft: openDraftId }));
  const review = weekStart <= today ? buildWeekReview({ weekStart, plannedById, plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: today, illnessEpisodes: settings.illnessEpisodes, leavePeriods: settings.leavePeriods, openDraft: openDraftId, weeklyChecks: settings.weeklyHealthChecks, heartRate: settings.heartRate, intensityCounting: resolveIntensityCounting(settings), keyFocus }) : null;
  const heading = weekHeading(position);
  // Een week zonder trainingen zegt dat in de lucht; de rijen over je week zijn er dan niet.
  const trainings = sessions.filter((s) => templateById.get(s.templateId)?.type !== 'recovery').length;
  const current = weekStart === mondayOfWeek(today);
  // Het ene vak boven de dagen en wat als rij Voorstel wacht (engine/weekList.ts#weekBox).
  const { box, waiting } = weekBox({ notice: notice.concerns.length > 0, rest: restCard, extra: extraAdvice });
  // Gemist in de lopende week (afgeleid uit de logs, engine/sessionStatus.ts): dan staat Week opnieuw plannen direct
  // onder de dagen, met hoeveel er gemist is. De oude rij van een inhaal telt niet: die is overgeslagen.
  const missed = current ? missedInWeek(sessions, sessionLogs, templateById, { leave: leavePeriods, templates: templateById, illness: settings.illnessEpisodes, races, openDraft: openDraftId, programStart: program?.startDate }) : 0;
  const replanOn = !!program && trainings > 0 && addDays(weekStart, 6) >= today;
  const replanRow = replanOn && <WeekReplanRow key={weekStart} weekStart={weekStart} sub={replanSub(missed)} />;
  // Aangepast door ASCEND: één uitkomst voor de rij, het blad en het woord op de dagrij (engine/changeLog.ts).
  const adjustments = useMemo(() => weekAdjustments(planChangeLog, plannedSessions, templates, weekStart, today, settings.reentryWeeks), [planChangeLog, plannedSessions, templates, weekStart, today, settings.reentryWeeks]);
  const adjustedIds = useMemo(() => adjustedIdsOf(adjustments), [adjustments]);

  // A completed session is still selectable — SessionActionSheet shows an
  // "ongedaan maken" (undo) view for it instead of the start/move/skip one.
  function selectSession(session: PlannedSession) {
    setOpenOnMove(false);
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
      // Met een grens in tijd en een uitkomst bovenin (state/logSave.ts#tickOff).
      void tickOff(logSession, {
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
      }, tickNotice);
    } else {
      setLogging({ session, variant });
    }
  }

  // De ene weg voor een verplaatsing, voor het actieblad en voor slepen (engine/weekDrag.ts#decideMove):
  // een schone verplaatsing gaat meteen (Ongedaan maken staat in de melding), een cascade, een botsing,
  // een rustdag of een test vraagt eerst om Akkoord. Twee zware beendagen achter elkaar vragen "Toch hier?".
  async function moveTo(sessionId: string, date: string, opts?: DecideOptions): Promise<MoveDecision['action']> {
    // Losgelaten op een dag met precies één training die mag bewegen: de twee ruilen (engine/weekSwap.ts).
    if (opts?.verdict?.kind === 'swap' && opts.verdict.swapWithId) return swapWith(sessionId, opts.verdict.swapWithId);
    const decision = decideMove(moveSession(sessionId, date), { ...opts, legsClose: legsCloseAt(sessionId, date), restDay: settings.restDay ?? 1 });
    if (decision.action === 'none') return decision.action;
    // Schuift je rustdag mee, dan is het één blad met beide, en één Ongedaan maken (engine/restDayFollows.ts#withRestDayFollow).
    const follow = restFollow(decision.proposal);
    if (follow) {
      setPendingProposal(withRestDayFollow(decision.proposal, follow));
      return 'ask';
    }
    if (decision.action === 'apply') await applyProposal(decision.proposal);
    else setPendingProposal(decision.proposal);
    return decision.action;
  }

  // De rustdag schuift mee (engine/restDayFollows.ts, I-162): zette jij een training op een dag met je rustdag, dan
  // volgt één voorstel met Akkoord om de rustdag naar de vrijgekomen dag te zetten. Jouw verplaatsing blijft staan.
  // Uitgerekend op het plan van voor het schrijven, met jouw verplaatsing erin.
  function restFollow(proposal: ScheduleProposal): ScheduleProposal | undefined {
    if (settings.restDayFollows === false) return undefined;
    return restDayFollowAfterMove(proposal, { sessions: plannedSessions, templateById, logs: sessionLogs, today: todayISO(), leave: settings.leavePeriods, restTitle: REST_DAY_COPY[settings.restDayMode ?? 'rest'].title });
  }

  // Ruilen, uit het actieblad en uit het slepen: dezelfde weg als Verplaatsen. Schoon gaat meteen (Ongedaan
  // maken in de melding), anders het blad met Akkoord en wat er botst.
  // Lukt het schrijven niet, dan blijven beide staan en zegt de melding dat (zonder Ongedaan maken).
  async function swapWith(sessionId: string, otherId: string): Promise<MoveDecision['action']> {
    let decision: MoveDecision;
    try {
      decision = proposeSwap(sessionId, otherId);
    } catch (err) {
      console.error('Ruilen mislukt:', err);
      showFailure('Dat lukte niet, er is niets geruild.', SWAP_FAILED);
      return 'none';
    }
    if (decision.action === 'ask') setPendingProposal(decision.proposal);
    if (decision.action !== 'apply') return decision.action;
    return applyOrTell(decision.proposal).then((ok) => (ok ? 'apply' : 'none'));
  }

  // Akkoord (of een schone ruil): toepassen, en een fout zichtbaar maken in plaats van hem te laten vallen.
  async function applyOrTell(proposal: ScheduleProposal): Promise<boolean> {
    try {
      await applyProposal(proposal);
      return true;
    } catch (err) {
      console.error(proposal.swap ? 'Ruilen mislukt:' : 'Verplaatsen mislukt:', err);
      const why = err instanceof Error && err.message === SWAP_STALE ? SWAP_STALE : proposal.swap ? SWAP_FAILED : MOVE_FAILED;
      showFailure(proposal.swap ? 'Dat lukte niet, er is niets geruild.' : 'Dat lukte niet.', why);
      return false;
    }
  }

  // Slepen (components/useWeekDrag.ts): niet in het jaaroverzicht en niet terwijl er een blad of scherm open is.
  const dragOn = settings.dragWeek !== false && !monthView && !selected && !openLog && !logging && !pendingProposal && !adHocOpen && !reviewOpen;
  // De grepen blijven staan terwijl een blad open is of sluit: alleen het oppakken is dan uit
  // (`enabled`). Zo wisselen ze niet kort naar lege cirkels bij het sluiten (components/weekDragShown.ts).
  const dragHandles = dragHandlesShown({ setting: settings.dragWeek !== false, monthView });
  const weekDrag = useWeekDrag({
    weekStart,
    enabled: dragOn,
    moveTo,
    onOpenMove: (id) => {
      const session = sessions.find((s) => s.id === id);
      if (session) { setOpenOnMove(true); setSelected(session); }
    },
  });

  // Een kaart met een of meer adviezen voor het vak (Rustdag of Extra training), zonder contourlijnen.
  const adviceCard = (eyebrow: string, list: typeof restCard) => (
    <Card className="flex flex-col gap-3">
      <Eyebrow>{eyebrow}</Eyebrow>
      {list.map((a) => (
        <div key={a.id}>
          <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{a.title}</p>
          <AdviceItem advice={a} compact />
        </div>
      ))}
    </Card>
  );
  const skyLine = weekSkyLine(heading.line, trainings);

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-6">
      {/* Vorige en volgende week staan rechtsboven direct links van het tandwiel: dezelfde
          hoogte, dezelfde maat (44 px), zonder cirkel. In het jaaroverzicht zijn ze er niet. */}
      <SkyBand variant="low">
        {/* De pijltjes staan onder het tandwiel, rechts op dezelfde lijn. */}
        <header className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {monthView ? (
              <div className="flex items-start gap-2">
                <button onClick={() => { setMonthView(false); scrollMainToTop(); }} aria-label="Terug naar de week" className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                  <Icon name="terug" size={24} />
                </button>
                <div className="min-w-0 flex-1 pt-1">
                  <Eyebrow>Jaaroverzicht</Eyebrow>
                  <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-ink)' }}>{seasonHeader.title}</h1>
                  {seasonHeader.line && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{seasonHeader.line}</p>}
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-[32px] leading-tight" style={{ color: 'var(--color-ink)' }}>
                  {heading.title}{heading.number !== undefined && <> <Num>{heading.number}</Num></>}
                  {/* De kleine regel met de fase voorop staat onder het grote getal, zodat hij nooit midden in breekt. */}
                  {skyLine && <>{' '}<span className="block font-sans text-sm" style={{ color: 'var(--color-ink-dim)' }}>{skyLine}</span></>}
                </h1>
                {/* Een andere week dan deze: terug met een gedempte tekstknop in de lucht, geen omlijnde knop. */}
                {!current && <TextButton tone="dim" className="-mb-2" onClick={() => setWeekStart(mondayOfWeek(today))}>Naar deze week</TextButton>}
              </>
            )}
          </div>
          {!monthView && (
            <div className="-mr-2.5 flex shrink-0 items-center">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="flex h-11 w-11 items-center justify-center"
                style={{ color: 'var(--color-on-light)' }}
                aria-label="Vorige week"
              >
                <Icon name="terug" size={24} />
              </button>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="flex h-11 w-11 items-center justify-center"
                style={{ color: 'var(--color-on-light)' }}
                aria-label="Volgende week"
              >
                <Icon name="verder" size={24} />
              </button>
            </div>
          )}
        </header>
      </SkyBand>

      {/* Het ene vak boven de dagen: Let op, anders een voorstel voor je rustdag, anders een extra training. */}
      {!monthView && box?.kind === 'notice' && <WeekNotice notice={notice} weekStart={weekStart} />}
      {!monthView && box?.kind === 'rest' && adviceCard('Rustdag', box.advice)}
      {!monthView && box?.kind === 'extra' && adviceCard('Extra training', box.advice)}

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
            plan={plan}
            templateById={templateById}
            logs={sessionLogs}
            program={program}
            onSelectSession={selectSession}
            adjustedIds={adjustedIds}
            leave={leavePeriods}
            onAddFree={() => setAdHocOpen(true)}
            looseLogs={looseLogs}
            onSelectLog={setOpenLog}
            concernNotes={concernNotes}
            pairNotes={pairNotes}
            weekDrag={weekDrag}
            dragEnabled={dragHandles}
            onOpenPeriod={setOpenPeriodId}
            holidayNames={holidayNames}
          />
          {/* Direct onder de dagen wat nu iets van je vraagt: een voorstel dat wacht, en na een gemiste training
              Week opnieuw plannen. Zo zakt het niet onder de bergkam buiten beeld. */}
          {(waiting.length > 0 || (missed > 0 && replanRow)) && (
            <SheetRows label="Wat nu wacht">
              {waiting.map((a) => <WeekProposalRow key={a.id} advice={a} />)}
              {missed > 0 && replanRow}
            </SheetRows>
          )}
          {/* Valt je training op een weekdag duidelijk vaker weg: één rustige zin onder de dagen, geen wijziging. */}
          <WeekdayPatternLine />
          {/* De belasting per dag blijft tot Stand hem toont (Stand heeft per week en de beendagen, niet per dag). */}
          {trainings > 0 && <WeekRidge days={profile.days} previous={profile.previous} today={today} />}
          {/* De lijst onder de dagen: één rijvorm, geen mint, elke rij opent iets. */}
          <SheetRows label="Meer over deze week">
            <WeekLoadRow weekStart={weekStart} />
            {hasWeekTally(review) && trainings > 0 && (
              <SheetRow {...weekSoFarRow({ current, ...shiftedProgress(progress, review), doneMinutes, ...elsewhereNotes(review), only: onlyElsewhereText(review) })} onClick={() => setReviewOpen(true)} sheetFrom />
            )}
            <WeekAdjustmentsRow adjustments={adjustments} weekStart={weekStart} current={current} />
            {/* Week opnieuw plannen: alleen voor de getoonde week, vandaag en later (engine/replanWeek.ts). */}
            {missed === 0 && replanRow}
            <LeavePeriodsRow openId={openPeriodId} onOpenHandled={() => setOpenPeriodId(null)} holidays={holidays} />
            <SheetRow {...SEASON_ROW} onClick={() => { setMonthView(true); scrollMainToTop(); }} />
          </SheetRows>
        </>
      )}

      {adHocOpen && (
        <AdHocLogFlow templates={templates} program={program} date={todayISO()} onClose={() => setAdHocOpen(false)} />
      )}

      {reviewOpen && review && <WeekReviewSheet review={review} onClose={() => setReviewOpen(false)} />}

      {openLog && (
        <LogDetailSheet log={openLog} templateName={templateById.get(openLog.templateId)?.name ?? openLog.templateId} onClose={() => setOpenLog(null)} />
      )}

      {selected && templateById.get(selected.templateId) && (
        <SessionActionSheet
          session={selected}
          openBriefing={briefingFor === selected.id}
          startStep={openOnMove ? 'move' : undefined}
          caughtUpOn={!selectedLog && caughtUp.has(selected.id) ? caughtUpNoteFor(caughtUp.get(selected.id)!) : undefined}
          catchUp={!selectedLog && selected.id !== openDraftId && catchUpEligibility(selected, templateById.get(selected.templateId)!, { logged: false, today: todayISO(), caughtUp: caughtUp.has(selected.id), pause: { leave: settings.leavePeriods, templates: templateById, illness: settings.illnessEpisodes, races, programStart: program?.startDate } }).ok}
          template={templateById.get(selected.templateId)!}
          allowedPair={pairs.get(selected.id)}
          placeReason={selectedPlace}
          program={program}
          quickComplete={isQuickComplete(templateById.get(selected.templateId))}
          completedLog={selectedLog}
          onOpenLog={selectedLog ? () => setOpenLog(selectedLog) : undefined}
          onDoneAsPlanned={!selectedLog && selected.scheduledDate <= todayISO() && canTickOffAsPlanned(templateById.get(selected.templateId)!, strengthExternal, settings.restDayMode)
            ? () => {
                void tickOff(logSession, asPlannedLog(selected, templateById.get(selected.templateId)!, program, todayISO()), tickNotice);
                setSelected(null);
              }
            : undefined}
          onStart={(variant, feel, durationMinutes, extra) => {
            startSession(selected, templateById.get(selected.templateId)!, variant, feel, durationMinutes, extra);
            setSelected(null);
          }}
          onLog={(variant) => {
            setLogging({ session: selected, variant, atForm: true });
            setSelected(null);
          }}
          onMove={(date) => {
            // Dezelfde vraag om Akkoord als bij de greep (test, wat een periode neerzette of opzij schoof).
            const sel = selected;
            const tpl = templateById.get(sel.templateId);
            const eligible = tpl ? dragEligibility(sel, tpl, { logged: !!selectedLog, today: todayISO(), periods: settings.leavePeriods }) : undefined;
            // Zonder sportschool, verkouden of opbouw na ziekte: eerst de vraag (de ene regel, engine/dayRules.ts).
            const context = moveContext();
            // Een dag die dicht is (koorts, vakantie, tocht): niet verplaatsen, met dezelfde zin als slepen.
            const refused = keptRefusal(context, tpl, date, todayISO());
            if (refused) { showFailure('Niet verplaatst.', refused); setSelected(null); return; }
            const extraAsk = keptAsk(context, tpl, date, todayISO());
            void moveTo(sel.id, date, eligible?.ok ? { askAlways: eligible.askAlways, extraAsk } : extraAsk ? { extraAsk } : undefined);
            setSelected(null);
          }}
          swapOptions={swapOptionsFor(selected.id)}
          onSwap={(otherId) => {
            void swapWith(selected.id, otherId);
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
          onClose={() => { setSelected(null); setOpenOnMove(false); }}
        />
      )}

      {logging && templateById.get(logging.session.templateId) && (
        <ExerciseLogger
          template={templateById.get(logging.session.templateId)!}
          plannedSessionId={logging.session.id}
          scheduledDate={logging.session.scheduledDate}
          program={program}
          initialVariant={logging.variant}
          startAtForm={logging.atForm}
          onClose={() => setLogging(null)}
        />
      )}

      {pendingProposal && (
        <RescheduleDialog
          proposal={pendingProposal}
          onApply={() => {
            void applyOrTell(pendingProposal);
            setPendingProposal(null);
          }}
          onCancel={() => setPendingProposal(null)}
        />
      )}
    </div>
  );
}
