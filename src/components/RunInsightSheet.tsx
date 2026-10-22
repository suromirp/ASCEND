// ASCEND: het blad "Waarom" bij het loopinzicht: wat er vergeleken is, hoe sterk
// het verschil is en wat het kan betekenen, met de achtergrond ingeklapt.
// Gebouwd zoals Gr5ReadinessSheet. Dezelfde bouw voor één loop (na de training) en
// voor de trend (Je stand).

import { useState } from 'react';
import type { InsightLine, SheetModel } from '../engine/runInsight';
import { RUN_INSIGHT_BACKGROUND } from '../data/runInsightBackground';
import { formatPace } from '../engine/aerobicTrend';
import { formatNumberNL } from '../utils/number';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { TrendLineChart } from './TrendLineChart';
import { Card, Eyebrow, InfoButton, SecondaryButton } from './ui';


function formatter(format: InsightLine['seriesFormat']): (v: number) => string {
  if (format === 'pace') return (v) => formatPace(-v);
  if (format === 'percent') return (v) => `${formatNumberNL(-v, 1)}%`;
  if (format === 'ms') return (v) => `${Math.round(-v)} ms`;
  return (v) => `${Math.round(v)} m per uur`;
}

export function RunInsightSheet({ model, notCompared = [], onClose }: { model: SheetModel; notCompared?: string[]; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  const [open, setOpen] = useState(false);
  const { figures, series } = model;
  const background = RUN_INSIGHT_BACKGROUND[model.topic];
  return (
    <Portal>
      <div className={`fixed inset-0 z-[70] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Waarom: ${model.title}`}>
          <Card className="rounded-b-none border-b-0 pb-8">
            <Eyebrow>{model.title}</Eyebrow>
            <p className="mt-1 font-display text-2xl" style={{ color: 'var(--color-ink)' }}>{model.word}</p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <Figure label={figures.todayLabel} value={figures.today} />
              <Figure label={figures.middleLabel} value={figures.middle} />
              <Figure label="Verschil" value={figures.difference} />
            </div>

            {series.length > 1 && (
              <div className="mt-4">
                <TrendLineChart points={series} color="var(--color-bronze)" height={96} formatValue={formatter(model.seriesFormat)} />
                <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  {series.length > 3 ? 'Je vergelijkingsloopjes met de datum, de laatste is deze.' : 'Van begin tot eind.'}
                </p>
              </div>
            )}

            <Part title="Waarmee vergeleken">
              <p>{model.basis.criteria.join(', ')}.{model.basis.notes.length > 0 ? ` ${model.basis.notes.join(' ')}` : ''}</p>
            </Part>
            <Part title="Hoe sterk is dit?">
              <p>{model.strengthText}</p>
            </Part>
            <Part title="Wat het kan betekenen">
              <p>{model.meaning}</p>
            </Part>

            <div className="mt-5 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
              <Eyebrow>Achtergrond</Eyebrow>
              <InfoButton onClick={() => setOpen((o) => !o)} label={open ? 'Achtergrond verbergen' : 'Achtergrond tonen'} />
            </div>
            {open && (
              <div className="mt-2 flex flex-col gap-4">
                {background.map((part) => (
                  <div key={part.heading} className="flex flex-col gap-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{part.heading}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{part.text}</p>
                    <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{part.evidence}. Bronnen: {part.sources.join(', ')}. Alle bronnen staan bij Meer, Kennis.</p>
                  </div>
                ))}
              </div>
            )}

            {notCompared.length > 0 && (
              <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                Niet te vergelijken: {notCompared.join('; ')}.
              </p>
            )}

            <SecondaryButton className="mt-5 w-full" onClick={requestClose}>Begrepen</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
      <span className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{value}</span>
    </div>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      <Eyebrow>{title}</Eyebrow>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{children}</div>
    </div>
  );
}
