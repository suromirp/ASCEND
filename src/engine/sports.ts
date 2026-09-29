// ASCEND — which sport a planned session belongs to, and whether ASCEND
// may plan it (Settings → Training → Sporten, Fase 2). Logging is never
// restricted by this: a sport that's switched off can still be logged,
// ASCEND just stops putting new sessions of it on the calendar.

import type { SessionTemplate, SessionLog } from '../models/training';
import { findModalityByKey, isCyclingModality } from '../data/modalities';

export type Sport = 'running' | 'hiking' | 'cycling';
export type EnabledSports = Record<Sport, boolean>;

export const SPORT_LABEL: Record<Sport, string> = { running: 'Hardlopen', hiking: 'Hiken', cycling: 'Fietsen' };

export const DEFAULT_ENABLED_SPORTS: EnabledSports = { running: true, hiking: true, cycling: false };

// Strength/recovery/adventure sessions aren't one of these sports — they're
// never filtered here (strength has its own block strategy).
export function templateSport(template: SessionTemplate): Sport | undefined {
  if (template.sport) return template.sport;
  if (template.type === 'cardio') return 'running';
  if (template.type === 'hiking') return 'hiking';
  return undefined;
}

export function isSportEnabled(sport: Sport | undefined, enabled: Partial<EnabledSports> | undefined): boolean {
  if (!sport) return true;
  return { ...DEFAULT_ENABLED_SPORTS, ...enabled }[sport];
}

export function isTemplatePlannable(template: SessionTemplate, enabled: Partial<EnabledSports> | undefined): boolean {
  return isSportEnabled(templateSport(template), enabled);
}

// Which sport a LOG was — a ride logged on the run slot with the bike
// modality is cycling, not running. Order: the log's own sport field (set
// when logged), then the chosen modality, then the session type.
export function logSport(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'>): Sport | undefined {
  if (log.sport) return log.sport;
  const modality = log.cardioData?.modality ?? log.outdoorData?.modality;
  if (isCyclingModality(modality)) return 'cycling';
  if (log.type === 'cardio') return 'running';
  if (log.type === 'hiking') return 'hiking';
  return undefined;
}

// Indoor = no real terrain: a treadmill, or a bike on a trainer. Indoor
// cycling gives no climbing credit (Fase 4).
export function isIndoorLog(log: Pick<SessionLog, 'cardioData' | 'outdoorData'>): boolean {
  const data = log.cardioData ?? log.outdoorData;
  if (data?.environment === 'treadmill') return true;
  return findModalityByKey(data?.modality)?.environment === 'indoor';
}
