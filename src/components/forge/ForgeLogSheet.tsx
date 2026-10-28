// ASCEND: het verloop van een training in Forge, als blad. Alleen tonen; wat er in staat is afgeleid
// in engine/forgeLog.ts. Tijdens de training weet het blad ook welke meldingen nog open staan; bij een
// opgeslagen training (het logblad) zijn het alleen de feiten.
// Besluit: docs/beslissingen/2026-10-28-forge-logboek.md.

import { becauseText, clockText, eventTitle, isOpen, stateText, type ForgeEvent, type ForgeSetState } from '../../engine/forgeLog';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Icon } from '../icons';
import { Card, SheetGrip } from '../ui';
import { RirBubble } from './parts';

// "62,5 kg × 8" met de reserve als klein bolletje erachter.
function State({ s, label }: { s: ForgeSetState | undefined; label: string }) {
  if (!s) return null;
  const text = stateText(s);
  return (
    <span className="inline-flex items-center gap-1.5">
      {text && <span>{text}</span>}
      {s.rir !== undefined && <RirBubble rir={s.rir} label={`${s.rir} over, ${label}`} />}
    </span>
  );
}

// De tijdlijn, nieuwste bovenaan.
export function ForgeLogList({ events, workout }: { events: ForgeEvent[]; workout?: WorkoutExercise[] }) {
  const sorted = [...events].sort((a, b) => b.at - a.at);
  if (sorted.length === 0) {
    return <p className="mt-3 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Nog niets veranderd. Wat Forge bijstuurt en wat jij aanpast, komt hier te staan.</p>;
  }
  return (
    <ol className="mt-3 flex flex-col">
      {sorted.map((ev) => {
        const open = workout ? isOpen(ev, workout) : false;
        const solved = !!workout && ev.kind === 'past-niet' && !open;
        return (
          <li key={ev.id} className="flex gap-3 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
            <span className="w-12 shrink-0 font-sans text-xs tabular-nums leading-6" style={{ color: 'var(--color-ink-dim)' }}>{clockText(ev.at)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{eventTitle(ev)}</p>
              {(ev.from || ev.to) && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>
                  {ev.from && ev.kind !== 'spotter' && (
                    <>
                      <span style={{ color: 'var(--color-ink-dim)' }}><State s={ev.from} label={`was, set ${ev.set}`} /></span>
                      <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="pijlrechts" size={14} label="werd" /></span>
                    </>
                  )}
                  {ev.kind === 'spotter' ? <span>0 over wordt 1 over</span> : <State s={ev.to} label={`set ${ev.set}`} />}
                </p>
              )}
              <p className="mt-1 text-xs leading-snug" style={{ color: open ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>
                {open ? `Nog niet opgelost: set ${ev.set} past niet. ${ev.fact ?? ''}`.trim() : solved ? 'Opgelost. Die set is aangepast.' : becauseText(ev)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ForgeLogSheet({ events, workout, eyebrow = 'Forge', title = 'Verloop van de training', onClose }: { events: ForgeEvent[]; workout?: WorkoutExercise[]; eyebrow?: string; title?: string; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={title} className={`relative max-h-[85dvh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={title} onClose={requestClose} /></div>
            <ForgeLogList events={events} workout={workout} />
          </Card>
        </div>
      </div>
    </Portal>
  );
}
