import type { ReactNode } from 'react';
import type { LeaveKind } from '../models/leave';
import type { WeekLeaveBand } from '../engine/leaveWeek';
import { Icon } from './icons';

// Eén band voor een periode in de weeklijst (engine/leaveWeek.ts): een rond pictogram links in de
// maat en stijl van de trainingsschijven, de soort, de dagen van deze week, je notitie en één regel
// wat het betekent. IJsblauw, want het is status; geen mint. Een tik opent het blad van de periode.

const SIZE = 44;

// Eén lijn, 1,6 breed, op 24 bij 24, zoals de pictogrammen van de weeklijst (WeekIcons.tsx).
const GLYPH: Record<LeaveKind, ReactNode> = {
  // Zon: vakantie.
  no_training: (<><circle cx="12" cy="12" r="3.8" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6" /></>),
  // Gewicht met een streep erdoor: geen sportschool.
  no_gym: (<><path d="M6.5 9v6M17.5 9v6M3.8 10.5v3M20.2 10.5v3M6.5 12h11" /><path d="M4 20L20 4" /></>),
  // Twee toppen: tocht.
  trek: (<path d="M3 19l6-10.5 3.6 6L15 11l6 8z" />),
  // Kalender: vrije dagen.
  free_days: (<><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10.5h16M8.5 3.5v3M15.5 3.5v3" /></>),
};

export function LeaveGlyph({ kind, size }: { kind: LeaveKind; size: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {GLYPH[kind]}
    </svg>
  );
}

export function LeaveKindDisc({ kind, size = SIZE }: { kind: LeaveKind; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: 'color-mix(in srgb, var(--color-status) 16%, transparent)', color: 'var(--color-status)' }}
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {GLYPH[kind]}
      </svg>
    </span>
  );
}

export function LeaveWeekBand({ band, onOpen }: { band: WeekLeaveBand; onOpen: (periodId: string) => void }) {
  const { period } = band;
  return (
    <button
      type="button"
      data-sheet-from
      data-week-band={band.key}
      onClick={() => onOpen(period.id)}
      aria-label={`${band.title}, ${band.range}${band.extent ? `, ${band.extent}` : ''}, bijwerken`}
      className="flex min-h-[64px] w-full items-center gap-3 border-t px-3 py-2 text-left transition-colors active:opacity-75 first:border-t-0"
      style={{ borderColor: 'var(--color-card-border)', background: 'color-mix(in srgb, var(--color-status) 6%, transparent)' }}
    >
      <LeaveKindDisc kind={period.kind} />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{band.title}</span>
        <span className="mt-0.5 block text-xs leading-4 tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          {band.range}{band.extent ? ` · ${band.extent}` : ''}
        </span>
        {band.note && <span className="mt-0.5 block break-words text-xs leading-4" style={{ color: 'var(--color-ink)' }}>{band.note}</span>}
        <span className="block break-words text-xs leading-4" style={{ color: 'var(--color-ink-dim)' }}>{band.line}</span>
      </span>
      <span className="flex shrink-0 items-center" style={{ color: 'var(--color-ink-dim)' }} aria-hidden="true"><Icon name="verder" size={16} /></span>
    </button>
  );
}
