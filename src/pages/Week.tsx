import { useMemo, useState } from 'react';
import { usePageState } from '../components/usePageState';
import { validWeekStart } from '../utils/pageMemory';
import { useBackToClose } from '../utils/useBackToClose';
import { scrollMainToTop } from '../utils/scrollMain';
import { buildWeekReview } from '../engine/weekReview';
import { dayLoads, weekProgress } from '../engine/weekProfile';
import { looseLogsOfWeek, weekLogsOf, weekTime } from '../engine/weekLogs';
import { WeekRidge } from '../components/WeekRidge';
import { WeekReviewSheet } from '../components/WeekReview';
import type { StrengthDoneExtra } from '../components/StrengthDoneElsewhere';
import { useAppData } from '../state/AppDataContext';
import { addDays, mondayOfWeek, resolveProgramWeek, todayISO } from '../utils/dates';
import { resolveVariantDuration } from '../engine/substitutions';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { WeekPlanner } from '../components/WeekPlanner';
import { WeekNotice } from '../components/WeekNotice';
import { rowNotes } from '../engine/weekConcerns';
import { ChangeLogCard } from '../components/ChangeLogCard';
import { LeavePeriodsCard } from '../components/LeavePeriods';
import { adjustedSessionReasons } from '../engine/changeLog';
import { SeasonOverview } from '../components/SeasonOverview';
import { useSeasonHeader } from '../components/useSeasonHeader';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { Card, Eyebrow, Num, Ring, SecondaryButton, Stat } from '../components/ui';
import { AdHocLogSheet } from '../components/AdHocLogSheet';
import { LogDetailSheet } from '../components/LogDetailSheet';
import { formatNumberNL } from '../utils/number';
import { WeekLoadCards } from '../components/WeekLoadCards';
import type { ScheduleProposal } from '../engine/scheduler';
import { decideMove, type DecideOptions, type MoveDecision } from '../engine/weekDrag';
import { asPlannedLog, canTickOffAsPlanned } from '../engine/asPlanned';
import { AdviceItem } from '../components/CoachCard';
import { SkyBand } from '../components/SkyBand';
import { Icon } from '../components/icons';
import { hoursMinutes } from '../utils/hoursMinutes';

const REST_RULES = ['REST-PULL', 'REST-SWAP', 'SKIPPED-KEY-TO-REST'];

export function WeekPage() {
  const { suggestMoves, program, plannedSessions, templates, sessionLogs, settings, strengthExternal, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, proposeBackOnPlan, logSession, undoLog, planChangeLog, advice, leavePeriods, weekNoticeFor } = useAppData();
  const adjustedIds = useMemo(() => new Set(adjustedSessionReasons(planChangeLog, todayISO()).keys()), [planChangeLog]);
  // The chosen week and the year overview belong to this step in the history:
  // to a training and back, the page is as you left it.
  const [weekStart, setWeekStart] = usePageState('weekStart', mondayOfWeek(todayISO()), (v) => validWeekStart(v, todayISO()));
  const [monthView, setMonthView] = usePageState('monthView', false);
  const seasonHeader = useSeasonHeader();
  // The back button leaves the year overview first, then the page.
  useBackToClose(monthView, () => { setMonthView(false); scrollMainToTop(); });
  const [selected, setSelected] = useState<PlannedSession | null>(null);
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

  // A rest day ASCEND gave up for a catch-up is simply gone, not "skipped".
  // Rest-day proposals show up right where you just moved a training.
  const restAdvice = advice.filter((a) => REST_RULES.includes(a.ruleId) && weekStart <= todayISO() && todayISO() <= addDays(weekStart, 6));
  const extraAdvice = advice.filter((a) => a.ruleId === 'EXTRA-SESSION' && a.proposal?.changes.some((c) => c.newSessionDraft?.weekStartDate === weekStart));
  // What a holiday or a trek let go of is explained by the band on those days: not listed, not counted.
  const sessions = sessionsForWeek(weekStart).filter((s) => !(s.status === 'skipped' && (templateById.get(s.templateId)?.type === 'recovery' || s.leave?.role === 'dropped')));
  const position = program ? resolveProgramWeek(program, weekStart) : null;
  const selectedLog = selected ? sessionLogs.find((l) => l.plannedSessionId === selected.id) : undefined;

  // The time this week: what was done (the same sum as the weekly review, a loose
  // training included) of that plus what is still open at its planned length. A
  // skipped training and a rest day count not at all (engine/weekLogs.ts#weekTime).
  const { doneMinutes, totalMinutes: totalWeekMinutes } = weekTime(sessions, sessionLogs, templateById, weekStart, (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program));
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
  const progress = weekProgress(sessions, sessionLogs, templateById);
  // Wat er deze week al gedaan is: kilometers en stijgen uit dezelfde logs als de tijd.
  const weekLogs = weekLogsOf(sessionLogs, templateById, weekStart);
  const weekKm = weekLogs.reduce((n, l) => n + ((l.cardioData ?? l.outdoorData)?.distanceKm ?? 0), 0);
  const weekGain = weekLogs.reduce((n, l) => n + ((l.cardioData ?? l.outdoorData)?.elevationGainM ?? 0), 0);
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

  // De ene weg voor een verplaatsing, voor het actieblad en voor slepen (engine/weekDrag.ts#decideMove):
  // een schone verplaatsing gaat meteen (Ongedaan maken staat in de melding), een cascade, een botsing,
  // een rustdag of een test vraagt eerst om Akkoord.
  function moveTo(sessionId: string, date: string, opts?: DecideOptions): MoveDecision['action'] {
    const decision = decideMove(moveSession(sessionId, date), opts);
    if (decision.action === 'apply') void applyProposal(decision.proposal);
    else if (decision.action === 'ask') setPendingProposal(decision.proposal);
    return decision.action;
  }

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
              <h1 className="font-display text-[32px] leading-tight" style={{ color: 'var(--color-ink)' }}>
                {position ? <>Week <Num>{position.weekInProgram}</Num></> : 'Week'}
                {phaseName && <span className="ml-2 font-sans text-sm" style={{ color: 'var(--color-ink-dim)' }}>{phaseName.trim().toLowerCase()}</span>}
              </h1>
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

      {!monthView && <WeekNotice notice={notice} weekStart={weekStart} />}

      {!monthView && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Ring value={progress.total > 0 ? progress.done / progress.total : 0} label={`${progress.done} van ${progress.total} gedaan`} size={76}>
              <span className="font-sans text-lg font-semibold leading-none tabular-nums" style={{ color: 'var(--color-ink)' }}>
                {progress.done}<span className="text-sm font-medium" style={{ color: 'var(--color-ink-dim)' }}>/{progress.total}</span>
              </span>
              <span className="mt-0.5 text-xs leading-4" style={{ color: 'var(--color-ink-dim)' }}>gedaan</span>
            </Ring>
            <div className="min-w-0 flex-1">
              {totalWeekMinutes > 0 ? (
                <Stat label="Tijd" value={hoursMinutes(doneMinutes)} unit={`van ${hoursMinutes(totalWeekMinutes)} uur`} size="m" />
              ) : (
                <Stat label="Tijd" value="Niets gepland" size="s" />
              )}
              {(weekKm > 0 || weekGain > 0) && (
                <p className="mt-2 flex flex-wrap gap-x-4 font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>
                  {weekKm > 0 && <span><span className="font-semibold">{formatNumberNL(Math.round(weekKm * 10) / 10)}</span> <span style={{ color: 'var(--color-ink-dim)' }}>km</span></span>}
                  {weekGain > 0 && <span><span className="font-semibold">{Math.round(weekGain)}</span> <span style={{ color: 'var(--color-ink-dim)' }}>m stijgen</span></span>}
                </p>
              )}
            </div>
          </div>
          <div className="border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
            <WeekRidge days={profile.days} previous={profile.previous} today={today} bare />
          </div>
        </Card>
      )}

      {!monthView && restAdvice.length > 0 && (
        <Card className="flex flex-col gap-3" texture>
          <Eyebrow>Rustdag</Eyebrow>
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
          <Eyebrow>Extra training</Eyebrow>
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
            onAddFree={() => setAdHocOpen(true)}
            looseLogs={looseLogs}
            onSelectLog={setOpenLog}
            concernNotes={concernNotes}
          />
        </>
      )}

      {!monthView && (
        <div className="flex gap-2">
          <SecondaryButton
            onClick={() => {
              setMonthView(true);
              scrollMainToTop();
            }}
          >
            Jaaroverzicht
          </SecondaryButton>
          {review && review.planned > 0 && (
            <SecondaryButton onClick={() => setReviewOpen(true)}>Weekterugblik</SecondaryButton>
          )}
          {weekStart !== mondayOfWeek(today) && (
            <SecondaryButton onClick={() => setWeekStart(mondayOfWeek(today))}>Naar deze week</SecondaryButton>
          )}
        </div>
      )}

      {!monthView && <WeekLoadCards weekStart={weekStart} />}

      {adHocOpen && (
        <AdHocLogSheet templates={templates} onPick={(t) => { setAdHocOpen(false); setAdHocTemplate(t); }} onClose={() => setAdHocOpen(false)} />
      )}
      {adHocTemplate && <ExerciseLogger template={adHocTemplate} scheduledDate={todayISO()} program={program} onClose={() => setAdHocTemplate(null)} />}

      {reviewOpen && review && <WeekReviewSheet review={review} onClose={() => setReviewOpen(false)} />}

      {openLog && (
        <LogDetailSheet log={openLog} templateName={templateById.get(openLog.templateId)?.name ?? openLog.templateId} onClose={() => setOpenLog(null)} />
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
            moveTo(selected.id, date);
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
          startAtForm={logging.atForm}
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
