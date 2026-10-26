import { useMemo, useState } from 'react';
import type { SessionLog } from '../../models/training';
import { computeExerciseProgression, listLoggedExercises } from '../../engine/strengthProgression';
import { TrendLineChart } from '../TrendLineChart';
import { Card, Eyebrow } from '../ui';

// Krachtprogressie per oefening: de trend van het zwaarste werkgewicht. Dit hoort bij je stand en
// niet bij een doel; het stond eerst op Ascend (docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md, deel 7).
export function StrengthProgressionCard({ logs }: { logs: SessionLog[] }) {
  const exercises = useMemo(() => listLoggedExercises(logs), [logs]);
  const [selectedId, setSelectedId] = useState<string | undefined>(exercises[0]?.id);
  const activeId = selectedId && exercises.some((e) => e.id === selectedId) ? selectedId : exercises[0]?.id;
  const progression = useMemo(() => (activeId ? computeExerciseProgression(logs, activeId) : []), [logs, activeId]);

  if (exercises.length === 0) return null;

  return (
    <Card>
      <Eyebrow>KRACHTPROGRESSIE</Eyebrow>
      <select
        value={activeId}
        onChange={(e) => setSelectedId(e.target.value)}
        aria-label="Oefening"
        className="mt-2 block min-h-[44px] w-full min-w-0 max-w-full truncate rounded-lg border bg-transparent px-3 py-2 text-sm"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id} style={{ background: 'var(--color-card)' }}>{ex.name}</option>
        ))}
      </select>
      {progression.length >= 2 ? (
        <div className="mt-3">
          <TrendLineChart points={progression} formatValue={(v) => `${v} kg`} />
        </div>
      ) : (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          Nog te weinig trainingen van deze oefening om een trend te tonen.
        </p>
      )}
    </Card>
  );
}
