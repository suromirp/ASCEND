import { describe, expect, it } from 'vitest';
import { legRestHours, stressProfileOf } from './sportStress';
import { anySportDefinition, COUNTED_SPORTS, sportOfExternalType, countedSportOfExternalType, SPORT_IDS } from '../data/sports';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { legSpacingDays, isLegHeavyTemplate } from './scheduler';
import { resolveEffectiveStressProfile } from './stressProfile';
import { templateSport } from './sports';

const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;

describe('de nieuwe sporten als gegevens', () => {
  it('zwemmen, padel en voetbal tellen alleen mee, ASCEND plant ze niet', () => {
    expect(COUNTED_SPORTS.map((s) => s.id)).toEqual(['swimming', 'padel', 'football']);
    for (const s of COUNTED_SPORTS) {
      expect(s.plannable).toBe(false);
      expect(s.roles).toEqual(['fixed', 'count', 'off']);
      expect(s.pictogram).toBeUndefined();
    }
  });

  it('het importeren blijft uit: ze horen niet bij de gewone sporten', () => {
    expect(SPORT_IDS).toEqual(['running', 'hiking', 'cycling']);
    expect(sportOfExternalType('Swim')).toBeUndefined();
    expect(countedSportOfExternalType('Swim')).toBe('swimming');
    expect(countedSportOfExternalType('Soccer')).toBe('football');
    expect(countedSportOfExternalType('Tennis')).toBeUndefined();
  });
});

describe('stressProfileOf', () => {
  it('zwemmen: geen impact en geen remmen, het bovenlichaam werkt', () => {
    const p = stressProfileOf(anySportDefinition('swimming'));
    expect(p).toMatchObject({ lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', upperBodyLoad: 'heavy', intensity: 'moderate', cardioLoad: 'moderate' });
  });

  it('padel: stop en start maakt het een zware beendag', () => {
    expect(stressProfileOf(anySportDefinition('padel'))).toMatchObject({ lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'moderate' });
  });

  it('voetbal: zware impact en zwaar remmen', () => {
    expect(stressProfileOf(anySportDefinition('football'), 'high')).toMatchObject({ lowerBodyLoad: 'heavy', impact: 'heavy', eccentricLoad: 'heavy', intensity: 'high', cardioLoad: 'heavy' });
  });

  it('fietsen houdt het profiel van de fietstocht, zodat de beenindex gelijk blijft', () => {
    const bike = resolveEffectiveStressProfile(tpl('tpl_bike'));
    const p = stressProfileOf(anySportDefinition('cycling'), 'low');
    expect(p).toMatchObject({ lowerBodyLoad: bike.lowerBodyLoad, impact: bike.impact, eccentricLoad: bike.eccentricLoad, intensity: bike.intensity, upperBodyLoad: bike.upperBodyLoad });
  });
});

describe('legRestHours', () => {
  it('de sporten: voetbalwedstrijd 72, voetbaltraining en padel 48, zwemmen en fietsen niets', () => {
    expect(legRestHours(stressProfileOf(anySportDefinition('football'), 'high'))).toBe(72);
    expect(legRestHours(stressProfileOf(anySportDefinition('football'), 'moderate'))).toBe(48);
    expect(legRestHours(stressProfileOf(anySportDefinition('padel'), 'high'))).toBe(48);
    expect(legRestHours(stressProfileOf(anySportDefinition('swimming')))).toBe(0);
    expect(legRestHours(stressProfileOf(anySportDefinition('cycling')))).toBe(0);
  });

  it('geeft voor elk sjabloon dezelfde rust als de bestaande regel na een zware beendag', () => {
    // Tegen een zware loop, niet tegen kracht: lang en rustig voor kracht is een uitzondering per paar (24 uur).
    const next = tpl('tpl_hills_descent');
    for (const t of templates.filter(isLegHeavyTemplate)) {
      const hours = legRestHours(resolveEffectiveStressProfile(t), { hike: templateSport(t) === 'hiking' });
      expect({ id: t.id, hours }).toEqual({ id: t.id, hours: (legSpacingDays(t, next) + 1) * 24 });
    }
  });

  it('de bergtocht blijft 72 uur', () => {
    expect(legRestHours(resolveEffectiveStressProfile(tpl('tpl_mountain_hike')), { hike: true })).toBe(72);
  });
});
