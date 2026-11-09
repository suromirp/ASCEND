import type { ReactNode } from 'react';
import type { LeaveKind } from '../models/leave';
import { periodSpan, type WeekLeaveBand } from '../engine/leaveWeek';

// Een periode in de weeklijst (engine/leaveWeek.ts). IJsblauw, want het is status; geen mint. Een tik op de kop opent
// het blad van de periode.

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

// De periode als eigen paneel in de weeklijst (variant A, gekozen door de eigenaar, docs/beslissingen/2026-11-09-week-paneel.md):
// een afgerond vlak met een lichte ijsblauwe tint, een kop op één regel (pictogram, soort, de dagen van de hele periode)
// met je notitie klein eronder, en de dagen van deze week erin. Waar het paneel stopt, stopt de periode; loopt hij door
// naar de vorige of volgende week, dan blijft die kant open. De uitleg staat in het blad dat een tik op de kop opent.
export function LeaveWeekPanel({ band, onOpen, children }: { band: WeekLeaveBand; onOpen: (periodId: string) => void; children: ReactNode }) {
  const { period } = band;
  const span = periodSpan(period.startDate, period.endDate);
  const before = period.startDate < band.dates[0];
  const after = period.endDate > band.dates[band.dates.length - 1];
  const corners = before && after ? '' : before ? 'rounded-b-2xl' : after ? 'rounded-t-2xl' : 'rounded-2xl';
  return (
    <div
      data-week-panel={band.key}
      className={`mx-2 overflow-hidden border ${corners} ${before ? 'border-t-0' : 'mt-2'} ${after ? 'border-b-0' : 'mb-2'}`}
      style={{ background: 'var(--color-period-tint)', borderColor: 'var(--color-period-edge)' }}
    >
      <button
        type="button"
        data-sheet-from
        data-week-band={band.key}
        onClick={() => onOpen(period.id)}
        aria-label={`${band.title}, ${span}${band.note ? `, ${band.note}` : ''}, bijwerken`}
        className="flex min-h-[44px] w-full items-center gap-2.5 px-3 pt-2 pb-1 text-left active:opacity-75"
      >
        <span style={{ color: 'var(--color-status)' }}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            {GLYPH[period.kind]}
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 break-words text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{band.title}</span>
            <span className="shrink-0 text-[13px] tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{span}</span>
          </span>
          {band.note && <span className="block break-words text-xs leading-4" style={{ color: 'var(--color-ink-dim)' }}>{band.note}</span>}
        </span>
      </button>
      <div className="pl-2">{children}</div>
    </div>
  );
}
