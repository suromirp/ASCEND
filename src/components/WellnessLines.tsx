// ASCEND: "Van je horloge vanochtend": sleep, resting heart rate and HRV above
// the morning check-in, each with a few words on what it says
// (engine/wellnessCheck.ts). Prefilled for the user, never a verdict.

import { WELLNESS_FOOTNOTE, type WellnessReading } from '../engine/wellnessCheck';
import { Eyebrow } from './ui';

export function WellnessLines({ reading }: { reading: WellnessReading }) {
  return (
    <div className="border-y py-3" style={{ borderColor: 'var(--color-card-border)' }}>
      <Eyebrow>Van je horloge vanochtend</Eyebrow>
      <ul className="mt-2 flex flex-col gap-3">
        {reading.lines.map((line) => (
          <li key={line.key}>
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span style={{ color: 'var(--color-ink)' }}>{line.label}</span>
              <span className="tabular-nums" style={{ color: line.tone === 'attention' ? 'var(--color-warning)' : 'var(--color-action)' }}>{line.value}</span>
            </p>
            <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{line.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{WELLNESS_FOOTNOTE}</p>
    </div>
  );
}
