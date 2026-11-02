import { useState } from 'react';
import type { YourWeek } from '../../engine/yourWeek';
import { YourWeekSheet } from '../ascend/YourWeek';
import { Card, Eyebrow, Meter, Ring } from '../ui';

// Je stand → Je week, alleen zonder doel (docs/visie/Zonder doel.md, 2.8): dezelfde berekening als de
// kaart op Ascend (engine/yourWeek.ts), dus altijd dezelfde getallen. De ring met de tel-minuten is het
// ene accent, kracht is een aparte teller en de weken van je golf staan eronder. Met een doel is er geen
// Je week en blijft "Klaar voor je doel" de enige voortgangstaal. Geen eigen instelling: de kaart is er
// zodra er een richting is en geen doel. De kaart staat los van de rest van Je stand (useStandYourWeek.ts).

export function YourWeekStandCard({ week }: { week: YourWeek }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left" aria-label="Je week bekijken">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <Ring value={week.progress.fraction} label={week.minutesLine} size={88} stroke={8}>
              <span className="font-sans text-xl font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.progress.minutes}</span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>min</span>
            </Ring>
            <div className="min-w-0">
              <Eyebrow>Je week</Eyebrow>
              <p className="font-sans text-base font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.minutesLine}</p>
              <p className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.strengthLine}</p>
              {week.waveLine && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.waveLine}</p>}
            </div>
          </div>
          {week.wave && week.bars.length > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${week.bars.length}, minmax(0, 1fr))` }}>
              {week.bars.map((bar) => (
                <div key={bar.week} className="flex flex-col gap-1">
                  <Meter value={bar.budget > 0 ? bar.done / bar.budget : 0} label={`Week ${bar.week} van de golf`} tone={bar.current ? 'status' : 'progress'} />
                  <span className="font-sans text-xs tabular-nums" style={{ color: bar.current ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
                    Week {bar.week}
                    <br />
                    {bar.future ? `${bar.budget} min` : `${bar.done} van ${bar.budget}`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{week.remainingLine}</p>
        </Card>
      </button>
      {open && <YourWeekSheet week={week} onClose={() => setOpen(false)} />}
    </>
  );
}
