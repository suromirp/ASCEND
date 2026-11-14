import { describe, expect, it } from 'vitest';
import { hasTrekGoal, isJourneyLink, visibleInSearch, NO_TREK_LINE } from './journeyAccess';
import { searchSettings } from './settingsSearch';
import { SETTINGS_INDEX } from '../data/settingsIndex';
import type { TrainingGoal } from '../models/goals';

const goal = (over: Partial<TrainingGoal>): TrainingGoal => ({
  id: 'g1', name: 'Voorbeeld', status: 'active', priority: 'primary', targetDate: '2027-07-01', requirements: [], ...over,
} as unknown as TrainingGoal);

const none = new Set<string>();
const today = '2026-11-14';

describe('hasTrekGoal', () => {
  it('zonder doelen is er geen trekdoel', () => {
    expect(hasTrekGoal([], none, today)).toBe(false);
  });

  it('een hardloopwedstrijd is geen trekdoel', () => {
    expect(hasTrekGoal([goal({ kind: 'run_race' })], none, today)).toBe(false);
  });

  it('een tocht met hutten of tent is een trekdoel', () => {
    expect(hasTrekGoal([goal({ kind: 'trek_hut' })], none, today)).toBe(true);
    expect(hasTrekGoal([goal({ kind: 'trek_tent' })], none, today)).toBe(true);
  });
});

describe('zoeken zonder trekdoel', () => {
  const ids = (q: string, trek: boolean) => searchSettings(q, visibleInSearch(SETTINGS_INDEX, trek)).map((r) => r.item.id);

  it('zonder trekdoel geen Reisplanner en Paklijst in de resultaten', () => {
    for (const q of ['reisplanner', 'paklijst', 'rugzak']) {
      const found = ids(q, false);
      expect(found, q).not.toContain('reisplanner');
      expect(found, q).not.toContain('paklijst');
    }
  });

  it('met een trekdoel staan ze er wel', () => {
    expect(ids('reisplanner', true)).toContain('reisplanner');
    expect(ids('paklijst', true)).toContain('paklijst');
  });

  it('andere instellingen blijven vindbaar', () => {
    expect(ids('weekbudget', false).length).toBeGreaterThan(0);
    expect(isJourneyLink('forge')).toBe(false);
  });
});

describe('de uitleg zonder tocht', () => {
  it('is een zin zonder gedachtestreepjes', () => {
    expect(NO_TREK_LINE).not.toMatch(/[–—]/);
  });
});
