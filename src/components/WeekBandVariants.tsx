import { useId, type ReactNode } from 'react';
import type { WeekLeaveBand } from '../engine/leaveWeek';
import { formatDayMonthNL } from '../utils/dates';
import { LeaveGlyph } from './LeaveWeekBand';
import { BACK_RIDGE, FRONT_RIDGE } from './SkyBand';

// TIJDELIJK, alleen op claude/week-band-varianten: drie ontwerpen voor de periode in de weeklijst,
// gekozen met window.__WB ('A' paneel, 'B' lucht, 'C' lijn). Niet voor main.

export type WB = 'A' | 'B' | 'C';
export const wbVariant = (): WB => ((window as unknown as { __WB?: WB }).__WB ?? 'A');

// "14 t/m 18 nov", "28 nov t/m 2 dec", "14 nov".
export function periodSpan(start: string, end: string): string {
  if (start === end) return formatDayMonthNL(start);
  const a = start.slice(5, 7) === end.slice(5, 7) ? String(Number(start.slice(8, 10))) : formatDayMonthNL(start);
  return `${a} t/m ${formatDayMonthNL(end)}`;
}

const INK = 'var(--color-ink)';
const DIM = 'var(--color-ink-dim)';

function Head({ band, onOpen, tone }: { band: WeekLeaveBand; onOpen: (id: string) => void; tone: WB }) {
  const { period } = band;
  const span = periodSpan(period.startDate, period.endDate);
  const sky = tone === 'B';
  return (
    <button
      type="button"
      data-sheet-from
      data-week-band={band.key}
      onClick={() => onOpen(period.id)}
      aria-label={`${band.title}, ${span}${band.note ? `, ${band.note}` : ''}, bijwerken`}
      className={`flex w-full min-h-[44px] items-center gap-2.5 text-left active:opacity-75 ${tone === 'A' ? 'px-3 pt-2 pb-1' : tone === 'B' ? 'px-3 pt-2' : 'pl-3 pr-3 pt-2'}`}
    >
      <span style={{ color: 'var(--color-status)' }}><LeaveGlyph kind={period.kind} size={tone === 'C' ? 18 : 22} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 break-words text-[15px] font-medium leading-snug" style={{ color: INK }}>{band.title}</span>
          <span className="shrink-0 text-[13px] tabular-nums" style={{ color: sky ? INK : DIM }}>{span}</span>
        </span>
        {band.note && <span className="block break-words text-xs leading-4" style={{ color: DIM }}>{band.note}</span>}
      </span>
    </button>
  );
}

export function WeekBandGroup({ band, children, onOpen }: { band: WeekLeaveBand; children: ReactNode; onOpen: (id: string) => void }) {
  const v = wbVariant();
  const before = band.period.startDate < band.dates[0];
  const after = band.period.endDate > band.dates[band.dates.length - 1];
  const gradient = useId();
  if (v === 'A') {
    // Het paneel stopt waar de periode stopt: onderaan afgerond, of vlak als hij volgende week doorloopt.
    return (
      <div
        data-wb="A"
        className={`mx-2 overflow-hidden border ${after ? 'rounded-t-2xl border-b-0' : 'my-2 rounded-2xl'} ${before ? '' : 'mt-2'}`}
        style={{ background: 'var(--color-period-tint)', borderColor: 'var(--color-period-edge)', marginBottom: after ? 0 : undefined }}
      >
        <Head band={band} onOpen={onOpen} tone="A" />
        <div className="pl-2">{children}</div>
      </div>
    );
  }
  if (v === 'B') {
    return (
      <div data-wb="B" className="relative">
        <div className="sky-lane on-light relative overflow-hidden" style={{ background: 'linear-gradient(180deg, var(--color-sky-top) 0%, var(--color-sky-bottom) 100%)', paddingBottom: 22 }}>
          <Head band={band} onOpen={onOpen} tone="B" />
          <svg className="pointer-events-none absolute inset-x-0 bottom-[-1px] block h-7 w-full" viewBox="0 0 390 64" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0.35" style={{ stopColor: 'var(--color-mountain-front)' }} />
                <stop offset="1" style={{ stopColor: 'var(--color-card)' }} />
              </linearGradient>
            </defs>
            <path d={BACK_RIDGE} style={{ fill: 'var(--color-mountain-back)' }} />
            <path d={FRONT_RIDGE} fill={`url(#${gradient})`} />
          </svg>
        </div>
        <div className="relative">
          <span aria-hidden="true" data-period-rail className={`pointer-events-none absolute left-0 top-0 w-[3px] ${after ? 'bottom-0' : 'bottom-0 rounded-br-full'}`} style={{ background: 'var(--color-status)' }} />
          {children}
        </div>
      </div>
    );
  }
  return (
    <div data-wb="C" className="relative">
      <Head band={band} onOpen={onOpen} tone="C" />
      <div className="relative">
        <span
          aria-hidden="true"
          data-period-rail
          className={`pointer-events-none absolute left-1.5 w-1 ${before ? 'top-0' : 'top-1 rounded-t-full'} ${after ? 'bottom-0' : 'bottom-1 rounded-b-full'}`}
          style={{ background: 'var(--color-period-line)' }}
        />
        {children}
      </div>
    </div>
  );
}
