import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { resolveProgramWeek } from '../utils/dates';
import { addDays, daysBetween, isoWeekday, mondayOfWeek, todayISO } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { computeGoalProgress } from '../engine/progression';
import { computeReadiness } from '../engine/readiness';
import { computeCurrentStreak } from '../engine/streak';
import { hillIntervalsDegradingLongRun } from '../engine/recoveryCheck';
import { resolveEffectiveFullDuration, resolveVariantDuration, weeklyProgressionNote } from '../engine/substitutions';
import type { PlannedSession, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { TodayMissionCard } from '../components/TodayMissionCard';
import { AdventureCard } from '../components/AdventureCard';
import { SessionCard } from '../components/SessionCard';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { StretchMenuButton } from '../components/StretchMenuButton';
import { TimerButton } from '../components/TimerButton';
import { DailyStretchCard } from '../components/DailyStretchCard';
import { ExportReminderBanner } from '../components/ExportReminderBanner';
import { ForecastAdjustmentBanner } from '../components/ForecastAdjustmentBanner';
import { QuoteCard } from '../components/QuoteCard';
import { WeeklyReflectionCard } from '../components/WeeklyReflectionCard';
import { MORNING_ROUTINE, EVENING_ROUTINE } from '../data/stretches';
import { Card, Eyebrow, SecondaryButton } from '../components/ui';
import { AscendAnimatedLogo } from '../components/AscendAnimatedLogo';
import { dailyQuote } from '../utils/quotes';
import type { ScheduleProposal } from '../engine/scheduler';

// Merges proposeNoTimeToday's per-session proposals into one for the
// shared RescheduleDialog — applyNoTimeToday (AppDataContext) still applies
// the original array so each session's resolved/fallback status is
// respected individually.
function mergeNoTimeProposals(proposals: ScheduleProposal[]): ScheduleProposal {
  return {
    changes: proposals.flatMap((p) => p.changes),
    reason: 'Sessies van vandaag verplaatsen naar de eerstvolgende vrije dag deze week — of overslaan als de week vol zit.',
    resolved: proposals.every((p) => p.resolved),
  };
}

export function TodayPage({ onOpenLadder }: { onOpenLadder: () => void }) {
  const { program, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, settings, stretchCompletion, templateById, sessionsForWeek, moveSession, applyProposal, proposeSkip, logSession, undoLog, toggleStretchRoutine, exportData, updateSettings, proposeNoTimeToday, applyNoTimeToday, forecastSummary, dismissForecastSummary } = useAppData();
  const today = todayISO();
  // Ochtend vóór 12:00, Avond erna — only one of the two daily routines is
  // ever shown, matched to the current time of day.
  const isMorning = new Date().getHours() < 12;
  const [loggingSession, setLoggingSession] = useState<PlannedSession | null>(null);
  const [loggingVariant, setLoggingVariant] = useState<SessionVariant>('full');
  const [actionSheetSession, setActionSheetSession] = useState<PlannedSession | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);
  const [noTimeProposals, setNoTimeProposals] = useState<ScheduleProposal[] | null>(null);

  const position = program ? resolveProgramWeek(program, today) : null;
  const weekStart = mondayOfWeek(today);
  const weekSessions = sessionsForWeek(weekStart);
  const todaySessions = weekSessions.filter((s) => s.scheduledDate === today);
  // No `?? todaySessions[0]` fallback here: .find() only returns undefined
  // when every session today is already completed or skipped, and falling
  // back to one of those would re-show a finished session as if it still
  // needed to be started.
  const primary = todaySessions.find((s) => deriveSessionStatus(s, sessionLogs).status !== 'completed' && s.status !== 'skipped');
  const secondary = todaySessions.filter((s) => s.id !== primary?.id);
  const allTodayDone = todaySessions.length > 0 && !primary;
  const hasTodoToday = todaySessions.some((s) => deriveSessionStatus(s, sessionLogs).status !== 'completed' && s.status !== 'skipped');

  function handleNoTimeToday() {
    const proposals = proposeNoTimeToday();
    if (proposals.length === 0) return;
    setNoTimeProposals(proposals);
  }

  const weekCompletedCount = weekSessions.filter((s) => deriveSessionStatus(s, sessionLogs).status === 'completed').length;

  // A short look-back nudge — only worth showing right at the week
  // boundary (closing out the week that just ended, or opening the new
  // one), not as a permanent fixture crowding every day's Today screen.
  const showWeeklyReflection = isoWeekday(today) === 7 || isoWeekday(today) === 1;
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekSessions = sessionsForWeek(lastWeekStart);
  const lastWeekCompletedCount = lastWeekSessions.filter((s) => deriveSessionStatus(s, sessionLogs).status === 'completed').length;

  // Weekly nudge to back up: local-only storage means a wiped browser/cache
  // means everything is gone. No reference yet (never exported, never
  // dismissed) reads as "always show" as long as there's actually
  // something worth backing up, rather than trying to guess a sensible
  // start date from seed/demo data.
  const backupTouchedAt = [settings.lastExportedAt, settings.lastExportReminderDismissedAt].filter((d): d is string => !!d).sort().at(-1);
  const showExportReminder = sessionLogs.length > 0 && (!backupTouchedAt || daysBetween(backupTouchedAt.slice(0, 10), today) >= 7);

  // Rolling 28-day consistency — the same number the Ascend screen shows, so
  // "CONSISTENTIE" never means two different things depending on which tab
  // you're on. Early in a fresh week the literal this-week ratio is 0/low by
  // definition, which reads as broken; the rolling figure is representative
  // from day one.
  const readiness = useMemo(() => computeReadiness(sessionLogs, plannedSessions), [sessionLogs, plannedSessions]);
  const streak = useMemo(() => computeCurrentStreak(plannedSessions, sessionLogs), [plannedSessions, sessionLogs]);
  const quote = dailyQuote(today);

  // The GR5 goal is the one with milestones — mirrors the old objectives[0]
  // assumption, now stated explicitly rather than by array position (see
  // pages/Ascend.tsx).
  const primaryGoal = trainingGoals.find((g) => goalMilestones.some((m) => m.goalId === g.id));
  const primaryGoalMilestones = useMemo(() => goalMilestones.filter((m) => m.goalId === primaryGoal?.id), [goalMilestones, primaryGoal?.id]);
  const objectiveProgress = useMemo(
    () => (primaryGoal ? computeGoalProgress(primaryGoal.id, primaryGoal.name, primaryGoalMilestones, goalMilestoneProgress, sessionLogs) : null),
    [primaryGoal, primaryGoalMilestones, goalMilestoneProgress, sessionLogs],
  );

  function handleMove(sessionId: string, date: string) {
    const proposal = moveSession(sessionId, date);
    setPendingProposal(proposal);
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
  const loggingTemplate = loggingSession ? templateById.get(loggingSession.templateId) : undefined;
  const actionSheetTemplate = actionSheetSession ? templateById.get(actionSheetSession.templateId) : undefined;
  const actionSheetLog = actionSheetSession ? sessionLogs.find((l) => l.plannedSessionId === actionSheetSession.id) : undefined;

  // When Settings → Krachttraining "Bijgehouden in MacroFactor" is on,
  // starting a strength session skips the exercise-entry modal entirely —
  // it's logged immediately, one tap, instead of opening ExerciseLogger.
  function isQuickComplete(template?: SessionTemplate) {
    return template?.type === 'strength' && settings.strengthTrackedExternally;
  }

  function startSession(session: PlannedSession, template: SessionTemplate, variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number) {
    if (isQuickComplete(template)) {
      logSession({
        plannedSessionId: session.id,
        templateId: template.id,
        type: template.type,
        variant,
        durationMinutes: durationMinutes ?? resolveVariantDuration(template, variant, session.scheduledDate, program),
        subjectiveFeel: feel,
      });
    } else {
      setLoggingVariant(variant);
      setLoggingSession(session);
    }
  }

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6 pt-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AscendAnimatedLogo size={84} />
          {position && (
            <p className="text-xs tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>
              WEEK {position.weekInProgram} • {position.phase.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TimerButton />
          <StretchMenuButton />
        </div>
      </div>

      {showExportReminder && (
        <ExportReminderBanner
          onExport={() => exportData()}
          onDismiss={() => updateSettings({ lastExportReminderDismissedAt: new Date().toISOString() })}
        />
      )}

      {forecastSummary && (
        <ForecastAdjustmentBanner summary={forecastSummary} onDismiss={dismissForecastSummary} />
      )}

      {showRecoveryWarning && (
        <Card className="flex flex-col gap-1">
          <p className="text-[11px] font-medium tracking-[0.16em]" style={{ color: 'var(--color-warning)' }}>HERSTEL-SIGNAAL</p>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
            De lange duurloop voelde de laatste twee weken slechter na de heuvelintervallen. Overweeg vandaag
            rustiger te gaan — minder herhalingen, lagere helling, of een kortere sessie.
          </p>
        </Card>
      )}

      {primary && primaryTemplate ? (
        <TodayMissionCard
          template={primaryTemplate}
          fullDuration={resolveEffectiveFullDuration(primaryTemplate, primary.scheduledDate, program)}
          weekNote={weeklyProgressionNote(primaryTemplate, primary.scheduledDate, program)}
          quickComplete={isQuickComplete(primaryTemplate)}
          onStart={(variant, feel, durationMinutes) => startSession(primary, primaryTemplate, variant, feel, durationMinutes)}
          onMove={(date) => handleMove(primary.id, date)}
          onSkip={() => handleSkip(primary.id)}
        />
      ) : (
        <Card>
          <Eyebrow>VANDAAG</Eyebrow>
          {allTodayDone ? (
            <>
              <p className="mt-2 font-display text-xl" style={{ color: 'var(--color-ink)' }}>Klaar voor vandaag</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je sessie(s) van vandaag staan op voltooid.</p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-xl" style={{ color: 'var(--color-ink)' }}>Rust of vrije dag</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Geen sessie gepland voor vandaag.</p>
            </>
          )}
        </Card>
      )}

      {hasTodoToday && (
        <SecondaryButton onClick={handleNoTimeToday} className="w-full">GEEN TIJD VANDAAG</SecondaryButton>
      )}

      {secondary.map((s) => {
        const t = templateById.get(s.templateId);
        if (!t) return null;
        return <SessionCard key={s.id} session={s} template={t} logs={sessionLogs} program={program} onTap={() => setActionSheetSession(s)} />;
      })}

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="flex min-h-8 items-center justify-center text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>WEEK</p>
          <p className="mt-1 font-display text-lg" style={{ color: 'var(--color-ink)' }}>{weekCompletedCount} / {weekSessions.length}</p>
        </Card>
        <Card className="text-center">
          <p className="flex min-h-8 items-center justify-center text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>CONSISTENTIE</p>
          <p className="mt-1 font-display text-lg" style={{ color: 'var(--color-gold)' }}>{readiness.consistency}%</p>
        </Card>
        <Card className="text-center">
          <p className="flex min-h-8 items-center justify-center text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>BLOK</p>
          <p className="mt-1 font-display text-lg" style={{ color: 'var(--color-ink)' }}>
            {position ? `${position.weekInPhase}/${position.phase.weekCount}` : '—'}
          </p>
        </Card>
        <Card className="text-center">
          <p className="flex min-h-8 items-center justify-center text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>REEKS</p>
          <p className="mt-1 font-display text-lg" style={{ color: 'var(--color-gold)' }}>{streak} {streak === 1 ? 'dag' : 'dagen'}</p>
        </Card>
      </div>

      {showWeeklyReflection && (
        <WeeklyReflectionCard
          completed={weekCompletedCount}
          total={weekSessions.length}
          lastWeekCompleted={lastWeekCompletedCount}
          lastWeekTotal={lastWeekSessions.length}
          streak={streak}
        />
      )}

      {objectiveProgress && <AdventureCard progress={objectiveProgress} onOpenLadder={onOpenLadder} />}

      {isMorning ? (
        <DailyStretchCard
          title="OCHTEND REKKEN"
          stretches={MORNING_ROUTINE}
          completed={stretchCompletion.morning === today}
          onToggleComplete={() => toggleStretchRoutine('morning')}
        />
      ) : (
        <DailyStretchCard
          title="AVOND REKKEN"
          stretches={EVENING_ROUTINE}
          completed={stretchCompletion.evening === today}
          onToggleComplete={() => toggleStretchRoutine('evening')}
        />
      )}

      <QuoteCard quote={quote} />

      {loggingSession && loggingTemplate && (
        <ExerciseLogger
          template={loggingTemplate}
          plannedSessionId={loggingSession.id}
          scheduledDate={loggingSession.scheduledDate}
          program={program}
          initialVariant={loggingVariant}
          onClose={() => setLoggingSession(null)}
        />
      )}

      {actionSheetSession && actionSheetTemplate && (
        <SessionActionSheet
          session={actionSheetSession}
          template={actionSheetTemplate}
          program={program}
          quickComplete={isQuickComplete(actionSheetTemplate)}
          completedLog={actionSheetLog}
          onStart={(variant, feel, durationMinutes) => {
            startSession(actionSheetSession, actionSheetTemplate, variant, feel, durationMinutes);
            setActionSheetSession(null);
          }}
          onMove={(date) => {
            handleMove(actionSheetSession.id, date);
            setActionSheetSession(null);
          }}
          onSkip={() => {
            handleSkip(actionSheetSession.id);
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

      {noTimeProposals && (
        <RescheduleDialog
          proposal={mergeNoTimeProposals(noTimeProposals)}
          onApply={() => {
            applyNoTimeToday(noTimeProposals);
            setNoTimeProposals(null);
          }}
          onCancel={() => setNoTimeProposals(null)}
        />
      )}
    </div>
  );
}
