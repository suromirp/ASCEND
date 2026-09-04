import { useState } from 'react';
import type { Stretch } from '../models/training';
import { Card } from './ui';

export function StretchItems({ stretches, className = 'mt-3 flex flex-col gap-2' }: { stretches: Stretch[]; className?: string }) {
  return (
    <ul className={className}>
      {stretches.map((s) => (
        <li key={s.name} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="flex items-baseline gap-1.5" style={{ color: 'var(--color-ink)' }}>
            {s.name}
            {s.videoUrl && (
              <a
                href={s.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-xs underline underline-offset-2"
                style={{ color: 'var(--color-sky)' }}
              >
                video ↗
              </a>
            )}
          </span>
          <span className="shrink-0 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {s.durationSec ? `${s.durationSec}s` : ''}{s.note ? (s.durationSec ? ` • ${s.note}` : s.note) : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StretchList({
  title,
  stretches,
  className = 'mt-5',
}: {
  title: string;
  stretches: Stretch[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{title}</span>
        <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{open ? '−' : `${stretches.length} tonen`}</span>
      </button>
      {open && <StretchItems stretches={stretches} />}
    </Card>
  );
}
