import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { hasRole, idHasRole, idIsTestOrRace, isTestOrRace, templateRoles } from './templateRoles';
import type { TemplateRole } from '../models/training';

describe('templateRoles', () => {
  const templates = buildDefaultProgramData().templates;

  it('zet de rollen op de ingebouwde sjablonen', () => {
    const long = templates.find((t) => t.id === 'tpl_long_run')!;
    expect(long.roles).toEqual(expect.arrayContaining(['long', 'key', 'easy_pace']));
    expect(hasRole(templates.find((t) => t.id === 'tpl_race')!, 'race')).toBe(true);
  });

  it('valt terug op de rollen van het id voor een opgeslagen sjabloon zonder het veld', () => {
    expect(hasRole({ id: 'tpl_mountain_hike' }, 'long')).toBe(true);
    expect(hasRole({ id: 'tpl_easy_run' }, 'long')).toBe(false);
    expect(templateRoles({ id: 'tpl_unknown' })).toEqual([]);
  });

  it('laat de rollen op het sjabloon winnen van de terugval', () => {
    expect(hasRole({ id: 'tpl_long_run', roles: [] }, 'long')).toBe(false);
    expect(hasRole({ id: 'tpl_padel', roles: ['long'] }, 'long')).toBe(true);
  });

  it('zoekt op id met de sjablonen erbij, anders met de terugval', () => {
    const own = new Map([['tpl_padel', { id: 'tpl_padel', roles: ['test' as const] }]]);
    expect(idHasRole('tpl_padel', 'test', own)).toBe(true);
    expect(idHasRole('tpl_padel', 'test')).toBe(false);
    expect(idHasRole('tpl_test_run', 'test')).toBe(true);
    expect(idHasRole('tpl_test_run', 'test', [{ id: 'tpl_test_run', roles: [] }])).toBe(false);
  });

  it('kent test en wedstrijd samen', () => {
    expect(isTestOrRace({ id: 'tpl_test_run' })).toBe(true);
    expect(isTestOrRace({ id: 'tpl_race' })).toBe(true);
    expect(idIsTestOrRace('tpl_easy_run')).toBe(false);
  });
});

// De rollen vervingen losse id-lijsten. Deze toets legt de oude lijsten letterlijk
// vast, zodat een wijziging van de tabel in data/templateRoles.ts opvalt.
describe('rollen gelijk aan de oude id-lijsten', () => {
  const OLD: Record<string, string[]> = {
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
    blocks: ['tpl_tempo_run', 'tpl_intervals'],
    extra: ['tpl_strides_run', 'tpl_fartlek', 'tpl_progression_run', 'tpl_recovery_run', 'tpl_bergconditie', 'tpl_ruck_walk'],
  };
  const ids = [...new Set(Object.values(OLD).flat()), 'tpl_upper_a', 'tpl_bike', 'tpl_onbekend'];
  for (const [role, list] of Object.entries(OLD)) {
    it(role, () => {
      const got = ids.filter((id) => idHasRole(id, role as TemplateRole)).sort();
      expect(got).toEqual([...list].sort());
    });
  }
  it('negeert een kapot roles-veld uit een back-up', () => {
    expect(hasRole({ id: 'tpl_upper_a', roles: 'long' as unknown as TemplateRole[] }, 'long')).toBe(false);
    expect(hasRole({ id: 'tpl_long_run', roles: 3 as unknown as TemplateRole[] }, 'long')).toBe(true);
  });
});
