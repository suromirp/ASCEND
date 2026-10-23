import type { ReactNode } from 'react';
import { haptics } from '../utils/haptics';
import { BackButton } from './BackButton';
import { Icon } from './icons';
import './settings/settings.css';

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

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
  fullWidth = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? 'w-full' : 'flex-1'} min-h-[44px] rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.97] active:opacity-80 disabled:opacity-40 ${className}`}
      style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze))', color: 'var(--color-on-gold)' }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 min-h-[44px] rounded-xl border py-2.5 text-xs font-medium transition-all active:scale-[0.97] active:opacity-70 disabled:opacity-40 ${className}`}
      style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
    >
      {children}
    </button>
  );
}

export function StatusDot({ status }: { status: 'completed' | 'today' | 'planned' | 'moved' | 'skipped' | 'missed' | 'rest' }) {
  const map: Record<string, { symbol: string; color: string; label: string }> = {
    completed: { symbol: '✓', color: 'var(--color-success-text)', label: 'Gedaan' },
    today: { symbol: '●', color: 'var(--color-gold)', label: 'Vandaag' },
    planned: { symbol: '○', color: 'var(--color-ink-dim)', label: 'Gepland' },
    moved: { symbol: '↷', color: 'var(--color-sky)', label: 'Verplaatst' },
    skipped: { symbol: '×', color: 'var(--color-danger-text)', label: 'Overgeslagen' },
    missed: { symbol: '!', color: 'var(--color-warning)', label: 'Gemist' },
    rest: { symbol: '–', color: 'var(--color-stone)', label: 'Rustdag' },
  };
  const s = map[status];
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-xs font-bold" style={{ color: s.color }}>
      <span aria-hidden="true">{s.symbol}</span>
      <span className="sr-only">{s.label}</span>
    </span>
  );
}

// De baan en de bol van een schakelaar, zonder knop eromheen. Aan is donker brons
// met een bronzen rand, zodat goud het ene accent van het scherm blijft
// (docs/beslissingen/2026-10-22-instellingen-in-groepen.md). Een rij in de
// instellingen is zelf de knop en tekent alleen deze baan.
export function ToggleVisual({ checked, className = '' }: { checked: boolean; className?: string }) {
  return <span aria-hidden="true" className={`st-switch ${className}`} data-on={checked} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptics.tap();
        onChange(!checked);
      }}
      className="relative block h-6 w-11 shrink-0 rounded-full before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']"
    >
      <ToggleVisual checked={checked} />
    </button>
  );
}

// Small "meer informatie" affordance next to a session's title — opens a
// TrainingGuideSheet. Kept here (not in TrainingGuideSheet.tsx) since two
// unrelated components (TodayMissionCard, SessionActionSheet) both need it.
export function InfoButton({ onClick, label = 'Meer informatie', compact = false }: { onClick: () => void; label?: string; compact?: boolean }) {
  // `compact`: het kleine rondje van de instellingen, in brons, 20 px met een
  // onzichtbare rand tot 44 px.
  if (compact) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className="st-info">
        <Icon name="info" size={14} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border before:absolute before:-inset-2.5 before:content-['']"
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-gold)' }}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="11" x2="12" y2="16.5" />
        <circle cx="12" cy="7.5" r="0.25" fill="currentColor" />
      </svg>
    </button>
  );
}

// Een getal midden in een zin die in Marcellus staat: Marcellus is voor woorden,
// Inter voor getallen ("steen en contour", CLAUDE.md).
export function Num({ children }: { children: ReactNode }) {
  return <span className="font-sans tabular-nums">{children}</span>;
}

// `as="span"` inside a button or a line of text, where a div is not allowed.
export function Eyebrow({ children, as = 'div' }: { children: ReactNode; as?: 'div' | 'span' }) {
  const Tag = as;
  return (
    <Tag className={`${as === 'span' ? 'block ' : ''}text-xs font-medium uppercase tracking-[0.16em]`} style={{ color: 'var(--color-bronze)' }}>
      {children}
    </Tag>
  );
}

// De kop van elke subpagina, in dezelfde stijl als de hoofdschermen: terugknop,
// Eyebrow, grote titel in Marcellus en hoogstens één regel eronder. `right` is
// voor wat rechtsboven staat (het tandwiel van de pagina, 44 bij 44 px).
export function PageHeader({
  eyebrow,
  title,
  line,
  fallback,
  right,
}: {
  eyebrow?: string;
  title: string;
  line?: string;
  fallback?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <BackButton fallback={fallback} />
      <div className="min-w-0 flex-1 pt-1">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-ink)' }}>{title}</h1>
        {line && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>}
      </div>
      {right}
    </div>
  );
}

// Het kleine label "auto": wat ASCEND zelf bijhoudt of binnenkrijgt.
export function AutoTag() {
  return <span className="st-auto">auto</span>;
}

// Een tikbare keuze in de vorm van een afgeronde chip (de sportschool). Een
// gestippelde chip is "Eigen gewicht" of "Anders".
export function Chip({ selected, onClick, children, dashed = false, label }: { selected?: boolean; onClick: () => void; children: ReactNode; dashed?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptics.tap();
        onClick();
      }}
      aria-pressed={selected === undefined ? undefined : selected}
      aria-label={label}
      className={`st-chip${dashed ? ' dashed' : ''}`}
    >
      {children}
    </button>
  );
}

// Een strook met segmenten: Rust, Kort, Normaal en Lang, of 1× tot 5×. Een
// segment is 36 px in een strook van 44 px; met `tall` is het segment zelf 44.
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  tall = false,
}: {
  options: { value: T; label: ReactNode; disabled?: boolean; aria?: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  label: string;
  tall?: boolean;
}) {
  return (
    <div className={`st-seg${tall ? ' tall' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          aria-label={o.aria}
          disabled={o.disabled}
          onClick={() => {
            haptics.tap();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Min en plus rond een waarde, met het label erboven.
export function Stepper({
  label,
  display,
  onDec,
  onInc,
  decDisabled = false,
  incDisabled = false,
  decLabel,
  incLabel,
  compact = false,
}: {
  label: string;
  display: ReactNode;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
  decLabel: string;
  incLabel: string;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="st-lab">{label}</p>
      <div className="st-stepper" role="group" aria-label={label} style={compact ? { gridTemplateColumns: '44px 1fr 44px' } : undefined}>
        <button type="button" disabled={decDisabled} aria-label={decLabel} onClick={() => { haptics.tap(); onDec(); }}>
          <Icon name="min" size={18} />
        </button>
        <span aria-live="polite">{display}</span>
        <button type="button" disabled={incDisabled} aria-label={incLabel} onClick={() => { haptics.tap(); onInc(); }}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}
