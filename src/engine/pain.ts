// ASCEND — pain on a spot, read the same way everywhere (docs/onderzoek/Pijn
// spierpijn en vermoeidheid melden.md). Pain-monitoring model (Silbernagel
// and Thomeé): 1 or 2 that has settled by the next morning blocks nothing;
// 3 or more holds back building on that spot. Pain that got worse as you
// went on, or sits on one spot on a bone, is never "acceptable pain".
// Older logs only had areas, no score: they count as 4 (in the 3 to 5 band).
//
// Pure: no React, no IndexedDB.

import type { SessionLog } from '../models/training';
import type { PainReport } from '../models/checkIn';

export const LEGACY_PAIN_SCORE = 4;
export const PAIN_HOLDS_BACK = 3;
export const PAIN_STOPS = 6; // above 5: 2 to 3 days without running on that spot

export function painReports(log: Pick<SessionLog, 'painAreas' | 'painReports'>): PainReport[] {
  if (log.painReports && log.painReports.length > 0) return log.painReports;
  return (log.painAreas ?? []).map((area) => ({ area, score: LEGACY_PAIN_SCORE }));
}

// Pain that counts: 3 or more, or worse while going on, or on a bone.
export function significantPain(log: Pick<SessionLog, 'painAreas' | 'painReports'>): PainReport[] {
  return painReports(log).filter((p) => p.score >= PAIN_HOLDS_BACK || p.worseDuring || p.onBone);
}

export function hasSignificantPain(log: Pick<SessionLog, 'painAreas' | 'painReports'>): boolean {
  return significantPain(log).length > 0;
}

// Pain that needs a stop: above 5, worse while going on, or on a bone.
export function isStopPain(p: PainReport): boolean {
  return p.score >= PAIN_STOPS || !!p.worseDuring || !!p.onBone;
}

// Areas where a pain on the bone is a real possibility in runners (bone
// stress injuries of the shin, foot and hip/groin; Hoenig e.a. 2022).
export const BONE_RISK_AREAS = ['Scheen', 'Voet', 'Heup of lies'];
