// ASCEND: de knop Andere lus onder de lus, met het blad met de keuzes (engine/routeOtherLoop.ts, besluit
// 2026-11-22-andere-lus.md). Bovenaan Andersom en Een andere kant op, dan de richting als vier chips, dan
// Zonder heen en terug; elke rij met één regel uitleg. Een keuze is een eenmalige afwijking van de lus die nu
// staat: de instelling Soort lus verandert nooit. Het blad rendert alleen; de zoektocht loopt in
// useRouteSearch. Zolang er gezocht wordt staat er een regel met de tijdgrens; mislukt het, dan de regel
// en Opnieuw, en de lus blijft zoals hij was.

import { useSheetClose } from '../utils/useSheetClose';
import { OTHER_LOOP_CHOICES, OTHER_LOOP_SOURCES_LINE, type OtherLoopChoice } from '../engine/routeOtherLoop';
import { searchLimitLine } from '../engine/routeSearchSteps';
import { PROPOSAL_LIMIT_MS } from '../storage/routeProposal';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { TextButton } from './TextButton';
import { Card, Chip, Eyebrow, SheetGrip } from './ui';
import { useState } from 'react';
import type { RouteSearchModel } from './useRouteSearch';

const dim = { color: 'var(--color-ink-dim)' };
const choice = (c: OtherLoopChoice) => OTHER_LOOP_CHOICES.find((x) => x.choice === c)!;
const DIRECTIONS: OtherLoopChoice[] = ['north', 'east', 'south', 'west'];

function OtherLoopSheet({ onPick, onClose }: { onPick: (c: OtherLoopChoice) => void; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const pick = (c: OtherLoopChoice) => {
    onPick(c);
    requestClose();
  };
  const row = (c: OtherLoopChoice) => (
    <button
      key={c}
      type="button"
      onClick={() => pick(c)}
      className="flex min-h-[56px] w-full flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98]"
      style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
    >
      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{choice(c).label}</span>
      <span className="text-sm leading-snug" style={dim}>{choice(c).line}</span>
    </button>
  );
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-[max(var(--rand-onder),32px)]">
            <div className="-mt-2"><SheetHeader eyebrow="Route" title="Andere lus" onClose={requestClose} /></div>
            <div className="flex flex-col gap-2">
              {row('reverse')}
              {row('otherSide')}
            </div>
            <div className="flex flex-col gap-1">
              <Eyebrow tone="var(--color-ink-dim)">Richting</Eyebrow>
              <div role="group" aria-label="Richting" className="flex flex-wrap gap-2">
                {DIRECTIONS.map((c) => <span key={c} className="shrink-0 whitespace-nowrap"><Chip tone="quiet" onClick={() => pick(c)}>{choice(c).label}</Chip></span>)}
              </div>
              <p className="text-sm leading-snug" style={dim}>{choice('north').line}</p>
            </div>
            {row('noRepeat')}
            <p className="text-xs leading-snug" style={dim}>{OTHER_LOOP_SOURCES_LINE}</p>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

// De knop met zijn uitkomst eronder. Zonder lus over paden (alleen heen en terug) staat er niets.
export function OtherLoop({ model }: { model: RouteSearchModel }) {
  const [open, setOpen] = useState(false);
  const { other } = model;
  if (!other.available) return null;
  return (
    <div className="flex flex-col items-start">
      <TextButton tone="dim" icon="verder" disabled={other.busy} onClick={() => setOpen(true)}>Andere lus</TextButton>
      {other.busy && <p role="status" className="text-xs leading-snug" style={dim}>{`Een andere lus zoeken. ${searchLimitLine(undefined, PROPOSAL_LIMIT_MS)}`}</p>}
      {!other.busy && other.failLine && (
        <>
          <p role="status" className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{other.failLine}</p>
          {other.retry && <TextButton tone="dim" onClick={other.retry}>Opnieuw</TextButton>}
        </>
      )}
      {!other.busy && !other.failLine && other.note && <p role="status" className="text-xs leading-snug" style={dim}>{other.note}</p>}
      {open && <OtherLoopSheet onPick={other.pick} onClose={() => setOpen(false)} />}
    </div>
  );
}
