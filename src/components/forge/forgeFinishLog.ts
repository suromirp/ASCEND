// Het log dat Afronden in Forge maakt: de sets, de zwaarste RIR van een beendag, het profiel en het verloop.
// Alleen samenstellen; opslaan doet `logSession`, en een bestaand log wordt nooit beschreven.

import { hardestLegRir, lastWorkMoment, toStrengthData, type WorkoutExercise } from '../../engine/forgeWorkout';
import { finishCompletedAt } from '../../engine/forgeSession';
import { toISODate } from '../../utils/dates';
import { templateSport } from '../../engine/sports';
import type { ForgeEvent } from '../../engine/forgeLog';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import type { LogSessionInput } from '../../state/AppDataContext';
import type { FinishExtra } from './FinishSheet';
import { failedNote, STILL_RUNNING_HELP } from '../../state/logSave';

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
  const strengthData = readOnly ? undefined : toStrengthData(workout);
  const rir = readOnly ? undefined : hardestLegRir(workout);
  return {
    plannedSessionId: plannedStill ? plannedSessionId : undefined,
    completedDate: extra.doneOn,
    // Het tijdstip hoort bij de gekozen dag: een eerdere dag krijgt het moment van je laatste set, nooit nu.
    completedAt: finishCompletedAt({ doneOn: extra.doneOn, today: toISODate(new Date(now)), now, lastWorkAt: lastWorkMoment(workout), dayOf: (ms) => toISODate(new Date(ms)) }),
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

export function forgeFinishNote(kind: 'already' | 'slow' | 'failed' | 'stillRunning'): ForgeFinishNote {
  if (kind === 'already') return { text: 'Deze training staat al in je logboek. Er is niets dubbel opgeslagen.', warn: false };
  if (kind === 'slow') return { text: 'Opslaan duurt langer dan verwacht. Je sets blijven bewaard; probeer het zo nog eens.', warn: false };
  if (kind === 'stillRunning') return { text: `Opslaan duurt langer dan verwacht. Je sets blijven bewaard. ${STILL_RUNNING_HELP}`, warn: false };
  return { text: failedNote('Opslaan lukte niet. Je sets blijven bewaard; probeer het zo nog eens.'), warn: true };
}
