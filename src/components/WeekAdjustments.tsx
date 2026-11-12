// ASCEND: Aangepast door ASCEND, de rij onder de dagen in Week en het blad erachter (docs/visie/Ontwerp Week
// minimaal.md, hoofdstuk 3; besluit docs/beslissingen/2026-11-12-week-minimaal.md). De regels komen uit
// engine/changeLog.ts#weekAdjustments, dezelfde uitkomst als het woord "aangepast" op de dagrij. Alleen lezen:
// niets laadt, niets kan mislukken, en zonder regels is er geen rij.

import { useState } from 'react';
import { adjustmentsSub, decidedLine, type WeekAdjustment } from '../engine/changeLog';
import { formatDateNL } from '../utils/dates';
import { capitalize } from '../utils/capitalize';
import { useSheetClose } from '../utils/useSheetClose';
import { useBackToClose } from '../utils/useBackToClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { SheetRow, SheetRows } from './SheetRows';
import { Card, SheetGrip } from './ui';

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
                </div>
              </>
            ) : (
              <>
                <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={TITLE} onClose={requestClose} /></div>
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
