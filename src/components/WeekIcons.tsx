import type { ReactNode } from 'react';
import type { DisplayStatus } from '../engine/sessionStatus';

// De kleine pictogrammen van de weeklijst: één lijn, 1,6 breed, op 24 bij 24
// (de stijl van de ontwerpen in "steen en contour"). Alleen voor Week.

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// Status van een training of rustdag, gekleurd met de tokens.
const STATUS: Record<DisplayStatus, { color: string; label: string }> = {
  completed: { color: 'var(--color-success-text)', label: 'Gedaan' },
  today: { color: 'var(--color-action)', label: 'Vandaag' },
  planned: { color: 'var(--color-ink-dim)', label: 'Gepland' },
  moved: { color: 'var(--color-status)', label: 'Verplaatst' },
  skipped: { color: 'var(--color-danger-text)', label: 'Overgeslagen' },
  missed: { color: 'var(--color-warning)', label: 'Gemist' },
  rest: { color: 'var(--color-ink-dim)', label: 'Rustdag' },
};

export function WeekStatusIcon({ status }: { status: DisplayStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" style={{ color: s.color }}>
      <Svg size={20}>
        {status === 'completed' && (<><circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.7 2.6L16.2 9.5" /></>)}
        {status === 'today' && (<><circle cx="12" cy="12" r="8.5" opacity=".45" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></>)}
        {status === 'planned' && <circle cx="12" cy="12" r="8.5" />}
        {status === 'moved' && (<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5h7M13 9.5l3 3-3 3" /></>)}
        {status === 'skipped' && (<><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></>)}
        {status === 'missed' && (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5" /><circle cx="12" cy="16.2" r=".4" fill="currentColor" /></>)}
        {status === 'rest' && <path d="M3 9.5c3 0 4.5 5 9 5s6-5 9-5" />}
      </Svg>
      <span className="sr-only">{s.label}</span>
    </span>
  );
}
