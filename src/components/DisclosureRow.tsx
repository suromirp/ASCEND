import type { ReactNode } from 'react';
import { Icon } from './icons';

// Een rij die opent en sluit: titel links, rechts een waarde en een pijltje dat
// meedraait. De hele rij is het tikdoel (52 px). De inhoud staat eronder.
export function DisclosureRow({
  title,
  value,
  open,
  onToggle,
  children,
}: {
  title: string;
  value?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left">
        <span className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>{title}</span>
        <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          {value}
          <span className="transition-transform" style={{ transform: open ? 'rotate(180deg)' : undefined }}><Icon name="omlaag" size={18} /></span>
        </span>
      </button>
      {open && <div className="pb-1 pt-1">{children}</div>}
    </div>
  );
}
