import type { RouteDayRow } from '../../engine/standing';
import { formatHoursMinutesNL } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';
import { dayMonth } from './chartParts';

// Je stand → the GR5 day: a typical route day next to your best of the last
// eight weeks. Not a score: months before the trip you are not supposed to
// be there yet, the long hikes of spring and summer close the gap.

const LABEL: Record<RouteDayRow['key'], string> = { tijd: 'Tijd op pad', stijgen: 'Stijgen', dalen: 'Dalen', rugzak: 'Rugzak', dagen: 'Dagen achter elkaar' };

function value(row: RouteDayRow, v: number): string {
  if (row.key === 'tijd') return formatHoursMinutesNL(v);
  if (row.key === 'rugzak') return `${formatNumberNL(v, 0)} kg`;
  if (row.key === 'dagen') return `${v} ${v === 1 ? 'dag' : 'dagen'}`;
  return `${formatNumberNL(v, 0)} m`;
}

export function RouteDayCard({ goalName, weeksToGo, rows, onOpen }: { goalName: string; weeksToGo?: number; rows: RouteDayRow[]; onOpen: () => void }) {
  if (rows.length === 0) return null;
  return (
    <Card texture className="flex flex-col gap-3">
      <div>
        <Eyebrow>{goalName.toUpperCase()}</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Een gewone dag op de route naast je beste van de laatste acht weken{weeksToGo !== undefined ? `. Nog ${weeksToGo} weken` : ''}.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const share = row.need > 0 ? Math.min(1, row.best / row.need) : 0;
          return (
            <div key={row.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span style={{ color: 'var(--color-ink)' }}>{LABEL[row.key]}</span>
                <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                  <span style={{ color: share >= 1 ? 'var(--color-gold)' : 'var(--color-ink)' }}>{row.best > 0 ? value(row, row.best) : 'nog niets'}</span> van {value(row, row.need)}
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--color-charcoal)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, row.best > 0 ? 3 : 0)}%`, background: share >= 1 ? 'var(--color-gold)' : 'var(--color-bronze)' }} />
              </div>
              {row.bestDate && row.key !== 'dagen' && <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>beste op {dayMonth(row.bestDate)}</span>}
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Je hoeft er nu nog niet te zijn. De lange tochten in het voorjaar en de zomer maken het verschil; de planning bouwt daar naartoe.
      </p>
      <button onClick={onOpen} className="inline-flex min-h-[44px] items-center self-start text-xs font-medium underline underline-offset-2" style={{ color: 'var(--color-gold)' }}>Alles over je doel ›</button>
    </Card>
  );
}
