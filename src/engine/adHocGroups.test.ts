import { describe, expect, it } from 'vitest';
import { AD_HOC_GROUP_LABEL, AD_HOC_GROUP_ORDER, adHocChoices, adHocDefault, adHocGroupOf, adHocGroups } from './adHocGroups';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionTemplate } from '../models/training';

const t = (id: string, name: string, type: SessionTemplate['type'], extra: Partial<SessionTemplate> = {}) => ({ id, name, type, durationVariants: { full: 30, short: 20, minimum: 10 }, ...extra }) as SessionTemplate;
const demo = buildDefaultProgramData().templates;

describe('Losse training: eerst de sport', () => {
  it('vijf knoppen in de vaste volgorde: Wandelen, Hardlopen, Fietsen, Kracht, Anders', () => {
    expect(AD_HOC_GROUP_ORDER).toEqual(['hiking', 'running', 'cycling', 'strength', 'other']);
    expect(AD_HOC_GROUP_ORDER.map((k) => AD_HOC_GROUP_LABEL[k])).toEqual(['Wandelen', 'Hardlopen', 'Fietsen', 'Kracht', 'Anders']);
  });

  it('alleen een knop voor een sport met een training', () => {
    expect(adHocGroups([t('r1', 'Duurloop', 'cardio')])).toEqual(['running']);
    expect(adHocGroups(demo)).toEqual(['hiking', 'running', 'cycling', 'strength']);
  });

  it('kracht is een soort, ook met een sport erop; een herstelwandeling is wandelen', () => {
    expect(adHocGroupOf(t('s', 'Kracht', 'strength', { sport: 'running' }))).toBe('strength');
    expect(adHocGroupOf(demo.find((x) => x.id === 'tpl_herstel')!)).toBe('hiking');
    expect(adHocGroupOf(t('p1', 'Padel', 'cardio', { countedSport: 'padel' } as Partial<SessionTemplate>))).toBe('other');
  });
});

describe('Losse training: de gewone Wandeling', () => {
  const walk = demo.find((x) => x.id === 'tpl_walk')!;

  it('is neutraal: geen notitie over herstel, geen vaste dag, en telt niet als training van de week', () => {
    expect(walk.name).toBe('Wandeling');
    expect(walk.notes ?? '').not.toMatch(/herstel/i);
    expect(walk.defaultDayOfWeek).toBeUndefined();
    expect(walk.type).toBe('recovery');
  });

  it('staat onder Wandelen, en de Herstelwandeling blijft kiesbaar', () => {
    expect(adHocGroupOf(walk)).toBe('hiking');
    expect(adHocChoices(demo, 'hiking').map((x) => x.name)).toEqual(expect.arrayContaining(['Wandeling', 'Herstelwandeling']));
  });

  it('een programma zonder Wandeling (oude back-up) valt terug op de rustigste van de sport', () => {
    const old = demo.filter((x) => x.id !== 'tpl_walk');
    expect(adHocDefault(old, 'hiking')).toBeDefined();
    expect(adHocDefault(old, 'hiking')?.id).not.toBe('tpl_walk');
  });
});

describe('Losse training: de standaard van een sport', () => {
  it('in het demoprogramma: wandeling, rustige duurloop, fietstocht; kracht zonder standaard', () => {
    expect(adHocDefault(demo, 'hiking')?.name).toBe('Wandeling');
    expect(adHocDefault(demo, 'running')?.name).toBe('Rustige duurloop');
    expect(adHocDefault(demo, 'cycling')?.name).toBe('Fietstocht');
    expect(adHocDefault(demo, 'strength')).toBeUndefined();
    expect(adHocDefault(demo, 'other')).toBeUndefined();
  });

  it('zonder de vaste training de kortste rustige, nooit een zware of een test', () => {
    const list = [
      t('a', 'Intervallen', 'cardio', { sport: 'running', roles: ['hard_run'], durationVariants: { full: 20, short: 15, minimum: 10 } } as Partial<SessionTemplate>),
      t('b', 'Lange loop', 'cardio', { sport: 'running', durationVariants: { full: 90, short: 60, minimum: 30 } } as Partial<SessionTemplate>),
      t('c', 'Korte loop', 'cardio', { sport: 'running', durationVariants: { full: 30, short: 20, minimum: 10 } } as Partial<SessionTemplate>),
    ];
    expect(adHocDefault(list, 'running')?.name).toBe('Korte loop');
  });

  it('Welke training precies?: alleen die sport, op naam', () => {
    expect(adHocChoices(demo, 'hiking').map((x) => x.name)).toEqual(['Bergop wandelen', 'Bergtocht', 'Herstelwandeling', 'Rugzakwandeling', 'Trap af', 'Wandeldag 1 van 2', 'Wandeling']);
    expect(adHocChoices(demo, 'running').every((x) => adHocGroupOf(x) === 'running')).toBe(true);
  });
});
