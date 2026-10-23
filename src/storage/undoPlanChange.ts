// ASCEND: ongedaan maken van de laatste wijziging, los van React, zodat het te
// testen is (Warden Planning punt 9). Zet de instelling, de config, de doelen en
// de rijen terug zoals ze waren, haalt wat de wijziging toevoegde weg en legt
// het ongedaan maken vast in het wijzigingslog. De aanroeper (AppDataContext)
// zet daarna het scherm bij.

import type { RecentPlanChange } from '../models/planChange';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import type { StoredResponse } from '../engine/learning';
import { GoalEngineConfigRepo, MetaRepo, PlanChangeProposalsRepo, PlannedSessionsRepo, SettingsRepo, TrainingGoalsRepo, type AppSettings } from './database';
import { makeId } from '../utils/id';

export interface UndoOutcome {
  settings?: AppSettings;
  config?: GoalEngineConfig;
  responses?: Record<string, StoredResponse>;
}

export async function undoPlanChangeNow(change: RecentPlanChange): Promise<UndoOutcome> {
  const out: UndoOutcome = {};
  // The setting behind the change goes back exactly as it was: an illness
  // report (or a changed kind of illness), a sport switched off, a frequency or
  // time budget. Never reconstructed from dates.
  if (change.settingsBefore) out.settings = await SettingsRepo.set(change.settingsBefore as Partial<AppSettings>);
  // A rest day put back goes with the layout that undo puts back.
  if (change.settingsBefore && 'restDay' in change.settingsBefore) await MetaRepo.set('appliedRestDay', (change.settingsBefore as Partial<AppSettings>).restDay ?? 1);
  if (change.configBefore) out.config = await GoalEngineConfigRepo.set(change.configBefore as Partial<GoalEngineConfig>);
  // A goal changed with its planning (another date, archived, a new goal): back as it was.
  for (const goal of change.goalsBefore ?? []) await TrainingGoalsRepo.put(goal);
  for (const id of change.goalsAdded ?? []) await TrainingGoalsRepo.delete(id);
  if (change.adviceId) {
    const responses = { ...((await MetaRepo.get<Record<string, StoredResponse>>('adviceResponses')) ?? {}) };
    delete responses[change.adviceId];
    await MetaRepo.set('adviceResponses', responses);
    out.responses = responses;
  }
  // Undoing what the week check did is a choice of yours: those sessions stay
  // where you put them back.
  const keep = change.trigger === 'plan_check' ? { lock: { by: 'user' as const, at: new Date().toISOString() } } : {};
  for (const session of change.before) await PlannedSessionsRepo.put({ ...session, ...keep });
  for (const id of change.addedIds) await PlannedSessionsRepo.delete(id);
  const now = new Date().toISOString();
  await PlanChangeProposalsRepo.put({
    id: makeId('planchange'),
    trigger: change.trigger,
    issue: `Ongedaan gemaakt: ${change.title}`,
    changes: [],
    alternatives: [],
    consequences: change.lines.join('; '),
    explanation: 'Door jou ongedaan gemaakt, direct na de wijziging.',
    revertsProposalId: change.id,
    createdAt: now,
    resolvedAt: now,
    resolution: 'rejected',
  });
  return out;
}
