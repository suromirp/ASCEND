import type { ReactNode } from 'react';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';

// Eén sheet voor alles wat Vandaag achter een regel zet: de kop blijft staan
// als je scrolt, de inhoud scrolt eronder. `children` mag een functie zijn
// die een manier krijgt om de sheet te sluiten (met uitloopanimatie).
export function TodaySheet({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string;
  title?: string;
  onClose: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div
          ref={sheetRef}
          className={`flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl border border-b-0 ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 px-4 pt-3"><SheetHeader eyebrow={eyebrow} title={title} onClose={requestClose} /></div>
          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">{typeof children === 'function' ? children(requestClose) : children}</div>
        </div>
      </div>
    </Portal>
  );
}
