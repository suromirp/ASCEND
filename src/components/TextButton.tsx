import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './icons';

// Een tekstknop: een kleine actie naast of onder de inhoud, zonder rand en zonder
// onderstreping. Mint (de actiekleur) of gedempt, in zinsletters, 44 px hoog.
// Een bronlink naar buiten blijft een onderstreepte <a>; dit is voor acties.
//
// `tone`: 'action' (mint, de gewone keuze), 'dim' (gedempt, voor "Niet nu" en
// andere afwijzingen) of 'danger' (rood, voor iets wat je weggooit).
const TONE: Record<'action' | 'dim' | 'danger', string> = {
  action: 'var(--color-action)',
  dim: 'var(--color-ink-dim)',
  danger: 'var(--color-danger-text)',
};

export function TextButton({
  children,
  tone = 'action',
  icon,
  flipped = false,
  size = 'sm',
  className = '',
  style,
  type = 'button',
  ...rest
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
  // Een pijltje of ander icoon achter de tekst (bijvoorbeeld `verder`).
  icon?: IconName;
  // Draait het icoon om, voor een knop die iets open en dicht klapt (`omlaag`).
  flipped?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1 ${size === 'xs' ? 'text-xs' : 'text-sm'} font-medium active:opacity-70 disabled:opacity-40 ${className}`}
      style={{ color: TONE[tone], ...style }}
      {...rest}
    >
      {children}
      {icon && <span className="transition-transform" style={{ transform: flipped ? 'rotate(180deg)' : undefined }}><Icon name={icon} size={16} /></span>}
    </button>
  );
}

// Dezelfde tekstknop als een link naar buiten die een actie is ("Route ernaartoe"):
// geen onderstreping, met het pijltje naar buiten erachter. Een bronvermelding
// blijft een onderstreepte link in de actiekleur.
export function TextLink({
  children,
  tone = 'action',
  size = 'sm',
  className = '',
  style,
  ...rest
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
  size?: 'xs' | 'sm';
  className?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className'>) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[44px] items-center gap-1 ${size === 'xs' ? 'text-xs' : 'text-sm'} font-medium active:opacity-70 ${className}`}
      style={{ color: TONE[tone], ...style }}
      {...rest}
    >
      {children}
      <Icon name="buiten" size={16} />
    </a>
  );
}
