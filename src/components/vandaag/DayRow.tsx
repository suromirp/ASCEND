import type { ReactNode } from 'react';
import { Eyebrow } from '../ui';
import type { IconName } from '../icons';
import { IconDisc } from '../SportDisc';
import { ChevronGlyph } from './glyphs';

// "Je dag" op Vandaag: een lijst op één kaart, per regel een icoon in een getinte
// schijf, de titel, één regel eronder en een chevron. Elke regel is minstens 44 px
// en opent een sheet of scherm.

export type DayRowState = 'todo' | 'now' | 'done' | 'skipped';

export function YourDay({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Je dag">
      <div className="mb-2"><Eyebrow>JE DAG</Eyebrow></div>
      <ol className="overflow-hidden rounded-2xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>{children}</ol>
    </section>
  );
}

// Het pictogram bij een regel, naar het label.
const ICON_BY_LABEL: Record<string, IconName | 'maan'> = {
  Gedaan: 'vinkje',
  Gevoel: 'vandaagStip',
  Gewicht: 'schijf',
  Reis: 'vlag',
  Vraag: 'info',
  Ochtend: 'rekken',
  Avond: 'rekken',
  Rekken: 'rekken',
  Morgen: 'week',
};

export function DayRow({
  label,
  state = 'todo',
  onClick,
  children,
  trailing,
  action,
  chevron = true,
  icon,
}: {
  // De regel onder de titel ("Training", "Gedaan", "Morgen").
  label: string;
  state?: DayRowState;
  onClick: () => void;
  children: ReactNode;
  // Kleine tekst bij het label, bijvoorbeeld de duur.
  trailing?: ReactNode;
  // Een eigen knop rechts naast de regel (een vinkje, "Gaat goed").
  action?: ReactNode;
  chevron?: boolean;
  icon?: IconName | 'maan';
}) {
  const shown = icon ?? ICON_BY_LABEL[label] ?? 'gepland';
  const tone = state === 'now' ? 'status' : state === 'done' ? 'progress' : 'neutral';
  return (
    <li className="flex min-h-[56px] items-center border-t first:border-t-0" data-state={state} style={{ borderColor: 'var(--color-card-border)', opacity: state === 'skipped' ? 0.6 : 1 }}>
      <button onClick={onClick} className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
        <IconDisc icon={state === 'done' && shown === 'gepland' ? 'vinkje' : shown} tone={tone} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug" style={{ color: state === 'done' || state === 'skipped' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{children}</span>
          <span className="block text-xs leading-4" style={{ color: state === 'now' ? 'var(--color-status)' : 'var(--color-ink-dim)' }}>
            {label}
            {trailing && <span className="tabular-nums"> · {trailing}</span>}
          </span>
        </span>
        {!action && chevron && <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>}
      </button>
      {action && <span className="pr-1">{action}</span>}
    </li>
  );
}
