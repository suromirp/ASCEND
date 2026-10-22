import type { ReactNode } from 'react';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { Eyebrow } from '../ui';
import { CloseGlyph } from './glyphs';

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
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div
          className={`flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl border border-b-0 ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div className="min-w-0 pt-1">
              <Eyebrow>{eyebrow}</Eyebrow>
              {title && <h2 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{title}</h2>}
            </div>
            <button onClick={requestClose} aria-label="Sluiten" className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
              <CloseGlyph size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">{typeof children === 'function' ? children(requestClose) : children}</div>
        </div>
      </div>
    </Portal>
  );
}
