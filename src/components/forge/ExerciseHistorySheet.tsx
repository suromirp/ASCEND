// ASCEND: de volledige geschiedenis van een oefening op Forge, in een onderblad
// (Sheet, dus de terugknop sluit het). Bovenaan de grafiek, daaronder elke training
// met de datum, de zwaarste set, het volume en de 1RM van ASCEND en die van
// MacroFactor als die er is. Het rekenwerk staat in engine/forgeHistory.ts.

import { useMemo } from 'react';
import { ExerciseChart } from './ExerciseChart';
import { Sheet } from '../settings/Sheet';
import { historyRows, isRepsBased } from '../../engine/forgeHistory';
import { repsLabel, shortDateNL, topSetText } from '../../engine/forgeText';
import type { ExerciseView } from '../../engine/strengthHistory';
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

  const repsLed = isRepsBased(view);
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
        <ExerciseChart view={view} mode={mode} bodyKg={bodyKg} today={today} macroFactor={macroFactor} height={110} />

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
