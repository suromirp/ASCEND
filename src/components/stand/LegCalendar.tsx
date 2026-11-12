import { useState } from 'react';
import type { LegDay } from '../../engine/standing';
import { formatNumberNL } from '../../utils/number';
import { UnderLine } from './StandParts';
import { formatWeekdayDayMonthNL } from '../../utils/dates';

// Benen → het blad Beendagen (de rij onder Frisheid): what each day's training puts into your legs,
// four weeks back and the week ahead. Amber, the colour of leg days; brighter
// is heavier, a dashed square is still planned. Two bright squares close
// together is what the planning tries to avoid. Tap a day. The points are leg
// points (engine/standing.ts#legCalendar), not the minutes times effort of the
// weekly load, so they are called that.

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const LEVEL_WORD = ['niets', 'licht', 'middel', 'zwaar', 'heel zwaar'];
const LEVEL_OPACITY = [0, 0.22, 0.45, 0.72, 1];

export function LegCalendar({ days, today }: { days: LegDay[]; today: string }) {
  const [selected, setSelected] = useState(days.findIndex((d) => d.date === today));
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const day = days[selected];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Wat je benen per dag krijgen. Fel is zwaar, gestippeld is gepland. Twee felle vakjes na elkaar zijn zwaar.
      </p>

      <div className="-mx-4 grid grid-cols-7" role="grid" aria-label="Beenbelasting per dag">
        {WEEKDAYS.map((d) => <span key={d} className="pb-1.5 text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>{d}</span>)}
        {weeks.flatMap((week) => week.map((d) => {
          const i = days.indexOf(d);
          const isToday = d.date === today;
          return (
            <button
              key={d.date}
              onClick={() => setSelected(i)}
              aria-label={`${formatWeekdayDayMonthNL(d.date)}: ${LEVEL_WORD[d.level]}${d.names.length ? `, ${d.names.join(', ')}` : ''}`}
              aria-pressed={i === selected}
              className="relative h-11 min-w-0"
            >
              {/* De knop vult het hele vak (minstens 44 bij 44 px, ook op 360 px); het vakje zelf staat er iets in. */}
              <span
                className="absolute inset-[3px] rounded-md"
                style={{
                  background: 'var(--color-charcoal)',
                  outline: i === selected ? '2px solid var(--color-ink)' : isToday ? '1px solid var(--color-ink-dim)' : undefined,
                  outlineOffset: 1,
                }}
                aria-hidden
              />
              {d.level > 0 && (
                <span
                  className="absolute inset-[3px] rounded-md"
                  style={{
                    background: 'var(--color-warning)',
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
        {LEVEL_OPACITY.slice(1).map((o) => <span key={o} className="h-2.5 w-4 rounded-sm" style={{ background: 'var(--color-warning)', opacity: o }} />)}
        <span>zwaar</span>
      </div>

      {day && (
        <UnderLine>
          <p>
            <span className="font-medium">{day.date === today ? 'Vandaag' : formatWeekdayDayMonthNL(day.date)}: </span>
            {day.names.length ? <>{LEVEL_WORD[day.level]}{day.planned ? ', gepland' : ''} <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>({formatNumberNL(day.points, 0)} beenpunten)</span></> : 'geen training'}
          </p>
          {day.names.length > 0 && <p style={{ color: 'var(--color-ink-dim)' }}>{day.names.join(' · ')}</p>}
        </UnderLine>
      )}
    </div>
  );
}
