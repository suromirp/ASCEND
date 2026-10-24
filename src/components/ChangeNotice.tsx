// ASCEND — the "melding" level of the feedback pattern (Fase 2): after
// ASCEND changed the calendar, say what changed and why, with one tap to
// undo. Sits above the bottom navigation, never blocks the screen: the
// notice shows itself for a few seconds, then folds into a small round
// chip (44 x 44, tap to open it again) and leaves after ten minutes, when
// undoing is no longer the sensible thing to do. Opened by hand, it stays
// open until you close it. Motion falls under the global
// prefers-reduced-motion rule in index.css.

import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { Eyebrow } from './ui';
import { Icon } from './icons';

const SHOW_MS = 6_000;
const CHIP_MS = 10 * 60_000;

type View = 'full' | 'chip' | 'gone';

export function ChangeNotice() {
  const { recentChange, undoRecentChange, dismissRecentChange } = useAppData();
  const [open, setOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);
  // The view belongs to one change: a new change (or repairs joining the
  // current one) starts again with the full notice.
  const changeKey = recentChange ? `${recentChange.id}:${recentChange.lines.length}` : '';
  const [state, setState] = useState<{ key: string; view: View }>({ key: '', view: 'full' });
  const view: View = state.key === changeKey ? state.view : 'full';

  useEffect(() => {
    if (!recentChange) return;
    if (view === 'full') {
      if (open || undoing) return;
      const t = window.setTimeout(() => setState({ key: changeKey, view: 'chip' }), SHOW_MS);
      return () => window.clearTimeout(t);
    }
    if (view === 'chip') {
      const t = window.setTimeout(() => setState({ key: changeKey, view: 'gone' }), CHIP_MS);
      return () => window.clearTimeout(t);
    }
  }, [recentChange, changeKey, view, open, undoing]);

  if (!recentChange || view === 'gone') return null;

  const summary = recentChange.summary ?? (recentChange.lines.length === 1 ? recentChange.lines[0] : `${recentChange.lines.length} sessies aangepast`);

  async function handleUndo() {
    setUndoing(true);
    await undoRecentChange();
    setUndoing(false);
    setOpen(false);
  }

  const anchor = 'pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex px-4';

  if (view === 'chip') {
    return (
      <div className={`${anchor} justify-end`}>
        <button
          onClick={() => setState({ key: changeKey, view: 'full' })}
          aria-label={`Planning aangepast: ${recentChange.title}. Open om te lezen of ongedaan te maken.`}
          className="animate-fade-in pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-lg"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)', color: 'var(--color-action)' }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`${anchor} justify-center`}>
      <div
        className="mx-notice-in pointer-events-auto w-full max-w-md rounded-2xl border pl-3 shadow-lg"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}
        role="status"
      >
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-h-[44px] min-w-0 flex-1 py-1.5 text-left">
            <Eyebrow>Aangepast</Eyebrow>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{recentChange.title}</p>
            {!open && <p className="truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>{summary}{recentChange.why ? ' · waarom' : ''}</p>}
          </button>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="min-h-[44px] shrink-0 px-2 text-xs font-medium underline underline-offset-2 disabled:opacity-40"
            style={{ color: 'var(--color-ink)' }}
          >
            {undoing ? 'Bezig…' : 'Ongedaan maken'}
          </button>
          <button
            onClick={dismissRecentChange}
            aria-label="Melding sluiten"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-lg"
            style={{ color: 'var(--color-ink-dim)' }}
          >
            <Icon name="sluiten" size={20} />
          </button>
        </div>
        {open && (
          <div className="mb-3 mr-3 flex max-h-[40vh] flex-col gap-1 overflow-y-auto text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {recentChange.lines.slice(0, 6).map((l, i) => <p key={i} style={{ color: 'var(--color-ink)' }}>{l}</p>)}
            {recentChange.why && <p className="mt-1 leading-relaxed">{recentChange.why}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
