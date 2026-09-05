// ASCEND — TrainingPrescription writer (Technical Architecture v0.3.1
// REVISED, engine module map: "Persist one prescription, indexed by
// plannedSessionId | candidate from a specialist | TrainingPrescription
// row | none | add a reciprocal field to PlannedSession").
//
// Named as its own module since Phase 1, never built until now: Phase 3's
// specialists (engine/specialists/*.ts) deliberately stopped at producing a
// TrainingPrescriptionCandidate — this is the one place that candidate
// becomes a real, persistable TrainingPrescription row. Never adds a field
// to PlannedSession (review point 5 — the relationship stays one-directional).

import type { TrainingPrescription, TrainingPrescriptionCandidate } from '../models/prescription';
import { makeId } from '../utils/id';

export function writeTrainingPrescription(candidate: TrainingPrescriptionCandidate): TrainingPrescription {
  return { ...candidate, id: makeId('prescription'), createdAt: new Date().toISOString() };
}
