// ASCEND: de gekozen lus bijsturen en per stuk bekijken, onder de hoofdknop van het blad Route
// (engine/routeAdjust.ts, besluit 2026-11-14-route-kaart-vervolg.md). Andere kant op, Langer, Korter en
// Terug naar het voorstel; daaronder de stukken met afstand (0,1 km) en hoogtemeters (hele meters). Een tik op
// een stuk legt een rand om dat stuk op de kaart, en Vermijd dit stuk zoekt een lus eromheen. Lukt
// bijsturen niet, dan blijft de lus zoals hij was en zegt één regel waarom. Rendert alleen; plant niets.

import { useState } from 'react';
import type { RouteSearchModel } from './useRouteSearch';
import { pieceLine } from '../engine/routeAdjust';
import { pickTransition } from '../engine/routeSheet';
import { TextButton } from './TextButton';
import { Eyebrow } from './ui';
import { Icon } from './icons';

// Per stuk staat standaard dicht achter één tikregel (Pathfinder): tot tien rijen van 44 px duwden wat er
// gevonden is, Opnieuw zoeken en de bronnen ver naar beneden. `piecesOpen` is voor de test.
export function RouteAdjust({ model, selected, onSelect, motion, piecesOpen = false }: { model: RouteSearchModel; selected: number | undefined; onSelect: (index: number | undefined) => void; motion: 'full' | 'calm' | 'off'; piecesOpen?: boolean }) {
  const [open, setOpen] = useState(piecesOpen);
  const dim = { color: 'var(--color-ink-dim)' };
  const adjusted = model.adjustLine !== '';
  const line = model.adjustFail || model.adjustLine;
  const piece = selected === undefined ? undefined : model.pieces[selected];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <Eyebrow tone="var(--color-ink-dim)">Bijsturen</Eyebrow>
        <div className="flex flex-wrap gap-x-5">
          {model.canReverse && <TextButton tone="dim" onClick={model.reverse}>Andere kant op</TextButton>}
          <TextButton tone="dim" onClick={() => model.stepLength('longer')}>Langer</TextButton>
          <TextButton tone="dim" onClick={() => model.stepLength('shorter')}>Korter</TextButton>
          {adjusted && <TextButton tone="dim" onClick={model.resetAdjust}>Terug naar het voorstel</TextButton>}
        </div>
        {line && <p role="status" className="text-xs leading-snug" style={model.adjustFail ? { color: 'var(--color-ink)' } : dim}>{line}</p>}
      </div>
      {model.pieces.length > 1 && (
        <div className="flex flex-col gap-1">
          <div>
            <TextButton tone="dim" icon="omlaag" flipped={open} aria-expanded={open} onClick={() => { if (open) onSelect(undefined); setOpen(!open); }}>
              {`Per stuk: ${model.pieces.length} stukken`}
            </TextButton>
          </div>
          {open && <ul className="flex flex-col gap-1">
            {model.pieces.map((p) => {
              const on = p.index === selected;
              return (
                <li key={p.index}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(on ? undefined : p.index)}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border px-3 text-left text-sm tabular-nums leading-snug"
                    style={{ borderColor: on ? 'var(--color-ink)' : 'var(--color-card-border)', background: on ? 'var(--color-raised)' : 'transparent', color: 'var(--color-ink)', transition: pickTransition(motion) }}
                  >
                    <span className="min-w-0 flex-1">{pieceLine(p)}</span>
                    {on && <span aria-hidden className="shrink-0"><Icon name="vinkje" size={16} /></span>}
                  </button>
                  {on && piece && (
                    <div className="flex flex-wrap gap-x-5 pl-3">
                      <TextButton tone="dim" onClick={() => { onSelect(undefined); model.avoidStretch(piece); }}>Vermijd dit stuk</TextButton>
                      <TextButton tone="dim" onClick={() => onSelect(undefined)}>Annuleren</TextButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>}
        </div>
      )}
    </div>
  );
}
