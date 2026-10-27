import type { TrainingGoal } from '../../models/goals';
import { formatDateNL } from '../../utils/dates';
import { TextButton } from '../TextButton';
import { Sheet } from '../settings/Sheet';

// "Eerdere doelen": wat gearchiveerd is, afgerond of voorbij. Een gearchiveerd doel
// kun je terughalen (het wordt dan een doel zonder datum, klaar voor een nieuwe); een voorbij doel
// archiveer je met een voorstel, want het kan nog iets in je planning raken.
export function EarlierGoalsSheet({
  goals, onUnarchive, onArchive, onClose,
}: {
  goals: TrainingGoal[];
  onUnarchive: (goalId: string) => void;
  onArchive: (goal: TrainingGoal) => void;
  onClose: () => void;
}) {
  return (
    <Sheet eyebrow="Ascend" title="Eerdere doelen" line={goals.length === 0 ? 'Nog niets hier. Een afgerond of weggelegd doel komt hier terecht.' : undefined} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-3 pb-2">
          {goals.length > 0 && (
            <div className="st-list">
              {goals.map((g) => (
                <div key={g.id} className="flex min-h-[64px] items-center justify-between gap-3 border-b px-4 py-2 last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
                  <span className="min-w-0">
                    <span className="block truncate text-base" style={{ color: 'var(--color-ink)' }}>{g.name || 'Naamloos doel'}</span>
                    <span className="block text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                      {g.status === 'archived' ? 'Weggelegd' : g.status === 'completed' ? 'Afgerond' : `Voorbij${g.targetDate ? `, ${formatDateNL(g.targetDate)}` : ''}`}
                    </span>
                  </span>
                  {g.status === 'archived'
                    ? <TextButton onClick={() => onUnarchive(g.id)} className="shrink-0">Terughalen</TextButton>
                    : g.status === 'completed'
                      ? null
                      : <TextButton tone="dim" onClick={() => onArchive(g)} className="shrink-0">Archiveren</TextButton>}
                </div>
              ))}
            </div>
          )}
          <TextButton tone="dim" onClick={close} className="self-center">Sluiten</TextButton>
        </div>
      )}
    </Sheet>
  );
}
