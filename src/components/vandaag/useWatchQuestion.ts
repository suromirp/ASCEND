// ASCEND: de open vraag Hoe ging het? na een training die je horloge afvinkte (engine/autoTick.ts#pendingQuestions),
// voor de rij bovenaan Je dag en het blad erachter (spoor 6, engine/afterRun.ts). Vanzelf afvinken zelf blijft in
// components/WatchActivityCard.tsx; dit leest alleen wat al is afgevinkt en geeft het antwoord en Klopt niet door.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { getWatchState, onWatchChange, setAutoLoggedStatus, type WatchActivityState } from '../../storage/externalActivities';
import { canRejectAutoLog, type AutoQuestion, type FeedbackPatch } from '../../engine/autoTick';
import { openAfterRunQuestion } from '../../engine/afterRun';
import type { SessionTemplate } from '../../models/training';

export interface WatchQuestion {
  question: AutoQuestion;
  template: SessionTemplate | undefined;
  // Klopt niet mag nog (de log is van de app zelf, onbeantwoord en jonger dan 72 uur).
  canReject: boolean;
  answer: (patch: FeedbackPatch) => Promise<void>;
  reject: () => Promise<void>;
}

export function useWatchQuestion(): WatchQuestion | undefined {
  const { sessionLogs, templates, setLogFeedback, undoLog } = useAppData();
  const [state, setState] = useState<WatchActivityState | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => void getWatchState().then((s) => alive && setState(s)).catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  // Trainingen van je horloge uitgezet ("Wat ASCEND van je horloge gebruikt"): dan wordt niets gevraagd.
  const question = useMemo(() => openAfterRunQuestion(state, sessionLogs), [state, sessionLogs]);
  if (!question) return undefined;
  const template = templates.find((t) => t.id === question.log.templateId);
  return {
    question,
    template,
    canReject: canRejectAutoLog(question.entry, question.log),
    // Het antwoord gaat op het log (autoTick.ts#applyFeedback); daarna is de vraag af.
    answer: async (patch) => {
      await setLogFeedback(question.log.id, patch);
      await setAutoLoggedStatus(question.entry.externalId, 'done');
    },
    // Klopt niet: alleen het log dat de app zelf maakte, en alleen zolang dat mag. De activiteit komt dan terug als
    // gewoon voorstel en wordt nooit opnieuw vanzelf afgevinkt.
    reject: async () => {
      if (!canRejectAutoLog(question.entry, question.log)) return;
      await setAutoLoggedStatus(question.entry.externalId, 'rejected');
      await undoLog(question.log.id);
    },
  };
}
