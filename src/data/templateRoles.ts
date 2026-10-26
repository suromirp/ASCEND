import type { TemplateRole } from '../models/training';

// De rollen van de ingebouwde sjablonen. Dit is de enige plek met deze lijsten:
// data/defaultProgram.ts zet ze op de sjablonen, en engine/templateRoles.ts
// gebruikt ze als terugval voor een opgeslagen sjabloon zonder het veld.
const IDS_BY_ROLE: Record<TemplateRole, string[]> = {
  long: ['tpl_long_run', 'tpl_mountain_hike'],
  key: ['tpl_long_run', 'tpl_mountain_hike'],
  test: ['tpl_test_run'],
  race: ['tpl_race'],
  easy_pace: ['tpl_easy_run', 'tpl_recovery_run', 'tpl_long_run'],
  hard_run: ['tpl_progression_run', 'tpl_fartlek', 'tpl_tempo_run', 'tpl_intervals', 'tpl_hill_intervals'],
  hard_load: ['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_intervals', 'tpl_tempo_run'],
  hard_effort: ['tpl_hill_intervals', 'tpl_intervals', 'tpl_test_run', 'tpl_race'],
  ask_legs: ['tpl_test_run', 'tpl_race', 'tpl_tempo_run', 'tpl_intervals', 'tpl_hill_intervals', 'tpl_hills_descent'],
  before_race_out: ['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_intervals', 'tpl_lower_a', 'tpl_lower_b'],
  walked_down: ['tpl_hill_intervals'],
  extra: ['tpl_strides_run', 'tpl_fartlek', 'tpl_progression_run', 'tpl_recovery_run', 'tpl_bergconditie', 'tpl_ruck_walk'],
};

export const ROLE_ORDER = Object.keys(IDS_BY_ROLE) as TemplateRole[];

export function defaultRolesOf(templateId: string): TemplateRole[] {
  return ROLE_ORDER.filter((role) => IDS_BY_ROLE[role].includes(templateId));
}
