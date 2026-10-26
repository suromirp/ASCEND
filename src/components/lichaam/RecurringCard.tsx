import type { RecurringSpot } from '../../engine/bodyRecurrence';
import { formatDateNL } from '../../utils/dates';
import { Card, Eyebrow } from '../ui';

// "Wat terugkomt" op Lichaam (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md): per plek de
// laatste weken als vakjes, de oudste links en deze week rechts met een ijsrand ("waar je bent").
// Salie is spierpijn of stijf, amber is pijn, marine is niets. De vorm (een vakje per week) draagt
// het patroon, de kleur is niet het enige signaal: de rij zegt ook "5 van 8 weken".

const CELL_COLOR = { 0: 'var(--color-track)', 1: 'var(--color-sage)', 2: 'var(--color-warning)' } as const;

export function RecurringCard({ items, from, weeks, onPick }: { items: RecurringSpot[]; from: string; weeks: number; onPick: (item: RecurringSpot) => void }) {
  if (items.length === 0) return null;
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Wat terugkomt</Eyebrow>
        <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>laatste {weeks} weken</span>
      </div>
      <ul className="flex flex-col">
        {items.map((item, i) => (
          <li key={item.key} className={i > 0 ? 'border-t' : ''} style={{ borderColor: 'var(--color-card-border)' }}>
            <button type="button" onClick={() => onPick(item)} className="flex min-h-[56px] w-full items-center justify-between gap-3 py-2 text-left" aria-label={`${item.label}, ${item.weeks} van ${weeks} weken, bekijk de plek`}>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-base font-medium" style={{ color: 'var(--color-ink)' }}>
                  {item.open && <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />}
                  {item.label}
                </span>
                <span className="block font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{item.weeks} van {weeks} weken</span>
              </span>
              <span className="flex shrink-0 gap-1" aria-hidden="true">
                {item.cells.map((c, w) => (
                  <span
                    key={w}
                    className="block h-[18px] w-[18px] rounded-[5px]"
                    style={{ background: CELL_COLOR[c], border: w === item.cells.length - 1 ? '1.5px solid var(--color-status)' : '1.5px solid transparent', opacity: c === 0 ? 0.7 : 1 }}
                  />
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-3 text-xs" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-[4px]" style={{ background: CELL_COLOR[1] }} />spierpijn, stijf</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-[4px]" style={{ background: CELL_COLOR[2] }} />pijn</span>
        </span>
        <span className="tabular-nums">{formatDateNL(from)} tot nu</span>
      </div>
    </Card>
  );
}
