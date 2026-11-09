// De ijkset (engine/calibration.ts, docs/beslissingen/2026-11-09-ijkset.md): eens per vier weken een voorstel voor een
// extra set bij één hoofdoefening, zo ver als netjes gaat. Pas na Akkoord komt de set erbij; Niet nu laat de training
// zoals hij was en de kaart komt de volgende keer terug.

import { Eyebrow, SecondaryButton } from '../ui';

export function CalibrationNotice({ name, phase: state, onAccept, onLater }: { name: string; phase: 'open' | 'added' | 'failed'; onAccept: () => Promise<void>; onLater: () => void }) {
  const ink = { color: 'var(--color-ink)' };
  const accept = () => void onAccept();
  return (
    <div className="mx-row-in mb-2" role="group" aria-label="IJkset" data-testid="forge-ijkset">
      <Eyebrow>IJkset</Eyebrow>
      <div className="mt-2 flex flex-col gap-1.5">
        {state === 'open' ? (
          <>
            <p className="text-sm leading-relaxed" style={ink}>Een extra set bij {name}, zo ver als netjes gaat? Zo ijk je eens per vier weken wat je over hebt.</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Doel van de set: nog één over. Eerst een voorstel, pas na Akkoord verandert er iets.</p>
            <div className="mt-1 flex gap-3">
              <SecondaryButton onClick={onLater}>Niet nu</SecondaryButton>
              <SecondaryButton onClick={accept}>Akkoord</SecondaryButton>
            </div>
          </>
        ) : (
          <p role="status" className="text-sm leading-relaxed" style={ink}>
            {state === 'added' ? `Er staat een set bij ${name}. Wil je hem niet, haal hem dan weg.` : `De set staat erbij, maar onthouden lukte niet. Forge vraagt het volgende keer opnieuw.`}
          </p>
        )}
      </div>
    </div>
  );
}
