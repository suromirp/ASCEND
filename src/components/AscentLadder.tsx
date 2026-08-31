import type { ObjectiveProgress } from '../engine/progression';
import { ObjectiveCard } from './ObjectiveCard';
import { Eyebrow } from './ui';
import { getGR5MilestoneDetail } from '../data/gr5Details';

export function AscentLadder({
  progress,
  onMarkCleared,
  onSelectMilestone,
}: {
  progress: ObjectiveProgress;
  onMarkCleared: (milestoneId: string) => void;
  onSelectMilestone?: (milestoneId: string) => void;
}) {
  return (
    <div>
      <Eyebrow>DE BEKLIMMING</Eyebrow>
      <h2 className="mt-1 font-display text-2xl" style={{ color: 'var(--color-ink)' }}>{progress.objective.name}</h2>
      {progress.objective.description && (
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{progress.objective.description}</p>
      )}

      <div className="mt-6">
        {progress.milestones.map((m, i) => (
          <ObjectiveCard
            key={m.definition.id}
            milestone={m}
            subtitle={getGR5MilestoneDetail(m.definition.order)?.subtitle}
            isLast={i === progress.milestones.length - 1}
            onMarkCleared={() => onMarkCleared(m.definition.id)}
            onSelect={onSelectMilestone ? () => onSelectMilestone(m.definition.id) : undefined}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-col items-center gap-1 py-4">
        <span className="text-2xl" style={{ color: 'var(--color-gold)' }}>△</span>
        <span className="font-display text-sm tracking-widest" style={{ color: 'var(--color-ink-dim)' }}>SUMMIT</span>
      </div>
    </div>
  );
}
