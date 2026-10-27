// ASCEND: de tweede kaart na een loop of tocht (CompletionMoment): hoogstens twee
// rijen, "Beter" en "Let op", elk met één zin en rechts "Waarom" dat het blad opent.
// De ene zin over de verdeling van het tempo (test, tempoloop, interval) staat op de plek
// van "Let op" en heeft geen blad. Alleen woorden: geen icoon, geen kleurvlak, geen pijltje.
// Staat er niets te zeggen, dan geen kaart, behalve de ene zin met de reden als iets niet te
// vergelijken was. Besluit: docs/beslissingen/2026-10-22-loopinzicht.md.

import { useState } from 'react';
import { insightRows, type InsightLine } from '../engine/runInsight';
import { useRunInsight } from './useRunInsight';
import { RunInsightSheet } from './RunInsightSheet';
import { Card, Eyebrow, InfoButton } from './ui';

export function RunInsightCard({ logId, delayMs = 640 }: { logId: string | undefined; delayMs?: number }) {
  const { insight } = useRunInsight(logId);
  const [open, setOpen] = useState<InsightLine | null>(null);
  if (!insight) return null;
  const rows = insightRows(insight);
  if (rows.length === 0 && !insight.note) return null;
  const notCompared = (insight.notCompared ?? []).map((n) => n.text);
  return (
    <>
      <div className="completion-rise mt-3" style={{ '--d': `${delayMs}ms` } as React.CSSProperties}>
      <Card className="!py-1">
        {rows.length === 0 ? (
          <p className="py-3 text-[14.5px] leading-snug" style={{ color: 'var(--color-ink)' }}>{insight.note}</p>
        ) : (
          rows.map((row, i) => (
            <div key={row.kind === 'line' ? row.line.topic : 'pacing'} className="flex min-h-[52px] items-start gap-3 py-2.5" style={{ borderTop: i === 0 ? undefined : '1px solid var(--color-card-border)' }}>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Eyebrow>{row.kind === 'line' ? row.line.word : row.word}</Eyebrow>
                <p className="text-[14.5px] leading-snug" style={{ color: 'var(--color-ink)' }}>{row.kind === 'line' ? row.line.text : row.text}</p>
              </div>
              {row.kind === 'line' && (
                <div className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                  <InfoButton onClick={() => setOpen(row.line)} label={`Waarom: ${row.line.title}`} />
                </div>
              )}
            </div>
          ))
        )}
      </Card>
      </div>
      {open && <RunInsightSheet model={open} notCompared={notCompared} onClose={() => setOpen(null)} />}
    </>
  );
}
