import { useRef, useState } from 'react';
import { SecondaryButton } from './ui';
import { DayRow } from './vandaag/DayRow';
import { TodaySheet } from './vandaag/TodaySheet';

// Phase 6 — the Adaptive Replanner's passive one-line summary (v0.1 §11.3:
// "never a popup for every small shift"). Purely informational: the
// forecast-range change it describes has already been applied — this is
// not a proposal awaiting confirmation the way RescheduleDialog is for the
// committed range, just a quiet, dismissible note about what changed.
//
// Regel 6 (besluit 2026-11-12-missiekaart.md): een melding is één rij met een pijltje, direct onder de missie, zodat je
// ziet dat je week veranderde zonder te scrollen. Wat er veranderde en Begrepen staan in het blad.
const FORECAST_ROW_TITLE = 'Komende weken bijgesteld';

export function ForecastAdjustmentBanner({ summary, onDismiss }: { summary: string; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  // Begrepen haalt de melding pas weg als het blad dicht is, zodat het blad netjes uitschuift.
  const dismissAfterClose = useRef(false);
  return (
    <>
      <ol aria-label={FORECAST_ROW_TITLE} className="overflow-hidden rounded-2xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
        <DayRow label="Planning" icon="week" onClick={() => setOpen(true)} sheetFrom>{FORECAST_ROW_TITLE}</DayRow>
      </ol>
      {open && (
        <TodaySheet eyebrow="Planning" title={FORECAST_ROW_TITLE} onClose={() => { setOpen(false); if (dismissAfterClose.current) onDismiss(); }}>
          {(close) => (
            <div className="flex flex-col gap-4">
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-ink)' }}>{summary}</p>
              <SecondaryButton onClick={() => { dismissAfterClose.current = true; close(); }}>Begrepen</SecondaryButton>
            </div>
          )}
        </TodaySheet>
      )}
    </>
  );
}
