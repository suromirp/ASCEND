// ASCEND — the ambition levels and their factors (engine/ambition.ts).
// No imports: engine/substitutions.ts reads these without a cycle.

export type Ambition = 'rustig' | 'standaard' | 'stevig';

export const AMBITION_FACTOR: Record<Ambition, { build: number; rest: number }> = {
  rustig: { build: 0.9, rest: 0.9 },
  standaard: { build: 1, rest: 1 },
  stevig: { build: 1.1, rest: 1.15 },
};

// The factor for one week of the plan: the rest week has its own.
export function ambitionFactor(ambition: Ambition, restWeek: boolean): number {
  const f = AMBITION_FACTOR[ambition];
  return restWeek ? f.rest : f.build;
}
