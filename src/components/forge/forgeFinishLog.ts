// Het log dat Afronden in Forge maakt: de sets, de zwaarste RIR van een beendag, het profiel en het verloop.
// Alleen samenstellen; opslaan doet `logSession`, en een bestaand log wordt nooit beschreven.

import { hardestLegRir, toStrengthData, type WorkoutExercise } from '../../engine/forgeWorkout';
import { templateSport } from '../../engine/sports';
import type { ForgeEvent } from '../../engine/forgeLog';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import type { LogSessionInput } from '../../state/AppDataContext';
import type { FinishExtra } from './FinishSheet';

export function forgeLogInput({ template, variant, extra, workout, readOnly, plannedSessionId, plannedStill, gymProfileId, forgeLog }: {
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
}): LogSessionInput {
  const strengthData = readOnly ? undefined : toStrengthData(workout);
  const rir = readOnly ? undefined : hardestLegRir(workout);
  return {
    plannedSessionId: plannedStill ? plannedSessionId : undefined,
    completedDate: extra.doneOn,
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
