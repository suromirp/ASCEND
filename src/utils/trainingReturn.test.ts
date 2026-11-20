import { describe, expect, it } from 'vitest';
import { decideReturn } from './trainingReturn';
import { RETURN_VALID_MS, rememberTrainingReturn, trainingReturn } from './forgeSessionStore';

describe('de terugweg naar de training', () => {
  it('POP na een bezoek opent', () => {
    expect(decideReturn({ pending: true, seen: true, onSettings: false, type: 'POP' })).toEqual({ seen: false, action: 'openen' });
  });
  it('PUSH of REPLACE na een bezoek wist', () => {
    expect(decideReturn({ pending: true, seen: true, onSettings: false, type: 'PUSH' })).toEqual({ seen: false, action: 'wissen' });
    expect(decideReturn({ pending: true, seen: true, onSettings: false, type: 'REPLACE' }).action).toBe('wissen');
  });
  it('zonder bezoek gebeurt er niets, ook niet bij POP', () => {
    expect(decideReturn({ pending: true, seen: false, onSettings: false, type: 'POP' }).action).toBe('niets');
  });
  it('op de instellingen zelf onthoudt hij het bezoek', () => {
    expect(decideReturn({ pending: true, seen: false, onSettings: true, type: 'PUSH' })).toEqual({ seen: true, action: 'niets' });
  });
  it('de tweede POP opent niet opnieuw: de terugweg is dan gewist', () => {
    rememberTrainingReturn({ templateId: 't' });
    expect(trainingReturn()).toBeDefined();
    rememberTrainingReturn(undefined);
    expect(decideReturn({ pending: trainingReturn() !== undefined, seen: false, onSettings: false, type: 'POP' }).action).toBe('niets');
  });
  it('een verlopen waarde is leeg en opent niet', () => {
    const t0 = 1_000_000;
    rememberTrainingReturn({ templateId: 't' }, t0);
    expect(trainingReturn(t0 + RETURN_VALID_MS)).toBeDefined();
    expect(trainingReturn(t0 + RETURN_VALID_MS + 1)).toBeUndefined();
    expect(decideReturn({ pending: trainingReturn(t0 + RETURN_VALID_MS + 1) !== undefined, seen: true, onSettings: false, type: 'POP' }).action).toBe('niets');
    rememberTrainingReturn(undefined);
  });
});
