// ASCEND — one number input for the whole app: Dutch notation (dot for
// thousands, comma for decimals, formatted while typing — utils/number.ts),
// the unit inside the field instead of repeated in the label, and a short
// helper line underneath when a field needs one.

import { useId, useState } from 'react';
import { parseNumberNL, formatWhileTypingNL, formatNumberNL } from '../utils/number';

const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

function toText(value: number | undefined, decimals: number): string {
  return value === undefined ? '' : formatNumberNL(value, decimals);
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  decimals = 0,
  helper,
  placeholder,
  compact = false,
  tall = false,
}: {
  label?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  unit?: string;
  decimals?: number;
  helper?: string;
  placeholder?: string;
  compact?: boolean;
  // A tap target of at least 44 px (CLAUDE.md), for fields in settings.
  tall?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(() => toText(value, decimals));
  const [warning, setWarning] = useState<string | undefined>();
  const [syncedValue, setSyncedValue] = useState(value);

  // Follow outside changes (a reset, a derived value) without fighting the
  // user's own half-typed text: only resync when the number it represents
  // actually differs. Adjusting state during render, React's documented
  // alternative to an effect for exactly this.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (parseNumberNL(text, decimals).value !== value) setText(toText(value, decimals));
  }

  function handleChange(raw: string) {
    const formatted = formatWhileTypingNL(raw, decimals);
    setText(formatted);
    const parsed = parseNumberNL(formatted, decimals);
    setWarning(parsed.warning);
    onChange(parsed.value);
  }

  return (
    <div>
      {label && <label htmlFor={id} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</label>}
      <div className={`relative ${label ? 'mt-1' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode={decimals > 0 ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full min-w-0 rounded-lg border bg-transparent px-2.5 ${tall ? 'min-h-[44px] py-1.5' : compact ? 'py-1' : 'py-1.5'} text-sm`}
          style={unit ? { ...fieldStyle, paddingRight: `calc(${unit.length}ch * 0.8 + 1rem)` } : fieldStyle}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {unit}
          </span>
        )}
      </div>
      {warning && <p className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }}>{warning}</p>}
      {helper && !warning && <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{helper}</p>}
    </div>
  );
}
