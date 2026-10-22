// ASCEND — opslag van het etappeplan en de afspraak met thuis.
//
// Twee losse meta-sleutels, hetzelfde patroon als goalEngineConfig: kleine
// eenheden die samen gelezen en geschreven worden, zonder indexen. Beide
// zitten in de back-up (storage/backup.ts, schema v5).

import { MetaRepo } from './database';
import { sanitizeRoutePlan, sanitizeSoloPlan } from '../engine/routePlan';
import { EMPTY_ROUTE_PLAN, EMPTY_SOLO_PLAN, type RoutePlan, type SoloPlan } from '../models/routePlan';

export const ROUTE_PLAN_KEY = 'routePlan';
export const SOLO_PLAN_KEY = 'soloPlan';

export const RoutePlanRepo = {
  get: async (): Promise<RoutePlan> => sanitizeRoutePlan(await MetaRepo.get<unknown>(ROUTE_PLAN_KEY)) ?? EMPTY_ROUTE_PLAN,
  set: async (plan: RoutePlan): Promise<void> => {
    await MetaRepo.set(ROUTE_PLAN_KEY, plan);
  },
};

export const SoloPlanRepo = {
  get: async (): Promise<SoloPlan> => sanitizeSoloPlan(await MetaRepo.get<unknown>(SOLO_PLAN_KEY)) ?? EMPTY_SOLO_PLAN,
  set: async (plan: SoloPlan): Promise<void> => {
    await MetaRepo.set(SOLO_PLAN_KEY, plan);
  },
};
