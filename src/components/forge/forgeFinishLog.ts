// Het log dat Afronden in Forge maakt: de sets, de zwaarste RIR van een beendag, het profiel en het verloop.
// Alleen samenstellen; opslaan doet `logSession`, en een bestaand log wordt nooit beschreven.

import { hardestLegRir, lastWorkMomentOn, toStrengthData, type WorkoutExercise } from '../../engine/forgeWorkout';
import { finishCompletedAt } from '../../engine/forgeSession';
import { toISODate } from '../../utils/dates';
import { templateSport } from '../../engine/sports';
import type { ForgeEvent } from '../../engine/forgeLog';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import type { LogSessionInput } from '../../state/AppDataContext';
import type { FinishExtra } from './FinishSheet';
import { failedNote, STILL_WAITED_NOTE, STILL_WAITING_NOTE, type EarlierSaveOutcome } from '../../state/logSave';

export function forgeLogInput({ template, variant, extra, workout, readOnly, plannedSessionId, plannedStill, gymProfileId, forgeLog, now = Date.now() }: {
  template: SessionTemplate;
  variant: SessionVariant;
  extra: FinishExtra;
  workout: WorkoutExercise[];
  readOnly: boolean;
  plannedSessionId?: string;
  // De geplande sessie bestaat nog; anders is het een losse training.
  plannedStill: boolean;
  gymProfileId: string;
  forgeLog: ForgeEvent[];
  // Alleen voor tests: het moment van opslaan.
  now?: number;
}): LogSessionInput {
  const dayOf = (ms: number) => toISODate(new Date(ms));
  const strengthData = readOnly ? undefined : toStrengthData(workout);
  const rir = readOnly ? undefined : hardestLegRir(workout);
  return {
    plannedSessionId: plannedStill ? plannedSessionId : undefined,
    completedDate: extra.doneOn,
    // Het tijdstip hoort bij de gekozen dag: een eerdere dag krijgt je laatste set op die dag, nooit nu.
    completedAt: finishCompletedAt({ doneOn: extra.doneOn, today: toISODate(new Date(now)), now, lastWorkAt: lastWorkMomentOn(workout, extra.doneOn, dayOf), dayOf }),
    templateId: template.id,
    type: template.type,
    sport: templateSport(template),
    variant,
    durationMinutes: extra.minutes,
    rpe: extra.rpe,
    notes: extra.notes || undefined,
    subjectiveFeel: extra.feel,
    painAreas: extra.pain.length > 0 ? extra.pain.map((p) => p.area) : undefined,
    painReports: extra.pain.length > 0 ? extra.pain : undefined,
    strengthData,
    ...(rir !== undefined ? { strengthRir: rir } : {}),
    ...(strengthData && strengthData.length > 0 ? { gymProfileId } : {}),
    ...(!readOnly && forgeLog.length > 0 ? { forgeLog } : {}),
  };
}

// De zin op het blad Afronden als er (nog) geen nieuw log staat, met de woorden van Forge over je sets. Alleen
// mislukt is amber. Het begin is dat van elk scherm dat opslaat (state/logSave.ts); bij een tweede schrijffout
// op rij komt de reden erachter (failedNote), want de melding bovenin blijft hier weg.
export interface ForgeFinishNote { text: string; warn: boolean }

// `stillRunning` en `waited` hebben de woorden van het blad Hoe ging het? (state/logSave.ts): een eerdere poging
// loopt nog, Opslaan staat uit en Sluiten is de uitweg; `waited` als die poging na de grens nog niet antwoordde.
export type ForgeFinishNoteKind = 'already' | 'slow' | 'failed' | 'stillRunning' | 'waited';

export function forgeFinishNote(kind: ForgeFinishNoteKind): ForgeFinishNote {
  if (kind === 'already') return { text: 'Deze training staat al in je logboek. Er is niets dubbel opgeslagen.', warn: false };
  if (kind === 'slow') return { text: 'Opslaan duurt langer dan verwacht. Je sets blijven bewaard. Probeer het zo nog eens.', warn: false };
  if (kind === 'stillRunning') return { text: STILL_WAITING_NOTE, warn: false };
  if (kind === 'waited') return { text: STILL_WAITED_NOTE, warn: false };
  return { text: failedNote('Opslaan lukte niet. Je sets blijven bewaard. Probeer het zo nog eens.'), warn: true };
}

// Na `stillRunning` wacht het blad op de eerdere poging (state/logSave.ts#waitForEarlierSave) en zegt dan hoe die
// afliep: het log staat er, er staat niets (opnieuw kan), of de poging loopt na de grens nog (Opslaan weer aan).
export function forgeAfterEarlier(outcome: EarlierSaveOutcome): ForgeFinishNoteKind {
  return outcome === 'stored' ? 'already' : outcome === 'free' ? 'failed' : 'waited';
}

// Eén uitweg zolang er een opslag loopt, met het woord van Hoe ging het?: Sluiten. Je sets blijven bewaard.
export function forgeExitLabel(kind: ForgeFinishNoteKind | undefined): 'Sluiten' | 'Annuleren' {
  return kind === 'slow' || kind === 'stillRunning' || kind === 'waited' ? 'Sluiten' : 'Annuleren';
}

// Na `stillRunning`: wacht op de eerdere poging en toon de uitkomst als het blad nog in beeld is. Busy gaat altijd
// weer uit, ook als het blad intussen wegging of het wachten toch gooit, zodat een volgende tik niet stil blijft
// (I-139). Ja als de zin getoond is.
export async function waitThenShow({ busy, away, wait, show }: { busy: { current: boolean }; away: { current: boolean }; wait: () => Promise<EarlierSaveOutcome>; show: (kind: ForgeFinishNoteKind) => void }): Promise<boolean> {
  try {
    const after = await wait();
    if (away.current) return false;
    show(forgeAfterEarlier(after));
    return true;
  } finally {
    busy.current = false;
  }
}
