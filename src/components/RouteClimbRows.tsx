// ASCEND: de delen van het Route-blok voor hoogtemeters (I-160), los van RoutePanel.tsx zodat het paneel
// alleen de delen plaatst. De keuze Hoogtemeters halen of Afstand houden (met de som), de rij Buiten plus een
// helling, trap of de loopband, en de amberregel als de kaart van de omgeving ontbrak, met Opnieuw proberen.
// Rekent niets: alles komt uit engine/routeClimbPlan.ts en engine/routeSheet.ts via useRouteSearch.

import { Link } from 'react-router-dom';
import type { LoopPriority } from '../engine/routePlanner';
import type { LoopChoiceRow, OutdoorPlus } from '../engine/routeClimbPlan';
import { pickTransition } from '../engine/routeSheet';
import { TextButton } from './TextButton';
import { Icon } from './icons';
import { Eyebrow } from './ui';

const dim = { color: 'var(--color-ink-dim)' };

// Twee rijen om te kiezen, zoals de lussen: de gekozen met een rand in inkt en een vinkje. Het advies staat erbij.
export function RouteLoopChoice({ rows, onPick, motion }: { rows: LoopChoiceRow[]; onPick: (p: LoopPriority) => void; motion: 'full' | 'calm' | 'off' }) {
  if (rows.length === 0) return null;
  return (
    <div role="group" aria-label="Hoogtemeters of afstand" className="flex flex-col gap-2">
      {rows.map((r) => (
        <button
          key={r.priority}
          type="button"
          aria-pressed={r.picked}
          onClick={() => onPick(r.priority)}
          className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left"
          style={{ borderColor: r.picked ? 'var(--color-ink)' : 'var(--color-card-border)', background: r.picked ? 'var(--color-raised)' : 'transparent', transition: pickTransition(motion) }}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{r.label}{r.advised ? <span style={dim}> · Advies</span> : null}</span>
            <span className="block text-sm tabular-nums leading-snug" style={dim}>{r.sum}</span>
          </span>
          {r.picked && <span className="shrink-0" style={{ color: 'var(--color-ink)' }} aria-hidden><Icon name="vinkje" size={18} /></span>}
        </button>
      ))}
    </div>
  );
}

// De derde rij: geen keuze om te tikken maar een voorstel met de som; de plek opent de gids Trainingsplekken.
export function RouteOutdoorPlus({ plus }: { plus: OutdoorPlus & { href: string } }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)' }}>
      <Eyebrow tone="var(--color-ink-dim)">{plus.title}</Eyebrow>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{plus.facts}</p>
      <p className="text-sm tabular-nums leading-snug" style={dim}>{plus.sum}</p>
      {plus.kind === 'spot'
        ? <p className="text-sm leading-snug" style={dim}>{plus.spotLine}</p>
        : <p className="text-sm leading-snug" style={dim}>{plus.noSpotLine}</p>}
      <p className="text-xs leading-snug" style={dim}>{plus.info}</p>
      <Link to={plus.href} className="inline-flex min-h-[44px] items-center text-sm underline underline-offset-2" style={{ color: 'var(--color-ink)' }}>Trainingsplekken</Link>
    </div>
  );
}

// Bovenaan, in amber: de kaart van de omgeving ontbrak. Opnieuw proberen haalt alleen die kaart opnieuw op,
// met een grens in tijd; tijdens het wachten staat de knop uit en zegt de regel dat.
export function RouteMapMissing({ line, busy, onRetry }: { line: string; busy: boolean; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-0">
      <p role="status" className="text-sm leading-snug" style={{ color: 'var(--color-warning)' }}>{line}</p>
      <TextButton tone="dim" style={{ color: 'var(--color-ink)' }} disabled={busy} onClick={onRetry}>Opnieuw proberen</TextButton>
    </div>
  );
}
