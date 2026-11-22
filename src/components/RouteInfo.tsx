// ASCEND: wat er bij de gekozen lus staat: terug voor het donker, het hoogteprofiel, de ondergrond en waar je
// kunt afhaken (engine/routeInfo.ts, besluit 2026-11-22-route-info.md). Het component rekent niets: de
// engine geeft regels en een lijn, dit tekent ze. Alles komt uit de lus zelf; er gaat niets de deur uit.
// Het profiel is geen mint (dat is de lus op de kaart): rustig inkt, en amber voor het steile stuk. Geen beweging.

import { useState } from 'react';
import type { RouteProposal, RouteTarget } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { backLine, bailLine, bailPoint, elevationProfile, loopDurationMin, surfaceLine } from '../engine/routeInfo';
import { loopMinutes } from '../engine/routePlanner';
import { roundStart } from '../engine/routeTarget';
import { todayISO } from '../utils/dates';

const dim = { color: 'var(--color-ink-dim)' };

function utcOffsetOn(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return -new Date(y, m - 1, d, 12).getTimezoneOffset();
}

// `compact`: de Briefing, met de kaart in de lagere stand boven de vouw: alleen de regels, zonder profiel en ondergrond.
export function RouteInfo({ proposal, target, paceSecKm, date, compact = false }: { proposal: RouteProposal; target: RouteTarget; paceSecKm: number | undefined; date: string; compact?: boolean }) {
  const { settings } = useAppData();
  const [now] = useState(() => new Date());
  const start = proposal.points[0];
  const back = start
    ? backLine({
      date,
      today: todayISO(),
      nowMin: now.getHours() * 60 + now.getMinutes(),
      durationMin: loopDurationMin(proposal, paceSecKm, loopMinutes(proposal, target)),
      place: roundStart(start),
      utcOffsetMin: utcOffsetOn(date),
      enabled: settings.routeBackBeforeDark !== false,
    })
    : undefined;
  const profile = compact ? undefined : elevationProfile(proposal);
  const surface = compact ? undefined : surfaceLine(proposal.points);
  const bail = bailLine(bailPoint(proposal));
  if (!back && !profile && !surface && !bail) return null;

  return (
    <div className="flex flex-col gap-1">
      {profile?.kind === 'profile' && (
        <svg
          viewBox={`0 0 ${profile.width} ${profile.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Hoogteprofiel van de lus. ${profile.line}`}
          className="block w-full"
          style={{ height: profile.height }}
        >
          {profile.segments.map((s, i) => (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={s.steep ? 'var(--color-warning)' : 'var(--color-ink-dim)'}
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      )}
      {profile && <p className="text-xs leading-snug" style={dim}>{profile.line}</p>}
      {surface && <p className="text-xs leading-snug" style={dim}>{surface}</p>}
      {bail && <p className="text-xs leading-snug" style={dim}>{bail}</p>}
      {back && <p className="text-xs leading-snug" style={dim}>{back}</p>}
    </div>
  );
}
