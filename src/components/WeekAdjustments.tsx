// ASCEND: Aangepast door ASCEND, de rij onder de dagen in Week en het blad erachter (docs/visie/Ontwerp Week
// minimaal.md, hoofdstuk 3; besluit docs/beslissingen/2026-11-12-week-minimaal.md). De regels komen uit
// engine/changeLog.ts#weekAdjustments, dezelfde uitkomst als het woord "aangepast" op de dagrij. Alleen lezen,
// op één ding na: een rustiger instap (engine/reentry.ts) zet je hier terug met Ongedaan maken, met een grens in tijd
// en een zichtbare uitkomst. Zonder regels is er geen rij.

import { useState } from 'react';
import { adjustmentsSub, decidedLine, type WeekAdjustment } from '../engine/changeLog';
import { formatDateNL } from '../utils/dates';
import { capitalize } from '../utils/capitalize';
import { useSheetClose } from '../utils/useSheetClose';
import { useBackToClose } from '../utils/useBackToClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { SheetRow, SheetRows } from './SheetRows';
import { Card, SecondaryButton, SheetGrip } from './ui';
import { useAppData } from '../state/useAppData';
import { withTimeout } from '../utils/withTimeout';

// Een knop die wacht, wacht nooit langer dan dit.
const UNDO_LIMIT_MS = 8000;

const TITLE = 'Aangepast door ASCEND';

export function WeekAdjustmentsRow({ adjustments, weekStart, current }: { adjustments: WeekAdjustment[]; weekStart: string; current: boolean }) {
  const [open, setOpen] = useState(false);
  if (adjustments.length === 0) return null;
  return (
    <>
      <SheetRow title={TITLE} sub={adjustmentsSub(adjustments.length, current)} onClick={() => setOpen(true)} sheetFrom />
      {open && <WeekAdjustmentsSheet adjustments={adjustments} weekStart={weekStart} onClose={() => setOpen(false)} />}
    </>
  );
}

function WeekAdjustmentsSheet({ adjustments, weekStart, onClose }: { adjustments: WeekAdjustment[]; weekStart: string; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const [picked, setPicked] = useState<WeekAdjustment | null>(null);
  const { undoReentry } = useAppData();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // De hele instap terug: de duur is weer de gewone, ASCEND vraagt het voor die terugkomst niet opnieuw.
  const undoNow = (from: string) => {
    setBusy(true);
    setNote(null);
    // De uitkomst staat in de meldingsbalk (state/goalActions.ts#undoReentry): die blijft staan als dit blad dichtgaat.
    void withTimeout(undoReentry(from), UNDO_LIMIT_MS, 'Ongedaan maken')
      .then(() => { setNote('Teruggezet. Je trainingen hebben weer hun gewone duur.'); setPicked(null); })
      .catch(() => setNote('Dat duurde te lang. Er is niets veranderd; probeer het zo nog eens.'))
      .finally(() => setBusy(false));
  };
  // De terugknop van het toestel gaat eerst terug naar de lijst, daarna pas dicht.
  useBackToClose(picked !== null, () => setPicked(null));
  const eyebrow = `Week van ${formatDateNL(weekStart)}`;

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            {picked ? (
              <>
                <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={picked.name} onBack={() => setPicked(null)} onClose={requestClose} /></div>
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{capitalize(picked.what)}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{picked.reason}</p>
                  <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{decidedLine(picked)}</p>
                  {picked.reentry && (
                    <>
                      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Ongedaan maken zet de hele rustiger instap terug.</p>
                      <SecondaryButton disabled={busy} onClick={() => undoNow(picked.reentry!.from)}>{busy ? 'Bezig…' : 'Ongedaan maken'}</SecondaryButton>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={TITLE} onClose={requestClose} /></div>
                {note && <p className="mt-3 text-sm" role="status" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
                <div className="mt-4">
                  <SheetRows label={TITLE}>
                    {adjustments.map((a) => <SheetRow key={a.sessionId} title={a.name} sub={a.what} onClick={() => setPicked(a)} />)}
                  </SheetRows>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}
