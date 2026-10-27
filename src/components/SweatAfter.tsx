import { useState } from 'react';
import { formatNumberNL } from '../utils/number';
import { NumberField } from './NumberField';
import { TextButton } from './TextButton';
import { Eyebrow } from './ui';
import type { SweatAfterState } from './useSweatAfter';

// De rij zelf. `showHeading` is uit als de omringende kaart het kopje al heeft.
export function SweatAfterRow({ sweat, showHeading = true }: { sweat: SweatAfterState; showHeading?: boolean }) {
  const [more, setMore] = useState(false);
  const [editBefore, setEditBefore] = useState(false);
  if (!sweat.show) return null;
  const showBefore = !sweat.preKnown || editBefore;

  return (
    <div className="flex flex-col gap-3" aria-label="Zweetverlies">
      {showHeading && <Eyebrow>Zweetverlies</Eyebrow>}
      {sweat.preKnown && !editBefore && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
            Gewicht voor: {sweat.before !== undefined ? `${formatNumberNL(sweat.before, 1)} kg` : ''}
          </p>
          <TextButton tone="dim" onClick={() => setEditBefore(true)}>Wijzig</TextButton>
        </div>
      )}
      {showBefore && <NumberField tall label="Gewicht voor (kg)" value={sweat.before} onChange={sweat.setBefore} unit="kg" decimals={1} />}
      <NumberField tall label={showHeading ? "Gewicht na (kg)" : "Zweetverlies: gewicht na (kg)"} value={sweat.after} onChange={sweat.setAfter} unit="kg" decimals={1} helper="Weeg jezelf zonder kleren, na het plassen." />
      {more && (
        <>
          <NumberField tall label="Gedronken onderweg" value={sweat.drank} onChange={sweat.setDrank} unit="ml" />
          <NumberField tall label="Geplast tijdens de training" value={sweat.pee} onChange={sweat.setPee} unit="ml" />
          <NumberField tall label="Schatting van je horloge" value={sweat.watch} onChange={sweat.setWatch} unit="ml" helper="Alleen als je niet woog. Een eigen weging gaat voor." />
        </>
      )}
      <div>
        <TextButton tone="dim" icon="omlaag" flipped={more} onClick={() => setMore((m) => !m)} aria-expanded={more}>
          {more ? 'Minder' : 'Meer'}
        </TextButton>
      </div>
      {sweat.result && <p role="status" className="text-sm" style={{ color: 'var(--color-ink)' }}>{sweat.result}</p>}
      {!sweat.result && sweat.hasNumbers && (
        <p role="status" className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Hier kan ASCEND nog geen zweetverlies van maken. Het kan ook later in het Logboek, bij de training.
        </p>
      )}
      {sweat.note && <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>{sweat.note}</p>}
    </div>
  );
}
