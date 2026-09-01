import { useEffect } from 'react';
import type { Quote } from '../data/quoteLibrary';
import { useSheetClose } from '../utils/useSheetClose';

export interface CelebrationEvent {
  id: string;
  kind: 'milestone' | 'session';
  title?: string; // milestone title — only set for kind === 'milestone'
  quote: Quote;
}

const VISIBLE_MS = 1800;
const FADE_MS = 400;

// Mounted unconditionally in App.tsx, driven entirely by AppDataContext's
// `celebration` state — this keeps it working no matter which screen
// actually triggered it (logging a session on Today, tapping "markeer als
// behaald" on Ascend). pointer-events-none throughout: it's a passing
// moment, never something that should block a tap underneath it.
export function CompletionMoment({ event, onDismiss }: { event: CelebrationEvent | null; onDismiss: () => void }) {
  if (!event) return null;
  return <CompletionCard key={event.id} event={event} onDismiss={onDismiss} />;
}

function CompletionCard({ event, onDismiss }: { event: CelebrationEvent; onDismiss: () => void }) {
  const { closing, requestClose } = useSheetClose(onDismiss, FADE_MS);

  useEffect(() => {
    const t = setTimeout(requestClose, VISIBLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-[28%] z-[60] flex justify-center px-8 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
    >
      <div
        className="rounded-2xl border px-6 py-4 text-center shadow-lg"
        style={{ background: 'rgba(23,23,27,0.94)', borderColor: 'var(--color-bronze)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[10px] font-medium tracking-[0.2em]" style={{ color: 'var(--color-bronze)' }}>
          {event.kind === 'milestone' ? 'MIJLPAAL BEHAALD' : 'SESSIE VOLTOOID'}
        </p>
        <p className="mt-1.5 font-display text-lg leading-snug" style={{ color: 'var(--color-gold)' }}>“{event.quote.quote}”</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>— {event.quote.author}</p>
        {event.title && <p className="mt-2.5 text-xs" style={{ color: 'var(--color-ink)' }}>{event.title}</p>}
      </div>
    </div>
  );
}
