// ASCEND: de duurregisters (engine/substitutions.ts) voor een stel instellingen,
// als één object. AppDataContext zet er de registers mee na elke refresh; een
// voorstel (storage/horizonPlan.ts) geeft het mee aan de planningsronde en
// zet niets op de module (Warden Planning punt 3).
//
// Pure: no React, no IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { IllnessEpisode } from '../models/illness';
import type { Ambition } from './ambitionLevels';
import type { DurationScope } from './substitutions';
import { effectiveAmbition } from './ambition';
import { recoveryDurationAdjustments } from './illness';
import { learnedStrengthDurations } from './durationLearning';

export interface DurationSettings {
  ambition?: Ambition;
  illnessEpisodes?: IllnessEpisode[];
  sessionDurationEstimates?: Record<string, number>;
}

export function durationScopeFor(settings: DurationSettings, logs: SessionLog[], templates: SessionTemplate[], program: Program | null | undefined, today: string): Required<DurationScope> {
  return {
    ambition: effectiveAmbition(settings.ambition, logs, new Map(templates.map((t) => [t.id, t])), program, today).effective,
    durationAdjustments: recoveryDurationAdjustments(settings.illnessEpisodes),
    learnedDurations: learnedStrengthDurations(templates, logs, settings.sessionDurationEstimates),
  };
}
