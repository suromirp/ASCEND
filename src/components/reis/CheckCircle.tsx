import { Icon } from '../icons';
// A round tick box with a 44 px tap area, for the reisplanner and the
// packing list.
export function CheckCircle({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold"
        style={{
          borderColor: checked ? 'var(--color-action)' : 'var(--color-control-border)',
          background: checked ? 'var(--color-action)' : 'transparent',
          color: 'var(--color-bg)',
        }}
      >
        {checked ? <Icon name="vinkje" size={16} /> : null}
      </span>
    </button>
  );
}
