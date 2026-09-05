import type { Quote } from '../data/quoteLibrary';
import { useSheetClose } from '../utils/useSheetClose';

export interface CelebrationEvent {
  id: string;
  kind: 'milestone' | 'session';
  title?: string; // milestone title — only set for kind === 'milestone'
  quote: Quote;
}

const FADE_MS = 400;

// Mounted unconditionally in App.tsx, driven entirely by AppDataContext's
// `celebration` state — this keeps it working no matter which screen
// actually triggered it (logging a session on Today, tapping "markeer als
// behaald" on Ascend). Stays up until tapped away — no auto-dismiss timer —
// so the quote actually gets read rather than flashed past. The outer
// wrapper stays pointer-events-none so the page underneath is never
// blocked; only the card itself is tappable.
export function CompletionMoment({ event, onDismiss }: { event: CelebrationEvent | null; onDismiss: () => void }) {
  if (!event) return null;
  return <CompletionCard key={event.id} event={event} onDismiss={onDismiss} />;
}

function CompletionCard({ event, onDismiss }: { event: CelebrationEvent; onDismiss: () => void }) {
  const { closing, requestClose } = useSheetClose(onDismiss, FADE_MS);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-[28%] z-[60] flex justify-center px-8 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
    >
      <button
        onClick={requestClose}
        className="pointer-events-auto rounded-2xl border px-6 py-4 text-center shadow-lg"
        style={{ background: 'rgba(23,23,27,0.94)', borderColor: 'var(--color-bronze)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[10px] font-medium tracking-[0.2em]" style={{ color: 'var(--color-bronze)' }}>
          {event.kind === 'milestone' ? 'MIJLPAAL BEHAALD' : 'SESSIE VOLTOOID'}
        </p>
        <p className="mt-1.5 font-display text-lg leading-snug" style={{ color: 'var(--color-gold)' }}>“{event.quote.quote}”</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>— {event.quote.author}</p>
        {event.title && <p className="mt-2.5 text-xs" style={{ color: 'var(--color-ink)' }}>{event.title}</p>}
        <p className="mt-3 text-[10px] tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>tik om te sluiten</p>
      </button>
    </div>
  );
}
