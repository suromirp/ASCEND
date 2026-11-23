// Op de beendag na een zware sport: "Benen B vandaag, een dag na je voetbal. Een dag later?" met Akkoord en Liever
// niet (I-23 punt 10, docs/visie/Ontwerp Losse sport.md). Een rustige kaart onder de missie: de gevulde mint knop
// blijft op de missiekaart, Akkoord is hier omlijnd. Eerst een voorstel; pas na Akkoord verschuift de training, met
// de melding en Ongedaan maken zoals elk voorstel. Liever niet stelt het voor deze aanleiding niet opnieuw voor.

import { useState } from 'react';
import { TextButton } from '../TextButton';
import { Card, SecondaryButton } from '../ui';
import { SPORT_REST_FAILED, useSportRestToday } from './useSportRest';

export function SportRestOfferCard() {
  const { offer, answer } = useSportRestToday();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<'accepted' | 'declined' | null>(null);
  if (!offer) return null;
  const tap = async (choice: 'accepted' | 'declined') => {
    if (busy) return;
    setBusy(true);
    setFailed(null);
    try {
      await answer(choice);
    } catch (err) {
      console.error('Het voorstel na een sport kon niet worden beantwoord:', err);
      setFailed(choice);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="flex flex-col gap-3" data-sport-rest-offer>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{offer.line}</p>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Eerst een voorstel, pas na Akkoord verandert er iets.</p>
      {failed && (
        <div className="flex flex-col" role="status">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-warning)' }}>{SPORT_REST_FAILED}</p>
          <TextButton disabled={busy} onClick={() => void tap(failed)}>Opnieuw proberen</TextButton>
        </div>
      )}
      <div className="flex items-center gap-3">
        <TextButton tone="dim" disabled={busy} onClick={() => void tap('declined')}>Liever niet</TextButton>
        <SecondaryButton disabled={busy} onClick={() => void tap('accepted')}>{busy ? 'Bezig…' : 'Akkoord'}</SecondaryButton>
      </div>
    </Card>
  );
}
