import type { CalibrationView } from '../../engine/ijktocht';
import { formatWeekdayDateNL } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';

// Belasting → het blad IJktocht (engine/ijktocht.ts, docs/beslissingen/2026-11-26-ijktocht.md): drie regels over je
// laatste ijktocht tegen de vorige, en wat de vergelijking minder zeker maakt. Alleen lezen.

export function CalibrationBody({ view }: { view: CalibrationView }) {
  const { latest, previous } = view;
  const pack = (kg?: number) => (kg !== undefined ? `, rugzak ${formatNumberNL(kg, 1)} kg` : '');
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        {previous
          ? <>Je ijktocht van {formatWeekdayDateNL(latest.date)}{pack(latest.packKg)}, tegen de vorige van {formatWeekdayDateNL(previous.date)}{pack(previous.packKg)}.</>
          : <>Je nulmeting van {formatWeekdayDateNL(latest.date)}{pack(latest.packKg)}. De volgende ijktocht vergelijk je hiermee.</>}
      </p>
      <ul className="flex flex-col gap-2.5">
        {view.lines.map((line) => (
          <li key={line.head} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{line.head}</span>
            {line.text}
          </li>
        ))}
      </ul>
      {view.caveats.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Voorbehoud">
          {view.caveats.map((c) => (
            <li key={c} className="text-sm leading-relaxed" style={{ color: 'var(--color-warning)' }}>{c}</li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Een kompas, geen gevalideerde test. Alleen met dezelfde route, dezelfde rugzak en een rustig tempo zegt het verschil iets.
      </p>
    </div>
  );
}
