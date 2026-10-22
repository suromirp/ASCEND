import type { LeaveLabel, LeaveLabelKind } from '../engine/leave';

// A quiet band for a day that belongs to a holiday, a trek or free days
// (engine/leave.ts). Not a training: no status dot, no minutes. Used in the
// week overview and in the proposal preview.

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const TONE: Record<LeaveLabelKind, { color: string; text: string }> = {
  off: { color: 'var(--color-alpine)', text: 'var(--color-success-text)' },
  trek: { color: 'var(--color-sky)', text: 'var(--color-sky)' },
  free: { color: 'var(--color-stone)', text: 'var(--color-stone)' },
  light: { color: 'var(--color-stone)', text: 'var(--color-ink-dim)' },
};

export function LeaveBand({ label }: { label: LeaveLabel }) {
  const tone = TONE[label.kind];
  return (
    <div
      className="rounded-xl border px-3 py-2"
      style={{ borderColor: tint(tone.color, 50), background: tint(tone.color, 12), borderStyle: label.kind === 'light' ? 'dashed' : 'solid' }}
    >
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-xs font-semibold tracking-[0.14em]" style={{ color: tone.text }}>{label.title.toUpperCase()}</span>
        <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label.line}</span>
      </p>
      {label.note && <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-ink)' }}>{label.note}</p>}
    </div>
  );
}
