import type { ReactNode } from 'react';
import { Eyebrow } from '../ui';
import { ChevronGlyph } from './glyphs';

// "Je dag" op Vandaag: een tijdlijn van regels van minstens 44 px. Elke regel
// is één zin die een sheet of scherm opent, in plaats van een volle kaart.
// De lijn en de stippen staan in index.css (.day-line, .day-row).

export type DayRowState = 'todo' | 'now' | 'done' | 'skipped';

export function YourDay({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Je dag">
      <div className="mb-1"><Eyebrow>JE DAG</Eyebrow></div>
      <ol className="day-line">{children}</ol>
    </section>
  );
}

export function DayRow({
  label,
  state = 'todo',
  onClick,
  children,
  trailing,
  action,
  chevron = true,
}: {
  label: string;
  state?: DayRowState;
  onClick: () => void;
  children: ReactNode;
  // Kleine tekst rechts, bijvoorbeeld de duur.
  trailing?: ReactNode;
  // Een eigen knop rechts naast de regel (een vinkje, "Gaat goed").
  action?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <li className="day-row" data-state={state}>
      <button onClick={onClick} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 py-1 text-left">
        <span className="w-[72px] shrink-0 text-xs font-medium" style={{ color: state === 'now' ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{label}</span>
        <span className="min-w-0 flex-1 text-[15px] leading-snug" style={{ color: state === 'done' || state === 'skipped' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{children}</span>
        {trailing && <span className="shrink-0 text-[13px] tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{trailing}</span>}
        {!action && chevron && <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>}
      </button>
      {action}
    </li>
  );
}
