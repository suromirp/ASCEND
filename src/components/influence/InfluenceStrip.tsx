import { describeEffect, type ReasonEffect } from '../../engine/influenceEffects';

// De ene grafiek van "Wat speelde er", overal dezelfde: per keer een punt tegenover je eigen
// normale schommeling (de band). Amber is een keer erbuiten, gedempt een keer erbinnen, het
// driehoekje in de inktkleur is het gemiddelde. Alle strookjes van één meting staan op dezelfde
// schaal, zodat je ze naast elkaar kunt leggen. Geen tekst in de grafiek zelf.

const W = 300;
const H = 28;
const PAD = 8;
const MID = H / 2;

export function InfluenceStrip({ effect, scale, label }: { effect: ReasonEffect; scale: number; label?: string }) {
  const x = (v: number) => W / 2 + (Math.max(-scale, Math.min(scale, v)) / scale) * (W / 2 - PAD);
  const bandLeft = x(-effect.halfBand);
  const bandRight = x(effect.halfBand);
  const mean = x(effect.meanDiff);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={label ?? describeEffect(effect)}>
      <rect x={bandLeft} y={MID - 8} width={Math.max(bandRight - bandLeft, 2)} height={16} rx={8} fill="var(--color-track)" />
      <line x1={W / 2} x2={W / 2} y1={MID - 11} y2={MID + 11} stroke="var(--color-card-border)" strokeWidth={1} />
      {effect.points.map((p, i) => (
        <circle key={`${p.date}-${i}`} cx={x(p.diff)} cy={MID} r={4} fill={p.outside ? 'var(--color-warning)' : 'var(--color-ink-dim)'} fillOpacity={p.outside ? 1 : 0.8} />
      ))}
      <path d={`M${mean - 5} ${H - 1} L${mean + 5} ${H - 1} L${mean} ${H - 8} Z`} fill="var(--color-ink)" />
    </svg>
  );
}

// De uitleg van de tekens, één keer per kaart.
export function StripLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-5 rounded-full" style={{ background: 'var(--color-track)' }} aria-hidden />
        je normale schommeling
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-warning)' }} aria-hidden />
        keer erbuiten
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-ink-dim)' }} aria-hidden />
        erbinnen
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden>
          <path d="M0 8 L10 8 L5 0 Z" fill="var(--color-ink)" />
        </svg>
        gemiddeld
      </span>
    </div>
  );
}
