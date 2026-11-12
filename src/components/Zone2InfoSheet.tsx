import { useMemo } from 'react';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, SheetGrip } from './ui';
import type { AerobicTrend } from '../engine/aerobicTrend';
import { zone2Chart, zone2Explanation } from '../engine/zone2Chart';
import { Zone2PaceChart } from './stand/Zone2PaceChart';

// Achter de i bij Tempo bij zone 2: de grafiek per loop en de uitleg in gewone woorden.
// Leest dezelfde trend als de kaart (engine/zone2Chart.ts); rekent zelf niets.
// `criteria`: wat meetelt (zone2Criteria), van de kaart naar hier verhuisd (besluit 2026-11-12-zone2-kaart).
// `notes`: wat de kop en de stippen zijn en het hele oordeel, van de kaart op Je stand naar hier (Stand minimaal).
export function Zone2InfoSheet({ trend, pieces, zones, today, criteria, notes = [], onClose }: { trend: AerobicTrend; pieces: boolean; zones: boolean; today: string; criteria: string; notes?: string[]; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const chart = useMemo(() => zone2Chart(trend, today), [trend, today]);
  const text = zone2Explanation(chart, trend.statement, { pieces, zones, referenceHr: trend.referenceHr });
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-4 rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow="Tempo bij zone 2" title="Wat dit getal zegt" onClose={requestClose} /></div>
            {notes.map((p) => (
              <p key={p} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{p}</p>
            ))}
            <Zone2PaceChart chart={chart} />
            {text.map((p) => (
              <p key={p} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{p}</p>
            ))}
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{criteria}</p>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
