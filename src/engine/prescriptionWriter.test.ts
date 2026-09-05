import { describe, it, expect } from 'vitest';
import { writeTrainingPrescription } from './prescriptionWriter';
import type { TrainingPrescriptionCandidate } from '../models/prescription';

describe('writeTrainingPrescription', () => {
  it('assigns a real id and createdAt while preserving every candidate field', () => {
    const candidate: TrainingPrescriptionCandidate = {
      plannedSessionId: 'ps1',
      role: 'support',
      generatedBy: ['test'],
      reason: 'test reason',
    };
    const written = writeTrainingPrescription(candidate);
    expect(written.id).toBeTruthy();
    expect(written.createdAt).toBeTruthy();
    expect(written).toMatchObject(candidate);
  });

  it('produces a different id for two separate writes of the same candidate', () => {
    const candidate: TrainingPrescriptionCandidate = { plannedSessionId: 'ps1', role: 'key', generatedBy: [], reason: 'r' };
    const a = writeTrainingPrescription(candidate);
    const b = writeTrainingPrescription(candidate);
    expect(a.id).not.toBe(b.id);
  });
});
