// ASCEND: "Zo zet je het op je horloge". Genummerde stappen uit engine/watchFields.ts#watchSteps, daaronder
// de aantekeningen gedempt. Alleen tekenen.

import type { WatchAdvice } from '../../engine/watchFields';
import { watchSteps } from '../../engine/watchFields';
import type { WatchModel } from '../../data/watchModels';
import { Card, Eyebrow } from '../ui';

export function WatchStepsCard({ pages, model, advice }: { pages: readonly (readonly string[])[]; model: WatchModel; advice?: WatchAdvice }) {
  const { steps, notes } = watchSteps(pages, model, advice);
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Zo zet je het op je horloge</Eyebrow>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            <span className="w-5 shrink-0 tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
        {notes.map((note) => (
          <p key={note} className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
        ))}
      </div>
    </Card>
  );
}
