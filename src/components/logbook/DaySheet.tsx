import type { SessionLog } from '../../models/training';
import { formatHoursMinutesNL, formatWeekdayDateNL } from '../../utils/dates';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { SheetRow, SheetRows } from '../SheetRows';
import { Card, SheetGrip } from '../ui';

// Een dag van het Logboek: wat je die dag deed als rijen naar het logblad, en onderaan "Wat speelde er?".
// Zo vind je terug wat je deed, in plaats van meteen een vraag te krijgen.

export function DaySheet({ date, logs, nameOf, onPickLog, onInfluence, onClose }: {
  date: string;
  logs: SessionLog[];
  nameOf: (log: SessionLog) => string;
  onPickLog: (log: SessionLog) => void;
  onInfluence: () => void;
  onClose: () => void;
}) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow="Logboek" title={formatWeekdayDateNL(date)} facts={logs.length === 0 ? 'Geen training deze dag.' : undefined} onClose={requestClose} /></div>
            <div className="mt-4">
              <SheetRows label="Deze dag">
                {logs.map((l) => (
                  <SheetRow key={l.id} title={nameOf(l)} sub={formatHoursMinutesNL(l.durationMinutes)} onClick={() => onPickLog(l)} />
                ))}
                <SheetRow title="Wat speelde er?" onClick={onInfluence} />
              </SheetRows>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
