import type { WeekDescent } from '../../engine/standing';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';
import { dayMonth, roundedTop } from './chartParts';

// Je stand → descent: metres down per week. Bergaf is what makes legs sore
// on a mountain trip, and in the Netherlands there is little of it, so this
// is mostly a reminder that the stairs and the hills-up-and-down count.

const W = 320;
const H = 96;
const BOTTOM = 20;

export function DescentCard({ weeks, routeDayDescent }: { weeks: WeekDescent[]; routeDayDescent?: number }) {
  const max = Math.max(1, ...weeks.map((w) => w.metres));
  const slot = W / weeks.length;
  const barW = Math.min(22, slot * 0.55);
  const plotH = H - BOTTOM - 14;
  const biggest = Math.max(0, ...weeks.map((w) => w.biggestDay));
  const last4 = weeks.slice(-4).reduce((n, w) => n + w.metres, 0);
  // Nothing measured at all: one line instead of an empty chart with axes.
  if (weeks.every((w) => w.metres <= 0)) {
    return (
      <Card className="flex flex-col gap-1">
        <Eyebrow>DALEN</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog geen dalingen gemeten</p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>DALEN</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Meters bergaf per week. Dalen geeft de meeste spierpijn op een bergtocht; je benen wennen eraan door het te blijven doen.
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Meters bergaf de laatste ${weeks.length} weken, samen ${formatNumberNL(weeks.reduce((n, w) => n + w.metres, 0), 0)}`}>
        {weeks.map((w, i) => {
          const h = (w.metres / max) * plotH;
          const x = i * slot + (slot - barW) / 2;
          return (
            <g key={w.weekStart}>
              {w.metres > 0 && <path d={roundedTop(x, 14 + plotH - h, barW, h, 4)} fill="var(--color-progress)" />}
              {w.metres > 0 && h > 16 && <text x={x + barW / 2} y={14 + plotH - h - 3} textAnchor="middle" fontSize={12} fill="var(--color-ink-dim)">{formatNumberNL(w.metres, 0)}</text>}
              {(slot >= 44 || (weeks.length - 1 - i) % 2 === 0) && (
                <text x={i * slot + slot / 2} y={H - 5} textAnchor="middle" fontSize={12} fill="var(--color-ink-dim)">{i === weeks.length - 1 ? 'nu' : dayMonth(w.weekStart)}</text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={14 + plotH} y2={14 + plotH} stroke="var(--color-card-border)" strokeWidth={1} />
      </svg>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        {last4 === 0
          ? 'De laatste vier weken geen meters bergaf vastgelegd.'
          : <>De laatste vier weken <span className="tabular-nums">{formatNumberNL(last4, 0)}</span> meter bergaf, het meest op één dag <span className="tabular-nums">{formatNumberNL(biggest, 0)}</span> meter.</>}
        {routeDayDescent ? <> Een gewone GR5-dag gaat zo'n <span className="tabular-nums">{formatNumberNL(routeDayDescent, 0)}</span> meter omlaag.</> : null}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        In Nederland zijn dalen schaars. De trap, de training Heuvelsprints en afdalen en de Amerongse Berg tellen allemaal. Op de loopband daal je niet.
      </p>
    </Card>
  );
}
