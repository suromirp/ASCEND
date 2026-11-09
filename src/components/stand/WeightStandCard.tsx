import { useMemo, useState } from 'react';
import { Icon } from '../icons';
import { Card, Eyebrow, Num } from '../ui';
import { Sparkline } from './Sparkline';
import { WeightOverviewSheet } from './WeightOverviewSheet';
import { useAppData } from '../../state/AppDataContext';
import { weightsInUse } from '../../engine/bodyWeight';
import { weightCardData, weightCardOn } from '../../engine/weightCard';
import { formatDayMonthNL, todayISO } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';

// Je gewicht op Je stand: de trend groot, de laatste weging klein en een rustige lijn van de laatste
// weken. Een tik opent het overzicht Gewicht (WeightOverviewSheet). Aan of uit met "Gewicht op Je stand" in Instellingen,
// Lichaam (docs/beslissingen/2026-11-09-gewicht-buiten-instellingen.md).
export function WeightStandCard() {
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const entries = useMemo(
    () => weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect),
    [settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect],
  );
  const data = useMemo(() => weightCardData(entries, settings.weightTrend, today), [entries, settings.weightTrend, today]);
  if (!weightCardOn(settings.weightCard, entries) || !data) return null;
  const { latest } = data;
  return (
    <>
      <Card>
        <button onClick={() => setOpen(true)} data-sheet-from className="flex min-h-[56px] w-full items-center justify-between gap-3 text-left" aria-label="Gewicht, open het overzicht">
          <span className="min-w-0 flex-1">
            <Eyebrow as="span">{data.isTrend ? 'Gewicht, trend' : 'Gewicht'}</Eyebrow>
            <span className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}><Num>{formatNumberNL(data.kg, 1)}</Num></span>
              <span className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>kg</span>
            </span>
            <span className="mt-1 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              <Num>{`Laatste weging ${formatNumberNL(latest.kg, 1)} kg, ${formatDayMonthNL(latest.date).replace(' ', '\u00a0')}`}</Num>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {data.points.length >= 2 && <span className="block w-24"><Sparkline points={data.points} height={36} /></span>}
            <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </span>
        </button>
      </Card>
      {open && <WeightOverviewSheet onClose={() => setOpen(false)} />}
    </>
  );
}
