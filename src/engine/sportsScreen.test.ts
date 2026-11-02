import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { roleChoices, sportCardLine, sportCards, sportWeekDots, sportsRowSummary, weekDotsLabel } from './sportsScreen';

// Sporten die meetellen, stap 5: het scherm Sporten. Nagemaakte data.
const { templates } = buildDefaultProgramData();
const MON = '2026-11-02';

describe('de kaarten', () => {
  it('de sporten in vaste volgorde, met de rollen van nu zonder keuze (yoga sinds stap 9)', () => {
    const cards = sportCards({});
    expect(cards.map((c) => c.label)).toEqual(['Hardlopen', 'Wandelen', 'Fietsen', 'Zwemmen', 'Padel', 'Voetbal', 'Yoga']);
    expect(cards.map((c) => c.pill)).toEqual(['Gepland', 'Gepland', 'Telt mee', 'Nog niet gekozen', 'Nog niet gekozen', 'Nog niet gekozen', 'Nog niet gekozen']);
    expect(cards[3].line).toBe('Zodra je dit doet, vraagt ASCEND hoe het telt.');
  });

  it('de regel zegt wat de rol nu betekent', () => {
    expect(sportCardLine('running', 'plan', { sportFrequency: { running: 3 } })).toBe('3 keer per week. ASCEND kiest de dagen.');
    expect(sportCardLine('padel', 'count', {})).toBe('Je plant het zelf. Log je het, dan blijft de dag erna lichter.');
    expect(sportCardLine('swimming', 'count', {})).toBe('Je plant het zelf. Log je het, dan telt het mee in je week.');
    expect(sportCardLine('swimming', 'off', {})).toBe('Doet niet mee in je planning en je benen. Je kunt het wel loggen.');
    expect(sportCardLine('cycling', 'count', {})).toBe('Telt mee voor je benen en je week. ASCEND plant het niet.');
    const football = { sportHandling: { football: { role: 'fixed', fixed: [{ day: 2, minutes: 90, intensity: 'moderate' }, { day: 6, minutes: 90, intensity: 'high' }] } } };
    expect(sportCardLine('football', 'fixed', football)).toBe('Dinsdag en zaterdag. De zaterdag telt als zwaar: de 72 uur erna blijven je benen vrij van zware kracht.');
  });

  it('Plan dit voor mij alleen waar ASCEND het kan, Negeren niet voor een sport die ASCEND plant', () => {
    expect(roleChoices('running')).toEqual(['plan', 'count']);
    expect(roleChoices('football')).toEqual(['fixed', 'count', 'off']);
  });

  it('de rij zegt hoeveel van elk', () => {
    expect(sportsRowSummary({})).toEqual({ value: '2 gepland', sub: '1 telt mee' });
    expect(sportsRowSummary({ sportHandling: { padel: { role: 'count' }, football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }] } } })).toEqual({ value: '2 gepland', sub: '1 vaste dag, 2 telt mee' });
  });
});

describe('de weekstrook', () => {
  it('gepland: de dagen waarop ASCEND de sport zet', () => {
    const sessions: PlannedSession[] = [
      { id: 'a', templateId: 'tpl_easy_run', scheduledDate: '2026-11-03', weekStartDate: MON, status: 'planned', order: 0 },
      { id: 'b', templateId: 'tpl_long_run', scheduledDate: '2026-11-08', weekStartDate: MON, status: 'planned', order: 0 },
      { id: 'c', templateId: 'tpl_upper_a', scheduledDate: '2026-11-04', weekStartDate: MON, status: 'planned', order: 0 },
    ];
    const dots = sportWeekDots({ sport: 'running', settings: {}, weekStart: MON, sessions, templates });
    expect(dots).toEqual(['none', 'planned', 'none', 'none', 'none', 'none', 'planned']);
    expect(weekDotsLabel(dots)).toBe('Deze week. Dinsdag en zondag: gepland.');
  });

  it('vaste dag: gevuld, en na een zware wedstrijd twee rustige dagen', () => {
    const settings = { sportHandling: { football: { role: 'fixed', fixed: [{ day: 2, minutes: 60, intensity: 'moderate' }, { day: 6, minutes: 90, intensity: 'high' }] } } };
    const dots = sportWeekDots({ sport: 'football', settings, weekStart: MON, sessions: [], templates });
    expect(dots).toEqual(['none', 'fixed', 'rest', 'none', 'none', 'fixed', 'rest']);
  });
});
