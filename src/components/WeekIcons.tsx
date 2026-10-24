import type { ReactNode } from 'react';
import type { DisplayStatus } from '../engine/sessionStatus';
import type { SessionTemplate } from '../models/training';
import { templateSport } from '../engine/sports';

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
  today: { color: 'var(--color-gold)', label: 'Vandaag' },
  planned: { color: 'var(--color-stone)', label: 'Gepland' },
  moved: { color: 'var(--color-sky)', label: 'Verplaatst' },
  skipped: { color: 'var(--color-danger-text)', label: 'Overgeslagen' },
  missed: { color: 'var(--color-warning)', label: 'Gemist' },
  rest: { color: 'var(--color-stone)', label: 'Rustdag' },
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

// De sport van een template: kracht, hardlopen, wandelen, fietsen. Een rustdag
// of onbekende vorm krijgt niets, zodat de naam op dezelfde plek begint.
export function WeekSportIcon({ template }: { template: SessionTemplate }) {
  const sport = template.type === 'strength' ? 'kracht' : templateSport(template);
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
      {sport === 'kracht' && (<Svg size={16}><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></Svg>)}
      {sport === 'running' && (<Svg size={16}><path d="M3 16.5V13l3-1 2-5h3l1 3 4 1.5c2.5.9 5 2 5 4v1H3z" /><path d="M3 19.5h18" /></Svg>)}
      {sport === 'hiking' && (<Svg size={16}><path d="M8 3l3 18" /><path d="M6.5 6.5h4" /><path d="M15 4c1.7 0 3 1.3 3 3s-1.3 3-3 3" /><path d="M15 10l2 11" /></Svg>)}
      {sport === 'cycling' && (<Svg size={16}><circle cx="6" cy="16" r="3.5" /><circle cx="18" cy="16" r="3.5" /><path d="M6 16l4-8h5l3 8M10 8l3 8" /></Svg>)}
    </span>
  );
}

// Het amberen driehoekje van een zware beendag; de uitleg staat in de legenda van de grafiek.
export function LegMark() {
  return (
    <span className="inline-flex shrink-0" style={{ color: 'var(--color-warning)' }}>
      <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" fill="currentColor"><path d="M6 1.5l5 9H1z" /></svg>
      <span className="sr-only">Zware beendag</span>
    </span>
  );
}

export function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return <Svg size={22}><path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></Svg>;
}

export function MapIcon() {
  return <Svg size={16}><path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></Svg>;
}
