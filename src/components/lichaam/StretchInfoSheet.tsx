import { STRETCH_GENERAL_ADVICE, STRETCH_SOURCE_NOTE } from '../../data/stretches';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Card, Eyebrow } from '../ui';

// Het algemene advies bij rekken en de bron, achter de InfoButton bij "Rekken en losmaken".
// De tekst staat in data/stretches.ts, inclusief de twee correcties (IT-band, nekrollen).
export function StretchInfoSheet({ onClose }: { onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef}
          className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Over rekken en losmaken"
        >
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <SheetHeader eyebrow="Rekken en losmaken" title="Zo rek je goed" onClose={requestClose} />
            <ul className="flex flex-col gap-2">
              {STRETCH_GENERAL_ADVICE.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-action)' }} />
                  <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{line}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
              <Eyebrow>Bron</Eyebrow>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{STRETCH_SOURCE_NOTE}</p>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
