// ASCEND: de kleine onderdelen van het workoutscherm van Forge. Geen
// rekenwerk; dat staat in engine/forgeWorkout.ts.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { haptics } from '../../utils/haptics';
import { animateEl } from '../../utils/motion';
import { formatNumberNL } from '../../utils/number';
import { useSheetClose } from '../../utils/useSheetClose';
import { Icon } from '../icons';
import { Portal } from '../Portal';

// De kleuren die de eigenaar kent: 0 en 1 rood, 2 oranje, 3 geel, meer steen.
function rirColor(rir: number): string {
  if (rir <= 1) return 'var(--color-rir-hard)';
  if (rir === 2) return 'var(--color-rir-mid)';
  if (rir === 3) return 'var(--color-rir-easy)';
  return 'var(--color-rir-light)';
}

// Het bolletje met de herhalingen in reserve. Klein te zien, 44 px te tikken.
export function RirBubble({ rir, onClick, label }: { rir: number; onClick?: () => void; label: string }) {
  const style = { background: rirColor(rir), color: 'var(--color-on-gold)' };
  const face = <span className="flex h-6 w-6 items-center justify-center rounded-full font-sans text-xs font-semibold tabular-nums" style={style}>{rir >= 5 ? '5+' : rir}</span>;
  if (!onClick) return <span aria-label={label} className="flex h-6 w-6 items-center justify-center">{face}</span>;
  return (
    <button type="button" onClick={onClick} aria-label={label} className="relative flex h-6 w-6 items-center justify-center before:absolute before:-inset-2.5 before:content-['']">
      {face}
    </button>
  );
}

// Het afvinkvakje van een set: vult met een korte veer, het vinkje tekent zichzelf.
// Alleen een tik speelt de beweging af; een training die terugkomt uit het concept staat meteen goed.
export function TickBox({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  const [played, setPlayed] = useState(false);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={() => {
        setPlayed(!done);
        onClick();
      }}
      className={`relative flex h-8 w-8 items-center justify-center rounded-lg border before:absolute before:-inset-2 before:content-[''] ${done && played ? 'forge-pop' : ''}`}
      style={{
        borderColor: done ? 'var(--color-success)' : 'var(--color-control-border)',
        background: done ? 'var(--color-success)' : 'transparent',
        color: 'var(--color-ink)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {done && (
        <span className={played ? 'forge-check-draw' : 'forge-check'} style={{ display: 'flex' }}>
          <Icon name="vinkje" size={20} />
        </span>
      )}
    </button>
  );
}

// Een getal in de tabel: een tikdoel dat het invoerpaneel opent (geen toetsenbord
// van het systeem). Het veld dat nu bewerkt wordt heeft een lichte rand; zolang
// het nog "geselecteerd" is, vervangt het eerste cijfer het getal.
export function ValueCell({
  value,
  decimals,
  label,
  done,
  active,
  selected,
  onOpen,
}: {
  value: number | undefined;
  decimals: number;
  label: string;
  done: boolean;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  const text = value === undefined ? '' : formatNumberNL(value, decimals);
  const face = useRef<HTMLSpanElement>(null);
  const last = useRef(value);
  useEffect(() => {
    if (last.current === value) return;
    last.current = value;
    animateEl(face.current, [{ opacity: 0.35, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
  }, [value]);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}: ${text === '' ? 'leeg' : text}`}
      aria-pressed={active}
      className="flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-lg px-1 font-sans text-sm tabular-nums"
      style={{
        background: done ? 'transparent' : 'var(--color-surface)',
        boxShadow: active ? 'inset 0 0 0 2px var(--color-ink)' : `inset 0 0 0 1px ${done ? 'transparent' : 'var(--color-card-border)'}`,
        color: 'var(--color-ink)',
        transition: 'box-shadow 0.18s ease, background-color 0.2s ease',
      }}
    >
      <span ref={face} className="rounded px-1" style={{ background: active && selected && text !== '' ? 'color-mix(in srgb, var(--color-bronze) 38%, transparent)' : 'transparent', transition: 'background-color 0.15s ease' }}>
        {text === '' ? '\u00a0' : text}
      </span>
    </button>
  );
}

// Een rij van de tabel: lang drukken opent het menu van die set. Een tik erna
// (het loslaten) telt niet als tik op een veld in de rij.
export function LongPressRow({
  onLong,
  disabled,
  className,
  style,
  children,
  ...rest
}: {
  onLong: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  'data-active'?: boolean;
}) {
  const timer = useRef<number | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cancel = () => window.clearTimeout(timer.current);
  useEffect(() => cancel, []);
  return (
    <div
      role="row"
      className={className}
      style={style}
      {...rest}
      onPointerDown={(e) => {
        if (disabled || e.button > 0) return;
        fired.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        cancel();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          haptics.tap();
          onLong();
        }, 450);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 8) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClickCapture={(e) => {
        if (!fired.current) return;
        fired.current = false;
        e.stopPropagation();
        e.preventDefault();
      }}
      onContextMenu={(e) => {
        if (!disabled) e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

// Een blad van onderen, met een titel en een sluitknop.
export function ForgeSheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div
          className={`flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-b-0 ${closing ? 'forge-down' : 'forge-up'}`}
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2 px-4 pb-2 pt-3">
            <div className="min-w-0 flex-1 pt-2">
              <p className="text-base font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{title}</p>
              {sub && <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{sub}</p>}
            </div>
            <button type="button" onClick={requestClose} aria-label="Sluiten" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
              <Icon name="sluiten" size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-4 pb-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
            {children(requestClose)}
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Een regel in een blad: een keuze met een pictogram, de hele regel is te tikken.
export function MenuRow({ icon, title, sub, onClick, danger = false, right }: { icon?: Parameters<typeof Icon>[0]['name']; title: string; sub?: string; onClick?: () => void; danger?: boolean; right?: ReactNode }) {
  const body = (
    <>
      {icon && <span className="shrink-0" style={{ color: danger ? 'var(--color-danger-text)' : 'var(--color-ink-dim)' }}><Icon name={icon} size={20} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug" style={{ color: danger ? 'var(--color-danger-text)' : 'var(--color-ink)' }}>{title}</span>
        {sub && <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{sub}</span>}
      </span>
      {right}
    </>
  );
  const cls = `flex w-full items-center gap-3 border-t py-2 text-left first:border-t-0 ${sub ? 'min-h-[60px]' : 'min-h-[52px]'}`;
  if (!onClick) return <div className={cls} style={{ borderColor: 'var(--color-card-border)' }}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={`${cls} active:opacity-70`} style={{ borderColor: 'var(--color-card-border)' }}>
      {body}
    </button>
  );
}
