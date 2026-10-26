import type { GoalPriority } from '../../models/goals';
import { PRIORITY_NAME } from '../../engine/goalLabels';
import { Icon } from '../icons';

// Het label van een doel (Top, Voortop, Verkenning) met drie streepjes als taalloos teken van
// hoe zwaar het telt: 3, 2 of 1 gevuld. Mint is voortgang en keuze; de lege streepjes staan op
// de baan. Nooit ijsblauw: dat is alleen status.
const FILLED: Record<GoalPriority, number> = { top: 3, voortop: 2, verkenning: 1 };
const HEIGHT = [6, 9, 12];

export function LabelBars({ priority }: { priority: GoalPriority }) {
  return (
    <span aria-hidden="true" className="inline-flex h-3 items-end gap-[2px]">
      {HEIGHT.map((h, i) => (
        <span key={h} className="w-[3px] rounded-[1px]" style={{ height: h, background: i < FILLED[priority] ? 'var(--color-progress)' : 'var(--color-track)' }} />
      ))}
    </span>
  );
}

// De pil is 28 px hoog met een onzichtbare uitbreiding tot 44 px, zoals InfoButton.
export function LabelPill({ priority, onClick, strong = false }: { priority: GoalPriority; onClick?: () => void; strong?: boolean }) {
  const inner = (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-sm font-semibold"
      style={{ borderColor: strong ? 'var(--color-action)' : 'var(--color-control-border)', color: 'var(--color-ink)' }}
    >
      <LabelBars priority={priority} />
      {PRIORITY_NAME[priority]}
      {onClick && <Icon name="omlaag" size={14} />}
    </span>
  );
  if (!onClick) return inner;
  return (
    <button type="button" onClick={onClick} aria-label={`Label ${PRIORITY_NAME[priority]}, wijzigen`} className="-my-2 flex min-h-[44px] min-w-[44px] items-center">
      {inner}
    </button>
  );
}
