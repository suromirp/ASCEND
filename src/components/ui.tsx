import type { ReactNode } from 'react';

export function Card({ children, className = '', texture = false }: { children: ReactNode; className?: string; texture?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${texture ? 'topo-texture' : ''} ${className}`}
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, className = '' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl py-3 text-sm font-semibold tracking-wide transition-opacity active:opacity-80 disabled:opacity-40 ${className}`}
      style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze-dark))', color: '#15130d' }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border py-2.5 text-xs font-medium tracking-wide transition-colors active:opacity-70 ${className}`}
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
    >
      {children}
    </button>
  );
}

export function StatusDot({ status }: { status: 'completed' | 'today' | 'planned' | 'moved' | 'skipped' | 'missed' }) {
  const map: Record<string, { symbol: string; color: string }> = {
    completed: { symbol: '✓', color: 'var(--color-success)' },
    today: { symbol: '●', color: 'var(--color-gold)' },
    planned: { symbol: '○', color: 'var(--color-ink-dim)' },
    moved: { symbol: '↷', color: 'var(--color-sky)' },
    skipped: { symbol: '×', color: 'var(--color-danger)' },
    missed: { symbol: '!', color: 'var(--color-warning)' },
  };
  const s = map[status];
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-xs font-bold" style={{ color: s.color }}>
      {s.symbol}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? 'var(--color-gold)' : 'var(--color-card-border)' }}
    >
      <span
        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform"
        style={{ background: checked ? '#15130d' : 'var(--color-ink-dim)', transform: checked ? 'translateX(1.25rem)' : 'translateX(0)' }}
      />
    </button>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium tracking-[0.16em]" style={{ color: 'var(--color-bronze)' }}>
      {children}
    </div>
  );
}
