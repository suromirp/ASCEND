import type { MilestoneView } from '../engine/progression';
import { formatDateNL } from '../utils/dates';

const MARKER: Record<string, string> = { completed: '✓', current: '●', upcoming: '○', future: '○' };
const COLOR: Record<string, string> = {
  completed: 'var(--color-bronze)',
  current: 'var(--color-gold)',
  upcoming: 'var(--color-ink-dim)',
  future: 'var(--color-ink-dim)',
};

export function ObjectiveCard({
  milestone,
  onMarkCleared,
  isLast,
}: {
  milestone: MilestoneView;
  onMarkCleared?: () => void;
  isLast?: boolean;
}) {
  const { definition, status, clearedDate } = milestone;
  const canMarkManually = status === 'current' && definition.requirement.kind === 'manual' && onMarkCleared;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold"
          style={{
            borderColor: COLOR[status],
            color: COLOR[status],
            background: status === 'completed' ? 'rgba(176,141,87,0.12)' : 'transparent',
          }}
        >
          {MARKER[status]}
        </span>
        {!isLast && <span className="mt-1 w-px flex-1" style={{ background: 'var(--color-card-border)', minHeight: '24px' }} />}
      </div>
      <div className="flex-1 pb-6">
        <p
          className={status === 'current' ? 'font-display text-lg' : 'text-sm'}
          style={{ color: status === 'future' || status === 'upcoming' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}
        >
          {definition.title}
        </p>
        {status === 'completed' && clearedDate && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>behaald op {formatDateNL(clearedDate)}</p>
        )}
        {status === 'current' && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-gold)' }}>huidig objectief</p>
        )}
        {canMarkManually && (
          <button
            onClick={onMarkCleared}
            className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}
          >
            MARKEER ALS BEHAALD
          </button>
        )}
      </div>
    </div>
  );
}
