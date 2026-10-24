// ASCEND: de volledige geschiedenis van een oefening op Forge, in een onderblad
// (Sheet, dus de terugknop sluit het). Bovenaan de grafiek, daaronder elke training
// met de datum, de zwaarste set, het volume en de 1RM van ASCEND en die van
// MacroFactor als die er is. Het rekenwerk staat in engine/forgeHistory.ts.

import { useMemo } from 'react';
import { TrendLineChart } from '../TrendLineChart';
import { Sheet } from '../settings/Sheet';
import { forgePoints, historyRows, isRepsBased } from '../../engine/forgeHistory';
import { repsLabel, shortDateNL, topSetText } from '../../engine/forgeText';
import type { ExerciseView } from '../../engine/strengthHistory';
import { oneRmSeries } from '../../engine/strengthOneRm';
import type { OneRmView } from '../../engine/strengthSettings';
import type { OneRmReading } from '../../models/metrics';
import { formatNumberNL } from '../../utils/number';

const kg = (n: number) => `${formatNumberNL(n, 1)} kg`;

export function ExerciseHistorySheet({
  view,
  mode,
  bodyKg,
  today,
  macroFactor,
  onClose,
}: {
  view: ExerciseView;
  mode: OneRmView;
  bodyKg: number | undefined;
  today: string;
  // De 1RM van deze oefening uit de MacroFactor-export, oudste eerst; leeg als er geen is of de regel uit staat.
  macroFactor?: OneRmReading[];
  onClose: () => void;
}) {
  const { history } = view;
  const exercise = history.exercise;
  const rows = useMemo(() => historyRows(view, macroFactor), [view, macroFactor]);
  const hasMacroFactor = rows.some((r) => r.macroFactorKg !== undefined);

  // De grafiek volgt de gekozen kant. Bij een oefening met hulp is de lijn van het
  // werkgewicht negatief: met je lichaamsgewicht erbij laat ze zien wat je zelf optilt.
  const repsLed = isRepsBased(view);
  const assisted = exercise?.resistance === 'assisted_bodyweight';
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

  const oldest = rows[rows.length - 1];
  const newest = rows[0];

  return (
    <Sheet
      eyebrow="Geschiedenis"
      title={history.name}
      line={rows.length > 0 ? `${rows.length} ${rows.length === 1 ? 'training' : 'trainingen'}, van ${shortDateNL(oldest.date, today)} tot ${shortDateNL(newest.date, today)}.` : undefined}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 pb-4">
        {chart.points.length >= 2 ? (
          <div className="font-sans tabular-nums">
            <TrendLineChart points={chart.points} color={chart.color} height={110} formatValue={(v) => (repsLed ? `${Math.round(v)} herh.` : assisted && mode === 'work_weight' && !bodyKg ? `hulp ${kg(Math.abs(v))}` : kg(Math.abs(v)))} />
            {chart.note && <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{chart.note}</p>}
          </div>
        ) : (
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>De lijn begint na de tweede training.</p>
        )}

        <div className="flex flex-col">
          {rows.map((r) => {
            const top = repsLed ? (r.bestReps !== undefined ? repsLabel(r.bestReps) : undefined) : topSetText(exercise, r.topWeightKg, r.topReps);
            return (
              <div key={r.logId} className="flex flex-col gap-1 border-t py-3" style={{ borderColor: 'var(--color-card-border)' }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-sans text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{shortDateNL(r.date, today)}</span>
                    <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{r.trainingName}</span>
                  </span>
                  {top && (
                    <span className="shrink-0 text-right">
                      <span className="block font-sans text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{top}</span>
                      <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{repsLed ? 'beste set' : 'zwaarste set'}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                  {r.totalReps !== undefined && <span>Totaal {repsLabel(r.totalReps)}</span>}
                  {repsLed && r.topWeightKg !== undefined && <span>Met {formatNumberNL(r.topWeightKg, 1)} kg</span>}
                  {r.volumeKg !== undefined && <span>Volume {formatNumberNL(r.volumeKg, 0)} kg</span>}
                  <span>{r.workSetCount} {r.workSetCount === 1 ? 'werkset' : 'werksets'}</span>
                  {r.ascendKg !== undefined && <span>1RM ASCEND {kg(r.ascendKg)}</span>}
                  {r.macroFactorKg !== undefined && <span>1RM MacroFactor {kg(r.macroFactorKg)}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {!repsLed && !hasMacroFactor && macroFactor !== undefined && macroFactor.length > 0 && (
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>MacroFactor heeft geen 1RM op de dagen van deze trainingen.</p>
        )}
      </div>
    </Sheet>
  );
}
