import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { resolveProgramWeek } from '../utils/dates';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { computeObjectiveProgress } from '../engine/progression';
import type { PlannedSession, SessionVariant } from '../models/training';
import { TodayMissionCard } from '../components/TodayMissionCard';
import { AdventureCard } from '../components/AdventureCard';
import { SessionCard } from '../components/SessionCard';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { Card, Eyebrow } from '../components/ui';
import type { ScheduleProposal } from '../engine/scheduler';

export function TodayPage({ onOpenLadder }: { onOpenLadder: () => void }) {
  const { program, sessionLogs, objectives, milestoneProgress, templateById, sessionsForWeek, moveSession, applyProposal, skipSession } = useAppData();
  const today = todayISO();
  const [loggingSession, setLoggingSession] = useState<PlannedSession | null>(null);
  const [loggingVariant, setLoggingVariant] = useState<SessionVariant>('full');
  const [actionSheetSession, setActionSheetSession] = useState<PlannedSession | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);

  const position = program ? resolveProgramWeek(program, today) : null;
  const weekStart = mondayOfWeek(today);
  const weekSessions = sessionsForWeek(weekStart);
  const todaySessions = weekSessions.filter((s) => s.scheduledDate === today);
  const primary = todaySessions.find((s) => deriveSessionStatus(s, sessionLogs).status !== 'completed' && s.status !== 'skipped') ?? todaySessions[0];
  const secondary = todaySessions.filter((s) => s.id !== primary?.id);

  const weekCompletedCount = weekSessions.filter((s) => deriveSessionStatus(s, sessionLogs).status === 'completed').length;
  const consistencyPct = weekSessions.length ? Math.round((weekCompletedCount / weekSessions.length) * 100) : 0;

  const firstObjective = objectives[0];
  const objectiveProgress = useMemo(
    () => (firstObjective ? computeObjectiveProgress(firstObjective, milestoneProgress, sessionLogs) : null),
    [firstObjective, milestoneProgress, sessionLogs],
  );

  function handleMove(sessionId: string, date: string) {
    const proposal = moveSession(sessionId, date);
    setPendingProposal(proposal);
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-6">
      <div>
        <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>ASCEND</p>
        {position && (
          <p className="text-xs tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>
            WEEK {position.weekInProgram} • {position.phase.name}
          </p>
        )}
      </div>

      {primary && templateById.get(primary.templateId) ? (
        <TodayMissionCard
          template={templateById.get(primary.templateId)!}
          onStart={(variant) => {
            setLoggingVariant(variant);
            setLoggingSession(primary);
          }}
          onMove={(date) => handleMove(primary.id, date)}
          onSkip={() => skipSession(primary.id)}
        />
      ) : (
        <Card>
          <Eyebrow>VANDAAG</Eyebrow>
          <p className="mt-2 font-display text-xl" style={{ color: 'var(--color-ink)' }}>Rust of vrije dag</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Geen sessie gepland voor vandaag.</p>
        </Card>
      )}

      {secondary.map((s) => {
        const t = templateById.get(s.templateId);
        if (!t) return null;
        return <SessionCard key={s.id} session={s} template={t} logs={sessionLogs} onTap={() => setActionSheetSession(s)} />;
      })}

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>WEEK</p>
          <p className="mt-1 font-display text-lg" style={{ color: 'var(--color-ink)' }}>{weekCompletedCount} / {weekSessions.length}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>CONSISTENTIE</p>
          <p className="mt-1 font-display text-lg" style={{ color: 'var(--color-gold)' }}>{consistencyPct}%</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>BLOK</p>
          <p className="mt-1 font-display text-lg" style={{ color: 'var(--color-ink)' }}>
            {position ? `${position.weekInPhase}/${position.phase.weekCount}` : '—'}
          </p>
        </Card>
      </div>

      {objectiveProgress && <AdventureCard progress={objectiveProgress} onOpenLadder={onOpenLadder} />}

      {loggingSession && templateById.get(loggingSession.templateId) && (
        <ExerciseLogger
          template={templateById.get(loggingSession.templateId)!}
          plannedSessionId={loggingSession.id}
          initialVariant={loggingVariant}
          onClose={() => setLoggingSession(null)}
        />
      )}

      {actionSheetSession && templateById.get(actionSheetSession.templateId) && (
        <SessionActionSheet
          session={actionSheetSession}
          template={templateById.get(actionSheetSession.templateId)!}
          onStart={(variant) => {
            setLoggingVariant(variant);
            setLoggingSession(actionSheetSession);
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
