// Het voorstel onder de rij van een ladder op de kaart Calisthenics algemeen: zet de eerste passende stap in één
// krachttraining (engine/ladderAddProposal.ts, useLadderAddProposal.ts). Alleen weergave. Liever niet links, Akkoord
// rechts; na Akkoord Ongedaan maken. Verschijnt met mx-row-in: in Rustig en Uit meteen op de eindstand.
// Besluit: docs/beslissingen/2026-11-26-calisthenics-voorstel-benen-en-romp.md.

import type { ladderAddText } from '../../engine/ladderAddProposal';
import { TextButton } from '../TextButton';
import { SecondaryButton } from '../ui';
import type { LadderAddState } from './useLadderAddProposal';

export function LadderAddNotice({ text, state, onAccept, onDecline, onUndo }: {
  text: ReturnType<typeof ladderAddText>;
  state: LadderAddState;
  onAccept: () => void;
  onDecline: () => void;
  onUndo: () => void;
}) {
  const ink = { color: 'var(--color-ink)' };
  const warn = { color: 'var(--color-warning)' };
  const decided = state === 'done' || state === 'undoing' || state === 'undoFailed';
  return (
    <div className="mx-row-in mt-2 flex flex-col gap-1.5" role="group" aria-label="Voorstel voor je training" data-testid="algemeen-ladder-voorstel">
      {state === 'undone' ? (
        <p role="status" className="text-sm leading-relaxed" style={ink}>{text.undone}</p>
      ) : decided ? (
        <>
          <p role="status" className="text-sm leading-relaxed" style={ink}>{text.done}</p>
          {state === 'undoFailed' && <p role="status" className="text-xs" style={warn}>Ongedaan maken lukte niet op tijd. Probeer het nog eens.</p>}
          <div className="-mb-1">
            <TextButton tone="dim" disabled={state === 'undoing'} onClick={onUndo}>Ongedaan maken</TextButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed" style={ink}>{text.question}</p>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{text.dose}</p>
          {state === 'failed' && <p role="status" className="text-xs" style={warn}>Opslaan lukte niet op tijd. Probeer het nog eens; je plan is niet veranderd.</p>}
          <div className="mt-1 flex gap-3">
            <SecondaryButton disabled={state === 'busy'} onClick={onDecline}>Liever niet</SecondaryButton>
            <SecondaryButton disabled={state === 'busy'} onClick={onAccept} className="bg-[color-mix(in_srgb,var(--color-action)_18%,transparent)]">Akkoord</SecondaryButton>
          </div>
        </>
      )}
    </div>
  );
}
