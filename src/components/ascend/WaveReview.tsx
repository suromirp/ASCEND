import type { WaveReviewCard as Review, WaveReviewChoice } from '../../engine/waveReviewCard';
import { Card, Eyebrow, SecondaryButton } from '../ui';
import { TextButton } from '../TextButton';

// De terugblik na een golf op de Ascend-tab (docs/visie/Zonder doel.md, 2.5): het oordeel, twee feiten
// en de vraag wat nu. Geen gevulde knop, want de ring van Je week is het accent van het scherm. Geen
// rekenwerk hier, het komt uit engine/waveReviewCard.ts.
export function WaveReviewCard({ review, busy, onChoose }: { review: Review; busy: boolean; onChoose: (choice: WaveReviewChoice) => void }) {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>Golf klaar</Eyebrow>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{review.title}</p>
      </div>
      <div className="flex flex-col gap-1">
        {review.facts.map((f) => <p key={f} className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{f}</p>)}
      </div>
      <p className="text-base" style={{ color: 'var(--color-ink)' }}>Wat nu?</p>
      <div className="flex flex-col gap-2">
        <SecondaryButton disabled={busy} onClick={() => onChoose('again')}>Nog een golf</SecondaryButton>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{review.againLine}</p>
        <SecondaryButton disabled={busy} onClick={() => onChoose('easier')}>Rustiger aan</SecondaryButton>
        <div className="-mb-2">
          <TextButton disabled={busy} onClick={() => onChoose('goal')}>Een doel kiezen</TextButton>
        </div>
      </div>
    </Card>
  );
}
