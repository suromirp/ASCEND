import { useState } from 'react';
import type { Stretch } from '../models/training';
import { Card } from './ui';
import { CountdownTimer } from './CountdownTimer';

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function StretchItems({ stretches, className = 'mt-3 flex flex-col gap-2' }: { stretches: Stretch[]; className?: string }) {
  const [timerFor, setTimerFor] = useState<Stretch | null>(null);

  return (
    <>
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
            <span className="flex shrink-0 items-baseline gap-1.5 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              {s.durationSec ? `${s.durationSec}s` : ''}{s.note ? (s.durationSec ? ` • ${s.note}` : s.note) : ''}
              {s.durationSec !== undefined && (
                <button
                  onClick={() => setTimerFor(s)}
                  aria-label={`Timer voor ${s.name}`}
                  className="inline-flex shrink-0"
                  style={{ color: 'var(--color-bronze)' }}
                >
                  <ClockIcon />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {timerFor && (
        <CountdownTimer initialSeconds={timerFor.durationSec ?? 30} label={timerFor.name} onClose={() => setTimerFor(null)} />
      )}
    </>
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
