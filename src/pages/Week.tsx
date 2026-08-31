import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { addDays, mondayOfWeek, resolveProgramWeek, todayISO } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import type { PlannedSession, SessionVariant } from '../models/training';
import { WeekPlanner } from '../components/WeekPlanner';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { Eyebrow } from '../components/ui';
import type { ScheduleProposal } from '../engine/scheduler';

export function WeekPage() {
  const { program, sessionLogs, templateById, sessionsForWeek, moveSession, applyProposal, skipSession } = useAppData();
  const [weekStart, setWeekStart] = useState(mondayOfWeek(todayISO()));
  const [selected, setSelected] = useState<PlannedSession | null>(null);
  const [logging, setLogging] = useState<{ session: PlannedSession; variant: SessionVariant } | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);

  const sessions = sessionsForWeek(weekStart);
  const position = program ? resolveProgramWeek(program, weekStart) : null;

  function selectSession(session: PlannedSession) {
    const { status } = deriveSessionStatus(session, sessionLogs);
    if (status === 'completed') return;
    setSelected(session);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <div className="text-center">
          <Eyebrow>{position ? `WEEK ${position.weekInProgram} • ${position.phase.name}` : 'WEEK'}</Eyebrow>
          {weekStart === mondayOfWeek(todayISO()) && (
            <p className="text-[11px]" style={{ color: 'var(--color-gold)' }}>huidige week</p>
          )}
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>›</button>
      </div>

      <WeekPlanner
        weekStartDate={weekStart}
        sessions={sessions}
        templateById={templateById}
        logs={sessionLogs}
        program={program}
        onSelectSession={selectSession}
      />

      {selected && templateById.get(selected.templateId) && (
        <SessionActionSheet
          session={selected}
          template={templateById.get(selected.templateId)!}
          program={program}
          onStart={(variant) => {
            setLogging({ session: selected, variant });
            setSelected(null);
          }}
          onMove={(date) => {
            const proposal = moveSession(selected.id, date);
            setPendingProposal(proposal);
            setSelected(null);
          }}
          onSkip={() => {
            skipSession(selected.id);
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
