// Het blad "Er loopt nog een training", uit ForgeWorkout.tsx: een sessie per keer. In het blad zelf de uitweg
// (profiel afbreker, 14 november): Naar de training, Afronden met wat je deed, of Verwijderen na een bevestiging,
// waarna de nieuwe training gewoon start. Bleef de oude liggen, dan is het het blad van een concept.

import type { SessionState } from '../../utils/forgeSessionStore';
import { SessionChoiceSheet } from './SessionChoiceSheet';
import { useLeftSession } from './useForgeSession';

export function OtherSessionRunning({ session, onClose, onDiscarded }: { session: SessionState; onClose: () => void; onDiscarded: () => void }) {
  const left = useLeftSession(session);
  return <SessionChoiceSheet session={session} {...(left ? { left } : {})} onClose={onClose} onDiscarded={onDiscarded} />;
}
