// ASCEND: de kleine onderdelen van het workoutscherm van Forge. Geen
// rekenwerk; dat staat in engine/forgeWorkout.ts.

import { useState, type ReactNode } from 'react';
import { formatNumberNL, formatWhileTypingNL, parseNumberNL } from '../../utils/number';
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

// Het afvinkvakje van een set.
export function TickBox({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={onClick}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors before:absolute before:-inset-2 before:content-['']"
      style={{
        borderColor: done ? 'var(--color-success)' : 'var(--color-control-border)',
        background: done ? 'var(--color-success)' : 'transparent',
        color: 'var(--color-ink)',
      }}
    >
      {done && <Icon name="vinkje" size={20} />}
    </button>
  );
}

// Een getal in de tabel: komma als decimaalteken, numeriek toetsenbord, bij
// een tik meteen alles geselecteerd zodat je het overschrijft.
export function NumCell({
  value,
  onChange,
  decimals,
  label,
  done,
  onFocus,
  onBlur,
  allowNegative = false,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  decimals: number;
  label: string;
  done: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  allowNegative?: boolean;
}) {
  const toText = (v: number | undefined) => (v === undefined ? '' : formatNumberNL(v, decimals));
  const read = (t: string): number | undefined => {
    const negative = allowNegative && t.trim().startsWith('-');
    const parsed = parseNumberNL(t.replace(/-/g, ''), decimals).value;
    return parsed === undefined ? undefined : negative ? -parsed : parsed;
  };
  const [text, setText] = useState(() => toText(value));
  const [synced, setSynced] = useState(value);
  // Volg een verandering van buiten (een ruil, een nieuwe set) zonder half
  // getypte tekst te overschrijven.
  if (value !== synced) {
    setSynced(value);
    if (read(text) !== value) setText(toText(value));
  }
  function handle(raw: string) {
    const negative = allowNegative && raw.trim().startsWith('-');
    const next = `${negative ? '-' : ''}${formatWhileTypingNL(raw.replace(/-/g, ''), decimals)}`;
    setText(next);
    onChange(read(next));
  }
  return (
    <input
      type="text"
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete="off"
      aria-label={label}
      value={text}
      onChange={(e) => handle(e.target.value)}
      onFocus={(e) => {
        e.currentTarget.select();
        onFocus?.();
      }}
      onBlur={onBlur}
      className="w-full min-w-0 rounded-lg border px-1 text-center font-sans text-[15px] tabular-nums"
      style={{
        background: done ? 'transparent' : 'var(--color-surface)',
        borderColor: done ? 'transparent' : 'var(--color-card-border)',
        color: 'var(--color-ink)',
      }}
    />
  );
}

// Een blad van onderen, met een titel en een sluitknop.
export function ForgeSheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div
          className={`flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-b-0 ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
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
