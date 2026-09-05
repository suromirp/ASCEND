import { Card, SecondaryButton, Eyebrow } from './ui';

// Phase 6 — the Adaptive Replanner's passive one-line summary (v0.1 §11.3:
// "never a popup for every small shift"). Purely informational: the
// forecast-range change it describes has already been applied — this is
// not a proposal awaiting confirmation the way RescheduleDialog is for the
// committed range, just a quiet, dismissible note about what changed.
export function ForecastAdjustmentBanner({ summary, onDismiss }: { summary: string; onDismiss: () => void }) {
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>SCHEMA-AANPASSING — VERVOLGWEKEN</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{summary}</p>
      <SecondaryButton onClick={onDismiss} className="mt-1">BEGREPEN</SecondaryButton>
    </Card>
  );
}
