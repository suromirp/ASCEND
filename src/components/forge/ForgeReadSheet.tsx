import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Card, SheetGrip } from '../ui';
import { FORGE_READ_LINES, FORGE_READ_TITLE } from '../../data/forgeReadLines';
import { forgeLabels, type ForgeWords } from '../../engine/forgeWords';

// Achter de i naast de kolomkoppen in Forge: wat Plan, Herh., Over en W betekenen (data/forgeReadLines.ts).
// In de vaktaal heten de koppen Voorschrift en RIR; het blad volgt de woorden die je ziet.
export function ForgeReadSheet({ words, onClose }: { words: ForgeWords; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const labels = forgeLabels(words);
  const head = (h: string) => (h === 'Plan' ? labels.plan : h === 'Over' ? labels.over : h);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-4 rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow="Forge" title={FORGE_READ_TITLE} onClose={requestClose} /></div>
            {FORGE_READ_LINES.map((l) => (
              <p key={l.head} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                <span style={{ color: 'var(--color-ink)' }}>{head(l.head)}</span>
                {': '}
                {l.text}
              </p>
            ))}
          </Card>
        </div>
      </div>
    </Portal>
  );
}
