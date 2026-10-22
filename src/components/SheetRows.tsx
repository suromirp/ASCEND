import type { ReactNode } from 'react';
import { Icon } from './icons';

// A list of choices in a sheet, after the fixed rule for a row: the title on
// the left, an arrow on the right, at most one line underneath (a fact, never
// an explanation). One line is 52 px, two lines 68 px; the whole row is the
// tap target. Rows sit in one card with hairlines between them.
export function SheetRows({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}
    >
      {children}
    </div>
  );
}

export function SheetRow({ title, sub, onClick, emphasis = false }: { title: string; sub?: string; onClick: () => void; emphasis?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-t px-4 first:border-t-0 text-left transition-colors active:bg-black/20 ${sub ? 'min-h-[68px] py-2' : 'min-h-[52px]'}`}
      style={{ borderColor: 'var(--color-card-border)' }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug" style={{ color: 'var(--color-ink)', fontWeight: emphasis ? 600 : undefined }}>{title}</span>
        {sub && <span className="mt-0.5 block text-[13px] leading-snug tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{sub}</span>}
      </span>
      <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
    </button>
  );
}
