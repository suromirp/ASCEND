import { useState } from 'react';
import {
  MEASURES,
  MEASURE_LABEL,
  MEASURE_SUBTITLE,
  MEASURE_UNIT,
  countLine,
  decimalsFor,
  hasAnythingToShow,
  recordedCounts,
  scaleFor,
  shownFor,
  signed,
  tooFewLine,
  type InfluenceMeasure,
  type ReasonEffect,
} from '../../engine/influenceEffects';
import { useAppData } from '../../state/AppDataContext';
import { Card, Chip, Eyebrow } from '../ui';
import { usePageState } from '../usePageState';
import { InfluenceEffectSheet } from './InfluenceEffectSheet';
import { InfluenceStrip, StripLegend } from './InfluenceStrip';
import { useInfluenceEffects } from './useInfluenceEffects';

// Je stand, onderaan: "Wat doet dit met je?". Per meting de redenen die je minstens 3 keer
// vastlegde, op één schaal, met per keer een punt tegenover je eigen normale schommeling.
// Staat er nog niets vastgelegd, of staat de kaart uit (Instellingen, Lichaam), dan is de
// kaart er niet. Geen voortgangsbalk en geen telling als opdracht.
// Ontwerp: Invloeden ASCEND, bord 3a en 3c; besluit docs/beslissingen/2026-10-25-wat-speelde-er.md.

export function InfluenceCard() {
  const { settings } = useAppData();
  const { entries, all, effects } = useInfluenceEffects();
  const [chosen, setChosen] = usePageState<InfluenceMeasure | null>('invloed-meting', null, (v) => v === null || MEASURES.includes(v as InfluenceMeasure));
  const [open, setOpen] = useState<string | null>(null);

  if (settings.influenceOverview === false) return null;
  // Facts ASCEND knows count by themselves. With only facts and no note of your own there is
  // nothing to ask for: no empty state, the card shows once there is something to show.
  const recorded = recordedCounts(entries);
  const ownNotes = recorded.length > 0;
  if (!ownNotes && !hasAnythingToShow(effects)) return null;

  const title = <h2 className="font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>Wat doet dit met je?</h2>;

  if (!hasAnythingToShow(effects)) {
    return (
      <section className="flex flex-col gap-2" aria-label="Wat speelde er">
        <Eyebrow>Wat speelde er</Eyebrow>
        <Card className="flex flex-col gap-3">
          {title}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            Leg bij een training of een dag in het logboek vast wat er speelde. Vanaf 3 keer per reden zie je hier wat het doet met je rusthartslag, HRV, slaap en trainingen.
          </p>
          <div className="flex flex-col gap-1">
            <svg viewBox="0 0 300 28" className="block w-full" aria-hidden>
              <rect x="90" y="6" width="120" height="16" rx="8" fill="var(--color-track)" />
              <line x1="150" x2="150" y1="3" y2="25" stroke="var(--color-card-border)" strokeWidth="1" />
            </svg>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Per keer een punt, tegenover je normale schommeling.</p>
          </div>
          <div className="flex flex-col">
            <Eyebrow>Tot nu toe vastgelegd</Eyebrow>
            {recorded.map((c, i) => (
              <div key={c.group.key} className={`flex min-h-[44px] items-center justify-between gap-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-card-border)' }}>
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{c.group.name}</span>
                <span className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{c.count} keer</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    );
  }

  const first = MEASURES.find((m) => shownFor(effects, m).length > 0) ?? 'restingHr';
  const measure = chosen ?? first;
  const rows = shownFor(effects, measure);
  const scale = scaleFor(rows);
  const few = tooFewLine(entries);

  return (
    <section className="flex flex-col gap-2" aria-label="Wat speelde er">
      <Eyebrow>Wat speelde er</Eyebrow>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          {title}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            Wat speelde er bij een training of dag, uit je logboek en wat je vastlegde. Tegen je eigen normale schommeling, vanaf 3 keer.
          </p>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Meting kiezen">
          {MEASURES.map((m) => (
            <span key={m} className="shrink-0 whitespace-nowrap"><Chip selected={measure === m} onClick={() => setChosen(m)}>{MEASURE_LABEL[m]}</Chip></span>
          ))}
        </div>

        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{MEASURE_SUBTITLE[measure]}</p>
        <StripLegend />

        {rows.length === 0 ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Bij deze meting heeft nog geen reden 3 keer. Kies een andere meting, of kijk later nog eens.</p>
        ) : (
          <div className="flex flex-col">
            {rows.map((e, i) => (
              <Row key={e.group.key} effect={e} scale={scale} first={i === 0} onOpen={() => setOpen(e.group.key)} />
            ))}
          </div>
        )}

        {few && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{few}</p>}
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Een gemiddelde over een paar keer, geen bewijs. Tik op een reden voor HRV, slaap en je trainingen.
        </p>
      </Card>
      {open && <InfluenceEffectSheet groupKey={open} entries={all} own={entries} effects={effects} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Row({ effect, scale, first, onOpen }: { effect: ReasonEffect; scale: number; first: boolean; onOpen: () => void }) {
  const decimals = decimalsFor(effect.measure);
  const rounded = Math.round(effect.meanDiff * 10 ** decimals) / 10 ** decimals;
  const unit = MEASURE_UNIT[effect.measure][Math.abs(rounded) === 1 ? 'one' : 'many'];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-[44px] w-full flex-col gap-1 py-3 text-left ${first ? 'pt-0' : 'border-t'}`}
      style={{ borderColor: 'var(--color-card-border)' }}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{effect.group.name}</span>
        <span className="shrink-0 whitespace-nowrap">
          <span className="font-sans text-xl font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{signed(effect.meanDiff, decimals)}</span>
          <span className="ml-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{unit}</span>
        </span>
      </span>
      <InfluenceStrip effect={effect} scale={scale} />
      <span className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{countLine(effect)}</span>
    </button>
  );
}
