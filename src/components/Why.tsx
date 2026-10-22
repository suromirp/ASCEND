import type { ReactNode } from 'react';

// One way to ask "waarom" across the app: the same word, the same arrow, and
// the same panel with the reason, how strong the evidence is and where it
// comes from, whether it's an advice, the order of the day or a change.

export type EvidenceLevel = 'sterk' | 'matig' | 'zwak' | 'expertopinie' | 'afgeleid';

const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  sterk: 'sterk bewijs', matig: 'matig bewijs', zwak: 'zwak bewijs', expertopinie: 'expertopinie', afgeleid: 'afgeleid uit onderzoek',
};

export function WhyToggle({ open, onToggle, className = '' }: { open: boolean; onToggle: () => void; className?: string }) {
  return (
    <button onClick={onToggle} className={`flex min-h-[44px] items-center gap-1 text-xs ${className}`} style={{ color: 'var(--color-ink-dim)' }} aria-expanded={open}>
      waarom
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} aria-hidden>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

export function WhyPanel({ children, evidence, sources, accent = 'var(--color-bronze)', className = '' }: { children: ReactNode; evidence?: EvidenceLevel; sources?: { label: string; url: string }[]; accent?: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-lg border-l-2 py-2 pl-3 pr-2 text-xs leading-relaxed ${className}`} style={{ borderColor: accent, background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}>
      <div>{children}</div>
      {evidence && <p style={{ color: 'var(--color-ink)' }}>{EVIDENCE_LABEL[evidence]}</p>}
      {sources?.map((src) => (
        <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>{src.label} ↗</a>
      ))}
    </div>
  );
}
