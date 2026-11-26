// Het concept en de wijzer van een Forge-sessie (utils/forgeSessionStore.ts): kort na een verandering wegschrijven
// (niet bij elke toets), en altijd als je het scherm verlaat of de app naar de achtergrond gaat.

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import type { ForgeEvent } from '../../engine/forgeLog';
import type { Pause } from '../../engine/forgeSession';
import type { SessionVariant } from '../../models/training';
import { clearSessionPointer, notifySession, readPointer, registerForgeOpen, saveSessionDraft } from '../../utils/forgeSessionStore';
import { clearDraft } from '../../utils/loggerDraft';
import { DRAFT_VERSION, type WorkoutDraft } from './forgeDraft';
import type { Rest } from './forgeWorkoutHelpers';
import type { StepSwaps } from '../../engine/stepSwaps';
import type { AddedExercises } from '../../engine/addedExercises';

interface DraftInput {
  key: string;
  template: { id: string; name: string };
  plannedSessionId?: string;
  scheduledDate?: string;
  variant: SessionVariant;
  readOnly: boolean;
  startedAt: number | null;
  pauses: Pause[];
  lastAction: MutableRefObject<number>;
  workout: WorkoutExercise[];
  easeOn: boolean;
  rest: Rest | undefined;
  forgeLog: ForgeEvent[];
  seenAt: number;
  // De ladderstappen waarmee de sessie opende: ze gaan mee in het concept (forgeDraft.ts#sessionStepSwaps).
  stepSwaps: StepSwaps | undefined;
  // De toevoegingen van Spieren voor de berg waarmee de sessie opende (forgeDraft.ts#sessionAddedExercises).
  added: AddedExercises | undefined;
  // Je Akkoord op de ijkset (forgeDraft.ts#calAcceptedOf).
  calAccepted: boolean;
}

export function useForgeDraft({ key, template, plannedSessionId, scheduledDate, variant, readOnly, startedAt, pauses, lastAction, workout, easeOn, rest, forgeLog, seenAt, stepSwaps, added, calAccepted }: DraftInput) {
  const pendingDraft = useRef<WorkoutDraft | null>(null);
  // Schreef deze sessie al (of liep hij al bij het openen)? Dan schrijft hij niet meer zonder eigen wijzer.
  const wrote = useRef(readPointer()?.key === key);
  const draftTimer = useRef<number | undefined>(undefined);
  const flushDraft = useCallback(() => {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = undefined;
    if (pendingDraft.current) {
      // Concept en wijzer; "schreef al" volgt de uitkomst van de wijzer, nooit de poging (saveSessionDraft).
      // De wijzer: de pil boven de tabbalk vindt de training hiermee terug.
      wrote.current = saveSessionDraft({ key, templateId: template.id, name: template.name, ...(plannedSessionId ? { plannedSessionId } : {}), ...(scheduledDate ? { scheduledDate } : {}), variant }, pendingDraft.current, wrote.current);
    }
    pendingDraft.current = null;
  }, [key, template.id, template.name, plannedSessionId, scheduledDate, variant]);
  const dropDraft = useCallback(() => {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = undefined;
    pendingDraft.current = null;
    clearDraft(key, 'local');
    clearSessionPointer(key);
    notifySession();
  }, [key]);
  useEffect(() => {
    if (readOnly || startedAt === null) return;
    pendingDraft.current = { v: DRAFT_VERSION, savedAt: Date.now(), startedAt, pauses, lastActionAt: lastAction.current, exercises: workout, eased: easeOn, ...(rest ? { rest } : {}), ...(forgeLog.length > 0 ? { log: forgeLog } : {}), seen: seenAt, stepSwaps: stepSwaps ?? null, added: added ?? null, ...(calAccepted ? { calAccepted } : {}) };
    if (draftTimer.current === undefined) draftTimer.current = window.setTimeout(flushDraft, 300);
  }, [readOnly, startedAt, pauses, lastAction, workout, easeOn, rest, forgeLog, seenAt, stepSwaps, added, calAccepted, flushDraft]);
  // Zolang dit scherm open is, staat de pil er niet.
  useEffect(() => {
    if (readOnly) return;
    return registerForgeOpen();
  }, [readOnly]);
  useEffect(() => {
    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', flushDraft);
      flushDraft();
    };
  }, [flushDraft]);
  return { dropDraft };
}
