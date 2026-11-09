import type { GeneralReadiness } from '../../engine/goalReadinessFor';
import { Card, Eyebrow, StatusPill } from '../ui';
import { TextButton } from '../TextButton';

// Algemeen sterk met eigen gewicht op de Ascend-tab (docs/beslissingen/2026-11-09-calisthenics-algemeen.md): per
// ladder de stap waar je nu op traint, en één zin samen. Geen percentage en geen datum. Alles komt uit
// engine/goalReadinessFor.ts#generalReadinessFor. IJsblauw voor een ladder die hoger staat dan bij de start (status),
// geen mint. Verschijnt met mx-row-in: in Rustig en Uit meteen op de eindstand.

export function GeneralStrengthCard({ name, readiness, onRemove }: { name: string; readiness: GeneralReadiness; onRemove: () => void }) {
  const dim = { color: 'var(--color-ink-dim)' };
  return (
    <Card className="mx-row-in flex flex-col gap-3" aria-label={`Calisthenics ${name}`}>
      <div>
        <Eyebrow>Calisthenics · Algemeen</Eyebrow>
        <h2 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{name}</h2>
      </div>

      <ul className="flex flex-col" aria-label="Ladders">
        {readiness.rows.map((r) => (
          <li key={r.ladderId} className="flex min-h-[44px] flex-col justify-center gap-0.5 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold" style={dim}>{r.ladderName}</span>
              {r.higher && <StatusPill>Hoger</StatusPill>}
            </span>
            <span className="text-sm leading-snug" style={{ color: r.current === null ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{r.work}</span>
            <span className="text-xs leading-snug" style={dim}>{r.line}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{readiness.line}</p>

      <div className="-mb-2 flex justify-end">
        <TextButton tone="dim" onClick={onRemove}>Weghalen</TextButton>
      </div>
    </Card>
  );
}
