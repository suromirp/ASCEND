// ASCEND — the "melding" level of the feedback pattern (Fase 2): after
// ASCEND changed the calendar, say what changed and why, with one tap to
// undo. Sits above the bottom navigation, never blocks the screen.

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';

export function ChangeNotice() {
  const { recentChange, undoRecentChange, dismissRecentChange } = useAppData();
  const [open, setOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);
  if (!recentChange) return null;

  const summary = recentChange.lines.length === 1 ? recentChange.lines[0] : `${recentChange.lines.length} sessies aangepast`;

  async function handleUndo() {
    setUndoing(true);
    await undoRecentChange();
    setUndoing(false);
    setOpen(false);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div
        className="animate-page-in pointer-events-auto w-full max-w-md rounded-2xl border p-3 shadow-lg"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}
        role="status"
      >
        <div className="flex items-start justify-between gap-3">
          <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
            <p className="text-[11px] font-medium tracking-[0.18em]" style={{ color: 'var(--color-gold)' }}>AANGEPAST</p>
            <p className="mt-0.5 truncate text-sm" style={{ color: 'var(--color-ink)' }}>{recentChange.title}</p>
            <p className="truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>{summary}{open ? '' : ' · waarom?'}</p>
          </button>
          <button onClick={dismissRecentChange} aria-label="Melding sluiten" className="px-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>×</button>
        </div>
        {open && (
          <div className="mt-2 flex flex-col gap-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {recentChange.lines.slice(0, 6).map((l, i) => <p key={i} style={{ color: 'var(--color-ink)' }}>{l}</p>)}
            {recentChange.why && <p className="mt-1 leading-relaxed">{recentChange.why}</p>}
          </div>
        )}
        <button
          onClick={handleUndo}
          disabled={undoing}
          className="mt-2 text-xs font-medium underline disabled:opacity-40"
          style={{ color: 'var(--color-ink)' }}
        >
          {undoing ? 'Bezig…' : 'Ongedaan maken'}
        </button>
      </div>
    </div>
  );
}
