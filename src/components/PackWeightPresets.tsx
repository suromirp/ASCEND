// ASCEND — twee snelle keuzes voor het rugzakdoel (hut tot hut, met tent) en
// de uitleg erbij. Gedeeld door het doel-scherm en het bewerkscherm van een
// tocht (GoalRouteEditor), zodat beide hetzelfde zeggen. De getallen staan in
// engine/gr5Profile.ts.

import { HUT_PACK_KG, TENT_PACK_KG, PACK_WEIGHT_EXPLANATION } from '../engine/gr5Profile';
import { formatNumberNL } from '../utils/number';

const OPTIONS = [
  { kg: HUT_PACK_KG, label: 'Hut tot hut' },
  { kg: TENT_PACK_KG, label: 'Met tent' },
];

export function PackWeightPresets({ value, onPick }: { value: number | undefined; onPick: (kg: number) => void }) {
  return (
    <div>
      <div className="flex gap-2">
        {OPTIONS.map((o) => {
          const selected = value === o.kg;
          return (
            <button
              key={o.kg}
              type="button"
              onClick={() => onPick(o.kg)}
              aria-pressed={selected}
              className="min-h-11 flex-1 rounded-xl border px-2 text-xs font-medium transition-all active:scale-[0.98]"
              style={selected
                ? { borderColor: 'var(--color-gold)', background: 'var(--color-card)', color: 'var(--color-gold)' }
                : { borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}
            >
              {o.label} · {formatNumberNL(o.kg, 0)} kg
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{PACK_WEIGHT_EXPLANATION}</p>
    </div>
  );
}
