interface MetricBarProps {
  label: string;
  value: number; // 0-100
  accent?: 'bronze' | 'alpine';
}

export function MetricBar({ label, value, accent = 'bronze' }: MetricBarProps) {
  const fillColor = accent === 'alpine' ? 'var(--color-alpine)' : 'var(--color-bronze)';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs tracking-wide text-ink-dim" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: 'var(--color-charcoal)' }}>
        <div
          className="h-2 rounded-full transition-[width] duration-500"
          style={{ width: `${value}%`, background: fillColor }}
        />
      </div>
    </div>
  );
}
