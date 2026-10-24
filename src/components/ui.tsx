import type { ReactNode } from 'react';
import { haptics } from '../utils/haptics';
import { BackButton } from './BackButton';
import { SkyBand } from './SkyBand';
import { Icon, type IconName } from './icons';
import { EFFORT_COLOR } from './effortColor';
import { CountUp } from './CountUp';
import './settings/settings.css';
import './sheets.css';

// Een kaart: marine vlak, haarlijn, 16 px afronding en 16 px binnenruimte. Op de
// lichte lucht (SkyBand) wordt dezelfde kaart vanzelf de bijna witte kaart.
export function Card({ children, className = '', texture = false }: { children: ReactNode; className?: string; texture?: boolean }) {
  return (
    <div
      className={`ui-card rounded-2xl border p-4 ${texture ? 'topo-texture' : ''} ${className}`}
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
    >
      {children}
    </div>
  );
}

// De bijna witte kaart met donkere tekst, op de lucht van SkyBand of als het ene
// lichte vlak van een scherm. Alles erin leest de gewone tokens en wordt vanzelf
// donker op licht (`.on-light` in index.css).
export function LightCard({ children, className = '', as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' }) {
  const Tag = as;
  return (
    <Tag className={`on-light light-card rounded-2xl p-4 ${className}`} style={{ background: 'var(--color-light-card)' }}>
      {children}
    </Tag>
  );
}

// De hoofdknop: gevuld mint met donkere tekst, 52 px hoog. Eén per scherm.
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
      className={`${fullWidth ? 'w-full' : 'flex-1'} min-h-[52px] rounded-xl px-4 py-3 text-base font-semibold active:opacity-80 disabled:opacity-40 mx-primary ${className}`}
      style={{ background: 'var(--color-action-fill)', color: 'var(--color-on-action)' }}
    >
      {children}
    </button>
  );
}

// Een gewone knop naast de hoofdknop: mint omlijnd met mint tekst, 44 px hoog.
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
      className={`flex-1 min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium active:opacity-70 disabled:opacity-40 ${className}`}
      style={{ border: '1.5px solid color-mix(in srgb, var(--color-action) 75%, transparent)', color: 'var(--color-action)' }}
    >
      {children}
    </button>
  );
}

export function StatusDot({ status }: { status: 'completed' | 'today' | 'planned' | 'moved' | 'skipped' | 'missed' | 'rest' }) {
  const map: Record<string, { symbol: ReactNode; color: string; label: string }> = {
    completed: { symbol: <Icon name="vinkje" size={16} />, color: 'var(--color-progress)', label: 'Gedaan' },
    today: { symbol: <Icon name="vandaagStip" size={16} />, color: 'var(--color-status)', label: 'Vandaag' },
    planned: { symbol: <Icon name="gepland" size={16} />, color: 'var(--color-ink-dim)', label: 'Gepland' },
    moved: { symbol: <Icon name="verplaatst" size={16} />, color: 'var(--color-status)', label: 'Verplaatst' },
    skipped: { symbol: <Icon name="sluiten" size={16} />, color: 'var(--color-danger-text)', label: 'Overgeslagen' },
    missed: { symbol: '!', color: 'var(--color-warning)', label: 'Gemist' },
    rest: { symbol: <Icon name="rustdag" size={16} />, color: 'var(--color-stone)', label: 'Rustdag' },
  };
  const s = map[status];
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-xs font-bold" style={{ color: s.color }}>
      <span aria-hidden="true">{s.symbol}</span>
      <span className="sr-only">{s.label}</span>
    </span>
  );
}

// De baan en de bol van een schakelaar, zonder knop eromheen. Aan is mint gedempt
// met een mint rand, zodat de gevulde mint knop het ene accent van het scherm
// blijft (docs/beslissingen/2026-10-24-thema-zee-en-berg.md). Een rij in de
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
      // A real box of 44 by 44 (Lookout): the negative margin keeps the row as it was.
      className="-my-2.5 flex h-11 w-11 shrink-0 items-center rounded-full"
    >
      <ToggleVisual checked={checked} />
    </button>
  );
}

// Small "meer informatie" affordance next to a session's title — opens a
// TrainingGuideSheet. Kept here (not in TrainingGuideSheet.tsx) since two
// unrelated components (TodayMissionCard, SessionActionSheet) both need it.
export function InfoButton({ onClick, label = 'Meer informatie', compact = false }: { onClick: () => void; label?: string; compact?: boolean }) {
  // `compact`: het kleine rondje van de instellingen, gedimd, 20 px met een
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
      // A real box of 44 by 44 around the 24 px circle (Lookout); the negative
      // margin keeps the title line as it was.
      className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
      style={{ color: 'var(--color-ink-dim)' }}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: 'var(--color-control-border)' }}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="11" x2="12" y2="16.5" />
          <circle cx="12" cy="7.5" r="0.25" fill="currentColor" />
        </svg>
      </span>
    </button>
  );
}

// Een getal midden in een zin die in Marcellus staat: Marcellus is voor woorden,
// Inter voor getallen ("steen en contour", CLAUDE.md).
export function Num({ children }: { children: ReactNode }) {
  return <span className="font-sans tabular-nums">{children}</span>;
}

// Een tekst in Marcellus waar getallen in staan ("15 km wandeling"): de woorden
// blijven Marcellus, de getallen worden Inter met vaste cijferbreedte.
export function NumText({ children }: { children: string }) {
  const parts = children.split(/(\d+(?:[.,:]\d+)*)/);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <Num key={i}>{part}</Num> : part))}
    </>
  );
}

// Het kleine kopje in hoofdletters: 12 px, halfvet, smalle letterafstand, in de
// kleur van de tab waar je bent (--color-page; mint buiten de tabs, donker op de
// lichte lucht). Hooguit één per kaart. `tone` is voor een kopje met een eigen
// betekenis (amber, ijs). `as="span"` inside a button or a line of
// text, where a div is not allowed.
export function Eyebrow({ children, as = 'div', tone }: { children: ReactNode; as?: 'div' | 'span'; tone?: string }) {
  const Tag = as;
  return (
    <Tag className={`${as === 'span' ? 'block ' : ''}text-xs font-semibold uppercase leading-4 tracking-[0.08em]`} style={{ color: tone ?? 'var(--color-page)' }}>
      {children}
    </Tag>
  );
}

// De kop van elke subpagina, in dezelfde stijl als de hoofdschermen: een lage
// lichte lucht met bergen (SkyBand), daarop terugknop, Eyebrow in de kleur van de
// pagina, de titel in Marcellus en hoogstens één regel eronder. `right` is voor
// wat rechtsboven naast de titel staat. De band loopt tot de bovenrand: de
// pagina eronder heeft `pt-6` en de band trekt dat zelf weer recht.
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
    <div className="-mt-6 -mb-2">
      <SkyBand variant="low">
        <div className="flex items-start gap-2">
          <BackButton fallback={fallback} />
          <div className="min-w-0 flex-1 pt-1">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-ink)' }}>{title}</h1>
            {line && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>}
          </div>
          {right}
        </div>
      </SkyBand>
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

// Een getal met een kleine eenheid erachter, en het label erboven (links
// uitgelijnd, nooit ernaast). Inter halfvet met vaste cijferbreedte, in de vier
// maten van de typeschaal: s 20 (rij of tegel), m 28 (naast een held), l 40
// (held van een kaart) en xl 56 (de ene held van het scherm).
const STAT_SIZE = { s: 'text-xl', m: 'text-[28px]', l: 'text-[40px] tracking-[-0.03em]', xl: 'text-[56px] tracking-[-0.04em]' } as const;
export function Stat({
  label,
  value,
  unit,
  size = 's',
  className = '',
}: {
  label?: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  size?: keyof typeof STAT_SIZE;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {label && <span className="text-xs font-medium leading-4" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>}
      <span className={`whitespace-nowrap font-sans font-semibold leading-none tabular-nums tracking-[-0.02em] ${STAT_SIZE[size]}`} style={{ color: 'var(--color-ink)' }}>
        {(size === 'l' || size === 'xl') && typeof value === 'number' && Number.isInteger(value) && value >= 0 ? <CountUp value={value} /> : value}
        {unit && <span className="ml-[3px] text-sm font-medium tracking-normal" style={{ color: 'var(--color-ink-dim)' }}>{unit}</span>}
      </span>
    </div>
  );
}

// Een pil van 24 px hoog: een korte staat rechts in een rij ("Vandaag", "Herstel",
// "+6 in oktober"). `action` is gevuld mint, de rest een zachte tint met de kleur
// als tekst. Rechts in een rij staat hooguit één ding.
const PILL_TONE = {
  action: { bg: 'var(--color-action-fill)', fg: 'var(--color-on-action)' },
  progress: { bg: 'color-mix(in srgb, var(--color-progress) 16%, transparent)', fg: 'var(--color-progress)' },
  status: { bg: 'color-mix(in srgb, var(--color-status) 14%, transparent)', fg: 'var(--color-status)' },
  warning: { bg: 'color-mix(in srgb, var(--color-warning) 16%, transparent)', fg: 'var(--color-warning)' },
  danger: { bg: 'color-mix(in srgb, var(--color-danger-text) 14%, transparent)', fg: 'var(--color-danger-text)' },
  neutral: { bg: 'transparent', fg: 'var(--color-ink-dim)' },
} as const;
export function StatusPill({ children, tone = 'status', icon }: { children: ReactNode; tone?: keyof typeof PILL_TONE; icon?: IconName }) {
  const t = PILL_TONE[tone];
  return (
    <span
      className="inline-flex h-6 w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-semibold"
      style={{ background: t.bg, color: t.fg, boxShadow: tone === 'neutral' ? 'inset 0 0 0 1px var(--color-card-border)' : undefined }}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

// Een voortgangsring in mint (donkere mint op licht), met in het midden wat je
// meegeeft ("3/5" en "gedaan"). `value` is een deel van 0 tot 1.
export function Ring({
  value,
  label,
  size = 68,
  stroke = 7,
  children,
}: {
  value: number;
  label: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-progress)" strokeWidth={stroke} strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} className="mx-ring" />
        )}
      </svg>
      {children && <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}

// Een balk van 6 px in mint op de lege baan (donkere mint op licht). `value` is
// een deel van 0 tot 1; boven 1 blijft de balk vol.
export function Meter({ value, label, tone = 'progress' }: { value: number; label: string; tone?: 'progress' | 'status' | 'warning' }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: 'var(--color-track)' }}
    >
      <div className="mx-meter h-full rounded-full" style={{ width: `${pct}%`, background: `var(--color-${tone})` }} />
    </div>
  );
}

// De vijf inspanningszones naast elkaar: de actieve breder en hoger in haar eigen
// kleur, de rest gedempt op de baan. Eronder Z1 tot Z5, want kleur is nooit het
// enige signaal. `active` is 1 tot 5, of leeg als er geen zone geldt.
export function ZoneBar({ active, label }: { active?: 1 | 2 | 3 | 4 | 5; label?: string }) {
  const zones = [1, 2, 3, 4, 5] as const;
  return (
    <div className="flex flex-col gap-2" role="img" aria-label={label ?? (active ? `Zone ${active}` : 'Zone 1 tot 5')}>
      <div aria-hidden="true" className="flex items-center gap-1">
        {zones.map((z) => (
          <span
            key={z}
            className="rounded"
            style={{
              flex: z === active ? 2 : 1,
              height: z === active ? 12 : 8,
              background: z === active ? EFFORT_COLOR[z] : `color-mix(in srgb, ${EFFORT_COLOR[z]} 28%, var(--color-track))`,
            }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-1">
        {zones.map((z) => (
          <span
            key={z}
            className="text-center text-xs leading-4 tabular-nums"
            style={{ flex: z === active ? 2 : 1, fontWeight: z === active ? 700 : 500, color: z === active ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}
          >
            Z{z}
          </span>
        ))}
      </div>
    </div>
  );
}
