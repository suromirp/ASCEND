// Het paneel "Lichter" bij vermoeide benen bovenaan het workoutscherm van Forge (engine/legDayEase.ts).
// Alleen tonen; de keuze bewaart useLegEase en het opnieuw plannen doet ForgeWorkout.tsx.

import { easeFactShort, easeForgeExplain, easeSlots, easeSummary, EASE_STARTED_KEPT_LINE, EASE_STARTED_LINE } from '../../engine/legDayEase';
import type { LegEaseHow } from '../../engine/legEaseSettings';
import type { ExercisePrescription } from '../../models/training';
import { TextButton } from '../TextButton';
import { SecondaryButton } from '../ui';
import type { LegEaseApi, useGuardedSave } from '../useLegEase';

type EaseState = NonNullable<LegEaseApi['state']>;

export function LegEasePanel({ easeState, legEase, guard, easeOn, started, legLine, slots, easeHow, modelEnabled, replan }: {
  easeState: EaseState;
  legEase: LegEaseApi;
  guard: ReturnType<typeof useGuardedSave>;
  easeOn: boolean;
  started: boolean;
  legLine: string | undefined;
  slots: ExercisePrescription[];
  easeHow: LegEaseHow;
  modelEnabled: boolean;
  replan: (on: boolean) => void;
}) {
  const { busy: easeBusy, failed: easeFailed, retry: easeRetry, run: easeRun } = guard;
  return (
    <div className="flex flex-col gap-1">
      {easeState.offer.state === 'eased' && !easeOn ? (
        // Lichter gekozen op Vandaag nadat je hier al begon: de rijen bleven zoals ze waren, dus dat zeggen we.
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{EASE_STARTED_KEPT_LINE}</p>
          <div className="flex"><TextButton tone="dim" size="xs" disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('liever-niet'))}>Begrepen</TextButton></div>
        </>
      ) : easeState.offer.state === 'eased' ? (
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{easeSummary(easeSlots(slots, easeHow))}</p>
          {!started && <div className="flex"><TextButton tone="dim" size="xs" disabled={easeBusy} onClick={() => easeRun(legEase.undo, () => replan(false))}>Terugzetten</TextButton></div>}
        </>
      ) : started ? (
        <>
          {legLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{legLine}</p>}
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{EASE_STARTED_LINE}</p>
          <div className="flex"><TextButton tone="dim" size="xs" disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('liever-niet'))}>Begrepen</TextButton></div>
        </>
      ) : (
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{easeFactShort(easeState.signals)}</p>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>De hele training lichter?</p>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{easeForgeExplain(easeHow, modelEnabled)}</p>
          <div className="flex flex-wrap items-center gap-x-3">
            <div className="flex w-28 shrink-0">
              <SecondaryButton disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('lichter'), () => replan(true))}>Lichter</SecondaryButton>
            </div>
            <TextButton tone="dim" disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('liever-niet'))}>Liever niet</TextButton>
          </div>
        </>
      )}
      {easeFailed && (
        <p className="flex flex-wrap items-center gap-x-3 text-xs leading-snug" role="status" style={{ color: 'var(--color-warning)' }}>
          {easeFailed}
          {easeRetry && <TextButton size="xs" onClick={easeRetry}>Opnieuw</TextButton>}
        </p>
      )}
    </div>
  );
}
