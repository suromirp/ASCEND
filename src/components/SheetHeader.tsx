import type { ReactNode } from 'react';
import { Icon } from './icons';
import { Eyebrow } from './ui';

// De sluitknop van elk blad: het sluiten-icoon in een tikdoel van 44 bij 44 px.
// De focusrand verschijnt alleen bij toetsenbordgebruik (:focus-visible).
export function SheetClose({ onClose, className = '' }: { onClose: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Sluiten"
      className={`flex h-11 w-11 shrink-0 items-center justify-center ${className}`}
      style={{ color: 'var(--color-ink-dim)' }}
    >
      <Icon name="sluiten" size={22} />
    </button>
  );
}

// Eén kop voor alle bladen: Eyebrow en sluitknop op één regel (met een pijl terug
// ervoor in een stap), daaronder de titel in Marcellus met eventueel een
// infoknop, en hoogstens één regel eronder.
export function SheetHeader({
  eyebrow,
  title,
  facts,
  info,
  onBack,
  onClose,
}: {
  eyebrow: string;
  title?: string;
  facts?: ReactNode;
  info?: ReactNode;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex h-11 items-center">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Terug" className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
            <Icon name="terug" size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1 truncate"><Eyebrow>{eyebrow}</Eyebrow></div>
        <SheetClose onClose={onClose} className="-mr-3" />
      </div>
      {title && (
        <div className="flex items-center gap-3">
          <h2 className="min-w-0 font-display text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>{title}</h2>
          {info}
        </div>
      )}
      {facts && <p className="mt-1 font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{facts}</p>}
    </div>
  );
}
