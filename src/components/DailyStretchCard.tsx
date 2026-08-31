import { useState } from 'react';
import type { Stretch } from '../models/training';
import { Card } from './ui';
import { StretchItems } from './StretchList';

export function DailyStretchCard({
  title,
  stretches,
  completed,
  onToggleComplete,
}: {
  title: string;
  stretches: Stretch[];
  completed: boolean;
  onToggleComplete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleComplete}
          aria-pressed={completed}
          aria-label={completed ? `${title} afgevinkt — tik om ongedaan te maken` : `${title} afvinken`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold"
          style={{
            borderColor: completed ? 'var(--color-success)' : 'var(--color-card-border)',
            background: completed ? 'var(--color-success)' : 'transparent',
            color: completed ? '#0d0d0f' : 'transparent',
          }}
        >
          ✓
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center justify-between text-left"
          aria-expanded={open}
        >
          <span
            className="text-sm font-medium"
            style={{ color: completed ? 'var(--color-ink-dim)' : 'var(--color-ink)', textDecoration: completed ? 'line-through' : 'none' }}
          >
            {title}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{open ? '−' : `${stretches.length} tonen`}</span>
        </button>
      </div>
      {open && <StretchItems stretches={stretches} />}
    </Card>
  );
}
