import type { ReactNode } from 'react';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Card, SheetGrip } from '../ui';
import { ChevronGlyph } from '../vandaag/glyphs';

// De vaste delen van Je stand en zijn schermen (docs/visie/Ontwerp Stand minimaal.md, besluit
// 2026-11-12-stand-minimaal.md): de rij (links het vaste woord gedempt, dan de waarde in gewone inkt, rechts een
// pijltje), de lijst zonder kopje (één Card met rijen) en het blad waar een rij of de i naartoe gaat.

export function StandRow({ label, value, onClick, sheet, trailing }: { label: string; value: string; onClick?: () => void; sheet?: boolean; trailing?: ReactNode }) {
  const inner = (
    <>
      <span className="w-[104px] shrink-0 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
      <span className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{value}</span>
    </>
  );
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }} data-stand-row={label}>
      {onClick ? (
        <button type="button" onClick={onClick} data-sheet-from={sheet ? '' : undefined} aria-label={`${label}: ${value}`} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left">
          {inner}
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>
        </button>
      ) : (
        <div className="flex min-h-[56px] w-full items-center gap-3 py-1.5 pl-4 pr-2">
          {inner}
          {trailing}
        </div>
      )}
    </li>
  );
}

export function StandRows({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="!p-0">
      <ul aria-label={label}>{children}</ul>
    </Card>
  );
}

// Een blad van Je stand: greep, kop en inhoud. Elk blad gaat door useSheetClose.
export function StandSheet({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={title} onClose={requestClose} /></div>
            {children}
          </Card>
        </div>
      </div>
    </Portal>
  );
}

// De uitleg achter een i: alleen zinnen, in gedempte inkt.
export function StandInfoSheet({ eyebrow, title, lines, onClose }: { eyebrow: string; title: string; lines: string[]; onClose: () => void }) {
  return (
    <StandSheet eyebrow={eyebrow} title={title} onClose={onClose}>
      {lines.map((l) => (
        <p key={l} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{l}</p>
      ))}
    </StandSheet>
  );
}

// Een gekozen dag of week onder een grafiek: gewone regels onder een haarlijn, geen vak in de kaart.
export function UnderLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t pt-3 text-xs leading-relaxed" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }} aria-live="polite">
      {children}
    </div>
  );
}
