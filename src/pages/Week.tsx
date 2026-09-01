import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { addDays, mondayOfWeek, resolveProgramWeek, todayISO } from '../utils/dates';
import { resolveVariantDuration } from '../engine/substitutions';
import type { PlannedSession, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { WeekPlanner } from '../components/WeekPlanner';
import { SessionActionSheet } from '../components/SessionActionSheet';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { Eyebrow } from '../components/ui';
import type { ScheduleProposal } from '../engine/scheduler';

export function WeekPage() {
  const { program, sessionLogs, settings, templateById, sessionsForWeek, moveSession, applyProposal, skipSession, logSession, undoLog } = useAppData();
  const [weekStart, setWeekStart] = useState(mondayOfWeek(todayISO()));
  const [selected, setSelected] = useState<PlannedSession | null>(null);
  const [logging, setLogging] = useState<{ session: PlannedSession; variant: SessionVariant } | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ScheduleProposal | null>(null);

  const sessions = sessionsForWeek(weekStart);
  const position = program ? resolveProgramWeek(program, weekStart) : null;
  const selectedLog = selected ? sessionLogs.find((l) => l.plannedSessionId === selected.id) : undefined;

  // A completed session is still selectable — SessionActionSheet shows an
  // "ongedaan maken" (undo) view for it instead of the start/move/skip one.
  function selectSession(session: PlannedSession) {
    setSelected(session);
  }

  // Mirrors Today.tsx: with Krachttraining "Bijgehouden in MacroFactor" on,
  // starting a strength session logs it immediately instead of opening the
  // exercise-entry modal.
  function isQuickComplete(template?: SessionTemplate) {
    return template?.type === 'strength' && settings.strengthTrackedExternally;
  }

  function startSession(session: PlannedSession, template: SessionTemplate, variant: SessionVariant, feel?: SubjectiveFeel) {
    if (isQuickComplete(template)) {
      logSession({
        plannedSessionId: session.id,
        templateId: template.id,
        type: template.type,
        variant,
        durationMinutes: resolveVariantDuration(template, variant, session.scheduledDate, program),
        subjectiveFeel: feel,
      });
    } else {
      setLogging({ session, variant });
    }
  }

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-6 pt-6">
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
          quickComplete={isQuickComplete(templateById.get(selected.templateId))}
          completedLog={selectedLog}
          onStart={(variant, feel) => {
            startSession(selected, templateById.get(selected.templateId)!, variant, feel);
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
