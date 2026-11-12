import { resolveIntensityCounting } from '../engine/intensitySettings';
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
import { replanSub, SEASON_ROW, weekBox, weekSkyLine, weekSoFarRow } from '../engine/weekList';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { rowNotes } from '../engine/weekConcerns';
import { allowedPairs } from '../engine/allowedPair';
import { WeekAdjustmentsRow } from '../components/WeekAdjustments';
import { LeavePeriodsRow } from '../components/LeavePeriods';
import { adjustedIdsOf, weekAdjustments } from '../engine/changeLog';
import { placeReason } from '../engine/placeReason';
import { patternDays } from '../engine/planPass';
import { SeasonOverview } from '../components/SeasonOverview';
import { useSeasonHeader } from '../components/useSeasonHeader';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { Card, Eyebrow, Num } from '../components/ui';
import { AdHocLogSheet } from '../components/AdHocLogSheet';
import { LogDetailSheet } from '../components/LogDetailSheet';
import { WeekLoadRow } from '../components/WeekLoadCards';
import type { ScheduleProposal } from '../engine/scheduler';
import { catchUpEligibility, caughtUpMap, caughtUpNoteFor } from '../engine/catchUp';
import { dragHandlesShown } from '../components/weekDragShown';
import { decideMove, dragEligibility, type DecideOptions, type MoveDecision } from '../engine/weekDrag';
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
  const { suggestMoves, program, plannedSessions, templates, sessionLogs, settings, strengthExternal, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, proposeBackOnPlan, logSession, undoLog, planChangeLog, advice, leavePeriods, weekNoticeFor, legsCloseAt, proposeSwap, swapOptionsFor, showFailure } = useAppData();
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
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  // A training done without a plan (a loose one), opened from its row: the same log sheet as the Logboek.
  const [openLog, setOpenLog] = useState<SessionLog | null>(null);
  const [logging, setLogging] = useState<{ session: PlannedSession; variant: SessionVariant; atForm?: boolean } | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  // De plus op een vrije dag van vandaag: dezelfde "Losse training" als op Vandaag.
  const [adHocOpen, setAdHocOpen] = useState(false);
  const [adHocTemplate, setAdHocTemplate] = useState<SessionTemplate | null>(null);

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
  const sessions = sessionsForWeek(weekStart).filter((s) => !(s.status === 'skipped' && (templateById.get(s.templateId)?.type === 'recovery' || s.leave?.role === 'dropped')));
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
  const profile = useMemo(() => {
    const minutesOf = (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program);
    return {
      days: dayLoads({ weekStart, plannedSessions, logs: sessionLogs, templates, today, minutesOf }),
      previous: dayLoads({ weekStart: addDays(weekStart, -7), plannedSessions, logs: sessionLogs, templates, today, minutesOf }),
    };
  }, [weekStart, plannedSessions, sessionLogs, templates, today, program]);
  const progress = weekProgress(sessions, sessionLogs, templateById, leftOutOfCount(plannedSessions, planChangeLog, settings.illnessEpisodes, today, program?.startDate));
  const review = weekStart <= today ? buildWeekReview({ weekStart, plannedById, plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: today, illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks, heartRate: settings.heartRate, intensityCounting: resolveIntensityCounting(settings), keyFocus }) : null;
  const heading = weekHeading(position);
  // Een week zonder trainingen zegt dat in de lucht; de rijen over je week zijn er dan niet.
  const trainings = sessions.filter((s) => templateById.get(s.templateId)?.type !== 'recovery').length;
  const current = weekStart === mondayOfWeek(today);
  // Het ene vak boven de dagen en wat als rij Voorstel wacht (engine/weekList.ts#weekBox).
  const { box, waiting } = weekBox({ notice: notice.concerns.length > 0, rest: restCard, extra: extraAdvice });
  // Gemist in de lopende week (afgeleid uit de logs, engine/sessionStatus.ts): dan staat Week opnieuw plannen direct
  // onder de dagen, met hoeveel er gemist is. De oude rij van een inhaal telt niet: die is overgeslagen.
  const missed = current ? sessions.filter((s) => {
    const t = templateById.get(s.templateId);
    return !!t && t.type !== 'recovery' && deriveSessionStatus(s, sessionLogs, false).status === 'missed';
  }).length : 0;
  const replanOn = !!program && trainings > 0 && addDays(weekStart, 6) >= today;
  const replanRow = replanOn && <WeekReplanRow key={weekStart} weekStart={weekStart} sub={replanSub(missed)} />;
  // Aangepast door ASCEND: één uitkomst voor de rij, het blad en het woord op de dagrij (engine/changeLog.ts).
  const adjustments = useMemo(() => weekAdjustments(planChangeLog, plannedSessions, templates, weekStart, today), [planChangeLog, plannedSessions, templates, weekStart, today]);
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

  // De ene weg voor een verplaatsing, voor het actieblad en voor slepen (engine/weekDrag.ts#decideMove):
  // een schone verplaatsing gaat meteen (Ongedaan maken staat in de melding), een cascade, een botsing,
  // een rustdag of een test vraagt eerst om Akkoord. Twee zware beendagen achter elkaar vragen "Toch hier?".
  async function moveTo(sessionId: string, date: string, opts?: DecideOptions): Promise<MoveDecision['action']> {
    // Losgelaten op een dag met precies één training die mag bewegen: de twee ruilen (engine/weekSwap.ts).
    if (opts?.verdict?.kind === 'swap' && opts.verdict.swapWithId) return swapWith(sessionId, opts.verdict.swapWithId);
    const decision = decideMove(moveSession(sessionId, date), { ...opts, legsClose: legsCloseAt(sessionId, date) });
    if (decision.action === 'apply') await applyProposal(decision.proposal);
    else if (decision.action === 'ask') setPendingProposal(decision.proposal);
    return decision.action;
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
  const dragOn = settings.dragWeek !== false && !monthView && !selected && !openLog && !logging && !pendingProposal && !adHocOpen && !adHocTemplate && !reviewOpen;
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
            {review && review.planned > 0 && trainings > 0 && (
              <SheetRow {...weekSoFarRow({ current, done: progress.done, total: progress.total, doneMinutes })} onClick={() => setReviewOpen(true)} sheetFrom />
            )}
            <WeekAdjustmentsRow adjustments={adjustments} weekStart={weekStart} current={current} />
            {/* Week opnieuw plannen: alleen voor de getoonde week, vandaag en later (engine/replanWeek.ts). */}
            {missed === 0 && replanRow}
            <LeavePeriodsRow openId={openPeriodId} onOpenHandled={() => setOpenPeriodId(null)} />
            <SheetRow {...SEASON_ROW} onClick={() => { setMonthView(true); scrollMainToTop(); }} />
          </SheetRows>
        </>
      )}

      {adHocOpen && (
        <AdHocLogSheet templates={templates} onPick={(t) => { setAdHocOpen(false); setAdHocTemplate(t); }} onClose={() => setAdHocOpen(false)} />
      )}
      {adHocTemplate && <ExerciseLogger template={adHocTemplate} scheduledDate={todayISO()} program={program} onClose={() => setAdHocTemplate(null)} />}

      {reviewOpen && review && <WeekReviewSheet review={review} onClose={() => setReviewOpen(false)} />}

      {openLog && (
        <LogDetailSheet log={openLog} templateName={templateById.get(openLog.templateId)?.name ?? openLog.templateId} onClose={() => setOpenLog(null)} />
      )}

      {selected && templateById.get(selected.templateId) && (
        <SessionActionSheet
          session={selected}
          startStep={openOnMove ? 'move' : undefined}
          caughtUpOn={!selectedLog && caughtUp.has(selected.id) ? caughtUpNoteFor(caughtUp.get(selected.id)!) : undefined}
          catchUp={!selectedLog && catchUpEligibility(selected, templateById.get(selected.templateId)!, { logged: false, today: todayISO(), caughtUp: caughtUp.has(selected.id) }).ok}
          template={templateById.get(selected.templateId)!}
          allowedPair={pairs.get(selected.id)}
          placeReason={selectedPlace}
          program={program}
          quickComplete={isQuickComplete(templateById.get(selected.templateId))}
          completedLog={selectedLog}
          onOpenLog={selectedLog ? () => setOpenLog(selectedLog) : undefined}
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
          onLog={(variant) => {
            setLogging({ session: selected, variant, atForm: true });
            setSelected(null);
          }}
          onMove={(date) => {
            // Dezelfde vraag om Akkoord als bij de greep (test, wat een periode neerzette of opzij schoof).
            const sel = selected;
            const tpl = templateById.get(sel.templateId);
            const eligible = tpl ? dragEligibility(sel, tpl, { logged: !!selectedLog, today: todayISO() }) : undefined;
            void moveTo(sel.id, date, eligible?.ok ? { askAlways: eligible.askAlways } : undefined);
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
