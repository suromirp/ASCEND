// Het concept en de wijzer van een Forge-sessie (utils/forgeSessionStore.ts): kort na een verandering wegschrijven
// (niet bij elke toets), en altijd als je het scherm verlaat of de app naar de achtergrond gaat.

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import type { ForgeEvent } from '../../engine/forgeLog';
import type { Pause } from '../../engine/forgeSession';
import type { SessionVariant } from '../../models/training';
import { clearSessionPointer, notifySession, registerForgeOpen, writeSessionPointer } from '../../utils/forgeSessionStore';
import { clearDraft, saveDraft } from '../../utils/loggerDraft';
import { DRAFT_VERSION, type WorkoutDraft } from './forgeDraft';
import type { Rest } from './forgeWorkoutHelpers';

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
  column: 'target' | 'previous';
  forgeLog: ForgeEvent[];
  seenAt: number;
}

export function useForgeDraft({ key, template, plannedSessionId, scheduledDate, variant, readOnly, startedAt, pauses, lastAction, workout, easeOn, rest, column, forgeLog, seenAt }: DraftInput) {
  const pendingDraft = useRef<WorkoutDraft | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const flushDraft = useCallback(() => {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = undefined;
    if (pendingDraft.current) {
      saveDraft(key, pendingDraft.current, 'local');
      // De wijzer van de sessie: de pil boven de tabbalk vindt de training hiermee terug.
      writeSessionPointer({ key, templateId: template.id, name: template.name, ...(plannedSessionId ? { plannedSessionId } : {}), ...(scheduledDate ? { scheduledDate } : {}), variant });
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
    pendingDraft.current = { v: DRAFT_VERSION, savedAt: Date.now(), startedAt, pauses, lastActionAt: lastAction.current, exercises: workout, eased: easeOn, ...(rest ? { rest } : {}), column, ...(forgeLog.length > 0 ? { log: forgeLog } : {}), seen: seenAt };
    if (draftTimer.current === undefined) draftTimer.current = window.setTimeout(flushDraft, 300);
  }, [readOnly, startedAt, pauses, lastAction, workout, easeOn, rest, column, forgeLog, seenAt, flushDraft]);
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
