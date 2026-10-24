import { haptics } from '../utils/haptics';

// One row of choices in a strip of 46 px (44 inside its border): each cell is the whole tap target
// (at least 44 by 44 px), the chosen one shows a 36 px segment in bronze. No
// gold: in a sheet the gold belongs to the one button that saves.
// `optional`: tapping the chosen cell again clears it.
export function ChoiceStrip<T extends string | number>({
  options,
  value,
  onChange,
  label,
  optional = false,
  numeric = false,
}: {
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  label: string;
  optional?: boolean;
  numeric?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex h-[46px] w-full items-stretch rounded-xl border"
      style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              haptics.tap();
              onChange(on && optional ? undefined : o.value);
            }}
            className="flex min-w-[44px] flex-1 items-center justify-center px-[3px]"
          >
            <span
              className={`flex h-9 w-full items-center justify-center rounded-lg border text-sm ${numeric ? 'font-sans tabular-nums' : ''} ${on ? 'font-semibold' : ''}`}
              style={{
                borderColor: on ? 'var(--color-action)' : 'transparent',
                background: on ? 'color-mix(in srgb, var(--color-action) 22%, transparent)' : 'transparent',
                color: on ? 'var(--color-ink)' : 'var(--color-ink-dim)',
              }}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
