import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { resolveProgramWeek } from '../utils/dates';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { computeObjectiveProgress } from '../engine/progression';
import { computeReadiness } from '../engine/readiness';
import { resolveEffectiveFullDuration, resolveVariantDuration, weeklyProgressionNote } from '../engine/substitutions';
import type { PlannedSession, SessionTemplate, SessionVariant } from '../models/training';
import { TodayMissionCard } from '../components/TodayMissionCard';
import { AdventureCard } from '../components/AdventureCard';
import { SessionCard } from '../components/SessionCard';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { StretchMenuButton } from '../components/StretchMenuButton';
import { Card, Eyebrow } from '../components/ui';
import type { ScheduleProposal } from '../engine/scheduler';

export function TodayPage({ onOpenLadder }: { onOpenLadder: () => void }) {
  const { program, plannedSessions, sessionLogs, objectives, milestoneProgress, settings, templateById, sessionsForWeek, moveSession, applyProposal, skipSession, logSession, undoLog } = useAppData();
  const today = todayISO();
  const [loggingSession, setLoggingSession] = useState<PlannedSession | null>(null);
  const [loggingVariant, setLoggingVariant] = useState<SessionVariant>('full');
  const [actionSheetSession, setActionSheetSession] = useState<PlannedSession | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);

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

  const weekCompletedCount = weekSessions.filter((s) => deriveSessionStatus(s, sessionLogs).status === 'completed').length;

  // Rolling 28-day consistency — the same number the Ascend screen shows, so
  // "CONSISTENTIE" never means two different things depending on which tab
  // you're on. Early in a fresh week the literal this-week ratio is 0/low by
  // definition, which reads as broken; the rolling figure is representative
  // from day one.
  const readiness = useMemo(() => computeReadiness(sessionLogs, plannedSessions), [sessionLogs, plannedSessions]);

  const firstObjective = objectives[0];
  const objectiveProgress = useMemo(
    () => (firstObjective ? computeObjectiveProgress(firstObjective, milestoneProgress, sessionLogs) : null),
    [firstObjective, milestoneProgress, sessionLogs],
  );

  function handleMove(sessionId: string, date: string) {
    const proposal = moveSession(sessionId, date);
    setPendingProposal(proposal);
  }

  const primaryTemplate = primary ? templateById.get(primary.templateId) : undefined;
  const loggingTemplate = loggingSession ? templateById.get(loggingSession.templateId) : undefined;
  const actionSheetTemplate = actionSheetSession ? templateById.get(actionSheetSession.templateId) : undefined;
  const actionSheetLog = actionSheetSession ? sessionLogs.find((l) => l.plannedSessionId === actionSheetSession.id) : undefined;

  // When Settings → Krachttraining "Bijgehouden in MacroFactor" is on,
  // starting a strength session skips the exercise-entry modal entirely —
  // it's logged immediately, one tap, instead of opening ExerciseLogger.
  function isQuickComplete(template?: SessionTemplate) {
    return template?.type === 'strength' && settings.strengthTrackedExternally;
  }

  function startSession(session: PlannedSession, template: SessionTemplate, variant: SessionVariant) {
    if (isQuickComplete(template)) {
      logSession({
        plannedSessionId: session.id,
        templateId: template.id,
        type: template.type,
        variant,
        durationMinutes: resolveVariantDuration(template, variant, session.scheduledDate, program),
      });
    } else {
      setLoggingVariant(variant);
      setLoggingSession(session);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>ASCEND</p>
          {position && (
            <p className="text-xs tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>
              WEEK {position.weekInProgram} • {position.phase.name}
            </p>
          )}
        </div>
        <StretchMenuButton />
      </div>

      {primary && primaryTemplate ? (
        <TodayMissionCard
          template={primaryTemplate}
          fullDuration={resolveEffectiveFullDuration(primaryTemplate, primary.scheduledDate, program)}
          weekNote={weeklyProgressionNote(primaryTemplate, primary.scheduledDate, program)}
          quickComplete={isQuickComplete(primaryTemplate)}
          onStart={(variant) => startSession(primary, primaryTemplate, variant)}
          onMove={(date) => handleMove(primary.id, date)}
          onSkip={() => skipSession(primary.id)}
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

      {secondary.map((s) => {
        const t = templateById.get(s.templateId);
        if (!t) return null;
        return <SessionCard key={s.id} session={s} template={t} logs={sessionLogs} program={program} onTap={() => setActionSheetSession(s)} />;
      })}

      <div className="grid grid-cols-3 gap-3">
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
      </div>

      {objectiveProgress && <AdventureCard progress={objectiveProgress} onOpenLadder={onOpenLadder} />}

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
          onStart={(variant) => {
            startSession(actionSheetSession, actionSheetTemplate, variant);
            setActionSheetSession(null);
          }}
          onMove={(date) => {
            handleMove(actionSheetSession.id, date);
            setActionSheetSession(null);
          }}
          onSkip={() => {
            skipSession(actionSheetSession.id);
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
