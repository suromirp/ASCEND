// De ene rustige melding over spieren voor de berg (engine/mountainMuscles.ts), met een
// voorstel om één oefening toe te voegen. Pas na Akkoord verandert er iets; "Liever niet" laat de spier acht
// weken met rust. Besluit: docs/beslissingen/2026-11-02-forge-herinrichting.md.

import { useMountainMuscleProposal } from './useMountainMuscleProposal';
import { Eyebrow, SecondaryButton } from './ui';

// In Forge (`onlyFor`) alleen in de training waar de oefening bij zou komen.
export function MountainMuscleNotice({ onlyFor, className = 'mt-5' }: { onlyFor?: string; className?: string }) {
  const { proposal, text, state, accept, decline } = useMountainMuscleProposal({ onlyFor });
  if (!proposal || !text) return null;

  return (
    <div className={className} role="group" aria-label="Kracht voor de berg">
      <Eyebrow>Kracht voor de berg</Eyebrow>
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{text.name}</p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{text.where}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{text.how}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{text.why}</p>
        {state === 'done' ? (
          <p role="status" className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{text.done}</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{text.after}</p>
            {state === 'failed' && <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>Opslaan lukte niet op tijd. Probeer het nog eens; hij komt er hoogstens één keer in.</p>}
            <div className="mt-1 flex gap-3">
              <SecondaryButton disabled={state === 'busy'} onClick={decline}>Liever niet</SecondaryButton>
              <SecondaryButton disabled={state === 'busy'} onClick={() => void accept()}>Akkoord</SecondaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
