import { useState } from 'react';
import type { Rhythm } from '../../engine/standRhythm';
import { formatDayMonthNL } from '../../utils/dates';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Card, Eyebrow, InfoButton, SheetGrip } from '../ui';

// Je stand → Ritme: doe je over een paar weken wat gepland staat? Eén beeld (de afgesloten weken en deze
// week als stipjes), één zin en het oordeel van de coach op Ascend. Geen eigen telling: engine/standRhythm.ts
// gebruikt dezelfde als de coach (engine/onCourse.ts#recentAdherence). Mint is gedaan, de lege baan is niet
// gedaan, een open rondje is wat deze week nog komt. Geen rood en geen groot getal voor een reeks.

const DOT = 10;

function Dots({ week }: { week: Rhythm['weeks'][number] }) {
  // Van onder naar boven: gedaan, dan niet gedaan, dan wat nog komt.
  const dots = [
    ...Array.from({ length: week.done }, () => 'done' as const),
    ...Array.from({ length: week.current ? week.missed : week.planned - week.done }, () => 'missed' as const),
    ...Array.from({ length: week.open }, () => 'open' as const),
  ];
  return (
    <div className="flex min-h-[88px] flex-col-reverse items-center gap-1" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className="block rounded-full"
          style={{
            width: DOT, height: DOT,
            background: d === 'done' ? 'var(--color-progress)' : d === 'missed' ? 'var(--color-track)' : 'transparent',
            border: d === 'open' ? '1.5px solid var(--color-control-border)' : undefined,
          }}
        />
      ))}
    </div>
  );
}

function RhythmSheet({ onClose }: { onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow="Ritme" title="Wat je hier ziet" onClose={requestClose} /></div>
            <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              <p>Elke kolom is een week, elk stipje een geplande training. Mint is gedaan, grijs is niet gedaan. Een open rondje is wat deze week nog komt.</p>
              <p>Wat je oversloeg telt als niet gedaan. Ziek zijn en rustdagen tellen niet mee, en ook niet wat ASCEND zelf uit je plan haalde.</p>
              <p>De coach op Ascend telt precies hetzelfde, over dezelfde vier weken. Deze week staat er wel bij, maar telt nog niet mee in het getal. Daarvoor kijk je op Week.</p>
              <p>De regel met trainingsdagen op rij komt pas in beeld vanaf drie dagen. Het zijn dagen achter elkaar waarop je alles deed wat gepland stond. Dagen zonder training breken de reeks niet.</p>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

export function RhythmCard({ rhythm, mainPast }: { rhythm: Rhythm; mainPast: boolean }) {
  const [info, setInfo] = useState(false);
  const shown = rhythm.weeks.length > 0 && rhythm.enough;
  return (
    <Card className="flex flex-col gap-3" id="stand-ritme" aria-label="Ritme">
      <div className="flex items-start justify-between gap-3">
        <Eyebrow>Ritme</Eyebrow>
        <InfoButton onClick={() => setInfo(true)} label="Wat Ritme telt" />
      </div>
      {rhythm.enough && rhythm.verdict ? (
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{rhythm.verdict}</p>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          {mainPast ? 'Na je hoofddoel staat er niets meer gepland, dus er is niets om te tellen.' : 'Na twee volle weken zie je hier je ritme.'}
        </p>
      )}
      {shown && (
        <>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rhythm.weeks.length}, minmax(0, 1fr))` }}>
            {rhythm.weeks.map((w) => (
              <div key={w.weekStart} className="flex flex-col items-center justify-end gap-2" role="img" aria-label={`${w.current ? 'Deze week' : `Week van ${formatDayMonthNL(w.weekStart)}`}: ${w.done} van ${w.planned} gedaan${w.open > 0 ? `, nog ${w.open} te gaan` : ''}`}>
                <Dots week={w} />
                <span className="font-sans text-xs tabular-nums" style={{ color: w.current ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{w.current ? 'deze week' : formatDayMonthNL(w.weekStart)}</span>
              </div>
            ))}
          </div>
          <p className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{rhythm.sentence}</p>
        </>
      )}
      {rhythm.streakLine && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{rhythm.streakLine}</p>}
      {info && <RhythmSheet onClose={() => setInfo(false)} />}
    </Card>
  );
}
