import { useEffect, useRef, type ReactNode } from 'react';
import { Portal } from './Portal';
import { SheetGrip } from './ui';

// Het blad met stappen (het blad van een training in Week, en Hoe ging het?): de kop (dag, titel,
// kruis) blijft in beeld; alleen wat eronder staat scrollt. Een `foot` staat vast onderaan, onder het
// scrollende deel (de knop Opslaan). De hoogtegrens delen alle bladen (.animate-sheet-in in index.css).
export function SheetFrame({ closing, sheetRef, onClose, label, scrollKey, head, foot, children }: { closing: boolean; sheetRef: (node: HTMLElement | null) => void; onClose: () => void; label: string; scrollKey?: string; head: ReactNode; foot?: ReactNode; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // A new step starts at its top.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [scrollKey]);
  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={onClose}
      >
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={`relative flex w-full max-w-md flex-col rounded-t-[20px] border border-b-0 ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetGrip />
          <div className="shrink-0 px-4 pb-1 pt-3">{head}</div>
          <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto px-4 ${foot ? 'pb-4' : 'pb-6'}`}>{children}</div>
          {foot && (
            <div className="shrink-0 border-t px-4 pb-3 pt-3" style={{ borderColor: 'var(--color-card-border)' }}>{foot}</div>
          )}
        </div>
      </div>
    </Portal>
  );
}
