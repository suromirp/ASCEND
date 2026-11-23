// "Je voorstel na padel is vervallen. Benen B was gisteren." Een rustige regel op Vandaag (groep gisteren, zoals de
// sportvraag), met Begrepen (I-23 punt 10, docs/visie/Ontwerp Losse sport.md). Er verandert niets aan je planning;
// Begrepen bewaart alleen dat je het zag. Zonder voorstel dat verviel: niets.

import { useState } from 'react';
import { TextButton } from '../TextButton';
import { SPORT_REST_FAILED, useSportRestLapsed } from './useSportRest';

export function SportRestLine() {
  const { lapsed, understood } = useSportRestLapsed();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!lapsed) return null;
  const tap = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await understood();
    } catch (err) {
      console.error('Begrepen kon niet worden bewaard:', err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col px-1" data-sport-rest-lapsed>
      <div className="flex min-h-[44px] items-center gap-2">
        <p className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{lapsed.line}</p>
        <TextButton tone="dim" disabled={busy} onClick={() => void tap()}>{failed ? 'Opnieuw proberen' : 'Begrepen'}</TextButton>
      </div>
      {failed && <p className="text-sm leading-snug" style={{ color: 'var(--color-warning)' }} role="status">{SPORT_REST_FAILED}</p>}
    </div>
  );
}
