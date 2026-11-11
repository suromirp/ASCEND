// ASCEND: het verloop van een training in Forge, als blad. Alleen tonen; wat er in staat is afgeleid in
// engine/forgeLog.ts (`linesPerSet`): per set een regel met het eindresultaat en alle redenen in een zin.
// Tijdens de training komen de sets uit `workout`; in het logboek uit de gelogde sets (`logged`).
// Besluiten: docs/beslissingen/2026-10-28-forge-logboek.md, docs/beslissingen/2026-11-11-forge-verloop.md.

import { linesPerSet, resolveForgeLogView, stateText, type ExerciseLines, type ForgeEvent, type ForgeLogView, type SetLine } from '../../engine/forgeLog';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import type { ExerciseSetLog } from '../../models/training';
import { useAppData } from '../../state/useAppData';
import { useSheetClose } from '../../utils/useSheetClose';
import { formatNumberNL } from '../../utils/number';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Card, Segmented, SheetGrip } from '../ui';
import { RirBubble } from './parts';

const VIEWS: { value: ForgeLogView; label: string }[] = [
  { value: 'wijzigingen', label: 'Wijzigingen' },
  { value: 'alle', label: 'Alle sets' },
];

function result(l: SetLine): string {
  if (l.seconds !== undefined) return `${l.kg !== undefined && l.kg !== 0 ? `${stateText({ kg: l.kg })} × ` : ''}${formatNumberNL(l.seconds, 0)} s`;
  return stateText({ kg: l.kg, reps: l.reps });
}

function Line({ l }: { l: SetLine }) {
  const text = result(l);
  const dim = l.removed || l.done === false;
  return (
    <li className="flex gap-3 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
      <span className="w-12 shrink-0 font-sans text-sm tabular-nums leading-6" style={{ color: 'var(--color-ink-dim)' }}>{l.warmup ? l.set : `Set ${l.set}`}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-sm tabular-nums leading-6" style={{ color: dim ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
          {l.removed ? <span>Weggehaald</span> : text ? <span className={l.heaviest ? 'font-semibold' : undefined}>{text}</span> : null}
          {!l.removed && l.rir !== undefined && (
            <RirBubble rir={l.rir} hint={l.rirAssumed} label={l.rirAssumed ? `${l.rir} over, het doel, niet zelf gekozen` : `${l.rir} over`} />
          )}
          {l.heaviest && <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>zwaarste set</span>}
          {!l.removed && l.done === false && <span className="text-xs">nog niet afgevinkt</span>}
        </p>
        {l.reason && (
          <p className="mt-1 text-xs leading-snug" style={{ color: l.open ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>
            {l.open ? `Nog niet opgelost. ${l.reason}` : l.reason}
          </p>
        )}
      </div>
    </li>
  );
}

function ForgeLogList({ groups, view }: { groups: ExerciseLines[]; view: ForgeLogView }) {
  if (groups.length === 0) {
    return (
      <p className="mt-4 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        {view === 'wijzigingen' ? 'Geen wijzigingen. Alles ging volgens schema; Alle sets toont elke set.' : 'Nog geen sets.'}
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-col">
      {groups.map((g) => (
        <section key={g.exerciseId} className="mt-3">
          <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{g.exercise}</h3>
          <ol className="mt-1 flex flex-col">
            {g.lines.map((l) => <Line key={l.key} l={l} />)}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function ForgeLogSheet({ events, workout, logged, eyebrow = 'Forge', title = 'Verloop van de training', onClose }: {
  events: ForgeEvent[];
  workout?: WorkoutExercise[];
  // In het logboek: de gelogde sets van deze training.
  logged?: ExerciseSetLog[];
  eyebrow?: string;
  title?: string;
  onClose: () => void;
}) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const { settings, updateSettings } = useAppData();
  const view = resolveForgeLogView(settings);
  const groups = linesPerSet(events, { workout, logged, view });
  return (
    <Portal>
      <div className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={title} className={`relative max-h-[85dvh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={title} onClose={requestClose} /></div>
            <div className="mt-3">
              <Segmented tall options={VIEWS} value={view} label="Verloop toont" onChange={(v) => void updateSettings({ forgeLogView: v })} />
            </div>
            <ForgeLogList groups={groups} view={view} />
          </Card>
        </div>
      </div>
    </Portal>
  );
}
