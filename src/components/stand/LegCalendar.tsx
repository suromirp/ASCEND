import { useState } from 'react';
import type { LegDay } from '../../engine/standing';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';
import { dayShort } from './chartParts';

// Je stand → leg calendar: what each day's training puts into your legs,
// four weeks back and the week ahead. One colour, darker is heavier; a
// dashed square is still planned. Two dark squares close together is
// what the planning tries to avoid. Tap a day.

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const LEVEL_WORD = ['niets', 'licht', 'middel', 'zwaar', 'heel zwaar'];
const LEVEL_OPACITY = [0, 0.22, 0.45, 0.72, 1];

export function LegCalendar({ days, today }: { days: LegDay[]; today: string }) {
  const [selected, setSelected] = useState(days.findIndex((d) => d.date === today));
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const day = days[selected];
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>BEENKALENDER</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Wat elke dag in je benen stopt. Donkerder is zwaarder, gestippeld is nog gepland. Twee donkere vakjes vlak na elkaar wil je liever niet.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="Beenbelasting per dag">
        {WEEKDAYS.map((d) => <span key={d} className="text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>{d}</span>)}
        {weeks.flatMap((week) => week.map((d) => {
          const i = days.indexOf(d);
          const isToday = d.date === today;
          return (
            <button
              key={d.date}
              onClick={() => setSelected(i)}
              aria-label={`${dayShort(d.date)}: ${LEVEL_WORD[d.level]}${d.names.length ? `, ${d.names.join(', ')}` : ''}`}
              aria-pressed={i === selected}
              className="relative aspect-square min-h-[44px] rounded-md"
              style={{
                background: 'var(--color-charcoal)',
                outline: i === selected ? '2px solid var(--color-action)' : isToday ? '1px solid var(--color-ink-dim)' : undefined,
                outlineOffset: 1,
              }}
            >
              {d.level > 0 && (
                <span
                  className="absolute inset-0 rounded-md"
                  style={{
                    background: 'var(--color-progress)',
                    opacity: LEVEL_OPACITY[d.level] * (d.planned ? 0.7 : 1),
                    border: d.planned ? '1px dashed var(--color-ink)' : undefined,
                  }}
                  aria-hidden
                />
              )}
              <span className="relative text-xs tabular-nums" style={{ color: d.level >= 3 ? 'var(--color-bg)' : 'var(--color-ink-dim)' }}>{Number(d.date.slice(8, 10))}</span>
            </button>
          );
        }))}
      </div>

      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }} aria-hidden>
        <span>licht</span>
        {LEVEL_OPACITY.slice(1).map((o) => <span key={o} className="h-2.5 w-4 rounded-sm" style={{ background: 'var(--color-progress)', opacity: o }} />)}
        <span>zwaar</span>
      </div>

      {day && (
        <div className="rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink)' }} aria-live="polite">
          <p>
            <span className="font-medium">{day.date === today ? 'Vandaag' : dayShort(day.date)}: </span>
            {day.names.length ? <>{LEVEL_WORD[day.level]}{day.planned ? ', gepland' : ''} <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>({formatNumberNL(day.points, 0)} punten)</span></> : 'geen training'}
          </p>
          {day.names.length > 0 && <p style={{ color: 'var(--color-ink-dim)' }}>{day.names.join(' · ')}</p>}
        </div>
      )}
    </Card>
  );
}
