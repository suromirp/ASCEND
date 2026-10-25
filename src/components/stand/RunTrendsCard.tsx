// ASCEND: Je stand, sectie Lopen: vier rijen met een lijntje van de laatste 12
// weken en één woord (Beter, Normaal, Slechter of Te weinig gegevens). Een tik op
// een rij opent hetzelfde blad Waarom als na de training, met de trend in plaats
// van één loop. De efficiëntierij leest dezelfde aerobicTrend als de kaart Tempo
// bij zone 2 (engine/runTrends.ts): geen tweede voortgangsgetal. Geen eigen goud
// en geen contourlijnen: dat is voor de missiekaart.

import { useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { runTrends, type TrendRow } from '../../engine/runTrends';
import { useExcludedLogIds } from '../influence/useInfluence';
import { todayISO } from '../../utils/dates';
import { Card, Eyebrow } from '../ui';
import { RunInsightSheet } from '../RunInsightSheet';
import { useDetailsOn } from '../useRunInsight';
import { Sparkline } from './Sparkline';

export function RunTrendsCard() {
  const { sessionLogs, templates, program, settings } = useAppData();
  const detailsOn = useDetailsOn();
  const excluded = useExcludedLogIds();
  const [open, setOpen] = useState<TrendRow | null>(null);
  const trends = useMemo(
    () => runTrends({ logs: sessionLogs, templates, program, hr: settings.heartRate, settings: settings.runInsight, detailsOn, today: todayISO(), excludedLogIds: excluded }),
    [sessionLogs, templates, program, settings.heartRate, settings.runInsight, excluded, detailsOn],
  );
  if (trends.rows.length === 0) return null;
  // Zonder één rij met gegevens is er niets te laten zien: één regel is genoeg.
  if (trends.rows.every((r) => r.word === 'Te weinig gegevens')) {
    return (
      <Card className="flex min-h-[44px] items-center">
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Lopen: nog te weinig gegevens voor een trend. Na een paar loopjes verschijnt hij hier.</p>
      </Card>
    );
  }
  return (
    <>
      <Card className="flex flex-col !py-2">
        {trends.rows.map((r, i) => (
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
