// ASCEND: de grafiek van één oefening op Forge, in het geschiedenisblad en in een
// opengeklapte rij. De lijn volgt de gekozen kant (1RM of werkgewicht), of de
// herhalingen bij een oefening op herhalingen. De punten komen uit engine/forgeHistory.ts
// en engine/strengthOneRm.ts; hier wordt alleen getekend.

import { useMemo } from 'react';
import { TrendLineChart } from '../TrendLineChart';
import { forgePoints, isRepsBased } from '../../engine/forgeHistory';
import { shortDateNL } from '../../engine/forgeText';
import type { ExerciseView } from '../../engine/strengthHistory';
import { oneRmSeries } from '../../engine/strengthOneRm';
import type { OneRmView } from '../../engine/strengthSettings';
import type { OneRmReading } from '../../models/metrics';
import { formatNumberNL } from '../../utils/number';

const kg = (n: number) => `${formatNumberNL(n, 1)} kg`;

export function ExerciseChart({
  view,
  mode,
  bodyKg,
  today,
  macroFactor,
  height,
}: {
  view: ExerciseView;
  mode: OneRmView;
  bodyKg: number | undefined;
  today: string;
  macroFactor?: OneRmReading[];
  height: number;
}) {
  const exercise = view.history.exercise;
  const repsLed = isRepsBased(view);
  const assisted = exercise?.resistance === 'assisted_bodyweight';
  // De grafiek volgt de gekozen kant. Bij een oefening met hulp is de lijn van het
  // werkgewicht negatief: met je lichaamsgewicht erbij laat ze zien wat je zelf optilt.
  const chart = useMemo(() => {
    if (repsLed) {
      const pts = forgePoints(view, mode).map((p) => ({ label: shortDateNL(p.date, today), value: p.value }));
      return { points: pts, color: 'var(--color-progress)', note: 'De lijn zijn de herhalingen van je beste set.' };
    }
    if (mode === 'work_weight') {
      const pts = forgePoints(view, 'work_weight').map((p) => ({ label: shortDateNL(p.date, today), value: assisted && bodyKg ? bodyKg + p.value : p.value }));
      return { points: pts, color: 'var(--color-action)', note: assisted ? (bodyKg ? 'De lijn laat zien hoeveel je zelf optilt: je lichaamsgewicht min de hulp. Hoger is sterker.' : 'De lijn laat de hulp zien. Hoger op de lijn is minder hulp, dus sterker.') : undefined };
    }
    const own = oneRmSeries(view.points).map((p) => ({ label: shortDateNL(p.date, today), value: p.kg }));
    if (own.length >= 2) return { points: own, color: 'var(--color-progress)', note: undefined };
    const mf = (macroFactor ?? []).map((p) => ({ label: shortDateNL(p.date, today), value: p.kg }));
    return { points: mf, color: 'var(--color-ink-dim)', note: mf.length >= 2 ? 'De lijn is de 1RM van MacroFactor.' : undefined };
  }, [view, mode, repsLed, assisted, bodyKg, macroFactor, today]);


  if (chart.points.length < 2) return <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>De lijn begint na de tweede training.</p>;
  return (
    <div className="font-sans tabular-nums">
      <TrendLineChart points={chart.points} color={chart.color} height={height} formatValue={(v) => (repsLed ? `${Math.round(v)} herh.` : assisted && mode === 'work_weight' && !bodyKg ? `hulp ${kg(Math.abs(v))}` : kg(Math.abs(v)))} />
      {chart.note && <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{chart.note}</p>}
    </div>
  );
}
