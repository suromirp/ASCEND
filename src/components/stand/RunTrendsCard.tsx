// ASCEND: Je stand, scherm Lopen: de rijen met een lijntje van de laatste 12
// weken en één woord (Beter, Normaal, Slechter of Te weinig gegevens). Een tik op
// een rij opent hetzelfde blad Waarom als na de training, met de trend in plaats
// van één loop. De rij Efficiëntie staat hier niet: hij leest dezelfde aerobicTrend
// als de kaart Tempo bij zone 2 op Je stand (engine/runTrends.ts), dus hetzelfde feit
// (docs/visie/Ontwerp Stand minimaal.md). De instelling blijft gelden voor het blad na een loop.

import { useState } from 'react';
import type { TrendRow } from '../../engine/runTrends';
import { useRunTrendRows } from './useRunTrendRows';
import { Card, Eyebrow } from '../ui';
import { RunInsightSheet } from '../RunInsightSheet';
import { Sparkline } from './Sparkline';

export function RunTrendsCard() {
  const rows = useRunTrendRows();
  const [open, setOpen] = useState<TrendRow | null>(null);
  if (rows.length === 0) return null;
  // Zonder één rij met gegevens is er niets te laten zien.
  if (rows.every((r) => r.word === 'Te weinig gegevens')) return null;
  return (
    <>
      <Card className="flex flex-col !py-2">
        {rows.map((r, i) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setOpen(r)}
            className="flex min-h-[44px] w-full items-center gap-4 py-3 text-left"
            style={{ borderTop: i === 0 ? undefined : '1px solid var(--color-card-border)' }}
            aria-label={`${r.title}: ${r.word}. Toon waarom`}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Eyebrow as="span">{r.title}</Eyebrow>
              {r.word !== 'Te weinig gegevens' && <Sparkline points={r.points} />}
            </span>
            {r.word === 'Te weinig gegevens' ? (
              <span className="w-24 shrink-0 text-right text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{r.word}</span>
            ) : (
              <span className="w-24 shrink-0 text-right font-display text-lg" style={{ color: 'var(--color-ink)' }}>{r.word}</span>
            )}
          </button>
        ))}
      </Card>
      {open && <RunInsightSheet model={open.model} onClose={() => setOpen(null)} />}
    </>
  );
}
