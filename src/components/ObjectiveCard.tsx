import type { ReactNode } from 'react';
import type { MilestoneView } from '../engine/progression';
import { formatDateNL } from '../utils/dates';
import { Icon } from './icons';
import { NumText, StatusPill } from './ui';

const MARKER: Record<string, ReactNode> = {
  completed: <Icon name="vinkje" size={16} />,
  current: <Icon name="vandaagStip" size={16} />,
  upcoming: <Icon name="gepland" size={16} />,
  future: <Icon name="gepland" size={16} />,
};
const COLOR: Record<string, string> = {
  completed: 'var(--color-progress)',
  current: 'var(--color-action)',
  upcoming: 'var(--color-ink-dim)',
  future: 'var(--color-ink-dim)',
};

export function ObjectiveCard({
  milestone,
  subtitle,
  onMarkCleared,
  onSelect,
  isLast,
}: {
  milestone: MilestoneView;
  subtitle?: string;
  onMarkCleared?: () => void;
  onSelect?: () => void;
  isLast?: boolean;
}) {
  const { definition, status, clearedDate } = milestone;
  const canMarkManually = status === 'current' && definition.requirement.kind === 'manual' && onMarkCleared;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className="mt-2 flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold"
          style={{
            borderColor: COLOR[status],
            color: COLOR[status],
            background: status === 'completed' ? 'color-mix(in srgb, var(--color-progress) 12%, transparent)' : 'transparent',
          }}
        >
          {MARKER[status]}
        </span>
        {!isLast && <span className="mt-1 w-px flex-1" style={{ background: 'var(--color-card-border)', minHeight: '12px' }} />}
      </div>
      <div className={`min-w-0 flex-1 ${status === 'current' ? 'pb-4' : 'pb-1'}`}>
        <div className={status === 'current' ? 'rounded-xl border p-3' : ''} style={status === 'current' ? { borderColor: 'var(--color-control-border)', background: 'var(--color-surface)' } : undefined}>
          <button
            type="button"
            onClick={onSelect}
            disabled={!onSelect}
            aria-label={onSelect ? `Meer info over ${definition.title}` : undefined}
            className={`flex w-full items-center justify-between gap-2 text-left disabled:cursor-default ${status === 'current' ? '' : 'min-h-[44px]'}`}
          >
            <span className="min-w-0">
              {status === 'current' && <span className="mb-1 block"><StatusPill tone="progress">Volgend kamp</StatusPill></span>}
              <span
                className={status === 'current' ? 'block font-display text-xl' : 'block text-sm'}
                style={{ color: status === 'future' || status === 'upcoming' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}
              >
                <NumText>{definition.title}</NumText>
              </span>
              {subtitle && status === 'current' && (
                <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{subtitle}</span>
              )}
              {status === 'completed' && clearedDate && (
                <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>behaald op {formatDateNL(clearedDate)}</span>
              )}
            </span>
            {onSelect && (
              <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }} aria-hidden="true"><Icon name="verder" size={18} /></span>
            )}
          </button>
          {canMarkManually && (
            <button
              onClick={onMarkCleared}
              className="mt-2 min-h-[44px] rounded-lg border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: 'var(--color-action)', color: 'var(--color-action)' }}
            >
              Markeer als behaald
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
