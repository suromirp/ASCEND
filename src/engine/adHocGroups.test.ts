import { describe, expect, it } from 'vitest';
import { AD_HOC_GROUP_ORDER, adHocGroupOf, adHocGroups } from './adHocGroups';
import type { SessionTemplate } from '../models/training';

const t = (id: string, name: string, type: SessionTemplate['type'], extra: Partial<SessionTemplate> = {}) => ({ id, name, type, ...extra }) as SessionTemplate;

describe('Losse training in kopjes', () => {
  it('de vaste volgorde: Wandelen, Hardlopen, Fietsen, Kracht, Overig', () => {
    expect(AD_HOC_GROUP_ORDER).toEqual(['hiking', 'running', 'cycling', 'strength', 'other']);
  });

  it('elk sjabloon in zijn kopje, binnen een kopje op naam, lege kopjes weg', () => {
    const groups = adHocGroups([
      t('r2', 'Tempoloop', 'cardio'),
      t('s1', 'Upper Body A', 'strength'),
      t('r1', 'Duurloop', 'cardio'),
      t('h1', 'Wandeling', 'hiking'),
      t('x1', 'Mobiliteit', 'recovery'),
      t('c1', 'Rit', 'cardio', { sport: 'cycling' }),
      t('p1', 'Padel', 'cardio', { countedSport: 'padel' } as Partial<SessionTemplate>),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Wandelen', 'Hardlopen', 'Fietsen', 'Kracht', 'Overig']);
    expect(groups[1].templates.map((x) => x.name)).toEqual(['Duurloop', 'Tempoloop']);
    expect(groups[4].templates.map((x) => x.name)).toEqual(['Mobiliteit', 'Padel']);
    expect(adHocGroups([t('r1', 'Duurloop', 'cardio')]).map((g) => g.key)).toEqual(['running']);
  });

  it('kracht is een soort, ook met een sport erop', () => {
    expect(adHocGroupOf(t('s', 'Kracht', 'strength', { sport: 'running' }))).toBe('strength');
  });
});
