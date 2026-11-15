// Warden (15 november): een hoofddoel van voor de soorten, zonder tentnacht in het etappeplan, werd door
// de migratie trek_hut met shelter 'hut'. Dat doel mag nooit stil van paklijst en taken wisselen: de app
// vraagt het één keer. Nagemaakt doel.
import { describe, it, expect } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import { migrateTrainingGoals } from '../storage/migrations';
import { JOURNEY_TASKS } from '../data/journeyTasks';
import { journeyShelter, needsShelterCheck, shelterCheckGoal, withShelter, withShelterAsked } from './trekShelter';
import { tasksForShelter } from './journey';
import { buildGoalDraft } from './goalDraft';

const legacy: TrainingGoal = {
  id: 'oud', name: 'Lange tocht', status: 'active', targetDate: '2027-08-01',
  requirements: [{ id: 'r1', kind: 'distance', scope: 'TOTAL_EVENT', target: { amount: 600, unit: 'km' }, discipline: 'hiking' }],
  createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-01T08:00:00Z',
} as TrainingGoal;
const ladder = new Set(['oud']);
const TODAY = '2026-11-16';

describe('een gemigreerd doel zonder tentnacht', () => {
  const [migrated] = migrateTrainingGoals([legacy], ladder, { choices: {} } as never);

  it('staat na de migratie op hutten, zonder eigen keuze', () => {
    expect(migrated.kind).toBe('trek_hut');
    expect(migrated.details?.shelter).toBe('hut');
    expect(migrated.details?.shelterChosen).toBeUndefined();
    expect(journeyShelter([migrated], ladder, TODAY)).toBe('hut');
  });

  it('krijgt de vraag één keer, en na een antwoord niet meer', () => {
    expect(needsShelterCheck(migrated, true, undefined)).toBe(true);
    expect(shelterCheckGoal([migrated], ladder, TODAY, undefined)?.id).toBe('oud');
    const asked = withShelterAsked(undefined, 'oud');
    expect(needsShelterCheck(migrated, true, asked)).toBe(false);
    expect(shelterCheckGoal([migrated], ladder, TODAY, asked)).toBeUndefined();
    // Twee keer vastleggen geeft één regel.
    expect(withShelterAsked(asked, 'oud')).toEqual(['oud']);
  });

  it('de vraag verandert zelf niets: tot een antwoord blijft het doel zoals het is', () => {
    // Wat de Reisplanner nu toont is de lijst voor hutten; het verschil met tent is wat de vraag laat zien.
    expect(tasksForShelter(JOURNEY_TASKS, 'hut').length).toBeLessThan(tasksForShelter(JOURNEY_TASKS, 'tent').length);
    expect(migrated.details?.shelter).toBe('hut');
  });

  it('Tent of Beide wordt een voorstel met de keuze als eigen keuze', () => {
    const next = withShelter(migrated, 'tent', '2026-11-16T08:00:00Z');
    expect(next.kind).toBe('trek_tent');
    expect(next.details?.shelterChosen).toBe(true);
    expect(needsShelterCheck(next, true, undefined)).toBe(false);
    // Het rugzakgewicht en de eisen blijven.
    expect(next.requirements).toEqual(migrated.requirements);
  });

  it('een migratie met tentnacht of een zelf gekozen hut krijgt geen vraag', () => {
    const [tent] = migrateTrainingGoals([legacy], ladder, { choices: { a: { sleep: 'tent' } } } as never);
    expect(tent.kind).toBe('trek_tent');
    expect(needsShelterCheck(tent, true, undefined)).toBe(false);
    const chosen = buildGoalDraft({ id: 'n', now: '2026-11-16T08:00:00Z', tile: 'trek', details: { shelter: 'hut' }, date: '2027-08-01', name: '', priority: 'top', order: 0 });
    expect(chosen.details?.shelterChosen).toBe(true);
    expect(needsShelterCheck(chosen, true, undefined)).toBe(false);
  });

  it('de opslag houdt de eigen keuze vast', async () => {
    const { readGoalDetails } = await import('../storage/migrations');
    expect(readGoalDetails({ shelter: 'hut', shelterChosen: true })).toEqual({ shelter: 'hut', shelterChosen: true });
    expect(readGoalDetails({ shelter: 'hut', shelterChosen: 'ja' })).toEqual({ shelter: 'hut' });
  });
});
