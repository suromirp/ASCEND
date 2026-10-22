// ASCEND — wat is er van de weekprescriptie echt veranderd?
//
// De weekplanning (engine/weeklyPrescriptionEngine.ts) rekent bij elke
// opening alles opnieuw uit en geeft elke keer verse id's en tijdstempels
// terug (makeId, new Date()). Wie die uitkomst blind wegschrijft, schrijft
// bij elke opening dezelfde 39 weekvoorschriften en 9 trainingsvoorschriften
// opnieuw, toont "Weekplanning bijgewerkt" en zet een regel in het
// wijzigingslogboek, ook als er inhoudelijk niets veranderde (docs/visie/
// Techniek en kwaliteit.md, 2.3).
//
// Deze module vergelijkt de uitkomst op INHOUD met wat er al ligt en laat
// alleen over wat echt anders is. Puur, zonder opslag: de aanroeper schrijft.
//
// Wat niet meetelt als inhoud: id's, tijdstempels (createdAt, computedAt) en
// het aantal dagen tot het doel in goalSnapshot (dat tikt elke dag en is
// alleen voor de audit, de rekenlaag leest het doel zelf opnieuw).

import type { TrainingPrescription } from '../models/prescription';
import type { WeeklyPrescription } from '../models/weeklyPrescription';
import type { PlanChangeItem } from '../models/planChange';

// JSON met gesorteerde sleutels: twee objecten met dezelfde inhoud geven
// dezelfde tekst, ongeacht de volgorde waarin hun velden zijn aangemaakt of
// teruggelezen. Velden met waarde undefined verdwijnen vanzelf.
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

export function weeklyPrescriptionContent(wp: WeeklyPrescription): string {
  return stableJson({
    ...wp,
    id: undefined,
    computedAt: undefined,
    lines: wp.lines.map((l) => ({ ...l, id: undefined })),
    goalSnapshot: wp.goalSnapshot.map((g) => g.goalId).sort(),
  });
}

export function trainingPrescriptionContent(p: TrainingPrescription): string {
  return stableJson({ ...p, id: undefined, createdAt: undefined });
}

export interface WeeklyPrescriptionDelta {
  // De wijzigingen die overblijven: een 'replace' voor een training waarvan
  // het voorschrift inhoudelijk gelijk bleef, valt weg.
  changes: PlanChangeItem[];
  // Alleen de voorschriften die echt anders zijn dan wat er ligt.
  trainingToWrite: TrainingPrescription[];
  weeklyToWrite: WeeklyPrescription[];
}

export function diffWeeklyPrescriptionPlan(
  fresh: { prescriptions: WeeklyPrescription[]; newTrainingPrescriptions: TrainingPrescription[]; changes: PlanChangeItem[] },
  stored: { weekly: WeeklyPrescription[]; training: TrainingPrescription[] },
): WeeklyPrescriptionDelta {
  const storedWeekByStart = new Map(stored.weekly.map((w) => [w.weekStartDate, weeklyPrescriptionContent(w)]));
  const weeklyToWrite = fresh.prescriptions.filter((w) => storedWeekByStart.get(w.weekStartDate) !== weeklyPrescriptionContent(w));

  const storedTrainingBySession = new Map(stored.training.map((p) => [p.plannedSessionId, trainingPrescriptionContent(p)]));
  const unchangedTraining = new Set<string>();
  const trainingToWrite: TrainingPrescription[] = [];
  for (const p of fresh.newTrainingPrescriptions) {
    if (storedTrainingBySession.get(p.plannedSessionId) === trainingPrescriptionContent(p)) unchangedTraining.add(p.id);
    else trainingToWrite.push(p);
  }

  const changes = fresh.changes.filter((c) => !(c.newPrescriptionId && unchangedTraining.has(c.newPrescriptionId)));
  return { changes, trainingToWrite, weeklyToWrite };
}
